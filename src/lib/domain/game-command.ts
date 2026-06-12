import { isStatusId, type StatusId } from "$lib/domain/systems/status-types";
import type { CollisionFootprint } from "$lib/domain/collision";

export type CommandSource = "player" | "ui" | "dev" | "test" | "script";

export type GameCommand =
  | { type: "world.position" }
  | { type: "world.teleport"; gx: number; gy: number }
  | { type: "world.spawn"; prefabId: string; gx: number; gy: number }
  | { type: "player.speed.set"; tilesPerSec: number }
  | { type: "player.noclip.toggle" }
  | { type: "interaction.trigger" }
  | { type: "debug.gatherSpeed.set"; seconds: number }
  | { type: "debug.shakeScale.set"; multiplier: number }
  | { type: "debug.particleCount.set"; count: number }
  | { type: "audio.play"; sound: "chop" | "clink" | "fall" | "deplete" }
  | { type: "audio.enabled.set"; enabled: boolean }
  | { type: "stamina.inspect" }
  | { type: "stamina.set"; value: number }
  | { type: "stamina.max.set"; value: number }
  | { type: "stamina.regen.set"; passivePerSec: number; combatPerSec: number }
  | { type: "stamina.spend"; amount: number; mode: "drain" | "burst" }
  | { type: "thirst.inspect" }
  | { type: "thirst.set"; value: number }
  | { type: "thirst.max.set"; value: number }
  | { type: "thirst.rate.set"; baseDrainPerSec: number }
  | { type: "status.list" }
  | { type: "status.apply"; statusId: StatusId; durationSec: number }
  | { type: "status.clear"; statusId: StatusId }
  | { type: "status.clearAll" }
  | { type: "rpg.inspect" }
  | { type: "rpg.equip"; itemId: string | null }
  | { type: "rpg.give"; itemId: string; qty: number }
  | { type: "rpg.hp.set"; hp: number }
  | { type: "rpg.reset" }
  | { type: "skill.inspect" }
  | { type: "skill.addXp"; skill: SkillCommandKey; qty: number }
  | { type: "skill.level.set"; skill: SkillCommandKey; level: number }
  | { type: "cooldown.inspect" }
  | { type: "cooldown.zero.set"; enabled: boolean }
  | { type: "cooldown.reset" }
  | { type: "collision.list" }
  | { type: "collision.show"; enabled: boolean }
  | { type: "collision.get"; id: string }
  | { type: "collision.set"; id: string; footprint: CollisionFootprint }
  | { type: "collision.reset"; id: string }
  | { type: "focused.start" };

export type SkillCommandKey = "lumberjacking" | "mining" | "evade";

export type GameEvent =
  | { type: "command.executed"; command: GameCommand["type"]; source: CommandSource }
  | { type: "world.spawned"; prefabId: string; gx: number; gy: number }
  | { type: "world.teleported"; gx: number; gy: number }
  | { type: "interaction.triggered" }
  | { type: "inventory.changed"; itemId: string; qtyDelta: number }
  | { type: "equipment.changed"; itemId: string | null }
  | { type: "vitals.changed"; vital: "hp" | "stamina" | "thirst"; value: number }
  | { type: "status.applied"; statusId: StatusId; durationSec: number }
  | { type: "status.cleared"; statusId?: StatusId }
  | { type: "skill.changed"; skill: SkillCommandKey };

export type GameEffect =
  | { kind: "runtime"; channel: "world" | "audio" | "debug" | "interaction"; description: string }
  | { kind: "inventory"; itemId: string; qtyDelta: number }
  | { kind: "equipment"; itemId: string | null }
  | { kind: "vitals"; vital: "hp" | "stamina" | "thirst"; value: number }
  | { kind: "status"; operation: "apply" | "clear" | "clearAll"; statusId?: StatusId; durationSec?: number }
  | { kind: "skill"; skill: SkillCommandKey; operation: "addXp" | "setLevel"; value: number }
  | { kind: "state"; description: string };

