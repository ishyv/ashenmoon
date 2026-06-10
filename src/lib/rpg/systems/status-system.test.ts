import { describe, expect, it } from "vitest";
import {
  aggregateModifiers,
  applyStatus,
  clearStatus,
  hasStatus,
  tickStatuses,
} from "./status-system";
import { StatusId, type ActiveStatus } from "./status-types";

describe("applyStatus", () => {
  it("adds a new status", () => {
    const next = applyStatus([], StatusId.Sickness, 60, "dirty_water");
    expect(next).toEqual([{ id: StatusId.Sickness, remainingSec: 60, source: "dirty_water" }]);
  });

  it("refreshes instead of stacking, keeping the longer duration", () => {
    const list = applyStatus([], StatusId.Sickness, 60);
    const refreshed = applyStatus(list, StatusId.Sickness, 30);
    expect(refreshed).toHaveLength(1);
    expect(refreshed[0].remainingSec).toBe(60);

    const extended = applyStatus(refreshed, StatusId.Sickness, 90);
    expect(extended[0].remainingSec).toBe(90);
  });
});

describe("clearStatus", () => {
  it("removes the status and returns the same reference when absent", () => {
    const list = applyStatus([], StatusId.Cut, 20);
    expect(clearStatus(list, StatusId.Cut)).toEqual([]);
    expect(clearStatus(list, StatusId.Poison)).toBe(list);
  });
});

describe("tickStatuses", () => {
  it("decrements remaining time", () => {
    const list = applyStatus([], StatusId.Injured, 45);
    const { next } = tickStatuses(list, 5);
    expect(next[0].remainingSec).toBe(40);
  });

  it("reports expiry exactly once and drops the status", () => {
    const list = applyStatus([], StatusId.Cut, 3);
    const result = tickStatuses(list, 5);
    expect(result.expired).toEqual([StatusId.Cut]);
    expect(result.next).toEqual([]);
    expect(hasStatus(result.next, StatusId.Cut)).toBe(false);
  });

  it("fires pulses when crossing pulse boundaries", () => {
    // Sickness pulses every 10s with -2 hp. From 60s, a 1s tick crosses no
    // boundary; ticking from 51 to 49 crosses 50.
    let list: ActiveStatus[] = applyStatus([], StatusId.Sickness, 60);
    let result = tickStatuses(list, 1);
    expect(result.pulses).toEqual([]);
    expect(result.hpDelta).toBe(0);

    list = [{ id: StatusId.Sickness, remainingSec: 51 }];
    result = tickStatuses(list, 2);
    expect(result.pulses).toEqual([StatusId.Sickness]);
    expect(result.hpDelta).toBe(-2);
  });

  it("accumulates multiple pulse crossings in one large tick", () => {
    // Bleeding pulses every 5s with -2 hp. A 20s tick from 20s crosses 15, 10, 5
    // and expires at 0 (Math.floor(20/5) - Math.floor(0/5) = 4 crossings).
    const list: ActiveStatus[] = [{ id: StatusId.Bleeding, remainingSec: 20 }];
    const result = tickStatuses(list, 20);
    expect(result.expired).toEqual([StatusId.Bleeding]);
    expect(result.hpDelta).toBe(-8);
  });

  it("returns the same reference for empty lists", () => {
    const empty: ActiveStatus[] = [];
    expect(tickStatuses(empty, 5).next).toBe(empty);
  });
});

describe("aggregateModifiers", () => {
  it("returns identity with no statuses", () => {
    expect(aggregateModifiers([])).toEqual({ staminaRegenMult: 1, moveSpeedMult: 1 });
  });

  it("multiplies modifiers across statuses", () => {
    // Sickness: staminaRegenMult 0.5. Exhaustion: 0.4 regen, 0.85 move.
    const list = applyStatus(applyStatus([], StatusId.Sickness, 60), StatusId.Exhaustion, 30);
    const mods = aggregateModifiers(list);
    expect(mods.staminaRegenMult).toBeCloseTo(0.5 * 0.4);
    expect(mods.moveSpeedMult).toBeCloseTo(0.85);
  });
});
