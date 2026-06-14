/**
 * VisionSystem — screen-space field-of-view darkness overlay.
 *
 * Renders a "darkness ring" centred on the player each frame. Inside the
 * vision radius the world is unobscured. Outside it is shrouded in brownish
 * fog during the day and near-total darkness at night (this layer stacks
 * above the existing nightOverlay, so combined night darkness reaches ~80%).
 *
 * Technique — Graphics.cut():
 *   Pixi.js v8 exposes a cut() method that subtracts the current active path
 *   from the previously drawn fill instruction, producing a "donut" shape:
 *     g.rect(0,0,W,H).fill(style)  → fills the entire rect
 *     g.circle(cx,cy,r).cut()      → punches a circular hole in that fill
 *   Three stacked donuts with increasing hole radii and equal per-ring alpha
 *   create a natural darkness ramp:
 *     r < baseR               → 0%    darkness (clear vision)
 *     baseR to baseR+feather  → ~37%-68% darkness (smooth transition zone)
 *     r > baseR + feather     → ~95%  darkness (full shroud)
 *   Three source-over layers at factor 0.37 give: 1 - (1 - 0.37a)^3 ≈ a.
 *
 * Campfire secondary light pools are a future addition. They would require
 * additional cut() calls per campfire position within each donut, which only
 * produces correct holes for campfires located outside the player radius.
 *
 * Boundaries: this module owns only rendering. It reads timeOfDay and zoom
 * but never mutates game state.
 */
import { Container, Graphics } from "pixi.js";

/** All tunable numbers in one place — do not bury them in tick(). */
const CFG = {
  VISION_RADIUS_TILES: 4.5,  // inner clear radius in world tiles
  FEATHER_TILES: 1.4,         // soft-edge transition width in world tiles
  NIGHT_BG_ALPHA: 0.55,       // max alpha at night (stacks above nightOverlay)
  DAY_BG_ALPHA: 0.42,         // max alpha during day (brownish haze)
  DAWN_DUSK_ALPHA: 0.28,      // max alpha at dawn/dusk transitions
  RING_ALPHA_FACTOR: 0.37,    // per-ring factor; three layers reach ~95% of target
  ALPHA_LERP_SPEED: 0.8,      // lerp speed in seconds for smooth day/night transition
  NIGHT_COLOR: 0x000000 as number,
  DAY_COLOR: 0x0f0a06 as number, // dark brownish smoke
} as const;

const TILE = 64; // local copy — avoids importing the map module

export class VisionSystem {
  public readonly layer = new Container();
  private readonly g = new Graphics();
  private _bgAlpha = 0;

  init(): void {
    this.layer.eventMode = "none";
    this.layer.addChild(this.g);
  }

  tick(
    dt: number,
    screen: { width: number; height: number },
    playerWorldPos: { x: number; y: number },
    timeOfDay: number,
    zoom: number,
  ): void {
    const { width: sw, height: sh } = screen;

    const isNight =
      timeOfDay >= 0.75 || timeOfDay < 0.18;
    const isDawnDusk =
      (timeOfDay >= 0.15 && timeOfDay <= 0.25) ||
      (timeOfDay >= 0.65 && timeOfDay <= 0.75);

    const targetAlpha = isNight
      ? CFG.NIGHT_BG_ALPHA
      : isDawnDusk
      ? CFG.DAWN_DUSK_ALPHA
      : CFG.DAY_BG_ALPHA;

    // Lerp so the ring fades in/out smoothly as day transitions to night
    this._bgAlpha += (targetAlpha - this._bgAlpha) * Math.min(1, dt * CFG.ALPHA_LERP_SPEED);

    const bgColor   = isNight ? CFG.NIGHT_COLOR : CFG.DAY_COLOR;
    const cx        = sw / 2;
    const cy        = sh / 2;
    const baseR     = CFG.VISION_RADIUS_TILES * TILE * zoom;
    const feather   = CFG.FEATHER_TILES       * TILE * zoom;
    // Three donuts at this per-ring alpha accumulate to ~95% of targetAlpha
    const ringAlpha = this._bgAlpha * CFG.RING_ALPHA_FACTOR;

    this.g.clear();

    // Donut 1 — tightest hole: darkens everything beyond baseR
    this.g.rect(0, 0, sw, sh).fill({ color: bgColor, alpha: ringAlpha });
    this.g.circle(cx, cy, baseR).cut();

    // Donut 2 — mid hole: adds darkness beyond baseR + feather*0.5
    this.g.rect(0, 0, sw, sh).fill({ color: bgColor, alpha: ringAlpha });
    this.g.circle(cx, cy, baseR + feather * 0.5).cut();

    // Donut 3 — largest hole: adds darkness beyond baseR + feather
    this.g.rect(0, 0, sw, sh).fill({ color: bgColor, alpha: ringAlpha });
    this.g.circle(cx, cy, baseR + feather).cut();
  }
}
