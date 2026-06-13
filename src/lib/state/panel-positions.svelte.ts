import { StorageKeys } from "$lib/domain/game-events";
import { loadSlice, saveSlice } from "$lib/state/persistence/save-load";

export interface PanelPosition {
  x: number;
  y: number;
}

export const panelPositions = $state<Record<string, PanelPosition>>({});

export function loadPanelPositions(): void {
  const stored = loadSlice<Record<string, PanelPosition>>(StorageKeys.panelPositions, {});
  Object.assign(panelPositions, stored);
}

export function savePanelPositions(): void {
  saveSlice(StorageKeys.panelPositions, $state.snapshot(panelPositions));
}

export function updatePanelPosition(id: string, x: number, y: number): void {
  panelPositions[id] = { x, y };
  savePanelPositions();
}
