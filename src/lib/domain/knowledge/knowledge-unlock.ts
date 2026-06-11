/**
 * Pure unlock rules: a gameplay event maps to the properties it teaches. The
 * orchestrator feeds these into `learn`. Keeping the rules here means "what does
 * getting sick teach you" is testable without touching game state.
 */
import type { KnowledgeProperty } from "./item-knowledge";
import type { ReactionKind } from "$lib/domain/systems/item-reactions";

/**
 * What consuming an item teaches. Eating/drinking always proves it is edible;
 * feeling the hydration proves its thirst value; getting harmed proves toxicity.
 */
export function propertiesFromConsume(opts: {
  harmed: boolean;
  restoredThirst: boolean;
}): KnowledgeProperty[] {
  const props: KnowledgeProperty[] = ["edible"];
  if (opts.restoredThirst) props.push("thirst_value");
  if (opts.harmed) props.push("toxicity");
  return props;
}

/** What witnessing a reaction teaches about the item that reacted. */
export function propertyFromReaction(kind: ReactionKind): KnowledgeProperty {
  switch (kind) {
    case "flammable":
      return "flammable";
    case "decay":
      return "perishable";
    case "temperature":
      return "heat_sensitive";
  }
}
