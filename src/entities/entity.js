// ---------------------------------------------------------------------------
// Entity base classes: Entity, ItemEntity, Projectile.
// All module-level helpers prefixed ENT_.
// ---------------------------------------------------------------------------

import { aabb, aabbFromCenter, aabbOverlap } from '../core/util.js';
import { RK_BOXES } from '../world/blocks.js';

let ENT_nextId = 1;
export function ENT_genId() { return ENT_nextId++; }

const ENT_GRAVITY = 0.08;
const ENT_DRAG_AIR = 0.98;
const ENT_DRAG_FLUID = 0.8;
const ENT_FALL_DMG_THRESHOLD = 3;
const ENT_VOID_Y = -64;
const ENT_FIRE_DMG_INTERVAL = 20;
const ENT_DROWN_DMG_INTERVAL = 20;
const ENT_MAX_FALL_SAFE = 0.6;
const ENT_STEP_TRIES = 8;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ENT_floor(v) { return Math.floor(v); }

function ENT_getBlockBoxes(world, bx, by, bz, registry) {
  const id = world.getBlock(bx, by, bz);
  if (!id) return null;
  const def = registry ? registry.def(id) : null;
  if (!def) return [aabb(bx, by, bz, bx + 1, by + 1, bz + 1)];
  if (def.renderKind === RK_BOXES && def.shape && def.shape.length) {
    return def.shape.map(s => aabb(bx + s[0], by + s[1], bz + s[2], bx + s[3], by + s[4], bz + s[5]));
  }
  if (!def.solid) return null;
  return [aabb(bx, by, bz, bx + 1, by + 1, bz + 1)];
}

function ENT_blockSolid(world, bx, by, bz) {
  return world.isSolid(bx, by, bz);
}

