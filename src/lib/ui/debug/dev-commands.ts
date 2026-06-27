/**
 * Game-specific dev-console command registration. Command parsing lives in the
 * domain contract; execution goes through `GameEngine.execute()`. This file is
 * deliberately boring glue.
 */

import type { GameEngine } from "$lib/core/engine";
import { commandResultToConsoleText } from "$lib/core/command-runtime/command-runtime";
import { parseDevCommand } from "$lib/domain/game-command";
import { StatusId } from "$lib/domain/systems/status-types";
import { devConsole } from "$lib/ui/debug/dev-console";
import { devFlags } from "$lib/state/dev-flags.svelte";
import { focusedGatherDebugState } from "$lib/state/runtime-ui-state.svelte";

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
  { name: "focused", help: "focused [start|debug] : start focused gathering or print last pattern telemetry" },
  { name: "enablefreebuilding", help: "enablefreebuilding <true|false> : place buildings without material costs" },
  { name: "time", help: "time [set <fraction> | speed <mult> | check] : manage and inspect game time" },
  { name: "weather", help: "weather [rain <on|off> | check] : manage and inspect active weather" },
];

import { TIME_WEATHER_CONFIG } from "$lib/domain/weather/time-config";
import { isNight } from "$lib/domain/weather/weather-events";
import { sampleEnvironmentAt } from "$lib/core/systems/environment/environment-signal-system";
import { world } from "$lib/core/ecs/ecs-miniplex";
import { findPlayerEntity } from "$lib/core/ecs/entity-queries";
import { TILE } from "$lib/core/systems/map/map";

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

  devConsole.register({
    name: "focused",
    help: "focused [start|debug] : start focused gathering or print last pattern telemetry",
    run: async (args) => {
      const sub = args[0]?.toLowerCase();
      if (sub === "debug") {
        const debug = focusedGatherDebugState.last;
        if (!debug) return "no focused-gather telemetry yet";
        return [
          `focused gather: ${debug.resourceId}`,
          `  pattern: ${debug.patternId}`,
          `  targets: ${debug.targetCount}`,
          `  distance: ${debug.totalDistancePx.toFixed(1)}px`,
          `  time: ${debug.estimatedRequiredTimeMs.toFixed(0)}ms required / ${debug.availableTimeMs.toFixed(0)}ms available`,
          `  feasible: ${debug.feasible ? "yes" : "no"}`,
          `  difficulty: ${debug.difficultyScore.toFixed(2)}`,
        ].join("\n");
      }

      const parsed = parseDevCommand(["focused", ...args].join(" "));
      if (!parsed.ok) return parsed.message;
      const result = await engine.execute(parsed.command, "dev");
      return commandResultToConsoleText(result);
    },
  });

  devConsole.register({
    name: "enablefreebuilding",
    help: "enablefreebuilding <true|false> : place buildings without material costs",
    run: (args) => {
      const val = args[0]?.toLowerCase();
      if (val !== "true" && val !== "false") return "usage: enablefreebuilding <true|false>";
      const enabled = val === "true";
      devFlags.freeBuildingEnabled = enabled;
      return `free building ${enabled ? "enabled" : "disabled"}`;
    },
  });

  devConsole.register({
    name: "time",
    help: "time [set <fraction> | speed <mult> | check] : manage and inspect game time",
    run: (args) => {
      const sub = args[0]?.toLowerCase();
      if (sub === "set") {
        const val = parseFloat(args[1] || "");
        if (isNaN(val) || val < 0 || val > 1) return "usage: time set <fraction (0.0 - 1.0)>";
        engine.weatherResource.state.timeOfDay = val;
        return `time set to ${val.toFixed(2)}`;
      } else if (sub === "speed") {
        const val = parseFloat(args[1] || "");
        if (isNaN(val) || val < 0) return "usage: time speed <multiplier (>= 0)>";
        TIME_WEATHER_CONFIG.timeSpeedMultiplier = val;
        return `time speed multiplier set to ${val}`;
      } else if (sub === "check") {
        const tod = engine.weatherResource.state.timeOfDay;
        const night = isNight(tod);
        return `time of day: ${tod.toFixed(3)} (${night ? "Night" : "Day"}). speed multiplier: ${TIME_WEATHER_CONFIG.timeSpeedMultiplier}`;
      }
      return "usage: time [set <fraction> | speed <mult> | check]";
    },
  });

  devConsole.register({
    name: "weather",
    help: "weather [rain <on|off> | check] : manage and inspect active weather",
    run: (args) => {
      const sub = args[0]?.toLowerCase();
      if (sub === "rain") {
        const val = args[1]?.toLowerCase();
        if (val === "on") {
          engine.weatherResource.state.raining = true;
          engine.weatherResource.state.rainRemainingSec = 180;
          return "rain triggered";
        } else if (val === "off") {
          engine.weatherResource.state.raining = false;
          engine.weatherResource.state.rainRemainingSec = 0;
          return "rain stopped";
        }
        return "usage: weather rain <on|off>";
      } else if (sub === "check") {
        const raining = engine.weatherResource.state.raining;
        const remaining = engine.weatherResource.state.rainRemainingSec;
        return `weather: ${raining ? `Raining (${remaining.toFixed(1)}s remaining)` : "Clear"}`;
      }
      return "usage: weather [rain <on|off> | check]";
    },
  });

  devConsole.register({
    name: "signals",
    help: "signals [<gx> <gy>] : print environment signals at player tile or given tile",
    run: (args) => {
      let gx: number;
      let gy: number;

      if (args.length >= 2) {
        gx = parseInt(args[0] ?? "", 10);
        gy = parseInt(args[1] ?? "", 10);
        if (isNaN(gx) || isNaN(gy)) return "usage: signals [<gx> <gy>]";
      } else {
        const player = findPlayerEntity();
        if (!player?.position) return "no player position";
        gx = Math.round(player.position.x / TILE);
        gy = Math.round(player.position.y / TILE);
      }

      const point = { x: gx * TILE + TILE / 2, y: gy * TILE + TILE / 2 };
      const s = sampleEnvironmentAt(world, engine.weatherResource, point);

      const lines: string[] = [
        `signals at (${gx}, ${gy}):`,
        `  heat     ${s.heat.toFixed(1)} c`,
        `  light    ${s.light.toFixed(2)}`,
        `  shelter  ${s.shelter.toFixed(2)}`,
        `  wetness  ${s.wetness.toFixed(2)}`,
      ];

      // Show contributing emitters sorted by distance
      const emitterEntities = world.with("emitter", "position").entities;
      const nearby = emitterEntities.flatMap((entity) => {
        const ex = entity.position!.x + TILE / 2;
        const ey = entity.position!.y + TILE / 2;
        const dist = Math.hypot(point.x - ex, point.y - ey);
        return (entity.emitter ?? [])
          .filter((em) => dist < em.radiusPx)
          .map((em) => ({ signal: em.signal, dist, id: entity.id }));
      });

      if (nearby.length > 0) {
        lines.push("  sources:");
        const sorted = nearby.sort((a, b) => a.dist - b.dist);
        for (const { signal, dist, id } of sorted.slice(0, 6)) {
          lines.push(`    ${signal} from ${id} at ${(dist / TILE).toFixed(1)}t`);
        }
      }

      return lines.join("\n");
    },
  });
}
