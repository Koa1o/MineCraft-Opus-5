// Deterministic seeded pseudo-random number generators.
// Every procedural system (textures, terrain, mob variants, structures) draws from
// these so that the same seed always produces byte-identical output between reloads.

/** Turn any string into a 32-bit unsigned integer seed. */
export function hashString(str) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * mulberry32 — small, fast, well-distributed 32-bit PRNG.
 * Returns an object rather than a bare function so helpers can hang off it.
 */
export function makeRng(seed) {
  let s = (typeof seed === 'string' ? hashString(seed) : seed | 0) >>> 0;
  if (s === 0) s = 0x9e3779b9;
  const rng = {
    /** float in [0,1) */
    next() {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    /** integer in [0,n) */
    int(n) { return Math.floor(rng.next() * n); },
    /** integer in [a,b] inclusive */
    range(a, b) { return a + Math.floor(rng.next() * (b - a + 1)); },
    /** float in [a,b) */
    float(a, b) { return a + rng.next() * (b - a); },
    /** true with probability p */
    chance(p) { return rng.next() < p; },
    /** uniform pick */
    pick(arr) { return arr[Math.floor(rng.next() * arr.length)]; },
    /** weighted pick: entries [{w:number, ...}] or parallel weights array */
    weighted(items, weightOf) {
      let total = 0;
      for (let i = 0; i < items.length; i++) total += weightOf ? weightOf(items[i]) : items[i].w;
      let r = rng.next() * total;
      for (let i = 0; i < items.length; i++) {
        const w = weightOf ? weightOf(items[i]) : items[i].w;
        r -= w;
        if (r <= 0) return items[i];
      }
      return items[items.length - 1];
    },
    /** gaussian-ish via sum of 3 uniforms, mean 0 stdev ~1 */
    gauss() { return (rng.next() + rng.next() + rng.next() - 1.5) * 1.1547; },
    /** in-place Fisher-Yates */
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    },
    /** derive an independent child generator (stable for a given key) */
    derive(key) { return makeRng((s ^ hashString(String(key))) >>> 0); },
    /** current internal state, for save games */
    get state() { return s; },
    set state(v) { s = v >>> 0; },
  };
  return rng;
}

/** Stateless integer hash — the workhorse for noise and per-coordinate decisions. */
export function hash2i(x, y, seed = 0) {
  let h = (Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b9)) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d) >>> 0;
  h ^= h >>> 12; h = Math.imul(h, 0x297a2d39) >>> 0;
  h ^= h >>> 15;
  return h >>> 0;
}

export function hash3i(x, y, z, seed = 0) {
  let h = (Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(z | 0, 0x1b873593) ^ Math.imul(seed | 0, 0x9e3779b9)) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 0x846ca68b) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** hash → float [0,1) */
export function rand2(x, y, seed = 0) { return hash2i(x, y, seed) / 4294967296; }
export function rand3(x, y, z, seed = 0) { return hash3i(x, y, z, seed) / 4294967296; }
