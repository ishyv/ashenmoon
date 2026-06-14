export interface DialogueChoice {
  readonly text: string;
  readonly nextNodeId?: string;
  readonly action?: {
    readonly type: "accept_quest" | "claim_reward" | "close";
    readonly questId?: string;
    readonly talkObjectiveId?: string;
    readonly rewardItemId?: string;
    readonly rewardQty?: number;
    readonly learnRecipeId?: string;
    readonly nextQuestId?: string;
  };
}

export interface DialogueNode {
  readonly id: string;
  readonly text: string;
  readonly choices: readonly DialogueChoice[];
}

export interface DialogueContext {
  readonly currentQuestId: string | null;
  readonly canClaimReward: (questId: string, talkObjectiveId: string) => boolean;
}

export interface DialogueScript {
  readonly npcId: string;
  readonly getActiveNode: (context: DialogueContext) => DialogueNode;
}
