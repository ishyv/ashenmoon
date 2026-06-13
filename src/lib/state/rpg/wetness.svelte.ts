import {
  tickWetness,
  WETNESS_PENALTIES,
  type WetnessLevel,
  type WetnessState,
} from "$lib/domain/exposure/wetness";
import { StatusId } from "$lib/domain/systems/status-types";
import { applyStatusEffect, clearStatusEffect } from "$lib/state/rpg/status-effects.svelte";

let _state = $state<WetnessState>({ accumulator: 0, level: "dry" });

export const wetnessState = {
  get accumulator() { return _state.accumulator; },
  get level(): WetnessLevel { return _state.level; },
  get penalties() { return WETNESS_PENALTIES[_state.level]; },
};

let _prevLevel: WetnessLevel = "dry";

export function tickWetnessState(
  dt: number,
  isRaining: boolean,
  isSheltered: boolean,
  nearFire: boolean,
): void {
  _state = tickWetness(_state, { dt, isRaining, isSheltered, nearFire });
  const level = _state.level;
  if (level === _prevLevel) return;

  // Remove old wetness statuses
  if (_prevLevel === "damp")   clearStatusEffect(StatusId.Damp);
  if (_prevLevel === "wet")    clearStatusEffect(StatusId.Wet);
  if (_prevLevel === "soaked") clearStatusEffect(StatusId.Soaked);

  // Apply new status
  if (level === "damp")   applyStatusEffect(StatusId.Damp,   999, "rain");
  if (level === "wet")    applyStatusEffect(StatusId.Wet,    999, "rain");
  if (level === "soaked") applyStatusEffect(StatusId.Soaked, 999, "rain");

  _prevLevel = level;
}
