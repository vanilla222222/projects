import {tierTwoDiscoveries} from './world-two.mjs?v=45';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from './engine.mjs?v=45';
import * as D from './content.mjs?v=45';
import {WORLD_THREE,ORBIT_JOBS,ORBIT_SECRETS,ORBIT_ADVANCEMENTS} from './world-three-content.mjs';
import {workOrbitJob,orbitSecretReason} from './world-three.mjs';
import {World,abilitySet} from './world.mjs?v=49';
import {atlasNodes,travelAtlas} from './travel-atlas.mjs?v=50';
import {pointFor,roomLayout} from './layouts.mjs?v=49';

test('Astral Reach contains fifty rooms, three towns and a boss-gated entrance with no shortcut',()=>{
 const s=E.freshSave(),c=E.selected(s);
 assert.equal(atlasNodes(3).filter(n=>n.area.startsWith('orbit-')).length+Object.values(ORBIT_SECRETS).filter(d=>d.area.startsWith('orbit-')).length,50);
 assert.equal(WORLD_THREE.areas.filter(a=>a.town).length,3);
 assert.match(travelAtlas(s,c,3,'orbit-dock:0'),/Landing Ring/);
 assert.equal(E.zoneUnlocked(s,'orbit-dock',0),false);
 s.bossHunt.kills.tempest=1;
 assert.equal(E.zoneUnlocked(s,'orbit-dock',0),true);
 Object.assign(c,{area:'tide-gate',zone:1});
 const w=new World(s);
 assert.equal(w.usePortal(w.map.portals.find(p=>p.id==='portal-return-orbit-dock')),false);
 assert.ok(w.usePortal(w.map.portals.find(p=>p.id==='portal-branch-orbit-dock')));
 assert.equal(w.c.area,'orbit-dock');
 assert.equal(E.zoneUnlocked(s,'orbit-garden',1),false);
 const first=D.zoneEnemy('orbit-garden',0),previous=D.zoneEnemy('tide-cliffs',3);
 for(const key of ['hp','accuracy','attack'])assert.ok(first[key]>previous[key],key);
});

test('Every town job has real inputs and yields persisted batches with a class specialty',()=>{
 for(const [id,d] of Object.entries(ORBIT_JOBS)){
  let s=E.freshSave(),c=E.selected(s);
  const [base,specialty]=Object.entries(ORBIT_ADVANCEMENTS).find(([,entry])=>entry.skill===id);
  Object.assign(c,{class:base,advancement:specialty.id,area:d.area,zone:d.zone,position:pointFor(roomLayout(d.area,d.zone),'orbit-job')});
  assert.equal(workOrbitJob(s,c,id,0),'');
  for(const [item,count] of Object.entries(d.cost))E.give(c,item,count);
  assert.match(workOrbitJob(s,c,id,0),/started/);
  s=E.restoreSave(JSON.parse(JSON.stringify(s)));
  c=E.selected(s);
  assert.equal(workOrbitJob(s,c,id,1),'');
  assert.match(workOrbitJob(s,c,id,d.seconds*650),/Collected/);
  assert.equal(c.bag[d.output],4);
  assert.equal(c.skills[id],48);
  assert.equal(workOrbitJob(s,c,id,d.seconds*650),'');
 }
});

test('Cartography checks personal skill and the Colossus checks combat progression',()=>{
 const s=E.freshSave(),c=E.selected(s);
 assert.match(orbitSecretReason(c,'chart-green'),/level 2/);
 c.skills.cartography=108;
 for(const [id,d] of Object.entries(ORBIT_SECRETS).filter(([,d])=>d.level)){
  Object.assign(c,{area:d.area,zone:d.zone,secret:null});
  if(d.area.startsWith('orbit-')){
   s.story['tide-restored']={done:true};
   c.journey.visited['orbit-dock-0']=true;
   const req=E.routeRequirement(d.area,d.zone);
   c.journey.kills[req.id]=req.goal;
  }
  if(d.area==='tree')s.kills['forest-3']=12,c.journey.kills['tree-0']=999;
  else if(d.area==='tide-cliffs')s.storyFlags.complete=s.worldCompletionCrafted=true,c.journey.kills['tide-cliffs-1']=999;
  const w=new World(s);
  assert.ok(w.travel(d.area,d.zone,{secret:id,entrance:'portal-left'}),id);
  assert.equal(w.map.monsters.length,0);
  c.position=E.surveyPoint(w.map.layout);
  assert.ok(E.claimSurvey(s,c));
  assert.equal(E.claimSurvey(s,c),false);
 }
 assert.match(E.encounterReason(s,c,'singularity'),/45 Gravity Knights/);
 c.journey.kills['orbit-rim-5']=180;
 s.secretUnlocks.push('singularity');
 assert.equal(E.encounterReason(s,c,'singularity'),'');
});

