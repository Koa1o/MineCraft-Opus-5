// ---------------------------------------------------------------------------
// Mob skin painters. Every top-level name prefixed MOBSKIN_ for safety.
// Exports: MOB_SKIN_PAINTERS, MOB_SKIN_VARIANTS
// ---------------------------------------------------------------------------
import { Px } from './px.js';
import {
  MOB_UV_FACE, MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ,
  MOB_SKIN_W, MOB_SKIN_H, MODELS,
} from '../entities/model.js';
import { MOB_SKIN_PAINTERS_2 } from './mobSkins2.js';

// ---- Wool colours (indices 0-15 matching dye order) -----------------------
const MOBSKIN_WOOL_RGB = [
  [0xf9,0xff,0xfe],[0xf9,0x80,0x1d],[0xc7,0x4e,0xbd],[0x3a,0xb3,0xda],
  [0xfe,0xd8,0x3d],[0x80,0xc7,0x1f],[0xf3,0x8b,0xaa],[0x47,0x4f,0x52],
  [0x9d,0x9d,0x97],[0x16,0x9c,0x9c],[0x89,0x32,0xb8],[0x3c,0x44,0xaa],
  [0x83,0x54,0x32],[0x5e,0x7c,0x16],[0xb0,0x2e,0x26],[0x1d,0x1d,0x21],
];

// ---- Shared helpers -------------------------------------------------------

/** Cheap deterministic hash for seeded noise without Math.random */
function MOBSKIN_h(x, y, s) {
  let v = ((x * 1619 + y * 31337 + s * 1234567) | 0);
  v = (v ^ (v >>> 13)) * 0x45d9f3b | 0;
  return ((v ^ (v >>> 15)) >>> 0) / 0xffffffff;
}

/** Fill a rect with a palette using fbm-style noise */
function MOBSKIN_noiseFill(t, rx, ry, rw, rh, pal, seed) {
  const n = pal.length;
  for (let y = ry; y < ry + rh; y++) {
    for (let x = rx; x < rx + rw; x++) {
      const v = Px.fbm(x, y, 0.35, 3, seed, 64);
      const idx = Math.min(n - 1, Math.max(0, Math.floor(v * n)));
      Px.setPx(t, x, y, pal[idx]);
    }
  }
}

/** Fill all 6 faces of a part with a colour function colFn(faceIdx, px, py)->color */
function MOBSKIN_fillPart(t, p, colFn) {
  const faces = [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ];
  for (const face of faces) {
    const r = MOB_UV_FACE(p, face);
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        if (x < 0 || y < 0 || x >= 64 || y >= 64) continue;
        Px.setPx(t, x, y, colFn(face, x - r.x, y - r.y));
      }
    }
  }
}

/** Fur/scale noise dithering inside a rect. pal should have 4-5 colours. */
function MOBSKIN_furNoise(t, rx, ry, rw, rh, pal, seed) {
  for (let y = ry; y < ry + rh; y++) {
    for (let x = rx; x < rx + rw; x++) {
      if (x < 0 || y < 0 || x >= 64 || y >= 64) continue;
      const n = Px.fbm(x, y, 0.5, 3, seed, 64);
      const n2 = MOBSKIN_h(x, y, seed + 77) * 0.18;
      const v = Math.min(pal.length - 1, Math.max(0, Math.floor((n + n2) * pal.length)));
      Px.setPx(t, x, y, pal[v]);
    }
  }
}

/** Draw eyes on a face rect (head front = MP_PZ face) */
function MOBSKIN_eyes(t, rect, opts) {
  const { scleraCol = [255, 255, 255], pupilCol = [20, 20, 20],
    highlightCol = [255, 255, 255], eyeY = Math.floor(rect.h * 0.35),
    separation = Math.floor(rect.w * 0.25), size = 2 } = opts || {};
  const cx = Math.floor(rect.w / 2);
  const lx = rect.x + cx - separation;
  const rx = rect.x + cx + separation;
  const ey = rect.y + eyeY;
  // sclera
  Px.rect(t, lx - 1, ey - 1, size + 2, size + 2, scleraCol);
  Px.rect(t, rx - 1, ey - 1, size + 2, size + 2, scleraCol);
  // pupil
  Px.rect(t, lx, ey, size, size, pupilCol);
  Px.rect(t, rx, ey, size, size, pupilCol);
  // highlight
  Px.setPx(t, lx, ey, highlightCol);
  Px.setPx(t, rx, ey, highlightCol);
}

/** Draw a simple mouth line */
function MOBSKIN_mouth(t, rect, opts) {
  const { col = [80, 50, 40], y = Math.floor(rect.h * 0.65), w = Math.floor(rect.w * 0.4) } = opts || {};
  const cx = rect.x + Math.floor(rect.w / 2);
  const mx = cx - Math.floor(w / 2);
  Px.hLine(t, mx, rect.y + y, w, col);
  Px.setPx(t, mx, rect.y + y + 1, col, 0.5);
  Px.setPx(t, mx + w - 1, rect.y + y + 1, col, 0.5);
}

/** Draw nostrils */
function MOBSKIN_nostrils(t, rect, opts) {
  const { col = [80, 50, 40], y = Math.floor(rect.h * 0.55) } = opts || {};
  const cx = rect.x + Math.floor(rect.w / 2);
  Px.setPx(t, cx - 1, rect.y + y, col);
  Px.setPx(t, cx + 1, rect.y + y, col);
}

/** Random spots on a rect */
function MOBSKIN_spots(t, rx, ry, rw, rh, col, seed, count) {
  for (let i = 0; i < count; i++) {
    const sx = rx + Math.floor(MOBSKIN_h(i, 0, seed) * rw);
    const sy = ry + Math.floor(MOBSKIN_h(i, 1, seed) * rh);
    const sr = 1 + Math.floor(MOBSKIN_h(i, 2, seed) * 2);
    Px.circle(t, sx, sy, sr, col);
  }
}

/** Stripes across a rect */
function MOBSKIN_stripes(t, rx, ry, rw, rh, col, seed, count, vertical) {
  for (let i = 0; i < count; i++) {
    if (vertical) {
      const sx = rx + Math.floor(MOBSKIN_h(i, 0, seed) * rw);
      Px.vLine(t, sx, ry, rh, col, 0.7);
    } else {
      const sy = ry + Math.floor(MOBSKIN_h(i, 0, seed) * rh);
      Px.hLine(t, rx, sy, rw, col, 0.7);
    }
  }
}

/** Paint all parts of a model with fur noise + shade variation per face */
function MOBSKIN_paintModel(t, modelName, basePal, seed) {
  const m = MODELS[modelName];
  if (!m) return;
  const n = basePal.length;
  for (const p of m.parts) {
    const shade = { [MP_PY]: 1.15, [MP_NY]: 0.7, [MP_PX]: 0.9, [MP_NX]: 0.95, [MP_PZ]: 1.0, [MP_NZ]: 0.85 };
    MOBSKIN_fillPart(t, p, (face, lx, ly) => {
      const noiseV = Px.fbm(p.uv[0] + lx, p.uv[1] + ly, 0.5, 3, seed, 64);
      const idx = Math.min(n - 1, Math.max(0, Math.floor(noiseV * n)));
      return Px.shade(basePal[idx], shade[face] || 1.0);
    });
  }
}

