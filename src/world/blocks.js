// ---------------------------------------------------------------------------
// Block registry.
//
// A block "definition" is a plain object; the registry assigns numeric ids and
// builds fast typed-array lookup tables (BlockFlags) that the mesher, lighting
// and physics read in their hot loops. Nothing in the hot path ever touches the
// definition objects.
//
// Render kinds:
//   CUBE   - full opaque/transparent cube, greedy-meshed
//   BOXES  - shape list (slab/stair/torch/fence/...)
//   CROSS  - two crossed quads (flowers, grass, saplings, crops)
//   FLUID  - water/lava with per-level surface height
//   AIR    - nothing
// ---------------------------------------------------------------------------

export const RK_AIR = 0, RK_CUBE = 1, RK_BOXES = 2, RK_CROSS = 3, RK_FLUID = 4;

/** Face order everywhere in the codebase: +X -X +Y -Y +Z -Z */
export const FACES = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];

export const TOOL_NONE = 0, TOOL_PICK = 1, TOOL_AXE = 2, TOOL_SHOVEL = 3,
  TOOL_HOE = 4, TOOL_SHEARS = 5, TOOL_SWORD = 6;

/** Tool material tiers. Index is used for both mining speed and harvest level. */
export const TIER_HAND = 0, TIER_WOOD = 1, TIER_STONE = 2, TIER_IRON = 3,
  TIER_GOLD = 4, TIER_DIAMOND = 5, TIER_NETHERITE = 6;

export const TIER_SPEED = [1, 2, 4, 6, 12, 8, 9];
/** Effective harvest level per tier (gold mines fast but harvests like stone). */
export const TIER_HARVEST = [0, 1, 2, 3, 1, 4, 5];

export class BlockDef {
  constructor(name, o = {}) {
    this.name = name;
    this.id = -1;
    this.display = o.display || autoDisplay(name);

    // --- rendering
    this.renderKind = o.renderKind !== undefined ? o.renderKind : RK_CUBE;
    /** tile role -> tile name; roles: all, top, bottom, side, front, back, left, right, overlay */
    this.tiles = o.tiles || {};
    this.shape = o.shape || null;         // for RK_BOXES
    this.tintIndex = o.tintIndex || 0;    // 0=none 1=grass 2=foliage 3=water 4=constant
    this.tintColor = o.tintColor || null; // used when tintIndex===4
    this.emissive = o.emissive || 0;      // 0..15 block light emitted
    this.opacity = o.opacity !== undefined ? o.opacity : (o.transparent ? 0 : 15); // light absorbed
    this.transparent = !!o.transparent;   // needs alpha pass / does not cull neighbours
    this.cutout = !!o.cutout;             // alpha-test rather than blend
    this.translucent = !!o.translucent;   // blend pass (water, glass, ice)
    this.cullSelf = o.cullSelf !== undefined ? o.cullSelf : !o.transparent;
    this.ao = o.ao !== undefined ? o.ao : true;
    this.randomOffset = !!o.randomOffset; // plants get a per-position xz jitter
    this.waving = o.waving || 0;          // 1=plant top sway 2=full sway 3=fluid

    // --- physics
    this.solid = o.solid !== undefined ? o.solid : true;
    this.collides = o.collides !== undefined ? o.collides : this.solid;
    this.fluid = o.fluid || null;          // 'water' | 'lava'
    this.climbable = !!o.climbable;
    this.gravity = !!o.gravity;            // falls when unsupported
    this.replaceable = !!o.replaceable;    // plants/fluids can be built over
    this.slipperiness = o.slipperiness || 0.6;
    this.jumpFactor = o.jumpFactor || 1;
    this.speedFactor = o.speedFactor || 1;
    this.damagePerTick = o.damagePerTick || 0; // cactus/magma/fire contact damage
    this.fireDamage = !!o.fireDamage;
    this.bounce = o.bounce || 0;

    // --- gameplay
    this.hardness = o.hardness !== undefined ? o.hardness : 1;
    this.blastResistance = o.blastResistance !== undefined ? o.blastResistance : this.hardness;
    this.tool = o.tool !== undefined ? o.tool : TOOL_NONE;
    this.harvestLevel = o.harvestLevel || 0;
    this.requiresTool = !!o.requiresTool;
    this.drops = o.drops === undefined ? [{ item: name, count: 1 }] : o.drops;
    this.silkTouchDrop = o.silkTouchDrop || null;
    this.xpDrop = o.xpDrop || 0;
    this.flammable = o.flammable || 0;      // spread chance weight
    this.placeSound = o.placeSound || 'stone';
    this.stepSound = o.stepSound || o.placeSound || 'stone';
    this.breakSound = o.breakSound || o.placeSound || 'stone';
    this.interact = o.interact || null;     // 'chest'|'furnace'|'craft'|'door'|'bed'|...
    this.entityBlock = o.entityBlock || null; // block-entity kind
    this.stackSize = o.stackSize || 64;
    this.fuelTicks = o.fuelTicks || 0;      // furnace fuel value
    this.smeltTo = o.smeltTo || null;
    this.smeltXp = o.smeltXp || 0;
    this.growsInto = o.growsInto || null;
    this.plantOn = o.plantOn || null;       // valid soil names
    this.needsSupport = o.needsSupport || null; // 'below'|'side'|'above'
    this.itemIcon = o.itemIcon || null;      // icon tile name override
    this.group = o.group || 'misc';
    this.pushable = o.pushable !== undefined ? o.pushable : true;
    this.wool = o.wool || null;             // colour name for wool/bed/carpet
    this.variantOf = o.variantOf || null;
  }

