import type { CommandSource, SkillCommandKey } from "$lib/domain/game-command";
import { setStamina, spendStamina, stamina, staminaConfig } from "$lib/state/rpg/stamina.svelte";
import type { RpgPlayerState } from "$lib/domain/rpg-types";
import {
  applyStatusEffect,
  clearAllStatusEffects,
  clearStatusEffect,
  statusState,
} from "$lib/state/rpg/status-effects.svelte";
import { setThirst, thirst, thirstConfig } from "$lib/state/rpg/survival.svelte";
import { StatusId } from "$lib/domain/systems/status-types";
import type { GameEngine } from "$lib/core/engine";
import type { CommandContext } from "./command-runtime";
import { gameState } from "$lib/state/game-state.svelte";
import { setRpgInventory, setRpgProfile, setRpgSkills } from "$lib/state/rpg-actions.svelte";
import { devEquip, devGiveItem, devSetHp } from "$lib/state/dev-rpg-actions";
import { cooldownsState, debugConfig } from "$lib/state/runtime-ui-state.svelte";

function statusListText(): string {
  if (statusState.active.length === 0) return "no active statuses";
  return statusState.active
    .map((s) => `${s.id} (${Math.ceil(s.remainingSec)}s${s.source ? `, from ${s.source}` : ""})`)
    .join(" | ");
}

function rpgInspectText(): string {
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
    .map(([key, skill]) => `${key}: Lvl ${skill.level} (${skill.xp}/${skill.nextXp} XP)`)
    .join(" | ");
}

function updateSkill(skill: SkillCommandKey, mutate: (current: { level: number; xp: number; nextXp: number }) => { level: number; xp: number; nextXp: number }): string {
  const skills = gameState.rpg.skills;
  if (!skills) return "skills state not initialized";
  const current = skills[skill];
  if (!current) return `skill ${skill} not found in state`;

  const next = mutate(current);
  setRpgSkills({ ...skills, [skill]: next });
  return `${skill}: Lvl ${next.level} (${next.xp}/${next.nextXp} XP)`;
}

