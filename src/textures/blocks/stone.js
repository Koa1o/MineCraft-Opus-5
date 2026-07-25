// stone.js — procedural stone/mineral block textures
// All top-level names prefixed with STONE_ to ensure global uniqueness.
import { Px } from '../px.js';

// ---- palettes --------------------------------------------------------------

// stone
const STONE_STONE_PAL = Px.ramp('#8a8a8a', 5, 0.68, 1.22);

// cobblestone
const STONE_COBB_PAL = Px.ramp('#7e7e7e', 5, 0.58, 1.28);

// mossy cobblestone (base same as cobb)
const STONE_MCOBB_PAL = Px.ramp('#7a8060', 5, 0.60, 1.22);
const STONE_MOSS_PAL = Px.ramp('#4a6830', 4, 0.65, 1.30);

// stone bricks
const STONE_SBRICK_PAL = Px.ramp('#888888', 4, 0.68, 1.18);
const STONE_SBRICK_MORTAR = '#4a4a4a';

// deepslate
const STONE_DS_PAL = Px.ramp('#2e3240', 5, 0.60, 1.35);

// cobbled deepslate
const STONE_CDS_PAL = Px.ramp('#303442', 5, 0.55, 1.28);

// deepslate bricks
const STONE_DSB_PAL = Px.ramp('#282c38', 4, 0.62, 1.25);

// andesite
const STONE_ANDE_PAL = Px.ramp('#7a7a7a', 5, 0.60, 1.28);

// granite
const STONE_GRAN_PAL = Px.ramp('#9e7060', 5, 0.65, 1.25);

// diorite
const STONE_DIOR_PAL = Px.ramp('#d0d0d0', 5, 0.68, 1.20);

// tuff
const STONE_TUFF_PAL = Px.ramp('#707848', 5, 0.65, 1.22);

// calcite
const STONE_CALC_PAL = Px.ramp('#d8d0c0', 5, 0.80, 1.15);

// bricks
const STONE_BRICK_PAL = Px.ramp('#9a4838', 4, 0.68, 1.22);
const STONE_BRICK_MORTAR = '#c0b090';

// obsidian
const STONE_OBS_PAL = Px.ramp('#1a0830', 5, 0.55, 1.40);

// crying obsidian (magenta veins)
const STONE_COBS_PAL = Px.ramp('#1a0830', 5, 0.55, 1.40);

// bedrock
const STONE_BED_PALS = [
  Px.ramp('#3c3c3c', 3, 0.45, 1.10),
  Px.ramp('#282828', 3, 0.40, 1.00),
  Px.ramp('#505050', 3, 0.55, 1.15),
];

// coal block
const STONE_COAL_PAL = Px.ramp('#1a1a1e', 5, 0.50, 1.40);

// iron block
const STONE_IRON_PAL = Px.ramp('#c8c8cc', 5, 0.72, 1.22);

// gold block
const STONE_GOLD_PAL = Px.ramp('#e8c000', 5, 0.65, 1.35);

// diamond block
const STONE_DIAM_PAL = Px.ramp('#40d0e0', 5, 0.68, 1.32);

// emerald block
const STONE_EMER_PAL = Px.ramp('#18a848', 5, 0.62, 1.35);

// lapis block
const STONE_LAPIS_PAL = Px.ramp('#183898', 5, 0.58, 1.38);

// redstone block
const STONE_REDS_PAL = Px.ramp('#b80000', 5, 0.60, 1.30);

// copper block
const STONE_COPP_PAL = Px.ramp('#c06030', 5, 0.65, 1.30);

// netherite block
const STONE_NETH_PAL = Px.ramp('#2a1820', 5, 0.55, 1.40);

// quartz block
const STONE_QRTZ_PAL = Px.ramp('#e8e4e0', 5, 0.80, 1.15);

// prismarine
const STONE_PRIS_PAL = Px.ramp('#4a9080', 5, 0.65, 1.25);

