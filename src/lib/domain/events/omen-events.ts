export interface OmenTriggerState {
  cleanWaterDrunk: boolean;
  campfireWoken: boolean;
  alreadyTriggered: boolean;
}

export interface OmenEvent {
  id: "wolf_howl";
  text: string;
  sound: string;
  cameraShake: "none" | "subtle";
}

export const FIRST_NIGHT_OMENS = {
  wolf_howl: {
    id: "wolf_howl",
    text: "A howl threads through the dark trees. Something has noticed the fire.",
    sound: "wolf.howl.distant",
    cameraShake: "subtle",
  },
} as const satisfies Record<string, OmenEvent>;

export function shouldTriggerOmen(state: OmenTriggerState): boolean {
  return state.cleanWaterDrunk && state.campfireWoken && !state.alreadyTriggered;
}
