// ---------------------------------------------------------------------------
// Entity model rig.
//
// A model is an ordered list of boxes ("parts") measured in MODEL PIXELS where
// 16 px = 1 block. Each part carries a pivot (joint position, model px, relative
// to the entity origin at the feet centre) and an offset (box corner relative to
// the pivot). The animator rotates parts around their pivots.
//
// UV: every part declares its top-left position on a 64x64 skin sheet. The box
// is unwrapped in the standard Minecraft cross layout:
//
//        u        u+d      u+d+w    u+d+w+d
//   v    +--------+--------+--------+--------+
//        |        |  top   | bottom |        |   height d
//   v+d  +--------+--------+--------+--------+
//        | right  | front  |  left  | back   |   height h
//   v+d+h+--------+--------+--------+--------+
//
// Skin painters use MOB_UV_FACE(part, face) to get the exact rect to paint.
// ---------------------------------------------------------------------------

export const MODEL_PX = 16;          // model pixels per block
export const MOB_SKIN_W = 64;
export const MOB_SKIN_H = 64;

/** Face indices, matching the global convention: +X -X +Y -Y +Z -Z */
export const MP_PX = 0, MP_NX = 1, MP_PY = 2, MP_NY = 3, MP_PZ = 4, MP_NZ = 5;

/**
 * Define one box part.
 * @param {string} name
 * @param {{size:number[], pivot:number[], offset?:number[], uv:number[],
 *          mirror?:boolean, inflate?:number, hidden?:boolean,
 *          rotation?:number[], noShade?:boolean, emissive?:boolean}} o
 */
export function part(name, o) {
  const size = o.size;
  return {
    name,
    size,
    pivot: o.pivot || [0, 0, 0],
    offset: o.offset || [-size[0] / 2, 0, -size[2] / 2],
    uv: o.uv,
    mirror: !!o.mirror,
    inflate: o.inflate || 0,
    hidden: !!o.hidden,
    rotation: o.rotation || null,   // baked static rotation [rx,ry,rz] radians
    noShade: !!o.noShade,
    emissive: !!o.emissive,
    parent: o.parent || null,        // name of parent part for hierarchical rigs
  };
}

/**
 * Rect on the skin sheet for one face of one part, in pixels.
 * @returns {{x:number,y:number,w:number,h:number}}
 */
export function MOB_UV_FACE(p, face) {
  const [w, h, d] = p.size;
  const [u, v] = p.uv;
  switch (face) {
    case MP_PY: return { x: u + d, y: v, w, h: d };              // top
    case MP_NY: return { x: u + d + w, y: v, w, h: d };          // bottom
    case MP_PX: return { x: u, y: v + d, w: d, h };              // right (+X)
    case MP_PZ: return { x: u + d, y: v + d, w, h };             // front (+Z)
    case MP_NX: return { x: u + d + w, y: v + d, w: d, h };      // left (-X)
    default: return { x: u + d + w + d, y: v + d, w, h };        // back (-Z)
  }
}

/** Total sheet footprint of a part, for layout validation. */
export function MOB_UV_EXTENT(p) {
  const [w, h, d] = p.size;
  return { x: p.uv[0], y: p.uv[1], w: 2 * (w + d), h: d + h };
}

export const MODELS = {};

/**
 * Register a model.
 * @param {string} name
 * @param {{parts:any[], scale?:number, eyeHeight?:number, shadowRadius?:number,
 *          rig?:string, babyHeadScale?:number}} o
 */
export function defineModel(name, o) {
  const m = {
    name,
    parts: o.parts,
    scale: o.scale || 1,
    eyeHeight: o.eyeHeight !== undefined ? o.eyeHeight : 1,
    shadowRadius: o.shadowRadius || 0.4,
    rig: o.rig || 'quadruped',
    babyHeadScale: o.babyHeadScale || 1.6,
    byName: {},
    // Part groups the animator looks for; filled below.
    legs: [], arms: [], wings: [], tails: [], heads: [], bodies: [],
  };
  for (const p of o.parts) m.byName[p.name] = p;
  for (const p of o.parts) {
    const n = p.name;
    if (/^leg/.test(n) || /_leg$/.test(n) || /^foot/.test(n)) m.legs.push(n);
    else if (/^arm/.test(n) || /_arm$/.test(n)) m.arms.push(n);
    else if (/wing/.test(n)) m.wings.push(n);
    else if (/tail|fin_back/.test(n)) m.tails.push(n);
    else if (/^head|_head$|^snout|^beak|^jaw|^ear|^horn|^antenna|^nose/.test(n)) m.heads.push(n);
    else if (/^body|^torso|^chest/.test(n)) m.bodies.push(n);
  }
  MODELS[name] = m;
  return m;
}