/** Helper: get the front-face rect of a named part */
function MOBSKIN_faceRect(modelName, partName) {
  const m = MODELS[modelName];
  if (!m || !m.byName[partName]) return null;
  return MOB_UV_FACE(m.byName[partName], MP_PZ);
}

// ---- Individual painters --------------------------------------------------

function MOBSKIN_paintPig(t, r) {
  const base = Px.ramp('#f4a7a7', 5, 0.7, 1.2);
  MOBSKIN_paintModel(t, 'pig', base, r);
  // snout pink oval
  const snout = MOBSKIN_faceRect('pig', 'snout');
  if (snout) {
    MOBSKIN_furNoise(t, snout.x, snout.y, snout.w, snout.h, Px.ramp('#e88888', 4, 0.8, 1.1), r + 10);
    MOBSKIN_nostrils(t, snout, { col: [160, 60, 60] });
  }
  const face = MOBSKIN_faceRect('pig', 'head');
  if (face) {
    MOBSKIN_eyes(t, face, { pupilCol: [60, 30, 30], eyeY: 2, separation: 2 });
  }
}

function MOBSKIN_paintCow(t, r) {
  const base = Px.ramp('#3a3530', 5, 0.7, 1.3);
  const white = Px.ramp('#e8e0d0', 4, 0.85, 1.1);
  MOBSKIN_paintModel(t, 'cow', base, r);
  // white patches on body
  const m = MODELS['cow'];
  const bodyFront = MOB_UV_FACE(m.byName['body'], MP_PZ);
  MOBSKIN_spots(t, bodyFront.x, bodyFront.y, bodyFront.w, bodyFront.h, white[2], r + 5, 3);
  const face = MOBSKIN_faceRect('cow', 'head');
  if (face) {
    MOBSKIN_eyes(t, face, { pupilCol: [30, 20, 10], eyeY: 2 });
    MOBSKIN_nostrils(t, face, { col: [80, 50, 30] });
  }
  // udder pink
  const udder = MODELS['cow'].byName['udder'];
  if (udder) {
    [MP_PX, MP_NX, MP_PZ, MP_NZ, MP_PY, MP_NY].forEach(face => {
      const r2 = MOB_UV_FACE(udder, face);
      MOBSKIN_furNoise(t, r2.x, r2.y, r2.w, r2.h, Px.ramp('#f4b0b0', 3, 0.85, 1.1), r + 20);
    });
  }
}

function MOBSKIN_paintMooshroom(t, r) {
  const base = Px.ramp('#8B1a1a', 5, 0.7, 1.25);
  MOBSKIN_paintModel(t, 'mooshroom', base, r);
  const face = MOBSKIN_faceRect('mooshroom', 'head');
  if (face) {
    MOBSKIN_eyes(t, face, { pupilCol: [30, 15, 15], eyeY: 2 });
    MOBSKIN_nostrils(t, face, { col: [60, 20, 20] });
  }
  // white spots (mushroom marks on body)
  const m = MODELS['mooshroom'];
  [MP_PZ, MP_PX, MP_NX].forEach(f => {
    const r2 = MOB_UV_FACE(m.byName['body'], f);
    MOBSKIN_spots(t, r2.x, r2.y, r2.w, r2.h, [240, 240, 240, 255], r + 30, 2);
  });
}

function MOBSKIN_paintSheep(t, r, variant) {
  const woolRGB = MOBSKIN_WOOL_RGB[variant % 16];
  const woolPal = Px.ramp(woolRGB, 5, 0.65, 1.2);
  const skinPal = Px.ramp('#c8a070', 4, 0.75, 1.15);
  MOBSKIN_paintModel(t, 'sheep', woolPal, r);
  // face is bare skin
  const face = MOBSKIN_faceRect('sheep', 'head');
  if (face) {
    MOBSKIN_furNoise(t, face.x, face.y, face.w, face.h, skinPal, r + 5);
    MOBSKIN_eyes(t, face, { pupilCol: [40, 30, 20], eyeY: 2, separation: 1 });
  }
  // legs are bare skin
  const m = MODELS['sheep'];
  for (const legName of ['leg_fr', 'leg_fl', 'leg_br', 'leg_bl']) {
    const leg = m.byName[legName];
    if (!leg) continue;
    [MP_PX, MP_NX, MP_PZ, MP_NZ, MP_PY, MP_NY].forEach(face => {
      const r2 = MOB_UV_FACE(leg, face);
      MOBSKIN_furNoise(t, r2.x, r2.y, r2.w, r2.h, skinPal, r + 10);
    });
  }
}

function MOBSKIN_paintSheepSheared(t, r) {
  const skinPal = Px.ramp('#d4a878', 5, 0.7, 1.2);
  MOBSKIN_paintModel(t, 'sheep_sheared', skinPal, r);
  const face = MOBSKIN_faceRect('sheep_sheared', 'head');
  if (face) {
    MOBSKIN_eyes(t, face, { pupilCol: [40, 30, 20], eyeY: 2, separation: 1 });
  }
}

function MOBSKIN_paintChicken(t, r) {
  const base = Px.ramp('#e8e0d0', 5, 0.75, 1.15);
  const red = [200, 50, 40, 255];
  MOBSKIN_paintModel(t, 'chicken', base, r);
  const face = MOBSKIN_faceRect('chicken', 'head');
  if (face) {
    MOBSKIN_eyes(t, face, { pupilCol: [30, 20, 10], eyeY: 1, separation: 1, size: 1 });
  }
  // beak yellow
  const beak = MODELS['chicken'].byName['beak'];
  if (beak) {
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(beak, face);
      Px.fill({ w: 64, h: 64, data: t.data }, [220, 180, 40, 255]);
      for (let y = r2.y; y < r2.y + r2.h; y++)
        for (let x = r2.x; x < r2.x + r2.w; x++)
          Px.setPx(t, x, y, Px.shade([220, 180, 40, 255], 0.9 + Px.fbm(x, y, 0.5, 2, r + 2, 64) * 0.2));
    });
  }
  // wattle red
  const wattle = MODELS['chicken'].byName['wattle'];
  if (wattle) {
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(wattle, face);
      for (let y = r2.y; y < r2.y + r2.h; y++)
        for (let x = r2.x; x < r2.x + r2.w; x++)
          Px.setPx(t, x, y, Px.shade(red, 0.85 + MOBSKIN_h(x, y, r) * 0.3));
    });
  }
  // legs orange
  ['leg_r', 'leg_l'].forEach(ln => {
    const leg = MODELS['chicken'].byName[ln];
    if (!leg) return;
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(leg, face);
      for (let y = r2.y; y < r2.y + r2.h; y++)
        for (let x = r2.x; x < r2.x + r2.w; x++)
          Px.setPx(t, x, y, Px.shade([210, 130, 30, 255], 0.9 + MOBSKIN_h(x, y, r + 3) * 0.2));
    });
  });
}

