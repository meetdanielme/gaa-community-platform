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
  const { seedDatabase } = await import("./seed");
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
    roles: ["family_supporter"],
    isAdmin: false,
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

  it("rejects votes from people with no voting role", async () => {
    const o = await svc.fundraising.getFundraisingOverview(evan.id);
    const d = await svc.fundraising.castVote({ ...evan, roles: [] }, o.candidates[0].goal.id);
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

describe("events (BR03)", () => {
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

describe("admin (club officers)", () => {
  let admin: CurrentUser;
  let adminSvc: {
    fundraising: typeof import("./admin/fundraising");
    content: typeof import("./admin/content");
    members: typeof import("./admin/members");
    dashboard: typeof import("./admin/dashboard");
  };

  beforeAll(async () => {
    adminSvc = {
      fundraising: await import("./admin/fundraising"),
      content: await import("./admin/content"),
      members: await import("./admin/members"),
      dashboard: await import("./admin/dashboard"),
    };
    const { eq } = await import("drizzle-orm");
    const [u] = await svc.db.db.select().from(svc.db.schema.user).where(eq(svc.db.schema.user.email, "admin@example.com"));
    expect(u.isAdmin).toBe(true);
    admin = { ...evan, id: u.id, name: u.name, email: u.email, isAdmin: true };
  });

  it("records offline funds, and a tie after funding waits for the club's decision", async () => {
    // Earlier tests made New Kits active with a fresh round and no votes yet.
    let o = await svc.fundraising.getFundraisingOverview(evan.id);
    expect(o.active?.title).toBe("New Kits");

    const partial = await adminSvc.fundraising.recordOfflineFunds(admin, o.active!.id, 10000, "Bucket collection");
    expect(partial).toMatchObject({ ok: true, progression: { outcome: "retain" } });

    const rest = o.active!.targetCents - o.active!.raisedCents - 10000;
    const done = await adminSvc.fundraising.recordOfflineFunds(admin, o.active!.id, rest, "Golf classic");
    expect(done).toMatchObject({ ok: true, progression: { outcome: "pending", reason: "no_votes" } });

    o = await svc.fundraising.getFundraisingOverview(evan.id);
    expect(o.active).toBeNull();
    expect(o.selectionPending).toBe(true);
    expect((await adminSvc.dashboard.getDashboard()).selectionPending).toBe(true);

    const roof = o.candidates.find((c) => c.goal.slug === "fixing-roof")!.goal;
    expect(await adminSvc.fundraising.activateGoal(admin, roof.id)).toEqual({ ok: true });

    o = await svc.fundraising.getFundraisingOverview(evan.id);
    expect(o.active?.title).toBe("Fixing Roof");
    expect(o.round).not.toBeNull();
    expect(o.selectionPending).toBe(false);
    // Only one goal can be active.
    const other = o.candidates[0].goal;
    expect(await adminSvc.fundraising.activateGoal(admin, other.id)).toMatchObject({ ok: false });
  });

  it("proposes, edits and withdraws goals", async () => {
    const created = await adminSvc.fundraising.saveGoal(admin, {
      title: "Fixing Roof", // same title → unique slug
      purpose: "Second roof, second chance.",
      headline: null,
      description: null,
      targetCents: 100000,
      breakdown: [{ label: "Tiles", amountCents: 100000 }],
    });
    expect(created.ok).toBe(true);
    const g = await adminSvc.fundraising.getGoalAdmin(created.ok ? created.id : "");
    expect(g?.slug).toBe("fixing-roof-2");
    expect(g?.status).toBe("proposed");

    await adminSvc.fundraising.setGoalWithdrawn(admin, g!.id, true);
    const o = await svc.fundraising.getFundraisingOverview(evan.id);
    expect(o.candidates.map((c) => c.goal.id)).not.toContain(g!.id);
  });

  it("lists accounts and events with counts", async () => {
    const accounts = await adminSvc.members.listAccounts("evan");
    expect(accounts).toHaveLength(1);
    expect(Number(accounts[0].familySize)).toBe(4);
    expect(Number(accounts[0].outstanding)).toBeGreaterThanOrEqual(0);
    // Seeded community voters have no login and aren't listed.
    expect((await adminSvc.members.listAccounts()).every((a) => !a.email.endsWith("@community.example"))).toBe(true);
    const events = await adminSvc.content.listEventsAdmin();
    expect(events.find((e) => e.event.slug === "hurling-tournament")?.going).toBeGreaterThanOrEqual(1);
    const { rows } = await adminSvc.fundraising.listDonations({ status: "succeeded" });
    expect(rows.length).toBeGreaterThan(0);
  });

  it("keeps at least one admin", async () => {
    const r = await adminSvc.members.updateAccountAccess(admin, admin.id, { roles: ["family_supporter"], isAdmin: false });
    expect(r).toMatchObject({ ok: false });
  });

  it("records a cash membership payment", async () => {
    const family = await svc.profile.getFamily(evan.id);
    const daniel = family.find((m) => m.fullName === "Daniel Alam")!;
    await adminSvc.members.setFeeStatus(admin, daniel.fee!.id, "paid");
    const after = await svc.profile.getManagedMember(evan.id, daniel.id);
    expect(after?.fee?.status).toBe("paid");
    expect(after?.fee?.paymentRef).toMatch(/^CASH-/);
  });

  it("creates, cancels and deletes events", async () => {
    const id = await adminSvc.content.saveEvent(admin, {
      title: "Hurling Tournament",
      category: "hurling",
      startsAt: new Date(Date.now() + 30 * 3_600_000),
      venue: "Saints Arena",
      imageUrl: null,
      headline: "Round two",
      description: "Another tournament day.",
      schedule: [{ time: "10:00", label: "Throw-in" }],
      goodToKnow: null,
      recap: null,
      capacity: 2,
      rsvpDeadline: null,
    });
    const { event } = (await adminSvc.content.getEventAdmin(id))!;
    expect(event.slug).toBe("hurling-tournament-2");

    const self = (await svc.profile.getFamily(evan.id))[0];
    await svc.events.setReminder(evan.id, id, true);
    await adminSvc.content.setEventCancelled(admin, id, true);
    const r = await svc.events.respondToEvent(evan, { eventId: id, memberId: self.id, choice: "going" });
    expect(r).toMatchObject({ ok: false, reason: "cancelled" });

    await adminSvc.content.setEventCancelled(admin, id, false);
    expect(await svc.events.respondToEvent(evan, { eventId: id, memberId: self.id, choice: "going" })).toMatchObject({ ok: true });
  });

  it("logs every admin change for transparency", async () => {
    const { activity } = await adminSvc.dashboard.getDashboard();
    const actions = activity.map((a) => a.summary).join("\n");
    expect(actions).toMatch(/Resolved tied vote: "Fixing Roof"/);
    expect(actions).toMatch(/Recorded €.* — Golf classic/);
    expect(activity.every((a) => a.actorName === "Aoife Byrne")).toBe(true);
  });

  it("lets families add, edit and remove members (but never their own profile)", async () => {
    const added = await svc.profile.saveMember(evan.id, {
      fullName: "Aoibhe Alam",
      relationship: "child",
      code: "camogie",
      team: "U12",
    });
    expect((await svc.profile.getManagedMember(evan.id, added!.id))?.fee?.status).toBe("unpaid");

    const self = (await svc.profile.getFamily(evan.id)).find((m) => m.relationship === "self")!;
    const sneaky = await svc.profile.saveMember(evan.id, { id: self.id, fullName: "X", relationship: "child", code: null, team: null });
    expect(sneaky).toMatchObject({ relationship: "self", fullName: "Evan Alam" });
    expect(await svc.profile.removeMember(evan.id, self.id)).toBeNull();
    expect(await svc.profile.removeMember(evan.id, added!.id)).not.toBeNull();
    // Another account can't touch Evan's family.
    expect(await svc.profile.saveMember(admin.id, { id: added!.id, fullName: "X", relationship: "child", code: null, team: null })).toBeNull();
  });

  it("only charges membership to people who play a code", async () => {
    const self = (await svc.profile.getFamily(evan.id)).find((m) => m.relationship === "self")!;
    expect(self.fee).toBeNull();

    await svc.profile.saveMember(evan.id, { id: self.id, fullName: self.fullName, relationship: "self", code: "hurling", team: "Junior B" });
    expect((await svc.profile.getManagedMember(evan.id, self.id))?.fee?.status).toBe("unpaid");

    await svc.profile.saveMember(evan.id, { id: self.id, fullName: self.fullName, relationship: "self", code: null, team: null });
    expect((await svc.profile.getManagedMember(evan.id, self.id))?.fee).toBeNull();
  });

  it("daily job finds tomorrow's reminders and resets the demo", async () => {
    const { runDailyJobs } = await import("./jobs");
    const result = await runDailyJobs();
    expect(result.remindersDue).toBe(1); // the event created above, ~30 hours away
    expect(result.demoReset).toBe(true);
    const o = await svc.fundraising.getFundraisingOverview(evan.id);
    expect(o.active?.title).toBe("New Lockers");
  });
});
