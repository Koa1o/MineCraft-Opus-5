// ---------------------------------------------------------------------------
// Mob skin painters part 2. Prefixed MOBSKIN2_ for top-level names.
// Exports: MOB_SKIN_PAINTERS_2
// ---------------------------------------------------------------------------
import { Px } from './px.js';
import {
  MOB_UV_FACE, MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ,
  MODELS,
} from '../entities/model.js';

// ---- Shared local helpers (duplicate-free subset needed here) -------------

function MOBSKIN2_h(x, y, s) {
  let v = ((x * 1619 + y * 31337 + s * 1234567) | 0);
  v = (v ^ (v >>> 13)) * 0x45d9f3b | 0;
  return ((v ^ (v >>> 15)) >>> 0) / 0xffffffff;
}

function MOBSKIN2_furNoise(t, rx, ry, rw, rh, pal, seed) {
  const n = pal.length;
  for (let y = ry; y < ry + rh; y++) {
    for (let x = rx; x < rx + rw; x++) {
      if (x < 0 || y < 0 || x >= 64 || y >= 64) continue;
      const v = Px.fbm(x, y, 0.5, 3, seed, 64);
      const n2 = MOBSKIN2_h(x, y, seed + 77) * 0.18;
      const idx = Math.min(n - 1, Math.max(0, Math.floor((v + n2) * n)));
      Px.setPx(t, x, y, pal[idx]);
    }
  }
}

function MOBSKIN2_paintModel(t, modelName, basePal, seed) {
  const m = MODELS[modelName];
  if (!m) return;
  const n = basePal.length;
  const shadeMap = { [MP_PY]: 1.15, [MP_NY]: 0.7, [MP_PX]: 0.9, [MP_NX]: 0.95, [MP_PZ]: 1.0, [MP_NZ]: 0.85 };
  for (const p of m.parts) {
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r = MOB_UV_FACE(p, face);
      for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) {
          if (x < 0 || y < 0 || x >= 64 || y >= 64) continue;
          const nv = Px.fbm(p.uv[0] + x - r.x, p.uv[1] + y - r.y, 0.5, 3, seed, 64);
          const idx = Math.min(n - 1, Math.max(0, Math.floor(nv * n)));
          Px.setPx(t, x, y, Px.shade(basePal[idx], shadeMap[face] || 1.0));
        }
      }
    });
  }
}

function MOBSKIN2_eyes(t, rect, opts) {
  const { scleraCol = [255, 255, 255], pupilCol = [20, 20, 20],
    highlightCol = [255, 255, 255], eyeY = Math.floor(rect.h * 0.35),
    separation = Math.floor(rect.w * 0.25), size = 2 } = opts || {};
  const cx = Math.floor(rect.w / 2);
  const lx = rect.x + cx - separation;
  const rx = rect.x + cx + separation;
  const ey = rect.y + eyeY;
  Px.rect(t, lx - 1, ey - 1, size + 2, size + 2, scleraCol);
  Px.rect(t, rx - 1, ey - 1, size + 2, size + 2, scleraCol);
  Px.rect(t, lx, ey, size, size, pupilCol);
  Px.rect(t, rx, ey, size, size, pupilCol);
  Px.setPx(t, lx, ey, highlightCol);
  Px.setPx(t, rx, ey, highlightCol);
}

function MOBSKIN2_mouth(t, rect, opts) {
  const { col = [80, 50, 40], y = Math.floor(rect.h * 0.65), w = Math.floor(rect.w * 0.4) } = opts || {};
  const cx = rect.x + Math.floor(rect.w / 2);
  Px.hLine(t, cx - Math.floor(w / 2), rect.y + y, w, col);
}

function MOBSKIN2_nostrils(t, rect, opts) {
  const { col = [80, 50, 40], y = Math.floor(rect.h * 0.55) } = opts || {};
  const cx = rect.x + Math.floor(rect.w / 2);
  Px.setPx(t, cx - 1, rect.y + y, col);
  Px.setPx(t, cx + 1, rect.y + y, col);
}

function MOBSKIN2_spots(t, rx, ry, rw, rh, col, seed, count) {
  for (let i = 0; i < count; i++) {
    const sx = rx + Math.floor(MOBSKIN2_h(i, 0, seed) * rw);
    const sy = ry + Math.floor(MOBSKIN2_h(i, 1, seed) * rh);
    const sr = 1 + Math.floor(MOBSKIN2_h(i, 2, seed) * 2);
    Px.circle(t, sx, sy, sr, col);
  }
}

function MOBSKIN2_faceRect(modelName, partName) {
  const m = MODELS[modelName];
  if (!m || !m.byName[partName]) return null;
  return MOB_UV_FACE(m.byName[partName], MP_PZ);
}

// ---------------------------------------------------------------------------
// Iron Golem
// ---------------------------------------------------------------------------
function MOBSKIN2_paintIronGolem(t, r) {
  const base = Px.ramp('#c8c0b8', 5, 0.68, 1.25);
  MOBSKIN2_paintModel(t, 'iron_golem', base, r);
  // rust streaks
  const m = MODELS['iron_golem'];
  [MP_PZ, MP_PX, MP_NX].forEach(face => {
    const r2 = MOB_UV_FACE(m.byName['body'], face);
    for (let i = 0; i < 4; i++) {
      const sx = r2.x + Math.floor(MOBSKIN2_h(i, 0, r + 5) * r2.w);
      Px.vLine(t, sx, r2.y, r2.h, Px.shade(base[0], 0.6), 0.5);
    }
  });
  const face = MOBSKIN2_faceRect('iron_golem', 'head');
  if (face) {
    MOBSKIN2_eyes(t, face, { scleraCol: [220, 100, 60, 255], pupilCol: [20, 8, 5], eyeY: 3, separation: 3 });
    // vine/moss patches
    MOBSKIN2_spots(t, face.x, face.y, face.w, face.h, [50, 90, 30, 255], r + 10, 2);
  }
  // nose bump
  const nose = m.byName['nose'];
  if (nose) {
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(nose, face);
      MOBSKIN2_furNoise(t, r2.x, r2.y, r2.w, r2.h, Px.ramp('#b0a898', 3, 0.72, 1.15), r + 8);
    });
  }
}

// ---------------------------------------------------------------------------
// Snow Golem
// ---------------------------------------------------------------------------
function MOBSKIN2_paintSnowGolem(t, r) {
  const snowPal = Px.ramp('#e8eef8', 5, 0.82, 1.1);
  MOBSKIN2_paintModel(t, 'snow_golem', snowPal, r);
  const face = MOBSKIN2_faceRect('snow_golem', 'head');
  if (face) {
    // pumpkin face: orange
    MOBSKIN2_furNoise(t, face.x, face.y, face.w, face.h, Px.ramp('#d07820', 4, 0.7, 1.2), r + 5);
    // carved eyes and mouth
    const eyY = face.y + 2;
    const cx = face.x + Math.floor(face.w / 2);
    Px.rect(t, cx - 3, eyY, 2, 2, [30, 15, 5, 255]);
    Px.rect(t, cx + 1, eyY, 2, 2, [30, 15, 5, 255]);
    const mY = face.y + face.h - 3;
    for (let i = 0; i < 4; i++) Px.setPx(t, cx - 2 + i, mY, [30, 15, 5, 255]);
  }
  // stick arms brown
  const m = MODELS['snow_golem'];
  ['arm_r', 'arm_l'].forEach(an => {
    const arm = m.byName[an];
    if (!arm) return;
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(arm, face);
      MOBSKIN2_furNoise(t, r2.x, r2.y, r2.w, r2.h, Px.ramp('#5a3818', 3, 0.6, 1.3), r + 10);
    });
  });
}

