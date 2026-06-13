import type { RpgPlayerState } from "$lib/domain/rpg-types";
import { createDefaultProfile, createDefaultSkills } from "$lib/domain/rpg-defaults";
import { gameState } from "$lib/state/game-state.svelte";

export function applyRpgState(state: RpgPlayerState | null): void {
  if (!state) return;
  gameState.rpg.profile = state.profile;
  gameState.rpg.inventory = state.inventory;
  gameState.rpg.skills = state.skills ?? createDefaultSkills();
}

export function setRpgInventory(inventory: RpgPlayerState["inventory"] | null): void {
  gameState.rpg.inventory = inventory;
}

export function setRpgProfile(profile: RpgPlayerState["profile"] | null): void {
  gameState.rpg.profile = profile;
}

export function setRpgSkills(skills: RpgPlayerState["skills"] | null): void {
  gameState.rpg.skills = skills;
}

export function addLocalInventoryQty(itemId: string, qty: number): void {
  if (qty <= 0) return;
  const existing = gameState.rpg.inventory?.slots[itemId];
  const current = existing && "qty" in existing ? existing.qty : 0;
  gameState.rpg.inventory = {
    slots: {
      ...(gameState.rpg.inventory?.slots ?? {}),
      [itemId]: { qty: current + qty },
    },
  };
}

export function removeLocalInventoryQty(itemId: string, qty: number): boolean {
  if (qty <= 0 || !gameState.rpg.inventory) return false;
  const existing = gameState.rpg.inventory.slots[itemId];
  if (!existing || !("qty" in existing) || existing.qty < qty) return false;

  const nextQty = existing.qty - qty;
  const slots = { ...gameState.rpg.inventory.slots };
  if (nextQty <= 0) delete slots[itemId];
  else slots[itemId] = { qty: nextQty };
  gameState.rpg.inventory = { slots };
  return true;
}

const DEFAULT_DURABILITY = 100;
const DEV_INSTANCE_PREFIX = "dev_";

export function equipLocalWeapon(itemId: string | null): void {
  const weapon = itemId
    ? { instanceId: `${DEV_INSTANCE_PREFIX}${Date.now()}`, itemId, durability: DEFAULT_DURABILITY }
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

export function setLocalHp(hp: number): void {
  if (!gameState.rpg.skills) {
    gameState.rpg.skills = createDefaultSkills();
  }
  if (gameState.rpg.profile) {
    gameState.rpg.profile = { ...gameState.rpg.profile, hpCurrent: hp };
  } else {
    gameState.rpg.profile = createDefaultProfile({ hpCurrent: hp });
  }
}
