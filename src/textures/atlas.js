// ---------------------------------------------------------------------------
// Atlas packer.
//
// Every tile is 16x16 art placed in the centre of a 32x32 cell. The 8px gutter
// is filled by replicating the tile edge (and, for tiling materials, by wrapping
// the tile) so that bilinear taps at minification never reach a neighbouring
// tile. On top of that the mip chain is built PER CELL rather than over the whole
// atlas, so a mip level can never average two different blocks together. That is
// the pair of tricks that kills atlas bleeding for good.
//
// Output is raw RGBA data + a manual mipmap list, which is fed to a
// THREE.DataTexture (no canvas needed, so the offline texture-preview tool in
// tools/ runs the identical code path).
// ---------------------------------------------------------------------------

import { makeTile, getPx, setPx } from './px.js';

export const ATLAS_ART = 16;   // art pixels per tile
export const ATLAS_CELL = 32;  // cell pitch (art + 2*gutter)
export const ATLAS_GUTTER = (ATLAS_CELL - ATLAS_ART) / 2; // 8
export const ATLAS_MIP_LEVELS = 4; // 32,16,8,4 -> art 16,8,4,2

export class AtlasBuilder {
  constructor(opts = {}) {
    this.art = opts.art || ATLAS_ART;
    this.cell = opts.cell || ATLAS_CELL;
    this.gutter = (this.cell - this.art) / 2;
    /** @type {{name:string, tile:any, wrap:boolean}[]} */
    this.entries = [];
    this.index = new Map();      // name -> tile index
    this.anim = new Map();        // name -> {frames, speed}
    this.tiles = new Map();       // name -> raw Tile (kept for UI / particles)
  }

  /**
   * Register one tile.
   * @param {string} name unique tile key, e.g. 'grass_top'
   * @param {{w,h,data}} tile 16x16 RGBA tile
   * @param {{wrap?:boolean}} opts wrap=true replicates by tiling (seamless materials)
   * @returns {number} tile index
   */
  add(name, tile, opts = {}) {
    if (this.index.has(name)) {
      // Re-registering is a programming error; surface it loudly during dev.
      throw new Error(`AtlasBuilder: duplicate tile '${name}'`);
    }
    if (!tile || tile.w !== this.art || tile.h !== this.art) {
      throw new Error(`AtlasBuilder: tile '${name}' must be ${this.art}x${this.art}, got ${tile && tile.w}x${tile && tile.h}`);
    }
    const idx = this.entries.length;
    this.entries.push({ name, tile, wrap: opts.wrap !== false });
    this.index.set(name, idx);
    this.tiles.set(name, tile);
    return idx;
  }

  /**
   * Register an animated tile as a sequence of frames stored in consecutive
   * cells. The base name maps to frame 0.
   * @param {number} speed frames per second bucket index 0..7 (see ANIM_SPEEDS)
   */
  addAnimated(name, frames, speed = 1, opts = {}) {
    if (frames.length < 1 || frames.length > 31) {
      throw new Error(`AtlasBuilder: '${name}' frame count must be 1..31, got ${frames.length}`);
    }
    const base = this.add(name, frames[0], opts);
    for (let i = 1; i < frames.length; i++) this.add(`${name}#${i}`, frames[i], opts);
    this.anim.set(name, { frames: frames.length, speed });
    return base;
  }

  has(name) { return this.index.has(name); }

  get(name) {
    const i = this.index.get(name);
    if (i === undefined) throw new Error(`AtlasBuilder: unknown tile '${name}'`);
    return i;
  }

  /** Packed anim byte for the mesher: frames | speed<<5 */
  animByte(name) {
    const a = this.anim.get(name);
    if (!a) return 1;
    return (a.frames & 31) | ((a.speed & 7) << 5);
  }

  /** Raw tile (for particles that need the block's own pixels, and the UI). */
  tile(name) { return this.tiles.get(name); }

