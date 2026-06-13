import { describe, expect, it } from "vitest";
import { findProcessableItem, resolveProcessingCompletion } from "./processing-system";
import type { Inventory } from "./inventory-system";
import { ITEM_DEFINITIONS } from "$lib/domain/items";
import { getStationDefinition } from "$lib/domain/stations";

describe("Processing System", () => {
  describe("findProcessableItem", () => {
    it("finds dirty water at a campfire", () => {
      const inv: Inventory = { slots: { dirty_water: { qty: 5 } } };
      const station = getStationDefinition("campfire")!;
      const result = findProcessableItem(inv, station);

      expect(result).not.toBeNull();
      expect(result?.itemId).toBe("dirty_water");
      expect(result?.durationSec).toBe(4);
      expect(result?.effect.kind).toBe("transform");
    });

    it("returns null if no processable items are present", () => {
      const inv: Inventory = { slots: { stone: { qty: 10 } } };
      const station = getStationDefinition("campfire")!;
      const result = findProcessableItem(inv, station);

      expect(result).toBeNull();
    });

    it("returns null if the station temperature is too low", () => {
      const inv: Inventory = { slots: { dirty_water: { qty: 5 } } };
      const station = { ...getStationDefinition("campfire")!, heatOutput: 20 };
      const result = findProcessableItem(inv, station);

      expect(result).toBeNull();
    });
  });

  describe("resolveProcessingCompletion", () => {
    it("transforms one unit of the source item", () => {
      const inv: Inventory = { slots: { dirty_water: { qty: 5 } } };
      const effect = ITEM_DEFINITIONS.dirty_water!.traits.find((t) => t.kind === "boilable")!
        .effect;

      const next = resolveProcessingCompletion(inv, "dirty_water", effect, 1);

      expect(next.slots.dirty_water).toEqual({ qty: 4 });
      expect(next.slots.clean_water).toEqual({ qty: 1 });
    });

    it("handles chance-based processing results", () => {
      const inv: Inventory = { slots: { dirty_water: { qty: 5 } } };
      const effect = {
        kind: "chance" as const,
        probability: 0.5,
        effect: { kind: "destroy" as const },
      };

      // Roll success (destroyed)
      const destroyed = resolveProcessingCompletion(inv, "dirty_water", effect, 1, () => 0.1);
      expect(destroyed.slots.dirty_water).toEqual({ qty: 4 });

      // Roll failure (preserved)
      const preserved = resolveProcessingCompletion(inv, "dirty_water", effect, 1, () => 0.9);
      expect(preserved.slots.dirty_water).toEqual({ qty: 5 });
    });
  });
});
