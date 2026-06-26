export type CampDressingKind =
  | "firepit"
  | "wreckage"
  | "supply_scraps"
  | "trampled_path"
  | "ash_ring";

export interface RelativeCampDressingProp {
  id: string;
  kind: CampDressingKind;
  dx: number;
  dy: number;
  label: string;
}

export interface CampDressingProp {
  id: string;
  kind: CampDressingKind;
  x: number;
  y: number;
  label: string;
}

export const FIRST_CAMP_FLOOR_OFFSETS = new Set([
  "-2,-2", "-1,-2", "0,-2", "1,-2",
  "-2,-1", "-1,-1", "0,-1", "1,-1", "2,-1",
  "-2,0", "-1,0", "0,0", "1,0", "2,0",
  "-2,1", "-1,1", "0,1", "1,1",
  "-1,2", "0,2", "1,2",
]);

export function isFirstCampFloorOffset(dx: number, dy: number): boolean {
  return FIRST_CAMP_FLOOR_OFFSETS.has(`${dx},${dy}`);
}

export const FIRST_CAMP_DRESSING: readonly RelativeCampDressingProp[] = [
  { id: "cold_firepit", kind: "firepit", dx: 0, dy: -1, label: "cold firepit" },
  { id: "broken_wagon", kind: "wreckage", dx: -2, dy: 1, label: "broken wagon" },
  { id: "scattered_pack", kind: "supply_scraps", dx: 1, dy: 1, label: "scattered pack" },
  { id: "ash_ring_north", kind: "ash_ring", dx: 0, dy: -2, label: "old ash" },
  { id: "trampled_path_east", kind: "trampled_path", dx: 2, dy: 0, label: "trampled path" },
] as const;

export function materializeCampDressing(
  props: readonly RelativeCampDressingProp[],
  spawn: { x: number; y: number },
): CampDressingProp[] {
  return props.map((prop) => ({
    id: prop.id,
    kind: prop.kind,
    x: spawn.x + prop.dx,
    y: spawn.y + prop.dy,
    label: prop.label,
  }));
}
