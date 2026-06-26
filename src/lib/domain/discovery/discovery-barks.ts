export type DiscoveryBarkId =
  | "first_pond"
  | "cold_firepit"
  | "first_howl"
  | "found_wreckage";

export interface DiscoveryBark {
  id: DiscoveryBarkId;
  text: string;
  tone: "warning" | "relief" | "unease";
}

export const DISCOVERY_BARKS: Record<DiscoveryBarkId, DiscoveryBark> = {
  first_pond: {
    id: "first_pond",
    text: "Water. Filthy, but water all the same.",
    tone: "relief",
  },
  cold_firepit: {
    id: "cold_firepit",
    text: "The firepit is cold. That needs to change before dark.",
    tone: "warning",
  },
  first_howl: {
    id: "first_howl",
    text: "A howl rolls through the trees. Too close to be weather.",
    tone: "unease",
  },
  found_wreckage: {
    id: "found_wreckage",
    text: "Broken wheels. Torn canvas. You did not arrive gently.",
    tone: "unease",
  },
};

export function getDiscoveryBark(id: DiscoveryBarkId): DiscoveryBark | undefined {
  return DISCOVERY_BARKS[id];
}
