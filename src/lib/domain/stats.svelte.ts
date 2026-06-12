/**
 * Reactive orchestrator over the pure stat model. Derives the player's
 * effective stats from character level + active statuses and owns character
 * XP/level-up writes (mirroring skill-xp.ts: this is the only writer of
 * characterLevel). No rules here — composition of domain/stats/ functions.
 *
 * Level-up feedback (VFX ring, sound, HUD flash) is driven by `levelUpEvent`,
 * a seq-bumped reactive event consumed by the HUD and the engine.
 */

import { gameState } from "$lib/state/game-state.svelte";
import { setRpgProfile } from "$lib/state/rpg-actions.svelte";
import { getStatusModifiers } from "$lib/domain/status-effects.svelte";
import {
  applyModifiers,
  computeBaseStatsAtLevel,
  statusModifiersToStatModifiers,
} from "./stats/stat-calculation";
import { characterXpForLevel, MAX_LEVEL, MIN_LEVEL } from "./stats/player-stat-growth";
import type { PlayerStats } from "./stats/stat-types";

export function getCharacterLevel(): number {
  return gameState.rpg.profile?.characterLevel ?? MIN_LEVEL;
}

export function getCharacterXp(): number {
  return gameState.rpg.profile?.characterXp ?? 0;
}

/** XP threshold for the current level (HUD progress denominator). */
export function getCharacterNextXp(): number {
  return characterXpForLevel(getCharacterLevel());
}

const derived = $derived.by<PlayerStats>(() => {
  const base = computeBaseStatsAtLevel(getCharacterLevel());
  return applyModifiers(base, statusModifiersToStatModifiers(getStatusModifiers()));
});

/** Effective player stats: level growth with status multipliers applied. */
export function getPlayerStats(): PlayerStats {
  return derived;
}

/** Bumped once per level-up so VFX/HUD can react without polling. */
export const levelUpEvent = $state<{ seq: number; level: number }>({ seq: 0, level: 0 });

/**
 * Grant character XP, carrying overflow across level-ups and clamping at
 * MAX_LEVEL (further XP at cap is discarded). Returns the number of levels
 * gained so the caller can fire feedback.
 */
export function awardCharacterXp(amount: number): number {
  const profile = gameState.rpg.profile;
  if (!profile || amount <= 0) return 0;

  let level = profile.characterLevel ?? MIN_LEVEL;
  let xp = (profile.characterXp ?? 0) + amount;
  let gained = 0;

  while (level < MAX_LEVEL && xp >= characterXpForLevel(level)) {
    xp -= characterXpForLevel(level);
    level += 1;
    gained += 1;
  }
  if (level >= MAX_LEVEL) xp = Math.min(xp, characterXpForLevel(MAX_LEVEL) - 1);

  setRpgProfile({ ...profile, characterLevel: level, characterXp: xp });

  if (gained > 0) {
    levelUpEvent.seq += 1;
    levelUpEvent.level = level;
  }
  return gained;
}
