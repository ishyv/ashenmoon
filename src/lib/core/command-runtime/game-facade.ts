/**
 * The dev console's window into a running game. `createGameFacade(engine)` returns
 * one curated object graph — `player`, `world`, `time`, ... — whose accessors and
 * methods delegate straight to the engine's `devXxx()` surface and the reactive
 * state modules. The console evaluates typed JS against this graph, so adding a dev
 * capability means adding one property here, in one place.
 *
 * This replaces the old `parseDevCommand -> GameCommand -> executeGameCommand ->
 * CommandContext` pipeline, which wrapped these same calls in three layers for a
 * single caller (the console) and one source ("dev").
 */

import type { GameEngine } from "$lib/core/engine";
import { world } from "$lib/core/ecs/ecs-miniplex";
import { findPlayerEntity } from "$lib/core/ecs/entity-queries";
import { TILE } from "$lib/core/systems/map/map";
import { sampleEnvironmentAt } from "$lib/core/systems/environment/environment-signal-system";
import { setStamina, spendStamina, stamina, staminaConfig } from "$lib/state/rpg/stamina.svelte";
import { setThirst, setHunger, thirst, thirstConfig } from "$lib/state/rpg/survival.svelte";
import {
  applyStatusEffect,
  clearAllStatusEffects,
  clearStatusEffect,
  statusState,
} from "$lib/state/rpg/status-effects.svelte";
import { isStatusId } from "$lib/domain/systems/status-types";
import { gameState } from "$lib/state/game-state.svelte";
import { setRpgInventory, setRpgProfile, setRpgSkills } from "$lib/state/rpg-actions.svelte";
import { clearAllWounds } from "$lib/state/rpg/wounds.svelte";
import { devEquip, devGiveItem, devSetHp } from "$lib/state/dev-rpg-actions";
import { cooldownsState, debugConfig, focusedGatherDebugState } from "$lib/state/runtime-ui-state.svelte";
import { devFlags } from "$lib/state/dev-flags.svelte";
import { resolveDevItemId, formatDevItemIdUsage } from "$lib/domain/dev-item-aliases";
import { TIME_WEATHER_CONFIG } from "$lib/domain/weather/time-config";
import { isNight } from "$lib/domain/weather/weather-events";
import { playSound } from "$lib/audio/audio-engine";
import { setVolume, setAudioMuted, type VolumeKey } from "$lib/audio/audio-settings.svelte";
import type { SoundId } from "$lib/audio/sound-manifest";
import type { RpgPlayerState } from "$lib/domain/rpg-types";

/** Skill families the console can tune, and the aliases players actually type. */
export type SkillCommandKey = "lumberjacking" | "mining" | "evade";

export function mapSkillCommandKey(name: string): SkillCommandKey | null {
  const norm = name.toLowerCase();
  if (norm === "lumberjacking" || norm === "lumberjack" || norm === "woodcutting" || norm === "chop") return "lumberjacking";
  if (norm === "mining" || norm === "mine") return "mining";
  if (norm === "evade" || norm === "dash" || norm === "dodge") return "evade";
  return null;
}

function statusListText(): string {
  if (statusState.active.length === 0) return "no active statuses";
  return statusState.active
    .map((s) => `${s.id} (${Math.ceil(s.remainingSec)}s${s.source ? `, from ${s.source}` : ""})`)
    .join(" | ");
}

function playerInspectText(): string {
  const weapon = gameState.rpg.profile?.loadout?.weapon;
  const weaponLabel =
    weapon === null || weapon === undefined
      ? "none"
      : typeof weapon === "string"
        ? weapon
        : `${weapon.itemId} (dur ${weapon.durability})`;
  const slotCount = Object.keys(gameState.rpg.inventory?.slots ?? {}).length;
  return `weapon: ${weaponLabel}  |  inventory: ${slotCount} slot(s)  |  hp: ${gameState.rpg.profile?.hpCurrent ?? "-"}`;
}

function skillInspectText(): string {
  if (!gameState.rpg.skills) return "skills state not initialized";
  return Object.entries(gameState.rpg.skills as RpgPlayerState["skills"])
    .map(([key, skill]) => `${key}: lvl ${skill.level} (${skill.xp}/${skill.nextXp} xp)`)
    .join(" | ");
}

