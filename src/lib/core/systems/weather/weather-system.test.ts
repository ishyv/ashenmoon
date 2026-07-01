import { describe, expect, it } from "vitest";
import { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { TILE, MapResource } from "$lib/core/systems/map/map";
import { collectWolfCampThreatFactors } from "$lib/core/systems/weather/weather-system";
import { createLitCampfireState } from "$lib/core/systems/camp/campfire-runtime-system";

describe("collectWolfCampThreatFactors", () => {
  it("reads wolf threat inputs from runtime world state", () => {
    const world = new World<Entity>();
    const map = new MapResource();
    map.forestMetadata.landmarks.push({ kind: "wolf_den", label: "wolf den", x: 12, y: 10 });
    map.forestMetadata.eventPoints.push({ kind: "corpse_site", x: 11, y: 10 });

    const player: Entity = {
      id: "player",
      position: { x: 10 * TILE, y: 10 * TILE, targetX: 10 * TILE, targetY: 10 * TILE },
    };
    world.add(player);
    world.add({
      id: "fire",
      position: { x: 10 * TILE, y: 10 * TILE, targetX: 10 * TILE, targetY: 10 * TILE },
      campfire: createLitCampfireState(30_000),
    });
    world.add({
      id: "barrier",
      campStructure: { type: "spike_barrier" },
    });
    world.add({
      id: "rabbit_carcass",
      carcass: { speciesId: "rabbit", state: "fresh", ageSec: 0, processedActions: [] },
    });
    world.add({
      id: "raw_meat",
      pickup: { itemId: "raw_meat", qty: 2 },
    });
    world.add({
      id: "spoiled_meat",
      pickup: { itemId: "spoiled_meat", qty: 1 },
    });

    expect(collectWolfCampThreatFactors({
      world,
      map,
      playerEntity: player,
      timeOfDay: 0.9,
      nearWolfZone: true,
    })).toMatchObject({
      isNight: true,
      nearWolfZone: true,
      nearWolfDen: true,
      spikeBarrierCount: 1,
      freshCarcassCount: 1,
      exposedRawMeat: 2,
      exposedSpoiledMeat: 1,
      recentKillSites: 1,
    });
  });
});

import { weatherOverlaySystem, WeatherResource } from "$lib/core/systems/weather/weather-system";
import { gameState } from "$lib/state/game-state.svelte";
import { createDefaultSkills } from "$lib/domain/rpg-defaults";

describe("weatherOverlaySystem warmth integration", () => {
  it("reduces cold accumulation based on player warmth/insulation", () => {
    const world = new World<Entity>();
    const player: Entity = {
      id: "player",
      position: { x: 10 * TILE, y: 10 * TILE, targetX: 10 * TILE, targetY: 10 * TILE },
    };
    world.add(player);

    const weather = new WeatherResource();
    weather.state.timeOfDay = 0.9; // Nighttime
    weather.coldAccumulator = 0;

    const dummyOverlay = {
      alpha: 0,
      clear: function() { return this; },
      rect: function() { return this; },
      fill: function() { return this; },
    } as any;
    const dummyContainer = { tint: 0xffffff } as any;
    const shelterColdMult = () => 1.0;

    // 1. Warmth = 0 (default player with no gear)
    if (gameState.rpg) {
      gameState.rpg.profile = {
        loadout: {
          helmet: null,
          chest: null,
          shield: null,
          pants: null,
          boots: null,
          ring: null,
          necklace: null,
        },
      } as any;
    }

    weatherOverlaySystem(
      world,
      weather,
      player,
      dummyOverlay,
      dummyContainer,
      shelterColdMult,
      1.0 // dt
    );

    const coldAccumWithNoWarmth = weather.coldAccumulator;
    expect(coldAccumWithNoWarmth).toBeGreaterThan(0);

    // 2. Warmth > 0 (equipped gear)
    weather.coldAccumulator = 0;
    if (gameState.rpg) {
      gameState.rpg.profile = {
        loadout: {
          helmet: null,
          chest: { itemId: "hide_cloak", instanceId: "1", durability: 100 }, // Warmth: 2
          shield: null,
          pants: null,
          boots: null,
          ring: null,
          necklace: null,
        },
      } as any;
    }

    weatherOverlaySystem(
      world,
      weather,
      player,
      dummyOverlay,
      dummyContainer,
      shelterColdMult,
      1.0 // dt
    );

    const coldAccumWithWarmth = weather.coldAccumulator;
    expect(coldAccumWithWarmth).toBeLessThan(coldAccumWithNoWarmth);

    // 3. coldResist from a leveled Vigilance skill (warmth back to 0)
    weather.coldAccumulator = 0;
    if (gameState.rpg) {
      gameState.rpg.profile = {
        characterLevel: 1,
        loadout: {
          helmet: null,
          chest: null,
          shield: null,
          pants: null,
          boots: null,
          ring: null,
          necklace: null,
        },
      } as any;
      gameState.rpg.skills = createDefaultSkills();
      gameState.rpg.skills.vigilance = { level: 20, xp: 0, nextXp: 2000 };
    }

    weatherOverlaySystem(
      world,
      weather,
      player,
      dummyOverlay,
      dummyContainer,
      shelterColdMult,
      1.0 // dt
    );

    const coldAccumWithResist = weather.coldAccumulator;
    expect(coldAccumWithResist).toBeLessThan(coldAccumWithNoWarmth);

    // Reset skills back to a clean state so test-order in this file
    // (or any future test appended below) doesn't inherit the leveled
    // Vigilance skill mutated above.
    if (gameState.rpg) {
      gameState.rpg.skills = createDefaultSkills();
    }
  });
});

