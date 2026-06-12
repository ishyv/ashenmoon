/**
 * In-world Pixi crafting crucible.
 *
 * Anchored to the campfire world position, scales/follows the camera exactly
 * like any other world-space sprite. The vessel (cauldron graphics) reacts
 * live to the resonance score: liquid color, bubble rate, rim glow, and a
 * gauge arc all update every frame.
 *
 * Input ownership: while open, pendingAttack / pendingInteract /
 * pendingFellSweep are consumed every frame and the main interaction system
 * is suppressed (same pattern as BuildingResource.isPlacementMode). Movement
 * stays live so walk-away auto-closes.
 */

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { VFXResource } from "$lib/core/vfx/vfx";
import { spawnEnvParticles, spawnEnvFloatingText } from "$lib/core/vfx/vfx";
import { Colors } from "$lib/utils/colors";
import { TILE } from "$lib/core/systems/map/map";
import { playSound } from "$lib/audio/audio-engine";
import type { ResonanceReading } from "$lib/domain/crafting/resonance";
import { openCraft, closeCraft, trayAdd, trayRemove, trayInputs } from "$lib/state/crafting-session.svelte";
import { gameState } from "$lib/state/game-state.svelte";

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export class CraftingResource {
  public isOpen = false;
  /** Set to true by the campfire handler to request opening. Consumed by engine. */
  public requestOpen = false;
  /** World position of the campfire (set once by spawnCamp). */
  public campfireWorldPos: { x: number; y: number } = { x: 0, y: 0 };

  // Pixi objects (null when closed)
  public root: Container | null = null;
  public _cauldron: Graphics | null = null;
  public _liquid: Graphics | null = null;
  public _gaugeArc: Graphics | null = null;
  public _rimGlow: Graphics | null = null;
  public _tokenContainer: Container | null = null;
  public _hintText: Text | null = null;

  // Internal timers
  public bubbleTimer = 0;
  public hintCooldown = 0;
  public lastScore = -1;
  public lastFlags: ResonanceReading["flags"] | null = null;
}

// ---------------------------------------------------------------------------
// Open / close
// ---------------------------------------------------------------------------

const CAULDRON_RADIUS = 22;
const GAUGE_RADIUS = 30;
const ZINDEX_VESSEL = 84_000;
const ZINDEX_TOKENS = 86_000;

export function openCraftingOverlay(
  res: CraftingResource,
  entityLayer: Container,
): void {
  if (res.isOpen) return;

  res.isOpen = true;
  openCraft();

  const root = new Container();
  root.x = res.campfireWorldPos.x;
  root.y = res.campfireWorldPos.y - TILE * 1.2;
  root.zIndex = ZINDEX_VESSEL;
  res.root = root;

  // Cauldron body
  const cauldron = new Graphics();
  cauldron
    .circle(0, 0, CAULDRON_RADIUS)
    .fill({ color: 0x222222, alpha: 0.92 })
    .circle(0, 0, CAULDRON_RADIUS)
    .stroke({ color: 0x555555, width: 2 });
  root.addChild(cauldron);
  res._cauldron = cauldron;

  // Liquid fill (score-driven color, drawn slightly inside rim)
  const liquid = new Graphics();
  liquid.circle(0, 0, CAULDRON_RADIUS - 4).fill({ color: Colors.ui.muted, alpha: 0.5 });
  root.addChild(liquid);
  res._liquid = liquid;

  // Gauge arc (score fraction, drawn outside cauldron)
  const gaugeArc = new Graphics();
  root.addChild(gaugeArc);
  res._gaugeArc = gaugeArc;

  // Rim glow (lights up near-exact)
  const rimGlow = new Graphics();
  root.addChild(rimGlow);
  res._rimGlow = rimGlow;

  // Token tray container
  const tokenContainer = new Container();
  tokenContainer.zIndex = ZINDEX_TOKENS;
  root.addChild(tokenContainer);
  res._tokenContainer = tokenContainer;

  // Hint text
  const hintStyle = new TextStyle({
    fontFamily: "monospace",
    fontSize: 11,
    fill: Colors.ui.muted,
    stroke: { color: Colors.ui.stroke, width: 3 },
  });
  const hintText = new Text({ text: "", style: hintStyle });
  hintText.anchor.set(0.5, 1);
  hintText.y = -CAULDRON_RADIUS - 8;
  root.addChild(hintText);
  res._hintText = hintText;

  entityLayer.addChild(root);

  playSound("craft");
  _layoutTokenTray(res);
}

