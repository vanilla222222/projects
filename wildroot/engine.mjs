import {CLASSES,SKILLS,AREAS,ITEMS,ENEMIES,RECIPES,OFFERINGS,WORLD_LOOT,GLOBAL_LOOT,areaById,zoneEnemy} from './content.mjs?v=3';
export const SAVE_VERSION=1, OFFLINE_CAP=8*3600, MAX_CHARACTERS=6;
export function makeCharacter(id,name){return{id,name,class:null,level:1,xp:0,hp:40,skills:Object.fromEntries(Object.keys(SKILLS).map(k=>[k,0])),quests:{},talents:{power:0,vitality:0,industry:0},gear:{weapon:0,armor:0,pick:0,axe:0,rune:0,vitality:0},area:'forest',zone:0,activity:'rest',resource:null,progress:0,kills:0};}
export function freshSave(now=Date.now()){return{version:SAVE_VERSION,savedAt:now,active:1,nextId:2,characters:[makeCharacter(1,'Adventurer')],inventory:{},coins:0,unlockedClasses:[],kills:{},archive:{},bossDefeated:false,log:['Welcome to the Greenreach. Choose a task, then visit the class mentors.']};}
export function selected(s){return s.characters.find(c=>c.id===s.active)||s.characters[0];}
export function slots(s){return Math.min(MAX_CHARACTERS,1+s.unlockedClasses.length);}
export function note(s,t){s.log.unshift(t);s.log=s.log.slice(0,30);}
export function addItem(s,id,n=1){s.inventory[id]=(s.inventory[id]||0)+n;}
export function hasCost(s,cost){return Object.entries(cost).every(([id,n])=>(s.inventory[id]||0)>=n);}
export function spend(s,cost){if(!hasCost(s,cost))return false;for(const[id,n]of Object.entries(cost))s.inventory[id]-=n;return true;}
export function skillLevel(c,skill){return 1+Math.floor(Math.sqrt(c.skills[skill]/12));}
export function power(s,c){const archive=Object.values(s.archive).reduce((a,b)=>a+b,0);return Math.floor((4+c.level*1.8+c.gear.weapon*7+c.gear.rune*2+(c.talents?.power||0)*2)*(1+archive*.015)*(c.class==='warrior'?1.18:1));}
export function maxHp(c){return 40+(c.level-1)*6+c.gear.armor*20+c.gear.vitality*6+(c.talents?.vitality||0)*10;}
export function gainXp(c,n){c.xp+=n;while(c.xp>=c.level*20){c.xp-=c.level*20;c.level++;c.hp=Math.min(maxHp(c),c.hp+10);}}
export function areaUnlocked(s,id){if(['town','forest','caves'].includes(id))return true;if(id==='jungle')return(s.kills['forest-4']||0)>=12;if(id==='deep')return(s.kills['caves-2']||0)>=12;if(id==='jungle-town')return(s.kills['jungle-3']||0)>=12;return false;}
export function zoneUnlocked(s,area,index){return areaUnlocked(s,area)&&(index===0||['town','jungle-town'].includes(area)||(s.kills[`${area}-${index-1}`]||0)>=12);}
export function lockReason(s,area,index=0){if(!areaUnlocked(s,area))return area==='jungle'?'Defeat 12 Grove Guardians':area==='deep'?'Defeat 12 Echo Golems':'Defeat 12 Orchid Mantises';if(!zoneUnlocked(s,area,index))return`Defeat 12 ${zoneEnemy(area,index-1)?.name||'enemies'}`;return '';}
export function travel(s,c,area,index){const a=areaById(area);if(!a||!Number.isInteger(index)||index<0||index>=a.zones.length||!zoneUnlocked(s,area,index))return false;c.area=area;c.zone=index;c.activity='rest';c.resource=null;c.progress=0;c.recovering=false;return true;}
export function start(s,c,activity,resource=null){
 const a=areaById(c.area);
 if(activity==='fight'&&!zoneEnemy(c.area,c.zone))return false;
 if(activity==='boss'&&(c.area!=='jungle-town'||c.zone!==2))return false;
 if(activity==='gather'&&!a.resources[c.zone].includes(resource))return false;
 if(!['fight','boss','gather','rest'].includes(activity))return false;
 c.activity=activity;c.resource=resource;c.progress=0;return true;
}
export function gatherSkill(resource){return['copper','iron','gold'].includes(resource)?'mining':'logging';}
export function gatherInterval(c,resource){const skill=gatherSkill(resource),specialist=c.class&&CLASSES[c.class].skill===skill;return Math.max(.8,(3+(['iron','birch'].includes(resource)?1:['gold','jungle-wood'].includes(resource)?2:0))/(1+(skillLevel(c,skill)-1)*.06+(specialist?.65:0)+c.gear[skill==='mining'?'pick':'axe']*.25+(c.talents?.industry||0)*.05));}
export function enemyFor(c){return c.activity==='boss'?ENEMIES.boss:zoneEnemy(c.area,c.zone);}
export function fightStats(s,c){const e=enemyFor(c);if(!e)return null;const hits=Math.ceil(e.hp/power(s,c)),duration=hits*1.1,incoming=Math.max(0,e.attack-c.gear.armor*2)*Math.max(0,hits-1);return{duration,incoming,hits};}
// Exact Bernoulli successes via geometric gaps; rare loot stays practical over long AFK claims.
export function successes(n,p,rng=Math.random){if(p>=1)return n;if(p<=0||n<=0)return 0;let hits=0,pos=0;while(pos<n){const u=Math.min(1-Number.EPSILON,Math.max(Number.MIN_VALUE,rng()));pos+=Math.floor(Math.log(1-u)/Math.log(1-p))+1;if(pos<=n)hits++;}return hits;}
export function grantKills(s,c,e,n,rng){if(n<=0)return;c.kills+=n;s.kills[e.id]=(s.kills[e.id]||0)+n;s.coins+=e.coins*n;gainXp(c,e.xp*n);for(const drop of [...e.loot,...WORLD_LOOT,...GLOBAL_LOOT]){const count=successes(n,drop.chance,rng);if(count){addItem(s,drop.id,count);if(['legendary','mythical'].includes(ITEMS[drop.id].rarity))note(s,`${c.name} discovered ${ITEMS[drop.id].name} ×${count}!`);}}if(e.id==='boss'&&!s.bossDefeated){s.bossDefeated=true;note(s,'The Rootwarden falls. World 1 is complete; your roster can keep growing.');}}
export function advance(s,seconds,rng=Math.random){
 if(!Number.isFinite(seconds)||seconds<=0)return;
 seconds=Math.min(seconds,OFFLINE_CAP);
 for(const c of s.characters){
  if(c.activity==='rest'){c.hp=Math.min(maxHp(c),c.hp+seconds*4);continue;}
  if(c.activity==='gather'){
   const interval=gatherInterval(c,c.resource),total=c.progress+seconds,n=Math.floor(total/interval);c.progress=total-n*interval;
   if(n){addItem(s,c.resource,n);c.skills[gatherSkill(c.resource)]+=n*2;gainXp(c,n*.4);}c.hp=Math.min(maxHp(c),c.hp+seconds);continue;
  }
  // Resolve combat cycles and recovery. Per-kill work is bounded by the 8 hour cap.
  let remaining=seconds+c.progress;c.progress=0;
  while(remaining>0){
   if(c.recovering){const need=(maxHp(c)-c.hp)/4,t=Math.min(need,remaining);c.hp+=t*4;remaining-=t;if(c.hp>=maxHp(c)-.001)c.recovering=false;else break;}
   const e=enemyFor(c),f=fightStats(s,c);if(!e||!f)break;
   if(f.incoming>=c.hp){
    if(f.incoming>=maxHp(c)){// This encounter cannot be won yet. Recover and stop rather than farm rewards.
     c.hp=maxHp(c);c.activity='rest';note(s,`${c.name} retreated from ${e.name}. Improve equipment before returning.`);break;
    }
    c.recovering=true;continue;
   }
   if(remaining<f.duration){c.progress=remaining;break;}
   remaining-=f.duration;c.hp-=f.incoming;grantKills(s,c,e,1,rng);
   if(c.activity==='boss'){c.activity='rest';c.progress=0;break;}
  }
 }
}
export function availableClass(s,id){return CLASSES[id]&&(!s.unlockedClasses.includes(id)||s.unlockedClasses.length===Object.keys(CLASSES).length);}
export function classQuest(s,c,id){
 const def=CLASSES[id],stage=c.quests[id]||0;if(!def)return null;
 let text,ready;
 if(stage===0){text='Reach character level 3';ready=c.level>=3;}
 else if(stage===1){text=`Reach ${SKILLS[def.skill]} level 2`;ready=skillLevel(c,def.skill)>=2;}
 else{text='Deliver your initiation materials';ready=hasCost(s,def.needs);}
 const atTrainer=c.area===def.town;
 return{stage,text,ready:ready&&atTrainer&&!c.class&&availableClass(s,id),requirementsMet:ready,atTrainer,needs:stage===2?def.needs:{}};
}
export function progressClass(s,c,id){const q=classQuest(s,c,id);if(!q?.ready)return false;if(q.stage<2){c.quests[id]=q.stage+1;note(s,`${CLASSES[id].trainer}: ${c.name} completed initiation step ${q.stage+1}.`);return true;}spend(s,CLASSES[id].needs);c.class=id;c.quests[id]=3;if(!s.unlockedClasses.includes(id)){s.unlockedClasses.push(id);note(s,`A ${CLASSES[id].name} joins your roster. A character slot is unlocked.`);}else note(s,`${c.name} became a ${CLASSES[id].name}.`);return true;}
export function createCharacter(s,name){if(s.characters.length>=slots(s))return false;const c=makeCharacter(s.nextId++,String(name||`Adventurer ${s.nextId-1}`).trim().slice(0,24)||'Adventurer');s.characters.push(c);s.active=c.id;note(s,`${c.name} arrived in the Greenreach.`);return true;}
export function stationFor(c){if(c.area==='town')return c.zone===2?'foundry':c.zone===1?'anvil':null;if(c.area==='jungle-town')return c.zone===0?'enchanting':c.zone===1?'alchemy':null;return null;}
export function craftCost(c,r){const factor=r.repeat?1+Math.floor((c.gear[r.upgrade]||0)/3):1;return Object.fromEntries(Object.entries(r.cost).map(([k,n])=>[k,n*factor]));}
export function craftFee(c,r){return r.upgrade?5*(r.tier||1+Math.floor(c.gear[r.upgrade]/3)):2;}
export function canCraft(s,c,r){return stationFor(c)===r.station&&s.coins>=craftFee(c,r)&&hasCost(s,craftCost(c,r))&&(!r.upgrade||r.repeat||(c.gear[r.upgrade]||0)<r.tier);}
export function craft(s,c,id){const r=RECIPES.find(x=>x.id===id);if(!r||!canCraft(s,c,r))return false;spend(s,craftCost(c,r));s.coins-=craftFee(c,r);const specialist=c.class&&CLASSES[c.class].skill===r.skill;if(r.output)addItem(s,r.output,r.count*(specialist?2:1));else c.gear[r.upgrade]=r.repeat?(c.gear[r.upgrade]||0)+1:r.tier;c.skills[r.skill]+=6;gainXp(c,3);note(s,`${c.name}: ${r.name}${specialist&&r.output?' (specialist: double yield)':''}.`);return true;}
export function offer(s,id){if(!OFFERINGS.includes(id))return false;const level=s.archive[id]||0,cost=ITEMS[id].rarity==='common'?10*(level+1):level+1;if(!spend(s,{[id]:cost}))return false;s.archive[id]=level+1;note(s,`Archived ${ITEMS[id].name}: account damage +1.5%.`);return true;}
export function heal(s,c){if(c.hp>=maxHp(c)||!spend(s,{tonic:1}))return false;c.hp=Math.min(maxHp(c),c.hp+40);return true;}
export function restoreSave(raw,now=Date.now()){
 if(!raw||raw.version!==SAVE_VERSION||!Array.isArray(raw.characters)||!raw.characters.length||raw.characters.length>MAX_CHARACTERS)throw Error('This is not a supported Wildroot save.');
 const s=freshSave(now);Object.assign(s,raw);
 const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
 if(!finite(s.coins)||!finite(s.savedAt)||!s.inventory||!s.archive||!s.kills||!Array.isArray(s.unlockedClasses)||new Set(s.unlockedClasses).size!==s.unlockedClasses.length||s.unlockedClasses.some(id=>!CLASSES[id]))throw Error('Invalid account data.');
 for(const bag of [s.inventory,s.archive,s.kills])for(const n of Object.values(bag))if(!finite(n))throw Error('Invalid resource data.');
 s.characters=s.characters.map(c=>{
  if(!Number.isInteger(c.id)||!c.id||typeof c.name!=='string'||c.name.length>24||!finite(c.level)||c.level<1||!finite(c.xp)||!finite(c.hp)||!finite(c.progress)||!finite(c.kills)||!(c.class===null||CLASSES[c.class])||!areaById(c.area)||!Number.isInteger(c.zone)||c.zone<0||c.zone>=areaById(c.area).zones.length||!['rest','fight','gather','boss'].includes(c.activity))throw Error('Invalid character data.');
  const copy={...makeCharacter(c.id,c.name),...c};
  copy.talents={power:0,vitality:0,industry:0,...c.talents};
  if(Object.values(copy.talents).some(n=>!Number.isInteger(n)||n<0)||Object.values(copy.talents).reduce((a,b)=>a+b,0)>copy.level-1)throw Error('Invalid talent points.');
  for(const k of Object.keys(SKILLS))if(!finite(copy.skills?.[k]))throw Error('Invalid skills.');
  for(const k of Object.keys(makeCharacter(0,'').gear))if(!finite(copy.gear?.[k]))throw Error('Invalid equipment.');
  if(!copy.quests||Object.values(copy.quests).some(n=>!Number.isInteger(n)||n<0||n>3))throw Error('Invalid quest data.');
  if(copy.activity==='gather'&&!areaById(copy.area).resources[copy.zone].includes(copy.resource))throw Error('Invalid gathering task.');
  if(copy.activity==='fight'&&!zoneEnemy(copy.area,copy.zone)||copy.activity==='boss'&&(copy.area!=='jungle-town'||copy.zone!==2))throw Error('Invalid combat task.');
  copy.hp=Math.min(copy.hp,maxHp(copy));return copy;
 });
 if(new Set(s.characters.map(c=>c.id)).size!==s.characters.length)throw Error('Duplicate characters.');
 s.nextId=Math.max(...s.characters.map(c=>c.id))+1;s.active=selected(s).id;s.log=Array.isArray(s.log)?s.log.filter(t=>typeof t==='string').slice(0,30):[];
 return s;
}
export function claimOffline(s,now=Date.now(),rng=Math.random){const elapsed=Math.max(0,(now-s.savedAt)/1000),seconds=Math.min(elapsed,OFFLINE_CAP),before={coins:s.coins,kills:s.characters.reduce((n,c)=>n+c.kills,0),items:Object.values(s.inventory).reduce((a,b)=>a+b,0)};advance(s,seconds,rng);s.savedAt=now;return{seconds,capped:elapsed>OFFLINE_CAP,coins:s.coins-before.coins,kills:s.characters.reduce((n,c)=>n+c.kills,0)-before.kills,items:Object.values(s.inventory).reduce((a,b)=>a+b,0)-before.items};}

export function talentPoints(c){return Math.max(0,c.level-1-Object.values(c.talents||{}).reduce((a,b)=>a+b,0));}
export function trainTalent(c,id){if(!['power','vitality','industry'].includes(id)||talentPoints(c)<1)return false;c.talents??={power:0,vitality:0,industry:0};c.talents[id]++;if(id==='vitality')c.hp=Math.min(maxHp(c),c.hp+10);return true;}
// The actively controlled character is simulated by World; only other roster members use idle rates.
export function advanceBackground(s,seconds,activeId=s.active,rng=Math.random){
 const workers=s.characters.filter(c=>c.id!==activeId);if(!workers.length)return;
 const proxy={...s,characters:workers};advance(proxy,seconds,rng);
 s.coins=proxy.coins;s.bossDefeated=proxy.bossDefeated;s.log=proxy.log;
}
