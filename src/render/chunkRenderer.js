// ---------------------------------------------------------------------------
// chunkRenderer.js — GPU-side chunk mesh management and sky dome.
// All module-level helpers prefixed CHUNKREND_.
// ---------------------------------------------------------------------------

import {
  TERRAIN_VERT, buildTerrainFragment,
  SKY_VERT, SKY_FRAG,
} from './shaders.js';

// Chunk dimensions
const CHUNKREND_W = 16;
const CHUNKREND_H = 128;
// Sky dome sphere radius
const CHUNKREND_SKY_RADIUS = 900;

/** Build the three shared terrain materials (opaque / cutout / translucent). */
function CHUNKREND_buildMaterials(THREE, atlasBundle, settings, useGrad, useDeriv) {
  const fragSrc = buildTerrainFragment(useGrad, useDeriv);

  const CHUNKREND_commonUniforms = () => ({
    uAtlas:     { value: atlasBundle.texture },
    uAtlasSize: { value: atlasBundle.atlas.size },
    uCell:      { value: atlasBundle.atlas.cell },
    uArt:       { value: atlasBundle.atlas.art },
    uCellsPerRow: { value: atlasBundle.atlas.cellsPerRow },
    uTime:      { value: 0 },
    uDaylight:  { value: 1 },
    uAmbient:   { value: 0.06 },
    uAoStrength:{ value: settings.ao !== false ? 1 : 0 },
    uFogColor:  { value: [0.6, 0.7, 0.9] },
    uFogNear:   { value: 80 },
    uFogFar:    { value: 160 },
    uFogEnabled:{ value: 1 },
    uGamma:     { value: 1.0 },
    uAlphaTest: { value: 0.0 },
    uOpacity:   { value: 1.0 },
    uCameraPos: { value: [0, 0, 0] },
    uWaveAmp:   { value: 1.0 },
  });

  const opaqueMat = new THREE.RawShaderMaterial({
    vertexShader: TERRAIN_VERT,
    fragmentShader: fragSrc,
    uniforms: CHUNKREND_commonUniforms(),
    side: THREE.FrontSide,
    depthWrite: true,
    transparent: false,
  });
  opaqueMat.uniforms.uAlphaTest.value = 0;
  opaqueMat.uniforms.uOpacity.value = 1;

  const cutoutMat = new THREE.RawShaderMaterial({
    vertexShader: TERRAIN_VERT,
    fragmentShader: fragSrc,
    uniforms: CHUNKREND_commonUniforms(),
    side: THREE.DoubleSide,
    depthWrite: true,
    transparent: false,
  });
  cutoutMat.uniforms.uAlphaTest.value = 0.5;
  cutoutMat.uniforms.uOpacity.value = 1;

  const translucentMat = new THREE.RawShaderMaterial({
    vertexShader: TERRAIN_VERT,
    fragmentShader: fragSrc,
    uniforms: CHUNKREND_commonUniforms(),
    side: THREE.DoubleSide,
    depthWrite: false,
    transparent: true,
  });
  translucentMat.uniforms.uAlphaTest.value = 0.02;
  translucentMat.uniforms.uOpacity.value = 0.8;

  return { opaqueMat, cutoutMat, translucentMat };
}

/** Build a THREE.BufferGeometry from mesher pass data. */
function CHUNKREND_buildGeometry(THREE, passData) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(passData.position, 3));
  geo.setAttribute('aUv',     new THREE.BufferAttribute(passData.aUv, 2));
  geo.setAttribute('aTile',   new THREE.BufferAttribute(passData.aTile, 1));
  geo.setAttribute('aLight',  new THREE.BufferAttribute(passData.aLight, 3));
  geo.setAttribute('aTint',   new THREE.BufferAttribute(passData.aTint, 3));
  geo.setAttribute('aAnim',   new THREE.BufferAttribute(passData.aAnim, 1));
  geo.setAttribute('aNormal', new THREE.BufferAttribute(passData.aNormal, 1));

  // Use Uint32 index when vertex count > 65535
  if (passData.index instanceof Uint32Array) {
    geo.setIndex(new THREE.Uint32BufferAttribute(passData.index, 1));
  } else {
    geo.setIndex(new THREE.Uint16BufferAttribute(passData.index, 1));
  }

  // Compute a simple bounding sphere for frustum culling
  geo.computeBoundingSphere();
  return geo;
}

