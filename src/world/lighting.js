// ---------------------------------------------------------------------------
// Flood-fill lighting.
//
// Two channels: skylight (propagates straight down at full strength, sideways
// with attenuation) and blocklight (torches, lava, glowstone). Both use the
// classic BFS increase/decrease queues so a single block change costs a local
// re-flood rather than a whole-chunk recompute.
//
// Queue entries are packed into a single Int32 where possible:
//   world x,z are stored as absolute values, so cross-chunk propagation is free.
// ---------------------------------------------------------------------------

import { CHUNK_W, CHUNK_H } from './chunk.js';
import { DIRS } from '../core/util.js';

export const MAX_LIGHT = 15;

/** Simple ring-buffer queue of {x,y,z,v} packed into 4 parallel arrays. */
class LightQueue {
  constructor(cap = 8192) {
    this.x = new Int32Array(cap);
    this.y = new Int32Array(cap);
    this.z = new Int32Array(cap);
    this.v = new Int32Array(cap);
    this.head = 0;
    this.tail = 0;
    this.cap = cap;
  }
  get size() { return this.tail - this.head; }
  clear() { this.head = 0; this.tail = 0; }
  push(x, y, z, v) {
    if (this.tail === this.cap) {
      if (this.head > this.cap * 0.5) {
        // compact
        const n = this.tail - this.head;
        this.x.copyWithin(0, this.head, this.tail);
        this.y.copyWithin(0, this.head, this.tail);
        this.z.copyWithin(0, this.head, this.tail);
        this.v.copyWithin(0, this.head, this.tail);
        this.head = 0; this.tail = n;
      } else {
        this._grow();
      }
    }
    const i = this.tail++;
    this.x[i] = x; this.y[i] = y; this.z[i] = z; this.v[i] = v;
  }
  pop() {
    const i = this.head++;
    return { x: this.x[i], y: this.y[i], z: this.z[i], v: this.v[i] };
  }
  _grow() {
    const cap = this.cap * 2;
    const nx = new Int32Array(cap), ny = new Int32Array(cap), nz = new Int32Array(cap), nv = new Int32Array(cap);
    nx.set(this.x); ny.set(this.y); nz.set(this.z); nv.set(this.v);
    this.x = nx; this.y = ny; this.z = nz; this.v = nv;
    this.cap = cap;
  }
}

export class LightEngine {
  constructor(world, flags) {
    this.world = world;
    this.flags = flags;
    this.addQueue = new LightQueue();
    this.remQueue = new LightQueue();
    this.skyAddQueue = new LightQueue();
    this.skyRemQueue = new LightQueue();
    this.touched = new Set();   // chunk keys needing remesh
    this.budget = 40000;        // max node visits per flush
  }

  _markChunk(x, z, y) {
    const cx = Math.floor(x / CHUNK_W), cz = Math.floor(z / CHUNK_W);
    const c = this.world.getChunk(cx, cz);
    if (c) { c.markDirty(y); this.touched.add(c); }
    // A change on a chunk border must remesh the neighbour too.
    const lx = x - cx * CHUNK_W, lz = z - cz * CHUNK_W;
    if (lx === 0) { const n = this.world.getChunk(cx - 1, cz); if (n) { n.markDirty(y); this.touched.add(n); } }
    if (lx === CHUNK_W - 1) { const n = this.world.getChunk(cx + 1, cz); if (n) { n.markDirty(y); this.touched.add(n); } }
    if (lz === 0) { const n = this.world.getChunk(cx, cz - 1); if (n) { n.markDirty(y); this.touched.add(n); } }
    if (lz === CHUNK_W - 1) { const n = this.world.getChunk(cx, cz + 1); if (n) { n.markDirty(y); this.touched.add(n); } }
  }

  // ---------------------------------------------------------------- blocklight

  /** Called when a light-emitting block is placed. */
  addBlockLight(x, y, z, level) {
    if (level <= 0) return;
    const cur = this.world.getBlockLight(x, y, z);
    if (cur >= level) return;
    this.world.setBlockLight(x, y, z, level);
    this.addQueue.push(x, y, z, level);
    this._markChunk(x, z, y);
  }

  /** Called when a light source or an opaque block is removed/added. */
  removeBlockLight(x, y, z) {
    const cur = this.world.getBlockLight(x, y, z);
    if (cur === 0) return;
    this.world.setBlockLight(x, y, z, 0);
    this.remQueue.push(x, y, z, cur);
    this._markChunk(x, z, y);
  }

