// ---------------------------------------------------------------------------
// Player entity — survival/creative, physics, breaking, placing, inventory.
// All module-level helpers prefixed PLAYER_.
// ---------------------------------------------------------------------------

import { Entity } from '../entities/entity.js';
import { aabb, aabbOverlap, aabbOffset, clamp } from '../core/util.js';
import {
  TOOL_NONE, TOOL_PICK, TOOL_AXE, TOOL_SHOVEL, TOOL_HOE, TOOL_SHEARS, TOOL_SWORD,
  TIER_HAND, TIER_WOOD, TIER_STONE, TIER_IRON, TIER_GOLD, TIER_DIAMOND, TIER_NETHERITE,
  TIER_SPEED, TIER_HARVEST,
} from '../world/blocks.js';
import { ITEMS_BY_ID } from '../data/items.js';
import { PlayerInventory, ItemStack, dropInventoryOnDeath } from './inventory.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLAYER_W = 0.6;
const PLAYER_H_NORMAL = 1.8;
const PLAYER_H_CROUCH = 1.5;
const PLAYER_EYE_NORMAL = 1.62;
const PLAYER_EYE_CROUCH = 1.27;

const PLAYER_WALK_SPEED = 4.317 / 20;   // blocks per tick
const PLAYER_SPRINT_SPEED = 5.612 / 20;
const PLAYER_SNEAK_SPEED = 1.3 / 20;
const PLAYER_FLY_SPEED = 10.9 / 20;
const PLAYER_SWIM_SPEED = 2.0 / 20;

const PLAYER_JUMP_VEL = 0.42;
const PLAYER_STEP_HEIGHT = 0.6;

const PLAYER_GRAVITY = 0.08;
const PLAYER_AIR_FRICTION = 0.91;
const PLAYER_GROUND_FRICTION = 0.6;
/** Fraction of ground acceleration available while airborne. */
const PLAYER_AIR_CONTROL = 0.22;

const PLAYER_EXHAUSTION_WALK = 0.01;
const PLAYER_EXHAUSTION_SPRINT = 0.1;
const PLAYER_EXHAUSTION_JUMP = 0.05;
const PLAYER_EXHAUSTION_SPRINT_JUMP = 0.2;
const PLAYER_EXHAUSTION_MINE = 0.005;
const PLAYER_EXHAUSTION_DAMAGE = 0.3;
const PLAYER_EXHAUSTION_MAX = 4.0;

const PLAYER_MAX_AIR = 300;
const PLAYER_REGEN_TICK = 80;  // ticks between regen when hunger >= 18
const PLAYER_STARVE_TICK = 80;

const PLAYER_ATTACK_COOLDOWN = 10; // ticks
const PLAYER_PLACE_COOLDOWN = 4;

// Tool kind -> TOOL_ constant
const PLAYER_TOOL_KIND = {
  pick: TOOL_PICK, axe: TOOL_AXE, shovel: TOOL_SHOVEL,
  hoe: TOOL_HOE, shears: TOOL_SHEARS, sword: TOOL_SWORD,
};

function PLAYER_getItemDef(id) {
  return id ? (ITEMS_BY_ID.get(id) || null) : null;
}

function PLAYER_toolForHeldItem(inv) {
  const held = inv.heldItem;
  if (!held) return null;
  const def = PLAYER_getItemDef(held.itemId);
  return (def && def.tool) ? def.tool : null;
}

function PLAYER_toolSpeed(tool) {
  if (!tool) return TIER_SPEED[TIER_HAND]; // 1
  return TIER_SPEED[tool.tier] || 1;
}

function PLAYER_toolHarvestLevel(tool) {
  if (!tool) return TIER_HARVEST[TIER_HAND]; // 0
  return TIER_HARVEST[tool.tier] || 0;
}

function PLAYER_toolKindMatches(tool, blockToolType) {
  if (blockToolType === TOOL_NONE) return true;
  if (!tool) return false;
  const kind = PLAYER_TOOL_KIND[tool.kind] || TOOL_NONE;
  return kind === blockToolType;
}

function PLAYER_computeBreakSpeed(tool, blockDef) {
  if (!blockDef || blockDef.hardness < 0) return 0; // unbreakable
  const hardness = blockDef.hardness;
  if (hardness === 0) return 1;
  const toolKindOk = PLAYER_toolKindMatches(tool, blockDef.tool);
  const speed = toolKindOk ? PLAYER_toolSpeed(tool) : 1;
  const harvestOk = toolKindOk && (PLAYER_toolHarvestLevel(tool) >= (blockDef.harvestLevel || 0));
  // If requiresTool and tool can't harvest: 1/30 penalty on top
  const penalty = (blockDef.requiresTool && !harvestOk) ? 5 : 1;
  return speed / (hardness * 30 * penalty);
}

// Face offsets: +X -X +Y -Y +Z -Z
const PLAYER_FACE_DX = [1, -1, 0, 0, 0, 0];
const PLAYER_FACE_DY = [0, 0, 1, -1, 0, 0];
const PLAYER_FACE_DZ = [0, 0, 0, 0, 1, -1];

// XP level curve
function PLAYER_xpForLevel(lvl) {
  if (lvl <= 15) return 2 * lvl + 7;
  if (lvl <= 30) return 5 * lvl - 38;
  return 9 * lvl - 158;
}

function PLAYER_totalXpToLevel(lvl) {
  let total = 0;
  for (let i = 0; i < lvl; i++) total += PLAYER_xpForLevel(i);
  return total;
}

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

