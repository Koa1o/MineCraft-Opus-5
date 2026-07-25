// ---------------------------------------------------------------------------
// AI state-machine + behaviour library + spawn manager.
// All module-level helpers prefixed AI_.
// ---------------------------------------------------------------------------

import { VoxelPathfinder } from './pathfind.js';

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
export function pickWeighted(list, rng) {
  const total = list.reduce((s, e) => s + (e.weight || 1), 0);
  let r = rng ? rng.next() * total : Math.random() * total;
  for (const e of list) {
    r -= (e.weight || 1);
    if (r <= 0) return e;
  }
  return list[list.length - 1];
}

function AI_dist2(a, b) {
  const dx = a.pos.x - b.pos.x, dy = a.pos.y - b.pos.y, dz = a.pos.z - b.pos.z;
  return dx * dx + dy * dy + dz * dz;
}
function AI_dist(a, b) { return Math.sqrt(AI_dist2(a, b)); }

function AI_rand(world) { return world.rand ? world.rand.next() : Math.random(); }
function AI_randRange(world, a, b) { return world.rand ? world.rand.range(a, b) : a + Math.random() * (b - a); }
function AI_randChance(world, p) { return world.rand ? world.rand.chance(p) : Math.random() < p; }

function AI_walkToward(entity, tx, tz, speed) {
  const dx = tx - entity.pos.x, dz = tz - entity.pos.z;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.05) return;
  const spd = speed || (entity.def ? entity.def.speed : 0.25) || 0.25;
  entity.vel.x += (dx / len) * spd * 0.1;
  entity.vel.z += (dz / len) * spd * 0.1;
  entity.yaw = Math.atan2(-dx, dz);
  entity.bodyYaw = entity.yaw;
  entity.headYaw = entity.yaw;
}

function AI_walkPath(entity, world, speed, registry) {
  if (!entity.path || entity.pathIndex >= entity.path.length) return false;
  const wp = entity.path[entity.pathIndex];
  const dx = wp.x + 0.5 - entity.pos.x;
  const dz = wp.z + 0.5 - entity.pos.z;
  const dist2 = dx * dx + dz * dz;
  if (dist2 < 0.1 * 0.1) {
    entity.pathIndex++;
    return true;
  }
  AI_walkToward(entity, wp.x + 0.5, wp.z + 0.5, speed);
  // Auto step-up
  if (entity.onGround && Math.abs(entity.vel.x) + Math.abs(entity.vel.z) > 0.01) {
    if (entity.stepUp) entity.stepUp(world, entity.vel.x, entity.vel.z, 0.6, registry);
  }
  return true;
}

function AI_requestPath(entity, world, goalX, goalY, goalZ, opts) {
  const pf = new VoxelPathfinder(world, {}, null);
  const sx = Math.floor(entity.pos.x), sy = Math.floor(entity.pos.y), sz = Math.floor(entity.pos.z);
  const defOpts = { mobH: Math.ceil(entity.height), canSwim: !!(entity.def && entity.def.waterMob), maxNodes: 300, maxRange: 24 };
  const finalOpts = Object.assign(defOpts, opts || {});
  const path = pf.findPath(sx, sy, sz, goalX, goalY, goalZ, finalOpts);
  entity.path = path;
  entity.pathIndex = 0;
}

function AI_nearestPlayer(world) {
  if (!world.entities) return null;
  let best = null, bestD = Infinity;
  for (const e of world.entities) {
    if (e.removed || e.dead) continue;
    if (e.type === 'player') {
      const d = AI_dist2({ pos: { x: 0, y: 0, z: 0 } }, e);
      if (d < bestD) { bestD = d; best = e; }
    }
  }
  return best;
}

function AI_isHolding(player, item) {
  if (!player) return false;
  return player.heldItem === item || (player.inventory && player.inventory.hand === item);
}

// ---------------------------------------------------------------------------
// AIController
// ---------------------------------------------------------------------------
export class AIController {
  constructor(entity, world) {
    this.entity = entity;
    this.world = world;
    this._behaviourInstances = null;
    this._target = null; // TargetSelector cached target
  }

  _buildBehaviours() {
    const def = this.entity.def;
    if (!def || !def.ai) return [];
    const result = [];
    for (const spec of def.ai) {
      const colonIdx = spec.indexOf(':');
      const name = colonIdx >= 0 ? spec.slice(0, colonIdx) : spec;
      const arg = colonIdx >= 0 ? spec.slice(colonIdx + 1) : null;
      const beh = BEHAVIORS[name];
      if (beh) result.push({ name, beh, arg });
      else if (name === 'custom') {
        const cb = SPECIAL_BEHAVIORS[arg];
        if (cb) result.push({ name, beh: { priority: 0, wants: () => true, run: cb }, arg });
      }
    }
    result.sort((a, b) => (b.beh.priority || 0) - (a.beh.priority || 0));
    return result;
  }

  tick() {
    const { entity, world } = this;
    if (entity.dead || entity.removed) return;
    if (!this._behaviourInstances) this._behaviourInstances = this._buildBehaviours();

    for (const { name, beh, arg } of this._behaviourInstances) {
      try {
        if (beh.wants(entity, world, arg)) {
          beh.run(entity, world, arg);
          if (entity.stateName !== name) {
            entity.stateName = name;
            entity.stateTimer = 0;
          } else {
            entity.stateTimer++;
          }
          return; // Only top-priority behaviour runs
        }
      } catch (e) {
        // Silently skip failing behaviours to prevent one bad mob from crashing the server
      }
    }
    // No behaviour active
    if (entity.stateName !== 'idle') { entity.stateName = 'idle'; entity.stateTimer = 0; }
    else entity.stateTimer++;
  }
}

