// Terrain generation: fills chunk block data using noise-based heightmap,
// surface rules, caves, ores, and fluid fill.
// Uses TERRAINGEN_ prefix for all module-level non-export names.

import { NoiseRouter } from './noise.js';
import { BIOMES, selectBiome, biomeById } from './biomes.js';
import { hash2i, hash3i } from '../core/rng.js';
import { CHUNK_W, CHUNK_H } from './chunk.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TERRAINGEN_SEA_LEVEL = 62;
const TERRAINGEN_DEEPSLATE_TOP = 24;
const TERRAINGEN_DEEPSLATE_BLEND = 8; // noisy boundary depth

// ---------------------------------------------------------------------------
// Ore vein data table
// Each entry: [oreName, deepslateVariant, minY, maxY, threshold, veinsPerChunk]
// threshold is applied to 3D noise — higher = rarer
// ---------------------------------------------------------------------------

const TERRAINGEN_ORE_TABLE = [
  { name: 'coal_ore',     ds: 'deepslate_coal_ore',     minY:  5, maxY:  90, thresh: 0.72, count: 22 },
  { name: 'iron_ore',     ds: 'deepslate_iron_ore',     minY:  5, maxY:  70, thresh: 0.76, count: 15 },
  { name: 'copper_ore',   ds: 'deepslate_copper_ore',   minY: 20, maxY:  60, thresh: 0.78, count: 12 },
  { name: 'gold_ore',     ds: 'deepslate_gold_ore',     minY:  5, maxY:  32, thresh: 0.80, count:  8 },
  { name: 'redstone_ore', ds: 'deepslate_redstone_ore', minY:  2, maxY:  20, thresh: 0.82, count:  8 },
  { name: 'lapis_ore',    ds: 'deepslate_lapis_ore',    minY:  2, maxY:  30, thresh: 0.83, count:  7 },
  { name: 'diamond_ore',  ds: 'deepslate_diamond_ore',  minY:  2, maxY:  16, thresh: 0.87, count:  4 },
  { name: 'emerald_ore',  ds: 'deepslate_emerald_ore',  minY: 10, maxY:  80, thresh: 0.80, count:  6 },
];

// ---------------------------------------------------------------------------
// TerrainGenerator
// ---------------------------------------------------------------------------

export class TerrainGenerator {
  /**
   * @param {number} seed
   * @param {import('../world/blocks.js').BlockRegistry} registry
   * @param {import('../world/blocks.js').BlockFlags} flags
   */
  constructor(seed, registry, flags) {
    this._seed = seed >>> 0;
    this._registry = registry;
    this._flags = flags;
    this._router = new NoiseRouter(seed);

    // Resolve block ids ahead of time for hot-path use
    const R = registry;
    this._IDS = {
      air:        R.id('air'),
      stone:      R.id('stone'),
      deepslate:  R.id('deepslate'),
      bedrock:    R.id('bedrock'),
      water:      R.id('water'),
      lava:       R.id('lava'),
      gravel:     R.id('gravel'),
      sand:       R.id('sand'),
      dirt:       R.id('dirt'),
      grass:      R.id('grass_block'),
      snowBlock:  R.id('snow_block'),
      snowLayer:  R.id('snow_layer'),
      mycelium:   R.id('mycelium'),
      clay:       R.id('clay'),
      red_sand:   R.id('red_sand'),
      orange_terracotta: R.id('orange_terracotta'),
    };

    // Resolve ore block ids
    this._oreIds = TERRAINGEN_ORE_TABLE.map((entry) => ({
      ...entry,
      id:   R.id(entry.name),
      dsId: R.id(entry.ds),
    }));

    // Emerald only generates in mountains biome (index 7)
    this._mountainsBiomeIdx = 7;
  }