// ---------------------------------------------------------------------------
// Panda
// ---------------------------------------------------------------------------
function MOBSKIN2_paintPanda(t, r, variant) {
  const MOBSKIN2_pandaTypes = [
    { body: '#e8e8e0', mark: '#181818' }, // normal
    { body: '#e8e8e0', mark: '#181818' }, // lazy
    { body: '#e8e8e0', mark: '#181818' }, // worried
    { body: '#e8e0d0', mark: '#181818' }, // playful
    { body: '#e8e0d0', mark: '#d08040' }, // brown
    { body: '#181818', mark: '#c0b080' }, // aggressive (black+tan marks)
    { body: '#e8e8e0', mark: '#181818' }, // weak
  ];
  const pd = MOBSKIN2_pandaTypes[variant % 7];
  const bodyPal = Px.ramp(pd.body, 5, 0.78, 1.15);
  const markPal = Px.ramp(pd.mark, 4, 0.5, 1.4);
  MOBSKIN2_paintModel(t, 'panda', bodyPal, r);
  const m = MODELS['panda'];
  // black patches on eyes, ears
  const face = MOBSKIN2_faceRect('panda', 'head');
  if (face) {
    // eye patches (dark rings)
    const eyeY = face.y + 2;
    const cx = face.x + Math.floor(face.w / 2);
    Px.rect(t, cx - 4, eyeY, 3, 3, markPal[0]);
    Px.rect(t, cx + 1, eyeY, 3, 3, markPal[0]);
    Px.setPx(t, cx - 3, eyeY + 1, [240, 240, 240, 255]);
    Px.setPx(t, cx + 2, eyeY + 1, [240, 240, 240, 255]);
    Px.setPx(t, cx - 3, eyeY + 1, [20, 15, 10, 255]);
    Px.setPx(t, cx + 2, eyeY + 1, [20, 15, 10, 255]);
    MOBSKIN2_nostrils(t, face, { col: [60, 50, 40], y: Math.floor(face.h * 0.55) });
    MOBSKIN2_mouth(t, face, { col: [60, 50, 40], y: Math.floor(face.h * 0.7), w: 4 });
  }
}

// ---------------------------------------------------------------------------
// Polar Bear
// ---------------------------------------------------------------------------
function MOBSKIN2_paintPolarBear(t, r) {
  const base = Px.ramp('#e8e8e0', 5, 0.8, 1.15);
  MOBSKIN2_paintModel(t, 'polar_bear', base, r);
  const face = MOBSKIN2_faceRect('polar_bear', 'head');
  if (face) {
    MOBSKIN2_eyes(t, face, { pupilCol: [20, 15, 10], eyeY: 2, separation: 3 });
    MOBSKIN2_nostrils(t, face, { col: [60, 45, 35] });
    MOBSKIN2_mouth(t, face, { col: [70, 55, 40], y: Math.floor(face.h * 0.65), w: 5 });
  }
}

// ---------------------------------------------------------------------------
// Spider
// ---------------------------------------------------------------------------
function MOBSKIN2_paintSpider(t, r) {
  const base = Px.ramp('#303030', 5, 0.4, 1.8);
  MOBSKIN2_paintModel(t, 'spider', base, r);
  // Add contrasting abdomen pattern for colour variety
  const m = MODELS['spider'];
  [MP_PZ, MP_PX, MP_NX, MP_PY].forEach(face => {
    const r2 = MOB_UV_FACE(m.byName['body'], face);
    MOBSKIN2_spots(t, r2.x, r2.y, r2.w, r2.h, [160, 100, 50, 255], r + 20, 3);
  });
  const face = MOBSKIN2_faceRect('spider', 'head');
  if (face) {
    // 8 red eyes
    for (let i = 0; i < 4; i++) {
      const ex = face.x + 1 + i * 2;
      const ey = face.y + 2;
      Px.setPx(t, ex, ey, [200, 30, 30, 255]);
      Px.setPx(t, ex, ey + 1, [200, 30, 30, 255]);
    }
  }
}

// ---------------------------------------------------------------------------
// Cave Spider
// ---------------------------------------------------------------------------
function MOBSKIN2_paintCaveSpider(t, r) {
  const base = Px.ramp('#182820', 5, 0.5, 1.5);
  MOBSKIN2_paintModel(t, 'cave_spider', base, r);
  const face = MOBSKIN2_faceRect('cave_spider', 'head');
  if (face) {
    for (let i = 0; i < 4; i++) {
      const ex = face.x + 1 + i * 1;
      const ey = face.y + 1;
      Px.setPx(t, ex, ey, [180, 20, 20, 255]);
    }
  }
}

// ---------------------------------------------------------------------------
// Enderman
// ---------------------------------------------------------------------------
function MOBSKIN2_paintEnderman(t, r) {
  const base = Px.ramp('#111111', 5, 0.3, 2.0);
  MOBSKIN2_paintModel(t, 'enderman', base, r);
  // Purple particle speckle for variety
  Px.speckle(t, [[80, 30, 120, 255], [120, 50, 180, 255], [40, 10, 80, 255]], { density: 0.06, seed: r + 50 });
  const face = MOBSKIN2_faceRect('enderman', 'head');
  if (face) {
    MOBSKIN2_eyes(t, face, {
      scleraCol: [160, 30, 180, 255], pupilCol: [80, 10, 100, 255],
      highlightCol: [220, 140, 255], eyeY: 2, separation: 2, size: 2,
    });
    // glow effect around eyes
    Px.setPx(t, face.x + Math.floor(face.w / 2) - 2, face.y + 3, [100, 20, 130, 255], 0.5);
    Px.setPx(t, face.x + Math.floor(face.w / 2) + 2, face.y + 3, [100, 20, 130, 255], 0.5);
  }
}

// ---------------------------------------------------------------------------
// Piglin
// ---------------------------------------------------------------------------
function MOBSKIN2_paintPiglin(t, r) {
  const base = Px.ramp('#c87858', 5, 0.65, 1.3);
  MOBSKIN2_paintModel(t, 'piglin', base, r);
  const m = MODELS['piglin'];
  // gold trim on body
  const goldPal = Px.ramp('#d4a030', 3, 0.8, 1.2);
  const bodyF = MOB_UV_FACE(m.byName['body'], MP_PZ);
  Px.hLine(t, bodyF.x, bodyF.y, bodyF.w, goldPal[1]);
  Px.hLine(t, bodyF.x, bodyF.y + bodyF.h - 1, bodyF.w, goldPal[1]);
  const face = MOBSKIN2_faceRect('piglin', 'head');
  if (face) {
    MOBSKIN2_eyes(t, face, { pupilCol: [30, 20, 10], eyeY: 2, separation: 2 });
  }
  // snout
  const snout = m.byName['snout'];
  if (snout) {
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(snout, face);
      MOBSKIN2_furNoise(t, r2.x, r2.y, r2.w, r2.h, Px.ramp('#b86848', 3, 0.75, 1.15), r + 5);
    });
    const snoutF = MOB_UV_FACE(snout, MP_PZ);
    MOBSKIN2_nostrils(t, snoutF, { col: [80, 45, 30], y: Math.floor(snoutF.h * 0.5) });
  }
}

