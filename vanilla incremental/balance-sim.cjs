// Expected-yield progression model; use the actual game's prices and bonuses.
// Reference player: two mining actions per second, 15% upgrade spending reserve.
const {harness} = require('./model-harness.cjs');
function simulate({seconds=3600, clicks=2, log=false, configure=()=>{}, seed=42, rebirth=true}={}) {
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const {api:a}=harness(undefined,random);const s=a.state;configure(a);
  const events=[];
  let autoFraction=0, lastExpansion='';
  function buyBasics() {
    for(const o of a.ORES) {
      const st=s.ores[o.id];if(!st.found)continue;
      for(const u of a.UPGRADES.filter(u=>!u.max)) {
        let guard=0;
        while(a.upgPlan(o.id,u).total<=st.amt*.15&&guard++<200)a.buy(o.id,u);
      }
      const unique=a.UPGRADES.find(u=>u.id==='unique');
      if(a.UNIQUES[o.id]&&!st.unique&&a.upgPlan(o.id,unique).can){a.buy(o.id,unique);if(st.unique)events.push([time,'unlock',o.id]);}
      if(s.ores.dirt.unique&&a.mastPlan(o.id).total<=st.amt*.15)a.buyMastery(o.id);
    }
    if(a.hasAuto())for(const k of ['bulk','speed']){
      let n=0;while(a.autoPlan(k).can&&a.autoPlan(k).total<=s.ores.obsidian.amt*.25&&n++<100)a.buyAuto(k);
    }
    if(s.ores.silver.unique&&a.pickPlan().can&&a.pickPlan().total<=s.ores.silver.amt*.25)a.buyPick();
    a.checkAch();
  }
  function industry() {
    if(!s.ores.iron.unique)return;
    const recipes=a.RECIPES.filter(r=>a.recOpen(r.id)&&(s.expansion.active!=='mill'||r.id!=='steel'));
    const offset=Math.floor(time/60)%recipes.length;
    for(let i=0;i<a.slotCount();i++)a.setRecipe(i,s.expansion.active==='smelt'&&i<Math.min(2,a.slotCount())?'electrum':recipes[(offset+i)%recipes.length].id);
    a.smeltStep(1);
    if(time%5!==0)return;
    for(const r of a.RECIPES.filter(r=>a.recOpen(r.id)))for(const u of r.ups){
      if(u.max&&s.smelt.up[r.id][u.id]>=u.max)continue;
      const p=a.ingotPlan(r.id,u);
      if(!p.can||(!u.max&&p.total>s.smelt.ingots[r.id]*.15))continue;
      a.buyIngot(r.id,u);
    }
    if(a.extraOpen())for(const u of a.SMELT_UPS)a.buyExtra(u);
    if(!s.workshopBuilt&&s.smelt.ingots.copper>=a.WORKSHOP_BUILD){a.constructWorkshop();events.push([time,'tab','workshop']);}
    if(s.workshopBuilt)for(const p of a.WORKSHOP){
      if(s.workshop[p.id]>=p.max||!a.researchOpen(p))continue;
      if(a.researchCost(p).every(c=>c.amount<=(c.kind==='ingots'?s.smelt.ingots[c.id]:s.mill.planks[c.id])*.15))a.buyResearch(p);
    }
  }
  function forestry() {
    if(!a.forestOn())return;
    if(a.millOn()&&a.expansionLevel('forest')===5&&s.forest.wood.icewood.found&&a.availableWoods().some(w=>w.id==='icewood'))s.expansion.plant='icewood';
    a.forestStep(1);
    let hits=clicks;
    const open=s.forest.slots.slice(0,a.treeSlots());
    if(time%30===0&&s.mill.coal<100){
      const fuel=open.map((t,i)=>({t,i})).filter(({t})=>t.w).sort((x,y)=>a.coalGain(y.t.w)-a.coalGain(x.t.w))[0];
      if(fuel)a.burn(fuel.i);
    }
    const ready=open.map((t,i)=>({t,i})).filter(({t})=>t.w).sort((a,b)=>a.t.hp-b.t.hp);
    for(const {t,i} of ready){
      if(!hits)break;
      if(t.hp/a.chopDmg()/Math.max(1,clicks)>120){a.burn(i);continue;}
      const n=Math.min(hits,Math.ceil(t.hp/a.chopDmg()));a.chop(i,n*a.chopDmg());hits-=n;
    }
    if(time%5===0){
      for(const u of a.FUPS){const p=a.fupPlan(u);if(p.can&&(u.id==='mill'||p.n<=s.forest.wood[p.w].amt*.5))a.buyFup(u);}
      for(const w of a.WOODS)for(const u of a.UPGRADES.filter(u=>!u.max)){
        const p=a.woodPlan(w.id,u);if(p.can&&p.total<=s.forest.wood[w.id].amt*.15)a.buyWood(w.id,u);
      }
    }
    if(a.millOn()){
      const woods=a.WOODS.filter(w=>s.forest.wood[w.id].found);
      for(let i=0;i<4;i++){
        if(s.mill.slots[i].busy)continue;
        const supplied=[...woods].sort((x,y)=>s.forest.wood[y.id].amt-s.forest.wood[x.id].amt);
        a.setSaw(i,supplied[0]?.id||'');
      }
      a.millStep(1);
      a.beamStep(1);
      if(time%5===0)for(const w of a.PLANKS)for(const u of w.ups){const p=a.plankPlan(w.id,u);if(p.can&&p.total<=s.mill.planks[w.id]*.15)a.buyPlank(w.id,u);}
    }
  }
  let time=0;
  for(time=1;time<=seconds;time++){
    const p=a.PICKS[a.pickTier()];let area=0;
    for(let x=-p.r;x<=p.r;x++)for(let y=-p.r;y<=p.r;y++)if(a.inPick(p,x,y))area++;
    const manual=clicks*(area===1?1:area*.8);
    const rate=manual+(a.hasAuto()?(1+s.auto.bulk)/a.autoInterval():0);
    const tw=a.totalWeight();
    const special=s.ores.obsidian.unique>0;
    for(const o of a.ORES){
      const chance=a.oreWeight(o)/tw;if(!chance)continue;
      const visits=rate*chance;
      const expected=rate*(chance+(special?.01*a.workshopSpecial()*10:0));
      const gain=expected*a.oreGain(o.id)*(special?1.075:1);
      const st=s.ores[o.id];st.amt+=gain;st.total+=gain;st.run+=gain;st.found+=visits;
      a.recordBlueprintOre(o.id,gain);
    }
    autoFraction+=rate;s.stats.tiles+=Math.floor(autoFraction);autoFraction%=1;
    a.recordBlueprint('tiles',rate);
    if(a.BP.open(s.expansion,'mines')){const geodes=rate*Math.min(.2,.025*a.workshopSpecial());s.expansion.geodes+=geodes;s.expansion.geodesTotal+=geodes;a.recordBlueprint('geodes',geodes);}
    s.stats.layers=Math.floor(s.stats.tiles/100);s.layer=1+s.stats.layers;s.stats.time++;
    if(time%5===0)buyBasics();
    if(rebirth&&s.ores.copper.unique&&!s.rb.count){a.doRebirth();events.push([time,'rebirth',s.rb.points]);let points=s.rb.points;for(const o of a.ORES){s.rb.alloc[o.id]=Math.floor(points/9);if(points%9> a.ORES.indexOf(o))s.rb.alloc[o.id]++;}a.syncFlags();}
    const forestBefore=a.forestOn(),millBefore=a.millOn();
    industry();forestry();
    a.sampleBlueprintRates(1);
    a.ensureBlueprintChain();
    if(time%5===0)while(a.BP.status(s.expansion).ready)a.claimBlueprint();
    if(lastExpansion!==s.expansion.active){if(lastExpansion)events.push([time,'expansionComplete',lastExpansion]);if(s.expansion.active)events.push([time,'expansionStart',s.expansion.active]);lastExpansion=s.expansion.active;}
    if(!forestBefore&&a.forestOn())events.push([time,'tab','forest']);
    if(!millBefore&&a.millOn())events.push([time,'tab','mill']);
    if(time%600===0&&log)console.log(JSON.stringify({minutes:time/60,copper:Math.round(s.ores.copper.amt),iron:Math.round(s.ores.iron.amt),bars:Object.fromEntries(Object.entries(s.smelt.ingots).map(([k,v])=>[k,Math.round(v)])),spruce:Math.round(s.forest.wood.spruce.amt),workshop:s.workshopBuilt}));
  }
  return {events,state:s,api:a};
}
if(require.main===module){const result=simulate({seconds:7*3600,log:true});console.log(JSON.stringify(result.events));}
module.exports={simulate};

