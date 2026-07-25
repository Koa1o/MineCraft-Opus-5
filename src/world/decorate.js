// Post-terrain decoration: trees, plants, features.
// All placements are deterministic from seed + chunk coordinates.
// Uses DECOR_ prefix for module-level non-exported names.

import { makeRng, hash2i, hash3i } from '../core/rng.js';
import { BIOMES, biomeById } from './biomes.js';
import { CHUNK_W, CHUNK_H } from './chunk.js';

// ---------------------------------------------------------------------------
// Valid soil sets
// ---------------------------------------------------------------------------

const DECOR_GRASS_SOILS = new Set([
  'grass_block', 'dirt', 'coarse_dirt', 'podzol', 'mycelium', 'farmland', 'farmland_wet',
]);
const DECOR_SAND_SOILS = new Set(['sand', 'red_sand']);
const DECOR_WATER_SOILS = new Set(['sand', 'gravel', 'dirt', 'clay']);
const DECOR_CLAY_SOILS = new Set(['dirt', 'clay', 'gravel', 'sand']);

// ---------------------------------------------------------------------------
// Tree species table — fully defined, no stubs
// ---------------------------------------------------------------------------

/**
 * Each species entry describes how to grow that tree type.
 * grow(world, x, y, z, rng) is called with feet at the base (bottom of trunk).
 */
export const TREE_SPECIES = {
  oak:      { logBlock: 'oak_log',      leavesBlock: 'oak_leaves',      soil: DECOR_GRASS_SOILS, grow: DECOR_growOak },
  large_oak:{ logBlock: 'oak_log',      leavesBlock: 'oak_leaves',      soil: DECOR_GRASS_SOILS, grow: DECOR_growLargeOak },
  birch:    { logBlock: 'birch_log',    leavesBlock: 'birch_leaves',    soil: DECOR_GRASS_SOILS, grow: DECOR_growBirch },
  spruce:   { logBlock: 'spruce_log',   leavesBlock: 'spruce_leaves',   soil: DECOR_GRASS_SOILS, grow: DECOR_growSpruce },
  jungle:   { logBlock: 'jungle_log',   leavesBlock: 'jungle_leaves',   soil: DECOR_GRASS_SOILS, grow: DECOR_growJungle },
  acacia:   { logBlock: 'acacia_log',   leavesBlock: 'acacia_leaves',   soil: DECOR_GRASS_SOILS, grow: DECOR_growAcacia },
  dark_oak: { logBlock: 'dark_oak_log', leavesBlock: 'dark_oak_leaves', soil: DECOR_GRASS_SOILS, grow: DECOR_growDarkOak },
};

// ---------------------------------------------------------------------------
// Exported growTree function — used by saplings at runtime
// ---------------------------------------------------------------------------

/**
 * Grow a tree of the given species at world position (x, y, z).
 * y is the block ABOVE the soil (trunk base).
 * @param {{setBlock(x,y,z,id):void, getBlock(x,y,z):number}} world
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {string} species
 * @param {ReturnType<import('../core/rng.js').makeRng>} rng
 */
export function growTree(world, x, y, z, species, rng) {
  const spec = TREE_SPECIES[species];
  if (!spec) return;
  spec.grow(world, x, y, z, rng, spec.logBlock, spec.leavesBlock);
}

// ---------------------------------------------------------------------------
// Decorator class
// ---------------------------------------------------------------------------

export class Decorator {
  /**
   * @param {number} seed
   * @param {import('../world/blocks.js').BlockRegistry} registry
   * @param {import('../world/blocks.js').BlockFlags} flags
   */
  constructor(seed, registry, flags) {
    this._seed = seed >>> 0;
    this._registry = registry;
    this._flags = flags;
  }

