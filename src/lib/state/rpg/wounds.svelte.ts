import {
  createWound,
  statusIdsForWound,
  tickWound,
  type WoundSeverity,
  type WoundState,
} from "$lib/domain/injury/wounds";
import { StorageKeys } from "$lib/domain/game-events";
import { StatusId } from "$lib/domain/systems/status-types";
import { applyStatusEffect } from "$lib/state/rpg/status-effects.svelte";
import { playerRpgEntityId, rpgEventQueue } from "$lib/state/rpg/rpg-feedback-router";
import { loadSlice, saveSlice } from "$lib/state/persistence/save-load";

export const woundState = $state<{ active: WoundState[] }>({ active: [] });
const WOUND_TICK_INTERVAL_SEC = 1;
let tickAccumulator = 0;

export function applyWound(input: {
  readonly severity: WoundSeverity;
  readonly contamination?: number;
  readonly toolQuality?: number;
  readonly source?: string;
}): WoundState {
  const woundInput: Parameters<typeof createWound>[0] = {
    id: `wound_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    severity: input.severity,
    ...(input.contamination !== undefined ? { contamination: input.contamination } : {}),
    ...(input.toolQuality !== undefined ? { toolQuality: input.toolQuality } : {}),
  };

  const wound = createWound(woundInput);
  woundState.active = [...woundState.active, wound];
  rpgEventQueue.push({
    type: "wound_added",
    entityId: playerRpgEntityId(),
    woundId: wound.id,
    severity: wound.severity,
    ...(input.source !== undefined ? { source: input.source } : {}),
  });
  for (const status of statusIdsForWound(wound)) {
    applyStatusEffect(status, status === StatusId.Bleeding ? 180 : 600, input.source ?? "wound");
  }
  saveWounds();
  return wound;
}

export function tickWounds(dtSec: number): void {
  tickAccumulator += dtSec;
  if (woundState.active.length === 0) {
    tickAccumulator = 0;
    return;
  }
  if (tickAccumulator < WOUND_TICK_INTERVAL_SEC) return;
  const slice = tickAccumulator;
  tickAccumulator = 0;

  const previous = woundState.active;
  const next = previous.map((wound) => tickWound(wound, slice));
  woundState.active = next;

  for (const wound of next) {
    const before = previous.find((candidate) => candidate.id === wound.id);
    if (wound.infected && before && !before.infected) {
      applyStatusEffect(StatusId.Infected, 900, "wound");
      rpgEventQueue.push({
        type: "wound_progressed",
        entityId: playerRpgEntityId(),
        woundId: wound.id,
        progression: "infected",
      });
    }
  }

  saveWounds();
}

export function loadWounds(): void {
  const stored = loadSlice<unknown[]>(StorageKeys.wounds, []);
  if (!Array.isArray(stored)) return;
  woundState.active = stored.filter((wound): wound is WoundState => {
    if (!wound || typeof wound !== "object") return false;
    const rec = wound as Record<string, unknown>;
    return (
      typeof rec.id === "string" &&
      typeof rec.severity === "string" &&
      ["scratch", "cut", "deep_cut", "bite_wound"].includes(rec.severity) &&
      typeof rec.ageSec === "number" &&
      typeof rec.infectionRisk === "number" &&
      typeof rec.bleeding === "boolean" &&
      typeof rec.infected === "boolean" &&
      Array.isArray(rec.treatedWith)
    );
  });
}

function saveWounds(): void {
  saveSlice(StorageKeys.wounds, woundState.active);
}
