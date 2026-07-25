// ---------------------------------------------------------------------------
// Inventory, crafting, containers, furnace, trading.
// All module-level helpers prefixed INV_.
// ---------------------------------------------------------------------------

import { ITEM_DEFS, ITEMS_BY_ID } from '../data/items.js';
import { matchRecipe, consumeRecipe, SMELT_BY_INPUT } from '../data/recipes.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function INV_getItemDef(id) {
  return ITEMS_BY_ID.get(id) || null;
}

function INV_maxStack(id) {
  const d = INV_getItemDef(id);
  if (!d) return 64;
  return d.stack || 64;
}

function INV_isArmorSlot(itemId, slotIndex) {
  // slotIndex 0=helmet,1=chestplate,2=leggings,3=boots
  const d = INV_getItemDef(itemId);
  if (!d || !d.armor) return false;
  const slotNames = ['helmet', 'chestplate', 'leggings', 'boots'];
  return d.armor.slot === slotNames[slotIndex];
}

// ---------------------------------------------------------------------------
// ItemStack
// ---------------------------------------------------------------------------

export class ItemStack {
  constructor(itemId, count, damage) {
    this.itemId = itemId || null;
    this.count = count || 0;
    this.damage = damage || 0;
  }

  get item() {
    if (!this.itemId) return null;
    return INV_getItemDef(this.itemId);
  }

  get maxStack() {
    if (!this.itemId) return 64;
    return INV_maxStack(this.itemId);
  }

  canMergeWith(other) {
    if (!other || other.isEmpty()) return false;
    if (this.isEmpty()) return true;
    return this.itemId === other.itemId && this.damage === other.damage;
  }

  split(n) {
    const take = Math.min(n, this.count);
    const result = new ItemStack(this.itemId, take, this.damage);
    this.count -= take;
    if (this.count <= 0) { this.itemId = null; this.count = 0; }
    return result;
  }

  clone() {
    return new ItemStack(this.itemId, this.count, this.damage);
  }

  isEmpty() {
    return !this.itemId || this.count <= 0;
  }

  serialize() {
    return { itemId: this.itemId, count: this.count, damage: this.damage };
  }

  static fromSave(data) {
    if (!data) return null;
    return new ItemStack(data.itemId, data.count, data.damage);
  }
}

const INV_EMPTY = new ItemStack(null, 0, 0);

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export class Inventory {
  constructor(size) {
    this.size = size;
    this._slots = new Array(size).fill(null).map(() => null);
  }

  get(i) {
    const s = this._slots[i];
    return s && !s.isEmpty() ? s : null;
  }

  set(i, stack) {
    this._slots[i] = (stack && !stack.isEmpty()) ? stack : null;
  }

  /** Add a stack; returns leftover (may be null if all fit). */
  addItem(stack) {
    if (!stack || stack.isEmpty()) return null;
    let remaining = stack.count;
    const id = stack.itemId;
    const maxS = INV_maxStack(id);
    // First pass: merge into partial stacks
    for (let i = 0; i < this.size && remaining > 0; i++) {
      const s = this._slots[i];
      if (!s || s.isEmpty()) continue;
      if (s.itemId === id && s.damage === stack.damage && s.count < maxS) {
        const canAdd = maxS - s.count;
        const adding = Math.min(canAdd, remaining);
        s.count += adding;
        remaining -= adding;
      }
    }
    // Second pass: fill empty slots
    for (let i = 0; i < this.size && remaining > 0; i++) {
      if (!this._slots[i] || this._slots[i].isEmpty()) {
        const placing = Math.min(maxS, remaining);
        this._slots[i] = new ItemStack(id, placing, stack.damage);
        remaining -= placing;
      }
    }
    if (remaining > 0) {
      return new ItemStack(id, remaining, stack.damage);
    }
    return null;
  }

  removeItem(itemId, count) {
    let remaining = count;
    for (let i = 0; i < this.size && remaining > 0; i++) {
      const s = this._slots[i];
      if (!s || s.isEmpty() || s.itemId !== itemId) continue;
      const taking = Math.min(s.count, remaining);
      s.count -= taking;
      remaining -= taking;
      if (s.count <= 0) this._slots[i] = null;
    }
    return remaining; // returns how many were NOT removed
  }

  countOf(itemId) {
    let total = 0;
    for (const s of this._slots) {
      if (s && !s.isEmpty() && s.itemId === itemId) total += s.count;
    }
    return total;
  }

  firstEmpty() {
    for (let i = 0; i < this.size; i++) {
      if (!this._slots[i] || this._slots[i].isEmpty()) return i;
    }
    return -1;
  }

  swap(i, j) {
    const tmp = this._slots[i];
    this._slots[i] = this._slots[j];
    this._slots[j] = tmp;
  }

  transferTo(other, i) {
    const s = this._slots[i];
    if (!s || s.isEmpty()) return;
    const leftover = other.addItem(s.clone());
    if (!leftover) {
      this._slots[i] = null;
    } else {
      s.count = leftover.count;
    }
  }

  serialize() {
    return this._slots.map((s) => s ? s.serialize() : null);
  }

  applySave(data) {
    for (let i = 0; i < this.size && i < data.length; i++) {
      this._slots[i] = data[i] ? ItemStack.fromSave(data[i]) : null;
    }
  }
}

