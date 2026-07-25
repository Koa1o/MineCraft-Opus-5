// ---------------------------------------------------------------------------
// Fluid simulation + gravity blocks + TNT explosions.
//
// Fluids use the classic level model: meta 0 = source, 1..7 = falling levels,
// 8 = falling-from-above. Updates are queued and processed on a budget so a
// large ocean breach never stalls a tick.
// ---------------------------------------------------------------------------

import { CHUNK_H } from './chunk.js';
import { HDIRS } from '../core/util.js';

export const FLUID_WATER = 1, FLUID_LAVA = 2;
const FLUID_MAX_LEVEL = 7;

export class FluidSystem {
  constructor(world, flags, registry) {
    this.world = world;
    this.flags = flags;
    this.registry = registry;
    this.queue = [];              // pending {x,y,z} fluid updates
    this.queued = new Set();
    this.gravityQueue = [];
    this.gravityQueued = new Set();
    this.waterId = registry.id('water');
    this.lavaId = registry.id('lava');
    this.airId = 0;
    this.tickCounter = 0;
    // Livelock detection bookkeeping (see _settled).
    this._lastSig = new Map();
    this._staleCount = new Map();
    this.waterSpeed = 5;          // ticks between water spreads
    this.lavaSpeed = 20;          // lava is slower
    this.budget = 900;
  }

  _key(x, y, z) { return (x * 4096 + y) * 4096 + z; }

  schedule(x, y, z) {
    if (y < 0 || y >= CHUNK_H) return;
    const k = this._key(x, y, z);
    if (this.queued.has(k)) return;
    this.queued.add(k);
    this.queue.push(x, y, z);
  }

  scheduleNeighbors(x, y, z) {
    this.schedule(x, y, z);
    this.schedule(x + 1, y, z); this.schedule(x - 1, y, z);
    this.schedule(x, y + 1, z); this.schedule(x, y - 1, z);
    this.schedule(x, y, z + 1); this.schedule(x, y, z - 1);
  }

  scheduleGravity(x, y, z) {
    const k = this._key(x, y, z);
    if (this.gravityQueued.has(k)) return;
    this.gravityQueued.add(k);
    this.gravityQueue.push(x, y, z);
  }

  /** Called by World.setBlock for every change. */
  onBlockChanged(x, y, z, oldId, newId) {
    this.scheduleNeighbors(x, y, z);
    // Anything sitting on top of a removed block may now fall.
    for (let dy = 1; dy <= 3; dy++) {
      const above = this.world.getBlock(x, y + dy, z);
      if (this.flags.gravity[above]) this.scheduleGravity(x, y + dy, z);
      else break;
    }
  }

  tick() {
    this.tickCounter++;
    this._tickGravity();
    if (this.queue.length === 0) return;
    const doWater = this.tickCounter % this.waterSpeed === 0;
    const doLava = this.tickCounter % this.lavaSpeed === 0;
    if (!doWater && !doLava) return;

    const pending = this.queue;
    this.queue = [];
    this.queued.clear();
    let processed = 0;
    const deferred = [];
    for (let i = 0; i < pending.length; i += 3) {
      const x = pending[i], y = pending[i + 1], z = pending[i + 2];
      if (processed >= this.budget) { deferred.push(x, y, z); continue; }
      const id = this.world.getBlock(x, y, z);
      const f = this.flags.fluid[id];
      // A non-fluid cell can still need an update if a fluid neighbour should
      // flow into it.
      if (f === FLUID_WATER && !doWater) { deferred.push(x, y, z); continue; }
      if (f === FLUID_LAVA && !doLava) { deferred.push(x, y, z); continue; }
      processed++;
      // Drop cells that have provably reached a fixed point.
      if (this._settled(x, y, z, id, this.world.getMeta(x, y, z) & 15)) continue;
      if (f !== 0) this._updateFluid(x, y, z, id, f);
      else this._maybeFlowInto(x, y, z, doWater, doLava);
    }
    for (let i = 0; i < deferred.length; i += 3) this.schedule(deferred[i], deferred[i + 1], deferred[i + 2]);
  }

  /**
   * Safety net: a cell that keeps getting rescheduled without ever changing is
   * a livelock (historically caused by decoration placing floating water). After
   * a cell has been visited many times with no state change we stop requeueing
   * it, so one bad block can never stall the tick loop forever.
   */
  _settled(x, y, z, id, level) {
    const k = this._key(x, y, z);
    const sig = id * 16 + (level & 15);
    const prev = this._lastSig.get(k);
    if (prev === sig) {
      const n = (this._staleCount.get(k) || 0) + 1;
      // Keep the counter pinned once it trips, otherwise a neighbour requeueing
      // this cell would reset the state and re-arm the livelock forever.
      if (n >= 12) { this._staleCount.set(k, 12); return true; }
      this._staleCount.set(k, n);
    } else {
      this._lastSig.set(k, sig);
      this._staleCount.delete(k);
      // Keep the bookkeeping maps from growing without bound.
      if (this._lastSig.size > 20000) { this._lastSig.clear(); this._staleCount.clear(); }
    }
    return false;
  }

