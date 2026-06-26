/**
 * Landmark data: examine text and one-time drop tables.
 * Pure domain — no Pixi, no Svelte.
 */

export type LandmarkKind =
  | "huge_dead_tree"
  | "ruined_watch_post"
  | "old_road"
  | "burned_cart"
  | "wolf_den"
  | "river_crossing"
  | "deer_grazing_area"
  | "fallen_tree"
  | "old_stump"
  | "pond"
  | "sentry_chest"
  | "skeleton_remains"
  | "cursed_monolith"
  | "bone_pile";

export interface LandmarkDrop {
  itemId: string;
  qty: number;
  /** 0–1 roll; omit for guaranteed */
  chance?: number;
}

export interface LandmarkDef {
  kind: LandmarkKind;
  displayName: string;
  /** Text shown when the player examines the landmark. */
  examineText: string;
  /** Text shown after drops have already been collected. */
  depletedText?: string;
  drops: LandmarkDrop[];
  /** True if this landmark acts as a solid obstacle to movement. */
  solid?: boolean;
}

export const LANDMARK_DEFS: Record<LandmarkKind, LandmarkDef> = {
  huge_dead_tree: {
    kind: "huge_dead_tree",
    displayName: "dead tree",
    examineText:
      "A massive oak, long dead. The bark peels in curling sheets. Resin has wept and hardened along old cracks. Fungus clusters near the roots.",
    depletedText: "The dead tree stands hollow. Nothing useful left on it.",
    drops: [
      { itemId: "bark",   qty: 2 },
      { itemId: "resin",  qty: 1 },
      { itemId: "branch", qty: 2 },
      { itemId: "mushroom", qty: 1, chance: 0.5 },
    ],
    solid: true,
  },
  ruined_watch_post: {
    kind: "ruined_watch_post",
    displayName: "watch post",
    examineText:
      "A collapsed timber structure, overgrown. Someone built this to watch the forest. Most of the wood has rotted, but rope and fiber bindings survive.",
    depletedText: "The post is picked clean. Broken timber and moss.",
    drops: [
      { itemId: "grass_fiber", qty: 2 },
      { itemId: "branch",      qty: 2 },
      { itemId: "flint_shard", qty: 1, chance: 0.4 },
    ],
    solid: false,
  },
  old_road: {
    kind: "old_road",
    displayName: "old road",
    examineText:
      "Flat stones, worn smooth. The forest has swallowed most of it but the line is still readable. It goes somewhere.",
    drops: [],
    solid: false,
  },
  burned_cart: {
    kind: "burned_cart",
    displayName: "burned cart",
    examineText:
      "The charred skeleton of a cart. One wheel still stands. Rope and cloth scraps cling to the frame.",
    depletedText: "Nothing salvageable remains. Just ash and scorched wood.",
    drops: [
      { itemId: "charcoal",    qty: 2 },
      { itemId: "leaves",      qty: 2 },
      { itemId: "grass_fiber", qty: 1 },
      { itemId: "branch",      qty: 1, chance: 0.6 },
    ],
    solid: false,
  },
  wolf_den: {
    kind: "wolf_den",
    displayName: "wolf den",
    examineText:
      "A hollow carved under gnarled roots. Bones at the entrance. The smell is sharp and animal. Something lives here.",
    drops: [],
    solid: false,
  },
  river_crossing: {
    kind: "river_crossing",
    displayName: "river crossing",
    examineText:
      "Flat stones bridge the water here. Slippery. The current is steady.",
    drops: [],
    solid: false,
  },
  deer_grazing_area: {
    kind: "deer_grazing_area",
    displayName: "grazing ground",
    examineText:
      "The grass is cropped short and pressed flat. Hoof prints in the soft earth. Deer come here.",
    drops: [],
    solid: false,
  },
  fallen_tree: {
    kind: "fallen_tree",
    displayName: "fallen tree",
    examineText: "A large trunk lies across the ground, carpeted in moss.",
    drops: [
      { itemId: "moss",   qty: 1 },
      { itemId: "branch", qty: 1, chance: 0.7 },
    ],
    solid: true,
  },
  old_stump: {
    kind: "old_stump",
    displayName: "old stump",
    examineText: "A wide stump, cut long ago. Bark peels from the edge.",
    drops: [
      { itemId: "bark", qty: 1 },
    ],
    solid: false,
  },
  pond: {
    kind: "pond",
    displayName: "dark pond",
    examineText: "Still water, dark at the centre. The surface reflects the canopy.",
    drops: [],
    solid: false,
  },
  sentry_chest: {
    kind: "sentry_chest",
    displayName: "sentry chest",
    examineText: "A weathered ironbound chest, rusted shut but partially split open at the side. Moss covers the lid.",
    depletedText: "The chest lies broken and empty.",
    drops: [
      { itemId: "flint_shard", qty: 2 },
      { itemId: "stone_block", qty: 1, chance: 0.5 },
      { itemId: "copper_ore", qty: 1, chance: 0.3 },
    ],
    solid: true,
  },
  skeleton_remains: {
    kind: "skeleton_remains",
    displayName: "skeleton remains",
    examineText: "Bleached bones, scattered and half-buried in the leaf litter. Scraps of cloth and fiber wraps cling to them.",
    depletedText: "Only dust and broken bones remain.",
    drops: [
      { itemId: "grass_fiber", qty: 2 },
      { itemId: "small_bone", qty: 2 },
      { itemId: "bone_shard", qty: 1, chance: 0.6 },
    ],
    solid: false,
  },
  cursed_monolith: {
    kind: "cursed_monolith",
    displayName: "cursed altar",
    examineText: "A jagged stone monolith, cold and silent. Faint, dark veins are etched into the rock face. The air nearby feels heavy.",
    drops: [],
    solid: true,
  },
  bone_pile: {
    kind: "bone_pile",
    displayName: "bone pile",
    examineText: "A heap of gnawed animal bones. Wolves have dragged their kills here.",
    depletedText: "A scattered pile of splinters.",
    drops: [
      { itemId: "small_bone", qty: 1 },
      { itemId: "bone_shard", qty: 1, chance: 0.5 },
    ],
    solid: false,
  },
};
