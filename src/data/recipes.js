// ---------------------------------------------------------------------------
// Recipe definitions and matching logic.
// All top-level names prefixed RECIPE_ for concatenation safety.
// Exported: RECIPES, matchRecipe, consumeRecipe, recipesFor, SMELT_BY_INPUT
// ---------------------------------------------------------------------------

// ---- Helper to build shaped recipe patterns --------------------------------
function RECIPE_shaped(out, pattern, key, grid) {
  return { type: 'shaped', out, pattern, key, grid: grid || 3 };
}

function RECIPE_shapedM(out, pattern, key, grid) {
  return { type: 'shaped', out, pattern, key, grid: grid || 3, mirror: true };
}

function RECIPE_shapeless(out, ingredients) {
  return { type: 'shapeless', out, ingredients };
}

function RECIPE_smelt(out, input, xp, ticks) {
  return { type: 'smelt', out, in: input, xp: xp || 0.1, ticks: ticks || 200 };
}

// ---- Planks from logs -------------------------------------------------------
const RECIPE_WOOD_TYPES = ['oak', 'birch', 'spruce', 'jungle', 'acacia', 'dark_oak'];
const RECIPE_PLANK_RECIPES = RECIPE_WOOD_TYPES.map((w) =>
  RECIPE_shapeless({ item: `${w}_planks`, count: 4 }, [`${w}_log`])
);

// ---- Tool material helper --------------------------------------------------
const RECIPE_TOOL_MATS = {
  wooden: (w) => `${w || 'oak'}_planks`,
  stone: () => 'cobblestone',
  iron: () => 'iron_ingot',
  golden: () => 'gold_ingot',
  diamond: () => 'diamond',
  netherite: () => 'netherite_ingot',
};

function RECIPE_tool(tier, type) {
  const mat = tier === 'wooden'
    ? 'oak_planks'
    : tier === 'stone' ? 'cobblestone'
      : tier === 'iron' ? 'iron_ingot'
        : tier === 'golden' ? 'gold_ingot'
          : tier === 'diamond' ? 'diamond'
            : 'netherite_ingot';
  const stick = 'stick';
  const id = `${tier}_${type}`;
  if (type === 'sword') {
    return RECIPE_shaped({ item: id, count: 1 },
      ['M', 'M', 'S'], { M: mat, S: stick }, 3);
  }
  if (type === 'pickaxe') {
    return RECIPE_shaped({ item: id, count: 1 },
      ['MMM', ' S ', ' S '], { M: mat, S: stick }, 3);
  }
  if (type === 'axe') {
    return RECIPE_shapedM({ item: id, count: 1 },
      ['MM', 'MS', ' S'], { M: mat, S: stick }, 3);
  }
  if (type === 'shovel') {
    return RECIPE_shaped({ item: id, count: 1 },
      ['M', 'S', 'S'], { M: mat, S: stick }, 3);
  }
  if (type === 'hoe') {
    return RECIPE_shapedM({ item: id, count: 1 },
      ['MM', ' S', ' S'], { M: mat, S: stick }, 3);
  }
  return null;
}

// ---- Armor helper ----------------------------------------------------------
function RECIPE_armor(mat, slot) {
  const ingot = mat === 'leather' ? 'leather' : mat === 'golden' ? 'gold_ingot' : mat === 'diamond' ? 'diamond' : `${mat}_ingot`;
  const I = ingot;
  const id = `${mat}_${slot}`;
  if (slot === 'helmet') {
    return RECIPE_shaped({ item: id, count: 1 },
      ['III', 'I I'], { I }, 3);
  }
  if (slot === 'chestplate') {
    return RECIPE_shaped({ item: id, count: 1 },
      ['I I', 'III', 'III'], { I }, 3);
  }
  if (slot === 'leggings') {
    return RECIPE_shaped({ item: id, count: 1 },
      ['III', 'I I', 'I I'], { I }, 3);
  }
  if (slot === 'boots') {
    return RECIPE_shaped({ item: id, count: 1 },
      ['I I', 'I I'], { I }, 3);
  }
  return null;
}

