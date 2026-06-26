import { describe, expect, it, vi } from "vitest";

vi.mock("pixi.js", () => ({
  Assets: { get: vi.fn() },
  Rectangle: class {},
  Sprite: class {},
  Texture: class {},
}));

import {
  GATHERABLE_RENDER_ADAPTERS,
  validateGatherableRenderAdapters,
} from "$lib/core/systems/gatherable-render-adapter";
import {
  GATHERABLE_DEFINITIONS,
  type GatherableRenderKind,
} from "$lib/domain/gathering/gatherables";

const FIRST_CAMP_GATHERABLE_IDS = [
  "water_source",
  "clay_deposit",
  "loose_stone_pickup",
  "flint_shard_pickup",
  "berry_bush",
  "grass_patch",
  "moss_patch",
  "bark_strip",
  "stick_pickup",
  "leaf_litter",
  "mushroom_patch",
] as const;

describe("gatherable render adapters", () => {
  it("covers every declared gatherable render kind", () => {
    const kinds = Array.from(
      new Set(Object.values(GATHERABLE_DEFINITIONS).map((definition) => definition.renderKind)),
    );

    expect(validateGatherableRenderAdapters(kinds)).toEqual([]);
  });

  it("keeps the first-camp loop on Ashenmoon or explicit fallback adapters", () => {
    const firstCampKinds = FIRST_CAMP_GATHERABLE_IDS.map((id) => GATHERABLE_DEFINITIONS[id]!.renderKind);
    const missing = firstCampKinds.filter((kind) => !GATHERABLE_RENDER_ADAPTERS[kind as GatherableRenderKind]);

    expect(missing).toEqual([]);
  });
});
