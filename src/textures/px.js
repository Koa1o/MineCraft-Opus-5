// ---------------------------------------------------------------------------
// Px — the tiny pixel-art painting API that every procedural texture is built
// from. A "Tile" is just {w,h,data:Uint8ClampedArray RGBA}. Nothing here touches
// the DOM, so the exact same painter code runs inside the offline dev tools that
// render the atlas to a PNG for inspection.
//
// Design rule for painters: never fill with a flat colour. Always build from a
// 3-5 shade palette plus per-pixel noise so the result reads as hand-pixelled.
// ---------------------------------------------------------------------------

import { clamp, clamp01, lerp, smoothstep } from '../core/util.js';
import { rand2, hash2i } from '../core/rng.js';

export function makeTile(w, h) {
  return { w, h, data: new Uint8ClampedArray(w * h * 4) };
}

export function cloneTile(t) {
  return { w: t.w, h: t.h, data: new Uint8ClampedArray(t.data) };
}

// --- colour helpers --------------------------------------------------------

/** '#rrggbb' | '#rrggbbaa' | [r,g,b] | [r,g,b,a] | 0xrrggbb -> [r,g,b,a] */
export function color(c) {
  if (Array.isArray(c)) return [c[0] | 0, c[1] | 0, c[2] | 0, c.length > 3 ? c[3] | 0 : 255];
  if (typeof c === 'number') return [(c >> 16) & 255, (c >> 8) & 255, c & 255, 255];
  const s = c[0] === '#' ? c.slice(1) : c;
  if (s.length === 3) {
    return [parseInt(s[0] + s[0], 16), parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16), 255];
  }
  const r = parseInt(s.slice(0, 2), 16), g = parseInt(s.slice(2, 4), 16), b = parseInt(s.slice(4, 6), 16);
  const a = s.length >= 8 ? parseInt(s.slice(6, 8), 16) : 255;
  return [r, g, b, a];
}

export function toHex(c) {
  const [r, g, b] = color(c);
  return '#' + [r, g, b].map((v) => clamp(v | 0, 0, 255).toString(16).padStart(2, '0')).join('');
}

/** Multiply brightness. amt>1 lightens, <1 darkens. Keeps alpha. */
export function shade(c, amt) {
  const [r, g, b, a] = color(c);
  return [clamp(r * amt, 0, 255) | 0, clamp(g * amt, 0, 255) | 0, clamp(b * amt, 0, 255) | 0, a];
}

/** Additive offset in the -255..255 range. */
export function offset(c, d) {
  const [r, g, b, a] = color(c);
  return [clamp(r + d, 0, 255) | 0, clamp(g + d, 0, 255) | 0, clamp(b + d, 0, 255) | 0, a];
}

export function mix(c1, c2, t) {
  const a = color(c1), b = color(c2);
  t = clamp01(t);
  return [
    (a[0] + (b[0] - a[0]) * t) | 0,
    (a[1] + (b[1] - a[1]) * t) | 0,
    (a[2] + (b[2] - a[2]) * t) | 0,
    (a[3] + (b[3] - a[3]) * t) | 0,
  ];
}

/** Convert to greyscale using perceptual weights (for biome-tintable tiles). */
export function grey(c) {
  const [r, g, b, a] = color(c);
  const v = (r * 0.299 + g * 0.587 + b * 0.114) | 0;
  return [v, v, v, a];
}

export function saturate(c, amt) {
  const [r, g, b, a] = color(c);
  const l = r * 0.299 + g * 0.587 + b * 0.114;
  return [
    clamp(l + (r - l) * amt, 0, 255) | 0,
    clamp(l + (g - l) * amt, 0, 255) | 0,
    clamp(l + (b - l) * amt, 0, 255) | 0, a,
  ];
}

export function hueShift(c, deg) {
  let [r, g, b, a] = color(c);
  const [h, s, l] = rgbToHsl(r, g, b);
  const [nr, ng, nb] = hslToRgb((h + deg / 360 + 1) % 1, s, l);
  return [nr, ng, nb, a];
}

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0; const l = (mx + mn) / 2;
  const d = mx - mn;
  if (d > 0) {
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (mx === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h, s, l];
}

