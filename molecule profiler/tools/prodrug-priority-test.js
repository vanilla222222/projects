'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');for(const name of ['smiles','mol','smarts','stereo','transform','descriptors','pharmacology','prodrug-candidates','cleavable-groups','prodrug-explorer','prodrug-priority'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(root,'data/pharmacology-evidence.js'),'utf8'));
const parse=s=>buildMolecule(parseSmiles(s));let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const candidate=(s,id)=>ProdrugCandidates.generate(parse(s),{designId:id,limit:1}).rows[0];
const fixtures=[['CCO','acetyl'],['CC(=O)O','methyl'],['CCN','amine-acetoxy'],['CC=O','carbonyl-oxime'],['CC=O','carbonyl-hydrazone'],['NCCO','acetyl'],['CC[NH3+]','amine-acetoxy'],['C/C=C/CO','acetyl'],['[13CH3]CO','acetyl']];
const reports=[];
for(const [s,id] of fixtures){const input=parse(s),row=candidate(s,id),before=JSON.stringify(input),report=ProdrugPriority.assess(input,[row]);ok(report.rows.length===1,'Reviewed '+s+' '+id);ok(JSON.stringify(input)===before,'Input unchanged');const result=report.rows[0];ok(result.evidence.kind==='class-precedent'&&result.experimentalValidation===false,'Generated research evidence stays unvalidated');ok(result.route.visited<=32&&result.route.attempts<=96,'Bounded route search');reports.push({parent:s,candidate:row.smiles,review:result});}
for(const [index,name] of [[1,'Methanol'],[3,'Hydroxylamine'],[4,'Hydrazine']])ok(reports[index].review.byproducts.some(p=>p.name===name&&p.catalogMatch&&p.source.url.startsWith('https:')),'Exact concern lookup: '+name);
ok(reports[0].review.unlistedProducts>0&&reports[0].review.byproducts.some(p=>p.concern.includes('no safety conclusion')),'Unlisted product is not called safe');
ok(reports[5].review.competing.otherHandleCount===1,'Other parent handle counted');
ok(reports[2].review.competing.alternativeCount>0,'Alternative candidate transformation counted');
ok(reports[6].review.route.status!=='found'&&reports[6].review.concernMatches===null&&reports[6].review.byproducts===null,'Charge-state gap remains unresolved and concerns unknown');
const acid=parse('CC(=O)O'),methyl=candidate('CC(=O)O','methyl');
ok(ProdrugPriority.assess(acid,[methyl,methyl]).rows.length===1,'Duplicate structures deduplicate');
ok(ProdrugPriority.assess(parse('CCO'),[methyl]).excluded.length===1,'Mismatched parent rejected despite recovery flag');
ok(ProdrugPriority.assess(acid,[{...methyl,parentRecoveryVerified:false}]).rows.length===0,'Unverified candidate rejected');
ok(ProdrugPriority.assess(parse('CCO.O'),[methyl]).rows.length===0,'Unsupported mixture rejected');
const ref=PHARMACOLOGY_EVIDENCE.relationships.find(r=>r.prodrug.name==='Enalapril'),enalaprilat=parse(ref.active.smiles),enalaprilRows=ProdrugCandidates.generate(enalaprilat,{designId:'ethyl',limit:5}).rows;
const exactPair=ProdrugPriority.assess(enalaprilat,enalaprilRows);
ok(exactPair.rows.some(r=>r.evidence.kind==='exact-curated-pair'&&r.evidence.relationship.prodrug==='Enalapril'),'Both full graphs match actual curated pair');
ok(exactPair.rows.some(r=>r.evidence.kind==='class-precedent'),'Other ester position does not inherit pair evidence');
const differentParent=parse(ref.active.smiles.replace('[C@@H]','[C@H]')),mirrors=ProdrugCandidates.generate(differentParent,{designId:'ethyl',limit:5}).rows;
ok(ProdrugPriority.assess(differentParent,mirrors).rows.every(r=>r.evidence.kind!=='exact-curated-pair'),'Stereo mismatch cannot inherit curated pair');
const unrelated=[{...ref,active:{name:'Wrong parent',smiles:'CCO'}}];
ok(ProdrugPriority.assess(enalaprilat,enalaprilRows,{relationships:unrelated}).rows.every(r=>r.evidence.kind!=='exact-curated-pair'),'Candidate-only match cannot inherit relationship');
ok(ProdrugPriority.assess(acid,[{...methyl,sources:[]}]).rows[0].evidence.kind==='no-linked-source','Missing class provenance is labelled explicitly');
const all=reports.map(r=>r.review),before=JSON.stringify(all);
for(const key of ['steps','concerns','mw','tpsa','logp','handles','alternatives','evidence'])for(const direction of ['asc','desc']){
 const sorted=ProdrugPriority.sort(all,key,direction);ok(sorted.length===all.length,'Sort preserves row count');if(['steps','concerns'].includes(key))ok(sorted.at(-1).route.status!=='found','Unknowns last in both directions');
}
ok(JSON.stringify(all)===before,'Sorting never mutates assessment');
const bound=ProdrugPriority.findRoute(candidate('CCN','amine-acetoxy').smiles,'CCN',{maxStates:1});ok(bound.status==='bounded-unresolved'&&bound.steps===null&&bound.visited===1,'Exhausted search is explicitly bounded, not impossible');
const isotope=ProdrugPriority.findRoute(candidate('[13CH3]CO','acetyl').smiles,'CCO');ok(isotope.status!=='found','Incorrect target isotope/constitution is not silently matched');
if(process.argv.includes('--json'))console.log(JSON.stringify(reports));else console.log('Prodrug research priority: '+checks+' focused checks passed.');
