'use strict';
// Settings, declared once and reachable every way.
//
// chem lab validates its 27 planning settings in one hand-written function.
// That works, and it is also why adding a setting there means editing the
// defaults, the normaliser, the bounds table, the UI and the tests separately -
// five places that drift. Every setting below is instead declared once, and the
// validator, the control that edits it, the one-line text syntax, the URL
// encoding and the help text are all generated from that declaration. Adding a
// setting means adding a row.
//
// Settings can be set five ways, and they compose in this order, each
// overriding the last:
//
//   defaults  <  saved profile  <  URL query  <  typed command  <  per-search
//
// so a shared link can carry a policy, the box can tweak one thing without
// disturbing it, and a single search can override anything without saving.

// Resolved the same way in both environments. Reaching for a global that only
// exists in the browser meant element names were validated on the page and
// waved through in Node, so the tests passed while the page threw - the exact
// shape of bug that makes a green suite worthless.
const ELEMENTS = (typeof require === 'function' && typeof module !== 'undefined')
  ? require('./elements.js')
  : (typeof RETRO !== 'undefined' ? RETRO.elements : null);

const GROUPS = ['Question', 'Search', 'Ranking', 'Chemistry', 'Conditions', 'Stock', 'Safety'];

// type: int | number | bool | enum | list | text
// alias: short names accepted by the typed syntax and the URL
const SCHEMA = [
  // --- Question -----------------------------------------------------------
  // What is being asked. Three different questions, not three settings of one:
  // each wants different inputs and a different stopping rule, so the mode
  // decides which of the fields below mean anything.
  { key: 'mode', group: 'Question', type: 'enum', def: 'route',
    values: ['route', 'path', 'analogues'],
    alias: ['m'], label: 'What to search for',
    help: 'route: work a target back to things you can buy. '
      + 'path: get from one named molecule to another. '
      + 'analogues: find close relatives of a target and how to make them.' },
  { key: 'target', group: 'Question', type: 'text', def: '',
    alias: ['y', 'to'], label: 'Target molecule',
    help: 'The molecule you want, as SMILES. Needed by every mode.' },
  { key: 'start', group: 'Question', type: 'text', def: '',
    alias: ['x', 'from'], label: 'Starting material',
    showIf: (s) => s.mode === 'path',
    // What else has to be true for a value here to survive. Declared rather
    // than left for a test to know, so a setting with a companion still gets
    // exercised generically instead of being skipped.
    needs: { mode: 'path' },
    help: 'The molecule you are starting from. The route must actually use it, '
      + 'rather than buying its way around it.' },
  { key: 'analogueCount', group: 'Question', type: 'int', min: 1, max: 200, def: 20,
    alias: ['an'], label: 'How many analogues',
    showIf: (s) => s.mode === 'analogues',
    help: 'How many relatives of the target to propose.' },
  { key: 'analogueSimilarity', group: 'Question', type: 'number', min: 0.1, max: 1, def: 0.6,
    alias: ['sim'], label: 'Minimum similarity',
    showIf: (s) => s.mode === 'analogues',
    help: 'How close a relative has to stay, 0.1 distant to 1.0 identical.' },
  { key: 'analogueVary', group: 'Question', type: 'enum', def: 'substituents',
    values: ['substituents', 'rings', 'scaffold', 'any'],
    alias: ['vary'], label: 'What may change',
    showIf: (s) => s.mode === 'analogues',
    help: 'substituents keeps the skeleton and swaps what hangs off it; '
      + 'scaffold allows the core itself to change.' },
  { key: 'analogueRoutable', group: 'Question', type: 'bool', def: true,
    alias: ['routable'], label: 'Only ones you could make',
    showIf: (s) => s.mode === 'analogues',
    help: 'Discard an analogue unless the engine can also find a route to it.' },

  // --- Search -------------------------------------------------------------
  { key: 'maxDepth', group: 'Search', type: 'int', min: 1, max: 20, def: 8,
    alias: ['depth', 'd'], label: 'Maximum steps',
    help: 'How many reactions deep to search. chem lab stops at 3; real routes run 8 to 15.' },
  { key: 'maxRoutes', group: 'Search', type: 'int', min: 1, max: 50, def: 5,
    alias: ['routes', 'n'], label: 'Routes to return',
    help: 'Stop once this many complete routes have been found.' },
  { key: 'budgetMs', group: 'Search', type: 'int', min: 100, max: 600000, def: 15000,
    alias: ['budget', 'time'], label: 'Time budget (ms)',
    help: 'Wall-clock limit for one search.' },
  { key: 'beamWidth', group: 'Search', type: 'int', min: 1, max: 500, def: 40,
    alias: ['beam', 'w'], label: 'Beam width',
    help: 'How many candidate disconnections to keep per molecule. Wider finds more and costs more.' },
  { key: 'strategy', group: 'Search', type: 'enum', def: 'best-first',
    values: ['best-first', 'breadth', 'depth', 'iterative'],
    alias: ['search'], label: 'Search strategy',
    help: 'best-first follows the cost model; iterative deepens a step at a time and returns something early.' },

  // --- Ranking ------------------------------------------------------------
  // Weights rather than one "priority" enum, so two concerns can be traded off
  // instead of one winning outright. They are normalised before use, so only
  // their ratios matter.
  { key: 'weightSteps', group: 'Ranking', type: 'number', min: 0, max: 10, def: 1,
    alias: ['wsteps'], label: 'Weight: fewer steps',
    help: 'How much a short route is preferred.' },
  { key: 'weightCost', group: 'Ranking', type: 'number', min: 0, max: 10, def: 1,
    alias: ['wcost'], label: 'Weight: precursor size',
    help: 'Penalises growth in precursor size. Market prices are unavailable.' },
  { key: 'weightPrecedent', group: 'Ranking', type: 'number', min: 0, max: 10, def: 1,
    alias: ['wprec'], label: 'Weight: forward-model support',
    help: 'Penalises unchecked or ambiguous steps. This does not use published precedent counts.' },
  { key: 'weightConvergence', group: 'Ranking', type: 'number', min: 0, max: 10, def: 0.5,
    alias: ['wconv'], label: 'Weight: convergent',
    help: 'Prefer routes that join two prepared halves over one long linear sequence.' },
  { key: 'weightProtection', group: 'Ranking', type: 'number', min: 0, max: 10, def: 1,
    alias: ['wprot'], label: 'Weight: avoid protection',
    help: 'How much a protect/deprotect pair counts against a route.' },

  // --- Chemistry ----------------------------------------------------------
  { key: 'families', group: 'Chemistry', type: 'list', of: 'family', def: [],
    alias: ['only'], label: 'Only these reaction families',
    help: 'Empty means all. Otherwise a list, e.g. coupling,reduction.' },
  { key: 'banFamilies', group: 'Chemistry', type: 'list', of: 'family', def: [],
    alias: ['nofamily'], label: 'Banned reaction families',
    help: 'Families the search may not use at all.' },
  { key: 'banTransforms', group: 'Chemistry', type: 'list', of: 'text', def: [],
    alias: ['norule'], label: 'Banned transforms',
    help: 'Individual transform ids to exclude.' },
  { key: 'banReagents', group: 'Chemistry', type: 'list', of: 'text', def: [],
    alias: ['noreagent'], label: 'Banned reagents',
    help: 'Reagents unavailable to you, by id.' },
  { key: 'banElements', group: 'Chemistry', type: 'list', of: 'element', def: [],
    alias: ['noelement'], label: 'Banned elements',
    help: 'Elements that may not appear in any reagent, e.g. Cr,Os,Hg.' },
  { key: 'verify', group: 'Chemistry', type: 'enum', def: 'warn',
    values: ['strict', 'warn', 'off'],
    alias: ['check'], label: 'Check steps forwards',
    help: 'Strict requires a forward rule that reproduces the target without modelled alternatives. Warn allows unchecked and ambiguous steps, and rejects model mismatches. Off skips checks.' },
  { key: 'stereo', group: 'Chemistry', type: 'enum', def: 'exact',
    values: ['exact', 'mixtures', 'ignore'],
    label: 'Stereochemistry',
    help: 'exact demands the right isomer; mixtures allows racemic steps; ignore drops stereo entirely.' },
  { key: 'protection', group: 'Chemistry', type: 'enum', def: 'auto',
    values: ['auto', 'manual', 'none'],
    alias: ['prot'], label: 'Protecting groups',
    help: 'auto inserts protect/deprotect pairs when a group would not survive.' },

  // --- Conditions ---------------------------------------------------------
  { key: 'minTemp', group: 'Conditions', type: 'number', min: -200, max: 400, def: null,
    alias: ['tmin'], label: 'Minimum temperature (°C)',
    help: 'Reject steps recorded below this.' },
  { key: 'maxTemp', group: 'Conditions', type: 'number', min: -200, max: 400, def: null,
    alias: ['tmax'], label: 'Maximum temperature (°C)',
    help: 'Reject steps recorded above this.' },
  { key: 'allowCryogenic', group: 'Conditions', type: 'bool', def: true,
    alias: ['cryo'], label: 'Allow cryogenic steps',
    help: 'Steps needing −78 °C or colder.' },
  { key: 'allowPressure', group: 'Conditions', type: 'bool', def: true,
    label: 'Allow pressurised steps', help: 'Steps above one atmosphere.' },
  { key: 'allowPhotochemistry', group: 'Conditions', type: 'bool', def: true,
    alias: ['photo'], label: 'Allow photochemistry', help: '' },
  { key: 'allowElectrochemistry', group: 'Conditions', type: 'bool', def: true,
    alias: ['electro'], label: 'Allow electrochemistry', help: '' },
  { key: 'allowAirSensitive', group: 'Conditions', type: 'bool', def: true,
    alias: ['airfree'], label: 'Allow air-sensitive steps',
    help: 'Steps needing a glovebox or Schlenk line.' },
  { key: 'banSolvents', group: 'Conditions', type: 'list', of: 'text', def: [],
    alias: ['nosolvent'], label: 'Banned solvents',
    help: 'e.g. benzene,dioxane,hmpa' },

  // --- Stock --------------------------------------------------------------
  { key: 'catalogue', group: 'Stock', type: 'enum', def: 'builtin',
    values: ['builtin', 'inventory', 'both'],
    alias: ['stock'], label: 'What counts as buyable',
    needs: { inventory: ['CCO'] },
    help: 'Inventory mode uses only the entered compounds. Built-in modes also accept a small-molecule heuristic.' },
  { key: 'inventory', group: 'Stock', type: 'list', of: 'text', def: [],
    alias: ['have'], label: 'Material you already have',
    help: 'SMILES, one per line. Always treated as free.' },
  { key: 'maxPricePerGram', group: 'Stock', type: 'number', min: 0, max: 100000, def: null,
    alias: ['maxprice'], label: 'Price ceiling (per gram)',
    help: 'Starting materials above this are not considered buyable.' },
  { key: 'scale', group: 'Stock', type: 'enum', def: 'gram',
    values: ['milligram', 'gram', 'kilogram'],
    label: 'Working scale',
    help: 'Changes what is reasonable: chromatography is fine at milligram scale and not at kilogram.' },

  // --- Safety -------------------------------------------------------------
  { key: 'banHazards', group: 'Safety', type: 'list', of: 'hazard', def: [],
    alias: ['nohazard'], label: 'Banned hazard classes',
    help: 'e.g. explosive,acutetoxic,carcinogen,pyrophoric.' },
  { key: 'maxChromatography', group: 'Safety', type: 'int', min: 0, max: 30, def: null,
    alias: ['maxchrom'], label: 'Most chromatography steps',
    help: 'Caps how many purifications by column a route may need.' },
];

