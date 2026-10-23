'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console});
for(const name of ['smiles','mol','stereo','transform','pharmacology','prodrug-candidates'])vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),ctx,{filename:name+'.js'});
const run=code=>vm.runInContext(code,ctx);let checks=0;
const check=(code,value,label)=>{assert.equal(run(code),value,label);checks++;};
run(`function pg(s,n){return ProdrugCandidates.generate(buildMolecule(parseSmiles(s)),{limit:n===undefined?5:n});}`);
for(const smiles of ['CCO','Oc1ccccc1','CC(=O)O','C[C@H](O)C(=O)O','[13CH3]CO','CC[18OH]','C[NH2+]CCO','[O-][N+](=O)c1ccc(O)cc1']){
 ctx.input=smiles;
 check(`pg(input).rows.length`,5,'Five bounded designs: '+smiles);
 check(`(()=>{const m=buildMolecule(parseSmiles(input)),r=ProdrugCandidates.generate(m);return r.rows.every(x=>x.parentRecoveryVerified&&ProdrugCandidates.recoverParent(x.smiles,x.cleavage,m).verified&&!x.experimentalValidation);})()`,true,'Actual generated graph reverses exactly: '+smiles);
}
for(const smiles of ['CCN','CC(=O)N','CC(=O)OC','COOC','CC[O-]','CCO.O','C/C=C/CO','[CH2]CO','N[C@H](C)F']){ctx.input=smiles;check(`pg(input).rows.length`,0,'Unsupported state not assigned five designs: '+smiles);}
check(`pg('CCO',2).rows.length`,2,'Requested smaller limit');
check(`pg('CCO',100).rows.length`,5,'Hard maximum five');
check(`pg('CCO',0).rows.length`,0,'Zero limit honored');
check(`pg('OCCO').rows.length`,5,'Symmetric sites deduplicate');
check(`(()=>{const r=pg('OCCO').rows;return r.every((a,i)=>r.slice(i+1).every(b=>!Pharmacology.exactGraph(buildMolecule(parseSmiles(a.smiles)),buildMolecule(parseSmiles(b.smiles)))));})()`,true,'All returned structures distinct');
check(`(()=>{const m=buildMolecule(parseSmiles('C[C@H](O)C(=O)O')),before=JSON.stringify(m);ProdrugCandidates.generate(m);return before===JSON.stringify(m);})()`,true,'Input graph remains unchanged');
check(`pg('CCO').rows.every(r=>r.sourceUrl.startsWith('https://')&&r.limitations.length>=4&&r.evidenceLevel==='Unvalidated structural design'&&r.activationHypothesis.includes('could'))`,true,'Sources and hypothesis limitations retained');
check(`ProdrugCandidates.recoverParent('CCOC(C)=O','unknown',buildMolecule(parseSmiles('CCO'))).verified`,false,'Unknown cleavage mechanism rejected');
check(`ProdrugCandidates.recoverParent('CCCC','o-acyl',buildMolecule(parseSmiles('CCO'))).verified`,false,'Unrelated compound is not claimed to release parent');
console.log('Prodrug candidates: '+checks+' focused checks passed.');
