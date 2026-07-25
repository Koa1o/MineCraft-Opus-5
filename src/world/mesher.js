// ---------------------------------------------------------------------------
// Chunk mesher.
//
// Three passes are produced per chunk: 'opaque', 'cutout' (alpha-tested plants /
// leaves / glass frames) and 'translucent' (water, ice, portals). Each pass gets
// interleaved vertex attributes matching src/render/shaders.js.
//
// Cubes use GREEDY MERGING per face direction: for each of the 6 face normals we
// slice the chunk, build a 2D mask of "visible face with identical (tile, light,
// tint, ao, anim)" and merge maximal rectangles. A flat plain therefore emits a
// handful of quads instead of thousands.
//
// Non-cube shapes (slabs/stairs/torches/fences), cross plants and fluids are
// emitted per block after the greedy pass.
//
// AO is computed Minecraft-style from the 3 neighbours touching each vertex, and
// light is smoothed by averaging the 4 blocks touching the vertex, which is what
// makes voxel terrain read as soft-lit rather than per-face flat.
// ---------------------------------------------------------------------------

import { CHUNK_W, CHUNK_H, SECTION_H, SECTION_COUNT } from './chunk.js';
import { RK_AIR, RK_CUBE, RK_BOXES, RK_CROSS, RK_FLUID } from './blocks.js';

/** Per-face corner offsets, used for both AO and smooth light. */
// For face f, the quad corners in CCW order and, per corner, the 3 neighbour
// offsets (side1, side2, corner) used for the AO term.
const FACE_DATA = [
  // +X
  {
    n: [1, 0, 0],
    verts: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]],
    ao: [
      [[1, -1, 0], [1, 0, 1], [1, -1, 1]],
      [[1, -1, 0], [1, 0, -1], [1, -1, -1]],
      [[1, 1, 0], [1, 0, -1], [1, 1, -1]],
      [[1, 1, 0], [1, 0, 1], [1, 1, 1]],
    ],
    // uv axes in world space: u along +Z, v along +Y
    uAxis: [0, 0, 1], vAxis: [0, 1, 0],
  },
  // -X
  {
    n: [-1, 0, 0],
    verts: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]],
    ao: [
      [[-1, -1, 0], [-1, 0, -1], [-1, -1, -1]],
      [[-1, -1, 0], [-1, 0, 1], [-1, -1, 1]],
      [[-1, 1, 0], [-1, 0, 1], [-1, 1, 1]],
      [[-1, 1, 0], [-1, 0, -1], [-1, 1, -1]],
    ],
    uAxis: [0, 0, 1], vAxis: [0, 1, 0],
  },
  // +Y (top)
  {
    n: [0, 1, 0],
    verts: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]],
    ao: [
      [[-1, 1, 0], [0, 1, 1], [-1, 1, 1]],
      [[1, 1, 0], [0, 1, 1], [1, 1, 1]],
      [[1, 1, 0], [0, 1, -1], [1, 1, -1]],
      [[-1, 1, 0], [0, 1, -1], [-1, 1, -1]],
    ],
    uAxis: [1, 0, 0], vAxis: [0, 0, 1],
  },
  // -Y (bottom)
  {
    n: [0, -1, 0],
    verts: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
    ao: [
      [[-1, -1, 0], [0, -1, -1], [-1, -1, -1]],
      [[1, -1, 0], [0, -1, -1], [1, -1, -1]],
      [[1, -1, 0], [0, -1, 1], [1, -1, 1]],
      [[-1, -1, 0], [0, -1, 1], [-1, -1, 1]],
    ],
    uAxis: [1, 0, 0], vAxis: [0, 0, 1],
  },
  // +Z
  {
    n: [0, 0, 1],
    verts: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]],
    ao: [
      [[0, -1, 1], [-1, 0, 1], [-1, -1, 1]],
      [[0, -1, 1], [1, 0, 1], [1, -1, 1]],
      [[0, 1, 1], [1, 0, 1], [1, 1, 1]],
      [[0, 1, 1], [-1, 0, 1], [-1, 1, 1]],
    ],
    uAxis: [1, 0, 0], vAxis: [0, 1, 0],
  },
  // -Z
  {
    n: [0, 0, -1],
    verts: [[1, 0, -0], [0, 0, 0], [0, 1, 0], [1, 1, 0]],
    ao: [
      [[0, -1, -1], [1, 0, -1], [1, -1, -1]],
      [[0, -1, -1], [-1, 0, -1], [-1, -1, -1]],
      [[0, 1, -1], [-1, 0, -1], [-1, 1, -1]],
      [[0, 1, -1], [1, 0, -1], [1, 1, -1]],
    ],
    uAxis: [1, 0, 0], vAxis: [0, 1, 0],
  },
];