// ---------------------------------------------------------------------------
// PlayerInventory
// ---------------------------------------------------------------------------

export class PlayerInventory extends Inventory {
  constructor() {
    super(36);
    this.armor = [null, null, null, null]; // head, chest, legs, boots
    this.offhand = null;
    this.selected = 0; // hotbar index 0-8
    this.cursor = null; // drag-and-drop held stack
  }

  get heldItem() {
    return this.get(this.selected);
  }

  /** Handle a slot click in the player inventory UI.
   *  slotIndex: 0-35 for main inv, 36-39 for armor, 40 for offhand
   *  button: 0=left, 1=right, 2=middle
   *  shift: bool
   */
  handleSlotClick(slotIndex, button, shift) {
    const isArmor = slotIndex >= 36 && slotIndex <= 39;
    const isOffhand = slotIndex === 40;

    if (isArmor) {
      return this._handleArmorSlotClick(slotIndex - 36, button, shift);
    }
    if (isOffhand) {
      return this._handleOffhandClick(button, shift);
    }
    return this._handleMainSlotClick(slotIndex, button, shift);
  }

  _getSlotStack(slotIndex) {
    if (slotIndex >= 36 && slotIndex <= 39) return this.armor[slotIndex - 36];
    if (slotIndex === 40) return this.offhand;
    return this._slots[slotIndex];
  }

  _setSlotStack(slotIndex, stack) {
    if (slotIndex >= 36 && slotIndex <= 39) {
      this.armor[slotIndex - 36] = (stack && !stack.isEmpty()) ? stack : null;
    } else if (slotIndex === 40) {
      this.offhand = (stack && !stack.isEmpty()) ? stack : null;
    } else {
      this._slots[slotIndex] = (stack && !stack.isEmpty()) ? stack : null;
    }
  }

  _handleArmorSlotClick(armorIndex, button, shift) {
    const current = this.armor[armorIndex];
    const cursor = this.cursor;

    if (shift && !cursor) {
      // Shift-click armor -> move to main inventory
      if (current && !current.isEmpty()) {
        const leftover = this._addToMain(current.clone());
        this.armor[armorIndex] = leftover && !leftover.isEmpty() ? leftover : null;
      }
      return;
    }

    if (!cursor || cursor.isEmpty()) {
      // Pick up armor
      this.cursor = current ? current.clone() : null;
      this.armor[armorIndex] = null;
    } else {
      // Place into armor slot - only if it's the right armor type
      if (INV_isArmorSlot(cursor.itemId, armorIndex)) {
        if (!current || current.isEmpty()) {
          this.armor[armorIndex] = cursor.clone();
          this.cursor = null;
        } else {
          // Swap
          const tmp = current.clone();
          this.armor[armorIndex] = cursor.clone();
          this.cursor = tmp;
        }
      }
    }
  }