test('Talent budgets unlock at separate cadences and legacy overspending is refunded',()=>{
 const s=E.freshSave(),c=E.selected(s);
 Object.assign(c,{level:11,class:'warrior',advancement:'beastwarden'});
 assert.deepEqual([E.combatPoints(c),E.classPoints(c),E.tierPoints(c)],[11,5,3]);
 assert.ok(E.train(c,'technique','tier'));
 assert.equal(abilitySet(c)[0].name,'Starlamb Charge');
 const legacy=JSON.parse(JSON.stringify(s));
 delete legacy.characters[0].tierTalents;
 legacy.characters[0].talents.power=15;
 legacy.characters[0].classTalents.fortitude=10;
 const restored=E.selected(E.restoreSave(legacy));
 assert.deepEqual([E.combatPoints(restored),E.classPoints(restored),E.tierPoints(restored)],[11,5,3]);
});

test('Unarmed damage grows slowly and equipping a weapon restores full scaling',()=>{
 const s=E.freshSave(),c=E.selected(s);
 c.level=18;
 c.talents.power=18;
 assert.ok(E.power(s,c)<36);
 E.createEquipment(s,'copper-sword',c);
 assert.ok(E.power(s,c)>50);
});

test('All ten Tier 2 branches must be discovered before duplicate training',()=>{
 const s=E.freshSave(),c=E.selected(s);
 s.storyFlags.complete=s.worldCompletionCrafted=true;
 const d=ORBIT_ADVANCEMENTS.warrior;
 Object.assign(c,{class:'warrior',level:35,area:d.area,zone:d.zone,position:pointFor(roomLayout(d.area,d.zone),'advancement')});
 c.skills.beastkeeping=48;
 E.give(c,'starlamb-fleece',6);
 const duplicate=E.makeCharacter(2,'First Beastwarden');
 duplicate.class='warrior';
 duplicate.advancement=d.id;
 s.characters.push(duplicate);
 assert.match(E.advancementStatus(s,c).reason,/No duplicate/);
 const ids=['ranger','grovekeeper','excavator','weaver','tidecaller','thornspeaker','silkguard','starfarer','hearthbrewer'];
 for(const id of ids)s.characters.push({...E.makeCharacter(s.characters.length+1,id),advancement:id});
 assert.equal(tierTwoDiscoveries(s).length,10);
 assert.ok(E.advanceClass(s,c));
 assert.equal(c.advancement,'beastwarden');
});

test('The Eventide Colossus runs an active fight and awards the Singularity Core',()=>{
 const s=E.freshSave(),c=E.selected(s);
 s.story['tide-restored']={done:true,accepted:true};
 c.journey.visited['orbit-dock-0']=true;
 c.journey.kills['orbit-rim-5']=180;
 s.secretUnlocks.push('singularity');
 Object.assign(c,{area:'orbit-chart',zone:3,level:95,class:'warrior',advancement:'beastwarden'});
 c.skills.cartography=108;
 c.attributes={might:60,finesse:0,focus:125};
 c.talents.precision=15;
 c.tierTalents={force:20,technique:1};
 for(const id of ['tempest-warrior','nebula-mail','nova-charm','beacon-ring'])E.createEquipment(s,id,c);
 c.hp=E.maxHp(c);
 const w=new World(s,{rng:()=>.5});
 assert.ok(w.travel('orbit-chart',3,{secret:'singularity',entrance:'portal-left'}));
 const boss=w.map.monsters[0];
 w.player.x=boss.x-80;
 w.toggleAuto();
 if(!w.auto)w.toggleAuto();
 for(let i=0;i<18000&&!s.bossHunt.kills.singularity;i++)w.step(.02);
 assert.equal(s.bossHunt.kills.singularity,1);
 w.collectAll();
 assert.equal(c.bag['singularity-core'],1);
 assert.doesNotThrow(()=>E.restoreSave(JSON.parse(JSON.stringify(s))));
});
