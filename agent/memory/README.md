# Agent Memory

This project uses the `hu agent mcp` server as the agent-facing memory interface, with Cognee as the backing memory engine.

Agents should not call Cognee directly during normal work. They should use MCP tools exposed by `hu agent mcp`:

- `agent_memory_status`
- `agent_recall`
- `agent_remember`

## Memory layers

- **Session memory:** short-lived task context, current findings, attempted commands, and active hypotheses.
- **Long-term memory:** stable project facts, decisions, recurring pitfalls, and reusable workflow discoveries.
- **Project knowledge:** committed docs under `agent/`, used before querying runtime memory.

## Required behavior

Before relying on memory, agents should:

1. Read `policy.md`.
2. Use `agent_memory_status` to check whether memory is ready.
3. Use `agent_recall` for relevant prior context.
4. Verify recalled facts against source files when the task has side effects.
5. Store only reusable facts with `agent_remember`, not every task detail.

Memory is a retrieval aid, not proof. Source files still win.
