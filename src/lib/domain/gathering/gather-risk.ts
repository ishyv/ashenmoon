/**
 * Bare-hand gathering risk. Tearing twigs, prying stones, or grubbing forage
 * without a tool occasionally leaves a minor wound. Tools protect you. Pure and
 * rng-injectable so the roll is testable.
 */
import { StatusId } from "$lib/domain/systems/status-types";

export type GatherNodeKind = "tree" | "ore" | "twig" | "stone" | "forage";

export interface GatherWound {
  readonly status: StatusId;
  readonly durationSec: number;
}

export interface GatherRiskContext {
  readonly hasTool: boolean;
  readonly nodeKind: GatherNodeKind;
}

/** Per-node chance [0,1] of a wound when gathered bare-handed. */
const WOUND_CHANCE: Record<GatherNodeKind, number> = {
  stone: 0.35,
  ore: 0.35,
  forage: 0.15,
  twig: 0.15,
  tree: 0.1,
};

export function gatherWoundChance(kind: GatherNodeKind): number {
  return WOUND_CHANCE[kind] ?? 0;
}

/**
 * Roll for a wound from one bare-hand gather. Returns the wound to apply, or
 * null when protected by a tool or the roll misses. Hard nodes (stone/ore) cut;
 * softer foliage draws light bleeding.
 */
export function rollGatherWound(
  ctx: GatherRiskContext,
  rng: () => number = Math.random,
): GatherWound | null {
  if (ctx.hasTool) return null;

  const chance = gatherWoundChance(ctx.nodeKind);
  if (chance <= 0 || rng() >= chance) return null;

  const isHard = ctx.nodeKind === "ore" || ctx.nodeKind === "stone";
  return isHard
    ? { status: StatusId.Cut, durationSec: 20 }
    : { status: StatusId.Bleeding, durationSec: 15 };
}
