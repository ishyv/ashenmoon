import type { ToolKind } from "./gather-system";
import type { FocusedGatherDifficulty } from "./focused-gather/focused-gather-types";
import { SkillKey } from "$lib/domain/game-events";
import { StatusId } from "$lib/domain/systems/status-types";
import { CollisionFootprints, type CollisionShape } from "$lib/domain/collision";

export type GatherInteractionKind = "pickup" | "repeated_action" | "liquid" | "harvest";
export type GatherableRenderKind =
  | "tree"
  | "tree_crimson"
  | "tree_frost"
  | "tree_fungal"
  | "rock"
  | "rock_copper"
  | "rock_iron"
  | "rock_toxic"
  | "wood_pickup"
  | "stone_pickup"
  | "flint_pickup"
  | "forage"
  | "berry_bush"
  | "grass_patch"
  | "mushroom_patch"
  | "moss"
  | "reeds"
  | "rock_small"
  | "rock_cursed"
  | "rock_cursed2"
  | "rock_cursed3";
export type GatherableSolidKind = "none" | "tree" | "rock";
export type GatherableSyncAction = "forest" | "mine";

/**
 * Key naming the strike sound a node makes when worked. The core audio layer
 * owns the key -> synthesizer mapping (see `playGatherSound`); `domain/` only
 * declares intent. Nodes that omit it fall back to the metallic "strike".
 */
export type GatherSoundKey = "chop" | "strike" | "dig";

export interface GatherYield {
  itemId: string;
  quantity: number;
}

export interface GatherRiskDefinition {
  chance: number;
  status: StatusId;
  durationSec: number;
  knowledgeItemId?: string;
  requiresBareHands?: boolean;
}

export interface DepletionRule {
  hp?: number;
  removeOnGather?: boolean;
}

export interface GatherableDefinition {
  id: string;
  displayName: string;
  interactionKind: GatherInteractionKind;
  requiredToolKind?: ToolKind;
  baseDurationSec: number;
  yieldTable: readonly GatherYield[];
  risks?: readonly GatherRiskDefinition[];
  depletion?: DepletionRule;
  renderKind: GatherableRenderKind;
  solidKind: GatherableSolidKind;
  collision?: CollisionShape;
  skillKey?: SkillKey.Lumberjacking | SkillKey.Mining;
  /** Strike sound when worked; defaults to "strike" (see `GatherSoundKey`). */
  gatherSound?: GatherSoundKey;
  /** Focused Gathering tier override; derived from render/solid kind when absent. */
  focusedGatherDifficulty?: FocusedGatherDifficulty;
  syncAction?: GatherableSyncAction;
  syncLocationId?: string;
  feedback: {
    start: string;
    success: string;
  };
}

export interface GatherYieldContext {
  quantityMultiplier?: number;
}

export interface GatherRiskContext {
  hasTool: boolean;
}

export interface GatherRiskOutcome {
  status: StatusId;
  durationSec: number;
  knowledgeItemId?: string;
}

