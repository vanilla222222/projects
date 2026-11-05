import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from './engine.mjs?v=16';
import * as D from './content.mjs?v=16';
import * as Panels from './profession-panels.mjs?v=16';
import * as UI from './ui-panels.mjs?v=16';
import {roomLayout,pointFor} from './layouts.mjs?v=16';
const setup=()=>{const s=E.freshSave(),c=E.selected(s);return{s,c};};
function visit(s,c,id){const d=E.SERVICES[id];Object.assign(c,{area:d.area,zone:d.zone,secret:null,activity:'rest',position:id==='stars'?{x:d.x,y:d.y}:pointFor(roomLayout(d.area,d.zone),d.point)});E.discoverService(s,c,id);}
const restore=s=>E.restoreSave(JSON.parse(JSON.stringify(s)));
const stock=s=>{s.coins=10000;for(const id of Object.keys(D.ITEMS))s.inventory[id]=1000;};

test('Facility discovery, view, claim and upgrade permissions are distinct and floor-aware',()=>{
 const{s,c}=setup();assert.equal(E.discoverService(s,c,'anvil'),false);assert.equal(E.serviceAccess(s,c,'anvil'),false);
 visit(s,c,'anvil');assert.deepEqual(s.access.seen,['anvil']);assert.equal(E.discoverService(s,c,'anvil'),false);assert.ok(E.serviceAccess(s,c,'anvil'));
 c.position.y-=180;assert.equal(E.serviceAccess(s,c,'anvil'),false);s.access.remote.anvil={view:true};assert.ok(E.serviceAccess(s,c,'anvil'));assert.equal(E.serviceAccess(s,c,'anvil','claim'),false);assert.equal(E.serviceAccess(s,c,'anvil','upgrade'),false);
 assert.doesNotThrow(()=>restore(s));
});
test('Remote actions cannot spend materials or claim production before their own unlock',()=>{
 const{s,c}=setup();stock(s);c.anvil.stored.thread=10;const coins=s.coins,bar=s.inventory['copper-bar'];
 assert.equal(E.claimAnvil(s,c,'thread'),0);assert.equal(E.chooseProduct(c,'thread',s),false);assert.equal(E.upgradeAnvil(c,'speed',s),false);assert.equal(E.craft(s,c,'blade'),false);assert.equal(E.upgradeVault(s,'edge'),false);
 assert.equal(s.coins,coins);assert.equal(s.inventory['copper-bar'],bar);assert.equal(c.anvil.stored.thread,10);
 s.access.remote.anvil={view:true,claim:true};assert.equal(E.claimAnvil(s,c,'thread'),10);assert.equal(E.craft(s,c,'blade'),false);
});
test('Anvil pages consume crafted books once and critical blueprints have guaranteed quest sources',()=>{
 const{s,c}=setup();stock(s);visit(s,c,'anvil');const iron=D.RECIPES.find(r=>r.id==='iron-blade');
 assert.equal(E.recipeOpen(s,iron),false);E.unlock(s,'ironworking');assert.equal(E.recipeOpen(s,iron),false);assert.match(E.blueprintHint(s,iron),/Expansion 2/);
 assert.ok(E.craft(s,c,'anvil-expansion-2'));assert.equal(c.bag['anvil-expansion-2'],1);assert.ok(E.useAnvilExpansion(s,c,2));assert.equal(c.bag['anvil-expansion-2'],0);assert.equal(E.useAnvilExpansion(s,c,2),false);assert.ok(E.recipeOpen(s,iron));
 assert.equal(E.useAnvilExpansion(s,c,3),false);E.unlock(s,'gilding');assert.ok(E.craft(s,c,'anvil-expansion-3'));assert.ok(E.useAnvilExpansion(s,c,3));assert.ok(E.recipeOpen(s,D.RECIPES.find(r=>r.id==='gold-blade')));
 assert.doesNotThrow(()=>restore(s));
});
test('Optional task blueprints require one token and cannot spend it twice',()=>{
 const{s,c}=setup();visit(s,c,'anvil');const id='gear-grove-ring',r=D.RECIPES.find(r=>r.id===id);assert.equal(E.recipeOpen(s,r),false);assert.equal(E.learnBlueprint(s,c,id),false);s.workshop.tokens=1;assert.ok(E.learnBlueprint(s,c,id));assert.ok(E.recipeOpen(s,r));assert.equal(s.workshop.tokens,0);assert.equal(E.learnBlueprint(s,c,id),false);assert.equal(E.learnBlueprint(s,c,'blade'),false);
});
test('Migration preserves learned recipes, old research bonuses, gear and pending production',()=>{
 const{s,c}=setup();stock(s);E.unlock(s,'ironworking');E.unlock(s,'gilding');s.metrics.crafted=12;s.alchemy.research.ferrous=3;E.createEquipment(s,'iron-sword',c);delete s.workshop;delete s.alchemy.cauldrons;delete s.access;
 const loaded=restore(s);assert.ok(E.recipeOpen(loaded,D.RECIPES.find(r=>r.id==='gold-blade')));assert.equal(loaded.alchemy.research.ferrous,3);assert.ok(E.bonusesFor(loaded,loaded.characters[0]).mining>=.12);assert.equal(loaded.characters[0].loadout.weapon.base,'iron-sword');assert.equal(E.serviceAccess(loaded,loaded.characters[0],'anvil'),false);
});
test('Product levels gate new production choices while old selected products remain valid',()=>{
 const{s,c}=setup();visit(s,c,'anvil');assert.equal(E.chooseProduct(c,'nails',s),false);c.skills.smithing=48;assert.ok(E.chooseProduct(c,'nails',s));assert.equal(E.chooseProduct(c,'brick',s),false);c.skills.smithing=192;assert.ok(E.chooseProduct(c,'brick',s));c.skills.smithing=0;assert.ok(E.productOpen(c,'brick'));E.advanceProduction(s,80);assert.equal(c.anvil.stored.brick,1);
});
test('Enchanting requires the bench and explicit replacement, spends once and matches preview stats',()=>{
 const{s,c}=setup();stock(s);const item=E.createEquipment(s,'copper-sword',c);const before=E.equipmentStats(item).attack;
 assert.equal(E.enchant(s,c,'weapon','force'),false);visit(s,c,'enchanting');assert.ok(E.enchant(s,c,'weapon','force'));assert.equal(E.equipmentStats(item).attack,before+3);
 const materials=s.inventory.dust;assert.equal(E.enchant(s,c,'weapon','fortitude',0),false);assert.equal(s.inventory.dust,materials);assert.ok(E.enchant(s,c,'weapon','fortitude',0,true));assert.equal(E.equipmentStats(item).attack,before);assert.equal(E.equipmentStats(item).health,20);assert.ok(E.enchant(s,c,'weapon','force',1));assert.equal(item.runes.length,2);assert.equal(E.enchant(s,c,'weapon','force',2),false);assert.doesNotThrow(()=>restore(s));
});
test('Assignments are exclusive, bounded to two per cauldron and continue normal work',()=>{
 const{s,c}=setup();visit(s,c,'alchemy');s.unlockedClasses=['warrior','mage'];E.createCharacter(s,'Two');const second=E.selected(s);E.createCharacter(s,'Three');const third=E.selected(s);
 assert.ok(E.assignCauldron(s,c,c.id,'orange'));assert.ok(E.assignCauldron(s,c,second.id,'orange'));assert.equal(E.assignCauldron(s,c,third.id,'orange'),false);assert.ok(E.assignCauldron(s,c,c.id,'water'));assert.equal(E.assigned(s,'orange').length,1);assert.equal(E.assignCauldron(s,c,third.id,'mist'),false);
 second.area='forest';second.zone=0;assert.ok(E.start(s,second,'gather','oak'));E.advance(s,90,()=>.5);assert.ok(second.bag.oak>0);assert.ok(s.alchemy.cauldrons.orange.points>=1);assert.ok(second.skills.alchemy>0);assert.doesNotThrow(()=>restore(s));
});
test('Offline brewing and liquids stop at caps without farming unlimited experience',()=>{
 const{s,c}=setup();visit(s,c,'alchemy');E.assignCauldron(s,c,c.id,'orange');E.advanceProduction(s,100000);assert.equal(s.alchemy.cauldrons.orange.points,10);assert.equal(s.alchemy.liquid,E.waterCap(s));const xp=c.skills.alchemy;E.advanceProduction(s,100000);assert.equal(c.skills.alchemy,xp);assert.equal(s.alchemy.cauldrons.orange.progress,0);
});
test('Bubble discovery is ordered, the first is guaranteed and three failures guarantee the next',()=>{
 const{s,c}=setup();visit(s,c,'alchemy');const d=s.alchemy.cauldrons.orange;d.points=10;assert.ok(E.brewBubble(s,c,'orange',()=>.999));assert.deepEqual(d.unlocked,['copperheart']);assert.equal(s.alchemy.bubbles.copperheart,1);
 for(let i=0;i<3;i++)assert.ok(E.brewBubble(s,c,'orange',()=>.999));assert.equal(d.failures,3);assert.equal(E.bubbleChance(s,'orange'),1);assert.ok(E.brewBubble(s,c,'orange',()=>.999));assert.deepEqual(d.unlocked,['copperheart','ironwill']);assert.equal(d.points,5);assert.doesNotThrow(()=>restore(s));
});
test('Small bubbles affect the account; large bubbles require personal equipment and slots',()=>{
 const{s,c}=setup();stock(s);visit(s,c,'alchemy');const d=s.alchemy.cauldrons.orange;d.points=10;for(let i=0;i<3;i++)assert.ok(E.brewBubble(s,c,'orange',()=>0));
 assert.equal(E.alchemyBonuses(s,c).attack,.02);assert.ok(E.equipBubble(s,c,'bigstrike'));assert.equal(E.alchemyBonuses(s,c).attack,.06);assert.equal(E.alchemyBonuses(s).attack,.02);E.syncAccount(s);assert.ok(c.accountBonuses.attack>=.06);
 const cost=E.bubbleCost(s,'copperheart');s.alchemy.liquid=40;assert.ok(E.upgradeBubble(s,c,'copperheart'));assert.equal(s.alchemy.liquid,40-cost.water);assert.equal(s.alchemy.bubbles.copperheart,2);assert.equal(E.upgradeBubble(s,c,'sapwise'),false);assert.doesNotThrow(()=>restore(s));
});
test('Boosts and coin upgrades consume exact resources, enforce caps and change real rates',()=>{
 const{s,c}=setup();stock(s);visit(s,c,'alchemy');const d=s.alchemy.cauldrons.green;d.points=2;const duration=E.brewDuration(s,'green');assert.ok(E.boostCauldron(s,c,'green','speed'));assert.ok(E.brewDuration(s,'green')<duration);assert.equal(d.points,1);assert.equal(E.boostCauldron(s,c,'green','fake'),false);
 const price=E.alchemyCoinCost(s,'green');assert.ok(E.coinAlchemy(s,c,'green'));assert.equal(s.coins,10000-price);assert.ok(E.brewDuration(s,'green')<duration);assert.equal(E.coinAlchemy(s,c,'mist','rate'),false);c.skills.alchemy=192;assert.ok(E.coinAlchemy(s,c,'mist','rate'));assert.doesNotThrow(()=>restore(s));
});
test('Vial experiments use carried materials, daily attempts, bad-luck protection and real bonuses',()=>{
 const{s,c}=setup();stock(s);visit(s,c,'alchemy');assert.equal(E.discoverVial(s,c,'copper',()=>.999),false);E.give(c,'copper',20);assert.ok(E.discoverVial(s,c,'copper',()=>.999));assert.equal(c.bag.copper,10);assert.equal(s.alchemy.vials.copper,1);assert.equal(E.alchemyBonuses(s).mining,.02);E.give(c,'oak',50);for(let i=0;i<4;i++)assert.ok(E.discoverVial(s,c,'oak',()=>.999));assert.equal(s.alchemy.vials.oak,undefined);assert.ok(E.discoverVial(s,c,'oak',()=>.999));assert.equal(s.alchemy.vials.oak,1);assert.equal(s.alchemy.vialDay.used,6);E.give(c,'birch',10);assert.equal(E.discoverVial(s,c,'birch'),false);E.rollVialDay(s,Date.now()-E.DAY);assert.equal(s.alchemy.vialDay.used,6);E.rollVialDay(s,Date.now()+E.DAY);assert.equal(s.alchemy.vialDay.used,0);assert.doesNotThrow(()=>restore(s));
});
test('Malformed new systems fail validation before replacing a save',()=>{
 const{s}=setup();const raw=JSON.stringify(s);for(const mutate of [x=>x.access.seen.push('fake'),x=>x.access.remote.anvil={view:'yes'},x=>x.workshop.pages=4,x=>x.workshop.tokens=-1,x=>x.alchemy.cauldrons.orange.points=11,x=>x.alchemy.assignments[999]='orange',x=>x.alchemy.bubbles.copperheart=1,x=>x.alchemy.vials.oak=6,x=>x.characters[0].bigBubbles=['bigstrike'],x=>x.alchemy.liquidUpgrades.water.rate=Infinity]){const v=JSON.parse(raw);mutate(v);assert.throws(()=>restore(v));}
});
test('All new profession panes render both fresh and advanced content and locked chest contents stay hidden',()=>{
 const{s,c}=setup();stock(s);for(const id of ['anvil','enchanting','alchemy']){assert.match(Panels[id==='enchanting'?'enchanting':id](s,c),/Walk to/);visit(s,c,id);for(const tab of id==='anvil'?['craft','produce','points','stones']:id==='alchemy'?['brew','bubbles','liquids','vials','coins','supplies']:['enchant','supplies']){const html=Panels[id==='enchanting'?'enchanting':id](s,c,{[id==='alchemy'?'alchemyTab':id==='anvil'?'anvilTab':'enchantTab']:tab});assert.ok(html.length>100);assert.doesNotMatch(html,/undefined|NaN/);}}
 c.area='forest';c.zone=0;const bag=UI.inventory(s,c);assert.doesNotMatch(bag,/data-source="chest"/);assert.match(bag,/Remote chest view is locked/);assert.match(Panels.quick(s,c),/Remote|visit|VISIT/);
});
test('Every combat route scales increasingly faster and rewards cannot replace equipment upgrades',()=>{
 for(const [area,curve]of Object.entries(D.ENEMY_CURVES)){for(let i=1;i<curve.hp.length;i++){const before=D.ENEMIES[area+'-'+(i-1)],after=D.ENEMIES[area+'-'+i];assert.ok(after.hp>=before.hp*1.45);assert.ok(after.attack>before.attack);assert.ok(after.xp>before.xp);}}
 const{s,c}=setup();c.area='jungle';c.zone=3;c.level=10;const basic=E.fightStats(s,c);assert.ok(basic.incoming>E.maxHp(c));E.createEquipment(s,'iron-sword',c);E.createEquipment(s,'iron-mail',c);E.createEquipment(s,'iron-helm',c);c.talents.power=15;c.talents.vitality=10;const geared=E.fightStats(s,c);assert.ok(geared.duration<basic.duration);assert.ok(geared.incoming<basic.incoming);assert.equal(D.ENEMIES['forest-0'].hp,16);assert.equal(D.ENEMIES['forest-0'].xp,5);
});
