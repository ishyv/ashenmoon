export type ActionFeedbackId =
  | "campfire_wake"
  | "water_cleanse"
  | "drink_clean_water"
  | "gather_starter_material";

export interface ActionFeedback {
  id: ActionFeedbackId;
  toast: string;
  floatingText: string;
  particles: "smoke" | "bubble" | "sizzle";
  sound: string;
  color: number;
}

export const ACTION_FEEDBACK: Record<ActionFeedbackId, ActionFeedback> = {
  campfire_wake: {
    id: "campfire_wake",
    toast: "The fire catches. The clearing feels less dead.",
    floatingText: "fire wakes",
    particles: "smoke",
    sound: "campfire.light",
    color: 0xffa24a,
  },
  water_cleanse: {
    id: "water_cleanse",
    toast: "The boil drives the filth out. Clean enough to trust.",
    floatingText: "water cleansed",
    particles: "bubble",
    sound: "water.boil",
    color: 0x77bbff,
  },
  drink_clean_water: {
    id: "drink_clean_water",
    toast: "Cold water cuts through the ash in your throat.",
    floatingText: "thirst eased",
    particles: "bubble",
    sound: "drink.water",
    color: 0x8bd3ff,
  },
  gather_starter_material: {
    id: "gather_starter_material",
    toast: "Useful scraps. Not much, but enough to begin.",
    floatingText: "salvaged",
    particles: "smoke",
    sound: "item.pickup",
    color: 0xd2b06f,
  },
};

export function getActionFeedback(id: ActionFeedbackId): ActionFeedback | undefined {
  return ACTION_FEEDBACK[id];
}
