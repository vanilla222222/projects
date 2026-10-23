'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
for(const name of ['smiles','mol','smarts','stereo','transform','pharmacology','analogue-candidates','pk-applicability'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8'));
const fixtures=['C/C=C/CO','C/C=C\\CO','OC/C=C/C=C/C','OC/C=C\\C=C/C','F/C(Cl)=C(/Br)CO','F/C(Cl)=C(\\Br)CO','OC[C@H](F)/C=C/C','[Na+].C/C=C/C(=O)[O-]','OCC1CC/C=C/CC1','OCC1/C=C/CCCCCC1','C/1=C/CCCCCC1','C/C=N/CC'];
const reports=[];
for(const smiles of fixtures){
 const parent=buildMolecule(parseSmiles(smiles));
 const reversed=parent.atoms.map((_,i)=>parent.atoms.length-i-1),remap=new Map(reversed.map((old,i)=>[old,i]));
 const reordered={atoms:reversed.map(old=>({...parent.atoms[old],index:remap.get(old),order:parent.atoms[old].order.map(n=>n===null?null:remap.get(n))})),bonds:parent.bonds.map(b=>({...b,a:remap.get(b.a),b:remap.get(b.b)}))};
 const edgesReversed={atoms:parent.atoms.map(a=>({...a,order:a.order.slice()})),bonds:parent.bonds.map(b=>({...b,a:b.b,b:b.a,dir:-b.dir}))};
 const outputs=[parent,edgesReversed,reordered].map(g=>writeSmiles(g));
 for(const out of outputs)assert.ok(Pharmacology.exactGraph(buildMolecule(parseSmiles(smiles)),buildMolecule(parseSmiles(out))),smiles+' -> '+out);
 reports.push({smiles,outputs});
}
for(const smiles of ['C/C=C/c1ccccc1','C/C=C\\c1ccccc1']){
 const rows=AnalogueCandidates.generate(buildMolecule(parseSmiles(smiles))).rows;
 assert.ok(rows.length);reports.push({smiles,analogues:rows.map(r=>r.smiles)});
}
if(process.argv.includes('--json'))console.log(JSON.stringify(reports));
else console.log('Directional SMILES: '+fixtures.length+' fixtures passed original/reversed-edge/reordered-atom graph checks; both alkene analogue isomers generated.');
