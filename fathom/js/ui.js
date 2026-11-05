'use strict';
// The interface: hearts and stars, the hotbar, and the inventory screen with its equipment
// slots. Built from DOM rather than drawn on the canvas, so slots stay crisp at any zoom and
// the browser handles hit-testing. Item icons are drawn from the same baked atlas the world
// uses, so a slot shows the block it will place.

function makeUI(root, deps) {
  const { tiles, texture, inventory, atlas } = deps;
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
    els.screen.classList.toggle('visible', open);
    sync();
  }

  function toggle() {
    setOpen(!open);
    return open;
  }

  return { build, sync, toggle, setOpen, get isOpen() { return open; },
    setField(key, text) { if (els[key]) els[key].textContent = text; },
    setMessage(text) { if (els.message) els.message.textContent = text; } };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { makeUI };
}
