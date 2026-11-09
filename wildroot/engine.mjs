import {voidLock,voidUnlocked} from './void-world.mjs';
export * from './void-world.mjs';
import {COMPLETION_ITEMS,worldSkillBonus} from './world-rewards.mjs';
import {tierTwoDiscoveries} from './world-two.mjs?v=45';
export {advanceClass,advancementStatus,advancementName} from './world-two.mjs?v=45';
import {SKILL_TOOLS,ADVANCEMENTS,worldOf} from './expansion-content.mjs?v=45';
import * as Offline from './offline-progress.mjs?v=45';
import {forecastAssignment,commonLootSeconds} from './assignment-forecast.mjs?v=45';
import {recordQuestAction} from './quest-content.mjs?v=45';
import * as J from './journey.mjs?v=45';
export * from './museum.mjs';
export * from './journey.mjs?v=45';
import * as Builds from './class-builds.mjs?v=45';
export * from './class-builds.mjs?v=45';
import * as Books from './special-talents.mjs?v=45';
export * from './special-talents.mjs?v=45';
import * as Hunts from './boss-hunts.mjs?v=45';
export * from './boss-hunts.mjs?v=45';
import * as Dungeon from './dungeon.mjs?v=45';
export * from './dungeon.mjs?v=45';
import {roomLayout} from './layouts.mjs?v=49';
export * from './exploration.mjs?v=45';
export * from './item-economy.mjs?v=45';
import * as S from './services.mjs?v=45';
export * from './services.mjs?v=45';
export * from './workshop.mjs?v=45';
export * from './alchemy.mjs?v=45';
import * as C from './chronicle.mjs?v=45';
export * from './chronicle.mjs?v=45';
import * as A from './adventure.mjs?v=45';
export * from './adventure.mjs?v=45';
import * as L from './legacy.mjs?v=45';
export * from './legacy.mjs?v=45';
import * as I from './inventory.mjs?v=45';
import {CLASSES,SKILLS,AREAS,ITEMS,ENEMIES,RECIPES,OFFERINGS,WORLD_LOOT,GLOBAL_LOOT,FOODS,POTIONS,EQUIPMENT,GATHER_NODES,EXPANSIONS,SECRETS,areaById,zoneEnemy} from './content.mjs?v=45';
import * as P from './progression.mjs?v=45';
export * from './progression.mjs?v=45';
export {initialize,validate} from './progression.mjs?v=45';
export * from './inventory.mjs?v=45';
export {canPay,pay} from './inventory.mjs?v=45';
export const SAVE_VERSION=1,OFFLINE_CAP=8*3600,MAX_CHARACTERS=16;
export function makeCharacter(id,name){return P.initializeCharacter({id,name,class:null,level:1,xp:0,hp:40,skills:Object.fromEntries(Object.keys(SKILLS).map(k=>[k,0])),quests:{},talents:{power:0,vitality:0,industry:0},gear:{weapon:0,armor:0,pick:0,axe:0,rune:0,vitality:0},area:'forest',zone:0,activity:'rest',resource:null,progress:0,kills:0});}
export function freshSave(now=Date.now()){return P.initialize({version:SAVE_VERSION,savedAt:now,active:1,nextId:2,characters:[makeCharacter(1,'Adventurer')],inventory:{},coins:0,unlockedClasses:[],kills:{},archive:{},bossDefeated:false,log:['Welcome to the Greenreach. Meet Hesta in Hearthstead to begin the World One story.']});}
export function selected(s){return s.characters.find(c=>c.id===s.active)||s.characters[0];}
export function slots(s){return Math.min(MAX_CHARACTERS,1+s.unlockedClasses.length+tierTwoDiscoveries(s).length);}
export const note=P.log,addItem=(s,id,n=1)=>s.inventory[id]=(s.inventory[id]||0)+n,hasCost=P.canPay,spend=P.pay,skillLevel=P.skillLevel;
export function power(s,c){
 if(c.dungeon)return Math.floor(Dungeon.dungeonAttack(c));
 const stat=P.stats(c),armed=!!(c.loadout?.weapon||c.gear.weapon),legacy=c.loadout?.weapon?0:c.gear.weapon*7,b=P.bonusesFor(s,c);
 const base=4+c.level*1.8+Builds.primaryAttribute(c)*.45+legacy+stat.attack+c.gear.rune*2+(c.talents.power||0)*2;
 const attack=base*(1+b.attack+(c.classTalents?.force||0)*.01+P.potionValue(c,'attack')+(c.cardBonus?.attack||0))*(c.class==='warrior'?1.18:1);
 const excess=Math.max(0,attack-24);
 return Math.max(1,Math.floor(armed?attack:attack-excess+excess/(1+excess/12)));
}
export function maxHp(c){if(c.dungeon)return Dungeon.dungeonMaxHp(c);const stat=P.stats(c),legacy=c.loadout?.body?0:c.gear.armor*20;return Math.floor((40+(c.level-1)*6+legacy+stat.health+c.gear.vitality*6+(c.talents.vitality||0)*10)*(1+(c.accountBonuses?.health||0)+(c.classTalents?.fortitude||0)*.01+(c.cardBonus?.health||0)));}
export function defense(s,c){if(c.dungeon)return Dungeon.dungeonDefense(c);return P.stats(c).defense+(c.loadout?.body?0:c.gear.armor*2)+(P.bonusesFor(s,c).defense||0)+P.potionValue(c,'defense');}
export function critChance(c){if(c.dungeon)return Math.min(.75,.05+(c.dungeon.boons.crit||0));return Math.min(.6,.03+P.stats(c).crit+(c.talents.precision||0)*.015+(c.accountBonuses?.crit||0)+(c.cardBonus?.crit||0));}
export function attackInterval(c){if(c.dungeon)return .8/(1+((c.dungeon.boons.speed||0)+(c.dungeon.gear.charm||0)*.08));return Math.max(.35,.95*Builds.weaponProfile(c).interval/(1+(c.accountBonuses?.haste||0)+P.stats(c).haste+(c.talents.haste||0)*.02));}
export function movementSpeed(c){if(c.dungeon)return 245*(1+((c.dungeon.boons.speed||0)+(c.dungeon.gear.charm||0)*.08));return 245*(1+P.stats(c).speed+(c.accountBonuses?.speed||0)+P.potionValue(c,'speed')+(c.cardBonus?.speed||0));}
export function skillPower(c){if(c.dungeon)return 1;return 1+(c.accountBonuses?.skill||0)+P.stats(c).skill+(c.talents.signature||0)*.08+(c.classTalents?.primary||0)*.08+(c.cardBonus?.skill||0);}
export function gainXp(c,n){P.addXp(c,n);c.hp=Math.min(maxHp(c),c.hp);}
export function skillXp(c,id,n){c.skills[id]+=n*(1+(c.profTalents.mastery||0)*.05+(c.accountBonuses?.skillXP||0)+worldSkillBonus(c,id,EQUIPMENT)+(c.cardBonus?.skillXP||0)+(!['warrior','mage'].includes(c.class)?(c.classTalents?.specialist||0)*.03:0));}
export function useWorldReward(s,c,id){
 const world=Number(Object.keys(COMPLETION_ITEMS).find(key=>COMPLETION_ITEMS[key]===id));
 const recipe=RECIPES.find(r=>r.dropBlueprint===id);
 if(world){
  if(!s.worldTokensCrafted.includes(world)||s.worldXpBlessings.includes(world)||!I.unlockedAmount(c,id))return false;
 }else if(!recipe||s.recipeUnlocks.includes(id)||!I.unlockedAmount(c,id))return false;
 const slot=I.bagSlots(c).findIndex((t,i)=>t?.id===id&&!c.lockedSlots.includes(i));
 if(slot<0||!I.takeSlot(c,slot,1))return false;
 if(world){s.worldXpBlessings.push(world);P.syncAccount(s);}
 else P.unlock(s,id);
 return true;
}
export function areaUnlocked(s,id){if(id?.startsWith('void-'))return voidUnlocked(s);if(worldOf(id)===3)return !!(s.bossHunt.kills.tempest||s.kills.tempest||s.story['tide-restored']?.done);if(worldOf(id)===2)return !!(s.bossDefeated||s.storyFlags.complete&&s.worldCompletionCrafted);if(id==='depths')return(s.kills['deep-3']||0)>=12;if(id==='tree')return(s.kills['forest-3']||0)>=12;if(['town','forest','caves'].includes(id))return true;if(id==='jungle')return(s.kills['forest-4']||0)>=12;if(id==='deep')return(s.kills['caves-2']||0)>=12;if(id==='jungle-town')return s.outpostAccess||(s.kills['jungle-3']||0)>=J.PORTAL_GOALS.jungle[3];return false;}
export function zoneUnlocked(s,area,index,c=selected(s)){return areaUnlocked(s,area)&&!voidLock(s,area)&&J.personalRouteOpen(s,c,area,index);}
export function lockReason(s,area,index=0,c=selected(s)){if(area.startsWith('void-')&&!areaUnlocked(s,area))return 'Defeat the Eventide Colossus to open the Hollow Between.';if(voidLock(s,area))return voidLock(s,area);if(worldOf(area)===3&&!areaUnlocked(s,area))return 'Defeat the Tempest Sovereign to open the Astral Reach.';if(worldOf(area)===2&&!areaUnlocked(s,area))return 'Defeat the Rootwarden to open the Tidewilds.';return zoneUnlocked(s,area,index,c)?'':J.personalLock(s,c,area,index);}
export function travel(s,c,area,index){const a=areaById(area);if(!a||!Number.isInteger(index)||index<0||index>=a.zones.length||!zoneUnlocked(s,area,index,c)||c.dungeon)return false;c.assignmentWarning=null;c.encounter=null;c.trial=null;c.position=null;c.entryPoint=null;c.area=area;c.zone=index;c.secret=null;c.activity='rest';c.resource=null;c.progress=0;c.recovering=false;s.visited[`${area}-${index}`]=true;c.journey.visited[`${area}-${index}`]=true;return true;}
export const gatherSkill=resource=>GATHER_NODES[resource]?.skill||'logging';
export function toolTier(c,skill){const slot=SKILL_TOOLS[skill];return EQUIPMENT[c.loadout[slot]?.base]?.gatherTier??c.gear[slot]??0;}
export function gatherRequirement(c,resource){const d=GATHER_NODES[resource];if(!d)return 'Unknown gathering resource';if(skillLevel(c,d.skill)<d.level)return `${SKILLS[d.skill]} level ${d.level} required`;if(toolTier(c,d.skill)<d.tier)return `Tier ${d.tier} ${SKILL_TOOLS[d.skill]} tool or better required`;return '';}
export function start(s,c,activity,resource=null){if(c.dungeon)return false;const a=areaById(c.area);if(activity==='fight'&&!(c.secret?SECRETS[c.secret]?.enemy:zoneEnemy(c.area,c.zone)))return false;if(activity==='boss'&&(c.area!=='jungle-town'||c.zone!==2||!s.storyFlags.bossPermit))return false;if(activity==='gather'&&(!a.resources[c.zone].includes(resource)||gatherRequirement(c,resource)))return false;if(!['fight','boss','gather','rest'].includes(activity))return false;c.assignmentWarning=null;c.activity=activity;c.resource=resource;c.progress=0;return true;}
export function gatherInterval(c,resource){const skill=gatherSkill(resource),specialist=c.class&&(CLASSES[c.class].skill===skill||Object.values(ADVANCEMENTS).some(d=>d.id===c.advancement&&d.skill===skill)),stat=P.stats(c),tool=SKILL_TOOLS[skill];return Math.max(.65,(3+(['iron','birch'].includes(resource)?1:['gold','jungle-wood'].includes(resource)?2:0))/(1+(skillLevel(c,skill)-1)*.06+(specialist?.65:0)+(c.loadout[tool]?(stat[skill]||0):(c.gear[tool]||0)*.25)+(c.talents.industry||0)*.05+(c.profTalents.efficiency||0)*.05+(c.accountBonuses?.[skill]||0)+(specialist?(c.classTalents?.specialist||0)*.03:0)+P.potionValue(c,skill)));}
export function gatherYield(c,n,rng=Math.random){return n+successes(n,Math.min(.5,(c.profTalents.prosperity||0)*.02),rng);}
export function enemyFor(c){return c.activity==='boss'?ENEMIES.boss:c.secret?ENEMIES[SECRETS[c.secret]?.enemy]:zoneEnemy(c.area,c.zone);}
export const accuracy=c=>c.dungeon?100:(10+c.level*3+Builds.accuracyAttribute(c)*1.5+(c.talents.precision||0)*2+(P.stats(c).accuracy||0))*(1+(c.cardBonus?.accuracy||0)+(c.accountBonuses?.accuracy||0));
export const enemyAccuracy=e=>e.accuracy|| (e.id.startsWith('dungeon-')?100:e.id==='boss'?(e.accuracy||125):({forest:[7,15,25,40,60],caves:[15,32,55],jungle:[65,80,100,125],deep:[60,80,110,140],tree:[60,90,135]}[e.area]?.[e.index]||45));
export const hitChance=(c,e)=>Math.min(1,accuracy(c)/enemyAccuracy(e));
export const damageRange=(s,c)=>[Math.floor(power(s,c)*.8),Math.ceil(power(s,c)*1.2)];
export function gatherEfficiency(c,resource){const skill=gatherSkill(resource),tool=c.loadout[SKILL_TOOLS[skill]]?.base,tier=EQUIPMENT[tool]?.gatherEfficiency||({1:22,2:60}[toolTier(c,skill)]||0);return(5+6*skillLevel(c,skill)+tier)*(1+(P.stats(c)[skill]||0)+(c.accountBonuses?.[skill]||0)+(Books.specialBonuses(c).gathering||0)+(c.cardBonus?.[skill]||0)+(c.profTalents.efficiency||0)*.05+(c.class&&(CLASSES[c.class].skill===skill||Object.values(ADVANCEMENTS).some(d=>d.id===c.advancement&&d.skill===skill))?(c.classTalents.specialist||0)*.03:0));}
export function gatherOdds(c,resource){const efficiency=gatherEfficiency(c,resource),threshold=GATHER_NODES[resource]?.threshold||8,multi=Math.min(3,1+Math.floor(efficiency/threshold/2));return{efficiency,threshold,chance:Math.min(1,efficiency/threshold),multi,nextMultiAt:multi<3?threshold*multi*2:null};}
export function recordGather(s,c,id,n,rng=Math.random){recordQuestAction(c,'gather:'+id,n);s.metrics.gather[id]=(s.metrics.gather[id]||0)+n;A.addCards(s,id,successes(n,.015,rng));}
export function fightStats(s,c){const e=enemyFor(c);if(!e)return null;const guard=e.behavior==='guard'?1.15:1,hits=Math.ceil(e.hp*guard/(power(s,c)*Builds.weaponProfile(c).mult*(1+critChance(c)))),chance=hitChance(c,e),attackTime=hits/chance*attackInterval(c),movementTime=(c.secret?0:260/Math.max(1,movementSpeed(c))),spawns=Math.max(1,roomLayout(c.area,c.zone,false,c.secret||null).spawns.length),respawnLimit=(c.secret?9:5)/spawns,duration=Math.max(attackTime+movementTime,respawnLimit),strikes=Math.max(0,Math.ceil(attackTime/2)-1),incoming=Math.max(0,e.attack-defense(s,c))*strikes;return{duration,incoming,hits,strikes,attackTime,movementTime,respawnLimit,chance};}
export function successes(n,p,rng=Math.random){if(p>=1)return n;if(p<=0||n<=0)return 0;let hits=0,pos=0;while(pos<n){const u=Math.min(1-Number.EPSILON,Math.max(Number.MIN_VALUE,rng()));pos+=Math.floor(Math.log(1-u)/Math.log(1-p))+1;if(pos<=n)hits++;}return hits;}
export function grantKills(s,c,e,n,rng=Math.random,{collect=true}={}){const loot=[];if(n<=0)return;A.addCards(s,e.id,successes(n,.025,rng));c.kills+=n;J.recordPersonalKills(c,e.id,n);s.kills[e.id]=(s.kills[e.id]||0)+n;const rawCoins=e.coins*n*(1+(P.bonusesFor(s,c).coins||0)+(c.classTalents?.fortune||0)*.02)+(c.coinRemainder||0),earned=Math.floor(rawCoins+1e-9);c.coinRemainder=Math.max(0,rawCoins-earned);s.coins+=earned;c.earnedCoins+=earned;c.hp=Math.min(maxHp(c),c.hp+maxHp(c)*(Books.specialBonuses(c).killHeal||0)*n);gainXp(c,e.xp*n);if(worldOf(e.area)>=2)skillXp(c,'hunting',n*(c.advancement==='ranger'?3:2));for(const drop of [...e.loot,...WORLD_LOOT,...GLOBAL_LOOT,...[{id:'statue-'+({forest:'power',caves:'guard',jungle:'heart',deep:e.index%2?'pace':'miner'}[e.area]||'power'),chance:.02}]]){const count=successes(n,drop.chance,rng);if(count){if(collect)I.give(c,drop.id,count);loot.push({id:drop.id,count});if(['legendary','mythical'].includes(ITEMS[drop.id].rarity))note(s,`${c.name} discovered ${ITEMS[drop.id].name} ×${count}!`);}}if(e.id==='boss'&&!s.bossDefeated){s.bossDefeated=true;note(s,'The Rootwarden falls. Return its heart to Hesta to complete the World One story.');}return loot;}
function advanceCharacter(s,c,seconds,rng){
 if(c.dungeon){Dungeon.finishDungeon(s,c,'abandoned',false);return;}if(c.secret){c.activity='rest';c.encounter=null;return;}if(c.activity==='trial'){c.trial=null;c.activity='rest';c.position={x:2280,y:644,facing:1};note(s,'The solo trial ended while inactive. No idle trial rewards were granted.');return;}if(c.activity==='rest'){c.hp=Math.min(maxHp(c),c.hp+seconds*4);return;}
 if(c.activity==='gather'){if(gatherRequirement(c,c.resource)){c.assignmentWarning='gathering';c.activity='rest';return;}const interval=gatherInterval(c,c.resource),total=c.progress+seconds,n=Math.floor(total/interval);c.progress=total-n*interval;if(n){const odds=gatherOdds(c,c.resource),yielded=gatherYield(c,successes(n,odds.chance,rng),rng)*odds.multi;I.give(c,c.resource,yielded);recordGather(s,c,c.resource,yielded,rng);grantGatherStatues(c,c.resource,n,rng);skillXp(c,gatherSkill(c.resource),n*2);gainXp(c,n*.4);}c.hp=Math.min(maxHp(c),c.hp+seconds);return;}
 if(c.activity==='boss'){c.encounter=null;c.activity='rest';note(s,'Boss encounters require active play. Return to the gate when ready.');return;}
 let remaining=seconds;const speed=1+(s.merits.afk||0)*.05+(c.accountBonuses?.afk||0)+(Books.specialBonuses(c).combatAFK||0);
 while(remaining>1e-8){
  if(c.recovering){const t=Math.min((maxHp(c)-c.hp)/4,remaining);A.useFood(c,maxHp(c),t/speed);c.hp=Math.min(maxHp(c),c.hp+t*4);remaining-=t;if(c.hp>=maxHp(c)-.001)c.recovering=false;else break;}
  const e=enemyFor(c),f=fightStats(s,c);if(!e||!f)break;
  const strikeInterval=f.strikes?f.attackTime/(f.strikes+1):Infinity,nextStrike=(Math.floor((c.progress+1e-7)/strikeInterval)+1)*strikeInterval,boundary=Math.min(f.duration,nextStrike<=f.attackTime-1e-7?nextStrike:Infinity),t=Math.min(remaining,Math.max(0,boundary-c.progress));
  c.progress+=t;remaining-=t;A.useFood(c,maxHp(c),t/speed);
  if(c.progress<boundary-1e-7)break;
  if(boundary<f.duration-1e-7){c.hp-=f.incoming/Math.max(1,f.strikes);if(c.hp<=0){c.hp=1;c.progress=0;if(!A.foodSupply(c)&&f.incoming>=maxHp(c)){c.assignmentWarning='survival';c.activity='rest';note(s,`${c.name} retreated from ${e.name}: insufficient survival.`);break;}c.recovering=true;}else A.useFood(c,maxHp(c));}
  else{c.progress=0;grantKills(s,c,e,1,rng);}
 }

}
export function advance(s,seconds,rng=Math.random,{production=true}={}){if(!Number.isFinite(seconds)||seconds<=0)return;seconds=Math.min(seconds,OFFLINE_CAP);if(production)P.advanceProduction(s,seconds);for(const c of s.characters){let remaining=seconds;while(remaining>0){const until=Math.min(remaining,30,...c.buffs.filter(b=>b.remaining>0).map(b=>b.remaining));if(!['fight','boss'].includes(c.activity))A.regenerate(c,until,maxHp(c));else c.mp=Math.min(A.maxMana(c),c.mp+until*A.manaRegen(c));advanceCharacter(s,c,until*(1+(s.merits.afk||0)*.05+(c.accountBonuses?.afk||0)+(c.activity==='fight'?(Books.specialBonuses(c).combatAFK||0):0)),rng);P.advanceBuffs(c,until);remaining-=until;}c.hp=Math.min(maxHp(c),c.hp);}P.syncAccount(s);}
export function availableClass(s,id){return CLASSES[id]&&(!s.unlockedClasses.includes(id)||s.unlockedClasses.length===Object.keys(CLASSES).length);}
export function classQuest(s,c,id){const def=CLASSES[id],stage=c.quests[id]||0;if(!def)return null;let text,ready;if(stage===0){text='Reach character level 3';ready=c.level>=3;}else if(stage===1){text=`Reach ${SKILLS[def.skill]} level 2`;ready=skillLevel(c,def.skill)>=2;}else{text='Deliver your initiation materials';ready=hasCost(s,def.needs,c);}const atTrainer=c.area===def.town&&c.zone===def.zone&&!c.secret;return{stage,text,ready:ready&&atTrainer&&!c.class&&availableClass(s,id),requirementsMet:ready,atTrainer,needs:stage===2?def.needs:{}};}
export function progressClass(s,c,id){const q=classQuest(s,c,id);if(!q?.ready)return false;if(q.stage<2){c.quests[id]=q.stage+1;note(s,`${CLASSES[id].trainer}: ${c.name} completed initiation step ${q.stage+1}.`);return true;}spend(s,CLASSES[id].needs,c);c.class=id;c.quests[id]=3;if(!s.unlockedClasses.includes(id)){s.unlockedClasses.push(id);note(s,`A ${CLASSES[id].name} joins your roster. A character slot is unlocked.`);}else note(s,`${c.name} became a ${CLASSES[id].name}.`);return true;}
export function createCharacter(s,name){if(s.characters.length>=slots(s))return false;const c=makeCharacter(s.nextId++,String(name||`Adventurer ${s.nextId-1}`).trim().slice(0,24)||'Adventurer');s.characters.push(c);P.syncAccount(s);s.active=c.id;note(s,`${c.name} arrived in the Greenreach.`);return true;}
export function stationFor(c){if(c.area==='void-landing'&&[2,4].includes(c.zone))return c.zone===2?'anvil':'alchemy';if(c.area==='void-lantern'&&c.zone===4)return 'foundry';if(c.area==='orbit-loom')return c.zone===0?'anvil':c.zone===3?'foundry':null;if(c.area==='tide-gate'&&c.zone===0)return 'foundry';if(c.area==='tide-town')return c.zone===1?'anvil':c.zone===2?'alchemy':null;if(c.area==='town')return c.zone===2?'foundry':c.zone===1?'anvil':null;if(c.area==='jungle-town')return c.zone===0?'enchanting':c.zone===1?'alchemy':null;return null;}
export function craftCost(c,r){const factor=r.repeat?1+Math.floor((c.gear[r.upgrade]||0)/3):1;return Object.fromEntries(Object.entries(r.cost).map(([k,n])=>[k,n*factor]));}
export function craftFee(c,r){return r.equipment?5:r.upgrade?5*(r.tier||1+Math.floor(c.gear[r.upgrade]/3)):2;}
export function canCraft(s,c,r){return !c.dungeon&&!(r.completionWorld&&(s.worldTokensCrafted.includes(r.completionWorld)||r.completionWorld===1&&s.worldCompletionCrafted))&&!(EXPANSIONS[r.output]?.target==='chest'&&s.usedChestExpansions.includes(r.output))&&P.recipeOpen(s,r)&&S.serviceAccess(s,c,r.station,'upgrade')&&s.coins>=craftFee(c,r)&&hasCost(s,craftCost(c,r),c)&&(!r.equipment||!c.loadout[EQUIPMENT[r.equipment].slot]||I.bagUsed(c)<I.bagCapacity(c))&&(r.equipment||!r.upgrade||r.repeat||(c.gear[r.upgrade]||0)<r.tier);}
export function craft(s,c,id){const r=RECIPES.find(x=>x.id===id);if(!r||!canCraft(s,c,r))return false;if(r.station==='foundry')return P.enqueue(s,c,id,1);recordQuestAction(c,'craft:'+r.id);if(r.equipment)recordQuestAction(c,'craft:equipment');if(POTIONS[r.output])recordQuestAction(c,'craft:brew');s.metrics.crafted++;if(r.completionWorld){s.worldTokensCrafted.push(r.completionWorld);if(r.completionWorld===1)s.worldCompletionCrafted=true;}spend(s,craftCost(c,r),c);s.coins-=craftFee(c,r);const specialist=c.class&&CLASSES[c.class].skill===r.skill;if(r.equipment){if(r.upgrade)c.gear[r.upgrade]=r.tier;const def=EQUIPMENT[r.equipment];P.createEquipment(s,r.equipment,!c.loadout[def.slot]&&(!def.class||c.class===def.class)?c:null,c);}else if(r.output){I.give(c,r.output,r.count*(specialist&&!r.completionWorld&&!r.unique&&!r.id.startsWith('anvil-expansion-')&&EXPANSIONS[r.output]?.target!=='chest'?2:1));if(r.skill==='alchemy')s.alchemy.liquid=Math.min(P.liquidCap(s),s.alchemy.liquid+2);}else c.gear[r.upgrade]=r.repeat?(c.gear[r.upgrade]||0)+1:r.tier;skillXp(c,r.skill,6);gainXp(c,3);note(s,`${c.name}: ${r.name}${specialist&&r.output?' (double yield)':''}.`);return true;}
export function offer(s,id){if(!OFFERINGS.includes(id))return false;const level=s.archive[id]||0,cost=ITEMS[id].rarity==='common'?10*(level+1):level+1;if(level>=20||!spend(s,{[id]:cost}))return false;s.archive[id]=level+1;P.syncAccount(s);note(s,`Studied ${ITEMS[id].name}: ${P.studyType(id)} improved.`);return true;}
export function heal(s,c){if(c.dungeon)return false;if(c.hp>=maxHp(c)||(c.bag.tonic||0)<1)return false;c.bag.tonic--;c.hp=Math.min(maxHp(c),c.hp+40);return true;}
export function restoreSave(raw,now=Date.now()){
 if(!raw||raw.version!==SAVE_VERSION||!Array.isArray(raw.characters)||!raw.characters.length||raw.characters.length>MAX_CHARACTERS)throw Error('This is not a supported Wildroot save.');const s=freshSave(now);Object.assign(s,raw);if(!Object.hasOwn(raw,'worldTokensCrafted'))delete s.worldTokensCrafted;if(!Object.hasOwn(raw,'bossHunt'))delete s.bossHunt;if(!Object.hasOwn(raw,'workshop'))delete s.workshop;if(!Object.hasOwn(raw,'journeyVersion'))delete s.journeyVersion;const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
 if(!finite(s.coins)||!finite(s.savedAt)||!s.inventory||!s.archive||!s.kills||!Array.isArray(s.unlockedClasses)||new Set(s.unlockedClasses).size!==s.unlockedClasses.length||s.unlockedClasses.some(id=>!CLASSES[id]))throw Error('Invalid account data.');for(const bag of [s.inventory,s.archive,s.kills])for(const n of Object.values(bag))if(!finite(n))throw Error('Invalid resource data.');
 s.characters=s.characters.map(c=>{if(!Number.isInteger(c.id)||!c.id||typeof c.name!=='string'||c.name.length>24||!finite(c.level)||c.level<1||!finite(c.xp)||!finite(c.hp)||!finite(c.progress)||!finite(c.kills)||!(c.class===null||CLASSES[c.class])||!areaById(c.area)||!Number.isInteger(c.zone)||c.zone<0||c.zone>=areaById(c.area).zones.length||!['rest','fight','gather','boss','trial','dungeon'].includes(c.activity))throw Error('Invalid character data.');const copy={...makeCharacter(c.id,c.name),...c};if(!Object.hasOwn(c,"tierTalents"))P.migrateTalentCadence(copy);if(!copy.skills||!copy.gear)throw Error('Invalid character stats.');P.initializeCharacter(copy,s,true);if(Object.values(copy.talents).some(n=>!Number.isInteger(n)||n<0)||Object.values(copy.talents).reduce((a,b)=>a+b,0)>P.beginnerBudget(copy))throw Error('Invalid talent points.');for(const k of Object.keys(SKILLS))if(!finite(copy.skills[k]))throw Error('Invalid skills.');for(const k of Object.keys(makeCharacter(0,'').gear))if(!finite(copy.gear[k]))throw Error('Invalid equipment.');if(!copy.quests||Object.values(copy.quests).some(n=>!Number.isInteger(n)||n<0||n>3))throw Error('Invalid quest data.');if(copy.activity==='gather'&&!areaById(copy.area).resources[copy.zone].includes(copy.resource))throw Error('Invalid gathering task.');if(copy.secret&&(!SECRETS[copy.secret]||SECRETS[copy.secret].area!==copy.area||SECRETS[copy.secret].zone!==copy.zone))throw Error('Invalid secret room.');if(copy.activity==='fight'&&!zoneEnemy(copy.area,copy.zone)&&!copy.secret||copy.activity==='boss'&&(copy.area!=='jungle-town'||copy.zone!==2))throw Error('Invalid combat task.');return copy;});
 if(new Set(s.characters.map(c=>c.id)).size!==s.characters.length)throw Error('Duplicate characters.');s.nextId=Math.max(...s.characters.map(c=>c.id))+1;s.active=selected(s).id;s.log=Array.isArray(s.log)?s.log.filter(t=>typeof t==='string').slice(0,30):[];P.initialize(s,true);P.validate(s);for(const c of s.characters)if(c.dungeon)Dungeon.finishDungeon(s,c,'reload',false);for(const c of s.characters)if(c.trial){c.trial=null;c.activity='rest';c.position={x:2280,y:644,facing:1};}for(const c of s.characters)c.hp=Math.min(c.hp,maxHp(c));return s;
}
export function claimOffline(s,now=Date.now(),rng=Math.random){
 const elapsed=Math.max(0,(now-s.savedAt)/1000),seconds=Math.min(elapsed,OFFLINE_CAP),before=s.characters.map(c=>Offline.offlineSnapshot(s,c,rates)),total=totalMaterials(s),coins=s.coins;
 advance(s,seconds,rng);s.savedAt=Math.max(s.savedAt,now);
 const characters=s.characters.map((c,i)=>Offline.offlineRow(s,c,before[i],seconds,rates));
 const report={seconds,capped:elapsed>OFFLINE_CAP,coins:s.coins-coins,kills:characters.reduce((n,c)=>n+c.kills,0),items:totalMaterials(s)-total,characters};
 if(seconds>60){if(s.afkReport){const old=s.afkReport;old.seconds+=seconds;old.capped||=report.capped;for(const k of ['coins','kills','items'])old[k]+=report[k];
  for(const row of characters){const r=old.characters.find(c=>c.id===row.id);if(!r){old.characters.push(row);continue;}for(const k of ['coins','kills','xp','food'])r[k]+=row[k];for(const k of ['items','skills'])for(const[id,n]of Object.entries(row[k]))r[k][id]=(r[k][id]||0)+n;r.details=Offline.mergeOfflineDetails(r.details,row.details);}
 }else s.afkReport=structuredClone(report);}return report;
}
export function acknowledgeOffline(s){s.afkReport=null;}
export const talentPoints=P.combatPoints;
export function trainTalent(c,id,count=1){const ok=P.train(c,id,'combat',count);if(ok&&id==='vitality')c.hp=Math.min(maxHp(c),c.hp+10);return ok;}
export function advanceBackground(s,seconds,activeId=s.active,rng=Math.random){const workers=s.characters.filter(c=>c.id!==activeId);if(!workers.length)return;const proxy={...s,characters:workers,familyRoster:s.characters};advance(proxy,seconds,rng,{production:false});s.coins=proxy.coins;s.bossDefeated=proxy.bossDefeated;s.log=proxy.log;A.syncCards(s);}
export function rates(s,c){const bonus=1+(s.merits.afk||0)*.05+(c.accountBonuses?.afk||0)+(c.activity==='fight'?(Books.specialBonuses(c).combatAFK||0):0);if(c.secret||c.dungeon||c.activity==='boss'||c.activity==='trial')return{items:0,xp:0,coins:0,label:'Active boss encounter · no idle rewards'};if(c.activity==='gather'){const reason=gatherRequirement(c,c.resource),o=gatherOdds(c,c.resource),attempts=reason?0:3600/gatherInterval(c,c.resource)*bonus;return{items:attempts*o.chance*o.multi*(1+(c.profTalents.prosperity||0)*.02),xp:attempts*2*(1+(c.profTalents.mastery||0)*.05+(c.accountBonuses?.skillXP||0)+worldSkillBonus(c,gatherSkill(c.resource),EQUIPMENT)+(c.cardBonus?.skillXP||0)+(!['warrior','mage'].includes(c.class)?(c.classTalents?.specialist||0)*.03:0)),characterXp:attempts*.4,coins:0,label:reason||ITEMS[c.resource].name};}const f=fightStats(s,c),e=enemyFor(c);if(c.activity==='rest'||!f||!e)return{items:0,xp:0,coins:0,label:'Resting'};const foodPerSecond=c.foodSlots.reduce((n,t)=>n+(t?.count?Math.min(t.count*FOODS[t.id].heal/3600,FOODS[t.id].heal/FOODS[t.id].cooldown):0),0),recovery=f.incoming>=maxHp(c)&&!A.foodSupply(c)?Infinity:Math.max(0,f.incoming-foodPerSecond*f.duration)/4,perHour=3600/(f.duration+recovery)*bonus;return{breakdown:{...f,limiter:recovery===Infinity?'Survival':hitChance(c,e)<.8?'Accuracy':recovery>f.duration?'Healing and food':f.respawnLimit>=f.attackTime+f.movementTime?'Monster respawns':f.movementTime>f.attackTime?'Movement':'Damage'},items:perHour*.8,kills:perHour,xp:perHour*e.xp,coins:perHour*e.coins*(1+(P.bonusesFor(s,c).coins||0)+(c.classTalents?.fortune||0)*.02),label:recovery===Infinity?'Improve equipment before fighting':e.name};}
export function assignmentForecast(s,c,seconds=3600){return forecastAssignment(s,c,advance,seconds);}
export function bossPreparation(s,c,tier=c.bossTier||0){const enemy=Hunts.encounterEnemy({...c,encounter:{id:'boss',tier}},ENEMIES.boss),required=enemyAccuracy(enemy),incoming=Math.max(1,Math.round(enemy.attack*1.3-defense(s,c)));return{tier,enemy,accuracy:accuracy(c),requiredAccuracy:required,chance:hitChance(c,enemy),damage:damageRange(s,c),health:maxHp(c),incoming,foodHealing:A.foodSupply(c),foodEquipped:c.foodSlots.some(t=>t?.count),singleHitSafe:maxHp(c)>incoming};}
export function afkInfo(s,c){
 const r=rates(s,c),idle=['fight','gather'].includes(c.activity)&&!c.secret&&!c.dungeon,projection=idle?assignmentForecast(s,c):null;
 const e=c.activity==='fight'?enemyFor(c):null,f=e?fightStats(s,c):null,gather=c.activity==='gather'?gatherOdds(c,c.resource):null;
 if(projection){r.kills=projection.kills;r.coins=projection.coins;if(gather){r.items=projection.resourceItems;r.xp=projection.skills[gatherSkill(c.resource)];r.characterXp=projection.xp;}else r.xp=projection.xp;}
 const loot=gather?[{id:c.resource,rate:r.items}]:e?e.loot.filter(d=>d.chance>=.5).map(d=>({id:d.id,rate:(r.kills||0)*d.chance})):[];
 if(e)r.items=(r.kills||0)*[...e.loot,...WORLD_LOOT,...GLOBAL_LOOT,{chance:.02}].reduce((n,d)=>n+d.chance,0);
 const incoming=f?f.incoming/f.duration:0,foodHealing=A.foodSupply(c);
 return{...r,projection,accuracy:accuracy(c),hitChance:e?hitChance(c,e):1,damage:damageRange(s,c),mana:A.maxMana(c),regen:A.manaRegen(c),foodHealing,
 foodHours:projection&&Number.isFinite(projection.foodSeconds)?projection.foodSeconds/3600:incoming?foodHealing/incoming/3600:Infinity,
 bagSeconds:commonLootSeconds(c,loot,structuredClone,I.carry),survival:projection?.retreatSeconds?'Unsafe · retreats within one hour':!f?'Safe':foodHealing?'Food assisted':'Recovery breaks',gather};
}