// ---------------------------------------------------------------------------
// Piglin Brute
// ---------------------------------------------------------------------------
function MOBSKIN2_paintPiglinBrute(t, r) {
  const base = Px.ramp('#b86040', 5, 0.62, 1.32);
  MOBSKIN2_paintModel(t, 'piglin_brute', base, r);
  const m = MODELS['piglin_brute'];
  const goldPal = Px.ramp('#d4a030', 3, 0.8, 1.2);
  const bodyF = MOB_UV_FACE(m.byName['body'], MP_PZ);
  Px.hLine(t, bodyF.x, bodyF.y, bodyF.w, goldPal[1]);
  Px.hLine(t, bodyF.x, bodyF.y + bodyF.h - 1, bodyF.w, goldPal[1]);
  const face = MOBSKIN2_faceRect('piglin_brute', 'head');
  if (face) {
    MOBSKIN2_eyes(t, face, { scleraCol: [200, 80, 60, 255], pupilCol: [20, 8, 5], eyeY: 2, separation: 2 });
  }
  const snout = m.byName['snout'];
  if (snout) {
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(snout, face);
      MOBSKIN2_furNoise(t, r2.x, r2.y, r2.w, r2.h, Px.ramp('#a05030', 3, 0.72, 1.18), r + 5);
    });
  }
}

// ---------------------------------------------------------------------------
// Hoglin
// ---------------------------------------------------------------------------
function MOBSKIN2_paintHoglin(t, r) {
  const base = Px.ramp('#b07858', 5, 0.65, 1.3);
  MOBSKIN2_paintModel(t, 'hoglin', base, r);
  const face = MOBSKIN2_faceRect('hoglin', 'head');
  if (face) {
    MOBSKIN2_eyes(t, face, { pupilCol: [30, 15, 8], eyeY: 3, separation: 4 });
    MOBSKIN2_nostrils(t, face, { col: [70, 40, 25], y: Math.floor(face.h * 0.55) });
  }
  // tusks ivory
  const m = MODELS['hoglin'];
  ['tusk_r', 'tusk_l'].forEach(tn => {
    const tusk = m.byName[tn];
    if (!tusk) return;
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(tusk, face);
      MOBSKIN2_furNoise(t, r2.x, r2.y, r2.w, r2.h, Px.ramp('#e8e0c8', 3, 0.82, 1.12), r + 5);
    });
  });
}

// ---------------------------------------------------------------------------
// Zoglin
// ---------------------------------------------------------------------------
function MOBSKIN2_paintZoglin(t, r) {
  const base = Px.ramp('#808888', 5, 0.62, 1.3);
  MOBSKIN2_paintModel(t, 'zoglin', base, r);
  const face = MOBSKIN2_faceRect('zoglin', 'head');
  if (face) {
    MOBSKIN2_eyes(t, face, { scleraCol: [200, 60, 40, 255], pupilCol: [20, 5, 5], eyeY: 3, separation: 4 });
    MOBSKIN2_nostrils(t, face, { col: [50, 35, 30] });
  }
}

// ---------------------------------------------------------------------------
// Zombie
// ---------------------------------------------------------------------------
function MOBSKIN2_paintZombie(t, r) {
  const base = Px.ramp('#688060', 5, 0.65, 1.3);
  MOBSKIN2_paintModel(t, 'zombie', base, r);
  // torn clothing: blue/grey torso
  const m = MODELS['zombie'];
  const bodyPal = Px.ramp('#3858a8', 4, 0.65, 1.25);
  [MP_PZ, MP_NZ, MP_PX, MP_NX].forEach(face => {
    const r2 = MOB_UV_FACE(m.byName['body'], face);
    MOBSKIN2_furNoise(t, r2.x, r2.y, r2.w, r2.h, bodyPal, r + 5);
  });
  const face = MOBSKIN2_faceRect('zombie', 'head');
  if (face) {
    MOBSKIN2_furNoise(t, face.x, face.y, face.w, face.h, base, r + 2);
    MOBSKIN2_eyes(t, face, { scleraCol: [200, 200, 200, 255], pupilCol: [10, 10, 10], eyeY: 2, separation: 2 });
    // rot patches
    MOBSKIN2_spots(t, face.x, face.y, face.w, face.h, [40, 70, 30, 255], r + 8, 2);
  }
}

// ---------------------------------------------------------------------------
// Husk
// ---------------------------------------------------------------------------
function MOBSKIN2_paintHusk(t, r) {
  const base = Px.ramp('#b08840', 5, 0.65, 1.3);
  MOBSKIN2_paintModel(t, 'zombie', base, r);
  const m = MODELS['zombie'];
  const clothPal = Px.ramp('#a87030', 4, 0.65, 1.25);
  [MP_PZ, MP_NZ, MP_PX, MP_NX].forEach(face => {
    const r2 = MOB_UV_FACE(m.byName['body'], face);
    MOBSKIN2_furNoise(t, r2.x, r2.y, r2.w, r2.h, clothPal, r + 5);
  });
  const face = MOBSKIN2_faceRect('zombie', 'head');
  if (face) {
    MOBSKIN2_furNoise(t, face.x, face.y, face.w, face.h, base, r + 2);
    MOBSKIN2_eyes(t, face, { scleraCol: [220, 200, 140, 255], pupilCol: [15, 12, 5], eyeY: 2, separation: 2 });
  }
}

// ---------------------------------------------------------------------------
// Drowned
// ---------------------------------------------------------------------------
function MOBSKIN2_paintDrowned(t, r) {
  const base = Px.ramp('#5888a0', 5, 0.65, 1.3);
  MOBSKIN2_paintModel(t, 'zombie', base, r);
  const face = MOBSKIN2_faceRect('zombie', 'head');
  if (face) {
    MOBSKIN2_furNoise(t, face.x, face.y, face.w, face.h, base, r + 2);
    MOBSKIN2_eyes(t, face, { scleraCol: [180, 220, 240, 255], pupilCol: [10, 15, 20], eyeY: 2, separation: 2 });
    MOBSKIN2_spots(t, face.x, face.y, face.w, face.h, Px.shade(base[2], 0.6), r + 6, 3);
  }
}