  _handleOffhandClick(button, shift) {
    if (shift) {
      if (this.offhand && !this.offhand.isEmpty()) {
        const leftover = this._addToMain(this.offhand.clone());
        this.offhand = leftover && !leftover.isEmpty() ? leftover : null;
      }
      return;
    }

    if (!this.cursor || this.cursor.isEmpty()) {
      this.cursor = this.offhand ? this.offhand.clone() : null;
      this.offhand = null;
    } else {
      const tmp = this.offhand ? this.offhand.clone() : null;
      this.offhand = this.cursor.clone();
      this.cursor = tmp;
    }
  }

  _addToMain(stack) {
    // Try hotbar first, then main
    const leftoverH = this._addToRange(stack, 0, 9);
    if (!leftoverH) return null;
    return this._addToRange(leftoverH, 9, 36);
  }

  _addToRange(stack, from, to) {
    if (!stack || stack.isEmpty()) return null;
    let remaining = stack.count;
    const id = stack.itemId;
    const maxS = INV_maxStack(id);
    // Merge into partials
    for (let i = from; i < to && remaining > 0; i++) {
      const s = this._slots[i];
      if (!s || s.isEmpty()) continue;
      if (s.itemId === id && s.damage === stack.damage && s.count < maxS) {
        const adding = Math.min(maxS - s.count, remaining);
        s.count += adding;
        remaining -= adding;
      }
    }
    // Fill empties
    for (let i = from; i < to && remaining > 0; i++) {
      if (!this._slots[i] || this._slots[i].isEmpty()) {
        const placing = Math.min(maxS, remaining);
        this._slots[i] = new ItemStack(id, placing, stack.damage);
        remaining -= placing;
      }
    }
    return remaining > 0 ? new ItemStack(id, remaining, stack.damage) : null;
  }

  _handleMainSlotClick(slotIndex, button, shift) {
    const slot = this._slots[slotIndex];
    const cursor = this.cursor;
    const isHotbar = slotIndex < 9;
    const isMain = slotIndex >= 9;

    if (shift && !cursor) {
      if (!slot || slot.isEmpty()) return;
      if (isHotbar) {
        // Move hotbar -> main
        const leftover = this._addToRange(slot.clone(), 9, 36);
        this._slots[slotIndex] = leftover && !leftover.isEmpty() ? leftover : null;
      } else {
        // Move main -> hotbar
        const leftover = this._addToRange(slot.clone(), 0, 9);
        this._slots[slotIndex] = leftover && !leftover.isEmpty() ? leftover : null;
      }
      return;
    }

    if (button === 0) {
      // Left click
      if (!cursor || cursor.isEmpty()) {
        // Pick up whole stack
        this.cursor = slot ? slot.clone() : null;
        this._slots[slotIndex] = null;
      } else {
        if (!slot || slot.isEmpty()) {
          // Place whole cursor stack
          this._slots[slotIndex] = cursor.clone();
          this.cursor = null;
        } else if (cursor.itemId === slot.itemId && cursor.damage === slot.damage) {
          // Merge: add cursor to slot
          const maxS = INV_maxStack(slot.itemId);
          const canAdd = maxS - slot.count;
          if (canAdd >= cursor.count) {
            slot.count += cursor.count;
            this.cursor = null;
          } else {
            slot.count = maxS;
            cursor.count -= canAdd;
          }
        } else {
          // Swap
          const tmp = slot.clone();
          this._slots[slotIndex] = cursor.clone();
          this.cursor = tmp;
        }
      }
    } else if (button === 1) {
      // Right click
      if (!cursor || cursor.isEmpty()) {
        if (!slot || slot.isEmpty()) return;
        // Pick up half
        const half = Math.ceil(slot.count / 2);
        this.cursor = new ItemStack(slot.itemId, half, slot.damage);
        slot.count -= half;
        if (slot.count <= 0) this._slots[slotIndex] = null;
      } else {
        if (!slot || slot.isEmpty()) {
          // Place one from cursor
          this._slots[slotIndex] = new ItemStack(cursor.itemId, 1, cursor.damage);
          cursor.count -= 1;
          if (cursor.count <= 0) this.cursor = null;
        } else if (cursor.itemId === slot.itemId && cursor.damage === slot.damage) {
          // Place one if not full
          const maxS = INV_maxStack(slot.itemId);
          if (slot.count < maxS) {
            slot.count += 1;
            cursor.count -= 1;
            if (cursor.count <= 0) this.cursor = null;
          }
        } else {
          // Swap
          const tmp = slot.clone();
          this._slots[slotIndex] = cursor.clone();
          this.cursor = tmp;
        }
      }
    } else if (button === 2) {
      // Middle click (creative: pick block)
      if (slot && !slot.isEmpty()) {
        this.cursor = slot.clone();
        this.cursor.count = INV_maxStack(slot.itemId);
      }
    }

    // Double-click: gather same item into cursor (caller must check for double-click)
  }

