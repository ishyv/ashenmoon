# Contributing

Thanks for considering a contribution! This repo is small and the maintainer
budget is one person, so the bar for inclusion is:

1. The change is genuinely useful to the game (not just your fork).
2. The diff is reviewable in one sitting.
3. It respects the architecture in
   [`docs/ASHENMOON_AGENT_PROJECT_ORGANIZATION_RULES.md`](docs/ASHENMOON_AGENT_PROJECT_ORGANIZATION_RULES.md):
   game rules live in `src/lib/domain/` (pure) and `src/lib/state/`, never in
   `.svelte` or Pixi files.

## Before you start

- **For anything beyond a typo or one-line fix**, please open an issue first.
- Ashenmoon is a standalone SvelteKit + Pixi.js game. There is no bot, no
  bridge, and no sibling repo to check out. Clone, install, run.

## Local setup

```bash
git clone https://github.com/ishyv/ashenmoon.git
cd ashenmoon
bun install
bun run dev              # dev server on the default vite port
```

## Local checks (run before pushing)

```bash
bun run check    # svelte-kit sync + svelte-check; must be 0 errors, 0 warnings
bun run build    # must succeed
bun run test     # vitest; pure system logic must have tests
```

Any new pure rule logic (`src/lib/domain/**`) ships with a colocated `*.test.ts`.

## Code style

- **Biome / Prettier**: not configured yet, match the surrounding style.
  Two-space indent, double quotes, trailing commas, semicolons.
- **TypeScript strict mode** is on (`svelte-check` enforces). Avoid `any`,
  `// @ts-ignore`, `// @ts-expect-error` unless there's a clear reason; if you
  must, add a one-line comment explaining why.
- **No `console.log` in shipped code.** Diagnostic logs should be gated behind
  an env var or removed before merge.
- **HyvUI design law** (see [`CLAUDE.md`](CLAUDE.md)) is binding for any UI
  work: no raw hex, lowercase UI copy, no em-dashes in copy, token colors only.
- **Svelte 5 reactivity**: when seeding state from loader props, snapshot with
  `untrack(() => data.field)` to make the intent explicit.

## Architecture notes

- Pure game rules belong in `src/lib/domain/` and are framework-free and unit
  tested.
- Reactive `.svelte.ts` orchestrators (survival, quests, rpg-state) call pure
  systems and then persist; they do not own rules.
- Extend items via the trait/effect DSL in `src/lib/domain/items/`, not per-item
  `onUse` callbacks.

## Commit messages

One topic per commit. Past tense or imperative both fine. The subject line
should make sense in `git log --oneline`. The body should explain *why*, not
just *what*.

## Reporting bugs

Open an issue with what you expected, what actually happened, steps to
reproduce, and your Node/Bun version and OS.

## License

By contributing, you agree your work will be MIT-licensed under the same terms
as [LICENSE](LICENSE).
