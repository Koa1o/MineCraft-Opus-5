// ---------------------------------------------------------------------------
// entityRenderer.js — renders entities using THREE.js groups and box meshes.
// All module-level helpers prefixed ENTREND_.
// ---------------------------------------------------------------------------

import { ENTITY_VERT, ENTITY_FRAG } from './shaders.js';
import { MODELS } from '../entities/model.js';
import { MOB_UV_FACE } from '../entities/model.js';
import { MOB_SKIN_W, MOB_SKIN_H } from '../entities/model.js';
import { animateEntity } from '../entities/animator.js';
import { buildMobSkinTexture } from '../textures/buildAtlas.js';

const ENTREND_MODEL_SCALE = 1 / 16;
const ENTREND_SHADOW_ALPHA = 0.4;
const ENTREND_MAX_RENDER_DIST = 64;

// Group pool: mobType -> [Group, ...]
const ENTREND_groupPool = new Map();
// Skin texture cache: skinName -> {texture, rows}
const ENTREND_skinTexCache = new Map();
// Geometry cache: modelName -> {partGeometries}
const ENTREND_geoCache = new Map();

/** Shortest-angle interpolation between two angles in radians. */
function ENTREND_lerpAngle(a, b, t) {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

/** Build UV coordinates for one box face on the skin sheet. */
function ENTREND_computeFaceUVs(p, face, skinW, skinH) {
  const r = MOB_UV_FACE(p, face);
  // Inset by 0.5 texel to avoid bleeding
  const texelW = 1 / skinW;
  const texelH = 1 / skinH;
  const inset = 0.5;
  const x0 = (r.x + inset * texelW * skinW) / skinW;
  const y0 = (r.y + inset * texelH * skinH) / skinH;
  const x1 = (r.x + r.w - inset * texelW * skinW) / skinW;
  const y1 = (r.y + r.h - inset * texelH * skinH) / skinH;
  // Return [u0,v0, u1,v0, u1,v1, u0,v1] for a quad
  return [x0, y0, x1, y0, x1, y1, x0, y1];
}

/**
 * Build a BoxGeometry with custom UVs matching the skin sheet layout.
 * THREE BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
 * Each face has 4 vertices.
 */
function ENTREND_buildPartGeometry(THREE, p, skinW, skinH) {
  const [w, h, d] = p.size;
  const bw = w * ENTREND_MODEL_SCALE;
  const bh = h * ENTREND_MODEL_SCALE;
  const bd = d * ENTREND_MODEL_SCALE;

  // Face indices in three BoxGeometry order: +X=0, -X=1, +Y=2, -Y=3, +Z=4, -Z=5
  // Skin face constants: MP_PX=0, MP_NX=1, MP_PY=2, MP_NY=3, MP_PZ=4, MP_NZ=5
  const faceOrder = [0, 1, 2, 3, 4, 5]; // mp_px ... mp_nz

  // Build a BoxGeometry and override its UVs
  const geo = new THREE.BoxGeometry(bw, bh, bd);

  // The BoxGeometry UV attribute has 4 verts per face * 6 faces = 24 UVs
  const uvArray = new Float32Array(24 * 2);

  for (let fi = 0; fi < 6; fi++) {
    const skinFace = faceOrder[fi];
    const uvs = ENTREND_computeFaceUVs(p, skinFace, skinW, skinH);
    // Box face i starts at vertex i*4
    const base = fi * 4 * 2;
    // Three's BoxGeometry UV layout per face (CCW): BL, BR, TL, TR
    // [u0,v1, u1,v1, u0,v0, u1,v0]
    // We map uvs=[x0,y0, x1,y0, x1,y1, x0,y1] (TL, TR, BR, BL skin space)
    // skinY: 0 is top in our UV rects; THREE uses flipY, so v is inverted
    const x0 = uvs[0], y0 = uvs[1], x1 = uvs[2], y1 = uvs[5];
    uvArray[base + 0] = x0; uvArray[base + 1] = 1 - y1;
    uvArray[base + 2] = x1; uvArray[base + 3] = 1 - y1;
    uvArray[base + 4] = x0; uvArray[base + 5] = 1 - y0;
    uvArray[base + 6] = x1; uvArray[base + 7] = 1 - y0;
  }

  const uvAttr = geo.getAttribute('uv');
  if (uvAttr) {
    for (let i = 0; i < 24 * 2; i++) uvAttr.array[i] = uvArray[i];
    uvAttr.needsUpdate = true;
  }

  return geo;
}

/** Get or build geometry cache for a model. */
function ENTREND_getModelGeos(THREE, modelName, model) {
  if (ENTREND_geoCache.has(modelName)) return ENTREND_geoCache.get(modelName);
  const geos = {};
  for (const p of model.parts) {
    geos[p.name] = ENTREND_buildPartGeometry(THREE, p, MOB_SKIN_W, MOB_SKIN_H);
  }
  ENTREND_geoCache.set(modelName, geos);
  return geos;
}

/** Build an entity material. */
function ENTREND_buildEntityMat(THREE, skinTex, variants, light, hurt, alpha) {
  return new THREE.RawShaderMaterial({
    vertexShader: ENTITY_VERT,
    fragmentShader: ENTITY_FRAG,
    uniforms: {
      uSkin:     { value: skinTex },
      uSkinRow:  { value: 0 },
      uSkinRows: { value: variants },
      uLight:    { value: light },
      uHurt:     { value: hurt },
      uAlpha:    { value: alpha },
      uFogColor: { value: [0.6, 0.7, 0.9] },
      uFogNear:  { value: 80 },
      uFogFar:   { value: 160 },
      uFogEnabled: { value: 1 },
      uGamma:    { value: 1.0 },
    },
    transparent: true,
    depthWrite: true,
    side: THREE.FrontSide,
  });
}

/** Build a Group for a mob entity type. */
function ENTREND_buildEntityGroup(THREE, entity, model, skinResult) {
  const group = new THREE.Group();
  const geos = ENTREND_getModelGeos(THREE, entity.type, model);
  const mat = ENTREND_buildEntityMat(
    THREE,
    skinResult.texture,
    skinResult.rows,
    1.0, 0.0, 1.0,
  );

  for (const p of model.parts) {
    if (p.hidden) continue;
    const geo = geos[p.name];
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, mat.clone());
    mesh.name = p.name;
    mesh.frustumCulled = false;
    group.add(mesh);
  }

  group.userData.entityType = entity.type;
  group.userData.mat = mat;
  return group;
}