export function hslToRgb(h, s, l) {
  const f = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [Math.round(f(p, q, h + 1 / 3) * 255), Math.round(f(p, q, h) * 255), Math.round(f(p, q, h - 1 / 3) * 255)];
}

/**
 * Build a shade ramp from a base colour: [darkest ... lightest].
 * Used so every material has a consistent, limited palette.
 */
export function ramp(base, steps = 5, lo = 0.62, hi = 1.28) {
  const out = [];
  for (let i = 0; i < steps; i++) {
    const t = steps === 1 ? 0.5 : i / (steps - 1);
    out.push(shade(base, lerp(lo, hi, t)));
  }
  return out;
}

// --- per-pixel access -----------------------------------------------------

export function setPx(t, x, y, c, alpha = 1) {
  if (x < 0 || y < 0 || x >= t.w || y >= t.h) return;
  const col = color(c);
  const i = (y * t.w + x) * 4;
  const d = t.data;
  const a = col[3] / 255 * alpha;
  if (a >= 1) {
    d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
  } else if (a > 0) {
    const sa = d[i + 3] / 255;
    const oa = a + sa * (1 - a);
    d[i] = (col[0] * a + d[i] * sa * (1 - a)) / oa;
    d[i + 1] = (col[1] * a + d[i + 1] * sa * (1 - a)) / oa;
    d[i + 2] = (col[2] * a + d[i + 2] * sa * (1 - a)) / oa;
    d[i + 3] = oa * 255;
  }
}

export function getPx(t, x, y) {
  x = clamp(x, 0, t.w - 1); y = clamp(y, 0, t.h - 1);
  const i = (y * t.w + x) * 4;
  return [t.data[i], t.data[i + 1], t.data[i + 2], t.data[i + 3]];
}

/** Wrapped read, for seamless operations. */
export function getPxWrap(t, x, y) {
  x = ((x % t.w) + t.w) % t.w; y = ((y % t.h) + t.h) % t.h;
  const i = (y * t.w + x) * 4;
  return [t.data[i], t.data[i + 1], t.data[i + 2], t.data[i + 3]];
}

export function clear(t) { t.data.fill(0); }

export function fill(t, c) {
  const col = color(c);
  const d = t.data;
  for (let i = 0; i < d.length; i += 4) { d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = col[3]; }
}

export function rect(t, x, y, w, h, c, alpha = 1) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) setPx(t, i, j, c, alpha);
}

export function rectOutline(t, x, y, w, h, c, alpha = 1) {
  for (let i = x; i < x + w; i++) { setPx(t, i, y, c, alpha); setPx(t, i, y + h - 1, c, alpha); }
  for (let j = y; j < y + h; j++) { setPx(t, x, j, c, alpha); setPx(t, x + w - 1, j, c, alpha); }
}

export function hLine(t, x, y, w, c, alpha = 1) { for (let i = x; i < x + w; i++) setPx(t, i, y, c, alpha); }
export function vLine(t, x, y, h, c, alpha = 1) { for (let j = y; j < y + h; j++) setPx(t, x, j, c, alpha); }

export function line(t, x0, y0, x1, y1, c, alpha = 1) {
  x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    setPx(t, x0, y0, c, alpha);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}

export function circle(t, cx, cy, r, c, alpha = 1) {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r2) setPx(t, x, y, c, alpha);
    }
  }
}

export function circleOutline(t, cx, cy, r, c, alpha = 1) {
  const steps = Math.max(8, Math.ceil(r * 8));
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    setPx(t, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), c, alpha);
  }
}

export function ellipse(t, cx, cy, rx, ry, c, alpha = 1) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) setPx(t, x, y, c, alpha);
    }
  }
}

