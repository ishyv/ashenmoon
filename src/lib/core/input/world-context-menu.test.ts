import { describe, expect, it } from "vitest";
import { isWorldContextMenuOutOfRange } from "./world-context-menu";

describe("world context menu range", () => {
  it("stays open at the target tile and within interaction range", () => {
    expect(isWorldContextMenuOutOfRange({ gx: 10, gy: 10 }, { gx: 10, gy: 10 })).toBe(false);
    expect(isWorldContextMenuOutOfRange({ gx: 12, gy: 8 }, { gx: 10, gy: 10 })).toBe(false);
  });

  it("closes once the player moves beyond interaction range", () => {
    expect(isWorldContextMenuOutOfRange({ gx: 13, gy: 10 }, { gx: 10, gy: 10 })).toBe(true);
    expect(isWorldContextMenuOutOfRange({ gx: 10, gy: 7 }, { gx: 10, gy: 10 })).toBe(true);
  });
});