/** Get or create a Group for an entity, using the pool. */
function ENTREND_acquireGroup(THREE, entity, model, skinResult) {
  const pool = ENTREND_groupPool.get(entity.type);
  if (pool && pool.length > 0) {
    return pool.pop();
  }
  return ENTREND_buildEntityGroup(THREE, entity, model, skinResult);
}

/** Return a Group to the pool. */
function ENTREND_releaseGroup(entityType, group) {
  if (!ENTREND_groupPool.has(entityType)) ENTREND_groupPool.set(entityType, []);
  ENTREND_groupPool.get(entityType).push(group);
}

/** Build a circular shadow quad. */
function ENTREND_buildShadowMesh(THREE, radius) {
  const geo = new THREE.PlaneGeometry(radius * 2, radius * 2);
  const mat = new THREE.RawShaderMaterial({
    vertexShader: `precision highp float;
attribute vec3 position;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `precision highp float;
uniform float uShadowAlpha;
void main() {
  gl_FragColor = vec4(0.0, 0.0, 0.0, uShadowAlpha);
}`,
    uniforms: {
      uShadowAlpha: { value: ENTREND_SHADOW_ALPHA },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.frustumCulled = false;
  return mesh;
}

// ---------------------------------------------------------------------------
// EntityRenderer
// ---------------------------------------------------------------------------
export class EntityRenderer {
  constructor(THREE, scene, settings) {
    this._THREE = THREE;
    this._scene = scene;
    this._settings = settings || {};

    // Map: entity.id -> { group, shadow, entity, lastPos }
    this._entityObjects = new Map();

    // Item drop InstancedMesh (one for all item entities)
    this._itemDropMesh = null;
    this._itemDropCount = 0;
    this._itemDropMatrix = new THREE.Matrix4();

    // Stats
    this._entityCount = 0;
    this._visibleCount = 0;
  }

  get stats() {
    return { entityCount: this._entityCount, visibleCount: this._visibleCount };
  }

  sync(world, dt, tickAlpha, camera) {
    const THREE = this._THREE;
    const entities = world.entities || [];
    const camPos = camera ? camera.position : { x: 0, y: 0, z: 0 };
    const maxDist2 = ENTREND_MAX_RENDER_DIST * ENTREND_MAX_RENDER_DIST;
    const fogColor = [0.6, 0.7, 0.9];
    const fogNear = ((world.settings && world.settings.renderDistance) || 8) * 16 * 0.5;
    const fogFar = ((world.settings && world.settings.renderDistance) || 8) * 16 * 0.95;
    const fogEnabled = this._settings.fog !== false ? 1 : 0;
    const gamma = this._settings.gamma || 1.0;

    const seenIds = new Set();

    for (const entity of entities) {
      if (entity.removed || entity.type === 'player') continue;

      // Distance cull
      const dx = entity.pos.x - camPos.x;
      const dy = entity.pos.y - camPos.y;
      const dz = entity.pos.z - camPos.z;
      const dist2 = dx * dx + dy * dy + dz * dz;
      if (dist2 > maxDist2) continue;

      seenIds.add(entity.id);

      // Interpolate position
      const prevPos = entity.prevPos || entity.pos;
      const ix = prevPos.x + (entity.pos.x - prevPos.x) * tickAlpha;
      const iy = prevPos.y + (entity.pos.y - prevPos.y) * tickAlpha;
      const iz = prevPos.z + (entity.pos.z - prevPos.z) * tickAlpha;

      // Get or build entity group
      let obj = this._entityObjects.get(entity.id);
      if (!obj) {
        obj = this._createEntityObject(THREE, entity);
        if (!obj) continue;
        this._entityObjects.set(entity.id, obj);
        this._scene.add(obj.group);
        if (obj.shadow) this._scene.add(obj.shadow);
      }

      // Update position (interpolated)
      obj.group.position.set(ix, iy, iz);

      // Interpolate yaw
      const prevYaw = entity.prevYaw !== undefined ? entity.prevYaw : (entity.yaw || 0);
      const yaw = entity.yaw || 0;
      const interpYaw = ENTREND_lerpAngle(prevYaw, yaw, tickAlpha);
      obj.group.rotation.y = -interpYaw;

      // Apply animation transforms
      const model = obj.model;
      if (model) {
        const transforms = animateEntity(entity, model, dt, {});
        ENTREND_applyTransforms(obj.group, model, transforms, entity);
      }

      // Update material uniforms per entity mesh
      const light = world.getLight
        ? world.getLight(Math.floor(ix), Math.floor(iy), Math.floor(iz)) / 15
        : 1.0;
      const hurt = entity.hurtTime ? Math.min(1, entity.hurtTime / 10) : 0;
      const variant = entity.variant || 0;
      const skinRows = obj.skinRows || 1;

      for (const child of obj.group.children) {
        if (!child.material || !child.material.uniforms) continue;
        const u = child.material.uniforms;
        if (u.uLight) u.uLight.value = light;
        if (u.uHurt) u.uHurt.value = hurt;
        if (u.uSkinRow) u.uSkinRow.value = variant;
        if (u.uSkinRows) u.uSkinRows.value = skinRows;
        if (u.uFogColor) u.uFogColor.value = fogColor;
        if (u.uFogNear) u.uFogNear.value = fogNear;
        if (u.uFogFar) u.uFogFar.value = fogFar;
        if (u.uFogEnabled) u.uFogEnabled.value = fogEnabled;
        if (u.uGamma) u.uGamma.value = gamma;
      }

      // Shadow
      if (obj.shadow) {
        // Find ground height
        let groundY = iy;
        if (world.heightAt) {
          groundY = Math.min(iy, world.heightAt(Math.floor(ix), Math.floor(iz)));
        }
        const shadowDist = iy - groundY;
        const shadowAlpha = Math.max(0, ENTREND_SHADOW_ALPHA * (1 - shadowDist / 8));
        obj.shadow.position.set(ix, groundY + 0.01, iz);
        if (obj.shadow.material && obj.shadow.material.uniforms) {
          obj.shadow.material.uniforms.uShadowAlpha.value = shadowAlpha;
        }
      }
    }

    // Remove entities no longer present
    for (const [id, obj] of this._entityObjects) {
      if (!seenIds.has(id)) {
        this._scene.remove(obj.group);
        if (obj.shadow) this._scene.remove(obj.shadow);
        if (obj.entity && obj.entity.type) {
          ENTREND_releaseGroup(obj.entity.type, obj.group);
        }
        this._entityObjects.delete(id);
      }
    }

    this._entityCount = this._entityObjects.size;
    this._visibleCount = this._entityCount;
  }

  _createEntityObject(THREE, entity) {
    const def = entity.def || {};
    const modelName = def.model || entity.type;
    const model = MODELS[modelName];
    const skinName = def.skin || entity.type;
    const variantCount = def.variants || 1;

    let skinResult;
    const cacheKey = skinName + ':' + variantCount;
    if (ENTREND_skinTexCache.has(cacheKey)) {
      skinResult = ENTREND_skinTexCache.get(cacheKey);
    } else {
      try {
        skinResult = buildMobSkinTexture(THREE, skinName, variantCount);
        ENTREND_skinTexCache.set(cacheKey, skinResult);
      } catch (e) {
        // Fallback skin
        const fallbackTex = new THREE.DataTexture(
          new Uint8ClampedArray(64 * 64 * 4).fill(200),
          64, 64, THREE.RGBAFormat,
        );
        fallbackTex.needsUpdate = true;
        skinResult = { texture: fallbackTex, rows: 1 };
      }
    }

    if (!model) {
      // Simple cube for unknown mobs
      const geo = new THREE.BoxGeometry(0.5, 0.9, 0.5);
      const mat = new THREE.RawShaderMaterial({
        vertexShader: ENTITY_VERT,
        fragmentShader: ENTITY_FRAG,
        uniforms: {
          uSkin: { value: skinResult.texture },
          uSkinRow: { value: 0 },
          uSkinRows: { value: skinResult.rows },
          uLight: { value: 1 },
          uHurt: { value: 0 },
          uAlpha: { value: 1 },
          uFogColor: { value: [0.6, 0.7, 0.9] },
          uFogNear: { value: 80 },
          uFogFar: { value: 160 },
          uFogEnabled: { value: 0 },
          uGamma: { value: 1 },
        },
        transparent: true,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      const group = new THREE.Group();
      group.add(mesh);
      const shadow = ENTREND_buildShadowMesh(THREE, 0.4);
      return { group, shadow, entity, model: null, skinRows: skinResult.rows };
    }

    // Try to get a pooled group
    let group = null;
    const pool = ENTREND_groupPool.get(entity.type);
    if (pool && pool.length > 0) {
      group = pool.pop();
    } else {
      group = ENTREND_buildEntityGroup(THREE, entity, model, skinResult);
    }

    const shadowRadius = model.shadowRadius || 0.4;
    const shadow = ENTREND_buildShadowMesh(THREE, shadowRadius);

    return { group, shadow, entity, model, skinRows: skinResult.rows };
  }

  dispose() {
    for (const obj of this._entityObjects.values()) {
      this._scene.remove(obj.group);
      if (obj.shadow) this._scene.remove(obj.shadow);
    }
    this._entityObjects.clear();
  }
}

/** Apply per-part animator transforms to the group's child meshes. */
function ENTREND_applyTransforms(group, model, transforms, entity) {
  const baby = entity.baby || false;
  const dead = entity.dead || false;
  const deathTime = entity.deathTime || 0;
  const babyScale = model.babyHeadScale || 1.6;

  for (const t of transforms) {
    const mesh = group.children.find((c) => c.name === t.name);
    if (!mesh) continue;

    // Position: pivot + animated offset, in world units (already / 16 in animator)
    mesh.position.set(t.px, t.py, t.pz);
    mesh.rotation.set(t.rx, t.ry, t.rz);

    let sx = t.sx, sy = t.sy, sz = t.sz;
    if (baby) {
      // Baby mobs: scale head larger, body smaller
      const p = model.byName && model.byName[t.name];
      if (p) {
        const pn = t.name.toLowerCase();
        if (pn.includes('head')) { sx *= babyScale; sy *= babyScale; sz *= babyScale; }
        else { sx *= 0.6; sy *= 0.6; sz *= 0.6; }
      }
    }

    if (dead && deathTime > 0) {
      // Death rotation: tilt the whole model
      if (t.name === 'body' || t.name === 'torso') {
        const deathAngle = Math.min(1, deathTime / 20) * Math.PI / 2;
        mesh.rotation.z = (mesh.rotation.z || 0) + deathAngle;
      }
    }

    mesh.scale.set(sx, sy, sz);
  }
}
