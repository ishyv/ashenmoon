import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { World } from "miniplex";
import { TILE } from "$lib/core/systems/map/map";
import { animalCenter } from "$lib/core/systems/animals/animal-runtime";
import { applyDamage } from "$lib/core/systems/combat/combat";
import type { VFXResource } from "$lib/core/vfx/vfx";
import type { Container } from "pixi.js";
import type { CombatConfig } from "$lib/core/systems/combat/combat";
import { playSound } from "$lib/audio/audio-engine";
import { spawnEnvFloatingText, spawnEnvParticles } from "$lib/core/vfx/vfx";
import { Colors } from "$lib/utils/colors";
export function tickTrapSystem(
  world: World<Entity>,
  dt: number,
  vfx: VFXResource,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  combatConfig: CombatConfig,
  onTrapTriggered?: (entity: Entity) => void,
): void {
  // 1. Tick slow timers on animals
  for (const animalEnt of world.with("animal").entities) {
    if (animalEnt.animal.slowTimerSec && animalEnt.animal.slowTimerSec > 0) {
      animalEnt.animal.slowTimerSec = Math.max(0, animalEnt.animal.slowTimerSec - dt);
      if (animalEnt.animal.slowTimerSec <= 0) {
        delete animalEnt.animal.slowMultiplier;
      }
    }
  }

  // 2. Process traps
  const trapEntities = [...world.with("trap", "position").entities];
  const animalEntities = [...world.with("animal", "position", "health").entities];

  for (const trapEnt of trapEntities) {
    const trap = trapEnt.trap;
    if (!trap) continue;

    const trapPos = trapEnt.position!;
    const trapCenterX = trapPos.x + TILE / 2;
    const trapCenterY = trapPos.y + TILE / 2;

    if (trap.type === "snap" && trap.state === "set") {
      // Find a hostile animal close enough (within 0.45 tiles)
      for (const animalEnt of animalEntities) {
        if (animalEnt.health?.faction !== "hostile" || animalEnt.health.current <= 0) continue;

        const ac = animalCenter(animalEnt);
        const dist = Math.hypot(trapCenterX - ac.x, trapCenterY - ac.y);
        if (dist <= TILE * 0.45) {
          // Snap!
          trap.state = "sprung";
          if (trapEnt.interactable) {
            trapEnt.interactable.name = "reset snap trap";
          }

          // Visual feedback: red particles and hit flash, redraw trap sprung
          playSound("combat.hit.enemy");
          spawnEnvFloatingText(vfx, "SNAP", Colors.ui.error, trapPos, entityLayer);
          spawnEnvParticles(vfx, Colors.combat.playerHit, 8, "sizzle", trapPos, entityLayer);

          onTrapTriggered?.(trapEnt);

          // Apply damage: 25 physical damage, no knockback
          applyDamage(
            animalEnt,
            25,
            trapCenterX,
            trapCenterY,
            0,
            combatConfig,
            vfx,
            entityLayer
          );

          // Apply snare/slow
          animalEnt.animal.slowTimerSec = 4.0;
          animalEnt.animal.slowMultiplier = 0.15;
          break; // only snap one target
        }
      }
    } else if (trap.type === "caltrops" && trap.state === "set") {
      // Ground spikes that can hit multiple animals but have limited uses remaining
      for (const animalEnt of animalEntities) {
        if (animalEnt.health?.faction !== "hostile" || animalEnt.health.current <= 0) continue;
        if (animalEnt.health.invulnTimer > 0) continue; // Skip if in i-frames

        const ac = animalCenter(animalEnt);
        const dist = Math.hypot(trapCenterX - ac.x, trapCenterY - ac.y);
        if (dist <= TILE * 0.45) {
          // Trigger caltrops on this animal!
          playSound("combat.hit.enemy");
          spawnEnvFloatingText(vfx, "Bleed", Colors.ui.error, animalEnt.position!, entityLayer);
          spawnEnvParticles(vfx, Colors.combat.crosscutBleed, 3, "sizzle", animalEnt.position!, entityLayer);

          // Apply bleed status
          animalEnt.bleed = {
            remainingSec: 6,
            tickEverySec: 1,
            tickTimer: 0,
            damagePerTick: 2,
          };

          // Minor immediate damage
          applyDamage(
            animalEnt,
            6,
            trapCenterX,
            trapCenterY,
            0,
            combatConfig,
            vfx,
            entityLayer
          );

          // Minor slow
          animalEnt.animal.slowTimerSec = 2.0;
          animalEnt.animal.slowMultiplier = 0.6;

          // Consume a charge
          if (trap.usesRemaining !== undefined) {
            trap.usesRemaining--;
            if (trap.usesRemaining <= 0) {
              // Destroy caltrops!
              const container = entitySprites.get(trapEnt.id);
              if (container) {
                entityLayer.removeChild(container);
                container.destroy();
              }
              entitySprites.delete(trapEnt.id);
              world.remove(trapEnt);
              break;
            }
          }
        }
      }
    } else if (trap.type === "decoy" && trap.state === "set") {
      // Consumed when a predator reaches it
      for (const animalEnt of animalEntities) {
        if (animalEnt.health?.faction !== "hostile" || animalEnt.health.current <= 0) continue;

        const ac = animalCenter(animalEnt);
        const dist = Math.hypot(trapCenterX - ac.x, trapCenterY - ac.y);
        if (dist <= TILE * 0.45) {
          // Wolf/boar eats decoy
          playSound("consume");
          spawnEnvFloatingText(vfx, "Decoy eaten", Colors.resource.gold, trapPos, entityLayer);

          // Lower its hunger level
          if (animalEnt.animal.hunger !== undefined) {
            animalEnt.animal.hunger = Math.max(0, animalEnt.animal.hunger - 40);
          }

          // Despawn decoy
          const container = entitySprites.get(trapEnt.id);
          if (container) {
            entityLayer.removeChild(container);
            container.destroy();
          }
          entitySprites.delete(trapEnt.id);
          world.remove(trapEnt);
          break;
        }
      }
    }
  }
}