function ENT_resolveAxis(box, dx, axis, world, registry) {
  // axis: 0=X, 1=Y, 2=Z
  let moved = dx;
  if (Math.abs(moved) < 1e-9) return moved;

  // Compute integer scan range for the swept volume.
  // Use ceil(max-eps) to include boundary-touching blocks, floor(min+eps) to exclude sharing-only.
  let scanMinX, scanMaxX, scanMinY, scanMaxY, scanMinZ, scanMaxZ;

  // Perpendicular axes: scan the entity's current footprint
  const pMinX = ENT_floor(box.minX + 1e-6);
  const pMaxX = Math.ceil(box.maxX - 1e-6) - 1;
  const pMinY = ENT_floor(box.minY + 1e-6);
  const pMaxY = Math.ceil(box.maxY - 1e-6) - 1;
  const pMinZ = ENT_floor(box.minZ + 1e-6);
  const pMaxZ = Math.ceil(box.maxZ - 1e-6) - 1;

  if (axis === 0) {
    scanMinX = dx < 0 ? ENT_floor(box.minX + dx) : ENT_floor(box.maxX - 1e-6);
    scanMaxX = dx > 0 ? ENT_floor(box.maxX + dx + 1e-6) : ENT_floor(box.minX - dx + 1e-6) - Math.sign(-dx) * 100000; // simplified
    // Actually just use simple range:
    if (dx > 0) { scanMinX = ENT_floor(box.maxX - 1e-6); scanMaxX = ENT_floor(box.maxX + dx); }
    else { scanMaxX = ENT_floor(box.minX + 1e-6); scanMinX = ENT_floor(box.minX + dx); }
    scanMinY = pMinY; scanMaxY = pMaxY;
    scanMinZ = pMinZ; scanMaxZ = pMaxZ;
  } else if (axis === 1) {
    if (dx > 0) { scanMinY = ENT_floor(box.maxY - 1e-6); scanMaxY = ENT_floor(box.maxY + dx); }
    else { scanMaxY = ENT_floor(box.minY + 1e-6); scanMinY = ENT_floor(box.minY + dx); }
    scanMinX = pMinX; scanMaxX = pMaxX;
    scanMinZ = pMinZ; scanMaxZ = pMaxZ;
  } else {
    if (dx > 0) { scanMinZ = ENT_floor(box.maxZ - 1e-6); scanMaxZ = ENT_floor(box.maxZ + dx); }
    else { scanMaxZ = ENT_floor(box.minZ + 1e-6); scanMinZ = ENT_floor(box.minZ + dx); }
    scanMinX = pMinX; scanMaxX = pMaxX;
    scanMinY = pMinY; scanMaxY = pMaxY;
  }

  // Perpendicular extent for overlap test (use entity's current footprint)
  const perpMinX = axis === 0 ? -Infinity : box.minX;
  const perpMaxX = axis === 0 ? Infinity  : box.maxX;
  const perpMinY = axis === 1 ? -Infinity : box.minY;
  const perpMaxY = axis === 1 ? Infinity  : box.maxY;
  const perpMinZ = axis === 2 ? -Infinity : box.minZ;
  const perpMaxZ = axis === 2 ? Infinity  : box.maxZ;

  for (let bx = scanMinX; bx <= scanMaxX; bx++) {
    for (let by = scanMinY; by <= scanMaxY; by++) {
      for (let bz = scanMinZ; bz <= scanMaxZ; bz++) {
        const boxes = ENT_getBlockBoxes(world, bx, by, bz, registry);
        if (!boxes) continue;
        for (const blk of boxes) {
          // Check that block overlaps entity in the perpendicular axes
          if (blk.maxX <= perpMinX || blk.minX >= perpMaxX) continue;
          if (blk.maxY <= perpMinY || blk.minY >= perpMaxY) continue;
          if (blk.maxZ <= perpMinZ || blk.minZ >= perpMaxZ) continue;

          if (axis === 0) {
            if (dx > 0 && blk.minX >= box.maxX) moved = Math.min(moved, blk.minX - box.maxX);
            else if (dx < 0 && blk.maxX <= box.minX) moved = Math.max(moved, blk.maxX - box.minX);
          } else if (axis === 1) {
            if (dx > 0 && blk.minY >= box.maxY) moved = Math.min(moved, blk.minY - box.maxY);
            else if (dx < 0 && blk.maxY <= box.minY) moved = Math.max(moved, blk.maxY - box.minY);
          } else {
            if (dx > 0 && blk.minZ >= box.maxZ) moved = Math.min(moved, blk.minZ - box.maxZ);
            else if (dx < 0 && blk.maxZ <= box.minZ) moved = Math.max(moved, blk.maxZ - box.minZ);
          }
        }
      }
    }
  }
  return moved;
}

// ---------------------------------------------------------------------------
export class Entity {
  constructor(type, def) {
    this.id = ENT_genId();
    this.type = type;
    this.def = def || null;

    this.pos = { x: 0, y: 0, z: 0 };
    this.vel = { x: 0, y: 0, z: 0 };
    this.prevPos = { x: 0, y: 0, z: 0 };

    this.yaw = 0;
    this.pitch = 0;
    this.headYaw = 0;
    this.bodyYaw = 0;

    this.onGround = false;
    this.inWater = false;
    this.inLava = false;

    const w = def ? (def.width || 0.6) : 0.6;
    const h = def ? (def.height || 1.8) : 1.8;
    this.width = w;
    this.height = h;

    this.health = def ? (def.health || 20) : 20;
    this.maxHealth = this.health;
    this.age = 0;
    this.dead = false;
    this.removed = false;

    this.fireTicks = 0;
    this.airTicks = 300;
    this.hurtTime = 0;
    this.deathTime = 0;
    this.invulnTicks = 0;

    this.noClip = false;
    this.gravityScale = 1;

    this.baby = false;
    this.variant = 0;
    this.skinRow = 0;

    this.target = null;
    this.owner = null;
    this.tamed = false;
    this.sitting = false;
    this.loveTicks = 0;
    this.breedCooldown = 0;
    this.panicTicks = 0;
    this.attackCooldown = 0;

    this.path = null;
    this.pathIndex = 0;

    this.stateName = 'idle';
    this.stateTimer = 0;
    this.despawnTimer = 0;

    this.riding = null;
    this.rider = null;

    this.lastDamageSource = null;
    this.knockbackX = 0;
    this.knockbackZ = 0;

    this.model = def ? (def.model || null) : null;
    this.animTime = 0;
    this.limbSwing = 0;
    this.limbSwingAmount = 0;

    // Fall tracking
    this._fallY = null;
    this._fallDistance = 0;
  }