/** Flood-fill-free polygon fill via scanline. pts = [[x,y],...] */
export function polygon(t, pts, c, alpha = 1) {
  let minY = Infinity, maxY = -Infinity;
  for (const p of pts) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      for (let x = Math.round(xs[i]); x <= Math.round(xs[i + 1]); x++) setPx(t, x, y, c, alpha);
    }
  }
}

// --- noise ----------------------------------------------------------------

/** 2D value noise with smooth interpolation, tileable over period p. */
export function valueNoise(x, y, freq, seed, period = 0) {
  const fx = x * freq, fy = y * freq;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = smoothstep(fx - x0), ty = smoothstep(fy - y0);
  const wrap = (v, m) => (period ? ((v % m) + m) % m : v);
  const m = Math.max(1, Math.round(period * freq));
  const a = rand2(wrap(x0, m), wrap(y0, m), seed);
  const b = rand2(wrap(x0 + 1, m), wrap(y0, m), seed);
  const c = rand2(wrap(x0, m), wrap(y0 + 1, m), seed);
  const d = rand2(wrap(x0 + 1, m), wrap(y0 + 1, m), seed);
  return lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
}

/** Fractal value noise, returns [0,1]. */
export function fbm(x, y, freq, octaves, seed, period = 0) {
  let sum = 0, amp = 1, norm = 0, f = freq;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x, y, f, seed + i * 7919, period) * amp;
    norm += amp;
    amp *= 0.5; f *= 2;
  }
  return sum / norm;
}

/** Cheap white noise in [0,1) per pixel. */
export function white(x, y, seed) { return rand2(x, y, seed); }

/** Worley / cellular noise: distance to nearest feature point. Tileable. */
export function worley(x, y, cell, seed, period = 0) {
  const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
  let best = 1e9;
  const m = period ? Math.max(1, Math.round(period / cell)) : 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      let gx = cx + i, gy = cy + j;
      const hx = m ? ((gx % m) + m) % m : gx;
      const hy = m ? ((gy % m) + m) % m : gy;
      const px = (gx + rand2(hx, hy, seed)) * cell;
      const py = (gy + rand2(hx, hy, seed + 1337)) * cell;
      const d = (px - x) * (px - x) + (py - y) * (py - y);
      if (d < best) best = d;
    }
  }
  return Math.sqrt(best) / cell;
}

// --- material building blocks --------------------------------------------
// These are the composable "looks" that make textures read as pixel art rather
// than colour fields. Painters combine several of them.

/**
 * Fill with a shade ramp chosen by fbm noise: the base look of any rock/dirt.
 * `contrast` biases toward mid tones when low.
 */
export function noiseFill(t, pal, opts = {}) {
  const { freq = 0.28, octaves = 3, seed = 1, contrast = 1, bias = 0, period = t.w } = opts;
  const n = pal.length;
  for (let y = 0; y < t.h; y++) {
    for (let x = 0; x < t.w; x++) {
      let v = fbm(x, y, freq, octaves, seed, period);
      v = clamp01((v - 0.5) * contrast + 0.5 + bias);
      const idx = clamp(Math.floor(v * n), 0, n - 1);
      setPx(t, x, y, pal[idx]);
    }
  }
}

/** Scatter single-pixel or small-cluster specks. The "dirt speckle" primitive. */
export function speckle(t, pal, opts = {}) {
  const { density = 0.22, seed = 2, size = 1, alpha = 1, region = null } = opts;
  for (let y = 0; y < t.h; y++) {
    for (let x = 0; x < t.w; x++) {
      if (region && !region(x, y)) continue;
      const h = hash2i(x, y, seed);
      if ((h & 0xffff) / 65536 < density) {
        const c = pal[(h >>> 16) % pal.length];
        if (size === 1) setPx(t, x, y, c, alpha);
        else rect(t, x, y, size, size, c, alpha);
      }
    }
  }
}

/** Ordered 4x4 Bayer dithering between two colours by a coverage function. */
const BAYER4 = [
  [0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5],
];
export function dither(t, c1, c2, coverageFn) {
  for (let y = 0; y < t.h; y++) {
    for (let x = 0; x < t.w; x++) {
      const cov = clamp01(coverageFn(x, y));
      const th = (BAYER4[y & 3][x & 3] + 0.5) / 16;
      setPx(t, x, y, cov > th ? c2 : c1);
    }
  }
}

