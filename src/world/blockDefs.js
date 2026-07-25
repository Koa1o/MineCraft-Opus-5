// ---------------------------------------------------------------------------
// All block definitions. This is the authoritative gameplay table.
//
// Tile names referenced here must exist in src/textures/tiles.js — verified by
// tools/verify.mjs. Slab/stair/fence/wall variants are generated from a base
// list because they differ only in shape, hardness inheritance and drop name;
// each generated variant is still a real, fully-specified block.
// ---------------------------------------------------------------------------

import {
  BlockRegistry, RK_AIR, RK_CUBE, RK_BOXES, RK_CROSS, RK_FLUID,
  TOOL_PICK, TOOL_AXE, TOOL_SHOVEL, TOOL_HOE, TOOL_SHEARS, TOOL_NONE,
} from './blocks.js';
import {
  slabShape, stairShape, fenceShape, wallShape, torchShape, ladderShape,
  doorShape, trapdoorShape, cactusShape, snowLayerShape, chestShape, bedShape,
  farmlandShape, lilyShape, endPortalFrameShape, campfireShape, lanternShape,
  flowerPotShape, barsShape, FULL_BOX, box, PIXEL as P, scaleShape,
} from './shapes.js';

export const WOOL_COLORS = [
  'white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray',
  'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black',
];

/** RGB for each dye colour — used for wool tint of mobs, beds, particles. */
export const WOOL_RGB = {
  white: [0xf9, 0xff, 0xfe], orange: [0xf9, 0x80, 0x1d], magenta: [0xc7, 0x4e, 0xbd],
  light_blue: [0x3a, 0xb3, 0xda], yellow: [0xfe, 0xd8, 0x3d], lime: [0x80, 0xc7, 0x1f],
  pink: [0xf3, 0x8b, 0xaa], gray: [0x47, 0x4f, 0x52], light_gray: [0x9d, 0x9d, 0x97],
  cyan: [0x16, 0x9c, 0x9c], purple: [0x89, 0x32, 0xb8], blue: [0x3c, 0x44, 0xaa],
  brown: [0x83, 0x54, 0x32], green: [0x5e, 0x7c, 0x16], red: [0xb0, 0x2e, 0x26],
  black: [0x1d, 0x1d, 0x21],
};

export const WOOD_TYPES = ['oak', 'birch', 'spruce', 'jungle', 'acacia', 'dark_oak'];

/**
 * @param {BlockRegistry} R
 */