function MOBSKIN_paintRabbit(t, r, variant) {
  const pals = [
    Px.ramp('#8B5a2b', 5, 0.55, 1.4),  // brown
    Px.ramp('#e8e0d8', 5, 0.75, 1.2),  // white
    Px.ramp('#111111', 5, 0.3, 2.2),   // black
    Px.ramp('#c8c0b0', 5, 0.65, 1.3),  // salt&pepper
    Px.ramp('#d4a832', 5, 0.65, 1.3),  // gold
    Px.ramp('#4a2a1a', 5, 0.55, 1.4),  // toast
  ];
  const pal = pals[variant % 6];
  MOBSKIN_paintModel(t, 'rabbit', pal, r);
  const face = MOBSKIN_faceRect('rabbit', 'head');
  if (face) {
    MOBSKIN_eyes(t, face, { pupilCol: variant === 0 ? [180, 80, 80] : [40, 30, 20], eyeY: 1, separation: 1, size: 1 });
    MOBSKIN_nostrils(t, face, { col: Px.shade(pal[0], 0.6), y: Math.floor(face.h * 0.6) });
  }
  // ear inner pink
  ['ear_r', 'ear_l'].forEach(en => {
    const ear = MODELS['rabbit'].byName[en];
    if (!ear) return;
    const r2 = MOB_UV_FACE(ear, MP_PZ);
    MOBSKIN_furNoise(t, r2.x, r2.y, r2.w, r2.h, Px.ramp('#e8a0b0', 3, 0.8, 1.1), r + 15);
  });
}

function MOBSKIN_paintHorse(t, r, variant) {
  const coats = [
    Px.ramp('#7a5030', 5, 0.65, 1.3),  // bay
    Px.ramp('#c8a070', 5, 0.7, 1.2),   // chestnut
    Px.ramp('#d8d0c0', 5, 0.8, 1.15),  // white
    Px.ramp('#2a1c10', 5, 0.55, 1.4),  // dark bay
    Px.ramp('#888070', 5, 0.7, 1.2),   // grey
    Px.ramp('#c0a848', 5, 0.7, 1.2),   // palomino
    Px.ramp('#383028', 5, 0.6, 1.35),  // dark brown
  ];
  const pal = coats[variant % 7];
  MOBSKIN_paintModel(t, 'horse', pal, r);
  const face = MOBSKIN_faceRect('horse', 'head');
  if (face) {
    MOBSKIN_eyes(t, face, { pupilCol: [30, 20, 10], eyeY: 2, separation: 2 });
    MOBSKIN_nostrils(t, face, { col: Px.shade(pal[0], 0.6) });
  }
  // mane darker
  const mane = MODELS['horse'].byName['mane'];
  if (mane) {
    const darkPal = pal.map(c => Px.shade(c, 0.6));
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(mane, face);
      MOBSKIN_furNoise(t, r2.x, r2.y, r2.w, r2.h, darkPal, r + 20);
    });
  }
}

function MOBSKIN_paintDonkey(t, r) {
  const pal = Px.ramp('#7a7068', 5, 0.65, 1.3);
  MOBSKIN_paintModel(t, 'donkey', pal, r);
  const face = MOBSKIN_faceRect('donkey', 'head');
  if (face) {
    MOBSKIN_eyes(t, face, { pupilCol: [30, 20, 10], eyeY: 2, separation: 2 });
    MOBSKIN_nostrils(t, face, { col: Px.shade(pal[0], 0.55) });
  }
}

function MOBSKIN_paintMule(t, r) {
  const pal = Px.ramp('#5a4838', 5, 0.65, 1.3);
  MOBSKIN_paintModel(t, 'mule', pal, r);
  const face = MOBSKIN_faceRect('mule', 'head');
  if (face) {
    MOBSKIN_eyes(t, face, { pupilCol: [30, 20, 10], eyeY: 2, separation: 2 });
    MOBSKIN_nostrils(t, face, { col: Px.shade(pal[0], 0.55) });
  }
}

function MOBSKIN_paintLlama(t, r, variant) {
  const pals = [
    Px.ramp('#d8c8a8', 5, 0.75, 1.2),  // cream
    Px.ramp('#b07848', 5, 0.65, 1.3),  // brown
    Px.ramp('#888880', 5, 0.7, 1.25),  // grey
    Px.ramp('#e8e0d8', 5, 0.82, 1.15), // white
  ];
  const pal = pals[variant % 4];
  MOBSKIN_paintModel(t, 'llama', pal, r);
  const face = MOBSKIN_faceRect('llama', 'head');
  if (face) {
    MOBSKIN_eyes(t, face, { pupilCol: [50, 35, 15], eyeY: 2, separation: 1, size: 1 });
    MOBSKIN_nostrils(t, face, { col: Px.shade(pal[0], 0.55) });
  }
}

function MOBSKIN_paintCat(t, r, variant) {
  const catPals = [
    [Px.ramp('#c87030', 5, 0.6, 1.3), Px.ramp('#f0c080', 3, 0.85, 1.1)], // tabby
    [Px.ramp('#1a1a1a', 5, 0.5, 1.5), Px.ramp('#f0f0f0', 3, 0.85, 1.1)], // tuxedo
    [Px.ramp('#c04820', 5, 0.65, 1.3), null], // red
    [Px.ramp('#e8d8c0', 5, 0.78, 1.18), Px.ramp('#5a3820', 3, 0.7, 1.2)], // siamese
    [Px.ramp('#8888a0', 5, 0.7, 1.25), null], // british
    [Px.ramp('#d0a060', 5, 0.68, 1.25), Px.ramp('#1a1a1a', 2, 0.5, 0.7)], // calico
    [Px.ramp('#f0e8d8', 5, 0.82, 1.1), null], // persian
    [Px.ramp('#f8f0e8', 5, 0.85, 1.1), Px.ramp('#e0c8b0', 3, 0.8, 1.05)], // ragdoll
    [Px.ramp('#f4f4f4', 5, 0.88, 1.08), null], // white
    [Px.ramp('#8a7060', 5, 0.68, 1.28), Px.ramp('#c0a880', 3, 0.8, 1.1)], // jellie
    [Px.ramp('#111111', 5, 0.35, 2.0), null], // black
  ];
  const v = variant % 11;
  const [mainPal, accentPal] = catPals[v];
  MOBSKIN_paintModel(t, 'cat', mainPal, r);
  if (accentPal) {
    // accent stripes on body front
    const m = MODELS['cat'];
    const bodyF = MOB_UV_FACE(m.byName['body'], MP_PZ);
    MOBSKIN_stripes(t, bodyF.x, bodyF.y, bodyF.w, bodyF.h, accentPal[0], r + 5, 3, false);
  }
  const face = MOBSKIN_faceRect('cat', 'head');
  if (face) {
    const eyeCol = v === 7 ? [100, 160, 200, 255] : v === 3 ? [70, 120, 200, 255] : [60, 100, 30, 255];
    MOBSKIN_eyes(t, face, { pupilCol: [20, 15, 10], eyeY: 1, separation: 1, size: 1,
      scleraCol: eyeCol, highlightCol: [255, 255, 255] });
  }
  // ears pink inside
  ['ear_r', 'ear_l'].forEach(en => {
    const ear = MODELS['cat'].byName[en];
    if (!ear) return;
    const r2 = MOB_UV_FACE(ear, MP_PZ);
    MOBSKIN_furNoise(t, r2.x, r2.y, r2.w, r2.h, Px.ramp('#e89090', 3, 0.85, 1.1), r + 30);
  });
}

