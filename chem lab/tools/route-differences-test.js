'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g))if(m[1]!=='js/app.js')vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),ctx,{filename:m[1]});
let checks=0;const check=(c,e,label)=>{assert.equal(vm.runInContext(c,ctx),e,label);checks++;};
// Difference fixtures test identity/presentation only, not chemical feasibility.
vm.runInContext(`function links(mid,group){return [{from:'CCO',to:mid,candidate:{group}},{from:mid,to:'CC(=O)O',candidate:{group:'Oxidation'}}];}
const j={routes:[links('CC=O','Oxidation'),links('CCCl','Substitution')]},before=JSON.stringify(j),d=routeComparisonDiversity(j);`,ctx);
check('d[0].reference',true,'First result is the reference');
check('d[1].addedIntermediates[0].smiles','CCCl','Alternative intermediate identified');
check('d[1].omittedIntermediates[0].smiles','CC=O','Reference intermediate omitted identified');
check("d[1].addedFamilies.join(',')",'Substitution','New family identified');
check('d[1].omittedFamilies.length',0,'Shared oxidation family is not reported omitted');
check('d[1].samePath',false,'Different sequence identified');
check('JSON.stringify(j)===before',true,'Comparison leaves search records unchanged');
check('routeComparisonDiversity({routes:[j.routes[0],JSON.parse(JSON.stringify(j.routes[0]))]})[1].samePath',true,'Same intermediate sequence is not advertised as different chemistry');
check("routeComparisonDiversity({routes:[links('N[C@H](C)O','X'),links('N[C@@H](C)O','X')]})[1].addedIntermediates.length",1,'Stereoisomer difference retained');
check("routeComparisonDiversity({routes:[links('OCC','X'),links('CCO','X')]})[1].addedIntermediates.length",0,'Equivalent SMILES do not invent different intermediates');
check('routeComparisonDiversity({routes:[]}).length',0,'Empty search handled');
check("routeComparisonDiversity({routes:[links('CC=O',undefined)]})[0].missingFamilies",true,'Missing family labels disclosed');
vm.runInContext(`const leaf=target=>({target,children:[]}),t=(mid,feed)=>({target:'CC(=O)O',candidate:{group:'Oxidation'},children:[{target:mid,candidate:{group:'Substitution'},children:[leaf(feed)]}]});const td=routeComparisonDiversity({routes:[t('CC=O','CCO'),t('CCCl','CCC')]});`,ctx);
check('td[1].addedFeedstocks[0].smiles','CCC','Tree feedstock added identified');
check('td[1].omittedFeedstocks[0].smiles','CCO','Tree feedstock omitted identified');
check('td[1].addedIntermediates[0].smiles','CCCl','Prepared tree intermediate identified');
class El{constructor(tag){this.tagName=tag;this.children=[];this.textContent='';}append(...items){this.children.push(...items);}}
ctx.document={createElement:tag=>new El(tag)};
const el=vm.runInContext("routeComparisonDiversityElement(d[1],'Route')",ctx);
const text=n=>[n.textContent,...n.children.map(text)].join(' ');
assert.match(text(el),/differs from Route 1/);checks++;
assert.match(text(el),/CCCl/);checks++;
assert.match(text(el),/CC=O/);checks++;
assert.match(text(vm.runInContext("routeComparisonDiversityElement(routeComparisonDiversity({routes:[links('CC=O',undefined)]})[0],'Route')",ctx)),/labels are missing/);checks++;
console.log('Route differences: '+checks+' checks passed.');
