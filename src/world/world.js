// ---------------------------------------------------------------------------
// World — the integration keystone.
//
// Binds terrain, decoration, structures, lighting, fluids, meshing, entities,
// AI, weather, block entities and random ticks into a single renderer-agnostic
// simulation. Everything else in the codebase talks to this class through the
// public API documented in CONTRACTS.md ("World API used by entities / UI").
//
// Determinism: all randomness flows through `this.rand` (a seeded makeRng), never
// Math.random, so a given seed reproduces the world byte-for-byte.
//
// All module-level helpers are prefixed WORLD_ for concatenation safety.
// ---------------------------------------------------------------------------

import {
  Chunk, CHUNK_W, CHUNK_H, CHUNK_VOL, SECTION_COUNT, SECTION_H,
  chunkKey, chunkKeyStr, chunkIndex,
} from './chunk.js';
import { RK_AIR, RK_CUBE, RK_BOXES, RK_CROSS, RK_FLUID } from './blocks.js';
import { LightEngine } from './lighting.js';
import { Mesher } from './mesher.js';
import { FluidSystem } from './fluids.js';
import { TerrainGenerator } from './terrain.js';
import { Decorator } from './decorate.js';
import { StructureGenerator } from './structures.js';
import { BIOMES, biomeById, BIOME_TINT_PROVIDER } from './biomes.js';
import { WeatherSystem } from './weather.js';
import { BLOCK_ENTITY_FACTORY, deserializeBlockEntity, BlockEntity } from './blockEntities.js';
import { randomTickBlock } from './randomTicks.js';
import { Entity, ItemEntity, Projectile } from '../entities/entity.js';
import { AIController, SpawnManager, TargetSelector } from '../entities/ai.js';
import { PathQueue, VoxelPathfinder } from '../entities/pathfind.js';
import { getMobDef, ALL_MOB_DEFS } from '../entities/mobs/index.js';
import { makeRng, hash2i, hash3i } from '../core/rng.js';
import { clamp, clamp01, lerp, DIRS, HDIRS } from '../core/util.js';

// Fixed-timestep constants.
const WORLD_TICK_RATE = 20;
const WORLD_TICK_MS = 1000 / WORLD_TICK_RATE;   // 50
const WORLD_MAX_CATCHUP_TICKS = 5;

// Per-frame chunk pipeline budget (never exceed these — the frame must not stall).
const WORLD_DEFAULT_BUDGET = {
  maxGenPerFrame: 1,
  maxDecoratePerFrame: 1,
  maxLightPerFrame: 2,
  maxMeshPerFrame: 2,
};

const WORLD_DEFAULT_RENDER_DISTANCE = 8;
const WORLD_DAY_LENGTH = 24000;
const WORLD_PATH_NODE_BUDGET = 1500;   // A* nodes per tick across all mobs
const WORLD_RANDOM_TICKS_PER_SECTION = 3;
/**
 * Chunks given random block ticks per world tick. The eligible set is walked
 * round-robin, so every chunk is still reached regularly (81 chunks / 8 per tick
 * = every ~0.5s at 20Hz) without spending the whole frame budget on it.
 */
const WORLD_RANDOM_TICK_CHUNKS_PER_TICK = 8;
/**
 * Wall-clock ceiling for the whole chunk-streaming pass, in milliseconds. Keeps
 * a 60fps frame (16.7ms) intact even when a chunk is expensive: leftover work
 * simply resumes on the next frame.
 */
const WORLD_STREAM_BUDGET_MS = 6;
const WORLD_now = (typeof performance !== 'undefined' && performance.now)
  ? () => performance.now()
  : () => Date.now();
const WORLD_ENTITY_HARD_CAP = 600;     // absolute safety cap on entity count

// Ids that behave as projectiles rather than mobs.
const WORLD_PROJECTILE_IDS = new Set([
  'arrow', 'fireball', 'small_fireball', 'snowball', 'egg', 'ender_pearl',
  'wither_skull', 'shulker_bullet', 'llama_spit', 'witch_potion', 'dragon_fireball',
  'evoker_fangs',
]);

function WORLD_floorDiv(a, b) { return Math.floor(a / b); }

/**
 * Remove fluid blocks above sea level that have nothing solid underneath.
 * Runs once per chunk right after decoration/structures, which is the only
 * stage that can create them.
 */
function WORLD_stripFloatingFluid(chunk, registry, flags) {
  const SEA = 62;
  let removed = 0;
  for (let x = 0; x < CHUNK_W; x++) {
    for (let z = 0; z < CHUNK_W; z++) {
      const base = (x * CHUNK_W + z) * CHUNK_H;
      for (let y = CHUNK_H - 2; y > SEA; y--) {
        const id = chunk.blocks[base + y];
        if (id === 0 || flags.fluid[id] === 0) continue;
        const below = chunk.blocks[base + y - 1];
        // Supported by ground or by more of the same fluid: fine.
        if (flags.solid[below] || flags.fluid[below] !== 0) continue;
        chunk.blocks[base + y] = 0;
        chunk.meta[base + y] = 0;
        removed++;
      }
    }
  }
  return removed;
}

// Smooth daylight curve: 1 at noon, 0 deep night, with dawn/dusk ramps.
function WORLD_daylightCurve(t01) {
  // Minecraft time convention: tick 0 = DAWN, 6000 = noon, 12000 = dusk,
  // 18000 = midnight. So t01 0 = dawn, 0.25 = noon, 0.5 = dusk, 0.75 = midnight
  // and the sun height peaks at t01 = 0.25, i.e. sin(t01 * 2PI).
  const h = Math.sin(t01 * Math.PI * 2);     // -1..1, +1 at noon, -1 at midnight
  // Map -0.2..0.4 of sun height onto 0..1 so dawn/dusk ramp smoothly and night
  // sits at a low ambient rather than pure black.
  return clamp01((h + 0.2) / 0.6);
}

// ===========================================================================
// World
// ===========================================================================
export class World {
  /**
   * @param {object} opts
   *   seed:number, registry:BlockRegistry, flags:BlockFlags,
   *   dimension:'overworld'|'nether'|'end', atlas:(tile lookup), settings:object
   */
  constructor(opts = {}) {
    this.seed = (opts.seed != null ? opts.seed : 0) >>> 0;
    this._registry = opts.registry;
    this._flags = opts.flags;
    this.registry = opts.registry;     // public alias
    this.flags = opts.flags;           // public alias
    this.dimension = opts.dimension || 'overworld';
    this.atlas = opts.atlas || null;
    this.settings = Object.assign(
      { renderDistance: WORLD_DEFAULT_RENDER_DISTANCE, ao: true, smoothLight: true },
      WORLD_DEFAULT_BUDGET,
      opts.settings || {},
    );

    // Deterministic master RNG (all randomness derives from this).
    this.rand = makeRng((this.seed ^ WORLD_hashDim(this.dimension)) >>> 0);

    // Chunk store.
    /** @type {Map<number, Chunk>} */
    this.chunks = new Map();

    // Subsystems.
    this.lighting = new LightEngine(this, this._flags);
    this.fluids = new FluidSystem(this, this._flags, this._registry);
    this.terrain = new TerrainGenerator(this.seed, this._registry, this._flags);
    this.decorator = new Decorator(this.seed, this._registry, this._flags);
    this.structures = new StructureGenerator(this.seed, this._registry, this._flags);
    this.mesher = new Mesher({
      flags: this._flags,
      registry: this._registry,
      tileIndex: (id, face, role) => this._tileIndex(id, face, role),
      animIndex: (id, face) => this._animIndex(id, face),
      biomes: BIOME_TINT_PROVIDER,
      settings: this.settings,
    });
    this.weather = new WeatherSystem(this, null, null);
    this.spawnManager = new SpawnManager(this);
    this.pathQueue = new PathQueue();

    // Mob defs exposed to the SpawnManager.
    this.mobDefs = ALL_MOB_DEFS;

    // Entities.
    /** @type {Entity[]} */
    this.entities = [];
    /** @type {Map<number, Entity>} */
    this.entityById = new Map();
    /** @type {Entity[]} */
    this.players = [];

    // Time / environment.
    this.timeOfDay = opts.timeOfDay != null ? opts.timeOfDay : 1000;  // 0..24000
    this.dayCount = 0;
    this.tickCount = 0;
    this.tickAlpha = 0;
    /** Chunks needing a floating-fluid re-sweep once neighbours finish. */
    this._resweep = new Set();
    /**
     * Chunks whose geometry changed and must be re-uploaded to the GPU. The
     * renderer drains this instead of rescanning every loaded chunk per frame.
     */
    this.pendingUploads = new Set();
    /** Packed keys of chunks unloaded since the renderer last looked. */
    this.unloadedKeys = [];
    this._accum = 0;

    // Position of the tracked player (used by weather / spawn / chunk loading).
    this.playerPos = { x: 0, y: 70, z: 0 };

    // Instrumentation counters (reset each frame; read by tests / profilers).
    this.stats = { gen: 0, decorate: 0, light: 0, mesh: 0, unload: 0 };

    // Reusable spiral scan cache for chunk streaming.
    this._loadOrder = null;
    this._loadOrderRD = -1;

    // Block-entity tick registry (all block entities across loaded chunks).
    /** @type {Set<object>} */
    this._blockEntities = new Set();

    // Portal linking bookkeeping (used by DimensionManager).
    this.portalLinks = new Map();

    // Resolve a few hot block ids once.
    this._ids = WORLD_resolveIds(this._registry);

    // Nether/End have no natural skylight source.
    this.hasSky = this.dimension !== 'nether';
  }

  // -------------------------------------------------------------------------
  // Chunk management
  // -------------------------------------------------------------------------
  getChunk(cx, cz) { return this.chunks.get(chunkKey(cx, cz)) || null; }
  hasChunk(cx, cz) { return this.chunks.has(chunkKey(cx, cz)); }

  getOrCreateChunk(cx, cz) {
    const k = chunkKey(cx, cz);
    let c = this.chunks.get(k);
    if (!c) { c = new Chunk(cx, cz); this.chunks.set(k, c); }
    return c;
  }

