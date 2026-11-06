import {seedKill,seedStory} from './test-fixtures.mjs?v=23';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from './engine.mjs?v=23';
import {World,createMap,nextRoute,GROUND,PLATFORMS,LADDERS} from './world.mjs?v=23';
function tick(world,seconds,input={}){for(let i=0;i<seconds*50;i++)world.step(.02,typeof input==='function'?input(i):input);}
function setup(options={}){const state=E.freshSave(),events=[];return{state,events,world:new World(state,{rng:()=>.5,onIntent:e=>events.push(e),onEvent:e=>events.push(e),...options})};}
test('Maps have multiple actual enemy entities, platforms, ladders, resources and portals',()=>{
 const m=createMap('forest',0);assert.equal(m.monsters.length,10);assert.equal(m.resources[0].resource,'oak');assert.equal(m.portals.length,2);assert.equal(m.platforms.length,7);assert.equal(m.ladders.length,6);assert.ok(m.monsters.some(e=>e.y<GROUND));assert.equal(createMap('town',0).npcs.length,1);assert.equal(createMap('town',1).stations[0].station,'anvil');assert.equal(createMap('jungle-town',1).stations[0].station,'alchemy');
});
test('Walking, jumping and landing change actual character position',()=>{
 const {world}=setup(),x=world.player.x;tick(world,1,{horizontal:1});assert.ok(world.player.x>x+200);assert.equal(world.player.y,GROUND);world.step(.02,{jump:true});assert.ok(world.player.y<GROUND);tick(world,1.5);assert.equal(world.player.y,GROUND);assert.equal(world.player.grounded,true);
});
test('Click-to-walk navigates a ladder to the upper platform',()=>{
 const {world}=setup();world.walkTo(510,462);tick(world,6);assert.ok(Math.abs(world.player.x-510)<10,world.player.x);assert.equal(world.player.y,462);assert.equal(world.destination,null);
});
test('Resource collection requires reaching the actual node',()=>{
 const {world,state}=setup();world.select('node-0');tick(world,.3);assert.equal(state.inventory.oak,undefined);tick(world,7);assert.ok(world.c.bag.oak>=1);assert.ok(world.c.skills.logging>=2);assert.ok(Math.abs(world.player.x-world.map.resources[0].x)<65);
});
test('A clicked enemy takes individual hits, dies, awards loot once and respawns',()=>{
 const {world,state}=setup(),enemy=world.map.monsters[0];world.select(enemy.id);tick(world,.2);assert.equal(enemy.hp,enemy.enemy.hp);assert.equal(world.c.kills,0);tick(world,7);assert.equal(world.c.kills,1);assert.equal(state.kills['forest-0'],1);assert.ok(state.coins>0);assert.ok(enemy.dead>0);tick(world,7);assert.equal(world.c.kills,1);assert.equal(enemy.dead,0);assert.equal(enemy.hp,enemy.enemy.hp);
});
test('Class ability respects range and cooldown and changes damage',()=>{
 const {world}=setup();world.c.class='mage';world.player.x=500;world.player.y=GROUND;const e=world.map.monsters[0],hp=e.hp;assert.ok(world.useSkill());assert.ok(e.hp<hp);assert.ok(world.player.skill>0);assert.equal(world.useSkill(),false);world.player.skill=0;world.player.x=20;assert.equal(world.useSkill(),false);
});
test('Auto combat finds new targets, navigates and earns kills; manual movement takes over',()=>{
 const {world}=setup();world.c.level=10;world.c.hp=E.maxHp(world.c);assert.equal(world.toggleAuto(),true);tick(world,40);assert.ok(world.c.kills>3,world.c.kills);const x=world.player.x;tick(world,.2,{horizontal:-1});assert.equal(world.auto,false);assert.equal(world.target,null);assert.ok(world.player.x<x);
});
test('NPC interaction opens dialogue only after walking into range',()=>{
 const {world,events}=setup();world.travel('caves',0);world.select('npc-warrior');assert.equal(events.filter(e=>e.type==='npc').length,0);tick(world,2);assert.equal(events.filter(e=>e.type==='npc').length,1);assert.ok(Math.abs(world.player.x-270)<80);
});
test('Portals use progression gates and connect adjacent areas',()=>{
 assert.deepEqual(nextRoute('forest',0,-1),{area:'town',zone:0});assert.deepEqual(nextRoute('forest',4,1),{area:'jungle',zone:0});assert.deepEqual(nextRoute('jungle-town',2,1),{boss:true});
 const {world,state,events}=setup();world.select('portal-right');tick(world,13);assert.equal(world.c.zone,0);assert.ok(events.some(e=>e.type==='notice'));seedKill(state,'forest-0',12);world.select('portal-right');tick(world,1);assert.equal(world.c.zone,1);
});
test('Knockouts recover without awarding enemy loot',()=>{
 const {world}=setup();world.c.hp=1;world.player.x=695;const e=world.map.monsters[0];e.attack=0;world.select(e.id);tick(world,1.2);assert.ok(world.player.respawn>0);tick(world,4);assert.equal(world.player.respawn<=0,true);assert.equal(world.c.hp,E.maxHp(world.c));assert.equal(world.c.kills,0);assert.equal(world.c.activity,'rest');
});
test('Individual talent points are limited by level and survive old save migration',()=>{
 const state=E.freshSave(),c=E.selected(state);assert.equal(E.trainTalent(c,'power'),false);c.level=4;const power=E.power(state,c),hp=E.maxHp(c);assert.ok(E.trainTalent(c,'power'));assert.ok(E.power(state,c)>power);assert.ok(E.trainTalent(c,'vitality'));assert.equal(E.maxHp(c),hp+10);assert.ok(E.trainTalent(c,'industry'));assert.equal(E.talentPoints(c),6);assert.ok(E.trainTalent(c,'power',6));assert.equal(E.trainTalent(c,'power'),false);assert.equal(E.trainTalent(c,'madeup'),false);
 const saved=JSON.parse(JSON.stringify(state));delete saved.characters[0].talents;const restored=E.restoreSave(saved);assert.deepEqual(restored.characters[0].talents,{power:0,vitality:0,industry:0,precision:0,haste:0,signature:0});
});
test('Switching character resumes its own assignment and leaves the other character intact',()=>{
 const {world,state}=setup(),first=world.c;state.unlockedClasses=['warrior'];E.createCharacter(state,'Second');world.switchCheck();assert.equal(world.c.name,'Second');world.select('node-0');tick(world,6);assert.ok(world.c.bag.oak>0);state.active=first.id;world.switchCheck();assert.equal(world.c,first);assert.equal(state.characters[1].activity,'gather');
});
test('Ranged kills leave collectible floor loot, retained across save/reload',()=>{
 const {world,state}=setup();world.c.class='mage';world.c.level=3;world.player.x=500;world.player.y=GROUND;assert.ok(world.useSkill());assert.equal(world.c.kills,1);assert.equal(state.coins,0);assert.ok(world.groundLoot.length>0);assert.equal(state.inventory['moss-slime']||0,0);
 const restored=E.restoreSave(JSON.parse(JSON.stringify(state))),reloaded=new World(restored,{rng:()=>.5});assert.ok(reloaded.groundLoot.length>0);assert.ok(reloaded.pickLoot(reloaded.groundLoot[0].id));tick(reloaded,3);assert.ok(restored.coins>0);assert.ok(reloaded.c.bag['moss-slime']>0);assert.equal(reloaded.groundLoot.length,0);assert.equal(reloaded.c.kills,1);
});
test('Background simulation preserves account rewards without double-counting the controlled character',()=>{
 const state=E.freshSave(),hero=E.selected(state);state.unlockedClasses=['warrior'];E.start(state,hero,'gather','oak');E.createCharacter(state,'Miner');const miner=E.selected(state);E.travel(state,miner,'caves',0);E.start(state,miner,'gather','copper');state.active=hero.id;E.advanceBackground(state,60,hero.id,()=>.5);assert.equal(state.inventory.oak,undefined);assert.equal(miner.bag.copper,20);
 E.travel(state,miner,'forest',0);E.start(state,miner,'fight');E.advanceBackground(state,60,hero.id,()=>.5);assert.ok(state.coins>0);assert.ok(miner.bag['moss-slime']>0);assert.equal(hero.kills,0);
});
test('Auto in town cannot create an invalid combat assignment or break the save',()=>{
 const {world,state}=setup();world.travel('town',0);assert.equal(world.toggleAuto(),false);assert.equal(world.c.activity,'rest');assert.doesNotThrow(()=>E.restoreSave(JSON.parse(JSON.stringify(state))));
});

