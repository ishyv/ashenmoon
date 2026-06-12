# 21 — Forest Ecology and Creatures

## Goal

The forest should feel somewhat alive without building an overcomplicated simulation.

Milestone 2 creatures:

- rabbits
- deer
- boars
- wolves

These are enough to create prey, neutral danger, predator danger, and visible ecology.

## Creature Design Rule

Animals are not just enemies.

They should have simple needs and behavior:

- wander
- flee
- eat
- rest/sleep according to behavior
- attack if hungry or threatened
- avoid fire
- fight each other when species logic says so

Do not implement smell/sound investigation yet. It is a good future system, but too much right now.

## Behavior Model

Use simple behavior states:

```ts
AnimalBehaviorState =
  | "idle"
  | "wander"
  | "graze"
  | "flee"
  | "threaten"
  | "attack"
  | "hunt"
  | "eat"
  | "rest"
```

## Shared Animal Stats

Suggested fields:

```ts
interface AnimalDefinition {
  id: CreatureId;
  name: string;
  species: string;
  diet: AnimalDiet;
  temperament: AnimalTemperament;
  maxHealth: number;
  moveSpeed: number;
  fleeSpeed: number;
  detectionRadiusPx: number;
  attackRadiusPx?: number;
  fearOfFire: number;
  hungerDecayPerMinute: number;
  preferredZones: ZoneType[];
}
```

## Rabbit

### Role

Small prey.

### Behavior

- wanders near burrows/grass
- eats grass/berries/plants
- flees from player, wolves, boars if threatened
- can be hunted by wolves
- may be caught by traps later

### Gameplay Use

- teaches that not all animals attack
- potential food source
- attracts predators indirectly

### Suggested Stats

```txt
low health
high flee speed
no attack
high fear
active mostly day/dusk
```

## Deer

### Role

Large timid prey.

### Behavior

- grazes in clearings
- flees from player/wolves
- can lead player toward clearings/water by movement
- may be hunted by wolves

### Gameplay Use

- living forest ambience
- potential future food/hide source
- visible movement landmark

### Suggested Stats

```txt
medium health
very high flee speed
no normal attack
large detection radius
```

## Boar

### Role

Neutral dangerous animal.

### Behavior

- wanders/rooting in forest floor/clearings
- eats plants, mushrooms, dropped food later
- ignores player at distance
- threatens if player approaches too closely
- charges if attacked or cornered
- may fight wolves
- avoids fire but may not panic instantly

### Gameplay Use

- teaches respect for neutral threats
- dangerous food/hide source later
- can create emergent chaos

### Suggested Stats

```txt
medium-high health
medium speed
charge attack
high damage if underestimated
```

## Wolf

### Role

Predator threat.

### Behavior

- patrols wolf territory
- howls nearby as warning/event
- hunts rabbits/deer
- may attack player if hungry, threatened, or in territory too long
- avoids fire unless desperate/pack later
- can fight boars but not always win

### Gameplay Use

- primary early combat danger
- creates pressure to build camp/fire
- makes the forest feel hostile but logical

### Suggested Stats

```txt
medium health
fast movement
bite attack
pack behavior later, not required now
fear of fire moderate-high
```

## Animal Interactions

Initial interactions:

```txt
wolf hunts rabbit/deer
boar threatens player/wolf when close
rabbit/deer flee predators/player
animals avoid lit campfire radius
```

Optional if easy:

```txt
boar fights wolf if attacked
wolves prefer prey over player if prey is easier/closer
```

## Feeding

Do not build full hunger simulation yet.

Use simple hunger value:

```txt
0 = full
100 = starving
```

Behavior:

- hunger rises over time
- animals look for food when hunger above threshold
- predators hunt prey when hungry
- herbivores graze near plants/clearings

Dropped item feeding is deferred for now. It is a core future idea, but not enough content exists yet.

## Fire Avoidance

Animals should react to lit campfire radius.

Simple rules:

- rabbits/deer avoid strongly
- boars avoid but may charge if already attacking/threatened
- wolves avoid unless extremely hungry or scripted later

## Day/Night Behavior

Keep simple:

- rabbits/deer more active during day/dusk
- boars can be active day/dusk/night
- wolves more threatening at dusk/night

Do not obsess over realism. Simulated realism, arcade pacing. We are making a game, not a grant proposal.

## Death / Carcasses

When animals die, they can leave:

- corpse entity
- meat/hide/bone later
- bird flock interest event later

For now, carcasses can support:

- visual world story
- bird flock reveal
- predator/scavenger interest later

## Required Tests

- rabbit flees from player within radius
- deer flees from wolf/player
- boar threatens before attack
- wolf attacks prey when hungry
- animals avoid lit campfire radius
- wolf howl event can occur without spawning immediate attack
- animal vs animal combat works for simple cases
