/**
 * Game-specific dev-console command registration. Command parsing lives in the
 * domain contract; execution goes through `GameEngine.execute()`. This file is
 * deliberately boring glue.
 */

import type { GameEngine } from "$lib/core/engine";
import { commandResultToConsoleText } from "$lib/core/command-runtime";
import { parseDevCommand } from "$lib/domain/game-command";
import { StatusId } from "$lib/domain/systems/status-types";
import { devConsole } from "$lib/ui/debug/dev-console";

interface DevCommandHelp {
  name: string;
  help: string;
}

const statusIds = Object.values(StatusId).join("|");

const COMMANDS: readonly DevCommandHelp[] = [
  { name: "pos", help: "pos : print player grid position" },
  { name: "tp", help: "tp <gx> <gy> : teleport player" },
  { name: "speed", help: "speed <tiles/s> : set move speed" },
  { name: "spawn", help: "spawn <prefabId> <gx> <gy> : spawn a prefab" },
  { name: "noclip", help: "noclip : toggle walk-through-walls" },
  { name: "interact", help: "interact : queue the same action as the interact key" },
  { name: "gatherspeed", help: "gatherspeed <seconds> : set continuous gather swing rate" },
  { name: "shakescale", help: "shakescale <multiplier> : scale resource shake intensity" },
  { name: "particlecount", help: "particlecount <count> : set particles generated on hit" },
  { name: "playsound", help: "playsound <chop|clink|fall|deplete> : trigger procedural audio" },
  { name: "sound", help: "sound <on|off> : toggle procedural audio synthesis" },
  { name: "stamina", help: "stamina [set <n> | max <n> | regen <p> <c>] : inspect / tune stamina" },
  { name: "spend", help: "spend <amount> [drain|burst] : spend stamina" },
  { name: "thirst", help: "thirst [set <n> | max <n> | rate <drain/s>] : inspect / tune thirst" },
  { name: "status", help: `status [list | apply <${statusIds}> [sec] | clear <id> | clearall] : manage status effects` },
  { name: "rpg", help: "rpg [equip <id> | unequip | give <id> [qty] | hp <n> | reset] : patch local rpg state" },
  { name: "skill", help: "skill [addxp <skill> <qty> | setlevel <skill> <lvl>] : manage skill progression" },
  { name: "cooldown", help: "cooldown [zero <on|off> | reset] : manage skill cooldown timers" },
  { name: "collision", help: "collision [list | show <on|off> | get <id> | set <id> <minX> <maxX> <minY> <maxY> | reset <id>] : tune collision footprints" },
  { name: "focused", help: "focused [start] : begin a focused-gathering session on the hovered node" },
];

export function registerDevCommands(engine: GameEngine): void {
  for (const command of COMMANDS) {
    devConsole.register({
      ...command,
      run: async (args) => {
        const parsed = parseDevCommand([command.name, ...args].join(" "));
        if (!parsed.ok) return parsed.message;
        const result = await engine.execute(parsed.command, "dev");
        return commandResultToConsoleText(result);
      },
    });
  }
}
