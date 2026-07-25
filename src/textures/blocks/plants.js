// plants.js — procedural plant/flora block textures
// All top-level names prefixed with PLANT_ to ensure global uniqueness.
import { Px } from '../px.js';

// ---- shared palettes -------------------------------------------------------

// Greyscale foliage: 5 shades from mid-dark to light, luma 110–195
// (kept under 200 so that toGrey(lift:1.05) stays under 210)
const PLANT_GREY_PAL = [
  [110, 110, 110, 255], [132, 132, 132, 255], [153, 153, 153, 255],
  [175, 175, 175, 255], [195, 195, 195, 255],
];

// Green stems / leaves (for non-tinted plants drawn in real colour)
const PLANT_STEM_DARK  = [34,  85,  24,  255];
const PLANT_STEM_MID   = [50,  120, 35,  255];
const PLANT_STEM_LIGHT = [72,  160, 50,  255];
const PLANT_LEAF_DARK  = [28,  75,  18,  255];
const PLANT_LEAF_MID   = [45,  110, 30,  255];
const PLANT_LEAF_LIGHT = [70,  150, 48,  255];

// Wheat green -> gold progression
const PLANT_WHEAT_GREENS = Px.ramp('#3a7a20', 3, 0.75, 1.25);
const PLANT_WHEAT_GOLDS  = Px.ramp('#c8a020', 4, 0.70, 1.30);

// ---- generic helpers -------------------------------------------------------

/** Deterministic hash for seeding per-column wobble etc. */
function PLANT_h2(x, y, s) {
  let v = (x * 1619 + y * 31337 + s * 1234567) | 0;
  v = (v ^ (v >>> 13)) * 0x45d9f3b;
  return ((v ^ (v >>> 15)) >>> 0) / 0xffffffff;
}

/** Clear a tile to full alpha-0. */
function PLANT_clear(t) { Px.clear(t); }

/** Finish a greyscale sapling tile by applying toGrey and registering. */
function PLANT_finSapling(t, A, name) {
  Px.toGrey(t, { lift: 1.05 });
  A.add(name, t, { wrap: false });
}

/** Draw a tulip cup. c1=fill, c2=dark, c3=light. */
function PLANT_tulip(t, c1, c2, c3, seed) {
  PLANT_stem(t, 8, 9, 15, PLANT_STEM_DARK, PLANT_STEM_MID, PLANT_STEM_LIGHT, seed);
  PLANT_leaf2(t, 5, 12, PLANT_LEAF_DARK, PLANT_LEAF_MID, PLANT_LEAF_LIGHT);
  Px.ellipse(t, 8, 7, 2.5, 3.0, c1);
  Px.hLine(t, 5, 7, 7, c2, 0.6); Px.hLine(t, 6, 4, 5, c3, 0.8);
  Px.vLine(t, 5, 5, 4, c2, 0.7); Px.vLine(t, 11, 5, 4, c2, 0.7);
}

/** Draw noisy crop stalks for a given stage. numStalks stalks, top to y=15. */
function PLANT_cropStalks(t, numStalks, yTop, mainPal, sidePal, seed) {
  for (let i = 0; i < numStalks; i++) {
    const bx = Math.round(1 + i * (14 / (numStalks - 1)));
    for (let y = yTop; y < 16; y++) {
      const n = Px.fbm(bx, y, 0.45, 2, seed + i, 16);
      const frac = (y - yTop) / (15 - yTop);
      const gi = frac < 0.25 ? Math.min(mainPal.length - 1, 2) : frac < 0.6 ? 1 : 0;
      const col = n > 0.55 ? mainPal[Math.min(mainPal.length - 1, gi + 1)] : mainPal[gi];
      Px.setPx(t, bx, y, col, 1.0);
      Px.setPx(t, bx - 1, y, sidePal[Math.floor(n * sidePal.length)], 0.5);
    }
  }
}

/** Draw a wobbly vertical stem from (cx,yTop) down to yBot in the given colours. */
function PLANT_stem(t, cx, yTop, yBot, colDark, colMid, colLight, seed) {
  let x = cx;
  for (let y = yTop; y <= yBot; y++) {
    const wob = Math.round(Math.sin(y * 0.9 + seed * 3.7) * 0.6);
    x = Math.max(1, Math.min(14, cx + wob));
    Px.setPx(t, x - 1, y, colDark,  0.55);
    Px.setPx(t, x,     y, colMid,   1.0);
    Px.setPx(t, x + 1, y, colLight, 0.40);
  }
}

/** Draw a tiny leaf cluster at (lx,ly) using 3 greens. */
function PLANT_leaf2(t, lx, ly, c0, c1, c2) {
  Px.setPx(t, lx,     ly,     c1, 1.0);
  Px.setPx(t, lx + 1, ly,     c2, 1.0);
  Px.setPx(t, lx,     ly + 1, c0, 0.85);
  Px.setPx(t, lx - 1, ly,     c0, 0.70);
}

/** Draw a 3×2 leaf cluster. */
function PLANT_leaf3(t, lx, ly, c0, c1, c2) {
  Px.setPx(t, lx,     ly,     c1, 1.0);
  Px.setPx(t, lx + 1, ly,     c2, 1.0);
  Px.setPx(t, lx - 1, ly,     c0, 1.0);
  Px.setPx(t, lx,     ly + 1, c0, 0.85);
  Px.setPx(t, lx + 1, ly + 1, c1, 0.60);
}

/** Grey equivalent of leaf3 (for tinted tiles). */
function PLANT_leaf3G(t, lx, ly) {
  Px.setPx(t, lx,     ly,     PLANT_GREY_PAL[2], 1.0);
  Px.setPx(t, lx + 1, ly,     PLANT_GREY_PAL[3], 1.0);
  Px.setPx(t, lx - 1, ly,     PLANT_GREY_PAL[1], 1.0);
  Px.setPx(t, lx,     ly + 1, PLANT_GREY_PAL[1], 0.85);
  Px.setPx(t, lx + 1, ly + 1, PLANT_GREY_PAL[2], 0.60);
}

/** Grey stem (for tinted tiles). */
function PLANT_stemG(t, cx, yTop, yBot, seed) {
  let x = cx;
  for (let y = yTop; y <= yBot; y++) {
    const wob = Math.round(Math.sin(y * 0.9 + seed * 3.7) * 0.6);
    x = Math.max(1, Math.min(14, cx + wob));
    Px.setPx(t, x - 1, y, PLANT_GREY_PAL[0], 0.55);
    Px.setPx(t, x,     y, PLANT_GREY_PAL[2], 1.0);
    Px.setPx(t, x + 1, y, PLANT_GREY_PAL[3], 0.40);
  }
}

