'use strict';
(function(root){
 const parse=s=>buildMolecule(parseSmiles(s)),links=(m,i)=>m.bonds.flatMap(b=>b.a===i?[{atom:b.b,order:b.order}]:b.b===i?[{atom:b.a,order:b.order}]:[]);
 function sites(smiles){const m=parse(smiles);if(smiles.includes('.')||m.atoms.length>120)throw Error('Use one connected structure with at most 120 heavy atoms; inspect the organic component separately for salts.');const found=[];
  m.atoms.forEach((a,i)=>{const ns=links(m,i),single=ns.every(n=>n.order===1),add=(kind,label,h)=>found.push({atom:i,kind,label,neutralH:h,neutralCharge:0});
   if(['O','S'].includes(a.element)&&ns.length===1&&single&&[0,-1].includes(a.charge||0)&&a.totalH===(a.charge===-1?0:1)){
    const c=m.atoms[ns[0].atom],carbonyl=c.element==='C'&&links(m,ns[0].atom).some(n=>n.order===2&&m.atoms[n.atom].element==='O');
    if(c.element==='C'&&(carbonyl||c.aromatic||a.element==='S'))add('acid',carbonyl?'Carboxylic acid / carboxylate':a.element==='S'?'Thiol / thiolate':'Phenol / phenolate',1);
   }
   if(a.element==='N'&&!a.chirality&&[0,1].includes(a.charge||0)){
    if(a.aromatic&&ns.length===2&&a.totalH===(a.charge===1?1:0))add('base','Pyridine-like nitrogen',0);
    else if(!a.aromatic&&single&&ns.length>=1&&ns.length<=3&&ns.every(n=>m.atoms[n.atom].element==='C')&&a.totalH===3-ns.length+(a.charge===1?1:0)&&!ns.some(n=>links(m,n.atom).some(x=>x.order===2&&['O','N','S'].includes(m.atoms[x.atom].element))))add('base','Amine (conjugate-acid pKa)',3-ns.length);
   }
  });return {mol:m,sites:found,scope:'Bounded motif coverage; no pKa prediction. Each supplied pKa is a microscopic/independent-site assumption. Coupled sites, tautomer equilibria and macroscopic titration constants require a different model.'};
 }
 function model(smiles,parameters,ph=7.4){
  if(!Number.isFinite(ph)||ph<0||ph>14)throw Error('pH must be 0–14.');const scan=sites(smiles);if(!Array.isArray(parameters)||!parameters.length||parameters.length>6)throw Error('Provide 1–6 selected sites.');
  const used=new Set(),params=parameters.map(p=>{const site=scan.sites.find(s=>s.atom===p.atom);if(!site||used.has(p.atom))throw Error('Choose distinct recognized sites.');used.add(p.atom);if(![p.pka,p.low,p.high].every(Number.isFinite)||p.low>p.pka||p.pka>p.high||p.low< -5||p.high>20||!String(p.source||'').trim())throw Error('Each site needs a sourced/explicitly assumed pKa and ordered range within −5 to 20.');return {...p,...site};});
  // Neutral reference keeps every unmodeled formal charge intact.
  function state(mask){const g={atoms:scan.mol.atoms.map(a=>({...a,neighbors:[],rings:[],order:a.order?.slice()})),bonds:scan.mol.bonds.map(b=>({...b}))};params.forEach((p,k)=>{const a=g.atoms[p.atom],ion=!!(mask&(1<<k));a.charge=ion?(p.kind==='acid'?-1:1):0;a.totalH=p.neutralH+(ion?(p.kind==='acid'?-1:1):0);a.explicitH=a.totalH;a.implicitH=0;});const s=writeSmiles(g),m=parse(s);if(!root.ProdrugCandidates.validGraph(m))throw Error('A protonation structure failed graph validation.');return {smiles:s,formula:describe(m).formula,charge:m.atoms.reduce((n,a)=>n+(a.charge||0),0),uncharged:!m.atoms.some(a=>a.charge),mask};}
  const states=Array.from({length:2**params.length},(_,mask)=>state(mask)),neutral=states[0],neutralMol=parse(neutral.smiles),d=describe(neutralMol),covered=!neutralMol.atoms.some(a=>a.charge)&&!d.crippenTypes?.some(t=>t.type==='ZERO')&&neutralMol.atoms.every(a=>['C','H','N','O','F','Cl','Br','I','P','S'].includes(a.element));
  function values(at,pKas){const logs=states.map(s=>params.reduce((n,p,k)=>{const e=(p.kind==='acid'?at-pKas[k]:pKas[k]-at)*((s.mask&(1<<k))?-1:1);return n-Math.max(0,e)-Math.log10(1+10**(-Math.abs(e)));},0)),population=logs.map(x=>10**x),f0=states.reduce((n,s,i)=>n+(s.uncharged?population[i]:0),0),netZero=states.reduce((n,s,i)=>n+(s.charge===0?population[i]:0),0);return {ph:at,unchargedFraction:f0,netZeroFraction:netZero,logD:covered?d.logp+logs[0]:null,population};}
  const nominal=params.map(p=>p.pka),corners=Array.from({length:2**params.length},(_,mask)=>params.map((p,k)=>mask&(1<<k)?p.high:p.low));
  function profile(at){const mid=values(at,nominal),bounds=corners.map(c=>values(at,c));return {...mid,unchargedLow:Math.min(...bounds.map(b=>b.unchargedFraction)),unchargedHigh:Math.max(...bounds.map(b=>b.unchargedFraction)),logDLow:covered?Math.min(...bounds.map(b=>b.logD)):null,logDHigh:covered?Math.max(...bounds.map(b=>b.logD)):null};}
  const current=profile(ph);return {schemaVersion:1,inputSmiles:smiles,parameters:params,neutralReference:neutral,neutralWlogp:covered?d.logp:null,current,states:states.map((s,i)=>({...s,fraction:current.population[i]})).sort((a,b)=>b.fraction-a.fraction),profile:Array.from({length:15},(_,ph)=>profile(ph)),logDScope:covered?'Neutral-species-only partition approximation: logD = neutral-reference WLOGP + log10(fully uncharged fraction). Ion pairs and partitioning of charged species are excluded.':'logD withheld: a fully uncharged, descriptor-supported reference is unavailable.',scope:scan.scope+' Fractions assume independent equilibrium sites and ideal dilute solution. Interval bounds are parameter-sensitivity envelopes, not statistical confidence intervals or validation. No solubility, absorption or BBB benefit is inferred.'};
 }
 root.IonizationWorkbench={sites,model};
})(globalThis);