  /** Double-click: gather matching items from entire inventory into cursor. */
  handleDoubleClick() {
    if (!this.cursor || this.cursor.isEmpty()) return;
    const id = this.cursor.itemId;
    const maxS = INV_maxStack(id);
    if (this.cursor.count >= maxS) return;
    // Gather from all slots
    for (let i = 0; i < 36 && this.cursor.count < maxS; i++) {
      const s = this._slots[i];
      if (!s || s.isEmpty() || s.itemId !== id) continue;
      const take = Math.min(s.count, maxS - this.cursor.count);
      this.cursor.count += take;
      s.count -= take;
      if (s.count <= 0) this._slots[i] = null;
    }
  }

  totalArmorDefense() {
    let total = 0;
    for (const s of this.armor) {
      if (!s || s.isEmpty()) continue;
      const d = INV_getItemDef(s.itemId);
      if (d && d.armor) total += d.armor.defense;
    }
    return total;
  }

  damageArmor(amount, rng) {
    for (const s of this.armor) {
      if (!s || s.isEmpty()) continue;
      const d = INV_getItemDef(s.itemId);
      if (!d || !d.armor) continue;
      if (rng.next() < 0.5) {
        s.damage += 1;
        if (s.damage >= d.armor.durability) {
          // Break armor piece
          const idx = this.armor.indexOf(s);
          if (idx !== -1) this.armor[idx] = null;
        }
      }
    }
  }

  serialize() {
    return {
      slots: super.serialize(),
      armor: this.armor.map((s) => s ? s.serialize() : null),
      offhand: this.offhand ? this.offhand.serialize() : null,
      selected: this.selected,
    };
  }

  applySave(data) {
    super.applySave(data.slots || []);
    for (let i = 0; i < 4; i++) {
      this.armor[i] = data.armor && data.armor[i] ? ItemStack.fromSave(data.armor[i]) : null;
    }
    this.offhand = data.offhand ? ItemStack.fromSave(data.offhand) : null;
    this.selected = data.selected || 0;
  }
}

// ---------------------------------------------------------------------------
// CraftingGrid
// ---------------------------------------------------------------------------

export class CraftingGrid {
  constructor(size) {
    this.size = size; // 2 or 3
    this._slots = new Array(size * size).fill(null);
  }

  setSlot(i, stack) {
    this._slots[i] = (stack && !stack.isEmpty()) ? stack : null;
  }

  getSlot(i) {
    return this._slots[i] || null;
  }

  /** Return {item, count} for the current grid, or null if no match. */
  getResult() {
    const items = this._slots.map((s) =>
      s && !s.isEmpty() ? { item: s.itemId, count: s.count } : null
    );
    const recipe = matchRecipe(items, this.size);
    if (!recipe) return null;
    return { item: recipe.out.item, count: recipe.out.count || 1 };
  }

