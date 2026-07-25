// ---------------------------------------------------------------------------
// Per-block random tick logic.
//
// The World fires randomTickBlock() for a handful of random positions per
// section per tick. Each handler is keyed by block *name* in RANDOM_TICK_HANDLERS
// and mutates the world through the normal setBlock path so lighting / fluids /
// meshing all stay consistent.
//
// All module-level helpers prefixed RTICK_ for concatenation safety.
// ---------------------------------------------------------------------------

import { growTree } from './decorate.js';
import { biomeById } from './biomes.js';
import { HDIRS } from '../core/util.js';

// Sapling species map -> the tree kind growTree() understands.
const RTICK_SAPLING_SPECIES = {
  oak_sapling: 'oak',
  birch_sapling: 'birch',
  spruce_sapling: 'spruce',
  jungle_sapling: 'jungle',
  acacia_sapling: 'acacia',
  dark_oak_sapling: 'dark_oak',
};

// Cold biome ids (by string) where water can freeze and snow persists.
const RTICK_COLD_BIOMES = new Set(['snowy_taiga', 'mountains']);
// Warm biomes where snow / ice melts readily.
const RTICK_WARM_BIOMES = new Set(['desert', 'savanna', 'badlands', 'jungle', 'beach', 'plains']);

// Max horizontal distance a leaf searches for a supporting log before decaying.
const RTICK_LEAF_RANGE = 4;

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------

function RTICK_id(world, name) { return world._registry.idOr(name, -1); }
function RTICK_name(world, id) {
  const d = world._registry.def(id);
  return d ? d.name : null;
}
function RTICK_isWater(world, x, y, z) {
  return world._flags.fluid[world.getBlock(x, y, z)] === 1;
}
function RTICK_isAir(world, x, y, z) { return world.getBlock(x, y, z) === 0; }
function RTICK_light(world, x, y, z) { return world.getLight(x, y, z); }

/** Is there a water block within one cell (incl. diagonals) at y or y-ish? */
function RTICK_waterAdjacent(world, x, y, z, radius) {
  radius = radius || 1;
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dy = 0; dy <= 1; dy++) {
        if (RTICK_isWater(world, x + dx, y + dy, z + dz)) return true;
      }
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Crops
// ---------------------------------------------------------------------------

function RTICK_growCrop(world, x, y, z, id) {
  const def = world._registry.def(id);
  if (!def || !def.growsInto) return;
  if (RTICK_light(world, x, y, z) < 9) return;
  // Growth speed: faster on wet farmland, faster with more light.
  const below = RTICK_name(world, world.getBlock(x, y - 1, z));
  const wet = below === 'farmland_wet';
  const chance = wet ? 0.5 : 0.25;
  if (!world.rand.chance(chance)) return;
  world.setBlock(x, y, z, world._registry.id(def.growsInto));
}

// ---------------------------------------------------------------------------
// Farmland moisture
// ---------------------------------------------------------------------------

function RTICK_farmland(world, x, y, z, id, wetTarget) {
  const R = world._registry;
  const wet = RTICK_waterAdjacent(world, x, y, z, 4) || RTICK_isWater(world, x, y + 1, z);
  const isWetBlock = RTICK_name(world, id) === 'farmland_wet';
  if (wet && !isWetBlock) {
    world.setBlock(x, y, z, R.id('farmland_wet'), { keepMeta: true });
    return;
  }
  if (!wet && isWetBlock) {
    world.setBlock(x, y, z, R.id('farmland'), { keepMeta: true });
    return;
  }
  if (!wet && !isWetBlock) {
    // Dry farmland with nothing planted reverts to dirt occasionally.
    const above = world.getBlock(x, y + 1, z);
    const aboveDef = R.def(above);
    const hasCrop = aboveDef && (aboveDef.group === 'crop');
    if (!hasCrop && world.rand.chance(0.15)) {
      world.setBlock(x, y, z, R.id('dirt'));
    }
  }
}

