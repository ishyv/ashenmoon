# Implementation Plan: High-Fidelity Ecosystem & Animal Lifecycles

**Branch**: `002-ecosystem-simulation` | **Date**: 2026-07-03 | **Spec**: [spec.md](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/specs/002-ecosystem-simulation/spec.md)

**Input**: Feature specification from `/specs/002-ecosystem-simulation/spec.md`

## Summary

Improve world generation and animal AI to simulate high-fidelity biological needs, growth lifecycles, and trophic cascades. We build a modular "system of systems" under the ECS framework, separating pure domain rules (needs, perception, selection, reproduction, biome traits, soil fertilization) from the Pixi/Svelte runtime execution (movement, animations, particle VFX, audio cues, spawner updates).

## User Decisions Incorporated

1. **Simulation Fidelity vs. Performance**: Priority is given to high-fidelity population dynamics. The chunk spawner and active animal capacity are expanded to allow larger herds/packs. Optimization steps (e.g. spatial partition caching) will be introduced if entity overload degrades performance.
2. **Audio, Animation & VFX Feedback**: Grass grazing, drinking, thumping, wallowing, and howling will trigger explicit sprite changes/rotations, particle emitters (leaves, water ripple, dust, mud splash, soundwaves), and sound clips.
3. **Denning Gestation Loop**: Pregnant females return to their burrows/dens to gestate and birth, emerging with follower offspring kits.
4. **Biome-Specific Species Mutations**: Mutated species variants (Snowshoe, Dire, Megaloceros, Canker, Spore, Ash Razorback, Dune Stalker) are introduced with distinct stats and behaviors (e.g. camouflage, freezing howl, soil transformation, toxic mud coating, nocturnal schedules).
5. **Spectator & God Mode**: A toggleable camera mode allowing developers to pan around as a god, invisible and noclipped, while drawing real-time floating debug metrics above each animal.


## Technical Context

**Language/Version**: TypeScript 5.x / SvelteKit 2
**Primary Dependencies**: Miniplex ECS, Pixi.js v8
**Storage**: MongoDB (for save state, animal/nest entities persist dynamically)
**Testing**: Vitest / Bun test (`bun run test:unit`)
**Target Platform**: Web application (Vite dev server)
**Performance Goals**: AI systems tick in functional batches; pathfinding is throttled and perception uses spatial grid buckets to resolve 100+ entities under 1.5ms.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliant? | Notes |
|---|---|---|
| **I. Layered Architecture** | Yes | Pure lifecycle, needs decay, flocking vectors, reproduction timers, and decomposition soil yields live in `src/lib/domain/animals/`. Sprite sync, particles, and audio live in `src/lib/core/systems/animals/`. |
| **II. HyvUI Design Law** | Yes | Monospace HUD feedback, lowercase UI text, and accent color registration strictly observed. |
| **III. Test Discipline** | Yes | All new pure rules under `src/lib/domain/animals/` are test-covered and run via `bun run test:unit`. |
| **IV. Incremental Delivery** | Yes | Phased tasks in tasks.md: Phase 1: Extended Needs & Lifecycle, Phase 2: Reproduction & Nesting, Phase 3: Group AI & Mutations, Phase 4: Consumption & Soil Fertilization. |
| **V. Definition of Done** | Yes | Types are explicit, boundaries validate inputs, svelte-check is run, and legacy code is removed. |

## Project Structure

### Documentation (this feature)

```text
specs/002-ecosystem-simulation/
├── spec.md              # Feature specification
├── plan.md              # This file (Implementation Plan)
├── research.md          # Ethology, lifecycle, spawner, and mutation research
├── data-model.md        # ECS components and state transitions
├── quickstart.md        # Validation scenarios
└── checklists/
    └── requirements.md  # Spec Quality Checklist
```

### Source Code (repository root)

We follow Option 1: Single project structure.

```text
src/lib/
├── core/
│   ├── ecs/
│   │   └── ecs-miniplex.ts            # Extend Entity interface with animal components
│   └── systems/
│       ├── animals/
│       │   ├── animal-ecology-system.ts # Update to coordinate new modular systems and spectator ignores
│       │   ├── animal-movement.ts      # Locomotion execution
│       │   ├── animal-rendering.ts     # Visual adjustments, scales, tints
│       │   ├── animal-sprite-sync.ts   # Animations, rotation, and spectator debug text overlays
│       │   ├── animal-audio.ts         # Sound effect triggers (New)
│       │   ├── animal-vfx.ts           # Particle emitters (New)
│       │   └── animal-spawning.ts      # Spawner configurations
│       ├── command-runtime/
│       │   └── game-facade.ts          # Wire player.spectator command toggle
│       └── movement/
│           └── movement.ts             # Force noclip, invisibility, and speed multiplier
├── domain/
│   └── animals/
│       ├── animal-behavior.ts          # Core weights, species stats, mutations
│       ├── needs.ts                    # Needs decay and aging (New)
│       ├── perception.ts               # Perception scanning (New)
│       ├── reproduction.ts             # Courtship, gestation, follower binding (New)
│       └── ecosystem-impact.ts         # Grazing, wallowing, soil fertilization (New)
├── state/
│   ├── dev-flags.svelte.ts             # Add spectatorEnabled flag (New)
│   ├── game-state.svelte.ts            # Global state sync
│   └── rpg/
│       └── survival.svelte.ts          # Bypass hunger/thirst decay in spectator mode
└── ui/
    └── debug/
        └── SpectatorOverlay.svelte     # Floating Svelte HUD for simulation stats (New)
```

## Complexity Tracking

No violations of the Constitution are required. The proposed design strictly adheres to the Layered Architecture and Test Discipline.

