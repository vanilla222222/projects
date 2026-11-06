import {seedKill,seedStory} from './test-fixtures.mjs?v=21';
import test from 'node:test';import assert from 'node:assert/strict';
import * as E from './engine.mjs?v=21';import * as D from './content.mjs?v=21';
import * as UI from './economy-panels.mjs?v=21';
import {roomLayout,pointFor} from './layouts.mjs?v=21';
const setup=()=>{const s=E.freshSave(),c=E.selected(s);s.coins=10000;return{s,c};};
function visit(c,id){const d=E.SERVICES[id];Object.assign(c,{area:d.area,zone:d.zone,secret:null,activity:'rest',position:pointFor(roomLayout(d.area,d.zone),d.point)});}
const roundtrip=s=>E.restoreSave(JSON.parse(JSON.stringify(s)));
function spare(s,c,id){if(D.EXPANSIONS[id]){if(D.EXPANSIONS[id].target==='bag')c.usedExpansions.push(id);else s.usedChestExpansions.push(id);}if(D.CAPACITY_BAGS[id])c.usedCapacityBags.push(id);if(id.startsWith('stamp-'))s.stamps[id.slice(6)]={level:1,cap:5};if(id==='sculpting-tool')c.statuesUnlocked=true;if(id.startsWith('anvil-expansion-'))s.workshop.pages=3;if(id==='boss-heart')seedStory(s,'heart',{accepted:true,done:true});if(D.EQUIPMENT[id])E.createEquipment(s,id,null,c);else E.give(c,id,2);return E.bagSlots(c).findIndex(t=>t?.id===id||t?.uid&&c.packGear.some(g=>g.uid===t.uid&&g.base===id));}
test('Every single World One item has at least three distinct, implemented uses, excluding selling',()=>{
 assert.equal(Object.keys(D.ITEMS).length,175);for(const id of Object.keys(D.ITEMS)){const uses=D.purposes(id);assert.ok(uses.length>=3,id+': '+uses.join('; '));assert.equal(new Set(uses).size,uses.length,id);assert.ok(uses.every(u=>!/sell/i.test(u)),id);}
});
test('Every ordinary item can actually reclaim and contribute a spare through separate transactions',()=>{
 for(const id of Object.keys(D.ITEMS).filter(id=>!E.BADGES[id]))for(const action of ['reclaim','project']){const{s,c}=setup(),i=spare(s,c,id);assert.ok(i>=0,id);visit(c,action==='reclaim'?'foundry':'vault');const before=E.itemSlot(c,i),n=before.qty;const value=action==='reclaim'?E.reclaimItem(s,c,i):E.contributeItem(s,c,i);assert.equal(value,E.salvageValue(id),id+'/'+action);if(action==='reclaim')assert.equal(s.economy.salvage,value);else assert.equal(s.economy.projects[E.itemProject(id,!!D.EQUIPMENT[id])],value);assert.equal(D.EQUIPMENT[id]?c.packGear.length:c.bag[id],D.EQUIPMENT[id]?0:n-1,id);assert.doesNotThrow(()=>roundtrip(s),id+'/'+action);}
});
test('Unlearned bags, books, stamps and quest hearts keep their final copy; tokens are never reclaimed',()=>{
 for(const id of ['woven-pouch','wooden-crate','woven-mining-bag','anvil-expansion-2','stamp-blade','boss-heart','sculpting-tool','world-token-mage','rootbound-key','world-one-completion']){const{s,c}=setup();visit(c,'foundry');E.give(c,id,1);const i=E.bagSlots(c).findIndex(t=>t?.id===id);assert.equal(E.reclaimItem(s,c,i),0,id);assert.equal(c.bag[id],1,id);}
 const{s,c}=setup();visit(c,'foundry');E.give(c,'wooden-crate',2);const i=E.bagSlots(c).findIndex(t=>t?.id==='wooden-crate');assert.equal(E.reclaimItem(s,c,i,2),0);assert.ok(E.reclaimItem(s,c,i));assert.equal(c.bag['wooden-crate'],1);assert.equal(E.reclaimItem(s,c,i),0);
});
test('Locks and local access protect destructive actions, with no partial removal on failure',()=>{
 const{s,c}=setup();E.give(c,'oak',10);let i=E.bagSlots(c).findIndex(t=>t?.id==='oak');assert.equal(E.reclaimItem(s,c,i),0);visit(c,'foundry');E.toggleSlotLock(c,i);assert.equal(E.reclaimItem(s,c,i),0);assert.equal(c.bag.oak,10);E.toggleSlotLock(c,i);assert.equal(E.reclaimItem(s,c,i,11),0);assert.equal(E.reclaimItem(s,c,i,-1),0);assert.equal(E.reclaimItem(s,c,i,.5),0);assert.equal(c.bag.oak,10);assert.ok(E.reclaimItem(s,c,i,2));assert.equal(c.bag.oak,8);assert.equal(s.economy.salvage,2);
});
test('Salvage exchange reserves currency only for fitting, unlocked recipes and cannot create a recycling profit',()=>{
 const{s,c}=setup();visit(c,'foundry');s.economy.salvage=100;assert.ok(E.buySalvage(s,c,'dust'));assert.equal(c.bag.dust,1);assert.equal(s.economy.salvage,80);const i=E.bagSlots(c).findIndex(t=>t?.id==='dust');assert.equal(E.reclaimItem(s,c,i),1);assert.equal(s.economy.salvage,81);assert.equal(E.buySalvage(s,c,'tempered-bar'),false);assert.equal(s.economy.salvage,81);E.give(c,'oak',16*E.BAG_STACK);assert.equal(E.buySalvage(s,c,'dust'),false);assert.equal(s.economy.salvage,81);for(const[id,d]of Object.entries(E.SALVAGE_GOODS))assert.ok(E.salvageValue(id)*d.count<d.cost,id);
});
test('Town projects increase real stats at thresholds, cap at ten and cannot consume past the cap',()=>{
 const{s,c}=setup();visit(c,'vault');E.give(c,'oak',200);let i=E.bagSlots(c).findIndex(t=>t?.id==='oak');assert.equal(E.contributeItem(s,c,i,99),99);assert.equal(E.projectLevel(s,'stores'),0);i=E.bagSlots(c).findIndex(t=>t?.id==='oak');assert.equal(E.contributeItem(s,c,i,1),1);assert.equal(E.projectLevel(s,'stores'),1);assert.equal(E.economyBonuses(s).carry,.005);E.syncAccount(s);assert.ok(c.accountBonuses.carry>=.005);s.economy.projects.stores=10000;const n=c.bag.oak;assert.equal(E.contributeItem(s,c,i),0);assert.equal(c.bag.oak,n);assert.doesNotThrow(()=>roundtrip(s));
});
test('All eight badges attune and unlock craftable equipment without consuming tokens, even after combination',()=>{
 const{s,c}=setup();s.npcTokens=[...D.NPC_TOKEN_GIVERS];s.worldCompletionCrafted=true;s.storyFlags.bossPermit=true;s.workshop.pages=3;for(const id of Object.keys(D.ITEMS))s.inventory[id]=100;visit(c,'vault');
 for(const[id,d]of Object.entries(E.BADGES)){const n=s.inventory[id];assert.ok(E.attuneBadge(s,c,id),id);assert.equal(E.attuneBadge(s,c,id),false);assert.ok(E.learnBadgePattern(s,c,id));assert.equal(E.learnBadgePattern(s,c,id),false);assert.equal(s.inventory[id],n);const r=D.RECIPES.find(r=>r.equipment===d.base);assert.ok(E.recipeOpen(s,r));visit(c,'anvil');assert.ok(E.craft(s,c,r.id),r.id);visit(c,'vault');}
 assert.equal(s.economy.attuned.length,8);assert.equal(s.economy.patterns.length,8);assert.ok(E.economyBonuses(s).mining>.02);assert.doesNotThrow(()=>roundtrip(s));
});
test('Unearned badge actions do not spend coins or open a signature recipe',()=>{
 const{s,c}=setup();visit(c,'vault');const coins=s.coins;for(const id of Object.keys(E.BADGES)){assert.equal(E.attuneBadge(s,c,id),false);assert.equal(E.learnBadgePattern(s,c,id),false);}assert.equal(s.coins,coins);assert.deepEqual(s.economy.patterns,[]);
});
test('Every infusible drop has a real permanent effect and exact costs, with one replaceable slot',()=>{
 for(const id of E.INFUSION_ITEMS()){const{s,c}=setup();visit(c,'enchanting');seedStory(s,'heart',{accepted:true,done:true});const item=E.createEquipment(s,'copper-sword',c);E.give(c,id,50);E.give(c,'dust',20);const cost=E.infusionCost(id);assert.ok(E.infuseItem(s,c,item.uid,id),id);assert.equal(c.bag[id],50-cost[id],id);assert.deepEqual(E.infusionStats(id),Object.fromEntries(Object.entries(E.equipmentStats(item)).filter(([k])=>k!=='attack').concat(Object.hasOwn(E.infusionStats(id),'attack')?[['attack',E.equipmentStats(item).attack-7]]:[])),id);const materials=c.bag[id];assert.equal(E.infuseItem(s,c,item.uid,id),false);assert.equal(c.bag[id],materials);assert.doesNotThrow(()=>roundtrip(s));}
 const{s,c}=setup();visit(c,'enchanting');const item=E.createEquipment(s,'iron-sword',c);s.inventory['moss-slime']=100;s.inventory['bat-fang']=100;s.inventory.dust=100;assert.ok(E.infuseItem(s,c,item.uid,'moss-slime'));assert.ok(E.infuseItem(s,c,item.uid,'bat-fang',true));assert.equal(item.infusion,'bat-fang');
});
test('Malformed economy, project, badge and infusion records cannot replace a save',()=>{
 const{s,c}=setup();E.createEquipment(s,'copper-sword',c);const raw=JSON.stringify(s);for(const mutate of [s=>s.economy.salvage=-1,s=>s.economy.projects.stores=10001,s=>s.economy.projects.missing=1,s=>s.economy.attuned=['world-token-mage'],s=>s.economy.patterns=['fake'],s=>s.characters[0].loadout.weapon.infusion='fake']){const candidate=JSON.parse(raw);mutate(candidate);assert.throws(()=>roundtrip(candidate));}
});
test('Project, reclamation, signature and infusion panes render full fresh and equipped states',()=>{
 const{s,c}=setup();E.give(c,'oak',5);E.createEquipment(s,'copper-sword',c);for(const html of [UI.foundry(s,c,{foundryTab:'reclaim'}),UI.vault(s,c,{vaultTab:'projects'}),UI.vault(s,c,{vaultTab:'badges'}),UI.infusion(s,c,{})]){assert.ok(html.length>100);assert.doesNotMatch(html,/undefined|NaN/);}
});
