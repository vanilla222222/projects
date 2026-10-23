'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');for(const name of ['smiles','mol','smarts','stereo','transform','descriptors','pharmacology','prodrug-candidates','cleavable-groups','prodrug-explorer'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'));
const parse=s=>buildMolecule(parseSmiles(s));let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const scan=ProdrugExplorer.scan(parse('NCCO'));
ok(scan.atoms.length===4&&scan.compatibleAtoms===2,'Every atom represented and compatible handles counted');
ok(scan.atoms[1].reason.includes('does not match')&&scan.atoms[0].reason.includes('primary amine'),'Coverage explanations distinguish unsupported carbon and recognized amine');
ok(scan.atoms.every(a=>!a.evidenceLevel.includes('Documented')),'Class hypotheses never acquire documented evidence');
const salt=ProdrugExplorer.scan(parse('[Cl-].CC[NH3+]'));
ok(salt.atoms[0].reason.includes('counterion')&&salt.atoms[3].compatible,'Counterion reason and original organic index');
ok(ProdrugExplorer.scan(parse('CCO.O')).atoms.every(a=>a.reason.includes('Input-level check')),'Mixture reports input-level block');
ok(ProdrugExplorer.scan(parse('CC=O')).atoms[2].reason.includes('adjacent carbonyl carbon'),'Carbonyl oxygen explains where to inspect instead');
ok(ProdrugExplorer.scan(null).atoms.length===0,'Absent input');
for(const s of ['CCCC','C[N+](C)(C)C','c1cc[nH]c1','COc1ccccc1','C/C=C/CO'])ok(ProdrugExplorer.scan(parse(s)).atoms.length===parse(s).atoms.length,'Scan completes for '+s);
function candidate(s,designId){return ProdrugCandidates.generate(parse(s),{designId,limit:1}).rows[0];}
const row=candidate('CCN','amine-acetoxy'),report=ProdrugExplorer.comparison(parse('CCN'),[row,row]);
ok(report.rows.length===2&&report.rows[1].delta.mw>0&&report.rows[0].delta.mw===0,'Comparison deduplicates and calculates deltas');
ok(report.rows[1].values.hba===describe(parse(row.smiles)).hbaStrict,'Comparison uses strict acceptor count');
ok(ProdrugExplorer.comparison(parse('CCN'),[{...row,parentRecoveryVerified:false}]).rows.length===1,'Unverified rows cannot enter comparison');
ok(ProdrugExplorer.comparison(parse('[Cl-].CC[NH3+]'),[]).rows[0].smiles==='CC[NH3+]','Salt comparison baseline is explicitly organic component');
const routes=[];
for(const [s,id,kinds] of [
 ['CCN','amine-acetoxy',['ester','hydroxymethyl-linker','carbamic-acid']],
 ['CCNC','amine-acetoxy',['ester','hydroxymethyl-linker','carbamic-acid']],
 ['N[C@H](C)F','amine-acetoxy',['ester','hydroxymethyl-linker','carbamic-acid']],
 ['[15NH2]CC','amine-acetoxy',['ester','hydroxymethyl-linker','carbamic-acid']],
 ['C/C=C/CN','amine-acetoxy',['ester','hydroxymethyl-linker','carbamic-acid']],
 ['O=C1NC(=O)CC1','nh-acetoxymethyl',['ester','nh-hydroxymethyl']],
 ['CC(=O)N','nh-phosphoryloxymethyl',['phosphate','nh-hydroxymethyl']],
 ['CC(=O)N','nh-hydroxymethyl',['nh-hydroxymethyl']]
]){
 const row=candidate(s,id);ok(!!row,'Fixture candidate '+s);let route=ProdrugExplorer.start(row.smiles,row.recoveredParentSmiles);
 for(const kind of kinds){const before=JSON.stringify(route),option=ProdrugExplorer.options(route).find(o=>o.kind===kind);ok(!!option,'Next '+kind+' available');const next=ProdrugExplorer.advance(route,option);ok(JSON.stringify(route)===before,'Route extension is immutable');route=next;}
 ok(route.targetPresent&&route.frontier.some(p=>Pharmacology.exactGraph(parse(p.smiles),parse(s))),'Exact structural parent reached: '+s);
 ok(route.steps.every(s=>s.source.url&&s.products.length>=2),'Every step has source and all fragments');routes.push({parent:s,candidate:row.smiles,route});
}
const amine=routes[0].route;
ok(amine.frontier.length===4,'Amine cascade retains acid, formaldehyde, CO2 and amine');
assert.throws(()=>ProdrugExplorer.advance(amine,{productId:'missing',pathId:'bad',atom:0}));checks++;
for(const s of ['CN(C)CO','COC','CCN(C)C(=O)OC','CC(=O)O'])ok(!CleavableGroups.pathways(parse(s)).some(p=>['nh-hydroxymethyl','hydroxymethyl-linker','carbamic-acid'].includes(p.kind)),'Do not fragment missing exposed linker: '+s);
const symmetric=ProdrugExplorer.start('CSSC'),split=ProdrugExplorer.advance(symmetric,ProdrugExplorer.options(symmetric)[0]);
ok(split.frontier.length===2&&split.frontier[0].id!==split.frontier[1].id,'Duplicate fragments retain separate IDs');
let limited=ProdrugExplorer.start('COC(=O)CC(OC(=O)C)C(OC(=O)C)COC(=O)C');
for(let i=0;i<4;i++){const o=ProdrugExplorer.options(limited).find(o=>o.kind==='ester');ok(!!o,'Four-step fixture has next ester');limited=ProdrugExplorer.advance(limited,o);}
ok(ProdrugExplorer.options(limited).length===0,'Four-step limit enforced');
if(process.argv.includes('--json'))console.log(JSON.stringify(routes));else console.log('Molecule-site explorer: '+checks+' focused checks passed.');
