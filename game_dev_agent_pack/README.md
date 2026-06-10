# Game Development Agent Pack

This pack gives AI agents stable development rules for working inside a game codebase without turning it into spaghetti.

It focuses on:

- game feel and player feedback;
- composition-first system design;
- reusable mechanics;
- readable UI/UX;
- robust typing and clear module boundaries;
- documentation that explains intent;
- implementation checklists for future agents.

Recommended placement in the repo:

```text
AGENTS.md
docs/
  game-feel-and-feedback.md
  composition-first-development.md
  mechanic-implementation-standard.md
  ui-ux-game-guidelines.md
  entity-ai-guidelines.md
  verification-playtest-checklist.md
.agents/
  game-development-skill.md
  checklists/
    feature-implementation-checklist.md
    feedback-juice-checklist.md
    refactor-safety-checklist.md
templates/
  feature-design-note.md
  system-design-note.md
```

Start by giving the agent `AGENTS.md` and `.agents/game-development-skill.md`. Use the docs/checklists when implementing mechanics, enemies, UI, or refactors.