  propagateBlockLight() {
    const F = this.flags;
    let visits = 0;
    // Removal first, so re-added light fills the vacuum correctly.
    while (this.remQueue.size > 0 && visits < this.budget) {
      const n = this.remQueue.pop();
      visits++;
      for (const d of DIRS) {
        const x = n.x + d[0], y = n.y + d[1], z = n.z + d[2];
        if (y < 0 || y >= CHUNK_H) continue;
        const l = this.world.getBlockLight(x, y, z);
        if (l === 0) continue;
        if (l < n.v) {
          this.world.setBlockLight(x, y, z, 0);
          this.remQueue.push(x, y, z, l);
          this._markChunk(x, z, y);
        } else if (l >= n.v) {
          // This neighbour is fed by another source; re-propagate from it.
          this.addQueue.push(x, y, z, l);
        }
      }
    }
    while (this.addQueue.size > 0 && visits < this.budget) {
      const n = this.addQueue.pop();
      visits++;
      const level = this.world.getBlockLight(n.x, n.y, n.z);
      if (level !== n.v || level <= 1) continue;
      for (const d of DIRS) {
        const x = n.x + d[0], y = n.y + d[1], z = n.z + d[2];
        if (y < 0 || y >= CHUNK_H) continue;
        const id = this.world.getBlock(x, y, z);
        const opacity = F.opacity[id];
        if (opacity >= 15) continue;
        const next = level - Math.max(1, opacity);
        if (next <= 0) continue;
        if (this.world.getBlockLight(x, y, z) < next) {
          this.world.setBlockLight(x, y, z, next);
          this.addQueue.push(x, y, z, next);
          this._markChunk(x, z, y);
        }
      }
    }
    return visits;
  }

  // ---------------------------------------------------------------- skylight

  /**
   * Initial skylight for a freshly generated chunk: cast straight down from the
   * top of the world, then flood sideways from every lit column.
   */
  initSkyLight(chunk) {
    const F = this.flags;
    const q = this.skyAddQueue;
    for (let x = 0; x < CHUNK_W; x++) {
      for (let z = 0; z < CHUNK_W; z++) {
        const base = (x * CHUNK_W + z) * CHUNK_H;
        let light = MAX_LIGHT;
        for (let y = CHUNK_H - 1; y >= 0; y--) {
          const id = chunk.blocks[base + y];
          const op = F.opacity[id];
          if (op > 0) {
            light = Math.max(0, light - Math.max(1, op));
            if (op >= 15) light = 0;
          }
          chunk.light[base + y] = (chunk.light[base + y] & 15) | (light << 4);
          if (light > 0 && light < MAX_LIGHT) {
            q.push(chunk.cx * CHUNK_W + x, y, chunk.cz * CHUNK_W + z, light);
          } else if (light === MAX_LIGHT) {
            // Full-strength column: only the boundary needs to seed the flood.
            const below = y > 0 ? F.opacity[chunk.blocks[base + y - 1]] : 15;
            if (below > 0) q.push(chunk.cx * CHUNK_W + x, y, chunk.cz * CHUNK_W + z, light);
          }
        }
      }
    }
    chunk.lit = true;
  }

  /** Seed the sky flood along a chunk border so neighbours blend. */
  seedSkyBorders(chunk) {
    const F = this.flags;
    const q = this.skyAddQueue;
    const wx0 = chunk.cx * CHUNK_W, wz0 = chunk.cz * CHUNK_W;
    for (let i = 0; i < CHUNK_W; i++) {
      for (const [x, z] of [[0, i], [CHUNK_W - 1, i], [i, 0], [i, CHUNK_W - 1]]) {
        const base = (x * CHUNK_W + z) * CHUNK_H;
        for (let y = 0; y < CHUNK_H; y++) {
          const sky = chunk.light[base + y] >> 4;
          if (sky > 1 && F.opacity[chunk.blocks[base + y]] < 15) {
            q.push(wx0 + x, y, wz0 + z, sky);
          }
        }
      }
    }
  }

  addSkyLight(x, y, z, level) {
    if (level <= 0) return;
    if (this.world.getSkyLight(x, y, z) >= level) return;
    this.world.setSkyLight(x, y, z, level);
    this.skyAddQueue.push(x, y, z, level);
    this._markChunk(x, z, y);
  }

  removeSkyLight(x, y, z) {
    const cur = this.world.getSkyLight(x, y, z);
    if (cur === 0) return;
    this.world.setSkyLight(x, y, z, 0);
    this.skyRemQueue.push(x, y, z, cur);
    this._markChunk(x, z, y);
  }

