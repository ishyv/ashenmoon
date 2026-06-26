import { Cell } from "$lib/domain/worldgen/cell";
import type { LandmarkKind } from "$lib/domain/worldgen/landmark-definitions";
import type { ForestAnimalZoneKind } from "$lib/domain/worldgen/first-camp-layout";

export interface StructureComponent {
  dx: number;
  dy: number;
  cellOverride?: Cell;
  gatherableId?: string;
  landmarkKind?: LandmarkKind;
  animalZoneKind?: ForestAnimalZoneKind;
  animalZoneRadius?: number;
}

export interface StructureDefinition {
  id: string;
  displayName: string;
  width: number;
  height: number;
  allowedBiomes: Cell[];
  components: StructureComponent[];
  isUnique?: boolean;
}

export const STRUCTURE_TEMPLATES: readonly StructureDefinition[] = [
  {
    id: "ruined_outpost",
    displayName: "Ruined Sentry",
    width: 5,
    height: 5,
    allowedBiomes: [Cell.Meadows, Cell.Frostbane],
    components: [
      { dx: 0, dy: 0, landmarkKind: "sentry_chest" },
      { dx: -1, dy: -1, landmarkKind: "ruined_watch_post" },
      { dx: 1, dy: 1, landmarkKind: "fallen_tree" },
      { dx: -2, dy: 2, gatherableId: "loose_stone_pickup" },
      { dx: 2, dy: -2, gatherableId: "flint_shard_pickup" },
    ],
  },
  {
    id: "abandoned_camp",
    displayName: "Derelict Camp",
    width: 5,
    height: 5,
    allowedBiomes: [Cell.Meadows, Cell.CrimsonGrove],
    components: [
      // Floor clearing overrides
      { dx: -1, dy: -1, cellOverride: Cell.Camp },
      { dx: 0, dy: -1, cellOverride: Cell.Camp },
      { dx: 1, dy: -1, cellOverride: Cell.Camp },
      { dx: -1, dy: 0, cellOverride: Cell.Camp },
      { dx: 0, dy: 0, cellOverride: Cell.Camp },
      { dx: 1, dy: 0, cellOverride: Cell.Camp },
      { dx: -1, dy: 1, cellOverride: Cell.Camp },
      { dx: 0, dy: 1, cellOverride: Cell.Camp },
      { dx: 1, dy: 1, cellOverride: Cell.Camp },
      // Objects
      { dx: 0, dy: 0, landmarkKind: "skeleton_remains" },
      { dx: -2, dy: -2, landmarkKind: "old_stump" },
      { dx: 2, dy: 2, gatherableId: "stick_pickup" },
      { dx: 1, dy: 2, gatherableId: "leaf_litter" },
    ],
  },
  {
    id: "cursed_shrine",
    displayName: "Cursed Altar",
    width: 5,
    height: 5,
    allowedBiomes: [Cell.CrimsonGrove, Cell.FungalMire],
    components: [
      { dx: 0, dy: 0, landmarkKind: "cursed_monolith" },
      { dx: -2, dy: -2, gatherableId: "mushroom_patch" },
      { dx: 2, dy: 2, gatherableId: "mushroom_patch" },
      { dx: -1, dy: 1, gatherableId: "grass_patch" },
      { dx: 1, dy: -1, gatherableId: "moss_patch" },
    ],
  },
  {
    id: "hermit_shelter",
    displayName: "Hermit's Lean-To",
    width: 4,
    height: 4,
    allowedBiomes: [Cell.Meadows, Cell.Frostbane],
    components: [
      { dx: 0, dy: 0, landmarkKind: "old_stump" },
      { dx: 1, dy: 1, gatherableId: "leaf_litter" },
      { dx: -1, dy: 1, gatherableId: "grass_patch" },
      { dx: 1, dy: -1, gatherableId: "stick_pickup" },
    ],
  },
  {
    id: "wolf_den_lair",
    displayName: "Wolf Nest",
    width: 6,
    height: 6,
    allowedBiomes: [Cell.Meadows, Cell.CrimsonGrove, Cell.FungalMire, Cell.Frostbane],
    components: [
      { dx: 0, dy: 0, landmarkKind: "wolf_den" },
      { dx: 1, dy: 1, landmarkKind: "bone_pile" },
      { dx: -1, dy: -1, landmarkKind: "bone_pile" },
      { dx: 0, dy: 0, animalZoneKind: "wolf_territory", animalZoneRadius: 4 },
    ],
  },
];