  // -------------------------------------------------------------------------
  aabbOf() {
    const hw = this.width * 0.5;
    return aabb(
      this.pos.x - hw, this.pos.y, this.pos.z - hw,
      this.pos.x + hw, this.pos.y + this.height, this.pos.z + hw,
    );
  }

  // -------------------------------------------------------------------------
  // Swept AABB voxel collision – resolves Y first, then larger horizontal, then other.
  // Sets onGround. Never allows corner ghosting.
  // -------------------------------------------------------------------------
  move(world, dx, dy, dz, registry) {
    if (this.noClip) {
      this.pos.x += dx; this.pos.y += dy; this.pos.z += dz;
      return;
    }

    let box = this.aabbOf();

    // -- Y axis first (gravity is usually the dominant concern)
    const ady = Math.abs(dy);
    const adx = Math.abs(dx);
    const adz = Math.abs(dz);

    const ry = ENT_resolveAxis(box, dy, 1, world, registry);
    box = aabb(box.minX, box.minY + ry, box.minZ, box.maxX, box.maxY + ry, box.maxZ);
    if (Math.abs(ry - dy) > 1e-6) {
      if (dy < 0) { this.onGround = true; }
      dy = 0;
    } else {
      if (dy < 0) this.onGround = false;
    }

    // -- Resolve larger horizontal axis first to avoid corner clipping
    let rx, rz;
    if (adx >= adz) {
      rx = ENT_resolveAxis(box, dx, 0, world, registry);
      const bx2 = aabb(box.minX + rx, box.minY, box.minZ, box.maxX + rx, box.maxY, box.maxZ);
      rz = ENT_resolveAxis(bx2, dz, 2, world, registry);
    } else {
      rz = ENT_resolveAxis(box, dz, 2, world, registry);
      const bz2 = aabb(box.minX, box.minY, box.minZ + rz, box.maxX, box.maxY, box.maxZ + rz);
      rx = ENT_resolveAxis(bz2, dx, 0, world, registry);
    }

    if (Math.abs(rx - dx) > 1e-6) { this.vel.x = 0; }
    if (Math.abs(rz - dz) > 1e-6) { this.vel.z = 0; }
    if (Math.abs(ry) < 1e-6 && Math.abs(dy) > 0) { this.vel.y = 0; }

    this.pos.x += rx;
    this.pos.y += ry;
    this.pos.z += rz;
  }

