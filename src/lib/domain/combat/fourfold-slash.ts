export interface Vec2 {
  x: number;
  y: number;
}

export type FourfoldDirection = "top" | "right" | "bottom" | "left";

export type FourfoldSlashType =
  | "wheel_slash"
  | "falling_wheel"
  | "rising_wheel"
  | "crosswind_cut"
  | "starburst_cross"
  | "vortex_slice";

export interface FourfoldSlashConfig {
  comboTotalWindowMs: number;
  comboMaxGapMs: number;
  comboCooldownMs: number;
  damageMultipliers: Record<FourfoldSlashType, number>;
  knockbackMultipliers: Record<FourfoldSlashType, number>;
  staminaCosts: Record<FourfoldSlashType, number>;
}

export interface FourfoldSlashState {
  inputs: FourfoldDirection[];
  inputTimestampsMs: number[];
  cooldownUntilMs: number;
}

export interface FourfoldSlashResult {
  status: "started" | "progressed" | "completed" | "failed_repeated" | "cooldown";
  direction?: FourfoldDirection;
  entered?: FourfoldDirection[];
  finisherType?: FourfoldSlashType;
  sequence?: FourfoldDirection[];
  reason?: string;
}

export const DEFAULT_FOURFOLD_SLASH_CONFIG: FourfoldSlashConfig = {
  comboTotalWindowMs: 1500,
  comboMaxGapMs: 600,
  comboCooldownMs: 1500,
  damageMultipliers: {
    wheel_slash: 2.2,
    falling_wheel: 2.8,
    rising_wheel: 2.5,
    crosswind_cut: 2.4,
    starburst_cross: 2.6,
    vortex_slice: 3.0,
  },
  knockbackMultipliers: {
    wheel_slash: 1.5,
    falling_wheel: 2.2,
    rising_wheel: 2.0,
    crosswind_cut: 1.2,
    starburst_cross: 1.8,
    vortex_slice: 2.4,
  },
  staminaCosts: {
    wheel_slash: 16,
    falling_wheel: 20,
    rising_wheel: 18,
    crosswind_cut: 15,
    starburst_cross: 17,
    vortex_slice: 22,
  },
};

export function createDefaultFourfoldSlashConfig(): FourfoldSlashConfig {
  return {
    ...DEFAULT_FOURFOLD_SLASH_CONFIG,
    damageMultipliers: { ...DEFAULT_FOURFOLD_SLASH_CONFIG.damageMultipliers },
    knockbackMultipliers: { ...DEFAULT_FOURFOLD_SLASH_CONFIG.knockbackMultipliers },
    staminaCosts: { ...DEFAULT_FOURFOLD_SLASH_CONFIG.staminaCosts },
  };
}

export function createInitialFourfoldSlashState(): FourfoldSlashState {
  return {
    inputs: [],
    inputTimestampsMs: [],
    cooldownUntilMs: 0,
  };
}

export function clearFourfoldSlashState(state: FourfoldSlashState): void {
  state.inputs = [];
  state.inputTimestampsMs = [];
}

export function detectClickDirection(playerPosition: Vec2, clickWorldPosition: Vec2): FourfoldDirection {
  const dx = clickWorldPosition.x - playerPosition.x;
  const dy = clickWorldPosition.y - playerPosition.y;

  if (Math.abs(dy) > Math.abs(dx)) {
    return dy < 0 ? "top" : "bottom";
  } else {
    return dx < 0 ? "left" : "right";
  }
}

export function isCircular(seq: FourfoldDirection[]): boolean {
  if (seq.length !== 4) return false;

  const cw: FourfoldDirection[] = ["top", "right", "bottom", "left"];
  const ccw: FourfoldDirection[] = ["top", "left", "bottom", "right"];

  for (let i = 0; i < 4; i++) {
    let matchesCw = true;
    let matchesCcw = true;
    for (let j = 0; j < 4; j++) {
      if (seq[j] !== cw[(i + j) % 4]) matchesCw = false;
      if (seq[j] !== ccw[(i + j) % 4]) matchesCcw = false;
    }
    if (matchesCw || matchesCcw) return true;
  }
  return false;
}

export function classifyFourfoldSlash(seq: FourfoldDirection[]): FourfoldSlashType {
  if (isCircular(seq)) {
    return "wheel_slash";
  }
  if (seq[0] === "top" && seq[3] === "bottom") {
    return "falling_wheel";
  }
  if (seq[0] === "bottom" && seq[3] === "top") {
    return "rising_wheel";
  }

  // Zig-zag/vortex patterns: L-T-B-R, L-B-T-R, R-T-B-L, R-B-T-L
  const isZigZag =
    (seq[0] === "left" && seq[3] === "right" && ((seq[1] === "top" && seq[2] === "bottom") || (seq[1] === "bottom" && seq[2] === "top"))) ||
    (seq[0] === "right" && seq[3] === "left" && ((seq[1] === "top" && seq[2] === "bottom") || (seq[1] === "bottom" && seq[2] === "top")));

  if (isZigZag) {
    return "vortex_slice";
  }

  // Consecutive opposite pairs (T-B-L-R, L-R-T-B, etc.)
  return "starburst_cross";
}

export function pushFourfoldSlashInput(
  state: FourfoldSlashState,
  config: FourfoldSlashConfig,
  direction: FourfoldDirection,
  nowMs: number
): FourfoldSlashResult {
  if (nowMs < state.cooldownUntilMs) {
    return { status: "cooldown" };
  }

  // Check total timeout since first input
  if (state.inputs.length > 0) {
    const firstTime = state.inputTimestampsMs[0]!;
    if (nowMs - firstTime > config.comboTotalWindowMs) {
      state.inputs = [direction];
      state.inputTimestampsMs = [nowMs];
      return { status: "started", direction, entered: [...state.inputs] };
    }

    // Check gap timeout
    const lastTime = state.inputTimestampsMs[state.inputTimestampsMs.length - 1]!;
    if (nowMs - lastTime > config.comboMaxGapMs) {
      state.inputs = [direction];
      state.inputTimestampsMs = [nowMs];
      return { status: "started", direction, entered: [...state.inputs] };
    }
  }

  // Check duplicate
  if (state.inputs.includes(direction)) {
    clearFourfoldSlashState(state);
    return { status: "failed_repeated", reason: "duplicate_direction" };
  }

  // Push new valid input
  state.inputs.push(direction);
  state.inputTimestampsMs.push(nowMs);

  if (state.inputs.length === 1) {
    return { status: "started", direction, entered: [...state.inputs] };
  }

  if (state.inputs.length === 4) {
    const sequence = [...state.inputs];
    const finisherType = classifyFourfoldSlash(sequence);
    clearFourfoldSlashState(state);
    state.cooldownUntilMs = nowMs + config.comboCooldownMs;
    return { status: "completed", finisherType, sequence };
  }

  return { status: "progressed", direction, entered: [...state.inputs] };
}
