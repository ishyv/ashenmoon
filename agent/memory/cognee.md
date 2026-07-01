# Cognee Backend

Cognee is the selected memory engine, but agents should normally access it through the `hu agent mcp` server.

## Runtime boundary

```bash
hu agent mcp <project-path>
```

The MCP server owns:

- project dataset naming;
- local configuration loading;
- Cognee readiness checks;
- memory policy validation;
- calls to `cognee-cli`;
- structured MCP responses for agents.

Cognee owns storage, graph/vector indexing, recall, and durable memory state.

## MCP tools

- `agent_memory_status` checks project docs, local config, `.gitignore`, `cognee-cli`, and the active dataset.
- `agent_recall` searches project-scoped Cognee memory.
- `agent_remember` stores validated durable memories with `kind`, `scope`, `source`, and `content`.

## Local-first target

The preferred local stack is:

```txt
LLM:       Ollama or another OpenAI-compatible local endpoint
Embeds:    Ollama or ONNX/local embedding provider
Relational: SQLite
Graph:     Cognee local graph backend
Vector:    LanceDB
```

## Freshness warning

Cognee may build graph memory in the background. A memory written moments ago may not be immediately recallable. For current-turn state, keep notes in session context before promoting them.