export interface CommandFeedback {
  tone: "info" | "success" | "warning" | "error";
  message: string;
}

export type GameCommandResult =
  | {
      ok: true;
      events: GameEvent[];
      effects: GameEffect[];
      feedback: CommandFeedback[];
      statePatch?: unknown;
    }
  | {
      ok: false;
      events: GameEvent[];
      effects: GameEffect[];
      feedback: CommandFeedback[];
      error: { code: string; message: string };
    };

export interface CommandParseError {
  ok: false;
  code: "unknown_command" | "invalid_args";
  message: string;
}

export type CommandParseResult = { ok: true; command: GameCommand } | CommandParseError;

function int(token: string | undefined): number | null {
  if (token === undefined) return null;
  const n = Number(token);
  return Number.isInteger(n) ? n : null;
}

function finite(token: string | undefined): number | null {
  if (token === undefined) return null;
  const n = Number(token);
  return Number.isFinite(n) ? n : null;
}

function invalid(message: string): CommandParseError {
  return { ok: false, code: "invalid_args", message };
}

function onOff(token: string | undefined): boolean | null {
  if (token === "on") return true;
  if (token === "off") return false;
  return null;
}

export function mapSkillCommandKey(name: string): SkillCommandKey | null {
  const norm = name.toLowerCase();
  if (norm === "lumberjacking" || norm === "lumberjack" || norm === "woodcutting" || norm === "chop") return "lumberjacking";
  if (norm === "mining" || norm === "mine") return "mining";
  if (norm === "evade" || norm === "dash" || norm === "dodge") return "evade";
  return null;
}

export function parseDevCommand(input: string): CommandParseResult {
  const [name = "", ...args] = input.trim().split(/\s+/);
  if (!name) return invalid("empty command");

  if (name === "pos") return { ok: true, command: { type: "world.position" } };
  if (name === "tp") {
    const gx = int(args[0]);
    const gy = int(args[1]);
    return gx === null || gy === null
      ? invalid("usage: tp <gx> <gy>")
      : { ok: true, command: { type: "world.teleport", gx, gy } };
  }
  if (name === "speed") {
    const tilesPerSec = finite(args[0]);
    return tilesPerSec === null || tilesPerSec <= 0
      ? invalid("usage: speed <tiles/s>")
      : { ok: true, command: { type: "player.speed.set", tilesPerSec } };
  }
  if (name === "spawn") {
    const gx = int(args[1]);
    const gy = int(args[2]);
    return !args[0] || gx === null || gy === null
      ? invalid("usage: spawn <prefabId> <gx> <gy>")
      : { ok: true, command: { type: "world.spawn", prefabId: args[0], gx, gy } };
  }
  if (name === "noclip") return { ok: true, command: { type: "player.noclip.toggle" } };
  if (name === "interact") return { ok: true, command: { type: "interaction.trigger" } };
  if (name === "gatherspeed") {
    const seconds = finite(args[0]);
    return seconds === null || seconds <= 0
      ? invalid("usage: gatherspeed <seconds>")
      : { ok: true, command: { type: "debug.gatherSpeed.set", seconds } };
  }
  if (name === "shakescale") {
    const multiplier = finite(args[0]);
    return multiplier === null || multiplier < 0
      ? invalid("usage: shakescale <multiplier>")
      : { ok: true, command: { type: "debug.shakeScale.set", multiplier } };
  }
  if (name === "particlecount") {
    const count = int(args[0]);
    return count === null || count < 0
      ? invalid("usage: particlecount <count>")
      : { ok: true, command: { type: "debug.particleCount.set", count } };
  }
  if (name === "playsound") {
    const sound = args[0];
    return sound !== "chop" && sound !== "clink" && sound !== "fall" && sound !== "deplete"
      ? invalid("usage: playsound <chop|clink|fall|deplete>")
      : { ok: true, command: { type: "audio.play", sound } };
  }
  if (name === "sound") {
    const enabled = onOff(args[0]);
    return enabled === null
      ? invalid("usage: sound <on|off>")
      : { ok: true, command: { type: "audio.enabled.set", enabled } };
  }
  if (name === "spend") {
    const amount = int(args[0]);
    const mode = args[1] ?? "drain";
    return amount === null || amount <= 0 || (mode !== "drain" && mode !== "burst")
      ? invalid("usage: spend <amount> [drain|burst]")
      : { ok: true, command: { type: "stamina.spend", amount, mode } };
  }
  if (name === "stamina") return parseStamina(args);
  if (name === "thirst") return parseThirst(args);
  if (name === "status") return parseStatus(args);
  if (name === "rpg") return parseRpg(args);
  if (name === "skill") return parseSkill(args);
  if (name === "cooldown") return parseCooldown(args);
  if (name === "collision") return parseCollision(args);
  if (name === "focused") {
    if (!args[0] || args[0] === "start") return { ok: true, command: { type: "focused.start" } };
    return invalid("usage: focused start");
  }

  return { ok: false, code: "unknown_command", message: `unknown command: ${name}` };
}

