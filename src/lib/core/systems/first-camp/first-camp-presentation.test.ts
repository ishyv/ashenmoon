import { describe, expect, it } from "vitest";
import { createFirstCampPresentationState, initFirstCampPresentation, updateFirstCampPresentation } from "./first-camp-presentation";
import type { MapResource } from "$lib/core/systems/map/map";

function mapWithPond(): Pick<MapResource, "forestMetadata"> {
  return {
    forestMetadata: {
      waterSources: [{ kind: "pond", x: 10, y: 10, radiusTiles: 3 }],
      resourceClusters: [],
      animalZones: [],
      landmarks: [],
      campCandidates: [],
      eventPoints: [],
    },
  };
}

describe("first camp presentation", () => {
  it("emits the cold firepit bark once on init", () => {
    const state = createFirstCampPresentationState();
    const barks: string[] = [];

    initFirstCampPresentation({
      map: mapWithPond() as MapResource,
      playerTile: { x: 0, y: 0 },
      state,
      emitBark: (id) => barks.push(id),
      emitOmen: () => undefined,
    });
    initFirstCampPresentation({
      map: mapWithPond() as MapResource,
      playerTile: { x: 0, y: 0 },
      state,
      emitBark: (id) => barks.push(id),
      emitOmen: () => undefined,
    });

    expect(barks).toEqual(["cold_firepit"]);
  });

  it("emits a pond bark near water and gates the omen behind first-loop progress", () => {
    const state = createFirstCampPresentationState();
    const barks: string[] = [];
    let omens = 0;

    updateFirstCampPresentation({
      map: mapWithPond() as MapResource,
      playerTile: { x: 10, y: 10 },
      state,
      emitBark: (id) => barks.push(id),
      emitOmen: () => omens++,
    });
    expect(barks).toEqual(["first_pond"]);
    expect(omens).toBe(0);

    state.cleanWaterDrunk = true;
    state.campfireWoken = true;
    updateFirstCampPresentation({
      map: mapWithPond() as MapResource,
      playerTile: { x: 10, y: 10 },
      state,
      emitBark: (id) => barks.push(id),
      emitOmen: () => omens++,
    });
    updateFirstCampPresentation({
      map: mapWithPond() as MapResource,
      playerTile: { x: 10, y: 10 },
      state,
      emitBark: (id) => barks.push(id),
      emitOmen: () => omens++,
    });

    expect(barks).toEqual(["first_pond"]);
    expect(omens).toBe(1);
  });
});
