# Tasks: Ecosystem Simulation & Animal Lifecycles

**Input**: Design documents from `/specs/002-ecosystem-simulation/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: Unit tests are required for all pure domain rules in `src/lib/domain/animals/` according to Project Principle III.

**Organization**: Tasks are grouped by user story phases to enable independent implementation and testing of each feature increment.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Update basic ECS component types and registration to support new animal state.

- [ ] T001 Extend `Entity` interface with `needs`, `senses`, `home`, `nest`, `pack`, `follower`, and `mudCoat` components in [ecs-miniplex.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/core/ecs/ecs-miniplex.ts)
- [ ] T002 [P] Update spawner initializations for new animal components and defaults in [spawn-system.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/core/systems/map/spawn-system.ts)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create shell files for the modular subsystems.

- [ ] T003 Create pure logic file shell for needs calculations in [needs.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/domain/animals/needs.ts)
- [ ] T004 Create pure logic file shell for spatial perception scans in [perception.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/domain/animals/perception.ts)
- [ ] T005 Create pure logic file shell for action selection logic in [behavior-selector.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/domain/animals/behavior-selector.ts)

---

## Phase 3: User Story 1 - Animal Lifecycles and Survival Needs (Priority: P1) 🎯 MVP

**Goal**: Implement individual animal needs decay, growth lifecycles, grazing/drinking feedback loops, and natural death.

**Independent Test**: Observe a juvenile animal grow into an adult, seek water and food, and die of old age if needs are not met.

### Tests for User Story 1
> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**
- [ ] T006 [P] [US1] Create unit tests for needs decay, energy fatigue, and lifestage stats/size scaling in [needs.test.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/domain/animals/needs.test.ts)

### Implementation for User Story 1
- [ ] T007 [P] [US1] Implement needs decay, energy fatigue, and lifestage progression rules in [needs.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/domain/animals/needs.ts)
- [ ] T008 [US1] Integrate lifecycle size scaling and lifestage text display in [animal-rendering.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/core/systems/animals/animal-rendering.ts) and [animal-sprite-sync.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/core/systems/animals/animal-sprite-sync.ts)
- [ ] T009 [US1] Connect needs ticks and lifecycle milestones into the main game loop in [animal-ecology-system.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/core/systems/animals/animal-ecology-system.ts)
- [ ] T010 [US1] Implement grazing/drinking animation and chewing/slurping audio triggers in [animal-sprite-sync.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/core/systems/animals/animal-sprite-sync.ts) and [animal-audio.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/core/systems/animals/animal-audio.ts)

---

## Phase 4: User Story 2 - Courtship, Gestation & Den Breeding (Priority: P1)

**Goal**: Sated adults reproduce, with pregnant females returning to burrows/dens to safely birth kits.

**Independent Test**: Place sated male and female adults close by, watch courtship and gestation, female retreats into nest, and emerges with kits following her.

### Tests for User Story 2
- [ ] T011 [P] [US2] Create unit tests for courtship selection, gestation timers, and kit follower spawning in [reproduction.test.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/domain/animals/reproduction.test.ts)

### Implementation for User Story 2
- [ ] T012 [P] [US2] Implement courtship, pregnancy double hunger, den-retreat, and gestation birth emergence in [reproduction.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/domain/animals/reproduction.ts)
- [ ] T013 [US2] Create den and burrow landmarks in world generation in [map.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/core/systems/map/map.ts)
- [ ] T014 [US2] Integrate the den-relocation pathing, nesting hide, and gestation exit spawning in [animal-ecology-system.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/core/systems/animals/animal-ecology-system.ts)
- [ ] T015 [US2] Implement follower steering behavior for kits to follow their mother in [animal-movement.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/core/systems/animals/animal-movement.ts)

---

## Phase 5: User Story 3 - Boar Mud Wallowing & Soil Rooting (Priority: P2)

**Goal**: Boars root grass tiles to turn them to dirt (spawning stone/root items) and wallow in mud to coat themselves in physical armor.

**Independent Test**: Observe a boar root grass and wallow in mud, checking visual splash VFX and armored status gains.

### Tests for User Story 3
- [ ] T016 [P] [US3] Create unit tests for wallowing mud coat status buffs and soil rooting grass-to-dirt transforms in [mutations-wallowing.test.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/domain/animals/mutations-wallowing.test.ts)

### Implementation for User Story 3
- [ ] T017 [P] [US3] Implement wallowing state triggers and rooting transform logic in [ecosystem-impact.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/domain/animals/ecosystem-impact.ts)
- [ ] T018 [US3] Add boar wallowing mud splattering VFX and mud texture/tint sync in [animal-vfx.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/core/systems/animals/animal-vfx.ts) and [animal-sprite-sync.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/core/systems/animals/animal-sprite-sync.ts)
- [ ] T019 [US3] Wire rooting dirt changes and pickup spawns into map resources in [animal-ecology-system.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/core/systems/animals/animal-ecology-system.ts)

---

## Phase 6: User Story 4 - Cooperative Pack Hunts & Alphas (Priority: P2)

**Goal**: Wolves cooperate to hunt prey using flank and chase roles, boosted by Alpha howling signals, while deer flee in coordinated herds.

**Independent Test**: Watch wolves howl to boost pack speed and perform coordinated flank intercepts on deer stags.

### Tests for User Story 4
- [ ] T020 [P] [US4] Create unit tests for pack target sharing and coordinated hunting flanking vectors in [behavior-selector.test.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/domain/animals/behavior-selector.test.ts)

### Implementation for User Story 4
- [ ] T021 [P] [US4] Implement utility weights for alpha howling, pack flocking coordination, and flank target interception angles in [behavior-selector.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/domain/animals/behavior-selector.ts)
- [ ] T022 [US4] Implement howl soundwave ring VFX and audio clip triggers in [animal-vfx.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/core/systems/animals/animal-vfx.ts) and [animal-audio.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/core/systems/animals/animal-audio.ts)
- [ ] T023 [US4] Integrate herd coordinated fleeing vectors in [animal-movement.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/core/systems/animals/animal-movement.ts)

---

## Phase 7: User Story 5 - Biome-Specific Evolutionary Mutations (Priority: P3)

**Goal**: Implement biome-appropriate mutated species variants (Snowshoe, Dire, Megaloceros, Canker, Spore, Ash Razorback, Dune Stalker) with custom stats and behaviors.

**Independent Test**: Verify Snowshoe camouflage in snow, Spore boar toxic mud armor, and Ash Razorback fire trails.

### Implementation for User Story 5
- [ ] T024 [P] [US5] Implement biome mutation traits, speeds, and status resistance values in [animal-behavior.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/domain/animals/animal-behavior.ts)
- [ ] T025 [P] [US5] Update biome spawner mapping to spawn mutations based on cell coordinates in [spawn-system.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/core/systems/map/spawn-system.ts)
- [ ] T026 [US5] Add snow-digging particles for Megaloceros and poison cloud VFX for Spore boars in [animal-vfx.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/core/systems/animals/animal-vfx.ts)

---

## Phase 8: Trophic Cascades & Carcass Decomposition (Priority: P2)

**Goal**: Herbivore grazing depletes vegetation nodes; rotting carcasses disappear and fertilize adjacent cells, spawning botanical pickups.

**Independent Test**: Watch herbivores eat grass patches (deleting the nodes) and verify rotten carcasses spawn mushroom/herb pickups on meadow cells.

### Tests for Phase 8
- [ ] T027 [P] [US6] Create unit tests for vegetation node consumption depletion and carcass decomposition soil fertilization in [ecosystem-impact.test.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/domain/animals/ecosystem-impact.test.ts)

### Implementation for Phase 8
- [ ] T028 [P] [US6] Implement rotten decomposition node spawning calculations in [ecosystem-impact.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/domain/animals/ecosystem-impact.ts)
- [ ] T029 [US6] Wire grass/bush depletion on grazing and soil fertilization upon decomposition into the loop in [animal-ecology-system.ts](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/src/lib/core/systems/animals/animal-ecology-system.ts)

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Ensure codebase quality, full builds, and clean validation checks.

- [ ] T030 Run code formatters and compiler check (`bun run check`)
- [ ] T031 Run all unit tests (`bun run test:unit`)
- [ ] T032 Verify manual in-game scenarios from `quickstart.md`
- [ ] T033 Update walkthrough documentation

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup (Phase 1). BLOCKS all user stories.
- **User Stories (Phases 3+)**: All depend on Foundational (Phase 2).
  - Can be completed in parallel or sequentially: P1 (Lifecycles & Needs, Den Breeding) → P2 (Wallowing, Pack Hunts, Decomposition) → P3 (Mutations).
- **Polish (Phase 9)**: Depends on completion of all implementation phases.

---

## Implementation Strategy

### MVP First (User Story 1 & 2 Only)
1. Complete Phase 1: Setup and Phase 2: Foundational.
2. Complete Phase 3: Lifecycles & Needs (US1) and Phase 4: Courtship & Den Breeding (US2).
3. **STOP and VALIDATE**: Verify lifecycles and breeding loop manually in-game and with unit tests.
4. Proceed to high-fidelity additions (Wallowing, Pack Hunts, Mutations).