// ===========================================================================
// RECIPES array
// ===========================================================================
export const RECIPES = [
  // ---- Planks from logs ---------------------------------------------------
  ...RECIPE_PLANK_RECIPES,

  // ---- Basic crafting -----------------------------------------------------
  RECIPE_shaped({ item: 'stick',           count: 4 }, ['P', 'P'], { P: 'oak_planks' }, 2),
  RECIPE_shaped({ item: 'crafting_table',  count: 1 }, ['PP', 'PP'], { P: 'oak_planks' }, 2),
  RECIPE_shaped({ item: 'chest',           count: 1 }, ['PPP', 'P P', 'PPP'], { P: 'oak_planks' }, 3),
  RECIPE_shaped({ item: 'barrel',          count: 1 }, ['PSP', 'P P', 'PSP'], { P: 'oak_planks', S: 'oak_planks' }, 3),
  RECIPE_shaped({ item: 'furnace',         count: 1 }, ['CCC', 'C C', 'CCC'], { C: 'cobblestone' }, 3),
  RECIPE_shaped({ item: 'torch',           count: 4 }, ['C', 'S'], { C: 'coal', S: 'stick' }, 2),
  RECIPE_shaped({ item: 'torch',           count: 4, _id: 'torch_charcoal' }, ['C', 'S'], { C: 'charcoal', S: 'stick' }, 2),

  // ---- Stick variants -----------------------------------------------------
  RECIPE_shaped({ item: 'stick', count: 4, _id: 'stick_birch' }, ['P', 'P'], { P: 'birch_planks' }, 2),
  RECIPE_shaped({ item: 'stick', count: 4, _id: 'stick_spruce' }, ['P', 'P'], { P: 'spruce_planks' }, 2),
  RECIPE_shaped({ item: 'stick', count: 4, _id: 'stick_jungle' }, ['P', 'P'], { P: 'jungle_planks' }, 2),
  RECIPE_shaped({ item: 'stick', count: 4, _id: 'stick_acacia' }, ['P', 'P'], { P: 'acacia_planks' }, 2),
  RECIPE_shaped({ item: 'stick', count: 4, _id: 'stick_dark_oak' }, ['P', 'P'], { P: 'dark_oak_planks' }, 2),

  // ---- All 30 tools -------------------------------------------------------
  RECIPE_tool('wooden',    'sword'),
  RECIPE_tool('stone',     'sword'),
  RECIPE_tool('iron',      'sword'),
  RECIPE_tool('golden',    'sword'),
  RECIPE_tool('diamond',   'sword'),
  RECIPE_tool('netherite', 'sword'),
  RECIPE_tool('wooden',    'pickaxe'),
  RECIPE_tool('stone',     'pickaxe'),
  RECIPE_tool('iron',      'pickaxe'),
  RECIPE_tool('golden',    'pickaxe'),
  RECIPE_tool('diamond',   'pickaxe'),
  RECIPE_tool('netherite', 'pickaxe'),
  RECIPE_tool('wooden',    'axe'),
  RECIPE_tool('stone',     'axe'),
  RECIPE_tool('iron',      'axe'),
  RECIPE_tool('golden',    'axe'),
  RECIPE_tool('diamond',   'axe'),
  RECIPE_tool('netherite', 'axe'),
  RECIPE_tool('wooden',    'shovel'),
  RECIPE_tool('stone',     'shovel'),
  RECIPE_tool('iron',      'shovel'),
  RECIPE_tool('golden',    'shovel'),
  RECIPE_tool('diamond',   'shovel'),
  RECIPE_tool('netherite', 'shovel'),
  RECIPE_tool('wooden',    'hoe'),
  RECIPE_tool('stone',     'hoe'),
  RECIPE_tool('iron',      'hoe'),
  RECIPE_tool('golden',    'hoe'),
  RECIPE_tool('diamond',   'hoe'),
  RECIPE_tool('netherite', 'hoe'),

  // ---- Armor (leather, iron, gold, diamond — 16 recipes) ------------------
  RECIPE_armor('leather',  'helmet'),
  RECIPE_armor('leather',  'chestplate'),
  RECIPE_armor('leather',  'leggings'),
  RECIPE_armor('leather',  'boots'),
  RECIPE_armor('iron',     'helmet'),
  RECIPE_armor('iron',     'chestplate'),
  RECIPE_armor('iron',     'leggings'),
  RECIPE_armor('iron',     'boots'),
  RECIPE_armor('golden',   'helmet'),
  RECIPE_armor('golden',   'chestplate'),
  RECIPE_armor('golden',   'leggings'),
  RECIPE_armor('golden',   'boots'),
  RECIPE_armor('diamond',  'helmet'),
  RECIPE_armor('diamond',  'chestplate'),
  RECIPE_armor('diamond',  'leggings'),
  RECIPE_armor('diamond',  'boots'),

  // ---- Special tools -------------------------------------------------------
  RECIPE_shaped({ item: 'shears', count: 1 },
    [' I', 'I '], { I: 'iron_ingot' }, 2),
  RECIPE_shaped({ item: 'flint_and_steel', count: 1 },
    ['I ', ' F'], { I: 'iron_ingot', F: 'flint' }, 2),
  RECIPE_shaped({ item: 'bucket', count: 1 },
    ['I I', ' I '], { I: 'iron_ingot' }, 3),
  RECIPE_shaped({ item: 'fishing_rod', count: 1 },
    ['  S', ' SS', 'S T'], { S: 'stick', T: 'string' }, 3),

  // ---- Wooden doors -------------------------------------------------------
  RECIPE_shaped({ item: 'oak_door',      count: 3 }, ['PP', 'PP', 'PP'], { P: 'oak_planks' }, 3),
  RECIPE_shaped({ item: 'birch_door',    count: 3 }, ['PP', 'PP', 'PP'], { P: 'birch_planks' }, 3),
  RECIPE_shaped({ item: 'spruce_door',   count: 3 }, ['PP', 'PP', 'PP'], { P: 'spruce_planks' }, 3),
  RECIPE_shaped({ item: 'jungle_door',   count: 3 }, ['PP', 'PP', 'PP'], { P: 'jungle_planks' }, 3),
  RECIPE_shaped({ item: 'acacia_door',   count: 3 }, ['PP', 'PP', 'PP'], { P: 'acacia_planks' }, 3),
  RECIPE_shaped({ item: 'dark_oak_door', count: 3 }, ['PP', 'PP', 'PP'], { P: 'dark_oak_planks' }, 3),
  RECIPE_shaped({ item: 'iron_door',     count: 3 }, ['II', 'II', 'II'], { I: 'iron_ingot' }, 3),

  // ---- Trapdoor -----------------------------------------------------------
  RECIPE_shaped({ item: 'oak_trapdoor', count: 2 }, ['PPP', 'PPP'], { P: 'oak_planks' }, 3),

  // ---- Ladder -------------------------------------------------------------
  RECIPE_shaped({ item: 'ladder', count: 3 }, ['S S', 'SSS', 'S S'], { S: 'stick' }, 3),

  // ---- Slabs (wood, stone, cobblestone, bricks, sandstone, etc.) ----------
  RECIPE_shaped({ item: 'oak_planks_slab',        count: 6 }, ['PPP'], { P: 'oak_planks' }, 3),
  RECIPE_shaped({ item: 'birch_planks_slab',       count: 6 }, ['PPP'], { P: 'birch_planks' }, 3),
  RECIPE_shaped({ item: 'spruce_planks_slab',      count: 6 }, ['PPP'], { P: 'spruce_planks' }, 3),
  RECIPE_shaped({ item: 'jungle_planks_slab',      count: 6 }, ['PPP'], { P: 'jungle_planks' }, 3),
  RECIPE_shaped({ item: 'acacia_planks_slab',      count: 6 }, ['PPP'], { P: 'acacia_planks' }, 3),
  RECIPE_shaped({ item: 'dark_oak_planks_slab',    count: 6 }, ['PPP'], { P: 'dark_oak_planks' }, 3),
  RECIPE_shaped({ item: 'stone_slab',              count: 6 }, ['SSS'], { S: 'stone' }, 3),
  RECIPE_shaped({ item: 'cobblestone_slab',        count: 6 }, ['CCC'], { C: 'cobblestone' }, 3),
  RECIPE_shaped({ item: 'stone_bricks_slab',       count: 6 }, ['BBB'], { B: 'stone_bricks' }, 3),
  RECIPE_shaped({ item: 'sandstone_slab',          count: 6 }, ['SSS'], { S: 'sandstone' }, 3),
  RECIPE_shaped({ item: 'bricks_slab',             count: 6 }, ['BBB'], { B: 'bricks' }, 3),
  RECIPE_shaped({ item: 'nether_bricks_slab',      count: 6 }, ['NNN'], { N: 'nether_bricks' }, 3),
  RECIPE_shaped({ item: 'quartz_block_slab',       count: 6 }, ['QQQ'], { Q: 'quartz_block' }, 3),

  // ---- Stairs (6 wood types + stone, cobble, stone bricks, etc.) ----------
  RECIPE_shapedM({ item: 'oak_planks_stairs',      count: 4 }, ['P  ', 'PP ', 'PPP'], { P: 'oak_planks' }, 3),
  RECIPE_shapedM({ item: 'birch_planks_stairs',    count: 4 }, ['P  ', 'PP ', 'PPP'], { P: 'birch_planks' }, 3),
  RECIPE_shapedM({ item: 'spruce_planks_stairs',   count: 4 }, ['P  ', 'PP ', 'PPP'], { P: 'spruce_planks' }, 3),
  RECIPE_shapedM({ item: 'jungle_planks_stairs',   count: 4 }, ['P  ', 'PP ', 'PPP'], { P: 'jungle_planks' }, 3),
  RECIPE_shapedM({ item: 'acacia_planks_stairs',   count: 4 }, ['P  ', 'PP ', 'PPP'], { P: 'acacia_planks' }, 3),
  RECIPE_shapedM({ item: 'dark_oak_planks_stairs', count: 4 }, ['P  ', 'PP ', 'PPP'], { P: 'dark_oak_planks' }, 3),
  RECIPE_shapedM({ item: 'cobblestone_stairs',     count: 4 }, ['C  ', 'CC ', 'CCC'], { C: 'cobblestone' }, 3),
  RECIPE_shapedM({ item: 'stone_bricks_stairs',    count: 4 }, ['B  ', 'BB ', 'BBB'], { B: 'stone_bricks' }, 3),
  RECIPE_shapedM({ item: 'sandstone_stairs',       count: 4 }, ['S  ', 'SS ', 'SSS'], { S: 'sandstone' }, 3),
  RECIPE_shapedM({ item: 'nether_bricks_stairs',   count: 4 }, ['N  ', 'NN ', 'NNN'], { N: 'nether_bricks' }, 3),
  RECIPE_shapedM({ item: 'quartz_block_stairs',    count: 4 }, ['Q  ', 'QQ ', 'QQQ'], { Q: 'quartz_block' }, 3),

  // ---- Fences and gates (6 wood types) ------------------------------------
  RECIPE_shaped({ item: 'oak_fence',           count: 3 }, ['PSP', 'PSP'], { P: 'oak_planks',      S: 'stick' }, 3),
  RECIPE_shaped({ item: 'birch_fence',         count: 3 }, ['PSP', 'PSP'], { P: 'birch_planks',    S: 'stick' }, 3),
  RECIPE_shaped({ item: 'spruce_fence',        count: 3 }, ['PSP', 'PSP'], { P: 'spruce_planks',   S: 'stick' }, 3),
  RECIPE_shaped({ item: 'jungle_fence',        count: 3 }, ['PSP', 'PSP'], { P: 'jungle_planks',   S: 'stick' }, 3),
  RECIPE_shaped({ item: 'acacia_fence',        count: 3 }, ['PSP', 'PSP'], { P: 'acacia_planks',   S: 'stick' }, 3),
  RECIPE_shaped({ item: 'dark_oak_fence',      count: 3 }, ['PSP', 'PSP'], { P: 'dark_oak_planks', S: 'stick' }, 3),
  RECIPE_shapedM({ item: 'oak_fence_gate',     count: 1 }, ['SPS', 'SPS'], { P: 'oak_planks',      S: 'stick' }, 3),
  RECIPE_shapedM({ item: 'birch_fence_gate',   count: 1 }, ['SPS', 'SPS'], { P: 'birch_planks',    S: 'stick' }, 3),
  RECIPE_shapedM({ item: 'spruce_fence_gate',  count: 1 }, ['SPS', 'SPS'], { P: 'spruce_planks',   S: 'stick' }, 3),
  RECIPE_shapedM({ item: 'jungle_fence_gate',  count: 1 }, ['SPS', 'SPS'], { P: 'jungle_planks',   S: 'stick' }, 3),
  RECIPE_shapedM({ item: 'acacia_fence_gate',  count: 1 }, ['SPS', 'SPS'], { P: 'acacia_planks',   S: 'stick' }, 3),
  RECIPE_shapedM({ item: 'dark_oak_fence_gate', count: 1 }, ['SPS', 'SPS'], { P: 'dark_oak_planks', S: 'stick' }, 3),

  // ---- Bed ----------------------------------------------------------------
  RECIPE_shaped({ item: 'white_bed', count: 1 },
    ['WWW', 'PPP'], { W: 'white_wool', P: 'oak_planks' }, 3),

  // ---- Boat ---------------------------------------------------------------
  RECIPE_shaped({ item: 'oak_boat',      count: 1 }, ['P P', 'PPP'], { P: 'oak_planks' }, 3),
  RECIPE_shaped({ item: 'birch_boat',    count: 1 }, ['P P', 'PPP'], { P: 'birch_planks' }, 3),
  RECIPE_shaped({ item: 'spruce_boat',   count: 1 }, ['P P', 'PPP'], { P: 'spruce_planks' }, 3),
  RECIPE_shaped({ item: 'jungle_boat',   count: 1 }, ['P P', 'PPP'], { P: 'jungle_planks' }, 3),
  RECIPE_shaped({ item: 'acacia_boat',   count: 1 }, ['P P', 'PPP'], { P: 'acacia_planks' }, 3),
  RECIPE_shaped({ item: 'dark_oak_boat', count: 1 }, ['P P', 'PPP'], { P: 'dark_oak_planks' }, 3),

  // ---- TNT ----------------------------------------------------------------
  RECIPE_shaped({ item: 'tnt', count: 1 },
    ['GSG', 'SGS', 'GSG'], { G: 'gunpowder', S: 'sand' }, 3),

  // ---- Bookshelf ----------------------------------------------------------
  RECIPE_shaped({ item: 'bookshelf', count: 1 },
    ['PPP', 'BBB', 'PPP'], { P: 'oak_planks', B: 'book' }, 3),

  // ---- Food recipes -------------------------------------------------------
  RECIPE_shaped({ item: 'bread',      count: 1 }, ['WWW'], { W: 'wheat' }, 3),
  RECIPE_shaped({ item: 'cookie',     count: 8 }, ['WCW'], { W: 'wheat', C: 'cocoa_beans' }, 3),
  RECIPE_shapeless({ item: 'cookie', count: 8, _id: 'cookie_alt' }, ['wheat', 'wheat', 'wheat']),
  RECIPE_shaped({ item: 'pumpkin_pie', count: 1 },
    ['PSE'], { P: 'pumpkin', S: 'sugar', E: 'egg' }, 3),

  // ---- Bowl / stew --------------------------------------------------------
  RECIPE_shaped({ item: 'bowl', count: 4 }, ['P P', ' P '], { P: 'oak_planks' }, 3),
  RECIPE_shapeless({ item: 'mushroom_stew', count: 1 },
    ['red_mushroom', 'brown_mushroom', 'bowl']),
  RECIPE_shaped({ item: 'beetroot_soup', count: 1 },
    ['BBB', 'BBB', ' W '], { B: 'beetroot', W: 'bowl' }, 3),
  RECIPE_shapeless({ item: 'rabbit_stew', count: 1 },
    ['cooked_rabbit', 'baked_potato', 'carrot', 'brown_mushroom', 'bowl']),

  // ---- Golden food --------------------------------------------------------
  RECIPE_shaped({ item: 'golden_apple', count: 1 },
    ['GGG', 'GAG', 'GGG'], { G: 'gold_ingot', A: 'apple' }, 3),
  RECIPE_shaped({ item: 'golden_carrot', count: 1 },
    ['GGG', 'GCG', 'GGG'], { G: 'gold_nugget', C: 'carrot' }, 3),

  // ---- Paper / Book -------------------------------------------------------
  RECIPE_shaped({ item: 'paper', count: 3 }, ['SSS'], { S: 'sugar_cane' }, 3),
  RECIPE_shaped({ item: 'book',  count: 1 },
    ['P', 'P', 'L'], { P: 'paper', L: 'leather' }, 3),

  // ---- Mineral block compression (9->1) -----------------------------------
  RECIPE_shaped({ item: 'iron_block',     count: 1 }, ['III', 'III', 'III'], { I: 'iron_ingot' }, 3),
  RECIPE_shaped({ item: 'gold_block',     count: 1 }, ['GGG', 'GGG', 'GGG'], { G: 'gold_ingot' }, 3),
  RECIPE_shaped({ item: 'diamond_block',  count: 1 }, ['DDD', 'DDD', 'DDD'], { D: 'diamond' }, 3),
  RECIPE_shaped({ item: 'emerald_block',  count: 1 }, ['EEE', 'EEE', 'EEE'], { E: 'emerald' }, 3),
  RECIPE_shaped({ item: 'lapis_block',    count: 1 }, ['LLL', 'LLL', 'LLL'], { L: 'lapis_lazuli' }, 3),
  RECIPE_shaped({ item: 'redstone_block', count: 1 }, ['RRR', 'RRR', 'RRR'], { R: 'redstone' }, 3),
  RECIPE_shaped({ item: 'coal_block',     count: 1 }, ['CCC', 'CCC', 'CCC'], { C: 'coal' }, 3),
  RECIPE_shaped({ item: 'hay_block',      count: 1 }, ['WWW', 'WWW', 'WWW'], { W: 'wheat' }, 3),
  RECIPE_shaped({ item: 'quartz_block',   count: 1 }, ['QQ', 'QQ'], { Q: 'quartz' }, 2),

  // ---- Decompression (1->9) -----------------------------------------------
  RECIPE_shapeless({ item: 'iron_ingot',    count: 9 }, ['iron_block']),
  RECIPE_shapeless({ item: 'gold_ingot',    count: 9 }, ['gold_block']),
  RECIPE_shapeless({ item: 'diamond',       count: 9 }, ['diamond_block']),
  RECIPE_shapeless({ item: 'emerald',       count: 9 }, ['emerald_block']),
  RECIPE_shapeless({ item: 'lapis_lazuli',  count: 9 }, ['lapis_block']),
  RECIPE_shapeless({ item: 'redstone',      count: 9 }, ['redstone_block']),
  RECIPE_shapeless({ item: 'coal',          count: 9 }, ['coal_block']),

  // ---- Ingot <-> nugget ---------------------------------------------------
  RECIPE_shaped({ item: 'iron_ingot',  count: 1, _id: 'iron_from_nuggets' },
    ['NNN', 'NNN', 'NNN'], { N: 'iron_nugget' }, 3),
  RECIPE_shaped({ item: 'gold_ingot',  count: 1, _id: 'gold_from_nuggets' },
    ['NNN', 'NNN', 'NNN'], { N: 'gold_nugget' }, 3),
  RECIPE_shapeless({ item: 'iron_nugget', count: 9 }, ['iron_ingot']),
  RECIPE_shapeless({ item: 'gold_nugget', count: 9 }, ['gold_ingot']),

  // ---- Netherite ingot ----------------------------------------------------
  RECIPE_shaped({ item: 'netherite_ingot', count: 1 },
    ['SSSS', 'GGGG'], { S: 'netherite_scrap', G: 'gold_ingot' }, 2),

  // ---- Wool from string + dye coloring ------------------------------------
  RECIPE_shaped({ item: 'white_wool', count: 1 }, ['SS', 'SS'], { S: 'string' }, 2),
  ...RECIPE_WOOD_TYPES.length > 0 ? [] : [],  // placeholder to avoid empty spread issue
  ...['orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray',
    'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'].map((c) =>
    RECIPE_shapeless({ item: `${c}_wool`, count: 1 }, ['white_wool', `${c}_dye`])
  ),

  // ---- Dyes from sources --------------------------------------------------
  RECIPE_shapeless({ item: 'yellow_dye',     count: 1 }, ['dandelion']),
  RECIPE_shapeless({ item: 'red_dye',        count: 1 }, ['poppy']),
  RECIPE_shapeless({ item: 'light_blue_dye', count: 1 }, ['blue_orchid']),
  RECIPE_shapeless({ item: 'magenta_dye',    count: 1 }, ['allium']),
  RECIPE_shapeless({ item: 'light_gray_dye', count: 1 }, ['azure_bluet']),
  RECIPE_shapeless({ item: 'red_dye',        count: 1, _id: 'red_dye_tulip' }, ['red_tulip']),
  RECIPE_shapeless({ item: 'orange_dye',     count: 1 }, ['orange_tulip']),
  RECIPE_shapeless({ item: 'white_dye',      count: 1, _id: 'white_dye_tulip' }, ['white_tulip']),
  RECIPE_shapeless({ item: 'pink_dye',       count: 1 }, ['pink_tulip']),
  RECIPE_shapeless({ item: 'light_gray_dye', count: 1, _id: 'lg_daisy' }, ['oxeye_daisy']),
  RECIPE_shapeless({ item: 'blue_dye',       count: 1 }, ['cornflower']),
  RECIPE_shapeless({ item: 'white_dye',      count: 1, _id: 'white_lily' }, ['lily_of_the_valley']),
  RECIPE_shapeless({ item: 'blue_dye',       count: 1, _id: 'blue_dye_lapis' }, ['lapis_lazuli']),
  RECIPE_shapeless({ item: 'black_dye',      count: 1 }, ['ink_sac']),
  RECIPE_shapeless({ item: 'white_dye',      count: 1, _id: 'white_bone_meal' }, ['bone_meal']),
  RECIPE_shapeless({ item: 'green_dye',      count: 1 }, ['cactus']),
  RECIPE_shapeless({ item: 'brown_dye',      count: 1 }, ['cocoa_beans']),
  RECIPE_shapeless({ item: 'yellow_dye',     count: 2, _id: 'yellow_sunflower' }, ['sunflower']),
  RECIPE_shapeless({ item: 'red_dye',        count: 2, _id: 'red_rose_bush' }, ['rose_bush']),

  // ---- Sugar + Bone meal --------------------------------------------------
  RECIPE_shapeless({ item: 'sugar',     count: 1 }, ['sugar_cane']),
  RECIPE_shapeless({ item: 'bone_meal', count: 3 }, ['bone']),

  // ---- Brewing / combat materials -----------------------------------------
  RECIPE_shapeless({ item: 'magma_cream',  count: 1 }, ['blaze_powder', 'slime_ball']),
  RECIPE_shapeless({ item: 'blaze_powder', count: 2 }, ['blaze_rod']),
  RECIPE_shapeless({ item: 'ender_eye',    count: 1 }, ['ender_pearl', 'blaze_powder']),

  // ---- Mining / transport equipment ---------------------------------------
  RECIPE_shaped({ item: 'rail',     count: 16 }, ['I I', 'ISI', 'I I'], { I: 'iron_ingot', S: 'stick' }, 3),
  RECIPE_shaped({ item: 'minecart', count: 1  }, ['I I', 'III'], { I: 'iron_ingot' }, 3),
  RECIPE_shaped({ item: 'cauldron', count: 1  }, ['I I', 'I I', 'III'], { I: 'iron_ingot' }, 3),
  RECIPE_shaped({ item: 'compass',  count: 1  }, [' I ', 'IRI', ' I '], { I: 'iron_ingot', R: 'redstone' }, 3),
  RECIPE_shaped({ item: 'clock',    count: 1  }, [' G ', 'GRG', ' G '], { G: 'gold_ingot',  R: 'redstone' }, 3),
  RECIPE_shaped({ item: 'spyglass', count: 1  }, [' A ', ' C '],        { A: 'amethyst_shard', C: 'copper_ingot' }, 3),

  // ---- Combat -------------------------------------------------------------
  RECIPE_shaped({ item: 'bow',      count: 1 },
    [' SW', 'S W', ' SW'], { S: 'stick', W: 'string' }, 3),
  RECIPE_shaped({ item: 'arrow',    count: 4 },
    ['F', 'S', 'L'], { F: 'flint', S: 'stick', L: 'feather' }, 3),
  RECIPE_shaped({ item: 'crossbow', count: 1 },
    ['SIS', 'TRT', ' S '], { S: 'stick', I: 'iron_ingot', T: 'string', R: 'tripwire_hook' }, 3),
  RECIPE_shaped({ item: 'shield',   count: 1 },
    ['PIP', 'PPP', ' P '], { P: 'oak_planks', I: 'iron_ingot' }, 3),

  // ---- Lantern + campfire -------------------------------------------------
  RECIPE_shaped({ item: 'lantern', count: 1 },
    ['III', 'ILI', 'III'], { I: 'iron_nugget', L: 'torch' }, 3),
  RECIPE_shaped({ item: 'campfire', count: 1 },
    [' S ', 'SLS', 'LLL'], { S: 'stick', L: 'coal' }, 3),

  // ---- Iron bars ----------------------------------------------------------
  RECIPE_shaped({ item: 'iron_bars', count: 16 },
    ['III', 'III'], { I: 'iron_ingot' }, 3),

  // ---- Nether bricks + red nether bricks ----------------------------------
  RECIPE_shaped({ item: 'nether_bricks',     count: 1 }, ['NN', 'NN'], { N: 'nether_brick' }, 2),
  RECIPE_shaped({ item: 'red_nether_bricks', count: 1 },
    ['NW', 'WN'], { N: 'nether_brick', W: 'nether_wart' }, 2),

  // ---- Glowstone from dust ------------------------------------------------
  RECIPE_shaped({ item: 'glowstone', count: 1 }, ['DD', 'DD'], { D: 'glowstone_dust' }, 2),

  // ---- Map ----------------------------------------------------------------
  RECIPE_shaped({ item: 'map', count: 1 },
    ['PPP', 'PCP', 'PPP'], { P: 'paper', C: 'compass' }, 3),

  // ---- Bricks block from bricks -------------------------------------------
  RECIPE_shaped({ item: 'bricks', count: 1 }, ['BB', 'BB'], { B: 'brick' }, 2),

  // ---- Lead ---------------------------------------------------------------
  RECIPE_shaped({ item: 'lead', count: 2 },
    ['SS ', 'S  ', '  S'], { S: 'string' }, 3),

  // ---- Firework rocket ----------------------------------------------------
  RECIPE_shaped({ item: 'firework_rocket', count: 3 },
    ['GP', ' '], { G: 'gunpowder', P: 'paper' }, 2),

  // ---- Hay block from wheat -----------------------------------------------
  // (already done above)

  // ---- Wool from 4 strings (white only - listed above already) -----------
  // Additional coloured wool from dye
  RECIPE_shapeless({ item: 'orange_wool', count: 1, _id: 'orange_wool_direct' }, ['white_wool', 'orange_dye']),

].filter(Boolean); // filter out any null entries (e.g. from a bad helper call)

