# Agent Routing

Use this file to decide what to load. Prefer the smallest useful route.

| If the task is... | Read first | Then read/use if touched |
| --- | --- | --- |
| Any code change | `protocols/before-work.md`, `rules/architecture.md`, `rules/code-quality.md`, `workflows/generic-code-change.md` | `protocols/verification.md` |
| Bug fix | `protocols/before-work.md`, `rules/testing.md`, `workflows/generic-code-change.md` | Existing tests around the failing path |
| Refactor | `rules/architecture.md`, `rules/code-quality.md`, `workflows/generic-code-change.md` | Architecture or decision docs owned by the project |
| Test work | `rules/testing.md`, `protocols/verification.md` | Relevant source files and existing tests |
| Need prior project context | `memory/README.md`, `memory/policy.md`, `memory/usage.md` | MCP tool `agent_recall` |
| Learned durable project fact | `memory/policy.md`, `memory/usage.md` | MCP tool `agent_remember` |
| Memory seems broken | `memory/local-setup.md`, `memory/cognee.md` | `hu agent doctor <path>` |
| Documentation work | `MANIFEST.md`, this file, relevant `rules/` or `workflows/` files | Existing docs that claim source-of-truth status |
| New recurring workflow | `templates/agent-context-packet.md`, existing `workflows/` examples | Add the workflow to `MANIFEST.md` and `indexes/by-task.md` |

## Missing route rule

If no route matches, create a short context packet before editing:

1. What is the task?
2. Which source files define the behavior?
3. Which tests or checks prove it works?
4. Which docs/rules could constrain it?
5. Which memory query would recover prior context?

If the same missing route appears twice, add a workflow. Repeated manual thinking is a bug with manners.
