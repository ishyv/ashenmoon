import { describe, expect, it } from "vitest";
import { resolveWorldVisualScale } from "./world-visual-size";

describe("resolveWorldVisualScale", () => {
  it("uses height tiles as a uniform scale by default", () => {
    expect(resolveWorldVisualScale({
      spec: { heightTiles: 0.5 },
      texture: { width: 32, height: 64 },
      tilePx: 64,
    })).toEqual({ x: 0.5, y: 0.5 });
  });

  it("can resolve non-uniform width and height tile targets", () => {
    expect(resolveWorldVisualScale({
      spec: { widthTiles: 2, heightTiles: 1 },
      texture: { width: 64, height: 128 },
      tilePx: 64,
    })).toEqual({ x: 2, y: 0.5 });
  });

  it("falls back to identity scale when no size is authored", () => {
    expect(resolveWorldVisualScale({
      spec: {},
      texture: { width: 64, height: 64 },
      tilePx: 64,
    })).toEqual({ x: 1, y: 1 });
  });
});
