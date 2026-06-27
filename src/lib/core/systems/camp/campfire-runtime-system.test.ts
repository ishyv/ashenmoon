import { describe, expect, it } from "vitest";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { createCampfireState } from "$lib/domain/camp/camp-state";
import { refuelCampfireEntity } from "./campfire-runtime-system";

describe("refuelCampfireEntity", () => {
  it("immediately syncs heat emitters after refuel", () => {
    const entity: Entity = {
      id: "fire",
      campfire: createCampfireState({ isLit: false }),
      emitter: [],
    };

    refuelCampfireEntity(entity, 30_000);

    expect(entity.campfire?.isLit).toBe(true);
    expect(entity.emitter?.some((emitter) => emitter.signal === "heat" && emitter.radiusPx > 0)).toBe(true);
  });
});