function MOBSKIN_paintOcelot(t, r) {
  const base = Px.ramp('#d4b870', 5, 0.72, 1.22);
  MOBSKIN_paintModel(t, 'ocelot', base, r);
  // dark spots
  const m = MODELS['ocelot'];
  [MP_PZ, MP_PX, MP_NX, MP_NZ].forEach(face => {
    const r2 = MOB_UV_FACE(m.byName['body'], face);
    MOBSKIN_spots(t, r2.x, r2.y, r2.w, r2.h, Px.shade(base[0], 0.45), r + 5, 5);
  });
  const face = MOBSKIN_faceRect('ocelot', 'head');
  if (face) {
    MOBSKIN_eyes(t, face, { pupilCol: [20, 15, 5], scleraCol: [80, 160, 30, 255], eyeY: 1, separation: 1, size: 1 });
    MOBSKIN_spots(t, face.x, face.y, face.w, face.h, Px.shade(base[0], 0.4), r + 8, 2);
  }
}

function MOBSKIN_paintWolf(t, r) {
  const base = Px.ramp('#888880', 5, 0.65, 1.3);
  MOBSKIN_paintModel(t, 'wolf', base, r);
  // belly/chest lighter
  const m = MODELS['wolf'];
  const bodyF = MOB_UV_FACE(m.byName['body'], MP_PY);
  MOBSKIN_furNoise(t, bodyF.x, bodyF.y, bodyF.w, bodyF.h, Px.ramp('#c0bab2', 4, 0.82, 1.12), r + 10);
  const face = MOBSKIN_faceRect('wolf', 'head');
  if (face) {
    MOBSKIN_eyes(t, face, { pupilCol: [20, 15, 10], eyeY: 1, separation: 1 });
  }
  // snout lighter
  const snout = MODELS['wolf'].byName['snout'];
  if (snout) {
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(snout, face);
      MOBSKIN_furNoise(t, r2.x, r2.y, r2.w, r2.h, Px.ramp('#b8b0a8', 4, 0.8, 1.1), r + 15);
    });
    const snoutF = MOB_UV_FACE(snout, MP_PZ);
    MOBSKIN_nostrils(t, snoutF, { col: [40, 35, 30], y: Math.floor(snoutF.h * 0.5) });
    MOBSKIN_mouth(t, snoutF, { col: [50, 40, 30], y: Math.floor(snoutF.h * 0.7), w: 3 });
  }
}

function MOBSKIN_paintParrot(t, r, variant) {
  const palettes = [
    { body: '#d03020', accent: '#2030c8', beak: '#d4b830' }, // red/blue
    { body: '#2040c8', accent: '#30b030', beak: '#d4b830' }, // blue/green
    { body: '#30a030', accent: '#c83020', beak: '#d4b830' }, // green/red
    { body: '#10a8a8', accent: '#c87030', beak: '#d4b830' }, // cyan/orange
    { body: '#808898', accent: '#c0c0c8', beak: '#c4a828' }, // grey
  ];
  const p = palettes[variant % 5];
  const mainPal = Px.ramp(p.body, 5, 0.65, 1.3);
  const accentPal = Px.ramp(p.accent, 4, 0.7, 1.25);
  MOBSKIN_paintModel(t, 'parrot', mainPal, r);
  // head accent colour
  const m = MODELS['parrot'];
  [MP_PX, MP_NX, MP_PZ, MP_NZ].forEach(face => {
    const r2 = MOB_UV_FACE(m.byName['head'], face);
    MOBSKIN_furNoise(t, r2.x, r2.y, r2.w, r2.h, accentPal, r + 5);
  });
  // wing accent
  [MP_PX, MP_NX].forEach(face => {
    const r2 = MOB_UV_FACE(m.byName['wing_r'], face);
    MOBSKIN_furNoise(t, r2.x, r2.y, r2.w, r2.h, accentPal, r + 8);
  });
  const face = MOBSKIN_faceRect('parrot', 'head');
  if (face) {
    MOBSKIN_eyes(t, face, { scleraCol: [240, 200, 50, 255], pupilCol: [10, 10, 10], eyeY: 1, separation: 1, size: 1 });
  }
  // beak
  const beak = m.byName['beak'];
  if (beak) {
    const beakPal = Px.ramp(p.beak, 3, 0.75, 1.2);
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(beak, face);
      MOBSKIN_furNoise(t, r2.x, r2.y, r2.w, r2.h, beakPal, r + 12);
    });
  }
}

function MOBSKIN_paintFox(t, r, variant) {
  const pal = variant === 0 ? Px.ramp('#d05020', 5, 0.65, 1.3) : Px.ramp('#e8e4e0', 5, 0.8, 1.15);
  MOBSKIN_paintModel(t, 'fox', pal, r);
  // white belly/tail tip
  const tipCol = [240, 238, 235, 255];
  const m = MODELS['fox'];
  const bodyBottom = MOB_UV_FACE(m.byName['body'], MP_NY);
  MOBSKIN_furNoise(t, bodyBottom.x, bodyBottom.y, bodyBottom.w, bodyBottom.h, Px.ramp('#e8e4e0', 4, 0.85, 1.1), r + 5);
  const face = MOBSKIN_faceRect('fox', 'head');
  if (face) {
    MOBSKIN_eyes(t, face, { pupilCol: [20, 15, 5], eyeY: 1, separation: 2, size: 1 });
    MOBSKIN_nostrils(t, face, { col: [60, 40, 30] });
  }
  // dark ear tips
  ['ear_r', 'ear_l'].forEach(en => {
    const ear = m.byName[en];
    if (!ear) return;
    const r2 = MOB_UV_FACE(ear, MP_PZ);
    const darkPal = variant === 0 ? Px.ramp('#1a1010', 3, 0.5, 1.0) : Px.ramp('#888880', 3, 0.7, 1.1);
    MOBSKIN_furNoise(t, r2.x, r2.y, r2.w, r2.h, darkPal, r + 10);
  });
}