// ---------------------------------------------------------------------------
// ChunkRenderer
// ---------------------------------------------------------------------------
export class ChunkRenderer {
  constructor(THREE, scene, atlasBundle, settings) {
    this._THREE = THREE;
    this._scene = scene;
    this._atlasBundle = atlasBundle;
    this._settings = settings || {};

    // Check for the texture-LOD gradient extension. Prefer the real renderer's
    // context (passed via settings.renderer) and fall back to a probe canvas.
    // Everything is wrapped defensively: a missing or stubbed GL context must
    // degrade to the non-gradient shader path, never throw during boot.
    let useGrad = false, useDeriv = false;
    try {
      let gl = null;
      const r = this._settings.renderer;
      if (r && typeof r.getContext === 'function') gl = r.getContext();
      if (!gl && typeof document !== 'undefined') {
        const probe = document.createElement('canvas');
        if (probe && typeof probe.getContext === 'function') {
          gl = probe.getContext('webgl2') || probe.getContext('webgl');
        }
      }
      if (gl && typeof gl.getExtension === 'function') {
        // Both are needed for explicit-gradient sampling; either missing means
        // we fall back to plain texture2D (driver picks the mip level).
        useGrad = !!gl.getExtension('EXT_shader_texture_lod');
        useDeriv = !!gl.getExtension('OES_standard_derivatives');
      }
    } catch (e) {
      useGrad = false; useDeriv = false;
    }

    const mats = CHUNKREND_buildMaterials(
      THREE, atlasBundle, this._settings, useGrad, useDeriv,
    );
    this._opaqueMat = mats.opaqueMat;
    this._cutoutMat = mats.cutoutMat;
    this._translucentMat = mats.translucentMat;

    // Map: chunkKey -> { opaque, cutout, translucent } mesh sets
    this._chunkMeshes = new Map();

    // Frustum
    this._frustum = new THREE.Frustum();
    this._projScreenMatrix = new THREE.Matrix4();

    // Stats
    this._meshCount = 0;
    this._visibleCount = 0;
    this._triangles = 0;
    this._disposeCount = 0;
  }

  get stats() {
    return {
      meshCount: this._meshCount,
      visibleCount: this._visibleCount,
      triangles: this._triangles,
      disposeCount: this._disposeCount,
    };
  }

  /** Sync a chunk's mesh data to the GPU. */
  syncChunk(chunk, meshData) {
    const THREE = this._THREE;
    const key = CHUNKREND_chunkKey(chunk.cx, chunk.cz);
    const ox = chunk.cx * CHUNKREND_W;
    const oz = chunk.cz * CHUNKREND_W;

    // Remove existing meshes for this chunk
    this._removeChunkMeshes(key);

    if (!meshData) return;

    const passes = [
      { name: 'opaque',     data: meshData.opaque,     mat: this._opaqueMat,     renderOrder: 0 },
      { name: 'cutout',     data: meshData.cutout,     mat: this._cutoutMat,     renderOrder: 1 },
      { name: 'translucent',data: meshData.translucent,mat: this._translucentMat,renderOrder: 2 },
    ];

    const meshSet = { meshes: [], key };
    for (const { name, data, mat, renderOrder } of passes) {
      if (!data || !data.vertexCount) continue;
      const geo = CHUNKREND_buildGeometry(THREE, data);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(ox, 0, oz);
      mesh.frustumCulled = false; // We do manual frustum culling
      mesh.renderOrder = renderOrder;
      mesh.name = `chunk_${name}_${chunk.cx}_${chunk.cz}`;
      // Store bounding sphere in world space for frustum culling
      mesh.userData.cx = chunk.cx;
      mesh.userData.cz = chunk.cz;
      mesh.userData.boundingSphere = CHUNKREND_chunkBoundingSphere(THREE, chunk.cx, chunk.cz, meshData);
      this._scene.add(mesh);
      meshSet.meshes.push(mesh);
    }

    if (meshSet.meshes.length > 0) {
      this._chunkMeshes.set(key, meshSet);
    }
    this._updateStats();
  }

  /** Remove all meshes for a chunk. */
  removeChunk(chunk) {
    const key = CHUNKREND_chunkKey(chunk.cx, chunk.cz);
    this._removeChunkMeshes(key);
    this._updateStats();
  }

  _removeChunkMeshes(key) {
    const existing = this._chunkMeshes.get(key);
    if (existing) {
      for (const mesh of existing.meshes) {
        this._scene.remove(mesh);
        if (mesh.geometry) {
          mesh.geometry.dispose();
          this._disposeCount++;
        }
      }
      this._chunkMeshes.delete(key);
    }
  }