/** Vertical / horizontal streaks — deepslate, bark, wood grain on planks. */
export function streaks(t, pal, opts = {}) {
  const { vertical = true, density = 0.5, seed = 3, freq = 0.9, alpha = 1, minLen = 3, maxLen = 10 } = opts;
  const across = vertical ? t.w : t.h;
  const along = vertical ? t.h : t.w;
  for (let a = 0; a < across; a++) {
    if (rand2(a, 0, seed) > density) continue;
    const n = 1 + Math.floor(rand2(a, 1, seed) * 2);
    for (let k = 0; k < n; k++) {
      const start = Math.floor(rand2(a, 2 + k, seed) * along);
      const len = minLen + Math.floor(rand2(a, 5 + k, seed) * (maxLen - minLen));
      const c = pal[Math.floor(rand2(a, 9 + k, seed) * pal.length)];
      for (let i = 0; i < len; i++) {
        const p = (start + i) % along;
        const wob = Math.round(Math.sin(p * freq + a) * 0.5);
        if (vertical) setPx(t, (a + wob + t.w) % t.w, p, c, alpha);
        else setPx(t, p, (a + wob + t.h) % t.h, c, alpha);
      }
    }
  }
}

/**
 * Irregular stone chunks with dark mortar seams. The cobblestone primitive.
 * Returns a per-pixel cell id map so callers can shade individual chunks.
 */
export function stoneChunks(t, pal, opts = {}) {
  const { cell = 5, seed = 4, seam = '#2b2b2f', jitter = 0.85, seamAlpha = 1 } = opts;
  const w = t.w, h = t.h;
  const ids = new Int16Array(w * h);
  const sites = [];
  const gx = Math.max(2, Math.round(w / cell));
  for (let j = 0; j < gx; j++) {
    for (let i = 0; i < gx; i++) {
      sites.push([
        (i + 0.5 + (rand2(i, j, seed) - 0.5) * jitter) * (w / gx),
        (j + 0.5 + (rand2(i, j, seed + 99) - 0.5) * jitter) * (h / gx),
        sites.length,
      ]);
    }
  }
  // Voronoi assignment with wrapping for seamless tiles.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let best = 1e9, bestId = 0, second = 1e9;
      for (const s of sites) {
        let dx = Math.abs(s[0] - x), dy = Math.abs(s[1] - y);
        if (dx > w / 2) dx = w - dx;
        if (dy > h / 2) dy = h - dy;
        const d = dx * dx + dy * dy;
        if (d < best) { second = best; best = d; bestId = s[2]; }
        else if (d < second) second = d;
      }
      ids[y * w + x] = bestId;
      const edge = Math.sqrt(second) - Math.sqrt(best);
      const shadeIdx = (hash2i(bestId, 7, seed) % pal.length);
      const local = fbm(x, y, 0.5, 2, seed + 21, w);
      let c = pal[clamp(shadeIdx + (local > 0.62 ? 1 : local < 0.38 ? -1 : 0), 0, pal.length - 1)];
      setPx(t, x, y, c);
      if (edge < 0.85) setPx(t, x, y, seam, seamAlpha);
    }
  }
  return ids;
}

/** Regular brick courses with mortar. */
export function bricks(t, pal, mortar, opts = {}) {
  const { bw = 8, bh = 4, seed = 5, mortarW = 1 } = opts;
  fill(t, mortar);
  for (let row = 0; row * bh < t.h; row++) {
    const offX = (row & 1) ? -Math.floor(bw / 2) : 0;
    for (let col = -1; col * bw + offX < t.w; col++) {
      const x = col * bw + offX, y = row * bh;
      const shadeIdx = hash2i(col, row, seed) % pal.length;
      const base = pal[shadeIdx];
      for (let j = 0; j < bh - mortarW; j++) {
        for (let i = 0; i < bw - mortarW; i++) {
          const n = fbm(x + i, y + j, 0.6, 2, seed + 3, t.w);
          const c = n > 0.6 ? shade(base, 1.1) : n < 0.4 ? shade(base, 0.9) : base;
          setPx(t, x + i, y + j, c);
        }
      }
      // top-left highlight, bottom-right shadow on each brick
      hLine(t, x, y, bw - mortarW, shade(base, 1.18), 0.55);
      vLine(t, x, y, bh - mortarW, shade(base, 1.12), 0.4);
      hLine(t, x, y + bh - mortarW - 1, bw - mortarW, shade(base, 0.82), 0.5);
    }
  }
}

