import { describe, expect, it, beforeEach } from "vitest";
import { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { StorageKeys } from "$lib/domain/game-events";
import { createCampfireState } from "$lib/domain/camp/camp-state";
import {
  hydrateEntitySnapshot,
  loadWorldSnapshot,
  saveWorldSnapshot,
  serializeEntity,
  serializeWorld,
  unclassifiedEntityComponentKeys,
} from "./world-snapshot";

beforeEach(() => localStorage.clear());

describe("world snapshot persistence", () => {
  it("round-trips durable entity components and omits derived emitters", () => {
    const entity: Entity = {
      id: "building_campfire_1",
      position: { x: 64, y: 128, targetX: 64, targetY: 128 },
      collider: { isSolid: true },
      interactable: { name: "campfire", action: "process" },
      station: { stationId: "campfire" },
      campfire: createCampfireState({ isLit: true, fuelRemainingMs: 12_000, wetness: 0.25 }),
      pickup: { itemId: "raw_meat", qty: 1, reactions: { rot: 3 } },
      trap: { type: "snap", state: "sprung" },
      carcass: { speciesId: "rabbit", state: "partially_processed", ageSec: 42, processedActions: ["harvest_meat"] },
      landmark: { kind: "sentry_chest", depleted: true },
      health: { current: 4, max: 10, faction: "hostile", invulnTimer: 0.2 },
      emitter: [{ signal: "heat", strength: 1, radiusPx: 128, falloff: "linear" }],
    };

    const snapshot = serializeEntity(entity);
    expect(snapshot.campfire?.fuelRemainingMs).toBe(12_000);
    expect(snapshot.pickup?.reactions).toEqual({ rot: 3 });
    expect(snapshot.trap?.state).toBe("sprung");
    expect(snapshot.carcass?.processedActions).toEqual(["harvest_meat"]);
    expect(snapshot.landmark?.depleted).toBe(true);
    expect("emitter" in snapshot).toBe(false);

    const hydrated = hydrateEntitySnapshot(snapshot);
    expect(hydrated).toEqual(snapshot);
  });

  it("classifies every current entity component key", () => {
    const entity: Entity = {
      id: "everything",
      position: { x: 0, y: 0, targetX: 0, targetY: 0 },
      collider: { isSolid: false },
      playerControlled: { speed: 1 },
      interactable: { name: "thing", action: "examine" },
      resource: { hp: 1, maxHp: 1, drop: "stick" },
      pickup: { itemId: "stick", qty: 1 },
      station: { stationId: "campfire" },
      campfire: createCampfireState({ isLit: false }),
      campStructure: { type: "campfire" },
      animal: {
        speciesId: "rabbit",
        behavior: "idle",
        hunger: 1,
        threatened: false,
        attackCooldownSec: 0,
        home: { x: 0, y: 0 },
        wanderTimerSec: 0,
        facingX: 1,
        animState: "idle",
        awarenessLevel: "unaware",
        awarenessDecaySec: 0,
      },
      carcass: { speciesId: "rabbit", state: "fresh", ageSec: 0, processedActions: [] },
      health: { current: 1, max: 1, faction: "hostile", invulnTimer: 0 },
      knockback: { vx: 0, vy: 0, timer: 0 },
      bleed: { remainingSec: 1, tickEverySec: 1, tickTimer: 0, damagePerTick: 1 },
      mover: { speed: 1 },
      ai: { state: "idle", aggroRadius: 1, leashRadius: 1, home: { x: 0, y: 0 }, animState: "idle", facingX: 1 },
      melee: { range: 1, damage: 1, knockback: 0, cooldown: 1, cooldownTimer: 0, windup: 0, windupTimer: 0 },
      loot: { xpReward: 1 },
      landmark: { kind: "sentry_chest", depleted: false },
      building: { type: "campfire", stage: 5 },
      trap: { type: "snap", state: "set" },
      emitter: [],
    };

    expect(unclassifiedEntityComponentKeys(entity)).toEqual([]);
  });

  it("saves and loads resources with paused timed runtime state", () => {
    const world = new World<Entity>();
    world.add({ id: "campfire", campfire: createCampfireState({ isLit: true, fuelRemainingMs: 5_000 }) });

    const snapshot = serializeWorld(world, {
      now: 123,
      scenarioId: null,
      worldSeed: 99,
      resources: {
        interaction: {
          activeProcesses: [
            {
              stationEntityId: "campfire",
              runtime: {
                processId: "cook_meat",
                stationId: "campfire",
                targetEntityId: "campfire",
                processType: "heat",
                inputs: { raw_meat: 1 },
                outputItemId: "cooked_meat",
                outputQty: 1,
                durationSec: 6,
                elapsedSec: 2,
                remainingSec: 4,
                bubbleTimer: 0.5,
              },
            },
          ],
          activeWorldAction: null,
          activeWorldActionPrecision: true,
        },
        construction: { buildingId: "building_campfire_1", nextStage: 3, timer: 0.7, duration: 1.8, cost: { stone: 2 } },
      },
    });

    saveWorldSnapshot(snapshot);

    expect(JSON.parse(localStorage.getItem(StorageKeys.world)!).data.savedAt).toBe(123);
    expect(loadWorldSnapshot()?.resources).toEqual(snapshot.resources);
  });
});
