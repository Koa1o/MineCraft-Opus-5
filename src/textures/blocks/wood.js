// wood.js — procedural wood/plant block textures
// All top-level names prefixed with WOOD_ to ensure global uniqueness.
import { Px } from '../px.js';

// ---- species palette definitions -------------------------------------------
// Each species: { bark:[5 shades], heartwood:[5 shades], ring:[4 shades], sapwood:[3] }

// oak: medium warm brown
const WOOD_OAK_BARK = Px.ramp('#6a4c2a', 5, 0.55, 1.28);
const WOOD_OAK_RING = Px.ramp('#8a6238', 4, 0.65, 1.22);
const WOOD_OAK_PLANK = Px.ramp('#b8924a', 5, 0.70, 1.20);
const WOOD_OAK_FISS = Px.shade('#6a4c2a', 0.55);

// birch: near-white cream, black dashes
const WOOD_BIRCH_BARK = Px.ramp('#c8c2b0', 5, 0.72, 1.18);
const WOOD_BIRCH_RING = Px.ramp('#d8d0b8', 4, 0.78, 1.15);
const WOOD_BIRCH_PLANK = Px.ramp('#d8cfa0', 5, 0.76, 1.16);
const WOOD_BIRCH_DASH = '#1a1210';

// spruce: dark chocolate
const WOOD_SPRUCE_BARK = Px.ramp('#3a2410', 5, 0.50, 1.32);
const WOOD_SPRUCE_RING = Px.ramp('#5a3818', 4, 0.58, 1.25);
const WOOD_SPRUCE_PLANK = Px.ramp('#6a4820', 5, 0.60, 1.22);
const WOOD_SPRUCE_FISS = Px.shade('#2a1808', 0.60);

// jungle: olive/reddish-orange
const WOOD_JUNGLE_BARK = Px.ramp('#5a4820', 5, 0.55, 1.28);
const WOOD_JUNGLE_RING = Px.ramp('#7a6030', 4, 0.62, 1.24);
const WOOD_JUNGLE_PLANK = Px.ramp('#9a7040', 5, 0.62, 1.22);
const WOOD_JUNGLE_FISS = Px.shade('#3a2a10', 0.58);

// acacia: grey bark + orange planks
const WOOD_ACACIA_BARK = Px.ramp('#707060', 5, 0.58, 1.28);
const WOOD_ACACIA_RING = Px.ramp('#b86030', 4, 0.62, 1.28);
const WOOD_ACACIA_PLANK = Px.ramp('#c07038', 5, 0.62, 1.25);
const WOOD_ACACIA_FISS = Px.shade('#404038', 0.55);

// dark_oak: very dark brown
const WOOD_DARKOAK_BARK = Px.ramp('#2a1c0c', 5, 0.50, 1.35);
const WOOD_DARKOAK_RING = Px.ramp('#4a2c14', 4, 0.55, 1.28);
const WOOD_DARKOAK_PLANK = Px.ramp('#4a3018', 5, 0.55, 1.28);
const WOOD_DARKOAK_FISS = Px.shade('#180c04', 0.52);

// ---- deterministic hash ------------------------------------------------------
function WOOD_h2(x, y, s) {
  let v = (x * 1619 + y * 31337 + s * 1234567) | 0;
  v = (v ^ (v >>> 13)) * 0x45d9f3b;
  v = (v ^ (v >>> 15));
  return (v >>> 0) / 0xffffffff;
}

// ---- shared log side painter -------------------------------------------------
function WOOD_paintLogSide(t, barkPal, fissCol, seed) {
  Px.bark(t, barkPal, { seed });
  // extra deep fissure lines for variety
  for (let i = 0; i < 3; i++) {
    const fx = (WOOD_h2(i, 0, seed + 200) * 14) | 0;
    const flen = 3 + ((WOOD_h2(i, 1, seed + 200) * 10) | 0);
    for (let j = 0; j < flen; j++) {
      Px.setPx(t, fx, j + ((WOOD_h2(i, 2, seed + 200) * (16 - flen)) | 0), fissCol, 0.65);
    }
  }
}

