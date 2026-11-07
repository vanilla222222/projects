import test from 'node:test';import assert from 'node:assert/strict';
import * as E from './engine.mjs?v=45';import * as D from './content.mjs?v=45';import * as G from './inventory-guidance.mjs?v=45';import * as UI from './ui-panels.mjs?v=50';
import {World} from './world.mjs?v=49';
const setup=()=>{const s=E.freshSave(),c=E.selected(s);return{s,c};};
const atChest=c=>Object.assign(c,{area:'town',zone:0,position:{x:160,y:644}});
test('Gear comparisons include lost-only stats and all instance bonuses',()=>{
 const{s,c}=setup();const old=E.createEquipment(s,'iron-sword',c);old.runes=['fortitude'];old.upgrades=['edge'];const next=E.createEquipment(s,'copper-sword');const p=G.comparison(c,next);assert.equal(p.target,'weapon');assert.equal(p.rows.find(r=>r.stat==='crit').after,0);assert.ok(p.rows.find(r=>r.stat==='health').delta<0);assert.ok(p.rows.find(r=>r.stat==='defense').delta<0);const html=UI.inventory(s,c,{source:'bag',index:E.bagSlots(c).findIndex(t=>t?.uid===next.uid)});assert.match(html,/stat-loss/);assert.match(html,/Worn/);assert.match(html,/Selected/);assert.match(html,/−20/);assert.doesNotMatch(html,/NaN|undefined/);
});
test('Ring comparisons follow actual default equipment placement and allow explicit ring choices',()=>{
 const{s,c}=setup();const a=E.createEquipment(s,'grove-ring',c),b=E.createEquipment(s,'bramble-band');assert.equal(G.comparison(c,b).target,'ring2');assert.equal(G.comparison(c,b).old,undefined);assert.ok(E.equip(s,c,b.uid));assert.equal(c.loadout.ring2.uid,b.uid);E.unequip(s,c,'ring');const next=E.createEquipment(s,'grove-ring');assert.ok(E.equip(s,c,next.uid,'ring2'));assert.equal(c.loadout.ring2.uid,next.uid);assert.equal(c.packGear.some(g=>g.uid===b.uid),true);
});
test('Store and clear conserves quantities while respecting locks and a nearly full chest',()=>{
 const{s,c}=setup();atChest(c);E.give(c,'oak',16*99+1000);const locked=E.bagSlots(c).findIndex(t=>t?.id==='oak');E.toggleSlotLock(c,locked);s.inventory.iron=23*999;s.inventory.oak=990;const before=(c.bag.oak||0)+(c.overflow.oak||0)+s.inventory.oak;const r=G.storeAndClear(s,c);assert.equal(r.deposited,9);assert.ok(r.claimed>=0);assert.equal((c.bag.oak||0)+(c.overflow.oak||0)+s.inventory.oak,before);assert.ok(c.bag.oak>=99);assert.equal(s.inventory.oak,999);assert.ok(r.pending>0);assert.doesNotThrow(()=>E.restoreSave(JSON.parse(JSON.stringify(s))));
});
test('Overflow clears through repeated real deposits and cannot be moved remotely',()=>{
 const{s,c}=setup();E.give(c,'oak',16*99+3000);const before=JSON.stringify(s);assert.equal(G.storeAndClear(s,c).deposited,0);assert.equal(JSON.stringify(s),before);atChest(c);const r=G.storeAndClear(s,c);assert.equal(r.pending,0);assert.equal(c.bag.oak,0);assert.equal(s.inventory.oak,4584);assert.equal(r.claimed,3000);assert.equal(r.deposited,4584);
});
test('Spare gear crosses characters only through local shared storage, preserving its instance',()=>{
 const{s,c}=setup();s.unlockedClasses=['warrior'];E.createCharacter(s,'Second');const b=E.selected(s);s.active=c.id;atChest(c);const worn=E.createEquipment(s,'copper-mail',c),a=E.createEquipment(s,'iron-sword'),locked=E.createEquipment(s,'copper-sword');a.runes=['force'];a.upgrades=['edge'];a.infusion='amber';E.toggleSlotLock(c,E.bagSlots(c).findIndex(t=>t?.uid===locked.uid));assert.equal(G.storeGear(s,c),1);assert.equal(c.loadout.body.uid,worn.uid);assert.ok(c.packGear.some(g=>g.uid===locked.uid));assert.equal(E.withdrawGear(s,b,a.uid),false);atChest(b);assert.ok(E.withdrawGear(s,b,a.uid));assert.deepEqual(b.packGear[0],a);assert.ok(E.equip(s,b,a.uid));assert.equal(b.loadout.weapon.infusion,'amber');assert.doesNotThrow(()=>E.restoreSave(JSON.parse(JSON.stringify(s))));
});
test('Sources name valid gathering rooms, recipe gates and undiscovered quest mentors',()=>{
 const{s,c}=setup();const ore=G.itemSources(s,c,'iron');assert.ok(ore.some(x=>x.room==='deep:0'&&/Mining 3/.test(x.text)));const reward=G.itemSources(s,c,'seam-bag');assert.ok(reward.some(x=>/Speak to Brann/.test(x.text)));assert.equal(reward.some(x=>/Read the Seams/.test(x.text)),false);for(const id of Object.keys(D.ITEMS))for(const source of G.itemSources(s,c,id))if(source.room){const[area,z]=source.room.split(':');assert.ok(D.areaById(area)?.zones[Number(z)],id+'/'+source.room);}assert.match(UI.itemIndex(s,c,{item:'iron'}),/data-reveal-room="deep:0"/);
});
test('Obtained quest deliveries link to the item reference without revealing unaccepted quests',()=>{
 const{s,c}=setup();c.journey.story.tools={accepted:true,done:false,extrasVersion:1};const st=E.questStatus(s,'tools',c);assert.ok(st.tasks.some(t=>t.item==='copper-bar'));const html=UI.journal(s,c,{quest:'tools'});assert.match(html,/data-codex-item="copper-bar"/);assert.doesNotMatch(html,/An Unquiet Seal/);
});
test('Full-bag floor loot stays intact, names the blocked item and remains visible in inventory',()=>{
 const{s,c}=setup(),events=[],w=new World(s,{onEvent:e=>events.push(e)});E.give(c,'oak',16*99);w.auto=true;w.spawnLoot('boar-hide',3,w.player.x,w.player.y);const drop=w.groundLoot[0];assert.equal(w.collect(drop),false);assert.equal(drop.count,3);assert.match(events.find(e=>e.type==='notice').text,/Boar Hide/);assert.equal(w.auto,false);assert.equal(G.lootStatus(c).floor,3);assert.match(UI.inventory(s,c),/On the ground/i);assert.match(UI.inventory(s,c),/Boar Hide/);
});
test('The guardian staff remains a useful logging sidegrade to the common verdant staff',()=>{
 const a=D.EQUIPMENT['sunwell-staff'].stats,b=D.EQUIPMENT['verdant-staff'].stats;assert.ok(a.logging>b.logging);assert.ok(a.attack<b.attack);assert.equal(D.RECIPES.find(r=>r.equipment==='sunwell-staff').cost['sap-essence'],1);assert.ok(D.purposes('sunwell-staff').length>=3);
});

test('Encounter coordinates cannot act as a town chest or resupply point',()=>{
 for(const [key,value]of [['encounter',{id:'boss',tier:0,started:1000}],['dungeon',{}],['trial',{}],['secret','sunwell'],['activity','boss']]){const{s,c}=setup();atChest(c);E.give(c,'oak',20);s.inventory.copper=20;c[key]=value;const before=JSON.stringify(s);assert.equal(E.storageAccess(c),false);assert.equal(E.deposit(s,c,'oak'),0);assert.equal(E.withdraw(s,c,'copper'),0);assert.equal(G.storeAndClear(s,c).deposited,0);assert.equal(JSON.stringify(s),before);}
});
