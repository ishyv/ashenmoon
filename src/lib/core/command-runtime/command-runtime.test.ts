import { describe, expect, it } from "vitest";
import { executeGameCommand, type CommandContext } from "./command-runtime";
import { StatusId } from "$lib/domain/systems/status-types";

function fakeContext(): CommandContext {
  return {
    source: "test",
    position: () => ({ gx: 4, gy: 7 }),
    teleport: (gx, gy) => `teleported to ${gx},${gy}`,
    spawnPrefab: (prefabId, gx, gy) => `spawned ${prefabId} at ${gx},${gy}`,
    setSpeed: (tilesPerSec) => `speed set to ${tilesPerSec} tiles/s`,
    toggleNoclip: () => "noclip on",
    triggerInteract: () => "interaction queued",
    setGatherSpeed: (seconds) => `gather swing interval set to ${seconds.toFixed(2)}s`,
    setShakeScale: (multiplier) => `shake intensity set to ${multiplier.toFixed(2)}`,
    setParticleCount: (count) => `hit particle count set to ${count}`,
    playSound: (sound) => `playing ${sound} sound`,
    setSoundEnabled: (enabled) => `sound synthesis ${enabled ? "enabled" : "disabled"}`,
    stamina: {
      inspect: () => "stamina 100/100",
      set: (value) => `stamina ${value}/100`,
      setMax: (value) => `stamina max set to ${value}`,
      setRegen: (passive, combat) => `stamina regen set to passive ${passive}/s, combat ${combat}/s`,
      spend: (amount, mode) => `spent ${amount} (${mode})`,
    },
    thirst: {
      inspect: () => "thirst 100/100",
      set: (value) => `thirst ${value}/100`,
      setMax: (value) => `thirst max set to ${value}`,
      setRate: (baseDrainPerSec) => `thirst base drain set to ${baseDrainPerSec}/s`,
    },
    status: {
      list: () => "no active statuses",
      apply: (statusId, durationSec) => `applied ${statusId} for ${durationSec}s`,
      clear: (statusId) => `cleared ${statusId}`,
      clearAll: () => "all statuses cleared",
    },
    rpg: {
      inspect: () => "weapon: none",
      equip: (itemId) => (itemId ? `weapon slot -> ${itemId}` : "weapon slot cleared"),
      give: (itemId, qty) => `+${qty}x ${itemId} -> local inventory`,
      setHp: (hp) => `hp set to ${hp}`,
      reset: () => "rpg state cleared",
    },
    skill: {
      inspect: () => "skills",
      addXp: (skill, qty) => `added ${qty} xp to ${skill}`,
      setLevel: (skill, level) => `${skill} level set to ${level}`,
    },
    cooldown: {
      inspect: () => "zero cooldowns: off",
      setZero: (enabled) => `zero cooldowns ${enabled ? "enabled" : "disabled"}`,
      reset: () => "cooldowns reset",
    },
    collision: {
      list: () => "1 solid tile(s), 0 override(s), overlay off",
      show: (enabled) => `collision overlay ${enabled ? "shown" : "hidden"}`,
      get: (id) => `${id}: no runtime override`,
      set: (id) => `collision footprint set for ${id}`,
      reset: (id) => `collision footprint reset for ${id}`,
    },
    focused: {
      start: () => "focused gathering queued",
    },
  };
}

describe("executeGameCommand", () => {
  it("emits events and runtime effects for spawn commands", async () => {
    const result = await executeGameCommand(fakeContext(), {
      type: "world.spawn",
      prefabId: "oak_tree",
      gx: 3,
      gy: 5,
    });

    expect(result.ok).toBe(true);
    expect(result.events).toContainEqual({ type: "world.spawned", prefabId: "oak_tree", gx: 3, gy: 5 });
    expect(result.effects).toContainEqual({ kind: "runtime", channel: "world", description: "spawned oak_tree at 3,5" });
  });

  it("emits inventory effects for rpg give", async () => {
    const result = await executeGameCommand(fakeContext(), {
      type: "rpg.give",
      itemId: "stick",
      qty: 2,
    });

    expect(result.ok).toBe(true);
    expect(result.events).toContainEqual({ type: "inventory.changed", itemId: "stick", qtyDelta: 2 });
    expect(result.effects).toContainEqual({ kind: "inventory", itemId: "stick", qtyDelta: 2 });
  });

  it("emits status effects for status application", async () => {
    const result = await executeGameCommand(fakeContext(), {
      type: "status.apply",
      statusId: StatusId.Cut,
      durationSec: 5,
    });

    expect(result.ok).toBe(true);
    expect(result.events).toContainEqual({ type: "status.applied", statusId: StatusId.Cut, durationSec: 5 });
    expect(result.effects).toContainEqual({
      kind: "status",
      operation: "apply",
      statusId: StatusId.Cut,
      durationSec: 5,
    });
  });

  it("routes collision tuning through the command context", async () => {
    const result = await executeGameCommand(fakeContext(), {
      type: "collision.set",
      id: "stone_node",
      footprint: { minX: 0.2, maxX: 0.8, minY: 0.6, maxY: 0.9 },
    });

    expect(result.ok).toBe(true);
    expect(result.feedback).toContainEqual({ tone: "success", message: "collision footprint set for stone_node" });
  });
});
