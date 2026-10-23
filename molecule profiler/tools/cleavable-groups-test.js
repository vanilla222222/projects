'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console});
for(const name of ['smiles','mol','smarts','stereo','transform','pharmacology','prodrug-candidates','cleavable-groups'])vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'),ctx);
const run=s=>vm.runInContext(s,ctx);let checks=0;const check=(s,expected,label)=>{assert.equal(run(s),expected,label);checks++;};
run(`function paths(s){return CleavableGroups.pathways(buildMolecule(parseSmiles(s)));}function transform(s,kind){const m=buildMolecule(parseSmiles(s)),p=CleavableGroups.pathways(m).find(p=>p.kind===kind);return CleavableGroups.preview(m,p.id,p.atoms[0]);}`);
for(const [smiles,kind] of [['COc1ccccc1','ether'],['CCOc1ccccc1','ether'],['CC(C)Oc1ccccc1','ether'],['COC','ether'],['COCc1ccccc1','ether'],['C1COCC1','ether'],['CC(=O)Oc1ccccc1','ester'],['O=C1OCCC1','ester'],['COC(=O)OC','carbonate'],['CNC(=O)Oc1ccccc1','carbamate'],['CSC(=O)C','thioester'],['COC(C)OC','acetal'],['c1ccc2c(c1)OCO2','acetal'],['CSSC','disulfide'],['S1SCCC1','disulfide'],['[13CH3]Oc1ccccc1','ether'],['COc1ccc(C[C@H](N)C)cc1','ether']]){
 ctx.input=smiles;ctx.kind=kind;
 check(`paths(input).some(p=>p.kind===kind)`,true,'Recognized existing group: '+smiles);
 check(`(()=>{const m=buildMolecule(parseSmiles(input)),before=JSON.stringify(m),r=transform(input,kind);return r.status==='predicted-products'&&!r.inputRegenerated&&r.products.length>0&&JSON.stringify(m)===before;})()`,true,'Products are unvalidated, distinct in purpose, input unmodified: '+smiles);
}
check(`transform('COc1ccccc1','ether').products.some(p=>Pharmacology.exactGraph(buildMolecule(parseSmiles(p.smiles)),buildMolecule(parseSmiles('Oc1ccccc1'))))`,true,'Aryl methyl ether exposes phenol');
check(`transform('COc1ccccc1','ether').products.some(p=>Pharmacology.exactGraph(buildMolecule(parseSmiles(p.smiles)),buildMolecule(parseSmiles('C=O'))))`,true,'O-demethylation includes formaldehyde');
check(`transform('CC(C)Oc1ccccc1','ether').products.some(p=>Pharmacology.exactGraph(buildMolecule(parseSmiles(p.smiles)),buildMolecule(parseSmiles('CC(C)=O'))))`,true,'Secondary alkyl carbon yields ketone, not aldehyde');
check(`transform('CNC(=O)Oc1ccccc1','carbamate').products.some(p=>Pharmacology.exactGraph(buildMolecule(parseSmiles(p.smiles)),buildMolecule(parseSmiles('CNC(=O)O'))))`,true,'First carbamate step leaves carbamic acid; it does not jump to amine');
check(`transform('CSSC','disulfide').products.length`,2,'Symmetric reduction retains both identical product equivalents');
check(`transform('CO[C@H](C)OCC','acetal').stereoChanges.length`,1,'Reacting acetal carbon loses tetrahedral stereo explicitly');
check(`(()=>{const s='[Cl-].COc1ccc(CC[NH3+])cc1',m=buildMolecule(parseSmiles(s)),p=paths(s)[0],r=CleavableGroups.preview(m,p.id,2);return p.atoms.includes(2)&&r.status==='predicted-products'&&r.normalization.applied&&r.selectedAtom===2;})()`,true,'Leading counterion preserves source atom numbering');
for(const smiles of ['c1ccc(Oc2ccccc2)cc1','CC(C)(C)Oc1ccccc1','COOC','CCO.O','CC(=O)N','CS(=O)SC','CO/C=C/C','[CH2]Oc1ccccc1']){ctx.input=smiles;check(`paths(input).length`,0,'Unsupported group/state receives no borrowed pathway: '+smiles);}
check(`(()=>{const m=buildMolecule(parseSmiles('COc1ccccc1')),p=paths('COc1ccccc1')[0];return CleavableGroups.preview(m,p.id,3).products.length;})()`,0,'Path cannot be applied from a different selected atom');
check(`CleavableGroups.preview(null,'unknown',0).products.length`,0,'Missing input is handled');
for(const [smiles,kind] of [['CC=NCC','imine'],['CC=NO','oxime'],['CC=NOC','oxime'],['CC=NN','hydrazone'],['CC=NNC(=O)C','hydrazone'],['C=[NH+]C','imine'],['CCOP(=O)(O)O','phosphate'],['CCOP(=O)(OCC)O','phosphate'],['CCOP(=O)(OCC)OCC','phosphate'],['[Na+].[Na+].CCOP(=O)([O-])[O-]','phosphate'],['C[N+](C)(C)[O-]','n-oxide'],['[O-][n+]1ccccc1','n-oxide']]){ctx.input=smiles;ctx.kind=kind;check(`transform(input,kind).status`,'predicted-products','Added existing-group pathway: '+smiles);}
check(`transform('CC=NO','oxime').products.some(p=>Pharmacology.exactGraph(buildMolecule(parseSmiles(p.smiles)),buildMolecule(parseSmiles('CC=O'))))`,true,'Oxime hydrolysis exposes carbonyl');
check(`transform('CCOP(=O)(O)O','phosphate').products.some(p=>Pharmacology.exactGraph(buildMolecule(parseSmiles(p.smiles)),buildMolecule(parseSmiles('CCO'))))`,true,'Phosphate hydrolysis exposes alcohol');
check(`transform('C[N+](C)(C)[O-]','n-oxide').products.some(p=>Pharmacology.exactGraph(buildMolecule(parseSmiles(p.smiles)),buildMolecule(parseSmiles('CN(C)C'))))`,true,'N-oxide reduction exposes tertiary amine');
for(const smiles of ['CC#N','NC(=N)N','c1ccncc1','COP(=O)(N)O','CP(=O)(O)O','COS(=O)(=O)O']){ctx.input=smiles;check(`paths(input).some(p=>['imine','oxime','hydrazone','phosphate','n-oxide'].includes(p.kind))`,false,'Do not borrow new pathways from a different group: '+smiles);}
console.log('Existing cleavable groups: '+checks+' focused checks passed.');
