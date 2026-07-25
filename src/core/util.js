// Small math / container helpers used everywhere. No dependencies.

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function invLerp(a, b, v) { return b === a ? 0 : (v - a) / (b - a); }
export function smoothstep(t) { t = clamp01(t); return t * t * (3 - 2 * t); }
export function smootherstep(t) { t = clamp01(t); return t * t * t * (t * (t * 6 - 15) + 10); }
export function sign(v) { return v < 0 ? -1 : v > 0 ? 1 : 0; }
export function mod(a, n) { return ((a % n) + n) % n; }
export function floorDiv(a, n) { return Math.floor(a / n); }
export function dist2(dx, dy, dz) { return dx * dx + dy * dy + dz * dz; }
export function dist(dx, dy, dz) { return Math.sqrt(dx * dx + dy * dy + dz * dz); }

/** Shortest signed angular difference b-a, in radians, wrapped to [-PI,PI]. */
export function angleDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
/** Move angle a toward b by at most maxStep. */
export function approachAngle(a, b, maxStep) {
  const d = angleDiff(a, b);
  return a + clamp(d, -maxStep, maxStep);
}
export function approach(a, b, maxStep) {
  const d = b - a;
  return a + clamp(d, -maxStep, maxStep);
}

/** Axis-aligned bounding box as a plain object. */
export function aabb(minX, minY, minZ, maxX, maxY, maxZ) {
  return { minX, minY, minZ, maxX, maxY, maxZ };
}
export function aabbFromCenter(cx, cy, cz, w, h, d) {
  const hw = w * 0.5, hd = (d === undefined ? w : d) * 0.5;
  return { minX: cx - hw, minY: cy, minZ: cz - hd, maxX: cx + hw, maxY: cy + h, maxZ: cz + hd };
}
export function aabbOverlap(a, b) {
  return a.minX < b.maxX && a.maxX > b.minX &&
    a.minY < b.maxY && a.maxY > b.minY &&
    a.minZ < b.maxZ && a.maxZ > b.minZ;
}
export function aabbOffset(a, dx, dy, dz) {
  return { minX: a.minX + dx, minY: a.minY + dy, minZ: a.minZ + dz, maxX: a.maxX + dx, maxY: a.maxY + dy, maxZ: a.maxZ + dz };
}
export function aabbExpand(a, dx, dy, dz) {
  return {
    minX: a.minX - dx, minY: a.minY - dy, minZ: a.minZ - dz,
    maxX: a.maxX + dx, maxY: a.maxY + dy, maxZ: a.maxZ + dz,
  };
}

/** Ray vs AABB slab test. Returns t of entry or -1. */
export function rayAabb(ox, oy, oz, dx, dy, dz, box) {
  let tmin = 0, tmax = Infinity;
  const o = [ox, oy, oz], d = [dx, dy, dz];
  const lo = [box.minX, box.minY, box.minZ], hi = [box.maxX, box.maxY, box.maxZ];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < lo[i] || o[i] > hi[i]) return -1;
    } else {
      const inv = 1 / d[i];
      let t1 = (lo[i] - o[i]) * inv, t2 = (hi[i] - o[i]) * inv;
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return -1;
    }
  }
  return tmin;
}

/** Generic free-list object pool. */
export class Pool {
  constructor(factory, reset, initial = 0) {
    this.factory = factory;
    this.reset = reset;
    this.free = [];
    for (let i = 0; i < initial; i++) this.free.push(factory());
  }
  get() {
    const o = this.free.length ? this.free.pop() : this.factory();
    return o;
  }
  put(o) {
    if (this.reset) this.reset(o);
    if (this.free.length < 4096) this.free.push(o);
  }
}

/** Minimal binary heap for A*. */
export class MinHeap {
  constructor(scoreOf) { this.items = []; this.scoreOf = scoreOf; }
  get size() { return this.items.length; }
  clear() { this.items.length = 0; }
  push(item) {
    const a = this.items;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.scoreOf(a[i]) < this.scoreOf(a[p])) { const t = a[i]; a[i] = a[p]; a[p] = t; i = p; }
      else break;
    }
  }
  pop() {
    const a = this.items;
    if (a.length === 0) return undefined;
    const top = a[0];
    const last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.scoreOf(a[l]) < this.scoreOf(a[m])) m = l;
        if (r < a.length && this.scoreOf(a[r]) < this.scoreOf(a[m])) m = r;
        if (m === i) break;
        const t = a[i]; a[i] = a[m]; a[m] = t; i = m;
      }
    }
    return top;
  }
}

/** Pack/unpack small integer coordinates into a single number key. */
export function key2(x, z) { return (x & 0xffff) * 65536 + (z & 0xffff); }
export function key3(x, y, z) { return ((x & 0x3ff) * 1024 + (y & 0x3ff)) * 1024 + (z & 0x3ff); }

/** Format a float for debug display. */
export function fmt(v, n = 2) { return (Math.round(v * 10 ** n) / 10 ** n).toFixed(n); }

/** Rotate a horizontal vector by yaw (radians). */
export function rotY(x, z, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return [x * c - z * s, x * s + z * c];
}

/** Six cardinal directions: +X,-X,+Y,-Y,+Z,-Z */
export const DIRS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];
export const FACE_PX = 0, FACE_NX = 1, FACE_PY = 2, FACE_NY = 3, FACE_PZ = 4, FACE_NZ = 5;

/** Horizontal neighbours only. */
export const HDIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const HDIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

/** Cardinal facing index from yaw: 0=south(+Z),1=west(-X),2=north(-Z),3=east(+X) */
export function yawToFacing(yaw) {
  return (Math.round(yaw / (Math.PI / 2)) & 3);
}
export const FACING_VEC = [[0, 1], [-1, 0], [0, -1], [1, 0]];
