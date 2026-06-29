import { AnimatedSprite, Assets, Sprite, Texture } from "pixi.js";
import type { AnimState } from "$lib/core/types";
import type { PlayerAnimationClipId } from "$lib/domain/animation/player-animation";
import { resolveWorldVisualScale } from "$lib/domain/visual/world-visual-size";

const BASE = "/assets/ashenmoon";

export type AshenmoonActorKey = "player" | "vane" | "wolf" | "deer" | "boar" | "rabbit";
export type AshenmoonCreatureKey =
  | "rabbit"
  | "deer"
  | "boar"
  | "wolf"
  | "veilmoth"
  | "caveLurker"
  | "oreGolem";
export type AshenmoonPropKey =
  | "firepitCold"
  | "firepitLit"
  | "brokenWagon"
  | "supplyScraps"
  | "ashRing"
  | "trampledPath";
export type AshenmoonGatherableKey =
  | "tree"
  | "treeCrimson"
  | "treeFrost"
  | "treeFungal"
  | "rock"
  | "rockCopper"
  | "rockIron"
  | "rockToxic"
  | "clay"
  | "berryBush"
  | "grassPatch"
  | "mossPatch"
  | "mushroomPatch"
  | "reeds"
  | "stickPickup"
  | "stonePickup"
  | "flintPickup"
  | "barkPickup"
  | "cursedRock1"
  | "cursedRock2"
  | "cursedRock3";
export type AshenmoonItemIconKey =
  | "water"
  | "stick"
  | "stone"
  | "flint"
  | "fiber"
  | "redHerb"
  | "bark"
  | "berries"
  | "mushroom"
  | "clay"
  | "rawMeat"
  | "rawSmallMeat"
  | "rawLargeMeat"
  | "spoiledMeat"
  | "rottenMeat"
  | "cookedMeat"
  | "driedMeat"
  | "smokedMeat"
  | "animalFat"
  | "rabbitPelt"
  | "deerHide"
  | "boarHide"
  | "wolfPelt"
  | "driedHide"
  | "curedHide"
  | "smallBone"
  | "bone"
  | "boneShard"
  | "tendon"
  | "driedTendon"
  | "fang"
  | "tuskShard"
  | "boneBroth"
  | "starterPickaxe"
  | "starterAxe"
  | "stonePickaxe"
  | "stoneAxe"
  | "flintPickaxe"
  | "flintAxe"
  | "copperPickaxe"
  | "copperAxe"
  | "ironPickaxe"
  | "ironAxe"
  | "crudeKnife"
  | "stoneBlade"
  | "boneNeedle"
  | "boneHook"
  | "woodenSpear"
  | "hardenedSpear"
  | "crudeTorch"
  | "campfireKit"
  | "primitiveWorkSurfaceKit"
  | "dryingRackKit"
  | "markerSignKit"
  | "crudeShelterKit"
  | "storagePileKit"
  | "spikeBarrierKit"
  | "rainCatcherKit"
  | "meatSmokingRackKit"
  | "simpleBedroll"
  | "dirtyWater"
  | "cleanWater"
  | "boiledWater"
  | "weakMedicine"
  | "bitterTonic"
  | "tanninBrew"
  | "ashPaste"
  | "herbPoultice"
  | "yarrowPoultice"
  | "crudePoultice"
  | "cleanBandage"
  | "crudeDressing"
  | "crudeSplint"
  | "wood"
  | "branch"
  | "twigBundle"
  | "leaves"
  | "dryLeaves"
  | "greenLeaves"
  | "oakBark"
  | "vine"
  | "hardenedClay"
  | "ash"
  | "copperOre"
  | "tinderBundle"
  | "firewoodBundle"
  | "bindingCord"
  | "barkRope"
  | "sealingPaste"
  | "ironOre"
  | "silverOre"
  | "stoneBlock"
  | "copperIngot"
  | "ironIngot"
  | "silverIngot"
  | "plank"
  | "iceBlock"
  | "charcoal"
  | "volatileAsh"
  | "flatStone"
  | "resin"
  | "pineCone"
  | "rawHide"
  | "spoiledHide"
  | "antler"
  | "feather"
  | "soot"
  | "foulSludge"
  | "charredAsh"
  | "fattyMeat"
  | "bitterMushroom"
  | "acorn"
  | "wildRoot"
  | "roastedRoot"
  | "roastedAcorn"
  | "moss"
  | "wildHerb"
  | "yarrow"
  | "plantainLeaf"
  | "bitterRoot"
  | "nettle"
  | "driedHerb"
  | "ghostLily"
  | "debugPanacea"
  | "blueprintPage"
  | "blueprintRecipe"
  | "blueprintMethod"
  | "fiberWraps"
  | "hideFootwraps"
  | "leatherGloves"
  | "hideCloak"
  | "furLinedWrap";
export type AshenmoonUiKey = "panelPaper" | "inkSeparator" | "interactionFrame" | "tokenShadow";
export type AshenmoonStructureKey =
  | "campfire"
  | "primitiveWorkSurface"
  | "dryingRack"
  | "storagePile"
  | "crudeShelter"
  | "markerSign"
  | "spikeBarrier"
  | "rainCatcher"
  | "meatSmokingRack"
  | "simpleBedroll"
  | "wall"
  | "legacyHouse"
  | "legacyTower"
  | "legacyBarracks"
  | "leanTo";
