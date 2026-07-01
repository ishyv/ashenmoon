# Before Work Protocol

Before editing code or docs, gather enough context to avoid guessing.

## Required steps

1. Identify the route in `agent/routing.md`.
2. Read the route’s required files.
3. Inspect existing source before adding new files, APIs, imports, or patterns.
4. Search for current call sites before declaring a hook, API, or integration missing.
5. Check the project manifest before assuming a dependency is available.
6. State assumptions if context is incomplete.

## Search standard

Trace behavior to definitions and usages:

- definition files;
- neighboring implementations;
- tests;
- docs or decisions that own the boundary.

Do not invent symbols, paths, dependencies, or conventions. Go look. Future-you is not psychic, despite the branding.
