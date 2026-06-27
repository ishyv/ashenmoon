import { describe, expect, it } from "vitest";
import { lerpTint } from "./lerpTint.js";

describe("lerpTint", () => {
  it("returns a at frac=0", () => {
    expect(lerpTint(0x000000, 0xffffff, 0)).toBe(0x000000);
  });

  it("returns b at frac=1", () => {
    expect(lerpTint(0x000000, 0xffffff, 1)).toBe(0xffffff);
  });

  it("interpolates midpoint (0x808080 with Math.round)", () => {
    const mid = lerpTint(0x000000, 0xffffff, 0.5);
    expect(mid === 0x7f7f7f || mid === 0x808080).toBe(true);
  });

  it("clamps frac below 0 to 0", () => {
    expect(lerpTint(0x000000, 0xffffff, -1)).toBe(0x000000);
  });

  it("clamps frac above 1 to 1", () => {
    expect(lerpTint(0x000000, 0xffffff, 2)).toBe(0xffffff);
  });

  it("mixes only active channels (red+blue)", () => {
    const result = lerpTint(0xff0000, 0x0000ff, 0.5);
    const r = (result >> 16) & 0xff;
    const g = (result >> 8) & 0xff;
    const b = result & 0xff;
    expect(g).toBe(0);
    expect(r).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(0);
  });
});
