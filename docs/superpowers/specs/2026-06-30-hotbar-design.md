# Hotbar + HUD Rework Design Spec

## Overview

This document captures the architecture, design decisions, and implementation constraints of Ashenmoon's hotbar and HUD rework (Q2 2026).

**What:** A unified hotbar system for item binding and skill cooldown display, integrated with a shared HUD fade lifecycle that gives the player responsive visual feedback on game state.

**Why:** Players need quick item access via 1-9 keys. Skills need visible cooldown state. All HUD surfaces should respond to player activity (fade in on interaction, fade to rest state during quiet periods) to reduce visual clutter while keeping critical information accessible.

**Aesthetic:** Dark fantasy, organic feel. No ornamental overlays or glass-morphism. Minimal visual language: grayscale desaturation for cooldowns, gold pulse on ready, hollow-knock sound for empty slots. The HUD breathes as one organism, governed by a shared fade timer.

---

## Data Model

### Types

**File:** `src/lib/domain/hotbar-types.ts`

```typescript
export type HotbarSlot = { itemId: ItemId } | null;
export type HotbarBinding = HotbarSlot[]; // always length 9
export const HOTBAR_SIZE = 9;
```

A hotbar consists of nine slots (1-9 keys). Each slot is either null (empty) or an object holding a single item ID. Invalid item IDs are rejected at the boundary (rpg-commands normalizer).

### Persistence

**Field:** `RpgPlayerState.profile.hotbar`

Located in `src/lib/domain/rpg-types.ts` line 68. Type is `(string | null)[]`, persisted to localStorage and recovered on profile hydration. Default is an array of 9 nulls.

**Normalizer:** `src/lib/state/persistence/rpg-commands.ts`

The `normalizeHotbar()` function (line 154) sanitizes deserialized hotbar data. If the value is not an array, or contains non-string/non-null entries, they are coerced to null. The array is sliced to HOTBAR_SIZE (9 elements), padded with nulls if shorter, and revalidated on every profile save. This is the **profile normalizer gotcha**: new fields in the profile require an explicit normalizer entry or they are silently stripped.

---

## Hotbar Activate / Action Priority

When a player presses a hotbar key (1-9), the hotbar state's `activate()` method determines what happens in this order:

1. **Consume** — Food/drink items are consumed immediately.
2. **Equip / Unequip** — Tools and weapons toggle equip state.
3. **Study** — Blueprints are marked as studied.
4. **Place** — Placeable buildings; currently deferred (requires engine reference, not available at state layer).
5. **Empty slot** — If the slot is null or unbound, the UI shows a shake animation and plays a hollow-knock sound.

**Code:** `src/lib/state/hotbar.svelte.ts` lines 69-85 (`prioritizeActions`) and 87-121 (`executeAction`).

The `activate()` method returns one of three status strings:
- `'ok'` — action executed (or no enabled action found, but item exists).
- `'empty'` — item not in inventory and not equipped; shake + sound plays.
- `'unbound'` — slot is null; no feedback.

All three cases trigger `hudActivity.signal()` to reveal the HUD, and a 200ms keypress flash animation on the slot.

---

## UIInputController

**File:** `src/lib/core/input/input-controller.svelte.ts`

### Purpose

Single authoritative ledger for all UI-layer keyboard bindings. Replaces ad-hoc `handleGlobalKeyDown` scatter in component code. Separates from `InputResource` intentionally: InputResource owns canvas/game-loop input (WASD, attacks, dash), while UIInputController owns panel toggles, menu navigation, and hotbar slots.

### InputLayer

Four dispatch layers, highest-to-lowest priority:

```typescript
type InputLayer = 'menu' | 'overlay' | 'hotbar' | 'game';
```

- **menu** — Dialogue, quest log, main menu.
- **overlay** — Panels like inventory, crafting, equipment.
- **hotbar** — 1-9 keys, no deps on above layers.
- **game** — Canvas input, movement, attacks; runs last.

A handler returning `true` stops dispatch. Returning `false` passes to the next layer.

### Conflict Detection

At registration time, the controller warns if any key is already registered in the same layer. Example:

```typescript
uiInputController.register({
  action: 'hotbar_1',
  keys: ['1'],
  layer: 'hotbar',
  handler: (e) => { /* ... */ }
});
```

Runtime duplicate detection also warns (once per pair per layer, to avoid spam).

### Cross-Layer Validation

The `validateAgainst(gameBindings)` method (line 91) logs warnings if a UI-layer key overlaps with game InputResource bindings. Not fatal, just diagnostic.

