import { Sprite, type Texture } from "pixi.js";
import {
  getBushTexture,
  getCursedRockTexture,
  getRockTexture,
  getRockVariantTexture,
  getTreeTexture,
  getTreeVariantTexture,
  getWoodItemTexture,
  getForgottenTreeTexture,
  getForgottenPropTexture,
} from "$lib/core/assets/assets";
import { TILE } from "$lib/core/systems/map/map";
import { computeRenderZ } from "$lib/domain/collision";
import type { GatherableDefinition, GatherableRenderKind } from "$lib/domain/gathering/gatherables";

interface GatherableRenderAdapter {
  texture: () => Texture;
  pickupScaleTiles: number;
}

export const GATHERABLE_RENDER_ADAPTERS = {
  tree: { texture: getTreeTexture, pickupScaleTiles: 0.4 },
  tree_crimson: { texture: () => getTreeVariantTexture(2), pickupScaleTiles: 0.4 },
  tree_frost: { texture: () => getTreeVariantTexture(3), pickupScaleTiles: 0.4 },
  tree_fungal: { texture: () => getTreeVariantTexture(4), pickupScaleTiles: 0.4 },
  rock: { texture: getRockTexture, pickupScaleTiles: 0.4 },
  rock_copper: { texture: () => getRockVariantTexture(2), pickupScaleTiles: 0.4 },
  rock_iron: { texture: () => getRockVariantTexture(3), pickupScaleTiles: 0.4 },
  rock_toxic: { texture: () => getRockVariantTexture(4), pickupScaleTiles: 0.4 },
  wood_pickup: { texture: getWoodItemTexture, pickupScaleTiles: 0.45 },
  stone_pickup: { texture: () => getRockVariantTexture(1), pickupScaleTiles: 0.35 },
  flint_pickup: { texture: () => getRockVariantTexture(2), pickupScaleTiles: 0.35 },
  forage: { texture: () => getBushTexture(1), pickupScaleTiles: 0.4 },
  moss: { texture: () => getBushTexture(2), pickupScaleTiles: 0.4 },
  rock_cursed: { texture: () => getCursedRockTexture(1), pickupScaleTiles: 0.85 },
  rock_cursed2: { texture: () => getCursedRockTexture(2), pickupScaleTiles: 0.85 },
  rock_cursed3: { texture: () => getCursedRockTexture(3), pickupScaleTiles: 0.85 },
  tree_forgotten: { texture: () => getForgottenTreeTexture(0, 0), pickupScaleTiles: 0.4 },
  prop_forgotten: { texture: () => getForgottenPropTexture(0, 0), pickupScaleTiles: 0.4 },
} satisfies Record<GatherableRenderKind, GatherableRenderAdapter>;

export function validateGatherableRenderAdapters(kinds: readonly GatherableRenderKind[]): string[] {
  return kinds
    .filter((kind) => !GATHERABLE_RENDER_ADAPTERS[kind])
    .map((kind) => `missing gatherable render adapter for ${kind}`);
}

export function createGatherableRenderSprite(
  gatherable: Pick<GatherableDefinition, "interactionKind" | "renderKind" | "solidKind">,
  ex: number,
  ey: number,
): Sprite {
  const adapter = GATHERABLE_RENDER_ADAPTERS[gatherable.renderKind];
  const sprite = new Sprite(adapter.texture());
  sprite.anchor.set(0.5, 1);
  sprite.x = ex + TILE / 2;
  sprite.y = ey + TILE;
  sprite.zIndex = computeRenderZ(sprite.y);

  if (gatherable.interactionKind !== "repeated_action") {
    sprite.scale.set((TILE * adapter.pickupScaleTiles) / 64);
  } else if (gatherable.solidKind === "tree") {
    sprite.scale.set((TILE * 1.5) / 256);
  } else {
    sprite.width = TILE * 0.9;
    sprite.height = TILE * 0.9;
  }

  return sprite;
}