  /** Craft once (consume ingredients, return result stack). Returns null if no recipe. */
  craft(rng) {
    const items = this._slots.map((s) =>
      s && !s.isEmpty() ? { item: s.itemId, count: s.count } : null
    );
    const recipe = matchRecipe(items, this.size);
    if (!recipe) return null;
    const newGrid = consumeRecipe(items, recipe);
    for (let i = 0; i < this._slots.length; i++) {
      if (!newGrid[i]) {
        this._slots[i] = null;
      } else {
        this._slots[i] = new ItemStack(newGrid[i].item, newGrid[i].count, 0);
      }
    }
    return new ItemStack(recipe.out.item, recipe.out.count || 1, 0);
  }

  /** Craft as many as possible (for shift-click). Returns array of result stacks. */
  craftAll(rng) {
    const results = [];
    for (let n = 0; n < 64; n++) {
      const result = this.craft(rng);
      if (!result) break;
      results.push(result);
    }
    return results;
  }

  clear() {
    for (let i = 0; i < this._slots.length; i++) this._slots[i] = null;
  }
}

// ---------------------------------------------------------------------------
// Container
// ---------------------------------------------------------------------------

export class Container {
  constructor(size, kind) {
    this.size = size;
    this.kind = kind || 'generic';
    this._inv = new Inventory(size);
  }

  get(i) { return this._inv.get(i); }
  set(i, stack) { this._inv.set(i, stack); }
  addItem(stack) { return this._inv.addItem(stack); }
  countOf(id) { return this._inv.countOf(id); }

  serialize() { return { kind: this.kind, slots: this._inv.serialize() }; }
  applySave(data) {
    if (data && data.slots) this._inv.applySave(data.slots);
  }
}

// ---------------------------------------------------------------------------
// ChestContainer
// ---------------------------------------------------------------------------

export class ChestContainer extends Container {
  constructor() {
    super(27, 'chest');
  }
}

// ---------------------------------------------------------------------------
// FurnaceContainer
// ---------------------------------------------------------------------------

export class FurnaceContainer extends Container {
  constructor() {
    super(3, 'furnace');
    // slot 0 = input, slot 1 = fuel, slot 2 = output
    this.fuelTicks = 0;   // remaining fuel ticks
    this.fuelMax = 0;     // total ticks for current fuel item
    this.cookTicks = 0;   // progress on current item
    this.cookMax = 200;   // ticks needed to smelt
  }

  get inputSlot() { return this._inv.get(0); }
  get fuelSlot()  { return this._inv.get(1); }
  get outputSlot() { return this._inv.get(2); }

  /** Advance one tick. Returns true if state changed (for lit/unlit swap). */
  tick() {
    let changed = false;
    const input = this.inputSlot;
    const fuel = this.fuelSlot;
    const output = this.outputSlot;

    const recipe = input ? SMELT_BY_INPUT.get(input.itemId) : null;
    const canSmelt = recipe !== null && recipe !== undefined;
    const outputFull = output && canSmelt &&
      (output.itemId !== recipe.out.item || output.count >= INV_maxStack(recipe.out.item));

    // Try to consume fuel when we can smelt and have no fuel
    if (canSmelt && !outputFull && this.fuelTicks <= 0 && fuel && !fuel.isEmpty()) {
      const fuelDef = INV_getItemDef(fuel.itemId);
      const ft = fuelDef ? (fuelDef.fuelTicks || 0) : 0;
      if (ft > 0) {
        this.fuelTicks = ft;
        this.fuelMax = ft;
        fuel.count -= 1;
        if (fuel.count <= 0) this._inv.set(1, null);
        changed = true;
      }
    }

    // Burn fuel
    if (this.fuelTicks > 0) {
      if (canSmelt && !outputFull) {
        this.fuelTicks -= 1;
        this.cookTicks += 1;
        changed = true;
        if (this.cookTicks >= this.cookMax) {
          // Produce output
          this.cookTicks = 0;
          if (!output) {
            this._inv.set(2, new ItemStack(recipe.out.item, recipe.out.count || 1, 0));
          } else {
            output.count += (recipe.out.count || 1);
          }
          // Consume input
          input.count -= 1;
          if (input.count <= 0) this._inv.set(0, null);
          changed = true;
        }
      } else {
        // Burn fuel even if can't smelt (Minecraft behavior)
        this.fuelTicks -= 1;
        changed = true;
        // Cool down cook progress slightly when idle
        if (this.cookTicks > 0 && !canSmelt) {
          this.cookTicks = Math.max(0, this.cookTicks - 2);
          changed = true;
        }
      }
    } else {
      // No fuel: cool down
      if (this.cookTicks > 0 && (!canSmelt || outputFull)) {
        this.cookTicks = Math.max(0, this.cookTicks - 2);
        changed = true;
      }
    }

    return changed;
  }

