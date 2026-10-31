'use strict';
// Independent source-shaped fixtures exercise projection consumers without
// deriving expected values from the generated ChEMBL metadata.
const assert=require('node:assert/strict'),research=require('../js/reference-research'),catalog=require('../js/library-catalog'),curated=require('../js/curated-references');
const entry={name:'Binding fixture',smiles:'CCO',formula:'C2H6O'};
const source={provider:'ChEMBL',receptorId:'FIXTURE',bindingEvidence:true,actions:['agonist'],sourceAction:'agonist',species:'Homo sapiens',assay:'Radioligand displacement',endpoint:'Ki = 125.89 nM (ChEMBL standardized)',metric:'Ki',relation:'=',value:125.89,unit:'nM',originalMetric:'pKi',originalRelation:'=',originalValue:'6.9',originalUnit:null,activityId:12345,assayId:'CHEMBL123',documentId:'CHEMBL456',chemblMoleculeId:'CHEMBL789',chemblTargetId:'CHEMBL321',sourceRelease:'ChEMBL_37',sourceUrl:'https://www.ebi.ac.uk/chembl/explore/assay/CHEMBL123',assayUrl:'https://www.ebi.ac.uk/chembl/explore/assay/CHEMBL123',documentUrl:'https://www.ebi.ac.uk/chembl/explore/document/CHEMBL456',moleculeUrl:'https://www.ebi.ac.uk/chembl/explore/compound/CHEMBL789',targetUrl:'https://www.ebi.ac.uk/chembl/explore/target/CHEMBL321',activityUrl:'https://www.ebi.ac.uk/chembl/api/data/activity/12345.json',sourceFile:'validation/source-fixture.json',sourceSha256:'a'.repeat(64),sourceLocation:'panels[0].selected[0]',assayOrganism:'Homo sapiens',assayType:'B',assayConfidence:9,assayCellType:'CHO',assayTissue:null,librarySmiles:entry.smiles,numericalTransferStatus:'exact_source_graph'};
const iuphar={provider:'IUPHAR',receptorId:'OTHER',bindingEvidence:true,species:'Human',affinityUnits:'pKi',affinityMedian:'7.2',sourceUrl:'https://example.org/iuphar',sourceAction:'Binding'};
function fixture(rows=[source,iuphar],stored=entry){
 const metadata={receptors:{entries:{[entry.name]:{librarySmiles:stored.smiles,evidence:rows}}}};
 const wrapped={...catalog,receptorEvidence:e=>catalog.receptorEvidence(e,metadata),displayName:e=>e.name,aliasesFor:()=>[],nameRecord:()=>null,tagsFor:()=>[]};
 return research.createModel({entries:[stored],catalog:wrapped,curated,data:{entries:{},records:[]}});
}
const before=JSON.stringify({entry,source,iuphar}),model=fixture(),o=model.observations(entry).find(o=>o.provider==='ChEMBL');
assert.equal(o.id,'import:chembl:12345:FIXTURE');assert.equal(o.value,125.89);assert.equal(o.unit,'nM');assert.equal(o.metric,'Ki');assert.equal(o.relation,'=');assert.equal(o.originalMetric,'pKi');assert.equal(o.originalValue,'6.9');assert.equal(o.originalUnit,null);assert.equal(o.action,'','Binding does not establish functional action');assert.equal(o.hostSpecies,'Not reported','Assay organism is not host-cell species');assert.equal(o.assayOrganism,'Homo sapiens');assert.equal(o.sd,undefined);assert.equal(o.uncertainty,undefined);assert.equal(o.kind,'imported_binding');
for(const key of ['sourceRelease','sourceFile','sourceSha256','sourceLocation','documentUrl','moleculeUrl','targetUrl','activityUrl','assayId','documentId','chemblMoleculeId','chemblTargetId'])assert.equal(o[key],source[key]);
assert.deepEqual(model.cell(entry.name,'FIXTURE').states,['Binding measurement']);assert.ok(!model.reviewItems().some(x=>x.kind==='action'),'Do not invent functional disagreements');
const original=model.observations(entry).find(o=>o.target==='OTHER');assert.equal(original.metric,'pKi');assert.equal(original.value,7.2);assert.equal(original.unit,'source scale','Existing IUPHAR scale stays unchanged');
assert.equal(fixture([iuphar,source]).observations(entry).find(o=>o.provider==='ChEMBL').id,o.id,'IDs must survive source ordering changes');
const changed={...entry,smiles:'CCC'};assert.equal(model.observations(changed).length,0,'Metadata cannot transfer to a changed graph');
assert.equal(fixture([{...source,librarySmiles:'CCC'}]).observations(entry).length,0,'Reject a stale per-row graph witness even when the outer metadata matches');
const excluded=fixture([{...source,numericalTransferStatus:'excluded_graph_mismatch'}]);assert.equal(excluded.observations(entry).length,0);assert.equal(excluded.dossier(entry.name).bindingIdentityWarnings.length,1,'Exclusion remains visible without transferring source values');
assert.equal(fixture([{...source,numericalTransferStatus:'unverified'}]).observations(entry).length,0,'A numeric field alone cannot authorize a measured value');
assert.equal(fixture([{...source,unit:'pKi'}]).observations(entry).length,0,'Invalid standardized units cannot be treated as nM');
assert.equal(JSON.stringify({entry,source,iuphar}),before,'Viewing evidence must not mutate source facts');
console.log('ChEMBL evidence: typed binding vs original scale, source provenance, stable IDs, graph guards and no inferred action or uncertainty passed');
module.exports={source,entry,observation:o,fixture};

