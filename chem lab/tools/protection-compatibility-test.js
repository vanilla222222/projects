'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
const modules=['elements','graph','valence','stereo','naming-core','naming-chain','naming-ring','naming-scaffolds','naming-general','common-names-extra','naming-elements','properties','layout','smiles','reactions','molecular-identity','reaction-stereo','reaction-rules','reaction-rules-extra','reaction-rules-extra2','reaction-aromatic','reaction-rules-extra3','reaction-rules-extra4','reaction-rules-extra5','reaction-rules-extra6','reaction-rules-extra7','reaction-rules-extra8','protection-compatibility'];
modules.forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,'js',f+'.js'),'utf8'),ctx,{filename:f}));
const run=s=>vm.runInContext(s,ctx);let checks=0;
function check(code,expected,label){assert.equal(run(code),expected,label);checks++;}
const molecules={boc:'CNC(=O)OC(C)(C)C',cbz:'CNC(=O)OCc1ccccc1',fmoc:'CNC(=O)OCC1c2ccccc2-c2ccccc21',tms:'CO[Si](C)(C)C',tbs:'CO[Si](C)(C)C(C)(C)C',tips:'CO[Si](C(C)C)(C(C)C)C(C)C',tbdps:'CO[Si](C(C)(C)C)(c1ccccc1)c1ccccc1',silyl:'CO[Si](CC)(CC)CC',benzyl:'COCc1ccccc1',pmb:'COCc1ccc(OC)cc1',acetal:'CC1OCCO1','tbu-ester':'CC(=O)OC(C)(C)C','methyl-ester':'CC(=O)OC','benzyl-ester':'CC(=O)OCc1ccccc1'};
for(const[id,s]of Object.entries(molecules)){
 check(`protectionGroups(${JSON.stringify(s)}).some(x=>x.id===${JSON.stringify(id)})`,true,'Recognized '+id);
 check(`protectionGroups(${JSON.stringify(s)}).length`,1,'Unique classification '+id);
}
for(const[s,id]of [['CNC(=O)OC(C)(C)CC','boc'],['CNC(=O)OCCC','boc'],['CNC(=O)OCCC','cbz'],['CNC(=O)OCC(c1ccccc1)c1ccccc1','fmoc'],['COCc1ccccc1OC','pmb'],['COCc1cccc(OC)c1','pmb'],['COC(O)C','acetal'],['COC(OC)(OC)C','acetal'],['C=CO[Si](C)(C)C','tms'],['COC','methyl-ester']])check(`protectionGroups(${JSON.stringify(s)}).some(x=>x.id===${JSON.stringify(id)})`,false,'Close motif excluded '+s);
check(`protectionGroups('CC(C)(C)OC(=O)NCCNC(=O)OC(C)(C)C').filter(s=>s.id==='boc').length`,2,'Multiple sites retained');
for(const[id,threat,status]of [
 ['boc','acid','conflict'],['boc','hydrogenolysis','compatible'],['boc','weakBase','compatible'],['boc','acylation','compatible'],['boc','organometallic','conflict'],['boc','alanate','conflict'],
 ['cbz','hydrogenolysis','conflict'],['cbz','acid','unknown'],['cbz','weakBase','compatible'],['cbz','organometallic','conflict'],['cbz','oxidative','unknown'],
 ['fmoc','fmocBase','conflict'],['fmoc','strongBase','conflict'],['fmoc','acid','compatible'],['fmoc','weakBase','compatible'],['fmoc','organometallic','conflict'],
 ['tbs','fluoride','conflict'],['tbs','acid','conflict'],['tbs','organometallic','compatible'],['tbs','strongBase','unknown'],['tms','organometallic','compatible'],['tips','organometallic','unknown'],['tbdps','fluoride','conflict'],
 ['benzyl','hydrogenolysis','conflict'],['benzyl','oxidative','unknown'],['pmb','oxidative','conflict'],['pmb','hydrogenolysis','conflict'],
 ['acetal','aqueousAcid','conflict'],['acetal','acid','unknown'],['acetal','organometallic','compatible'],['acetal','alanate','compatible'],['acetal','aqueousBase','compatible'],['acetal','mildOxidative','compatible'],['acetal','extremeTemperature','compatible'],['acetal','otherReactive','unknown'],
 ['tbu-ester','acid','conflict'],['methyl-ester','aqueousBase','conflict'],['methyl-ester','organometallic','conflict'],['methyl-ester','organozinc','compatible'],['benzyl-ester','hydrogenolysis','conflict']
]){
 check(`protectionAssess(${JSON.stringify(molecules[id])},[${JSON.stringify(threat)}]).sites[0].status`,status,id+' / '+threat);
 check(`protectionAssess(${JSON.stringify(molecules[id])},[${JSON.stringify(threat)}]).sites[0].reasons.length>0`,true,'Reason for '+id+' / '+threat);
}
check(`protectionAssess('CN(C)C(=O)OC(C)(C)C',['organometallic']).sites[0].status`,'unknown','N,N-carbamate without NH is not assumed Grignard safe');
check(`protectionAssess('CNC(=O)OC(C)(C)C',[]).status`,'unknown','No known regime does not imply compatibility');
check(`protectionAssess('Oc1ccccc1',[]).sites.length`,0,'Free OH is not a protecting group');
check(`protectionGroupCompatibility('unlisted',['weakBase']).status`,'unknown','Unknown group stays unknown');
// Actual reagent parsing and species classification, not mock threat flags.
check(`protectionAssess('${molecules.boc}',['CC(=O)OC(C)(C)C(F)(F)F'],{additives:['et3n']}).status`,'unknown','Unclassified organic reagent cannot hide behind base');
check(`protectionAssess('${molecules.boc}',['ClP(Cl)Cl'],{additives:['et3n']}).status`,'unknown','Unhandled PCl3 plus Et3N is unknown');
check(`protectionAssess('${molecules.boc}',['CC(=O)OC=O'],{additives:['et3n']}).status`,'unknown','Unhandled mixed anhydride reagent is unknown');
check(`protectionAssess('${molecules.boc}',[],{additives:['et3n','dmp']}).status`,'unknown','Unhandled additive cannot hide behind base');
check(`protectionAssess('${molecules.boc}',['CC(=O)Cl'],{additives:['et3n']}).status`,'compatible','Known acylation regime remains available');
check(`protectionAssess('${molecules.tbs}',['C[Mg]Br'],{solvents:['thf']}).status`,'compatible','Real dry Grignard plus TBS');
check(`protectionAssess('${molecules.tbs}',['C[Mg]Br'],{solvents:['thf','water']}).status`,'unknown','Wet Grignard is outside dry compatibility regime');
check(`protectionAssess('${molecules['methyl-ester']}',['[Zn]'],{solvents:['ether']}).status`,'compatible','Elemental zinc is a characterized Reformatsky regime for a retained ester');
check(`protectionAssess('${molecules['methyl-ester']}',['[Zn]'],{solvents:['ether']}).threats.includes('otherReactive')`,false,'Zinc no longer creates a spurious unknown reactive regime');
check(`protectionAssess('${molecules['methyl-ester']}',['C[Mg]Br'],{solvents:['ether']}).status`,'conflict','Real Grignard reagent still attacks an ester');
check(`protectionAssess('${molecules.fmoc}',[],{additives:['hbr']}).status`,'unknown','Harsh halogen acid not a universal Fmoc survival guarantee');
check(`protectionAssess('${molecules.tbs}',['[F-]'],{solvents:['thf']}).status`,'conflict','Real fluoride cleavage');
check(`protectionAssess('${molecules.acetal}',[],{solvents:['water'],additives:['hcl']}).status`,'conflict','Actual aqueous acid cleavage');
check(`protectionAssess('OCC1OCCO1',['[O-][Cr](=O)(=O)Cl.c1cc[nH+]cc1'],{solvents:['dcm']}).status`,'compatible','Acetal survives the characterized PCC oxidation regime');
check(`protectionAssess('O=CCC1OCCO1',['NN','[K+].[OH-]'],{solvents:['none'],temperature:180}).status`,'compatible','Acetal survives the characterized Wolff–Kishner regime');
check(`protectionAssess('O=CCC1OCCO1',['NN','[K+].[OH-]'],{solvents:['none'],temperature:180}).threats.includes('otherReactive')`,false,'Recognized hydrazine no longer creates a spurious unknown regime');
check(`protectionAssess('O=CCC1OCCO1',['Cl'],{solvents:['water'],additives:['znhg'],temperature:100}).status`,'conflict','Clemmensen aqueous acid still cleaves the acetal');
check(`protectionAssess('${molecules.acetal}',['O=[Cr](=O)=O'],{solvents:['water'],additives:['h2so4']}).status`,'conflict','Jones conditions retain aqueous-acid conflict rather than borrowing PCC compatibility');
check(`protectionAssess('${molecules.fmoc}',[],{additives:['piperidine']}).status`,'conflict','Actual piperidine cleavage');
check(`protectionAssess('${molecules.cbz}',[],{atmosphere:'h2',additives:['pdc']}).status`,'conflict','Actual Cbz hydrogenolysis');
check(`protectionAssess('CO[Si](C)(C)c1ccccc1',['strongBase']).status`,'unknown','Unknown silyl substitution not universally base stable');
check(`protectionAssess('CC(C)(C)[Si](C)(C)Oc1ccccc1',['strongBase']).status`,'conflict','Phenolic silyl base liability is distinct');
check(`protectionOrthogonality('CC(C)(C)OC(=O)NCCNC(=O)OCC1c2ccccc2-c2ccccc21','fmoc').collateral.length`,0,'Fmoc/Boc base-removal orthogonality');
check(`protectionOrthogonality('CC(C)(C)OC(=O)NCCOC(C)(C)C','boc').sites.find(s=>s.id==='boc').status`,'conflict','Intended removal is clearly labelled cleavage');
check(`protectionOrthogonality('CC(C)(C)OC(=O)NCCC(=O)OC(C)(C)C','boc').collateral.some(s=>s.id==='tbu-ester'&&s.status==='conflict')`,true,'Boc acid removal threatens tert-butyl ester');
check(`protectionOrthogonality('CO[Si](C)(C)CCO[Si](C)(C)C(C)(C)C','tbs').sites.filter(s=>s.status==='conflict').length`,2,'Fluoride does not invent selective TMS/TBS cleavage');
check(`(()=>{const g=protectionGraph('${molecules.boc}'),b=JSON.stringify(g);protectionAssess(g,['acid']);return JSON.stringify(g)===b;})()`,true,'Read-only graph assessment');
check(`(()=>{const a=protectionCatalog();a[0].references[0].title='mutated';return protectionCatalog()[0].references[0].title!=='mutated';})()`,true,'Catalog reference copies cannot mutate registry');
check(`protectionCatalog().every(g=>g.install&&g.remove&&g.references.length&&g.references.every(r=>r.url.startsWith('https://')))`,true,'All registry entries have source and installation/removal description');
console.log('Protecting-group compatibility: '+checks+' checks passed.');
