'use strict';
// Title, character select and world select. Resolves with the chosen pair, which is all the
// game needs to start: a character carries its own things, a world carries its seed and its
// edits. Fathom asks for no world size and no evil-biome choice — the world is endless, so
// size is meaningless and both evils can exist out along the axis.

function makeMenu(root, deps) {
  const { profiles, palette, sprite } = deps;
  let resolve = null;
  let chosenCharacter = null;
  let pendingColours = null;

  function el(tag, cls, parent, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    if (parent) parent.appendChild(node);
    return node;
  }

  function ago(ts) {
    if (!ts) return 'never played';
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h ago';
    return Math.floor(hours / 24) + 'd ago';
  }

  function played(seconds) {
    const s = Math.floor(seconds || 0);
    if (s < 60) return s + 's played';
    const m = Math.floor(s / 60);
    if (m < 60) return m + 'm played';
    return Math.floor(m / 60) + 'h ' + (m % 60) + 'm played';
  }

  function avatar(colours, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    sprite.drawPerson(ctx, { x: size * 0.08, y: size * 0.11, w: size * 0.84, h: size * 0.81 },
      colours, { time: 0 });
    return canvas;
  }

  function swatchRow(parent, label, colours, key) {
    const row = el('div', 'swatches', parent);
    el('span', 'swatch-label', row, label);
    const wrap = el('div', 'swatch-wrap', row);
    for (const colour of colours) {
      const dot = el('button', 'swatch', wrap);
      dot.style.background = colour;
      dot.classList.toggle('on', pendingColours[key] === colour);
      dot.addEventListener('click', () => {
        pendingColours[key] = colour;
        for (const other of wrap.children) other.classList.remove('on');
        dot.classList.add('on');
        refreshPreview();
      });
    }
  }

  function appearanceRow(parent, label, key, options) {
    const row = el('label', 'field', parent);
    el('span', null, row, label);
    const select = el('select', 'appearance-select', row);
    for (const value of options) {
      const option = el('option', null, select, value[0].toUpperCase() + value.slice(1));
      option.value = value;
    }
    select.value = pendingColours[key] || options[0];
    select.addEventListener('change', () => {
      pendingColours[key] = select.value;
      refreshPreview();
    });
  }

  let previewHost = null;
  function refreshPreview() {
    if (!previewHost) return;
    previewHost.textContent = '';
    previewHost.appendChild(avatar(pendingColours, 96));
  }

  function card(parent, title, subtitle, onPick, onDelete, icon) {
    const node = el('div', 'card', parent);
    const pick = el('button', 'card-pick', node);
    if (icon) pick.appendChild(icon);
    const text = el('div', 'card-text', pick);
    el('strong', null, text, title);
    el('span', 'card-sub', text, subtitle);
    pick.addEventListener('click', onPick);
    if (onDelete) {
      const del = el('button', 'card-delete', node, '×');
      del.title = 'Delete';
      del.addEventListener('click', (ev) => {
        ev.stopPropagation();
        onDelete();
      });
    }
    return node;
  }

  function clear() {
    root.textContent = '';
  }

  function shell(title, subtitle) {
    clear();
    const wrap = el('div', 'menu-wrap', root);
    const head = el('header', 'menu-head', wrap);
    el('h1', null, head, 'Fathom');
    el('p', 'tagline', head, subtitle);
    const body = el('div', 'menu-body', wrap);
    el('h2', null, body, title);
    return body;
  }

  function showCharacters() {
    const body = shell('Choose a character', 'Dig into an endless world.');
    const list = el('div', 'card-list', body);
    const characters = profiles.listCharacters();
    if (!characters.length) el('p', 'empty', list, 'No characters yet.');
    for (const entry of characters.slice().sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))) {
      card(list, entry.name, played(entry.playedSeconds) + ' · ' + ago(entry.lastPlayed),
        () => {
          chosenCharacter = entry;
          showWorlds();
        },
        () => {
          profiles.removeCharacter(entry.id);
          showCharacters();
        },
        avatar(entry.colours, 44));
    }
    const create = el('button', 'primary', body, 'New character');
    create.addEventListener('click', () => showCreateCharacter());
  }

  function showCreateCharacter(existing) {
    pendingColours = existing ? { ...existing.colours } : profiles.pickColours(String(Date.now()));
    const body = shell(existing ? 'Customize character' : 'New character',
      'They keep what they carry, in any world.');
    const form = el('div', 'form', body);
    const nameRow = el('label', 'field', form);
    el('span', null, nameRow, 'Name');
    const name = el('input', null, nameRow);
    name.maxLength = 24;
    name.placeholder = 'Delver';
    if (existing) { name.value = existing.name; name.disabled = true; }

    const preview = el('div', 'preview', form);
    previewHost = el('div', 'preview-art', preview);
    const picks = el('div', 'preview-picks', preview);
    swatchRow(picks, 'Skin', palette.SKIN_TONES, 'skin');
    swatchRow(picks, 'Hair', palette.HAIR_COLOURS, 'hair');
    swatchRow(picks, 'Shirt', palette.SHIRT_COLOURS, 'shirt');
    swatchRow(picks, 'Trousers', palette.PANTS_COLOURS, 'pants');
    swatchRow(picks, 'Eyes', ['#241e2a', '#527869', '#516e9c', '#ba7447', '#8d588a'], 'eyes');
    appearanceRow(picks, 'Hairstyle', 'hairstyle', ['swept', 'braid', 'crest', 'curls', 'shaved']);
    appearanceRow(picks, 'Face detail', 'marking', ['none', 'freckles', 'paint', 'scar']);
    refreshPreview();

    const row = el('div', 'button-row', body);
    const back = el('button', 'ghost', row, 'Back');
    back.addEventListener('click', existing ? showWorlds : showCharacters);
    const make = el('button', 'primary', row, existing ? 'Save appearance' : 'Create');
    make.addEventListener('click', () => {
      if (existing) {
        if (!profiles.saveCharacter(existing.id, { colours: pendingColours })) {
          make.textContent = 'Save failed. Retry';
          return;
        }
        chosenCharacter = { ...existing, colours: pendingColours };
      } else {
        chosenCharacter = profiles.createCharacter({ name: name.value, colours: pendingColours });
      }
      showWorlds();
    });
    name.focus();
  }

  function showWorlds() {
    const body = shell('Choose a world', 'Playing as ' + chosenCharacter.name + '.');
    const customize = el('button', 'ghost', body, 'Customize appearance');
    customize.addEventListener('click', () => showCreateCharacter(chosenCharacter));
    const list = el('div', 'card-list', body);
    const worlds = profiles.listWorlds();
    if (!worlds.length) el('p', 'empty', list, 'No worlds yet.');
    for (const entry of worlds.slice().sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))) {
      card(list, entry.name, 'seed ' + entry.seed + ' · ' + played(entry.playedSeconds),
        () => finish(entry),
        () => {
          profiles.removeWorld(entry.id);
          showWorlds();
        });
    }
    const row = el('div', 'button-row', body);
    const back = el('button', 'ghost', row, 'Back');
    back.addEventListener('click', showCharacters);
    const create = el('button', 'primary', row, 'New world');
    create.addEventListener('click', showCreateWorld);
  }

  function showCreateWorld() {
    const body = shell('New world', 'Endless either way, so there is no size to pick.');
    const form = el('div', 'form', body);
    const nameRow = el('label', 'field', form);
    el('span', null, nameRow, 'Name');
    const name = el('input', null, nameRow);
    name.maxLength = 24;
    name.placeholder = 'Fathom';

    const seedRow = el('label', 'field', form);
    el('span', null, seedRow, 'Seed');
    const seed = el('input', null, seedRow);
    seed.placeholder = 'leave blank for a random world';
    const resolved = el('p', 'hint', form, 'Words or a number. The same seed always makes the same world.');
    seed.addEventListener('input', () => {
      resolved.textContent = seed.value.trim() === ''
        ? 'Words or a number. The same seed always makes the same world.'
        : 'Resolves to ' + deps.parseSeed(seed.value);
    });

    const row = el('div', 'button-row', body);
    const back = el('button', 'ghost', row, 'Back');
    back.addEventListener('click', showWorlds);
    const make = el('button', 'primary', row, 'Create');
    make.addEventListener('click', () => {
      finish(profiles.createWorld({ name: name.value, seed: seed.value }));
    });
    name.focus();
  }

  function finish(world) {
    profiles.rememberLast(chosenCharacter.id, world.id);
    root.classList.remove('visible');
    clear();
    if (resolve) resolve({ character: chosenCharacter, world });
  }

  function open() {
    root.classList.add('visible');
    showCharacters();
    return new Promise((done) => { resolve = done; });
  }

  return { open };
}

// The module's public surface, declared once. index.html used to repeat these
// names by hand, and three separate times a new export was added here and
// forgotten there, which broke the game at runtime while every test passed.
const EXPORTS_menu = { makeMenu };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_menu;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.menu = EXPORTS_menu;
}
