import type { Container } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { getPlayerEntity } from "$lib/core/ecs/entity-queries";
import type { VFXResource } from "$lib/core/vfx/vfx";
import { spawnEnvFloatingText, spawnEnvParticles } from "$lib/core/vfx/vfx";
import { playSound } from "$lib/audio/audio-engine";
import { Colors } from "$lib/utils/colors";
import { getItemDef } from "$lib/domain/items";
import { getEquippedWeaponId, getItemQty } from "$lib/state/rpg/inventory-api";
import { syncPickup } from "$lib/state/persistence/remote-sync";
import { applyRpgState } from "$lib/state/rpg-actions.svelte";
import { applyStatusEffect } from "$lib/state/rpg/status-effects.svelte";
import { applyWound } from "$lib/state/rpg/wounds.svelte";
import { StatusId } from "$lib/domain/systems/status-types";
import {
  resolveCarcassProcessing,
  resolveCarcassToolQuality,
  type CarcassProcessAction,
} from "$lib/domain/animals/carcass-processing";
import { actionsForCarcass, type WorldActionOption } from "$lib/domain/world-actions";
import { createWorldActionRuntime, type WorldActionRuntime } from "$lib/domain/world-action-runtime";

export function firstProcessCarcassAction(target: Entity): WorldActionOption | null {
  if (!target.carcass) return null;
  return actionsForCarcass({ targetId: target.id, carcass: target.carcass })
    .find((action) => action.executeIntent.kind === "carcass.process") ?? null;
}

export function startCarcassWorldAction(
  target: Entity,
  vfx: VFXResource,
  entityLayer: Container,
): WorldActionRuntime | null {
  const player = getPlayerEntity();
  const action = firstProcessCarcassAction(target);
  if (!player.position) return null;
  if (!action) {
    spawnEnvFloatingText(vfx, "nothing useful remains", Colors.ui.muted, player.position, entityLayer);
    return null;
  }

  spawnEnvFloatingText(vfx, action.feedback.start, Colors.ui.muted, player.position, entityLayer);
  return createWorldActionRuntime(action);
}

export function completeCarcassWorldAction(
  target: Entity,
  runtime: WorldActionRuntime,
  vfx: VFXResource,
  entityLayer: Container,
): void {
  const carcass = target.carcass;
  const player = getPlayerEntity();
  if (!carcass || !player.position) return;

  const action = runtime.action.executeIntent.payload?.action;
  if (typeof action !== "string" || action === "inspect") return;

  const toolQuality = resolveCarcassToolQuality({
    equippedItemId: getEquippedWeaponId(),
    hasSharpFlint: getItemQty("flint_shard") > 0 || getItemQty("bone_shard") > 0,
  });
  const result = resolveCarcassProcessing({
    carcass,
    action: action as Exclude<CarcassProcessAction, "inspect">,
    toolQuality,
  });

  if (!result.ok) {
    spawnEnvFloatingText(vfx, result.feedback, Colors.ui.error, player.position, entityLayer);
    return;
  }

  // INVARIANT: mark the carcass before async inventory writes so repeated
  // interaction cannot duplicate yields while persistence is still resolving.
  carcass.processedActions = [...carcass.processedActions, result.action];
  carcass.state = result.nextState;

  void (async () => {
    for (const yieldItem of result.yields) {
      const sync = await syncPickup(yieldItem.itemId, `${target.id}:${result.action}:${yieldItem.itemId}`, yieldItem.qty);
      if (sync.ok) applyRpgState(sync.data.playerState);
    }
  })();

  for (const risk of result.risks) {
    if (Math.random() < risk.chance) {
      if (risk.status === StatusId.Cut) {
        applyWound({
          severity: toolQuality === "bare_hands" ? "deep_cut" : "cut",
          contamination: carcass.state === "spoiling" ? 0.6 : 0.25,
          toolQuality: toolQuality === "improved_knife" ? 1 : toolQuality === "crude_knife" ? 0.7 : toolQuality === "sharp_flint" ? 0.35 : 0,
          source: "hazard:carcass",
        });
      } else {
        applyStatusEffect(risk.status, risk.durationSec, "hazard:carcass");
      }
      spawnEnvFloatingText(
        vfx,
        risk.status === StatusId.Cut ? "cut" : "sickened",
        Colors.ui.error,
        player.position,
        entityLayer,
      );
    }
  }

  const yieldText = result.yields
    .map((yieldItem) => `+${yieldItem.qty} ${getItemDef(yieldItem.itemId)?.name.toLowerCase() ?? yieldItem.itemId}`)
    .join(", ");
  spawnEnvFloatingText(vfx, yieldText || result.feedback, Colors.resource.gold, player.position, entityLayer);
  spawnEnvParticles(vfx, Colors.combat.enemyDeath, 5, "sizzle", player.position, entityLayer);
  playSound("node.deplete");
}