  unloadChunk(cx, cz) {
    const k = chunkKey(cx, cz);
    const c = this.chunks.get(k);
    if (!c) return;
    // Save the delta if modified.
    if (c.modified) this._stashDelta(c);
    // Drop block entities from the tick set.
    for (const be of c.blockEntities.values()) this._blockEntities.delete(be);
    this.chunks.delete(k);
    this._resweep.delete(c);
    this.pendingUploads.delete(c);
    // Tell the renderer to release this chunk's GPU meshes. The key format
    // matches the one ChunkRenderer uses internally.
    this.unloadedKeys.push((cx & 0xffff) | ((cz & 0xffff) << 16));
    this.stats.unload++;
  }

  // -------------------------------------------------------------------------
  // Coordinate helpers
  // -------------------------------------------------------------------------
  _chunkCoords(x, z) { return [WORLD_floorDiv(x, CHUNK_W), WORLD_floorDiv(z, CHUNK_W)]; }
  _localIndex(x, y, z) {
    const lx = x - WORLD_floorDiv(x, CHUNK_W) * CHUNK_W;
    const lz = z - WORLD_floorDiv(z, CHUNK_W) * CHUNK_W;
    return (lx * CHUNK_W + lz) * CHUNK_H + y;
  }

  // -------------------------------------------------------------------------
  // Block access (all world coordinates)
  // -------------------------------------------------------------------------
  getBlock(x, y, z) {
    if (y < 0 || y >= CHUNK_H) return 0;
    const cx = WORLD_floorDiv(x, CHUNK_W), cz = WORLD_floorDiv(z, CHUNK_W);
    const c = this.chunks.get(chunkKey(cx, cz));
    if (!c) return 0;
    const lx = x - cx * CHUNK_W, lz = z - cz * CHUNK_W;
    return c.blocks[(lx * CHUNK_W + lz) * CHUNK_H + y];
  }

  isAir(x, y, z) { return this.getBlock(x, y, z) === 0; }

  isSolid(x, y, z) {
    const id = this.getBlock(x, y, z);
    return id !== 0 && this._flags.solid[id] === 1;
  }

  isFluid(x, y, z) {
    const id = this.getBlock(x, y, z);
    return id !== 0 && this._flags.fluid[id] !== 0;
  }

  getMeta(x, y, z) {
    if (y < 0 || y >= CHUNK_H) return 0;
    const cx = WORLD_floorDiv(x, CHUNK_W), cz = WORLD_floorDiv(z, CHUNK_W);
    const c = this.chunks.get(chunkKey(cx, cz));
    if (!c) return 0;
    const lx = x - cx * CHUNK_W, lz = z - cz * CHUNK_W;
    return c.meta[(lx * CHUNK_W + lz) * CHUNK_H + y];
  }

  setMeta(x, y, z, v) {
    if (y < 0 || y >= CHUNK_H) return;
    const cx = WORLD_floorDiv(x, CHUNK_W), cz = WORLD_floorDiv(z, CHUNK_W);
    const c = this.chunks.get(chunkKey(cx, cz));
    if (!c) return;
    const lx = x - cx * CHUNK_W, lz = z - cz * CHUNK_W;
    c.meta[(lx * CHUNK_W + lz) * CHUNK_H + y] = v & 0xff;
    c.modified = true;
  }

  // ---- light channels ------------------------------------------------------
  getSkyLight(x, y, z) {
    if (y < 0) return 0;
    if (y >= CHUNK_H) return this.hasSky ? 15 : 0;
    const cx = WORLD_floorDiv(x, CHUNK_W), cz = WORLD_floorDiv(z, CHUNK_W);
    const c = this.chunks.get(chunkKey(cx, cz));
    if (!c) return this.hasSky ? 15 : 0;
    const lx = x - cx * CHUNK_W, lz = z - cz * CHUNK_W;
    return c.light[(lx * CHUNK_W + lz) * CHUNK_H + y] >> 4;
  }

  getBlockLight(x, y, z) {
    if (y < 0 || y >= CHUNK_H) return 0;
    const cx = WORLD_floorDiv(x, CHUNK_W), cz = WORLD_floorDiv(z, CHUNK_W);
    const c = this.chunks.get(chunkKey(cx, cz));
    if (!c) return 0;
    const lx = x - cx * CHUNK_W, lz = z - cz * CHUNK_W;
    return c.light[(lx * CHUNK_W + lz) * CHUNK_H + y] & 15;
  }

  setSkyLight(x, y, z, v) {
    if (y < 0 || y >= CHUNK_H) return;
    const cx = WORLD_floorDiv(x, CHUNK_W), cz = WORLD_floorDiv(z, CHUNK_W);
    const c = this.chunks.get(chunkKey(cx, cz));
    if (!c) return;
    const lx = x - cx * CHUNK_W, lz = z - cz * CHUNK_W;
    const i = (lx * CHUNK_W + lz) * CHUNK_H + y;
    c.light[i] = (c.light[i] & 15) | ((v & 15) << 4);
  }

  setBlockLight(x, y, z, v) {
    if (y < 0 || y >= CHUNK_H) return;
    const cx = WORLD_floorDiv(x, CHUNK_W), cz = WORLD_floorDiv(z, CHUNK_W);
    const c = this.chunks.get(chunkKey(cx, cz));
    if (!c) return;
    const lx = x - cx * CHUNK_W, lz = z - cz * CHUNK_W;
    const i = (lx * CHUNK_W + lz) * CHUNK_H + y;
    c.light[i] = (c.light[i] & 0xf0) | (v & 15);
  }

  /** Combined light 0..15: max of daylight-scaled skylight and block light. */
  getLight(x, y, z) {
    const block = this.getBlockLight(x, y, z);
    const sky = this.getSkyLight(x, y, z);
    const dl = this.hasSky ? this.daylight : 0;
    const skyEff = Math.round(sky * dl);
    return Math.max(block, skyEff);
  }

  // ---- biomes / height -----------------------------------------------------
  biomeIdAt(x, z) {
    const cx = WORLD_floorDiv(x, CHUNK_W), cz = WORLD_floorDiv(z, CHUNK_W);
    const c = this.chunks.get(chunkKey(cx, cz));
    if (!c) return 0;
    const lx = x - cx * CHUNK_W, lz = z - cz * CHUNK_W;
    return c.biome[lx * CHUNK_W + lz];
  }

  biomeAt(x, z) { return biomeById(this.biomeIdAt(x, z)); }

  heightAt(x, z) {
    const cx = WORLD_floorDiv(x, CHUNK_W), cz = WORLD_floorDiv(z, CHUNK_W);
    const c = this.chunks.get(chunkKey(cx, cz));
    if (!c) return 0;
    const lx = x - cx * CHUNK_W, lz = z - cz * CHUNK_W;
    return c.heightMap[lx * CHUNK_W + lz];
  }

  markDirty(x, y, z) {
    const cx = WORLD_floorDiv(x, CHUNK_W), cz = WORLD_floorDiv(z, CHUNK_W);
    const c = this.chunks.get(chunkKey(cx, cz));
    if (c) c.markDirty(y);
    // Border remesh.
    const lx = x - cx * CHUNK_W, lz = z - cz * CHUNK_W;
    if (lx === 0) { const n = this.getChunk(cx - 1, cz); if (n) n.markDirty(y); }
    if (lx === CHUNK_W - 1) { const n = this.getChunk(cx + 1, cz); if (n) n.markDirty(y); }
    if (lz === 0) { const n = this.getChunk(cx, cz - 1); if (n) n.markDirty(y); }
    if (lz === CHUNK_W - 1) { const n = this.getChunk(cx, cz + 1); if (n) n.markDirty(y); }
  }

  /** Atlas tile index for a block face (used by particles / UI). */
  tileFor(blockId, face) {
    const def = this._registry.def(blockId);
    if (!def) return -1;
    const name = def.tileFor(face);
    if (!name) return -1;
    if (this.atlas && this.atlas.index && this.atlas.index.has(name)) return this.atlas.index.get(name);
    if (this.atlas && this.atlas.has && this.atlas.has(name)) return this.atlas.get(name);
    return -1;
  }

  // -------------------------------------------------------------------------
  // Mesher tile / anim lookup (adapts the block registry to the atlas).
  // -------------------------------------------------------------------------
  _tileIndex(id, face, role) {
    const def = this._registry.def(id);
    if (!def) return -1;
    let name;
    if (role) name = def.tiles[role] || def.tileFor(face);
    else name = def.tileFor(face);
    if (!name) return -1;
    const a = this.atlas;
    if (!a) {
      // Headless mode (no atlas built): fabricate a stable index from the block
      // id + face so the mesher still emits geometry with distinct tiles.
      return id * 6 + face;
    }
    if (a.index && a.index.has(name)) return a.index.get(name);
    if (a.has && a.has(name)) return a.get(name);
    return -1;
  }

  _animIndex(id, face) {
    const def = this._registry.def(id);
    if (!def) return 1;
    const name = def.tileFor(face);
    if (!name) return 1;
    const a = this.atlas;
    if (a && a.animByte) return a.animByte(name);
    return 1;
  }

