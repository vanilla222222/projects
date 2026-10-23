// Reverse proposals use local graph edits and the standard forward verifier.
function retro6One(t,edit,reagents,conditions){const p=retroSinglePiece(t,edit);return p&&retroSpec([{smiles:p.smiles,role:'reactant'}],reagents||[],conditions||{});}
function retro6Heterourea(t,element,alcohol){
 const g=t.graph;return g.atoms.filter(a=>a.element==='C').flatMap(c=>{
  const ns=rxNeighbors(g,c.id),oxo=ns.find(n=>n.atom.element===element&&n.bond.order===2),nitrogens=ns.filter(n=>n.atom.element==='N'&&n.bond.order===1);
  if(!oxo)return [];
  const partners=alcohol?ns.filter(n=>n.atom.element==='O'&&n.bond.order===1):nitrogens;
  return nitrogens.filter(n=>rxNeighbors(g,n.atom.id).length===2&&rxCarbonNeighbors(g,n.atom.id).length===2).flatMap(n=>partners.filter(p=>p.atom.id!==n.atom.id).map(p=>{
   const pieces=retroEdit(t,h=>{if(!retroCut(h,c.id,p.atom.id))return false;return retroOrder(h,c.id,n.atom.id,2);});
   return pieces&&pieces.length===2?retroSpec(retroReactants(pieces),[],{solvents:['thf']}):null;
  }).filter(Boolean));
 }).slice(0,RETRO_LIMITS.maxPerTransform);
}
RETRO_TRANSFORMS.push(
 {id:'isocyanate-urea',name:'Urea from isocyanate and amine',rule:'isocyanate-urea',group:'Nitrogen',match:t=>retro6Heterourea(t,'O',false)},
 {id:'isocyanate-carbamate',name:'Carbamate from isocyanate and alcohol',rule:'isocyanate-carbamate',group:'Nitrogen',match:t=>retro6Heterourea(t,'O',true)},
 {id:'isothiocyanate-thiourea',name:'Thiourea from isothiocyanate and amine',rule:'isothiocyanate-thiourea',group:'Sulfur',match:t=>retro6Heterourea(t,'S',false)},
 {id:'isocyanate-hydrolysis',name:'Primary amine from isocyanate hydrolysis',rule:'isocyanate-hydrolysis',group:'Hydrolysis',match(t){return t.info.amines.filter(a=>a.h===2&&rxNeighbors(t.graph,a.n).length===1).slice(0,RETRO_LIMITS.maxPerTransform).map(a=>retro6One(t,g=>{const c=rxAttach(g,'C',a.n,2);rxAttach(g,'O',c.id,2);},[],{solvents:['water']})).filter(Boolean);}},
 {id:'aldoxime-dehydration',name:'Nitrile from aldoxime',rule:'aldoxime-dehydration',group:'Dehydration',match(t){return t.info.nitriles.slice(0,RETRO_LIMITS.maxPerTransform).map(n=>retro6One(t,g=>{rxSetOrder(g,n.c,n.n,2);rxAttach(g,'O',n.n);},[{smiles:'CC(=O)OC(C)=O',role:'reagent',label:'Acetic anhydride'}],{solvents:['dmso'],additives:['k2co3']})).filter(Boolean);}},
 {id:'amide-thionation',name:'Thioamide from amide',rule:'amide-thionation',group:'Sulfur transfer',match(t){return t.graph.atoms.filter(a=>a.element==='S'&&rxNeighbors(t.graph,a.id).length===1).flatMap(s=>{const n=rxNeighbors(t.graph,s.id)[0];if(n.bond.order!==2||n.atom.element!=='C'||!rxNeighbors(t.graph,n.atom.id).some(q=>q.atom.element==='N'&&q.bond.order===1))return [];return [retro6One(t,g=>{g.removeAtom(s.id);rxAttach(g,'O',n.atom.id,2);},[],{solvents:['toluene'],additives:['p2s5'],temperature:110})].filter(Boolean);}).slice(0,RETRO_LIMITS.maxPerTransform);}},
 {id:'thiourea-s-alkylation',name:'Isothiouronium salt from thiourea and primary halide',rule:'thiourea-s-alkylation',group:'Sulfur',match(t){const x=rx11Isothiouronium(t.graph);if(!x)return [];const alkyl=rxCarbonNeighbors(t.graph,x.s).find(n=>n.atom.id!==x.c);if(!alkyl)return [];const pieces=retroEdit(t,g=>{if(!retroCut(g,x.s,alkyl.atom.id))return false;x.ns.forEach(id=>{rxSetOrder(g,x.c,id,1);g.getAtom(id).charge=0;});rxSetOrder(g,x.c,x.s,2);rxAttach(g,'Br',alkyl.atom.id);});return pieces&&pieces.length===2?[retroSpec(retroReactants(pieces),[],{solvents:['ethanol']})]:[];}},
 {id:'isothiouronium-hydrolysis',name:'Thiol from isothiouronium hydrolysis',rule:'isothiouronium-hydrolysis',group:'Sulfur',match(t){return rxxThiols(t).slice(0,RETRO_LIMITS.maxPerTransform).map(s=>retro6One(t,g=>{const c=rxAttach(g,'C',s);rxAttach(g,'N',c.id);rxAttach(g,'N',c.id,2,1);},[],{solvents:['water'],additives:['naoh'],temperature:80})).filter(Boolean);}}
);