  /**
   * Generate all blocks for the given chunk.
   * @param {import('../world/chunk.js').Chunk} chunk
   */
  generateChunk(chunk) {
    const { cx, cz } = chunk;
    const router = this._router;
    const IDS = this._IDS;
    const flags = this._flags;
    const blocks = chunk.blocks;
    const seed = this._seed;

    // We work column by column: for each (lx, lz) compute the full column
    for (let lx = 0; lx < CHUNK_W; lx++) {
      for (let lz = 0; lz < CHUNK_W; lz++) {
        const wx = cx * CHUNK_W + lx;
        const wz = cz * CHUNK_W + lz;
        const colBase = (lx * CHUNK_W + lz) * CHUNK_H;

        // Sample noise router for this column
        const col = router.sampleColumn(wx, wz);
        const { continent, erosion, ridge, temp, humid, weird, height } = col;

        // Surface height: integer terrain height
        const surfY = Math.round(height);

        // Select biome
        const biomeIdx = selectBiome(temp, humid, continent, erosion, ridge, height, TERRAINGEN_SEA_LEVEL);
        chunk.biome[lx * CHUNK_W + lz] = biomeIdx;
        const biome = BIOMES[biomeIdx];

        // ---- Bedrock layer (y=0..3 with noise thickness) ----
        const bedrockTop = 1 + (hash2i(wx, wz, seed) % 3);
        for (let y = 0; y <= bedrockTop; y++) {
          blocks[colBase + y] = IDS.bedrock;
        }

        // ---- Fill stone / deepslate from bedrock to surface ----
        for (let y = bedrockTop + 1; y < surfY && y < CHUNK_H; y++) {
          if (y < TERRAINGEN_DEEPSLATE_TOP) {
            blocks[colBase + y] = IDS.deepslate;
          } else if (y < TERRAINGEN_DEEPSLATE_TOP + TERRAINGEN_DEEPSLATE_BLEND) {
            // Noisy blend boundary between deepslate and stone
            const blendNoise = (hash3i(wx, y, wz, seed ^ 0x12345) / 4294967296);
            const blendFactor = (y - TERRAINGEN_DEEPSLATE_TOP) / TERRAINGEN_DEEPSLATE_BLEND;
            blocks[colBase + y] = blendNoise < blendFactor ? IDS.stone : IDS.deepslate;
          } else {
            blocks[colBase + y] = IDS.stone;
          }
        }

        // ---- Surface layer rules ----
        const isUnderwater = surfY <= TERRAINGEN_SEA_LEVEL;
        const surf = biome.surface;
        const topId = this._registry.id(surf.top);
        const fillId = this._registry.id(surf.filler);
        const uwId = this._registry.id(surf.underwater);
        const depth = surf.fillerDepth;

        if (surfY > 0 && surfY < CHUNK_H) {
          if (isUnderwater) {
            // Underwater columns: use underwater variant for top and a few below
            for (let d = 0; d < depth + 1; d++) {
              const sy = surfY - d - 1;
              if (sy > bedrockTop && sy < CHUNK_H) {
                blocks[colBase + sy] = (d === 0) ? uwId : fillId;
              }
            }
          } else {
            // Normal surface: top block then filler depth
            const topActual = Math.min(surfY - 1, CHUNK_H - 1);
            if (topActual > bedrockTop) {
              blocks[colBase + topActual] = topId;
            }
            for (let d = 1; d < depth && (topActual - d) > bedrockTop; d++) {
              blocks[colBase + topActual - d] = fillId;
            }
            // Snow layer on snowy biomes
            if (biome.snow && surfY < CHUNK_H) {
              blocks[colBase + surfY] = IDS.snowLayer;
            }
            // Mycelium overrides grass for mushroom island
            if (biomeIdx === 11 && topActual > bedrockTop) {
              blocks[colBase + topActual] = IDS.mycelium;
            }
          }
        }

        // ---- Water fill below sea level ----
        for (let y = surfY; y <= TERRAINGEN_SEA_LEVEL && y < CHUNK_H; y++) {
          if (blocks[colBase + y] === 0) {
            blocks[colBase + y] = IDS.water;
          }
        }
      }
    }

    // ---- 3D Cave carving pass ----
    this._carveCaves(chunk, cx, cz);

    // ---- Ore placement pass ----
    this._placeOres(chunk, cx, cz);

    // ---- Post-process: lava fill in deep caves, rare lava lakes ----
    this._fillLavaCaves(chunk, cx, cz);

    // ---- Finalize chunk state ----
    chunk.rebuildSectionCounts();
    chunk.rebuildHeightMap(this._flags);
    chunk.generated = true;
  }

  // -------------------------------------------------------------------------
  // Cave carving
  // -------------------------------------------------------------------------

