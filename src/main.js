// ---------------------------------------------------------------------------
// main.js — Game bootstrap and main loop.
// THREE is imported here only (all other files accept it as argument).
// All module-level helpers prefixed MAIN_.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { buildGameAtlas, buildCrackTextures } from './textures/buildAtlas.js';
import { createBlockRegistry } from './world/blockDefs.js';
import { World } from './world/world.js';
import { ChunkRenderer, SkyRenderer } from './render/chunkRenderer.js';
import { EntityRenderer } from './render/entityRenderer.js';
import { ParticleSystem } from './render/particles.js';
import { Player } from './player/player.js';
import { PlayerControls } from './player/controls.js';
import { PlayerInventory } from './player/inventory.js';
import { HUD, InventoryScreen, DebugOverlay, SettingsMenu, PauseMenu, DeathScreen } from './ui/hud.js';
import { AudioEngine } from './audio/sfx.js';
import { WeatherSystem } from './world/weather.js';
import { OVERLAY_VERT, OVERLAY_FRAG } from './render/shaders.js';
import { DimensionManager } from './world/world.js';

// Max pixel ratio to avoid excessive rendering on HiDPI
const MAIN_MAX_PIXEL_RATIO = 2;
const MAIN_AUTOSAVE_INTERVAL = 30000;
const MAIN_TARGET_FOV = 70;
/** Hard ceiling on the pre-gameplay world build, so boot always finishes. */
const MAIN_PREWARM_BUDGET_MS = 6000;
const MAIN_nowMs = (typeof performance !== 'undefined' && performance.now)
  ? () => performance.now()
  : () => Date.now();

// Build a loopback save key
function MAIN_saveKey(seed) {
  return 'mc_save_' + seed;
}

// Lerp helper used in the main loop
function MAIN_lerp(a, b, t) { return a + (b - a) * t; }

