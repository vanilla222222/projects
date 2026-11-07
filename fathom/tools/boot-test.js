'use strict';
// Does the game load?
//
// Every other suite requires the modules it tests, which in Node means each one gets its
// own scope and its own `require` graph. The browser does neither: index.html lists
// classic scripts, they all share one global scope, and they run strictly in the order
// they are listed. Two whole classes of bug live in that gap and are invisible to every
// other test here:
//
//   - **Order.** A module that names a `const` from a module listed after it reads it
//     before its declaration and throws on page load. This has happened: craft.js named
//     the buff table at load time, buffs.js is listed later, and the game was broken
//     while all twenty suites passed. The file it happened in already carried two
//     comments warning about exactly that.
//   - **Collision.** Two files that both declare `const shade` are two `require`d modules
//     in Node and a redeclaration error in the browser. This has happened three times:
//     `BY_KEY` in two modules, `EXPORTS` in all of them, a local named `mining`.
//
// So this test does what the browser does. It reads the script list out of index.html,
// concatenates those files in that order into one program - which is what sharing a
// global scope amounts to - and runs it in a fresh VM context with just enough of a
// browser stubbed to get through load. Anything that would throw on page load throws
// here, with a line number.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

let checks = 0;
let failures = 0;
function ok(cond, label) {
  checks += 1;
  if (!cond) { failures += 1; console.log('FAIL: ' + label); }
}

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// --- the script list, in order ------------------------------------------------------------
const sources = [];
{
  const re = /<script src="([^"]+)"><\/script>/g;
  let m = re.exec(html);
  while (m) { sources.push(m[1].split('?')[0]); m = re.exec(html); }
}
ok(sources.length >= 10, 'index.html lists only ' + sources.length + ' scripts');
for (const src of sources) {
  ok(fs.existsSync(path.join(root, src)), 'index.html lists ' + src + ', which is missing');
}

// Every module in js/ should be listed, or it is dead weight the browser never loads.
{
  const onDisk = fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js'));
  for (const file of onDisk) {
    ok(sources.includes('js/' + file),
      'js/' + file + ' exists and index.html never loads it');
  }
}

// --- two modules claiming the same global name --------------------------------------------
// Running the bundle catches a duplicate `const`, because that throws. It does not catch
// a duplicate `function`, because two function declarations of the same name in one
// scope are perfectly legal: the later one silently replaces the earlier.
//
// That is worse than the error, not better. fishing.js declared `function poolFor` and so
// did enemy.js; fishing.js loads second; the enemy spawner started drawing from the
// fishing table and crashed trying to read an archetype off a bass. Nothing threw at load
// and every suite passed, because in Node they are two modules.
{
  const owners = new Map();
  for (const src of sources) {
    const text = fs.readFileSync(path.join(root, src), 'utf8');
    // Top-level declarations only: column zero, which is what shares the global scope.
    const re = /^(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm;
    let m = re.exec(text);
    while (m) {
      const name = m[1];
      if (!owners.has(name)) owners.set(name, []);
      if (!owners.get(name).includes(src)) owners.get(name).push(src);
      m = re.exec(text);
    }
  }
  let shared = 0;
  for (const [name, files] of owners) {
    if (files.length < 2) continue;
    shared += 1;
    ok(false, 'the global name "' + name + '" is declared in ' + files.join(' and ')
      + ' - they share one scope in the browser and the later one wins');
  }
  ok(shared === 0 || true, 'checked ' + owners.size + ' top-level names for collisions');
}

// --- a browser, as far as loading is concerned ------------------------------------------------
function stubCanvas() {
  const ctx = new Proxy({}, {
    get(target, key) {
      if (key === 'canvas') return null;
      if (key in target) return target[key];
      // Every drawing call is a no-op that returns something harmless; the gradient and
      // measurement calls have to return objects with their own methods.
      return (...args) => {
        void args;
        if (key === 'createLinearGradient' || key === 'createRadialGradient') {
          return { addColorStop() {} };
        }
        if (key === 'createImageData' || key === 'getImageData') {
          return { data: new Uint8ClampedArray(4), width: 1, height: 1 };
        }
        if (key === 'measureText') return { width: 0 };
        return undefined;
      };
    },
    set(target, key, value) { target[key] = value; return true; }
  });
  return {
    width: 0, height: 0, style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {} },
    getContext: () => ctx,
    addEventListener() {}, appendChild() {}, querySelector: () => null,
    querySelectorAll: () => [], getBoundingClientRect: () => ({ width: 0, height: 0, left: 0, top: 0 })
  };
}

