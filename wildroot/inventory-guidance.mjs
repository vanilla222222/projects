import {TIDE_NPCS} from './tide-campaign.mjs?v=45';
import * as E from './engine.mjs?v=45';
import * as D from './content.mjs?v=45';
export function comparison(c,gear,slot=null){
 const def=D.EQUIPMENT[gear.base],target=slot||(def.slot==='ring'&&c.loadout.ring&&!c.loadout.ring2?'ring2':def.slot),old=c.loadout[target],next=E.equipmentStats(gear),before=E.equipmentStats(old);
 return{target,old,allowed:!def.class||def.class===c.class,rows:[...new Set([...Object.keys(next),...Object.keys(before)])].map(stat=>({stat,before:before[stat]||0,after:next[stat]||0,delta:(next[stat]||0)-(before[stat]||0)})).filter(r=>Math.abs(r.delta)>1e-8)};
}
export function lootStatus(c){return{used:E.bagUsed(c),capacity:E.bagCapacity(c),pending:Object.values(c.overflow).reduce((a,n)=>a+n,0),floor:(c.groundLoot||[]).filter(d=>d.itemId!=='coins').reduce((a,d)=>a+d.count,0),locked:c.lockedSlots.length};}
export function storeAndClear(s,c){
 const result={deposited:0,claimed:0,pending:Object.values(c.overflow).reduce((a,n)=>a+n,0)};if(!E.storageAccess(c))return result;
 // Each pass either reduces pending quantities or stops. Full chests and locks retain leftovers.
 while(true){result.deposited+=E.depositAll(s,c);const n=E.reclaim(c);result.claimed+=n;if(!n)break;}
 result.pending=Object.values(c.overflow).reduce((a,n)=>a+n,0);return result;
}
export function storeGear(s,c){let n=0;for(const g of [...c.packGear])if(E.depositGear(s,c,g.uid))n++;return n;}
export function itemSources(s,c,id){
 const out=[];
 for(const r of D.RECIPES)if(!r.retired&&(r.output===id||r.equipment===id))out.push({text:r.name+' · '+r.station+(E.recipeOpen(s,r)?'':' · '+E.blueprintHint(s,r)),recipe:r.id});
 for(const e of Object.values(D.ENEMIES))for(const drop of e.loot)if(drop.id===id)out.push({text:e.name+' · '+Number((drop.chance*100).toPrecision(3))+'%',enemy:e.id,room:e.id==='boss'?'jungle-town:2':D.SECRETS[e.id]?D.SECRETS[e.id].area+':'+D.SECRETS[e.id].zone:e.area+':'+e.index});
 for(const a of D.AREAS){const zones=a.resources.map((items,zone)=>items.includes(id)?zone:-1).filter(z=>z>=0);if(zones.length){const zone=zones.find(z=>E.zoneUnlocked(s,a.id,z,c))??zones[0];out.push({text:'Gather '+D.ITEMS[id].name+' · '+a.zones[zone]+(D.GATHER_NODES[id]?' · '+D.SKILLS[D.GATHER_NODES[id].skill]+' '+D.GATHER_NODES[id].level+'+':''),room:a.id+':'+zone});}}
 for(const[town,d]of Object.entries(D.TOWN_SHOPS)){const stock=d.stock.find(r=>r[0]===id);if(stock)out.push({text:d.name+' · '+stock[1]+' coins',room:town+':0'});}
 for(const q of D.STORY)if(q.reward.items?.[id])out.push({text:(c.journey.story[q.id]?.accepted||c.journey.story[q.id]?.done?q.name:'Speak to '+(q.giver==='steward'?'Hesta':(D.CLASSES[q.giver]?.trainer||TIDE_NPCS[q.giver]?.name||'Expedition crew')))+' · quest reward',npc:q.giver});
 const world=D.WORLD_LOOT.find(d=>d.id===id),global=D.GLOBAL_LOOT.find(d=>d.id===id);if(world||global)out.push({text:'Any World One enemy · '+((world||global).chance*100).toPrecision(2)+'%'});
 if(D.ANVIL_PRODUCTS[id])out.push({text:'Passive anvil production',room:'town:1'});
 if(id==='rootwarden-scale')out.push({text:'Rootwarden hunts: 2 / 4 / 7 scales per Normal / Challenger / Ancient victory',room:'jungle-town:2'});
 if(id.startsWith('statue-'))out.push({text:D.STATUES[id.slice(7)]?.source||'World One gathering and combat'});
 if(id.startsWith('world-token-'))out.push({text:'Complete all three quests for this mentor'});
 return out;
}
