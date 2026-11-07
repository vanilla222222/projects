import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from './engine.mjs?v=45';
import * as D from './content.mjs?v=45';
import {COMPLETION_ITEMS,WORLD_GIVERS,SIDE_NPCS,STAR_BOOKS,PRODUCTION_REWARDS,EXTRA_STAMPS,EXTRA_STATUES} from './world-rewards.mjs';
import {World,createMap} from './world.mjs?v=49';

test('Boss victories open the next world independently of optional quest and gear completion',()=>{
 const s=E.freshSave(),c=E.selected(s);
 assert.equal(E.zoneUnlocked(s,'tide-town',0,c),false);
 E.grantKills(s,c,D.ENEMIES.boss,1,()=>.99);
 assert.equal(E.zoneUnlocked(s,'tide-town',0,c),true);
 assert.equal(E.zoneUnlocked(s,'orbit-dock',0,c),false);
 assert.equal(E.encounterReason(s,c,'tempest'),'');
 E.grantKills(s,c,D.ENEMIES.tempest,1,()=>.99);
 assert.equal(E.zoneUnlocked(s,'orbit-dock',0,c),true);
 assert.deepEqual(s.npcTokens,[]);
});

test('Every world has eight token givers, an independent completion recipe and a permanent XP reward',()=>{
 let s=E.freshSave(),c=E.selected(s);
 s.coins=50000;s.bossDefeated=true;s.bossHunt.kills.tempest=1;
 Object.assign(c,{area:'town',zone:1,position:{x:1390,y:644}});
 for(const [world,givers] of Object.entries(WORLD_GIVERS)){
  assert.equal(givers.length,8);
  for(const giver of givers){
   const quests=D.STORY.filter(q=>q.giver===giver);
   assert.ok(quests.length&&quests.every(q=>(q.world||1)===Number(world)));
   for(const q of quests)c.journey.story[q.id]={accepted:true,done:true};
   if(SIDE_NPCS[giver]){
    const d=SIDE_NPCS[giver];
    assert.ok(createMap(d.area,d.zone).npcs.some(n=>n.role===giver));
   }
  }
  assert.equal(E.awardNpcTokens(s,c),8);
  assert.equal(E.awardNpcTokens(s,c),0);
  const id=COMPLETION_ITEMS[world],recipe=D.RECIPES.find(r=>r.id===id);
  assert.equal(E.recipePage(recipe),Number(world));
  assert.equal(Object.keys(recipe.cost).length,8);
  assert.ok(E.craft(s,c,id));
  assert.ok(E.useWorldReward(s,c,id));
  assert.equal(E.useWorldReward(s,c,id),false);
  assert.equal(E.craft(s,c,id),false);
 }
 s=E.restoreSave(JSON.parse(JSON.stringify(s)));c=E.selected(s);
 assert.deepEqual(s.worldXpBlessings,[1,2,3]);
 const before=c.lifetimeXp;
 E.gainXp(c,100);
 assert.equal(c.lifetimeXp-before,130);
 s.unlockedClasses=['warrior'];
 assert.ok(E.createCharacter(s,'Newcomer'));
 assert.ok(Math.abs(E.selected(s).accountBonuses.worldXP-.3)<1e-9);
});

test('Each world has a level-gated product and a consumable enemy blueprint',()=>{
 const s=E.freshSave(),c=E.selected(s);
 Object.assign(c,{area:'town',zone:1,position:{x:1390,y:644}});
 s.bossDefeated=true;s.bossHunt.kills.tempest=1;
 for(const [id,,world,level,,,] of PRODUCTION_REWARDS){
  const r=D.RECIPES.find(r=>r.id==='gear-'+id+'-band');
  assert.equal(E.recipePage(r),world);
  assert.equal(E.recipeOpen(s,r),false);
  E.give(c,r.dropBlueprint,1);
  assert.ok(E.useWorldReward(s,c,r.dropBlueprint));
  assert.ok(E.recipeOpen(s,r));
  c.skills.smithing=(level-2)**2*12;
  assert.equal(E.chooseProduct(c,id,s),false);
  c.skills.smithing=(level-1)**2*12;
  assert.ok(E.chooseProduct(c,id,s));
 }
 for(const [id,d] of Object.entries(STAR_BOOKS)){
  const book='star-book-'+id;
  if(d.enemy)assert.ok(D.ENEMIES[d.enemy].loot.some(drop=>drop.id===book));
  else assert.equal(D.STORY.find(q=>q.id===d.quest).reward.items[book],1);
  E.give(c,book,1);
  assert.ok(E.learnBook(s,id));
  assert.equal(E.learnBook(s,id),false);
 }
});