function MOBSKIN_paintBee(t, r) {
  const bodyPal = Px.ramp('#c8a030', 5, 0.65, 1.3);
  MOBSKIN_paintModel(t, 'bee', bodyPal, r);
  // dark stripes on body
  const m = MODELS['bee'];
  [MP_PX, MP_NX, MP_PZ, MP_NZ].forEach(face => {
    const r2 = MOB_UV_FACE(m.byName['body'], face);
    MOBSKIN_stripes(t, r2.x, r2.y, r2.w, r2.h, [40, 30, 10, 255], r + 5, 2, false);
  });
  const face = MOBSKIN_faceRect('bee', 'head');
  if (face) {
    MOBSKIN_eyes(t, face, { pupilCol: [20, 15, 5], eyeY: 1, separation: 1, size: 1 });
    // antennae dots
    Px.setPx(t, face.x + 1, face.y, [50, 40, 20, 255]);
    Px.setPx(t, face.x + face.w - 2, face.y, [50, 40, 20, 255]);
  }
  // wings semi-transparent blue tint
  ['wing_r', 'wing_l'].forEach(wn => {
    const wing = m.byName[wn];
    if (!wing) return;
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(wing, face);
      for (let y = r2.y; y < r2.y + r2.h; y++)
        for (let x = r2.x; x < r2.x + r2.w; x++)
          Px.setPx(t, x, y, [200, 220, 255, 180]);
    });
  });
}

function MOBSKIN_paintTurtle(t, r) {
  const shellPal = Px.ramp('#4a7030', 5, 0.6, 1.3);
  const skinPal = Px.ramp('#70b060', 4, 0.72, 1.2);
  MOBSKIN_paintModel(t, 'turtle', shellPal, r);
  // head + flippers skin green
  const m = MODELS['turtle'];
  ['head', 'leg_fr', 'leg_fl', 'leg_br', 'leg_bl'].forEach(pn => {
    const p = m.byName[pn];
    if (!p) return;
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(p, face);
      MOBSKIN_furNoise(t, r2.x, r2.y, r2.w, r2.h, skinPal, r + 5);
    });
  });
  const face = MOBSKIN_faceRect('turtle', 'head');
  if (face) {
    MOBSKIN_eyes(t, face, { pupilCol: [20, 30, 10], eyeY: 1, separation: 1, size: 1 });
  }
  // shell pattern hexagons (simple dark cells)
  const top = MOB_UV_FACE(m.byName['body'], MP_PY);
  for (let y = top.y; y < top.y + top.h; y++) {
    for (let x = top.x; x < top.x + top.w; x++) {
      const cell = Math.floor((x - top.x) / 4) + Math.floor((y - top.y) / 4);
      if (cell % 2 === 0 && (x - top.x) % 4 === 2 && (y - top.y) % 4 === 2) {
        Px.setPx(t, x, y, Px.shade(shellPal[0], 0.55));
      }
    }
  }
}

function MOBSKIN_paintGoat(t, r) {
  const base = Px.ramp('#c8c0b0', 5, 0.72, 1.2);
  MOBSKIN_paintModel(t, 'goat', base, r);
  const face = MOBSKIN_faceRect('goat', 'head');
  if (face) {
    MOBSKIN_eyes(t, face, { pupilCol: [50, 35, 15], eyeY: 2, separation: 2 });
    MOBSKIN_nostrils(t, face, { col: [80, 60, 40] });
  }
  // horns grey
  ['horn_r', 'horn_l'].forEach(hn => {
    const horn = MODELS['goat'].byName[hn];
    if (!horn) return;
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(horn, face);
      MOBSKIN_furNoise(t, r2.x, r2.y, r2.w, r2.h, Px.ramp('#a8a090', 3, 0.7, 1.2), r + 5);
    });
  });
}

function MOBSKIN_paintSniffer(t, r) {
  const base = Px.ramp('#5a3820', 5, 0.6, 1.35);
  MOBSKIN_paintModel(t, 'sniffer', base, r);
  const face = MOBSKIN_faceRect('sniffer', 'head');
  if (face) {
    MOBSKIN_eyes(t, face, { pupilCol: [20, 15, 5], eyeY: 2, separation: 2 });
  }
  // snout darker with bumps
  const snout = MODELS['sniffer'].byName['snout'];
  if (snout) {
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(snout, face);
      MOBSKIN_furNoise(t, r2.x, r2.y, r2.w, r2.h, Px.ramp('#3a2410', 4, 0.55, 1.2), r + 10);
    });
    const snoutF = MOB_UV_FACE(snout, MP_PZ);
    MOBSKIN_nostrils(t, snoutF, { col: [20, 10, 5], y: Math.floor(snoutF.h * 0.5) });
  }
}

function MOBSKIN_paintCamel(t, r) {
  const base = Px.ramp('#c8a050', 5, 0.68, 1.25);
  MOBSKIN_paintModel(t, 'camel', base, r);
  const face = MOBSKIN_faceRect('camel', 'head');
  if (face) {
    MOBSKIN_eyes(t, face, { pupilCol: [30, 20, 8], eyeY: 2, separation: 2 });
    MOBSKIN_nostrils(t, face, { col: [90, 60, 30] });
  }
}

function MOBSKIN_paintArmadillo(t, r) {
  const shell = Px.ramp('#8a6030', 5, 0.6, 1.35);
  const skin = Px.ramp('#b08050', 4, 0.72, 1.2);
  MOBSKIN_paintModel(t, 'armadillo', shell, r);
  const face = MOBSKIN_faceRect('armadillo', 'head');
  if (face) {
    MOBSKIN_furNoise(t, face.x, face.y, face.w, face.h, skin, r + 5);
    MOBSKIN_eyes(t, face, { pupilCol: [30, 20, 8], eyeY: 1, separation: 1, size: 1 });
  }
  // scale lines on body top
  const m = MODELS['armadillo'];
  const bodyTop = MOB_UV_FACE(m.byName['body'], MP_PY);
  for (let y = bodyTop.y; y < bodyTop.y + bodyTop.h; y++) {
    Px.setPx(t, bodyTop.x + 2, y, Px.shade(shell[0], 0.55), 0.6);
    Px.setPx(t, bodyTop.x + 5, y, Px.shade(shell[0], 0.55), 0.6);
    Px.setPx(t, bodyTop.x + 8, y, Px.shade(shell[0], 0.55), 0.6);
  }
}

function MOBSKIN_paintBat(t, r) {
  const base = Px.ramp('#3a3028', 5, 0.55, 1.4);
  MOBSKIN_paintModel(t, 'bat', base, r);
  const face = MOBSKIN_faceRect('bat', 'head');
  if (face) {
    MOBSKIN_eyes(t, face, { scleraCol: [200, 50, 50, 255], pupilCol: [10, 5, 5], eyeY: 1, separation: 1, size: 1 });
  }
  // ears pink inside
  ['ear_r', 'ear_l'].forEach(en => {
    const ear = MODELS['bat'].byName[en];
    if (!ear) return;
    const r2 = MOB_UV_FACE(ear, MP_PZ);
    MOBSKIN_furNoise(t, r2.x, r2.y, r2.w, r2.h, Px.ramp('#c07080', 3, 0.8, 1.1), r + 10);
  });
}

function MOBSKIN_paintAllay(t, r) {
  const base = Px.ramp('#a0d8f0', 5, 0.75, 1.2);
  MOBSKIN_paintModel(t, 'allay', base, r);
  const face = MOBSKIN_faceRect('allay', 'head');
  if (face) {
    MOBSKIN_eyes(t, face, { scleraCol: [80, 160, 220, 255], pupilCol: [10, 20, 40], eyeY: 2, separation: 1, size: 1 });
  }
  // wings translucent blue-white
  ['wing_r', 'wing_l'].forEach(wn => {
    const wing = MODELS['allay'].byName[wn];
    if (!wing) return;
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(wing, face);
      for (let y = r2.y; y < r2.y + r2.h; y++)
        for (let x = r2.x; x < r2.x + r2.w; x++)
          Px.setPx(t, x, y, [180, 220, 255, 200]);
    });
  });
}

