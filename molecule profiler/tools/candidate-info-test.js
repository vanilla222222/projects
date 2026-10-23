'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console});
for(const file of ['js/smiles','js/mol','js/smarts','js/stereo','js/transform','js/sites','js/descriptors','js/fingerprints','js/rules','data/metabolism','js/metabolism','js/pharmacology','js/prodrug-candidates','js/cleavable-groups','js/candidate-info'])vm.runInContext(fs.readFileSync(path.join(root,file+'.js'),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);let checks=0;const ok=(v,s)=>{assert.ok(v,s);checks++;};
run(`const catalog=[{name:'Aspirin',formula:'C9H8O4',smiles:'CC(=O)Oc1ccccc1C(=O)O'},{name:'Salicylic acid',formula:'C7H6O3',smiles:'O=C(O)c1ccccc1O'},{name:'One stereoisomer',formula:'C3H7NO2',smiles:'N[C@H](C)C(=O)O'}];`);
const known=run(`CandidateInfo.basic({smiles:'O=C(O)c1ccccc1OC(C)=O',name:'design'},{catalog})`);
ok(known.formula==='C9H8O4'&&known.name.value==='Aspirin'&&known.name.kind.includes('Exact-graph'),'Known name requires exact graph, independent of SMILES order');
const unknown=run(`CandidateInfo.basic({smiles:'N[C@@H](C)C(=O)O',name:'test derivative'},{catalog,parentName:'Input'})`);
ok(unknown.name.value==='Input — test derivative'&&unknown.name.kind.includes('not an IUPAC'),'Opposite stereochemistry cannot inherit a known name');
const charged=run(`CandidateInfo.basic({smiles:'CC[NH3+]',name:'Charged'})`);ok(!charged.bbb.available&&charged.bbb.reason.includes('charged'),'Charged input gets no unqualified BBB category');
const zwitterion=run(`CandidateInfo.basic({smiles:'[NH3+]CC(=O)[O-]'})`);ok(!zwitterion.bbb.available,'Net-neutral zwitterion is still charged');
const bad=run(`CandidateInfo.basic({smiles:'not a smiles',name:'Unknown'})`);ok(bad.status==='unavailable'&&!bad.formula&&!bad.bbb.available,'Malformed structures do not receive invented fields');
ok(run(`(()=>{const r=CandidateInfo.basic({smiles:'[13CH3]CO'});return r.formula==='C2H6O'&&r.isotopes[0].isotope===13;})()`),'Elemental formula and isotope scope remain distinct');
ok(run(`(()=>{const r=CandidateInfo.basic({smiles:'CS(=O)(=O)C'});return r.bbb.tpsa===tpsa(buildMolecule(parseSmiles('CS(=O)(=O)C')),{includeSulfurPhosphorus:true});})()`),'BBB uses TPSA including S/P contributions');
for(const smiles of ['COc1ccccc1','OCC(O)C(O)C(O)CO']){ctx.smiles=smiles;ok(run(`(()=>{const r=CandidateInfo.basic({smiles}),d=describe(buildMolecule(parseSmiles(smiles)));return r.bbb.available&&(r.bbb.label.startsWith('Likely')===boiledEgg(d).bbb);})()`),'BBB screen matches local model for '+smiles);}
run(`let treeCalls=0;const treeOriginal=metabolicTree;metabolicTree=(...args)=>{treeCalls++;return treeOriginal(...args);};`);
const priority=run(`CandidateInfo.metabolites({smiles:'CC(=O)Oc1ccccc1C(=O)O',name:'Aspirin'},{catalog})`),mass=run(`CandidateInfo.metabolites({smiles:'CC(=O)Oc1ccccc1C(=O)O',name:'Aspirin'},{catalog,order:'mass'})`);
ok(priority.rows.length===3&&priority.rows.every((r,i,a)=>!i||a[i-1].heuristicWeight>=r.heuristicWeight),'Default gives top three by heuristic priority');
ok(mass.rows.length===3&&mass.rows.every((r,i,a)=>!i||a[i-1].molecularWeight>=r.molecularWeight),'Mass sorting selects three largest generated products');
ok(run('treeCalls')===1,'Changing sort reuses the generated pool');
ok(priority.rows.every(r=>r.formula&&r.name.value&&r.smiles&&r.generation<=2),'Metabolites include labels, formula, exact structure and generation');
ok(priority.scope.includes('not measured abundance')&&priority.maxNodes===40,'Ranking scope and bounded generation exported');
ok(run(`CandidateInfo.metabolites({smiles:'FC(F)(F)F'}).rows.length`)===0,'No padding when no implemented rule applies');
const outputs=[];
for(const input of ['NCCc1ccc(OC)c(OC)c1OC','COc1ccccc1','[Cl-].CC[NH3+]','[13CH3][18O]c1ccccc1']){
 ctx.input=input;const rows=run(`ProdrugCandidates.generateQuick(buildMolecule(parseSmiles(input))).rows`);ok(rows.length===25,'Full candidate fixture');
 for(const row of (process.argv.includes('--json')?rows:rows.filter((_,i)=>i<3||i>=23))){ctx.row=row;const info=run(`CandidateInfo.basic(row,{parentName:'Fixture'})`),metabolites=run(`CandidateInfo.metabolites(row)`);ok(info.status==='calculated'&&info.formula&&info.name.value,'Candidate formula/name available');ok(metabolites.status!=='unavailable'&&metabolites.rows.length<=3,'Metabolism summary available without toxicity dependencies');outputs.push({smiles:row.smiles,info,metabolites});}
}
if(process.argv.includes('--json'))console.log(JSON.stringify(outputs));else console.log('Candidate information: '+checks+' checks passed across '+outputs.length+' candidate summaries.');
