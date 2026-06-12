import type {
  CommandFeedback,
  CommandSource,
  GameCommand,
  GameCommandResult,
  GameEffect,
  GameEvent,
  SkillCommandKey,
} from "$lib/domain/game-command";
import type { CollisionFootprint } from "$lib/domain/collision";
import type { StatusId } from "$lib/domain/systems/status-types";

export interface CommandContext {
  source: CommandSource;
  position(): { gx: number; gy: number };
  teleport(gx: number, gy: number): string;
  spawnPrefab(prefabId: string, gx: number, gy: number): string;
  setSpeed(tilesPerSec: number): string;
  toggleNoclip(): string;
  triggerInteract(): string;
  setGatherSpeed(seconds: number): string;
  setShakeScale(multiplier: number): string;
  setParticleCount(count: number): string;
  playSound(sound: "chop" | "clink" | "fall" | "deplete"): string;
  setSoundEnabled(enabled: boolean): string;
  stamina: {
    inspect(): string;
    set(value: number): string;
    setMax(value: number): string;
    setRegen(passivePerSec: number, combatPerSec: number): string;
    spend(amount: number, mode: "drain" | "burst"): string;
  };
  thirst: {
    inspect(): string;
    set(value: number): string;
    setMax(value: number): string;
    setRate(baseDrainPerSec: number): string;
  };
  status: {
    list(): string;
    apply(statusId: StatusId, durationSec: number): string;
    clear(statusId: StatusId): string;
    clearAll(): string;
  };
  rpg: {
    inspect(): string;
    equip(itemId: string | null): string;
    give(itemId: string, qty: number): string;
    setHp(hp: number): string;
    reset(): string;
  };
  skill: {
    inspect(): string;
    addXp(skill: SkillCommandKey, qty: number): string;
    setLevel(skill: SkillCommandKey, level: number): string;
  };
  cooldown: {
    inspect(): string;
    setZero(enabled: boolean): string;
    reset(): string;
  };
  collision: {
    list(): string;
    show(enabled: boolean): string;
    get(id: string): string;
    set(id: string, footprint: CollisionFootprint): string;
    reset(id: string): string;
  };
  focused: {
    start(): string;
  };
}

function feedback(message: string, tone: CommandFeedback["tone"] = "success"): CommandFeedback {
  return { tone, message };
}

function ok(
  source: CommandSource,
  command: GameCommand,
  message: string,
  events: GameEvent[] = [],
  effects: GameEffect[] = [],
): GameCommandResult {
  return {
    ok: true,
    events: [{ type: "command.executed", command: command.type, source }, ...events],
    effects,
    feedback: [feedback(message)],
  };
}

function fail(source: CommandSource, command: GameCommand, code: string, message: string): GameCommandResult {
  return {
    ok: false,
    events: [{ type: "command.executed", command: command.type, source }],
    effects: [],
    feedback: [feedback(message, "error")],
    error: { code, message },
  };
}

