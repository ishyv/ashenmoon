# 19 — Processing Stations and Camp Structures

## Goal

Camp structures should make the player feel they have a place where survival work happens.

They should not be cosmetic props.

Each structure must answer:

```txt
What problem does this solve?
What interactions does it unlock?
What resources does it require?
What feedback does it give?
```

## Initial Structures

Milestone 2 includes:

- campfire
- drying rack
- primitive work surface
- crude shelter
- marker/sign

## 1. Campfire

### Purpose

Primary survival anchor.

Solves/enables:

- warmth
- light
- cooking
- boiling water
- charcoal/ash production
- animal deterrence
- night survival

### Required Inputs

Possible recipe:

```txt
stone x3 + twigs x4 + dry leaves x2 + branch/firewood x1 -> campfire
```

Implementation can be flexible. Do not let exact item counts block iteration.

### Interactions

- add fuel
- ignite/extinguish
- cook food
- boil water if container exists
- burn wood into charcoal/ash
- warm player nearby
- scare/repel some animals
- risk spreading fire later, not mandatory now

### State

```ts
CampfireState {
  isLit: boolean;
  fuelRemainingMs: number;
  heatRadiusPx: number;
  lightRadiusPx: number;
  wetness?: number;
}
```

### Feedback

- flame animation
- smoke
- crackle sound
- fuel low warning through weaker flame/sound
- rain weakens/extinguishes if uncovered

## 2. Primitive Work Surface

### Purpose

Crafting anchor.

Solves/enables:

- controlled item assembly
- better recipe UI
- crushing/cutting/mixing context
- tool crafting

### Required Inputs

Possible recipe:

```txt
flat stone or log base + branch x2 + fiber/bark binding -> primitive work surface
```

### Interactions

- combine items
- inspect traits
- craft known recipes faster
- experiment with unknown combinations
- process small items by crushing/cutting

### State

```ts
WorkSurfaceState {
  inventorySlots: StationSlot[];
  activeProcess?: CraftingProcessInstance;
}
```

### Feedback

- placed surface visible at camp
- small item placement animation
- scraping/cutting/binding sounds
- output appears physically or in station output slot

## 3. Drying Rack

### Purpose

Time-based processing.

Solves/enables:

- preserve food
- dry herbs
- dry fibers/leaves
- process hide later
- teach that stations can run over time

### Required Inputs

Possible recipe:

```txt
stick/branch x4 + grass fiber x3 -> drying rack
```

### Interactions

- place item on rack
- wait while item dries
- remove dried output
- rain slows/reverses progress if uncovered

### Early Processes

```txt
raw meat -> dried meat
wet fiber -> dry fiber
fresh herb -> dried herb
wet leaves -> dry leaves
hide -> dried hide later
```

### State

```ts
DryingRackState {
  slots: DryingSlot[];
  exposedToRain: boolean;
}
```

## 4. Crude Shelter

### Purpose

Basic safety/rest/weather structure.

Solves/enables:

- reduce cold exposure
- partial rain protection
- rest anchor
- camp identity

### Required Inputs

Possible recipe:

```txt
branch x6 + leaves x8 + grass fiber x4 + bark x2 -> crude shelter
```

### Interactions

- rest/sleep later
- shelter from rain
- reduce cold at night
- protect nearby station slightly if placed close enough later

### State

```ts
ShelterState {
  protectionRadiusPx: number;
  coldResistanceBonus: number;
  rainProtection: number;
}
```

## 5. Marker / Sign

### Purpose

Navigation and player expression.

Solves/enables:

- mark camp
- mark danger
- mark resource zone
- create primitive wayfinding

### Required Inputs

Possible recipe:

```txt
stick + bark/flat wood + charcoal -> marker/sign
```

### Interactions

- place marker
- choose simple symbol/text/icon
- visible on minimap/map later if map exists
- can be inspected

### Feedback

- obvious silhouette
- small label only when near/hovered
- no giant quest marker nonsense

## Structure Placement Rules

Initial simple placement rules:

- must be on valid ground
- cannot overlap blocking objects
- must be near player when placed
- can be picked up only if lightweight/primitive, optional
- structures have simple health/durability later

## Camp Detection

The game can define a camp as a cluster of structures.

First simple rule:

```txt
A camp exists if a campfire and at least one other camp structure are within a radius.
```

Example:

```ts
campAnchorRadiusPx = 220;
```

Camp identity can then unlock:

- rest UI later
- camp status panel
- local storage pile later
- stronger environmental feedback

## Required Tests

- campfire consumes fuel over time
- lit campfire provides heat/light radius
- campfire can process wood into charcoal/ash
- drying rack progresses drying over time
- rain affects drying/campfire if implemented
- work surface enables recipes requiring work surface
- shelter reduces cold/rain exposure in radius
- marker can be placed and inspected
