import type { WeaponDamageType } from "./weapon-types";

export type WeaponFamilyId = string;

export interface WeaponFamilyDefinition {
  id: WeaponFamilyId;
  aliases: readonly string[];
  defaultDamageType: WeaponDamageType;
  defaultWeightClass: "light" | "medium" | "heavy";
  defaultAnimationProfile: string;
  defaultSoundProfile: string;
  defaultAttackShape: "arc" | "capsule" | "circle" | "point";
  tags: readonly string[];
}

const families = new Map<WeaponFamilyId, WeaponFamilyDefinition>();

export function registerWeaponFamily(def: WeaponFamilyDefinition): void {
  families.set(def.id, def);
}

export function getWeaponFamily(id: WeaponFamilyId): WeaponFamilyDefinition | undefined {
  return families.get(id);
}

export function clearWeaponFamilies(): void {
  families.clear();
  registerDefaultWeaponFamilies();
}

export function resolveWeaponFamilyForKind(weaponKind: string): WeaponFamilyDefinition {
  const normalized = weaponKind.toLowerCase();
  for (const family of families.values()) {
    if (family.id === normalized || family.aliases.some((alias) => normalized.includes(alias))) return family;
  }
  return families.get("sword") ?? DEFAULT_WEAPON_FAMILIES.sword!;
}

export function resolveWeaponDamageType(
  itemDamageType: "slash" | "pierce" | "blunt",
  family: WeaponFamilyDefinition,
): WeaponDamageType {
  if (itemDamageType === "slash" && family.defaultDamageType === "chop") return "chop";
  return itemDamageType;
}

const DEFAULT_WEAPON_FAMILIES: Record<string, WeaponFamilyDefinition> = {
  unarmed: {
    id: "unarmed",
    aliases: ["unarmed", "fist", "hand"],
    defaultDamageType: "blunt",
    defaultWeightClass: "light",
    defaultAnimationProfile: "quick_stab",
    defaultSoundProfile: "unarmed",
    defaultAttackShape: "arc",
    tags: ["unarmed"],
  },
  knife: {
    id: "knife",
    aliases: ["knife", "dagger", "blade"],
    defaultDamageType: "slash",
    defaultWeightClass: "light",
    defaultAnimationProfile: "small_slash",
    defaultSoundProfile: "knife",
    defaultAttackShape: "capsule",
    tags: ["short_blade", "sharp"],
  },
  sword: {
    id: "sword",
    aliases: ["sword", "blade"],
    defaultDamageType: "slash",
    defaultWeightClass: "medium",
    defaultAnimationProfile: "small_slash",
    defaultSoundProfile: "sword",
    defaultAttackShape: "arc",
    tags: ["blade", "sharp"],
  },
  curved_sword: {
    id: "curved_sword",
    aliases: ["curved_sword", "curved sword", "saber", "scimitar"],
    defaultDamageType: "slash",
    defaultWeightClass: "medium",
    defaultAnimationProfile: "small_slash",
    defaultSoundProfile: "sword",
    defaultAttackShape: "arc",
    tags: ["blade", "curved", "sharp"],
  },
  axe: {
    id: "axe",
    aliases: ["axe", "hatchet"],
    defaultDamageType: "chop",
    defaultWeightClass: "heavy",
    defaultAnimationProfile: "heavy_chop",
    defaultSoundProfile: "axe",
    defaultAttackShape: "arc",
    tags: ["hafted", "heavy", "sharp"],
  },
  spear: {
    id: "spear",
    aliases: ["spear", "pike"],
    defaultDamageType: "pierce",
    defaultWeightClass: "medium",
    defaultAnimationProfile: "straight_thrust",
    defaultSoundProfile: "spear",
    defaultAttackShape: "capsule",
    tags: ["polearm", "hafted", "sharp"],
  },
  club: {
    id: "club",
    aliases: ["club", "mace"],
    defaultDamageType: "blunt",
    defaultWeightClass: "medium",
    defaultAnimationProfile: "heavy_chop",
    defaultSoundProfile: "club",
    defaultAttackShape: "arc",
    tags: ["blunt", "hafted"],
  },
  hammer: {
    id: "hammer",
    aliases: ["hammer", "maul"],
    defaultDamageType: "chop",
    defaultWeightClass: "heavy",
    defaultAnimationProfile: "heavy_chop",
    defaultSoundProfile: "hammer",
    defaultAttackShape: "arc",
    tags: ["blunt", "heavy", "hafted"],
  },
};

function registerDefaultWeaponFamilies(): void {
  for (const family of Object.values(DEFAULT_WEAPON_FAMILIES)) registerWeaponFamily(family);
}

registerDefaultWeaponFamilies();