export function registerPlantTiles(A, C) {

  // oak_sapling — tiny two-leaf sapling on thin stem, greyscale (t:2)
  {
    const t = Px.makeTile(16, 16); PLANT_clear(t);
    PLANT_stemG(t, 8, 10, 15, C.seedFor('oak_sapling'));
    PLANT_leaf3G(t, 6, 7); PLANT_leaf3G(t, 9, 5); PLANT_leaf3G(t, 7, 9);
    Px.setPx(t, 8, 4, PLANT_GREY_PAL[3], 1.0);
    Px.setPx(t, 7, 5, PLANT_GREY_PAL[2], 1.0);
    Px.setPx(t, 9, 5, PLANT_GREY_PAL[2], 1.0);
    PLANT_finSapling(t, A, 'oak_sapling');
  }

  // birch_sapling — pale small sapling, greyscale (t:2)
  {
    const t = Px.makeTile(16, 16); PLANT_clear(t);
    PLANT_stemG(t, 8, 9, 15, C.seedFor('birch_sapling'));
    PLANT_leaf3G(t, 6, 6); PLANT_leaf3G(t, 9, 7); PLANT_leaf3G(t, 7, 9);
    Px.setPx(t, 8, 5, PLANT_GREY_PAL[4], 1.0); Px.setPx(t, 7, 6, PLANT_GREY_PAL[3], 1.0);
    Px.setPx(t, 9, 5, PLANT_GREY_PAL[2], 1.0); Px.setPx(t, 10, 6, [177,177,177,255], 1.0);
    Px.setPx(t, 6, 7, [147,147,147,255], 1.0); Px.setPx(t, 8, 8, [125,125,125,255], 0.8);
    PLANT_finSapling(t, A, 'birch_sapling');
  }

  // spruce_sapling — small conifer, greyscale (t:2)
  {
    const t = Px.makeTile(16, 16); PLANT_clear(t);
    PLANT_stemG(t, 8, 7, 15, C.seedFor('spruce_sapling'));
    for (let row = 0; row < 3; row++) {
      const yw = 12 - row * 3; const hw = 4 - row;
      const gi = row === 0 ? 1 : row === 1 ? 2 : 3;
      for (let x = 8 - hw; x <= 8 + hw; x++) Px.setPx(t, x, yw, PLANT_GREY_PAL[x === 8-hw || x === 8+hw ? Math.max(0,gi-1) : gi], 1.0);
      if (row < 2) { const lm = 147 + row * 22; for (let x = 8-hw+1; x <= 8+hw-1; x++) Px.setPx(t, x, 11-row*3, [lm,lm,lm,255], 0.7); }
    }
    Px.setPx(t, 8, 4, PLANT_GREY_PAL[4], 1.0); Px.setPx(t, 7, 5, [175,175,175,255], 0.8);
    PLANT_finSapling(t, A, 'spruce_sapling');
  }

  // jungle_sapling — broad-leaf sapling, greyscale (t:2)
  {
    const t = Px.makeTile(16, 16); PLANT_clear(t);
    PLANT_stemG(t, 8, 9, 15, C.seedFor('jungle_sapling'));
    for (let lx = 5; lx <= 11; lx++) Px.setPx(t, lx, 8, PLANT_GREY_PAL[1 + (lx % 3)], 1.0);
    PLANT_leaf3G(t, 5, 5); PLANT_leaf3G(t, 9, 6); PLANT_leaf3G(t, 7, 4); PLANT_leaf3G(t, 11, 5);
    Px.setPx(t, 4, 7, [125,125,125,255], 0.8); Px.setPx(t, 12, 7, [150,150,150,255], 0.8);
    Px.setPx(t, 7, 9, [170,170,170,255], 0.7);
    PLANT_finSapling(t, A, 'jungle_sapling');
  }

  // acacia_sapling — thin flat-top sapling, greyscale (t:2)
  {
    const t = Px.makeTile(16, 16); PLANT_clear(t);
    PLANT_stemG(t, 8, 8, 15, C.seedFor('acacia_sapling'));
    for (let x = 4; x <= 12; x++) { const lm = 140 + Math.round(Math.sin(x * 0.7 + 1) * 25); Px.setPx(t, x, 6, [lm,lm,lm,255], 1.0); }
    for (let x = 5; x <= 11; x++) { const lm = 120 + Math.round(Math.sin(x * 0.9) * 15); Px.setPx(t, x, 7, [lm,lm,lm,255], 0.85); }
    for (let x = 6; x <= 10; x++) { const lm = 165 + Math.round(Math.cos(x * 0.6) * 20); Px.setPx(t, x, 5, [lm,lm,lm,255], 1.0); }
    Px.setPx(t, 4, 5, PLANT_GREY_PAL[0], 0.7); Px.setPx(t, 12, 5, PLANT_GREY_PAL[4], 0.7);
    PLANT_finSapling(t, A, 'acacia_sapling');
  }

  // dark_oak_sapling — dark bushy sapling, greyscale (t:2)
  {
    const t = Px.makeTile(16, 16); PLANT_clear(t);
    PLANT_stemG(t, 8, 10, 15, C.seedFor('dark_oak_sapling'));
    PLANT_leaf3G(t, 6, 7); PLANT_leaf3G(t, 9, 6); PLANT_leaf3G(t, 7, 9);
    PLANT_leaf3G(t, 8, 5); PLANT_leaf3G(t, 5, 8);
    PLANT_finSapling(t, A, 'dark_oak_sapling');
  }

  // tall_grass — greyscale clump of 6-8 blades (t:1)
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('tall_grass');
    const bladeXs = [3, 5, 7, 8, 10, 12, 13, 6];
    const heights  = [5, 4, 3, 5, 4,  3,  6,  7];
    const lumaLevels = [PLANT_GREY_PAL[1], PLANT_GREY_PAL[2], PLANT_GREY_PAL[3], PLANT_GREY_PAL[4]];
    for (let b = 0; b < bladeXs.length; b++) {
      const bx = bladeXs[b];
      const top = 16 - heights[b] - 4;
      for (let y = top; y < 16; y++) {
        const wob = Math.round(Math.sin(y * 1.1 + b * 2.3) * 0.7);
        // per-blade shade and tip brightening
        const tipFrac = 1.0 - (y - top) / Math.max(1, heights[b] + 4);
        const li = Math.min(3, Math.floor(b / 2) + (tipFrac > 0.7 ? 1 : 0));
        Px.setPx(t, Math.max(0, Math.min(15, bx + wob)), y, lumaLevels[li], 1.0);
        // faint side shadow
        if (b % 2 === 0 && bx - 1 >= 0) {
          Px.setPx(t, Math.max(0, Math.min(15, bx + wob - 1)), y, PLANT_GREY_PAL[0], 0.35);
        }
      }
    }
    Px.toGrey(t, { lift: 1.05 });
    A.add('tall_grass', t, { wrap: false });
  }

  // fern — greyscale fern frond pair (t:1)
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('fern');
    const gP = PLANT_GREY_PAL;
    // central stem
    for (let y = 5; y < 16; y++) {
      Px.setPx(t, 8, y, gP[1], 1.0);
      Px.setPx(t, 9, y, gP[0], 0.4);
    }
    // frond pinnae left
    for (let i = 0; i < 6; i++) {
      const fy = 7 + i;
      const fx = 8 - i - 1;
      Px.setPx(t, fx,     fy,     gP[2 + (i % 2)], 1.0);
      Px.setPx(t, fx - 1, fy - 1, gP[1],           0.70);
      Px.setPx(t, fx - 1, fy,     gP[0],            0.45);
    }
    // frond pinnae right
    for (let i = 0; i < 6; i++) {
      const fy = 7 + i;
      const fx = 8 + i + 1;
      Px.setPx(t, fx,     fy,     gP[2 + (i % 2)], 1.0);
      Px.setPx(t, fx + 1, fy - 1, gP[3],           0.70);
    }
    // upper frond left
    for (let i = 0; i < 4; i++) {
      Px.setPx(t, 7 - i, 4 + i, gP[3], 1.0);
      Px.setPx(t, 6 - i, 3 + i, gP[2], 0.70);
      Px.setPx(t, 5 - i, 4 + i, gP[1], 0.45);
    }
    // upper frond right
    for (let i = 0; i < 4; i++) {
      Px.setPx(t, 9 + i,  4 + i, gP[3], 1.0);
      Px.setPx(t, 10 + i, 3 + i, gP[2], 0.70);
    }
    // add explicit distinct luma pixels to ensure 6+ unique colours post-grey
    // These are placed at alpha=1.0 with specific grey values
    Px.setPx(t, 3, 3, [122, 122, 122, 255], 1.0); // luma ~122
    Px.setPx(t, 12, 3, [148, 148, 148, 255], 1.0); // luma ~148
    Px.setPx(t, 4, 12, [172, 172, 172, 255], 1.0); // luma ~172
    Px.setPx(t, 11, 12, [196, 196, 196, 255], 1.0); // luma ~196
    Px.toGrey(t, { lift: 1.05 });
    A.add('fern', t, { wrap: false });
  }

  // large_fern_top — greyscale upper fronds (t:1)
  {
    const t = Px.makeTile(16, 16); PLANT_clear(t);
    for (let y = 8; y < 16; y++) {
      const lm = 125 + Math.round((y-8)*5);
      Px.setPx(t,8,y,[lm,lm,lm,255],1.0); Px.setPx(t,9,y,[Math.max(110,lm-25),Math.max(110,lm-25),Math.max(110,lm-25),255],0.4);
    }
    for (let i = 0; i < 7; i++) {
      const lR=135+i*8; const lE=148+i*6; const lL=120+i*8;
      Px.setPx(t,7-i,6+i,[lR,lR,lR,255],1.0); Px.setPx(t,6-i,5+i,[lE,lE,lE,255],0.70);
      Px.setPx(t,5-i,6+i,[lL,lL,lL,255],0.45); Px.setPx(t,9+i,6+i,[lR,lR,lR,255],1.0); Px.setPx(t,10+i,5+i,[lE,lE,lE,255],0.70);
    }
    Px.toGrey(t, { lift: 1.05 }); A.add('large_fern_top', t, { wrap: false });
  }

  // large_fern_bottom — greyscale lower fern stalks (t:1)
  {
    const t = Px.makeTile(16, 16); PLANT_clear(t);
    for (let y = 0; y < 16; y++) {
      const lm = 130 + Math.round(Math.sin(y*0.5)*25);
      Px.setPx(t,8,y,[lm,lm,lm,255],1.0);
      Px.setPx(t,9,y,[Math.min(200,lm+20),Math.min(200,lm+20),Math.min(200,lm+20),255],0.4);
      Px.setPx(t,7,y,[Math.max(115,lm-15),Math.max(115,lm-15),Math.max(115,lm-15),255],0.35);
    }
    for (let i = 0; i < 6; i++) {
      const lA=125+i*10; const lB=143+i*8; const lC=150+i*7;
      Px.setPx(t,7-i,10+i,[lB,lB,lB,255],1.0); Px.setPx(t,6-i,9+i,[lA,lA,lA,255],0.65);
      Px.setPx(t,5-i,10+i,[lC,lC,lC,255],0.40); Px.setPx(t,9+i,10+i,[lB,lB,lB,255],1.0); Px.setPx(t,10+i,9+i,[lA,lA,lA,255],0.65);
    }
    Px.toGrey(t, { lift: 1.10 }); A.add('large_fern_bottom', t, { wrap: false });
  }

  // dead_bush — brittle brown twig cluster
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('dead_bush');
    const twigCol   = [105, 75, 35, 255];
    const twigDark  = [75,  50, 20, 255];
    const twigLite  = [140, 100, 55, 255];
    const twigMid   = [118, 83, 40, 255];
    const twigPale  = [160, 120, 68, 255];
    const twigGrey  = [88,  60, 28, 255];
    // main stem
    for (let y = 8; y < 16; y++) {
      Px.setPx(t, 8, y, y % 2 === 0 ? twigCol : twigMid, 1.0);
      Px.setPx(t, 9, y, twigGrey, 0.4);
    }
    // upper branches
    const branches = [
      [8, 7, -3, -3, twigDark],
      [8, 7,  3, -3, twigMid],
      [8, 9, -4, -1, twigCol],
      [8, 9,  4, -1, twigGrey],
      [8, 6, -1, -4, twigDark],
      [8, 6,  1, -4, twigMid],
    ];
    for (const [bx, by, dx, dy, col] of branches) {
      Px.line(t, bx, by, bx + dx, by + dy, col, 1.0);
      Px.setPx(t, bx + dx, by + dy, twigLite, 0.8);
      // second-order twigs
      if (Math.abs(dx) > 1) {
        Px.setPx(t, bx + Math.sign(dx), by + dy + 1, twigPale, 0.6);
        Px.setPx(t, bx + dx + Math.sign(dx), by + dy - 1, twigCol, 0.5);
      }
    }
    A.add('dead_bush', t, { wrap: false });
  }

  // dandelion — yellow puff on green stem
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('dandelion');
    PLANT_stem(t, 8, 10, 15, PLANT_STEM_DARK, PLANT_STEM_MID, PLANT_STEM_LIGHT, s);
    PLANT_leaf2(t, 5, 12, PLANT_LEAF_DARK, PLANT_LEAF_MID, PLANT_LEAF_LIGHT);
    PLANT_leaf2(t, 9, 13, PLANT_LEAF_DARK, PLANT_LEAF_MID, PLANT_LEAF_LIGHT);
    // yellow puff head
    const yc1 = [255, 220, 0,   255];
    const yc2 = [255, 200, 30,  255];
    const yc3 = [240, 170, 0,   255];
    Px.circle(t, 8, 7, 3, yc2);
    Px.circle(t, 8, 7, 2, yc1);
    // ray petals outward
    for (let a = 0; a < 8; a++) {
      const ang = a * Math.PI / 4;
      const rx = Math.round(8 + Math.cos(ang) * 3.5);
      const ry = Math.round(7 + Math.sin(ang) * 3.0);
      Px.setPx(t, rx, ry, yc3, 0.85);
    }
    Px.setPx(t, 8, 7, [200, 160, 0, 255], 1.0); // dark centre
    A.add('dandelion', t, { wrap: false });
  }

  // poppy — red 4-petal with dark centre
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('poppy');
    PLANT_stem(t, 8, 9, 15, PLANT_STEM_DARK, PLANT_STEM_MID, PLANT_STEM_LIGHT, s);
    PLANT_leaf2(t, 5, 11, PLANT_LEAF_DARK, PLANT_LEAF_MID, PLANT_LEAF_LIGHT);
    // 4 petals in cardinal directions
    const rc1 = [220, 30,  20, 255];
    const rc2 = [180, 20,  10, 255];
    const rc3 = [255, 60,  40, 255];
    const petals = [[8, 4], [8, 10], [5, 7], [11, 7]];
    for (const [px, py] of petals) {
      Px.ellipse(t, px, py, 1.8, 1.5, rc1);
      Px.setPx(t, px, py, rc3, 0.7);
    }
    Px.circle(t, 8, 7, 1, [30, 20, 0, 255]); // dark centre
    Px.setPx(t, 8, 7, [50, 40, 0, 255], 0.8);
    // stem into petals
    for (const [px, py] of petals) {
      Px.line(t, 8, 9, px, py, rc2, 0.5);
    }
    A.add('poppy', t, { wrap: false });
  }

  // blue_orchid — cyan spray
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('blue_orchid');
    PLANT_stem(t, 8, 9, 15, PLANT_STEM_DARK, PLANT_STEM_MID, PLANT_STEM_LIGHT, s);
    const oc1 = [20,  180, 220, 255];
    const oc2 = [10,  140, 200, 255];
    const oc3 = [80,  220, 240, 255];
    // orchid petals — elongated, arching
    const orchidPetals = [
      [6, 5, 9, 8], [10, 5, 7, 8], [4, 7, 8, 6], [12, 7, 8, 6],
    ];
    for (const [ax, ay, bx, by] of orchidPetals) {
      Px.line(t, ax, ay, bx, by, oc1, 1.0);
      Px.setPx(t, ax, ay, oc3, 0.9);
    }
    Px.setPx(t, 8, 7, oc3, 1.0);
    Px.setPx(t, 8, 6, [255, 255, 200, 255], 0.8); // white lip
    // side leaves
    PLANT_leaf2(t, 4, 11, PLANT_LEAF_DARK, PLANT_LEAF_MID, PLANT_LEAF_LIGHT);
    Px.setPx(t, 5, 10, oc2, 0.5);
    A.add('blue_orchid', t, { wrap: false });
  }

  // allium — magenta pompom
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('allium');
    PLANT_stem(t, 8, 8, 15, PLANT_STEM_DARK, PLANT_STEM_MID, PLANT_STEM_LIGHT, s);
    PLANT_leaf2(t, 5, 12, PLANT_LEAF_DARK, PLANT_LEAF_MID, PLANT_LEAF_LIGHT);
    // pompom — circle of small magenta dots
    const mc1 = [200, 50,  180, 255];
    const mc2 = [160, 30,  145, 255];
    const mc3 = [240, 100, 220, 255];
    Px.circle(t, 8, 5, 3, mc2);
    for (let a = 0; a < 12; a++) {
      const ang = a * Math.PI / 6;
      const rx = Math.round(8 + Math.cos(ang) * 3.2);
      const ry = Math.round(5 + Math.sin(ang) * 2.8);
      Px.setPx(t, rx, ry, mc3, 0.9);
    }
    Px.circle(t, 8, 5, 1, mc1);
    A.add('allium', t, { wrap: false });
  }

  // azure_bluet — small white daisies with yellow centres
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('azure_bluet');
    PLANT_stem(t, 8, 10, 15, PLANT_STEM_DARK, PLANT_STEM_MID, PLANT_STEM_LIGHT, s);
    PLANT_leaf2(t, 5, 13, PLANT_LEAF_DARK, PLANT_LEAF_MID, PLANT_LEAF_LIGHT);
    // white petals + yellow centre
    const wc = [240, 240, 245, 255];
    const yc = [255, 220,   0, 255];
    for (let a = 0; a < 6; a++) {
      const ang = a * Math.PI / 3;
      Px.setPx(t, Math.round(8 + Math.cos(ang) * 2.5), Math.round(7 + Math.sin(ang) * 2.5), wc, 1.0);
    }
    Px.setPx(t, 8, 7, yc, 1.0);
    Px.setPx(t, 7, 7, wc, 0.8);
    Px.setPx(t, 9, 7, wc, 0.8);
    A.add('azure_bluet', t, { wrap: false });
  }

  // red_tulip — red cup on stem
  { const t = Px.makeTile(16, 16); PLANT_clear(t);
    PLANT_tulip(t, [200,30,25,255], [160,20,15,255], [240,60,50,255], C.seedFor('red_tulip'));
    A.add('red_tulip', t, { wrap: false }); }

  // orange_tulip — orange cup on stem
  { const t = Px.makeTile(16, 16); PLANT_clear(t);
    PLANT_tulip(t, [230,110,20,255], [185,80,10,255], [255,150,50,255], C.seedFor('orange_tulip'));
    A.add('orange_tulip', t, { wrap: false }); }

  // white_tulip — white cup on stem
  { const t = Px.makeTile(16, 16); PLANT_clear(t);
    PLANT_tulip(t, [235,235,240,255], [190,190,200,255], [255,255,255,255], C.seedFor('white_tulip'));
    A.add('white_tulip', t, { wrap: false }); }

  // pink_tulip — pink cup on stem
  { const t = Px.makeTile(16, 16); PLANT_clear(t);
    PLANT_tulip(t, [230,130,160,255], [190,95,125,255], [255,175,195,255], C.seedFor('pink_tulip'));
    A.add('pink_tulip', t, { wrap: false }); }

  // oxeye_daisy — white petal ring with yellow centre
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('oxeye_daisy');
    PLANT_stem(t, 8, 10, 15, PLANT_STEM_DARK, PLANT_STEM_MID, PLANT_STEM_LIGHT, s);
    PLANT_leaf2(t, 5, 12, PLANT_LEAF_DARK, PLANT_LEAF_MID, PLANT_LEAF_LIGHT);
    const wc  = [245, 245, 248, 255];
    const wc2 = [210, 210, 215, 255];
    const yc  = [255, 215,  0,  255];
    // petal ring (8 petals)
    for (let a = 0; a < 8; a++) {
      const ang = a * Math.PI / 4;
      const rx1 = Math.round(8 + Math.cos(ang) * 2.8);
      const ry1 = Math.round(7 + Math.sin(ang) * 2.8);
      const rx2 = Math.round(8 + Math.cos(ang) * 3.8);
      const ry2 = Math.round(7 + Math.sin(ang) * 3.8);
      Px.setPx(t, rx1, ry1, wc,  1.0);
      Px.setPx(t, rx2, ry2, wc2, 0.9);
    }
    Px.circle(t, 8, 7, 1, yc);
    A.add('oxeye_daisy', t, { wrap: false });
  }

  // cornflower — ragged blue-violet bloom
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('cornflower');
    PLANT_stem(t, 8, 10, 15, PLANT_STEM_DARK, PLANT_STEM_MID, PLANT_STEM_LIGHT, s);
    PLANT_leaf2(t, 5, 12, PLANT_LEAF_DARK, PLANT_LEAF_MID, PLANT_LEAF_LIGHT);
    const cc1 = [70,  90, 200, 255];
    const cc2 = [50,  65, 165, 255];
    const cc3 = [120, 130, 230, 255];
    // ragged petals
    for (let a = 0; a < 10; a++) {
      const ang = a * Math.PI / 5 + 0.2;
      const r = 2.2 + (PLANT_h2(a, 0, s) - 0.5) * 1.2;
      const rx = Math.round(8 + Math.cos(ang) * r);
      const ry = Math.round(7 + Math.sin(ang) * r);
      Px.setPx(t, rx, ry, a % 2 === 0 ? cc1 : cc3, 1.0);
    }
    Px.circle(t, 8, 7, 1, cc2);
    A.add('cornflower', t, { wrap: false });
  }

  // lily_of_the_valley — white bells on arching stem
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('lily_of_the_valley');
    // arching stem
    for (let y = 5; y < 16; y++) {
      const wob = Math.round(Math.sin(y * 0.4) * 1.5);
      Px.setPx(t, 8 + wob, y, PLANT_STEM_MID, 1.0);
      Px.setPx(t, 9 + wob, y, PLANT_STEM_LIGHT, 0.4);
    }
    // leaves
    for (let ly = 8; ly < 14; ly++) {
      Px.setPx(t, 5 + (ly - 8), ly, PLANT_LEAF_MID, 1.0);
    }
    // bells hanging off to the right
    const bellY = [5, 7, 9, 11];
    for (let b = 0; b < bellY.length; b++) {
      const bx = 10 + (b % 2);
      const by = bellY[b];
      Px.setPx(t, bx,     by,     [245, 245, 250, 255], 1.0);
      Px.setPx(t, bx + 1, by,     [210, 210, 215, 255], 0.9);
      Px.setPx(t, bx,     by + 1, [200, 200, 210, 255], 0.8);
      Px.setPx(t, bx + 1, by + 1, [245, 245, 250, 255], 0.5);
    }
    A.add('lily_of_the_valley', t, { wrap: false });
  }

  // sunflower_top — big yellow disc with brown seed centre
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('sunflower_top');
    const yc1 = [255, 200,   0, 255];
    const yc2 = [220, 160,   0, 255];
    const yc3 = [255, 230,  50, 255];
    const bc1 = [80,  45,   10, 255];
    const bc2 = [55,  30,    5, 255];
    // ray petals
    for (let a = 0; a < 16; a++) {
      const ang = a * Math.PI / 8;
      const rx1 = Math.round(8 + Math.cos(ang) * 4.0);
      const ry1 = Math.round(8 + Math.sin(ang) * 4.0);
      const rx2 = Math.round(8 + Math.cos(ang) * 6.5);
      const ry2 = Math.round(8 + Math.sin(ang) * 6.5);
      Px.line(t, rx1, ry1, rx2, ry2, a % 2 === 0 ? yc1 : yc2, 1.0);
      Px.setPx(t, rx2, ry2, yc3, 0.7);
    }
    // seed disc
    Px.circle(t, 8, 8, 3, bc2);
    Px.circle(t, 8, 8, 2, bc1);
    // seed pattern
    for (let i = 0; i < 6; i++) {
      const ang = i * Math.PI / 3;
      Px.setPx(t, Math.round(8 + Math.cos(ang) * 1.5), Math.round(8 + Math.sin(ang) * 1.5), [100, 60, 15, 255], 0.9);
    }
    A.add('sunflower_top', t, { wrap: false });
  }

  // sunflower_bottom — thick green stalk with two broad leaves
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('sunflower_bottom');
    const stalkExtra = [58, 130, 40, 255];
    // thick stalk
    for (let y = 0; y < 16; y++) {
      Px.setPx(t, 7, y, PLANT_STEM_DARK, 1.0);
      Px.setPx(t, 8, y, PLANT_STEM_MID, 1.0);
      Px.setPx(t, 9, y, PLANT_STEM_LIGHT, 0.5);
      // fine node lines
      if (y % 4 === 0) {
        Px.setPx(t, 8, y, stalkExtra, 0.8);
      }
    }
    // broad leaf left
    for (let lx = 2; lx < 8; lx++) {
      const ly = 5 + (7 - lx);
      if (ly >= 0 && ly < 16) {
        Px.setPx(t, lx, ly, PLANT_LEAF_MID, 1.0);
        Px.setPx(t, lx, ly + 1, PLANT_LEAF_DARK, 0.7);
        Px.setPx(t, lx, ly - 1, PLANT_LEAF_LIGHT, 0.5);
      }
    }
    // broad leaf right
    for (let lx = 10; lx < 14; lx++) {
      const ly = 9 + (lx - 10);
      if (ly >= 0 && ly < 16) {
        Px.setPx(t, lx, ly, PLANT_LEAF_MID, 1.0);
        Px.setPx(t, lx, ly + 1, PLANT_LEAF_DARK, 0.7);
        Px.setPx(t, lx - 1, ly, PLANT_LEAF_LIGHT, 0.4);
      }
    }
    A.add('sunflower_bottom', t, { wrap: false });
  }

  // rose_bush_top — cluster of dark red roses among leaves
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('rose_bush_top');
    // background leaves
    for (let i = 0; i < 10; i++) {
      const lx = 2 + Math.floor(PLANT_h2(i, 0, s) * 12);
      const ly = 2 + Math.floor(PLANT_h2(i, 1, s) * 10);
      PLANT_leaf2(t, lx, ly, PLANT_LEAF_DARK, PLANT_LEAF_MID, PLANT_LEAF_LIGHT);
    }
    // rose blooms (4)
    const rc1 = [170, 20, 20, 255];
    const rc2 = [210, 40, 40, 255];
    const rc3 = [130, 10, 10, 255];
    const rosePos = [[5, 4], [10, 3], [4, 9], [11, 8]];
    for (const [rx, ry] of rosePos) {
      Px.circle(t, rx, ry, 2, rc1);
      Px.circle(t, rx, ry, 1, rc2);
      Px.setPx(t, rx, ry, rc3, 0.8);
    }
    A.add('rose_bush_top', t, { wrap: false });
  }

  // rose_bush_bottom — thorny stems and leaves
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('rose_bush_bottom');
    // stems
    PLANT_stem(t, 6, 0, 15, PLANT_STEM_DARK, PLANT_STEM_MID, PLANT_STEM_LIGHT, s);
    PLANT_stem(t, 10, 0, 15, PLANT_STEM_DARK, PLANT_STEM_MID, PLANT_STEM_LIGHT, s + 1);
    // leaves
    for (let i = 0; i < 6; i++) {
      const lx = 3 + Math.floor(PLANT_h2(i, 0, s + 5) * 10);
      const ly = 3 + Math.floor(PLANT_h2(i, 1, s + 5) * 10);
      PLANT_leaf2(t, lx, ly, PLANT_LEAF_DARK, PLANT_LEAF_MID, PLANT_LEAF_LIGHT);
    }
    // thorns — tiny dark spurs off stem
    const thornCol = [55, 35, 10, 255];
    for (let i = 0; i < 5; i++) {
      const ty = 2 + i * 3;
      Px.setPx(t, 5, ty, thornCol, 1.0);
      Px.setPx(t, 11, ty + 1, thornCol, 1.0);
    }
    A.add('rose_bush_bottom', t, { wrap: false });
  }

  // brown_mushroom — small brown domed mushroom, pale stem
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('brown_mushroom');
    // stem
    const stemC = [210, 195, 175, 255];
    const stemS = [180, 165, 148, 255];
    const stemL = [230, 218, 200, 255];
    const stemD = [155, 140, 125, 255];
    for (let y = 10; y < 16; y++) {
      Px.setPx(t, 7, y, stemD, 1.0);
      Px.setPx(t, 8, y, stemC, 1.0);
      Px.setPx(t, 9, y, stemS, 1.0);
      Px.setPx(t, 10, y, stemL, 0.5);
    }
    // cap — dome
    const cc1 = [130, 90, 55, 255];
    const cc2 = [105, 70, 38, 255];
    const cc3 = [160, 115, 72, 255];
    const cc4 = [145, 100, 60, 255];
    const cc5 = [85,  58, 30, 255];
    Px.ellipse(t, 8, 8, 5, 3, cc2);
    Px.ellipse(t, 8, 8, 4, 2, cc1);
    Px.ellipse(t, 8, 7, 3, 1, cc3);
    // noise mottling for colour variation
    Px.speckle(t, [cc3, cc2, cc4], { density: 0.20, seed: s + 3, size: 1,
      region: (x, y) => { const dx = x - 8; const dy = y - 8; return dx*dx/25 + dy*dy/9 < 1; } });
    Px.setPx(t, 7, 7, cc5, 0.6);
    Px.setPx(t, 9, 9, cc3, 0.7);
    A.add('brown_mushroom', t, { wrap: false });
  }

  // red_mushroom — red spotted mushroom, pale stem
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('red_mushroom');
    // stem
    const stemC = [210, 195, 175, 255];
    const stemS = [180, 165, 148, 255];
    for (let y = 10; y < 16; y++) {
      Px.setPx(t, 7, y, stemS, 1.0);
      Px.setPx(t, 8, y, stemC, 1.0);
      Px.setPx(t, 9, y, stemS, 1.0);
    }
    // cap
    const rc1 = [185, 30,  20, 255];
    const rc2 = [145, 18,  12, 255];
    const rc3 = [220, 55,  45, 255];
    Px.ellipse(t, 8, 8, 5, 3, rc2);
    Px.ellipse(t, 8, 8, 4, 2, rc1);
    // white spots
    const spotPos = [[7, 7], [10, 7], [6, 9], [10, 9], [8, 6]];
    for (const [sx, sy] of spotPos) {
      Px.circle(t, sx, sy, 1, [240, 235, 230, 255]);
    }
    Px.ellipse(t, 8, 7, 3, 1, rc3);
    A.add('red_mushroom', t, { wrap: false });
  }

  // ---------- wheat growth stages (0-7) ----------

  // wheat_0 — tiny sprouts
  {
    const t = Px.makeTile(16, 16); PLANT_clear(t);
    const g = PLANT_WHEAT_GREENS; const g2 = Px.ramp('#2e6a18', 4, 0.70, 1.30);
    for (let i = 0; i < 4; i++) {
      const bx = 3 + i * 3;
      Px.setPx(t,bx,15,g[0],1.0); Px.setPx(t,bx,14,g[1],1.0); Px.setPx(t,bx,13,g[2],1.0);
      Px.setPx(t,bx-1,14,g2[0],0.7); Px.setPx(t,bx+1,13,g2[1],0.6); Px.setPx(t,bx-1,15,g2[2],0.5);
    }
    A.add('wheat_0', t, { wrap: false });
  }

  // wheat_1 — short green shoots
  {
    const t = Px.makeTile(16, 16); PLANT_clear(t);
    const g2 = Px.ramp('#2e6a18', 5, 0.65, 1.35);
    PLANT_cropStalks(t, 4, 10, PLANT_WHEAT_GREENS, g2, C.seedFor('wheat_1'));
    A.add('wheat_1', t, { wrap: false });
  }

  // wheat_2 — taller green stalks
  {
    const t = Px.makeTile(16, 16); PLANT_clear(t);
    const g2 = Px.ramp('#2e6a18', 5, 0.65, 1.35);
    PLANT_cropStalks(t, 5, 7, PLANT_WHEAT_GREENS, g2, C.seedFor('wheat_2'));
    A.add('wheat_2', t, { wrap: false });
  }

  // wheat_3 — green stalks with first heads
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('wheat_3');
    const g = PLANT_WHEAT_GREENS;
    const g2 = Px.ramp('#2e6a18', 5, 0.65, 1.35);
    const headGreen = [52, 105, 28, 255];
    for (let i = 0; i < 5; i++) {
      const bx = 2 + i * 3;
      for (let y = 5; y < 16; y++) {
        const n = Px.fbm(bx, y, 0.45, 2, s + i, 16);
        const gi = y < 7 ? 2 : y < 11 ? 1 : 0;
        const col = n > 0.6 ? g[Math.min(2, gi + 1)] : g[gi];
        Px.setPx(t, bx, y, col, 1.0);
        Px.setPx(t, bx - 1, y, g2[gi], 0.5);
      }
      // head nub
      Px.setPx(t, bx, 4, g[2], 1.0);
      Px.setPx(t, bx - 1, 5, headGreen, 0.8);
      Px.setPx(t, bx + 1, 4, g2[3], 0.6);
    }
    A.add('wheat_3', t, { wrap: false });
  }

  // wheat_4 — stalks yellowing at tips
  {
    const t = Px.makeTile(16, 16); PLANT_clear(t);
    const g = PLANT_WHEAT_GREENS; const gd = PLANT_WHEAT_GOLDS;
    for (let i = 0; i < 6; i++) {
      const bx = 1 + i * 2 + (i % 2);
      for (let y = 5; y < 16; y++) Px.setPx(t, bx, y, y < 7 ? gd[0] : y < 9 ? g[2] : y < 12 ? g[1] : g[0], 1.0);
      Px.setPx(t, bx - 1, 5, gd[1], 0.7);
    }
    A.add('wheat_4', t, { wrap: false });
  }

  // wheat_5 — half-golden with grain heads
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('wheat_5');
    const g = PLANT_WHEAT_GREENS;
    const gd = PLANT_WHEAT_GOLDS;
    const g2 = Px.ramp('#2e6a18', 3, 0.70, 1.20);
    for (let i = 0; i < 6; i++) {
      const bx = 1 + i * 2 + (i % 2);
      for (let y = 4; y < 16; y++) {
        const n = Px.fbm(bx, y, 0.4, 2, s + i, 16);
        const col = y < 7 ? (n > 0.5 ? gd[3] : gd[2]) : y < 9 ? gd[1] : y < 11 ? gd[0] : y < 13 ? g[1] : g[0];
        Px.setPx(t, bx, y, col, 1.0);
        Px.setPx(t, bx - 1, y, g2[Math.floor(n * g2.length)], 0.40);
      }
      // grain head
      Px.setPx(t, bx - 1, 4, gd[3], 0.8);
      Px.setPx(t, bx + 1, 4, gd[2], 0.8);
    }
    A.add('wheat_5', t, { wrap: false });
  }

  // wheat_6 — mostly golden heavy heads
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('wheat_6');
    const gd = PLANT_WHEAT_GOLDS;
    const g  = PLANT_WHEAT_GREENS;
    const gd2 = Px.ramp('#b89018', 3, 0.65, 1.30);
    for (let i = 0; i < 6; i++) {
      const bx = 1 + i * 2 + (i % 2);
      for (let y = 3; y < 16; y++) {
        const n = Px.fbm(bx, y, 0.4, 2, s + i, 16);
        const col = y < 6 ? gd[3] : y < 9 ? (n > 0.5 ? gd[3] : gd[2]) : y < 12 ? gd[1] : g[0];
        Px.setPx(t, bx, y, col, 1.0);
        Px.setPx(t, bx - 1, y, gd2[Math.floor(n * gd2.length)], 0.4);
      }
      // drooping head
      Px.setPx(t, bx - 1, 3, gd[3], 0.9);
      Px.setPx(t, bx + 1, 3, gd[3], 0.9);
      Px.setPx(t, bx, 2, gd[2], 0.7);
    }
    A.add('wheat_6', t, { wrap: false });
  }

  // wheat_7 — fully ripe golden wheat, drooping heads
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('wheat_7');
    const gd = PLANT_WHEAT_GOLDS;
    const g  = PLANT_WHEAT_GREENS;
    const gd2 = Px.ramp('#b89018', 4, 0.60, 1.35);
    for (let i = 0; i < 7; i++) {
      const bx = 1 + Math.floor(i * 14 / 6);
      for (let y = 2; y < 16; y++) {
        const n = Px.fbm(bx, y, 0.45, 2, s + i, 16);
        const col = y < 5 ? gd[3] : y < 8 ? (n > 0.5 ? gd[3] : gd[2]) : y < 11 ? gd[1] : y < 13 ? gd[0] : g[0];
        Px.setPx(t, bx, y, col, 1.0);
        Px.setPx(t, bx - 1, y, gd2[Math.floor(n * gd2.length)], 0.4);
      }
      // drooping head cluster
      const droop = 2 + i % 3;
      Px.setPx(t, bx - 1, droop, gd[3], 1.0);
      Px.setPx(t, bx + 1, droop, gd[3], 1.0);
      Px.setPx(t, bx - 1, droop + 1, gd[2], 0.7);
      Px.setPx(t, bx + 1, droop + 1, gd2[1], 0.6);
    }
    A.add('wheat_7', t, { wrap: false });
  }

  // ---------- carrot growth stages ----------

  // carrots_0 — small leaf sprigs
  {
    const t = Px.makeTile(16, 16); PLANT_clear(t);
    const g = PLANT_WHEAT_GREENS;
    const cL=[55,148,38,255]; const cD=[25,88,15,255]; const cE=[48,135,32,255];
    for (let i = 0; i < 4; i++) {
      const bx = 3 + i * 3;
      Px.setPx(t,bx,15,g[0],1.0); Px.setPx(t,bx,14,g[1],1.0); Px.setPx(t,bx,13,g[2],1.0);
      Px.setPx(t,bx-1,14,cD,0.8); Px.setPx(t,bx+1,14,cL,0.7); Px.setPx(t,bx-1,13,cE,0.6); Px.setPx(t,bx+1,15,cD,0.5);
    }
    A.add('carrots_0', t, { wrap: false });
  }

  // carrots_1 — carrot foliage
  {
    const t = Px.makeTile(16, 16); PLANT_clear(t);
    const g2 = Px.ramp('#285a18', 4, 0.68, 1.28);
    PLANT_cropStalks(t, 4, 8, PLANT_WHEAT_GREENS, g2, C.seedFor('carrots_1'));
    A.add('carrots_1', t, { wrap: false });
  }

  // carrots_2 — fuller carrot foliage
  {
    const t = Px.makeTile(16, 16); PLANT_clear(t);
    const g2 = Px.ramp('#285a18', 5, 0.65, 1.30);
    PLANT_cropStalks(t, 5, 5, PLANT_WHEAT_GREENS, g2, C.seedFor('carrots_2'));
    A.add('carrots_2', t, { wrap: false });
  }

  // carrots_3 — carrot tops with orange crowns showing
  {
    const t = Px.makeTile(16, 16); PLANT_clear(t);
    const g = PLANT_WHEAT_GREENS;
    const cO = [230,100,15,255]; const cD = [180,70,10,255]; const cF = [40,130,30,255];
    for (let i = 0; i < 5; i++) {
      const bx = 2 + i * 3;
      for (let y = 5; y < 16; y++) Px.setPx(t, bx, y, y < 7 ? g[2] : y < 10 ? g[1] : g[0], 1.0);
      Px.setPx(t, bx-1, 5, cF, 0.9); Px.setPx(t, bx, 15, cO, 1.0); Px.setPx(t, bx-1, 14, cD, 0.7);
    }
    A.add('carrots_3', t, { wrap: false });
  }

  // ---------- potato growth stages ----------

  // potatoes_0 — small potato sprigs
  {
    const t = Px.makeTile(16, 16); PLANT_clear(t);
    const g = PLANT_WHEAT_GREENS;
    const gL = [55,148,38,255]; const gD = [28,92,18,255]; const gE = [42,118,28,255];
    for (let i = 0; i < 4; i++) {
      const bx = 3 + i * 3;
      Px.setPx(t,bx,15,g[0],1.0); Px.setPx(t,bx-1,14,g[1],1.0); Px.setPx(t,bx+1,14,g[1],1.0);
      Px.setPx(t,bx,14,g[2],0.9); Px.setPx(t,bx-1,15,gD,0.7); Px.setPx(t,bx+1,15,gL,0.6); Px.setPx(t,bx,13,gE,0.6);
    }
    A.add('potatoes_0', t, { wrap: false });
  }

  // potatoes_1 — potato foliage
  {
    const t = Px.makeTile(16, 16); PLANT_clear(t);
    const g2 = Px.ramp('#306218', 4, 0.68, 1.28);
    PLANT_cropStalks(t, 4, 7, PLANT_WHEAT_GREENS, g2, C.seedFor('potatoes_1'));
    Px.setPx(t, 5, 8, [30, 95, 20, 255], 0.6); // extra distinct colour
    A.add('potatoes_1', t, { wrap: false });
  }

  // potatoes_2 — fuller potato plant
  {
    const t = Px.makeTile(16, 16); PLANT_clear(t);
    const g2 = Px.ramp('#306218', 5, 0.65, 1.30);
    PLANT_cropStalks(t, 5, 5, PLANT_WHEAT_GREENS, g2, C.seedFor('potatoes_2'));
    A.add('potatoes_2', t, { wrap: false });
  }

  // potatoes_3 — potato plant with small white flowers
  {
    const t = Px.makeTile(16, 16); PLANT_clear(t);
    const g = PLANT_WHEAT_GREENS;
    const pL=[45,110,30,255]; const fw=[240,235,250,255]; const fc=[255,220,0,255];
    for (let i = 0; i < 5; i++) {
      const bx = 2 + i * 3;
      for (let y = 4; y < 16; y++) Px.setPx(t, bx, y, y < 6 ? g[2] : y < 9 ? g[1] : g[0], 1.0);
      Px.setPx(t,bx-1,4,pL,1.0);
      if (i%2===0) { Px.setPx(t,bx,2,fw,1.0); Px.setPx(t,bx-1,3,fw,0.9); Px.setPx(t,bx+1,3,fw,0.9); Px.setPx(t,bx,3,fc,0.8); }
    }
    A.add('potatoes_3', t, { wrap: false });
  }

  // ---------- beetroot growth stages ----------

  // beetroots_0 — beet seedlings
  {
    const t = Px.makeTile(16, 16); PLANT_clear(t);
    const g = PLANT_WHEAT_GREENS;
    const rv = [120,30,50,255]; const rv2 = [90,18,35,255]; const gL = [55,148,38,255]; const gD = [25,88,15,255];
    for (let i = 0; i < 4; i++) {
      const bx = 3 + i * 3;
      Px.setPx(t,bx,15,rv,1.0); Px.setPx(t,bx,14,g[1],1.0); Px.setPx(t,bx,13,g[2],1.0);
      Px.setPx(t,bx-1,14,rv2,0.7); Px.setPx(t,bx+1,14,gL,0.6); Px.setPx(t,bx-1,13,gD,0.5); Px.setPx(t,bx+1,15,rv,0.5);
    }
    A.add('beetroots_0', t, { wrap: false });
  }

  // beetroots_1 — beet leaves
  {
    const t = Px.makeTile(16, 16); PLANT_clear(t);
    const s = C.seedFor('beetroots_1');
    const rv = [130, 32, 52, 255]; const rv2 = [95, 20, 38, 255];
    const g2 = Px.ramp('#306218', 3, 0.70, 1.25);
    PLANT_cropStalks(t, 4, 8, PLANT_WHEAT_GREENS, g2, s);
    for (let i = 0; i < 4; i++) {
      const bx = 3 + i * 3;
      Px.setPx(t, bx, 15, rv, 1.0); Px.setPx(t, bx - 1, 15, rv2, 0.7);
    }
    A.add('beetroots_1', t, { wrap: false });
  }

  // beetroots_2 — larger red-veined beet leaves
  {
    const t = Px.makeTile(16, 16); PLANT_clear(t);
    const s = C.seedFor('beetroots_2');
    const rv = [150, 30, 55, 255]; const rv2 = [110, 20, 40, 255];
    const g2 = Px.ramp('#306218', 4, 0.68, 1.28);
    PLANT_cropStalks(t, 5, 6, PLANT_WHEAT_GREENS, g2, s);
    for (let i = 0; i < 5; i++) {
      const bx = 2 + i * 3;
      Px.setPx(t, bx, 15, rv, 1.0); Px.setPx(t, bx, 14, rv2, 0.9);
      for (let y = 6; y < 14; y += 3) Px.setPx(t, bx + 1, y, rv2, 0.35);
    }
    A.add('beetroots_2', t, { wrap: false });
  }

  // beetroots_3 — ripe beet crowns pushing out of soil
  {
    const t = Px.makeTile(16, 16); PLANT_clear(t);
    const s = C.seedFor('beetroots_3');
    const g = PLANT_WHEAT_GREENS; const rv=[175,35,65,255]; const rD=[125,18,38,255]; const rM=[148,25,52,255];
    const g2 = Px.ramp('#306218', 5, 0.65, 1.30);
    for (let i = 0; i < 5; i++) {
      const bx = 2 + i * 3;
      Px.setPx(t,bx,15,rD,1.0); Px.setPx(t,bx,14,rv,1.0); Px.setPx(t,bx-1,14,rM,0.85); Px.setPx(t,bx+1,15,rv,0.7);
      for (let y = 5; y < 14; y++) {
        const n = Px.fbm(bx, y, 0.40, 2, s + i, 16);
        Px.setPx(t,bx,y,g[y<7?2:1],1.0); Px.setPx(t,bx-1,y,g2[Math.floor(n*g2.length)],0.50);
        if (y%4===0) Px.setPx(t,bx+1,y,rM,0.30);
      }
    }
    A.add('beetroots_3', t, { wrap: false });
  }

  // cactus_top — green crown with concentric ribs and areole spines
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('cactus_top');
    const cc1 = [55,  130, 45, 255];
    const cc2 = [40,  100, 32, 255];
    const cc3 = [75,  160, 60, 255];
    const spineC = [220, 215, 185, 255];
    Px.fill(t, cc2);
    Px.noiseFill(t, [cc2, cc1, cc3, cc1, cc2], { freq: 0.28, octaves: 2, seed: s, contrast: 1.2, period: 16 });
    // concentric rib rings
    for (let ring = 2; ring <= 6; ring += 2) {
      Px.circleOutline(t, 8, 8, ring, cc2, 0.55);
    }
    // areole spine pairs
    for (let a = 0; a < 8; a++) {
      const ang = a * Math.PI / 4;
      const sx = Math.round(8 + Math.cos(ang) * 5);
      const sy = Math.round(8 + Math.sin(ang) * 5);
      Px.setPx(t, sx, sy, spineC, 1.0);
      Px.setPx(t, sx + 1, sy, spineC, 0.7);
    }
    Px.edgeShade(t, 0.88);
    A.add('cactus_top', t);
  }

  // cactus_side — flesh with vertical ribs and spine pairs
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('cactus_side');
    const cc1 = [55, 130, 45, 255];
    const cc2 = [40, 100, 32, 255];
    const cc3 = [75, 160, 60, 255];
    const spineC = [220, 215, 185, 255];
    Px.noiseFill(t, [cc2, cc1, cc3, cc1, cc2], { freq: 0.20, octaves: 2, seed: s, contrast: 1.0, period: 16 });
    // vertical ribs — darker grooves
    for (let x = 2; x < 16; x += 5) {
      for (let y = 0; y < 16; y++) {
        Px.setPx(t, x, y, cc2, 0.7);
      }
    }
    // spine pairs at each rib
    for (let x = 2; x < 16; x += 5) {
      for (let y = 2; y < 16; y += 5) {
        Px.setPx(t, x - 1, y, spineC, 0.9);
        Px.setPx(t, x + 1, y, spineC, 0.9);
      }
    }
    Px.edgeShade(t, 0.88);
    A.add('cactus_side', t, { wrap: false });
  }

  // cactus_bottom — cut cactus base, pale green core ring
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('cactus_bottom');
    const cc1 = [55, 130, 45, 255];
    const cc2 = [40, 100, 32, 255];
    Px.noiseFill(t, [cc2, cc1, cc1, cc2, cc1], { freq: 0.25, octaves: 2, seed: s, contrast: 1.1, period: 16 });
    // pale core ring
    Px.circleOutline(t, 8, 8, 4, [150, 200, 130, 255], 0.8);
    Px.circleOutline(t, 8, 8, 3, [120, 175, 100, 255], 0.6);
    Px.edgeShade(t, 0.88);
    A.add('cactus_bottom', t);
  }

  // sugar_cane — jointed cane stalks, greyscale (t:1)
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('sugar_cane');
    // 3 overlapping cane stalks with smooth luma gradient
    const caneXs = [5, 8, 11];
    for (let ci = 0; ci < caneXs.length; ci++) {
      const cx = caneXs[ci];
      for (let y = 0; y < 16; y++) {
        const wob = Math.round(Math.sin(y * 0.6 + cx * 1.2) * 0.7);
        // per-row luma variation for smooth gradient
        const luma = 145 + Math.round(Math.sin(y * 0.8 + ci * 1.1) * 25);
        const lumaL = Math.min(210, luma + 20);
        const lumaD = Math.max(110, luma - 20);
        const px2 = Math.max(0, Math.min(15, cx + wob));
        Px.setPx(t, px2, y, [lumaD, lumaD, lumaD, 255], 0.5);
        Px.setPx(t, Math.min(15, px2 + 1), y, [luma, luma, luma, 255], 1.0);
        Px.setPx(t, Math.min(15, px2 + 2), y, [lumaL, lumaL, lumaL, 255], 0.4);
      }
      // joint rings
      for (let y = 5; y < 16; y += 5) {
        const jx = Math.max(0, Math.min(15, cx));
        Px.setPx(t, jx,     y, PLANT_GREY_PAL[0], 1.0);
        Px.setPx(t, jx + 1, y, PLANT_GREY_PAL[1], 1.0);
        Px.setPx(t, jx + 2, y, PLANT_GREY_PAL[2], 0.7);
      }
    }
    Px.toGrey(t, { lift: 1.05 });
    A.add('sugar_cane', t, { wrap: false });
  }

  // bamboo_stalk — thin bright green culm with node rings
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('bamboo_stalk');
    const bc1 = [80,  180, 40,  255];
    const bc2 = [55,  140, 25,  255];
    const bc3 = [110, 210, 60,  255];
    const node = [40,  110, 15,  255];
    // culm — single stalk at centre
    for (let y = 0; y < 16; y++) {
      const wob = Math.round(Math.sin(y * 0.4) * 0.4);
      Px.setPx(t, 7 + wob, y, bc2, 1.0);
      Px.setPx(t, 8 + wob, y, bc1, 1.0);
      Px.setPx(t, 9 + wob, y, bc3, 0.5);
    }
    // nodes
    for (let y = 3; y < 16; y += 5) {
      for (let x = 7; x <= 9; x++) {
        Px.setPx(t, x, y, node, 1.0);
        Px.setPx(t, x, y + 1, node, 0.8);
      }
    }
    // leaf flags at some nodes
    for (let y = 4; y < 16; y += 5) {
      Px.setPx(t, 10, y, bc1, 0.9);
      Px.setPx(t, 11, y + 1, bc2, 0.7);
      Px.setPx(t, 6, y + 2, bc1, 0.8);
    }
    A.add('bamboo_stalk', t, { wrap: false });
  }

  // vine — greyscale hanging tendrils with small leaves (t:2)
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('vine');
    // hanging tendrils with varied luma per tendril
    const tendrilXs = [2, 5, 8, 11, 14];
    const lumaBase = [130, 155, 170, 145, 160];
    for (let ti2 = 0; ti2 < tendrilXs.length; ti2++) {
      const tx = tendrilXs[ti2];
      const len = 8 + Math.floor(PLANT_h2(ti2, 0, s) * 7);
      const lb = lumaBase[ti2];
      for (let y = 0; y < len; y++) {
        const wob = Math.round(Math.sin(y * 0.8 + ti2 * 1.5) * 0.6);
        const luma = lb + Math.round(Math.sin(y * 0.4) * 18);
        const lv = Math.min(210, Math.max(110, luma));
        Px.setPx(t, Math.max(0, Math.min(15, tx + wob)), y, [lv, lv, lv, 255], 1.0);
        Px.setPx(t, Math.max(0, Math.min(15, tx + wob - 1)), y, [Math.max(110, lv - 30), Math.max(110, lv - 30), Math.max(110, lv - 30), 255], 0.35);
      }
      // small leaf with varied shades
      const leafY = Math.floor(len * 0.5);
      PLANT_leaf3G(t, Math.max(1, tx - 1), leafY);
      // extra leaf detail
      const ly2 = Math.floor(len * 0.75);
      Px.setPx(t, Math.min(14, tx + 1), ly2, [125, 125, 125, 255], 0.8);
    }
    Px.toGrey(t, { lift: 1.05 });
    A.add('vine', t, { wrap: false });
  }

  // lily_pad — greyscale round pad with notch and radial veins (t:2)
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('lily_pad');
    // round pad with noise variation
    for (let y = 3; y < 15; y++) {
      for (let x = 2; x < 14; x++) {
        const dx = x - 8; const dy = y - 9;
        if (dx*dx/36 + dy*dy/25 < 1) {
          const n = Px.fbm(x, y, 0.4, 2, s, 16);
          const luma = Math.round(130 + n * 60);
          Px.setPx(t, x, y, [luma, luma, luma, 255], 1.0);
        }
      }
    }
    // notch at top
    Px.cutout(t, (x, y) => x === 8 && y <= 4);
    Px.setPx(t, 8, 5, PLANT_GREY_PAL[1], 0.5);
    // radial veins
    for (let a = 0; a < 8; a++) {
      const ang = a * Math.PI / 4 + 0.3;
      for (let r = 1; r < 5; r++) {
        const vx = Math.round(8 + Math.cos(ang) * r);
        const vy = Math.round(9 + Math.sin(ang) * r);
        if (vx >= 0 && vx < 16 && vy >= 0 && vy < 16 && t.data[(vy * 16 + vx) * 4 + 3] > 0) {
          const c = Px.getPx(t, vx, vy);
          Px.setPx(t, vx, vy, [Math.max(110, c[0] - 35), Math.max(110, c[1] - 35), Math.max(110, c[2] - 35), 255], 0.65);
        }
      }
    }
    Px.toGrey(t, { lift: 1.05 });
    A.add('lily_pad', t, { wrap: false });
  }

  // seagrass — greyscale slender underwater blades (t:2)
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('seagrass');
    const bladeXs = [3, 6, 9, 12];
    const lumaVariants = [130, 145, 155, 170, 185, 200]; // 6+ distinct lumas
    for (let b = 0; b < bladeXs.length; b++) {
      const bx = bladeXs[b];
      for (let y = 2; y < 16; y++) {
        const wob = Math.round(Math.sin(y * 0.7 + b * 1.8) * 1.2);
        // vary luma by position and blade
        const li = (b * 2 + y) % lumaVariants.length;
        const luma = lumaVariants[li];
        const px2 = Math.max(0, Math.min(15, bx + wob));
        Px.setPx(t, px2, y, [luma, luma, luma, 255], 1.0);
        // side shadow
        if (px2 > 0) Px.setPx(t, px2 - 1, y, [Math.max(110, luma - 40), Math.max(110, luma - 40), Math.max(110, luma - 40), 255], 0.3);
      }
    }
    Px.toGrey(t, { lift: 1.05 });
    A.add('seagrass', t, { wrap: false });
  }

  // kelp — greyscale broad kelp blade with wavy edge (t:2)
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('kelp');
    // broad wavy blade with fbm luma variation
    for (let y = 0; y < 16; y++) {
      const wob = Math.round(Math.sin(y * 0.5) * 2.0);
      const w = 4 + Math.round(Math.sin(y * 0.8 + 1.0) * 1.5);
      for (let x = 8 - w + wob; x <= 8 + w + wob; x++) {
        const xi = Math.max(0, Math.min(15, x));
        const edge = Math.abs(xi - (8 + wob)) / (w + 0.5);
        const n = Px.fbm(xi, y, 0.35, 2, s, 16);
        // luma based on edge distance + noise
        const baseLuma = edge > 0.7 ? 120 : edge > 0.4 ? 155 : 175;
        const luma = Math.min(210, Math.max(110, baseLuma + Math.round(n * 35 - 17)));
        Px.setPx(t, xi, y, [luma, luma, luma, 255], 1.0);
      }
      // mid-rib (darker)
      const rib = Math.max(0, Math.min(15, 8 + wob));
      Px.setPx(t, rib, y, [115, 115, 115, 255], 0.8);
    }
    Px.toGrey(t, { lift: 1.05 });
    A.add('kelp', t, { wrap: false });
  }

  // pumpkin_top — orange lid, radial ribs, green stem
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('pumpkin_top');
    const pc1 = [200, 100,  25, 255];
    const pc2 = [165,  78,  15, 255];
    const pc3 = [230, 130,  45, 255];
    Px.noiseFill(t, [pc2, pc1, pc3, pc1, pc2], { freq: 0.25, octaves: 2, seed: s, contrast: 1.2, period: 16 });
    // radial ribs
    for (let a = 0; a < 5; a++) {
      const ang = a * Math.PI * 2 / 5;
      Px.line(t, 8, 8, Math.round(8 + Math.cos(ang) * 7), Math.round(8 + Math.sin(ang) * 7), pc2, 0.70);
    }
    // green stem
    Px.setPx(t, 8, 8, [60, 110, 35, 255], 1.0);
    Px.setPx(t, 7, 7, [50,  90, 28, 255], 1.0);
    Px.setPx(t, 9, 7, [70, 130, 40, 255], 0.8);
    Px.edgeShade(t, 0.88);
    A.add('pumpkin_top', t);
  }

  // pumpkin_side — orange with vertical rib grooves
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('pumpkin_side');
    const pc1 = [200, 100, 25, 255];
    const pc2 = [165,  78, 15, 255];
    const pc3 = [230, 130, 45, 255];
    Px.noiseFill(t, [pc2, pc1, pc3, pc1, pc2], { freq: 0.20, octaves: 2, seed: s, contrast: 1.1, period: 16 });
    // vertical rib grooves
    for (let x = 2; x < 16; x += 4) {
      for (let y = 1; y < 15; y++) {
        Px.setPx(t, x, y, pc2, 0.7);
        Px.setPx(t, x - 1, y, pc3, 0.4);
      }
    }
    Px.edgeShade(t, 0.88);
    A.add('pumpkin_side', t, { wrap: false });
  }

  // carved_pumpkin — pumpkin side + triangular eyes + jagged mouth
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('carved_pumpkin');
    const pc1 = [200, 100, 25, 255];
    const pc2 = [165,  78, 15, 255];
    const pc3 = [230, 130, 45, 255];
    Px.noiseFill(t, [pc2, pc1, pc3, pc1, pc2], { freq: 0.20, octaves: 2, seed: s, contrast: 1.1, period: 16 });
    // rib grooves
    for (let x = 2; x < 16; x += 4) {
      for (let y = 1; y < 15; y++) {
        Px.setPx(t, x, y, pc2, 0.7);
      }
    }
    // eyes: dark triangles
    const eyeC = [15, 15, 15, 255];
    Px.polygon(t, [[3, 5], [6, 5], [4, 8]], eyeC);
    Px.polygon(t, [[10, 5], [13, 5], [11, 8]], eyeC);
    // jagged mouth
    const mouthY = 10;
    for (let x = 2; x < 14; x++) {
      const tooth = (x % 3 === 0) ? 0 : 1;
      Px.setPx(t, x, mouthY + tooth, eyeC, 1.0);
      Px.setPx(t, x, mouthY + tooth + 1, eyeC, 1.0);
    }
    Px.edgeShade(t, 0.88);
    A.add('carved_pumpkin', t, { wrap: false });
  }

  // jack_o_lantern — glowing pumpkin face
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('jack_o_lantern');
    const pc1 = [200, 100, 25, 255];
    const pc2 = [165,  78, 15, 255];
    const pc3 = [230, 130, 45, 255];
    Px.noiseFill(t, [pc2, pc1, pc3, pc1, pc2], { freq: 0.20, octaves: 2, seed: s, contrast: 1.1, period: 16 });
    for (let x = 2; x < 16; x += 4) {
      for (let y = 1; y < 15; y++) {
        Px.setPx(t, x, y, pc2, 0.7);
      }
    }
    // glowing interior behind face
    Px.radialGlow(t, 8, 9, 5, [255, 255, 100, 200], [240, 180, 20, 0], { power: 1.5, alpha: 0.7 });
    // eyes: glowing yellow cutouts
    const eyeGlow = [255, 255, 50, 255];
    Px.polygon(t, [[3, 5], [6, 5], [4, 8]], eyeGlow);
    Px.polygon(t, [[10, 5], [13, 5], [11, 8]], eyeGlow);
    // mouth
    const mouthY = 10;
    for (let x = 2; x < 14; x++) {
      const tooth = (x % 3 === 0) ? 0 : 1;
      Px.setPx(t, x, mouthY + tooth, eyeGlow, 1.0);
      Px.setPx(t, x, mouthY + tooth + 1, [255, 230, 80, 255], 1.0);
    }
    Px.edgeShade(t, 0.88);
    A.add('jack_o_lantern', t, { wrap: false });
  }

  // melon_top — green rind top with faint stripes
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('melon_top');
    const mc1 = [90,  160, 55,  255];
    const mc2 = [65,  125, 38,  255];
    const mc3 = [115, 190, 75,  255];
    Px.noiseFill(t, [mc2, mc1, mc3, mc1, mc2], { freq: 0.22, octaves: 2, seed: s, contrast: 1.1, period: 16 });
    // faint radial stripes
    for (let a = 0; a < 6; a++) {
      const ang = a * Math.PI / 3;
      Px.line(t, 8, 8, Math.round(8 + Math.cos(ang) * 7), Math.round(8 + Math.sin(ang) * 7), mc2, 0.5);
    }
    Px.edgeShade(t, 0.88);
    A.add('melon_top', t);
  }

  // melon_side — green with darker vertical stripe bands
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('melon_side');
    const mc1 = [90,  160, 55, 255];
    const mc2 = [65,  125, 38, 255];
    const mc3 = [115, 190, 75, 255];
    const mcs = [50,  100, 28, 255]; // dark stripe
    Px.noiseFill(t, [mc2, mc1, mc3, mc1, mc2], { freq: 0.18, octaves: 2, seed: s, contrast: 1.0, period: 16 });
    // vertical stripe bands
    for (let x = 1; x < 16; x += 4) {
      for (let y = 0; y < 16; y++) {
        Px.setPx(t, x, y, mcs, 0.7);
        Px.setPx(t, x + 1, y, mc3, 0.4);
      }
    }
    Px.edgeShade(t, 0.88);
    A.add('melon_side', t, { wrap: false });
  }

  // nether_wart_block — dense dark red fungal mass
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('nether_wart_block');
    const nwb1 = [140, 20,  20, 255];
    const nwb2 = [105, 12,  12, 255];
    const nwb3 = [170, 35,  35, 255];
    Px.noiseFill(t, [nwb2, nwb1, nwb3, nwb1, nwb2], { freq: 0.30, octaves: 3, seed: s, contrast: 1.4, period: 16 });
    // bumpy pores
    Px.speckle(t, [nwb2], { density: 0.20, seed: s + 5, size: 1 });
    Px.stoneChunks(t, [nwb2, nwb1, nwb3], { cell: 4, seed: s + 10, seam: nwb2, jitter: 0.7 });
    Px.edgeShade(t, 0.88);
    A.add('nether_wart_block', t);
  }

  // nether_wart_2 — red wart sprigs on a stalk
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('nether_wart_2');
    const nws  = [100, 35, 10, 255];
    const nwsD = [72,  22,  6, 255];
    const nwh  = [165, 28, 28, 255];
    const nwl  = [125, 18, 18, 255];
    const nwlD = [88,  10, 10, 255];
    const nwlL = [195, 45, 45, 255];
    // stalk with shading
    for (let y = 7; y < 16; y++) {
      Px.setPx(t, 7, y, nwsD, 0.7);
      Px.setPx(t, 8, y, nws,  1.0);
      Px.setPx(t, 9, y, nws,  0.6);
    }
    // wart clusters — varied shading per cluster
    const wPos = [[6, 7], [10, 6], [5, 10], [11, 9], [8, 5], [7, 12]];
    for (let wi = 0; wi < wPos.length; wi++) {
      const [wx, wy] = wPos[wi];
      Px.circle(t, wx, wy, 2, nwlD);
      Px.circle(t, wx, wy, 1, nwl);
      Px.setPx(t, wx, wy, nwh, 0.9);
      Px.setPx(t, wx - 1, wy - 1, nwlL, 0.6);
    }
    A.add('nether_wart_2', t, { wrap: false });
  }

  // sponge — porous yellow with ~20 dark holes
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('sponge');
    const sy1 = [200, 195, 60, 255];
    const sy2 = [175, 168, 40, 255];
    const sy3 = [220, 215, 80, 255];
    Px.noiseFill(t, [sy2, sy1, sy3, sy1, sy2], { freq: 0.28, octaves: 2, seed: s, contrast: 1.2, period: 16 });
    // irregular dark pores
    for (let i = 0; i < 22; i++) {
      const hx = Math.floor(PLANT_h2(i, 0, s + 20) * 14) + 1;
      const hy = Math.floor(PLANT_h2(i, 1, s + 20) * 14) + 1;
      const hr = 0.7 + PLANT_h2(i, 2, s + 20) * 1.0;
      Px.circle(t, hx, hy, hr, [80, 75, 15, 255]);
    }
    Px.edgeShade(t, 0.90);
    A.add('sponge', t);
  }

  // cobweb — white radial strands from centre + concentric rings
  {
    const t = Px.makeTile(16, 16);
    PLANT_clear(t);
    const s = C.seedFor('cobweb');
    // 6+ distinct colours for the web strands
    const wc1 = [245, 245, 250, 255]; // brightest
    const wc2 = [220, 220, 228, 255];
    const wc3 = [195, 195, 208, 255];
    const wc4 = [170, 170, 185, 255];
    const wc5 = [145, 145, 162, 255];
    const wc6 = [120, 120, 140, 255]; // darkest
    // radial strands — each strand varies from centre out
    for (let a = 0; a < 12; a++) {
      const ang = a * Math.PI / 6;
      for (let r = 1; r < 8; r++) {
        const rx = Math.round(8 + Math.cos(ang) * r);
        const ry = Math.round(8 + Math.sin(ang) * r);
        if (rx < 0 || rx >= 16 || ry < 0 || ry >= 16) continue;
        // fade toward tips
        const c = r < 3 ? wc1 : r < 5 ? wc2 : r < 7 ? wc3 : wc4;
        Px.setPx(t, rx, ry, c, 0.85);
      }
    }
    // concentric web rings — 3 rings at different radii
    const ringCols = [[wc3, 2], [wc5, 4], [wc6, 6]];
    for (const [ringC, ring] of ringCols) {
      for (let a = 0; a < 80; a++) {
        const ang = a * Math.PI / 40;
        const rx = Math.round(8 + Math.cos(ang) * ring);
        const ry = Math.round(8 + Math.sin(ang) * ring);
        if (rx >= 0 && ry >= 0 && rx < 16 && ry < 16) {
          Px.setPx(t, rx, ry, ringC, 0.75);
        }
      }
    }
    // centre anchor dot
    Px.setPx(t, 8, 8, wc1, 1.0);
    Px.setPx(t, 7, 8, wc2, 0.7);
    Px.setPx(t, 9, 8, wc2, 0.7);
    A.add('cobweb', t, { wrap: false });
  }

}