// ---------------------------------------------------------------------------
// Selection box wireframe
// ---------------------------------------------------------------------------
function MAIN_buildSelectionBox(THREE) {
  const geo = new THREE.BoxGeometry(1.002, 1.002, 1.002);
  const mat = new THREE.RawShaderMaterial({
    vertexShader: OVERLAY_VERT,
    fragmentShader: OVERLAY_FRAG,
    uniforms: {
      uTex: { value: null },
      uAlpha: { value: 0.4 },
      uColor: { value: [0, 0, 0] },
      uUseTex: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    wireframe: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.visible = false;
  mesh.frustumCulled = false;
  return mesh;
}

// Build a crack overlay mesh (one block face)
function MAIN_buildCrackMesh(THREE) {
  const geo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
  const mat = new THREE.RawShaderMaterial({
    vertexShader: OVERLAY_VERT,
    fragmentShader: OVERLAY_FRAG,
    uniforms: {
      uTex: { value: null },
      uAlpha: { value: 0.8 },
      uColor: { value: [1, 1, 1] },
      uUseTex: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    wireframe: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.visible = false;
  mesh.frustumCulled = false;
  return mesh;
}

// ---------------------------------------------------------------------------
// Game class
// ---------------------------------------------------------------------------
export class Game {
  /**
   * @param {HTMLElement|HTMLCanvasElement} canvasOrParent mount point
   * @param {{onProgress?:(p:number,msg:string)=>void, autoEnter?:boolean}} [opts]
   *   onProgress - splash-screen progress reporter (0..1, message)
   *   autoEnter  - grab pointer lock as soon as start() resolves. Defaults to
   *                true so `new Game(el).start()` alone is a complete boot;
   *                index.html passes false and calls enter() from a click,
   *                because pointer lock requires a user gesture.
   */
  constructor(canvasOrParent, opts = {}) {
    this._canvasOrParent = canvasOrParent;
    this._onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null;
    this._autoEnter = opts.autoEnter !== false;
    this._entered = false;
    this._running = false;
    this._animId = null;
    this._lastTime = null;
    this._loopError = false;

    // Game state
    this.settings = {
      renderDistance: 6,
      fov: MAIN_TARGET_FOV,
      sensitivity: 0.8,
      fog: true,
      ao: true,
      gamma: 1.0,
      viewBob: true,
      masterVolume: 0.5,
      seed: 12345,
      maxMeshPerFrame: 3,
    };

    this.world = null;
    this.player = null;
    this.camera = null;
    this.renderer = null;
    this.scene = null;
    this.atlasBundle = null;
    this.chunkRenderer = null;
    this.skyRenderer = null;
    this.entityRenderer = null;
    this.particles = null;
    this.audio = null;
    this.hud = null;
    this.inventoryScreen = null;
    this.debugOverlay = null;
    this.settingsMenu = null;
    this.pauseMenu = null;
    this.deathScreen = null;
    this._controls = null;
    this._selectionBox = null;
    this._crackMesh = null;
    this._crackTextures = null;
    this._autosaveTimer = 0;
    this._paused = false;
    this._breakProgress = 0;
    this._lastTarget = null;
  }

  /** Report boot progress to whoever is showing a splash screen. */
  _progress(p, msg) {
    if (this._onProgress) {
      try { this._onProgress(p, msg); } catch (e) { /* splash is best-effort */ }
    }
  }

  /**
   * Take pointer lock and start accepting input. Separated from start() because
   * browsers only grant pointer lock inside a user-gesture handler, so the
   * splash screen's Play button calls this.
   */
  enter() {
    if (this._entered) return;
    this._entered = true;
    const c = this._controls || this.controls;
    if (c && c.lock) {
      try { c.lock(); } catch (e) { /* user can click again */ }
    }
    if (this.audio && this.audio.init) {
      // AudioContext also requires a gesture before it will produce sound.
      try { this.audio.init(); if (this.audio.startMusic) this.audio.startMusic(); } catch (e) { /* muted */ }
    }
  }

  async start() {
    // Detect if in a browser environment
    const inBrowser = typeof document !== 'undefined';
    this._progress(0.02, 'creating renderer…');

    let canvas = null;
    let parent = null;

    if (inBrowser) {
      const co = this._canvasOrParent;
      if (co && co.tagName === 'CANVAS') {
        canvas = co;
        parent = co.parentElement || document.body;
      } else if (co) {
        parent = co;
        canvas = document.createElement('canvas');
        canvas.style.display = 'block';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        parent.appendChild(canvas);
      } else {
        parent = document.body;
        canvas = document.createElement('canvas');
        canvas.style.display = 'block';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        parent.appendChild(canvas);
      }
    }

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas || undefined,
      antialias: false,
      powerPreference: 'high-performance',
      alpha: false,
    });
    const pr = Math.min(MAIN_MAX_PIXEL_RATIO, typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1);
    this.renderer.setPixelRatio(pr);
    if (inBrowser) {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      this.settings.fov,
      inBrowser ? window.innerWidth / window.innerHeight : 1,
      0.05, 1200,
    );

    // Scene
    this.scene = new THREE.Scene();

    // Atlas — the single most expensive step of boot (271 painted tiles).
    this._progress(0.08, 'painting texture atlas…');
    this.atlasBundle = buildGameAtlas(THREE, this.renderer);
    this._crackTextures = buildCrackTextures(THREE);

    // Block registry
    this._progress(0.34, 'registering blocks…');
    const { registry, flags } = createBlockRegistry();

    // Build world settings
    const worldSettings = {
      renderDistance: this.settings.renderDistance,
      ao: this.settings.ao,
      smoothLight: true,
      maxMeshPerFrame: this.settings.maxMeshPerFrame,
    };

    // Load save if available
    let savedSeed = this.settings.seed;
    if (inBrowser && typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem(MAIN_saveKey(savedSeed));
        if (saved) {
          const data = JSON.parse(saved);
          if (data && data.seed) savedSeed = data.seed;
        }
      } catch (e) { /* ignore */ }
    }

    // Create world
    this.world = new World({
      seed: savedSeed,
      registry,
      flags,
      dimension: 'overworld',
      atlas: this.atlasBundle.atlas,
      settings: worldSettings,
    });

    // Connect atlas bundle to world for tile lookups
    this.world._tileIndex = (id, face, role) => this.atlasBundle.tileIndex(id, face, role);
    this.world._animIndex = (id, face) => this.atlasBundle.animIndex(id, face);

    // Player
    this.player = new Player(this.world, registry, flags);
    this.player.pos.x = 0;
    this.player.pos.y = 72;
    this.player.pos.z = 0;
    this.player.prevPos.x = 0;
    this.player.prevPos.y = 72;
    this.player.prevPos.z = 0;
    this.world.addEntity(this.player);
    this.world.players.push(this.player);

    // Renderers
    // Pass the real renderer so ChunkRenderer probes the ACTUAL GL context for
    // shader extensions rather than a throwaway canvas (whose capabilities can
    // differ from the live context).
    this.settings.renderer = this.renderer;
    this.chunkRenderer = new ChunkRenderer(THREE, this.scene, this.atlasBundle, this.settings);
    this.skyRenderer = new SkyRenderer(THREE, this.scene);
    this.entityRenderer = new EntityRenderer(THREE, this.scene, this.settings);
    this.particles = new ParticleSystem(THREE, this.atlasBundle.atlas, this.scene, {});

    // Selection box and crack overlay
    this._selectionBox = MAIN_buildSelectionBox(THREE);
    this.scene.add(this._selectionBox);
    this._crackMesh = MAIN_buildCrackMesh(THREE);
    this.scene.add(this._crackMesh);

    // Audio
    if (inBrowser && typeof AudioContext !== 'undefined') {
      try {
        this.audio = new AudioEngine();
        this.audio.setMasterVolume(this.settings.masterVolume);
      } catch (e) { this.audio = null; }
    }

    // Wire world sound/particle sinks
    this.world.setSoundSink((name, x, y, z, opts) => {
      if (this.audio) {
        try { this.audio.play(name, x, y, z, opts); } catch (e) { /* ignore */ }
      }
    });
    this.world.setParticleSink((kind, x, y, z, count, opts) => {
      if (this.particles) {
        try { this.particles.spawn(kind, x, y, z, count, opts); } catch (e) { /* ignore */ }
      }
    });

    // DOM UI
    if (inBrowser && parent) {
      this.hud = new HUD(this);
      this.hud.mount(parent);

      this.inventoryScreen = new InventoryScreen(this);
      this.inventoryScreen.mount(parent);

      this.debugOverlay = new DebugOverlay(this);
      this.debugOverlay.mount(parent);

      this.settingsMenu = new SettingsMenu(this);
      this.settingsMenu.mount(parent);

      this.pauseMenu = new PauseMenu(this);
      this.pauseMenu.mount(parent);

      this.deathScreen = new DeathScreen(this);
      this.deathScreen.mount(parent);

      // Controls. Signature is (player, camera, domElement, settings) — the
      // world/registry are passed per-frame to update(), not to the ctor.
      this._controls = new PlayerControls(
        this.player, this.camera, this.renderer.domElement, this.settings,
      );
      this._controls.attach && this._controls.attach();
      this._registry = registry;
      this._flags = flags;
      MAIN_wireKeyboardEvents(this);

      // Resize handler
      window.addEventListener('resize', () => MAIN_onResize(this));

      // Visibility change: pause when tab hidden
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this._setPaused(true);
      });

      // Pointer lock loss: pause
      this.renderer.domElement.addEventListener('click', () => {
        if (!this._paused && this._controls) {
          this._controls.lock && this._controls.lock();
        }
      });
    }

    // Load save data
    if (inBrowser) this.load();

    // ---- prewarm: generate and mesh the chunks around the spawn point before
    // the first frame, and drop the player onto the real surface. Without this
    // the player free-falls through ungenerated air while chunks stream in.
    this._progress(0.62, 'generating spawn area…');
    if (this.world) {
      // Only prewarm the immediate neighbourhood — enough that the player has
      // ground under their feet and no hole in view. The rest streams in during
      // normal play. Prewarming the full render distance here would block boot
      // for many seconds on a large view distance.
      const fullRD = this.settings.renderDistance;
      this.world.settings.renderDistance = Math.min(fullRD, 3);
      MAIN_prewarm(this, 'generating spawn area…', 0.62, 0.24);
      // Find a DRY standing spot near the origin. heightAt() alone is not
      // enough: over an ocean it returns the sea floor, which would drop the
      // player into water (or into the air above it). Spiral outwards until a
      // column has solid ground with two blocks of air above it.
      if (!this._loadedFromSave) {
        const spot = MAIN_findSpawn(this.world, 0, 0, 96);
        this.player.pos.x = spot.x + 0.5;
        this.player.pos.y = spot.y;
        this.player.pos.z = spot.z + 0.5;
        this.player.prevPos.x = this.player.pos.x;
        this.player.prevPos.y = this.player.pos.y;
        this.player.prevPos.z = this.player.pos.z;
        this.player.vel.x = 0; this.player.vel.y = 0; this.player.vel.z = 0;
        if (this.world.spawnPoint) {
          this.world.spawnPoint.x = this.player.pos.x;
          this.world.spawnPoint.y = this.player.pos.y;
          this.world.spawnPoint.z = this.player.pos.z;
        }
        // The chosen spot may be outside the prewarmed area, so stream again.
        MAIN_prewarm(this, 'preparing spawn…', 0.80, 0.05);
      }
      // Now fill in the FULL view distance before handing control over, with
      // real per-chunk progress. Previously boot stopped at radius 3 and the
      // rest streamed in after the Play button, which is what made the world
      // look like it was still loading (or missing) once you were already in it.
      this.world.settings.renderDistance = fullRD;
      MAIN_prewarmVisible(this, 0.85, 0.12);
    }
    this._progress(0.97, 'starting…');

    // Start loop
    this._running = true;
    this._lastTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    this._tick = this._tick.bind(this);
    if (typeof requestAnimationFrame !== 'undefined') {
      this._animId = requestAnimationFrame(this._tick);
    }
    this._progress(1, 'ready');
    // Standalone boot (no splash screen driving us) enters immediately.
    if (this._autoEnter) this.enter();
  }

  _tick(now) {
    if (!this._running) return;
    this._animId = requestAnimationFrame(this._tick);

    try {
      const dt = Math.min(0.1, (now - this._lastTime) / 1000);
      this._lastTime = now;

      if (!this._paused) {
        MAIN_gameUpdate(this, dt);
      }
      MAIN_gameRender(this, dt);

      // Autosave
      this._autosaveTimer += dt * 1000;
      if (this._autosaveTimer > MAIN_AUTOSAVE_INTERVAL) {
        this._autosaveTimer = 0;
        this.save();
      }
    } catch (err) {
      if (!this._loopError) {
        this._loopError = true;
        console.error('[Game] Loop error:', err);
      }
    }
  }

  _setPaused(p) {
    this._paused = p;
    if (this.pauseMenu) {
      p ? this.pauseMenu.show() : this.pauseMenu.hide();
    }
    if (!p && this._controls && this._controls.lock) {
      this._controls.lock();
    }
  }

  resume() { this._setPaused(false); }

  respawn() {
    if (this.player) {
      this.player.health = this.player.maxHealth;
      this.player.pos.x = 0; this.player.pos.y = 72; this.player.pos.z = 0;
      this.player.dead = false;
      this.player.vel.x = 0; this.player.vel.y = 0; this.player.vel.z = 0;
    }
    if (this.deathScreen) this.deathScreen.hide();
  }

  showTitle() {
    this._setPaused(true);
  }

  save() {
    if (typeof localStorage === 'undefined') return;
    try {
      const data = {
        seed: this.world ? this.world.seed : this.settings.seed,
        playerPos: this.player ? { ...this.player.pos } : null,
        timeOfDay: this.world ? this.world.timeOfDay : 0,
        settings: { ...this.settings },
        inventory: this.player && this.player.inventory && this.player.inventory.serialize
          ? this.player.inventory.serialize() : [],
      };
      localStorage.setItem(MAIN_saveKey(data.seed), JSON.stringify(data));
    } catch (e) { /* quota exceeded etc */ }
  }

  load() {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(MAIN_saveKey(this.settings.seed));
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.playerPos && this.player) {
        this.player.pos.x = data.playerPos.x;
        this.player.pos.y = data.playerPos.y;
        this.player.pos.z = data.playerPos.z;
      }
      if (data.timeOfDay != null && this.world) {
        this.world.timeOfDay = data.timeOfDay;
      }
      if (data.settings) {
        Object.assign(this.settings, data.settings);
      }
      if (data.inventory && this.player && this.player.inventory && this.player.inventory.deserialize) {
        this.player.inventory.deserialize(data.inventory);
      }
    } catch (e) { /* corrupted save */ }
  }

  resetWorld() {
    if (typeof localStorage !== 'undefined') {
      try { localStorage.removeItem(MAIN_saveKey(this.settings.seed)); } catch (e) { /* */ }
    }
    if (typeof location !== 'undefined') location.reload();
  }

  dispose() {
    this._running = false;
    if (this._animId !== null) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
    if (this.chunkRenderer) this.chunkRenderer.dispose();
    if (this.skyRenderer) this.skyRenderer.dispose();
    if (this.entityRenderer) this.entityRenderer.dispose();
    if (this.renderer) this.renderer.dispose();
    if (this.hud) this.hud.dispose();
    if (this.inventoryScreen) this.inventoryScreen.dispose();
    if (this.debugOverlay) this.debugOverlay.dispose();
    if (this.settingsMenu) this.settingsMenu.dispose();
    if (this.pauseMenu) this.pauseMenu.dispose();
    if (this.deathScreen) this.deathScreen.dispose();
  }
}

