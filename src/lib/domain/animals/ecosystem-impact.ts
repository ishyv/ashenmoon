export interface DepletionResult {
  readonly depleted: boolean;
  readonly newHunger: number;
}

export interface SoilFertilizationSpawn {
  readonly x: number;
  readonly y: number;
  readonly gatherableId: string;
}

/**
 * Handles grazing consumption outcome on a gatherable node.
 */
export function consumeVegetation(
  currentHunger: number,
  nodeHp: number,
  grazeAmount = 15
): DepletionResult {
  const finalHp = Math.max(0, nodeHp - grazeAmount);
  return {
    depleted: finalHp === 0,
    newHunger: Math.max(0, currentHunger - 30), // Satisfies 30 points of hunger
  };
}

/**
 * Computes vegetation node spawns when a rotten carcass decomposes.
 * Scans a 2-tile radius around (cx, cy) and returns coordinates/types to spawn on Meadows.
 */
export function calculateFertilizationSpawns(
  cx: number,
  cy: number,
  mapW: number,
  mapH: number,
  getCellType: (x: number, y: number) => number | undefined,
  isCellSolid: (x: number, y: number) => boolean,
  rng: () => number = Math.random
): SoilFertilizationSpawn[] {
  const spawns: SoilFertilizationSpawn[] = [];
  const plantPool = ["grass_patch", "mushroom_patch", "wild_herb_patch", "mossPatch"];

  // Scan a 2-tile radius
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (dx === 0 && dy === 0) continue; // Skip center

      const tx = cx + dx;
      const ty = cy + dy;

      if (tx < 0 || tx >= mapW || ty < 0 || ty >= mapH) continue;

      const cell = getCellType(tx, ty);
      // Only fertilize Meadows/Camp cells that aren't solid walls or water
      if (cell === 5 || cell === 6) { // Meadows = 5, Camp = 6 (checking Cell enum values)
        if (isCellSolid(tx, ty)) continue;

        // Roll chance to spawn flora (35% chance per eligible cell, up to 3 max spawns total)
        if (rng() < 0.35 && spawns.length < 3) {
          const plantIdx = Math.floor(rng() * plantPool.length);
          const gatherableId = plantPool[plantIdx] ?? "grass_patch";
          spawns.push({ x: tx, y: ty, gatherableId });
        }
      }
    }
  }

  return spawns;
}

/**
 * Applies mud coat buffs based on biome cell type (0 = Meadows, 3 = FungalMire, 1 = ScorchedWastes).
 */
export function applyMudCoat(cellType: number): {
  durationSec: number;
  type: "mud" | "toxic_sludge" | "volcanic_ash";
  armorBonus: number;
  fireResistBonus: number;
} {
  if (cellType === 3) { // FungalMire
    return {
      durationSec: 300,
      type: "toxic_sludge",
      armorBonus: 1,
      fireResistBonus: -0.2,
    };
  } else if (cellType === 1) { // ScorchedWastes
    return {
      durationSec: 300,
      type: "volcanic_ash",
      armorBonus: 3,
      fireResistBonus: 0.8,
    };
  } else { // Meadows = 0, default/other
    return {
      durationSec: 300,
      type: "mud",
      armorBonus: 2,
      fireResistBonus: 0,
    };
  }
}

/**
 * Rooting: transform Meadow cells (0) into Camp (6) (representing dirt/mud).
 */
export function rootSoil(
  currentCell: number,
  rng: () => number = Math.random
): { cellChange: boolean; newCell?: number } {
  if (currentCell === 0) { // Meadows
    if (rng() < 0.2) { // 20% chance
      return { cellChange: true, newCell: 6 }; // Camp (dirt)
    }
  }
  return { cellChange: false };
}