  _isReplaceable(id) {
    return id === 0 || this.flags.replaceable[id] === 1;
  }

  /** Can fluid of kind f displace block id? */
  _canFlowInto(id, f) {
    if (id === 0) return true;
    if (this.flags.fluid[id] === f) return false;      // same fluid handled by level logic
    if (this.flags.fluid[id] !== 0) return true;       // water into lava etc
    return this.flags.replaceable[id] === 1 && this.flags.solid[id] === 0;
  }

  _updateFluid(x, y, z, id, f) {
    const W = this.world;
    const level = W.getMeta(x, y, z) & 15;
    const isSource = level === 0;
    const fluidId = f === FLUID_WATER ? this.waterId : this.lavaId;

    // ---- lava + water interaction
    if (this._handleMixing(x, y, z, f)) return;

    // ---- verify this non-source fluid still has a supply
    if (!isSource) {
      const above = W.getBlock(x, y + 1, z);
      const fedFromAbove = this.flags.fluid[above] === f;
      let bestNeighbor = 99;
      if (!fedFromAbove) {
        for (const [dx, dz] of HDIRS) {
          const nid = W.getBlock(x + dx, y, z + dz);
          if (this.flags.fluid[nid] === f) {
            const nl = W.getMeta(x + dx, y, z + dz) & 15;
            if (nl < bestNeighbor) bestNeighbor = nl;
          }
        }
      }
      const wanted = fedFromAbove ? 1 : bestNeighbor + 1;
      if (wanted > FLUID_MAX_LEVEL) {
        // No supply: dry up.
        W.setBlock(x, y, z, 0, { noFluidSchedule: true });
        this.scheduleNeighbors(x, y, z);
        return;
      }
      if (wanted !== level) {
        W.setMeta(x, y, z, wanted);
        W.markDirty(x, y, z);
        this.scheduleNeighbors(x, y, z);
      }
    }

    // ---- flow down first
    const belowId = W.getBlock(x, y - 1, z);
    if (y > 0 && this._canFlowInto(belowId, f)) {
      this._setFluid(x, y - 1, z, fluidId, 1, f);
      return; // falling fluid does not spread sideways
    }
    if (this.flags.fluid[belowId] === f) {
      const bl = W.getMeta(x, y - 1, z) & 15;
      if (bl > 1) { W.setMeta(x, y - 1, z, 1); W.markDirty(x, y - 1, z); this.scheduleNeighbors(x, y - 1, z); }
      return;
    }

    // ---- spread sideways
    const nextLevel = level + 1;
    if (nextLevel > FLUID_MAX_LEVEL) return;
    // Prefer directions that lead downhill (classic Minecraft "find the drop").
    const dirs = this._sortedFlowDirs(x, y, z, f);
    for (const [dx, dz] of dirs) {
      const nx = x + dx, nz = z + dz;
      const nid = W.getBlock(nx, y, nz);
      if (this._canFlowInto(nid, f)) {
        this._setFluid(nx, y, nz, fluidId, nextLevel, f);
      } else if (this.flags.fluid[nid] === f) {
        const nl = W.getMeta(nx, y, nz) & 15;
        if (nl > nextLevel) {
          W.setMeta(nx, y, nz, nextLevel);
          W.markDirty(nx, y, nz);
          this.scheduleNeighbors(nx, y, nz);
        }
      }
    }
  }

  /** Order the 4 horizontal directions so downhill paths are filled first. */
  _sortedFlowDirs(x, y, z, f) {
    const W = this.world;
    const scored = [];
    for (const d of HDIRS) {
      const nx = x + d[0], nz = z + d[1];
      const nid = W.getBlock(nx, y, nz);
      if (!this._canFlowInto(nid, f) && this.flags.fluid[nid] !== f) continue;
      // Look for a hole within 4 blocks in this direction.
      let dist = 5;
      for (let s = 1; s <= 4; s++) {
        const bx = x + d[0] * s, bz = z + d[1] * s;
        if (this.flags.solid[W.getBlock(bx, y, bz)]) break;
        if (this._canFlowInto(W.getBlock(bx, y - 1, bz), f)) { dist = s; break; }
      }
      scored.push({ d, dist });
    }
    scored.sort((a, b) => a.dist - b.dist);
    return scored.map((s) => s.d);
  }