export function closeCraftingOverlay(res: CraftingResource, entityLayer: Container): void {
  if (!res.isOpen) return;
  res.isOpen = false;
  closeCraft();

  if (res.root) {
    entityLayer.removeChild(res.root);
    res.root.destroy({ children: true });
    res.root = null;
    res._cauldron = null;
    res._liquid = null;
    res._gaugeArc = null;
    res._rimGlow = null;
    res._tokenContainer = null;
    res._hintText = null;
  }

  res.bubbleTimer = 0;
  res.hintCooldown = 0;
  res.lastScore = -1;
  res.lastFlags = null;

  playSound("player.fellsweep.cancel");
}

// ---------------------------------------------------------------------------
// Token tray layout
// ---------------------------------------------------------------------------

/** Colors keyed by ingredient slot index for quick visual distinction. */
const TOKEN_COLORS = [
  Colors.vfx.campfire,
  Colors.resource.xp,
  0x44ccff,
  0xff88cc,
  0xaaffaa,
  0xffcc44,
] as const;

function _layoutTokenTray(res: CraftingResource): void {
  if (!res._tokenContainer) return;
  res._tokenContainer.removeChildren();

  const slots = gameState.rpg?.inventory?.slots ?? {};
  const itemIds = Object.keys(slots).filter((id) => {
    const slot = slots[id];
    if (!slot) return false;
    if ("qty" in slot) return slot.qty > 0;
    return slot.instances.length > 0;
  });

  const count = itemIds.length;
  if (count === 0) return;

  const radius = CAULDRON_RADIUS + 28;
  const angleStep = count === 1 ? 0 : (Math.PI * 2) / count;
  const startAngle = -Math.PI / 2;

  itemIds.forEach((itemId, i) => {
    const angle = startAngle + i * angleStep;
    const tx = Math.cos(angle) * radius;
    const ty = Math.sin(angle) * radius;

    const color = TOKEN_COLORS[i % TOKEN_COLORS.length];

    const token = new Graphics();
    const trayQty = trayInputs()[itemId] ?? 0;
    const alpha = trayQty > 0 ? 1.0 : 0.5;
    token
      .circle(0, 0, 9)
      .fill({ color, alpha })
      .circle(0, 0, 9)
      .stroke({ color: Colors.ui.stroke, width: 1.5 });
    token.x = tx;
    token.y = ty;
    token.label = itemId;

    res._tokenContainer!.addChild(token);
  });
}

// ---------------------------------------------------------------------------
// Per-frame update
// ---------------------------------------------------------------------------

function _lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bv = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bv;
}

