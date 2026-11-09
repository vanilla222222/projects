import {ITEMS,EQUIPMENT} from './content.mjs?v=45';
import {bagSlots} from './inventory.mjs?v=45';
import {esc,itemArt} from './ui-art.mjs?v=50';
export function museumPanel(s,c,view={}){
 const query=(view.museumSearch||'').toLowerCase(),filter=view.museumFilter||'owned';
 const owned=new Set(bagSlots(c).flatMap((t,i)=>c.lockedSlots.includes(i)?[]:[t?.id||c.packGear.find(g=>g.uid===t?.uid)?.base]).filter(Boolean));
 const entries=Object.entries(ITEMS).filter(([id,d])=>(filter==='all'||filter==='gallery'&&s.museum[id]||filter==='owned'&&owned.has(id))&&d.name.toLowerCase().includes(query));
 return `<p class="intro">Exhibit one of every item to earn milestone gems. You can take exhibits back and keep collection credit. Displayed equipment binds to your roster. Museum-bound gear can be equipped and stored, but cannot be sold, dropped, salvaged or spent as a crafting ingredient.</p><strong>${Object.keys(s.museum).length}/${Object.keys(ITEMS).length} collected</strong><div class="save-actions">${[['owned','BACKPACK'],['gallery','EXHIBITED'],['all','FULL CATALOG']].map(([id,name])=>`<button data-museum-filter="${id}" aria-pressed="${filter===id}">${name}</button>`).join('')}</div><input id="museum-search" aria-label="Search exhibits" placeholder="Search exhibits" value="${esc(view.museumSearch||'')}"><div class="grid">${entries.map(([id,d])=>{
  const exhibit=s.museum[id],can=exhibit?.stored||owned.has(id);
  return `<article class="recipe-card">${itemArt(id)}<h3>${esc(d.name)}</h3><p>${exhibit?.stored?'On display':exhibit?'Cataloged · checked out':EQUIPMENT[id]?'Equipment':'Item'}</p><button ${exhibit?.stored?'data-museum-retrieve':'data-museum-exhibit'}="${id}" ${can?'':'disabled'}>${exhibit?.stored?'TAKE BACK':'EXHIBIT'}</button></article>`;
 }).join('')||'<p>No matching exhibits.</p>'}</div>`;
}