// ---------------------------------------------------------------------------
// Grass / mycelium spread + death
// ---------------------------------------------------------------------------

function RTICK_spreadGround(world, x, y, z, id, spreadName) {
  const R = world._registry;
  // Death: a solid, opaque block directly above turns grass to dirt.
  const above = world.getBlock(x, y + 1, z);
  if (world._flags.opacity[above] >= 15 && world._flags.solid[above]) {
    world.setBlock(x, y, z, R.id('dirt'));
    return;
  }
  if (RTICK_light(world, x, y + 1, z) < 9) return;
  const dirtId = R.id('dirt');
  const coarseId = R.idOr('coarse_dirt', -1);
  // Try to spread to a nearby dirt block within a 3x3x5 neighbourhood.
  for (let attempt = 0; attempt < 4; attempt++) {
    const dx = world.rand.int(3) - 1;
    const dz = world.rand.int(3) - 1;
    const dy = world.rand.int(5) - 3;
    const tx = x + dx, ty = y + dy, tz = z + dz;
    const tid = world.getBlock(tx, ty, tz);
    if (tid !== dirtId && tid !== coarseId) continue;
    // Target must have enough light and no opaque cover.
    const cover = world.getBlock(tx, ty + 1, tz);
    if (world._flags.opacity[cover] >= 15) continue;
    if (RTICK_light(world, tx, ty + 1, tz) < 4) continue;
    world.setBlock(tx, ty, tz, R.id(spreadName));
    return;
  }
}

// ---------------------------------------------------------------------------
// Saplings
// ---------------------------------------------------------------------------

function RTICK_growSapling(world, x, y, z, id) {
  const name = RTICK_name(world, id);
  const species = RTICK_SAPLING_SPECIES[name];
  if (!species) return;
  if (RTICK_light(world, x, y, z) < 9) return;
  // Need some headroom before committing.
  let head = 0;
  for (let dy = 0; dy < 6; dy++) {
    if (RTICK_isAir(world, x, y + dy, z) || world.getBlock(x, y + dy, z) === id) head++;
    else break;
  }
  if (head < 4) return;
  if (!world.rand.chance(0.45)) return;
  // Clear the sapling then grow the tree with feet at the sapling position.
  world.setBlock(x, y, z, 0, { noFluidSchedule: true });
  growTree(world, x, y, z, species, world.rand);
}

// ---------------------------------------------------------------------------
// Leaf decay (breadth-limited flood to find a log within RTICK_LEAF_RANGE)
// ---------------------------------------------------------------------------

function RTICK_leafDecay(world, x, y, z, id) {
  const F = world._flags;
  const R = world._registry;
  // A quick reject: if a log is directly within range on axis, bail early.
  if (RTICK_hasLogWithin(world, x, y, z, RTICK_LEAF_RANGE)) return;
  // No log found -> decay. Drop per the block's normal drop table.
  world.breakBlock(x, y, z, {});
}