// prismarine bricks
const STONE_PBRICK_PAL = Px.ramp('#4a8878', 4, 0.68, 1.20);

// dark prismarine
const STONE_DPRIS_PAL = Px.ramp('#1e4840', 5, 0.58, 1.30);

// ---- pure deterministic hash -----------------------------------------------
function STONE_h2(x, y, s) {
  let v = (x * 1619 + y * 31337 + s * 1234567) | 0;
  v = (v ^ (v >>> 13)) * 0x45d9f3b;
  v = (v ^ (v >>> 15));
  return (v >>> 0) / 0xffffffff;
}

// ---- small helper: draw a hairline crack -----------------------------------
function STONE_crack(t, x0, y0, len, seed, col, alpha) {
  let cx = x0, cy = y0;
  for (let i = 0; i < len; i++) {
    Px.setPx(t, cx, cy, col, alpha);
    const dir = Math.floor(STONE_h2(i, seed, seed + 7) * 4);
    if (dir === 0) cx++;
    else if (dir === 1) cx--;
    else if (dir === 2) cy++;
    else cy--;
    cx = Math.max(0, Math.min(15, cx));
    cy = Math.max(0, Math.min(15, cy));
  }
}

// ---- metal plate helper: raised centre, rivets, bevel highlights -----------
function STONE_metalPlate(t, pal, seed, plateInset) {
  // base
  Px.noiseFill(t, pal, { freq: 0.20, octaves: 2, seed, contrast: 0.90, period: 16 });
  const inset = plateInset || 3;
  // raised centre plate
  for (let y = inset; y < 16 - inset; y++) {
    for (let x = inset; x < 16 - inset; x++) {
      const n = Px.fbm(x, y, 0.25, 2, seed + 5, 16);
      const idx = Math.min(Math.floor(n * pal.length), pal.length - 1);
      Px.setPx(t, x, y, Px.shade(pal[idx], 1.08));
    }
  }
  // top-left bevel highlight
  Px.hLine(t, inset, inset, 16 - inset * 2, Px.shade(pal[pal.length - 1], 1.22), 0.65);
  Px.vLine(t, inset, inset, 16 - inset * 2, Px.shade(pal[pal.length - 1], 1.18), 0.55);
  // bottom-right shadow
  Px.hLine(t, inset, 15 - inset, 16 - inset * 2, Px.shade(pal[0], 0.72), 0.65);
  Px.vLine(t, 15 - inset, inset, 16 - inset * 2, Px.shade(pal[0], 0.75), 0.55);
  // rivet dots at corners of plate
  const rv = [[inset, inset], [15 - inset, inset], [inset, 15 - inset], [15 - inset, 15 - inset]];
  for (const [rx, ry] of rv) {
    Px.setPx(t, rx, ry, Px.shade(pal[pal.length - 1], 1.30));
    Px.setPx(t, rx, ry + 1, Px.shade(pal[0], 0.65));
  }
}

// ---- gem lattice helper: 4 cut gems (2x2 grid) with facets + sparkle ------
function STONE_gemLattice(t, pal, seed) {
  // dark base
  Px.noiseFill(t, [pal[0], pal[1]], { freq: 0.28, octaves: 2, seed, contrast: 1.3, period: 16 });
  const offsets = [[2, 2], [9, 2], [2, 9], [9, 9]];
  for (let gi = 0; gi < 4; gi++) {
    const [ox, oy] = offsets[gi];
    const size = 5;
    // fill gem face
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const lit = 1.0 - (dx + dy) / (size * 1.8);
        const idx = Math.min(Math.floor(lit * pal.length), pal.length - 1);
        Px.setPx(t, ox + dx, oy + dy, pal[idx]);
      }
    }
    // outline
    Px.rectOutline(t, ox, oy, size, size, Px.shade(pal[0], 0.58));
    // internal facet lines
    Px.line(t, ox, oy, ox + size - 1, oy + size - 1, Px.shade(pal[0], 0.65), 0.6);
    Px.line(t, ox + size - 1, oy, ox, oy + size - 1, Px.shade(pal[0], 0.65), 0.5);
    // top-left highlight
    Px.hLine(t, ox + 1, oy + 1, size - 2, Px.shade(pal[pal.length - 1], 1.28), 0.65);
    Px.vLine(t, ox + 1, oy + 1, size - 2, Px.shade(pal[pal.length - 1], 1.22), 0.55);
    // sparkle pixel
    Px.setPx(t, ox + 1, oy + 1, [255, 255, 255, 255]);
  }
}

