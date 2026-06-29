import { Category, type ItemDefinition, type ItemVisualProperties } from "./item-types";

const DEFAULT_VISUALS_BY_CARRY = {
  pocket: { ground: { heightTiles: 0.28 }, equipped: { heightTiles: 0.42 } },
  pack: { ground: { heightTiles: 0.42 }, equipped: { heightTiles: 0.56 } },
  haul: { ground: { heightTiles: 0.85 }, equipped: { heightTiles: 1.05 } },
} as const satisfies Record<ItemDefinition["physical"]["carryClass"], ItemVisualProperties>;

function categoryFallback(def: ItemDefinition): ItemVisualProperties | undefined {
  switch (def.category) {
    case Category.Weapon:
      return { ground: { heightTiles: 0.95 }, equipped: { heightTiles: 1.15 } };
    case Category.Tool:
      return { ground: { heightTiles: 0.72 }, equipped: { heightTiles: 0.95 } };
    case Category.Food:
      return { ground: { heightTiles: 0.38 }, equipped: { heightTiles: 0.46 } };
    default:
      return undefined;
  }
}

export function resolveItemVisuals(def: ItemDefinition | undefined): Required<ItemVisualProperties> {
  const base = def ? DEFAULT_VISUALS_BY_CARRY[def.physical.carryClass] : DEFAULT_VISUALS_BY_CARRY.pack;
  const category = def ? categoryFallback(def) : undefined;
  return {
    ground: {
      ...base.ground,
      ...category?.ground,
      ...def?.visual?.ground,
    },
    equipped: {
      ...base.equipped,
      ...category?.equipped,
      ...def?.visual?.equipped,
    },
  };
}
