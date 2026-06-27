import { describe, expect, it } from "vitest";
import { createWound, statusIdsForWound, tickWound, treatWound } from "$lib/domain/injury/wounds";
import { StatusId } from "$lib/domain/systems/status-types";

describe("wound model", () => {
  it("bridges wound severity into readable status ids", () => {
    const wound = createWound({ id: "bite_1", severity: "bite_wound" });

    expect(statusIdsForWound(wound)).toEqual([StatusId.BiteWound, StatusId.Bleeding]);
  });

  it("treatment reduces infection risk and can stop bleeding", () => {
    const wound = createWound({ id: "cut_1", severity: "deep_cut", contamination: 1 });
    const bound = treatWound(wound, "clean_binding").wound;
    const washed = treatWound(bound, "boiled_water_wash").wound;

    expect(bound.bleeding).toBe(false);
    expect(washed.infectionRisk).toBeLessThan(wound.infectionRisk);
  });

  it("crude dressing helps minor cuts without fully solving deeper bleeding", () => {
    const cut = createWound({ id: "cut_1", severity: "cut", contamination: 1 });
    const dressedCut = treatWound(cut, "clean_binding", { itemId: "crude_dressing" }).wound;
    expect(dressedCut.infectionRisk).toBeLessThan(cut.infectionRisk);

    const deepCut = createWound({ id: "deep_1", severity: "deep_cut", contamination: 1 });
    const dressedDeepCut = treatWound(deepCut, "clean_binding", { itemId: "crude_dressing" }).wound;
    expect(dressedDeepCut.bleeding).toBe(true);
  });

  it("clean bandage controls bleeding better than crude dressing", () => {
    const deepCut = createWound({ id: "deep_1", severity: "deep_cut", contamination: 1 });
    const crude = treatWound(deepCut, "clean_binding", { itemId: "crude_dressing" }).wound;
    const clean = treatWound(deepCut, "clean_binding", { itemId: "clean_bandage" }).wound;

    expect(crude.bleeding).toBe(true);
    expect(clean.bleeding).toBe(false);
    expect(clean.infectionRisk).toBeLessThan(crude.infectionRisk);
  });

  it("untreated risky wounds can progress to infection", () => {
    const wound = createWound({ id: "bite_1", severity: "bite_wound", contamination: 1 });
    const progressed = tickWound(wound, 3600, () => 0);

    expect(progressed.infected).toBe(true);
    expect(statusIdsForWound(progressed)).toContain(StatusId.Infected);
  });

  it("treatment lowers progression chance", () => {
    const wound = createWound({ id: "bite_1", severity: "bite_wound", contamination: 1 });
    const treated = treatWound(wound, "boiled_water_wash").wound;
    const untreatedAfter = tickWound(wound, 3600, () => 0.5);
    const treatedAfter = tickWound(treated, 3600, () => 0.5);

    expect(untreatedAfter.infected).toBe(true);
    expect(treatedAfter.infected).toBe(false);
  });
});