export function totalMaterials(s){return Object.values(s.inventory).reduce((a,b)=>a+b,0)+s.characters.reduce((n,c)=>n+Object.values(c.bag).reduce((a,b)=>a+b,0)+Object.values(c.overflow).reduce((a,b)=>a+b,0),0);}

export function townAction(s,c,action,id,n){const fn={register:L.registerStamp,stamp:L.upgradeStamp,cap:L.raiseStampCap,statue:L.depositStatues,unlock:(_s,c)=>L.unlockStatues(c)}[action];if(!fn)return false;const ok=fn(s,c,id,n);if(ok)P.syncAccount(s);return ok;}
export function teleportAllowed(s,c,area,zone,now=Date.now()){if(c.dungeon)return false;L.refreshTeleports(s,now);return zoneUnlocked(s,area,zone)&&L.discovered(s,area,zone)&&(c.area===area&&c.zone===zone&&!c.secret&&c.activity!=='boss'&&c.activity!=='trial'||s.teleports.count>0);}

export function grantGatherStatues(c,resource,n,rng=Math.random){if(!['mining','logging'].includes(gatherSkill(resource)))return 0;const count=successes(n,.01,rng);if(count)I.give(c,'statue-'+(gatherSkill(resource)==='mining'?'miner':'forester'),count);return count;}
