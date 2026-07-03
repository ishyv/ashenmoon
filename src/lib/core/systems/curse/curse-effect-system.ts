/**
 * Executes the small, spiteful curse effects a Possessed item can carry.
 * Each equipped cursed instance gets its own per-effect accumulator timer
 * (owned by the engine, passed in), mirroring the woodcraftXpTimer/
 * coldXpTimer idiom in engine.ts: accumulate dt, fire and reset on crossing
 * `effectiveCadence(effect, curseLevel)`.
 *
 * Curse effects have zero player-facing confirmation that they're
 * curse-driven — that's the point (see curse-effects.ts / tier-roll.ts).
 * Never call emitPlayerFeedback or spawn floating text from a handler here.
 *
 * A handful of effects (category_shift, item_falls_out, hotbar_swap,
 * lying_tooltip, blindness_flash, self_damage_tick, stat_zero_pulse,
 * brief_invisible) are registered in the pool but intentionally have no
 * handler yet — wiring them touches inventory/hotbar/UI/stat-pipeline
 * machinery beyond this phase's scope (see docs/director/roadmap.md Known
 * Debt). `unwanted_teleport` is approximated as a strong knockback impulse
 * rather than a true position jump, reusing the existing collision-safe
 * knockback integration instead of a bespoke teleport path.
 */
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import type { RpgPlayerState } from "$lib/domain/rpg-types";
import { CURSE_EFFECT_POOL, effectiveCadence, type CurseEffectId } from "$lib/domain/crafting/curse-effects";
import { playSound } from "$lib/audio/audio-engine";
import { gameState } from "$lib/state/game-state.svelte";
import { setThirst, setHunger } from "$lib/state/rpg/survival.svelte";

export interface CursedEquippedItem {
  readonly instanceId: string;
  readonly curseLevel: number;
  readonly curseEffectIds: readonly CurseEffectId[];
}

/** Every equipped loadout slot that's carrying a curse right now. */
export function collectCursedEquipped(loadout: RpgPlayerState["profile"]["loadout"] | undefined): CursedEquippedItem[] {
  if (!loadout) return [];
  const cursed: CursedEquippedItem[] = [];
  for (const slot of Object.values(loadout)) {
    if (slot && typeof slot === "object" && slot.cursed) {
      cursed.push({
        instanceId: slot.instanceId,
        curseLevel: slot.curseLevel ?? 1,
        curseEffectIds: slot.curseEffectIds ?? [],
      });
    }
  }
  return cursed;
}

const RESOURCE_DRAIN_AMOUNT = 1.5;
const KNOCKBACK_SPEED = 90;
const KNOCKBACK_TIMER = 0.25;
const TELEPORT_IMPULSE_SPEED = 260;
const TELEPORT_IMPULSE_TIMER = 0.35;

type EffectHandler = (player: Entity) => void;

function applyImpulse(player: Entity, speed: number, timer: number): void {
  const angle = Math.random() * Math.PI * 2;
  player.knockback = { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, timer };
}

const EFFECT_HANDLERS: Partial<Record<CurseEffectId, EffectHandler>> = {
  self_knockback: (player) => applyImpulse(player, KNOCKBACK_SPEED, KNOCKBACK_TIMER),
  unwanted_teleport: (player) => applyImpulse(player, TELEPORT_IMPULSE_SPEED, TELEPORT_IMPULSE_TIMER),
  resource_drain: () => {
    setThirst(gameState.survival.thirst - RESOURCE_DRAIN_AMOUNT);
    setHunger(gameState.survival.hunger - RESOURCE_DRAIN_AMOUNT);
  },
  noise_pulse: () => playSound("combat.glancing"),
  mocking_whiff: () => playSound("combat.miss.air"),
};

/** Advances every active cursed effect's accumulator by `dt`, firing (and resetting) any that cross cadence. */
export function tickCurseEffects(
  cursedItems: readonly CursedEquippedItem[],
  timers: Map<string, number>,
  dt: number,
  player: Entity,
): void {
  const activeKeys = new Set<string>();
  for (const item of cursedItems) {
    for (const effectId of item.curseEffectIds) {
      const effect = CURSE_EFFECT_POOL.find((e) => e.id === effectId);
      const handler = EFFECT_HANDLERS[effectId];
      if (!effect || !handler) continue;

      const key = `${item.instanceId}:${effectId}`;
      activeKeys.add(key);
      const cadence = effectiveCadence(effect, item.curseLevel);
      const elapsed = (timers.get(key) ?? 0) + dt;
      if (elapsed >= cadence) {
        timers.set(key, 0);
        handler(player);
      } else {
        timers.set(key, elapsed);
      }
    }
  }
  for (const key of timers.keys()) {
    if (!activeKeys.has(key)) timers.delete(key);
  }
}
