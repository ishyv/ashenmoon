import type { SoundId } from "../../../audio/sound-manifest.js";
import type { VisualSoundId } from "../../../domain/visual/visual-definitions.js";

export const VISUAL_SOUND: Record<VisualSoundId, SoundId> = {
  "campfire.ignite":     "campfire.ignite",
  "campfire.loop":       "campfire.loop",
  "campfire.low":        "campfire.low",
  "campfire.extinguish": "campfire.extinguish",
  "craft.cook.sizzle":   "craft.cook.sizzle",
};