  // -------------------------------------------------------------------------
  // setBlock — the central mutation. Updates the chunk, lighting, fluids,
  // block entities, support checks, gravity and dirty flags.
  // opts:
  //   noUpdate         skip lighting/fluid/support/gravity side effects entirely
  //   noFluidSchedule  skip only the fluid scheduling (used by the fluid system)
  //   keepEntity       keep an existing block entity (furnace lit<->unlit swap)
  //   keepMeta         do not clear metadata on change
  //   mobId, color, head  extra data for block-entity creation
  // -------------------------------------------------------------------------
  setBlock(x, y, z, id, opts) {
    if (y < 0 || y >= CHUNK_H) return false;
    // Allow callers to pass a block name string.
    if (typeof id === 'string') id = this._registry.idOr(id, 0);
    opts = opts || WORLD_EMPTY_OPTS;
    // During bulk generation/decoration/structure placement we skip the whole
    // side-effect pipeline (lighting/fluids/support/gravity) — those are applied
    // once the chunk is finalised, so writes stay O(1) and never recurse.
    if (this._generating && !opts.force) opts = opts === WORLD_EMPTY_OPTS ? WORLD_BULK_OPTS : Object.assign({ noUpdate: true }, opts);

    const cx = WORLD_floorDiv(x, CHUNK_W), cz = WORLD_floorDiv(z, CHUNK_W);
    const c = this.getOrCreateChunk(cx, cz);
    const lx = x - cx * CHUNK_W, lz = z - cz * CHUNK_W;
    const li = (lx * CHUNK_W + lz) * CHUNK_H + y;
    const oldId = c.blocks[li];
    if (oldId === id && !opts.force) return false;

    // --- write the block (keeps section counters correct) ---
    c.set(lx, y, z, id);
    if (!opts.keepMeta) c.meta[li] = 0;
    c.updateHeight(lx, lz, this._flags);
    c.modified = true;
    c.markDirty(y);
    this._markBorders(cx, cz, lx, lz, y);

    if (opts.noUpdate) {
      // Still keep block-entity bookkeeping coherent even in bulk mode.
      this._syncBlockEntity(c, x, y, z, lx, lz, li, oldId, id, opts);
      return true;
    }

    // --- block entities (create / destroy / preserve) ---
    this._syncBlockEntity(c, x, y, z, lx, lz, li, oldId, id, opts);

    // --- lighting ---
    this.lighting.onBlockChanged(x, y, z, oldId, id);

    // --- fluids ---
    if (!opts.noFluidSchedule) this.fluids.onBlockChanged(x, y, z, oldId, id);

    // --- gravity: this block may fall, and blocks above may now fall ---
    if (this._flags.gravity[id]) this.fluids.scheduleGravity(x, y, z);
    for (let dy = 1; dy <= 3; dy++) {
      const ab = this.getBlock(x, y + dy, z);
      if (this._flags.gravity[ab]) this.fluids.scheduleGravity(x, y + dy, z);
      else break;
    }

    // --- support: a block placed/removed can strand the block above ---
    // Bounded so a pathological chain of unsupported plants can't blow the stack.
    if ((this._supportDepth || 0) < 32) {
      this._supportDepth = (this._supportDepth || 0) + 1;
      this._checkSupportAround(x, y, z);
      this._supportDepth--;
    }

    return true;
  }

  /** Fetch the block entity at a world position, or null. */
  getBlockEntity(x, y, z) {
    if (y < 0 || y >= CHUNK_H) return null;
    const cx = WORLD_floorDiv(x, CHUNK_W), cz = WORLD_floorDiv(z, CHUNK_W);
    const c = this.chunks.get(chunkKey(cx, cz));
    if (!c) return null;
    const lx = x - cx * CHUNK_W, lz = z - cz * CHUNK_W;
    return c.blockEntities.get((lx * CHUNK_W + lz) * CHUNK_H + y) || null;
  }

  /**
   * Set / clear a block entity at a world position. Accepts either a real
   * BlockEntity instance or a plain data record (used by structures.fillChest
   * with { type:'chest', inventory:[...] }).
   */
  setBlockEntity(x, y, z, beOrData) {
    if (y < 0 || y >= CHUNK_H) return;
    const cx = WORLD_floorDiv(x, CHUNK_W), cz = WORLD_floorDiv(z, CHUNK_W);
    const c = this.getOrCreateChunk(cx, cz);
    const lx = x - cx * CHUNK_W, lz = z - cz * CHUNK_W;
    const li = (lx * CHUNK_W + lz) * CHUNK_H + y;
    const existing = c.blockEntities.get(li);
    if (existing) this._blockEntities.delete(existing);
    if (beOrData == null) { c.blockEntities.delete(li); c.modified = true; return; }
    let be = beOrData;
    if (!(be instanceof BlockEntity) && !be.serialize) {
      // Plain data: build the proper entity and load its inventory.
      const kind = beOrData.type || beOrData.kind || 'chest';
      const factory = BLOCK_ENTITY_FACTORY[kind];
      be = factory ? factory(x, y, z, beOrData) : null;
      if (be && Array.isArray(beOrData.inventory) && be.loadSlots) be.loadSlots(beOrData.inventory);
    }
    if (be) {
      c.blockEntities.set(li, be);
      this._blockEntities.add(be);
      c.modified = true;
    }
  }

  _markBorders(cx, cz, lx, lz, y) {
    if (lx === 0) { const n = this.getChunk(cx - 1, cz); if (n) n.markDirty(y); }
    if (lx === CHUNK_W - 1) { const n = this.getChunk(cx + 1, cz); if (n) n.markDirty(y); }
    if (lz === 0) { const n = this.getChunk(cx, cz - 1); if (n) n.markDirty(y); }
    if (lz === CHUNK_W - 1) { const n = this.getChunk(cx, cz + 1); if (n) n.markDirty(y); }
  }

  /** Create / destroy / preserve the block entity for a changed block. */
  _syncBlockEntity(c, x, y, z, lx, lz, li, oldId, id, opts) {
    const oldDef = this._registry.def(oldId);
    const newDef = this._registry.def(id);
    const oldKind = oldDef ? oldDef.entityBlock : null;
    const newKind = newDef ? newDef.entityBlock : null;

    if (oldKind && oldKind !== newKind) {
      const be = c.blockEntities.get(li);
      if (be) {
        if (be.onRemoved && !opts.keepEntity) be.onRemoved(this);
        this._blockEntities.delete(be);
        c.blockEntities.delete(li);
        c.modified = true;
      }
    }
    if (newKind && newKind !== oldKind) {
      // Preserve an existing entity when the kind is the same (furnace variants).
      let be = c.blockEntities.get(li);
      if (!be || (be.kind !== newKind)) {
        const factory = BLOCK_ENTITY_FACTORY[newKind];
        if (factory) {
          be = factory(x, y, z, opts);
          c.blockEntities.set(li, be);
          this._blockEntities.add(be);
          c.modified = true;
        }
      }
    } else if (newKind && oldKind === newKind) {
      // Same block-entity kind (e.g. furnace -> furnace_lit): make sure it is
      // registered for ticking.
      const be = c.blockEntities.get(li);
      if (be) this._blockEntities.add(be);
    }
  }

  /**
   * Enforce needsSupport for the 6 neighbours (and this cell). A block that
   * loses its support is broken and dropped.
   */
  _checkSupportAround(x, y, z) {
    // Check the block above (torch/plant/crop sitting on the changed block) plus
    // the 4 horizontal neighbours (for side-supported blocks like ladders).
    const positions = [
      [x, y + 1, z], [x, y - 1, z],
      [x + 1, y, z], [x - 1, y, z], [x, y, z + 1], [x, y, z - 1],
    ];
    for (const [px, py, pz] of positions) {
      if (py < 0 || py >= CHUNK_H) continue;
      const pid = this.getBlock(px, py, pz);
      if (pid === 0) continue;
      const def = this._registry.def(pid);
      if (!def || !def.needsSupport) continue;
      if (!this._hasSupport(px, py, pz, def.needsSupport)) {
        // Break and drop it.
        this.breakBlock(px, py, pz, { noXp: true });
      }
    }
  }

  _hasSupport(x, y, z, kind) {
    if (kind === 'below') {
      const below = this.getBlock(x, y - 1, z);
      if (below === 0) return false;
      const bd = this._registry.def(below);
      // Most plants need a solid/soil top face; fluids and non-solid don't count.
      return bd && (bd.solid || bd.renderKind === RK_BOXES) && bd.renderKind !== RK_CROSS;
    }
    if (kind === 'above') {
      return this.isSolid(x, y + 1, z);
    }
    if (kind === 'side') {
      for (const [dx, dz] of HDIRS) if (this.isSolid(x + dx, y, z + dz)) return true;
      return false;
    }
    return true;
  }

  // -------------------------------------------------------------------------
  // breakBlock — remove a block and spawn its drops / particles / sound / xp.
  // opts: { tool: {kind,tier} , silkTouch, noDrop, noXp, noParticles }
  // -------------------------------------------------------------------------
  breakBlock(x, y, z, opts) {
    opts = opts || WORLD_EMPTY_OPTS;
    const id = this.getBlock(x, y, z);
    if (id === 0) return false;
    const def = this._registry.def(id);
    if (!def) { this.setBlock(x, y, z, 0); return true; }

    // Particles using the block's real top-face tile.
    if (!opts.noParticles) {
      this.spawnParticles('blockBreak', x + 0.5, y + 0.5, z + 0.5, 12, { tile: this.tileFor(id, 2), blockId: id });
    }
    // Break sound.
    this.playSound(def.breakSound || 'stone', x, y, z, { volume: 0.9 });

    // Compute drops.
    if (!opts.noDrop) {
      const drops = this._computeDrops(def, opts);
      for (const d of drops) {
        this.dropItem(x + 0.5, y + 0.5, z + 0.5, d.item, d.count);
      }
    }
    // XP.
    if (!opts.noXp && def.xpDrop > 0) {
      const xp = def.xpDrop < 1
        ? (this.rand.chance(def.xpDrop) ? 1 : 0)
        : this.rand.range(Math.floor(def.xpDrop * 0.5), def.xpDrop);
      if (xp > 0) this.spawnEntity('xp_orb', x + 0.5, y + 0.5, z + 0.5, { value: xp });
    }

    this.setBlock(x, y, z, 0);
    return true;
  }

  _computeDrops(def, opts) {
    const out = [];
    const tool = opts.tool || null;
    const toolTier = tool ? (tool.tier != null ? tool.tier : 0) : 0;
    const toolKind = tool ? tool.kind : null;

    // Silk touch: drop the silk variant (or the block itself) instead.
    if (opts.silkTouch && def.silkTouchDrop) {
      out.push({ item: def.silkTouchDrop, count: 1 });
      return out;
    }

    // requiresTool: wrong / missing tool yields nothing.
    if (def.requiresTool) {
      const correct = WORLD_toolMatches(def.tool, toolKind) && toolTier >= (def.harvestLevel || 0);
      if (!correct) return out;
    }

    const table = def.drops || [];
    for (const d of table) {
      if (d.chance !== undefined && !this.rand.chance(d.chance)) continue;
      let n = d.max ? this.rand.range(d.count != null ? d.count : 1, d.max) : (d.count != null ? d.count : 1);
      if (n > 0) out.push({ item: d.item, count: n });
    }
    return out;
  }

