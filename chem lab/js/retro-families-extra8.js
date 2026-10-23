// Aromatic-ring disconnections are independently filtered by the class-specific
// forward rule, including the supported heteroaryl partner combinations.
for(const kind of ['negishi','kumada','stille'])RETRO_TRANSFORMS.push({id:kind,name:kind[0].toUpperCase()+kind.slice(1)+' biaryl disconnection',rule:kind,group:'Cross-coupling',match(t){
 const bonds=t.graph.bonds.filter(b=>b.order===1&&t.aromatic.has(b.atomA)&&t.aromatic.has(b.atomB));
 return bonds.slice(0,RETRO_LIMITS.maxPerTransform).flatMap(b=>[[b.atomA,b.atomB],[b.atomB,b.atomA]].map(([a,c])=>{
  const thienylDonor=kind==='stille'&&rxNeighbors(t.graph,c).some(n=>n.atom.element==='S'&&t.aromatic.has(n.atom.id));
  const pieces=retroEdit(t,g=>{
   if(!retroCut(g,a,c))return false;rxAttach(g,'Br',a);
   const metal=rxAttach(g,kind==='negishi'?'Zn':kind==='kumada'?'Mg':'Sn',c);
   if(kind==='stille'){for(let i=0;i<3;i++){let last=metal.id;for(let j=0;j<(thienylDonor?4:1);j++)last=rxAttach(g,'C',last).id;}}else rxAttach(g,'Br',metal.id);
  });
  if(!pieces||pieces.length!==2)return null;
  const conditions=kind==='stille'?{solvents:['nmp'],additives:['pdc','cui','asph3'],temperature:100,atmosphere:'n2'}:
   {solvents:['thf'],additives:[kind==='negishi'?'pdpph3':'nicl2dppp'],temperature:25,atmosphere:'n2'};
  return retroSpec(retroReactants(pieces),[],conditions);
 }).filter(Boolean));
}});