function MOBSKIN_paintStrider(t, r) {
  const base = Px.ramp('#b83828', 5, 0.6, 1.35);
  MOBSKIN_paintModel(t, 'strider', base, r);
  const face = MOBSKIN_faceRect('strider', 'head');
  if (face) {
    MOBSKIN_eyes(t, face, { scleraCol: [200, 60, 40, 255], pupilCol: [20, 5, 5], eyeY: 2, separation: 2 });
  }
  // wart bumps on body
  const m = MODELS['strider'];
  [MP_PZ, MP_PX, MP_NX].forEach(face => {
    const r2 = MOB_UV_FACE(m.byName['body'], face);
    MOBSKIN_spots(t, r2.x, r2.y, r2.w, r2.h, Px.shade(base[0], 0.55), r + 8, 5);
  });
}

function MOBSKIN_paintVillager(t, r, variant) {
  const robeColors = [
    '#808070', // unemployed
    '#604020', // farmer
    '#1a3870', // librarian
    '#704818', // cleric
    '#708050', // fletcher
    '#788068', // armorer
    '#607858', // toolsmith
  ];
  const robePal = Px.ramp(robeColors[variant % 7], 5, 0.65, 1.3);
  const skinPal = Px.ramp('#c0a070', 5, 0.75, 1.2);
  MOBSKIN_paintModel(t, 'villager', skinPal, r);
  // paint robe over body
  const m = MODELS['villager'];
  ['body', 'robe', 'arm_r', 'arm_l'].forEach(pn => {
    const p = m.byName[pn];
    if (!p) return;
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(p, face);
      MOBSKIN_furNoise(t, r2.x, r2.y, r2.w, r2.h, robePal, r + 5);
    });
  });
  const face = MOBSKIN_faceRect('villager', 'head');
  if (face) {
    MOBSKIN_furNoise(t, face.x, face.y, face.w, face.h, skinPal, r + 2);
    MOBSKIN_eyes(t, face, { pupilCol: [30, 20, 10], eyeY: 2, separation: 2 });
    MOBSKIN_mouth(t, face, { col: [80, 50, 30], y: Math.floor(face.h * 0.65), w: 3 });
  }
  // nose brownish
  const nose = m.byName['nose'];
  if (nose) {
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(nose, face);
      MOBSKIN_furNoise(t, r2.x, r2.y, r2.w, r2.h, Px.ramp('#b07848', 3, 0.75, 1.15), r + 8);
    });
  }
}

function MOBSKIN_paintWanderingTrader(t, r) {
  const robePal = Px.ramp('#1a4898', 5, 0.65, 1.3);
  const skinPal = Px.ramp('#c0a070', 5, 0.75, 1.2);
  MOBSKIN_paintModel(t, 'wandering_trader', skinPal, r);
  const m = MODELS['wandering_trader'];
  ['body', 'robe', 'arm_r', 'arm_l'].forEach(pn => {
    const p = m.byName[pn];
    if (!p) return;
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(p, face);
      MOBSKIN_furNoise(t, r2.x, r2.y, r2.w, r2.h, robePal, r + 5);
    });
  });
  const face = MOBSKIN_faceRect('wandering_trader', 'head');
  if (face) {
    MOBSKIN_furNoise(t, face.x, face.y, face.w, face.h, skinPal, r + 2);
    MOBSKIN_eyes(t, face, { pupilCol: [30, 20, 10], eyeY: 2, separation: 2 });
  }
}

function MOBSKIN_paintCod(t, r) {
  const top = Px.ramp('#7a5828', 5, 0.65, 1.3);
  const belly = Px.ramp('#d8c8a0', 4, 0.8, 1.1);
  MOBSKIN_paintModel(t, 'cod', top, r);
  const m = MODELS['cod'];
  const bodyBot = MOB_UV_FACE(m.byName['body'], MP_NY);
  MOBSKIN_furNoise(t, bodyBot.x, bodyBot.y, bodyBot.w, bodyBot.h, belly, r + 5);
  const face = MOBSKIN_faceRect('cod', 'body');
  if (face) {
    const eyeX = face.x + Math.floor(face.w * 0.7);
    const eyeY = face.y + Math.floor(face.h * 0.35);
    Px.setPx(t, eyeX, eyeY, [200, 200, 200, 255]);
    Px.setPx(t, eyeX + 1, eyeY, [20, 20, 20, 255]);
  }
}

function MOBSKIN_paintSalmon(t, r) {
  const top = Px.ramp('#c04030', 5, 0.65, 1.3);
  const belly = Px.ramp('#e8c8a8', 4, 0.8, 1.1);
  MOBSKIN_paintModel(t, 'salmon', top, r);
  const m = MODELS['salmon'];
  const bodyBot = MOB_UV_FACE(m.byName['body'], MP_NY);
  MOBSKIN_furNoise(t, bodyBot.x, bodyBot.y, bodyBot.w, bodyBot.h, belly, r + 5);
  const face = MOBSKIN_faceRect('salmon', 'body');
  if (face) {
    const eyeX = face.x + Math.floor(face.w * 0.7);
    const eyeY = face.y + Math.floor(face.h * 0.35);
    Px.setPx(t, eyeX, eyeY, [200, 200, 200, 255]);
    Px.setPx(t, eyeX + 1, eyeY, [20, 20, 20, 255]);
  }
}

function MOBSKIN_paintTropicalFish(t, r, variant) {
  // 22 variants: body colour * pattern style
  const bodyColors = [
    '#f44020','#f09030','#e8e020','#40b030','#30a8d0','#4040c8',
    '#9030b0','#f0f0f0','#606060','#f090a0','#80c0e8','#c8a060',
  ];
  const patternColors = [
    '#c8b0f0','#404040','#f44020','#40b030','#30a8d0','#9030b0',
    '#d0a020','#d84080','#50c8a0','#8080f0','#e0c080',
  ];
  const bodyCol = bodyColors[variant % bodyColors.length];
  const patCol = patternColors[(Math.floor(variant / 3)) % patternColors.length];
  // Use a wide ramp to guarantee colour variety
  const bodyPal = Px.ramp(bodyCol, 5, 0.55, 1.45);
  MOBSKIN_paintModel(t, 'tropical_fish', bodyPal, r);
  // Add speckle to guarantee more unique colours
  Px.speckle(t, [Px.shade(Px.color(bodyCol), 0.4), Px.shade(Px.color(patCol), 1.2)], { density: 0.08, seed: r + 30 });
  // stripe pattern on body
  const m = MODELS['tropical_fish'];
  [MP_PZ, MP_NZ, MP_PX, MP_NX].forEach(face => {
    const r2 = MOB_UV_FACE(m.byName['body'], face);
    if (variant % 2 === 0) {
      MOBSKIN_stripes(t, r2.x, r2.y, r2.w, r2.h, Px.color(patCol), r + 5, 2, true);
    } else {
      MOBSKIN_spots(t, r2.x, r2.y, r2.w, r2.h, Px.color(patCol), r + 5, 3);
    }
  });
  const face = MOBSKIN_faceRect('tropical_fish', 'body');
  if (face) {
    const eyeX = face.x + Math.floor(face.w * 0.7);
    const eyeY = face.y + Math.floor(face.h * 0.35);
    Px.setPx(t, eyeX, eyeY, [220, 220, 220, 255]);
    Px.setPx(t, eyeX + 1, eyeY, [20, 20, 20, 255]);
  }
}