  _setFluid(x, y, z, fluidId, level, f) {
    const W = this.world;
    const old = W.getBlock(x, y, z);
    if (this.flags.fluid[old] !== 0 && this.flags.fluid[old] !== f) {
      // Mixing handled separately.
      this._mix(x, y, z, f, this.flags.fluid[old]);
      return;
    }
    W.setBlock(x, y, z, fluidId, { noFluidSchedule: true });
    W.setMeta(x, y, z, level);
    this.scheduleNeighbors(x, y, z);
    if (f === FLUID_LAVA) W.playSound('lavaPop', x, y, z, { volume: 0.3 });
  }

  /** Water + lava → stone/obsidian/cobblestone. Returns true if handled. */
  _handleMixing(x, y, z, f) {
    const W = this.world;
    if (f !== FLUID_LAVA) return false;
    const level = W.getMeta(x, y, z) & 15;
    for (const [dx, dz] of HDIRS) {
      const nid = W.getBlock(x + dx, y, z + dz);
      if (this.flags.fluid[nid] === FLUID_WATER) {
        // Lava touching water turns to cobblestone (source → obsidian).
        W.setBlock(x, y, z, this.registry.id(level === 0 ? 'obsidian' : 'cobblestone'));
        W.playSound('fizz', x, y, z, { volume: 0.6 });
        W.spawnParticles('largeSmoke', x + 0.5, y + 1, z + 0.5, 8);
        return true;
      }
    }
    const above = W.getBlock(x, y + 1, z);
    if (this.flags.fluid[above] === FLUID_WATER) {
      W.setBlock(x, y, z, this.registry.id('stone'));
      W.playSound('fizz', x, y, z, { volume: 0.6 });
      return true;
    }
    return false;
  }

  _mix(x, y, z, incoming, existing) {
    const W = this.world;
    if (incoming === FLUID_WATER && existing === FLUID_LAVA) {
      const lvl = W.getMeta(x, y, z) & 15;
      W.setBlock(x, y, z, this.registry.id(lvl === 0 ? 'obsidian' : 'cobblestone'));
    } else if (incoming === FLUID_LAVA && existing === FLUID_WATER) {
      W.setBlock(x, y, z, this.registry.id('stone'));
    }
    W.playSound('fizz', x, y, z, { volume: 0.6 });
    W.spawnParticles('largeSmoke', x + 0.5, y + 1, z + 0.5, 8);
  }

  /** Fluid neighbours may want to flow into a newly emptied cell. */
  _maybeFlowInto(x, y, z, doWater, doLava) {
    const W = this.world;
    const here = W.getBlock(x, y, z);
    if (!this._isReplaceable(here)) return;
    const above = W.getBlock(x, y + 1, z);
    const fa = this.flags.fluid[above];
    if (fa !== 0 && ((fa === FLUID_WATER && doWater) || (fa === FLUID_LAVA && doLava))) {
      this._setFluid(x, y, z, fa === FLUID_WATER ? this.waterId : this.lavaId, 1, fa);
      return;
    }
    let best = 99, bestF = 0;
    for (const [dx, dz] of HDIRS) {
      const nid = W.getBlock(x + dx, y, z + dz);
      const f = this.flags.fluid[nid];
      if (f === 0) continue;
      if (f === FLUID_WATER && !doWater) continue;
      if (f === FLUID_LAVA && !doLava) continue;
      const nl = W.getMeta(x + dx, y, z + dz) & 15;
      if (nl < best) { best = nl; bestF = f; }
    }
    if (bestF !== 0 && best + 1 <= FLUID_MAX_LEVEL) {
      this._setFluid(x, y, z, bestF === FLUID_WATER ? this.waterId : this.lavaId, best + 1, bestF);
    }
  }

  // ------------------------------------------------------------------ gravity

  _tickGravity() {
    if (this.gravityQueue.length === 0) return;
    const pending = this.gravityQueue;
    this.gravityQueue = [];
    this.gravityQueued.clear();
    const W = this.world;
    for (let i = 0; i < pending.length; i += 3) {
      const x = pending[i], y = pending[i + 1], z = pending[i + 2];
      const id = W.getBlock(x, y, z);
      if (!this.flags.gravity[id]) continue;
      // Fall until something solid or a fluid-free floor is found.
      let ny = y;
      while (ny > 0) {
        const below = W.getBlock(x, ny - 1, z);
        if (this.flags.solid[below] || this.flags.fluid[below] !== 0) break;
        ny--;
      }
      if (ny === y) continue;
      W.setBlock(x, y, z, 0);
      W.setBlock(x, ny, z, id);
      W.playSound('sandDig', x, ny, z, { volume: 0.4 });
      W.spawnParticles('blockDust', x + 0.5, ny + 0.5, z + 0.5, 4, { tile: W.tileFor(id, 2) });
      // Anything above the origin may now also fall.
      const above = W.getBlock(x, y + 1, z);
      if (this.flags.gravity[above]) this.scheduleGravity(x, y + 1, z);
    }
  }