  /**
   * Decorate a chunk after terrain generation.
   * @param {{ getBlock(x,y,z):number, setBlock(x,y,z,id,opts?):void }} world
   * @param {import('../world/chunk.js').Chunk} chunk
   */
  decorate(world, chunk) {
    const { cx, cz } = chunk;
    const seed = this._seed;

    // Per-chunk deterministic RNG seeded from world seed + chunk coords
    const chunkRng = makeRng((seed ^ hash2i(cx, cz, 0xdead1234)) >>> 0);

    // Iterate columns and place decoration based on biome
    for (let lx = 0; lx < CHUNK_W; lx++) {
      for (let lz = 0; lz < CHUNK_W; lz++) {
        const wx = cx * CHUNK_W + lx;
        const wz = cz * CHUNK_W + lz;
        const biomeIdx = chunk.biome[lx * CHUNK_W + lz];
        const biome = BIOMES[biomeIdx];

        // Find surface Y (highest non-air solid block)
        const surfY = DECOR_findSurface(world, wx, wz);
        if (surfY < 1) continue;

        const surfBlock = world.getBlock(wx, surfY, wz);
        const surfName = this._registry.def(surfBlock)?.name || '';

        // Per-column deterministic RNG
        const colRng = makeRng((seed ^ hash2i(wx, wz, 0xbeef5678)) >>> 0);

        // ---- Trees ----
        if (biome.trees.length > 0 && colRng.next() < biome.treeDensity) {
          const treeSpec = DECOR_pickWeighted(colRng, biome.trees, (t) => t.weight);
          if (treeSpec) {
            const species = treeSpec.block;
            const specDef = TREE_SPECIES[species];
            if (specDef && DECOR_GRASS_SOILS.has(surfName)) {
              // Re-check the surface is still valid soil (not changed by features)
              const currentSurfBlock = world.getBlock(wx, surfY, wz);
              const currentSurfName = this._registry.def(currentSurfBlock)?.name || '';
              if (DECOR_GRASS_SOILS.has(currentSurfName)) {
                const trunkBase = surfY + 1;
                if (DECOR_hasSpaceForTree(world, wx, trunkBase, wz, species)) {
                  const treeRng = colRng.derive('tree');
                  specDef.grow(world, wx, trunkBase, wz, treeRng, specDef.logBlock, specDef.leavesBlock);
                }
              }
            }
          }
        }

        // ---- Plants ----
        for (const plantEntry of biome.plants) {
          if (plantEntry.weight <= 0) continue;
          for (let t = 0; t < plantEntry.tries; t++) {
            if (!colRng.chance(plantEntry.weight / 30)) continue;
            DECOR_placePlant(world, this._registry, wx, surfY, wz, plantEntry.block, surfName, colRng);
          }
        }

        // ---- Features ----
        for (const feat of (biome.features || [])) {
          if (colRng.chance(0.005)) {
            DECOR_placeFeature(world, this._registry, wx, surfY, wz, feat, surfName, colRng);
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Surface finding helper
// ---------------------------------------------------------------------------

/** Snow layer block id — we skip it when looking for solid surface. */
const DECOR_SNOW_LAYER_NAMES = new Set(['snow_layer', 'water', 'lava', 'seagrass', 'kelp', 'tall_grass', 'fern', 'vine', 'lily_pad']);

function DECOR_findSurface(world, x, z) {
  const R = world._registry;
  for (let y = CHUNK_H - 2; y >= 1; y--) {
    const id = world.getBlock(x, y, z);
    if (id === 0) continue;
    // Skip non-solid transparent blocks
    if (R) {
      const def = R.def(id);
      if (def && (!def.solid || def.fluid)) continue;
    }
    return y;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Weighted pick helper
// ---------------------------------------------------------------------------

function DECOR_pickWeighted(rng, items, weightOf) {
  let total = 0;
  for (let i = 0; i < items.length; i++) total += weightOf(items[i]);
  if (total <= 0) return null;
  let r = rng.next() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weightOf(items[i]);
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// ---------------------------------------------------------------------------
// Space checking for trees
// ---------------------------------------------------------------------------

function DECOR_hasSpaceForTree(world, x, y, z, species) {
  let trunkH;
  switch (species) {
    case 'jungle': trunkH = 12; break;
    case 'dark_oak': trunkH = 8; break;
    case 'spruce': trunkH = 7; break;
    case 'large_oak': trunkH = 8; break;
    default: trunkH = 4;
  }
  for (let dy = 0; dy < trunkH; dy++) {
    if (y + dy >= CHUNK_H) return false;
    const b = world.getBlock(x, y + dy, z);
    if (b !== 0) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Plant placement
// ---------------------------------------------------------------------------

function DECOR_placePlant(world, registry, x, surfY, z, plantName, surfName, rng) {
  const placeY = surfY + 1;
  if (placeY >= CHUNK_H) return;

  // Check existing block at target position
  if (world.getBlock(x, placeY, z) !== 0) return;

  const R = registry;

  // Two-block-tall plant pairs
  if (plantName === 'sunflower_lower') {
    if (placeY + 1 >= CHUNK_H) return;
    if (!DECOR_GRASS_SOILS.has(surfName)) return;
    if (world.getBlock(x, placeY + 1, z) !== 0) return;
    world.setBlock(x, placeY, z, R.id('sunflower_lower'));
    world.setBlock(x, placeY + 1, z, R.id('sunflower_upper'));
    return;
  }
  if (plantName === 'rose_bush_lower') {
    if (placeY + 1 >= CHUNK_H) return;
    if (!DECOR_GRASS_SOILS.has(surfName)) return;
    if (world.getBlock(x, placeY + 1, z) !== 0) return;
    world.setBlock(x, placeY, z, R.id('rose_bush_lower'));
    world.setBlock(x, placeY + 1, z, R.id('rose_bush_upper'));
    return;
  }
  if (plantName === 'large_fern_lower') {
    if (placeY + 1 >= CHUNK_H) return;
    if (!DECOR_GRASS_SOILS.has(surfName)) return;
    if (world.getBlock(x, placeY + 1, z) !== 0) return;
    world.setBlock(x, placeY, z, R.id('large_fern_lower'));
    world.setBlock(x, placeY + 1, z, R.id('large_fern_upper'));
    return;
  }

  // Sugar cane: needs to be adjacent to water
  if (plantName === 'sugar_cane') {
    if (!DECOR_GRASS_SOILS.has(surfName) && !DECOR_SAND_SOILS.has(surfName)) return;
    // Check for adjacent water
    const hasWater = (
      world.getBlock(x + 1, surfY, z) === R.idOr('water', -1) ||
      world.getBlock(x - 1, surfY, z) === R.idOr('water', -1) ||
      world.getBlock(x, surfY, z + 1) === R.idOr('water', -1) ||
      world.getBlock(x, surfY, z - 1) === R.idOr('water', -1)
    );
    if (!hasWater) return;
    const caneH = 1 + rng.int(2);
    for (let dy = 0; dy < caneH; dy++) {
      if (placeY + dy >= CHUNK_H) break;
      if (dy > 0 && world.getBlock(x, placeY + dy - 1, z) !== R.id('sugar_cane')) break;
      if (world.getBlock(x, placeY + dy, z) !== 0) break;
      world.setBlock(x, placeY + dy, z, R.id('sugar_cane'));
    }
    return;
  }

  // Cactus: needs sand
  if (plantName === 'cactus') {
    if (!DECOR_SAND_SOILS.has(surfName)) return;
    const cactusH = 1 + rng.int(2);
    for (let dy = 0; dy < cactusH; dy++) {
      if (placeY + dy >= CHUNK_H) break;
      if (world.getBlock(x, placeY + dy, z) !== 0) break;
      world.setBlock(x, placeY + dy, z, R.id('cactus'));
    }
    return;
  }

  // Bamboo: needs valid soil
  if (plantName === 'bamboo') {
    if (!DECOR_GRASS_SOILS.has(surfName)) return;
    const bambooH = 2 + rng.int(4);
    for (let dy = 0; dy < bambooH; dy++) {
      if (placeY + dy >= CHUNK_H) break;
      if (world.getBlock(x, placeY + dy, z) !== 0) break;
      world.setBlock(x, placeY + dy, z, R.id('bamboo'));
    }
    return;
  }

  // Vine: placed on the sides of trees — skip in plain placement (handled during tree growth)
  if (plantName === 'vine') {
    // Attach to any solid block wall — attempt to find one
    for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const adj = world.getBlock(x + dx, placeY, z + dz);
      if (adj !== 0) {
        if (world.getBlock(x, placeY, z) === 0) {
          world.setBlock(x, placeY, z, R.id('vine'));
        }
        return;
      }
    }
    return;
  }

  // Lily pad: only on water surface
  if (plantName === 'lily_pad') {
    const waterId = R.idOr('water', -1);
    if (world.getBlock(x, surfY, z) !== waterId) return;
    if (world.getBlock(x, placeY, z) !== 0) return;
    world.setBlock(x, placeY, z, R.id('lily_pad'));
    return;
  }

  // Seagrass: only underwater
  if (plantName === 'seagrass') {
    const waterId = R.idOr('water', -1);
    if (world.getBlock(x, placeY, z) !== waterId) return;
    world.setBlock(x, placeY, z, R.id('seagrass'));
    return;
  }

  // Kelp: only underwater
  if (plantName === 'kelp') {
    const waterId = R.idOr('water', -1);
    if (world.getBlock(x, placeY, z) !== waterId) return;
    const kelpH = 1 + rng.int(4);
    for (let dy = 0; dy < kelpH; dy++) {
      if (placeY + dy >= CHUNK_H) break;
      if (world.getBlock(x, placeY + dy, z) !== waterId) break;
      world.setBlock(x, placeY + dy, z, R.id('kelp'));
    }
    return;
  }

  // Skip invalid placeholders
  if (plantName === 'cocoa_placeholder') return;

  // Normal single-block plants: verify soil compatibility from block def
  const blockDef = R.get(plantName);
  if (!blockDef) return;

  const validSoils = blockDef.plantOn;
  if (validSoils && !validSoils.includes(surfName)) return;
  if (!validSoils) {
    // Default: needs grass/dirt for most plants
    if (!DECOR_GRASS_SOILS.has(surfName)) return;
  }

  world.setBlock(x, placeY, z, blockDef.id);
}

// ---------------------------------------------------------------------------
// Feature placement
// ---------------------------------------------------------------------------

function DECOR_placeFeature(world, registry, x, surfY, z, feature, surfName, rng) {
  const R = registry;

  if (feature === 'boulder') {
    DECOR_placeBoulder(world, R, x, surfY + 1, z, rng);
    return;
  }
  if (feature === 'pond') {
    // Small pond: 3x3 water-filled depression
    DECOR_placePond(world, R, x, surfY, z, rng);
    return;
  }
  if (feature === 'clay_patch') {
    // Clay patch under water
    DECOR_placeClayPatch(world, R, x, surfY, z, rng);
    return;
  }
}

function DECOR_placeBoulder(world, R, x, y, z, rng) {
  const mossId = R.idOr('mossy_cobblestone', R.idOr('cobblestone', 0));
  const r = 1 + rng.int(2); // radius 1..2
  for (let dx = -r; dx <= r; dx++) {
    for (let dy = 0; dy <= r; dy++) {
      for (let dz = -r; dz <= r; dz++) {
        const dist2 = dx * dx + dy * dy * 1.5 + dz * dz;
        if (dist2 <= r * r + 0.5) {
          const bx = x + dx;
          const by = y + dy;
          const bz = z + dz;
          if (by >= CHUNK_H) continue;
          if (world.getBlock(bx, by, bz) === 0) {
            world.setBlock(bx, by, bz, mossId);
          }
        }
      }
    }
  }
}

/**
 * Small pond.
 *
 * The pond must sit in a genuine depression, otherwise water ends up floating in
 * mid-air on sloped ground and the fluid simulator reschedules those cells
 * forever (they can never settle). So: sample every column's own surface height,
 * bail out if the patch is not flat enough, and carve a basin at the LOWEST
 * column so every water block has ground beneath and around it.
 */
function DECOR_placePond(world, R, x, surfY, z, rng) {
  const waterId = R.idOr('water', 0);
  const clayId = R.idOr('clay', 0);
  const dirtId = R.idOr('dirt', 0);
  const logBlocks = new Set([
    'oak_log', 'birch_log', 'spruce_log', 'jungle_log', 'acacia_log', 'dark_oak_log',
  ].map((n) => R.idOr(n, -1)).filter((id) => id >= 0));
  const r = 2;

  // ---- survey the footprint
  //
  // IMPORTANT: do not trust world.heightAt() here. During decoration the
  // heightmap of a neighbouring chunk can still be stale (it is rebuilt after
  // its own decorate pass), and trusting it produced ponds floating 15 blocks
  // above the ground. Instead, scan each column downward from the caller's
  // surfY for the first genuinely solid block.
  let minH = Infinity, maxH = -Infinity;
  const cols = [];
  const scanTop = Math.min(surfY + 3, 125);
  for (let dx = -r; dx <= r; dx++) {
    for (let dz = -r; dz <= r; dz++) {
      if (dx * dx + dz * dz > r * r) continue;
      const bx = x + dx, bz = z + dz;
      let h = -1;
      for (let yy = scanTop; yy >= 2; yy--) {
        if (world.isSolid(bx, yy, bz)) { h = yy; break; }
      }
      if (h < 2) return;                       // no ground under this column
      const above1 = world.getBlock(bx, h + 1, bz);
      const above2 = world.getBlock(bx, h + 2, bz);
      if (logBlocks.has(above1) || logBlocks.has(above2)) return; // a tree is here
      // Never overlap an existing pond: carving through its floor would leave
      // its water floating. Detect it now, before any block is mutated.
      for (let yy = h; yy <= scanTop; yy++) {
        if (world.getBlock(bx, yy, bz) === waterId) return;
      }
      if (h < minH) minH = h;
      if (h > maxH) maxH = h;
      cols.push([bx, bz, h]);
    }
  }
  // Too steep for a believable pond — skip rather than build a floating one.
  if (!cols.length || maxH - minH > 2) return;

  // ---- require a real, already-solid floor under every column BEFORE writing
  // anything. Relying on writing our own floor is fragile: a later decoration
  // pass can remove it and leave the water floating, which livelocks the fluid
  // simulator. If the basin floor is not already solid ground, skip the pond.
  const waterY = minH;
  for (const [bx, bz] of cols) {
    if (!world.isSolid(bx, waterY - 1, bz)) return;
  }
  for (const [bx, bz, h] of cols) {
    // Remove anything above the water line inside the footprint, but never
    // destroy an existing pond: carving through a neighbouring pond's floor
    // would leave its water floating with air underneath.
    for (let yy = h; yy > waterY; yy--) world.setBlock(bx, yy, bz, 0);
    world.setBlock(bx, waterY, bz, waterId);
    // Seal the floor so the water cannot drain into a cave below.
    if (!world.isSolid(bx, waterY - 1, bz)) {
      world.setBlock(bx, waterY - 1, bz, rng.chance(0.6) ? clayId : dirtId);
    }
  }
  // Final safety pass: every water block must have solid support, otherwise it
  // becomes an endless waterfall that the fluid sim has to chase forever.
  for (const [bx, bz] of cols) {
    if (world.getBlock(bx, waterY, bz) !== waterId) continue;
    if (!world.isSolid(bx, waterY - 1, bz)) world.setBlock(bx, waterY, bz, 0);
  }
  // ---- wall the rim so water has somewhere to sit instead of spilling out
  for (let dx = -r - 1; dx <= r + 1; dx++) {
    for (let dz = -r - 1; dz <= r + 1; dz++) {
      const d2 = dx * dx + dz * dz;
      if (d2 <= r * r || d2 > (r + 1.5) * (r + 1.5)) continue;
      const bx = x + dx, bz = z + dz;
      if (!world.isSolid(bx, waterY, bz)) {
        // Only patch the rim where it is actually open, so the pond stays sunken.
        const below = world.isSolid(bx, waterY - 1, bz);
        if (below) world.setBlock(bx, waterY, bz, dirtId);
      }
    }
  }
}

function DECOR_placeClayPatch(world, R, x, surfY, z, rng) {
  const clayId = R.idOr('clay', 0);
  if (surfY < 1) return;
  const waterId = R.idOr('water', 0);
  // Only place clay if underwater
  if (world.getBlock(x, surfY + 1, z) !== waterId) return;
  const r = 1 + rng.int(2);
  for (let dx = -r; dx <= r; dx++) {
    for (let dz = -r; dz <= r; dz++) {
      if (dx * dx + dz * dz <= r * r) {
        world.setBlock(x + dx, surfY, z + dz, clayId);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Tree grow functions — fully implemented for all 7 species
// ---------------------------------------------------------------------------

/** Set a block only if the target is air. */
function DECOR_setIfAir(world, x, y, z, id) {
  if (y < 0 || y >= CHUNK_H) return;
  if (world.getBlock(x, y, z) === 0) {
    world.setBlock(x, y, z, id);
  }
}

// Oak: 4-6 tall trunk, blobby oval canopy
function DECOR_growOak(world, x, y, z, rng, logId, leavesId) {
  if (typeof logId === 'string') {
    const R = world._registry;
    if (R) { logId = R.id(logId); leavesId = R.id(leavesId); }
  }
  const trunkH = 4 + rng.int(3); // 4..6
  for (let dy = 0; dy < trunkH; dy++) {
    if (y + dy >= CHUNK_H) break;
    world.setBlock(x, y + dy, z, logId);
  }
  // Canopy: oval blob centered at trunkH-2 above base
  const topY = y + trunkH - 1;
  for (let dy = -2; dy <= 1; dy++) {
    const cy = topY + dy;
    const r = dy >= 0 ? 1 : 2;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) + Math.abs(dz) > r + (dy < 0 ? 1 : 0)) continue;
        if (dx === 0 && dz === 0 && dy <= 0) continue; // skip trunk positions
        DECOR_setIfAir(world, x + dx, cy, z + dz, leavesId);
      }
    }
  }
  // Top cap
  DECOR_setIfAir(world, x, topY + 2, z, leavesId);
}

// Large oak: 8+ trunk, huge blobby canopy
function DECOR_growLargeOak(world, x, y, z, rng, logId, leavesId) {
  if (typeof logId === 'string') {
    const R = world._registry;
    if (R) { logId = R.id(logId); leavesId = R.id(leavesId); }
  }
  const trunkH = 8 + rng.int(4);
  for (let dy = 0; dy < trunkH; dy++) {
    if (y + dy >= CHUNK_H) break;
    world.setBlock(x, y + dy, z, logId);
  }
  const topY = y + trunkH - 1;
  for (let dy = -3; dy <= 1; dy++) {
    const cy = topY + dy;
    const r = dy >= 0 ? 2 : 3;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const d2 = dx * dx + dz * dz;
        if (d2 > r * r + 1) continue;
        if (dx === 0 && dz === 0) continue;
        DECOR_setIfAir(world, x + dx, cy, z + dz, leavesId);
      }
    }
  }
  DECOR_setIfAir(world, x, topY + 2, z, leavesId);
  DECOR_setIfAir(world, x + 1, topY + 1, z, leavesId);
  DECOR_setIfAir(world, x - 1, topY + 1, z, leavesId);
  DECOR_setIfAir(world, x, topY + 1, z + 1, leavesId);
  DECOR_setIfAir(world, x, topY + 1, z - 1, leavesId);
}

// Birch: taller thin trunk (6-8), tight oval canopy
function DECOR_growBirch(world, x, y, z, rng, logId, leavesId) {
  if (typeof logId === 'string') {
    const R = world._registry;
    if (R) { logId = R.id(logId); leavesId = R.id(leavesId); }
  }
  const trunkH = 6 + rng.int(3); // 6..8
  for (let dy = 0; dy < trunkH; dy++) {
    if (y + dy >= CHUNK_H) break;
    world.setBlock(x, y + dy, z, logId);
  }
  const topY = y + trunkH - 1;
  // Tight layered canopy
  for (let dy = -2; dy <= 1; dy++) {
    const cy = topY + dy;
    const r = dy >= 0 ? 1 : (dy === -1 ? 2 : 2);
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) === r && Math.abs(dz) === r) continue; // clip corners
        if (dx === 0 && dz === 0 && dy < 0) continue;
        DECOR_setIfAir(world, x + dx, cy, z + dz, leavesId);
      }
    }
  }
  DECOR_setIfAir(world, x, topY + 2, z, leavesId);
}

// Spruce: conical layered, 7-11 tall
function DECOR_growSpruce(world, x, y, z, rng, logId, leavesId) {
  if (typeof logId === 'string') {
    const R = world._registry;
    if (R) { logId = R.id(logId); leavesId = R.id(leavesId); }
  }
  const trunkH = 7 + rng.int(5); // 7..11
  for (let dy = 0; dy < trunkH; dy++) {
    if (y + dy >= CHUNK_H) break;
    world.setBlock(x, y + dy, z, logId);
  }
  const topY = y + trunkH;
  // Cone: starts narrow at top, widens as we go down
  // Tip
  DECOR_setIfAir(world, x, topY, z, leavesId);
  // Layer 1: 1 below tip
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      DECOR_setIfAir(world, x + dx, topY - 1, z + dz, leavesId);
    }
  }
  // Wider layers descending
  const layerCount = Math.floor(trunkH * 0.7);
  for (let layer = 0; layer < layerCount; layer++) {
    const cy = topY - 2 - layer;
    if (cy < y) break;
    const r = Math.min(2, 1 + Math.floor(layer * 0.5));
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        // Slightly irregular by skipping some corners
        if (Math.abs(dx) === r && Math.abs(dz) === r && rng.chance(0.4)) continue;
        DECOR_setIfAir(world, x + dx, cy, z + dz, leavesId);
      }
    }
  }
}

