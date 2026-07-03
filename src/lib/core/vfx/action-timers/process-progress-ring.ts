import { Graphics } from "pixi.js";
import { Colors } from "$lib/utils/colors";

const RADIUS = 22;
const TRACK_ALPHA = 0.28;
const START_ANGLE = -Math.PI / 2;
const PULSE_PERIOD_SEC = 1.1;

/**
 * Draws a filling ring over a station showing overall craft/process
 * progress (0->1 across the whole duration) — distinct from the per-beat
 * minigame VFX (strike ring / tremor line / sequence marks), which time
 * button-presses rather than convey "how far along is this." Always visible
 * while a process/craft runtime is active regardless of player range,
 * matching how the minigame VFX already isn't range-gated for rendering.
 * Color communicates whether leaving cancels the process; once a craft is
 * `readyForPickup` it switches to a pulsing gold "come get this" cue instead
 * of sitting static at a full but unremarkable ring.
 */
export function updateProcessProgressRing(
  g: Graphics,
  stationPos: { x: number; y: number },
  progress: number,
  walkAwaySafe: boolean,
  readyForPickup = false,
): void {
  if (progress <= 0) {
    g.visible = false;
    return;
  }

  g.visible = true;
  g.x = stationPos.x;
  g.y = stationPos.y;
  g.clear();

  if (readyForPickup) {
    const color = Colors.actionTimer.compassGold;
    const t = (performance.now() / 1000 / PULSE_PERIOD_SEC) % 1;
    g.circle(0, 0, RADIUS).stroke({ color, width: 3.5, alpha: 0.95 });
    g.circle(0, 0, RADIUS + 5 + t * 6).stroke({ color, width: 2, alpha: (1 - t) * 0.6 });
    return;
  }

  const color = walkAwaySafe ? Colors.actionTimer.processRingSafe : Colors.ui.warning;

  g.circle(0, 0, RADIUS).stroke({ color, width: 3, alpha: TRACK_ALPHA });

  const endAngle = START_ANGLE + Math.PI * 2 * Math.min(1, progress);
  g.arc(0, 0, RADIUS, START_ANGLE, endAngle).stroke({ color, width: 3, alpha: 0.9 });
}
