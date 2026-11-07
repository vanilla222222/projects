import test from 'node:test';import assert from 'node:assert/strict';
import * as E from './engine.mjs?v=45';import * as D from './content.mjs?v=45';
import * as UI from './adventure-panels.mjs?v=45';import * as Parity from './parity-panels.mjs?v=45';
import {commonLootSeconds} from './assignment-forecast.mjs?v=45';
const setup=()=>{const s=E.freshSave(1000);return{s,c:E.selected(s)};};
const reload=s=>E.restoreSave(JSON.parse(JSON.stringify(s)));
test('Every combat route increases kill requirements, including cross-area entrances',()=>{
 for(const goals of Object.values(E.PORTAL_GOALS))for(let i=1;i<goals.length;i++)assert.ok(goals[i]>goals[i-1]);
 for(const [area,entry]of [['jungle',E.PORTAL_GOALS.forest[4]],['deep',E.PORTAL_GOALS.caves[2]],['tree',E.PORTAL_GOALS.forest[3]]])assert.ok(E.PORTAL_GOALS[area][0]>entry);
 const{s,c}=setup();E.grantKills(s,c,D.ENEMIES['forest-0'],11,()=>.5);assert.equal(E.zoneUnlocked(s,'forest',1,c),false);E.grantKills(s,c,D.ENEMIES['forest-0'],1,()=>.5);assert.equal(E.zoneUnlocked(s,'forest',1,c),true);
});
test('The outpost opens at the full final-jungle goal, then remains shared for new characters',()=>{
 const{s,c}=setup(),goal=E.PORTAL_GOALS.jungle[3];s.kills['jungle-3']=goal-1;assert.equal(E.travel(s,c,'jungle-town',0),false);s.kills['jungle-3']++;assert.ok(E.travel(s,c,'jungle-town',0));s.unlockedClasses=['warrior'];E.createCharacter(s,'Second');assert.ok(E.zoneUnlocked(s,'jungle-town',2,E.selected(s)));assert.equal(E.zoneUnlocked(s,'jungle',1,E.selected(s)),false);
});
test('Version-one saves preserve previously eligible and visited rooms without unlocking them for new characters',()=>{
 const{s,c}=setup();s.journeyVersion=1;c.journey.kills['forest-0']=8;c.journey.kills['forest-1']=17;c.journey.visited['caves-2']=true;s.kills['jungle-3']=12;
 let v=reload(s),hero=E.selected(v);assert.ok(E.zoneUnlocked(v,'forest',1,hero));assert.equal(E.zoneUnlocked(v,'forest',2,hero),false);assert.ok(E.zoneUnlocked(v,'caves',2,hero));assert.ok(E.zoneUnlocked(v,'jungle-town',0,hero));assert.equal(v.journeyVersion,2);
 v=reload(v);v.unlockedClasses=['warrior'];E.createCharacter(v,'New');assert.equal(E.zoneUnlocked(v,'forest',1,E.selected(v)),false);assert.ok(E.zoneUnlocked(v,'jungle-town',0,E.selected(v)));
});
test('Modern saves do not grandfather a newly missing portal goal on reload',()=>{
 const{s,c}=setup();c.journey.kills['forest-0']=8;const v=reload(s);assert.equal(E.zoneUnlocked(v,'forest',1,E.selected(v)),false);
});
test('Signature gathering tools exceed iron and satisfy gold requirements',()=>{
 const{s,c}=setup();c.skills.mining=192;c.skills.logging=192;E.createEquipment(s,'iron-pick',c);const iron=E.gatherEfficiency(c,'gold');E.createEquipment(s,'copperheart-pick',c);assert.equal(E.toolTier(c,'mining'),3);assert.equal(E.gatherRequirement(c,'gold'),'');assert.ok(E.gatherEfficiency(c,'gold')>iron);E.createEquipment(s,'living-birch-axe',c);assert.equal(E.toolTier(c,'logging'),3);assert.equal(E.gatherRequirement(c,'jungle-wood'),'');assert.equal(E.gatherOdds(c,'gold').nextMultiAt,320);
});
test('Gathering forecasts match an actual isolated hour without modifying the roster',()=>{
 const{s,c}=setup();E.start(s,c,'gather','oak');const before=JSON.stringify(s),forecast=E.assignmentForecast(s,c);assert.equal(JSON.stringify(s),before);const copy=structuredClone(s);let seed=713503;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};E.advance(copy,3600,rng,{production:false});const who=E.selected(copy);assert.equal(forecast.resourceItems,(who.bag.oak||0)+(who.overflow.oak||0));assert.equal(forecast.skills.logging,who.skills.logging);assert.equal(forecast.xp,who.lifetimeXp);assert.ok(E.afkInfo(s,c).items>0);
});
test('Combat projections include coin bonuses, food consumption, recovery and unsafe retreats',()=>{
 const{s,c}=setup();c.level=10;c.class='warrior';c.classTalents.fortune=5;s.stamps.mint={level:5,cap:5};E.syncAccount(s);E.start(s,c,'fight');const before=JSON.stringify(s),a=E.afkInfo(s,c);assert.equal(JSON.stringify(s),before);assert.ok(a.coins>a.kills*D.ENEMIES['forest-0'].coins);assert.equal(a.coins,a.projection.coins);
 c.area='deep';c.zone=3;c.hp=1;c.level=1;c.class=null;c.activity='fight';c.foodSlots[0]={id:'bread',count:1,cooldown:0};const f=E.assignmentForecast(s,c);assert.ok(f.foodUsed<=1);assert.ok(f.retreatSeconds);assert.equal(f.kills,0);
});
test('Common loot shares empty slots and respects category pouches and existing partial stacks',()=>{
 const{s,c}=setup();E.give(c,'oak',15*99);const loot=[{id:'moss-slime',rate:100},{id:'boar-hide',rate:100}];const t=commonLootSeconds(c,loot,structuredClone,E.carry);assert.ok(t>35&&t<37);E.give(c,'woven-materials-bag',1);E.useCapacityBag(c,'woven-materials-bag');const later=commonLootSeconds(c,[{id:'moss-slime',rate:100}],structuredClone,E.carry);assert.ok(later>t);
});
test('Boss preparation reflects selected difficulty and defensive equipment without granting access',()=>{
 const{s,c}=setup(),first=E.bossPreparation(s,c,0),ancient=E.bossPreparation(s,c,2);assert.equal(first.requiredAccuracy,125);assert.equal(ancient.requiredAccuracy,240);assert.ok(ancient.incoming>first.incoming);E.createEquipment(s,'tempered-mail',c);assert.ok(E.bossPreparation(s,c).incoming<first.incoming);assert.equal(s.storyFlags.bossPermit,false);assert.match(Parity.hunts(s,c),/Rootwarden Preparation/);assert.match(UI.gatheringGuide(s,c),/Next tier/);assert.throws(()=>E.assignmentForecast(s,c,Infinity));
});

test('Small coin bonuses accumulate across single kills, survive reload and match batched awards',()=>{
 const{s,c}=setup();s.stamps.mint={level:1,cap:5};E.syncAccount(s);const batch=structuredClone(s);for(let i=0;i<17;i++)E.grantKills(s,c,D.ENEMIES['forest-0'],1,()=>.5);let v=reload(s);for(let i=17;i<100;i++)E.grantKills(v,E.selected(v),D.ENEMIES['forest-0'],1,()=>.5);E.grantKills(batch,E.selected(batch),D.ENEMIES['forest-0'],100,()=>.5);assert.equal(v.coins,batch.coins);assert.equal(v.coins,103);assert.ok(E.selected(v).coinRemainder<1);const bad=structuredClone(v);bad.characters[0].coinRemainder=1;assert.throws(()=>reload(bad));
});
