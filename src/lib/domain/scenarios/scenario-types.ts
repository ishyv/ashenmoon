import type { Cell } from "$lib/domain/worldgen/cell";
import type { LandmarkKind } from "$lib/domain/worldgen/landmark-definitions";

export interface ScenarioSpawnNode {
  id: string;
  x: number;
  y: number;
  gatherableId: string;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  mapW: number;
  mapH: number;
  /** Single cell type to fill the entire grid (camp patch carved out automatically). */
  cellFill: Cell;
  /** Optional per-cell override — full 1D array (length = mapW * mapH, y*W+x). */
  cells?: Cell[];
  spawns: ScenarioSpawnNode[];
  enemies?: { gx: number; gy: number }[];
  spawnPoint: { gx: number; gy: number };

  /**
   * Scenario contents are opt-in. By default a scenario is an empty clean room:
   * no campfire, no Commander Vane, no random decorations, no seeded enemies.
   * Only the map, the declared spawns, and the player exist. Flip these on for
   * scenarios that deliberately want the base-world furniture.
   */
  /** Spawn the campfire + Commander Vane at the spawn point. Default false. */
  camp?: boolean;
  /** Scatter the random ambient decorations (rocks, tufts). Default false. */
  decorations?: boolean;
  /** Generate starting water sources, resources, animal zones, and landmarks. Default false. */
  firstCampLayout?: boolean;
  /**
   * Tool to auto-equip when the scenario loads, so tool-gated gatherables are
   * reachable immediately. The scenario panel can still switch tools at runtime.
   * Null/omitted leaves the player's current loadout untouched.
   */
  startTool?: string | null;
  /** Explicit landmark placements. The engine spawns these as interactable ECS entities. */
  landmarks?: { kind: LandmarkKind; gx: number; gy: number }[];
}