  // ---------------------------------------------------------------- explosions

  /**
   * Sphere-raycast explosion: cast rays on a spherical grid, each carrying an
   * energy budget that is spent by the blast resistance of blocks it crosses.
   * That produces the characteristic ragged crater instead of a perfect sphere.
   */
  explode(x, y, z, power, opts = {}) {
    const W = this.world;
    const F = this.flags;
    const destroyed = new Set();
    const RAYS = 16;
    for (let i = 0; i < RAYS; i++) {
      for (let j = 0; j < RAYS; j++) {
        for (let k = 0; k < RAYS; k++) {
          // Only rays starting on the surface of the sampling cube.
          if (!(i === 0 || i === RAYS - 1 || j === 0 || j === RAYS - 1 || k === 0 || k === RAYS - 1)) continue;
          let dx = i / (RAYS - 1) * 2 - 1;
          let dy = j / (RAYS - 1) * 2 - 1;
          let dz = k / (RAYS - 1) * 2 - 1;
          const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
          dx /= len; dy /= len; dz /= len;
          let energy = power * (0.7 + W.rand.next() * 0.6);
          let cx = x + 0.5, cy = y + 0.5, cz = z + 0.5;
          const step = 0.3;
          while (energy > 0) {
            const bx = Math.floor(cx), by = Math.floor(cy), bz = Math.floor(cz);
            if (by < 0 || by >= CHUNK_H) break;
            const id = W.getBlock(bx, by, bz);
            if (id !== 0) {
              const res = F.blastResistance[id];
              if (res >= 1e6) break;   // bedrock / portal frame
              energy -= (res + 0.3) * step * 3.4;
              if (energy > 0) destroyed.add((bx * 4096 + by) * 4096 + bz);
            }
            energy -= step * 0.75;
            cx += dx * step; cy += dy * step; cz += dz * step;
          }
        }
      }
    }
    // Apply destruction: drop a fraction of the blocks.
    const dropChance = 1 / Math.max(1, power);
    for (const key of destroyed) {
      const bz = key % 4096;
      const by = ((key - bz) / 4096) % 4096;
      const bx = (key - bz - by * 4096) / (4096 * 4096);
      const id = W.getBlock(bx, by, bz);
      if (id === 0) continue;
      const def = this.registry.def(id);
      if (W.rand.chance(dropChance) && def.drops && def.drops.length) {
        for (const d of def.drops) {
          if (d.chance !== undefined && !W.rand.chance(d.chance)) continue;
          const n = d.max ? W.rand.range(d.count, d.max) : d.count;
          if (n > 0) W.dropItem(bx + 0.5, by + 0.5, bz + 0.5, d.item, n);
        }
      }
      W.setBlock(bx, by, bz, 0);
      if (opts.fire && W.rand.chance(0.28) && F.solid[W.getBlock(bx, by - 1, bz)]) {
        W.setBlock(bx, by, bz, this.registry.id('fire'));
      }
    }
    // Knock back and damage entities.
    const r = power * 2;
    for (const e of W.entities) {
      const ex = e.pos.x - (x + 0.5), ey = e.pos.y + e.height * 0.5 - (y + 0.5), ez = e.pos.z - (z + 0.5);
      const d = Math.sqrt(ex * ex + ey * ey + ez * ez);
      if (d > r || d < 1e-4) continue;
      const t = 1 - d / r;
      const dmg = Math.floor((t * t * 0.5 + t) * 7 * power + 1);
      if (e.damage) e.damage(dmg, { type: 'explosion', pos: { x, y, z } }, W);
      const kb = t * 1.4;
      e.vel.x += (ex / d) * kb;
      e.vel.y += (ey / d) * kb + 0.15;
      e.vel.z += (ez / d) * kb;
    }
    W.spawnParticles('explosion', x + 0.5, y + 0.5, z + 0.5, 24 + power * 6);
    W.playSound('explode', x, y, z, { volume: 1.4, pitch: 0.9 + W.rand.next() * 0.2 });
    return destroyed.size;
  }
}
