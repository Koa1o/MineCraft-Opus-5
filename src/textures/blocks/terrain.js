// terrain.js — procedural terrain block textures
// All top-level names prefixed with TERRAIN_ to ensure global uniqueness.
import { Px } from '../px.js';

// ---- palette helpers -------------------------------------------------------

// grass_top (greyscale, tinted at runtime)
const TERRAIN_GRASS_TOP_PAL = Px.ramp('#7a7a7a', 5, 0.70, 1.22);

// grass_side overlay (greyscale fringe)
const TERRAIN_GRASS_OVL_PAL = Px.ramp('#909090', 4, 0.78, 1.18);

// dirt
const TERRAIN_DIRT_PAL = Px.ramp('#8b6340', 5, 0.72, 1.20);

// coarse dirt
const TERRAIN_CDIRT_PAL = Px.ramp('#7a5530', 5, 0.65, 1.15);

// podzol top
const TERRAIN_PODZOL_PAL = Px.ramp('#4f2a0a', 5, 0.60, 1.30);
const TERRAIN_PODZOL_NEEDLE_PAL = Px.ramp('#8a4a12', 4, 0.70, 1.35);

// mycelium
const TERRAIN_MYCEL_PAL = Px.ramp('#7b6e80', 5, 0.68, 1.20);

// dirt_path_top
const TERRAIN_DPATH_PAL = Px.ramp('#b09060', 5, 0.75, 1.18);

// farmland
const TERRAIN_FARM_PAL = Px.ramp('#6a4020', 4, 0.68, 1.20);
const TERRAIN_FARM_WET_PAL = Px.ramp('#3d2010', 4, 0.60, 1.10);

// sand
const TERRAIN_SAND_PAL = Px.ramp('#dbc87a', 5, 0.80, 1.15);

// red_sand
const TERRAIN_RSAND_PAL = Px.ramp('#c4622a', 5, 0.78, 1.18);

// sandstone_top
const TERRAIN_SSTOP_PAL = Px.ramp('#d4b870', 4, 0.82, 1.12);

// sandstone (sides)
const TERRAIN_SS_DARK = Px.ramp('#c8a850', 3, 0.68, 0.88);
const TERRAIN_SS_MID  = Px.ramp('#d4b860', 3, 0.85, 1.10);
const TERRAIN_SS_LITE = Px.ramp('#e0cc80', 3, 0.90, 1.18);

// sandstone_bottom
const TERRAIN_SSBOT_PAL = Px.ramp('#cba848', 5, 0.68, 1.12);

// red_sandstone_top
const TERRAIN_RSSTOP_PAL = Px.ramp('#b85030', 4, 0.78, 1.12);

// red_sandstone
const TERRAIN_RSS_DARK = Px.ramp('#7a2810', 3, 0.65, 0.90);
const TERRAIN_RSS_MID  = Px.ramp('#a03818', 3, 0.82, 1.08);
const TERRAIN_RSS_LITE = Px.ramp('#c85030', 3, 0.88, 1.15);

// red_sandstone_bottom
const TERRAIN_RSSBOT_PAL = Px.ramp('#8a3010', 5, 0.65, 1.10);

// gravel
const TERRAIN_GRAVEL_PALS = [
  Px.ramp('#7a7878', 3, 0.62, 1.20),
  Px.ramp('#908880', 3, 0.65, 1.18),
  Px.ramp('#6a6460', 3, 0.60, 1.15),
];

// clay
const TERRAIN_CLAY_PAL = Px.ramp('#8fa0a8', 5, 0.78, 1.15);

// terracotta base
const TERRAIN_TC_BASE = Px.ramp('#8e5530', 4, 0.72, 1.18);
const TERRAIN_TC_WHITE = Px.ramp('#c8b8a0', 4, 0.80, 1.12);
const TERRAIN_TC_ORANGE = Px.ramp('#a04820', 4, 0.72, 1.20);
const TERRAIN_TC_YELLOW = Px.ramp('#b09030', 4, 0.74, 1.18);
const TERRAIN_TC_RED = Px.ramp('#7a2010', 4, 0.68, 1.20);
const TERRAIN_TC_BROWN = Px.ramp('#4a2808', 4, 0.65, 1.18);
const TERRAIN_TC_LGRAY = Px.ramp('#907880', 4, 0.72, 1.16);

// snow
const TERRAIN_SNOW_PAL = Px.ramp('#e8eef4', 4, 0.88, 1.08);

// ice
const TERRAIN_ICE_PAL = Px.ramp('#90c8e8', 4, 0.82, 1.10);

// packed ice
const TERRAIN_PICE_PAL = Px.ramp('#6898c8', 4, 0.80, 1.15);

// blue ice
const TERRAIN_BICE_PAL = Px.ramp('#2060c0', 5, 0.72, 1.28);

// ---- simple hash helper (pure, deterministic) ------------------------------
function TERRAIN_h2(x, y, s) {
  let v = (x * 1619 + y * 31337 + s * 1234567) | 0;
  v = (v ^ (v >>> 13)) * 0x45d9f3b;
  v = (v ^ (v >>> 15));
  return (v >>> 0) / 0xffffffff;
}

