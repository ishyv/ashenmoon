import type { RpgPlayerState } from "./rpg-types";
import { emitEnvironmentChanged, type EnvironmentState } from "$lib/rpg/systems/environment-system";
import "$lib/rpg/systems/item-reaction-system";
import { StorageKeys } from "./game-events";
export { ITEM_METADATA } from "$lib/rpg/items/item-definitions";
export type { LegacyItemMetadata as ItemMetadata } from "$lib/rpg/items/item-types";

export interface RpgState {
  profile: RpgPlayerState["profile"] | null;
  inventory: RpgPlayerState["inventory"] | null;
  skills: RpgPlayerState["skills"] | null;
}

export const rpgState = $state<RpgState>({
  profile: null,
  inventory: null,
  skills: null,
});

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
  rpgState.profile = state.profile;
  rpgState.inventory = state.inventory;
  rpgState.skills = state.skills ?? createDefaultSkills();
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
// Dev helpers — manipulate local rpgState without hitting the server
// ---------------------------------------------------------------------------

/** Force-equip a weapon by item ID. Creates a minimal profile stub if none loaded yet. */
export function devEquip(itemId: string | null): void {
  const weapon = itemId
    ? { instanceId: `dev_${Date.now()}`, itemId, durability: 100 }
    : null;
  if (!rpgState.skills) {
    rpgState.skills = createDefaultSkills();
  }
  if (rpgState.profile) {
    rpgState.profile = {
      ...rpgState.profile,
      loadout: { ...rpgState.profile.loadout, weapon },
    };
  } else {
    rpgState.profile = createDefaultProfile({ weapon });
  }
}

/** Add items directly to the local inventory (stackable items only; tools use qty=1 per instance). */
export function devGiveItem(itemId: string, qty: number): void {
  const existing = rpgState.inventory?.slots[itemId];
  const current = existing && "qty" in existing ? existing.qty : 0;
  rpgState.inventory = {
    slots: {
      ...(rpgState.inventory?.slots ?? {}),
      [itemId]: { qty: current + qty },
    },
  };
}

/** Deduct items directly from the local inventory (stackable items). Returns true if successful. */
export function devDeductItem(itemId: string, qty: number): boolean {
  if (!rpgState.inventory) return false;
  const existing = rpgState.inventory.slots[itemId];
  if (!existing || !("qty" in existing)) return false;
  if (existing.qty < qty) return false;

  const newQty = existing.qty - qty;
  const newSlots = { ...rpgState.inventory.slots };
  if (newQty <= 0) {
    delete newSlots[itemId];
  } else {
    newSlots[itemId] = { qty: newQty };
  }
  rpgState.inventory = { slots: newSlots };
  return true;
}

/** Set HP directly on the local profile stub (creates profile if absent). */
export function devSetHp(hp: number): void {
  if (!rpgState.skills) {
    rpgState.skills = createDefaultSkills();
  }
  if (rpgState.profile) {
    rpgState.profile = { ...rpgState.profile, hpCurrent: hp };
  } else {
    rpgState.profile = createDefaultProfile({ hpCurrent: hp });
  }
}



