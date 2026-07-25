// ---------------------------------------------------------------------------
// Chunk storage.
//
// 16 x 128 x 16 columns. Blocks in a Uint16Array, per-block metadata nibble in a
// Uint8Array, and two light channels packed one byte per block (sky in the high
// nibble, block in the low nibble) so a single fetch gives the mesher both.
//
// Index order is Y-major-last: idx = (x*16 + z)*128 + y. That makes vertical
// scans (heightmap, skylight, fluid settle) contiguous, which is where the hot
// loops actually spend their time.
// ---------------------------------------------------------------------------

export const CHUNK_W = 16;
export const CHUNK_H = 128;
export const CHUNK_AREA = CHUNK_W * CHUNK_W;
export const CHUNK_VOL = CHUNK_AREA * CHUNK_H;
/** Section = 16 tall slice, used for empty-section skipping in the mesher. */
export const SECTION_H = 16;
export const SECTION_COUNT = CHUNK_H / SECTION_H;

export function chunkIndex(x, y, z) { return (x * CHUNK_W + z) * CHUNK_H + y; }
export function chunkKey(cx, cz) { return cx * 100000 + cz; }
/** Stable string key that survives negative coords, for save files. */
export function chunkKeyStr(cx, cz) { return cx + ',' + cz; }

export class Chunk {
  constructor(cx, cz) {
    this.cx = cx;
    this.cz = cz;
    this.key = chunkKey(cx, cz);
    this.blocks = new Uint16Array(CHUNK_VOL);
    this.meta = new Uint8Array(CHUNK_VOL);
    this.light = new Uint8Array(CHUNK_VOL);      // sky<<4 | block
    this.heightMap = new Uint8Array(CHUNK_AREA); // highest non-air +1
    this.biome = new Uint8Array(CHUNK_AREA);     // biome id per column
    /** Per-section non-air counter, so the mesher can skip whole sections. */
    this.sectionCount = new Uint16Array(SECTION_COUNT);

    this.generated = false;
    this.populated = false;      // trees/ores/structures placed
    this.lit = false;            // initial light flood done
    this.dirty = false;          // needs remesh
    this.dirtyLight = false;
    this.modified = false;       // differs from generation => must be saved
    /** Set of section indices needing remesh; empty means all. */
    this.dirtySections = new Set();
    /** Block entities keyed by local index: chests, furnaces, spawners, signs. */
    this.blockEntities = new Map();
    /** Meshes currently in the scene, by pass name. */
    this.meshes = null;
    this.lastUsed = 0;
    this.neighborsReady = false;
  }

  get(x, y, z) {
    if (y < 0 || y >= CHUNK_H) return 0;
    return this.blocks[(x * CHUNK_W + z) * CHUNK_H + y];
  }

  set(x, y, z, id) {
    if (y < 0 || y >= CHUNK_H) return;
    const i = (x * CHUNK_W + z) * CHUNK_H + y;
    const old = this.blocks[i];
    if (old === id) return;
    this.blocks[i] = id;
    const s = y >> 4;
    if (old === 0 && id !== 0) this.sectionCount[s]++;
    else if (old !== 0 && id === 0) this.sectionCount[s]--;
  }

  /** Raw set during generation: skips section bookkeeping for speed. */
  setFast(i, id) { this.blocks[i] = id; }

  getMeta(x, y, z) { return this.meta[(x * CHUNK_W + z) * CHUNK_H + y]; }
  setMeta(x, y, z, v) { this.meta[(x * CHUNK_W + z) * CHUNK_H + y] = v & 0xff; }

  getSkyLight(x, y, z) {
    if (y < 0) return 0;
    if (y >= CHUNK_H) return 15;
    return this.light[(x * CHUNK_W + z) * CHUNK_H + y] >> 4;
  }
  getBlockLight(x, y, z) {
    if (y < 0 || y >= CHUNK_H) return 0;
    return this.light[(x * CHUNK_W + z) * CHUNK_H + y] & 15;
  }
  setSkyLight(x, y, z, v) {
    const i = (x * CHUNK_W + z) * CHUNK_H + y;
    this.light[i] = (this.light[i] & 15) | ((v & 15) << 4);
  }
  setBlockLight(x, y, z, v) {
    const i = (x * CHUNK_W + z) * CHUNK_H + y;
    this.light[i] = (this.light[i] & 0xf0) | (v & 15);
  }

  biomeAt(x, z) { return this.biome[x * CHUNK_W + z]; }
  setBiome(x, z, id) { this.biome[x * CHUNK_W + z] = id; }

  /** Recompute the heightmap column for (x,z). */
  updateHeight(x, z, flags) {
    const base = (x * CHUNK_W + z) * CHUNK_H;
    let h = 0;
    for (let y = CHUNK_H - 1; y >= 0; y--) {
      const id = this.blocks[base + y];
      if (id !== 0 && flags.opacity[id] > 0) { h = y + 1; break; }
    }
    this.heightMap[x * CHUNK_W + z] = h;
    return h;
  }

  rebuildHeightMap(flags) {
    for (let x = 0; x < CHUNK_W; x++) {
      for (let z = 0; z < CHUNK_W; z++) this.updateHeight(x, z, flags);
    }
  }

  rebuildSectionCounts() {
    this.sectionCount.fill(0);
    for (let x = 0; x < CHUNK_W; x++) {
      for (let z = 0; z < CHUNK_W; z++) {
        const base = (x * CHUNK_W + z) * CHUNK_H;
        for (let y = 0; y < CHUNK_H; y++) {
          if (this.blocks[base + y] !== 0) this.sectionCount[y >> 4]++;
        }
      }
    }
  }

  markDirty(y) {
    this.dirty = true;
    if (y === undefined) { this.dirtySections.clear(); return; }
    const s = Math.max(0, Math.min(SECTION_COUNT - 1, y >> 4));
    this.dirtySections.add(s);
    if (((y & 15) === 0) && s > 0) this.dirtySections.add(s - 1);
    if (((y & 15) === 15) && s < SECTION_COUNT - 1) this.dirtySections.add(s + 1);
  }

  isSectionEmpty(s) { return this.sectionCount[s] === 0; }

  getBlockEntity(x, y, z) { return this.blockEntities.get((x * CHUNK_W + z) * CHUNK_H + y); }
  setBlockEntity(x, y, z, be) {
    const i = (x * CHUNK_W + z) * CHUNK_H + y;
    if (be === null) this.blockEntities.delete(i);
    else this.blockEntities.set(i, be);
    this.modified = true;
  }

  /** Delta serialisation: only blocks that differ from a freshly generated copy. */
  serializeDelta(pristine) {
    const changes = [];
    const b = this.blocks, p = pristine;
    for (let i = 0; i < CHUNK_VOL; i++) {
      if (b[i] !== p[i]) changes.push(i, b[i]);
    }
    const bes = [];
    for (const [i, be] of this.blockEntities) {
      bes.push([i, be.kind, be.serialize ? be.serialize() : be.data || null]);
    }
    return { cx: this.cx, cz: this.cz, changes, blockEntities: bes };
  }

  applyDelta(delta, flags) {
    const c = delta.changes;
    for (let i = 0; i < c.length; i += 2) this.blocks[c[i]] = c[i + 1];
    this.rebuildSectionCounts();
    this.rebuildHeightMap(flags);
    this.modified = true;
    this.dirty = true;
    this.dirtySections.clear();
  }
}
