// ---------------------------------------------------------------------------
// Voxel terrain shader.
//
// All lighting is baked into vertex attributes by the mesher, so the scene needs
// no THREE lights at all:
//   aLight.x = skylight 0..15,  aLight.y = blocklight 0..15,  aLight.z = AO 0..3
//   aTile    = tile index in the atlas
//   aAnim    = frames | speed<<5  (0/1 = static)
//   aTint    = per-vertex biome tint (rgb, multiplied over the texel)
//
// The vertex shader converts the tile index into an atlas cell origin, and the
// fragment shader samples inside the cell using the interpolated in-tile UV.
// Because each cell has an 8px replicated gutter and its own mip chain, sampling
// can be done with plain texture2D + mipmaps with zero bleeding.
// ---------------------------------------------------------------------------

export const TERRAIN_VERT = /* glsl */`
precision highp float;

attribute vec3 position;
attribute vec2 aUv;        // in-tile uv, may exceed 0..1 for greedy-merged quads
attribute float aTile;     // atlas tile index
attribute vec3 aLight;     // sky, block, ao
attribute vec3 aTint;      // biome tint
attribute float aAnim;     // frames | speed<<5
attribute float aNormal;   // face index 0..5

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform float uCellsPerRow;
uniform float uAtlasSize;
uniform float uCell;
uniform float uArt;
uniform float uDaylight;     // 0..1 sky brightness
uniform float uAmbient;      // minimum light floor
uniform float uAoStrength;   // 0 disables AO
uniform vec3 uCameraPos;
uniform float uWaveAmp;

varying vec2 vUv;
varying vec2 vCellOrigin;
varying vec3 vTint;
varying float vLight;
varying float vFogDepth;
varying float vFaceShade;
varying vec3 vWorldPos;

const float ANIM_SPEEDS[8] = float[8](0.0, 4.0, 8.0, 12.0, 2.0, 16.0, 24.0, 6.0);

void main() {
  // ---- animation: advance the tile index by the current frame
  float frames = mod(aAnim, 32.0);
  float speedIdx = floor(aAnim / 32.0);
  float tile = aTile;
  if (frames > 1.5) {
    float fps = ANIM_SPEEDS[int(speedIdx)];
    float f = floor(mod(uTime * fps, frames));
    tile += f;
  }

  // ---- atlas cell origin in normalised texture space
  float col = mod(tile, uCellsPerRow);
  float row = floor(tile / uCellsPerRow);
  vCellOrigin = vec2(col, row) * (uCell / uAtlasSize);

  // ---- face shading: constant per-face factor so cubes read as 3D even at
  //      uniform light. Matches Minecraft's directional ambient.
  int nf = int(aNormal + 0.5);
  float fs = 1.0;
  if (nf == 2) fs = 1.0;            // +Y top
  else if (nf == 3) fs = 0.55;      // -Y bottom
  else if (nf == 0 || nf == 1) fs = 0.72;  // X sides
  else fs = 0.86;                   // Z sides
  vFaceShade = fs;

  // ---- light: combine skylight*daylight and blocklight, then AO
  float sky = aLight.x / 15.0;
  float blk = aLight.y / 15.0;
  float ao  = 1.0 - (aLight.z / 3.0) * 0.32 * uAoStrength;
  // Blocklight is warm and does not dim at night; skylight follows the sun.
  float lit = max(sky * uDaylight, blk);
  lit = max(lit, uAmbient);
  // Minecraft-style non-linear light falloff.
  lit = lit * lit * (3.0 - 2.0 * lit) * 0.85 + lit * 0.15;
  vLight = lit * ao;

  vTint = aTint;
  vUv = aUv;

  vec3 pos = position;
  // ---- waving plants / fluid surface wobble
  // Encoded in aNormal >= 6: 6 = wave top only, 7 = wave whole, 8 = fluid.
  if (aNormal > 5.5 && uWaveAmp > 0.0) {
    float ph = pos.x * 0.7 + pos.z * 0.9 + uTime * 2.1;
    float amt = (aNormal > 6.5 && aNormal < 7.5) ? 1.0 : fract(pos.y);
    if (aNormal > 7.5) {
      pos.y -= 0.02 + sin(pos.x * 1.3 + pos.z * 1.7 + uTime * 1.6) * 0.02;
    } else {
      pos.x += sin(ph) * 0.055 * amt * uWaveAmp;
      pos.z += cos(ph * 1.13) * 0.045 * amt * uWaveAmp;
    }
    vFaceShade = (aNormal > 7.5) ? 1.0 : 1.0;
  }

  vWorldPos = pos;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vFogDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

export const TERRAIN_FRAG = /* glsl */`
precision highp float;

uniform sampler2D uAtlas;
uniform float uAtlasSize;
uniform float uCell;
uniform float uArt;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uFogEnabled;
uniform float uGamma;
uniform float uAlphaTest;
uniform float uOpacity;

