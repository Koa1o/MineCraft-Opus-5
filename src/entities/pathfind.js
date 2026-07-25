// ---------------------------------------------------------------------------
// VoxelPathfinder – A* on the voxel grid, budgeted PathQueue, smoothPath.
// All module-level helpers prefixed PATH_.
// ---------------------------------------------------------------------------

import { MinHeap } from '../core/util.js';

// Move cost constants
const PATH_COST_WALK = 1.0;
const PATH_COST_DIAG = 1.414;
const PATH_COST_JUMP = 2.0;
const PATH_COST_FALL_1 = 1.0;
const PATH_COST_FALL_2 = 1.4;
const PATH_COST_FALL_3 = 2.2;
const PATH_COST_SWIM = 2.5;
const PATH_COST_CLIMB = 2.0;
const PATH_PENALTY_DAMAGE = 8.0;

const PATH_DEFAULT_MAX_NODES = 400;
const PATH_DEFAULT_MAX_RANGE = 24;

// ---------------------------------------------------------------------------
// Key packing: encode x,y,z into a single integer (10 bits each, bias +512)
// ---------------------------------------------------------------------------
function PATH_packXYZ(x, y, z) {
  return ((x + 512) & 0x3ff) * 1048576 + ((y + 512) & 0x3ff) * 1024 + ((z + 512) & 0x3ff);
}
function PATH_unpackXYZ(k) {
  const z = (k & 0x3ff) - 512;
  const y = ((k >> 10) & 0x3ff) - 512;
  const x = ((k >> 20) & 0x3ff) - 512;
  return { x, y, z };
}

function PATH_heuristic(ax, ay, az, bx, by, bz) {
  const dx = Math.abs(ax - bx), dy = Math.abs(ay - by), dz = Math.abs(az - bz);
  // Octile distance (diagonal in XZ, with Y penalty)
  const h = Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz) + dy;
  return h;
}

// ---------------------------------------------------------------------------
export class VoxelPathfinder {
  constructor(world, flags, registry) {
    this.world = world;
    this.flags = flags || {};
    this.registry = registry || null;
  }

  // -------------------------------------------------------------------------
  // Returns true if a mob with height mobH can stand at (x,y,z):
  //   - block below (y-1) is solid
  //   - mobH blocks of clearance above (y to y+mobH-1 are passable)
  //   - not inside a damaging block
  // -------------------------------------------------------------------------
  standable(x, y, z, mobH) {
    mobH = mobH || 2;
    // Floor must be solid (or there's nothing to stand on)
    const floorId = this.world.getBlock(x, y - 1, z);
    if (!floorId) return false;
    if (!this.world.isSolid(x, y - 1, z)) return false;

    // Clearance check
    for (let h = 0; h < mobH; h++) {
      if (this.world.isSolid(x, y + h, z)) return false;
    }
    return true;
  }

  // -------------------------------------------------------------------------
  // Is this block passable (not solid, not damaging lava unless immune)
  // -------------------------------------------------------------------------
  _passable(x, y, z, flags) {
    if (!this.world.isSolid(x, y, z)) return true;
    return false;
  }

  _isDamaging(x, y, z, flags) {
    const id = this.world.getBlock(x, y, z);
    if (!id) return false;
    if (!this.registry) return false;
    const def = this.registry.def(id);
    if (!def) return false;
    return (def.damagePerTick > 0 || def.fireDamage);
  }

  _isWater(x, y, z) {
    const id = this.world.getBlock(x, y, z);
    if (!id || !this.registry) return false;
    const def = this.registry.def(id);
    return def && def.fluid === 'water';
  }

  _isLava(x, y, z) {
    const id = this.world.getBlock(x, y, z);
    if (!id || !this.registry) return false;
    const def = this.registry.def(id);
    return def && def.fluid === 'lava';
  }

  _isClimbable(x, y, z) {
    const id = this.world.getBlock(x, y, z);
    if (!id || !this.registry) return false;
    const def = this.registry.def(id);
    return def && def.climbable;
  }