/** Growable interleaved vertex buffer for one render pass. */
class MeshBuffer {
  constructor() {
    this.pos = [];      // x,y,z
    this.uv = [];       // u,v (in-tile, may exceed 1 for merged quads)
    this.tile = [];     // atlas index
    this.light = [];    // sky, block, ao
    this.tint = [];     // r,g,b
    this.anim = [];     // frames|speed<<5
    this.norm = [];     // face index, or 6/7/8 for waving
    this.idx = [];
    this.vcount = 0;
  }
  get empty() { return this.vcount === 0; }

  /**
   * Push one quad. corners: 4x[x,y,z]; uvs: 4x[u,v];
   * lights: 4x[sky,block,ao]; tint: [r,g,b] shared.
   */
  quad(corners, uvs, tile, lights, tint, anim, norm, flip) {
    const b = this.vcount;
    for (let i = 0; i < 4; i++) {
      const c = corners[i], uv = uvs[i], l = lights[i];
      this.pos.push(c[0], c[1], c[2]);
      this.uv.push(uv[0], uv[1]);
      this.tile.push(tile);
      this.light.push(l[0], l[1], l[2]);
      this.tint.push(tint[0], tint[1], tint[2]);
      this.anim.push(anim);
      this.norm.push(norm);
    }
    this.vcount += 4;
    // Flip the triangle split when AO would otherwise create a visible seam.
    if (flip) this.idx.push(b + 1, b + 2, b + 3, b + 1, b + 3, b + 0);
    else this.idx.push(b + 0, b + 1, b + 2, b + 0, b + 2, b + 3);
  }

  toGeometryData() {
    return {
      position: new Float32Array(this.pos),
      aUv: new Float32Array(this.uv),
      aTile: new Float32Array(this.tile),
      aLight: new Float32Array(this.light),
      aTint: new Float32Array(this.tint),
      aAnim: new Float32Array(this.anim),
      aNormal: new Float32Array(this.norm),
      index: this.vcount > 65535 ? new Uint32Array(this.idx) : new Uint16Array(this.idx),
      vertexCount: this.vcount,
      indexCount: this.idx.length,
    };
  }
}

/**
 * The mesher needs random access to a 18x18 neighbourhood, so it works against a
 * "view" that resolves out-of-chunk reads through the world.
 */
