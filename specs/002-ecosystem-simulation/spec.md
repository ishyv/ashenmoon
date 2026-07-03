# Feature Specification: High-Fidelity Ecosystem & Animal Lifecycles

**Feature Branch**: `002-ecosystem-simulation`

**Created**: 2026-07-03

**Status**: Draft

**Input**: User description: "improve existing world generation and entity behavior to create a more accurate simulation of animals ecosystems, patterns, behaviors overall their life cycle. Research biology, ethology and ecology to captivate player attention. Modular robust system of systems."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Biological Needs & Growth Lifecycles (Priority: P1)
Animals experience basic biological needs (hunger, thirst, energy) that drive their daily activities and grow dynamically through distinct life stages.
- **Why this priority**: Essential foundation of a biological simulation.
- **Independent Test**: Spawn a juvenile animal and observe it scale up to adult size, seek water to drink when thirsty, graze to satisfy hunger, sleep when tired, and die of old age if neglected.
- **Acceptance Scenarios**:
  1. **Given** a juvenile rabbit, **When** it ages past 180 seconds, **Then** its scale increases from `0.5x` to `1.0x`, its vocalization pitch decreases, and it enters the adult stage.
  2. **Given** a thirsty adult deer (thirst > 75), **When** water is nearby, **Then** it walks to the water edge, plays a drinking animation (head-bobs, water ripples, slurp sound), and its thirst need is satisfied.
  3. **Given** an animal with empty needs (100% hunger/thirst/exhaustion), **When** it reaches 0 HP, **Then** it plays a death sound, fades out, and spawns a fresh carcass.

### User Story 2 - Courtship, Gestation & Den Breeding (Priority: P1)
Sated animals engage in courtship and reproduce, with females returning to nests/dens to birth juveniles.
- **Why this priority**: Provides a realistic population generation model that avoids magical pop-ins.
- **Independent Test**: Place a male and female adult in proximity, watch them court, observe the female relocates to her den, and emerge with follow-kits.
- **Acceptance Scenarios**:
  1. **Given** a male and female wolf with low hunger/thirst and high energy, **When** they are within 2 tiles, **Then** they circle each other (courtship VFX/hearts) and the female becomes pregnant.
  2. **Given** a pregnant female rabbit at 80% gestation, **When** she is active, **Then** she returns to her burrow, enters it (disappears from view), and emerges at 100% gestation followed by 1-2 kit follower entities.

### User Story 3 - Mud Wallowing & Soil Rooting (Priority: P2)
Boars root up the soil for food and wallow in mud pools to coat themselves in protective armor.
- **Why this priority**: Adds environmental texture and species-specific ethology that captivates player attention.
- **Independent Test**: Watch a boar root grass tiles to turn them to dirt and wallow in a mud pool to gain an armor status.
- **Acceptance Scenarios**:
  1. **Given** a boar near a grass tile, **When** it roots, **Then** a dirt-splattering particle VFX plays, the grass cell is replaced by a dirt cell, and a stone or root pickup spawns.
  2. **Given** a boar near a mud pool cell, **When** it wallows, **Then** splash mud particles and squelching sounds play, its sprite gets a mud tint, and its status gains a "Mud Coated" armor buff.

### User Story 4 - Cooperative Pack Hunts & Alphas (Priority: P2)
Wolves hunt cooperatively using flock/pack coordination and alpha howls, while deer flee as a coordinated herd.
- **Why this priority**: Showcases complex predator-prey group dynamics.
- **Independent Test**: Watch wolves howl to boost pack speed and execute a coordinated flank hunt on a deer herd.
- **Acceptance Scenarios**:
  1. **Given** an elder alpha wolf, **When** it howls, **Then** it plays a howl audio clip, triggers soundwave rings VFX, and applies a speed boost to all nearby pack wolves.
  2. **Given** a pack of 3 wolves hunting a deer stag, **When** the hunt begins, **Then** 1 wolf chases from behind while the other 2 wolves run to the sides (flank vectors) to intercept the deer.
  3. **Given** a deer herd, **When** one deer detects a predator and flees, **Then** it emits an alert signal causing the entire herd to flee in the same direction, led by the elder Stag.

### User Story 5 - Biome-Specific Evolutionary Mutations (Priority: P3)
Animals carry unique mutations and behaviors optimized for their specific biomes (Frostbane, Scorched Wastes, Fungal Mire).
- **Why this priority**: High-fidelity detail that rewards player exploration across different zones.
- **Independent Test**: Travel to different biomes and observe camouflage, nocturnal patterns, and toxic armor mutations.
- **Acceptance Scenarios**:
  1. **Given** a rabbit in the Frostbane biome, **When** winter/snow conditions are active, **Then** its fur turns white and its threat detection radius shrinks by 50% due to camouflage.
  2. **Given** a wolf pack in the Scorched Wastes, **When** daylight is active, **Then** they sleep in their dens and only emerge to hunt silently (without howling) at night.
  3. **Given** a boar in the Fungal Mire, **When** it wallows in swamp water, **Then** it gains a "Toxic Mud Armor" status, poisoning any melee attackers.

