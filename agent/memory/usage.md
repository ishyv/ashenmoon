# Memory Usage

Use the `hu agent mcp` server as the normal memory interface.

## Before starting a task

1. Call `agent_memory_status`.
2. If memory is ready, call `agent_recall` with the task summary.
3. Use recalled memory to choose docs and files to inspect.
4. Verify recalled facts against the repo before making changes.

## During a task

Keep noisy current-task state out of long-term memory. Use the active conversation/session for:

- temporary notes;
- command output summaries;
- current plan state;
- files inspected;
- hypotheses that may be wrong.

## Ending a task

Store only reusable facts with `agent_remember`:

```json
{
  "kind": "pitfall",
  "scope": "project",
  "source": "path/to/file.rs or command output",
  "content": "Concise reusable lesson."
}
```

If the finding is a repeated procedure, add or update a workflow under `agent/workflows/` instead of only storing memory.

## Correcting memory

Use Cognee forget/debug tools for stale, unsafe, or wrong memory. Do not pile contradictory memories on top of each other and hope retrieval becomes wise. It will not. It will become soup.