  /** Update per-frame uniforms and frustum culling. */
  updateUniforms(world, camera, dt) {
    const THREE = this._THREE;
    const time = (world.tickCount / 20) + (world.tickAlpha || 0) / 20;
    const daylight = world.daylight != null ? world.daylight : 1;
    const colors = world.skyColors ? world.skyColors() : { fog: [0.6, 0.7, 0.9] };
    const fogColor = colors.fog || [0.6, 0.7, 0.9];
    const rd = (world.settings && world.settings.renderDistance) || 8;
    const fogNear = rd * 16 * 0.5;
    const fogFar = rd * 16 * 0.95;
    const fogEnabled = this._settings.fog !== false ? 1 : 0;
    const gamma = this._settings.gamma || 1.0;
    const aoStrength = this._settings.ao !== false ? 1 : 0;
    const cpos = camera.position;

    // Compute the frustum from the camera.
    //
    // The camera was moved earlier this frame, and WebGLRenderer.render() is
    // what normally refreshes matrixWorld / matrixWorldInverse — but that runs
    // AFTER this culling pass. Using the stale inverse tests every chunk against
    // where the camera used to be, which can cull geometry that is actually on
    // screen. Refresh it here so culling matches what is about to be drawn.
    if (camera.updateMatrixWorld) camera.updateMatrixWorld(true);
    if (camera.matrixWorldInverse && camera.matrixWorld
        && typeof camera.matrixWorldInverse.copy === 'function') {
      camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    }
    this._projScreenMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    this._frustum.setFromProjectionMatrix(this._projScreenMatrix);

    // Update all shared materials
    for (const mat of [this._opaqueMat, this._cutoutMat, this._translucentMat]) {
      const u = mat.uniforms;
      u.uTime.value = time;
      u.uDaylight.value = daylight;
      u.uFogColor.value = fogColor;
      u.uFogNear.value = fogNear;
      u.uFogFar.value = fogFar;
      u.uFogEnabled.value = fogEnabled;
      u.uGamma.value = gamma;
      u.uAoStrength.value = aoStrength;
      u.uCameraPos.value = [cpos.x, cpos.y, cpos.z];
    }

    // Frustum cull
    let visible = 0, tris = 0;
    for (const meshSet of this._chunkMeshes.values()) {
      const sphere = meshSet.meshes.length > 0
        ? meshSet.meshes[0].userData.boundingSphere
        : null;
      const inFrustum = !sphere || this._frustum.intersectsSphere(sphere);
      for (const mesh of meshSet.meshes) {
        mesh.visible = inFrustum;
        if (inFrustum) {
          visible++;
          if (mesh.geometry && mesh.geometry.index) {
            tris += Math.floor(mesh.geometry.index.count / 3);
          }
        }
      }
    }
    this._visibleCount = visible;
    this._triangles = tris;
  }

  _updateStats() {
    this._meshCount = 0;
    for (const ms of this._chunkMeshes.values()) this._meshCount += ms.meshes.length;
  }

  dispose() {
    for (const meshSet of this._chunkMeshes.values()) {
      for (const mesh of meshSet.meshes) {
        this._scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
      }
    }
    this._chunkMeshes.clear();
    this._opaqueMat.dispose();
    this._cutoutMat.dispose();
    this._translucentMat.dispose();
  }
}

/**
 * Bounding sphere for a chunk's ACTUAL geometry, in world space.
 *
 * A sphere covering the full 16x128x16 column has a 65-block radius centred at
 * y=64. Terrain only occupies a thin band of that column, so such a sphere
 * overlaps the view frustum from almost anywhere and culling rejects nothing
 * (measured: 82 of 82 chunks "visible" in every direction, including straight
 * up). Fitting the sphere to the geometry's real vertical extent is what makes
 * culling actually cull.
 *
 * @param {object} meshData mesher output, used for its real Y bounds
 */
