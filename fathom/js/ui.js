'use strict';
// The interface: hearts and stars, the hotbar, and the inventory screen with its equipment
// slots. Built from DOM rather than drawn on the canvas, so slots stay crisp at any zoom and
// the browser handles hit-testing. Item icons are drawn from the same baked atlas the world
// uses, so a slot shows the block it will place.

const CHEST_SLOTS = 20;

function makeUI(root, deps) {
  const { tiles, texture, inventory, atlas, mining, craft } = deps;
  let craftRows = [];
  let craftSignature = null;
  let onCraft = null;
  let chest = null;
  let onChestMove = null;
  let shop = null;
  let onBuy = null;
  let onHeal = null;
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
    // A multi-tile object is shown by its top cell, which is the recognisable one.
    const multi = tiles.MULTI && tiles.MULTI[item.key];
    const spec = multi ? multi.cells[0] : tiles.BY_KEY[item.key];
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
    if (craft && craft.ARMOUR[item.key]) {
      // Armour: a silhouette per slot, so four brown pieces are not four brown squares.
      const u = size / 16;
      const piece = craft.ARMOUR[item.key];
      ctx.fillStyle = piece.colour;
      if (piece.slot === 'head') {
        ctx.fillRect(3 * u, 3 * u, 10 * u, 7 * u);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(5 * u, 6 * u, 6 * u, 2 * u);
      } else if (piece.slot === 'chest') {
        ctx.fillRect(3 * u, 3 * u, 10 * u, 9 * u);
        ctx.fillRect(1 * u, 4 * u, 2 * u, 5 * u);
        ctx.fillRect(13 * u, 4 * u, 2 * u, 5 * u);
      } else if (piece.slot === 'legs') {
        ctx.fillRect(3 * u, 2 * u, 10 * u, 5 * u);
        ctx.fillRect(3 * u, 7 * u, 4 * u, 7 * u);
        ctx.fillRect(9 * u, 7 * u, 4 * u, 7 * u);
      } else {
        ctx.fillRect(2 * u, 8 * u, 5 * u, 6 * u);
        ctx.fillRect(9 * u, 8 * u, 5 * u, 6 * u);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(2 * u, 12 * u, 12 * u, 2 * u);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(3 * u, 3 * u, 10 * u, 1 * u);
      return canvas;
    }
    if (craft && item.key === 'coin') {
      const u = size / 16;
      ctx.fillStyle = '#b8912c';
      ctx.beginPath();
      ctx.arc(8 * u, 8 * u, 5.6 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8c650';
      ctx.beginPath();
      ctx.arc(8 * u, 8 * u, 4.4 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.arc(6.4 * u, 6.4 * u, 1.5 * u, 0, Math.PI * 2);
      ctx.fill();
      return canvas;
    }
    if (craft && item.key === 'arrow') {
      const u = size / 16;
      ctx.strokeStyle = '#b9a271';
      ctx.lineWidth = Math.max(1, u);
      ctx.beginPath();
      ctx.moveTo(3 * u, 13 * u);
      ctx.lineTo(12 * u, 4 * u);
      ctx.stroke();
      ctx.fillStyle = '#d8d2c2';
      ctx.fillRect(11 * u, 3 * u, 3 * u, 3 * u);
      ctx.fillStyle = '#8a7a52';
      ctx.fillRect(2 * u, 12 * u, 3 * u, 3 * u);
      return canvas;
    }
    if (craft && craft.WEAPONS[item.key] && craft.WEAPONS[item.key].ranged) {
      const u = size / 16;
      ctx.strokeStyle = '#8a6038';
      ctx.lineWidth = Math.max(1.5, u * 1.4);
      ctx.beginPath();
      ctx.arc(5 * u, 8 * u, 6 * u, -Math.PI / 2.2, Math.PI / 2.2);
      ctx.stroke();
      ctx.strokeStyle = '#ded6c2';
      ctx.lineWidth = Math.max(1, u * 0.7);
      ctx.beginPath();
      ctx.moveTo(6 * u, 2.6 * u);
      ctx.lineTo(6 * u, 13.4 * u);
      ctx.stroke();
      return canvas;
    }
    if (craft && craft.WEAPONS[item.key] && craft.WEAPONS[item.key].magic) {
      // A staff: a shaft with the gem it is made of on the end, in that gem's colour.
      const u = size / 16;
      const w = craft.WEAPONS[item.key];
      ctx.strokeStyle = '#7a5a36';
      ctx.lineWidth = 1.6 * u;
      ctx.beginPath();
      ctx.moveTo(4 * u, 14 * u);
      ctx.lineTo(10 * u, 5 * u);
      ctx.stroke();
      ctx.fillStyle = w.bolt || '#9b59d0';
      ctx.beginPath();
      ctx.arc(11 * u, 4 * u, 3.1 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(10 * u, 3 * u, 1.1 * u, 0, Math.PI * 2);
      ctx.fill();
      return canvas;
    }
    if (craft && craft.WEAPONS[item.key]) {
      // A sword: blade, crossguard, grip. Tier shows in the blade colour.
      const u = size / 16;
      const tier = Math.max(0, Object.keys(craft.WEAPONS)
        .filter(k => !craft.WEAPONS[k].ranged).indexOf(item.key));
      const blades = ['#8a6a42', '#b5733c', '#8f8f97', '#c9ccd6', '#e0c054', '#3f7fb5', '#d4663a'];
      ctx.fillStyle = blades[tier] || '#aab';
      ctx.beginPath();
      ctx.moveTo(12 * u, 2 * u);
      ctx.lineTo(14 * u, 4 * u);
      ctx.lineTo(6 * u, 12 * u);
      ctx.lineTo(4 * u, 10 * u);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(11 * u, 3 * u, 2 * u, 1 * u);
      ctx.fillStyle = '#6b4a2c';
      ctx.fillRect(3 * u, 11 * u, 4 * u, 2 * u);
      ctx.fillStyle = '#9a8248';
      ctx.fillRect(2 * u, 9 * u, 5 * u, 1.6 * u);
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
    // Accessories. Twenty-five of them, and every one was the same grey square: a
    // pendant on a chain, tinted, is enough to tell them apart at a glance.
    const acc = craft && craft.ACCESSORIES[item.key];
    if (acc) {
      const u = size / 16;
      ctx.strokeStyle = '#c9b06a';
      ctx.lineWidth = 1.4 * u;
      ctx.beginPath();
      ctx.arc(8 * u, 7 * u, 4.2 * u, Math.PI * 0.86, Math.PI * 0.14);
      ctx.stroke();
      ctx.fillStyle = acc.colour;
      ctx.beginPath();
      ctx.moveTo(8 * u, 8 * u);
      ctx.lineTo(11.5 * u, 11 * u);
      ctx.lineTo(8 * u, 14.5 * u);
      ctx.lineTo(4.5 * u, 11 * u);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.moveTo(8 * u, 8 * u);
      ctx.lineTo(8 * u, 11 * u);
      ctx.lineTo(4.5 * u, 11 * u);
      ctx.closePath();
      ctx.fill();
      return canvas;
    }
    // A hook: a shaft with two barbs and a length of chain.
    const hooked = craft && craft.grappleOf(item);
    if (hooked) {
      const u = size / 16;
      ctx.strokeStyle = '#7d848f';
      ctx.lineWidth = 1.2 * u;
      ctx.beginPath();
      ctx.moveTo(3 * u, 14 * u);
      ctx.lineTo(8 * u, 8 * u);
      ctx.stroke();
      ctx.fillStyle = '#cfd6e0';
      ctx.beginPath();
      ctx.moveTo(8 * u, 9 * u);
      ctx.lineTo(13 * u, 3 * u);
      ctx.lineTo(11 * u, 8 * u);
      ctx.lineTo(13 * u, 10 * u);
      ctx.lineTo(7 * u, 11 * u);
      ctx.closePath();
      ctx.fill();
      return canvas;
    }
    const itemSpec = craft && craft.ITEMS[item.key];
    // Something used rather than worn: a flask, so a crystal and a salve do not look
    // like bars of metal.
    if (itemSpec && itemSpec.use) {
      const u = size / 16;
      ctx.fillStyle = '#bcc6d4';
      ctx.fillRect(6.5 * u, 2 * u, 3 * u, 3 * u);
      ctx.fillStyle = itemSpec.colour;
      ctx.beginPath();
      ctx.moveTo(6 * u, 5 * u);
      ctx.lineTo(10 * u, 5 * u);
      ctx.lineTo(13 * u, 12 * u);
      ctx.lineTo(11 * u, 14.5 * u);
      ctx.lineTo(5 * u, 14.5 * u);
      ctx.lineTo(3 * u, 12 * u);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(5 * u, 7 * u, 1.5 * u, 5 * u);
      return canvas;
    }
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
    watchSlot(node, () => inventory.slots[index]);
    return node;
  }

  function build() {
    els.stats = el('div', 'stats', root);
    els.hearts = el('div', 'meter hearts', els.stats);
    els.stars = el('div', 'meter stars', els.stats);
    // Breath appears only while it is running out, so the HUD stays quiet on land.
    els.breath = el('div', 'meter breath', els.stats);

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

    // The chest panel: present only while a chest is open, which is why it is built
    // once and hidden rather than created and destroyed on every use.
    els.chestPanel = el('div', 'panel chest-panel', els.screen);
    el('h2', null, els.chestPanel).textContent = 'Chest';
    els.chestGrid = el('div', 'grid chest-grid', els.chestPanel);
    els.chestSlots = [];
    for (let i = 0; i < CHEST_SLOTS; i += 1) {
      const node = el('div', 'slot', els.chestGrid);
      node.dataset.chest = String(i);
      node.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (onChestMove) onChestMove(i, ev.shiftKey);
      });
      watchSlot(node, () => (chest && chest[i]) || null);
      els.chestSlots.push(node);
    }
    el('p', 'hint', els.chestPanel).textContent = 'Click to take \u2014 shift-click to stow';

    // The shop, shown while talking to a villager.
    els.shopPanel = el('div', 'panel shop-panel', els.screen);
    els.shopName = el('h2', null, els.shopPanel);
    els.shopPurse = el('p', 'stations', els.shopPanel);
    els.shopList = el('div', 'craft-list', els.shopPanel);
    els.shopNote = el('p', 'craft-empty', els.shopPanel);

    const craftPanel = el('div', 'panel craft-panel', els.screen);
    el('h2', null, craftPanel).textContent = 'Crafting';
    els.craftStations = el('p', 'stations', craftPanel);
    els.craftList = el('div', 'craft-list', craftPanel);
    els.craftEmpty = el('p', 'craft-empty', craftPanel);

    els.gearNote = el('p', 'gear-note', els.screen.querySelector('.equip-panel'));

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

  // The tooltip. A floating panel rather than the browser's `title`, which waits a
  // second, cannot be styled and shows only one line - and by now most of what an item
  // does is in the lines underneath the name.
  function ensureTip() {
    if (els.tip) return els.tip;
    els.tip = el('div', 'tip', root);
    els.tipName = el('strong', 'tip-name', els.tip);
    els.tipBody = el('span', 'tip-body', els.tip);
    els.tip.style.display = 'none';
    return els.tip;
  }

  function showTip(item, x, y) {
    if (!item || !craft) { hideTip(); return; }
    const tip = ensureTip();
    const said = craft.describe(item.key, tiles);
    els.tipName.textContent = said.name;
    els.tipBody.textContent = said.lines.join('\n');
    tip.style.display = 'block';
    // Kept inside the window: a tooltip that runs off the right edge is worse than none.
    const w = tip.offsetWidth || 180;
    const h = tip.offsetHeight || 60;
    tip.style.left = Math.min(x + 14, window.innerWidth - w - 8) + 'px';
    tip.style.top = Math.max(6, Math.min(y + 16, window.innerHeight - h - 8)) + 'px';
  }

  function hideTip() {
    if (els.tip) els.tip.style.display = 'none';
  }

  // Every slot in the game reports what it is holding, wherever it lives.
  function watchSlot(node, pick) {
    node.addEventListener('mousemove', (ev) => showTip(pick(), ev.clientX, ev.clientY));
    node.addEventListener('mouseleave', hideTip);
  }

  function paintSlot(node, index) {
    const item = inventory.slots[index];
    const icon = node.querySelector('.icon');
    const count = node.querySelector('.count');
    if (node.dataset.key !== (item ? item.key : '')) {
      icon.textContent = '';
      if (item) icon.appendChild(iconFor(item, 30));
      node.dataset.key = item ? item.key : '';
      node.title = '';
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

  // What the worn equipment is doing, in words. Armour that silently changes a number is
  // armour the player cannot reason about.
  function paintGear(state) {
    if (!els.gearNote || !craft) return;
    const gear = state && state.gear;
    if (!gear) { els.gearNote.textContent = ''; return; }
    const lines = [];
    lines.push('Defence ' + gear.defense);
    if (gear.bonus) lines.push('Set: ' + gear.bonus.name + ' \u2014 ' + gear.bonus.text);
    if (gear.speed !== 1) lines.push('Speed ' + Math.round(gear.speed * 100) + '%');
    if (gear.power !== 1) lines.push('Mining ' + Math.round(gear.power * 100) + '%');
    if (gear.doubleJump) lines.push('Double jump');
    if (gear.fireproof) lines.push('Fireproof');
    if (gear.breathMul !== 1) {
      lines.push(gear.breathMul === Infinity ? 'Breathes water'
        : 'Breath x' + gear.breathMul);
    }
    if (gear.fallMul !== 1) lines.push('Falls x' + gear.fallMul);
    if (gear.glow) lines.push('Glowing');
    // The three damage classes and the two numbers that decide whether magic is worth
    // using. Four armour sets and a dozen accessories exist only to change these, and
    // none of them showed up here at all.
    if (gear.melee !== 1) lines.push('Melee ' + Math.round(gear.melee * 100) + '%');
    if (gear.ranged !== 1) lines.push('Ranged ' + Math.round(gear.ranged * 100) + '%');
    if (gear.magic !== 1) lines.push('Magic ' + Math.round(gear.magic * 100) + '%');
    if (gear.manaCost !== 1) lines.push('Mana cost ' + Math.round(gear.manaCost * 100) + '%');
    if (gear.manaRegen !== 1) lines.push('Mana returns ' + Math.round(gear.manaRegen * 100) + '%');
    if (gear.arrowSpeed !== 1) lines.push('Arrows ' + Math.round(gear.arrowSpeed * 100) + '%');
    if (gear.swing !== 1) lines.push('Swing ' + Math.round(gear.swing * 100) + '%');
    if (gear.pickup !== 1) lines.push('Reach for drops ' + Math.round(gear.pickup * 100) + '%');
    if (gear.slimeFriend) lines.push('Slimes ignore you');
    els.gearNote.textContent = lines.join('  \u00b7  ');
  }

  function paintShop() {
    if (!els.shopPanel) return;
    els.shopPanel.classList.toggle('visible', !!shop);
    if (!shop) return;
    els.shopName.textContent = shop.who.spec.name.replace(/^the /, '');
    els.shopPurse.textContent = shop.coins.toLocaleString() + ' coin';
    els.shopList.textContent = '';
    shop.who.spec.stock.forEach((entry, i) => {
      const row = el('button', 'craft-row', els.shopList);
      row.appendChild(iconFor({ key: entry.key, kind: craft.kindOf(entry.key) }, 30));
      const text = el('span', 'craft-text', row);
      el('span', 'craft-name', text).textContent = craft.nameOf(entry.key, tiles)
        + (entry.count > 1 ? ' \u00d7' + entry.count : '');
      const cost = el('span', 'craft-cost', text);
      cost.textContent = entry.price.toLocaleString() + ' coin';
      if (shop.coins < entry.price) row.classList.add('unaffordable');
      row.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (onBuy) onBuy(i);
      });
    });
    if (shop.who.spec.heals) {
      const row = el('button', 'craft-row', els.shopList);
      const text = el('span', 'craft-text', row);
      el('span', 'craft-name', text).textContent = 'Heal me';
      el('span', 'craft-cost', text).textContent =
        shop.who.spec.healPrice.toLocaleString() + ' coin';
      row.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (onHeal) onHeal();
      });
    }
    els.shopNote.textContent = shop.who.spec.stock.length || shop.who.spec.heals
      ? '' : 'Nothing for sale.';
  }

  function paintChest() {
    if (!els.chestPanel) return;
    els.chestPanel.classList.toggle('visible', !!chest);
    if (!chest) return;
    for (let i = 0; i < els.chestSlots.length; i += 1) {
      const node = els.chestSlots[i];
      const item = chest.items[i];
      node.textContent = '';
      node.classList.toggle('filled', !!item);
      if (!item) continue;
      node.appendChild(iconFor(item, 30));
      if (item.count > 1) {
        const n = el('span', 'count', node);
        n.textContent = String(item.count);
      }
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
      paintCrafting(state);
      paintChest();
      paintGear(state);
      paintShop();
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
    const air = stats.breath === undefined ? 1 : stats.breath;
    els.breath.classList.toggle('visible', air < 0.999);
    meter(els.breath, air * 6, 6, 'bubble');
    for (let i = 0; i < els.hotbarSlots.length; i += 1) {
      els.hotbarSlots[i].classList.toggle('active', i === player.selected);
    }
  }

  function setOpen(value) {
    hideTip();
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
    set onCraft(fn) { onCraft = fn; },
    set onChestMove(fn) { onChestMove = fn; },
    set onBuy(fn) { onBuy = fn; },
    set onHeal(fn) { onHeal = fn; },
    openShop(who, purse) { shop = { who, coins: purse.coins }; },
    closeShop() { shop = null; },
    openChest(box) { chest = box; craftSignature = null; },
    closeChest() { chest = null; },
    get chest() { return chest; },
    CHEST_SLOTS };
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