export function registerTerrainTiles(A, C) {

  // grass_top — greyscale grass mat viewed from above: visible blade clumps.
  // Must be greyscale (biome tint multiplies over it at runtime).
  // Luma range 110-210. Seamlessly tileable (period: t.w on noise).
  // The eye should read "mown grass seen from above", not "noise".
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('grass_top');
    // Step 1: dark base — the gaps between blade clusters read as shadow.
    // Use fbm with period:16 for seamless tiling.
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = Px.fbm(x, y, 0.18, 3, s, 16);
        // base is intentionally DARK (110-130) so bright blade clusters pop
        const luma = (110 + n * 20) | 0;
        Px.setPx(t, x, y, [luma, luma, luma, 255]);
      }
    }
    // Step 2: paint 18 blade CLUSTERS. Each cluster draws 3-5 short near-vertical
    // strokes (1px wide, 2-4px tall). Cluster positions use a grid jitter so
    // they spread somewhat evenly across the tile.
    // 4x4 soft grid → 16 cells, + 2 extra clusters = 18 total
    const TERRAIN_GT_NC = 18;
    for (let ci = 0; ci < TERRAIN_GT_NC; ci++) {
      // Spread clusters across the tile using grid cells for even distribution
      const gridX = ci % 4, gridY = (ci >> 2) % 4;
      // jitter within the cell, wrap for seamless tiling
      const jx = (TERRAIN_h2(ci, 0, s + 100) * 4) | 0;   // 0-3 within cell
      const jy = (TERRAIN_h2(ci, 1, s + 100) * 4) | 0;
      const cx = (gridX * 4 + jx) % 16;
      const cy = (gridY * 4 + jy) % 16;
      // cluster luma class: ~60% bright (175-205), ~40% mid (145-172)
      const bright = TERRAIN_h2(ci, 2, s + 200) < 0.60;
      const clusterBase = bright
        ? 175 + (TERRAIN_h2(ci, 3, s + 200) * 30 | 0)   // 175-205
        : 145 + (TERRAIN_h2(ci, 3, s + 200) * 27 | 0);  // 145-172
      // 3-5 blades per cluster
      const nBlades = 3 + (TERRAIN_h2(ci, 4, s + 200) * 3 | 0);
      for (let bi = 0; bi < nBlades; bi++) {
        // blade offset within cluster (±2px), wrapping for seamless tile
        const bx = ((cx + Math.round((TERRAIN_h2(ci * 11 + bi, 0, s + 300) - 0.5) * 4) + 16) % 16) | 0;
        const by = ((cy + Math.round((TERRAIN_h2(ci * 11 + bi, 1, s + 300) - 0.5) * 3) + 16) % 16) | 0;
        // blade length 2-4 px — short, like mown grass seen from above
        const blen = 2 + (TERRAIN_h2(ci * 11 + bi, 2, s + 300) * 3 | 0);
        // small per-blade luma variation
        const bladeBase = clusterBase + (TERRAIN_h2(ci * 11 + bi, 3, s + 300) * 12 | 0) - 6;
        for (let dl = 0; dl < blen; dl++) {
          // slight rightward lean for some blades (more natural than perfectly vertical)
          const lean = (TERRAIN_h2(ci * 11 + bi, 5, s + 300) > 0.55 && dl > 0) ? 1 : 0;
          const px = ((bx + lean) + 16) % 16;
          const py = (by + dl) % 16;
          // lighter at top, slightly darker at tip
          const fade = (dl * 12 / blen) | 0;
          const luma = Math.min(210, Math.max(110, bladeBase - fade)) | 0;
          Px.setPx(t, px, py, [luma, luma, luma, 255]);
        }
      }
    }
    // Step 3: fine pixel-level speckle to add texture within clusters
    // (a few extra bright tips and shadow gaps between blades)
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const h = TERRAIN_h2(x, y, s + 4000);
        if (h < 0.07) {
          // bright tip pixel
          const cur = Px.getPx(t, x, y)[0];
          const v = Math.min(210, cur + 22) | 0;
          Px.setPx(t, x, y, [v, v, v, 255]);
        } else if (h > 0.91) {
          // dark gap pixel (shadow between blades)
          const cur = Px.getPx(t, x, y)[0];
          const v = Math.max(110, cur - 22) | 0;
          Px.setPx(t, x, y, [v, v, v, 255]);
        }
      }
    }
    A.add('grass_top', t);
  }

  // grass_side — dirt body with ragged grass LAYER hanging down over the top.
  // Per-column hang depth 3-7 rows, neighbouring columns correlate via a
  // low-frequency noise so the silhouette reads as organic, not a random comb.
  // Grass is painted in real greens (not tinted), dirt body below.
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('grass_side');
    // brown dirt body fills the whole tile first
    Px.noiseFill(t, TERRAIN_DIRT_PAL, { freq: 0.32, octaves: 3, seed: s, contrast: 1.3, period: 16 });
    Px.speckle(t, [TERRAIN_DIRT_PAL[0], TERRAIN_DIRT_PAL[4]], { density: 0.14, seed: s + 5 });
    // Grass colours: light top, mid body, dark tip — real greens
    const TERRAIN_GS_LITE  = [115, 155, 65, 255];  // #739b41
    const TERRAIN_GS_MID   = [88, 130, 45, 255];   // #58822d
    const TERRAIN_GS_DARK  = [62, 100, 28, 255];   // #3e641c
    const TERRAIN_GS_DARKR = [48,  80, 18, 255];   // #305012 — deepest tip
    // Per-column hang depth: blend a high-freq hash with low-freq noise so
    // neighbouring columns have correlated depths (organic silhouette).
    for (let x = 0; x < 16; x++) {
      // low-freq component: smoothly varying depth bias across the 16 columns
      const lowFreq = Px.fbm(x, 0, 0.18, 2, s + 800, 16); // 0..1
      // high-freq hash: column-local variation
      const hiFreq  = TERRAIN_h2(x, 0, s + 900);          // 0..1
      // blend 60% low, 40% high — keeps shape coherent but ragged
      const blended = lowFreq * 0.60 + hiFreq * 0.40;
      // hang depth 3-7
      const depth = 3 + (blended * 5 | 0);
      for (let y = 0; y < depth; y++) {
        const frac = y / (depth - 1 || 1);
        // choose shade by fraction from top to tip
        let col;
        if (frac < 0.25) {
          col = TERRAIN_GS_LITE;
        } else if (frac < 0.55) {
          col = TERRAIN_GS_MID;
        } else if (frac < 0.80) {
          col = TERRAIN_GS_DARK;
        } else {
          col = TERRAIN_GS_DARKR;
        }
        // slight horizontal dither ±1 so edge is not pixel-perfect
        const shift = (TERRAIN_h2(x, y, s + 600) > 0.75) ? 1 : (TERRAIN_h2(x, y, s + 601) < 0.25 ? -1 : 0);
        const px = Math.max(0, Math.min(15, x + shift));
        Px.setPx(t, px, y, col);
      }
    }
    Px.edgeShade(t, 0.92);
    A.add('grass_side', t, { wrap: false });
  }

  // grass_side_overlay — only the grass fringe, alpha=0 below each column's
  // hang depth and in ragged gaps within the fringe. IS tinted (t:1), so
  // must be greyscale. Needs >= 100 alpha-0 pixels.
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('grass_side_overlay');
    // start fully transparent
    Px.clear(t);
    // Use the same correlated depth logic as grass_side so the two layers align
    for (let x = 0; x < 16; x++) {
      const lowFreq = Px.fbm(x, 0, 0.18, 2, s + 800, 16);
      const hiFreq  = TERRAIN_h2(x, 0, s + 900);
      const blended = lowFreq * 0.60 + hiFreq * 0.40;
      const depth = 3 + (blended * 5 | 0);
      for (let y = 0; y < depth; y++) {
        // leave sparse gaps within the fringe for a ragged silhouette
        // (roughly 1-in-5 pixels within the blade area are transparent)
        const gapHash = TERRAIN_h2(x, y, s + 700);
        if (gapHash < 0.18) continue; // alpha-0 gap inside blade

        const frac = y / (depth - 1 || 1);
        // greyscale luma: top lighter, tip darker (biome tint will colour it)
        const n1 = Px.fbm(x, y, 0.45, 2, s + 200, 16);
        const baseLuma = frac < 0.30 ? 175
                       : frac < 0.60 ? 148
                       : frac < 0.85 ? 118
                       :               90;
        const jitter = ((n1 - 0.5) * 30) | 0;
        const luma = Math.max(80, Math.min(210, baseLuma + jitter)) | 0;
        Px.setPx(t, x, y, [luma, luma, luma, 255]);
      }
      // rows below depth are already alpha-0 from Px.clear
    }
    // bottom rows remain alpha-0 (cutout requirement — the whole lower portion is transparent)
    A.add('grass_side_overlay', t, { wrap: false });
  }

  // dirt — brown earth, dense speckle, few small pebbles, 5 shades
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('dirt');
    Px.noiseFill(t, TERRAIN_DIRT_PAL, { freq: 0.30, octaves: 3, seed: s, contrast: 1.25, period: 16 });
    Px.speckle(t, [TERRAIN_DIRT_PAL[0], TERRAIN_DIRT_PAL[1]], { density: 0.16, seed: s + 3 });
    Px.speckle(t, [TERRAIN_DIRT_PAL[4]], { density: 0.08, seed: s + 9 });
    // small pebble dots
    for (let i = 0; i < 4; i++) {
      const px = 2 + Math.floor(TERRAIN_h2(i, 0, s + 20) * 12);
      const py = 2 + Math.floor(TERRAIN_h2(i, 1, s + 20) * 12);
      const pc = TERRAIN_DIRT_PAL[Math.floor(TERRAIN_h2(i, 2, s + 20) * 2)];
      Px.circle(t, px, py, 1, pc);
    }
    Px.edgeShade(t, 0.95);
    A.add('dirt', t);
  }

  // coarse_dirt — grittier dirt with more dark specks and tiny gravel bits
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('coarse_dirt');
    Px.noiseFill(t, TERRAIN_CDIRT_PAL, { freq: 0.35, octaves: 3, seed: s, contrast: 1.40, period: 16 });
    Px.speckle(t, [TERRAIN_CDIRT_PAL[0], TERRAIN_CDIRT_PAL[1]], { density: 0.22, seed: s + 5 });
    Px.speckle(t, [TERRAIN_CDIRT_PAL[4]], { density: 0.06, seed: s + 11 });
    // small gravel bits
    for (let i = 0; i < 6; i++) {
      const gx = 1 + Math.floor(TERRAIN_h2(i, 0, s + 30) * 14);
      const gy = 1 + Math.floor(TERRAIN_h2(i, 1, s + 30) * 14);
      const gc = Px.shade(TERRAIN_CDIRT_PAL[Math.floor(TERRAIN_h2(i, 2, s + 30) * 3)], 0.7);
      Px.setPx(t, gx, gy, gc);
      Px.setPx(t, gx + 1, gy, Px.shade(gc, 1.2));
    }
    Px.edgeShade(t, 0.95);
    A.add('coarse_dirt', t);
  }

  // podzol_top — dark rust-brown forest floor with orange needle litter
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('podzol_top');
    Px.noiseFill(t, TERRAIN_PODZOL_PAL, { freq: 0.28, octaves: 3, seed: s, contrast: 1.35, period: 16 });
    // orange needle litter
    Px.speckle(t, TERRAIN_PODZOL_NEEDLE_PAL, { density: 0.28, seed: s + 7 });
    // individual needles as short lines
    for (let i = 0; i < 8; i++) {
      const nx = Math.floor(TERRAIN_h2(i, 0, s + 50) * 14);
      const ny = Math.floor(TERRAIN_h2(i, 1, s + 50) * 14);
      const nc = TERRAIN_PODZOL_NEEDLE_PAL[Math.floor(TERRAIN_h2(i, 2, s + 50) * 3)];
      const horiz = TERRAIN_h2(i, 3, s + 50) > 0.5;
      if (horiz) {
        Px.hLine(t, nx, ny, 2 + Math.floor(TERRAIN_h2(i, 4, s + 50) * 3), nc);
      } else {
        Px.vLine(t, nx, ny, 2 + Math.floor(TERRAIN_h2(i, 4, s + 50) * 3), nc);
      }
    }
    Px.edgeShade(t, 0.95);
    A.add('podzol_top', t);
  }

  // mycelium_top — pale grey-violet fungal mat, fine mottled pores
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('mycelium_top');
    Px.noiseFill(t, TERRAIN_MYCEL_PAL, { freq: 0.40, octaves: 3, seed: s, contrast: 1.20, period: 16 });
    Px.speckle(t, [TERRAIN_MYCEL_PAL[0], TERRAIN_MYCEL_PAL[1]], { density: 0.14, seed: s + 6 });
    // fine pore dots
    Px.speckle(t, [TERRAIN_MYCEL_PAL[4]], { density: 0.06, seed: s + 12, size: 1 });
    // purple tinge flecks
    for (let i = 0; i < 10; i++) {
      const px2 = Math.floor(TERRAIN_h2(i, 0, s + 70) * 16);
      const py2 = Math.floor(TERRAIN_h2(i, 1, s + 70) * 16);
      Px.setPx(t, px2, py2, [128, 100, 138, 255]);
    }
    Px.edgeShade(t, 0.95);
    A.add('mycelium_top', t);
  }

  // dirt_path_top — compacted pale dirt, faint concentric wear rings
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('dirt_path_top');
    Px.noiseFill(t, TERRAIN_DPATH_PAL, { freq: 0.25, octaves: 3, seed: s, contrast: 1.15, period: 16 });
    Px.speckle(t, [TERRAIN_DPATH_PAL[1], TERRAIN_DPATH_PAL[2]], { density: 0.12, seed: s + 4 });
    // faint concentric oval wear rings
    for (let ring = 1; ring <= 3; ring++) {
      const rx = 5 + ring * 1.5, ry = 3 + ring * 1.2;
      const rc = Px.shade(TERRAIN_DPATH_PAL[1], 0.88);
      Px.ellipse(t, 8, 8, rx, ry, rc, 0.25);
    }
    Px.edgeShade(t, 0.95);
    A.add('dirt_path_top', t);
  }

  // dirt_path_side — dirt with a thin irregular compacted cap on the top 2-3 rows.
  // The cap varies per column (not a clean straight stripe), giving an organic
  // compacted-earth edge rather than a plank or painted line.
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('dirt_path_side');
    Px.noiseFill(t, TERRAIN_DIRT_PAL, { freq: 0.30, octaves: 3, seed: s, contrast: 1.25, period: 16 });
    Px.speckle(t, [TERRAIN_DIRT_PAL[0]], { density: 0.13, seed: s + 5 });
    // Compacted cap: per column, the cap is 1, 2, or 3 rows deep depending on
    // a low-freq noise so neighbouring columns correlate (soft, wavy edge).
    for (let x = 0; x < 16; x++) {
      // cap depth: 1-3 rows, driven by correlated noise
      const n = Px.fbm(x, 0, 0.22, 2, s + 100, 16); // low-freq per column
      const capDepth = 1 + (n * 2.8 | 0); // 1, 2, or 3
      for (let y = 0; y < capDepth; y++) {
        // row 0 is the lightest (fully compacted), deeper rows slightly less light
        const localN = Px.fbm(x, y, 0.5, 2, s + 200 + y * 17, 16);
        const baseIdx = (y === 0) ? 4 : (y === 1 ? 3 : 2);
        const jitter  = (localN > 0.6) ? 1 : (localN < 0.35 ? -1 : 0);
        const idx     = Math.max(0, Math.min(4, baseIdx + jitter));
        Px.setPx(t, x, y, TERRAIN_DPATH_PAL[idx]);
      }
    }
    Px.edgeShade(t, 0.92);
    A.add('dirt_path_side', t, { wrap: false });
  }

  // farmland — tilled soil: 4 ridge-and-furrow rows.
  // The furrow lines wobble +-1px along their length and have small gaps so
  // they look like soil ridges, not wood planks. A dense earthy speckle covers
  // the whole tile. Ridge-to-groove contrast is deliberately subtle.
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('farmland');
    // noisy soil base fill
    Px.noiseFill(t, TERRAIN_FARM_PAL, { freq: 0.30, octaves: 3, seed: s, contrast: 1.15, period: 16 });
    // dense earthy speckle to read as tilled dirt, not flat planks
    Px.speckle(t, [TERRAIN_FARM_PAL[0], TERRAIN_FARM_PAL[1]], { density: 0.20, seed: s + 20 });
    Px.speckle(t, [TERRAIN_FARM_PAL[3], TERRAIN_FARM_PAL[2]], { density: 0.10, seed: s + 21 });
    // 4 ridge-and-furrow: the lightest pixel of each ridge wobbles, the groove
    // between ridges is a subtle darker band, not a sharp plank-seam.
    for (let row = 0; row < 4; row++) {
      // nominal top of ridge at ry
      const ry = row * 4 + 1;
      for (let x = 0; x < 16; x++) {
        // wobble ±1 px per column driven by noise (no sharp straight line)
        const wob = Math.round((Px.fbm(x, row, 0.55, 2, s + 30 + row * 13, 16) - 0.5) * 2);
        const ridgeY = Math.max(0, Math.min(15, ry + wob));
        // gap: 1-in-8 chance to skip this column (breaks up the ridge, no plank-seam)
        if (TERRAIN_h2(x, row, s + 400) < 0.12) continue;
        // ridge highlight: shade the existing dirt colour slightly lighter (subtle)
        const baseCol = Px.getPx(t, x, ridgeY);
        Px.setPx(t, x, ridgeY, Px.shade(baseCol, 1.18));
        // furrow shadow: the row just below the ridge is slightly darker
        const shadY = Math.min(15, ridgeY + 1);
        const shadCol = Px.getPx(t, x, shadY);
        Px.setPx(t, x, shadY, Px.shade(shadCol, 0.82));
      }
    }
    Px.edgeShade(t, 0.92);
    A.add('farmland', t, { wrap: false });
  }

  // farmland_wet — same soil ridge logic but darker and with a few glistening
  // highlight pixels that read as surface moisture.
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('farmland_wet');
    // darker moist soil base
    Px.noiseFill(t, TERRAIN_FARM_WET_PAL, { freq: 0.30, octaves: 3, seed: s, contrast: 1.20, period: 16 });
    Px.speckle(t, [TERRAIN_FARM_WET_PAL[0], TERRAIN_FARM_WET_PAL[1]], { density: 0.20, seed: s + 20 });
    // same wobbling ridge logic as farmland (dry)
    for (let row = 0; row < 4; row++) {
      const ry = row * 4 + 1;
      for (let x = 0; x < 16; x++) {
        const wob = Math.round((Px.fbm(x, row, 0.55, 2, s + 30 + row * 13, 16) - 0.5) * 2);
        const ridgeY = Math.max(0, Math.min(15, ry + wob));
        if (TERRAIN_h2(x, row, s + 400) < 0.12) continue;
        const baseCol = Px.getPx(t, x, ridgeY);
        Px.setPx(t, x, ridgeY, Px.shade(baseCol, 1.15));
        const shadY = Math.min(15, ridgeY + 1);
        const shadCol = Px.getPx(t, x, shadY);
        Px.setPx(t, x, shadY, Px.shade(shadCol, 0.80));
      }
    }
    // moisture glisten — scattered slightly brighter specular pixels
    for (let i = 0; i < 12; i++) {
      const gx = (TERRAIN_h2(i, 0, s + 500) * 16) | 0;
      const gy = (TERRAIN_h2(i, 1, s + 500) * 16) | 0;
      if (TERRAIN_h2(i, 2, s + 500) < 0.55) {
        const gleamCol = Px.getPx(t, gx, gy);
        Px.setPx(t, gx, gy, Px.shade(gleamCol, 1.45));
      }
    }
    Px.edgeShade(t, 0.92);
    A.add('farmland_wet', t, { wrap: false });
  }

  // sand — pale gold, dense fine grain, subtle dune ripple lines
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('sand');
    Px.noiseFill(t, TERRAIN_SAND_PAL, { freq: 0.25, octaves: 2, seed: s, contrast: 1.1, period: 16 });
    Px.grain(t, TERRAIN_SAND_PAL, { seed: s + 5, density: 0.50 });
    // 2-3 subtle horizontal dune ripple lines
    for (let i = 0; i < 3; i++) {
      const ry = 3 + Math.floor(TERRAIN_h2(i, 0, s + 90) * 10);
      for (let x = 0; x < 16; x++) {
        const wave = Math.round(Math.sin(x * 0.5 + i * 2.1) * 0.5);
        Px.setPx(t, x, ry + wave, Px.shade(TERRAIN_SAND_PAL[1], 0.88), 0.55);
      }
    }
    Px.edgeShade(t, 0.95);
    A.add('sand', t);
  }

  // red_sand — orange-red sand grain, same ripple structure
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('red_sand');
    Px.noiseFill(t, TERRAIN_RSAND_PAL, { freq: 0.25, octaves: 2, seed: s, contrast: 1.1, period: 16 });
    Px.grain(t, TERRAIN_RSAND_PAL, { seed: s + 5, density: 0.50 });
    for (let i = 0; i < 3; i++) {
      const ry = 3 + Math.floor(TERRAIN_h2(i, 0, s + 90) * 10);
      for (let x = 0; x < 16; x++) {
        const wave = Math.round(Math.sin(x * 0.5 + i * 2.1) * 0.5);
        Px.setPx(t, x, ry + wave, Px.shade(TERRAIN_RSAND_PAL[1], 0.88), 0.55);
      }
    }
    Px.edgeShade(t, 0.95);
    A.add('red_sand', t);
  }

  // sandstone_top — sand grain compacted, faint concentric rings
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('sandstone_top');
    Px.noiseFill(t, TERRAIN_SSTOP_PAL, { freq: 0.28, octaves: 2, seed: s, contrast: 1.15, period: 16 });
    Px.grain(t, TERRAIN_SSTOP_PAL, { seed: s + 3, density: 0.35 });
    // concentric rings
    for (let ring = 1; ring <= 3; ring++) {
      const r = ring * 2.5;
      Px.circleOutline(t, 8, 8, r, Px.shade(TERRAIN_SSTOP_PAL[1], 0.84), 0.30);
    }
    Px.edgeShade(t, 0.95);
    A.add('sandstone_top', t);
  }

  // sandstone — horizontal sedimentary strata bands, grain within bands
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('sandstone');
    // 4 strata bands
    const bandH = 4;
    for (let band = 0; band < 4; band++) {
      const pal = band % 2 === 0 ? TERRAIN_SS_MID : (band === 1 ? TERRAIN_SS_DARK : TERRAIN_SS_LITE);
      for (let y = band * bandH; y < (band + 1) * bandH && y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const n = Px.fbm(x, y, 0.45, 2, s + band * 17, 16);
          const idx = Math.min(Math.floor(n * pal.length), pal.length - 1);
          Px.setPx(t, x, y, pal[idx]);
        }
      }
      // band separator line
      if (band < 3) {
        const sy2 = (band + 1) * bandH - 1;
        Px.hLine(t, 0, sy2, 16, Px.shade(TERRAIN_SS_DARK[0], 0.80), 0.60);
      }
    }
    Px.grain(t, TERRAIN_SSTOP_PAL, { seed: s + 5, density: 0.18 });
    Px.edgeShade(t, 0.95);
    A.add('sandstone', t);
  }

  // sandstone_bottom — coarser sandstone, heavier grain
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('sandstone_bottom');
    Px.noiseFill(t, TERRAIN_SSBOT_PAL, { freq: 0.30, octaves: 3, seed: s, contrast: 1.35, period: 16 });
    Px.grain(t, TERRAIN_SSBOT_PAL, { seed: s + 7, density: 0.45 });
    Px.speckle(t, [TERRAIN_SSBOT_PAL[0], TERRAIN_SSBOT_PAL[1]], { density: 0.10, seed: s + 12 });
    Px.edgeShade(t, 0.95);
    A.add('sandstone_bottom', t);
  }

  // chiseled_sandstone — carved creeper-ish glyph and framed border
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('chiseled_sandstone');
    Px.noiseFill(t, TERRAIN_SS_MID, { freq: 0.28, octaves: 2, seed: s, contrast: 1.1, period: 16 });
    // outer frame
    Px.rectOutline(t, 0, 0, 16, 16, Px.shade(TERRAIN_SS_MID[0], 0.72));
    Px.rectOutline(t, 1, 1, 14, 14, Px.shade(TERRAIN_SS_MID[2], 1.10));
    // creeper-ish glyph: two dark eye squares + mouth row
    const dark = Px.shade(TERRAIN_SS_DARK[0], 0.60);
    // eyes
    Px.rect(t, 4, 4, 3, 3, dark);
    Px.rect(t, 9, 4, 3, 3, dark);
    // nose bridge
    Px.rect(t, 7, 7, 2, 2, dark);
    // mouth
    Px.rect(t, 4, 10, 2, 2, dark);
    Px.rect(t, 10, 10, 2, 2, dark);
    Px.rect(t, 6, 11, 4, 1, dark);
    // highlight top of eyes
    Px.hLine(t, 4, 4, 3, Px.shade(TERRAIN_SS_LITE[2], 1.15), 0.6);
    Px.hLine(t, 9, 4, 3, Px.shade(TERRAIN_SS_LITE[2], 1.15), 0.6);
    Px.edgeShade(t, 0.90);
    A.add('chiseled_sandstone', t);
  }

  // cut_sandstone — 4 smooth quadrant blocks with seams
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('cut_sandstone');
    Px.noiseFill(t, TERRAIN_SS_MID, { freq: 0.22, octaves: 2, seed: s, contrast: 1.0, period: 16 });
    const mortar = Px.shade(TERRAIN_SS_DARK[0], 0.72);
    // seam lines
    Px.hLine(t, 0, 7, 16, mortar);
    Px.hLine(t, 0, 8, 16, mortar);
    Px.vLine(t, 7, 0, 16, mortar);
    Px.vLine(t, 8, 0, 16, mortar);
    // highlight top-left of each quadrant
    Px.hLine(t, 0, 0, 7, Px.shade(TERRAIN_SS_LITE[2], 1.1), 0.4);
    Px.hLine(t, 9, 0, 7, Px.shade(TERRAIN_SS_LITE[2], 1.1), 0.4);
    Px.vLine(t, 0, 0, 7, Px.shade(TERRAIN_SS_LITE[2], 1.1), 0.4);
    Px.vLine(t, 0, 9, 7, Px.shade(TERRAIN_SS_LITE[2], 1.1), 0.4);
    Px.edgeShade(t, 0.90);
    A.add('cut_sandstone', t);
  }

  // red_sandstone_top — red sand compacted with concentric rings
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('red_sandstone_top');
    Px.noiseFill(t, TERRAIN_RSSTOP_PAL, { freq: 0.28, octaves: 2, seed: s, contrast: 1.12, period: 16 });
    Px.grain(t, TERRAIN_RSSTOP_PAL, { seed: s + 3, density: 0.30 });
    for (let ring = 1; ring <= 3; ring++) {
      Px.circleOutline(t, 8, 8, ring * 2.5, Px.shade(TERRAIN_RSSTOP_PAL[1], 0.84), 0.30);
    }
    Px.edgeShade(t, 0.95);
    A.add('red_sandstone_top', t);
  }

  // red_sandstone — red sedimentary strata bands
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('red_sandstone');
    const bandH = 4;
    for (let band = 0; band < 4; band++) {
      const pal = band % 2 === 0 ? TERRAIN_RSS_MID : (band === 1 ? TERRAIN_RSS_DARK : TERRAIN_RSS_LITE);
      for (let y = band * bandH; y < (band + 1) * bandH && y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const n = Px.fbm(x, y, 0.45, 2, s + band * 17, 16);
          const idx = Math.min(Math.floor(n * pal.length), pal.length - 1);
          Px.setPx(t, x, y, pal[idx]);
        }
      }
      if (band < 3) {
        Px.hLine(t, 0, (band + 1) * bandH - 1, 16, Px.shade(TERRAIN_RSS_DARK[0], 0.78), 0.60);
      }
    }
    Px.grain(t, TERRAIN_RSSTOP_PAL, { seed: s + 5, density: 0.18 });
    Px.edgeShade(t, 0.95);
    A.add('red_sandstone', t);
  }

  // red_sandstone_bottom — coarse red sandstone
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('red_sandstone_bottom');
    Px.noiseFill(t, TERRAIN_RSSBOT_PAL, { freq: 0.30, octaves: 3, seed: s, contrast: 1.35, period: 16 });
    Px.grain(t, TERRAIN_RSSBOT_PAL, { seed: s + 7, density: 0.45 });
    Px.speckle(t, [TERRAIN_RSSBOT_PAL[0], TERRAIN_RSSBOT_PAL[1]], { density: 0.10, seed: s + 12 });
    Px.edgeShade(t, 0.95);
    A.add('red_sandstone_bottom', t);
  }

  // gravel — individual rounded pebbles of mixed grey/brown with dark rims
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('gravel');
    // base fill
    Px.noiseFill(t, TERRAIN_GRAVEL_PALS[0], { freq: 0.28, octaves: 2, seed: s, contrast: 1.1, period: 16 });
    // draw 12-16 pebbles
    const nPebbles = 12 + Math.floor(TERRAIN_h2(0, 0, s + 60) * 5);
    for (let i = 0; i < nPebbles; i++) {
      const cx2 = 1.5 + TERRAIN_h2(i, 0, s + 70) * 13;
      const cy2 = 1.5 + TERRAIN_h2(i, 1, s + 70) * 13;
      const rx2 = 1.0 + TERRAIN_h2(i, 2, s + 70) * 2.0;
      const ry2 = 0.8 + TERRAIN_h2(i, 3, s + 70) * 1.8;
      const palIdx = Math.floor(TERRAIN_h2(i, 4, s + 70) * 3);
      const pal2 = TERRAIN_GRAVEL_PALS[palIdx];
      const pebbleCol = pal2[1 + Math.floor(TERRAIN_h2(i, 5, s + 70) * 2)];
      // fill pebble
      Px.ellipse(t, cx2, cy2, rx2, ry2, pebbleCol);
      // dark rim
      Px.ellipse(t, cx2, cy2, rx2 + 0.5, ry2 + 0.5, Px.shade(pal2[0], 0.65), 0.70);
      // top-left highlight
      Px.setPx(t, Math.round(cx2 - rx2 * 0.4), Math.round(cy2 - ry2 * 0.4), Px.shade(pal2[2], 1.25));
    }
    // fill gaps with dark speckle
    Px.speckle(t, [TERRAIN_GRAVEL_PALS[2][0], TERRAIN_GRAVEL_PALS[2][1]], { density: 0.08, seed: s + 80 });
    Px.edgeShade(t, 0.95);
    A.add('gravel', t);
  }

  // clay — pale blue-grey smooth clay with faint mottling
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('clay');
    Px.noiseFill(t, TERRAIN_CLAY_PAL, { freq: 0.22, octaves: 3, seed: s, contrast: 1.05, period: 16 });
    Px.speckle(t, [TERRAIN_CLAY_PAL[1], TERRAIN_CLAY_PAL[2]], { density: 0.08, seed: s + 5 });
    Px.edgeShade(t, 0.95);
    A.add('clay', t);
  }

  // terracotta — plain fired clay, muted orange-brown, faint horizontal wash
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('terracotta');
    Px.noiseFill(t, TERRAIN_TC_BASE, { freq: 0.28, octaves: 2, seed: s, contrast: 1.15, period: 16 });
    // faint horizontal wash bands
    for (let row = 0; row < 4; row++) {
      const wy = row * 4 + 1;
      for (let x = 0; x < 16; x++) {
        Px.setPx(t, x, wy, Px.shade(TERRAIN_TC_BASE[1], 0.90), 0.30);
      }
    }
    Px.speckle(t, [TERRAIN_TC_BASE[0], TERRAIN_TC_BASE[3]], { density: 0.08, seed: s + 9 });
    Px.edgeShade(t, 0.92);
    A.add('terracotta', t);
  }

  // white_terracotta — off-white fired clay, faint speckle
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('white_terracotta');
    Px.noiseFill(t, TERRAIN_TC_WHITE, { freq: 0.26, octaves: 2, seed: s, contrast: 1.10, period: 16 });
    for (let row = 0; row < 4; row++) {
      const wy = row * 4 + 1;
      for (let x = 0; x < 16; x++) {
        Px.setPx(t, x, wy, Px.shade(TERRAIN_TC_WHITE[1], 0.88), 0.28);
      }
    }
    Px.speckle(t, [TERRAIN_TC_WHITE[0], TERRAIN_TC_WHITE[3]], { density: 0.07, seed: s + 9 });
    Px.edgeShade(t, 0.92);
    A.add('white_terracotta', t);
  }

  // orange_terracotta — burnt orange fired clay
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('orange_terracotta');
    Px.noiseFill(t, TERRAIN_TC_ORANGE, { freq: 0.28, octaves: 2, seed: s, contrast: 1.15, period: 16 });
    for (let row = 0; row < 4; row++) {
      const wy = row * 4 + 1;
      for (let x = 0; x < 16; x++) {
        Px.setPx(t, x, wy, Px.shade(TERRAIN_TC_ORANGE[1], 0.88), 0.30);
      }
    }
    Px.speckle(t, [TERRAIN_TC_ORANGE[0], TERRAIN_TC_ORANGE[3]], { density: 0.08, seed: s + 9 });
    Px.edgeShade(t, 0.92);
    A.add('orange_terracotta', t);
  }

  // yellow_terracotta — ochre fired clay
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('yellow_terracotta');
    Px.noiseFill(t, TERRAIN_TC_YELLOW, { freq: 0.28, octaves: 2, seed: s, contrast: 1.15, period: 16 });
    for (let row = 0; row < 4; row++) {
      const wy = row * 4 + 1;
      for (let x = 0; x < 16; x++) {
        Px.setPx(t, x, wy, Px.shade(TERRAIN_TC_YELLOW[1], 0.88), 0.30);
      }
    }
    Px.speckle(t, [TERRAIN_TC_YELLOW[0], TERRAIN_TC_YELLOW[3]], { density: 0.08, seed: s + 9 });
    Px.edgeShade(t, 0.92);
    A.add('yellow_terracotta', t);
  }

  // red_terracotta — deep brick-red fired clay
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('red_terracotta');
    Px.noiseFill(t, TERRAIN_TC_RED, { freq: 0.28, octaves: 2, seed: s, contrast: 1.18, period: 16 });
    for (let row = 0; row < 4; row++) {
      const wy = row * 4 + 1;
      for (let x = 0; x < 16; x++) {
        Px.setPx(t, x, wy, Px.shade(TERRAIN_TC_RED[1], 0.88), 0.30);
      }
    }
    Px.speckle(t, [TERRAIN_TC_RED[0], TERRAIN_TC_RED[3]], { density: 0.08, seed: s + 9 });
    Px.edgeShade(t, 0.92);
    A.add('red_terracotta', t);
  }

  // brown_terracotta — dark chocolate fired clay
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('brown_terracotta');
    Px.noiseFill(t, TERRAIN_TC_BROWN, { freq: 0.28, octaves: 2, seed: s, contrast: 1.18, period: 16 });
    for (let row = 0; row < 4; row++) {
      const wy = row * 4 + 1;
      for (let x = 0; x < 16; x++) {
        Px.setPx(t, x, wy, Px.shade(TERRAIN_TC_BROWN[1], 0.88), 0.30);
      }
    }
    Px.speckle(t, [TERRAIN_TC_BROWN[0], TERRAIN_TC_BROWN[3]], { density: 0.08, seed: s + 9 });
    Px.edgeShade(t, 0.92);
    A.add('brown_terracotta', t);
  }

  // light_gray_terracotta — grey-mauve fired clay
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('light_gray_terracotta');
    Px.noiseFill(t, TERRAIN_TC_LGRAY, { freq: 0.28, octaves: 2, seed: s, contrast: 1.12, period: 16 });
    for (let row = 0; row < 4; row++) {
      const wy = row * 4 + 1;
      for (let x = 0; x < 16; x++) {
        Px.setPx(t, x, wy, Px.shade(TERRAIN_TC_LGRAY[1], 0.88), 0.28);
      }
    }
    Px.speckle(t, [TERRAIN_TC_LGRAY[0], TERRAIN_TC_LGRAY[3]], { density: 0.07, seed: s + 9 });
    Px.edgeShade(t, 0.92);
    A.add('light_gray_terracotta', t);
  }

  // snow — near-white with faint blue-grey dimples and sparkle pixels
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('snow');
    Px.noiseFill(t, TERRAIN_SNOW_PAL, { freq: 0.20, octaves: 2, seed: s, contrast: 0.90, period: 16 });
    // faint blue-grey dimples
    Px.speckle(t, [Px.shade(TERRAIN_SNOW_PAL[1], 0.88)], { density: 0.09, seed: s + 6 });
    // 3-4 bright sparkle pixels
    for (let i = 0; i < 4; i++) {
      const sx = Math.floor(TERRAIN_h2(i, 0, s + 100) * 16);
      const sy2 = Math.floor(TERRAIN_h2(i, 1, s + 100) * 16);
      Px.setPx(t, sx, sy2, [255, 255, 255, 255]);
    }
    Px.edgeShade(t, 0.95);
    A.add('snow', t);
  }

  // snow_side — snow cap over a thin dirt strip at the bottom
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('snow_side');
    // snow fills most of the tile
    Px.noiseFill(t, TERRAIN_SNOW_PAL, { freq: 0.20, octaves: 2, seed: s, contrast: 0.90, period: 16 });
    Px.speckle(t, [Px.shade(TERRAIN_SNOW_PAL[1], 0.88)], { density: 0.09, seed: s + 6 });
    // dirt strip at bottom 2 rows
    for (let y = 14; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = Px.fbm(x, y, 0.4, 2, s + 20, 16);
        const idx = Math.floor(n * TERRAIN_DIRT_PAL.length);
        Px.setPx(t, x, y, TERRAIN_DIRT_PAL[Math.min(idx, TERRAIN_DIRT_PAL.length - 1)]);
      }
    }
    Px.edgeShade(t, 0.92);
    A.add('snow_side', t, { wrap: false });
  }

  // ice — translucent pale blue with long diagonal fracture lines and specular
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('ice');
    // partial alpha base (~200)
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = Px.fbm(x, y, 0.22, 2, s, 16);
        const idx = Math.min(Math.floor(n * TERRAIN_ICE_PAL.length), TERRAIN_ICE_PAL.length - 1);
        const col = TERRAIN_ICE_PAL[idx];
        const a = 180 + Math.floor(n * 40);
        Px.setPx(t, x, y, [col[0], col[1], col[2], a]);
      }
    }
    // long diagonal fracture lines
    Px.line(t, 0, 3, 12, 15, [60, 100, 150, 200]);
    Px.line(t, 3, 0, 15, 12, [60, 100, 150, 200]);
    Px.line(t, 8, 0, 16, 8, [80, 120, 170, 180], 0.7);
    Px.line(t, 0, 9, 7, 16, [80, 120, 170, 180], 0.7);
    // specular streak
    Px.specStreak(t, [230, 245, 255, 255], { x0: 1, y0: 12, len: 7, alpha: 0.65, thickness: 1 });
    A.add('ice', t);
  }

  // packed_ice — denser blue ice, tighter fractures, less transparent
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('packed_ice');
    Px.noiseFill(t, TERRAIN_PICE_PAL, { freq: 0.30, octaves: 3, seed: s, contrast: 1.20, period: 16 });
    // tighter fracture lines
    Px.line(t, 0, 5, 10, 15, Px.shade(TERRAIN_PICE_PAL[0], 0.65));
    Px.line(t, 5, 0, 15, 10, Px.shade(TERRAIN_PICE_PAL[0], 0.65));
    Px.line(t, 0, 12, 4, 16, Px.shade(TERRAIN_PICE_PAL[0], 0.72), 0.8);
    Px.line(t, 12, 0, 16, 4, Px.shade(TERRAIN_PICE_PAL[0], 0.72), 0.8);
    Px.line(t, 7, 2, 14, 9, Px.shade(TERRAIN_PICE_PAL[0], 0.70), 0.7);
    Px.specStreak(t, [200, 225, 255, 255], { x0: 2, y0: 13, len: 6, alpha: 0.60 });
    Px.edgeShade(t, 0.92);
    A.add('packed_ice', t);
  }

  // blue_ice — saturated deep cyan ice, smooth with bright highlights
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('blue_ice');
    Px.noiseFill(t, TERRAIN_BICE_PAL, { freq: 0.25, octaves: 2, seed: s, contrast: 1.25, period: 16 });
    // smooth surface — soft noise
    Px.softenNoise(t, 0.4);
    // bright highlight lines
    Px.line(t, 1, 4, 11, 14, Px.shade(TERRAIN_BICE_PAL[4], 1.25), 0.55);
    Px.line(t, 4, 1, 14, 11, Px.shade(TERRAIN_BICE_PAL[4], 1.20), 0.50);
    // sparkle pixels
    Px.setPx(t, 2, 2, [200, 240, 255, 255]);
    Px.setPx(t, 13, 13, [180, 220, 255, 255]);
    Px.specStreak(t, [220, 240, 255, 255], { x0: 1, y0: 14, len: 8, alpha: 0.70 });
    Px.edgeShade(t, 0.90);
    A.add('blue_ice', t);
  }

}
