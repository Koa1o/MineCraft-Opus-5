// ---------------------------------------------------------------------------
// Item icon painters. All top-level names prefixed ITEM_ for concatenation safety.
// Exported: registerItemTiles(A, C)
// ---------------------------------------------------------------------------
import { Px } from './px.js';
import { WOOL_RGB } from '../world/blockDefs.js';

// ---------------------------------------------------------------------------
// Shared palette helpers
// ---------------------------------------------------------------------------
const ITEM_OUTLINE = '#1a1214';

function ITEM_h2(x, y, s) {
  let v = (x * 1619 + y * 31337 + s * 1234567) | 0;
  v = (v ^ (v >>> 13)) * 0x45d9f3b;
  return ((v ^ (v >>> 15)) >>> 0) / 0xffffffff;
}

// Tier palettes: wood, stone, iron, gold, diamond, netherite
const ITEM_TIER_PAL = {
  wooden:    Px.ramp('#8b5e28', 5, 0.55, 1.30),
  stone:     Px.ramp('#8c8c8c', 5, 0.55, 1.25),
  iron:      Px.ramp('#d0d8e0', 5, 0.62, 1.28),
  golden:    Px.ramp('#f0c030', 5, 0.60, 1.35),
  diamond:   Px.ramp('#20e8e0', 5, 0.55, 1.30),
  netherite: Px.ramp('#303038', 5, 0.50, 1.40),
  leather:   Px.ramp('#9b5c1a', 5, 0.55, 1.28),
  chain:     Px.ramp('#909090', 5, 0.55, 1.28),
};
const ITEM_HANDLE_PAL = Px.ramp('#7a5530', 4, 0.60, 1.20);

// Dark outline around silhouette — walk all opaque border pixels
function ITEM_addOutline(t) {
  const snap = new Uint8ClampedArray(t.data);
  const isOpaque = (x, y) => {
    if (x < 0 || y < 0 || x >= t.w || y >= t.h) return false;
    return snap[(y * t.w + x) * 4 + 3] > 10;
  };
  const out = Px.color(ITEM_OUTLINE);
  for (let y = 0; y < t.h; y++) {
    for (let x = 0; x < t.w; x++) {
      if (isOpaque(x, y)) continue;
      if (isOpaque(x - 1, y) || isOpaque(x + 1, y) || isOpaque(x, y - 1) || isOpaque(x, y + 1)) {
        Px.setPx(t, x, y, out);
      }
    }
  }
}

// Top-left light: brighten top-left, darken bottom-right
function ITEM_applyLight(t) {
  for (let y = 0; y < t.h; y++) {
    for (let x = 0; x < t.w; x++) {
      const c = Px.getPx(t, x, y);
      if (c[3] < 10) continue;
      const f = 1.0 + 0.18 * ((t.w - 1 - x + t.h - 1 - y) / (t.w + t.h - 2) - 0.5) * 2;
      Px.setPx(t, x, y, Px.shade(c, f));
    }
  }
}

// ---------------------------------------------------------------------------
// ITEM_paintTool — shared for all 30 tools
// headShape: 'pick'|'axe'|'shovel'|'hoe'|'sword'
// ---------------------------------------------------------------------------
function ITEM_paintTool(t, headShape, tierName, seed) {
  Px.clear(t);
  const headPal = ITEM_TIER_PAL[tierName] || ITEM_TIER_PAL.iron;
  const hndPal  = ITEM_HANDLE_PAL;

  if (headShape === 'sword') {
    // Blade: diagonal from top-right to centre
    // Pommel + crossguard
    const blade = headPal;
    // Blade: 8px diagonal strip
    for (let i = 0; i < 8; i++) {
      Px.setPx(t, 11 - i, 1 + i, blade[3]);
      Px.setPx(t, 12 - i, 1 + i, blade[4]);
    }
    // Crossguard horizontal bar at y=9
    Px.hLine(t, 4, 9, 7, blade[2]);
    Px.hLine(t, 4, 8, 7, blade[4]);
    // Handle
    for (let i = 0; i < 4; i++) {
      Px.setPx(t, 5 + i * 0, 10 + i, hndPal[1]);
      Px.setPx(t, 6,         10 + i, hndPal[2]);
    }
    Px.setPx(t, 6, 14, blade[1]); // pommel
    Px.setPx(t, 7, 14, blade[2]);
    // Highlight on blade
    for (let i = 0; i < 7; i++) Px.setPx(t, 12 - i, 1 + i, blade[4], 0.6);
  } else if (headShape === 'pick') {
    // Pick head: wide arc with two prongs
    const h = headPal;
    // Main horizontal beam
    Px.hLine(t, 1, 3, 13, h[2]);
    Px.hLine(t, 1, 4, 13, h[3]);
    // Left prong
    Px.setPx(t, 1, 2, h[4]); Px.setPx(t, 1, 5, h[1]);
    // Right prong (two tips)
    Px.setPx(t, 13, 2, h[4]); Px.setPx(t, 14, 3, h[4]); Px.setPx(t, 14, 4, h[3]);
    // Centre pick tip (down-pointing)
    Px.setPx(t, 7, 4, h[4]); Px.setPx(t, 8, 4, h[4]);
    Px.setPx(t, 7, 5, h[3]); Px.setPx(t, 8, 5, h[3]);
    Px.setPx(t, 7, 6, h[2]);
    // Handle diagonal
    Px.line(t, 7, 7, 3, 13, hndPal[1]);
    Px.line(t, 8, 7, 4, 13, hndPal[2]);
    Px.line(t, 9, 7, 5, 13, hndPal[0]);
  } else if (headShape === 'axe') {
    const h = headPal;
    // Blade: wedge on top-right
    Px.polygon(t, [[6,1],[14,1],[14,7],[8,7]], h[3]);
    Px.polygon(t, [[6,1],[8,1],[8,7],[6,7]], h[2]);
    // Bevel
    Px.line(t, 14, 1, 14, 7, h[4]);
    Px.line(t, 6, 1, 14, 1, h[4]);
    // Handle
    Px.line(t, 5, 5, 2, 13, hndPal[2]);
    Px.line(t, 6, 5, 3, 13, hndPal[1]);
    Px.line(t, 7, 5, 4, 13, hndPal[0]);
  } else if (headShape === 'shovel') {
    const h = headPal;
    // Scoop: rounded rectangle bottom
    Px.rect(t, 5, 1, 5, 8, h[2]);
    Px.hLine(t, 6, 9, 3, h[1]);  // rounded bottom
    Px.setPx(t, 5, 8, h[1]); Px.setPx(t, 9, 8, h[1]);
    // Highlight
    Px.vLine(t, 5, 1, 8, h[4]);
    Px.hLine(t, 5, 1, 5, h[4]);
    // Handle
    Px.line(t, 7, 9, 4, 14, hndPal[2]);
    Px.line(t, 8, 9, 5, 14, hndPal[1]);
  } else if (headShape === 'hoe') {
    const h = headPal;
    // L-shape head
    Px.hLine(t, 4, 2, 9, h[3]);
    Px.hLine(t, 4, 3, 9, h[2]);
    Px.vLine(t, 12, 2, 4, h[3]);
    Px.vLine(t, 13, 2, 4, h[4]);
    // Handle
    Px.line(t, 4, 4, 1, 13, hndPal[2]);
    Px.line(t, 5, 4, 2, 13, hndPal[1]);
    Px.line(t, 6, 4, 3, 13, hndPal[0]);
  }

  ITEM_addOutline(t);
  ITEM_applyLight(t);
}

// ---------------------------------------------------------------------------
// ITEM_paintIngot
// ---------------------------------------------------------------------------
function ITEM_paintIngot(t, pal, seed) {
  Px.clear(t);
  // Rounded bar shape: 12x7 centred
  const x0 = 2, y0 = 4, w = 12, h = 7;
  // Fill with noise
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const n = ITEM_h2(x, y, seed);
      const idx = Math.min(pal.length - 1, Math.floor(n * pal.length));
      Px.setPx(t, x, y, pal[idx]);
    }
  }
  // Bright bevel top row
  Px.hLine(t, x0, y0, w, Px.shade(pal[pal.length - 1], 1.3));
  Px.vLine(t, x0, y0, h, Px.shade(pal[pal.length - 1], 1.2));
  // Dark shadow bottom-right
  Px.hLine(t, x0, y0 + h - 1, w, Px.shade(pal[0], 0.7));
  Px.vLine(t, x0 + w - 1, y0, h, Px.shade(pal[0], 0.75));
  // Rounded corners: clear
  Px.setPx(t, x0, y0, [0, 0, 0, 0]);
  Px.setPx(t, x0 + w - 1, y0, [0, 0, 0, 0]);
  Px.setPx(t, x0, y0 + h - 1, [0, 0, 0, 0]);
  Px.setPx(t, x0 + w - 1, y0 + h - 1, [0, 0, 0, 0]);
  ITEM_addOutline(t);
  ITEM_applyLight(t);
}

