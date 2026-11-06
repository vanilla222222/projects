import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from './engine.mjs?v=39';
import * as D from './content.mjs?v=39';
import * as UI from './ui-panels.mjs?v=39';
import * as Parity from './parity-panels.mjs?v=39';
import * as R from './roster.mjs?v=39';
import {roomPreparation,bossCraftProgress} from './route-preparation.mjs?v=39';
const setup=()=>{const s=E.freshSave(1000);return{s,c:E.selected(s)};};
function lateBuild(s,c,calling){c.class=calling;c.level=20;E.investAttribute(c,E.CLASS_DESIGNS[calling].accuracy,20);E.investAttribute(c,E.CLASS_DESIGNS[calling].primary,18);for(const t of ['precision','power','vitality','haste'])for(let i=0;i<8;i++)E.train(c,t);for(const id of [D.VERDANT_WEAPONS[calling],'tempered-mail','iron-helm','birch-boots'])E.createEquipment(s,id,c);E.syncAccount(s);c.hp=E.maxHp(c);}
test('All five callings can sustain the last cavern with a common-material World One build',()=>{
 for(const calling of Object.keys(D.CLASSES)){const{s,c}=setup();lateBuild(s,c,calling);Object.assign(c,{area:'deep',zone:3,activity:'fight'});const before=JSON.stringify(s),f=E.assignmentForecast(s,c,600);assert.ok(f.kills>=15,calling);assert.equal(f.retreatSeconds,null,calling);assert.equal(JSON.stringify(s),before);assert.doesNotThrow(()=>E.restoreSave(JSON.parse(JSON.stringify(s))));}
});
test('Every late class weapon is craftable before the boss using guaranteed resources',()=>{
 for(const[calling,id]of Object.entries(D.VERDANT_WEAPONS)){const{s,c}=setup(),r=D.RECIPES.find(r=>r.equipment===id);c.class=calling;Object.assign(c,{area:'town',zone:1,position:{x:1390,y:644}});assert.equal(E.recipeOpen(s,r),false);s.workshop.pages=3;E.unlock(s,'verdant-steel');assert.ok(E.recipeOpen(s,r));s.coins=50;
  for(const[k,n]of Object.entries(r.cost)){assert.equal(D.ITEMS[k].rarity,'common',id+'/'+k);s.inventory[k]=n;}
  const old=D.EQUIPMENT[calling==='warrior'?'iron-sword':{mage:'oak-staff',blacksmith:'forge-hammer',enchanter:'rune-focus',alchemist:'catalyst-flask'}[calling]].stats.attack;
  assert.ok(E.craft(s,c,r.id),id);assert.equal(c.loadout.weapon.base,id);assert.ok(E.equipmentStats(c.loadout.weapon).attack>old);assert.ok(D.purposes(id).length>=3);assert.equal(s.bossDefeated,false);assert.doesNotThrow(()=>E.restoreSave(JSON.parse(JSON.stringify(s))));
 }
});
test('Boss armor is a real defensive upgrade over pre-boss iron and verdant steel',()=>{
 for(const[before,after]of [['iron-helm','rootbound-helm'],['tempered-mail','rootbound-mail']]){const{s,c}=setup();E.createEquipment(s,before,c);const hp=E.maxHp(c),defense=E.defense(s,c);E.createEquipment(s,after,c);assert.ok(E.maxHp(c)>hp);assert.ok(E.defense(s,c)>defense);assert.ok(E.accuracy(c)>13);}
});
test('Room preparation warns about an unsafe assignment without mutating work or revealing a route',()=>{
 const{s,c}=setup();E.start(s,c,'gather','oak');const before=JSON.stringify(s),p=roomPreparation(s,c,'deep',3);assert.ok(p.incoming>p.hp);assert.ok(p.accuracyGap>0);assert.match(p.warnings.join(' '),/earlier room/);assert.equal(p.upgrades[0].open,false);assert.match(p.upgrades[0].hint,/Expansion|Under the Roots/);assert.equal(JSON.stringify(s),before);assert.equal(roomPreparation(s,c,'town',0),null);const html=UI.map(s,c,{mapRoom:'deep:3'});assert.match(html,/Combat preparation/);assert.match(html,/ROUTE LOCKED/);assert.match(html,/damage taken per kill/);assert.doesNotMatch(html,/undefined|NaN/);
});
test('Accuracy investment and armor improve the actual room estimate for every class',()=>{
 for(const calling of Object.keys(D.CLASSES)){const{s,c}=setup();c.class=calling;c.level=12;const before=roomPreparation(s,c,'jungle',2);E.investAttribute(c,E.CLASS_DESIGNS[calling].accuracy,15);E.createEquipment(s,'tempered-mail',c);const after=roomPreparation(s,c,'jungle',2);assert.ok(after.accuracyGap<before.accuracyGap,calling);assert.ok(after.incoming<before.incoming,calling);}
});
test('Early food is rewarded once and advice names a reachable shop before alchemy unlocks',()=>{
 const{s,c}=setup();E.travel(s,c,'town',0);assert.ok(E.acceptQuest(s,'first-roots'));E.grantKills(s,c,D.ENEMIES['forest-0'],8,()=>.5);assert.ok(E.claimQuest(s,c,'first-roots','steward'));assert.equal(c.bag.bread,6);assert.equal(E.claimQuest(s,c,'first-roots','steward'),false);const loaded=E.restoreSave(JSON.parse(JSON.stringify(s)));assert.equal(E.selected(loaded).bag.bread,6);
 c.bag={};c.class='mage';c.level=8;c.area='forest';c.zone=3;c.activity='fight';for(let i=0;i<3;i++)E.train(c,'precision');E.createEquipment(s,'copper-sword',c);const goal=R.nextGoal(s,c);assert.match(goal.detail,/Hearthstead shop, 4 coins/);assert.equal(goal.value,'food');
});
test('Hunt reward targets count missing scales and preserve difficulty and recipe gates',()=>{
 const{s,c}=setup();s.workshop.pages=3;let p=bossCraftProgress(s,c,0);assert.equal(p.clears,2);assert.equal(p.unlocked,false);E.give(c,'rootwarden-scale',3);p=bossCraftProgress(s,c,0);assert.equal(p.clears,1);assert.equal(p.unlocked,false);s.bossHunt.tiers[0]=1;assert.ok(bossCraftProgress(s,c,0).unlocked);assert.equal(bossCraftProgress(s,c,1).unlocked,false);E.give(c,'rootwarden-scale',1);assert.equal(bossCraftProgress(s,c,0).clears,0);const html=Parity.hunts(s,c);assert.match(html,/VIEW ARMOR RECIPE/);assert.match(html,/Scale cost met/);assert.match(html,/110 health/);assert.doesNotMatch(html,/undefined|NaN/);
});
test('Fresh saves complete with three randomized loot streams and real spare-item reclamation',async()=>{
 const{runWorldOne}=await import('./world1-sim.mjs');for(const initial of [3187,713503,90210]){let seed=initial;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};const r=runWorldOne({rng});assert.ok(r.storyComplete,'seed '+initial);assert.equal(r.characters.length,5);assert.ok(r.state.economy.salvage>0);for(const c of r.state.characters)assert.equal(c.loadout.weapon.base,D.VERDANT_WEAPONS[c.class]);assert.doesNotThrow(()=>E.restoreSave(JSON.parse(JSON.stringify(r.state))));}
});
for(const starter of ['mage','blacksmith'])test('World One completes when the first adventurer chooses '+starter,async()=>{
 const{runWorldOne}=await import('./world1-sim.mjs');const r=runWorldOne({starter});assert.ok(r.storyComplete);assert.equal(r.characters[0].class,starter);assert.equal(new Set(r.characters.map(c=>c.class)).size,5);assert.equal(r.state.characters[0].loadout.weapon.base,D.VERDANT_WEAPONS[starter]);assert.ok(r.minutes<360);assert.doesNotThrow(()=>E.restoreSave(JSON.parse(JSON.stringify(r.state))));
});