test('All room doorways have unique, reciprocal destinations and arrival points',async()=>{
 const {AREAS,SECRETS}=await import('./content.mjs?v=23');
 for(const area of AREAS)for(let zone=0;zone<area.zones.length;zone++){
  const map=createMap(area.id,zone),targets=map.portals.map(p=>JSON.stringify([p.destination.area,p.destination.zone,p.destination.boss||false,p.destination.secret||null]));assert.equal(new Set(targets).size,targets.length);
  const arrivals=[];for(const portal of map.portals){const to=portal.destination,other=createMap(to.area,to.zone,!!to.boss,to.secret||null),back=other.portals.find(p=>p.id===to.entrance);assert.ok(back,`${area.id}/${zone}/${portal.id} has a matching entrance`);assert.equal(back.destination.area,area.id);assert.equal(back.destination.zone,zone);assert.equal(back.destination.entrance,portal.id);const {entrancePoint}=await import('./world.mjs?v=23');arrivals.push(JSON.stringify(entrancePoint(portal.id,area.id,zone)));}assert.equal(new Set(arrivals).size,arrivals.length);
 }
 for(const[id,d]of Object.entries(SECRETS)){const room=createMap(d.area,d.zone,false,id);assert.equal(room.portals.length,1);assert.equal(room.portals[0].destination.entrance,'secret-'+id);assert.ok(createMap(d.area,d.zone).discoveries.some(e=>e.id===room.portals[0].destination.entrance));}
});
test('Entering opposite portals gives different positions and the transition frame preserves the destination',()=>{
 const{world,state}=setup();seedKill(state,'forest-0',12);seedKill(state,'forest-1',12);assert.ok(world.travel('forest',1));assert.equal(world.player.x,135);assert.ok(world.travel('forest',2));assert.equal(world.player.x,135);assert.ok(world.usePortal(world.map.portals.find(p=>p.id==='portal-left')));assert.equal(world.c.zone,1);assert.equal(world.player.x,world.map.portals.find(p=>p.id==='portal-right').x-70);assert.equal(world.c.position.x,world.map.portals.find(p=>p.id==='portal-right').x-70);
 world.player.x=world.map.portals.find(p=>p.id==='portal-right').x-20;world.select('portal-right');world.step(.02);assert.equal(world.c.zone,2);assert.equal(world.player.x,135);assert.equal(world.c.position.x,135);const saved=E.restoreSave(JSON.parse(JSON.stringify(state))),reloaded=new World(saved);assert.equal(reloaded.player.x,135);assert.equal(reloaded.target,null);
});
test('The deep-cavern loop has a separate elevated return doorway and keeps progression gates',()=>{
 const{world,state}=setup();seedKill(state,'caves-1',12);assert.ok(world.travel('caves',2));const branch=world.map.portals.find(p=>p.id==='portal-deep-return');assert.equal(world.usePortal(branch),false);seedKill(state,'deep-2',12);seedKill(state,'caves-2',12);assert.ok(world.usePortal(branch));assert.equal(world.c.area,'deep');assert.equal(world.c.zone,3);assert.equal(world.player.x,world.map.portals.find(p=>p.id==='portal-right').x-70);assert.ok(world.usePortal(world.map.portals.find(p=>p.id==='portal-right')));assert.equal(world.c.area,'caves');assert.equal(world.player.x,world.map.portals.find(p=>p.id==='portal-deep-return').x-70);assert.equal(world.player.y,342);const loaded=new World(E.restoreSave(JSON.parse(JSON.stringify(state))));assert.equal(loaded.player.y,342);assert.equal(loaded.player.x,2930);
});
test('Secret and boss rooms have one exit back to their exact parent doorway',()=>{
 const{world,state}=setup();seedKill(state,'forest-2',12);state.secretUnlocks.push('sunwell');world.travel('forest',3);Object.assign(world.player,world.map.discoveries[0]);world.select('secret-sunwell');world.step(.02);assert.equal(world.map.secret,'sunwell');assert.equal(world.player.x,135);assert.equal(world.map.portals.length,1);world.usePortal(world.map.portals[0]);assert.equal(world.map.secret,null);assert.equal(world.c.zone,3);assert.equal(world.player.x,world.map.discoveries[0].x+70);
 seedKill(state,'jungle-3',12);world.travel('jungle-town',2);const gate=world.map.portals.find(p=>p.id==='portal-right');assert.equal(world.usePortal(gate),false);state.storyFlags.bossPermit=true;assert.ok(world.usePortal(gate));assert.equal(world.map.boss,true);assert.equal(world.player.x,135);assert.equal(world.map.portals.length,1);assert.ok(world.usePortal(world.map.portals[0]));assert.equal(world.map.boss,false);assert.equal(world.c.zone,2);assert.equal(world.player.x,world.map.portals.find(p=>p.id==='portal-right').x-70);assert.equal(world.c.activity,'rest');
});
test('A boss minion cannot trigger victory or erase the living boss',()=>{
 const{world,state,events}=setup();seedKill(state,'jungle-3',12);state.storyFlags.bossPermit=true;world.travel('jungle-town',2);world.usePortal(world.map.portals.find(p=>p.id==='portal-right'));const boss=world.map.monsters[0],add={...boss,id:'boss-add-test',enemy:{...boss.enemy,id:'forest-0',hp:1},hp:1,dead:0};world.map.monsters.push(add);world.hit(add,100);assert.equal(state.bossDefeated,false);assert.equal(boss.dead,0);assert.equal(events.some(e=>e.type==='victory'),false);
});
test('Knockouts recover beside the room entrance and reassignment clears old-room positions',()=>{
 const{world,state}=setup();seedKill(state,'forest-0',12);seedKill(state,'forest-1',12);world.travel('forest',2);world.usePortal(world.map.portals[0]);assert.equal(world.c.entryPoint.x,world.map.portals.find(p=>p.id==='portal-right').x-70);world.player.x=700;world.player.respawn=.01;world.c.hp=0;world.step(.02);assert.equal(world.player.x,world.map.portals.find(p=>p.id==='portal-right').x-70);assert.equal(world.player.y,world.c.entryPoint.y);assert.equal(world.c.hp,E.maxHp(world.c));E.travel(state,world.c,'town',0);assert.equal(world.c.position,null);assert.equal(world.c.entryPoint,null);
});