// ---------------------------------------------------------------------------
// BEHAVIORS
// ---------------------------------------------------------------------------
export const BEHAVIORS = {

  // ---- wander ---------------------------------------------------------------
  wander: {
    priority: 1,
    wants(e) { return !e.target && !e.sitting && e.onGround; },
    run(e, world) {
      if (!e._wanderTarget || e.stateTimer % 60 === 0 || AI_pathDone(e)) {
        if (AI_randChance(world, 0.3)) {
          // Pause
          e._wanderTarget = null;
          return;
        }
        const r = 10;
        const tx = e.pos.x + AI_randRange(world, -r, r);
        const tz = e.pos.z + AI_randRange(world, -r, r);
        const ty = Math.floor(e.pos.y);
        e._wanderTarget = { x: Math.floor(tx), y: ty, z: Math.floor(tz) };
        AI_requestPath(e, world, e._wanderTarget.x, e._wanderTarget.y, e._wanderTarget.z);
      }
      if (e._wanderTarget) AI_walkPath(e, world, e.def ? e.def.speed : 0.25);
    },
  },

  // ---- lookAround -----------------------------------------------------------
  lookAround: {
    priority: 0,
    wants(e) { return !e.target; },
    run(e, world) {
      if (e.stateTimer % 30 === 0) {
        e.headYaw = e.yaw + (AI_rand(world) - 0.5) * Math.PI;
      }
    },
  },

  // ---- panic ----------------------------------------------------------------
  panic: {
    priority: 10,
    wants(e) { return e.panicTicks > 0; },
    run(e, world) {
      e.panicTicks--;
      const src = e.lastDamageSource;
      let fx = e.pos.x, fz = e.pos.z;
      if (src && src.pos) {
        const dx = e.pos.x - src.pos.x, dz = e.pos.z - src.pos.z;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        fx = e.pos.x + (dx / len) * 8;
        fz = e.pos.z + (dz / len) * 8;
      } else {
        fx = e.pos.x + (AI_rand(world) - 0.5) * 16;
        fz = e.pos.z + (AI_rand(world) - 0.5) * 16;
      }
      const speed = (e.def ? e.def.speed : 0.25) * 1.4;
      AI_walkToward(e, fx, fz, speed);
    },
  },

  // ---- fleeFrom -------------------------------------------------------------
  fleeFrom: {
    priority: 8,
    wants(e, world, arg) {
      if (!world.entities) return false;
      e._fleeTarget = null;
      const range = 10;
      for (const other of world.entities) {
        if (other === e || other.removed || other.dead) continue;
        if (other.type !== arg) continue;
        if (AI_dist2(e, other) < range * range) { e._fleeTarget = other; return true; }
      }
      return false;
    },
    run(e, world) {
      if (!e._fleeTarget) return;
      const dx = e.pos.x - e._fleeTarget.pos.x, dz = e.pos.z - e._fleeTarget.pos.z;
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      AI_walkToward(e, e.pos.x + dx / len * 3, e.pos.z + dz / len * 3, (e.def ? e.def.speed : 0.25) * 1.2);
    },
  },

  // ---- followPlayerHolding --------------------------------------------------
  followPlayerHolding: {
    priority: 5,
    wants(e, world, item) {
      if (!world.entities) return false;
      for (const other of world.entities) {
        if (other.type === 'player' && AI_isHolding(other, item)) {
          e._followTarget = other;
          return AI_dist2(e, other) < 10 * 10;
        }
      }
      return false;
    },
    run(e, world) {
      if (!e._followTarget) return;
      const t = e._followTarget;
      if (AI_dist(e, t) > 2) {
        AI_requestPath(e, world, Math.floor(t.pos.x), Math.floor(t.pos.y), Math.floor(t.pos.z));
        AI_walkPath(e, world, e.def ? e.def.speed : 0.25);
      }
    },
  },

  // ---- followOwner ----------------------------------------------------------
  followOwner: {
    priority: 6,
    wants(e) { return e.tamed && !e.sitting && e.owner !== null; },
    run(e, world) {
      const owner = e.owner;
      if (!owner || owner.removed) return;
      const d = AI_dist(e, owner);
      if (d > 12) {
        // Teleport
        e.pos.x = owner.pos.x + (Math.random() - 0.5) * 2;
        e.pos.z = owner.pos.z + (Math.random() - 0.5) * 2;
        e.pos.y = owner.pos.y;
      } else if (d > 3) {
        AI_requestPath(e, world, Math.floor(owner.pos.x), Math.floor(owner.pos.y), Math.floor(owner.pos.z));
        AI_walkPath(e, world, e.def ? e.def.speed : 0.25);
      }
    },
  },

  // ---- sit ------------------------------------------------------------------
  sit: {
    priority: 7,
    wants(e) { return e.tamed && e.sitting; },
    run(e) {
      e.vel.x = 0; e.vel.z = 0;
    },
  },

  // ---- meleeAttack ----------------------------------------------------------
  meleeAttack: {
    priority: 9,
    wants(e) { return !!e.target && !e.target.dead; },
    run(e, world) {
      const t = e.target;
      if (!t || t.dead || t.removed) { e.target = null; return; }
      const d = AI_dist(e, t);
      const range = (e.def && e.def.attack) ? e.def.attack.range : 1.5;
      const cooldown = (e.def && e.def.attack) ? e.def.attack.cooldown : 20;
      const damage = (e.def && e.def.attack) ? e.def.attack.damage : 2;

      // Path toward target
      if (d > range) {
        if (!e.path || AI_pathDone(e) || e.stateTimer % 20 === 0) {
          AI_requestPath(e, world, Math.floor(t.pos.x), Math.floor(t.pos.y), Math.floor(t.pos.z));
        }
        AI_walkPath(e, world, e.def ? e.def.speed * 1.1 : 0.3);
      }

      // Attack
      if (d <= range + 0.5 && e.attackCooldown <= 0) {
        if (t.damage) t.damage(damage, e, world);
        e.attackCooldown = cooldown;
        world.playSound && world.playSound('mob.attack', e.pos.x, e.pos.y, e.pos.z, {});
      }
      e.lookAt && e.lookAt(t.pos.x, t.pos.y + t.height * 0.5, t.pos.z);
    },
  },

  // ---- rangedAttack ---------------------------------------------------------
  rangedAttack: {
    priority: 9,
    wants(e) { return !!e.target && !e.target.dead && !!(e.def && e.def.attack && e.def.attack.projectile); },
    run(e, world) {
      const t = e.target;
      if (!t || t.dead) { e.target = null; return; }
      const d = AI_dist(e, t);
      const minRange = 4, maxRange = (e.def && e.def.followRange) || 16;
      const cooldown = (e.def && e.def.attack) ? e.def.attack.cooldown : 30;
      const damage = (e.def && e.def.attack) ? e.def.attack.damage : 3;

      // Keep distance band
      if (d < minRange) {
        const dx = e.pos.x - t.pos.x, dz = e.pos.z - t.pos.z;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        AI_walkToward(e, e.pos.x + dx / len * 3, e.pos.z + dz / len * 3, e.def ? e.def.speed : 0.25);
      } else if (d > maxRange) {
        AI_requestPath(e, world, Math.floor(t.pos.x), Math.floor(t.pos.y), Math.floor(t.pos.z));
        AI_walkPath(e, world, e.def ? e.def.speed : 0.25);
      }

      // Fire projectile
      if (e.attackCooldown <= 0 && d <= maxRange) {
        const proj = e.def.attack.projectile || 'arrow';
        world.spawnEntity && world.spawnEntity(proj, e.pos.x, e.pos.y + e.height * 0.7, e.pos.z, { owner: e, target: t, damage });
        e.attackCooldown = cooldown;
      }
      e.lookAt && e.lookAt(t.pos.x, t.pos.y + t.height * 0.5, t.pos.z);
    },
  },

  // ---- chargeAttack ---------------------------------------------------------
  chargeAttack: {
    priority: 9,
    wants(e) { return !!e.target && !e.target.dead && !!(e.def && e.def.special === 'ravager'); },
    run(e, world) {
      const t = e.target;
      if (!t) { e.target = null; return; }
      const d = AI_dist(e, t);
      if (d > 5 && e.stateTimer < 20) {
        // Wind-up: stand still and face target
        e.vel.x *= 0.5; e.vel.z *= 0.5;
        e.lookAt && e.lookAt(t.pos.x, t.pos.y, t.pos.z);
      } else {
        // Sprint
        const dx = t.pos.x - e.pos.x, dz = t.pos.z - e.pos.z;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        const spd = (e.def ? e.def.speed : 0.25) * 2.5;
        AI_walkToward(e, t.pos.x, t.pos.z, spd);
        if (d < 2 && e.attackCooldown <= 0) {
          if (t.damage) t.damage((e.def && e.def.attack) ? e.def.attack.damage : 6, e, world);
          e.attackCooldown = 30;
        }
      }
    },
  },

  // ---- leapAtTarget ---------------------------------------------------------
  leapAtTarget: {
    priority: 9,
    wants(e) { return !!e.target && !e.target.dead && e.onGround && AI_dist(e, e.target) < 6; },
    run(e, world) {
      const t = e.target;
      if (!t) return;
      const dx = t.pos.x - e.pos.x, dz = t.pos.z - e.pos.z;
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      e.vel.x = dx / len * 0.5;
      e.vel.z = dz / len * 0.5;
      e.vel.y = 0.5;
    },
  },

  // ---- breed ----------------------------------------------------------------
  breed: {
    priority: 4,
    wants(e, world, item) {
      if (e.baby || e.breedCooldown > 0 || e.loveTicks <= 0) return false;
      return !!(e.def && e.def.breedItem === item);
    },
    run(e, world, item) {
      if (!world.entities) return;
      for (const other of world.entities) {
        if (other === e || other.removed || other.dead || other.baby) continue;
        if (other.type !== e.type) continue;
        if (other.loveTicks <= 0) continue;
        if (AI_dist2(e, other) < 3 * 3) {
          // Spawn baby
          world.spawnEntity && world.spawnEntity(e.type, (e.pos.x + other.pos.x) / 2, e.pos.y, (e.pos.z + other.pos.z) / 2, { baby: true });
          e.loveTicks = 0; other.loveTicks = 0;
          e.breedCooldown = 6000; other.breedCooldown = 6000;
          world.spawnParticles && world.spawnParticles('heart', e.pos.x, e.pos.y + e.height, e.pos.z, 5, {});
          return;
        }
        // Walk toward each other
        AI_walkToward(e, other.pos.x, other.pos.z, e.def ? e.def.speed : 0.25);
      }
    },
  },

  // ---- growUp ---------------------------------------------------------------
  growUp: {
    priority: 1,
    wants(e) { return e.baby && e.age >= 24000; },
    run(e) { e.baby = false; },
  },

  // ---- tempt ----------------------------------------------------------------
  tempt: {
    priority: 5,
    wants(e, world, item) {
      if (e.breedCooldown > 0) return false;
      if (!world.entities) return false;
      for (const other of world.entities) {
        if (other.type === 'player' && AI_isHolding(other, item)) {
          e._temptTarget = other;
          return AI_dist2(e, other) < 8 * 8;
        }
      }
      return false;
    },
    run(e, world) {
      if (!e._temptTarget) return;
      const t = e._temptTarget;
      if (AI_dist(e, t) > 1.5) {
        AI_walkToward(e, t.pos.x, t.pos.z, e.def ? e.def.speed : 0.25);
      }
      e.loveTicks = Math.min(600, (e.loveTicks || 0) + 1);
    },
  },

  // ---- eatGrass -------------------------------------------------------------
  eatGrass: {
    priority: 2,
    wants(e, world) {
      if (e.stateTimer % 100 !== 0) return false;
      const bx = Math.floor(e.pos.x), by = Math.floor(e.pos.y) - 1, bz = Math.floor(e.pos.z);
      const id = world.getBlock(bx, by, bz);
      if (!id) return false;
      return true; // simplified: check any block below
    },
    run(e, world) {
      const bx = Math.floor(e.pos.x), by = Math.floor(e.pos.y) - 1, bz = Math.floor(e.pos.z);
      world.setBlock && world.setBlock(bx, by, bz, 0);
      // Sheep regrow wool
      if (e.def && e.def.id === 'sheep') e._hasWool = true;
      world.spawnParticles && world.spawnParticles('grass', bx, by + 1, bz, 3, {});
    },
  },

  // ---- layEgg ---------------------------------------------------------------
  layEgg: {
    priority: 1,
    wants(e) { return e.type === 'chicken' && !e.baby && e.age % 6000 === 0 && e.age > 0; },
    run(e, world) {
      world.dropItem && world.dropItem(e.pos.x, e.pos.y, e.pos.z, 'egg', 1);
      world.playSound && world.playSound('mob.chicken.plop', e.pos.x, e.pos.y, e.pos.z, {});
    },
  },

  // ---- pollinate ------------------------------------------------------------
  pollinate: {
    priority: 3,
    wants(e) { return e.type === 'bee' && !e._hasNectar && !e._goingToHive; },
    run(e, world) {
      if (!e._flowerTarget) {
        // Find a flower nearby (simplified: random walk toward a known flower position)
        const r = 16;
        for (let attempt = 0; attempt < 10; attempt++) {
          const fx = Math.floor(e.pos.x + (AI_rand(world) - 0.5) * r * 2);
          const fy = Math.floor(e.pos.y);
          const fz = Math.floor(e.pos.z + (AI_rand(world) - 0.5) * r * 2);
          const id = world.getBlock(fx, fy, fz);
          if (id) { e._flowerTarget = { x: fx, y: fy, z: fz }; break; }
        }
      }
      if (e._flowerTarget) {
        AI_walkToward(e, e._flowerTarget.x, e._flowerTarget.z, e.def ? e.def.speed : 0.25);
        if (AI_dist(e, { pos: e._flowerTarget }) < 1.5) {
          e._hasNectar = true;
          e._flowerTarget = null;
          e._goingToHive = true;
        }
      }
    },
  },

  // ---- swim -----------------------------------------------------------------
  swim: {
    priority: 6,
    wants(e) {
      const isWaterMob = e.def && e.def.waterMob;
      const isLandMob = !isWaterMob;
      return (isWaterMob && !e.inWater) || (isLandMob && e.inWater);
    },
    run(e, world) {
      if (e.inWater && !e.def?.waterMob) {
        // Land mob: swim up to surface
        e.vel.y += 0.04;
      } else if (!e.inWater && e.def?.waterMob) {
        // Water mob: find water
        e.vel.y -= 0.04;
      }
    },
  },

  // ---- fishSchool -----------------------------------------------------------
  fishSchool: {
    priority: 2,
    wants(e) { return !!(e.def && e.def.waterMob); },
    run(e, world) {
      if (!world.entities) return;
      let nearX = 0, nearZ = 0, count = 0;
      for (const other of world.entities) {
        if (other === e || other.type !== e.type || other.removed) continue;
        if (AI_dist2(e, other) < 8 * 8) {
          nearX += other.pos.x; nearZ += other.pos.z; count++;
        }
      }
      if (count > 0) {
        nearX /= count; nearZ /= count;
        AI_walkToward(e, nearX, nearZ, (e.def ? e.def.speed : 0.25) * 0.5);
      }
    },
  },

  // ---- avoidSun -------------------------------------------------------------
  avoidSun: {
    priority: 7,
    wants(e, world) {
      if (!(e.def && e.def.avoidsSun)) return false;
      const tod = world.timeOfDay || 0;
      const isDay = tod > 0.25 && tod < 0.75;
      if (!isDay) return false;
      const skyLight = world.getSkyLight ? world.getSkyLight(Math.floor(e.pos.x), Math.floor(e.pos.y), Math.floor(e.pos.z)) : 0;
      return skyLight > 10;
    },
    run(e, world) {
      e.fireTicks = Math.max(e.fireTicks, 80);
      // Seek shade: move toward lower-light area
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      let bestDir = null, bestLight = 15;
      for (const [dx, dz] of dirs) {
        const bx = Math.floor(e.pos.x) + dx, bz = Math.floor(e.pos.z) + dz;
        const light = world.getSkyLight ? world.getSkyLight(bx, Math.floor(e.pos.y), bz) : 15;
        if (light < bestLight) { bestLight = light; bestDir = [dx, dz]; }
      }
      if (bestDir) AI_walkToward(e, e.pos.x + bestDir[0] * 3, e.pos.z + bestDir[1] * 3, e.def ? e.def.speed : 0.25);
    },
  },

  // ---- breakDoor ------------------------------------------------------------
  breakDoor: {
    priority: 4,
    wants(e) { return !!(e.target) && e.def && e.def.category === 'hostile'; },
    run(e, world) {
      const bx = Math.floor(e.pos.x + (e.vel.x > 0 ? 1 : -1) * 0.6);
      const by = Math.floor(e.pos.y + 0.5);
      const bz = Math.floor(e.pos.z + (e.vel.z > 0 ? 1 : -1) * 0.6);
      const id = world.getBlock(bx, by, bz);
      if (!id) return;
      // If it's a door on hard difficulty, break it
      if (e.stateTimer > 60) {
        world.setBlock && world.setBlock(bx, by, bz, 0);
        e.stateTimer = 0;
      }
    },
  },

  // ---- stealBlock (enderman) ------------------------------------------------
  stealBlock: {
    priority: 2,
    wants(e, world) {
      if (e.type !== 'enderman') return false;
      if (e._carriedBlock) return false;
      return AI_randChance(world, 0.005);
    },
    run(e, world) {
      const bx = Math.floor(e.pos.x), by = Math.floor(e.pos.y) - 1, bz = Math.floor(e.pos.z);
      const id = world.getBlock(bx, by, bz);
      if (id && id !== 0) {
        e._carriedBlock = id;
        world.setBlock && world.setBlock(bx, by, bz, 0);
      }
    },
  },

  // ---- teleportRandom (enderman) -------------------------------------------
  teleportRandom: {
    priority: 3,
    wants(e) { return e.type === 'enderman' && AI_randChance({ rand: null }, 0.01); },
    run(e, world) {
      const r = 16;
      const tx = e.pos.x + (AI_rand(world) - 0.5) * r * 2;
      const tz = e.pos.z + (AI_rand(world) - 0.5) * r * 2;
      let ty = e.pos.y;
      // Find ground
      for (let dy = 0; dy < 8; dy++) {
        if (world.isSolid(Math.floor(tx), Math.floor(ty) - 1 - dy, Math.floor(tz))) {
          ty = ty - dy; break;
        }
      }
      if (!world.isSolid(Math.floor(tx), Math.floor(ty), Math.floor(tz)) &&
          !world.isSolid(Math.floor(tx), Math.floor(ty) + 1, Math.floor(tz))) {
        e.pos.x = tx; e.pos.y = ty; e.pos.z = tz;
        world.spawnParticles && world.spawnParticles('portal', tx, ty, tz, 8, {});
      }
    },
  },

  // ---- aggroOnLook (enderman) ----------------------------------------------
  aggroOnLook: {
    priority: 11,
    wants(e, world) {
      if (e.type !== 'enderman') return false;
      if (e.target) return false;
      if (!world.entities) return false;
      for (const other of world.entities) {
        if (other.type !== 'player' || other.removed) continue;
        // Check if player is wearing pumpkin
        if (other.armorHead === 'carved_pumpkin') continue;
        // Check if player's crosshair is on enderman (simplified: check angle)
        const dx = e.pos.x - other.pos.x, dz = e.pos.z - other.pos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 64) continue;
        const playerYaw = other.yaw || 0;
        const angle = Math.atan2(-dx, dz);
        const diff = Math.abs(((playerYaw - angle) + Math.PI) % (Math.PI * 2) - Math.PI);
        if (diff < 0.15 && dist < 64) {
          e.target = other;
          world.playSound && world.playSound('mob.endermen.stare', e.pos.x, e.pos.y, e.pos.z, {});
          return true;
        }
      }
      return false;
    },
    run(e, world) {
      // Aggro is set in wants(), just do melee in next tick via meleeAttack
    },
  },

  // ---- explode (creeper) ---------------------------------------------------
  explode: {
    priority: 12,
    wants(e) { return e.type === 'creeper' && !!e.target && AI_dist(e, e.target) < 3; },
    run(e, world) {
      if (!e._fuseTimer) e._fuseTimer = 0;
      e._fuseTimer++;
      // Hiss sound at start
      if (e._fuseTimer === 1) {
        world.playSound && world.playSound('mob.creeper.say', e.pos.x, e.pos.y, e.pos.z, {});
        world.spawnParticles && world.spawnParticles('smoke', e.pos.x, e.pos.y + 1, e.pos.z, 5, {});
      }
      // Check target escaped
      if (!e.target || AI_dist(e, e.target) > 3.5) {
        e._fuseTimer = 0;
        return;
      }
      // Explode after 30-tick fuse
      if (e._fuseTimer >= 30) {
        e._fuseTimer = 0;
        const power = e.def && e.def.special === 'creeper' ? 3 : 3;
        world.explode && world.explode(e.pos.x, e.pos.y, e.pos.z, power, { fire: false });
        e.health = 0;
        e.kill && e.kill(world);
      }
    },
  },

  // ---- split (slime / magma cube) -----------------------------------------
  split: {
    priority: 0,
    wants(e) { return (e.type === 'slime' || e.type === 'magma_cube') && e.dead && !e._split; },
    run(e, world) {
      e._split = true;
      const size = (e._slimeSize || 2) - 1;
      if (size < 1) return;
      for (let i = 0; i < 4; i++) {
        const child = world.spawnEntity && world.spawnEntity(e.type, e.pos.x + (i % 2 - 0.5), e.pos.y, e.pos.z + (Math.floor(i / 2) - 0.5), {});
        if (child) child._slimeSize = size;
      }
    },
  },

  // ---- summonMinions --------------------------------------------------------
  summonMinions: {
    priority: 4,
    wants(e) {
      return (e.type === 'evoker' || e.type === 'wither') && e.attackCooldown <= 0 && !!e.target;
    },
    run(e, world) {
      const count = e.type === 'evoker' ? 3 : 4;
      const minionType = e.type === 'evoker' ? 'vex' : 'wither_skeleton';
      for (let i = 0; i < count; i++) {
        const ox = (AI_rand(world) - 0.5) * 4, oz = (AI_rand(world) - 0.5) * 4;
        world.spawnEntity && world.spawnEntity(minionType, e.pos.x + ox, e.pos.y, e.pos.z + oz, { owner: e });
      }
      e.attackCooldown = 200;
      world.playSound && world.playSound('mob.evoker.prepare_summon', e.pos.x, e.pos.y, e.pos.z, {});
    },
  },

  // ---- castSpell (evoker / witch) ------------------------------------------
  castSpell: {
    priority: 9,
    wants(e) { return (e.type === 'evoker' || e.type === 'witch') && e.attackCooldown <= 0 && !!e.target; },
    run(e, world) {
      if (e.type === 'evoker') {
        // Fangs
        const t = e.target;
        if (t) {
          for (let i = 0; i < 8; i++) {
            const ox = Math.cos((i / 8) * Math.PI * 2), oz = Math.sin((i / 8) * Math.PI * 2);
            world.spawnEntity && world.spawnEntity('evoker_fangs', t.pos.x + ox, t.pos.y, t.pos.z + oz, { owner: e });
          }
        }
        e.attackCooldown = 100;
      } else if (e.type === 'witch') {
        const t = e.target;
        if (t) {
          world.spawnEntity && world.spawnEntity('witch_potion', e.pos.x, e.pos.y + e.height * 0.7, e.pos.z, { owner: e, target: t });
        }
        e.attackCooldown = 40;
      }
      world.playSound && world.playSound('mob.evoker.cast_spell', e.pos.x, e.pos.y, e.pos.z, {});
    },
  },

  // ---- levitateTarget (shulker bullet) -------------------------------------
  levitateTarget: {
    priority: 9,
    wants(e) { return e.type === 'shulker' && e.attackCooldown <= 0 && !!e.target; },
    run(e, world) {
      const t = e.target;
      if (!t) return;
      world.spawnEntity && world.spawnEntity('shulker_bullet', e.pos.x, e.pos.y + e.height * 0.5, e.pos.z, { owner: e, target: t });
      e.attackCooldown = 20;
    },
  },

  // ---- sonicBoom (warden) --------------------------------------------------
  sonicBoom: {
    priority: 11,
    wants(e) { return e.type === 'warden' && e.attackCooldown <= 0 && !!e.target && AI_dist(e, e.target) > 4; },
    run(e, world) {
      const t = e.target;
      if (!t) return;
      // Sonic boom: damage at range
      if (t.damage) t.damage(10, e, world);
      world.playSound && world.playSound('mob.warden.sonic_boom', e.pos.x, e.pos.y, e.pos.z, {});
      world.spawnParticles && world.spawnParticles('sonic_boom', e.pos.x, e.pos.y + e.height * 0.5, e.pos.z, 5, {});
      e.attackCooldown = 80;
    },
  },

  // ---- vibrationTrack (warden) ---------------------------------------------
  vibrationTrack: {
    priority: 10,
    wants(e) { return e.type === 'warden' && !e.target && !!e._lastVibration; },
    run(e, world) {
      const v = e._lastVibration;
      AI_walkToward(e, v.x, v.z, e.def ? e.def.speed : 0.25);
      if (AI_dist(e, { pos: v }) < 2) {
        e._lastVibration = null;
        // Aggro nearby entities
        if (world.entities) {
          for (const other of world.entities) {
            if (other === e || other.type !== 'player') continue;
            if (AI_dist(e, other) < 6) { e.target = other; break; }
          }
        }
      }
    },
  },

  // ---- guardTerritory (iron golem) -----------------------------------------
  guardTerritory: {
    priority: 6,
    wants(e) { return e.type === 'iron_golem'; },
    run(e, world) {
      // Patrol village center
      if (!e.target && world.entities) {
        for (const other of world.entities) {
          if (other === e || other.removed || other.dead) continue;
          if (other.def && other.def.category === 'hostile' && AI_dist2(e, other) < 16 * 16) {
            e.target = other;
            break;
          }
        }
      }
    },
  },

  // ---- barter (piglin) -----------------------------------------------------
  barter: {
    priority: 5,
    wants(e) { return e.type === 'piglin' && !!e._barterItem; },
    run(e, world) {
      // Drop random nether loot
      const loot = ['iron_ingot', 'quartz', 'ender_pearl', 'leather', 'gravel'];
      const item = loot[Math.floor(AI_rand(world) * loot.length)];
      world.dropItem && world.dropItem(e.pos.x, e.pos.y + 0.5, e.pos.z, item, Math.floor(AI_randRange(world, 1, 5)));
      e._barterItem = null;
    },
  },

  // ---- trade (villager) ----------------------------------------------------
  trade: {
    priority: 3,
    wants(e) { return e.type === 'villager' && !!e._tradingPlayer; },
    run(e, world) {
      // Face the trading player
      const p = e._tradingPlayer;
      if (p && e.lookAt) e.lookAt(p.pos.x, p.pos.y + p.height * 0.5, p.pos.z);
    },
  },

  // ---- rideBoost (horse/camel while ridden) --------------------------------
  rideBoost: {
    priority: 8,
    wants(e) { return !!(e.rider) && (e.type === 'horse' || e.type === 'camel' || e.type === 'donkey' || e.type === 'mule'); },
    run(e, world) {
      const rider = e.rider;
      if (!rider) return;
      // Transfer rider's input velocity to mount
      e.vel.x = rider.vel.x || 0;
      e.vel.z = rider.vel.z || 0;
      e.yaw = rider.yaw;
    },
  },

  // ---- climbWall (spider) --------------------------------------------------
  climbWall: {
    priority: 4,
    wants(e) {
      if (e.type !== 'spider' && e.type !== 'cave_spider') return false;
      // Check if there's a wall adjacent
      return AI_anyWallAdjacent(e);
    },
    run(e, world) {
      e.vel.y = Math.min(0.2, (e.vel.y || 0) + 0.1);
      e.onGround = true; // Treat as grounded for physics
    },
  },

  // ---- lavaWalk (strider) --------------------------------------------------
  lavaWalk: {
    priority: 6,
    wants(e) { return e.type === 'strider' && e.inLava; },
    run(e, world) {
      e.fireTicks = 0; // immune while in lava
      // Walk on lava surface
      e.vel.y = Math.max(0, e.vel.y);
    },
  },

  // ---- digIn (silverfish) --------------------------------------------------
  digIn: {
    priority: 2,
    wants(e, world) {
      if (e.type !== 'silverfish') return false;
      if (!AI_randChance(world, 0.01)) return false;
      const bx = Math.floor(e.pos.x), by = Math.floor(e.pos.y), bz = Math.floor(e.pos.z);
      const id = world.getBlock(bx, by - 1, bz);
      return id && id !== 0; // any block below
    },
    run(e, world) {
      const bx = Math.floor(e.pos.x), by = Math.floor(e.pos.y) - 1, bz = Math.floor(e.pos.z);
      world.setBlock && world.setBlock(bx, by, bz, 0);
      e.removed = true;
    },
  },

  // ---- inflate (pufferfish) ------------------------------------------------
  inflate: {
    priority: 5,
    wants(e, world) {
      if (e.type !== 'pufferfish') return false;
      if (!world.entities) return false;
      for (const other of world.entities) {
        if (other === e || other.removed) continue;
        if (other.type === 'player' || (other.def && other.def.category === 'hostile')) {
          if (AI_dist2(e, other) < 5 * 5) { e._inflated = true; return true; }
        }
      }
      e._inflated = false;
      return false;
    },
    run(e, world) {
      // Inflated pufferfish deals contact damage
      if (e._inflated && world.entities) {
        for (const other of world.entities) {
          if (other === e || other.removed) continue;
          if (AI_dist2(e, other) < 1 * 1) {
            if (other.damage) other.damage(2, e, world);
          }
        }
      }
    },
  },

  // ---- goToLove ------------------------------------------------------------
  goToLove: {
    priority: 4,
    wants(e) { return e.loveTicks > 0 && e.breedCooldown <= 0; },
    run(e, world) {
      // Find another loving entity of same type
      if (!world.entities) return;
      for (const other of world.entities) {
        if (other === e || other.type !== e.type || other.loveTicks <= 0) continue;
        AI_walkToward(e, other.pos.x, other.pos.z, (e.def ? e.def.speed : 0.25) * 1.1);
        return;
      }
    },
  },

  // ---- followParent ---------------------------------------------------------
  followParent: {
    priority: 3,
    wants(e, world) {
      if (!e.baby) return false;
      if (!world.entities) return false;
      for (const other of world.entities) {
        if (other === e || other.type !== e.type || other.baby) {
          e._parent = other; return true;
        }
      }
      return false;
    },
    run(e, world) {
      const parent = e._parent;
      if (!parent) return;
      if (AI_dist(e, parent) > 2) {
        AI_walkToward(e, parent.pos.x, parent.pos.z, e.def ? e.def.speed : 0.25);
      }
    },
  },
};