export class ChunkView {
  constructor(world, cx, cz) {
    this.world = world;
    this.cx = cx;
    this.cz = cz;
    this.ox = cx * CHUNK_W;
    this.oz = cz * CHUNK_W;
    this.chunk = world.getChunk(cx, cz);
    // Cache the 3x3 chunk neighbourhood so we never hash per block.
    this.nb = [];
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) this.nb.push(world.getChunk(cx + dx, cz + dz));
    }
  }
  _chunkFor(wx, wz) {
    const dcx = Math.floor(wx / CHUNK_W) - this.cx;
    const dcz = Math.floor(wz / CHUNK_W) - this.cz;
    if (dcx < -1 || dcx > 1 || dcz < -1 || dcz > 1) return this.world.getChunk(Math.floor(wx / CHUNK_W), Math.floor(wz / CHUNK_W));
    return this.nb[(dcz + 1) * 3 + (dcx + 1)];
  }
  /** Local chunk coords (may be -1..16) -> block id. */
  get(x, y, z) {
    if (y < 0 || y >= CHUNK_H) return 0;
    if (x >= 0 && x < CHUNK_W && z >= 0 && z < CHUNK_W) {
      return this.chunk.blocks[(x * CHUNK_W + z) * CHUNK_H + y];
    }
    const wx = this.ox + x, wz = this.oz + z;
    const c = this._chunkFor(wx, wz);
    if (!c) return 0;
    const lx = wx - c.cx * CHUNK_W, lz = wz - c.cz * CHUNK_W;
    return c.blocks[(lx * CHUNK_W + lz) * CHUNK_H + y];
  }
  meta(x, y, z) {
    if (y < 0 || y >= CHUNK_H) return 0;
    if (x >= 0 && x < CHUNK_W && z >= 0 && z < CHUNK_W) {
      return this.chunk.meta[(x * CHUNK_W + z) * CHUNK_H + y];
    }
    const wx = this.ox + x, wz = this.oz + z;
    const c = this._chunkFor(wx, wz);
    if (!c) return 0;
    const lx = wx - c.cx * CHUNK_W, lz = wz - c.cz * CHUNK_W;
    return c.meta[(lx * CHUNK_W + lz) * CHUNK_H + y];
  }
  /** packed light byte */
  lightAt(x, y, z) {
    if (y < 0) return 0;
    if (y >= CHUNK_H) return 15 << 4;
    if (x >= 0 && x < CHUNK_W && z >= 0 && z < CHUNK_W) {
      return this.chunk.light[(x * CHUNK_W + z) * CHUNK_H + y];
    }
    const wx = this.ox + x, wz = this.oz + z;
    const c = this._chunkFor(wx, wz);
    if (!c) return 15 << 4;
    const lx = wx - c.cx * CHUNK_W, lz = wz - c.cz * CHUNK_W;
    return c.light[(lx * CHUNK_W + lz) * CHUNK_H + y];
  }
  biome(x, z) {
    if (x >= 0 && x < CHUNK_W && z >= 0 && z < CHUNK_W) return this.chunk.biome[x * CHUNK_W + z];
    const wx = this.ox + x, wz = this.oz + z;
    const c = this._chunkFor(wx, wz);
    if (!c) return this.chunk.biome[0];
    const lx = wx - c.cx * CHUNK_W, lz = wz - c.cz * CHUNK_W;
    return c.biome[lx * CHUNK_W + lz];
  }
}

export class Mesher {
  /**
   * @param {object} deps { flags, registry, tileIndex, animIndex, biomes, settings }
   *   tileIndex: (blockId, face) -> atlas tile index
   *   animIndex: (blockId, face) -> anim byte
   *   biomes: { grassTint(biomeId), foliageTint(biomeId), waterTint(biomeId) }
   */
  constructor(deps) {
    this.flags = deps.flags;
    this.registry = deps.registry;
    this.tileIndex = deps.tileIndex;
    this.animIndex = deps.animIndex;
    this.biomes = deps.biomes;
    this.settings = deps.settings || { ao: true, smoothLight: true };
    // Scratch mask arrays for greedy meshing, allocated once.
    this.maskTile = new Int32Array(CHUNK_W * CHUNK_H);
    this.maskKey = new Float64Array(CHUNK_W * CHUNK_H);
    this.maskLight = new Int32Array(CHUNK_W * CHUNK_H * 4);
    this.maskAo = new Int32Array(CHUNK_W * CHUNK_H * 4);
    this.maskTint = new Float32Array(CHUNK_W * CHUNK_H * 3);
    this.maskAnim = new Int32Array(CHUNK_W * CHUNK_H);
    this.maskDone = new Uint8Array(CHUNK_W * CHUNK_H);
  }

  /**
   * Mesh one chunk.
   * @returns {{opaque:object|null, cutout:object|null, translucent:object|null, faces:number}}
   */
  mesh(world, cx, cz) {
    const view = new ChunkView(world, cx, cz);
    if (!view.chunk) return { opaque: null, cutout: null, translucent: null, faces: 0 };
    const bufs = {
      opaque: new MeshBuffer(),
      cutout: new MeshBuffer(),
      translucent: new MeshBuffer(),
    };
    this._greedyCubes(view, bufs);
    this._shapesAndPlants(view, bufs);
    const out = { faces: 0 };
    for (const k of ['opaque', 'cutout', 'translucent']) {
      out[k] = bufs[k].empty ? null : bufs[k].toGeometryData();
      out.faces += bufs[k].vcount / 4;
    }
    return out;
  }

