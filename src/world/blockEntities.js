// ---------------------------------------------------------------------------
// Block entities: chest, furnace, spawner, sign, bed.
//
// A block entity is the mutable, tickable state that lives *alongside* a block
// (its inventory, smelt progress, spawner cooldown, sign text). The World owns
// them per-chunk (Chunk.blockEntities keyed by local index) and drives their
// tick() from the fixed-timestep tick loop.
//
// All module-level helpers prefixed BE_ for concatenation safety.
// ---------------------------------------------------------------------------

import { ChestContainer, FurnaceContainer, ItemStack } from '../player/inventory.js';

// A player is "near" a spawner within this many blocks (Manhattan-ish sphere).
const BE_SPAWNER_ACTIVATE_RANGE = 16;
const BE_SPAWNER_RANGE2 = BE_SPAWNER_ACTIVATE_RANGE * BE_SPAWNER_ACTIVATE_RANGE;
const BE_SPAWNER_MIN_DELAY = 200;
const BE_SPAWNER_MAX_DELAY = 800;
const BE_SPAWNER_SPAWN_RADIUS = 4;
const BE_SPAWNER_MAX_NEARBY = 6;    // stop spawning once this many of the mob are close
const BE_CHEST_OPEN_SPEED = 0.1;    // lid animation per tick

function BE_clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

// ---------------------------------------------------------------------------
// BlockEntity base
// ---------------------------------------------------------------------------
export class BlockEntity {
  constructor(kind, x, y, z) {
    this.kind = kind;
    this.x = x | 0;
    this.y = y | 0;
    this.z = z | 0;
    /** Set true by tick() when visual state changed and a remesh/redraw helps. */
    this.dirty = false;
    /** Generic data bag for subclasses that don't need a full serialize(). */
    this.data = null;
  }

  /** Advance one world tick. Overridden by subclasses. */
  tick(world) { /* base block entities are inert */ }

  /** Called when the block is removed: drop contents, etc. Override as needed. */
  onRemoved(world) { }

  serialize() {
    return { kind: this.kind, x: this.x, y: this.y, z: this.z };
  }

  static deserialize(data) {
    const be = new BlockEntity(data.kind, data.x, data.y, data.z);
    be.data = data.data || null;
    return be;
  }
}

// ---------------------------------------------------------------------------
// ChestBlockEntity — 27-slot inventory + lid open/close animation.
// ---------------------------------------------------------------------------
export class ChestBlockEntity extends BlockEntity {
  constructor(x, y, z) {
    super('chest', x, y, z);
    this.container = new ChestContainer();
    this.openCount = 0;       // number of viewers
    this.lid = 0;             // 0 closed .. 1 open (animation state)
    this.prevLid = 0;
    this._playedOpen = false;
  }

  open(world) {
    if (this.openCount === 0 && world && world.playSound) {
      world.playSound('chestOpen', this.x + 0.5, this.y + 0.5, this.z + 0.5, {});
    }
    this.openCount++;
  }

  close(world) {
    this.openCount = Math.max(0, this.openCount - 1);
    if (this.openCount === 0 && world && world.playSound) {
      world.playSound('chestClose', this.x + 0.5, this.y + 0.5, this.z + 0.5, {});
    }
  }

  tick(world) {
    this.prevLid = this.lid;
    const target = this.openCount > 0 ? 1 : 0;
    if (this.lid < target) this.lid = Math.min(1, this.lid + BE_CHEST_OPEN_SPEED);
    else if (this.lid > target) this.lid = Math.max(0, this.lid - BE_CHEST_OPEN_SPEED);
  }

  onRemoved(world) {
    if (!world || !world.dropItem) return;
    const inv = this.container;
    for (let i = 0; i < 27; i++) {
      const s = inv.get(i);
      if (s && !s.isEmpty()) {
        world.dropItem(this.x + 0.5, this.y + 0.5, this.z + 0.5, s.itemId, s.count);
        inv.set(i, null);
      }
    }
  }

  /** Accept a plain [{item,count}|null,...] array (used by structures.fillChest). */
  loadSlots(slots) {
    if (!Array.isArray(slots)) return;
    for (let i = 0; i < slots.length && i < 27; i++) {
      const s = slots[i];
      if (s && s.item) this.container.set(i, new ItemStack(s.item, s.count || 1, 0));
    }
  }

  serialize() {
    return { kind: 'chest', x: this.x, y: this.y, z: this.z, container: this.container.serialize() };
  }

  static deserialize(data) {
    const be = new ChestBlockEntity(data.x, data.y, data.z);
    if (data.container) be.container.applySave(data.container);
    else if (Array.isArray(data.inventory)) be.loadSlots(data.inventory);
    return be;
  }
}

