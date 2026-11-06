import test from 'node:test';import assert from 'node:assert/strict';
import * as E from './engine.mjs?v=35';import * as D from './content.mjs?v=35';
import * as R from './roster.mjs?v=35';import * as UI from './roster-panels.mjs?v=35';
import * as Parity from './parity-panels.mjs?v=35';
import {World} from './world.mjs?v=35';
const setup=()=>{const s=E.freshSave(1000),a=E.selected(s);s.unlockedClasses=['warrior'];E.createCharacter(s,'Second');const b=E.selected(s);s.active=a.id;const w=new World(s);return{s,a,b,w};};
const reload=s=>E.restoreSave(JSON.parse(JSON.stringify(s)));
test('Assignment room lists use the chosen worker’s discovery and personal portal progress',()=>{
 const{s,a,b}=setup();a.journey.kills['forest-0']=12;a.journey.visited['forest-1']=true;s.visited['forest-1']=true;
 assert.ok(R.assignmentRooms(s,a).some(r=>r.area==='forest'&&r.zone===1));assert.equal(R.assignmentRooms(s,b).some(r=>r.area==='forest'&&r.zone===1),false);
 const before=JSON.stringify(s);assert.equal(R.assignCharacter(s,b,'forest',1,'fight'),false);assert.equal(JSON.stringify(s),before);assert.doesNotMatch(UI.assignment(s,b),/value="forest:1"/);
});
test('An invalid resource or missing tool does not move a worker, collect loot or reset their assignment',()=>{
 const{s,a,b}=setup();b.journey.legacy.push('deep-2');b.journey.visited['deep-2']=true;s.kills['caves-2']=100;Object.assign(b,{activity:'gather',resource:'oak',progress:1.2,position:{x:600,y:644},groundLoot:[{id:'coin',itemId:'coins',count:10,x:500,y:644}]});
 const before=JSON.stringify(s);assert.equal(R.assignCharacter(s,b,'deep',2,'gather:gold'),false);assert.equal(R.assignCharacter(s,b,'forest',0,'gather:iron'),false);assert.equal(JSON.stringify(s),before);
});
test('Assignment selection lists every resource and same-room changes preserve position',()=>{
 const{s,a,b}=setup();b.journey.legacy.push('deep-2');b.journey.visited['deep-2']=true;s.kills['caves-2']=100;Object.assign(b,{area:'deep',zone:2,position:{x:630,y:644},activity:'rest'});b.skills.mining=192;E.createEquipment(s,'iron-pick',b);
 const nodes=D.areaById('deep').resources[2];for(const id of nodes)assert.ok(R.assignmentTasks('deep',2).some(t=>t.id==='gather:'+id));const pos={...b.position};assert.ok(R.assignCharacter(s,b,'deep',2,'gather:gold'));assert.equal(b.resource,'gold');assert.deepEqual(b.position,pos);assert.equal(s.active,a.id);
});
test('Changing a background room preserves floor equipment instances and pays coins once',()=>{
 const{s,a,b}=setup();b.journey.visited['caves-0']=true;const gear={uid:s.nextEquipmentId++,base:'copper-sword',runes:['force']};b.groundLoot=[{id:'gear',itemId:'copper-sword',gear,count:1,x:400,y:644},{id:'money',itemId:'coins',count:7,x:400,y:644}];
 assert.ok(R.assignCharacter(s,b,'caves',0,'gather:copper'));assert.equal(b.packGear[0],gear);assert.equal(s.coins,7);assert.equal(b.groundLoot.length,0);assert.ok(R.assignCharacter(s,b,'caves',0,'rest'));assert.equal(s.coins,7);assert.doesNotThrow(()=>reload(s));
});
test('Switching characters resumes gathering progress, location and facing',()=>{
 const{s,a,b,w}=setup();assert.ok(E.start(s,a,'gather','oak'));a.progress=1.25;w.player.x=700;w.player.y=644;w.player.facing=-1;assert.ok(w.switchCharacter(b.id));assert.equal(a.progress,1.25);assert.equal(a.activity,'gather');assert.ok(w.switchCharacter(a.id));assert.equal(w.player.x,700);assert.equal(w.player.facing,-1);assert.equal(a.progress,1.25);assert.equal(w.target.resource,'oak');assert.doesNotThrow(()=>reload(s));
});
test('Switching and reloading preserve a valid ladder position and climbing controls',()=>{
 const{s,a,b,w}=setup(),ladder=w.map.ladders[0];w.player.x=ladder.x;w.player.y=(ladder.top+ladder.bottom)/2;w.player.climbing=true;w.player.ladder=ladder;const y=w.player.y;assert.ok(w.switchCharacter(b.id));assert.ok(w.switchCharacter(a.id));assert.equal(w.player.y,y);assert.equal(w.player.climbing,true);w.step(.02,{vertical:1});assert.ok(w.player.y<y);const v=reload(s),other=new World(v);assert.equal(other.player.climbing,true);assert.equal(other.player.y,a.position.y);
});
test('Collecting pending floor drops during a switch does not cancel a full-bag assignment',()=>{
 const{s,a,b,w}=setup();E.give(a,'oak',16*99);a.activity='fight';w.auto=true;w.spawnLoot('moss-slime',2,w.player.x,w.player.y);assert.ok(w.switchCharacter(b.id));assert.equal(a.activity,'fight');assert.equal(a.overflow['moss-slime'],2);assert.ok(w.switchCharacter(a.id));assert.equal(w.auto,true);
});
test('Character switching cannot reset an active paid boss, trial or dungeon',()=>{
 for(const kind of ['encounter','trial','dungeon']){const{s,a,b,w}=setup();a[kind]=kind==='encounter'?{id:'boss',tier:0,started:1000}:{id:1};const before=JSON.stringify(s);assert.equal(w.switchCharacter(b.id),false);assert.equal(JSON.stringify(s),before);}
});
test('Next goals use carried upgrades, real recipe sources and current limitations',()=>{
 const{s,a}=setup();E.start(s,a,'gather','oak');assert.equal(R.nextGoal(s,a).value,'axe');E.createEquipment(s,'copper-axe',null,a);assert.match(R.nextGoal(s,a).title,/Equip your Copper Hatchet/);a.packGear=[];a.area='deep';a.zone=3;a.activity='fight';a.assignmentWarning='survival';assert.match(R.nextGoal(s,a).title,/armor/);const g=R.nextGoal(s,a);assert.ok(D.RECIPES.some(r=>r.id===g.value));assert.match(g.detail,/Source: anvil/);
});
test('Offline rows record actual consumption, overflow, buff expiry and ending state without double claims',()=>{
 const{s,a,b}=setup();a.level=10;a.hp=E.maxHp(a);a.area='forest';a.zone=4;a.activity='fight';a.foodSlots[0]={id:'bread',count:2,cooldown:0};a.buffs=[{type:'mining',value:D.POTIONS['mining-tonic'].value,remaining:5,source:'potion'}];E.give(a,'oak',16*99);E.start(s,b,'gather','oak');const report=E.claimOffline(s,121000,()=>.5),row=report.characters[0],d=row.details;
 assert.equal(d.assignment.room,D.AREAS.find(x=>x.id==='forest').zones[4]);assert.equal(d.assignment.activity,'fight');assert.equal(d.foodItems.bread||0,row.food);assert.equal(d.foodRemaining,a.foodSlots[0].count);assert.equal(d.buffsExpired,1);assert.ok(d.pendingAdded>0);assert.equal(d.pendingTotal,Object.values(a.overflow).reduce((n,v)=>n+v,0));assert.match(Parity.offlineReport(report,s),/Materials earned/);assert.match(Parity.offlineReport(report,s),/Current next goal/);assert.equal(E.claimOffline(s,121000,()=>.5).items,0);assert.doesNotThrow(()=>reload(s));
});
test('Offline survival retreats remain actionable after reloading',()=>{
 const{s,a}=setup();a.area='deep';a.zone=3;a.activity='fight';a.hp=1;const r=E.claimOffline(s,121000,()=>.5);assert.equal(r.characters[0].details.retreated,true);assert.equal(a.assignmentWarning,'survival');const v=reload(s);assert.match(R.nextGoal(v,E.selected(v)).title,/armor/);assert.match(Parity.offlineReport(r),/Retreated during/);
});
test('Merged reports preserve initial context, combine details and handle older unread reports',()=>{
 const{s,a}=setup();E.start(s,a,'gather','oak');E.claimOffline(s,121000,()=>.5);const first=s.afkReport.characters[0].details;E.claimOffline(s,241000,()=>.5);assert.equal(s.afkReport.characters[0].details.seconds,240);assert.deepEqual(s.afkReport.characters[0].details.assignment,first.assignment);delete s.afkReport.characters[0].details;E.claimOffline(s,361000,()=>.5);assert.equal(s.afkReport.characters[0].details.partial,true);assert.match(Parity.offlineReport(s.afkReport),/older report/);assert.doesNotThrow(()=>reload(s));
});
test('Malformed offline details and assignment warnings cannot replace a save',()=>{
 const{s,a}=setup();E.start(s,a,'gather','oak');E.claimOffline(s,121000,()=>.5);for(const mutate of [s=>s.afkReport.characters[0].details.seconds=-1,s=>s.afkReport.characters[0].details.foodItems={oak:2},s=>s.afkReport.characters[0].details.assignment.zone=999,s=>s.characters[0].assignmentWarning='unknown']){const raw=structuredClone(s);mutate(raw);assert.throws(()=>reload(raw));}
});
test('A newly created character only reports the absences they actually worked',()=>{
 const{s,a}=setup();E.start(s,a,'gather','oak');E.claimOffline(s,121000,()=>.5);s.unlockedClasses.push('mage');assert.ok(E.createCharacter(s,'Third'));const third=E.selected(s);E.start(s,third,'gather','oak');E.claimOffline(s,241000,()=>.5);assert.equal(s.afkReport.characters.find(c=>c.id===a.id).details.seconds,240);assert.equal(s.afkReport.characters.find(c=>c.id===third.id).details.seconds,120);assert.doesNotThrow(()=>reload(s));
});
test('Roster and assignment UI show personal equipment, food, overflow and safely escaped names',()=>{
 const{s,a}=setup();a.name='<script>bad</script>';E.start(s,a,'gather','oak');const html=UI.roster(s);assert.match(html,/Skill XP/);assert.match(html,/Food equipped/);assert.match(html,/Current bottleneck/);assert.match(html,/Source: anvil/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>|undefined|NaN/);
});
