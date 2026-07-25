// ---------------------------------------------------------------------------
// Structure generator — all 14 structure types + loot tables.
// All top-level names prefixed STRUCT_ for concatenation safety.
// ---------------------------------------------------------------------------

import { makeRng, hash3i } from '../core/rng.js';

// ---------------------------------------------------------------------------
// LOOT TABLES
// ---------------------------------------------------------------------------
export const LOOT_TABLES = {
  dungeon: [
    { item: 'saddle',           min: 1, max: 1, weight: 10 },
    { item: 'iron_ingot',       min: 1, max: 4, weight: 10 },
    { item: 'bread',            min: 1, max: 3, weight: 15 },
    { item: 'wheat',            min: 1, max: 4, weight: 15 },
    { item: 'gunpowder',        min: 1, max: 4, weight: 10 },
    { item: 'string',           min: 1, max: 4, weight: 10 },
    { item: 'name_tag',         min: 1, max: 1, weight: 5  },
    { item: 'golden_apple',     min: 1, max: 1, weight: 3  },
    { item: 'diamond',          min: 1, max: 3, weight: 2  },
    { item: 'iron_pickaxe',     min: 1, max: 1, weight: 4  },
    { item: 'bucket',           min: 1, max: 1, weight: 6  },
    { item: 'name_tag',         min: 1, max: 1, weight: 1  },
    { item: 'rotten_flesh',     min: 1, max: 4, weight: 20 },
    { item: 'bone',             min: 1, max: 4, weight: 20 },
  ],
  desert_temple: [
    { item: 'diamond',          min: 1, max: 3, weight: 5  },
    { item: 'iron_ingot',       min: 1, max: 5, weight: 15 },
    { item: 'gold_ingot',       min: 2, max: 7, weight: 10 },
    { item: 'emerald',          min: 1, max: 3, weight: 8  },
    { item: 'bone',             min: 4, max: 6, weight: 25 },
    { item: 'rotten_flesh',     min: 1, max: 4, weight: 25 },
    { item: 'gunpowder',        min: 1, max: 4, weight: 20 },
    { item: 'saddle',           min: 1, max: 1, weight: 10 },
    { item: 'iron_boots',       min: 1, max: 1, weight: 4  },
    { item: 'golden_apple',     min: 1, max: 1, weight: 3  },
    { item: 'diamond',          min: 1, max: 2, weight: 2  },
  ],
  jungle_temple: [
    { item: 'diamond',          min: 1, max: 3, weight: 3  },
    { item: 'iron_ingot',       min: 1, max: 5, weight: 15 },
    { item: 'gold_ingot',       min: 2, max: 7, weight: 8  },
    { item: 'emerald',          min: 1, max: 3, weight: 5  },
    { item: 'bone',             min: 4, max: 6, weight: 20 },
    { item: 'rotten_flesh',     min: 1, max: 4, weight: 20 },
    { item: 'bamboo',           min: 1, max: 3, weight: 15 },
    { item: 'saddle',           min: 1, max: 1, weight: 8  },
    { item: 'iron_pickaxe',     min: 1, max: 1, weight: 6  },
    { item: 'golden_apple',     min: 1, max: 1, weight: 4  },
  ],
  mineshaft: [
    { item: 'rail',             min: 4, max: 8, weight: 20 },
    { item: 'iron_ingot',       min: 1, max: 5, weight: 15 },
    { item: 'coal',             min: 3, max: 8, weight: 20 },
    { item: 'gold_ingot',       min: 1, max: 3, weight: 5  },
    { item: 'diamond',          min: 1, max: 2, weight: 2  },
    { item: 'iron_pickaxe',     min: 1, max: 1, weight: 5  },
    { item: 'bread',            min: 1, max: 3, weight: 15 },
    { item: 'string',           min: 1, max: 4, weight: 15 },
    { item: 'redstone',         min: 4, max: 9, weight: 10 },
    { item: 'lapis_lazuli',     min: 4, max: 9, weight: 8  },
    { item: 'name_tag',         min: 1, max: 1, weight: 3  },
    { item: 'melon_seeds',      min: 1, max: 4, weight: 10 },
    { item: 'pumpkin_seeds',    min: 1, max: 4, weight: 10 },
  ],
  stronghold_library: [
    { item: 'book',             min: 1, max: 3, weight: 30 },
    { item: 'paper',            min: 2, max: 7, weight: 20 },
    { item: 'compass',          min: 1, max: 1, weight: 5  },
    { item: 'map',              min: 1, max: 1, weight: 5  },
    { item: 'iron_ingot',       min: 1, max: 5, weight: 10 },
    { item: 'ender_pearl',      min: 1, max: 2, weight: 8  },
    { item: 'diamond',          min: 1, max: 3, weight: 2  },
    { item: 'golden_apple',     min: 1, max: 1, weight: 2  },
    { item: 'ender_pearl',      min: 1, max: 2, weight: 8  },
  ],
  stronghold_corridor: [
    { item: 'ender_pearl',      min: 1, max: 3, weight: 15 },
    { item: 'ender_eye',        min: 1, max: 2, weight: 8  },
    { item: 'iron_ingot',       min: 1, max: 5, weight: 15 },
    { item: 'gold_ingot',       min: 1, max: 3, weight: 8  },
    { item: 'diamond',          min: 1, max: 3, weight: 4  },
    { item: 'iron_sword',       min: 1, max: 1, weight: 6  },
    { item: 'iron_pickaxe',     min: 1, max: 1, weight: 5  },
    { item: 'iron_chestplate',  min: 1, max: 1, weight: 4  },
    { item: 'bread',            min: 1, max: 3, weight: 20 },
    { item: 'apple',            min: 1, max: 3, weight: 15 },
  ],
  nether_fortress: [
    { item: 'nether_wart',      min: 3, max: 7, weight: 25 },
    { item: 'gold_ingot',       min: 1, max: 3, weight: 15 },
    { item: 'saddle',           min: 1, max: 1, weight: 8  },
    { item: 'blaze_rod',        min: 1, max: 3, weight: 10 },
    { item: 'ghast_tear',       min: 1, max: 2, weight: 5  },
    { item: 'magma_cream',      min: 1, max: 3, weight: 10 },
    { item: 'iron_boots',       min: 1, max: 1, weight: 8  },
    { item: 'golden_sword',     min: 1, max: 1, weight: 8  },
    { item: 'flint_and_steel',  min: 1, max: 1, weight: 6  },
    { item: 'iron_ingot',       min: 1, max: 5, weight: 15 },
    { item: 'diamond',          min: 1, max: 1, weight: 2  },
  ],
  bastion: [
    { item: 'gold_ingot',       min: 4, max: 9, weight: 20 },
    { item: 'gold_nugget',      min: 4, max: 8, weight: 25 },
    { item: 'iron_ingot',       min: 1, max: 6, weight: 10 },
    { item: 'netherite_scrap',  min: 1, max: 1, weight: 3  },
    { item: 'diamond',          min: 1, max: 1, weight: 4  },
    { item: 'iron_sword',       min: 1, max: 1, weight: 8  },
    { item: 'crossbow',         min: 1, max: 1, weight: 8  },
    { item: 'saddle',           min: 1, max: 1, weight: 8  },
    { item: 'iron_boots',       min: 1, max: 1, weight: 8  },
    { item: 'iron_helmet',      min: 1, max: 1, weight: 6  },
    { item: 'gold_nugget',      min: 2, max: 5, weight: 12 },
    { item: 'bone',             min: 1, max: 4, weight: 15 },
    { item: 'ender_pearl',      min: 1, max: 2, weight: 6  },
  ],
  end_city: [
    { item: 'iron_ingot',       min: 1, max: 4, weight: 15 },
    { item: 'gold_ingot',       min: 1, max: 3, weight: 10 },
    { item: 'diamond',          min: 2, max: 7, weight: 8  },
    { item: 'emerald',          min: 2, max: 6, weight: 8  },
    { item: 'diamond_sword',    min: 1, max: 1, weight: 5  },
    { item: 'diamond_pickaxe',  min: 1, max: 1, weight: 4  },
    { item: 'diamond_chestplate', min: 1, max: 1, weight: 4  },
    { item: 'diamond_leggings', min: 1, max: 1, weight: 4  },
    { item: 'diamond_boots',    min: 1, max: 1, weight: 4  },
    { item: 'diamond_helmet',   min: 1, max: 1, weight: 4  },
    { item: 'elytra',           min: 1, max: 1, weight: 2  },
    { item: 'shulker_shell',    min: 1, max: 2, weight: 8  },
    { item: 'ender_pearl',      min: 4, max: 8, weight: 10 },
  ],
  village_house: [
    { item: 'bread',            min: 1, max: 3, weight: 30 },
    { item: 'apple',            min: 1, max: 3, weight: 25 },
    { item: 'wheat',            min: 1, max: 7, weight: 20 },
    { item: 'coal',             min: 1, max: 4, weight: 15 },
    { item: 'iron_ingot',       min: 1, max: 3, weight: 10 },
    { item: 'wheat_seeds',      min: 1, max: 4, weight: 15 },
    { item: 'carrot',           min: 1, max: 3, weight: 12 },
    { item: 'potato',           min: 1, max: 3, weight: 12 },
  ],
  village_blacksmith: [
    { item: 'iron_ingot',       min: 1, max: 5, weight: 20 },
    { item: 'gold_ingot',       min: 1, max: 3, weight: 8  },
    { item: 'bread',            min: 1, max: 3, weight: 20 },
    { item: 'apple',            min: 1, max: 3, weight: 15 },
    { item: 'iron_pickaxe',     min: 1, max: 1, weight: 10 },
    { item: 'iron_sword',       min: 1, max: 1, weight: 8  },
    { item: 'iron_chestplate',  min: 1, max: 1, weight: 5  },
    { item: 'diamond',          min: 1, max: 3, weight: 4  },
    { item: 'obsidian',         min: 1, max: 3, weight: 5  },
    { item: 'flint',            min: 1, max: 3, weight: 10 },
    { item: 'saddle',           min: 1, max: 1, weight: 6  },
  ],
  ruined_portal: [
    { item: 'gold_ingot',       min: 1, max: 3, weight: 15 },
    { item: 'gold_nugget',      min: 4, max: 9, weight: 20 },
    { item: 'golden_sword',     min: 1, max: 1, weight: 8  },
    { item: 'golden_axe',       min: 1, max: 1, weight: 8  },
    { item: 'golden_helmet',    min: 1, max: 1, weight: 6  },
    { item: 'golden_apple',     min: 1, max: 1, weight: 4  },
    { item: 'flint',            min: 1, max: 4, weight: 12 },
    { item: 'obsidian',         min: 1, max: 2, weight: 8  },
    { item: 'iron_ingot',       min: 1, max: 4, weight: 12 },
    { item: 'flint_and_steel',  min: 1, max: 1, weight: 8  },
    { item: 'gunpowder',        min: 1, max: 3, weight: 6  },
  ],
  woodland_mansion: [
    { item: 'diamond',          min: 1, max: 4, weight: 5  },
    { item: 'iron_ingot',       min: 1, max: 5, weight: 15 },
    { item: 'gold_ingot',       min: 1, max: 4, weight: 10 },
    { item: 'diamond_sword',    min: 1, max: 1, weight: 4  },
    { item: 'diamond_chestplate', min: 1, max: 1, weight: 3  },
    { item: 'bread',            min: 1, max: 3, weight: 25 },
    { item: 'totem_of_undying', min: 1, max: 1, weight: 2  },
    { item: 'iron_pickaxe',     min: 1, max: 1, weight: 8  },
    { item: 'name_tag',         min: 1, max: 1, weight: 5  },
    { item: 'lead',             min: 1, max: 3, weight: 8  },
    { item: 'golden_apple',     min: 1, max: 1, weight: 6  },
    { item: 'ender_pearl',      min: 1, max: 4, weight: 8  },
  ],
  ocean_monument: [
    { item: 'prismarine_shard', min: 4, max: 8, weight: 25 },
    { item: 'prismarine_crystals', min: 2, max: 5, weight: 20 },
    { item: 'iron_ingot',       min: 1, max: 5, weight: 15 },
    { item: 'gold_ingot',       min: 1, max: 4, weight: 10 },
    { item: 'diamond',          min: 1, max: 3, weight: 5  },
    { item: 'cod',              min: 1, max: 4, weight: 20 },
    { item: 'salmon',           min: 1, max: 3, weight: 15 },
    { item: 'sponge',           min: 1, max: 2, weight: 10 },
    { item: 'gold_block',       min: 1, max: 1, weight: 2  },
  ],
  witch_hut: [
    { item: 'spider_eye',       min: 1, max: 3, weight: 25 },
    { item: 'sugar',            min: 1, max: 3, weight: 20 },
    { item: 'glowstone_dust',   min: 1, max: 3, weight: 15 },
    { item: 'gunpowder',        min: 1, max: 3, weight: 15 },
    { item: 'redstone',         min: 1, max: 3, weight: 15 },
    { item: 'nether_wart',      min: 1, max: 3, weight: 10 },
    { item: 'slime_ball',       min: 1, max: 3, weight: 10 },
    { item: 'bone',             min: 1, max: 4, weight: 15 },
    { item: 'feather',          min: 1, max: 3, weight: 10 },
  ],
};