// ---------------------------------------------------------------------------
// Zombie Villager
// ---------------------------------------------------------------------------
function MOBSKIN2_paintZombieVillager(t, r) {
  const base = Px.ramp('#688060', 5, 0.65, 1.3);
  MOBSKIN2_paintModel(t, 'zombie', base, r);
  const m = MODELS['zombie'];
  const robePal = Px.ramp('#505048', 4, 0.65, 1.25);
  [MP_PZ, MP_NZ, MP_PX, MP_NX].forEach(face => {
    const r2 = MOB_UV_FACE(m.byName['body'], face);
    MOBSKIN2_furNoise(t, r2.x, r2.y, r2.w, r2.h, robePal, r + 5);
  });
  const face = MOBSKIN2_faceRect('zombie', 'head');
  if (face) {
    MOBSKIN2_furNoise(t, face.x, face.y, face.w, face.h, base, r + 2);
    MOBSKIN2_eyes(t, face, { scleraCol: [200, 200, 200, 255], pupilCol: [10, 10, 10], eyeY: 2, separation: 2 });
  }
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function MOBSKIN2_paintSkeleton(t, r) {
  const base = Px.ramp('#d8d0c0', 5, 0.75, 1.18);
  MOBSKIN2_paintModel(t, 'skeleton', base, r);
  // rib lines on body
  const m = MODELS['skeleton'];
  const bodyF = MOB_UV_FACE(m.byName['body'], MP_PZ);
  for (let i = 1; i < 5; i++) {
    Px.hLine(t, bodyF.x, bodyF.y + i * 2, bodyF.w, Px.shade(base[0], 0.6), 0.5);
  }
  const face = MOBSKIN2_faceRect('skeleton', 'head');
  if (face) {
    MOBSKIN2_eyes(t, face, { scleraCol: [10, 10, 10, 255], pupilCol: [200, 50, 50, 255],
      highlightCol: [220, 80, 80], eyeY: 2, separation: 2, size: 2 });
    // nose void
    Px.setPx(t, face.x + Math.floor(face.w / 2), face.y + Math.floor(face.h * 0.55), base[0]);
    // grin
    for (let i = 1; i < face.w - 1; i += 2)
      Px.setPx(t, face.x + i, face.y + face.h - 2, [20, 18, 15, 255]);
  }
}

// ---------------------------------------------------------------------------
// Stray
// ---------------------------------------------------------------------------
function MOBSKIN2_paintStray(t, r) {
  const base = Px.ramp('#c0c8c0', 5, 0.75, 1.15);
  MOBSKIN2_paintModel(t, 'skeleton', base, r);
  // icy blue tint overlay
  const m = MODELS['skeleton'];
  const bodyF = MOB_UV_FACE(m.byName['body'], MP_PZ);
  for (let i = 1; i < 5; i++)
    Px.hLine(t, bodyF.x, bodyF.y + i * 2, bodyF.w, Px.shade(base[0], 0.6), 0.5);
  const face = MOBSKIN2_faceRect('skeleton', 'head');
  if (face) {
    MOBSKIN2_eyes(t, face, { scleraCol: [10, 10, 10, 255], pupilCol: [80, 160, 220, 255],
      eyeY: 2, separation: 2, size: 2 });
  }
}

// ---------------------------------------------------------------------------
// Bogged
// ---------------------------------------------------------------------------
function MOBSKIN2_paintBogged(t, r) {
  const base = Px.ramp('#788858', 5, 0.68, 1.25);
  MOBSKIN2_paintModel(t, 'skeleton', base, r);
  // mushroom spots
  const m = MODELS['skeleton'];
  [MP_PZ, MP_PX, MP_NX].forEach(face => {
    const r2 = MOB_UV_FACE(m.byName['body'], face);
    MOBSKIN2_spots(t, r2.x, r2.y, r2.w, r2.h, [180, 60, 40, 255], r + 5, 3);
  });
  const face = MOBSKIN2_faceRect('skeleton', 'head');
  if (face) {
    MOBSKIN2_eyes(t, face, { scleraCol: [10, 10, 10, 255], pupilCol: [60, 160, 30, 255],
      eyeY: 2, separation: 2, size: 2 });
  }
}

// ---------------------------------------------------------------------------
// Wither Skeleton
// ---------------------------------------------------------------------------
function MOBSKIN2_paintWitherSkeleton(t, r) {
  const base = Px.ramp('#181818', 5, 0.3, 2.0);
  MOBSKIN2_paintModel(t, 'skeleton', base, r);
  // Bone-coloured highlights on light areas
  Px.speckle(t, [[90, 80, 70, 255], [110, 100, 90, 255], [70, 60, 55, 255]], { density: 0.07, seed: r + 60 });
  const m = MODELS['skeleton'];
  const bodyF = MOB_UV_FACE(m.byName['body'], MP_PZ);
  for (let i = 1; i < 5; i++)
    Px.hLine(t, bodyF.x, bodyF.y + i * 2, bodyF.w, Px.shade(base[0], 0.4), 0.5);
  const face = MOBSKIN2_faceRect('skeleton', 'head');
  if (face) {
    MOBSKIN2_eyes(t, face, { scleraCol: [10, 10, 10, 255], pupilCol: [180, 50, 20, 255],
      eyeY: 2, separation: 2, size: 2 });
  }
}

// ---------------------------------------------------------------------------
// Creeper
// ---------------------------------------------------------------------------
function MOBSKIN2_paintCreeper(t, r) {
  const base = Px.ramp('#508040', 5, 0.62, 1.35);
  MOBSKIN2_paintModel(t, 'creeper', base, r);
  // mottled dark pattern
  const m = MODELS['creeper'];
  [MP_PZ, MP_PX, MP_NX, MP_NZ].forEach(face => {
    const r2 = MOB_UV_FACE(m.byName['body'], face);
    for (let y = r2.y; y < r2.y + r2.h; y++) {
      for (let x = r2.x; x < r2.x + r2.w; x++) {
        if (x < 0 || y < 0 || x >= 64 || y >= 64) continue;
        const n = Px.fbm(x, y, 0.8, 3, r + 10, 64);
        if (n < 0.35) Px.setPx(t, x, y, Px.shade(base[0], 0.5), 0.6);
      }
    }
  });
  const face = MOBSKIN2_faceRect('creeper', 'head');
  if (face) {
    // creeper face: two square eyes, straight mouth
    const cx = face.x + Math.floor(face.w / 2);
    const eyY = face.y + 2;
    Px.rect(t, cx - 3, eyY, 2, 2, [20, 15, 10, 255]);
    Px.rect(t, cx + 1, eyY, 2, 2, [20, 15, 10, 255]);
    // sad trapezoid mouth
    const mY = face.y + face.h - 4;
    Px.hLine(t, cx - 2, mY, 4, [20, 15, 10, 255]);
    Px.setPx(t, cx - 2, mY + 1, [20, 15, 10, 255]);
    Px.setPx(t, cx + 1, mY + 1, [20, 15, 10, 255]);
    Px.hLine(t, cx - 2, mY + 2, 4, [20, 15, 10, 255]);
    // mottled dark on head face
    for (let y = face.y; y < face.y + face.h; y++) {
      for (let x = face.x; x < face.x + face.w; x++) {
        if (x < 0 || y < 0 || x >= 64 || y >= 64) continue;
        const n = Px.fbm(x, y, 1.0, 2, r + 15, 64);
        if (n < 0.3) Px.setPx(t, x, y, Px.shade(base[0], 0.45), 0.4);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Charged Creeper
// ---------------------------------------------------------------------------
function MOBSKIN2_paintChargedCreeper(t, r) {
  MOBSKIN2_paintCreeper(t, r);
  // electric crackle overlay
  const m = MODELS['creeper'];
  const parts2 = ['body', 'head', 'leg_fr', 'leg_fl', 'leg_br', 'leg_bl'];
  parts2.forEach(pn => {
    const p = m.byName[pn];
    if (!p) return;
    [MP_PZ, MP_PX, MP_NX, MP_NZ, MP_PY].forEach(face => {
      const r2 = MOB_UV_FACE(p, face);
      for (let y = r2.y; y < r2.y + r2.h; y++) {
        for (let x = r2.x; x < r2.x + r2.w; x++) {
          if (x < 0 || y < 0 || x >= 64 || y >= 64) continue;
          if (MOBSKIN2_h(x, y, r + 99) < 0.08)
            Px.setPx(t, x, y, [140, 180, 255, 255]);
        }
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Slime
// ---------------------------------------------------------------------------
function MOBSKIN2_paintSlime(t, r) {
  const outerPal = Px.ramp('#60a030', 5, 0.65, 1.3);
  const innerPal = Px.ramp('#80c050', 4, 0.75, 1.15);
  MOBSKIN2_paintModel(t, 'slime', outerPal, r);
  const m = MODELS['slime'];
  // inner cube lighter green
  if (m.byName['body_inner']) {
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(m.byName['body_inner'], face);
      MOBSKIN2_furNoise(t, r2.x, r2.y, r2.w, r2.h, innerPal, r + 5);
    });
  }
  const face = MOBSKIN2_faceRect('slime', 'body');
  if (face) {
    MOBSKIN2_eyes(t, face, { scleraCol: [180, 220, 255, 255], pupilCol: [20, 15, 5],
      eyeY: 3, separation: 3, size: 2 });
    MOBSKIN2_mouth(t, face, { col: [30, 60, 15], y: face.h - 3, w: 5 });
  }
}

// ---------------------------------------------------------------------------
// Magma Cube
// ---------------------------------------------------------------------------
function MOBSKIN2_paintMagmaCube(t, r) {
  const crust = Px.ramp('#402010', 5, 0.55, 1.4);
  const lava = Px.ramp('#f04010', 4, 0.75, 1.25);
  MOBSKIN2_paintModel(t, 'magma_cube', crust, r);
  // lava cracks
  const m = MODELS['magma_cube'];
  [MP_PZ, MP_PX, MP_NX, MP_NZ].forEach(face => {
    const r2 = MOB_UV_FACE(m.byName['body'], face);
    for (let y = r2.y; y < r2.y + r2.h; y++) {
      for (let x = r2.x; x < r2.x + r2.w; x++) {
        if (x < 0 || y < 0 || x >= 64 || y >= 64) continue;
        const n = Px.fbm(x, y, 1.2, 3, r + 5, 64);
        if (n < 0.25) Px.setPx(t, x, y, lava[Math.floor(n * 8) % lava.length]);
      }
    }
  });
  // inner cube lava
  if (m.byName['body_inner']) {
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(m.byName['body_inner'], face);
      MOBSKIN2_furNoise(t, r2.x, r2.y, r2.w, r2.h, lava, r + 10);
    });
  }
  const face = MOBSKIN2_faceRect('magma_cube', 'body');
  if (face) {
    MOBSKIN2_eyes(t, face, { scleraCol: [255, 100, 20, 255], pupilCol: [30, 5, 5],
      eyeY: 3, separation: 3, size: 2 });
  }
}

// ---------------------------------------------------------------------------
// Silverfish
// ---------------------------------------------------------------------------
function MOBSKIN2_paintSilverfish(t, r) {
  const base = Px.ramp('#808088', 5, 0.65, 1.3);
  MOBSKIN2_paintModel(t, 'silverfish', base, r);
  // segmented lines
  const m = MODELS['silverfish'];
  const bodyF = MOB_UV_FACE(m.byName['body'], MP_PY);
  for (let i = 1; i < 4; i++)
    Px.vLine(t, bodyF.x + i * 2, bodyF.y, bodyF.h, Px.shade(base[0], 0.55), 0.5);
  const face = MOBSKIN2_faceRect('silverfish', 'head');
  if (face) {
    MOBSKIN2_eyes(t, face, { scleraCol: [200, 50, 50, 255], pupilCol: [10, 5, 5],
      eyeY: 0, separation: 0, size: 1 });
  }
}

// ---------------------------------------------------------------------------
// Endermite
// ---------------------------------------------------------------------------
function MOBSKIN2_paintEndermite(t, r) {
  const base = Px.ramp('#383050', 5, 0.58, 1.4);
  MOBSKIN2_paintModel(t, 'endermite', base, r);
  const face = MOBSKIN2_faceRect('endermite', 'head');
  if (face) {
    Px.setPx(t, face.x, face.y, [130, 40, 160, 255]);
    Px.setPx(t, face.x + face.w - 1, face.y, [130, 40, 160, 255]);
  }
}

// ---------------------------------------------------------------------------
// Witch
// ---------------------------------------------------------------------------
function MOBSKIN2_paintWitch(t, r) {
  const skinPal = Px.ramp('#b08858', 5, 0.72, 1.22);
  const robePal = Px.ramp('#282040', 5, 0.55, 1.4);
  MOBSKIN2_paintModel(t, 'witch', skinPal, r);
  const m = MODELS['witch'];
  // robe dark purple
  ['body', 'robe', 'arm_r', 'arm_l', 'leg_r', 'leg_l', 'hat', 'hat_top'].forEach(pn => {
    const p = m.byName[pn];
    if (!p) return;
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(p, face);
      MOBSKIN2_furNoise(t, r2.x, r2.y, r2.w, r2.h, robePal, r + 5);
    });
  });
  const face = MOBSKIN2_faceRect('witch', 'head');
  if (face) {
    MOBSKIN2_furNoise(t, face.x, face.y, face.w, face.h, skinPal, r + 2);
    MOBSKIN2_eyes(t, face, { pupilCol: [30, 20, 10], eyeY: 2, separation: 1, size: 1 });
    // wart on nose
    Px.setPx(t, face.x + Math.floor(face.w / 2), face.y + Math.floor(face.h * 0.5), [120, 80, 50, 255]);
  }
  // hat green band
  const hat = m.byName['hat'];
  if (hat) {
    const hatF = MOB_UV_FACE(hat, MP_PZ);
    Px.hLine(t, hatF.x, hatF.y, hatF.w, [30, 100, 30, 255]);
  }
}

// ---------------------------------------------------------------------------
// Illager variants
// ---------------------------------------------------------------------------
function MOBSKIN2_paintIllager(t, r) {
  const skinPal = Px.ramp('#b0a888', 5, 0.72, 1.22);
  const robePal = Px.ramp('#606060', 5, 0.62, 1.3);
  MOBSKIN2_paintModel(t, 'illager', skinPal, r);
  const m = MODELS['illager'];
  ['body', 'arm_r', 'arm_l', 'leg_r', 'leg_l'].forEach(pn => {
    const p = m.byName[pn];
    if (!p) return;
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(p, face);
      MOBSKIN2_furNoise(t, r2.x, r2.y, r2.w, r2.h, robePal, r + 5);
    });
  });
  const face = MOBSKIN2_faceRect('illager', 'head');
  if (face) {
    MOBSKIN2_furNoise(t, face.x, face.y, face.w, face.h, skinPal, r + 2);
    MOBSKIN2_eyes(t, face, { scleraCol: [30, 30, 30, 255], pupilCol: [180, 180, 180, 255],
      eyeY: 2, separation: 2, size: 1 });
    MOBSKIN2_nostrils(t, face, { col: [80, 60, 40] });
  }
}

// ---------------------------------------------------------------------------
// Vex
// ---------------------------------------------------------------------------
function MOBSKIN2_paintVex(t, r) {
  const base = Px.ramp('#9090a8', 5, 0.7, 1.25);
  MOBSKIN2_paintModel(t, 'vex', base, r);
  const face = MOBSKIN2_faceRect('vex', 'head');
  if (face) {
    MOBSKIN2_eyes(t, face, { scleraCol: [220, 60, 40, 255], pupilCol: [20, 5, 5],
      eyeY: 1, separation: 1, size: 1 });
  }
  // wings translucent
  const m = MODELS['vex'];
  ['wing_r', 'wing_l'].forEach(wn => {
    const wing = m.byName[wn];
    if (!wing) return;
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(wing, face);
      for (let y = r2.y; y < r2.y + r2.h; y++)
        for (let x = r2.x; x < r2.x + r2.w; x++)
          Px.setPx(t, x, y, [200, 210, 230, 180]);
    });
  });
}

// ---------------------------------------------------------------------------
// Ravager
// ---------------------------------------------------------------------------
function MOBSKIN2_paintRavager(t, r) {
  const base = Px.ramp('#686058', 5, 0.6, 1.35);
  MOBSKIN2_paintModel(t, 'ravager', base, r);
  const m = MODELS['ravager'];
  [MP_PZ, MP_PX, MP_NX].forEach(face => {
    const r2 = MOB_UV_FACE(m.byName['body'], face);
    for (let i = 0; i < 3; i++)
      Px.hLine(t, r2.x, r2.y + i * 4 + 2, r2.w, Px.shade(base[0], 0.55), 0.4);
  });
  const face = MOBSKIN2_faceRect('ravager', 'head');
  if (face) {
    MOBSKIN2_eyes(t, face, { scleraCol: [220, 80, 40, 255], pupilCol: [20, 5, 5], eyeY: 3, separation: 4 });
    MOBSKIN2_nostrils(t, face, { col: [60, 45, 35], y: Math.floor(face.h * 0.55) });
  }
  // horns dark
  ['horn_r', 'horn_l'].forEach(hn => {
    const horn = m.byName[hn];
    if (!horn) return;
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(horn, face);
      MOBSKIN2_furNoise(t, r2.x, r2.y, r2.w, r2.h, Px.ramp('#3a3028', 3, 0.55, 1.35), r + 5);
    });
  });
}