function parseStamina(args: string[]): CommandParseResult {
  if (!args[0]) return { ok: true, command: { type: "stamina.inspect" } };
  if (args[0] === "set") {
    const value = int(args[1]);
    return value === null ? invalid("usage: stamina set <n>") : { ok: true, command: { type: "stamina.set", value } };
  }
  if (args[0] === "max") {
    const value = int(args[1]);
    return value === null || value <= 0 ? invalid("usage: stamina max <n>") : { ok: true, command: { type: "stamina.max.set", value } };
  }
  if (args[0] === "regen") {
    const passivePerSec = int(args[1]);
    const combatPerSec = int(args[2]);
    return passivePerSec === null || combatPerSec === null
      ? invalid("usage: stamina regen <passive/s> <combat/s>")
      : { ok: true, command: { type: "stamina.regen.set", passivePerSec, combatPerSec } };
  }
  return invalid("usage: stamina [set <n> | max <n> | regen <p> <c>]");
}

function parseThirst(args: string[]): CommandParseResult {
  if (!args[0]) return { ok: true, command: { type: "thirst.inspect" } };
  if (args[0] === "set") {
    const value = int(args[1]);
    return value === null ? invalid("usage: thirst set <n>") : { ok: true, command: { type: "thirst.set", value } };
  }
  if (args[0] === "max") {
    const value = int(args[1]);
    return value === null || value <= 0 ? invalid("usage: thirst max <n>") : { ok: true, command: { type: "thirst.max.set", value } };
  }
  if (args[0] === "rate") {
    const baseDrainPerSec = finite(args[1]);
    return baseDrainPerSec === null || baseDrainPerSec < 0
      ? invalid("usage: thirst rate <base drain/s>")
      : { ok: true, command: { type: "thirst.rate.set", baseDrainPerSec } };
  }
  return invalid("usage: thirst [set <n> | max <n> | rate <drain/s>]");
}

function parseStatus(args: string[]): CommandParseResult {
  if (!args[0] || args[0] === "list") return { ok: true, command: { type: "status.list" } };
  if (args[0] === "apply") {
    const statusId = args[1];
    const durationSec = int(args[2]) ?? 30;
    return !statusId || !isStatusId(statusId) || durationSec <= 0
      ? invalid("usage: status apply <id> [sec]")
      : { ok: true, command: { type: "status.apply", statusId, durationSec } };
  }
  if (args[0] === "clear") {
    const statusId = args[1];
    return !statusId || !isStatusId(statusId)
      ? invalid("usage: status clear <id>")
      : { ok: true, command: { type: "status.clear", statusId } };
  }
  if (args[0] === "clearall") return { ok: true, command: { type: "status.clearAll" } };
  return invalid("usage: status [list | apply <id> [sec] | clear <id> | clearall]");
}

