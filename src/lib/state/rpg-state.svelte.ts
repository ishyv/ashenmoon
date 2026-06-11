import type { RpgPlayerState } from "$lib/domain/rpg-types";
import { emitEnvironmentChanged, type EnvironmentState } from "$lib/domain/systems/environment-system";
import "$lib/domain/systems/item-reaction-system";
import { StorageKeys } from "$lib/domain/game-events";
import { gameState } from "$lib/state/game-state.svelte";

/**
 * Compatibility proxy for the old rpgState.
 * Redirects all reads/writes to the unified gameState.rpg root.
 */
export const rpgState = {
  get profile() { return gameState.rpg.profile; },
  set profile(v) { gameState.rpg.profile = v; },
  get inventory() { return gameState.rpg.inventory; },
  set inventory(v) { gameState.rpg.inventory = v; },
  get skills() { return gameState.rpg.skills; },
  set skills(v) { gameState.rpg.skills = v; }
};

type WeaponSlot = RpgPlayerState["profile"]["loadout"]["weapon"];

/**
 * Fresh baseline skills (all level 1). A factory, not a shared constant, so two
 * profiles never alias the same skill sub-objects.
 */
export function createDefaultSkills(): RpgPlayerState["skills"] {
  return {
    lumberjacking: { level: 1, xp: 0, nextXp: 100 },
    mining: { level: 1, xp: 0, nextXp: 100 },
    evade: { level: 1, xp: 0, nextXp: 100 },
    superGather: { level: 1, xp: 0, nextXp: 100 },
  };
}

/** Minimal profile stub used by dev helpers before a real profile loads. */
export function createDefaultProfile(opts?: {
  hpCurrent?: number;
  weapon?: WeaponSlot;
}): RpgPlayerState["profile"] {
  return {
    hpCurrent: opts?.hpCurrent ?? 100,
    stashSize: 20,
    loadout: {
      weapon: opts?.weapon ?? null,
      shield: null,
      helmet: null,
      chest: null,
      pants: null,
      boots: null,
      ring: null,
      necklace: null,
    },
  };
}

export const activeEnvironment = $state<EnvironmentState>({
  temperature: 20,
  humidity: 40,
  toxins: 0,
});

export function setEnvironment(next: Partial<EnvironmentState>): void {
  const previous: EnvironmentState = {
    temperature: activeEnvironment.temperature,
    humidity: activeEnvironment.humidity,
    toxins: activeEnvironment.toxins,
  };

  if (typeof next.temperature === "number") {
    activeEnvironment.temperature = next.temperature;
  }

  if (typeof next.humidity === "number") {
    activeEnvironment.humidity = next.humidity;
  }

  if (typeof next.toxins === "number") {
    activeEnvironment.toxins = next.toxins;
  }

  const current: EnvironmentState = {
    temperature: activeEnvironment.temperature,
    humidity: activeEnvironment.humidity,
    toxins: activeEnvironment.toxins,
  };

  if (
    previous.temperature !== current.temperature ||
    previous.humidity !== current.humidity ||
    previous.toxins !== current.toxins
  ) {
    emitEnvironmentChanged({ previous, current });
  }
}

export function setRpgState(state: RpgPlayerState | null): void {
  if (!state) return;
  gameState.rpg.profile = state.profile;
  gameState.rpg.inventory = state.inventory;
  gameState.rpg.skills = state.skills ?? createDefaultSkills();
}

export interface UiPreferences {
  minimalHud: boolean;
  dynamicEnvironment: boolean;
  equipOnlyWithStash: boolean;
}

export const cooldownsState = $state<{ evade: number; evadeMax: number; superGather: number; superGatherMax: number }>({
  evade: 0,
  evadeMax: 1,
  superGather: 0,
  superGatherMax: 2,
});

export const debugConfig = $state<{ zeroCooldowns: boolean }>({
  zeroCooldowns: false,
});

export const uiPreferences = $state<UiPreferences>({
  minimalHud: true,
  dynamicEnvironment: true,
  equipOnlyWithStash: true,
});

export function loadUiPreferences(): void {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(StorageKeys.uiPreferences);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object") {
        if (typeof parsed.minimalHud === "boolean") uiPreferences.minimalHud = parsed.minimalHud;
        if (typeof parsed.dynamicEnvironment === "boolean")
          uiPreferences.dynamicEnvironment = parsed.dynamicEnvironment;
        if (typeof parsed.equipOnlyWithStash === "boolean")
          uiPreferences.equipOnlyWithStash = parsed.equipOnlyWithStash;
      }
    }
  } catch (e) {
    console.error("Failed to load UI preferences:", e);
  }
}

export function saveUiPreferences(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(StorageKeys.uiPreferences, JSON.stringify(uiPreferences));
  } catch (e) {
    console.error("Failed to save UI preferences:", e);
  }
}

// ---------------------------------------------------------------------------
// Dev helpers — manipulate local gameState without hitting the server
// ---------------------------------------------------------------------------

/** Force-equip a weapon by item ID. Creates a minimal profile stub if none loaded yet. */
export function devEquip(itemId: string | null): void {
  const weapon = itemId
    ? { instanceId: `dev_${Date.now()}`, itemId, durability: 100 }
    : null;
  if (!gameState.rpg.skills) {
    gameState.rpg.skills = createDefaultSkills();
  }
  if (gameState.rpg.profile) {
    gameState.rpg.profile = {
      ...gameState.rpg.profile,
      loadout: { ...gameState.rpg.profile.loadout, weapon },
    };
  } else {
    gameState.rpg.profile = createDefaultProfile({ weapon });
  }
}

/** Add items directly to the local inventory (stackable items only; tools use qty=1 per instance). */
export function devGiveItem(itemId: string, qty: number): void {
  const existing = gameState.rpg.inventory?.slots[itemId];
  const current = existing && "qty" in existing ? existing.qty : 0;
  gameState.rpg.inventory = {
    slots: {
      ...(gameState.rpg.inventory?.slots ?? {}),
      [itemId]: { qty: current + qty },
    },
  };
}

/** Deduct items directly from the local inventory (stackable items). Returns true if successful. */
export function devDeductItem(itemId: string, qty: number): boolean {
  if (!gameState.rpg.inventory) return false;
  const existing = gameState.rpg.inventory.slots[itemId];
  if (!existing || !("qty" in existing)) return false;
  if (existing.qty < qty) return false;

  const newQty = existing.qty - qty;
  const newSlots = { ...gameState.rpg.inventory.slots };
  if (newQty <= 0) {
    delete newSlots[itemId];
  } else {
    newSlots[itemId] = { qty: newQty };
  }
  gameState.rpg.inventory = { slots: newSlots };
  return true;
}

/** Set HP directly on the local profile stub (creates profile if absent). */
export function devSetHp(hp: number): void {
  if (!gameState.rpg.skills) {
    gameState.rpg.skills = createDefaultSkills();
  }
  if (gameState.rpg.profile) {
    gameState.rpg.profile = { ...gameState.rpg.profile, hpCurrent: hp };
  } else {
    gameState.rpg.profile = createDefaultProfile({ hpCurrent: hp });
  }
}




