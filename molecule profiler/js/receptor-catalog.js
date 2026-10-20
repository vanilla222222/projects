'use strict';
// Catalog browsing and annotation contracts only. No affinity or activity prediction.
(function(root) {
  const ACTIONS = ['agonist','partial_agonist','antagonist','inverse_agonist','pam','nam',
    'channel_blocker','channel_opener','inhibitor','modulator','biased','binding_only'];
  const normalize = value => String(value || '').trim().toLowerCase();
  function browse(receptors, options, targets, annotations, library) {
    const o=options||{}, q=normalize(o.search);
    const evidenceTerms=new Map();
    if(q)for(const a of annotations||[]){if(!a||typeof a!=='object')continue;
      const terms=evidenceTerms.get(a.receptorId)||[];terms.push(a.ligandName,a.chemblMoleculeId);evidenceTerms.set(a.receptorId,terms);}
    return receptors.filter(r => (!o.family || r.family===o.family)
      && (!o.kind || r.kind===o.kind)
      && (!q || [r.id,r.name,r.family,r.kind,r.description,r.mechanism,r.endogenousLigands,r.activation,r.blockade,
        ...r.genes,...(r.aliases||[]),...links(r,targets).flatMap(x=>x.target.ligands||[]),...(evidenceTerms.get(r.id)||[])].join(' ').toLowerCase().includes(q))
      && (!o.coverage || (o.coverage==='below_goal' ? coverage(r,targets,library,annotations).remaining>0
        : o.coverage==='at_goal' ? coverage(r,targets,library,annotations).remaining===0
        : o.coverage==='awaiting' ? links(r,targets).length===0
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
  const LIGAND_GOAL=50;
  function coverage(receptor,targets,library,annotations) {
    const linked=links(receptor,targets);
    const listed=new Set(linked.flatMap(({target})=>target.ligands||[]));
    const entries=new Map((library||[]).filter(e=>!e.propertyOnly).map(e=>[e.name,e]));
    const resolved=[...listed].filter(name=>entries.has(name));
    const profiles=new Set();
    for(const a of annotations||[]) {
      const entry=entries.get(a.ligandName);
      if(a.receptorId===receptor.id && listed.has(a.ligandName) && entry
        && a.librarySmiles===entry.smiles && /^[a-f0-9]{64}$/.test(a.identityKey||''))profiles.add(a.identityKey);
    }
    return {id:receptor.id,name:receptor.name,family:receptor.family,goal:LIGAND_GOAL,
      listedNames:listed.size,resolvedNames:resolved.length,sourcedProfiles:profiles.size,
      remaining:Math.max(0,LIGAND_GOAL-profiles.size),hasTarget:linked.length>0};
  }
  function coverageReport(receptors,targets,library,annotations) {
    const errors=validateAnnotations(annotations,receptors,library),invalid=new Set(errors.map(e=>e.index));
    const valid=(annotations||[]).filter((a,i)=>!invalid.has(i));
    const rows=receptors.map(r=>coverage(r,targets,library,valid));
    return {schemaVersion:1,goal:LIGAND_GOAL,receptors:rows.length,atGoal:rows.filter(r=>r.remaining===0).length,
      listedAtGoal:rows.filter(r=>r.resolvedNames>=LIGAND_GOAL).length,annotationIssues:errors.length,
      interpretation:'Sourced profiles count non-stale, linked evidence with audited graph-group keys. Legacy names alone do not establish sourced coverage. Profiles are not independent scaffolds or predictive validation.',
      rows:rows.sort((a,b)=>b.remaining-a.remaining||a.id.localeCompare(b.id))};
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
  const api={LIGAND_GOAL,coverage,coverageReport,ACTIONS,browse,links,validateAnnotations,targetTemplate,createHandoff};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ReceptorCatalog=api;
})(typeof globalThis!=='undefined'?globalThis:this);