// ---- Smelting recipes -------------------------------------------------------
const RECIPE_SMELT_LIST = [
  // ores -> ingots/items
  RECIPE_smelt({ item: 'iron_ingot',   count: 1 }, 'raw_iron',   0.7, 200),
  RECIPE_smelt({ item: 'copper_ingot', count: 1 }, 'raw_copper', 0.7, 200),
  RECIPE_smelt({ item: 'gold_ingot',   count: 1 }, 'raw_gold',   1.0, 200),
  RECIPE_smelt({ item: 'iron_ingot',   count: 1, _id: 'smelt_iron_ore' },   'iron_ore',   0.7, 200),
  RECIPE_smelt({ item: 'copper_ingot', count: 1, _id: 'smelt_copper_ore' }, 'copper_ore', 0.7, 200),
  RECIPE_smelt({ item: 'gold_ingot',   count: 1, _id: 'smelt_gold_ore' },   'gold_ore',   1.0, 200),
  RECIPE_smelt({ item: 'netherite_scrap', count: 1 }, 'ancient_debris', 2.0, 200),

  // glass from sand
  RECIPE_smelt({ item: 'glass', count: 1 },           'sand',        0.1, 200),
  RECIPE_smelt({ item: 'glass', count: 1, _id: 'smelt_red_sand' }, 'red_sand', 0.1, 200),

  // charcoal from logs
  RECIPE_smelt({ item: 'charcoal', count: 1 },              'oak_log',      0.15, 200),
  RECIPE_smelt({ item: 'charcoal', count: 1, _id: 'smc_birch' }, 'birch_log',   0.15, 200),
  RECIPE_smelt({ item: 'charcoal', count: 1, _id: 'smc_spruce' }, 'spruce_log', 0.15, 200),
  RECIPE_smelt({ item: 'charcoal', count: 1, _id: 'smc_jungle' }, 'jungle_log', 0.15, 200),
  RECIPE_smelt({ item: 'charcoal', count: 1, _id: 'smc_acacia' }, 'acacia_log', 0.15, 200),
  RECIPE_smelt({ item: 'charcoal', count: 1, _id: 'smc_dark' },  'dark_oak_log', 0.15, 200),

  // stone
  RECIPE_smelt({ item: 'stone',        count: 1 }, 'cobblestone', 0.1, 200),
  RECIPE_smelt({ item: 'smooth_stone', count: 1 }, 'stone',       0.1, 200),
  RECIPE_smelt({ item: 'brick',        count: 1 }, 'clay_ball',   0.3, 200),

  // food
  RECIPE_smelt({ item: 'cooked_porkchop', count: 1 }, 'porkchop', 0.35, 200),
  RECIPE_smelt({ item: 'cooked_beef',     count: 1 }, 'beef',      0.35, 200),
  RECIPE_smelt({ item: 'cooked_chicken',  count: 1 }, 'chicken',   0.35, 200),
  RECIPE_smelt({ item: 'cooked_mutton',   count: 1 }, 'mutton',    0.35, 200),
  RECIPE_smelt({ item: 'cooked_rabbit',   count: 1 }, 'rabbit',    0.35, 200),
  RECIPE_smelt({ item: 'cooked_cod',      count: 1 }, 'cod',       0.35, 200),
  RECIPE_smelt({ item: 'cooked_salmon',   count: 1 }, 'salmon',    0.35, 200),
  RECIPE_smelt({ item: 'baked_potato',    count: 1 }, 'potato',    0.35, 200),
  RECIPE_smelt({ item: 'dried_kelp',      count: 1 }, 'kelp',      0.1,  200),

  // coal from coal ore (silk)
  RECIPE_smelt({ item: 'coal',        count: 1 }, 'coal_ore',     0.1, 200),
  RECIPE_smelt({ item: 'diamond',     count: 1 }, 'diamond_ore',  1.0, 200),
  RECIPE_smelt({ item: 'emerald',     count: 1 }, 'emerald_ore',  1.0, 200),
  RECIPE_smelt({ item: 'lapis_lazuli', count: 1 }, 'lapis_ore',   0.2, 200),
  RECIPE_smelt({ item: 'redstone',    count: 1 }, 'redstone_ore', 0.7, 200),
  RECIPE_smelt({ item: 'quartz',      count: 1 }, 'nether_quartz_ore', 0.2, 200),
  RECIPE_smelt({ item: 'gold_ingot',  count: 1, _id: 'smelt_nether_gold' }, 'nether_gold_ore', 1.0, 200),
];