  /** Should face `f` of block `id` at (x,y,z) be drawn? */
  _faceVisible(view, id, x, y, z, f) {
    const F = this.flags;
    const d = FACE_DATA[f].n;
    const nid = view.get(x + d[0], y + d[1], z + d[2]);
    if (nid === id) {
      // Same block: cull unless the block explicitly doesn't self-cull (leaves).
      return F.cullSelf[id] === 0;
    }
    if (F.renderKind[nid] === RK_AIR) return true;
    // A fluid hides the faces of its own kind, and water hides faces against
    // solid neighbours only when the neighbour is a full opaque cube.
    if (F.renderKind[nid] === RK_CUBE && F.transparent[nid] === 0) return false;
    if (F.fluid[id] !== 0 && F.fluid[nid] === F.fluid[id]) return false;
    // Translucent against translucent of a different type still draws.
    if (F.renderKind[nid] === RK_CUBE && F.translucent[nid] === 1 && F.translucent[id] === 1 && nid === id) return false;
    return true;
  }

  _passFor(id) {
    const F = this.flags;
    if (F.translucent[id]) return 'translucent';
    if (F.cutout[id]) return 'cutout';
    return 'opaque';
  }

  /**
   * Smooth light + AO for one vertex of one face.
   * Returns [sky, block, ao].
   */
  _vertexLight(view, x, y, z, f, corner) {
    const F = this.flags;
    const fd = FACE_DATA[f];
    const n = fd.n;
    // The 4 blocks touching this vertex on the *outside* of the face.
    const [s1, s2, cr] = fd.ao[corner];
    const bx = x + n[0], by = y + n[1], bz = z + n[2];
    const l0 = view.lightAt(bx, by, bz);
    let sky = l0 >> 4, blk = l0 & 15, cnt = 1;
    let ao = 0;
    if (this.settings.smoothLight) {
      const pts = [
        [x + s1[0], y + s1[1], z + s1[2]],
        [x + s2[0], y + s2[1], z + s2[2]],
        [x + cr[0], y + cr[1], z + cr[2]],
      ];
      for (const p of pts) {
        const id = view.get(p[0], p[1], p[2]);
        if (F.opacity[id] === 0) {
          const l = view.lightAt(p[0], p[1], p[2]);
          sky += l >> 4; blk += l & 15; cnt++;
        }
      }
      sky = Math.round(sky / cnt);
      blk = Math.round(blk / cnt);
    }
    if (this.settings.ao) {
      const o1 = F.opacity[view.get(x + s1[0], y + s1[1], z + s1[2])] > 0 ? 1 : 0;
      const o2 = F.opacity[view.get(x + s2[0], y + s2[1], z + s2[2])] > 0 ? 1 : 0;
      const oc = F.opacity[view.get(x + cr[0], y + cr[1], z + cr[2])] > 0 ? 1 : 0;
      ao = (o1 && o2) ? 3 : (o1 + o2 + oc);
    }
    return [sky, blk, ao];
  }

  _tintFor(view, id, x, z) {
    const ti = this.flags.tintIndex[id];
    if (ti === 0) return WHITE_TINT;
    const b = view.biome(x, z);
    if (ti === 1) return this.biomes.grassTint(b);
    if (ti === 2) return this.biomes.foliageTint(b);
    if (ti === 3) return this.biomes.waterTint(b);
    const def = this.registry.def(id);
    return def.tintColor || WHITE_TINT;
  }

