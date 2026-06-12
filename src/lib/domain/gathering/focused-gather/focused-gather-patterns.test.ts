import { describe, expect, it } from "vitest";
import { generateTargets } from "./focused-gather-patterns";
import { FOCUSED_GATHER_PROFILES } from "./focused-gather-profiles";

/** Deterministic rng cycling through a fixed sequence. */
function seededRng(seq: number[]): () => number {
  let i = 0;
  return () => seq[i++ % seq.length];
}

describe("generateTargets", () => {
  it("produces one target per profile targetCount with sequential order indices", () => {
    const profile = FOCUSED_GATHER_PROFILES.easy;
    const targets = generateTargets(profile, { x: 100, y: 100 }, seededRng([0.5, 0.25, 0.75]));
    expect(targets).toHaveLength(profile.targetCount);
    targets.forEach((t, i) => expect(t.orderIndex).toBe(i));
  });

  it("spawns targets in non-decreasing time order", () => {
    const profile = FOCUSED_GATHER_PROFILES.hard;
    const targets = generateTargets(profile, { x: 0, y: 0 }, seededRng([0.1, 0.9, 0.4, 0.6]));
    for (let i = 1; i < targets.length; i++) {
      expect(targets[i].spawnAtMs).toBeGreaterThanOrEqual(targets[i - 1].spawnAtMs);
    }
  });

  it("expires each target exactly one lifetime after its spawn", () => {
    const profile = FOCUSED_GATHER_PROFILES.medium;
    const targets = generateTargets(profile, { x: 0, y: 0 }, seededRng([0.3]));
    for (const t of targets) {
      expect(t.expiresAtMs - t.spawnAtMs).toBe(profile.targetLifetimeMs);
    }
  });

  it("keeps radii within the profile band and movement within its set", () => {
    const profile = FOCUSED_GATHER_PROFILES.expert;
    const targets = generateTargets(profile, { x: 0, y: 0 }, Math.random);
    for (const t of targets) {
      expect(t.radius).toBeGreaterThanOrEqual(profile.minCircleRadius);
      expect(t.radius).toBeLessThanOrEqual(profile.baseCircleRadius);
      expect(profile.movementTypes).toContain(t.movement);
    }
  });

  it("starts the first wave at time zero", () => {
    const targets = generateTargets(FOCUSED_GATHER_PROFILES.easy, { x: 0, y: 0 }, seededRng([0.5]));
    expect(targets[0].spawnAtMs).toBe(0);
  });

  it("generates targets that never overlap in space if they overlap in active lifetime", () => {
    const profiles = Object.values(FOCUSED_GATHER_PROFILES);
    for (const profile of profiles) {
      // Run multiple passes to get diverse random pattern and position combinations
      for (let pass = 0; pass < 20; pass++) {
        const targets = generateTargets(profile, { x: 100, y: 100 }, Math.random);
        for (let i = 0; i < targets.length; i++) {
          for (let j = i + 1; j < targets.length; j++) {
            const t1 = targets[i];
            const t2 = targets[j];
            const timeOverlaps = t2.spawnAtMs < t1.expiresAtMs && t2.expiresAtMs > t1.spawnAtMs;
            if (timeOverlaps) {
              const dist = Math.hypot(t1.position.x - t2.position.x, t1.position.y - t2.position.y);
              // Expected minimum distance: r1 + r2 + 10 px
              expect(dist).toBeGreaterThanOrEqual(t1.radius + t2.radius + 10);
            }
          }
        }
      }
    }
  });
});
