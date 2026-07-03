import type { AnimalSpeciesId } from "./animal-behavior";

export interface SpatialEntity {
  id: string;
  speciesId?: AnimalSpeciesId | undefined;
  x: number;
  y: number;
  isPlayer?: boolean;
}

export interface PerceivedTarget {
  id: string;
  speciesId?: AnimalSpeciesId | undefined;
  type: "threat" | "prey" | "mate" | "water" | "food" | "shelter";
  x: number;
  y: number;
  distPx: number;
}

/**
 * Helper to calculate Euclidean distance.
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

/**
 * Pure function to scan the vicinity and select targets of interest for the animal.
 */
export function scanPerceivedTargets(input: {
  ax: number;
  ay: number;
  speciesId: AnimalSpeciesId;
  detectionRadiusPx: number;
  preySpecies?: readonly AnimalSpeciesId[];
  temperament: string;
  nearbyAnimals: readonly SpatialEntity[];
  player?: SpatialEntity | undefined;
  waterTiles: readonly { x: number; y: number }[];
  foodNodes: readonly SpatialEntity[];
  shelters: readonly SpatialEntity[];
}): PerceivedTarget[] {
  const {
    ax,
    ay,
    speciesId,
    detectionRadiusPx,
    preySpecies,
    temperament,
    nearbyAnimals,
    player,
    waterTiles,
    foodNodes,
    shelters,
  } = input;

  const results: PerceivedTarget[] = [];

  // 1. Scan Player as threat (for fearful/timid/territorial) or prey (for predator during night)
  if (player) {
    const dist = distance(ax, ay, player.x, player.y);
    if (dist <= detectionRadiusPx) {
      const type = temperament === "predator" ? "prey" : "threat";
      results.push({
        id: player.id,
        type,
        x: player.x,
        y: player.y,
        distPx: dist,
      });
    }
  }

  // 2. Scan Nearby Animals
  for (const animal of nearbyAnimals) {
    if (animal.id === speciesId) continue;
    const dist = distance(ax, ay, animal.x, animal.y);
    if (dist > detectionRadiusPx) continue;

    if (preySpecies?.includes(animal.speciesId as AnimalSpeciesId)) {
      results.push({
        id: animal.id,
        speciesId: animal.speciesId,
        type: "prey",
        x: animal.x,
        y: animal.y,
        distPx: dist,
      });
    } else if (animal.speciesId === speciesId) {
      results.push({
        id: animal.id,
        speciesId: animal.speciesId,
        type: "mate",
        x: animal.x,
        y: animal.y,
        distPx: dist,
      });
    } else if (animal.speciesId === "wolf" && speciesId !== "wolf") {
      // Wolves are threats to non-wolves
      results.push({
        id: animal.id,
        speciesId: animal.speciesId,
        type: "threat",
        x: animal.x,
        y: animal.y,
        distPx: dist,
      });
    }
  }

  // 3. Scan Water Tiles (convert tile coordinates to pixels, offset to center)
  for (const water of waterTiles) {
    const wpx = water.x * 64 + 32;
    const wpy = water.y * 64 + 32;
    const dist = distance(ax, ay, wpx, wpy);
    if (dist <= detectionRadiusPx * 2.0) { // Water can be sensed slightly farther
      results.push({
        id: `water_${water.x}_${water.y}`,
        type: "water",
        x: wpx,
        y: wpy,
        distPx: dist,
      });
    }
  }

  // 4. Scan Food Nodes (e.g. Grass Patches, Berry Bushes)
  for (const food of foodNodes) {
    const dist = distance(ax, ay, food.x, food.y);
    if (dist <= detectionRadiusPx) {
      results.push({
        id: food.id,
        type: "food",
        x: food.x,
        y: food.y,
        distPx: dist,
      });
    }
  }

  // 5. Scan Shelters (Nests/Burrows/Buildings)
  for (const shelter of shelters) {
    const dist = distance(ax, ay, shelter.x, shelter.y);
    if (dist <= detectionRadiusPx * 2.5) { // Shelters can be sensed from very far
      results.push({
        id: shelter.id,
        type: "shelter",
        x: shelter.x,
        y: shelter.y,
        distPx: dist,
      });
    }
  }

  // Sort results by distance ascending so closest targets are evaluated first
  return results.sort((a, b) => a.distPx - b.distPx);
}
