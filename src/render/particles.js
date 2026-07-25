// ---------------------------------------------------------------------------
// Particle system — object-pooled, single InstancedMesh-style BufferGeometry.
// Accepts THREE as a constructor argument so it is Node-testable.
// All top-level names prefixed PARTICLE_ for concatenation safety.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// PARTICLE KIND DEFINITIONS — defines spawner behaviour for each kind.
// ---------------------------------------------------------------------------
const PARTICLE_KINDS = {
  blockBreak:    { count:[8,12], speed:0.15, gravity:0.04, life:0.4,  drag:0.96, size:0.12, bounce:0.4, collide:true,  color:[1,1,1,1] },
  blockDust:     { count:[4,8],  speed:0.08, gravity:0.01, life:0.5,  drag:0.98, size:0.08, bounce:0,   collide:false, color:[0.8,0.7,0.6,0.9] },
  explosion:     { count:[16,24],speed:0.2,  gravity:0.02, life:0.8,  drag:0.94, size:0.25, bounce:0,   collide:false, color:[0.5,0.5,0.5,0.85] },
  smoke:         { count:[4,8],  speed:0.05, gravity:-0.015,life:1.2, drag:0.97, size:0.18, bounce:0,   collide:false, color:[0.4,0.4,0.4,0.7] },
  largeSmoke:    { count:[6,10], speed:0.04, gravity:-0.02, life:1.8, drag:0.97, size:0.32, bounce:0,   collide:false, color:[0.35,0.35,0.35,0.65] },
  flame:         { count:[4,8],  speed:0.06, gravity:-0.02, life:0.6, drag:0.97, size:0.12, bounce:0,   collide:false, color:[1,0.5,0.1,0.9] },
  lavaDrip:      { count:[1,2],  speed:0.01, gravity:0.04,  life:1.0, drag:0.99, size:0.08, bounce:0,   collide:true,  color:[1,0.3,0.05,1] },
  waterDrip:     { count:[1,2],  speed:0.01, gravity:0.05,  life:0.8, drag:0.99, size:0.06, bounce:0,   collide:true,  color:[0.2,0.5,1.0,0.85] },
  splash:        { count:[6,10], speed:0.12, gravity:0.04,  life:0.4, drag:0.96, size:0.08, bounce:0.3, collide:false, color:[0.4,0.7,1.0,0.8] },
  bubble:        { count:[4,8],  speed:0.03, gravity:-0.025,life:0.7, drag:0.98, size:0.06, bounce:0,   collide:false, color:[0.5,0.8,1.0,0.7] },
  portal:        { count:[8,12], speed:0.07, gravity:0,     life:1.0, drag:0.99, size:0.10, bounce:0,   collide:false, color:[0.5,0.2,1.0,0.85] },
  enchant:       { count:[6,10], speed:0.1,  gravity:-0.01, life:0.9, drag:0.97, size:0.08, bounce:0,   collide:false, color:[0.3,0.1,1.0,0.9] },
  crit:          { count:[8,12], speed:0.15, gravity:0.02,  life:0.4, drag:0.95, size:0.08, bounce:0,   collide:false, color:[1,0.85,0.1,0.95] },
  damageIndicator:{count:[1,2],  speed:0.04, gravity:0.01,  life:0.8, drag:0.99, size:0.14, bounce:0,   collide:false, color:[1,0.15,0.15,1] },
  heart:         { count:[2,4],  speed:0.05, gravity:-0.01, life:0.8, drag:0.99, size:0.12, bounce:0,   collide:false, color:[1,0.3,0.4,1] },
  angry:         { count:[3,5],  speed:0.04, gravity:0,     life:0.7, drag:0.99, size:0.12, bounce:0,   collide:false, color:[1,0.1,0.1,1] },
  note:          { count:[2,4],  speed:0.06, gravity:-0.01, life:0.8, drag:0.99, size:0.12, bounce:0,   collide:false, color:[0.3,1.0,0.6,1] },
  slime:         { count:[4,8],  speed:0.1,  gravity:0.04,  life:0.5, drag:0.96, size:0.1,  bounce:0.5, collide:true,  color:[0.3,0.8,0.3,0.9] },
  snowball:      { count:[4,8],  speed:0.08, gravity:0.03,  life:0.3, drag:0.97, size:0.08, bounce:0,   collide:false, color:[1,1,1,0.9] },
  sweep:         { count:[6,8],  speed:0.12, gravity:0,     life:0.25,drag:0.96, size:0.18, bounce:0,   collide:false, color:[0.7,0.9,1.0,0.85] },
  ash:           { count:[4,8],  speed:0.02, gravity:-0.005,life:2.0, drag:0.99, size:0.05, bounce:0,   collide:false, color:[0.6,0.6,0.6,0.6] },
  spore:         { count:[6,10], speed:0.04, gravity:-0.008,life:1.5, drag:0.99, size:0.06, bounce:0,   collide:false, color:[0.4,0.9,0.5,0.7] },
  firefly:       { count:[1,2],  speed:0.02, gravity:0,     life:3.0, drag:0.99, size:0.05, bounce:0,   collide:false, color:[0.9,1.0,0.3,0.8] },
  dragonBreath:  { count:[12,18],speed:0.12, gravity:-0.01, life:1.2, drag:0.96, size:0.14, bounce:0,   collide:false, color:[0.6,0.1,0.8,0.85] },
  sonicBoom:     { count:[20,30],speed:0.3,  gravity:0,     life:0.5, drag:0.93, size:0.1,  bounce:0,   collide:false, color:[0.2,0.9,1.0,0.9] },
  totem:         { count:[20,30],speed:0.15, gravity:-0.015,life:1.5, drag:0.97, size:0.1,  bounce:0,   collide:false, color:[1,0.85,0.1,1] },
  rain:          { count:[1,2],  speed:0,    gravity:0.18,  life:0.3, drag:1.0,  size:0.04, bounce:0,   collide:true,  color:[0.5,0.7,1.0,0.6] },
  snow:          { count:[1,2],  speed:0.01, gravity:0.03,  life:0.8, drag:0.99, size:0.06, bounce:0,   collide:true,  color:[1,1,1,0.8] },
};