  // -------------------------------------------------------------------------
  stepUp(world, dx, dz, maxStep, registry) {
    maxStep = maxStep !== undefined ? maxStep : ENT_MAX_FALL_SAFE;
    if (!this.onGround) return false;

    // First, check if the horizontal move is blocked
    const box = this.aabbOf();
    const rx0 = ENT_resolveAxis(box, dx, 0, world, registry);
    const bx0 = aabb(box.minX + rx0, box.minY, box.minZ, box.maxX + rx0, box.maxY, box.maxZ);
    const rz0 = ENT_resolveAxis(bx0, dz, 2, world, registry);

    const hBlocked = (Math.abs(rx0 - dx) > 1e-4 || Math.abs(rz0 - dz) > 1e-4);
    if (!hBlocked) return false; // Not blocked, no step-up needed

    // Try to step up in increments
    for (let s = 0.05; s <= maxStep + 1e-6; s += 0.05) {
      // Raise the box by s
      const raisedBox = aabb(box.minX, box.minY + s, box.minZ, box.maxX, box.maxY + s, box.maxZ);

      // Check there's headroom at the raised position (block above head)
      const headClearY = ENT_resolveAxis(raisedBox, 0.001, 1, world, registry);
      if (Math.abs(headClearY - 0.001) > 1e-4) continue; // Head blocked

      // Try horizontal move at raised position
      const rx2 = ENT_resolveAxis(raisedBox, dx, 0, world, registry);
      const bx2 = aabb(raisedBox.minX + rx2, raisedBox.minY, raisedBox.minZ, raisedBox.maxX + rx2, raisedBox.maxY, raisedBox.maxZ);
      const rz2 = ENT_resolveAxis(bx2, dz, 2, world, registry);

      if (Math.abs(rx2 - dx) > 1e-4 || Math.abs(rz2 - dz) > 1e-4) continue; // Still blocked

      // Success: apply position
      this.pos.x += rx2;
      this.pos.z += rz2;
      this.pos.y += s;

      // Settle down: find the actual ground below
      const settleBox = this.aabbOf();
      const ry3 = ENT_resolveAxis(settleBox, -(s + 0.05), 1, world, registry);
      this.pos.y += ry3;
      this.onGround = true;
      return true;
    }
    return false;
  }

  // -------------------------------------------------------------------------
  applyGravity(world) {
    if (this.inWater || this.inLava) return;
    if (!this.onGround || this.vel.y > 0) {
      this.vel.y -= ENT_GRAVITY * this.gravityScale;
    }
  }

  applyDrag() {
    if (this.inWater || this.inLava) {
      this.vel.x *= ENT_DRAG_FLUID;
      this.vel.y *= ENT_DRAG_FLUID;
      this.vel.z *= ENT_DRAG_FLUID;
    } else {
      const slip = this.onGround ? 0.6 : 1.0;
      this.vel.x *= ENT_DRAG_AIR * (this.onGround ? slip : 0.91);
      this.vel.z *= ENT_DRAG_AIR * (this.onGround ? slip : 0.91);
      // No Y drag in air (gravity handles it)
    }
  }

  updateFluidState(world) {
    const hw = this.width * 0.5;
    const eyeY = this.pos.y + this.height * 0.8;
    const cx = Math.floor(this.pos.x);
    const cy = Math.floor(eyeY);
    const cz = Math.floor(this.pos.z);

    const id = world.getBlock(cx, cy, cz);
    const def = world._registry ? world._registry.def(id) : null;
    const isWater = def && def.fluid === 'water';
    const isLava = def && def.fluid === 'lava';

    this.inWater = isWater;
    this.inLava = isLava;

    if (isWater || isLava) {
      // Buoyancy: push up
      this.vel.y += 0.04;
      // Reset air
      if (isWater) {
        this.airTicks = Math.max(0, this.airTicks - 1);
      }
    } else {
      // Restore air
      if (this.airTicks < 300) this.airTicks = Math.min(300, this.airTicks + 5);
    }
  }

  // -------------------------------------------------------------------------
  damage(amount, source, world) {
    if (this.dead || this.removed) return;
    if (this.invulnTicks > 0) return;

    // Armour reduction (stub hook - def.armor)
    if (this.def && this.def.armor) {
      amount = Math.max(0, amount - this.def.armor * 0.04 * amount);
    }
    if (amount <= 0) return;

    this.health -= amount;
    this.hurtTime = 10;
    this.invulnTicks = 10;
    this.lastDamageSource = source || null;

    if (source && source.pos) {
      const dx = this.pos.x - source.pos.x;
      const dz = this.pos.z - source.pos.z;
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      this.knockback(dx / len, dz / len, 0.4);
    }

    if (this.health <= 0) {
      this.kill(world);
    }
  }

  heal(n) {
    this.health = Math.min(this.maxHealth, this.health + n);
  }

