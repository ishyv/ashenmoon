# Memory Policy

Cognee is the selected memory backend. These rules define what should and should not be stored.

## Store as long-term memory

- Stable project conventions.
- Architectural decisions that affect future work.
- Repeated pitfalls and their fixes.
- Durable user preferences relevant to this project.
- Tooling or environment quirks that repeatedly matter.
- Reusable workflows that should become `agent/workflows/*` when mature.

## Keep as session memory only

- Files inspected during the current task.
- Temporary hypotheses.
- Failed commands and transient output.
- Current plan state.
- Partial implementation notes.

Promote session memory only when it becomes reusable.

## Do not store

- Secrets, tokens, private keys, credentials, or `.env` contents.
- Raw logs or huge transcripts.
- Stale task progress such as “fixed bug X” or “phase 2 done.”
- Guesses not confirmed by source or user decision.
- Data copied from files when a path reference is enough.

## Durable memory shape

When asking Cognee to remember a durable fact, prefer structured text:

```txt
kind: project_fact | decision | pitfall | workflow | user_preference | environment
scope: project | user | tool
source: file path, command, issue, or user statement
content: one concise fact
```

## Recall rule

Recalled memory is context, not authority. If a remembered fact affects code, config, deployment, or deletion, verify it against the current repo before acting.