  _carveCaves(chunk, cx, cz) {
    const router = this._router;
    const blocks = chunk.blocks;
    const IDS = this._IDS;
    const seed = this._seed;

    for (let lx = 0; lx < CHUNK_W; lx++) {
      for (let lz = 0; lz < CHUNK_W; lz++) {
        const wx = cx * CHUNK_W + lx;
        const wz = cz * CHUNK_W + lz;
        const colBase = (lx * CHUNK_W + lz) * CHUNK_H;

        // Find surface Y for this column
        let surfY = 0;
        for (let y = CHUNK_H - 1; y >= 0; y--) {
          if (blocks[colBase + y] !== 0 && blocks[colBase + y] !== IDS.water) {
            surfY = y;
            break;
          }
        }

        for (let y = 1; y < Math.min(surfY - 3, CHUNK_H); y++) {
          const curBlock = blocks[colBase + y];
          if (curBlock === IDS.bedrock || curBlock === IDS.water) continue;

          const wx_f = wx + 0.5;
          const wy_f = y + 0.5;
          const wz_f = wz + 0.5;

          // Spaghetti tunnel noise: two overlapping fields
          const spaghetti1 = router.cave3d.at3(wx_f, wy_f, wz_f);
          const spaghetti2 = router.cave3d.at3(wx_f + 100.3, wy_f + 200.7, wz_f + 300.1);

          // Tunnel: carve where both fields are near the same iso-surface
          const tunnelVal = Math.abs(spaghetti1 - 0.5) + Math.abs(spaghetti2 - 0.5);
          const isTunnel = tunnelVal < 0.08;

          // Cheese cave: large open chambers where noise exceeds threshold
          const cheese = router.caveCheese.at3(wx_f, wy_f * 0.5, wz_f);
          // Cheese caves start at y=10 and become more frequent deeper
          const cheeseThresh = y < 30 ? 0.74 : 0.80;
          const isCheese = cheese > cheeseThresh;

          if (isTunnel || isCheese) {
            blocks[colBase + y] = 0; // air
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Ore placement
  // -------------------------------------------------------------------------

  _placeOres(chunk, cx, cz) {
    const blocks = chunk.blocks;
    const IDS = this._IDS;
    const seed = this._seed;

    for (const ore of this._oreIds) {
      // Emerald only in mountain biome columns
      const isEmerald = ore.name === 'emerald_ore';

      // Each ore entry generates `count` vein attempts per chunk
      for (let attempt = 0; attempt < ore.count; attempt++) {
        // Deterministic vein center from chunk coords + ore + attempt
        const h1 = hash3i(cx, cz, attempt * 31 + ore.id, seed ^ 0x1a2b3c);
        const h2 = hash3i(cx + 1000, cz + 2000, attempt * 31 + ore.id + 1, seed ^ 0x4d5e6f);
        const h3 = hash3i(cx + 3000, cz + 4000, attempt * 31 + ore.id + 2, seed ^ 0x7a8b9c);

        const lx = h1 % CHUNK_W;
        const lz = h2 % CHUNK_W;
        const y = ore.minY + (h3 % (ore.maxY - ore.minY + 1));

        if (y <= 0 || y >= CHUNK_H) continue;

        // Check biome for emerald restriction
        if (isEmerald) {
          const biomeIdx = chunk.biome[lx * CHUNK_W + lz];
          if (biomeIdx !== this._mountainsBiomeIdx) continue;
        }

        // Place a small vein: 1..4 blocks clustered around center
        const veinSize = isEmerald ? 1 : 1 + (h1 % 4);
        for (let v = 0; v < veinSize; v++) {
          // Hash per-block within vein for deterministic scatter
          const hv = hash3i(cx * 1000 + lx + v * 7, y + v * 13, ore.id * 100 + attempt + v, seed);
          // Scatter within a small neighbourhood
          const dx = ((hv & 3) - 1);
          const dy = (((hv >> 4) & 1));
          const dz = (((hv >> 6) & 3) - 1);

          const nx = lx + dx;
          const ny = y + dy;
          const nz = lz + dz;

          if (nx < 0 || nx >= CHUNK_W || nz < 0 || nz >= CHUNK_W) continue;
          if (ny <= 0 || ny >= CHUNK_H) continue;

          const idx = (nx * CHUNK_W + nz) * CHUNK_H + ny;
          const cur = blocks[idx];

          // Only replace stone or deepslate
          if (cur !== IDS.stone && cur !== IDS.deepslate) continue;

          // Choose deepslate vs normal variant based on host block
          blocks[idx] = (cur === IDS.deepslate) ? ore.dsId : ore.id;
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Lava fill in deep caves
  // -------------------------------------------------------------------------

  _fillLavaCaves(chunk, cx, cz) {
    const blocks = chunk.blocks;
    const IDS = this._IDS;
    const seed = this._seed;

    for (let lx = 0; lx < CHUNK_W; lx++) {
      for (let lz = 0; lz < CHUNK_W; lz++) {
        const colBase = (lx * CHUNK_W + lz) * CHUNK_H;
        // Fill air caves below y=12 with lava occasionally (1-in-3 chance per air block)
        for (let y = 1; y < 12; y++) {
          if (blocks[colBase + y] === 0) {
            const h = hash3i(cx * CHUNK_W + lx, y, cz * CHUNK_W + lz, seed ^ 0xface);
            if ((h % 3) !== 0) {
              blocks[colBase + y] = IDS.lava;
            }
          }
        }
      }
    }
  }
}