/** Neutral input, used when the player has no controller attached. */
const PLAYER_NO_INPUT = Object.freeze({
  forward: false, back: false, left: false, right: false,
  jump: false, sneak: false, sprint: false, attack: false, use: false,
});

export class Player extends Entity {
  constructor(def) {
    super('player', def || {
      width: PLAYER_W, height: PLAYER_H_NORMAL, health: 20,
    });

    this.width = PLAYER_W;
    this.height = PLAYER_H_NORMAL;
    this.eyeHeight = PLAYER_EYE_NORMAL;

    // Game mode
    this.gameMode = 'survival';

    // Movement state
    this.onGround = false;
    this.isCrouching = false;
    this.isSprinting = false;
    this.isFlying = false;
    this.isSwimming = false;
    this.isClimbing = false;

    // Creative flight double-tap
    this._spacePressedLastTick = false;
    this._spaceDoubleTapTimer = 0;

    // Fall tracking
    this._fallDistance = 0;
    this._fallY = null;

    // Survival stats
    this.health = 20;
    this.maxHealth = 20;
    this.hunger = 20;
    this.saturation = 5;
    this.exhaustion = 0;
    this._regenTimer = 0;
    this._starveTimer = 0;
    this._dieTimer = 0;

    // Air / oxygen
    this.airTicks = PLAYER_MAX_AIR;

    // XP
    this.xp = 0;
    this.xpLevel = 0;
    this.xpProgress = 0;

    // Respawn
    this.bedPos = null;
    this.spawnPos = { x: 0, y: 64, z: 0 };
    this._deathPos = null;

    // Inventory
    this.inventory = new PlayerInventory();

    // Combat
    this._attackCooldown = 0;
    this._placeCooldown = 0;
    this._criticalFall = false;

    // Breaking state
    this.breakingBlock = null; // {x,y,z}
    this.breakProgress = 0;    // 0..1
    this.breakStage = 0;       // 0..9

    // Eating state
    this._eatingTicks = 0;
    this._eatingItem = null;

    // Armor
    this.armorSlots = this.inventory.armor;

    // Open container
    this.openContainer = null;
  }

  get eyePos() {
    return {
      x: this.pos.x,
      y: this.pos.y + this.eyeHeight,
      z: this.pos.z,
    };
  }

  get isCreative() { return this.gameMode === 'creative'; }

  aabbOf() {
    const hw = PLAYER_W * 0.5;
    const h = this.isCrouching ? PLAYER_H_CROUCH : PLAYER_H_NORMAL;
    return aabb(
      this.pos.x - hw, this.pos.y, this.pos.z - hw,
      this.pos.x + hw, this.pos.y + h, this.pos.z + hw,
    );
  }

  // ---------------------------------------------------------------------------
  // XP
  // ---------------------------------------------------------------------------

  addXp(n) {
    this.xp += n;
    // Process level-ups
    while (true) {
      const needed = PLAYER_xpForLevel(this.xpLevel);
      if (this.xp >= needed) {
        this.xp -= needed;
        this.xpLevel++;
      } else {
        break;
      }
    }
    this.xpProgress = this.xpLevel > 0
      ? this.xp / PLAYER_xpForLevel(this.xpLevel)
      : 0;
  }

  // ---------------------------------------------------------------------------
  // Armor defense
  // ---------------------------------------------------------------------------

  _totalDefense() {
    return this.inventory.totalArmorDefense();
  }

  // ---------------------------------------------------------------------------
  // damage override — apply armor reduction
  // ---------------------------------------------------------------------------

  damage(amount, source, world) {
    if (this.isCreative) return; // creative is invincible
    if (this.dead || this.removed) return;
    if (this.invulnTicks > 0) return;

    // Armor reduces: factor = 1 - defense*0.04
    const defense = this._totalDefense();
    const factor = Math.max(0, 1 - defense * 0.04);
    amount = amount * factor;

    if (amount <= 0) {
      this.invulnTicks = 10;
      return;
    }

    // Exhaust for taking damage
    this._addExhaustion(PLAYER_EXHAUSTION_DAMAGE);

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

    // Damage armor
    if (world && source) {
      this.inventory.damageArmor(1, world.rand || { next: () => 0.5 });
    }

    if (this.health <= 0) {
      this.health = 0;
      this._onDeath(world);
    }
  }

  _onDeath(world) {
    this.dead = true;
    this._deathPos = { ...this.pos };
    if (world) {
      dropInventoryOnDeath(world, this);
    }
  }

  // ---------------------------------------------------------------------------
  // Exhaustion / hunger management
  // ---------------------------------------------------------------------------

