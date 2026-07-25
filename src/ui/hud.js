// ---------------------------------------------------------------------------
// hud.js — Pure DOM/CSS UI for the voxel game. No canvas-2D hacks.
// All module-level helpers prefixed HUD_.
// ---------------------------------------------------------------------------

// ---- CSS injection ---------------------------------------------------------
const HUD_CSS = `
.mc-root { position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; font-family:'Minecraft','Courier New',monospace; image-rendering:pixelated; color:#fff; z-index:10; }
.mc-crosshair { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:20px; height:20px; pointer-events:none; }
.mc-crosshair::before,.mc-crosshair::after { content:''; position:absolute; background:#fff; mix-blend-mode:difference; }
.mc-crosshair::before { left:50%; top:2px; width:2px; height:16px; transform:translateX(-50%); }
.mc-crosshair::after { top:50%; left:2px; height:2px; width:16px; transform:translateY(-50%); }
.mc-hotbar { position:absolute; bottom:8px; left:50%; transform:translateX(-50%); display:flex; gap:2px; background:rgba(0,0,0,0.5); border:2px solid #555; padding:2px; pointer-events:auto; }
.mc-slot { width:40px; height:40px; border:2px solid #666; background:rgba(0,0,0,0.7); position:relative; display:flex; align-items:center; justify-content:center; cursor:pointer; image-rendering:pixelated; }
.mc-slot.selected { border-color:#fff; }
.mc-slot-count { position:absolute; bottom:1px; right:2px; font-size:9px; color:#fff; text-shadow:1px 1px #000; font-weight:bold; pointer-events:none; }
.mc-slot-dur { position:absolute; bottom:0; left:0; height:2px; background:#55ff55; }
.mc-slot img { width:32px; height:32px; image-rendering:pixelated; }
.mc-hearts { position:absolute; left:50%; transform:translateX(-50%); bottom:54px; display:flex; gap:1px; }
.mc-heart { width:9px; height:9px; font-size:8px; }
.mc-hunger { position:absolute; right:calc(50% - 182px); bottom:54px; display:flex; gap:1px; flex-direction:row-reverse; }
.mc-armor { position:absolute; left:calc(50% - 182px); bottom:63px; display:flex; gap:1px; }
.mc-xpbar-bg { position:absolute; bottom:50px; left:50%; transform:translateX(-50%); width:182px; height:5px; background:#000; border:1px solid #333; }
.mc-xpbar { height:100%; background:#7aff00; transition:width 0.1s; }
.mc-xplevel { position:absolute; bottom:55px; left:50%; transform:translateX(-50%); font-size:9px; color:#7aff00; text-shadow:1px 1px #000; }
.mc-oxygen { position:absolute; left:50%; transform:translateX(-50%); bottom:64px; display:flex; gap:1px; }
.mc-hurt-overlay { position:fixed; inset:0; background:rgba(220,20,20,0); transition:background 0.05s; pointer-events:none; z-index:9; }
.mc-water-overlay { position:fixed; inset:0; background:rgba(30,60,120,0); pointer-events:none; z-index:8; }
.mc-lava-overlay { position:fixed; inset:0; background:rgba(200,80,0,0); pointer-events:none; z-index:8; }
.mc-vignette { position:fixed; inset:0; background:radial-gradient(ellipse at center, transparent 50%, rgba(220,0,0,0) 100%); pointer-events:none; z-index:7; }
.mc-debug { position:absolute; top:4px; left:4px; font-size:9px; line-height:1.5; color:#fff; text-shadow:1px 1px #000; background:rgba(0,0,0,0.5); padding:4px 8px; pointer-events:none; white-space:pre; font-family:monospace; }
.mc-inventory-bg { position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:20; pointer-events:auto; }
.mc-inventory { background:#c6c6c6; border:2px outset #c6c6c6; padding:8px; color:#000; font-size:9px; font-family:monospace; min-width:300px; }
.mc-inventory h3 { margin:0 0 4px 0; font-size:10px; color:#333; }
.mc-inv-grid { display:grid; gap:2px; }
.mc-inv-slot { width:32px; height:32px; border:2px inset #aaa; background:#888; position:relative; cursor:pointer; display:flex; align-items:center; justify-content:center; image-rendering:pixelated; }
.mc-inv-slot:hover { border-color:#fff; }
.mc-inv-slot.selected { background:#aaa; }
.mc-inv-slot img { width:28px; height:28px; image-rendering:pixelated; }
.mc-inv-slot .count { position:absolute; bottom:0; right:1px; font-size:8px; color:#fff; text-shadow:1px 1px #000; font-weight:bold; }
.mc-tooltip { position:fixed; background:rgba(16,0,16,0.9); border:1px solid #aa00ff; color:#fff; font-size:9px; padding:4px 6px; pointer-events:none; z-index:30; white-space:nowrap; }
.mc-settings { position:fixed; inset:0; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:25; pointer-events:auto; }
.mc-settings-panel { background:#c6c6c6; padding:16px; color:#333; font-family:monospace; font-size:10px; min-width:280px; }
.mc-settings-panel h2 { text-align:center; margin:0 0 8px 0; font-size:14px; }
.mc-setting-row { margin:6px 0; display:flex; align-items:center; justify-content:space-between; }
.mc-setting-row label { min-width:140px; }
.mc-setting-row input[type=range] { width:100px; }
.mc-setting-row input[type=checkbox] { width:16px; height:16px; }
.mc-btn { background:#888; border:2px outset #aaa; color:#fff; font-family:monospace; font-size:10px; padding:4px 12px; cursor:pointer; margin:2px; text-shadow:1px 1px #000; }
.mc-btn:active { border-style:inset; }
.mc-pause { position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:30; pointer-events:auto; gap:8px; }
.mc-pause h1 { color:#fff; text-shadow:2px 2px #000; font-size:24px; margin:0 0 16px 0; }
.mc-death { position:fixed; inset:0; background:rgba(180,0,0,0.5); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:35; pointer-events:auto; gap:8px; }
.mc-death h1 { color:#f55; text-shadow:2px 2px #000; font-size:28px; margin:0 0 16px 0; }
.mc-furnace-progress { display:inline-block; width:16px; height:24px; background:#666; position:relative; overflow:hidden; }
.mc-furnace-arrow { position:absolute; bottom:0; left:0; right:0; background:#55ff55; transition:height 0.5s; }
.mc-furnace-flame { width:14px; height:14px; background:linear-gradient(to top, #f90, #ff0); }
`;

