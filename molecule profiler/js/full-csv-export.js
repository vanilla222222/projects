'use strict';
// Full CSV v2: schema, metadata and spreadsheet-safe serialization.
// All chemical calculations remain in app.js; the export is an interpretation
// of fullExportRows, not a new prediction or reference lookup.
(function(root) {
 const VERSION='2.0';
 const MAX_RANKED_RESULTS=50;
 function topRanked(items){return Array.isArray(items)?items.slice(0,MAX_RANKED_RESULTS):[];}
 const HEADER=['schema_version','molecule_id','molecule_name','input_smiles','section','item','field',
  'value','value_type','unit','evidence_type','method','interpretation','source'];
 const SECTION={
  provenance:['documentation','Method/benchmark disclosure','Not a measurement of the selected molecule.'],
  identity:['calculated','Input molecular graph','Molecular identity has not been verified against an external authority.'],
  physicochemical:['calculated','Molecular descriptor calculation','Counts and graph descriptors are not biological assay data.'],
  skeleton:['calculated','Graph descriptor','Connectivity only.'],
  topology:['calculated','Molecular graph calculation','Not a prediction of biological activity.'],
  stereochemistry:['calculated','Stereochemistry assignment','Some CIP assignments are withheld if ambiguous.'],
  lipophilicity:['estimated','WLOGP / ESOL and related descriptors','Model estimates are not laboratory measurements.'],
  'drug-likeness':['rule_based','Published structural range rules','Rule compliance is not proof of effectiveness or safety.'],
  radar:['rule_based','Descriptor-window comparison','In-range values are not probabilities.'],
  atoms:['calculated','Atom-contribution model','Contributions are model-derived.'],
  similarity:['structural_analogy','Fingerprint comparison','Fingerprint overlap does not establish shared biological activity.'],
  targets:['structural_analogy','Ligand fingerprint ranking','Scores are neither affinities nor binding probabilities.'],
  alerts:['rule_based','Substructure screening','Alerts are structural flags, not toxicology measurements.'],
  toxicity:['rule_based','Screening rules','Rule absence does not establish safety.'],
  'toxicity rules':['rule_based','Screening rules','Rule presence does not confirm toxicity.'],
  dependence:['structural_analogy','Labelled reference comparison','Not a dependence-risk prediction.'],
  'reward targets':['structural_analogy','Reference ligand comparison','Not receptor measurements.'],
  metabolism:['estimated','Reaction-rule enumeration','Hypothetical routes, not experimentally observed products.'],
  metabolites:['estimated','Rule-generated candidates','Weights do not represent yields, exposure or administered dose.'],
  'metabolism notes':['documentation','Rule-route explanation','Explanatory note only.']
 };
 const UNITS={
  molecularWeight:'g/mol',monoisotopicMass:'Da',mw:'g/mol',tpsa:'Å²',
  logp:'log10',wlogp:'log10',logS:'log10(mol/L)',molarRefractivity:'cm³/mol',
  formalCharge:'e',logpContribution:'log10',score:'unitless',
  nearestLigandSimilarity:'unitless',meanTop3Similarity:'unitless',
  analogyScore:'unitless',relativeWeight:'relative score',
  summedWeight:'relative score',siteFactor:'relative score',bioavailabilityScore:'model score'
 };
 const INTEGERS=new Set('heavyAtoms carbons heteroatoms rings aromaticRings aromaticAtoms rotatableBonds lipinskiNHOHCount lipinskiNOCount hbondDonors hbondAcceptors aliphaticRings saturatedRings heterocycles largestRing halogens amideBonds spiroAtoms bridgeheadAtoms stereocenters stereocentersSpecified stereogenicDoubleBonds stereogenicDoubleBondsSpecified cipLabelsWithheld unspecifiedElements generations rulesTried metabolites generation routesReaching matches activesScored looTrials parentAtomsTouched referenceBits sharedBits queryBits'.split(' '));
 const DECIMALS=new Set('molecularWeight monoisotopicMass aromaticProportion tpsa fractionCsp3 chi0 chi1 chi0v chi1v hallKierAlpha kappa1 kappa2 kappa3 wlogp molarRefractivity logS bioavailabilityScore logpContribution mrContribution score nearestLigandSimilarity meanTop3Similarity looRecallAt1 analogyScore relativeWeight summedWeight siteFactor mw logp'.split(' '));
 const numeric=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
 function valueType(value,section,field){
  const str=String(value==null?'':value).trim();
  if(!str)return 'missing';
  if(section!=='provenance' && numeric.test(str) &&
    (INTEGERS.has(field)||DECIMALS.has(field)||((section==='radar'||section==='physicochemical'||section==='topology'||section==='identity')&&field==='value')))
      return INTEGERS.has(field)?'integer':'number';
  if(['pass','fail','yes','no'].includes(str.toLowerCase()))return 'category';
  return 'text';
 }
 function metaFor(section,item,field){
  const values=SECTION[section]||['unverified','Application output','Confirm semantics against source code.'];
  let [evidence,method,interpretation]=values;
  if(section==='identity'&&['name','smiles'].includes(item)){evidence='input';method='User-supplied input';}
  if(section==='provenance'&&field==='citation')evidence='literature_reference';
  return {evidence,method,interpretation};
 }
 function csvCell(value){
  let text=String(value==null?'':value);
  if(/^\s*[=+@-]/.test(text) && !/^\s*-\d+(?:\.\d+)?(?:e[+-]?\d+)?\s*$/i.test(text))text="'"+text;
  return '"'+text.replace(/"/g,'""')+'"';
 }
 function normalized(record,rawRows){
  const name=String(record&&record.name||'Unnamed molecule'),smiles=String(record&&record.smiles||'');
  return (rawRows||[]).map(r=>{
   if(!Array.isArray(r)||r.length!==4)throw new Error('Expected a four-column source row');
   const [section,item,field,value]=r.map(v=>String(v==null?'':v));
   const meta=metaFor(section,item,field);
   // Many source pairs use field='value' with the semantic property in item.
   // Retain the original key, but derive typing and unit from its full identity.
   const semanticField=field==='value'?item:field;
   const type=valueType(value,section,semanticField);
   const unit=UNITS[semanticField]||'';
   return [VERSION,'mol-0001',name,smiles,section,item,field,value,
    type,unit,meta.evidence,meta.method,meta.interpretation,''];
  });
 }
 function serialize(rows){return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';}
 function createCsv(record,rawRows){return serialize([HEADER,...normalized(record,rawRows)]);}
 const DICT=[
  ['schema_version','Schema revision','text','2.0'],
  ['molecule_id','Unique within a standalone profile export','text','mol-0001'],
  ['molecule_name','Entered or assigned molecule name','text','Not an authoritative compound identity'],
  ['input_smiles','SMILES supplied for computation','text','No canonicalization or external lookup implied'],
  ['section','Logical origin of row','category','See evidence type and method columns'],
  ['item','Entity or ranked row within its section','text','May contain rank, name or atom position'],
  ['field','Source computation key','text','Machine-readable name from source'],
  ['value','Original value serialized as text','mixed','See value_type and unit'],
  ['value_type','Declared storage type','category','number, integer, category, text, missing'],
  ['unit','Physical or mathematical unit where known','text','Blank means no asserted unit'],
  ['evidence_type','Origin or evidence level','category','Computed, estimated, rule_based, structural_analogy, documentation or input'],
  ['method','General analytical approach','text','See app methods and validation datasets'],
  ['interpretation','Limit on scientific meaning of field','text','No individualized uncertainty is supplied'],
  ['source','Authoritative source URL if explicitly linked','text','Blank by default; citations are retained in provenance rows']
 ];
 function dictionaryCsv(){
  return serialize([['column','description','type','notes'],...DICT,
   ...Object.entries(SECTION).map(([key,val])=>['section:'+key,val[1],'category',val[2]])]);
 }
 const api={VERSION,HEADER,MAX_RANKED_RESULTS,topRanked,valueType,normalized,csvCell,createCsv,dictionaryCsv};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.FullCsvExport=api;
})(typeof globalThis!=='undefined'?globalThis:this);
