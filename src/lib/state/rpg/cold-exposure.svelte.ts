/** Reactive cold accumulator (0–100) for HUD vignette and condition panel. */
let _acc = $state(0);

export const coldExposure = {
  get accumulator() { return _acc; },
};

export function setColdAccumulator(val: number): void {
  _acc = val;
}
