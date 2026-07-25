// ---------------------------------------------------------------------------
// Aquatic mob definitions
// All top-level names prefixed MOBDEF_AQ_ for concatenation safety.
// ---------------------------------------------------------------------------

export const MOB_DEFS_AQUATIC = [

  // ---- COD -----------------------------------------------------------------
  {
    id: 'cod',
    category: 'passive',
    model: 'cod',
    skin: 'cod',
    variants: 1,
    health: 3, armor: 0,
    width: 0.5, height: 0.3,
    speed: 0.5,
    attack: null,
    followRange: 8, xp: [1, 3],
    drops: [
      { item: 'cod', min: 1, max: 1, cookedItem: 'cooked_cod' },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: ['ocean', 'beach'],
      light: 'any', where: 'water',
      weight: 8, group: [3, 6], maxPerChunk: 8, cap: 'water',
    },
    ai: ['swim', 'fishSchool', 'panic'],
    sounds: { idle: 'fishIdle', hurt: 'fishHurt', death: 'fishDeath', step: 'stepSoft' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: true, flying: false, avoidsSun: false,
    special: null,
  },

  // ---- SALMON --------------------------------------------------------------
  {
    id: 'salmon',
    category: 'passive',
    model: 'salmon',
    skin: 'salmon',
    variants: 1,
    health: 3, armor: 0,
    width: 0.7, height: 0.4,
    speed: 0.5,
    attack: null,
    followRange: 8, xp: [1, 3],
    drops: [
      { item: 'salmon', min: 1, max: 1, cookedItem: 'cooked_salmon' },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: ['ocean', 'beach'],
      light: 'any', where: 'water',
      weight: 6, group: [3, 5], maxPerChunk: 6, cap: 'water',
    },
    ai: ['swim', 'fishSchool', 'panic'],
    sounds: { idle: 'fishIdle', hurt: 'fishHurt', death: 'fishDeath', step: 'stepSoft' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: true, flying: false, avoidsSun: false,
    special: null,
  },

  // ---- TROPICAL_FISH -------------------------------------------------------
  {
    id: 'tropical_fish',
    category: 'passive',
    model: 'tropical_fish',
    skin: 'tropical_fish',
    variants: 22,
    health: 3, armor: 0,
    width: 0.5, height: 0.4,
    speed: 0.5,
    attack: null,
    followRange: 8, xp: [1, 2],
    drops: [
      { item: 'tropical_fish', min: 1, max: 1 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: ['ocean'],
      light: 'any', where: 'water',
      weight: 4, group: [3, 5], maxPerChunk: 6, cap: 'water',
    },
    ai: ['swim', 'fishSchool', 'panic'],
    sounds: { idle: 'fishIdle', hurt: 'fishHurt', death: 'fishDeath', step: 'stepSoft' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: true, flying: false, avoidsSun: false,
    special: null,
  },

  // ---- PUFFERFISH ----------------------------------------------------------
  {
    id: 'pufferfish',
    category: 'neutral',
    model: 'pufferfish',
    skin: 'pufferfish',
    variants: 1,
    health: 3, armor: 0,
    width: 0.7, height: 0.7,
    speed: 0.5,
    attack: { damage: 3, range: 0.8, cooldown: 20 }, // poison damage on contact when inflated
    followRange: 8, xp: [1, 3],
    drops: [
      { item: 'pufferfish', min: 1, max: 1 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: ['ocean'],
      light: 'any', where: 'water',
      weight: 3, group: [1, 3], maxPerChunk: 4, cap: 'water',
    },
    ai: ['swim', 'panic', 'inflate'],
    sounds: { idle: 'fishIdle', hurt: 'fishHurt', death: 'fishDeath', step: 'stepSoft' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: true, flying: false, avoidsSun: false,
    special: 'pufferfish',
  },

  // ---- SQUID ---------------------------------------------------------------
  {
    id: 'squid',
    category: 'passive',
    model: 'squid',
    skin: 'squid',
    variants: 1,
    health: 10, armor: 0,
    width: 0.8, height: 0.8,
    speed: 0.2,
    attack: null,
    followRange: 8, xp: [1, 3],
    drops: [
      { item: 'ink_sac', min: 1, max: 3 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: ['ocean', 'swamp'],
      light: 'any', where: 'water',
      weight: 6, group: [2, 4], maxPerChunk: 6, cap: 'water',
    },
    ai: ['swim', 'panic'],
    sounds: { idle: 'squidIdle', hurt: 'squidHurt', death: 'squidDeath', step: 'stepSoft' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: true, flying: false, avoidsSun: false,
    special: null,
  },

  // ---- GLOW_SQUID ----------------------------------------------------------
  {
    id: 'glow_squid',
    category: 'passive',
    model: 'glow_squid',
    skin: 'glow_squid',
    variants: 1,
    health: 10, armor: 0,
    width: 0.8, height: 0.8,
    speed: 0.2,
    attack: null,
    followRange: 8, xp: [1, 3],
    drops: [
      { item: 'glow_ink_sac', min: 1, max: 3 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: ['ocean'],
      light: 'any', where: 'water',
      weight: 4, group: [2, 4], maxPerChunk: 4, cap: 'water',
    },
    ai: ['swim', 'panic'],
    sounds: { idle: 'glowSquidIdle', hurt: 'glowSquidHurt', death: 'glowSquidDeath', step: 'stepSoft' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: true, flying: false, avoidsSun: false,
    special: null,
  },

  // ---- AXOLOTL -------------------------------------------------------------
  {
    id: 'axolotl',
    category: 'neutral',
    model: 'axolotl',
    skin: 'axolotl',
    variants: 5,
    health: 14, armor: 0,
    width: 0.75, height: 0.42,
    speed: 0.2,
    attack: { damage: 2, range: 1.2, cooldown: 20 },
    followRange: 16, xp: [1, 3],
    drops: [],
    spawn: {
      dimension: 'overworld',
      biomes: ['swamp', 'ocean'],
      light: 'any', where: 'water',
      weight: 4, group: [1, 4], maxPerChunk: 4, cap: 'water',
    },
    ai: ['swim', 'panic', 'meleeAttack', 'breed:cod', 'growUp', 'followParent'],
    sounds: { idle: 'axolotlIdle', hurt: 'axolotlHurt', death: 'axolotlDeath', step: 'stepSoft' },
    tameable: { item: 'water_bucket', chance: null }, // can be scooped
    rideable: false, breedItem: 'cod', babyScale: 0.5,
    fireImmune: false, waterMob: true, flying: false, avoidsSun: false,
    special: 'axolotl',
  },

  // ---- FROG ----------------------------------------------------------------
  {
    id: 'frog',
    category: 'passive',
    model: 'frog',
    skin: 'frog',
    variants: 3, // temperate/cold/warm
    health: 10, armor: 0,
    width: 0.5, height: 0.55,
    speed: 0.3,
    attack: { damage: 1, range: 1.5, cooldown: 20 },
    followRange: 16, xp: [1, 3],
    drops: [],
    spawn: {
      dimension: 'overworld',
      biomes: ['swamp', 'plains', 'jungle'],
      light: 'day', where: 'surface',
      weight: 8, group: [2, 4], maxPerChunk: 4, cap: 'passive',
    },
    ai: ['wander', 'lookAround', 'swim', 'panic', 'breed:seagrass', 'growUp', 'followParent', 'tempt'],
    sounds: { idle: 'frogIdle', hurt: 'frogHurt', death: 'frogDeath', step: 'stepSoft', croak: 'frogCroak' },
    tameable: null,
    rideable: false, breedItem: 'seagrass', babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: null,
  },

  // ---- TADPOLE -------------------------------------------------------------
  {
    id: 'tadpole',
    category: 'passive',
    model: 'tadpole',
    skin: 'tadpole',
    variants: 1,
    health: 6, armor: 0,
    width: 0.4, height: 0.3,
    speed: 0.5,
    attack: null,
    followRange: 8, xp: [1, 2],
    drops: [],
    spawn: null, // hatched from frog eggs placed by breeding frogs; not naturally spawned
    ai: ['swim', 'panic', 'growUp'],
    sounds: { idle: 'fishIdle', hurt: 'fishHurt', death: 'fishDeath', step: 'stepSoft' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: true, flying: false, avoidsSun: false,
    special: null,
  },

  // ---- DOLPHIN -------------------------------------------------------------
  {
    id: 'dolphin',
    category: 'neutral',
    model: 'dolphin',
    skin: 'dolphin',
    variants: 1,
    health: 10, armor: 0,
    width: 0.9, height: 0.6,
    speed: 1.2,
    attack: { damage: 3, range: 1.5, cooldown: 20 },
    followRange: 16, xp: [1, 3],
    drops: [
      { item: 'cod', min: 0, max: 1, cookedItem: 'cooked_cod' },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: ['ocean'],
      light: 'any', where: 'water',
      weight: 4, group: [1, 3], maxPerChunk: 4, cap: 'water',
    },
    ai: ['swim', 'panic', 'meleeAttack', 'followPlayerHolding:cod', 'tempt'],
    sounds: { idle: 'dolphinIdle', hurt: 'dolphinHurt', death: 'dolphinDeath', step: 'stepSoft', chirp: 'dolphinChirp' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: true, flying: false, avoidsSun: false,
    special: 'dolphin',
  },
];
