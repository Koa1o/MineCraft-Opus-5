// ---------------------------------------------------------------------------
// Minimal stub of the three.js API surface for Node-based verification.
// All geometry math (Vector3, Matrix4, Quaternion, Euler) is numerically
// correct. Graphics-only objects are inert property bags.
// ---------------------------------------------------------------------------

export const __isStub = true;

// ---------------------------------------------------------------------------
// MathUtils
// ---------------------------------------------------------------------------
export const MathUtils = {
  clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; },
  lerp(a, b, t) { return a + (b - a) * t; },
  degToRad(d) { return d * (Math.PI / 180); },
  radToDeg(r) { return r * (180 / Math.PI); },
  randFloat(lo, hi) { return lo + Math.random() * (hi - lo); },
  randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); },
  euclideanModulo(n, m) { return ((n % m) + m) % m; },
  smoothstep(x, min, max) {
    const t = Math.max(0, Math.min(1, (x - min) / (max - min)));
    return t * t * (3 - 2 * t);
  },
  mapLinear(x, a1, a2, b1, b2) { return b1 + (b2 - b1) * ((x - a1) / (a2 - a1)); },
  seededRandom(seed) {
    // simple xorshift-based seeded random
    let s = seed === undefined ? Math.floor(Math.random() * 2 ** 32) : (seed | 0);
    s = (s ^ (s >>> 16)) * 0x45d9f3b | 0;
    s = (s ^ (s >>> 16)) * 0x45d9f3b | 0;
    s = s ^ (s >>> 16);
    return (s >>> 0) / 0x100000000;
  },
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const NearestFilter = 1003;
export const LinearFilter = 1006;
export const NearestMipmapNearestFilter = 1004;
export const NearestMipmapLinearFilter = 1005;
export const LinearMipmapLinearFilter = 1008;
export const RepeatWrapping = 1000;
export const ClampToEdgeWrapping = 1001;
export const MirroredRepeatWrapping = 1002;
export const RGBAFormat = 1023;
export const RGBFormat = 1022;
export const UnsignedByteType = 1009;
export const FloatType = 1015;
export const DoubleSide = 2;
export const FrontSide = 0;
export const BackSide = 1;
export const AdditiveBlending = 2;
export const NormalBlending = 1;
export const CustomBlending = 5;
export const NoBlending = 0;
export const SrcAlphaFactor = 204;
export const OneMinusSrcAlphaFactor = 205;
export const SRGBColorSpace = 'srgb';
export const LinearSRGBColorSpace = 'srgb-linear';
export const NoColorSpace = '';
export const StaticDrawUsage = 35044;
export const DynamicDrawUsage = 35048;
export const TrianglesDrawMode = 0;
export const LessEqualDepth = 3;
export const AlwaysDepth = 7;

// ---------------------------------------------------------------------------
// Vector2
// ---------------------------------------------------------------------------
export class Vector2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  set(x, y) { this.x = x; this.y = y; return this; }
  copy(v) { this.x = v.x; this.y = v.y; return this; }
  clone() { return new Vector2(this.x, this.y); }
  add(v) { this.x += v.x; this.y += v.y; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; return this; }
  length() { return Math.sqrt(this.x * this.x + this.y * this.y); }
  lengthSq() { return this.x * this.x + this.y * this.y; }
  normalize() { const l = this.length() || 1; return this.multiplyScalar(1 / l); }
  dot(v) { return this.x * v.x + this.y * v.y; }
  distanceTo(v) { const dx = this.x - v.x, dy = this.y - v.y; return Math.sqrt(dx * dx + dy * dy); }
  distanceToSquared(v) { const dx = this.x - v.x, dy = this.y - v.y; return dx * dx + dy * dy; }
  lerp(v, t) { this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; return this; }
  negate() { this.x = -this.x; this.y = -this.y; return this; }
  equals(v) { return this.x === v.x && this.y === v.y; }
  toArray(a = [], offset = 0) { a[offset] = this.x; a[offset + 1] = this.y; return a; }
  fromArray(a, offset = 0) { this.x = a[offset]; this.y = a[offset + 1]; return this; }
  setScalar(s) { this.x = s; this.y = s; return this; }
  min(v) { this.x = Math.min(this.x, v.x); this.y = Math.min(this.y, v.y); return this; }
  max(v) { this.x = Math.max(this.x, v.x); this.y = Math.max(this.y, v.y); return this; }
  floor() { this.x = Math.floor(this.x); this.y = Math.floor(this.y); return this; }
  round() { this.x = Math.round(this.x); this.y = Math.round(this.y); return this; }
}