// ---- shared log top painter --------------------------------------------------
function WOOD_paintLogTop(t, ringPal, barkCol, seed) {
  // Use a wider ramp derived from ringPal to ensure colour variety
  const wideRamp = [
    Px.shade(ringPal[0], 0.70),
    ringPal[0],
    ringPal[Math.floor(ringPal.length * 0.33)],
    ringPal[Math.floor(ringPal.length * 0.67)],
    ringPal[ringPal.length - 1],
    Px.shade(ringPal[ringPal.length - 1], 1.20),
  ];
  Px.woodRings(t, wideRamp, { seed, ringW: 1.4, wobble: 0.9 });
  // Add per-pixel fbm noise to multiply additional shade variation
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = Px.fbm(x, y, 0.40, 3, seed + 77, 16);
      const c = Px.getPx(t, x, y);
      Px.setPx(t, x, y, Px.shade(c, 0.90 + n * 0.22));
    }
  }
  // dark bark rim band around the edge
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const e = Math.min(x, y, 15 - x, 15 - y);
      if (e <= 1) {
        Px.setPx(t, x, y, barkCol, 0.80);
      }
    }
  }
  Px.edgeShade(t, 0.90);
}

// ---- shared planks painter ---------------------------------------------------
function WOOD_paintPlanks(t, plankPal, seamCol, grainPal, seed) {
  // 4 plank rows each 4px tall, staggered seams
  Px.noiseFill(t, plankPal, { freq: 0.20, octaves: 2, seed, contrast: 1.15, period: 16 });
  // seam lines between planks (at y=4,8,12)
  const seamRows = [4, 8, 12];
  for (const sy of seamRows) {
    for (let x = 0; x < 16; x++) {
      Px.setPx(t, x, sy, seamCol, 0.85);
      Px.setPx(t, x, sy - 1, Px.shade(seamCol, 1.25), 0.40);
    }
  }
  // per-plank shade variation and horizontal grain
  const plankY = [0, 5, 9, 13];
  const plankH = [4, 4, 4, 3];
  for (let pi = 0; pi < 4; pi++) {
    const py = plankY[pi];
    const ph = plankH[pi];
    const shadeF = 0.92 + WOOD_h2(pi, 7, seed) * 0.16;
    for (let y = py; y < py + ph; y++) {
      for (let x = 0; x < 16; x++) {
        const c = Px.getPx(t, x, y);
        if (c[3] > 0) Px.setPx(t, x, y, Px.shade(c, shadeF));
      }
    }
    // horizontal grain streaks within each plank
    Px.streaks(t, grainPal, {
      vertical: false, density: 0.45, seed: seed + pi * 37, minLen: 3, maxLen: 8,
      alpha: 0.55,
    });
    // 1-2 dark nail dots per plank (staggered x to avoid barcode look)
    const nails = 1 + ((WOOD_h2(pi, 3, seed) > 0.5) ? 1 : 0);
    for (let ni = 0; ni < nails; ni++) {
      const nx = 2 + ((WOOD_h2(pi, ni + 10, seed) * 12) | 0);
      const nailRow = py + 1 + ((WOOD_h2(pi, ni + 20, seed) * (ph - 2)) | 0);
      Px.setPx(t, nx, nailRow, seamCol, 0.90);
      Px.setPx(t, nx, nailRow + 1, Px.shade(seamCol, 1.30), 0.45);
    }
  }
  Px.edgeShade(t, 0.92);
}

