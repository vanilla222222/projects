import * as D from './content.mjs?v=45';

export function itemSources(id,limit=5){
 const result=[];
 for(const a of D.AREAS)for(const [zone,resources] of a.resources.entries())if(resources.includes(id))result.push({name:a.zones[zone],action:'Gather',room:a.id+':'+zone});
 for(const e of Object.values(D.ENEMIES))if(e.loot.some(drop=>drop.id===id))result.push({name:e.name,action:'Enemy drop',room:e.area+':'+e.index});
 for(const r of D.RECIPES)if(!r.retired&&(r.output===id||r.equipment===id))result.push({name:r.name,action:'Recipe',recipe:r.id});
 if(D.ANVIL_PRODUCTS[id])result.push({name:D.ANVIL_PRODUCTS[id].name,action:'Anvil production'});
 for(const [area,shop] of Object.entries(D.TOWN_SHOPS))if(shop.stock.some(([item])=>item===id))result.push({name:shop.name,action:'Shop',room:area+':0'});
 for(const q of D.STORY)if(q.reward.items?.[id])result.push({name:q.name,action:'Quest reward'});
 return result.slice(0,limit);
}
