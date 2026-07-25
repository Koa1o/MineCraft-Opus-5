// ---------------------------------------------------------------------------
// Dependency-free PNG encoder using only node:zlib and node:fs.
// Supports 8-bit RGBA (colour type 6) with per-scanline filter byte 0.
// ---------------------------------------------------------------------------

import { deflateSync, inflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

// ---------------------------------------------------------------------------
// CRC-32 table (standard polynomial 0xEDB88320, reflected).
// ---------------------------------------------------------------------------
const PNG_CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    t[n] = c;
  }
  return t;
})();

function crc32(buf, start = 0, end = buf.length) {
  let crc = 0xFFFFFFFF;
  for (let i = start; i < end; i++) {
    crc = PNG_CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function writeUint32BE(buf, offset, value) {
  const v = value >>> 0;
  buf[offset] = (v >>> 24) & 0xFF;
  buf[offset + 1] = (v >>> 16) & 0xFF;
  buf[offset + 2] = (v >>> 8) & 0xFF;
  buf[offset + 3] = v & 0xFF;
}

function makeChunk(type, data) {
  // type is a 4-char string; data is a Buffer/Uint8Array
  const typeBytes = Buffer.from(type, 'ascii');
  const len = data.length;
  const chunk = Buffer.allocUnsafe(4 + 4 + len + 4);
  writeUint32BE(chunk, 0, len);
  typeBytes.copy(chunk, 4);
  if (len > 0) Buffer.from(data).copy(chunk, 8);
  // CRC covers type + data
  const crcVal = crc32(chunk, 4, 8 + len);
  writeUint32BE(chunk, 8 + len, crcVal);
  return chunk;
}

// ---------------------------------------------------------------------------
// encodePNG — 8-bit RGBA colour type 6.
// ---------------------------------------------------------------------------
export function encodePNG(width, height, rgbaUint8) {
  // PNG magic bytes
  const magic = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk: 13 bytes
  const ihdr = Buffer.allocUnsafe(13);
  writeUint32BE(ihdr, 0, width);
  writeUint32BE(ihdr, 4, height);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type: RGBA
  ihdr[10] = 0;  // compression method
  ihdr[11] = 0;  // filter method
  ihdr[12] = 0;  // interlace method

  // Build raw image data with filter byte 0 (None) per scanline.
  const bytesPerPixel = 4;
  const rowBytes = width * bytesPerPixel;
  const raw = Buffer.allocUnsafe(height * (1 + rowBytes));
  for (let y = 0; y < height; y++) {
    const rawRow = y * (1 + rowBytes);
    raw[rawRow] = 0; // filter type 0 = None
    const srcRow = y * rowBytes;
    Buffer.from(rgbaUint8).copy(raw, rawRow + 1, srcRow, srcRow + rowBytes);
  }

  // Compress with zlib deflate
  const compressed = deflateSync(raw, { level: 6 });

  // Self-verification: inflate and check byte length.
  const inflated = inflateSync(compressed);
  if (inflated.length !== raw.length) {
    throw new Error(`PNG encoder CRC self-check failed: expected ${raw.length} bytes, got ${inflated.length}`);
  }

  // Assemble chunks
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  const out = Buffer.concat([magic, ihdrChunk, idatChunk, iendChunk]);

  // Verify PNG magic at start of output
  if (out[0] !== 137 || out[1] !== 80 || out[2] !== 78 || out[3] !== 71) {
    throw new Error('PNG encoder: output does not start with PNG magic bytes');
  }

  return out;
}

// ---------------------------------------------------------------------------
// writePNG — encode and write to disk.
// ---------------------------------------------------------------------------
export function writePNG(path, width, height, rgba) {
  const buf = encodePNG(width, height, rgba);
  writeFileSync(path, buf);
}

// ---------------------------------------------------------------------------
// scaleNearest — integer nearest-neighbour upscale.
// ---------------------------------------------------------------------------
export function scaleNearest(rgba, w, h, factor) {
  const f = Math.round(factor);
  const ow = w * f;
  const oh = h * f;
  const out = new Uint8ClampedArray(ow * oh * 4);
  for (let y = 0; y < oh; y++) {
    const sy = Math.floor(y / f);
    for (let x = 0; x < ow; x++) {
      const sx = Math.floor(x / f);
      const si = (sy * w + sx) * 4;
      const di = (y * ow + x) * 4;
      out[di] = rgba[si];
      out[di + 1] = rgba[si + 1];
      out[di + 2] = rgba[si + 2];
      out[di + 3] = rgba[si + 3];
    }
  }
  return { data: out, width: ow, height: oh };
}

// ---------------------------------------------------------------------------
// Tiny 3x5 pixel font for digits 0-9.
// Each digit is a 3-wide x 5-tall bitmap, stored as 5 rows of 3 bits (MSB=left).
// ---------------------------------------------------------------------------
const DIGIT_FONT = [
  // 0
  [0b111, 0b101, 0b101, 0b101, 0b111],
  // 1
  [0b010, 0b110, 0b010, 0b010, 0b111],
  // 2
  [0b111, 0b001, 0b111, 0b100, 0b111],
  // 3
  [0b111, 0b001, 0b111, 0b001, 0b111],
  // 4
  [0b101, 0b101, 0b111, 0b001, 0b001],
  // 5
  [0b111, 0b100, 0b111, 0b001, 0b111],
  // 6
  [0b111, 0b100, 0b111, 0b101, 0b111],
  // 7
  [0b111, 0b001, 0b001, 0b001, 0b001],
  // 8
  [0b111, 0b101, 0b111, 0b101, 0b111],
  // 9
  [0b111, 0b101, 0b111, 0b001, 0b111],
];

/** Draw a decimal number at (px,py) in white on the canvas data (w-wide RGBA). */
function drawLabel(data, canvasW, px, py, num) {
  const digits = String(num).split('').map(Number);
  let cx = px;
  for (const d of digits) {
    const glyph = DIGIT_FONT[d] || DIGIT_FONT[0];
    for (let row = 0; row < 5; row++) {
      const bits = glyph[row];
      for (let col = 0; col < 3; col++) {
        if (bits & (0b100 >> col)) {
          const ix = cx + col;
          const iy = py + row;
          if (ix >= 0 && iy >= 0 && ix < canvasW) {
            const i = (iy * canvasW + ix) * 4;
            data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
          }
        }
      }
    }
    cx += 4; // 3px glyph + 1px kern
  }
}

// ---------------------------------------------------------------------------
// composeGrid — lay tiles out in a grid on a checkerboard background.
// ---------------------------------------------------------------------------
/**
 * @param {Array<{name:string, data:Uint8ClampedArray|Uint8Array, w:number, h:number}>} tiles
 * @param {number} cols number of tile columns
 * @param {number} tileW art width (before scaling)
 * @param {number} tileH art height (before scaling)
 * @param {{scale?:number, pad?:number, labels?:boolean}} opts
 * @returns {{data:Uint8ClampedArray, width:number, height:number}}
 */
export function composeGrid(tiles, cols, tileW, tileH, opts = {}) {
  const scale = opts.scale !== undefined ? opts.scale : 4;
  const pad = opts.pad !== undefined ? opts.pad : 6;
  const labels = !!opts.labels;

  const scaledW = tileW * scale;
  const scaledH = tileH * scale;
  const labelH = labels ? 7 : 0; // 5px font + 2px margin

  // Cell size including padding on right/bottom
  const cellW = scaledW + pad;
  const cellH = scaledH + pad + labelH;

  const rows = Math.ceil(tiles.length / cols);
  const totalW = cols * cellW + pad; // leading pad on left
  const totalH = rows * cellH + pad; // leading pad on top

  const out = new Uint8ClampedArray(totalW * totalH * 4);

  // Fill background with mid-grey 8-px checkerboard (#3a3a3a / #4a4a4a).
  const CHECKER = 8;
  for (let y = 0; y < totalH; y++) {
    for (let x = 0; x < totalW; x++) {
      const even = (((x / CHECKER) | 0) + ((y / CHECKER) | 0)) % 2 === 0;
      const v = even ? 0x3a : 0x4a;
      const i = (y * totalW + x) * 4;
      out[i] = v; out[i + 1] = v; out[i + 2] = v; out[i + 3] = 255;
    }
  }

  // Draw each tile.
  for (let ti = 0; ti < tiles.length; ti++) {
    const tile = tiles[ti];
    const col = ti % cols;
    const row = Math.floor(ti / cols);

    // Origin of scaled tile in canvas
    const ox = pad + col * cellW;
    const oy = pad + row * cellH;

    // Nearest-neighbour upscale of tile data
    const scaled = scaleNearest(tile.data, tile.w, tile.h, scale);

    // Composite scaled tile onto output (alpha blend over checkerboard)
    for (let sy = 0; sy < scaled.height; sy++) {
      for (let sx = 0; sx < scaled.width; sx++) {
        const si = (sy * scaled.width + sx) * 4;
        const dx = ox + sx;
        const dy = oy + sy;
        if (dx < 0 || dy < 0 || dx >= totalW || dy >= totalH) continue;
        const di = (dy * totalW + dx) * 4;
        const sa = scaled.data[si + 3] / 255;
        if (sa >= 1) {
          out[di] = scaled.data[si];
          out[di + 1] = scaled.data[si + 1];
          out[di + 2] = scaled.data[si + 2];
          out[di + 3] = 255;
        } else if (sa > 0) {
          const da = out[di + 3] / 255;
          const oa = sa + da * (1 - sa);
          if (oa > 0) {
            out[di] = ((scaled.data[si] * sa + out[di] * da * (1 - sa)) / oa) | 0;
            out[di + 1] = ((scaled.data[si + 1] * sa + out[di + 1] * da * (1 - sa)) / oa) | 0;
            out[di + 2] = ((scaled.data[si + 2] * sa + out[di + 2] * da * (1 - sa)) / oa) | 0;
            out[di + 3] = (oa * 255) | 0;
          }
        }
      }
    }

    // Draw label below tile
    if (labels) {
      const lx = ox;
      const ly = oy + scaledH + 2;
      drawLabel(out, totalW, lx, ly, ti);
    }
  }

  return { data: out, width: totalW, height: totalH };
}

// ---------------------------------------------------------------------------
// Self-test: encode a 4x4 red PNG to /tmp/t.png.
// ---------------------------------------------------------------------------
if (process.argv[1] && process.argv[1].endsWith('png.mjs')) {
  const w = 4, h = 4;
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = 255;     // R
    rgba[i * 4 + 1] = 0;   // G
    rgba[i * 4 + 2] = 0;   // B
    rgba[i * 4 + 3] = 255; // A
  }
  writePNG('/tmp/t.png', w, h, rgba);
  const { statSync } = await import('node:fs');
  const stat = statSync('/tmp/t.png');
  console.log(`Self-test: wrote /tmp/t.png, byte length = ${stat.size}`);
}
