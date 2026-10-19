'use strict';
// Catalog browsing and annotation contracts only. No affinity or activity prediction.
(function(root) {
  const ACTIONS = ['agonist','partial_agonist','antagonist','inverse_agonist','pam','nam',
    'channel_blocker','channel_opener','inhibitor','modulator','biased','binding_only'];
  const normalize = value => String(value || '').trim().toLowerCase();
  function browse(receptors, options, targets, annotations) {
    const o=options||{}, q=normalize(o.search);
    return receptors.filter(r => (!o.family || r.family===o.family)
      && (!o.kind || r.kind===o.kind)
      && (!q || [r.id,r.name,r.family,r.kind,r.description,r.mechanism,r.endogenousLigands,r.activation,r.blockade,
        ...r.genes,...(r.aliases||[])].join(' ').toLowerCase().includes(q))
      && (!o.coverage || (o.coverage==='awaiting' ? links(r,targets).length===0
        : o.coverage==='annotated' ? (annotations||[]).some(a=>a.receptorId===r.id)
        : links(r,targets).length>0)));
  }
  function links(receptor, targets) {
    const exact=new Set(receptor.targetAliases||[receptor.id]);
    const legacy=new Set(receptor.legacyTargetAliases||[]);
    return (targets||[]).filter(t=>exact.has(t.gene)||legacy.has(t.gene)).map(target=>({
      target, mapping:legacy.has(target.gene)?'legacy_subunit':'catalog_id'
    }));
  }
  function validateAnnotations(annotations, receptors, library) {
    const ids=new Set(receptors.map(r=>r.id)), names=new Set((library||[]).map(r=>r.name));
    const errors=[];
    (annotations||[]).forEach((a,index)=>{
      const add=message=>errors.push({index,message});
      if(!a || typeof a!=='object'){add('Annotation must be an object');return;}
      if(!ids.has(a.receptorId))add('Unknown receptorId');
      if(!names.has(a.ligandName))add('Ligand name must match the molecule library');
      if(!ACTIONS.includes(a.action))add('Unknown action');
      try {
        const url=new URL(a.sourceUrl);
        if(url.protocol!=='https:' || !url.hostname || url.username || url.password)throw Error('source');
      } catch (_) {add('A direct HTTPS evidence source is required');}
      if(!['species','assay','endpoint'].every(key=>typeof a[key]==='string'&&a[key].trim()))add('Species, assay system and endpoint must be nonempty text');
      if(['pam','nam'].includes(a.action) && !a.probeLigand)add('Allosteric modulation requires the probe ligand');
      if(a.action==='biased' && (!a.referenceLigand || !Array.isArray(a.pathways) || a.pathways.length<2))add('Biased signalling requires a reference ligand and compared pathways');
      if(a.action==='binding_only' && a.evidenceType!=='binding')add('binding_only requires binding evidence');
      if(a.action!=='binding_only' && a.evidenceType!=='functional')add('An action requires functional evidence; affinity alone is insufficient');
    });
    return errors;
  }
  function targetTemplate(r) {
    const family=r.kind==='Nuclear receptor'?'Nuclear receptor':r.kind==='Catalytic receptor'?'Kinase'
      :r.kind==='GPCR' || r.id==='GABAB'?'GPCR':'Ion channel';
    return {name:r.name,gene:r.id,family,organism:r.species,
      note:'Catalog scaffold only. Add independently sourced ligand evidence before using in target ranking.',ligands:[]};
  }
  function createHandoff(receptors, targets) {
    return {schemaVersion:1,scope:'Receptor identity and empty annotation scaffolds, not biological-activity predictions.',
      instructions:[
        'Catalog IDs are stable. Do not replace complex IDs with one subunit gene.',
        'Extend an existing target row when linked; do not create a duplicate for a legacy alias.',
        'Existing target ligand names do not establish agonism, antagonism, potency or selectivity.',
        'Keep empty scaffolds out of target ranking until independently sourced ligands are curated.',
        'Action annotations require a direct source URL, species, assay and endpoint; affinity alone supports binding_only.',
        'Gene symbols, legacy subunit mappings and receptor assemblies are different levels of identity.'
      ],actionVocabulary:ACTIONS.slice(),
      optionalAnnotationFields:['probeLigand','referenceLigand','pathways','note'],
      annotationFields:['receptorId','ligandName','action','evidenceType','sourceUrl','species','assay','endpoint','note'],
      receptors:receptors.map(r=>({id:r.id,name:r.name,genes:r.genes,kind:r.kind,family:r.family,
        sources:r.sources,caution:r.caution,legacyTargetAliases:r.legacyTargetAliases||[],
        existingTargets:links(r,targets).map(x=>({gene:x.target.gene,mapping:x.mapping})),
        targetTemplate:targetTemplate(r)})), ligandAnnotations:[]};
  }
  const api={ACTIONS,browse,links,validateAnnotations,targetTemplate,createHandoff};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ReceptorCatalog=api;
})(typeof globalThis!=='undefined'?globalThis:this);
