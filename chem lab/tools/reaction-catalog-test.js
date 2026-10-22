#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const context = vm.createContext({ console, setTimeout, clearTimeout });
const files = ['elements', 'graph', 'valence', 'stereo', 'naming-core', 'naming-chain', 'naming-ring', 'naming-scaffolds', 'naming-general', 'common-names-extra', 'naming-elements', 'properties', 'layout', 'smiles', 'reactions', 'reaction-stereo', 'reaction-rules', 'reaction-rules-extra', 'reaction-rules-extra2', 'reaction-aromatic', 'reaction-rules-extra3'];
if (fs.existsSync(path.join(root, 'js/reaction-rules-extra4.js'))) files.push('reaction-rules-extra4');
files.push('reaction-catalog');
files.forEach((file) => vm.runInContext(fs.readFileSync(path.join(root, 'js', file + '.js'), 'utf8'), context, { filename: file + '.js' }));
const run = (code) => vm.runInContext(code, context);
let checks = 0;
const check = (code, expected, label) => { assert.equal(run(code), expected, label); checks++; };
check('reactionCatalog().length === RX_RULES.length && RX_RULES.length > 60', true, 'every supported rule is catalogued');
check('new Set(reactionCatalog().map(r=>r.id)).size === RX_RULES.length', true, 'stable rule IDs are unique');
check('reactionCatalog().every(r=>r.id && r.name && r.family && r.scope && r.assumptions.length && r.limitations.length && r.experimentalValidation===false)', true, 'descriptors state scope and limits without claiming experimental validation');
check("reactionCatalog('thioether').some(r=>r.id==='thiolate-alkylation')", true, 'name search');
check("reactionCatalog('aqueous').some(r=>r.id==='disulfide-reduction')", true, 'scope search');
check("reactionCatalog('',{family:'Sulfur'}).every(r=>r.family==='Sulfur')", true, 'family filter');
check("reactionCatalog('thiolate primary',{family:'Sulfur'}).some(r=>r.id==='thiolate-alkylation')", true, 'multi-term search and filter');
check("reactionCatalog('definitely-no-rule-matches-this').length", 0, 'no-match search');
check("reactionRuleDescriptor('missing-rule')", null, 'unknown rule returns no invented descriptor');
check("reactionRuleDescriptor('thiolate-alkylation').references[0].kind", 'teaching', 'reference provenance is explicit');
check("reactionRuleDescriptor('disulfide-reduction').references[0].url", 'https://doi.org/10.1021/jo00008a014', 'primary TCEP reference');
check("reactionRuleDescriptor('diels-alder').references.length===0 && /not yet recorded/.test(reactionRuleDescriptor('diels-alder').sourceStatus)", true, 'uncurated references are disclosed rather than fabricated');
check("(()=>{const d=reactionRuleDescriptor('fischer');d.assumptions.push('mutation');d.references[0].url='bad';const next=reactionRuleDescriptor('fischer');return !next.assumptions.includes('mutation') && next.references[0].url!=='bad';})()", true, 'callers cannot mutate catalog state');
check("(()=>{try{reactionRegisterRule({id:'fischer',name:'Duplicate',run(){}})}catch(e){return /Duplicate/.test(e.message)}return false})()", true, 'duplicate registration is rejected');
check("(()=>{try{reactionRegisterRule({id:'bad id',name:'Bad',run(){}})}catch(e){return /stable id/.test(e.message)}return false})()", true, 'malformed registration is rejected');
run("function catalogCompound(smiles,role){return {smiles,fragment:smilesToFragment(smiles),role:role||'reactant',name:smiles,equivalents:1}};");
check("(()=>{const r=predictReaction([catalogCompound('CCBr'),catalogCompound('[Na+].[OH-]','reagent')],{...defaultReactionConditions(),solvents:['dmso']});return r.best.rule==='halide' && r.best.evidence.id==='halide' && r.best.evidence.outcomeId==='sn2' && r.best.evidence.references.length>0 && r.best.evidence.experimentalValidation===false})()", true, 'matched rule provenance follows a specific outcome branch');
check("(()=>{const r=predictReaction([catalogCompound('CCBr'),catalogCompound('CS'),catalogCompound('[Na+].[OH-]','reagent')],{...defaultReactionConditions(),solvents:['dmso']});return [r.best,...r.alternatives].filter(Boolean).every(o=>o.evidence && o.evidence.id===o.rule && o.evidence.evidenceLevel==='Rule-based prediction')})()", true, 'all alternatives carry evidence');
check("(()=>{const e=reactionOutcomeEvidence({id:'unknown',name:'Unknown',reason:'Local match'},{id:'unknown'});return e.references.length===0 && e.experimentalValidation===false && /not yet recorded/.test(e.sourceStatus)})()", true, 'unregistered outcome evidence is explicitly incomplete');
check("(()=>{const g=reactionFragmentGraph(smilesToFragment('CCO'));g.atoms[0].isotope=13;g.bonds[0].stereoSpecified=false;const f=rxComponentFragment(g,g.atoms.map(a=>a.id));return f.atoms[0].isotope===13 && f.bonds[0].stereoSpecified===false && f.atoms[0]!==g.atoms[0] && f.bonds[0]!==g.bonds[0]})()", true, 'reaction fragments retain isotope and explicit stereo markers without aliasing');

// Render with a deliberately tiny DOM; all supplied text must stay text rather
// than becoming HTML, and external links need safe target attributes.
context.document = { createElement(tag) { return { tag, children: [], textContent: '', appendChild(child) { this.children.push(child); return child; }, append(...children) { this.children.push(...children); } }; } };
run("var viewEvidence = reactionOutcomeEvidence({id:'sn2',rule:'halide',name:'SN2',reason:'match'}); viewEvidence.scope='<img src=x onerror=alert(1)>'; var evidenceNode=reactionEvidenceElement(viewEvidence);");
check('evidenceNode.open', true, 'outcome caveats are visible by default');
check("evidenceNode.children.some(n=>n.textContent==='<img src=x onerror=alert(1)>')", true, 'supplied text is not interpreted as HTML');
check("evidenceNode.children.flatMap(n=>n.children||[]).filter(n=>n.tag==='a').every(a=>a.target==='_blank' && a.rel==='noopener noreferrer' && a.href.startsWith('https://'))", true, 'external sources use safe links');
check("reactionEvidenceElement(reactionRuleDescriptor('fischer'),true).open", false, 'catalog cards can collapse details');
console.log('Reaction catalog: ' + checks + ' checks passed (' + run('RX_RULES.length') + ' descriptors).');