  /**
   * Greedy-merge all full-cube faces.
   * Sweeps each of the 6 directions; for the two "sliced" axes it builds a mask
   * then extracts maximal rectangles.
   */
  _greedyCubes(view, bufs) {
    const F = this.flags;
    const chunk = view.chunk;

    for (let f = 0; f < 6; f++) {
      const fd = FACE_DATA[f];
      // Axis being stepped through (the face normal axis).
      const axis = fd.n[0] !== 0 ? 0 : fd.n[1] !== 0 ? 1 : 2;
      // The two in-plane axes.
      const uA = axis === 0 ? 2 : 0;                 // u axis index
      const vA = axis === 1 ? 2 : 1;                 // v axis index
      const uMax = uA === 1 ? CHUNK_H : CHUNK_W;
      const vMax = vA === 1 ? CHUNK_H : CHUNK_W;
      const sMax = axis === 1 ? CHUNK_H : CHUNK_W;

      for (let s = 0; s < sMax; s++) {
        // Skip empty sections quickly when sweeping vertically.
        if (axis === 1) {
          const sec = s >> 4;
          if (chunk.isSectionEmpty(sec)) {
            // A face can still exist at the boundary of an empty section if the
            // neighbouring section has blocks; only skip when both are empty.
            const below = (s & 15) === 0 && sec > 0 ? chunk.isSectionEmpty(sec - 1) : true;
            const above = (s & 15) === 15 && sec < SECTION_COUNT - 1 ? chunk.isSectionEmpty(sec + 1) : true;
            if (below && above) continue;
          }
        }
        // ---- build mask
        let any = false;
        this.maskDone.fill(0, 0, uMax * vMax);
        for (let v = 0; v < vMax; v++) {
          for (let u = 0; u < uMax; u++) {
            const p = [0, 0, 0];
            p[axis] = s; p[uA] = u; p[vA] = v;
            const x = p[0], y = p[1], z = p[2];
            const mi = v * uMax + u;
            this.maskTile[mi] = -1;
            const id = view.get(x, y, z);
            if (id === 0 || F.renderKind[id] !== RK_CUBE) continue;
            if (!this._faceVisible(view, id, x, y, z, f)) continue;
            const tile = this.tileIndex(id, f);
            if (tile < 0) continue;
            const anim = this.animIndex(id, f);
            const tint = this._tintFor(view, id, x, z);
            // 4 vertex lights
            let key = tile * 131 + anim * 7;
            for (let c = 0; c < 4; c++) {
              const L = this._vertexLight(view, x, y, z, f, c);
              this.maskLight[mi * 4 + c] = L[0] * 16 + L[1];
              this.maskAo[mi * 4 + c] = L[2];
              key = key * 61 + L[0] * 3 + L[1] * 5 + L[2] * 11;
            }
            this.maskTint[mi * 3] = tint[0];
            this.maskTint[mi * 3 + 1] = tint[1];
            this.maskTint[mi * 3 + 2] = tint[2];
            key = key * 1.000001 + tint[0] * 7.3 + tint[1] * 11.7 + tint[2] * 13.1;
            this.maskTile[mi] = tile;
            this.maskAnim[mi] = anim;
            this.maskKey[mi] = key;
            // Which pass does this face belong to?
            this.maskDone[mi] = F.translucent[id] ? 2 : F.cutout[id] ? 1 : 0;
            any = true;
          }
        }
        if (!any) continue;

        // ---- extract maximal rectangles
        const used = this.maskUsed || (this.maskUsed = new Uint8Array(CHUNK_W * CHUNK_H));
        used.fill(0, 0, uMax * vMax);
        for (let v = 0; v < vMax; v++) {
          for (let u = 0; u < uMax; u++) {
            const mi = v * uMax + u;
            if (used[mi] || this.maskTile[mi] < 0) continue;
            const tile = this.maskTile[mi];
            const key = this.maskKey[mi];
            const pass = this.maskDone[mi];
            // grow width
            let w = 1;
            while (u + w < uMax) {
              const j = v * uMax + u + w;
              if (used[j] || this.maskTile[j] !== tile || this.maskKey[j] !== key) break;
              w++;
            }
            // grow height
            let h = 1;
            outer: while (v + h < vMax) {
              for (let k = 0; k < w; k++) {
                const j = (v + h) * uMax + u + k;
                if (used[j] || this.maskTile[j] !== tile || this.maskKey[j] !== key) break outer;
              }
              h++;
            }
            for (let dv = 0; dv < h; dv++) {
              for (let du = 0; du < w; du++) used[(v + dv) * uMax + u + du] = 1;
            }
            this._emitGreedyQuad(bufs, f, axis, uA, vA, s, u, v, w, h, mi, pass);
          }
        }
      }
    }
  }

