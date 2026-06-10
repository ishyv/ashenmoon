# Refactor Safety Checklist

Use this before and after refactoring game systems.

## Before Refactor

- [ ] Identify current responsibilities.
- [ ] Identify current callers.
- [ ] Identify affected components/systems/events.
- [ ] Identify player-facing behavior that must not change.
- [ ] Identify tests/manual scenarios.
- [ ] Create migration plan.
- [ ] Avoid big-bang rewrite if incremental migration is possible.

## During Refactor

- [ ] Extract types/models first when useful.
- [ ] Move behavior into focused modules.
- [ ] Preserve public API or provide compatibility layer.
- [ ] Update docs as responsibilities move.
- [ ] Avoid adding new abstractions without payoff.
- [ ] Keep imports clean and directional.

## After Refactor

- [ ] Build/typecheck passes.
- [ ] Gameplay scenarios still work.
- [ ] Feedback still triggers.
- [ ] UI still reflects state.
- [ ] Old dead code removed.
- [ ] Docs match the new structure.
- [ ] Final report includes risks and verification.
