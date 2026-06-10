/**
 * Typed accessors for singleton entities, so systems stop hand-rolling
 * `world.entities.find((e) => e.id === "player")` (it appeared 14× across the
 * game systems).
 *
 * The player reference is cached and revalidated cheaply against the live world
 * each call. Respawn reuses the same entity object, so the cache rarely misses;
 * call `clearPlayerCache()` only if the player entity is ever replaced wholesale
 * (e.g. on a full world rebuild).
 */
import { world, type Entity } from "./ecs-miniplex";
import { EntityId } from "./game-events";

let cachedPlayer: Entity | null = null;

function resolvePlayer(): Entity | null {
  if (cachedPlayer && world.entities.includes(cachedPlayer)) return cachedPlayer;
  cachedPlayer = world.entities.find((e) => e.id === EntityId.Player) ?? null;
  return cachedPlayer;
}

/**
 * The player entity. Throws if absent — most systems run only while the player
 * exists and treating its absence as impossible keeps their call sites clean.
 */
export function getPlayerEntity(): Entity {
  const player = resolvePlayer();
  if (!player) throw new Error("player entity not found in world");
  return player;
}

/** The player entity if present, else null — for callers that tolerate absence. */
export function findPlayerEntity(): Entity | null {
  return resolvePlayer();
}

/** Drops the cached reference. Call after replacing the player entity. */
export function clearPlayerCache(): void {
  cachedPlayer = null;
}
