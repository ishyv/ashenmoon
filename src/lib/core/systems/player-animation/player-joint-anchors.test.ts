// player-joint-anchors.test.ts
import { describe, expect, it } from "vitest";
import {
  getPlayerJointAnchors,
  DEFAULT_PLAYER_JOINT_ANCHOR,
} from "./player-joint-anchors";

describe("Player Joint Anchors (Procedural)", () => {
  it("returns default anchors when clipId is undefined", () => {
    const anchors = getPlayerJointAnchors(undefined);
    expect(anchors).toBe(DEFAULT_PLAYER_JOINT_ANCHOR);
  });

  it("applies a breathing phase cycle for idle anchors over time", () => {
    const anchorsT0 = getPlayerJointAnchors("idle", 0);
    const anchorsT1 = getPlayerJointAnchors("idle", 0.5);
    
    // Head should bob up/down procedurally
    expect(anchorsT0.head.x).toBe(DEFAULT_PLAYER_JOINT_ANCHOR.head.x);
    expect(anchorsT0.head.y).not.toBe(anchorsT1.head.y);
    expect(anchorsT0.handRight.y).not.toBe(anchorsT1.handRight.y);
  });

  it("oscillates hands in opposite directions when walking", () => {
    const anchors = getPlayerJointAnchors("walk", 0.1);
    
    // Left and right arm swings should be in opposite phases
    const leftOffset = anchors.handLeft.x - DEFAULT_PLAYER_JOINT_ANCHOR.handLeft.x;
    const rightOffset = anchors.handRight.x - DEFAULT_PLAYER_JOINT_ANCHOR.handRight.x;
    
    // One goes left, other goes right
    expect(Math.sign(leftOffset)).not.toBe(Math.sign(rightOffset));
    expect(Math.abs(leftOffset)).toBeCloseTo(Math.abs(rightOffset), 1);
  });

  it("simulates a spear thrust windup and lunge correctly", () => {
    const anchorsWindup = getPlayerJointAnchors("combat_attack_spear", 0.2); // t < 0.35 is windup
    const anchorsLunge = getPlayerJointAnchors("combat_attack_spear", 0.5);   // 0.35..0.70 is strike

    // Windup pulls weapon hand back
    expect(anchorsWindup.handRight.x).toBeLessThan(DEFAULT_PLAYER_JOINT_ANCHOR.handRight.x);
    
    // Lunge thrusts weapon hand forward
    expect(anchorsLunge.handRight.x).toBeGreaterThan(DEFAULT_PLAYER_JOINT_ANCHOR.handRight.x);
  });

  it("gives knife attacks a fast cross-body hand motion", () => {
    const windup = getPlayerJointAnchors("combat_attack_knife", 0.15);
    const strike = getPlayerJointAnchors("combat_attack_knife", 0.5);

    expect(windup.handRight.x).toBeLessThan(DEFAULT_PLAYER_JOINT_ANCHOR.handRight.x);
    expect(strike.handRight.x).toBeGreaterThan(DEFAULT_PLAYER_JOINT_ANCHOR.handRight.x);
    expect(strike.handRight.y).toBeLessThan(DEFAULT_PLAYER_JOINT_ANCHOR.handRight.y);
  });

  it("gives axe attacks a committed overhead chop motion", () => {
    const raised = getPlayerJointAnchors("combat_attack_axe", 0.25);
    const impact = getPlayerJointAnchors("combat_attack_axe", 0.58);

    expect(raised.handRight.y).toBeLessThan(DEFAULT_PLAYER_JOINT_ANCHOR.handRight.y);
    expect(raised.handLeft.y).toBeLessThan(DEFAULT_PLAYER_JOINT_ANCHOR.handLeft.y);
    expect(impact.handRight.y).toBeGreaterThan(DEFAULT_PLAYER_JOINT_ANCHOR.handRight.y);
  });

  it("gives unarmed attacks a desperate forward jab", () => {
    const jab = getPlayerJointAnchors("combat_attack_unarmed", 0.5);

    expect(jab.handRight.x).toBeGreaterThan(DEFAULT_PLAYER_JOINT_ANCHOR.handRight.x);
    expect(jab.handLeft.x).toBeGreaterThan(DEFAULT_PLAYER_JOINT_ANCHOR.handLeft.x);
  });

  it("handles injury status modifiers by limping/slowing the gait", () => {
    const normalWalk = getPlayerJointAnchors("walk", 0.1, []);
    const injuredWalk = getPlayerJointAnchors("walk", 0.1, ["injured"]);

    // The hand offsets should differ because of the limping multiplier
    const normalOffset = normalWalk.handLeft.x - DEFAULT_PLAYER_JOINT_ANCHOR.handLeft.x;
    const injuredOffset = injuredWalk.handLeft.x - DEFAULT_PLAYER_JOINT_ANCHOR.handLeft.x;
    
    expect(Math.abs(injuredOffset)).toBeLessThan(Math.abs(normalOffset));
  });
});
