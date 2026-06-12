import { describe, expect, it } from "vitest";
import {
  DEFINITION_REGISTRY,
  getPrefabDefinition,
  validateDefinitionRegistry,
} from "$lib/domain/definition-registry";
import type { StationProcess } from "$lib/domain/systems/station-process";

describe("definition registry", () => {
  it("validates the canonical content surface", () => {
    expect(validateDefinitionRegistry()).toEqual([]);
  });

  it("creates a spawnable prefab for every gatherable", () => {
    for (const gatherableId of Object.keys(DEFINITION_REGISTRY.gatherables)) {
      const prefab = getPrefabDefinition(gatherableId);
      expect(prefab, gatherableId).toBeDefined();
      expect(prefab?.components).toContainEqual({ type: "resource", gatherableId });
      expect(prefab?.feedback?.interact).toBeTruthy();
    }
  });

  it("rejects prefabs that reference missing content", () => {
    const registry = {
      ...DEFINITION_REGISTRY,
      prefabs: {
        ...DEFINITION_REGISTRY.prefabs,
        bad_prefab: {
          id: "bad_prefab",
          displayName: "Bad Prefab",
          components: [{ type: "resource" as const, gatherableId: "missing_node" }],
          render: { kind: "rock" as const },
          feedback: { spawn: "bad prefab appears." },
        },
      },
    };

    expect(validateDefinitionRegistry(registry)).toContain(
      "prefab bad_prefab references unknown gatherable missing_node",
    );
  });

  it("rejects invalid authored collision footprints", () => {
    const registry = {
      ...DEFINITION_REGISTRY,
      prefabs: {
        ...DEFINITION_REGISTRY.prefabs,
        stone_node: {
          ...DEFINITION_REGISTRY.prefabs.stone_node!,
          collision: { solid: true, footprint: { minX: 0.9, maxX: 0.1, minY: 0, maxY: 1 } },
        },
      },
    };

    expect(validateDefinitionRegistry(registry)).toContain("prefab stone_node has invalid collision footprint");
  });

  it("rejects invalid station processes through canonical registry validation", () => {
    const registry = {
      ...DEFINITION_REGISTRY,
      stationProcesses: [
        ...DEFINITION_REGISTRY.stationProcesses,
        {
          id: "bad_station_process",
          stationId: "drying_rack",
          inputs: { dirty_water: 1 },
          processType: "boil",
          durationSec: 1,
          outputItemId: "clean_water",
          outputQty: 1,
        } as unknown as StationProcess,
      ],
    };

    expect(validateDefinitionRegistry(registry)).toContain(
      "station process bad_station_process uses boil, which drying_rack does not accept",
    );
  });
});
