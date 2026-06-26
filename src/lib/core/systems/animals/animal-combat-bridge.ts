import type { World } from "miniplex";
import type { Container } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { applyStatusEffect } from "$lib/state/rpg/status-effects.svelte";
import { StatusId } from "$lib/domain/systems/status-types";
import { applyDamage, despawnEntity, type CombatConfig, type CombatResource } from "$lib/core/systems/combat/combat";
import { TILE } from "$lib/core/systems/map/map";
import type { VFXResource } from "$lib/core/vfx/vfx";
import { ANIMAL_DEFINITIONS, resolveAnimalConflict } from "$lib/domain/animals/animal-behavior";
import { spawnCarcassEntity } from "$lib/core/systems/animals/carcass-runtime";
import { animalCenter, animalCenterRuntime } from "$lib/core/systems/animals/animal-runtime";
import type { GameEventQueue } from "$lib/domain/game-event-queue";
import { getPlayerStats } from "$lib/state/rpg/stats.svelte";
import { resolveMeleeHit } from "$lib/domain/combat/attack";

export function tryAnimalAttackPlayer(
  entity: Entity,
  player: Entity,
  config: CombatConfig,
  combat: CombatResource,
  vfx: VFXResource,
  entityLayer: Container,
  events?: GameEventQueue,
): void {
  const animal = entity.animal!;
  const def = ANIMAL_DEFINITIONS[animal.speciesId];
  const dmg = animal.damage ?? def.damage;
  if (!dmg || animal.attackCooldownSec > 0) return;

  const pos = animalCenter(entity);
  const hit = applyDamage(player, dmg, pos.x, pos.y, 120, config, vfx, entityLayer, combat, events, getPlayerStats().combat.armor);
  if (hit) {
    // Apply special moves / status effects
    if (animal.speciesId === "wolf") {
      const roll = Math.random();
      if (roll < 0.25) {
        applyStatusEffect(StatusId.BiteWound, 15, "hazard:wolf");
        events?.push({ type: "feedback_requested", channel: "ui", message: "A wolf bit your limb!", tone: "error" });
      } else if (roll < 0.45) {
        applyStatusEffect(StatusId.Bleeding, 20, "hazard:wolf");
        events?.push({ type: "feedback_requested", channel: "ui", message: "You are bleeding!", tone: "error" });
      }
    } else if (animal.speciesId === "boar") {
      const roll = Math.random();
      if (roll < 0.3) {
        applyStatusEffect(StatusId.Injured, 15, "hazard:boar");
        events?.push({ type: "feedback_requested", channel: "ui", message: "The boar gored you!", tone: "error" });
      } else if (roll < 0.5) {
        applyStatusEffect(StatusId.Bleeding, 15, "hazard:boar");
        events?.push({ type: "feedback_requested", channel: "ui", message: "You are bleeding!", tone: "error" });
      }
    }
  }
  animal.attackCooldownSec = def.attackCooldownSec ?? 1;
  animal.threatened = false;
}

export function tryAnimalAttackPrey(
  predator: Entity,
  prey: Entity | undefined,
  config: CombatConfig,
  vfx: VFXResource,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  ecsWorld: World<Entity>,
  events?: GameEventQueue,
): void {
  if (!prey?.position || !prey.health) return;
  const animal = predator.animal!;
  const def = ANIMAL_DEFINITIONS[animal.speciesId];
  if (animal.attackCooldownSec > 0) return;

  const predatorPos = animalCenter(predator);
  const preyPos = animalCenter(prey);
  const strikeResult = resolveMeleeHit({ attackerX: predatorPos.x, attackerY: predatorPos.y, targetX: preyPos.x, targetY: preyPos.y, rangePx: def.attackRadiusPx ?? TILE });
  if (!strikeResult.hit) return;

  // WHY: ecology requests combat through the shared damage path, not direct
  // health mutation, so hit flash, i-frames, and knockback stay consistent.
  const conflict = resolveAnimalConflict(animalCenterRuntime(predator), animalCenterRuntime(prey));
  const preyDied = applyDamage(prey, conflict.defenderDamage, predatorPos.x, predatorPos.y, 80, config, vfx, entityLayer, undefined, events);
  if (conflict.attackerDamage > 0) {
    applyDamage(predator, conflict.attackerDamage, preyPos.x, preyPos.y, 40, config, vfx, entityLayer, undefined, events);
  }
  if (preyDied) {
    spawnCarcassEntity({
      sourceEntityId: prey.id,
      speciesId: prey.animal!.speciesId,
      x: prey.position.x,
      y: prey.position.y,
      entityLayer,
      entitySprites,
    });
    despawnEntity(ecsWorld, prey, entityLayer, entitySprites, vfx);
  }
  animal.attackCooldownSec = def.attackCooldownSec ?? 1;
}
