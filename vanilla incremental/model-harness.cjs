const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/game.js', 'utf8');

function harness(saved, random = () => 0.5) {
  const storage = new Map(saved ? [['vanilla-incremental-save-v1', JSON.stringify(saved)]] : []);
  const nodes = new Map(), timers = new Map();
  let nextTimer = 1;
  function element() {
    return {children: [], dataset: {}, style: {setProperty() {}}, classList: {add() {},remove() {},toggle() {}}, setAttribute() {},removeAttribute() {},addEventListener() {},replaceChildren() {this.children=[];},appendChild(e) {this.children.push(e);},querySelectorAll() {return Array.from({length:100},element);}};
  }
  const math = Object.create(Math); math.random = random;
  const context = vm.createContext({
    console, Math: math, Date, performance: {now: () => 0}, confirm: () => true,
    localStorage: {getItem: k => storage.get(k) || null, setItem: (k,v) => storage.set(k,v)},
    setTimeout: fn => {const id=nextTimer++;timers.set(id,fn);return id;}, clearTimeout: id => timers.delete(id),
    document: {getElementById(id) {if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);}, createElement: element},
  });
  // Run the actual game model without its browser startup. Keep original functions
  // under test; suppress unrelated rendering in purchase/rebirth actions.
  const end = source.indexOf("  $('saveBtn').addEventListener");
  assert.ok(end > 0);
  vm.runInContext(source.slice(0,end) + `
    const originalRenderGrid = renderGrid; floatText=()=>{};
    renderWallet=()=>{};renderForest=()=>{};renderSmelt=()=>{};renderMill=()=>{};renderAll = () => {}; renderGrid = () => {}; buildTabs = () => {}; toast = () => {};
    globalThis.api = {get state() {return S;}, fresh, load, save, WORKSHOP, UPGRADES, UNIQUES,
      buyResearch, researchCost, researchOpen, oreGain, autoInterval, smeltYield, chopDmg,
      workshopSpecial, newGrid, doRebirth, buy, hasAuto, originalRenderGrid, renderGoal,
      WORKSHOP_BUILD, constructWorkshop, checkAch, cost, plan, upgPlan, mastPlan, autoPlan, pickPlan, ingotPlan, fupPlan, woodPlan, plankPlan,
      oreWeight, totalWeight, runPoints, rebirthGain, pickTier, PICKS, inPick, ORES, RECIPES, SMELT_UPS, FUPS, WOODS, PLANKS, SIZE, SPECIALS,
      buyMastery, buyAuto, buyPick, buyIngot, buyExtra, buyFup, buyWood, buyPlank, autoBuy,
      hasOffline, offEff, offlineGain, slotCount, recOpen, extraOpen, extraVis, setRecipe, setSaw, forestOn, millOn, treeSlots, autoSlots,
      smeltStep, forestStep, millStep, chop, burn, woodGain, coalGain, digAt, millTime, availableWoods, rollWood,
      mine(n) {
        let done=0;
        while(done<n){
          const i=S.grid.findIndex(c=>!c.dug);
          if(i<0){S.layer++;S.stats.layers++;S.grid=newGrid();continue;}
          const list=[];digAt(i,list);done+=list.length;
        }
      },
      syncFlags() {ALLOC=S.rb.alloc;SPECIAL_ON=S.ores.obsidian.unique>0;ZINC_ON=S.smelt.up.copper.zinc>0;QUARTZ_ON=S.smelt.extra.quartz>0;}
    };
  })();`, context);
  return {api: context.api, storage, nodes, timers};
}

module.exports = {harness};
