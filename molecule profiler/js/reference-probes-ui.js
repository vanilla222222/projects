'use strict';
(function(root){
 const ui=root.ReferenceResearchUI,probes=root.ReferenceProbes.create(ui.model,root.CURATED_REFERENCES),$=id=>document.getElementById(id),{el,detail,link}=ui;
 function inspect(name,label){const b=el('button',label);b.type='button';b.addEventListener('click',()=>ui.openDossier(name));return b;}
 function render(){const result=probes.find({target:$('probes-target').value,assay:$('probes-assay').value,species:$('probes-species').value,requireMatchedControl:$('probes-matched').checked}),host=$('probes-results');host.replaceChildren();$('probes-status').textContent=result.length+' documented probes match · '+probes.candidates().length+' explicitly labeled probe identities in this curated collection. Other pharmacology references are not automatically chemical probes.';
  for(const p of result){const card=el('details');card.open=true;card.append(el('summary',p.label),inspect(p.name,'Inspect probe'));card.append(el('h3','Matching target/assay evidence'));for(const o of p.matchingContexts)card.append(ui.observation(o));card.append(el('h3','Source-designated controls'));
   for(const c of p.controls){const block=el('details');block.open=true;block.append(el('summary',c.label+' · '+c.scope),inspect(c.name,'Inspect control'));for(const o of c.evidence)block.append(ui.observation(o));block.append(el('p','The control designation is limited to its reported assay. No numeric bound is converted to zero or universal inactivity.'));card.append(block);}if(!p.controls.length)card.append(el('p','No source-designated control relationship is imported.'));
   card.append(el('h3','Counter-screens'));if(p.counterScreens.length)for(const o of p.counterScreens)card.append(ui.observation(o));else card.append(el('p','No explicitly designated quantitative counter-screen is imported. This does not establish selectivity.'));
   const caveats=el('details');caveats.open=true;caveats.append(el('summary','Selectivity limitations and source context'));for(const caveat of p.caveats){detail('Source limitation',caveat.text,caveats);for(const url of caveat.sourceUrls)caveats.append(link('Source ↗',url));}card.append(caveats);host.append(card);
  }
  if(!result.length)host.append(el('p','No documented probe matches this scope. A receptor agonist, antagonist or structural neighbour is not automatically a validated chemical probe.'));
 }
 $('probes-run').addEventListener('click',render);root.ReferenceProbesUI={probes,render};
})(globalThis);