### UIAction Type

Located in `src/lib/domain/game-events.ts` line 49. Covers all UI actions including hotbar_1 through hotbar_9, inventory toggle, panel opens, menu navigation, etc.

---

## Drag-Drop System

**File:** `src/lib/state/drag.svelte.ts`

A minimal singleton tracking the active drag operation:

```typescript
export interface DragPayload {
  source: 'inventory' | 'hotbar';
  itemId: ItemId;
  fromSlot?: number; // 0-based index if source is 'hotbar'
}

export const dragState = {
  get active(): DragPayload | null { return _active; }
  set(payload: DragPayload): void { _active = payload; }
  clear(): void { _active = null; }
};
```

### Interaction Patterns

**Inventory → Hotbar slot:** Drag from inventory grid onto a hotbar slot. Binds the item to that slot. Plays `hotbar.bind` sound.

**Hotbar slot → Hotbar slot:** Drag one slot onto another. Swaps their contents. Plays `hotbar.reorder` sound.

**Hotbar slot → Outside:** Drag a slot outside all drop targets. The `ondragend` handler detects that the payload was never consumed and unbinds the slot. Plays `hotbar.unbind` sound.

### Ghost Suppression

The drag-over visual state (`.slot--dragover` class) is managed via local `dragOver` state in ItemHotbar. CSS shows a gold border and raised background when active. No separate ghost image is needed; the browser's default drag image is suppressed and replaced with a 24x24 item icon via `setDragImage()`.

---

## HUD Fade System

**File:** `src/lib/state/hud-activity.svelte.ts`

A shared singleton governing the visibility lifecycle of all HUD components (GameHud, SkillHotbar, ItemHotbar).

### Signal Call Sites

- **Hotbar activation** — `hotbarState.activate()` (line 200)
- **Movement** — Player moves (input system)
- **Damage taken** — Combat event
- **Stat change** — Stamina, health, status effects change
- **Any game event** — Gather, craft, consume, etc.

### Fade Contract

The singleton exposes constants and a poll-based API:

```typescript
const REVEAL_MS = 200;   // fade-in duration (CSS transition)
const LINGER_MS = 2500;  // stay visible after last signal
const FADE_MS = 1800;    // fade-out duration (CSS transition)
const REST_OPACITY = 0.2;     // barely-there at rest
const ACTIVE_OPACITY = 0.9;   // fully visible when active
```

**`isActive`** — returns `true` if `performance.now() - lastSignalAt < LINGER_MS`. Components poll this in a setInterval within a `$effect` block to derive opacity.

**Usage pattern:**

```typescript
let hudOpacity = $state(hudActivity.restOpacity);
$effect(() => {
  const id = setInterval(() => {
    hudOpacity = hudActivity.isActive
      ? hudActivity.activeOpacity
      : hudActivity.restOpacity;
  }, 100);
  return () => clearInterval(id);
});
```

CSS handles the transition duration (shorter for fade-in, longer for fade-out):

```svelte
<div
  style="opacity: {hudOpacity}; transition: opacity {hudActivity.isActive ? hudActivity.revealMs : hudActivity.fadeMs}ms ease;"
>
```

### CSS Variables

**File:** `src/theme.css` lines 37-45.

```css
--hud-slot-size: 2.5rem;
--hud-fade-opacity: 0.2;
--hud-active-opacity: 0.9;
--hud-reveal-ms: 200ms;
--hud-linger-ms: 2500ms;
--hud-fade-ms: 1800ms;
```

These mirror the singleton's constants and allow CSS-only transitions without re-deriving state in every component.

---

## SkillHotbar Cooldown Rework

**File:** `src/lib/ui/elements/SkillHotbar.svelte`

### Before

Cooldown was shown via an SVG radial progress clock overlaid on the skill icon. Visual complexity, potential performance cost.

### After

Cooldown is shown via CSS `grayscale()` filter:

```css
filter: grayscale({evadeCooldown > 0 ? 1 : 0});
transition: filter {evadeCooldown > 0 ? '0s' : '0.5s ease'}, 
            border-color 0.15s ease, 
            box-shadow 0.15s ease;
```

When on cooldown, the slot is fully desaturated (grayscale 1). When ready, the filter animates out over 0.5s, revealing color. This mimics a "color bleed-back" effect, signaling recovery without visual noise.

### Ready Flash

When a cooldown expires (transition from `cooldown > 0` to `cooldown === 0`), a 300ms gold-border pulse plays via a CSS keyframe animation:

