import {seedKill,seedStory} from './test-fixtures.mjs?v=34';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from './engine.mjs';
import {AREAS,CLASSES,ENEMIES,ITEMS,RECIPES,OFFERINGS,WORLD_LOOT,GLOBAL_LOOT,purposes} from './content.mjs';
function rng(seed=123456){return()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};}
function rich(s){s.coins=10000;for(const id of Object.keys(ITEMS))s.inventory[id]=1000;}
function train(s,c,id){c.level=3;c.skills[CLASSES[id].skill]=12;c.area=CLASSES[id].town;c.zone=CLASSES[id].zone;for(let i=0;i<3;i++)assert.equal(E.progressClass(s,c,id),true);}
test('World 1 preserves the six-area plan plus the three-zone Elder Tree and every item has an implemented purpose',()=>{
 assert.equal(AREAS.length,7);assert.equal(AREAS.reduce((n,a)=>n+a.zones.length,0),26);assert.equal(Object.keys(ENEMIES).filter(id=>/^(forest|caves|jungle|deep)-/.test(id)).length,16);
 assert.equal(WORLD_LOOT.length,5);assert.equal(WORLD_LOOT.filter(d=>ITEMS[d.id].rarity==='rare').length,3);assert.equal(GLOBAL_LOOT.length,5);
 for(const id of Object.keys(ITEMS))assert.ok(purposes(id).length>=1,id);
 for(const e of Object.values(ENEMIES).filter(e=>/^(forest|caves|jungle|deep)-/.test(e.id))){assert.equal(e.loot.length,3);assert.ok(e.loot[0].chance>=.5&&e.loot[0].chance<=1);assert.ok(e.loot[1].chance>=.02&&e.loot[1].chance<=.1);assert.ok(e.loot[2].chance>=.0000001&&e.loot[2].chance<=.001);}
});
test('Class quests enforce individual steps, trainer location, materials and first-unlock slots',()=>{
 const s=E.freshSave(),c=E.selected(s);assert.equal(E.slots(s),1);assert.equal(E.createCharacter(s,'Second'),false);assert.equal(E.progressClass(s,c,'warrior'),false);
 c.level=3;assert.equal(E.progressClass(s,c,'warrior'),false);E.travel(s,c,'caves',0);assert.equal(E.progressClass(s,c,'warrior'),true);assert.equal(E.progressClass(s,c,'warrior'),false);
 c.skills.mining=12;assert.equal(E.progressClass(s,c,'warrior'),true);assert.equal(E.progressClass(s,c,'warrior'),false);
 s.inventory.copper=20;s.inventory['moss-slime']=10;assert.equal(E.progressClass(s,c,'warrior'),true);assert.equal(c.class,'warrior');assert.equal(s.inventory.copper,0);assert.equal(E.slots(s),2);
 assert.equal(E.progressClass(s,c,'mage'),false);assert.equal(E.createCharacter(s,'Second'),true);assert.equal(E.availableClass(s,'warrior'),false);
});
test('All five classes unlock duplicates and exactly six initial slots',()=>{
 const s=E.freshSave();rich(s);for(const [i,id]of Object.keys(CLASSES).entries()){if(i)assert.ok(E.createCharacter(s,id));train(s,E.selected(s),id);}
 assert.equal(s.unlockedClasses.length,5);assert.equal(E.slots(s),6);assert.equal(E.availableClass(s,'warrior'),true);assert.ok(E.createCharacter(s,'Another warrior'));train(s,E.selected(s),'warrior');assert.equal(E.slots(s),6);assert.equal(E.createCharacter(s,'Seventh'),false);
});
test('Zone and area progression require the intended kills and stop invalid travel',()=>{
 const s=E.freshSave(),c=E.selected(s);assert.equal(E.travel(s,c,'forest',1),false);seedKill(s,'forest-0',12);assert.ok(E.travel(s,c,'forest',1));assert.equal(E.travel(s,c,'forest',-1),false);assert.equal(E.travel(s,c,'forest',99),false);assert.equal(E.travel(s,c,'missing',0),false);
 assert.equal(E.areaUnlocked(s,'jungle'),false);seedKill(s,'forest-4',12);assert.ok(E.areaUnlocked(s,'jungle'));seedKill(s,'jungle-3',12);assert.ok(E.areaUnlocked(s,'jungle-town'));seedKill(s,'caves-2',12);assert.ok(E.areaUnlocked(s,'deep'));
});
test('Multiple characters produce independently while selection changes',()=>{
 const s=E.freshSave(),one=E.selected(s);s.unlockedClasses=['warrior'];E.createCharacter(s,'Two');const two=E.selected(s);E.start(s,one,'gather','oak');E.travel(s,two,'caves',0);E.start(s,two,'gather','copper');E.advance(s,60,rng());assert.equal(one.bag.oak,30);assert.equal(two.bag.copper,30);assert.equal(one.skills.logging,40);assert.equal(two.skills.mining,40);
 assert.equal(E.start(s,two,'gather','gold'),false);assert.equal(E.start(s,one,'boss'),false);
});
test('Crafting enforces station, costs and equipment ownership; specialists double output',()=>{
 const s=E.freshSave(),c=E.selected(s);rich(s);assert.equal(E.craft(s,c,'copper-bar'),false);E.travel(s,c,'town',2);c.position={x:1520,y:644};c.class='blacksmith';const before=c.bag['copper-bar']||0;assert.ok(E.craft(s,c,'copper-bar'));assert.equal(c.bag['copper-bar']||0,before);E.advanceProduction(s,8);assert.equal(c.bag['copper-bar'],before+2);assert.equal(s.inventory.copper,997);assert.equal(s.coins,9998);
 E.travel(s,c,'town',1);c.position={x:1390,y:644};assert.ok(E.craft(s,c,'blade'));assert.equal(c.gear.weapon,1);assert.equal(E.craft(s,c,'blade'),true);assert.equal(c.packGear.length,1);assert.equal(E.craft(s,c,'not-a-recipe'),false);s.inventory['jungle-wood']=0;assert.equal(E.craft(s,c,'gold-blade'),false);
});
test('Material studies consume resources and improve a specific account discipline',()=>{
 const s=E.freshSave(),c=E.selected(s),before=E.maxHp(c);s.inventory['moss-slime']=10;assert.ok(E.offer(s,'moss-slime'));assert.equal(s.inventory['moss-slime'],0);assert.equal(s.archive['moss-slime'],1);assert.equal(E.offer(s,'moss-slime'),false);assert.equal(E.offer(s,'oak'),false);
 for(let i=0;i<20;i++){s.inventory['moss-slime']=1000;E.offer(s,'moss-slime');}assert.ok(E.maxHp(c)>before);
});
test('Combat awards layered loot, XP, coins and progress without allowing impossible bosses',()=>{
 const s=E.freshSave(),c=E.selected(s);E.start(s,c,'fight');E.advance(s,300,rng());assert.ok(c.kills>0);assert.ok(c.level>=3);assert.ok(s.coins>0);assert.ok(c.bag['moss-slime']>0);assert.ok(c.hp>=0);
 seedKill(s,'jungle-3',12);s.storyFlags.bossPermit=true;E.travel(s,c,'jungle-town',2);E.start(s,c,'boss');const before=c.kills;E.advance(s,1000,rng());assert.equal(c.kills,before);assert.equal(s.bossDefeated,false);assert.equal(c.activity,'rest');
 c.level=50;c.gear.weapon=3;c.gear.armor=3;c.gear.rune=100;c.hp=E.maxHp(c);E.start(s,c,'boss');E.advance(s,1000,rng());assert.equal(s.bossDefeated,false);assert.equal(c.bag['boss-heart'],undefined);assert.equal(c.activity,'rest');
});
test('Offline claims use elapsed time, cap at 8h, and cannot be claimed twice',()=>{
 const s=E.freshSave(1000),c=E.selected(s);E.start(s,c,'gather','oak');const claim=E.claimOffline(s,1000+10*3600*1000,rng());assert.equal(claim.seconds,E.OFFLINE_CAP);assert.equal(claim.capped,true);assert.ok(claim.items>0);const n=c.bag.oak;assert.equal(E.claimOffline(s,s.savedAt,rng()).items,0);assert.equal(c.bag.oak,n);assert.equal(E.claimOffline(s,s.savedAt-100,rng()).seconds,0);
});
test('Save round trips preserve roster tasks, equipment and shared progress',()=>{
 const s=E.freshSave();rich(s);train(s,E.selected(s),'warrior');E.createCharacter(s,'<script>');E.start(s,E.selected(s),'gather','oak');const result=E.restoreSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(result.characters,s.characters);assert.deepEqual(result.unlockedClasses,['warrior']);assert.equal(E.selected(result).name,'<script>');
});
test('Malformed saves fail before replacing the existing account',()=>{
 for(const mutate of [s=>s.version=999,s=>s.characters=[],s=>s.coins=-1,s=>s.characters[0].skills=null,s=>s.characters[0].gear=null,s=>s.characters[0].area='oops',s=>s.characters[0].zone=999,s=>s.characters[0].activity='exploit',s=>s.characters[0].class='oops',s=>s.characters[0].name={},s=>s.characters[0].progress=Infinity,s=>s.characters[0].activity='boss',s=>s.unlockedClasses=['warrior','warrior']]){const s=E.freshSave();mutate(s);assert.throws(()=>E.restoreSave(s));}
});
test('Rare drop sampler is statistically plausible and retains guaranteed drops',()=>{
 const random=rng(789),n=100000,count=E.successes(n,.05,random);assert.ok(count>4600&&count<5400,count);assert.equal(E.successes(20,1),20);assert.equal(E.successes(20,0),0);assert.equal(E.successes(0,.5),0);
});
test('A new account can earn its first class entirely through playable actions',()=>{
 const s=E.freshSave(),c=E.selected(s),random=rng();E.start(s,c,'fight');E.advance(s,300,random);assert.ok(c.level>=3);assert.ok(c.bag['moss-slime']>=10);E.travel(s,c,'caves',0);assert.ok(E.progressClass(s,c,'warrior'));
 E.travel(s,c,'caves',0);E.start(s,c,'gather','copper');E.advance(s,90,random);E.travel(s,c,'caves',0);assert.ok(E.progressClass(s,c,'warrior'));assert.ok(E.progressClass(s,c,'warrior'));assert.equal(c.class,'warrior');assert.ok(E.createCharacter(s,'Mage next'));
});
