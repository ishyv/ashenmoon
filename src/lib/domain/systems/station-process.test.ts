import { describe, expect, it } from "vitest";
import { findProcessForStation } from "./station-process";
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
