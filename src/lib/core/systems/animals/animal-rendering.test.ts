import { describe, expect, it, vi } from "vitest";

vi.mock("pixi.js", () => ({
  AnimatedSprite: class {},
  Assets: { get: vi.fn() },
  Graphics: class {},
  Texture: class {},
}));

import { ANIMAL_RENDER_SPECS } from "$lib/core/systems/animals/animal-rendering";

describe("animal render readability specs", () => {
  it("keeps prey and threats above bare readable world-size floors", () => {
    expect(ANIMAL_RENDER_SPECS.rabbit.heightTiles).toBeGreaterThanOrEqual(0.7);
    expect(ANIMAL_RENDER_SPECS.wolf.heightTiles).toBeGreaterThanOrEqual(1.25);
    expect(ANIMAL_RENDER_SPECS.boar.heightTiles).toBeGreaterThanOrEqual(1.1);
  });

  it("routes current animals to first-party Ashenmoon standees", () => {
    expect(ANIMAL_RENDER_SPECS.rabbit.standeeKey).toBe("rabbit");
    expect(ANIMAL_RENDER_SPECS.deer.standeeKey).toBe("deer");
    expect(ANIMAL_RENDER_SPECS.boar.standeeKey).toBe("boar");
    expect(ANIMAL_RENDER_SPECS.wolf.standeeKey).toBe("wolf");
  });
});