// ---- shared leaves painter ---------------------------------------------------
// Paints greyscale leaf clusters with alpha-0 gaps, then toGrey.
// silhouette: 'round' | 'airy' | 'spiky' | 'broad' | 'flat' | 'dense'
function WOOD_paintLeaves(t, seed, silhouette) {
  Px.clear(t);

  // 1) Generate cluster centres based on silhouette
  const clusters = [];
  if (silhouette === 'round') {
    // oak: 10-12 overlapping rounded clusters, centre-heavy
    clusters.push({ x: 8, y: 8, rx: 4, ry: 3.5 });
    clusters.push({ x: 5, y: 6, rx: 3, ry: 2.5 });
    clusters.push({ x: 11, y: 6, rx: 3, ry: 2.5 });
    clusters.push({ x: 4, y: 10, rx: 2.5, ry: 2 });
    clusters.push({ x: 12, y: 10, rx: 2.5, ry: 2 });
    clusters.push({ x: 8, y: 4, rx: 2.5, ry: 2 });
    clusters.push({ x: 8, y: 12, rx: 2.5, ry: 2 });
    clusters.push({ x: 6, y: 13, rx: 2, ry: 1.8 });
    clusters.push({ x: 10, y: 13, rx: 2, ry: 1.8 });
    clusters.push({ x: 3, y: 7, rx: 1.8, ry: 1.5 });
    clusters.push({ x: 13, y: 7, rx: 1.8, ry: 1.5 });
  } else if (silhouette === 'airy') {
    // birch: lighter, fewer clusters, gaps
    clusters.push({ x: 8, y: 7, rx: 3, ry: 2.5 });
    clusters.push({ x: 5, y: 5, rx: 2.5, ry: 2 });
    clusters.push({ x: 11, y: 5, rx: 2.5, ry: 2 });
    clusters.push({ x: 4, y: 11, rx: 2, ry: 1.8 });
    clusters.push({ x: 12, y: 11, rx: 2, ry: 1.8 });
    clusters.push({ x: 8, y: 12, rx: 2, ry: 1.6 });
    clusters.push({ x: 7, y: 3, rx: 1.8, ry: 1.5 });
    clusters.push({ x: 11, y: 13, rx: 1.5, ry: 1.2 });
  } else if (silhouette === 'spiky') {
    // spruce: needle triangles, spiky tips
    clusters.push({ x: 8, y: 4, rx: 1.5, ry: 3.5 });
    clusters.push({ x: 5, y: 6, rx: 1.2, ry: 3.0 });
    clusters.push({ x: 11, y: 6, rx: 1.2, ry: 3.0 });
    clusters.push({ x: 3, y: 9, rx: 1.5, ry: 2.5 });
    clusters.push({ x: 13, y: 9, rx: 1.5, ry: 2.5 });
    clusters.push({ x: 7, y: 10, rx: 2.0, ry: 2.0 });
    clusters.push({ x: 9, y: 10, rx: 2.0, ry: 2.0 });
    clusters.push({ x: 8, y: 13, rx: 3.5, ry: 1.5 });
    clusters.push({ x: 5, y: 13, rx: 1.5, ry: 1.2 });
    clusters.push({ x: 11, y: 13, rx: 1.5, ry: 1.2 });
  } else if (silhouette === 'broad') {
    // jungle: big broad clusters covering most of tile
    clusters.push({ x: 8, y: 8, rx: 5, ry: 4.5 });
    clusters.push({ x: 4, y: 5, rx: 3.5, ry: 3 });
    clusters.push({ x: 12, y: 5, rx: 3.5, ry: 3 });
    clusters.push({ x: 4, y: 11, rx: 3, ry: 2.5 });
    clusters.push({ x: 12, y: 11, rx: 3, ry: 2.5 });
    clusters.push({ x: 8, y: 3, rx: 3, ry: 2 });
    clusters.push({ x: 8, y: 13, rx: 3, ry: 2 });
    clusters.push({ x: 2, y: 8, rx: 2, ry: 2 });
    clusters.push({ x: 14, y: 8, rx: 2, ry: 2 });
  } else if (silhouette === 'flat') {
    // acacia: flat-topped sparse, biased to top half
    clusters.push({ x: 4, y: 5, rx: 3.5, ry: 1.8 });
    clusters.push({ x: 12, y: 5, rx: 3.5, ry: 1.8 });
    clusters.push({ x: 8, y: 4, rx: 4, ry: 1.8 });
    clusters.push({ x: 3, y: 9, rx: 2.5, ry: 1.5 });
    clusters.push({ x: 13, y: 9, rx: 2.5, ry: 1.5 });
    clusters.push({ x: 7, y: 12, rx: 2, ry: 1.4 });
    clusters.push({ x: 11, y: 12, rx: 2, ry: 1.4 });
  } else {
    // dark_oak: very dense
    clusters.push({ x: 8, y: 8, rx: 5, ry: 5 });
    clusters.push({ x: 4, y: 4, rx: 3.5, ry: 3.5 });
    clusters.push({ x: 12, y: 4, rx: 3.5, ry: 3.5 });
    clusters.push({ x: 4, y: 12, rx: 3.5, ry: 3.5 });
    clusters.push({ x: 12, y: 12, rx: 3.5, ry: 3.5 });
    clusters.push({ x: 8, y: 3, rx: 3, ry: 2 });
    clusters.push({ x: 8, y: 13, rx: 3, ry: 2 });
    clusters.push({ x: 2, y: 8, rx: 2, ry: 3 });
    clusters.push({ x: 14, y: 8, rx: 2, ry: 3 });
    clusters.push({ x: 5, y: 7, rx: 2.5, ry: 2.5 });
    clusters.push({ x: 11, y: 7, rx: 2.5, ry: 2.5 });
    clusters.push({ x: 7, y: 11, rx: 2.5, ry: 2.5 });
    clusters.push({ x: 10, y: 11, rx: 2.5, ry: 2.5 });
  }

  // 2) Paint clusters with per-cluster luma variation
  for (let ci = 0; ci < clusters.length; ci++) {
    const { x, y, rx, ry } = clusters[ci];
    // per-cluster luma: 130..200 range (stays in 110-210 target)
    const luma = (140 + (WOOD_h2(ci, 7, seed) * 60)) | 0;
    const lumaD = Math.max(100, luma - 30);
    const lumaL = Math.min(220, luma + 20);
    for (let py = Math.floor(y - ry - 0.5); py <= Math.ceil(y + ry + 0.5); py++) {
      for (let px = Math.floor(x - rx - 0.5); px <= Math.ceil(x + rx + 0.5); px++) {
        if (px < 0 || py < 0 || px >= 16 || py >= 16) continue;
        const ddx = (px - x) / rx, ddy = (py - y) / ry;
        const dist = ddx * ddx + ddy * ddy;
        if (dist <= 1.0) {
          // noise for luma variation within cluster
          const n = Px.fbm(px, py, 0.45, 2, seed + ci * 29);
          const lv = (dist < 0.5) ? (lumaD + (n * (lumaL - lumaD)) | 0) : (lumaD + ((dist - 0.5) * 2 * (lumaD - 80) + n * 20) | 0);
          const lc = Math.max(90, Math.min(215, lv));
          Px.setPx(t, px, py, [lc, lc, lc, 255]);
        }
      }
    }
  }

  // 3) Dark separations between clusters — draw dark lines along seams
  for (let ci = 0; ci < clusters.length - 1; ci++) {
    for (let cj = ci + 1; cj < clusters.length; cj++) {
      const a = clusters[ci], b = clusters[cj];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 6) {
        // paint 1-2 dark pixels along the seam midpoint
        const mx = ((a.x + b.x) / 2) | 0, my = ((a.y + b.y) / 2) | 0;
        const cur = Px.getPx(t, mx, my);
        if (cur[3] > 0) {
          Px.setPx(t, mx, my, [Math.max(85, cur[0] - 40), Math.max(85, cur[1] - 40), Math.max(85, cur[2] - 40), 255]);
        }
      }
    }
  }

  // 4) Punch alpha-0 holes at gaps and border
  // Count opaque pixels first to decide density
  let opaqueCount = 0;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (Px.getPx(t, x, y)[3] > 0) opaqueCount++;
    }
  }
  // punch holes in border regions and cluster gap areas
  let holesNeeded = silhouette === 'airy' ? 40 : silhouette === 'flat' ? 35 : silhouette === 'spiky' ? 38 : 28;
  let holesPlaced = 0;
  // border holes
  for (let y = 0; y < 16 && holesPlaced < holesNeeded; y++) {
    for (let x = 0; x < 16 && holesPlaced < holesNeeded; x++) {
      if (Px.getPx(t, x, y)[3] === 0) continue;
      const e = Math.min(x, y, 15 - x, 15 - y);
      // punch holes near border if luma is light (gap-like)
      if (e <= 1) {
        const n = WOOD_h2(x, y, seed + 777);
        if (n < 0.50) {
          const i = (y * 16 + x) * 4;
          t.data[i + 3] = 0;
          holesPlaced++;
        }
      }
    }
  }
  // Additional interior gap holes near cluster seams
  for (let y = 0; y < 16 && holesPlaced < holesNeeded; y++) {
    for (let x = 0; x < 16 && holesPlaced < holesNeeded; x++) {
      if (Px.getPx(t, x, y)[3] === 0) continue;
      const n = WOOD_h2(x, y, seed + 888);
      const n2 = Px.fbm(x, y, 0.35, 2, seed + 999);
      if (n < 0.08 && n2 < 0.35) {
        const i = (y * 16 + x) * 4;
        t.data[i + 3] = 0;
        holesPlaced++;
      }
    }
  }

  // 5) Convert to greyscale with lift
  Px.toGrey(t, { lift: 1.05 });
}

