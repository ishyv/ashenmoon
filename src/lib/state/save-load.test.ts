import { beforeEach, describe, expect, it } from "vitest";
import { loadSlice, saveSlice, clearSlice } from "$lib/state/persistence/save-load";
import { isVersioned, migrateSlice, SAVE_VERSION } from "$lib/state/persistence/migrations";

beforeEach(() => localStorage.clear());

describe("migrateSlice", () => {
  it("passes versioned payloads through at the current version", () => {
    const out = migrateSlice<{ thirst: number }>({ v: 1, data: { thirst: 42 } });
    expect(out).toEqual({ v: SAVE_VERSION, data: { thirst: 42 } });
  });

  it("adopts legacy unversioned payloads as current data", () => {
    expect(migrateSlice<{ thirst: number }>({ thirst: 7 })).toEqual({
      v: SAVE_VERSION,
      data: { thirst: 7 },
    });
    expect(migrateSlice<number[]>([1, 2, 3])).toEqual({ v: SAVE_VERSION, data: [1, 2, 3] });
  });

  it("identifies version envelopes", () => {
    expect(isVersioned({ v: 1, data: {} })).toBe(true);
    expect(isVersioned({ thirst: 1 })).toBe(false);
    expect(isVersioned(null)).toBe(false);
  });
});

describe("save-load round-trip", () => {
  it("writes a versioned envelope and reads the data back", () => {
    saveSlice("ashenmoor_test", { thirst: 12 });
    expect(JSON.parse(localStorage.getItem("ashenmoor_test")!)).toEqual({
      v: SAVE_VERSION,
      data: { thirst: 12 },
    });
    expect(loadSlice("ashenmoor_test", { thirst: 0 })).toEqual({ thirst: 12 });
  });

  it("returns the fallback when a key is absent", () => {
    expect(loadSlice("missing", { thirst: 99 })).toEqual({ thirst: 99 });
  });

  it("reads legacy unversioned saves written before the envelope existed", () => {
    localStorage.setItem("ashenmoor_legacy", JSON.stringify({ thirst: 5 }));
    expect(loadSlice("ashenmoor_legacy", { thirst: 0 })).toEqual({ thirst: 5 });
  });

  it("returns the fallback on malformed json", () => {
    localStorage.setItem("ashenmoor_bad", "{not json");
    expect(loadSlice("ashenmoor_bad", null)).toBeNull();
  });

  it("clears a slice", () => {
    saveSlice("ashenmoor_test", 1);
    clearSlice("ashenmoor_test");
    expect(localStorage.getItem("ashenmoor_test")).toBeNull();
  });
});