// ---------------------------------------------------------------------------
// Vector3
// ---------------------------------------------------------------------------
export class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  setScalar(s) { this.x = s; this.y = s; this.z = s; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  length() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
  lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
  normalize() { const l = this.length() || 1; return this.multiplyScalar(1 / l); }
  negate() { this.x = -this.x; this.y = -this.y; this.z = -this.z; return this; }
  dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
  cross(v) {
    const ax = this.x, ay = this.y, az = this.z;
    this.x = ay * v.z - az * v.y;
    this.y = az * v.x - ax * v.z;
    this.z = ax * v.y - ay * v.x;
    return this;
  }
  crossVectors(a, b) {
    this.x = a.y * b.z - a.z * b.y;
    this.y = a.z * b.x - a.x * b.z;
    this.z = a.x * b.y - a.y * b.x;
    return this;
  }
  distanceTo(v) {
    const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  distanceToSquared(v) {
    const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z;
    return dx * dx + dy * dy + dz * dz;
  }
  lerp(v, t) {
    this.x += (v.x - this.x) * t;
    this.y += (v.y - this.y) * t;
    this.z += (v.z - this.z) * t;
    return this;
  }
  equals(v) { return this.x === v.x && this.y === v.y && this.z === v.z; }
  toArray(a = [], offset = 0) { a[offset] = this.x; a[offset + 1] = this.y; a[offset + 2] = this.z; return a; }
  fromArray(a, offset = 0) { this.x = a[offset]; this.y = a[offset + 1]; this.z = a[offset + 2]; return this; }
  min(v) { this.x = Math.min(this.x, v.x); this.y = Math.min(this.y, v.y); this.z = Math.min(this.z, v.z); return this; }
  max(v) { this.x = Math.max(this.x, v.x); this.y = Math.max(this.y, v.y); this.z = Math.max(this.z, v.z); return this; }
  floor() { this.x = Math.floor(this.x); this.y = Math.floor(this.y); this.z = Math.floor(this.z); return this; }
  round() { this.x = Math.round(this.x); this.y = Math.round(this.y); this.z = Math.round(this.z); return this; }

  // Apply a 4x4 column-major Matrix4 to this point (w=1).
  applyMatrix4(m) {
    const e = m.elements;
    const x = this.x, y = this.y, z = this.z;
    const w = 1 / ((e[3] * x + e[7] * y + e[11] * z + e[15]) || 1);
    this.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
    this.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
    this.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
    return this;
  }

  // Apply a Quaternion rotation.
  applyQuaternion(q) {
    const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    const x = this.x, y = this.y, z = this.z;
    const ix = qw * x + qy * z - qz * y;
    const iy = qw * y + qz * x - qx * z;
    const iz = qw * z + qx * y - qy * x;
    const iw = -qx * x - qy * y - qz * z;
    this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    return this;
  }

  setFromMatrixPosition(m) {
    const e = m.elements;
    this.x = e[12]; this.y = e[13]; this.z = e[14];
    return this;
  }
}

// ---------------------------------------------------------------------------
// Euler (XYZ order)
// ---------------------------------------------------------------------------
export class Euler {
  constructor(x = 0, y = 0, z = 0, order = 'XYZ') {
    this.x = x; this.y = y; this.z = z; this.order = order;
  }
  set(x, y, z, order = this.order) { this.x = x; this.y = y; this.z = z; this.order = order; return this; }
  copy(e) { this.x = e.x; this.y = e.y; this.z = e.z; this.order = e.order; return this; }
  clone() { return new Euler(this.x, this.y, this.z, this.order); }
}

// ---------------------------------------------------------------------------
// Quaternion
// ---------------------------------------------------------------------------
export class Quaternion {
  constructor(x = 0, y = 0, z = 0, w = 1) { this.x = x; this.y = y; this.z = z; this.w = w; }
  identity() { this.x = 0; this.y = 0; this.z = 0; this.w = 1; return this; }
  copy(q) { this.x = q.x; this.y = q.y; this.z = q.z; this.w = q.w; return this; }
  clone() { return new Quaternion(this.x, this.y, this.z, this.w); }

  setFromEuler(e) {
    // XYZ intrinsic order (default)
    const c1 = Math.cos(e.x / 2), s1 = Math.sin(e.x / 2);
    const c2 = Math.cos(e.y / 2), s2 = Math.sin(e.y / 2);
    const c3 = Math.cos(e.z / 2), s3 = Math.sin(e.z / 2);
    const order = e.order || 'XYZ';
    if (order === 'XYZ') {
      this.x = s1 * c2 * c3 + c1 * s2 * s3;
      this.y = c1 * s2 * c3 - s1 * c2 * s3;
      this.z = c1 * c2 * s3 + s1 * s2 * c3;
      this.w = c1 * c2 * c3 - s1 * s2 * s3;
    } else if (order === 'YXZ') {
      this.x = s1 * c2 * c3 + c1 * s2 * s3;
      this.y = c1 * s2 * c3 - s1 * c2 * s3;
      this.z = c1 * c2 * s3 - s1 * s2 * c3;
      this.w = c1 * c2 * c3 + s1 * s2 * s3;
    } else {
      // fallback
      this.x = s1 * c2 * c3 + c1 * s2 * s3;
      this.y = c1 * s2 * c3 - s1 * c2 * s3;
      this.z = c1 * c2 * s3 + s1 * s2 * c3;
      this.w = c1 * c2 * c3 - s1 * s2 * s3;
    }
    return this;
  }

  setFromAxisAngle(axis, angle) {
    const half = angle / 2;
    const s = Math.sin(half);
    this.x = axis.x * s; this.y = axis.y * s; this.z = axis.z * s; this.w = Math.cos(half);
    return this;
  }

  multiply(q) {
    const ax = this.x, ay = this.y, az = this.z, aw = this.w;
    const bx = q.x, by = q.y, bz = q.z, bw = q.w;
    this.x = ax * bw + aw * bx + ay * bz - az * by;
    this.y = ay * bw + aw * by + az * bx - ax * bz;
    this.z = az * bw + aw * bz + ax * by - ay * bx;
    this.w = aw * bw - ax * bx - ay * by - az * bz;
    return this;
  }

