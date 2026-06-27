import { describe, expect, it } from "vitest";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { createCampfireState } from "$lib/domain/camp/camp-state";
import { syncCampfireEmitters } from "./environment-signal-system";

describe("syncCampfireEmitters", () => {
  it("creates heat and light emitters for a lit campfire", () => {
    const entity: Entity = {
      id: "fire",
      campfire: createCampfireState({ isLit: true, heatRadiusPx: 288, lightRadiusPx: 352 }),
      emitter: [],
    };

    syncCampfireEmitters(entity);

    expect(entity.emitter).toEqual([
      { signal: "heat", strength: 600, radiusPx: 288, falloff: "linear" },
      { signal: "light", strength: 1, radiusPx: 352, falloff: "linear" },
    ]);
  });

  it("clears emitters when the campfire is unlit", () => {
    const entity: Entity = {
      id: "fire",
      campfire: createCampfireState({ isLit: false }),
      emitter: [{ signal: "heat", strength: 600, radiusPx: 288, falloff: "linear" }],
    };

    syncCampfireEmitters(entity);

    expect(entity.emitter).toEqual([]);
  });
});
