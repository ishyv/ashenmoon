# Local Cognee Setup

`hu agent setup` creates `.agent-local/memory/cognee/` with config examples for the `hu agent mcp` server.

## Expected local files

```txt
.agent-local/
  memory/
    cognee/
      README.md
      .env.example
      config.toml
      scripts/
        remember.sh
        recall.sh
        forget.sh
```

`.agent-local/` is private runtime state and should be gitignored.

## Commands

Check setup:

```bash
hu agent doctor <project-path>
```

Run the MCP server:

```bash
hu agent mcp <project-path>
```

The wrapper scripts under `.agent-local/memory/cognee/scripts/` are debugging fallbacks. Normal agents should use MCP tools.

## Setup checklist

1. Install or build `cognee-cli`.
2. Copy `.agent-local/memory/cognee/.env.example` to `.env`.
3. Configure a local LLM/embedding provider, preferably Ollama for local use.
4. Run `hu agent doctor <project-path>`.
5. Configure your MCP-capable agent client to launch `hu agent mcp <project-path>`.

## Local Ollama example

```bash
ollama serve
ollama pull llama3.2:3b
```

Then set local OpenAI-compatible variables in `.agent-local/memory/cognee/.env`.
