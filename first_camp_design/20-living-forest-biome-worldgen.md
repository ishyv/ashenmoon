# 20 — Living Forest Biome and World Generation

## Goal

For this milestone, Ashenmoon needs one strong forest biome.

Not five weak biomes. One forest that supports survival, crafting, exploration, and early ecology.

The generator should produce a playable space with recognizable zones and resources.

## Forest Must Provide

- water sources
- tree concentrations
- bushes and grass
- useful plants
- loose stones and flint
- clay/mud deposits near water
- animal nests/dens
- feeding zones
- trails/clearings/landmarks

## Forest Design

The forest should feel rough, useful, and dangerous.

It is not a beautiful wallpaper meadow.

It should contain:

```txt
safe-ish areas
resource-rich areas
danger pockets
water edges
animal paths
landmarks for navigation
```

## Worldgen Layers

### 1. Terrain Base

Generate basic terrain zones:

- forest floor
- dense forest
- clearing
- river/pond edge
- mud/clay edge
- rocky patch

### 2. Resource Layer

Place resources based on terrain:

#### Forest Floor

- twigs
- sticks
- leaves
- mushrooms
- herbs
- grass fiber

#### Dense Forest

- bark/oak peel
- branches
- resin
- pine cones/acorns
- more shade plants

#### Clearing

- berries
- grass
- rabbits/deer grazing
- visible landmarks

#### Water Edge

- dirty water
- clay/mud
- river pebbles
- reeds/fiber plants later
- animal drinking paths

#### Rocky Patch

- loose stone
- flint shard
- larger stones

### 3. Ecology Layer

Place animal-related zones:

- rabbit burrows
- deer grazing areas
- boar rooting areas
- wolf den/territory edge
- corpse/scavenger site
- bird flock interest area

### 4. Landmark Layer

Place navigational anchors:

- large fallen tree
- strange old stump
- pond
- clearing
- rocky outcrop
- abandoned fire ring later
- broken marker/old trail later

## Water Sources

Water should matter.

Types:

### River

- moving water
- reliable source
- animal path nearby
- clay/mud along banks
- possible danger due to wolves/boars visiting

### Pond

- stagnant/dirty water
- higher sickness risk
- mushrooms/herbs nearby
- animals drink from it

### Muddy Pool

- low-quality water
- mud/clay source
- insect/disease flavor later

## Resource Distribution Rules

Avoid uniform random sprinkles.

Better:

```txt
resources appear in clusters tied to logic
```

Examples:

- clay near water
- flint/stone in rocky patches
- berries in clearings/edges
- mushrooms in shade/wet areas
- resin near trees
- dry leaves under trees
- animal feeding zones near grass/berries/water

## Clearings

Clearings should matter because the player can see and build there.

Uses:

- camp candidate
- grazing area
- berry patch
- event visibility
- safer navigation

But clearings can also be exposed.

## Camp Spot Logic

The generator should support possible camp spots, not force one.

Good camp spot traits:

- near but not inside water edge
- enough open space
- nearby sticks/leaves/stones
- not directly inside wolf territory
- not too far from useful resources

The player should choose, but worldgen should make viable choices possible.

## Spawn Area

Starting area should contain enough to begin without walking forever:

- sticks/twigs
- leaves/fiber
- stones or flint nearby
- some visible plant food/medicine option
- at least one direction leading toward water
- at least one danger signal not immediately lethal

## Animal Zones

Animals should spawn from or prefer zones, not pure random positions.

Examples:

```txt
rabbit burrow -> rabbits wander/flee nearby
deer grazing zone -> deer wander/graze/flee
boar rooting area -> boar wanders/forages/defends
wolf territory -> wolves patrol/hunt/howl
```

## Events Without Title Cards

Worldgen should create points of interest that can support implicit events:

- bird flock over corpse
- wolves howling near territory
- animal chase across clearing
- rain altering fire/drying logic

## Initial Implementation Strategy

Do not build a perfect procedural forest yet.

Use a hybrid:

```txt
procedural terrain/resource placement
+ authored spawn rules
+ event points
+ debug visualization toggles
```

## Required Debug Tools

- show resource clusters
- show animal zones
- show water sources
- show potential camp spots
- show event points
- show biome tile/zone type

Debug overlays are ugly but useful. Hide them later. Obviously.

## Required Tests

- generated forest always includes at least one reachable water source
- generated spawn area includes starter materials
- clay appears near water, not randomly everywhere
- stones/flint appear in rocky patches
- animal zones spawn with valid terrain
- camp candidate areas do not overlap water/blockers
