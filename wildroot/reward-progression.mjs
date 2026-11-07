import {STORY,EXPANSIONS,CAPACITY_BAGS,STAMPS,QUEST_UPGRADES,UPGRADE_SOURCES,TOWN_SHOPS} from './content.mjs?v=40';
import * as I from './inventory.mjs?v=40';

export const REPEAT_UPGRADE_COINS=35;
const permanent=id=>!!(EXPANSIONS[id]||CAPACITY_BAGS[id]||id.startsWith('stamp-')&&STAMPS[id.slice(6)]);
const shared=id=>EXPANSIONS[id]?.target==='chest'||id.startsWith('stamp-');
const held=(c,id)=>(c.bag?.[id]||0)+(c.overflow?.[id]||0)>0||(c.groundLoot||[]).some(d=>d.itemId===id);
function owned(s,c,id){
 if(shared(id))return!!(s.upgradeRewardClaims?.includes(id)||s.usedChestExpansions.includes(id)||s.stamps[id.slice(6)]||s.inventory[id]>0||s.characters.some(who=>held(who,id)));
 return!!(c.upgradeRewardClaims?.includes(id)||c.usedExpansions.includes(id)||c.usedCapacityBags.includes(id)||held(c,id));
}
function mark(s,c,id){const claims=shared(id)?s.upgradeRewardClaims:c.upgradeRewardClaims;if(!claims.includes(id))claims.push(id);}
export function questRewardPlan(s,c,q){
 const items={};let replacementCoins=0;
 for(const[id,n]of Object.entries(q.reward.items||{})){
  if(permanent(id)&&owned(s,c,id))replacementCoins+=REPEAT_UPGRADE_COINS*n;
  else items[id]=n;
 }
 return{items,replacementCoins,coins:(q.reward.coins||0)+replacementCoins};
}
export function grantQuestItems(s,c,q){
 const plan=questRewardPlan(s,c,q);s.coins+=plan.coins;
 for(const[id,n]of Object.entries(plan.items))I.give(c,id,n);
 for(const id of Object.keys(q.reward.items||{}))if(permanent(id))mark(s,c,id);
 return plan;
}
export function initializeUpgradeRewards(s){
 s.upgradeRewardClaims??=[];for(const c of s.characters)c.upgradeRewardClaims??=[];
 // Backfill only newly added rewards, plus the original stamp migration.
 // Record before granting so reloads, sold rewards and other characters cannot duplicate them.
 for(const q of STORY){
  if(s.story[q.id]?.done){
   for(const id of Object.keys(q.reward.items||{}).filter(shared)){
    const c=s.characters.find(c=>c.journey.story[q.id]?.done)||s.characters[0];
    if((QUEST_UPGRADES[q.id]?.[id]||!s.stampRewardClaims.includes(q.id))&&!owned(s,c,id))I.give(c,id,1);mark(s,c,id);
   }
   if(Object.keys(q.reward.items||{}).some(id=>id.startsWith('stamp-'))&&!s.stampRewardClaims.includes(q.id))s.stampRewardClaims.push(q.id);
  }
  for(const c of s.characters)if(c.journey.story[q.id]?.done)for(const id of Object.keys(QUEST_UPGRADES[q.id]||{}).filter(id=>!shared(id))){
   if(!owned(s,c,id))I.give(c,id,1);mark(s,c,id);
  }
 }
 return s;
}
export function validateUpgradeRewards(s){
 const valid=(ids,account)=>Array.isArray(ids)&&new Set(ids).size===ids.length&&ids.every(id=>permanent(id)&&!!shared(id)===account);
 if(!valid(s.upgradeRewardClaims,true)||s.characters.some(c=>!valid(c.upgradeRewardClaims,false)))throw Error('Invalid permanent quest reward history.');
}
export function upgradeSource(s,c,id){
 const source=UPGRADE_SOURCES[id],out=[];if(!source)return'Unknown source';
 for(const qid of source.quests){const q=STORY.find(q=>q.id===qid);out.push(c.journey.story[qid]?.accepted||c.journey.story[qid]?.done?q.name+' quest':'Undiscovered quest');}
 if(source.shop)out.push(TOWN_SHOPS[source.shop].name);
 if(source.recipe)out.push('Craft at the anvil');
 return[...new Set(out)].join(' · ');
}
