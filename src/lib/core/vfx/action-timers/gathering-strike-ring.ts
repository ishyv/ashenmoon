import { Graphics } from "pixi.js";
import { Colors } from "$lib/utils/colors";

const OUTER_R = 38;
const INNER_R = 14;
const SWEET_SPOT = 0.88;

export function ringColorForSolidKind(solidKind: string): number {
  if (solidKind === "tree") return Colors.actionTimer.strikeRingWood;
  if (solidKind === "rock") return Colors.actionTimer.strikeRingRock;
  return Colors.actionTimer.strikeRingPlant;
}

/**
 * Draws a contracting ring over a resource node, signaling the gather rhythm.
 * progress: 0→1 where 1 is the moment the hit fires.
 * Returns true if a valid precision tap occurred (tap within sweet spot).
 */
export function updateStrikeRing(
  g: Graphics,
  nodePos: { x: number; y: number },
  progress: number,
  solidKind: string,
  tapThisFrame: boolean,
): boolean {
  if (progress <= 0) {
    g.visible = false;
    return false;
  }

  g.visible = true;
  g.x = nodePos.x;
  g.y = nodePos.y;
  g.clear();

  const color = ringColorForSolidKind(solidKind);

  // Ghost track at the target hit radius
  g.circle(0, 0, INNER_R).stroke({ color, width: 1.5, alpha: 0.18 });

  // Contracting ring: lerps from OUTER_R to INNER_R as progress → 1
  const r = OUTER_R - (OUTER_R - INNER_R) * progress;
  g.circle(0, 0, r).stroke({ color, width: 2, alpha: 0.85 });

  // Sweet-spot flare: brief outer pulse when ring reaches INNER_R
  if (progress >= SWEET_SPOT) {
    const t = (progress - SWEET_SPOT) / (1 - SWEET_SPOT);
    g.circle(0, 0, INNER_R + t * 9).stroke({ color, width: 3, alpha: (1 - t) * 0.65 });
  }

  return tapThisFrame && progress >= SWEET_SPOT;
}
