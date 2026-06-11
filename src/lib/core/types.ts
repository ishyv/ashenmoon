import type { AnimatedSprite, Application, Container, Graphics, Sprite, Text } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";

/** Ground type for each grid cell. Rendered as a tiling biome texture or flat camp clearing. */
export enum Cell {
  Meadows,
  ScorchedWastes,
  CrimsonGrove,
  FungalMire,
  Frostbane,
  Water,
  Camp,
}

export interface HudState {
  gx: number;
  gy: number;
  /** Name of the interactable entity adjacent to the player, or null if none. */
  lookAt: string | null;
}

export interface GameEngineConfig {
  container: HTMLDivElement;
  onInteract: (target: Entity) => void;
  onHudUpdate: (state: HudState) => void;
  /** Called when the player right-clicks an interactable entity. Use to show a context menu. */
  onContextMenu?: (name: string, action: string, screenX: number, screenY: number) => void;
}

/**
 * Represents an Axis-Aligned Bounding Box (AABB) for sub-tile custom solid collisions.
 * Used to define fractional hitboxes (e.g. tree trunks or rock centers) rather than blocking
 * the entire 64x64 grid tile.
 */
export interface AABB {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export type AnimState = "idle" | "run" | "attack";

/**
 * Which side an entity fights on. The damage system only lets an attack harm the
 * opposing faction, so the player's swing never hits the player and enemies never
 * hit each other. Resources/NPCs carry no `health`, so they are simply never valid
 * combat targets (they stay on the separate gather/interact path).
 */
export type Faction = "player" | "hostile";

/**
 * Enemy AI lifecycle. A single reusable state machine drives every hostile; an
 * enemy "type" is just a different `melee`/`mover`/`ai` configuration, not a new
 * brain. See enemy-ai.ts.
 *
 * - idle:    at rest near home until the player enters aggro range.
 * - chase:   pursuing the player (collision-aware), closing to attack range.
 * - windup:  telegraphing a strike (cannot move); the hit lands when it expires.
 * - recover: post-strike pause gated by the attack cooldown.
 * - stagger: hit-reaction lockout while knockback plays out.
 * - leash:   player escaped past leash range; walking back home, then idle.
 */
export type AiState = "idle" | "chase" | "windup" | "recover" | "stagger" | "leash";

/**
 * A transient sword-swing arc. Drawn in the aim direction and faded over its
 * short life so the player reads the true direction of a swing even though the
 * character sprite only mirrors left/right. Pooled in VFXResource.
 */
export interface SlashArc {
  graphic: Graphics;
  life: number;
  maxLife: number;
  /** centre aim angle in radians. */
  angle: number;
  /** swing radius in world px. */
  reach: number;
  /** half the cone angle in radians (arc spans angle ± halfAngle). */
  halfAngle: number;
  color: number;
}

export interface Particle {
  graphic: Graphics;
  vx: number;
  vy: number;
  gravity: number;
  life: number;
  maxLife: number;
}

export interface SpriteParticle {
  sprite: AnimatedSprite;
  vx: number;
  vy: number;
  gravity: number;
  life: number;
  maxLife: number;
}

export interface FloatingText {
  textObj: Text;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export interface HitFlash {
  graphic: Graphics;
  timer: number;
}

export interface Cloud {
  sprite: Sprite;
  vx: number;
}

export interface CameraShake {
  intensity: number;
  duration: number;
  time: number;
}

export interface ShockwaveRing {
  graphic: Graphics;
  life: number;
  maxLife: number;
  color: number;
}

export interface ActiveShake {
  duration: number;
  time: number;
  xOffset: number;
}

export interface BaseScale {
  x: number;
  y: number;
}
