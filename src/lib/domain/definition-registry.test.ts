import { describe, expect, it } from "vitest";
import {
  DEFINITION_REGISTRY,
  getPrefabDefinition,
  validateDefinitionRegistry,
} from "$lib/domain/definition-registry";

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
});
