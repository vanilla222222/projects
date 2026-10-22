'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const context = vm.createContext({ console, setTimeout, clearTimeout });
const files = ['elements', 'graph', 'valence', 'stereo', 'naming-core', 'naming-chain', 'naming-ring', 'naming-scaffolds', 'naming-general', 'common-names-extra', 'naming-elements', 'properties', 'layout', 'smiles', 'molfile', 'reactions', 'molecular-identity'];
files.forEach((file) => vm.runInContext(fs.readFileSync(path.join(root, 'js', file + '.js'), 'utf8'), context, { filename: file + '.js' }));
const run = (code) => vm.runInContext(code, context);
let checks = 0;
const same = (a, b, expected = true) => { assert.equal(run(`moleculeSame(${JSON.stringify(a)},${JSON.stringify(b)})`), expected, a + ' vs ' + b); checks++; };
same('CCO', 'OCC');
same('CC(=O)O', 'OC(C)=O');
same('C1CCCCC1', 'C1(CCCCC1)');
same('c1ccccc1O', 'Oc1ccccc1');
same('C1=CC=CC=C1', 'c1ccccc1');
same('ClC1=CC=CC=C1Br', 'Brc1ccccc1Cl');
same('[Na+].[O-]C(=O)C', 'CC([O-])=O.[Na+]');
same('N[C@H](C)O', 'O[C@@H](C)N');
same('N[C@H](C)O', 'N[C@@H](C)O', false);
same('NC(C)O', 'N[C@H](C)O', false);
same('C/C=C/C', 'C\\C=C\\C');
same('C/C=C/C', 'C/C=C\\C', false);
same('CC=CC', 'C/C=C/C', false);
same('C[NH2+]C', 'CNC', false);
same('[13CH3]CO', 'OC[13CH3]');
same('[13CH3]CO', 'CCO', false);
same('[2H]OC', 'CO[2H]');
same('[2H]OC', 'CO', false);
same('C1CC1', 'CCC', false);
same('CCCC', 'CC(C)C', false);
same('CO.CO', 'CO', false);
same('CC.CC', 'CCCC', false);
assert.equal(run(`moleculeIdentity('N[C@H](C)O').connectivityKey === moleculeIdentity('N[C@@H](C)O').connectivityKey`), true); checks++;
assert.equal(run(`moleculeSame('N[C@H](C)O','N[C@@H](C)O',{stereo:false})`), true); checks++;
for (const smiles of ['CCO', 'c1ccccc1O', 'N[C@H](C)O', 'C/C=C/C', 'CC=CC', '[Na+].CC(=O)[O-]', '[13CH3]CO', '[2H]OC']) {
  assert.equal(run(`(() => { const g=moleculeIdentityGraph(${JSON.stringify(smiles)}); const before=JSON.stringify(g); const i=moleculeIdentity(g); return before===JSON.stringify(g) && moleculeSame(${JSON.stringify(smiles)},i.isomericSmiles); })()`), true, 'identity/export roundtrip ' + smiles); checks++;
}
for (const smiles of ['[13CH3]CO', '[2H]OC', 'N[C@H](C)O', 'C/C=C/C', 'CC=CC']) {
  assert.equal(run(`(() => { const g=moleculeIdentityGraph(${JSON.stringify(smiles)}); const mol=graphToMolfile(g); return moleculeSame(g,molRecordToGraph(parseMolRecord(mol))); })()`), true, 'MOL roundtrip ' + smiles); checks++;
}
assert.equal(run(`(() => {const f=smilesToFragment('[13CH3]CO');return moleculeIdentity(f).key===moleculeIdentity('[13CH3]CO').key})()`), true); checks++;
assert.throws(() => run(`moleculeIdentity({atoms:[],bonds:[]})`), /nonempty/); checks++;
assert.throws(() => run(`moleculeIdentity({atoms:[{id:1,element:'C'},{id:1,element:'C'}],bonds:[]})`), /Duplicate/); checks++;
assert.throws(() => run(`moleculeIdentity({atoms:[{id:1,element:'C'}],bonds:[{atomA:1,atomB:2,order:1}]})`), /Invalid/); checks++;
assert.equal(run(`(() => { const a=moleculeIdentityGraph('[13CH4]'),b=moleculeIdentityGraph('C'); return Math.abs(computeProperties(a,[1]).exactMass-computeProperties(b,[1]).exactMass-1.00335483507)<1e-9; })()`), true); checks++;
assert.equal(run(`(() => { const g=moleculeIdentityGraph('[99CH4]'); const p=computeProperties(g,[1]); return p.averageMass===null && p.exactMass===null && /isotope/.test(p.isotopeMassWarning); })()`), true); checks++;
assert.equal(run(`(() => { const g=moleculeIdentityGraph('[13CH3]O[2H]'); const p=computeProperties(g,g.atoms.map(a=>a.id)); return moleculeSame(g,p.isomericSmiles) && p.exactMass>34; })()`), true); checks++;
for (const smiles of ['CC(C)C', 'CC1=CC=CC=C1O', 'N[C@H](C)O', 'C/C=C/C', '[Na+].CC(=O)[O-]', 'C1C2CC3CC1CC(C2)C3']) {
  assert.equal(run(`(() => { const g=moleculeIdentityGraph(${JSON.stringify(smiles)}); const before=JSON.stringify(g); const map=new Map(g.atoms.map((a,i)=>[a.id,1000-i*7])); const f={atoms:g.atoms.slice().reverse().map(a=>({...a,id:map.get(a.id)})),bonds:g.bonds.slice().reverse().map(b=>({...b,atomA:map.get(b.atomA),atomB:map.get(b.atomB)}))}; return moleculeSame(g,f) && before===JSON.stringify(g); })()`), true, 'atom/bond relabeling ' + smiles); checks++;
}
// These connected 3-regular graphs have the same elementary degree/color
// signatures but are not isomorphic. Identity cannot be just a refinement hash.
assert.equal(run(`(() => { const make=edges=>{const g=new Graph();for(let i=0;i<6;i++)g.addAtom('C',i,0);edges.forEach(e=>g.addBond(e[0]+1,e[1]+1));return g};return moleculeSame(make([[0,1],[1,2],[2,0],[3,4],[4,5],[5,3],[0,3],[1,4],[2,5]]),make([[0,3],[0,4],[0,5],[1,3],[1,4],[1,5],[2,3],[2,4],[2,5]]));})()`), false); checks++;
console.log('Molecular identity: ' + checks + ' checks passed.');
