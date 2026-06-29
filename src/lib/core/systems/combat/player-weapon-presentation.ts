import type { AnimatedSprite, Sprite } from "pixi.js";
import type { CombatResource } from "./combat";

export interface PlayerWeaponPresentationArgs {
  readonly combat: CombatResource;
  readonly playerSprite: Pick<AnimatedSprite, "tint">;
  readonly weaponSprite: Pick<Sprite, "alpha" | "tint" | "rotation" | "x" | "y"> | undefined;
  readonly facing: 1 | -1;
  readonly basePose: {
    readonly x: number;
    readonly y: number;
    readonly rotation: number;
  };
}

export function applyPlayerWeaponPresentation(args: PlayerWeaponPresentationArgs): void {
  const { combat, playerSprite, weaponSprite, facing } = args;
  playerSprite.tint = 0xffffff;
  if (!weaponSprite) return;

  weaponSprite.alpha = 1;
  weaponSprite.tint = 0xffffff;
  weaponSprite.x = args.basePose.x;
  weaponSprite.y = args.basePose.y;
  weaponSprite.rotation = args.basePose.rotation;

  if (combat.guard.active) {
    playerSprite.tint = 0xd8ecff;
    weaponSprite.tint = 0xcfe8ff;
    weaponSprite.rotation = facing * -0.42;
    weaponSprite.x = args.basePose.x + facing * 2;
    weaponSprite.y = args.basePose.y - 4;
    return;
  }

  const attack = combat.weaponAttack;
  if (!attack.active || !attack.plan) {
    return;
  }

  const total = Math.max(1, attack.plan.windupMs + attack.plan.activeMs + attack.plan.recoveryMs);
  const t = Math.max(0, Math.min(1, attack.elapsedMs / total));
  const pose = attack.plan.attack.presentation?.pose ?? "quick";
  const trail = attack.plan.attack.presentation?.trail ?? "arc";
  const commitment = pose === "committed" ? 1.25 : pose === "extended" ? 1.05 : 0.85;
  const arc = trail === "thrust" ? 0.38 : trail === "heavy" ? 1.18 : 0.82;

  weaponSprite.rotation = facing * (-arc * 0.45 + Math.sin(t * Math.PI) * arc * commitment);
  weaponSprite.x = args.basePose.x + facing * Math.sin(t * Math.PI) * (trail === "thrust" ? 8 : 5);
  weaponSprite.y = args.basePose.y - Math.sin(t * Math.PI) * (pose === "committed" ? 5 : 2);
}
