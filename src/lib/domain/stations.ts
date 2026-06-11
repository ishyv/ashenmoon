export type StationId = "campfire" | "primitive_work_surface" | "drying_rack" | "storage_pile";

export type ProcessType = "heat" | "boil" | "burn" | "assemble" | "dry" | "store";

export interface StationDefinition {
  id: StationId;
  name: string;
  processTypes: readonly ProcessType[];
  inputSlots: number;
  fuelRequired?: boolean;
  heatOutput?: number;
}

export const STATION_DEFINITIONS: Record<StationId, StationDefinition> = {
  campfire: {
    id: "campfire",
    name: "Campfire",
    processTypes: ["heat", "boil", "burn"],
    inputSlots: 2,
    fuelRequired: true,
    heatOutput: 100,
  },
  primitive_work_surface: {
    id: "primitive_work_surface",
    name: "Primitive Work Surface",
    processTypes: ["assemble"],
    inputSlots: 4,
  },
  drying_rack: {
    id: "drying_rack",
    name: "Drying Rack",
    processTypes: ["dry"],
    inputSlots: 3,
  },
  storage_pile: {
    id: "storage_pile",
    name: "Storage Pile",
    processTypes: ["store"],
    inputSlots: 0,
  },
};

export function getStationDefinition(id: string): StationDefinition | undefined {
  return STATION_DEFINITIONS[id as StationId];
}
