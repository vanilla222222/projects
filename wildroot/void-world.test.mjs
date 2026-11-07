import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from './engine.mjs?v=45';
import * as D from './content.mjs?v=45';
import {VOID_AREAS,RETRO_AREAS,VOID_WORK,VOID_PROJECTS,VOID_CLASSES} from './void-content.mjs';
import {atlasNodes,travelAtlas} from './travel-atlas.mjs?v=50';
import {pointFor,roomLayout} from './layouts.mjs?v=49';
import {World} from './world.mjs?v=49';
import {makeTell} from './combat-patterns.mjs?v=45';

function setup(){
 const s=E.freshSave(),c=E.selected(s);
 s.kills.singularity=1;
 const visit=(area,zone,id)=>Object.assign(c,{area,zone,position:pointFor(roomLayout(area,zone),id),secret:null});
 return {s,c,visit};
}
test('Hollow Between is the largest atlas, opens after the previous boss, and has back-world branches',()=>{
 const s=E.freshSave(),c=E.selected(s);
 assert.equal(atlasNodes(4).length,72);
 assert.equal(VOID_AREAS.filter(a=>a.town).length,3);
 assert.deepEqual(RETRO_AREAS.map(a=>a.world),[1,2,3]);
 assert.equal(E.zoneUnlocked(s,'void-landing',0),false);
 s.kills.singularity=1;
 assert.ok(E.zoneUnlocked(s,'void-landing',0));
 assert.match(travelAtlas(s,c,4,'void-landing:0'),/The Last Dock/);
 for(const id of ['null-ore','umbra-ore'])assert.ok(D.areaById('depths').resources.flat().includes(id));
 for(const id of ['rift-carp','shade-ray'])assert.ok(D.areaById('tide-shore').resources.flat().includes(id));
});
test('Bridges require a local survey and materials and persist for every character',()=>{
 const {s,c,visit}=setup();
 for(const a of [...VOID_AREAS,...RETRO_AREAS].filter(a=>VOID_PROJECTS[a.id])){
  const [area,zone]=a.entry,d=VOID_PROJECTS[a.id];
  visit(area,zone,'bridge-'+a.id);
  for(const [id,count] of Object.entries(d.cost))E.give(c,id,count);
  assert.equal(E.buildVoidBridge(s,c,a.id),false);
  c.position=E.surveyPoint(roomLayout(area,zone));
  assert.ok(E.claimSurvey(s,c));
  visit(area,zone,'bridge-'+a.id);
  assert.ok(E.buildVoidBridge(s,c,a.id),a.id);
  assert.equal(E.buildVoidBridge(s,c,a.id),false);
 }
 assert.ok(c.skills.construction>=400);
 assert.equal(E.restoreSave(JSON.parse(JSON.stringify(s))).voidProjects.length,6);
});
test('Void workstations train all four skills, open a rift, illuminate terrain and bind an echo',()=>{
 const {s,c,visit}=setup();
 for(const [skill,d] of Object.entries(VOID_WORK)){
  visit(d.area,d.zone,'void-work');
  for(const [id,count] of Object.entries(d.cost))E.give(c,id,count);
  assert.ok(E.workVoid(s,c,skill,1000));
  assert.equal(c.skills[skill],48);
 }
 visit('void-landing',3,'void-work');
 assert.equal(E.voidRiftDestination(s,c,2000),null);
 c.journey.visited['void-lantern-0']=true;
 assert.equal(E.voidRiftDestination(s,c,2000),'void-lantern');
 assert.equal(E.voidRiftDestination(s,c,302000),null);
 visit('void-rim',1,'void-light');
 assert.ok(E.lightVoidRoute(s,c));assert.ok(s.voidLights.includes('void-wound'));
 visit('void-lantern',2,'void-work');
 const weapon=E.createEquipment(s,'void-sword',c);
 const before=E.equipmentStats(weapon).attack;
 assert.ok(E.bindVoidEcho(s,c));
 assert.equal(E.bindVoidEcho(s,c),false);
 assert.equal(E.equipmentStats(weapon).attack,before+9);
 assert.doesNotThrow(()=>E.restoreSave(JSON.parse(JSON.stringify(s))));
});
test('Either Tier 2 branch qualifies for Tier 3 and the Unmoored requires a surveyed route',()=>{
 const {s,c,visit}=setup();
 visit('void-crown',1,'void-training');
 Object.assign(c,{class:'warrior',level:55});
 assert.equal(E.chooseVoidClass(s,c),false);
 c.advancement='beastwarden';
 assert.ok(E.chooseVoidClass(s,c));assert.equal(c.voidClass,VOID_CLASSES.warrior.id);
 assert.match(E.encounterReason(s,c,'unmoored'),/Still Point/);
 c.journey.visited['void-end-5']=true;s.surveys.push('void-end-5');
 visit('void-crown',5,'portal-left');
 const w=new World(s,{rng:()=>0});
 assert.ok(w.travel(c.area,c.zone,{secret:'unmoored',entrance:'portal-left'}));
 const enemy=w.map.monsters[0];
 enemy.phaseLevel=2;enemy.telegraph=makeTell(enemy,w.player,w.map.width);
 w.resolveAttack(enemy);
 assert.ok(w.map.sever.right>w.map.sever.left);
 w.hit(enemy,1000000);w.collectAll();
 assert.equal(s.bossHunt.kills.unmoored,1);
 assert.equal(c.bag['unmoored-anchor'],1);
 assert.equal(w.map.sever,null);
 assert.doesNotThrow(()=>E.restoreSave(JSON.parse(JSON.stringify(s))));
});
