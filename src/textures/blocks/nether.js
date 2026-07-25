// nether.js — procedural nether/end block textures
// All top-level names prefixed with NETHER_ to ensure global uniqueness.
import { Px } from '../px.js';

// ---- palettes --------------------------------------------------------------

const NETHER_RACK_PAL    = Px.ramp('#6e1515', 5, 0.60, 1.35);
const NETHER_SOUL_PAL    = Px.ramp('#4a3820', 5, 0.68, 1.22);
const NETHER_SOIL_PAL    = Px.ramp('#2e2518', 5, 0.65, 1.25);
const NETHER_BRICK_PAL   = Px.ramp('#3a1218', 4, 0.65, 1.28);
const NETHER_RBRICK_PAL  = Px.ramp('#6a1010', 4, 0.62, 1.30);
const NETHER_BSALT_PAL   = Px.ramp('#2e2e32', 5, 0.58, 1.32);
const NETHER_BLKST_PAL   = Px.ramp('#16161a', 5, 0.55, 1.40);
const NETHER_GLOW_PAL    = Px.ramp('#d0b840', 5, 0.60, 1.38);
const NETHER_ESTONE_PAL  = Px.ramp('#d8cc98', 5, 0.72, 1.18);
const NETHER_PURPUR_PAL  = Px.ramp('#8a5090', 5, 0.65, 1.28);
const NETHER_TEAL_PAL    = Px.ramp('#3a8858', 5, 0.62, 1.28);

// ---- hash helper -----------------------------------------------------------

function NETHER_h2(x, y, s) {
  let v = (x * 1619 + y * 31337 + s * 1234567) | 0;
  v = (v ^ (v >>> 13)) * 0x45d9f3b;
  return ((v ^ (v >>> 15)) >>> 0) / 0xffffffff;
}

