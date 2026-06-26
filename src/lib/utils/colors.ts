/**
 * Central color palette for the canvas game layer.
 *
 * WHY: Pixi draws with numeric hex (0xRRGGBB), so the HyvUI CSS token system
 * doesn't reach the canvas — these constants are the canvas equivalent of design
 * tokens. Every raw 0x… literal that was scattered through the game systems
 * lives here instead, grouped by the concern it serves. Svelte HUD components
 * keep using CSS tokens; this file is only for what Pixi renders.
 *
 * Values are `as const` so each reads back as its own literal type.
 */
export const Colors = {
  /** generic feedback + text scaffolding. */
  ui: {
    success: 0x55ff55,
    warning: 0xffaa55,
    error: 0xff5555,
    info: 0xffe0a0,
    muted: 0xaaaaaa,
    white: 0xffffff,
    stroke: 0x000000,
  },
  /** gather yields + reward text. */
  resource: {
    wood: 0xd4ffc8,
    ore: 0xffe0a0,
    xp: 0xffd86b,
    gold: 0xffdc78,
    superText: 0xffc84a,
  },
  combat: {
    playerHit: 0xff4444,
    enemyHit: 0xffffff,
    playerDmgNum: 0xff6666,
    enemyDmgNum: 0xffe066,
    slashArc: 0xfff1c0,
    kiteArc: 0x33e0a6,
    fellSweepArc: 0xff8833,
    drivingThrust: 0xd9f99d,
    drivingThrustPreview: 0xbef264,
    crosscutWeak: 0xffd166,
    crosscutGood: 0xf5f3ff,
    crosscutExcellent: 0xff4d6d,
    crosscutBleed: 0xb91c1c,
    windupTint: 0xff6a6a,
    invulnTint: 0xffcccc,
    playerDeath: 0xff5555,
    enemyDeath: 0xc0392b,
    xpReward: 0xff8855,
  },
  evade: {
    flash: 0x55aaff,
    dashText: 0xffe0a0,
    dashParticle: 0xcccccc,
  },
  vfx: {
    highlight: 0xffe9a8,
    selectionRing: 0xffe9a8,
    gatherRing: 0xffe066,
    chargeRing: 0xff6600,
    focusedGather: 0xffa500,
    campfire: 0xff6600,
    campfireMsg: 0xffe066,
    footstep: 0xb09870,
    smoke: 0xcccccc,
    hitFlash: 0xffffff,
  },
  particle: {
    woodDebris: 0x9c704c,
    oreDebris: 0xffa500,
    treeBurst: 0x6aaa44,
    oreBurst: 0xb8b8c8,
    treeRing: 0x88cc44,
    oreRing: 0xccccdd,
  },
  building: {
    validPlace: 0x88ff88,
    invalidPlace: 0xff8888,
    success: 0x4ade80,
    particle: 0xcccccc,
  },
  world: {
    dirt: 0x5a4232,
    camp: 0x8b7355,
    campDryGrass: 0x8f805f,
    campAsh: 0x5f5546,
    campPath: 0x6f5d45,
  },
  /** skill level-up announcement text, per skill family. */
  skillLevel: {
    gather: 0x55ff55,
    focusedGather: 0xffaa00,
    evade: 0x55aaff,
    combat: 0xff8855,
    fellSweep: 0xff6622,
  },
  fourfold: {
    wheelSlash: 0xffd700,      // Gold
    fallingWheel: 0xff3333,    // Crimson Fire
    risingWheel: 0x1de9b6,     // Jade Green
    starburstCross: 0x9d4edd,  // Electric Violet
    vortexSlice: 0xff8f00,     // Amber Orange
    crosswindCut: 0xc7a75c,    // Muted Sand
  },
} as const;