  kill(world) {
    if (this.dead) return;
    this.dead = true;
    this.deathTime = 0;
    this.vel.x *= 0.5; this.vel.z *= 0.5;

    // Drops
    if (world && this.def && this.def.drops) {
      for (const drop of this.def.drops) {
        const count = drop.min + Math.floor((world.rand ? world.rand.next() : Math.random()) * (drop.max - drop.min + 1));
        if (count > 0) {
          const item = (this.fireTicks > 0 && drop.cookedItem) ? drop.cookedItem : drop.item;
          world.dropItem(this.pos.x, this.pos.y + 0.5, this.pos.z, item, count);
        }
      }
    }
    // XP
    if (world && this.def && this.def.xp) {
      const [lo, hi] = this.def.xp;
      const xp = lo + Math.floor((world.rand ? world.rand.next() : Math.random()) * (hi - lo + 1));
      if (xp > 0) {
        world.spawnEntity('xp_orb', this.pos.x, this.pos.y + 0.5, this.pos.z, { value: xp });
      }
    }
  }

  knockback(dx, dz, power) {
    this.vel.x += dx * power;
    this.vel.y = 0.4;
    this.vel.z += dz * power;
    this.knockbackX = dx * power;
    this.knockbackZ = dz * power;
  }

  // -------------------------------------------------------------------------
  distanceTo(other) {
    const dx = this.pos.x - other.pos.x;
    const dy = this.pos.y - other.pos.y;
    const dz = this.pos.z - other.pos.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  canSee(world, other) {
    const ox = this.pos.x;
    const oy = this.pos.y + (this.def ? this.def.height * 0.85 : 1.6);
    const oz = this.pos.z;
    const tx = other.pos.x;
    const ty = other.pos.y + (other.def ? other.def.height * 0.85 : 1.6);
    const tz = other.pos.z;
    const dx = tx - ox, dy = ty - oy, dz = tz - oz;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < 1e-4) return true;
    const result = world.raycast({ x: ox, y: oy, z: oz }, { x: dx / dist, y: dy / dist, z: dz / dist }, dist + 0.5);
    return !result || result.dist >= dist - 0.5;
  }

  lookAt(x, y, z) {
    const dx = x - this.pos.x;
    const dy = y - (this.pos.y + this.height * 0.85);
    const dz = z - this.pos.z;
    const hdist = Math.sqrt(dx * dx + dz * dz);
    this.yaw = Math.atan2(-dx, dz);
    this.pitch = Math.atan2(-dy, hdist);
    this.headYaw = this.yaw;
  }

  // -------------------------------------------------------------------------
  tick(world, registry) {
    this.age++;
    this.prevPos.x = this.pos.x;
    this.prevPos.y = this.pos.y;
    this.prevPos.z = this.pos.z;

    if (this.dead) {
      this.deathTime++;
      if (this.deathTime > 20) this.removed = true;
      return;
    }

    if (this.invulnTicks > 0) this.invulnTicks--;
    if (this.hurtTime > 0) this.hurtTime--;
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.loveTicks > 0) this.loveTicks--;
    if (this.breedCooldown > 0) this.breedCooldown--;
    if (this.panicTicks > 0) this.panicTicks--;

    // Void damage
    if (this.pos.y < ENT_VOID_Y) {
      this.damage(4, { type: 'void' }, world);
    }

    // Fire damage
    if (this.fireTicks > 0) {
      this.fireTicks--;
      if (this.fireTicks % ENT_FIRE_DMG_INTERVAL === 0) {
        if (!(this.def && this.def.fireImmune)) {
          this.damage(1, { type: 'fire' }, world);
        }
      }
    }

    // Drowning damage
    if (this.inWater && !(this.def && this.def.waterMob)) {
      if (this.airTicks <= 0 && this.age % ENT_DROWN_DMG_INTERVAL === 0) {
        this.damage(2, { type: 'drowning' }, world);
      }
    }