export function registerNetherTiles(A, C) {

  // netherrack — dark red porous rock, blotchy pits + lighter crusts
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('netherrack');
    Px.noiseFill(t, NETHER_RACK_PAL, { freq: 0.30, octaves: 3, seed: s, contrast: 1.50, period: 16 });
    // darker pits (pores)
    for (let i = 0; i < 10; i++) {
      const px = Math.floor(NETHER_h2(i, 0, s + 20) * 15);
      const py = Math.floor(NETHER_h2(i, 1, s + 20) * 15);
      Px.ellipse(t, px, py, 1.0 + NETHER_h2(i, 2, s + 20) * 1.5, 0.8 + NETHER_h2(i, 3, s + 20) * 1.2,
        Px.shade(NETHER_RACK_PAL[0], 0.55), 0.80);
    }
    // lighter crusts
    Px.speckle(t, [NETHER_RACK_PAL[4]], { density: 0.07, seed: s + 5 });
    Px.edgeShade(t, 0.88);
    A.add('netherrack', t);
  }

  // soul_sand — brown-grey sand with faint anguished face impressions
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('soul_sand');
    Px.noiseFill(t, NETHER_SOUL_PAL, { freq: 0.28, octaves: 3, seed: s, contrast: 1.25, period: 16 });
    Px.grain(t, NETHER_SOUL_PAL, { seed: s + 3, density: 0.30 });
    // faint face impressions (low contrast)
    const faceC = Px.shade(NETHER_SOUL_PAL[0], 0.72);
    const faces = [[4, 4], [11, 10]];
    for (const [fx, fy] of faces) {
      // eye hollows
      Px.ellipse(t, fx - 1, fy, 1.0, 0.6, faceC, 0.45);
      Px.ellipse(t, fx + 2, fy, 1.0, 0.6, faceC, 0.45);
      // downturned mouth
      Px.line(t, fx - 2, fy + 3, fx,     fy + 4, faceC, 0.35);
      Px.line(t, fx,     fy + 4, fx + 3, fy + 3, faceC, 0.35);
    }
    Px.edgeShade(t, 0.90);
    A.add('soul_sand', t);
  }

  // soul_soil — darker soul dirt, coarse and cracked
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('soul_soil');
    Px.noiseFill(t, NETHER_SOIL_PAL, { freq: 0.30, octaves: 3, seed: s, contrast: 1.40, period: 16 });
    Px.grain(t, NETHER_SOIL_PAL, { seed: s + 3, density: 0.25 });
    // cracks
    for (let i = 0; i < 3; i++) {
      let cx = Math.floor(NETHER_h2(i, 0, s + 50) * 14) + 1;
      let cy = Math.floor(NETHER_h2(i, 1, s + 50) * 14) + 1;
      const len = 4 + Math.floor(NETHER_h2(i, 2, s + 50) * 6);
      for (let k = 0; k < len; k++) {
        Px.setPx(t, cx, cy, NETHER_SOIL_PAL[0], 0.80);
        const dir = Math.floor(NETHER_h2(k, i, s + 60) * 4);
        if (dir === 0) cx++;
        else if (dir === 1) cx--;
        else if (dir === 2) cy++;
        else cy--;
        cx = Math.max(0, Math.min(15, cx));
        cy = Math.max(0, Math.min(15, cy));
      }
    }
    Px.edgeShade(t, 0.90);
    A.add('soul_soil', t);
  }

  // nether_bricks — dark maroon brick courses, near-black mortar
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('nether_bricks');
    Px.bricks(t, NETHER_BRICK_PAL, '#140a0c', { bw: 8, bh: 4, seed: s });
    Px.edgeShade(t, 0.88);
    A.add('nether_bricks', t);
  }

  // red_nether_bricks — blood-red brick courses
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('red_nether_bricks');
    Px.bricks(t, NETHER_RBRICK_PAL, '#2a0808', { bw: 8, bh: 4, seed: s });
    Px.edgeShade(t, 0.88);
    A.add('red_nether_bricks', t);
  }

  // basalt_top — hexagonal facet cross-section
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('basalt_top');
    Px.noiseFill(t, NETHER_BSALT_PAL, { freq: 0.28, octaves: 2, seed: s, contrast: 1.20, period: 16 });
    // hexagonal pattern — 6 line segments
    const hex = [[8, 2], [14, 5], [14, 11], [8, 14], [2, 11], [2, 5]];
    for (let i = 0; i < 6; i++) {
      const [ax, ay] = hex[i];
      const [bx, by] = hex[(i + 1) % 6];
      Px.line(t, ax, ay, bx, by, NETHER_BSALT_PAL[0], 0.8);
      Px.line(t, ax, ay, 8, 8,  Px.shade(NETHER_BSALT_PAL[2], 0.75), 0.35);
    }
    // centre facet highlight
    Px.circle(t, 8, 8, 2, Px.shade(NETHER_BSALT_PAL[3], 1.15));
    Px.edgeShade(t, 0.88);
    A.add('basalt_top', t);
  }

  // basalt_side — vertical column striations
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('basalt_side');
    Px.noiseFill(t, NETHER_BSALT_PAL, { freq: 0.22, octaves: 3, seed: s, contrast: 1.30, period: 16 });
    Px.streaks(t, [NETHER_BSALT_PAL[0], NETHER_BSALT_PAL[1]],
      { vertical: true, density: 0.60, seed: s + 5, minLen: 5, maxLen: 16 });
    // fine horizontal micro-banding
    for (let y = 0; y < 16; y += 3) {
      for (let x = 0; x < 16; x++) {
        const c = Px.getPx(t, x, y);
        Px.setPx(t, x, y, Px.shade(c, 0.88));
      }
    }
    Px.edgeShade(t, 0.88);
    A.add('basalt_side', t, { wrap: false });
  }

  // blackstone — very dark grey-black volcanic rock, angular chunks
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('blackstone');
    Px.stoneChunks(t, NETHER_BLKST_PAL, { cell: 5, seed: s, seam: '#0a0a0e', jitter: 0.85 });
    Px.speckle(t, [Px.shade(NETHER_BLKST_PAL[4], 1.2)], { density: 0.04, seed: s + 7 });
    Px.edgeShade(t, 0.85);
    A.add('blackstone', t);
  }

  // gilded_blackstone — blackstone + gold nugget flecks
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('gilded_blackstone');
    Px.stoneChunks(t, NETHER_BLKST_PAL, { cell: 5, seed: s, seam: '#0a0a0e', jitter: 0.85 });
    // gold nuggets
    const goldC  = [210, 170,  30, 255];
    const goldL  = [255, 220,  60, 255];
    const goldD  = [155, 120,  15, 255];
    for (let i = 0; i < 7; i++) {
      const gx = Math.floor(NETHER_h2(i, 0, s + 30) * 14) + 1;
      const gy = Math.floor(NETHER_h2(i, 1, s + 30) * 14) + 1;
      Px.setPx(t, gx, gy, goldC, 1.0);
      Px.setPx(t, gx + 1, gy, goldL, 0.9);
      Px.setPx(t, gx, gy + 1, goldD, 0.8);
    }
    Px.edgeShade(t, 0.85);
    A.add('gilded_blackstone', t);
  }

  // polished_blackstone_bricks — black brick courses, tight seams
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('polished_blackstone_bricks');
    Px.bricks(t, NETHER_BLKST_PAL, '#050508', { bw: 8, bh: 4, seed: s });
    // fine polished highlight
    Px.speckle(t, [NETHER_BLKST_PAL[3]], { density: 0.04, seed: s + 5 });
    Px.edgeShade(t, 0.85);
    A.add('polished_blackstone_bricks', t);
  }

  // glowstone — crusty yellow-white mineral, 4-6 bright hot cores
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('glowstone');
    Px.noiseFill(t, NETHER_GLOW_PAL, { freq: 0.28, octaves: 3, seed: s, contrast: 1.40, period: 16 });
    // hot cores with dark rims between them
    const corePos = [[4, 4], [12, 4], [4, 12], [12, 12], [8, 8]];
    for (const [cx, cy] of corePos) {
      Px.circle(t, cx, cy, 2, Px.shade(NETHER_GLOW_PAL[0], 0.55)); // dark rim
      Px.radialGlow(t, cx, cy, 3, [255, 255, 200, 255], NETHER_GLOW_PAL[2], { power: 2.0, alpha: 0.95 });
    }
    // bright dust between cores
    Px.speckle(t, [NETHER_GLOW_PAL[4]], { density: 0.10, seed: s + 9 });
    Px.edgeShade(t, 0.90);
    A.add('glowstone', t);
  }

  // glowstone_dust_block — compacted glowing yellow dust, soft speckle
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('glowstone_dust_block');
    Px.noiseFill(t, NETHER_GLOW_PAL, { freq: 0.32, octaves: 2, seed: s, contrast: 1.20, period: 16 });
    Px.grain(t, NETHER_GLOW_PAL, { seed: s + 3, density: 0.40 });
    Px.softenNoise(t, 0.4);
    Px.edgeShade(t, 0.90);
    A.add('glowstone_dust_block', t);
  }

  // sea_lantern — prismarine frame + cyan-white glowing crystal centre
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('sea_lantern');
    const sl1 = [60,  130, 115, 255];
    const sl2 = [40,  100,  88, 255];
    const sl3 = [85,  160, 145, 255];
    // prismarine frame
    Px.noiseFill(t, [sl2, sl1, sl3, sl1, sl2], { freq: 0.25, octaves: 2, seed: s, contrast: 1.2, period: 16 });
    // crystal centre glow
    Px.radialGlow(t, 8, 8, 5, [220, 255, 255, 255], [80, 200, 185, 200], { power: 1.8, alpha: 0.95 });
    Px.radialGlow(t, 8, 8, 2, [255, 255, 255, 255], [180, 255, 240, 255], { power: 2.5, alpha: 1.0 });
    // frame border
    Px.rectOutline(t, 0, 0, 16, 16, sl2);
    Px.rectOutline(t, 1, 1, 14, 14, Px.shade(sl3, 1.10), 0.7);
    Px.edgeShade(t, 0.90);
    A.add('sea_lantern', t);
  }

  // end_stone — pale yellow-white, bone-like, grey pitting
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('end_stone');
    Px.noiseFill(t, NETHER_ESTONE_PAL, { freq: 0.25, octaves: 3, seed: s, contrast: 1.20, period: 16 });
    // grey pitting
    for (let i = 0; i < 12; i++) {
      const px = Math.floor(NETHER_h2(i, 0, s + 30) * 14) + 1;
      const py = Math.floor(NETHER_h2(i, 1, s + 30) * 14) + 1;
      Px.setPx(t, px, py, Px.shade(NETHER_ESTONE_PAL[1], 0.72), 0.65);
    }
    Px.edgeShade(t, 0.92);
    A.add('end_stone', t);
  }

  // end_stone_bricks — pale end stone brick lattice, chiselled pattern
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('end_stone_bricks');
    Px.bricks(t, NETHER_ESTONE_PAL, '#a09870', { bw: 8, bh: 4, seed: s });
    // fine chiselled detail
    for (let y = 1; y < 16; y += 4) {
      for (let x = 1; x < 16; x += 4) {
        Px.setPx(t, x, y, Px.shade(NETHER_ESTONE_PAL[3], 1.12), 0.5);
      }
    }
    Px.edgeShade(t, 0.92);
    A.add('end_stone_bricks', t);
  }

  // purpur_block — mauve-violet fine speckle
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('purpur_block');
    Px.noiseFill(t, NETHER_PURPUR_PAL, { freq: 0.30, octaves: 3, seed: s, contrast: 1.30, period: 16 });
    Px.grain(t, NETHER_PURPUR_PAL, { seed: s + 5, density: 0.25 });
    Px.edgeShade(t, 0.90);
    A.add('purpur_block', t);
  }

  // purpur_pillar_top — purpur column end, concentric ring
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('purpur_pillar_top');
    Px.noiseFill(t, NETHER_PURPUR_PAL, { freq: 0.25, octaves: 2, seed: s, contrast: 1.15, period: 16 });
    // concentric rings
    for (let ring = 3; ring <= 7; ring += 2) {
      Px.circleOutline(t, 8, 8, ring, NETHER_PURPUR_PAL[0], 0.65);
    }
    Px.circle(t, 8, 8, 2, NETHER_PURPUR_PAL[3]);
    Px.edgeShade(t, 0.90);
    A.add('purpur_pillar_top', t);
  }

  // purpur_pillar_side — purpur column with vertical flutes
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('purpur_pillar_side');
    Px.noiseFill(t, NETHER_PURPUR_PAL, { freq: 0.20, octaves: 2, seed: s, contrast: 1.10, period: 16 });
    // vertical flutes — lighter channels
    for (let x = 0; x < 16; x += 5) {
      for (let y = 0; y < 16; y++) {
        Px.setPx(t, x, y, Px.shade(NETHER_PURPUR_PAL[3], 1.15), 0.7);
        if (x > 0) Px.setPx(t, x - 1, y, NETHER_PURPUR_PAL[0], 0.5);
      }
    }
    Px.edgeShade(t, 0.90);
    A.add('purpur_pillar_side', t, { wrap: false });
  }

  // end_portal_frame_top — green-teal frame top with a socket depression
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('end_portal_frame_top');
    Px.noiseFill(t, NETHER_TEAL_PAL, { freq: 0.25, octaves: 2, seed: s, contrast: 1.20, period: 16 });
    // socket depression in centre
    Px.circle(t, 8, 8, 4, Px.shade(NETHER_TEAL_PAL[0], 0.55));
    Px.circle(t, 8, 8, 2, Px.shade(NETHER_TEAL_PAL[0], 0.40));
    // green-teal border
    Px.rectOutline(t, 0, 0, 16, 16, NETHER_TEAL_PAL[1]);
    Px.rectOutline(t, 1, 1, 14, 14, Px.shade(NETHER_TEAL_PAL[3], 1.10), 0.65);
    // bright eye spot on rim
    Px.circle(t, 8, 8, 1, [120, 220, 100, 255]);
    Px.edgeShade(t, 0.90);
    A.add('end_portal_frame_top', t);
  }

  // end_portal_frame_side — green-teal carved frame side with runes
  {
    const t = Px.makeTile(16, 16);
    const s = C.seedFor('end_portal_frame_side');
    Px.noiseFill(t, NETHER_TEAL_PAL, { freq: 0.22, octaves: 2, seed: s, contrast: 1.15, period: 16 });
    // rune shapes — abstract carved lines
    const runeC = Px.shade(NETHER_TEAL_PAL[0], 0.60);
    Px.line(t, 4, 3, 7, 6,  runeC, 0.80);
    Px.line(t, 9, 3, 12, 6, runeC, 0.80);
    Px.line(t, 5, 9, 5, 13, runeC, 0.75);
    Px.line(t, 11, 9, 11, 13, runeC, 0.75);
    Px.line(t, 3, 7, 13, 7, Px.shade(NETHER_TEAL_PAL[2], 1.08), 0.40);
    // highlight rims
    Px.rectOutline(t, 0, 0, 16, 16, NETHER_TEAL_PAL[1]);
    Px.edgeShade(t, 0.90);
    A.add('end_portal_frame_side', t, { wrap: false });
  }

  // dragon_egg — black egg silhouette with violet speckles + soft inner glow
  {
    const t = Px.makeTile(16, 16);
    Px.clear(t);
    const s = C.seedFor('dragon_egg');
    const eggC1 = [10, 8,  18, 255];
    const eggC2 = [20, 15, 35, 255];
    const eggC3 = [30, 20, 50, 255];
    // egg silhouette — taller ellipse
    Px.ellipse(t, 8, 8, 6, 7, eggC1);
    Px.ellipse(t, 8, 8, 5, 6, eggC2);
    // inner soft glow
    Px.radialGlow(t, 8, 8, 4, [80, 30, 120, 150], [20, 8, 40, 0], { power: 1.5, alpha: 0.7 });
    // violet speckles
    const sp1 = [120, 40,  200, 255];
    const sp2 = [80,  20,  150, 255];
    const sp3 = [180, 80,  240, 255];
    for (let i = 0; i < 25; i++) {
      const sx = Math.floor(NETHER_h2(i, 0, s + 20) * 12) + 2;
      const sy = Math.floor(NETHER_h2(i, 1, s + 20) * 14) + 1;
      const dx = sx - 8;
      const dy = sy - 8;
      if (dx * dx / 36 + dy * dy / 49 < 0.8) {
        const sc = [sp1, sp2, sp3][i % 3];
        Px.setPx(t, sx, sy, sc, 0.65 + NETHER_h2(i, 2, s + 20) * 0.35);
      }
    }
    Px.edgeShade(t, 0.85);
    A.add('dragon_egg', t, { wrap: false });
  }

}