// ---------------------------------------------------------------------------
// FurnaceBlockEntity — wraps FurnaceContainer, swaps furnace<->furnace_lit.
// ---------------------------------------------------------------------------
export class FurnaceBlockEntity extends BlockEntity {
  constructor(x, y, z) {
    super('furnace', x, y, z);
    this.container = new FurnaceContainer();
    this._wasLit = false;
  }

  get lit() { return this.container.isLit(); }

  tick(world) {
    const changed = this.container.tick();
    const nowLit = this.container.isLit();
    if (nowLit !== this._wasLit && world) {
      // Swap the block between the unlit and lit variants without disturbing the
      // block entity (setBlock preserves the entity for the same entityBlock kind).
      const R = world._registry;
      if (R) {
        const wantName = nowLit ? 'furnace_lit' : 'furnace';
        const curId = world.getBlock(this.x, this.y, this.z);
        const curDef = R.def(curId);
        if (curDef && curDef.name !== wantName && (curDef.name === 'furnace' || curDef.name === 'furnace_lit')) {
          world.setBlock(this.x, this.y, this.z, R.id(wantName), { keepEntity: true, noFluidSchedule: true });
        }
      }
      this._wasLit = nowLit;
    }
    // Emit smoke + flame particles from the front while burning.
    if (nowLit && world && world.spawnParticles) {
      if ((world.tickCount & 3) === 0) {
        world.spawnParticles('smoke', this.x + 0.5, this.y + 0.9, this.z + 0.5, 1, {});
        world.spawnParticles('flame', this.x + 0.5, this.y + 0.35, this.z + 0.5, 1, {});
      }
    }
    if (changed) this.dirty = true;
  }

  onRemoved(world) {
    if (!world || !world.dropItem) return;
    for (let i = 0; i < 3; i++) {
      const s = this.container.get(i);
      if (s && !s.isEmpty()) {
        world.dropItem(this.x + 0.5, this.y + 0.5, this.z + 0.5, s.itemId, s.count);
        this.container.set(i, null);
      }
    }
  }

  serialize() {
    return { kind: 'furnace', x: this.x, y: this.y, z: this.z, container: this.container.serialize() };
  }

  static deserialize(data) {
    const be = new FurnaceBlockEntity(data.x, data.y, data.z);
    if (data.container) be.container.applySave(data.container);
    be._wasLit = be.container.isLit();
    return be;
  }
}

// ---------------------------------------------------------------------------
// SpawnerBlockEntity — periodically spawns a mob when a player is near, and
// drives the spinning miniature preview mob (spinAngle).
// ---------------------------------------------------------------------------
export class SpawnerBlockEntity extends BlockEntity {
  constructor(x, y, z, mobId) {
    super('spawner', x, y, z);
    this.mobId = mobId || 'zombie';
    this.delay = BE_SPAWNER_MIN_DELAY;
    this.minDelay = BE_SPAWNER_MIN_DELAY;
    this.maxDelay = BE_SPAWNER_MAX_DELAY;
    this.spawnCount = 4;      // up to this many attempts per fire
    this.spinAngle = 0;
    this.prevSpinAngle = 0;
    this._active = false;
  }

  _playerNear(world) {
    const p = world.nearestPlayer
      ? world.nearestPlayer(this.x + 0.5, this.y + 0.5, this.z + 0.5)
      : null;
    if (!p) return false;
    const dx = p.pos.x - (this.x + 0.5);
    const dy = p.pos.y - (this.y + 0.5);
    const dz = p.pos.z - (this.z + 0.5);
    return dx * dx + dy * dy + dz * dz <= BE_SPAWNER_RANGE2;
  }

