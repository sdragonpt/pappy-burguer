import { describe, expect, it } from "vitest";
import { DEFAULT_HOURS, hoursSummary, isOpenNow, parseHours, pickupSlots, romeNow } from "@/lib/hours";

// Wednesday 3 June 2026; Italy is on CEST (UTC+2).
const at = (hhmm: string) => new Date(`2026-06-03T${hhmm}:00+02:00`);

describe("romeNow", () => {
  it("uses Italian time whatever the machine's time zone", () => {
    expect(romeNow(new Date("2026-06-03T10:30:00Z"))).toEqual({ dow: "3", minutes: 12 * 60 + 30 });
  });
});

describe("isOpenNow", () => {
  it("is open inside a slot and closed between slots and on closed days", () => {
    expect(isOpenNow(DEFAULT_HOURS, at("13:00"))).toBe(true);
    expect(isOpenNow(DEFAULT_HOURS, at("16:00"))).toBe(false);
    expect(isOpenNow(DEFAULT_HOURS, new Date("2026-06-01T13:00:00+02:00"))).toBe(false); // Monday
  });
});

describe("pickupSlots", () => {
  it("starts after the preparation time on a 15-minute grid", () => {
    const slots = pickupSlots(DEFAULT_HOURS, 20, at("12:05"));
    expect(slots[0]).toBe("12:30");
    expect(slots).toContain("14:30");
    expect(slots).toContain("19:00");
    expect(slots.at(-1)).toBe("23:00");
  });
  it("leaves a minute of margin when now + prep falls exactly on a slot", () => {
    expect(pickupSlots(DEFAULT_HOURS, 20, at("12:10"))[0]).toBe("12:45");
  });
  it("offers only evening slots in the afternoon and nothing after closing", () => {
    expect(pickupSlots(DEFAULT_HOURS, 20, at("16:00"))[0]).toBe("19:00");
    expect(pickupSlots(DEFAULT_HOURS, 20, at("22:50"))).toEqual([]);
  });
});

describe("hoursSummary", () => {
  it("groups consecutive days with the same hours", () => {
    expect(hoursSummary(DEFAULT_HOURS, "it")).toEqual(["Mer–Dom 12:00–14:30 · 19:00–23:00"]);
    expect(hoursSummary(DEFAULT_HOURS, "en")).toEqual(["Wed–Sun 12:00–14:30 · 19:00–23:00"]);
  });
});

describe("parseHours", () => {
  it("falls back to the default week for missing data and drops malformed slots", () => {
    expect(parseHours(null)).toBe(DEFAULT_HOURS);
    expect(parseHours({ "1": [["10:00", "12:00"], "bad"], "2": "bad" })["1"]).toEqual([["10:00", "12:00"]]);
  });
});