  _emitGreedyQuad(bufs, f, axis, uA, vA, s, u, v, w, h, mi, pass) {
    const fd = FACE_DATA[f];
    const buf = pass === 2 ? bufs.translucent : pass === 1 ? bufs.cutout : bufs.opaque;
    // Build the 4 world-space corners from the base cube corners, stretched by
    // (w,h) along the in-plane axes.
    const corners = [];
    for (let c = 0; c < 4; c++) {
      const base = fd.verts[c];
      const p = [0, 0, 0];
      p[axis] = s + base[axis];
      // base[uA]/base[vA] are 0 or 1 -> scale by the merged extent
      p[uA] = u + base[uA] * w;
      p[vA] = v + base[vA] * h;
      corners.push(p);
    }
    // UVs follow the merged extent so the texture tiles across the quad.
    // Determine each corner's (u,v) in tile units from its position.
    const uvs = [];
    for (let c = 0; c < 4; c++) {
      const base = fd.verts[c];
      let cu = base[uA] * w, cv = base[vA] * h;
      // Flip so textures are upright on every face.
      if (f === 0) { cu = base[2] * w; cv = h - base[1] * h; }
      else if (f === 1) { cu = w - base[2] * w; cv = h - base[1] * h; }
      else if (f === 2) { cu = base[0] * w; cv = base[2] * h; }
      else if (f === 3) { cu = base[0] * w; cv = h - base[2] * h; }
      else if (f === 4) { cu = base[0] * w; cv = h - base[1] * h; }
      else { cu = w - base[0] * w; cv = h - base[1] * h; }
      uvs.push([cu, cv]);
    }
    const lights = [];
    let aoSum0 = 0, aoSum1 = 0;
    for (let c = 0; c < 4; c++) {
      const packed = this.maskLight[mi * 4 + c];
      lights.push([packed >> 4, packed & 15, this.maskAo[mi * 4 + c]]);
    }
    aoSum0 = lights[0][2] + lights[2][2];
    aoSum1 = lights[1][2] + lights[3][2];
    const tint = [this.maskTint[mi * 3], this.maskTint[mi * 3 + 1], this.maskTint[mi * 3 + 2]];
    buf.quad(corners, uvs, this.maskTile[mi], lights, tint, this.maskAnim[mi], f, aoSum0 > aoSum1);
  }

  /** Non-cube blocks: shape boxes, cross plants, fluids. */
  _shapesAndPlants(view, bufs) {
    const F = this.flags;
    const chunk = view.chunk;
    for (let sec = 0; sec < SECTION_COUNT; sec++) {
      if (chunk.isSectionEmpty(sec)) continue;
      const y0 = sec * SECTION_H, y1 = y0 + SECTION_H;
      for (let x = 0; x < CHUNK_W; x++) {
        for (let z = 0; z < CHUNK_W; z++) {
          const base = (x * CHUNK_W + z) * CHUNK_H;
          for (let y = y0; y < y1; y++) {
            const id = chunk.blocks[base + y];
            if (id === 0) continue;
            const rk = F.renderKind[id];
            if (rk === RK_CUBE || rk === RK_AIR) continue;
            if (rk === RK_CROSS) this._emitCross(view, bufs, id, x, y, z);
            else if (rk === RK_BOXES) this._emitBoxes(view, bufs, id, x, y, z);
            else if (rk === RK_FLUID) this._emitFluid(view, bufs, id, x, y, z);
          }
        }
      }
    }
  }

  _lightAtBlock(view, x, y, z) {
    const l = view.lightAt(x, y, z);
    return [l >> 4, l & 15, 0];
  }

  /** Two crossed quads, drawn double-sided. */
  _emitCross(view, bufs, id, x, y, z) {
    const buf = bufs[this._passFor(id)];
    const tile = this.tileIndex(id, 2);
    if (tile < 0) return;
    const anim = this.animIndex(id, 2);
    const tint = this._tintFor(view, id, x, z);
    const L = this._lightAtBlock(view, x, y + 1, z);
    const Lb = this._lightAtBlock(view, x, y, z);
    const lights = [Lb, Lb, L, L];
    const F = this.flags;
    let ox = 0, oz = 0;
    if (F.randomOffset[id]) {
      // Deterministic per-position jitter so plants don't sit on a grid.
      const h = ((view.ox + x) * 3129871) ^ ((view.oz + z) * 116129781);
      ox = (((h >> 4) & 15) / 15 - 0.5) * 0.4;
      oz = (((h >> 12) & 15) / 15 - 0.5) * 0.4;
    }
    const norm = F.waving[id] === 2 ? 7 : F.waving[id] === 1 ? 6 : 4;
    const k = 0.5 - 0.7071 * 0.5, K = 0.5 + 0.7071 * 0.5;
    const planes = [
      [[x + k + ox, y, z + k + oz], [x + K + ox, y, z + K + oz], [x + K + ox, y + 1, z + K + oz], [x + k + ox, y + 1, z + k + oz]],
      [[x + K + ox, y, z + k + oz], [x + k + ox, y, z + K + oz], [x + k + ox, y + 1, z + K + oz], [x + K + ox, y + 1, z + k + oz]],
    ];
    const uv = [[0, 1], [1, 1], [1, 0], [0, 0]];
    for (const p of planes) {
      buf.quad(p, uv, tile, lights, tint, anim, norm, false);
      // back face
      buf.quad([p[1], p[0], p[3], p[2]], [uv[1], uv[0], uv[3], uv[2]], tile, [lights[1], lights[0], lights[3], lights[2]], tint, anim, norm, false);
    }
  }

