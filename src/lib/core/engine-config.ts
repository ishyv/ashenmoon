/**
 * Global engine performance and gameplay constants.
 */
export const ENGINE_CONFIG = {
  // --- Rendering & Camera ---
  ZOOM: {
    INITIAL: 1.0,
    MIN: 0.5,
    MAX: 3.0,
    INCREMENT: 0.1,
    SMOOTHING: 0.12,
  },
  LAYERS: {
    COLLISION_OVERLAY_Z: 120_000,
  },
  
  // --- Animation & Feedback ---
  PLAYER_BASE_SCALE: (64 * 1.1) / 192, // legacy callers; prefer ACTOR_VISUALS for Ashenmoon standees
  ACTOR_VISUALS: {
    PLAYER_HEIGHT_TILES: 1.3,
    HUMANOID_HEIGHT_TILES: 1.38,
    HUMANOID_SHADOW_SCALE: 0.48,
    PLAYER_RUN_BOB_PX: 3,
    PLAYER_ATTACK_LEAN_RAD: 0.16,
  },
  NOTIFY_DURATION_MS: 2500,
  
  // --- Environment & Weather ---
  RAIN: {
    INITIAL_COOLDOWN_SEC: 180,
    NEXT_COOLDOWN_SEC: 420,
    FEEDBACK_INTERVAL_SEC: 0.45,
    PARTICLE_COLOR: 0x7aa7c7,
    WORLD_TINT: 0xb0c4d8,
  },
  
  // --- World Events ---
  FOREST_EVENT: {
    MIN_INTERVAL_SEC: 45,
    RANDOM_EXTRA_SEC: 45,
    ANIMAL_ZONE_RADIUS_TILES: 14,
  },
  
  // --- Survival & Movement ---
  SURVIVAL: {
    STATION_INTERACT_MAX_DISTANCE_TILES: 4.5,
    ENV_TICK_INTERVAL_MS: 5000,
    SHELTER_RADIUS_TILES: 2.5,
    SHELTER_COLD_MULT: 0.55,
  },
  
  // --- VFX & Ambience ---
  CAMPFIRE_GLOW: {
    BASE_RADIUS_PX: 384,
    FLICKER_SPEED: 0.007,
    FLICKER_INTENSITY: 0.04,
    SCALE_MULT: 1.8,
  },
  CAMPFIRE_VISUALS: {
    Z_OFFSET_TILES: 0.82,
    LOG_ROTATION: 0.3,
    LOG_SCALE: 0.6,
    FIRE_ANIM_SPEED: 0.15,
    FIRE_SCALE: 0.8,
  },
  NPC_VISUALS: {
    ANIM_SPEED: 0.12,
    SCALE: 1.1,
  },
  CLOUDS: {
    COUNT: 12,
    MIN_VX: 8,
    RANDOM_VX: 14,
  },
  
  // --- Interaction ---
  CLICK_MAX_HOLD_MS: 300,
} as const;
