import { world, type Entity } from "$lib/core/ecs/ecs-miniplex";
import { Container } from "pixi.js";
import {
  spawnDeathBurst,
  spawnLevelUpBurst,
  spawnEnvFloatingText,
  type VFXResource,
} from "$lib/core/vfx/vfx";
import { Colors } from "$lib/utils/colors";
import { SkillKey } from "$lib/domain/game-events";
import { awardSkillXp } from "$lib/state/rpg/skill-xp";
import { awardCharacterXp } from "$lib/state/rpg/stats.svelte";
import { playSound } from "$lib/audio/audio-engine";
import { despawnEntity } from "$lib/core/systems/combat/combat";
import { TILE } from "$lib/core/systems/map/map";
import { spawnItemDrop } from "$lib/core/systems/map/spawn-system";

/**
 * Handles kill resolution after shared combat reports an entity dead.
 *
 * INVARIANT: animals do not drop hunting materials directly. They become
 * carcasses so M3 processing, spoilage, and predator-attraction rules have a
 * physical world anchor. Non-animal hostiles keep the normal loot-drop path.
 */
export function handleEnemyDeathSystem(
  enemy: Entity,
  vfx: VFXResource,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  enemyColors: Map<string, any>,
  playerPos: { x: number; y: number }
): void {
  const pos = enemy.position;
  if (pos) {
    spawnDeathBurst(
      vfx,
      entityLayer,
      pos.x + TILE / 2,
      pos.y + TILE * 0.6,
      Colors.combat.enemyDeath
    );
    const xp = enemy.loot?.xpReward ?? 0;
    if (xp > 0) {
      spawnEnvFloatingText(vfx, `+${xp} xp`, Colors.resource.xp, pos, entityLayer);
      awardSkillXp(SkillKey.Combat, xp, vfx, playerPos, entityLayer);
      const levelsGained = awardCharacterXp(xp);
      if (levelsGained > 0) {
        spawnLevelUpBurst(vfx, entityLayer, playerPos.x + TILE / 2, playerPos.y + TILE / 2);
        playSound("player.levelup");
      }
    }
  }
  
  playSound("enemy.death", pos ? { position: { x: pos.x + TILE / 2, y: pos.y + TILE / 2 } } : {});

  if (pos && enemy.animal) {
    // Begin death-fade — ecology system ticks dyingSec, spawns carcass, and despawns.
    enemy.animal.dyingSec = 0.8;
    enemyColors.delete(enemy.id);
    return;
  } else if (pos && enemy.loot?.drops) {
    for (const drop of enemy.loot.drops) {
      spawnItemDrop(drop.itemId, drop.qty, pos.x, pos.y, entityLayer, entitySprites);
    }
  }

  enemyColors.delete(enemy.id);
  despawnEntity(world, enemy, entityLayer, entitySprites, vfx);
}
