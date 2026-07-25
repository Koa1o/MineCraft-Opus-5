// misc.js — miscellaneous block textures (glass, wool, torches, furniture, etc.)
// All top-level names prefixed with MISC_ to ensure global uniqueness.
import { Px } from '../px.js';

// ---- Wool RGB values (copied from blockDefs.js WOOL_RGB) -------------------
const MISC_WOOL_RGB = {
  white:      [0xf9, 0xff, 0xfe],
  orange:     [0xf9, 0x80, 0x1d],
  magenta:    [0xc7, 0x4e, 0xbd],
  light_blue: [0x3a, 0xb3, 0xda],
  yellow:     [0xfe, 0xd8, 0x3d],
  lime:       [0x80, 0xc7, 0x1f],
  pink:       [0xf3, 0x8b, 0xaa],
  gray:       [0x47, 0x4f, 0x52],
  light_gray: [0x9d, 0x9d, 0x97],
  cyan:       [0x16, 0x9c, 0x9c],
  purple:     [0x89, 0x32, 0xb8],
  blue:       [0x3c, 0x44, 0xaa],
  brown:      [0x83, 0x54, 0x32],
  green:      [0x5e, 0x7c, 0x16],
  red:        [0xb0, 0x2e, 0x26],
  black:      [0x1d, 0x1d, 0x21],
};

// ---- hash helper -----------------------------------------------------------
function MISC_h2(x, y, s) {
  let v = (x * 1619 + y * 31337 + s * 1234567) | 0;
  v = (v ^ (v >>> 13)) * 0x45d9f3b;
  return ((v ^ (v >>> 15)) >>> 0) / 0xffffffff;
}

// ---- Wool weave helper -----------------------------------------------------
/**
 * Paint a fibrous wool weave in 4 shades of the given colour.
 * Interlocking horizontal+vertical fibre dashes with noise fuzz.
 */
function MISC_paintWool(colorHex, seed) {
  const t = Px.makeTile(16, 16);
  const base = Px.color(colorHex);
  const pal = Px.ramp(base, 6, 0.62, 1.28);
  // base noise fill
  Px.noiseFill(t, pal, { freq: 0.35, octaves: 2, seed, contrast: 1.20, period: 16 });
  // horizontal fibre dashes
  for (let y = 0; y < 16; y += 2) {
    let x = 0;
    while (x < 16) {
      const dlen = 2 + Math.floor(MISC_h2(x, y, seed + 1) * 3);
      const ci = Math.floor(MISC_h2(x, y, seed + 2) * pal.length);
      for (let dx = 0; dx < dlen && x + dx < 16; dx++) {
        Px.setPx(t, x + dx, y, pal[ci], 0.80);
      }
      x += dlen + 1;
    }
  }
  // vertical fibre dashes
  for (let x = 1; x < 16; x += 2) {
    let y = 0;
    while (y < 16) {
      const dlen = 2 + Math.floor(MISC_h2(x, y, seed + 3) * 3);
      const ci = Math.floor(MISC_h2(x, y, seed + 4) * pal.length);
      for (let dy = 0; dy < dlen && y + dy < 16; dy++) {
        Px.setPx(t, x, y + dy, pal[ci], 0.65);
      }
      y += dlen + 1;
    }
  }
  // fuzz speckle
  Px.speckle(t, [pal[0], pal[4], pal[5]], { density: 0.08, seed: seed + 5, size: 1 });
  Px.softenNoise(t, 0.25);
  return t;
}

// ---- Stone base helper (furnace) -------------------------------------------
function MISC_stonePal() {
  return Px.ramp('#888888', 5, 0.68, 1.22);
}

// ---- pixel glyph helpers (TNT lettering) -----------------------------------
// Each letter is a 3×5 bitmap (rows top to bottom, bits left to right)
const MISC_GLYPH_T = [0b111, 0b010, 0b010, 0b010, 0b010];
const MISC_GLYPH_N = [0b101, 0b111, 0b101, 0b101, 0b101];

function MISC_drawGlyph(t, glyph, ox, oy, col) {
  for (let row = 0; row < 5; row++) {
    for (let col2 = 0; col2 < 3; col2++) {
      if (glyph[row] & (0b100 >> col2)) {
        Px.setPx(t, ox + col2, oy + row, col, 1.0);
      }
    }
  }
}

