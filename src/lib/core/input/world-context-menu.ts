import type { WorldContextMenuTarget } from "$lib/core/types";

export const WORLD_CONTEXT_MENU_INTERACT_RANGE = 2;

export function isWorldContextMenuOutOfRange(
  player: { gx: number; gy: number },
  target: Pick<WorldContextMenuTarget, "gx" | "gy">,
  maxRange = WORLD_CONTEXT_MENU_INTERACT_RANGE
): boolean {
  const dx = player.gx - target.gx;
  const dy = player.gy - target.gy;
  return Math.max(Math.abs(dx), Math.abs(dy)) > maxRange;
}