function MOBSKIN_paintPufferfish(t, r) {
  const base = Px.ramp('#d0a030', 5, 0.65, 1.3);
  MOBSKIN_paintModel(t, 'pufferfish', base, r);
  // spines dark dots on surface
  const m = MODELS['pufferfish'];
  [MP_PZ, MP_NZ, MP_PX, MP_NX, MP_PY].forEach(face => {
    const r2 = MOB_UV_FACE(m.byName['body'], face);
    MOBSKIN_spots(t, r2.x, r2.y, r2.w, r2.h, Px.shade(base[0], 0.45), r + 5, 8);
  });
  const face = MOBSKIN_faceRect('pufferfish', 'body');
  if (face) {
    MOBSKIN_eyes(t, face, { pupilCol: [15, 10, 5], eyeY: 2, separation: 2, size: 1 });
  }
}

function MOBSKIN_paintSquid(t, r) {
  const base = Px.ramp('#2a3868', 5, 0.6, 1.35);
  MOBSKIN_paintModel(t, 'squid', base, r);
  const m = MODELS['squid'];
  const bodyF = MOB_UV_FACE(m.byName['body'], MP_PZ);
  // large eye on body front
  MOBSKIN_eyes(t, bodyF, { scleraCol: [60, 80, 150, 255], pupilCol: [10, 10, 20], eyeY: 2, separation: 3 });
}

function MOBSKIN_paintGlowSquid(t, r) {
  const base = Px.ramp('#187878', 5, 0.6, 1.35);
  MOBSKIN_paintModel(t, 'glow_squid', base, r);
  const m = MODELS['glow_squid'];
  // emissive glow spots
  for (let ti = 0; ti < 8; ti++) {
    const tent = m.byName[`tentacle${ti}`];
    if (!tent) continue;
    [MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(tent, face);
      for (let y = r2.y; y < r2.y + r2.h; y += 2)
        Px.setPx(t, r2.x + 1, y, [80, 220, 200, 255]);
    });
  }
  const bodyF = MOB_UV_FACE(m.byName['body'], MP_PZ);
  MOBSKIN_eyes(t, bodyF, { scleraCol: [80, 200, 180, 255], pupilCol: [10, 30, 25], eyeY: 2, separation: 3 });
}

function MOBSKIN_paintAxolotl(t, r, variant) {
  const pals = [
    Px.ramp('#f090b8', 5, 0.68, 1.3),  // lucy (pink)
    Px.ramp('#a05830', 5, 0.65, 1.3),  // wild (brown)
    Px.ramp('#d4a832', 5, 0.7, 1.25),  // gold
    Px.ramp('#30a8a8', 5, 0.68, 1.28), // cyan
    Px.ramp('#3848c8', 5, 0.65, 1.3),  // blue
  ];
  const pal = pals[variant % 5];
  MOBSKIN_paintModel(t, 'axolotl', pal, r);
  const face = MOBSKIN_faceRect('axolotl', 'head');
  if (face) {
    MOBSKIN_eyes(t, face, { pupilCol: [20, 15, 5], eyeY: 1, separation: 2, size: 1 });
    MOBSKIN_mouth(t, face, { col: [80, 40, 40], y: Math.floor(face.h * 0.7), w: 3 });
  }
  // gills red/pink
  const gillPal = Px.ramp('#d04060', 4, 0.7, 1.2);
  const m = MODELS['axolotl'];
  ['gill_r0','gill_r1','gill_r2','gill_l0','gill_l1','gill_l2'].forEach(gn => {
    const g = m.byName[gn];
    if (!g) return;
    [MP_PX, MP_NX, MP_PY, MP_NY, MP_PZ, MP_NZ].forEach(face => {
      const r2 = MOB_UV_FACE(g, face);
      MOBSKIN_furNoise(t, r2.x, r2.y, r2.w, r2.h, gillPal, r + 10);
    });
  });
}

function MOBSKIN_paintFrog(t, r, variant) {
  const pals = [
    Px.ramp('#e0a060', 5, 0.68, 1.28), // orange (temperate)
    Px.ramp('#708050', 5, 0.65, 1.3),  // green (cold)
    Px.ramp('#d87050', 5, 0.68, 1.25), // white (warm)
  ];
  const pal = pals[variant % 3];
  MOBSKIN_paintModel(t, 'frog', pal, r);
  const face = MOBSKIN_faceRect('frog', 'head');
  if (face) {
    MOBSKIN_eyes(t, face, { scleraCol: [200, 180, 60, 255], pupilCol: [20, 15, 5],
      eyeY: 1, separation: 2, size: 1 });
    MOBSKIN_mouth(t, face, { col: [80, 50, 30], y: Math.floor(face.h * 0.7), w: 4 });
  }
}

function MOBSKIN_paintTadpole(t, r) {
  const base = Px.ramp('#304838', 5, 0.65, 1.3);
  MOBSKIN_paintModel(t, 'tadpole', base, r);
  const face = MOBSKIN_faceRect('tadpole', 'body');
  if (face) {
    const eyeX = face.x + Math.floor(face.w * 0.65);
    const eyeY = face.y + Math.floor(face.h * 0.35);
    Px.setPx(t, eyeX, eyeY, [200, 200, 200, 255]);
    Px.setPx(t, eyeX + 1, eyeY, [20, 20, 20, 255]);
  }
}

function MOBSKIN_paintDolphin(t, r) {
  const top = Px.ramp('#485868', 5, 0.65, 1.3);
  const belly = Px.ramp('#d8d0c8', 4, 0.82, 1.12);
  MOBSKIN_paintModel(t, 'dolphin', top, r);
  const m = MODELS['dolphin'];
  const bodyBot = MOB_UV_FACE(m.byName['body'], MP_NY);
  MOBSKIN_furNoise(t, bodyBot.x, bodyBot.y, bodyBot.w, bodyBot.h, belly, r + 5);
  const headBot = MOB_UV_FACE(m.byName['head'], MP_NY);
  MOBSKIN_furNoise(t, headBot.x, headBot.y, headBot.w, headBot.h, belly, r + 6);
  const face = MOBSKIN_faceRect('dolphin', 'head');
  if (face) {
    MOBSKIN_eyes(t, face, { pupilCol: [15, 12, 8], eyeY: 2, separation: 2, size: 1 });
    MOBSKIN_mouth(t, face, { col: [60, 50, 40], y: Math.floor(face.h * 0.7), w: 4 });
  }
}