  propagateSkyLight() {
    const F = this.flags;
    let visits = 0;
    while (this.skyRemQueue.size > 0 && visits < this.budget) {
      const n = this.skyRemQueue.pop();
      visits++;
      for (const d of DIRS) {
        const x = n.x + d[0], y = n.y + d[1], z = n.z + d[2];
        if (y < 0 || y >= CHUNK_H) continue;
        const l = this.world.getSkyLight(x, y, z);
        if (l === 0) continue;
        // Straight down keeps full strength, so removal must follow it fully.
        const downFull = d[1] === -1 && n.v === MAX_LIGHT;
        if (l < n.v || downFull) {
          this.world.setSkyLight(x, y, z, 0);
          this.skyRemQueue.push(x, y, z, l);
          this._markChunk(x, z, y);
        } else {
          this.skyAddQueue.push(x, y, z, l);
        }
      }
    }
    while (this.skyAddQueue.size > 0 && visits < this.budget) {
      const n = this.skyAddQueue.pop();
      visits++;
      const level = this.world.getSkyLight(n.x, n.y, n.z);
      if (level !== n.v || level <= 0) continue;
      for (const d of DIRS) {
        const x = n.x + d[0], y = n.y + d[1], z = n.z + d[2];
        if (y < 0 || y >= CHUNK_H) continue;
        const id = this.world.getBlock(x, y, z);
        const op = F.opacity[id];
        if (op >= 15) continue;
        // Downward propagation of full skylight does not attenuate.
        const cost = (d[1] === -1 && level === MAX_LIGHT && op === 0) ? 0 : Math.max(1, op);
        const next = level - cost;
        if (next <= 0) continue;
        if (this.world.getSkyLight(x, y, z) < next) {
          this.world.setSkyLight(x, y, z, next);
          this.skyAddQueue.push(x, y, z, next);
          this._markChunk(x, z, y);
        }
      }
    }
    return visits;
  }

  /**
   * Handle one block change: fix both channels incrementally.
   * @param oldId previous block, newId new block
   */
  onBlockChanged(x, y, z, oldId, newId) {
    const F = this.flags;
    const oldEmit = F.emissive[oldId], newEmit = F.emissive[newId];
    const oldOp = F.opacity[oldId], newOp = F.opacity[newId];

    // ---- blocklight
    if (oldEmit > 0) this.removeBlockLight(x, y, z);
    if (newOp > oldOp) {
      // Became more opaque: light that flowed through must be pulled back.
      const cur = this.world.getBlockLight(x, y, z);
      if (cur > 0) this.removeBlockLight(x, y, z);
    }
    if (newEmit > 0) this.addBlockLight(x, y, z, newEmit);
    if (newOp < oldOp) {
      // Became more transparent: neighbours may now feed this cell.
      for (const d of DIRS) {
        const nx = x + d[0], ny = y + d[1], nz = z + d[2];
        if (ny < 0 || ny >= CHUNK_H) continue;
        const l = this.world.getBlockLight(nx, ny, nz);
        if (l > 1) this.addQueue.push(nx, ny, nz, l);
      }
    }

    // ---- skylight
    if (newOp > oldOp) {
      this.removeSkyLight(x, y, z);
      // Everything directly below loses its full-strength column.
      for (let yy = y - 1; yy >= 0; yy--) {
        if (this.world.getSkyLight(x, yy, z) === 0) break;
        this.removeSkyLight(x, yy, z);
        if (F.opacity[this.world.getBlock(x, yy, z)] >= 15) break;
      }
    } else if (newOp < oldOp) {
      for (const d of DIRS) {
        const nx = x + d[0], ny = y + d[1], nz = z + d[2];
        if (ny < 0 || ny >= CHUNK_H) continue;
        const l = this.world.getSkyLight(nx, ny, nz);
        if (l > 0) this.skyAddQueue.push(nx, ny, nz, l);
      }
      // If open to the sky above, restore the full column.
      let open = true;
      for (let yy = y + 1; yy < CHUNK_H; yy++) {
        if (F.opacity[this.world.getBlock(x, yy, z)] > 0) { open = false; break; }
      }
      if (open) this.addSkyLight(x, y, z, MAX_LIGHT);
    }
    this._markChunk(x, z, y);
  }

  /** Run both channels; call once per tick. Returns node visits used. */
  flush() {
    let v = this.propagateBlockLight();
    v += this.propagateSkyLight();
    return v;
  }

  get pending() {
    return this.addQueue.size + this.remQueue.size + this.skyAddQueue.size + this.skyRemQueue.size;
  }

  takeTouched() {
    const t = this.touched;
    this.touched = new Set();
    return t;
  }
}
