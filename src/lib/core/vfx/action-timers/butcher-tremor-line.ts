import { Graphics } from "pixi.js";
import { Colors } from "$lib/utils/colors";

const LINE_W = 72;           // wider line — more readable
const MARK_R = 5;            // slightly bigger mark
const OSC_HZ = 1.0;          // 1 full sweep/sec — half the original speed
const CLEAN_ZONE_MAX = 0.45; // 45% of 72px = 32px, ~450 ms inside per sweep
const CLEAN_ZONE_MIN = 0.28; // never narrows below 28% = 20px, ~280 ms inside per sweep

/**
 * Draws a blade-tremor line on a carcass with an oscillating precision mark.
 * elapsedSec drives the oscillation; actionProgress (0→1) narrows the clean zone.
 * Returns true if a valid precision tap occurred (mark inside clean zone when tapped).
 */
export function updateTremorLine(
  g: Graphics,
  carcassPos: { x: number; y: number },
  elapsedSec: number,
  actionProgress: number,
  tapThisFrame: boolean,
): boolean {
  if (actionProgress <= 0 || actionProgress >= 1) {
    g.visible = false;
    return false;
  }

  g.visible = true;
  g.x = carcassPos.x;
  g.y = carcassPos.y + 6;
  g.clear();

  const half = LINE_W / 2;

  // Base tension line
  g.moveTo(-half, 0).lineTo(half, 0)
    .stroke({ color: Colors.actionTimer.tremorLine, width: 1.5, alpha: 0.75 });

  // Clean zone: bright centered segment, narrowing as action progresses
  const zoneW = LINE_W * (CLEAN_ZONE_MAX - (CLEAN_ZONE_MAX - CLEAN_ZONE_MIN) * actionProgress);
  const zoneHalf = zoneW / 2;
  g.moveTo(-zoneHalf, 0).lineTo(zoneHalf, 0)
    .stroke({ color: Colors.actionTimer.tremorZone, width: 3, alpha: 0.9 });

  // Oscillating mark (diamond), slides left↔right
  const frac = (Math.sin(elapsedSec * OSC_HZ * Math.PI * 2) + 1) / 2;
  const markX = (frac - 0.5) * LINE_W;
  const markInZone = Math.abs(markX) <= zoneHalf;
  // Mark turns gold when inside the clean zone — instant read for the player
  const markColor = markInZone ? Colors.actionTimer.tremorZone : Colors.actionTimer.tremorMark;
  g.moveTo(markX, -MARK_R)
    .lineTo(markX + MARK_R, 0)
    .lineTo(markX, MARK_R)
    .lineTo(markX - MARK_R, 0)
    .closePath()
    .fill({ color: markColor, alpha: 0.9 });

  return tapThisFrame && markInZone;
}
