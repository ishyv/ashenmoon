import { describe, expect, it, vi } from "vitest";

vi.mock("pixi.js", () => ({
  AnimatedSprite: class {
    scale = { x: 1, y: 1 };
    x = 0;
    y = 0;
    zIndex = 0;
    rotation = 0;
    alpha = 1;
    tint = 0xffffff;
    textures: unknown;
    animationSpeed = 0;
    loop = true;
    play() {}
  },
  Graphics: class {},
  Assets: { get: () => ({}) },
  Texture: class {},
}));

import { AnimatedSprite, type Container } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { cleanupAnimalSprite, syncAnimalSprite } from "$lib/core/systems/animals/animal-sprite-sync";

const BASE_X = 1.6;
const BASE_Y = 1.6;

function makeBoarEntity(id: string): Entity {
  return {
    id,
    position: { x: 0, y: 0, targetX: 0, targetY: 0 },
    animal: {
      speciesId: "boar",
      behavior: "charge_windup",
      hunger: 0,
      threatened: true,
      attackCooldownSec: 0,
      home: { x: 0, y: 0 },
      wanderTimerSec: 0,
      // Boar frames' naturalFacing is -1 (left-facing source art); use -1 here so
      // applyEntityAnim doesn't flip the sign and the scale assertions below stay positive.
      facingX: -1,
      animState: "attack",
      awarenessLevel: "alert",
      awarenessDecaySec: 0,
    },
  } as unknown as Entity;
}

const noopLayer = { addChild: () => {}, removeChild: () => {} } as unknown as Container;

describe("syncAnimalSprite scale stability", () => {
  it("does not compound scale across many charge_windup frames", () => {
    const entity = makeBoarEntity("boar-1");
    const sprite = new AnimatedSprite([] as any);
    sprite.scale.x = BASE_X;
    sprite.scale.y = BASE_Y;
    const entitySprites = new Map<string, Container>([["boar-1", sprite as unknown as Container]]);

    for (let i = 0; i < 200; i++) {
      syncAnimalSprite(entity, entitySprites, noopLayer, 1 / 60);
    }

    expect(sprite.scale.x).toBeCloseTo(BASE_X * 1.05, 5);
    expect(sprite.scale.y).toBeCloseTo(BASE_Y * 0.95, 5);
  });

  it("does not compound further across a second charge cycle", () => {
    const entity = makeBoarEntity("boar-2");
    const sprite = new AnimatedSprite([] as any);
    sprite.scale.x = BASE_X;
    sprite.scale.y = BASE_Y;
    const entitySprites = new Map<string, Container>([["boar-2", sprite as unknown as Container]]);

    for (let i = 0; i < 60; i++) {
      syncAnimalSprite(entity, entitySprites, noopLayer, 1 / 60);
    }

    entity.animal!.behavior = "wander";
    for (let i = 0; i < 60; i++) {
      syncAnimalSprite(entity, entitySprites, noopLayer, 1 / 60);
    }

    entity.animal!.behavior = "charge_windup";
    for (let i = 0; i < 50; i++) {
      syncAnimalSprite(entity, entitySprites, noopLayer, 1 / 60);
    }

    expect(sprite.scale.x).toBeCloseTo(BASE_X * 1.05, 5);
    expect(sprite.scale.y).toBeCloseTo(BASE_Y * 0.95, 5);
  });

  it("derives scale from a fresh base after cleanup, not the prior sprite's cached base", () => {
    const entity = makeBoarEntity("boar-3");
    const sprite = new AnimatedSprite([] as any);
    sprite.scale.x = BASE_X;
    sprite.scale.y = BASE_Y;
    const entitySprites = new Map<string, Container>([["boar-3", sprite as unknown as Container]]);

    for (let i = 0; i < 100; i++) {
      syncAnimalSprite(entity, entitySprites, noopLayer, 1 / 60);
    }

    cleanupAnimalSprite("boar-3", entitySprites, noopLayer);

    const respawnSprite = new AnimatedSprite([] as any);
    respawnSprite.scale.x = BASE_X * 2;
    respawnSprite.scale.y = BASE_Y * 2;
    entitySprites.set("boar-3", respawnSprite as unknown as Container);

    for (let i = 0; i < 50; i++) {
      syncAnimalSprite(entity, entitySprites, noopLayer, 1 / 60);
    }

    expect(respawnSprite.scale.x).toBeCloseTo(BASE_X * 2 * 1.05, 5);
    expect(respawnSprite.scale.y).toBeCloseTo(BASE_Y * 2 * 0.95, 5);
  });
});
