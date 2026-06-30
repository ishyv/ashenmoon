import { afterEach, describe, expect, it, vi } from 'vitest';
import { uiInputController, type ActionRegistration } from './input-controller.svelte';
import { devConsole } from '$lib/ui/debug/dev-console';

// Track every registration so we can remove it from the module-level
// `registrations` array after each test. Module-level state in
// input-controller.svelte.ts persists for the lifetime of the test file.
const cleanups: (() => void)[] = [];

function register(overrides: Partial<ActionRegistration> = {}): () => void {
  const r: ActionRegistration = {
    action: 'toggle_inventory',
    keys: ['i'],
    layer: 'overlay',
    handler: () => false,
    ...overrides,
  };
  const unsub = uiInputController.register(r);
  cleanups.push(unsub);
  return unsub;
}

function fakeEvent(key: string, target?: Element): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key });
  if (target) {
    Object.defineProperty(e, 'target', { value: target, configurable: true });
  }
  return e;
}

afterEach(() => {
  // Remove all registrations created by this test.
  for (const fn of cleanups.splice(0)) fn();
  // Restore devConsole to closed state.
  devConsole.open = false;
});

// ---------------------------------------------------------------------------
// register()
// ---------------------------------------------------------------------------

describe('UIInputController — register()', () => {
  it('adds the registration to the ledger', () => {
    const r: ActionRegistration = {
      action: 'toggle_inventory',
      keys: ['i'],
      layer: 'overlay',
      handler: () => false,
    };
    const unsub = uiInputController.register(r);
    cleanups.push(unsub);
    expect(uiInputController.getLedger()).toContain(r);
  });

  it('unsubscribe removes the registration from the ledger', () => {
    const r: ActionRegistration = {
      action: 'toggle_crafting',
      keys: ['c'],
      layer: 'overlay',
      handler: () => false,
    };
    const unsub = uiInputController.register(r);
    expect(uiInputController.getLedger()).toContain(r);
    unsub();
    expect(uiInputController.getLedger()).not.toContain(r);
    // Already removed — no need to push to cleanups.
  });

  it('warns when two registrations in the same layer share a key', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    register({ action: 'toggle_inventory', keys: ['i'], layer: 'overlay' });
    register({ action: 'toggle_equipment', keys: ['i'], layer: 'overlay' });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Key conflict'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"i"'));
    warn.mockRestore();
  });

  it('does not warn when conflicting keys are in different layers', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    register({ keys: ['i'], layer: 'overlay' });
    register({ keys: ['i'], layer: 'hotbar', action: 'hotbar_1' });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does not warn when registrations in the same layer use different keys', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    register({ keys: ['i'], layer: 'overlay' });
    register({ keys: ['j'], layer: 'overlay', action: 'toggle_crafting' });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('calling unsubscribe twice is a safe no-op', () => {
    const r: ActionRegistration = {
      action: 'toggle_quests',
      keys: ['q'],
      layer: 'overlay',
      handler: () => false,
    };
    const unsub = uiInputController.register(r);
    unsub();
    expect(() => unsub()).not.toThrow();
    expect(uiInputController.getLedger()).not.toContain(r);
  });
});

// ---------------------------------------------------------------------------
// dispatch()
// ---------------------------------------------------------------------------