let HUD_cssInjected = false;

function HUD_injectCSS() {
  if (HUD_cssInjected) return;
  if (typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = HUD_CSS;
  document.head.appendChild(style);
  HUD_cssInjected = true;
}

// Icon cache: tileName -> dataURL
const HUD_iconCache = new Map();

/** Render an atlas tile to a data URL for use in <img> (called once, cached). */
function HUD_tileIconUrl(atlasBundle, tileName, size) {
  const key = tileName + ':' + size;
  if (HUD_iconCache.has(key)) return HUD_iconCache.get(key);
  if (!atlasBundle || !atlasBundle.atlas) return '';
  if (typeof document === 'undefined') return '';

  const atlas = atlasBundle.atlas;
  const idx = atlasBundle.atlas.index.get(tileName);
  if (idx === undefined) return '';

  const cpr = atlas.cellsPerRow;
  const cell = atlas.cell;
  const art = atlas.art;
  const gutter = atlas.gutter || (cell - art) / 2;
  const col = idx % cpr;
  const row = Math.floor(idx / cpr);
  const srcX = col * cell + gutter;
  const srcY = row * cell + gutter;

  const mip0 = atlas.mipmaps[0];
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imageData = new ImageData(mip0.data, mip0.width, mip0.height);
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = mip0.width;
  tmpCanvas.height = mip0.height;
  const tmpCtx = tmpCanvas.getContext('2d');
  tmpCtx.putImageData(imageData, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmpCanvas, srcX, srcY, art, art, 0, 0, size, size);
  const url = canvas.toDataURL();
  HUD_iconCache.set(key, url);
  return url;
}

/** Create a DOM element with optional class and inner text. */
function HUD_el(tag, cls, text) {
  if (typeof document === 'undefined') return { style: {}, classList: { add() {}, remove() {}, contains() {} }, appendChild() {}, removeChild() {}, innerHTML: '', textContent: '', children: [], addEventListener() {} };
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
}

// Heart / hunger / armor SVG sprites as CSS (drawn procedurally)
const HUD_HEART_FULL = '❤';
const HUD_HEART_HALF = '🖤';
const HUD_HEART_EMPTY = '🖤';

// ---------------------------------------------------------------------------
// HUD — crosshair, hotbar, hearts, hunger, xp, overlays
// ---------------------------------------------------------------------------
export class HUD {
  constructor(game) {
    this._game = game;
    this._root = null;
    this._hotbarSlots = [];
    this._heartEls = [];
    this._hungerEls = [];
    this._armorEls = [];
    this._oxygenEls = [];
    this._xpBar = null;
    this._xpLevel = null;
    this._hurtOverlay = null;
    this._waterOverlay = null;
    this._lavaOverlay = null;
    this._vignette = null;
    this._selectedSlot = 0;
  }

  mount(parent) {
    HUD_injectCSS();
    this._root = HUD_el('div', 'mc-root');

    // Crosshair
    const crosshair = HUD_el('div', 'mc-crosshair');
    this._root.appendChild(crosshair);

    // Hotbar
    const hotbar = HUD_el('div', 'mc-hotbar');
    for (let i = 0; i < 9; i++) {
      const slot = HUD_el('div', 'mc-slot');
      if (i === 0) slot.classList.add('selected');
      this._hotbarSlots.push(slot);
      hotbar.appendChild(slot);
    }
    this._root.appendChild(hotbar);

    // Hearts (10)
    const hearts = HUD_el('div', 'mc-hearts');
    for (let i = 0; i < 10; i++) {
      const h = HUD_el('div', 'mc-heart', HUD_HEART_FULL);
      this._heartEls.push(h);
      hearts.appendChild(h);
    }
    this._root.appendChild(hearts);

    // Hunger (10)
    const hunger = HUD_el('div', 'mc-hunger');
    for (let i = 0; i < 10; i++) {
      const h = HUD_el('div', 'mc-heart', '🍗');
      this._hungerEls.push(h);
      hunger.appendChild(h);
    }
    this._root.appendChild(hunger);

    // Armor (10 icons)
    const armor = HUD_el('div', 'mc-armor');
    for (let i = 0; i < 10; i++) {
      const a = HUD_el('div', 'mc-heart', '🛡');
      a.style.display = 'none';
      this._armorEls.push(a);
      armor.appendChild(a);
    }
    this._root.appendChild(armor);

    // Oxygen (10 bubbles)
    const oxygen = HUD_el('div', 'mc-oxygen');
    for (let i = 0; i < 10; i++) {
      const b = HUD_el('div', 'mc-heart', '🫧');
      b.style.display = 'none';
      this._oxygenEls.push(b);
      oxygen.appendChild(b);
    }
    this._root.appendChild(oxygen);

    // XP bar
    const xpBg = HUD_el('div', 'mc-xpbar-bg');
    this._xpBar = HUD_el('div', 'mc-xpbar');
    this._xpBar.style.width = '0%';
    xpBg.appendChild(this._xpBar);
    this._root.appendChild(xpBg);
    this._xpLevel = HUD_el('div', 'mc-xplevel', '0');
    this._root.appendChild(this._xpLevel);

    // Overlays
    this._hurtOverlay = HUD_el('div', 'mc-hurt-overlay');
    this._waterOverlay = HUD_el('div', 'mc-water-overlay');
    this._lavaOverlay = HUD_el('div', 'mc-lava-overlay');
    this._vignette = HUD_el('div', 'mc-vignette');
    this._root.appendChild(this._hurtOverlay);
    this._root.appendChild(this._waterOverlay);
    this._root.appendChild(this._lavaOverlay);
    this._root.appendChild(this._vignette);

    parent.appendChild(this._root);
  }

  update(dt) {
    const game = this._game;
    const player = game && game.player;
    const world = game && game.world;
    const inv = player && player.inventory;
    const atlasBundle = game && game.atlasBundle;

    // Hotbar
    const selected = player && player.inventory ? player.inventory.hotbarIndex : 0;
    if (selected !== this._selectedSlot) {
      if (this._hotbarSlots[this._selectedSlot]) this._hotbarSlots[this._selectedSlot].classList.remove('selected');
      this._selectedSlot = selected;
      if (this._hotbarSlots[selected]) this._hotbarSlots[selected].classList.add('selected');
    }

    for (let i = 0; i < 9; i++) {
      const slot = this._hotbarSlots[i];
      if (!slot) continue;
      const stack = inv && inv.getSlot ? inv.getSlot(i) : null;
      slot.innerHTML = '';
      if (stack && stack.id) {
        const img = HUD_el('img');
        const tileId = 'item:' + stack.id;
        if (atlasBundle) {
          const url = HUD_tileIconUrl(atlasBundle, tileId, 32);
          img.src = url || '';
        }
        slot.appendChild(img);
        if (stack.count > 1) {
          const cnt = HUD_el('div', 'mc-slot-count', String(stack.count));
          slot.appendChild(cnt);
        }
        if (stack.damage && stack.maxDamage) {
          const durPct = Math.max(0, 1 - stack.damage / stack.maxDamage);
          const dur = HUD_el('div', 'mc-slot-dur');
          dur.style.width = Math.round(durPct * 100) + '%';
          const r = Math.round(255 * (1 - durPct));
          const g = Math.round(255 * durPct);
          dur.style.background = `rgb(${r},${g},0)`;
          slot.appendChild(dur);
        }
      }
    }

    // Hearts
    const hp = player ? (player.health || 20) : 20;
    const maxHp = player ? (player.maxHealth || 20) : 20;
    const hpFrac = hp / maxHp;
    for (let i = 0; i < 10; i++) {
      const el = this._heartEls[i];
      if (!el) continue;
      const heartHp = (i + 1) * 2;
      if (hp >= heartHp) { el.textContent = '❤'; el.style.color = '#f55'; }
      else if (hp >= heartHp - 1) { el.textContent = '❤'; el.style.color = '#f55'; el.style.opacity = '0.5'; }
      else { el.textContent = '🖤'; el.style.color = '#444'; el.style.opacity = '1'; }
    }

    // Hunger
    const food = player ? (player.foodLevel != null ? player.foodLevel : 20) : 20;
    for (let i = 0; i < 10; i++) {
      const el = this._hungerEls[i];
      if (!el) continue;
      const filled = food > i * 2 + 1;
      el.style.opacity = filled ? '1' : '0.35';
    }

    // XP
    if (this._xpBar) {
      const xp = player ? (player.xp || 0) : 0;
      const xpMax = player ? (player.xpToNextLevel || 100) : 100;
      this._xpBar.style.width = Math.round(Math.min(1, xp / xpMax) * 100) + '%';
    }
    if (this._xpLevel) {
      this._xpLevel.textContent = String(player ? (player.level || 0) : 0);
    }

    // Armor
    const armorVal = player ? (player.armorPoints || 0) : 0;
    const armorPts = Math.floor(armorVal / 2);
    for (let i = 0; i < 10; i++) {
      const el = this._armorEls[i];
      if (!el) continue;
      el.style.display = armorPts > 0 ? 'block' : 'none';
      el.style.opacity = i < armorPts ? '1' : '0.3';
    }

    // Oxygen
    const inWater = player && player.inWater;
    const air = player ? (player.air != null ? player.air : 300) : 300;
    for (let i = 0; i < 10; i++) {
      const el = this._oxygenEls[i];
      if (!el) continue;
      el.style.display = inWater ? 'block' : 'none';
      el.style.opacity = air > i * 30 ? '1' : '0.2';
    }

    // Hurt overlay
    if (this._hurtOverlay) {
      const hurt = player ? (player.hurtTime || 0) : 0;
      const alpha = Math.max(0, hurt / 10) * 0.5;
      this._hurtOverlay.style.background = `rgba(220,20,20,${alpha})`;
    }

    // Water overlay
    if (this._waterOverlay) {
      const alpha = inWater ? 0.2 : 0;
      this._waterOverlay.style.background = `rgba(30,60,120,${alpha})`;
    }

    // Lava overlay
    if (this._lavaOverlay) {
      const inLava = player && player.inLava;
      this._lavaOverlay.style.background = `rgba(200,80,0,${inLava ? 0.5 : 0})`;
    }

    // Low health vignette
    if (this._vignette) {
      const lowHp = hpFrac < 0.3 ? (0.3 - hpFrac) / 0.3 * 0.5 : 0;
      this._vignette.style.background = lowHp > 0
        ? `radial-gradient(ellipse at center, transparent 30%, rgba(220,0,0,${lowHp}) 100%)`
        : 'none';
    }
  }

  dispose() {
    if (this._root && this._root.parentNode) this._root.parentNode.removeChild(this._root);
  }
}

// ---------------------------------------------------------------------------
// InventoryScreen
// ---------------------------------------------------------------------------
export class InventoryScreen {
  constructor(game) {
    this._game = game;
    this._el = null;
    this._visible = false;
    this._dragStack = null;
    this._dragEl = null;
    this._slotEls = [];
    this._tooltipEl = null;
    this._mode = 'inventory'; // 'inventory'|'craft'|'furnace'|'chest'|'trade'
    this._extra = null; // furnace/chest/trade data
  }

  mount(parent) {
    HUD_injectCSS();
    this._el = HUD_el('div', 'mc-inventory-bg');
    this._el.style.display = 'none';
    this._tooltipEl = HUD_el('div', 'mc-tooltip');
    this._tooltipEl.style.display = 'none';

    const panel = HUD_el('div', 'mc-inventory');
    this._el.appendChild(panel);
    this._panel = panel;
    parent.appendChild(this._el);
    if (typeof document !== 'undefined') {
      parent.appendChild(this._tooltipEl);
    }
    this._buildInventoryUI();
  }

  _buildInventoryUI() {
    const panel = this._panel;
    panel.innerHTML = '';
    panel.appendChild(HUD_el('h3', '', 'Inventory'));

    const player = this._game && this._game.player;
    const inv = player && player.inventory;

    // 4x9 main grid (slots 9-44)
    const mainGrid = HUD_el('div', 'mc-inv-grid');
    mainGrid.style.gridTemplateColumns = 'repeat(9, 36px)';
    mainGrid.style.marginBottom = '4px';
    this._slotEls = [];

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 9; c++) {
        const slotIdx = r === 3 ? c : (9 + r * 9 + c);
        const slot = this._makeSlotEl(slotIdx, inv);
        mainGrid.appendChild(slot);
      }
    }
    panel.appendChild(mainGrid);

    // Crafting 2x2 + result
    const craftRow = HUD_el('div', '');
    craftRow.style.display = 'flex';
    craftRow.style.alignItems = 'center';
    craftRow.style.gap = '4px';
    craftRow.style.marginBottom = '4px';

    const craftGrid = HUD_el('div', 'mc-inv-grid');
    craftGrid.style.gridTemplateColumns = 'repeat(2, 36px)';
    for (let i = 0; i < 4; i++) {
      const slot = this._makeSlotEl(100 + i, inv);
      craftGrid.appendChild(slot);
    }
    craftRow.appendChild(craftGrid);
    craftRow.appendChild(HUD_el('span', '', ' → '));
    const result = this._makeSlotEl(104, inv);
    craftRow.appendChild(result);
    panel.appendChild(craftRow);

    // Armor slots
    const armorRow = HUD_el('div', '');
    armorRow.style.display = 'flex';
    armorRow.style.gap = '2px';
    for (let i = 0; i < 4; i++) {
      const slot = this._makeSlotEl(200 + i, inv);
      armorRow.appendChild(slot);
    }
    panel.appendChild(armorRow);

    const btnClose = HUD_el('button', 'mc-btn', 'Close (E)');
    if (btnClose.addEventListener) {
      btnClose.addEventListener('click', () => this.hide());
    }
    panel.appendChild(btnClose);
  }

  _makeSlotEl(slotIdx, inv) {
    const el = HUD_el('div', 'mc-inv-slot');
    el.dataset.slot = slotIdx;
    this._slotEls.push(el);
    const stack = inv && inv.getSlot ? inv.getSlot(slotIdx) : null;
    HUD_renderSlotContent(el, stack, this._game && this._game.atlasBundle);

    if (el.addEventListener) {
      el.addEventListener('click', (e) => {
        this._handleSlotClick(slotIdx, e.shiftKey, false);
      });
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this._handleSlotClick(slotIdx, false, true);
      });
      el.addEventListener('mouseenter', (e) => {
        const s = inv && inv.getSlot ? inv.getSlot(slotIdx) : null;
        if (s && s.id && this._tooltipEl) {
          this._tooltipEl.textContent = s.id;
          this._tooltipEl.style.display = 'block';
          this._tooltipEl.style.left = e.clientX + 8 + 'px';
          this._tooltipEl.style.top = e.clientY + 8 + 'px';
        }
      });
      el.addEventListener('mouseleave', () => {
        if (this._tooltipEl) this._tooltipEl.style.display = 'none';
      });
    }
    return el;
  }

  _handleSlotClick(slotIdx, shiftClick, rightClick) {
    const player = this._game && this._game.player;
    const inv = player && player.inventory;
    if (!inv) return;
    if (inv.handleSlotClick) {
      inv.handleSlotClick(slotIdx, rightClick ? 1 : (shiftClick ? 2 : 0), this._dragStack);
    }
    this._refreshSlots();
  }

  _refreshSlots() {
    const inv = this._game && this._game.player && this._game.player.inventory;
    for (const el of this._slotEls) {
      const slotIdx = parseInt(el.dataset.slot, 10);
      const stack = inv && inv.getSlot ? inv.getSlot(slotIdx) : null;
      HUD_renderSlotContent(el, stack, this._game && this._game.atlasBundle);
    }
  }

  show(mode, extra) {
    this._mode = mode || 'inventory';
    this._extra = extra || null;
    if (this._el) this._el.style.display = 'flex';
    this._buildInventoryUI();
    this._visible = true;
  }

  hide() {
    if (this._el) this._el.style.display = 'none';
    this._visible = false;
  }

  update(dt) {
    if (this._visible) this._refreshSlots();
  }

  dispose() {
    if (this._el && this._el.parentNode) this._el.parentNode.removeChild(this._el);
    if (this._tooltipEl && this._tooltipEl.parentNode) this._tooltipEl.parentNode.removeChild(this._tooltipEl);
  }
}