// ---------------------------------------------------------------------------
// Guardian
// ---------------------------------------------------------------------------
function MOBSKIN2_paintGuardian(t, r) {
  const base = Px.ramp('#407060', 5, 0.62, 1.35);
  MOBSKIN2_paintModel(t, 'guardian', base, r);
  const m = MODELS['guardian'];
  // orange eye
  const eye = m.byName['eye'];
  if (eye) {
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(eye, face);
      MOBSKIN2_furNoise(t, r2.x, r2.y, r2.w, r2.h, Px.ramp('#f08020', 4, 0.8, 1.2), r + 5);
      const cx = r2.x + Math.floor(r2.w / 2);
      const cy = r2.y + Math.floor(r2.h / 2);
      Px.setPx(t, cx, cy, [20, 10, 5, 255]);
    });
  }
  // spines
  const spine = m.byName['spine0'];
  if (spine) {
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(spine, face);
      MOBSKIN2_furNoise(t, r2.x, r2.y, r2.w, r2.h, Px.ramp('#d0a060', 3, 0.75, 1.15), r + 8);
    });
  }
  const face = MOBSKIN2_faceRect('guardian', 'body');
  if (face) {
    MOBSKIN2_eyes(t, face, { scleraCol: [240, 120, 30, 255], pupilCol: [20, 5, 5],
      eyeY: Math.floor(face.h * 0.3), separation: Math.floor(face.w * 0.2), size: 2 });
  }
}

