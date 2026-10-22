'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({ console, performance, setTimeout });
const scripts = ['elements','graph','valence','stereo','naming-core','naming-chain','naming-ring','naming-scaffolds','naming-general','common-names-extra','naming-elements','properties','layout','smiles','name-lookup','reactions','reagent-library','reaction-stereo','reaction-rules','reaction-rules-extra','reaction-rules-extra2','reaction-aromatic','reaction-rules-extra3','retro-stock','retro','retro-search','retro-view','path-finder','route-workspace'];
scripts.forEach((name) => vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', name + '.js'), 'utf8'), context, { filename: name + '.js' }));
const run = (code) => vm.runInContext(code, context);
run(`var job = pathFinderCreate('C=C','CC(=O)O',{maxDepth:3}); while(job.status === 'running') job.step(100); if(job.status!=='found')throw Error('Fixture route not found'); var fixture={version:1,name:'Hydration and oxidation',start:'C=C',target:'CC(=O)O',steps:job.route}; var route=routeWorkspaceNormalize(fixture);`);
assert.equal(run('route.steps.length'), 2);
assert.equal(run('routeWorkspaceValidate(route).status'), 'verified');
assert.equal(run('routeWorkspaceValidate(route).issues.length'), 0);
assert.equal(run('route.steps[0].ruleId'), run('job.route[0].candidate.outcomeId'));
assert.equal(run('routeWorkspaceValidate(routeWorkspaceImport(JSON.stringify(route))[0]).status'), 'verified');
assert.equal(run(`routeWorkspaceImport(JSON.stringify({format:'chem-lab-route-workspace',version:1,routes:[route]})).length`), 1);
assert.equal(run(`routeWorkspaceValidate({...route,steps:route.steps.slice().reverse()}).status`), 'invalid');
assert.equal(run(`routeWorkspaceValidate({...route,steps:route.steps.slice(1)}).status`), 'invalid');
assert.equal(run(`routeWorkspaceValidate({...route,steps:[]}).status`), 'invalid');
assert.equal(run(`routeWorkspaceValidate({...route,start:'CCO',target:'OCC',steps:[]}).status`), 'verified');
assert.equal(run(`routeWorkspaceValidateStep({...route.steps[0],to:'N'}).status`), 'unverified');
assert.equal(run(`routeWorkspaceValidateStep({...route.steps[0],from:'N'}).status`), 'invalid');
assert.equal(run(`routeWorkspaceValidateStep({...route.steps[0],from:'bad input'}).status`), 'invalid');
assert.equal(run(`routeWorkspaceValidateStep({...route.steps[0],ruleId:'nonexistent'}).status`), 'unverified');
assert.throws(() => run(`routeWorkspaceImport('not json')`));
assert.throws(() => run(`routeWorkspaceImport(JSON.stringify({...route,version:2}))`), /version/);
assert.throws(() => run(`routeWorkspaceImport(JSON.stringify({format:'chem-lab-route-workspace',version:2,routes:[]}))`), /version/);
assert.throws(() => run(`routeWorkspaceImport(JSON.stringify({...route,steps:Array(21).fill(route.steps[0])}))`), /at most/);
assert.throws(() => run(`routeWorkspaceImport(JSON.stringify({...route,steps:[{...route.steps[0],compounds:[{role:'other',smiles:'CCO'}]}]}))`), /role/);
assert.throws(() => run(`routeWorkspaceImport(JSON.stringify({...route,steps:[{...route.steps[0],to:'bad input'}]}))`));
assert.throws(() => run(`routeWorkspaceImport(' '.repeat(1000001))`), /1 MB/);
assert.notEqual(run(`routeWorkspaceKey('N[C@H](C)O')`), run(`routeWorkspaceKey('N[C@@H](C)O')`));
assert.equal(run(`routeWorkspaceNormalize({start:'N[C@H](C)O',target:'N[C@H](C)O',steps:[]}).start.includes('@')`), true);
assert.equal(run(`routeWorkspaceCsvEscape('=HYPERLINK("x")')`).startsWith('"\''), true);
assert.equal(run(`routeWorkspaceCsvEscape(' @SUM(A1:A2)').startsWith("'")`), true);
assert.equal(run(`routeWorkspaceCsvEscape('-25')`), '-25');
assert.equal(run(`routeWorkspaceCsvEscape('a,b')`), '"a,b"');
assert.equal(run(`routeWorkspaceCsvEscape('a"b')`), '"a""b"');
assert.equal(run(`routeWorkspaceCsv(route).includes('Verification,Explanation')`), true);
assert.equal(run(`routeWorkspaceCsv({...route,name:'=1+1'}).includes("'=1+1")`), true);
console.log('Route workspace model: 30 checks passed.');

class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.events = {}; this.disabled = false; this.value = ''; this.textContent = ''; this.attributes = {}; }
  addEventListener(type, fn) { this.events[type] = fn; }
  setAttribute(k, v) { this.attributes[k] = v; }
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children = items; }
  focus() { this.focused = true; }
  click() { if (!this.disabled && this.events.click) this.events.click({}); }
}
const root = new Element('div');
const storage = new Map();
const downloads = [];
let opened = 0;
context.document = { createElement(tag) { return new Element(tag); } };
context.container = root;
context.storage = { getItem(key) { return storage.get(key) || null; }, setItem(key, value) { storage.set(key, value); } };
context.download = (name, type, text) => downloads.push({ name, type, text });
context.open = () => opened++;
run(`var controller=createRouteWorkspace({container,storage,download,openInLab:open}); controller.addRoute(fixture);`);
const all = (el) => [el, ...el.children.flatMap(all)];
const named = (text) => all(root).find((el) => el.tagName === 'button' && el.textContent === text);
assert.equal(storage.size, 1);
assert.equal(JSON.parse([...storage.values()][0]).routes.length, 1);
assert.equal(all(root).some((el) => el.textContent.includes('Route status: verified')), true);
named('Open in Reactions').click();
assert.equal(opened, 1);
named('Export JSON').click();
assert.equal(JSON.parse(downloads[0].text).steps.length, 2);
named('Export CSV').click();
assert.match(downloads[1].text, /Verification,Explanation/);
named('Move down').click();
assert.equal(all(root).some((el) => el.textContent.includes('Route status: invalid')), true);
named('Delete step').click();
assert.equal(JSON.parse([...storage.values()][0]).routes[0].steps.length, 1);
context.restoreRoot = new Element('div');
run(`var restored=createRouteWorkspace({container:restoreRoot,storage,download}); restored.show();`);
assert.equal(context.restoreRoot.children[1].children[0].focused, true);
named('Delete route').click();
assert.equal(JSON.parse([...storage.values()][0]).routes.length, 0);
assert.equal(all(root).some((el) => el.textContent.includes('No route selected')), true);
console.log('Route workspace DOM and persistence: 11 checks passed.');
