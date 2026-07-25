// ---------------------------------------------------------------------------
// buildAtlas.js — assembles the game texture atlas and auxiliary textures.
// All module-level helpers prefixed ATLASBUILD_.
// ---------------------------------------------------------------------------

import { AtlasBuilder } from './atlas.js';
import { Px } from './px.js';
import { registerTerrainTiles } from './blocks/terrain.js';
import { registerStoneTiles } from './blocks/stone.js';
import { registerOreTiles } from './blocks/ores.js';
import { registerWoodTiles } from './blocks/wood.js';
import { registerPlantTiles } from './blocks/plants.js';
import { registerFluidTiles } from './blocks/fluids.js';
import { registerNetherTiles } from './blocks/nether.js';
import { registerMiscTiles } from './blocks/misc.js';
import { registerItemTiles } from './items.js';
import { makeRng, hashString } from '../core/rng.js';
import { createBlockRegistry } from '../world/blockDefs.js';
import { MOB_SKIN_PAINTERS, MOB_SKIN_VARIANTS } from './mobSkins.js';
import { packSheet } from './atlas.js';
import { registerMobModels } from '../entities/models.js';

// Ensure mob models are registered before any skin painting
registerMobModels();

// Face index → role name mapping matching blockDefs tileFor order
const ATLASBUILD_FACE_ROLES = ['side', 'side', 'top', 'bottom', 'front', 'side'];
// Fallback priority for face → tile role
const ATLASBUILD_ROLE_FALLBACKS = {
  front: ['front', 'side', 'all'],
  top: ['top', 'all'],
  bottom: ['bottom', 'all'],
  side: ['side', 'all'],
};

// Cache for mob skin textures: skinName -> {texture, rows}
const ATLASBUILD_skinCache = new Map();

/**
 * Build the full game texture atlas.
 * @param {object} THREE - three.js namespace
 * @param {object} [renderer] - optional WebGLRenderer for anisotropy
 * @returns {{ atlas, texture, tileIndex, animIndex, tileOf }}
 */
