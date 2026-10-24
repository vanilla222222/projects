'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');const root=path.join(__dirname,'..');
for(const n of ['smiles','mol','smarts','stereo','transform','descriptors','rules','pharmacology','prodrug-candidates','cleavable-groups','prodrug-explorer','prodrug-priority','candidate-info','candidate-release','candidate-dashboard'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
const parse=s=>buildMolecule(parseSmiles(s));let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;},fixtures=[];
for(const [smiles,id,steps,kind] of [['CCO','acetyl',1,'original-input'],['N[C@@H](C)CO','acetyl',1,'original-input'],['C/C=C/CO','acetyl',1,'original-input'],['CCS','s-acetyl',1,'original-input'],['CCO','phosphate',1,'original-input'],['CCN(C)C','n-oxide',1,'original-input'],['CC(=O)N','nh-hydroxymethyl',1,'original-input'],['CCN','amine-acetoxy',3,'original-input'],['CC(=O)O','methyl',1,'original-input'],['CC=O','carbonyl-oxime',1,'original-input'],['[13CH3]CO','acetyl',1,'original-input'],['CC[NH3+]','amine-acetoxy',0,'original-input']]){
 const input=parse(smiles),candidate=ProdrugCandidates.generate(input,{designId:id,limit:1}).rows[0],result=CandidateRelease.inspect(input,candidate);
 ok(result.releaseTarget.status==='verified'&&result.releaseTarget.kind===kind,'Declared identity checked '+smiles);
 ok(result.steps.length===steps,'Supported formal step count '+smiles);
 if(steps){ok(result.status==='formal-route-found'&&result.steps.every(s=>s.cutBonds.length&&s.products.every(p=>p.formula)),'Every step has explicit cleavage bonds and products');fixtures.push({input:smiles,candidate,result});}
 else ok(result.status!=='formal-route-found'&&result.byproducts===null,'Charge-state gap cannot imply complete physiological recovery');
 ok(CandidateRelease.inspect(parse('CCCC'),candidate).status==='unverified-target','Mismatched parent rejected');
}
for(const smiles of ['COc1ccccc1','NCCc1ccc(OC)c(OC)c1OC']){
 const input=parse(smiles),rows=ProdrugCandidates.generateQuick(input).rows,report=CandidateDashboard.build({name:'Input',smiles,mol:input},rows);ok(report.rows.length===25,'All 25 candidates retained');
 ok(report.rows.every(r=>r.properties.formula&&Number.isFinite(r.properties.logS)&&r.properties.bbb),'Every row has properties and a scoped BBB screen');
 const ether=rows.find(r=>r.designMode==='ether-redesign'),release=CandidateRelease.inspect(input,ether);
 ok(release.status==='formal-route-found'&&release.steps.length===2&&release.releaseTarget.kind==='different-analogue'&&!release.releaseTarget.originalInputRecovered,'Methoxy design releases OH analogue in two formal steps');fixtures.push({input:smiles,candidate:ether,result:release});
 ok(CandidateRelease.inspect(input,{...ether,releaseTargetSmiles:smiles}).status==='unverified-target','Tampered ether target rejected');
 const before=JSON.stringify(report),sorted=CandidateDashboard.filterSort(report.rows,{sort:'mw',direction:'desc'});ok(sorted.every((r,i)=>!i||sorted[i-1].properties.mw>=r.properties.mw),'Sortable table preserves numeric meaning');ok(JSON.stringify(report)===before,'Sorting does not mutate report');
 ok(CandidateDashboard.filterSort(report.rows,{kind:'different-analogue'}).every(r=>r.candidate.designMode==='ether-redesign'),'Different-target designs filter separately');
 ok(CandidateDashboard.csv(report).split('\n').filter(Boolean).length===26,'CSV includes all 25 candidates, not just visible filters');
}
const salt='[Na+].CC(=O)[O-]',mol=parse(salt),candidate=ProdrugCandidates.generate(mol,{designId:'methyl',limit:1}).rows[0];ok(CandidateRelease.target(mol,candidate).kind==='organic-component','Salt recovery is scoped to its organic component');
const fake={rows:[{index:0,name:'=test',smiles:'CC',properties:{mw:1},delta:{mw:-2}}]};ok(CandidateDashboard.csv(fake).includes("'=test"),'CSV formula prefix is neutralized without losing its text');
if(process.argv.includes('--json'))console.log(JSON.stringify(fixtures));else console.log('Candidate dashboard and release audit: '+checks+' checks passed.');