export type AshenmoonLandmarkKey =
  | "burnedCart"
  | "ruinedWatchPost"
  | "wolfDen"
  | "oldRoad"
  | "fallenTree"
  | "oldStump"
  | "darkPond"
  | "hugeDeadTree"
  | "riverCrossing"
  | "deerGrazingArea"
  | "sentryChest"
  | "skeletonRemains"
  | "cursedMonolith"
  | "bonePile";
export type AshenmoonCarcassKey =
  | "rabbitFresh"
  | "rabbitProcessed"
  | "rabbitSpoiling"
  | "rabbitRotten"
  | "deerFresh"
  | "deerProcessed"
  | "deerSpoiling"
  | "deerRotten"
  | "boarFresh"
  | "boarProcessed"
  | "boarSpoiling"
  | "boarRotten"
  | "wolfFresh"
  | "wolfProcessed"
  | "wolfSpoiling"
  | "wolfRotten";
export type AshenmoonVfxKey =
  | "slashArc"
  | "hitFlash"
  | "fire"
  | "smoke"
  | "weatherRain"
  | "weatherFog"
  | "essencePocket"
  | "greyingFlash"
  | "stationProcess"
  | "discoveryPing";
export type AshenmoonBiomeKey =
  | "meadows"
  | "crimsonGrove"
  | "fungalMire"
  | "frostbane"
  | "scorchedWastes"
  | "deepMines"
  | "walledSettlement"
  | "crucibleInterior";

export const ASHENMOON_ACTOR_PATHS = {
  player: `${BASE}/actors/player-survivor.svg`,
  vane: `${BASE}/actors/vane-standee.svg`,
  wolf: `${BASE}/actors/wolf-threat.svg`,
  deer: `${BASE}/actors/deer-standee.svg`,
  boar: `${BASE}/actors/boar-standee.svg`,
  rabbit: `${BASE}/actors/rabbit-standee.svg`,
} as const satisfies Record<AshenmoonActorKey, string>;

export const ASHENMOON_PLAYER_ANIMATION_PATHS = {
  idle: [`${BASE}/actors/player/player-idle.svg`],
  walk: [
    `${BASE}/actors/player/player-walk-1.svg`,
    `${BASE}/actors/player/player-walk-2.svg`,
    `${BASE}/actors/player/player-walk-3.svg`,
  ],
  run: [
    `${BASE}/actors/player/player-run-1.svg`,
    `${BASE}/actors/player/player-run-2.svg`,
    `${BASE}/actors/player/player-run-3.svg`,
  ],
  exhausted_walk: [
    `${BASE}/actors/player/player-exhausted-walk-1.svg`,
    `${BASE}/actors/player/player-exhausted-walk-2.svg`,
  ],
  injured_walk: [
    `${BASE}/actors/player/player-injured-walk-1.svg`,
    `${BASE}/actors/player/player-injured-walk-2.svg`,
  ],
  encumbered_walk: [
    `${BASE}/actors/player/player-encumbered-walk-1.svg`,
    `${BASE}/actors/player/player-encumbered-walk-2.svg`,
  ],
  wet_walk: [
    `${BASE}/actors/player/player-wet-walk-1.svg`,
    `${BASE}/actors/player/player-wet-walk-2.svg`,
  ],
  strained_run: [
    `${BASE}/actors/player/player-strained-run-1.svg`,
    `${BASE}/actors/player/player-strained-run-2.svg`,
  ],
  encumbered_run: [
    `${BASE}/actors/player/player-encumbered-walk-1.svg`,
    `${BASE}/actors/player/player-strained-run-1.svg`,
    `${BASE}/actors/player/player-encumbered-walk-2.svg`,
  ],
  gather_bush_hands: [
    `${BASE}/actors/player/player-gather-bush-hands-1.svg`,
    `${BASE}/actors/player/player-gather-bush-hands-2.svg`,
  ],
  gather_tree_hands: [
    `${BASE}/actors/player/player-gather-tree-hands-1.svg`,
    `${BASE}/actors/player/player-gather-tree-hands-2.svg`,
  ],
  gather_tree_axe: [
    `${BASE}/actors/player/player-gather-axe-1.svg`,
    `${BASE}/actors/player/player-gather-axe-2.svg`,
  ],
  gather_ore_bad_tool: [
    `${BASE}/actors/player/player-gather-pickaxe-1.svg`,
    `${BASE}/actors/player/player-gather-pickaxe-2.svg`,
  ],
  gather_ore_pick: [
    `${BASE}/actors/player/player-gather-pickaxe-1.svg`,
    `${BASE}/actors/player/player-gather-pickaxe-2.svg`,
  ],
  gather_clay_hands: [
    `${BASE}/actors/player/player-gather-scavenge-1.svg`,
    `${BASE}/actors/player/player-gather-scavenge-2.svg`,
  ],
  gather_water_container: [
    `${BASE}/actors/player/player-gather-scavenge-1.svg`,
    `${BASE}/actors/player/player-gather-scavenge-2.svg`,
  ],
} as const satisfies Partial<Record<PlayerAnimationClipId, readonly string[]>>;

