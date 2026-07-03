import { Graphics } from "pixi.js";
import { Colors } from "$lib/utils/colors";

const MARK_COUNT = 4;
const MARK_R = 5;
const SPACING = 20;
const CYCLE_SEC = 1.6;     // full left-to-right sweep at actionProgress 0
const MIN_CYCLE_SEC = 0.9; // fastest (hardest) sweep at actionProgress 1
const TAP_WINDOW_FRAC = 0.5; // fraction of a mark's slot during which it's lit/tappable

/**
 * Draws a row of marks that light up left-to-right on a repeating timer, for
 * the "sequence" attended-crafting minigame (drying/smoking recipes — no
 * existing oscillation/heat metaphor fit, so this is a new primitive rather
 * than a reuse of strike-ring/tremor-line). A tap only counts while the
 * currently-lit mark is active. `elapsedSec` drives which mark is lit and
 * cycles continuously across the whole craft; `actionProgress` (0..1, the
 * overall craft's completion) speeds the cycle up as it goes, matching the
 * "narrowing clean zone" difficulty curve tremor-line already uses.
 */
export function updateSequenceMarks(
  g: Graphics,
  pos: { x: number; y: number },
  elapsedSec: number,
  actionProgress: number,
  tapThisFrame: boolean,
): boolean {
  if (actionProgress <= 0 || actionProgress >= 1) {
    g.visible = false;
    return false;
  }

  g.visible = true;
  g.x = pos.x;
  g.y = pos.y + 6;
  g.clear();

  const cycleSec = CYCLE_SEC - (CYCLE_SEC - MIN_CYCLE_SEC) * actionProgress;
  const slotSec = cycleSec / MARK_COUNT;
  const cyclePos = elapsedSec % cycleSec;
  const activeIndex = Math.min(MARK_COUNT - 1, Math.floor(cyclePos / slotSec));
  const withinSlot = (cyclePos % slotSec) / slotSec;
  const lit = withinSlot < TAP_WINDOW_FRAC;

  const totalW = (MARK_COUNT - 1) * SPACING;
  for (let i = 0; i < MARK_COUNT; i++) {
    const mx = -totalW / 2 + i * SPACING;
    const isActive = i === activeIndex;
    const color = isActive && lit ? Colors.actionTimer.sequenceMarkLit : Colors.actionTimer.sequenceMarkDim;
    g.circle(mx, 0, MARK_R).fill({ color, alpha: isActive ? 0.95 : 0.5 });
  }

  return tapThisFrame && activeIndex >= 0 && lit;
}
