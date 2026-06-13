# AGENTS MUST READ: Code Quality, Architecture, and Delivery Rules

This file is mandatory reading before changing the Ashenmoon codebase.

The goal is not to make code look clever. The goal is to keep the project understandable, extensible, testable, and shippable. If a change makes the codebase harder to reason about, it is not a finished implementation. It is debt wearing a feature costume.

## Core Project Rule

Ashenmoon is a standalone game. Treat it like a long-lived game codebase, not a disposable prototype.

Use the project boundaries consistently:

```txt
Definitions describe.
Systems execute.
State records.
UI displays.
Pixi renders.
Tests protect.
```

Meaning:

- Definitions describe data, traits, recipes, stats, items, creatures, attacks, and config.
- Systems execute rules and behavior.
- State stores what currently exists and what changed.
- UI shows state and sends intent; it does not own game rules.
- Pixi renders sprites, effects, camera, and visual feedback; it does not own RPG logic.
- Tests protect important rules, calculations, and edge cases.

If your change violates these boundaries, stop and redesign before writing more code.

---

## Non-Negotiable Standards

Every agent must follow these rules:

1. Do not dump unrelated logic into one large file.
2. Do not stack patch over patch because it is faster in the moment.
3. Do not create hidden behavior through magic strings, random conditionals, or duplicated rules.
4. Do not write a function before understanding who owns the responsibility.
5. Do not add a new API without checking existing patterns first.
6. Do not silently change behavior outside the requested scope.
7. Do not leave complex logic uncommented.
8. Do not create a system that cannot be tested because it is tangled with rendering or UI.
9. Do not fake delivery by adding surface UI while the underlying model remains broken.
10. Do not make `engine.ts` or similar central files worse just because they are convenient.

Convenient is not the same as correct. Cute excuse, still a mess.

---

## Before Writing Code, Ask These Questions

Before adding or changing any API, function, system, or file, answer these mentally or in comments if the change is significant.

### Scope Questions

- What problem am I solving?
- Is this the smallest complete version of the solution?
- Does this belong to the current milestone, or am I sneaking in future-system bloat?
- Am I solving the root problem, or just patching the symptom?
- What existing behavior could this break?

### Ownership Questions

- Is this definition, system logic, state, UI, rendering, or persistence?
- Which module should own this behavior?
- Am I putting logic in this file because it belongs here, or because it was nearby?
- Will another feature need this same concept later?
- Can this be composed instead of hardcoded?

### API Questions

- Is this function name honest about what it does?
- Are the inputs explicit?
- Are the outputs explicit?
- Does this function mutate state? If yes, is that obvious?
- Is this behavior deterministic enough to test?
- Does the caller need to know too much about internal details?
- Is this a reusable primitive, a feature-specific helper, or a one-off script?

### Cleanliness Questions

- Can a new developer understand this file in five minutes?
- Is this file doing too many jobs?
- Are there repeated conditionals that should become data/config/traits?
- Are there comments explaining why non-obvious choices exist?
- Are there tests around the rules that matter?

If you cannot answer these questions, inspect the codebase more before writing code. Guessing is how codebases rot.

---

## Composition Over Spaghetti

Prefer small pieces that combine cleanly.

Bad pattern:

```ts
function updateEverythingInCombatAndUIAndVfxAndState() {
  // giant function that mutates everything
}
```

Better pattern:

```ts
const intent = readPlayerAttackIntent(input);
const result = combatSystem.resolveAttack(intent, combatState, worldState);
applyCombatResult(result, worldState);
combatVfx.play(result.visualEvents);
combatUi.show(result.uiEvents);
```

The exact names do not matter. The separation does.

A system should usually produce results/events that other layers consume. Do not make core game logic directly spawn Pixi graphics, open Svelte panels, or mutate five unrelated systems unless that is explicitly the system's job.

---

## File Size and Responsibility Rules

Files should stay focused.

Use these warning signs:

- A file contains unrelated concepts.
- A file has many long functions.
- A file needs multiple section comments to stay navigable.
- A file imports from every corner of the project.
- A small change requires scrolling through hundreds of lines.
- A function has more than one reason to change.

When this happens, split by responsibility:

```txt
feature/
  feature-config.ts
  feature-types.ts
  feature-rules.ts
  feature-system.ts
  feature-events.ts
  feature-vfx.ts
  feature.test.ts
```

Do not create this structure blindly for every tiny feature. Use it when the feature has real behavior, state, config, events, rendering, or tests.

---

## Comments Are Required Where They Matter

Do not comment obvious code.

Bad:

```ts
// Add one to count.
count += 1;
```

Good:

```ts
// Rushed attacks are allowed, but stamina cost rises sharply so panic-clicking
// remains possible without becoming optimal.
const staminaCost = baseCost * rushedAttackPenalty;
```

Comments should explain:

