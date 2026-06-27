// Subset of asset keys used for sprite lookups — local to domain, NOT importing AshenmoonPropKey
export type SpriteKey = "firepitLit" | "firepitCold" | "ashRing";

// VFX emitter ids — resolved by the VFX registry in core/
export type VfxId =
  | "fire_embers_low"
  | "fire_embers_high"
  | "fire_smoke"
  | "fire_sputter_wet"
  | "ember_puff"
  | "steam_small"
  | "rain_splash"
  | "cook_sizzle"
  | "cook_steam"
  | "dry_dust"
  | "char_smoke"
  | "ash_settle";

// Sound ids — resolved by the audio layer in core/
export type VisualSoundId =
  | "campfire.ignite"
  | "campfire.loop"
  | "campfire.low"
  | "campfire.extinguish"
  | "craft.cook.sizzle";

export interface VisualLightSpec {
  radiusScale: number; // multiplied into the glow sprite scale
  alpha: number; // glow alpha (0..1)
  tint: number; // plain 0xRRGGBB int
  flicker?: { speedHz: number; amplitude: number };
}

export interface VisualStateDefinition {
  id: string;
  baseSprite?: SpriteKey;
  tint?: number; // plain 0xRRGGBB int to tint the sprite
  alpha?: number; // default 1
  scale?: number; // multiplier on natural sprite scale, default 1
  light?: VisualLightSpec | null;
  particles?: readonly VfxId[]; // continuous emitters while in this state
  enterOneShots?: readonly VfxId[]; // fired once on entering this base state
  soundLoops?: readonly VisualSoundId[];
  enterSfx?: readonly VisualSoundId[];
}

export interface ReactiveVisualRule<I> {
  id: string;
  priority: number; // higher = wins for base state selection
  kind: "base" | "overlay";
  when: (input: I) => boolean;
  state: string; // VisualStateDefinition.id to apply
}

export interface VisualDefinition<I> {
  id: string;
  states: Readonly<Record<string, VisualStateDefinition>>;
  rules: readonly ReactiveVisualRule<I>[];
  fallbackState: string;
}

export interface ResolvedVisualState {
  baseState: string;
  baseSprite?: SpriteKey;
  tint?: number;
  alpha: number; // default 1
  scale: number; // default 1
  light: VisualLightSpec | null;
  particles: readonly VfxId[];
  soundLoops: readonly VisualSoundId[];
  enterOneShots: readonly VfxId[];
  enterSfx: readonly VisualSoundId[];
}

export interface CampfireVisualInput {
  isLit: boolean;
  fuelMs: number;
  fuelFrac: number; // fuelRemainingMs / fuelCapacityMs, clamped 0..1
  wetness: number; // max(campfireState.wetness, envSample.wetness)
  raining: boolean;
  ignitionElapsedSec: number; // bridge-tracked, 0 at lit transition
  everBurned: boolean; // bridge-tracked — ash vs cold pit
}