export function registerStoneTiles(A, C) {

  // stone — grey stone, fbm mottle, 5 shades, hairline cracks
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('stone');
    Px.noiseFill(t, STONE_STONE_PAL, { freq: 0.28, octaves: 3, seed: s, contrast: 1.25, period: 16 });
    STONE_crack(t, 4, 2, 5, s + 1, Px.shade(STONE_STONE_PAL[0], 0.65), 0.75);
    STONE_crack(t, 10, 9, 4, s + 2, Px.shade(STONE_STONE_PAL[0], 0.65), 0.70);
    Px.edgeShade(t, 0.90);
    A.add('stone', t);
  }

  // cobblestone — irregular voronoi chunks, dark mortar seams, per-chunk shading
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('cobblestone');
    Px.stoneChunks(t, STONE_COBB_PAL, { cell: 5, seed: s, seam: '#303030', jitter: 0.82 });
    Px.edgeShade(t, 0.90);
    A.add('cobblestone', t);
  }

  // mossy_cobblestone — cobblestone with green moss in seams and chunk corners
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('mossy_cobblestone');
    Px.stoneChunks(t, STONE_MCOBB_PAL, { cell: 5, seed: s, seam: '#2a3020', jitter: 0.82 });
    // moss patches in mortar areas via speckle
    Px.speckle(t, STONE_MOSS_PAL, { density: 0.12, seed: s + 20, size: 1 });
    // larger moss patches in corners
    for (let i = 0; i < 5; i++) {
      const mx = Math.floor(STONE_h2(i, 0, s + 40) * 14);
      const my = Math.floor(STONE_h2(i, 1, s + 40) * 14);
      Px.ellipse(t, mx, my, 1.5, 1.2, STONE_MOSS_PAL[1 + Math.floor(STONE_h2(i, 2, s + 40) * 2)], 0.70);
    }
    Px.edgeShade(t, 0.90);
    A.add('mossy_cobblestone', t);
  }

  // stone_bricks — regular brick courses in grey stone, deep mortar, chipped corners
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('stone_bricks');
    Px.bricks(t, STONE_SBRICK_PAL, STONE_SBRICK_MORTAR, { bw: 8, bh: 4, seed: s });
    // chipped corners — small dark triangles at a few brick corners
    for (let i = 0; i < 4; i++) {
      const bx = Math.floor(STONE_h2(i, 0, s + 30) * 2) * 8;
      const by = Math.floor(STONE_h2(i, 1, s + 30) * 4) * 4;
      Px.setPx(t, bx, by, STONE_SBRICK_MORTAR);
      Px.setPx(t, bx + 1, by, STONE_SBRICK_MORTAR);
      Px.setPx(t, bx, by + 1, STONE_SBRICK_MORTAR);
    }
    Px.edgeShade(t, 0.90);
    A.add('stone_bricks', t);
  }

  // cracked_stone_bricks — stone bricks with jagged dark cracks across several bricks
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('cracked_stone_bricks');
    Px.bricks(t, STONE_SBRICK_PAL, STONE_SBRICK_MORTAR, { bw: 8, bh: 4, seed: s });
    // jagged cracks
    STONE_crack(t, 2, 1, 12, s + 50, '#1e1e1e', 0.90);
    STONE_crack(t, 9, 6, 10, s + 51, '#1e1e1e', 0.85);
    STONE_crack(t, 0, 10, 8, s + 52, '#1e1e1e', 0.80);
    Px.edgeShade(t, 0.90);
    A.add('cracked_stone_bricks', t);
  }

  // mossy_stone_bricks — stone bricks with moss patches in the mortar
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('mossy_stone_bricks');
    Px.bricks(t, Px.ramp('#7a8060', 4, 0.68, 1.18), '#3a4030', { bw: 8, bh: 4, seed: s });
    Px.speckle(t, STONE_MOSS_PAL, { density: 0.10, seed: s + 25, size: 1 });
    for (let i = 0; i < 4; i++) {
      const mx = Math.floor(STONE_h2(i, 0, s + 60) * 13);
      const my = Math.floor(STONE_h2(i, 1, s + 60) * 13);
      Px.ellipse(t, mx, my, 2.0, 1.5, STONE_MOSS_PAL[1], 0.60);
    }
    Px.edgeShade(t, 0.90);
    A.add('mossy_stone_bricks', t);
  }

  // chiseled_stone_bricks — panel with a carved pillar/eye motif and framed border
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('chiseled_stone_bricks');
    Px.noiseFill(t, STONE_SBRICK_PAL, { freq: 0.22, octaves: 2, seed: s, contrast: 1.0, period: 16 });
    // outer frame
    Px.rectOutline(t, 0, 0, 16, 16, Px.shade(STONE_SBRICK_PAL[0], 0.65));
    Px.rectOutline(t, 1, 1, 14, 14, Px.shade(STONE_SBRICK_PAL[3], 1.12));
    // decorative pillar band horizontal
    Px.hLine(t, 1, 5, 14, Px.shade(STONE_SBRICK_PAL[0], 0.72));
    Px.hLine(t, 1, 10, 14, Px.shade(STONE_SBRICK_PAL[0], 0.72));
    Px.hLine(t, 1, 6, 14, Px.shade(STONE_SBRICK_PAL[3], 1.08), 0.5);
    Px.hLine(t, 1, 9, 14, Px.shade(STONE_SBRICK_PAL[3], 1.08), 0.5);
    // eye motif centre
    Px.ellipse(t, 8, 8, 2.5, 1.8, Px.shade(STONE_SBRICK_PAL[0], 0.60));
    Px.ellipse(t, 8, 8, 1.2, 0.9, Px.shade(STONE_SBRICK_PAL[3], 1.20));
    Px.edgeShade(t, 0.88);
    A.add('chiseled_stone_bricks', t);
  }

  // smooth_stone — flat grey stone with faint horizontal banding and a border
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('smooth_stone');
    Px.noiseFill(t, STONE_STONE_PAL, { freq: 0.18, octaves: 2, seed: s, contrast: 0.85, period: 16 });
    // faint horizontal banding
    for (let y = 0; y < 16; y++) {
      const band = Math.sin(y * 1.1 + 0.5) * 0.06;
      for (let x = 0; x < 16; x++) {
        const px = Px.getPx(t, x, y);
        Px.setPx(t, x, y, Px.shade(px, 1.0 + band));
      }
    }
    // thin 1px dark border
    Px.rectOutline(t, 0, 0, 16, 16, Px.shade(STONE_STONE_PAL[0], 0.60));
    Px.edgeShade(t, 0.90);
    A.add('smooth_stone', t);
  }

  // deepslate — very dark blue-grey rock with vertical streaks and fine banding
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('deepslate');
    Px.noiseFill(t, STONE_DS_PAL, { freq: 0.25, octaves: 3, seed: s, contrast: 1.30, period: 16 });
    Px.streaks(t, [STONE_DS_PAL[0], STONE_DS_PAL[1]], { vertical: true, density: 0.55, seed: s + 3, minLen: 3, maxLen: 10 });
    // fine horizontal banding
    for (let y = 0; y < 16; y++) {
      const fade = Math.sin(y * 0.8) * 0.04;
      for (let x = 0; x < 16; x++) {
        const px = Px.getPx(t, x, y);
        Px.setPx(t, x, y, Px.shade(px, 1.0 + fade));
      }
    }
    Px.edgeShade(t, 0.88);
    A.add('deepslate', t);
  }

  // deepslate_top — tighter concentric streaks seen end-on
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('deepslate_top');
    Px.noiseFill(t, STONE_DS_PAL, { freq: 0.28, octaves: 3, seed: s, contrast: 1.25, period: 16 });
    // concentric oval rings
    for (let ring = 1; ring <= 4; ring++) {
      const r2 = ring * 2.0;
      Px.circleOutline(t, 8, 8, r2, Px.shade(STONE_DS_PAL[1], 0.75), 0.40);
    }
    Px.streaks(t, [STONE_DS_PAL[0]], { vertical: false, density: 0.35, seed: s + 7, minLen: 2, maxLen: 6 });
    Px.edgeShade(t, 0.88);
    A.add('deepslate_top', t);
  }

  // cobbled_deepslate — angular chunks with near-black seams
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('cobbled_deepslate');
    Px.stoneChunks(t, STONE_CDS_PAL, { cell: 5, seed: s, seam: '#141418', jitter: 0.88 });
    Px.edgeShade(t, 0.88);
    A.add('cobbled_deepslate', t);
  }

  // deepslate_bricks — dark slate brick courses with tight mortar
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('deepslate_bricks');
    Px.bricks(t, STONE_DSB_PAL, '#181820', { bw: 8, bh: 4, seed: s });
    // extra streaks within bricks
    Px.streaks(t, [STONE_DSB_PAL[0]], { vertical: true, density: 0.30, seed: s + 8, minLen: 2, maxLen: 5 });
    Px.edgeShade(t, 0.88);
    A.add('deepslate_bricks', t);
  }

  // andesite — medium grey salt-and-pepper igneous rock
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('andesite');
    Px.noiseFill(t, STONE_ANDE_PAL, { freq: 0.30, octaves: 3, seed: s, contrast: 1.35, period: 16 });
    // salt speckles (light)
    Px.speckle(t, [STONE_ANDE_PAL[4]], { density: 0.14, seed: s + 5 });
    // pepper speckles (dark)
    Px.speckle(t, [STONE_ANDE_PAL[0], STONE_ANDE_PAL[1]], { density: 0.12, seed: s + 10 });
    Px.edgeShade(t, 0.90);
    A.add('andesite', t);
  }

  // granite — pink-brown rock with darker mineral flecks
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('granite');
    Px.noiseFill(t, STONE_GRAN_PAL, { freq: 0.28, octaves: 3, seed: s, contrast: 1.30, period: 16 });
    // dark mineral flecks
    Px.speckle(t, [STONE_GRAN_PAL[0], STONE_GRAN_PAL[1]], { density: 0.18, seed: s + 7 });
    // light feldspar flecks
    Px.speckle(t, [Px.shade(STONE_GRAN_PAL[4], 1.15)], { density: 0.08, seed: s + 13 });
    Px.edgeShade(t, 0.90);
    A.add('granite', t);
  }

  // diorite — near-white rock with black speckles
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('diorite');
    Px.noiseFill(t, STONE_DIOR_PAL, { freq: 0.28, octaves: 3, seed: s, contrast: 1.20, period: 16 });
    // black biotite speckles
    Px.speckle(t, ['#282828', '#1a1a1a'], { density: 0.14, seed: s + 5 });
    // very light quartz
    Px.speckle(t, [STONE_DIOR_PAL[4]], { density: 0.06, seed: s + 11 });
    Px.edgeShade(t, 0.90);
    A.add('diorite', t);
  }

  // tuff — olive-grey porous blotchy rock
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('tuff');
    Px.noiseFill(t, STONE_TUFF_PAL, { freq: 0.32, octaves: 3, seed: s, contrast: 1.40, period: 16 });
    // dark blotches (pores)
    for (let i = 0; i < 8; i++) {
      const bx = Math.floor(STONE_h2(i, 0, s + 80) * 15);
      const by = Math.floor(STONE_h2(i, 1, s + 80) * 15);
      Px.ellipse(t, bx, by, 1.0 + STONE_h2(i, 2, s + 80) * 1.5, 0.8 + STONE_h2(i, 3, s + 80) * 1.2,
        Px.shade(STONE_TUFF_PAL[0], 0.65), 0.70);
    }
    Px.edgeShade(t, 0.90);
    A.add('tuff', t);
  }

  // calcite — pale cream-white crystalline rock, faint facets
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('calcite');
    Px.noiseFill(t, STONE_CALC_PAL, { freq: 0.22, octaves: 2, seed: s, contrast: 1.05, period: 16 });
    // faint facet lines
    Px.line(t, 0, 5, 10, 0, Px.shade(STONE_CALC_PAL[3], 1.08), 0.35);
    Px.line(t, 5, 0, 15, 8, Px.shade(STONE_CALC_PAL[3], 1.08), 0.35);
    Px.line(t, 0, 10, 6, 16, Px.shade(STONE_CALC_PAL[1], 0.90), 0.30);
    Px.line(t, 10, 0, 16, 6, Px.shade(STONE_CALC_PAL[1], 0.90), 0.30);
    Px.speckle(t, [STONE_CALC_PAL[4]], { density: 0.05, seed: s + 6 });
    Px.edgeShade(t, 0.92);
    A.add('calcite', t);
  }

  // bricks — classic red clay bricks, pale mortar, per-brick variation
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('bricks');
    Px.bricks(t, STONE_BRICK_PAL, STONE_BRICK_MORTAR, { bw: 8, bh: 4, seed: s });
    Px.edgeShade(t, 0.90);
    A.add('bricks', t);
  }

  // obsidian — near-black volcanic glass with faint purple sheen and sharp facets
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('obsidian');
    Px.noiseFill(t, STONE_OBS_PAL, { freq: 0.25, octaves: 3, seed: s, contrast: 1.50, period: 16 });
    // purple sheen streaks
    const purpleSheen = [60, 20, 80, 255];
    Px.streaks(t, [purpleSheen], { vertical: true, density: 0.35, seed: s + 7, minLen: 4, maxLen: 12 });
    // sharp straight facet edges
    Px.line(t, 1, 1, 14, 5, Px.shade(STONE_OBS_PAL[4], 1.40), 0.40);
    Px.line(t, 3, 8, 12, 14, Px.shade(STONE_OBS_PAL[0], 0.55), 0.45);
    Px.line(t, 10, 2, 15, 12, Px.shade(STONE_OBS_PAL[3], 1.25), 0.35);
    Px.edgeShade(t, 0.85);
    A.add('obsidian', t);
  }

  // crying_obsidian — obsidian with glowing magenta teardrop veins
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('crying_obsidian');
    Px.noiseFill(t, STONE_COBS_PAL, { freq: 0.25, octaves: 3, seed: s, contrast: 1.50, period: 16 });
    // purple sheen
    Px.streaks(t, [[60, 20, 80, 255]], { vertical: true, density: 0.30, seed: s + 7, minLen: 3, maxLen: 10 });
    // magenta teardrop veins — drips running downward
    const veinCols = [[200, 20, 200, 255], [180, 10, 180, 255], [255, 60, 255, 255]];
    for (let i = 0; i < 5; i++) {
      const vx = 2 + Math.floor(STONE_h2(i, 0, s + 100) * 12);
      const vy = Math.floor(STONE_h2(i, 1, s + 100) * 10);
      const vlen = 3 + Math.floor(STONE_h2(i, 2, s + 100) * 6);
      const vc = veinCols[i % 3];
      // teardrop body
      Px.ellipse(t, vx, vy, 1.2, 1.2, vc);
      // drip tail
      for (let k = 0; k < vlen; k++) {
        Px.setPx(t, vx, vy + k + 1, vc, 0.8 - k * 0.12);
      }
      // bright tip
      Px.setPx(t, vx, vy - 1, [255, 100, 255, 255], 0.9);
    }
    // radial glow near veins
    Px.radialGlow(t, 4, 3, 3, [255, 80, 255, 180], [40, 0, 60, 0], { power: 1.8, alpha: 0.35 });
    Px.edgeShade(t, 0.85);
    A.add('crying_obsidian', t);
  }

  // bedrock — chaotic dark grey blocky rubble, very high contrast
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('bedrock');
    // lay base
    Px.noiseFill(t, STONE_BED_PALS[0], { freq: 0.28, octaves: 2, seed: s, contrast: 1.60, period: 16 });
    // many small rects of wildly different greys
    for (let i = 0; i < 18; i++) {
      const rx = Math.floor(STONE_h2(i, 0, s + 90) * 14);
      const ry = Math.floor(STONE_h2(i, 1, s + 90) * 14);
      const rw = 1 + Math.floor(STONE_h2(i, 2, s + 90) * 4);
      const rh = 1 + Math.floor(STONE_h2(i, 3, s + 90) * 3);
      const palSet = Math.floor(STONE_h2(i, 4, s + 90) * 3);
      const pal = STONE_BED_PALS[palSet];
      const col = pal[Math.floor(STONE_h2(i, 5, s + 90) * pal.length)];
      Px.rect(t, rx, ry, rw, rh, col);
      // dark outline for each rect
      Px.rectOutline(t, rx, ry, rw, rh, Px.shade(col, 0.55));
    }
    Px.edgeShade(t, 0.88);
    A.add('bedrock', t);
  }

  // coal_block — solid packed coal, faceted black chunks with grey rims
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('coal_block');
    Px.stoneChunks(t, STONE_COAL_PAL, { cell: 4, seed: s, seam: '#0a0a0c', jitter: 0.80 });
    // highlight a few rim pixels
    Px.speckle(t, [STONE_COAL_PAL[4]], { density: 0.04, seed: s + 9 });
    Px.edgeShade(t, 0.85);
    A.add('coal_block', t);
  }

  // iron_block — brushed pale metal with raised centre square and rivets
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('iron_block');
    STONE_metalPlate(t, STONE_IRON_PAL, s, 3);
    Px.edgeShade(t, 0.90);
    A.add('iron_block', t);
  }

  // gold_block — polished gold plates with bright bevel highlights
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('gold_block');
    STONE_metalPlate(t, STONE_GOLD_PAL, s, 3);
    // extra bright gold highlights on top-left
    Px.hLine(t, 0, 0, 16, Px.shade(STONE_GOLD_PAL[4], 1.35), 0.50);
    Px.vLine(t, 0, 0, 16, Px.shade(STONE_GOLD_PAL[4], 1.28), 0.45);
    Px.edgeShade(t, 0.88);
    A.add('gold_block', t);
  }

  // diamond_block — cyan cut gems in a lattice with white sparkles
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('diamond_block');
    STONE_gemLattice(t, STONE_DIAM_PAL, s);
    Px.edgeShade(t, 0.90);
    A.add('diamond_block', t);
  }

  // emerald_block — green cut gems lattice with facet highlights
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('emerald_block');
    STONE_gemLattice(t, STONE_EMER_PAL, s);
    Px.edgeShade(t, 0.90);
    A.add('emerald_block', t);
  }

  // lapis_block — deep blue mineral mass with lighter blue flecks
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('lapis_block');
    Px.noiseFill(t, STONE_LAPIS_PAL, { freq: 0.28, octaves: 3, seed: s, contrast: 1.40, period: 16 });
    // lighter blue flecks
    Px.speckle(t, [STONE_LAPIS_PAL[3], STONE_LAPIS_PAL[4]], { density: 0.15, seed: s + 5 });
    // gold vein trace
    Px.speckle(t, [Px.shade([220, 180, 30, 255], 1.0)], { density: 0.03, seed: s + 11 });
    Px.edgeShade(t, 0.88);
    A.add('lapis_block', t);
  }

  // redstone_block — dark red ore mass, fine crimson granules, slight glow
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('redstone_block');
    Px.noiseFill(t, STONE_REDS_PAL, { freq: 0.30, octaves: 3, seed: s, contrast: 1.35, period: 16 });
    Px.grain(t, STONE_REDS_PAL, { seed: s + 5, density: 0.35 });
    // slight glow warmth in centre
    Px.radialGlow(t, 8, 8, 5, [255, 80, 40, 120], [160, 0, 0, 0], { power: 1.5, alpha: 0.30 });
    Px.edgeShade(t, 0.88);
    A.add('redstone_block', t);
  }

  // copper_block — orange-pink hammered metal plates
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('copper_block');
    STONE_metalPlate(t, STONE_COPP_PAL, s, 3);
    // hammer texture — slight dimples
    Px.speckle(t, [Px.shade(STONE_COPP_PAL[1], 0.82)], { density: 0.10, seed: s + 9 });
    Px.edgeShade(t, 0.90);
    A.add('copper_block', t);
  }

  // netherite_block — very dark metal with purple-brown mottling and highlights
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('netherite_block');
    STONE_metalPlate(t, STONE_NETH_PAL, s, 3);
    // purple-brown mottling
    Px.speckle(t, [[50, 25, 40, 255], [40, 20, 35, 255]], { density: 0.14, seed: s + 7 });
    // hard highlight lines
    Px.line(t, 3, 3, 12, 4, Px.shade(STONE_NETH_PAL[4], 1.45), 0.45);
    Px.line(t, 3, 11, 12, 12, Px.shade(STONE_NETH_PAL[0], 0.55), 0.40);
    Px.edgeShade(t, 0.85);
    A.add('netherite_block', t);
  }

  // quartz_block — clean white quartz with faint vertical grain
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('quartz_block');
    Px.noiseFill(t, STONE_QRTZ_PAL, { freq: 0.20, octaves: 2, seed: s, contrast: 0.90, period: 16 });
    // vertical grain
    Px.streaks(t, [Px.shade(STONE_QRTZ_PAL[1], 0.92)], { vertical: true, density: 0.40, seed: s + 3, minLen: 4, maxLen: 12 });
    Px.edgeShade(t, 0.92);
    A.add('quartz_block', t);
  }

  // prismarine — small irregular teal tiles with subtle shimmer
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('prismarine');
    Px.stoneChunks(t, STONE_PRIS_PAL, { cell: 4, seed: s, seam: '#1e3830', jitter: 0.78 });
    // shimmer gradient — lighter diagonal band
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const shimmer = (x + y) / 32.0;
        if (shimmer > 0.6) {
          const c = Px.getPx(t, x, y);
          Px.setPx(t, x, y, Px.shade(c, 1.0 + (shimmer - 0.6) * 0.3));
        }
      }
    }
    Px.edgeShade(t, 0.90);
    A.add('prismarine', t);
  }

  // prismarine_bricks — teal brick courses, cleaner geometry
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('prismarine_bricks');
    Px.bricks(t, STONE_PBRICK_PAL, '#1a3028', { bw: 8, bh: 4, seed: s });
    // teal shimmer overlay
    Px.speckle(t, [Px.shade(STONE_PBRICK_PAL[3], 1.20)], { density: 0.06, seed: s + 8 });
    Px.edgeShade(t, 0.90);
    A.add('prismarine_bricks', t);
  }

  // dark_prismarine — deep blue-green stone, fine grid, darker mortar
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('dark_prismarine');
    Px.stoneChunks(t, STONE_DPRIS_PAL, { cell: 4, seed: s, seam: '#0c1c18', jitter: 0.75 });
    Px.speckle(t, [STONE_DPRIS_PAL[4]], { density: 0.05, seed: s + 6 });
    Px.edgeShade(t, 0.88);
    A.add('dark_prismarine', t);
  }

}