export function registerWoodTiles(A, C) {

  // ---- OAK ----------------------------------------------------------------

  // oak_log — medium brown vertical bark strips with dark fissures
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('oak_log');
    WOOD_paintLogSide(t, WOOD_OAK_BARK, WOOD_OAK_FISS, s);
    Px.edgeShade(t, 0.92);
    A.add('oak_log', t, { wrap: false });
  }

  // oak_log_top — concentric growth rings, tan, bark rim
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('oak_log_top');
    WOOD_paintLogTop(t, WOOD_OAK_RING, WOOD_OAK_BARK[0], s);
    A.add('oak_log_top', t);
  }

  // oak_planks — 4 horizontal planks, warm tan, wood grain, seams, nail dots
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('oak_planks');
    WOOD_paintPlanks(t, WOOD_OAK_PLANK, WOOD_OAK_FISS, [WOOD_OAK_PLANK[0], WOOD_OAK_PLANK[1]], s);
    A.add('oak_planks', t);
  }

  // oak_leaves — greyscale dense leaf clusters with alpha gaps
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('oak_leaves');
    WOOD_paintLeaves(t, s, 'round');
    A.add('oak_leaves', t, { wrap: false });
  }

  // ---- BIRCH --------------------------------------------------------------

  // birch_log — white bark with black horizontal dashes and knots
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('birch_log');
    WOOD_paintLogSide(t, WOOD_BIRCH_BARK, WOOD_BIRCH_DASH, s);
    // black horizontal dashes
    const dashCount = 3 + ((WOOD_h2(s, 1, 42) * 3) | 0);
    for (let di = 0; di < dashCount; di++) {
      const dy = 1 + ((WOOD_h2(di, 0, s + 500) * 14) | 0);
      const dx = 1 + ((WOOD_h2(di, 1, s + 500) * 10) | 0);
      const dlen = 2 + ((WOOD_h2(di, 2, s + 500) * 5) | 0);
      for (let k = 0; k < dlen; k++) {
        Px.setPx(t, dx + k, dy, WOOD_BIRCH_DASH, 0.90);
        if (k === 0 || k === dlen - 1) {
          Px.setPx(t, dx + k, dy - 1, WOOD_BIRCH_DASH, 0.55);
          Px.setPx(t, dx + k, dy + 1, WOOD_BIRCH_DASH, 0.45);
        }
      }
    }
    // knot: dark oval
    const kx = 2 + ((WOOD_h2(s, 5, 61) * 12) | 0);
    const ky = 3 + ((WOOD_h2(s, 6, 61) * 10) | 0);
    Px.ellipse(t, kx, ky, 2.2, 1.5, WOOD_BIRCH_DASH, 0.80);
    Px.ellipse(t, kx, ky, 1.0, 0.7, Px.shade(WOOD_BIRCH_BARK[0], 0.75), 0.70);
    Px.edgeShade(t, 0.92);
    A.add('birch_log', t, { wrap: false });
  }

  // birch_log_top — pale cream rings
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('birch_log_top');
    WOOD_paintLogTop(t, WOOD_BIRCH_RING, WOOD_BIRCH_BARK[1], s);
    A.add('birch_log_top', t);
  }

  // birch_planks — very pale cream planks, fine grain
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('birch_planks');
    WOOD_paintPlanks(t, WOOD_BIRCH_PLANK, Px.shade(WOOD_BIRCH_BARK[1], 0.70), [WOOD_BIRCH_PLANK[0], WOOD_BIRCH_PLANK[1]], s);
    A.add('birch_planks', t);
  }

  // birch_leaves — greyscale lighter airier leaf clusters
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('birch_leaves');
    WOOD_paintLeaves(t, s, 'airy');
    A.add('birch_leaves', t, { wrap: false });
  }

  // ---- SPRUCE -------------------------------------------------------------

  // spruce_log — dark grey-brown bark, deep vertical fissures
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('spruce_log');
    WOOD_paintLogSide(t, WOOD_SPRUCE_BARK, WOOD_SPRUCE_FISS, s);
    Px.edgeShade(t, 0.90);
    A.add('spruce_log', t, { wrap: false });
  }

  // spruce_log_top — dark brown tight rings
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('spruce_log_top');
    WOOD_paintLogTop(t, WOOD_SPRUCE_RING, WOOD_SPRUCE_BARK[0], s);
    A.add('spruce_log_top', t);
  }

  // spruce_planks — dark chocolate planks, strong grain
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('spruce_planks');
    WOOD_paintPlanks(t, WOOD_SPRUCE_PLANK, WOOD_SPRUCE_FISS, [WOOD_SPRUCE_PLANK[0], WOOD_SPRUCE_PLANK[1]], s);
    A.add('spruce_planks', t);
  }

  // spruce_leaves — greyscale needle clusters, spiky silhouette
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('spruce_leaves');
    WOOD_paintLeaves(t, s, 'spiky');
    A.add('spruce_leaves', t, { wrap: false });
  }

  // ---- JUNGLE -------------------------------------------------------------

  // jungle_log — olive-brown bark with mossy patches
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('jungle_log');
    WOOD_paintLogSide(t, WOOD_JUNGLE_BARK, WOOD_JUNGLE_FISS, s);
    // mossy green patches
    const mossPal = Px.ramp('#486828', 3, 0.65, 1.20);
    Px.speckle(t, mossPal, { density: 0.08, seed: s + 700 });
    Px.edgeShade(t, 0.92);
    A.add('jungle_log', t, { wrap: false });
  }

  // jungle_log_top — orange-tan rings
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('jungle_log_top');
    WOOD_paintLogTop(t, WOOD_JUNGLE_RING, WOOD_JUNGLE_BARK[0], s);
    A.add('jungle_log_top', t);
  }

  // jungle_planks — reddish-orange planks
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('jungle_planks');
    WOOD_paintPlanks(t, WOOD_JUNGLE_PLANK, WOOD_JUNGLE_FISS, [WOOD_JUNGLE_PLANK[0], WOOD_JUNGLE_PLANK[1]], s);
    A.add('jungle_planks', t);
  }

  // jungle_leaves — greyscale big broad leaves, dense
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('jungle_leaves');
    WOOD_paintLeaves(t, s, 'broad');
    A.add('jungle_leaves', t, { wrap: false });
  }

  // ---- ACACIA -------------------------------------------------------------

  // acacia_log — grey bark with orange under-tones, cracked plates
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('acacia_log');
    WOOD_paintLogSide(t, WOOD_ACACIA_BARK, WOOD_ACACIA_FISS, s);
    // orange-brown underbark seeping through cracks
    Px.speckle(t, [WOOD_ACACIA_RING[1], WOOD_ACACIA_RING[2]], { density: 0.06, seed: s + 800 });
    Px.edgeShade(t, 0.92);
    A.add('acacia_log', t, { wrap: false });
  }

  // acacia_log_top — orange-red rings
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('acacia_log_top');
    WOOD_paintLogTop(t, WOOD_ACACIA_RING, WOOD_ACACIA_BARK[0], s);
    A.add('acacia_log_top', t);
  }

  // acacia_planks — orange planks
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('acacia_planks');
    WOOD_paintPlanks(t, WOOD_ACACIA_PLANK, WOOD_ACACIA_FISS, [WOOD_ACACIA_PLANK[0], WOOD_ACACIA_PLANK[1]], s);
    A.add('acacia_planks', t);
  }

  // acacia_leaves — greyscale flat-topped sparse leaves
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('acacia_leaves');
    WOOD_paintLeaves(t, s, 'flat');
    A.add('acacia_leaves', t, { wrap: false });
  }

  // ---- DARK OAK -----------------------------------------------------------

  // dark_oak_log — very dark brown bark, coarse plates
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('dark_oak_log');
    WOOD_paintLogSide(t, WOOD_DARKOAK_BARK, WOOD_DARKOAK_FISS, s);
    Px.edgeShade(t, 0.90);
    A.add('dark_oak_log', t, { wrap: false });
  }

  // dark_oak_log_top — dark rings
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('dark_oak_log_top');
    WOOD_paintLogTop(t, WOOD_DARKOAK_RING, WOOD_DARKOAK_BARK[0], s);
    A.add('dark_oak_log_top', t);
  }

  // dark_oak_planks — deep brown planks
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('dark_oak_planks');
    WOOD_paintPlanks(t, WOOD_DARKOAK_PLANK, WOOD_DARKOAK_FISS, [WOOD_DARKOAK_PLANK[0], WOOD_DARKOAK_PLANK[1]], s);
    A.add('dark_oak_planks', t);
  }

  // dark_oak_leaves — greyscale very dark dense leaves
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('dark_oak_leaves');
    WOOD_paintLeaves(t, s, 'dense');
    A.add('dark_oak_leaves', t, { wrap: false });
  }

  // ---- BOOKSHELF ----------------------------------------------------------

  // bookshelf — plank frame top/bottom with two shelves of multicoloured book spines
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('bookshelf');
    // plank frame (top 2 rows, bottom 2 rows)
    Px.noiseFill(t, WOOD_OAK_PLANK, { freq: 0.22, octaves: 2, seed: s, contrast: 1.10, period: 16 });
    // dark seam at rows 2, 13
    for (let x = 0; x < 16; x++) {
      Px.setPx(t, x, 2, WOOD_OAK_FISS, 0.80);
      Px.setPx(t, x, 13, WOOD_OAK_FISS, 0.80);
    }
    // shelf 1: y 3-7 (5 rows)
    // shelf 2: y 8-12 (5 rows)
    const shelfBg = Px.shade(WOOD_OAK_PLANK[0], 0.55);
    Px.rect(t, 0, 3, 16, 5, shelfBg);
    Px.rect(t, 0, 8, 16, 5, shelfBg);

    // book colours
    const WOOD_BOOK_COLS = [
      '#c83030', '#3060c8', '#30a030', '#c89030', '#9030c8',
      '#c85030', '#308098', '#a0a000', '#c03080', '#30c870',
    ];
    // shelf 1 books
    let bx = 1;
    for (let bi = 0; bi < 7 && bx < 15; bi++) {
      const bw = 1 + ((WOOD_h2(bi, 0, s + 1000) * 2.5) | 0);
      const bh = 3 + ((WOOD_h2(bi, 1, s + 1000) * 2) | 0);
      const bc = WOOD_BOOK_COLS[(bi * 3 + 1) % WOOD_BOOK_COLS.length];
      const by = 3 + (5 - bh);
      Px.rect(t, bx, by, bw, bh, bc);
      // spine highlight
      Px.vLine(t, bx, by, bh, Px.shade(bc, 1.35), 0.55);
      // spine shadow
      if (bw > 1) Px.vLine(t, bx + bw - 1, by, bh, Px.shade(bc, 0.65), 0.60);
      bx += bw + 1;
    }
    // shelf 2 books
    bx = 1;
    for (let bi = 0; bi < 7 && bx < 15; bi++) {
      const bw = 1 + ((WOOD_h2(bi, 0, s + 2000) * 2.5) | 0);
      const bh = 3 + ((WOOD_h2(bi, 1, s + 2000) * 2) | 0);
      const bc = WOOD_BOOK_COLS[(bi * 5 + 3) % WOOD_BOOK_COLS.length];
      const by = 8 + (5 - bh);
      Px.rect(t, bx, by, bw, bh, bc);
      Px.vLine(t, bx, by, bh, Px.shade(bc, 1.35), 0.55);
      if (bw > 1) Px.vLine(t, bx + bw - 1, by, bh, Px.shade(bc, 0.65), 0.60);
      bx += bw + 1;
    }
    Px.edgeShade(t, 0.92);
    A.add('bookshelf', t, { wrap: false });
  }

  // ---- CRAFTING TABLE -----------------------------------------------------

  // crafting_table_top — plank surface with 2x2 grid of dark tool-marked squares
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('crafting_table_top');
    WOOD_paintPlanks(t, WOOD_OAK_PLANK, WOOD_OAK_FISS, [WOOD_OAK_PLANK[0], WOOD_OAK_PLANK[1]], s);
    // 2x2 grid of dark tool-mark squares (each 6x6 with 1px gap)
    const gridCols = [Px.shade(WOOD_OAK_PLANK[0], 0.60), Px.shade(WOOD_OAK_PLANK[1], 0.65)];
    const offsets = [[1, 1], [9, 1], [1, 9], [9, 9]];
    for (let gi = 0; gi < 4; gi++) {
      const [gx, gy] = offsets[gi];
      Px.rect(t, gx, gy, 6, 6, gridCols[gi % 2], 0.70);
      // wear lines inside each square
      const wc = Px.shade(gridCols[gi % 2], 0.65);
      Px.line(t, gx + 1, gy + 1, gx + 4, gy + 3, wc, 0.55);
      Px.line(t, gx + 2, gy + 4, gx + 5, gy + 2, wc, 0.45);
      // top-left highlight
      Px.hLine(t, gx, gy, 6, Px.shade(gridCols[gi % 2], 1.28), 0.45);
    }
    Px.edgeShade(t, 0.92);
    A.add('crafting_table_top', t);
  }

  // crafting_table_side — planks with a saw and hammer silhouette
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('crafting_table_side');
    WOOD_paintPlanks(t, WOOD_OAK_PLANK, WOOD_OAK_FISS, [WOOD_OAK_PLANK[0], WOOD_OAK_PLANK[1]], s);
    // saw silhouette (right side): a diagonal blade with teeth
    const sawCol = [160, 160, 165, 255];
    const sawDark = [100, 100, 105, 255];
    // saw blade — diagonal from top-right area going down-left
    Px.line(t, 10, 2, 14, 12, sawCol, 0.90);
    Px.line(t, 11, 2, 15, 12, sawDark, 0.70);
    // saw teeth (3 notches)
    for (let ti = 0; ti < 3; ti++) {
      const tx = 10 + ti + ((ti * 1.5) | 0);
      const ty = 2 + (ti * 3);
      Px.setPx(t, tx + 1, ty + 1, [80, 80, 85, 255], 0.85);
    }
    // hammer silhouette (left side)
    const hamCol = [130, 110, 90, 255];
    const hamDark = [80, 65, 50, 255];
    // handle
    Px.line(t, 3, 8, 5, 14, hamCol, 0.88);
    Px.line(t, 4, 8, 6, 14, hamDark, 0.65);
    // head
    Px.rect(t, 1, 4, 6, 4, hamCol);
    Px.rectOutline(t, 1, 4, 6, 4, hamDark, 0.75);
    Px.hLine(t, 1, 4, 6, Px.shade(hamCol, 1.30), 0.55);
    Px.edgeShade(t, 0.92);
    A.add('crafting_table_side', t, { wrap: false });
  }

  // crafting_table_front — planks with drawer line, knob, grid marks
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('crafting_table_front');
    WOOD_paintPlanks(t, WOOD_OAK_PLANK, WOOD_OAK_FISS, [WOOD_OAK_PLANK[0], WOOD_OAK_PLANK[1]], s);
    // drawer line at y=10 (horizontal indent)
    for (let x = 1; x < 15; x++) {
      Px.setPx(t, x, 10, WOOD_OAK_FISS, 0.80);
      Px.setPx(t, x, 11, Px.shade(WOOD_OAK_PLANK[3], 1.18), 0.45);
    }
    // knob at centre
    Px.setPx(t, 7, 10, [100, 80, 60, 255]);
    Px.setPx(t, 8, 10, [100, 80, 60, 255]);
    Px.setPx(t, 7, 9, [140, 120, 95, 255], 0.60);
    // grid marks (etched lines, tool reference)
    const gridMarkCol = Px.shade(WOOD_OAK_PLANK[1], 0.70);
    Px.vLine(t, 5, 2, 7, gridMarkCol, 0.55);
    Px.vLine(t, 10, 2, 7, gridMarkCol, 0.55);
    Px.hLine(t, 2, 5, 12, gridMarkCol, 0.50);
    Px.edgeShade(t, 0.92);
    A.add('crafting_table_front', t, { wrap: false });
  }

  // ---- HAY BLOCK ----------------------------------------------------------

  // hay_block_top — radial straw stalk cross-section + twine ring
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('hay_block_top');
    const WOOD_HAY_PAL = Px.ramp('#c8a830', 5, 0.65, 1.25);
    const WOOD_HAY_DARK = Px.shade('#c8a830', 0.52);
    // base fill
    Px.noiseFill(t, WOOD_HAY_PAL, { freq: 0.28, octaves: 2, seed: s, contrast: 1.20, period: 16 });
    // radial straw lines emanating from centre
    const cx = 7.5, cy = 7.5;
    const strawCount = 18;
    for (let si = 0; si < strawCount; si++) {
      const angle = (si / strawCount) * Math.PI * 2;
      const sc = WOOD_HAY_PAL[1 + ((WOOD_h2(si, 0, s + 1200) * 3) | 0)];
      const rLen = 5 + WOOD_h2(si, 1, s + 1200) * 3;
      for (let r = 0.5; r < rLen; r += 0.5) {
        const px = (cx + Math.cos(angle) * r) | 0;
        const py = (cy + Math.sin(angle) * r) | 0;
        Px.setPx(t, px, py, sc, 0.75);
      }
    }
    // dark centre void
    Px.ellipse(t, 8, 8, 1.5, 1.5, WOOD_HAY_DARK, 0.80);
    // twine ring (dark brown circle)
    const twineCol = [120, 80, 30, 255];
    Px.circleOutline(t, 8, 8, 5.5, twineCol, 0.85);
    Px.circleOutline(t, 8, 8, 5.0, Px.shade(twineCol, 0.70), 0.60);
    Px.edgeShade(t, 0.92);
    A.add('hay_block_top', t);
  }

  // hay_block_side — horizontal straw bundle with two twine bands
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('hay_block_side');
    const WOOD_HAY_SIDE_PAL = Px.ramp('#c8a030', 5, 0.62, 1.28);
    const WOOD_HAY_SIDE_DARK = Px.shade('#c8a030', 0.52);
    // horizontal straw streaks
    Px.noiseFill(t, WOOD_HAY_SIDE_PAL, { freq: 0.25, octaves: 2, seed: s, contrast: 1.15, period: 16 });
    Px.streaks(t, [WOOD_HAY_SIDE_PAL[0], WOOD_HAY_SIDE_PAL[1], WOOD_HAY_SIDE_PAL[2]],
      { vertical: false, density: 0.60, seed: s + 100, minLen: 4, maxLen: 14, alpha: 0.65 });
    // individual straw tip dots at sides
    for (let i = 0; i < 10; i++) {
      const sy = 1 + ((WOOD_h2(i, 0, s + 1300) * 14) | 0);
      const ofs = ((WOOD_h2(i, 1, s + 1300) * 2) | 0);
      Px.setPx(t, ofs, sy, WOOD_HAY_SIDE_PAL[4], 0.70);
      Px.setPx(t, 15 - ofs, sy, WOOD_HAY_SIDE_PAL[4], 0.70);
    }
    // two twine bands at x=4 and x=11
    const twineSide = [90, 60, 20, 255];
    for (let y = 0; y < 16; y++) {
      Px.setPx(t, 4, y, twineSide, 0.90);
      Px.setPx(t, 5, y, Px.shade(twineSide, 1.25), 0.55);
      Px.setPx(t, 11, y, twineSide, 0.90);
      Px.setPx(t, 12, y, Px.shade(twineSide, 1.25), 0.55);
    }
    Px.edgeShade(t, 0.92);
    A.add('hay_block_side', t, { wrap: false });
  }

}
