export interface WolfCampThreatFactors {
  readonly isNight: boolean;
  readonly nearWolfZone: boolean;
  readonly nearWolfDen: boolean;
  readonly litFireStrength: number;
  readonly spikeBarrierCount: number;
  readonly freshCarcassCount: number;
  readonly exposedRawMeat: number;
  readonly exposedSpoiledMeat: number;
  readonly recentKillSites: number;
}

export type WolfCampThreatOutcome =
  | "none"
  | "howl"
  | "circle_camp"
  | "approach_exposed_meat"
  | "warning_silhouette";

export interface WolfCampThreatResult {
  readonly score: number;
  readonly outcome: WolfCampThreatOutcome;
  readonly reasons: readonly string[];
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function resolveWolfCampThreat(factors: WolfCampThreatFactors): WolfCampThreatResult {
  const reasons: string[] = [];
  let score = 0;

  if (factors.isNight) {
    score += 0.18;
    reasons.push("night");
  }
  if (factors.nearWolfZone) {
    score += 0.18;
    reasons.push("near wolf zone");
  }
  if (factors.nearWolfDen) {
    score += 0.25;
    reasons.push("near wolf den");
  }
  if (factors.freshCarcassCount > 0) {
    score += Math.min(0.22, factors.freshCarcassCount * 0.08);
    reasons.push("fresh carcass");
  }
  if (factors.exposedRawMeat > 0) {
    score += Math.min(0.28, factors.exposedRawMeat * 0.07);
    reasons.push("exposed raw meat");
  }
  if (factors.exposedSpoiledMeat > 0) {
    score += Math.min(0.16, factors.exposedSpoiledMeat * 0.04);
    reasons.push("spoiled meat scent");
  }
  if (factors.recentKillSites > 0) {
    score += Math.min(0.18, factors.recentKillSites * 0.06);
    reasons.push("recent kill site");
  }

  const fireMitigation = clamp01(factors.litFireStrength) * 0.24;
  const barrierMitigation = Math.min(0.2, Math.max(0, factors.spikeBarrierCount) * 0.05);
  if (fireMitigation > 0) reasons.push("lit fire");
  if (barrierMitigation > 0) reasons.push("spike barriers");
  score = clamp01(score - fireMitigation - barrierMitigation);

  let outcome: WolfCampThreatOutcome = "none";
  if (score >= 0.62 && factors.exposedRawMeat > 0) outcome = "approach_exposed_meat";
  else if (score >= 0.52) outcome = "warning_silhouette";
  else if (score >= 0.36) outcome = "circle_camp";
  else if (score >= 0.18) outcome = "howl";

  return { score, outcome, reasons };
}
