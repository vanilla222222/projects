const test=require('node:test');
const assert=require('node:assert/strict');
const BP=require('./blueprint-core.js');
const {harness}=require('./model-harness.cjs');
function lateGame() {
  const h=harness();const s=h.api.state;
  s.workshopBuilt=true;s.rb.count=1;
  for(const o of h.api.ORES){s.ores[o.id].unique=1;s.ores[o.id].found=1;}
  s.smelt.up.copper.zinc=1;s.smelt.extra.quartz=1;s.smelt.extra.gold=1;s.smelt.up.silicon.forest=1;s.forest.up.mill=1;
  for(const w of h.api.WOODS)s.forest.wood[w.id].found=1;
  h.api.syncFlags();return h;
}
function completeActive(api) {
  for(const t of api.state.expansion.job.targets)api.recordBlueprint(t.key,t.step*5);
  for(let i=0;i<5;i++)assert.equal(api.claimBlueprint(),true);
}
test('chain contains exactly seven gameplay expansions and no Stats or Achievements',()=>{
  assert.deepEqual(BP.PROJECTS.map(p=>p.id),['mines','mastery','rebirth','smelt','forest','mill','workshop']);
});
test('Workshop automatically starts Mining; completing each addition begins the next in order',()=>{
  const {api}=lateGame();assert.equal(api.ensureBlueprintChain(),'mines');
  for(const id of ['mines','mastery','rebirth','smelt','forest','mill','workshop']){
    assert.equal(api.state.expansion.active,id);assert.equal(api.startBlueprint('workshop'),false);
    completeActive(api);assert.equal(api.state.expansion.levels[id],5);
  }
  assert.equal(api.state.expansion.active,'');assert.equal(api.ensureBlueprintChain(),'');
});
test('stockpiles and time alone cannot progress or skip an expansion',()=>{
  const {api}=lateGame();api.state.ores.dirt.amt=1e100;api.state.stats.time=1e9;
  api.ensureBlueprintChain();assert.equal(api.claimBlueprint(),false);
  assert.equal(api.startBlueprint('mastery'),false);assert.equal(api.state.expansion.active,'mines');
  assert.equal(api.BP.status(api.state.expansion).progress,0);
});
test('fresh production ledger remains accurate when lifetime totals are too large to represent small additions',()=>{
  const {api}=lateGame();api.state.expansion.office=true;api.state.expansion.levels.mines=5;
  api.state.ores.dirt.total=1e100;api.ensureBlueprintChain();api.give('dirt',1);
  assert.equal(api.state.ores.dirt.total,1e100);assert.equal(api.state.expansion.job.targets[0].earned,1);
});
test('Forest and Sawmill purchases are gated by the required preceding expansions',()=>{
  const {api}=lateGame(),s=api.state;s.smelt.up.silicon.forest=0;s.forest.up.mill=0;
  s.smelt.ingots.silicon=1e9;s.forest.wood.spruce.amt=1e9;
  const forest=api.RECIPES.find(r=>r.id==='silicon').ups.find(u=>u.id==='forest'),mill=api.FUPS.find(u=>u.id==='mill');
  api.buyIngot('silicon',forest);api.buyFup(mill);
  assert.equal(s.smelt.up.silicon.forest,0);assert.equal(s.forest.up.mill,0);assert.equal(s.smelt.ingots.silicon,1e9);
  for(const id of ['mines','mastery','rebirth','smelt'])s.expansion.levels[id]=5;
  api.buyIngot('silicon',forest);assert.equal(s.smelt.up.silicon.forest,1);
  api.buyFup(mill);assert.equal(s.forest.up.mill,0);
  s.expansion.levels.forest=5;api.buyFup(mill);assert.equal(s.forest.up.mill,1);
});
test('completion opens the next base tab without an extra material purchase or waiting stage',()=>{
  const {api}=lateGame(),s=api.state;s.smelt.up.silicon.forest=0;
  for(const id of ['mines','mastery','rebirth','smelt'])s.expansion.levels[id]=5;
  s.forest.up.mill=0;const silicon=s.smelt.ingots.silicon,spruce=s.forest.wood.spruce.amt;
  assert.equal(api.ensureBlueprintChain(),'forest');assert.equal(s.smelt.up.silicon.forest,1);assert.equal(s.smelt.ingots.silicon,silicon);
  completeActive(api);assert.equal(s.expansion.active,'mill');assert.equal(s.forest.up.mill,1);assert.equal(s.forest.wood.spruce.amt,spruce);
});
test('production quotas and partial progress survive save/reload and rebirth without recalculation',()=>{
  const {api,storage}=lateGame();api.ensureBlueprintChain();
  const target=api.state.expansion.job.targets[0];api.recordBlueprint('geodes',target.step*1.2);api.claimBlueprint();
  api.state.ores.dirt.run=1e8;const before=JSON.stringify(api.state.expansion);api.doRebirth();
  assert.equal(JSON.stringify(api.state.expansion),before);api.save();
  const {api:loaded}=harness(JSON.parse(storage.get('vanilla-incremental-save-v1')));
  assert.equal(JSON.stringify(loaded.state.expansion),before);
});
test('focus changes do not change the assigned ore or reset production requirements',()=>{
  const {api}=lateGame();api.state.expansion.levels.mines=5;api.ensureBlueprintChain();
  const job=api.state.expansion.job;assert.equal(job.targets[0].key,'ore:dirt');
  api.state.expansion.focus='gold';api.give('gold',100);assert.equal(job.targets[0].earned,0);
  api.give('dirt',25);assert.equal(job.targets[0].earned,25);
});
test('Electrum uses the real smelter, consumes both ores and records fresh alloy output',()=>{
  const {api}=lateGame(),s=api.state;
  for(const id of ['mines','mastery','rebirth'])s.expansion.levels[id]=5;
  api.ensureBlueprintChain();assert.equal(api.recOpen('electrum'),true);
  s.ores.gold.amt=1000;s.ores.silver.amt=1000;api.setRecipe(0,'electrum');api.smeltStep(10);
  assert.equal(s.smelt.ingots.electrum,3);assert.equal(s.ores.gold.amt,0);assert.equal(s.ores.silver.amt,0);
  assert.equal(s.expansion.job.targets[0].earned,3);
});
test('Sawmill offcuts feed the joiner; pausing refunds one reserved batch without duplication',()=>{
  const {api}=lateGame(),s=api.state;
  for(const id of ['mines','mastery','rebirth','smelt','forest'])s.expansion.levels[id]=5;
  api.ensureBlueprintChain();s.forest.wood.oak.amt=100;s.mill.coal=100;api.setSaw(0,'oak');
  api.millStep(15);assert.equal(s.expansion.offcuts,3);
  api.beamStep(1);assert.equal(s.expansion.offcuts,0);assert.equal(s.expansion.joinBusy,true);
  api.setJoiner(false);assert.equal(s.expansion.offcuts,3);api.setJoiner(false);assert.equal(s.expansion.offcuts,3);
  api.setJoiner(true);api.beamStep(6);assert.equal(s.expansion.beams,1);assert.equal(s.expansion.beamsTotal,1);assert.equal(s.expansion.job.targets[0].earned,1);
});
test('offline catch-up contributes to the active ledger but does not contaminate rate measurements',()=>{
  const {api}=lateGame(),s=api.state;api.ensureBlueprintChain();
  const geodesBefore=s.expansion.job.targets[0].earned;api.offlineGain(1200);
  assert.ok(s.expansion.job.targets[0].earned>geodesBefore);const earned=s.expansion.job.targets[0].earned;
  api.sampleBlueprintRates(1,true);assert.equal(api.observedBlueprintRate('geodes'),0);assert.equal(s.expansion.job.targets[0].earned,earned);
});
test('incomplete and corrupt imported chains cannot grant later expansion features',()=>{
  const s=BP.restore({office:true,active:'workshop',levels:{mines:1,mastery:5,workshop:5},job:{id:'workshop',targets:[{key:'ingots',step:1,earned:1e9}]}});
  assert.equal(BP.level(s,'workshop'),0);assert.equal(s.active,'');assert.equal(BP.level(s,'mines'),0);
});

