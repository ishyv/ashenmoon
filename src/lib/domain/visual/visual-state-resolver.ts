import type {
  VisualDefinition,
  ResolvedVisualState,
  VfxId,
  VisualSoundId,
  VisualLightSpec,
  VisualStateDefinition,
} from "./visual-definitions.js";

export function resolveVisualState<I>(
  def: VisualDefinition<I>,
  input: I,
): ResolvedVisualState {
  // Step 1: Base state selection — highest priority matching base rule
  let bestPriority = -Infinity;
  let selectedStateId = def.fallbackState;

  for (const rule of def.rules) {
    if (rule.kind === "base" && rule.when(input) && rule.priority > bestPriority) {
      bestPriority = rule.priority;
      selectedStateId = rule.state;
    }
  }

  // State id is guaranteed to exist in def.states by the VisualDefinition contract
  const baseStateDef = def.states[selectedStateId] as VisualStateDefinition;

  // Step 2: Seed result from base state
  const particles: VfxId[] = [...(baseStateDef.particles ?? [])];
  const soundLoops: VisualSoundId[] = [...(baseStateDef.soundLoops ?? [])];
  let tint: number | undefined = baseStateDef.tint;
  let alpha = baseStateDef.alpha ?? 1;
  let scale = baseStateDef.scale ?? 1;
  let light: VisualLightSpec | null = baseStateDef.light ?? null;

  // Step 3: Overlay merge — sorted ascending by priority (low→high)
  const matchingOverlays = def.rules
    .filter((rule) => rule.kind === "overlay" && rule.when(input))
    .sort((a, b) => a.priority - b.priority);

  for (const overlayRule of matchingOverlays) {
    const overlay = def.states[overlayRule.state] as VisualStateDefinition;

    // particles: union (append overlay's particles, dedup by Set)
    if (overlay.particles) {
      for (const p of overlay.particles) {
        if (!particles.includes(p)) {
          particles.push(p);
        }
      }
    }

    // soundLoops: union (append overlay's soundLoops, dedup by Set)
    if (overlay.soundLoops) {
      for (const s of overlay.soundLoops) {
        if (!soundLoops.includes(s)) {
          soundLoops.push(s);
        }
      }
    }

    if (overlay.tint !== undefined) tint = overlay.tint;
    if (overlay.alpha !== undefined) alpha = overlay.alpha;
    if (overlay.light !== undefined) light = overlay.light;
    if (overlay.scale !== undefined) scale *= overlay.scale;
  }

  // Step 4: De-duplicate soundLoops (preserve order, remove later dupes)
  const seen = new Set<string>();
  const dedupedSoundLoops = soundLoops.filter((s) => {
    if (seen.has(s)) return false;
    seen.add(s);
    return true;
  });

  return {
    baseState: selectedStateId,
    ...(baseStateDef.baseSprite !== undefined && { baseSprite: baseStateDef.baseSprite }),
    ...(tint !== undefined && { tint }),
    alpha,
    scale,
    light,
    particles,
    soundLoops: dedupedSoundLoops,
    enterOneShots: [...(baseStateDef.enterOneShots ?? [])],
    enterSfx: [...(baseStateDef.enterSfx ?? [])],
  };
}

export function diffLoopSets(
  previous: ReadonlySet<string>,
  next: ReadonlySet<string>,
): { toStart: string[]; toStop: string[] } {
  return {
    toStart: [...next].filter((s) => !previous.has(s)),
    toStop: [...previous].filter((s) => !next.has(s)),
  };
}