// Preserve older profiles and shared links, but do not claim the engine enforces these.
const UNAPPLIED = new Set([
  'strategy', 'banElements', 'stereo', 'protection', 'allowCryogenic', 'allowPressure',
  'allowPhotochemistry', 'allowElectrochemistry', 'allowAirSensitive', 'maxPricePerGram',
  'scale', 'banHazards', 'maxChromatography',
]);

const BY_KEY = new Map(SCHEMA.map((entry) => [entry.key, entry]));
const BY_ALIAS = new Map();
for (const entry of SCHEMA) {
  BY_ALIAS.set(entry.key.toLowerCase(), entry);
  for (const alias of entry.alias || []) {
    BY_ALIAS.set(alias.toLowerCase(), entry);
  }
}

const FAMILIES = ['coupling', 'oxidation', 'reduction', 'substitution', 'addition',
  'elimination', 'rearrangement', 'protection', 'deprotection', 'acylation',
  'alkylation', 'cyclization', 'olefination', 'metathesis', 'halogenation'];

const HAZARDS = ['explosive', 'pyrophoric', 'acutetoxic', 'carcinogen', 'mutagen',
  'corrosive', 'peroxideformer', 'waterreactive'];

function defaults() {
  const out = {};
  for (const entry of SCHEMA) {
    out[entry.key] = Array.isArray(entry.def) ? entry.def.slice() : entry.def;
  }
  return out;
}

