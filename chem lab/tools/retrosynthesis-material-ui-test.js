'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const context = vm.createContext({ console, performance, setTimeout, clearTimeout });
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/<script src="([^"]+)"/g)) {
  if (match[1] !== 'js/app.js') vm.runInContext(fs.readFileSync(path.join(root, match[1]), 'utf8'), context, { filename: match[1] });
}
const run = (code) => vm.runInContext(code, context);
let checks=0;
function check(code,expected,label){assert.equal(run(code),expected,label);checks++;}
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.events={};this.dataset={};this.attributes={};this._text='';this.classList={toggle(){}};}
 append(...nodes){this.children.push(...nodes)}appendChild(n){this.children.push(n);return n}replaceChildren(...nodes){this.children=nodes}setAttribute(k,v){this.attributes[k]=v}addEventListener(k,fn){this.events[k]=fn}
 set innerHTML(v){this.children=[]}get innerHTML(){return ''}set textContent(v){this._text=String(v);this.children=[]}get textContent(){return this._text}
 get options(){return this.children}
 querySelectorAll(selector){return walk(this).filter(n=>(n.className||'').split(' ').includes(selector.slice(1)))}
}
const walk=n=>[n,...n.children.flatMap(walk)];
const ids={};const storage={};context.localStorage={getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v};context.document={createElement:tag=>new Element(tag),getElementById:id=>ids[id]||(ids[id]=new Element('div'))};context.setTimeout=fn=>fn();
context.thumb=()=>new Element('canvas');context.toast=()=>{};let opened,sent,saved;context.openLab=(compounds,conditions,output)=>opened={compounds,conditions,output};context.send=(fragment)=>sent=fragment;context.saveRoute=doc=>saved=doc;
run(`var g=retroFromSmiles('CCO');var view=createRetroView({graph:g,targetAtomIds:()=>g.atoms.map(a=>a.id),structureThumbnail:thumb,toast,openInLab:openLab,sendScheme:send});view.open();`);
assert.ok(walk(ids['retro-summary']).some(n=>n.textContent==='Target output state'));checks++;
assert.ok(walk(ids['retro-list']).some(n=>n.textContent==='Precursor state'));checks++;
let targetPanel=walk(ids['retro-summary']).find(n=>n.className==='rx-planning-material');let select=walk(targetPanel).find(n=>n.tagName==='select');select.value='L';select.events.change();
check(`reactionPlanningMaterialState('OCC').phase`,'L','Equivalent SMILES share a phase record');
let toggle=walk(ids['retro-summary']).find(n=>n.type==='checkbox');toggle.checked=true;toggle.events.change();
assert.ok(walk(ids['retro-summary']).some(n=>n.textContent==='Purification → Pure L'));checks++;
let card=walk(ids['retro-list']).find(n=>(n.className||'').split(' ').includes('retro-card'));card.events.click();
check('view.state.selected',0,'Candidate selectable');
const phasePanel=walk(card).find(n=>n.className==='rx-planning-material');let stopped=0;phasePanel.events.click({stopPropagation(){stopped++}});phasePanel.events.keydown({stopPropagation(){stopped++}});assert.equal(stopped,2);checks++;
select=walk(phasePanel).find(n=>n.tagName==='select');select.value='S';select.events.change();
ids['retro-lab'].events.click();assert.equal(opened.output.materialState.phase,'L');checks++;assert.ok(opened.compounds.some(c=>c.materialState.phase==='S'));checks++;
run('view.open();');card=walk(ids['retro-list']).find(n=>(n.className||'').split(' ').includes('retro-card'));card.events.click();ids['retro-send'].events.click();assert.ok(sent.annotations.some(a=>a.above==='Purification (idealized)'));checks++;
run(`var job=pathFinderCreate('C=C','CCO',{maxDepth:1,maxRoutes:1});while(job.status==='running')job.step(100);`);
context.container=new Element('div');run(`routeComparisonRender(container,job,{thumbnail:thumb,saveRoute,openInLab:openLab})`);
assert.ok(walk(context.container).some(n=>n.className==='route-comparison-state-row'));checks++;
const panel=walk(context.container).find(n=>n.className==='rx-planning-material'&&n.children[0].textContent==='Product output state');select=walk(panel).find(n=>n.tagName==='select');select.value='G';select.events.change();
walk(context.container).find(n=>n.textContent==='Save route 1 to workspace').events.click();assert.equal(saved.steps[0].toState.phase,'G');checks++;
walk(context.container).find(n=>n.tagName==='button'&&n.textContent.includes('Open')&&n.textContent.includes('Reactions')).events.click();assert.equal(opened.output.materialState.phase,'G');checks++;
run(`var recipe={target:'CCO',candidate:job.route[0].candidate,children:[{target:'C=C',candidate:null,children:[]}],metrics:{steps:1}};job.recipeTrees=[recipe];pathFinderRecipeRender(container,job,{openInLab:openLab});`);
assert.ok(walk(context.container).some(n=>n.textContent==='Prepared product state'));checks++;assert.ok(walk(context.container).some(n=>n.textContent==='Feedstock state'));checks++;assert.ok(walk(context.container).some(n=>n.textContent==='Purification → Pure G'));checks++;
run(`delete reactionPlanningMaterialState.states;`);check(`reactionPlanningMaterialState('CCO').phase`,'G','Planning phases persist across reload');
run(`reactionPlanningMaterialState('NC[C@H](O)C',{phase:'S'});`);check(`reactionPlanningMaterialState('NC[C@@H](O)C').phase`,'unknown','Opposite stereoisomer does not inherit phase');
run(`var original=JSON.stringify(job.route);reactionPlanningRouteLink(job.route[0]);`);check('JSON.stringify(job.route)===original',true,'Annotations do not mutate chemistry/search records');
run(`var chiralGraph=retroFromSmiles('N[C@H](O)C');var chiralView=createRetroView({graph:chiralGraph,targetAtomIds:()=>chiralGraph.atoms.map(a=>a.id),structureThumbnail:thumb,toast});chiralView.open();`);check(`chiralView.state.tree.root.smiles.includes('@')`,true,'Popup preserves drawn target stereochemistry');
console.log('Retrosynthesis material UI: '+checks+' checks passed.');