  /** Shape-list blocks. Each box emits up to 6 faces with per-box UV mapping. */
  _emitBoxes(view, bufs, id, x, y, z) {
    const def = this.registry.def(id);
    const F = this.flags;
    const buf = bufs[this._passFor(id)];
    const meta = view.meta(x, y, z);
    const boxes = def.shapeFor ? def.shapeFor(meta) : def.shape;
    if (!boxes) return;
    const tint = this._tintFor(view, id, x, z);
    for (const b of boxes) {
      for (let f = 0; f < 6; f++) {
        const fd = FACE_DATA[f];
        // Cull a box face only when it lies exactly on the block boundary and the
        // neighbour is a full opaque cube.
        const onBoundary =
          (f === 0 && b.x1 >= 1) || (f === 1 && b.x0 <= 0) ||
          (f === 2 && b.y1 >= 1) || (f === 3 && b.y0 <= 0) ||
          (f === 4 && b.z1 >= 1) || (f === 5 && b.z0 <= 0);
        if (onBoundary) {
          const nid = view.get(x + fd.n[0], y + fd.n[1], z + fd.n[2]);
          if (F.renderKind[nid] === RK_CUBE && F.transparent[nid] === 0) continue;
          if (nid === id && F.cullSelf[id]) continue;
        }
        const role = b.faces && b.faces[['px', 'nx', 'py', 'ny', 'pz', 'nz'][f]];
        const tile = role !== undefined && role !== null
          ? this.tileIndex(id, f, role)
          : this.tileIndex(id, f);
        if (tile < 0) continue;
        const anim = this.animIndex(id, f);
        // Corner positions inside the box.
        const corners = [];
        for (let c = 0; c < 4; c++) {
          const v = fd.verts[c];
          corners.push([
            x + (v[0] ? b.x1 : b.x0),
            y + (v[1] ? b.y1 : b.y0),
            z + (v[2] ? b.z1 : b.z0),
          ]);
        }
        // UVs sample the sub-rect of the tile matching the box extent, so a slab
        // shows the bottom half of the texture rather than a squashed whole tile.
        const uvs = boxFaceUVs(b, f);
        const lights = [];
        for (let c = 0; c < 4; c++) {
          const L = this._vertexLight(view, x, y, z, f, c);
          lights.push(L);
        }
        const norm = F.waving[id] === 2 ? 7 : F.waving[id] === 1 ? 6 : f;
        buf.quad(corners, uvs, tile, lights, tint, anim, norm, false);
      }
    }
  }