const PARTICLE_POOL_SIZE = 4000;

// ---------------------------------------------------------------------------
// ParticleSystem class
// ---------------------------------------------------------------------------
export class ParticleSystem {
  constructor(THREE, atlas, scene, opts = {}) {
    this._THREE = THREE;
    this._atlas = atlas;
    this._scene = scene;

    // ---- Particle pool (plain objects, pre-allocated) ----
    this._pool = new Array(PARTICLE_POOL_SIZE);
    this._active = new Array(PARTICLE_POOL_SIZE);
    this._activeCount = 0;

    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this._pool[i] = PARTICLE_mkParticle();
    }
    this._freeHead = PARTICLE_POOL_SIZE - 1; // stack pointer
    this._free = this._pool.slice(); // free stack

    // ---- GPU buffers ----
    const geo = new THREE.BufferGeometry();
    // Quad: 2 triangles = 4 verts
    const quadPos = new Float32Array([
      -0.5, -0.5, 0,
       0.5, -0.5, 0,
       0.5,  0.5, 0,
      -0.5,  0.5, 0,
    ]);
    const quadUv = new Float32Array([0,0, 1,0, 1,1, 0,1]);
    const quadIdx = new Uint16Array([0,1,2, 0,2,3]);
    geo.setAttribute('position', new THREE.BufferAttribute(quadPos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(quadUv, 2));
    geo.setIndex(new THREE.BufferAttribute(quadIdx, 1));

    // Per-instance attributes (interleaved separately for clarity)
    this._aOffset = new Float32Array(PARTICLE_POOL_SIZE * 3);
    this._aParams = new Float32Array(PARTICLE_POOL_SIZE * 4); // size, tile, light, alpha (sub-region packed)
    this._aColor  = new Float32Array(PARTICLE_POOL_SIZE * 4);

    const aOff = new THREE.InstancedBufferAttribute(this._aOffset, 3);
    const aPar = new THREE.InstancedBufferAttribute(this._aParams, 4);
    const aCol = new THREE.InstancedBufferAttribute(this._aColor,  4);
    aOff.setUsage && aOff.setUsage(35048); // DYNAMIC_DRAW
    aPar.setUsage && aPar.setUsage(35048);
    aCol.setUsage && aCol.setUsage(35048);
    geo.setAttribute('aOffset', aOff);
    geo.setAttribute('aParams', aPar);
    geo.setAttribute('aColor',  aCol);

    // Shader material using PARTICLE_VERT/PARTICLE_FRAG from shaders.js
    // We accept a material or build a basic one here
    const mat = opts.material || new THREE.ShaderMaterial({
      uniforms: {
        uAtlas: { value: atlas && atlas.texture ? atlas.texture : null },
        uCellsPerRow: { value: 16 },
        uCell: { value: 16 },
        uAtlasSize: { value: 256 },
        uArt: { value: 16 },
        uGamma: { value: 2.2 },
        uSubDiv: { value: 4 },
      },
      vertexShader: opts.vertexShader || PARTICLE_DEFAULT_VERT,
      fragmentShader: opts.fragmentShader || PARTICLE_DEFAULT_FRAG,
      transparent: true,
      depthWrite: false,
      blending: 2, // THREE.AdditiveBlending fallback
    });

    this._mesh = new THREE.Mesh(geo, mat);
    this._mesh.frustumCulled = false;
    this._mesh.renderOrder = 100;
    this._geo = geo;
    this._attrOff = aOff;
    this._attrPar = aPar;
    this._attrCol = aCol;

    if (scene && scene.add) scene.add(this._mesh);
  }

