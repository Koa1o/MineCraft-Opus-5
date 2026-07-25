// ---------------------------------------------------------------------------
// PlayerControls — keyboard/mouse input, pointer lock, DDA raycast targeting.
// All module-level helpers prefixed CTRL_.
// ---------------------------------------------------------------------------

import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CTRL_MAX_DIST_SURVIVAL = 4.5;
const CTRL_MAX_DIST_CREATIVE = 5.0;
const CTRL_PLACE_COOLDOWN_MS = 250;
const CTRL_MINE_RETARGET_DIST = 0.01;
const CTRL_BOB_FREQ = 0.08;
const CTRL_BOB_AMP = 0.02;
const CTRL_SPRINT_DOUBLE_TAP_MS = 300;

// Face normals: [dx, dy, dz] for each face index 0..5
const CTRL_FACE_NORMALS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

// ---------------------------------------------------------------------------
// DDA voxel raycast
// ---------------------------------------------------------------------------

/**
 * Voxel DDA raycast against block shapes.
 *
 * Two bugs lived here and between them made block targeting fail outright:
 *  - Shape boxes were read as arrays (`s[0]`, `s[3]`), but src/world/shapes.js
 *    returns objects `{x0,y0,z0,x1,y1,z1}`. Every value was undefined, so no
 *    slab, stair, torch, fence or chest could ever be hit.
 *  - The hit was only accepted when `hitDist !== dist || face >= 0`. On the very
 *    first voxel (the one the eye is already inside or adjacent to) face is -1
 *    and hitDist equals dist, so valid hits were discarded.
 *
 * @returns {{x,y,z,face,point,dist,blockId}|null}
 */
function CTRL_raycastDDA(world, ox, oy, oz, dx, dy, dz, maxDist, registry) {
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len < 1e-9) return null;
  const rdx = dx / len, rdy = dy / len, rdz = dz / len;

  let ix = Math.floor(ox), iy = Math.floor(oy), iz = Math.floor(oz);
  const stepX = rdx >= 0 ? 1 : -1;
  const stepY = rdy >= 0 ? 1 : -1;
  const stepZ = rdz >= 0 ? 1 : -1;

  const tDeltaX = Math.abs(rdx) < 1e-9 ? Infinity : Math.abs(1 / rdx);
  const tDeltaY = Math.abs(rdy) < 1e-9 ? Infinity : Math.abs(1 / rdy);
  const tDeltaZ = Math.abs(rdz) < 1e-9 ? Infinity : Math.abs(1 / rdz);

  let tMaxX = Math.abs(rdx) < 1e-9 ? Infinity
    : (rdx >= 0 ? (Math.floor(ox) + 1 - ox) : (ox - Math.floor(ox))) / Math.abs(rdx);
  let tMaxY = Math.abs(rdy) < 1e-9 ? Infinity
    : (rdy >= 0 ? (Math.floor(oy) + 1 - oy) : (oy - Math.floor(oy))) / Math.abs(rdy);
  let tMaxZ = Math.abs(rdz) < 1e-9 ? Infinity
    : (rdz >= 0 ? (Math.floor(oz) + 1 - oz) : (oz - Math.floor(oz))) / Math.abs(rdz);

  let face = -1;
  let dist = 0;
  const MAX_STEPS = Math.ceil(maxDist) * 3 + 12;

  for (let step = 0; step < MAX_STEPS; step++) {
    const blockId = world.getBlock(ix, iy, iz);
    if (blockId) {
      const def = registry ? registry.def(blockId) : null;
      // Fluids and replaceable plants are see-through for targeting; everything
      // solid or interactable can be hit.
      const isFluid = def ? !!def.fluid : false;
      const solid = def ? def.solid !== false : true;
      const interactable = def ? !!def.interact : false;
      const climbable = def ? !!def.climbable : false;
      const targetable = !isFluid && (solid || interactable || climbable);

      if (targetable) {
        const boxes = (def && def.shape && def.shape.length)
          ? def.shape
          : [{ x0: 0, y0: 0, z0: 0, x1: 1, y1: 1, z1: 1 }];

        let bestT = Infinity;
        let bestFace = -1;
        for (const b of boxes) {
          const aabb = {
            minX: ix + b.x0, minY: iy + b.y0, minZ: iz + b.z0,
            maxX: ix + b.x1, maxY: iy + b.y1, maxZ: iz + b.z1,
          };
          const t = CTRL_rayAabb(ox, oy, oz, rdx, rdy, rdz, aabb);
          if (t !== null && t <= maxDist && t < bestT) {
            bestT = t;
            const hx = ox + rdx * t, hy = oy + rdy * t, hz = oz + rdz * t;
            bestFace = CTRL_faceFromHit(hx, hy, hz,
              aabb.minX, aabb.minY, aabb.minZ, aabb.maxX, aabb.maxY, aabb.maxZ);
          }
        }
        if (bestT < Infinity) {
          return {
            x: ix, y: iy, z: iz,
            face: bestFace >= 0 ? bestFace : (face >= 0 ? face : 2),
            point: { x: ox + rdx * bestT, y: oy + rdy * bestT, z: oz + rdz * bestT },
            dist: bestT,
            blockId,
          };
        }
      }
    }

    // Advance one voxel along the cheapest axis.
    if (tMaxX <= tMaxY && tMaxX <= tMaxZ) {
      dist = tMaxX; if (dist > maxDist) break;
      ix += stepX; face = stepX > 0 ? 1 : 0; tMaxX += tDeltaX;
    } else if (tMaxY <= tMaxZ) {
      dist = tMaxY; if (dist > maxDist) break;
      iy += stepY; face = stepY > 0 ? 3 : 2; tMaxY += tDeltaY;
    } else {
      dist = tMaxZ; if (dist > maxDist) break;
      iz += stepZ; face = stepZ > 0 ? 5 : 4; tMaxZ += tDeltaZ;
    }
  }
  return null;
}

