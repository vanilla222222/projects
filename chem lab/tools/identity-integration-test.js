'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const context = vm.createContext({ console, performance, setTimeout, clearTimeout });
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scriptPaths = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
scriptPaths.filter((file) => file !== 'js/app.js').forEach((file) => vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file }));
const run = (code) => vm.runInContext(code, context);
let checks = 0;
const check = (code, expected, label) => { assert.equal(run(code), expected, label); checks++; };
for (const smiles of ['[13CH3]CO', '[2H]OC', 'N[C@H](C)O', '[13CH3][C@H](C)O', 'C/C=C/C', 'CC=CC', '[Na+].CC(=O)[O-]']) {
  context.input = smiles;
  check(`(() => { const g=moleculeIdentityGraph(input); const text=shareEncodeGraph(g); const restored=shareDecodeGraph(text); return !restored.error && moleculeSame(g,restored); })()`, true, 'Share roundtrip: ' + smiles);
  check(`(() => { const f=smilesToFragment(input); return moleculeSame(input,reactionFragmentGraph(f)); })()`, true, 'Reaction fragment roundtrip: ' + smiles);
  check(`(() => { const g=moleculeIdentityGraph(input); return moleculeSame(g,retroClone(g)); })()`, true, 'Retro clone: ' + smiles);
}
check(`moleculeSame('[13CH3][C@H](C)O','[13CH3][C@@H](C)O')`, false, 'Isotope-defined enantiomers stay distinct');
check(`(() => {const g=moleculeIdentityGraph('CC=CC');return g.bonds.find(b=>b.order===2).stereoSpecified===false && findStereoDoubleBonds(g,g.atoms.map(a=>a.id)).length===0;})()`, true, 'No E/Z invented from imported layout');
check(`(() => {const old=[1,[2,1,1],[[1,'C',0,0]],[],[]];const restored=shareDecodeGraph(JSON.stringify(old));return !restored.error && restored.atoms[0].element==='C';})()`, true, 'Legacy v1 links still load');
check(`(() => {const g=moleculeIdentityGraph('[13CH4]');const raw=JSON.parse(shareEncodeGraph(g));raw[2][0][7]=-1;return !!shareDecodeGraph(JSON.stringify(raw)).error;})()`, true, 'Invalid isotope in share is rejected');
check(`(() => {stockClear();stockImport('N[C@H](C)O\\nN[C@@H](C)O');const rows=stockUserList();const restored=stockSerialize();stockRestore(restored);return rows.length===2 && stockUserList().length===2 && !moleculeSame(rows[0].smiles,rows[1].smiles);})()`, true, 'Stock import/persistence preserves both enantiomers');
check(`pathFinderMaterialKey('[I-].[Na+]')===pathFinderMaterialKey('[Na+].[I-]')`, true, 'Forbidden salts match independent of component order');
check(`(() => {const g=moleculeIdentityGraph('[13CH3]O');const scheme=buildReactionScheme([{role:'reactant',fragment:g}],defaultReactionConditions(),[]);return scheme.atoms.some(a=>a.isotope===13);})()`, true, 'Reaction scheme retains isotope label');
check(`(() => {const g=moleculeIdentityGraph('[13CH3]CO');const renderer={render(){},selection:new Set(),annotationSelection:new Set()};const editor=new Interactions({},new Graph(),renderer);editor.changed=()=>{};editor.selectionChanged=()=>{};editor.setHover=()=>{};editor.updateGhost=()=>{};editor.insertFragment(g,{x:0,y:0});const f=editor.extractFragment(editor.graph.atoms.map(a=>a.id),[]);return moleculeSame(g,f);})()`, true, 'Editor insertion/copy retains isotope identity');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
assert.equal(new Set(ids).size, ids.length, 'Unique HTML IDs'); checks++;
for (const file of scriptPaths) { assert.equal(fs.existsSync(path.join(root, file)), true, file); }
assert.ok(scriptPaths.indexOf('js/molecular-identity.js') < scriptPaths.indexOf('js/path-finder.js')); checks++;
assert.ok(scriptPaths.indexOf('js/reaction-rules-extra4.js') < scriptPaths.indexOf('js/reaction-catalog.js')); checks++;
assert.ok(scriptPaths.indexOf('js/route-workspace.js') < scriptPaths.indexOf('js/app.js')); checks++;
console.log('Identity and module integration: ' + checks + ' checks passed.');
