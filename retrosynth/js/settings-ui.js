'use strict';
// Controls, generated from the schema rather than written out.
//
// This is the payoff of declaring each setting once. Nothing below knows what
// any particular setting means: it reads the type and builds the right control,
// so a row added to SCHEMA appears here, in the typed box, in the URL and in
// the saved profile without anyone touching this file. chem lab hand-writes its
// settings panel, which is why its UI and its validator are separate places to
// keep in step.

function settingsUI(host, schemaModule, onChange) {
  const S = schemaModule;
  const PROFILE_KEY = 'retrosynth-profiles';
  let current = S.defaults();
  let silent = false;
  const controls = new Map();

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function announce() {
    if (silent) return;
    syncMirrors();
    if (onChange) onChange(current);
  }

  // Applying a whole settings object back into the controls, used by every
  // channel that is not the controls themselves.
  function apply(next, options) {
    current = next;
    silent = true;
    for (const [key, control] of controls) {
      const value = current[key];
      if (control.type === 'checkbox') control.checked = !!value;
      else if (Array.isArray(value)) control.value = value.join(', ');
      else control.value = value === null ? '' : String(value);
    }
    silent = false;
    syncMirrors();
    if (onChange && !(options && options.quiet)) onChange(current);
  }

  function readControl(entry, control) {
    if (entry.type === 'bool') return control.checked;
    return control.value;
  }

  function changed(entry, control) {
    const attempt = { ...current, [entry.key]: readControl(entry, control) };
    try {
      current = S.normalize(attempt);
      setError('');
      announce();
    } catch (err) {
      // Show the reason and leave the control where the person put it, so they
      // can see what they typed next to why it was refused.
      setError(err.message);
    }
  }

  function setError(message) {
    error.textContent = message;
    error.hidden = !message;
  }

  // --- the panel ----------------------------------------------------------
  const error = el('div', 'set-error');
  error.hidden = true;

  const groups = el('div', 'set-groups');
  for (const group of S.GROUPS) {
    const entries = S.SCHEMA.filter((e) => e.group === group);
    if (!entries.length) continue;
    const box = el('section', 'set-group');
    box.append(el('h3', null, group));
    for (const entry of entries) {
      const row = el('div', 'set-row');
      const label = el('label', 'set-label');
      label.textContent = entry.label;
      label.htmlFor = 'set-' + entry.key;

      let control;
      if (entry.type === 'bool') {
        control = document.createElement('input');
        control.type = 'checkbox';
      } else if (entry.type === 'enum') {
        control = document.createElement('select');
        for (const value of entry.values) {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = value;
          control.append(option);
        }
      } else if (entry.type === 'list') {
        control = document.createElement('input');
        control.type = 'text';
        control.placeholder = entry.of === 'family' ? 'coupling, reduction'
          : entry.of === 'element' ? 'Cr, Os' : 'comma separated';
      } else {
        control = document.createElement('input');
        control.type = 'number';
        if (entry.min !== undefined) control.min = entry.min;
        if (entry.max !== undefined) control.max = entry.max;
        if (entry.type === 'number') control.step = 'any';
        if (entry.def === null) control.placeholder = 'no limit';
      }
      control.id = 'set-' + entry.key;
      control.className = 'set-input';
      control.setAttribute('aria-label', entry.label);
      control.addEventListener('change', () => changed(entry, control));
      controls.set(entry.key, control);

      row.append(label, control);
      if (entry.help) {
        const help = el('p', 'set-help', entry.help);
        row.append(help);
      }
      box.append(row);
    }
    groups.append(box);
  }

  // --- the other four channels -------------------------------------------
  const command = document.createElement('input');
  command.type = 'text';
  command.className = 'set-mirror';
  command.setAttribute('aria-label', 'Typed settings');
  command.placeholder = 'depth:12 beam:60 noelement:Cr,Os !cryo scale:kilogram';
  command.addEventListener('change', () => {
    // A text input fires `change` again when focus leaves it, with whatever it
    // holds. Without this guard, typing here and then touching any other
    // control replayed this box over the top of that control's change and
    // silently undid it. Re-applying what we would have written anyway is a
    // no-op, so skip it.
    if (command.value.trim() === S.toCommand(current).trim()) return;
    try {
      apply(S.resolve([S.defaults(), command.value]));
      setError('');
    } catch (err) { setError(err.message); }
  });

  const link = document.createElement('input');
  link.type = 'text';
  link.className = 'set-mirror';
  link.readOnly = true;
  link.setAttribute('aria-label', 'Shareable link');

  const json = document.createElement('textarea');
  json.className = 'set-mirror set-json';
  json.rows = 5;
  json.setAttribute('aria-label', 'Settings as JSON');
  json.addEventListener('change', () => {
    // Same blur-replay guard as the typed box.
    try {
      if (JSON.stringify(JSON.parse(json.value)) === JSON.stringify(current)) return;
    } catch (err) { void err; }
    try {
      apply(S.normalize(JSON.parse(json.value)));
      setError('');
    } catch (err) { setError(err.message); }
  });

  function syncMirrors() {
    const text = S.toCommand(current);
    if (document.activeElement !== command) {
      command.value = text;
    }
    const query = S.toQuery(current);
    const base = typeof location !== 'undefined'
      ? location.origin + location.pathname : '';
    link.value = query ? base + '?' + query : base;
    if (document.activeElement !== json) {
      json.value = JSON.stringify(current, null, 1);
    }
  }

  // --- profiles -----------------------------------------------------------
  function storedProfiles() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}'); }
    catch (err) { void err; return {}; }
  }
  function writeProfiles(all) {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(all)); }
    catch (err) { void err; }
  }

  const profileName = document.createElement('input');
  profileName.type = 'text';
  profileName.className = 'set-mirror';
  profileName.placeholder = 'profile name';
  profileName.setAttribute('aria-label', 'Profile name');

  const profileList = document.createElement('select');
  profileList.className = 'set-input';
  profileList.setAttribute('aria-label', 'Saved profiles');

  function refreshProfiles() {
    const all = storedProfiles();
    profileList.replaceChildren();
    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = Object.keys(all).length ? 'load a profile…' : 'no saved profiles';
    profileList.append(blank);
    for (const name of Object.keys(all).sort()) {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      profileList.append(option);
    }
  }
  profileList.addEventListener('change', () => {
    const all = storedProfiles();
    if (!profileList.value || !all[profileList.value]) return;
    try { apply(S.normalize(all[profileList.value])); setError(''); }
    catch (err) { setError(err.message); }
  });

  function button(text, className, action) {
    const node = el('button', className || 'set-btn', text);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  }

  const saveBtn = button('Save profile', 'set-btn', () => {
    const name = profileName.value.trim();
    if (!name) { setError('Give the profile a name first.'); return; }
    const all = storedProfiles();
    all[name] = current;
    writeProfiles(all);
    refreshProfiles();
    profileList.value = name;
    setError('');
  });
  const deleteBtn = button('Delete', 'set-btn ghost', () => {
    const all = storedProfiles();
    if (!profileList.value || !all[profileList.value]) return;
    delete all[profileList.value];
    writeProfiles(all);
    refreshProfiles();
  });
  const resetBtn = button('Reset to defaults', 'set-btn ghost', () => {
    apply(S.defaults());
    setError('');
  });
  const copyBtn = button('Copy link', 'set-btn ghost', () => {
    link.select();
    try { document.execCommand('copy'); } catch (err) { void err; }
    copyBtn.textContent = 'Copied';
    setTimeout(() => { copyBtn.textContent = 'Copy link'; }, 1200);
  });

  function channel(title, note, ...nodes) {
    const box = el('section', 'set-channel');
    box.append(el('h3', null, title));
    if (note) box.append(el('p', 'set-help', note));
    box.append(...nodes);
    return box;
  }

  const row = (...nodes) => { const r = el('div', 'set-inline'); r.append(...nodes); return r; };

  host.append(
    error,
    channel('Type it', 'One line, same names as the URL. A bare word turns a switch on; !word turns it off.', command),
    channel('Share it', 'Every setting that differs from the default, encoded in the address.', row(link, copyBtn)),
    channel('Save it', 'Profiles are kept in this browser.', row(profileName, saveBtn, profileList, deleteBtn)),
    groups,
    channel('Or hand it JSON', 'The same object the engine takes when called directly.', json),
    row(resetBtn),
  );

  refreshProfiles();

  // A link that carries settings wins over the defaults on load.
  let initial = S.defaults();
  try {
    if (typeof location !== 'undefined' && location.search.length > 1) {
      initial = S.resolve([S.defaults(), S.fromQuery(location.search)]);
    }
  } catch (err) { setError(err.message); }
  apply(initial, { quiet: true });

  return {
    read() { return current; },
    set(next) { apply(S.normalize(next)); },
    element: host,
  };
}

const EXPORTS_settings_ui = { settingsUI };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_settings_ui;
} else if (typeof RETRO !== 'undefined') {
  RETRO.settingsUI = EXPORTS_settings_ui;
}
