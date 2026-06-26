/**
 * Focused Gathering â€” engine glue. Owns the live session, drives the pure
 * state machine each frame, routes canvas clicks into it, and on completion
 * grants the rolled yield, applies penalties, and destroys the node.
 *
 * Runs BEFORE the interaction and player-attack systems so it can claim the
 * node and swallow clicks (the engine skips the player's own attack while a
 * session is active). Enemies still act, so danger persists mid-minigame.
 */

import type { Container, Graphics, Text } from "pixi.js";
import type { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { TILE, type MapResource } from "$lib/core/systems/map/map";
import { getPlayerEntity } from "$lib/core/ecs/entity-queries";
import type { InputResource } from "$lib/core/input/input";
import { spawnEnvFloatingText, spawnShockwaveRing, spawnSlashArc, type VFXResource } from "$lib/core/vfx/vfx";
import { Colors } from "$lib/utils/colors";
import { stamina, spendStamina } from "$lib/state/rpg/stamina.svelte";
import { playSound } from "$lib/audio/audio-engine";
import { gatherSoundId } from "$lib/audio/sound-manifest";
import { getEquippedWeaponId } from "$lib/state/rpg/inventory-api";
import { getGatherableDefinition } from "$lib/domain/gathering/gatherables";
import { SkillKey } from "$lib/domain/game-events";
import { awardSkillXp } from "$lib/state/rpg/skill-xp";
import { applyWound } from "$lib/state/rpg/wounds.svelte";
import { syncPickup } from "$lib/state/persistence/remote-sync";
import { applyRpgState } from "$lib/state/rpg-actions.svelte";
import type { FocusedGatherSession } from "$lib/domain/gathering/focused-gather/focused-gather-types";
import { resolveFocusedGatherActivation } from "$lib/domain/gathering/focused-gather/focused-gather-activation";
import { generateTargets } from "$lib/domain/gathering/focused-gather/focused-gather-patterns";
import {
  createSession,
  expectedTarget,
  finalizeSession,
  isComplete,
  registerClick,
  targetCurrentPosition,
  tickSession,
} from "$lib/domain/gathering/focused-gather/focused-gather-session";
import { scoreSession } from "$lib/domain/gathering/focused-gather/focused-gather-scoring";
import { computeResult, resolveYieldItems } from "$lib/domain/gathering/focused-gather/focused-gather-rewards";
import { depleteNodeSystem, type InteractionResource } from "$lib/core/systems/interaction/interaction-system";

/** A session cancels if the player ends up this far (world px) from the node. */
const CANCEL_DISTANCE = TILE * 3.5;

const GRADE_MESSAGE: Record<string, string> = {
  excellent: "excellent extraction",
  good: "clean extraction",
  average: "you break it open",
  poor: "the source crumbles badly",
  ruined: "you spoil most of the source",
};

/** One target's on-canvas visual: a ring + an order label inside a container. */
export interface FocusedTargetSprite {
  container: Container;
  ring: Graphics;
  label: Text;
}

export class FocusedGatherResource {
  public session: FocusedGatherSession | null = null;
  public node: Entity | null = null;
  /** Remaining cooldown, seconds (HUD reads this). */
  public cooldownSec = 0;
  /** Cooldown duration of the last attempt, seconds (HUD ring denominator). */
  public cooldownMaxSec = 12;
  /** Per-target visuals, keyed by target id. Built/updated by the renderer. */
  public sprites = new Map<string, FocusedTargetSprite>();
}

function nodeCenter(node: Entity): { x: number; y: number } {
  return { x: node.position!.x + TILE / 2, y: node.position!.y + TILE / 2 };
}

function clearSprites(focused: FocusedGatherResource, entityLayer: Container): void {
  for (const sprite of focused.sprites.values()) {
    entityLayer.removeChild(sprite.container);
    sprite.container.destroy({ children: true });
  }
  focused.sprites.clear();
}

export interface FocusedGatherDeps {
  triggerQuestEvent: (evt: string, val?: any) => void;
  setPlayerAnim: (state: "idle" | "run" | "attack") => void;
  /** Strong-hit feedback (squash, particles, floating text); quantity drives intensity. */
  onHit: (node: Entity, yieldName: string, quantity: number) => void;
  zeroCooldowns: boolean;
  map?: MapResource;
}

export function runFocusedGatherSystem(
  world: World<Entity>,
  inputs: InputResource,
  interaction: InteractionResource,
  focused: FocusedGatherResource,
  vfx: VFXResource,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  dt: number,
  deps: FocusedGatherDeps,
): void {
  if (focused.cooldownSec > 0) focused.cooldownSec -= dt;

  const now = performance.now();
  const player = getPlayerEntity();
  const playerDead = (player.health?.current ?? 1) <= 0;

  // --- Activation (dedicated focused-gather action on a large source) ---
  const triggered = inputs.focusedGatherTriggered;
  inputs.focusedGatherTriggered = false;
  if (triggered && focused.session === null && !playerDead) {
    tryActivate(inputs, interaction, focused, vfx, player, entityLayer, now, deps.zeroCooldowns);
  }

  const session = focused.session;
  const node = focused.node;
  if (session === null || node === null) return;

  // The node vanished (destroyed elsewhere) â€” bail without payout.
  if (!entitySprites.has(node.id)) {
    clearSprites(focused, entityLayer);
    focused.session = null;
    focused.node = null;
    return;
  }

  tickSession(session, now);

  // --- Click routing (swallow the click so combat does not also swing) ---
  if (inputs.pendingAttack) {
    inputs.pendingAttack = false;
    const aimed = expectedTarget(session);
    const outcome = registerClick(session, inputs.mouseWorld, now);
    if (outcome === "hit") {
      deps.setPlayerAnim("attack");
      faceNode(player, node);
      const playerCenter = {
        x: player.position!.x + TILE / 2,
        y: player.position!.y + TILE / 2,
      };
      const nodePos = nodeCenter(node);
      spawnSlashArc(
        vfx,
        entityLayer,
        playerCenter.x,
        playerCenter.y,
        Math.atan2(nodePos.y - playerCenter.y, nodePos.x - playerCenter.x),
        TILE * 0.85,
        0.42,
        Colors.vfx.focusedGather,
      );
      const def = getGatherableDefinition(node.resource?.gatherableId ?? "");
      deps.onHit(node, def?.yieldTable[0]?.itemId ?? "resource", 2);
      if (aimed) {
        const hitPos = targetCurrentPosition(aimed, session, now);
        spawnShockwaveRing(vfx, entityLayer, hitPos.x, hitPos.y, Colors.vfx.focusedGather);
      }
      playSound(gatherSoundId(def?.gatherSound), { position: nodeCenter(node) });
    } else if (outcome === "wrong") {
      spawnEnvFloatingText(vfx, "miss", Colors.ui.error, player.position!, entityLayer);
    }
  }
  // A held release during the minigame must not fire Fell Sweep.
  inputs.pendingFellSweep = false;

  // --- Cancel / completion ---
  const dist = Math.hypot(
    (player.position!.x + TILE / 2) - nodeCenter(node).x,
    (player.position!.y + TILE / 2) - nodeCenter(node).y,
  );

  if (playerDead) {
    // Death after committing still consumes the node; otherwise abort clean.
    if (session.committed) finalizeAndReward(world, interaction, focused, vfx, entityLayer, entitySprites, now, "cancelled", deps);
    else abort(focused, entityLayer, vfx, player);
    return;
  }

  if (dist > CANCEL_DISTANCE) {
    if (session.committed) {
      finalizeAndReward(world, interaction, focused, vfx, entityLayer, entitySprites, now, "cancelled", deps);
    } else {
      abort(focused, entityLayer, vfx, player);
      spawnEnvFloatingText(vfx, "you back away", Colors.ui.muted, player.position!, entityLayer);
    }
    return;
  }

  if (isComplete(session)) {
    finalizeAndReward(world, interaction, focused, vfx, entityLayer, entitySprites, now, "completed", deps);
  }
}

function faceNode(player: Entity, node: Entity): void {
  // Mirroring is owned by the engine's player sprite; nothing to do without it
  // here, but kept as a hook so hit direction can be wired later.
  void player;
  void node;
}

function tryActivate(
  inputs: InputResource,
  interaction: InteractionResource,
  focused: FocusedGatherResource,
  vfx: VFXResource,
  player: Entity,
  entityLayer: Container,
  now: number,
  zeroCooldowns: boolean,
): void {
  const node = interaction.currentTarget ?? interaction.gatheringTarget;
  const hasUsableSource = !!node?.resource && (node.resource.hp ?? 0) > 0 && !!node.position;
  const def = hasUsableSource && node?.resource?.gatherableId ? getGatherableDefinition(node.resource.gatherableId) : undefined;
  const activation = resolveFocusedGatherActivation({
    cooldownSec: focused.cooldownSec,
    def,
    equippedToolId: getEquippedWeaponId(),
    hasUsableSource,
    playerDead: false,
    stamina: stamina.current,
    zeroCooldowns,
  });

  if (!activation.ok) {
    spawnEnvFloatingText(
      vfx,
      activation.message,
      activation.tone === "error" ? Colors.ui.error : Colors.ui.muted,
      player.position!,
      entityLayer,
    );
    return;
  }

  const profile = activation.profile;

  spendStamina(profile.staminaCost, "burst");
  interaction.gatheringTarget = null;
  interaction.gatherCooldownTimer = 0;

  if (!node?.position) return;

  const center = nodeCenter(node);
  const targets = generateTargets(profile, center);
  focused.session = createSession(profile, node.id, center, targets, now);
  focused.node = node;
  focused.cooldownSec = profile.cooldownMs / 1000;
  focused.cooldownMaxSec = profile.cooldownMs / 1000;

  spawnEnvFloatingText(vfx, "focused gathering", Colors.vfx.focusedGather, player.position!, entityLayer);
  playSound("focused.activate", { position: center });
}

function abort(
  focused: FocusedGatherResource,
  entityLayer: Container,
  vfx: VFXResource,
  player: Entity,
): void {
  void vfx;
  void player;
  clearSprites(focused, entityLayer);
  focused.session = null;
  focused.node = null;
}

function finalizeAndReward(
  world: World<Entity>,
  interaction: InteractionResource,
  focused: FocusedGatherResource,
  vfx: VFXResource,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  now: number,
  endState: "completed" | "cancelled",
  deps: FocusedGatherDeps,
): void {
  const session = focused.session!;
  const node = focused.node!;
  const def = node.resource?.gatherableId ? getGatherableDefinition(node.resource.gatherableId) : undefined;

  finalizeSession(session, now, endState);
  const score = scoreSession(session, now);
  const result = computeResult(score, session.profile, session.sourceId);

  const player = getPlayerEntity();

  if (def) {
    // Yield: persisted via the pickup path (empty pickupId avoids polluting the
    // one-shot dedupe list). Client-side grant per the milestone's decision.
    const items = resolveYieldItems(def, result, session.profile.baseYield);
    for (const item of items) {
      void syncPickup(item.itemId, "", item.quantity).then((r) => {
        if (r.ok) applyRpgState(r.data.playerState);
      });
    }

    // XP into the node's gathering skill, scaled by grade.
    const skill = def.skillKey ?? (def.solidKind === "tree" ? SkillKey.Lumberjacking : SkillKey.Mining);
    const xp = Math.round(session.profile.baseYield * 3 * result.xpMultiplier);
    awardSkillXp(skill, xp, vfx, player.position!, entityLayer);

    // Botched runs wound the gatherer (the reliably-persisted penalty;
    // tool-durability loss is deferred until a profile-save path exists).
    if (result.grade === "ruined") {
      applyWound({ severity: "deep_cut", contamination: 0.2, toolQuality: getEquippedWeaponId() ? 0.6 : 0, source: "focused-gather" });
    } else if (result.grade === "poor") {
      applyWound({ severity: "cut", contamination: 0.15, toolQuality: getEquippedWeaponId() ? 0.6 : 0, source: "focused-gather" });
    }

    const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
    const primaryName = items[0]?.itemId ?? def.yieldTable[0]?.itemId ?? "resource";
    spawnEnvFloatingText(
      vfx,
      `${GRADE_MESSAGE[result.grade]}: +${totalQty} ${primaryName}`,
      result.grade === "ruined" || result.grade === "poor" ? Colors.ui.error : Colors.vfx.focusedGather,
      player.position!,
      entityLayer,
    );
  }

  depleteNodeSystem(
    world,
    node,
    (e) => { if (interaction.currentTarget === e) interaction.currentTarget = null; },
    vfx,
    entityLayer,
    entitySprites,
    deps.triggerQuestEvent,
    deps.map,
  );
  playSound("node.deplete", { position: nodeCenter(node) });

  clearSprites(focused, entityLayer);
  focused.session = null;
  focused.node = null;
}


