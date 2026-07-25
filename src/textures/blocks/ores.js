// ores.js — procedural ore block textures
// All top-level names prefixed with ORE_ to ensure global uniqueness.
import { Px } from '../px.js';

// ---- stone base palettes (matching stone.js exactly) -----------------------
const ORE_STONE_PAL = Px.ramp('#8a8a8a', 5, 0.68, 1.22);
const ORE_DS_PAL = Px.ramp('#2e3240', 5, 0.60, 1.35);
const ORE_NETHER_PAL = Px.ramp('#6a2424', 5, 0.58, 1.28);

// ---- ore mineral ramps ------------------------------------------------------
// coal: matte black
const ORE_COAL_RAMP = Px.ramp('#1c1c1c', 4, 0.55, 1.30);
// iron: tan-pink (darker so blobs read against stone, not washed out)
const ORE_IRON_RAMP = Px.ramp('#c89068', 4, 0.65, 1.22);
// copper: teal-green oxidised
const ORE_COPPER_RAMP = Px.ramp('#48a878', 4, 0.60, 1.32);
const ORE_COPPER_ORANGE_RAMP = Px.ramp('#c07040', 4, 0.62, 1.25);
// gold: saturated yellow
const ORE_GOLD_RAMP = Px.ramp('#e8c000', 4, 0.65, 1.40);
// redstone: crimson
const ORE_REDSTONE_RAMP = Px.ramp('#c80000', 4, 0.58, 1.38);
// lapis: royal blue (brighter to be vivid against stone)
const ORE_LAPIS_RAMP = Px.ramp('#2040b8', 5, 0.55, 1.38);
// diamond: cyan
const ORE_DIAMOND_RAMP = Px.ramp('#30c8d8', 5, 0.60, 1.40);
// emerald: vivid green
const ORE_EMERALD_RAMP = Px.ramp('#10c848', 5, 0.58, 1.38);
// quartz: white
const ORE_QUARTZ_RAMP = Px.ramp('#e8e4e0', 4, 0.72, 1.20);
// ancient debris: dark brown-grey
const ORE_DEBRIS_PAL = Px.ramp('#3a2a1e', 5, 0.55, 1.35);
const ORE_DEBRIS_SWIRL = Px.ramp('#5a3828', 4, 0.60, 1.30);

// ---- deterministic hash (no Math.random) ------------------------------------
function ORE_h2(x, y, s) {
  let v = (x * 1619 + y * 31337 + s * 1234567) | 0;
  v = (v ^ (v >>> 13)) * 0x45d9f3b;
  v = (v ^ (v >>> 15));
  return (v >>> 0) / 0xffffffff;
}

// ---- shared base painter + oreBlobs helper ----------------------------------
// baseType: 'stone' | 'deepslate' | 'nether'
function ORE_paintBase(t, baseType, seed) {
  if (baseType === 'stone') {
    Px.noiseFill(t, ORE_STONE_PAL, { freq: 0.28, octaves: 3, seed, contrast: 1.25, period: 16 });
    // hairline cracks like stone.js
    let cx = (4 + (ORE_h2(seed, 1, 7) * 8) | 0);
    let cy = (2 + (ORE_h2(seed, 2, 7) * 6) | 0);
    for (let i = 0; i < 4; i++) {
      Px.setPx(t, cx, cy, Px.shade(ORE_STONE_PAL[0], 0.65), 0.70);
      const d = (ORE_h2(i, seed, 19) * 4) | 0;
      if (d === 0) cx = Math.min(15, cx + 1);
      else if (d === 1) cx = Math.max(0, cx - 1);
      else if (d === 2) cy = Math.min(15, cy + 1);
      else cy = Math.max(0, cy - 1);
    }
  } else if (baseType === 'deepslate') {
    Px.noiseFill(t, ORE_DS_PAL, { freq: 0.25, octaves: 3, seed, contrast: 1.30, period: 16 });
    // vertical streaks like deepslate in stone.js
    Px.streaks(t, [ORE_DS_PAL[0], ORE_DS_PAL[1]], {
      vertical: true, density: 0.55, seed: seed + 3, minLen: 3, maxLen: 10,
    });
    for (let y = 0; y < 16; y++) {
      const fade = Math.sin(y * 0.8) * 0.04;
      for (let x = 0; x < 16; x++) {
        const px = Px.getPx(t, x, y);
        Px.setPx(t, x, y, Px.shade(px, 1.0 + fade));
      }
    }
  } else {
    // nether: dark red porous rock
    Px.noiseFill(t, ORE_NETHER_PAL, { freq: 0.30, octaves: 3, seed, contrast: 1.40, period: 16 });
    // dark pores
    for (let i = 0; i < 7; i++) {
      const bx = (ORE_h2(i, 0, seed + 80) * 14) | 0;
      const by = (ORE_h2(i, 1, seed + 80) * 14) | 0;
      const rx = 0.8 + ORE_h2(i, 2, seed + 80) * 1.0;
      const ry = 0.6 + ORE_h2(i, 3, seed + 80) * 0.8;
      Px.ellipse(t, bx, by, rx, ry, Px.shade(ORE_NETHER_PAL[0], 0.60), 0.75);
    }
  }
}