    // Fall tracking
    if (!this.onGround && !this.inWater && !this.inLava) {
      if (this.vel.y < 0) {
        if (this._fallY === null) this._fallY = this.pos.y;
        else this._fallDistance = Math.max(this._fallDistance, this._fallY - this.pos.y);
      }
    } else if (this.onGround) {
      if (this._fallDistance > ENT_FALL_DMG_THRESHOLD) {
        const dmg = Math.floor(this._fallDistance - ENT_FALL_DMG_THRESHOLD);
        if (dmg > 0) this.damage(dmg, { type: 'fall' }, world);
      }
      this._fallY = null;
      this._fallDistance = 0;
    }

    // Lava fire ignition
    if (this.inLava && !(this.def && this.def.fireImmune)) {
      this.fireTicks = 300;
    }

    // Physics
    this.updateFluidState(world);
    this.applyGravity(world);
    this.applyDrag();

    if (!this.noClip) {
      this.move(world, this.vel.x, this.vel.y, this.vel.z, registry);
    }

    // Despawn
    if (this.def && this.def.category === 'hostile') {
      this.despawnTimer++;
    }

    // Limb swing
    const hspeed = Math.sqrt(this.vel.x * this.vel.x + this.vel.z * this.vel.z);
    this.limbSwingAmount = hspeed > 0.01 ? Math.min(1, hspeed * 4) : 0;
    if (this.limbSwingAmount > 0.01) this.limbSwing += hspeed * 2;
    this.animTime++;
  }

  // -------------------------------------------------------------------------
  serialize() {
    return {
      id: this.id, type: this.type,
      pos: { ...this.pos }, vel: { ...this.vel },
      yaw: this.yaw, pitch: this.pitch,
      health: this.health, maxHealth: this.maxHealth,
      age: this.age, dead: this.dead, removed: this.removed,
      fireTicks: this.fireTicks, airTicks: this.airTicks,
      baby: this.baby, variant: this.variant,
      tamed: this.tamed, sitting: this.sitting,
      loveTicks: this.loveTicks, breedCooldown: this.breedCooldown,
    };
  }

  static deserialize(data) {
    const e = new Entity(data.type, null);
    e.id = data.id;
    e.pos = { ...data.pos };
    e.vel = { ...data.vel };
    e.yaw = data.yaw; e.pitch = data.pitch;
    e.health = data.health; e.maxHealth = data.maxHealth;
    e.age = data.age; e.dead = data.dead; e.removed = data.removed;
    e.fireTicks = data.fireTicks; e.airTicks = data.airTicks;
    e.baby = data.baby; e.variant = data.variant;
    e.tamed = data.tamed; e.sitting = data.sitting;
    e.loveTicks = data.loveTicks; e.breedCooldown = data.breedCooldown;
    return e;
  }
}

// ---------------------------------------------------------------------------
// ItemEntity: bobs, merges nearby stacks, 5-min despawn, pickup delay
// ---------------------------------------------------------------------------
const ENT_ITEM_DESPAWN = 6000;   // 5 minutes at 20 tps
const ENT_ITEM_PICKUP_DELAY = 10;
const ENT_ITEM_MERGE_RANGE = 0.5;

export class ItemEntity extends Entity {
  constructor(item, count) {
    super('item', null);
    this.item = item;
    this.count = count || 1;
    this.pickupDelay = ENT_ITEM_PICKUP_DELAY;
    this.width = 0.25;
    this.height = 0.25;
    this.health = 5;
    this.maxHealth = 5;
    this.gravityScale = 1;
    this._bobOffset = 0;
  }

  tick(world, registry) {
    super.tick(world, registry);
    if (this.removed) return;

    if (this.pickupDelay > 0) this.pickupDelay--;
    this.despawnTimer++;
    if (this.despawnTimer >= ENT_ITEM_DESPAWN) { this.removed = true; return; }

    // Bob animation
    this._bobOffset = (this.age * 0.05) % (Math.PI * 2);

    // Merge nearby identical stacks
    if (world.entities) {
      for (const other of world.entities) {
        if (other === this || other.removed) continue;
        if (!(other instanceof ItemEntity)) continue;
        if (other.item !== this.item) continue;
        if (other.count + this.count > 64) continue;
        const dx = other.pos.x - this.pos.x;
        const dy = other.pos.y - this.pos.y;
        const dz = other.pos.z - this.pos.z;
        if (dx * dx + dy * dy + dz * dz < ENT_ITEM_MERGE_RANGE * ENT_ITEM_MERGE_RANGE) {
          this.count += other.count;
          other.removed = true;
        }
      }
    }
  }