  // -------------------------------------------------------------------------
  findPath(startX, startY, startZ, goalX, goalY, goalZ, opts) {
    opts = opts || {};
    const mobH = opts.mobH || 2;
    const maxNodes = opts.maxNodes || PATH_DEFAULT_MAX_NODES;
    const maxRange = opts.maxRange || PATH_DEFAULT_MAX_RANGE;
    const canSwim = !!opts.canSwim;
    const canClimb = !!opts.canClimb;
    const canOpenDoors = !!opts.canOpenDoors;
    const canFallFar = !!opts.canFallFar;
    const avoidDamage = opts.avoidDamage !== false;

    const maxRange2 = maxRange * maxRange;

    // Check if start/goal are reachable at all
    // (goal doesn't need to be exactly standable - we'll find nearest)

    const open = new MinHeap(n => n.f);
    const gScore = new Map();
    const cameFrom = new Map();
    let nodesExpanded = 0;

    let bestKey = PATH_packXYZ(startX, startY, startZ);
    let bestH = PATH_heuristic(startX, startY, startZ, goalX, goalY, goalZ);

    const startKey = PATH_packXYZ(startX, startY, startZ);
    gScore.set(startKey, 0);
    open.push({ x: startX, y: startY, z: startZ, f: bestH, g: 0, key: startKey });

    const goalKey = PATH_packXYZ(goalX, goalY, goalZ);

    while (open.size > 0) {
      if (nodesExpanded >= maxNodes) break;

      const cur = open.pop();
      nodesExpanded++;

      const { x, y, z, g } = cur;
      const curKey = cur.key;

      // Check if this is goal
      if (curKey === goalKey || (x === goalX && y === goalY && z === goalZ)) {
        return PATH_reconstructPath(cameFrom, curKey);
      }

      // Track best node (closest to goal by heuristic)
      const curH = PATH_heuristic(x, y, z, goalX, goalY, goalZ);
      if (curH < bestH) {
        bestH = curH;
        bestKey = curKey;
      }

      // Range check
      const ddx = x - startX, ddz = z - startZ;
      if (ddx * ddx + ddz * ddz > maxRange2) continue;

      // Generate neighbours
      const neighbours = PATH_generateNeighbours(this, x, y, z, mobH, canSwim, canClimb, canOpenDoors, canFallFar, avoidDamage);

      for (const nb of neighbours) {
        const nbKey = PATH_packXYZ(nb.x, nb.y, nb.z);
        const tentativeG = g + nb.cost;

        const existing = gScore.get(nbKey);
        if (existing !== undefined && existing <= tentativeG) continue;

        gScore.set(nbKey, tentativeG);
        cameFrom.set(nbKey, curKey);
        const h = PATH_heuristic(nb.x, nb.y, nb.z, goalX, goalY, goalZ);
        open.push({ x: nb.x, y: nb.y, z: nb.z, f: tentativeG + h, g: tentativeG, key: nbKey });
      }
    }

    // Budget exhausted or unreachable — return partial path to closest node
    if (bestKey !== startKey) {
      return PATH_reconstructPath(cameFrom, bestKey);
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Generate neighbours for A* expansion
// ---------------------------------------------------------------------------
function PATH_generateNeighbours(pf, x, y, z, mobH, canSwim, canClimb, canOpenDoors, canFallFar, avoidDamage) {
  const nbs = [];

  // Cardinal + diagonal horizontal moves
  const steps = [
    [1, 0, false], [-1, 0, false], [0, 1, false], [0, -1, false],
    [1, 1, true], [1, -1, true], [-1, 1, true], [-1, -1, true],
  ];

  for (const [dx, dz, isDiag] of steps) {
    const nx = x + dx, nz = z + dz;

    // For diagonals, both orthogonal neighbours must be passable (no corner clipping)
    if (isDiag) {
      if (pf.world.isSolid(x + dx, y, z) || pf.world.isSolid(x, y, z + dz)) continue;
      if (pf.world.isSolid(x + dx, y + 1, z) || pf.world.isSolid(x, y + 1, z + dz)) continue;
    }

    // Flat walk
    if (PATH_canStand(pf, nx, y, nz, mobH, canSwim)) {
      let cost = isDiag ? PATH_COST_DIAG : PATH_COST_WALK;
      if (avoidDamage && PATH_hasDamage(pf, nx, y, nz, mobH)) cost += PATH_PENALTY_DAMAGE;
      if (PATH_isInWater(pf, nx, y, nz)) {
        if (!canSwim) continue;
        cost = isDiag ? PATH_COST_SWIM * PATH_COST_DIAG : PATH_COST_SWIM;
      }
      nbs.push({ x: nx, y, z: nz, cost });
      continue;
    }

    // Jump up 1
    if (PATH_canStand(pf, nx, y + 1, nz, mobH, canSwim)) {
      // Headroom check at current position
      if (!pf.world.isSolid(x, y + 1, z) && (!mobH > 2 || !pf.world.isSolid(x, y + 2, z))) {
        let cost = (isDiag ? PATH_COST_DIAG : PATH_COST_WALK) + PATH_COST_JUMP;
        if (avoidDamage && PATH_hasDamage(pf, nx, y + 1, nz, mobH)) cost += PATH_PENALTY_DAMAGE;
        nbs.push({ x: nx, y: y + 1, z: nz, cost });
        continue;
      }
    }

    // Fall down 1-3
    for (let fall = 1; fall <= (canFallFar ? 8 : 3); fall++) {
      const fy = y - fall;
      if (PATH_canStand(pf, nx, fy, nz, mobH, canSwim)) {
        let fallCost = fall === 1 ? PATH_COST_FALL_1 : fall === 2 ? PATH_COST_FALL_2 : PATH_COST_FALL_3;
        if (fall > 3) fallCost = 2.2 + (fall - 3) * 0.5;
        // Refuse fall >4 unless canFallFar
        if (fall > 4 && !canFallFar) break;
        let cost = (isDiag ? PATH_COST_DIAG : PATH_COST_WALK) + fallCost;
        if (avoidDamage && PATH_hasDamage(pf, nx, fy, nz, mobH)) cost += PATH_PENALTY_DAMAGE;
        nbs.push({ x: nx, y: fy, z: nz, cost });
        break;
      }
      // If there's a solid block in the way, stop falling
      if (pf.world.isSolid(nx, fy, nz)) break;
    }

    // Ladder / vine climbing
    if (canClimb && pf._isClimbable(nx, y, nz)) {
      nbs.push({ x: nx, y: y + 1, z: nz, cost: PATH_COST_CLIMB });
      nbs.push({ x: nx, y: y - 1, z: nz, cost: PATH_COST_CLIMB });
    }
  }

  // Vertical swim
  if (canSwim && PATH_isInWater(pf, x, y, z)) {
    if (PATH_isInWater(pf, x, y + 1, z)) nbs.push({ x, y: y + 1, z, cost: PATH_COST_SWIM });
    if (!pf.world.isSolid(x, y - 1, z)) nbs.push({ x, y: y - 1, z, cost: PATH_COST_SWIM });
  }

  return nbs;
}

function PATH_canStand(pf, x, y, z, mobH, canSwim) {
  // Floor must be solid
  if (!pf.world.isSolid(x, y - 1, z)) {
    // Allow standing in water for swimmers
    if (canSwim && PATH_isInWater(pf, x, y - 1, z)) {
      // OK - swimming in water column
    } else {
      return false;
    }
  }
  // Clearance
  for (let h = 0; h < mobH; h++) {
    if (pf.world.isSolid(x, y + h, z)) return false;
  }
  return true;
}

function PATH_isInWater(pf, x, y, z) {
  if (!pf.registry) return false;
  const id = pf.world.getBlock(x, y, z);
  const def = pf.registry.def(id);
  return !!(def && def.fluid === 'water');
}

function PATH_hasDamage(pf, x, y, z, mobH) {
  for (let h = 0; h < mobH; h++) {
    if (pf._isDamaging(x, y + h, z, {})) return true;
  }
  return false;
}

function PATH_reconstructPath(cameFrom, endKey) {
  const path = [];
  let cur = endKey;
  while (cur !== undefined) {
    path.push(PATH_unpackXYZ(cur));
    cur = cameFrom.get(cur);
  }
  path.reverse();
  return path;
}

// ---------------------------------------------------------------------------
// PathQueue – per-tick budget manager for mob pathfinding requests
// ---------------------------------------------------------------------------
export class PathQueue {
  constructor() {
    this._requests = new Map(); // entityId -> { pf, args, resolve }
    this._order = [];           // entityId insertion order (FIFO per entity)
  }

  // Enqueue a path request for an entity; supersedes any existing request for that entity
  enqueue(entityId, pf, startX, startY, startZ, goalX, goalY, goalZ, opts, callback) {
    const req = { pf, startX, startY, startZ, goalX, goalY, goalZ, opts, callback };
    if (!this._requests.has(entityId)) {
      this._order.push(entityId);
    }
    this._requests.set(entityId, req);
  }

  // Process requests until nodeBudget is exhausted
  // Each request is given a share of the budget
  runBudget(nodeBudget) {
    if (this._order.length === 0) return;

    const perRequest = Math.max(50, Math.floor(nodeBudget / this._order.length));
    const processed = [];

    for (const eid of this._order) {
      const req = this._requests.get(eid);
      if (!req) { processed.push(eid); continue; }

      const opts = Object.assign({}, req.opts, { maxNodes: perRequest });
      const path = req.pf.findPath(req.startX, req.startY, req.startZ, req.goalX, req.goalY, req.goalZ, opts);
      if (req.callback) req.callback(path);
      processed.push(eid);
    }

    for (const eid of processed) {
      this._requests.delete(eid);
    }
    this._order = this._order.filter(id => this._requests.has(id));
  }

  get pending() { return this._requests.size; }
}

// ---------------------------------------------------------------------------
// smoothPath: remove redundant collinear waypoints and shortcut straight walks
// ---------------------------------------------------------------------------
export function smoothPath(path, world, flags) {
  if (!path || path.length <= 2) return path;

  const result = [path[0]];
  let i = 0;

  while (i < path.length - 1) {
    // Try to shortcut as far ahead as possible
    let j = path.length - 1;
    while (j > i + 1) {
      if (PATH_straightWalkClear(world, path[i], path[j], flags)) {
        break;
      }
      j--;
    }
    result.push(path[j]);
    i = j;
  }

  return result;
}

function PATH_straightWalkClear(world, a, b, flags) {
  // Voxel line walk from a to b; check that all blocks along the path are passable
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz), 1);
  const ix = dx / steps, iy = dy / steps, iz = dz / steps;

  for (let s = 0; s <= steps; s++) {
    const bx = Math.round(a.x + ix * s);
    const by = Math.round(a.y + iy * s);
    const bz = Math.round(a.z + iz * s);
    if (world.isSolid(bx, by, bz)) return false;
    if (world.isSolid(bx, by + 1, bz)) return false;
  }
  return true;
}
