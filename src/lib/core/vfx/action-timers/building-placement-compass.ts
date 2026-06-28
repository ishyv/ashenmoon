import { Graphics } from "pixi.js";
import { Colors } from "$lib/utils/colors";

const TICK_LEN = 8;
const LOCK_START = 0.82;
const LOCK_RING_R = 18;

/**
 * Draws a wobbling crosshair over a building's anchor point.
 * Drift decays as progress → LOCK_START, then the crosshair snaps steady.
 * Returns true if a valid snap tap occurred (tap during lock phase, progress ≥ LOCK_START).
 */
export function updatePlacementCompass(
  g: Graphics,
  buildingCenter: { x: number; y: number },
  progress: number,
  tapThisFrame: boolean,
): boolean {
  if (progress <= 0) {
    g.visible = false;
    return false;
  }

  g.visible = true;
  g.x = buildingCenter.x;
  g.y = buildingCenter.y;
  g.clear();

  const color = Colors.actionTimer.compassGold;
  const inLock = progress >= LOCK_START;

  if (!inLock) {
    // Drift phase: amplitude decays as progress approaches LOCK_START
    const decay = 1 - progress / LOCK_START;
    const wobbleAngle = Math.sin(progress * 8.5) * decay * 0.55;
    const wobbleR = TICK_LEN + Math.sin(progress * 11.2) * decay * 4;
    const cos = Math.cos(wobbleAngle);
    const sin = Math.sin(wobbleAngle);

    const dirs: [number, number][] = [
      [ cos,  sin],
      [-sin,  cos],
      [-cos, -sin],
      [ sin, -cos],
    ];
    for (const [dx, dy] of dirs) {
      g.moveTo(dx * (wobbleR * 0.35), dy * (wobbleR * 0.35))
        .lineTo(dx * wobbleR, dy * wobbleR);
    }
    g.stroke({ color, width: 1.5, alpha: 0.75 });
  } else {
    // Lock phase: cardinal ticks snap still + lock ring
    const dirs: [number, number][] = [[ 0,-1],[ 1, 0],[ 0, 1],[-1, 0]];
    for (const [dx, dy] of dirs) {
      g.moveTo(dx * (TICK_LEN * 0.35), dy * (TICK_LEN * 0.35))
        .lineTo(dx * TICK_LEN, dy * TICK_LEN);
    }
    g.stroke({ color, width: 1.5, alpha: 0.9 });

    const lockT = (progress - LOCK_START) / (1 - LOCK_START);
    g.circle(0, 0, LOCK_RING_R).stroke({ color, width: 1.5, alpha: 0.35 - lockT * 0.15 });
  }

  return tapThisFrame && inLock;
}