  serialize() {
    return { ...super.serialize(), item: this.item, count: this.count, pickupDelay: this.pickupDelay };
  }
}

// ---------------------------------------------------------------------------
// Projectile: arrow, fireball, snowball, splash potion base
// ---------------------------------------------------------------------------
export class Projectile extends Entity {
  constructor(type, owner) {
    super(type, null);
    this.owner = owner || null;
    this.width = 0.25;
    this.height = 0.25;
    this.noGravity = false;
    this.gravityScale = type === 'fireball' ? 0 : 0.05;
    this.damage = 2;
    this.critical = false;
    this.inGround = false;
    this._groundTicks = 0;
  }

  onHit(world, hit) {
    // Override in subclasses; default: damage the hit entity
    if (hit && hit.entity) {
      hit.entity.damage(this.damage, this, world);
    }
    this.removed = true;
  }

  tick(world, registry) {
    if (this.inGround) {
      this._groundTicks++;
      if (this._groundTicks > 1200) this.removed = true;
      return;
    }
    this.prevPos.x = this.pos.x;
    this.prevPos.y = this.pos.y;
    this.prevPos.z = this.pos.z;
    this.age++;
    this.animTime++;

    if (!this.noGravity) {
      this.vel.y -= ENT_GRAVITY * this.gravityScale;
    }

    const dist = Math.sqrt(this.vel.x * this.vel.x + this.vel.y * this.vel.y + this.vel.z * this.vel.z);
    if (dist > 0) {
      // Check entity hits first
      if (world.entities) {
        for (const e of world.entities) {
          if (e === this || e === this.owner || e.removed) continue;
          const box = e.aabbOf ? e.aabbOf() : null;
          if (!box) continue;
          if (ENT_rayHitsBox(this.pos, this.vel, box)) {
            this.onHit(world, { entity: e });
            return;
          }
        }
      }
    }

    // Block collision check
    const nx = this.pos.x + this.vel.x;
    const ny = this.pos.y + this.vel.y;
    const nz = this.pos.z + this.vel.z;
    if (world.isSolid(Math.floor(nx), Math.floor(ny), Math.floor(nz))) {
      this.inGround = true;
      this.vel.x = 0; this.vel.y = 0; this.vel.z = 0;
      this.onHit(world, { block: { x: Math.floor(nx), y: Math.floor(ny), z: Math.floor(nz) } });
      return;
    }

    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    this.pos.z += this.vel.z;
    this.vel.x *= 0.99;
    this.vel.z *= 0.99;
  }

  serialize() {
    return { ...super.serialize(), damage: this.damage, inGround: this.inGround };
  }
}

function ENT_rayHitsBox(pos, vel, box) {
  const len = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
  if (len < 1e-9) return false;
  const dx = vel.x / len, dy = vel.y / len, dz = vel.z / len;
  let tmin = 0, tmax = len;
  for (let i = 0; i < 3; i++) {
    const o = i === 0 ? pos.x : (i === 1 ? pos.y : pos.z);
    const d = i === 0 ? dx : (i === 1 ? dy : dz);
    const lo = i === 0 ? box.minX : (i === 1 ? box.minY : box.minZ);
    const hi = i === 0 ? box.maxX : (i === 1 ? box.maxY : box.maxZ);
    if (Math.abs(d) < 1e-9) {
      if (o < lo || o > hi) return false;
    } else {
      let t1 = (lo - o) / d, t2 = (hi - o) / d;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }
  }
  return true;
}
