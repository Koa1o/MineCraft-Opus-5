// ---------------------------------------------------------------------------
// Hostile mob definitions — group A
// All top-level names prefixed MOBDEF_HA_ for concatenation safety.
// ---------------------------------------------------------------------------

export const MOB_DEFS_HOSTILEA = [

  // ---- ZOMBIE --------------------------------------------------------------
  {
    id: 'zombie',
    category: 'hostile',
    model: 'zombie',
    skin: 'zombie',
    variants: 1,
    health: 20, armor: 0,
    width: 0.6, height: 1.95,
    speed: 0.23,
    attack: { damage: 3, range: 1.5, cooldown: 20 },
    followRange: 35, xp: [5, 5],
    drops: [
      { item: 'rotten_flesh', min: 0, max: 2 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: 'any',
      light: 'night', where: 'surface',
      weight: 10, group: [1, 3], maxPerChunk: 6, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'meleeAttack', 'breakDoor', 'avoidSun', 'growUp', 'followParent'],
    sounds: { idle: 'zombieIdle', hurt: 'zombieHurt', death: 'zombieDeath', step: 'stepHard' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: true,
    special: null,
  },

  // ---- HUSK ----------------------------------------------------------------
  {
    id: 'husk',
    category: 'hostile',
    model: 'zombie',
    skin: 'husk',
    variants: 1,
    health: 20, armor: 0,
    width: 0.6, height: 1.95,
    speed: 0.23,
    attack: { damage: 3, range: 1.5, cooldown: 20 }, // also inflicts hunger
    followRange: 35, xp: [5, 5],
    drops: [
      { item: 'rotten_flesh', min: 0, max: 2 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: ['desert', 'badlands'],
      light: 'night', where: 'surface',
      weight: 10, group: [1, 3], maxPerChunk: 6, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'meleeAttack', 'breakDoor', 'growUp', 'followParent'],
    sounds: { idle: 'huskIdle', hurt: 'huskHurt', death: 'huskDeath', step: 'stepHard' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: null,
  },

  // ---- DROWNED -------------------------------------------------------------
  {
    id: 'drowned',
    category: 'hostile',
    model: 'zombie',
    skin: 'drowned',
    variants: 1,
    health: 20, armor: 2,
    width: 0.6, height: 1.95,
    speed: 0.23,
    attack: { damage: 3, range: 1.5, cooldown: 20 }, // trident ranged (special)
    followRange: 35, xp: [5, 5],
    drops: [
      { item: 'rotten_flesh', min: 0, max: 2 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: ['ocean', 'beach'],
      light: 'any', where: 'water',
      weight: 8, group: [1, 2], maxPerChunk: 4, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'meleeAttack', 'rangedAttack', 'swim', 'growUp', 'followParent'],
    sounds: { idle: 'drownedIdle', hurt: 'drownedHurt', death: 'drownedDeath', step: 'stepSoft' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: true, flying: false, avoidsSun: false,
    special: 'drowned',
  },

  // ---- ZOMBIE_VILLAGER -----------------------------------------------------
  {
    id: 'zombie_villager',
    category: 'hostile',
    model: 'zombie',
    skin: 'zombie_villager',
    variants: 1,
    health: 20, armor: 0,
    width: 0.6, height: 1.95,
    speed: 0.23,
    attack: { damage: 3, range: 1.5, cooldown: 20 },
    followRange: 35, xp: [5, 5],
    drops: [
      { item: 'rotten_flesh', min: 0, max: 2 },
    ],
    spawn: null, // spawned by zombie killing villager; not naturally spawned
    ai: ['wander', 'lookAround', 'meleeAttack', 'breakDoor', 'avoidSun'],
    sounds: { idle: 'zombieVillagerIdle', hurt: 'zombieVillagerHurt', death: 'zombieDeath', step: 'stepHard' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: true,
    special: 'zombieVillager',
  },

  // ---- SKELETON ------------------------------------------------------------
  {
    id: 'skeleton',
    category: 'hostile',
    model: 'skeleton',
    skin: 'skeleton',
    variants: 1,
    health: 20, armor: 0,
    width: 0.6, height: 1.99,
    speed: 0.25,
    attack: { damage: 4, range: 15, cooldown: 20 }, // arrow damage varies
    followRange: 16, xp: [5, 5],
    drops: [
      { item: 'bone', min: 0, max: 2 },
      { item: 'arrow', min: 0, max: 2 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: 'any',
      light: 'night', where: 'surface',
      weight: 8, group: [1, 3], maxPerChunk: 6, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'rangedAttack', 'avoidSun', 'fleeFrom'],
    sounds: { idle: 'skeletonIdle', hurt: 'skeletonHurt', death: 'skeletonDeath', step: 'stepHard' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: true,
    special: null,
  },

  // ---- STRAY ---------------------------------------------------------------
  {
    id: 'stray',
    category: 'hostile',
    model: 'skeleton',
    skin: 'stray',
    variants: 1,
    health: 20, armor: 0,
    width: 0.6, height: 1.99,
    speed: 0.25,
    attack: { damage: 4, range: 15, cooldown: 20 }, // slowness arrows
    followRange: 16, xp: [5, 5],
    drops: [
      { item: 'bone', min: 0, max: 2 },
      { item: 'arrow', min: 0, max: 2 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: ['snowy_taiga', 'mountains'],
      light: 'night', where: 'surface',
      weight: 8, group: [1, 3], maxPerChunk: 6, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'rangedAttack', 'avoidSun', 'fleeFrom'],
    sounds: { idle: 'skeletonIdle', hurt: 'skeletonHurt', death: 'skeletonDeath', step: 'stepHard' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: true,
    special: null,
  },

  // ---- BOGGED --------------------------------------------------------------
  {
    id: 'bogged',
    category: 'hostile',
    model: 'skeleton',
    skin: 'bogged',
    variants: 1,
    health: 16, armor: 0,
    width: 0.6, height: 1.99,
    speed: 0.25,
    attack: { damage: 4, range: 15, cooldown: 30 }, // poison arrows, slower fire rate
    followRange: 16, xp: [5, 5],
    drops: [
      { item: 'bone', min: 0, max: 2 },
      { item: 'arrow', min: 0, max: 2 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: ['swamp'],
      light: 'night', where: 'surface',
      weight: 6, group: [1, 2], maxPerChunk: 4, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'rangedAttack', 'avoidSun', 'fleeFrom'],
    sounds: { idle: 'skeletonIdle', hurt: 'skeletonHurt', death: 'skeletonDeath', step: 'stepSoft' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: true,
    special: 'bogged',
  },

  // ---- WITHER_SKELETON -----------------------------------------------------
  {
    id: 'wither_skeleton',
    category: 'hostile',
    model: 'skeleton',
    skin: 'wither_skeleton',
    variants: 1,
    health: 20, armor: 0,
    width: 0.7, height: 2.4,
    speed: 0.3,
    attack: { damage: 8, range: 1.5, cooldown: 20 }, // also inflicts wither
    followRange: 16, xp: [5, 5],
    drops: [
      { item: 'coal', min: 0, max: 1 },
      { item: 'bone', min: 0, max: 2 },
    ],
    spawn: {
      dimension: 'nether',
      biomes: 'any',
      light: 'any', where: 'surface',
      weight: 5, group: [1, 2], maxPerChunk: 4, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'meleeAttack'],
    sounds: { idle: 'skeletonIdle', hurt: 'skeletonHurt', death: 'skeletonDeath', step: 'stepHard' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: true, waterMob: false, flying: false, avoidsSun: false,
    special: 'witherSkeleton',
  },

  // ---- CREEPER -------------------------------------------------------------
  {
    id: 'creeper',
    category: 'hostile',
    model: 'creeper',
    skin: 'creeper',
    variants: 1,
    health: 20, armor: 0,
    width: 0.6, height: 1.7,
    speed: 0.25,
    attack: null, // explosion handled by special
    followRange: 16, xp: [5, 5],
    drops: [
      { item: 'gunpowder', min: 0, max: 2 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: 'any',
      light: 'night', where: 'surface',
      weight: 6, group: [1, 2], maxPerChunk: 4, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'avoidSun', 'fleeFrom', 'custom:creeper'],
    sounds: { idle: 'creeperIdle', hurt: 'creeperHurt', death: 'creeperDeath', step: 'stepSoft', fuse: 'creeperFuse', explode: 'explode' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: 'creeper',
  },

  // ---- CHARGED_CREEPER -----------------------------------------------------
  {
    id: 'charged_creeper',
    category: 'hostile',
    model: 'creeper',
    skin: 'charged_creeper',
    variants: 1,
    health: 20, armor: 0,
    width: 0.6, height: 1.7,
    speed: 0.25,
    attack: null, // larger explosion
    followRange: 16, xp: [5, 5],
    drops: [
      { item: 'gunpowder', min: 0, max: 2 },
    ],
    spawn: null, // only created when a creeper is struck by lightning
    ai: ['wander', 'lookAround', 'avoidSun', 'fleeFrom', 'custom:creeper'],
    sounds: { idle: 'creeperIdle', hurt: 'creeperHurt', death: 'creeperDeath', step: 'stepSoft', fuse: 'creeperFuse', explode: 'explode' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: 'chargedCreeper',
  },

  // ---- SLIME ---------------------------------------------------------------
  {
    id: 'slime',
    category: 'hostile',
    model: 'slime',
    skin: 'slime',
    variants: 1,
    health: 16, armor: 0, // for medium size (size 2); splits into smaller
    width: 1.02, height: 1.02, // medium size; scale varies with size
    speed: 0.2,
    attack: { damage: 3, range: 1.5, cooldown: 20 },
    followRange: 16, xp: [4, 4],
    drops: [
      { item: 'slime_ball', min: 0, max: 2 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: ['swamp'],
      light: 'night', where: 'surface',
      weight: 6, group: [1, 3], maxPerChunk: 4, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'meleeAttack', 'split'],
    sounds: { idle: 'slimeIdle', hurt: 'slimeHurt', death: 'slimeDeath', step: 'slimeStep', squish: 'slimeSquish' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: 'slime',
  },

  // ---- MAGMA_CUBE ----------------------------------------------------------
  {
    id: 'magma_cube',
    category: 'hostile',
    model: 'magma_cube',
    skin: 'magma_cube',
    variants: 1,
    health: 16, armor: 0, // medium size
    width: 1.02, height: 1.02,
    speed: 0.2,
    attack: { damage: 6, range: 1.5, cooldown: 20 }, // medium size; scales with size
    followRange: 16, xp: [4, 4],
    drops: [
      { item: 'magma_cream', min: 0, max: 1 },
    ],
    spawn: {
      dimension: 'nether',
      biomes: 'any',
      light: 'any', where: 'surface',
      weight: 5, group: [1, 4], maxPerChunk: 4, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'meleeAttack', 'split'],
    sounds: { idle: 'slimeIdle', hurt: 'slimeHurt', death: 'slimeDeath', step: 'slimeStep', squish: 'slimeSquish' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: true, waterMob: false, flying: false, avoidsSun: false,
    special: 'slime',
  },

  // ---- SILVERFISH ----------------------------------------------------------
  {
    id: 'silverfish',
    category: 'hostile',
    model: 'silverfish',
    skin: 'silverfish',
    variants: 1,
    health: 8, armor: 0,
    width: 0.4, height: 0.3,
    speed: 0.25,
    attack: { damage: 1, range: 0.8, cooldown: 20 },
    followRange: 16, xp: [5, 5],
    drops: [],
    spawn: {
      dimension: 'overworld',
      biomes: 'any',
      light: 'dark', where: 'cave',
      weight: 4, group: [1, 3], maxPerChunk: 4, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'meleeAttack', 'summonMinions', 'climbWall'],
    sounds: { idle: 'silverfishIdle', hurt: 'silverfishHurt', death: 'silverfishDeath', step: 'stepSoft' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: 'silverfish',
  },

  // ---- ENDERMITE -----------------------------------------------------------
  {
    id: 'endermite',
    category: 'hostile',
    model: 'endermite',
    skin: 'endermite',
    variants: 1,
    health: 8, armor: 0,
    width: 0.4, height: 0.3,
    speed: 0.25,
    attack: { damage: 2, range: 0.8, cooldown: 20 },
    followRange: 16, xp: [3, 3],
    drops: [],
    spawn: {
      dimension: 'overworld',
      biomes: 'any',
      light: 'any', where: 'surface',
      weight: 2, group: [1, 2], maxPerChunk: 2, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'meleeAttack', 'climbWall'],
    sounds: { idle: 'silverfishIdle', hurt: 'silverfishHurt', death: 'silverfishDeath', step: 'stepSoft' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: null,
  },
];