export const ASHENMOON_PROP_PATHS = {
  firepitCold: `${BASE}/camp/firepit-cold.svg`,
  firepitLit: `${BASE}/camp/firepit-lit.svg`,
  brokenWagon: `${BASE}/camp/broken-wagon.svg`,
  supplyScraps: `${BASE}/camp/supply-scraps.svg`,
  ashRing: `${BASE}/camp/ash-ring.svg`,
  trampledPath: `${BASE}/camp/trampled-path.svg`,
} as const satisfies Record<AshenmoonPropKey, string>;

export const ASHENMOON_GATHERABLE_PATHS = {
  tree: `${BASE}/world/tree-dead.svg`,
  treeCrimson: `${BASE}/world/tree-crimson.svg`,
  treeFrost: `${BASE}/world/tree-frost.svg`,
  treeFungal: `${BASE}/world/tree-fungal.svg`,
  rock: `${BASE}/world/rock-node.svg`,
  rockCopper: `${BASE}/world/rock-copper.svg`,
  rockIron: `${BASE}/world/rock-iron.svg`,
  rockToxic: `${BASE}/world/rock-toxic.svg`,
  clay: `${BASE}/world/clay-deposit.svg`,
  berryBush: `${BASE}/world/berry-bush.svg`,
  grassPatch: `${BASE}/world/grass-patch.svg`,
  mossPatch: `${BASE}/world/moss-patch.svg`,
  mushroomPatch: `${BASE}/world/mushroom-patch.svg`,
  reeds: `${BASE}/world/reeds-pond.svg`,
  stickPickup: `${BASE}/world/stick-pickup.svg`,
  stonePickup: `${BASE}/world/stone-pickup.svg`,
  flintPickup: `${BASE}/world/flint-pickup.svg`,
  barkPickup: `${BASE}/world/bark-pickup.svg`,
  cursedRock1: `${BASE}/world/cursed-rock-1.svg`,
  cursedRock2: `${BASE}/world/cursed-rock-2.svg`,
  cursedRock3: `${BASE}/world/cursed-rock-3.svg`,
} as const satisfies Record<AshenmoonGatherableKey, string>;