// ---------------------------------------------------------------------------
// ITEM_paintGem — faceted with highlight pixels
// ---------------------------------------------------------------------------
function ITEM_paintGem(t, pal, seed) {
  Px.clear(t);
  // Diamond/octagon shape
  const cx = 7, cy = 7;
  const pts = [
    [cx, cy - 5], [cx + 4, cy - 2], [cx + 4, cy + 2],
    [cx, cy + 5], [cx - 4, cy + 2], [cx - 4, cy - 2],
  ];
  Px.polygon(t, pts, pal[2]);
  // Facets
  Px.polygon(t, [[cx, cy - 5], [cx + 4, cy - 2], [cx, cy]], pal[4]);
  Px.polygon(t, [[cx - 4, cy - 2], [cx, cy - 5], [cx, cy]], pal[3]);
  Px.polygon(t, [[cx + 4, cy + 2], [cx, cy + 5], [cx, cy]], pal[1]);
  Px.polygon(t, [[cx, cy + 5], [cx - 4, cy + 2], [cx, cy]], pal[0]);
  // White highlight pixels (2-3)
  Px.setPx(t, cx - 1, cy - 3, [255, 255, 255, 220]);
  Px.setPx(t, cx - 2, cy - 2, [255, 255, 255, 160]);
  Px.setPx(t, cx + 2, cy + 2, [255, 255, 255, 80]);
  ITEM_addOutline(t);
}

// ---------------------------------------------------------------------------
// ITEM_paintArmor
// ---------------------------------------------------------------------------
function ITEM_paintArmor(t, slot, tierName, seed) {
  Px.clear(t);
  const pal = ITEM_TIER_PAL[tierName] || ITEM_TIER_PAL.iron;

  if (slot === 'helmet') {
    // Dome shape
    Px.polygon(t, [[4,6],[12,6],[13,9],[12,12],[4,12],[3,9]], pal[2]);
    // Face slot (dark cutout)
    Px.rect(t, 5, 8, 6, 3, [20, 20, 30, 220]);
    Px.hLine(t, 4, 6, 8, pal[4]);
    Px.vLine(t, 4, 6, 6, pal[3]);
    Px.hLine(t, 4, 12, 8, pal[0]);
  } else if (slot === 'chestplate') {
    // Shoulders + body
    Px.rect(t, 2, 2, 4, 3, pal[3]); // left shoulder
    Px.rect(t, 10, 2, 4, 3, pal[3]); // right shoulder
    Px.rect(t, 3, 5, 10, 8, pal[2]); // body
    Px.hLine(t, 3, 5, 10, pal[4]);
    Px.vLine(t, 3, 5, 8, pal[3]);
    Px.hLine(t, 3, 12, 10, pal[0]);
    Px.vLine(t, 12, 5, 8, pal[0]);
    // Centre line
    Px.vLine(t, 7, 5, 8, pal[1], 0.5);
    Px.vLine(t, 8, 5, 8, pal[1], 0.5);
  } else if (slot === 'leggings') {
    // Two legs
    Px.rect(t, 2, 2, 5, 4, pal[2]);  // left leg top
    Px.rect(t, 9, 2, 5, 4, pal[2]); // right leg top
    Px.rect(t, 2, 6, 4, 7, pal[2]);  // left leg
    Px.rect(t, 10, 6, 4, 7, pal[2]); // right leg
    Px.setPx(t, 7, 3, pal[1]); Px.setPx(t, 8, 3, pal[1]); // crotch
    Px.hLine(t, 2, 2, 5, pal[4]);
    Px.hLine(t, 9, 2, 5, pal[4]);
    Px.vLine(t, 2, 2, 11, pal[3]);
    Px.vLine(t, 13, 2, 11, pal[0]);
  } else if (slot === 'boots') {
    // Two boot shapes
    Px.rect(t, 2, 5, 4, 7, pal[2]);   // left boot
    Px.rect(t, 10, 5, 4, 7, pal[2]);  // right boot
    Px.rect(t, 2, 11, 5, 2, pal[2]);  // left sole
    Px.rect(t, 9, 11, 5, 2, pal[2]);  // right sole
    Px.hLine(t, 2, 5, 4, pal[4]);
    Px.hLine(t, 10, 5, 4, pal[4]);
    Px.hLine(t, 2, 12, 5, pal[0]);
    Px.hLine(t, 9, 12, 5, pal[0]);
  }

  ITEM_addOutline(t);
  ITEM_applyLight(t);
}

// ---------------------------------------------------------------------------
// ITEM_paintFood
// ---------------------------------------------------------------------------
function ITEM_paintApple(t) {
  Px.clear(t);
  const red = Px.ramp('#c03020', 4, 0.6, 1.3);
  Px.circle(t, 8, 9, 5, red[2]);
  Px.circle(t, 8, 9, 4, red[2]);
  // shade
  Px.speckle(t, [red[1], red[3]], { density: 0.3, seed: 11 });
  // Stem
  Px.vLine(t, 8, 3, 3, '#5a3a10');
  // Leaf
  Px.setPx(t, 9, 3, '#28a020'); Px.setPx(t, 10, 4, '#28a020'); Px.setPx(t, 9, 4, '#38b030');
  // Highlight
  Px.setPx(t, 5, 6, [255, 255, 255, 120]); Px.setPx(t, 6, 5, [255, 255, 255, 80]);
  ITEM_addOutline(t); ITEM_applyLight(t);
}

function ITEM_paintBread(t) {
  Px.clear(t);
  const pal = Px.ramp('#c89048', 4, 0.65, 1.25);
  // Oval loaf
  Px.ellipse(t, 8, 8, 6, 4, pal[2]);
  Px.ellipse(t, 8, 8, 5, 3, pal[3]);
  // Score marks
  Px.line(t, 4, 7, 12, 7, Px.shade(pal[0], 0.7));
  Px.line(t, 5, 9, 11, 9, Px.shade(pal[0], 0.75));
  Px.hLine(t, 3, 8, 10, pal[1]);
  // Crust darkening at edges
  Px.ellipse(t, 8, 8, 6, 4, Px.shade(pal[0], 0.8));
  Px.ellipse(t, 8, 8, 5, 3, pal[2]);
  Px.speckle(t, [pal[1], pal[3]], { density: 0.15, seed: 22 });
  ITEM_addOutline(t); ITEM_applyLight(t);
}

function ITEM_paintMeat(t, raw, kind) {
  Px.clear(t);
  const col = raw ? (kind === 'fish' ? '#e8c090' : '#d06848') : (kind === 'fish' ? '#c09060' : '#8b3010');
  const pal = Px.ramp(col, 4, 0.65, 1.25);
  if (kind === 'chop') {
    // Porkchop silhouette: irregular blob with bone
    Px.polygon(t, [[3,4],[9,2],[13,5],[12,10],[8,13],[3,10]], pal[2]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.25, seed: 33 });
    // Bone (white)
    Px.line(t, 10, 3, 14, 7, '#f0ede0');
    Px.setPx(t, 13, 6, '#f0ede0'); Px.setPx(t, 14, 5, '#f0ede0');
  } else if (kind === 'fish') {
    Px.ellipse(t, 8, 8, 5, 3, pal[2]);
    // Tail
    Px.polygon(t, [[12, 6],[15, 4],[15, 12],[12, 10]], pal[1]);
    // Eye
    Px.setPx(t, 4, 7, '#101018');
    // Fin
    Px.line(t, 6, 5, 10, 5, pal[3]);
    Px.speckle(t, [pal[0], pal[3]], { density: 0.18, seed: 44 });
  } else {
    Px.ellipse(t, 8, 8, 5, 4, pal[2]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.22, seed: 55 });
  }
  ITEM_addOutline(t); ITEM_applyLight(t);
}

function ITEM_paintCarrot(t) {
  Px.clear(t);
  // Orange tapered body
  Px.polygon(t, [[6,3],[10,3],[9,13],[7,13]], '#d06820');
  Px.polygon(t, [[6,3],[10,3],[9,13],[7,13]], '#e07828');
  Px.speckle(t, ['#c05018', '#f08030'], { density: 0.15, seed: 66 });
  // Green top
  Px.setPx(t, 7, 2, '#28a020'); Px.setPx(t, 8, 1, '#38b030'); Px.setPx(t, 9, 2, '#28a020');
  Px.setPx(t, 6, 2, '#209018'); Px.setPx(t, 10, 2, '#209018');
  ITEM_addOutline(t); ITEM_applyLight(t);
}

function ITEM_paintPotato(t, baked) {
  Px.clear(t);
  const col = baked ? '#a06828' : '#c0a050';
  const pal = Px.ramp(col, 4, 0.65, 1.25);
  // Lumpy oval
  Px.ellipse(t, 8, 9, 5, 4, pal[2]);
  Px.speckle(t, [pal[0], pal[3]], { density: 0.2, seed: 77 });
  // Eye divots
  Px.setPx(t, 5, 8, pal[0]); Px.setPx(t, 10, 9, pal[0]); Px.setPx(t, 7, 12, pal[0]);
  ITEM_addOutline(t); ITEM_applyLight(t);
}

