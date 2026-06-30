// player-joint-anchors.test.ts
import { describe, expect, it } from "vitest";
import {
  getPlayerJointAnchors,
  DEFAULT_PLAYER_JOINT_ANCHOR,
  PLAYER_JOINT_ANCHORS,
} from "./player-joint-anchors";

describe("Player Joint Anchors", () => {
  it("returns default anchors when filename is undefined", () => {
    const anchors = getPlayerJointAnchors(undefined);
    expect(anchors).toBe(DEFAULT_PLAYER_JOINT_ANCHOR);
  });

  it("returns default anchors when filename is unknown", () => {
    const anchors = getPlayerJointAnchors("assets/actors/player/unknown-frame.svg");
    expect(anchors).toBe(DEFAULT_PLAYER_JOINT_ANCHOR);
  });

  it("resolves exact anchors for known filenames", () => {
    const idleAnchors = getPlayerJointAnchors("assets/actors/player/player-idle.svg");
    expect(idleAnchors).toEqual(PLAYER_JOINT_ANCHORS["player-idle.svg"]);

    const walk1Anchors = getPlayerJointAnchors("assets/actors/player/player-walk-1.svg");
    expect(walk1Anchors).toEqual(PLAYER_JOINT_ANCHORS["player-walk-1.svg"]);
  });

  it("extracts the basename correctly from complex paths", () => {
    const anchors = getPlayerJointAnchors("/absolute/path/to/static/assets/ashenmoon/actors/player/player-idle.svg");
    expect(anchors).toEqual(PLAYER_JOINT_ANCHORS["player-idle.svg"]);
  });
});
