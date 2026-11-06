import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from './engine.mjs?v=19';
import * as D from './content.mjs?v=19';
import * as U from './panels.mjs?v=19';
import {World,GROUND} from './world.mjs?v=19';
const setup=()=>{const s=E.freshSave(),c=E.selected(s);return{s,c};};
const sum=(c,id)=>E.bagSlots(c).reduce((n,t)=>n+(t?.id===id?t.qty:0),0);
test('Positional grid keeps holes and split stacks through saves and crafting deltas',()=>{
 const{s,c}=setup();E.give(c,'oak',80);E.give(c,'copper',12);assert.ok(E.moveSlot(c,0,10,30));assert.deepEqual(E.bagSlots(c)[10],{id:'oak',qty:30});assert.equal(E.bagSlots(c)[0].qty,50);assert.ok(E.moveSlot(c,1,9));assert.equal(E.bagSlots(c)[1],null);const loaded=E.restoreSave(JSON.parse(JSON.stringify(s))),d=E.selected(loaded);assert.deepEqual(d.bagGrid,c.bagGrid);E.pay(loaded,{oak:21},d);assert.equal(sum(d,'oak'),59);assert.equal(E.bagSlots(d)[9].id,'copper');assert.equal(sum(d,'oak'),d.bag.oak);
});
test('Locks protect exact stacks, empty reservations, equipment and deposit-all across reload',()=>{
 const{s,c}=setup();E.give(c,'oak',150);E.toggleSlotLock(c,0);E.toggleSlotLock(c,4);E.travel(s,c,'town',0);assert.equal(E.depositAll(s,c),51);assert.equal(c.bag.oak,99);assert.equal(E.takeSlot(c,0),null);assert.equal(E.moveSlot(c,0,2),false);assert.equal(E.moveSlot(c,0,4),false);E.give(c,'copper',99);assert.equal(E.bagSlots(c)[4],null);const piece=E.createEquipment(s,'copper-pick');let index=E.bagSlots(c).findIndex(t=>t?.uid===piece.uid);E.toggleSlotLock(c,index);assert.equal(E.depositGear(s,c,piece.uid),false);assert.equal(E.equip(s,c,piece.uid),false);const loaded=E.restoreSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(E.selected(loaded).lockedSlots,c.lockedSlots);E.toggleSlotLock(c,0);assert.equal(E.deposit(s,c,'oak'),99);
});
test('Every pouch tier is useful, personal, additive and cannot be consumed twice',()=>{
 const{s,c}=setup();for(const[id,d]of Object.entries(D.CAPACITY_BAGS)){E.give(c,id,2);const sample={materials:'moss-slime',mining:'copper',logging:'oak',food:'tonic'}[d.type],before=E.stackLimit(c,sample);assert.ok(E.useCapacityBag(c,id));assert.equal(E.stackLimit(c,sample),before+d.bonus);assert.equal(c.bag[id],1);assert.equal(E.useCapacityBag(c,id),false);assert.equal(c.bag[id],1);}assert.equal(E.stackLimit(c,'copper'),1099);s.unlockedClasses=['warrior'];E.createCharacter(s,'Other');assert.equal(E.stackLimit(E.selected(s),'copper'),99);assert.equal(E.selected(E.restoreSave(JSON.parse(JSON.stringify(s)))).usedCapacityBags.length,0);assert.equal(E.bagCapacity(c),16);
});
test('Expanded category stacks extend gathering room without affecting other types or storage',()=>{
 const{s,c}=setup();E.give(c,'woven-mining-bag',1);E.useCapacityBag(c,'woven-mining-bag');E.give(c,'copper',199*16);assert.equal(E.bagUsed(c),16);assert.equal(c.bag.copper,3184);assert.equal(E.carry(c,'copper',1),0);assert.equal(E.carryRoom(c,'oak'),0);E.travel(s,c,'town',0);assert.equal(E.depositAll(s,c),3184);assert.equal(E.chestUsed(s),4);assert.equal(E.withdraw(s,c,'copper'),3184);assert.equal(E.bagUsed(c),16);
});
test('Sorting merges unlocked splits and leaves locked slots untouched',()=>{
 const{s,c}=setup();E.give(c,'oak',90);E.moveSlot(c,0,7,20);E.give(c,'copper',20);E.toggleSlotLock(c,7);E.sortBag(c);assert.deepEqual(E.bagSlots(c)[7],{id:'oak',qty:20});assert.equal(sum(c,'oak'),90);assert.equal(sum(c,'copper'),20);E.toggleSlotLock(c,7);E.sortBag(c);assert.equal(E.bagSlots(c).filter(t=>t?.id==='oak').length,1);
});
test('Chest selected-quantity transfers affect the chosen stack and respect full bags',()=>{
 const{s,c}=setup();E.travel(s,c,'town',0);E.give(c,'oak',80);E.moveSlot(c,0,9,30);assert.equal(E.transferSlot(s,c,9,12),12);assert.equal(E.bagSlots(c)[9].qty,18);assert.equal(s.inventory.oak,12);E.moveChestSlot(s,0,8,5);assert.equal(E.chestSlots(s)[8].qty,5);assert.equal(E.transferSlot(s,c,8,2,'chest'),2);assert.equal(E.chestSlots(s)[8].qty,3);assert.equal(s.inventory.oak,10);assert.equal(c.bag.oak,70);E.travel(s,c,'forest',0);assert.equal(E.transferSlot(s,c,8,1,'chest'),0);assert.equal(E.moveSlot(c,9,Infinity),false);
});
test('Materials and enchanted equipment drop, survive reload, and collect exactly once',()=>{
 const{s,c}=setup(),w=new World(s);E.give(c,'oak',40);assert.ok(w.dropInventory(0,15));assert.equal(c.bag.oak,25);assert.equal(w.groundLoot[0].count,15);w.step(.02,{});assert.equal(w.groundLoot.length,1);const gear=E.createEquipment(s,'copper-pick');gear.runes=[Object.keys(D.RUNES)[0]];const index=E.bagSlots(c).findIndex(t=>t?.uid===gear.uid);assert.ok(w.dropInventory(index));assert.equal(c.packGear.length,0);const restored=E.restoreSave(JSON.parse(JSON.stringify(s))),d=E.selected(restored),other=new World(restored);assert.equal(other.groundLoot.length,2);const piece=other.groundLoot.find(t=>t.gear);assert.ok(other.collect(piece));assert.equal(other.collect(piece),false);assert.deepEqual(d.packGear[0],gear);other.collectAll();assert.equal(d.bag.oak,40);assert.equal(other.groundLoot.length,0);assert.equal(d.packGear.length,1);
});
test('Map exits recover dropped equipment even when the backpack has filled',()=>{
 const{s,c}=setup(),w=new World(s);const gear=E.createEquipment(s,'copper-pick');w.dropInventory(E.bagSlots(c).findIndex(t=>t?.uid===gear.uid));E.give(c,'oak',16*99);w.collectAll();assert.equal(c.packGear[0].uid,gear.uid);assert.equal(w.groundLoot.length,0);assert.equal(c.bag.oak,16*99);E.restoreSave(JSON.parse(JSON.stringify(s)));
});
test('Tools remain equipped across combat and the interface separates tools from equipment',()=>{
 const{s,c}=setup();const pick=E.createEquipment(s,'copper-pick');assert.ok(E.equip(s,c,pick.uid));assert.equal(E.bagUsed(c),0);const tools=U.inventory(s,c,()=>'',{tab:'tools'});assert.match(tools,/Pickaxe/);assert.match(tools,/Hatchet/);assert.match(tools,/Copper Pickaxe/);assert.match(tools,/data-inv-slot="15"/);assert.match(U.inventory(s,c,()=>'',{tab:'capacity'}),/1099|99 \/ stack/);
});
test('Import rejects duplicate pouch histories, invalid locks and duplicate ground gear',()=>{
 for(const mutate of [c=>c.usedCapacityBags=['woven-mining-bag','woven-mining-bag'],c=>c.lockedSlots=[999],c=>c.bagGrid=[{id:'oak',qty:-1}]]){const{s,c}=setup();mutate(c);assert.throws(()=>E.restoreSave(JSON.parse(JSON.stringify(s))));}
 const{s,c}=setup();const gear=E.createEquipment(s,'copper-pick');c.groundLoot=[{id:'loot-test',kind:'drop',itemId:gear.base,count:1,x:400,y:GROUND,gear:{...gear}}];assert.throws(()=>E.restoreSave(JSON.parse(JSON.stringify(s))),/equipment/);
});
