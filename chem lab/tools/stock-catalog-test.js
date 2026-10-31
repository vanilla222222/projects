'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const ctx = vm.createContext({ console, performance, setTimeout, clearTimeout });
for (const match of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="([^"]+)"/g)) {
  if (match[1] !== 'js/app.js') vm.runInContext(fs.readFileSync(path.join(root, match[1]), 'utf8'), ctx, { filename: match[1] });
}
const run = code => vm.runInContext(code, ctx);
let checks = 0;
function check(code, expected, label) { assert.equal(run(code), expected, label); checks++; }

check('STOCK_BUILTIN.length >= 640', true, 'The heavily expanded built-in stock catalogue is registered');
check(`(()=>{
  const seen=new Set();
  return STOCK_BUILTIN.every(entry=>{
    const key=stockCanonical(entry.smiles);
    if(!key||seen.has(key)||!entry.name||entry.tier<1||entry.tier>3)return false;
    seen.add(key);return true;
  });
})()`, true, 'Every entry is named, valid, tiered, and canonically unique');
check(`STOCK_BUILTIN.every(entry=>stockCanonical(entry.smiles)===entry.smiles)`, true, 'Stored stock identities are already canonical, keeping planner lookup fast');
check(`STOCK_BUILTIN.every(entry=>{const info=stockTier(stockCanonical(entry.smiles));return !!info&&info.source==='builtin'&&info.name===entry.name;})`, true, 'Canonical lookup reaches every built-in entry rather than the name-only fallback');

check(`(()=>{const info=stockTier('[Fe]');return !!info&&info.source==='builtin'&&info.name==='iron'&&info.tier===1&&stockInStock('[Fe]',2);})()`, true, 'Iron is tier-one built-in inventory');
check(`(()=>{const info=stockTier('O[N+](=O)[O-]');return !!info&&info.source==='builtin'&&info.name==='nitric acid'&&info.tier===1&&stockInStock('O[N+](=O)[O-]',2);})()`, true, 'Nitric acid uses the reaction engine identity and is tier-one stock');
check(`(()=>{const info=stockTier('O=[N+]([O-])O');return !!info&&info.source==='builtin'&&info.name==='nitric acid'&&info.tier===1;})()`, true, 'Equivalent nitric acid SMILES retain built-in inventory recognition');
check(`stockTier('O=N(=O)O')===null`, true, 'The old incompatible neutral nitric-acid notation is not silently accepted');
check(`(()=>{const info=stockTier('[OH-].[Na+]');return !!info&&info.source==='builtin'&&info.name==='sodium hydroxide';})()`, true, 'Salt component order does not affect canonical inventory identity');

const common = [
  'phosphoric acid', 'boric acid', 'hydrogen fluoride', 'carbon monoxide', 'oxygen', 'nitrogen', 'iodine', 'sulfur',
  'zinc', 'copper', 'nickel', 'palladium', 'silver',
  'lithium hydroxide', 'calcium hydroxide', 'sodium carbonate', 'sodium bicarbonate', 'potassium bicarbonate', 'caesium carbonate',
  'sodium acetate', 'ammonium acetate', 'sodium chloride', 'potassium chloride', 'magnesium chloride', 'calcium chloride',
  'sodium bromide', 'potassium iodide', 'sodium sulfate', 'sodium sulfite', 'sodium thiosulfate', 'sodium nitrate', 'sodium nitrite',
  'iron(III) chloride', 'aluminium chloride', 'zinc chloride', 'copper(I) iodide', 'chromium trioxide', 'manganese dioxide',
  'sodium hypochlorite', 'sodium periodate', 'lithium borohydride', 'sodium triacetoxyborohydride', 'DIBAL-H',
  'LDA', 'DMAP', 'DBU', 'DIPEA', 'DCC', 'EDC', 'DEAD', 'DIAD', 'N-chlorosuccinimide', 'N-iodosuccinimide',
  'pentane', 'heptane', 'cyclopentane', 'cyclopentyl methyl ether', 'NMP', 'isopropyl acetate',
  'quinoline', 'isoquinoline', 'pyrimidine', 'pyrazole', 'benzimidazole', 'thiourea', 'glucose'
];
for (const name of common) {
  ctx.stockName = name;
  check(`(()=>{const entry=STOCK_BUILTIN.find(e=>e.name===stockName);const info=entry&&stockTier(entry.smiles);return !!entry&&!!info&&info.source==='builtin'&&info.tier<=2&&stockInStock(entry.smiles,2);})()`, true, 'Built-in inventory recognizes common stock: ' + name);
}
check(`REACTION_ADDITIVES.filter(a=>a.smiles).every(a=>{const info=stockTier(a.smiles);return !!info&&info.source==='builtin'&&info.tier<=2;})`, true, 'Every structured reaction-condition additive is available to the built-in stock policy');
console.log('Expanded stock catalogue and inventory policy: ' + checks + ' checks passed.');
