/**
 * Game-specific dev-console commands. Lives apart from `dev-console.ts` so the
 * console core stays game-agnostic: this module is the only place that knows
 * both the console and the engine. Adding a command for a future system (give,
 * inventory, time-of-day…) means appending here, not touching the core.
 */

import { devConsole } from "./dev-console";
import type { GameEngine } from "./engine";
import { rpgState, devEquip, devGiveItem, devSetHp, cooldownsState, debugConfig } from "./rpg-state.svelte";
import { type SpendMode, setStamina, spendStamina, stamina, staminaConfig } from "./stamina.svelte";

/** Parses a base-10 int, or null if the token isn't a finite integer. */
function int(token: string | undefined): number | null {
  if (token === undefined) return null;
  const n = Number(token);
  return Number.isInteger(n) ? n : null;
}

/**
 * Registers every game command against the singleton console. Call once after
 * the engine is constructed; the engine is captured by closure so commands can
 * act on it without the console core depending on game types.
 */
export function registerDevCommands(engine: GameEngine): void {
  devConsole.register({
    name: "pos",
    help: "pos : print player grid position",
    run: () => {
      const { gx, gy } = engine.devPlayerGrid();
      return `player at ${gx},${gy}`;
    },
  });

  devConsole.register({
    name: "tp",
    help: "tp <gx> <gy> : teleport player",
    run: (args) => {
      const gx = int(args[0]);
      const gy = int(args[1]);
      if (gx === null || gy === null) return "usage: tp <gx> <gy>";
      return engine.devTeleport(gx, gy);
    },
  });

  devConsole.register({
    name: "speed",
    help: "speed <tiles/s> : set move speed",
    run: (args) => {
      const n = int(args[0]);
      if (n === null || n <= 0) return "usage: speed <tiles/s>";
      return engine.devSetSpeed(n);
    },
  });

  devConsole.register({
    name: "spawn",
    help: "spawn <tree|ore> <gx> <gy> : spawn a resource node",
    run: (args) => {
      const kind = args[0];
      const gx = int(args[1]);
      const gy = int(args[2]);
      if ((kind !== "tree" && kind !== "ore") || gx === null || gy === null) {
        return "usage: spawn <tree|ore> <gx> <gy>";
      }
      return engine.devSpawn(kind, gx, gy);
    },
  });

  devConsole.register({
    name: "noclip",
    help: "noclip : toggle walk-through-walls",
    run: () => engine.devToggleNoclip(),
  });

  devConsole.register({
    name: "gatherspeed",
    help: "gatherspeed <seconds> : set continuous gather swing rate",
    run: (args) => {
      const val = args[0] ? Number(args[0]) : null;
      if (val === null || Number.isNaN(val) || val <= 0) {
        return "usage: gatherspeed <seconds>";
      }
      return engine.devSetGatherSpeed(val);
    },
  });

  devConsole.register({
    name: "shakescale",
    help: "shakescale <multiplier> : scale resource shake intensity",
    run: (args) => {
      const val = args[0] ? Number(args[0]) : null;
      if (val === null || Number.isNaN(val) || val < 0) {
        return "usage: shakescale <multiplier>";
      }
      return engine.devSetShakeScale(val);
    },
  });

  devConsole.register({
    name: "particlecount",
    help: "particlecount <count> : set particles generated on hit",
    run: (args) => {
      const val = args[0] ? Number(args[0]) : null;
      if (val === null || Number.isNaN(val) || val < 0) {
        return "usage: particlecount <count>";
      }
      return engine.devSetParticleCount(val);
    },
  });

  devConsole.register({
    name: "playsound",
    help: "playsound <chop|clink|fall|deplete> : trigger procedural audio direct test",
    run: (args) => {
      const name = args[0];
      if (!name) return "usage: playsound <chop|clink|fall|deplete>";
      return engine.devPlaySound(name);
    },
  });

  devConsole.register({
    name: "sound",
    help: "sound <on|off> : toggle procedural audio synthesis",
    run: (args) => {
      const val = args[0];
      if (val !== "on" && val !== "off") return "usage: sound <on|off>";
      return engine.devToggleSound(val === "on");
    },
  });

  // Sub-actions for `stamina`; keyed dispatch instead of an if-chain.
  const staminaSub: Record<string, (a: string[]) => string> = {
    set: (a) => {
      const n = int(a[0]);
      if (n === null) return "usage: stamina set <n>";
      setStamina(n);
      return `stamina ${Math.round(stamina.current)}/${staminaConfig.max}`;
    },
    max: (a) => {
      const n = int(a[0]);
      if (n === null || n <= 0) return "usage: stamina max <n>";
      staminaConfig.max = n;
      return `stamina max set to ${n}`;
    },
    regen: (a) => {
      const p = int(a[0]);
      const c = int(a[1]);
      if (p === null || c === null) return "usage: stamina regen <passive/s> <combat/s>";
      staminaConfig.regenPassive = p;
      staminaConfig.regenCombat = c;
      return `stamina regen set to passive ${p}/s, combat ${c}/s`;
    },
  };

  devConsole.register({
    name: "stamina",
    help: "stamina [set <n> | max <n> | regen <p> <c>] : inspect / tune stamina",
    run: (args) => {
      if (!args[0]) {
        return `stamina ${Math.round(stamina.current)}/${staminaConfig.max} (regen passive ${staminaConfig.regenPassive}/s, combat ${staminaConfig.regenCombat}/s)`;
      }
      const sub = staminaSub[args[0]];
      return sub ? sub(args.slice(1)) : "usage: stamina [set <n> | max <n> | regen <p> <c>]";
    },
  });

  devConsole.register({
    name: "spend",
    help: "spend <amount> [drain|burst] : spend stamina (test the bar animation)",
    run: (args) => {
      const amount = int(args[0]);
      const mode = (args[1] ?? "drain") as SpendMode;
      if (amount === null || amount <= 0 || (mode !== "drain" && mode !== "burst")) {
        return "usage: spend <amount> [drain|burst]";
      }
      spendStamina(amount, mode);
      return `spent ${amount} (${mode}) -> ${Math.round(stamina.current)}/${staminaConfig.max}`;
    },
  });

  // Keyed dispatch for `rpg` subcommands (same pattern as `stamina`).
  const rpgSub: Record<string, (a: string[]) => string> = {
    equip: (a) => {
      const itemId = a[0];
      if (!itemId) return "usage: rpg equip <itemId>  (e.g. starter_axe, starter_pickaxe)";
      devEquip(itemId);
      return `weapon slot → ${itemId} (dev, dur=100)`;
    },
    unequip: () => {
      devEquip(null);
      return "weapon slot cleared";
    },
    give: (a) => {
      const itemId = a[0];
      const qty = int(a[1]) ?? 1;
      if (!itemId || qty <= 0) return "usage: rpg give <itemId> [qty]";
      devGiveItem(itemId, qty);
      return `+${qty}x ${itemId} → local inventory`;
    },
    hp: (a) => {
      const n = int(a[0]);
      if (n === null || n < 0) return "usage: rpg hp <n>";
      devSetHp(n);
      return `hp set to ${n}`;
    },
    reset: () => {
      rpgState.profile = null;
      rpgState.inventory = null;
      return "rpgState cleared (will re-fetch on next server interaction)";
    },
  };

  devConsole.register({
    name: "rpg",
    help: "rpg [equip <id> | unequip | give <id> [qty] | hp <n> | reset] : patch local rpg state",
    run: (args) => {
      if (!args[0]) {
        const weapon = rpgState.profile?.loadout?.weapon;
        const weaponLabel =
          weapon === null || weapon === undefined
            ? "none"
            : typeof weapon === "string"
              ? weapon
              : `${weapon.itemId} (dur ${weapon.durability})`;
        const slotCount = Object.keys(rpgState.inventory?.slots ?? {}).length;
        return `weapon: ${weaponLabel}  |  inventory: ${slotCount} slot(s)  |  hp: ${rpgState.profile?.hpCurrent ?? "—"}`;
      }
      const sub = rpgSub[args[0]];
      return sub
        ? sub(args.slice(1))
        : "usage: rpg [equip <id> | unequip | give <id> [qty] | hp <n> | reset]";
    },
  });

  // Keyed dispatch for `skill` subcommands
  const skillSub: Record<string, (a: string[]) => string> = {
    addxp: (a) => {
      const skillName = a[0];
      const qty = int(a[1]);
      if (!skillName || qty === null || qty <= 0) {
        return "usage: skill addxp <lumberjacking|mining|evade|supergather> <qty>";
      }
      const skills = rpgState.skills;
      if (!skills) return "skills state not initialized";
      const key = mapSkillName(skillName);
      if (!key) {
        return `invalid skill: ${skillName}. Choose from: lumberjacking, mining, evade, supergather`;
      }
      const skill = skills[key];
      if (!skill) return `skill ${key} not found in state`;
      
      const newXp = skill.xp + qty;
      let currentXp = newXp;
      let currentLvl = skill.level;
      let currentNextXp = skill.nextXp;
      while (currentXp >= currentNextXp) {
        currentXp -= currentNextXp;
        currentLvl += 1;
        currentNextXp = currentLvl * 100;
      }
      
      rpgState.skills = {
        ...rpgState.skills,
        [key]: { level: currentLvl, xp: currentXp, nextXp: currentNextXp },
      } as any;
      return `added ${qty} XP to ${key}. Now Level ${currentLvl} (${currentXp}/${currentNextXp} XP)`;
    },
    setlevel: (a) => {
      const skillName = a[0];
      const lvl = int(a[1]);
      if (!skillName || lvl === null || lvl <= 0) {
        return "usage: skill setlevel <lumberjacking|mining|evade|supergather> <lvl>";
      }
      const skills = rpgState.skills;
      if (!skills) return "skills state not initialized";
      const key = mapSkillName(skillName);
      if (!key) {
        return `invalid skill: ${skillName}. Choose from: lumberjacking, mining, evade, supergather`;
      }
      const newNextXp = lvl * 100;
      rpgState.skills = {
        ...rpgState.skills,
        [key]: { level: lvl, xp: 0, nextXp: newNextXp },
      } as any;
      return `${key} level set to ${lvl}`;
    },
  };

  devConsole.register({
    name: "skill",
    help: "skill [addxp <skill> <qty> | setlevel <skill> <lvl>] : manage skill levels and progression",
    run: (args) => {
      if (!args[0]) {
        if (!rpgState.skills) return "skills state not initialized";
        return Object.entries(rpgState.skills)
          .map(([k, s]) => `${k}: Lvl ${s.level} (${s.xp}/${s.nextXp} XP)`)
          .join(" | ");
      }
      const sub = skillSub[args[0].toLowerCase()];
      return sub
        ? sub(args.slice(1))
        : "usage: skill [addxp <skill> <qty> | setlevel <skill> <lvl>]";
    },
  });

  // Keyed dispatch for `cooldown` subcommands
  const cooldownSub: Record<string, (a: string[]) => string> = {
    zero: (a) => {
      const mode = a[0]?.toLowerCase();
      if (mode !== "on" && mode !== "off") return "usage: cooldown zero <on|off>";
      debugConfig.zeroCooldowns = mode === "on";
      return `zero cooldowns ${debugConfig.zeroCooldowns ? "enabled" : "disabled"}`;
    },
    reset: () => {
      return engine.devResetCooldowns();
    },
  };

  devConsole.register({
    name: "cooldown",
    help: "cooldown [zero <on|off> | reset] : manage skill cooldown timers",
    run: (args) => {
      if (!args[0]) {
        return `zero cooldowns: ${debugConfig.zeroCooldowns ? "on" : "off"} | active evade: ${cooldownsState.evade.toFixed(1)}s | active super-gather: ${cooldownsState.superGather.toFixed(1)}s`;
      }
      const sub = cooldownSub[args[0].toLowerCase()];
      return sub ? sub(args.slice(1)) : "usage: cooldown [zero <on|off> | reset]";
    },
  });
}

/** Maps user-friendly skill names/aliases to the exact RpgState.skills key name. */
function mapSkillName(name: string): "lumberjacking" | "mining" | "evade" | "superGather" | null {
  const norm = name.toLowerCase();
  if (norm === "lumberjacking" || norm === "lumberjack" || norm === "woodcutting" || norm === "chop") return "lumberjacking";
  if (norm === "mining" || norm === "mine") return "mining";
  if (norm === "evade" || norm === "dash" || norm === "dodge") return "evade";
  if (norm === "supergather" || norm === "super-gather" || norm === "super_gather") return "superGather";
  return null;
}