function HUD_renderSlotContent(el, stack, atlasBundle) {
  el.innerHTML = '';
  if (stack && stack.id) {
    const img = HUD_el('img');
    const tileId = 'item:' + stack.id;
    if (atlasBundle) img.src = HUD_tileIconUrl(atlasBundle, tileId, 28) || '';
    el.appendChild(img);
    if (stack.count > 1) {
      const cnt = HUD_el('div', 'count', String(stack.count));
      el.appendChild(cnt);
    }
  }
}

// ---------------------------------------------------------------------------
// DebugOverlay (F3 screen)
// ---------------------------------------------------------------------------
export class DebugOverlay {
  constructor(game) {
    this._game = game;
    this._el = null;
    this._visible = false;
    this._fpsHistory = [];
    this._fpsMin = 9999;
  }

  mount(parent) {
    HUD_injectCSS();
    this._el = HUD_el('div', 'mc-debug');
    this._el.style.display = 'none';
    parent.appendChild(this._el);
  }

  show() { if (this._el) this._el.style.display = 'block'; this._visible = true; }
  hide() { if (this._el) this._el.style.display = 'none'; this._visible = false; }
  toggle() { this._visible ? this.hide() : this.show(); }

  update(dt) {
    if (!this._visible || !this._el) return;
    const g = this._game;
    const fps = dt > 0 ? Math.round(1 / dt) : 0;
    this._fpsHistory.push(fps);
    if (this._fpsHistory.length > 60) this._fpsHistory.shift();
    const avgFps = Math.round(this._fpsHistory.reduce((a, b) => a + b, 0) / this._fpsHistory.length);
    const minFps = Math.min(...this._fpsHistory);
    const player = g && g.player;
    const world = g && g.world;
    const cam = g && g.camera;
    const pos = player ? player.pos : { x: 0, y: 0, z: 0 };
    const bx = Math.floor(pos.x), by = Math.floor(pos.y), bz = Math.floor(pos.z);
    const cx = bx >> 4, cz = bz >> 4;
    const yaw = player ? (player.yaw || 0) : 0;
    const pitch = player ? (player.pitch || 0) : 0;
    const yawDeg = ((yaw * 180 / Math.PI) % 360 + 360) % 360;
    const facing = HUD_yawToFacing(yawDeg);
    const biome = world && world.biomeAt ? world.biomeAt(bx, bz) : null;
    const biomeName = biome ? (biome.name || biome.id || '?') : '?';
    const skyLight = world && world.getSkyLight ? world.getSkyLight(bx, by, bz) : 0;
    const blockLight = world && world.getBlockLight ? world.getBlockLight(bx, by, bz) : 0;
    const entCount = world ? (world.entities ? world.entities.length : 0) : 0;
    const chunkCount = world ? (world.chunks ? world.chunks.size : 0) : 0;
    const dimension = world ? (world.dimension || 'overworld') : 'overworld';
    const tod = world ? Math.floor(world.timeOfDay || 0) : 0;
    const weather = world && world.weather ? (world.weather.raining ? 'rain' : 'clear') : 'clear';
    const chunkRend = g && g.chunkRenderer;
    const meshCount = chunkRend && chunkRend.stats ? chunkRend.stats.meshCount : 0;
    const visMeshCount = chunkRend && chunkRend.stats ? chunkRend.stats.visibleCount : 0;
    const tris = chunkRend && chunkRend.stats ? chunkRend.stats.triangles : 0;
    let mem = '';
    if (typeof performance !== 'undefined' && performance.memory) {
      mem = `\nMem: ${Math.round(performance.memory.usedJSHeapSize / 1048576)}MB`;
    }

    this._el.textContent = [
      `FPS: ${avgFps} (avg) / ${minFps} (min)  Frame: ${(dt * 1000).toFixed(1)}ms`,
      `XYZ: ${pos.x.toFixed(2)} / ${pos.y.toFixed(2)} / ${pos.z.toFixed(2)}`,
      `Block: ${bx} ${by} ${bz}  Chunk: ${cx} ${cz}`,
      `Facing: ${facing}  Yaw: ${yawDeg.toFixed(1)}  Pitch: ${(pitch * 180 / Math.PI).toFixed(1)}`,
      `Biome: ${biomeName}`,
      `Light: sky=${skyLight} block=${blockLight}`,
      `Entities: ${entCount}  Chunks: ${chunkCount}`,
      `Meshes: ${meshCount} (${visMeshCount} visible)  Tris: ${tris}`,
      `Dimension: ${dimension}  Time: ${tod}  Weather: ${weather}` + mem,
    ].join('\n');
  }