// Push smelting into RECIPES
for (const r of RECIPE_SMELT_LIST) {
  RECIPES.push(r);
}

// ===========================================================================
// SMELT_BY_INPUT
// ===========================================================================
export const SMELT_BY_INPUT = new Map();
for (const r of RECIPES) {
  if (r.type === 'smelt') {
    if (!SMELT_BY_INPUT.has(r.in)) {
      SMELT_BY_INPUT.set(r.in, r);
    }
  }
}

// ===========================================================================
// matchRecipe
// ===========================================================================

/** Extract the bounding box of non-null cells in a flat grid. */
function RECIPE_bounds(grid, size) {
  let minR = size, maxR = -1, minC = size, maxC = -1;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = grid[r * size + c];
      if (cell && cell.item) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
  }
  if (maxR < 0) return null;
  return { minR, maxR, minC, maxC, h: maxR - minR + 1, w: maxC - minC + 1 };
}

/** Build a pattern array from a recipe's `pattern` + `key`. */
function RECIPE_expandPattern(recipe) {
  const rows = recipe.pattern;
  const key = recipe.key;
  const h = rows.length;
  const w = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const result = [];
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const ch = rows[r][c] || ' ';
      result.push(ch === ' ' ? null : (key[ch] || null));
    }
  }
  return { cells: result, h, w };
}