// Paint functions continued are in MOB_SKIN_PAINTERS_2 (mobSkins2.js)

// ---- Export ---------------------------------------------------------------
export const MOB_SKIN_PAINTERS = Object.assign({
  pig(Px2, r, variant)            { const t = Px2.makeTile(64,64); MOBSKIN_paintPig(t, r); return t; },
  cow(Px2, r, variant)            { const t = Px2.makeTile(64,64); MOBSKIN_paintCow(t, r); return t; },
  mooshroom(Px2, r, variant)      { const t = Px2.makeTile(64,64); MOBSKIN_paintMooshroom(t, r); return t; },
  sheep(Px2, r, variant)          { const t = Px2.makeTile(64,64); MOBSKIN_paintSheep(t, r, variant); return t; },
  sheep_sheared(Px2, r, variant)  { const t = Px2.makeTile(64,64); MOBSKIN_paintSheepSheared(t, r); return t; },
  chicken(Px2, r, variant)        { const t = Px2.makeTile(64,64); MOBSKIN_paintChicken(t, r); return t; },
  rabbit(Px2, r, variant)         { const t = Px2.makeTile(64,64); MOBSKIN_paintRabbit(t, r, variant); return t; },
  horse(Px2, r, variant)          { const t = Px2.makeTile(64,64); MOBSKIN_paintHorse(t, r, variant); return t; },
  donkey(Px2, r, variant)         { const t = Px2.makeTile(64,64); MOBSKIN_paintDonkey(t, r); return t; },
  mule(Px2, r, variant)           { const t = Px2.makeTile(64,64); MOBSKIN_paintMule(t, r); return t; },
  llama(Px2, r, variant)          { const t = Px2.makeTile(64,64); MOBSKIN_paintLlama(t, r, variant); return t; },
  cat(Px2, r, variant)            { const t = Px2.makeTile(64,64); MOBSKIN_paintCat(t, r, variant); return t; },
  ocelot(Px2, r, variant)         { const t = Px2.makeTile(64,64); MOBSKIN_paintOcelot(t, r); return t; },
  wolf(Px2, r, variant)           { const t = Px2.makeTile(64,64); MOBSKIN_paintWolf(t, r); return t; },
  parrot(Px2, r, variant)         { const t = Px2.makeTile(64,64); MOBSKIN_paintParrot(t, r, variant); return t; },
  fox(Px2, r, variant)            { const t = Px2.makeTile(64,64); MOBSKIN_paintFox(t, r, variant); return t; },
  bee(Px2, r, variant)            { const t = Px2.makeTile(64,64); MOBSKIN_paintBee(t, r); return t; },
  turtle(Px2, r, variant)         { const t = Px2.makeTile(64,64); MOBSKIN_paintTurtle(t, r); return t; },
  goat(Px2, r, variant)           { const t = Px2.makeTile(64,64); MOBSKIN_paintGoat(t, r); return t; },
  sniffer(Px2, r, variant)        { const t = Px2.makeTile(64,64); MOBSKIN_paintSniffer(t, r); return t; },
  camel(Px2, r, variant)          { const t = Px2.makeTile(64,64); MOBSKIN_paintCamel(t, r); return t; },
  armadillo(Px2, r, variant)      { const t = Px2.makeTile(64,64); MOBSKIN_paintArmadillo(t, r); return t; },
  bat(Px2, r, variant)            { const t = Px2.makeTile(64,64); MOBSKIN_paintBat(t, r); return t; },
  allay(Px2, r, variant)          { const t = Px2.makeTile(64,64); MOBSKIN_paintAllay(t, r); return t; },
  strider(Px2, r, variant)        { const t = Px2.makeTile(64,64); MOBSKIN_paintStrider(t, r); return t; },
  villager(Px2, r, variant)       { const t = Px2.makeTile(64,64); MOBSKIN_paintVillager(t, r, variant); return t; },
  wandering_trader(Px2, r, variant){ const t = Px2.makeTile(64,64); MOBSKIN_paintWanderingTrader(t, r); return t; },
  cod(Px2, r, variant)            { const t = Px2.makeTile(64,64); MOBSKIN_paintCod(t, r); return t; },
  salmon(Px2, r, variant)         { const t = Px2.makeTile(64,64); MOBSKIN_paintSalmon(t, r); return t; },
  tropical_fish(Px2, r, variant)  { const t = Px2.makeTile(64,64); MOBSKIN_paintTropicalFish(t, r, variant); return t; },
  pufferfish(Px2, r, variant)     { const t = Px2.makeTile(64,64); MOBSKIN_paintPufferfish(t, r); return t; },
  squid(Px2, r, variant)          { const t = Px2.makeTile(64,64); MOBSKIN_paintSquid(t, r); return t; },
  glow_squid(Px2, r, variant)     { const t = Px2.makeTile(64,64); MOBSKIN_paintGlowSquid(t, r); return t; },
  axolotl(Px2, r, variant)        { const t = Px2.makeTile(64,64); MOBSKIN_paintAxolotl(t, r, variant); return t; },
  frog(Px2, r, variant)           { const t = Px2.makeTile(64,64); MOBSKIN_paintFrog(t, r, variant); return t; },
  tadpole(Px2, r, variant)        { const t = Px2.makeTile(64,64); MOBSKIN_paintTadpole(t, r); return t; },
  dolphin(Px2, r, variant)        { const t = Px2.makeTile(64,64); MOBSKIN_paintDolphin(t, r); return t; },
}, MOB_SKIN_PAINTERS_2);

export const MOB_SKIN_VARIANTS = {
  pig: 1, cow: 1, mooshroom: 1, sheep: 16, sheep_sheared: 1,
  chicken: 1, rabbit: 6, horse: 7, donkey: 1, mule: 1, llama: 4,
  cat: 11, ocelot: 1, wolf: 1, parrot: 5, fox: 2, bee: 1,
  turtle: 1, goat: 1, sniffer: 1, camel: 1, armadillo: 1, bat: 1,
  allay: 1, strider: 1, villager: 7, wandering_trader: 1,
  cod: 1, salmon: 1, tropical_fish: 22, pufferfish: 1,
  squid: 1, glow_squid: 1, axolotl: 5, frog: 3, tadpole: 1, dolphin: 1,
  iron_golem: 1, snow_golem: 1, panda: 7, polar_bear: 1,
  spider: 1, cave_spider: 1, enderman: 1,
  piglin: 1, piglin_brute: 1, hoglin: 1, zoglin: 1,
  zombie: 1, husk: 1, drowned: 1, zombie_villager: 1,
  skeleton: 1, stray: 1, bogged: 1, wither_skeleton: 1,
  creeper: 1, charged_creeper: 1, slime: 1, magma_cube: 1,
  silverfish: 1, endermite: 1, witch: 1,
  pillager: 1, vindicator: 1, evoker: 1, illusioner: 1,
  vex: 1, ravager: 1, guardian: 1, elder_guardian: 1,
  shulker: 1, blaze: 1, ghast: 1, phantom: 1,
  warden: 1, ender_dragon: 1, wither: 1, player: 1,
};
