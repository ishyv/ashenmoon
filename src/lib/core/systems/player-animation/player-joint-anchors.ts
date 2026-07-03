// player-joint-anchors.ts

export interface JointAnchors {
  readonly head: { x: number; y: number };
  readonly handRight: { x: number; y: number };
  readonly handLeft: { x: number; y: number };
}

// Base anchor positions from the player-idle.svg geometry (hands: 39, 121; head: 80, 48)
export const DEFAULT_PLAYER_JOINT_ANCHOR: JointAnchors = {
  head: { x: 80, y: 48 },
  handRight: { x: 121, y: 126 },
  handLeft: { x: 39, y: 126 },
};

/**
 * Procedurally resolves joint anchors based on the active animation clip, normalized time, 
 * active state modifiers, and sprinting flag. This makes attachment positions smooth and 
 * independent of frame-swapping asset files.
 */
export function getPlayerJointAnchors(
  clipId: string | undefined,
  normalizedTime = 0,
  modifiers: readonly string[] = [],
  sprinting = false,
): JointAnchors {
  // Start with default anchors
  let headX = DEFAULT_PLAYER_JOINT_ANCHOR.head.x;
  let headY = DEFAULT_PLAYER_JOINT_ANCHOR.head.y;
  let handRightX = DEFAULT_PLAYER_JOINT_ANCHOR.handRight.x;
  let handRightY = DEFAULT_PLAYER_JOINT_ANCHOR.handRight.y;
  let handLeftX = DEFAULT_PLAYER_JOINT_ANCHOR.handLeft.x;
  let handLeftY = DEFAULT_PLAYER_JOINT_ANCHOR.handLeft.y;

  if (!clipId) {
    return DEFAULT_PLAYER_JOINT_ANCHOR;
  }

  const isInjured = modifiers.includes("injured");
  const isEncumbered = modifiers.includes("encumbered");
  const isExhausted = modifiers.includes("exhausted");

  // Movement frequency modifier based on injuries or encumbrance
  const gaitDrag = isInjured ? 0.58 : isEncumbered ? 0.72 : isExhausted ? 0.82 : 1;

  if (clipId === "run" || clipId === "strained_run" || clipId === "encumbered_run") {
    // Running gait: high-amplitude, high-frequency arm swing
    const timeScale = 16 * gaitDrag;
    const phase = normalizedTime * timeScale;
    
    const armSwingX = Math.sin(phase) * 15;
    const armSwingY = Math.cos(phase) * 5 - 6;

    handLeftX += armSwingX;
    handLeftY += armSwingY;
    handRightX -= armSwingX;
    handRightY += armSwingY;

    // Small head bob
    headY += Math.abs(Math.sin(phase)) * 2;
  } else if (
    clipId === "walk" ||
    clipId === "exhausted_walk" ||
    clipId === "injured_walk" ||
    clipId === "encumbered_walk" ||
    clipId === "wet_walk"
  ) {
    // Walking gait: moderate speed and sway
    const timeScale = 10 * gaitDrag;
    const phase = normalizedTime * timeScale;

    let leftSwing = Math.sin(phase) * 9;
    let rightSwing = -Math.sin(phase) * 9;

    if (isInjured) {
      // Limping: asymmetrical, staggered gait
      leftSwing *= 0.4;
      rightSwing = Math.sin(phase) * 12;
      headX += Math.sin(phase) * 2.5;
    }

    handLeftX += leftSwing;
    handLeftY += Math.cos(phase) * 3 - 2;
    
    handRightX += rightSwing;
    handRightY -= Math.cos(phase) * 3 + 2;

    headY += Math.abs(Math.sin(phase)) * 1;
  } else if (clipId === "combat_attack_unarmed") {
    const t = normalizedTime;
    const jab = Math.sin(Math.min(1, t / 0.72) * Math.PI);
    handRightX += jab * 24;
    handRightY -= jab * 4;
    handLeftX += jab * 9;
    handLeftY += jab * 2;
    headX += jab * 2;
  } else if (clipId === "combat_attack_knife") {
    const t = normalizedTime;
    if (t < 0.32) {
      const windup = t / 0.32;
      handRightX -= windup * 18;
      handRightY += windup * 5;
      handLeftX += windup * 5;
    } else {
      const strike = Math.sin(((Math.min(t, 0.82) - 0.32) / 0.5) * Math.PI);
      handRightX += strike * 26;
      handRightY -= strike * 10;
      handLeftX -= strike * 4;
      headX += strike * 2;
    }
  } else if (clipId === "combat_attack_axe" || clipId === "combat_attack_axe_heavy") {
    const t = normalizedTime;
    const heavy = clipId === "combat_attack_axe_heavy" ? 1.22 : 1;
    if (t < 0.45) {
      const raise = t / 0.45;
      handRightX -= raise * 10 * heavy;
      handRightY -= raise * 48 * heavy;
      handLeftX += raise * 12;
      handLeftY -= raise * 34 * heavy;
      headY += raise * 2;
    } else {
      const chop = Math.sin(((Math.min(t, 0.82) - 0.45) / 0.37) * Math.PI);
      handRightX += chop * 14;
      handRightY += chop * 54 * heavy;
      handLeftX += chop * 8;
      handLeftY += chop * 42 * heavy;
      headY += chop * 3;
    }
  } else if (clipId === "combat_attack_spear") {
    // Spear thrust: Pull back (windup, t < 0.35) -> thrust forward (strike, 0.35..0.7) -> return (0.7..1)
    const t = normalizedTime;
    if (t < 0.35) {
      const windup = t / 0.35;
      handRightX -= windup * 20;
      handRightY += windup * 4;
      handLeftX += 6;
    } else if (t < 0.70) {
      const strike = (t - 0.35) / 0.35;
      const thrust = Math.sin(strike * Math.PI);
      handRightX += thrust * 30;
      handRightY -= thrust * 5;
      handLeftX -= thrust * 6;
    } else {
      const recover = (t - 0.70) / 0.30;
      const rem = 1.0 - recover;
      handRightX += rem * 10;
    }
  } else if (clipId.startsWith("combat_guard_")) {
    // Aggressive low stance: hands prepared, slight breathing sway
    const phase = normalizedTime * 2.2;
    headY += Math.sin(phase) * 0.7;

    if (clipId === "combat_guard_spear") {
      handLeftX += 8 + Math.sin(phase) * 0.5;
      handLeftY -= 6;
      handRightX -= 8;
      handRightY += 5 + Math.sin(phase) * 0.5;
    } else if (clipId === "combat_guard_axe") {
      handLeftX += 10;
      handLeftY -= 16 + Math.sin(phase) * 0.5;
      handRightX -= 8;
      handRightY -= 12 + Math.sin(phase) * 0.5;
      headY += 1;
    } else if (clipId === "combat_guard_knife") {
      handLeftX += 7;
      handLeftY -= 3;
      handRightX -= 4;
      handRightY += 2 + Math.sin(phase) * 0.5;
      headX += Math.sin(phase) * 0.8;
    } else {
      handLeftX += 6;
      handLeftY -= 2;
      handRightX += 4;
      handRightY -= 2;
    }
  } else if (clipId.startsWith("gather_")) {
    // Gathering strike: lift tool (t < 0.40) -> strike down (0.40..0.60) -> recovery (0.60..1)
    const t = normalizedTime;
    let raise = 0;
    let strike = 0;

    if (t < 0.40) {
      raise = t / 0.40;
    } else if (t < 0.60) {
      raise = 1;
      strike = (t - 0.40) / 0.20;
    } else {
      const rec = (t - 0.60) / 0.40;
      raise = 1.0 - rec;
      strike = 1.0 - rec;
    }

    // Both hands rise and fall together to drive the gathering tool
    const rOffset = -raise * 15 + strike * 28;
    const rOffsetY = -raise * 32 + strike * 44;
    const lOffset = -raise * 8 + strike * 22;
    const lOffsetY = -raise * 20 + strike * 32;

    handRightX += rOffset;
    handRightY += rOffsetY;
    handLeftX += lOffset;
    handLeftY += lOffsetY;
  } else {
    // Idle breathing bobbing
    const phase = normalizedTime * 2.2;
    headY += Math.sin(phase) * 0.55;
    handRightY += Math.sin(phase) * 0.35;
    handLeftY += Math.sin(phase) * 0.35;
  }

  return {
    head: { x: headX, y: headY },
    handRight: { x: handRightX, y: handRightY },
    handLeft: { x: handLeftX, y: handLeftY },
  };
}
