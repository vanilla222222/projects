'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({ console, performance, setTimeout });
const scripts = ['elements','graph','valence','stereo','naming-core','naming-chain','naming-ring','naming-scaffolds','naming-general','common-names-extra','naming-elements','properties','layout','smiles','name-lookup','reactions','reagent-library','reaction-stereo','reaction-rules','reaction-rules-extra','reaction-rules-extra2','reaction-aromatic','reaction-rules-extra3','retro-stock','retro','retro-search','retro-view','molecular-identity','path-finder'];
scripts.filter((name) => fs.existsSync(path.join(__dirname, '../js', name + '.js'))).forEach((name) => vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', name + '.js'), 'utf8'), context, { filename: name + '.js' }));
const run = (code) => vm.runInContext(code, context);
function search(start, target, opts) {
  context.a = start; context.b = target; context.opts = opts || {};
  return run('var job = pathFinderCreate(a,b,opts); while(job.status === "running") job.step(100); job;');
}
assert.equal(search('CCO','OCC').status, 'identical');
assert.equal(search('CCO','CC=O', {maxDepth:1}).status, 'found');
assert.equal(run('job.route.length'), 1);
assert.equal(run('job.route.every(link => retroForwardCheck(link.candidate, link.to))'), true);
assert.equal(run('job.route[0].from === job.start && job.route[0].to === job.target'), true);
assert.equal(search('CCO','CC(=O)O', {maxDepth:2}).status, 'found');
assert.equal(run('job.route.every(link => retroForwardCheck(link.candidate, link.to))'), true);
assert.equal(search('CCO','[He]', {maxDepth:1}).status, 'exhausted');
assert.notEqual(search('CCO','CC(=O)N', {budgetMs:1}).status, 'found');
assert.equal(run('pathFinderCreate("CCO","CC=O").cancel().status'), 'cancelled');
assert.equal(run('var cancelled = pathFinderCreate("CCO","CC=O"); cancelled.cancel(); cancelled.step().expanded'), 0);
assert.throws(() => run('pathFinderCreate("CCO.O","CC=O")'), /connected/);
assert.throws(() => run('pathFinderCreate("invalid","CC=O")'));
assert.notEqual(run('pathFinderKey("N[C@H](C)O")'), run('pathFinderKey("N[C@@H](C)O")'));
assert.equal(run('reactionParseCompound("ethanol").smiles'), 'CCO');
assert.equal(search('C=C','CC(=O)O', {maxDepth:3}).status, 'found');
assert.equal(run('job.route.length'), 2);
assert.equal(run('job.route[0].to === job.route[1].from'), true);
assert.equal(run('job.route.every(link => retroForwardCheck(link.candidate, link.to))'), true);
assert.notEqual(search('C=C','CC(=O)O', {maxDepth:1}).status, 'found');
assert.equal(run('pathFinderKey("CCO")'), run('pathFinderKey("OCC")'));
assert.equal(run('pathFinderKey("CC(=O)O")'), run('pathFinderKey("OC(C)=O")'));
assert.equal(run('pathFinderKey("Cc1ccccc1")'), run('pathFinderKey("c1ccc(C)cc1")'));
// Alternatives are independently forward verified and sorted by concrete costs.
assert.equal(search('C=C','CC(=O)O', {maxRoutes:3}).routes.length, 3);
assert.equal(run('job.routes.every(route => route.every(link => retroForwardCheck(link.candidate, link.to)))'), true);
assert.equal(run('job.routes[0].length <= job.routes[2].length'), true);
assert.equal(run('job.routes.every(route => route[0].fromKey === pathFinderKey(job.start) && route.at(-1).toKey === pathFinderKey(job.target))'), true);
assert.equal(search('CCO','CC=O', {forbiddenReagents:['PCC']}).status, 'exhausted');
assert.equal(run('job.diagnostics.reagents > 0'), true);
assert.match(run('pathFinderExplanation(job)'), /reagent/);
assert.equal(search('CCO','CC=O', {forbiddenRules:['oxidation']}).status, 'exhausted');
assert.equal(run('job.diagnostics.rules > 0'), true);
assert.equal(search('CCO','CCOC(C)=O', {stockPolicy:'custom',maxDepth:1}).status, 'exhausted');
assert.equal(run('job.diagnostics.inventory > 0'), true);
assert.match(run('pathFinderExplanation(job)'), /unavailable/);
assert.equal(search('CCO','CCOC(C)=O', {stockPolicy:'custom',availableMaterials:['acetic acid'],maxDepth:1}).status, 'found');
assert.equal(run('job.route[0].candidate.transform'), 'fischer');
assert.equal(search('CCO','CCOC(C)=O', {stockPolicy:'custom',availableMaterials:['OC(C)=O'],maxDepth:1}).status, 'found');
assert.throws(() => search('CCO','CC=O', {availableMaterials:['not a material']}), /recognized/);
assert.equal(search('C=C','CC(=O)O', {maxRoutes:1}).routes.length, 1);
assert.equal(search('CCO','CCOC(C)=O', {stockPolicy:'custom',availableMaterials:['acetic acid'],forbiddenReagents:['sulfuric acid'],maxDepth:1}).status, 'exhausted');
assert.equal(search('CCO','CCOC(C)=O', {stockPolicy:'custom',availableMaterials:['acetic acid'],forbiddenReagents:['h2so4'],maxDepth:1}).status, 'exhausted');
assert.equal(search('C=C','CC(=O)O', {maxNodes:1}).status, 'budget');
assert.match(run('pathFinderExplanation(job)'), /node limit/);
console.log('Path Finder engine: 44 checks passed.');

// Exercise the actual DOM controller with a minimal DOM, without browser packages.
class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.events = {}; this.disabled = false; this.value = ''; this.textContent = ''; }
  addEventListener(type, fn) { this.events[type] = fn; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  focus() { this.focused = true; }
  click() { if (!this.disabled && this.events.click) this.events.click({}); }
}
const ids = ['path-start','path-target','path-depth','path-run','path-cancel','path-status','path-results','path-example','path-route-count','path-stock-policy','path-inventory','path-forbidden-reagents','path-forbidden-rules'];
const nodes = Object.fromEntries(ids.map(id => [id, new Element('div')]));
nodes['path-depth'].value = '3';
nodes['path-route-count'].value = '3';
nodes['path-stock-policy'].value = 'builtin';
const timers = [];
let opened = 0, saved = null;
context.document = { getElementById(id) { return nodes[id]; }, createElement(tag) { return new Element(tag); } };
context.setTimeout = fn => timers.push(fn);
context.openStep = () => opened++;
context.saveRoute = doc => saved = doc;
run('var controller = createPathFinder({openInLab:openStep,saveRoute:saveRoute}); controller.show();');
assert.equal(nodes['path-start'].focused, true);
nodes['path-example'].click();
assert.equal(nodes['path-start'].value, 'ethanol');
nodes['path-run'].click();
assert.equal(nodes['path-run'].disabled, true);
while (timers.length) timers.shift()();
assert.match(nodes['path-status'].textContent, /route found/);
assert.equal(nodes['path-results'].children.length, 1);
nodes['path-results'].children[0].children.at(-1).children.at(-1).click();
assert.equal(opened, 1);
nodes['path-results'].children[0].children[1].click();
assert.equal(saved.version, 1);
assert.equal(saved.steps.length, 1);
assert.equal(saved.start, run('pathFinderStructure("CCO").smiles'));
assert.equal(saved.steps[0].candidate.transform, 'alcohol-oxidation');
nodes['path-start'].value = 'bad <img src=x>';
nodes['path-run'].click();
assert.equal(nodes['path-results'].children.length, 0);
assert.match(nodes['path-status'].textContent, /Not a recognized/);
nodes['path-start'].value = 'CCO';
nodes['path-target'].value = 'CC(=O)N';
nodes['path-run'].click();
nodes['path-cancel'].click();
while (timers.length) timers.shift()();
assert.match(nodes['path-status'].textContent, /cancelled/);
assert.equal(nodes['path-run'].disabled, false);
console.log('Path Finder DOM controller: 14 checks passed.');
