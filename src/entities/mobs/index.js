// ---------------------------------------------------------------------------
// Mob definitions index — aggregates all groups, builds lookup tables.
// All top-level names prefixed MOBIDX_ for concatenation safety.
// ---------------------------------------------------------------------------

import { MOB_DEFS_PASSIVEA } from './passiveA.js';
import { MOB_DEFS_PASSIVEB } from './passiveB.js';
import { MOB_DEFS_AQUATIC  } from './aquatic.js';
import { MOB_DEFS_NEUTRAL  } from './neutral.js';
import { MOB_DEFS_HOSTILEA } from './hostileA.js';
import { MOB_DEFS_HOSTILEB } from './hostileB.js';
import { MOB_DEFS_BOSSES   } from './bosses.js';

// ---------------------------------------------------------------------------
// ALL_MOB_DEFS — full roster (77 mobs + 2 bosses = 79 total)
// ---------------------------------------------------------------------------
export const ALL_MOB_DEFS = [
  ...MOB_DEFS_PASSIVEA,
  ...MOB_DEFS_PASSIVEB,
  ...MOB_DEFS_AQUATIC,
  ...MOB_DEFS_NEUTRAL,
  ...MOB_DEFS_HOSTILEA,
  ...MOB_DEFS_HOSTILEB,
  ...MOB_DEFS_BOSSES,
];

// ---------------------------------------------------------------------------
// MOB_BY_ID — fast O(1) lookup by string id
// ---------------------------------------------------------------------------
export const MOB_BY_ID = new Map(ALL_MOB_DEFS.map((d) => [d.id, d]));

// ---------------------------------------------------------------------------
// getMobDef — throws on unknown id (fail-fast for dev)
// ---------------------------------------------------------------------------
export function getMobDef(id) {
  const def = MOB_BY_ID.get(id);
  if (!def) throw new Error(`Unknown mob id: '${id}'`);
  return def;
}

// ---------------------------------------------------------------------------
// mobsForBiome — returns all mob defs that can spawn in a given biome,
// optionally filtered by dimension and/or category.
//
// @param {string}  biomeId   — biome string id, e.g. 'plains'
// @param {string}  [dimension] — 'overworld'|'nether'|'end' (omit = any)
// @param {string}  [category]  — 'passive'|'neutral'|'hostile'|'boss' (omit = any)
// @returns {Array<object>}
// ---------------------------------------------------------------------------
export function mobsForBiome(biomeId, dimension, category) {
  const results = [];
  for (const def of ALL_MOB_DEFS) {
    if (!def.spawn) continue;
    if (dimension && def.spawn.dimension !== dimension) continue;
    if (category && def.category !== category) continue;
    const b = def.spawn.biomes;
    if (b === 'any' || (Array.isArray(b) && b.includes(biomeId))) {
      results.push(def);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// mobsByCategory — returns all mob defs for a given category string.
// ---------------------------------------------------------------------------
export function mobsByCategory(cat) {
  return ALL_MOB_DEFS.filter((d) => d.category === cat);
}

// ---------------------------------------------------------------------------
// SPAWN_TABLES — precomputed dimension -> biomeId -> category -> [{def, weight}]
// Built once at module load so the SpawnManager hot path is purely array-lookup.
// ---------------------------------------------------------------------------

const MOBIDX_VALID_BIOMES = [
  'plains', 'forest', 'desert', 'snowy_taiga', 'jungle',
  'savanna', 'swamp', 'mountains', 'badlands', 'ocean',
  'beach', 'mushroom_island',
];
const MOBIDX_VALID_DIMS  = ['overworld', 'nether', 'end'];
const MOBIDX_VALID_CATS  = ['passive', 'neutral', 'hostile', 'ambient'];

function MOBIDX_buildSpawnTables() {
  const tables = {};
  for (const dim of MOBIDX_VALID_DIMS) {
    tables[dim] = {};
    for (const biome of MOBIDX_VALID_BIOMES) {
      tables[dim][biome] = {};
      for (const cat of MOBIDX_VALID_CATS) {
        tables[dim][biome][cat] = [];
      }
    }
  }

  for (const def of ALL_MOB_DEFS) {
    if (!def.spawn) continue;
    const { dimension, biomes, weight, cap } = def.spawn;
    // cap maps to category bucket for spawn table lookup
    // 'water' and 'ambient' mobs also go into their own bucket;
    // passive & hostile go directly under those keys.
    const bucket = cap || def.category;
    if (!MOBIDX_VALID_CATS.includes(bucket)) continue;
    if (!MOBIDX_VALID_DIMS.includes(dimension)) continue;
    const entry = { def, weight };
    if (biomes === 'any') {
      for (const biome of MOBIDX_VALID_BIOMES) {
        const arr = tables[dimension][biome][bucket];
        if (arr) arr.push(entry);
      }
    } else {
      for (const biome of biomes) {
        if (!MOBIDX_VALID_BIOMES.includes(biome)) continue;
        const arr = tables[dimension][biome][bucket];
        if (arr) arr.push(entry);
      }
    }
  }
  return tables;
}

export const SPAWN_TABLES = MOBIDX_buildSpawnTables();

// ---------------------------------------------------------------------------
// MOB_SOUND_NAMES — deduplicated sorted array of every sound name referenced
// across all mob definitions. The audio synth file (src/audio/sfx.js) must
// implement a function for each of these names.
// ---------------------------------------------------------------------------
function MOBIDX_collectSoundNames() {
  const set = new Set();
  for (const def of ALL_MOB_DEFS) {
    if (!def.sounds) continue;
    for (const name of Object.values(def.sounds)) {
      if (typeof name === 'string') set.add(name);
    }
  }
  return [...set].sort();
}

export const MOB_SOUND_NAMES = MOBIDX_collectSoundNames();