export function registerBlocks(R) {
  // ------------------------------------------------------------------ air
  R.define('air', {
    renderKind: RK_AIR, solid: false, collides: false, transparent: true, opacity: 0,
    replaceable: true, hardness: 0, drops: [], cullSelf: false, ao: false, group: 'system',
  });
  R.define('cave_air', {
    renderKind: RK_AIR, solid: false, collides: false, transparent: true, opacity: 0,
    replaceable: true, hardness: 0, drops: [], cullSelf: false, ao: false, group: 'system',
  });

  // ------------------------------------------------------------------ soil
  R.define('grass_block', {
    tiles: { top: 'grass_top', side: 'grass_side', bottom: 'dirt', overlay: 'grass_side_overlay' },
    tintIndex: 1, hardness: 0.6, tool: TOOL_SHOVEL, drops: [{ item: 'dirt', count: 1 }],
    placeSound: 'grass', group: 'natural',
  });
  R.define('dirt', { tiles: { all: 'dirt' }, hardness: 0.5, tool: TOOL_SHOVEL, placeSound: 'gravel', group: 'natural' });
  R.define('coarse_dirt', { tiles: { all: 'coarse_dirt' }, hardness: 0.5, tool: TOOL_SHOVEL, placeSound: 'gravel', group: 'natural' });
  R.define('podzol', {
    tiles: { top: 'podzol_top', side: 'grass_side', bottom: 'dirt' },
    hardness: 0.5, tool: TOOL_SHOVEL, drops: [{ item: 'dirt', count: 1 }], placeSound: 'gravel', group: 'natural',
  });
  R.define('mycelium', {
    tiles: { top: 'mycelium_top', side: 'grass_side', bottom: 'dirt' },
    hardness: 0.5, tool: TOOL_SHOVEL, drops: [{ item: 'dirt', count: 1 }], placeSound: 'grass', group: 'natural',
  });
  R.define('dirt_path', {
    renderKind: RK_BOXES, shape: [box(0, 0, 0, 1, 15 * P, 1)],
    tiles: { top: 'dirt_path_top', side: 'dirt_path_side', bottom: 'dirt' },
    hardness: 0.65, tool: TOOL_SHOVEL, drops: [{ item: 'dirt', count: 1 }], placeSound: 'gravel', group: 'natural',
  });
  R.define('farmland', {
    renderKind: RK_BOXES, shape: farmlandShape(),
    tiles: { top: 'farmland', side: 'dirt', bottom: 'dirt' },
    hardness: 0.6, tool: TOOL_SHOVEL, drops: [{ item: 'dirt', count: 1 }], placeSound: 'gravel', group: 'natural',
  });
  R.define('farmland_wet', {
    renderKind: RK_BOXES, shape: farmlandShape(),
    tiles: { top: 'farmland_wet', side: 'dirt', bottom: 'dirt' },
    hardness: 0.6, tool: TOOL_SHOVEL, drops: [{ item: 'dirt', count: 1 }], placeSound: 'gravel', group: 'natural',
  });
  R.define('grass_path_placeholder_removed', {
    renderKind: RK_AIR, solid: false, collides: false, transparent: true, opacity: 0,
    drops: [], group: 'system', hardness: 0,
  });

  // ------------------------------------------------------------------ stone family
  R.define('stone', {
    tiles: { all: 'stone' }, hardness: 1.5, tool: TOOL_PICK, requiresTool: true,
    drops: [{ item: 'cobblestone', count: 1 }], smeltTo: 'smooth_stone', smeltXp: 0.1, group: 'natural',
  });
  R.define('cobblestone', { tiles: { all: 'cobblestone' }, hardness: 2, tool: TOOL_PICK, requiresTool: true, smeltTo: 'stone', smeltXp: 0.1, group: 'natural' });
  R.define('mossy_cobblestone', { tiles: { all: 'mossy_cobblestone' }, hardness: 2, tool: TOOL_PICK, requiresTool: true, group: 'natural' });
  R.define('smooth_stone', { tiles: { all: 'smooth_stone' }, hardness: 2, tool: TOOL_PICK, requiresTool: true, group: 'building' });
  R.define('stone_bricks', { tiles: { all: 'stone_bricks' }, hardness: 1.5, tool: TOOL_PICK, requiresTool: true, group: 'building' });
  R.define('cracked_stone_bricks', { tiles: { all: 'cracked_stone_bricks' }, hardness: 1.5, tool: TOOL_PICK, requiresTool: true, group: 'building' });
  R.define('mossy_stone_bricks', { tiles: { all: 'mossy_stone_bricks' }, hardness: 1.5, tool: TOOL_PICK, requiresTool: true, group: 'building' });
  R.define('chiseled_stone_bricks', { tiles: { all: 'chiseled_stone_bricks' }, hardness: 1.5, tool: TOOL_PICK, requiresTool: true, group: 'building' });
  R.define('deepslate', {
    tiles: { top: 'deepslate_top', side: 'deepslate', bottom: 'deepslate_top' },
    hardness: 3, tool: TOOL_PICK, requiresTool: true, drops: [{ item: 'cobbled_deepslate', count: 1 }], group: 'natural',
  });
  R.define('cobbled_deepslate', { tiles: { all: 'cobbled_deepslate' }, hardness: 3.5, tool: TOOL_PICK, requiresTool: true, group: 'natural' });
  R.define('deepslate_bricks', { tiles: { all: 'deepslate_bricks' }, hardness: 3.5, tool: TOOL_PICK, requiresTool: true, group: 'building' });
  R.define('andesite', { tiles: { all: 'andesite' }, hardness: 1.5, tool: TOOL_PICK, requiresTool: true, group: 'natural' });
  R.define('granite', { tiles: { all: 'granite' }, hardness: 1.5, tool: TOOL_PICK, requiresTool: true, group: 'natural' });
  R.define('diorite', { tiles: { all: 'diorite' }, hardness: 1.5, tool: TOOL_PICK, requiresTool: true, group: 'natural' });
  R.define('tuff', { tiles: { all: 'tuff' }, hardness: 1.5, tool: TOOL_PICK, requiresTool: true, group: 'natural' });
  R.define('calcite', { tiles: { all: 'calcite' }, hardness: 0.75, tool: TOOL_PICK, requiresTool: true, group: 'natural' });
  R.define('bedrock', {
    tiles: { all: 'bedrock' }, hardness: -1, blastResistance: 1e7, drops: [],
    tool: TOOL_PICK, requiresTool: true, group: 'system',
  });
  R.define('gravel', {
    tiles: { all: 'gravel' }, hardness: 0.6, tool: TOOL_SHOVEL, gravity: true,
    drops: [{ item: 'gravel', count: 1, chance: 0.9 }, { item: 'flint', count: 1, chance: 0.1 }],
    placeSound: 'gravel', group: 'natural',
  });
  R.define('clay', {
    tiles: { all: 'clay' }, hardness: 0.6, tool: TOOL_SHOVEL,
    drops: [{ item: 'clay_ball', count: 4 }], placeSound: 'gravel', group: 'natural',
  });
  R.define('sand', {
    tiles: { all: 'sand' }, hardness: 0.5, tool: TOOL_SHOVEL, gravity: true,
    smeltTo: 'glass', smeltXp: 0.1, placeSound: 'sand', group: 'natural',
  });
  R.define('red_sand', {
    tiles: { all: 'red_sand' }, hardness: 0.5, tool: TOOL_SHOVEL, gravity: true,
    smeltTo: 'glass', smeltXp: 0.1, placeSound: 'sand', group: 'natural',
  });
  R.define('sandstone', {
    tiles: { top: 'sandstone_top', side: 'sandstone', bottom: 'sandstone_bottom' },
    hardness: 0.8, tool: TOOL_PICK, requiresTool: true, group: 'building',
  });
  R.define('chiseled_sandstone', { tiles: { top: 'sandstone_top', side: 'chiseled_sandstone', bottom: 'sandstone_bottom' }, hardness: 0.8, tool: TOOL_PICK, requiresTool: true, group: 'building' });
  R.define('cut_sandstone', { tiles: { top: 'sandstone_top', side: 'cut_sandstone', bottom: 'sandstone_bottom' }, hardness: 0.8, tool: TOOL_PICK, requiresTool: true, group: 'building' });
  R.define('red_sandstone', {
    tiles: { top: 'red_sandstone_top', side: 'red_sandstone', bottom: 'red_sandstone_bottom' },
    hardness: 0.8, tool: TOOL_PICK, requiresTool: true, group: 'building',
  });
  R.define('terracotta', { tiles: { all: 'terracotta' }, hardness: 1.25, tool: TOOL_PICK, requiresTool: true, group: 'building' });
  for (const c of ['white', 'orange', 'yellow', 'red', 'brown', 'light_gray']) {
    R.define(`${c}_terracotta`, { tiles: { all: `${c}_terracotta` }, hardness: 1.25, tool: TOOL_PICK, requiresTool: true, group: 'building' });
  }
  R.define('bricks', { tiles: { all: 'bricks' }, hardness: 2, tool: TOOL_PICK, requiresTool: true, group: 'building' });

  // ------------------------------------------------------------------ snow / ice
  R.define('snow_block', {
    tiles: { all: 'snow' }, hardness: 0.2, tool: TOOL_SHOVEL,
    drops: [{ item: 'snowball', count: 4 }], placeSound: 'snow', group: 'natural',
  });
  R.define('snow_layer', {
    renderKind: RK_BOXES, shape: snowLayerShape(1), tiles: { all: 'snow' },
    hardness: 0.1, tool: TOOL_SHOVEL, solid: false, transparent: true, opacity: 0,
    drops: [{ item: 'snowball', count: 1 }], placeSound: 'snow', needsSupport: 'below',
    replaceable: true, group: 'natural',
  });
  R.define('powder_snow', {
    tiles: { all: 'snow' }, hardness: 0.25, tool: TOOL_SHOVEL, collides: false,
    drops: [], placeSound: 'snow', speedFactor: 0.35, group: 'natural',
  });
  R.define('ice', {
    tiles: { all: 'ice' }, hardness: 0.5, tool: TOOL_PICK, translucent: true,
    transparent: true, opacity: 2, slipperiness: 0.98, drops: [], group: 'natural',
    placeSound: 'glass',
  });
  R.define('packed_ice', {
    tiles: { all: 'packed_ice' }, hardness: 0.5, tool: TOOL_PICK, slipperiness: 0.98,
    drops: [], placeSound: 'glass', group: 'natural',
  });
  R.define('blue_ice', {
    tiles: { all: 'blue_ice' }, hardness: 2.8, tool: TOOL_PICK, slipperiness: 0.989,
    placeSound: 'glass', group: 'natural',
  });

  // ------------------------------------------------------------------ ores
  const ORES = [
    ['coal', 'coal', 3, 0, 0.5, 'coal_ore', 'deepslate_coal_ore'],
    ['iron', 'raw_iron', 3, 1, 0, 'iron_ore', 'deepslate_iron_ore'],
    ['copper', 'raw_copper', 3, 1, 0, 'copper_ore', 'deepslate_copper_ore'],
    ['gold', 'raw_gold', 3, 2, 0, 'gold_ore', 'deepslate_gold_ore'],
    ['redstone', 'redstone', 3, 2, 1.5, 'redstone_ore', 'deepslate_redstone_ore'],
    ['lapis', 'lapis_lazuli', 3, 1, 2.5, 'lapis_ore', 'deepslate_lapis_ore'],
    ['diamond', 'diamond', 3, 2, 3.5, 'diamond_ore', 'deepslate_diamond_ore'],
    ['emerald', 'emerald', 3, 2, 4, 'emerald_ore', 'deepslate_emerald_ore'],
  ];
  for (const [name, drop, hard, level, xp, tile, dtile] of ORES) {
    const multi = name === 'redstone' ? 5 : name === 'lapis' ? 6 : 1;
    R.define(`${name}_ore`, {
      tiles: { all: tile }, hardness: hard, tool: TOOL_PICK, requiresTool: true,
      harvestLevel: level, xpDrop: xp, group: 'ore',
      drops: [{ item: drop, count: 1, max: multi }],
      silkTouchDrop: `${name}_ore`,
      smeltTo: (name === 'iron' || name === 'gold' || name === 'copper') ? `${name}_ingot` : null,
      smeltXp: 0.7,
    });
    R.define(`deepslate_${name}_ore`, {
      tiles: { all: dtile }, hardness: hard + 1.5, tool: TOOL_PICK, requiresTool: true,
      harvestLevel: level, xpDrop: xp, group: 'ore',
      drops: [{ item: drop, count: 1, max: multi }],
      silkTouchDrop: `deepslate_${name}_ore`,
    });
  }
  R.define('nether_gold_ore', {
    tiles: { all: 'nether_gold_ore' }, hardness: 3, tool: TOOL_PICK, requiresTool: true,
    drops: [{ item: 'gold_nugget', count: 2, max: 6 }], xpDrop: 1, group: 'ore',
  });
  R.define('nether_quartz_ore', {
    tiles: { all: 'nether_quartz_ore' }, hardness: 3, tool: TOOL_PICK, requiresTool: true,
    drops: [{ item: 'quartz', count: 1 }], xpDrop: 1, group: 'ore',
  });
  R.define('ancient_debris', {
    tiles: { top: 'ancient_debris_top', side: 'ancient_debris_side', bottom: 'ancient_debris_top' },
    hardness: 30, blastResistance: 1200, tool: TOOL_PICK, requiresTool: true, harvestLevel: 3,
    smeltTo: 'netherite_scrap', smeltXp: 2, group: 'ore',
  });

  // ------------------------------------------------------------------ mineral blocks
  R.define('coal_block', { tiles: { all: 'coal_block' }, hardness: 5, tool: TOOL_PICK, requiresTool: true, fuelTicks: 16000, group: 'building' });
  R.define('iron_block', { tiles: { all: 'iron_block' }, hardness: 5, tool: TOOL_PICK, requiresTool: true, harvestLevel: 1, group: 'building' });
  R.define('gold_block', { tiles: { all: 'gold_block' }, hardness: 3, tool: TOOL_PICK, requiresTool: true, harvestLevel: 2, group: 'building' });
  R.define('diamond_block', { tiles: { all: 'diamond_block' }, hardness: 5, tool: TOOL_PICK, requiresTool: true, harvestLevel: 2, group: 'building' });
  R.define('emerald_block', { tiles: { all: 'emerald_block' }, hardness: 5, tool: TOOL_PICK, requiresTool: true, harvestLevel: 2, group: 'building' });
  R.define('lapis_block', { tiles: { all: 'lapis_block' }, hardness: 3, tool: TOOL_PICK, requiresTool: true, harvestLevel: 1, group: 'building' });
  R.define('redstone_block', { tiles: { all: 'redstone_block' }, hardness: 5, tool: TOOL_PICK, requiresTool: true, group: 'building' });
  R.define('copper_block', { tiles: { all: 'copper_block' }, hardness: 3, tool: TOOL_PICK, requiresTool: true, harvestLevel: 1, group: 'building' });
  R.define('netherite_block', { tiles: { all: 'netherite_block' }, hardness: 50, blastResistance: 1200, tool: TOOL_PICK, requiresTool: true, harvestLevel: 3, group: 'building' });
  R.define('quartz_block', { tiles: { all: 'quartz_block' }, hardness: 0.8, tool: TOOL_PICK, requiresTool: true, group: 'building' });

  // ------------------------------------------------------------------ wood
  for (const w of WOOD_TYPES) {
    R.define(`${w}_log`, {
      tiles: { top: `${w}_log_top`, side: `${w}_log`, bottom: `${w}_log_top` },
      hardness: 2, tool: TOOL_AXE, flammable: 5, fuelTicks: 300,
      placeSound: 'wood', group: 'wood',
    });
    R.define(`stripped_${w}_log`, {
      tiles: { top: `${w}_log_top`, side: `${w}_planks`, bottom: `${w}_log_top` },
      hardness: 2, tool: TOOL_AXE, flammable: 5, fuelTicks: 300, placeSound: 'wood', group: 'wood',
    });
    R.define(`${w}_planks`, {
      tiles: { all: `${w}_planks` }, hardness: 2, tool: TOOL_AXE, flammable: 20,
      fuelTicks: 300, placeSound: 'wood', group: 'wood',
    });
    R.define(`${w}_leaves`, {
      tiles: { all: `${w}_leaves` }, tintIndex: 2, hardness: 0.2, tool: TOOL_SHEARS,
      cutout: true, transparent: true, opacity: 1, cullSelf: false, flammable: 30,
      waving: 1, placeSound: 'grass', group: 'wood',
      drops: [{ item: `${w}_sapling`, count: 1, chance: 0.05 }, { item: 'stick', count: 1, chance: 0.02 }],
      silkTouchDrop: `${w}_leaves`,
    });
    R.define(`${w}_sapling`, {
      renderKind: RK_CROSS, tiles: { all: `${w}_sapling` }, tintIndex: 2,
      hardness: 0, solid: false, collides: false, transparent: true, opacity: 0,
      cutout: true, waving: 2, randomOffset: true, needsSupport: 'below',
      plantOn: ['grass_block', 'dirt', 'coarse_dirt', 'podzol', 'farmland', 'farmland_wet', 'mycelium'],
      placeSound: 'grass', group: 'plant', growsInto: 'tree',
    });
  }
  R.define('bookshelf', {
    tiles: { top: 'oak_planks', side: 'bookshelf', bottom: 'oak_planks' },
    hardness: 1.5, tool: TOOL_AXE, flammable: 30, fuelTicks: 300,
    drops: [{ item: 'book', count: 3 }], silkTouchDrop: 'bookshelf', placeSound: 'wood', group: 'building',
  });
  R.define('crafting_table', {
    tiles: { top: 'crafting_table_top', side: 'crafting_table_side', front: 'crafting_table_front', bottom: 'oak_planks' },
    hardness: 2.5, tool: TOOL_AXE, flammable: 20, fuelTicks: 300, interact: 'craft',
    placeSound: 'wood', group: 'functional',
  });
  R.define('chest', {
    renderKind: RK_BOXES, shape: chestShape(),
    tiles: { top: 'chest_top', side: 'chest_side', front: 'chest_front', bottom: 'chest_top' },
    hardness: 2.5, tool: TOOL_AXE, flammable: 20, fuelTicks: 300, interact: 'chest',
    entityBlock: 'chest', transparent: true, opacity: 0, placeSound: 'wood', group: 'functional',
  });
  R.define('barrel', {
    tiles: { top: 'barrel_top', side: 'barrel_side', bottom: 'barrel_top' },
    hardness: 2.5, tool: TOOL_AXE, interact: 'chest', entityBlock: 'chest',
    fuelTicks: 300, placeSound: 'wood', group: 'functional',
  });
  R.define('furnace', {
    tiles: { top: 'furnace_top', side: 'furnace_side', front: 'furnace_front', bottom: 'furnace_top' },
    hardness: 3.5, tool: TOOL_PICK, requiresTool: true, interact: 'furnace',
    entityBlock: 'furnace', group: 'functional',
  });
  R.define('furnace_lit', {
    tiles: { top: 'furnace_top', side: 'furnace_side', front: 'furnace_front_lit', bottom: 'furnace_top' },
    hardness: 3.5, tool: TOOL_PICK, requiresTool: true, interact: 'furnace',
    entityBlock: 'furnace', emissive: 13, drops: [{ item: 'furnace', count: 1 }], group: 'functional',
  });
  R.define('ladder', {
    renderKind: RK_BOXES, shape: ladderShape(0), tiles: { all: 'ladder' },
    hardness: 0.4, tool: TOOL_AXE, climbable: true, solid: false, collides: false,
    transparent: true, opacity: 0, cutout: true, flammable: 20, needsSupport: 'side',
    placeSound: 'wood', group: 'functional',
  });
  R.define('oak_door_lower', {
    renderKind: RK_BOXES, shape: doorShape(0, false), tiles: { all: 'oak_door_bottom' },
    hardness: 3, tool: TOOL_AXE, transparent: true, opacity: 0, cutout: true,
    interact: 'door', drops: [{ item: 'oak_door', count: 1 }], placeSound: 'wood', group: 'functional',
  });
  R.define('oak_door_upper', {
    renderKind: RK_BOXES, shape: doorShape(0, false), tiles: { all: 'oak_door_top' },
    hardness: 3, tool: TOOL_AXE, transparent: true, opacity: 0, cutout: true,
    interact: 'door', drops: [], placeSound: 'wood', group: 'functional',
  });
  R.define('iron_door_lower', {
    renderKind: RK_BOXES, shape: doorShape(0, false), tiles: { all: 'iron_door_bottom' },
    hardness: 5, tool: TOOL_PICK, requiresTool: true, transparent: true, opacity: 0,
    cutout: true, interact: 'door', drops: [{ item: 'iron_door', count: 1 }], placeSound: 'metal', group: 'functional',
  });
  R.define('iron_door_upper', {
    renderKind: RK_BOXES, shape: doorShape(0, false), tiles: { all: 'iron_door_top' },
    hardness: 5, tool: TOOL_PICK, requiresTool: true, transparent: true, opacity: 0,
    cutout: true, interact: 'door', drops: [], placeSound: 'metal', group: 'functional',
  });
  R.define('oak_trapdoor', {
    renderKind: RK_BOXES, shape: trapdoorShape(false), tiles: { all: 'oak_trapdoor' },
    hardness: 3, tool: TOOL_AXE, transparent: true, opacity: 0, cutout: true,
    interact: 'door', placeSound: 'wood', group: 'functional',
  });
  R.define('hay_block', {
    tiles: { top: 'hay_block_top', side: 'hay_block_side', bottom: 'hay_block_top' },
    hardness: 0.5, tool: TOOL_HOE, flammable: 60, placeSound: 'grass', group: 'building',
  });

  // ------------------------------------------------------------------ wool 16
  for (const c of WOOL_COLORS) {
    R.define(`${c}_wool`, {
      tiles: { all: `${c}_wool` }, hardness: 0.8, tool: TOOL_SHEARS, flammable: 30,
      placeSound: 'wool', wool: c, group: 'wool',
    });
  }

  // ------------------------------------------------------------------ glass / light
  R.define('glass', {
    tiles: { all: 'glass' }, hardness: 0.3, translucent: true, transparent: true,
    opacity: 0, cullSelf: true, drops: [], silkTouchDrop: 'glass',
    placeSound: 'glass', group: 'building',
  });
  R.define('glowstone', {
    tiles: { all: 'glowstone' }, hardness: 0.3, emissive: 15, tool: TOOL_PICK,
    drops: [{ item: 'glowstone_dust', count: 2, max: 4 }], silkTouchDrop: 'glowstone',
    placeSound: 'glass', group: 'light',
  });
  R.define('sea_lantern', {
    tiles: { all: 'sea_lantern' }, hardness: 0.3, emissive: 15,
    drops: [{ item: 'prismarine_crystals', count: 2, max: 3 }], placeSound: 'glass', group: 'light',
  });
  R.define('torch', {
    renderKind: RK_BOXES, shape: torchShape(), tiles: { all: 'torch' },
    hardness: 0, emissive: 14, solid: false, collides: false, transparent: true,
    opacity: 0, cutout: true, needsSupport: 'below', placeSound: 'wood', group: 'light',
  });
  R.define('soul_torch', {
    renderKind: RK_BOXES, shape: torchShape(), tiles: { all: 'soul_torch' },
    hardness: 0, emissive: 10, solid: false, collides: false, transparent: true,
    opacity: 0, cutout: true, needsSupport: 'below', placeSound: 'wood', group: 'light',
  });
  R.define('lantern', {
    renderKind: RK_BOXES, shape: lanternShape(false), tiles: { all: 'lantern' },
    hardness: 3.5, emissive: 15, tool: TOOL_PICK, solid: false, transparent: true,
    opacity: 0, cutout: true, placeSound: 'metal', group: 'light',
  });
  R.define('jack_o_lantern', {
    tiles: { top: 'pumpkin_top', side: 'jack_o_lantern', bottom: 'pumpkin_top' },
    hardness: 1, tool: TOOL_AXE, emissive: 15, placeSound: 'wood', group: 'light',
  });
  R.define('magma_block', {
    tiles: { all: 'magma_block' }, hardness: 0.5, tool: TOOL_PICK, requiresTool: true,
    emissive: 3, damagePerTick: 0.05, fireDamage: true, group: 'nether',
  });
  R.define('spawner', {
    tiles: { all: 'spawner' }, hardness: 5, tool: TOOL_PICK, requiresTool: true,
    transparent: true, opacity: 0, cutout: true, drops: [], xpDrop: 15,
    entityBlock: 'spawner', placeSound: 'metal', group: 'functional',
  });
  R.define('tnt', {
    tiles: { top: 'tnt_top', side: 'tnt_side', bottom: 'tnt_bottom' },
    hardness: 0, flammable: 15, interact: 'tnt', placeSound: 'grass', group: 'functional',
  });

  // ------------------------------------------------------------------ fluids
  R.define('water', {
    renderKind: RK_FLUID, tiles: { all: 'water_still', side: 'water_flow' },
    tintIndex: 3, fluid: 'water', solid: false, collides: false, transparent: true,
    translucent: true, opacity: 1, replaceable: true, hardness: 100, drops: [],
    cullSelf: true, waving: 3, ao: false, group: 'fluid',
  });
  R.define('lava', {
    renderKind: RK_FLUID, tiles: { all: 'lava_still', side: 'lava_flow' },
    fluid: 'lava', solid: false, collides: false, transparent: true, opacity: 0,
    replaceable: true, hardness: 100, drops: [], emissive: 15, cullSelf: true,
    damagePerTick: 0.2, fireDamage: true, waving: 3, ao: false, group: 'fluid',
  });
  R.define('fire', {
    renderKind: RK_CROSS, tiles: { all: 'fire' }, hardness: 0, solid: false,
    collides: false, transparent: true, opacity: 0, cutout: true, emissive: 15,
    damagePerTick: 0.15, fireDamage: true, replaceable: true, drops: [], group: 'fluid',
  });

  // ------------------------------------------------------------------ plants
  R.define('tall_grass', {
    renderKind: RK_CROSS, tiles: { all: 'tall_grass' }, tintIndex: 1, hardness: 0,
    solid: false, collides: false, transparent: true, opacity: 0, cutout: true,
    waving: 2, randomOffset: true, replaceable: true, needsSupport: 'below',
    tool: TOOL_SHEARS, flammable: 60, placeSound: 'grass', group: 'plant',
    drops: [{ item: 'wheat_seeds', count: 1, chance: 0.125 }], silkTouchDrop: 'tall_grass',
    plantOn: ['grass_block', 'dirt', 'coarse_dirt', 'podzol', 'farmland', 'mycelium', 'sand', 'red_sand'],
  });
  R.define('fern', {
    renderKind: RK_CROSS, tiles: { all: 'fern' }, tintIndex: 1, hardness: 0,
    solid: false, collides: false, transparent: true, opacity: 0, cutout: true,
    waving: 2, randomOffset: true, replaceable: true, needsSupport: 'below',
    tool: TOOL_SHEARS, flammable: 60, placeSound: 'grass', group: 'plant',
    drops: [{ item: 'wheat_seeds', count: 1, chance: 0.125 }], silkTouchDrop: 'fern',
    plantOn: ['grass_block', 'dirt', 'podzol', 'mycelium'],
  });
  R.define('dead_bush', {
    renderKind: RK_CROSS, tiles: { all: 'dead_bush' }, hardness: 0, solid: false,
    collides: false, transparent: true, opacity: 0, cutout: true, waving: 2,
    randomOffset: true, replaceable: true, needsSupport: 'below', tool: TOOL_SHEARS,
    flammable: 60, drops: [{ item: 'stick', count: 1, max: 2 }], silkTouchDrop: 'dead_bush',
    placeSound: 'grass', group: 'plant',
    plantOn: ['sand', 'red_sand', 'dirt', 'terracotta', 'coarse_dirt'],
  });
  const FLOWERS = [
    'dandelion', 'poppy', 'blue_orchid', 'allium', 'azure_bluet', 'red_tulip',
    'orange_tulip', 'white_tulip', 'pink_tulip', 'oxeye_daisy', 'cornflower',
    'lily_of_the_valley',
  ];
  for (const f of FLOWERS) {
    R.define(f, {
      renderKind: RK_CROSS, tiles: { all: f }, hardness: 0, solid: false,
      collides: false, transparent: true, opacity: 0, cutout: true, waving: 2,
      randomOffset: true, replaceable: true, needsSupport: 'below', flammable: 60,
      placeSound: 'grass', group: 'plant',
      plantOn: ['grass_block', 'dirt', 'coarse_dirt', 'podzol', 'farmland', 'mycelium'],
    });
  }
  R.define('sunflower_lower', {
    renderKind: RK_CROSS, tiles: { all: 'sunflower_bottom' }, hardness: 0, solid: false,
    collides: false, transparent: true, opacity: 0, cutout: true, waving: 2,
    needsSupport: 'below', drops: [{ item: 'sunflower', count: 1 }], placeSound: 'grass', group: 'plant',
  });
  R.define('sunflower_upper', {
    renderKind: RK_CROSS, tiles: { all: 'sunflower_top' }, hardness: 0, solid: false,
    collides: false, transparent: true, opacity: 0, cutout: true, waving: 2,
    drops: [], placeSound: 'grass', group: 'plant',
  });
  R.define('rose_bush_lower', {
    renderKind: RK_CROSS, tiles: { all: 'rose_bush_bottom' }, hardness: 0, solid: false,
    collides: false, transparent: true, opacity: 0, cutout: true, waving: 2,
    needsSupport: 'below', drops: [{ item: 'rose_bush', count: 1 }], placeSound: 'grass', group: 'plant',
  });
  R.define('rose_bush_upper', {
    renderKind: RK_CROSS, tiles: { all: 'rose_bush_top' }, hardness: 0, solid: false,
    collides: false, transparent: true, opacity: 0, cutout: true, waving: 2,
    drops: [], placeSound: 'grass', group: 'plant',
  });
  R.define('large_fern_lower', {
    renderKind: RK_CROSS, tiles: { all: 'large_fern_bottom' }, tintIndex: 1, hardness: 0,
    solid: false, collides: false, transparent: true, opacity: 0, cutout: true,
    waving: 2, needsSupport: 'below', tool: TOOL_SHEARS,
    drops: [{ item: 'wheat_seeds', count: 1, chance: 0.125 }], placeSound: 'grass', group: 'plant',
  });
  R.define('large_fern_upper', {
    renderKind: RK_CROSS, tiles: { all: 'large_fern_top' }, tintIndex: 1, hardness: 0,
    solid: false, collides: false, transparent: true, opacity: 0, cutout: true,
    waving: 2, drops: [], placeSound: 'grass', group: 'plant',
  });
  R.define('brown_mushroom', {
    renderKind: RK_CROSS, tiles: { all: 'brown_mushroom' }, hardness: 0, solid: false,
    collides: false, transparent: true, opacity: 0, cutout: true, emissive: 1,
    randomOffset: true, replaceable: true, needsSupport: 'below', placeSound: 'grass', group: 'plant',
  });
  R.define('red_mushroom', {
    renderKind: RK_CROSS, tiles: { all: 'red_mushroom' }, hardness: 0, solid: false,
    collides: false, transparent: true, opacity: 0, cutout: true,
    randomOffset: true, replaceable: true, needsSupport: 'below', placeSound: 'grass', group: 'plant',
  });
  R.define('mushroom_stem', { tiles: { all: 'mushroom_stem' }, hardness: 0.2, tool: TOOL_AXE, placeSound: 'wood', group: 'plant' });
  R.define('red_mushroom_block', {
    tiles: { top: 'red_mushroom_block', side: 'red_mushroom_block', bottom: 'mushroom_block_inside' },
    hardness: 0.2, tool: TOOL_AXE, drops: [{ item: 'red_mushroom', count: 1, max: 2 }],
    placeSound: 'wood', group: 'plant',
  });
  R.define('brown_mushroom_block', {
    tiles: { top: 'brown_mushroom_block', side: 'brown_mushroom_block', bottom: 'mushroom_block_inside' },
    hardness: 0.2, tool: TOOL_AXE, drops: [{ item: 'brown_mushroom', count: 1, max: 2 }],
    placeSound: 'wood', group: 'plant',
  });
  // crops: 8 wheat stages, 4 stages each for carrots/potatoes/beetroot
  for (let i = 0; i < 8; i++) {
    R.define(`wheat_${i}`, {
      renderKind: RK_CROSS, tiles: { all: `wheat_${i}` }, hardness: 0, solid: false,
      collides: false, transparent: true, opacity: 0, cutout: true, waving: 2,
      needsSupport: 'below', plantOn: ['farmland', 'farmland_wet'], placeSound: 'grass',
      group: 'crop', growsInto: i < 7 ? `wheat_${i + 1}` : null,
      drops: i === 7
        ? [{ item: 'wheat', count: 1 }, { item: 'wheat_seeds', count: 1, max: 3 }]
        : [{ item: 'wheat_seeds', count: 1 }],
    });
  }
  for (const [crop, item] of [['carrots', 'carrot'], ['potatoes', 'potato'], ['beetroots', 'beetroot']]) {
    for (let i = 0; i < 4; i++) {
      R.define(`${crop}_${i}`, {
        renderKind: RK_CROSS, tiles: { all: `${crop}_${i}` }, hardness: 0, solid: false,
        collides: false, transparent: true, opacity: 0, cutout: true, waving: 2,
        needsSupport: 'below', plantOn: ['farmland', 'farmland_wet'], placeSound: 'grass',
        group: 'crop', growsInto: i < 3 ? `${crop}_${i + 1}` : null,
        drops: i === 3 ? [{ item, count: 1, max: 4 }] : [{ item, count: 1 }],
      });
    }
  }
  R.define('cactus', {
    renderKind: RK_BOXES, shape: cactusShape(),
    tiles: { top: 'cactus_top', side: 'cactus_side', bottom: 'cactus_bottom' },
    hardness: 0.4, damagePerTick: 0.08, transparent: true, opacity: 0,
    needsSupport: 'below', plantOn: ['sand', 'red_sand', 'cactus'], placeSound: 'wool',
    group: 'plant', growsInto: 'cactus',
  });
  R.define('sugar_cane', {
    renderKind: RK_CROSS, tiles: { all: 'sugar_cane' }, tintIndex: 1, hardness: 0,
    solid: false, collides: false, transparent: true, opacity: 0, cutout: true,
    waving: 2, needsSupport: 'below', drops: [{ item: 'sugar_cane', count: 1 }],
    plantOn: ['sand', 'red_sand', 'dirt', 'grass_block', 'sugar_cane'],
    placeSound: 'grass', group: 'plant', growsInto: 'sugar_cane',
  });
  R.define('bamboo', {
    renderKind: RK_CROSS, tiles: { all: 'bamboo_stalk' }, hardness: 1,
    solid: false, collides: false, transparent: true, opacity: 0, cutout: true,
    waving: 1, needsSupport: 'below', tool: TOOL_AXE, placeSound: 'wood',
    group: 'plant', growsInto: 'bamboo',
    plantOn: ['grass_block', 'dirt', 'sand', 'bamboo', 'podzol'],
  });
  R.define('vine', {
    renderKind: RK_CROSS, tiles: { all: 'vine' }, tintIndex: 2, hardness: 0.2,
    solid: false, collides: false, transparent: true, opacity: 0, cutout: true,
    climbable: true, waving: 1, flammable: 15, tool: TOOL_SHEARS, drops: [],
    silkTouchDrop: 'vine', placeSound: 'grass', group: 'plant',
  });
  R.define('lily_pad', {
    renderKind: RK_BOXES, shape: lilyShape(), tiles: { all: 'lily_pad' }, tintIndex: 2,
    hardness: 0, transparent: true, opacity: 0, cutout: true, solid: false,
    placeSound: 'grass', group: 'plant',
  });
  R.define('seagrass', {
    renderKind: RK_CROSS, tiles: { all: 'seagrass' }, tintIndex: 2, hardness: 0,
    solid: false, collides: false, transparent: true, opacity: 0, cutout: true,
    waving: 2, replaceable: true, needsSupport: 'below', drops: [], placeSound: 'grass', group: 'plant',
  });
  R.define('kelp', {
    renderKind: RK_CROSS, tiles: { all: 'kelp' }, tintIndex: 2, hardness: 0,
    solid: false, collides: false, transparent: true, opacity: 0, cutout: true,
    waving: 2, replaceable: true, placeSound: 'grass', group: 'plant', growsInto: 'kelp',
  });
  R.define('cobweb', {
    renderKind: RK_CROSS, tiles: { all: 'cobweb' }, hardness: 4, tool: TOOL_SHEARS,
    solid: false, collides: false, transparent: true, opacity: 0, cutout: true,
    speedFactor: 0.15, drops: [{ item: 'string', count: 1 }], placeSound: 'wool', group: 'misc',
  });
  R.define('pumpkin', {
    tiles: { top: 'pumpkin_top', side: 'pumpkin_side', bottom: 'pumpkin_top' },
    hardness: 1, tool: TOOL_AXE, placeSound: 'wood', group: 'plant',
  });
  R.define('carved_pumpkin', {
    tiles: { top: 'pumpkin_top', side: 'carved_pumpkin', bottom: 'pumpkin_top' },
    hardness: 1, tool: TOOL_AXE, placeSound: 'wood', group: 'plant',
  });
  R.define('melon', {
    tiles: { top: 'melon_top', side: 'melon_side', bottom: 'melon_top' },
    hardness: 1, tool: TOOL_AXE, drops: [{ item: 'melon_slice', count: 3, max: 7 }],
    placeSound: 'wood', group: 'plant',
  });
  R.define('sponge', { tiles: { all: 'sponge' }, hardness: 0.6, tool: TOOL_HOE, placeSound: 'grass', group: 'misc' });

  // ------------------------------------------------------------------ nether
  R.define('netherrack', {
    tiles: { all: 'netherrack' }, hardness: 0.4, tool: TOOL_PICK, requiresTool: true,
    flammable: 1, group: 'nether',
  });
  R.define('soul_sand', {
    tiles: { all: 'soul_sand' }, hardness: 0.5, tool: TOOL_SHOVEL, speedFactor: 0.45,
    placeSound: 'sand', group: 'nether',
  });
  R.define('soul_soil', { tiles: { all: 'soul_soil' }, hardness: 0.5, tool: TOOL_SHOVEL, placeSound: 'sand', group: 'nether' });
  R.define('nether_bricks', { tiles: { all: 'nether_bricks' }, hardness: 2, tool: TOOL_PICK, requiresTool: true, group: 'nether' });
  R.define('red_nether_bricks', { tiles: { all: 'red_nether_bricks' }, hardness: 2, tool: TOOL_PICK, requiresTool: true, group: 'nether' });
  R.define('basalt', {
    tiles: { top: 'basalt_top', side: 'basalt_side', bottom: 'basalt_top' },
    hardness: 1.25, tool: TOOL_PICK, requiresTool: true, group: 'nether',
  });
  R.define('blackstone', { tiles: { all: 'blackstone' }, hardness: 1.5, tool: TOOL_PICK, requiresTool: true, group: 'nether' });
  R.define('gilded_blackstone', {
    tiles: { all: 'gilded_blackstone' }, hardness: 1.5, tool: TOOL_PICK, requiresTool: true,
    drops: [{ item: 'gold_nugget', count: 2, max: 5 }], group: 'nether',
  });
  R.define('polished_blackstone_bricks', { tiles: { all: 'polished_blackstone_bricks' }, hardness: 1.5, tool: TOOL_PICK, requiresTool: true, group: 'nether' });
  R.define('nether_wart_block', { tiles: { all: 'nether_wart_block' }, hardness: 1, tool: TOOL_HOE, placeSound: 'wool', group: 'nether' });
  R.define('nether_wart', {
    renderKind: RK_CROSS, tiles: { all: 'nether_wart_2' }, hardness: 0, solid: false,
    collides: false, transparent: true, opacity: 0, cutout: true, needsSupport: 'below',
    plantOn: ['soul_sand'], drops: [{ item: 'nether_wart', count: 1, max: 3 }],
    placeSound: 'grass', group: 'nether',
  });
  R.define('obsidian', {
    tiles: { all: 'obsidian' }, hardness: 50, blastResistance: 1200, tool: TOOL_PICK,
    requiresTool: true, harvestLevel: 3, group: 'nether',
  });
  R.define('crying_obsidian', {
    tiles: { all: 'crying_obsidian' }, hardness: 50, blastResistance: 1200, tool: TOOL_PICK,
    requiresTool: true, harvestLevel: 3, emissive: 10, group: 'nether',
  });
  R.define('nether_portal', {
    renderKind: RK_CUBE, tiles: { all: 'nether_portal' }, hardness: -1, solid: false,
    collides: false, transparent: true, translucent: true, opacity: 0, emissive: 11,
    drops: [], interact: 'portal', blastResistance: 1e7, group: 'system', ao: false,
  });
  R.define('glowstone_dust_block', { tiles: { all: 'glowstone_dust_block' }, hardness: 0.3, emissive: 12, group: 'light' });

  // ------------------------------------------------------------------ end
  R.define('end_stone', { tiles: { all: 'end_stone' }, hardness: 3, tool: TOOL_PICK, requiresTool: true, group: 'end' });
  R.define('end_stone_bricks', { tiles: { all: 'end_stone_bricks' }, hardness: 3, tool: TOOL_PICK, requiresTool: true, group: 'end' });
  R.define('purpur_block', { tiles: { all: 'purpur_block' }, hardness: 1.5, tool: TOOL_PICK, requiresTool: true, group: 'end' });
  R.define('purpur_pillar', {
    tiles: { top: 'purpur_pillar_top', side: 'purpur_pillar_side', bottom: 'purpur_pillar_top' },
    hardness: 1.5, tool: TOOL_PICK, requiresTool: true, group: 'end',
  });
  R.define('end_portal_frame', {
    renderKind: RK_BOXES, shape: endPortalFrameShape(),
    tiles: { top: 'end_portal_frame_top', side: 'end_portal_frame_side', bottom: 'end_stone' },
    hardness: -1, blastResistance: 1e7, transparent: true, opacity: 0, drops: [],
    interact: 'end_frame', emissive: 1, group: 'end',
  });
  R.define('end_portal', {
    tiles: { all: 'end_portal' }, hardness: -1, blastResistance: 1e7, solid: false,
    collides: false, transparent: true, opacity: 0, emissive: 15, drops: [],
    interact: 'portal', group: 'system', ao: false,
  });
  R.define('dragon_egg', {
    tiles: { all: 'dragon_egg' }, hardness: 3, tool: TOOL_PICK, emissive: 1,
    transparent: true, opacity: 0, group: 'end',
  });
  R.define('prismarine', { tiles: { all: 'prismarine' }, hardness: 1.5, tool: TOOL_PICK, requiresTool: true, group: 'building' });
  R.define('prismarine_bricks', { tiles: { all: 'prismarine_bricks' }, hardness: 1.5, tool: TOOL_PICK, requiresTool: true, group: 'building' });
  R.define('dark_prismarine', { tiles: { all: 'dark_prismarine' }, hardness: 1.5, tool: TOOL_PICK, requiresTool: true, group: 'building' });

  // ------------------------------------------------------------------ furniture
  R.define('bed_foot', {
    renderKind: RK_BOXES, shape: bedShape(false),
    tiles: { top: 'bed_top_foot', side: 'bed_side', bottom: 'oak_planks' },
    hardness: 0.2, transparent: true, opacity: 0, interact: 'bed', flammable: 30,
    drops: [{ item: 'bed', count: 1 }], placeSound: 'wool', group: 'functional',
  });
  R.define('bed_head', {
    renderKind: RK_BOXES, shape: bedShape(true),
    tiles: { top: 'bed_top_head', side: 'bed_side', bottom: 'oak_planks' },
    hardness: 0.2, transparent: true, opacity: 0, interact: 'bed', flammable: 30,
    drops: [], placeSound: 'wool', group: 'functional',
  });
  R.define('iron_bars', {
    renderKind: RK_BOXES, shape: barsShape(), tiles: { all: 'iron_bars' },
    hardness: 5, tool: TOOL_PICK, requiresTool: true, transparent: true, opacity: 0,
    cutout: true, placeSound: 'metal', group: 'building',
  });
  R.define('chain', {
    renderKind: RK_BOXES, shape: [box(6.5 * P, 0, 6.5 * P, 9.5 * P, 1, 9.5 * P)],
    tiles: { all: 'chain' }, hardness: 5, tool: TOOL_PICK, requiresTool: true,
    transparent: true, opacity: 0, cutout: true, solid: false, placeSound: 'metal', group: 'building',
  });
  R.define('cauldron', {
    renderKind: RK_BOXES,
    shape: [
      box(0, 0, 0, 1, 3 * P, 1), box(0, 3 * P, 0, 2 * P, 1, 1),
      box(14 * P, 3 * P, 0, 1, 1, 1), box(2 * P, 3 * P, 0, 14 * P, 1, 2 * P),
      box(2 * P, 3 * P, 14 * P, 14 * P, 1, 1),
    ],
    tiles: { top: 'cauldron_top', side: 'cauldron_side', bottom: 'cauldron_side' },
    hardness: 2, tool: TOOL_PICK, requiresTool: true, transparent: true, opacity: 0,
    interact: 'cauldron', placeSound: 'metal', group: 'functional',
  });
  R.define('campfire', {
    renderKind: RK_BOXES, shape: campfireShape(), tiles: { all: 'campfire_log' },
    hardness: 2, tool: TOOL_AXE, emissive: 15, transparent: true, opacity: 0,
    damagePerTick: 0.05, fireDamage: true, placeSound: 'wood', group: 'light',
  });
  R.define('flower_pot', {
    renderKind: RK_BOXES, shape: flowerPotShape(), tiles: { all: 'flower_pot' },
    hardness: 0, transparent: true, opacity: 0, cutout: true, solid: false,
    placeSound: 'stone', group: 'misc',
  });
  R.define('rail', {
    renderKind: RK_BOXES, shape: [box(0, 0, 0, 1, P, 1)], tiles: { all: 'rail' },
    hardness: 0.7, tool: TOOL_PICK, transparent: true, opacity: 0, cutout: true,
    solid: false, collides: false, needsSupport: 'below', placeSound: 'metal', group: 'functional',
  });

  // ------------------------------------------------------------------ generated variants
  // slabs, stairs, fences and walls for the natural building materials.
  const SLAB_BASES = [
    ['oak_planks', TOOL_AXE, 2, 'wood'], ['birch_planks', TOOL_AXE, 2, 'wood'],
    ['spruce_planks', TOOL_AXE, 2, 'wood'], ['jungle_planks', TOOL_AXE, 2, 'wood'],
    ['acacia_planks', TOOL_AXE, 2, 'wood'], ['dark_oak_planks', TOOL_AXE, 2, 'wood'],
    ['cobblestone', TOOL_PICK, 2, 'stone'], ['stone', TOOL_PICK, 1.5, 'stone'],
    ['smooth_stone', TOOL_PICK, 2, 'stone'], ['stone_bricks', TOOL_PICK, 1.5, 'stone'],
    ['sandstone', TOOL_PICK, 0.8, 'stone'], ['red_sandstone', TOOL_PICK, 0.8, 'stone'],
    ['bricks', TOOL_PICK, 2, 'stone'], ['nether_bricks', TOOL_PICK, 2, 'stone'],
    ['quartz_block', TOOL_PICK, 0.8, 'stone'], ['purpur_block', TOOL_PICK, 1.5, 'stone'],
    ['deepslate_bricks', TOOL_PICK, 3.5, 'stone'], ['blackstone', TOOL_PICK, 1.5, 'stone'],
    ['end_stone_bricks', TOOL_PICK, 3, 'stone'], ['prismarine', TOOL_PICK, 1.5, 'stone'],
  ];
  for (const [base, tool, hard, snd] of SLAB_BASES) {
    const bd = R.get(base);
    R.define(`${base}_slab`, {
      renderKind: RK_BOXES, shape: slabShape(false), tiles: { ...bd.tiles },
      hardness: hard, tool, requiresTool: bd.requiresTool, harvestLevel: bd.harvestLevel,
      transparent: true, opacity: 0, cullSelf: false, placeSound: snd === 'wood' ? 'wood' : 'stone',
      flammable: bd.flammable, group: 'building', variantOf: base,
    });
    R.define(`${base}_stairs`, {
      renderKind: RK_BOXES, shape: stairShape(0, false), tiles: { ...bd.tiles },
      hardness: hard, tool, requiresTool: bd.requiresTool, harvestLevel: bd.harvestLevel,
      transparent: true, opacity: 0, cullSelf: false, placeSound: snd === 'wood' ? 'wood' : 'stone',
      flammable: bd.flammable, group: 'building', variantOf: base,
    });
  }
  for (const w of WOOD_TYPES) {
    R.define(`${w}_fence`, {
      renderKind: RK_BOXES, shape: fenceShape(), tiles: { all: `${w}_planks` },
      hardness: 2, tool: TOOL_AXE, transparent: true, opacity: 0, cullSelf: false,
      flammable: 20, placeSound: 'wood', group: 'building',
    });
    R.define(`${w}_fence_gate`, {
      renderKind: RK_BOXES, shape: [box(0, 5 * P, 6 * P, 1, 1, 10 * P)],
      tiles: { all: `${w}_planks` }, hardness: 2, tool: TOOL_AXE, transparent: true,
      opacity: 0, cullSelf: false, flammable: 20, interact: 'door',
      placeSound: 'wood', group: 'building',
    });
  }
  for (const base of ['cobblestone', 'stone_bricks', 'mossy_cobblestone', 'blackstone', 'deepslate_bricks']) {
    const bd = R.get(base);
    R.define(`${base}_wall`, {
      renderKind: RK_BOXES, shape: wallShape(), tiles: { ...bd.tiles },
      hardness: bd.hardness, tool: TOOL_PICK, requiresTool: true, transparent: true,
      opacity: 0, cullSelf: false, placeSound: 'stone', group: 'building', variantOf: base,
    });
  }

  return R;
}

/** Build and freeze the registry in one call. */
export function createBlockRegistry() {
  const R = new BlockRegistry();
  registerBlocks(R);
  const flags = R.freeze();
  return { registry: R, flags };
}
