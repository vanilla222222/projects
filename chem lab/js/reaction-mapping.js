// Bounded heavy-atom correspondence for inspecting an already predicted step.
// This is a minimum-edit graph heuristic, not a mechanistic atom mapper. It
// never creates reactions, infers isotope exchange, or certifies feasibility.
function reactionAtomMapping(compounds, productSmiles, options) {
  const opts = Object.assign({ maxStates: 8000, budgetMs: 25, maxAtoms: 100 }, options || {});
  const now = () => typeof performance !== 'undefined' ? performance.now() : Date.now();
  const began = now(), sources = [], sourceBonds = new Map();
  const key = (a,b) => a < b ? a+':'+b : b+':'+a;
  const heavy = a => !['H','D'].includes(a.element);
  const signature = a => a.element + ':' + (a.isotope || 0);
  const read = text => reactionFragmentGraph(smilesToFragment(text));
  try {
    (compounds || []).forEach((c, compoundIndex) => {
      if (c.role === 'catalyst' || c.role === 'solvent') return;
      const g = read(c.isomericSmiles || c.smiles), ids = new Map();
      g.atoms.forEach((a,i) => { if(heavy(a)) {ids.set(a.id,sources.length); sources.push({element:a.element,isotope:a.isotope||0,charge:a.charge||0,compoundIndex,atomIndex:i+1,smiles:c.isomericSmiles||c.smiles,role:c.role||'reactant'});} });
      g.bonds.forEach(b => {if(ids.has(b.atomA)&&ids.has(b.atomB))sourceBonds.set(key(ids.get(b.atomA),ids.get(b.atomB)),b.order);});
    });
    const pg = read(productSmiles), target = [], targetBonds = new Map(), ids = new Map();
    pg.atoms.forEach((a,i) => {if(heavy(a)){ids.set(a.id,target.length);target.push({element:a.element,isotope:a.isotope||0,charge:a.charge||0,atomIndex:i+1});}});
    pg.bonds.forEach(b => {if(ids.has(b.atomA)&&ids.has(b.atomB))targetBonds.set(key(ids.get(b.atomA),ids.get(b.atomB)),b.order);});
    if(!target.length || sources.length>opts.maxAtoms || target.length>opts.maxAtoms) return {status:'unresolved',reason:'Atom correspondence exceeds the supported size or has no heavy atoms.',pairs:[],changes:[]};
    const pools=target.map(a=>sources.flatMap((b,j)=>signature(a)===signature(b)?[j]:[]));
    const counts=atoms=>atoms.reduce((m,a)=>(m[signature(a)]=(m[signature(a)]||0)+1,m),{});
    const have=counts(sources),need=counts(target),missing=Object.keys(need).filter(k=>need[k]>(have[k]||0)).map(k=>({signature:k,count:need[k]-(have[k]||0)}));
    if(missing.length)return {status:'incomplete',reason:'Listed inputs do not account for all product heavy atoms. An implicit reagent or work-up source may be missing.',missing,pairs:[],changes:[]};
    const degree=(bonds,i,n)=>{let d=0;for(let j=0;j<n;j++)if(bonds.has(key(i,j)))d++;return d;};
    const td=target.map((a,i)=>degree(targetBonds,i,target.length)),sd=sources.map((a,i)=>degree(sourceBonds,i,sources.length));
    const order=target.map((a,i)=>i).sort((a,b)=>pools[a].length-pools[b].length||td[b]-td[a]||a-b);
    const assigned=Array(target.length).fill(-1),used=new Set();
    let states=0,bounded=false,best=null,bestCost=Infinity,equalBest=0;
    const visit=(depth,cost)=>{
      if(states++>=Math.max(1,opts.maxStates)||now()-began>=Math.max(1,opts.budgetMs)){bounded=true;return;}
      if(cost>bestCost)return;
      if(depth===order.length){
        // Also count bonds to atoms omitted from the displayed product. Their
        // fate is unmodelled; they are not asserted to disappear physically.
        let total=cost;
        sourceBonds.forEach((v,k)=>{const [a,b]=k.split(':').map(Number);if(used.has(a)!==used.has(b))total++;});
        if(total<bestCost){bestCost=total;best=assigned.slice();equalBest=1;}else if(total===bestCost)equalBest++;
        return;
      }
      const i=order[depth];
      const choices=pools[i].filter(j=>!used.has(j)).map(j=>{
        let delta=0;
        for(let k=0;k<assigned.length;k++)if(assigned[k]>=0){const a=targetBonds.get(key(i,k))||0,b=sourceBonds.get(key(j,assigned[k]))||0;if(a!==b)delta++;}
        return {j,delta};
      }).sort((a,b)=>a.delta-b.delta||Math.abs(td[i]-sd[a.j])-Math.abs(td[i]-sd[b.j])||a.j-b.j);
      for(const {j,delta} of choices){assigned[i]=j;used.add(j);visit(depth+1,cost+delta);used.delete(j);assigned[i]=-1;if(bounded)break;}
    };
    visit(0,0);
    if(!best)return {status:'unresolved',reason:'The bounded correspondence search did not complete a mapping.',bounded,states,pairs:[],changes:[]};
    const pairs=best.map((j,i)=>({map:i+1,product:target[i],source:sources[j]})),reverse=new Map(best.map((j,i)=>[j,i+1]));
    const changes=[];
    for(let i=0;i<target.length;i++)for(let j=i+1;j<target.length;j++){
      const before=sourceBonds.get(key(best[i],best[j]))||0,after=targetBonds.get(key(i,j))||0;
      if(before!==after)changes.push({kind:!before?'formed':!after?'broken':'order',atoms:[i+1,j+1],before,after});
    }
    const omitted=sources.filter((a,j)=>!reverse.has(j));
    const detached=[];
    sourceBonds.forEach((v,k)=>{const[a,b]=k.split(':').map(Number);if(reverse.has(a)!==reverse.has(b))detached.push({map:reverse.get(a)||reverse.get(b),source:sources[reverse.has(a)?b:a],order:v});});
    return {status:'mapped',method:'bounded minimum-edit heavy-atom correspondence',bounded,ambiguous:equalBest>1,equalBest,states,editCount:bestCost,pairs,changes,detached,omitted,
      chargeChanges:pairs.filter(p=>p.source.charge!==p.product.charge).map(p=>({map:p.map,before:p.source.charge,after:p.product.charge})),
      reason:'Illustrative correspondence only. Hydrogen transfers, stereochemical mechanism and byproduct balance are not mapped. '+(bounded?'Search limit reached; a lower-edit mapping may exist.':equalBest>1?'Multiple equally scored mappings exist.':'The graph score does not establish a unique physical atom origin.')};
  } catch(error) {return {status:'unresolved',reason:'Atom correspondence could not be parsed: '+error.message,pairs:[],changes:[]};}
}

