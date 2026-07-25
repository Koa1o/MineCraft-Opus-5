// ---------------------------------------------------------------------------
// Hostile mob definitions — group B
// All top-level names prefixed MOBDEF_HB_ for concatenation safety.
// ---------------------------------------------------------------------------

export const MOB_DEFS_HOSTILEB = [

  // ---- WITCH ---------------------------------------------------------------
  {
    id: 'witch',
    category: 'hostile',
    model: 'witch',
    skin: 'witch',
    variants: 1,
    health: 26, armor: 0,
    width: 0.6, height: 1.95,
    speed: 0.25,
    attack: { damage: 0, range: 8, cooldown: 80 }, // ranged potion throwing
    followRange: 16, xp: [5, 5],
    drops: [
      { item: 'glowstone_dust', min: 0, max: 3 },
      { item: 'gunpowder',      min: 0, max: 3 },
      { item: 'redstone',       min: 0, max: 3 },
      { item: 'spider_eye',     min: 0, max: 3 },
      { item: 'sugar',          min: 0, max: 3 },
      { item: 'stick',          min: 0, max: 3 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: ['swamp'],
      light: 'night', where: 'surface',
      weight: 4, group: [1, 1], maxPerChunk: 2, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'rangedAttack', 'fleeFrom', 'castSpell'],
    sounds: { idle: 'witchIdle', hurt: 'witchHurt', death: 'witchDeath', step: 'stepHard' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: 'witch',
  },

  // ---- PILLAGER ------------------------------------------------------------
  {
    id: 'pillager',
    category: 'hostile',
    model: 'illager',
    skin: 'pillager',
    variants: 1,
    health: 24, armor: 0,
    width: 0.6, height: 1.95,
    speed: 0.35,
    attack: { damage: 4, range: 8, cooldown: 20 }, // crossbow
    followRange: 64, xp: [5, 5],
    drops: [
      { item: 'arrow', min: 0, max: 2 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: 'any',
      light: 'any', where: 'surface',
      weight: 3, group: [1, 3], maxPerChunk: 4, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'rangedAttack', 'guardTerritory'],
    sounds: { idle: 'pillagerIdle', hurt: 'pillagerHurt', death: 'pillagerDeath', step: 'stepHard', celebrate: 'pillagerCelebrate' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: null,
  },

  // ---- VINDICATOR ----------------------------------------------------------
  {
    id: 'vindicator',
    category: 'hostile',
    model: 'illager',
    skin: 'vindicator',
    variants: 1,
    health: 24, armor: 0,
    width: 0.6, height: 1.95,
    speed: 0.35,
    attack: { damage: 13, range: 1.5, cooldown: 20 }, // axe
    followRange: 16, xp: [5, 5],
    drops: [
      { item: 'iron_axe', min: 0, max: 1 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: 'any',
      light: 'any', where: 'surface',
      weight: 2, group: [1, 2], maxPerChunk: 3, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'meleeAttack', 'breakDoor'],
    sounds: { idle: 'vindicatorIdle', hurt: 'vindicatorHurt', death: 'vindicatorDeath', step: 'stepHard', celebrate: 'pillagerCelebrate' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: null,
  },

  // ---- EVOKER --------------------------------------------------------------
  {
    id: 'evoker',
    category: 'hostile',
    model: 'illager',
    skin: 'evoker',
    variants: 1,
    health: 24, armor: 0,
    width: 0.6, height: 1.95,
    speed: 0.5,
    attack: { damage: 6, range: 8, cooldown: 40 }, // fangs (evoker_fangs)
    followRange: 16, xp: [10, 10],
    drops: [
      { item: 'totem_of_undying', min: 1, max: 1 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: 'any',
      light: 'any', where: 'surface',
      weight: 1, group: [1, 1], maxPerChunk: 1, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'castSpell', 'summonMinions', 'levitateTarget', 'fleeFrom'],
    sounds: { idle: 'evokerIdle', hurt: 'evokerHurt', death: 'evokerDeath', step: 'stepHard', prepare: 'evokerPrepare', cast: 'evokerCast', celebrate: 'pillagerCelebrate' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: 'evoker',
  },

  // ---- VEX -----------------------------------------------------------------
  {
    id: 'vex',
    category: 'hostile',
    model: 'vex',
    skin: 'vex',
    variants: 1,
    health: 14, armor: 0,
    width: 0.4, height: 0.8,
    speed: 0.9,
    attack: { damage: 4, range: 1.5, cooldown: 20 },
    followRange: 16, xp: [3, 3],
    drops: [],
    spawn: null, // summoned by evoker; not naturally spawned
    ai: ['wander', 'lookAround', 'meleeAttack'],
    sounds: { idle: 'vexIdle', hurt: 'vexHurt', death: 'vexDeath', step: 'stepSoft' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: true, avoidsSun: false,
    special: 'vex',
  },

  // ---- RAVAGER -------------------------------------------------------------
  {
    id: 'ravager',
    category: 'hostile',
    model: 'ravager',
    skin: 'ravager',
    variants: 1,
    health: 100, armor: 0,
    width: 1.95, height: 2.2,
    speed: 0.3,
    attack: { damage: 12, range: 2.0, cooldown: 20 },
    followRange: 32, xp: [20, 20],
    drops: [
      { item: 'saddle', min: 1, max: 1 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: 'any',
      light: 'any', where: 'surface',
      weight: 1, group: [1, 1], maxPerChunk: 1, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'meleeAttack', 'chargeAttack'],
    sounds: { idle: 'ravagerIdle', hurt: 'ravagerHurt', death: 'ravagerDeath', step: 'stepHard', roar: 'ravagerRoar', stunned: 'ravagerStunned' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: 'ravager',
  },

  // ---- ILLUSIONER ----------------------------------------------------------
  {
    id: 'illusioner',
    category: 'hostile',
    model: 'illager',
    skin: 'illusioner',
    variants: 1,
    health: 32, armor: 0,
    width: 0.6, height: 1.95,
    speed: 0.5,
    attack: { damage: 4, range: 15, cooldown: 20 }, // bow + blind effect
    followRange: 16, xp: [5, 5],
    drops: [],
    spawn: null, // debug/special spawn only; not in normal survival spawning
    ai: ['wander', 'lookAround', 'rangedAttack', 'castSpell', 'levitateTarget'],
    sounds: { idle: 'pillagerIdle', hurt: 'pillagerHurt', death: 'pillagerDeath', step: 'stepHard' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: 'illusioner',
  },

  // ---- GUARDIAN ------------------------------------------------------------
  {
    id: 'guardian',
    category: 'hostile',
    model: 'guardian',
    skin: 'guardian',
    variants: 1,
    health: 30, armor: 0,
    width: 0.85, height: 0.85,
    speed: 0.5,
    attack: { damage: 6, range: 15, cooldown: 20 }, // laser beam
    followRange: 16, xp: [10, 10],
    drops: [
      { item: 'prismarine_shard', min: 0, max: 2 },
      { item: 'cod', min: 0, max: 1, cookedItem: 'cooked_cod' },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: ['ocean'],
      light: 'any', where: 'water',
      weight: 3, group: [1, 2], maxPerChunk: 4, cap: 'hostile',
    },
    ai: ['swim', 'lookAround', 'rangedAttack', 'guardTerritory'],
    sounds: { idle: 'guardianIdle', hurt: 'guardianHurt', death: 'guardianDeath', step: 'stepSoft' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: true, flying: false, avoidsSun: false,
    special: 'guardian',
  },

  // ---- ELDER_GUARDIAN ------------------------------------------------------
  {
    id: 'elder_guardian',
    category: 'hostile',
    model: 'elder_guardian',
    skin: 'elder_guardian',
    variants: 1,
    health: 80, armor: 0,
    width: 1.9975, height: 1.9975,
    speed: 0.3,
    attack: { damage: 8, range: 15, cooldown: 30 }, // laser beam, also inflicts mining fatigue
    followRange: 16, xp: [10, 10],
    drops: [
      { item: 'prismarine_shard', min: 0, max: 4 },
      { item: 'prismarine_crystals', min: 0, max: 2 },
      { item: 'cod', min: 0, max: 1, cookedItem: 'cooked_cod' },
    ],
    spawn: null, // spawns only once inside ocean monument
    ai: ['swim', 'lookAround', 'rangedAttack', 'guardTerritory'],
    sounds: { idle: 'guardianIdle', hurt: 'guardianHurt', death: 'guardianDeath', step: 'stepSoft' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: true, flying: false, avoidsSun: false,
    special: 'elderGuardian',
  },

  // ---- SHULKER -------------------------------------------------------------
  {
    id: 'shulker',
    category: 'hostile',
    model: 'shulker',
    skin: 'shulker',
    variants: 1,
    health: 30, armor: 20, // near-immune when closed (20 armor points)
    width: 1.0, height: 1.0,
    speed: 0.0, // immobile
    attack: { damage: 4, range: 15, cooldown: 20 }, // homing bullet; also levitates
    followRange: 16, xp: [5, 5],
    drops: [
      { item: 'shulker_shell', min: 0, max: 1 },
    ],
    spawn: {
      dimension: 'end',
      biomes: 'any',
      light: 'any', where: 'surface',
      weight: 10, group: [1, 1], maxPerChunk: 8, cap: 'hostile',
    },
    ai: ['lookAround', 'rangedAttack', 'levitateTarget'],
    sounds: { idle: 'shulkerIdle', hurt: 'shulkerHurt', death: 'shulkerDeath', step: 'stepSoft', open: 'shulkerOpen', close: 'shulkerClose', shoot: 'shulkerShoot' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: 'shulker',
  },

  // ---- BLAZE ---------------------------------------------------------------
  {
    id: 'blaze',
    category: 'hostile',
    model: 'blaze',
    skin: 'blaze',
    variants: 1,
    health: 20, armor: 0,
    width: 0.6, height: 1.8,
    speed: 0.23,
    attack: { damage: 6, range: 16, cooldown: 20 }, // fireball
    followRange: 48, xp: [10, 10],
    drops: [
      { item: 'blaze_rod', min: 0, max: 1 },
    ],
    spawn: {
      dimension: 'nether',
      biomes: 'any',
      light: 'any', where: 'surface',
      weight: 10, group: [1, 2], maxPerChunk: 4, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'rangedAttack'],
    sounds: { idle: 'blazeIdle', hurt: 'blazeHurt', death: 'blazeDeath', step: 'stepSoft', shoot: 'blazeShoot' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: true, waterMob: false, flying: true, avoidsSun: false,
    special: 'blaze',
  },

  // ---- GHAST ---------------------------------------------------------------
  {
    id: 'ghast',
    category: 'hostile',
    model: 'ghast',
    skin: 'ghast',
    variants: 1,
    health: 10, armor: 0,
    width: 4.0, height: 4.0,
    speed: 0.4,
    attack: { damage: 9, range: 64, cooldown: 40 }, // fireball (explosion 17 radius)
    followRange: 100, xp: [5, 5],
    drops: [
      { item: 'ghast_tear', min: 0, max: 1 },
      { item: 'gunpowder', min: 0, max: 2 },
    ],
    spawn: {
      dimension: 'nether',
      biomes: 'any',
      light: 'any', where: 'air',
      weight: 5, group: [1, 1], maxPerChunk: 2, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'rangedAttack'],
    sounds: { idle: 'ghastIdle', hurt: 'ghastHurt', death: 'ghastDeath', step: 'stepSoft', shoot: 'ghastShoot', warn: 'ghastWarn' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: true, waterMob: false, flying: true, avoidsSun: false,
    special: 'ghast',
  },

  // ---- HOGLIN --------------------------------------------------------------
  {
    id: 'hoglin',
    category: 'hostile',
    model: 'hoglin',
    skin: 'hoglin',
    variants: 1,
    health: 40, armor: 0,
    width: 1.39, height: 1.4,
    speed: 0.3,
    attack: { damage: 6, range: 1.5, cooldown: 20 }, // flings target
    followRange: 16, xp: [5, 5],
    drops: [
      { item: 'porkchop', min: 2, max: 4, cookedItem: 'cooked_porkchop' },
      { item: 'leather', min: 0, max: 1 },
    ],
    spawn: {
      dimension: 'nether',
      biomes: 'any',
      light: 'any', where: 'surface',
      weight: 9, group: [2, 4], maxPerChunk: 6, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'meleeAttack', 'fleeFrom', 'breed:nether_wart', 'growUp', 'followParent'],
    sounds: { idle: 'hoglinIdle', hurt: 'hoglinHurt', death: 'hoglinDeath', step: 'stepHard', anger: 'hoglinAngry' },
    tameable: null,
    rideable: false, breedItem: 'nether_wart', babyScale: 0.5, // crimson_fungus not in items.js; nether_wart used
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: 'hoglin',
  },

  // ---- PIGLIN_BRUTE --------------------------------------------------------
  {
    id: 'piglin_brute',
    category: 'hostile',
    model: 'piglin_brute',
    skin: 'piglin_brute',
    variants: 1,
    health: 50, armor: 0,
    width: 0.6, height: 1.95,
    speed: 0.35,
    attack: { damage: 13, range: 1.5, cooldown: 20 }, // axe
    followRange: 16, xp: [20, 20],
    drops: [
      { item: 'gold_ingot', min: 0, max: 1 },
    ],
    spawn: {
      dimension: 'nether',
      biomes: 'any',
      light: 'any', where: 'surface',
      weight: 3, group: [1, 1], maxPerChunk: 2, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'meleeAttack', 'guardTerritory'],
    sounds: { idle: 'piglinIdle', hurt: 'piglinHurt', death: 'piglinDeath', step: 'stepHard', anger: 'piglinAngry' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: null,
  },

  // ---- PHANTOM -------------------------------------------------------------
  {
    id: 'phantom',
    category: 'hostile',
    model: 'phantom',
    skin: 'phantom',
    variants: 1,
    health: 20, armor: 0,
    width: 0.9, height: 0.5,
    speed: 0.5,
    attack: { damage: 6, range: 1.5, cooldown: 20 },
    followRange: 64, xp: [5, 5],
    drops: [
      { item: 'phantom_membrane', min: 0, max: 1 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: 'any',
      light: 'night', where: 'air',
      weight: 5, group: [1, 2], maxPerChunk: 4, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'meleeAttack', 'chargeAttack', 'avoidSun'],
    sounds: { idle: 'phantomIdle', hurt: 'phantomHurt', death: 'phantomDeath', step: 'stepSoft', flap: 'phantomFlap', bite: 'phantomBite' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: true, avoidsSun: true,
    special: 'phantom',
  },

  // ---- WARDEN --------------------------------------------------------------
  {
    id: 'warden',
    category: 'hostile',
    model: 'warden',
    skin: 'warden',
    variants: 1,
    health: 500, armor: 0,
    width: 0.9, height: 2.9,
    speed: 0.3,
    attack: { damage: 30, range: 1.5, cooldown: 20 }, // melee; sonic boom 10 damage
    followRange: 16, xp: [5, 5],
    drops: [
      { item: 'echo_shard', min: 0, max: 1 },
    ],
    spawn: {
      dimension: 'overworld',
      biomes: 'any',
      light: 'dark', where: 'cave',
      weight: 1, group: [1, 1], maxPerChunk: 1, cap: 'hostile',
    },
    ai: ['wander', 'lookAround', 'meleeAttack', 'vibrationTrack', 'sonicBoom', 'digIn'],
    sounds: { idle: 'wardenIdle', hurt: 'wardenHurt', death: 'wardenDeath', step: 'wardenStep', roar: 'wardenRoar', sonicBoom: 'wardenSonicBoom', emerge: 'wardenEmerge', dig: 'wardenDig', heartbeat: 'wardenHeartbeat' },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: false, waterMob: false, flying: false, avoidsSun: false,
    special: 'warden',
  },
];
