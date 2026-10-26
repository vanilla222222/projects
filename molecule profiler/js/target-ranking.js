'use strict';
// Transparent 2D reference retrieval, not trained probabilities or functional-action prediction.
(function(root){
  const VERSION='ensemble-v1.1';
  const METHODS=['ecfp4','ecfp6','fcfp4','ecfp4s','pairs'];
  const ENSEMBLE=['ecfp4s','fcfp4','pairs'];
  const SUPPORT_CUT=0.35;
  function signature(fps){
    return ['ecfp4s','ecfp6','pairs'].map(key=>key+':'+[...fps[key].counts].sort((a,b)=>a[0]-b[0]).map(x=>x.join('=')).join(',')).join('|');
  }
  function coverageLabel(profiles){return profiles<2?'Single-profile lookup; independent holdout unavailable':profiles<5?'Sparse panel; fewer than five distinct profiles':profiles<50?'Below the 50-profile coverage goal':'50+ structural profiles; source qualification must be checked separately';}
  function createIndex(library,targets,engine){
    const entries=new Map(),issues=[];
    const wanted=new Set(targets.flatMap(t=>t.ligands||[]));
    for(const entry of library){
      if(!wanted.has(entry.name))continue;
      if(entry.propertyOnly===true){issues.push({name:entry.name,reason:'property-only reference excluded'});continue;}
      try{
        const mol=engine.parse(entry.smiles),fps={};
        METHODS.forEach(key=>fps[key]=engine.fingerprint(mol,key));
        entries.set(entry.name,{entry,fps,profile:signature(fps),motifs:engine.referenceMotifs?engine.referenceMotifs(entry):[]});
      }catch(error){issues.push({name:entry.name,reason:String(error.message)});}
    }
    for(const name of wanted)if(!entries.has(name)&&!issues.some(x=>x.name===name))issues.push({name,reason:'unresolved ligand name'});
    const profiles=new Map();for(const item of entries.values())if(!profiles.has(item.profile))profiles.set(item.profile,item);
    const motifBackground=new Map();for(const item of profiles.values())for(const m of item.motifs)motifBackground.set(m,(motifBackground.get(m)||0)+1);
    return {entries,targets,issues,engine,motifBackground,motifBackgroundN:profiles.size};
  }
  function query(mol,index){const fps={};METHODS.forEach(key=>fps[key]=index.engine.fingerprint(mol,key));return {fps,profile:signature(fps),motifs:index.engine.queryMotifs?index.engine.queryMotifs(mol):[]};}
  function rank(prepared,index,options){
    const o=options||{},mode=o.mode==='legacy'?'legacy':'ensemble';
    const metric=o.metric==='dice'?index.engine.dice:index.engine.tanimoto;
    const method=METHODS.includes(o.method)?o.method:'ecfp4';
    const values=new Map();
    for(const [name,item] of index.entries){
      if(o.excludeProfile===item.profile || (o.excludeNames||[]).includes(name))continue;
      const components=ENSEMBLE.map(key=>index.engine.tanimoto(prepared.fps[key],item.fps[key]));
      const value=mode==='legacy'?metric(prepared.fps[method],item.fps[method]):Math.cbrt(components.reduce((a,b)=>a*b,1));
      values.set(name,{entry:item.entry,profile:item.profile,value,components,motifs:item.motifs,
        sameProfile:prepared.profile===item.profile});
    }
    const ranked=[];
    for(const [order,target] of index.targets.entries()){
      if(target.lookupOnly===true)continue;
      if(o.organism && o.organism!=='all' && target.organism!==o.organism)continue;
      if(o.receptorsOnly && !['GPCR','Nuclear receptor'].includes(target.family) && !/receptor/i.test(target.name))continue;
      const distinct=new Map();let listed=0;
      for(const name of target.ligands||[]){const item=values.get(name);if(!item)continue;listed++;
        // Group indistinguishable fingerprint profiles, not asserted chemical identities.
        const key=mode==='legacy'?name:item.profile;
        if(!distinct.has(key)||name.localeCompare(distinct.get(key).entry.name)<0)distinct.set(key,item);
      }
      const scored=[...distinct.values()].sort((a,b)=>b.value-a.value||a.entry.name.localeCompare(b.entry.name));
      if(!scored.length)continue;
      const top=scored.slice(0,3),mean=top.reduce((sum,x)=>sum+x.value,0)/top.length;
      const score=scored[0].value,rankScore=mode==='legacy'?score:0.7*score+0.3*mean;
      const profileCount=new Set(scored.map(x=>x.profile)).size;
      const support=new Set(scored.filter(x=>Math.cbrt(x.components.reduce((a,b)=>a*b,1))>=SUPPORT_CUT&&x.components.every(v=>v>=0.2)).map(x=>x.profile)).size;
      const matchingProfiles=new Set(scored.filter(x=>x.sameProfile).map(x=>x.profile)).size;
      const profiles=new Map(scored.map(x=>[x.profile,x]));
      const motifEvidence=(prepared.motifs||[]).map(id=>({id,support:[...profiles.values()].filter(x=>x.motifs.includes(id)).length,
        total:profiles.size,background:index.motifBackground.get(id)||0,backgroundTotal:index.motifBackgroundN})).filter(x=>x.support>0).sort((a,b)=>b.support-a.support||a.id.localeCompare(b.id));
      ranked.push({target,order,score,rankScore,mean,nearest:scored[0].entry,count:listed,distinctCount:profileCount,matchingProfiles,motifEvidence,
        support,agreement:scored[0].components.filter(v=>v>=SUPPORT_CUT).length,
        components:scored[0].components,evidence:top,mode,
        coverage:coverageLabel(profileCount),belowCoverageGoal:profileCount<50,
        applicability:matchingProfiles?'matching reference fingerprint profile (not independent prediction)':score<0.3?'remote resemblance':support<2?'single-profile support':'multiple-profile support'});
    }
    return ranked.sort((a,b)=>b.rankScore-a.rankScore||b.mean-a.mean||a.order-b.order);
  }
  const api={VERSION,METHODS,ENSEMBLE,SUPPORT_CUT,signature,coverageLabel,createIndex,query,rank};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.TargetRanking=api;
})(typeof globalThis!=='undefined'?globalThis:this);
