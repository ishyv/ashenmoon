/**
 * Item knowledge: what the player has *learned* about an item versus what
 * remains unknown. Knowledge is discovered through play (drinking something that
 * makes you sick teaches its toxicity), not handed over up front. These pure
 * helpers own the store shape, queries, and the inspect view-model.
 */
import type { ItemDefinition, ItemEffect } from "../items";

/** A discoverable fact about an item. */
export type KnowledgeProperty =
  | "edible"
  | "thirst_value"
  | "toxicity"
  | "flammable"
  | "perishable"
  | "heat_sensitive"
  | "boilable";

/** Item id -> the set of properties the player has learned about it. */
export type PlayerKnowledge = Readonly<Record<string, ReadonlySet<KnowledgeProperty>>>;

export const EMPTY_KNOWLEDGE: PlayerKnowledge = {};

const EMPTY_SET: ReadonlySet<KnowledgeProperty> = new Set();

/** Properties learned about a single item (empty set if none). */
export function knownProperties(
  knowledge: PlayerKnowledge,
  itemId: string,
): ReadonlySet<KnowledgeProperty> {
  return knowledge[itemId] ?? EMPTY_SET;
}

/** Whether a specific property has been learned. */
export function hasLearned(
  knowledge: PlayerKnowledge,
  itemId: string,
  property: KnowledgeProperty,
): boolean {
  return knownProperties(knowledge, itemId).has(property);
}

/** Learn one or more properties about an item. Pure: returns a new store. */
export function learn(
  knowledge: PlayerKnowledge,
  itemId: string,
  ...properties: KnowledgeProperty[]
): PlayerKnowledge {
  if (properties.length === 0) return knowledge;
  const current = knownProperties(knowledge, itemId);
  const next = new Set(current);
  for (const p of properties) next.add(p);
  if (next.size === current.size) return knowledge; // nothing new
  return { ...knowledge, [itemId]: next };
}

function effectIsHarmful(effect: ItemEffect): boolean {
  switch (effect.kind) {
    case "damage_holder":
    case "add_status":
      return true;
    case "chance":
      return effectIsHarmful(effect.effect);
    default:
      return false;
  }
}

function effectRestoresThirst(effect: ItemEffect): boolean {
  if (effect.kind === "restore_thirst") return true;
  if (effect.kind === "chance") return effectRestoresThirst(effect.effect);
  return false;
}

/**
 * Every property an item *could* teach, derived from its traits. The inspect
 * panel partitions these into known vs unknown.
 */
export function discoverableProperties(def: ItemDefinition): KnowledgeProperty[] {
  const props = new Set<KnowledgeProperty>();
  for (const trait of def.traits) {
    switch (trait.kind) {
      case "consumable":
        props.add("edible");
        if (trait.onConsume.some(effectRestoresThirst)) props.add("thirst_value");
        if (trait.onConsume.some(effectIsHarmful)) props.add("toxicity");
        break;
      case "flammable":
        props.add("flammable");
        break;
      case "decayable":
        props.add("perishable");
        break;
      case "temperature_sensitive":
        props.add("heat_sensitive");
        break;
      case "boilable":
        props.add("boilable");
        break;
    }
  }
  return [...props];
}

export interface InspectView {
  readonly itemId: string;
  readonly name: string;
  readonly known: KnowledgeProperty[];
  readonly unknown: KnowledgeProperty[];
}

/** View-model for an inspect panel: which discoverable facts are known vs not. */
export function inspectItem(def: ItemDefinition, knowledge: PlayerKnowledge): InspectView {
  const all = discoverableProperties(def);
  const learned = knownProperties(knowledge, def.id);
  return {
    itemId: def.id,
    name: def.name,
    known: all.filter((p) => learned.has(p)),
    unknown: all.filter((p) => !learned.has(p)),
  };
}

/** Serialize to the snapshot shape (arrays) for persistence. */
export function serializeKnowledge(knowledge: PlayerKnowledge): Record<string, KnowledgeProperty[]> {
  const out: Record<string, KnowledgeProperty[]> = {};
  for (const [itemId, set] of Object.entries(knowledge)) {
    out[itemId] = [...set];
  }
  return out;
}

/** Rehydrate from the persisted snapshot shape. */
export function deserializeKnowledge(
  snapshot: Readonly<Record<string, readonly string[]>>,
): PlayerKnowledge {
  const out: Record<string, ReadonlySet<KnowledgeProperty>> = {};
  for (const [itemId, props] of Object.entries(snapshot ?? {})) {
    out[itemId] = new Set(props as KnowledgeProperty[]);
  }
  return out;
}