export const ASHENMOON_ITEM_ICON_PATHS = {
  water: `${BASE}/items/water.svg`,
  stick: `${BASE}/items/stick.svg`,
  stone: `${BASE}/items/stone.svg`,
  flint: `${BASE}/items/flint.svg`,
  fiber: `${BASE}/items/fiber.svg`,
  bark: `${BASE}/items/bark.svg`,
  berries: `${BASE}/items/berries.svg`,
  mushroom: `${BASE}/items/mushroom.svg`,
  clay: `${BASE}/items/clay.svg`,
  rawMeat: `${BASE}/items/raw-meat.svg`,
  rawSmallMeat: `${BASE}/items/raw-small-meat.svg`,
  rawLargeMeat: `${BASE}/items/raw-large-meat.svg`,
  spoiledMeat: `${BASE}/items/spoiled-meat.svg`,
  rottenMeat: `${BASE}/items/rotten-meat.svg`,
  cookedMeat: `${BASE}/items/cooked-meat.svg`,
  driedMeat: `${BASE}/items/dried-meat.svg`,
  smokedMeat: `${BASE}/items/smoked-meat.svg`,
  animalFat: `${BASE}/items/animal-fat.svg`,
  rabbitPelt: `${BASE}/items/rabbit-pelt.svg`,
  deerHide: `${BASE}/items/deer-hide.svg`,
  boarHide: `${BASE}/items/boar-hide.svg`,
  wolfPelt: `${BASE}/items/wolf-pelt.svg`,
  driedHide: `${BASE}/items/dried-hide.svg`,
  curedHide: `${BASE}/items/cured-hide.svg`,
  smallBone: `${BASE}/items/small-bone.svg`,
  bone: `${BASE}/items/bone.svg`,
  boneShard: `${BASE}/items/bone-shard.svg`,
  tendon: `${BASE}/items/tendon.svg`,
  driedTendon: `${BASE}/items/dried-tendon.svg`,
  fang: `${BASE}/items/fang.svg`,
  tuskShard: `${BASE}/items/tusk-shard.svg`,
  boneBroth: `${BASE}/items/bone-broth.svg`,
  starterPickaxe: `${BASE}/items/starter-pickaxe.svg`,
  starterAxe: `${BASE}/items/starter-axe.svg`,
  stonePickaxe: `${BASE}/items/stone-pickaxe.svg`,
  stoneAxe: `${BASE}/items/stone-axe.svg`,
  flintPickaxe: `${BASE}/items/flint-pickaxe.svg`,
  flintAxe: `${BASE}/items/flint-axe.svg`,
  copperPickaxe: `${BASE}/items/copper-pickaxe.svg`,
  copperAxe: `${BASE}/items/copper-axe.svg`,
  ironPickaxe: `${BASE}/items/iron-pickaxe.svg`,
  ironAxe: `${BASE}/items/iron-axe.svg`,
  crudeKnife: `${BASE}/items/crude-knife.svg`,
  stoneBlade: `${BASE}/items/stone-blade.svg`,
  boneNeedle: `${BASE}/items/bone-needle.svg`,
  boneHook: `${BASE}/items/bone-hook.svg`,
  woodenSpear: `${BASE}/items/wooden-spear.svg`,
  hardenedSpear: `${BASE}/items/hardened-spear.svg`,
  crudeTorch: `${BASE}/items/crude-torch.svg`,
  campfireKit: `${BASE}/items/campfire-kit.svg`,
  primitiveWorkSurfaceKit: `${BASE}/items/primitive-work-surface-kit.svg`,
  dryingRackKit: `${BASE}/items/drying-rack-kit.svg`,
  markerSignKit: `${BASE}/items/marker-sign-kit.svg`,
  crudeShelterKit: `${BASE}/items/crude-shelter-kit.svg`,
  storagePileKit: `${BASE}/items/storage-pile-kit.svg`,
  spikeBarrierKit: `${BASE}/items/spike-barrier-kit.svg`,
  rainCatcherKit: `${BASE}/items/rain-catcher-kit.svg`,
  meatSmokingRackKit: `${BASE}/items/meat-smoking-rack-kit.svg`,
  simpleBedroll: `${BASE}/items/simple-bedroll.svg`,
  dirtyWater: `${BASE}/items/dirty-water.svg`,
  cleanWater: `${BASE}/items/clean-water.svg`,
  boiledWater: `${BASE}/items/boiled-water.svg`,
  weakMedicine: `${BASE}/items/weak-medicine.svg`,
  bitterTonic: `${BASE}/items/bitter-tonic.svg`,
  tanninBrew: `${BASE}/items/tannin-brew.svg`,
  ashPaste: `${BASE}/items/ash-paste.svg`,
  herbPoultice: `${BASE}/items/herb-poultice.svg`,
  yarrowPoultice: `${BASE}/items/yarrow-poultice.svg`,
  crudePoultice: `${BASE}/items/crude-poultice.svg`,
  cleanBandage: `${BASE}/items/clean-bandage.svg`,
  crudeDressing: `${BASE}/items/crude-dressing.svg`,
  crudeSplint: `${BASE}/items/crude-splint.svg`,
  wood: `${BASE}/items/wood.svg`,
  branch: `${BASE}/items/branch.svg`,
  twigBundle: `${BASE}/items/twig-bundle.svg`,
  leaves: `${BASE}/items/leaves.svg`,
  dryLeaves: `${BASE}/items/dry-leaves.svg`,
  greenLeaves: `${BASE}/items/green-leaves.svg`,
  oakBark: `${BASE}/items/oak-bark.svg`,
  vine: `${BASE}/items/vine.svg`,
  hardenedClay: `${BASE}/items/hardened-clay.svg`,
  ash: `${BASE}/items/ash.svg`,
  copperOre: `${BASE}/items/copper-ore.svg`,
  tinderBundle: `${BASE}/items/tinder-bundle.svg`,
  firewoodBundle: `${BASE}/items/firewood-bundle.svg`,
  bindingCord: `${BASE}/items/binding-cord.svg`,
  barkRope: `${BASE}/items/bark-rope.svg`,
  sealingPaste: `${BASE}/items/sealing-paste.svg`,
  ironOre: `${BASE}/items/iron-ore.svg`,
  silverOre: `${BASE}/items/silver-ore.svg`,
  stoneBlock: `${BASE}/items/stone-block.svg`,
  copperIngot: `${BASE}/items/copper-ingot.svg`,
  ironIngot: `${BASE}/items/iron-ingot.svg`,
  silverIngot: `${BASE}/items/silver-ingot.svg`,
  plank: `${BASE}/items/plank.svg`,
  iceBlock: `${BASE}/items/ice-block.svg`,
  charcoal: `${BASE}/items/charcoal.svg`,
  volatileAsh: `${BASE}/items/volatile-ash.svg`,
  flatStone: `${BASE}/items/flat-stone.svg`,
  resin: `${BASE}/items/resin.svg`,
  pineCone: `${BASE}/items/pine-cone.svg`,
  rawHide: `${BASE}/items/raw-hide.svg`,
  spoiledHide: `${BASE}/items/spoiled-hide.svg`,
  antler: `${BASE}/items/antler.svg`,
  feather: `${BASE}/items/feather.svg`,
  soot: `${BASE}/items/soot.svg`,
  foulSludge: `${BASE}/items/foul-sludge.svg`,
  charredAsh: `${BASE}/items/charred-ash.svg`,
  fattyMeat: `${BASE}/items/fatty-meat.svg`,
  bitterMushroom: `${BASE}/items/bitter-mushroom.svg`,
  acorn: `${BASE}/items/acorn.svg`,
  wildRoot: `${BASE}/items/wild-root.svg`,
  roastedRoot: `${BASE}/items/roasted-root.svg`,
  roastedAcorn: `${BASE}/items/roasted-acorn.svg`,
  moss: `${BASE}/items/moss.svg`,
  wildHerb: `${BASE}/items/wild-herb.svg`,
  redHerb: `${BASE}/items/red-herb.svg`,
  yarrow: `${BASE}/items/yarrow.svg`,
  plantainLeaf: `${BASE}/items/plantain-leaf.svg`,
  bitterRoot: `${BASE}/items/bitter-root.svg`,
  nettle: `${BASE}/items/nettle.svg`,
  driedHerb: `${BASE}/items/dried-herb.svg`,
  ghostLily: `${BASE}/items/ghost-lily.svg`,
  debugPanacea: `${BASE}/items/debug-panacea.svg`,
  blueprintPage: `${BASE}/items/blueprint-page.svg`,
  blueprintRecipe: `${BASE}/items/blueprint-recipe.svg`,
  blueprintMethod: `${BASE}/items/blueprint-method.svg`,
  fiberWraps: `${BASE}/items/fiber-wraps.svg`,
  hideFootwraps: `${BASE}/items/hide-footwraps.svg`,
  leatherGloves: `${BASE}/items/leather-gloves.svg`,
  hideCloak: `${BASE}/items/hide-cloak.svg`,
  furLinedWrap: `${BASE}/items/fur-lined-wrap.svg`,
} as const satisfies Record<AshenmoonItemIconKey, string>;