  isLit() { return this.fuelTicks > 0; }

  serialize() {
    return {
      ...super.serialize(),
      fuelTicks: this.fuelTicks,
      fuelMax: this.fuelMax,
      cookTicks: this.cookTicks,
      cookMax: this.cookMax,
    };
  }

  applySave(data) {
    super.applySave(data);
    this.fuelTicks = data.fuelTicks || 0;
    this.fuelMax   = data.fuelMax || 0;
    this.cookTicks = data.cookTicks || 0;
    this.cookMax   = data.cookMax || 200;
  }
}

// ---------------------------------------------------------------------------
// VillagerTrading
// ---------------------------------------------------------------------------

// Trade offer tables per profession
const INV_TRADE_TABLES = {
  farmer: [
    { buy: { item: 'wheat',   count: 20 }, sell: { item: 'emerald',   count: 1 } },
    { buy: { item: 'potato',  count: 26 }, sell: { item: 'emerald',   count: 1 } },
    { buy: { item: 'carrot',  count: 22 }, sell: { item: 'emerald',   count: 1 } },
    { buy: { item: 'emerald', count: 1  }, sell: { item: 'bread',     count: 6 } },
    { buy: { item: 'emerald', count: 1  }, sell: { item: 'apple',     count: 4 } },
  ],
  librarian: [
    { buy: { item: 'paper',    count: 24 }, sell: { item: 'emerald',   count: 1 } },
    { buy: { item: 'book',     count: 4  }, sell: { item: 'emerald',   count: 1 } },
    { buy: { item: 'emerald',  count: 9  }, sell: { item: 'compass',   count: 1 } },
    { buy: { item: 'emerald',  count: 3  }, sell: { item: 'book',      count: 1 } },
    { buy: { item: 'ink_sac',  count: 5  }, sell: { item: 'emerald',   count: 1 } },
  ],
  blacksmith: [
    { buy: { item: 'iron_ingot',  count: 7  }, sell: { item: 'emerald',          count: 1 } },
    { buy: { item: 'diamond',     count: 1  }, sell: { item: 'emerald',          count: 3 } },
    { buy: { item: 'emerald',     count: 36 }, sell: { item: 'diamond_pickaxe',  count: 1 } },
    { buy: { item: 'emerald',     count: 20 }, sell: { item: 'iron_chestplate',  count: 1 } },
    { buy: { item: 'coal',        count: 15 }, sell: { item: 'emerald',          count: 1 } },
  ],
  butcher: [
    { buy: { item: 'porkchop',       count: 14 }, sell: { item: 'emerald',       count: 1 } },
    { buy: { item: 'beef',           count: 10 }, sell: { item: 'emerald',       count: 1 } },
    { buy: { item: 'emerald',        count: 1  }, sell: { item: 'cooked_porkchop', count: 5 } },
    { buy: { item: 'emerald',        count: 1  }, sell: { item: 'cooked_beef',   count: 5 } },
    { buy: { item: 'chicken',        count: 14 }, sell: { item: 'emerald',       count: 1 } },
  ],
  cleric: [
    { buy: { item: 'rotten_flesh',   count: 36 }, sell: { item: 'emerald',       count: 1 } },
    { buy: { item: 'gold_ingot',     count: 3  }, sell: { item: 'emerald',       count: 1 } },
    { buy: { item: 'emerald',        count: 4  }, sell: { item: 'lapis_lazuli',  count: 1 } },
    { buy: { item: 'emerald',        count: 5  }, sell: { item: 'ender_eye',     count: 1 } },
    { buy: { item: 'ender_pearl',    count: 5  }, sell: { item: 'emerald',       count: 1 } },
  ],
  fletcher: [
    { buy: { item: 'stick',      count: 32 }, sell: { item: 'emerald',   count: 1 } },
    { buy: { item: 'emerald',    count: 1  }, sell: { item: 'arrow',     count: 16 } },
    { buy: { item: 'string',     count: 14 }, sell: { item: 'emerald',   count: 1 } },
    { buy: { item: 'emerald',    count: 2  }, sell: { item: 'bow',       count: 1 } },
    { buy: { item: 'feather',    count: 24 }, sell: { item: 'emerald',   count: 1 } },
  ],
  cartographer: [
    { buy: { item: 'paper',    count: 24 }, sell: { item: 'emerald',   count: 1 } },
    { buy: { item: 'emerald',  count: 7  }, sell: { item: 'map',       count: 1 } },
    { buy: { item: 'glass',    count: 11 }, sell: { item: 'emerald',   count: 1 } },
    { buy: { item: 'emerald',  count: 12 }, sell: { item: 'compass',   count: 1 } },
    { buy: { item: 'emerald',  count: 1  }, sell: { item: 'paper',     count: 4 } },
  ],
};

