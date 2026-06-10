# Combat System Specification

## Context

The game has movement, dashing, stamina, and a gather "swing" that plays an attack
animation against resource nodes, but **no actual combat**: no enemies, no health in
the ECS (player HP lives in Svelte reactive state), no melee hit detection in front
of the player, and no incoming-damage path. This document specifies the combat system
to be built after the planned engine refactor.

Design decisions locked with the user:

* **Aiming:** mouse free-aim (swing toward cursor at any angle).
* **Targets:** real enemies with health + AI are spawned.
* **Hit region:** a sweeping arc that can hit multiple targets in one swing.
* **Damage:** full two-way (player deals and receives damage, with i-frames, knockback, death/respawn).

This is a specification only. No implementation until the refactor lands.

---

## 1. Health & Damage Foundation

* **Overview:** A shared ECS `health` component used by both the player and enemies, plus a single damage-application path that all attacks route through. Player HP migrates out of Svelte-only state into this component (UI continues to mirror it for the HUD).
* **Health Component:**
  * **Current HP / Max HP:** The pool. Death triggers at `current <= 0`.
  * **Faction / Team:** Distinguishes player from hostiles so an attack only damages valid targets (no friendly fire, resources remain a separate gather path).
  * **Invulnerable flag + timer:** While active, incoming damage is ignored (drives i-frames; also set by the existing neutral-dash invulnerability).
* **Damage Application (single entry point):** Every hit, player-dealt or enemy-dealt, passes through one function taking: target entity, damage amount, source position (for knockback direction), and a knockback strength.
  * **Steps:** reject if target invulnerable or wrong faction; subtract HP; apply knockback impulse; trigger hit reaction (flash, SFX, floating damage number); start i-frames if the target uses them; if HP reaches zero, route to death handling.
* **Knockback:** A short impulse applied along the source-to-target vector, decaying over a configurable time. Reuses the per-axis collision sliding from movement so knockback respects walls.
* **Configurable Parameters:**
  * Player max HP
  * Per-enemy-type max HP
  * Default knockback strength and decay time
  * I-frame durations (player-hit i-frames, separate from dash invulnerability)

---

## 2. Player Attack

### 2.1 Swing

* **Activation:** Left mouse button. (E remains the gather/interact key; mouse already drives the facing vector, so attack aim is free.)
* **Aiming:** Free-aim toward the mouse cursor. The swing's hit region and VFX point at the true cursor angle; the character sprite still flips only left/right (no up/down frames), so the **swing-arc VFX is what communicates direction** on vertical swings.
* **Mechanism:** Plays the attack animation (`Warrior_Attack1`), spawns a one-shot arc hit region in the facing direction, and resolves all valid targets caught in the arc on the same swing.
* **Hit Region (sweeping arc):**
  * A cone defined by a **reach** (radius from the player) and an **arc width** (total angle centered on the aim direction).
  * **Multi-hit:** every hostile whose center falls inside the cone is hit once. A per-swing hit set prevents double-hitting the same target within one swing.
  * Detection is angle + range based (aim direction vs direction-to-target, plus distance), not full AABB sweep.
* **Effect on hit:** routes each caught target through the damage path (Section 1) with the swing's damage and knockback. Reuses existing hit feedback: squash/stretch, hit flash, particle spray, floating damage text, camera shake, and a swing SFX.
* **Resource Cost:** Configurable stamina cost per swing. Swing is blocked (or the player is staggered out of attacking) below a minimum stamina floor.
* **States:**
  * **Windup → Active → Recovery:** the arc only deals damage during the active window of the animation, not on the windup or recovery frames.
  * **Cooldown:** a configurable minimum time between swings (swing rate), independent of the animation length.
  * **Lockouts:** attacking is disabled while dashing; movement is allowed during a swing (no root) unless we choose to slow it (configurable move-speed multiplier during the active window).
* **Combo (optional, behind a flag):** alternating `Warrior_Attack1` / `Warrior_Attack2` on consecutive swings within a short window, for visual variety. No separate combo damage scaling in the first pass.
* **Configurable Parameters:**
  * Swing damage
  * Arc reach (radius) and arc width (angle)
  * Swing cooldown / attack rate
  * Stamina cost per swing and minimum-stamina floor
  * Active-window timing (fraction of the animation that deals damage)
  * Knockback dealt to targets
  * Optional move-speed multiplier during the active window

