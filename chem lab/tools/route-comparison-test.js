'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const context = vm.createContext({ console, performance, setTimeout });
const scripts = ['elements','graph','valence','stereo','naming-core','naming-chain','naming-ring','naming-scaffolds','naming-general','common-names-extra','naming-elements','properties','layout','smiles','name-lookup','reactions','molecular-identity','reagent-library','reaction-stereo','reaction-rules','reaction-rules-extra','reaction-rules-extra2','reaction-aromatic','reaction-rules-extra3','reaction-rules-extra4','reaction-rules-extra5','reaction-catalog','reaction-evidence-core','reaction-evidence-named','retro-stock','retro','retro-families-extra','retro-search','retro-view','route-comparison','path-finder'];
scripts.filter((name) => fs.existsSync(path.join(root, 'js', name + '.js'))).forEach((name) => vm.runInContext(fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8'), context, { filename: name + '.js' }));
const run = (code) => vm.runInContext(code, context);
let checks = 0;
const check = (code, expected, label) => { assert.equal(run(code), expected, label); checks++; };
run(`var job=pathFinderCreate('C=C','CC(=O)O',{maxRoutes:3,maxDepth:3});while(job.status==='running')job.step(100);var summaries=routeComparisonSummaries(job);`);
check('job.routes.length>=2', true, 'real search supplies alternatives');
check('summaries.length===job.routes.length', true, 'one comparison column per route');
check('summaries.every(s=>s.stepCount===s.route.length && s.steps.length===s.stepCount)', true, 'step counts are exact');
check('summaries.every(s=>s.stepCount>=2)', true, 'known two-step endpoint distance');
check('summaries.every(s=>s.route.every(link=>retroForwardCheck(link.candidate,link.to)))', true, 'displayed real routes remain forward verified');
check('summaries.every(s=>s.sourcedSteps<=s.stepCount)', true, 'source count is per step, never inflated by citations');
check('summaries.every(s=>s.reagents.length>0)', true, 'required reagents are visible');
check('summaries.every(s=>s.assumptions.length>0 && s.limitations.length>0)', true, 'assumptions and limitations collected');
check(`(() => {const before=JSON.stringify(job);routeComparisonSummaries(job);return before===JSON.stringify(job)})()`, true, 'comparison does not mutate route search records');
assert.throws(() => run(`routeComparisonSummaries({...job,start:'CCO'})`), /same starting/); checks++;
assert.throws(() => run(`routeComparisonSummaries({...job,target:'CCN'})`), /same starting/); checks++;
assert.throws(() => run(`routeComparisonSummaries({...job,routes:[[{...job.route[0],to:'N'},...job.route.slice(1)]]})`), /disconnected/); checks++;
assert.throws(() => run(`routeComparisonSummaries({...job,routes:Array(6).fill(job.route)})`), /at most five/); checks++;
assert.throws(() => run(`routeComparisonSummaries({...job,routes:[[]]})`), /1–20/); checks++;
run(`var unknown=JSON.parse(JSON.stringify(job));unknown.routes=[unknown.routes[0]];unknown.routes[0].forEach(link=>{link.candidate.outcome={warnings:[]};link.candidate.outcomeRule='unknown';link.candidate.rule='unknown';link.candidate.transform='unknown'});var unknownSummary=routeComparisonSummaries(unknown)[0];`);
check('unknownSummary.sourcedSteps', 0, 'missing evidence is not counted as sourced');
check('unknownSummary.steps.every(s=>/No rule-specific/.test(s.scope))', true, 'missing scope is explicit');
run(`var concerns=JSON.parse(JSON.stringify(job));concerns.routes=[concerns.routes[0]];concerns.routes[0][0].candidate.minor=true;concerns.routes[0][0].candidate.stereo='racemic';concerns.routes[0][0].candidate.outcome.warnings=['Stereochemistry not established'];var concernSummary=routeComparisonSummaries(concerns)[0];`);
check('concernSummary.minorSteps', 1, 'minor-product route step counted');
check('concernSummary.stereoConcernSteps>=1', true, 'stereo concerns counted separately from yield');
check(`routeComparisonInventory({...job,options:{stockPolicy:'custom',availableMaterials:['methanol']}})('CO')`, 'Available in your list or starting material', 'custom co-reactant inventory recognizes names');
check(`routeComparisonInventory({...job,options:{stockPolicy:'custom'}})('CO')`, 'Not available in your list', 'missing custom co-reactant is disclosed');
check(`routeComparisonInventory({...job,options:{stockPolicy:'custom'}})('C=C')`, 'Available in your list or starting material', 'start is available without duplicating inventory');
check(`routeComparisonInventory({...job,options:{stockPolicy:'builtin'}})('CO').startsWith('Local stock')`, true, 'built-in co-reactant stock independently checked');
check(`(() => {var ester=pathFinderCreate('CCO','CCOC(C)=O',{maxRoutes:1,maxDepth:1,stockPolicy:'custom',availableMaterials:['acetic acid']});while(ester.status==='running')ester.step(100);var e=routeComparisonSummaries(ester)[0];return e.buildingBlocks.length===1 && e.inventoryComplete && e.buildingBlocks[0].availability.startsWith('Available');})()`, true, 'actual two-reactant ester route reports co-reactant coverage');
check(`(() => {var salts=JSON.parse(JSON.stringify(job));salts.routes=[salts.routes[0]];salts.routes[0][0].candidate.compounds.push({smiles:'[Na+].[I-]',role:'reagent'},{smiles:'[I-].[Na+]',role:'reagent'});return routeComparisonSummaries(salts)[0].reagents.filter(p=>p.smiles && routeComparisonKey(p.smiles)===routeComparisonKey('[Na+].[I-]')).length===1})()`, true, 'equivalent salt material/role entries deduplicate');

class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.attributes = {}; this.events = {}; this.textContent = ''; }
  append(...nodes) { this.children.push(...nodes); }
  appendChild(node) { this.children.push(node); return node; }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(type, fn) { this.events[type] = fn; }
  click() { if (this.events.click) this.events.click({}); }
}
const walk = (node) => [node, ...node.children.flatMap(walk)];
context.document = { createElement: (tag) => new Element(tag) };
context.container = new Element('div');
let saved = null, opened = null;
context.save = (doc) => { saved = doc; };
context.open = (compounds, conditions) => { opened = { compounds, conditions }; };
run(`routeComparisonRender(container,job,{saveRoute:save,openInLab:open})`);
assert.equal(walk(context.container).filter((n) => n.className === 'route-comparison-card').length, run('job.routes.length')); checks++;
assert.equal(walk(context.container).filter((n) => n.tagName === 'table').length, run('job.routes.length')); checks++;
assert.ok(walk(context.container).some((n) => n.textContent.includes('No yield, feasibility or safety score'))); checks++;
walk(context.container).find((n) => n.tagName === 'button' && n.textContent.startsWith('Save route 1')).click();
assert.equal(saved.version, 1); checks++;
assert.equal(saved.start, run('job.start')); checks++;
assert.equal(saved.steps.length, run('job.routes[0].length')); checks++;
walk(context.container).find((n) => n.tagName === 'button' && n.textContent.startsWith('Open step 1')).click();
assert.ok(opened.compounds.length > 0); checks++;
assert.ok(opened.conditions.solvents); checks++;
run(`var hostile=JSON.parse(JSON.stringify(job));hostile.routes=[hostile.routes[0]];hostile.routes[0][0].candidate.outcomeName='<img src=x onerror=alert(1)>';hostile.routes[0][0].candidate.outcome.evidence.scope='<script>bad</script>';routeComparisonRender(container,hostile,{});`);
assert.ok(walk(context.container).some((n) => n.textContent.includes('<img src=x onerror=alert(1)>'))); checks++;
assert.ok(walk(context.container).some((n) => n.textContent === '<script>bad</script>')); checks++;
assert.equal(walk(context.container).some((n) => n.innerHTML !== undefined), false); checks++;
assert.equal(walk(context.container).some((n) => n.tagName === 'img' || n.tagName === 'script'), false); checks++;
assert.ok(walk(context.container).filter((n) => n.tagName === 'a').every((n) => n.href.startsWith('https://') && n.rel === 'noopener noreferrer')); checks++;
const css = fs.readFileSync(path.join(root, 'css/route-comparison.css'), 'utf8');
assert.match(css, /grid-auto-flow:\s*column/); checks++;
assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*grid-auto-flow:\s*row/); checks++;
assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)/); checks++;
assert.match(css, /overflow-wrap:\s*anywhere/); checks++;
// Exercise the real Path Finder finish hook with the comparison module loaded.
const inputs = Object.fromEntries(['path-start','path-target','path-run','path-cancel','path-status','path-results','path-depth','path-route-count','path-stock-policy','path-inventory','path-forbidden-reagents','path-forbidden-rules','path-example'].map((id) => [id, new Element('div')]));
for (const el of Object.values(inputs)) { el.value = ''; el.focus = () => { el.focused = true; }; }
inputs['path-start'].value = 'ethanol'; inputs['path-target'].value = 'ethanal';
inputs['path-depth'].value = '1'; inputs['path-route-count'].value = '1'; inputs['path-stock-policy'].value = 'builtin';
const timers = [];
context.document.getElementById = (id) => inputs[id];
context.setTimeout = (fn) => timers.push(fn);
run(`var comparisonController=createPathFinder({saveRoute:save,openInLab:open});comparisonController.show();`);
inputs['path-run'].click();
let ticks = 0;
while (timers.length && ticks++ < 1000) timers.shift()();
assert.equal(inputs['path-run'].disabled, false); checks++;
assert.match(inputs['path-status'].textContent, /candidate route found/); checks++;
assert.equal(walk(inputs['path-results']).filter((n) => n.className === 'route-comparison-card').length, 1); checks++;
walk(inputs['path-results']).find((n) => n.tagName === 'button' && n.textContent.startsWith('Save route 1')).click();
assert.equal(saved.steps.length, 1); checks++;
assert.equal(inputs['path-start'].focused, true); checks++;
console.log('Route comparison: ' + checks + ' model, DOM and responsive-style checks passed.');
