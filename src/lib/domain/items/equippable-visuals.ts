// equippable-visuals.ts

export type LoadoutSlot = "helmet" | "chest" | "pants" | "boots" | "shield" | "weapon";

export interface EquippableVisualsTrait {
  kind: "equippable_visuals";
  slots: LoadoutSlot[];
  handUsage?: "one-handed" | "two-handed";
  visualAsset?: {
    textureKey: string;
    layer: "under" | "over";
    offsetX?: number;
    offsetY?: number;
    rotation?: number;
    anchorX?: number;
    anchorY?: number;
  };
  animationOverrides?: {
    [key in "attack" | "gather" | "gather_tired"]?: {
      lockDuration?: number;
      swingArcStart?: number;
      swingArcEnd?: number;
      lungeFactor?: number;
    };
  };
}

export function EquippableVisuals(config: Omit<EquippableVisualsTrait, "kind">): EquippableVisualsTrait {
  return { kind: "equippable_visuals", ...config };
}
