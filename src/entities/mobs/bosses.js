// ---------------------------------------------------------------------------
// Boss mob definitions
// All top-level names prefixed MOBDEF_BS_ for concatenation safety.
// ---------------------------------------------------------------------------

export const MOB_DEFS_BOSSES = [

  // ---- ENDER_DRAGON --------------------------------------------------------
  {
    id: 'ender_dragon',
    category: 'boss',
    model: 'ender_dragon',
    skin: 'ender_dragon',
    variants: 1,
    health: 200, armor: 0,
    width: 16.0, height: 8.0,
    speed: 0.6,
    attack: { damage: 6, range: 4.0, cooldown: 20 }, // melee wing/body; breath separate
    followRange: 256, xp: [12000, 12000],
    drops: [
      { item: 'ender_pearl', min: 0, max: 0 }, // drops dragon egg + xp fountain
    ],
    spawn: null, // summoned by entering the end; never naturally chunk-spawned
    ai: ['wander', 'lookAround', 'meleeAttack', 'rangedAttack', 'chargeAttack', 'custom:ender_dragon'],
    sounds: {
      idle: 'dragonIdle', hurt: 'dragonHurt', death: 'dragonDeath',
      step: 'stepSoft', growl: 'dragonGrowl', breath: 'dragonBreath',
      flap: 'dragonFlap', charge: 'dragonCharge',
    },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: true, waterMob: false, flying: true, avoidsSun: false,
    special: 'enderDragon',

    // ---- Boss-specific extended data ----------------------------------------
    boss: {
      bar: 'Ender Dragon',
      arenaRadius: 60,
      crystalHealing: true, // end crystals regenerate dragon health
      immuneToLoot: true,   // no death loot table; only xp orbs + the event drop
      phases: [
        {
          name: 'strafe',
          description: 'Dragon circles arena at height 80, occasionally fires dragon breath fireballs',
          entryCondition: 'always', // initial phase
          durationMin: 600, durationMax: 1200, // ticks
          transitions: [
            { toPhase: 'perch',  condition: 'timer_expired' },
            { toPhase: 'charge', condition: 'player_under_60_percent_hp' },
          ],
          actions: [
            { type: 'fireball', interval: 120, dmg: 6 },
          ],
        },
        {
          name: 'charge',
          description: 'Dragon dives at player position, deals massive wing damage on contact',
          entryCondition: 'triggered',
          durationMin: 200, durationMax: 400,
          transitions: [
            { toPhase: 'strafe', condition: 'timer_expired' },
          ],
          actions: [
            { type: 'wing_slam', dmg: 5 },
          ],
        },
        {
          name: 'perch',
          description: 'Dragon lands on fountain, breathes continuous dragon fire at player',
          entryCondition: 'triggered',
          durationMin: 400, durationMax: 800,
          transitions: [
            { toPhase: 'strafe', condition: 'timer_expired' },
            { toPhase: 'breath', condition: 'player_in_range' },
          ],
          actions: [
            { type: 'breath_cloud', radius: 8, dmg: 3 },
          ],
        },
        {
          name: 'breath',
          description: 'Dragon aims sustained beam of dragon breath at player',
          entryCondition: 'triggered',
          durationMin: 80, durationMax: 200,
          transitions: [
            { toPhase: 'perch', condition: 'timer_expired' },
            { toPhase: 'strafe', condition: 'player_out_of_range' },
          ],
          actions: [
            { type: 'breath_beam', dmg: 6, tickRate: 5 },
          ],
        },
      ],
    },
  },

  // ---- WITHER --------------------------------------------------------------
  {
    id: 'wither',
    category: 'boss',
    model: 'wither',
    skin: 'wither',
    variants: 1,
    health: 300, armor: 4,
    width: 0.9, height: 3.5,
    speed: 0.3,
    attack: { damage: 8, range: 40, cooldown: 20 }, // wither skulls (normal = 8, charged = 12)
    followRange: 40, xp: [50, 50],
    drops: [
      { item: 'netherite_ingot', min: 1, max: 1 }, // nether_star not in items.js; netherite_ingot used as placeholder
    ],
    spawn: null, // constructed by player with soul sand/soul soil and wither skeleton skulls
    ai: ['wander', 'lookAround', 'rangedAttack', 'chargeAttack', 'custom:wither'],
    sounds: {
      idle: 'witherIdle', hurt: 'witherHurt', death: 'witherDeath',
      step: 'stepHard', shoot: 'witherShoot', spawn: 'witherSpawn',
      breakBlock: 'witherBreak',
    },
    tameable: null,
    rideable: false, breedItem: null, babyScale: 0.5,
    fireImmune: true, waterMob: false, flying: true, avoidsSun: false,
    special: 'wither',

    // ---- Boss-specific extended data ----------------------------------------
    boss: {
      bar: 'Wither',
      // Phase 2 triggered when HP falls to 50% (shieldHealth represents the half-HP
      // threshold at which the wither gets hardened armour bonus)
      shieldHealth: 150,   // HP at which phase 2 activates (150 = 50% of 300)
      phase2Below: 0.5,    // fraction of max HP
      // In phase 2 the wither gains blue armour, becomes immune to projectiles,
      // and begins charge attacks against nearby targets
      skullCooldown: 40,       // ticks between wither skull shots (phase 1)
      skullCooldownPhase2: 20, // ticks between shots in phase 2
      blockDestroyRadius: 3.5, // blocks within explosion radius that get destroyed
      chargeSpeedPhase2: 0.6,  // speed multiplier during phase 2 charge
      phases: [
        {
          name: 'ranged',
          description: 'Wither hovers and fires wither skulls at all nearby players, damages blocks',
          entryCondition: 'always',
          durationMin: null, durationMax: null, // persists until HP threshold
          transitions: [
            { toPhase: 'shield', condition: 'hp_below_50_pct' },
          ],
          actions: [
            { type: 'skull_normal',  interval: 40, dmg: 8  },
            { type: 'skull_charged', interval: 400, dmg: 12 },
          ],
        },
        {
          name: 'shield',
          description: 'Wither enters armoured phase: projectile immune, gains blue skulls, charges at players',
          entryCondition: 'hp_below_50_pct',
          durationMin: null, durationMax: null,
          transitions: [], // no further phase transitions
          actions: [
            { type: 'skull_blue',   interval: 20, dmg: 8  },
            { type: 'charge_slam',  interval: 200, dmg: 15 },
          ],
        },
      ],
    },
  },
];
