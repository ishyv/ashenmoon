import { describe, expect, it } from "vitest";
import { applyMudCoat, rootSoil } from "./ecosystem-impact";

describe("wallowing and rooting", () => {
  it("applies correct mud coat buffs based on biome cell type", () => {
    // Meadows = 0 -> standard mud
    const mud = applyMudCoat(0);
    expect(mud.type).toBe("mud");
    expect(mud.armorBonus).toBe(2);
    expect(mud.fireResistBonus).toBe(0);

    // FungalMire = 3 -> toxic sludge
    const toxic = applyMudCoat(3);
    expect(toxic.type).toBe("toxic_sludge");
    expect(toxic.armorBonus).toBe(1);
    expect(toxic.fireResistBonus).toBe(-0.2);

    // ScorchedWastes = 1 -> volcanic ash
    const volcanic = applyMudCoat(1);
    expect(volcanic.type).toBe("volcanic_ash");
    expect(volcanic.armorBonus).toBe(3);
    expect(volcanic.fireResistBonus).toBe(0.8);
  });

  it("roots meadows grass into dirt camp cells with a chance", () => {
    // Meadows = 0
    const resSuccess = rootSoil(0, () => 0.1);
    expect(resSuccess.cellChange).toBe(true);
    expect(resSuccess.newCell).toBe(6); // Camp = 6 (renders as dirt)

    const resFail = rootSoil(0, () => 0.9);
    expect(resFail.cellChange).toBe(false);

    // Other biomes don't root
    const resOther = rootSoil(1, () => 0.1);
    expect(resOther.cellChange).toBe(false);
  });
});
