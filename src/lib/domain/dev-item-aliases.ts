import { ITEM_DEFINITIONS } from "$lib/domain/items";

const DEV_ITEM_ALIASES: Readonly<Record<string, string>> = {
  axe: "stone_axe",
  knife: "crude_knife",
  spear: "wooden_spear",
};

export function resolveDevItemId(input: string): string | null {
  const key = input.trim().toLowerCase();
  const itemId = DEV_ITEM_ALIASES[key] ?? key;
  return ITEM_DEFINITIONS[itemId] ? itemId : null;
}

export function formatDevItemIdUsage(input: string): string {
  return `unknown item id or alias: ${input}`;
}
