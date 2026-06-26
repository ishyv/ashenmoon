import { getAshenmoonItemIconKeyForItemId } from "$lib/core/assets/ashenmoon-assets";
import type {
  AshenmoonActorKey,
  AshenmoonBiomeKey,
  AshenmoonCarcassKey,
  AshenmoonCreatureKey,
  AshenmoonGatherableKey,
  AshenmoonItemIconKey,
  AshenmoonLandmarkKey,
  AshenmoonPropKey,
  AshenmoonStructureKey,
  AshenmoonVfxKey,
} from "$lib/core/assets/ashenmoon-assets";

export type AshenmoonCoverageStatus = "asset" | "deferred";

export interface AshenmoonAssetCoverage<Key extends string = string> {
  readonly status: AshenmoonCoverageStatus;
  readonly tier: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  readonly key?: Key;
  readonly fallback?: "external-pack" | "generic-ashenmoon" | "not-wired";
  readonly reason: string;
}

export const ASHENMOON_CREATURE_COVERAGE = {
  rabbit: { status: "asset", tier: 1, key: "rabbit", reason: "alpha wildlife standee exists" },
  deer: { status: "asset", tier: 1, key: "deer", reason: "alpha wildlife standee exists" },
  boar: { status: "asset", tier: 1, key: "boar", reason: "alpha wildlife standee exists" },
  wolf: { status: "asset", tier: 1, key: "wolf", reason: "alpha predator standee exists" },
  veilmoth: { status: "deferred", tier: 3, fallback: "not-wired", reason: "Whispering Woods swarm threat is future canon" },
  caveLurker: { status: "deferred", tier: 4, fallback: "not-wired", reason: "Deep Mines creature is future canon" },
  oreGolem: { status: "deferred", tier: 4, fallback: "not-wired", reason: "Deep Mines hazard creature is future canon" },
} as const satisfies Record<AshenmoonCreatureKey, AshenmoonAssetCoverage<AshenmoonActorKey>>;

export const ASHENMOON_GATHERABLE_RENDER_COVERAGE = {
  tree: { status: "asset", tier: 1, key: "tree", reason: "alpha tree standee exists" },
  tree_crimson: { status: "asset", tier: 3, key: "treeCrimson", reason: "first-party crimson ash tree variant exists" },
  tree_frost: { status: "asset", tier: 3, key: "treeFrost", reason: "first-party frost pine tree variant exists" },
  tree_fungal: { status: "asset", tier: 3, key: "treeFungal", reason: "first-party spore mangrove tree variant exists" },
  rock: { status: "asset", tier: 1, key: "rock", reason: "alpha rock node exists" },
  rock_copper: { status: "asset", tier: 3, key: "rockCopper", reason: "first-party copper ore rock node exists" },
  rock_iron: { status: "asset", tier: 3, key: "rockIron", reason: "first-party iron ore rock node exists" },
  rock_toxic: { status: "asset", tier: 3, key: "rockToxic", reason: "first-party toxic ore rock node exists" },
  wood_pickup: { status: "asset", tier: 1, key: "stickPickup", reason: "starter timber pickup exists" },
  stone_pickup: { status: "asset", tier: 1, key: "stonePickup", reason: "starter stone pickup exists" },
  flint_pickup: { status: "asset", tier: 1, key: "flintPickup", reason: "starter flint pickup exists" },
  forage: { status: "asset", tier: 1, key: "grassPatch", reason: "starter forage fallback exists" },
  berry_bush: { status: "asset", tier: 1, key: "berryBush", reason: "starter food node exists" },
  grass_patch: { status: "asset", tier: 1, key: "grassPatch", reason: "starter fiber node exists" },
  mushroom_patch: { status: "asset", tier: 1, key: "mushroomPatch", reason: "starter mushroom node exists" },
  moss: { status: "asset", tier: 1, key: "mossPatch", reason: "starter moss node exists" },
  reeds: { status: "asset", tier: 1, key: "reeds", reason: "pond/water source visual exists" },
  rock_small: { status: "asset", tier: 1, key: "stonePickup", reason: "small stone/flint/clay adapter has Ashenmoon fallbacks" },
  rock_cursed: { status: "deferred", tier: 3, fallback: "external-pack", reason: "cursed land prop is not in alpha tier" },
  rock_cursed2: { status: "deferred", tier: 3, fallback: "external-pack", reason: "cursed land prop is not in alpha tier" },
  rock_cursed3: { status: "deferred", tier: 3, fallback: "external-pack", reason: "cursed land prop is not in alpha tier" },
} as const satisfies Record<string, AshenmoonAssetCoverage<AshenmoonGatherableKey>>;