/** Concentric wood rings for log tops. */
export function woodRings(t, pal, opts = {}) {
  const { seed = 6, cx = t.w / 2 - 0.5, cy = t.h / 2 - 0.5, ringW = 1.6, wobble = 0.9 } = opts;
  for (let y = 0; y < t.h; y++) {
    for (let x = 0; x < t.w; x++) {
      const dx = x - cx, dy = y - cy;
      let r = Math.sqrt(dx * dx + dy * dy);
      const ang = Math.atan2(dy, dx);
      r += Math.sin(ang * 3 + 0.7) * wobble + (fbm(x, y, 0.35, 2, seed) - 0.5) * 1.5;
      const band = Math.floor(r / ringW);
      const idx = (band % 2 === 0)
        ? 1 + (hash2i(band, 0, seed) % 2)
        : 2 + (hash2i(band, 1, seed) % 2);
      setPx(t, x, y, pal[clamp(idx, 0, pal.length - 1)]);
    }
  }
}

/** Vertical bark strips for log sides. */
export function bark(t, pal, opts = {}) {
  const { seed = 7 } = opts;
  for (let x = 0; x < t.w; x++) {
    const n = fbm(x, 0, 0.7, 2, seed);
    const idx = clamp(Math.floor(n * pal.length), 0, pal.length - 1);
    for (let y = 0; y < t.h; y++) {
      const v = fbm(x * 0.6, y, 0.55, 3, seed + 11, t.w);
      const j = clamp(idx + (v > 0.66 ? 1 : v < 0.34 ? -1 : 0), 0, pal.length - 1);
      setPx(t, x, y, pal[j]);
    }
    if (rand2(x, 3, seed) < 0.28) {
      const y0 = Math.floor(rand2(x, 4, seed) * t.h);
      const len = 3 + Math.floor(rand2(x, 5, seed) * (t.h - 4));
      for (let i = 0; i < len; i++) setPx(t, x, (y0 + i) % t.h, pal[0], 0.75);
    }
  }
}

/**
 * Mineral blobs embedded in a stone base — the ore primitive.
 * Produces multi-pixel clusters with a highlight and a dark rim, not a solid dot.
 */
export function oreBlobs(t, oreRamp, opts = {}) {
  const { seed = 8, count = 5, minR = 1.1, maxR = 2.4, rim = '#1d1d22', sparkle = true } = opts;
  const pts = [];
  for (let i = 0; i < count; i++) {
    // Poisson-ish rejection so blobs do not clump into one mass.
    let x = 0, y = 0, ok = false;
    for (let tries = 0; tries < 24 && !ok; tries++) {
      x = 1.5 + rand2(i, tries, seed) * (t.w - 3);
      y = 1.5 + rand2(i, tries, seed + 51) * (t.h - 3);
      ok = true;
      for (const p of pts) {
        if ((p[0] - x) ** 2 + (p[1] - y) ** 2 < 12) { ok = false; break; }
      }
    }
    pts.push([x, y]);
    const r = minR + rand2(i, 9, seed) * (maxR - minR);
    // irregular blob: sample around with noise-modulated radius
    for (let py = Math.floor(y - r - 1); py <= Math.ceil(y + r + 1); py++) {
      for (let px = Math.floor(x - r - 1); px <= Math.ceil(x + r + 1); px++) {
        const dx = px - x, dy = py - y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const wob = (fbm(px * 1.7, py * 1.7, 0.5, 2, seed + i * 31) - 0.5) * 1.5;
        const rr = r + wob;
        if (d <= rr) {
          // lit from top-left
          const lit = clamp01(0.5 - (dx + dy) / (rr * 3.2));
          const idx = clamp(Math.round(lit * (oreRamp.length - 1) + 0.6), 0, oreRamp.length - 1);
          setPx(t, px, py, oreRamp[idx]);
        } else if (d <= rr + 0.9) {
          setPx(t, px, py, rim, 0.5);
        }
      }
    }
    if (sparkle) setPx(t, Math.round(x - r * 0.35), Math.round(y - r * 0.35), shade(oreRamp[oreRamp.length - 1], 1.35), 0.9);
  }
}

