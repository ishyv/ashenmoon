<!--
Sync Impact Report
Version change: [TEMPLATE] → 1.0.0
Rationale: Initial ratification. The template's placeholder tokens were never filled in;
this fills them for the first time from the project's existing, already-binding
operating doc (CLAUDE.md) and the engineering conventions observed and enforced
throughout this project's history. Filling a placeholder template for the first
time is a MAJOR (1.0.0) version per governance policy below.
Modified principles: n/a (initial fill)
Added sections: Core Principles I-V, Technology Stack & Constraints, Development
  Workflow, Governance
Removed sections: none
Templates requiring updates:
  - .specify/templates/plan-template.md — ✅ no change needed (its "Constitution
    Check" section already reads gates generically from this file rather than
    hardcoding principle names)
  - .specify/templates/spec-template.md — ✅ no change needed (no constitution
    references)
  - .specify/templates/tasks-template.md — ✅ no change needed (no constitution
    references)
  - .specify/templates/checklist-template.md — ✅ no change needed (no
    constitution references)
Follow-up TODOs: none — RATIFICATION_DATE is set to the date of this initial fill
  since no prior ratification exists to record.
-->

# Ashenmoon Constitution

## Core Principles

### I. Layered Architecture (NON-NEGOTIABLE)

Game rules are pure and live in `src/lib/domain/` and `src/lib/state/`; they MUST
NEVER be written directly in `.svelte` files or Pixi/core engine files. The
dependency direction is one-way: `ui/` (HUD, panels, intent) and `core/`
(Pixi + engine, input mapping) both call into `domain/` (pure rules); `domain/`
mutates `state/` (reactive `.svelte.ts` orchestrators, save/load); `state/`
hydrates `ui/` and `core/`. Reactive orchestrators in `state/` (e.g. `survival`,
`quests`, `rpg-state`, `stamina`, `status-effects`) call pure systems and then
persist — they do not own game rules themselves. Rationale: this is what makes
rules unit-testable without a browser/canvas, keeps Svelte/Pixi files thin and
disposable, and is the single architectural invariant every prior phase of this
project has been built and reviewed against.

### II. HyvUI Design Law (NON-NEGOTIABLE)

Any UI change that breaks these must be reverted, not "fixed in a follow-up":
no raw hex colors outside the critical-CSS block in `src/app.html` (use
`var(--accent)`/token classes, or project `--color-*` aliases derived via
`color-mix()`); no Tailwind built-in palette classes (`text-blue-500` etc.);
lowercase UI copy everywhere except the `<title>` tag; no em-dashes in UI copy
(code comments may use them); font weight defaults to 400; no `border-radius`
unless intentional and using a token; only two accent hues at base register
(gold `--accent`, teal `--signal`) — new hues enter only via theme registers;
error copy describes the condition, not the cause; a strict floor on inline
font sizes; prefer existing HyvUI patterns/scenes over hand-assembled
primitives; and a strict four-idiom motion budget (route transition, mount
reveal, primary click, form result) — nothing else without explicit user
sign-off. Rationale: consistency across a HUD-dense game surface degrades
fast without a hard, mechanically-checkable line; the project ships an
automated audit (`rg` checks for hex/Tailwind-palette/em-dash) specifically
so violations are catchable, not a matter of taste.

### III. Test Discipline: Pure Rules Proven, Engine Tiers Verified by Hand