function fail(message) {
  throw new Error(message);
}

// One value, checked against its own declaration. Returns the cleaned value.
function coerce(entry, raw) {
  if (raw === null || raw === undefined || raw === '') {
    // A nullable setting (those whose default is null) accepts being cleared;
    // everything else falls back to its default rather than becoming empty.
    return entry.def === null ? null : (Array.isArray(entry.def) ? [] : entry.def);
  }
  if (entry.type === 'bool') {
    if (typeof raw === 'boolean') return raw;
    const text = String(raw).trim().toLowerCase();
    if (['true', 'yes', 'on', '1'].includes(text)) return true;
    if (['false', 'no', 'off', '0'].includes(text)) return false;
    return fail(entry.key + ' must be true or false, not "' + raw + '".');
  }
  if (entry.type === 'int' || entry.type === 'number') {
    const value = Number(raw);
    if (!Number.isFinite(value)) fail(entry.key + ' must be a number, not "' + raw + '".');
    if (entry.min !== undefined && value < entry.min) {
      fail(entry.key + ' must be at least ' + entry.min + ' (got ' + value + ').');
    }
    if (entry.max !== undefined && value > entry.max) {
      fail(entry.key + ' must be at most ' + entry.max + ' (got ' + value + ').');
    }
    return entry.type === 'int' ? Math.round(value) : value;
  }
  if (entry.type === 'enum') {
    const text = String(raw).trim().toLowerCase();
    if (!entry.values.includes(text)) {
      fail(entry.key + ' must be one of ' + entry.values.join(', ') + ' (got "' + raw + '").');
    }
    return text;
  }
  if (entry.type === 'list') {
    const items = Array.isArray(raw) ? raw : String(raw).split(/[\n,;]+/);
    const cleaned = [...new Set(items.map((item) => String(item).trim()).filter(Boolean))];
    if (cleaned.length > 200) fail(entry.key + ' accepts at most 200 entries.');
    if (entry.of === 'family') {
      for (const item of cleaned) {
        if (!FAMILIES.includes(item.toLowerCase())) {
          fail('Unknown reaction family "' + item + '". Known: ' + FAMILIES.join(', '));
        }
      }
      return cleaned.map((item) => item.toLowerCase());
    }
    if (entry.of === 'hazard') {
      for (const item of cleaned) {
        if (!HAZARDS.includes(item.toLowerCase())) {
          fail('Unknown hazard class "' + item + '". Known: ' + HAZARDS.join(', '));
        }
      }
      return cleaned.map((item) => item.toLowerCase());
    }
    if (entry.of === 'element') {
      return cleaned.map((item) => {
        const symbol = item.charAt(0).toUpperCase() + item.slice(1).toLowerCase();
        // Any real element, not only the ones the engine can bond. Banning
        // osmium or mercury from your reagents is exactly the point of this
        // setting, and neither is something you would draw into a structure.
        if (ELEMENTS && !ELEMENTS.isElementSymbol(symbol)) {
          fail('"' + item + '" is not an element symbol.');
        }
        return symbol;
      });
    }
    return cleaned;
  }
  return String(raw);
}

