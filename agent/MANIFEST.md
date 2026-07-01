# Agent Manifest

This manifest declares the canonical agent module files installed by `hu agent setup`.

| Path | Kind | Purpose |
| --- | --- | --- |
| `AGENTS.md` | entrypoint | Root bootstrap that redirects agents here. |
| `agent/README.md` | entrypoint | Module overview and usage. |
| `agent/MANIFEST.md` | manifest | Canonical file list. |
| `agent/routing.md` | router | Task-to-context mapping. |
| `agent/protocols/before-work.md` | protocol | Required discovery before edits. |
| `agent/protocols/completion.md` | protocol | Required final reporting and memory promotion shape. |
| `agent/protocols/verification.md` | protocol | Test/build/check expectations. |
| `agent/rules/architecture.md` | rule | Ownership and boundary rules. |
| `agent/rules/code-quality.md` | rule | Implementation standards. |
| `agent/rules/testing.md` | rule | Behavior-first testing rules. |
| `agent/memory/README.md` | memory | Memory system overview. |
| `agent/memory/policy.md` | memory | What belongs in Cognee memory. |
| `agent/memory/cognee.md` | memory | Cognee backend contract. |
| `agent/memory/local-setup.md` | memory | Local setup instructions. |
| `agent/memory/usage.md` | memory | Recall/remember workflow. |
| `agent/workflows/generic-code-change.md` | workflow | Default code-change workflow. |
| `agent/templates/agent-context-packet.md` | template | Context packet shape for new workflows. |
| `agent/indexes/by-task.md` | index | Alternate task lookup. |

## Local files

`hu agent setup` and `hu agent config` create local files under `.agent-local/`. Those files are runtime state and should not be committed.

## Customization

Project-specific rules should be added as new files under `agent/rules/`, `agent/workflows/`, or `agent/knowledge/`, then linked from `routing.md` and this manifest.
