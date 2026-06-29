import { Graphics, type Container } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { TILE } from "$lib/core/systems/map/map";
import type { BoarCombatRuntime } from "$lib/domain/combat/enemies/boar-combat";

const BOAR_TELEGRAPH_KEY_SUFFIX = ":boar-telegraph";
const CHARGE_LINE_WIDTH = 9;
const CHARGE_LINE_COLOR = 0xff7a33;

function telegraphKey(entityId: string): string {
  return `${entityId}${BOAR_TELEGRAPH_KEY_SUFFIX}`;
}

export function clearBoarTelegraph(entityId: string, entitySprites: Map<string, Container>, entityLayer: Container): void {
  const key = telegraphKey(entityId);
  const existing = entitySprites.get(key);
  if (!existing) return;
  entityLayer.removeChild(existing);
  existing.destroy({ children: true });
  entitySprites.delete(key);
}

export function syncBoarTelegraph(
  entity: Entity,
  boarCombat: BoarCombatRuntime,
  entitySprites: Map<string, Container>,
  entityLayer: Container,
): void {
  if (!entity.position || boarCombat.state !== "charge_windup" || !boarCombat.lockedDirection) {
    clearBoarTelegraph(entity.id, entitySprites, entityLayer);
    return;
  }

  const key = telegraphKey(entity.id);
  const existing = entitySprites.get(key);
  const line = existing instanceof Graphics ? existing : new Graphics();
  if (!existing) {
    entityLayer.addChild(line);
    entitySprites.set(key, line);
  }

  const startX = entity.position.x + TILE / 2;
  const startY = entity.position.y + TILE / 2;
  const endX = startX + boarCombat.lockedDirection.x * TILE * 3.75;
  const endY = startY + boarCombat.lockedDirection.y * TILE * 3.75;

  line.clear();
  line.moveTo(startX, startY);
  line.lineTo(endX, endY);
  line.stroke({ color: CHARGE_LINE_COLOR, width: CHARGE_LINE_WIDTH, alpha: 0.24 });
  line.moveTo(startX, startY);
  line.lineTo(endX, endY);
  line.stroke({ color: CHARGE_LINE_COLOR, width: 2, alpha: 0.75 });
  line.zIndex = startY - 1;
}