// Helper for spider climb
function AI_anyWallAdjacent(e) {
  return false; // Simplified - real impl would check adjacent blocks
}

// ---- Path done helper -------------------------------------------------------
function AI_pathDone(e) {
  return !e.path || e.pathIndex >= (e.path ? e.path.length : 0);
}

// ---------------------------------------------------------------------------
// SPECIAL_BEHAVIORS dispatch table (for custom:<name>)
// ---------------------------------------------------------------------------
export const SPECIAL_BEHAVIORS = {
  creeper(e, world) {
    // Extra fuse logic: charged creeper does double damage
    if (e.def && e.def.special === 'creeper' && e._fuseTimer > 0) {
      world.spawnParticles && world.spawnParticles('smoke', e.pos.x, e.pos.y + 1, e.pos.z, 2, {});
    }
  },
  enderman(e, world) {
    // Water causes pain
    if (e.inWater) e.damage && e.damage(1, { type: 'water' }, world);
    // Don't pick blocks during aggro
    if (e.target) e._carriedBlock = null;
  },
  warden(e, world) {
    // Receive vibration events from world
    if (world.lastVibration) e._lastVibration = world.lastVibration;
  },
  ghast(e, world) {
    // Shooting fireball on cooldown
    if (e.target && e.attackCooldown <= 0) {
      world.spawnEntity && world.spawnEntity('fireball', e.pos.x, e.pos.y - 1, e.pos.z, { owner: e, target: e.target, damage: 6 });
      e.attackCooldown = 60;
    }
  },
  guardian(e, world) {
    // Laser attack
    if (e.target && e.attackCooldown <= 0 && AI_dist(e, e.target) < 15) {
      if (e.target.damage) e.target.damage(6, e, world);
      e.attackCooldown = 40;
    }
  },
  shulker(e, world) { /* handled by levitateTarget */ },
  blaze(e, world) {
    if (e.target && e.attackCooldown <= 0) {
      for (let i = 0; i < 3; i++) {
        world.spawnEntity && world.spawnEntity('small_fireball', e.pos.x, e.pos.y + e.height * 0.5, e.pos.z, { owner: e, target: e.target, damage: 5 });
      }
      e.attackCooldown = 60;
    }
  },
  ravager(e, world) {
    // Ravager roar: knockback nearby entities
    if (e.attackCooldown <= 0 && world.entities) {
      for (const other of world.entities) {
        if (other === e || !other.def) continue;
        if (other.def.category === 'passive' || other.type === 'player') {
          if (AI_dist2(e, other) < 4 * 4) {
            const dx = other.pos.x - e.pos.x, dz = other.pos.z - e.pos.z;
            const len = Math.sqrt(dx * dx + dz * dz) || 1;
            if (other.knockback) other.knockback(dx / len, dz / len, 1.5);
          }
        }
      }
    }
  },
  evoker(e, world) { /* handled by castSpell and summonMinions */ },
  witch(e, world) {
    // Self-heal when low health
    if (e.health < e.maxHealth * 0.3 && e.attackCooldown <= 0) {
      e.heal && e.heal(4);
      e.attackCooldown = 60;
    }
  },
  phantom(e, world) {
    // Swoop attack
    if (e.target && e.attackCooldown <= 0) {
      const t = e.target;
      if (AI_dist(e, t) < 3) {
        if (t.damage) t.damage(6, e, world);
        e.attackCooldown = 40;
      } else {
        // Dive toward target
        e.vel.y -= 0.05;
      }
    }
  },
  bee(e, world) {
    // Sting loses stinger and gets bee death
    if (e._hasStung) {
      e.health -= 0.5;
      if (e.health <= 0) e.kill && e.kill(world);
    }
  },
  wolf(e, world) {
    // Pack aggro: share target with nearby wolves
    if (e.target && world.entities) {
      for (const other of world.entities) {
        if (other === e || other.type !== 'wolf' || other.removed) continue;
        if (!other.target && AI_dist2(e, other) < 8 * 8) {
          other.target = e.target;
        }
      }
    }
  },
  cat(e, world) {
    // Scare phantoms, creepers
    if (world.entities) {
      for (const other of world.entities) {
        if (other === e || other.removed || other.dead) continue;
        if (other.type === 'phantom' || other.type === 'creeper') {
          if (AI_dist2(e, other) < 6 * 6) {
            other.panicTicks = 60;
          }
        }
      }
    }
  },
  fox(e, world) {
    // Fox sleeps during day
    const tod = world.timeOfDay || 0;
    if (tod > 0.3 && tod < 0.7) {
      e.vel.x *= 0.1; e.vel.z *= 0.1;
    }
  },
  panda(e, world) {
    // Panda rolls occasionally
    if (AI_randChance(world, 0.001) && e.onGround) {
      e.vel.x = (AI_rand(world) - 0.5) * 0.5;
      e.vel.z = (AI_rand(world) - 0.5) * 0.5;
    }
  },
  goat(e, world) {
    // Goat charges players
    if (!e.target && world.entities) {
      for (const other of world.entities) {
        if (other.type === 'player' && AI_dist2(e, other) < 10 * 10) {
          if (AI_randChance(world, 0.01)) e.target = other;
        }
      }
    }
  },
  llama(e, world) {
    // Spit at attacking wolves
    if (e.target && e.target.type === 'wolf' && e.attackCooldown <= 0) {
      world.spawnEntity && world.spawnEntity('llama_spit', e.pos.x, e.pos.y + e.height * 0.7, e.pos.z, { owner: e, target: e.target, damage: 1 });
      e.attackCooldown = 30;
    }
  },
  /**
   * Horse-family taming: repeated mounting attempts build "temper" until the
   * horse accepts a rider. Also handles rearing on a failed attempt.
   */
  horse(e, world) {
    if (e.temper === undefined) { e.temper = 0; e.rearTicks = 0; }
    if (e.rearTicks > 0) { e.rearTicks--; e.vel.x *= 0.6; e.vel.z *= 0.6; return; }
    if (e.pendingTame) {
      e.pendingTame = false;
      e.temper += 5 + (world.rand ? world.rand.range(0, 5) : 3);
      if (e.temper >= 30) {
        e.tamed = true;
        world.spawnParticles && world.spawnParticles('heart', e.pos.x, e.pos.y + e.height, e.pos.z, 6);
        world.playSound && world.playSound(e.def.sounds && e.def.sounds.idle, e.pos.x, e.pos.y, e.pos.z);
      } else {
        // Buck the rider off and rear up.
        if (e.rider) { e.rider.riding = null; e.rider = null; }
        e.rearTicks = 20;
        world.spawnParticles && world.spawnParticles('smoke', e.pos.x, e.pos.y + e.height, e.pos.z, 5);
      }
    }
    // A tamed, ridden horse gets a speed and jump bonus.
    if (e.tamed && e.rider) {
      e.speedBoost = 1.35;
      e.jumpBoost = 1.5;
    } else {
      e.speedBoost = 1;
      e.jumpBoost = 1;
    }
  },
  /**
   * Armadillo: rolls into an armoured ball when a threat is close, which makes
   * it immune to damage but unable to move.
   */
  armadillo(e, world) {
    if (e.rolled === undefined) { e.rolled = false; e.rollTicks = 0; }
    let threat = null;
    if (world.entities) {
      for (const other of world.entities) {
        if (other === e) continue;
        const hostile = other.type === 'player' || (other.def && other.def.category === 'hostile');
        if (hostile && AI_dist2(e, other) < 7 * 7) { threat = other; break; }
      }
    }
    if (threat) {
      e.rolled = true;
      e.rollTicks = 40;
      e.vel.x = 0; e.vel.z = 0;
      e.stateName = 'rolled';
    } else if (e.rollTicks > 0) {
      e.rollTicks--;
      if (e.rollTicks === 0) e.rolled = false;
    }
    // Rolled armadillos take heavily reduced damage.
    e.damageResist = e.rolled ? 0.25 : 1;
  },
  /**
   * Allay: carries one item type, seeks matching dropped items and ferries them
   * back to whoever handed it the item (or its note-block home).
   */
  allay(e, world) {
    if (e.carrying === undefined) { e.carrying = null; e.homeX = e.pos.x; e.homeY = e.pos.y; e.homeZ = e.pos.z; }
    e.flying = true;
    // Hover: gently oppose gravity so the allay bobs in the air.
    e.vel.y += 0.045;
    if (e.vel.y > 0.16) e.vel.y = 0.16;
    if (!e.carrying && e.wantItem && world.entities) {
      let best = null, bestD = 18 * 18;
      for (const other of world.entities) {
        if (other.type !== 'item' || other.itemId !== e.wantItem) continue;
        const d = AI_dist2(e, other);
        if (d < bestD) { bestD = d; best = other; }
      }
      if (best) {
        AI_walkToward(e, best.pos.x, best.pos.z, e.def.speed * 1.3);
        e.vel.y += (best.pos.y > e.pos.y ? 0.03 : -0.02);
        e.stateName = 'fetching';
        if (bestD < 1.2) {
          e.carrying = best.itemId;
          e.carryCount = best.count || 1;
          best.removed = true;
          world.spawnParticles && world.spawnParticles('crit', e.pos.x, e.pos.y, e.pos.z, 3);
        }
        return;
      }
    }
    if (e.carrying) {
      // Deliver back to the owner if there is one, else to the home point.
      const tx = e.owner ? e.owner.pos.x : e.homeX;
      const ty = e.owner ? e.owner.pos.y : e.homeY;
      const tz = e.owner ? e.owner.pos.z : e.homeZ;
      AI_walkToward(e, tx, tz, e.def.speed * 1.2);
      e.vel.y += (ty > e.pos.y ? 0.03 : -0.02);
      e.stateName = 'delivering';
      const dx = e.pos.x - tx, dy = e.pos.y - ty, dz = e.pos.z - tz;
      if (dx * dx + dy * dy + dz * dz < 2.5) {
        world.dropItem && world.dropItem(e.pos.x, e.pos.y, e.pos.z, e.carrying, e.carryCount || 1);
        e.carrying = null;
        world.spawnParticles && world.spawnParticles('heart', e.pos.x, e.pos.y + 0.5, e.pos.z, 2);
      }
    }
  },
  dolphin(e, world) {
    // Dolphin grace: speed boost to nearby swimmers
    if (world.entities) {
      for (const other of world.entities) {
        if (other === e || other.type !== 'player') continue;
        if (other.inWater && AI_dist2(e, other) < 5 * 5) {
          other.vel.x *= 1.05; other.vel.z *= 1.05;
        }
      }
    }
  },
  axolotl(e, world) {
    // Play dead when hurt
    if (e.hurtTime > 0 && AI_randChance(world, 0.3)) {
      e._playingDead = true;
      e.vel.x = 0; e.vel.z = 0;
    }
    if (e._playingDead) {
      e.invulnTicks = 10;
      if (e.stateTimer > 100) e._playingDead = false;
    }
  },
  strider(e, world) {
    // Can walk on lava; not fire immune on land
    if (!e.inLava && !(e.riding)) {
      e.fireTicks = Math.max(e.fireTicks, 20);
    } else {
      e.fireTicks = 0;
    }
  },
  piglin(e, world) {
    // React to gold items
    if (world.entities) {
      for (const other of world.entities) {
        if (other.type === 'item' && other.item === 'gold_ingot') {
          if (AI_dist2(e, other) < 3 * 3) {
            e._barterItem = other.item;
            other.removed = true;
          }
        }
      }
    }
    // Attack zombified piglins only when provoked
  },
  hoglin(e, world) {
    // Scared of warped fungi and nether portals (simplified)
    if (world.entities) {
      for (const other of world.entities) {
        if (other === e) continue;
        if (other.type === 'piglin' && AI_dist2(e, other) < 4 * 4) {
          // Flee from piglins? No, piglins hunt hoglins
        }
      }
    }
  },
  silverfish(e, world) { /* handled by digIn */ },
  slime(e, world) {
    // Jump periodically
    if (e.onGround && e.stateTimer % 20 === 0) {
      const target = e.target || AI_nearestPlayer(world);
      if (target) {
        const dx = target.pos.x - e.pos.x, dz = target.pos.z - e.pos.z;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        e.vel.x = dx / len * 0.3; e.vel.z = dz / len * 0.3; e.vel.y = 0.5;
      } else {
        e.vel.x = (AI_rand(world) - 0.5) * 0.4; e.vel.z = (AI_rand(world) - 0.5) * 0.4; e.vel.y = 0.4;
      }
    }
  },
  ender_dragon(e, world) {
    // Phase-based attack patterns
    if (!e._phase) e._phase = 'circle';
    if (e.health < e.maxHealth * 0.5) e._phase = 'charge';
    if (e._phase === 'circle') {
      // Orbit around end portal
      e._orbitAngle = (e._orbitAngle || 0) + 0.005;
      const r = 20;
      const tx = Math.cos(e._orbitAngle) * r, tz = Math.sin(e._orbitAngle) * r;
      AI_walkToward(e, tx, tz, 0.5);
      e.vel.y = (50 - e.pos.y) * 0.05;
    }
  },
  wither(e, world) {
    // Self-heal when low, shoot wither skulls
    if (e.health < e.maxHealth * 0.5) e.heal && e.heal(0.1);
    if (e.target && e.attackCooldown <= 0) {
      world.spawnEntity && world.spawnEntity('wither_skull', e.pos.x, e.pos.y + e.height * 0.7, e.pos.z, { owner: e, target: e.target, damage: 8 });
      e.attackCooldown = 20;
    }
    // Wither effect on nearby entities
    if (world.entities) {
      for (const other of world.entities) {
        if (other === e || !other.def) continue;
        if (AI_dist2(e, other) < 3 * 3) {
          if (other.damage) other.damage(1, e, world);
        }
      }
    }
  },
};

