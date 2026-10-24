'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');for(const name of ['smiles','mol','smarts','stereo','transform','pharmacology','prodrug-candidates','cleavable-groups'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'));
const parse=s=>buildMolecule(parseSmiles(s));let checks=0;const ok=(v,s)=>{assert.ok(v,s);checks++;};
const fixtures=['CCO','Oc1ccccc1','CC(=O)O','CCN','CCNC','CCS','CC(=O)N','CC=O','CC(=O)C','NCCO','[Cl-].CC[NH3+]','[Na+].CC(=O)[O-]','C/C=C/CO','C[C@H](O)C(=O)O','[13CH3]CO','CC[18OH]'];
const reports=[];
for(const s of fixtures){const m=parse(s),before=JSON.stringify(m),r=ProdrugCandidates.generateQuick(m);ok(r.rows.length===25,'25 distinct candidates for '+s+' (got '+r.rows.length+')');ok(JSON.stringify(m)===before,'Immutable input');ok(r.rows.every(row=>row.parentRecoveryVerified&&!row.experimentalValidation),'Unvalidated designs retain recovery checks');ok(r.sampling.positionCounts.reduce((n,p)=>n+p.count,0)===r.rows.length,'Sampling counts match rows');ok(r.sampling.positionCounts.length<=5&&r.sampling.attempts<=300,'Position and attempt bounds');for(let i=0;i<r.rows.length;i++)for(let j=0;j<i;j++)assert.ok(!Pharmacology.exactGraph(parse(r.rows[i].smiles),parse(r.rows[j].smiles)),'No duplicate molecular graphs');checks++;reports.push({parent:s,report:r});}
const five='OCC(O)CC(O)CC(O)CCO',r=ProdrugCandidates.generateQuick(parse(five));
ok(r.sampling.positionCounts.length===5&&r.sampling.positionCounts.every(p=>p.count===5),'Five compatible positions receive five designs each');reports.push({parent:five,report:r});
const six='OCC(O)CC(O)CC(O)CC(O)CCO',s=ProdrugCandidates.generateQuick(parse(six));ok(s.sampling.positionCounts.length===5&&s.rows.length===25,'More than five positions stays bounded to five');
const prefer=ProdrugCandidates.generateQuick(parse('CN(C)CC(O)CC(O)CC(O)CC(O)CCO'));ok(prefer.sampling.positionCounts.length===5&&prefer.sampling.positionCounts.every(p=>p.element==='O'&&p.count===5),'Five full-capacity sites are preferred over a sparse N-oxide position');
const two=ProdrugCandidates.generateQuick(parse('NCCO'));ok(two.sampling.positionCounts.length===2&&two.sampling.positionCounts.every(p=>p.count>5),'Unused position capacity is redistributed');
const one=ProdrugCandidates.generateQuick(parse('CCO'));ok(one.sampling.positionCounts.length===1&&one.sampling.positionCounts[0].count===25,'One position fills all 25 slots');
const scarce=ProdrugCandidates.generateQuick(parse('CN(C)CCO'));ok(scarce.rows.length===25&&scarce.sampling.positionCounts.find(p=>p.element==='N').count===1&&scarce.sampling.positionCounts.find(p=>p.element==='O').count===24,'Sparse nitrogen library reallocates to oxygen');
const oxide=ProdrugCandidates.generateQuick(parse('CCN(C)C'));ok(oxide.rows.length===1&&oxide.sampling.shortfall===24&&oxide.reasons.some(s=>s.includes('not padded')),'Limited supported chemistry reports a truthful shortfall');
const extended=ProdrugCandidates.generateQuick(parse(six),{limit:999});ok(extended.rows.length<=100&&extended.sampling.target===100,'Extended quick session capped at 100');
const initial=ProdrugCandidates.generateQuick(parse('NCCc1ccc(OC)c(OC)c1OC')),next=ProdrugCandidates.generateQuick(parse('NCCc1ccc(OC)c(OC)c1OC'),{limit:30});ok(next.rows.length===30,'Five additional designs are available across mixed positions');ok(initial.rows.every((r,i)=>r.smiles===next.rows[i].smiles),'Extending limit retains the original 25 in order');ok(new Set(next.rows.map(r=>r.smiles)).size===30,'Extended designs have unique SMILES');
ok(ProdrugCandidates.generateQuick(parse('CCO'),{limit:7}).rows.length===7,'Smaller quick requests honored');
ok(ProdrugCandidates.generateQuick(parse('CCO'),{limit:0}).rows.length===0,'Zero request honored');
ok(ProdrugCandidates.generate(parse('CCO')).rows.length===5&&ProdrugCandidates.sites(parse('CCO'))[0].designs.length===5,'Compact builder default remains five');
ok(ProdrugCandidates.generateQuick(parse('CCO.O')).rows.length===0,'Unsupported mixtures stay excluded');

for(const parent of ['NCCc1ccc(OC)c(OC)c1OC','NCCc1cc(OC)c(OC)c(OC)c1OC','COc1ccccc1','[Cl-].[NH3+]CCc1ccc(OC)c(OC)c1OC','COc1ccc(C[C@H](N)C)cc1','COc1ccc(/C=C/C)cc1','[13CH3][18O]c1ccc(CCN)cc1','CCOc1ccc(CCN)cc1','COC','COc1cc(OC)c(OC)c(OC)c1OC']){
 const input=parse(parent),before=JSON.stringify(input),report=ProdrugCandidates.generateQuick(input),ether=report.rows.filter(r=>r.designMode==='ether-redesign');
 ok(report.rows.length===25&&ether.length>0,'Quick includes ether positions and fills 25: '+parent);
 ok(JSON.stringify(input)===before,'Mixed sampling does not mutate input');
 ok(ether.every(r=>!r.parentRecoveryVerified&&r.recoveredParentSmiles===null&&r.releaseTargetVerified&&r.releaseCheck.steps.length===2&&!r.experimentalValidation),'Different OH target is explicit and verified through two formal steps');
 ok(report.rows.filter(r=>r.designMode!=='ether-redesign').every(r=>r.parentRecoveryVerified),'Original-parent checks remain mandatory for other designs');
 ok(report.sampling.positionCounts.reduce((n,p)=>n+p.count,0)===25&&report.sampling.positionCounts.length<=5,'Mixed position accounting remains bounded');
 for(let i=0;i<report.rows.length;i++)for(let j=0;j<i;j++)assert.ok(!Pharmacology.exactGraph(parse(report.rows[i].smiles),parse(report.rows[j].smiles)),'Mixed batch has no duplicate molecular graphs');
 if(parent==='NCCc1ccc(OC)c(OC)c1OC')ok(report.sampling.positionCounts.length===4&&report.sampling.positionCounts.filter(s=>s.kind==='methoxy ether redesign').length===3&&report.sampling.positionCounts.every(p=>p.count>=5),'Three methoxys plus amine each receive at least five designs');
 if(parent==='NCCc1cc(OC)c(OC)c(OC)c1OC')ok(report.sampling.positionCounts.length===5&&report.sampling.positionCounts.every(p=>p.count===5),'Four methoxys plus amine receive five designs each');
 if(parent.startsWith('[Cl-]'))ok(ether.every(r=>r.parentRecoveryScope.includes('original input recovery is not claimed')&&r.id.startsWith('redesign:'+r.site.atom+'-'+r.site.etherOxygen+':')&&input.atoms[r.site.atom].element==='C'&&input.bonds.some(b=>b.a===r.site.atom&&b.b===r.site.etherOxygen||b.b===r.site.atom&&b.a===r.site.etherOxygen)),'Salt maps carbon and oxygen to original input indices');
 reports.push({parent,report});
}
ok(ProdrugCandidates.generate(parse('NCCc1ccc(OC)cc1')).rows.every(r=>r.parentRecoveryVerified),'Regular parent-recovery API keeps its original scope');
ok(CleavableGroups.redesignSites(parse('COc1ccccc1'))[0].designs.length===7,'Site builder retains seven ether variants');
if(process.argv.includes('--json'))console.log(JSON.stringify(reports));else console.log('Quick candidate sampling: '+checks+' focused checks passed.');
