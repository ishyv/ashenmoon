import { Cell } from "$lib/core/types";
import { type MapResource, type SpawnNode } from "$lib/core/systems/map/map";
import { coordKey } from "$lib/utils/coord-utils";
import { GATHERABLE_DEFINITIONS } from "$lib/domain/gathering/gatherables";
import type { ScenarioDefinition } from "$lib/domain/scenarios/scenario-types";

/**
 * Fills a MapResource in-place from a ScenarioDefinition.
 * Call this instead of buildMapSystem when a scenarioId is active.
 *
 * solidCoords rules:
 * - Water cells are solid (same as buildMapSystem).
 * - Any spawn whose gatherable has solidKind "tree" or "rock" adds a coarse
 *   solid at that grid coord. The sub-tile customSolids AABB is set later by
 *   spawnResource, same as in the procedural world.
 * - Camp cells are NOT solid — the campfire entity adds its own solid in spawnEntities.
 *
 * The Camp clearing is only carved when the scenario opts into `camp`; a clean
 * scenario keeps its fill biome uniform right up to the spawn point.
 */
export function loadScenarioIntoMap(map: MapResource, scenario: ScenarioDefinition): void {
  const { mapW: W, mapH: H, cellFill, cells, spawns, spawnPoint } = scenario;

  map.mapW = W;
  map.mapH = H;
  map.cells = [];
  map.solidCoords = new Set();
  map.customSolids = new Map();
  map.mapData = { spawns: [] };

  const sx = spawnPoint.gx;
  const sy = spawnPoint.gy;
  const carveCamp = scenario.camp === true;
  const campX1 = sx - 2;
  const campX2 = sx + 2;
  const campY1 = sy - 2;
  const campY2 = sy + 2;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const inCamp = carveCamp && x >= campX1 && x <= campX2 && y >= campY1 && y <= campY2;
      if (inCamp) {
        map.cells.push(Cell.Camp);
        continue;
      }
      const idx = y * W + x;
      const cell = cells?.[idx] ?? cellFill;
      map.cells.push(cell);
      if (cell === Cell.Water) {
        map.solidCoords.add(coordKey(x, y));
      }
    }
  }

  const spawnNodes: SpawnNode[] = [];
  for (const s of spawns) {
    spawnNodes.push({ id: s.id, x: s.x, y: s.y, gatherableId: s.gatherableId });
    const def = GATHERABLE_DEFINITIONS[s.gatherableId];
    if (def?.solidKind === "tree" || def?.solidKind === "rock") {
      map.solidCoords.add(coordKey(s.x, s.y));
    }
  }

  map.mapData = { spawns: spawnNodes };
}