// Jungle: 12-20 tall, wide canopy, with vines
function DECOR_growJungle(world, x, y, z, rng, logId, leavesId) {
  if (typeof logId === 'string') {
    const R = world._registry;
    if (R) { logId = R.id(logId); leavesId = R.id(leavesId); }
  }
  const trunkH = 12 + rng.int(9); // 12..20
  for (let dy = 0; dy < trunkH; dy++) {
    if (y + dy >= CHUNK_H) break;
    world.setBlock(x, y + dy, z, logId);
  }
  const topY = y + trunkH - 1;
  // Wide canopy
  for (let dy = -3; dy <= 1; dy++) {
    const cy = topY + dy;
    const r = dy >= 0 ? 2 : 3;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (dx * dx + dz * dz > r * r + 2) continue;
        if (dx === 0 && dz === 0 && dy < 0) continue;
        DECOR_setIfAir(world, x + dx, cy, z + dz, leavesId);
      }
    }
  }
  // Vines hanging from canopy edge (try to place vine below leaves)
  const vineId = world._vineId || 0;
  // We do best-effort vine placement — resolve at call site if registry available
  const R = world._registry;
  if (R) {
    const vid = R.idOr('vine', 0);
    if (vid > 0) {
      for (let dx = -3; dx <= 3; dx++) {
        for (let dz = -3; dz <= 3; dz++) {
          if (rng.chance(0.3)) {
            const lx = x + dx;
            const lz = z + dz;
            const canopyBot = topY - 3;
            for (let dy = 0; dy < 4; dy++) {
              const cy = canopyBot - dy;
              if (cy < y) break;
              if (world.getBlock(lx, cy + 1, lz) !== 0 && world.getBlock(lx, cy, lz) === 0) {
                world.setBlock(lx, cy, lz, vid);
              }
            }
          }
        }
      }
    }
  }
}