  _addExhaustion(amount) {
    this.exhaustion += amount;
    while (this.exhaustion >= PLAYER_EXHAUSTION_MAX) {
      this.exhaustion -= PLAYER_EXHAUSTION_MAX;
      if (this.saturation > 0) {
        this.saturation = Math.max(0, this.saturation - 1);
      } else if (this.hunger > 0) {
        this.hunger = Math.max(0, this.hunger - 1);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Respawn
  // ---------------------------------------------------------------------------

  respawn(world) {
    this.dead = false;
    this.removed = false;
    this.health = 20;
    this.hunger = 20;
    this.saturation = 5;
    this.exhaustion = 0;
    this.airTicks = PLAYER_MAX_AIR;
    this.fireTicks = 0;
    this.vel.x = 0; this.vel.y = 0; this.vel.z = 0;
    this.breakProgress = 0;
    this.breakStage = 0;
    this.breakingBlock = null;
    this.isFlying = false;
    this.isCrouching = false;
    this.isSprinting = false;
    this._fallDistance = 0;
    this._fallY = null;

    // Teleport to bed or world spawn
    const sp = this.bedPos || this.spawnPos || { x: 0, y: 64, z: 0 };
    this.pos.x = sp.x;
    this.pos.y = sp.y;
    this.pos.z = sp.z;
  }

  // ---------------------------------------------------------------------------
  // Attack
  // ---------------------------------------------------------------------------

  attack(world, entity) {
    if (this._attackCooldown > 0) return;

    const held = this.inventory.heldItem;
    const toolDef = held ? PLAYER_getItemDef(held.itemId) : null;
    const tool = toolDef ? toolDef.tool : null;
    let damage = tool ? (tool.damage || 1) : 1;

    // Critical hit: falling (not on ground, not climbing)
    const isCrit = !this.onGround && !this.isClimbing && !this.inWater && this.vel.y < 0;
    if (isCrit) {
      damage = Math.floor(damage * 1.5);
      world.spawnParticles('crit', entity.pos.x, entity.pos.y + entity.height * 0.5, entity.pos.z, 6, {});
    }

    entity.damage(damage, this, world);
    this._attackCooldown = PLAYER_ATTACK_COOLDOWN;

    // Knockback
    const dx = entity.pos.x - this.pos.x;
    const dz = entity.pos.z - this.pos.z;
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    entity.knockback(dx / len, dz / len, 0.4);

    // Damage held tool
    if (held && toolDef && toolDef.tool) {
      held.damage += 1;
      if (held.damage >= toolDef.tool.durability) {
        world.playSound('item_break', this.pos.x, this.pos.y, this.pos.z, {});
        this.inventory.set(this.inventory.selected, null);
      }
    }

    // Exhaust
    this._addExhaustion(PLAYER_EXHAUSTION_DAMAGE * 0.5);
  }

  // ---------------------------------------------------------------------------
  // Block breaking
  // ---------------------------------------------------------------------------

  updateBreaking(world, dt, registry) {
    if (!this.breakingBlock) {
      this.breakProgress = 0;
      this.breakStage = 0;
      return;
    }

    const { x, y, z } = this.breakingBlock;
    const blockId = world.getBlock(x, y, z);
    if (!blockId) {
      this.breakingBlock = null;
      this.breakProgress = 0;
      this.breakStage = 0;
      return;
    }

    const blockDef = registry ? registry.def(blockId) : null;
    if (!blockDef) {
      this.breakingBlock = null;
      return;
    }

    // Creative: instant break
    if (this.isCreative) {
      this._completeBreak(world, x, y, z, blockId, blockDef, registry);
      return;
    }

    const tool = PLAYER_toolForHeldItem(this.inventory);
    const speed = PLAYER_computeBreakSpeed(tool, blockDef);

    this.breakProgress += speed;
    this.breakStage = Math.min(9, Math.floor(this.breakProgress * 10));

    this._addExhaustion(PLAYER_EXHAUSTION_MINE);

    if (this.breakProgress >= 1.0) {
      this._completeBreak(world, x, y, z, blockId, blockDef, registry);
    }
  }

  _completeBreak(world, x, y, z, blockId, blockDef, registry) {
    this.breakingBlock = null;
    this.breakProgress = 0;
    this.breakStage = 0;

    world.playSound(blockDef.breakSound || 'stone', x + 0.5, y + 0.5, z + 0.5, {});
    world.spawnParticles('blockBreak', x + 0.5, y + 0.5, z + 0.5, 8, {
      tile: blockDef.tiles ? (blockDef.tiles.all || blockDef.tiles.side || '') : '',
    });

    const tool = PLAYER_toolForHeldItem(this.inventory);
    const toolKindOk = PLAYER_toolKindMatches(tool, blockDef.tool);
    const harvestOk = toolKindOk && PLAYER_toolHarvestLevel(tool) >= (blockDef.harvestLevel || 0);
    const canHarvest = !blockDef.requiresTool || harvestOk;

    if (canHarvest) {
      // Drop items
      const drops = blockDef.drops || [];
      const rng = world.rand || { next: () => 0.5 };
      for (const drop of drops) {
        const chance = drop.chance !== undefined ? drop.chance : 1;
        if (rng.next() > chance) continue;
        const max = drop.max !== undefined ? drop.max : drop.count;
        const count = drop.count + (max > drop.count ? Math.floor(rng.next() * (max - drop.count + 1)) : 0);
        if (count > 0) {
          world.dropItem(x + 0.5, y + 0.5, z + 0.5, drop.item, count);
        }
      }
      // XP drop
      if (blockDef.xpDrop && blockDef.xpDrop > 0) {
        this.addXp(Math.ceil(blockDef.xpDrop));
      }
    }

    world.setBlock(x, y, z, 0, {});

    // Damage held tool
    if (!this.isCreative && tool) {
      const held = this.inventory.heldItem;
      const toolItemDef = held ? PLAYER_getItemDef(held.itemId) : null;
      if (held && toolItemDef && toolItemDef.tool) {
        held.damage += 1;
        if (held.damage >= toolItemDef.tool.durability) {
          world.playSound('item_break', this.pos.x, this.pos.y, this.pos.z, {});
          this.inventory.set(this.inventory.selected, null);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Block placing
  // ---------------------------------------------------------------------------

  placeBlock(world, hit, registry) {
    if (this._placeCooldown > 0) return false;

    const held = this.inventory.heldItem;
    if (!held || held.isEmpty()) return false;
    const itemDef = PLAYER_getItemDef(held.itemId);
    if (!itemDef || !itemDef.block) return false;

    const blockName = itemDef.block;
    if (!registry) return false;
    const blockDef = registry.get(blockName);
    if (!blockDef) return false;
    const blockId = blockDef.id;

    // Compute placement position from face
    const face = hit.face;
    const tx = hit.x + PLAYER_FACE_DX[face];
    const ty = hit.y + PLAYER_FACE_DY[face];
    const tz = hit.z + PLAYER_FACE_DZ[face];

    // Check if target is replaceable
    const existingId = world.getBlock(tx, ty, tz);
    const existingDef = existingId ? registry.def(existingId) : null;
    if (existingId && existingDef && !existingDef.replaceable) return false;

    // Check collision with player
    const playerBox = this.aabbOf();
    const blockBox = aabb(tx, ty, tz, tx + 1, ty + 1, tz + 1);
    if (aabbOverlap(playerBox, blockBox)) return false;

    // Check collision with other entities
    if (world.entities) {
      for (const ent of world.entities) {
        if (ent === this || ent.removed) continue;
        const eb = ent.aabbOf ? ent.aabbOf() : null;
        if (eb && aabbOverlap(eb, blockBox)) return false;
      }
    }

    world.setBlock(tx, ty, tz, blockId, {});
    world.playSound(blockDef.placeSound || 'stone', tx + 0.5, ty + 0.5, tz + 0.5, {});

    // Consume item in survival
    if (!this.isCreative) {
      held.count -= 1;
      if (held.count <= 0) this.inventory.set(this.inventory.selected, null);
    }

    this._placeCooldown = PLAYER_PLACE_COOLDOWN;
    return true;
  }

  // ---------------------------------------------------------------------------
  // Interaction
  // ---------------------------------------------------------------------------

  interact(world, hit, registry) {
    if (!hit) return false;
    const { x, y, z } = hit;
    const blockId = world.getBlock(x, y, z);
    if (!blockId) return false;
    const blockDef = registry ? registry.def(blockId) : null;
    if (!blockDef) return false;
    const interact = blockDef.interact;

    if (!interact) {
      // Check held item for actions
      const held = this.inventory.heldItem;
      const itemDef = held ? PLAYER_getItemDef(held.itemId) : null;
      if (itemDef && itemDef.action === 'bucket_fill') {
        return this._useBucket(world, hit, registry, held, itemDef);
      }
      if (itemDef && itemDef.action === 'flint_steel') {
        return this._useFlintAndSteel(world, hit, registry, held, itemDef);
      }
      return false;
    }

    if (interact === 'chest') {
      this.openContainer = { type: 'chest', x, y, z };
      return true;
    }
    if (interact === 'furnace') {
      this.openContainer = { type: 'furnace', x, y, z };
      return true;
    }
    if (interact === 'craft') {
      this.openContainer = { type: 'crafting', x, y, z };
      return true;
    }
    if (interact === 'door') {
      // Toggle door open/closed (simple: toggle block between two states)
      const blockName = blockDef.name;
      // Find paired open/closed version
      let targetName;
      if (blockName.endsWith('_lower') || blockName.endsWith('_gate')) {
        targetName = blockName; // same block, flip state via meta (simplified)
      }
      world.playSound('door_toggle', x + 0.5, y + 0.5, z + 0.5, {});
      return true;
    }
    if (interact === 'bed') {
      this.bedPos = { x, y: y + 0.6, z };
      return true;
    }
    if (interact === 'tnt') {
      const held = this.inventory.heldItem;
      const itemDef = held ? PLAYER_getItemDef(held.itemId) : null;
      if (itemDef && itemDef.action === 'flint_steel') {
        world.explode(x + 0.5, y + 0.5, z + 0.5, 4, { fire: false });
        world.setBlock(x, y, z, 0, {});
        if (!this.isCreative) {
          held.damage += 1;
          const toolDef = itemDef.tool;
          if (toolDef && held.damage >= toolDef.durability) {
            this.inventory.set(this.inventory.selected, null);
          }
        }
        return true;
      }
      return false;
    }

    // Try held item actions as fallback
    const held = this.inventory.heldItem;
    const itemDef = held ? PLAYER_getItemDef(held.itemId) : null;
    if (itemDef) {
      if (itemDef.food) return this._startEating(itemDef, held);
      if (itemDef.action === 'bucket_fill') return this._useBucket(world, hit, registry, held, itemDef);
      if (itemDef.action === 'flint_steel') return this._useFlintAndSteel(world, hit, registry, held, itemDef);
      if (itemDef.action === 'shears') return this._useShears(world, hit, held, itemDef);
    }

    return false;
  }

  _startEating(itemDef, stack) {
    if (this.hunger >= 20 && !this.isCreative) return false;
    this._eatingItem = itemDef;
    this._eatingTicks = itemDef.food.eatTicks || 32;
    return true;
  }

  _finishEating(world) {
    const food = this._eatingItem;
    if (!food || !food.food) return;
    this.hunger = Math.min(20, this.hunger + food.food.hunger);
    this.saturation = Math.min(this.hunger, this.saturation + food.food.saturation);
    world.spawnParticles('item', this.pos.x, this.pos.y + this.eyeHeight, this.pos.z, 5, { item: food.id });
    world.playSound('eat', this.pos.x, this.pos.y, this.pos.z, {});

    if (!this.isCreative) {
      const held = this.inventory.heldItem;
      if (held && held.itemId === food.id) {
        held.count -= 1;
        if (held.count <= 0) this.inventory.set(this.inventory.selected, null);
      }
    }
    this._eatingItem = null;
    this._eatingTicks = 0;
  }

  _useBucket(world, hit, registry, held, itemDef) {
    const { x, y, z } = hit;
    if (held.itemId === 'bucket') {
      // Fill bucket from water/lava
      const blockId = world.getBlock(x, y, z);
      const blockDef = registry ? registry.def(blockId) : null;
      if (blockDef && blockDef.fluid === 'water') {
        world.setBlock(x, y, z, 0, {});
        if (!this.isCreative) {
          held.itemId = 'water_bucket';
        }
        return true;
      }
      if (blockDef && blockDef.fluid === 'lava') {
        world.setBlock(x, y, z, 0, {});
        if (!this.isCreative) {
          held.itemId = 'lava_bucket';
        }
        return true;
      }
    } else if (held.itemId === 'water_bucket') {
      // Empty water bucket
      const face = hit.face;
      const tx = x + PLAYER_FACE_DX[face];
      const ty = y + PLAYER_FACE_DY[face];
      const tz = z + PLAYER_FACE_DZ[face];
      const waterId = registry ? registry.idOr('water', 0) : 0;
      if (waterId) {
        world.setBlock(tx, ty, tz, waterId, {});
        if (!this.isCreative) held.itemId = 'bucket';
        return true;
      }
    } else if (held.itemId === 'lava_bucket') {
      const face = hit.face;
      const tx = x + PLAYER_FACE_DX[face];
      const ty = y + PLAYER_FACE_DY[face];
      const tz = z + PLAYER_FACE_DZ[face];
      const lavaId = registry ? registry.idOr('lava', 0) : 0;
      if (lavaId) {
        world.setBlock(tx, ty, tz, lavaId, {});
        if (!this.isCreative) held.itemId = 'bucket';
        return true;
      }
    }
    return false;
  }

  _useFlintAndSteel(world, hit, registry, held, itemDef) {
    const face = hit.face;
    const tx = hit.x + PLAYER_FACE_DX[face];
    const ty = hit.y + PLAYER_FACE_DY[face];
    const tz = hit.z + PLAYER_FACE_DZ[face];
    const fireId = registry ? registry.idOr('fire', 0) : 0;
    if (fireId) {
      const existing = world.getBlock(tx, ty, tz);
      if (!existing) {
        world.setBlock(tx, ty, tz, fireId, {});
        world.playSound('flint_steel', tx + 0.5, ty + 0.5, tz + 0.5, {});
        if (!this.isCreative) {
          held.damage += 1;
          if (held.damage >= (itemDef.tool ? itemDef.tool.durability : 64)) {
            this.inventory.set(this.inventory.selected, null);
          }
        }
        return true;
      }
    }
    return false;
  }

  _useShears(world, hit, held, itemDef) {
    // Shear sheep (entity interaction)
    world.playSound('shear', hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, {});
    if (!this.isCreative) {
      held.damage += 1;
      if (held.damage >= (itemDef.tool ? itemDef.tool.durability : 238)) {
        this.inventory.set(this.inventory.selected, null);
      }
    }
    return true;
  }

  // ---------------------------------------------------------------------------
  // Physics update (called each tick with input state)
  // ---------------------------------------------------------------------------

  updatePhysics(world, input, dt, registry) {
    // dt in ticks (usually 1)
    // Update fluid state first (sets inWater/inLava)
    this._updateFluidState(world, registry);

    const onIce = this._checkOnIce(world, registry);
    const slipperiness = onIce ? 0.98 : PLAYER_GROUND_FRICTION;
    const speedFactor = this._getSpeedFactor(world, registry);
    const jumpFactor = this._getJumpFactor(world, registry);

    // Determine height change for crouching
    if (input.sneak && !this.isFlying) {
      this.isCrouching = true;
      this.height = PLAYER_H_CROUCH;
      this.eyeHeight = PLAYER_EYE_CROUCH;
    } else {
      this.isCrouching = false;
      this.height = PLAYER_H_NORMAL;
      this.eyeHeight = PLAYER_EYE_NORMAL;
    }

    // Sprint control
    if (input.sprint && !this.isCrouching && (this.hunger > 6 || this.isCreative)) {
      this.isSprinting = true;
    } else if (!input.sprint || this.hunger <= 6) {
      this.isSprinting = false;
    }

    // Creative: double-tap space for flight toggle
    if (this.isCreative) {
      if (input.jump && !this._spacePressedLastTick) {
        if (this._spaceDoubleTapTimer > 0) {
          this.isFlying = !this.isFlying;
          this._spaceDoubleTapTimer = 0;
          this.vel.y = 0;
        } else {
          this._spaceDoubleTapTimer = 7;
        }
      }
      if (this._spaceDoubleTapTimer > 0) this._spaceDoubleTapTimer--;
      this._spacePressedLastTick = !!input.jump;
    }

    // Determine move speed
    let baseSpeed = PLAYER_WALK_SPEED;
    if (this.isFlying) {
      baseSpeed = PLAYER_FLY_SPEED;
    } else if (this.isSwimming) {
      baseSpeed = PLAYER_SWIM_SPEED * (this.isSprinting ? 1.3 : 1.0);
    } else if (this.isSprinting) {
      baseSpeed = PLAYER_SPRINT_SPEED;
    } else if (this.isCrouching) {
      baseSpeed = PLAYER_SNEAK_SPEED;
    }

    baseSpeed *= speedFactor;

    // Exhaustion from movement
    if (this.onGround && !this.isCreative) {
      if (this.isSprinting) {
        this._addExhaustion(PLAYER_EXHAUSTION_SPRINT);
      } else if (!this.isCrouching) {
        this._addExhaustion(PLAYER_EXHAUSTION_WALK);
      }
    }

    // Compute desired velocity from input
    const yaw = this.yaw;
    const sinYaw = Math.sin(yaw);
    const cosYaw = Math.cos(yaw);

    let mx = 0;
    let mz = 0;
    if (input.forward) { mz -= cosYaw; mx -= sinYaw; }
    if (input.back)    { mz += cosYaw; mx += sinYaw; }
    if (input.left)    { mz -= sinYaw; mx += cosYaw; }
    if (input.right)   { mz += sinYaw; mx -= cosYaw; }

    const mlen = Math.sqrt(mx * mx + mz * mz);
    if (mlen > 1e-6) { mx /= mlen; mz /= mlen; }

    // Horizontal acceleration.
    //
    // Friction is applied multiplicatively every tick (see below), so the speed
    // settles where acceleration balances the loss:
    //     v_final = a * f / (1 - f)
    // Picking `a` as a small fraction of the target speed therefore does NOT
    // reach that speed — with a = 0.1 * walk and f = 0.546 the player topped out
    // at 0.52 blocks/s instead of 4.32, i.e. 8x too slow, which reads as being
    // unable to move at all. Solve for the acceleration that actually lands on
    // baseSpeed, and keep reduced authority while airborne.
    const groundFric = PLAYER_AIR_FRICTION * slipperiness;
    if (this.isFlying) {
      this.vel.x += mx * baseSpeed * 0.2;
      this.vel.z += mz * baseSpeed * 0.2;
    } else if (this.onGround) {
      const a = baseSpeed * (1 - groundFric) / Math.max(0.05, groundFric);
      this.vel.x += mx * a;
      this.vel.z += mz * a;
    } else {
      // In air: same target, but only a fraction of the control authority.
      const a = baseSpeed * (1 - PLAYER_AIR_FRICTION) / Math.max(0.05, PLAYER_AIR_FRICTION);
      this.vel.x += mx * a * PLAYER_AIR_CONTROL;
      this.vel.z += mz * a * PLAYER_AIR_CONTROL;
    }

    // Climbing
    const isOnClimbable = this._checkClimbable(world, registry);
    if (isOnClimbable && !this.isFlying) {
      this.isClimbing = true;
      if (mlen > 0.01 && (input.forward || input.back)) {
        this.vel.y = PLAYER_WALK_SPEED * 2;
      } else if (this.vel.y < -0.15) {
        this.vel.y = -0.15; // slow descent
      }
      this.vel.x *= 0.5;
      this.vel.z *= 0.5;
      this._fallDistance = 0;
      this._fallY = null;
    } else {
      this.isClimbing = false;
    }

    // Water physics
    if (this.inWater && !this.isFlying) {
      this.isSwimming = true;
      const swimDir = mlen > 0.01 ? this.pitch : 0;
      this.vel.x += mx * PLAYER_SWIM_SPEED * 0.05;
      this.vel.z += mz * PLAYER_SWIM_SPEED * 0.05;
      this.vel.y += 0.04; // buoyancy
      this.vel.x *= 0.8;
      this.vel.y *= 0.8;
      this.vel.z *= 0.8;

      // Oxygen
      const eyeY = this.pos.y + this.eyeHeight;
      const eyeBlock = world.getBlock(
        Math.floor(this.pos.x),
        Math.floor(eyeY),
        Math.floor(this.pos.z),
      );
      const eyeBlockDef = eyeBlock && registry ? registry.def(eyeBlock) : null;
      const eyeInWater = eyeBlockDef && eyeBlockDef.fluid === 'water';

      if (eyeInWater) {
        if (this.airTicks > 0) {
          this.airTicks -= 1;
        } else {
          // Drown damage once per second (20 ticks)
          if ((world.tickCount || 0) % 20 === 0) {
            this.damage(2, { type: 'drowning' }, world);
          }
        }
      } else {
        if (this.airTicks < PLAYER_MAX_AIR) {
          this.airTicks = Math.min(PLAYER_MAX_AIR, this.airTicks + 5);
        }
      }
    } else {
      this.isSwimming = false;
      if (this.airTicks < PLAYER_MAX_AIR) {
        this.airTicks = Math.min(PLAYER_MAX_AIR, this.airTicks + 5);
      }
    }

    // Flying physics
    if (this.isFlying) {
      this.vel.y = 0;
      if (input.jump) this.vel.y += PLAYER_FLY_SPEED * 0.2;
      if (input.sneak) this.vel.y -= PLAYER_FLY_SPEED * 0.2;
      this.vel.x *= 0.8;
      this.vel.y *= 0.8;
      this.vel.z *= 0.8;
    } else if (!this.isSwimming && !this.isClimbing) {
      // Gravity
      if (!this.onGround || this.vel.y > 0) {
        this.vel.y -= PLAYER_GRAVITY;
      }
    }

    // Jump
    if (input.jump && this.onGround && !this.isFlying) {
      const jumpVel = PLAYER_JUMP_VEL * jumpFactor;
      this.vel.y = jumpVel;
      this.onGround = false;
      this._addExhaustion(this.isSprinting ? PLAYER_EXHAUSTION_SPRINT_JUMP : PLAYER_EXHAUSTION_JUMP);
    }

    // Friction
    if (this.onGround && !this.isFlying) {
      this.vel.x *= PLAYER_AIR_FRICTION * slipperiness;
      this.vel.z *= PLAYER_AIR_FRICTION * slipperiness;
    } else if (!this.isFlying && !this.inWater) {
      this.vel.x *= PLAYER_AIR_FRICTION;
      this.vel.z *= PLAYER_AIR_FRICTION;
    }

    // Crouch: prevent walking off ledge
    if (this.isCrouching && this.onGround) {
      const dx = this.vel.x;
      const dz = this.vel.z;
      if (Math.abs(dx) > 1e-6 || Math.abs(dz) > 1e-6) {
        // Check if moving would leave the ground
        const testX = this._wouldLeaveLedge(world, dx, 0, registry);
        const testZ = this._wouldLeaveLedge(world, 0, dz, registry);
        if (testX) this.vel.x = 0;
        if (testZ) this.vel.z = 0;
      }
    }

    // Move
    const prevOnGround = this.onGround;
    const prevY = this.pos.y;
    const wasAbove = this.vel.y < 0 && !this.onGround;

    // Try step-up before standard move
    const haveHoriz = Math.abs(this.vel.x) > 1e-4 || Math.abs(this.vel.z) > 1e-4;
    if (this.onGround && haveHoriz && !this.isFlying) {
      const didStep = this.stepUp(world, this.vel.x, this.vel.z, PLAYER_STEP_HEIGHT, registry);
      if (!didStep) {
        this.move(world, this.vel.x, this.vel.y, this.vel.z, registry);
      } else {
        this.move(world, 0, this.vel.y, 0, registry);
      }
    } else {
      this.move(world, this.vel.x, this.vel.y, this.vel.z, registry);
    }

    // Fall damage — reset when entering water/lava (cancels fall damage)
    if (this.inWater || this.inLava) {
      this._fallDistance = 0;
      this._fallY = null;
    } else if (!this.isCreative) {
      if (this.vel.y < 0 && !this.onGround) {
        if (this._fallY === null) this._fallY = this.pos.y;
        this._fallDistance = Math.max(this._fallDistance, this._fallY - this.pos.y);
      }
      if (this.onGround && !prevOnGround && this._fallDistance > 0) {
        this._applyFallDamage(world, registry);
        this._fallDistance = 0;
        this._fallY = null;
      }
    } else {
      this._fallDistance = 0;
      this._fallY = null;
    }

    // Survival ticks: regen, starve
    this._tickSurvivalStats(world);

    // Decay cooldowns
    if (this._attackCooldown > 0) this._attackCooldown--;
    if (this._placeCooldown > 0) this._placeCooldown--;
    if (this.invulnTicks > 0) this.invulnTicks--;
    if (this.hurtTime > 0) this.hurtTime--;

    // Eating tick
    if (this._eatingItem && input.use) {
      this._eatingTicks--;
      if (this._eatingTicks <= 0) this._finishEating(world);
    } else if (!input.use) {
      this._eatingItem = null;
      this._eatingTicks = 0;
    }

    // Block contact damage (cactus, magma, fire)
    this._checkBlockContactDamage(world, registry);
  }

  _updateFluidState(world, registry) {
    const bx = Math.floor(this.pos.x);
    const bz = Math.floor(this.pos.z);
    // Check at body center (not eye level) for physics purposes
    const byFeet = Math.floor(this.pos.y + 0.1);
    const byChest = Math.floor(this.pos.y + 0.9);
    let inWater = false;
    let inLava = false;
    for (const by of [byFeet, byChest]) {
      const id = world.getBlock(bx, by, bz);
      if (!id) continue;
      const def = registry ? registry.def(id) : null;
      if (!def) continue;
      if (def.fluid === 'water') inWater = true;
      if (def.fluid === 'lava') inLava = true;
    }
    this.inWater = inWater;
    this.inLava = inLava;
  }

  _wouldLeaveLedge(world, dx, dz, registry) {
    if (Math.abs(dx) < 1e-6 && Math.abs(dz) < 1e-6) return false;
    // Check if after moving dx,dz there's no ground under player center
    const testX = this.pos.x + dx;
    const testZ = this.pos.z + dz;
    const testY = this.pos.y - 0.1;
    const bx = Math.floor(testX);
    const by = Math.floor(testY);
    const bz = Math.floor(testZ);
    if (world.isSolid(bx, by, bz)) return false;
    // Also check 1 below
    if (world.isSolid(bx, by - 1, bz)) return false;
    return true;
  }

  _checkOnIce(world, registry) {
    if (!this.onGround) return false;
    const bx = Math.floor(this.pos.x);
    const by = Math.floor(this.pos.y - 0.1);
    const bz = Math.floor(this.pos.z);
    const id = world.getBlock(bx, by, bz);
    if (!id || !registry) return false;
    const def = registry.def(id);
    return def && (def.slipperiness > 0.7);
  }

  _getSpeedFactor(world, registry) {
    const bx = Math.floor(this.pos.x);
    const by = Math.floor(this.pos.y);
    const bz = Math.floor(this.pos.z);
    const id = world.getBlock(bx, by, bz);
    if (!id || !registry) return 1;
    const def = registry.def(id);
    return def ? (def.speedFactor || 1) : 1;
  }

  _getJumpFactor(world, registry) {
    const bx = Math.floor(this.pos.x);
    const by = Math.floor(this.pos.y - 0.1);
    const bz = Math.floor(this.pos.z);
    const id = world.getBlock(bx, by, bz);
    if (!id || !registry) return 1;
    const def = registry.def(id);
    return def ? (def.jumpFactor || 1) : 1;
  }

  _checkClimbable(world, registry) {
    const bx = Math.floor(this.pos.x);
    const by = Math.floor(this.pos.y + 0.1);
    const bz = Math.floor(this.pos.z);
    const id = world.getBlock(bx, by, bz);
    if (!id || !registry) return false;
    const def = registry.def(id);
    return def && def.climbable;
  }

  _checkBlockContactDamage(world, registry) {
    if (!registry) return;
    const bx = Math.floor(this.pos.x);
    const by = Math.floor(this.pos.y);
    const bz = Math.floor(this.pos.z);
    for (let dy = 0; dy < 2; dy++) {
      const id = world.getBlock(bx, by + dy, bz);
      if (!id) continue;
      const def = registry.def(id);
      if (def && def.damagePerTick > 0) {
        this.damage(def.damagePerTick, { type: def.fireDamage ? 'fire' : 'contact' }, world);
      }
    }
  }

  _applyFallDamage(world, registry) {
    const fd = this._fallDistance;
    if (fd <= 3) return;

    // Check landing on slime block
    const bx = Math.floor(this.pos.x);
    const by = Math.floor(this.pos.y - 0.1);
    const bz = Math.floor(this.pos.z);
    if (registry) {
      const landId = world.getBlock(bx, by, bz);
      const landDef = landId ? registry.def(landId) : null;
      if (landDef && landDef.bounce > 0) {
        // Bounce on slime
        this.vel.y = Math.abs(this.vel.y) * landDef.bounce;
        this.onGround = false;
        return;
      }
    }

    const dmg = Math.floor(fd - 3);
    if (dmg > 0) {
      this.damage(dmg, { type: 'fall' }, world);
    }
  }

  /**
   * One 20Hz gameplay tick for the player: physics from the current input,
   * survival stats, and the per-tick timers.
   *
   * World._tickEntities() deliberately skips entities of type 'player' ("ticked
   * by their controller"), so this MUST be driven from the game loop. It was not
   * wired up at all, which meant updatePhysics() never ran and the player could
   * not move, fall, swim or take damage.
   *
   * @param {object} world
   * @param {object} input {forward,back,left,right,jump,sneak,sprint}
   * @param {object} registry block registry
   */
  tick(world, input, registry) {
    if (this.removed) return;
    // prevPos drives render interpolation between ticks.
    this.prevPos.x = this.pos.x;
    this.prevPos.y = this.pos.y;
    this.prevPos.z = this.pos.z;

    this.age++;
    if (this.hurtTime > 0) this.hurtTime--;
    if (this.invulnTicks > 0) this.invulnTicks--;
    if (this.attackCooldown > 0) this.attackCooldown--;

    if (!this.dead) {
      this.updatePhysics(world, input || PLAYER_NO_INPUT, 1, registry);
      this._tickSurvivalStats(world);
    }
  }

  _tickSurvivalStats(world) {
    if (this.isCreative || this.dead) return;

    // Natural regeneration
    if (this.hunger >= 18 && this.health < this.maxHealth) {
      this._regenTimer++;
      if (this._regenTimer >= PLAYER_REGEN_TICK) {
        this._regenTimer = 0;
        this.health = Math.min(this.maxHealth, this.health + 1);
        this._addExhaustion(6);
      }
    } else {
      this._regenTimer = 0;
    }

    // Starvation
    if (this.hunger <= 0) {
      this._starveTimer++;
      if (this._starveTimer >= PLAYER_STARVE_TICK) {
        this._starveTimer = 0;
        const dmg = this.health > 1 ? 1 : 0;
        if (dmg > 0) this.damage(dmg, { type: 'starvation' }, world);
      }
    } else {
      this._starveTimer = 0;
    }

    // Sprint disabled below hunger 6
    if (this.hunger < 6) this.isSprinting = false;
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  serialize() {
    return {
      pos: { ...this.pos },
      vel: { ...this.vel },
      yaw: this.yaw,
      pitch: this.pitch,
      gameMode: this.gameMode,
      health: this.health,
      hunger: this.hunger,
      saturation: this.saturation,
      exhaustion: this.exhaustion,
      xp: this.xp,
      xpLevel: this.xpLevel,
      xpProgress: this.xpProgress,
      airTicks: this.airTicks,
      bedPos: this.bedPos ? { ...this.bedPos } : null,
      spawnPos: { ...this.spawnPos },
      inventory: this.inventory.serialize(),
    };
  }

  applySave(data) {
    if (!data) return;
    if (data.pos) { this.pos.x = data.pos.x; this.pos.y = data.pos.y; this.pos.z = data.pos.z; }
    if (data.vel) { this.vel.x = data.vel.x; this.vel.y = data.vel.y; this.vel.z = data.vel.z; }
    this.yaw = data.yaw || 0;
    this.pitch = data.pitch || 0;
    this.gameMode = data.gameMode || 'survival';
    this.health = data.health !== undefined ? data.health : 20;
    this.hunger = data.hunger !== undefined ? data.hunger : 20;
    this.saturation = data.saturation !== undefined ? data.saturation : 5;
    this.exhaustion = data.exhaustion || 0;
    this.xp = data.xp || 0;
    this.xpLevel = data.xpLevel || 0;
    this.xpProgress = data.xpProgress || 0;
    this.airTicks = data.airTicks !== undefined ? data.airTicks : PLAYER_MAX_AIR;
    this.bedPos = data.bedPos ? { ...data.bedPos } : null;
    this.spawnPos = data.spawnPos ? { ...data.spawnPos } : { x: 0, y: 64, z: 0 };
    if (data.inventory) this.inventory.applySave(data.inventory);
  }
}
