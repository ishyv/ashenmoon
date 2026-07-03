import { Graphics } from "pixi.js";
import { Colors } from "$lib/utils/colors";

const RADIUS = 16;
const TRACK_ALPHA = 0.25;
const START_ANGLE = -Math.PI / 2;
const LOW_FUEL_THRESHOLD = 0.35;

/**
 * Draws an always-on fuel-remaining ring at a lit campfire — separate from
 * `process-progress-ring.ts` (which shows *busy* state) and positioned at a
 * different offset so the two never overlap. Not gated by player range or
 * busy state: fuel matters even when nothing is cooking. Fades from warm
 * ember toward dim grey as fuel runs low, mirroring how the campfire's own
 * sprite animation already communicates "dying out."
 */
export function updateCampfireFuelRing(
  g: Graphics,
  campfirePos: { x: number; y: number },
  fuelFrac: number,
): void {
  if (fuelFrac <= 0) {
    g.visible = false;
    return;
  }

  g.visible = true;
  g.x = campfirePos.x;
  g.y = campfirePos.y;
  g.clear();

  const color = fuelFrac > LOW_FUEL_THRESHOLD ? Colors.vfx.campfire : Colors.actionTimer.strikeRingRock;
  const alpha = 0.45 + fuelFrac * 0.45;

  g.circle(0, 0, RADIUS).stroke({ color, width: 2, alpha: TRACK_ALPHA });

  const endAngle = START_ANGLE + Math.PI * 2 * Math.min(1, fuelFrac);
  g.arc(0, 0, RADIUS, START_ANGLE, endAngle).stroke({ color, width: 2, alpha });
}
