# Skill: High-Quality Game Development

Use this skill whenever implementing, refactoring, or reviewing gameplay, UI, entities, engine systems, feedback systems, or game data.

## Purpose

Ensure every change respects high-quality game development principles:

- composition-first architecture;
- reusable mechanics;
- clear player feedback;
- strong typing;
- simple module boundaries;
- practical documentation;
- code that stays smaller and clearer over time.

## Trigger Conditions

Use this skill when working on:

- mechanics;
- enemies/NPCs;
- gathering/crafting/combat;
- inventory/items;
- UI/HUD/menus;
- engine lifecycle;
- components/systems;
- feedback/VFX/SFX;
- refactors touching gameplay structure.

## Workflow

Before editing:

1. Identify the player-facing purpose.
2. Identify components/data involved.
3. Identify systems involved.
4. Identify feedback needed.
5. Identify UI impact.
6. Identify reuse opportunities.
7. Identify edge cases.
8. Identify verification steps.

During implementation:

1. Prefer composition over one-off behavior.
2. Keep core logic separate from presentation.
3. Use events/hooks for feedback where appropriate.
4. Keep types explicit.
5. Avoid generic abstractions without payoff.
6. Document non-obvious logic.

After implementation:

1. Verify logic.
2. Verify player feedback.
3. Verify UI clarity.
4. Verify types.
5. Verify docs.
6. Report risks/follow-ups.

## Decision Questions

Ask these before adding new code:

- Is this behavior reusable?
- Is this actually data/config instead of new logic?
- Can an existing system handle this?
- Does this mechanic have feedback?
- Will the player understand what happened?
- Is this making the codebase smaller or larger?
- If larger, is the payoff worth it?
- Are types preventing invalid states?
- Is documentation explaining the why?

## Output Required

When done, include:

```text
Player-facing change:
Systems touched:
Components/data touched:
Feedback added:
UI impact:
Reuse/composition notes:
Type safety notes:
Documentation added:
Verification:
Remaining risks:
```
