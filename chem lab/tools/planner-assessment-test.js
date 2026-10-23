'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g))if(m[1]!=='js/app.js')vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),ctx,{filename:m[1]});
const run=c=>vm.runInContext(c,ctx);let checks=0;
const check=(c,e,label)=>{assert.equal(run(c),e,label);checks++;};
run(`function inspect(s,p,o){return reactionAtomMapping([{smiles:s,role:'reactant'}],p,o);}
function searchAudit(a,b,o){const j=pathFinderCreate(a,b,{maxDepth:2,maxRoutes:1,budgetMs:2000,...o});while(j.status==='running')j.step(100);return j;}`);
check(`(()=>{const m=inspect('CCO','CC=O');return m.status==='mapped'&&m.pairs.length===3&&m.changes.length===1&&m.changes[0].kind==='order';})()`,true,'Alcohol oxidation shows a single bond-order change');
check(`inspect('OCCO','O=CC=O').ambiguous`,true,'Equivalent atom origins are not represented as unique');
check(`inspect('[13CH3]CO','CC=O').status`,'incomplete','Isotope identities cannot be silently exchanged');
check(`inspect('[13CH3]CO','[13CH3]C=O').status`,'mapped','Matching isotope labels survive');
check(`inspect('CC','CCO').status`,'incomplete','Unlisted oxygen source is reported');
check(`inspect('CCO','CC=O',{maxStates:1}).status`,'unresolved','Search limit does not fabricate a correspondence');
check(`inspect('CCO','CC=O',{maxAtoms:2}).status`,'unresolved','Size bound applies');
check(`(()=>{const m=reactionAtomMapping([{smiles:'CCO',role:'reactant'},{smiles:'CC(=O)O',role:'reactant'}],'CCOC(C)=O');return m.status==='mapped'&&m.pairs.length===6&&m.detached.length===1&&m.changes.some(c=>c.kind==='formed')&&new Set(m.pairs.map(p=>p.source.compoundIndex)).size===2;})()`,true,'Two reactants supply unique atoms; omitted water oxygen is explicit');
check(`reactionAtomMapping([{smiles:'CC',role:'reactant'},{smiles:'O',role:'solvent'}],'CCO').status`,'incomplete','Solvent is not silently assumed to be incorporated');
check(`routeStepAssessment({outcome:{partialConversion:true}}).status`,'blocked','Partial conversion cannot become a selective route');
check(`routeStepAssessment({outcome:{chemoselectivity:{label:'test reagent',competing:[{group:'alcohol',count:1}]}}}).blockers.some(b=>b.code==='competing-sites')`,true,'Encoded competing site requires a supported plan');
check(`routeStepAssessment({outcome:{chemoselectivity:{changed:['aldehyde','ketone'],competing:[]}}}).blockers.length`,0,'Intentional bulk conversion is not rejected merely for multiple edits');
check(`(()=>{const j=searchAudit('CCO','CC=O');return j.status==='found'&&j.route.every(l=>retroForwardCheck(l.candidate,l.to)&&!routeStepAssessment(l.candidate).blockers.length);})()`,true,'Ordinary route still passes independent forward and compatibility checks');
check(`(()=>{const j=searchAudit('CCO','CCOC(C)=O',{stockPolicy:'custom',availableMaterials:['acetic acid']});return j.status==='found'&&j.route.length===1;})()`,true,'Inventory-aware two-input route remains supported');
check(`(()=>{const j=searchAudit('CCO','CC=O',{forbiddenReagents:['PCC']});return j.status!=='found'&&j.diagnostics.reagents>0;})()`,true,'Existing reagent filter still applies');
check(`(()=>{const a=pathFinderFingerprint('CCO'),b=pathFinderFingerprint('OCC');return Object.keys(a).every(k=>a[k]===b[k]);})()`,true,'Queue priority is independent of SMILES atom order');
// Exercise the real rendering helper without a browser dependency.
class El {constructor(tag){this.tagName=tag;this.children=[];}append(...x){this.children.push(...x);}}
ctx.document={createElement:tag=>new El(tag)};
check(`(()=>{const e=reactionMappingElement(inspect('CCO','CC=O'));return e.tagName==='details'&&e.children.some(c=>c.tagName==='table');})()`,true,'Mapping renders as inspectable table');
console.log('Planner assessment: '+checks+' focused checks passed.');