test('Geodes are collected once per tile and cache cracking does not fabricate Geode progress',()=>{
  const {api}=lateGame(),s=api.state;api.ensureBlueprintChain();s.grid[0]={ore:'dirt',dug:0,geode:true};
  api.digAt(0,[]);api.digAt(0,[]);assert.equal(s.expansion.geodes,1);assert.equal(s.expansion.job.targets[0].earned,1);
  const target=s.expansion.job.targets[0];api.recordBlueprint('geodes',target.step-1);api.claimBlueprint();
  s.expansion.geodes=10;const before=s.ores.dirt.amt,earned=s.expansion.job.targets[0].earned;
  api.crackGeodes();assert.equal(s.expansion.geodes,0);assert.ok(s.ores.dirt.amt>before);assert.equal(s.expansion.job.targets[0].earned,earned);
});

test('Nursery fuel reserve burns an automated tree when needed and can be switched off',()=>{
  const {api}=lateGame(),s=api.state;for(const id of ['mines','mastery','rebirth','smelt'])s.expansion.levels[id]=5;
  api.ensureBlueprintChain();api.recordBlueprint('trees',s.expansion.job.targets[0].step);api.claimBlueprint();
  s.forest.up.auto=1;s.forest.up.autoN=0;s.forest.up.slots=0;s.forest.up.dmg=10;
  s.forest.slots[0]={w:'icewood',hp:100000,t:0};s.mill.coal=0;api.forestStep(1);
  assert.equal(s.mill.coal,500);assert.equal(s.stats.burned,1);assert.equal(s.forest.slots[0].w,'');
  s.expansion.fuelReserve=false;s.forest.slots[0]={w:'icewood',hp:100000,t:0};s.mill.coal=0;api.forestStep(1);
  assert.equal(s.mill.coal,0);assert.equal(s.stats.burned,1);assert.ok(s.forest.slots[0].hp<100000);
});