export const ASHENMOON_STRUCTURE_COVERAGE = {
  campfire: { status: "asset", tier: 1, key: "campfire", reason: "lit and cold firepit art exists" },
  primitive_work_surface: { status: "asset", tier: 1, key: "primitiveWorkSurface", reason: "Tier 1 station asset exists and is pending contact-sheet review" },
  drying_rack: { status: "asset", tier: 1, key: "dryingRack", reason: "Tier 1 station asset exists and is pending contact-sheet review" },
  storage_pile: { status: "asset", tier: 2, key: "storagePile", reason: "camp storage asset exists for alpha camp expansion" },
  crude_shelter: { status: "asset", tier: 2, key: "crudeShelter", reason: "camp shelter asset exists for alpha camp expansion" },
  marker_sign: { status: "asset", tier: 2, key: "markerSign", reason: "camp navigation marker asset exists" },
  spike_barrier: { status: "asset", tier: 2, key: "spikeBarrier", reason: "camp defense asset exists" },
  rain_catcher: { status: "asset", tier: 2, key: "rainCatcher", reason: "water utility structure asset exists" },
  meat_smoking_rack: { status: "asset", tier: 2, key: "meatSmokingRack", reason: "food preservation station asset exists" },
  simple_bedroll: { status: "asset", tier: 2, key: "simpleBedroll", reason: "rest structure asset exists" },
  wall: { status: "deferred", tier: 5, key: "wall", fallback: "external-pack", reason: "settlement/outpost legacy structure" },
  house1: { status: "deferred", tier: 5, key: "legacyHouse", fallback: "external-pack", reason: "settlement/outpost legacy structure" },
  house2: { status: "deferred", tier: 5, key: "legacyHouse", fallback: "external-pack", reason: "settlement/outpost legacy structure" },
  house3: { status: "deferred", tier: 5, key: "legacyHouse", fallback: "external-pack", reason: "settlement/outpost legacy structure" },
  lean_to: { status: "deferred", tier: 2, key: "crudeShelter", fallback: "external-pack", reason: "camp shelter variant" },
  tower: { status: "deferred", tier: 5, key: "legacyTower", fallback: "external-pack", reason: "settlement/outpost legacy structure" },
  barracks: { status: "deferred", tier: 5, key: "legacyBarracks", fallback: "external-pack", reason: "settlement/outpost legacy structure" },
} as const satisfies Record<string, AshenmoonAssetCoverage<AshenmoonStructureKey>>;

export const ASHENMOON_LANDMARK_COVERAGE = {
  burned_cart: { status: "asset", tier: 1, key: "burnedCart", reason: "first-party burned cart landmark exists and is runtime-wired" },
  ruined_watch_post: { status: "asset", tier: 1, key: "ruinedWatchPost", reason: "first-party ruined watch post landmark exists and is runtime-wired" },
  wolf_den: { status: "asset", tier: 1, key: "wolfDen", reason: "first-party wolf den danger landmark exists and is runtime-wired" },
  old_road: { status: "asset", tier: 1, key: "oldRoad", reason: "first-party old road terrain landmark exists and is runtime-wired" },
  fallen_tree: { status: "asset", tier: 1, key: "fallenTree", reason: "first-party fallen tree landmark exists and is runtime-wired" },
  old_stump: { status: "asset", tier: 1, key: "oldStump", reason: "first-party old stump landmark exists and is runtime-wired" },
  pond: { status: "asset", tier: 1, key: "darkPond", reason: "first-party dark pond landmark exists and is runtime-wired" },
  huge_dead_tree: { status: "asset", tier: 1, key: "hugeDeadTree", reason: "first-party huge dead tree landmark exists and is runtime-wired" },
  river_crossing: { status: "asset", tier: 3, key: "riverCrossing", reason: "first-party river crossing landmark exists for woods expansion" },
  deer_grazing_area: { status: "asset", tier: 3, key: "deerGrazingArea", reason: "first-party deer grazing area landmark exists for woods expansion" },
  sentry_chest: { status: "asset", tier: 1, key: "sentryChest", reason: "lootable sentry chest landmark exists" },
  skeleton_remains: { status: "asset", tier: 1, key: "skeletonRemains", reason: "lootable skeleton remains landmark exists" },
  cursed_monolith: { status: "asset", tier: 1, key: "cursedMonolith", reason: "cursed altar landmark exists" },
  bone_pile: { status: "asset", tier: 1, key: "bonePile", reason: "wolves bone pile landmark exists" },
} as const satisfies Record<string, AshenmoonAssetCoverage<AshenmoonLandmarkKey>>;

export const ASHENMOON_CARCASS_COVERAGE = {
  rabbit: { status: "asset", tier: 1, key: "rabbitFresh", reason: "Tier 1 carcass state set exists and is pending in-game review" },
  deer: { status: "asset", tier: 1, key: "deerFresh", reason: "Tier 1 carcass state set exists and is pending in-game review" },
  boar: { status: "asset", tier: 1, key: "boarFresh", reason: "Tier 1 carcass state set exists and is pending in-game review" },
  wolf: { status: "asset", tier: 1, key: "wolfFresh", reason: "Tier 1 carcass state set exists and is pending in-game review" },
} as const satisfies Record<string, AshenmoonAssetCoverage<AshenmoonCarcassKey>>;

