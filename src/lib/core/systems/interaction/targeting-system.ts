import type { World } from "miniplex";
import { getBuildingSpec } from "$lib/domain/building-specs";
import type { Container } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import type { InputResource } from "$lib/core/input/input";
import { TILE, type MapResource } from "$lib/core/systems/map/map";
import { Colors } from "$lib/utils/colors";
import { devFlags } from "$lib/state/dev-flags.svelte";

export const INTERACT_RANGE = 2;

export interface InteractionTargetState {
  currentTarget: Entity | null;
}

/** Tints a node's sprite to mark it as the active target, or clears it. */
export function setHighlight(
  entity: Entity | null,
  on: boolean,
  entitySprites: Map<string, Container>,
): void {
  const sprite = entity && entitySprites.get(entity.id);
  if (sprite) {
    sprite.tint = on ? Colors.vfx.highlight : Colors.ui.white;
  }
}

/**
 * Resolves the interaction target from the mouse cursor position.
 *
 * The target is the interactable entity whose tile is under the cursor and
 * within interaction range of the player. The caller owns facing state; this
 * system only proposes a facing update from the current mouse vector.
 */
export function updateTargetSystem(
  world: World<Entity>,
  inputs: InputResource,
  _map: MapResource,
  interaction: InteractionTargetState,
  playerEntity: Entity,
  entitySprites: Map<string, Container>,
  isPlacementMode: boolean,
  setFacing: (f: { x: number; y: number }) => void,
): void {
  if (isPlacementMode) {
    setHighlight(interaction.currentTarget, false, entitySprites);
    interaction.currentTarget = null;
    return;
  }

  const pos = playerEntity.position!;
  const playerCx = pos.x + TILE / 2;
  const playerCy = pos.y + TILE / 2;

  // Update facing from mouse direction (>=4px dead-zone avoids centre jitter).
  const dx = inputs.mouseWorld.x - playerCx;
  const dy = inputs.mouseWorld.y - playerCy;
  if (dx * dx + dy * dy > 16) {
    setFacing({ x: dx > 0 ? 1 : -1, y: dy > 0 ? 1 : -1 });
  }

  const mx = Math.floor(inputs.mouseWorld.x / TILE);
  const my = Math.floor(inputs.mouseWorld.y / TILE);
  const px = Math.floor(playerCx / TILE);
  const py = Math.floor(playerCy / TILE);
  const inRange = devFlags.spectatorEnabled || Math.max(Math.abs(mx - px), Math.abs(my - py)) <= INTERACT_RANGE;

  let target: Entity | null = null;
  if (inRange) {
    const candidates = world
      .with("interactable", "position")
      .entities.filter(
        (e: Entity) => {
          let w = 1;
          let h = 1;
          if (e.building) {
            const spec = getBuildingSpec(e.building.type);
            if (spec) {
              w = spec.footprint.w;
              h = spec.footprint.h;
            }
          }
          const ex = Math.floor(e.position!.x / TILE);
          const ey = Math.floor(e.position!.y / TILE);
          return mx >= ex && mx < ex + w && my >= ey && my < ey + h;
        }
      );
    if (candidates.length > 0) {
      target =
        (candidates.find((e) => e.carcass !== undefined) ??
        candidates.find((e) => e.interactable?.action === "talk") ??
        candidates.find(
          (e) =>
            e.interactable?.action === "process" ||
            e.interactable?.action === "refuel",
        ) ??
        candidates.find((e) => e.resource !== undefined) ??
        candidates[0]) ?? null;
    }
  }

  if (target === interaction.currentTarget) return;
  setHighlight(interaction.currentTarget, false, entitySprites);
  setHighlight(target, true, entitySprites);
  interaction.currentTarget = target;
}