/** Try to match a shaped recipe (possibly mirrored) against grid items at an offset. */
function RECIPE_tryShapedAt(grid, gridSize, patCells, patW, patH, offR, offC, mirror) {
  for (let r = 0; r < patH; r++) {
    for (let c = 0; c < patW; c++) {
      const expected = mirror
        ? patCells[r * patW + (patW - 1 - c)]
        : patCells[r * patW + c];
      const gi = (offR + r) * gridSize + (offC + c);
      const actual = (gi >= 0 && gi < grid.length) ? grid[gi] : null;
      if (expected === null || expected === undefined) {
        if (actual && actual.item) return false;
      } else {
        if (!actual || actual.item !== expected) return false;
      }
    }
  }
  // Also check that no cells outside the pattern bounding box are occupied
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const gi = r * gridSize + c;
      const actual = (gi >= 0 && gi < grid.length) ? grid[gi] : null;
      if (!actual || !actual.item) continue;
      const inPat = r >= offR && r < offR + patH && c >= offC && c < offC + patW;
      if (!inPat) return false;
    }
  }
  return true;
}

export function matchRecipe(gridItems, gridSize) {
  // Build a multiset of ingredients for shapeless matching
  const RECIPE_inputMultiset = new Map();
  for (const cell of gridItems) {
    if (cell && cell.item) {
      RECIPE_inputMultiset.set(cell.item, (RECIPE_inputMultiset.get(cell.item) || 0) + 1);
    }
  }
  const RECIPE_totalInput = RECIPE_inputMultiset.size;
  const bounds = RECIPE_bounds(gridItems, gridSize);

  for (const recipe of RECIPES) {
    if (recipe.type === 'shaped') {
      const { cells: patCells, h: patH, w: patW } = RECIPE_expandPattern(recipe);
      const rg = recipe.grid || 3;
      if (patH > gridSize || patW > gridSize) continue;
      // Try all offsets
      const maxR = gridSize - patH;
      const maxC = gridSize - patW;
      let matched = false;
      for (let offR = 0; offR <= maxR && !matched; offR++) {
        for (let offC = 0; offC <= maxC && !matched; offC++) {
          if (RECIPE_tryShapedAt(gridItems, gridSize, patCells, patW, patH, offR, offC, false)) {
            matched = true;
          }
          if (!matched && recipe.mirror) {
            if (RECIPE_tryShapedAt(gridItems, gridSize, patCells, patW, patH, offR, offC, true)) {
              matched = true;
            }
          }
        }
      }
      if (matched) return recipe;
    } else if (recipe.type === 'shapeless') {
      const ingList = recipe.ingredients;
      if (ingList.length !== RECIPE_totalInput) continue;
      // Build expected multiset
      const expected = new Map();
      for (const ing of ingList) expected.set(ing, (expected.get(ing) || 0) + 1);
      let ok = true;
      for (const [item, cnt] of expected) {
        if ((RECIPE_inputMultiset.get(item) || 0) < cnt) { ok = false; break; }
      }
      if (ok) return recipe;
    }
  }
  return null;
}

