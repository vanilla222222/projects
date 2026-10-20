'use strict';
(function(root){
 // Conservative, bounded labelled-graph isomorphism. Unlike a fingerprint hit,
 // a successful match preserves isotope, charge, H counts and resolved stereo.
 function graphMatch(a,b,strict){
  if(a.atoms.length!==b.atoms.length||a.bonds.length!==b.bonds.length)return false;
  function labels(m){const s=strict?stereoAnalyse(m):{centers:[],bonds:[],undetermined:0};if(s.undetermined)return null;
   const centers=new Map(s.centers.filter(c=>c.stereogenic).map(c=>[c.atom,c.specified?c.label:'?']));
   const bonds=new Map(s.bonds.filter(c=>c.stereogenic).map(c=>[[c.a,c.b].sort((x,y)=>x-y).join('/'),c.specified?c.label:'?']));
   return {atoms:m.atoms.map((x,i)=>(strict?[x.element,x.isotope||0,x.charge,x.totalH,x.aromatic,x.degree,centers.get(i)||'']:[x.element,x.isotope||0,x.aromatic,x.degree]).join('|')),bonds};
  }
  const al=labels(a),bl=labels(b);if(!al||!bl)return false;
  const sorted=v=>v.slice().sort().join(';');if(sorted(al.atoms)!==sorted(bl.atoms))return false;
  function edges(m,l){const out=new Map();for(const e of m.bonds){const k=[e.a,e.b].sort((x,y)=>x-y).join('/');out.set(k,(e.aromatic?1.5:e.order)+'|'+(l.bonds.get(k)||''));}return out;}
  const ae=edges(a,al),be=edges(b,bl),candidates=al.atoms.map(v=>bl.atoms.flatMap((w,i)=>v===w?[i]:[]));
  const order=a.atoms.map((_,i)=>i).sort((i,j)=>candidates[i].length-candidates[j].length||a.atoms[j].degree-a.atoms[i].degree);
  const mapped=new Map(),used=new Set();let visits=0;
  function visit(depth){if(++visits>25000)return false;if(depth===order.length)return true;const i=order[depth];
   for(const j of candidates[i]){if(used.has(j))continue;let ok=true;
    for(const [x,y] of mapped){const ka=[i,x].sort((x,y)=>x-y).join('/'),kb=[j,y].sort((x,y)=>x-y).join('/');if(ae.get(ka)!==be.get(kb)){ok=false;break;}}
    if(ok){mapped.set(i,j);used.add(j);if(visit(depth+1))return true;mapped.delete(i);used.delete(j);}
   }return false;
  }return visit(0);
 }
 function exactGraph(a,b){try{return graphMatch(a,b,true);}catch(_){return false;}}
 function relatedGraph(a,b){try{return graphMatch(a,b,false);}catch(_){return false;}}
 const parsed=new Map();
 function mol(smiles){if(!parsed.has(smiles))parsed.set(smiles,buildMolecule(parseSmiles(smiles)));return parsed.get(smiles);}
 function prodrugs(query,data){const rows=data?.relationships||[];return {
  asProdrug:rows.filter(r=>exactGraph(query,mol(r.prodrug.smiles))),
  examplesForActive:rows.filter(r=>exactGraph(query,mol(r.active.smiles))),
  relatedProdrugForms:rows.filter(r=>!exactGraph(query,mol(r.prodrug.smiles))&&relatedGraph(query,mol(r.prodrug.smiles))),
  scope:'Curated exact-graph matches only. No match means unknown, not proof that a molecule is not a prodrug. No hypothetical derivative is generated.'};}
 function halfLife(clearance,volume){if(!Number.isFinite(clearance)||!Number.isFinite(volume)||clearance<=0||volume<=0)throw Error('Enter positive finite clearance and volume in matching units.');const h=Math.LN2*volume/clearance;if(!Number.isFinite(h))throw Error('Parameters exceed the numerical range.');return h;}
 function ionization(pka,ph,kind,logp){if(!Number.isFinite(pka)||!Number.isFinite(ph)||!['acid','base'].includes(kind))throw Error('A finite pKa and pH plus an acid/base choice are required.');
  const exponent=kind==='acid'?ph-pka:pka-ph;
  if(!Number.isFinite(exponent))throw Error('pKa/pH difference exceeds the numerical range.');
  const correction=exponent>300?exponent:Math.log10(1+10**exponent);
  return {neutralFraction:10**(-correction),logD:Number.isFinite(logp)?logp-correction:null,scope:'Monoprotic Henderson–Hasselbalch approximation; assumes negligible partitioning of ionized species. Not valid as a general polyprotic/zwitterion model.'};
 }
 function effects(ranks,catalog){return ranks.slice(0,8).flatMap(row=>{
  if(row.target.organism!=='Human')return [];
  const receptor=catalog.receptors.find(r=>r.id===row.target.gene||(r.targetAliases||[]).includes(row.target.gene));
  return receptor?[{target:receptor.name,rankScore:row.rankScore,mechanism:receptor.mechanism,activation:receptor.activation,blockade:receptor.blockade,sources:receptor.sources,
   scope:'Conditional receptor biology. Neither binding, action, exposure nor a clinical effect is established for the query.'}]:[];
 });}
 const api={exactGraph,relatedGraph,prodrugs,halfLife,ionization,effects};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.Pharmacology=api;
})(typeof globalThis!=='undefined'?globalThis:this);
