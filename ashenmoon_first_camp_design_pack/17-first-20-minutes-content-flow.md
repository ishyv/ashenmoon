# 17 — First 10–20 Minutes Content Flow

## Goal

Make the first 10–20 minutes of Ashenmoon playable, readable, and interesting.

The player should have enough pressure to act, enough affordances to experiment, and enough feedback to understand that the world has systems behind it.

## High-Level Flow

```txt
Wake / enter forest
  ↓
Notice thirst, cold risk, no tools
  ↓
Gather simple resources by hand
  ↓
Find water source or food signs
  ↓
Discover raw water / food risks
  ↓
Make campfire or work toward fire
  ↓
Build primitive work surface / camp anchor
  ↓
Process materials
  ↓
Craft useful item
  ↓
Encounter animal behavior / event
  ↓
Prepare for first night
```

## Beat 1 — Disorientation

The player begins with little or nothing.

Immediate available interactions:

- pick up sticks/twigs
- pick up loose stones
- pick leaves/fiber
- inspect berries/mushrooms/herbs
- interact with water source if nearby
- see trees, bushes, grass, stones, and animal signs

Do not overload the player with tutorial panels.

The world should imply:

```txt
You need water.
You need warmth.
You need tools.
This place has material.
This place has danger.
```

## Beat 2 — First Gathering

Early gathering should produce small, practical resources:

- twigs
- stick
- branch
- dry leaves
- grass fiber
- loose stone
- flint shard
- bark/oak peel
- berries
- mushroom
- wild herb
- clay/mud near water

Every gathered thing should have at least one obvious or eventual use.

No decorative junk piles pretending to be content.

## Beat 3 — Water Problem

The player should find a water source such as:

- river
- pond
- muddy pool

Possible interactions:

- drink directly
- collect if container exists
- inspect water

Direct drinking should restore thirst but risk sickness.

The game should remember/teach this through consequences:

```txt
You drank dirty water.
You later felt sick.
Dirty water is now known to be risky.
```

## Beat 4 — Fire Problem

Fire should be one of the first camp anchors.

Fire solves or enables:

- warmth at night
- boiling water
- cooking food
- charcoal/ash creation
- drying/processing support
- animal deterrence

Fire needs fuel.

Suggested simple rule:

```txt
campfire requires starter + fuel + ignition condition/tool
```

Possible starter materials:

- dry leaves
- bark fibers
- grass fiber
- twigs

Fuel:

- sticks
- branches
- firewood bundle

Ignition options can start simple for development. Do not block the entire milestone behind an overcomplicated fire-starting simulation.

## Beat 5 — First Camp Anchor

The first camp should need at least one placed structure.

Minimum meaningful camp:

- campfire
- primitive work surface

Better first camp:

- campfire
- primitive work surface
- drying rack or crude shelter
- marker/sign

The player should feel:

```txt
This is where I return.
This is where I process things.
This is where I survive the night.
```

## Beat 6 — Crafting Discovery

The player experiments with materials.

Key rules:

- unknown recipes can still succeed
- discovered recipes become shortcuts in UI
- crafting outputs should produce visual/audio feedback
- failed or partial mixes should still teach something when possible

Examples:

```txt
stick + flint + fiber -> crude knife
herb + boiled water -> weak medicine
mud + ash -> sealing paste
clay + heat -> hardened clay
wood + fire -> charcoal + ash
```

## Beat 7 — First Ecology Moment

The player should see at least one world behavior without a title card.

Examples:

- rabbits flee from player
- deer flee from player
- boar ignores player until threatened or approached
- wolves howl nearby before being seen
- wolves chase prey
- bird flock circles a corpse or berry area
- animal attacks another animal

This moment teaches:

```txt
The forest is not just resources.
```

## Beat 8 — First Night

Night pressure should be simple:

- colder
- darker
- fire matters
- visibility matters

Do not add elaborate supernatural events yet unless they are purely atmospheric.

The first night should ask:

```txt
Did you make a fire?
Did you find a camp spot?
Can you see?
Can you stay warm?
```

## Example 20-Minute Run

```txt
0:00 — Player starts in forest.
1:00 — Picks sticks, leaves, stones, berries.
3:00 — Finds water; drinks dirty water or learns it looks unsafe.
5:00 — Finds flint/bark/fiber.
7:00 — Makes campfire or starts gathering for it.
9:00 — Builds primitive work surface.
11:00 — Experiments: crude knife, boiled water, weak medicine, charcoal/ash.
13:00 — Spots rabbits/deer fleeing or boar grazing.
15:00 — Hears wolf howl or sees birds near corpse/berries.
17:00 — Rain or dusk begins changing priorities.
20:00 — Player has small camp, basic knowledge, and a reason to continue.
```

## Failure Modes to Avoid

- Player spends 10 minutes only picking up disconnected items.
- Crafting feels like menu math.
- World generation produces grass wallpaper with no survival logic.
- Animals only exist as enemies that run at the player.
- Night is only a color filter.
- Camp structures are cosmetic and do not solve problems.
