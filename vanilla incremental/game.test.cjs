const test = require('node:test');
const assert = require('node:assert/strict');
const {harness} = require('./model-harness.cjs');

const project = (api,id) => api.WORKSHOP.find(p=>p.id===id);

test('v1 saves retain existing balances, unlocks and production queues with zero research defaults',()=>{
  const {api} = harness();const s=api.state;
  s.ores.gold.amt=123456;s.ores.iron.unique=1;s.auto.bulk=7;s.rb.points=12;
  s.smelt.slots[0]={rec:'copper',busy:1,t:4};
  delete s.workshop;delete s.touchMine;
  const {api: loaded}=harness(s);
  assert.equal(loaded.state.ores.gold.amt,123456);assert.equal(loaded.state.ores.iron.unique,1);
  assert.equal(loaded.state.auto.bulk,7);assert.equal(loaded.state.rb.points,12);
  assert.equal(loaded.state.smelt.slots[0].t,4);
  assert.ok(Object.values(loaded.state.workshop).every(n=>n===0));assert.equal(loaded.state.touchMine,false);
});

test('early automation is purchasable with 1,000 stone, and remains available after rebirth',()=>{
  const {api}=harness();api.state.ores.stone.amt=1000;api.state.ores.stone.found=1;
  api.buy('stone',api.UPGRADES.find(u=>u.id==='unique'));
  assert.equal(api.hasAuto(),true);assert.equal(api.state.ores.stone.amt,0);
  api.state.ores.dirt.run=1e8;api.doRebirth();assert.equal(api.hasAuto(),true);
});

test('research checks locks and all currencies before making an atomic purchase',()=>{
  const {api}=harness();const p=project(api,'gears');
  api.state.smelt.ingots.copper=500;api.state.smelt.ingots.zinc=500;
  api.buyResearch(p);assert.equal(api.state.workshop.gears,0);assert.equal(api.state.smelt.ingots.copper,500);
  api.state.workshopBuilt=true;api.state.ores.iron.unique=1;api.state.ores.stone.unique=1;api.state.smelt.up.copper.zinc=1;api.syncFlags();
  api.state.smelt.ingots.zinc=24;api.buyResearch(p);assert.equal(api.state.smelt.ingots.copper,500);
  api.state.smelt.ingots.zinc=25;api.buyResearch(p);
  assert.equal(api.state.workshop.gears,1);assert.equal(api.state.smelt.ingots.copper,450);assert.equal(api.state.smelt.ingots.zinc,0);
});

test('research effects apply to real ore, autominer, smelting, chopping and generation calculations',()=>{
  const {api}=harness();const before=[api.oreGain('dirt'),api.autoInterval(),api.smeltYield('copper'),api.chopDmg()];
  Object.assign(api.state.workshop,{drill:2,deep:1,gears:4,foundry:4,forestry:2,scanner:5});
  assert.ok(Math.abs(api.oreGain('dirt')/before[0]-1.4)<1e-10);
  assert.ok(Math.abs(before[1]/api.autoInterval()-1.2)<1e-10);
  assert.equal(api.smeltYield('copper')/before[2],1.5);assert.equal(api.chopDmg()/before[3],1.5);
  assert.equal(api.workshopSpecial(),2);
});

test('research caps hold and a capped purchase never spends resources',()=>{
  const {api}=harness();api.state.workshopBuilt=true;api.state.ores.iron.unique=1;api.state.smelt.ingots.copper=1e9;
  const p=project(api,'drill');for(let i=0;i<15;i++)api.buyResearch(p);
  assert.equal(api.state.workshop.drill,p.max);
  const left=api.state.smelt.ingots.copper;api.buyResearch(p);assert.equal(api.state.smelt.ingots.copper,left);
});

test('research and drag preference persist through save/reload and rebirth',()=>{
  const {api,storage}=harness();api.state.workshop.drill=3;api.state.touchMine=true;api.state.ores.dirt.run=1e8;
  api.doRebirth();assert.equal(api.state.workshop.drill,3);assert.equal(api.state.touchMine,true);
  api.save();const {api: reloaded}=harness(JSON.parse(storage.get('vanilla-incremental-save-v1')));
  assert.equal(reloaded.state.workshop.drill,3);assert.equal(reloaded.state.touchMine,true);
  assert.equal(reloaded.state.rb.count,1);assert.equal(reloaded.state.ores.dirt.amt,0);
});

test('saved research levels are clamped to valid whole numbers',()=>{
  const {api}=harness({workshop:{drill:999,gears:-10,foundry:2.9,scanner:'5',forestry:null,deep:3}});
  assert.deepEqual(JSON.parse(JSON.stringify(api.state.workshop)),{drill:10,gears:0,foundry:2,scanner:0,forestry:0,deep:3});
});

test('scanner affects new special-tile rolls without changing existing grid or creating specials in a fresh game',()=>{
  const {api}=harness(undefined,()=>0.015);api.state.ores.obsidian.unique=1;api.syncFlags();
  assert.equal(api.newGrid()[0].sp,'tnt');
  api.state.workshop.scanner=5;assert.equal(api.newGrid()[0].sp,'chest');
  const current=JSON.stringify(api.state.grid);api.newGrid();assert.equal(JSON.stringify(api.state.grid),current);
  assert.ok(api.fresh().grid.every(c=>!c.sp));
});