/** Sand / gravel grain: dense fine dots with slight vertical bias. */
export function grain(t, pal, opts = {}) {
  const { seed = 9, density = 0.55 } = opts;
  for (let y = 0; y < t.h; y++) {
    for (let x = 0; x < t.w; x++) {
      const h = hash2i(x, y, seed);
      if ((h & 255) / 256 < density) {
        setPx(t, x, y, pal[(h >>> 8) % pal.length]);
      }
    }
  }
}

/** Radial warm glow — lava hot spots, glowstone cores, magma cracks. */
export function radialGlow(t, cx, cy, r, inner, outer, opts = {}) {
  const { power = 1.6, alpha = 1 } = opts;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / r;
      if (d > 1) continue;
      const tt = Math.pow(1 - d, power);
      setPx(t, x, y, mix(outer, inner, tt), alpha * clamp01(tt * 1.3));
    }
  }
}

/** Add a subtle top-lit bevel: lighter top rows, darker bottom rows. */
export function bevel(t, amt = 0.12) {
  for (let y = 0; y < t.h; y++) {
    const f = 1 + amt * (1 - (y / (t.h - 1)) * 2);
    for (let x = 0; x < t.w; x++) {
      const c = getPx(t, x, y);
      if (c[3] === 0) continue;
      const s = shade(c, f);
      const i = (y * t.w + x) * 4;
      t.data[i] = s[0]; t.data[i + 1] = s[1]; t.data[i + 2] = s[2];
    }
  }
}

/** Darken the outer 1px frame — gives blocks visible edges in-world. */
export function edgeShade(t, amt = 0.86, width = 1) {
  for (let y = 0; y < t.h; y++) {
    for (let x = 0; x < t.w; x++) {
      const e = Math.min(x, y, t.w - 1 - x, t.h - 1 - y);
      if (e >= width) continue;
      const c = getPx(t, x, y);
      if (c[3] === 0) continue;
      const f = amt + (1 - amt) * (e / width);
      const s = shade(c, f);
      const i = (y * t.w + x) * 4;
      t.data[i] = s[0]; t.data[i + 1] = s[1]; t.data[i + 2] = s[2];
    }
  }
}

/** Punch alpha holes where a mask function says so (leaves, cutout plants). */
export function cutout(t, maskFn) {
  for (let y = 0; y < t.h; y++) {
    for (let x = 0; x < t.w; x++) {
      if (maskFn(x, y)) {
        const i = (y * t.w + x) * 4;
        t.data[i + 3] = 0;
      }
    }
  }
}

/** Composite src over dst at (ox,oy). */
export function blit(dst, src, ox, oy, alpha = 1) {
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const c = getPx(src, x, y);
      if (c[3] === 0) continue;
      setPx(dst, ox + x, oy + y, c, alpha * (c[3] / 255) / (c[3] / 255 || 1));
      if (c[3] < 255) setPx(dst, ox + x, oy + y, [c[0], c[1], c[2], c[3]], alpha);
    }
  }
}

/** Multiply every pixel by a colour — used to derive tinted variants. */
export function multiply(t, c) {
  const col = color(c);
  for (let i = 0; i < t.data.length; i += 4) {
    t.data[i] = (t.data[i] * col[0]) / 255;
    t.data[i + 1] = (t.data[i + 1] * col[1]) / 255;
    t.data[i + 2] = (t.data[i + 2] * col[2]) / 255;
  }
}