### User Story 6 - Spectator & God Mode (Priority: P2)
Developers can toggle a spectator camera mode to observe animal behavior uninterrupted, complete with on-screen debug displays of animal state.
- **Why this priority**: Essential verification tool for testing high-fidelity ecosystem and mutation rules.
- **Independent Test**: Toggle spectator mode via the dev console, verify player character becomes invisible and noclipped with speed boost, and verify HUD overlays detailed stats above all animals in real-time.
- **Acceptance Scenarios**:
  1. **Given** spectator mode is enabled, **When** the player moves, **Then** noclip is active, movement speed is tripled, and the player sprite is hidden.
  2. **Given** spectator mode is enabled, **When** time passes, **Then** player hunger, thirst, wetness, temperature, and stamina do not decay, and animals do not aggro or flee from the player.
  3. **Given** spectator mode is enabled, **When** animals are rendered, **Then** a monospace text box floating above each animal displays its ID, species, lifeStage, HP, current behavior, hunger%, thirst%, and energy%.

---

## Edge Cases

- **What happens if an animal's den/burrow is destroyed by player construction?**
  - The home components are severed, the animal herd becomes "feral/homeless" (aggression increases by 50%, and they wander widely).
- **What happens if a predator eats a toxic-blooded prey?**
  - The predator contracts a poison status effect, draining its health over time, illustrating biological transfer.
- **How is population explosion prevented?**
  - Gestation cooldowns, high hunger decay rates, and a strict chunk-cap spawner prevent exponential breeding.

---

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001 (Needs)**: Track `hunger`, `thirst`, `energy`, `ageSec`, and `lifeStage` for all animals.
- **FR-002 (Lifecycles)**: Scale animal sprite size and stats (HP, speed, damage) dynamically across life stages: juvenile (`0.5x`), adult (`1.0x`), elder (`1.2x`).
- **FR-003 (Courtship & Breeding)**: Select sated adult pairs for courtship, apply pregnant gestation timers, and trigger den-lodging birth.
- **FR-004 (Follower Behavior)**: Spawn offspring with a follower component keeping them close to their mother.
- **FR-005 (Wallowing & Rooting)**: Support boar-specific wallowing (armor status, mud texture) and rooting (grass-to-dirt transition, node spawns).
- **FR-006 (Group AI)**: Implement pack/herd coordination, target sharing, alpha howling speed buffs, and herd alerts.
- **FR-007 (Consuming/Drinking)**: Support vegetation grazing node depletion, water edge drinking ripple VFX, and corresponding slurp/crunch sounds.
- **FR-008 (Alert Thump)**: Support rabbit foot-thumping alert propagation to warn warren members.
- **FR-009 (Biome Mutations)**: Implement Snowshoe camouflage, Dire wolf freezing howls, Megaloceros digging, Scorched Wastes nocturnal sleep, and Fungal Mire toxic mud armor.
- **FR-010 (Decomposition)**: Support rotten carcass dissolution setting soil fertilized status, boosting vegetation regrowth speed and spawning flora pickups.
- **FR-011 (Spectator Mode)**: Support spectator mode toggle in dev facade, disabling player rendering, collision, and survival needs ticks, and enabling real-time animal debug overlays.

### Key Entities
- **Animal**: Holds `animal`, `needs`, `senses`, `home`, `pack`, `follower`, and `mudCoat` components.
- **Nest**: Landmark holding burrow capacity, occupancy lists, and spawn cooldowns.
- **Carcass**: Holds species, age, spoilage state, and fertilizing coordinates.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes
- **SC-001**: All biological rules, needs, behavior weight scoring, and lifecycle transitions compile in the pure functional domain (`src/lib/domain/animals/`) and are validated by unit tests.
- **SC-002**: Population numbers stabilize in closed loops, reflecting resource limits (trophic cycles).
- **SC-003**: Dynamic spawner cap gates keep performance high (<1.5ms per tick for 50 active entities).
- **SC-004**: Consuming, wallowing, thumping, and howling trigger appropriate particle emitters, visual sprite scale/tints, and audio clips.
- **SC-005**: Spectator mode hides the player character, allows noclip flight, halts player survival decay, and displays accurate state details above all active entities.

