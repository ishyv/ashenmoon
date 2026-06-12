import { ITEM_DEFINITIONS, type ItemDefinition } from "$lib/domain/items";
import { STATION_DEFINITIONS, type ProcessType, type StationDefinition, type StationId } from "$lib/domain/stations";
import type { Inventory } from "./inventory-system";

export interface StationProcess {
  readonly id: string;
  readonly stationId: StationId;
  readonly inputs: Readonly<Record<string, number>>;
  readonly processType: ProcessType;
  readonly durationSec: number;
  readonly outputItemId: string;
  readonly outputQty: number;
}

export const STATION_PROCESSES: readonly StationProcess[] = [
  // Campfire processes
  {
    id: "boil_water",
    stationId: "campfire",
    inputs: { dirty_water: 1 },
    processType: "boil",
    durationSec: 4,
    outputItemId: "clean_water",
    outputQty: 1,
  },
  {
    id: "make_charcoal",
    stationId: "campfire",
    inputs: { branch: 1 },
    processType: "burn",
    durationSec: 10,
    outputItemId: "charcoal",
    outputQty: 1,
  },
  {
    id: "bake_clay",
    stationId: "campfire",
    inputs: { clay: 1 },
    processType: "heat",
    durationSec: 8,
    outputItemId: "hardened_clay",
    outputQty: 1,
  },
  // Drying rack processes
  {
    id: "dry_berries",
    stationId: "drying_rack",
    inputs: { berries: 1 },
    processType: "dry",
    durationSec: 6,
    outputItemId: "dried_berries",
    outputQty: 1,
  },
  {
    id: "dry_moss",
    stationId: "drying_rack",
    inputs: { moss: 1 },
    processType: "dry",
    durationSec: 5,
    outputItemId: "weak_medicine",
    outputQty: 1,
  },
  // Primitive work surface processes
  {
    id: "assemble_flint_axe",
    stationId: "primitive_work_surface",
    inputs: { stick: 1, flint_shard: 1, grass_fiber: 1 },
    processType: "assemble",
    durationSec: 5,
    outputItemId: "flint_axe",
    outputQty: 1,
  },
  {
    id: "assemble_flint_pickaxe",
    stationId: "primitive_work_surface",
    inputs: { stick: 1, flint_shard: 1, grass_fiber: 1 },
    processType: "assemble",
    durationSec: 5,
    outputItemId: "flint_pickaxe",
    outputQty: 1,
  },
];

export function validateStationProcesses(
  processes: readonly StationProcess[] = STATION_PROCESSES,
  stations: Readonly<Partial<Record<string, StationDefinition>>> = STATION_DEFINITIONS,
  items: Readonly<Record<string, ItemDefinition>> = ITEM_DEFINITIONS,
): string[] {
  const problems: string[] = [];

  for (const process of processes) {
    const station = stations[process.stationId];
    if (!station) {
      problems.push(`station process ${process.id} references unknown station ${process.stationId}`);
    } else if (!station.processTypes.includes(process.processType)) {
      problems.push(
        `station process ${process.id} uses ${process.processType}, which ${station.id} does not accept`,
      );
    }

    const inputEntries = Object.entries(process.inputs);
    if (inputEntries.length === 0) {
      problems.push(`station process ${process.id} has no inputs`);
    }
    for (const [itemId, qty] of inputEntries) {
      if (!items[itemId]) problems.push(`station process ${process.id} references unknown input ${itemId}`);
      if (!Number.isFinite(qty) || qty <= 0) {
        problems.push(`station process ${process.id} input ${itemId} quantity must be positive`);
      }
    }

    if (!items[process.outputItemId]) {
      problems.push(`station process ${process.id} references unknown output ${process.outputItemId}`);
    }
    if (!Number.isFinite(process.durationSec) || process.durationSec <= 0) {
      problems.push(`station process ${process.id} duration must be positive`);
    }
    if (!Number.isFinite(process.outputQty) || process.outputQty <= 0) {
      problems.push(`station process ${process.id} output quantity must be positive`);
    }
  }

  return problems;
}

/** Finds the first process for a station whose ingredients are present in inventory. */
export function findProcessForStation(
  inventory: Inventory,
  stationId: StationId
): StationProcess | null {
  for (const process of STATION_PROCESSES) {
    if (process.stationId !== stationId) continue;

    let hasAll = true;
    for (const [itemId, reqQty] of Object.entries(process.inputs)) {
      const slot = inventory.slots[itemId];
      const qty = slot && "qty" in slot ? slot.qty : 0;
      if (qty < reqQty) {
        hasAll = false;
        break;
      }
    }
    if (hasAll) {
      return process;
    }
  }
  return null;
}