  get count() { return this._activeCount; }

  spawn(kind, x, y, z, count, opts = {}) {
    const def = PARTICLE_KINDS[kind] || PARTICLE_KINDS.smoke;
    const spawnCount = count != null ? count :
      def.count[0] + Math.floor(Math.random() * (def.count[1] - def.count[0] + 1));

    for (let i = 0; i < spawnCount; i++) {
      if (this._activeCount >= PARTICLE_POOL_SIZE) break;
      const p = this._free.length ? this._free.pop() : null;
      if (!p) break;

      // initialise particle
      p.x = x + (Math.random() - 0.5) * 0.4;
      p.y = y + (Math.random() - 0.5) * 0.4;
      p.z = z + (Math.random() - 0.5) * 0.4;

      const spd = (opts.speed != null ? opts.speed : def.speed);
      // portal: spiral inward
      if (kind === 'portal') {
        const angle = Math.random() * Math.PI * 2;
        const r = 1.5 + Math.random() * 0.5;
        p.x = x + Math.cos(angle) * r;
        p.z = z + Math.sin(angle) * r;
        p.vx = (x - p.x) * 0.06;
        p.vy = (Math.random() - 0.5) * 0.04;
        p.vz = (z - p.z) * 0.06;
      } else {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        p.vx = Math.sin(phi) * Math.cos(theta) * spd * (0.5 + Math.random() * 0.5);
        p.vy = Math.cos(phi) * spd * (0.5 + Math.random() * 0.5);
        p.vz = Math.sin(phi) * Math.sin(theta) * spd * (0.5 + Math.random() * 0.5);
      }
      // rain: fall straight down with tiny horizontal drift
      if (kind === 'rain' || kind === 'snow') {
        p.vx = (Math.random() - 0.5) * 0.02;
        p.vy = -(Math.random() * 0.1 + 0.05);
        p.vz = (Math.random() - 0.5) * 0.02;
      }

      p.gravity = opts.gravity != null ? opts.gravity : def.gravity;
      p.drag    = def.drag;
      p.bounce  = def.bounce;
      p.collide = opts.collide != null ? opts.collide : def.collide;
      p.maxLife = opts.life != null ? opts.life : (def.life * (0.7 + Math.random() * 0.6));
      p.life    = p.maxLife;
      p.size    = opts.size != null ? opts.size : def.size * (0.7 + Math.random() * 0.6);
      p.tile    = opts.tile != null ? opts.tile : 0;
      p.sub     = Math.random(); // packed sub-region selector
      const c = opts.color || def.color;
      p.cr = c[0]; p.cg = c[1]; p.cb = c[2]; p.ca = c[3] != null ? c[3] : 1;
      p.light   = opts.light != null ? opts.light : 1.0;
      p.kind    = kind;
      p.alive   = true;

      this._active[this._activeCount++] = p;
    }
  }

