import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from './engine.mjs?v=33';
import * as D from './content.mjs?v=33';
import * as R from './reward-progression.mjs?v=33';
import * as UI from './ui-panels.mjs?v=33';
import {questRewards} from './dialogue-panels.mjs?v=33';
const reload=s=>E.restoreSave(JSON.parse(JSON.stringify(s)));
function ready(s,c,id){const q=D.STORY.find(q=>q.id===id);for(const before of q.requires)c.journey.story[before]={accepted:true,done:true};c.journey.story[id]={accepted:true,done:false,extrasVersion:1};Object.assign(c.journey.kills,q.kills);Object.assign(c.journey.events,q.actions);for(const room of q.visits||[])c.journey.visited[room]=true;if(q.minigame)c.minigames.best[q.minigame.skill]=q.minigame.score;for(const[k,n]of Object.entries(q.deliver||{}))s.inventory[k]=n;s.unlockedClasses=Object.keys(D.CLASSES);return q;}
test('Quest storage rewards grant actual usable personal and shared slots, once',()=>{
 const s=E.freshSave(),c=E.selected(s);ready(s,c,'seam-work');assert.ok(E.claimQuest(s,c,'seam-work','warrior'));assert.ok(E.useExpansion(s,c,'seam-bag'));assert.equal(E.bagCapacity(c),19);assert.equal(E.useExpansion(s,c,'seam-bag'),false);assert.equal(E.claimQuest(s,c,'seam-work','warrior'),false);
 ready(s,c,'stone-oath');assert.ok(E.claimQuest(s,c,'stone-oath','warrior'));assert.ok(E.useExpansion(s,c,'cavern-chest'));assert.equal(E.chestCapacity(s),30);assert.doesNotThrow(()=>reload(s));
});
test('Repeat characters earn their own bags, while account chest and stamps become previewed coins',()=>{
 const s=E.freshSave(),a=E.selected(s);ready(s,a,'stone-oath');assert.ok(E.claimQuest(s,a,'stone-oath','warrior'));assert.ok(E.createCharacter(s,'Second'));const b=E.selected(s),q=ready(s,b,'stone-oath'),plan=R.questRewardPlan(s,b,q);assert.equal(plan.replacementCoins,70);assert.deepEqual(plan.items,{});assert.match(questRewards(q,s,b),/170 coins/);assert.match(UI.journal(s,b,{quest:q.id}),/170 coins/);const coins=s.coins;assert.ok(E.claimQuest(s,b,q.id,q.giver));assert.equal(s.coins-coins,plan.coins);assert.equal(b.bag['cavern-chest']||0,0);
 for(const c of [a,b]){ready(s,c,'seam-work');assert.ok(E.claimQuest(s,c,'seam-work','warrior'));assert.equal(c.bag['seam-bag'],1);}
});
test('Already crafted personal pouches convert to coins without losing existing capacity',()=>{
 const s=E.freshSave(),c=E.selected(s),q=ready(s,c,'under-roots');E.give(c,'woven-mining-bag',1);E.useCapacityBag(c,'woven-mining-bag');const before=E.stackLimit(c,'copper'),plan=R.questRewardPlan(s,c,q);assert.equal(plan.replacementCoins,35);assert.ok(E.claimQuest(s,c,q.id,q.giver));assert.equal(E.stackLimit(c,'copper'),before);assert.equal(c.bag['woven-mining-bag'],0);
});
test('Old completed personal quests receive new rewards once, including overflow and sold rewards',()=>{
 const s=E.freshSave(),c=E.selected(s);s.unlockedClasses=['warrior'];E.createCharacter(s,'Other');const b=E.selected(s);for(const who of [c,b])who.journey.story['seam-work']={accepted:true,done:true};s.story['seam-work']={accepted:true,done:true};E.give(c,'oak',16*99);let loaded=reload(s),a=loaded.characters[0];assert.equal(a.overflow['seam-bag'],1);assert.equal(loaded.characters[1].bag['seam-bag'],1);assert.equal(a.overflow['stamp-orebag'],1);a.overflow['seam-bag']=0;a.overflow['stamp-orebag']=0;loaded=reload(loaded);assert.equal(loaded.characters[0].overflow['seam-bag'],0);assert.equal(loaded.characters[0].overflow['stamp-orebag'],0);
});
test('Existing banked, dropped, consumed and registered account upgrades are not duplicated by migration',()=>{
 for(const state of ['bank','ground','used','registered']){const s=E.freshSave(),c=E.selected(s);s.story['stone-oath']={accepted:true,done:true};c.journey.story['stone-oath']={accepted:true,done:true};if(state==='bank')s.inventory['cavern-chest']=1;if(state==='ground')c.groundLoot=[{itemId:'cavern-chest',count:1,x:10,y:644}];if(state==='used')s.usedChestExpansions=['cavern-chest'];if(state==='registered')s.stamps.sight={level:3,cap:5};const loaded=reload(s),who=E.selected(loaded);assert.equal(who.bag[state==='registered'?'stamp-sight':'cavern-chest']||0,0,state);assert.ok(loaded.upgradeRewardClaims.includes('cavern-chest'));}
});
test('Legacy stamp claims remain account-wide even after the original item was spent',()=>{
 const s=E.freshSave();s.story['first-roots']={accepted:true,done:true};s.stampRewardClaims=['first-roots'];const loaded=reload(s);assert.ok(loaded.upgradeRewardClaims.includes('stamp-pick'));assert.equal(E.selected(loaded).bag['stamp-pick']||0,0);
});
test('Category stamps change only their own stacks; accuracy and maker stamps affect working systems',()=>{
 const s=E.freshSave(),c=E.selected(s);s.stamps.orebag={level:5,cap:5};s.stamps.sight={level:5,cap:5};s.stamps.forge={level:5,cap:5};E.syncAccount(s);assert.equal(E.stackLimit(c,'copper'),111);assert.equal(E.stackLimit(c,'oak'),99);assert.ok(E.accuracy(c)>13);const base=structuredClone(s);base.stamps={};E.syncAccount(base);E.advanceProduction(s,200);E.advanceProduction(base,200);assert.ok(c.anvil.progress>base.characters[0].anvil.progress||Object.values(c.anvil.stored).reduce((a,b)=>a+b,0)>Object.values(base.characters[0].anvil.stored).reduce((a,b)=>a+b,0));
});
test('Every reward has a source and three uses; storage collection hides undiscovered quest names',()=>{
 const s=E.freshSave(),c=E.selected(s);for(const items of Object.values(D.QUEST_UPGRADES))for(const id of Object.keys(items))assert.ok(D.purposes(id).length>=3,id);assert.equal(R.upgradeSource(s,c,'seam-bag'),'Undiscovered quest');ready(s,c,'seam-work');assert.match(R.upgradeSource(s,c,'seam-bag'),/Read the Seams/);const html=UI.inventory(s,c,{tab:'capacity'});assert.match(html,/shared chest/);assert.match(html,/Undiscovered quest/);assert.doesNotMatch(html,/undefined|NaN/);
});
test('Enchanting and alchemy stamps improve actual profession actions',()=>{
 const s=E.freshSave(),c=E.selected(s);Object.assign(c,{area:'jungle-town',zone:0,position:{x:1700,y:644}});s.inventory.dust=100;s.inventory['bat-fang']=100;s.inventory['copper-bar']=100;E.createEquipment(s,'copper-sword',c);s.stamps.weave={level:5,cap:5};s.stamps.cauldron={level:5,cap:5};E.syncAccount(s);assert.ok(E.enchant(s,c,'weapon','force'));assert.equal(c.skills.enchanting,6.75);
 s.alchemy.assignments[c.id]='orange';const normal=structuredClone(s);normal.stamps={};E.syncAccount(normal);E.advanceAlchemy(s,85);E.advanceAlchemy(normal,85);assert.equal(s.alchemy.cauldrons.orange.points,1);assert.equal(normal.alchemy.cauldrons.orange.points,0);
});
test('Forged, duplicate and wrong-scope reward histories reject save imports',()=>{
 for(const mutate of [s=>s.upgradeRewardClaims=['fake'],s=>s.upgradeRewardClaims=['seam-bag'],s=>s.characters[0].upgradeRewardClaims=['stamp-sight'],s=>s.upgradeRewardClaims=['stamp-sight','stamp-sight']]){const s=E.freshSave();mutate(s);assert.throws(()=>reload(s));}
});
