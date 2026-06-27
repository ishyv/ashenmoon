import type { Container } from "pixi.js";
import type { VfxId } from "../../domain/visual/visual-definitions.js";
import type { VFXResource } from "./vfx.js";
import { spawnEnvParticles } from "./vfx.js";

export interface VfxDefinition {
  id: VfxId;
  shape: "smoke" | "bubble" | "sizzle";
  color: number;        // 0xRRGGBB plain int
  count: number;        // particles per emission
  intervalSec: number;  // continuous cadence; 0 = one-shot only
  anchor: "flame" | "base" | "ground"; // y-offset from entity center (for positioning)
}

export const VFX_DEFINITIONS: Record<VfxId, VfxDefinition> = {
  fire_embers_high: { id: "fire_embers_high", shape: "sizzle", color: 0xffaa44, count: 4, intervalSec: 0.10, anchor: "flame" },
  fire_embers_low:  { id: "fire_embers_low",  shape: "sizzle", color: 0xff8833, count: 2, intervalSec: 0.18, anchor: "flame" },
  fire_smoke:       { id: "fire_smoke",        shape: "smoke",  color: 0x777766, count: 2, intervalSec: 0.30, anchor: "flame" },
  fire_sputter_wet: { id: "fire_sputter_wet",  shape: "sizzle", color: 0xcc6622, count: 3, intervalSec: 0.14, anchor: "flame" },
  ember_puff:       { id: "ember_puff",        shape: "sizzle", color: 0xffcc66, count: 8, intervalSec: 0,    anchor: "flame" },
  steam_small:      { id: "steam_small",       shape: "smoke",  color: 0xddeeff, count: 3, intervalSec: 0.25, anchor: "base"  },
  rain_splash:      { id: "rain_splash",       shape: "bubble", color: 0x99bbdd, count: 2, intervalSec: 0.22, anchor: "ground"},
  cook_sizzle:      { id: "cook_sizzle",       shape: "sizzle", color: 0xffddaa, count: 2, intervalSec: 0.20, anchor: "base"  },
  cook_steam:       { id: "cook_steam",        shape: "smoke",  color: 0xeeeeee, count: 2, intervalSec: 0.35, anchor: "base"  },
  dry_dust:         { id: "dry_dust",          shape: "smoke",  color: 0xccbb99, count: 1, intervalSec: 0.50, anchor: "base"  },
  char_smoke:       { id: "char_smoke",        shape: "smoke",  color: 0x444444, count: 2, intervalSec: 0.30, anchor: "base"  },
  ash_settle:       { id: "ash_settle",        shape: "smoke",  color: 0x888888, count: 5, intervalSec: 0,    anchor: "base"  },
};

// TILE is 64 in this project (src/lib/core/systems/map/map.ts)
const TILE = 64;

// Anchor y-offsets from entity center
const ANCHOR_OFFSETS: Record<VfxDefinition["anchor"], number> = {
  flame:  -TILE * 0.6,   // above center, near flame tip
  base:    TILE * 0.1,   // just below center, at base of object
  ground:  TILE * 0.3,   // near ground level
};

export function spawnVfxById(
  vfx: VFXResource,
  layer: Container,
  id: VfxId,
  pos: { x: number; y: number },
): void {
  const def = VFX_DEFINITIONS[id];
  if (!def) return;
  const offset = ANCHOR_OFFSETS[def.anchor];
  spawnEnvParticles(vfx, def.color, def.count, def.shape, { x: pos.x, y: pos.y + offset }, layer);
}