  // -------------------------------------------------------------------------
  // raycast — voxel DDA honouring per-block shape boxes.
  // Returns {x,y,z,face,point,dist,blockId} or null.
  // opts: { includeFluids }
  // -------------------------------------------------------------------------
  raycast(origin, dir, maxDist, opts) {
    opts = opts || WORLD_EMPTY_OPTS;
    const md = maxDist != null ? maxDist : 8;
    // Normalise the direction.
    let dx = dir.x, dy = dir.y, dz = dir.z;
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-9) return null;
    dx /= len; dy /= len; dz /= len;

    let x = Math.floor(origin.x), y = Math.floor(origin.y), z = Math.floor(origin.z);
    const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
    const invDx = dx !== 0 ? Math.abs(1 / dx) : Infinity;
    const invDy = dy !== 0 ? Math.abs(1 / dy) : Infinity;
    const invDz = dz !== 0 ? Math.abs(1 / dz) : Infinity;

    // Distance to the first grid boundary on each axis.
    let tMaxX = dx !== 0 ? ((dx > 0 ? (x + 1 - origin.x) : (origin.x - x)) * invDx) : Infinity;
    let tMaxY = dy !== 0 ? ((dy > 0 ? (y + 1 - origin.y) : (origin.y - y)) * invDy) : Infinity;
    let tMaxZ = dz !== 0 ? ((dz > 0 ? (z + 1 - origin.z) : (origin.z - z)) * invDz) : Infinity;