// A whole settings object. Unknown keys are an error rather than a shrug: a
// typo in a shared link should say so, not silently do something else.
function normalize(raw, options) {
  const lenient = !!(options && options.lenient);
  if (raw !== undefined && raw !== null && (typeof raw !== 'object' || Array.isArray(raw))) {
    fail('Settings must be an object.');
  }
  const input = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const out = defaults();
  const unknown = [];
  for (const [key, value] of Object.entries(input)) {
    const entry = BY_KEY.get(key) || BY_ALIAS.get(key.toLowerCase());
    if (!entry) {
      unknown.push(key);
      continue;
    }
    out[entry.key] = coerce(entry, value);
  }
  if (unknown.length && !lenient) {
    fail('Unknown setting' + (unknown.length > 1 ? 's' : '') + ': ' + unknown.join(', '));
  }
  // A starting material means nothing outside path mode, so rather than
  // refusing the combination - which would strand anyone switching modes -
  // it is dropped. Coercion, not an error.
  if (out.mode !== 'path') out.start = '';
  check(out);
  // Which keys the caller actually spoke about, as opposed to which ones have
  // a value because everything does. Layering is meaningless without it: a
  // typed "beam:100" normalises to a complete object, and without this marker
  // its untouched maxDepth default would overwrite the depth a shared URL had
  // just set. Non-enumerable, so it never shows up in JSON or a comparison.
  Object.defineProperty(out, '__explicit', {
    value: new Set(Object.keys(input)
      .map((key) => (BY_KEY.get(key) || BY_ALIAS.get(key.toLowerCase()) || {}).key)
      .filter(Boolean)),
    enumerable: false,
  });
  return out;
}

