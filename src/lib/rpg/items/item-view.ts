import type { ItemEffect } from "./item-effects";

/**
 * Presentational helpers for the HUD. They derive display values from item
 * definitions and traits so UI code never hand-rolls the conventions (icon
 * paths, transform targets) on its own.
 */

/** Conventional icon path for an item id. */
export function iconUrlFor(id: string): string {
  return `/assets/icons/${id}.png`;
}

/**
 * The item a reactive effect turns its source into for display, falling back to
 * the source id when the effect does not transform (destroy, status, etc.).
 */
export function reactsInto(effect: ItemEffect, fallbackId: string): string {
  return effect.kind === "transform" ? effect.into : fallbackId;
}
