# Agent Knowledge Module

This directory is the project’s agent-facing knowledge module: the small public API agents use before touching the repo.

## How to use this module

1. Read this file.
2. Open `routing.md` and pick the route that matches the task.
3. Load the route’s context packet. Do not shovel the whole repo into context.
4. If prior context may matter, use `agent/memory/usage.md` and recall through Cognee.
5. Inspect the named files and symbols before editing.
6. Follow `protocols/verification.md` before reporting completion.

## Directory map

- `MANIFEST.md` lists canonical files and their roles.
- `routing.md` maps task types to the files agents should read.
- `protocols/` contains always-on process rules.
- `rules/` contains durable project standards.
- `memory/` defines Cognee-backed memory policy and usage.
- `workflows/` contains task recipes.
- `indexes/` contains alternate lookup tables.
- `templates/` contains reusable planning/context packet formats.

## Local runtime state

`hu agent setup` also creates `.agent-local/memory/cognee/` for local Cognee configuration. `.agent-local/` is private runtime state and should not be committed.

## Maintenance rule

If a new recurring task appears, add or update a workflow instead of relying on tribal memory. One-off notes can live elsewhere, but recurring agent behavior belongs here.