export async function executeGameCommand(
  context: CommandContext,
  command: GameCommand,
): Promise<GameCommandResult> {
  try {
    switch (command.type) {
      case "world.position": {
        const pos = context.position();
        return ok(context.source, command, `player at ${pos.gx},${pos.gy}`, [], [
          { kind: "runtime", channel: "world", description: "read player position" },
        ]);
      }
      case "world.teleport": {
        const message = context.teleport(command.gx, command.gy);
        return ok(context.source, command, message, [{ type: "world.teleported", gx: command.gx, gy: command.gy }], [
          { kind: "runtime", channel: "world", description: message },
        ]);
      }
      case "world.spawn": {
        const message = context.spawnPrefab(command.prefabId, command.gx, command.gy);
        return ok(context.source, command, message, [{ type: "world.spawned", prefabId: command.prefabId, gx: command.gx, gy: command.gy }], [
          { kind: "runtime", channel: "world", description: message },
        ]);
      }
      case "player.speed.set":
        return ok(context.source, command, context.setSpeed(command.tilesPerSec), [], [
          { kind: "runtime", channel: "debug", description: "set player speed" },
        ]);
      case "player.noclip.toggle":
        return ok(context.source, command, context.toggleNoclip(), [], [
          { kind: "runtime", channel: "debug", description: "toggle noclip" },
        ]);
      case "interaction.trigger":
        return ok(context.source, command, context.triggerInteract(), [{ type: "interaction.triggered" }], [
          { kind: "runtime", channel: "interaction", description: "queued interaction" },
        ]);
      case "debug.gatherSpeed.set":
        return ok(context.source, command, context.setGatherSpeed(command.seconds));
      case "debug.shakeScale.set":
        return ok(context.source, command, context.setShakeScale(command.multiplier));
      case "debug.particleCount.set":
        return ok(context.source, command, context.setParticleCount(command.count));
      case "audio.play":
        return ok(context.source, command, context.playSound(command.sound), [], [
          { kind: "runtime", channel: "audio", description: `play ${command.sound}` },
        ]);
      case "audio.enabled.set":
        return ok(context.source, command, context.setSoundEnabled(command.enabled), [], [
          { kind: "runtime", channel: "audio", description: `sound ${command.enabled ? "on" : "off"}` },
        ]);
      case "stamina.inspect":
        return ok(context.source, command, context.stamina.inspect(), [], [
          { kind: "runtime", channel: "debug", description: "inspect stamina" },
        ]);
      case "stamina.set":
        return ok(context.source, command, context.stamina.set(command.value), [{ type: "vitals.changed", vital: "stamina", value: command.value }], [
          { kind: "vitals", vital: "stamina", value: command.value },
        ]);
      case "stamina.max.set":
        return ok(context.source, command, context.stamina.setMax(command.value));
      case "stamina.regen.set":
        return ok(context.source, command, context.stamina.setRegen(command.passivePerSec, command.combatPerSec));
      case "stamina.spend":
        return ok(context.source, command, context.stamina.spend(command.amount, command.mode));
      case "thirst.inspect":
        return ok(context.source, command, context.thirst.inspect());
      case "thirst.set":
        return ok(context.source, command, context.thirst.set(command.value), [{ type: "vitals.changed", vital: "thirst", value: command.value }], [
          { kind: "vitals", vital: "thirst", value: command.value },
        ]);
      case "thirst.max.set":
        return ok(context.source, command, context.thirst.setMax(command.value));
      case "thirst.rate.set":
        return ok(context.source, command, context.thirst.setRate(command.baseDrainPerSec));
      case "status.list":
        return ok(context.source, command, context.status.list());
      case "status.apply":
        return ok(context.source, command, context.status.apply(command.statusId, command.durationSec), [
          { type: "status.applied", statusId: command.statusId, durationSec: command.durationSec },
        ], [
          { kind: "status", operation: "apply", statusId: command.statusId, durationSec: command.durationSec },
        ]);
      case "status.clear":
        return ok(context.source, command, context.status.clear(command.statusId), [{ type: "status.cleared", statusId: command.statusId }], [
          { kind: "status", operation: "clear", statusId: command.statusId },
        ]);
      case "status.clearAll":
        return ok(context.source, command, context.status.clearAll(), [{ type: "status.cleared" }], [
          { kind: "status", operation: "clearAll" },
        ]);
      case "rpg.inspect":
        return ok(context.source, command, context.rpg.inspect());
      case "rpg.equip":
        return ok(context.source, command, context.rpg.equip(command.itemId), [{ type: "equipment.changed", itemId: command.itemId }], [
          { kind: "equipment", itemId: command.itemId },
        ]);
      case "rpg.give":
        return ok(context.source, command, context.rpg.give(command.itemId, command.qty), [
          { type: "inventory.changed", itemId: command.itemId, qtyDelta: command.qty },
        ], [
          { kind: "inventory", itemId: command.itemId, qtyDelta: command.qty },
        ]);
      case "rpg.hp.set":
        return ok(context.source, command, context.rpg.setHp(command.hp), [{ type: "vitals.changed", vital: "hp", value: command.hp }], [
          { kind: "vitals", vital: "hp", value: command.hp },
        ]);
      case "rpg.reset":
        return ok(context.source, command, context.rpg.reset(), [], [{ kind: "state", description: "reset local rpg state" }]);
      case "skill.inspect":
        return ok(context.source, command, context.skill.inspect());
      case "skill.addXp":
        return ok(context.source, command, context.skill.addXp(command.skill, command.qty), [{ type: "skill.changed", skill: command.skill }], [
          { kind: "skill", skill: command.skill, operation: "addXp", value: command.qty },
        ]);
      case "skill.level.set":
        return ok(context.source, command, context.skill.setLevel(command.skill, command.level), [{ type: "skill.changed", skill: command.skill }], [
          { kind: "skill", skill: command.skill, operation: "setLevel", value: command.level },
        ]);
      case "cooldown.inspect":
        return ok(context.source, command, context.cooldown.inspect());
      case "cooldown.zero.set":
        return ok(context.source, command, context.cooldown.setZero(command.enabled));
      case "cooldown.reset":
        return ok(context.source, command, context.cooldown.reset());
      case "collision.list":
        return ok(context.source, command, context.collision.list());
      case "collision.show":
        return ok(context.source, command, context.collision.show(command.enabled));
      case "collision.get":
        return ok(context.source, command, context.collision.get(command.id));
      case "collision.set":
        return ok(context.source, command, context.collision.set(command.id, command.footprint));
      case "collision.reset":
        return ok(context.source, command, context.collision.reset(command.id));
      case "focused.start":
        return ok(context.source, command, context.focused.start());
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return fail(context.source, command, "command_failed", message);
  }
}

export function commandResultToConsoleText(result: GameCommandResult): string {
  if (!result.ok) return result.error.message;
  return result.feedback.map((entry) => entry.message).join("\n");
}