export const GATHERABLE_DEFINITIONS: Record<string, GatherableDefinition> = {
  stick_pickup: {
    id: "stick_pickup",
    displayName: "Fallen Stick",
    interactionKind: "pickup",
    baseDurationSec: 0.1,
    yieldTable: [{ itemId: "stick", quantity: 1 }],
    depletion: { removeOnGather: true },
    renderKind: "wood_pickup",
    solidKind: "none",
    feedback: { start: "you reach for the fallen stick.", success: "you pick up a stick." },
  },
  loose_stone_pickup: {
    id: "loose_stone_pickup",
    displayName: "Loose Stone",
    interactionKind: "pickup",
    baseDurationSec: 0.1,
    yieldTable: [{ itemId: "stone", quantity: 1 }],
    depletion: { removeOnGather: true },
    renderKind: "rock_small",
    solidKind: "none",
    feedback: { start: "you pry a stone loose.", success: "you gather a loose stone." },
  },
  flint_shard_pickup: {
    id: "flint_shard_pickup",
    displayName: "Flint Shard",
    interactionKind: "pickup",
    baseDurationSec: 0.15,
    yieldTable: [{ itemId: "flint_shard", quantity: 1 }],
    risks: [
      {
        chance: 0.35,
        status: StatusId.Cut,
        durationSec: 20,
        knowledgeItemId: "flint_shard",
        requiresBareHands: true,
      },
    ],
    depletion: { removeOnGather: true },
    renderKind: "rock_small",
    solidKind: "none",
    feedback: { start: "you reach carefully for the sharp shard.", success: "you gather a flint shard." },
  },
  leaf_litter: {
    id: "leaf_litter",
    displayName: "Leaf Litter",
    interactionKind: "pickup",
    baseDurationSec: 0.1,
    yieldTable: [{ itemId: "leaves", quantity: 2 }],
    depletion: { removeOnGather: true },
    renderKind: "forage",
    solidKind: "none",
    feedback: { start: "you sweep up dry leaves.", success: "you gather dry leaves." },
  },
  bark_strip: {
    id: "bark_strip",
    displayName: "Loose Bark",
    interactionKind: "pickup",
    baseDurationSec: 0.2,
    yieldTable: [{ itemId: "bark", quantity: 1 }],
    depletion: { removeOnGather: true },
    renderKind: "wood_pickup",
    solidKind: "none",
    feedback: { start: "you pull bark from deadwood.", success: "you gather bark." },
  },
  berry_bush: {
    id: "berry_bush",
    displayName: "Berry Bush",
    interactionKind: "harvest",
    baseDurationSec: 0.4,
    yieldTable: [
      { itemId: "berries", quantity: 2 },
      { itemId: "green_leaves", quantity: 1 },
    ],
    risks: [{ chance: 0.15, status: StatusId.Bleeding, durationSec: 15, requiresBareHands: true }],
    depletion: { hp: 3 },
    renderKind: "berry_bush",
    solidKind: "none",
    feedback: { start: "you pick through thorny branches.", success: "you gather berries." },
  },
  mushroom_patch: {
    id: "mushroom_patch",
    displayName: "Mushroom Patch",
    interactionKind: "harvest",
    baseDurationSec: 0.35,
    yieldTable: [{ itemId: "mushroom", quantity: 1 }],
    risks: [{ chance: 0.12, status: StatusId.Poison, durationSec: 30, requiresBareHands: true }],
    depletion: { hp: 2 },
    renderKind: "mushroom_patch",
    solidKind: "none",
    feedback: { start: "you pinch the mushroom at its stem.", success: "you gather a mushroom." },
  },
  grass_patch: {
    id: "grass_patch",
    displayName: "Tough Grass",
    interactionKind: "harvest",
    baseDurationSec: 0.35,
    yieldTable: [{ itemId: "grass_fiber", quantity: 2 }],
    depletion: { hp: 3 },
    renderKind: "grass_patch",
    solidKind: "none",
    feedback: { start: "you twist and pull tough grass.", success: "you gather grass fiber." },
  },
  moss_patch: {
    id: "moss_patch",
    displayName: "Damp Moss",
    interactionKind: "harvest",
    baseDurationSec: 0.3,
    yieldTable: [{ itemId: "moss", quantity: 1 }],
    depletion: { hp: 2 },
    renderKind: "moss",
    solidKind: "none",
    feedback: { start: "you peel moss from the shaded ground.", success: "you gather moss." },
  },
  oak_tree: {
    id: "oak_tree",
    displayName: "Oak Tree",
    interactionKind: "repeated_action",
    requiredToolKind: "axe",
    gatherSound: "chop",
    baseDurationSec: 0.6,
    yieldTable: [{ itemId: "wood", quantity: 1 }],
    depletion: { hp: 15 },
    renderKind: "tree",
    solidKind: "tree",
    collision: { solid: true, footprint: CollisionFootprints.tree },
    skillKey: SkillKey.Lumberjacking,
    syncAction: "forest",
    syncLocationId: "oak_forest",
    feedback: { start: "the oak shudders under the blow.", success: "wood splinters free." },
  },
  crimson_ash_tree: {
    id: "crimson_ash_tree",
    displayName: "Crimson Ash Tree",
    interactionKind: "repeated_action",
    requiredToolKind: "axe",
    gatherSound: "chop",
    baseDurationSec: 0.6,
    yieldTable: [{ itemId: "wood", quantity: 1 }],
    depletion: { hp: 15 },
    renderKind: "tree_crimson",
    solidKind: "tree",
    collision: { solid: true, footprint: CollisionFootprints.tree },
    skillKey: SkillKey.Lumberjacking,
    syncAction: "forest",
    syncLocationId: "crimson_grove",
    feedback: { start: "the crimson ash creaks.", success: "red-dark wood splinters free." },
  },
  spore_mangrove_tree: {
    id: "spore_mangrove_tree",
    displayName: "Spore Mangrove Tree",
    interactionKind: "repeated_action",
    requiredToolKind: "axe",
    gatherSound: "chop",
    baseDurationSec: 0.6,
    yieldTable: [{ itemId: "wood", quantity: 1 }],
    depletion: { hp: 15 },
    renderKind: "tree_fungal",
    solidKind: "tree",
    collision: { solid: true, footprint: CollisionFootprints.tree },
    skillKey: SkillKey.Lumberjacking,
    syncAction: "forest",
    syncLocationId: "fungal_mire",
    feedback: { start: "spores shake from the mangrove.", success: "pale wood breaks loose." },
  },
  frost_pine_tree: {
    id: "frost_pine_tree",
    displayName: "Frost Pine Tree",
    interactionKind: "repeated_action",
    requiredToolKind: "axe",
    gatherSound: "chop",
    baseDurationSec: 0.6,
    yieldTable: [{ itemId: "wood", quantity: 1 }],
    depletion: { hp: 15 },
    renderKind: "tree_frost",
    solidKind: "tree",
    collision: { solid: true, footprint: CollisionFootprints.tree },
    skillKey: SkillKey.Lumberjacking,
    syncAction: "forest",
    syncLocationId: "frostbane_peak",
    feedback: { start: "frost shakes from the pine.", success: "cold pine wood breaks loose." },
  },
  stone_node: {
    id: "stone_node",
    displayName: "Stone Node",
    interactionKind: "repeated_action",
    requiredToolKind: "pickaxe",
    baseDurationSec: 0.6,
    yieldTable: [{ itemId: "stone", quantity: 1 }],
    depletion: { hp: 15 },
    renderKind: "rock",
    solidKind: "rock",
    collision: { solid: true, footprint: CollisionFootprints.rock },
    skillKey: SkillKey.Mining,
    syncAction: "mine",
    syncLocationId: "stone_mine",
    feedback: { start: "stone chips under the blow.", success: "stone breaks free." },
  },
  copper_ore_vein: {
    id: "copper_ore_vein",
    displayName: "Copper Ore Vein",
    interactionKind: "repeated_action",
    requiredToolKind: "pickaxe",
    baseDurationSec: 0.6,
    yieldTable: [{ itemId: "copper_ore", quantity: 1 }],
    depletion: { hp: 15 },
    renderKind: "rock_copper",
    solidKind: "rock",
    collision: { solid: true, footprint: CollisionFootprints.rock },
    skillKey: SkillKey.Mining,
    syncAction: "mine",
    syncLocationId: "copper_mine",
    feedback: { start: "copper flecks spark in the stone.", success: "copper ore breaks free." },
  },
  iron_ore_vein: {
    id: "iron_ore_vein",
    displayName: "Iron Ore Vein",
    interactionKind: "repeated_action",
    requiredToolKind: "pickaxe",
    baseDurationSec: 0.6,
    yieldTable: [{ itemId: "iron_ore", quantity: 1 }],
    depletion: { hp: 15 },
    renderKind: "rock_iron",
    solidKind: "rock",
    collision: { solid: true, footprint: CollisionFootprints.rock },
    skillKey: SkillKey.Mining,
    syncAction: "mine",
    syncLocationId: "iron_mine",
    feedback: { start: "iron-streaked stone rings under the blow.", success: "iron ore breaks free." },
  },
  toxic_copper_node: {
    id: "toxic_copper_node",
    displayName: "Toxic Copper Node",
    interactionKind: "repeated_action",
    requiredToolKind: "pickaxe",
    baseDurationSec: 0.6,
    yieldTable: [{ itemId: "copper_ore", quantity: 1 }],
    depletion: { hp: 15 },
    renderKind: "rock_toxic",
    solidKind: "rock",
    collision: { solid: true, footprint: CollisionFootprints.rock },
    skillKey: SkillKey.Mining,
    syncAction: "mine",
    syncLocationId: "copper_mine",
    feedback: { start: "the copper vein sweats a strange film.", success: "tainted copper breaks free." },
  },
  glacial_silver_vein: {
    id: "glacial_silver_vein",
    displayName: "Glacial Silver Vein",
    interactionKind: "repeated_action",
    requiredToolKind: "pickaxe",
    baseDurationSec: 0.6,
    yieldTable: [{ itemId: "silver_ore", quantity: 1 }],
    depletion: { hp: 15 },
    renderKind: "rock",
    solidKind: "rock",
    collision: { solid: true, footprint: CollisionFootprints.rock },
    skillKey: SkillKey.Mining,
    focusedGatherDifficulty: "hard",
    syncAction: "mine",
    syncLocationId: "silver_mine",
    feedback: { start: "frosted silver glints beneath the stone.", success: "silver ore breaks free." },
  },
  clay_deposit: {
    id: "clay_deposit",
    displayName: "Clay Deposit",
    interactionKind: "repeated_action",
    gatherSound: "dig",
    baseDurationSec: 0.7,
    yieldTable: [{ itemId: "clay", quantity: 1 }],
    depletion: { hp: 8 },
    renderKind: "rock",
    solidKind: "rock",
    collision: { solid: true, footprint: CollisionFootprints.rock },
    skillKey: SkillKey.Mining,
    feedback: { start: "you dig into the wet clay.", success: "you gather clay." },
  },
  water_source: {
    id: "water_source",
    displayName: "Murky Water",
    interactionKind: "liquid",
    baseDurationSec: 0.3,
    yieldTable: [{ itemId: "dirty_water", quantity: 1 }],
    renderKind: "reeds",
    solidKind: "none",
    feedback: { start: "you cup murky water carefully.", success: "you collect dirty water." },
  },
  branch_pickup: {
    id: "branch_pickup",
    displayName: "Fallen Branch",
    interactionKind: "pickup",
    baseDurationSec: 0.15,
    yieldTable: [{ itemId: "branch", quantity: 1 }],
    depletion: { removeOnGather: true },
    renderKind: "wood_pickup",
    solidKind: "none",
    feedback: { start: "you reach for the fallen branch.", success: "you pick up a branch." },
  },
  green_leaves_pickup: {
    id: "green_leaves_pickup",
    displayName: "Fallen Leaves",
    interactionKind: "pickup",
    baseDurationSec: 0.1,
    yieldTable: [{ itemId: "green_leaves", quantity: 2 }],
    depletion: { removeOnGather: true },
    renderKind: "grass_patch",
    solidKind: "none",
    feedback: { start: "you gather fresh green leaves.", success: "you picked up green leaves." },
  },
  resin_pickup: {
    id: "resin_pickup",
    displayName: "Tree Resin",
    interactionKind: "pickup",
    baseDurationSec: 0.1,
    yieldTable: [{ itemId: "resin", quantity: 1 }],
    depletion: { removeOnGather: true },
    renderKind: "wood_pickup",
    solidKind: "none",
    feedback: { start: "you peel resin from the bark.", success: "you gather sticky resin." },
  },
  vine_node: {
    id: "vine_node",
    displayName: "Hanging Vines",
    interactionKind: "harvest",
    baseDurationSec: 0.4,
    yieldTable: [{ itemId: "vine", quantity: 1 }],
    depletion: { removeOnGather: true },
    renderKind: "grass_patch",
    solidKind: "none",
    feedback: { start: "you pull and cut at the hanging vines.", success: "you harvest a flexible vine." },
  },
  wild_root_node: {
    id: "wild_root_node",
    displayName: "Wild Root",
    interactionKind: "harvest",
    baseDurationSec: 0.5,
    yieldTable: [{ itemId: "wild_root", quantity: 1 }],
    depletion: { removeOnGather: true },
    renderKind: "grass_patch",
    solidKind: "none",
    feedback: { start: "you dig into the soil for the root.", success: "you pull up a wild root." },
  },
  acorn_pickup: {
    id: "acorn_pickup",
    displayName: "Fallen Acorns",
    interactionKind: "pickup",
    baseDurationSec: 0.1,
    yieldTable: [{ itemId: "acorn", quantity: 2 }],
    depletion: { removeOnGather: true },
    renderKind: "wood_pickup",
    solidKind: "none",
    feedback: { start: "you gather acorns from the ground.", success: "you picked up some acorns." },
  },
  wild_herb_patch: {
    id: "wild_herb_patch",
    displayName: "Wild Herbs",
    interactionKind: "harvest",
    baseDurationSec: 0.4,
    yieldTable: [{ itemId: "wild_herb", quantity: 2 }],
    depletion: { removeOnGather: true },
    renderKind: "grass_patch",
    solidKind: "none",
    feedback: { start: "you pluck clean wild herbs.", success: "you harvest wild herbs." },
  },
};