export const ASHENMOON_UI_PATHS = {
  panelPaper: `${BASE}/ui/panel-paper.svg`,
  inkSeparator: `${BASE}/ui/ink-separator.svg`,
  interactionFrame: `${BASE}/ui/interaction-frame.svg`,
  tokenShadow: `${BASE}/ui/token-shadow.svg`,
} as const satisfies Record<AshenmoonUiKey, string>;

export const ASHENMOON_STRUCTURE_PATHS = {
  campfire: `${BASE}/camp/firepit-lit.svg`,
  primitiveWorkSurface: `${BASE}/structures/primitive-work-surface.svg`,
  dryingRack: `${BASE}/structures/drying-rack.svg`,
  storagePile: `${BASE}/structures/storage-pile.svg`,
  crudeShelter: `${BASE}/structures/crude-shelter.svg`,
  markerSign: `${BASE}/structures/marker-sign.svg`,
  spikeBarrier: `${BASE}/structures/spike-barrier.svg`,
  rainCatcher: `${BASE}/structures/rain-catcher.svg`,
  meatSmokingRack: `${BASE}/structures/meat-smoking-rack.svg`,
  simpleBedroll: `${BASE}/structures/simple-bedroll.svg`,
  wall: `${BASE}/structures/wall.svg`,
  legacyHouse: `${BASE}/structures/legacy-house.svg`,
  legacyTower: `${BASE}/structures/legacy-tower.svg`,
  legacyBarracks: `${BASE}/structures/legacy-barracks.svg`,
  leanTo: `${BASE}/structures/lean-to.svg`,
} as const satisfies Partial<Record<AshenmoonStructureKey, string>>;

export const ASHENMOON_LANDMARK_PATHS = {
  burnedCart: `${BASE}/landmarks/burned-cart.svg`,
  ruinedWatchPost: `${BASE}/landmarks/ruined-watch-post.svg`,
  wolfDen: `${BASE}/landmarks/wolf-den.svg`,
  oldRoad: `${BASE}/landmarks/old-road.svg`,
  fallenTree: `${BASE}/landmarks/fallen-tree.svg`,
  oldStump: `${BASE}/landmarks/old-stump.svg`,
  darkPond: `${BASE}/landmarks/dark-pond.svg`,
  hugeDeadTree: `${BASE}/landmarks/huge-dead-tree.svg`,
  riverCrossing: `${BASE}/landmarks/river-crossing.svg`,
  deerGrazingArea: `${BASE}/landmarks/deer-grazing-area.svg`,
  sentryChest: `${BASE}/landmarks/sentry-chest.svg`,
  skeletonRemains: `${BASE}/landmarks/skeleton-remains.svg`,
  cursedMonolith: `${BASE}/landmarks/cursed-monolith.svg`,
  bonePile: `${BASE}/landmarks/bone-pile.svg`,
} as const satisfies Record<AshenmoonLandmarkKey, string>;

export const ASHENMOON_CARCASS_PATHS = {
  rabbitFresh: `${BASE}/carcasses/rabbit-carcass-fresh.svg`,
  rabbitProcessed: `${BASE}/carcasses/rabbit-carcass-processed.svg`,
  rabbitSpoiling: `${BASE}/carcasses/rabbit-carcass-spoiling.svg`,
  rabbitRotten: `${BASE}/carcasses/rabbit-carcass-rotten.svg`,
  deerFresh: `${BASE}/carcasses/deer-carcass-fresh.svg`,
  deerProcessed: `${BASE}/carcasses/deer-carcass-processed.svg`,
  deerSpoiling: `${BASE}/carcasses/deer-carcass-spoiling.svg`,
  deerRotten: `${BASE}/carcasses/deer-carcass-rotten.svg`,
  boarFresh: `${BASE}/carcasses/boar-carcass-fresh.svg`,
  boarProcessed: `${BASE}/carcasses/boar-carcass-processed.svg`,
  boarSpoiling: `${BASE}/carcasses/boar-carcass-spoiling.svg`,
  boarRotten: `${BASE}/carcasses/boar-carcass-rotten.svg`,
  wolfFresh: `${BASE}/carcasses/wolf-carcass-fresh.svg`,
  wolfProcessed: `${BASE}/carcasses/wolf-carcass-processed.svg`,
  wolfSpoiling: `${BASE}/carcasses/wolf-carcass-spoiling.svg`,
  wolfRotten: `${BASE}/carcasses/wolf-carcass-rotten.svg`,
} as const satisfies Record<AshenmoonCarcassKey, string>;

