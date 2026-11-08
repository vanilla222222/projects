'use strict';
// Title, character select and world select. Resolves with the chosen pair, which is all the
// game needs to start: a character carries its own things, a world carries its seed and its
// edits. Fathom asks for no world size and no evil-biome choice — the world is endless, so
// size is meaningless and both evils can exist out along the axis.

function makeMenu(root, deps) {
  const { profiles, palette, sprite, worldgen } = deps;
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
      const worldCard = card(list, entry.name, 'seed ' + entry.seed + ' · ' + played(entry.playedSeconds),
        () => finish(entry),
        () => {
          profiles.removeWorld(entry.id);
          showWorlds();
        });
      const settings = el('button', 'ghost world-settings-button', worldCard, 'Settings');
      settings.setAttribute('aria-label', 'Settings for ' + entry.name);
      settings.addEventListener('click', () => showWorldSettings(entry));
    }
    const row = el('div', 'button-row', body);
    const back = el('button', 'ghost', row, 'Back');
    back.addEventListener('click', showCharacters);
    const create = el('button', 'primary', row, 'New world');
    create.addEventListener('click', showCreateWorld);
  }

  function worldSettingsFields(parent, saved, locked = false) {
    const current = worldgen.normalizeWorldSettings(saved);
    const controls = new Map();
    const presetRow = el('label', 'field', parent);
    el('span', null, presetRow, locked ? 'Gameplay preset' : 'World preset');
    const preset = el('select', null, presetRow);
    for (const [key, label] of [
      ['standard', 'Standard'], ['builder', 'Builder'], ['explorer', 'Explorer'],
      ['survival', 'Survival'], ['custom', 'Custom']
    ]) {
      const option = el('option', null, preset, label);
      option.value = key;
      if (key === 'custom') option.disabled = true;
    }
    preset.value = saved ? 'custom' : 'standard';
    for (const [title, generation] of [['World generation', true], ['Gameplay', false]]) {
      const group = el('fieldset', 'world-setting-group', parent);
      el('legend', null, group, title);
      if (generation && locked) el('p', 'hint', group, 'Generation settings are fixed when the world is created.');
      const fields = el('div', 'world-setting-grid', group);
      for (const field of worldgen.WORLD_SETTINGS.filter(field => Boolean(field.generation) === generation)) {
        const row = el('label', 'field', fields);
        el('span', null, row, field.label);
        const select = el('select', null, row);
        for (const [value, label] of field.options) {
          const option = el('option', null, select, label);
          option.value = value;
        }
        select.value = current[field.key];
        select.disabled = generation && locked;
        const help = el('small', 'world-setting-help', row, field.help);
        help.id = 'setting-help-' + field.key;
        select.setAttribute('aria-describedby', help.id);
        select.addEventListener('change', () => { preset.value = 'custom'; });
        controls.set(field.key, select);
      }
    }
    preset.addEventListener('change', () => {
      const values = worldgen.normalizeWorldSettings(worldgen.WORLD_PRESETS[preset.value]);
      for (const [key, select] of controls) if (!select.disabled) select.value = values[key];
    });
    return () => Object.fromEntries(Array.from(controls, ([key, select]) => [key, select.value]));
  }

  function showWorldSettings(entry) {
    const body = shell(entry.name + ' settings', 'Gameplay changes take effect the next time you enter this world.');
    const form = el('div', 'form', body);
    const readSettings = worldSettingsFields(form, profiles.loadWorld(entry.id)?.settings || entry.settings || {}, true);
    const row = el('div', 'button-row', body);
    const back = el('button', 'ghost', row, 'Back');
    back.addEventListener('click', showWorlds);
    const save = el('button', 'primary', row, 'Save settings');
    save.addEventListener('click', () => {
      if (profiles.saveWorld(entry.id, { settings: readSettings() })) showWorlds();
      else save.textContent = 'Save failed. Retry';
    });
  }

  function showCreateWorld() {
    const body = shell('New world', 'Choose a preset or tune the generation and gameplay settings.');
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
    const resolved = el('p', 'hint', form, 'The same seed and generation settings recreate the same terrain.');
    seed.addEventListener('input', () => {
      resolved.textContent = seed.value.trim() === ''
        ? 'The same seed and generation settings recreate the same terrain.'
        : 'Resolves to ' + deps.parseSeed(seed.value);
    });

    const readSettings = worldSettingsFields(form);
    const row = el('div', 'button-row', body);
    const back = el('button', 'ghost', row, 'Back');
    back.addEventListener('click', showWorlds);
    const make = el('button', 'primary', row, 'Create');
    make.addEventListener('click', () => {
      finish(profiles.createWorld({ name: name.value, seed: seed.value, settings: readSettings() }));
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
