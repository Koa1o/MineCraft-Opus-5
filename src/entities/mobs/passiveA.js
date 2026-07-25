// ---------------------------------------------------------------------------
// Passive mob definitions — group A
// All top-level names prefixed MOBDEF_PA_ for concatenation safety.
// ---------------------------------------------------------------------------

export const MOB_DEFS_PASSIVEA = [

  // ---- PIG -----------------------------------------------------------------
  {
    id: 'pig',
    category: 'passive',
    model: 'pig',
    skin: 'pig',
    variants: 1,
    health: 10, armor: 0,
    width: 0.9, height: 0.9,
    speed: 0.25,
    attack: null,
    followRange: 16, xp: [1, 3],
    drops: [
      { item: 'porkchop', min: 1, max: 3, cookedItem: 'cooked_porkchop' },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: ['plains', 'forest', 'savanna', 'mushroom_island'],
      light: 'day', where: 'surface',
      weight: 10, group: [2, 4], maxPerChunk: 4, cap: 'passive',
    },
    ai: ['wander', 'lookAround', 'panic', 'followPlayerHolding:carrot', 'breed:carrot', 'growUp', 'followParent'],
    sounds: { idle: 'pigIdle', hurt: 'pigHurt', death: 'pigDeath', step: 'stepSoft' },
    tameable: null,
    rideable: true, breedItem: 'carrot', babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: null,
  },

  // ---- COW -----------------------------------------------------------------
  {
    id: 'cow',
    category: 'passive',
    model: 'cow',
    skin: 'cow',
    variants: 1,
    health: 10, armor: 0,
    width: 0.9, height: 1.4,
    speed: 0.2,
    attack: null,
    followRange: 16, xp: [1, 3],
    drops: [
      { item: 'beef', min: 1, max: 3, cookedItem: 'cooked_beef' },
      { item: 'leather', min: 0, max: 2 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: ['plains', 'forest', 'savanna', 'mushroom_island'],
      light: 'day', where: 'surface',
      weight: 8, group: [2, 4], maxPerChunk: 4, cap: 'passive',
    },
    ai: ['wander', 'lookAround', 'panic', 'followPlayerHolding:wheat', 'breed:wheat', 'growUp', 'followParent', 'eatGrass'],
    sounds: { idle: 'cowIdle', hurt: 'cowHurt', death: 'cowDeath', step: 'stepSoft' },
    tameable: null,
    rideable: false, breedItem: 'wheat', babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: null,
  },

  // ---- MOOSHROOM -----------------------------------------------------------
  {
    id: 'mooshroom',
    category: 'passive',
    model: 'mooshroom',
    skin: 'mooshroom',
    variants: 1,
    health: 10, armor: 0,
    width: 0.9, height: 1.4,
    speed: 0.2,
    attack: null,
    followRange: 16, xp: [1, 3],
    drops: [
      { item: 'beef', min: 1, max: 3, cookedItem: 'cooked_beef' },
      { item: 'leather', min: 0, max: 2 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: ['mushroom_island'],
      light: 'day', where: 'surface',
      weight: 12, group: [2, 4], maxPerChunk: 4, cap: 'passive',
    },
    ai: ['wander', 'lookAround', 'panic', 'followPlayerHolding:wheat', 'breed:wheat', 'growUp', 'followParent', 'eatGrass'],
    sounds: { idle: 'cowIdle', hurt: 'cowHurt', death: 'cowDeath', step: 'stepSoft' },
    tameable: null,
    rideable: false, breedItem: 'wheat', babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: null,
  },

  // ---- SHEEP ---------------------------------------------------------------
  {
    id: 'sheep',
    category: 'passive',
    model: 'sheep',
    skin: 'sheep',
    variants: 16, // wool colours 0-15
    health: 10, armor: 0,
    width: 0.9, height: 1.3,
    speed: 0.23,
    attack: null,
    followRange: 16, xp: [1, 3],
    // dropFn 'sheepWool' => runtime yields <variant_colour>_wool (0-1 item) + mutton
    drops: [
      { item: 'mutton', min: 1, max: 2, cookedItem: 'cooked_mutton' },
    ],
    dropFn: 'sheepWool', // runtime resolves wool colour from variant
    spawn: {
      dimension: 'overworld',
      biomes: ['plains', 'forest', 'savanna', 'mountains'],
      light: 'day', where: 'surface',
      weight: 8, group: [2, 4], maxPerChunk: 4, cap: 'passive',
    },
    ai: ['wander', 'lookAround', 'panic', 'followPlayerHolding:wheat', 'breed:wheat', 'growUp', 'followParent', 'eatGrass'],
    sounds: { idle: 'sheepIdle', hurt: 'sheepHurt', death: 'sheepDeath', step: 'stepSoft' },
    tameable: null,
    rideable: false, breedItem: 'wheat', babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: null,
  },

  // ---- CHICKEN -------------------------------------------------------------
  {
    id: 'chicken',
    category: 'passive',
    model: 'chicken',
    skin: 'chicken',
    variants: 1,
    health: 4, armor: 0,
    width: 0.4, height: 0.7,
    speed: 0.25,
    attack: null,
    followRange: 16, xp: [1, 3],
    drops: [
      { item: 'chicken', min: 1, max: 1, cookedItem: 'cooked_chicken' },
      { item: 'feather', min: 0, max: 2 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: ['plains', 'forest', 'jungle', 'savanna'],
      light: 'day', where: 'surface',
      weight: 6, group: [2, 4], maxPerChunk: 4, cap: 'passive',
    },
    ai: ['wander', 'lookAround', 'panic', 'followPlayerHolding:wheat_seeds', 'breed:wheat_seeds', 'growUp', 'followParent', 'layEgg'],
    sounds: { idle: 'chickenIdle', hurt: 'chickenHurt', death: 'chickenDeath', step: 'stepSoft' },
    tameable: null,
    rideable: false, breedItem: 'wheat_seeds', babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: null,
  },

  // ---- RABBIT --------------------------------------------------------------
  {
    id: 'rabbit',
    category: 'passive',
    model: 'rabbit',
    skin: 'rabbit',
    variants: 6,
    health: 4, armor: 0,
    width: 0.4, height: 0.5,
    speed: 0.3,
    attack: null,
    followRange: 16, xp: [1, 3],
    drops: [
      { item: 'rabbit', min: 0, max: 1, cookedItem: 'cooked_rabbit' },
      { item: 'rabbit_hide', min: 0, max: 1 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: ['plains', 'forest', 'desert', 'snowy_taiga', 'mountains'],
      light: 'day', where: 'surface',
      weight: 4, group: [2, 3], maxPerChunk: 4, cap: 'passive',
    },
    ai: ['wander', 'lookAround', 'panic', 'fleeFrom', 'followPlayerHolding:carrot', 'breed:carrot', 'growUp', 'followParent'],
    sounds: { idle: 'rabbitIdle', hurt: 'rabbitHurt', death: 'rabbitDeath', step: 'stepSoft' },
    tameable: null,
    rideable: false, breedItem: 'carrot', babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: null,
  },

  // ---- HORSE ---------------------------------------------------------------
  {
    id: 'horse',
    category: 'passive',
    model: 'horse',
    skin: 'horse',
    variants: 7,
    health: 22, armor: 0, // average of 15-30 range; base 22
    width: 1.4, height: 1.6,
    speed: 0.338,
    attack: null,
    followRange: 16, xp: [1, 5],
    drops: [
      { item: 'leather', min: 0, max: 2 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: ['plains', 'savanna'],
      light: 'day', where: 'surface',
      weight: 4, group: [2, 4], maxPerChunk: 4, cap: 'passive',
    },
    ai: ['wander', 'lookAround', 'panic', 'followPlayerHolding:golden_apple', 'breed:golden_carrot', 'growUp', 'followParent', 'custom:horse'],
    sounds: { idle: 'horseIdle', hurt: 'horseHurt', death: 'horseDeath', step: 'stepHard', jump: 'horseJump' },
    tameable: { item: null, chance: null }, // special mechanic: tamed by riding repeatedly
    rideable: true, breedItem: 'golden_carrot', babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: 'horse',
  },

  // ---- DONKEY --------------------------------------------------------------
  {
    id: 'donkey',
    category: 'passive',
    model: 'donkey',
    skin: 'donkey',
    variants: 1,
    health: 15, armor: 0,
    width: 1.4, height: 1.5,
    speed: 0.175,
    attack: null,
    followRange: 16, xp: [1, 5],
    drops: [
      { item: 'leather', min: 0, max: 2 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: ['plains', 'savanna'],
      light: 'day', where: 'surface',
      weight: 2, group: [1, 2], maxPerChunk: 2, cap: 'passive',
    },
    ai: ['wander', 'lookAround', 'panic', 'followPlayerHolding:golden_apple', 'breed:golden_carrot', 'growUp', 'followParent', 'custom:horse'],
    sounds: { idle: 'donkeyIdle', hurt: 'donkeyHurt', death: 'donkeyDeath', step: 'stepHard' },
    tameable: { item: null, chance: null }, // special mechanic
    rideable: true, breedItem: 'golden_carrot', babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: 'horse',
  },

  // ---- MULE ----------------------------------------------------------------
  {
    id: 'mule',
    category: 'passive',
    model: 'mule',
    skin: 'mule',
    variants: 1,
    health: 15, armor: 0,
    width: 1.4, height: 1.5,
    speed: 0.175,
    attack: null,
    followRange: 16, xp: [1, 5],
    drops: [
      { item: 'leather', min: 0, max: 2 },
    ],
    spawn: null, // never naturally spawns; bred from horse + donkey
    ai: ['wander', 'lookAround', 'panic', 'followPlayerHolding:golden_apple', 'custom:horse'],
    sounds: { idle: 'donkeyIdle', hurt: 'donkeyHurt', death: 'donkeyDeath', step: 'stepHard' },
    tameable: { item: null, chance: null },
    rideable: true, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: 'horse',
  },

  // ---- LLAMA ---------------------------------------------------------------
  {
    id: 'llama',
    category: 'passive',
    model: 'llama',
    skin: 'llama',
    variants: 4,
    health: 22, armor: 0,
    width: 0.9, height: 1.87,
    speed: 0.175,
    attack: { damage: 1, range: 1.2, cooldown: 20 }, // spitting
    followRange: 16, xp: [1, 3],
    drops: [
      { item: 'leather', min: 0, max: 2 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: ['mountains', 'savanna'],
      light: 'day', where: 'surface',
      weight: 3, group: [2, 4], maxPerChunk: 4, cap: 'passive',
    },
    ai: ['wander', 'lookAround', 'panic', 'followPlayerHolding:wheat', 'breed:wheat', 'growUp', 'followParent', 'custom:llama'],
    sounds: { idle: 'llamaIdle', hurt: 'llamaHurt', death: 'llamaDeath', step: 'stepHard' },
    tameable: { item: null, chance: null }, // special mechanic: tamed by riding
    rideable: true, breedItem: 'wheat', babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: 'llama',
  },
];
