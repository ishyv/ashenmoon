import { describe, expect, it } from "vitest";
import { tickNeeds, evaluateLifeStage, getLifeStageScale, getLifeStageStats, type AnimalNeedsState } from "./needs";
import { ANIMAL_DEFINITIONS } from "./animal-behavior";

describe("animal needs and lifecycles", () => {
  it("ticks hunger and thirst over time", () => {
    const needs: AnimalNeedsState = {
      hunger: 20,
      thirst: 20,
      energy: 100,
      ageSec: 0,
      lifeStage: "adult",
    };
    const def = ANIMAL_DEFINITIONS.rabbit;
    
    // Tick 60 seconds
    tickNeeds(needs, def, 60, false, false);
    
    // Rabbit hunger decay is 6 per minute, so hunger should go from 20 to 26
    expect(needs.hunger).toBe(26);
    // Thirst decay is 4 per minute, so thirst should go from 20 to 24
    expect(needs.thirst).toBe(24);
    expect(needs.ageSec).toBe(60);
  });

  it("increases hunger faster in rain for predators", () => {
    const needs: AnimalNeedsState = {
      hunger: 20,
      thirst: 20,
      energy: 100,
      ageSec: 0,
      lifeStage: "adult",
    };
    const def = ANIMAL_DEFINITIONS.wolf;
    
    // Tick 60 seconds in rain. Wolf base hunger decay is 8 per minute, rain multiplier is 1.5x (8 * 1.5 = 12)
    tickNeeds(needs, def, 60, true, false);
    expect(needs.hunger).toBe(32);
  });

  it("increases thirst faster in scorched wastes (heat)", () => {
    const needs: AnimalNeedsState = {
      hunger: 20,
      thirst: 20,
      energy: 100,
      ageSec: 0,
      lifeStage: "adult",
    };
    const def = ANIMAL_DEFINITIONS.rabbit;
    
    // Tick 60 seconds in heat. Thirst rate doubles from 4 to 8 per minute
    tickNeeds(needs, def, 60, false, true);
    expect(needs.thirst).toBe(28);
  });

  it("accelerates hunger decay for pregnant females", () => {
    const needs: AnimalNeedsState = {
      hunger: 20,
      thirst: 20,
      energy: 100,
      ageSec: 0,
      lifeStage: "adult",
      gestationTimerSec: 60,
    };
    const def = ANIMAL_DEFINITIONS.rabbit;
    
    // Tick 60 seconds. Pregnant female hunger decay is 2.0x (6 * 2.0 = 12 per minute)
    tickNeeds(needs, def, 60, false, false);
    expect(needs.hunger).toBe(32);
    expect(needs.gestationTimerSec).toBe(0);
  });

  it("transitions life stages based on age", () => {
    const needs: AnimalNeedsState = {
      hunger: 20,
      thirst: 20,
      energy: 100,
      ageSec: 0,
      lifeStage: "juvenile",
    };

    expect(evaluateLifeStage(needs)).toBe("juvenile");

    // Age past juvenile threshold (180s)
    needs.ageSec = 185;
    expect(evaluateLifeStage(needs)).toBe("adult");

    // Age past adult threshold (180 + 600 = 780s)
    needs.ageSec = 790;
    needs.lifeStage = "adult"; // simulate state update
    expect(evaluateLifeStage(needs)).toBe("elder");

    // Age past elder threshold (780 + 300 = 1080s)
    needs.ageSec = 1090;
    needs.lifeStage = "elder"; // simulate state update
    expect(evaluateLifeStage(needs)).toBe("dead");
  });

  it("adjusts scale and stats based on life stage", () => {
    expect(getLifeStageScale("juvenile")).toBe(0.5);
    expect(getLifeStageScale("adult")).toBe(1.0);
    expect(getLifeStageScale("elder")).toBe(1.2);

    const rabbitDef = ANIMAL_DEFINITIONS.rabbit;
    const juvenileStats = getLifeStageStats("juvenile", rabbitDef);

    expect(juvenileStats.maxHealth).toBe(Math.round(rabbitDef.maxHealth * 0.5));
    expect(juvenileStats.damage).toBeUndefined(); // rabbits have no damage anyway

    const boarDef = ANIMAL_DEFINITIONS.boar;
    const elderBoarStats = getLifeStageStats("elder", boarDef);
    expect(elderBoarStats.maxHealth).toBe(Math.round(boarDef.maxHealth * 1.3));
    expect(elderBoarStats.damage).toBe(Math.round(boarDef.damage! * 1.2));
  });
});