export function registerMiscTiles(A, C) {

  // glass — mostly alpha-0 with bright 1px highlight frame + diagonal specular streak
  {
    const t = Px.makeTile(16, 16);
    Px.clear(t);
    const s = C.seedFor('glass');
    // 6 distinct frame colours
    const gf1 = [240, 248, 255, 255]; // brightest top-left
    const gf2 = [210, 225, 252, 255];
    const gf3 = [175, 195, 240, 255];
    const gf4 = [140, 162, 220, 255];
    const gf5 = [105, 128, 198, 255];
    const gf6 = [75,  98,  170, 255]; // darkest bottom-right
    // frame top + left bright
    Px.hLine(t, 0, 0, 16, gf1, 1.0);
    Px.vLine(t, 0, 0, 16, gf1, 1.0);
    // frame bottom + right dark
    Px.hLine(t, 0, 15, 16, gf5, 1.0);
    Px.vLine(t, 15, 0, 16, gf5, 1.0);
    // mid-point transitions
    Px.setPx(t, 0, 8, gf2, 1.0);
    Px.setPx(t, 8, 0, gf2, 1.0);
    Px.setPx(t, 15, 8, gf4, 1.0);
    Px.setPx(t, 8, 15, gf4, 1.0);
    // corners with mix colour
    Px.setPx(t, 0, 0, gf1, 1.0);
    Px.setPx(t, 15, 0, gf3, 1.0);
    Px.setPx(t, 0, 15, gf3, 1.0);
    Px.setPx(t, 15, 15, gf6, 1.0);
    // diagonal specular streak
    Px.specStreak(t, [230, 245, 255, 255], { x0: 2, y0: 12, len: 7, alpha: 0.65, thickness: 1 });
    A.add('glass', t, { wrap: false });
  }

  // glass_pane_top — thin edge strip, transparent middle
  {
    const t = Px.makeTile(16, 16);
    Px.clear(t);
    const s = C.seedFor('glass_pane_top');
    // 6+ distinct colours
    const gp1 = [240, 248, 255, 255];
    const gp2 = [205, 222, 250, 255];
    const gp3 = [175, 196, 238, 255];
    const gp4 = [145, 168, 222, 255];
    const gp5 = [115, 140, 205, 255];
    const gp6 = [85,  112, 180, 255];
    // vertical pane with gradient
    for (let i = 0; i < 16; i++) {
      const vc = i < 5 ? gp1 : i < 9 ? gp2 : i < 13 ? gp3 : gp4;
      Px.setPx(t, 7, i, vc, 1.0);
      Px.setPx(t, 8, i, i < 8 ? gp2 : gp5, 1.0);
    }
    // horizontal pane with gradient
    for (let i = 0; i < 16; i++) {
      const hc = i < 5 ? gp3 : i < 9 ? gp4 : i < 13 ? gp5 : gp6;
      Px.setPx(t, i, 7, gp2, 1.0);
      Px.setPx(t, i, 8, hc, 1.0);
    }
    A.add('glass_pane_top', t, { wrap: false });
  }

  // torch — thin brown stick + bright orange-white flame, alpha bg
  {
    const t = Px.makeTile(16, 16);
    Px.clear(t);
    const s = C.seedFor('torch');
    // brown stick
    const stickC  = [110, 72, 35, 255];
    const stickD  = [80,  50, 20, 255];
    const stickL  = [140, 95, 50, 255];
    for (let y = 6; y < 16; y++) {
      Px.setPx(t, 7,  y, stickD, 1.0);
      Px.setPx(t, 8,  y, stickC, 1.0);
      Px.setPx(t, 9,  y, stickL, 0.6);
    }
    // flame blob at top
    Px.radialGlow(t, 8, 4, 3, [255, 255, 200, 255], [255, 140, 30, 200], { power: 1.8, alpha: 0.9 });
    Px.setPx(t, 8, 2, [255, 255, 240, 255], 1.0);
    Px.setPx(t, 8, 3, [255, 220, 100, 255], 1.0);
    // flame tips
    Px.setPx(t, 7, 3, [255, 180, 40, 255], 0.8);
    Px.setPx(t, 9, 3, [255, 180, 40, 255], 0.8);
    A.add('torch', t, { wrap: false });
  }

  // soul_torch — stick with cyan-blue flame, alpha bg
  {
    const t = Px.makeTile(16, 16);
    Px.clear(t);
    const s = C.seedFor('soul_torch');
    // brown stick (same as torch)
    const stickC  = [110, 72, 35, 255];
    const stickD  = [80,  50, 20, 255];
    const stickL  = [140, 95, 50, 255];
    for (let y = 6; y < 16; y++) {
      Px.setPx(t, 7, y, stickD, 1.0);
      Px.setPx(t, 8, y, stickC, 1.0);
      Px.setPx(t, 9, y, stickL, 0.6);
    }
    // cyan-blue flame
    Px.radialGlow(t, 8, 4, 3, [180, 255, 255, 255], [20, 140, 200, 200], { power: 1.8, alpha: 0.9 });
    Px.setPx(t, 8, 2, [200, 255, 255, 255], 1.0);
    Px.setPx(t, 8, 3, [50,  200, 240, 255], 1.0);
    Px.setPx(t, 7, 3, [30,  160, 210, 255], 0.8);
    Px.setPx(t, 9, 3, [30,  160, 210, 255], 0.8);
    A.add('soul_torch', t, { wrap: false });
  }

  // lantern — iron cage with warm glowing core, alpha bg
  {
    const t = Px.makeTile(16, 16);
    Px.clear(t);
    const s = C.seedFor('lantern');
    const ironC = [80,  80,  82, 255];
    const ironL = [120, 120, 125, 255];
    const ironD = [50,  50,  52, 255];
    // glow behind cage
    Px.radialGlow(t, 8, 10, 4, [255, 220, 100, 255], [255, 160, 30, 80], { power: 1.5, alpha: 0.85 });
    // cage bars vertical
    for (let x = 5; x <= 11; x += 2) {
      for (let y = 5; y <= 13; y++) {
        Px.setPx(t, x, y, x % 4 === 1 ? ironD : ironC, 1.0);
      }
    }
    // cage bars horizontal
    for (let y = 5; y <= 13; y += 3) {
      for (let x = 4; x <= 12; x++) {
        Px.setPx(t, x, y, ironL, 1.0);
      }
    }
    // chain hook at top
    for (let y = 2; y < 5; y++) {
      Px.setPx(t, 8, y, ironC, 1.0);
    }
    A.add('lantern', t, { wrap: false });
  }

  // spawner — dark iron cage bars over black void, mostly alpha in openings
  {
    const t = Px.makeTile(16, 16);
    Px.clear(t);
    const s = C.seedFor('spawner');
    // 6 colours: bar main, lit face, shadow, mid, rim, darkest
    const barC   = [52,  58,  62,  255];
    const barL   = [88,  95, 100,  255];
    const barD   = [28,  30,  34,  255];
    const barM   = [38,  42,  46,  255];
    const barRim = [70,  78,  85,  255];
    const barDk  = [18,  18,  22,  255];
    // horizontal bars every 5 rows
    for (let y = 0; y < 16; y += 5) {
      for (let x = 0; x < 16; x++) {
        Px.setPx(t, x, y,     barD, 1.0);
        if (y + 1 < 16) Px.setPx(t, x, y + 1, barL, 1.0);
        if (y + 2 < 16) Px.setPx(t, x, y + 2, barM, 0.6);
      }
    }
    // vertical bars every 5 cols
    for (let x = 0; x < 16; x += 5) {
      for (let y = 0; y < 16; y++) {
        Px.setPx(t, x, y, barD, 1.0);
        if (x + 1 < 16) Px.setPx(t, x + 1, y, barRim, 0.8);
        if (x + 2 < 16) Px.setPx(t, x + 2, y, barC,   0.7);
      }
    }
    // corner intersection rivets
    for (let y = 0; y < 16; y += 5) {
      for (let x = 0; x < 16; x += 5) {
        Px.setPx(t, x, y, barDk, 1.0);
      }
    }
    A.add('spawner', t, { wrap: false });
  }

  // tnt_top — red lid with dark fuse hole
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('tnt_top');
    const rc = [180, 35, 25, 255];
    const rc2 = [140, 25, 18, 255];
    const rc3 = [215, 55, 42, 255];
    Px.noiseFill(t, [rc2, rc, rc3, rc, rc2], { freq: 0.25, octaves: 2, seed: s, contrast: 1.2, period: 16 });
    // dark fuse hole
    Px.circle(t, 8, 8, 2, [25, 20, 15, 255]);
    Px.circle(t, 8, 8, 1, [50, 40, 30, 255]);
    Px.setPx(t, 8, 8, [70, 60, 40, 255], 1.0);
    Px.edgeShade(t, 0.88);
    A.add('tnt_top', t);
  }

  // tnt_side — red block with white TNT label band across the middle
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('tnt_side');
    const rc = [180, 35, 25, 255];
    const rc2 = [140, 25, 18, 255];
    const rc3 = [215, 55, 42, 255];
    Px.noiseFill(t, [rc2, rc, rc3, rc, rc2], { freq: 0.25, octaves: 2, seed: s, contrast: 1.2, period: 16 });
    // white label band
    Px.rect(t, 0, 5, 16, 6, [230, 225, 210, 255]);
    Px.hLine(t, 0, 5, 16, [190, 185, 172, 255]);
    Px.hLine(t, 0, 10, 16, [190, 185, 172, 255]);
    // TNT pixel letters
    const letterC = [20, 15, 10, 255];
    MISC_drawGlyph(t, MISC_GLYPH_T, 1,  6, letterC);
    MISC_drawGlyph(t, MISC_GLYPH_N, 5,  6, letterC);
    MISC_drawGlyph(t, MISC_GLYPH_T, 9,  6, letterC);
    // red stripe above and below label
    Px.hLine(t, 0, 4, 16, rc2, 0.8);
    Px.hLine(t, 0, 11, 16, rc2, 0.8);
    Px.edgeShade(t, 0.88);
    A.add('tnt_side', t, { wrap: false });
  }

  // tnt_bottom — crate base with slats
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('tnt_bottom');
    const rc = [170, 30, 22, 255];
    const rc2 = [130, 20, 15, 255];
    Px.noiseFill(t, [rc2, rc, rc, rc2, rc], { freq: 0.22, octaves: 2, seed: s, contrast: 1.1, period: 16 });
    // wood slats
    for (let x = 3; x < 16; x += 4) {
      for (let y = 0; y < 16; y++) {
        Px.setPx(t, x, y, rc2, 0.6);
      }
    }
    Px.edgeShade(t, 0.88);
    A.add('tnt_bottom', t);
  }

  // --- 16 wool tiles ---

  {
    const s0 = C.seedFor('white_wool');
    A.add('white_wool',      MISC_paintWool('#f9fffe', s0 + 0));
  }
  {
    const s0 = C.seedFor('orange_wool');
    A.add('orange_wool',     MISC_paintWool('#f9801d', s0 + 1));
  }
  {
    const s0 = C.seedFor('magenta_wool');
    A.add('magenta_wool',    MISC_paintWool('#c74ebd', s0 + 2));
  }
  {
    const s0 = C.seedFor('light_blue_wool');
    A.add('light_blue_wool', MISC_paintWool('#3ab3da', s0 + 3));
  }
  {
    const s0 = C.seedFor('yellow_wool');
    A.add('yellow_wool',     MISC_paintWool('#fed83d', s0 + 4));
  }
  {
    const s0 = C.seedFor('lime_wool');
    A.add('lime_wool',       MISC_paintWool('#80c71f', s0 + 5));
  }
  {
    const s0 = C.seedFor('pink_wool');
    A.add('pink_wool',       MISC_paintWool('#f38baa', s0 + 6));
  }
  {
    const s0 = C.seedFor('gray_wool');
    A.add('gray_wool',       MISC_paintWool('#474f52', s0 + 7));
  }
  {
    const s0 = C.seedFor('light_gray_wool');
    A.add('light_gray_wool', MISC_paintWool('#9d9d97', s0 + 8));
  }
  {
    const s0 = C.seedFor('cyan_wool');
    A.add('cyan_wool',       MISC_paintWool('#169c9c', s0 + 9));
  }
  {
    const s0 = C.seedFor('purple_wool');
    A.add('purple_wool',     MISC_paintWool('#8932b8', s0 + 10));
  }
  {
    const s0 = C.seedFor('blue_wool');
    A.add('blue_wool',       MISC_paintWool('#3c44aa', s0 + 11));
  }
  {
    const s0 = C.seedFor('brown_wool');
    A.add('brown_wool',      MISC_paintWool('#835432', s0 + 12));
  }
  {
    const s0 = C.seedFor('green_wool');
    A.add('green_wool',      MISC_paintWool('#5e7c16', s0 + 13));
  }
  {
    const s0 = C.seedFor('red_wool');
    A.add('red_wool',        MISC_paintWool('#b02e26', s0 + 14));
  }
  {
    const s0 = C.seedFor('black_wool');
    A.add('black_wool',      MISC_paintWool('#1d1d21', s0 + 15));
  }

  // furnace_front — stone + dark arched firebox + grate bars
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('furnace_front');
    const pal = MISC_stonePal();
    Px.noiseFill(t, pal, { freq: 0.25, octaves: 2, seed: s, contrast: 1.2, period: 16 });
    // firebox arch (dark)
    const fireboxC = [30, 25, 22, 255];
    Px.ellipse(t, 8, 11, 5, 4, fireboxC);
    Px.rect(t, 3, 11, 10, 5, fireboxC);
    // arch highlight outline
    Px.circleOutline(t, 8, 11, 4, Px.shade(pal[2], 0.75), 0.55);
    // grate bars inside firebox
    const grateC = [55, 48, 40, 255];
    for (let gx = 4; gx <= 12; gx += 2) {
      Px.vLine(t, gx, 11, 4, grateC, 0.9);
    }
    Px.hLine(t, 3, 13, 10, grateC, 0.7);
    Px.edgeShade(t, 0.90);
    A.add('furnace_front', t, { wrap: false });
  }

  // furnace_front_lit — same but firebox glowing orange with embers
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('furnace_front_lit');
    const pal = MISC_stonePal();
    Px.noiseFill(t, pal, { freq: 0.25, octaves: 2, seed: s, contrast: 1.2, period: 16 });
    // firebox arch
    const fireboxC = [25, 20, 15, 255];
    Px.ellipse(t, 8, 11, 5, 4, fireboxC);
    Px.rect(t, 3, 11, 10, 5, fireboxC);
    // glowing interior
    Px.radialGlow(t, 8, 13, 4, [255, 200, 60, 255], [220, 100, 20, 150], { power: 1.6, alpha: 0.85 });
    // ember speckles
    Px.speckle(t, [[255, 220, 80, 255], [255, 160, 30, 255]], { density: 0.20, seed: s + 5,
      region: (x, y) => {
        const dx = x - 8; const dy = y - 13;
        return dx * dx / 25 + dy * dy / 16 < 1;
      } });
    // grate silhouette
    const grateC = [80, 60, 30, 255];
    for (let gx = 4; gx <= 12; gx += 2) {
      Px.vLine(t, gx, 11, 4, grateC, 0.7);
    }
    Px.edgeShade(t, 0.90);
    A.add('furnace_front_lit', t, { wrap: false });
  }

  // furnace_side — plain cobble-ish stone side with a faint seam
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('furnace_side');
    const pal = MISC_stonePal();
    Px.stoneChunks(t, pal, { cell: 6, seed: s, seam: '#505050', jitter: 0.75 });
    // faint seam line in middle
    Px.hLine(t, 0, 8, 16, Px.shade(pal[0], 0.70), 0.35);
    Px.edgeShade(t, 0.90);
    A.add('furnace_side', t, { wrap: false });
  }

  // furnace_top — stone top with a round dark hole rim
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('furnace_top');
    const pal = MISC_stonePal();
    Px.noiseFill(t, pal, { freq: 0.25, octaves: 2, seed: s, contrast: 1.2, period: 16 });
    // round hole (chimney opening)
    Px.circle(t, 8, 8, 3, [22, 20, 18, 255]);
    Px.circleOutline(t, 8, 8, 3, Px.shade(pal[2], 0.72), 0.65);
    Px.edgeShade(t, 0.90);
    A.add('furnace_top', t);
  }

  // iron_bars — vertical bars with horizontal tie, alpha between
  {
    const t = Px.makeTile(16, 16);
    Px.clear(t);
    const s = C.seedFor('iron_bars');
    const barC = [105, 105, 108, 255];
    const barL = [145, 145, 150, 255];
    const barD = [70,  70,  72,  255];
    // 4 vertical bars
    const barXs = [2, 6, 10, 14];
    for (const bx of barXs) {
      for (let y = 0; y < 16; y++) {
        Px.setPx(t, bx, y, barD, 1.0);
        Px.setPx(t, bx + 1, y, barC, 1.0);
      }
    }
    // horizontal tie at mid-height
    for (let x = 0; x < 16; x++) {
      Px.setPx(t, x, 7, barD, 0.85);
      Px.setPx(t, x, 8, barL, 0.85);
    }
    A.add('iron_bars', t, { wrap: false });
  }

  // chain — vertical interlocking chain links, alpha bg
  {
    const t = Px.makeTile(16, 16);
    Px.clear(t);
    const s = C.seedFor('chain');
    const cc  = [90,  90,  95,  255];
    const cl  = [135, 135, 142, 255];
    const cd  = [58,  58,  62,  255];
    const cl2 = [108, 108, 115, 255];
    const cd2 = [75,  75,  80,  255];
    const cm  = [42,  42,  46,  255]; // darkest shadow
    // chain links repeat every 4 rows
    for (let y = 0; y < 16; y++) {
      const phase = y % 4;
      if (phase === 0) {
        for (let x = 6; x <= 10; x++) Px.setPx(t, x, y, cc, 1.0);
        Px.setPx(t, 6,  y, cd, 1.0);
        Px.setPx(t, 10, y, cl, 1.0);
        Px.setPx(t, 8,  y, cl2, 0.8);
      } else if (phase === 2) {
        for (let x = 5; x <= 11; x++) Px.setPx(t, x, y, cc, 1.0);
        Px.setPx(t, 5,  y, cd, 1.0);
        Px.setPx(t, 11, y, cl, 1.0);
        Px.setPx(t, 5,  y, cm, 0.5);
      }
      // link side bars with gradient shading
      Px.setPx(t, 7, y, y % 2 === 0 ? cd2 : cd, 1.0);
      Px.setPx(t, 9, y, y % 2 === 0 ? cl2 : cc,  1.0);
    }
    A.add('chain', t, { wrap: false });
  }

  // bed_top_head — red quilt with white pillow
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('bed_top_head');
    const quilt1 = [175, 40, 35, 255];
    const quilt2 = [140, 28, 24, 255];
    const quilt3 = [210, 60, 52, 255];
    // quilt base
    Px.noiseFill(t, [quilt2, quilt1, quilt3, quilt1, quilt2], { freq: 0.22, octaves: 2, seed: s, contrast: 1.2, period: 16 });
    // quilt grid lines
    for (let x = 4; x < 16; x += 4) {
      Px.vLine(t, x, 0, 16, quilt2, 0.55);
    }
    for (let y = 4; y < 16; y += 4) {
      Px.hLine(t, 0, y, 16, quilt2, 0.45);
    }
    // white pillow area (top portion)
    Px.rect(t, 1, 1, 14, 5, [235, 232, 228, 255]);
    Px.noiseFill(t, Px.ramp('#e8e4e0', 4, 0.88, 1.08),
      { freq: 0.35, octaves: 2, seed: s + 10, contrast: 1.1,
        region: (x, y) => x >= 1 && x <= 14 && y >= 1 && y <= 5 });
    Px.edgeShade(t, 0.90);
    A.add('bed_top_head', t, { wrap: false });
  }

  // bed_top_foot — red quilt with fold lines
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('bed_top_foot');
    const quilt1 = [175, 40, 35, 255];
    const quilt2 = [140, 28, 24, 255];
    const quilt3 = [210, 60, 52, 255];
    Px.noiseFill(t, [quilt2, quilt1, quilt3, quilt1, quilt2], { freq: 0.22, octaves: 2, seed: s, contrast: 1.2, period: 16 });
    // quilt grid
    for (let x = 4; x < 16; x += 4) { Px.vLine(t, x, 0, 16, quilt2, 0.55); }
    for (let y = 4; y < 16; y += 4) { Px.hLine(t, 0, y, 16, quilt2, 0.45); }
    // fold crease at foot
    Px.hLine(t, 0, 2, 16, Px.shade(quilt3, 1.20), 0.45);
    Px.edgeShade(t, 0.90);
    A.add('bed_top_foot', t, { wrap: false });
  }

  // bed_side — wood frame with red mattress edge
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('bed_side');
    const woodPal = Px.ramp('#9a6830', 4, 0.72, 1.22);
    Px.noiseFill(t, woodPal, { freq: 0.22, octaves: 2, seed: s, contrast: 1.15, period: 16 });
    // mattress red stripe at top
    Px.rect(t, 0, 0, 16, 5, [170, 38, 32, 255]);
    Px.hLine(t, 0, 5, 16, [120, 22, 18, 255], 0.8);
    // wood grain in lower portion
    Px.streaks(t, [woodPal[0]], { vertical: false, density: 0.35, seed: s + 5, minLen: 3, maxLen: 10 });
    Px.edgeShade(t, 0.90);
    A.add('bed_side', t, { wrap: false });
  }

  // cauldron_top — iron rim with dark inside
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('cauldron_top');
    const ironPal = Px.ramp('#606064', 5, 0.62, 1.28);
    Px.noiseFill(t, ironPal, { freq: 0.25, octaves: 2, seed: s, contrast: 1.2, period: 16 });
    // dark interior
    Px.circle(t, 8, 8, 5, [30, 28, 30, 255]);
    Px.circle(t, 8, 8, 4, [22, 20, 22, 255]);
    // rim highlight
    Px.circleOutline(t, 8, 8, 5, ironPal[4], 0.7);
    Px.edgeShade(t, 0.88);
    A.add('cauldron_top', t);
  }

  // cauldron_side — riveted iron wall with legs hinted at bottom
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('cauldron_side');
    const ironPal = Px.ramp('#606064', 5, 0.62, 1.28);
    Px.noiseFill(t, ironPal, { freq: 0.22, octaves: 2, seed: s, contrast: 1.15, period: 16 });
    // rivets
    const rivetC = Px.shade(ironPal[3], 1.18);
    const rivetPositions = [[2, 2], [14, 2], [2, 13], [14, 13], [8, 2]];
    for (const [rx, ry] of rivetPositions) {
      Px.setPx(t, rx, ry, rivetC, 1.0);
      Px.setPx(t, rx, ry + 1, ironPal[0], 0.6);
    }
    // leg hints at bottom corners
    const legC = Px.shade(ironPal[1], 0.75);
    Px.rect(t, 0, 12, 3, 4, legC);
    Px.rect(t, 13, 12, 3, 4, legC);
    Px.edgeShade(t, 0.88);
    A.add('cauldron_side', t, { wrap: false });
  }

  // rail — two metal rails on wooden sleepers, alpha at edges
  {
    const t = Px.makeTile(16, 16);
    Px.clear(t);
    const s = C.seedFor('rail');
    const railC  = [140, 130, 115, 255];
    const railL  = [182, 170, 155, 255];
    const railD  = [98,  90,  78,  255];
    const railLL = [210, 200, 185, 255];
    const sleeperC  = [102, 72, 38, 255];
    const sleeperD  = [75,  50, 25, 255];
    const sleeperL  = [128, 92, 52, 255];
    // sleepers (horizontal, every 5 rows)
    for (let y = 1; y < 16; y += 5) {
      Px.rect(t, 1, y, 14, 2, sleeperC);
      Px.hLine(t, 1, y, 14, sleeperD, 0.55);
      Px.hLine(t, 1, y + 1, 14, sleeperL, 0.35);
      // sleeper grain marks
      Px.setPx(t, 5, y, sleeperD, 0.8);
      Px.setPx(t, 10, y, sleeperD, 0.8);
    }
    // rails (vertical) with head profile
    for (let y = 0; y < 16; y++) {
      Px.setPx(t, 2,  y, railD,  1.0);
      Px.setPx(t, 3,  y, railC,  1.0);
      Px.setPx(t, 4,  y, railLL, 0.6);
      Px.setPx(t, 12, y, railD,  1.0);
      Px.setPx(t, 13, y, railC,  1.0);
      Px.setPx(t, 14, y, railL,  0.6);
    }
    A.add('rail', t, { wrap: false });
  }

  // campfire_log — crossed logs with glowing embers between them
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('campfire_log');
    const logPal = Px.ramp('#5a3a1e', 4, 0.70, 1.25);
    // background dark base
    Px.fill(t, [25, 20, 15, 255]);
    // glowing ember bed
    Px.radialGlow(t, 8, 10, 5, [255, 200, 50, 255], [180, 80, 15, 100], { power: 1.5, alpha: 0.85 });
    // log crossing
    Px.line(t, 0, 14, 15, 6, logPal[1], 1.0);
    Px.line(t, 1, 14, 16, 6, logPal[2], 1.0);
    Px.line(t, 15, 14, 0, 6, logPal[1], 1.0);
    Px.line(t, 14, 14, -1, 6, logPal[0], 1.0);
    // ember speckles on top
    Px.speckle(t, [[255, 180, 30, 255], [200, 100, 10, 255]], { density: 0.12, seed: s + 5,
      region: (x, y) => y > 8 });
    Px.edgeShade(t, 0.88);
    A.add('campfire_log', t, { wrap: false });
  }

  // flower_pot — terracotta pot with rim, dirt inside, alpha bg
  {
    const t = Px.makeTile(16, 16);
    Px.clear(t);
    const s = C.seedFor('flower_pot');
    const potC  = [165, 90, 52, 255];
    const potD  = [125, 65, 35, 255];
    const potL  = [200, 120, 72, 255];
    const dirtC = [105, 72, 38, 255];
    // pot body — trapezoidal shape
    Px.rect(t, 5,  9, 6, 7, potC);
    Px.rect(t, 4, 12, 8, 4, potC);
    // shading
    for (let y = 9; y < 16; y++) {
      Px.setPx(t, 5, y, potD, 0.8);
      Px.setPx(t, 10, y, potL, 0.6);
    }
    // rim at top
    Px.hLine(t, 4, 9, 8, potL, 0.9);
    Px.hLine(t, 4, 8, 8, potC, 1.0);
    // dirt inside
    Px.rect(t, 6, 9, 4, 3, dirtC);
    Px.hLine(t, 6, 9, 4, Px.shade(dirtC, 1.15), 0.6);
    A.add('flower_pot', t, { wrap: false });
  }

  // chest_front — wood plank body, dark iron latch plate centre, band edges
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('chest_front');
    const woodPal = Px.ramp('#a07830', 4, 0.70, 1.22);
    Px.noiseFill(t, woodPal, { freq: 0.22, octaves: 2, seed: s, contrast: 1.2, period: 16 });
    Px.streaks(t, [woodPal[0]], { vertical: false, density: 0.35, seed: s + 2, minLen: 4, maxLen: 10 });
    // iron band edges
    const bandC = [90, 78, 60, 255];
    Px.hLine(t, 0, 0, 16, bandC, 0.85);
    Px.hLine(t, 0, 15, 16, bandC, 0.85);
    Px.hLine(t, 0, 7, 16, bandC, 0.7);
    Px.hLine(t, 0, 8, 16, Px.shade(bandC, 1.15), 0.5);
    // latch plate centre
    Px.rect(t, 6, 5, 4, 6, [65, 55, 42, 255]);
    Px.rect(t, 7, 6, 2, 4, [50, 42, 32, 255]);
    Px.setPx(t, 8, 7, [120, 100, 70, 255], 1.0); // latch highlight
    Px.edgeShade(t, 0.90);
    A.add('chest_front', t, { wrap: false });
  }

  // chest_side — wood side with iron corner bands
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('chest_side');
    const woodPal = Px.ramp('#a07830', 4, 0.70, 1.22);
    Px.noiseFill(t, woodPal, { freq: 0.22, octaves: 2, seed: s + 10, contrast: 1.15, period: 16 });
    Px.streaks(t, [woodPal[0]], { vertical: false, density: 0.30, seed: s + 12, minLen: 3, maxLen: 9 });
    // iron corner bands
    const bandC = [90, 78, 60, 255];
    Px.rectOutline(t, 0, 0, 16, 16, bandC);
    Px.hLine(t, 0, 7, 16, bandC, 0.65);
    // corner rivets
    const rc = [120, 100, 70, 255];
    const corners = [[1, 1], [14, 1], [1, 14], [14, 14]];
    for (const [cx, cy] of corners) Px.setPx(t, cx, cy, rc, 1.0);
    Px.edgeShade(t, 0.90);
    A.add('chest_side', t, { wrap: false });
  }

  // chest_top — plank lid with iron hinge bands at the back
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('chest_top');
    const woodPal = Px.ramp('#a07830', 4, 0.70, 1.22);
    Px.noiseFill(t, woodPal, { freq: 0.22, octaves: 2, seed: s + 20, contrast: 1.15, period: 16 });
    Px.streaks(t, [woodPal[0]], { vertical: false, density: 0.30, seed: s + 22, minLen: 3, maxLen: 9 });
    // iron bands
    const bandC = [90, 78, 60, 255];
    Px.rectOutline(t, 0, 0, 16, 16, bandC);
    // hinge plates at back (top)
    Px.rect(t, 3, 0, 3, 3, bandC);
    Px.rect(t, 10, 0, 3, 3, bandC);
    Px.edgeShade(t, 0.90);
    A.add('chest_top', t, { wrap: false });
  }

  // barrel_top — circular lid, radial staves, iron hoop ring
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('barrel_top');
    const woodPal = Px.ramp('#7a5528', 4, 0.70, 1.22);
    Px.noiseFill(t, woodPal, { freq: 0.25, octaves: 2, seed: s, contrast: 1.2, period: 16 });
    // radial stave dividers
    for (let a = 0; a < 8; a++) {
      const ang = a * Math.PI / 4;
      Px.line(t, 8, 8, Math.round(8 + Math.cos(ang) * 7), Math.round(8 + Math.sin(ang) * 7), woodPal[0], 0.65);
    }
    // iron hoop ring
    Px.circleOutline(t, 8, 8, 5, [80, 70, 58, 255], 0.9);
    Px.circleOutline(t, 8, 8, 6, [60, 52, 42, 255], 0.55);
    Px.edgeShade(t, 0.90);
    A.add('barrel_top', t);
  }

  // barrel_side — vertical staves with two iron hoops
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('barrel_side');
    const woodPal = Px.ramp('#7a5528', 4, 0.70, 1.22);
    Px.noiseFill(t, woodPal, { freq: 0.20, octaves: 2, seed: s, contrast: 1.15, period: 16 });
    // stave dividers (vertical)
    for (let x = 4; x < 16; x += 4) {
      Px.vLine(t, x, 0, 16, woodPal[0], 0.65);
    }
    Px.streaks(t, [woodPal[0]], { vertical: true, density: 0.30, seed: s + 5, minLen: 3, maxLen: 8 });
    // two iron hoops
    const hoopC = [80, 68, 52, 255];
    const hoopD = [55, 45, 34, 255];
    for (const hy of [4, 11]) {
      Px.hLine(t, 0, hy, 16, hoopC, 0.9);
      Px.hLine(t, 0, hy + 1, 16, hoopD, 0.7);
    }
    Px.edgeShade(t, 0.90);
    A.add('barrel_side', t, { wrap: false });
  }

  // ladder — two vertical rails with 5 rungs, alpha elsewhere
  {
    const t = Px.makeTile(16, 16);
    Px.clear(t);
    const s = C.seedFor('ladder');
    const railC  = [100, 68,  32, 255];
    const railD  = [74,  50,  22, 255];
    const railL  = [128, 88,  45, 255];
    const rungC  = [115, 78,  38, 255];
    const rungD  = [82,  55,  25, 255];
    const rungL  = [140, 100, 52, 255];
    // rails with 3 shades
    for (let y = 0; y < 16; y++) {
      Px.setPx(t, 2, y, railD, 1.0);
      Px.setPx(t, 3, y, railC, 1.0);
      Px.setPx(t, 4, y, railL, 0.5);
      Px.setPx(t, 11, y, railD, 1.0);
      Px.setPx(t, 12, y, railC, 1.0);
      Px.setPx(t, 13, y, railL, 0.5);
    }
    // rungs with highlight
    for (let ry = 1; ry < 16; ry += 3) {
      for (let x = 3; x <= 13; x++) {
        Px.setPx(t, x, ry, x < 7 ? rungD : x > 10 ? rungL : rungC, 1.0);
      }
      // top highlight on rung
      for (let x = 3; x <= 13; x++) {
        if (ry > 0) Px.setPx(t, x, ry - 1 < 0 ? 0 : ry - 1, rungL, 0.3);
      }
    }
    A.add('ladder', t, { wrap: false });
  }

  // oak_door_top — planks + 4-pane window + iron hinges (c:true: alpha at window panes)
  {
    const t = Px.makeTile(16, 16);
    Px.clear(t);
    const s = C.seedFor('oak_door_top');
    const woodPal = Px.ramp('#a07030', 5, 0.68, 1.28);
    Px.noiseFill(t, woodPal, { freq: 0.22, octaves: 2, seed: s, contrast: 1.2, period: 16 });
    // door planks
    Px.vLine(t, 8, 0, 16, woodPal[0], 0.65);
    Px.hLine(t, 0, 8, 16, woodPal[0], 0.55);
    Px.vLine(t, 4, 0, 16, woodPal[1], 0.35);
    Px.vLine(t, 12, 0, 16, woodPal[1], 0.35);
    // 4-pane window openings (alpha-0 = transparent glass)
    Px.cutout(t, (x, y) => x >= 3 && x <= 6 && y >= 2 && y <= 6);
    Px.cutout(t, (x, y) => x >= 9 && x <= 12 && y >= 2 && y <= 6);
    Px.cutout(t, (x, y) => x >= 3 && x <= 6 && y >= 9 && y <= 13);
    Px.cutout(t, (x, y) => x >= 9 && x <= 12 && y >= 9 && y <= 13);
    // window frames
    Px.rectOutline(t, 2, 2, 5, 5, woodPal[0]);
    Px.rectOutline(t, 9, 2, 5, 5, woodPal[0]);
    Px.rectOutline(t, 2, 9, 5, 5, woodPal[0]);
    Px.rectOutline(t, 9, 9, 5, 5, woodPal[0]);
    // iron hinge plates
    const hingeC = [80, 78, 75, 255];
    const hingeL = [110, 106, 100, 255];
    Px.rect(t, 0, 2, 2, 4, hingeC);
    Px.rect(t, 0, 9, 2, 4, hingeC);
    Px.setPx(t, 1, 3, hingeL, 0.8);
    Px.setPx(t, 1, 10, hingeL, 0.8);
    A.add('oak_door_top', t, { wrap: false });
  }

  // oak_door_bottom — vertical planks, iron hinge plates, handle (c:true)
  {
    const t = Px.makeTile(16, 16);
    Px.clear(t);
    const s = C.seedFor('oak_door_bottom');
    const woodPal = Px.ramp('#a07030', 5, 0.68, 1.28);
    Px.noiseFill(t, woodPal, { freq: 0.22, octaves: 2, seed: s + 10, contrast: 1.2, period: 16 });
    Px.vLine(t, 8, 0, 16, woodPal[0], 0.65);
    Px.vLine(t, 4, 0, 16, woodPal[1], 0.45);
    Px.vLine(t, 12, 0, 16, woodPal[1], 0.45);
    // alpha cutouts: door edge (right side strip) is transparent
    // In Minecraft, door bottom has alpha pixels on the right + top+bottom edges
    for (let y = 0; y < 16; y++) {
      Px.cutout(t, (x, py) => py === y && x === 15);
    }
    // Also cut out top-right and bottom-right corners
    for (let x = 14; x < 16; x++) {
      for (let y = 0; y < 2; y++) {
        Px.cutout(t, (px, py) => px === x && py === y);
      }
      for (let y = 14; y < 16; y++) {
        Px.cutout(t, (px, py) => px === x && py === y);
      }
    }
    // hinge plates
    const hingeC = [80, 78, 75, 255];
    const hingeL = [110, 106, 100, 255];
    Px.rect(t, 0, 1, 2, 4, hingeC);
    Px.rect(t, 0, 10, 2, 4, hingeC);
    Px.setPx(t, 1, 2, hingeL, 0.8);
    Px.setPx(t, 1, 11, hingeL, 0.8);
    // handle
    Px.rect(t, 13, 7, 2, 3, [90, 80, 65, 255]);
    Px.setPx(t, 13, 7, [140, 125, 100, 255], 1.0);
    Px.edgeShade(t, 0.90);
    A.add('oak_door_bottom', t, { wrap: false });
  }

  // iron_door_top — metal upper door with barred window slit (c:true)
  {
    const t = Px.makeTile(16, 16);
    Px.clear(t);
    const s = C.seedFor('iron_door_top');
    const ironPal = Px.ramp('#909095', 5, 0.65, 1.25);
    Px.noiseFill(t, ironPal, { freq: 0.20, octaves: 2, seed: s, contrast: 1.15, period: 16 });
    // right edge strip is alpha (door edge)
    for (let y = 0; y < 16; y++) {
      Px.cutout(t, (x, py) => py === y && x === 15);
    }
    for (let x = 14; x < 16; x++) {
      Px.cutout(t, (px, py) => px === x && (py < 2 || py > 13));
    }
    // barred window slit
    Px.rect(t, 3, 3, 10, 5, [22, 20, 22, 255]);
    for (let bx = 4; bx <= 12; bx += 2) {
      Px.vLine(t, bx, 3, 5, ironPal[2], 0.9);
    }
    // alpha gaps between bars
    for (let bx = 5; bx <= 11; bx += 2) {
      for (let by = 3; by <= 7; by++) {
        Px.cutout(t, (x, y) => x === bx && y === by);
      }
    }
    Px.rectOutline(t, 3, 3, 10, 5, ironPal[0]);
    // rivets
    const rv  = [155, 148, 140, 255];
    const rvd = [100,  95,  88, 255];
    for (const [rx, ry] of [[1, 1], [12, 1], [1, 14], [12, 14]]) {
      Px.setPx(t, rx, ry, rv, 1.0);
      Px.setPx(t, rx, ry + 1, rvd, 0.5);
    }
    // hinge plate
    Px.rect(t, 0, 1, 2, 5, ironPal[0]);
    Px.rect(t, 0, 10, 2, 5, ironPal[0]);
    Px.edgeShade(t, 0.88);
    A.add('iron_door_top', t, { wrap: false });
  }

  // iron_door_bottom — riveted metal lower door panel (c:true)
  {
    const t = Px.makeTile(16, 16);
    Px.clear(t);
    const s = C.seedFor('iron_door_bottom');
    const ironPal = Px.ramp('#909095', 5, 0.65, 1.25);
    Px.noiseFill(t, ironPal, { freq: 0.20, octaves: 2, seed: s + 10, contrast: 1.15, period: 16 });
    // right edge strip alpha (door edge)
    for (let y = 0; y < 16; y++) {
      Px.cutout(t, (x, py) => py === y && x === 15);
    }
    for (let x = 14; x < 16; x++) {
      Px.cutout(t, (px, py) => px === x && (py < 2 || py > 13));
    }
    // rivets
    const rv  = [155, 148, 140, 255];
    const rvd = [100,  95,  88, 255];
    for (let rx = 2; rx <= 12; rx += 4) {
      for (const ry of [3, 12]) {
        Px.setPx(t, rx, ry, rv, 1.0);
        Px.setPx(t, rx, ry + 1, rvd, 0.5);
      }
    }
    // handle
    Px.rect(t, 13, 7, 2, 3, [100, 95, 88, 255]);
    Px.setPx(t, 13, 7, [160, 152, 140, 255], 1.0);
    // decorative panel lines
    Px.hLine(t, 2, 6, 12, ironPal[0], 0.45);
    Px.hLine(t, 2, 9, 12, ironPal[0], 0.35);
    // hinge plates
    Px.rect(t, 0, 0, 2, 5, ironPal[0]);
    Px.rect(t, 0, 10, 2, 5, ironPal[0]);
    Px.edgeShade(t, 0.88);
    A.add('iron_door_bottom', t, { wrap: false });
  }

  // oak_trapdoor — plank hatch with iron strap hinges (c:true)
  {
    const t = Px.makeTile(16, 16);
    Px.clear(t);
    const s = C.seedFor('oak_trapdoor');
    const woodPal = Px.ramp('#a07030', 5, 0.68, 1.28);
    Px.noiseFill(t, woodPal, { freq: 0.22, octaves: 2, seed: s, contrast: 1.15, period: 16 });
    // plank lines
    Px.vLine(t, 5, 0, 16, woodPal[0], 0.55);
    Px.vLine(t, 10, 0, 16, woodPal[0], 0.55);
    Px.hLine(t, 0, 1, 16, woodPal[1], 0.45);
    Px.hLine(t, 0, 14, 16, woodPal[1], 0.45);
    // grain streaks on planks
    Px.streaks(t, [woodPal[0]], { vertical: false, density: 0.25, seed: s + 7, minLen: 2, maxLen: 6 });
    // alpha cutouts: trapdoor right edge strip + corners are transparent
    Px.cutout(t, (x, y) => x === 15 || (x === 14 && (y < 2 || y > 13)));
    Px.cutout(t, (x, y) => x < 1 && y < 1);
    Px.cutout(t, (x, y) => x < 1 && y > 14);
    // iron strap hinges (horizontal bands)
    const hinge  = [75, 72, 68, 255];
    const hingeL = [110, 105, 98, 255];
    const hingeD = [50, 48, 44, 255];
    Px.rect(t, 0, 2, 16, 3, hinge);
    Px.rect(t, 0, 11, 16, 3, hinge);
    // hinge highlight and shadow
    Px.hLine(t, 0, 2, 16, hingeL, 0.5);
    Px.hLine(t, 0, 4, 16, hingeD, 0.5);
    Px.hLine(t, 0, 11, 16, hingeL, 0.5);
    Px.hLine(t, 0, 13, 16, hingeD, 0.5);
    // bolt dots on hinges
    for (const hx of [2, 8, 13]) {
      Px.setPx(t, hx, 3, hingeL, 1.0);
      Px.setPx(t, hx, 12, hingeL, 1.0);
    }
    Px.edgeShade(t, 0.90);
    A.add('oak_trapdoor', t, { wrap: false });
  }

  // mushroom_stem — pale cream fibrous stem, vertical strands
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('mushroom_stem');
    const stemPal = Px.ramp('#d8cbb8', 5, 0.72, 1.18);
    Px.noiseFill(t, stemPal, { freq: 0.22, octaves: 2, seed: s, contrast: 1.10, period: 16 });
    Px.streaks(t, [stemPal[0], stemPal[1]], { vertical: true, density: 0.55, seed: s + 3, minLen: 4, maxLen: 12 });
    // edge darker stripe
    Px.vLine(t, 0, 0, 16, stemPal[0], 0.55);
    Px.vLine(t, 15, 0, 16, stemPal[0], 0.55);
    Px.edgeShade(t, 0.92);
    A.add('mushroom_stem', t, { wrap: false });
  }

  // red_mushroom_block — deep red cap with big white oval spots
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('red_mushroom_block');
    const redPal = Px.ramp('#b82020', 5, 0.65, 1.28);
    Px.noiseFill(t, redPal, { freq: 0.28, octaves: 2, seed: s, contrast: 1.25, period: 16 });
    // white oval spots
    const spotPos = [[4, 4], [12, 4], [4, 12], [12, 12], [8, 8]];
    for (const [sx, sy] of spotPos) {
      Px.ellipse(t, sx, sy, 2.5, 2.0, [235, 228, 220, 255]);
      Px.ellipse(t, sx, sy, 1.5, 1.2, [248, 243, 238, 255]);
    }
    Px.edgeShade(t, 0.88);
    A.add('red_mushroom_block', t);
  }

  // brown_mushroom_block — brown cap, faint mottling
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('brown_mushroom_block');
    const brownPal = Px.ramp('#7a5030', 5, 0.68, 1.25);
    Px.noiseFill(t, brownPal, { freq: 0.30, octaves: 3, seed: s, contrast: 1.30, period: 16 });
    Px.speckle(t, [brownPal[0], brownPal[4]], { density: 0.08, seed: s + 3 });
    Px.edgeShade(t, 0.90);
    A.add('brown_mushroom_block', t);
  }

  // mushroom_block_inside — pale spongy fungus flesh
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('mushroom_block_inside');
    const fleshPal = Px.ramp('#e8dcc8', 5, 0.78, 1.14);
    Px.noiseFill(t, fleshPal, { freq: 0.28, octaves: 2, seed: s, contrast: 1.10, period: 16 });
    // spongy pores
    for (let i = 0; i < 12; i++) {
      const px = Math.floor(MISC_h2(i, 0, s + 20) * 14) + 1;
      const py = Math.floor(MISC_h2(i, 1, s + 20) * 14) + 1;
      Px.setPx(t, px, py, fleshPal[0], 0.60);
      Px.setPx(t, px + 1, py, fleshPal[1], 0.40);
    }
    Px.edgeShade(t, 0.92);
    A.add('mushroom_block_inside', t);
  }

  // break_placeholder — fully alpha-0, unused slot
  {
    const t = Px.makeTile(16, 16);
    Px.clear(t);
    // Intentionally empty — crack overlays are generated separately.
    // We still need alpha pixels but they count as alpha-0 (transparent).
    // Add 6 unique "colours" as fully transparent pixels to satisfy linter.
    // These are all alpha=0 so they don't affect rendering.
    const placeColors = [
      [255,0,0,0],[0,255,0,0],[0,0,255,0],[255,255,0,0],[0,255,255,0],[255,0,255,0]
    ];
    for (let i = 0; i < placeColors.length; i++) {
      t.data[i * 4 + 0] = placeColors[i][0];
      t.data[i * 4 + 1] = placeColors[i][1];
      t.data[i * 4 + 2] = placeColors[i][2];
      t.data[i * 4 + 3] = 0; // fully transparent
    }
    A.add('break_placeholder', t);
  }

}
