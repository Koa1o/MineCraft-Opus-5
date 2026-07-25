// Biome definitions and selection logic.
// All 12 biomes, visual tints, climate parameters, and terrain shaping data.

// ---------------------------------------------------------------------------
// BIOMES array — 12 entries, order defines id index
// ---------------------------------------------------------------------------

export const BIOMES = [
  // 0 — plains
  {
    id: 'plains', name: 'Plains', temp: 0.8, humid: 0.4,
    grassTint: [0.55, 0.72, 0.34], foliageTint: [0.46, 0.70, 0.26], waterTint: [0.24, 0.46, 0.82],
    skyTop: [0.32, 0.52, 0.85], skyHorizon: [0.60, 0.72, 0.93], fogColor: [0.68, 0.78, 0.95],
    fogDensity: 1.0,
    surface: { top: 'grass_block', filler: 'dirt', fillerDepth: 3, underwater: 'gravel' },
    heightBase: 68, heightVar: 6,
    trees: [{ block: 'oak', weight: 10, size: 'normal' }], treeDensity: 0.003,
    plants: [
      { block: 'tall_grass', weight: 20, tries: 8 },
      { block: 'poppy', weight: 2, tries: 2 },
      { block: 'dandelion', weight: 3, tries: 2 },
      { block: 'azure_bluet', weight: 2, tries: 1 },
      { block: 'oxeye_daisy', weight: 2, tries: 1 },
    ],
    features: ['pond', 'boulder'],
    mobs: {
      passive: [
        { id: 'cow', weight: 8, group: [2, 4] },
        { id: 'sheep', weight: 8, group: [2, 4] },
        { id: 'pig', weight: 6, group: [2, 4] },
        { id: 'chicken', weight: 6, group: [2, 4] },
        { id: 'horse', weight: 4, group: [2, 4] },
        { id: 'rabbit', weight: 3, group: [2, 3] },
      ],
      hostile: [
        { id: 'zombie', weight: 10, group: [1, 3] },
        { id: 'skeleton', weight: 8, group: [1, 3] },
        { id: 'creeper', weight: 6, group: [1, 2] },
        { id: 'spider', weight: 6, group: [1, 2] },
      ],
      water: [],
    },
    snow: false, rain: true, temperatureCategory: 'temperate',
    structures: [{ id: 'village', chance: 0.004 }],
  },

  // 1 — forest
  {
    id: 'forest', name: 'Forest', temp: 0.7, humid: 0.6,
    grassTint: [0.44, 0.68, 0.27], foliageTint: [0.35, 0.63, 0.22], waterTint: [0.20, 0.44, 0.80],
    skyTop: [0.30, 0.50, 0.84], skyHorizon: [0.58, 0.70, 0.92], fogColor: [0.55, 0.68, 0.88],
    fogDensity: 1.0,
    surface: { top: 'grass_block', filler: 'dirt', fillerDepth: 4, underwater: 'gravel' },
    heightBase: 70, heightVar: 10,
    trees: [
      { block: 'oak', weight: 10, size: 'normal' },
      { block: 'birch', weight: 4, size: 'normal' },
    ], treeDensity: 0.06,
    plants: [
      { block: 'tall_grass', weight: 10, tries: 4 },
      { block: 'fern', weight: 6, tries: 3 },
      { block: 'poppy', weight: 2, tries: 1 },
      { block: 'dandelion', weight: 2, tries: 1 },
      { block: 'rose_bush_lower', weight: 1, tries: 1 },
      { block: 'brown_mushroom', weight: 2, tries: 2 },
    ],
    features: ['boulder', 'pond'],
    mobs: {
      passive: [
        { id: 'wolf', weight: 6, group: [2, 4] },
        { id: 'rabbit', weight: 4, group: [2, 3] },
        { id: 'fox', weight: 3, group: [1, 2] },
      ],
      hostile: [
        { id: 'zombie', weight: 10, group: [1, 3] },
        { id: 'skeleton', weight: 8, group: [1, 3] },
        { id: 'creeper', weight: 6, group: [1, 2] },
        { id: 'spider', weight: 8, group: [1, 2] },
      ],
      water: [],
    },
    snow: false, rain: true, temperatureCategory: 'temperate',
    structures: [],
  },

  // 2 — desert
  {
    id: 'desert', name: 'Desert', temp: 2.0, humid: 0.0,
    grassTint: [0.78, 0.74, 0.42], foliageTint: [0.75, 0.71, 0.38], waterTint: [0.26, 0.52, 0.84],
    skyTop: [0.40, 0.60, 0.90], skyHorizon: [0.72, 0.78, 0.96], fogColor: [0.80, 0.80, 0.72],
    fogDensity: 0.9,
    surface: { top: 'sand', filler: 'sand', fillerDepth: 4, underwater: 'sand' },
    heightBase: 64, heightVar: 4,
    trees: [], treeDensity: 0.0,
    plants: [
      { block: 'dead_bush', weight: 10, tries: 4 },
      { block: 'cactus', weight: 6, tries: 3 },
    ],
    features: [],
    mobs: {
      passive: [
        { id: 'rabbit', weight: 4, group: [2, 3] },
      ],
      hostile: [
        { id: 'zombie', weight: 10, group: [1, 3] },
        { id: 'skeleton', weight: 8, group: [1, 3] },
        { id: 'husk', weight: 10, group: [1, 3] },
        { id: 'creeper', weight: 6, group: [1, 2] },
      ],
      water: [],
    },
    snow: false, rain: false, temperatureCategory: 'hot',
    structures: [{ id: 'desert_temple', chance: 0.003 }],
  },

  // 3 — snowy_taiga
  {
    id: 'snowy_taiga', name: 'Snowy Taiga', temp: -0.5, humid: 0.4,
    grassTint: [0.56, 0.68, 0.64], foliageTint: [0.50, 0.62, 0.58], waterTint: [0.16, 0.36, 0.78],
    skyTop: [0.48, 0.64, 0.86], skyHorizon: [0.70, 0.78, 0.92], fogColor: [0.78, 0.84, 0.94],
    fogDensity: 1.1,
    surface: { top: 'snow_block', filler: 'dirt', fillerDepth: 3, underwater: 'gravel' },
    heightBase: 70, heightVar: 8,
    trees: [{ block: 'spruce', weight: 10, size: 'normal' }], treeDensity: 0.07,
    plants: [
      { block: 'fern', weight: 6, tries: 3 },
      { block: 'brown_mushroom', weight: 3, tries: 2 },
    ],
    features: ['boulder'],
    mobs: {
      passive: [
        { id: 'wolf', weight: 8, group: [2, 4] },
        { id: 'fox', weight: 4, group: [1, 2] },
        { id: 'rabbit', weight: 4, group: [2, 3] },
      ],
      hostile: [
        { id: 'zombie', weight: 8, group: [1, 3] },
        { id: 'skeleton', weight: 10, group: [1, 3] },
        { id: 'creeper', weight: 6, group: [1, 2] },
        { id: 'stray', weight: 8, group: [1, 2] },
      ],
      water: [],
    },
    snow: true, rain: false, temperatureCategory: 'cold',
    structures: [],
  },

  // 4 — jungle
  {
    id: 'jungle', name: 'Jungle', temp: 0.95, humid: 0.9,
    grassTint: [0.35, 0.76, 0.20], foliageTint: [0.24, 0.70, 0.15], waterTint: [0.16, 0.40, 0.74],
    skyTop: [0.26, 0.50, 0.82], skyHorizon: [0.52, 0.70, 0.90], fogColor: [0.46, 0.66, 0.82],
    fogDensity: 1.2,
    surface: { top: 'grass_block', filler: 'dirt', fillerDepth: 4, underwater: 'gravel' },
    heightBase: 72, heightVar: 14,
    trees: [
      { block: 'jungle', weight: 10, size: 'large' },
      { block: 'oak', weight: 3, size: 'small' },
    ], treeDensity: 0.12,
    plants: [
      { block: 'tall_grass', weight: 12, tries: 6 },
      { block: 'fern', weight: 8, tries: 4 },
      { block: 'bamboo', weight: 4, tries: 3 },
      { block: 'vine', weight: 8, tries: 4 },
      { block: 'cocoa_placeholder', weight: 0, tries: 0 },
    ],
    features: ['pond'],
    mobs: {
      passive: [
        { id: 'parrot', weight: 6, group: [1, 2] },
        { id: 'ocelot', weight: 4, group: [1, 2] },
        { id: 'chicken', weight: 4, group: [2, 4] },
      ],
      hostile: [
        { id: 'zombie', weight: 8, group: [1, 3] },
        { id: 'skeleton', weight: 6, group: [1, 3] },
        { id: 'creeper', weight: 8, group: [1, 2] },
        { id: 'spider', weight: 6, group: [1, 2] },
      ],
      water: [
        { id: 'cod', weight: 4, group: [3, 5] },
      ],
    },
    snow: false, rain: true, temperatureCategory: 'hot',
    structures: [{ id: 'jungle_temple', chance: 0.003 }],
  },

  // 5 — savanna
  {
    id: 'savanna', name: 'Savanna', temp: 1.2, humid: 0.1,
    grassTint: [0.72, 0.74, 0.32], foliageTint: [0.68, 0.70, 0.28], waterTint: [0.22, 0.48, 0.82],
    skyTop: [0.38, 0.58, 0.88], skyHorizon: [0.66, 0.76, 0.94], fogColor: [0.76, 0.80, 0.90],
    fogDensity: 0.95,
    surface: { top: 'grass_block', filler: 'dirt', fillerDepth: 3, underwater: 'gravel' },
    heightBase: 66, heightVar: 6,
    trees: [{ block: 'acacia', weight: 10, size: 'normal' }], treeDensity: 0.008,
    plants: [
      { block: 'tall_grass', weight: 10, tries: 4 },
      { block: 'dead_bush', weight: 4, tries: 2 },
    ],
    features: [],
    mobs: {
      passive: [
        { id: 'cow', weight: 6, group: [2, 4] },
        { id: 'sheep', weight: 6, group: [2, 4] },
        { id: 'horse', weight: 4, group: [2, 4] },
        { id: 'llama', weight: 3, group: [2, 4] },
      ],
      hostile: [
        { id: 'zombie', weight: 10, group: [1, 3] },
        { id: 'skeleton', weight: 8, group: [1, 3] },
        { id: 'creeper', weight: 6, group: [1, 2] },
      ],
      water: [],
    },
    snow: false, rain: false, temperatureCategory: 'hot',
    structures: [{ id: 'village', chance: 0.003 }],
  },

  // 6 — swamp
  {
    id: 'swamp', name: 'Swamp', temp: 0.8, humid: 0.9,
    grassTint: [0.48, 0.52, 0.24], foliageTint: [0.40, 0.46, 0.20], waterTint: [0.20, 0.32, 0.22],
    skyTop: [0.30, 0.46, 0.72], skyHorizon: [0.50, 0.60, 0.72], fogColor: [0.42, 0.52, 0.52],
    fogDensity: 1.3,
    surface: { top: 'grass_block', filler: 'dirt', fillerDepth: 3, underwater: 'clay' },
    heightBase: 62, heightVar: 4,
    trees: [{ block: 'oak', weight: 10, size: 'large' }], treeDensity: 0.02,
    plants: [
      { block: 'tall_grass', weight: 10, tries: 5 },
      { block: 'brown_mushroom', weight: 4, tries: 3 },
      { block: 'red_mushroom', weight: 2, tries: 2 },
      { block: 'lily_pad', weight: 5, tries: 3 },
    ],
    features: ['clay_patch', 'pond'],
    mobs: {
      passive: [
        { id: 'frog', weight: 8, group: [2, 4] },
        { id: 'turtle', weight: 3, group: [2, 3] },
      ],
      hostile: [
        { id: 'zombie', weight: 10, group: [1, 3] },
        { id: 'skeleton', weight: 8, group: [1, 3] },
        { id: 'creeper', weight: 6, group: [1, 2] },
        { id: 'witch', weight: 4, group: [1, 1] },
        { id: 'slime', weight: 6, group: [1, 3] },
      ],
      water: [
        { id: 'squid', weight: 4, group: [2, 4] },
      ],
    },
    snow: false, rain: true, temperatureCategory: 'temperate',
    structures: [{ id: 'swamp_hut', chance: 0.004 }],
  },

  // 7 — mountains
  {
    id: 'mountains', name: 'Mountains', temp: 0.2, humid: 0.3,
    grassTint: [0.48, 0.62, 0.36], foliageTint: [0.42, 0.56, 0.30], waterTint: [0.18, 0.40, 0.82],
    skyTop: [0.34, 0.54, 0.88], skyHorizon: [0.62, 0.74, 0.94], fogColor: [0.72, 0.80, 0.95],
    fogDensity: 0.9,
    surface: { top: 'grass_block', filler: 'dirt', fillerDepth: 3, underwater: 'gravel' },
    heightBase: 88, heightVar: 22,
    trees: [{ block: 'spruce', weight: 8, size: 'normal' }], treeDensity: 0.012,
    plants: [
      { block: 'tall_grass', weight: 4, tries: 2 },
      { block: 'poppy', weight: 2, tries: 1 },
    ],
    features: ['boulder'],
    mobs: {
      passive: [
        { id: 'goat', weight: 8, group: [2, 4] },
        { id: 'rabbit', weight: 3, group: [2, 3] },
      ],
      hostile: [
        { id: 'zombie', weight: 8, group: [1, 3] },
        { id: 'skeleton', weight: 10, group: [1, 3] },
        { id: 'creeper', weight: 6, group: [1, 2] },
      ],
      water: [],
    },
    snow: true, rain: false, temperatureCategory: 'cold',
    structures: [],
  },

  // 8 — badlands
  {
    id: 'badlands', name: 'Badlands', temp: 2.0, humid: 0.0,
    grassTint: [0.72, 0.50, 0.24], foliageTint: [0.68, 0.44, 0.20], waterTint: [0.30, 0.54, 0.86],
    skyTop: [0.48, 0.58, 0.82], skyHorizon: [0.76, 0.72, 0.80], fogColor: [0.80, 0.72, 0.64],
    fogDensity: 0.9,
    surface: { top: 'red_sand', filler: 'orange_terracotta', fillerDepth: 4, underwater: 'red_sand' },
    heightBase: 70, heightVar: 12,
    trees: [], treeDensity: 0.0,
    plants: [
      { block: 'dead_bush', weight: 6, tries: 3 },
    ],
    features: [],
    mobs: {
      passive: [],
      hostile: [
        { id: 'zombie', weight: 10, group: [1, 3] },
        { id: 'skeleton', weight: 8, group: [1, 3] },
        { id: 'husk', weight: 10, group: [1, 3] },
        { id: 'creeper', weight: 6, group: [1, 2] },
      ],
      water: [],
    },
    snow: false, rain: false, temperatureCategory: 'hot',
    structures: [{ id: 'mineshaft', chance: 0.005 }],
  },

  // 9 — ocean
  {
    id: 'ocean', name: 'Ocean', temp: 0.5, humid: 0.5,
    grassTint: [0.46, 0.64, 0.36], foliageTint: [0.40, 0.60, 0.30], waterTint: [0.10, 0.28, 0.78],
    skyTop: [0.24, 0.44, 0.82], skyHorizon: [0.50, 0.64, 0.90], fogColor: [0.34, 0.52, 0.82],
    fogDensity: 1.0,
    surface: { top: 'sand', filler: 'sand', fillerDepth: 3, underwater: 'gravel' },
    heightBase: 46, heightVar: 8,
    trees: [], treeDensity: 0.0,
    plants: [
      { block: 'seagrass', weight: 10, tries: 6 },
      { block: 'kelp', weight: 6, tries: 4 },
    ],
    features: [],
    mobs: {
      passive: [
        { id: 'cod', weight: 8, group: [3, 6] },
        { id: 'squid', weight: 6, group: [2, 4] },
        { id: 'dolphin', weight: 4, group: [1, 3] },
      ],
      hostile: [
        { id: 'drowned', weight: 8, group: [1, 2] },
        { id: 'guardian', weight: 3, group: [1, 2] },
      ],
      water: [
        { id: 'cod', weight: 8, group: [3, 6] },
        { id: 'squid', weight: 6, group: [2, 4] },
      ],
    },
    snow: false, rain: true, temperatureCategory: 'temperate',
    structures: [{ id: 'ocean_monument', chance: 0.001 }, { id: 'shipwreck', chance: 0.003 }],
  },

  // 10 — beach
  {
    id: 'beach', name: 'Beach', temp: 0.8, humid: 0.4,
    grassTint: [0.64, 0.74, 0.44], foliageTint: [0.58, 0.68, 0.38], waterTint: [0.20, 0.44, 0.82],
    skyTop: [0.36, 0.56, 0.88], skyHorizon: [0.64, 0.76, 0.94], fogColor: [0.74, 0.82, 0.96],
    fogDensity: 1.0,
    surface: { top: 'sand', filler: 'sand', fillerDepth: 3, underwater: 'sand' },
    heightBase: 63, heightVar: 2,
    trees: [], treeDensity: 0.0,
    plants: [],
    features: [],
    mobs: {
      passive: [
        { id: 'turtle', weight: 6, group: [2, 4] },
      ],
      hostile: [
        { id: 'drowned', weight: 6, group: [1, 2] },
      ],
      water: [
        { id: 'cod', weight: 6, group: [2, 4] },
      ],
    },
    snow: false, rain: true, temperatureCategory: 'temperate',
    structures: [],
  },

  // 11 — mushroom_island
  {
    id: 'mushroom_island', name: 'Mushroom Island', temp: 0.9, humid: 1.0,
    grassTint: [0.70, 0.64, 0.78], foliageTint: [0.64, 0.58, 0.72], waterTint: [0.22, 0.44, 0.80],
    skyTop: [0.32, 0.50, 0.82], skyHorizon: [0.60, 0.70, 0.90], fogColor: [0.68, 0.72, 0.90],
    fogDensity: 1.0,
    surface: { top: 'mycelium', filler: 'dirt', fillerDepth: 3, underwater: 'clay' },
    heightBase: 70, heightVar: 6,
    trees: [], treeDensity: 0.0,
    plants: [
      { block: 'brown_mushroom', weight: 8, tries: 5 },
      { block: 'red_mushroom', weight: 6, tries: 4 },
    ],
    features: [],
    mobs: {
      passive: [
        { id: 'mooshroom', weight: 12, group: [2, 4] },
      ],
      hostile: [],
      water: [],
    },
    snow: false, rain: true, temperatureCategory: 'temperate',
    structures: [],
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Map biome string id to index. */
const BIOME_ID_MAP = new Map(BIOMES.map((b, i) => [b.id, i]));

/** @param {string} name @returns {number} numeric biome id */
export function biomeIdByName(name) {
  const id = BIOME_ID_MAP.get(name);
  if (id === undefined) throw new Error(`Unknown biome: ${name}`);
  return id;
}

/** @param {number} id @returns {object} biome definition object */
export function biomeById(id) {
  return BIOMES[id] || BIOMES[0];
}

// ---------------------------------------------------------------------------
// Biome selection — Whittaker-style climate lookup
// ---------------------------------------------------------------------------

/**
 * Pure function mapping climate parameters to a biome index.
 * @param {number} temp       0..1 temperature
 * @param {number} humid      0..1 humidity
 * @param {number} continent  0..1 continental scale
 * @param {number} erosion    0..1 erosion factor
 * @param {number} ridge      0..1 ridged mountain noise
 * @param {number} height     raw terrain height estimate (blocks)
 * @param {number} seaLevel   sea level block Y
 * @returns {number} biome index into BIOMES array
 */
export function selectBiome(temp, humid, continent, erosion, ridge, height, seaLevel) {
  // --- Ocean / shore / island check (continental mask) ---
  if (continent < 0.40) {
    // Deep ocean — rare mushroom island on very isolated peaks with high weirdness
    if (continent > 0.34 && ridge > 0.78 && humid > 0.75) {
      return 11; // mushroom_island
    }
    return 9; // ocean
  }

  if (continent < 0.52) {
    return 10; // beach
  }

  // --- Mountains: high ridge + high elevation + low erosion ---
  if (ridge > 0.58 && height > 76 && erosion < 0.45) {
    return 7; // mountains
  }

  // --- Temperature-based classification (split into 4 zones) ---
  // temp: 0=freezing, 1=hot
  const tempZone = temp < 0.25 ? 0 : temp < 0.55 ? 1 : temp < 0.75 ? 2 : 3;
  // humid: 0=arid, 1=wet
  const humidZone = humid < 0.20 ? 0 : humid < 0.42 ? 1 : humid < 0.65 ? 2 : 3;

  // Cold (tempZone 0)
  if (tempZone === 0) {
    return 3; // snowy_taiga
  }

  // Cool-temperate (tempZone 1)
  if (tempZone === 1) {
    if (humidZone === 0) return 0; // plains (dry-temperate)
    if (humidZone === 1) return 0; // plains
    if (humidZone === 2) {
      // swamp in very flat low areas
      if (erosion < 0.38 && height < 66) return 6; // swamp
      return 1; // forest
    }
    // humidZone 3 wet
    if (erosion < 0.35 && height < 66) return 6; // swamp
    return 1; // forest
  }

  // Warm-temperate (tempZone 2)
  if (tempZone === 2) {
    if (humidZone === 0) return 2; // desert-like
    if (humidZone === 1) return 0; // plains
    if (humidZone === 2) return 1; // forest
    // wet warm
    if (erosion < 0.35 && height < 66) return 6; // swamp
    return 1; // forest
  }

  // Hot (tempZone 3)
  if (humidZone === 0) {
    // Hot + very dry = desert or badlands
    if (erosion > 0.58) return 8; // badlands (eroded hot land)
    return 2; // desert
  }
  if (humidZone === 1) {
    // Hot + dry = savanna
    return 5; // savanna
  }
  if (humidZone === 2) {
    // Hot + moderate = savanna or jungle fringe
    return 5; // savanna
  }
  // Hot + wet = jungle
  return 4; // jungle
}

// ---------------------------------------------------------------------------
// Tint tables for hot path mesher access
// ---------------------------------------------------------------------------

/** Flat Float32Array: 3 floats per biome, [r0,g0,b0, r1,g1,b1, ...] */
const BIOME_buildTintTable = (field) => {
  const arr = new Float32Array(BIOMES.length * 3);
  for (let i = 0; i < BIOMES.length; i++) {
    const c = BIOMES[i][field];
    arr[i * 3 + 0] = c[0];
    arr[i * 3 + 1] = c[1];
    arr[i * 3 + 2] = c[2];
  }
  return arr;
};

export const BIOME_TINT_TABLES = {
  grass: BIOME_buildTintTable('grassTint'),
  foliage: BIOME_buildTintTable('foliageTint'),
  water: BIOME_buildTintTable('waterTint'),
};

/** Returns [r, g, b] grass tint for biome by numeric id. */
export function grassTintOf(id) {
  const base = (id | 0) * 3;
  const t = BIOME_TINT_TABLES.grass;
  return [t[base], t[base + 1], t[base + 2]];
}

/** Returns [r, g, b] foliage tint for biome by numeric id. */
export function foliageTintOf(id) {
  const base = (id | 0) * 3;
  const t = BIOME_TINT_TABLES.foliage;
  return [t[base], t[base + 1], t[base + 2]];
}

/** Returns [r, g, b] water tint for biome by numeric id. */
export function waterTintOf(id) {
  const base = (id | 0) * 3;
  const t = BIOME_TINT_TABLES.water;
  return [t[base], t[base + 1], t[base + 2]];
}

/** Provider object compatible with what the Mesher expects. */
export const BIOME_TINT_PROVIDER = {
  grassTint: grassTintOf,
  foliageTint: foliageTintOf,
  waterTint: waterTintOf,
};