function CTRL_rayAabb(ox, oy, oz, dx, dy, dz, box) {
  let tmin = 0;
  let tmax = Infinity;
  const o = [ox, oy, oz];
  const d = [dx, dy, dz];
  const lo = [box.minX, box.minY, box.minZ];
  const hi = [box.maxX, box.maxY, box.maxZ];

  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < lo[i] || o[i] > hi[i]) return null;
    } else {
      const inv = 1 / d[i];
      let t1 = (lo[i] - o[i]) * inv;
      let t2 = (hi[i] - o[i]) * inv;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }

  return tmin >= 0 ? tmin : (tmax >= 0 ? 0 : null);
}

function CTRL_faceFromHit(hx, hy, hz, minX, minY, minZ, maxX, maxY, maxZ) {
  const eps = 1e-3;
  if (Math.abs(hx - minX) < eps) return 1; // -X
  if (Math.abs(hx - maxX) < eps) return 0; // +X
  if (Math.abs(hy - minY) < eps) return 3; // -Y
  if (Math.abs(hy - maxY) < eps) return 2; // +Y
  if (Math.abs(hz - minZ) < eps) return 5; // -Z
  if (Math.abs(hz - maxZ) < eps) return 4; // +Z
  return 2; // fallback
}

// ---------------------------------------------------------------------------
// Input state
// ---------------------------------------------------------------------------

const CTRL_DEFAULT_INPUT = () => ({
  forward: false, back: false, left: false, right: false,
  jump: false, sneak: false, sprint: false,
  attack: false, use: false,
});

// ---------------------------------------------------------------------------
// PlayerControls
// ---------------------------------------------------------------------------

