import type { AnimalSpeciesId } from "$lib/domain/animals/animal-behavior";
import type { ForestAnimalZone } from "$lib/core/systems/map/map";

export interface PlannedAnimalSpawn {
  readonly seq: number;
  readonly x: number;
  readonly y: number;
  readonly speciesId: AnimalSpeciesId;
}

export interface PlannedAnimalSpawns {
  readonly spawns: readonly PlannedAnimalSpawn[];
  readonly nextSeq: number;
}

export function planInitialAnimalSpawns(
  zones: readonly ForestAnimalZone[],
  animalSeq: number,
): PlannedAnimalSpawns {
  const spawns: PlannedAnimalSpawn[] = [];
  let nextSeq = animalSeq;

  for (const zone of zones) {
    switch (zone.kind) {
      case "rabbit_burrow":
        spawns.push({ seq: nextSeq++, x: zone.x, y: zone.y, speciesId: "rabbit" });
        spawns.push({ seq: nextSeq++, x: zone.x + 1, y: zone.y, speciesId: "rabbit" });
        break;
      case "deer_grazing":
        spawns.push({ seq: nextSeq++, x: zone.x, y: zone.y, speciesId: "deer" });
        break;
      case "boar_rooting":
        spawns.push({ seq: nextSeq++, x: zone.x, y: zone.y, speciesId: "boar" });
        break;
      case "wolf_territory":
        spawns.push({ seq: nextSeq++, x: zone.x, y: zone.y, speciesId: "wolf" });
        break;
    }
  }

  return { spawns, nextSeq };
}
