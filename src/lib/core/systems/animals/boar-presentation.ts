import { Graphics, type Container } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { TILE } from "$lib/core/systems/map/map";
import { BOAR_COMBAT_TUNING, type BoarCombatRuntime } from "$lib/domain/combat/enemies/boar-combat";

const BOAR_TELEGRAPH_KEY_SUFFIX = ":boar-telegraph";
const CHARGE_LINE_WIDTH = 9;
const CHARGE_LINE_COLOR = 0xff7a33;

export interface BoarTelegraphCue {
  readonly lengthPx: number;
  readonly dangerAlpha: number;
  readonly glowAlpha: number;
  readonly glowWidthPx: number;
  readonly coreWidthPx: number;
}

export function buildBoarTelegraphCue(boarCombat: BoarCombatRuntime): BoarTelegraphCue | null {
  if (boarCombat.state !== "charge_windup" || !boarCombat.lockedDirection) return null;
  const progress = Math.min(1, Math.max(0, boarCombat.stateElapsedMs / BOAR_COMBAT_TUNING.chargeWindupMs));
  return {
    lengthPx: BOAR_COMBAT_TUNING.chargeMaxDistancePx,
    dangerAlpha: 0.38 + progress * 0.42,
    glowAlpha: 0.16 + progress * 0.18,
    glowWidthPx: CHARGE_LINE_WIDTH + progress * 6,
    coreWidthPx: 2 + progress * 2,
  };
}

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
  const cue = buildBoarTelegraphCue(boarCombat);
  if (!entity.position || !cue || !boarCombat.lockedDirection) {
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
  const endX = startX + boarCombat.lockedDirection.x * cue.lengthPx;
  const endY = startY + boarCombat.lockedDirection.y * cue.lengthPx;

  line.clear();
  line.moveTo(startX, startY);
  line.lineTo(endX, endY);
  line.stroke({ color: CHARGE_LINE_COLOR, width: cue.glowWidthPx, alpha: cue.glowAlpha });
  line.moveTo(startX, startY);
  line.lineTo(endX, endY);
  line.stroke({ color: CHARGE_LINE_COLOR, width: cue.coreWidthPx, alpha: cue.dangerAlpha });
  line.zIndex = startY - 1;
}
