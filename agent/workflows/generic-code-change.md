# Generic Code Change Workflow

Use this when no more specific workflow exists.

## When to use

- Small feature work.
- Bug fixes.
- Refactors with known scope.
- CLI or library behavior changes.

## Context packet

Load:

- `agent/protocols/before-work.md`
- `agent/rules/architecture.md`
- `agent/rules/code-quality.md`
- `agent/rules/testing.md`
- `agent/protocols/verification.md`

Inspect first:

- Project manifest and scripts.
- Existing implementation near the change.
- Existing tests near the change.
- Call sites for changed functions, commands, or APIs.

## Implementation

1. Reproduce or define the expected behavior.
2. Add or update focused tests when behavior changes.
3. Implement the smallest complete fix.
4. Run focused verification.
5. Run broader verification if shared paths changed.
6. Update docs only if behavior, commands, or workflow changed.

## Verification

Use project-specific commands when available. Common defaults:

```bash
cargo test
cargo build
npm test
npm run build
bun test
bun run build
```

## Failure modes

- Adding a new path without checking existing patterns.
- Fixing the symptom while duplicating the real rule.
- Skipping tests because the change “seems simple.” Famous last words, tiny edition.