export const ASHENMOON_VFX_PATHS = {
  slashArc: `${BASE}/vfx/slash-arc.svg`,
  hitFlash: `${BASE}/vfx/hit-flash.svg`,
  fire: `${BASE}/vfx/fire-burst.svg`,
  smoke: `${BASE}/vfx/smoke-wisp.svg`,
  weatherRain: `${BASE}/vfx/rain-streak.svg`,
  weatherFog: `${BASE}/vfx/fog-wisp.svg`,
  essencePocket: `${BASE}/vfx/essence-pocket.svg`,
  greyingFlash: `${BASE}/vfx/greying-flash.svg`,
  stationProcess: `${BASE}/vfx/station-process.svg`,
  discoveryPing: `${BASE}/vfx/discovery-ping.svg`,
} as const satisfies Record<AshenmoonVfxKey, string>;

export type AshenmoonStructureRuntimeKey = keyof typeof ASHENMOON_STRUCTURE_PATHS;

export const ASHENMOON_STRUCTURE_BY_BUILDING_TYPE = {
  wall: "wall",
  house1: "legacyHouse",
  house2: "legacyHouse",
  house3: "legacyHouse",
  tower: "legacyTower",
  barracks: "legacyBarracks",
  campfire: "campfire",
  primitive_work_surface: "primitiveWorkSurface",
  drying_rack: "dryingRack",
  storage_pile: "storagePile",
  crude_shelter: "crudeShelter",
  marker_sign: "markerSign",
  spike_barrier: "spikeBarrier",
  rain_catcher: "rainCatcher",
  meat_smoking_rack: "meatSmokingRack",
  simple_bedroll: "simpleBedroll",
  lean_to: "leanTo",
} as const satisfies Record<string, AshenmoonStructureRuntimeKey>;

export function getAshenmoonStructureKeyForBuildingType(buildingType: string): AshenmoonStructureRuntimeKey | null {
  const mapping: Readonly<Record<string, AshenmoonStructureRuntimeKey>> = ASHENMOON_STRUCTURE_BY_BUILDING_TYPE;
  return mapping[buildingType] ?? null;
}

