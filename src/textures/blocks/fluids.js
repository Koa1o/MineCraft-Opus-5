// fluids.js — animated fluid / portal / fire block textures
// All top-level names prefixed with FLUID_ to ensure global uniqueness.
import { Px } from '../px.js';

// ---- helpers ---------------------------------------------------------------

function FLUID_h2(x, y, s) {
  let v = (x * 1619 + y * 31337 + s * 1234567) | 0;
  v = (v ^ (v >>> 13)) * 0x45d9f3b;
  return ((v ^ (v >>> 15)) >>> 0) / 0xffffffff;
}

/** Build one base water tile with wave crests. Returns greyscale tile (luma 120-205). */
function FLUID_makeWaterBase(seed) {
  const t = Px.makeTile(16, 16);
  // fbm-based wave surface, luma 120-190
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = Px.fbm(x, y, 0.28, 3, seed, 16);
      const luma = Math.min(190, Math.round(120 + n * 85));
      Px.setPx(t, x, y, [luma, luma, luma, 255]);
    }
  }
  // wave crests: bright horizontal arcs (capped at 205)
  for (let y = 0; y < 16; y += 4) {
    for (let x = 0; x < 16; x++) {
      const wave = Px.fbm(x, y, 0.40, 2, seed + 7, 16);
      if (wave > 0.62) {
        const luma = Math.min(205, 185 + Math.round(wave * 20));
        Px.setPx(t, x, y, [luma, luma, luma, 255]);
      }
    }
  }
  return t;
}

