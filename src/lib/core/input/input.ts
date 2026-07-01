import type { Application, Container } from "pixi.js";
import { devConsole } from "$lib/ui/debug/dev-console";
import { menuController } from "$lib/state/menu-controller.svelte";
import { InputAction, StorageKeys } from "$lib/domain/game-events";
import { unlock } from "$lib/audio/audio-engine";
import { chargeProgressFromHeldMs } from "$lib/domain/combat/fell-sweep";
import {
  DEFAULT_POINTER_ATTACK_INTENT_CONFIG,
  classifyPointerAttackIntent,
  getPointerAttackArmedIntent,
  type DrivingThrustPendingInput,
  type PointerAttackArmedIntent,
  type PointerAttackIntentConfig,
  type Vec2,
} from "$lib/domain/combat/driving-thrust";
import type { AttackInputSnapshot } from "$lib/domain/combat/input-intent";

const DEFAULT_BINDINGS: Record<string, string[]> = {
  [InputAction.MoveUp]: ["w", "arrowup"],
  [InputAction.MoveDown]: ["s", "arrowdown"],
  [InputAction.MoveLeft]: ["a", "arrowleft"],
  [InputAction.MoveRight]: ["d", "arrowright"],
  [InputAction.Harvest]: ["e"],
  [InputAction.FocusedGather]: ["f"],
  [InputAction.Console]: ["/"],
  [InputAction.Sprint]: ["shift"],
  [InputAction.StanceModifier]: ["control"],
};

function directionBetween(start: Vec2, end: Vec2): Vec2 | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  return len > 0.0001 ? { x: dx / len, y: dy / len } : null;
}

export class InputResource {
  public keys: Record<string, boolean> = {};
  public bindings: Record<string, string[]> = { ...DEFAULT_BINDINGS };

  public mouseWorld = { x: 0, y: 0 };
  public mouseScreen = { x: 0, y: 0 };
  public dashTriggered = false;
  public focusedGatherTriggered = false;
  public pendingInteract = false;
  /** Set on short left-click (< 200ms hold); consumed by the combat system as a melee swing. */
  public pendingAttack = false;
  /** Set when mouse is released after a charge hold (>= 200ms). */
  public pendingFellSweep = false;
  /** Set when a short LMB swipe resolves into the fixed-distance thrust special. */
  public pendingDrivingThrust: DrivingThrustPendingInput | null = null;
  /**
   * Raw gesture captured on mouse-up for the weapon-driven combat path. The
   * weapon-attack system classifies it into an InputIntent. Set on every LMB
   * release; consumed (and cleared) by the new system, which also clears the
   * legacy pending flags when it acts so combat never double-fires.
   */
  public pendingWeaponAttack: AttackInputSnapshot | null = null;
  public primarySwipeStartScreen: Vec2 | null = null;
  public primarySwipeStartWorld: Vec2 | null = null;
  public primarySwipeCurrentScreen: Vec2 | null = null;
  public primarySwipeCurrentWorld: Vec2 | null = null;
  public pointerAttackIntentConfig: PointerAttackIntentConfig = { ...DEFAULT_POINTER_ATTACK_INTENT_CONFIG };
  public armedPointerAttackIntent: PointerAttackArmedIntent = "none";
  /** 0–1 charge level captured at mouseup. */
  public fellSweepCharge = 0;
  /** True while the left mouse button is held down. */
  public isMouseHeld = false;
  private mouseDownAt = 0;
  /** Set on short right-click (< 300ms); consumed by the engine to trigger direct interaction. */
  public pendingRightInteract = false;
  private rightDownAt = 0;
  private rightClientX = 0;
  private rightClientY = 0;

  private lastSprintPressTime = 0;

  /** Current charge progress (0–1) while holding. Drives VFX ring each frame. */
  public getChargeProgress(): number {
    if (!this.isMouseHeld) return 0;
    return chargeProgressFromHeldMs(this.getMouseHeldMs());
  }

  public getMouseHeldMs(now = performance.now()): number {
    return this.isMouseHeld ? Math.max(0, now - this.mouseDownAt) : 0;
  }

