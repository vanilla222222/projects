'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const ctx = vm.createContext({ console, performance, setTimeout, clearTimeout });
for (const match of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="([^"]+)"/g)) {
  if (match[1] !== 'js/app.js') vm.runInContext(fs.readFileSync(path.join(root, match[1]), 'utf8'), ctx, { filename: match[1] });
}
const run = code => vm.runInContext(code, ctx);
let checks = 0;
function check(code, expected, label) { assert.equal(run(code), expected, label); checks++; }
function search(options) {
  ctx.recipeOptions = options;
  return run('var recipeJob = pathFinderCreate("CCO","CCOC(C)=O",recipeOptions); while(recipeJob.status === "running") recipeJob.step(100); recipeJob;');
}

search({ stockPolicy: 'custom', maxDepth: 1, budgetMs: 10000 });
check('recipeJob.status', 'exhausted', 'Default linear search still rejects an unavailable esterification precursor');
check('recipeJob.diagnostics.inventory > 0', true, 'The default mode retains its unavailable-building-block diagnostic');
search({ stockPolicy: 'custom', maxDepth: 1, recipeTree: true, budgetMs: 10000 });
check('recipeJob.status', 'exhausted', 'A one-level tree cannot hide the acid preparation');
search({ stockPolicy: 'custom', maxDepth: 2, recipeTree: true, budgetMs: 10000 });
check('recipeJob.status', 'found', 'Recipe mode recursively prepares the unavailable acid');
check('recipeJob.recipeTrees.length', 3, 'Complete Fischer, Mitsunobu and acyl-chloride recipe trees are returned');
check('recipeJob.options.recipeTree', true, 'The opt-in mode is recorded in job options');
check('recipeJob.recipeTrees[0].metrics.steps', 2, 'The tree contains acid preparation and esterification');
check('pathFinderKey(recipeJob.recipeTrees[0].target) === pathFinderKey("CCOC(C)=O")', true, 'The tree root is the requested target');
check(`(()=>{
  const walk=node=>{
    if(!node.candidate)return !!node.stock&&pathFinderKey(node.target)===pathFinderKey('CCO');
    if(!retroForwardCheck(node.candidate,node.target))return false;
    if(node.children.length!==node.candidate.precursors.length)return false;
    const wanted=new Set(node.candidate.precursors.map(p=>pathFinderKey(p.smiles)));
    return node.children.every(child=>wanted.has(pathFinderKey(child.target))&&walk(child));
  };
  return recipeJob.recipeTrees.every(walk);
})()`, true, 'Every reaction is forward verified, every precursor has a child, and every leaf is the starting material');
check(`(()=>{
  const names=[];const walk=node=>{if(node.candidate)names.push(node.candidate.transform);(node.children||[]).forEach(walk);};
  walk(recipeJob.recipeTrees[0]);return names.includes('fischer')&&names.some(id=>id.includes('oxidation'));
})()`, true, 'The recipe uses an oxidation branch followed by Fischer esterification');
check(`(()=>{
  const tree=recipeJob.recipeTrees.find(node=>node.candidate&&node.candidate.transform==='mitsunobu');if(!tree)return false;
  const names=[];const walk=node=>{if(node.candidate)names.push(node.candidate.transform);(node.children||[]).forEach(walk);};
  walk(tree);return names.join(',')==='mitsunobu,acid-oxidation'&&tree.metrics.steps===2;
})()`, true, 'The Mitsunobu alternative recursively prepares acetic acid before esterification');
check(`(()=>{
  const tree=recipeJob.recipeTrees.find(node=>node.candidate&&node.candidate.transform==='ester-acyl-chloride');if(!tree)return false;
  const names=[];const walk=node=>{if(node.candidate)names.push(node.candidate.transform);(node.children||[]).forEach(walk);};
  walk(tree);return names.join(',')==='ester-acyl-chloride,acid-chloride,acid-oxidation'&&tree.metrics.steps===3;
})()`, true, 'The alternative tree prepares acetyl chloride before esterification');

