/**
 * Pure gathering rules: tool requirements and skill-based scaling. The Pixi
 * interaction loop owns timers, input, and VFX; the numbers and gates that
 * decide *what* a swing does live here so they are testable and can't drift
 * between call sites.
 */

export type ToolKind = "axe" | "pickaxe";

const MIN_GATHER_INTERVAL = 0.15;
const GATHER_SKILL_FACTOR = 0.95;

/** Tool kind a gather action demands. Mining needs a pickaxe; chopping an axe. */
export function requiredToolKind(rpgAction: string): ToolKind {
  return rpgAction === "mine" ? "pickaxe" : "axe";
}

/**
 * Tool kind an item id names, or null if it is not a recognized tool.
 * "pickaxe" ends in "axe", so a pickaxe is checked first; an axe must exclude
 * pickaxes (otherwise a pickaxe would read as an axe and chop trees).
 */
export function toolKindOf(itemId: string): ToolKind | null {
  if (itemId.includes("pickaxe")) return "pickaxe";
  if (itemId.includes("axe")) return "axe";
  return null;
}

/** Whether an item id names a tool of the given kind. */
export function matchesToolKind(itemId: string, kind: ToolKind): boolean {
  return toolKindOf(itemId) === kind;
}

export type GatherToolGate =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "no_tool" | "wrong_tool"; readonly requiredKind: ToolKind };

/** Whether the equipped tool can harvest a node requiring `requiredKind`. */
export function checkGatherTool(
  equippedToolId: string | null,
  requiredKind: ToolKind,
): GatherToolGate {
  if (!equippedToolId) return { ok: false, reason: "no_tool", requiredKind };
  if (!matchesToolKind(equippedToolId, requiredKind)) {
    return { ok: false, reason: "wrong_tool", requiredKind };
  }
  return { ok: true };
}

/** Swing interval after skill speedup, floored so high levels stay playable. */
export function gatherInterval(baseInterval: number, skillLevel: number): number {
  const levels = Math.max(0, skillLevel - 1);
  return Math.max(MIN_GATHER_INTERVAL, baseInterval * Math.pow(GATHER_SKILL_FACTOR, levels));
}

/** Units yielded per swing. Super-gather doubles output. */
export function gatherQuantity(isSuper: boolean): number {
  return isSuper ? 2 : 1;
}

/** Stamina cost of a super-gather, cheaper at higher SuperGather skill (min 15). */
export function superGatherCost(baseCost: number, sgLevel: number): number {
  return Math.max(15, baseCost - (sgLevel - 1) * 2);
}

/** Cooldown between super-gathers, shorter at higher SuperGather skill (min 0.5s). */
export function superGatherCooldown(baseCooldown: number, sgLevel: number): number {
  return Math.max(0.5, baseCooldown - (sgLevel - 1) * 0.15);
}
