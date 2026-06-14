const ANIMAL_BASE = "/assets/animals";

export const NEW_ANIMAL_PATHS = {
  chicken: `${ANIMAL_BASE}/chicken.png`,
  crab: `${ANIMAL_BASE}/crab.png`,
  toad: `${ANIMAL_BASE}/toad.png`,
  pig: `${ANIMAL_BASE}/pig.png`,
  goose: `${ANIMAL_BASE}/goose.png`,
  frog: `${ANIMAL_BASE}/frog.png`,
  boar: `${ANIMAL_BASE}/boar.png`,
  cat: `${ANIMAL_BASE}/cat.png`,
  sheep: `${ANIMAL_BASE}/sheep.png`,
  turtle: `${ANIMAL_BASE}/turtle.png`,
  fox: `${ANIMAL_BASE}/fox.png`,
  porcupine: `${ANIMAL_BASE}/porcupine.png`,
  skunk: `${ANIMAL_BASE}/skunk.png`,
  wolf: `${ANIMAL_BASE}/wolf.png`,
  chick: `${ANIMAL_BASE}/chick.png`,
} as const;

export type BasicAnimalSpriteKey = keyof typeof NEW_ANIMAL_PATHS;

export const ANIMAL_SPRITE_SHEETS = {
  chicken: { path: NEW_ANIMAL_PATHS.chicken, frameSize: 16, columns: 4 },
  crab: { path: NEW_ANIMAL_PATHS.crab, frameSize: 16, columns: 4 },
  toad: { path: NEW_ANIMAL_PATHS.toad, frameSize: 16, columns: 4 },
  pig: { path: NEW_ANIMAL_PATHS.pig, frameSize: 16, columns: 4 },
  goose: { path: NEW_ANIMAL_PATHS.goose, frameSize: 16, columns: 4 },
  frog: { path: NEW_ANIMAL_PATHS.frog, frameSize: 16, columns: 4 },
  boar: { path: NEW_ANIMAL_PATHS.boar, frameSize: 16, columns: 4 },
  cat: { path: NEW_ANIMAL_PATHS.cat, frameSize: 16, columns: 4 },
  sheep: { path: NEW_ANIMAL_PATHS.sheep, frameSize: 16, columns: 4 },
  turtle: { path: NEW_ANIMAL_PATHS.turtle, frameSize: 16, columns: 4 },
  fox: { path: NEW_ANIMAL_PATHS.fox, frameSize: 16, columns: 4 },
  porcupine: { path: NEW_ANIMAL_PATHS.porcupine, frameSize: 16, columns: 4 },
  skunk: { path: NEW_ANIMAL_PATHS.skunk, frameSize: 16, columns: 4 },
  wolf: { path: NEW_ANIMAL_PATHS.wolf, frameSize: 16, columns: 4 },
  chick: { path: NEW_ANIMAL_PATHS.chick, frameSize: 16, columns: 4 },
} as const satisfies Record<
  BasicAnimalSpriteKey,
  { readonly path: string; readonly frameSize: 16; readonly columns: 4 }
>;

export const BUNDLE_NEW_ANIMALS: string[] = Object.values(NEW_ANIMAL_PATHS);