export class PlayerControls {
  constructor(player, camera, domElement, settings) {
    this.player = player;
    this.camera = camera;
    this.domElement = domElement;
    this.settings = settings || {};

    this._input = CTRL_DEFAULT_INPUT();
    this._target = null;
    this._miningTimer = 0;
    this._miningLastTarget = null;
    this._placeTimer = 0;
    this._lastPlaceMs = 0;

    this._bobTime = 0;
    this._bobEnabled = this.settings.viewBob !== false;

    this._viewMode = 0; // 0=first-person, 1=third-person-back, 2=third-person-front
    this._debugVisible = false;
    this._chatOpen = false;
    this._inventoryOpen = false;
    this._paused = false;

    // Keyboard state
    this._keys = {};
    this._lastWPress = 0;
    this._wDoubleTapSprint = false;

    // Creative/survival toggle guard
    this._gameModeToggleCooldown = 0;

    // Pointer lock
    this._plc = null;
    if (typeof window !== 'undefined' && camera && domElement) {
      this._plc = new PointerLockControls(camera, domElement);
    }

    // Bound handlers
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._onContextMenu = (e) => e.preventDefault();
    this._onPointerLockChange = this._onPointerLockChange.bind(this);

    this._mouseButtons = { left: false, right: false, middle: false };
    this._wheelDelta = 0;
  }

  get input() { return this._input; }