// ---------------------------------------------------------------------------
// Per-frame game update
// ---------------------------------------------------------------------------
function MAIN_gameUpdate(game, dt) {
  const world = game.world;
  const player = game.player;
  const camera = game.camera;
  const controls = game._controls;

  // Update controls/camera. update() needs the world + registry to raycast the
  // targeted block, so they are threaded through every frame.
  if (controls && controls.update) {
    controls.update(dt, game.world, game._registry);
  }

  // Position camera at player eye height
  if (player && camera) {
    const eyeH = player.eyeHeight != null ? player.eyeHeight : 1.62;
    const px = player.prevPos.x + (player.pos.x - player.prevPos.x) * (world.tickAlpha || 0);
    const py = player.prevPos.y + (player.pos.y - player.prevPos.y) * (world.tickAlpha || 0);
    const pz = player.prevPos.z + (player.pos.z - player.prevPos.z) * (world.tickAlpha || 0);
    camera.position.set(px, py + eyeH, pz);
  }

  // Update world simulation
  if (world && player) {
    world.update(dt, player.pos);
  }

  // ---- upload changed chunk geometry to the GPU (budgeted) ----------------
  // Only chunks the world reports as needing an upload are considered, instead
  // of rescanning every loaded chunk every frame. At render distance 8 that is
  // ~290 chunks, and the old full scan ran on all of them 60x a second.
  if (world && game.chunkRenderer) {
    let budget = game.settings.maxMeshPerFrame || 3;
    const pending = world.pendingUploads;
    if (pending && pending.size) {
      for (const chunk of pending) {
        if (budget <= 0) break;
        if (!chunk.meshed || !chunk.meshData) { pending.delete(chunk); continue; }
        game.chunkRenderer.syncChunk(chunk, chunk.meshData);
        chunk._rendererSynced = true;
        chunk._syncGeneration = chunk._meshGeneration || 0;
        pending.delete(chunk);
        budget--;
      }
    }
  }

  // Drop GPU meshes for chunks the world has unloaded. The world hands us the
  // keys directly, so this no longer walks the whole mesh map each frame.
  if (game.chunkRenderer && world && world.unloadedKeys && world.unloadedKeys.length) {
    for (const key of world.unloadedKeys) game.chunkRenderer._removeChunkMeshes(key);
    world.unloadedKeys.length = 0;
  }

  // Block breaking
  MAIN_updateBreaking(game, dt);

  // Update entity renderer
  if (game.entityRenderer && world) {
    game.entityRenderer.sync(world, dt, world.tickAlpha || 0, camera);
  }

  // Update particles
  if (game.particles) {
    try { game.particles.update(dt, world, camera); } catch (e) { /* */ }
  }

  // Check player death
  if (player && player.health <= 0 && !player.dead) {
    player.dead = true;
    if (game.deathScreen) game.deathScreen.show();
  }

  // Update HUD
  if (game.hud) game.hud.update(dt);
  if (game.inventoryScreen) game.inventoryScreen.update(dt);
  if (game.debugOverlay) game.debugOverlay.update(dt);
  if (game.settingsMenu) game.settingsMenu.update(dt);

  // Audio footsteps, ambient, etc.
  if (game.audio && player && world) {
    MAIN_updateAudio(game, dt);
  }

}

