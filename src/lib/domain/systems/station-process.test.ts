import { describe, expect, it } from "vitest";
import {
  createStationProcessRuntime,
  findProcessForStation,
  resolveStationProcessCompletion,
  tickStationProcessRuntime,
  validateStationProcesses,
  type StationProcess,
} from "./station-process";
import type { Inventory } from "./inventory-system";

describe("findProcessForStation", () => {
  it("finds campfire boiling process if dirty water is present", () => {
    const inv: Inventory = {
      slots: {
        dirty_water: { qty: 2 },
      },
    };
    const process = findProcessForStation(inv, "campfire");
    expect(process?.id).toBe("boil_water");
  });

  it("finds drying rack berry process if berries are present", () => {
    const inv: Inventory = {
      slots: {
        berries: { qty: 1 },
      },
    };
    const process = findProcessForStation(inv, "drying_rack");
    expect(process?.id).toBe("dry_berries");
  });

  it("returns null if inputs are missing", () => {
    const inv: Inventory = {
      slots: {
        stick: { qty: 1 },
      },
    };
    const process = findProcessForStation(inv, "primitive_work_surface");
    expect(process).toBeNull();
  });
});

describe("validateStationProcesses", () => {
  it("accepts the canonical station process list", () => {
    expect(validateStationProcesses()).toEqual([]);
  });

  it("reports invalid station process references", () => {
    const invalidProcess = {
      id: "bad_process",
      stationId: "campfire",
      inputs: { missing_item: 1, branch: 0 },
      processType: "assemble",
      durationSec: 0,
      outputItemId: "missing_output",
      outputQty: -1,
    } as unknown as StationProcess;

    expect(validateStationProcesses([invalidProcess])).toEqual([
      "station process bad_process uses assemble, which campfire does not accept",
      "station process bad_process references unknown input missing_item",
      "station process bad_process input branch quantity must be positive",
      "station process bad_process references unknown output missing_output",
      "station process bad_process duration must be positive",
      "station process bad_process output quantity must be positive",
    ]);
  });
});

describe("station process runtime", () => {
  const dryingProcess: StationProcess = {
    id: "dry_test",
    stationId: "drying_rack",
    inputs: { raw_meat: 1 },
    processType: "dry",
    durationSec: 10,
    outputItemId: "dried_meat",
    outputQty: 1,
  };

  it("advances normal processes toward completion", () => {
    const runtime = createStationProcessRuntime(dryingProcess, "rack_1");

    const next = tickStationProcessRuntime(runtime, 3, { raining: false });

    expect(next.elapsedSec).toBe(3);
    expect(next.remainingSec).toBe(7);
  });

  it("reverses exposed drying progress while raining", () => {
    const runtime = createStationProcessRuntime(dryingProcess, "rack_1");
    const partlyDry = tickStationProcessRuntime(runtime, 4, { raining: false });

    const rainedOn = tickStationProcessRuntime(partlyDry, 2, { raining: true });

    expect(rainedOn.elapsedSec).toBe(3);
    expect(rainedOn.remainingSec).toBe(7);
  });
});

describe("resolveStationProcessCompletion", () => {
  const process: StationProcess = {
    id: "test_charcoal",
    stationId: "campfire",
    inputs: { branch: 2 },
    processType: "burn",
    durationSec: 5,
    outputItemId: "charcoal",
    outputQty: 1,
  };

  it("deducts inputs, adds output, and reports discovery/knowledge feedback", () => {
    const result = resolveStationProcessCompletion({
      inventory: { slots: { branch: { qty: 3 }, charcoal: { qty: 1 } } },
      process,
    });

    expect(result).toEqual({
      ok: true,
      inventory: { slots: { branch: { qty: 1 }, charcoal: { qty: 2 } } },
      outputItemId: "charcoal",
      outputQty: 1,
      recipeToLearn: "charcoal",
      knowledge: [{ itemId: "branch", trait: "flammable" }],
    });
  });

  it("does not mutate inventory when inputs are missing", () => {
    const inventory: Inventory = { slots: { branch: { qty: 1 } } };

    const result = resolveStationProcessCompletion({ inventory, process });

    expect(result).toEqual({
      ok: false,
      reason: "missing_inputs",
      missing: [{ itemId: "branch", required: 2, have: 1 }],
      inventory,
    });
  });
});