function CHUNKREND_chunkBoundingSphere(THREE, cx, cz, meshData) {
  const ox = cx * CHUNKREND_W + CHUNKREND_W / 2;
  const oz = cz * CHUNKREND_W + CHUNKREND_W / 2;

  // Scan the emitted vertices for the true vertical span.
  let minY = Infinity, maxY = -Infinity;
  if (meshData) {
    for (const key of ['opaque', 'cutout', 'translucent']) {
      const pass = meshData[key];
      if (!pass || !pass.position) continue;
      const pos = pass.position;
      for (let i = 1; i < pos.length; i += 3) {
        const y = pos[i];
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!isFinite(minY)) { minY = 0; maxY = CHUNKREND_H; }

  const oy = (minY + maxY) / 2;
  const halfY = Math.max(0.5, (maxY - minY) / 2);
  const halfXZ = CHUNKREND_W / 2;
  const r = Math.sqrt(halfXZ * halfXZ + halfY * halfY + halfXZ * halfXZ);
  return new THREE.Sphere(new THREE.Vector3(ox, oy, oz), r);
}

function CHUNKREND_chunkKey(cx, cz) {
  return (cx & 0xffff) | ((cz & 0xffff) << 16);
}

// ---------------------------------------------------------------------------
// SkyRenderer
// ---------------------------------------------------------------------------
export class SkyRenderer {
  constructor(THREE, scene) {
    this._THREE = THREE;
    this._scene = scene;
    this._mesh = null;
    this._mat = null;
    this._build();
  }

  _build() {
    const THREE = this._THREE;
    // Inward-facing sphere — negative scale makes faces inward
    const geo = new THREE.SphereGeometry(CHUNKREND_SKY_RADIUS, 32, 16);
    this._mat = new THREE.RawShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      uniforms: {
        uTop:      { value: [0.1, 0.2, 0.5] },
        uHorizon:  { value: [0.5, 0.65, 0.85] },
        uSunDir:   { value: [0, 1, 0] },
        uStarAlpha:{ value: 0 },
        uSunSize:  { value: 0.008 },
        uSunColor: { value: [1.0, 0.95, 0.8] },
        uVoid:     { value: 0 },
      },
      side: THREE.BackSide,
      depthWrite: false,
    });
    this._mesh = new THREE.Mesh(geo, this._mat);
    this._mesh.renderOrder = -100;
    this._mesh.frustumCulled = false;
    this._scene.add(this._mesh);
  }

  update(world, camera) {
    if (!this._mat) return;
    const u = this._mat.uniforms;
    const dimension = world.dimension || 'overworld';
    const colors = world.skyColors ? world.skyColors() : null;

    if (dimension === 'nether') {
      u.uTop.value = [0.18, 0.03, 0.03];
      u.uHorizon.value = [0.24, 0.05, 0.04];
      u.uSunDir.value = [0, 1, 0];
      u.uStarAlpha.value = 0;
      u.uSunSize.value = 0;
      u.uSunColor.value = [0, 0, 0];
      u.uVoid.value = 0;
    } else if (dimension === 'end') {
      u.uTop.value = [0.03, 0.02, 0.05];
      u.uHorizon.value = [0.06, 0.04, 0.09];
      u.uSunDir.value = [0, 1, 0];
      u.uStarAlpha.value = 0;
      u.uSunSize.value = 0;
      u.uSunColor.value = [0, 0, 0];
      u.uVoid.value = 1;
    } else {
      // Overworld
      const top = (colors && colors.top) || [0.1, 0.2, 0.5];
      const horizon = (colors && colors.horizon) || [0.5, 0.65, 0.85];
      u.uTop.value = top;
      u.uHorizon.value = horizon;

      // Sun direction from sunAngle
      const ang = world.sunAngle || 0;
      u.uSunDir.value = [Math.sin(ang) * 0.4, Math.cos(ang), Math.sin(ang) * 0.2];

      // Stars visible at night
      const daylight = world.daylight != null ? world.daylight : 1;
      u.uStarAlpha.value = Math.max(0, 1 - daylight * 4);
      u.uSunSize.value = 0.008;

      // Sun color warm at sunset/sunrise, white at noon
      const t = (world.dayTime01 || 0);
      const dawnDusk = Math.max(0, 1 - Math.abs(t - 0.25) * 8) + Math.max(0, 1 - Math.abs(t - 0.75) * 8);
      u.uSunColor.value = [
        1.0,
        0.95 - dawnDusk * 0.35,
        0.8 - dawnDusk * 0.5,
      ];
      u.uVoid.value = 0;
    }

    // Sky dome follows the camera so it never moves relative to the viewer
    if (camera) this._mesh.position.copy(camera.position);
  }

  dispose() {
    if (this._mesh) {
      this._scene.remove(this._mesh);
      if (this._mesh.geometry) this._mesh.geometry.dispose();
      if (this._mat) this._mat.dispose();
    }
  }
}