  dispose() {
    if (this._el && this._el.parentNode) this._el.parentNode.removeChild(this._el);
  }
}

function HUD_yawToFacing(yawDeg) {
  const dirs = ['South (+Z)', 'West (-X)', 'North (-Z)', 'East (+X)'];
  return dirs[Math.round(yawDeg / 90) % 4];
}

// ---------------------------------------------------------------------------
// SettingsMenu
// ---------------------------------------------------------------------------
export class SettingsMenu {
  constructor(game) {
    this._game = game;
    this._el = null;
    this._visible = false;
  }

  mount(parent) {
    HUD_injectCSS();
    this._el = HUD_el('div', 'mc-settings');
    this._el.style.display = 'none';

    const panel = HUD_el('div', 'mc-settings-panel');
    panel.appendChild(HUD_el('h2', '', 'Settings'));

    const settings = [
      { label: 'Render Distance', key: 'renderDistance', type: 'range', min: 2, max: 12, step: 1 },
      { label: 'FOV', key: 'fov', type: 'range', min: 60, max: 110, step: 1 },
      { label: 'Mouse Sensitivity', key: 'sensitivity', type: 'range', min: 0.1, max: 3.0, step: 0.1 },
      { label: 'Fog', key: 'fog', type: 'checkbox' },
      { label: 'Ambient Occlusion', key: 'ao', type: 'checkbox' },
      { label: 'Gamma', key: 'gamma', type: 'range', min: 0.6, max: 1.6, step: 0.05 },
      { label: 'View Bobbing', key: 'viewBob', type: 'checkbox' },
      { label: 'Master Volume', key: 'masterVolume', type: 'range', min: 0, max: 1, step: 0.05 },
    ];

    this._inputs = {};
    for (const s of settings) {
      const row = HUD_el('div', 'mc-setting-row');
      row.appendChild(HUD_el('label', '', s.label));
      const inp = HUD_el('input');
      inp.type = s.type;
      if (s.type === 'range') {
        inp.min = s.min;
        inp.max = s.max;
        inp.step = s.step;
      }
      const val = this._getSetting(s.key);
      if (s.type === 'checkbox') inp.checked = !!val;
      else inp.value = val != null ? val : '';
      const valLabel = HUD_el('span', '', '');
      if (s.type === 'range') valLabel.textContent = inp.value;
      if (inp.addEventListener) {
        inp.addEventListener('input', () => {
          const v = s.type === 'checkbox' ? inp.checked : (s.type === 'range' ? parseFloat(inp.value) : inp.value);
          if (s.type === 'range') valLabel.textContent = inp.value;
          this._applySetting(s.key, v);
        });
      }
      row.appendChild(inp);
      row.appendChild(valLabel);
      this._inputs[s.key] = inp;
      panel.appendChild(row);
    }

    const btnRow = HUD_el('div', '');
    btnRow.style.marginTop = '12px';
    btnRow.style.textAlign = 'center';

    const btnSave = HUD_el('button', 'mc-btn', 'Save');
    if (btnSave.addEventListener) btnSave.addEventListener('click', () => this._onSave());
    btnRow.appendChild(btnSave);

    const btnLoad = HUD_el('button', 'mc-btn', 'Load World');
    if (btnLoad.addEventListener) btnLoad.addEventListener('click', () => this._onLoad());
    btnRow.appendChild(btnLoad);

    const btnReset = HUD_el('button', 'mc-btn', 'Reset World');
    if (btnReset.addEventListener) btnReset.addEventListener('click', () => this._onReset());
    btnRow.appendChild(btnReset);

    const btnClose = HUD_el('button', 'mc-btn', 'Close');
    if (btnClose.addEventListener) btnClose.addEventListener('click', () => this.hide());
    btnRow.appendChild(btnClose);

    panel.appendChild(btnRow);
    this._el.appendChild(panel);
    parent.appendChild(this._el);
  }

