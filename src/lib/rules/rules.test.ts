/**
 * These tests encode the "worked review scenarios" from the Sprint 2
 * business-rules pack, so the coursework and the code stay in step.
 */
import { describe, expect, it } from "vitest";
import { formatMoney, parseEuros } from "../format";
import { decideClearVote, decideVote } from "./voting";
import { decideProgression } from "./progression";
import { decideFeePayment, validateDonation } from "./payments";
import { decideEventResponse } from "./events";
import { canPay, canVote, parseRoles } from "./roles";
import { assignTeam, cancellationNeedsAlert, requiresMembership, syncMembershipFee } from "./membership";

describe("roles", () => {
  it("parses and filters unknown roles", () => {
    expect(parseRoles("player, family_supporter,admin")).toEqual(["player", "family_supporter"]);
  });
  it("maps actors to use cases", () => {
    expect(canVote([])).toBe(false);
    expect(canVote(["player"])).toBe(true);
    expect(canPay(["player"])).toBe(false);
    expect(canPay(["family_supporter"])).toBe(true);
  });
});

describe("BR07 voting", () => {
  const base = {
    voterEligible: true,
    roundOpen: true,
    goalIsCandidate: true,
    currentChoiceGoalId: null,
    newChoiceGoalId: "kits",
  };

  it("saves a first vote", () => {
    expect(decideVote(base)).toEqual({ outcome: "saved" });
  });
  it("repeating the current vote changes nothing", () => {
    expect(decideVote({ ...base, currentChoiceGoalId: "kits" })).toEqual({
      outcome: "unchanged",
    });
  });
  it("changing A to B replaces the single choice", () => {
    expect(decideVote({ ...base, currentChoiceGoalId: "roof" })).toEqual({
      outcome: "replaced",
      previousGoalId: "roof",
    });
  });
  it("rejects a stale vote when the round has closed", () => {
    expect(decideVote({ ...base, roundOpen: false })).toMatchObject({
      outcome: "rejected",
      reason: "round_closed",
    });
  });
  it("rejects ineligible voters", () => {
    expect(decideVote({ ...base, voterEligible: false })).toMatchObject({
      reason: "not_eligible",
    });
  });
});

describe("BR07 clearing a vote", () => {
  it("removes a saved choice without replacing it", () => {
    expect(decideClearVote({ voterEligible: true, roundOpen: true, hasChoice: true })).toEqual({ outcome: "cleared" });
    expect(decideClearVote({ voterEligible: true, roundOpen: true, hasChoice: false })).toEqual({ outcome: "unchanged" });
  });
  it("can't change a closed round", () => {
    expect(decideClearVote({ voterEligible: true, roundOpen: false, hasChoice: true })).toEqual({
      outcome: "rejected",
      reason: "round_closed",
    });
  });
});

describe("BR08 goal progression", () => {
  const tallies = [
    { goalId: "equipment", votes: 45 },
    { goalId: "roof", votes: 30 },
    { goalId: "kits", votes: 60 },
    { goalId: "recovery", votes: 20 },
    { goalId: "office", votes: 15 },
  ];

  it("€1,740 of €5,600 keeps the current goal", () => {
    expect(
      decideProgression({ confirmedTotalCents: 174000, targetCents: 560000, tallies }),
    ).toEqual({ outcome: "retain" });
  });
  it("reaching the target activates New Kits with 60 votes", () => {
    expect(
      decideProgression({ confirmedTotalCents: 560000, targetCents: 560000, tallies }),
    ).toEqual({ outcome: "advance", nextGoalId: "kits" });
  });
  it("a tie leaves selection pending", () => {
    expect(
      decideProgression({
        confirmedTotalCents: 600000,
        targetCents: 560000,
        tallies: [
          { goalId: "a", votes: 10 },
          { goalId: "b", votes: 10 },
        ],
      }),
    ).toEqual({ outcome: "pending", reason: "tie" });
  });
  it("all-zero totals leave selection pending", () => {
    expect(
      decideProgression({
        confirmedTotalCents: 560000,
        targetCents: 560000,
        tallies: [{ goalId: "a", votes: 0 }],
      }),
    ).toEqual({ outcome: "pending", reason: "no_votes" });
  });
});