  slerp(qb, t) {
    if (t === 0) return this;
    if (t === 1) return this.copy(qb);
    const x = this.x, y = this.y, z = this.z, w = this.w;
    let cosHalfTheta = w * qb.w + x * qb.x + y * qb.y + z * qb.z;
    let qbw = qb.w, qbx = qb.x, qby = qb.y, qbz = qb.z;
    if (cosHalfTheta < 0) {
      qbw = -qbw; qbx = -qbx; qby = -qby; qbz = -qbz;
      cosHalfTheta = -cosHalfTheta;
    }
    if (cosHalfTheta >= 1) { this.w = w; this.x = x; this.y = y; this.z = z; return this; }
    const sqrSinHalfTheta = 1 - cosHalfTheta * cosHalfTheta;
    if (sqrSinHalfTheta <= Number.EPSILON) {
      const s = 1 - t;
      this.w = s * w + t * qbw; this.x = s * x + t * qbx;
      this.y = s * y + t * qby; this.z = s * z + t * qbz;
      return this.normalize();
    }
    const sinHalfTheta = Math.sqrt(sqrSinHalfTheta);
    const halfTheta = Math.atan2(sinHalfTheta, cosHalfTheta);
    const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
    const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;
    this.w = w * ratioA + qbw * ratioB; this.x = x * ratioA + qbx * ratioB;
    this.y = y * ratioA + qby * ratioB; this.z = z * ratioA + qbz * ratioB;
    return this;
  }

  normalize() {
    let l = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    if (l === 0) { this.x = 0; this.y = 0; this.z = 0; this.w = 1; }
    else { l = 1 / l; this.x *= l; this.y *= l; this.z *= l; this.w *= l; }
    return this;
  }
}

// ---------------------------------------------------------------------------
// Matrix4  (column-major, 16-element Float32Array-compatible)
// elements layout: e[col*4+row] — same as WebGL/three.js
// ---------------------------------------------------------------------------
export class Matrix4 {
  constructor() {
    this.elements = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ];
  }

  identity() {
    const e = this.elements;
    e[0] = 1; e[1] = 0; e[2] = 0; e[3] = 0;
    e[4] = 0; e[5] = 1; e[6] = 0; e[7] = 0;
    e[8] = 0; e[9] = 0; e[10] = 1; e[11] = 0;
    e[12] = 0; e[13] = 0; e[14] = 0; e[15] = 1;
    return this;
  }

  copy(m) { this.elements = [...m.elements]; return this; }
  clone() { const m = new Matrix4(); m.elements = [...this.elements]; return m; }

  makeTranslation(x, y, z) {
    this.identity();
    this.elements[12] = x; this.elements[13] = y; this.elements[14] = z;
    return this;
  }

  makeScale(x, y, z) {
    this.identity();
    this.elements[0] = x; this.elements[5] = y; this.elements[10] = z;
    return this;
  }

  makeRotationFromEuler(euler) {
    const { x, y, z, order = 'XYZ' } = euler;
    const a = Math.cos(x), b = Math.sin(x);
    const c = Math.cos(y), d = Math.sin(y);
    const ee = Math.cos(z), f = Math.sin(z);
    const te = this.elements;
    if (order === 'XYZ') {
      const ae = a * ee, af = a * f, be = b * ee, bf = b * f;
      te[0] = c * ee;   te[4] = -c * f;  te[8] = d;
      te[1] = af + be * d; te[5] = ae - bf * d; te[9] = -b * c;
      te[2] = bf - ae * d; te[6] = be + af * d; te[10] = a * c;
    } else if (order === 'YXZ') {
      const ce = c * ee, cf = c * f, de = d * ee, df = d * f;
      te[0] = ce + df * b; te[4] = de * b - cf; te[8] = a * d;
      te[1] = a * f;       te[5] = a * ee;      te[9] = -b;
      te[2] = cf * b - de; te[6] = df + ce * b; te[10] = a * c;
    } else {
      // generic XYZ fallback
      const ae = a * ee, af = a * f, be = b * ee, bf = b * f;
      te[0] = c * ee;   te[4] = -c * f;  te[8] = d;
      te[1] = af + be * d; te[5] = ae - bf * d; te[9] = -b * c;
      te[2] = bf - ae * d; te[6] = be + af * d; te[10] = a * c;
    }
    te[3] = 0; te[7] = 0; te[11] = 0;
    te[12] = 0; te[13] = 0; te[14] = 0; te[15] = 1;
    return this;
  }

  makeRotationFromQuaternion(q) {
    const e = this.elements;
    const x = q.x, y = q.y, z = q.z, w = q.w;
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;
    e[0] = 1 - (yy + zz); e[4] = xy - wz;       e[8] = xz + wy;
    e[1] = xy + wz;       e[5] = 1 - (xx + zz); e[9] = yz - wx;
    e[2] = xz - wy;       e[6] = yz + wx;       e[10] = 1 - (xx + yy);
    e[3] = 0; e[7] = 0; e[11] = 0;
    e[12] = 0; e[13] = 0; e[14] = 0; e[15] = 1;
    return this;
  }

  compose(position, quaternion, scale) {
    this.makeRotationFromQuaternion(quaternion);
    const e = this.elements;
    e[0] *= scale.x; e[1] *= scale.x; e[2] *= scale.x;
    e[4] *= scale.y; e[5] *= scale.y; e[6] *= scale.y;
    e[8] *= scale.z; e[9] *= scale.z; e[10] *= scale.z;
    e[12] = position.x; e[13] = position.y; e[14] = position.z;
    return this;
  }

  multiply(m) { return this.multiplyMatrices(this, m); }
  premultiply(m) { return this.multiplyMatrices(m, this); }