/** Convenience: a symmetric 4-leg quadruped body plan. */
export function quadrupedParts(o) {
  const {
    bodyW = 8, bodyH = 8, bodyD = 16, bodyY = 12,
    headW = 8, headH = 8, headD = 8, headY = 16, headZ = 8,
    legW = 4, legH = 12, legD = 4, legSpreadX = 2, legZFront = 5, legZBack = -5,
    bodyUV = [16, 16], headUV = [0, 0], legUV = [0, 16], tail = null,
  } = o;
  const parts = [
    part('body', {
      size: [bodyW, bodyH, bodyD], pivot: [0, bodyY, 0],
      offset: [-bodyW / 2, -bodyH / 2, -bodyD / 2], uv: bodyUV,
      rotation: o.bodyRot || null,
    }),
    part('head', {
      size: [headW, headH, headD], pivot: [0, headY, headZ],
      offset: [-headW / 2, -headH / 2, 0], uv: headUV,
    }),
    part('leg_fr', { size: [legW, legH, legD], pivot: [legSpreadX + legW / 2, legH, legZFront], offset: [-legW / 2, -legH, -legD / 2], uv: legUV }),
    part('leg_fl', { size: [legW, legH, legD], pivot: [-(legSpreadX + legW / 2), legH, legZFront], offset: [-legW / 2, -legH, -legD / 2], uv: legUV, mirror: true }),
    part('leg_br', { size: [legW, legH, legD], pivot: [legSpreadX + legW / 2, legH, legZBack], offset: [-legW / 2, -legH, -legD / 2], uv: legUV }),
    part('leg_bl', { size: [legW, legH, legD], pivot: [-(legSpreadX + legW / 2), legH, legZBack], offset: [-legW / 2, -legH, -legD / 2], uv: legUV, mirror: true }),
  ];
  if (tail) {
    parts.push(part('tail', {
      size: tail.size, pivot: tail.pivot, offset: tail.offset || [-tail.size[0] / 2, -tail.size[1], -tail.size[2]],
      uv: tail.uv, rotation: tail.rotation || null,
    }));
  }
  return parts;
}

/** Convenience: humanoid body plan (zombie/skeleton/villager/player-likes). */
export function bipedParts(o = {}) {
  const {
    headUV = [0, 0], bodyUV = [16, 16], armUV = [40, 16], legUV = [0, 16],
    armW = 4, armH = 12, armD = 4, legW = 4, legH = 12, legD = 4,
    bodyW = 8, bodyH = 12, bodyD = 4, slim = false,
  } = o;
  const aw = slim ? 3 : armW;
  return [
    part('body', { size: [bodyW, bodyH, bodyD], pivot: [0, legH + bodyH, 0], offset: [-bodyW / 2, -bodyH, -bodyD / 2], uv: bodyUV }),
    part('head', { size: [8, 8, 8], pivot: [0, legH + bodyH, 0], offset: [-4, 0, -4], uv: headUV }),
    part('arm_r', { size: [aw, armH, armD], pivot: [bodyW / 2 + aw / 2, legH + bodyH - 2, 0], offset: [-aw / 2, -armH, -armD / 2], uv: armUV }),
    part('arm_l', { size: [aw, armH, armD], pivot: [-(bodyW / 2 + aw / 2), legH + bodyH - 2, 0], offset: [-aw / 2, -armH, -armD / 2], uv: armUV, mirror: true }),
    part('leg_r', { size: [legW, legH, legD], pivot: [legW / 2 + 0.1, legH, 0], offset: [-legW / 2, -legH, -legD / 2], uv: legUV }),
    part('leg_l', { size: [legW, legH, legD], pivot: [-(legW / 2 + 0.1), legH, 0], offset: [-legW / 2, -legH, -legD / 2], uv: legUV, mirror: true }),
  ];
}

/** Total triangle-quad count of a model, for the debug overlay. */
export function modelQuadCount(m) { return m.parts.length * 6; }
