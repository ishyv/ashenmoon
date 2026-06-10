import type { Application, Container } from "pixi.js";
import { devConsole } from "./dev-console";
import { InputAction, StorageKeys } from "./game-events";

export class InputResource {
  public keys: Record<string, boolean> = {};
  public bindings: Record<string, string[]> = {
    [InputAction.MoveUp]: ["w", "arrowup"],
    [InputAction.MoveDown]: ["s", "arrowdown"],
    [InputAction.MoveLeft]: ["a", "arrowleft"],
    [InputAction.MoveRight]: ["d", "arrowright"],
    [InputAction.Harvest]: ["e"],
    [InputAction.Console]: ["/"],
    [InputAction.Sprint]: ["shift"],
  };

  public mouseWorld = { x: 0, y: 0 };
  public mouseScreen = { x: 0, y: 0 };
  public dashTriggered = false;
  public superGatherTriggered = false;
  public pendingInteract = false;
  /** Set on left-click; consumed by the combat system as a melee swing. */
  public pendingAttack = false;

  private lastSprintPressTime = 0;
  private lastHarvestPressTime = 0;

  constructor() {
    this.loadBindings();
  }

  public setupListeners(
    canvas: HTMLCanvasElement,
    worldContainer: Container,
    isPlacementMode: () => boolean,
    cancelPlacement: () => void,
    onContextMenu: ((name: string, action: string, x: number, y: number) => void) | undefined,
    getCurrentTarget: () => { id: string; interactable?: { name: string; action: string } } | null
  ): () => void {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (devConsole.open) return;
      if (e.key === "Escape" && isPlacementMode()) {
        cancelPlacement();
        e.preventDefault();
        return;
      }
      const keyName = e.key.toLowerCase();
      this.keys[keyName] = true;

      // Double-tap SPRINT detection (Dash)
      const sprintKeys = this.bindings[InputAction.Sprint] ?? [];
      if (sprintKeys.includes(keyName)) {
        const now = performance.now();
        if (now - this.lastSprintPressTime < 250) {
          this.dashTriggered = true;
        }
        this.lastSprintPressTime = now;
      }

      // Double-tap HARVEST detection (Super-Gather)
      const harvestKeys = this.bindings[InputAction.Harvest] ?? [];
      if (harvestKeys.includes(keyName)) {
        const now = performance.now();
        if (now - this.lastHarvestPressTime < 250) {
          this.superGatherTriggered = true;
        }
        this.lastHarvestPressTime = now;
      }
    };

    const onKeyUp = (e: KeyboardEvent): void => {
      this.keys[e.key.toLowerCase()] = false;
    };

    const onMouseMove = (e: MouseEvent): void => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      this.mouseScreen = { x: clientX, y: clientY };
      const local = worldContainer.toLocal({ x: clientX, y: clientY });
      this.mouseWorld = { x: local.x, y: local.y };
    };

    const onMouseDown = (e: MouseEvent): void => {
      if (devConsole.open) return;
      if (e.button === 0) {
        // Left-click swings. Gathering/interacting is the E key (HARVEST); the
        // building-placement path reads this flag directly to place on click.
        this.pendingAttack = true;
      }
    };

    const onContextMenuEvent = (e: MouseEvent): void => {
      e.preventDefault();
      const target = getCurrentTarget();
      if (devConsole.open || !target?.interactable || !onContextMenu) return;
      onContextMenu(
        target.interactable.name,
        target.interactable.action,
        e.clientX,
        e.clientY
      );
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("contextmenu", onContextMenuEvent);

    // Return cleanup function
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("contextmenu", onContextMenuEvent);
    };
  }

  public isActionPressed(action: string): boolean {
    const keysList = this.bindings[action] ?? [];
    return keysList.some((k) => this.keys[k.toLowerCase()]);
  }

  public updateBindings(newBindings: Record<string, string[]>): void {
    this.bindings = newBindings;
  }

  public clearKeyboardState(): void {
    this.keys = {};
  }

  private loadBindings(): void {
    try {
      const data = localStorage.getItem(StorageKeys.inputBindings);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === "object") {
          this.bindings = parsed;
        }
      }
    } catch (e) {
      console.error("Failed to load control bindings inside engine:", e);
    }
  }
}