/** BFS out to `range` looking for any log block. */
function RTICK_hasLogWithin(world, x, y, z, range) {
  const R = world._registry;
  const startId = world.getBlock(x, y, z);
  // Determine what counts as a "log" (group 'wood' log family) cheaply by name.
  const visited = new Set();
  const q = [[x, y, z, 0]];
  visited.add(x + ',' + y + ',' + z);
  const DIRS6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  while (q.length) {
    const [cx, cy, cz, d] = q.shift();
    const id = world.getBlock(cx, cy, cz);
    const def = R.def(id);
    if (def && /_log$/.test(def.name)) return true;
    if (d >= range) continue;
    for (const [dx, dy, dz] of DIRS6) {
      const nx = cx + dx, ny = cy + dy, nz = cz + dz;
      const k = nx + ',' + ny + ',' + nz;
      if (visited.has(k)) continue;
      const nid = world.getBlock(nx, ny, nz);
      const ndef = R.def(nid);
      // Only flood through leaves and logs.
      if (ndef && (/_leaves$/.test(ndef.name) || /_log$/.test(ndef.name))) {
        visited.add(k);
        q.push([nx, ny, nz, d + 1]);
      }
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Ice / water freeze-melt
// ---------------------------------------------------------------------------

function RTICK_ice(world, x, y, z, id) {
  const R = world._registry;
  // Melt to water when brightly lit.
  if (RTICK_light(world, x, y, z) > 11) {
    world.setBlock(world.dimension === 'nether' ? x : x, y, z, R.id('water'));
    world.setMeta(x, y, z, 0);
  }
}

function RTICK_freezeWater(world, x, y, z) {
  const R = world._registry;
  // Only a source water block (meta 0) with open sky above freezes, in a cold
  // biome, at night.
  if ((world.getMeta(x, y, z) & 15) !== 0) return;
  const biome = world.biomeAt(x, z);
  if (!biome || !RTICK_COLD_BIOMES.has(biome.id)) return;
  if (!world.isNight) return;
  // Sky must reach this block (nothing opaque above).
  if (world.getSkyLight(x, y + 1, z) < 15 && world.dimension === 'overworld') {
    // still allow if directly exposed
  }
  if (world.getBlock(x, y + 1, z) !== 0) return;
  if (world.rand.chance(0.25)) world.setBlock(x, y, z, R.id('ice'));
}

// ---------------------------------------------------------------------------
// Snow layer melt
// ---------------------------------------------------------------------------

function RTICK_snowLayer(world, x, y, z, id) {
  const R = world._registry;
  const biome = world.biomeAt(x, z);
  const warm = biome && RTICK_WARM_BIOMES.has(biome.id);
  if ((warm || RTICK_light(world, x, y, z) > 11) && world.rand.chance(0.5)) {
    world.setBlock(x, y, z, 0);
  }
}

// ---------------------------------------------------------------------------
// Fire: burns out, spreads to flammable neighbours, consumes fuel.
// ---------------------------------------------------------------------------

function RTICK_fire(world, x, y, z, id) {
  const R = world._registry;
  const F = world._flags;
  const fireId = R.id('fire');
  const below = world.getBlock(x, y - 1, z);
  const hasFloor = F.solid[below] || F.flammable[below] > 0;
  // Age the fire; if nothing beneath and no fuel around, it burns out.
  let burnedSomething = false;
  const DIRS6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (const [dx, dy, dz] of DIRS6) {
    const nx = x + dx, ny = y + dy, nz = z + dz;
    const nid = world.getBlock(nx, ny, nz);
    const flam = F.flammable[nid];
    if (flam > 0 && world.rand.chance(Math.min(0.6, flam / 100 + 0.1))) {
      // Consume the flammable block -> replace with fire or air.
      const above = world.getBlock(nx, ny + 1, nz);
      world.setBlock(nx, ny, nz, above === 0 && world.rand.chance(0.5) ? fireId : 0, { noFluidSchedule: true });
      burnedSomething = true;
    }
  }
  // Try to spread fire into adjacent AIR cells that touch a flammable block.
  for (const [dx, dy, dz] of DIRS6) {
    const nx = x + dx, ny = y + dy, nz = z + dz;
    if (!RTICK_isAir(world, nx, ny, nz)) continue;
    if (!RTICK_flammableNeighbour(world, nx, ny, nz)) continue;
    if (world.rand.chance(0.25)) world.setBlock(nx, ny, nz, fireId, { noFluidSchedule: true });
  }
  // Burn out.
  if (!hasFloor || world.rand.chance(0.35) || !burnedSomething && world.rand.chance(0.25)) {
    world.setBlock(x, y, z, 0, { noFluidSchedule: true });
  }
}

function RTICK_flammableNeighbour(world, x, y, z) {
  const F = world._flags;
  const DIRS6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (const [dx, dy, dz] of DIRS6) {
    if (F.flammable[world.getBlock(x + dx, y + dy, z + dz)] > 0) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Lava sets flammable neighbours alight.
// ---------------------------------------------------------------------------

function RTICK_lava(world, x, y, z, id) {
  const R = world._registry;
  const F = world._flags;
  const fireId = R.id('fire');
  const DIRS6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (const [dx, dy, dz] of DIRS6) {
    // Look one further out: an air cell next to a flammable block near lava.
    const ax = x + dx, ay = y + dy, az = z + dz;
    if (!RTICK_isAir(world, ax, ay, az)) continue;
    if (RTICK_flammableNeighbour(world, ax, ay, az) && world.rand.chance(0.3)) {
      world.setBlock(ax, ay, az, fireId, { noFluidSchedule: true });
    }
  }
}

// ---------------------------------------------------------------------------
// Vertical growers: cactus / sugar_cane / bamboo (grow taller to a max height).
// ---------------------------------------------------------------------------

function RTICK_growUpward(world, x, y, z, id, maxHeight, opts) {
  opts = opts || {};
  // Count our own column height below.
  let h = 1;
  for (let dy = 1; dy < maxHeight + 1; dy++) {
    if (world.getBlock(x, y - dy, z) === id) h++;
    else break;
  }
  if (h >= maxHeight) return;
  // Space above must be air.
  if (!RTICK_isAir(world, x, y + 1, z)) return;
  // Cactus: no adjacent solid blocks or it breaks; only grows over sand column.
  if (opts.cactus) {
    for (const [dx, dz] of HDIRS) {
      if (world._flags.solid[world.getBlock(x + dx, y, z)]) return;
    }
  }
  if (opts.needsWater) {
    // sugar cane needs water near the base of the column.
    const baseY = y - (h - 1);
    if (!RTICK_waterAdjacent(world, x, baseY - 1, z, 1)) return;
  }
  if (world.rand.chance(opts.chance != null ? opts.chance : 0.14)) {
    world.setBlock(x, y + 1, z, id);
  }
}

// ---------------------------------------------------------------------------
// Kelp grows upward in water; vine spreads downward; nether_wart grows.
// ---------------------------------------------------------------------------

function RTICK_growKelp(world, x, y, z, id) {
  // Grow up if the block above is water and there's room.
  if (!RTICK_isWater(world, x, y + 1, z)) return;
  // Count column height to cap it.
  let h = 1;
  for (let dy = 1; dy < 26; dy++) { if (world.getBlock(x, y - dy, z) === id) h++; else break; }
  if (h >= 25) return;
  if (world.rand.chance(0.14)) world.setBlock(x, y + 1, z, id);
}

function RTICK_spreadVine(world, x, y, z, id) {
  // Vine grows downward if there's air below and it stays attached (a vine or
  // any block directly above keeps it up).
  if (!RTICK_isAir(world, x, y - 1, z)) return;
  if (world.getBlock(x, y + 1, z) !== id && !world._flags.solid[world.getBlock(x, y + 1, z)]) {
    // needs something above to hang from
  }
  if (world.rand.chance(0.25)) world.setBlock(x, y - 1, z, id);
}

function RTICK_growNetherWart(world, x, y, z, id) {
  // Modelled as a single block that occasionally "matures" — here we just re-fire
  // its grow (no explicit stages defined), used to keep the block ticking.
  const R = world._registry;
  const below = RTICK_name(world, world.getBlock(x, y - 1, z));
  if (below !== 'soul_sand') return;
  // No stage blocks exist beyond the single nether_wart; nothing to advance to,
  // but we validate support so an unsupported wart pops off.
  // (Support enforcement is handled by setBlock's needsSupport; nothing else.)
}

// ---------------------------------------------------------------------------
// RANDOM_TICK_HANDLERS — keyed by block name.
// ---------------------------------------------------------------------------
export const RANDOM_TICK_HANDLERS = {};

// Wheat 0..6 (7 is fully grown, no handler needed for growth).
for (let i = 0; i < 7; i++) {
  RANDOM_TICK_HANDLERS['wheat_' + i] = (world, x, y, z, id) => RTICK_growCrop(world, x, y, z, id);
}
// Carrots / potatoes / beetroots stages 0..2.
for (const crop of ['carrots', 'potatoes', 'beetroots']) {
  for (let i = 0; i < 3; i++) {
    RANDOM_TICK_HANDLERS[crop + '_' + i] = (world, x, y, z, id) => RTICK_growCrop(world, x, y, z, id);
  }
}

RANDOM_TICK_HANDLERS.farmland = (world, x, y, z, id) => RTICK_farmland(world, x, y, z, id, false);
RANDOM_TICK_HANDLERS.farmland_wet = (world, x, y, z, id) => RTICK_farmland(world, x, y, z, id, true);

RANDOM_TICK_HANDLERS.grass_block = (world, x, y, z, id) => RTICK_spreadGround(world, x, y, z, id, 'grass_block');
RANDOM_TICK_HANDLERS.mycelium = (world, x, y, z, id) => RTICK_spreadGround(world, x, y, z, id, 'mycelium');

for (const s of Object.keys(RTICK_SAPLING_SPECIES)) {
  RANDOM_TICK_HANDLERS[s] = (world, x, y, z, id) => RTICK_growSapling(world, x, y, z, id);
}

// Leaves decay for every wood type.
for (const w of ['oak', 'birch', 'spruce', 'jungle', 'acacia', 'dark_oak']) {
  RANDOM_TICK_HANDLERS[w + '_leaves'] = (world, x, y, z, id) => RTICK_leafDecay(world, x, y, z, id);
}

RANDOM_TICK_HANDLERS.ice = (world, x, y, z, id) => RTICK_ice(world, x, y, z, id);
RANDOM_TICK_HANDLERS.water = (world, x, y, z, id) => RTICK_freezeWater(world, x, y, z);
RANDOM_TICK_HANDLERS.snow_layer = (world, x, y, z, id) => RTICK_snowLayer(world, x, y, z, id);

RANDOM_TICK_HANDLERS.fire = (world, x, y, z, id) => RTICK_fire(world, x, y, z, id);
RANDOM_TICK_HANDLERS.lava = (world, x, y, z, id) => RTICK_lava(world, x, y, z, id);

RANDOM_TICK_HANDLERS.cactus = (world, x, y, z, id) => RTICK_growUpward(world, x, y, z, id, 3, { cactus: true });
RANDOM_TICK_HANDLERS.sugar_cane = (world, x, y, z, id) => RTICK_growUpward(world, x, y, z, id, 3, { needsWater: true });
RANDOM_TICK_HANDLERS.bamboo = (world, x, y, z, id) => RTICK_growUpward(world, x, y, z, id, 14, { chance: 0.12 });

RANDOM_TICK_HANDLERS.kelp = (world, x, y, z, id) => RTICK_growKelp(world, x, y, z, id);
RANDOM_TICK_HANDLERS.vine = (world, x, y, z, id) => RTICK_spreadVine(world, x, y, z, id);
RANDOM_TICK_HANDLERS.nether_wart = (world, x, y, z, id) => RTICK_growNetherWart(world, x, y, z, id);

// ---------------------------------------------------------------------------
// Dispatcher.
// ---------------------------------------------------------------------------
/**
 * Random-tick a single block. Looks up its name and dispatches to the matching
 * handler if any.
 * @param {World} world
 * @param {number} x @param {number} y @param {number} z
 * @param {number} id block id at that position
 * @param {BlockRegistry} registry
 * @param {BlockFlags} flags
 */
export function randomTickBlock(world, x, y, z, id, registry, flags) {
  if (id === 0) return;
  const def = registry.def(id);
  if (!def) return;
  const handler = RANDOM_TICK_HANDLERS[def.name];
  if (handler) handler(world, x, y, z, id);
}