  tileFor(face) {
    const t = this.tiles;
    switch (face) {
      case 2: return t.top || t.all || t.side;
      case 3: return t.bottom || t.all || t.side;
      default: return t.side || t.all;
    }
  }
}

function autoDisplay(name) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export class BlockRegistry {
  constructor() {
    /** @type {BlockDef[]} */
    this.byId = [];
    /** @type {Map<string,BlockDef>} */
    this.byName = new Map();
    this.frozen = false;
  }

  define(name, opts) {
    if (this.frozen) throw new Error('BlockRegistry is frozen');
    if (this.byName.has(name)) throw new Error(`duplicate block '${name}'`);
    const def = new BlockDef(name, opts);
    def.id = this.byId.length;
    this.byId.push(def);
    this.byName.set(name, def);
    return def;
  }

  id(name) {
    const d = this.byName.get(name);
    if (!d) throw new Error(`unknown block '${name}'`);
    return d.id;
  }
  idOr(name, fallback = 0) {
    const d = this.byName.get(name);
    return d ? d.id : fallback;
  }
  def(id) { return this.byId[id]; }
  get(name) { return this.byName.get(name); }
  get count() { return this.byId.length; }

  /** Build the flat typed-array tables used by hot loops. */
  freeze() {
    this.frozen = true;
    return new BlockFlags(this);
  }
}

/**
 * Struct-of-arrays view over the registry. Every field the mesher / lighting /
 * physics needs per-frame lives here as a typed array indexed by block id.
 */
export class BlockFlags {
  constructor(reg) {
    const n = reg.count;
    this.count = n;
    this.renderKind = new Uint8Array(n);
    this.opacity = new Uint8Array(n);
    this.emissive = new Uint8Array(n);
    this.solid = new Uint8Array(n);
    this.collides = new Uint8Array(n);
    this.transparent = new Uint8Array(n);
    this.cutout = new Uint8Array(n);
    this.translucent = new Uint8Array(n);
    this.cullSelf = new Uint8Array(n);
    this.ao = new Uint8Array(n);
    this.fluid = new Uint8Array(n);        // 0 none, 1 water, 2 lava
    this.climbable = new Uint8Array(n);
    this.gravity = new Uint8Array(n);
    this.replaceable = new Uint8Array(n);
    this.tintIndex = new Uint8Array(n);
    this.waving = new Uint8Array(n);
    this.randomOffset = new Uint8Array(n);
    this.hardness = new Float32Array(n);
    this.blastResistance = new Float32Array(n);
    this.tool = new Uint8Array(n);
    this.harvestLevel = new Uint8Array(n);
    this.requiresTool = new Uint8Array(n);
    this.damagePerTick = new Float32Array(n);
    this.slipperiness = new Float32Array(n);
    this.speedFactor = new Float32Array(n);
    this.jumpFactor = new Float32Array(n);
    this.bounce = new Float32Array(n);
    this.lightPass = new Uint8Array(n);    // 1 if skylight passes undiminished
    this.emitsParticles = new Uint8Array(n);
    this.flammable = new Uint8Array(n);

    for (let i = 0; i < n; i++) {
      const d = reg.byId[i];
      this.renderKind[i] = d.renderKind;
      this.opacity[i] = d.opacity;
      this.emissive[i] = d.emissive;
      this.solid[i] = d.solid ? 1 : 0;
      this.collides[i] = d.collides ? 1 : 0;
      this.transparent[i] = d.transparent ? 1 : 0;
      this.cutout[i] = d.cutout ? 1 : 0;
      this.translucent[i] = d.translucent ? 1 : 0;
      this.cullSelf[i] = d.cullSelf ? 1 : 0;
      this.ao[i] = d.ao ? 1 : 0;
      this.fluid[i] = d.fluid === 'water' ? 1 : d.fluid === 'lava' ? 2 : 0;
      this.climbable[i] = d.climbable ? 1 : 0;
      this.gravity[i] = d.gravity ? 1 : 0;
      this.replaceable[i] = d.replaceable ? 1 : 0;
      this.tintIndex[i] = d.tintIndex;
      this.waving[i] = d.waving;
      this.randomOffset[i] = d.randomOffset ? 1 : 0;
      this.hardness[i] = d.hardness;
      this.blastResistance[i] = d.blastResistance;
      this.tool[i] = d.tool;
      this.harvestLevel[i] = d.harvestLevel;
      this.requiresTool[i] = d.requiresTool ? 1 : 0;
      this.damagePerTick[i] = d.damagePerTick;
      this.slipperiness[i] = d.slipperiness;
      this.speedFactor[i] = d.speedFactor;
      this.jumpFactor[i] = d.jumpFactor;
      this.bounce[i] = d.bounce;
      this.lightPass[i] = d.opacity === 0 ? 1 : 0;
      this.flammable[i] = d.flammable;
    }
  }

  isSolid(id) { return this.solid[id] === 1; }
  isAir(id) { return id === 0; }
  isFluid(id) { return this.fluid[id] !== 0; }
  isOpaqueCube(id) { return this.renderKind[id] === RK_CUBE && this.transparent[id] === 0; }
}