// ---------------------------------------------------------------------------
// TargetSelector
// ---------------------------------------------------------------------------
export class TargetSelector {
  constructor(entity, world) {
    this.entity = entity;
    this.world = world;
  }

  tick() {
    const { entity, world } = this;
    if (!world.entities) return;

    // Forget far targets
    if (entity.target) {
      if (entity.target.dead || entity.target.removed) { entity.target = null; return; }
      const range = entity.def ? entity.def.followRange : 16;
      if (AI_dist(entity, entity.target) > range * 1.5) { entity.target = null; }
    }

    if (entity.target) return; // Already has target

    const def = entity.def;
    if (!def) return;

    const range = def.followRange || 16;
    const cat = def.category;

    // Faction rules
    if (cat === 'hostile') {
      this._findTarget(['player', 'iron_golem', 'snow_golem', 'villager'], range);
    } else if (cat === 'neutral') {
      // Only target who attacked them
      if (entity.lastDamageSource && entity.lastDamageSource.pos) {
        if (AI_dist(entity, entity.lastDamageSource) < range) {
          entity.target = entity.lastDamageSource;
        }
      }
    }
  }

  _findTarget(types, range) {
    const { entity, world } = this;
    let best = null, bestD = range * range;
    for (const other of world.entities) {
      if (other === entity || other.removed || other.dead) continue;
      if (!types.includes(other.type) && !(other.def && types.includes(other.def.category))) continue;
      const d2 = AI_dist2(entity, other);
      if (d2 < bestD) {
        if (entity.canSee && !entity.canSee(world, other)) continue;
        bestD = d2; best = other;
      }
    }
    if (best) entity.target = best;
  }