// ===========================================================================
// consumeRecipe
// ===========================================================================
export function consumeRecipe(gridItems, recipe) {
  const result = gridItems.map((cell) => cell ? { ...cell } : null);
  if (recipe.type === 'shaped') {
    const { cells: patCells, h: patH, w: patW } = RECIPE_expandPattern(recipe);
    const gridSize = Math.round(Math.sqrt(gridItems.length));
    // Find the offset that matches
    for (let offR = 0; offR <= gridSize - patH; offR++) {
      for (let offC = 0; offC <= gridSize - patW; offC++) {
        if (RECIPE_tryShapedAt(gridItems, gridSize, patCells, patW, patH, offR, offC, false) ||
            (recipe.mirror && RECIPE_tryShapedAt(gridItems, gridSize, patCells, patW, patH, offR, offC, true))) {
          for (let r = 0; r < patH; r++) {
            for (let c = 0; c < patW; c++) {
              const pat = patCells[r * patW + c];
              if (pat) {
                const gi = (offR + r) * gridSize + (offC + c);
                const cell = result[gi];
                if (cell && cell.count > 1) {
                  result[gi] = { ...cell, count: cell.count - 1 };
                } else {
                  result[gi] = null;
                }
              }
            }
          }
          return result;
        }
      }
    }
  } else if (recipe.type === 'shapeless') {
    const needed = new Map();
    for (const ing of recipe.ingredients) needed.set(ing, (needed.get(ing) || 0) + 1);
    for (let i = 0; i < result.length; i++) {
      const cell = result[i];
      if (!cell || !cell.item) continue;
      const cnt = needed.get(cell.item);
      if (cnt && cnt > 0) {
        needed.set(cell.item, cnt - 1);
        if (cell.count > 1) result[i] = { ...cell, count: cell.count - 1 };
        else result[i] = null;
      }
    }
  }
  return result;
}

// ===========================================================================
// recipesFor
// ===========================================================================
export function recipesFor(itemId) {
  return RECIPES.filter((r) => r.out && r.out.item === itemId);
}
