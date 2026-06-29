import { describe, expect, it } from "vitest";
import { ITEM_DEFINITIONS } from "$lib/domain/items";
import { toolKindOf } from "$lib/domain/gathering/gather-system";
import { GATHERABLE_DEFINITIONS } from "$lib/domain/gathering/gatherables";
import { StatusId } from "$lib/domain/systems/status-types";
import {
  PLAYER_ANIMATION_CLIPS,
  PLAYER_ANIMATION_VARIANTS,
  animationEventsBetween,
  gatherTargetKindForDefinition,
  selectPlayerAnimation,
  type PlayerAnimationContext,
} from "./player-animation";

function movingContext(overrides: Partial<PlayerAnimationContext> = {}): PlayerAnimationContext {
  return {
    action: "moving",
    velocityPxPerSec: 96,
    sprinting: false,
    staminaRatio: 0.85,
    encumbranceRatio: 0.2,
    wetness: "dry",
    statuses: [],
    equippedToolKind: null,
    gatherTargetKind: null,
    combatActive: false,
    guardActive: false,
    ...overrides,
  };
}

describe("player animation definitions", () => {
  it("keeps every variant rule pointed at a declared clip", () => {
    const ids = new Set(PLAYER_ANIMATION_CLIPS.map((clip) => clip.id));
    for (const variant of PLAYER_ANIMATION_VARIANTS) {
      expect(ids.has(variant.clipId), variant.clipId).toBe(true);
    }
  });

  it("keeps frame events in normalized clip time", () => {
    for (const clip of PLAYER_ANIMATION_CLIPS) {
      for (const event of clip.events ?? []) {
        expect(event.atNormalizedTime, `${clip.id}:${event.kind}`).toBeGreaterThanOrEqual(0);
        expect(event.atNormalizedTime, `${clip.id}:${event.kind}`).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("player animation priority conflicts", () => {
  it("lets injury beat wetness and exhaustion during movement", () => {
    const selected = selectPlayerAnimation(movingContext({
      staminaRatio: 0.08,
      wetness: "soaked",
      statuses: [StatusId.Bleeding],
    }));

    expect(selected.clipId).toBe("injured_walk");
    expect(selected.modifiers).toEqual(expect.arrayContaining(["wet", "exhausted"]));
  });

  it("lets gathering beat movement", () => {
    const selected = selectPlayerAnimation(movingContext({
      action: "gathering",
      sprinting: true,
      gatherTargetKind: "tree",
      equippedToolKind: "axe",
    }));

    expect(selected.clipId).toBe("gather_tree_axe");
  });

  it("lets active combat beat gathering", () => {
    const selected = selectPlayerAnimation(movingContext({
      action: "gathering",
      combatActive: true,
      gatherTargetKind: "tree",
      equippedToolKind: "axe",
    }));

    expect(selected.clipId).toBe("combat_active");
  });

  it("keeps wetness as a modifier when encumbrance wins", () => {
    const selected = selectPlayerAnimation(movingContext({
      encumbranceRatio: 0.9,
      wetness: "wet",
    }));

    expect(selected.clipId).toBe("encumbered_walk");
    expect(selected.modifiers).toContain("wet");
  });
});

describe("player animation gather content coverage", () => {
  it("routes real gatherables into stable animation target groups", () => {
    const groups = new Map<string, Set<string>>();
    for (const def of Object.values(GATHERABLE_DEFINITIONS)) {
      const group = gatherTargetKindForDefinition(def);
      if (!group) continue;
      const ids = groups.get(group) ?? new Set<string>();
      ids.add(def.id);
      groups.set(group, ids);
    }

    expect(groups.get("tree")?.size).toBeGreaterThan(0);
    expect(groups.get("ore")?.size).toBeGreaterThan(0);
    expect(groups.get("plant")?.size).toBeGreaterThan(0);
    expect(groups.get("clay")?.has("clay_deposit")).toBe(true);
    expect(groups.get("water")?.has("water_source")).toBe(true);
  });

  it("selects authored gather clips from real tool and target facts", () => {
    expect(toolKindOf("stone_axe")).toBe("axe");
    expect(toolKindOf("stone_pickaxe")).toBe("pickaxe");
    expect(ITEM_DEFINITIONS.stone_axe).toBeDefined();
    expect(ITEM_DEFINITIONS.stone_pickaxe).toBeDefined();

    expect(selectPlayerAnimation(movingContext({
      action: "gathering",
      gatherTargetKind: "tree",
      equippedToolKind: "axe",
    })).clipId).toBe("gather_tree_axe");

    expect(selectPlayerAnimation(movingContext({
      action: "gathering",
      gatherTargetKind: "ore",
      equippedToolKind: "pickaxe",
    })).clipId).toBe("gather_ore_pick");

    expect(selectPlayerAnimation(movingContext({
      action: "gathering",
      gatherTargetKind: "ore",
      equippedToolKind: "axe",
    })).clipId).toBe("gather_ore_bad_tool");
  });
});

describe("animationEventsBetween", () => {
  it("fires crossed non-looping events once in order", () => {
    const events = animationEventsBetween({
      clip: {
        id: "test_clip",
        category: "gathering",
        baseSpeed: 1,
        loop: false,
        priority: 1,
        events: [
          { atNormalizedTime: 0.35, kind: "gather_pull" },
          { atNormalizedTime: 0.6, kind: "tool_impact" },
        ],
      },
      previousNormalizedTime: 0.3,
      currentNormalizedTime: 0.65,
    });

    expect(events.map((event) => event.kind)).toEqual(["gather_pull", "tool_impact"]);
  });

  it("fires looped footstep events across wrap", () => {
    const events = animationEventsBetween({
      clip: {
        id: "walk",
        category: "movement",
        baseSpeed: 1,
        loop: true,
        priority: 1,
        events: [
          { atNormalizedTime: 0.25, kind: "footstep" },
          { atNormalizedTime: 0.75, kind: "footstep" },
        ],
      },
      previousNormalizedTime: 0.7,
      currentNormalizedTime: 1.3,
    });

    expect(events.map((event) => event.kind)).toEqual(["footstep", "footstep"]);
  });

  it("does not spam non-looping impact events after the event was passed", () => {
    const events = animationEventsBetween({
      clip: {
        id: "gather_tree_axe",
        category: "gathering",
        baseSpeed: 1,
        loop: false,
        priority: 1,
        events: [{ atNormalizedTime: 0.45, kind: "tool_impact" }],
      },
      previousNormalizedTime: 0.5,
      currentNormalizedTime: 0.8,
    });

    expect(events).toEqual([]);
  });
});