// ---------------------------------------------------------------------------
// rollLoot — pick items from a loot table
// ---------------------------------------------------------------------------
export function rollLoot(tableName, rng, rolls) {
  const table = LOOT_TABLES[tableName];
  if (!table) return [];
  const result = [];
  const numRolls = rolls != null ? rolls : rng.range(3, 7);
  for (let i = 0; i < numRolls; i++) {
    const total = table.reduce((s, e) => s + e.weight, 0);
    let r = rng.next() * total;
    for (const entry of table) {
      r -= entry.weight;
      if (r <= 0) {
        const count = entry.min + Math.floor(rng.next() * (entry.max - entry.min + 1));
        result.push({ item: entry.item, count });
        break;
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// fillChest — set a chest block and populate its inventory
// ---------------------------------------------------------------------------
export function fillChest(world, x, y, z, tableName, rng) {
  if (world.setBlock) world.setBlock(x, y, z, 'chest', { noUpdate: true });
  const items = rollLoot(tableName, rng, rng.range(3, 8));
  const slots = new Array(27).fill(null);
  // Place items in random slots
  const usedSlots = new Set();
  for (const item of items) {
    let slot;
    let tries = 0;
    do { slot = rng.int(27); tries++; } while (usedSlots.has(slot) && tries < 50);
    if (!usedSlots.has(slot)) {
      slots[slot] = { item: item.item, count: item.count };
      usedSlots.add(slot);
    }
  }
  // Store inventory on block entity
  if (world.setBlockEntity) {
    world.setBlockEntity(x, y, z, { type: 'chest', inventory: slots });
  }
  return slots;
}

// ---------------------------------------------------------------------------
// STRUCTURE_SPACING — minimum chunk distance between same-type structures
// ---------------------------------------------------------------------------
export const STRUCTURE_SPACING = {
  village:          32,
  desert_temple:    24,
  jungle_temple:    24,
  ruined_portal:    16,
  dungeon:          8,
  mineshaft:        20,
  stronghold:       48,
  nether_fortress:  32,
  ocean_monument:   32,
  woodland_mansion: 48,
  witch_hut:        16,
  bastion_remnant:  32,
  end_city:         20,
  stone_boulder:    4,
  pond:             6,
  iceberg:          10,
};

// Biome allowlists for each structure type
const STRUCT_BIOME_ALLOW = {
  village:          ['plains', 'forest', 'desert', 'savanna', 'snowy_taiga'],
  desert_temple:    ['desert', 'badlands'],
  jungle_temple:    ['jungle'],
  ruined_portal:    ['plains', 'forest', 'desert', 'nether', 'mountains', 'swamp'],
  dungeon:          ['plains', 'forest', 'desert', 'savanna', 'snowy_taiga', 'jungle', 'mountains', 'swamp'],
  mineshaft:        ['plains', 'forest', 'desert', 'savanna', 'snowy_taiga', 'jungle', 'mountains', 'swamp', 'badlands'],
  stronghold:       ['plains', 'forest', 'desert', 'savanna', 'snowy_taiga', 'jungle', 'mountains', 'swamp'],
  nether_fortress:  ['nether'],
  ocean_monument:   ['ocean'],
  woodland_mansion: ['forest'],
  witch_hut:        ['swamp'],
  bastion_remnant:  ['nether'],
  end_city:         ['end'],
  stone_boulder:    ['plains', 'forest', 'mountains', 'snowy_taiga'],
  pond:             ['plains', 'forest', 'swamp', 'savanna'],
  iceberg:          ['ocean', 'snowy_taiga'],
};

// ---------------------------------------------------------------------------
// structureAt — deterministic grid-with-jitter placement
// ---------------------------------------------------------------------------
export function structureAt(seed, cx, cz, biome) {
  const results = [];
  for (const [type, spacing] of Object.entries(STRUCTURE_SPACING)) {
    const allowed = STRUCT_BIOME_ALLOW[type];
    if (biome && allowed && !allowed.includes(biome)) continue;
    // Each structure type gets its own sub-seed.
    const typeSeed = (seed ^ (hash3i(type.charCodeAt(0), type.charCodeAt(1) | 0, type.charCodeAt(2) | 0, 0x9e3779b9) >>> 0)) >>> 0;
    // Which grid cell does this chunk fall into?
    const gridX = Math.floor(cx / spacing);
    const gridZ = Math.floor(cz / spacing);
    // Place structure exactly at the center of the grid cell (+ small per-seed offset
    // that is the SAME for all chunks in the same cell, so no spacing violation).
    // The center is guaranteed to be >= spacing/2 from any edge, so min inter-structure
    // distance on each axis is spacing. We add a tiny hash-based offset (0 or 1) just
    // for visual variety, but only within [0, 0] so spacing is never violated.
    const targetCX = gridX * spacing + (spacing >> 1);
    const targetCZ = gridZ * spacing + (spacing >> 1);
    if (targetCX === cx && targetCZ === cz) {
      results.push({ type, cx, cz });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// LOW-LEVEL WORLD WRITE HELPERS
// ---------------------------------------------------------------------------
function STRUCT_setBlock(world, x, y, z, block) {
  if (x < 0 || y < 0 || y > 127 || z < 0) return;
  if (world.setBlock) world.setBlock(x, y, z, block, { noUpdate: true });
  else if (world._blocks) {
    const bx = x & 15, bz = z & 15;
    const idx = bx + bz * 16 + y * 256;
    world._blocks[idx] = block;
    world._blockCount = (world._blockCount || 0) + 1;
  }
}

function STRUCT_fill(world, x1, y1, z1, x2, y2, z2, block) {
  for (let y = y1; y <= y2; y++)
    for (let z = z1; z <= z2; z++)
      for (let x = x1; x <= x2; x++)
        STRUCT_setBlock(world, x, y, z, block);
}

function STRUCT_hollow(world, x1, y1, z1, x2, y2, z2, wall, interior) {
  for (let y = y1; y <= y2; y++)
    for (let z = z1; z <= z2; z++)
      for (let x = x1; x <= x2; x++) {
        const edge = x===x1||x===x2||y===y1||y===y2||z===z1||z===z2;
        STRUCT_setBlock(world, x, y, z, edge ? wall : interior);
      }
}

// ---------------------------------------------------------------------------
// STRUCTURE BUILDERS
// ---------------------------------------------------------------------------
const STRUCT_BUILDERS = {};

// ---- VILLAGE ---------------------------------------------------------------
STRUCT_BUILDERS.village = function(world, ox, oy, oz, rng, biome) {
  const mat = STRUCT_villageMat(biome);
  // Plaza
  STRUCT_fill(world, ox - 4, oy, oz - 4, ox + 4, oy, oz + 4, mat.path);
  // Roads in 4 directions
  for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    for (let i = 1; i <= 12; i++) {
      const rx = ox + dx * i, rz = oz + dz * i;
      STRUCT_fill(world, rx - 1, oy, rz - 1, rx + 1, oy, rz + 1, mat.path);
    }
  }
  // Houses
  const templates = [STRUCT_houseSmall, STRUCT_houseLarge, STRUCT_houseBlacksmith];
  const positions = [[8, 8], [-8, 8], [8, -8], [-8, -8], [14, 0], [-14, 0], [0, 14], [0, -14]];
  const numHouses = rng.range(4, 8);
  for (let i = 0; i < Math.min(numHouses, positions.length); i++) {
    const [px, pz] = positions[i];
    const tmpl = rng.pick(templates);
    tmpl(world, ox + px, oy, oz + pz, rng, mat);
  }
  // Farm plots
  for (let fp = 0; fp < 2; fp++) {
    const fx = ox + rng.range(-16, 16), fz = oz + rng.range(-16, 16);
    STRUCT_fill(world, fx, oy, fz, fx + 6, oy, fz + 4, 'farmland');
    STRUCT_setBlock(world, fx + 3, oy, fz - 1, 'water');
    for (let cx = fx; cx <= fx + 6; cx++)
      for (let cz = fz; cz <= fz + 4; cz++)
        STRUCT_setBlock(world, cx, oy + 1, cz, 'wheat_7');
  }
  // Lamp posts
  for (let lp = 0; lp < 4; lp++) {
    const lx = ox + rng.range(-10, 10), lz = oz + rng.range(-10, 10);
    STRUCT_setBlock(world, lx, oy + 1, lz, mat.fence);
    STRUCT_setBlock(world, lx, oy + 2, lz, mat.fence);
    STRUCT_setBlock(world, lx, oy + 3, lz, 'torch');
  }
  // Spawn villagers
  const numVillagers = rng.range(4, 10);
  for (let v = 0; v < numVillagers; v++) {
    const vx = ox + rng.range(-8, 8), vz = oz + rng.range(-8, 8);
    if (world.spawnEntity) world.spawnEntity('villager', vx + 0.5, oy + 1, vz + 0.5, {});
  }
  if (world.spawnEntity) world.spawnEntity('iron_golem', ox + 0.5, oy + 1, oz + 0.5, {});
};

function STRUCT_villageMat(biome) {
  if (biome === 'desert' || biome === 'badlands') return { wall: 'sandstone', roof: 'cut_sandstone', path: 'sand', fence: 'oak_fence', floor: 'sandstone' };
  if (biome === 'snowy_taiga') return { wall: 'spruce_planks', roof: 'spruce_planks_slab', path: 'dirt_path', fence: 'spruce_fence', floor: 'spruce_planks' };
  if (biome === 'savanna') return { wall: 'acacia_planks', roof: 'acacia_planks_slab', path: 'dirt_path', fence: 'acacia_fence', floor: 'acacia_planks' };
  return { wall: 'oak_planks', roof: 'oak_planks_slab', path: 'dirt_path', fence: 'oak_fence', floor: 'oak_planks' };
}

function STRUCT_houseSmall(world, ox, oy, oz, rng, mat) {
  STRUCT_fill(world, ox, oy, oz, ox + 5, oy, oz + 5, mat.floor);
  STRUCT_hollow(world, ox, oy + 1, oz, ox + 5, oy + 3, oz + 5, mat.wall, 'air');
  // Roof slabs
  STRUCT_fill(world, ox, oy + 4, oz, ox + 5, oy + 4, oz + 5, mat.roof);
  STRUCT_setBlock(world, ox + 2, oy + 1, oz, 'air'); // door
  STRUCT_setBlock(world, ox + 2, oy + 2, oz, 'air');
}

function STRUCT_houseLarge(world, ox, oy, oz, rng, mat) {
  STRUCT_fill(world, ox, oy, oz, ox + 7, oy, oz + 7, mat.floor);
  STRUCT_hollow(world, ox, oy + 1, oz, ox + 7, oy + 4, oz + 7, mat.wall, 'air');
  STRUCT_fill(world, ox, oy + 5, oz, ox + 7, oy + 5, oz + 7, mat.roof);
  // Porch
  STRUCT_fill(world, ox, oy + 1, oz - 2, ox + 7, oy + 1, oz - 1, mat.floor);
  STRUCT_fill(world, ox, oy + 2, oz - 2, ox + 7, oy + 2, oz - 2, mat.roof);
  STRUCT_setBlock(world, ox + 3, oy + 1, oz, 'air');
  STRUCT_setBlock(world, ox + 3, oy + 2, oz, 'air');
  STRUCT_setBlock(world, ox + 4, oy + 1, oz, 'air');
  STRUCT_setBlock(world, ox + 4, oy + 2, oz, 'air');
}

function STRUCT_houseBlacksmith(world, ox, oy, oz, rng, mat) {
  STRUCT_fill(world, ox, oy, oz, ox + 6, oy, oz + 6, 'cobblestone');
  STRUCT_hollow(world, ox, oy + 1, oz, ox + 6, oy + 4, oz + 6, 'cobblestone', 'air');
  STRUCT_fill(world, ox, oy + 5, oz, ox + 6, oy + 5, oz + 6, 'cobblestone_slab');
  STRUCT_setBlock(world, ox + 1, oy + 1, oz + 1, 'furnace');
  STRUCT_setBlock(world, ox + 1, oy + 1, oz + 2, 'furnace');
  STRUCT_setBlock(world, ox + 4, oy + 2, oz + 1, 'air'); // window
  // Loot chest
  fillChest(world, ox + 2, oy + 1, oz + 2, 'village_blacksmith', rng);
  STRUCT_setBlock(world, ox + 3, oy + 1, oz, 'air');
  STRUCT_setBlock(world, ox + 3, oy + 2, oz, 'air');
}

// ---- DESERT TEMPLE ---------------------------------------------------------
STRUCT_BUILDERS.desert_temple = function(world, ox, oy, oz, rng) {
  const H = 8;
  // Sandstone pyramid
  for (let layer = 0; layer < H; layer++) {
    const r = H - layer;
    STRUCT_fill(world, ox - r, oy + layer, oz - r, ox + r, oy + layer, oz + r, 'sandstone');
    if (layer > 0) STRUCT_fill(world, ox - r + 1, oy + layer, oz - r + 1, ox + r - 1, oy + layer, oz + r - 1, 'air');
  }
  // Top
  STRUCT_fill(world, ox - 1, oy + H, oz - 1, ox + 1, oy + H, oz + 1, 'sandstone');
  // Hidden chamber below pyramid
  const cy = oy - 5;
  STRUCT_hollow(world, ox - 5, cy, oz - 5, ox + 5, cy + 5, oz + 5, 'sandstone', 'air');
  // 4 chests
  fillChest(world, ox - 3, cy + 1, oz - 3, 'desert_temple', rng);
  fillChest(world, ox + 3, cy + 1, oz - 3, 'desert_temple', rng);
  fillChest(world, ox - 3, cy + 1, oz + 3, 'desert_temple', rng);
  fillChest(world, ox + 3, cy + 1, oz + 3, 'desert_temple', rng);
  // TNT trap
  STRUCT_setBlock(world, ox, cy + 1, oz, 'tnt');
  // Pressure plate marker (just a block of sandstone above TNT at surface level)
  STRUCT_setBlock(world, ox, oy + 1, oz, 'chiseled_sandstone');
  // Decorated walls
  STRUCT_fill(world, ox - 5, cy, oz - 5, ox + 5, cy, oz + 5, 'orange_terracotta');
};

// ---- JUNGLE TEMPLE ---------------------------------------------------------
STRUCT_BUILDERS.jungle_temple = function(world, ox, oy, oz, rng) {
  // Mossy cobble structure
  STRUCT_hollow(world, ox, oy, oz, ox + 10, oy + 8, oz + 8, 'mossy_cobblestone', 'air');
  // Overgrown with vine on exterior
  for (let y = oy; y <= oy + 8; y++) {
    for (let z = oz; z <= oz + 8; z++) {
      if (rng.chance(0.25)) STRUCT_setBlock(world, ox - 1, y, z, 'vine');
      if (rng.chance(0.25)) STRUCT_setBlock(world, ox + 11, y, z, 'vine');
    }
  }
  // 2 chests
  fillChest(world, ox + 2, oy + 1, oz + 2, 'jungle_temple', rng);
  fillChest(world, ox + 8, oy + 1, oz + 6, 'jungle_temple', rng);
  // Hidden corridor
  STRUCT_fill(world, ox + 2, oy + 1, oz + 4, ox + 2, oy + 2, oz + 7, 'air');
  // Entry
  STRUCT_setBlock(world, ox + 5, oy + 1, oz, 'air');
  STRUCT_setBlock(world, ox + 5, oy + 2, oz, 'air');
  STRUCT_setBlock(world, ox + 5, oy + 3, oz, 'air');
  // Cobwebs
  for (let i = 0; i < 6; i++) {
    STRUCT_setBlock(world, ox + rng.range(1, 9), oy + rng.range(1, 7), oz + rng.range(1, 7), 'cobweb');
  }
};

// ---- RUINED PORTAL ---------------------------------------------------------
STRUCT_BUILDERS.ruined_portal = function(world, ox, oy, oz, rng) {
  // Partial obsidian frame (4x5 inner, some blocks missing)
  const frame = [
    [ox, oy, oz], [ox + 1, oy, oz], [ox + 2, oy, oz], [ox + 3, oy, oz],
    [ox, oy + 1, oz], [ox + 3, oy + 1, oz],
    [ox, oy + 2, oz], [ox + 3, oy + 2, oz],
    [ox, oy + 3, oz], [ox + 3, oy + 3, oz],
    [ox, oy + 4, oz], [ox + 1, oy + 4, oz], [ox + 2, oy + 4, oz], [ox + 3, oy + 4, oz],
  ];
  for (const [x, y, z] of frame) {
    if (rng.chance(0.75)) STRUCT_setBlock(world, x, y, z, 'obsidian');
    else STRUCT_setBlock(world, x, y, z, 'netherrack');
  }
  // Gold blocks and netherrack around the base
  STRUCT_fill(world, ox - 1, oy - 1, oz - 1, ox + 4, oy - 1, oz + 1, 'netherrack');
  for (let i = 0; i < 3; i++) STRUCT_setBlock(world, ox + rng.range(-1, 4), oy, oz + 1, 'gold_block');
  // Lava pool
  STRUCT_setBlock(world, ox + 1, oy - 1, oz, 'lava');
  STRUCT_setBlock(world, ox + 2, oy - 1, oz, 'lava');
  // Loot chest
  fillChest(world, ox + 5, oy, oz, 'ruined_portal', rng);
};

// ---- DUNGEON ---------------------------------------------------------------
STRUCT_BUILDERS.dungeon = function(world, ox, oy, oz, rng) {
  const w = rng.range(7, 11), d = rng.range(7, 11);
  STRUCT_hollow(world, ox, oy, oz, ox + w, oy + 4, oz + d, 'cobblestone', 'air');
  // Mix in mossy cobblestone
  for (let x = ox; x <= ox + w; x++)
    for (let z = oz; z <= oz + d; z++)
      for (let y = oy; y <= oy + 4; y++)
        if (rng.chance(0.25)) STRUCT_setBlock(world, x, y, z, 'mossy_cobblestone');
  // Spawner in center
  STRUCT_setBlock(world, ox + Math.floor(w / 2), oy + 1, oz + Math.floor(d / 2), 'spawner');
  // Chests (1-3)
  const numChests = rng.range(1, 3);
  const chestPositions = [[ox + 1, oy + 1, oz + 1], [ox + w - 1, oy + 1, oz + 1], [ox + 1, oy + 1, oz + d - 1]];
  for (let c = 0; c < numChests; c++) {
    const [cx, cy, cz] = chestPositions[c];
    fillChest(world, cx, cy, cz, 'dungeon', rng);
  }
  // Cobwebs
  for (let i = 0; i < 5; i++) {
    STRUCT_setBlock(world, ox + rng.range(1, w - 1), oy + rng.range(1, 3), oz + rng.range(1, d - 1), 'cobweb');
  }
};

// ---- MINESHAFT -------------------------------------------------------------
STRUCT_BUILDERS.mineshaft = function(world, ox, oy, oz, rng) {
  const corridors = rng.range(3, 7);
  STRUCT_mineCorridors(world, ox, oy, oz, rng, corridors, 0);
};

function STRUCT_mineCorridors(world, ox, oy, oz, rng, remaining, depth) {
  if (remaining <= 0 || depth > 4) return;
  const len = rng.range(8, 16);
  const dir = rng.int(4); // 0=+x, 1=-x, 2=+z, 3=-z
  const dx = dir === 0 ? 1 : dir === 1 ? -1 : 0;
  const dz = dir === 2 ? 1 : dir === 3 ? -1 : 0;

  for (let i = 0; i < len; i++) {
    const x = ox + dx * i, z = oz + dz * i;
    // Corridor 3 wide
    for (let s = -1; s <= 1; s++) {
      const sx = x + (dz !== 0 ? s : 0), sz = z + (dx !== 0 ? s : 0);
      STRUCT_setBlock(world, sx, oy, sz, 'oak_planks');
      STRUCT_setBlock(world, sx, oy + 1, sz, 'air');
      STRUCT_setBlock(world, sx, oy + 2, sz, 'air');
      STRUCT_setBlock(world, sx, oy + 3, sz, 'air');
    }
    // Support beams every 4 blocks
    if (i % 4 === 2) {
      STRUCT_setBlock(world, x + (dz !== 0 ? -1 : 0), oy + 1, z + (dx !== 0 ? -1 : 0), 'oak_fence');
      STRUCT_setBlock(world, x + (dz !== 0 ? -1 : 0), oy + 2, z + (dx !== 0 ? -1 : 0), 'oak_fence');
      STRUCT_setBlock(world, x + (dz !== 0 ? 1 : 0), oy + 1, z + (dx !== 0 ? 1 : 0), 'oak_fence');
      STRUCT_setBlock(world, x + (dz !== 0 ? 1 : 0), oy + 2, z + (dx !== 0 ? 1 : 0), 'oak_fence');
    }
    // Rails on floor
    STRUCT_setBlock(world, x, oy + 1, z, 'rail');
    // Cobwebs occasionally
    if (rng.chance(0.08)) STRUCT_setBlock(world, x, oy + 3, z, 'cobweb');
  }
  // Chest at end
  if (rng.chance(0.4)) fillChest(world, ox + dx * (len - 1), oy + 1, oz + dz * (len - 1), 'mineshaft', rng);
  // Branch
  if (remaining > 1 && rng.chance(0.6)) {
    const bx = ox + dx * rng.range(3, len - 3);
    const bz = oz + dz * rng.range(3, len - 3);
    STRUCT_mineCorridors(world, bx, oy + rng.range(-2, 2), bz, rng, remaining - 1, depth + 1);
  }
};

// ---- STRONGHOLD ------------------------------------------------------------
STRUCT_BUILDERS.stronghold = function(world, ox, oy, oz, rng) {
  // Library room
  const lx = ox, ly = oy, lz = oz;
  STRUCT_hollow(world, lx, ly, lz, lx + 12, ly + 6, lz + 10, 'stone_bricks', 'air');
  // Cracked and mossy variants
  for (let x = lx; x <= lx + 12; x++)
    for (let z = lz; z <= lz + 10; z++)
      for (let y = ly; y <= ly + 6; y++) {
        if (rng.chance(0.15)) STRUCT_setBlock(world, x, y, z, 'cracked_stone_bricks');
        else if (rng.chance(0.1)) STRUCT_setBlock(world, x, y, z, 'mossy_stone_bricks');
      }
  // Bookshelves lining library walls
  for (let x = lx + 1; x <= lx + 11; x++) {
    STRUCT_setBlock(world, x, ly + 1, lz + 1, 'bookshelf');
    STRUCT_setBlock(world, x, ly + 2, lz + 1, 'bookshelf');
    STRUCT_setBlock(world, x, ly + 1, lz + 9, 'bookshelf');
    STRUCT_setBlock(world, x, ly + 2, lz + 9, 'bookshelf');
  }
  fillChest(world, lx + 5, ly + 1, lz + 5, 'stronghold_library', rng);
  fillChest(world, lx + 7, ly + 1, lz + 5, 'stronghold_corridor', rng);

  // Corridors
  STRUCT_fill(world, lx + 13, ly + 1, lz + 4, lx + 20, ly + 4, lz + 6, 'air');
  for (let x = lx + 13; x <= lx + 20; x++) STRUCT_setBlock(world, x, ly, lz + 5, 'stone_bricks');
  for (let x = lx + 13; x <= lx + 20; x++) STRUCT_setBlock(world, x, ly + 5, lz + 5, 'stone_bricks');

  // End portal room
  const epx = ox + 22, eply = oy - 2, epz = oz + 3;
  STRUCT_hollow(world, epx - 2, eply - 2, epz - 2, epx + 7, eply + 6, epz + 7, 'stone_bricks', 'air');
  // Lava moat
  STRUCT_fill(world, epx - 1, eply - 1, epz - 1, epx + 6, eply - 1, epz + 6, 'lava');
  STRUCT_fill(world, epx, eply - 1, epz, epx + 5, eply - 1, epz + 5, 'air');
  // End portal frame ring (12 blocks around 3x3)
  const pfx = epx + 1, pfz = epz + 1;
  // Bottom row
  for (let i = 0; i < 3; i++) {
    STRUCT_setBlock(world, pfx + i, eply, pfz - 1, 'end_portal_frame');
    STRUCT_setBlock(world, pfx + i, eply, pfz + 3, 'end_portal_frame');
    STRUCT_setBlock(world, pfx - 1, eply, pfz + i, 'end_portal_frame');
    STRUCT_setBlock(world, pfx + 3, eply, pfz + i, 'end_portal_frame');
  }
  // Some eyes filled (random)
  for (let i = 0; i < 5; i++) STRUCT_setBlock(world, pfx + rng.int(4) - 1, eply + 1, pfz + rng.int(4) - 1, 'end_portal_frame');
};

// ---- NETHER FORTRESS -------------------------------------------------------
STRUCT_BUILDERS.nether_fortress = function(world, ox, oy, oz, rng) {
  // Main bridge walkway
  STRUCT_fill(world, ox, oy, oz, ox + 24, oy, oz + 4, 'nether_bricks');
  STRUCT_fill(world, ox, oy + 1, oz, ox + 24, oy + 1, oz, 'nether_bricks');
  STRUCT_fill(world, ox, oy + 1, oz + 4, ox + 24, oy + 1, oz + 4, 'nether_bricks');
  // Arches
  for (let ax = 4; ax <= 20; ax += 8) {
    for (let ay = 1; ay <= 4; ay++) {
      STRUCT_setBlock(world, ox + ax, oy + ay, oz, 'nether_bricks');
      STRUCT_setBlock(world, ox + ax, oy + ay, oz + 4, 'nether_bricks');
    }
    STRUCT_setBlock(world, ox + ax, oy + 5, oz + 2, 'nether_bricks');
  }
  // Blaze spawner room
  const brx = ox + 12, brz = oz + 8;
  STRUCT_hollow(world, brx, oy, brz, brx + 8, oy + 5, brz + 8, 'nether_bricks', 'air');
  STRUCT_setBlock(world, brx + 4, oy + 1, brz + 4, 'spawner');
  // Nether wart farm
  const wfx = ox + 2, wfz = oz + 7;
  STRUCT_fill(world, wfx, oy, wfz, wfx + 4, oy, wfz + 4, 'soul_sand');
  for (let wx = wfx; wx <= wfx + 4; wx++)
    for (let wz = wfz; wz <= wfz + 4; wz++)
      STRUCT_setBlock(world, wx, oy + 1, wz, 'nether_wart');
  // Loot
  fillChest(world, brx + 1, oy + 1, brz + 1, 'nether_fortress', rng);
};

// ---- OCEAN MONUMENT --------------------------------------------------------
STRUCT_BUILDERS.ocean_monument = function(world, ox, oy, oz, rng) {
  // Main hall
  STRUCT_hollow(world, ox, oy, oz, ox + 18, oy + 10, oz + 18, 'prismarine', 'water');
  // Dark prismarine pillars
  for (const [px, pz] of [[2, 2], [16, 2], [2, 16], [16, 16]]) {
    STRUCT_fill(world, ox + px, oy, oz + pz, ox + px + 1, oy + 10, oz + pz + 1, 'dark_prismarine');
  }
  // Sea lanterns
  for (let x = ox + 4; x <= ox + 14; x += 5) {
    for (let z = oz + 4; z <= oz + 14; z += 5) {
      STRUCT_setBlock(world, x, oy + 9, z, 'sea_lantern');
    }
  }
  // Prismarine bricks roof
  STRUCT_fill(world, ox, oy + 10, oz, ox + 18, oy + 10, oz + 18, 'prismarine_bricks');
  // Wings
  STRUCT_hollow(world, ox - 8, oy + 2, oz + 5, ox, oy + 6, oz + 13, 'prismarine', 'water');
  STRUCT_hollow(world, ox + 18, oy + 2, oz + 5, ox + 26, oy + 6, oz + 13, 'prismarine', 'water');
  // Loot
  fillChest(world, ox + 9, oy + 1, oz + 9, 'ocean_monument', rng);
  // Spawns
  if (world.spawnEntity) {
    world.spawnEntity('guardian', ox + 5, oy + 2, oz + 5, {});
    world.spawnEntity('guardian', ox + 13, oy + 2, oz + 5, {});
    world.spawnEntity('guardian', ox + 5, oy + 2, oz + 13, {});
    world.spawnEntity('elder_guardian', ox + 9, oy + 5, oz + 9, {});
  }
};

// ---- WOODLAND MANSION ------------------------------------------------------
STRUCT_BUILDERS.woodland_mansion = function(world, ox, oy, oz, rng) {
  const W = 20, D = 20;
  // Ground floor
  STRUCT_hollow(world, ox, oy, oz, ox + W, oy + 5, oz + D, 'dark_oak_planks', 'air');
  STRUCT_fill(world, ox, oy, oz, ox + W, oy, oz + D, 'dark_oak_planks');
  // Second floor
  STRUCT_hollow(world, ox, oy + 6, oz, ox + W, oy + 10, oz + D, 'dark_oak_planks', 'air');
  STRUCT_fill(world, ox, oy + 6, oz, ox + W, oy + 6, oz + D, 'dark_oak_planks');
  // Roof
  STRUCT_fill(world, ox, oy + 11, oz, ox + W, oy + 11, oz + D, 'dark_oak_planks_slab');
  // Interior rooms (ground)
  STRUCT_fill(world, ox + 10, oy + 1, oz, ox + 10, oy + 5, oz + D, 'dark_oak_planks');
  STRUCT_fill(world, ox, oy + 1, oz + 10, ox + 10, oy + 5, oz + 10, 'dark_oak_planks');
  // Chest and loot
  fillChest(world, ox + 5, oy + 1, oz + 5, 'woodland_mansion', rng);
  fillChest(world, ox + 15, oy + 1, oz + 5, 'woodland_mansion', rng);
  fillChest(world, ox + 5, oy + 7, oz + 5, 'woodland_mansion', rng);
  // Entry
  STRUCT_setBlock(world, ox + 10, oy + 1, oz, 'air');
  STRUCT_setBlock(world, ox + 10, oy + 2, oz, 'air');
  STRUCT_setBlock(world, ox + 10, oy + 3, oz, 'air');
  // Spawn mobs
  if (world.spawnEntity) {
    for (let i = 0; i < 3; i++) world.spawnEntity('vindicator', ox + rng.range(2, W - 2), oy + 1, oz + rng.range(2, D - 2), {});
    for (let i = 0; i < 2; i++) world.spawnEntity('evoker', ox + rng.range(2, W - 2), oy + 7, oz + rng.range(2, D - 2), {});
  }
};

// ---- WITCH HUT -------------------------------------------------------------
STRUCT_BUILDERS.witch_hut = function(world, ox, oy, oz, rng) {
  // Stilts (oak fence legs)
  for (const [sx, sz] of [[0, 0], [4, 0], [0, 4], [4, 4]]) {
    for (let y = oy - 3; y <= oy; y++) STRUCT_setBlock(world, ox + sx, y, oz + sz, 'oak_fence');
  }
  // Floor
  STRUCT_fill(world, ox, oy + 1, oz, ox + 4, oy + 1, oz + 4, 'spruce_planks');
  // Walls
  STRUCT_hollow(world, ox, oy + 2, oz, ox + 4, oy + 4, oz + 4, 'spruce_planks', 'air');
  // Roof
  STRUCT_fill(world, ox - 1, oy + 5, oz - 1, ox + 5, oy + 5, oz + 5, 'spruce_planks_slab');
  // Cauldron
  STRUCT_setBlock(world, ox + 2, oy + 2, oz + 2, 'cauldron');
  // Spawn witch
  if (world.spawnEntity) world.spawnEntity('witch', ox + 2.5, oy + 2, oz + 2.5, {});
};

// ---- BASTION REMNANT -------------------------------------------------------
STRUCT_BUILDERS.bastion_remnant = function(world, ox, oy, oz, rng) {
  // Main blackstone block structure
  STRUCT_hollow(world, ox, oy, oz, ox + 16, oy + 8, oz + 16, 'blackstone', 'air');
  // Gilded blackstone sections
  for (let x = ox + 2; x <= ox + 14; x += 3)
    for (let z = oz + 2; z <= oz + 14; z += 3)
      STRUCT_setBlock(world, x, oy + 4, z, 'gilded_blackstone');
  // Polished blackstone bricks
  for (let x = ox; x <= ox + 16; x++) {
    STRUCT_setBlock(world, x, oy + 8, oz, 'polished_blackstone_bricks');
    STRUCT_setBlock(world, x, oy + 8, oz + 16, 'polished_blackstone_bricks');
  }
  // Loot chests
  fillChest(world, ox + 3, oy + 1, oz + 3, 'bastion', rng);
  fillChest(world, ox + 13, oy + 1, oz + 13, 'bastion', rng);
  fillChest(world, ox + 3, oy + 5, oz + 13, 'bastion', rng);
  // Spawn piglins
  if (world.spawnEntity) {
    for (let i = 0; i < 4; i++) world.spawnEntity('piglin', ox + rng.range(2, 14), oy + 1, oz + rng.range(2, 14), {});
    world.spawnEntity('piglin_brute', ox + 8, oy + 1, oz + 8, {});
  }
};

// ---- END CITY --------------------------------------------------------------
STRUCT_BUILDERS.end_city = function(world, ox, oy, oz, rng) {
  // Main purpur tower
  STRUCT_hollow(world, ox, oy, oz, ox + 8, oy + 20, oz + 8, 'purpur_block', 'air');
  // End stone bricks base
  STRUCT_fill(world, ox - 1, oy - 1, oz - 1, ox + 9, oy - 1, oz + 9, 'end_stone_bricks');
  // Sea lanterns on corners
  for (const [cx, cz] of [[0, 0], [8, 0], [0, 8], [8, 8]]) {
    STRUCT_setBlock(world, ox + cx, oy + 10, oz + cz, 'sea_lantern');
    STRUCT_setBlock(world, ox + cx, oy + 20, oz + cz, 'sea_lantern');
  }
  // Purpur pillar
  for (let y = oy; y <= oy + 20; y += 4) {
    STRUCT_setBlock(world, ox + 4, y, oz + 4, 'purpur_pillar');
  }
  // Side tower
  const stx = ox + 10;
  STRUCT_hollow(world, stx, oy + 8, oz, stx + 5, oy + 16, oz + 5, 'purpur_block', 'air');
  fillChest(world, stx + 2, oy + 9, oz + 2, 'end_city', rng);
  fillChest(world, ox + 4, oy + 1, oz + 4, 'end_city', rng);
  // Spawn shulkers
  if (world.spawnEntity) {
    for (let i = 0; i < 3; i++) world.spawnEntity('shulker', ox + rng.range(1, 7), oy + rng.range(2, 18), oz + rng.range(1, 7), {});
  }
};

// ---- STONE BOULDER ---------------------------------------------------------
STRUCT_BUILDERS.stone_boulder = function(world, ox, oy, oz, rng) {
  const r = rng.range(2, 4);
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++)
      for (let dz = -r; dz <= r; dz++)
        if (dx * dx + dy * dy + dz * dz <= r * r + r * 0.5)
          STRUCT_setBlock(world, ox + dx, oy + dy, oz + dz,
            rng.chance(0.3) ? 'mossy_cobblestone' : 'stone');
};

// ---- POND ------------------------------------------------------------------
STRUCT_BUILDERS.pond = function(world, ox, oy, oz, rng) {
  const r = rng.range(3, 5);
  for (let dx = -r; dx <= r; dx++)
    for (let dz = -r; dz <= r; dz++) {
      const d2 = dx * dx + dz * dz;
      if (d2 <= r * r) {
        STRUCT_setBlock(world, ox + dx, oy, oz + dz, 'water');
        STRUCT_setBlock(world, ox + dx, oy - 1, oz + dz, 'gravel');
        STRUCT_setBlock(world, ox + dx, oy - 2, oz + dz, 'gravel');
      }
    }
};

// ---- ICEBERG ---------------------------------------------------------------
STRUCT_BUILDERS.iceberg = function(world, ox, oy, oz, rng) {
  const H = rng.range(4, 9);
  for (let dy = 0; dy <= H; dy++) {
    const r = Math.max(1, Math.floor((H - dy) * 1.5));
    for (let dx = -r; dx <= r; dx++)
      for (let dz = -r; dz <= r; dz++)
        if (dx * dx + dz * dz <= r * r)
          STRUCT_setBlock(world, ox + dx, oy + dy, oz + dz,
            rng.chance(0.3) ? 'packed_ice' : 'blue_ice');
  }
  // Submerged base
  for (let dy = -3; dy < 0; dy++) {
    const r = 4;
    for (let dx = -r; dx <= r; dx++)
      for (let dz = -r; dz <= r; dz++)
        if (dx * dx + dz * dz <= r * r)
          STRUCT_setBlock(world, ox + dx, oy + dy, oz + dz, 'packed_ice');
  }
};

// ---------------------------------------------------------------------------
// StructureGenerator class
// ---------------------------------------------------------------------------
export class StructureGenerator {
  constructor(seed, registry, flags) {
    this._seed = seed || 0xdeadf00d;
    this._registry = registry;
    this._flags = flags;
  }

  placeFor(world, chunk, biome) {
    const biomeId = biome ? biome.id : 'plains';
    const cx = chunk ? (chunk.cx || chunk.x || 0) : 0;
    const cz = chunk ? (chunk.cz || chunk.z || 0) : 0;
    const structs = structureAt(this._seed, cx, cz, biomeId);
    for (const { type } of structs) {
      const builder = STRUCT_BUILDERS[type];
      if (!builder) continue;
      const rng = makeRng(this._seed ^ hash3i(cx, 0, cz, type.charCodeAt(0)));
      const ox = cx * 16 + rng.range(2, 10);
      const oz = cz * 16 + rng.range(2, 10);
      const oy = world.heightAt ? world.heightAt(ox, oz) : 64;
      try { builder(world, ox, oy, oz, rng, biomeId); } catch (e) { /* ignore placement errors */ }
    }
  }
}
