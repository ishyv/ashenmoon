# Verification and Playtest Checklist

Use this checklist after implementing or refactoring gameplay systems.

## Technical Verification

Run available checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Use the project’s actual commands if different.

Verify:

- no broken imports;
- no weakened types;
- no new broad `any`;
- no circular dependency introduced;
- no giant module grew larger without reason;
- no behavior was moved into the wrong layer.

## Gameplay Verification

For each changed mechanic, test:

- normal use;
- invalid use;
- repeated use;
- edge cases;
- interrupted action;
- interaction with UI;
- interaction with audio/VFX;
- interaction with save/load if relevant;
- interaction with multiple entities.

## Player Feedback Verification

Ask:

- Can the player see what can be interacted with?
- Can the player tell when the action starts?
- Can the player tell when it succeeds?
- Can the player tell when it fails?
- Does the feedback happen at the right time?
- Is the feedback too weak, too noisy, or misleading?

## Refactor Verification

After refactoring:

- old behavior still works;
- new module boundaries are clearer;
- public contracts are documented;
- future extension path is easier;
- code size/complexity did not grow without payoff;
- no agent-only docs contradict the code.

## Manual Test Report Template

```text
Changed system:
Scenario tested:
Expected:
Actual:
Result:
Notes:
```