/** Convert the whole tile to greyscale, preserving alpha (for tintable tiles). */
export function toGrey(t, opts = {}) {
  const { lift = 1.0 } = opts;
  for (let i = 0; i < t.data.length; i += 4) {
    const v = clamp((t.data[i] * 0.30 + t.data[i + 1] * 0.62 + t.data[i + 2] * 0.08) * lift, 0, 255);
    t.data[i] = v; t.data[i + 1] = v; t.data[i + 2] = v;
  }
}

/** Shift the tile contents by (dx,dy) with wrapping — animation frames. */
export function scroll(t, dx, dy) {
  const out = new Uint8ClampedArray(t.data.length);
  for (let y = 0; y < t.h; y++) {
    for (let x = 0; x < t.w; x++) {
      const c = getPxWrap(t, x - dx, y - dy);
      const i = (y * t.w + x) * 4;
      out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; out[i + 3] = c[3];
    }
  }
  t.data.set(out);
}

/** Mirror horizontally (for symmetric mob faces). */
export function mirrorH(t) {
  for (let y = 0; y < t.h; y++) {
    for (let x = 0; x < t.w >> 1; x++) {
      const a = getPx(t, x, y), b = getPx(t, t.w - 1 - x, y);
      const ia = (y * t.w + x) * 4, ib = (y * t.w + (t.w - 1 - x)) * 4;
      for (let k = 0; k < 4; k++) { t.data[ia + k] = b[k]; t.data[ib + k] = a[k]; }
    }
  }
}

/** 3x3 box blur restricted to opaque pixels — softens harsh noise. */
export function softenNoise(t, amount = 0.5) {
  const src = new Uint8ClampedArray(t.data);
  const rd = (x, y, k) => {
    x = clamp(x, 0, t.w - 1); y = clamp(y, 0, t.h - 1);
    return src[(y * t.w + x) * 4 + k];
  };
  for (let y = 0; y < t.h; y++) {
    for (let x = 0; x < t.w; x++) {
      const i = (y * t.w + x) * 4;
      if (src[i + 3] === 0) continue;
      for (let k = 0; k < 3; k++) {
        let s = 0;
        for (let j = -1; j <= 1; j++) for (let ii = -1; ii <= 1; ii++) s += rd(x + ii, y + j, k);
        t.data[i + k] = lerp(src[i + k], s / 9, amount);
      }
    }
  }
}

/** Draw a 1px inner highlight frame — glass, item slots, framed blocks. */
export function innerFrame(t, cTop, cBottom, alpha = 1) {
  hLine(t, 0, 0, t.w, cTop, alpha);
  vLine(t, 0, 0, t.h, cTop, alpha);
  hLine(t, 0, t.h - 1, t.w, cBottom, alpha);
  vLine(t, t.w - 1, 0, t.h, cBottom, alpha);
}

/** A diagonal specular streak (glass, metal, ice). */
export function specStreak(t, c, opts = {}) {
  const { x0 = 2, y0 = t.h - 4, len = 6, alpha = 0.55, thickness = 1 } = opts;
  for (let i = 0; i < len; i++) {
    for (let k = 0; k < thickness; k++) setPx(t, x0 + i + k, y0 - i, c, alpha);
  }
}

export const Px = {
  makeTile, cloneTile, color, toHex, shade, offset, mix, grey, saturate, hueShift, ramp,
  setPx, getPx, getPxWrap, clear, fill, rect, rectOutline, hLine, vLine, line, circle,
  circleOutline, ellipse, polygon, valueNoise, fbm, white, worley, noiseFill, speckle,
  dither, streaks, stoneChunks, bricks, woodRings, bark, oreBlobs, grain, radialGlow,
  bevel, edgeShade, cutout, blit, multiply, toGrey, scroll, mirrorH, softenNoise,
  innerFrame, specStreak, rgbToHsl, hslToRgb,
};
