// World generation noise module.
// Provides Simplex noise, fractal layering, domain warp, and a named noise router
// for terrain, biome selection, and cave/ore generation.
// No external dependencies. All Math.random usage is forbidden; use seeded RNGs.

import { hash2i, hash3i } from '../core/rng.js';

// ---------------------------------------------------------------------------
// Gradient tables for Simplex noise
// ---------------------------------------------------------------------------

/** 2D gradient vectors (12 equally spaced unit directions). */
const NOISE_GRAD2 = new Float64Array([
  1, 2,  -1, 2,  1, -2,  -1, -2,
  2, 1,  -2, 1,  2, -1,  -2, -1,
  1, 0,  -1, 0,  0, 1,   0, -1,
]);
const NOISE_GRAD2_LEN = 12; // pairs

/** 3D gradient vectors (16 directions pointing to midpoints of cube edges). */
const NOISE_GRAD3 = new Float64Array([
  1, 1, 0,  -1, 1, 0,  1, -1, 0,  -1, -1, 0,
  1, 0, 1,  -1, 0, 1,  1, 0, -1,  -1, 0, -1,
  0, 1, 1,  0, -1, 1,  0, 1, -1,  0, -1, -1,
  1, 1, 0,  -1, 1, 0,  0, -1, 1,  0, -1, -1,
]);
const NOISE_GRAD3_LEN = 16; // triples