  hurtByTarget(attacker) {
    const { entity } = this;
    if (!entity.target && attacker) entity.target = attacker;
  }
}

// ---------------------------------------------------------------------------
// Mob cap and SpawnManager
// ---------------------------------------------------------------------------
export const MOB_CAP = {
  passive: 10,
  hostile: 70,
  water: 5,
  ambient: 15,
};

export class SpawnManager {
  constructor(world) {
    this.world = world;
    this._tickCounter = 0;
  }

  tick() {
    this._tickCounter++;
    // Spawn attempt every 400 ticks (~20s)
    if (this._tickCounter % 400 !== 0) return;

    const world = this.world;
    if (!world.entities || !world.mobDefs) return;

    const player = AI_nearestPlayer(world);
    if (!player) return;

    // Count current mobs per category
    const counts = { passive: 0, hostile: 0, water: 0, ambient: 0 };
    for (const e of world.entities) {
      if (e.removed || e.dead || !e.def) continue;
      const cap = e.def.spawn && e.def.spawn.cap;
      if (cap && counts[cap] !== undefined) counts[cap]++;
    }

    // Try spawning for each mob def
    for (const def of world.mobDefs) {
      if (!def.spawn) continue;
      const capCat = def.spawn.cap;
      if (!capCat || counts[capCat] >= MOB_CAP[capCat]) continue;
      if (def.spawn.dimension && world.dimension !== def.spawn.dimension) continue;

      // Pick a random position near player
      for (let attempt = 0; attempt < 5; attempt++) {
        const r = 48;
        const tx = Math.floor(player.pos.x + (AI_rand(world) - 0.5) * r * 2);
        const tz = Math.floor(player.pos.z + (AI_rand(world) - 0.5) * r * 2);
        const dist2 = (tx - player.pos.x) ** 2 + (tz - player.pos.z) ** 2;

        // Too close or too far
        if (dist2 < 24 * 24 || dist2 > 128 * 128) continue;

        const ty = world.heightAt ? world.heightAt(tx, tz) : 64;

        // Check spawn conditions
        if (!this._checkSpawnConditions(def, tx, ty, tz, player)) continue;

        // Check per-chunk cap
        const perChunk = def.spawn.maxPerChunk || 4;
        const nearCount = world.entities.filter(e =>
          e.type === def.id && Math.abs(e.pos.x - tx) < 16 && Math.abs(e.pos.z - tz) < 16
        ).length;
        if (nearCount >= perChunk) continue;

        // Spawn group
        this.spawnGroupAt(def, tx, ty, tz);
        counts[capCat] = (counts[capCat] || 0) + (def.spawn.group ? def.spawn.group[0] : 1);
        break;
      }
    }

    // Despawn rules
    for (const e of world.entities) {
      if (e.removed || e.dead || !e.def) continue;
      if (e.def.category !== 'hostile') continue;
      const d = AI_dist(e, player);
      if (d > 128) { e.removed = true; continue; }
      if (d > 64 && AI_randChance(world, 0.01)) { e.removed = true; }
    }
  }