  tick(world) {
    this.prevSpinAngle = this.spinAngle;
    const near = this._playerNear(world);
    this._active = near;
    if (!near) return;

    // Spin the display mob faster while active.
    this.spinAngle = (this.spinAngle + 0.09) % (Math.PI * 2);

    if (this.delay > 0) { this.delay--; return; }

    // Count how many of this mob are already close so we don't overpopulate.
    let nearby = 0;
    if (world.entities) {
      for (const e of world.entities) {
        if (e.removed || e.type !== this.mobId) continue;
        const dx = e.pos.x - (this.x + 0.5);
        const dz = e.pos.z - (this.z + 0.5);
        if (Math.abs(dx) <= 8 && Math.abs(dz) <= 8 && Math.abs(e.pos.y - this.y) <= 4) nearby++;
      }
    }
    if (nearby < BE_SPAWNER_MAX_NEARBY) {
      const rand = world.rand;
      const toSpawn = 1 + (rand ? rand.int(this.spawnCount) : 0);
      let spawned = 0;
      for (let i = 0; i < this.spawnCount * 2 && spawned < toSpawn; i++) {
        const ox = (rand ? rand.float(-1, 1) : 0) * BE_SPAWNER_SPAWN_RADIUS;
        const oy = (rand ? rand.int(3) - 1 : 0);
        const oz = (rand ? rand.float(-1, 1) : 0) * BE_SPAWNER_SPAWN_RADIUS;
        const sx = Math.floor(this.x + 0.5 + ox);
        const sy = this.y + oy;
        const sz = Math.floor(this.z + 0.5 + oz);
        // Require air to stand in and a solid floor.
        if (world.isAir(sx, sy, sz) && world.isAir(sx, sy + 1, sz) && world.isSolid(sx, sy - 1, sz)) {
          if (world.spawnEntity) {
            world.spawnEntity(this.mobId, sx + 0.5, sy, sz + 0.5, {});
            if (world.spawnParticles) world.spawnParticles('smoke', sx + 0.5, sy + 0.5, sz + 0.5, 6, {});
            spawned++;
          }
        }
      }
    }
    // Reset the cooldown.
    const rand = world.rand;
    this.delay = rand ? rand.range(this.minDelay, this.maxDelay) : this.maxDelay;
  }

  serialize() {
    return {
      kind: 'spawner', x: this.x, y: this.y, z: this.z,
      mobId: this.mobId, delay: this.delay,
    };
  }

  static deserialize(data) {
    const be = new SpawnerBlockEntity(data.x, data.y, data.z, data.mobId);
    be.delay = data.delay != null ? data.delay : BE_SPAWNER_MIN_DELAY;
    return be;
  }
}

// ---------------------------------------------------------------------------
// SignBlockEntity — up to 4 lines of text.
// ---------------------------------------------------------------------------
export class SignBlockEntity extends BlockEntity {
  constructor(x, y, z) {
    super('sign', x, y, z);
    this.lines = ['', '', '', ''];
    this.color = 'black';
    this.glowing = false;
  }

  setLine(i, text) {
    if (i >= 0 && i < 4) { this.lines[i] = String(text).slice(0, 90); this.dirty = true; }
  }

  tick(world) { /* signs are inert */ }

  serialize() {
    return {
      kind: 'sign', x: this.x, y: this.y, z: this.z,
      lines: this.lines.slice(), color: this.color, glowing: this.glowing,
    };
  }

  static deserialize(data) {
    const be = new SignBlockEntity(data.x, data.y, data.z);
    if (Array.isArray(data.lines)) be.lines = data.lines.slice(0, 4);
    while (be.lines.length < 4) be.lines.push('');
    be.color = data.color || 'black';
    be.glowing = !!data.glowing;
    return be;
  }
}

// ---------------------------------------------------------------------------
// BedBlockEntity — colour + occupancy + which half (head/foot).
// ---------------------------------------------------------------------------
export class BedBlockEntity extends BlockEntity {
  constructor(x, y, z, color, head) {
    super('bed', x, y, z);
    this.color = color || 'red';
    this.head = !!head;
    this.occupied = false;
  }

  tick(world) { /* beds are inert */ }

  serialize() {
    return {
      kind: 'bed', x: this.x, y: this.y, z: this.z,
      color: this.color, head: this.head, occupied: this.occupied,
    };
  }

  static deserialize(data) {
    const be = new BedBlockEntity(data.x, data.y, data.z, data.color, data.head);
    be.occupied = !!data.occupied;
    return be;
  }
}

// ---------------------------------------------------------------------------
// Factory used by World.setBlock: kind -> constructor.
// Each entry is (x,y,z,opts) -> BlockEntity.
// ---------------------------------------------------------------------------
export const BLOCK_ENTITY_FACTORY = {
  chest: (x, y, z) => new ChestBlockEntity(x, y, z),
  furnace: (x, y, z) => new FurnaceBlockEntity(x, y, z),
  spawner: (x, y, z, opts) => new SpawnerBlockEntity(x, y, z, opts && opts.mobId),
  sign: (x, y, z) => new SignBlockEntity(x, y, z),
  bed: (x, y, z, opts) => new BedBlockEntity(x, y, z, opts && opts.color, opts && opts.head),
};

/** Rebuild a block entity from its serialized form. */
export function deserializeBlockEntity(data) {
  if (!data || !data.kind) return null;
  switch (data.kind) {
    case 'chest': return ChestBlockEntity.deserialize(data);
    case 'furnace': return FurnaceBlockEntity.deserialize(data);
    case 'spawner': return SpawnerBlockEntity.deserialize(data);
    case 'sign': return SignBlockEntity.deserialize(data);
    case 'bed': return BedBlockEntity.deserialize(data);
    default: return BlockEntity.deserialize(data);
  }
}