/** Build a deterministic permutation table from seed. */
function NOISE_buildPerm(seed) {
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  // Fisher-Yates with hash-based RNG
  for (let i = 255; i > 0; i--) {
    const j = hash2i(i, seed, 0x3f7a) % (i + 1);
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  return perm;
}

// Skew constants for 2D simplex
const NOISE_F2 = 0.5 * (Math.sqrt(3) - 1);
const NOISE_G2 = (3 - Math.sqrt(3)) / 6;

// Skew constants for 3D simplex
const NOISE_F3 = 1 / 3;
const NOISE_G3 = 1 / 6;

// ---------------------------------------------------------------------------
// NOISE_Simplex
// ---------------------------------------------------------------------------

export class NOISE_Simplex {
  constructor(seed) {
    this._seed = seed >>> 0;
    this._perm = NOISE_buildPerm(this._seed);
  }

  /** 2D simplex noise, output roughly in [-1, 1]. */
  noise2(x, y) {
    const perm = this._perm;
    // Skew input space to simplex grid
    const s = (x + y) * NOISE_F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * NOISE_G2;
    // Unskew back to (x,y) space
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;
    // Determine simplex corner offsets
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + NOISE_G2;
    const y1 = y0 - j1 + NOISE_G2;
    const x2 = x0 - 1 + 2 * NOISE_G2;
    const y2 = y0 - 1 + 2 * NOISE_G2;
    // Hash corner coords
    const ii = i & 255;
    const jj = j & 255;
    const g0 = (perm[ii + perm[jj]] % NOISE_GRAD2_LEN) * 2;
    const g1 = (perm[ii + i1 + perm[jj + j1]] % NOISE_GRAD2_LEN) * 2;
    const g2 = (perm[ii + 1 + perm[jj + 1]] % NOISE_GRAD2_LEN) * 2;
    // Contribution from corners
    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * (NOISE_GRAD2[g0] * x0 + NOISE_GRAD2[g0 + 1] * y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * (NOISE_GRAD2[g1] * x1 + NOISE_GRAD2[g1 + 1] * y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * (NOISE_GRAD2[g2] * x2 + NOISE_GRAD2[g2 + 1] * y2);
    }
    return 70 * (n0 + n1 + n2);
  }

  /** 3D simplex noise, output roughly in [-1, 1]. */
  noise3(x, y, z) {
    const perm = this._perm;
    const s = (x + y + z) * NOISE_F3;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);
    const t = (i + j + k) * NOISE_G3;
    const X0 = i - t;
    const Y0 = j - t;
    const Z0 = k - t;
    const x0 = x - X0;
    const y0 = y - Y0;
    const z0 = z - Z0;
    // Determine which simplex we are in
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=1;k2=0; }
      else if (x0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=0;k2=1; }
      else { i1=0;j1=0;k1=1;i2=1;j2=0;k2=1; }
    } else {
      if (y0 < z0) { i1=0;j1=0;k1=1;i2=0;j2=1;k2=1; }
      else if (x0 < z0) { i1=0;j1=1;k1=0;i2=0;j2=1;k2=1; }
      else { i1=0;j1=1;k1=0;i2=1;j2=1;k2=0; }
    }
    const x1 = x0 - i1 + NOISE_G3;
    const y1 = y0 - j1 + NOISE_G3;
    const z1 = z0 - k1 + NOISE_G3;
    const x2 = x0 - i2 + 2 * NOISE_G3;
    const y2 = y0 - j2 + 2 * NOISE_G3;
    const z2 = z0 - k2 + 2 * NOISE_G3;
    const x3 = x0 - 1 + 3 * NOISE_G3;
    const y3 = y0 - 1 + 3 * NOISE_G3;
    const z3 = z0 - 1 + 3 * NOISE_G3;
    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;
    const g0 = (perm[ii + perm[jj + perm[kk]]] % NOISE_GRAD3_LEN) * 3;
    const g1 = (perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]] % NOISE_GRAD3_LEN) * 3;
    const g2 = (perm[ii + i2 + perm[jj + j2 + perm[kk + k2]]] % NOISE_GRAD3_LEN) * 3;
    const g3 = (perm[ii + 1 + perm[jj + 1 + perm[kk + 1]]] % NOISE_GRAD3_LEN) * 3;
    let n0 = 0, n1 = 0, n2 = 0, n3 = 0;
    let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0*t0*(NOISE_GRAD3[g0]*x0+NOISE_GRAD3[g0+1]*y0+NOISE_GRAD3[g0+2]*z0);
    }
    let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1*t1*(NOISE_GRAD3[g1]*x1+NOISE_GRAD3[g1+1]*y1+NOISE_GRAD3[g1+2]*z1);
    }
    let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2*t2*(NOISE_GRAD3[g2]*x2+NOISE_GRAD3[g2+1]*y2+NOISE_GRAD3[g2+2]*z2);
    }
    let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
    if (t3 >= 0) {
      t3 *= t3;
      n3 = t3*t3*(NOISE_GRAD3[g3]*x3+NOISE_GRAD3[g3+1]*y3+NOISE_GRAD3[g3+2]*z3);
    }
    return 32 * (n0 + n1 + n2 + n3);
  }
}

// ---------------------------------------------------------------------------
// FractalNoise
// ---------------------------------------------------------------------------

export class FractalNoise {
  /**
   * @param {number} seed
   * @param {{octaves:number, freq:number, lacunarity?:number, gain?:number, ridged?:boolean}} opts
   */
  constructor(seed, { octaves, freq, lacunarity = 2, gain = 0.5, ridged = false }) {
    this._octaves = octaves;
    this._freq = freq;
    this._lac = lacunarity;
    this._gain = gain;
    this._ridged = ridged;
    // Create one NOISE_Simplex per octave with different seeds
    this._layers = [];
    for (let o = 0; o < octaves; o++) {
      const s = (((seed >>> 0) + o * 0x3e6fc981) ^ 0x9e3779b9) >>> 0;
      this._layers.push(new NOISE_Simplex(s));
    }
    // Precompute normalisation factor
    let amp = 1;
    let maxAmp = 0;
    for (let o = 0; o < octaves; o++) {
      maxAmp += amp;
      amp *= gain;
    }
    this._norm = 1 / maxAmp;
  }

