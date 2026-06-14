import type { WorldActionOption } from "$lib/domain/world-actions";

export interface WorldActionRuntime {
  readonly action: WorldActionOption;
  readonly elapsedSec: number;
  readonly durationSec: number;
  readonly remainingSec: number;
  readonly completed: boolean;
}

export function createWorldActionRuntime(action: WorldActionOption): WorldActionRuntime {
  const durationSec = Math.max(0, action.durationSec ?? 0);
  return {
    action,
    elapsedSec: 0,
    durationSec,
    remainingSec: durationSec,
    completed: durationSec === 0,
  };
}

export function tickWorldActionRuntime(runtime: WorldActionRuntime, dtSec: number): WorldActionRuntime {
  if (runtime.completed) return runtime;
  const elapsedSec = Math.min(runtime.durationSec, runtime.elapsedSec + Math.max(0, dtSec));
  return {
    ...runtime,
    elapsedSec,
    remainingSec: Math.max(0, runtime.durationSec - elapsedSec),
    completed: elapsedSec >= runtime.durationSec,
  };
}