export class VillagerTrading {
  constructor(profession, rng) {
    this.profession = profession || 'farmer';
    const table = INV_TRADE_TABLES[this.profession] || INV_TRADE_TABLES.farmer;
    // Pick 3-5 offers from the table
    const count = 3 + Math.floor(rng.next() * 3); // 3, 4, or 5
    const shuffled = table.slice().sort(() => rng.next() - 0.5);
    this.offers = shuffled.slice(0, Math.min(count, table.length)).map((o) => ({
      buy: { ...o.buy },
      sell: { ...o.sell },
      uses: 0,
      maxUses: 8 + Math.floor(rng.next() * 8), // 8-15
    }));
  }

  canAfford(offerIndex, playerInv) {
    const offer = this.offers[offerIndex];
    if (!offer) return false;
    if (offer.uses >= offer.maxUses) return false;
    return playerInv.countOf(offer.buy.item) >= offer.buy.count;
  }

  executeTrade(offerIndex, playerInv) {
    if (!this.canAfford(offerIndex, playerInv)) return false;
    const offer = this.offers[offerIndex];
    playerInv.removeItem(offer.buy.item, offer.buy.count);
    const leftover = playerInv.addItem(new ItemStack(offer.sell.item, offer.sell.count, 0));
    offer.uses += 1;
    return true;
  }

  restock() {
    for (const offer of this.offers) {
      offer.uses = 0;
    }
  }

  serialize() {
    return { profession: this.profession, offers: this.offers.map((o) => ({ ...o })) };
  }

  applySave(data) {
    this.profession = data.profession || 'farmer';
    this.offers = (data.offers || []).map((o) => ({ ...o }));
  }
}

// ---------------------------------------------------------------------------
// dropInventoryOnDeath
// ---------------------------------------------------------------------------

export function dropInventoryOnDeath(world, player) {
  const x = player.pos.x;
  const y = player.pos.y + 0.5;
  const z = player.pos.z;
  const inv = player.inventory;

  // Drop main inventory
  for (let i = 0; i < inv.size; i++) {
    const s = inv.get(i);
    if (s && !s.isEmpty()) {
      world.dropItem(x, y, z, s.itemId, s.count);
      inv.set(i, null);
    }
  }
  // Drop armor
  for (let i = 0; i < 4; i++) {
    const s = inv.armor[i];
    if (s && !s.isEmpty()) {
      world.dropItem(x, y, z, s.itemId, s.count);
      inv.armor[i] = null;
    }
  }
  // Drop offhand
  if (inv.offhand && !inv.offhand.isEmpty()) {
    world.dropItem(x, y, z, inv.offhand.itemId, inv.offhand.count);
    inv.offhand = null;
  }
  // Drop cursor
  if (inv.cursor && !inv.cursor.isEmpty()) {
    world.dropItem(x, y, z, inv.cursor.itemId, inv.cursor.count);
    inv.cursor = null;
  }
}
