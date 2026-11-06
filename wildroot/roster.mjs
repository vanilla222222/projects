import * as D from './content.mjs?v=35';
import * as E from './engine.mjs?v=35';
import {upgradeSource} from './reward-progression.mjs?v=35';
export const inEncounter=c=>!!(c.dungeon||c.trial||c.encounter||c.secret||c.activity==='boss');
const recipeFor=id=>D.RECIPES.find(r=>r.output===id||r.equipment===id);
const goal=(title,detail,action='inventory',value='')=>({title,detail,action,value});
const craftGoal=(s,c,id,title)=>{const r=recipeFor(id);return r&&E.recipeOpen(s,r)?goal(title||'Craft '+D.ITEMS[id].name,'Source: '+r.station+' · '+Object.entries(r.cost).map(([k,n])=>n+' '+D.ITEMS[k].name).join(', '),'recipe',r.id):null;};
function pouchGoal(s,c){const type=E.carryType(c.resource||'moss-slime'),pouches=Object.entries(D.CAPACITY_BAGS).filter(([id,d])=>d.type===type&&!c.usedCapacityBags.includes(id));
 for(const[id]of pouches)if(c.bag[id])return goal('Use your '+D.ITEMS[id].name,'Carried now. Consume it once in Items → Bags.','inventory','item:'+id);
 for(const[id]of pouches){const g=craftGoal(s,c,id);if(g){g.detail+=' · '+upgradeSource(s,c,id);return g;}}
 const bag=Object.entries(D.EXPANSIONS).find(([id,d])=>d.target==='bag'&&!c.usedExpansions.includes(id)&&c.bag[id]);
 return bag?goal('Use your '+bag[1].name,'Carried now. It adds personal backpack slots.','inventory','item:'+bag[0]):goal('Make room in your backpack','Walk to a town chest, deposit materials, then claim pending overflow.');
}
export function nextGoal(s,c){
 if(inEncounter(c))return goal('Finish or leave this encounter','Bosses, guardians, trials and dungeons require active play.','bossboard');
 if(Object.values(c.overflow).some(n=>n>0))return{...pouchGoal(s,c),title:'Claim pending loot and improve capacity'};
 if(c.activity==='gather'||c.assignmentWarning==='gathering'){
  const d=D.GATHER_NODES[c.resource],reason=d?E.gatherRequirement(c,c.resource):'';
  if(reason&&E.skillLevel(c,d.skill)<d.level)return goal('Train '+D.SKILLS[d.skill]+' to level '+d.level,'Gather '+(d.skill==='mining'?'Copper Ore in Lantern Mouth':'Oak Logs in Oakside Clearing')+' first.','assignment');
  if(reason){const id=d.skill==='mining'?(d.tier>=2?'iron-pick':'copper-pick'):(d.tier>=2?'iron-axe':'copper-axe');return craftGoal(s,c,id,reason)||goal('Unlock the next tool blueprint','Speak to Flint and Brann; progress their obtained quests.','quests');}
 }
 if(E.bagUsed(c)>=E.bagCapacity(c)-1)return pouchGoal(s,c);
 const carried=c.packGear.find(g=>{const d=D.EQUIPMENT[g.base],old=E.equipmentStats(c.loadout[d.slot]);return (!d.class||d.class===c.class)&&((c.activity==='gather'&&d.gatherTier>E.toolTier(c,E.gatherSkill(c.resource)))||(['weapon','body','charm'].includes(d.slot)&&((d.stats.attack||0)>(old.attack||0)||(d.stats.defense||0)>(old.defense||0)||(d.stats.accuracy||0)>(old.accuracy||0))));});
 if(carried)return goal('Equip your '+D.ITEMS[carried.base].name,'Already in this character’s backpack. Compare it with worn gear in Items.','inventory','gear:'+carried.uid);
 const fighting=c.activity==='fight'||c.assignmentWarning==='survival',enemy=fighting?D.zoneEnemy(c.area,c.zone):null;
 if(enemy){const f=E.fightStats(s,{...c,activity:'fight'});
  if(c.assignmentWarning==='survival'||f.incoming>=E.maxHp(c)){
   const armor=D.RECIPES.filter(r=>r.equipment&&D.EQUIPMENT[r.equipment].slot==='body'&&E.recipeOpen(s,r)&&
    (D.EQUIPMENT[r.equipment].stats.defense||0)>(E.equipmentStats(c.loadout.body).defense||0)).sort((a,b)=>D.EQUIPMENT[a.equipment].stats.defense-D.EQUIPMENT[b.equipment].stats.defense)[0];
   return armor?craftGoal(s,c,armor.equipment,'Improve armor before retrying'):goal('Prepare for a safer fight','Use an earlier enemy while you improve armor, health talents and equipped food.','assignment');
  }
  if(E.hitChance(c,enemy)<.9){if(E.combatPoints(c)||E.attributePoints(c))return goal('Spend points on accuracy','Train Precision or your class accuracy attribute in Talents.','skills');
   return craftGoal(s,c,'echo-lens','Improve accuracy with an Echo Lens')||goal('Improve your accuracy','Train Precision when you gain a level; compare hit chance in AFK Info.','skills');}
  if(f.incoming>0&&!c.foodSlots.some(t=>t?.count)){
   if(Object.keys(D.FOODS).some(id=>c.bag[id]))return goal('Equip carried food','Put food in a food slot in Items → Foods. Backpack food is not eaten automatically.','inventory','food');
   return goal('Buy and equip food','Trail Bread: Hearthstead shop, 4 coins each. Walk to a town shop, then equip bread in Items → Foods.','inventory','food');
  }
 }
 if(c.activity==='rest')return goal('Choose an assignment','Assign a personally discovered room, or take control and explore.','assignment');
 if(c.activity==='gather'){
  const skill=E.gatherSkill(c.resource),tier=E.toolTier(c,skill),tools=Object.entries(D.EQUIPMENT).filter(([id,d])=>d.slot===(skill==='mining'?'pick':'axe')&&d.gatherTier>tier&&recipeFor(id)&&E.recipeOpen(s,recipeFor(id))).sort((a,b)=>a[1].gatherTier-b[1].gatherTier);
  if(tools.length)return craftGoal(s,c,tools[0][0],'Upgrade to '+D.ITEMS[tools[0][0]].name);
  if(E.professionPoints(c))return goal('Invest profession points','Efficiency improves success and yield; check the next breakpoint in AFK Info.','skills');
  return pouchGoal(s,c);
 }
 const weapon=D.RECIPES.filter(r=>r.equipment&&D.EQUIPMENT[r.equipment].slot==='weapon'&&(!D.EQUIPMENT[r.equipment].class||D.EQUIPMENT[r.equipment].class===c.class)&&E.recipeOpen(s,r)&&D.EQUIPMENT[r.equipment].stats.attack>(E.equipmentStats(c.loadout.weapon).attack||0)).sort((a,b)=>D.EQUIPMENT[a.equipment].stats.attack-D.EQUIPMENT[b.equipment].stats.attack)[0];
 return weapon?craftGoal(s,c,weapon.equipment,'Upgrade your weapon'):goal('Continue your current assignment','Check obtained quests and personal portal goals for the next destination.','quests');
}
export function assignmentRooms(s,c){return D.AREAS.flatMap(a=>a.zones.map((name,zone)=>({area:a.id,zone,name}))).filter(r=>c.journey.visited[r.area+'-'+r.zone]&&E.zoneUnlocked(s,r.area,r.zone,c));}
export function assignmentTasks(area,zone){const a=D.areaById(area);if(!a||!Number.isInteger(zone)||zone<0||zone>=a.zones.length)return[];return[...(D.zoneEnemy(area,zone)?[{id:'fight',name:'Fight '+D.zoneEnemy(area,zone).name}]:[]),...a.resources[zone].map(id=>({id:'gather:'+id,name:'Gather '+D.ITEMS[id].name})),{id:'rest',name:'Rest and recover'}];}
export function assignmentReason(s,c,area,zone,task){
 if(!c||inEncounter(c))return'Finish or leave the active encounter first.';
 if(!assignmentRooms(s,c).some(r=>r.area===area&&r.zone===zone))return'This character must discover and unlock that room first.';
 if(!assignmentTasks(area,zone).some(t=>t.id===task))return'That task is unavailable in this room.';
 return task.startsWith('gather:')?E.gatherRequirement(c,task.slice(7)):'';
}
export function assignCharacter(s,c,area,zone,task){
 if(assignmentReason(s,c,area,zone,task))return false;
 if(c.area!==area||c.zone!==zone){for(const d of c.groundLoot||[]){if(d.itemId==='coins')s.coins+=d.count;else if(d.gear)c.packGear.push(d.gear);else E.give(c,d.itemId,d.count);}c.groundLoot=[];E.travel(s,c,area,zone);}
 return E.start(s,c,task.startsWith('gather:')?'gather':task,task.startsWith('gather:')?task.slice(7):null);
}
