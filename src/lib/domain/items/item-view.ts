import type { InventoryEffect, VitalsEffect } from "./item-effects";

/** Presentational helpers for the HUD. */

/**
 * The item a reactive effect turns its source into for display, falling back to
 * the source id when the effect does not transform (destroy, status, etc.).
 */
export function reactsInto(effect: InventoryEffect | VitalsEffect, fallbackId: string): string {
  return effect.kind === "transform" ? effect.into : fallbackId;
}