// ---------------------------------------------------------------------------
// Block breaking with crack overlay
// ---------------------------------------------------------------------------
function MAIN_updateBreaking(game, dt) {
  const controls = game._controls;
  const world = game.world;
  const player = game.player;
  if (!controls || !world || !player) return;

  const target = controls.targetBlock || null;

  if (target) {
    // Show selection box
    if (game._selectionBox) {
      game._selectionBox.position.set(target.x + 0.5, target.y + 0.5, target.z + 0.5);
      game._selectionBox.visible = true;
    }

    // Breaking progress
    const isSameTarget = game._lastTarget &&
      game._lastTarget.x === target.x &&
      game._lastTarget.y === target.y &&
      game._lastTarget.z === target.z;

    if (controls.mining && controls.isBreaking) {
      if (!isSameTarget) game._breakProgress = 0;
      const blockId = world.getBlock(target.x, target.y, target.z);
      const def = world.registry && world.registry.def ? world.registry.def(blockId) : null;
      const hardness = def ? (def.hardness || 1) : 1;
      if (hardness >= 0) {
        game._breakProgress += dt / Math.max(0.05, hardness * 1.5);
      }

      const stage = Math.min(9, Math.floor(game._breakProgress * 10));
      if (game._crackMesh && game._crackTextures) {
        game._crackMesh.visible = true;
        game._crackMesh.position.set(target.x + 0.5, target.y + 0.5, target.z + 0.5);
        game._crackMesh.material.uniforms.uTex.value = game._crackTextures[stage];
      }

      if (game._breakProgress >= 1) {
        world.breakBlock(target.x, target.y, target.z, { tool: player.getHeldTool && player.getHeldTool() });
        game._breakProgress = 0;
        if (game._crackMesh) game._crackMesh.visible = false;
      }
    } else {
      game._breakProgress = 0;
      if (game._crackMesh) game._crackMesh.visible = false;
    }
    game._lastTarget = { x: target.x, y: target.y, z: target.z };
  } else {
    if (game._selectionBox) game._selectionBox.visible = false;
    if (game._crackMesh) game._crackMesh.visible = false;
    game._breakProgress = 0;
    game._lastTarget = null;
  }
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function MAIN_gameRender(game, dt) {
  const renderer = game.renderer;
  const scene = game.scene;
  const camera = game.camera;
  const world = game.world;
  if (!renderer || !scene || !camera) return;

  // Sky
  if (game.skyRenderer && world) {
    game.skyRenderer.update(world, camera);
    // Hand-off fog color to chunk renderer
    const colors = world.skyColors ? world.skyColors() : null;
    if (colors && game.chunkRenderer) {
      // Fog is applied in updateUniforms below
    }
  }

  // Chunk renderer uniforms + frustum culling
  if (game.chunkRenderer && world) {
    game.chunkRenderer.updateUniforms(world, camera, dt);
  }

  renderer.render(scene, camera);
}

// ---------------------------------------------------------------------------
// Audio helpers
// ---------------------------------------------------------------------------
function MAIN_updateAudio(game, dt) {
  const audio = game.audio;
  const player = game.player;
  const world = game.world;
  if (!audio || !player || !world) return;

  // Footsteps
  const speed = player.vel ? Math.sqrt(player.vel.x ** 2 + player.vel.z ** 2) : 0;
  if (player.onGround && speed > 0.05) {
    if (!game._footstepTimer) game._footstepTimer = 0;
    game._footstepTimer -= dt;
    if (game._footstepTimer <= 0) {
      game._footstepTimer = 0.4 / Math.max(0.2, speed);
      const blockBelow = world.getBlock(Math.floor(player.pos.x), Math.floor(player.pos.y) - 1, Math.floor(player.pos.z));
      const def = world.registry && world.registry.def ? world.registry.def(blockBelow) : null;
      const snd = def ? (def.placeSound || 'stone') : 'stone';
      try { audio.play(snd, player.pos.x, player.pos.y, player.pos.z, { volume: 0.3 }); } catch (e) { /* */ }
    }
  } else {
    game._footstepTimer = 0;
  }
}

// ---------------------------------------------------------------------------
// Keyboard event wiring
// ---------------------------------------------------------------------------
function MAIN_wireKeyboardEvents(game) {
  if (typeof document === 'undefined') return;

  document.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'Escape':
        game._setPaused(!game._paused);
        break;
      case 'KeyE':
        if (game.inventoryScreen) {
          if (game.inventoryScreen._visible) game.inventoryScreen.hide();
          else game.inventoryScreen.show('inventory');
        }
        break;
      case 'F3':
        e.preventDefault();
        if (game.debugOverlay) game.debugOverlay.toggle();
        break;
      case 'F5':
        if (game.settingsMenu) game.settingsMenu.toggle();
        break;
      default:
        break;
    }
  });

  // Unload save
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => { game.save(); });
  }
}

