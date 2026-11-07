import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from './engine.mjs?v=45';
import * as Talk from './conversations.mjs?v=45';
import {ORBIT_NPCS,ORBIT_QUESTS,EXPEDITION_TASKS} from './orbit-campaign.mjs';
import {ORBIT_JOBS,ORBIT_SECRETS} from './world-three-content.mjs';
import {workOrbitJob} from './world-three.mjs';
import {pointFor,roomLayout} from './layouts.mjs?v=49';
import {World} from './world.mjs?v=49';

test('Astral Reach quests connect NPCs, workstations, hidden rooms, boss and completion reward',()=>{
 const s=E.freshSave(),c=E.selected(s);
 assert.equal(E.questStatus(s,'orbit-arrival',c).available,false);
 s.story['tide-restored']={accepted:true,done:true};
 s.worldCompletionCrafted=s.storyFlags.complete=true;
 E.createEquipment(s,'tide-mail',c);
 E.createEquipment(s,'storm-charm',c);
 assert.ok(E.travel(s,c,'orbit-dock',0));
 let now=0;
 for(const q of ORBIT_QUESTS){
  const npc={...ORBIT_NPCS[q.giver],role:q.giver};
  const meet=()=>Object.assign(c,{area:npc.area,zone:npc.zone,secret:null,position:{x:npc.x,y:npc.y}});
  meet();
  let dialogue=Talk.conversationTopic(s,c,Talk.startConversation(q.giver,0,c.id),'work');
  assert.equal(dialogue.questId,q.id);
  assert.ok(Talk.acceptConversationQuest(s,c,dialogue,npc));
  for(const [action,count] of Object.entries(q.actions||{})){
   const id=action.split(':')[1],d=ORBIT_JOBS[id];
   Object.assign(c,{area:d.area,zone:d.zone,position:pointFor(roomLayout(d.area,d.zone),'orbit-job')});
   for(let i=0;i<count;i++){
    for(const [item,n] of Object.entries(d.cost))E.give(c,item,n);
    assert.match(workOrbitJob(s,c,id,now),/started/);
    now+=d.seconds*1000;
    assert.match(workOrbitJob(s,c,id,now),/Collected/);
   }
  }
  for(const key of q.visits||[])c.journey.visited[key]=true;
  for(const [id,count] of Object.entries(q.kills||{}))c.journey.kills[id]=count;
  if(q.surveys){
   c.journey.kills['orbit-rim-5']=45;
   assert.match(E.encounterReason(s,c,'singularity'),/Three Skies/);
   for(const id of q.surveys){
    const d=ORBIT_SECRETS[id],r=E.routeRequirement(d.area,d.zone);
    c.journey.kills[r.id]=r.goal;
    s.kills['forest-3']=12;
    Object.assign(c,{area:d.area,zone:d.zone});
    const world=new World(s);
    assert.ok(world.travel(d.area,d.zone,{secret:id,entrance:'portal-left'}));
    c.position=E.surveyPoint(world.map.layout);
    assert.ok(E.claimSurvey(s,c));
   }
  }
  if(q.id==='orbit-eventide'){
   assert.equal(E.encounterReason(s,c,'singularity'),'');
   E.give(c,'singularity-core',1);
  }
  meet();
  dialogue=Talk.conversationTopic(s,c,dialogue,'work');
  assert.equal(dialogue.mode,'ready',JSON.stringify(E.questStatus(s,q.id,c).tasks));
  assert.ok(Talk.completeConversationQuest(s,c,dialogue,npc));
  assert.equal(Talk.completeConversationQuest(s,c,dialogue,npc),false);
 }
 assert.ok(s.story['orbit-eventide'].done);
 assert.equal((c.bag['astral-completion-token']||0)+(c.overflow['astral-completion-token']||0),1);
 assert.doesNotThrow(()=>E.restoreSave(JSON.parse(JSON.stringify(s))));
});

test('Expedition task boards in both worlds grant merits and blueprint tokens exactly once',()=>{
 const s=E.freshSave(),c=E.selected(s);
 const meritTotal=EXPEDITION_TASKS.reduce((sum,t)=>sum+t.reward,0);
 for(const t of EXPEDITION_TASKS){
  const area=t.world===2?'tide-town':'orbit-dock';
  Object.assign(c,{area,zone:0,position:pointFor(roomLayout(area,0),'tasks')});
  s.tasksUnlocked=true;
  assert.equal(E.claimTask(s,t.id),false);
  if(t.type==='story')s.story[t.key]={accepted:true,done:true};
  if(t.type==='enemy')s.kills[t.key]=t.goal;
  if(t.type==='gather')s.metrics.gather[t.key]=t.goal;
  if(t.type==='visit')s.visited[t.key]=true;
  if(t.type==='surveys')s.surveys.push(...t.keys);
  assert.ok(E.claimTask(s,t.id),t.id);
  assert.equal(E.claimTask(s,t.id),false,t.id);
 }
 assert.equal(s.meritPoints,meritTotal);
 assert.equal(s.workshop.tokens,EXPEDITION_TASKS.length);
 assert.doesNotThrow(()=>E.restoreSave(JSON.parse(JSON.stringify(s))));
});
