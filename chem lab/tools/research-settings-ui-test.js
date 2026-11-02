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
 constructor(tag){this.tagName=tag;this.children=[];this.events={};this.attributes={};this.value='';this._text='';this.dataset={};this.classList={toggle(){}};}
 append(...nodes){this.children.push(...nodes)}appendChild(n){this.children.push(n);return n}replaceChildren(...nodes){this.children=nodes}setAttribute(k,v){this.attributes[k]=v}addEventListener(k,fn){this.events[k]=fn}get options(){return this.children}
 set innerHTML(v){this.children=[]}get innerHTML(){return ''}set textContent(v){this._text=String(v);this.children=[]}get textContent(){return this._text}
 focus(){}click(){this.events.click?.({})}querySelectorAll(selector){return walk(this).filter(n=>(n.className||'').split(' ').includes(selector.slice(1)))}
}
const walk=n=>[n,...n.children.flatMap(walk)],nodes={},saved={};
for(const id of ['path-start','path-target','path-depth','path-route-count','path-stock-policy','path-recipe-tree','path-protection-policy','path-run','path-cancel','path-status','path-results','path-example','path-search-limits','path-inventory','path-forbidden-rules','path-forbidden-reagents','path-allowed-protecting-groups','path-managed-protection'])nodes[id]=new Element('div');
Object.assign(nodes['path-depth'],{value:'1'});nodes['path-route-count'].value='1';nodes['path-stock-policy'].value='builtin';nodes['path-recipe-tree'].value='off';nodes['path-protection-policy'].value='auto';
context.localStorage={getItem:k=>saved[k]||null,setItem:(k,v)=>saved[k]=v};context.document={createElement:tag=>new Element(tag),getElementById:id=>nodes[id]||null};context.host=new Element('div');
run(`var changed=0;var controls=planningSettingsCreate(host,()=>changed++);`);
const field=label=>walk(context.host).find(n=>n.attributes?.['aria-label']===label),button=text=>walk(context.host).find(n=>n.tagName==='button'&&n.textContent===text);
let f=field('Rank routes by');f.value='conditions';f.events.change();check(`planningSettingsCurrent().priority`,'conditions','Priority control wired');
f=field('Minimum recorded temperature (°C)');f.value='100';f.events.change();f=field('Maximum recorded temperature (°C)');f.value='0';f.events.change();assert.throws(()=>run('controls.read()'));checks++;
f.value='150';f.events.change();check('controls.read().minTemperature',100,'Valid numeric constraints read');
const name=field('Profile name');name.value='My laboratory';button('Save profile').click();assert.ok(saved['chem-lab-planning-profiles'].includes('My laboratory'));checks++;
button('Export current JSON').click();const json=field('Planning profile JSON');let exported=JSON.parse(json.value);assert.equal(exported.research.priority,'conditions');checks++;assert.equal(exported.legacy.depth,'1');checks++;
f=field('Rank routes by');f.value='steps';f.events.change();button('Import / apply JSON').click();check('planningSettingsCurrent().priority','conditions','Portable profile restores settings');
json.value='{"format":"other"}';button('Import / apply JSON').click();check('planningSettingsCurrent().priority','conditions','Invalid import cannot overwrite settings');
f=field('Planning profile');f.value='simple';button('Apply profile').click();check('planningSettingsCurrent().allowPressure',false,'Simple equipment profile');check('planningSettingsCurrent().maxTemperature',80,'Profile numeric range');
run('delete planningSettingsCurrent.value');check('planningSettingsCurrent().allowCryogenic',false,'Current settings survive reload');
assert.equal(field('Excluded intermediate functional groups (Ctrl / Cmd to select several)').multiple,true);checks++;
assert.throws(()=>run(`planningProfileImport('x'.repeat(50001))`));checks++;
assert.throws(()=>run(`planningProfileImport(JSON.stringify({format:'chem-lab-planning-profile',version:1,research:{allowPressure:'false'}}))`));checks++;
// Exercise the actual controller with a hostile-to-this-route temperature range.
context.host=new Element('div');nodes['path-research-settings']=context.host;nodes['path-start'].value='CCO';nodes['path-target'].value='CC=O';
run(`planningSettingsCurrent({minTemperature:200,maxTemperature:250,budgetMs:500,maxNodes:5});var timers=[];setTimeout=fn=>timers.push(fn);var planner=createPathFinder({});`);
nodes['path-run'].click();run('while(timers.length)timers.shift()()');assert.match(nodes['path-status'].textContent,/No route found/);checks++;
const pickSaved=field('Planning profile');pickSaved.value='saved:0';button('Delete saved profile').click();assert.equal(JSON.parse(saved['chem-lab-planning-profiles']).length,0);checks++;
const css=fs.readFileSync(path.join(root,'css/workbench.css'),'utf8');assert.match(css,/research-layout\{display:grid/);checks++;assert.match(css,/@media\(max-width:720px\)/);checks++;
assert.match(html,/id="retro-research-settings"/);checks++;assert.match(html,/id="path-research-settings"/);checks++;
console.log('Research settings UI/profiles: '+checks+' checks passed.');