  /** Returns value in [0,1] for non-ridged, or [0,1] ridged mountain profile. */
  at2(x, y) {
    const { _freq, _lac, _gain, _ridged, _layers, _norm } = this;
    let sum = 0;
    let amp = 1;
    let fx = _freq;
    for (let o = 0; o < _layers.length; o++) {
      let v = _layers[o].noise2(x * fx, y * fx);
      if (_ridged) {
        v = 1 - Math.abs(v); // ridge: peaks at 0-crossings
        v = v * v;
      }
      sum += v * amp;
      amp *= _gain;
      fx *= _lac;
    }
    if (_ridged) {
      return Math.max(0, Math.min(1, sum * _norm));
    }
    return Math.max(0, Math.min(1, sum * _norm * 0.5 + 0.5));
  }

  /** Returns value in [0,1]. */
  at3(x, y, z) {
    const { _freq, _lac, _gain, _ridged, _layers, _norm } = this;
    let sum = 0;
    let amp = 1;
    let fx = _freq;
    for (let o = 0; o < _layers.length; o++) {
      let v = _layers[o].noise3(x * fx, y * fx, z * fx);
      if (_ridged) {
        v = 1 - Math.abs(v);
        v = v * v;
      }
      sum += v * amp;
      amp *= _gain;
      fx *= _lac;
    }
    if (_ridged) {
      return Math.max(0, Math.min(1, sum * _norm));
    }
    return Math.max(0, Math.min(1, sum * _norm * 0.5 + 0.5));
  }
}

// ---------------------------------------------------------------------------
// Domain warp
// ---------------------------------------------------------------------------

/**
 * Returns [wx, wy] — coordinates warped by a pair of noise values.
 * @param {FractalNoise} noise  A FractalNoise instance used for warp offsets.
 * @param {number} x
 * @param {number} y
 * @param {number} amp  Warp amplitude in world units.
 * @param {number} freq  Input frequency for the warp noise.
 * @returns {[number, number]}
 */
export function domainWarp2(noise, x, y, amp, freq) {
  const dx = noise.at2(x * freq + 1.7, y * freq + 9.2) * 2 - 1;
  const dy = noise.at2(x * freq + 8.3, y * freq + 2.8) * 2 - 1;
  return [x + dx * amp, y + dy * amp];
}

// ---------------------------------------------------------------------------
// NoiseRouter
// ---------------------------------------------------------------------------

/** Deterministic seed offsets for each named noise channel. */
const NOISE_CHANNEL_OFFSETS = {
  continent:    0x00010000,
  erosion:      0x00020000,
  ridge:        0x00030000,
  heightDetail: 0x00040000,
  temperature:  0x00050000,
  humidity:     0x00060000,
  weirdness:    0x00070000,
  cave3d:       0x00080000,
  caveCheese:   0x00090000,
  oreVein:      0x000a0000,
  treeDensity:  0x000b0000,
};