function updateSkill(
  skill: SkillCommandKey,
  mutate: (current: { level: number; xp: number; nextXp: number }) => { level: number; xp: number; nextXp: number },
): string {
  const skills = gameState.rpg.skills;
  if (!skills) return "skills state not initialized";
  const current = skills[skill];
  if (!current) return `skill ${skill} not found in state`;
  const next = mutate(current);
  setRpgSkills({ ...skills, [skill]: next });
  return `${skill}: lvl ${next.level} (${next.xp}/${next.nextXp} xp)`;
}

/** Live, printable handles over the current enemy entities (ai + health). */
function enemyHandles(engine: GameEngine) {
  return world.with("ai", "health").entities.map((e) => {
    const grid = () => {
      const p = e.position;
      return p ? { gx: Math.round(p.x / TILE), gy: Math.round(p.y / TILE) } : { gx: 0, gy: 0 };
    };
    return {
      id: e.id,
      get hp() {
        return e.health?.current ?? 0;
      },
      get pos() {
        return grid();
      },
      kill() {
        return engine.devDespawnEntity(e.id);
      },
      toString() {
        const { gx, gy } = grid();
        return `enemy ${e.id} hp ${e.health?.current ?? 0}/${e.health?.max ?? 0} @ ${gx},${gy}`;
      },
    };
  });
}

