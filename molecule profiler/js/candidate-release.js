'use strict';
// Independent audit of declared targets, followed by a bounded formal route.
(function(root){
 const parse=s=>buildMolecule(parseSmiles(s)),same=(a,b)=>root.Pharmacology.exactGraph(parse(a),parse(b));
 function target(input,candidate){
  const mol=typeof input==='string'?parse(input):input,prepared=root.ProdrugCandidates.prepareParent(mol);
  const result={status:'unverified',kind:'unknown',smiles:null,originalInputRecovered:false,normalization:prepared?.normalization||null,scope:'Structural identity check only; no biological release is established.'};
  if(!prepared||!candidate?.smiles)return result;
  try{
   if(candidate.designMode==='ether-redesign'){
    const expected=root.CleavableGroups.redesignGroups(mol).find(g=>g.atom===candidate.site?.atom);
    const targets=root.CleavableGroups.redesignSites(mol,{profile:'quick'});
    // Recreate the declared site design instead of trusting a stored verified flag.
    if(!expected||!targets.some(t=>t.atom===candidate.site.atom&&t.designs.some(d=>d.id===candidate.id)))return result;
    const rebuilt=root.CleavableGroups.redesign(mol,candidate.id,candidate.site.atom,{profile:'quick'});
    if(rebuilt.status!=='designed'||!same(rebuilt.smiles,candidate.smiles)||!same(rebuilt.releaseTargetSmiles,candidate.releaseTargetSmiles))return result;
    return {...result,status:'verified',kind:'different-analogue',smiles:rebuilt.releaseTargetSmiles};
   }
   const recovery=root.ProdrugCandidates.recoverParent(candidate.smiles,candidate.cleavage,mol);
   if(!recovery.verified)return result;
   return {...result,status:'verified',kind:prepared.normalization?'organic-component':'original-input',smiles:recovery.smiles,originalInputRecovered:!prepared.normalization,attachment:recovery.attachment};
  }catch(_){return result;}
 }
 function triggerRoute(candidate,releaseTarget,limits){
  const pattern=candidate.designMode==='ether-redesign'?['ester','ether-hemiacetal']:candidate.cleavage==='n-carbamate'?['ester','hydroxymethyl-linker','carbamic-acid']:null;
  if(!pattern)return root.ProdrugPriority.findRoute(candidate.smiles,releaseTarget.smiles,limits);
  let branch=null;
  if(candidate.cleavage==='n-carbamate'){
   const m=parse(candidate.smiles),a=releaseTarget.attachment;branch=new Set([a.promoietyAtom]);const todo=[a.promoietyAtom];
   while(todo.length){const i=todo.shift();for(const b of m.bonds){const n=b.a===i?b.b:b.b===i?b.a:null;if(n!==null&&n!==a.parentAtom&&!branch.has(n)){branch.add(n);todo.push(n);}}}
  }
  const maxStates=Math.max(1,Math.min(32,limits.maxStates||24)),queue=[root.ProdrugExplorer.start(candidate.smiles,releaseTarget.smiles)];let visited=0,attempts=0,bounded=false;
  while(queue.length&&visited<maxStates&&attempts<96){
   const route=queue.shift();visited++;const stage=route.steps.length;if(stage>=pattern.length)continue;
   for(const option of root.ProdrugExplorer.options(route).filter(o=>o.kind===pattern[stage])){
    if(attempts++>=96){bounded=true;break;}
    try{
     const next=root.ProdrugExplorer.advance(route,option);
     if(stage===0&&branch&&next.steps[0].pathway.cutBonds.some(pair=>pair.some(i=>!branch.has(i))))continue;
     if(next.targetPresent&&next.steps.length===pattern.length)return {status:'found',route:next,visited,attempts,maxStates,maxSteps:pattern.length,pattern};
     if(queue.length<maxStates)queue.push(next);else bounded=true;
    }catch(_){}
   }
  }
  return {status:bounded||queue.length?'bounded-unresolved':'no-supported-route',route:null,visited,attempts,maxStates,maxSteps:pattern.length,pattern,reason:'The designed ester-triggered sequence did not reach the exact declared target within the supported search. A shorter alternative graph transformation is not substituted for the specified activation cascade.'};
 }
 function inspect(input,candidate,limits={}){
  const releaseTarget=target(input,candidate),base={version:1,experimentalValidation:false,candidateSmiles:candidate?.smiles,releaseTarget,status:'unverified-target',steps:[],byproducts:null,scope:'Formal graph transformations, not demonstrated metabolism. No conversion rate, enzyme specificity, exposure, activity or safety is predicted.'};
  if(releaseTarget.status!=='verified')return {...base,reason:'The candidate does not match a supported design and declared release target for this input.'};
  const found=triggerRoute(candidate,releaseTarget,limits);
  if(!found.route)return {...base,status:found.status,search:found,reason:found.reason};
  const steps=found.route.steps.map(s=>({number:s.number,reactantSmiles:s.consumed.smiles,label:s.pathway.label,kind:s.pathway.kind,cutBonds:s.pathway.cutBonds.map(([a,b])=>({atoms:[a+1,b+1],elements:[parse(s.consumed.smiles).atoms[a].element,parse(s.consumed.smiles).atoms[b].element],numbering:'One-based atoms of this step’s reactant SMILES, not the original input.'})),formalInput:s.formalInput,products:s.products.map(p=>({smiles:p.smiles,formula:describe(parse(p.smiles)).formula,isReleaseTarget:same(p.smiles,releaseTarget.smiles)})),remainingSteps:found.route.steps.length-s.number,source:s.source,stereoChanges:s.stereoChanges||[],limitations:s.limitations}));
  let removed=false;const byproducts=found.route.frontier.filter(p=>{if(!removed&&same(p.smiles,releaseTarget.smiles)){removed=true;return false;}return true;}).map(p=>({smiles:p.smiles,formula:describe(parse(p.smiles)).formula}));
  return {...base,status:'formal-route-found',steps,byproducts,search:{visited:found.visited,attempts:found.attempts,maxStates:found.maxStates,maxSteps:found.maxSteps,activationPattern:found.pattern||null},reason:'A supported formal sequence reaches the declared target. Ester-triggered designs retain their specified activation cascade rather than a shorter alternative graph route. Experimental cleavage remains unvalidated.'};
 }
 root.CandidateRelease={target,inspect};
})(globalThis);
