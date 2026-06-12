import type { Application, Container } from "pixi.js";
import { devConsole } from "$lib/ui/debug/dev-console";
import { InputAction, StorageKeys } from "$lib/domain/game-events";

export class InputResource {
  public keys: Record<string, boolean> = {};
  public bindings: Record<string, string[]> = {
    [InputAction.MoveUp]: ["w", "arrowup"],
    [InputAction.MoveDown]: ["s", "arrowdown"],
    [InputAction.MoveLeft]: ["a", "arrowleft"],
    [InputAction.MoveRight]: ["d", "arrowright"],
    [InputAction.Harvest]: ["e"],
    [InputAction.FocusedGather]: ["f"],
    [InputAction.Console]: ["/"],
    [InputAction.Sprint]: ["shift"],
  };

  public mouseWorld = { x: 0, y: 0 };
  public mouseScreen = { x: 0, y: 0 };
  public dashTriggered = false;
  public focusedGatherTriggered = false;
  public pendingInteract = false;
  /** Set on short left-click (< 800ms hold); consumed by the combat system as a melee swing. */
  public pendingAttack = false;
  /** Set when mouse is released after a charge hold (>= 800ms). */
  public pendingFellSweep = false;
  /** 0–1 charge level captured at mouseup. */
  public fellSweepCharge = 0;
  /** True while the left mouse button is held down. */
  public isMouseHeld = false;
  private mouseDownAt = 0;

  private lastSprintPressTime = 0;

  /** Current charge progress (0–1) while holding. Drives VFX ring each frame. */
  public getChargeProgress(): number {
    if (!this.isMouseHeld) return 0;
    const heldMs = performance.now() - this.mouseDownAt;
    return Math.min(1.0, Math.max(0, (heldMs - 200) / 2800));
  }

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
      if (e.key === "Escape" && isPlacementMode()) {
        cancelPlacement();
        e.preventDefault();
        return;
      }
      if (devConsole.open) return;
      this.handleKeyDown(e.key, e.repeat);
    };

    const onKeyUp = (e: KeyboardEvent): void => {
      this.handleKeyUp(e.key);
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
        this.isMouseHeld = true;
        this.mouseDownAt = performance.now();
      }
    };

    const onMouseUp = (e: MouseEvent): void => {
      if (e.button === 0 && this.isMouseHeld) {
        this.isMouseHeld = false;
        const heldMs = performance.now() - this.mouseDownAt;
        if (heldMs < 200) {
          // Fast click — normal swing.
          this.pendingAttack = true;
        } else {
          // Any hold >= 200ms fires Fell Sweep (weakest at 200ms, max at 3000ms).
          this.pendingFellSweep = true;
          this.fellSweepCharge = Math.min(1.0, (heldMs - 200) / 2800);
        }
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
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("contextmenu", onContextMenuEvent);

    // Return cleanup function
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
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

  public handleKeyDown(key: string, repeat = false, now = performance.now()): void {
    const keyName = key.toLowerCase();
    this.keys[keyName] = true;
    if (repeat) return;

    const sprintKeys = this.bindings[InputAction.Sprint] ?? [];
    if (sprintKeys.includes(keyName)) {
      if (now - this.lastSprintPressTime < 250) {
        this.dashTriggered = true;
      }
      this.lastSprintPressTime = now;
    }

    const focusedKeys = this.bindings[InputAction.FocusedGather] ?? [];
    if (focusedKeys.includes(keyName)) {
      this.focusedGatherTriggered = true;
    }
  }

  public handleKeyUp(key: string): void {
    this.keys[key.toLowerCase()] = false;
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