test('a fully cleared restored layer advances instead of trapping the player',()=>{
  const {api,timers}=harness();api.state.grid.forEach(c=>c.dug=1);api.originalRenderGrid();
  assert.equal(timers.size,1);const advance=[...timers.values()][0];advance();
  assert.equal(api.state.layer,2);assert.equal(api.state.stats.layers,1);assert.ok(api.state.grid.every(c=>!c.dug));
});

test('milestone progress uses the current unlock price and advances to the next major stage',()=>{
  const {api,nodes}=harness();api.state.ores.dirt.amt=7.5e8;api.renderGoal();
  assert.equal(nodes.get('goalTitle').textContent,'Unlock Mastery');assert.equal(nodes.get('goalProgress').value,50);
  api.state.ores.dirt.unique=1;api.renderGoal();assert.equal(nodes.get('goalTitle').textContent,'Unlock Rebirth');
});

test('major stages require their preceding system, not elapsed time',()=>{
  const {api}=harness();const u=api.UPGRADES.find(u=>u.id==='unique');
  api.state.ores.copper.amt=1e15;api.buy('copper',u);assert.equal(api.state.ores.copper.unique,0);
  api.state.ores.dirt.amt=1.5e9;api.buy('dirt',u);api.buy('copper',u);
  assert.equal(api.state.ores.copper.unique,1);assert.equal(api.state.stats.time,0);
  api.state.ores.iron.amt=1e15;api.buy('iron',u);assert.equal(api.state.ores.iron.unique,0);
  api.state.rb.count=1;api.buy('iron',u);assert.equal(api.state.ores.iron.unique,1);
});

test('Workshop construction charges once and unlocks permanent research',()=>{
  const {api}=harness();api.state.ores.iron.unique=1;api.state.smelt.ingots.copper=6000;
  api.constructWorkshop();assert.equal(api.state.workshopBuilt,true);assert.equal(api.state.smelt.ingots.copper,1000);
  assert.equal(api.state.tab,'workshop');api.constructWorkshop();assert.equal(api.state.smelt.ingots.copper,1000);
  api.state.ores.dirt.run=1e8;api.doRebirth();assert.equal(api.state.workshopBuilt,true);
});

test('legacy late-game saves keep Forest, Sawmill and Workshop access',()=>{
  const {api}=harness();api.state.smelt.up.silicon.forest=1;api.state.forest.up.mill=1;
  delete api.state.workshopBuilt;
  const {api:loaded}=harness(api.state);
  assert.equal(loaded.forestOn(),true);assert.equal(loaded.millOn(),true);assert.equal(loaded.state.workshopBuilt,true);
});

test('Steel consumes Iron and Charcoal atomically, and changing recipe refunds an unfinished batch',()=>{
  const {api}=harness();api.state.ores.iron.unique=1;api.state.smelt.up.silicon.forest=1;
  api.state.ores.iron.amt=1000;api.state.mill.coal=4;api.setRecipe(0,'steel');
  api.smeltStep(1);assert.equal(api.state.ores.iron.amt,1000);assert.equal(api.state.mill.coal,4);assert.equal(api.state.smelt.slots[0].busy,0);
  api.state.mill.coal=5;api.smeltStep(1);
  assert.equal(api.state.ores.iron.amt,0);assert.equal(api.state.mill.coal,0);assert.equal(api.state.smelt.slots[0].busy,1);
  api.setRecipe(0,'copper');assert.equal(api.state.ores.iron.amt,1000);assert.equal(api.state.mill.coal,5);
  api.setRecipe(0,'steel');api.smeltStep(10);assert.equal(api.state.smelt.ingots.steel,3);assert.equal(api.state.mill.coal,0);
});

test('Steel tools improve chopping and cutting; supports improve ore yield',()=>{
  const {api}=harness();const old=[api.chopDmg(),api.millTime('oak'),api.oreGain('dirt')];
  Object.assign(api.state.smelt.up.steel,{axe:1,saw:1,supports:2});
  assert.equal(api.chopDmg(),old[0]*2);assert.equal(api.millTime('oak'),old[1]/2);assert.equal(api.oreGain('dirt'),old[2]*1.5);
});

test('new tree rolls follow chopping capability while already saved tough trees remain intact',()=>{
  const {api}=harness();assert.deepEqual(Array.from(api.availableWoods(),w=>w.id),['oak','birch','spruce']);
  for(let i=0;i<100;i++)assert.ok(['oak','birch','spruce'].includes(api.rollWood()));
  api.state.forest.up.dmg=10;assert.equal(api.availableWoods().length,6);
  api.state.forest.slots[0]={w:'icewood',hp:90000,t:0};api.state.forest.up.dmg=0;
  const {api:loaded}=harness(api.state);assert.equal(loaded.state.forest.slots[0].w,'icewood');assert.equal(loaded.state.forest.slots[0].hp,90000);
});

test('initial hour-scale stages remain intact before the mandatory expansion chain',()=>{
  const {simulate}=require('./balance-sim.cjs');
  const result=simulate({seconds:4*3600,clicks:2,seed:42});
  const stages=result.events.filter(e=>(e[1]==='unlock'&&['dirt','copper','iron'].includes(e[2]))||e[1]==='tab');
  assert.deepEqual(stages.map(e=>e[2]),['dirt','copper','iron','workshop']);
  let previous=0;
  for(const [at,,id] of stages){const minutes=(at-previous)/60;assert.ok(minutes>=45&&minutes<=80,`${id}: ${minutes.toFixed(1)} minutes`);previous=at;}
  assert.equal(result.state.expansion.active,'mines');assert.equal(result.api.forestOn(),false);
});

