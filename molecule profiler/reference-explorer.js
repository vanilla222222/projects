'use strict';
(function(){
  const $=id=>document.getElementById(id);
  const library=typeof LIBRARY!=='undefined'&&Array.isArray(LIBRARY)?LIBRARY:[];
  const profiles=typeof SIGNAL_REFERENCE_PROFILES!=='undefined'&&Array.isArray(SIGNAL_REFERENCE_PROFILES)?SIGNAL_REFERENCE_PROFILES:[];
  const byName=new Map(library.map(x=>[String(x.name||'').toLowerCase(),x]));
  const result=$('results'),detail=$('detail'),search=$('search'),group=$('group');
  const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el};
  const unique=[...new Set(profiles.map(x=>x.group))].sort();
  unique.forEach(g=>{const opt=node('option',g);opt.value=g;group.append(opt)});
  let selected='';
  function show(p){
    selected=p.name;
    detail.replaceChildren(node('h2',p.name),node('span',p.group,'pill'),node('p',p.role));
    const entry=byName.get(p.name.toLowerCase());
    const dl=node('dl');
    const field=(key,value)=>{dl.append(node('dt',key),node('dd',value))};
    field('Library status',entry?'Present':'Missing from library');
    if(entry){field('SMILES',entry.smiles||'Not provided');field('Formula',entry.formula||'Not provided');field('Library class',entry.cls||'Unclassified')}
    detail.append(dl);
    detail.append(node('h3','Associated signalling systems'));
    if(p.systems.length){const ul=node('ul');p.systems.forEach(x=>ul.append(node('li',x)));detail.append(ul)}
    else detail.append(node('p','No receptor/system relationships asserted for this metabolite.'));
    detail.append(node('p','Evidence: biological context (not a measured affinity or target prediction). Library structure status: unverified against external authoritative identifiers.','muted'));
    const links=node('p');
    const pub=node('a','Search PubChem');pub.href='https://pubchem.ncbi.nlm.nih.gov/#query='+encodeURIComponent(p.name);pub.target='_blank';pub.rel='noopener noreferrer';
    const guide=node('a','Search IUPHAR/BPS Guide to PHARMACOLOGY');guide.href='https://www.guidetopharmacology.org/GRAC/LigandListForward?type=all';guide.target='_blank';guide.rel='noopener noreferrer';
    links.append(pub,node('span',' · '),guide);detail.append(links);
    renderList();
  }
  function renderList(){
    const q=search.value.trim().toLowerCase(),g=group.value;
    const filtered=profiles.filter(p=>(!g||p.group===g)&&(!q||[p.name,p.role,p.group,...p.systems].join(' ').toLowerCase().includes(q)));
    $('count').textContent='('+filtered.length+'/'+profiles.length+')';
    result.replaceChildren();
    if(!filtered.length)result.append(node('p','No matches'));
    filtered.forEach(p=>{const b=node('button',p.name,'item');b.type='button';b.setAttribute('aria-pressed',String(p.name===selected));b.append(node('div',p.group,'muted'));b.addEventListener('click',()=>show(p));result.append(b)});
  }
  search.addEventListener('input',renderList);group.addEventListener('change',renderList);renderList();
  if(profiles.length)show(profiles[0]);
  const audit=ReferenceAudit.auditLibrary(library,typeof TARGETS!=='undefined'?TARGETS:[],profiles);
  const output=$('audit-output');
  const summary=node('p','Library: '+audit.entries+' | Missing formulas: '+audit.missingFormula+' | Missing SMILES: '+audit.missingSmiles+' | Duplicate names: '+audit.duplicateNames.length+' | Duplicate exact SMILES: '+audit.duplicateSmiles.length);
  output.replaceChildren(summary);
  const stats=node('p','Reference profiles: '+audit.profiles+' | Unmatched profiles: '+audit.missingProfiles.length+' | Biological targets: '+audit.targets+' | Targets with fewer than 3 listed ligands: '+audit.sparseTargets+' | Targets with no listed ligands: '+audit.emptyTargets+' | Unresolved ligand names: '+audit.orphanedLigands.length);
  output.append(stats);
  function examples(label,rows,render){
    output.append(node('h3',label));
    if(!rows.length){output.append(node('p','None detected'));return}
    const ul=node('ul');rows.slice(0,20).forEach(x=>ul.append(node('li',render(x))));output.append(ul);
    if(rows.length>20)output.append(node('p','Showing first 20 of '+rows.length+'.','muted'));
  }
  examples('Duplicate names',audit.duplicateNames,x=>x.value+' (entries '+(x.first+1)+' and '+(x.next+1)+')');
  examples('Duplicate exact SMILES',audit.duplicateSmiles,x=>x.value+' (entries '+(x.first+1)+' and '+(x.next+1)+')');
  examples('Unresolved target ligand names',audit.orphanedLigands,x=>x.gene+': '+x.name);
  output.append(node('h3','Largest library classes'));
  const classes=node('ul');audit.classes.slice(0,15).forEach(x=>classes.append(node('li',x.name+': '+x.count)));output.append(classes);
  const btn=$('audit-export');
  btn.addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify({generatedAt:new Date().toISOString(),audit},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='molecule-profiler-reference-audit.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
})();