test('Museum displays and retrieves the same equipment instance and preserves credit on reload',()=>{
 let s=E.freshSave(),c=E.selected(s);
 const gear=E.createEquipment(s,'copper-sword',null,c);
 E.give(c,'oak',2);
 assert.equal(E.exhibitItem(s,c,'oak'),false);
 Object.assign(c,{area:'town',zone:3,position:{x:2920,y:644}});
 assert.ok(E.exhibitItem(s,c,'oak'));
 assert.ok(E.exhibitItem(s,c,'copper-sword'));
 assert.equal(E.exhibitItem(s,c,'oak'),false);
 assert.equal(c.bag.oak,1);
 s=E.restoreSave(JSON.parse(JSON.stringify(s)));c=E.selected(s);
 assert.ok(E.retrieveExhibit(s,c,'oak'));
 assert.ok(E.retrieveExhibit(s,c,'copper-sword'));
 assert.equal(c.bag.oak,2);
 assert.equal(s.museum['copper-sword'].stored,false);
 assert.equal(c.packGear[0].uid,gear.uid);
 assert.equal(c.packGear[0].museumBound,true);
 const slot=E.bagSlots(c).findIndex(t=>t?.uid===gear.uid);
 assert.equal(E.spareQuantity(s,c,slot),0);
 assert.equal(new World(s).dropInventory(slot),false);
 assert.equal(E.canPay(s,{'copper-sword':1},c),false);
 Object.assign(c,{area:'town',zone:0,position:{x:680,y:644}});
 assert.equal(E.sellSlot(s,c,slot),0);
 assert.doesNotThrow(()=>E.restoreSave(JSON.parse(JSON.stringify(s))));
});

test('World Two and Three metal tiers have weapons, armor and native tool upgrades',()=>{
 for(const [world,metals] of [[2,['cobalt','obsidian']],[3,['meteor','void']]])for(const metal of metals){
  for(const suffix of ['sword','mail','axe','tracking-kit']){
   const r=D.RECIPES.find(r=>r.equipment===metal+'-'+suffix);
   assert.equal(E.recipePage(r),world);
  }
 }
 for(const [id,world] of [['tide-net-2',2],['obsidian-net',2],['meteor-net',3],['void-net',3],['meteor-survey-kit',3],['void-survey-kit',3]]){
  assert.equal(E.recipePage(D.RECIPES.find(r=>r.equipment===id)),world);
 }
});


test('New stamps and statues have playable sources and grant their advertised bonuses',()=>{
 const s=E.freshSave(),c=E.selected(s);
 for(const [id,,,effect,amount,material,enemy,quest] of EXTRA_STAMPS){
  const item='stamp-'+id;
  assert.ok(D.ITEMS[material]);
  assert.ok(enemy?D.ENEMIES[enemy].loot.some(drop=>drop.id===item):D.STORY.find(q=>q.id===quest).reward.items[item]);
  Object.assign(c,{area:'town',zone:3,position:{x:650,y:644}});
  E.give(c,item,1);
  const before=E.stampBonuses(s)[effect]||0;
  assert.ok(E.registerStamp(s,c,id));
  assert.ok(Math.abs(E.stampBonuses(s)[effect]-before-amount)<1e-9);
 }
 for(const [id,,effect,amount,enemy,quest] of EXTRA_STATUES){
  const item='statue-'+id;
  assert.ok(D.ENEMIES[enemy].loot.some(drop=>drop.id===item));
  if(quest)assert.equal(D.STORY.find(q=>q.id===quest).reward.items[item],5);
  c.statuesUnlocked=true;c.position={x:1330,y:644};
  E.give(c,item,5);
  const before=E.personalBonuses(c)[effect]||0;
  assert.equal(E.depositStatues(s,c,id),5);
  assert.ok(Math.abs(E.personalBonuses(c)[effect]-before-amount)<1e-9);
 }
 assert.doesNotThrow(()=>E.restoreSave(JSON.parse(JSON.stringify(s))));
});
