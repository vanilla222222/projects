import * as D from './content.mjs?v=27';
import * as I from './inventory.mjs?v=27';
import {BADGES,PROJECTS,itemProject} from './item-roles.mjs?v=27';
import {serviceAccess} from './services.mjs?v=27';
export {BADGES,PROJECTS,itemProject};
export const SALVAGE_GOODS={charcoal:{cost:12,count:1},dust:{cost:20,count:1},'binding-resin':{cost:30,count:1},'copper-bar':{cost:40,count:1},'iron-bar':{cost:65,count:1,unlock:'ironworking'},'tempered-bar':{cost:120,count:1,unlock:'verdant-steel'}};
export const salvageValue=id=>D.EQUIPMENT[id]?Math.max(8,Math.floor(Object.values(D.RECIPES.find(r=>r.equipment===id)?.cost||{}).reduce((a,n)=>a+n,0)*.5)):{common:1,rare:6,legendary:25,mythical:100}[D.ITEMS[id]?.rarity]||0;
export function initializeEconomy(s){s.economy??={salvage:0,projects:{},attuned:[],patterns:[]};return s;}
export function badgeOwned(s,id){return id==='world-one-completion'?s.worldCompletionCrafted:id==='rootbound-key'?s.storyFlags.bossPermit:id.startsWith('world-token-')?s.npcTokens.includes(id.slice(12)):false;}
export function reserveCopy(s,c,id){
 if(BADGES[id])return Infinity;
 if(id==='boss-heart'&&!s.story.heart?.done)return 1;
 if(D.EXPANSIONS[id])return(D.EXPANSIONS[id].target==='bag'?c.usedExpansions:s.usedChestExpansions).includes(id)?0:1;
 if(D.CAPACITY_BAGS[id])return c.usedCapacityBags.includes(id)?0:1;
 if(id.startsWith('stamp-'))return s.stamps[id.slice(6)]?0:1;
 if(id.startsWith('anvil-expansion-'))return s.workshop.pages>=Number(id.slice(-1))?0:1;
 if(id==='sculpting-tool')return c.statuesUnlocked?0:1;
 return 0;
}
export function itemSlot(c,index){const t=I.bagSlots(c)[index];if(!t)return null;const gear=t.uid?c.packGear.find(e=>e.uid===t.uid):null;return{...t,id:gear?.base||t.id,gear,qty:t.qty||1};}
export function spareQuantity(s,c,index){const t=itemSlot(c,index);if(!t||c.lockedSlots.includes(index)||BADGES[t.id])return 0;if(t.gear)return 1;const owned=I.amount(s,t.id,c)+(c.overflow[t.id]||0);return Math.max(0,Math.min(t.qty,I.unlockedAmount(c,t.id),owned-reserveCopy(s,c,t.id)));}
export function reclaimItem(s,c,index,quantity=1){if(!serviceAccess(s,c,'foundry','upgrade')||!Number.isSafeInteger(quantity)||quantity<1||spareQuantity(s,c,index)<quantity)return 0;const t=itemSlot(c,index),taken=I.takeSlot(c,index,quantity);if(!taken)return 0;const value=salvageValue(t.id)*taken.count;s.economy.salvage+=value;return value;}
export function buySalvage(s,c,id,count=1){const d=SALVAGE_GOODS[id];if(!serviceAccess(s,c,'foundry','upgrade')||!d||!Number.isInteger(count)||count<1||count>100||d.unlock&&!s.recipeUnlocks.includes(d.unlock)||s.economy.salvage<d.cost*count||I.carryRoom(c,id)<d.count*count)return false;s.economy.salvage-=d.cost*count;I.carry(c,id,d.count*count);return true;}
export const projectLevel=(s,id)=>Math.min(10,Math.floor(Math.sqrt((s.economy.projects[id]||0)/100)));
export const projectTarget=(s,id)=>100*(projectLevel(s,id)+1)**2;
export function contributeItem(s,c,index,quantity=1){if(!serviceAccess(s,c,'vault','upgrade')||!Number.isSafeInteger(quantity)||quantity<1||spareQuantity(s,c,index)<quantity)return 0;const t=itemSlot(c,index),id=itemProject(t.id,!!t.gear);if(projectLevel(s,id)>=10)return 0;const remaining=10000-(s.economy.projects[id]||0),value=salvageValue(t.id);if(value*quantity>remaining)return 0;const taken=I.takeSlot(c,index,quantity);if(!taken)return 0;s.economy.projects[id]=(s.economy.projects[id]||0)+value*taken.count;return value*taken.count;}
export function attuneBadge(s,c,id){if(!serviceAccess(s,c,'vault','upgrade')||!BADGES[id]||!badgeOwned(s,id)||s.economy.attuned.includes(id))return false;s.economy.attuned.push(id);return true;}
export function learnBadgePattern(s,c,id){if(!serviceAccess(s,c,'vault','upgrade')||!BADGES[id]||!badgeOwned(s,id)||s.economy.patterns.includes(id)||s.coins<50)return false;s.coins-=50;s.economy.patterns.push(id);s.recipeUnlocks.push('badge-'+id);return true;}
export function economyBonuses(s){const b={};for(const id of s.economy.attuned){const d=BADGES[id];b[d.effect]=(b[d.effect]||0)+d.amount;}for(const[id,d]of Object.entries(PROJECTS))b[d.effect]=(b[d.effect]||0)+d.amount*projectLevel(s,id);return b;}
export const INFUSION_ITEMS=()=>D.OFFERINGS.filter(id=>!BADGES[id]);
export function infusionStats(id){if(!INFUSION_ITEMS().includes(id))return{};const power={common:1,rare:2,legendary:3,mythical:4}[D.ITEMS[id].rarity],hash=[...id].reduce((n,c)=>n+c.charCodeAt(0),0),effect=['attack','health','mining','logging','crafting','crit'][hash%6];return{[effect]:power*(effect==='health'?8:['mining','logging','crafting'].includes(effect)?.03:effect==='crit'?.004:1)};}
export const infusionCost=id=>({[id]:D.ITEMS[id]?.rarity==='common'?10:D.ITEMS[id]?.rarity==='rare'?2:1,dust:3});
export function infuseItem(s,c,uid,id,replace=false){const gear=[...Object.values(c.loadout),...c.packGear].find(g=>g.uid===Number(uid));if(!serviceAccess(s,c,'enchanting','upgrade')||!gear||!INFUSION_ITEMS().includes(id)||gear.infusion&&!replace||I.gearLocked(c,uid))return false;const cost=infusionCost(id);if(I.amount(s,id,c)-cost[id]<reserveCopy(s,c,id)||!I.pay(s,cost,c))return false;gear.infusion=id;c.skills.enchanting+=8;return true;}
export function validateEconomy(s){const e=s.economy,int=n=>Number.isSafeInteger(n)&&n>=0;if(!e||!int(e.salvage)||!e.projects||Object.entries(e.projects).some(([id,n])=>!PROJECTS[id]||!int(n)||n>10000)||!Array.isArray(e.attuned)||!Array.isArray(e.patterns)||[e.attuned,e.patterns].some(a=>new Set(a).size!==a.length||a.some(id=>!BADGES[id]||!badgeOwned(s,id))))throw Error('Invalid item projects or badge records.');for(const id of e.patterns)if(!s.recipeUnlocks.includes('badge-'+id))throw Error('Missing badge blueprint.');for(const g of [...s.armory,...s.characters.flatMap(c=>[...Object.values(c.loadout),...c.packGear,...(c.groundLoot||[]).filter(d=>d.gear).map(d=>d.gear)])])if(g.infusion!==undefined&&!INFUSION_ITEMS().includes(g.infusion))throw Error('Invalid relic infusion.');}
