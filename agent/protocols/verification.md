# Verification Protocol

Use the narrowest meaningful check first, then broader checks when the change can affect integration.

## Default order

1. Focused unit tests for changed logic.
2. Typecheck or compiler check.
3. Full test suite when the change can affect shared behavior.
4. Build/package check before claiming a runnable artifact.
5. Manual smoke test when behavior is CLI, UI, visual, or integration-heavy.

## Reporting

Include exact commands and pass/fail results.

If a check is skipped, say why. Acceptable reasons include docs-only changes, missing environment, or an explicitly out-of-scope integration. “I forgot” remains undefeated as a bad reason.