export function getGatherableDefinition(id: string): GatherableDefinition | undefined {
  return GATHERABLE_DEFINITIONS[id];
}

export function getGatherableBySyncLocation(id: string): GatherableDefinition | undefined {
  return GATHERABLE_DEFINITIONS[id] ?? Object.values(GATHERABLE_DEFINITIONS).find((def) => def.syncLocationId === id);
}

export function resolveGatherYield(
  def: GatherableDefinition,
  ctx: GatherYieldContext = {},
  _rng: () => number = Math.random,
): GatherYield[] {
  const multiplier = Math.max(1, Math.floor(ctx.quantityMultiplier ?? 1));
  return def.yieldTable.map((entry) => ({
    itemId: entry.itemId,
    quantity: entry.quantity * multiplier,
  }));
}

export function rollGatherRisk(
  def: GatherableDefinition,
  ctx: GatherRiskContext,
  rng: () => number = Math.random,
): GatherRiskOutcome | null {
  for (const risk of def.risks ?? []) {
    if (risk.requiresBareHands && ctx.hasTool) continue;
    if (rng() < risk.chance) {
      return {
        status: risk.status,
        durationSec: risk.durationSec,
        ...(risk.knowledgeItemId ? { knowledgeItemId: risk.knowledgeItemId } : {}),
      };
    }
  }
  return null;
}