- Why this rule exists.
- What invariant must stay true.
- What tradeoff was chosen.
- What edge case matters.
- What future change should be careful here.
- Why a less obvious approach was used.

Every non-trivial system should have a short header comment explaining its purpose and boundaries.

Example:

```ts
/**
 * Resolves basic attack rhythm.
 *
 * Basic attacks are not cooldown-gated. The player may attack early, but early
 * attacks deal less damage and cost more stamina. This keeps input responsive
 * while rewarding deliberate combat timing.
 *
 * This module is pure combat math. It must not read input, mutate player state,
 * trigger VFX, or update UI directly.
 */
```

That is useful. Do that.

---

## Data, Config, and Magic Values

Do not bury important numbers inside logic.

Bad:

```ts
if (elapsed < 450 && distance > 52) {
  // swipe
}
```

Better:

```ts
if (
  elapsedMs <= config.thrustMaxHoldMs &&
  distancePx >= config.thrustMinDistancePx
) {
  // swipe
}
```

Important values belong in config objects, constants, definitions, or balance tables.

This is especially important for:

- attack timings
- stamina costs
- damage multipliers
- hitbox sizes
- crafting durations
- recipe requirements
- creature behavior thresholds
- world generation weights
- event probabilities
- survival drain rates

If a designer would want to tune it later, do not hide it in the middle of code.

---

## TypeScript Standards

Use TypeScript like you mean it.

Required:

- Prefer explicit domain types for important concepts.
- Avoid `any` unless there is a documented reason.
- Use discriminated unions for result types, actions, events, and state machines.
- Keep nullable state intentional and checked.
- Avoid stringly-typed behavior when an enum/union/type would be clearer.
- Prefer pure helper functions for calculations.

Example:

```ts
type AttackIntent =
  | { kind: "basic_attack"; direction: Vec2 }
  | { kind: "driving_thrust"; direction: Vec2 }
  | { kind: "fourfold_slash"; sequence: CardinalDirection[] };
```

This is better than passing random strings and hoping nobody typo-summons a bug demon.

---

## Tests Are Part of the Feature

If the feature has rules, write tests for the rules.

Especially test:

- pure calculations
- input classification
- crafting validation
- recipe discovery
- item transformations
- status effect application
- stat scaling
- hitbox geometry
- cooldown/rhythm timing
- world generation constraints
- creature behavior decisions

A feature is not done when it works once manually. A feature is done when its core rules are protected from future stupidity.

Tests do not need to cover every animation sparkle. They do need to cover the logic that would break gameplay.

---

## Refactoring Policy

Refactor when needed, but do not disguise a rewrite as a small feature.

Allowed:

- Extracting pure helpers.
- Moving config out of large files.
- Splitting a bloated module by responsibility.
- Renaming unclear functions/types.
- Removing duplicated logic.
- Adding tests around existing behavior before changing it.

Be careful with:

- Changing public APIs.
- Moving state ownership.
- Reworking save/load shapes.
- Touching many systems at once.
- Replacing working gameplay without a migration path.

If a change requires broad refactoring, state the plan first. Do not casually perform surgery with a spoon.

---

## Delivery Discipline

The codebase should improve after every implementation.

A good change should include some combination of:

- the requested feature
- cleaner ownership
- smaller functions
- clearer types
- useful comments
- tests for important rules
- deleted dead code
- better config/data structure
- fewer hidden assumptions

A bad change:

- adds another special case
- increases file chaos
- duplicates existing logic
- hides important values
- mixes UI/rendering/game rules
- has no tests
- adds comments that repeat the code instead of explaining it
- leaves the next agent with a worse mess

Do not optimize for appearing fast. Optimize for leaving the project healthier.

---

## Final Self-Review Checklist

Before finishing, verify:

- [ ] The change solves the actual requested problem.
- [ ] The code is in the correct architectural layer.
- [ ] Large logic is split into named helpers or modules.
- [ ] Important constants are configurable or clearly named.
- [ ] Non-obvious logic has useful comments.
- [ ] Core rules have tests or a clear reason tests were not added.
- [ ] UI does not own game rules.
- [ ] Pixi/rendering does not own RPG logic.
- [ ] State is not mutated from random places.
- [ ] No unrelated behavior was changed silently.
- [ ] No obvious dead code, console spam, or debug hacks were left behind.
- [ ] A future agent can understand the change without reading your mind.

If the answer is no, the implementation is not finished.

---

## The Standard

Ashenmoon should be built like a game that can survive future content.

The code should make it easier to add:

- more items
- more recipes
- more attacks
- more creatures
- more events
- more biomes
- more survival rules
- more UI panels
- more progression systems

If every new feature requires another pile of exceptions, the architecture is failing. Fix the pattern, not just the symptom.

Care about the codebase. Not romantically. Practically. The project will either become a clean foundation for a real game, or a haunted junk drawer full of half-working systems. Choose correctly.