function ITEM_paintMelonSlice(t) {
  Px.clear(t);
  // Wedge shape: green rind + red flesh
  Px.polygon(t, [[2,13],[14,13],[8,2]], '#28a020');
  Px.polygon(t, [[3,12],[13,12],[8,4]], '#e03028');
  Px.speckle(t, ['#e85040', '#c02018'], { density: 0.18, seed: 88 });
  // Seeds
  for (let i = 0; i < 4; i++) {
    const sx = 5 + i * 2, sy = 8 + (i % 2);
    Px.setPx(t, sx, sy, '#201810');
  }
  // Rind line
  Px.line(t, 3, 12, 13, 12, '#38b030');
  ITEM_addOutline(t); ITEM_applyLight(t);
}

function ITEM_paintCookie(t) {
  Px.clear(t);
  const pal = Px.ramp('#c08030', 4, 0.65, 1.25);
  Px.circle(t, 8, 8, 5, pal[2]);
  Px.speckle(t, [pal[1], pal[3]], { density: 0.25, seed: 99 });
  // Chocolate chips (dark spots)
  for (let i = 0; i < 5; i++) {
    const cx = 4 + ((i * 37) % 8), cy = 4 + ((i * 29) % 8);
    Px.setPx(t, cx, cy, '#401800'); Px.setPx(t, cx + 1, cy, '#502010');
  }
  ITEM_addOutline(t); ITEM_applyLight(t);
}

function ITEM_paintPumpkinPie(t) {
  Px.clear(t);
  // Wedge slice
  Px.polygon(t, [[2,13],[14,13],[8,3]], '#c07020');
  Px.polygon(t, [[3,12],[13,12],[8,4]], '#d88030');
  Px.speckle(t, ['#c87028', '#e09040'], { density: 0.18, seed: 101 });
  // Crust edge
  Px.line(t, 2, 13, 14, 13, '#a06020');
  Px.line(t, 2, 13, 8, 3, '#a06020');
  Px.line(t, 14, 13, 8, 3, '#a06020');
  ITEM_addOutline(t); ITEM_applyLight(t);
}

// ---------------------------------------------------------------------------
// ITEM_paintDye
// ---------------------------------------------------------------------------
function ITEM_paintDye(t, rgb) {
  Px.clear(t);
  const base = rgb;
  const pal = [
    Px.shade(base, 0.55), Px.shade(base, 0.75),
    base, Px.shade(base, 1.20), Px.shade(base, 1.35),
  ];
  // Powder pile shape (rounded bottom pile)
  Px.ellipse(t, 8, 11, 5, 3, pal[2]);
  Px.ellipse(t, 8, 10, 4, 2, pal[3]);
  Px.speckle(t, [pal[1], pal[4]], { density: 0.3, seed: 200 });
  // Highlight on top
  Px.setPx(t, 7, 9, pal[4]); Px.setPx(t, 8, 9, pal[3]);
  ITEM_addOutline(t); ITEM_applyLight(t);
}

// ---------------------------------------------------------------------------
// ITEM_paintSpawnEgg
// ---------------------------------------------------------------------------
function ITEM_paintSpawnEgg(t, baseRgb, spotRgb, seed) {
  Px.clear(t);
  const basePal = Px.ramp(baseRgb, 4, 0.60, 1.25);
  const spotCol = spotRgb;
  // Egg oval
  Px.ellipse(t, 8, 8, 5, 6, basePal[2]);
  Px.speckle(t, [basePal[1], basePal[3]], { density: 0.12, seed });
  // Spots
  for (let i = 0; i < 5; i++) {
    const sx = 4 + Math.floor(ITEM_h2(i, 0, seed + 1) * 8);
    const sy = 3 + Math.floor(ITEM_h2(i, 1, seed + 1) * 10);
    Px.setPx(t, sx, sy, spotCol);
    Px.setPx(t, sx + 1, sy, Px.shade(spotCol, 0.8));
  }
  // Highlight
  Px.setPx(t, 5, 5, [255, 255, 255, 150]);
  ITEM_addOutline(t); ITEM_applyLight(t);
}

// ---------------------------------------------------------------------------
// ITEM_paintBucket — iron pail + fill
// ---------------------------------------------------------------------------
function ITEM_paintBucket(t, fill) {
  Px.clear(t);
  const iron = Px.ramp('#b0b8c0', 4, 0.60, 1.25);
  // Bucket body: trapezoid
  Px.polygon(t, [[4,5],[12,5],[14,14],[2,14]], iron[2]);
  Px.speckle(t, [iron[1], iron[3]], { density: 0.15, seed: 300 });
  // Handle arc
  Px.line(t, 4, 5, 4, 2, iron[3]);
  Px.line(t, 12, 5, 12, 2, iron[3]);
  Px.hLine(t, 4, 2, 9, iron[3]);
  // Fill
  if (fill === 'water') {
    Px.rect(t, 3, 8, 10, 6, [40, 80, 200, 180]);
    Px.hLine(t, 3, 8, 10, [80, 140, 220, 200]);
  } else if (fill === 'lava') {
    Px.rect(t, 3, 8, 10, 6, [220, 80, 20, 220]);
    Px.speckle(t, ['#ff9020', '#ffb040'], { density: 0.3, seed: 301 });
  } else if (fill === 'milk') {
    Px.rect(t, 3, 8, 10, 6, [240, 240, 240, 240]);
    Px.hLine(t, 3, 8, 10, [255, 255, 255, 220]);
  }
  // Bevel top
  Px.hLine(t, 4, 5, 8, iron[3]);
  // Bottom
  Px.hLine(t, 2, 14, 12, iron[1]);
  ITEM_addOutline(t); ITEM_applyLight(t);
}

