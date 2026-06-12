import { describe, expect, it } from "vitest";
import { findProcessForStation, validateStationProcesses, type StationProcess } from "./station-process";
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
