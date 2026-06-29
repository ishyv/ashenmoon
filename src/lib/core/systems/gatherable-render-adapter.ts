import { Sprite, type Texture } from "pixi.js";
import {
  getAshenmoonGatherableTexture,
  type AshenmoonGatherableKey,
} from "$lib/core/assets/ashenmoon-assets";
import { TILE } from "$lib/core/systems/map/map";
import { computeRenderZ } from "$lib/domain/collision";
import type { GatherableDefinition, GatherableRenderKind } from "$lib/domain/gathering/gatherables";
import { resolveWorldVisualScale } from "$lib/domain/visual/world-visual-size";

interface GatherableRenderAdapter {
  texture: (gatherable?: Pick<GatherableDefinition, "id">) => Texture;
  pickupScaleTiles: number;
}

export const GATHERABLE_RENDER_ADAPTERS = {
  tree: { texture: () => getAshenmoonGatherableTexture("tree"), pickupScaleTiles: 0.4 },
  tree_crimson: { texture: () => getAshenmoonGatherableTexture("treeCrimson"), pickupScaleTiles: 0.4 },
  tree_frost: { texture: () => getAshenmoonGatherableTexture("treeFrost"), pickupScaleTiles: 0.4 },
  tree_fungal: { texture: () => getAshenmoonGatherableTexture("treeFungal"), pickupScaleTiles: 0.4 },
  rock: { texture: () => getAshenmoonGatherableTexture("rock"), pickupScaleTiles: 0.4 },
  rock_copper: { texture: () => getAshenmoonGatherableTexture("rockCopper"), pickupScaleTiles: 0.4 },
  rock_iron: { texture: () => getAshenmoonGatherableTexture("rockIron"), pickupScaleTiles: 0.4 },
  rock_toxic: { texture: () => getAshenmoonGatherableTexture("rockToxic"), pickupScaleTiles: 0.4 },
  wood_pickup: {
    texture: (gatherable) => getAshenmoonGatherableTexture(
      gatherable?.id === "bark_strip" || gatherable?.id === "resin_pickup" ? "barkPickup" : "stickPickup"
    ),
    pickupScaleTiles: 0.45,
  },
  stone_pickup: { texture: () => getAshenmoonGatherableTexture("stonePickup"), pickupScaleTiles: 0.35 },
  flint_pickup: { texture: () => getAshenmoonGatherableTexture("flintPickup"), pickupScaleTiles: 0.35 },
  forage: { texture: () => getAshenmoonGatherableTexture("grassPatch"), pickupScaleTiles: 0.4 },
  berry_bush: { texture: () => getAshenmoonGatherableTexture("berryBush"), pickupScaleTiles: 0.75 },
  grass_patch: { texture: () => getAshenmoonGatherableTexture("grassPatch"), pickupScaleTiles: 0.45 },
  mushroom_patch: { texture: () => getAshenmoonGatherableTexture("mushroomPatch"), pickupScaleTiles: 0.38 },
  moss: { texture: () => getAshenmoonGatherableTexture("mossPatch"), pickupScaleTiles: 0.4 },
  reeds: { texture: () => getAshenmoonGatherableTexture("reeds"), pickupScaleTiles: 0.65 },
  rock_small: {
    texture: (gatherable) => {
      const keyed: Partial<Record<string, AshenmoonGatherableKey>> = {
        clay_deposit: "clay",
        flint_shard_pickup: "flintPickup",
        loose_stone_pickup: "stonePickup",
      };
      return getAshenmoonGatherableTexture(keyed[gatherable?.id ?? ""] ?? "rock");
    },
    pickupScaleTiles: 0.38,
  },
  rock_cursed: { texture: () => getAshenmoonGatherableTexture("cursedRock1"), pickupScaleTiles: 0.85 },
  rock_cursed2: { texture: () => getAshenmoonGatherableTexture("cursedRock2"), pickupScaleTiles: 0.85 },
  rock_cursed3: { texture: () => getAshenmoonGatherableTexture("cursedRock3"), pickupScaleTiles: 0.85 },
} satisfies Record<GatherableRenderKind, GatherableRenderAdapter>;

export function validateGatherableRenderAdapters(kinds: readonly GatherableRenderKind[]): string[] {
  return kinds
    .filter((kind) => !GATHERABLE_RENDER_ADAPTERS[kind])
    .map((kind) => `missing gatherable render adapter for ${kind}`);
}

export function createGatherableRenderSprite(
  gatherable: Pick<GatherableDefinition, "id" | "interactionKind" | "renderKind" | "solidKind">,
  ex: number,
  ey: number,
): Sprite {
  const adapter = GATHERABLE_RENDER_ADAPTERS[gatherable.renderKind];
  const sprite = new Sprite(adapter.texture(gatherable));
  sprite.anchor.set(0.5, 1);
  sprite.x = ex + TILE / 2;
  sprite.y = ey + TILE;
  sprite.zIndex = computeRenderZ(sprite.y);

  if (gatherable.interactionKind !== "repeated_action") {
    const sourceSize = Math.max(sprite.texture.width, sprite.texture.height);
    const scale = (TILE * adapter.pickupScaleTiles) / sourceSize;
    sprite.scale.set(scale);
  } else if (gatherable.solidKind === "tree") {
    const scale = resolveWorldVisualScale({
      spec: { heightTiles: 2.2 },
      texture: sprite.texture,
      tilePx: TILE,
    });
    sprite.scale.set(scale.x, scale.y);
  } else {
    const sourceSize = Math.max(sprite.texture.width, sprite.texture.height);
    const scale = (TILE * 0.95) / sourceSize;
    sprite.scale.set(scale);
  }

  return sprite;
}