  _getSetting(key) {
    const g = this._game;
    const s = g && g.settings;
    if (!s) return null;
    return s[key];
  }

  _applySetting(key, value) {
    const g = this._game;
    if (!g) return;
    if (!g.settings) g.settings = {};
    g.settings[key] = value;
    if (key === 'renderDistance' && g.world) {
      g.world.settings.renderDistance = value;
    }
    if (key === 'fov' && g.camera) {
      g.camera.fov = value;
      if (g.camera.updateProjectionMatrix) g.camera.updateProjectionMatrix();
    }
    if (key === 'ao' && g.chunkRenderer) {
      g.chunkRenderer._opaqueMat.uniforms.uAoStrength.value = value ? 1 : 0;
      g.chunkRenderer._cutoutMat.uniforms.uAoStrength.value = value ? 1 : 0;
      g.chunkRenderer._translucentMat.uniforms.uAoStrength.value = value ? 1 : 0;
    }
    if (key === 'gamma' && g.chunkRenderer) {
      g.chunkRenderer._opaqueMat.uniforms.uGamma.value = value;
      g.chunkRenderer._cutoutMat.uniforms.uGamma.value = value;
      g.chunkRenderer._translucentMat.uniforms.uGamma.value = value;
    }
    if (key === 'masterVolume' && g.audio) {
      g.audio.setMasterVolume(value);
    }
  }

