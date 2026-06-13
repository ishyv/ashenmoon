import { StorageKeys } from "$lib/domain/game-events";
import { loadSlice, saveSlice } from "$lib/state/persistence/save-load";

export interface UiPreferences {
  minimalHud: boolean;
  dynamicEnvironment: boolean;
  equipOnlyWithStash: boolean;
}

const DEFAULT_COOLDOWNS = {
  evade: 1,
  focusedGather: 12,
  fellSweep: 8,
  drivingThrust: 3.5,
} as const;

export const cooldownsState = $state<{
  evade: number;
  evadeMax: number;
  focusedGather: number;
  focusedGatherMax: number;
  fellSweep: number;
  fellSweepMax: number;
  fellSweepCharge: number;
  drivingThrust: number;
  drivingThrustMax: number;
}>({
  evade: 0,
  evadeMax: DEFAULT_COOLDOWNS.evade,
  focusedGather: 0,
  focusedGatherMax: DEFAULT_COOLDOWNS.focusedGather,
  fellSweep: 0,
  fellSweepMax: DEFAULT_COOLDOWNS.fellSweep,
  fellSweepCharge: 0,
  drivingThrust: 0,
  drivingThrustMax: DEFAULT_COOLDOWNS.drivingThrust,
});

export const debugConfig = $state<{ zeroCooldowns: boolean; showCollision: boolean }>({
  zeroCooldowns: false,
  showCollision: false,
});

export const uiPreferences = $state<UiPreferences>({
  minimalHud: true,
  dynamicEnvironment: true,
  equipOnlyWithStash: true,
});

export function loadUiPreferences(): void {
  const stored = loadSlice<Partial<UiPreferences>>(StorageKeys.uiPreferences, {});
  if (typeof stored.minimalHud === "boolean") uiPreferences.minimalHud = stored.minimalHud;
  if (typeof stored.dynamicEnvironment === "boolean") {
    uiPreferences.dynamicEnvironment = stored.dynamicEnvironment;
  }
  if (typeof stored.equipOnlyWithStash === "boolean") {
    uiPreferences.equipOnlyWithStash = stored.equipOnlyWithStash;
  }
}

export function saveUiPreferences(): void {
  saveSlice(StorageKeys.uiPreferences, $state.snapshot(uiPreferences));
}
