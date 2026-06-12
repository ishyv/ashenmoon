export interface PanelPosition {
  x: number;
  y: number;
}

export const panelPositions = $state<Record<string, PanelPosition>>({});

export function loadPanelPositions(): void {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem("ashenmoor_panel_positions");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object") {
        Object.assign(panelPositions, parsed);
      }
    }
  } catch (e) {
    console.error("failed to load panel positions:", e);
  }
}

export function savePanelPositions(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("ashenmoor_panel_positions", JSON.stringify(panelPositions));
  } catch (e) {
    console.error("failed to save panel positions:", e);
  }
}

export function updatePanelPosition(id: string, x: number, y: number): void {
  panelPositions[id] = { x, y };
  savePanelPositions();
}
