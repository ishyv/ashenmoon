# Completion Protocol

Final reports must be short, specific, and evidence-backed.

Report:

1. What changed.
2. Files touched.
3. Behavior or workflow affected.
4. Tests/checks run and their actual result.
5. Any skipped verification and why.
6. Memory updates made, or why no durable memory was warranted.
7. Remaining risks or follow-up work.

## Status labels

Use one of:

- `DONE` — complete and verified.
- `DONE_WITH_CONCERNS` — complete, but risks remain.
- `BLOCKED` — cannot proceed; explain what was tried.
- `NEEDS_CONTEXT` — missing information changes the implementation path.

Do not claim a thing works unless it was actually exercised.

## Memory promotion

At the end of non-trivial work, check `agent/memory/policy.md`. Store only reusable facts in Cognee. Do not store temporary progress just to feel productive. That is how memory becomes a junk drawer with embeddings.