// ---------------------------------------------------------------------------
// ITEM_paintMisc — misc items
// ---------------------------------------------------------------------------
function ITEM_paintMiscItem(t, id, seed) {
  Px.clear(t);

  if (id === 'stick') {
    // Brown diagonal stick
    const pal = Px.ramp('#7a5530', 4, 0.60, 1.20);
    Px.line(t, 12, 1, 2, 13, pal[2]);
    Px.line(t, 13, 1, 3, 13, pal[3]);
    Px.line(t, 11, 1, 1, 13, pal[1]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'coal' || id === 'charcoal') {
    const dark = id === 'coal' ? '#1a1a22' : '#2a2018';
    const pal = Px.ramp(dark, 4, 0.50, 1.35);
    Px.stoneChunks(t, pal, { cell: 5, seed, seam: '#0a0a10' });
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'flint') {
    const pal = Px.ramp('#484858', 4, 0.5, 1.3);
    Px.polygon(t, [[4,2],[12,4],[13,11],[7,14],[2,10]], pal[2]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.2, seed });
    Px.line(t, 4, 2, 12, 4, pal[3]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'clay_ball') {
    const pal = Px.ramp('#8090a0', 4, 0.65, 1.20);
    Px.circle(t, 8, 8, 5, pal[2]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.2, seed });
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'brick') {
    const pal = Px.ramp('#a0502a', 4, 0.60, 1.25);
    Px.rect(t, 2, 5, 12, 6, pal[2]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.2, seed });
    Px.hLine(t, 2, 5, 12, pal[3]);
    Px.vLine(t, 2, 5, 6, pal[3]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'glowstone_dust') {
    const pal = ['#c8a820', '#e0c030', '#f8e040', '#fff080'];
    Px.ellipse(t, 8, 10, 5, 3, pal[1]);
    Px.speckle(t, [pal[0], pal[2], pal[3]], { density: 0.35, seed });
    Px.radialGlow(t, 8, 9, 5, pal[3], pal[1], { alpha: 0.4 });
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'gunpowder') {
    const pal = Px.ramp('#484848', 4, 0.50, 1.25);
    Px.ellipse(t, 8, 10, 5, 3, pal[1]);
    Px.speckle(t, [pal[0], pal[2]], { density: 0.35, seed });
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'string') {
    const col = '#d8d0c0';
    // Tangled loop
    Px.circle(t, 8, 8, 4, col);
    Px.circle(t, 8, 8, 2, [0, 0, 0, 0]);
    Px.line(t, 6, 4, 10, 8, col);
    Px.line(t, 10, 6, 6, 10, col);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'feather') {
    // Quill with spine and barbs
    Px.line(t, 8, 1, 8, 14, '#e8e0d0');
    for (let i = 0; i < 6; i++) {
      Px.line(t, 8, 2 + i * 2, 3, 3 + i * 2 + 1, '#d0c8b8');
      Px.line(t, 8, 2 + i * 2, 13, 3 + i * 2 + 1, '#d0c8b8');
    }
    Px.setPx(t, 8, 14, '#a09080'); Px.setPx(t, 8, 13, '#b0a890');
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'leather') {
    const pal = Px.ramp('#8b5030', 4, 0.60, 1.25);
    // Hide patch shape
    Px.polygon(t, [[3,4],[7,2],[12,3],[14,8],[12,13],[7,14],[3,12],[2,8]], pal[2]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.2, seed });
    // Texture lines
    Px.line(t, 4, 6, 12, 8, pal[1], 0.5);
    Px.line(t, 4, 9, 12, 11, pal[1], 0.5);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'rabbit_hide') {
    const pal = Px.ramp('#c0a070', 4, 0.60, 1.25);
    Px.polygon(t, [[4,4],[8,2],[12,4],[13,10],[8,14],[3,10]], pal[2]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.18, seed });
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'bone') {
    const pal = Px.ramp('#e8e0d0', 4, 0.70, 1.20);
    // Diagonal bone
    Px.line(t, 3, 3, 13, 13, pal[2]);
    Px.line(t, 4, 3, 14, 13, pal[3]);
    // Round ends
    Px.circle(t, 3, 3, 2, pal[2]);
    Px.circle(t, 13, 13, 2, pal[2]);
    Px.circle(t, 5, 3, 2, pal[2]);
    Px.circle(t, 11, 13, 2, pal[2]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'bone_meal') {
    const pal = ['#e0d8c8', '#f0e8d8', '#fff8f0'];
    Px.ellipse(t, 8, 10, 5, 3, pal[1]);
    Px.speckle(t, [pal[0], pal[2]], { density: 0.3, seed });
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'blaze_rod') {
    const pal = Px.ramp('#e0a020', 4, 0.60, 1.35);
    Px.line(t, 11, 1, 3, 13, pal[2]);
    Px.line(t, 12, 1, 4, 13, pal[3]);
    Px.line(t, 10, 1, 2, 13, pal[1]);
    // Glow
    Px.radialGlow(t, 7, 7, 6, '#fff0a0', pal[3], { alpha: 0.3 });
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'blaze_powder') {
    const pal = ['#c07010', '#e09020', '#f8b030', '#ffe060'];
    Px.ellipse(t, 8, 10, 5, 3, pal[2]);
    Px.speckle(t, [pal[0], pal[3]], { density: 0.3, seed });
    Px.radialGlow(t, 8, 9, 4, pal[3], pal[1], { alpha: 0.3 });
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'ender_pearl') {
    const pal = Px.ramp('#18a098', 4, 0.55, 1.35);
    Px.circle(t, 8, 8, 5, pal[2]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.2, seed });
    // Swirl
    Px.line(t, 6, 5, 10, 9, pal[3], 0.6);
    Px.line(t, 10, 6, 6, 10, pal[1], 0.5);
    Px.radialGlow(t, 7, 7, 3, '#a0fff8', pal[3], { alpha: 0.5 });
    Px.setPx(t, 5, 5, [255, 255, 255, 180]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'ender_eye') {
    const pal = Px.ramp('#28c0b0', 4, 0.55, 1.30);
    Px.ellipse(t, 8, 8, 5, 4, pal[2]);
    Px.ellipse(t, 8, 8, 3, 2, '#600080');
    Px.speckle(t, [pal[1], pal[3]], { density: 0.15, seed });
    Px.radialGlow(t, 8, 8, 4, '#c0fff0', pal[2], { alpha: 0.4 });
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'ghast_tear') {
    const pal = Px.ramp('#c0d8f0', 4, 0.65, 1.25);
    Px.polygon(t, [[8,2],[11,6],[8,14],[5,6]], pal[2]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.12, seed });
    Px.setPx(t, 7, 4, [255, 255, 255, 180]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'magma_cream') {
    const pal = Px.ramp('#d04010', 4, 0.60, 1.30);
    Px.circle(t, 8, 8, 5, pal[2]);
    Px.speckle(t, ['#204010', '#304820'], { density: 0.25, seed });
    Px.speckle(t, [pal[1], pal[3]], { density: 0.15, seed: seed + 1 });
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'slime_ball') {
    const pal = Px.ramp('#60c040', 4, 0.60, 1.30);
    Px.circle(t, 8, 8, 5, [pal[2][0], pal[2][1], pal[2][2], 220]);
    Px.speckle(t, [[pal[1][0], pal[1][1], pal[1][2], 180]], { density: 0.2, seed });
    Px.setPx(t, 5, 5, [255, 255, 255, 150]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'spider_eye') {
    Px.circle(t, 8, 8, 5, '#a01818');
    Px.circle(t, 8, 8, 3, '#200810');
    Px.setPx(t, 6, 6, [255, 255, 255, 160]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'rotten_flesh') {
    const pal = Px.ramp('#588038', 4, 0.55, 1.20);
    Px.ellipse(t, 8, 8, 5, 4, pal[1]);
    Px.speckle(t, [pal[0], pal[2], '#804028'], { density: 0.3, seed });
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'phantom_membrane') {
    const pal = Px.ramp('#6080a0', 4, 0.60, 1.25);
    Px.rect(t, 2, 4, 12, 8, [pal[2][0], pal[2][1], pal[2][2], 200]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.15, seed });
    Px.line(t, 2, 4, 14, 12, pal[1], 0.5);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'shulker_shell') {
    const pal = Px.ramp('#a060c0', 4, 0.60, 1.30);
    Px.ellipse(t, 8, 7, 5, 4, pal[2]);
    Px.ellipse(t, 8, 11, 5, 3, pal[1]);
    Px.hLine(t, 3, 9, 10, pal[3]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.12, seed });
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'nautilus_shell') {
    const pal = Px.ramp('#e0c080', 4, 0.60, 1.25);
    Px.circleOutline(t, 8, 8, 5, pal[2]);
    Px.circleOutline(t, 8, 8, 3, pal[1]);
    Px.circleOutline(t, 8, 8, 1, pal[0]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.1, seed });
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'prismarine_shard') {
    const pal = Px.ramp('#30b0a0', 4, 0.55, 1.30);
    Px.polygon(t, [[8,2],[13,8],[8,14],[3,8]], pal[2]);
    Px.polygon(t, [[8,2],[13,8],[8,8]], pal[3]);
    Px.setPx(t, 7, 4, [255, 255, 255, 150]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'prismarine_crystals') {
    const pal = Px.ramp('#40c8b8', 4, 0.55, 1.35);
    for (let i = 0; i < 3; i++) {
      const cx = 4 + i * 4, cy = 5 + (i % 2) * 3;
      Px.polygon(t, [[cx, cy - 3], [cx + 2, cy], [cx, cy + 3], [cx - 1, cy]], pal[2 + (i % 2)]);
    }
    Px.radialGlow(t, 8, 8, 5, '#a0fff8', pal[2], { alpha: 0.25 });
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'scute') {
    const pal = Px.ramp('#609040', 4, 0.60, 1.25);
    Px.polygon(t, [[4,3],[12,3],[14,9],[8,14],[2,9]], pal[2]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.18, seed });
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'honeycomb') {
    const pal = Px.ramp('#e08820', 4, 0.60, 1.30);
    // Hexagon pattern
    const hexCenters = [[6, 5], [10, 5], [8, 9]];
    for (const [hx, hy] of hexCenters) {
      Px.polygon(t, [
        [hx, hy - 3], [hx + 2, hy - 1], [hx + 2, hy + 1],
        [hx, hy + 3], [hx - 2, hy + 1], [hx - 2, hy - 1]
      ], pal[2]);
      Px.polygon(t, [
        [hx, hy - 2], [hx + 1, hy - 1], [hx + 1, hy + 1],
        [hx, hy + 2], [hx - 1, hy + 1], [hx - 1, hy - 1]
      ], pal[3]);
    }
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'ink_sac') {
    Px.circle(t, 8, 8, 5, '#101018');
    Px.speckle(t, ['#201820', '#302030'], { density: 0.2, seed });
    Px.setPx(t, 5, 5, [60, 40, 70, 180]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'glow_ink_sac') {
    const pal = Px.ramp('#1060a0', 4, 0.55, 1.35);
    Px.circle(t, 8, 8, 5, pal[1]);
    Px.radialGlow(t, 8, 8, 4, '#80e0ff', pal[2], { alpha: 0.4 });
    Px.setPx(t, 5, 5, [180, 240, 255, 180]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'sugar') {
    const pal = ['#e8e8f0', '#f8f8ff', '#ffffff'];
    Px.ellipse(t, 8, 10, 5, 3, pal[1]);
    Px.speckle(t, [pal[0], pal[2]], { density: 0.3, seed });
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'paper') {
    const pal = Px.ramp('#f0e8c8', 4, 0.70, 1.18);
    Px.rect(t, 3, 2, 10, 12, pal[2]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.08, seed });
    // Lines on paper
    for (let ly = 5; ly < 12; ly += 2) Px.hLine(t, 4, ly, 8, pal[1], 0.6);
    Px.hLine(t, 3, 2, 10, pal[3]);
    Px.vLine(t, 3, 2, 12, pal[3]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'book') {
    const pal = Px.ramp('#804020', 4, 0.60, 1.25);
    Px.rect(t, 2, 2, 12, 12, pal[2]);
    Px.rect(t, 3, 3, 4, 10, '#f0e8d0');
    Px.rect(t, 7, 3, 6, 10, '#f8f0e0');
    Px.speckle(t, [pal[1], pal[3]], { density: 0.1, seed });
    Px.vLine(t, 6, 2, 12, pal[0]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'wheat') {
    const pal = Px.ramp('#d0a828', 4, 0.60, 1.25);
    // Stem
    Px.line(t, 8, 13, 8, 4, '#a09020');
    // Grain head
    for (let i = 0; i < 4; i++) {
      Px.setPx(t, 7 + (i % 2), 4 + i, pal[3]);
      Px.setPx(t, 8 + (i % 2), 4 + i, pal[2]);
    }
    // Side leaflets
    Px.line(t, 8, 7, 4, 9, '#78a020');
    Px.line(t, 8, 9, 12, 11, '#78a020');
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'wheat_seeds' || id === 'melon_seeds' || id === 'pumpkin_seeds' || id === 'beetroot_seeds') {
    const col = id === 'melon_seeds' ? '#c0c848' : id === 'pumpkin_seeds' ? '#c0a028' : id === 'beetroot_seeds' ? '#c04840' : '#d0b828';
    const pal = Px.ramp(col, 4, 0.60, 1.25);
    for (let i = 0; i < 3; i++) {
      const sx = 4 + i * 4, sy = 6 + (i % 2) * 4;
      Px.ellipse(t, sx, sy, 2, 3, pal[2]);
      Px.speckle(t, [pal[1], pal[3]], { density: 0.2, seed: seed + i });
    }
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'nether_wart') {
    const pal = Px.ramp('#900820', 4, 0.55, 1.30);
    Px.circle(t, 6, 9, 4, pal[2]);
    Px.circle(t, 10, 8, 3, pal[2]);
    Px.circle(t, 8, 11, 3, pal[1]);
    Px.speckle(t, [pal[0], pal[3]], { density: 0.2, seed });
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'sunflower') {
    // Petals (yellow) + centre (brown)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const px = Math.round(8 + Math.cos(a) * 4);
      const py = Math.round(8 + Math.sin(a) * 4);
      Px.setPx(t, px, py, '#f0d020');
      Px.setPx(t, Math.round(8 + Math.cos(a) * 5), Math.round(8 + Math.sin(a) * 5), '#e0c010');
    }
    Px.circle(t, 8, 8, 2, '#604010');
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'rose_bush') {
    // Red petals
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const rpx = Math.round(8 + Math.cos(a) * 3);
      const rpy = Math.round(8 + Math.sin(a) * 3);
      Px.circle(t, rpx, rpy, 2, '#c82020');
    }
    Px.vLine(t, 8, 10, 5, '#288020');
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'snowball') {
    const pal = Px.ramp('#e8f0f8', 4, 0.75, 1.15);
    Px.circle(t, 8, 8, 5, pal[2]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.2, seed });
    Px.setPx(t, 5, 5, [255, 255, 255, 200]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'egg') {
    const pal = Px.ramp('#f0e8c8', 4, 0.68, 1.20);
    Px.ellipse(t, 8, 8, 4, 5, pal[2]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.1, seed });
    Px.setPx(t, 6, 5, [255, 255, 255, 140]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'raw_iron' || id === 'raw_copper' || id === 'raw_gold') {
    const col = id === 'raw_copper' ? '#c06830' : id === 'raw_gold' ? '#d0a020' : '#a0b0c0';
    const pal = Px.ramp(col, 4, 0.60, 1.25);
    Px.polygon(t, [[3,4],[8,2],[13,5],[12,11],[7,14],[3,11]], pal[2]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.25, seed });
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'netherite_scrap') {
    const pal = Px.ramp('#303038', 4, 0.50, 1.35);
    Px.rect(t, 3, 4, 10, 8, pal[2]);
    Px.speckle(t, [pal[1], pal[3], '#604820'], { density: 0.25, seed });
    Px.hLine(t, 3, 4, 10, pal[3]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'quartz') {
    const pal = Px.ramp('#e8e0d8', 4, 0.68, 1.22);
    Px.polygon(t, [[8,2],[12,6],[10,13],[6,13],[4,6]], pal[2]);
    Px.polygon(t, [[8,2],[12,6],[8,8]], pal[3]);
    Px.setPx(t, 7, 4, [255, 255, 255, 160]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'lapis_lazuli') {
    const pal = Px.ramp('#1840b0', 4, 0.55, 1.30);
    Px.polygon(t, [[8,2],[13,8],[8,14],[3,8]], pal[2]);
    Px.polygon(t, [[8,2],[13,8],[8,8]], pal[3]);
    Px.setPx(t, 7, 4, [180, 200, 255, 180]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'redstone') {
    const pal = Px.ramp('#c01010', 4, 0.55, 1.30);
    Px.ellipse(t, 8, 10, 5, 3, pal[2]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.3, seed });
    Px.radialGlow(t, 8, 9, 4, '#ff6060', pal[2], { alpha: 0.3 });
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'echo_shard') {
    const pal = Px.ramp('#30a8c0', 4, 0.55, 1.30);
    Px.polygon(t, [[8,2],[13,6],[11,13],[5,13],[3,6]], pal[2]);
    Px.radialGlow(t, 8, 8, 5, '#80e8ff', pal[2], { alpha: 0.3 });
    Px.setPx(t, 6, 4, [255, 255, 255, 150]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'amethyst_shard') {
    const pal = Px.ramp('#9060c8', 4, 0.55, 1.30);
    Px.polygon(t, [[8,2],[11,7],[8,14],[5,7]], pal[2]);
    Px.polygon(t, [[8,2],[11,7],[8,7]], pal[3]);
    Px.setPx(t, 7, 3, [255, 200, 255, 160]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'copper_nugget') {
    const pal = Px.ramp('#c07040', 4, 0.60, 1.25);
    Px.circle(t, 8, 9, 4, pal[2]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.2, seed });
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'nether_brick') {
    const pal = Px.ramp('#482028', 4, 0.60, 1.25);
    Px.rect(t, 2, 5, 12, 6, pal[2]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.2, seed });
    Px.hLine(t, 2, 5, 12, pal[3]);
    Px.vLine(t, 2, 5, 6, pal[3]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'bowl') {
    const pal = Px.ramp('#8b5e28', 4, 0.60, 1.25);
    Px.polygon(t, [[2,6],[14,6],[13,12],[3,12]], pal[2]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.15, seed });
    Px.hLine(t, 2, 6, 12, pal[3]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'cocoa_beans') {
    const pal = Px.ramp('#804010', 4, 0.60, 1.25);
    Px.ellipse(t, 8, 9, 5, 4, pal[2]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.2, seed });
    Px.vLine(t, 8, 5, 3, '#306010');
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'tripwire_hook') {
    const pal = Px.ramp('#c0c8d0', 4, 0.60, 1.25);
    Px.rect(t, 6, 1, 4, 5, pal[2]);
    Px.hLine(t, 5, 6, 6, pal[2]);
    Px.vLine(t, 10, 7, 4, pal[2]);
    Px.hLine(t, 7, 11, 4, pal[2]);
    Px.setPx(t, 7, 12, pal[1]);
    Px.hLine(t, 6, 1, 4, pal[3]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  // fallback
  const pal = Px.ramp('#888888', 4, 0.60, 1.25);
  Px.circle(t, 8, 8, 5, pal[2]);
  Px.speckle(t, [pal[1], pal[3]], { density: 0.2, seed });
  ITEM_addOutline(t); ITEM_applyLight(t);
}

function ITEM_paintUtility(t, id, seed) {
  Px.clear(t);

  if (id.endsWith('_door')) {
    const pal = id === 'iron_door'
      ? Px.ramp('#b0b8c0', 4, 0.60, 1.25)
      : Px.ramp('#b08040', 4, 0.60, 1.25);
    Px.rect(t, 3, 1, 10, 14, pal[2]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.15, seed });
    // Panel lines
    Px.hLine(t, 3, 6, 10, pal[1]);
    // Knob
    Px.setPx(t, id.endsWith('_door') && !id.includes('iron') ? 10 : 4, 8, '#c0a020');
    Px.hLine(t, 3, 1, 10, pal[3]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id.endsWith('_bed')) {
    const col = id.replace('_bed', '');
    const rgb = WOOL_RGB[col] || [200, 200, 200];
    const pal = Px.ramp(rgb, 4, 0.60, 1.25);
    Px.rect(t, 2, 4, 12, 8, pal[2]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.15, seed });
    // Pillow
    Px.rect(t, 3, 5, 4, 5, Px.shade(pal[3], 1.1));
    // Frame
    Px.rect(t, 2, 4, 12, 2, '#9a7040');
    Px.rect(t, 2, 10, 12, 2, '#9a7040');
    Px.hLine(t, 2, 4, 12, Px.shade('#9a7040', 1.2));
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id.endsWith('_boat')) {
    const wood = id.replace('_boat', '');
    const pal = Px.ramp('#b08040', 4, 0.60, 1.25);
    Px.polygon(t, [[2,10],[14,10],[12,14],[4,14]], pal[2]);
    Px.polygon(t, [[2,10],[14,10],[13,7],[3,7]], pal[1]);
    Px.speckle(t, [pal[0], pal[3]], { density: 0.12, seed });
    // Plank lines
    Px.hLine(t, 2, 10, 12, pal[3]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'minecart') {
    const pal = Px.ramp('#c0c8d0', 4, 0.60, 1.25);
    Px.rect(t, 2, 5, 12, 7, pal[2]);
    Px.rect(t, 3, 6, 10, 5, '#282830');
    Px.speckle(t, [pal[1], pal[3]], { density: 0.1, seed });
    // Wheels
    Px.circle(t, 4, 13, 2, pal[3]);
    Px.circle(t, 11, 13, 2, pal[3]);
    Px.hLine(t, 2, 5, 12, pal[3]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'saddle') {
    const pal = Px.ramp('#8b3010', 4, 0.60, 1.25);
    Px.polygon(t, [[3,6],[13,6],[12,10],[8,12],[4,10]], pal[2]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.18, seed });
    Px.hLine(t, 3, 6, 10, pal[3]);
    // Straps
    Px.vLine(t, 4, 10, 3, pal[0]);
    Px.vLine(t, 11, 10, 3, pal[0]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'name_tag') {
    Px.ellipse(t, 8, 5, 4, 3, '#e0e8f0');
    Px.rect(t, 5, 7, 6, 5, '#e0e8f0');
    Px.setPx(t, 8, 12, '#e0e8f0'); Px.setPx(t, 7, 13, '#e0e8f0'); Px.setPx(t, 9, 13, '#e0e8f0');
    // String
    Px.vLine(t, 8, 1, 4, '#808090');
    Px.setPx(t, 8, 4, '#c0a020');
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'lead') {
    Px.line(t, 2, 2, 14, 10, '#90a030');
    Px.line(t, 14, 10, 10, 14, '#90a030');
    Px.circle(t, 2, 2, 2, '#b0c040');
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'compass') {
    const pal = Px.ramp('#c0c8d0', 4, 0.60, 1.25);
    Px.circle(t, 8, 8, 6, pal[1]);
    Px.circle(t, 8, 8, 5, '#181820');
    // Needle
    Px.line(t, 8, 3, 8, 8, '#c03020');
    Px.line(t, 8, 8, 8, 12, '#e0e8f0');
    Px.setPx(t, 8, 8, '#f0f0f0');
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'clock') {
    const pal = Px.ramp('#d09020', 4, 0.60, 1.30);
    Px.circle(t, 8, 8, 6, pal[2]);
    Px.circle(t, 8, 8, 5, '#f0e8c0');
    Px.circle(t, 8, 8, 4, '#e8ddb0');
    // Clock face markings
    Px.line(t, 8, 4, 8, 7, '#201808');
    Px.line(t, 8, 8, 11, 8, '#201808');
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'map') {
    const pal = Px.ramp('#d0b870', 4, 0.60, 1.20);
    Px.rect(t, 2, 2, 12, 12, pal[2]);
    Px.speckle(t, [pal[1], pal[3], '#608040', '#4070a0'], { density: 0.25, seed });
    Px.hLine(t, 2, 2, 12, pal[3]);
    Px.vLine(t, 2, 2, 12, pal[3]);
    // Location marker
    Px.setPx(t, 8, 7, '#c03020'); Px.setPx(t, 8, 8, '#c03020');
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'spyglass') {
    const pal = Px.ramp('#c07030', 4, 0.60, 1.30);
    Px.line(t, 4, 13, 12, 3, pal[2]);
    Px.line(t, 5, 13, 13, 3, pal[3]);
    Px.line(t, 3, 13, 11, 3, pal[1]);
    Px.circle(t, 12, 3, 2, pal[2]);
    Px.circle(t, 4, 13, 2, pal[1]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'totem_of_undying') {
    const pal = Px.ramp('#d0a020', 4, 0.60, 1.30);
    Px.polygon(t, [[8,1],[14,6],[14,12],[8,15],[2,12],[2,6]], pal[2]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.15, seed });
    // Face
    Px.setPx(t, 6, 7, '#201810'); Px.setPx(t, 10, 7, '#201810');
    Px.hLine(t, 6, 10, 4, '#201810');
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'elytra') {
    const pal = Px.ramp('#808080', 4, 0.55, 1.25);
    // Wings shape
    Px.polygon(t, [[8,2],[14,4],[15,10],[12,14],[8,15]], pal[2]);
    Px.polygon(t, [[8,2],[2,4],[1,10],[4,14],[8,15]], pal[1]);
    Px.speckle(t, [pal[0], pal[3]], { density: 0.1, seed });
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'firework_rocket') {
    const pal = Px.ramp('#c0c8d0', 4, 0.60, 1.25);
    Px.polygon(t, [[8,1],[11,5],[11,11],[5,11],[5,5]], pal[2]);
    Px.polygon(t, [[8,1],[11,5],[8,5]], pal[3]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.1, seed });
    // Fins
    Px.setPx(t, 4, 11, '#c03020'); Px.setPx(t, 12, 11, '#c03020');
    Px.setPx(t, 4, 12, '#c03020'); Px.setPx(t, 12, 12, '#c03020');
    // Trail
    Px.vLine(t, 8, 11, 4, '#d08020', 0.7);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'arrow') {
    Px.line(t, 2, 13, 11, 4, '#d0b870');
    Px.line(t, 3, 13, 12, 4, '#c0a860');
    // Tip
    Px.setPx(t, 12, 3, '#c0c8d0'); Px.setPx(t, 13, 2, '#d0d8e0'); Px.setPx(t, 13, 3, '#c0c8d0');
    // Fletching
    Px.line(t, 2, 13, 1, 11, '#e0e0f0');
    Px.line(t, 2, 13, 4, 14, '#e0e0f0');
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'bow') {
    // Arc + string
    Px.line(t, 4, 2, 12, 5, '#8b5e28');
    Px.line(t, 4, 14, 12, 11, '#8b5e28');
    Px.line(t, 3, 2, 3, 14, '#8b5e28');
    // String
    Px.line(t, 12, 5, 12, 11, '#e8e0d0');
    // Arrow on bow
    Px.line(t, 12, 8, 4, 8, '#d0b870', 0.5);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'crossbow') {
    const pal = Px.ramp('#7a5530', 4, 0.60, 1.20);
    // Stock
    Px.line(t, 3, 12, 14, 12, pal[2]);
    Px.line(t, 3, 13, 14, 13, pal[1]);
    // Arms
    Px.hLine(t, 3, 7, 10, '#c0c8d0');
    Px.hLine(t, 3, 8, 10, '#b0b8c0');
    // String
    Px.line(t, 3, 7, 7, 12, '#e8e0d0');
    Px.line(t, 13, 7, 9, 12, '#e8e0d0');
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'trident') {
    const pal = Px.ramp('#6090b8', 4, 0.55, 1.30);
    // Three prongs
    Px.vLine(t, 7, 1, 6, pal[3]);
    Px.vLine(t, 8, 1, 6, pal[3]);
    Px.line(t, 5, 1, 5, 4, pal[2]);
    Px.line(t, 10, 1, 10, 4, pal[2]);
    Px.setPx(t, 5, 5, pal[1]); Px.setPx(t, 10, 5, pal[1]);
    // Handle
    Px.line(t, 7, 7, 4, 14, pal[1]);
    Px.line(t, 8, 7, 5, 14, pal[2]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'shield') {
    const pal = Px.ramp('#8b5e28', 4, 0.60, 1.25);
    Px.polygon(t, [[3,2],[13,2],[14,9],[8,15],[2,9]], pal[2]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.15, seed });
    // Boss
    Px.circle(t, 8, 7, 2, '#c0c8d0');
    Px.hLine(t, 3, 2, 10, pal[3]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'fishing_rod') {
    const pal = Px.ramp('#7a5530', 4, 0.60, 1.20);
    Px.line(t, 2, 14, 13, 2, pal[2]);
    Px.line(t, 3, 14, 14, 2, pal[1]);
    // Line
    Px.line(t, 13, 2, 9, 12, '#d0d8f0', 0.7);
    Px.circle(t, 9, 12, 1, '#c0a020');
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'flint_and_steel') {
    // Flint (dark grey) + steel (iron)
    const fp = Px.ramp('#484858', 4, 0.50, 1.30);
    const sp = Px.ramp('#c0c8d0', 4, 0.60, 1.25);
    Px.polygon(t, [[2,4],[7,2],[8,6],[4,9]], fp[2]);
    Px.rect(t, 8, 7, 5, 5, sp[2]);
    Px.speckle(t, [fp[1], fp[3]], { density: 0.2, seed, region: (x, y) => x < 8 });
    Px.speckle(t, [sp[1], sp[3]], { density: 0.15, seed: seed + 1, region: (x, y) => x >= 8 });
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'shears') {
    const pal = Px.ramp('#c0c8d0', 4, 0.60, 1.25);
    // Two blades forming X
    Px.line(t, 3, 3, 13, 11, pal[2]);
    Px.line(t, 13, 3, 3, 11, pal[2]);
    Px.line(t, 4, 3, 14, 11, pal[3]);
    Px.line(t, 14, 3, 4, 11, pal[3]);
    // Pivot
    Px.circle(t, 8, 7, 2, pal[1]);
    // Handles
    Px.circle(t, 3, 12, 2, pal[2]);
    Px.circle(t, 13, 12, 2, pal[2]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  // Misc fallback
  const fpal = Px.ramp('#888888', 4, 0.60, 1.25);
  Px.circle(t, 8, 8, 5, fpal[2]);
  Px.speckle(t, [fpal[1], fpal[3]], { density: 0.2, seed });
  ITEM_addOutline(t); ITEM_applyLight(t);
}

// ---------------------------------------------------------------------------
// Food special cases lookup
// ---------------------------------------------------------------------------
function ITEM_paintFoodItem(t, id, seed) {
  Px.clear(t);
  if (id === 'apple' || id === 'golden_apple') {
    ITEM_paintApple(t);
    if (id === 'golden_apple') Px.multiply(t, '#f0c030');
    return;
  }
  if (id === 'bread') { ITEM_paintBread(t); return; }
  if (id === 'porkchop') { ITEM_paintMeat(t, true, 'chop'); return; }
  if (id === 'cooked_porkchop') { ITEM_paintMeat(t, false, 'chop'); return; }
  if (id === 'beef') { ITEM_paintMeat(t, true, 'beef'); return; }
  if (id === 'cooked_beef') { ITEM_paintMeat(t, false, 'beef'); return; }
  if (id === 'chicken') { ITEM_paintMeat(t, true, 'chicken'); return; }
  if (id === 'cooked_chicken') { ITEM_paintMeat(t, false, 'chicken'); return; }
  if (id === 'mutton') { ITEM_paintMeat(t, true, 'mutton'); return; }
  if (id === 'cooked_mutton') { ITEM_paintMeat(t, false, 'mutton'); return; }
  if (id === 'rabbit') { ITEM_paintMeat(t, true, 'rabbit'); return; }
  if (id === 'cooked_rabbit') { ITEM_paintMeat(t, false, 'rabbit'); return; }
  if (id === 'cod') { ITEM_paintMeat(t, true, 'fish'); return; }
  if (id === 'cooked_cod') { ITEM_paintMeat(t, false, 'fish'); return; }
  if (id === 'salmon') {
    ITEM_paintMeat(t, true, 'fish');
    Px.multiply(t, '#d07050');
    return;
  }
  if (id === 'cooked_salmon') {
    ITEM_paintMeat(t, false, 'fish');
    Px.multiply(t, '#c06840');
    return;
  }
  if (id === 'tropical_fish') {
    ITEM_paintMeat(t, true, 'fish');
    Px.multiply(t, '#f08020');
    return;
  }
  if (id === 'pufferfish') {
    const pal = Px.ramp('#d0a820', 4, 0.60, 1.25);
    Px.circle(t, 8, 8, 5, pal[2]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.15, seed });
    // Spines
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      Px.setPx(t, Math.round(8 + Math.cos(a) * 6), Math.round(8 + Math.sin(a) * 6), pal[0]);
    }
    Px.setPx(t, 5, 6, '#101018');
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'carrot' || id === 'golden_carrot') {
    ITEM_paintCarrot(t);
    if (id === 'golden_carrot') Px.multiply(t, '#f0c030');
    return;
  }
  if (id === 'potato') { ITEM_paintPotato(t, false); return; }
  if (id === 'baked_potato') { ITEM_paintPotato(t, true); return; }
  if (id === 'poisonous_potato') {
    ITEM_paintPotato(t, false);
    Px.multiply(t, '#90c050');
    return;
  }
  if (id === 'beetroot') {
    const pal = Px.ramp('#801828', 4, 0.60, 1.25);
    Px.circle(t, 8, 9, 5, pal[2]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.2, seed });
    Px.line(t, 7, 4, 8, 1, '#288020');
    Px.line(t, 9, 4, 10, 2, '#309028');
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'beetroot_soup' || id === 'mushroom_stew' || id === 'rabbit_stew') {
    const bowlPal = Px.ramp('#8b5e28', 4, 0.60, 1.25);
    const fillCol = id === 'beetroot_soup' ? '#901828' : id === 'mushroom_stew' ? '#b07840' : '#c08040';
    Px.polygon(t, [[2,8],[14,8],[13,13],[3,13]], bowlPal[2]);
    Px.rect(t, 3, 6, 10, 4, fillCol);
    Px.hLine(t, 3, 6, 10, Px.shade(fillCol, 1.2));
    Px.hLine(t, 2, 8, 12, bowlPal[3]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'melon_slice') { ITEM_paintMelonSlice(t); return; }
  if (id === 'glow_berries' || id === 'sweet_berries') {
    const col = id === 'glow_berries' ? '#e08820' : '#c03020';
    for (let i = 0; i < 4; i++) {
      const bx = 4 + (i % 2) * 6, by = 5 + Math.floor(i / 2) * 5;
      Px.circle(t, bx, by, 2, col);
      Px.setPx(t, bx - 1, by - 1, Px.shade(col, 1.3));
    }
    if (id === 'glow_berries') Px.radialGlow(t, 8, 8, 5, '#ffe080', col, { alpha: 0.25 });
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'honey_bottle') {
    const pal = Px.ramp('#d0a020', 4, 0.60, 1.30);
    // Glass bottle shape
    Px.vLine(t, 7, 1, 3, '#c0c8d0');
    Px.vLine(t, 8, 1, 3, '#c0c8d0');
    Px.polygon(t, [[5,4],[11,4],[12,12],[4,12]], [pal[2][0], pal[2][1], pal[2][2], 220]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.2, seed });
    Px.setPx(t, 6, 5, [255, 240, 150, 180]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'cookie') { ITEM_paintCookie(t); return; }
  if (id === 'pumpkin_pie') { ITEM_paintPumpkinPie(t); return; }
  if (id === 'dried_kelp') {
    const pal = Px.ramp('#508040', 4, 0.60, 1.20);
    Px.rect(t, 3, 4, 10, 8, pal[2]);
    Px.speckle(t, [pal[1], pal[3]], { density: 0.2, seed });
    Px.hLine(t, 3, 4, 10, pal[3]);
    ITEM_addOutline(t); ITEM_applyLight(t);
    return;
  }
  if (id === 'rotten_flesh') { ITEM_paintMiscItem(t, 'rotten_flesh', seed); return; }
  if (id === 'spider_eye') { ITEM_paintMiscItem(t, 'spider_eye', seed); return; }
  // Generic food fallback
  const fpal = Px.ramp('#c08040', 4, 0.60, 1.25);
  Px.circle(t, 8, 8, 5, fpal[2]);
  Px.speckle(t, [fpal[1], fpal[3]], { density: 0.2, seed });
  ITEM_addOutline(t); ITEM_applyLight(t);
}

// ---------------------------------------------------------------------------
// WOOL_COLORS and WOOD_TYPES for spawn eggs / beds
// ---------------------------------------------------------------------------
const ITEM_WOOL_COLORS = [
  'white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray',
  'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black',
];
const ITEM_WOOD_TYPES = ['oak', 'birch', 'spruce', 'jungle', 'acacia', 'dark_oak'];

// Spawn egg colour pairs per mob
const ITEM_EGG_COLORS = {
  pig:      { base: [0xf0, 0xa8, 0x98], spot: '#c07060' },
  cow:      { base: [0x43, 0x3e, 0x33], spot: '#f8f0e0' },
  sheep:    { base: [0xe0, 0xe0, 0xe0], spot: '#808080' },
  chicken:  { base: [0xf0, 0xf0, 0xe8], spot: '#e08020' },
  wolf:     { base: [0xd0, 0xc8, 0xb8], spot: '#484040' },
  zombie:   { base: [0x00, 0xa0, 0x50], spot: '#004828' },
  skeleton: { base: [0xd0, 0xd0, 0xc8], spot: '#606060' },
  creeper:  { base: [0x28, 0xa0, 0x28], spot: '#186018' },
  enderman: { base: [0x18, 0x18, 0x20], spot: '#8020c0' },
  villager: { base: [0xd0, 0xa8, 0x88], spot: '#804020' },
};

// ---------------------------------------------------------------------------
// registerItemTiles — main export
// ---------------------------------------------------------------------------
export function registerItemTiles(A, C) {
  const seed0 = C.seedFor('items');

  // Helper to make + register one tile
  function ITEM_reg(id, paintFn) {
    const t = Px.makeTile(16, 16);
    paintFn(t);
    A.add(`item:${id}`, t, { wrap: false });
  }

  ITEM_reg('iron_ingot',    (t) => ITEM_paintIngot(t, ITEM_TIER_PAL.iron, seed0 + 1));
  ITEM_reg('copper_ingot',  (t) => ITEM_paintIngot(t, Px.ramp('#c07040', 5, 0.55, 1.30), seed0 + 2));
  ITEM_reg('gold_ingot',    (t) => ITEM_paintIngot(t, ITEM_TIER_PAL.golden, seed0 + 3));
  ITEM_reg('netherite_ingot', (t) => ITEM_paintIngot(t, ITEM_TIER_PAL.netherite, seed0 + 4));
  ITEM_reg('iron_nugget',   (t) => { Px.clear(t); Px.circle(t, 8, 9, 4, ITEM_TIER_PAL.iron[2]); Px.speckle(t, [ITEM_TIER_PAL.iron[1], ITEM_TIER_PAL.iron[3]], { density: 0.2, seed: seed0 + 5 }); ITEM_addOutline(t); ITEM_applyLight(t); });
  ITEM_reg('gold_nugget',   (t) => { Px.clear(t); Px.circle(t, 8, 9, 4, ITEM_TIER_PAL.golden[2]); Px.speckle(t, [ITEM_TIER_PAL.golden[1], ITEM_TIER_PAL.golden[3]], { density: 0.2, seed: seed0 + 6 }); ITEM_addOutline(t); ITEM_applyLight(t); });
  ITEM_reg('diamond', (t) => ITEM_paintGem(t, ITEM_TIER_PAL.diamond, seed0 + 10));
  ITEM_reg('emerald', (t) => ITEM_paintGem(t, Px.ramp('#20c840', 5, 0.55, 1.30), seed0 + 11));
  for (const [id, s] of [
    ['copper_nugget',30],['lapis_lazuli',12],['redstone',13],['quartz',14],
    ['amethyst_shard',15],['echo_shard',16],['prismarine_shard',17],['prismarine_crystals',18],
    ['raw_iron',20],['raw_copper',21],['raw_gold',22],['netherite_scrap',23],
    ['stick',31],['coal',32],['charcoal',33],['flint',34],['clay_ball',35],
    ['brick',36],['glowstone_dust',37],['gunpowder',38],['string',39],['feather',40],
    ['leather',41],['rabbit_hide',42],['bone',43],['bone_meal',44],['blaze_rod',45],
    ['blaze_powder',46],['ender_pearl',47],['ender_eye',48],['ghast_tear',49],['magma_cream',50],
    ['slime_ball',51],['spider_eye',52],['rotten_flesh',53],['phantom_membrane',54],
    ['shulker_shell',55],['nautilus_shell',56],['scute',57],['honeycomb',58],
    ['ink_sac',59],['glow_ink_sac',60],['sugar',61],['paper',62],['book',63],
    ['wheat',64],['wheat_seeds',65],['melon_seeds',66],['pumpkin_seeds',67],
    ['beetroot_seeds',68],['nether_wart',69],['sunflower',70],['rose_bush',71],
    ['snowball',72],['egg',73],['nether_brick',74],['bowl',75],['cocoa_beans',76],['tripwire_hook',77],
  ]) { ITEM_reg(id, (t) => ITEM_paintMiscItem(t, id, seed0 + s)); }

  // ---- Buckets -------------------------------------------------------------
  ITEM_reg('bucket',       (t) => ITEM_paintBucket(t, null));
  ITEM_reg('water_bucket', (t) => ITEM_paintBucket(t, 'water'));
  ITEM_reg('lava_bucket',  (t) => ITEM_paintBucket(t, 'lava'));
  ITEM_reg('milk_bucket',  (t) => ITEM_paintBucket(t, 'milk'));

  // ---- Food ----------------------------------------------------------------
  for (const fid of [
    'apple', 'golden_apple', 'bread', 'porkchop', 'cooked_porkchop',
    'beef', 'cooked_beef', 'chicken', 'cooked_chicken',
    'mutton', 'cooked_mutton', 'rabbit', 'cooked_rabbit',
    'cod', 'cooked_cod', 'salmon', 'cooked_salmon',
    'tropical_fish', 'pufferfish',
    'carrot', 'golden_carrot', 'potato', 'baked_potato', 'poisonous_potato',
    'beetroot', 'beetroot_soup', 'mushroom_stew', 'rabbit_stew',
    'melon_slice', 'glow_berries', 'sweet_berries', 'honey_bottle',
    'cookie', 'pumpkin_pie', 'dried_kelp',
  ]) {
    const fseed = seed0 + fid.charCodeAt(0) * 17 + fid.length * 7;
    ITEM_reg(fid, (t) => ITEM_paintFoodItem(t, fid, fseed));
  }

  // ---- Tools: 6 tiers x 5 types -------------------------------------------
  for (const tier of ['wooden', 'stone', 'iron', 'golden', 'diamond', 'netherite']) {
    for (const type of ['sword', 'pickaxe', 'axe', 'shovel', 'hoe']) {
      const tid = `${tier}_${type}`;
      const tseed = seed0 + tid.charCodeAt(0) * 13;
      ITEM_reg(tid, (t) => ITEM_paintTool(t, type, tier, tseed));
    }
  }

  // ---- Special tools -------------------------------------------------------
  ITEM_reg('shears',          (t) => ITEM_paintUtility(t, 'shears', seed0 + 200));
  ITEM_reg('flint_and_steel', (t) => ITEM_paintUtility(t, 'flint_and_steel', seed0 + 201));
  ITEM_reg('fishing_rod',     (t) => ITEM_paintUtility(t, 'fishing_rod', seed0 + 202));
  ITEM_reg('bow',             (t) => ITEM_paintUtility(t, 'bow', seed0 + 203));
  ITEM_reg('arrow',           (t) => ITEM_paintUtility(t, 'arrow', seed0 + 204));
  ITEM_reg('crossbow',        (t) => ITEM_paintUtility(t, 'crossbow', seed0 + 205));
  ITEM_reg('trident',         (t) => ITEM_paintUtility(t, 'trident', seed0 + 206));
  ITEM_reg('shield',          (t) => ITEM_paintUtility(t, 'shield', seed0 + 207));

  for (const mat of ['leather', 'chainmail', 'iron', 'golden', 'diamond', 'netherite']) {
    for (const slot of ['helmet', 'chestplate', 'leggings', 'boots']) {
      const aid = `${mat}_${slot}`;
      const tierKey = mat === 'chainmail' ? 'chain' : mat;
      ITEM_reg(aid, (t) => ITEM_paintArmor(t, slot, tierKey, seed0 + aid.length * 11));
    }
  }
  for (const did of ['oak_door', 'birch_door', 'spruce_door', 'jungle_door', 'acacia_door', 'dark_oak_door', 'iron_door']) {
    ITEM_reg(did, (t) => ITEM_paintUtility(t, did, seed0 + did.length * 13));
  }
  for (const col of ITEM_WOOL_COLORS) {
    ITEM_reg(`${col}_bed`, (t) => ITEM_paintUtility(t, `${col}_bed`, seed0 + col.charCodeAt(0) * 17));
  }
  for (const w of ITEM_WOOD_TYPES) {
    ITEM_reg(`${w}_boat`, (t) => ITEM_paintUtility(t, `${w}_boat`, seed0 + w.charCodeAt(0) * 19));
  }
  for (const uid of ['minecart', 'saddle', 'name_tag', 'lead', 'compass', 'clock', 'map', 'spyglass', 'totem_of_undying', 'elytra', 'firework_rocket']) {
    ITEM_reg(uid, (t) => ITEM_paintUtility(t, uid, seed0 + uid.charCodeAt(0) * 23));
  }
  const ITEM_EGG_ORDER = ['pig', 'cow', 'sheep', 'chicken', 'wolf', 'zombie', 'skeleton', 'creeper', 'enderman', 'villager'];
  for (const mob of ITEM_EGG_ORDER) {
    const ec = ITEM_EGG_COLORS[mob] || { base: [0x80, 0x80, 0x80], spot: '#404040' };
    ITEM_reg(`${mob}_spawn_egg`, (t) => ITEM_paintSpawnEgg(t, ec.base, ec.spot, seed0 + mob.charCodeAt(0) * 29));
  }
  for (const col of ITEM_WOOL_COLORS) {
    ITEM_reg(`${col}_dye`, (t) => ITEM_paintDye(t, WOOL_RGB[col] || [200, 200, 200]));
  }
}