  _onSave() {
    if (this._game && this._game.save) this._game.save();
  }

  _onLoad() {
    if (this._game && this._game.load) this._game.load();
  }

  _onReset() {
    if (this._game && this._game.resetWorld) this._game.resetWorld();
  }

  show() {
    if (this._el) this._el.style.display = 'flex';
    this._visible = true;
  }

  hide() {
    if (this._el) this._el.style.display = 'none';
    this._visible = false;
  }

  toggle() { this._visible ? this.hide() : this.show(); }

  update(dt) {}

  dispose() {
    if (this._el && this._el.parentNode) this._el.parentNode.removeChild(this._el);
  }
}

// ---------------------------------------------------------------------------
// PauseMenu
// ---------------------------------------------------------------------------
export class PauseMenu {
  constructor(game) {
    this._game = game;
    this._el = null;
    this._visible = false;
  }

  mount(parent) {
    HUD_injectCSS();
    this._el = HUD_el('div', 'mc-pause');
    this._el.style.display = 'none';
    this._el.appendChild(HUD_el('h1', '', 'Paused'));

    const btnResume = HUD_el('button', 'mc-btn', 'Resume');
    if (btnResume.addEventListener) btnResume.addEventListener('click', () => this._game && this._game.resume && this._game.resume());
    this._el.appendChild(btnResume);

    const btnSettings = HUD_el('button', 'mc-btn', 'Settings');
    if (btnSettings.addEventListener) btnSettings.addEventListener('click', () => {
      if (this._game && this._game.settingsMenu) this._game.settingsMenu.show();
    });
    this._el.appendChild(btnSettings);

    const btnQuit = HUD_el('button', 'mc-btn', 'Quit to Title');
    if (btnQuit.addEventListener) btnQuit.addEventListener('click', () => {
      if (this._game && this._game.showTitle) this._game.showTitle();
    });
    this._el.appendChild(btnQuit);

    parent.appendChild(this._el);
  }