// ---------------------------------------------------------------------------
// Elder Guardian
// ---------------------------------------------------------------------------
function MOBSKIN2_paintElderGuardian(t, r) {
  const base = Px.ramp('#c0c0b8', 5, 0.72, 1.2);
  MOBSKIN2_paintModel(t, 'elder_guardian', base, r);
  const m = MODELS['elder_guardian'];
  const eye = m.byName['eye'];
  if (eye) {
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(eye, face);
      MOBSKIN2_furNoise(t, r2.x, r2.y, r2.w, r2.h, Px.ramp('#f09030', 4, 0.8, 1.2), r + 5);
      const cx = r2.x + Math.floor(r2.w / 2);
      const cy = r2.y + Math.floor(r2.h / 2);
      Px.setPx(t, cx, cy, [20, 10, 5, 255]);
    });
  }
  const face = MOBSKIN2_faceRect('elder_guardian', 'body');
  if (face) {
    MOBSKIN2_eyes(t, face, { scleraCol: [255, 140, 40, 255], pupilCol: [20, 5, 5],
      eyeY: Math.floor(face.h * 0.3), separation: Math.floor(face.w * 0.2), size: 2 });
  }
}

// ---------------------------------------------------------------------------
// Shulker
// ---------------------------------------------------------------------------
function MOBSKIN2_paintShulker(t, r) {
  const outerPal = Px.ramp('#7850a0', 5, 0.62, 1.35);
  const innerPal = Px.ramp('#c0b0a0', 4, 0.75, 1.18);
  MOBSKIN2_paintModel(t, 'shulker', outerPal, r);
  const m = MODELS['shulker'];
  const head = m.byName['head'];
  if (head) {
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(head, face);
      MOBSKIN2_furNoise(t, r2.x, r2.y, r2.w, r2.h, innerPal, r + 5);
    });
    const faceR = MOB_UV_FACE(head, MP_PZ);
    MOBSKIN2_eyes(t, faceR, { scleraCol: [200, 60, 20, 255], pupilCol: [20, 5, 5],
      eyeY: Math.floor(faceR.h * 0.4), separation: Math.floor(faceR.w * 0.2), size: 2 });
  }
}

// ---------------------------------------------------------------------------
// Blaze
// ---------------------------------------------------------------------------
function MOBSKIN2_paintBlaze(t, r) {
  const base = Px.ramp('#f0b020', 5, 0.7, 1.3);
  MOBSKIN2_paintModel(t, 'blaze', base, r);
  const m = MODELS['blaze'];
  // rods glow gradient
  for (let i = 0; i < 12; i++) {
    const rod = m.byName[`rod${i}`];
    if (!rod) continue;
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(rod, face);
      for (let y = r2.y; y < r2.y + r2.h; y++) {
        const t2 = (y - r2.y) / Math.max(1, r2.h - 1);
        const col = Px.mix([255, 60, 0, 255], [255, 220, 50, 255], t2);
        for (let x = r2.x; x < r2.x + r2.w; x++)
          if (x >= 0 && y >= 0 && x < 64 && y < 64) Px.setPx(t, x, y, col);
      }
    });
  }
  const face = MOBSKIN2_faceRect('blaze', 'head');
  if (face) {
    MOBSKIN2_eyes(t, face, { scleraCol: [255, 200, 40, 255], pupilCol: [10, 5, 5],
      eyeY: 2, separation: 2, size: 2 });
    MOBSKIN2_mouth(t, face, { col: [80, 30, 5], y: face.h - 2, w: 4 });
  }
}

// ---------------------------------------------------------------------------
// Ghast
// ---------------------------------------------------------------------------
function MOBSKIN2_paintGhast(t, r) {
  const base = Px.ramp('#f8f8f8', 5, 0.85, 1.08);
  MOBSKIN2_paintModel(t, 'ghast', base, r);
  const face = MOBSKIN2_faceRect('ghast', 'body');
  if (face) {
    // closed eyes when idle (narrow rectangles)
    const cx = face.x + Math.floor(face.w / 2);
    const eyY = face.y + Math.floor(face.h * 0.4);
    Px.rect(t, cx - 4, eyY, 3, 1, [30, 25, 20, 255]);
    Px.rect(t, cx + 1, eyY, 3, 1, [30, 25, 20, 255]);
    // mouth frown
    const mY = face.y + Math.floor(face.h * 0.65);
    Px.setPx(t, cx - 3, mY + 1, [30, 25, 20, 255]);
    Px.hLine(t, cx - 2, mY, 4, [30, 25, 20, 255]);
    Px.setPx(t, cx + 2, mY + 1, [30, 25, 20, 255]);
  }
}

