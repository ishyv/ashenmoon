# Developer & Agent Guidelines

> [!IMPORTANT]
> **Source of Truth Memory Instruction**:
> Use the game development guide folder ([AGENTS_MUST_READ_GAMEDEV_GUIDES](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/AGENTS_MUST_READ_GAMEDEV_GUIDES)) and its [rules file](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/AGENTS_MUST_READ_GAMEDEV_GUIDES/AGENTS.md) as the source of truth.
> 
> When implementing or refactoring anything in this game codebase, prioritize composition-first design, reusable systems, strong typing, clear player feedback, and useful documentation. Do not solve problems with short-sighted one-off code unless the feature is truly one-off and the tradeoff is documented.
> 
> Every player-facing mechanic should include readable feedback: visual, audio, UI, animation, or state feedback as appropriate. A mechanic is not finished just because the state changes; the player must understand and feel what happened.
> 
> Before changing code, identify the player-facing purpose, affected components/systems, reuse opportunities, feedback requirements, risks, and verification steps. Keep the codebase smaller, clearer, and more modular over time.

This document establishes coding rules, refactoring checklists, and quality guardrails to keep the codebase modular, robust, and clean. **All future agent runs must follow these guidelines strictly.**

---

## 1. Core Codebase Rules

1. **Favor Composition Over Monolithic Design**:
   - Never write logic directly inside `GameEngine` or add state to it unless it represents a global resource or is part of the PixiJS shell container.
   - Separate functionality into modular, parameter-driven systems that run queries against miniplex components.
2. **Strict Typing (Zero Laxity)**:
   - Do not use broad `any` types or vague object shapes.
   - Do not use careless casting (`as any`) to bypass the TypeScript compiler. If a Svelte store or API payload has a complex type, define it explicitly.
3. **Reason-First Commenting**:
   - Comments must explain **why** code is written, not *what* it does.
   - Use the following annotations for critical logic:
     ```ts
     // WHY: Explains non-obvious reasoning or workarounds.
     // RISK: Explains what would break if changed.
     // INVARIANT: Explains invariants/assumptions being protected.
     ```
4. **No Spaghetti Imports**:
   - Keep systems decoupled. A system (e.g. `movementSystem`) should never import or directly mutate another system's internal state. Communication must occur via components in the ECS `world` or flags in shared `Resources`.

---

## 2. Refactoring Checklist (Bevy-Aligned)

Before refactoring any engine code, verify:
- [ ] **Data-Driven**: Does the new component belong on the miniplex `Entity` interface?
- [ ] **State Separation**: Is global/singleton data structured as a Resource class/interface?
- [ ] **Pure Systems**: Is the logic written as a stateless, parameter-driven function that can be run in the update tick?
- [ ] **Seamed Interface**: Does the main `GameEngine` orchestrator expose the minimal compatibility API without leaking private details?

---

## 3. Verification Checklist

After editing any code, always run the following tests:
- [ ] **Typecheck**:
  ```bash
  bun run check
  ```
- [ ] **Automated Tests**:
  ```bash
  bun test
  ```
- [ ] **Build Check**:
  ```bash
  bun run build
  ```

---

- **DO NOT** let `engine.ts` grow beyond its orchestrator responsibilities. If you add a new gameplay mechanic (e.g., fishing, farming, combat), create a dedicated system file.
- **DO NOT** bypass Svelte reactive states for UI triggers. Use `$state` stores (`rpg-state.svelte.ts`, `stamina.svelte.ts`) for HUD integration.
- **DO NOT** use raw hex colors in Tailwind styles or custom components. Always reference CSS variables from `theme.css`.
- **DO NOT** add third-party motion libraries or complex spring physics unless requested. Maintain the established motion budget (180ms fade transitions).

---

## 5. Parallel Agent Coordination & Best Practices

When working on this codebase in parallel with other agents:
1. **Explicit Prop Bindings**:
   - In Svelte 5 components, avoid destructuring callbacks like `onClose` directly from `$props()`. Instead, declare a props object (e.g. `let props = $props<{ onClose: () => void }>();`) and invoke the function directly via wrapper or `props.onClose()`. This prevents event handler binding failures in compiled client targets.
2. **Defensive Diagnostic Logging**:
   - Any runtime initialization or game tick systems must be wrapped in `try/catch` blocks.
   - Pipe exceptions to `devConsole.log(err.message, "error")` so that issues are visible in-game even if the browser console is hidden.
3. **Architecture Synchronization**:
   - Check the roadmap in [architecture.md](file:///c:/Users/Hyv/T/projects/typescript/ashenmoon/docs/architecture.md) before implementing changes. Update it when you complete a migration phase so parallel agents remain in sync.