function parseRpg(args: string[]): CommandParseResult {
  if (!args[0]) return { ok: true, command: { type: "rpg.inspect" } };
  if (args[0] === "equip") return !args[1] ? invalid("usage: rpg equip <itemId>") : { ok: true, command: { type: "rpg.equip", itemId: args[1] } };
  if (args[0] === "unequip") return { ok: true, command: { type: "rpg.equip", itemId: null } };
  if (args[0] === "give") {
    const qty = int(args[2]) ?? 1;
    return !args[1] || qty <= 0 ? invalid("usage: rpg give <itemId> [qty]") : { ok: true, command: { type: "rpg.give", itemId: args[1], qty } };
  }
  if (args[0] === "hp") {
    const hp = int(args[1]);
    return hp === null || hp < 0 ? invalid("usage: rpg hp <n>") : { ok: true, command: { type: "rpg.hp.set", hp } };
  }
  if (args[0] === "reset") return { ok: true, command: { type: "rpg.reset" } };
  return invalid("usage: rpg [equip <id> | unequip | give <id> [qty] | hp <n> | reset]");
}

function parseSkill(args: string[]): CommandParseResult {
  if (!args[0]) return { ok: true, command: { type: "skill.inspect" } };
  const skill = args[1] ? mapSkillCommandKey(args[1]) : null;
  if (args[0] === "addxp") {
    const qty = int(args[2]);
    return !skill || qty === null || qty <= 0
      ? invalid("usage: skill addxp <skill> <qty>")
      : { ok: true, command: { type: "skill.addXp", skill, qty } };
  }
  if (args[0] === "setlevel") {
    const level = int(args[2]);
    return !skill || level === null || level <= 0
      ? invalid("usage: skill setlevel <skill> <lvl>")
      : { ok: true, command: { type: "skill.level.set", skill, level } };
  }
  return invalid("usage: skill [addxp <skill> <qty> | setlevel <skill> <lvl>]");
}

function parseCooldown(args: string[]): CommandParseResult {
  if (!args[0]) return { ok: true, command: { type: "cooldown.inspect" } };
  if (args[0] === "zero") {
    const enabled = onOff(args[1]);
    return enabled === null ? invalid("usage: cooldown zero <on|off>") : { ok: true, command: { type: "cooldown.zero.set", enabled } };
  }
  if (args[0] === "reset") return { ok: true, command: { type: "cooldown.reset" } };
  return invalid("usage: cooldown [zero <on|off> | reset]");
}

function parseCollision(args: string[]): CommandParseResult {
  if (!args[0] || args[0] === "list") return { ok: true, command: { type: "collision.list" } };
  if (args[0] === "show") {
    const enabled = onOff(args[1]);
    return enabled === null
      ? invalid("usage: collision show <on|off>")
      : { ok: true, command: { type: "collision.show", enabled } };
  }
  if (args[0] === "get") {
    return !args[1] ? invalid("usage: collision get <id>") : { ok: true, command: { type: "collision.get", id: args[1] } };
  }
  if (args[0] === "set") {
    const minX = finite(args[2]);
    const maxX = finite(args[3]);
    const minY = finite(args[4]);
    const maxY = finite(args[5]);
    return !args[1] || minX === null || maxX === null || minY === null || maxY === null
      ? invalid("usage: collision set <id> <minX> <maxX> <minY> <maxY>")
      : { ok: true, command: { type: "collision.set", id: args[1], footprint: { minX, maxX, minY, maxY } } };
  }
  if (args[0] === "reset") {
    return !args[1] ? invalid("usage: collision reset <id>") : { ok: true, command: { type: "collision.reset", id: args[1] } };
  }
  return invalid("usage: collision [list | show <on|off> | get <id> | set <id> <minX> <maxX> <minY> <maxY> | reset <id>]");
}
