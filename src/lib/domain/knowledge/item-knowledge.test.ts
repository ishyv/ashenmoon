import { describe, expect, it } from "vitest";
import {
  deserializeKnowledge,
  discoverableProperties,
  EMPTY_KNOWLEDGE,
  hasLearned,
  inspectItem,
  knownProperties,
  learn,
  serializeKnowledge,
} from "./item-knowledge";
import { propertiesFromConsume, propertyFromReaction } from "./knowledge-unlock";
import { ITEM_DEFINITIONS } from "$lib/domain/items/item-definitions";

describe("learn / query", () => {
  it("records and reports learned properties immutably", () => {
    const k1 = learn(EMPTY_KNOWLEDGE, "dirty_water", "edible");
    expect(hasLearned(k1, "dirty_water", "edible")).toBe(true);
    expect(hasLearned(k1, "dirty_water", "toxicity")).toBe(false);
    expect(EMPTY_KNOWLEDGE.dirty_water).toBeUndefined(); // original untouched

    const k2 = learn(k1, "dirty_water", "toxicity");
    expect([...knownProperties(k2, "dirty_water")].sort()).toEqual(["edible", "toxicity"]);
  });

  it("returns the same store when nothing new is learned", () => {
    const k1 = learn(EMPTY_KNOWLEDGE, "dirty_water", "edible");
    expect(learn(k1, "dirty_water", "edible")).toBe(k1);
  });
});

describe("discoverableProperties", () => {
  it("derives facts from traits (dirty water: edible, thirst, toxic, boilable)", () => {
    expect(discoverableProperties(ITEM_DEFINITIONS.dirty_water!).sort()).toEqual(
      ["boilable", "edible", "thirst_value", "toxicity"].sort(),
    );
  });

  it("flags clean water as edible + hydrating but not toxic", () => {
    const props = discoverableProperties(ITEM_DEFINITIONS.clean_water!);
    expect(props).toContain("edible");
    expect(props).toContain("thirst_value");
    expect(props).not.toContain("toxicity");
  });

  it("marks oak wood flammable and ghost lily perishable", () => {
    expect(discoverableProperties(ITEM_DEFINITIONS.oak_wood!)).toContain("flammable");
    expect(discoverableProperties(ITEM_DEFINITIONS.ghost_lily!)).toContain("perishable");
  });
});

describe("inspectItem", () => {
  it("partitions discoverable facts into known and unknown", () => {
    const knowledge = learn(EMPTY_KNOWLEDGE, "dirty_water", "edible", "thirst_value");
    const view = inspectItem(ITEM_DEFINITIONS.dirty_water!, knowledge);
    expect(view.known.sort()).toEqual(["edible", "thirst_value"]);
    expect(view.unknown.sort()).toEqual(["boilable", "toxicity"]);
  });
});

describe("unlock rules", () => {
  it("consuming teaches edible, plus thirst/toxicity from experience", () => {
    expect(propertiesFromConsume({ harmed: false, restoredThirst: true })).toEqual(["edible", "thirst_value"]);
    expect(propertiesFromConsume({ harmed: true, restoredThirst: true })).toEqual(["edible", "thirst_value", "toxicity"]);
  });

  it("reactions teach the matching property", () => {
    expect(propertyFromReaction("flammable")).toBe("flammable");
    expect(propertyFromReaction("decay")).toBe("perishable");
    expect(propertyFromReaction("temperature")).toBe("heat_sensitive");
  });
});

describe("serialization round-trip", () => {
  it("survives serialize -> deserialize", () => {
    const k = learn(learn(EMPTY_KNOWLEDGE, "dirty_water", "edible", "toxicity"), "oak_wood", "flammable");
    const snap = serializeKnowledge(k);
    expect(snap).toEqual({ dirty_water: ["edible", "toxicity"], oak_wood: ["flammable"] });

    const restored = deserializeKnowledge(snap);
    expect(hasLearned(restored, "dirty_water", "toxicity")).toBe(true);
    expect(hasLearned(restored, "oak_wood", "flammable")).toBe(true);
  });
});