export function getAshenmoonItemIconKeyForItemId(itemId: string): AshenmoonItemIconKey | null {
  if (itemId.startsWith("blueprint_")) {
    if (itemId.includes("method") || itemId.includes("dry_") || itemId.includes("make_")) return "blueprintMethod";
    if (itemId.includes("recipe") || itemId.includes("cook") || itemId.includes("medicine") || itemId.includes("poultice") || itemId.includes("broth") || itemId.includes("tonic")) return "blueprintRecipe";
    return "blueprintPage";
  }
  switch (itemId) {
    case "dirty_water": return "dirtyWater";
    case "clean_water": return "cleanWater";
    case "boiled_water": return "boiledWater";
    case "water_skin": return "water";
    case "stick": return "stick";
    case "wood": return "wood";
    case "branch": return "branch";
    case "stone": return "stone";
    case "flint_shard": return "flint";
    case "grass_fiber":
    case "grass_cord": return "fiber";
    case "bark": return "bark";
    case "berries":
    case "dried_berries": return "berries";
    case "mushroom": return "mushroom";
    case "clay":
    case "mud": return "clay";
    case "raw_meat": return "rawMeat";
    case "raw_small_meat": return "rawSmallMeat";
    case "raw_large_meat": return "rawLargeMeat";
    case "spoiled_meat": return "spoiledMeat";
    case "rotten_meat": return "rottenMeat";
    case "cooked_meat": return "cookedMeat";
    case "dried_meat": return "driedMeat";
    case "smoked_meat": return "smokedMeat";
    case "animal_fat": return "animalFat";
    case "rabbit_pelt": return "rabbitPelt";
    case "deer_hide": return "deerHide";
    case "boar_hide": return "boarHide";
    case "wolf_pelt": return "wolfPelt";
    case "dried_hide": return "driedHide";
    case "cured_hide": return "curedHide";
    case "small_bone": return "smallBone";
    case "bone": return "bone";
    case "bone_shard": return "boneShard";
    case "tendon": return "tendon";
    case "dried_tendon": return "driedTendon";
    case "fang": return "fang";
    case "tusk_shard": return "tuskShard";
    case "bone_broth": return "boneBroth";
    case "starter_pickaxe": return "starterPickaxe";
    case "starter_axe": return "starterAxe";
    case "stone_pickaxe": return "stonePickaxe";
    case "stone_axe": return "stoneAxe";
    case "flint_pickaxe": return "flintPickaxe";
    case "flint_axe": return "flintAxe";
    case "copper_pickaxe": return "copperPickaxe";
    case "copper_axe": return "copperAxe";
    case "iron_pickaxe": return "ironPickaxe";
    case "iron_axe": return "ironAxe";
    case "crude_knife": return "crudeKnife";
    case "stone_blade": return "stoneBlade";
    case "bone_needle": return "boneNeedle";
    case "bone_hook": return "boneHook";
    case "wooden_spear": return "woodenSpear";
    case "hardened_spear": return "hardenedSpear";
    case "crude_torch": return "crudeTorch";
    case "campfire_kit": return "campfireKit";
    case "primitive_work_surface_kit": return "primitiveWorkSurfaceKit";
    case "drying_rack_kit": return "dryingRackKit";
    case "marker_sign_kit": return "markerSignKit";
    case "crude_shelter_kit": return "crudeShelterKit";
    case "storage_pile_kit": return "storagePileKit";
    case "spike_barrier_kit": return "spikeBarrierKit";
    case "rain_catcher_kit": return "rainCatcherKit";
    case "meat_smoking_rack_kit": return "meatSmokingRackKit";
    case "simple_bedroll": return "simpleBedroll";
    case "weak_medicine": return "weakMedicine";
    case "bitter_tonic": return "bitterTonic";
    case "tannin_brew": return "tanninBrew";
    case "ash_paste": return "ashPaste";
    case "herb_poultice": return "herbPoultice";
    case "yarrow_poultice": return "yarrowPoultice";
    case "crude_poultice": return "crudePoultice";
    case "clean_bandage": return "cleanBandage";
    case "crude_dressing": return "crudeDressing";
    case "crude_splint": return "crudeSplint";
    case "fiber_wraps": return "fiberWraps";
    case "hide_footwraps": return "hideFootwraps";
    case "leather_gloves": return "leatherGloves";
    case "hide_cloak": return "hideCloak";
    case "fur_lined_wrap": return "furLinedWrap";
    case "twig_bundle": return "twigBundle";
    case "leaves": return "leaves";
    case "dry_leaves": return "dryLeaves";
    case "green_leaves": return "greenLeaves";
    case "oak_bark": return "oakBark";
    case "vine": return "vine";
    case "hardened_clay": return "hardenedClay";
    case "ash": return "ash";
    case "copper_ore": return "copperOre";
    case "tinder_bundle": return "tinderBundle";
    case "firewood_bundle": return "firewoodBundle";
    case "damp_firewood": return "firewoodBundle";
    case "binding_cord": return "bindingCord";
    case "bark_rope": return "barkRope";
    case "sealing_paste": return "sealingPaste";
    case "iron_ore": return "ironOre";
    case "silver_ore": return "silverOre";
    case "stone_block": return "stoneBlock";
    case "copper_ingot": return "copperIngot";
    case "iron_ingot": return "ironIngot";
    case "silver_ingot": return "silverIngot";
    case "plank": return "plank";
    case "ice_block": return "iceBlock";
    case "charcoal": return "charcoal";
    case "volatile_ash": return "volatileAsh";
    case "flat_stone": return "flatStone";
    case "resin": return "resin";
    case "pine_cone": return "pineCone";
    case "raw_hide": return "rawHide";
    case "spoiled_hide": return "spoiledHide";
    case "antler": return "antler";
    case "feather": return "feather";
    case "soot": return "soot";
    case "foul_sludge": return "foulSludge";
    case "charred_ash": return "charredAsh";
    case "fatty_meat": return "fattyMeat";
    case "bitter_mushroom": return "bitterMushroom";
    case "acorn": return "acorn";
    case "wild_root": return "wildRoot";
    case "roasted_root": return "roastedRoot";
    case "roasted_acorn": return "roastedAcorn";
    case "moss": return "moss";
    case "wild_herb": return "wildHerb";
    case "red_herb": return "redHerb";
    case "yarrow": return "yarrow";
    case "plantain_leaf": return "plantainLeaf";
    case "bitter_root": return "bitterRoot";
    case "nettle": return "nettle";
    case "dried_herb": return "driedHerb";
    case "ghost_lily": return "ghostLily";
    case "debug_panacea": return "debugPanacea";
    default: return null;
  }
}

export const BUNDLE_ASHENMOON_FIRST_CAMP = Array.from(new Set([
  ...Object.values(ASHENMOON_ACTOR_PATHS),
  ...Object.values(ASHENMOON_PLAYER_ANIMATION_PATHS).flat(),
  ...Object.values(ASHENMOON_PROP_PATHS),
  ...Object.values(ASHENMOON_GATHERABLE_PATHS),
  ...Object.values(ASHENMOON_ITEM_ICON_PATHS),
  ...Object.values(ASHENMOON_UI_PATHS),
  ...Object.values(ASHENMOON_STRUCTURE_PATHS),
  ...Object.values(ASHENMOON_LANDMARK_PATHS),
  ...Object.values(ASHENMOON_CARCASS_PATHS),
  ...Object.values(ASHENMOON_VFX_PATHS),
]));

function requireLoadedTexture(path: string): Texture {
  const texture = Assets.get<Texture>(path);
  if (!texture) throw new Error(`Ashenmoon asset not loaded: ${path}`);
  return texture;
}

export function getAshenmoonActorTexture(key: AshenmoonActorKey): Texture {
  return requireLoadedTexture(ASHENMOON_ACTOR_PATHS[key]);
}

export function getAshenmoonPlayerAnimationFramePaths(state: AnimState | PlayerAnimationClipId | "idle" = "idle"): readonly string[] | null {
  const playerAnimationPaths: Partial<Record<PlayerAnimationClipId, readonly string[]>> = ASHENMOON_PLAYER_ANIMATION_PATHS;
  const clipPaths = playerAnimationPaths[state as PlayerAnimationClipId];
  if (clipPaths) return clipPaths;
  if (state === "gather" || state === "gather_tired") return ASHENMOON_PLAYER_ANIMATION_PATHS.gather_bush_hands;
  if (state === "attack") return ASHENMOON_PLAYER_ANIMATION_PATHS.idle;
  return null;
}

