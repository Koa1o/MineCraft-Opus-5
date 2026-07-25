// ---------------------------------------------------------------------------
// Neutral mob definitions
// All top-level names prefixed MOBDEF_NT_ for concatenation safety.
// ---------------------------------------------------------------------------

export const MOB_DEFS_NEUTRAL = [

  // ---- IRON_GOLEM ----------------------------------------------------------
  {
    id: 'iron_golem',
    category: 'neutral',
    model: 'iron_golem',
    skin: 'iron_golem',
    variants: 1,
    health: 100, armor: 0,
    width: 1.4, height: 2.7,
    speed: 0.25,
    attack: { damage: 21, range: 2.0, cooldown: 20 },
    followRange: 16, xp: [0, 0],
    drops: [
      { item: 'iron_ingot', min: 3, max: 5 },
      { item: 'poppy', min: 0, max: 2 },
    ],
    spawn: null, // constructed; also auto-spawns in villages
    ai: ['wander', 'lookAround', 'meleeAttack', 'guardTerritory'],
    sounds: { idle: 'ironGolemIdle', hurt: 'ironGolemHurt', death: 'ironGolemDeath', step: 'stepHard' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: null,
  },

  // ---- SNOW_GOLEM ----------------------------------------------------------
  {
    id: 'snow_golem',
    category: 'passive',
    model: 'snow_golem',
    skin: 'snow_golem',
    variants: 1,
    health: 4, armor: 0,
    width: 0.7, height: 1.9,
    speed: 0.2,
    attack: { damage: 0, range: 10, cooldown: 20 }, // snowball ranged; no direct damage
    followRange: 16, xp: [0, 0],
    drops: [
      { item: 'snowball', min: 0, max: 15 },
    ],
    spawn: null, // constructed by player
    ai: ['wander', 'lookAround', 'rangedAttack'],
    sounds: { idle: 'snowGolemIdle', hurt: 'snowGolemHurt', death: 'snowGolemDeath', step: 'stepSoft' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: 'snowGolem',
  },

  // ---- PANDA ---------------------------------------------------------------
  {
    id: 'panda',
    category: 'neutral',
    model: 'panda',
    skin: 'panda',
    variants: 7, // normal, lazy, worried, playful, aggressive, weak, brown
    health: 20, armor: 0,
    width: 1.3, height: 1.25,
    speed: 0.15,
    attack: { damage: 6, range: 1.5, cooldown: 20 },
    followRange: 16, xp: [1, 3],
    drops: [
      { item: 'bamboo', min: 0, max: 2 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: ['jungle'],
      light: 'day', where: 'surface',
      weight: 3, group: [1, 2], maxPerChunk: 2, cap: 'passive',
    },
    ai: ['wander', 'lookAround', 'panic', 'meleeAttack', 'followPlayerHolding:bamboo', 'breed:bamboo', 'growUp', 'followParent', 'tempt'],
    sounds: { idle: 'pandaIdle', hurt: 'pandaHurt', death: 'pandaDeath', step: 'stepSoft', sneeze: 'pandaSneeze' },
    tameable: null,
    rideable: false, breedItem: 'bamboo', babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: null,
  },

  // ---- POLAR_BEAR ----------------------------------------------------------
  {
    id: 'polar_bear',
    category: 'neutral',
    model: 'polar_bear',
    skin: 'polar_bear',
    variants: 1,
    health: 30, armor: 0,
    width: 1.4, height: 1.4,
    speed: 0.25,
    attack: { damage: 6, range: 1.5, cooldown: 20 },
    followRange: 16, xp: [1, 3],
    drops: [
      { item: 'cod', min: 0, max: 2, cookedItem: 'cooked_cod' },
      { item: 'salmon', min: 0, max: 1, cookedItem: 'cooked_salmon' },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: ['snowy_taiga'],
      light: 'day', where: 'surface',
      weight: 4, group: [1, 2], maxPerChunk: 2, cap: 'passive',
    },
    ai: ['wander', 'lookAround', 'meleeAttack', 'panic', 'growUp', 'followParent'],
    sounds: { idle: 'polarBearIdle', hurt: 'polarBearHurt', death: 'polarBearDeath', step: 'stepHard', roar: 'polarBearRoar' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: null,
  },

  // ---- SPIDER --------------------------------------------------------------
  {
    id: 'spider',
    category: 'neutral',
    model: 'spider',
    skin: 'spider',
    variants: 1,
    health: 16, armor: 0,
    width: 1.4, height: 0.9,
    speed: 0.3,
    attack: { damage: 2, range: 1.5, cooldown: 20 },
    followRange: 16, xp: [5, 5],
    drops: [
      { item: 'string', min: 0, max: 2 },
      { item: 'spider_eye', min: 0, max: 1 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: 'any',
      light: 'night', where: 'surface',
      weight: 6, group: [1, 2], maxPerChunk: 4, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'meleeAttack', 'climbWall', 'leapAtTarget'],
    sounds: { idle: 'spiderIdle', hurt: 'spiderHurt', death: 'spiderDeath', step: 'stepSoft' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: null,
  },

  // ---- CAVE_SPIDER ---------------------------------------------------------
  {
    id: 'cave_spider',
    category: 'hostile',
    model: 'cave_spider',
    skin: 'cave_spider',
    variants: 1,
    health: 12, armor: 0,
    width: 0.7, height: 0.5,
    speed: 0.3,
    attack: { damage: 2, range: 1.2, cooldown: 20 }, // also poisons
    followRange: 16, xp: [5, 5],
    drops: [
      { item: 'string', min: 0, max: 2 },
      { item: 'spider_eye', min: 0, max: 1 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: 'any',
      light: 'dark', where: 'cave',
      weight: 4, group: [1, 3], maxPerChunk: 4, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'meleeAttack', 'climbWall', 'leapAtTarget'],
    sounds: { idle: 'spiderIdle', hurt: 'spiderHurt', death: 'spiderDeath', step: 'stepSoft' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: 'caveSpider',
  },

  // ---- ENDERMAN ------------------------------------------------------------
  {
    id: 'enderman',
    category: 'neutral',
    model: 'enderman',
    skin: 'enderman',
    variants: 1,
    health: 40, armor: 0,
    width: 0.6, height: 2.9,
    speed: 0.3,
    attack: { damage: 7, range: 1.5, cooldown: 20 },
    followRange: 64, xp: [5, 5],
    drops: [
      { item: 'ender_pearl', min: 0, max: 1 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: 'any',
      light: 'night', where: 'surface',
      weight: 3, group: [1, 2], maxPerChunk: 2, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'meleeAttack', 'teleportRandom', 'aggroOnLook', 'stealBlock'],
    sounds: { idle: 'endermanIdle', hurt: 'endermanHurt', death: 'endermanDeath', step: 'stepSoft', stare: 'endermanStare', teleport: 'endermanTeleport' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: 'enderman',
  },

  // ---- PIGLIN --------------------------------------------------------------
  {
    id: 'piglin',
    category: 'neutral',
    model: 'piglin',
    skin: 'piglin',
    variants: 1,
    health: 16, armor: 5,
    width: 0.6, height: 1.95,
    speed: 0.35,
    attack: { damage: 5, range: 1.5, cooldown: 20 },
    followRange: 16, xp: [5, 5],
    drops: [
      { item: 'gold_nugget', min: 0, max: 1 },
    ],
    spawn: {
      dimension: 'nether',
      biomes: 'any',
      light: 'any', where: 'surface',
      weight: 15, group: [2, 4], maxPerChunk: 6, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'meleeAttack', 'barter', 'rangedAttack'],
    sounds: { idle: 'piglinIdle', hurt: 'piglinHurt', death: 'piglinDeath', step: 'stepHard', anger: 'piglinAngry' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: 'piglin',
  },

  // ---- ZOGLIN --------------------------------------------------------------
  {
    id: 'zoglin',
    category: 'hostile',
    model: 'zoglin',
    skin: 'zoglin',
    variants: 1,
    health: 40, armor: 0,
    width: 1.4, height: 1.4,
    speed: 0.3,
    attack: { damage: 6, range: 1.5, cooldown: 20 },
    followRange: 16, xp: [5, 5],
    drops: [
      { item: 'rotten_flesh', min: 1, max: 3 },
    ],
    spawn: {
      dimension: 'nether',
      biomes: 'any',
      light: 'any', where: 'surface',
      weight: 5, group: [1, 2], maxPerChunk: 2, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'meleeAttack', 'panic'],
    sounds: { idle: 'hoglinIdle', hurt: 'hoglinHurt', death: 'hoglinDeath', step: 'stepHard' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: null,
  },

  // ---- STRIDER -------------------------------------------------------------
  {
    id: 'strider',
    category: 'passive',
    model: 'strider',
    skin: 'strider',
    variants: 1,
    health: 20, armor: 0,
    width: 0.9, height: 1.7,
    speed: 0.175,
    attack: null,
    followRange: 16, xp: [1, 3],
    drops: [
      { item: 'string', min: 0, max: 5 },
    ],
    spawn: {
      dimension: 'nether',
      biomes: 'any',
      light: 'any', where: 'lava',
      weight: 20, group: [1, 3], maxPerChunk: 4, cap: 'passive',
    },
    ai: ['wander', 'lookAround', 'followPlayerHolding:nether_wart', 'breed:nether_wart', 'growUp', 'followParent', 'lavaWalk', 'rideBoost'],
    sounds: { idle: 'striderIdle', hurt: 'striderHurt', death: 'striderDeath', step: 'stepSoft', happy: 'striderHappy' },
    tameable: null,
    rideable: true, breedItem: 'nether_wart', babyScale: 0.5, // warped_fungus not in items.js; nether_wart used
    fireImmune: true, waterMob: false, flying: false, avoidsSun: false,
    special: 'strider',
  },

  // ---- VILLAGER ------------------------------------------------------------
  {
    id: 'villager',
    category: 'passive',
    model: 'villager',
    skin: 'villager',
    variants: 7, // profession variants 0-6
    health: 20, armor: 0,
    width: 0.6, height: 1.95,
    speed: 0.5,
    attack: null,
    followRange: 16, xp: [0, 0],
    drops: [],
    spawn: {
      dimension: 'overworld',
      biomes: ['plains', 'savanna', 'desert', 'snowy_taiga', 'swamp'],
      light: 'any', where: 'surface',
      weight: 8, group: [1, 2], maxPerChunk: 4, cap: 'passive',
    },
    ai: ['wander', 'lookAround', 'avoidSun', 'trade'],
    sounds: { idle: 'villagerIdle', hurt: 'villagerHurt', death: 'villagerDeath', step: 'stepHard', trade: 'villagerTrade', celebrate: 'villagerCelebrate' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: true,
    special: 'villager',
  },

  // ---- WANDERING_TRADER ----------------------------------------------------
  {
    id: 'wandering_trader',
    category: 'passive',
    model: 'wandering_trader',
    skin: 'wandering_trader',
    variants: 1,
    health: 20, armor: 0,
    width: 0.6, height: 1.95,
    speed: 0.5,
    attack: null,
    followRange: 16, xp: [0, 0],
    drops: [],
    spawn: null, // periodically appears near player; not part of chunk-cap spawning
    ai: ['wander', 'lookAround', 'avoidSun', 'trade'],
    sounds: { idle: 'villagerIdle', hurt: 'villagerHurt', death: 'villagerDeath', step: 'stepHard', trade: 'villagerTrade' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: true,
    special: 'wanderingTrader',
  },
];