// Acacia: bent trunk, flat canopy
function DECOR_growAcacia(world, x, y, z, rng, logId, leavesId) {
  if (typeof logId === 'string') {
    const R = world._registry;
    if (R) { logId = R.id(logId); leavesId = R.id(leavesId); }
  }
  const trunkH = 5 + rng.int(3); // 5..7
  // Acacia has a bent trunk: vertical for lower half, then offset for upper half
  const splitH = Math.floor(trunkH * 0.6);
  const offsetX = rng.chance(0.5) ? 1 : -1;

  for (let dy = 0; dy < splitH; dy++) {
    if (y + dy >= CHUNK_H) break;
    world.setBlock(x, y + dy, z, logId);
  }
  // Bent portion (diagonal-ish: one block offset)
  const bx = x + offsetX;
  for (let dy = splitH; dy < trunkH; dy++) {
    if (y + dy >= CHUNK_H) break;
    world.setBlock(bx, y + dy, z, logId);
  }

  // Flat canopy at top — centered over bent portion
  const topY = y + trunkH;
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue; // clip corners
      DECOR_setIfAir(world, bx + dx, topY, z + dz, leavesId);
      DECOR_setIfAir(world, bx + dx, topY - 1, z + dz, leavesId);
    }
  }
  // Small cluster also above original trunk
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      DECOR_setIfAir(world, x + dx, topY, z + dz, leavesId);
    }
  }
}

// Dark oak: 2x2 trunk, huge canopy
function DECOR_growDarkOak(world, x, y, z, rng, logId, leavesId) {
  if (typeof logId === 'string') {
    const R = world._registry;
    if (R) { logId = R.id(logId); leavesId = R.id(leavesId); }
  }
  const trunkH = 6 + rng.int(3); // 6..8
  // 2x2 trunk
  for (let dy = 0; dy < trunkH; dy++) {
    if (y + dy >= CHUNK_H) break;
    for (let tx = 0; tx <= 1; tx++) {
      for (let tz = 0; tz <= 1; tz++) {
        world.setBlock(x + tx, y + dy, z + tz, logId);
      }
    }
  }
  // Huge canopy centered on 2x2 trunk center
  const cx = x; // canopy centered at x+0.5, use x and x+1
  const topY = y + trunkH;
  for (let dy = -3; dy <= 1; dy++) {
    const cy = topY + dy;
    const r = dy >= 0 ? 2 : 3;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (dx * dx + dz * dz > r * r + 2) continue;
        DECOR_setIfAir(world, cx + dx, cy, z + dz, leavesId);
        DECOR_setIfAir(world, cx + dx, cy, z + 1 + dz, leavesId);
      }
    }
  }
}