export function getAshenmoonActorFrames(key: AshenmoonActorKey, state: AnimState | PlayerAnimationClipId | "idle" = "idle"): Texture[] {
  if (key === "player") {
    const paths = getAshenmoonPlayerAnimationFramePaths(state);
    if (paths) return paths.map(requireLoadedTexture);
  }

  const base = getAshenmoonActorTexture(key);
  // Action readability is handled through runtime transforms/overlays; never swap
  // the player to another character's standee just to fake an attack frame.
  return state === "run" || state === "walk" ? [base, base, base] : [base, base];
}

export function getAshenmoonPropTexture(key: AshenmoonPropKey): Texture {
  return requireLoadedTexture(ASHENMOON_PROP_PATHS[key]);
}

export function getAshenmoonGatherableTexture(key: AshenmoonGatherableKey): Texture {
  return requireLoadedTexture(ASHENMOON_GATHERABLE_PATHS[key]);
}

export function getAshenmoonItemIconTexture(key: AshenmoonItemIconKey): Texture {
  return requireLoadedTexture(ASHENMOON_ITEM_ICON_PATHS[key]);
}

export function getAshenmoonUiTexture(key: AshenmoonUiKey): Texture {
  return requireLoadedTexture(ASHENMOON_UI_PATHS[key]);
}

export function getAshenmoonStructureTexture(key: keyof typeof ASHENMOON_STRUCTURE_PATHS): Texture {
  return requireLoadedTexture(ASHENMOON_STRUCTURE_PATHS[key]);
}

type AshenmoonLandmarkRuntimeKey = keyof typeof ASHENMOON_LANDMARK_PATHS;

const ASHENMOON_LANDMARK_BY_KIND = {
  burned_cart: "burnedCart",
  ruined_watch_post: "ruinedWatchPost",
  wolf_den: "wolfDen",
  old_road: "oldRoad",
  fallen_tree: "fallenTree",
  old_stump: "oldStump",
  pond: "darkPond",
  huge_dead_tree: "hugeDeadTree",
  river_crossing: "riverCrossing",
  deer_grazing_area: "deerGrazingArea",
  sentry_chest: "sentryChest",
  skeleton_remains: "skeletonRemains",
  cursed_monolith: "cursedMonolith",
  bone_pile: "bonePile",
} as const satisfies Record<string, AshenmoonLandmarkRuntimeKey>;

export function getAshenmoonLandmarkKeyForKind(kind: string): AshenmoonLandmarkRuntimeKey | null {
  const mapping: Readonly<Record<string, AshenmoonLandmarkRuntimeKey>> = ASHENMOON_LANDMARK_BY_KIND;
  return mapping[kind] ?? null;
}

export function getAshenmoonLandmarkTexture(key: AshenmoonLandmarkRuntimeKey): Texture {
  return requireLoadedTexture(ASHENMOON_LANDMARK_PATHS[key]);
}

export function getAshenmoonVfxTexture(key: AshenmoonVfxKey): Texture {
  return requireLoadedTexture(ASHENMOON_VFX_PATHS[key]);
}

type AshenmoonCarcassSpecies = "rabbit" | "deer" | "boar" | "wolf";
type AshenmoonCarcassState = "fresh" | "processed" | "spoiling" | "rotten";

export function getAshenmoonCarcassKey(speciesId: AshenmoonCarcassSpecies, state: AshenmoonCarcassState): AshenmoonCarcassKey {
  const prefix = speciesId;
  const suffix = state.charAt(0).toUpperCase() + state.slice(1);
  return `${prefix}${suffix}` as AshenmoonCarcassKey;
}

export function getAshenmoonCarcassTexture(speciesId: AshenmoonCarcassSpecies, state: AshenmoonCarcassState): Texture {
  return requireLoadedTexture(ASHENMOON_CARCASS_PATHS[getAshenmoonCarcassKey(speciesId, state)]);
}

export function createStandeeShadow(scale = 1): Sprite {
  const shadow = new Sprite(getAshenmoonUiTexture("tokenShadow"));
  shadow.anchor.set(0.5);
  shadow.scale.set(scale);
  shadow.alpha = 0.62;
  return shadow;
}

export function createActorStandee(key: AshenmoonActorKey, heightPx: number): AnimatedSprite {
  const sprite = new AnimatedSprite(getAshenmoonActorFrames(key));
  sprite.anchor.set(0.5, 1);
  const scale = resolveWorldVisualScale({
    spec: { heightTiles: heightPx / 64 },
    texture: sprite.texture,
    tilePx: 64,
  });
  sprite.scale.set(scale.x, scale.y);
  sprite.animationSpeed = 0.08;
  sprite.play();
  return sprite;
}

export function getAshenmoonTextureByKey(key: string): Texture | null {
  if (key in ASHENMOON_ITEM_ICON_PATHS) {
    return getAshenmoonItemIconTexture(key as any);
  }
  if (key in ASHENMOON_UI_PATHS) {
    return getAshenmoonUiTexture(key as any);
  }
  try {
    return Assets.get<Texture>(key) ?? null;
  } catch {
    return null;
  }
}
