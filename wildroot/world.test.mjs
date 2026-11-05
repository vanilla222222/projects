import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from './engine.mjs?v=5';
import {World,createMap,nextRoute,GROUND,PLATFORMS,LADDERS} from './world.mjs?v=5';
function tick(world,seconds,input={}){for(let i=0;i<seconds*50;i++)world.step(.02,typeof input==='function'?input(i):input);}
function setup(options={}){const state=E.freshSave(),events=[];return{state,events,world:new World(state,{rng:()=>.5,onIntent:e=>events.push(e),onEvent:e=>events.push(e),...options})};}
test('Maps have multiple actual enemy entities, platforms, ladders, resources and portals',()=>{
 const m=createMap('forest',0);assert.equal(m.monsters.length,5);assert.equal(m.resources[0].resource,'oak');assert.equal(m.portals.length,2);assert.equal(PLATFORMS.length,3);assert.equal(LADDERS.length,2);assert.ok(m.monsters.some(e=>e.y<GROUND));assert.equal(createMap('town',0).npcs.length,4);assert.equal(createMap('town',1).stations[0].station,'anvil');assert.equal(createMap('jungle-town',1).stations[0].station,'alchemy');
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
 const {world,events}=setup();world.travel('town',0);world.select('npc-warrior');assert.equal(events.filter(e=>e.type==='npc').length,0);tick(world,2);assert.equal(events.filter(e=>e.type==='npc').length,1);assert.ok(Math.abs(world.player.x-300)<80);
});
test('Portals use progression gates and connect adjacent areas',()=>{
 assert.deepEqual(nextRoute('forest',0,-1),{area:'town',zone:0});assert.deepEqual(nextRoute('forest',4,1),{area:'jungle',zone:0});assert.deepEqual(nextRoute('jungle-town',2,1),{boss:true});
 const {world,state,events}=setup();world.select('portal-right');tick(world,7);assert.equal(world.c.zone,0);assert.ok(events.some(e=>e.type==='notice'));state.kills['forest-0']=12;world.select('portal-right');tick(world,1);assert.equal(world.c.zone,1);
});
test('Knockouts recover without awarding enemy loot',()=>{
 const {world}=setup();world.c.hp=1;world.player.x=695;const e=world.map.monsters[0];e.attack=0;world.select(e.id);tick(world,1.2);assert.ok(world.player.respawn>0);tick(world,4);assert.equal(world.player.respawn<=0,true);assert.equal(world.c.hp,E.maxHp(world.c));assert.equal(world.c.kills,0);assert.equal(world.c.activity,'rest');
});
test('Individual talent points are limited by level and survive old save migration',()=>{
 const state=E.freshSave(),c=E.selected(state);assert.equal(E.trainTalent(c,'power'),false);c.level=4;const power=E.power(state,c),hp=E.maxHp(c);assert.ok(E.trainTalent(c,'power'));assert.ok(E.power(state,c)>power);assert.ok(E.trainTalent(c,'vitality'));assert.equal(E.maxHp(c),hp+10);assert.ok(E.trainTalent(c,'industry'));assert.equal(E.talentPoints(c),0);assert.equal(E.trainTalent(c,'power'),false);assert.equal(E.trainTalent(c,'madeup'),false);
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