  public handlePrimaryMouseDown(args: { nowMs: number; screen: Vec2; world: Vec2 }): void {
    this.isMouseHeld = true;
    this.mouseDownAt = args.nowMs;
    this.mouseScreen = { ...args.screen };
    this.mouseWorld = { ...args.world };
    this.primarySwipeStartScreen = { ...args.screen };
    this.primarySwipeStartWorld = { ...args.world };
    this.primarySwipeCurrentScreen = { ...args.screen };
    this.primarySwipeCurrentWorld = { ...args.world };
    this.armedPointerAttackIntent = "none";
  }

  public handlePrimaryMouseMove(args: { screen: Vec2; world: Vec2; nowMs?: number }): void {
    this.mouseScreen = { ...args.screen };
    this.mouseWorld = { ...args.world };
    if (!this.isMouseHeld) return;
    this.primarySwipeCurrentScreen = { ...args.screen };
    this.primarySwipeCurrentWorld = { ...args.world };
    this.updatePointerAttackTracking(args.nowMs ?? this.mouseDownAt);
  }

  public updatePointerAttackTracking(nowMs = performance.now()): void {
    if (!this.isMouseHeld || !this.primarySwipeStartScreen || !this.primarySwipeCurrentScreen) {
      this.armedPointerAttackIntent = "none";
      return;
    }

    this.armedPointerAttackIntent = getPointerAttackArmedIntent({
      start: this.primarySwipeStartScreen,
      current: this.primarySwipeCurrentScreen,
      downAtMs: this.mouseDownAt,
      nowMs,
      config: this.pointerAttackIntentConfig,
    });
  }

  public handlePrimaryMouseUp(args: { nowMs: number; screen: Vec2; world: Vec2 }): void {
    if (!this.isMouseHeld) return;

    this.mouseScreen = { ...args.screen };
    this.mouseWorld = { ...args.world };
    this.primarySwipeCurrentScreen = { ...args.screen };
    this.primarySwipeCurrentWorld = { ...args.world };
    const heldMs = this.getMouseHeldMs(args.nowMs);
    this.isMouseHeld = false;

    const screenStart = this.primarySwipeStartScreen ?? args.screen;
    const worldStart = this.primarySwipeStartWorld ?? args.world;
    const worldDirection = directionBetween(worldStart, args.world);
    const screenDirection = directionBetween(screenStart, args.screen);
    const clickDirection = worldDirection ?? screenDirection ?? { x: 1, y: 0 };
    const intent = classifyPointerAttackIntent({
      input: {
        start: screenStart,
        end: args.screen,
        downAtMs: this.mouseDownAt,
        upAtMs: args.nowMs,
      },
      clickDirection,
      config: this.pointerAttackIntentConfig,
    });

    // Weapon-driven path: capture the full gesture for the new combat system,
    // which classifies it into a tap/hold/swipe (+ stance) intent. Always set;
    // the new system decides whether the equipped weapon handles it.
    this.pendingWeaponAttack = {
      start: screenStart,
      end: args.screen,
      downAtMs: this.mouseDownAt,
      upAtMs: args.nowMs,
      clickDirection,
      stanceHeld: this.isStanceHeld(),
    };

    if (this.armedPointerAttackIntent === "full_swipe" || intent.kind === "full_swipe") {
      this.pendingFellSweep = true;
      this.fellSweepCharge = chargeProgressFromHeldMs(heldMs);
    } else if (intent.kind === "driving_thrust" && this.armedPointerAttackIntent === "driving_thrust") {
      this.pendingDrivingThrust = {
        direction: worldDirection ?? intent.direction,
        screenStart,
        screenEnd: args.screen,
        worldStart,
        worldEnd: args.world,
      };
    } else if (heldMs >= 200) {
      this.pendingFellSweep = true;
      this.fellSweepCharge = chargeProgressFromHeldMs(heldMs);
    } else {
      this.pendingAttack = true;
    }

    this.armedPointerAttackIntent = "none";
  }

