# 22 — Events, Weather, and First Night

## Goal

Events should make the forest feel alive without using intrusive quest/title announcements.

Ashenmoon should not say:

```txt
EVENT STARTED: WOLVES NEARBY
```

It should make the event happen:

- the player hears wolves
- birds scatter or circle
- rain starts
- animals flee or fight
- darkness reduces visibility

## Event Design Rule

```txt
An event is something the world does, not something the UI announces.
```

Use sensory feedback:

- sound
- movement
- visual change
- creature behavior
- environmental consequence

## Initial Event Types

### 1. Wolf Howls Nearby

#### Purpose

Warn the player of predator presence without immediate forced combat.

#### Trigger Conditions

- player near wolf territory
- dusk/night higher chance
- player has been in forest area for some time
- random low-frequency ambient event

#### Feedback

- howl audio from approximate direction
- maybe distant wolf silhouette later
- nearby prey animals may flee or freeze
- no title card

#### Gameplay Meaning

```txt
There may be wolves nearby. Fire/camp placement matters.
```

### 2. Animals Attack Animals

#### Purpose

Show ecology.

#### Examples

- wolf chases rabbit/deer
- boar fights wolf if threatened
- wolf attacks wounded prey

#### Feedback

- movement/chase
- combat sounds
- fleeing animals
- corpse afterwards if kill happens

#### Gameplay Meaning

```txt
The forest has its own conflicts.
The player can avoid, observe, intervene, or exploit.
```

### 3. Bird Flock Reveal

#### Purpose

Guide exploration without quest markers.

Birds can reveal:

- corpse
- berry patch
- water nearby
- predator kill site
- strange landmark later

#### Feedback

- birds rise from trees/ground
- flock circles or moves toward point
- distant cawing/flapping
- no UI marker unless debug

#### Gameplay Meaning

```txt
Pay attention to natural signs.
```

### 4. Rain

#### Purpose

Make weather affect survival/camp.

#### Effects

- reduces fire reliability if uncovered
- slows drying rack progress if exposed
- increases wetness/cold risk
- makes forest darker/moodier
- can make some resources wet

#### Feedback

- rain visuals
- rain sound
- darker lighting
- wet ground tint/effects
- campfire sputters if exposed

## First Night

First night should be simple and meaningful.

Primary pressures:

- cold exposure
- need for fire
- poor visibility

Do not add complex supernatural mechanics yet.

## Night Rules

### Cold

At night, ambient temperature drops.

If player lacks warmth:

- cold status builds
- stamina recovery worsens
- eventually health risk if severe

Campfire and shelter reduce this.

### Visibility

At night:

- world darkens
- sight radius decreases
- fire provides local light
- some animals become harder to see

### Fire Need

A lit campfire should meaningfully improve first-night survival.

Fire provides:

- warmth
- light
- animal deterrence

## Weather and Camp Structures

### Campfire + Rain

First simple rule:

```txt
Rain reduces fuel efficiency and can extinguish weak/uncovered fires.
```

Shelter may protect nearby fire later, but be careful with placement complexity.

### Drying Rack + Rain

```txt
Rain pauses or reverses drying if rack is exposed.
```

### Shelter + Rain/Cold

```txt
Shelter reduces wetness/cold buildup near or inside it.
```

## Event Scheduler

Use simple weighted events.

Inputs:

- time of day
- player location/zone
- nearby animal zones
- weather state
- camp state
- cooldowns between event types

Output:

- event request emitted to world system

## No Announcement Rule

Do not use large centered titles for normal events.

Allowed:

- sound
- particles
- lighting
- creature behavior
- small diegetic or subtle feedback
- debug logs in dev mode

Forbidden for normal events:

```txt
WOLF EVENT STARTED
RAIN EVENT STARTED
BIRD FLOCK DISCOVERED
```

Subtle player-character observations can be used sparingly later, but not as the main event system.

## Required Tests

- wolf howl event can trigger near wolf territory
- wolf howl does not require immediate wolf attack
- rain changes weather state
- rain affects exposed campfire/drying rack if implemented
- night reduces visibility
- campfire reduces cold exposure nearby
- bird flock event creates/moves birds toward valid point of interest
- animal attack event can occur between valid species