  _checkSpawnConditions(def, x, y, z, player) {
    const world = this.world;
    const spawn = def.spawn;

    // Light level check
    if (spawn.light === 'dark') {
      const light = world.getLight ? world.getLight(x, y, z) : 0;
      if (light > 7) return false;
    } else if (spawn.light === 'day') {
      const tod = world.timeOfDay || 0;
      if (tod < 0.25 || tod > 0.75) return false;
    } else if (spawn.light === 'night') {
      const tod = world.timeOfDay || 0;
      if (tod >= 0.25 && tod <= 0.75) return false;
    }

    // Surface check
    if (spawn.where === 'surface') {
      const h = world.heightAt ? world.heightAt(x, z) : 64;
      if (y < h - 1) return false;
    } else if (spawn.where === 'water') {
      if (!world.getBlock(x, y, z)) return false;
    }

    // Block must not be solid at spawn point
    if (world.isSolid(x, y, z) || world.isSolid(x, y + 1, z)) return false;
    // Floor must be solid
    if (!world.isSolid(x, y - 1, z)) return false;

    return true;
  }

  spawnGroupAt(def, cx, cy, cz) {
    const world = this.world;
    const [minG, maxG] = def.spawn.group || [1, 1];
    const count = minG + Math.floor(AI_rand(world) * (maxG - minG + 1));
    for (let i = 0; i < count; i++) {
      const ox = Math.floor((AI_rand(world) - 0.5) * 6);
      const oz = Math.floor((AI_rand(world) - 0.5) * 6);
      const opts = { def };
      if (def.variants > 1) opts.variant = Math.floor(AI_rand(world) * def.variants);
      world.spawnEntity && world.spawnEntity(def.id, cx + ox, cy, cz + oz, opts);
    }
  }
}