  /**
   * Compose the atlas. Returns { size, cells, level0, mipmaps[], index, anim }.
   */
  build() {
    const n = this.entries.length;
    const cells = Math.max(1, Math.ceil(Math.sqrt(n)));
    // Round the cell count up so the atlas edge is a power of two.
    let size = cells * this.cell;
    let pot = 1;
    while (pot < size) pot *= 2;
    size = pot;
    const cellsPerRow = Math.floor(size / this.cell);

    const level0 = new Uint8ClampedArray(size * size * 4);
    for (let i = 0; i < n; i++) {
      const { tile, wrap } = this.entries[i];
      const cx = (i % cellsPerRow) * this.cell;
      const cy = Math.floor(i / cellsPerRow) * this.cell;
      this._placeCell(level0, size, cx, cy, tile, wrap);
    }

    // Manual mip chain, each level downsampled cell-by-cell.
    const mipmaps = [{ data: new Uint8ClampedArray(level0), width: size, height: size }];
    let prev = level0, prevSize = size, prevCell = this.cell;
    for (let lvl = 1; lvl < ATLAS_MIP_LEVELS; lvl++) {
      const nsize = prevSize >> 1;
      const ncell = prevCell >> 1;
      const next = new Uint8ClampedArray(nsize * nsize * 4);
      const rowCells = Math.floor(prevSize / prevCell);
      for (let i = 0; i < n; i++) {
        const scx = (i % rowCells) * prevCell, scy = Math.floor(i / rowCells) * prevCell;
        const dcx = (i % rowCells) * ncell, dcy = Math.floor(i / rowCells) * ncell;
        downsampleCell(prev, prevSize, scx, scy, prevCell, next, nsize, dcx, dcy, ncell);
      }
      mipmaps.push({ data: next, width: nsize, height: nsize });
      prev = next; prevSize = nsize; prevCell = ncell;
    }

    return {
      size, cell: this.cell, art: this.art, gutter: this.gutter, cellsPerRow,
      count: n, mipmaps, index: this.index, anim: this.anim, tiles: this.tiles,
      names: this.entries.map((e) => e.name),
    };
  }

  /** Write one tile into its cell, filling the gutter. */
  _placeCell(out, size, cx, cy, tile, wrap) {
    const g = this.gutter, a = this.art;
    for (let y = 0; y < this.cell; y++) {
      for (let x = 0; x < this.cell; x++) {
        let sx = x - g, sy = y - g;
        if (wrap) {
          sx = ((sx % a) + a) % a;
          sy = ((sy % a) + a) % a;
        } else {
          sx = sx < 0 ? 0 : sx >= a ? a - 1 : sx;
          sy = sy < 0 ? 0 : sy >= a ? a - 1 : sy;
        }
        const s = (sy * a + sx) * 4;
        const d = ((cy + y) * size + (cx + x)) * 4;
        out[d] = tile.data[s];
        out[d + 1] = tile.data[s + 1];
        out[d + 2] = tile.data[s + 2];
        out[d + 3] = tile.data[s + 3];
      }
    }
  }
}

/** 2x2 box downsample of one cell, alpha-weighted so cutout edges stay clean. */
function downsampleCell(src, srcSize, sx, sy, srcCell, dst, dstSize, dx, dy, dstCell) {
  for (let y = 0; y < dstCell; y++) {
    for (let x = 0; x < dstCell; x++) {
      let r = 0, g = 0, b = 0, a = 0, wsum = 0;
      for (let j = 0; j < 2; j++) {
        for (let i = 0; i < 2; i++) {
          const px = sx + x * 2 + i, py = sy + y * 2 + j;
          const s = (py * srcSize + px) * 4;
          const sa = src[s + 3];
          const w = sa / 255;
          r += src[s] * w; g += src[s + 1] * w; b += src[s + 2] * w;
          a += sa; wsum += w;
        }
      }
      const d = ((dy + y) * dstSize + (dx + x)) * 4;
      if (wsum > 0.0001) {
        dst[d] = r / wsum; dst[d + 1] = g / wsum; dst[d + 2] = b / wsum;
      } else {
        dst[d] = 0; dst[d + 1] = 0; dst[d + 2] = 0;
      }
      dst[d + 3] = a / 4;
    }
  }
}

/** Animation speed buckets, in frames per second, indexed by the anim byte. */
export const ANIM_SPEEDS = [0, 4, 8, 12, 2, 16, 24, 6];

/**
 * Build a small standalone RGBA sheet from a list of tiles laid out in a grid.
 * Used for mob skins and item icons, which do not need gutters because their UVs
 * are authored to sit inside the art with a half-texel inset.
 */
export function packSheet(tiles, cols, tileW, tileH) {
  const rows = Math.ceil(tiles.length / cols);
  const w = cols * tileW, h = rows * tileH;
  const out = new Uint8ClampedArray(w * h * 4);
  tiles.forEach((t, i) => {
    const ox = (i % cols) * tileW, oy = Math.floor(i / cols) * tileH;
    for (let y = 0; y < tileH; y++) {
      for (let x = 0; x < tileW; x++) {
        const s = (Math.min(y, t.h - 1) * t.w + Math.min(x, t.w - 1)) * 4;
        const d = ((oy + y) * w + ox + x) * 4;
        out[d] = t.data[s]; out[d + 1] = t.data[s + 1]; out[d + 2] = t.data[s + 2]; out[d + 3] = t.data[s + 3];
      }
    }
  });
  return { data: out, width: w, height: h };
}

/** Upscale a tile by an integer factor with nearest sampling (icon rendering). */
export function upscale(tile, factor) {
  const out = makeTile(tile.w * factor, tile.h * factor);
  for (let y = 0; y < out.h; y++) {
    for (let x = 0; x < out.w; x++) {
      const c = getPx(tile, (x / factor) | 0, (y / factor) | 0);
      setPx(out, x, y, c);
    }
  }
  return out;
}