export function buildGameAtlas(THREE, renderer) {
  const A = new AtlasBuilder();

  // Build deterministic context C = { rng, seedFor }
  const ATLASBUILD_rng = makeRng('atlas');
  const C = {
    rng: ATLASBUILD_rng,
    seedFor: (n) => hashString('tile:' + n),
  };

  // Register all tile painters in order
  registerTerrainTiles(A, C);
  registerStoneTiles(A, C);
  registerOreTiles(A, C);
  registerWoodTiles(A, C);
  registerPlantTiles(A, C);
  registerFluidTiles(A, C);
  registerNetherTiles(A, C);
  registerMiscTiles(A, C);
  registerItemTiles(A, C);

  // Build the atlas
  const atlas = A.build();

  // Create THREE.DataTexture
  const mip0 = atlas.mipmaps[0];
  const anisotropy = renderer && renderer.capabilities
    ? renderer.capabilities.getMaxAnisotropy()
    : 4;

  const texture = new THREE.DataTexture(
    mip0.data,
    mip0.width,
    mip0.height,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  texture.mipmaps = atlas.mipmaps.slice(1).map((m) => ({ data: m.data, width: m.width, height: m.height }));
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapLinearFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = anisotropy;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  // Build registry for block→tile lookups
  const { registry, flags } = createBlockRegistry();

  // Build flat lookup tables: Int32Array[blockId * 6 + face] = tile index
  const blockCount = (typeof registry.count === 'number') ? registry.count : 512;
  const ATLASBUILD_tileTable = new Int32Array(blockCount * 6).fill(-1);
  const ATLASBUILD_animTable = new Int32Array(blockCount * 6).fill(1);

  // Build role map for overrides
  for (let id = 0; id < blockCount; id++) {
    const def = registry.def(id);
    if (!def) continue;
    for (let face = 0; face < 6; face++) {
      // tileFor resolves face index to tile name using the block's tiles map
      const name = def.tileFor(face);
      if (!name) continue;
      if (atlas.index.has(name)) {
        ATLASBUILD_tileTable[id * 6 + face] = atlas.index.get(name);
        ATLASBUILD_animTable[id * 6 + face] = A.animByte(name);
      }
    }
  }

  /**
   * tileIndex(blockId, face, roleOverride) → atlas tile index or -1
   */
  function tileIndex(blockId, face, roleOverride) {
    if (roleOverride !== undefined && roleOverride !== null) {
      const def = registry.def(blockId);
      if (def) {
        const roleName = typeof roleOverride === 'string' ? roleOverride : roleOverride;
        const tilesDef = def.tiles || {};
        const name = tilesDef[roleName] || tilesDef.all || def.tileFor(face);
        if (name && atlas.index.has(name)) return atlas.index.get(name);
      }
    }
    if (blockId < 0 || blockId >= blockCount) return -1;
    return ATLASBUILD_tileTable[blockId * 6 + face];
  }

  /**
   * animIndex(blockId, face) → packed anim byte
   */
  function animIndex(blockId, face) {
    if (blockId < 0 || blockId >= blockCount) return 1;
    return ATLASBUILD_animTable[blockId * 6 + face];
  }

  /**
   * tileOf(name) → tile index by name
   */
  function tileOf(name) {
    if (atlas.index.has(name)) return atlas.index.get(name);
    return -1;
  }

  return { atlas, texture, tileIndex, animIndex, tileOf };
}

/**
 * Generate 10 crack overlay textures procedurally (stage 0 = few cracks, 9 = shattered).
 * Returns an array of 10 THREE.DataTextures.
 */
export function buildCrackTextures(THREE) {
  const textures = [];
  for (let stage = 0; stage < 10; stage++) {
    const t = Px.makeTile(16, 16);
    // Transparent background
    Px.clear(t, [0, 0, 0, 0]);
    ATLASBUILD_drawCrackStage(t, stage);
    const tex = new THREE.DataTexture(
      new Uint8ClampedArray(t.data),
      16, 16,
      THREE.RGBAFormat,
      THREE.UnsignedByteType,
    );
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    textures.push(tex);
  }
  return textures;
}

/**
 * Draw a crack pattern for a given stage (0-9) onto a 16x16 tile.
 * Stage 0 = few short cracks; Stage 9 = dense shattered web.
 */
function ATLASBUILD_drawCrackStage(t, stage) {
  const darkCrack = [15, 10, 5, 220];
  const lightCrack = [40, 30, 20, 180];
  const numLines = 2 + stage * 2;
  const maxLen = 3 + stage;
  // Seed lines deterministically per stage
  const seed = stage * 7919 + 12345;
  function ATLASBUILD_hash(x) {
    let v = (x ^ (x >>> 16)) * 0x45d9f3b | 0;
    v = (v ^ (v >>> 13)) * 0xb5837f9d | 0;
    return ((v ^ (v >>> 15)) >>> 0) / 0xffffffff;
  }

  // Main crack lines radiating from center-ish
  for (let i = 0; i < numLines; i++) {
    const h0 = ATLASBUILD_hash(seed + i * 31);
    const h1 = ATLASBUILD_hash(seed + i * 31 + 7);
    const h2 = ATLASBUILD_hash(seed + i * 31 + 13);
    const h3 = ATLASBUILD_hash(seed + i * 31 + 19);
    const h4 = ATLASBUILD_hash(seed + i * 31 + 23);

    // Start near center, spread outward at higher stages
    const spread = 2 + stage * 0.5;
    const sx = Math.floor(8 + (h0 - 0.5) * spread);
    const sy = Math.floor(8 + (h1 - 0.5) * spread);
    const angle = h2 * Math.PI * 2;
    const len = Math.floor(maxLen * (0.5 + h3 * 0.5));

    let x = sx, y = sy;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    for (let step = 0; step < len; step++) {
      const px = Math.round(x) & 15;
      const py = Math.round(y) & 15;
      if (px >= 0 && px < 16 && py >= 0 && py < 16) {
        Px.setPx(t, px, py, darkCrack);
        // Faint border for readability
        if (px + 1 < 16) Px.setPx(t, px + 1, py, lightCrack, 0.4);
        if (py + 1 < 16) Px.setPx(t, px, py + 1, lightCrack, 0.4);
      }
      // Small jag for jagged look
      const jag = (ATLASBUILD_hash(seed + i * 97 + step * 11) - 0.5) * 0.7;
      x += dx + Math.cos(angle + Math.PI / 2) * jag;
      y += dy + Math.sin(angle + Math.PI / 2) * jag;
    }
  }

  // Add cross-hatch secondary cracks at higher stages
  if (stage >= 4) {
    const extraLines = stage - 3;
    for (let i = 0; i < extraLines; i++) {
      const h0 = ATLASBUILD_hash(seed + 10000 + i * 41);
      const h1 = ATLASBUILD_hash(seed + 10000 + i * 41 + 7);
      const h2 = ATLASBUILD_hash(seed + 10000 + i * 41 + 13);
      const sx = Math.floor(h0 * 16);
      const sy = Math.floor(h1 * 16);
      const angle = h2 * Math.PI * 2;
      const len2 = 2 + stage - 3;
      let x = sx, y = sy;
      const dx2 = Math.cos(angle);
      const dy2 = Math.sin(angle);
      for (let step = 0; step < len2; step++) {
        const px = Math.round(x) & 15;
        const py = Math.round(y) & 15;
        if (px >= 0 && px < 16 && py >= 0 && py < 16) {
          Px.setPx(t, px, py, darkCrack);
        }
        x += dx2;
        y += dy2;
      }
    }
  }

  // At very high stages (7-9) add scattered dark pixels for shatter effect
  if (stage >= 7) {
    const numDots = (stage - 6) * 8;
    for (let i = 0; i < numDots; i++) {
      const px = Math.floor(ATLASBUILD_hash(seed + 20000 + i * 17) * 16);
      const py = Math.floor(ATLASBUILD_hash(seed + 20000 + i * 17 + 5) * 16);
      Px.setPx(t, px, py, darkCrack, 0.7);
    }
  }
}

/**
 * Build a mob skin texture for a given skin name and variant count.
 * Packs variants vertically into one texture of size 64 x (64 * variants).
 * Caches per skin name.
 * @param {object} THREE
 * @param {string} skinName
 * @param {number} variantCount
 * @returns {{ texture, rows: variantCount }}
 */
export function buildMobSkinTexture(THREE, skinName, variantCount) {
  const cacheKey = skinName + ':' + variantCount;
  if (ATLASBUILD_skinCache.has(cacheKey)) return ATLASBUILD_skinCache.get(cacheKey);

  const painter = MOB_SKIN_PAINTERS[skinName];
  const rows = Math.max(1, variantCount);
  const W = 64;
  const H = 64;

  const combined = new Uint8ClampedArray(W * H * rows * 4);

  for (let v = 0; v < rows; v++) {
    let skinTile;
    if (painter) {
      try {
        skinTile = painter(Px, v);
      } catch (e) {
        skinTile = ATLASBUILD_makeFallbackSkin(v);
      }
    } else {
      skinTile = ATLASBUILD_makeFallbackSkin(v);
    }
    // Copy the 64x64 skin tile into the combined buffer at row v
    const src = skinTile.data;
    const destOffset = v * W * H * 4;
    for (let i = 0; i < W * H * 4; i++) {
      combined[destOffset + i] = src[i];
    }
  }

  const tex = new THREE.DataTexture(
    combined,
    W,
    H * rows,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.flipY = false;
  tex.needsUpdate = true;

  const result = { texture: tex, rows };
  ATLASBUILD_skinCache.set(cacheKey, result);
  return result;
}

/** Generate a simple fallback skin tile (pink checkerboard) when painter is missing. */
function ATLASBUILD_makeFallbackSkin(variant) {
  const t = Px.makeTile(64, 64);
  const c1 = [200, 0, 200, 255];
  const c2 = [20, 20, 20, 255];
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      Px.setPx(t, x, y, ((x + y + variant) & 1) === 0 ? c1 : c2);
    }
  }
  return t;
}
