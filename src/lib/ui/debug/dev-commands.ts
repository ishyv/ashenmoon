/**
 * Wires the dev console to the scriptable game facade. All typed input flows
 * through `evaluate` against the facade scope; there is no per-command table.
 * To add a dev capability, add a property to `createGameFacade` — not here.
 */

import type { GameEngine } from "$lib/core/engine";
import { buildScope, createGameFacade } from "$lib/core/command-runtime/game-facade";
import { evaluate } from "$lib/ui/debug/dev-runtime";
import { devConsole } from "$lib/ui/debug/dev-console";

export function registerDevRuntime(engine: GameEngine): void {
  const scope = buildScope(createGameFacade(engine));
  devConsole.setEvaluator((src) => evaluate(src, scope));
}
