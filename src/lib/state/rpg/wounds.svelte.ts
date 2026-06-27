import {
  createWound,
  statusIdsForWound,
  tickWound,
  treatWound,
  type WoundSeverity,
  type WoundState,
  type TreatmentId,
} from "$lib/domain/injury/wounds";
import { StorageKeys } from "$lib/domain/game-events";
import { StatusId } from "$lib/domain/systems/status-types";
import { applyStatusEffect, clearStatusEffect } from "$lib/state/rpg/status-effects.svelte";
import { playerRpgEntityId, rpgEventQueue } from "$lib/state/rpg/rpg-feedback-router";
import { loadSlice, saveSlice } from "$lib/state/persistence/save-load";
import { setRpgInventory } from "$lib/state/rpg-actions.svelte";
import { removeStackQty } from "$lib/domain/systems/inventory-system";
import { gameState } from "$lib/state/game-state.svelte";
import { getItemQty } from "$lib/state/rpg/inventory-api";

export const woundState = $state<{ active: WoundState[] }>({ active: [] });
const WOUND_TICK_INTERVAL_SEC = 1;
let tickAccumulator = 0;

export function applyWound(input: {
  readonly severity: WoundSeverity;
  readonly contamination?: number;
  readonly toolQuality?: number;
  readonly source?: string;
  readonly maxHp?: number | undefined;
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
  const isTrivial = input.source === "hazard:gather";
  for (const status of statusIdsForWound(wound)) {
    let durationSec: number;
    let nonLethal: boolean;
    if (isTrivial) {
      const maxHp = input.maxHp ?? 100;
      const cap15pct = maxHp * 0.15;
      if (status === StatusId.Bleeding) {
        // -2 HP per 5s; cap pulses so total ≤ 15% max HP
        durationSec = Math.max(5, Math.floor(cap15pct / 2) * 5);
      } else {
        // Cut: -1 HP per 5s
        durationSec = Math.max(5, Math.floor(cap15pct / 1) * 5);
      }
      nonLethal = true;
    } else {
      durationSec = status === StatusId.Bleeding ? 180 : 600;
      nonLethal = false;
    }
    applyStatusEffect(status, durationSec, input.source ?? "wound", nonLethal);
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

export function clearAllWounds(): void {
  woundState.active = [];
  saveWounds();
}

export function treatActiveWound(
  woundId: string,
  treatment: TreatmentId,
  itemCostId: string,
): { readonly success: boolean; readonly feedback: string } {
  // 1. Verify item is in inventory
  const qty = getItemQty(itemCostId);
  if (qty <= 0) {
    return { success: false, feedback: "You do not have the required item in your inventory." };
  }

  // 2. Find the wound
  const index = woundState.active.findIndex((w) => w.id === woundId);
  if (index === -1) {
    return { success: false, feedback: "Wound not found." };
  }

  const wound = woundState.active[index]!;

  // 3. Apply treatment
  const result = treatWound(wound, treatment, { itemId: itemCostId });
  if (result.wound === wound) {
    return { success: false, feedback: result.feedback };
  }

  // 4. Update wound in state
  const updatedWounds = [...woundState.active];
  updatedWounds[index] = result.wound;
  woundState.active = updatedWounds;
  saveWounds();

  // 5. Deduct item from inventory
  if (gameState.rpg.inventory) {
    setRpgInventory(removeStackQty(gameState.rpg.inventory, itemCostId, 1));
  }

  // 6. Check if we need to clear Bleeding status effect
  const anyBleeding = woundState.active.some((w) => w.bleeding);
  if (!anyBleeding) {
    clearStatusEffect(StatusId.Bleeding);
  }

  // 7. Check if we need to clear Infected status effect
  const anyInfected = woundState.active.some((w) => w.infected);
  if (!anyInfected) {
    clearStatusEffect(StatusId.Infected);
  }

  return { success: true, feedback: result.feedback };
}
