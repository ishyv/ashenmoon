import { describe, expect, it } from "vitest";
import {
  CollisionFootprints,
  computeRenderZ,
  intersectsAabb,
  PLAYER_BODY,
  resolveFootprintAabb,
} from "$lib/domain/collision";

describe("collision footprints", () => {
  it("converts normalized footprints from tile origin into world AABBs", () => {
    expect(resolveFootprintAabb(2, 3, CollisionFootprints.rock, 64)).toEqual({
      minX: 139.52,
      maxX: 180.48,
      minY: 229.12,
      maxY: 249.6,
    });
  });

  it("lets the player approach the visible rock crown from above without a large invisible wall", () => {
    const rock = resolveFootprintAabb(10, 10, CollisionFootprints.rock, 64);
    const playerFeetAboveRock = {
      minX: 10 * 64 + 32 - PLAYER_BODY.hx,
      maxX: 10 * 64 + 32 + PLAYER_BODY.hx,
      minY: 10 * 64 + 25 - PLAYER_BODY.hy,
      maxY: 10 * 64 + 25 + PLAYER_BODY.hy,
    };

    expect(intersectsAabb(playerFeetAboveRock, rock)).toBe(false);
  });

  it("blocks the player before their feet enter the lower rock footprint from below", () => {
    const rock = resolveFootprintAabb(10, 10, CollisionFootprints.rock, 64);
    const playerFeetAtRockBase = {
      minX: 10 * 64 + 32 - PLAYER_BODY.hx,
      maxX: 10 * 64 + 32 + PLAYER_BODY.hx,
      minY: 10 * 64 + 60 - PLAYER_BODY.hy,
      maxY: 10 * 64 + 60 + PLAYER_BODY.hy,
    };

    expect(intersectsAabb(playerFeetAtRockBase, rock)).toBe(true);
  });

  it("uses trunk-only tree footprints instead of leaf-sized blockers", () => {
    const tree = resolveFootprintAabb(5, 5, CollisionFootprints.tree, 64);

    expect(tree.minX).toBeCloseTo(5 * 64 + 25.6);
    expect(tree.maxX).toBeCloseTo(5 * 64 + 38.4);
    expect(tree.minY).toBeCloseTo(5 * 64 + 44.8);
    expect(tree.maxY).toBeCloseTo(5 * 64 + 62.72);
  });

  it("orders render baselines by world y with optional z bands", () => {
    expect(computeRenderZ(100)).toBeLessThan(computeRenderZ(101));
    expect(computeRenderZ(100, 10_000)).toBeGreaterThan(computeRenderZ(101));
  });
});