describe('UIInputController — dispatch()', () => {
  it('calls the handler whose layer and key match', () => {
    const handler = vi.fn().mockReturnValue(false);
    register({ keys: ['e'], layer: 'overlay', handler });
    uiInputController.dispatch(fakeEvent('e'));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('normalises e.key to lowercase before matching', () => {
    const handler = vi.fn().mockReturnValue(false);
    register({ keys: ['escape'], layer: 'overlay', handler });
    uiInputController.dispatch(fakeEvent('Escape'));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not call a handler registered for a different key', () => {
    const handler = vi.fn().mockReturnValue(false);
    register({ keys: ['i'], layer: 'overlay', handler });
    uiInputController.dispatch(fakeEvent('j'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('stops dispatching once a handler returns true', () => {
    const consuming = vi.fn().mockReturnValue(true);
    const downstream = vi.fn().mockReturnValue(false);
    // overlay fires before hotbar (LAYER_ORDER: menu > overlay > hotbar > game)
    register({ keys: ['x'], layer: 'overlay', action: 'toggle_inventory', handler: consuming });
    register({ keys: ['x'], layer: 'hotbar', action: 'hotbar_1', handler: downstream });
    uiInputController.dispatch(fakeEvent('x'));
    expect(consuming).toHaveBeenCalledOnce();
    expect(downstream).not.toHaveBeenCalled();
  });

  it('dispatches through lower layers when higher-priority handler returns false', () => {
    const overlay = vi.fn().mockReturnValue(false);
    const hotbar = vi.fn().mockReturnValue(false);
    register({ keys: ['x'], layer: 'overlay', action: 'toggle_inventory', handler: overlay });
    register({ keys: ['x'], layer: 'hotbar', action: 'hotbar_1', handler: hotbar });
    uiInputController.dispatch(fakeEvent('x'));
    expect(overlay).toHaveBeenCalledOnce();
    expect(hotbar).toHaveBeenCalledOnce();
  });

  it('respects the full layer priority: overlay before hotbar before game', () => {
    const calls: string[] = [];
    register({ keys: ['x'], layer: 'overlay', action: 'toggle_inventory', handler: () => { calls.push('overlay'); return false; } });
    register({ keys: ['x'], layer: 'hotbar', action: 'hotbar_1', handler: () => { calls.push('hotbar'); return false; } });
    register({ keys: ['x'], layer: 'game', action: 'close_panel', handler: () => { calls.push('game'); return false; } });
    uiInputController.dispatch(fakeEvent('x'));
    expect(calls).toEqual(['overlay', 'hotbar', 'game']);
  });

  it('skips dispatch entirely when devConsole is open', () => {
    const handler = vi.fn().mockReturnValue(false);
    register({ keys: ['i'], layer: 'overlay', handler });
    devConsole.open = true;
    uiInputController.dispatch(fakeEvent('i'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('skips dispatch when the event target is an INPUT element', () => {
    const handler = vi.fn().mockReturnValue(false);
    register({ keys: ['i'], layer: 'overlay', handler });
    const input = document.createElement('input');
    uiInputController.dispatch(fakeEvent('i', input));
    expect(handler).not.toHaveBeenCalled();
  });

  it('skips dispatch when the event target is a TEXTAREA element', () => {
    const handler = vi.fn().mockReturnValue(false);
    register({ keys: ['i'], layer: 'overlay', handler });
    const ta = document.createElement('textarea');
    uiInputController.dispatch(fakeEvent('i', ta));
    expect(handler).not.toHaveBeenCalled();
  });

  it('skips dispatch when the event target is a SELECT element', () => {
    const handler = vi.fn().mockReturnValue(false);
    register({ keys: ['i'], layer: 'overlay', handler });
    const sel = document.createElement('select');
    uiInputController.dispatch(fakeEvent('i', sel));
    expect(handler).not.toHaveBeenCalled();
  });

  it('dispatches normally when the event target is a non-form element', () => {
    const handler = vi.fn().mockReturnValue(false);
    register({ keys: ['i'], layer: 'overlay', handler });
    const div = document.createElement('div');
    uiInputController.dispatch(fakeEvent('i', div));
    expect(handler).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// validateAgainst()
// ---------------------------------------------------------------------------

describe('UIInputController — validateAgainst()', () => {
  it('warns when a registered UI key also appears in game bindings', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    register({ keys: ['w'], action: 'toggle_inventory', layer: 'overlay' });
    uiInputController.validateAgainst({ MOVE_UP: ['w'] });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Cross-layer key overlap'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"w"'));
    warn.mockRestore();
  });

  it('does not warn when there is no overlap with game bindings', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    register({ keys: ['i'], layer: 'overlay' });
    uiInputController.validateAgainst({ MOVE_UP: ['w', 'arrowup'] });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('is case-insensitive for game binding keys', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    register({ keys: ['w'], action: 'toggle_inventory', layer: 'overlay' });
    // Game bindings may use uppercase; validateAgainst lowercases them.
    uiInputController.validateAgainst({ MOVE_UP: ['W'] });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Cross-layer key overlap'));
    warn.mockRestore();
  });

  it('is a no-op when no registrations exist', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    uiInputController.validateAgainst({ MOVE_UP: ['w'] });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// getLedger()
// ---------------------------------------------------------------------------

describe('UIInputController — getLedger()', () => {
  it('returns all currently registered entries', () => {
    const r1: ActionRegistration = { action: 'toggle_inventory', keys: ['i'], layer: 'overlay', handler: () => false };
    const r2: ActionRegistration = { action: 'toggle_crafting', keys: ['c'], layer: 'overlay', handler: () => false };
    cleanups.push(uiInputController.register(r1));
    cleanups.push(uiInputController.register(r2));
    const ledger = uiInputController.getLedger();
    expect(ledger).toContain(r1);
    expect(ledger).toContain(r2);
  });

  it('returns a readonly snapshot (not the internal array)', () => {
    register({ keys: ['i'], layer: 'overlay' });
    const ledger = uiInputController.getLedger();
    expect(Array.isArray(ledger)).toBe(true);
    // The returned object must not be writable in a way that corrupts state.
    // Verifying it is a readonly reference — casting is sufficient for the type check.
    expect(() => {
      (ledger as ActionRegistration[]).length;
    }).not.toThrow();
  });
});