function signals(engine: GameEngine, gx?: number, gy?: number): string {
  let x = gx;
  let y = gy;
  if (x === undefined || y === undefined) {
    const player = findPlayerEntity();
    if (!player?.position) return "no player position";
    x = Math.round(player.position.x / TILE);
    y = Math.round(player.position.y / TILE);
  }
  const point = { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 };
  const s = sampleEnvironmentAt(world, engine.weatherResource, point);
  return [
    `signals at (${x}, ${y}):`,
    `  heat     ${s.heat.toFixed(1)} c`,
    `  light    ${s.light.toFixed(2)}`,
    `  shelter  ${s.shelter.toFixed(2)}`,
    `  wetness  ${s.wetness.toFixed(2)}`,
  ].join("\n");
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function createGameFacade(engine: GameEngine) {
  const player = {
    get gx() {
      return engine.devPlayerGrid().gx;
    },
    get gy() {
      return engine.devPlayerGrid().gy;
    },
    get hp() {
      return gameState.rpg.profile?.hpCurrent ?? 0;
    },
    set hp(n: number) {
      devSetHp(n);
      engine.devSetPlayerHp(n);
    },
    set speed(t: number) {
      engine.devSetSpeed(t);
    },
    tp: (gx: number, gy: number) => engine.devTeleport(gx, gy),
    noclip: () => engine.devToggleNoclip(),
    spectator: (on: boolean) => {
      engine.devSetSpectator(on);
      return `spectator mode ${on ? "enabled" : "disabled"}`;
    },
    interact: () => {
      engine.triggerInteract();
      return "interaction queued";
    },
    inspect: playerInspectText,
    give: (itemId: string, qty = 1) => {
      const id = resolveDevItemId(itemId);
      if (!id) return formatDevItemIdUsage(itemId);
      devGiveItem(id, qty);
      return `+${qty}x ${id} -> inventory`;
    },
    equip: (itemId: string) => {
      const id = resolveDevItemId(itemId);
      if (!id) return formatDevItemIdUsage(itemId);
      devEquip(id);
      return `weapon -> ${id}`;
    },
    unequip: () => {
      devEquip(null);
      return "weapon cleared";
    },
    reset: () => {
      setRpgProfile(null);
      setRpgInventory(null);
      setRpgSkills(null);
      clearAllStatusEffects();
      clearAllWounds();
      setThirst(100);
      setHunger(100);
      setStamina(staminaConfig.max);
      engine.devSetPlayerHp(600);
      return "player state reset (profile, inventory, skills, survival, wounds, statuses)";
    },
  };

  const worldNs = {
    spawn: (prefabId: string, gx: number, gy: number) => engine.spawnPrefab(prefabId, gx, gy),
    enemy: (gx?: number, gy?: number) => engine.devSpawnEnemy(gx, gy),
    clearEnemies: () => engine.devClearEnemies(),
    get enemies() {
      return enemyHandles(engine);
    },
    signals: (gx?: number, gy?: number) => signals(engine, gx, gy),
    respawnNodes: () => {
      engine.respawnAllNodes();
      return "nodes respawned";
    },
  };

  const time = {
    get: () => engine.weatherResource.state.timeOfDay,
    set: (fraction: number) => {
      const v = clamp01(fraction);
      engine.weatherResource.state.timeOfDay = v;
      return `time set to ${v.toFixed(2)} (${isNight(v) ? "night" : "day"})`;
    },
    speed: (multiplier: number) => {
      TIME_WEATHER_CONFIG.timeSpeedMultiplier = Math.max(0, multiplier);
      return `time speed x${TIME_WEATHER_CONFIG.timeSpeedMultiplier}`;
    },
  };

  const weather = {
    rain: (on: boolean) => {
      engine.weatherResource.state.raining = on;
      engine.weatherResource.state.rainRemainingSec = on ? 180 : 0;
      return on ? "rain triggered" : "rain stopped";
    },
    get: () => {
      const w = engine.weatherResource.state;
      return w.raining ? `raining (${w.rainRemainingSec.toFixed(1)}s remaining)` : "clear";
    },
  };

  const skills = {
    inspect: skillInspectText,
    addXp: (skill: string, qty: number) => {
      const key = mapSkillCommandKey(skill);
      if (!key) return `unknown skill: ${skill}`;
      return updateSkill(key, (current) => {
        let xp = current.xp + qty;
        let level = current.level;
        let nextXp = current.nextXp;
        while (xp >= nextXp) {
          xp -= nextXp;
          level += 1;
          nextXp = level * 100;
        }
        return { level, xp, nextXp };
      });
    },
    setLevel: (skill: string, level: number) => {
      const key = mapSkillCommandKey(skill);
      if (!key) return `unknown skill: ${skill}`;
      return updateSkill(key, () => ({ level, xp: 0, nextXp: level * 100 }));
    },
  };

  const status = {
    list: statusListText,
    apply: (id: string, sec = 30) => {
      if (!isStatusId(id)) return `unknown status: ${id}`;
      applyStatusEffect(id, sec, "dev");
      return `applied ${id} for ${sec}s`;
    },
    clear: (id: string) => {
      if (!isStatusId(id)) return `unknown status: ${id}`;
      clearStatusEffect(id);
      return `cleared ${id}`;
    },
    clearAll: () => {
      clearAllStatusEffects();
      return "all statuses cleared";
    },
  };

  const staminaNs = {
    get: () => `stamina ${Math.round(stamina.current)}/${staminaConfig.max}`,
    set: (value: number) => {
      setStamina(value);
      return `stamina ${Math.round(stamina.current)}/${staminaConfig.max}`;
    },
    max: (value: number) => {
      staminaConfig.max = value;
      return `stamina max ${value}`;
    },
    regen: (passivePerSec: number, combatPerSec: number) => {
      staminaConfig.regenPassive = passivePerSec;
      staminaConfig.regenCombat = combatPerSec;
      return `stamina regen passive ${passivePerSec}/s, combat ${combatPerSec}/s`;
    },
    spend: (amount: number, mode: "drain" | "burst" = "drain") => {
      spendStamina(amount, mode);
      return `spent ${amount} (${mode}) -> ${Math.round(stamina.current)}/${staminaConfig.max}`;
    },
  };

  const thirstNs = {
    get: () => `thirst ${Math.round(thirst.current)}/${thirstConfig.max}`,
    set: (value: number) => {
      setThirst(value);
      return `thirst ${Math.round(thirst.current)}/${thirstConfig.max}`;
    },
    max: (value: number) => {
      thirstConfig.max = value;
      return `thirst max ${value}`;
    },
    rate: (baseDrainPerSec: number) => {
      thirstConfig.baseDrainPerSec = baseDrainPerSec;
      return `thirst drain ${baseDrainPerSec}/s`;
    },
  };

  const cooldown = {
    get: () =>
      `zero: ${debugConfig.zeroCooldowns ? "on" : "off"} | evade ${cooldownsState.evade.toFixed(1)}s | focused ${cooldownsState.focusedGather.toFixed(1)}s`,
    zero: (on: boolean) => {
      debugConfig.zeroCooldowns = on;
      return `zero cooldowns ${on ? "on" : "off"}`;
    },
    reset: () => engine.devResetCooldowns(),
  };

  const debug = {
    set shakeScale(m: number) {
      engine.devSetShakeScale(m);
    },
    set particleCount(n: number) {
      engine.devSetParticleCount(n);
    },
    set gatherSpeed(s: number) {
      engine.devSetGatherSpeed(s);
    },
    set freeBuilding(on: boolean) {
      devFlags.freeBuildingEnabled = on;
    },
    collision: {
      list: () => {
        const s = engine.getCollisionDebugSnapshot();
        return `${s.solids.length} solid tile(s), ${s.overrides.length} override(s), overlay ${s.overlayVisible ? "on" : "off"}`;
      },
      show: (on: boolean) => engine.setCollisionOverlayVisible(on),
      get: (id: string) => {
        const o = engine.getCollisionDebugSnapshot().overrides.find((entry) => entry.id === id);
        return o
          ? `${id}: ${o.footprint.minX} ${o.footprint.maxX} ${o.footprint.minY} ${o.footprint.maxY} (override)`
          : `${id}: no runtime override`;
      },
      set: (id: string, minX: number, maxX: number, minY: number, maxY: number) =>
        engine.setCollisionFootprintOverride(id, { minX, maxX, minY, maxY }),
      reset: (id: string) => engine.clearCollisionFootprintOverride(id),
    },
  };

  const audio = {
    play: (id: string) => {
      playSound(id as SoundId);
      return `played ${id}`;
    },
    set muted(on: boolean) {
      setAudioMuted(on);
    },
    volume: (bus: string, value: number) => {
      setVolume(bus as VolumeKey, value);
      return `${bus} volume ${value}`;
    },
  };

  const focused = {
    start: () => engine.devStartFocusedGather(),
    get debug() {
      const d = focusedGatherDebugState.last;
      if (!d) return "no focused-gather telemetry yet";
      return [
        `focused gather: ${d.resourceId}`,
        `  pattern: ${d.patternId}`,
        `  targets: ${d.targetCount}`,
        `  distance: ${d.totalDistancePx.toFixed(1)}px`,
        `  time: ${d.estimatedRequiredTimeMs.toFixed(0)}ms req / ${d.availableTimeMs.toFixed(0)}ms avail`,
        `  feasible: ${d.feasible ? "yes" : "no"}`,
        `  difficulty: ${d.difficultyScore.toFixed(2)}`,
      ].join("\n");
    },
  };

  return {
    player,
    world: worldNs,
    time,
    weather,
    skills,
    status,
    stamina: staminaNs,
    thirst: thirstNs,
    cooldown,
    debug,
    audio,
    focused,
  };
}

export type GameFacade = ReturnType<typeof createGameFacade>;

/** Introspective `help`: no arg lists namespaces; a namespace lists its members. */
function makeHelp(facade: GameFacade) {
  return (x?: unknown): string => {
    if (x === undefined) {
      return `namespaces: ${Object.keys(facade).join(", ")}\ntry help(player) or help("world")`;
    }
    const ns = typeof x === "string" ? (facade as Record<string, unknown>)[x] : x;
    if (!ns || typeof ns !== "object") return typeof x === "string" ? `unknown namespace: ${x}` : String(x);
    return Object.keys(ns).sort().join(", ") || "(no members)";
  };
}

/**
 * The identifiers in scope when the console evaluates input: every namespace
 * unprefixed, `game` for the whole graph, `help`, and a few terse globals so
 * `tp 5 5` / `spawn wolf 5 5` muscle memory still resolves.
 */
export function buildScope(facade: GameFacade): Record<string, unknown> {
  return {
    game: facade,
    player: facade.player,
    world: facade.world,
    time: facade.time,
    weather: facade.weather,
    skills: facade.skills,
    status: facade.status,
    stamina: facade.stamina,
    thirst: facade.thirst,
    cooldown: facade.cooldown,
    debug: facade.debug,
    audio: facade.audio,
    focused: facade.focused,
    help: makeHelp(facade),
    tp: facade.player.tp,
    spawn: facade.world.spawn,
    give: facade.player.give,
    pos: () => `${facade.player.gx},${facade.player.gy}`,
    noclip: facade.player.noclip,
    spectator: (on: boolean) => facade.player.spectator(on),
    interact: facade.player.interact,
    clearEnemies: facade.world.clearEnemies,
  };
}