  public clearPrimarySwipeState(): void {
    this.primarySwipeStartScreen = null;
    this.primarySwipeStartWorld = null;
    this.primarySwipeCurrentScreen = null;
    this.primarySwipeCurrentWorld = null;
    this.pendingDrivingThrust = null;
    this.armedPointerAttackIntent = "none";
  }

  constructor() {
    this.loadBindings();
  }

  public setupListeners(
    inputEl: HTMLElement,
    worldContainer: Container,
    isPlacementMode: () => boolean,
    cancelPlacement: () => void,
    onRightClickHold: ((screenX: number, screenY: number) => void) | undefined,
    getCurrentTarget: () => { id: string; interactable?: { name: string; action: string } } | null
  ): () => void {
    const onKeyDown = (e: KeyboardEvent): void => {
      unlock();
      // Block browser shortcuts while the game is running (F12 intentionally left open)
      if (e.ctrlKey || e.metaKey) e.preventDefault();
      if (/^F([1-9]|10|11)$/.test(e.key)) e.preventDefault();
      if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) e.preventDefault();
      if (e.key === "Escape" && isPlacementMode()) {
        cancelPlacement();
        e.preventDefault();
        return;
      }
      if (devConsole.open) return;
      // WHY: menu context controller owns arrow/action keys while any menu is open
      if (menuController.active) return;
      this.handleKeyDown(e.key, e.repeat);
    };

    const onKeyUp = (e: KeyboardEvent): void => {
      this.handleKeyUp(e.key);
    };

    const onMouseMove = (e: MouseEvent): void => {
      const rect = inputEl.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      const local = worldContainer.toLocal({ x: clientX, y: clientY });
      this.handlePrimaryMouseMove({
        screen: { x: clientX, y: clientY },
        world: { x: local.x, y: local.y },
        nowMs: performance.now(),
      });
    };

    const onMouseDown = (e: MouseEvent): void => {
      unlock();
      if (devConsole.open) return;
      if (menuController.active) return;
      if (e.button === 0) {
        this.handlePrimaryMouseDown({
          nowMs: performance.now(),
          screen: this.mouseScreen,
          world: this.mouseWorld,
        });
      }
      if (e.button === 2) {
        this.rightDownAt = performance.now();
        this.rightClientX = e.clientX;
        this.rightClientY = e.clientY;
      }
    };

    const onMouseUp = (e: MouseEvent): void => {
      if (e.button === 0 && this.isMouseHeld) {
        this.handlePrimaryMouseUp({
          nowMs: performance.now(),
          screen: this.mouseScreen,
          world: this.mouseWorld,
        });
      }
      if (e.button === 2) {
        const elapsed = performance.now() - this.rightDownAt;
        if (!devConsole.open && !isPlacementMode()) {
          if (elapsed < 300) {
            this.pendingRightInteract = true;
          } else {
            onRightClickHold?.(this.rightClientX, this.rightClientY);
          }
        }
      }
    };

    const onContextMenuEvent = (e: MouseEvent): void => {
      e.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    inputEl.addEventListener("mousemove", onMouseMove);
    inputEl.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    inputEl.addEventListener("contextmenu", onContextMenuEvent);

    // Return cleanup function
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      inputEl.removeEventListener("mousemove", onMouseMove);
      inputEl.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      inputEl.removeEventListener("contextmenu", onContextMenuEvent);
    };
  }

  public isActionPressed(action: string): boolean {
    // WHY: keys held before a menu opened remain in this.keys; block at the
    // read side so movement/sprint/gather never fire while the menu owns input.
    if (menuController.active) return false;
    const keysList = this.bindings[action] ?? [];
    return keysList.some((k) => this.keys[k.toLowerCase()]);
  }

  /** Whether the weapon-stance modifier (Ctrl by default) is currently held. */
  public isStanceHeld(): boolean {
    return this.isActionPressed(InputAction.StanceModifier);
  }

  public updateBindings(newBindings: Record<string, string[]>): void {
    this.bindings = { ...DEFAULT_BINDINGS, ...newBindings };
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
          this.bindings = { ...DEFAULT_BINDINGS, ...parsed };
        }
      }
    } catch (e) {
      console.error("Failed to load control bindings inside engine:", e);
    }
  }
}