test('expansion choices change real yield, Mastery price, automation and research calculations',()=>{
  const {api}=lateGame(),s=api.state;const ore=api.oreGain('dirt'),interval=api.autoInterval(),price=api.mastPlan('dirt').total;
  s.expansion.levels.mines=5;s.expansion.levels.mastery=5;s.expansion.levels.rebirth=5;
  assert.ok(Math.abs(api.oreGain('dirt')/ore-1.1*1.15*1.1)<1e-10);assert.ok(api.mastPlan('dirt').total<price);
  s.expansion.legacy='speed';assert.ok(Math.abs(api.autoInterval()-interval/1.1)<1e-10);
  s.expansion.levels.workshop=5;assert.equal(api.engineering('drill'),1.15);
  s.smelt.up.electrum.precision=5;assert.equal(api.researchCost(api.WORKSHOP[0])[0].amount,23);
});

test('ingot budgeting smooths a full rotating production cycle rather than one recipe minute',()=>{
  const {api}=lateGame();for(let i=0;i<420;i++){api.recordBlueprint('ingots',100);api.sampleBlueprintRates(1);}
  for(let i=0;i<60;i++)api.sampleBlueprintRates(1);
  assert.ok(api.observedBlueprintRate('ingots')>80);assert.ok(api.observedBlueprintRate('ingots')<90);
});

test('reference play completes all seven mandatory additions in the expected production windows',()=>{
  const {simulate}=require('./balance-sim.cjs');const r=simulate({seconds:9*3600,clicks:2,seed:42});
  const starts={},finished=[];
  for(const [time,event,id] of r.events){if(event==='expansionStart')starts[id]=time;if(event==='expansionComplete'){const minutes=(time-starts[id])/60;assert.ok(minutes>=14&&minutes<=28,`${id}: ${minutes.toFixed(1)}m`);finished.push(id);}}
  assert.deepEqual(finished,['mines','mastery','rebirth','smelt','forest','mill','workshop']);
  assert.equal(r.state.expansion.active,'');
});
