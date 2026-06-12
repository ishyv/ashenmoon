# 24 — Implementation Order and Agent Prompts

## Goal

Build First Camp in a practical order without turning the codebase into a haunted craft drawer.

## Recommended Build Order

### Phase 1 — Crafting Foundation

Implement or refine:

- recipe definitions
- unknown recipe crafting
- discovered recipe recording
- crafting context/station requirements
- crafting feedback events
- tests for recipe discovery

Why first:

Most early content depends on crafting and processing.

### Phase 2 — Campfire and Processing

Implement:

- placeable campfire
- fuel state
- lit/unlit state
- heat/light radius
- basic processing: dirty water -> boiled water, wood -> charcoal/ash, raw meat -> cooked meat

Why second:

Campfire is the first camp anchor.

### Phase 3 — Primitive Work Surface

Implement:

- placeable work surface
- station crafting context
- crude knife / tool assembly
- controlled mixing
- recipe shortcut UI integration if foundation exists

Why third:

Work surface makes crafting feel like a camp activity, not random inventory alchemy.

### Phase 4 — Drying Rack

Implement:

- placeable drying rack
- timed processing slots
- herbs/meat/fiber/leaves drying
- optional rain interruption later

Why fourth:

Teaches stations can process over time.

### Phase 5 — Worldgen Forest Pass

Implement:

- stronger forest resource clustering
- water sources
- rocky patches
- clay near water
- clearings
- animal zones
- simple landmarks

Why fifth:

Now the world can supply the materials the camp loop needs.

### Phase 6 — Creature Behaviors

Implement:

- rabbits flee
- deer flee
- boar threaten/charge
- wolves hunt/attack/howl
- animal avoidance of fire
- simple animal-vs-animal interaction

Why sixth:

The player now has camp tools and can experience danger logically.

### Phase 7 — Weather and Night

Implement:

- day/night darkness
- cold at night
- campfire warmth
- rain visuals/sound
- rain affecting fire/drying if ready

Why seventh:

Night becomes the survival test.

### Phase 8 — Events Without Announcements

Implement:

- wolf howl audio event
- animal attack event
- bird flock reveal
- rain event

Why eighth:

Events should emerge from working world systems.

## Agent Prompt 1 — Crafting Discovery Foundation

```md
Implement or refactor the crafting discovery foundation for Ashenmoon.

Goals:
- Unknown recipes can be crafted if the player combines the correct items in the correct context.
- Discovered recipes become shortcuts in the recipe UI.
- Recipes are memory/convenience, not permission.
- Crafting supports physical processing, survival problem solving, and material behavior.

Requirements:
- Add/verify recipe definitions with inputs, outputs, required context/station, process type, duration, discovery behavior, and feedback tags.
- Add a pure recipe matching helper.
- Add discovered recipe state.
- On successful unknown recipe, record the recipe as discovered.
- If a recipe requires a station/context, it must fail cleanly without that context.
- Emit feedback events for successful, failed, and dangerous crafting attempts.
- Do not put crafting logic inside UI components.
- UI displays known recipes and sends craft intent.
- Systems execute crafting.

Tests:
- unknown valid recipe succeeds
- successful unknown recipe becomes discovered
- discovered recipe appears as shortcut
- required context is enforced
- failed recipe does not corrupt inventory
- dangerous recipe/consequence can record knowledge
```

## Agent Prompt 2 — Campfire and Processing

```md
Implement the Milestone 2 campfire as a placeable processing structure.

Goals:
- Campfire is a survival anchor for warmth, light, fuel, cooking, boiling, and material transformation.

Requirements:
- Campfire can be placed on valid ground.
- Campfire has lit/unlit state.
- Campfire consumes fuel over time.
- Campfire provides heat and light radius while lit.
- Campfire supports basic processing recipes:
  - dirty water + container -> boiled water
  - wood/fuel item -> charcoal + ash
  - raw meat -> cooked meat
- Campfire emits visual/audio state events for lit, low fuel, extinguished, and processing complete.
- Keep rendering/VFX in Pixi layer.
- Keep campfire gameplay logic in RPG/world systems.

Tests:
- fuel decreases while lit
- fire goes out when fuel reaches zero
- lit fire provides heat/light
- dirty water can become boiled water in correct context
- wood can become charcoal/ash
- raw meat can become cooked meat
```

## Agent Prompt 3 — Living Forest Worldgen

```md
Implement a stronger single forest biome generation pass for Milestone 2: First Camp.

Goals:
- The forest should generate playable survival content, not random decoration.

Required generated features:
- water sources: river/pond/muddy pool
- tree concentrations
- bushes/grass/plant clusters
- stones/flint rocky patches
- clay/mud near water
- clearings
- landmarks
- animal zones: rabbit burrows, deer grazing areas, boar rooting areas, wolf territory

Rules:
- Resources should spawn in logical clusters.
- Clay appears near water.
- Flint/stones appear in rocky patches.
- Berries/grass appear near clearings/edges.
- Mushrooms appear in damp/shaded areas.
- Starting area must include basic materials and a reachable direction toward water.
- Add debug overlay support if practical.

Tests:
- generated forest includes reachable water
- spawn area includes starter materials
- clay appears near water
- rocks/flint appear in rocky patches
- animal zones are placed on valid terrain
```

## Agent Prompt 4 — First Creature Ecology

```md
Implement first-pass forest creature ecology for rabbits, deer, boars, and wolves.

Goals:
- Creatures should make the forest feel alive without becoming an overbuilt simulation.

Behaviors:
- rabbits: wander/graze/flee
- deer: graze/flee
- boars: forage/threaten/charge if attacked or approached too closely
- wolves: patrol/hunt/howl/attack if hungry or territorial
- animals avoid lit campfire radius
- wolves can hunt rabbits/deer
- boars and wolves can fight if conflict occurs

Do not implement smell/sound investigation yet.
Do not implement full dropped-item ecology yet.

Tests:
- rabbits flee from player/predator
- deer flee from player/predator
- boar threatens before charging
- wolf can hunt prey
- animals avoid lit campfire radius
- animal-vs-animal combat works for basic case
```

## Agent Prompt 5 — Events Without UI Announcements

```md
Replace or avoid title-card style event announcements for normal world events.

Goals:
- Events should be communicated through world feedback, not large UI announcements.

Events to support:
- wolf howls nearby
- animal attacks animal
- bird flock reveals corpse/berries/water/point of interest
- rain starts

Rules:
- Do not show big centered titles for these events.
- Use audio, creature behavior, VFX, weather, and environmental change.
- Debug logs/overlays are allowed in dev mode only.

Tests:
- wolf howl event plays directional/nearby audio without title card
- rain changes weather state and visuals/audio
- bird flock event creates visible bird behavior near point of interest
- animal attack event occurs through creature AI, not notification text
```
