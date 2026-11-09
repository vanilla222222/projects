#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const context = vm.createContext({ console, setTimeout, clearTimeout });
const files = ['elements', 'graph', 'valence', 'stereo', 'naming-core', 'naming-chain', 'naming-ring', 'naming-scaffolds', 'naming-general', 'common-names-extra', 'naming-elements', 'properties', 'layout', 'smiles', 'reactions', 'reaction-stereo', 'reaction-rules', 'reaction-rules-extra', 'reaction-rules-extra2', 'reaction-aromatic', 'reaction-rules-extra3'];
files.forEach((file) => vm.runInContext(fs.readFileSync(path.join(root, 'js', file + '.js'), 'utf8'), context, { filename: file + '.js' }));
const run = (code) => vm.runInContext(code, context);
run(`function testGraph(smiles) { return reactionFragmentGraph(smilesToFragment(smiles)); }
function testCompound(smiles, role) { return { smiles, fragment: smilesToFragment(smiles), role: role || 'reactant', name: smiles, equivalents: 1 }; }`);
let checks = 0;
function check(code, expected, label) { assert.equal(run(code), expected, label); checks += 1; }
check(`rxSpeciesTag(testGraph('CC(=O)[O-]'), [1,2,3,4]).tag`, 'carboxylate', 'acetate must not trigger strong alkoxide-base rules');
check(`(() => { const g = testGraph('CC[O-]'); return rxSpeciesTag(g, g.atoms.map(a => a.id)).tag; })()`, 'alkoxide', 'ethoxide remains an alkoxide');
check(`(() => { const source = testGraph('CCO'); source.atoms[0].isotope = 13; source.bonds[0].stereo = 'wedge'; const target = testGraph('C'); const map = rxMerge(target, source, source.atoms.map(a => a.id)); return target.getAtom(map.get(1)).isotope === 13 && target.getBond(map.get(1), map.get(2)).stereo === 'wedge' && new Set(target.atoms.map(a => a.id)).size === 4; })()`, true, 'merge preserves metadata and remaps IDs');
check(`(() => { const g = testGraph('CC'); g.atoms.push({...g.atoms[0]}); try { rxProductList(g); } catch(e) { return /duplicate atom/.test(e.message); } return false; })()`, true, 'duplicate product atom IDs rejected');
check(`(() => { const g = testGraph('CC'); g.bonds[0].atomB = 99; try { rxProductList(g); } catch(e) { return /invalid bond/.test(e.message); } return false; })()`, true, 'dangling product bond rejected');
check(`(() => { const g = testGraph('C'); for(let i=0;i<5;i++) rxAttach(g,'C',1); try { rxProductList(g); } catch(e) { return /valence/.test(e.message); } return false; })()`, true, 'pentavalent carbon rejected');
check(`(() => { const g = testGraph('COC'); rxAttach(g, 'C', 2); try { rxProductList(g); } catch(e) { return /valence/.test(e.message); } return false; })()`, true, 'neutral trivalent oxygen rejected');
check(`(() => { const g = testGraph('C[O+](C)C'); rxValidateProductGraph(g); return true; })()`, true, 'oxonium remains permitted');
check(`(() => { const g = testGraph('CS(=O)(=O)C'); rxValidateProductGraph(g); return true; })()`, true, 'sulfone remains permitted');
check(`(() => { const r = predictReaction([testCompound('CCBr'), testCompound('[Na+].[OH-]', 'reagent')], {...defaultReactionConditions(), solvents: ['dmso']}); return r.best && r.best.id; })()`, 'sn2', 'ordinary SN2 remains functional');
check(`(() => { const r = predictReaction([testCompound('CCBr'), testCompound('[Na+].CC(=O)[O-]', 'reagent')], {...defaultReactionConditions(), solvents: ['dmso']}); return [r.best, ...r.alternatives].filter(Boolean).some(o => ['e2','e2-hofmann','williamson'].includes(o.id)); })()`, false, 'acetate cannot masquerade as a strong alkoxide');
// Supply two different stereochemical realizations of the same connectivity:
// the product table must retain separate entries instead of combining their counts.
check(`(() => { const oldRealize = rxsRealize, oldIsomeric = rxIsomericSmiles; let n = 0; try { rxsRealize = () => ({fragment: {marker: ++n}, stereo: null}); rxIsomericSmiles = item => item.fragment.marker === 1 ? 'N[C@H](C)O' : 'N[C@@H](C)O'; const p = rxProductList(testGraph('CC(N)O.CC(N)O')); return p.length === 2 && p.every(x => x.count === 1); } finally { rxsRealize = oldRealize; rxIsomericSmiles = oldIsomeric; } })()`, true, 'stereoisomer product identities stay distinct');
check(`(() => { const oldRealize = rxsRealize, oldIsomeric = rxIsomericSmiles; try { rxsRealize = () => ({fragment: {marker: 1}, stereo: null}); rxIsomericSmiles = item => item.smiles + '@'; return rxProductList(testGraph('C[NH2+]C'))[0].isomericSmiles.endsWith('@'); } finally { rxsRealize = oldRealize; rxIsomericSmiles = oldIsomeric; } })()`, true, 'charged product retains isomeric serialization');
check(`(() => { const r = predictReaction([testCompound('CCBr'), testCompound('CS'), testCompound('[Na+].[OH-]', 'reagent')], {...defaultReactionConditions(), solvents: ['dmso']}); return r.best && r.best.id === 'thiolate-alkylation' && r.best.products.some(p => p.smiles === 'CCSC'); })()`, true, 'thiol plus primary bromide forms thioether with base');
check(`(() => { const r = predictReaction([testCompound('CBr'), testCompound('CC[S-].[Na+]', 'reagent')], {...defaultReactionConditions(), solvents: ['dmso']}); return r.best && r.best.id === 'thiolate-alkylation'; })()`, true, 'preformed thiolate needs no extra base');
check(`(() => { const r = predictReaction([testCompound('CCBr'), testCompound('CS')], defaultReactionConditions()); return [r.best,...r.alternatives].filter(Boolean).some(o => o.id === 'thiolate-alkylation'); })()`, false, 'neutral thiol without base does not trigger this model');
check(`(() => { const r = predictReaction([testCompound('CC(C)(C)Br'), testCompound('CC[S-].[Na+]', 'reagent')], defaultReactionConditions()); return [r.best,...r.alternatives].filter(Boolean).some(o => o.id === 'thiolate-alkylation'); })()`, false, 'tertiary halide excluded from thiolate SN2');
check(`(() => { const r = predictReaction([testCompound('CC(C)(C)CBr'), testCompound('CC[S-].[Na+]', 'reagent')], defaultReactionConditions()); return [r.best,...r.alternatives].filter(Boolean).some(o => o.id === 'thiolate-alkylation'); })()`, false, 'neopentyl halide excluded from simple SN2 model');
check(`(() => { const r = predictReaction([testCompound('CSSC'), testCompound('P(CCC(=O)O)(CCC(=O)O)CCC(=O)O', 'reagent')], {...defaultReactionConditions(), solvents: ['water']}); return r.best && r.best.id === 'disulfide-reduction' && r.best.products.length === 1 && r.best.products[0].count === 2 && r.best.products[0].smiles === 'CS'; })()`, true, 'TCEP reduces symmetric disulfide to two thiol equivalents');
check(`(() => { const r = predictReaction([testCompound('CSSCC'), testCompound('P(CCC(=O)O)(CCC(=O)O)CCC(=O)O', 'reagent')], {...defaultReactionConditions(), solvents: ['water']}); return r.best && r.best.id === 'disulfide-reduction' && r.best.products.length === 2; })()`, true, 'TCEP reduces mixed disulfide to distinct thiols');
check(`(() => { const r = predictReaction([testCompound('CSSC'), testCompound('P(CCC(=O)O)(CCC(=O)O)CCC(=O)O', 'reagent')], {...defaultReactionConditions(), solvents: ['thf']}); return [r.best,...r.alternatives].filter(Boolean).some(o => o.id === 'disulfide-reduction'); })()`, false, 'TCEP rule requires aqueous conditions');
check(`(() => { const r = predictReaction([testCompound('CSC'), testCompound('P(CCC(=O)O)(CCC(=O)O)CCC(=O)O', 'reagent')], {...defaultReactionConditions(), solvents: ['water']}); return [r.best,...r.alternatives].filter(Boolean).some(o => o.id === 'disulfide-reduction'); })()`, false, 'thioether is not mistaken for disulfide');
check(`(() => { const g = testGraph('C[C@H](O)C[NH3+]'); g.stereoSpecs = rxsCapture(g); const product = rxProductList(g)[0]; return /@/.test(product.isomericSmiles) && /\\+/.test(product.isomericSmiles); })()`, true, 'charged chiral product keeps real stereochemical serialization');
check(`(() => { const g = testGraph('C[C@H](O)CC.C[C@@H](O)CC'); g.stereoSpecs = rxsCapture(g); const products = rxProductList(g); return products.length === 2 && products.every(p => p.count === 1 && /@/.test(p.isomericSmiles)) && products[0].isomericSmiles !== products[1].isomericSmiles; })()`, true, 'actual enantiomer components stay separate');
check(`(() => { const g = testGraph('C[C@H](O)C[NH3+].[Cl-]'); g.stereoSpecs = rxsCapture(g); const product = rxProductList(g)[0]; const roundTrip = reactionFragmentGraph(reactionProductFragment(product)); const properties = reactionGraphProperties(roundTrip); return /@/.test(properties.isomericSmiles) && roundTrip.atoms.some(a => a.element === 'Cl' && a.charge === -1); })()`, true, 'real charged ion-pair stereo survives product-fragment round trip');
run(`function multiplicityOutcomes(products) {
  const rule = {id: 'multiplicity-regression', name: 'Multiplicity regression', run: () => products.map(p => rxOutcome('multiplicity-regression', 'Multiplicity regression', 'test', testGraph('CCO'), '', {products: p}))};
  RX_RULES.push(rule);
  try {
    const result = predictReaction([testCompound('CCO')], defaultReactionConditions());
    return [result.best, ...result.alternatives].filter(o => o && o.id === rule.id);
  } finally { RX_RULES.pop(); }
}`);
check(`multiplicityOutcomes([[{smiles:'CCO',count:1}],[{smiles:'CCO',count:2}]]).length`, 2, 'Outcome deduplication preserves different product amounts');
check(`multiplicityOutcomes([[{smiles:'CCO',count:2}],[{smiles:'CCO'},{smiles:'CCO'}]]).length`, 1, 'Repeated entries and explicit counts describe the same product multiset');
check(`multiplicityOutcomes([[{smiles:'CCO'},{smiles:'O'}],[{smiles:'O'},{smiles:'CCO'}]]).length`, 1, 'Product order does not create duplicate outcomes');
check(`multiplicityOutcomes([[{smiles:'N[C@H](C)O'}],[{smiles:'N[C@@H](C)O'}]]).length`, 2, 'Outcome deduplication keeps opposite stereoisomers separate');
console.log('Reaction regression checks passed: ' + checks);