```css
@keyframes skill-ready-pulse {
  0% { border-color: var(--accent); box-shadow: 0 0 4px var(--accent); }
  100% { border-color: var(--line); box-shadow: none; }
}

.skill-slot.ready {
  animation: skill-ready-pulse 300ms ease-out forwards;
}
```

Simultaneously, the `skill.ready` sound plays (line 50 in SkillHotbar).

### Note on Recipes

`skill.ready` uses the `'discovery'` recipe (quiet, settle-like sound). A `'swoosh'` recipe is planned for a future audio pass but does not yet exist in the recipe system.

---

## Sound Design

**File:** `src/lib/audio/sound-manifest.ts`

All hotbar sounds route through the `'ui'` bus, which is mixed separately from gameplay SFX. This keeps hotbar feedback consistent even if the player mutes the main sfx channel.

| Sound ID | Bus | Recipe | Trigger | Notes |
|----------|-----|--------|---------|-------|
| `skill.ready` | ui | discovery | Cooldown expires | Quiet settle; gain 0.35; 80 cents pitch jitter |
| `hotbar.bind` | ui | pickup | Drag item onto empty slot | Confirm; gain 0.4; 80 cents pitch jitter |
| `hotbar.reorder` | ui | pickup | Swap two hotbar slots | Lighter; gain 0.25; 120 cents pitch jitter |
| `hotbar.unbind` | ui | fiberPull | Drag slot outside all targets | Soft fabric texture; gain 0.3; 100 cents pitch jitter |
| `hotbar.activate.empty` | ui | uiInvalid | Press number key with no item / qty=0 | Hollow knock; gain 0.35; 60 cents pitch jitter |

**Spatial:** None of these sounds are spatial (no 3D positioning by world location).

**Audio Engine API:** All sounds are triggered via `play(id: SoundId)` from `$lib/audio/audio-engine`.

---

## Layout

**File:** `src/routes/+page.svelte` (game page)

The HUD stack lives in a bottom-center container (`.bottom-hud-stack`). Stack order is:

1. **SkillHotbar** — Top; shows the four active skills (Evade, Focused Gather, Driving Thrust, Fell Sweep).
2. **ItemHotbar** — Below skills; shows the nine item binding slots.
3. **GameHud** — Below hotbar; shows vitals (health, stamina, temperature, hunger, etc.).

All three components apply the shared HUD fade opacity, so they reveal and fade as a cohesive unit. Each component uses `pointer-events: auto` so they remain interactive even when faded.

---

## Known Gaps / Future Work

### Placement Action

Placement (binding a building blueprint to the hotbar and pressing its key to start placement) is deferred. It requires a reference to the engine so the UI can invoke a placement start. This was intentionally left out of Phase 9 to avoid tightly coupling the hotbar state layer to the Pixi engine. Future work will add a bridge (e.g., a callback or event system) to wire placement at the page layer.

### Menu Danger Keys

In the UIInputController, `menu_danger` actions (e.g., delete, discard) are bound to `'shift'`. They should use `'shiftright'` for consistency with the HyvUI button system. This is a minor carry-forward from Phase 2 and does not affect hotbar function.

### Comment Style

The `hud-activity.svelte.ts` file has a multi-paragraph block comment (lines 1-29) that violates CLAUDE.md's no-docstring rule (comments should be single-line, not multi-paragraph documentation). This is noted for cleanup in a future style pass but does not affect function.

### Swoosh Recipe

The `skill.ready` sound currently uses the `'discovery'` recipe (quiet, organic). A dedicated `'swoosh'` recipe for a more energetic skill-ready feel is planned for a future audio pass, pending audio design review.

---

## Related Files

- `src/lib/domain/hotbar-types.ts` — Type definitions
- `src/lib/domain/game-events.ts` — UIAction enum
- `src/lib/state/hotbar.svelte.ts` — Hotbar reactive state and activate logic
- `src/lib/state/drag.svelte.ts` — Drag payload singleton
- `src/lib/state/hud-activity.svelte.ts` — Shared HUD fade lifecycle
- `src/lib/core/input/input-controller.svelte.ts` — UIInputController (ledger + dispatch)
- `src/lib/ui/elements/SkillHotbar.svelte` — Skill cooldown display
- `src/lib/ui/hud/ItemHotbar.svelte` — Item binding UI
- `src/lib/audio/sound-manifest.ts` — Sound definitions (SoundId enum, SOUNDS map)
- `src/lib/state/persistence/rpg-commands.ts` — Profile normalizer (includes normalizeHotbar)
- `src/theme.css` — CSS vars for HUD fade system
