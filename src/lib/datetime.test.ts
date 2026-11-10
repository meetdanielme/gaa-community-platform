import { describe, expect, it } from "vitest";
import { parseClubLocal, toClubLocalInput } from "./datetime";

describe("club-local date inputs (Europe/Dublin)", () => {
  it("parses winter time (UTC+0)", () => {
    expect(parseClubLocal("2026-11-18T11:00")?.toISOString()).toBe("2026-11-18T11:00:00.000Z");
  });
  it("parses summer time (UTC+1)", () => {
    expect(parseClubLocal("2026-07-01T11:00")?.toISOString()).toBe("2026-07-01T10:00:00.000Z");
  });
  it("round-trips", () => {
    expect(toClubLocalInput(new Date("2026-07-01T10:00:00Z"))).toBe("2026-07-01T11:00");
  });
  it("rejects garbage", () => {
    expect(parseClubLocal("tomorrow")).toBeNull();
  });
});