export const CAMPFIRE_VISUAL_DEF: VisualDefinition<CampfireVisualInput> = {
  id: "campfire",
  fallbackState: "unlit_empty",
  states: {
    unlit_empty: {
      id: "unlit_empty",
      baseSprite: "firepitCold",
      scale: 1.0,
      alpha: 1,
      light: null,
    },
    unlit_fueled: {
      id: "unlit_fueled",
      baseSprite: "firepitCold",
      scale: 1.0,
      alpha: 1,
      light: null,
    },
    igniting: {
      id: "igniting",
      baseSprite: "firepitLit",
      scale: 0.7,
      alpha: 1,
      light: {
        radiusScale: 0.5,
        alpha: 0.3,
        tint: 0xffa060,
        flicker: { speedHz: 3, amplitude: 0.04 },
      },
      soundLoops: ["campfire.low"] as const,
      enterSfx: ["campfire.ignite"] as const,
      enterOneShots: ["ember_puff"] as const,
    },
    burning_low: {
      id: "burning_low",
      baseSprite: "firepitLit",
      scale: 0.78,
      alpha: 1,
      light: {
        radiusScale: 0.7,
        alpha: 0.4,
        tint: 0xff8840,
        flicker: { speedHz: 2, amplitude: 0.04 },
      },
      particles: ["fire_embers_low"] as const,
      soundLoops: ["campfire.low"] as const,
    },
    burning_med: {
      id: "burning_med",
      baseSprite: "firepitLit",
      scale: 0.9,
      alpha: 1,
      light: {
        radiusScale: 0.85,
        alpha: 0.45,
        tint: 0xff9030,
        flicker: { speedHz: 2.5, amplitude: 0.04 },
      },
      particles: ["fire_embers_low", "fire_smoke"] as const,
      soundLoops: ["campfire.loop"] as const,
    },
    burning_high: {
      id: "burning_high",
      baseSprite: "firepitLit",
      scale: 1.0,
      alpha: 1,
      light: {
        radiusScale: 1.0,
        alpha: 0.5,
        tint: 0xffaa20,
        flicker: { speedHz: 3, amplitude: 0.05 },
      },
      particles: ["fire_embers_high", "fire_smoke"] as const,
      soundLoops: ["campfire.loop"] as const,
    },
    wet_sputtering: {
      id: "wet_sputtering",
      baseSprite: "firepitLit",
      scale: 0.85,
      alpha: 1,
      light: {
        radiusScale: 0.55,
        alpha: 0.25,
        tint: 0xff6030,
        flicker: { speedHz: 4, amplitude: 0.08 },
      },
      particles: ["fire_smoke", "fire_sputter_wet", "steam_small"] as const,
      soundLoops: ["campfire.low"] as const,
    },
    extinguished_wet: {
      id: "extinguished_wet",
      baseSprite: "firepitCold",
      scale: 1.0,
      tint: 0x7799bb,
      alpha: 1,
      light: null,
      particles: ["steam_small"] as const,
      enterSfx: ["campfire.extinguish"] as const,
    },
    ash_pile: {
      id: "ash_pile",
      baseSprite: "ashRing",
      scale: 1.0,
      alpha: 1,
      light: null,
      enterOneShots: ["ash_settle"] as const,
    },
    // overlays — do NOT set baseSprite, scale, or alpha
    low_fuel: {
      id: "low_fuel",
      tint: 0xcc8830,
    },
    wet_sheen: {
      id: "wet_sheen",
      tint: 0x8899bb,
      particles: ["rain_splash"] as const,
    },
  },
  rules: [
    // base rules — priority descending
    {
      id: "extinguished_wet",
      priority: 90,
      kind: "base",
      when: (input) => !input.isLit && input.wetness >= 0.95,
      state: "extinguished_wet",
    },
    {
      id: "ash_pile",
      priority: 80,
      kind: "base",
      when: (input) => !input.isLit && input.fuelMs <= 0 && input.everBurned,
      state: "ash_pile",
    },
    {
      id: "unlit_fueled",
      priority: 70,
      kind: "base",
      when: (input) => !input.isLit && input.fuelMs > 0,
      state: "unlit_fueled",
    },
    {
      id: "igniting",
      priority: 60,
      kind: "base",
      when: (input) => input.isLit && input.ignitionElapsedSec < 0.8,
      state: "igniting",
    },
    {
      id: "wet_sputtering",
      priority: 55,
      kind: "base",
      when: (input) => input.isLit && input.wetness > 0.45,
      state: "wet_sputtering",
    },
    {
      id: "burning_high",
      priority: 40,
      kind: "base",
      when: (input) => input.isLit && input.fuelFrac >= 0.6 && input.wetness < 0.2,
      state: "burning_high",
    },
    {
      id: "burning_med",
      priority: 30,
      kind: "base",
      when: (input) => input.isLit && input.fuelFrac >= 0.18,
      state: "burning_med",
    },
    {
      id: "burning_low",
      priority: 20,
      kind: "base",
      when: (input) => input.isLit,
      state: "burning_low",
    },
    {
      id: "unlit_empty",
      priority: 10,
      kind: "base",
      when: () => true,
      state: "unlit_empty",
    },
    // overlay rules
    {
      id: "low_fuel",
      priority: 50,
      kind: "overlay",
      when: (input) => input.isLit && input.fuelMs < 12_000,
      state: "low_fuel",
    },
    {
      id: "wet_sheen",
      priority: 60,
      kind: "overlay",
      when: (input) => input.wetness > 0.4 && input.isLit,
      state: "wet_sheen",
    },
  ],
};