export const ASHENMOON_BIOME_COVERAGE = {
  meadows: { status: "deferred", tier: 1, key: "meadows", fallback: "external-pack", reason: "terrain still uses pack tiles" },
  crimsonGrove: { status: "deferred", tier: 3, key: "crimsonGrove", fallback: "external-pack", reason: "Whispering Woods expansion biome" },
  fungalMire: { status: "deferred", tier: 3, key: "fungalMire", fallback: "external-pack", reason: "Whispering Woods expansion biome" },
  frostbane: { status: "deferred", tier: 3, key: "frostbane", fallback: "external-pack", reason: "Whispering Woods expansion biome" },
  scorchedWastes: { status: "deferred", tier: 3, key: "scorchedWastes", fallback: "external-pack", reason: "Whispering Woods expansion biome" },
  deepMines: { status: "deferred", tier: 4, key: "deepMines", fallback: "not-wired", reason: "Deep Mines future zone" },
  walledSettlement: { status: "deferred", tier: 5, key: "walledSettlement", fallback: "not-wired", reason: "settlement future zone" },
  crucibleInterior: { status: "deferred", tier: 5, key: "crucibleInterior", fallback: "not-wired", reason: "Crucible future zone" },
} as const satisfies Record<AshenmoonBiomeKey, AshenmoonAssetCoverage<AshenmoonBiomeKey>>;

export const ASHENMOON_VFX_COVERAGE = {
  slashArc: { status: "asset", tier: 1, key: "slashArc", reason: "first-party symbolic slash arc exists; procedural runtime may still draw arcs for animation" },
  hitFlash: { status: "asset", tier: 1, key: "hitFlash", reason: "first-party hit flash token exists for contact/UI/runtime reuse" },
  fire: { status: "asset", tier: 1, key: "fire", reason: "firepit lit and fire burst assets exist" },
  smoke: { status: "asset", tier: 1, key: "smoke", reason: "first-party smoke wisp token exists for station/fire treatment" },
  weatherRain: { status: "asset", tier: 3, key: "weatherRain", reason: "first-party rain streak token exists for weather polish" },
  weatherFog: { status: "asset", tier: 3, key: "weatherFog", reason: "first-party fog wisp token exists for weather polish" },
  essencePocket: { status: "asset", tier: 4, key: "essencePocket", reason: "first-party Deep Mines essence pocket token exists" },
  greyingFlash: { status: "asset", tier: 4, key: "greyingFlash", reason: "first-party Greying flash token exists" },
  stationProcess: { status: "asset", tier: 1, key: "stationProcess", reason: "first-party station process loop token exists" },
  discoveryPing: { status: "asset", tier: 1, key: "discoveryPing", reason: "first-party discovery ping token exists" },
} as const satisfies Record<AshenmoonVfxKey, AshenmoonAssetCoverage<AshenmoonVfxKey>>;

export function getAshenmoonItemIconCoverage(itemId: string): AshenmoonAssetCoverage<AshenmoonItemIconKey> {
  const firstPartyKey = getAshenmoonItemIconKeyForItemId(itemId);
  if (firstPartyKey) {
    return { status: "asset", tier: 1, key: firstPartyKey, reason: "covered by current first-party item icon set" };
  }
  if (itemId.startsWith("blueprint_")) {
    return { status: "deferred", tier: 2, fallback: "generic-ashenmoon", reason: "blueprint page icon family not produced yet" };
  }
  if (itemId.endsWith("_kit") || itemId === "simple_bedroll") {
    return { status: "deferred", tier: 2, fallback: "generic-ashenmoon", reason: "structure kit icon family not produced yet" };
  }
  if (itemId.includes("meat") || itemId.includes("hide") || itemId.includes("pelt") || itemId.includes("bone") || itemId === "tendon" || itemId === "fang" || itemId === "tusk_shard") {
    return { status: "deferred", tier: 1, fallback: "generic-ashenmoon", reason: "carcass and food icon family not produced yet" };
  }
  if (itemId.includes("axe") || itemId.includes("pickaxe") || itemId.includes("knife") || itemId.includes("spear") || itemId.includes("torch") || itemId.includes("hook") || itemId.includes("needle") || itemId.includes("blade")) {
    return { status: "deferred", tier: 1, fallback: "generic-ashenmoon", reason: "tool and weapon icon family not produced yet" };
  }
  if (itemId.includes("wrap") || itemId.includes("cloak") || itemId.includes("gloves") || itemId.includes("footwraps")) {
    return { status: "deferred", tier: 2, fallback: "generic-ashenmoon", reason: "clothing icon family not produced yet" };
  }
  if (itemId.includes("medicine") || itemId.includes("poultice") || itemId.includes("bandage") || itemId.includes("splint") || itemId.includes("tonic") || itemId.includes("dressing")) {
    return { status: "deferred", tier: 2, fallback: "generic-ashenmoon", reason: "medicine icon family not produced yet" };
  }
  if (itemId.includes("ore") || itemId.includes("ingot") || itemId.includes("silver") || itemId.includes("copper") || itemId.includes("iron")) {
    return { status: "deferred", tier: 3, fallback: "generic-ashenmoon", reason: "ore and metal icon family not produced yet" };
  }
  return { status: "deferred", tier: 6, fallback: "generic-ashenmoon", reason: "catalog item awaits tiered production batch" };
}