export class NoiseRouter {
  /**
   * @param {number} worldSeed
   */
  constructor(worldSeed) {
    const s = worldSeed >>> 0;

    this.continent = new FractalNoise(
      (s + NOISE_CHANNEL_OFFSETS.continent) >>> 0,
      { octaves: 4, freq: 0.004, lacunarity: 2, gain: 0.5 },
    );

    this.erosion = new FractalNoise(
      (s + NOISE_CHANNEL_OFFSETS.erosion) >>> 0,
      { octaves: 4, freq: 0.006, lacunarity: 2, gain: 0.5 },
    );

    this.ridge = new FractalNoise(
      (s + NOISE_CHANNEL_OFFSETS.ridge) >>> 0,
      { octaves: 5, freq: 0.009, lacunarity: 2.1, gain: 0.5, ridged: true },
    );

    this.heightDetail = new FractalNoise(
      (s + NOISE_CHANNEL_OFFSETS.heightDetail) >>> 0,
      { octaves: 4, freq: 0.025, lacunarity: 2, gain: 0.55 },
    );

    this.temperature = new FractalNoise(
      (s + NOISE_CHANNEL_OFFSETS.temperature) >>> 0,
      { octaves: 3, freq: 0.003, lacunarity: 2, gain: 0.5 },
    );

    this.humidity = new FractalNoise(
      (s + NOISE_CHANNEL_OFFSETS.humidity) >>> 0,
      { octaves: 3, freq: 0.0035, lacunarity: 2, gain: 0.5 },
    );

    this.weirdness = new FractalNoise(
      (s + NOISE_CHANNEL_OFFSETS.weirdness) >>> 0,
      { octaves: 3, freq: 0.005, lacunarity: 2, gain: 0.5 },
    );

    this.cave3d = new FractalNoise(
      (s + NOISE_CHANNEL_OFFSETS.cave3d) >>> 0,
      { octaves: 3, freq: 0.02, lacunarity: 2, gain: 0.5 },
    );

    this.caveCheese = new FractalNoise(
      (s + NOISE_CHANNEL_OFFSETS.caveCheese) >>> 0,
      { octaves: 2, freq: 0.015, lacunarity: 2, gain: 0.5 },
    );

    this.oreVein = new FractalNoise(
      (s + NOISE_CHANNEL_OFFSETS.oreVein) >>> 0,
      { octaves: 2, freq: 0.03, lacunarity: 2, gain: 0.5 },
    );

    this.treeDensity = new FractalNoise(
      (s + NOISE_CHANNEL_OFFSETS.treeDensity) >>> 0,
      { octaves: 2, freq: 0.05, lacunarity: 2, gain: 0.5 },
    );

    // Warp noise for continental shape variation
    this._warpNoise = new FractalNoise(
      (s ^ 0xdeadbeef) >>> 0,
      { octaves: 3, freq: 0.002, lacunarity: 2, gain: 0.5 },
    );
  }

  /**
   * Sample all column-level noise values at world position (wx, wz).
   * Returns a plain object with all values needed for biome selection and
   * terrain height computation.
   * @param {number} wx  World X coordinate
   * @param {number} wz  World Z coordinate
   * @returns {{ continent:number, erosion:number, ridge:number, temp:number, humid:number, weird:number, height:number }}
   */
  sampleColumn(wx, wz) {
    // Domain-warp the continental scale for more organic coastlines
    const [wx2, wz2] = domainWarp2(this._warpNoise, wx, wz, 80, 0.002);

    const continent = this.continent.at2(wx2, wz2);
    const erosion   = this.erosion.at2(wx, wz);
    const ridge     = this.ridge.at2(wx, wz);
    const temp      = this.temperature.at2(wx, wz);
    const humid     = this.humidity.at2(wx, wz);
    const weird     = this.weirdness.at2(wx, wz);

    // Terrain height computation based on noise channels
    const SEA = 62;

    // Continental mask: below 0.42 = deep ocean, 0.42-0.52 = shore, above = land
    let landFactor;
    if (continent < 0.40) {
      // Deep ocean basin — steep drop
      landFactor = -1.2 + continent * 2.0;
    } else if (continent < 0.52) {
      // Transitional shore/shallow
      landFactor = (continent - 0.40) / 0.12 * 0.4 - 0.25;
    } else {
      // Land: 0 to 1 across 0.52..1.0
      landFactor = (continent - 0.52) / 0.48;
    }

    // Erosion softens terrain (high erosion = flat plains, low erosion = rough)
    const roughness = 1 - erosion;

    // Ridge contributes sharp mountains only on low-erosion high-land
    const ridgeContrib = ridge * ridge * roughness * Math.max(0, landFactor);

    // Detail noise adds local variation
    const detail = (this.heightDetail.at2(wx, wz) * 2 - 1) * 0.12;

    // Composite height: anchor at SEA_LEVEL
    let h = SEA + landFactor * 34 + ridgeContrib * 52 + detail * 18;

    // Clamp to valid range
    h = Math.max(4, Math.min(120, h));

    return { continent, erosion, ridge, temp, humid, weird, height: h };
  }
}
