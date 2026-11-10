/**
 * Integration tests: real services against a real (in-memory) Postgres.
 * Each run boots PGlite, applies migrations and seeds the demo data.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CurrentUser } from "@/lib/session";
import { startPgliteServer } from "../../scripts/pglite-server.mts";

let stopDb: (() => Promise<void>) | undefined;

// Imported after DATABASE_URL points at the test database.
let svc: {
  fundraising: typeof import("./fundraising");
  events: typeof import("./events");
  profile: typeof import("./profile");
  db: typeof import("@/db");
};
let evan: CurrentUser;

beforeAll(async () => {
  const local = await startPgliteServer({
    dataDir: "memory://",
    port: 54400 + Math.floor(Math.random() * 500),
  });
  stopDb = local.stop;
  process.env.DATABASE_URL = local.url;

  const { migrateDatabase } = await import("../../scripts/migrate.mts");
  await migrateDatabase();
  const { seedDatabase } = await import("../../scripts/seed.mts");
  await seedDatabase();

  svc = {
    fundraising: await import("./fundraising"),
    events: await import("./events"),
    profile: await import("./profile"),
    db: await import("@/db"),
  };
  const { eq } = await import("drizzle-orm");
  const [u] = await svc.db.db.select().from(svc.db.schema.user).where(eq(svc.db.schema.user.email, "evan@example.com"));
  evan = {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    eircode: u.eircode,
    helpsWith: u.helpsWith,
    roles: ["family_supporter", "volunteer"],
  };
}, 60_000);

afterAll(async () => {
  await stopDb?.();
});

describe("fundraising (BR06, BR07, BR08)", () => {
  it("starts with New Lockers active at €1,740 of €5,600", async () => {
    const o = await svc.fundraising.getFundraisingOverview(evan.id);
    expect(o.active?.title).toBe("New Lockers");
    expect(o.active?.raisedCents).toBe(174000);
    expect(o.candidates.map((c) => c.votes)).toEqual([45, 30, 60, 20, 15]);
  });

  it("saves, repeats and replaces a single vote", async () => {
    const o = await svc.fundraising.getFundraisingOverview(evan.id);
    const roof = o.candidates.find((c) => c.goal.slug === "fixing-roof")!.goal;
    const kits = o.candidates.find((c) => c.goal.slug === "new-kits")!.goal;

    expect((await svc.fundraising.castVote(evan, roof.id)).outcome).toBe("saved");
    expect((await svc.fundraising.castVote(evan, roof.id)).outcome).toBe("unchanged");
    expect((await svc.fundraising.castVote(evan, kits.id)).outcome).toBe("replaced");

    const after = await svc.fundraising.getFundraisingOverview(evan.id);
    expect(after.myVoteGoalId).toBe(kits.id);
    expect(after.candidates.find((c) => c.goal.id === roof.id)!.votes).toBe(30);
    expect(after.candidates.find((c) => c.goal.id === kits.id)!.votes).toBe(61);
  });

  it("rejects votes from volunteers who are not players or supporters", async () => {
    const o = await svc.fundraising.getFundraisingOverview(evan.id);
    const d = await svc.fundraising.castVote({ ...evan, roles: ["volunteer"] }, o.candidates[0].goal.id);
    expect(d).toMatchObject({ outcome: "rejected", reason: "not_eligible" });
  });

  it("records nothing for a declined card and is idempotent", async () => {
    const o = await svc.fundraising.getFundraisingOverview(evan.id);
    const key = crypto.randomUUID();
    const input = { goalId: o.active!.id, amountCents: 2500, methodId: "demo_0002", idempotencyKey: key };
    const first = await svc.fundraising.makeDonation(evan, input);
    expect(first).toMatchObject({ ok: true, status: "declined" });
    const again = await svc.fundraising.makeDonation(evan, { ...input, methodId: "demo_4242" });
    expect(again).toMatchObject({ ok: true, status: "declined" });
    expect((await svc.fundraising.getFundraisingOverview(evan.id)).active?.raisedCents).toBe(174000);
  });

  it("keeps the goal while below target", async () => {
    const o = await svc.fundraising.getFundraisingOverview(evan.id);
    const r = await svc.fundraising.makeDonation(evan, {
      goalId: o.active!.id,
      amountCents: 2500,
      methodId: "demo_4242",
      idempotencyKey: crypto.randomUUID(),
    });
    expect(r).toMatchObject({ ok: true, status: "succeeded", progression: { outcome: "retain" } });
    expect((await svc.fundraising.getFundraisingOverview(evan.id)).active?.raisedCents).toBe(176500);
  });

  it("activates the highest-voted goal once the target is reached", async () => {
    let o = await svc.fundraising.getFundraisingOverview(evan.id);
    // €5,600 − €1,765 = €3,835 still to raise, in gifts of up to €1,000.
    let remaining = o.active!.targetCents - o.active!.raisedCents;
    let last;
    while (remaining > 0) {
      const amount = Math.min(remaining, 100000);
      last = await svc.fundraising.makeDonation(evan, {
        goalId: o.active!.id,
        amountCents: amount,
        methodId: "demo_4242",
        idempotencyKey: crypto.randomUUID(),
      });
      remaining -= amount;
    }
    expect(last).toMatchObject({ ok: true, progression: { outcome: "advance" } });

    o = await svc.fundraising.getFundraisingOverview(evan.id);
    expect(o.active?.title).toBe("New Kits");
    expect(o.round).not.toBeNull();
    expect(o.myVoteGoalId).toBeNull(); // votes do not carry forward
    expect(o.candidates.map((c) => c.goal.slug)).not.toContain("new-kits");
    expect(o.candidates.every((c) => c.votes === 0)).toBe(true);

    const p = await svc.fundraising.getLatestProgression();
    expect(p?.funded.title).toBe("New Lockers");
    expect(p?.next?.title).toBe("New Kits");
  });

  it("refuses donations to a goal that is no longer active", async () => {
    const lockers = await svc.fundraising.getGoalBySlug("new-lockers");
    const r = await svc.fundraising.makeDonation(evan, {
      goalId: lockers!.id,
      amountCents: 1000,
      methodId: "demo_4242",
      idempotencyKey: crypto.randomUUID(),
    });
    expect(r).toEqual({ ok: false, reason: "goal_not_active" });
  });
});

describe("events (BR03, BR04)", () => {
  it("lets Evan respond for a linked member but not someone else's", async () => {
    const detail = await svc.events.getEventDetail("hurling-tournament", evan.id);
    const sandu = detail!.attendees.find((a) => a.member.fullName === "Sandu Alam")!;
    const ok = await svc.events.respondToEvent(evan, {
      eventId: detail!.event.id,
      memberId: sandu.member.id,
      choice: "going",
    });
    expect(ok).toEqual({ ok: true, goingDelta: 1 });

    const stranger = { ...evan, id: crypto.randomUUID() };
    const denied = await svc.events.respondToEvent(stranger, {
      eventId: detail!.event.id,
      memberId: sandu.member.id,
      choice: "not_going",
    });
    expect(denied).toMatchObject({ ok: false, reason: "not_authorised" });
  });

  it("rejects responses to past events", async () => {
    const detail = await svc.events.getEventDetail("ladies-friendly-5-aside", evan.id);
    const r = await svc.events.respondToEvent(evan, {
      eventId: detail!.event.id,
      memberId: detail!.attendees[0].member.id,
      choice: "going",
    });
    expect(r).toMatchObject({ ok: false, reason: "past" });
  });

  it("warns about same-day volunteering conflicts", async () => {
    const hurling = await svc.events.getEventDetail("hurling-tournament", evan.id);
    const blitz = await svc.events.getEventDetail("football-u18-blitz", evan.id);
    expect(await svc.events.volunteerForRole(evan, { roleId: hurling!.volunteerRoles[0].id, acknowledgeConflict: false })).toEqual({
      ok: true,
    });
    const conflict = await svc.events.volunteerForRole(evan, {
      roleId: blitz!.volunteerRoles[0].id,
      acknowledgeConflict: false,
    });
    expect(conflict).toMatchObject({ ok: false, reason: "conflict" });
    expect(
      await svc.events.volunteerForRole(evan, { roleId: blitz!.volunteerRoles[0].id, acknowledgeConflict: true }),
    ).toEqual({ ok: true });
  });
});

describe("profile (BR01, BR05)", () => {
  it("pays an unpaid fee once", async () => {
    const family = await svc.profile.getFamily(evan.id);
    const sandu = family.find((m) => m.fullName === "Sandu Alam")!;
    expect(sandu.fee?.status).toBe("unpaid");

    const declined = await svc.profile.payMembershipFee(evan, sandu.fee!.id, "demo_0002");
    expect(declined).toMatchObject({ ok: true, status: "declined" });

    const paid = await svc.profile.payMembershipFee(evan, sandu.fee!.id, "demo_4242");
    expect(paid).toMatchObject({ ok: true, status: "succeeded" });

    const again = await svc.profile.payMembershipFee(evan, sandu.fee!.id, "demo_4242");
    expect(again).toEqual({ ok: false, reason: "already_paid" });
  });

  it("never changes the account holder's own profile relationship", async () => {
    const self = (await svc.profile.getFamily(evan.id)).find((m) => m.relationship === "self")!;
    const saved = await svc.profile.saveMember(evan.id, {
      id: self.id,
      fullName: "Someone Else",
      relationship: "child",
      code: "hurling",
      team: "Adult",
    });
    expect(saved).toMatchObject({ relationship: "self", fullName: "Evan Alam", code: "hurling" });
  });

  it("hides other families' members", async () => {
    const family = await svc.profile.getFamily(evan.id);
    expect(await svc.profile.getManagedMember(crypto.randomUUID(), family[1].id)).toBeNull();
  });
});

describe("local database server", () => {
  it("keeps concurrent clients' parameterised queries apart", async () => {
    const postgres = (await import("postgres")).default;
    const clients = Array.from({ length: 4 }, () => postgres(process.env.DATABASE_URL!, { prepare: false, max: 4 }));
    const results = await Promise.all(
      Array.from({ length: 200 }, (_, i) => {
        const sql = clients[i % clients.length];
        return i % 2
          ? sql`select ${i}::int as a`.then((r) => r[0].a === i)
          : sql`select ${i}::int as a, ${"x" + i}::text as b`.then((r) => r[0].a === i && r[0].b === "x" + i);
      }),
    );
    await Promise.all(clients.map((c) => c.end()));
    expect(results.every(Boolean)).toBe(true);
  });
});
