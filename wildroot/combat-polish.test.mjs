import test from 'node:test';import assert from 'node:assert/strict';
import * as E from './engine.mjs?v=39';import * as D from './content.mjs?v=39';
import {World} from './world.mjs?v=39';import {ATTACKS,makeTell,nextAttack,attackDescription} from './combat-patterns.mjs?v=39';
import * as UI from './ui-panels.mjs?v=39';
const setup=()=>{const s=E.freshSave(),w=new World(s,{rng:()=>.5});return{s,w,c:w.c,e:w.map.monsters[0]};};
test('Marked attacks resolve at the warned location and moving away earns dodge feedback',()=>{
 const{s,w,c,e}=setup();e.enemy=D.ENEMIES['jungle-1'];w.player.x=e.x+100;w.player.y=e.y;e.telegraph=makeTell(e,w.player,w.map.width);const mark=e.telegraph.x;w.player.x=mark+100;const hp=c.hp;w.resolveAttack(e);assert.equal(c.hp,hp);assert.ok(w.particles.some(p=>p.text==='DODGED'));assert.equal(e.x,mark);
 e.telegraph=makeTell(e,w.player,w.map.width);w.player.x=e.telegraph.x;w.resolveAttack(e);assert.ok(c.hp<hp);
});
test('Charge lane warnings and actual travel stop at the same platform edge',()=>{
 const{s,w,c,e}=setup();e.enemy=D.ENEMIES['forest-1'];e.x=e.ledgeMax-10;w.player.x=e.ledgeMax;w.player.y=e.y-100;e.telegraph=makeTell(e,w.player,w.map.width);assert.equal(e.telegraph.end,e.ledgeMax);const hp=c.hp;w.resolveAttack(e);assert.equal(c.hp,hp);assert.equal(e.x,e.ledgeMax);
});
test('Shell enemies expose a real opening during windup and recovery',()=>{
 const{s,w,c,e}=setup();e.enemy=D.ENEMIES['caves-1'];e.hp=10000;e.attack=0;w.player.x=e.x+60;w.player.y=e.y;w.target=e;w.step(.02);assert.ok(e.telegraph);assert.equal(e.guarding,false);let guard=0;while(e.telegraph&&guard++<100)w.step(.02);assert.ok(e.guardRecovery>0);w.step(.02);assert.equal(e.guarding,false);
});
test('Aimed projectiles hit a standing player but jumping clears the same shot',()=>{
 for(const jump of [false,true]){const{s,w,c,e}=setup();e.enemy=D.ENEMIES['forest-2'];w.player.x=e.x+100;w.player.y=e.y;const hp=c.hp;e.telegraph=makeTell(e,w.player,w.map.width);w.resolveAttack(e);e.telegraph=null;
  for(let i=0;i<28;i++)w.step(.02,jump&&i===0?{jump:true}:{});
  if(jump){assert.equal(c.hp,hp);assert.equal(w.particles.filter(p=>p.text==='DODGED').length,1);}else assert.ok(c.hp<hp);
 }
});
test('Overlapping damage has a short recovery window; lethal hits cannot be rescued by food',()=>{
 const{s,w,c}=setup();assert.ok(w.hurt(5));const hp=c.hp;assert.equal(w.hurt(5),false);assert.equal(c.hp,hp);for(let i=0;i<24;i++)w.step(.02);assert.ok(w.hurt(5));w.player.hurtGrace=0;c.foodSlots[0]={id:'bread',count:2,cooldown:0};assert.ok(w.hurt(100000));assert.equal(c.hp,0);assert.equal(c.foodSlots[0].count,2);
});
test('Boss phases alternate sweeps and marked eruptions without repeated summon bursts',()=>{
 const{s,w,c,e}=setup();e.enemy={...D.ENEMIES.boss};e.hp=e.enemy.hp*.6;w.target=e;w.player.x=e.x+70;w.player.y=e.y;w.hazards=[{kind:'wave',x:1,y:1,vx:1,life:5}];w.step(.02);assert.equal(e.phaseLevel,2);assert.equal(w.hazards.length,0);assert.equal(w.map.monsters.filter(m=>m.enemy.id==='boss-rootling').length,2);assert.equal(nextAttack(e),'rootburst');e.attackCount=1;assert.equal(nextAttack(e),'rootwave');w.step(.02);assert.equal(w.map.monsters.filter(m=>m.enemy.id==='boss-rootling').length,2);assert.match(attackDescription(e.enemy),/eruption/);
});
test('Rare recipes spend real drops, equip useful sidegrades, and preserve all item uses',()=>{
 for(const[id,,slot,stats]of D.RARE_CRAFTS){const{s,w,c}=setup();s.coins=1000;s.workshop.pages=3;for(const key of ['ironworking','gilding'])E.unlock(s,key);const r=D.RECIPES.find(r=>r.equipment===id);for(const[k,n]of Object.entries(r.cost))s.inventory[k]=n;Object.assign(c,{area:'town',zone:1,position:{x:1390,y:644}});const before=E.accuracy(c);assert.ok(E.craft(s,c,r.id),id);assert.equal(c.loadout[slot].base,id);for(const k of Object.keys(r.cost))assert.equal(s.inventory[k],0);if(stats.accuracy)assert.ok(E.accuracy(c)>before);assert.ok(D.purposes(id).length>=3);assert.doesNotThrow(()=>E.restoreSave(JSON.parse(JSON.stringify(s))));}
});
test('Rare enchantments apply actual stats and have readable sources in the codex',()=>{
 const{s,w,c}=setup();E.unlock(s,'ironworking');E.createEquipment(s,'copper-sword',c);Object.assign(c,{area:'jungle-town',zone:0,position:{x:1700,y:644}});for(const[k,n]of Object.entries(D.RUNES.sight.cost))s.inventory[k]=n;const before=E.accuracy(c);assert.ok(E.enchant(s,c,'weapon','sight'));assert.equal(E.accuracy(c)-before,8);assert.ok(D.purposes('echo-stone-rare').some(t=>t.includes('Trueflight')));assert.match(UI.bestiary(s,c,{enemy:'jungle-1'}),/landing mark/);assert.equal(UI.statText({accuracy:12}),'+12 accuracy');
});
test('One guardian sample completes the spring delivery without waiting for repeated cooldowns',()=>{
 assert.equal(D.STORY.find(q=>q.id==='spring').deliver['sap-essence'],1);
});
test('Fresh-save completion covers all eighteen NPC quests and the combined world token',async()=>{
 const{runWorldOne}=await import('./world1-sim.mjs?v=39');const r=runWorldOne({completeNpcChains:true});assert.equal(D.STORY.filter(q=>r.state.characters[0].journey.story[q.id]?.done).length,18);assert.equal(r.state.npcTokens.length,6);assert.equal(r.state.worldCompletionCrafted,true);assert.ok(r.minutes<360);
});