function stubDocument() {
  return {
    createElement: () => stubCanvas(),
    getElementById: () => stubCanvas(),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    body: stubCanvas()
  };
}

const sandbox = {
  console,
  Math,
  Date,
  JSON,
  performance: { now: () => 0 },
  document: stubDocument(),
  localStorage: { getItem: () => null, setItem() {}, removeItem() {}, clear() {} },
  requestAnimationFrame: () => 0,
  addEventListener() {},
  setTimeout,
  clearTimeout,
  Uint8Array, Uint16Array, Uint8ClampedArray, Float32Array, Map, Set, Proxy
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

// Concatenated in order, which is what one shared global scope amounts to. Each file is
// labelled so a throw says which one.
const program = sources
  .map(src => '\n/* ===== ' + src + ' ===== */\n'
    + fs.readFileSync(path.join(root, src), 'utf8'))
  .join('\n')
  // A top-level `const` in a classic script is script-scoped, not a property of window -
  // in a real browser too. index.html's own inline script reaches FATHOM and makeGame by
  // being in that same scope, so this epilogue does the same thing it does.
  + '\n/* ===== boot-test epilogue ===== */\n'
  + 'globalThis.__boot = { FATHOM, makeGame };\n';

let loadError = null;
try {
  vm.runInNewContext(program, sandbox, { filename: 'fathom-bundle.js' });
} catch (err) {
  loadError = err;
}

if (loadError) {
  // Work out which file the throw landed in, because a line number into a concatenation
  // of twenty files is not an answer.
  const line = (loadError.stack || '').match(/fathom-bundle\.js:(\d+)/);
  let where = 'somewhere';
  if (line) {
    const upto = program.split('\n').slice(0, Number(line[1]));
    for (let i = upto.length - 1; i >= 0; i -= 1) {
      const mark = upto[i].match(/\/\* ===== (\S+) ===== \*\//);
      if (mark) { where = mark[1]; break; }
    }
  }
  ok(false, 'the game throws on load, in ' + where + ': ' + loadError.message);
} else {
  ok(true, 'the scripts load in the order index.html lists them');
}

// --- everything registered itself --------------------------------------------------------------
if (!loadError) {
  const booted = sandbox.__boot || {};
  const FATHOM = booted.FATHOM;
  ok(!!FATHOM, 'nothing registered itself: FATHOM is missing');
  if (FATHOM) {
    // Each module registers under a name; the game destructures those names out of
    // FATHOM. A module that loads but never registers is a module the game cannot see.
    // game.js is the one that consumes the registry rather than joining it, and
    // registry.js is the registry itself.
    const expected = sources
      .map(src => path.basename(src, '.js'))
      .filter(name => name !== 'registry' && name !== 'game');
    const ALIASES = {};
    for (const name of expected) {
      const key = ALIASES[name] || name;
      ok(FATHOM[key] !== undefined, 'js/' + name + '.js loads but never registers itself');
      if (FATHOM[key]) {
        ok(Object.keys(FATHOM[key]).length > 0, name + ' registered an empty export');
      }
    }

    // And the thing index.html actually calls has to exist.
    ok(typeof booted.makeGame === 'function', 'makeGame is not defined after loading');

    // The names game.js destructures out of deps must all be there, or the game throws
    // the moment it starts rather than when it loads.
    const game = fs.readFileSync(path.join(root, 'js/game.js'), 'utf8');
    // From the opening brace of the destructure, not from a fixed number of characters
    // before it: a window that size swallows the comment above it, and "loop, input,
    // camera, mining, placing, drops, events, save" reads as a list of dependencies.
    const closes = game.indexOf('} = deps;');
    const opens = game.lastIndexOf('const {', closes);
    const block = game.slice(opens + 'const {'.length, closes);
    const wanted = block.split(',')
      .map(part => part.split(':')[0].trim())
      .filter(Boolean);
    for (const name of new Set(wanted)) {
      if (!name || name === 'deps') continue;
      ok(FATHOM[name] !== undefined,
        'game.js expects deps.' + name + ', which nothing registers');
    }
  }
}

console.log('\n' + sources.length + ' scripts loaded in order: '
  + sources.map(s => path.basename(s, '.js')).join(' '));
console.log(checks + ' checks, ' + failures + ' failures');
process.exit(failures ? 1 : 0);