  multiplyMatrices(a, b) {
    const ae = a.elements, be = b.elements, te = this.elements;
    const a11 = ae[0], a21 = ae[1], a31 = ae[2], a41 = ae[3];
    const a12 = ae[4], a22 = ae[5], a32 = ae[6], a42 = ae[7];
    const a13 = ae[8], a23 = ae[9], a33 = ae[10], a43 = ae[11];
    const a14 = ae[12], a24 = ae[13], a34 = ae[14], a44 = ae[15];
    const b11 = be[0], b21 = be[1], b31 = be[2], b41 = be[3];
    const b12 = be[4], b22 = be[5], b32 = be[6], b42 = be[7];
    const b13 = be[8], b23 = be[9], b33 = be[10], b43 = be[11];
    const b14 = be[12], b24 = be[13], b34 = be[14], b44 = be[15];
    te[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
    te[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
    te[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
    te[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
    te[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
    te[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
    te[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
    te[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
    te[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
    te[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
    te[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
    te[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
    te[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;
    te[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;
    te[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;
    te[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;
    return this;
  }

  // Standard 4x4 cofactor-based inversion.
  invert() {
    const te = this.elements;
    const n11 = te[0], n21 = te[1], n31 = te[2], n41 = te[3];
    const n12 = te[4], n22 = te[5], n32 = te[6], n42 = te[7];
    const n13 = te[8], n23 = te[9], n33 = te[10], n43 = te[11];
    const n14 = te[12], n24 = te[13], n34 = te[14], n44 = te[15];
    const t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44;
    const t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44;
    const t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44;
    const t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34;
    const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;
    if (det === 0) return this.identity();
    const detInv = 1 / det;
    te[0] = t11 * detInv;
    te[1] = (n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44) * detInv;
    te[2] = (n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44) * detInv;
    te[3] = (n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43) * detInv;
    te[4] = t12 * detInv;
    te[5] = (n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44) * detInv;
    te[6] = (n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44) * detInv;
    te[7] = (n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43) * detInv;
    te[8] = t13 * detInv;
    te[9] = (n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44) * detInv;
    te[10] = (n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44) * detInv;
    te[11] = (n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43) * detInv;
    te[12] = t14 * detInv;
    te[13] = (n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34) * detInv;
    te[14] = (n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34) * detInv;
    te[15] = (n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33) * detInv;
    return this;
  }

  transpose() {
    const te = this.elements;
    let tmp;
    tmp = te[1]; te[1] = te[4]; te[4] = tmp;
    tmp = te[2]; te[2] = te[8]; te[8] = tmp;
    tmp = te[6]; te[6] = te[9]; te[9] = tmp;
    tmp = te[3]; te[3] = te[12]; te[12] = tmp;
    tmp = te[7]; te[7] = te[13]; te[13] = tmp;
    tmp = te[11]; te[11] = te[14]; te[14] = tmp;
    return this;
  }

  setPosition(x, y, z) {
    const e = this.elements;
    if (x && typeof x === 'object') { e[12] = x.x; e[13] = x.y; e[14] = x.z; }
    else { e[12] = x; e[13] = y; e[14] = z; }
    return this;
  }

  lookAt(eye, target, up) {
    const te = this.elements;
    const zx = eye.x - target.x, zy = eye.y - target.y, zz = eye.z - target.z;
    let zl = Math.sqrt(zx * zx + zy * zy + zz * zz) || 1;
    const znx = zx / zl, zny = zy / zl, znz = zz / zl;
    let xx = up.y * znz - up.z * zny;
    let xy = up.z * znx - up.x * znz;
    let xz = up.x * zny - up.y * znx;
    let xl = Math.sqrt(xx * xx + xy * xy + xz * xz) || 1;
    xx /= xl; xy /= xl; xz /= xl;
    const yx = zny * xz - znz * xy;
    const yy = znz * xx - znx * xz;
    const yz = znx * xy - zny * xx;
    te[0] = xx; te[4] = yx; te[8] = znx;
    te[1] = xy; te[5] = yy; te[9] = zny;
    te[2] = xz; te[6] = yz; te[10] = znz;
    return this;
  }
}

// ---------------------------------------------------------------------------
// Color
// ---------------------------------------------------------------------------
export class Color {
  constructor(r = 0, g = 0, b = 0) {
    if (typeof r === 'string') { this.r = 0; this.g = 0; this.b = 0; this.set(r); }
    else if (typeof r === 'number' && g === 0 && b === 0 && r > 1) { this.r = 0; this.g = 0; this.b = 0; this.setHex(r); }
    else { this.r = r; this.g = g; this.b = b; }
  }
  set(v) {
    if (typeof v === 'number') return this.setHex(v);
    if (typeof v === 'string') {
      const s = v.startsWith('#') ? v.slice(1) : v;
      if (s.length === 6) {
        this.r = parseInt(s.slice(0, 2), 16) / 255;
        this.g = parseInt(s.slice(2, 4), 16) / 255;
        this.b = parseInt(s.slice(4, 6), 16) / 255;
      }
    }
    return this;
  }
  setHex(hex) { hex = Math.floor(hex); this.r = ((hex >> 16) & 255) / 255; this.g = ((hex >> 8) & 255) / 255; this.b = (hex & 255) / 255; return this; }
  setRGB(r, g, b) { this.r = r; this.g = g; this.b = b; return this; }
  getHex() { return ((this.r * 255) | 0) * 65536 + ((this.g * 255) | 0) * 256 + ((this.b * 255) | 0); }
  copy(c) { this.r = c.r; this.g = c.g; this.b = c.b; return this; }
  clone() { return new Color(this.r, this.g, this.b); }
  lerp(c, t) { this.r += (c.r - this.r) * t; this.g += (c.g - this.g) * t; this.b += (c.b - this.b) * t; return this; }
  multiplyScalar(s) { this.r *= s; this.g *= s; this.b *= s; return this; }
  offsetHSL(h, s, l) { return this; } // inert in stub
}

// ---------------------------------------------------------------------------
// Object3D base class
// ---------------------------------------------------------------------------
export class Object3D {
  constructor() {
    this.position = new Vector3();
    this.rotation = new Euler();
    this.quaternion = new Quaternion();
    this.scale = new Vector3(1, 1, 1);
    this.matrix = new Matrix4();
    this.matrixWorld = new Matrix4();
    this.children = [];
    this.parent = null;
    this.visible = true;
    this.name = '';
    this.userData = {};
    this.frustumCulled = true;
    this.renderOrder = 0;
    this.matrixAutoUpdate = true;
    this.matrixWorldNeedsUpdate = false;
    this.layers = { mask: 1 };
    this.type = 'Object3D';
    this.uuid = Math.random().toString(36).slice(2);
  }
  add(...objects) {
    for (const obj of objects) {
      if (obj.parent) obj.parent.remove(obj);
      obj.parent = this;
      this.children.push(obj);
    }
    return this;
  }
  remove(...objects) {
    for (const obj of objects) {
      const idx = this.children.indexOf(obj);
      if (idx !== -1) { this.children.splice(idx, 1); obj.parent = null; }
    }
    return this;
  }
  clear() { for (const c of this.children) c.parent = null; this.children.length = 0; return this; }
  traverse(cb) { cb(this); for (const c of this.children) c.traverse(cb); }
  updateMatrix() { this.matrix.compose(this.position, this.quaternion, this.scale); }
  updateMatrixWorld(force = false) {
    if (this.matrixAutoUpdate) this.updateMatrix();
    if (this.parent) this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
    else this.matrixWorld.copy(this.matrix);
    for (const c of this.children) c.updateMatrixWorld(force);
  }
  getWorldPosition(target) { this.updateMatrixWorld(true); return target.setFromMatrixPosition(this.matrixWorld); }
  lookAt(x, y, z) {
    const target = x instanceof Vector3 ? x : new Vector3(x, y, z);
    const pos = this.getWorldPosition(new Vector3());
    this.matrix.lookAt(pos, target, new Vector3(0, 1, 0));
    this.quaternion.setFromEuler(this.rotation);
  }
  applyQuaternion(q) { this.quaternion.multiply(q); return this; }
  removeFromParent() { if (this.parent) this.parent.remove(this); return this; }
}

// ---------------------------------------------------------------------------
// Scene, Group, Mesh, etc.
// ---------------------------------------------------------------------------
export class Group extends Object3D {
  constructor() { super(); this.type = 'Group'; }
}

export class Scene extends Object3D {
  constructor() {
    super();
    this.type = 'Scene';
    this.background = null;
    this.fog = null;
    this.environment = null;
  }
}

// ---------------------------------------------------------------------------
// BufferAttribute
// ---------------------------------------------------------------------------
export class BufferAttribute {
  constructor(array, itemSize, normalized = false) {
    this.array = array;
    this.itemSize = itemSize;
    this.normalized = normalized;
    this.count = array ? Math.floor(array.length / itemSize) : 0;
    this.needsUpdate = false;
    this.usage = StaticDrawUsage;
    this.version = 0;
  }
  setUsage(u) { this.usage = u; return this; }
  clone() { return new BufferAttribute(this.array.slice(), this.itemSize, this.normalized); }
  copy(source) { this.array = source.array.slice(); this.itemSize = source.itemSize; this.count = source.count; return this; }
  getX(i) { return this.array[i * this.itemSize]; }
  getY(i) { return this.array[i * this.itemSize + 1]; }
  getZ(i) { return this.array[i * this.itemSize + 2]; }
  setX(i, x) { this.array[i * this.itemSize] = x; return this; }
  setY(i, y) { this.array[i * this.itemSize + 1] = y; return this; }
  setZ(i, z) { this.array[i * this.itemSize + 2] = z; return this; }
  setXY(i, x, y) { this.array[i * this.itemSize] = x; this.array[i * this.itemSize + 1] = y; return this; }
  setXYZ(i, x, y, z) { this.array[i * this.itemSize] = x; this.array[i * this.itemSize + 1] = y; this.array[i * this.itemSize + 2] = z; return this; }
  setXYZW(i, x, y, z, w) { const o = i * this.itemSize; this.array[o] = x; this.array[o + 1] = y; this.array[o + 2] = z; this.array[o + 3] = w; return this; }
}

export class InstancedBufferAttribute extends BufferAttribute {
  constructor(array, itemSize, normalized = false, meshPerAttribute = 1) {
    super(array, itemSize, normalized);
    this.meshPerAttribute = meshPerAttribute;
  }
}

export class Float32BufferAttribute extends BufferAttribute {
  constructor(array, itemSize) { super(new Float32Array(array), itemSize); }
}
export class Uint16BufferAttribute extends BufferAttribute {
  constructor(array, itemSize) { super(new Uint16Array(array), itemSize); }
}
export class Uint32BufferAttribute extends BufferAttribute {
  constructor(array, itemSize) { super(new Uint32Array(array), itemSize); }
}
export class Uint8BufferAttribute extends BufferAttribute {
  constructor(array, itemSize) { super(new Uint8Array(array), itemSize); }
}
export class Int32BufferAttribute extends BufferAttribute {
  constructor(array, itemSize) { super(new Int32Array(array), itemSize); }
}

// ---------------------------------------------------------------------------
// BufferGeometry
// ---------------------------------------------------------------------------
export class BufferGeometry {
  constructor() {
    this.attributes = {};
    this.index = null;
    this.groups = [];
    this.drawRange = { start: 0, count: Infinity };
    this.boundingSphere = null;
    this.boundingBox = null;
    this.type = 'BufferGeometry';
    this.uuid = Math.random().toString(36).slice(2);
  }
  setAttribute(name, attr) { this.attributes[name] = attr; return this; }
  getAttribute(name) { return this.attributes[name]; }
  deleteAttribute(name) { delete this.attributes[name]; return this; }
  setIndex(idx) { this.index = idx instanceof BufferAttribute ? idx : new BufferAttribute(new Uint32Array(idx), 1); return this; }
  computeVertexNormals() {}
  computeBoundingSphere() {
    if (!this.boundingSphere) this.boundingSphere = { center: new Vector3(), radius: 0 };
  }
  dispose() {}
  setDrawRange(start, count) { this.drawRange.start = start; this.drawRange.count = count; }
  addGroup(start, count, materialIndex = 0) { this.groups.push({ start, count, materialIndex }); }
  clearGroups() { this.groups.length = 0; }
  clone() { return new BufferGeometry(); }
  copy() { return this; }
}

export class InstancedBufferGeometry extends BufferGeometry {
  constructor() { super(); this.type = 'InstancedBufferGeometry'; this.instanceCount = Infinity; }
}

// ---------------------------------------------------------------------------
// Simple geometry shapes (stubs — just return empty BufferGeometry)
// ---------------------------------------------------------------------------
export class BoxGeometry extends BufferGeometry {
  constructor(w = 1, h = 1, d = 1) { super(); this.parameters = { width: w, height: h, depth: d }; }
}
export class PlaneGeometry extends BufferGeometry {
  constructor(w = 1, h = 1) { super(); this.parameters = { width: w, height: h }; }
}
export class SphereGeometry extends BufferGeometry {
  constructor(r = 1, ws = 8, hs = 6) { super(); this.parameters = { radius: r, widthSegments: ws, heightSegments: hs }; }
}
export class CylinderGeometry extends BufferGeometry {
  constructor(rt = 1, rb = 1, h = 1, rs = 8) { super(); this.parameters = { radiusTop: rt, radiusBottom: rb, height: h, radialSegments: rs }; }
}
export class ConeGeometry extends BufferGeometry {
  constructor(r = 1, h = 1, rs = 8) { super(); this.parameters = { radius: r, height: h, radialSegments: rs }; }
}
export class EdgesGeometry extends BufferGeometry {
  constructor(geo) { super(); this.parameters = { geometry: geo }; }
}

// ---------------------------------------------------------------------------
// Materials (all inert property bags)
// ---------------------------------------------------------------------------
function makeMaterial(defaults = {}) {
  return class {
    constructor(opts = {}) {
      this.uuid = Math.random().toString(36).slice(2);
      this.needsUpdate = false;
      this.visible = true;
      this.transparent = false;
      this.opacity = 1;
      this.side = FrontSide;
      this.depthWrite = true;
      this.depthTest = true;
      this.blending = NormalBlending;
      this.uniforms = {};
      Object.assign(this, defaults, opts);
    }
    dispose() {}
    clone() { const m = new this.constructor(); Object.assign(m, this); return m; }
    copy(source) { Object.assign(this, source); return this; }
  };
}

export const RawShaderMaterial = makeMaterial({ type: 'RawShaderMaterial' });
export const ShaderMaterial = makeMaterial({ type: 'ShaderMaterial' });
export const MeshBasicMaterial = makeMaterial({ type: 'MeshBasicMaterial', color: null });
export const MeshLambertMaterial = makeMaterial({ type: 'MeshLambertMaterial', color: null });
export const MeshStandardMaterial = makeMaterial({ type: 'MeshStandardMaterial', color: null });
export const LineBasicMaterial = makeMaterial({ type: 'LineBasicMaterial', color: null });
export const PointsMaterial = makeMaterial({ type: 'PointsMaterial', size: 1, color: null });
export const SpriteMaterial = makeMaterial({ type: 'SpriteMaterial', map: null, color: null });

// ---------------------------------------------------------------------------
// Texture stubs
// ---------------------------------------------------------------------------
export class Texture {
  constructor(image) {
    this.image = image || null;
    this.needsUpdate = false;
    this.wrapS = ClampToEdgeWrapping;
    this.wrapT = ClampToEdgeWrapping;
    this.minFilter = LinearMipmapLinearFilter;
    this.magFilter = LinearFilter;
    this.format = RGBAFormat;
    this.type = UnsignedByteType;
    this.anisotropy = 1;
    this.flipY = true;
    this.generateMipmaps = true;
    this.colorSpace = NoColorSpace;
    this.mipmaps = [];
    this.uuid = Math.random().toString(36).slice(2);
  }
  dispose() {}
  clone() { return new Texture(this.image); }
}

export class DataTexture extends Texture {
  constructor(data, width, height, format, type) {
    super(null);
    this.image = { data, width, height };
    this.format = format || RGBAFormat;
    this.type = type || UnsignedByteType;
  }
}

export class CanvasTexture extends Texture {
  constructor(canvas) { super(canvas); }
}

// ---------------------------------------------------------------------------
// 3D objects
// ---------------------------------------------------------------------------
export class Mesh extends Object3D {
  constructor(geometry, material) {
    super();
    this.type = 'Mesh';
    this.geometry = geometry || new BufferGeometry();
    this.material = material || null;
    this.morphTargetInfluences = [];
  }
  dispose() {}
}

export class InstancedMesh extends Mesh {
  constructor(geometry, material, count) {
    super(geometry, material);
    this.type = 'InstancedMesh';
    this.count = count || 0;
    const arr = new Float32Array(count * 16);
    // Initialize each instance matrix to identity
    for (let i = 0; i < count; i++) {
      const o = i * 16;
      arr[o] = 1; arr[o + 5] = 1; arr[o + 10] = 1; arr[o + 15] = 1;
    }
    this.instanceMatrix = new InstancedBufferAttribute(arr, 16);
    this.instanceMatrix.needsUpdate = false;
    this.instanceColor = null;
  }
  setMatrixAt(index, matrix) {
    const e = matrix.elements;
    const a = this.instanceMatrix.array;
    const o = index * 16;
    for (let i = 0; i < 16; i++) a[o + i] = e[i];
    this.instanceMatrix.needsUpdate = true;
  }
  getMatrixAt(index, matrix) {
    const a = this.instanceMatrix.array;
    const o = index * 16;
    const e = matrix.elements;
    for (let i = 0; i < 16; i++) e[i] = a[o + i];
    return matrix;
  }
  dispose() {}
}

export class Points extends Object3D {
  constructor(geometry, material) { super(); this.type = 'Points'; this.geometry = geometry || new BufferGeometry(); this.material = material || null; }
}
export class LineSegments extends Object3D {
  constructor(geometry, material) { super(); this.type = 'LineSegments'; this.geometry = geometry || new BufferGeometry(); this.material = material || null; }
}
export class Line extends Object3D {
  constructor(geometry, material) { super(); this.type = 'Line'; this.geometry = geometry || new BufferGeometry(); this.material = material || null; }
}
export class Sprite extends Object3D {
  constructor(material) { super(); this.type = 'Sprite'; this.material = material || null; this.center = new Vector2(0.5, 0.5); }
}

// ---------------------------------------------------------------------------
// Cameras
// ---------------------------------------------------------------------------
export class Camera extends Object3D {
  constructor() {
    super();
    this.type = 'Camera';
    this.matrixWorldInverse = new Matrix4();
    this.projectionMatrix = new Matrix4();
    this.projectionMatrixInverse = new Matrix4();
  }
  updateProjectionMatrix() {}
  getWorldDirection(target) { return target.set(0, 0, -1).applyQuaternion(this.quaternion); }
}

export class PerspectiveCamera extends Camera {
  constructor(fov = 50, aspect = 1, near = 0.1, far = 2000) {
    super();
    this.type = 'PerspectiveCamera';
    this.fov = fov; this.aspect = aspect; this.near = near; this.far = far;
  }
  updateProjectionMatrix() {
    const f = 1 / Math.tan(MathUtils.degToRad(this.fov) / 2);
    const nf = 1 / (this.near - this.far);
    const e = this.projectionMatrix.elements;
    e[0] = f / this.aspect; e[1] = 0; e[2] = 0; e[3] = 0;
    e[4] = 0; e[5] = f; e[6] = 0; e[7] = 0;
    e[8] = 0; e[9] = 0; e[10] = (this.far + this.near) * nf; e[11] = -1;
    e[12] = 0; e[13] = 0; e[14] = 2 * this.far * this.near * nf; e[15] = 0;
  }
}

export class OrthographicCamera extends Camera {
  constructor(left = -1, right = 1, top = 1, bottom = -1, near = 0.1, far = 2000) {
    super();
    this.type = 'OrthographicCamera';
    this.left = left; this.right = right; this.top = top; this.bottom = bottom;
    this.near = near; this.far = far;
  }
  updateProjectionMatrix() {}
}

// ---------------------------------------------------------------------------
// Renderer stub
// ---------------------------------------------------------------------------
export class WebGLRenderer {
  constructor(opts = {}) {
    this.domElement = { style: {}, addEventListener() {}, removeEventListener() {}, width: 0, height: 0 };
    this.shadowMap = { enabled: false, type: 0 };
    this.info = { render: { calls: 0, triangles: 0 }, memory: { geometries: 0, textures: 0 } };
    this.capabilities = { getMaxAnisotropy: () => 16, isWebGL2: true, maxTextures: 16 };
    this.outputColorSpace = SRGBColorSpace;
    this.toneMapping = 0;
    this.toneMappingExposure = 1;
    this._clearColor = new Color();
    this._clearAlpha = 1;
  }
  setSize(w, h) { this.domElement.width = w; this.domElement.height = h; }
  setPixelRatio(r) {}
  render(scene, camera) {}
  dispose() {}
  getContext() { return { getExtension: () => null, getParameter: () => null }; }
  setClearColor(color, alpha = 1) {}
  clear() {}
  setScissorTest(v) {}
  setViewport(x, y, w, h) {}
  getPixelRatio() { return 1; }
}

// ---------------------------------------------------------------------------
// Frustum, Box3, Sphere, Ray, Plane, Raycaster
// ---------------------------------------------------------------------------
export class Plane {
  constructor(normal = new Vector3(0, 0, 1), constant = 0) {
    this.normal = normal; this.constant = constant;
  }
  distanceToPoint(p) { return this.normal.dot(p) + this.constant; }
  copy(p) { this.normal.copy(p.normal); this.constant = p.constant; return this; }
  clone() { return new Plane(this.normal.clone(), this.constant); }
  normalize() {
    const l = this.normal.length();
    if (l > 0) { const inv = 1 / l; this.normal.multiplyScalar(inv); this.constant *= inv; }
    return this;
  }
}

export class Sphere {
  constructor(center = new Vector3(), radius = -1) { this.center = center; this.radius = radius; }
  clone() { return new Sphere(this.center.clone(), this.radius); }
  copy(s) { this.center.copy(s.center); this.radius = s.radius; return this; }
  containsPoint(p) { return p.distanceToSquared(this.center) <= this.radius * this.radius; }
  intersectsSphere(s) {
    const d = this.radius + s.radius;
    return this.center.distanceToSquared(s.center) <= d * d;
  }
}

export class Box3 {
  constructor(min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity)) {
    this.min = min.clone ? min.clone() : new Vector3(min.x, min.y, min.z);
    this.max = max.clone ? max.clone() : new Vector3(max.x, max.y, max.z);
  }
  set(min, max) { this.min.copy(min); this.max.copy(max); return this; }
  setFromCenterAndSize(center, size) {
    const half = new Vector3().copy(size).multiplyScalar(0.5);
    this.min.copy(center).sub(half);
    this.max.copy(center).add(half);
    return this;
  }
  expandByPoint(p) {
    this.min.min(p); this.max.max(p); return this;
  }
  containsPoint(p) {
    return p.x >= this.min.x && p.x <= this.max.x &&
      p.y >= this.min.y && p.y <= this.max.y &&
      p.z >= this.min.z && p.z <= this.max.z;
  }
  intersectsBox(b) {
    return b.max.x >= this.min.x && b.min.x <= this.max.x &&
      b.max.y >= this.min.y && b.min.y <= this.max.y &&
      b.max.z >= this.min.z && b.min.z <= this.max.z;
  }
  getCenter(target) {
    target.set((this.min.x + this.max.x) / 2, (this.min.y + this.max.y) / 2, (this.min.z + this.max.z) / 2);
    return target;
  }
  getSize(target) {
    target.set(this.max.x - this.min.x, this.max.y - this.min.y, this.max.z - this.min.z);
    return target;
  }
  intersectsSphere(sphere) {
    const center = new Vector3();
    this.getCenter(center);
    const d = sphere.center.distanceTo(center);
    const halfSize = new Vector3();
    this.getSize(halfSize).multiplyScalar(0.5);
    return d <= sphere.radius + Math.max(halfSize.x, halfSize.y, halfSize.z);
  }
  clone() { return new Box3(this.min.clone(), this.max.clone()); }
}

export class Frustum {
  constructor() { this.planes = [new Plane(), new Plane(), new Plane(), new Plane(), new Plane(), new Plane()]; }
  setFromProjectionMatrix(m) {
    const me = m.elements;
    const me0 = me[0], me1 = me[1], me2 = me[2], me3 = me[3];
    const me4 = me[4], me5 = me[5], me6 = me[6], me7 = me[7];
    const me8 = me[8], me9 = me[9], me10 = me[10], me11 = me[11];
    const me12 = me[12], me13 = me[13], me14 = me[14], me15 = me[15];
    this.planes[0].set(new Vector3(me3 - me0, me7 - me4, me11 - me8), me15 - me12).normalize();
    this.planes[1].set(new Vector3(me3 + me0, me7 + me4, me11 + me8), me15 + me12).normalize();
    this.planes[2].set(new Vector3(me3 + me1, me7 + me5, me11 + me9), me15 + me13).normalize();
    this.planes[3].set(new Vector3(me3 - me1, me7 - me5, me11 - me9), me15 - me13).normalize();
    this.planes[4].set(new Vector3(me3 - me2, me7 - me6, me11 - me10), me15 - me14).normalize();
    this.planes[5].set(new Vector3(me3 + me2, me7 + me6, me11 + me10), me15 + me14).normalize();
    return this;
  }
  intersectsSphere(sphere) {
    for (const p of this.planes) {
      if (p.distanceToPoint(sphere.center) < -sphere.radius) return false;
    }
    return true;
  }
  intersectsBox(box) {
    const center = box.getCenter(new Vector3());
    const half = box.getSize(new Vector3()).multiplyScalar(0.5);
    for (const p of this.planes) {
      const d = p.distanceToPoint(center);
      const r = half.x * Math.abs(p.normal.x) + half.y * Math.abs(p.normal.y) + half.z * Math.abs(p.normal.z);
      if (d < -r) return false;
    }
    return true;
  }
}

// Plane.set override to accept normal as Vector3 + constant
const _origPlaneSet = Plane.prototype.set;
Plane.prototype.set = function(normal, constant) {
  if (normal instanceof Vector3) { this.normal.copy(normal); this.constant = constant; return this; }
  return this;
};

export class Ray {
  constructor(origin = new Vector3(), direction = new Vector3(0, 0, -1)) {
    this.origin = origin; this.direction = direction;
  }
}

export class Raycaster {
  constructor(origin, direction, near = 0, far = Infinity) {
    this.ray = new Ray(origin || new Vector3(), direction || new Vector3(0, 0, -1));
    this.near = near; this.far = far;
    this.camera = null;
    this.params = {};
  }
  setFromCamera(coords, camera) {}
  intersectObject(obj, recursive, optionalTarget = []) { return optionalTarget; }
  intersectObjects(objs, recursive, optionalTarget = []) { return optionalTarget; }
}

// ---------------------------------------------------------------------------
// Clock
// ---------------------------------------------------------------------------
export class Clock {
  constructor(autoStart = true) {
    this.autoStart = autoStart;
    this.startTime = 0; this.oldTime = 0; this.elapsedTime = 0;
    this.running = false;
    if (autoStart) this.start();
  }
  start() { this.startTime = Date.now(); this.oldTime = this.startTime; this.running = true; }
  stop() { this.getElapsedTime(); this.running = false; }
  getDelta() {
    let diff = 0;
    if (this.autoStart && !this.running) this.start();
    if (this.running) {
      const now = Date.now();
      diff = (now - this.oldTime) / 1000;
      this.oldTime = now;
      this.elapsedTime += diff;
    }
    return diff;
  }
  getElapsedTime() { this.getDelta(); return this.elapsedTime; }
}