varying vec2 vUv;
varying vec2 vCellOrigin;
varying vec3 vTint;
varying float vLight;
varying float vFogDepth;
varying float vFaceShade;
varying vec3 vWorldPos;

void main() {
  // Wrap the in-tile uv (greedy quads tile the texture across many blocks),
  // then map into the art region of the cell, inset by half a texel.
  vec2 f = fract(vUv);
  float texel = 1.0 / uAtlasSize;
  float gutter = (uCell - uArt) * 0.5 * texel;
  vec2 uv = vCellOrigin + vec2(gutter) + f * (uArt * texel);

  // Manual derivative so the wrap seam does not force a high-detail mip.
  vec2 dx = dFdx(vUv) * uArt * texel;
  vec2 dy = dFdy(vUv) * uArt * texel;
  vec4 texel4 = texture2DGradEXT_FALLBACK(uv, dx, dy);

  vec4 c = texel4;
  if (c.a < uAlphaTest) discard;

  vec3 rgb = c.rgb * vTint * vLight * vFaceShade;
  rgb = pow(rgb, vec3(1.0 / uGamma));

  if (uFogEnabled > 0.5) {
    float fog = clamp((vFogDepth - uFogNear) / max(0.001, uFogFar - uFogNear), 0.0, 1.0);
    fog = fog * fog;
    rgb = mix(rgb, uFogColor, fog);
  }

  gl_FragColor = vec4(rgb, c.a * uOpacity);
}
`;

/**
 * WebGL1 has no textureGrad without an extension, and WebGL2/GLSL3 renames
 * things. Rather than depend on either, the fragment shader above is assembled
 * with a small prelude that defines texture2DGradEXT_FALLBACK appropriately.
 */
export function buildTerrainFragment(useGrad) {
  const prelude = useGrad
    ? `#extension GL_EXT_shader_texture_lod : enable\n` +
      `vec4 texture2DGradEXT_FALLBACK(vec2 uv, vec2 dx, vec2 dy){ return texture2DGradEXT(uAtlas, uv, dx, dy); }\n`
    : `vec4 texture2DGradEXT_FALLBACK(vec2 uv, vec2 dx, vec2 dy){ return texture2D(uAtlas, uv); }\n`;
  // Splice the helper in after the uniform declarations it needs.
  const marker = 'varying vec2 vUv;';
  return TERRAIN_FRAG.replace(marker, prelude + marker);
}

/** Entity / mob shader: skin texture + flat baked light + hurt flash. */
export const ENTITY_VERT = /* glsl */`
precision highp float;
attribute vec3 position;
attribute vec2 uv;
attribute vec3 normal;
#ifdef USE_INSTANCING
attribute mat4 instanceMatrix;
attribute vec4 aInstLight;   // x=light 0..1, y=hurt 0..1, z=skinRow, w=alpha
#endif
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
uniform float uLight;
uniform float uHurt;
uniform float uSkinRow;
uniform float uSkinRows;
uniform float uAlpha;
varying vec2 vUv;
varying float vLight;
varying float vHurt;
varying float vFogDepth;
varying float vAlpha;
void main() {
  vec4 local = vec4(position, 1.0);
  #ifdef USE_INSTANCING
    local = instanceMatrix * local;
    vLight = aInstLight.x;
    vHurt = aInstLight.y;
    float row = aInstLight.z;
    vAlpha = aInstLight.w;
  #else
    vLight = uLight;
    vHurt = uHurt;
    float row = uSkinRow;
    vAlpha = uAlpha;
  #endif
  // Directional shading from the geometry normal keeps limbs readable.
  vec3 n = normalize(normal);
  float nd = 0.62 + 0.38 * clamp(dot(n, normalize(vec3(0.42, 0.86, 0.28))), 0.0, 1.0);
  vLight *= nd;
  vUv = vec2(uv.x, (uv.y + row) / uSkinRows);
  vec4 mv = modelViewMatrix * local;
  vFogDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

export const ENTITY_FRAG = /* glsl */`
precision highp float;
uniform sampler2D uSkin;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uFogEnabled;
uniform float uGamma;
varying vec2 vUv;
varying float vLight;
varying float vHurt;
varying float vFogDepth;
varying float vAlpha;
void main() {
  vec4 c = texture2D(uSkin, vUv);
  if (c.a < 0.35) discard;
  vec3 rgb = c.rgb * max(vLight, 0.08);
  rgb = mix(rgb, vec3(1.0, 0.25, 0.22), vHurt * 0.65);
  rgb = pow(rgb, vec3(1.0 / uGamma));
  if (uFogEnabled > 0.5) {
    float fog = clamp((vFogDepth - uFogNear) / max(0.001, uFogFar - uFogNear), 0.0, 1.0);
    rgb = mix(rgb, uFogColor, fog * fog);
  }
  gl_FragColor = vec4(rgb, c.a * vAlpha);
}
`;

/** Sky dome: vertical gradient + sun/moon disc + stars at night. */
export const SKY_VERT = /* glsl */`
precision highp float;
attribute vec3 position;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const SKY_FRAG = /* glsl */`
precision highp float;
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uSunDir;
uniform float uStarAlpha;
uniform float uSunSize;
uniform vec3 uSunColor;
uniform float uVoid;
varying vec3 vDir;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main() {
  float h = clamp(vDir.y * 1.35 + 0.2, 0.0, 1.0);
  vec3 c = mix(uHorizon, uTop, h);
  // sun / moon disc with a soft corona
  float d = dot(normalize(vDir), normalize(uSunDir));
  float disc = smoothstep(1.0 - uSunSize, 1.0 - uSunSize * 0.45, d);
  float corona = pow(max(d, 0.0), 26.0);
  c += uSunColor * (disc * 1.15 + corona * 0.35);
  // moon opposite the sun
  float dm = dot(normalize(vDir), -normalize(uSunDir));
  float moon = smoothstep(1.0 - uSunSize * 0.6, 1.0 - uSunSize * 0.3, dm);
  c += vec3(0.85, 0.88, 0.95) * moon * uStarAlpha;
  // stars
  if (uStarAlpha > 0.01 && vDir.y > -0.05) {
    vec3 q = floor(normalize(vDir) * 180.0);
    float s = hash(q);
    if (s > 0.9965) {
      float tw = 0.55 + 0.45 * hash(q + 3.7);
      c += vec3(tw) * uStarAlpha;
    }
  }
  c = mix(c, vec3(0.0), uVoid);
  gl_FragColor = vec4(c, 1.0);
}
`;

