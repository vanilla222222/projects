import {ORBIT_JOBS,ORBIT_ADVANCEMENTS,ORBIT_SECRETS} from './world-three-content.mjs';
import {recordQuestAction} from './quest-content.mjs?v=45';
import {canPay,pay,give} from './inventory.mjs?v=45';
import {roomLayout,pointFor} from './layouts.mjs?v=49';

export function orbitJobStatus(s,c,skill,now=Date.now()){
 const d=ORBIT_JOBS[skill];
 if(!d)return null;
 const job=c.orbitJobs[skill],point=pointFor(roomLayout(d.area,d.zone),'orbit-job');
 const present=c.area===d.area&&c.zone===d.zone&&!c.secret&&!c.trial&&!c.dungeon&&Math.abs((c.position?.x||0)-point.x)<110&&Math.abs((c.position?.y||0)-point.y)<65;
 return {...d,remaining:job?Math.max(0,Math.ceil((job.ready-now)/1000)):null,canStart:present&&!job&&canPay(s,d.cost,c),canClaim:present&&!!job&&job.ready<=now};
}
export function workOrbitJob(s,c,skill,now=Date.now()){
 const d=orbitJobStatus(s,c,skill,now);
 if(d?.canClaim){
  const {yieldCount}=c.orbitJobs[skill];
  delete c.orbitJobs[skill];
  give(c,d.output,yieldCount);
  c.skills[skill]+=48;
  recordQuestAction(c,'orbit:'+skill);
  return 'Collected '+d.name+' output and earned 48 XP.';
 }
 if(!d?.canStart||!pay(s,d.cost,c))return '';
 const specialist=ORBIT_ADVANCEMENTS[c.class]?.id===c.advancement;
 c.orbitJobs[skill]={ready:now+d.seconds*1000*(specialist?.65:1),yieldCount:specialist?4:2};
 return d.name+' started.';
}
export function orbitSecretReason(c,id){
 const d=ORBIT_SECRETS[id];
 if(!d)return '';
 if(d.level&&1+Math.floor(Math.sqrt(c.skills.cartography/12))<d.level)return 'Reach Cartography level '+d.level+' to read this hidden route.';
 if(id==='singularity'&&((c.journey.kills['orbit-rim-5']||0)<45||c.skills.cartography<108))return 'Reach Cartography level 4 and defeat 45 Gravity Knights in Gravity Well.';
 return '';
}
export function validateOrbitJobs(c){
 if(!c.orbitJobs||typeof c.orbitJobs!=='object'||Array.isArray(c.orbitJobs)||Object.entries(c.orbitJobs).some(([id,j])=>!ORBIT_JOBS[id]||!j||!Number.isSafeInteger(j.ready)||j.ready<0||![2,4].includes(j.yieldCount)))throw Error('Invalid Astral Reach jobs.');
}