  update(dt, camera) {
    let write = 0;
    for (let i = 0; i < this._activeCount; i++) {
      const p = this._active[i];
      if (!p.alive) continue;

      // Integrate
      p.vy -= p.gravity * dt * 20;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.vz *= p.drag;
      p.x += p.vx * dt * 20;
      p.y += p.vy * dt * 20;
      p.z += p.vz * dt * 20;

      // Bounce (simplified — no real block query in this context)
      if (p.collide && p.y < 0 && p.bounce > 0) {
        p.y = 0;
        p.vy = -p.vy * p.bounce;
        p.vx *= 0.8;
        p.vz *= 0.8;
      }

      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        this._free.push(p);
        continue;
      }

      const t = p.life / p.maxLife;
      const alpha = p.ca * t;
      const idx = write;

      // aOffset
      this._aOffset[idx * 3]     = p.x;
      this._aOffset[idx * 3 + 1] = p.y;
      this._aOffset[idx * 3 + 2] = p.z;

      // aParams: size, tile, light, sub (packed)
      this._aParams[idx * 4]     = p.size * t;
      this._aParams[idx * 4 + 1] = p.tile;
      this._aParams[idx * 4 + 2] = p.light;
      this._aParams[idx * 4 + 3] = p.sub;

      // aColor
      this._aColor[idx * 4]     = p.cr;
      this._aColor[idx * 4 + 1] = p.cg;
      this._aColor[idx * 4 + 2] = p.cb;
      this._aColor[idx * 4 + 3] = alpha;

      this._active[write++] = p;
    }
    this._activeCount = write;

    // Mark GPU buffers dirty
    if (this._attrOff.needsUpdate !== undefined) {
      this._attrOff.needsUpdate = true;
      this._attrPar.needsUpdate = true;
      this._attrCol.needsUpdate = true;
    }

    // Update draw range: each instance = 6 indices (2 triangles)
    if (this._geo.setDrawRange) {
      this._geo.setDrawRange(0, 6 * this._activeCount);
    }
    if (this._mesh.count !== undefined) {
      this._mesh.count = this._activeCount;
    }
  }

  dispose() {
    if (this._scene && this._scene.remove) this._scene.remove(this._mesh);
    if (this._geo.dispose) this._geo.dispose();
  }
}

// ---------------------------------------------------------------------------
// Pool factory helpers
// ---------------------------------------------------------------------------
function PARTICLE_mkParticle() {
  return {
    x: 0, y: 0, z: 0,
    vx: 0, vy: 0, vz: 0,
    gravity: 0.04, drag: 0.97, bounce: 0, collide: false,
    life: 0, maxLife: 1,
    size: 0.1, tile: 0, sub: 0,
    cr: 1, cg: 1, cb: 1, ca: 1,
    light: 1, kind: '', alive: false,
  };
}

// ---------------------------------------------------------------------------
// Fallback inline shaders (matched to the attribute names in shaders.js)
// ---------------------------------------------------------------------------
const PARTICLE_DEFAULT_VERT = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
attribute vec3 aOffset;
attribute vec4 aParams;
attribute vec4 aColor;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uCellsPerRow;
uniform float uCell;
uniform float uAtlasSize;
uniform float uArt;
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
  vec2 sub = vec2(mod(floor(aParams.w * 16.0), 4.0), floor(aParams.w * 4.0)) / 4.0;
  vUv = (vec2(col, row) * uCell) * texel + vec2(gutter)
      + (sub + uv * 0.25) * (uArt * texel);
  vColor = aColor;
  vLight = aParams.z;
  gl_Position = projectionMatrix * mv;
}
`;

const PARTICLE_DEFAULT_FRAG = `
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