/** Simple textured-quad shader for particles (billboarded, atlas-sampled). */
export const PARTICLE_VERT = /* glsl */`
precision highp float;
attribute vec3 position;
attribute vec2 uv;
attribute vec3 aOffset;
attribute vec4 aParams;   // x=size, y=tile, z=light, w=alpha
attribute vec4 aColor;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uCellsPerRow;
uniform float uCell;
uniform float uAtlasSize;
uniform float uArt;
uniform float uSubDiv;
varying vec2 vUv;
varying vec4 vColor;
varying float vLight;
void main() {
  vec4 mv = modelViewMatrix * vec4(aOffset, 1.0);
  mv.xy += position.xy * aParams.x;
  float tile = aParams.y;
  float col = mod(tile, uCellsPerRow);
  float row = floor(tile / uCellsPerRow);
  float texel = 1.0 / uAtlasSize;
  float gutter = (uCell - uArt) * 0.5 * texel;
  // Particles show a random 4x4-texel sub-region of the block texture.
  vec2 sub = vec2(mod(floor(aParams.w * 16.0), 4.0), floor(aParams.w * 4.0)) / 4.0;
  vUv = (vec2(col, row) * uCell) * texel + vec2(gutter)
      + (sub + uv * 0.25) * (uArt * texel);
  vColor = aColor;
  vLight = aParams.z;
  gl_Position = projectionMatrix * mv;
}
`;

export const PARTICLE_FRAG = /* glsl */`
precision highp float;
uniform sampler2D uAtlas;
uniform float uGamma;
varying vec2 vUv;
varying vec4 vColor;
varying float vLight;
void main() {
  vec4 c = texture2D(uAtlas, vUv);
  if (c.a < 0.4) discard;
  vec3 rgb = c.rgb * vColor.rgb * max(vLight, 0.1);
  rgb = pow(rgb, vec3(1.0 / uGamma));
  gl_FragColor = vec4(rgb, c.a * vColor.a);
}
`;

/** Flat coloured quad shader — used for solid-colour particles and overlays. */
export const FLAT_VERT = /* glsl */`
precision highp float;
attribute vec3 position;
attribute vec3 aOffset;
attribute vec4 aParams;
attribute vec4 aColor;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
varying vec4 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(aOffset, 1.0);
  mv.xy += position.xy * aParams.x;
  vColor = aColor;
  gl_Position = projectionMatrix * mv;
}
`;

export const FLAT_FRAG = /* glsl */`
precision highp float;
varying vec4 vColor;
void main() { gl_FragColor = vColor; }
`;

/** Block-selection wireframe / crack overlay shader. */
export const OVERLAY_VERT = /* glsl */`
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const OVERLAY_FRAG = /* glsl */`
precision highp float;
uniform sampler2D uTex;
uniform float uAlpha;
uniform vec3 uColor;
uniform float uUseTex;
varying vec2 vUv;
void main() {
  if (uUseTex > 0.5) {
    vec4 c = texture2D(uTex, vUv);
    if (c.a < 0.05) discard;
    gl_FragColor = vec4(c.rgb * uColor, c.a * uAlpha);
  } else {
    gl_FragColor = vec4(uColor, uAlpha);
  }
}
`;
