# Code Quality Rules

## Standards

- Make small, reviewable changes tied to the request.
- Match neighboring style and naming.
- Do not introduce broad `any`, vague object bags, or unchecked casts in typed code unless the reason is documented.
- Prefer named helpers over repeated conditionals.
- Use comments for intent, invariants, ordering, and risks. Do not narrate obvious syntax.
- Do not leave debug spam, dead code, backup files, or half-migrations.
- Do not silently change behavior outside the task scope.

## Useful comment tags

```txt
WHY: explains a non-obvious choice.
INVARIANT: names a condition that must remain true.
RISK: names what can break if changed casually.
```

## Self-review

Before finishing, check:

- Is the ownership clear?
- Are edge cases handled deliberately?
- Did this make the codebase easier to work in, or just bigger?
- Can a future agent understand the change without reading your mind?
