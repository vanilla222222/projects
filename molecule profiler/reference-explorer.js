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
    detail.append(node('p','Context only. Not a measured affinity, activity, or target prediction.','muted'));
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
  function duplicates(key){
    const seen=new Map(),dups=[];
    library.forEach((x,i)=>{const val=String(x[key]||'').trim();if(!val)return;const k=key==='name'?val.toLowerCase():val;if(seen.has(k))dups.push({value:val,first:seen.get(k),next:i});else seen.set(k,i)});
    return dups;
  }
  const missingFormula=library.filter(x=>!String(x.formula||'').trim()).length;
  const missingSmiles=library.filter(x=>!String(x.smiles||'').trim()).length;
  const nameDup=duplicates('name'),smilesDup=duplicates('smiles');
  const output=$('audit-output');
  output.replaceChildren(node('p','Library entries: '+library.length+' | Missing formulas: '+missingFormula+' | Missing SMILES: '+missingSmiles+' | Duplicate names: '+nameDup.length+' | Duplicate exact SMILES: '+smilesDup.length));
  function examples(label,rows){
    output.append(node('h3',label));
    if(!rows.length){output.append(node('p','None detected'));return}
    const ul=node('ul');rows.slice(0,20).forEach(x=>ul.append(node('li',x.value+' (entries '+(x.first+1)+' and '+(x.next+1)+')')));output.append(ul);
    if(rows.length>20)output.append(node('p','Showing first 20 of '+rows.length+'.','muted'));
  }
  examples('Duplicate names',nameDup);examples('Duplicate exact SMILES',smilesDup);
  const absent=profiles.filter(p=>!byName.has(p.name.toLowerCase()));
  output.append(node('p','Reference profiles missing a matching library entry: '+absent.length+(absent.length?' — '+absent.map(x=>x.name).join(', '):'')));
})();