export function createEngineCommandContext(
  engine: GameEngine,
  source: CommandSource = "dev",
): CommandContext {
  return {
    source,
    position: () => engine.devPlayerGrid(),
    teleport: (gx, gy) => engine.devTeleport(gx, gy),
    spawnPrefab: (prefabId, gx, gy) => engine.spawnPrefab(prefabId, gx, gy),
    setSpeed: (tilesPerSec) => engine.devSetSpeed(tilesPerSec),
    toggleNoclip: () => engine.devToggleNoclip(),
    triggerInteract: () => {
      engine.triggerInteract();
      return "interaction queued";
    },
    setGatherSpeed: (seconds) => engine.devSetGatherSpeed(seconds),
    setShakeScale: (multiplier) => engine.devSetShakeScale(multiplier),
    setParticleCount: (count) => engine.devSetParticleCount(count),
    playSound: (sound) => engine.devPlaySound(sound),
    setSoundEnabled: (enabled) => engine.devToggleSound(enabled),
    stamina: {
      inspect: () =>
        `stamina ${Math.round(stamina.current)}/${staminaConfig.max} (regen passive ${staminaConfig.regenPassive}/s, combat ${staminaConfig.regenCombat}/s)`,
      set: (value) => {
        setStamina(value);
        return `stamina ${Math.round(stamina.current)}/${staminaConfig.max}`;
      },
      setMax: (value) => {
        staminaConfig.max = value;
        return `stamina max set to ${value}`;
      },
      setRegen: (passivePerSec, combatPerSec) => {
        staminaConfig.regenPassive = passivePerSec;
        staminaConfig.regenCombat = combatPerSec;
        return `stamina regen set to passive ${passivePerSec}/s, combat ${combatPerSec}/s`;
      },
      spend: (amount, mode) => {
        spendStamina(amount, mode);
        return `spent ${amount} (${mode}) -> ${Math.round(stamina.current)}/${staminaConfig.max}`;
      },
    },
    thirst: {
      inspect: () => `thirst ${Math.round(thirst.current)}/${thirstConfig.max} (base drain ${thirstConfig.baseDrainPerSec}/s)`,
      set: (value) => {
        setThirst(value);
        return `thirst ${Math.round(thirst.current)}/${thirstConfig.max}`;
      },
      setMax: (value) => {
        thirstConfig.max = value;
        return `thirst max set to ${value}`;
      },
      setRate: (baseDrainPerSec) => {
        thirstConfig.baseDrainPerSec = baseDrainPerSec;
        return `thirst base drain set to ${baseDrainPerSec}/s`;
      },
    },
    status: {
      list: statusListText,
      apply: (statusId, durationSec) => {
        applyStatusEffect(statusId, durationSec, source);
        return `applied ${statusId} for ${durationSec}s`;
      },
      clear: (statusId) => {
        clearStatusEffect(statusId);
        return `cleared ${statusId}`;
      },
      clearAll: () => {
        clearAllStatusEffects();
        return "all statuses cleared";
      },
    },
    rpg: {
      inspect: rpgInspectText,
      equip: (itemId) => {
        devEquip(itemId);
        return itemId ? `weapon slot -> ${itemId} (dev, dur=100)` : "weapon slot cleared";
      },
      give: (itemId, qty) => {
        devGiveItem(itemId, qty);
        return `+${qty}x ${itemId} -> local inventory`;
      },
      setHp: (hp) => {
        devSetHp(hp);
        engine.devSetPlayerHp(hp);
        return `hp set to ${hp}`;
      },
      reset: () => {
        setRpgProfile(null);
        setRpgInventory(null);
        setRpgSkills(null);
        return "rpg state cleared";
      },
    },
    skill: {
      inspect: skillInspectText,
      addXp: (skill, qty) =>
        updateSkill(skill, (current) => {
          let xp = current.xp + qty;
          let level = current.level;
          let nextXp = current.nextXp;
          while (xp >= nextXp) {
            xp -= nextXp;
            level += 1;
            nextXp = level * 100;
          }
          return { level, xp, nextXp };
        }),
      setLevel: (skill, level) =>
        updateSkill(skill, () => ({ level, xp: 0, nextXp: level * 100 })),
    },
    cooldown: {
      inspect: () =>
        `zero cooldowns: ${debugConfig.zeroCooldowns ? "on" : "off"} | active evade: ${cooldownsState.evade.toFixed(1)}s | active focused gather: ${cooldownsState.focusedGather.toFixed(1)}s`,
      setZero: (enabled) => {
        debugConfig.zeroCooldowns = enabled;
        return `zero cooldowns ${enabled ? "enabled" : "disabled"}`;
      },
      reset: () => engine.devResetCooldowns(),
    },
    collision: {
      list: () => {
        const snapshot = engine.getCollisionDebugSnapshot();
        return `${snapshot.solids.length} solid tile(s), ${snapshot.overrides.length} override(s), overlay ${snapshot.overlayVisible ? "on" : "off"}`;
      },
      show: (enabled) => engine.setCollisionOverlayVisible(enabled),
      get: (id) => {
        const override = engine.getCollisionDebugSnapshot().overrides.find((entry) => entry.id === id);
        return override
          ? `${id}: ${override.footprint.minX} ${override.footprint.maxX} ${override.footprint.minY} ${override.footprint.maxY} (override)`
          : `${id}: no runtime override`;
      },
      set: (id, footprint) => engine.setCollisionFootprintOverride(id, footprint),
      reset: (id) => engine.clearCollisionFootprintOverride(id),
    },
    focused: {
      start: () => engine.devStartFocusedGather(),
    },
  };
}

export const statusCommandIds = Object.values(StatusId);

