import { Graphics } from "pixi.js";
import { Colors } from "$lib/utils/colors";

const OUTER_R = 38;
const INNER_R = 14;
// Sweet-spot starts at 55% of the cycle — gives a ~270 ms window at 0.6 s interval
const SWEET_SPOT = 0.55;

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

  // Ghost track at the target hit radius — more visible so player knows the destination
  g.circle(0, 0, INNER_R).stroke({ color, width: 1.5, alpha: 0.30 });

  // Contracting ring: lerps from OUTER_R to INNER_R as progress → 1
  const r = OUTER_R - (OUTER_R - INNER_R) * progress;
  const inZone = progress >= SWEET_SPOT;

  if (!inZone) {
    g.circle(0, 0, r).stroke({ color, width: 2, alpha: 0.85 });
  } else {
    // Sweet-spot zone: ring brightens and stays bright
    const t = (progress - SWEET_SPOT) / (1 - SWEET_SPOT); // 0→1 through the zone
    g.circle(0, 0, r).stroke({ color, width: 3.5, alpha: 0.95 });
    // Expanding pulse signals the open window
    const pulseR = INNER_R + (1 - t) * 14;
    g.circle(0, 0, pulseR).stroke({ color, width: 2, alpha: (1 - t) * 0.5 });
  }

  return tapThisFrame && inZone;
}
