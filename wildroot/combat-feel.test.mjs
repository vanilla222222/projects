import test from 'node:test';import assert from 'node:assert/strict';
import * as E from './engine.mjs?v=35';import * as D from './content.mjs?v=35';
import {World} from './world.mjs?v=35';import {makeTell} from './combat-patterns.mjs?v=35';
const setup=()=>{const s=E.freshSave(),w=new World(s,{rng:()=>.5});return{s,w,c:w.c,e:w.map.monsters[0]};};
test('Every class can use its primary skill from the distance where AUTO stops',()=>{
 for(const calling of Object.keys(D.CLASSES)){const{s,w,c,e}=setup();c.class=calling;c.level=10;c.mp=E.maxMana(c);e.hp=100000;w.player.x=e.x-(E.weaponProfile(c).range-20);w.player.y=e.y;w.target=e;w.auto=true;const hp=e.hp;w.follow(.02);assert.ok(w.player.skill>0,calling);assert.ok(e.hp<hp,calling);assert.ok(w.attackEffects.some(f=>f.skill&&f.calling===calling));}
});
test('Class attack feedback expires and never deals extra damage on its own',()=>{
 const{s,w,c,e}=setup();c.class='mage';e.hp=100000;w.player.x=e.x-100;w.player.y=e.y;assert.ok(w.basicAttack());assert.equal(w.attackEffects.length,1);const hp=e.hp;w.target=null;w.auto=false;for(let i=0;i<20;i++)w.step(.02);assert.equal(e.hp,hp);assert.equal(w.attackEffects.length,0);assert.doesNotThrow(()=>E.restoreSave(JSON.parse(JSON.stringify(s))));
});
test('A projectile moving away from the player cannot award a phantom dodge',()=>{
 const{s,w,c}=setup();w.player.x=400;w.player.y=644;w.hazards=[{kind:'bolt',x:100,y:589,vx:-260,width:22,height:27,life:1,origin:100}];w.step(.02);assert.equal(w.particles.some(p=>p.text==='DODGED'),false);assert.equal(w.hazards[0].avoided,undefined);
});
test('Attacks that never threatened the player do not award melee dodge feedback',()=>{
 const{s,w,c,e}=setup();e.enemy=D.ENEMIES['forest-0'];w.player.x=e.x+250;w.player.y=e.y;e.telegraph=makeTell(e,w.player,w.map.width);assert.equal(e.telegraph.threatened,false);w.resolveAttack(e);assert.equal(w.particles.some(p=>p.text==='DODGED'),false);
});
test('Final phase eruption damage uses both fixed warned marks and leaves a safe gap',()=>{
 for(const place of ['first','second','gap']){const{s,w,c,e}=setup();e.enemy=D.ENEMIES.boss;e.phaseLevel=3;e.attackCount=0;e.ledgeMin=25;e.ledgeMax=2000;e.x=300;w.player.x=800;w.player.y=e.y;e.telegraph=makeTell(e,w.player,w.map.width);const zones=structuredClone(e.telegraph.zones);assert.equal(zones.length,2);w.player.x=place==='first'?(zones[0].left+zones[0].right)/2:place==='second'?(zones[1].left+zones[1].right)/2:(zones[0].right+zones[1].left)/2;const hp=c.hp;w.resolveAttack(e);assert.deepEqual(e.telegraph.zones,zones);assert.equal(c.hp<hp,place!=='gap');if(place==='gap')assert.ok(w.particles.some(p=>p.text==='DODGED'));}
});
test('Final phase sweeps cover both sides, earlier phases launch one warned direction',()=>{
 for(const phase of [1,2,3]){const{s,w,c,e}=setup();e.enemy=D.ENEMIES.boss;e.phaseLevel=phase;e.attackCount=1;w.player.x=e.x+100;w.player.y=e.y;e.telegraph=makeTell(e,w.player,w.map.width);w.resolveAttack(e);assert.equal(w.hazards.length,phase===3?2:1);if(phase===3)assert.ok(w.hazards.some(h=>h.vx<0)&&w.hazards.some(h=>h.vx>0));}
});
test('Comparable late-world builds keep single-target idle kill rates within a bounded class spread',()=>{
 const rates=[];for(const calling of Object.keys(D.CLASSES)){const{s,c}=setup();c.class=calling;c.level=20;E.investAttribute(c,E.CLASS_DESIGNS[calling].accuracy,20);E.investAttribute(c,E.CLASS_DESIGNS[calling].primary,18);for(const id of [D.VERDANT_WEAPONS[calling],'tempered-mail','iron-helm'])E.createEquipment(s,id,c);E.syncAccount(s);c.area='deep';c.zone=0;c.activity='fight';const f=E.assignmentForecast(s,c,600);assert.equal(f.retreatSeconds,null);rates.push(f.kills);}assert.ok(Math.max(...rates)/Math.min(...rates)<1.4,rates.join(', '));
});