// Verify every projected observation against the retained source columns, not
// only a renderer fixture. Historical snapshots remain byte-pinned evidence.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),root=path.resolve(__dirname,'..');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const metadata=require('../data/library-receptor-tags').LIBRARY_RECEPTOR_METADATA,library=new Map(require('../data/library').LIBRARY.map(e=>[e.name,e]));
const expected=new Map();
for(const file of fs.readdirSync(path.join(root,'validation')).filter(f=>/^chembl-receptor-binding-batch(?:-\d+)?\.json$/.test(f))){
 const sourceFile='validation/'+file,batch=JSON.parse(fs.readFileSync(path.join(root,sourceFile),'utf8'));
 for(const [pi,panel]of batch.panels.entries())for(const [si,row]of panel.selected.entries()){
  const key=panel.gene+':'+row.activity.activity_id;assert.ok(!expected.has(key));expected.set(key,{row,sourceFile,sourceSha256:sha(sourceFile),sourceLocation:`panels[${pi}].selected[${si}]`});
 }
}
let actual=0,excludedCount=0;
for(const [name,record]of Object.entries(metadata.entries))for(const e of record.evidence.filter(e=>e.provider==='ChEMBL')){
 const key=e.receptorId+':'+e.activityId,proof=expected.get(key);assert.ok(proof,'Projected row must have a retained source witness');expected.delete(key);actual++;
 const a=proof.row.activity;for(const field of ['sourceFile','sourceSha256','sourceLocation'])assert.equal(e[field],proof[field]);
 assert.equal(e.librarySmiles,library.get(name).smiles);assert.equal(e.librarySmiles,proof.row.entry.smiles);
 assert.equal(e.originalMetric,a.type);assert.equal(e.originalValue,a.value);assert.equal(e.originalUnit,a.units);assert.equal(e.originalRelation,a.relation);
 assert.equal(e.chemblMoleculeId,a.molecule_chembl_id);assert.equal(e.assayId,a.assay_chembl_id);assert.equal(e.documentId,a.document_chembl_id);assert.deepEqual(e.actions,[]);assert.equal(e.sd,undefined);
 if(e.numericalTransferStatus==='excluded_graph_mismatch'){excludedCount++;assert.equal(e.value,undefined);continue;}
 assert.equal(e.numericalTransferStatus,'exact_source_graph');assert.equal(e.value,Number(a.standard_value));assert.equal(e.metric,a.standard_type);assert.equal(e.unit,a.standard_units);assert.equal(e.relation,a.standard_relation);
}
assert.equal(expected.size,0,'Every retained association must be accounted for');
const report=require('../validation/library-receptor-tags.json');assert.equal(actual,report.evidenceRecords.chembl);assert.equal(excludedCount,report.evidenceRecords.chemblNumericalExclusions||0);
for(const [file,digest]of Object.entries(report.sourceSha256))assert.equal(sha(file),digest,'Source witness changed: '+file);
console.log('ChEMBL source parity: '+actual+' retained associations, '+excludedCount+' graph exclusions, exact source columns and current snapshot hashes passed');