function reactionMappingElement(report) {
  const make=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);return e;};
  const root=make('details');root.append(make('summary','Atom correspondence · '+report.status));root.append(make('p',report.reason));
  if(report.status!=='mapped')return root;
  root.append(make('p',report.pairs.length+' product heavy atoms matched; '+report.changes.length+' bond changes between matched atoms; '+report.detached.length+' bonds to omitted input atoms.'));
  const table=make('table'),head=make('tr');['Map','Input compound / atom','Product atom'].forEach(t=>head.append(make('th',t)));const thead=make('thead');thead.append(head);table.append(thead);const body=make('tbody');
  report.pairs.forEach(p=>{const row=make('tr');[p.map,(p.source.compoundIndex+1)+' / '+p.source.atomIndex+' '+p.source.element,p.product.atomIndex+' '+p.product.element].forEach(t=>row.append(make('td',t)));body.append(row);});table.append(body);root.append(table);
  const list=make('ul');report.changes.forEach(c=>list.append(make('li','Maps '+c.atoms.join('–')+': '+c.kind+' bond ('+c.before+' → '+c.after+').')));report.detached.forEach(c=>list.append(make('li','Map '+c.map+': bond to omitted input atom '+(c.source.compoundIndex+1)+' / '+c.source.atomIndex+' '+c.source.element+'.')));root.append(list);return root;
}