describe("BR05/BR06 payments", () => {
  it("only accepts donations to the active goal", () => {
    expect(
      validateDonation({ goalStatus: "proposed", amountCents: 2500, maxCents: 100000 }),
    ).toEqual({ ok: false, reason: "goal_not_active" });
  });
  it("rejects amounts under €1 or over the limit", () => {
    expect(validateDonation({ goalStatus: "active", amountCents: 50, maxCents: 100000 }).ok).toBe(false);
    expect(validateDonation({ goalStatus: "active", amountCents: 200000, maxCents: 100000 })).toEqual({
      ok: false,
      reason: "too_large",
    });
    expect(validateDonation({ goalStatus: "active", amountCents: 2500, maxCents: 100000 }).ok).toBe(true);
  });
  it("never offers a second charge for a pending fee", () => {
    expect(decideFeePayment({ authorised: true, status: "pending" })).toEqual({
      ok: false,
      reason: "pending",
    });
    expect(decideFeePayment({ authorised: true, status: "unpaid" })).toEqual({ ok: true });
  });
});

describe("BR03 event response", () => {
  const now = new Date("2026-10-20T10:00:00Z");
  const base = {
    authorised: true,
    cancelled: false,
    startsAt: new Date("2026-10-28T11:00:00Z"),
    rsvpDeadline: null,
    now,
    previous: null,
    choice: "going" as const,
    goingCount: 10,
    capacity: 10,
  };

  it("rejects a new Going response when full", () => {
    expect(decideEventResponse(base)).toEqual({ ok: false, reason: "full" });
  });
  it("keeps an existing place when re-confirming while full", () => {
    expect(decideEventResponse({ ...base, previous: "going" })).toEqual({
      ok: true,
      goingDelta: 0,
    });
  });
  it("releases the place when changing to Not going", () => {
    expect(
      decideEventResponse({ ...base, previous: "going", choice: "not_going" }),
    ).toEqual({ ok: true, goingDelta: -1 });
  });
  it("rejects responses for profiles the user cannot manage", () => {
    expect(decideEventResponse({ ...base, authorised: false })).toMatchObject({
      reason: "not_authorised",
    });
  });
  it("rejects after the deadline", () => {
    expect(
      decideEventResponse({ ...base, capacity: null, rsvpDeadline: new Date("2026-10-19") }),
    ).toMatchObject({ reason: "deadline_passed" });
  });
});

describe("membership fees", () => {
  it("are only owed for people playing a code", () => {
    expect(requiresMembership({ codes: [] })).toBe(false);
    expect(requiresMembership({ codes: ["hurling", "football"] })).toBe(true);
  });
  it("are created when someone starts playing a code and removed if they stop before paying", () => {
    expect(syncMembershipFee({ plays: true, feeStatus: null })).toBe("create");
    expect(syncMembershipFee({ plays: true, feeStatus: "unpaid" })).toBe("keep");
    expect(syncMembershipFee({ plays: false, feeStatus: "unpaid" })).toBe("remove");
    expect(syncMembershipFee({ plays: false, feeStatus: "paid" })).toBe("keep");
    expect(syncMembershipFee({ plays: false, feeStatus: null })).toBe("keep");
  });
  it("alerts when a paid membership is cancelled", () => {
    expect(cancellationNeedsAlert("paid")).toBe(true);
    expect(cancellationNeedsAlert("pending")).toBe(true);
    expect(cancellationNeedsAlert("unpaid")).toBe(false);
    expect(cancellationNeedsAlert(null)).toBe(false);
  });
});

describe("team assignment", () => {
  const grades = [8, 10, 12, 14, 16, 18, 20];
  const team = (dob: string) => assignTeam(dob, "2026/27", grades, 4);
  it("uses the age reached during the season's first year", () => {
    expect(team("2014-12-31")).toBe("U12"); // turns 12 in 2026
    expect(team("2015-01-01")).toBe("U12"); // turns 11
    expect(team("2013-06-01")).toBe("U14"); // turns 13
    expect(team("2008-03-15")).toBe("U18");
  });
  it("puts anyone past the last grade in the adult team", () => {
    expect(team("2005-05-05")).toBe("Adult");
    expect(team("1980-01-01")).toBe("Adult");
  });
  it("turns away people too young to play", () => {
    expect(team("2023-01-01")).toBeNull();
    expect(team("2022-01-01")).toBe("U8");
  });
});

describe("money amounts", () => {
  it("accepts euro amounts with up to 2 decimals", () => {
    expect(parseEuros("15")).toBe(1500);
    expect(parseEuros("12.5")).toBe(1250);
    expect(parseEuros("12,50")).toBe(1250);
    expect(parseEuros("€1,250.75")).toBe(125075);
    expect(parseEuros("0.10")).toBe(10);
  });
  it("rejects anything else", () => {
    for (const v of ["", "12.345", "1.2.3", "abc", "-5", "12,5,0"]) expect(parseEuros(v)).toBeNull();
  });
  it("shows cents only when there are some", () => {
    expect(formatMoney(1500)).toBe("€15");
    expect(formatMoney(1250)).toBe("€12.50");
  });
});
