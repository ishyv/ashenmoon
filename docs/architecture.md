# Engine Architecture - Bevy-Aligned ECS Pattern

This document describes the modular architecture of the game engine, which is built on Entity-Component-System (ECS) principles inspired by Rust's **Bevy** engine, adapted to SvelteKit, TypeScript, and the **miniplex** library.

## Core Philosophy

To avoid oversized files and spaghetti dependencies, the game engine enforces a strict separation between **State** (Entities, Components, Resources) and **Logic** (Systems).

```mermaid
graph TD
  Orchestrator[GameEngine: App/Ticker Runner] --> world[ECS World]
  Orchestrator --> Resources[Resources: Inputs, Map, VFX, Configs]
  Orchestrator -- ticks systems --y Systems[Systems: Movement, Input, Interaction, Map, Building, VFX]
  Systems --> world
  Systems --> Resources
```

---

## 1. Entities & Components

All game objects are **Entities**. Entities contain no logic; they are simple bags of data structured as properties (Components).
The schema is defined in [ecs-miniplex.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/game/ecs-miniplex.ts):

- **`position`**: Coordinates in world space (`x, y`) and path targets (`targetX, targetY`).
- **`collider`**: Marks the entity as a solid physical blocker.
- **`playerControlled`**: Marks the player entity and defines base speed.
- **`interactable`**: Marks the entity as triggerable (harvestable tree, Loose Twigs, campfire, NPC) with actions like `gather`, `pickup`, `talk`, `refuel`.
- **`resource`**: HP values and item drop names for harvestable objects.
- **`pickup`**: Ground items collectable on E taps.

---

## 2. Resources (Global Singletons)

Resources store global, non-entity state. They are passed as parameters to update systems:

- **`InputResource`** ([input.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/game/input.ts)): Active keyboard state, custom key mappings, mouse world coordinates, and pending action trigger flags (e.g. `dashTriggered`, `superGatherTriggered`).
- **`MapResource`** ([map.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/game/map.ts)): Grid details, Whittakers cells array, and solid coordinates collision caches.
- **`VFXResource`** ([vfx.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/game/vfx.ts)): Arrays of visual particles, floating texts, hit flash metadata, camera shake timers, and overlay graphics rings.
- **`MovementResource` & `MovementConfig`** ([movement.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/game/movement.ts)): Dash active counters, evade multipliers, and sprint locks.
- **`InteractionResource`** ([interaction-system.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/game/interaction-system.ts)): Auto-gather swing timers, targeted highlight caches, and campfire refuel timers.
- **`BuildingResource`** ([building.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/game/building.ts)): Structural placement indicators and cancel/complete listeners.

---

## 3. Systems

Systems are **functional, query-driven procedures** that run every frame inside the game tick schedule. They carry zero state. They query components from the `world` and apply calculations using current `dt` and `Resources`:

- **`playerMovementSystem`**: Executes per-axis AABB collisions, corner slide nudging, WASD speed updates, and evasive dashes.
- **`runInteractionSystem`**: Processes auto-gather interval swings, tool validators (axe vs pickaxe), loose item pickups, campfire refuels, Vane NPC conversations, local XP leveling, and database updates.
- **`updatePlacementPreviewSystem`**: Moves construct shacks/walls/towers placeholders, checks footprints, and paints validity indicators (green/red).
- **`vfx systems`** (`particleUpdateSystem`, `floatingTextUpdateSystem`, etc.): Updates positions, fades graphics, and manages coordinate offsets.
- **`cullViewportSystem`**: Disables visibility of tiles and entities out of screen bounds.
- **`climateEnvironmentSystem`**: Recalculates ambient temperature, humidity, and toxins relative to biomes and campfires.

---

## 4. Orchestrator App Shell (`GameEngine`)

The [engine.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/game/engine.ts) orchestrator manages:
- **PixiJS Lifecycle**: Application initialization, rendering layers, asset loading, resizing, and ticking loops.
- **Resources**: Instantiates and exposes resource singletons.
- **External integration**: Direct public APIs for Svelte UI pages (`+page.svelte`), HUD updates, context menus, and developer console triggers (`tp`, `spawn`, `noclip`).

---

## 5. Next Migration Phases & Roadmap

To fully transition the remaining aspects of the codebase into a Bevy-aligned ECS paradigm, we plan to execute the following refactoring roadmap:

### Phase 1: Decoupling Svelte UI Panels from GameEngine Proxy
Currently, components like `InventoryGrid.svelte` and `EquipmentPanel.svelte` depend on passing direct references to the `GameEngine` or checking its attributes.
* **Refactor Plan**: Modify UI panels to communicate with the engine asynchronously using components on the player entity or by dispatching mutations directly to global resources (e.g., updating a `BuildingResource.isPlacementMode` flag directly rather than calling `engine.startBuildingPlacement()`).
* **Implementation**: Svelte UI components will query the ECS `world` directly for entities (`world.entities` or `.with()`) to display live item stats, bypassing orchestrator getters.

### Phase 2: Refactoring Quest and Dialogue Logic into Pure Systems
Currently, `quests.svelte.ts` manages quest progression reactively, but dialogue boxes directly mutate and hook into local stubs.
* **Refactor Plan**: Move quest progression evaluations (e.g., checking if the player has gathered 5 twigs) into a `questUpdateSystem` ticked by the runner.
* **Implementation**: Dialogue trees and active quest status should be marked as components on the NPC entities or structured as a global `QuestResource`. The rendering overlay will bind to this resource reactively.

### Phase 3: Unifying Reactive State Stores
Currently, stamina updates are handled in `stamina.svelte.ts` via discrete timeouts, while RPG level details reside in `rpg-state.svelte.ts`.
* **Refactor Plan**: Merge local stats (stamina, hp, skills XP) into standard ECS components on the `playerControlled` entity or place them in a global `RpgStatsResource`.
* **Implementation**: Use Svelte 5 runes (`$state` / `$derived`) to bridge the ECS resource data directly to the Svelte components so they stay automatically in sync with the engine's physics tick.