// ---------------------------------------------------------------------------
// Phantom
// ---------------------------------------------------------------------------
function MOBSKIN2_paintPhantom(t, r) {
  const base = Px.ramp('#282848', 5, 0.6, 1.4);
  const membrPal = Px.ramp('#384868', 4, 0.65, 1.28);
  MOBSKIN2_paintModel(t, 'phantom', base, r);
  // wings membrane teal
  const m = MODELS['phantom'];
  ['wing_r', 'wing_l'].forEach(wn => {
    const wing = m.byName[wn];
    if (!wing) return;
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(wing, face);
      MOBSKIN2_furNoise(t, r2.x, r2.y, r2.w, r2.h, membrPal, r + 5);
    });
  });
  const face = MOBSKIN2_faceRect('phantom', 'head');
  if (face) {
    MOBSKIN2_eyes(t, face, { scleraCol: [100, 200, 80, 255], pupilCol: [10, 20, 5],
      eyeY: 1, separation: 2, size: 1 });
  }
}

// ---------------------------------------------------------------------------
// Warden
// ---------------------------------------------------------------------------
function MOBSKIN2_paintWarden(t, r) {
  const base = Px.ramp('#1a1820', 5, 0.45, 1.6);
  MOBSKIN2_paintModel(t, 'warden', base, r);
  const m = MODELS['warden'];
  // glowing chest ribs cyan/blue emissive
  ['rib_r', 'rib_l', 'rib_r2', 'rib_l2'].forEach(pn => {
    const p = m.byName[pn];
    if (!p) return;
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(p, face);
      for (let y = r2.y; y < r2.y + r2.h; y++)
        for (let x = r2.x; x < r2.x + r2.w; x++) {
          if (x < 0 || y < 0 || x >= 64 || y >= 64) continue;
          const glow = 0.6 + Px.fbm(x, y, 0.6, 2, r + 3, 64) * 0.4;
          Px.setPx(t, x, y, [Math.floor(30 * glow), Math.floor(200 * glow), Math.floor(180 * glow), 255]);
        }
    });
  });
  // no visible eyes, big head
  const face = MOBSKIN2_faceRect('warden', 'head');
  if (face) {
    // vibration sensor slits
    Px.hLine(t, face.x + 1, face.y + Math.floor(face.h * 0.4), face.w - 2, [50, 200, 180, 255], 0.7);
  }
}

// ---------------------------------------------------------------------------
// Ender Dragon
// ---------------------------------------------------------------------------
function MOBSKIN2_paintEnderDragon(t, r) {
  const base = Px.ramp('#181820', 5, 0.45, 1.65);
  const scalePal = Px.ramp('#282840', 4, 0.55, 1.4);
  MOBSKIN2_paintModel(t, 'ender_dragon', base, r);
  // scale texture on body
  const m = MODELS['ender_dragon'];
  [MP_PZ, MP_PX, MP_NX, MP_PY].forEach(face => {
    const r2 = MOB_UV_FACE(m.byName['body'], face);
    for (let y = r2.y; y < r2.y + r2.h; y++) {
      for (let x = r2.x; x < r2.x + r2.w; x++) {
        if (x < 0 || y < 0 || x >= 64 || y >= 64) continue;
        const cell = Math.floor((x - r2.x) / 3) + Math.floor((y - r2.y) / 3);
        if (cell % 2 === 0) Px.setPx(t, x, y, scalePal[cell % scalePal.length], 0.4);
      }
    }
  });
  // wings purple membrane
  ['wing_r0', 'wing_r1', 'wing_l0', 'wing_l1'].forEach(wn => {
    const wing = m.byName[wn];
    if (!wing) return;
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(wing, face);
      MOBSKIN2_furNoise(t, r2.x, r2.y, r2.w, r2.h, Px.ramp('#5020a0', 4, 0.6, 1.35), r + 5);
    });
  });
  const face = MOBSKIN2_faceRect('ender_dragon', 'head');
  if (face) {
    MOBSKIN2_eyes(t, face, { scleraCol: [80, 200, 80, 255], pupilCol: [10, 40, 10],
      highlightCol: [180, 255, 180], eyeY: 2, separation: 3, size: 2 });
    // dragon nostrils
    MOBSKIN2_nostrils(t, face, { col: [50, 100, 50], y: Math.floor(face.h * 0.55) });
  }
  // jaw slightly lighter
  const jaw = m.byName['jaw'];
  if (jaw) {
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(jaw, face);
      MOBSKIN2_furNoise(t, r2.x, r2.y, r2.w, r2.h, Px.ramp('#202028', 3, 0.55, 1.4), r + 8);
    });
    const jawF = MOB_UV_FACE(jaw, MP_PZ);
    // teeth
    for (let i = 1; i < jawF.w - 1; i += 2) Px.setPx(t, jawF.x + i, jawF.y, [220, 210, 200, 255]);
  }
}

// ---------------------------------------------------------------------------
// Wither
// ---------------------------------------------------------------------------
function MOBSKIN2_paintWither(t, r) {
  const base = Px.ramp('#1a1410', 5, 0.45, 1.65);
  MOBSKIN2_paintModel(t, 'wither', base, r);
  const m = MODELS['wither'];
  // dark ribcage lines
  const bodyF = MOB_UV_FACE(m.byName['body'], MP_PZ);
  for (let i = 0; i < 4; i++)
    Px.hLine(t, bodyF.x, bodyF.y + i * 3, bodyF.w, Px.shade(base[0], 0.4), 0.6);
  // ribs bone colored
  ['rib0', 'rib1', 'rib2'].forEach(pn => {
    const p = m.byName[pn];
    if (!p) return;
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(p, face);
      MOBSKIN2_furNoise(t, r2.x, r2.y, r2.w, r2.h, Px.ramp('#a89880', 3, 0.72, 1.18), r + 5);
    });
  });
  // main skull face
  const face = MOBSKIN2_faceRect('wither', 'head');
  if (face) {
    MOBSKIN2_eyes(t, face, { scleraCol: [10, 10, 10, 255], pupilCol: [180, 50, 20, 255],
      eyeY: 2, separation: 2, size: 2 });
    // jaw line
    Px.hLine(t, face.x, face.y + face.h - 2, face.w, Px.shade(base[2], 0.7), 0.7);
  }
  // side heads blue-grey
  ['head_r', 'head_l'].forEach(hn => {
    const hpart = m.byName[hn];
    if (!hpart) return;
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(hpart, face);
      MOBSKIN2_furNoise(t, r2.x, r2.y, r2.w, r2.h, Px.ramp('#282830', 3, 0.55, 1.4), r + 8);
    });
    const sideF = MOB_UV_FACE(hpart, MP_PZ);
    MOBSKIN2_eyes(t, sideF, { scleraCol: [10, 10, 10, 255], pupilCol: [160, 40, 15, 255],
      eyeY: 1, separation: 1, size: 1 });
  });
}

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------
function MOBSKIN2_paintPlayer(t, r) {
  const skinPal = Px.ramp('#c8a070', 5, 0.75, 1.2);
  const shirtPal = Px.ramp('#486898', 4, 0.65, 1.3);
  const pantsPal = Px.ramp('#383858', 4, 0.62, 1.32);
  MOBSKIN2_paintModel(t, 'player', skinPal, r);
  const m = MODELS['player'];
  // shirt on body+arms
  ['body', 'arm_r', 'arm_l'].forEach(pn => {
    const p = m.byName[pn];
    if (!p) return;
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(p, face);
      MOBSKIN2_furNoise(t, r2.x, r2.y, r2.w, r2.h, shirtPal, r + 5);
    });
  });
  // pants on legs
  ['leg_r', 'leg_l'].forEach(pn => {
    const p = m.byName[pn];
    if (!p) return;
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(p, face);
      MOBSKIN2_furNoise(t, r2.x, r2.y, r2.w, r2.h, pantsPal, r + 8);
    });
  });
  const face = MOBSKIN2_faceRect('player', 'head');
  if (face) {
    MOBSKIN2_furNoise(t, face.x, face.y, face.w, face.h, skinPal, r + 2);
    MOBSKIN2_eyes(t, face, { pupilCol: [30, 20, 10], eyeY: 2, separation: 2, size: 2 });
    MOBSKIN2_mouth(t, face, { col: [80, 50, 30], y: Math.floor(face.h * 0.65), w: 3 });
  }
}