---

## 3. Enemies

* **Overview:** Hostile entities that spawn into the world, carry the shared `health` component, pursue and attack the player, and drop rewards on death.
* **Enemy Entity:** position, `health` (hostile faction), a movement speed, an AI state, an attack definition, and a collider.
* **Spawning:**
  * **Placement:** authored spawn points and/or radius-based spawns around regions.
  * **Caps:** a configurable maximum live count per region to bound difficulty and performance.
  * Reuses viewport culling so off-screen enemies render cheaply.

### 3.1 Enemy AI

* **States:**
  * **Idle / Patrol:** default behavior until the player enters the aggro radius.
  * **Chase:** moves toward the player using the same collision-aware movement as the player (per-axis slide, corner nudge).
  * **Attack:** when within attack range, performs a telegraphed attack on a cooldown.
  * **Stagger:** brief interrupt when hit (knockback + can't act), then resumes.
  * **Leash / Return:** if the player escapes beyond a leash radius, return toward the spawn point and reset to Idle.
* **Configurable Parameters (per enemy type):**
  * Aggro radius and leash radius
  * Move speed
  * Attack range, attack damage, attack cooldown
  * Telegraph (windup) duration before the hit lands
  * Stagger duration

### 3.2 Enemy Attack

* **Mechanism:** on cooldown and in range, the enemy plays a windup (telegraph), then activates a hit region (small arc or box in the player's direction) that routes into the player's damage path.
* **Constraints:** the telegraph gives the player a reaction window; i-frames (from being hit or from a dash) cause the enemy hit to be ignored.

### 3.3 Enemy Death

* **Trigger:** HP `<= 0` via the damage path.
* **Effect:** play a death animation/dissolve, despawn the entity, award XP to the player (reuses the existing RPG XP/skill state), and optionally spawn loot pickups (reuses the existing `pickup` component and floating-text/particle feedback).
* **Configurable Parameters:** XP reward, loot table / drop chances per enemy type.

---

## 4. Player Receiving Damage

* **Overview:** The player is a valid damage target via the same path as enemies, with reaction feedback and a death/respawn loop.
* **Incoming Hit:**
  * **Effect:** subtract HP, apply knockback, trigger a hurt reaction (red hit flash, camera shake, hurt SFX), and start player i-frames.
  * **Invulnerability sources:** post-hit i-frames and the existing neutral-dash invulnerability both suppress incoming damage.
* **Death & Respawn:**
  * **Trigger:** player HP reaches zero.
  * **Effect:** enter a death state (disable input, play death feedback), then respawn at the spawn point with HP restored.
  * **Penalty (configurable):** none by default; optionally a resource/stamina penalty or a brief respawn delay.
* **HUD:** the existing HP readout reflects the `health` component live; stamina bar already exists.
* **Configurable Parameters:**
  * Player i-frame duration after a hit
  * Knockback taken
  * Respawn point, respawn HP, respawn delay, optional penalty

---

## 5. Combat State & Conditions

* **In-Combat Flag:** the player is "in combat" while recently dealing or taking damage, or while a hostile is aggroed; it clears after a configurable timeout. This drives the **combat vs passive stamina regeneration** already defined in the Stamina System (combat regen applies while in combat).
* **Targeting rules:** attacks only affect the opposing faction. Resource gathering (E) stays a separate system from combat swings, even though both use the attack animation.
* **Global conditions / edge cases:**
  * No attacking while dashing; no damage taken during invulnerability windows.
  * A single swing cannot hit the same target twice.
  * Knockback (player and enemy) respects walls via existing collision sliding.
  * Off-screen enemies stay culled but continue AI ticks within an active radius.
* **Configurable Parameters:**
  * In-combat timeout
  * Active AI radius (how far from the player enemies keep simulating)

---

## 6. Open Questions for the Refactor

* Should the player `health` component be the source of truth with the Svelte HUD mirroring it, or should the Svelte state stay authoritative and the ECS component mirror it?
* Which enemy sprite(s) from the asset set are the first enemy type (e.g. goblin variants), and do they need new directional/attack frames or is L/R flip + arc VFX enough?
* Is left-click the final attack binding, and should it be rebindable through the existing input-config system alongside HARVEST/dash?
* Does the first enemy type need ranged attacks, or melee only for the initial pass?
