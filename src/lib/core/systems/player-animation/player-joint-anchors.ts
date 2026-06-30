// player-joint-anchors.ts

export interface JointAnchors {
  readonly head: { x: number; y: number };
  readonly handRight: { x: number; y: number };
  readonly handLeft: { x: number; y: number };
}

export const PLAYER_JOINT_ANCHORS: Record<string, JointAnchors> = {
  // Idle
  "player-idle.svg": {
    head: { x: 80, y: 48 },
    handRight: { x: 120, y: 150 },
    handLeft: { x: 40, y: 150 },
  },

  // Walk
  "player-walk-1.svg": {
    head: { x: 80, y: 50 },
    handRight: { x: 115, y: 148 },
    handLeft: { x: 35, y: 148 },
  },
  "player-walk-2.svg": {
    head: { x: 80, y: 48 },
    handRight: { x: 120, y: 150 },
    handLeft: { x: 40, y: 150 },
  },
  "player-walk-3.svg": {
    head: { x: 80, y: 50 },
    handRight: { x: 87, y: 148 },
    handLeft: { x: 52, y: 148 },
  },

  // Run
  "player-run-1.svg": {
    head: { x: 90, y: 50 },
    handRight: { x: 142, y: 145 },
    handLeft: { x: 42, y: 145 },
  },
  "player-run-2.svg": {
    head: { x: 90, y: 43 },
    handRight: { x: 125, y: 141 },
    handLeft: { x: 45, y: 143 },
  },
  "player-run-3.svg": {
    head: { x: 90, y: 52 },
    handRight: { x: 94, y: 147 },
    handLeft: { x: 90, y: 147 },
  },

  // Exhausted Walk
  "player-exhausted-walk-1.svg": {
    head: { x: 86, y: 55 },
    handRight: { x: 116, y: 160 },
    handLeft: { x: 53, y: 160 },
  },
  "player-exhausted-walk-2.svg": {
    head: { x: 86, y: 53 },
    handRight: { x: 116, y: 158 },
    handLeft: { x: 53, y: 158 },
  },

  // Injured Walk
  "player-injured-walk-1.svg": {
    head: { x: 72, y: 50 },
    handRight: { x: 95, y: 142 },
    handLeft: { x: 18, y: 142 },
  },
  "player-injured-walk-2.svg": {
    head: { x: 72, y: 48 },
    handRight: { x: 96, y: 138 },
    handLeft: { x: 25, y: 140 },
  },

  // Encumbered Walk
  "player-encumbered-walk-1.svg": {
    head: { x: 80, y: 52 },
    handRight: { x: 122, y: 145 },
    handLeft: { x: 38, y: 145 },
  },
  "player-encumbered-walk-2.svg": {
    head: { x: 80, y: 50 },
    handRight: { x: 120, y: 143 },
    handLeft: { x: 40, y: 143 },
  },

  // Strained Run
  "player-strained-run-1.svg": {
    head: { x: 94, y: 50 },
    handRight: { x: 122, y: 140 },
    handLeft: { x: 52, y: 142 },
  },
  "player-strained-run-2.svg": {
    head: { x: 94, y: 43 },
    handRight: { x: 120, y: 133 },
    handLeft: { x: 52, y: 135 },
  },

  // Wet Walk
  "player-wet-walk-1.svg": {
    head: { x: 80, y: 50 },
    handRight: { x: 110, y: 148 },
    handLeft: { x: 40, y: 148 },
  },
  "player-wet-walk-2.svg": {
    head: { x: 80, y: 48 },
    handRight: { x: 110, y: 148 },
    handLeft: { x: 45, y: 148 },
  },

  // Gathering: Bush/Plants
  "player-gather-bush-hands-1.svg": {
    head: { x: 90, y: 56 },
    handRight: { x: 134, y: 144 },
    handLeft: { x: 42, y: 144 },
  },
  "player-gather-bush-hands-2.svg": {
    head: { x: 76, y: 46 },
    handRight: { x: 112, y: 128 },
    handLeft: { x: 44, y: 128 },
  },

  // Gathering: Tree Hands
  "player-gather-tree-hands-1.svg": {
    head: { x: 92, y: 48 },
    handRight: { x: 142, y: 122 },
    handLeft: { x: 58, y: 142 },
  },
  "player-gather-tree-hands-2.svg": {
    head: { x: 74, y: 48 },
    handRight: { x: 96, y: 142 },
    handLeft: { x: 30, y: 142 },
  },

  // Gathering: Axe
  "player-gather-axe-1.svg": {
    head: { x: 78, y: 48 },
    handRight: { x: 120, y: 84 },
    handLeft: { x: 70, y: 110 },
  },
  "player-gather-axe-2.svg": {
    head: { x: 92, y: 50 },
    handRight: { x: 132, y: 134 },
    handLeft: { x: 72, y: 134 },
  },

  // Gathering: Pickaxe
  "player-gather-pickaxe-1.svg": {
    head: { x: 80, y: 48 },
    handRight: { x: 110, y: 62 },
    handLeft: { x: 50, y: 62 },
  },
  "player-gather-pickaxe-2.svg": {
    head: { x: 92, y: 50 },
    handRight: { x: 128, y: 140 },
    handLeft: { x: 66, y: 140 },
  },

  // Gathering: Scavenge
  "player-gather-scavenge-1.svg": {
    head: { x: 80, y: 65 },
    handRight: { x: 122, y: 162 },
    handLeft: { x: 38, y: 162 },
  },
  "player-gather-scavenge-2.svg": {
    head: { x: 80, y: 60 },
    handRight: { x: 120, y: 126 },
    handLeft: { x: 44, y: 163 },
  },

  // Spear Combat
  "player-combat-spear-idle.svg": {
    head: { x: 80, y: 48 },
    handRight: { x: 120, y: 142 },
    handLeft: { x: 72, y: 138 },
  },
  "player-combat-spear-thrust-1.svg": {
    head: { x: 72, y: 50 },
    handRight: { x: 95, y: 140 },
    handLeft: { x: 60, y: 138 },
  },
  "player-combat-spear-thrust-2.svg": {
    head: { x: 94, y: 50 },
    handRight: { x: 148, y: 138 },
    handLeft: { x: 110, y: 138 },
  },
};

export const DEFAULT_PLAYER_JOINT_ANCHOR: JointAnchors = {
  head: { x: 80, y: 48 },
  handRight: { x: 120, y: 150 },
  handLeft: { x: 40, y: 150 },
};

export function getPlayerJointAnchors(filename: string | undefined): JointAnchors {
  if (!filename) return DEFAULT_PLAYER_JOINT_ANCHOR;
  const cleanName = filename.split("/").pop() ?? "";
  return PLAYER_JOINT_ANCHORS[cleanName] ?? DEFAULT_PLAYER_JOINT_ANCHOR;
}
