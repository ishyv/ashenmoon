import { ITEM_DEFINITIONS, traitOf } from "$lib/domain/items";
import { effectiveTemperature, type ExposureContext } from "./exposure-context";

export interface PlacedItemState {
  itemId: string;
  qty: number;
  exposureTimeSec: number;
  hasWarned: boolean;
}

export interface PlacedItemTickResult {
  next: PlacedItemState;
  transformedItemId: string | null;
  warning: string | null;
  learnedProperty: "flammable" | "heat_sensitive" | "perishable" | null;
}

export function tickPlacedItemExposure(
  state: PlacedItemState,
  ctx: ExposureContext,
  dt: number,
  defs = ITEM_DEFINITIONS
): PlacedItemTickResult {
  const def = defs[state.itemId];
  if (!def) {
    return { next: state, transformedItemId: null, warning: null, learnedProperty: null };
  }

  const flammable = traitOf(def, "flammable");
  const tempSensitive = traitOf(def, "temperature_sensitive");
  const decayable = traitOf(def, "decayable");

  if (!flammable && !tempSensitive && !decayable) {
    return { next: state, transformedItemId: null, warning: null, learnedProperty: null };
  }

  const temp = effectiveTemperature(ctx);

  let shouldReact = false;
  let warningMsg = "";
  let nextItemId: string | null = null;
  let reactionKind: "flammable" | "temp" | "decay" = "flammable";

  if (flammable && temp >= flammable.ignitionTemp) {
    shouldReact = true;
    warningMsg = "smoldering...";
    reactionKind = "flammable";
    if (flammable.effect.kind === "transform") {
      nextItemId = flammable.effect.into;
    }
  } else if (tempSensitive && (temp > tempSensitive.maxSafeTemp || temp < tempSensitive.minSafeTemp)) {
    shouldReact = true;
    warningMsg = temp > tempSensitive.maxSafeTemp ? "heating up..." : "freezing...";
    reactionKind = "temp";
    if (tempSensitive.effect.kind === "transform") {
      nextItemId = tempSensitive.effect.into;
    }
  } else if (decayable) {
    shouldReact = true;
    warningMsg = "decaying...";
    reactionKind = "decay";
    if (decayable.effect.kind === "transform") {
      nextItemId = decayable.effect.into;
    }
  }

  if (shouldReact) {
    const rate = reactionKind === "decay" ? (ctx.radiantHeat > 0 ? 2 : 1) : 1;
    const nextExposureTime = state.exposureTimeSec + dt * rate;
    const limit = reactionKind === "decay" ? (decayable?.lifespanSec ?? 120) : 2.5;

    let warning: string | null = null;
    let hasWarned = state.hasWarned;
    if (reactionKind !== "decay" && nextExposureTime >= 1.0 && !state.hasWarned) {
      warning = warningMsg;
      hasWarned = true;
    }

    if (nextExposureTime >= limit) {
      let learnedProperty: "flammable" | "heat_sensitive" | "perishable" | null = null;
      if (reactionKind === "flammable") {
        learnedProperty = "flammable";
      } else if (reactionKind === "temp") {
        learnedProperty = "heat_sensitive";
      } else if (reactionKind === "decay") {
        learnedProperty = "perishable";
      }

      return {
        next: { itemId: nextItemId || "", qty: state.qty, exposureTimeSec: 0, hasWarned: false },
        transformedItemId: nextItemId,
        warning,
        learnedProperty,
      };
    }

    return {
      next: { ...state, exposureTimeSec: nextExposureTime, hasWarned },
      transformedItemId: null,
      warning,
      learnedProperty: null,
    };
  } else {
    return {
      next: {
        ...state,
        exposureTimeSec: Math.max(0, state.exposureTimeSec - dt),
        hasWarned: state.exposureTimeSec - dt <= 0 ? false : state.hasWarned,
      },
      transformedItemId: null,
      warning: null,
      learnedProperty: null,
    };
  }
}
