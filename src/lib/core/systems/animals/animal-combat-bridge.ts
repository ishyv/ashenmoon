import type { World } from "miniplex";
import type { Container } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { applyDamage, despawnEntity, type CombatConfig, type CombatResource } from "$lib/core/systems/combat/combat";
import { TILE } from "$lib/core/systems/map/map";
import type { VFXResource } from "$lib/core/vfx/vfx";
import { ANIMAL_DEFINITIONS, resolveAnimalConflict } from "$lib/domain/animals/animal-behavior";
import { spawnCarcassEntity } from "$lib/core/systems/animals/carcass-runtime";
import { animalCenter, animalCenterRuntime } from "$lib/core/systems/animals/animal-runtime";

export function tryAnimalAttackPlayer(
  entity: Entity,
  player: Entity,
  config: CombatConfig,
  combat: CombatResource,
  vfx: VFXResource,
  entityLayer: Container,
): void {
  const animal = entity.animal!;
  const def = ANIMAL_DEFINITIONS[animal.speciesId];
  if (!def.damage || animal.attackCooldownSec > 0) return;

  const pos = animalCenter(entity);
  const hit = applyDamage(player, def.damage, pos.x, pos.y, 120, config, vfx, entityLayer, combat);
  if (hit) {
    // Player death/respawn is owned by the engine; this bridge only requests damage.
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
): void {
  if (!prey?.position || !prey.health) return;
  const animal = predator.animal!;
  const def = ANIMAL_DEFINITIONS[animal.speciesId];
  if (animal.attackCooldownSec > 0) return;

  const predatorPos = animalCenter(predator);
  const preyPos = animalCenter(prey);
  if (Math.hypot(preyPos.x - predatorPos.x, preyPos.y - predatorPos.y) > (def.attackRadiusPx ?? TILE)) return;

  // WHY: ecology requests combat through the shared damage path, not direct
  // health mutation, so hit flash, i-frames, and knockback stay consistent.
  const conflict = resolveAnimalConflict(animalCenterRuntime(predator), animalCenterRuntime(prey));
  const preyDied = applyDamage(prey, conflict.defenderDamage, predatorPos.x, predatorPos.y, 80, config, vfx, entityLayer);
  if (conflict.attackerDamage > 0) {
    applyDamage(predator, conflict.attackerDamage, preyPos.x, preyPos.y, 40, config, vfx, entityLayer);
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
