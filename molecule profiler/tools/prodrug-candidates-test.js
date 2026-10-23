'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console});
for(const name of ['smiles','mol','smarts','stereo','transform','pharmacology','prodrug-candidates'])vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),ctx,{filename:name+'.js'});
const run=code=>vm.runInContext(code,ctx);let checks=0;
const check=(code,value,label)=>{assert.equal(run(code),value,label);checks++;};
run(`function pg(s,n){return ProdrugCandidates.generate(buildMolecule(parseSmiles(s)),{limit:n===undefined?5:n});}`);
for(const smiles of ['CCO','Oc1ccccc1','CC(=O)O','C[C@H](O)C(=O)O','[13CH3]CO','CC[18OH]','C[NH2+]CCO','[O-][N+](=O)c1ccc(O)cc1','CCN','CCNC','N1CCCCC1','CC[NH3+]','CC[NH2+]C','CC(=O)[O-]','[NH3+]CC(=O)[O-]','[15NH2]CC','N[C@H](C)F']){
 ctx.input=smiles;
 check(`pg(input).rows.length`,5,'Five bounded designs: '+smiles);
 check(`(()=>{const m=buildMolecule(parseSmiles(input)),r=ProdrugCandidates.generate(m);return r.rows.every(x=>x.parentRecoveryVerified&&ProdrugCandidates.recoverParent(x.smiles,x.cleavage,m).verified&&!x.experimentalValidation);})()`,true,'Actual generated graph reverses exactly: '+smiles);
}
for(const smiles of ['CC(=O)OC','COOC','CCO.O','[CH2]CO']){ctx.input=smiles;check(`pg(input).rows.length`,0,'Unsupported state not assigned five designs: '+smiles);}
check(`pg('CCO',2).rows.length`,2,'Requested smaller limit');
check(`pg('CCO',100).rows.length`,5,'Hard maximum five');
check(`pg('CCO',0).rows.length`,0,'Zero limit honored');
check(`pg('OCCO').rows.length`,5,'Symmetric sites deduplicate');
check(`(()=>{const r=pg('OCCO').rows;return r.every((a,i)=>r.slice(i+1).every(b=>!Pharmacology.exactGraph(buildMolecule(parseSmiles(a.smiles)),buildMolecule(parseSmiles(b.smiles)))));})()`,true,'All returned structures distinct');
check(`(()=>{const m=buildMolecule(parseSmiles('C[C@H](O)C(=O)O')),before=JSON.stringify(m);ProdrugCandidates.generate(m);return before===JSON.stringify(m);})()`,true,'Input graph remains unchanged');
check(`pg('CCO').rows.every(r=>r.sourceUrl.startsWith('https://')&&r.limitations.length>=4&&r.evidenceLevel==='Unvalidated structural design'&&r.activationHypothesis.includes('could'))`,true,'Sources and hypothesis limitations retained');
check(`ProdrugCandidates.recoverParent('CCOC(C)=O','unknown',buildMolecule(parseSmiles('CCO'))).verified`,false,'Unknown cleavage mechanism rejected');
check(`ProdrugCandidates.recoverParent('CCCC','o-acyl',buildMolecule(parseSmiles('CCO'))).verified`,false,'Unrelated compound is not claimed to release parent');
for(const smiles of ['CCN(C)C','CC[NH+](C)C','CN1CCCCC1']){
 ctx.input=smiles;
 check(`pg(input).rows.length`,1,'One distinct N-oxide per tertiary amine: '+smiles);
 check(`(()=>{const m=buildMolecule(parseSmiles(input)),r=pg(input);return r.rows.every(x=>x.cleavage==='n-oxide'&&ProdrugCandidates.recoverParent(x.smiles,x.cleavage,m).verified);})()`,true,'N-oxide restores exact supplied parent state');
}
for(const smiles of ['CNS(=O)(=O)C','NC(=N)N','NN','C[N+](C)(C)C','c1cc[nH]c1','CCCC']){ctx.input=smiles;check(`pg(input).status`,'no-compatible-site','Non-amine nitrogen or no compatible handle: '+smiles);}
check(`pg('CCN').rows.every(r=>r.cleavage==='n-carbamate'&&r.name.includes('N')&&r.sourceUrl.includes('2892933')&&r.limitations.some(s=>s.includes('formaldehyde')))`,true,'Amine candidates carry appropriate chemistry and sources');
check(`pg('CC[NH3+]').rows.every(r=>r.limitations.some(s=>s.includes('charge'))&&r.parentRecoveryScope.includes('charge'))`,true,'Charge restoration is bookkeeping, not a pKa prediction');
for(const smiles of ['CC[NH3+]','CCN(C)C','[NH3+]CC(=O)[O-]','[15NH2]CC','N[C@H](C)F']){
 ctx.input=smiles;
 check(`(()=>{const m=buildMolecule(parseSmiles(input)),before=JSON.stringify(m);ProdrugCandidates.generate(m);return before===JSON.stringify(m);})()`,true,'Expanded designs do not mutate input: '+smiles);
}
check(`pg('NCCO').eligibleSites.some(s=>s.element==='N')&&pg('NCCO').eligibleSites.some(s=>s.element==='O')`,true,'Mixed functional groups are represented');
check(`pg('NCCO').rows.slice(0,2).map(r=>r.site.kind).join(',')`,'primary amine,alcohol','Round-robin visits nitrogen and oxygen before homologues');
check(`ProdrugCandidates.recoverParent('CCCC','n-carbamate',buildMolecule(parseSmiles('CCN'))).verified`,false,'Unrelated graph is not a carbamate release');
for(const smiles of ['CCS','CC[S-]','Sc1ccccc1','NCCS']){
 ctx.input=smiles;
 check(`(()=>{const m=buildMolecule(parseSmiles(input)),site=ProdrugCandidates.sites(m).find(s=>s.element==='S'),r=ProdrugCandidates.generate(m,{atom:site.atom});return r.rows.length===3&&r.rows.every(x=>x.cleavage==='s-acyl'&&x.site.atom===site.atom&&ProdrugCandidates.recoverParent(x.smiles,x.cleavage,m).verified);})()`,true,'Three sulfur designs recover supplied parent: '+smiles);
}
check(`(()=>{const m=buildMolecule(parseSmiles('NCCO')),r=ProdrugCandidates.generate(m,{atom:3,designId:'phosphate',limit:1});return r.rows.length===1&&r.rows[0].site.atom===3&&r.rows[0].cleavage==='o-phosphate';})()`,true,'Explicit site and template choose an O-phosphate instead of default nitrogen');
check(`(()=>{const m=buildMolecule(parseSmiles('OCC(O)C(O)C(O)C(O)CO')),site=ProdrugCandidates.sites(m).at(-1),r=ProdrugCandidates.generate(m,{atom:site.atom,designId:'acetyl',limit:1});return r.rows.length===1&&r.rows[0].site.atom===site.atom;})()`,true,'A site beyond the global five-candidate cap remains selectable');
check(`ProdrugCandidates.generate(buildMolecule(parseSmiles('NCCO')),{atom:1}).rows.length`,0,'Selecting a carbon cannot fall back to a different site');
check(`ProdrugCandidates.generate(buildMolecule(parseSmiles('NCCO')),{atom:0,designId:'phosphate'}).rows.length`,0,'Mismatched template cannot modify another site');
check(`ProdrugCandidates.generate(buildMolecule(parseSmiles('CCO')),{atom:-1}).rows.length`,0,'Invalid input atom rejected');
check(`(()=>{const m=buildMolecule(parseSmiles('NCCO'));return ProdrugCandidates.generate(m).rows.every(r=>{const c=buildMolecule(parseSmiles(r.smiles));return c.bonds.some(b=>(b.a===r.attachment.parentAtom&&b.b===r.attachment.promoietyAtom)||(b.b===r.attachment.parentAtom&&b.a===r.attachment.promoietyAtom));});})()`,true,'Attachment indices belong to serialized candidate graph');
for(const smiles of ['CSSC','CS(=O)C','CS(=O)(=O)C','CC(=O)S']){ctx.input=smiles;check(`ProdrugCandidates.sites(buildMolecule(parseSmiles(input))).some(s=>s.element==='S')`,false,'Non-thiol sulfur excluded: '+smiles);}
for(const [smiles,count,kind] of [['CC(=O)N',4,'amide/lactam N–H'],['CNC(=O)C',4,'amide/lactam N–H'],['O=C1NCCC1',4,'amide/lactam N–H'],['O=C1NC(=O)CC1',4,'imide N–H'],['O=C1[N-]C(=O)CC1',4,'imide N–H'],['c1ccncc1',1,'pyridine-like nitrogen'],['c1cc[nH+]cc1',1,'pyridine-like nitrogen'],['[O-]c1ccccc1',5,'phenolate'],['CC[O-]',5,'alkoxide']]){
 ctx.input=smiles;ctx.expectedKind=kind;
 check(`pg(input).rows.length`,count,'New compatible class: '+smiles);
 check(`(()=>{const p=buildMolecule(parseSmiles(input)),r=pg(input);return r.rows.every(x=>x.site.kind===expectedKind&&ProdrugCandidates.recoverParent(x.smiles,x.cleavage,p).verified&&!x.experimentalValidation);})()`,true,'New class restores complete parent: '+smiles);
}
for(const smiles of ['[Cl-].CC[NH3+]','CC[NH3+].[Cl-]','[Na+].CC(=O)[O-]','[Cl-].[NH3+][C@H](C)CO']){
 ctx.input=smiles;
 check(`(()=>{const p=buildMolecule(parseSmiles(input)),before=JSON.stringify(p),r=pg(input);return r.rows.length>0&&r.normalization.applied&&r.rows.every(x=>x.normalization.removedAtoms.length===1&&x.parentRecoveryScope.includes('not the complete salt')&&ProdrugCandidates.recoverParent(x.smiles,x.cleavage,p).verified)&&before===JSON.stringify(p);})()`,true,'Recognized salt is explicit and original input immutable: '+smiles);
}
check(`(()=>{const p=buildMolecule(parseSmiles('[Cl-].CC[NH3+]')),site=ProdrugCandidates.sites(p)[0],r=ProdrugCandidates.generate(p,{atom:3,designId:site.designs[0].id,limit:1});return site.atom===3&&r.rows.length===1&&r.rows[0].site.atom===3&&r.rows[0].site.parentAtom===2;})()`,true,'Leading counterion preserves input atom numbering');
check(`ProdrugCandidates.generate(buildMolecule(parseSmiles('[Cl-].CC[NH3+]')),{atom:0}).rows.length`,0,'Counterion cannot become a design site');
for(const smiles of ['CCO.O','CCO.[Na+]','CCN.CC(=O)O','CCN.Cl','CC[NH3+].[Cl-].[Cl-]','[Na+].[Cl-]','[Ca+2].CC(=O)[O-].CC(=O)[O-]']){ctx.input=smiles;check(`pg(input).rows.length`,0,'Ambiguous or unbalanced mixture is not stripped: '+smiles);}
check(`ProdrugCandidates.generate(buildMolecule(parseSmiles('CC(=O)N')),{atom:3,designId:'nh-phosphoryloxymethyl',limit:1}).rows[0].cleavage`,'n-linker','Selected carbonyl-linked NH supports a phosphate trigger');
check(`ProdrugCandidates.generate(buildMolecule(parseSmiles('c1ccncc1')),{atom:3,designId:'aromatic-n-oxide',limit:1}).rows[0].cleavage`,'aromatic-n-oxide','Aromatic nitrogen has its own template');
for(const smiles of ['CC=O','CC(=O)C','O=Cc1ccccc1','O=C1CCCCC1','C=O','[13CH3]C(=O)C','N[C@H](C)CC=O']){
 ctx.input=smiles;
 check(`(()=>{const p=buildMolecule(parseSmiles(input)),site=ProdrugCandidates.sites(p).find(s=>s.kind==='aldehyde carbonyl'||s.kind==='ketone carbonyl'),r=ProdrugCandidates.generate(p,{atom:site.atom});return r.rows.length===2&&r.rows.every(x=>x.cleavage.startsWith('carbonyl-')&&ProdrugCandidates.recoverParent(x.smiles,x.cleavage,p).verified&&x.limitations.some(t=>t.includes('E/Z')));})()`,true,'Carbonyl templates restore original graph: '+smiles);
}
for(const smiles of ['CC(=[18O])C','CC(=O)O','CC(=O)N','COC(=O)OC']){ctx.input=smiles;check(`ProdrugCandidates.sites(buildMolecule(parseSmiles(input))).some(s=>s.kind==='aldehyde carbonyl'||s.kind==='ketone carbonyl')`,false,'Condensation excludes labelled carbonyl oxygen and acyl derivatives: '+smiles);}
check(`(()=>{const p=buildMolecule(parseSmiles('[Cl-].[NH3+]CCC=O')),site=ProdrugCandidates.sites(p).find(s=>s.kind==='aldehyde carbonyl'),r=ProdrugCandidates.generate(p,{atom:site.atom,designId:'carbonyl-oxime',limit:1});return site.carbonylOxygen===5&&r.rows.length===1&&r.rows[0].normalization.applied;})()`,true,'Carbonyl salt preserves input oxygen and selection indices');
check(`(()=>{const p=buildMolecule(parseSmiles('CC(=O)C')),before=JSON.stringify(p);ProdrugCandidates.generate(p);return JSON.stringify(p)===before;})()`,true,'Condensation does not mutate input');
for(const smiles of ['C/C=C/CO','C/C=C\\CO','OC/C=C/C=C/C','OC[C@H](F)/C=C/C']){ctx.input=smiles;check(`pg(input).rows.length>0`,true,'Specified alkene geometry permits validated designs: '+smiles);}
console.log('Prodrug candidates: '+checks+' focused checks passed.');
