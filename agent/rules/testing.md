# Testing Rules

Tests protect behavior. They are not paperwork.

## Write tests for

- Pure rules and calculations.
- State transitions.
- Parsing, validation, and boundary contracts.
- Bug fixes, especially the case that would have caught the bug.
- Logic future agents are likely to misunderstand.

## Usually do not test

- Framework internals.
- Pass-through wrappers with no decision-making.
- Static data with no invariants.
- Mock-heavy implementation details that do not prove behavior.

## Good test questions

Each test should answer:

1. What rule does this protect?
2. What future mistake would this catch?
3. Would this still matter if the implementation changed?

If the answer is unclear, improve the design before writing decorative tests. Decorative tests are just confetti with a CI bill.