Stable, pure domain rules (anything in `domain/` with no Svelte/Pixi
dependency) MUST have unit tests via `bun run test:unit` — never `bun test`
(Bun's own runner breaks on Svelte runes). Engine/Pixi-tier code (ECS systems,
render loops, VFX, input) is verified manually and that is a legitimate,
sufficient substitute, not a gap to apologize for. Test-driven development is
NOT the default; tests follow logic once its shape is settled, and any
decision to skip tests for a given change MUST state why inline (e.g. "engine
tier, manual-verification-only per project policy"). Rationale: this project's
domain layer is large and safety-critical to game balance (stat pipelines,
crafting rolls, combat resolution); its Pixi/engine layer is comparatively
cheap to eyeball in a running game and expensive to meaningfully mock.

### IV. Incremental Phased Delivery with Honest Known Debt

Non-trivial features ship as a sequence of independently reviewable phases
(see `docs/director/roadmap.md` for the running record), each with its own
scope, verification, and commit(s) — not as one large undifferentiated diff.
Scope deliberately cut from a phase MUST be written down as Known Debt with a
one-line reason, not silently dropped or left for someone else to discover.
Stat/skill plumbing MUST NOT be wired to a system that doesn't exist yet
merely to look complete (YAGNI) — an inert hook is acceptable and MUST be
labeled inert; a fabricated consumer system to justify it is not. Rationale:
this project is under continuous, agent-driven iteration; phased delivery
with an honest debt ledger is what keeps a fast-moving codebase reviewable
and keeps "done" meaning done.

### V. Definition of Done

A change is done only when: rules live in `domain/` or `state/`, never in
`.svelte` or Pixi files (Principle I); `bun run check` (svelte-kit sync +
svelte-check, strict TypeScript) is clean; types are explicit and invalid
content is validated at system boundaries, not defensively re-validated
everywhere internally; legacy code being superseded is marked `// legacy:`
or removed outright, not left ambiguous; and new pure logic has tests per
Principle III. Rationale: this is the project's own long-standing checklist
(see `CLAUDE.md`); codifying it here makes it a constitutional gate for
spec-driven work, not just a reminder at the bottom of a doc.

## Technology Stack & Constraints

SvelteKit 2 · Svelte 5 (runes) · Tailwind v4 (via `@tailwindcss/vite`) ·
`@hyvnt/hyvui` 0.4+ · Pixi.js 8 · `miniplex` ECS · MongoDB (`mongodb` driver) ·
Bun · `@sveltejs/adapter-node` for deploys. Ashenmoon is a standalone
dark-fantasy survival sandbox RPG — there is no companion service, no
in-memory bridge, and no sibling repo; `bun run dev` runs the whole thing.
Canonical commands: `bun install`, `bun run dev`, `bun run check`,
`bun run test:unit`, `bun run build`. The canonical architecture and milestone
spec lives at `docs/ASHENMOON_AGENT_PROJECT_ORGANIZATION_RULES.md` and MUST be
read before making structural changes.

## Development Workflow

Work happens on `main` by default; feature branches are created only when
explicitly requested. Commits never carry `Co-Authored-By` trailers, and git
login/auth/credential configuration is never touched by an agent. A
"director" role maintains `docs/director/roadmap.md` as a forward-looking map
(not a changelog), updated after each feature ships with what shipped, what
was deferred, and why. UI/UX changes are validated by actually running the
dev server and exercising the golden path and edge cases in-browser when
feasible; when it isn't, that limitation is stated explicitly rather than
implied by silence.

## Governance

This constitution codifies the non-negotiable subset of `CLAUDE.md` for
spec-driven (`speckit.*`) workflows; `CLAUDE.md` remains the authoritative
day-to-day operating document and the two MUST be amended together when a
non-negotiable changes. Amendments follow semantic versioning: MAJOR for a
backward-incompatible removal or redefinition of a principle, MINOR for a new
principle or materially expanded guidance, PATCH for clarifications and
non-semantic wording fixes. Every amendment updates `Last Amended` below and
records its rationale in a Sync Impact Report comment at the top of this file.
Any spec, plan, or task produced under `speckit.*` commands MUST verify
compliance with these principles before being treated as ready to implement;
deviations require explicit, written justification in that artifact's
Complexity Tracking section, not silent omission.

**Version**: 1.0.0 | **Ratified**: 2026-07-01 | **Last Amended**: 2026-07-01
