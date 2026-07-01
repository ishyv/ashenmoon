# Architecture Rules

Use this file for project boundary decisions. Customize it for the repo after running `hu agent-setup`.

## Default laws

- Put behavior in the layer that owns it.
- Keep entrypoints thin. They wire systems together; they do not become junk drawers.
- Prefer explicit types and contracts at boundaries.
- Prefer composition over hidden special cases.
- Keep domain logic testable without UI, rendering, network, or process glue when possible.
- Avoid adding architecture that does not buy readability, safety, reuse, or speed.

## Ownership questions

Before adding code, answer:

1. Who owns this state?
2. Who executes this behavior?
3. Who displays or reports the result?
4. Which existing module already solves part of this?
5. What invariant must stay true after this change?

If those answers are fuzzy, inspect more before editing.
