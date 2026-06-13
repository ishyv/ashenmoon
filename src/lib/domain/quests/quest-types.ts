export interface QuestObjective {
  id: string;
  label: string;
  current: number;
  target: number;
  completed: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  objectives: QuestObjective[];
  completed: boolean;
  rewardClaimed: boolean;
}
