import type { Container } from "pixi.js";
import { world, type Entity } from "$lib/core/ecs/ecs-miniplex";
import { despawnEntity } from "$lib/core/systems/combat/combat";
import { TILE } from "$lib/core/systems/map/map";
import { buildCarcassSprite } from "$lib/core/systems/animals/carcass-runtime";
import { computeRenderZ } from "$lib/domain/collision";
import { getPlayerEntity } from "$lib/core/ecs/entity-queries";
import type { VFXResource } from "$lib/core/vfx/vfx";
import { spawnEnvParticles } from "$lib/core/vfx/vfx";
import { Colors } from "$lib/utils/colors";
import { getItemDef } from "$lib/domain/items";
import { getEquippedWeaponId, getItemQty } from "$lib/state/rpg/inventory-api";
import { syncPickup } from "$lib/state/persistence/remote-sync";
import { applyRpgState } from "$lib/state/rpg-actions.svelte";
import { applyStatusEffect } from "$lib/state/rpg/status-effects.svelte";
import { applyWound } from "$lib/state/rpg/wounds.svelte";
import { StatusId } from "$lib/domain/systems/status-types";
import { discoverSource } from "$lib/state/rpg/knowledge.svelte";
import {
  resolveCarcassProcessing,
  resolveCarcassToolQuality,
  M3_CARCASS_DEFINITIONS,
  type CarcassProcessAction,
} from "$lib/domain/animals/carcass-processing";
import { actionsForCarcass, type WorldActionOption } from "$lib/domain/world-actions";
import { createWorldActionRuntime, type WorldActionRuntime } from "$lib/domain/world-action-runtime";
import type { GameEventQueue } from "$lib/domain/game-event-queue";

export function firstProcessCarcassAction(target: Entity): WorldActionOption | null {
  if (!target.carcass) return null;
  return actionsForCarcass({ targetId: target.id, carcass: target.carcass })
    .find((action) => action.executeIntent.kind === "carcass.process") ?? null;
}

export function startCarcassWorldAction(
  target: Entity,
  vfx: VFXResource,
  entityLayer: Container,
  events?: GameEventQueue,
): WorldActionRuntime | null {
  void vfx; void entityLayer;
  const player = getPlayerEntity();
  const action = firstProcessCarcassAction(target);
  if (!player.position) return null;
  if (!action) {
    events?.push({ type: "feedback_requested", channel: "ui", message: "nothing useful remains", tone: "info" });
    return null;
  }

  events?.push({ type: "feedback_requested", channel: "ui", message: action.feedback.start, tone: "info" });
  return createWorldActionRuntime(action);
}

export function completeCarcassWorldAction(
  target: Entity,
  runtime: WorldActionRuntime,
  vfx: VFXResource,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  events?: GameEventQueue,
): void {
  const carcass = target.carcass;
  const player = getPlayerEntity();
  if (!carcass || !player.position) return;

  const action = runtime.action.executeIntent.payload?.action;
  if (typeof action !== "string" || action === "inspect") return;

  const toolQuality = resolveCarcassToolQuality({
    equippedItemId: getEquippedWeaponId(),
    hasSharpFlint: getItemQty("flint_shard") > 0 || getItemQty("stone_blade") > 0,
  });
  const result = resolveCarcassProcessing({
    carcass,
    action: action as Exclude<CarcassProcessAction, "inspect">,
    toolQuality,
  });

  if (!result.ok) {
    events?.push({ type: "feedback_requested", channel: "ui", message: result.feedback, tone: "error" });
    return;
  }

  // INVARIANT: mark the carcass before async inventory writes so repeated
  // interaction cannot duplicate yields while persistence is still resolving.
  carcass.processedActions = [...carcass.processedActions, result.action];
  carcass.state = result.nextState;

  const definition = M3_CARCASS_DEFINITIONS[carcass.speciesId];
  const allActions: Exclude<CarcassProcessAction, "inspect">[] = [
    "harvest_meat",
    "remove_hide",
    "extract_bone",
    "collect_sinew",
  ];
  const isFullyProcessed = allActions.every((act) => {
    const actDef = definition?.actions[act];
    return !actDef || actDef.yields.length === 0 || carcass.processedActions.includes(act);
  });

  if (isFullyProcessed) {
    despawnEntity(world, target, entityLayer, entitySprites, vfx);
    const yieldText = result.yields
      .map((yieldItem) => `+${yieldItem.qty} ${getItemDef(yieldItem.itemId)?.name.toLowerCase() ?? yieldItem.itemId}`)
      .join(", ");
    events?.push({ type: "feedback_requested", channel: "ui", message: (yieldText ? yieldText + " · " : "") + "carcass fully harvested", tone: "success" });
    spawnEnvParticles(vfx, Colors.combat.enemyDeath, 5, "sizzle", player.position, entityLayer);

    void (async () => {
      for (const yieldItem of result.yields) {
        const sync = await syncPickup(yieldItem.itemId, `${target.id}:${result.action}:${yieldItem.itemId}`, yieldItem.qty);
        if (sync.ok) {
          applyRpgState(sync.data.playerState);
          events?.push({ type: "item_gained", itemId: yieldItem.itemId, qty: yieldItem.qty, source: "carcass" });
          if (target.interactable?.name) {
            discoverSource(yieldItem.itemId, target.interactable.name);
          }
        }
      }
    })();
  } else {
    if (target.position) {
      const oldSprite = entitySprites.get(target.id);
      if (oldSprite) {
        entityLayer.removeChild(oldSprite);
        oldSprite.destroy({ children: true });
      }
      const cx = target.position.x + TILE / 2;
      const cy = target.position.y + TILE * 0.72;
      const sprite = buildCarcassSprite(carcass.speciesId, carcass.state, cx, cy);
      sprite.zIndex = computeRenderZ(cy);
      entityLayer.addChild(sprite);
      entitySprites.set(target.id, sprite);
    }

    void (async () => {
      for (const yieldItem of result.yields) {
        const sync = await syncPickup(yieldItem.itemId, `${target.id}:${result.action}:${yieldItem.itemId}`, yieldItem.qty);
        if (sync.ok) {
          applyRpgState(sync.data.playerState);
          events?.push({ type: "item_gained", itemId: yieldItem.itemId, qty: yieldItem.qty, source: "carcass" });
          if (target.interactable?.name) {
            discoverSource(yieldItem.itemId, target.interactable.name);
          }
        }
      }
    })();
  }

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
      // Wound/status events are emitted by applyWound/applyStatusEffect to rpgEventQueue.
    }
  }

  const yieldText = result.yields
    .map((yieldItem) => `+${yieldItem.qty} ${getItemDef(yieldItem.itemId)?.name.toLowerCase() ?? yieldItem.itemId}`)
    .join(", ");
  events?.push({ type: "feedback_requested", channel: "ui", message: yieldText || result.feedback, tone: "success" });
  spawnEnvParticles(vfx, Colors.combat.enemyDeath, 5, "sizzle", player.position, entityLayer);
  // Sound is dispatched by FeedbackRouter on world_action_completed.
}
