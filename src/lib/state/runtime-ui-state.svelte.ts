import { StorageKeys } from "$lib/domain/game-events";

export interface UiPreferences {
  minimalHud: boolean;
  dynamicEnvironment: boolean;
  equipOnlyWithStash: boolean;
}

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
  evadeMax: 1,
  focusedGather: 0,
  focusedGatherMax: 12,
  fellSweep: 0,
  fellSweepMax: 8,
  fellSweepCharge: 0,
  drivingThrust: 0,
  drivingThrustMax: 3.5,
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
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(StorageKeys.uiPreferences);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object") {
        if (typeof parsed.minimalHud === "boolean") uiPreferences.minimalHud = parsed.minimalHud;
        if (typeof parsed.dynamicEnvironment === "boolean") {
          uiPreferences.dynamicEnvironment = parsed.dynamicEnvironment;
        }
        if (typeof parsed.equipOnlyWithStash === "boolean") {
          uiPreferences.equipOnlyWithStash = parsed.equipOnlyWithStash;
        }
      }
    }
  } catch (e) {
    console.error("failed to load ui preferences:", e);
  }
}

export function saveUiPreferences(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(StorageKeys.uiPreferences, JSON.stringify(uiPreferences));
  } catch (e) {
    console.error("failed to save ui preferences:", e);
  }
}