export function registerFluidTiles(A, C) {

  // water_still — greyscale rippling water, 8 frames, t:3, scroll-based animation
  {
    const s = C.seedFor('water_still');
    const base = FLUID_makeWaterBase(s);
    const frames = [];
    // 8 frames scrolling by 2px each = 16 total = seamless loop
    for (let f = 0; f < 8; f++) {
      const frame = Px.cloneTile(base);
      Px.scroll(frame, 0, f * 2);
      Px.toGrey(frame, { lift: 1.05 });
      frames.push(frame);
    }
    A.addAnimated('water_still', frames, 1);
  }

  // water_flow — greyscale downward-streaming water strands, 8 frames
  {
    const s = C.seedFor('water_flow');
    // build base with vertical streaks
    const base = Px.makeTile(16, 16);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = Px.fbm(x * 0.5, y, 0.35, 3, s, 16);
        const luma = Math.round(120 + n * 90);
        Px.setPx(base, x, y, [luma, luma, luma, 255]);
      }
    }
    // bright leading edge strands (capped at 205)
    for (let x = 0; x < 16; x++) {
      const streak = Px.fbm(x, 0, 0.5, 2, s + 11, 16);
      if (streak > 0.55) {
        for (let y = 0; y < 16; y++) {
          const cur = Px.getPx(base, x, y);
          const v = Math.min(205, cur[0] + 20);
          Px.setPx(base, x, y, [v, v, v, 255]);
        }
      }
    }
    const frames = [];
    for (let f = 0; f < 8; f++) {
      const frame = Px.cloneTile(base);
      Px.scroll(frame, 0, f * 2);
      Px.toGrey(frame, { lift: 1.05 });
      frames.push(frame);
    }
    A.addAnimated('water_flow', frames, 3);
  }

  // lava_still — molten orange-yellow with dark crust islands, 8 frames
  {
    const s = C.seedFor('lava_still');
    const lava1 = [200,  90,  15, 255];
    const lava2 = [240, 140,  20, 255];
    const lava3 = [255, 200,  50, 255];
    const crust1 = [55,  20,   8, 255];
    const crust2 = [80,  30,  12, 255];
    // base lava noise
    const base = Px.makeTile(16, 16);
    Px.noiseFill(base, [crust1, lava1, lava2, lava3, lava2, lava1, crust2],
      { freq: 0.30, octaves: 3, seed: s, contrast: 1.5, period: 16 });
    // dark crust islands
    for (let i = 0; i < 6; i++) {
      const cx = Math.floor(FLUID_h2(i, 0, s + 30) * 14) + 1;
      const cy = Math.floor(FLUID_h2(i, 1, s + 30) * 14) + 1;
      const cr = 1.5 + FLUID_h2(i, 2, s + 30) * 2.5;
      Px.ellipse(base, cx, cy, cr, cr * 0.7, crust1);
      Px.circleOutline(base, cx, cy, cr + 0.5, crust2, 0.6);
    }
    // hot spots
    for (let i = 0; i < 4; i++) {
      const hx = Math.floor(FLUID_h2(i, 3, s + 60) * 14) + 1;
      const hy = Math.floor(FLUID_h2(i, 4, s + 60) * 14) + 1;
      Px.radialGlow(base, hx, hy, 2, lava3, lava2, { power: 2.0, alpha: 0.8 });
    }
    const frames = [];
    for (let f = 0; f < 8; f++) {
      const frame = Px.cloneTile(base);
      // drift crust by scrolling and perturbing noise phase
      Px.scroll(frame, (f % 2), (f % 3) - 1);
      // pulse hot spots brighter on even frames
      if (f % 2 === 0) {
        for (let i = 0; i < 2; i++) {
          const hx = Math.floor(FLUID_h2(i + f, 3, s + 60) * 14) + 1;
          const hy = Math.floor(FLUID_h2(i + f, 4, s + 60) * 14) + 1;
          Px.radialGlow(frame, hx, hy, 2, lava3, lava1, { power: 2.5, alpha: 0.5 });
        }
      }
      frames.push(frame);
    }
    A.addAnimated('lava_still', frames, 4);
  }

  // lava_flow — downward streaming lava with bright leading edges, 8 frames
  {
    const s = C.seedFor('lava_flow');
    const lava1 = [190,  75,  10, 255];
    const lava2 = [230, 120,  20, 255];
    const lava3 = [255, 190,  45, 255];
    const crust  = [50,  18,   5, 255];
    const base = Px.makeTile(16, 16);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = Px.fbm(x * 0.5, y, 0.30, 3, s, 16);
        const col = n > 0.7 ? lava3 : n > 0.5 ? lava2 : n > 0.3 ? lava1 : crust;
        Px.setPx(base, x, y, col);
      }
    }
    // bright leading edges at bottom of each stream section
    for (let x = 0; x < 16; x += 3) {
      Px.setPx(base, x, 14, lava3, 0.9);
      Px.setPx(base, x, 15, lava2, 0.8);
    }
    const frames = [];
    for (let f = 0; f < 8; f++) {
      const frame = Px.cloneTile(base);
      Px.scroll(frame, 0, f * 2);
      frames.push(frame);
    }
    A.addAnimated('lava_flow', frames, 1);
  }

  // fire — layered orange-yellow-white flame tongues, alpha bg, 8 frames
  {
    const s = C.seedFor('fire');
    const fOrange = [240, 100,  10, 255];
    const fYellow = [255, 200,  30, 255];
    const fWhite  = [255, 255, 180, 255];
    const fRed    = [200,  50,   5, 255];
    const frames = [];
    for (let f = 0; f < 8; f++) {
      const t = Px.makeTile(16, 16);
      Px.clear(t);
      // tongue profiles vary per frame
      const tongues = [
        { cx: 4,  base: 15, height: 8  + (f % 3),      width: 2 },
        { cx: 8,  base: 15, height: 11 + (f % 4) - 1,  width: 3 },
        { cx: 12, base: 15, height: 7  + ((f + 2) % 3), width: 2 },
        { cx: 6,  base: 15, height: 6  + (f % 2),       width: 2 },
        { cx: 10, base: 15, height: 9  + ((f + 1) % 3), width: 2 },
      ];
      for (const { cx, base: fb, height, width } of tongues) {
        for (let y = fb - height; y <= fb; y++) {
          const frac = (y - (fb - height)) / height;
          const hw = Math.max(0, width * (1 - frac * 0.7));
          const col = frac < 0.2 ? fWhite : frac < 0.5 ? fYellow : frac < 0.8 ? fOrange : fRed;
          for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
            if (x >= 0 && x < 16) {
              Px.setPx(t, x, y, col, frac < 0.15 ? 0.6 : 1.0);
            }
          }
        }
        // flickering tip — vary transparency
        const tipY = fb - height;
        if (tipY >= 0) {
          Px.setPx(t, cx, tipY, fWhite, 0.3 + (f % 3) * 0.15);
        }
      }
      // noise-based alpha cutout at top corners
      for (let y = 0; y < 6; y++) {
        for (let x = 0; x < 3; x++) {
          const cur = Px.getPx(t, x, y);
          if (cur[3] > 0) Px.setPx(t, x, y, cur, (y + x) / 8.0);
        }
        for (let x = 13; x < 16; x++) {
          const cur = Px.getPx(t, x, y);
          if (cur[3] > 0) Px.setPx(t, x, y, cur, (y + (15 - x)) / 8.0);
        }
      }
      frames.push(t);
    }
    A.addAnimated('fire', frames, 5);
  }

  // nether_portal — violet swirling energy, semi-transparent, 8 frames
  {
    const s = C.seedFor('nether_portal');
    const vp1 = [90,  20, 160, 180];
    const vp2 = [130, 40, 200, 180];
    const vp3 = [60,  10, 120, 180];
    const vp4 = [180, 80, 240, 180];
    const vp5 = [50,   8, 100, 180]; // deep dark
    const vp6 = [220, 120, 255, 180]; // bright spark
    const vp7 = [108, 28, 175, 180]; // medium violet
    const base = Px.makeTile(16, 16);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = Px.fbm(x, y, 0.30, 3, s, 16);
        const ang = Math.atan2(y - 8, x - 8);
        const swirl = Px.fbm(x + Math.cos(ang) * 2, y + Math.sin(ang) * 2, 0.25, 2, s + 11, 16);
        const v = (n + swirl) * 0.5;
        const col = v > 0.80 ? vp6 : v > 0.65 ? vp4 : v > 0.50 ? vp2 : v > 0.35 ? vp7 : v > 0.20 ? vp1 : vp5;
        Px.setPx(base, x, y, col);
      }
    }
    const frames = [];
    for (let f = 0; f < 8; f++) {
      const frame = Px.cloneTile(base);
      Px.scroll(frame, f % 2 === 0 ? 1 : 0, f % 3 === 0 ? 1 : 0);
      // sparkle flecks
      for (let i = 0; i < 6; i++) {
        const sx = Math.floor(FLUID_h2(i + f * 3, 0, s + 70) * 16);
        const sy = Math.floor(FLUID_h2(i + f * 3, 1, s + 70) * 16);
        Px.setPx(frame, sx, sy, vp6, 0.9);
      }
      // extra deep dark specks
      for (let i = 0; i < 3; i++) {
        const dx = Math.floor(FLUID_h2(i + f * 2, 2, s + 80) * 16);
        const dy = Math.floor(FLUID_h2(i + f * 2, 3, s + 80) * 16);
        Px.setPx(frame, dx, dy, vp5, 0.7);
      }
      frames.push(frame);
    }
    A.addAnimated('nether_portal', frames, 1);
  }

  // end_portal — near-black with tiny starfield sparkles, 8 frames
  {
    const s = C.seedFor('end_portal');
    const ep1 = [10, 8,  18, 255];
    const ep2 = [15, 12, 25, 255];
    const ep3 = [20, 15, 35, 255];
    const starC = [200, 200, 255, 255];
    const starC2 = [140, 120, 220, 255];
    const base = Px.makeTile(16, 16);
    Px.noiseFill(base, [ep1, ep2, ep3, ep2, ep1], { freq: 0.35, octaves: 2, seed: s, contrast: 1.4, period: 16 });
    // static star positions
    const starXY = [];
    for (let i = 0; i < 18; i++) {
      starXY.push([Math.floor(FLUID_h2(i, 0, s + 40) * 16), Math.floor(FLUID_h2(i, 1, s + 40) * 16)]);
    }
    const frames = [];
    for (let f = 0; f < 8; f++) {
      const frame = Px.cloneTile(base);
      // stars twinkle: alternate bright/dim per frame
      for (let i = 0; i < starXY.length; i++) {
        const [sx, sy] = starXY[i];
        const bright = ((i + f) % 3) !== 0;
        Px.setPx(frame, sx, sy, bright ? starC : starC2, bright ? 1.0 : 0.4);
      }
      // drift a few stars per frame
      for (let i = 0; i < 3; i++) {
        const sx = Math.floor(FLUID_h2(i + f * 2, 2, s + 50) * 16);
        const sy = Math.floor(FLUID_h2(i + f * 2, 3, s + 50) * 16);
        Px.setPx(frame, sx, sy, starC, 0.85);
      }
      frames.push(frame);
    }
    A.addAnimated('end_portal', frames, 4);
  }

  // magma_block — dark basalt crust with glowing crack lattice, 4 frames
  {
    const s = C.seedFor('magma_block');
    const mb1 = [30,  20,  18, 255];
    const mb2 = [45,  30,  25, 255];
    const crack1 = [220,  80,  20, 255];
    const crack2 = [180,  50,  10, 255];
    const crack3 = [255, 130,  40, 255];
    const base = Px.makeTile(16, 16);
    Px.noiseFill(base, [mb1, mb2, mb1, mb2, mb1], { freq: 0.28, octaves: 3, seed: s, contrast: 1.4, period: 16 });
    // crack lattice via worley edges
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const d = Px.worley(x, y, 5, s + 3, 16);
        if (d < 0.15) {
          Px.setPx(base, x, y, crack2, 1.0);
        }
      }
    }
    const frames = [];
    for (let f = 0; f < 4; f++) {
      const frame = Px.cloneTile(base);
      // pulse brightness of cracks each frame
      const pulseStrength = 0.6 + (f / 3) * 0.4;
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const d = Px.worley(x, y, 5, s + 3, 16);
          if (d < 0.12) {
            const glowCol = f >= 2 ? crack3 : f === 1 ? crack1 : crack2;
            Px.setPx(frame, x, y, glowCol, pulseStrength);
          } else if (d < 0.22) {
            // glow halo
            Px.radialGlow(frame, x, y, 1, crack1, crack2, { power: 1.2, alpha: 0.25 * pulseStrength });
          }
        }
      }
      frames.push(frame);
    }
    A.addAnimated('magma_block', frames, 4);
  }

}
