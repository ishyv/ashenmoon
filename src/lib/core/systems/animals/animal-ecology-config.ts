import { TILE } from "$lib/core/systems/map/map";

export const ANIMAL_ECOLOGY_CONFIG = {
  bodyHalfWidthPx: TILE * 0.22,
  bodyHalfHeightPx: TILE * 0.18,
  bodyCenterYOffsetPx: TILE * 0.65,
  homeLeashRadiusPx: TILE * 3,
  grazeReturnSpeedMultiplier: 0.45,
} as const;
