import type { DialogueScript, DialogueNode } from "./dialogue-types";

const NODES = {
  intro: {
    id: "intro",
    text: "scout... the wagon is gone and the woods are not feeling generous. find a stick, a flint shard, and grass fiber. i will show you the flint axe recipe.",
    choices: [
      {
        text: "Accept Quest: Scavenger's Tools",
        action: {
          type: "accept_quest",
          questId: "scavenger_tools",
          learnRecipeId: "flint_axe",
          nextQuestId: "scavenger_tools",
        },
      },
      { text: "Leave", action: { type: "close" } },
    ],
  },
  scavenger_tools_waiting: {
    id: "scavenger_tools_waiting",
    text: "still missing pieces? you need one stick, one flint shard, and one grass fiber. open the stash, craft the flint axe, then equip it.",
    choices: [{ text: "Leave", action: { type: "close" } }],
  },
  scavenger_tools_ready: {
    id: "scavenger_tools_ready",
    text: "Incredible work! That Flint Axe will serve us well. Here, take this Copper Ingot from our salvaged stash. We must secure our camp next. We need to gather real timber from the oak trees and keep this fire burning bright.",
    choices: [
      {
        text: "✓ Claim Reward (1x Copper Ingot)",
        action: {
          type: "claim_reward",
          questId: "scavenger_tools",
          talkObjectiveId: "talk_vane",
          rewardItemId: "copper_ingot",
          rewardQty: 1,
          nextQuestId: "securing_perimeter",
        },
      },
    ],
  },
  securing_perimeter_waiting: {
    id: "securing_perimeter_waiting",
    text: "Our fire is dying, and the shadow of the blight grows cold. Equip your Flint Axe, harvest an Oak Tree for thick wood logs, and refuel the campfire (requires 5x Oak Wood). Report back once the camp is secured.",
    choices: [{ text: "Leave", action: { type: "close" } }],
  },
  securing_perimeter_ready: {
    id: "securing_perimeter_ready",
    text: "The campfire burns hot and bright, scout. You have proven yourself a true survivor of Ashenmoor. Next, we must establish our perimeter. Craft three Stone Blocks from raw Stone in the Crafting menu, and place three Stone Walls (shacks) around the camp. Here is an Iron Ingot for your efforts.",
    choices: [
      {
        text: "✓ Claim Reward (1x Iron Ingot)",
        action: {
          type: "claim_reward",
          questId: "securing_perimeter",
          talkObjectiveId: "talk_vane_2",
          rewardItemId: "iron_ingot",
          rewardQty: 1,
          nextQuestId: "outpost_foundations",
        },
      },
    ],
  },
  outpost_foundations_waiting: {
    id: "outpost_foundations_waiting",
    text: "We need a perimeter, scout. Open your Crafting tab, refine raw Stone into three Stone Blocks, and then use the Build tab to place three Stone Walls around our camp.",
    choices: [{ text: "Leave", action: { type: "close" } }],
  },
  outpost_foundations_ready: {
    id: "outpost_foundations_ready",
    text: "Excellent blockades, scout! These walls will hold back the blighted shadow. I've salvaged a Copper Axe from the ruins for you—this will make cutting down trees far easier. Next, we need real shelter and warmth.",
    choices: [
      {
        text: "✓ Claim Reward (1x Copper Axe)",
        action: {
          type: "claim_reward",
          questId: "outpost_foundations",
          talkObjectiveId: "talk_vane_3",
          rewardItemId: "copper_axe",
          rewardQty: 1,
          nextQuestId: "outpost_sanctuary",
        },
      },
    ],
  },
  outpost_sanctuary_waiting: {
    id: "outpost_sanctuary_waiting",
    text: "We need a warm sanctuary and a watchtower. Use refined planks and blocks to build an Outpost House and a Defense Tower. Remember, to smelt copper, iron, or silver ingots, you must stand near the Campfire's heat!",
    choices: [{ text: "Leave", action: { type: "close" } }],
  },
  outpost_sanctuary_ready: {
    id: "outpost_sanctuary_ready",
    text: "Incredible! The camp is now a true sanctuary, scout. With this shelter and light, we have carved a permanent outpost in the Ashenmoor blighted lands. Take this Copper Pickaxe. You've earned it. Rest well, we have survived.",
    choices: [
      {
        text: "✓ Claim Reward (1x Copper Pickaxe)",
        action: {
          type: "claim_reward",
          questId: "outpost_sanctuary",
          talkObjectiveId: "talk_vane_4",
          rewardItemId: "copper_pickaxe",
          rewardQty: 1,
          nextQuestId: "completed_all",
        },
      },
    ],
  },
  completed_all: {
    id: "completed_all",
    text: "Rest well, scout. Ashenmoor is a harsh country, but together, we have built a sanctuary.",
    choices: [{ text: "Leave", action: { type: "close" } }],
  },
} satisfies Record<string, DialogueNode>;

export const vaneDialogueScript: DialogueScript = {
  npcId: "npc_vane",
  getActiveNode(context) {
    const qId = context.currentQuestId;
    if (!qId) {
      return NODES.intro;
    }

    if (qId === "scavenger_tools") {
      return context.canClaimReward("scavenger_tools", "talk_vane")
        ? NODES.scavenger_tools_ready
        : NODES.scavenger_tools_waiting;
    }

    if (qId === "securing_perimeter") {
      return context.canClaimReward("securing_perimeter", "talk_vane_2")
        ? NODES.securing_perimeter_ready
        : NODES.securing_perimeter_waiting;
    }

    if (qId === "outpost_foundations") {
      return context.canClaimReward("outpost_foundations", "talk_vane_3")
        ? NODES.outpost_foundations_ready
        : NODES.outpost_foundations_waiting;
    }

    if (qId === "outpost_sanctuary") {
      return context.canClaimReward("outpost_sanctuary", "talk_vane_4")
        ? NODES.outpost_sanctuary_ready
        : NODES.outpost_sanctuary_waiting;
    }

    return NODES.completed_all;
  },
};