  /**
   * Fluids: the top face is lowered per corner by the average of the 4 touching
   * fluid columns' levels, which produces the sloped surface look.
   */
  _emitFluid(view, bufs, id, x, y, z) {
    const F = this.flags;
    const buf = bufs[this._passFor(id)];
    const tint = this._tintFor(view, id, x, z);
    const above = view.get(x, y + 1, z);
    const sameAbove = F.fluid[above] === F.fluid[id];
    const level = view.meta(x, y, z) & 15;
    // Corner heights from neighbouring fluid levels (0 = source/full).
    const cornerH = sameAbove ? [1, 1, 1, 1] : [
      this._fluidCorner(view, id, x, y, z, -1, -1),
      this._fluidCorner(view, id, x, y, z, 0, -1),
      this._fluidCorner(view, id, x, y, z, 0, 0),
      this._fluidCorner(view, id, x, y, z, -1, 0),
    ];
    for (let f = 0; f < 6; f++) {
      if (!this._faceVisible(view, id, x, y, z, f)) continue;
      const fd = FACE_DATA[f];
      const tile = this.tileIndex(id, f);
      if (tile < 0) continue;
      const anim = this.animIndex(id, f);
      const corners = [];
      for (let c = 0; c < 4; c++) {
        const v = fd.verts[c];
        let yy = y + v[1];
        if (v[1] === 1 && !sameAbove) {
          // pick the corner height matching this vertex's xz
          const cx = v[0], cz = v[2];
          const hi = (cz === 0 ? (cx === 0 ? 0 : 1) : (cx === 0 ? 3 : 2));
          yy = y + cornerH[hi];
        }
        corners.push([x + v[0], yy, z + v[2]]);
      }
      const uvs = [];
      for (let c = 0; c < 4; c++) {
        const v = fd.verts[c];
        let cu, cv;
        if (f === 2 || f === 3) { cu = v[0]; cv = v[2]; }
        else if (f === 0) { cu = v[2]; cv = 1 - v[1]; }
        else if (f === 1) { cu = 1 - v[2]; cv = 1 - v[1]; }
        else if (f === 4) { cu = v[0]; cv = 1 - v[1]; }
        else { cu = 1 - v[0]; cv = 1 - v[1]; }
        uvs.push([cu, cv]);
      }
      const lights = [];
      for (let c = 0; c < 4; c++) {
        const L = this._vertexLight(view, x, y, z, f, c);
        L[2] = 0; // fluids never get AO — it reads as dirt in the water
        lights.push(L);
      }
      buf.quad(corners, uvs, tile, lights, tint, anim, f === 2 ? 8 : f, false);
    }
  }

  _fluidCorner(view, id, x, y, z, dx, dz) {
    const F = this.flags;
    let sum = 0, n = 0;
    for (let i = 0; i <= 1; i++) {
      for (let j = 0; j <= 1; j++) {
        const nx = x + dx + i, nz = z + dz + j;
        const nid = view.get(nx, y, nz);
        const upId = view.get(nx, y + 1, nz);
        if (F.fluid[upId] === F.fluid[id]) return 1;
        if (F.fluid[nid] === F.fluid[id]) {
          const lvl = view.meta(nx, y, nz) & 15;
          sum += 1 - Math.min(lvl, 7) / 9;
          n++;
        } else if (F.opacity[nid] === 0 && nid !== id) {
          // air lowers the corner slightly so edges taper
          sum += 0.62; n++;
        }
      }
    }
    if (n === 0) return 1 - Math.min(view.meta(x, y, z) & 15, 7) / 9;
    return Math.min(1, sum / n);
  }
}

const WHITE_TINT = [1, 1, 1];

/**
 * UV rect for one face of a sub-cube box, so partial blocks show the matching
 * part of their texture instead of a stretched copy.
 */
function boxFaceUVs(b, f) {
  let u0, u1, v0, v1;
  switch (f) {
    case 0: u0 = b.z0; u1 = b.z1; v0 = 1 - b.y1; v1 = 1 - b.y0; break;
    case 1: u0 = 1 - b.z1; u1 = 1 - b.z0; v0 = 1 - b.y1; v1 = 1 - b.y0; break;
    case 2: u0 = b.x0; u1 = b.x1; v0 = b.z0; v1 = b.z1; break;
    case 3: u0 = b.x0; u1 = b.x1; v0 = 1 - b.z1; v1 = 1 - b.z0; break;
    case 4: u0 = b.x0; u1 = b.x1; v0 = 1 - b.y1; v1 = 1 - b.y0; break;
    default: u0 = 1 - b.x1; u1 = 1 - b.x0; v0 = 1 - b.y1; v1 = 1 - b.y0; break;
  }
  const FD = FACE_DATA[f];
  const out = [];
  for (let c = 0; c < 4; c++) {
    const v = FD.verts[c];
    // Map the cube corner (0/1 per axis) onto the uv rect.
    let su, sv;
    switch (f) {
      case 0: su = v[2]; sv = 1 - v[1]; break;
      case 1: su = 1 - v[2]; sv = 1 - v[1]; break;
      case 2: su = v[0]; sv = v[2]; break;
      case 3: su = v[0]; sv = 1 - v[2]; break;
      case 4: su = v[0]; sv = 1 - v[1]; break;
      default: su = 1 - v[0]; sv = 1 - v[1]; break;
    }
    out.push([u0 + (u1 - u0) * su, v0 + (v1 - v0) * sv]);
  }
  return out;
}

export { FACE_DATA, MeshBuffer };