    let face = -1;
    let t = 0;
    // Step at most a bounded number of voxels.
    const maxSteps = Math.ceil(md * 3) + 3;
    for (let i = 0; i < maxSteps; i++) {
      const id = this.getBlock(x, y, z);
      if (id !== 0) {
        const def = this._registry.def(id);
        const collidable = def && (def.collides || (opts.includeFluids && def.fluid) || def.renderKind === RK_BOXES || def.renderKind === RK_CROSS || (def.solid && def.renderKind === RK_CUBE));
        const skip = def && (def.replaceable && !def.fluid) && def.renderKind !== RK_BOXES;
        if (collidable && !skip) {
          // Refine against the block's shape boxes for BOXES-kind blocks.
          const hit = this._raycastBlock(origin, dx, dy, dz, x, y, z, def, md, face, opts);
          if (hit) return hit;
          // Otherwise fall through and keep stepping (thin shape missed).
        }
      }
      // Advance to the next voxel.
      if (tMaxX <= tMaxY && tMaxX <= tMaxZ) {
        x += stepX; t = tMaxX; tMaxX += invDx; face = stepX > 0 ? 1 : 0;
      } else if (tMaxY <= tMaxZ) {
        y += stepY; t = tMaxY; tMaxY += invDy; face = stepY > 0 ? 3 : 2;
      } else {
        z += stepZ; t = tMaxZ; tMaxZ += invDz; face = stepZ > 0 ? 5 : 4;
      }
      if (t > md) break;
    }
    return null;
  }

  /** Test a ray against a specific block's shape boxes; returns a hit or null. */
  _raycastBlock(origin, dx, dy, dz, bx, by, bz, def, md, enterFace, opts) {
    // Fluids / air use the full cube for simplicity when included.
    let boxes;
    if (def.renderKind === RK_BOXES && def.shape && def.shape.length) {
      boxes = def.shape;
    } else if (def.renderKind === RK_CROSS) {
      // Cross plants have a thin central column; approximate with an inset box.
      boxes = WORLD_CROSS_BOX;
    } else {
      boxes = WORLD_FULL_UNIT_BOX;
    }
    let best = null, bestT = Infinity, bestFace = enterFace;
    for (const b of boxes) {
      const minX = bx + b.x0, minY = by + b.y0, minZ = bz + b.z0;
      const maxX = bx + b.x1, maxY = by + b.y1, maxZ = bz + b.z1;
      const r = WORLD_rayBox(origin.x, origin.y, origin.z, dx, dy, dz, minX, minY, minZ, maxX, maxY, maxZ);
      if (r && r.t <= md && r.t < bestT) { bestT = r.t; bestFace = r.face; best = r; }
    }
    if (!best) return null;
    return {
      x: bx, y: by, z: bz, face: bestFace,
      point: { x: origin.x + dx * bestT, y: origin.y + dy * bestT, z: origin.z + dz * bestT },
      dist: bestT, blockId: this.getBlock(bx, by, bz),
    };
  }

  // -------------------------------------------------------------------------
  // explode — delegate to the FluidSystem's raycast blast (shared crater logic).
  // -------------------------------------------------------------------------
  explode(x, y, z, power, opts) {
    return this.fluids.explode(x, y, z, power, opts || {});
  }

  // -------------------------------------------------------------------------
  // Entities
  // -------------------------------------------------------------------------
  /**
   * Register an already-constructed entity into the world. Assigns an AI
   * controller if the entity has a mob def, and indexes it.
   */
  addEntity(e) {
    if (this.entities.length >= WORLD_ENTITY_HARD_CAP) return e;
    this.entities.push(e);
    this.entityById.set(e.id, e);
    if (e.type === 'player') this.players.push(e);
    if (e.def && e.def.ai && !e.ai) {
      e.ai = new AIController(e, this);
      e.targetSelector = new TargetSelector(e, this);
    }
    return e;
  }

  /**
   * Spawn a mob / entity by id. Handles mob defs, projectiles, items and the
   * pseudo-entities the AI spawns (xp_orb, evoker_fangs, ...).
   */
  spawnEntity(id, x, y, z, opts) {
    opts = opts || WORLD_EMPTY_OPTS;

    // Item entities (used by structures for pre-filled drops etc).
    if (id === 'item') {
      return this.dropItem(x, y, z, opts.item, opts.count || 1);
    }

    // Projectiles.
    if (WORLD_PROJECTILE_IDS.has(id)) {
      return this._spawnProjectileInternal(id, x, y, z, opts);
    }

    // Resolve a mob def; unknown ids become inert generic entities (xp_orb, etc).
    let def = opts.def || null;
    if (!def) {
      try { def = getMobDef(id); } catch (e) { def = null; }
    }

    const e = new Entity(id, def);
    e.pos.x = x; e.pos.y = y; e.pos.z = z;
    e.prevPos.x = x; e.prevPos.y = y; e.prevPos.z = z;

    if (def) {
      e.health = def.health || 20;
      e.maxHealth = e.health;
      // Random skin variant.
      if (def.variants && def.variants > 1) {
        e.variant = opts.variant != null ? opts.variant : this.rand.int(def.variants);
      } else {
        e.variant = opts.variant || 0;
      }
      if (opts.baby) { e.baby = true; }
      if (opts.owner) e.owner = opts.owner;
      if (opts.target) e.target = opts.target;
    } else {
      // Pseudo entity (xp orb, fangs, spit...) — carry a value / lifetime.
      e.value = opts.value || 0;
      e.itemId = opts.item || null;
      e.owner = opts.owner || null;
      e.target = opts.target || null;
      e.width = 0.25; e.height = 0.25;
      if (id === 'xp_orb') { e.health = 5; e.maxHealth = 5; }
      e.pseudo = true;
    }
    return this.addEntity(e);
  }

  _spawnProjectileInternal(id, x, y, z, opts) {
    const p = new Projectile(id, opts.owner || null);
    p.pos.x = x; p.pos.y = y; p.pos.z = z;
    p.prevPos.x = x; p.prevPos.y = y; p.prevPos.z = z;
    if (opts.damage != null) p.damage = opts.damage;
    // Aim at a target if provided.
    if (opts.target && opts.target.pos) {
      const t = opts.target;
      const ddx = t.pos.x - x, ddy = (t.pos.y + (t.height || 1) * 0.5) - y, ddz = t.pos.z - z;
      const d = Math.hypot(ddx, ddy, ddz) || 1;
      const speed = opts.speed != null ? opts.speed : 1.2;
      p.vel.x = ddx / d * speed; p.vel.y = ddy / d * speed; p.vel.z = ddz / d * speed;
    } else if (opts.vel) {
      p.vel.x = opts.vel.x; p.vel.y = opts.vel.y; p.vel.z = opts.vel.z;
    }
    return this.addEntity(p);
  }

  /** Public projectile spawn (aim + velocity are computed from opts). */
  spawnProjectile(id, x, y, z, opts) {
    return this._spawnProjectileInternal(id, x, y, z, opts || {});
  }

  removeEntity(e) {
    if (!e) return;
    e.removed = true;
    const idx = this.entities.indexOf(e);
    if (idx !== -1) this.entities.splice(idx, 1);
    this.entityById.delete(e.id);
    const pidx = this.players.indexOf(e);
    if (pidx !== -1) this.players.splice(pidx, 1);
  }

  /** Drop an item entity with a small random velocity. */
  dropItem(x, y, z, itemId, count) {
    if (!itemId || count <= 0) return null;
    const e = new ItemEntity(itemId, count);
    e.pos.x = x; e.pos.y = y; e.pos.z = z;
    e.prevPos.x = x; e.prevPos.y = y; e.prevPos.z = z;
    e.vel.x = (this.rand.next() - 0.5) * 0.2;
    e.vel.y = 0.2 + this.rand.next() * 0.1;
    e.vel.z = (this.rand.next() - 0.5) * 0.2;
    e.itemId = itemId;   // convenience alias used by some AI (allay)
    return this.addEntity(e);
  }

  /** All entities whose AABB overlaps `box`. */
  entitiesInAabb(box, exclude) {
    const out = [];
    for (const e of this.entities) {
      if (e === exclude || e.removed) continue;
      const eb = e.aabbOf();
      if (eb.minX < box.maxX && eb.maxX > box.minX &&
          eb.minY < box.maxY && eb.maxY > box.minY &&
          eb.minZ < box.maxZ && eb.maxZ > box.minZ) {
        out.push(e);
      }
    }
    return out;
  }

  /** Nearest player entity to a point, or null. */
  nearestPlayer(x, y, z) {
    let best = null, bestD = Infinity;
    for (const p of this.players) {
      if (p.removed || p.dead) continue;
      const dx = p.pos.x - x, dy = p.pos.y - y, dz = p.pos.z - z;
      const d = dx * dx + dy * dy + dz * dz;
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  /** All players within `range` blocks of a point. */
  playersInRange(x, y, z, range) {
    const r2 = range * range;
    const out = [];
    for (const p of this.players) {
      if (p.removed) continue;
      const dx = p.pos.x - x, dy = p.pos.y - y, dz = p.pos.z - z;
      if (dx * dx + dy * dy + dz * dz <= r2) out.push(p);
    }
    return out;
  }

  // -------------------------------------------------------------------------
  // Sound / particle sinks. The renderer / audio engine can override these by
  // assigning callbacks; by default they buffer the most recent events so the
  // headless verifier and tests can assert against them without a GPU/audio ctx.
  // -------------------------------------------------------------------------
  playSound(name, x, y, z, opts) {
    if (this._soundSink) this._soundSink(name, x, y, z, opts || {});
  }

  spawnParticles(kind, x, y, z, count, opts) {
    if (this._particleSink) this._particleSink(kind, x, y, z, count, opts || {});
  }

  setSoundSink(fn) { this._soundSink = fn; }
  setParticleSink(fn) { this._particleSink = fn; }

  // =========================================================================
  // update(dt, playerPos) — the per-frame driver.
  //   1. stream chunks within render distance (budgeted)
  //   2. run fixed-timestep ticks (accumulator, capped catch-up)
  //   3. expose tickAlpha for render interpolation
  // =========================================================================
  update(dt, playerPos) {
    if (playerPos) this.playerPos = playerPos;
    // Reset per-frame stats.
    this.stats.gen = 0; this.stats.decorate = 0; this.stats.light = 0;
    this.stats.mesh = 0; this.stats.unload = 0;

    // --- chunk streaming under the frame budget ---
    this._streamChunks(this.playerPos);

    // --- fixed timestep simulation ---
    this._accum += dt * 1000;   // dt is seconds
    let ticks = 0;
    while (this._accum >= WORLD_TICK_MS && ticks < WORLD_MAX_CATCHUP_TICKS) {
      this.tick();
      this._accum -= WORLD_TICK_MS;
      ticks++;
    }
    if (ticks === WORLD_MAX_CATCHUP_TICKS) this._accum = 0;   // avoid death spiral
    this.tickAlpha = clamp01(this._accum / WORLD_TICK_MS);
    return ticks;
  }

  // -------------------------------------------------------------------------
  // Chunk streaming pipeline. Nearest-first, budgeted per phase per frame.
  // -------------------------------------------------------------------------
  _streamChunks(playerPos) {
    const rd = this.settings.renderDistance | 0;
    const pcx = WORLD_floorDiv(Math.floor(playerPos.x), CHUNK_W);
    const pcz = WORLD_floorDiv(Math.floor(playerPos.z), CHUNK_W);

    // Rebuild the spiral offset list if render distance changed.
    //
    // The spiral covers rd + 2 rings, wider than the render distance. A chunk
    // is only meshed once all 8 of its neighbours are generated and lit, so if
    // the spiral stopped exactly at rd the outermost ring would wait forever on
    // neighbours that are never created — chunks stalled at "generated but not
    // meshed" and the visible world stopped growing (measured: stuck at 9 of 29).
    // Two rings are needed, not one: the extra ring must itself be decorated,
    // and decoration also requires its own 8 neighbours to be generated.
    if (this._loadOrderRD !== rd) {
      this._loadOrder = WORLD_buildSpiral(rd + 2);
      this._loadOrderRD = rd;
    }

    // --- unload chunks beyond renderDistance + 2 ---
    const keep = rd + 2;
    for (const c of this.chunks.values()) {
      const ddx = c.cx - pcx, ddz = c.cz - pcz;
      if (Math.max(Math.abs(ddx), Math.abs(ddz)) > keep) {
        this.unloadChunk(c.cx, c.cz);
      }
    }

    let genBudget = this.settings.maxGenPerFrame;
    let decBudget = this.settings.maxDecoratePerFrame;
    let litBudget = this.settings.maxLightPerFrame;
    let meshBudget = this.settings.maxMeshPerFrame;

    // Count budgets alone are not enough: a single dense chunk can take ~20ms
    // to generate or mesh, so "3 chunks per frame" can blow a 16ms frame three
    // times over. Cap the whole streaming pass by wall-clock time as well and
    // resume next frame — this is what turns hitching into smooth streaming.
    const timeBudgetMs = this.settings.streamBudgetMs || WORLD_STREAM_BUDGET_MS;
    const startMs = WORLD_now();
    const outOfTime = () => (WORLD_now() - startMs) >= timeBudgetMs;
    // A single chunk can legitimately cost more than the whole frame budget
    // (~10ms to mesh a dense one). So the rule is: always let the FIRST unit of
    // work through to guarantee forward progress, then bail out of the entire
    // pass as soon as the budget is gone. That converts a 3-chunk 30ms stall
    // into one ~10ms step per frame.
    let didWork = false;
    const stop = () => didWork && outOfTime();

    // Walk nearest-first. Each chunk advances one stage per frame at most.
    for (const [ox, oz] of this._loadOrder) {
      const cx = pcx + ox, cz = pcz + oz;
      const c = this.getOrCreateChunk(cx, cz);

      // Stage 1: terrain generation.
      if (!c.generated) {
        if (genBudget <= 0) continue;
        if (stop()) break;
        this._generateChunk(c);
        didWork = true;
        genBudget--;
        this.stats.gen++;
        continue;   // one stage per chunk per frame
      }

      // Stage 2: decoration + structures (needs the 8 neighbours generated so
      // features can cross the border safely).
      if (!c.populated) {
        if (!this._neighboursGenerated(cx, cz)) continue;
        if (decBudget <= 0) continue;
        if (stop()) break;
        this._decorateChunk(c);
        didWork = true;
        decBudget--;
        this.stats.decorate++;
        continue;
      }

      // Stage 3: initial skylight flood.
      if (!c.lit) {
        if (litBudget <= 0) continue;
        if (stop()) break;
        didWork = true;
        this.lighting.initSkyLight(c);
        this.lighting.seedSkyBorders(c);
        this.lighting.flush();
        c.lit = true;
        this.stats.light++;
        continue;
      }

      // Stage 4: mesh — but only once all 8 neighbours are generated + lit.
      if (!c.neighborsReady) {
        if (this._neighboursReady(cx, cz)) c.neighborsReady = true;
        else continue;
      }
      if (c.dirty && c.meshReady !== undefined) {
        // already meshed once; remesh handled below in the dirty pass
      }
      if (!c.meshed || c.dirty) {
        if (meshBudget <= 0) continue;
        if (stop()) break;
        this._meshChunk(c);
        didWork = true;
        meshBudget--;
        this.stats.mesh++;
        continue;
      }
    }

    // ---- floating-fluid re-sweep -------------------------------------------
    // Once every neighbour of a chunk has finished populating, no further
    // cross-border decoration writes can land in it, so it is finally safe to
    // enforce the "no unsupported fluid above sea level" invariant.
    if (this._resweep.size) {
      const done = [];
      for (const rc of this._resweep) {
        if (!rc.populated) { done.push(rc); continue; }
        let ready = true;
        for (let dz = -1; dz <= 1 && ready; dz++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nc = this.getChunk(rc.cx + dx, rc.cz + dz);
            if (!nc || !nc.populated) { ready = false; break; }
          }
        }
        if (!ready) continue;
        if (WORLD_stripFloatingFluid(rc, this._registry, this._flags)) {
          rc.markDirty();
          rc.rebuildHeightMap(this._flags);
          rc.rebuildSectionCounts();
        }
        done.push(rc);
      }
      for (const rc of done) this._resweep.delete(rc);
    }

    // Remesh any chunk marked dirty (e.g. by a lighting flush or block edit)
    // that is already fully set up but wasn't reached above, still budgeted.
    if (meshBudget > 0 && !stop()) {
      for (const c of this.chunks.values()) {
        if (meshBudget <= 0 || stop()) break;
        if (c.meshed && c.dirty && c.neighborsReady) {
          this._meshChunk(c);
          didWork = true;
          meshBudget--;
          this.stats.mesh++;
        }
      }
    }
  }

  _neighboursGenerated(cx, cz) {
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dz === 0) continue;
        const n = this.getChunk(cx + dx, cz + dz);
        if (!n || !n.generated) return false;
      }
    }
    return true;
  }

  _neighboursReady(cx, cz) {
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dz === 0) continue;
        const n = this.getChunk(cx + dx, cz + dz);
        if (!n || !n.generated || !n.lit) return false;
      }
    }
    return true;
  }

  _generateChunk(c) {
    const prev = this._generating;
    this._generating = true;
    this.terrain.generateChunk(c);
    this._generating = prev;
    c.generated = true;
  }

  _decorateChunk(c) {
    const prev = this._generating;
    this._generating = true;
    this.decorator.decorate(this, c);
    const biome = biomeById(c.biome[0]);
    this.structures.placeFor(this, c, biome);
    this._generating = prev;
    // Post-condition: decoration must never leave a fluid block hovering with
    // air beneath it above sea level. Such a block can never settle, so the
    // fluid simulator would chase it forever (a real livelock we hit in
    // testing). Sweep it away here so the invariant holds no matter which
    // feature or structure produced it.
    // Decoration writes across chunk borders (wide canopies, ponds, small
    // structures), and a neighbour decorated LATER can drop fluid into a chunk
    // that was already swept. So sweep this 3x3 now and also queue the ring for
    // a re-sweep once every neighbour has finished populating.
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nc = this.getChunk(c.cx + dx, c.cz + dz);
        if (nc && nc.generated) {
          WORLD_stripFloatingFluid(nc, this._registry, this._flags);
          if (nc !== c) this._resweep.add(nc);
        }
      }
    }
    this._resweep.add(c);
    c.rebuildHeightMap(this._flags);
    c.rebuildSectionCounts();
    c.populated = true;
    // Reset the modified flag set by decoration writes: decoration is part of
    // generation, so a freshly-generated+decorated chunk is NOT "modified".
    c.modified = false;
    c.dirty = true;
    c.dirtySections.clear();
  }

  _meshChunk(c) {
    const result = this.mesher.mesh(this, c.cx, c.cz);
    c.meshData = result;
    c.meshed = true;
    c.dirty = false;
    c.dirtySections.clear();
    c.faces = result ? result.faces : 0;
    // Bump the generation counter so the renderer knows this chunk's geometry
    // changed and re-uploads it. Without this a remesh (after breaking or
    // placing a block, or a light update) never reaches the GPU and the world
    // appears frozen.
    c._meshGeneration = (c._meshGeneration || 0) + 1;
    this.pendingUploads.add(c);
    return result;
  }

  /** Force-generate a chunk immediately (used by tests / structure placement). */
  ensureChunk(cx, cz) {
    const c = this.getOrCreateChunk(cx, cz);
    if (!c.generated) this._generateChunk(c);
    return c;
  }

  /** Force a chunk all the way through generation+decoration+light. */
  ensureChunkReady(cx, cz) {
    // Generate a 3x3 so decoration + light have neighbours.
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) this.ensureChunk(cx + dx, cz + dz);
    }
    const c = this.getChunk(cx, cz);
    if (!c.populated) this._decorateChunk(c);
    if (!c.lit) {
      this.lighting.initSkyLight(c);
      this.lighting.seedSkyBorders(c);
      this.lighting.flush();
      c.lit = true;
    }
    return c;
  }

  // =========================================================================
  // tick() — one fixed 20 Hz simulation step.
  // Order: time -> weather -> fluids -> lighting -> block entities ->
  //        random ticks -> entities (+AI) -> spawns -> pathing -> despawn.
  // =========================================================================
  tick() {
    this.tickCount++;

    // --- time of day ---
    this.timeOfDay += 1;
    if (this.timeOfDay >= WORLD_DAY_LENGTH) {
      this.timeOfDay -= WORLD_DAY_LENGTH;
      this.dayCount++;
    }

    // --- weather ---
    if (this.weather) this.weather.tick();

    // --- fluids (water/lava spread, gravity blocks) ---
    this.fluids.tick();

    // --- lighting propagation ---
    this.lighting.flush();
    // Any chunks the lighting touched need a remesh.
    const touched = this.lighting.takeTouched();
    for (const c of touched) { if (c) c.dirty = true; }

    // --- block entities (furnaces smelt, chests animate, spawners fire) ---
    for (const be of this._blockEntities) {
      if (be.tick) be.tick(this);
    }

    // --- random block ticks (crops, grass, decay, fire, ice, ...) ---
    this._runRandomTicks();

    // --- entities ---
    this._tickEntities();

    // --- natural mob spawning + despawn ---
    if (this.spawnManager) this.spawnManager.tick();

    // --- budgeted pathfinding for mob requests ---
    if (this.pathQueue) this.pathQueue.runBudget(WORLD_PATH_NODE_BUDGET);

    // --- despawn / cleanup pass ---
    this._despawnPass();
  }

  /**
   * Random block ticks (crop growth, grass spread, leaf decay, fire, ice...).
   *
   * Ticking every nearby chunk every tick is what made this the single worst
   * frame-time spike in the profile: at radius 4 that is 81 chunks x 8 sections
   * x 3 positions = ~1900 dispatches per tick, 20 times a second. Instead we
   * round-robin through the eligible chunks a few at a time, so the same ground
   * still gets covered over a couple of seconds at a fraction of the cost per
   * tick. Growth is a slow, probabilistic process, so this is invisible in play.
   */
  _runRandomTicks() {
    const pcx = WORLD_floorDiv(Math.floor(this.playerPos.x), CHUNK_W);
    const pcz = WORLD_floorDiv(Math.floor(this.playerPos.z), CHUNK_W);
    const radius = Math.min(4, this.settings.renderDistance);

    // Refresh the candidate list occasionally rather than every tick.
    if (!this._rtList || this._rtRefresh <= 0
        || this._rtCx !== pcx || this._rtCz !== pcz) {
      this._rtList = [];
      for (const c of this.chunks.values()) {
        if (!c.generated) continue;
        if (Math.abs(c.cx - pcx) > radius || Math.abs(c.cz - pcz) > radius) continue;
        this._rtList.push(c);
      }
      this._rtRefresh = 40;          // rebuild at most every 2 seconds
      this._rtCx = pcx; this._rtCz = pcz;
      if (this._rtCursor === undefined || this._rtCursor >= this._rtList.length) {
        this._rtCursor = 0;
      }
    }
    this._rtRefresh--;

    const list = this._rtList;
    if (!list.length) return;
    const perTick = Math.min(WORLD_RANDOM_TICK_CHUNKS_PER_TICK, list.length);
    for (let i = 0; i < perTick; i++) {
      const c = list[this._rtCursor % list.length];
      this._rtCursor++;
      if (c && c.generated) this.randomTick(c);
    }
    if (this._rtCursor >= list.length) this._rtCursor = 0;
  }

  /** Fire WORLD_RANDOM_TICKS_PER_SECTION random positions per section. */
  randomTick(chunk) {
    const R = this._registry, F = this._flags;
    const ox = chunk.cx * CHUNK_W, oz = chunk.cz * CHUNK_W;
    for (let s = 0; s < SECTION_COUNT; s++) {
      if (chunk.isSectionEmpty(s)) continue;
      const y0 = s * SECTION_H;
      for (let n = 0; n < WORLD_RANDOM_TICKS_PER_SECTION; n++) {
        const lx = this.rand.int(CHUNK_W);
        const lz = this.rand.int(CHUNK_W);
        const y = y0 + this.rand.int(SECTION_H);
        const id = chunk.blocks[(lx * CHUNK_W + lz) * CHUNK_H + y];
        if (id === 0) continue;
        randomTickBlock(this, ox + lx, y, oz + lz, id, R, F);
      }
    }
  }

  _tickEntities() {
    const registry = this._registry;
    // Iterate over a snapshot so spawns during ticking don't disturb the loop.
    const list = this.entities;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e || e.removed) continue;
      if (e.type === 'player') continue;   // players are ticked by their controller

      // Freeze entities whose chunk isn't loaded (cull ticking).
      const cx = WORLD_floorDiv(Math.floor(e.pos.x), CHUNK_W);
      const cz = WORLD_floorDiv(Math.floor(e.pos.z), CHUNK_W);
      if (!this.hasChunk(cx, cz)) continue;

      // Target selection + AI decision before the physics tick.
      if (e.targetSelector) { try { e.targetSelector.tick(); } catch (err) { /* isolate */ } }
      if (e.ai) { try { e.ai.tick(); } catch (err) { /* isolate a bad mob */ } }

      // Physics / lifecycle (also saves prevPos for interpolation).
      try { e.tick(this, registry); } catch (err) { /* isolate */ }
    }
  }

  _despawnPass() {
    const list = this.entities;
    // Remove entities flagged removed. Swap-pop for O(n).
    let w = 0;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.removed) {
        this.entityById.delete(e.id);
        const pidx = this.players.indexOf(e);
        if (pidx !== -1) this.players.splice(pidx, 1);
        continue;
      }
      list[w++] = e;
    }
    list.length = w;
  }

  // =========================================================================
  // Time & environment
  // =========================================================================
  get dayTime01() { return this.timeOfDay / WORLD_DAY_LENGTH; }

  /** 0..1 smooth day/night light multiplier with dawn/dusk ramps. */
  get daylight() {
    if (!this.hasSky) return this.dimension === 'nether' ? 0.35 : 0.15;
    let dl = WORLD_daylightCurve(this.dayTime01);
    // Rain / thunder darkens the sky.
    if (this.weather && this.weather.skyDarken) dl *= (1 - this.weather.skyDarken * 0.6);
    return dl;
  }

  /**
   * Sun angle in radians, 0 at dawn (tick 0) and PI at dusk (tick 12000), so
   * the sky shader can place the sun disc directly from it.
   */
  get sunAngle() { return this.dayTime01 * Math.PI * 2; }

  /**
   * Night runs from dusk (tick ~12540) to dawn (~23460) in Minecraft terms.
   * With tick 0 = dawn that is t01 > 0.52 or t01 < 0.98 inverted, i.e. the
   * second half of the cycle. Hostile mobs use this for spawn gating.
   */
  get isNight() {
    const t = this.dayTime01;
    return t > 0.5225 && t < 0.9775;
  }

  get isDay() { return !this.isNight; }

  /**
   * Sky colours for the renderer, blended from the current biome, time of day,
   * weather and dimension. Returns { top:[r,g,b], horizon:[r,g,b], fog:[r,g,b] }.
   */
  skyColors() {
    if (this.dimension === 'nether') {
      return { top: [0.18, 0.03, 0.03], horizon: [0.24, 0.05, 0.04], fog: [0.24, 0.05, 0.04] };
    }
    if (this.dimension === 'end') {
      return { top: [0.03, 0.02, 0.05], horizon: [0.06, 0.04, 0.09], fog: [0.05, 0.03, 0.07] };
    }
    const biome = this.biomeAt(Math.floor(this.playerPos.x), Math.floor(this.playerPos.z));
    const dl = this.daylight;
    // Night colours (deep blue) lerped toward the biome's day colours.
    const nightTop = [0.02, 0.03, 0.08], nightHor = [0.05, 0.06, 0.12], nightFog = [0.04, 0.05, 0.10];
    const top = WORLD_lerp3(nightTop, biome.skyTop, dl);
    const horizon = WORLD_lerp3(nightHor, biome.skyHorizon, dl);
    let fog = WORLD_lerp3(nightFog, biome.fogColor, dl);
    // Dawn / dusk warm tint near the horizon.
    const t = this.dayTime01;
    const duskFactor = Math.max(0, 1 - Math.abs(t - 0.25) * 8) + Math.max(0, 1 - Math.abs(t - 0.75) * 8);
    if (duskFactor > 0) {
      const warm = [0.95, 0.55, 0.28];
      fog = WORLD_lerp3(fog, warm, Math.min(0.5, duskFactor * 0.5));
    }
    // Rain desaturates + darkens.
    if (this.weather && this.weather.skyDarken > 0) {
      const grey = [0.5 * dl, 0.52 * dl, 0.55 * dl];
      const k = this.weather.skyDarken;
      fog = WORLD_lerp3(fog, grey, k);
    }
    return { top, horizon, fog };
  }

  // =========================================================================
  // Portals
  // =========================================================================
  /**
   * Validate an obsidian frame around (x,y,z) and fill the interior with
   * nether_portal blocks. Tries both orientations (X and Z axis frames).
   * Returns true if a portal was lit.
   */
  lightPortal(x, y, z) {
    // Find the lowest interior air cell of a candidate frame containing (x,y,z).
    for (const axis of ['x', 'z']) {
      const res = this._findPortalInterior(x, y, z, axis);
      if (res) {
        const portalId = this._registry.idOr('nether_portal', 0);
        for (const [px, py, pz] of res.cells) {
          this.setBlock(px, py, pz, portalId, { noFluidSchedule: true });
          this.setMeta(px, py, pz, axis === 'x' ? 1 : 2);
        }
        this.playSound('fizz', x, y, z, { volume: 0.6 });
        return true;
      }
    }
    return false;
  }

  /**
   * Scan for a rectangular obsidian frame (interior >= 2 wide x 3 tall, corners
   * included) whose interior contains (x,y,z), oriented along the given axis.
   */
  _findPortalInterior(x, y, z, axis) {
    const obs = this._registry.idOr('obsidian', -1);
    const isObs = (bx, by, bz) => this.getBlock(bx, by, bz) === obs;
    const hx = axis === 'x' ? 1 : 0;   // horizontal step direction
    const hz = axis === 'z' ? 1 : 0;
    // Find the bottom of the interior column at (x,y,z): descend to floor.
    let by = y;
    while (by > 1 && !isObs(x, by - 1, z) && this._portalReplaceable(x, by - 1, z)) by--;
    if (!isObs(x, by - 1, z)) return null;   // no floor
    // Find the left edge along the axis.
    let lx = x, lz = z;
    while (!isObs(lx - hx, by, lz - hz) && this._portalReplaceable(lx - hx, by, lz - hz)) { lx -= hx; lz -= hz; }
    if (!isObs(lx - hx, by, lz - hz)) return null;   // no left wall
    // Measure interior width.
    let width = 0;
    while (this._portalReplaceable(lx + hx * width, by, lz + hz * width) && width < 23) width++;
    if (!isObs(lx + hx * width, by, lz + hz * width)) return null;   // no right wall
    if (width < 2 || width > 21) return null;
    // Measure interior height (all columns must be open then capped by obsidian).
    let height = 0;
    outer: while (height < 21) {
      for (let i = 0; i < width; i++) {
        if (!this._portalReplaceable(lx + hx * i, by + height, lz + hz * i)) break outer;
      }
      height++;
    }
    if (height < 3) return null;
    // Verify top row is obsidian, and both side columns.
    for (let i = 0; i < width; i++) {
      if (!isObs(lx + hx * i, by + height, lz + hz * i)) return null;
    }
    for (let h = 0; h < height; h++) {
      if (!isObs(lx - hx, by + h, lz - hz)) return null;
      if (!isObs(lx + hx * width, by + h, lz + hz * width)) return null;
    }
    // Collect the interior cells.
    const cells = [];
    for (let h = 0; h < height; h++) {
      for (let i = 0; i < width; i++) cells.push([lx + hx * i, by + h, lz + hz * i]);
    }
    return { cells, lx, by, lz, width, height };
  }

  _portalReplaceable(x, y, z) {
    const id = this.getBlock(x, y, z);
    if (id === 0) return true;
    const def = this._registry.def(id);
    return def && (def.name === 'nether_portal' || def.name === 'fire');
  }

  /**
   * Fill the 3x3 interior of a completed end-portal frame ring (12 frames) with
   * end_portal blocks. `x,y,z` is the centre of the 3x3 interior.
   */
  lightEndPortal(x, y, z) {
    const frameId = this._registry.idOr('end_portal_frame', -1);
    // Verify the 12 surrounding frame blocks.
    const ring = WORLD_endPortalRing(x, z);
    for (const [rx, rz] of ring) {
      if (this.getBlock(rx, y, rz) !== frameId) return false;
    }
    const portalId = this._registry.idOr('end_portal', 0);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        this.setBlock(x + dx, y, z + dz, portalId, { noFluidSchedule: true });
      }
    }
    return true;
  }

  /**
   * Advance a player's portal timer while standing in a portal, triggering a
   * dimension change after 80 ticks. Returns the target dimension name to travel
   * to, or null. The DimensionManager performs the actual move.
   */
  updatePortal(player) {
    const bx = Math.floor(player.pos.x), by = Math.floor(player.pos.y), bz = Math.floor(player.pos.z);
    const id = this.getBlock(bx, by, bz);
    const def = this._registry.def(id);
    const inNether = def && def.name === 'nether_portal';
    const inEnd = def && def.name === 'end_portal';
    if (inNether) {
      player.portalTicks = (player.portalTicks || 0) + 1;
      if (player.portalTicks >= 80 && !player._portalCooldown) {
        player.portalTicks = 0;
        player._portalCooldown = 120;
        return this.dimension === 'nether' ? 'overworld' : 'nether';
      }
    } else if (inEnd) {
      // End portals travel instantly.
      if (!player._portalCooldown) {
        player._portalCooldown = 120;
        return this.dimension === 'end' ? 'overworld' : 'end';
      }
    } else {
      player.portalTicks = Math.max(0, (player.portalTicks || 0) - 2);
    }
    if (player._portalCooldown > 0) player._portalCooldown--;
    return null;
  }

  // =========================================================================
  // Save / load
  // =========================================================================
  /**
   * Produce a compact plain-object snapshot: player state, modified chunk
   * deltas (only), time, dimension, weather, seed. Round-trips via importSave().
   */
  exportSave(player) {
    const chunks = [];
    for (const c of this.chunks.values()) {
      if (!c.modified) continue;
      const pristine = this._pristineBlocks(c.cx, c.cz);
      const delta = WORLD_encodeDelta(c, pristine);
      if (delta.changes.length || delta.blockEntities.length) chunks.push(delta);
    }
    const save = {
      version: 1,
      seed: this.seed,
      dimension: this.dimension,
      timeOfDay: this.timeOfDay,
      dayCount: this.dayCount,
      tickCount: this.tickCount,
      weather: this.weather ? {
        state: this.weather._state, ticksLeft: this.weather._ticksLeft,
      } : null,
      chunks,
    };
    if (player) save.player = WORLD_serializePlayer(player);
    return save;
  }

  /** Apply a snapshot produced by exportSave() into this (fresh) world. */
  importSave(obj, player) {
    if (!obj) return false;
    if (obj.timeOfDay != null) this.timeOfDay = obj.timeOfDay;
    if (obj.dayCount != null) this.dayCount = obj.dayCount;
    if (obj.tickCount != null) this.tickCount = obj.tickCount;
    if (obj.weather && this.weather) {
      this.weather._state = obj.weather.state;
      this.weather._ticksLeft = obj.weather.ticksLeft;
      this.weather._applySkyDarken();
    }
    // Apply chunk deltas: generate the pristine chunk then overwrite changes.
    for (const delta of (obj.chunks || [])) {
      const c = this.getOrCreateChunk(delta.cx, delta.cz);
      if (!c.generated) this._generateChunk(c);
      WORLD_applyDelta(c, delta, this._registry, this._flags, this);
      c.modified = true;
      c.dirty = true;
    }
    if (obj.player && player) WORLD_deserializePlayer(player, obj.player);
    return true;
  }

  saveToLocalStorage(key, player) {
    const save = this.exportSave(player);
    const json = JSON.stringify(save);
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem(key, json); } catch (e) { /* quota / private mode */ }
    }
    return json;
  }

  loadFromLocalStorage(key, player) {
    if (typeof localStorage === 'undefined') return false;
    let json;
    try { json = localStorage.getItem(key); } catch (e) { return false; }
    if (!json) return false;
    let obj;
    try { obj = JSON.parse(json); } catch (e) { return false; }
    return this.importSave(obj, player);
  }

  /** Freshly-generated block array for a chunk (for delta diffing). */
  _pristineBlocks(cx, cz) {
    const tmp = new Chunk(cx, cz);
    this.terrain.generateChunk(tmp);
    return tmp.blocks;
  }

  /** Stash a modified chunk's delta so it survives unload (in-memory cache). */
  _stashDelta(c) {
    if (!this._deltaCache) this._deltaCache = new Map();
    const pristine = this._pristineBlocks(c.cx, c.cz);
    this._deltaCache.set(chunkKeyStr(c.cx, c.cz), WORLD_encodeDelta(c, pristine));
  }
}