// ---------------------------------------------------------------------------
// Resize handler
// ---------------------------------------------------------------------------
function MAIN_onResize(game) {
  if (typeof window === 'undefined') return;
  const w = window.innerWidth, h = window.innerHeight;
  if (game.renderer) game.renderer.setSize(w, h);
  if (game.camera) {
    game.camera.aspect = w / h;
    if (game.camera.updateProjectionMatrix) game.camera.updateProjectionMatrix();
  }
}

// ---------------------------------------------------------------------------
// Auto-start when loaded in a browser (not under Node import)
// ---------------------------------------------------------------------------
if (typeof document !== 'undefined') {
  const MAIN_autoStart = () => {
    // index.html constructs the Game itself (so it can drive the splash screen
    // and gate pointer lock behind the Play button). Only self-start when this
    // module was loaded directly into a bare page.
    if (typeof window !== 'undefined' && window.game) return;
    const container = document.getElementById('mc-root')
      || document.getElementById('game-root')
      || document.body;
    if (container.dataset && container.dataset.mcManaged === '1') return;
    const game = new Game(container);
    game.start().catch((err) => {
      console.error('[Game] Failed to start:', err);
    });
    if (typeof window !== 'undefined') window._game = game;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', MAIN_autoStart);
  } else {
    MAIN_autoStart();
  }
}