// ---------------------------------------------------------------------------
export const MOB_SKIN_PAINTERS_2 = {
  iron_golem(Px2, r, variant)    { const t = Px2.makeTile(64,64); MOBSKIN2_paintIronGolem(t, r); return t; },
  snow_golem(Px2, r, variant)    { const t = Px2.makeTile(64,64); MOBSKIN2_paintSnowGolem(t, r); return t; },
  panda(Px2, r, variant)         { const t = Px2.makeTile(64,64); MOBSKIN2_paintPanda(t, r, variant); return t; },
  polar_bear(Px2, r, variant)    { const t = Px2.makeTile(64,64); MOBSKIN2_paintPolarBear(t, r); return t; },
  spider(Px2, r, variant)        { const t = Px2.makeTile(64,64); MOBSKIN2_paintSpider(t, r); return t; },
  cave_spider(Px2, r, variant)   { const t = Px2.makeTile(64,64); MOBSKIN2_paintCaveSpider(t, r); return t; },
  enderman(Px2, r, variant)      { const t = Px2.makeTile(64,64); MOBSKIN2_paintEnderman(t, r); return t; },
  piglin(Px2, r, variant)        { const t = Px2.makeTile(64,64); MOBSKIN2_paintPiglin(t, r); return t; },
  piglin_brute(Px2, r, variant)  { const t = Px2.makeTile(64,64); MOBSKIN2_paintPiglinBrute(t, r); return t; },
  hoglin(Px2, r, variant)        { const t = Px2.makeTile(64,64); MOBSKIN2_paintHoglin(t, r); return t; },
  zoglin(Px2, r, variant)        { const t = Px2.makeTile(64,64); MOBSKIN2_paintZoglin(t, r); return t; },
  zombie(Px2, r, variant)        { const t = Px2.makeTile(64,64); MOBSKIN2_paintZombie(t, r); return t; },
  husk(Px2, r, variant)          { const t = Px2.makeTile(64,64); MOBSKIN2_paintHusk(t, r); return t; },
  drowned(Px2, r, variant)       { const t = Px2.makeTile(64,64); MOBSKIN2_paintDrowned(t, r); return t; },
  zombie_villager(Px2, r, variant){ const t = Px2.makeTile(64,64); MOBSKIN2_paintZombieVillager(t, r); return t; },
  skeleton(Px2, r, variant)      { const t = Px2.makeTile(64,64); MOBSKIN2_paintSkeleton(t, r); return t; },
  stray(Px2, r, variant)         { const t = Px2.makeTile(64,64); MOBSKIN2_paintStray(t, r); return t; },
  bogged(Px2, r, variant)        { const t = Px2.makeTile(64,64); MOBSKIN2_paintBogged(t, r); return t; },
  wither_skeleton(Px2, r, variant){ const t = Px2.makeTile(64,64); MOBSKIN2_paintWitherSkeleton(t, r); return t; },
  creeper(Px2, r, variant)       { const t = Px2.makeTile(64,64); MOBSKIN2_paintCreeper(t, r); return t; },
  charged_creeper(Px2, r, variant){ const t = Px2.makeTile(64,64); MOBSKIN2_paintChargedCreeper(t, r); return t; },
  slime(Px2, r, variant)         { const t = Px2.makeTile(64,64); MOBSKIN2_paintSlime(t, r); return t; },
  magma_cube(Px2, r, variant)    { const t = Px2.makeTile(64,64); MOBSKIN2_paintMagmaCube(t, r); return t; },
  silverfish(Px2, r, variant)    { const t = Px2.makeTile(64,64); MOBSKIN2_paintSilverfish(t, r); return t; },
  endermite(Px2, r, variant)     { const t = Px2.makeTile(64,64); MOBSKIN2_paintEndermite(t, r); return t; },
  witch(Px2, r, variant)         { const t = Px2.makeTile(64,64); MOBSKIN2_paintWitch(t, r); return t; },
  pillager(Px2, r, variant)      { const t = Px2.makeTile(64,64); MOBSKIN2_paintIllager(t, r); return t; },
  vindicator(Px2, r, variant)    { const t = Px2.makeTile(64,64); MOBSKIN2_paintIllager(t, r + 100); return t; },
  evoker(Px2, r, variant)        { const t = Px2.makeTile(64,64); MOBSKIN2_paintIllager(t, r + 200); return t; },
  illusioner(Px2, r, variant)    { const t = Px2.makeTile(64,64); MOBSKIN2_paintIllager(t, r + 300); return t; },
  vex(Px2, r, variant)           { const t = Px2.makeTile(64,64); MOBSKIN2_paintVex(t, r); return t; },
  ravager(Px2, r, variant)       { const t = Px2.makeTile(64,64); MOBSKIN2_paintRavager(t, r); return t; },
  guardian(Px2, r, variant)      { const t = Px2.makeTile(64,64); MOBSKIN2_paintGuardian(t, r); return t; },
  elder_guardian(Px2, r, variant){ const t = Px2.makeTile(64,64); MOBSKIN2_paintElderGuardian(t, r); return t; },
  shulker(Px2, r, variant)       { const t = Px2.makeTile(64,64); MOBSKIN2_paintShulker(t, r); return t; },
  blaze(Px2, r, variant)         { const t = Px2.makeTile(64,64); MOBSKIN2_paintBlaze(t, r); return t; },
  ghast(Px2, r, variant)         { const t = Px2.makeTile(64,64); MOBSKIN2_paintGhast(t, r); return t; },
  phantom(Px2, r, variant)       { const t = Px2.makeTile(64,64); MOBSKIN2_paintPhantom(t, r); return t; },
  warden(Px2, r, variant)        { const t = Px2.makeTile(64,64); MOBSKIN2_paintWarden(t, r); return t; },
  ender_dragon(Px2, r, variant)  { const t = Px2.makeTile(64,64); MOBSKIN2_paintEnderDragon(t, r); return t; },
  wither(Px2, r, variant)        { const t = Px2.makeTile(64,64); MOBSKIN2_paintWither(t, r); return t; },
  player(Px2, r, variant)        { const t = Px2.makeTile(64,64); MOBSKIN2_paintPlayer(t, r); return t; },
};
