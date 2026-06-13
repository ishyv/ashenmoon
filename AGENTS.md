# Ashenmoon Agent Rules

This repository follows the game development guide in
`AGENTS_MUST_READ_GAMEDEV_GUIDES/AGENTS.md`. Read it before changing code.

## Current Architecture

Ashenmoon is a standalone dark-fantasy survival sandbox RPG built with
SvelteKit, Svelte 5 runes, Pixi.js, miniplex, TypeScript, and Bun.

Use the current layer split:

```txt
src/lib/core/     Pixi runtime, ECS, input, map, movement, combat, VFX
src/lib/domain/   pure game rules, definitions, systems, and tested mechanics
src/lib/state/    reactive game state, persistence, migrations, sync seams
src/lib/ui/       HUD, panels, debug UI, and player-facing feedback
src/lib/server/   server-side persistence and API support
```

Do not reintroduce the legacy `src/lib/game/` or `src/lib/rpg/` layouts.

## Binding Rules

- Definitions describe.
- Systems execute.
- State records.
- UI displays and sends intent.
- Pixi renders.
- Tests protect.

Pure gameplay rules belong in `src/lib/domain/` and must not import Svelte,
Pixi, DOM APIs, or server-only modules.

UI components may render state and dispatch player intent. They must not decide
game rules such as recipe outcomes, wound effects, thirst logic, item reactions,
or gathering risk.

Pixi/core systems may map input and drive visuals. They must not own RPG truth
or item definitions.

## Feature Standard

Every player-facing mechanic should answer:

1. what the player is trying to do;
2. what state changes;
3. what feedback tells the player it happened;
4. which parts are reusable;
5. what invariants keep the system safe;
6. how it can be verified in-game.

If a mechanic has no readable feedback, it is not finished.

## Implementation Standard

- Prefer composition over one-off behavior.
- Prefer typed data and pure systems over callbacks hidden in definitions.
- Prefer events over per-frame rule polling.
- Document non-obvious ownership, ordering, and migration invariants in code.
  Do not leave future readers to reverse-engineer why state seams exist.
- Avoid broad `any` and careless casts.
- Keep `GameEngine` as an orchestrator, not a dumping ground.
- Keep changes small, reviewable, and tied to Milestone 1 unless explicitly
  requested otherwise.
- New pure domain logic needs focused tests.

## Verification

For code changes, run the narrowest useful check first, then broader checks as
needed:

```bash
bun run check
bun run test
bun run build
```

Report honestly if any verification was skipped or failed.