// ===========================================================================
// Module-level helpers (WORLD_ prefix).
// ===========================================================================
const WORLD_EMPTY_OPTS = {};
const WORLD_BULK_OPTS = { noUpdate: true };
const WORLD_FULL_UNIT_BOX = [{ x0: 0, y0: 0, z0: 0, x1: 1, y1: 1, z1: 1 }];
const WORLD_CROSS_BOX = [{ x0: 0.2, y0: 0, z0: 0.2, x1: 0.8, y1: 0.95, z1: 0.8 }];

function WORLD_hashDim(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 131 + name.charCodeAt(i)) >>> 0;
  return h;
}

/** Resolve a handful of frequently-used block ids up front (-1 if absent). */
function WORLD_resolveIds(registry) {
  const g = (n) => registry.idOr(n, -1);
  return {
    air: 0,
    water: g('water'), lava: g('lava'), fire: g('fire'),
    obsidian: g('obsidian'), nether_portal: g('nether_portal'),
    end_portal: g('end_portal'), end_portal_frame: g('end_portal_frame'),
    bedrock: g('bedrock'), torch: g('torch'), tnt: g('tnt'),
    ice: g('ice'), snow_layer: g('snow_layer'),
  };
}

function WORLD_lerp3(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Does tool kind `have` satisfy a block's required tool constant? */
function WORLD_toolMatches(required, have) {
  if (!required) return true;   // TOOL_NONE — any tool (incl. hand) works
  // Block tool constants: 1 pick, 2 axe, 3 shovel, 4 hoe, 5 shears, 6 sword.
  const map = { pick: 1, axe: 2, shovel: 3, hoe: 4, shears: 5, sword: 6 };
  return map[have] === required;
}

/** Ray vs AABB, returns { t, face } for the entry face, or null. */
function WORLD_rayBox(ox, oy, oz, dx, dy, dz, minX, minY, minZ, maxX, maxY, maxZ) {
  let tmin = 0, tmax = Infinity;
  let face = -1;
  // X slab.
  if (Math.abs(dx) < 1e-12) {
    if (ox < minX || ox > maxX) return null;
  } else {
    const inv = 1 / dx;
    let t1 = (minX - ox) * inv, t2 = (maxX - ox) * inv;
    let f1 = 1, f2 = 0;                 // entering -X face when moving +X
    if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; f1 = 0; f2 = 1; }
    if (t1 > tmin) { tmin = t1; face = f1; }
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  // Y slab.
  if (Math.abs(dy) < 1e-12) {
    if (oy < minY || oy > maxY) return null;
  } else {
    const inv = 1 / dy;
    let t1 = (minY - oy) * inv, t2 = (maxY - oy) * inv;
    let f1 = 3, f2 = 2;
    if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; f1 = 2; f2 = 3; }
    if (t1 > tmin) { tmin = t1; face = f1; }
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  // Z slab.
  if (Math.abs(dz) < 1e-12) {
    if (oz < minZ || oz > maxZ) return null;
  } else {
    const inv = 1 / dz;
    let t1 = (minZ - oz) * inv, t2 = (maxZ - oz) * inv;
    let f1 = 5, f2 = 4;
    if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; f1 = 4; f2 = 5; }
    if (t1 > tmin) { tmin = t1; face = f1; }
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  if (tmin < 0) return null;
  return { t: tmin, face };
}

/** Nearest-first spiral of chunk offsets out to radius (inclusive). */
function WORLD_buildSpiral(radius) {
  const out = [];
  for (let dz = -radius; dz <= radius; dz++) {
    for (let dx = -radius; dx <= radius; dx++) out.push([dx, dz]);
  }
  out.sort((a, b) => (a[0] * a[0] + a[1] * a[1]) - (b[0] * b[0] + b[1] * b[1]));
  return out;
}

/** The 12 end-portal-frame ring positions around a 3x3 interior at centre x,z. */
function WORLD_endPortalRing(x, z) {
  const ring = [];
  for (let i = -1; i <= 1; i++) {
    ring.push([x + i, z - 2]);
    ring.push([x + i, z + 2]);
    ring.push([x - 2, z + i]);
    ring.push([x + 2, z + i]);
  }
  return ring;
}

/** Encode a chunk delta as compact int arrays: changes = [idx,id, idx,id, ...]. */
function WORLD_encodeDelta(chunk, pristine) {
  const changes = [];
  const b = chunk.blocks, m = chunk.meta;
  const metaChanges = [];
  for (let i = 0; i < CHUNK_VOL; i++) {
    if (b[i] !== pristine[i]) { changes.push(i, b[i]); }
    if (m[i] !== 0) { metaChanges.push(i, m[i]); }
  }
  const blockEntities = [];
  for (const [i, be] of chunk.blockEntities) {
    blockEntities.push([i, be.serialize ? be.serialize() : (be.data || null)]);
  }
  return { cx: chunk.cx, cz: chunk.cz, changes, meta: metaChanges, blockEntities };
}

/** Apply an encoded delta onto a (generated) chunk, rebuilding derived data. */
function WORLD_applyDelta(chunk, delta, registry, flags, world) {
  const c = delta.changes || [];
  for (let i = 0; i < c.length; i += 2) chunk.blocks[c[i]] = c[i + 1];
  const m = delta.meta || [];
  for (let i = 0; i < m.length; i += 2) chunk.meta[m[i]] = m[i + 1];
  chunk.rebuildSectionCounts();
  chunk.rebuildHeightMap(flags);
  // Restore block entities.
  chunk.blockEntities.clear();
  for (const [i, data] of (delta.blockEntities || [])) {
    const be = deserializeBlockEntity(data);
    if (be) {
      chunk.blockEntities.set(i, be);
      if (world) world._blockEntities.add(be);
    }
  }
  chunk.dirty = true;
  chunk.dirtySections.clear();
}

function WORLD_serializePlayer(player) {
  const p = {
    pos: { x: player.pos.x, y: player.pos.y, z: player.pos.z },
    yaw: player.yaw || 0, pitch: player.pitch || 0,
    health: player.health != null ? player.health : 20,
    hunger: player.hunger != null ? player.hunger : 20,
    saturation: player.saturation != null ? player.saturation : 5,
    xp: player.xp != null ? player.xp : 0,
    xpLevel: player.xpLevel != null ? player.xpLevel : 0,
    mode: player.mode || player.gameMode || 'survival',
    dimension: player.dimension || 'overworld',
  };
  if (player.inventory && player.inventory.serialize) p.inventory = player.inventory.serialize();
  else if (player.inventory) p.inventory = player.inventory;
  return p;
}

function WORLD_deserializePlayer(player, data) {
  if (data.pos) { player.pos.x = data.pos.x; player.pos.y = data.pos.y; player.pos.z = data.pos.z; }
  if (player.prevPos && data.pos) { player.prevPos.x = data.pos.x; player.prevPos.y = data.pos.y; player.prevPos.z = data.pos.z; }
  player.yaw = data.yaw || 0;
  player.pitch = data.pitch || 0;
  player.health = data.health != null ? data.health : 20;
  player.hunger = data.hunger != null ? data.hunger : 20;
  player.saturation = data.saturation != null ? data.saturation : 5;
  player.xp = data.xp || 0;
  player.xpLevel = data.xpLevel || 0;
  player.mode = data.mode || 'survival';
  player.dimension = data.dimension || 'overworld';
  if (data.inventory && player.inventory && player.inventory.applySave) player.inventory.applySave(data.inventory);
}

// ===========================================================================
// DimensionManager — holds one World per dimension and links portals.
// ===========================================================================
export class DimensionManager {
  /**
   * @param {object} seedOpts { seed, registry, flags, atlas, settings }
   */
  constructor(seedOpts = {}) {
    this._opts = seedOpts;
    this.worlds = new Map();
    // Create the overworld eagerly; other dimensions are lazy.
    this.get('overworld');
  }

  get(name) {
    let w = this.worlds.get(name);
    if (!w) {
      w = new World({
        seed: this._opts.seed,
        registry: this._opts.registry,
        flags: this._opts.flags,
        atlas: this._opts.atlas,
        settings: this._opts.settings,
        dimension: name,
      });
      this.worlds.set(name, w);
    }
    return w;
  }

  /**
   * Move `player` from `fromDim` to `toDim` near `pos`. Finds or builds a
   * matching portal on arrival and places the player safely on solid ground.
   * Returns the destination World.
   */
  travel(player, fromDim, toDim, pos) {
    const src = this.get(fromDim);
    const dst = this.get(toDim);

    // Nether coordinate scaling: overworld <-> nether is 8:1.
    let tx = pos.x, tz = pos.z;
    if (fromDim === 'overworld' && toDim === 'nether') { tx = Math.floor(pos.x / 8); tz = Math.floor(pos.z / 8); }
    else if (fromDim === 'nether' && toDim === 'overworld') { tx = Math.floor(pos.x * 8); tz = Math.floor(pos.z * 8); }

    // Ensure the destination chunk region exists.
    const cx = WORLD_floorDiv(Math.floor(tx), CHUNK_W);
    const cz = WORLD_floorDiv(Math.floor(tz), CHUNK_W);
    dst.ensureChunkReady(cx, cz);

    // Find an existing portal nearby, else build one.
    let dest = this._findExistingPortal(dst, tx, tz);
    if (!dest) dest = this._buildPortal(dst, tx, tz, toDim);

    // Place the player safely just inside the portal (on the floor).
    player.pos.x = dest.x + 0.5;
    player.pos.y = dest.y;
    player.pos.z = dest.z + 0.5;
    if (player.prevPos) { player.prevPos.x = player.pos.x; player.prevPos.y = player.pos.y; player.prevPos.z = player.pos.z; }
    player.vel.x = player.vel.y = player.vel.z = 0;
    player.dimension = toDim;
    player.portalTicks = 0;
    player._portalCooldown = 120;

    // Move the player entity between world entity lists.
    src.removeEntity(player);
    dst.addEntity(player);
    dst.players.indexOf(player) === -1 && dst.players.push(player);

    return dst;
  }

  _findExistingPortal(world, tx, tz) {
    const portalId = world._registry.idOr('nether_portal', -1);
    const cx = WORLD_floorDiv(Math.floor(tx), CHUNK_W);
    const cz = WORLD_floorDiv(Math.floor(tz), CHUNK_W);
    // Search a small radius of columns for an existing portal block.
    for (let dx = -8; dx <= 8; dx++) {
      for (let dz = -8; dz <= 8; dz++) {
        const x = Math.floor(tx) + dx, z = Math.floor(tz) + dz;
        for (let y = 8; y < CHUNK_H - 2; y++) {
          if (world.getBlock(x, y, z) === portalId) {
            // stand at the base of the portal
            let by = y;
            while (by > 1 && world.getBlock(x, by - 1, z) === portalId) by--;
            return { x, y: by, z };
          }
        }
      }
    }
    return null;
  }

  _buildPortal(world, tx, tz, dim) {
    const R = world._registry;
    const obs = R.idOr('obsidian', 0);
    const portal = R.idOr('nether_portal', 0);
    const x = Math.floor(tx), z = Math.floor(tz);
    // Find a floor height.
    let y = world.heightAt(x, z);
    if (y < 2) y = 64;
    // Build a 4x5 obsidian frame (interior 2 wide, 3 tall) along the X axis.
    // Frame footprint: columns x..x+3 at base y-1 .. y+4.
    // Base + top.
    for (let i = -1; i <= 2; i++) {
      world.setBlock(x + i, y - 1, z, obs, { noFluidSchedule: true });
      world.setBlock(x + i, y + 3, z, obs, { noFluidSchedule: true });
    }
    // Sides.
    for (let h = 0; h <= 2; h++) {
      world.setBlock(x - 1, y + h, z, obs, { noFluidSchedule: true });
      world.setBlock(x + 2, y + h, z, obs, { noFluidSchedule: true });
    }
    // Interior (2 wide x 3 tall) -> portal blocks.
    for (let i = 0; i <= 1; i++) {
      for (let h = 0; h <= 2; h++) {
        world.setBlock(x + i, y + h, z, portal, { noFluidSchedule: true });
        world.setMeta(x + i, y + h, z, 1);
      }
    }
    // Solid platform beneath so the player doesn't fall.
    for (let i = -1; i <= 2; i++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (world.getBlock(x + i, y - 2, z + dz) === 0) world.setBlock(x + i, y - 2, z + dz, obs, { noFluidSchedule: true });
      }
    }
    return { x, y, z };
  }
}