search({ stockPolicy: 'custom', availableMaterials: ['acetic acid'], maxDepth: 1, recipeTree: true, budgetMs: 10000 });
check('recipeJob.status', 'found', 'An explicitly stocked intermediate can terminate a branch immediately');
check('recipeJob.recipeTrees[0].metrics.steps', 1, 'Stocked acid avoids unnecessary recursive chemistry');
search({ stockPolicy: 'custom', maxDepth: 2, recipeTree: true, forbiddenRules: ['oxidation'], budgetMs: 10000 });
check('recipeJob.status', 'exhausted', 'Reaction filters apply to intermediate preparations as well as the root');
check('recipeJob.diagnostics.rules > 0', true, 'Intermediate filter rejections are diagnosed');
search({ stockPolicy: 'custom', maxDepth: 2, recipeTree: true, budgetMs: 1 });
check('recipeJob.status !== "found"', true, 'A partial search cannot emit an unverified tree');
check('pathFinderCreate("CCO","CCOC(C)=O",{stockPolicy:"custom",maxDepth:2,recipeTree:true}).cancel().status', 'cancelled', 'Recipe search supports cancellation');
check('pathFinderCreate("CCO","CCO",{recipeTree:true}).status', 'identical', 'Identical endpoints do not trigger a recursive search');

// Exercise the real controller with the opt-in setting enabled.
class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.events = {}; this.disabled = false; this.value = ''; this.textContent = ''; }
  set id(value) { this._id = value; nodes[value] = this; }
  get id() { return this._id; }
  addEventListener(type, fn) { this.events[type] = fn; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  focus() { this.focused = true; }
  click() { if (!this.disabled && this.events.click) this.events.click({}); }
}
const ids = ['path-start','path-target','path-depth','path-run','path-cancel','path-status','path-results','path-example','path-route-count','path-stock-policy','path-recipe-tree','path-inventory','path-forbidden-reagents','path-forbidden-rules','path-search-limits'];
const nodes = Object.fromEntries(ids.map(id => [id, new Element('div')]));
nodes['path-start'].value = 'CCO';
nodes['path-target'].value = 'CCOC(C)=O';
nodes['path-depth'].value = '2';
nodes['path-route-count'].value = '1';
nodes['path-stock-policy'].value = 'custom';
nodes['path-recipe-tree'].value = 'on';
const timers = [];
ctx.document = { getElementById: id => nodes[id] || null, createElement: tag => new Element(tag) };
ctx.setTimeout = fn => timers.push(fn);
ctx.recipeController = run('createPathFinder({openInLab:function(){}})');
assert.match(nodes['path-search-limits'].textContent, /Recipe depth is capped at 8/); checks++;
nodes['path-run'].click();
while (timers.length) timers.shift()();
assert.match(nodes['path-status'].textContent, /rule-verified recipe tree found/); checks++;
assert.match(nodes['path-status'].textContent, /Every leaf is available/); checks++;
assert.equal(nodes['path-results'].children.length, 1); checks++;
assert.equal(nodes['path-results'].children[0].children[0].textContent.includes('2 reaction steps'), true); checks++;
const serialized = (function text(node) { return node.textContent + ' ' + node.children.map(text).join(' '); })(nodes['path-results']);
assert.match(serialized, /Prepare intermediate/); checks++;
assert.match(serialized, /Starting material/); checks++;
assert.doesNotMatch(serialized, /unavailable building blocks in rejected branches/); checks++;
// A page with the pre-feature markup still receives the opt-in control.
delete nodes['path-recipe-tree'];
const legacyControls = new Element('div');
nodes['path-stock-policy'].parentElement = legacyControls;
run('createPathFinder({openInLab:function(){}})');
assert.equal(!!nodes['path-recipe-tree'], true); checks++;
assert.equal(nodes['path-recipe-tree'].value, 'off'); checks++;
assert.equal(legacyControls.children.length, 1); checks++;
console.log('Recipe Tree mode: ' + checks + ' checks passed.');
