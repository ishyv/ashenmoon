# Agent Rules for This Game Codebase

Use these rules when modifying this game codebase.

## Core Rule

Do not only make code that “works.” Make game code that is understandable, reusable, testable, and player-readable.

Every mechanic should answer:

1. What is the player trying to do?
2. What state changes?
3. What feedback tells the player it happened?
4. Which parts are reusable?
5. What assumptions/invariants keep the system safe?
6. How can this be verified in-game?

## Development Philosophy

Prefer **composition over one-off behavior**.

Build mechanics from reusable data, components, and systems. Avoid making a special-case system for one enemy, one item, one resource node, or one UI panel unless there is a strong reason.

Good game systems are usually made of:

- data models;
- components;
- systems;
- events;
- feedback hooks;
- configuration;
- clear UI presentation;
- verification scenarios.

Bad game systems are usually made of:

- one huge manager;
- hidden state;
- hardcoded behavior;
- duplicated logic;
- no feedback;
- unclear dependencies;
- comments that explain nothing;
- types that lie.

## Robustness Standard

Robustness matters, but not at any cost.

Only introduce complexity when it clearly improves:

- readability;
- reuse;
- safety;
- debugging;
- player experience;
- future feature speed.

Do not add architecture just to look professional. A simple module with good types is better than five layers of fake flexibility.

## Game Feel Standard

Most player actions should produce readable feedback.

When implementing a mechanic, consider:

- animation;
- particles/VFX;
- sound/SFX;
- UI state;
- hover/selection/targeting state;
- cooldown/progress display;
- hit reaction;
- camera feedback if appropriate;
- failure feedback when the action cannot happen.

A mechanic without feedback is usually not finished. It may be technically implemented, but the player cannot feel or understand it.

## Composition Standard

Before adding new logic, check whether existing components/systems can express it.

Ask:

- Is this actually a new behavior, or a new configuration of existing behavior?
- Can this be represented as components/data?
- Can this system be reused by another enemy, resource, item, or UI?
- Am I adding a one-off branch where a reusable component would be cleaner?
- Am I making the engine larger instead of making the system clearer?

## Documentation Standard

Document intent, not obvious syntax.

Good documentation explains:

- why the system exists;
- what owns the state;
- what invariants must hold;
- what can break if changed;
- what is intentionally not supported;
- how to extend the system safely;
- how the player experiences the system.

Use comments for non-obvious logic:

```ts
// WHY: ...
// INVARIANT: ...
// RISK: ...
```

Avoid comments like:

```ts
// Increment counter
counter += 1
```

The code already said that. Do not insult the reader.

## Before Implementing a Feature

Write or mentally answer a short feature design note:

1. Player goal
2. Game state affected
3. Components/data needed
4. Systems involved
5. Feedback needed
6. UI needed
7. Edge cases/failures
8. Verification steps
9. Reuse opportunities

If the feature has no player feedback plan, the plan is incomplete.

## Known Agent Failure Notes

Before extending First Camp survival, camp structures, station processing,
animal ecology, weather, or world generation, read:

- `docs/first-camp-agent-postmortem.md`

## Final Response Required From Agents

When finishing work, report:

1. what was implemented or changed;
2. which systems/components were touched;
3. what feedback/juice was added;
4. what types/contracts were improved;
5. what documentation was added;
6. how it was verified;
7. remaining risks or follow-up work.
