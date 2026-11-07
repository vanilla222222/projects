import {VOID_AREAS,RETRO_AREAS,VOID_CLASSES,VOID_PROJECTS,VOID_WORK} from './void-content.mjs';
import {EQUIPMENT} from './content.mjs?v=45';
import {canPay,pay,give} from './inventory.mjs?v=45';
import {roomLayout,pointFor} from './layouts.mjs?v=49';
import {worldSkillBonus} from './world-rewards.mjs';

const allAreas=[...VOID_AREAS,...RETRO_AREAS];
const near=(c,area,zone,id)=>{
 if(c.area!==area||c.zone!==zone||c.secret||c.dungeon||c.trial)return false;
 const point=pointFor(roomLayout(area,zone),id);
 return Math.abs((c.position?.x??0)-point.x)<110&&Math.abs((c.position?.y??0)-point.y)<70;
};
export const voidUnlocked=s=>!!(s.kills.singularity||s.bossHunt?.kills.singularity);
const specialist=(c,skill)=>!!c.voidClass&&VOID_CLASSES[c.class]?.skill===skill;
const gain=(c,skill,n)=>c.skills[skill]+=n*(1+worldSkillBonus(c,skill,EQUIPMENT));
export function voidLock(s,area){
 if(VOID_PROJECTS[area]&&!s.voidProjects.includes(area)){
  const [source,zone]=allAreas.find(a=>a.id===area).entry;
  return 'Survey '+roomLayout(source,zone).title+' and build '+VOID_PROJECTS[area].name+' there.';
 }
 if(area==='void-wound'&&!s.voidLights.includes(area))return 'Kindle a Void Lantern and light the hidden footholds.';
 return '';
}
export function bridgeStatus(s,c,id){
 const d=VOID_PROJECTS[id],a=allAreas.find(a=>a.id===id);
 if(!d||!a)return null;
 const [area,zone]=a.entry,surveyed=s.surveys.includes(area+'-'+zone),built=s.voidProjects.includes(id);
 const present=near(c,area,zone,'bridge-'+id);
 return {...d,destination:a.name,surveyed,built,ready:voidUnlocked(s)&&surveyed&&!built&&present&&canPay(s,d.cost,c)};
}
export function buildVoidBridge(s,c,id){
 const d=bridgeStatus(s,c,id);
 if(!d?.ready||!pay(s,d.cost,c))return false;
 s.voidProjects.push(id);
 gain(c,'construction',d.xp*(specialist(c,'construction')?1.5:1));
 return true;
}
export function workVoid(s,c,skill,now=Date.now()){
 const d=VOID_WORK[skill];
 if(!voidUnlocked(s)||!d||!near(c,d.area,d.zone,'void-work')||!pay(s,d.cost,c))return false;
 give(c,d.output,specialist(c,skill)?3:2);
 gain(c,skill,48);
 if(skill==='riftkeeping')s.voidRiftUntil=Math.max(s.voidRiftUntil,now+300000);
 return true;
}
export function lightVoidRoute(s,c){
 if(!voidUnlocked(s)||s.voidLights.includes('void-wound')||!near(c,'void-rim',1,'void-light')||!pay(s,{'void-lantern':1},c))return false;
 s.voidLights.push('void-wound');
 gain(c,'lightkeeping',72);
 return true;
}
export function bindVoidEcho(s,c){
 const weapon=c.loadout.weapon;
 if(!voidUnlocked(s)||!weapon||weapon.voidEcho||!near(c,'void-lantern',2,'void-work')||!pay(s,{'bound-echo':1},c))return false;
 weapon.voidEcho=true;
 gain(c,'echobinding',60);
 return true;
}
export function voidRiftDestination(s,c,now=Date.now()){
 if(now>=s.voidRiftUntil)return null;
 if(near(c,'void-landing',3,'void-work')&&c.journey.visited['void-lantern-0'])return 'void-lantern';
 if(near(c,'void-lantern',0,'void-rift'))return 'void-landing';
 return null;
}
export function voidClassStatus(s,c){
 const d=VOID_CLASSES[c.class];
 if(!d)return {reason:'Choose a base calling first.'};
 const reason=c.voidClass?'You already chose a Tier 3 specialization.':!c.advancement?'Earn either Tier 2 branch first.':c.level<55?'Reach character level 55.':!near(c,'void-crown',1,'void-training')?'Visit the trainer at The Last Chart.':!voidUnlocked(s)?'Defeat the Eventide Colossus first.':'';
 return {...d,reason,ready:!reason};
}
export function chooseVoidClass(s,c){
 const d=voidClassStatus(s,c);
 if(!d.ready)return false;
 c.voidClass=d.id;
 return true;
}
export function voidBossReason(s,c,id){
 if(id!=='unmoored')return '';
 if(!voidUnlocked(s))return 'Defeat the Eventide Colossus first.';
 if(!c.journey.visited['void-end-5']||!s.surveys.includes('void-end-5'))return 'Reach and survey Still Point to chart the stable platforms.';
 return '';
}
export function validateVoid(s){
 for(const [values,allowed] of [[s.voidProjects,Object.keys(VOID_PROJECTS)],[s.voidLights,['void-wound']]])if(!Array.isArray(values)||new Set(values).size!==values.length||values.some(id=>!allowed.includes(id)))throw Error('Invalid Void route projects.');
 if(!Number.isSafeInteger(s.voidRiftUntil)||s.voidRiftUntil<0)throw Error('Invalid Void rift.');
 for(const c of s.characters)if(c.voidClass!==null&&(!c.advancement||VOID_CLASSES[c.class]?.id!==c.voidClass))throw Error('Invalid Tier 3 class.');
}