// ---- main ore painter: base + blobs -----------------------------------------
function ORE_paintOre(t, baseType, oreRamp, blobOpts, seed) {
  ORE_paintBase(t, baseType, seed);
  Px.oreBlobs(t, oreRamp, { seed: seed + 100, ...blobOpts });
}

export function registerOreTiles(A, C) {

  // coal_ore — stone base with matte black coal blobs
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('coal_ore');
    ORE_paintOre(t, 'stone', ORE_COAL_RAMP, { count: 5, minR: 1.4, maxR: 2.6, rim: '#111111', sparkle: true }, s);
    Px.edgeShade(t, 0.92);
    A.add('coal_ore', t);
  }

  // iron_ore — stone base with tan-pink iron blobs
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('iron_ore');
    ORE_paintOre(t, 'stone', ORE_IRON_RAMP, { count: 4, minR: 1.2, maxR: 2.2, rim: '#8a6a58', sparkle: true }, s);
    Px.edgeShade(t, 0.92);
    A.add('iron_ore', t);
  }

  // copper_ore — stone base with teal-orange copper blobs
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('copper_ore');
    ORE_paintBase(t, 'stone', s);
    // alternate teal and orange blobs for oxidised copper look
    Px.oreBlobs(t, ORE_COPPER_RAMP, { seed: s + 100, count: 3, minR: 1.2, maxR: 2.0, rim: '#1a5838', sparkle: true });
    Px.oreBlobs(t, ORE_COPPER_ORANGE_RAMP, { seed: s + 200, count: 2, minR: 1.0, maxR: 1.8, rim: '#703818', sparkle: true });
    Px.edgeShade(t, 0.92);
    A.add('copper_ore', t);
  }

  // gold_ore — stone base with saturated yellow-gold blobs
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('gold_ore');
    ORE_paintOre(t, 'stone', ORE_GOLD_RAMP, { count: 4, minR: 1.1, maxR: 2.0, rim: '#705800', sparkle: true }, s);
    Px.edgeShade(t, 0.92);
    A.add('gold_ore', t);
  }

  // redstone_ore — stone base with crimson blobs, radial glow under each
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('redstone_ore');
    ORE_paintBase(t, 'stone', s);
    // pre-glow under each blob position
    for (let i = 0; i < 5; i++) {
      const gx = 2 + (ORE_h2(i, 0, s + 300) * 12) | 0;
      const gy = 2 + (ORE_h2(i, 1, s + 300) * 12) | 0;
      Px.radialGlow(t, gx, gy, 3.5, [255, 60, 40, 180], [180, 0, 0, 0], { power: 1.8, alpha: 0.40 });
    }
    Px.oreBlobs(t, ORE_REDSTONE_RAMP, { seed: s + 100, count: 5, minR: 1.1, maxR: 2.1, rim: '#5a0000', sparkle: true });
    Px.edgeShade(t, 0.92);
    A.add('redstone_ore', t);
  }

  // lapis_ore — stone base with royal-blue blobs
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('lapis_ore');
    ORE_paintOre(t, 'stone', ORE_LAPIS_RAMP, { count: 4, minR: 1.2, maxR: 2.2, rim: '#0a1848', sparkle: true }, s);
    // lighter flecks on surface of blobs
    Px.speckle(t, [Px.shade(ORE_LAPIS_RAMP[4], 1.25)], { density: 0.04, seed: s + 400 });
    Px.edgeShade(t, 0.92);
    A.add('lapis_ore', t);
  }

  // diamond_ore — stone base with cyan crystal blobs, white facet highlights
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('diamond_ore');
    ORE_paintBase(t, 'stone', s);
    Px.oreBlobs(t, ORE_DIAMOND_RAMP, { seed: s + 100, count: 4, minR: 1.0, maxR: 1.8, rim: '#186878', sparkle: true });
    // add white facet highlights (cut crystal look) — 2-3 per blob
    const blobSeeds = [s + 100, s + 131, s + 162, s + 193];
    for (let i = 0; i < 4; i++) {
      const bx = (2 + ORE_h2(i, 0, blobSeeds[i]) * 12) | 0;
      const by = (2 + ORE_h2(i, 1, blobSeeds[i]) * 12) | 0;
      Px.setPx(t, bx, by, [255, 255, 255, 255], 0.85);
      Px.setPx(t, bx + 1, by, [220, 245, 255, 255], 0.65);
      Px.setPx(t, bx, by + 1, [200, 240, 255, 255], 0.55);
    }
    Px.edgeShade(t, 0.92);
    A.add('diamond_ore', t);
  }

  // emerald_ore — stone base with vivid green crystal blobs
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('emerald_ore');
    ORE_paintBase(t, 'stone', s);
    Px.oreBlobs(t, ORE_EMERALD_RAMP, { seed: s + 100, count: 3, minR: 1.0, maxR: 1.9, rim: '#084820', sparkle: true });
    // white facet highlights
    const eSeeds = [s + 100, s + 131, s + 162];
    for (let i = 0; i < 3; i++) {
      const bx = (2 + ORE_h2(i, 0, eSeeds[i]) * 12) | 0;
      const by = (2 + ORE_h2(i, 1, eSeeds[i]) * 12) | 0;
      Px.setPx(t, bx, by, [255, 255, 255, 255], 0.88);
      Px.setPx(t, bx + 1, by, [200, 255, 220, 255], 0.65);
      Px.setPx(t, bx, by + 1, [180, 255, 200, 255], 0.55);
    }
    Px.edgeShade(t, 0.92);
    A.add('emerald_ore', t);
  }

  // deepslate_coal_ore — deepslate base, black coal blobs
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('deepslate_coal_ore');
    ORE_paintOre(t, 'deepslate', ORE_COAL_RAMP, { count: 5, minR: 1.4, maxR: 2.6, rim: '#0a0a0a', sparkle: true }, s);
    Px.edgeShade(t, 0.90);
    A.add('deepslate_coal_ore', t);
  }

  // deepslate_iron_ore — deepslate base, tan iron blobs
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('deepslate_iron_ore');
    ORE_paintOre(t, 'deepslate', ORE_IRON_RAMP, { count: 4, minR: 1.2, maxR: 2.2, rim: '#7a5848', sparkle: true }, s);
    Px.edgeShade(t, 0.90);
    A.add('deepslate_iron_ore', t);
  }

  // deepslate_copper_ore — deepslate base, teal copper blobs
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('deepslate_copper_ore');
    ORE_paintBase(t, 'deepslate', s);
    Px.oreBlobs(t, ORE_COPPER_RAMP, { seed: s + 100, count: 3, minR: 1.1, maxR: 1.9, rim: '#0e4028', sparkle: true });
    Px.oreBlobs(t, ORE_COPPER_ORANGE_RAMP, { seed: s + 200, count: 2, minR: 1.0, maxR: 1.7, rim: '#602808', sparkle: true });
    Px.edgeShade(t, 0.90);
    A.add('deepslate_copper_ore', t);
  }

  // deepslate_gold_ore — deepslate base, gold blobs
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('deepslate_gold_ore');
    ORE_paintOre(t, 'deepslate', ORE_GOLD_RAMP, { count: 4, minR: 1.1, maxR: 2.0, rim: '#5a4000', sparkle: true }, s);
    Px.edgeShade(t, 0.90);
    A.add('deepslate_gold_ore', t);
  }

  // deepslate_redstone_ore — deepslate base, red blobs with glow
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('deepslate_redstone_ore');
    ORE_paintBase(t, 'deepslate', s);
    for (let i = 0; i < 5; i++) {
      const gx = (2 + ORE_h2(i, 0, s + 300) * 12) | 0;
      const gy = (2 + ORE_h2(i, 1, s + 300) * 12) | 0;
      Px.radialGlow(t, gx, gy, 3.0, [255, 50, 30, 160], [160, 0, 0, 0], { power: 1.8, alpha: 0.38 });
    }
    Px.oreBlobs(t, ORE_REDSTONE_RAMP, { seed: s + 100, count: 5, minR: 1.1, maxR: 2.1, rim: '#440000', sparkle: true });
    Px.edgeShade(t, 0.90);
    A.add('deepslate_redstone_ore', t);
  }

  // deepslate_lapis_ore — deepslate base, blue blobs
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('deepslate_lapis_ore');
    ORE_paintOre(t, 'deepslate', ORE_LAPIS_RAMP, { count: 4, minR: 1.2, maxR: 2.2, rim: '#040c30', sparkle: true }, s);
    Px.speckle(t, [Px.shade(ORE_LAPIS_RAMP[4], 1.20)], { density: 0.04, seed: s + 400 });
    Px.edgeShade(t, 0.90);
    A.add('deepslate_lapis_ore', t);
  }

  // deepslate_diamond_ore — deepslate base, cyan crystal blobs with facets
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('deepslate_diamond_ore');
    ORE_paintBase(t, 'deepslate', s);
    Px.oreBlobs(t, ORE_DIAMOND_RAMP, { seed: s + 100, count: 4, minR: 1.0, maxR: 1.8, rim: '#0c5060', sparkle: true });
    const ddSeeds = [s + 100, s + 131, s + 162, s + 193];
    for (let i = 0; i < 4; i++) {
      const bx = (2 + ORE_h2(i, 0, ddSeeds[i]) * 12) | 0;
      const by = (2 + ORE_h2(i, 1, ddSeeds[i]) * 12) | 0;
      Px.setPx(t, bx, by, [255, 255, 255, 255], 0.85);
      Px.setPx(t, bx + 1, by, [200, 248, 255, 255], 0.65);
      Px.setPx(t, bx, by + 1, [180, 240, 255, 255], 0.55);
    }
    Px.edgeShade(t, 0.90);
    A.add('deepslate_diamond_ore', t);
  }

  // deepslate_emerald_ore — deepslate base, green crystal blobs
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('deepslate_emerald_ore');
    ORE_paintBase(t, 'deepslate', s);
    Px.oreBlobs(t, ORE_EMERALD_RAMP, { seed: s + 100, count: 3, minR: 1.0, maxR: 1.9, rim: '#023010', sparkle: true });
    const deSeeds = [s + 100, s + 131, s + 162];
    for (let i = 0; i < 3; i++) {
      const bx = (2 + ORE_h2(i, 0, deSeeds[i]) * 12) | 0;
      const by = (2 + ORE_h2(i, 1, deSeeds[i]) * 12) | 0;
      Px.setPx(t, bx, by, [255, 255, 255, 255], 0.88);
      Px.setPx(t, bx + 1, by, [180, 255, 200, 255], 0.65);
    }
    Px.edgeShade(t, 0.90);
    A.add('deepslate_emerald_ore', t);
  }

  // nether_gold_ore — netherrack base with gold flecks
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('nether_gold_ore');
    ORE_paintOre(t, 'nether', ORE_GOLD_RAMP, { count: 5, minR: 0.9, maxR: 1.8, rim: '#5a3800', sparkle: true }, s);
    Px.edgeShade(t, 0.92);
    A.add('nether_gold_ore', t);
  }

  // nether_quartz_ore — netherrack base with white quartz blobs
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('nether_quartz_ore');
    ORE_paintOre(t, 'nether', ORE_QUARTZ_RAMP, { count: 4, minR: 1.1, maxR: 2.2, rim: '#7a7870', sparkle: true }, s);
    Px.edgeShade(t, 0.92);
    A.add('nether_quartz_ore', t);
  }

  // ancient_debris_top — dark brown-grey metal with a warped netherite swirl core
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('ancient_debris_top');
    // dark metal base
    Px.noiseFill(t, ORE_DEBRIS_PAL, { freq: 0.22, octaves: 3, seed: s, contrast: 1.30, period: 16 });
    // concentric wobbled arcs (swirl core)
    const cx = 7.5, cy = 7.5;
    for (let ring = 1; ring <= 5; ring++) {
      const r = ring * 1.5;
      const steps = Math.max(12, Math.ceil(r * 10));
      for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        // wobble the ring with noise
        const wob = Px.fbm(Math.cos(angle) * 3 + 8, Math.sin(angle) * 3 + 8, 0.6, 2, s + ring * 31) * 1.6 - 0.8;
        const rr = r + wob;
        const px = Math.round(cx + Math.cos(angle) * rr);
        const py = Math.round(cy + Math.sin(angle) * rr);
        const col = ring % 2 === 0
          ? ORE_DEBRIS_PAL[ring % ORE_DEBRIS_PAL.length]
          : ORE_DEBRIS_SWIRL[ring % ORE_DEBRIS_SWIRL.length];
        Px.setPx(t, px, py, col, 0.80);
      }
    }
    // bright centre core pixel
    Px.setPx(t, 8, 8, Px.shade(ORE_DEBRIS_SWIRL[3], 1.40), 0.90);
    Px.setPx(t, 7, 8, Px.shade(ORE_DEBRIS_SWIRL[2], 1.20), 0.70);
    Px.setPx(t, 8, 7, Px.shade(ORE_DEBRIS_SWIRL[2], 1.20), 0.70);
    // outer rim speckle of lighter metal flecks
    Px.speckle(t, [ORE_DEBRIS_PAL[3], ORE_DEBRIS_PAL[4]], { density: 0.06, seed: s + 50 });
    Px.edgeShade(t, 0.90);
    A.add('ancient_debris_top', t);
  }

  // ancient_debris_side — dark scorched metal slab with brown crust bands
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('ancient_debris_side');
    // dark metal base
    Px.noiseFill(t, ORE_DEBRIS_PAL, { freq: 0.22, octaves: 3, seed: s, contrast: 1.35, period: 16 });
    // horizontal crust bands (scorched banding)
    const bandCols = [
      Px.shade(ORE_DEBRIS_PAL[1], 1.15),
      Px.shade(ORE_DEBRIS_PAL[2], 0.82),
      Px.shade(ORE_DEBRIS_SWIRL[1], 1.10),
      Px.shade(ORE_DEBRIS_PAL[0], 0.70),
    ];
    const bandRows = [3, 7, 10, 13];
    for (let bi = 0; bi < bandRows.length; bi++) {
      const by = bandRows[bi];
      for (let x = 0; x < 16; x++) {
        const n = Px.fbm(x, by, 0.55, 2, s + bi * 11, 16);
        const wobY = by + ((n > 0.55 ? 1 : n < 0.45 ? -1 : 0));
        Px.setPx(t, x, wobY, bandCols[bi], 0.75);
      }
    }
    // scorched dark spots
    for (let i = 0; i < 6; i++) {
      const bx = (ORE_h2(i, 0, s + 90) * 14) | 0;
      const by = (ORE_h2(i, 1, s + 90) * 14) | 0;
      Px.ellipse(t, bx, by, 0.9 + ORE_h2(i, 2, s + 90) * 1.1, 0.7 + ORE_h2(i, 3, s + 90) * 0.9,
        Px.shade(ORE_DEBRIS_PAL[0], 0.55), 0.65);
    }
    // lighter metal flecks on surface
    Px.speckle(t, [ORE_DEBRIS_PAL[3], ORE_DEBRIS_PAL[4]], { density: 0.06, seed: s + 60 });
    Px.edgeShade(t, 0.90);
    A.add('ancient_debris_side', t, { wrap: false });
  }

}