/**
 * Locate a dry, safe spawn column by spiralling out from (ox,oz).
 * A spot qualifies when the block below is solid (and not a fluid or a
 * damaging block) and there are two blocks of headroom. Falls back to the
 * highest column found so the player never starts embedded in terrain.
 */
function MAIN_findSpawn(world, ox, oz, maxRadius) {
  const reg = world.registry;
  const isBad = (id) => {
    if (id === 0) return true;
    const d = reg.def(id);
    return !!d.fluid || !d.solid || d.damagePerTick > 0;
  };
  let fallback = null;
  for (let r = 0; r <= maxRadius; r += 4) {
    const step = Math.max(4, Math.floor(r / 3));
    for (let dx = -r; dx <= r; dx += step) {
      for (let dz = -r; dz <= r; dz += step) {
        // Only walk the ring at this radius.
        if (r > 0 && Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const x = ox + dx, z = oz + dz;
        const h = world.heightAt(x, z);
        if (h <= 1) continue;
        const ground = world.getBlock(x, h - 1, z);
        const feet = world.getBlock(x, h, z);
        const head = world.getBlock(x, h + 1, z);
        if (!fallback) fallback = { x, y: h + 0.1, z };
        if (isBad(ground)) continue;
        if (feet !== 0 || head !== 0) continue;
        return { x, y: h + 0.1, z };
      }
    }
  }
  return fallback || { x: ox, y: 80, z: oz };
}

/**
 * Stream chunks until the area around the player has settled, rather than for a
 * fixed number of frames. "Settled" means the chunk immediately under the player
 * is meshed and the streaming pipeline reported no work for a few frames in a
 * row. Hard-capped so a slow machine still finishes booting.
 */
function MAIN_prewarm(game, message, progFrom, progSpan) {
  const w = game.world;
  if (!w) return;
  const MAX_FRAMES = 260;
  let quiet = 0;
  for (let i = 0; i < MAX_FRAMES; i++) {
    const before = w.stats ? (w.stats.gen + w.stats.decorate + w.stats.light + w.stats.mesh) : 0;
    w.update(1 / 20, game.player.pos);
    const after = w.stats ? (w.stats.gen + w.stats.decorate + w.stats.light + w.stats.mesh) : 0;
    if (after === before) quiet++; else quiet = 0;
    if (i % 20 === 0) game._progress(progFrom + (i / MAX_FRAMES) * progSpan, message);
    // Stop as soon as the player's own chunk is ready and nothing is pending.
    if (quiet >= 3) {
      const pc = w.getChunk(
        Math.floor(game.player.pos.x / 16),
        Math.floor(game.player.pos.z / 16),
      );
      if (pc && pc.meshed) break;
    }
  }
  game._progress(progFrom + progSpan, message);
}

/**
 * Fill in the whole visible radius before gameplay starts, reporting honest
 * progress as a fraction of chunks actually meshed.
 *
 * The earlier boot path only prewarmed a radius of 3 and let the rest stream in
 * after the player took control, which read as "the world is still loading" (or
 * as holes in the terrain) during the first seconds of play. Doing it here costs
 * a little more startup time but the world is complete the moment you can move.
 */
function MAIN_prewarmVisible(game, progFrom, progSpan) {
  const w = game.world;
  if (!w) return;
  const rd = w.settings.renderDistance | 0;
  // Prewarm a radius of 4 (~49 chunks): enough that the terrain reads as a
  // complete landscape out to the fog, while the outer rings stream in behind
  // the player. Radius 6 is 113 chunks and pushed boot past 10s for no visible
  // gain, since fog hides that distance anyway.
  const want = Math.max(1, Math.min(rd, 4));
  const pcx = Math.floor(game.player.pos.x / 16);
  const pcz = Math.floor(game.player.pos.z / 16);

  const target = [];
  for (let dz = -want; dz <= want; dz++) {
    for (let dx = -want; dx <= want; dx++) {
      if (dx * dx + dz * dz > want * want) continue;   // circular, not square
      target.push([pcx + dx, pcz + dz]);
    }
  }
  // Nearest first, so the view directly around the player resolves earliest.
  target.sort((a, b) => {
    const da = (a[0] - pcx) ** 2 + (a[1] - pcz) ** 2;
    const db = (b[0] - pcx) ** 2 + (b[1] - pcz) ** 2;
    return da - db;
  });

  const total = target.length;
  const deadline = MAIN_nowMs() + MAIN_PREWARM_BUDGET_MS;

  // During boot there is no frame to protect, so lift the per-frame streaming
  // limits: the 6ms time-slice exists to keep gameplay smooth, and leaving it on
  // here makes loading crawl (a few chunks per second). Restored below.
  const savedBudget = {
    gen: w.settings.maxGenPerFrame,
    dec: w.settings.maxDecoratePerFrame,
    lit: w.settings.maxLightPerFrame,
    mesh: w.settings.maxMeshPerFrame,
    slice: w.settings.streamBudgetMs,
  };
  w.settings.maxGenPerFrame = 8;
  w.settings.maxDecoratePerFrame = 8;
  w.settings.maxLightPerFrame = 8;
  w.settings.maxMeshPerFrame = 8;
  w.settings.streamBudgetMs = 1000;   // effectively unlimited for the load screen
  let ready = 0;
  for (let iter = 0; iter < 4000; iter++) {
    // Let the world's own budgeted pipeline advance.
    w.update(1 / 20, game.player.pos);

    ready = 0;
    for (const [cx, cz] of target) {
      const c = w.getChunk(cx, cz);
      if (c && c.meshed) ready++;
    }
    if (iter % 8 === 0) {
      game._progress(progFrom + (ready / total) * progSpan,
        'building world  ' + ready + ' / ' + total + ' chunks');
    }
    if (ready >= total) break;
    // Never hang the boot indefinitely on a slow machine.
    if (MAIN_nowMs() > deadline) break;
  }
  // Upload every prewarmed chunk to the GPU NOW. The main loop only drains a
  // few per frame (deliberately, to protect frame time), so without this the
  // player takes control looking at an empty scene while 49 chunks trickle in.
  if (game.chunkRenderer && w.pendingUploads && w.pendingUploads.size) {
    game._progress(progFrom + progSpan * 0.95, 'uploading geometry…');
    for (const chunk of [...w.pendingUploads]) {
      if (chunk.meshed && chunk.meshData) {
        game.chunkRenderer.syncChunk(chunk, chunk.meshData);
        chunk._rendererSynced = true;
        chunk._syncGeneration = chunk._meshGeneration || 0;
      }
      w.pendingUploads.delete(chunk);
    }
  }

  // Hand the frame-time limits back before gameplay starts.
  w.settings.maxGenPerFrame = savedBudget.gen;
  w.settings.maxDecoratePerFrame = savedBudget.dec;
  w.settings.maxLightPerFrame = savedBudget.lit;
  w.settings.maxMeshPerFrame = savedBudget.mesh;
  w.settings.streamBudgetMs = savedBudget.slice;

  game._progress(progFrom + progSpan, 'building world  ' + ready + ' / ' + total + ' chunks');
}