export function updateCraftingOverlaySystem(
  res: CraftingResource,
  vfx: VFXResource,
  entityLayer: Container,
  dt: number,
  reading: ResonanceReading,
  playerPos: { x: number; y: number },
): void {
  if (!res.isOpen || !res.root) return;

  const { score, flags } = reading;

  // --- Liquid color: muted → campfire orange → gold at exact ---
  if (res._liquid) {
    const liquidColor = score < 0.5
      ? _lerpColor(Colors.ui.muted, Colors.vfx.campfire, score * 2)
      : _lerpColor(Colors.vfx.campfire, Colors.resource.gold, (score - 0.5) * 2);
    res._liquid.clear();
    res._liquid
      .circle(0, 0, CAULDRON_RADIUS - 4)
      .fill({ color: liquidColor, alpha: 0.4 + score * 0.45 });
  }

  // --- Gauge arc ---
  if (res._gaugeArc && score > 0) {
    res._gaugeArc.clear();
    const arcEnd = -Math.PI / 2 + Math.PI * 2 * score;
    res._gaugeArc
      .arc(0, 0, GAUGE_RADIUS, -Math.PI / 2, arcEnd)
      .stroke({ color: flags.exact ? Colors.resource.gold : Colors.vfx.campfire, width: 3, alpha: 0.9 });
  } else if (res._gaugeArc) {
    res._gaugeArc.clear();
  }

  // --- Rim glow when near-exact ---
  if (res._rimGlow) {
    res._rimGlow.clear();
    if (score > 0.7) {
      const glowAlpha = (score - 0.7) / 0.3 * 0.6;
      res._rimGlow
        .circle(0, 0, CAULDRON_RADIUS + 4)
        .stroke({ color: Colors.resource.gold, width: 4, alpha: glowAlpha });
    }
  }

  // --- Bubbles (rate driven by score) ---
  const bubbleRate = 0.1 + score * 0.5;
  res.bubbleTimer += dt;
  if (res.bubbleTimer >= 1 / bubbleRate) {
    res.bubbleTimer = 0;
    spawnEnvParticles(vfx, Colors.vfx.campfire, 2, "bubble", { x: res.root.x - TILE / 2, y: res.root.y - TILE / 2 }, entityLayer);
  }

  // --- Directional hint text on flag change ---
  if (res.hintCooldown > 0) res.hintCooldown -= dt;
  const flagsChanged = res.lastFlags === null ||
    res.lastFlags.needsMoreIngredients !== flags.needsMoreIngredients ||
    res.lastFlags.hasForeignElement !== flags.hasForeignElement ||
    res.lastFlags.needMoreQuantity !== flags.needMoreQuantity ||
    res.lastFlags.exact !== flags.exact;

  if (flagsChanged && res.hintCooldown <= 0 && res._hintText) {
    res.hintCooldown = 1.5;
    if (flags.exact) {
      res._hintText.text = "transmute ready";
      res._hintText.style.fill = Colors.resource.gold;
    } else if (flags.hasForeignElement) {
      res._hintText.text = "foreign element";
      res._hintText.style.fill = Colors.ui.warning;
    } else if (flags.needsMoreIngredients) {
      res._hintText.text = "missing ingredients";
      res._hintText.style.fill = Colors.ui.muted;
    } else if (flags.needMoreQuantity) {
      res._hintText.text = "need more quantity";
      res._hintText.style.fill = Colors.vfx.campfire;
    } else {
      res._hintText.text = "";
    }
  }

  res.lastScore = score;
  res.lastFlags = { ...flags };

  // --- Re-layout token tray when tray contents change ---
  _layoutTokenTray(res);

  // --- Counter-scale so overlay stays legible across camera zoom ---
  // The root lives under worldContainer which inherits the zoom scale,
  // so we undo it here. Caller passes worldContainer.scale.x if needed;
  // for now we read it from the parent chain.
  const worldScale = res.root.parent?.scale.x ?? 1;
  if (worldScale !== 0) {
    res.root.scale.set(1 / worldScale);
  }
}

// ---------------------------------------------------------------------------
// Click-on-token detection (call from engine tick with screen-space mouse pos)
// ---------------------------------------------------------------------------

/**
 * Returns the itemId of the token the player clicked on (world-space), or null.
 * Tokens are small circles, so we use simple distance check.
 */
export function pickTokenAtWorldPos(
  res: CraftingResource,
  worldX: number,
  worldY: number,
): string | null {
  if (!res._tokenContainer || !res.root) return null;
  const localX = worldX - res.root.x;
  const localY = worldY - res.root.y;
  const worldScale = res.root.parent?.scale.x ?? 1;
  const sl = worldScale !== 0 ? 1 / worldScale : 1;

  for (const child of res._tokenContainer.children) {
    const tx = child.x * sl;
    const ty = child.y * sl;
    const dist = Math.hypot(localX - tx, localY - ty);
    if (dist < 12 * sl) return child.label ?? null;
  }
  return null;
}

/**
 * Handle a click in the crafting overlay (world-space).
 * Returns true if the click was consumed.
 */
export function handleCraftingClick(
  res: CraftingResource,
  worldX: number,
  worldY: number,
): boolean {
  if (!res.isOpen) return false;

  // Click on cauldron center = tray remove last foreign / remove all (handled via trayRemove)
  // Click on token = add one to tray
  const tokenId = pickTokenAtWorldPos(res, worldX, worldY);
  if (tokenId) {
    const slots = gameState.rpg?.inventory?.slots ?? {};
    const slot = slots[tokenId];
    const owned = slot ? ("qty" in slot ? slot.qty : slot.instances.length) : 0;
    trayAdd(tokenId, owned);
    playSound("craft");
    return true;
  }

  // Click on cauldron body = remove last added item
  if (res.root) {
    const dx = worldX - res.root.x;
    const dy = worldY - res.root.y;
    const worldScale = res.root.parent?.scale.x ?? 1;
    const sl = worldScale !== 0 ? 1 / worldScale : 1;
    if (Math.hypot(dx, dy) < CAULDRON_RADIUS * sl) {
      const tray = trayInputs();
      const ids = Object.keys(tray).filter((id) => tray[id] > 0);
      if (ids.length > 0) {
        trayRemove(ids[ids.length - 1]);
        playSound("player.fellsweep.cancel");
      }
      return true;
    }
  }

  return false;
}
