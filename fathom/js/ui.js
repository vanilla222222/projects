'use strict';
// The interface: hearts and stars, the hotbar, and the inventory screen with its equipment
// slots. Built from DOM rather than drawn on the canvas, so slots stay crisp at any zoom and
// the browser handles hit-testing. Item icons are drawn from the same baked atlas the world
// uses, so a slot shows the block it will place.

function makeUI(root, deps) {
  const { tiles, texture, inventory, atlas, mining, craft } = deps;
  let craftRows = [];
  let craftSignature = null;
  let onCraft = null;
  const els = {};
  let open = false;

  function el(tag, cls, parent) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (parent) parent.appendChild(node);
    return node;
  }

  function iconFor(item, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    if (!item) return canvas;
    const spec = tiles.BY_KEY[item.key];
    if (spec && spec.colour) {
      ctx.drawImage(atlas, 0, spec.id * texture.TILE, texture.TILE, texture.TILE, 0, 0, size, size);
      return canvas;
    }
    const wallSpec = tiles.WALL_BY_KEY[item.key];
    if (wallSpec && wallSpec.colour) {
      ctx.fillStyle = wallSpec.colour;
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = Math.max(1, size / 12);
      ctx.strokeRect(size * 0.16, size * 0.16, size * 0.68, size * 0.68);
      return canvas;
    }
    if (craft && (item.key === 'bucket' || item.key === 'water-bucket')) {
      const u = size / 16;
      const full = item.key === 'water-bucket';
      ctx.fillStyle = '#8f98a3';
      ctx.fillRect(4 * u, 5 * u, 8 * u, 1 * u);
      ctx.fillStyle = '#9aa3ad';
      ctx.fillRect(4 * u, 6 * u, 8 * u, 7 * u);
      ctx.fillRect(5 * u, 13 * u, 6 * u, 1 * u);
      if (full) {
        ctx.fillStyle = '#3f86c4';
        ctx.fillRect(5 * u, 7 * u, 6 * u, 6 * u);
        ctx.fillStyle = 'rgba(190,230,255,0.5)';
        ctx.fillRect(5 * u, 7 * u, 6 * u, 1 * u);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(4 * u, 6 * u, 1 * u, 7 * u);
      return canvas;
    }
    if (mining && mining.isTool(item)) {
      const u = size / 16;
      ctx.fillStyle = '#6b4a2c';
      ctx.fillRect(7 * u, 4 * u, 2 * u, 10 * u);
      ctx.fillStyle = '#4e351e';
      ctx.fillRect(7 * u, 4 * u, 1 * u, 10 * u);
      const head = mining.tierColour(item);
      ctx.fillStyle = head;
      ctx.fillRect(3 * u, 3 * u, 10 * u, 2 * u);
      ctx.fillRect(2 * u, 4 * u, 2 * u, 2 * u);
      ctx.fillRect(12 * u, 4 * u, 2 * u, 2 * u);
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.fillRect(3 * u, 3 * u, 10 * u, 1 * u);
      return canvas;
    }
    const itemSpec = craft && craft.ITEMS[item.key];
    if (itemSpec) {
      // An ingot: a stubby trapezoid with a lit top edge, so bars read apart from blocks.
      const u = size / 16;
      ctx.fillStyle = itemSpec.colour;
      ctx.beginPath();
      ctx.moveTo(4 * u, 6 * u);
      ctx.lineTo(12 * u, 6 * u);
      ctx.lineTo(14 * u, 11 * u);
      ctx.lineTo(2 * u, 11 * u);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(4 * u, 6 * u, 8 * u, 1.5 * u);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(2 * u, 10 * u, 12 * u, 1 * u);
      return canvas;
    }
    ctx.fillStyle = '#8894a8';
    ctx.fillRect(size * 0.2, size * 0.2, size * 0.6, size * 0.6);
    return canvas;
  }

  function nameOf(item) {
    if (!item) return '';
    const spec = tiles.BY_KEY[item.key] || tiles.WALL_BY_KEY[item.key];
    return spec ? spec.name : item.key;
  }

  function buildSlot(index, parent, extraClass) {
    const node = el('button', 'slot' + (extraClass ? ' ' + extraClass : ''), parent);
    node.dataset.index = String(index);
    el('span', 'icon', node);
    el('span', 'count', node);
    node.addEventListener('mousedown', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (ev.button === 2) inventory.splitSlot(index);
      else if (ev.shiftKey) inventory.quickMove(index);
      else inventory.clickSlot(index);
      sync();
    });
    node.addEventListener('contextmenu', (ev) => ev.preventDefault());
    return node;
  }

  function build() {
    els.stats = el('div', 'stats', root);
    els.hearts = el('div', 'meter hearts', els.stats);
    els.stars = el('div', 'meter stars', els.stats);

    els.readout = el('div', 'panel readout', root);
    for (const field of ['clock', 'biome', 'depth', 'coords', 'seed']) {
      const row = el('div', 'row', els.readout);
      const label = el('span', 'label', row);
      label.textContent = field === 'coords' ? 'At' : field[0].toUpperCase() + field.slice(1);
      const value = el('span', null, row);
      value.dataset.field = field;
      els[field] = value;
    }

    els.message = el('p', 'message', root);

    els.screen = el('div', 'screen', root);
    const left = el('div', 'panel grid-panel', els.screen);
    el('h2', null, left).textContent = 'Backpack';
    els.backpack = el('div', 'grid', left);
    els.backpackSlots = [];
    const main = inventory.section('main');
    for (let i = main.from; i < main.to; i += 1) {
      els.backpackSlots.push(buildSlot(i, els.backpack));
    }
    const actions = el('div', 'actions', left);
    const sortBtn = el('button', 'action', actions);
    sortBtn.textContent = 'Sort';
    sortBtn.addEventListener('mousedown', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      inventory.sort('main');
      sync();
    });
    const trashWrap = el('div', 'trash-wrap', actions);
    el('span', 'trash-label', trashWrap).textContent = 'Trash';
    els.trashSlot = buildSlot(inventory.section('trash').from, trashWrap, 'trash');

    const right = el('div', 'panel equip-panel', els.screen);
    el('h2', null, right).textContent = 'Equipment';
    els.equipSlots = [];
    for (const [key, title] of [['armor', 'Armour'], ['accessory', 'Accessories'], ['vanity', 'Vanity']]) {
      const group = el('div', 'equip-group', right);
      el('span', 'equip-label', group).textContent = title;
      const row = el('div', 'equip-row', group);
      const section = inventory.section(key);
      for (let i = section.from; i < section.to; i += 1) {
        els.equipSlots.push(buildSlot(i, row, 'equip'));
      }
    }

    const craftPanel = el('div', 'panel craft-panel', els.screen);
    el('h2', null, craftPanel).textContent = 'Crafting';
    els.craftStations = el('p', 'stations', craftPanel);
    els.craftList = el('div', 'craft-list', craftPanel);
    els.craftEmpty = el('p', 'craft-empty', craftPanel);

    els.bar = el('div', 'hotbar', root);
    els.hotbarSlots = [];
    const hotbar = inventory.section('hotbar');
    for (let i = hotbar.from; i < hotbar.to; i += 1) {
      const node = buildSlot(i, els.bar);
      el('span', 'key', node).textContent = String((i - hotbar.from + 1) % 10);
      els.hotbarSlots.push(node);
    }

    els.held = el('div', 'held', root);
    addEventListener('mousemove', (ev) => {
      els.held.style.transform = 'translate(' + (ev.clientX + 12) + 'px,' + (ev.clientY + 12) + 'px)';
    });
    return els;
  }

  function paintSlot(node, index) {
    const item = inventory.slots[index];
    const icon = node.querySelector('.icon');
    const count = node.querySelector('.count');
    if (node.dataset.key !== (item ? item.key : '')) {
      icon.textContent = '';
      if (item) icon.appendChild(iconFor(item, 30));
      node.dataset.key = item ? item.key : '';
      node.title = item ? nameOf(item) : '';
    }
    count.textContent = item && item.count > 1 ? String(item.count) : '';
    node.classList.toggle('filled', !!item);
  }

  function meter(node, filled, total, kind) {
    if (node.childElementCount !== total) {
      node.textContent = '';
      for (let i = 0; i < total; i += 1) el('span', 'pip ' + kind, node);
    }
    const pips = node.children;
    for (let i = 0; i < pips.length; i += 1) {
      const amount = Math.max(0, Math.min(1, filled - i));
      pips[i].style.setProperty('--fill', (amount * 100).toFixed(1) + '%');
      pips[i].classList.toggle('empty', amount <= 0);
    }
  }

  // Rebuilt only when what it would show actually changes. Rebuilding every frame looked
  // fine but detached every row from under the cursor, so a click could land on an element
  // that no longer existed; the signature below is what makes a click reliable.
  function paintCrafting(state) {
    if (!craft || !els.craftList) return;
    const stations = (state && state.stations) || new Set();
    const list = craft.available(inventory, stations);
    const signature = Array.from(stations).sort().join(',') + '|'
      + list.map(r => r.out.key + 'x' + r.out.count).join(',');
    if (signature === craftSignature) return;
    craftSignature = signature;

    const names = Array.from(stations).map(s2 => s2[0].toUpperCase() + s2.slice(1));
    els.craftStations.textContent = names.length
      ? 'At: ' + names.join(', ')
      : 'No station in reach \u2014 by hand only';

    els.craftList.textContent = '';
    craftRows = [];
    for (const recipe of list) {
      const row = el('button', 'craft-row', els.craftList);
      row.appendChild(iconFor(recipe.out, 30));
      const text = el('span', 'craft-text', row);
      const title = el('span', 'craft-name', text);
      title.textContent = craft.nameOf(recipe.out.key, tiles)
        + (recipe.out.count > 1 ? ' \u00d7' + recipe.out.count : '');
      const cost = el('span', 'craft-cost', text);
      cost.textContent = recipe.need
        .map(([key, count]) => count + ' ' + craft.nameOf(key, tiles))
        .join(', ');
      row.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (onCraft) onCraft(recipe);
      });
      craftRows.push(row);
    }
    const total = craft.atStation(stations).length;
    els.craftEmpty.textContent = list.length
      ? ''
      : (total ? 'Nothing you can afford yet.' : 'Find or place a station.');
  }

  function sync(state) {
    for (let i = 0; i < els.hotbarSlots.length; i += 1) {
      paintSlot(els.hotbarSlots[i], inventory.section('hotbar').from + i);
    }
    if (open) {
      for (let i = 0; i < els.backpackSlots.length; i += 1) {
        paintSlot(els.backpackSlots[i], inventory.section('main').from + i);
      }
      for (let i = 0; i < els.equipSlots.length; i += 1) {
        paintSlot(els.equipSlots[i], Number(els.equipSlots[i].dataset.index));
      }
      paintSlot(els.trashSlot, inventory.section('trash').from);
      paintCrafting(state);
    }
    const held = inventory.held;
    els.held.textContent = '';
    els.held.classList.toggle('visible', !!held);
    if (held) {
      els.held.appendChild(iconFor(held, 30));
      if (held.count > 1) {
        const n = el('span', 'count', els.held);
        n.textContent = String(held.count);
      }
    }
    if (!state) return;
    const { stats, player } = state;
    meter(els.hearts, stats.health / 20, Math.ceil(stats.maxHealth / 20), 'heart');
    meter(els.stars, stats.mana / 20, Math.ceil(stats.maxMana / 20), 'star');
    for (let i = 0; i < els.hotbarSlots.length; i += 1) {
      els.hotbarSlots[i].classList.toggle('active', i === player.selected);
    }
  }

  function setOpen(value) {
    open = value;
    craftSignature = null;
    els.screen.classList.toggle('visible', open);
    sync();
  }

  function toggle() {
    setOpen(!open);
    return open;
  }

  return { build, sync, toggle, setOpen, get isOpen() { return open; },
    setField(key, text) { if (els[key]) els[key].textContent = text; },
    setMessage(text) { if (els.message) els.message.textContent = text; },
    set onCraft(fn) { onCraft = fn; } };
}

// The module's public surface, declared once. index.html used to repeat these
// names by hand, and three separate times a new export was added here and
// forgotten there, which broke the game at runtime while every test passed.
const EXPORTS_ui = { makeUI };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_ui;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.ui = EXPORTS_ui;
}