// Rules that involve more than one setting, which no per-field declaration can
// express.
function check(settings) {
  // Note what is deliberately *not* checked here: that the question is
  // complete. Settings describe a question being composed, and demanding a
  // starting material the moment the mode is set to "path" makes the mode
  // impossible to select - you cannot type the start until you are in the mode
  // that shows the field. Completeness is ready()'s job, at the moment the
  // search is actually run. What is checked here is contradiction.
  if (settings.target && settings.start && settings.target === settings.start) {
    fail('The target and the starting material are the same molecule.');
  }
  if (settings.minTemp !== null && settings.maxTemp !== null
      && settings.minTemp > settings.maxTemp) {
    fail('Minimum temperature (' + settings.minTemp + ') is above the maximum ('
      + settings.maxTemp + ').');
  }
  const weights = SCHEMA.filter((e) => e.key.startsWith('weight'))
    .reduce((sum, e) => sum + settings[e.key], 0);
  if (weights <= 0) {
    fail('At least one ranking weight must be above zero, or nothing can be ranked.');
  }
  if (settings.catalogue === 'inventory' && settings.inventory.length === 0) {
    fail('Catalogue is set to "inventory" but no material has been listed.');
  }
  for (const family of settings.families) {
    if (settings.banFamilies.includes(family)) {
      fail('Family "' + family + '" is both required and banned.');
    }
  }
}

// Is this question answerable yet? Separate from validity: a half-typed
// question is perfectly valid settings and simply not ready to run.
function ready(settings) {
  if (!settings.target) {
    return { ok: false, reason: 'Give it a target molecule.' };
  }
  if (settings.mode === 'path' && !settings.start) {
    return { ok: false, reason: 'Mode "path" needs a starting material too.' };
  }
  return { ok: true, reason: '' };
}