  show() { if (this._el) this._el.style.display = 'flex'; this._visible = true; }
  hide() { if (this._el) this._el.style.display = 'none'; this._visible = false; }
  toggle() { this._visible ? this.hide() : this.show(); }
  update(dt) {}
  dispose() { if (this._el && this._el.parentNode) this._el.parentNode.removeChild(this._el); }
}

// ---------------------------------------------------------------------------
// DeathScreen
// ---------------------------------------------------------------------------
export class DeathScreen {
  constructor(game) {
    this._game = game;
    this._el = null;
    this._visible = false;
  }

  mount(parent) {
    HUD_injectCSS();
    this._el = HUD_el('div', 'mc-death');
    this._el.style.display = 'none';
    this._el.appendChild(HUD_el('h1', '', 'You Died!'));
    const btnRespawn = HUD_el('button', 'mc-btn', 'Respawn');
    if (btnRespawn.addEventListener) {
      btnRespawn.addEventListener('click', () => {
        if (this._game && this._game.respawn) this._game.respawn();
        this.hide();
      });
    }
    this._el.appendChild(btnRespawn);
    parent.appendChild(this._el);
  }

  show() { if (this._el) this._el.style.display = 'flex'; this._visible = true; }
  hide() { if (this._el) this._el.style.display = 'none'; this._visible = false; }
  update(dt) {}
  dispose() { if (this._el && this._el.parentNode) this._el.parentNode.removeChild(this._el); }
}
