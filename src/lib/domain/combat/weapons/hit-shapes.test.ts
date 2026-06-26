import { describe, expect, it } from "vitest";
import { arcContains, capsuleContains, circleContains, hitShapeContains } from "./hit-shapes";

describe("circleContains", () => {
  it("includes points within the radius and excludes those beyond", () => {
    const o = { x: 0, y: 0 };
    expect(circleContains(o, 10, { x: 6, y: 8 })).toBe(true); // dist 10, on boundary
    expect(circleContains(o, 10, { x: 7, y: 8 })).toBe(false); // dist ~10.6
  });

  it("honours the point radius padding", () => {
    expect(circleContains({ x: 0, y: 0 }, 10, { x: 11, y: 0 }, 1)).toBe(true);
    expect(circleContains({ x: 0, y: 0 }, 10, { x: 12, y: 0 }, 1)).toBe(false);
  });
});

describe("arcContains", () => {
  const o = { x: 0, y: 0 };
  const shape = { radiusPx: 100, arcDegrees: 90 }; // ±45° wedge

  it("hits a target straight ahead within reach", () => {
    expect(arcContains(o, 0, shape, { x: 50, y: 0 })).toBe(true);
  });

  it("misses a target behind the player", () => {
    expect(arcContains(o, 0, shape, { x: -50, y: 0 })).toBe(false);
  });

  it("misses a target outside the wedge angle", () => {
    // 60° off-axis is outside a ±45° wedge
    const a = (60 * Math.PI) / 180;
    expect(arcContains(o, 0, shape, { x: Math.cos(a) * 50, y: Math.sin(a) * 50 })).toBe(false);
  });

  it("respects the offset rotation", () => {
    const offset = { radiusPx: 100, arcDegrees: 90, offsetDegrees: 90 };
    expect(arcContains(o, 0, offset, { x: 0, y: 50 })).toBe(true); // wedge rotated to +Y
    expect(arcContains(o, 0, offset, { x: 50, y: 0 })).toBe(false);
  });

  it("misses a target beyond the radius", () => {
    expect(arcContains(o, 0, shape, { x: 150, y: 0 })).toBe(false);
  });
});

describe("capsuleContains", () => {
  const o = { x: 0, y: 0 };
  const dir = { x: 1, y: 0 };
  const shape = { lengthPx: 100, widthPx: 40 }; // half-width 20

  it("hits along the shaft", () => {
    expect(capsuleContains(o, dir, shape, { x: 80, y: 10 })).toBe(true);
  });

  it("misses beyond the length", () => {
    expect(capsuleContains(o, dir, shape, { x: 130, y: 0 })).toBe(false);
  });

  it("misses outside the half-width", () => {
    expect(capsuleContains(o, dir, shape, { x: 50, y: 25 })).toBe(false);
  });
});

describe("hitShapeContains dispatch", () => {
  it("routes each shape kind to its test", () => {
    const o = { x: 0, y: 0 };
    expect(
      hitShapeContains({ shape: { kind: "circle", radiusPx: 10 }, origin: o, aimAngle: 0, point: { x: 5, y: 0 } }),
    ).toBe(true);
    expect(
      hitShapeContains({
        shape: { kind: "capsule", lengthPx: 100, widthPx: 40 },
        origin: o,
        aimAngle: 0,
        point: { x: 80, y: 0 },
      }),
    ).toBe(true);
    expect(
      hitShapeContains({
        shape: { kind: "arc", radiusPx: 100, arcDegrees: 90 },
        origin: o,
        aimAngle: 0,
        point: { x: 50, y: 0 },
      }),
    ).toBe(true);
  });
});