  attach() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    if (this.domElement) {
      this.domElement.addEventListener('mousedown', this._onMouseDown);
      this.domElement.addEventListener('mouseup', this._onMouseUp);
      this.domElement.addEventListener('wheel', this._onWheel, { passive: false });
      this.domElement.addEventListener('contextmenu', this._onContextMenu);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('pointerlockchange', this._onPointerLockChange);
    }
    if (this._plc) this._plc.connect();
  }

  detach() {
    if (typeof window === 'undefined') return;
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    if (this.domElement) {
      this.domElement.removeEventListener('mousedown', this._onMouseDown);
      this.domElement.removeEventListener('mouseup', this._onMouseUp);
      this.domElement.removeEventListener('wheel', this._onWheel);
      this.domElement.removeEventListener('contextmenu', this._onContextMenu);
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    }
    if (this._plc) this._plc.disconnect();
  }

  _onPointerLockChange() {
    if (typeof document === 'undefined') return;
    this._paused = !document.pointerLockElement;
    if (this._paused) {
      // Clear the input IN PLACE. Replacing the object would invalidate every
      // reference handed out by the `input` getter (the game loop holds one), so
      // the player would keep reading a detached, permanently-false object and
      // could never move again after the first pointer-lock change.
      this._clearInput();
    }
  }

  /** Reset all input flags without changing object identity. */
  _clearInput() {
    const fresh = CTRL_DEFAULT_INPUT();
    for (const k of Object.keys(fresh)) this._input[k] = fresh[k];
    this._keys = {};
  }

  _onKeyDown(e) {
    this._keys[e.code] = true;
    const p = this.player;

    switch (e.code) {
      case 'Digit1': p.inventory.selected = 0; break;
      case 'Digit2': p.inventory.selected = 1; break;
      case 'Digit3': p.inventory.selected = 2; break;
      case 'Digit4': p.inventory.selected = 3; break;
      case 'Digit5': p.inventory.selected = 4; break;
      case 'Digit6': p.inventory.selected = 5; break;
      case 'Digit7': p.inventory.selected = 6; break;
      case 'Digit8': p.inventory.selected = 7; break;
      case 'Digit9': p.inventory.selected = 8; break;

      case 'KeyF': {
        // Creative/Survival toggle (guarded)
        if (this._gameModeToggleCooldown <= 0) {
          p.gameMode = p.gameMode === 'creative' ? 'survival' : 'creative';
          this._gameModeToggleCooldown = 30;
        }
        break;
      }

      case 'F5':
        this._viewMode = (this._viewMode + 1) % 3;
        break;

      case 'F3':
        this._debugVisible = !this._debugVisible;
        break;

      case 'KeyE':
        this._inventoryOpen = !this._inventoryOpen;
        break;

      case 'KeyQ': {
        // Drop held item
        const held = p.inventory.heldItem;
        if (held && !held.isEmpty()) {
          // Would call world.dropItem — handled in update
          this._dropRequested = true;
        }
        break;
      }

      case 'KeyT':
        this._chatOpen = true;
        break;

      case 'Escape':
        this._paused = true;
        if (this._plc) {
          try { this._plc.unlock(); } catch (_) {}
        }
        break;

      case 'KeyW': {
        // Double-tap sprint
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (now - this._lastWPress < CTRL_SPRINT_DOUBLE_TAP_MS) {
          this._wDoubleTapSprint = true;
        }
        this._lastWPress = now;
        break;
      }
    }
  }

  _onKeyUp(e) {
    this._keys[e.code] = false;
    if (e.code === 'KeyW') {
      this._wDoubleTapSprint = false;
    }
  }

  _onMouseDown(e) {
    if (e.button === 0) { this._mouseButtons.left = true; e.preventDefault(); }
    if (e.button === 2) { this._mouseButtons.right = true; e.preventDefault(); }
    if (e.button === 1) { this._mouseButtons.middle = true; e.preventDefault(); }
    // Request pointer lock on first click
    if (this._plc && this._paused && e.button === 0) {
      try { this._plc.lock(); } catch (_) {}
    }
  }

  _onMouseUp(e) {
    if (e.button === 0) { this._mouseButtons.left = false; }
    if (e.button === 2) { this._mouseButtons.right = false; }
    if (e.button === 1) { this._mouseButtons.middle = false; }
  }

  _onWheel(e) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    const inv = this.player.inventory;
    if (e.deltaY > 0) {
      inv.selected = (inv.selected + 1) % 9;
    } else if (e.deltaY < 0) {
      inv.selected = (inv.selected + 8) % 9;
    }
  }

  // ---------------------------------------------------------------------------
  // Update — called once per frame
  // ---------------------------------------------------------------------------

  update(dt, world, registry) {
    if (this._paused) return;

    const p = this.player;
    const k = this._keys;
    const mb = this._mouseButtons;

    // Build input state
    const isCreative = p.gameMode === 'creative';
    const maxDist = isCreative ? CTRL_MAX_DIST_CREATIVE : CTRL_MAX_DIST_SURVIVAL;

    this._input.forward = !!(k.KeyW || k.ArrowUp);
    this._input.back    = !!(k.KeyS || k.ArrowDown);
    this._input.left    = !!(k.KeyA || k.ArrowLeft);
    this._input.right   = !!(k.KeyD || k.ArrowRight);
    this._input.jump    = !!(k.Space);
    this._input.sneak   = !!(k.ShiftLeft || k.ShiftRight);
    this._input.sprint  = !!(k.ControlLeft || k.ControlRight || this._wDoubleTapSprint);
    this._input.attack  = !!mb.left;
    this._input.use     = !!mb.right;

    // Sensitivity from settings
    const sens = this.settings.sensitivity || 1;
    const invertY = this.settings.invertY || false;
    // Mouse movement applied by PointerLockControls via three.js camera

    // Apply camera yaw/pitch to player
    if (this.camera) {
      // Extract yaw/pitch from camera quaternion or euler
      const euler = this.camera.rotation;
      p.yaw = euler.y;
      p.pitch = euler.x * (invertY ? -1 : 1);
      p.headYaw = euler.y;
    }

    // Raycast for targeting
    const eyePos = p.eyePos;
    const eyeDir = this._getEyeDirection();

    this._target = CTRL_raycastDDA(
      world,
      eyePos.x, eyePos.y, eyePos.z,
      eyeDir.x, eyeDir.y, eyeDir.z,
      maxDist,
      registry,
    );

    // Mining (left mouse hold)
    if (mb.left && this._target) {
      const t = this._target;
      const same = this._miningLastTarget &&
        this._miningLastTarget.x === t.x &&
        this._miningLastTarget.y === t.y &&
        this._miningLastTarget.z === t.z;

      if (!same) {
        // New block targeted: reset progress
        p.breakingBlock = { x: t.x, y: t.y, z: t.z };
        p.breakProgress = 0;
        p.breakStage = 0;
        this._miningLastTarget = { x: t.x, y: t.y, z: t.z };
      }

      if (p.breakingBlock) {
        p.updateBreaking(world, dt, registry);
      }
    } else if (!mb.left) {
      if (p.breakingBlock) {
        p.breakingBlock = null;
        p.breakProgress = 0;
        p.breakStage = 0;
      }
      this._miningLastTarget = null;
    }

    // Place/interact (right mouse, cooldown)
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (mb.right && this._target) {
      if (now - this._lastPlaceMs >= CTRL_PLACE_COOLDOWN_MS) {
        this._lastPlaceMs = now;
        // Try interact first
        const didInteract = p.interact(world, this._target, registry);
        if (!didInteract) {
          p.placeBlock(world, this._target, registry);
        }
      }
    } else if (!mb.right) {
      this._lastPlaceMs = 0;
    }

    // Middle click: pick block (creative)
    if (mb.middle && this._target && isCreative) {
      const blockId = this._target.blockId;
      const blockDef = registry ? registry.def(blockId) : null;
      if (blockDef) {
        // Find item for this block and place it in hotbar
        const itemId = blockDef.name;
        const inv = p.inventory;
        // Try to find existing in hotbar first
        let found = -1;
        for (let i = 0; i < 9; i++) {
          const s = inv.get(i);
          if (s && s.itemId === itemId) { found = i; break; }
        }
        if (found >= 0) {
          inv.selected = found;
        } else {
          // Place in current hotbar slot
          inv.set(inv.selected, new (class extends Object {})()); // handled below
          const { ItemStack: IS } = { ItemStack: p.inventory.constructor };
          // Simple: create stack
          const stack = Object.create(null);
          stack.itemId = itemId;
          stack.count = 64;
          stack.damage = 0;
          stack.isEmpty = () => false;
          // Use real ItemStack by importing through player inventory
          // We need a proper import — use the inventory's internal create
          inv._slots[inv.selected] = { itemId, count: 64, damage: 0,
            isEmpty: () => false, clone: () => inv._slots[inv.selected] };
        }
      }
      this._mouseButtons.middle = false; // consume
    }

    // Drop item on Q
    if (this._dropRequested && world) {
      this._dropRequested = false;
      const held = p.inventory.heldItem;
      if (held && !held.isEmpty()) {
        world.dropItem(eyePos.x, eyePos.y, eyePos.z, held.itemId, 1);
        held.count -= 1;
        if (held.count <= 0) p.inventory.set(p.inventory.selected, null);
      }
    }

    // View bobbing
    if (this._bobEnabled && !p.isFlying && p.onGround) {
      const speed = Math.sqrt(p.vel.x * p.vel.x + p.vel.z * p.vel.z);
      if (speed > 0.01 && this.camera) {
        this._bobTime += dt * CTRL_BOB_FREQ * speed * 20;
        const bob = Math.sin(this._bobTime) * CTRL_AMP_SCALE(speed);
        this.camera.position.y += bob;
      }
    }

    // Gamemode toggle cooldown
    if (this._gameModeToggleCooldown > 0) this._gameModeToggleCooldown--;
  }

  /** Get target hit info from last raycast. */
  pickTarget(world, maxDist, registry) {
    const p = this.player;
    const eyePos = p.eyePos;
    const eyeDir = this._getEyeDirection();
    const dist = maxDist || (p.gameMode === 'creative' ? CTRL_MAX_DIST_CREATIVE : CTRL_MAX_DIST_SURVIVAL);
    return CTRL_raycastDDA(world, eyePos.x, eyePos.y, eyePos.z,
      eyeDir.x, eyeDir.y, eyeDir.z, dist, registry);
  }

  _getEyeDirection() {
    const yaw = this.player.yaw;
    const pitch = this.player.pitch;
    const cosPitch = Math.cos(pitch);
    return {
      x: -Math.sin(yaw) * cosPitch,
      y: Math.sin(pitch),
      z: -Math.cos(yaw) * cosPitch,
    };
  }

  get target() { return this._target; }
  get viewMode() { return this._viewMode; }
  get debugVisible() { return this._debugVisible; }
  get inventoryOpen() { return this._inventoryOpen; }
  get chatOpen() { return this._chatOpen; }
}

function CTRL_AMP_SCALE(speed) {
  return Math.min(CTRL_BOB_AMP, speed * CTRL_BOB_AMP);
}
