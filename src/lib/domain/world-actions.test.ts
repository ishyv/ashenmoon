import { describe, expect, it } from "vitest";
import { actionsForCarcass, actionsForPlacedStructure } from "$lib/domain/world-actions";

describe("world action options", () => {
  it("exposes explicit actions for multi-action buildables", () => {
    expect(actionsForPlacedStructure({ buildingId: "sign_1", buildableId: "marker_sign" }).map((a) => a.id))
      .toEqual(["read_sign", "edit_sign"]);
    expect(actionsForPlacedStructure({ buildingId: "pile_1", buildableId: "storage_pile" }).map((a) => a.id))
      .toEqual(["open_storage"]);
    expect(actionsForPlacedStructure({ buildingId: "catcher_1", buildableId: "rain_catcher" }).map((a) => a.id))
      .toEqual(["collect_water"]);
  });

  it("keeps station objects expressible through the same action contract", () => {
    const [action] = actionsForPlacedStructure({ buildingId: "rack_1", buildableId: "meat_smoking_rack" });

    expect(action).toEqual(expect.objectContaining({
      id: "use_station",
      executeIntent: expect.objectContaining({
        kind: "open_station",
        payload: { stationId: "meat_smoking_rack" },
      }),
    }));
  });

  it("exposes explicit unprocessed carcass actions", () => {
    const actions = actionsForCarcass({
      targetId: "carcass_rabbit_1",
      carcass: { speciesId: "rabbit", state: "fresh", ageSec: 0, processedActions: ["remove_hide"] },
    });

    expect(actions.map((action) => action.id)).toEqual(["inspect", "harvest_meat", "extract_bone"]);
    expect(actions.find((action) => action.id === "harvest_meat")).toEqual(expect.objectContaining({
      durationSec: 5,
      executeIntent: {
        kind: "carcass.process",
        targetId: "carcass_rabbit_1",
        payload: { action: "harvest_meat" },
      },
    }));
  });
});
