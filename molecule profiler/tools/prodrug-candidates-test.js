'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console});
for(const name of ['smiles','mol','stereo','transform','pharmacology','prodrug-candidates'])vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),ctx,{filename:name+'.js'});
const run=code=>vm.runInContext(code,ctx);let checks=0;
const check=(code,value,label)=>{assert.equal(run(code),value,label);checks++;};
run(`function pg(s,n){return ProdrugCandidates.generate(buildMolecule(parseSmiles(s)),{limit:n===undefined?5:n});}`);
for(const smiles of ['CCO','Oc1ccccc1','CC(=O)O','C[C@H](O)C(=O)O','[13CH3]CO','CC[18OH]','C[NH2+]CCO','[O-][N+](=O)c1ccc(O)cc1','CCN','CCNC','N1CCCCC1','CC[NH3+]','CC[NH2+]C','CC(=O)[O-]','[NH3+]CC(=O)[O-]','[15NH2]CC','N[C@H](C)F']){
 ctx.input=smiles;
 check(`pg(input).rows.length`,5,'Five bounded designs: '+smiles);
 check(`(()=>{const m=buildMolecule(parseSmiles(input)),r=ProdrugCandidates.generate(m);return r.rows.every(x=>x.parentRecoveryVerified&&ProdrugCandidates.recoverParent(x.smiles,x.cleavage,m).verified&&!x.experimentalValidation);})()`,true,'Actual generated graph reverses exactly: '+smiles);
}
for(const smiles of ['CC(=O)N','CC(=O)OC','COOC','CC[O-]','CCO.O','C/C=C/CO','[CH2]CO']){ctx.input=smiles;check(`pg(input).rows.length`,0,'Unsupported state not assigned five designs: '+smiles);}
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
for(const smiles of ['CC(=O)N','CNC(=O)OC','CNS(=O)(=O)C','NC(=N)N','NN','C[N+](C)(C)C','c1ccncc1','c1cc[nH]c1','CCCC']){ctx.input=smiles;check(`pg(input).status`,'no-compatible-site','Non-amine nitrogen or no compatible handle: '+smiles);}
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
console.log('Prodrug candidates: '+checks+' focused checks passed.');