// --- the typed one-line syntax --------------------------------------------
// "depth:12 rank fewer steps" is not a language worth inventing. This is:
//   depth:12 beam:60 noelement:Cr,Os cryo:off scale:kg
// Bare words toggle a boolean on, and a leading ! turns it off, so "!cryo" and
// "cryo:off" mean the same thing.
function parse(text) {
  const out = {};
  if (!text) return out;
  const tokens = String(text).match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  for (const token of tokens) {
    const clean = token.replace(/"/g, '');
    const colon = clean.indexOf(':');
    if (colon === -1) {
      const negated = clean.startsWith('!') || clean.startsWith('-');
      const name = negated ? clean.slice(1) : clean;
      const entry = BY_ALIAS.get(name.toLowerCase());
      if (!entry) fail('Unknown setting "' + name + '".');
      if (entry.type !== 'bool') {
        fail('"' + name + '" needs a value, as ' + name + ':<value>.');
      }
      out[entry.key] = !negated;
      continue;
    }
    const name = clean.slice(0, colon);
    const value = clean.slice(colon + 1);
    const entry = BY_ALIAS.get(name.toLowerCase());
    if (!entry) fail('Unknown setting "' + name + '".');
    out[entry.key] = value;
  }
  return normalize(out);
}

// The reverse: the shortest command line that reproduces these settings.
// Only what differs from the defaults, so a shared string stays readable.
function toCommand(settings) {
  const base = defaults();
  const parts = [];
  for (const entry of SCHEMA) {
    const value = settings[entry.key];
    const same = Array.isArray(value)
      ? value.join(',') === (base[entry.key] || []).join(',')
      : value === base[entry.key];
    if (same) continue;
    const name = (entry.alias && entry.alias[0]) || entry.key;
    if (entry.type === 'bool') {
      parts.push(value ? name : '!' + name);
    } else if (Array.isArray(value)) {
      parts.push(name + ':' + value.join(','));
    } else if (value === null) {
      parts.push(name + ':');
    } else {
      parts.push(name + ':' + value);
    }
  }
  return parts.join(' ');
}

// --- URL ------------------------------------------------------------------
function toQuery(settings) {
  const base = defaults();
  const params = [];
  for (const entry of SCHEMA) {
    const value = settings[entry.key];
    const same = Array.isArray(value)
      ? value.join(',') === (base[entry.key] || []).join(',')
      : value === base[entry.key];
    if (same || value === null) continue;
    const name = (entry.alias && entry.alias[0]) || entry.key;
    params.push(encodeURIComponent(name) + '=' + encodeURIComponent(
      Array.isArray(value) ? value.join(',') : String(value)));
  }
  return params.join('&');
}

function fromQuery(query) {
  const out = {};
  const text = String(query || '').replace(/^[?#]/, '');
  if (!text) return normalize({});
  for (const pair of text.split('&')) {
    if (!pair) continue;
    const index = pair.indexOf('=');
    const name = decodeURIComponent(index === -1 ? pair : pair.slice(0, index));
    const value = index === -1 ? 'true' : decodeURIComponent(pair.slice(index + 1));
    const entry = BY_ALIAS.get(name.toLowerCase());
    if (!entry) continue;  // a link may carry unrelated parameters
    out[entry.key] = value;
  }
  return normalize(out);
}

// --- composing the sources ------------------------------------------------
// defaults < profile < url < command < per-search, each overriding the last.
function resolve(layers) {
  const merged = {};
  for (const layer of layers || []) {
    if (!layer) continue;
    const source = typeof layer === 'string' ? parse(layer) : layer;
    // A layer overrides only what it actually set. Objects that came through
    // normalize carry that list; a plain literal handed in by a caller means
    // every key it has.
    const spoken = source.__explicit || new Set(Object.keys(source));
    for (const [key, value] of Object.entries(source)) {
      const entry = BY_KEY.get(key) || BY_ALIAS.get(key.toLowerCase());
      if (!entry || !spoken.has(entry.key)) continue;
      merged[entry.key] = value;
    }
  }
  return normalize(merged, { lenient: true });
}

const EXPORTS_settings = {
  SCHEMA, GROUPS, FAMILIES, HAZARDS, BY_KEY, BY_ALIAS,
  defaults, normalize, parse, toCommand, toQuery, fromQuery, resolve, ready, UNAPPLIED,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_settings;
} else if (typeof RETRO !== 'undefined') {
  RETRO.settings = EXPORTS_settings;
}
