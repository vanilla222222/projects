import {seedKill,seedStory} from './test-fixtures.mjs?v=27';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from './engine.mjs?v=27';
import * as D from './content.mjs?v=27';
import {World,createMap,GROUND,abilitySet} from './world.mjs?v=27';
function rich(s){s.coins=10000;for(const id of Object.keys(D.ITEMS))s.inventory[id]=1000;for(const id of ['ironworking','gilding','brewing','verdant-steel','sunwell','heartwood'])E.unlock(s,id);}
function tick(w,n,input={}){for(let i=0;i<n*50;i++)w.step(.02,typeof input==='function'?input(i):input);}
test('Every town zone has an actual universal storage chest',()=>{for(const a of D.AREAS.filter(a=>['town','jungle-town'].includes(a.id)))for(let i=0;i<a.zones.length;i++){const map=createMap(a.id,i);assert.equal(map.storage.length,1);assert.equal(map.storage[0].kind,'storage');assert.ok(map.entities.includes(map.storage[0]));}});
test('Character loot stays personal until deposited, and both towns access the same chest',()=>{
 const s=E.freshSave(),first=E.selected(s);s.unlockedClasses=['warrior'];E.give(first,'copper',40);E.createCharacter(s,'Other');const other=E.selected(s);assert.equal(E.amount(s,'copper',other),0);assert.equal(s.inventory.copper,undefined);assert.equal(E.deposit(s,first,'copper'),0);E.travel(s,first,'town',0);assert.equal(E.deposit(s,first,'copper'),40);assert.equal(first.bag.copper,0);assert.equal(E.amount(s,'copper',other),40);seedKill(s,'jungle-3',12);E.travel(s,other,'jungle-town',1);other.position={x:160,y:644};assert.equal(E.withdraw(s,other,'copper',15),15);assert.equal(other.bag.copper,15);assert.equal(s.inventory.copper,25);
});
test('Backpack and chest slot limits account for stacks and never lose overflow',()=>{
 const s=E.freshSave(),c=E.selected(s);E.give(c,'oak',E.bagCapacity(c)*E.BAG_STACK+25);assert.equal(E.bagUsed(c),16);assert.equal(c.overflow.oak,25);assert.equal(E.reclaim(c),0);E.travel(s,c,'town',0);assert.equal(E.depositAll(s,c),1584);assert.equal(E.reclaim(c),25);assert.equal(c.bag.oak,25);assert.equal(c.overflow.oak,0);
 s.inventory={oak:E.chestCapacity(s)*E.CHEST_STACK};assert.equal(E.deposit(s,c,'oak'),0);assert.equal(c.bag.oak,25);assert.equal(E.withdraw(s,c,'oak',99),99);assert.equal(s.inventory.oak,24*999-99);
});
test('Each backpack expansion is consumed once per character; chest expansion once per account',()=>{
 const s=E.freshSave(),a=E.selected(s);E.give(a,'woven-pouch',2);assert.equal(E.bagCapacity(a),16);assert.ok(E.useExpansion(s,a,'woven-pouch'));assert.equal(E.bagCapacity(a),20);assert.equal(a.bag['woven-pouch'],1);assert.equal(E.useExpansion(s,a,'woven-pouch'),false);assert.equal(a.bag['woven-pouch'],1);
 s.unlockedClasses=['warrior'];E.createCharacter(s,'B');const b=E.selected(s);E.travel(s,a,'town',0);E.deposit(s,a,'woven-pouch');E.travel(s,b,'town',0);E.withdraw(s,b,'woven-pouch');assert.ok(E.useExpansion(s,b,'woven-pouch'));assert.equal(E.bagCapacity(b),20);E.give(a,'wooden-crate',1);E.give(b,'wooden-crate',1);assert.ok(E.useExpansion(s,a,'wooden-crate'));assert.equal(E.chestCapacity(s),32);assert.equal(E.useExpansion(s,b,'wooden-crate'),false);assert.equal(b.bag['wooden-crate'],1);
 const saved=E.restoreSave(JSON.parse(JSON.stringify(s)));assert.equal(E.useExpansion(saved,saved.characters[1],'wooden-crate'),false);assert.equal(E.bagCapacity(saved.characters[0]),20);
});
test('Equipment occupies a backpack/chest slot and can only cross characters through storage',()=>{
 const s=E.freshSave(),a=E.selected(s),piece=E.createEquipment(s,'copper-sword');assert.equal(a.packGear.length,1);assert.equal(E.bagUsed(a),1);s.unlockedClasses=['warrior'];E.createCharacter(s,'B');const b=E.selected(s);assert.equal(E.equip(s,b,piece.uid),false);E.travel(s,a,'town',1);a.position={x:160,y:644};assert.ok(E.depositGear(s,a,piece.uid));assert.equal(E.chestUsed(s),1);E.travel(s,b,'town',0);assert.ok(E.withdrawGear(s,b,piece.uid));assert.ok(E.equip(s,b,piece.uid));assert.equal(b.loadout.weapon.uid,piece.uid);assert.equal(b.packGear.length,0);assert.equal(E.chestUsed(s),0);
});
test('Full backpacks cannot delete equipped items during unequip or crafting',()=>{
 const s=E.freshSave(),c=E.selected(s);rich(s);E.createEquipment(s,'copper-mail',c);E.give(c,'oak',16*99);assert.equal(E.unequip(s,c,'body'),false);assert.ok(c.loadout.body);E.travel(s,c,'town',1);c.position={x:1390,y:644};const before=s.inventory['copper-bar'];assert.equal(E.craft(s,c,'armor'),false);assert.equal(s.inventory['copper-bar'],before);
});
test('Foundry inputs reserve once, output goes to its owner and cancellation refunds only unfinished batches',()=>{
 const s=E.freshSave(),c=E.selected(s);rich(s);c.class='blacksmith';E.travel(s,c,'town',2);c.position={x:1520,y:644};const copper=s.inventory.copper,coal=s.inventory.charcoal,coins=s.coins;assert.ok(E.enqueue(s,c,'copper-bar',3));assert.equal(s.inventory.copper,copper-9);assert.equal(s.inventory.charcoal,coal-3);assert.equal(s.coins,coins-6);E.advanceProduction(s,8);assert.equal(c.bag['copper-bar'],2);assert.equal(s.jobs[0].remaining,2);const id=s.jobs[0].id;assert.ok(E.cancelJob(s,id));assert.equal(c.bag.copper,6);assert.equal(c.bag.charcoal,2);assert.equal(s.coins,coins-2);assert.equal(E.cancelJob(s,id),false);assert.equal(c.bag['copper-bar'],2);
});
test('Queued production survives saves and completes offline exactly once',()=>{
 const s=E.freshSave(1000),c=E.selected(s);rich(s);E.travel(s,c,'town',2);c.position={x:1520,y:644};assert.ok(E.enqueue(s,c,'charcoal',5));const saved=E.restoreSave(JSON.parse(JSON.stringify(s)));E.claimOffline(saved,31000,()=>.5);assert.equal(saved.characters[0].bag.charcoal,10);assert.equal(saved.jobs.length,0);assert.equal(E.claimOffline(saved,31000,()=>.5).items,0);
});
test('Recipe unlocks prevent late-world crafting from skipping the story',()=>{
 const s=E.freshSave(),c=E.selected(s);s.coins=999;s.inventory.iron=20;s.inventory.charcoal=20;s.inventory['copper-bar']=20;E.travel(s,c,'town',2);c.position={x:1520,y:644};assert.equal(E.enqueue(s,c,'iron-bar'),false);E.unlock(s,'ironworking');assert.ok(E.enqueue(s,c,'iron-bar'));
});
test('Enchantments are deterministic, have two slots, replace transactionally and survive item transfers',()=>{
 const s=E.freshSave(),c=E.selected(s);rich(s);Object.assign(c,{area:'jungle-town',zone:0,position:{x:1700,y:644}});const piece=E.createEquipment(s,'copper-sword',c);const before=E.power(s,c);assert.ok(E.enchant(s,c,'weapon','force',0));assert.ok(E.power(s,c)>before);assert.ok(E.enchant(s,c,'weapon','fortitude',1));const hp=E.maxHp(c);assert.ok(E.enchant(s,c,'weapon','insight',0,true));assert.equal(piece.runes.length,2);assert.equal(piece.runes[0],'insight');assert.equal(E.enchant(s,c,'weapon','force',2),false);assert.equal(E.maxHp(c),hp);E.unequip(s,c,'weapon');assert.deepEqual(c.packGear[0].runes,['insight','fortitude']);
});
test('Alchemy research has distinct account effects and bounded liquid generation',()=>{
 const s=E.freshSave(),c=E.selected(s);rich(s);seedKill(s,'jungle-3',12);E.travel(s,c,'jungle-town',1);c.position={x:1510,y:644};const before=E.gatherInterval(c,'copper');assert.ok(E.research(s,c,'ferrous'));assert.ok(E.gatherInterval(c,'copper')<before);assert.equal(s.alchemy.liquid,5);E.advanceProduction(s,100000);assert.equal(s.alchemy.liquid,E.liquidCap(s));const coins=s.coins;s.alchemy.liquid=0;assert.equal(E.research(s,c,'blood'),false);assert.equal(s.coins,coins);
});
test('Potions must be carried and expire within an offline claim rather than boosting its full duration',()=>{
 const s=E.freshSave(),c=E.selected(s);s.inventory['mining-tonic']=1;assert.equal(E.drink(s,c,'mining-tonic'),false);E.give(c,'mining-tonic',1);assert.ok(E.drink(s,c,'mining-tonic'));E.travel(s,c,'caves',0);E.start(s,c,'gather','copper');const reference=E.restoreSave(JSON.parse(JSON.stringify(s)));E.advance(reference,1200,()=>.5);E.advance(reference,600,()=>.5);E.advance(s,1800,()=>.5);const n=(c.bag.copper||0)+(c.overflow.copper||0),r=reference.characters[0];assert.equal(n,(r.bag.copper||0)+(r.overflow.copper||0));assert.equal(c.buffs.length,0);
});
test('Saved combat/profession builds validate point budgets and can only be changed in town',()=>{
 const s=E.freshSave(),c=E.selected(s);c.level=8;c.skills.mining=120;assert.ok(E.train(c,'precision'));assert.ok(E.train(c,'efficiency','profession'));assert.ok(E.saveBuild(c,0));assert.equal(E.resetBuild(c),false);E.travel(s,c,'town',0);E.give(c,'reset-potion',1);assert.ok(E.resetBuild(c));assert.equal(c.talents.precision,0);assert.ok(E.loadBuild(c,0));assert.equal(c.talents.precision,1);assert.equal(c.profTalents.efficiency,1);c.builds[1]={talents:{power:99},profTalents:{}};assert.equal(E.loadBuild(c,1),false);
});
test('Story quests enforce prerequisite chains, consume deliveries once and cannot unlock boss early',()=>{
 const s=E.freshSave(),c=E.selected(s);rich(s);assert.equal(E.acceptQuest(s,'seal'),false);assert.equal(s.storyFlags.bossPermit,false);assert.ok(E.acceptQuest(s,'first-roots'));assert.equal(E.claimQuest(s,c,'first-roots','steward'),false);seedKill(s,'forest-0',8);assert.ok(E.claimQuest(s,c,'first-roots','steward'));assert.equal(E.claimQuest(s,c,'first-roots','steward'),false);assert.ok(c.bag['woven-pouch']);assert.ok(E.acceptQuest(s,'tools'));assert.equal(E.questStatus(s,'tools').ready,false);E.travel(s,c,'town',2);c.position={x:1520,y:644};assert.ok(E.enqueue(s,c,'charcoal',1));E.advanceProduction(s,20);E.travel(s,c,'town',1);c.position={x:1390,y:644};assert.ok(E.craft(s,c,'blade'));const bars=s.inventory['copper-bar'];assert.equal(E.claimQuest(s,c,'tools','mage'),false);assert.equal(s.inventory['copper-bar'],bars);assert.ok(E.claimQuest(s,c,'tools','blacksmith'));assert.equal(s.inventory['copper-bar'],bars-4);
});
test('Secret passages and boss entrance obey their quest gates',()=>{
 const s=E.freshSave(),w=new World(s,{rng:()=>.5});seedKill(s,'jungle-3',12);w.travel('jungle-town',2);w.player.x=w.map.portals.find(p=>p.id==='portal-right').x-20;w.select('portal-right');tick(w,.2);assert.equal(w.map.boss,false);s.storyFlags.bossPermit=true;w.select('portal-right');tick(w,.2);assert.equal(w.map.boss,true);assert.equal(E.secretOpen(s,'sunwell'),false);s.secretUnlocks.push('sunwell');assert.ok(E.secretOpen(s,'sunwell'));
});
test('Secondary and utility abilities have level gates, independent cooldowns and safe saved buffs',()=>{
 const s=E.freshSave(),c=E.selected(s);c.class='warrior';const w=new World(s,{rng:()=>.5});w.player.x=650;assert.equal(w.useSkill(1),false);c.level=10;E.train(c,'secondary','class');E.train(c,'utility','class');c.hp=10;assert.ok(w.useSkill(1));assert.ok(w.player.cooldowns[1]>0);assert.ok(w.useSkill(2));assert.ok(c.hp>10);assert.equal(w.useSkill(2),false);assert.doesNotThrow(()=>E.restoreSave(JSON.parse(JSON.stringify(s))));assert.equal(abilitySet(c).length,3);
});
test('Enemy attacks telegraph first and jumping can dodge the impact',()=>{
 const s=E.freshSave(),w=new World(s,{rng:()=>.5}),c=w.c,e=w.map.monsters[0];w.player.x=e.x-50;c.activity='fight';w.target=e;e.attack=0;w.player.attack=100;const hp=c.hp;w.step(.02);assert.ok(e.telegraph);assert.equal(c.hp,hp);w.player.y=GROUND-100;w.player.grounded=false;w.player.vy=0;for(let i=0;i<55;i++){w.player.y=GROUND-100;w.player.vy=0;w.step(.02);}assert.equal(c.hp,hp);
});
test('World One migration retains old chest contents, equipment tiers and study levels',()=>{
 const s=E.freshSave(),c=E.selected(s);c.gear.weapon=2;c.gear.armor=1;s.inventory.oak=50000;s.archive['moss-slime']=3;delete c.loadout;delete c.bag;delete c.packGear;delete c.usedExpansions;delete s.progressionVersion;const loaded=E.restoreSave(JSON.parse(JSON.stringify(s)));assert.equal(loaded.inventory.oak,50000);assert.equal(loaded.archive['moss-slime'],3);assert.equal(loaded.characters[0].loadout.weapon.base,'iron-sword');assert.equal(loaded.characters[0].loadout.body.base,'copper-mail');assert.deepEqual(loaded.characters[0].bag,{});assert.equal(E.chestUsed(loaded)>E.chestCapacity(loaded),true);
});
test('World One completes through actual common-material actions with five classes, banking, queues and an active boss',async()=>{
 const {runWorldOne}=await import('./world1-sim.mjs');const result=runWorldOne();assert.equal(result.storyComplete,true);assert.equal(result.characters.length,5);assert.ok(result.events.some(e=>e.event==='seal'));assert.ok(result.state.story.heart.done);assert.equal(result.chestCapacity,60);assert.ok(result.minutes>20&&result.minutes<180);assert.equal(result.state.characters[0].loadout.weapon.runes.length,2);
});
test('Blacksmiths make one account chest expansion, while backpack expansions can be shared',()=>{
 const s=E.freshSave(),c=E.selected(s);rich(s);c.class='blacksmith';E.travel(s,c,'town',1);c.position={x:1390,y:644};assert.ok(E.craft(s,c,'wooden-crate'));assert.equal(c.bag['wooden-crate'],1);assert.ok(E.useExpansion(s,c,'wooden-crate'));assert.equal(E.craft(s,c,'wooden-crate'),false);assert.ok(E.craft(s,c,'woven-pouch'));assert.equal(c.bag['woven-pouch'],2);
});
