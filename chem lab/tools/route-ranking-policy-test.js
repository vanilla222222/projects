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
let checks=0;
function check(code, expected, label) { assert.equal(run(code),expected,label);checks++; }
// Synthetic records isolate ranking policy; these are not synthesis proposals.
run(`function rankCandidate(extra={}){
 const outcome={id:'ranking-fixture',evidence:{scope:'Bounded fixture scope',references:[{url:'https://example.invalid/class'}],assumptions:[],limitations:[]},stoichiometry:{conversion:1,completion:'sufficient'},products:[],warnings:[]};
 return Object.assign({precursors:[{smiles:'C',skeleton:1}],reagents:[],compounds:[],conditions:{solvents:['none']},outcome,product:{smiles:'CO'},group:'Reaction'},extra);
}
function rankRoute(c=rankCandidate()){return [{from:'C',to:'CO',precursor:0,candidate:c}];}
function ranksBefore(a,b){const x=pathFinderRouteRank(a),y=pathFinderRouteRank(b);const first=x.findIndex((v,i)=>v!==y[i]);return first>=0&&x[first]<y[first];}
function rankTree(c){return {target:'CO',candidate:c,skeleton:2,children:[{target:'C',candidate:null,stock:{tier:1,smiles:'C'},skeleton:1,children:[]}]};}
`);
check("ranksBefore(rankRoute(),[...rankRoute(),...rankRoute()])",true,'Fewer actual operations rank first');
check("ranksBefore([...rankRoute(),...rankRoute()], [...rankRoute(rankCandidate({planning:{kind:'protect'}})),...rankRoute()])",true,'Equal-length route avoids extra protection');
check("pathFinderRouteMetrics(rankRoute(rankCandidate({pgSteps:[{role:'protect',outcome:{}},{role:'step',outcome:{}},{role:'deprotect',outcome:{}}]}))).steps",3,'Collapsed protection sequence counts all operations');
check("pathFinderRouteMetrics(rankRoute(rankCandidate({pgSteps:[{role:'protect',outcome:{}},{role:'step',outcome:{}},{role:'deprotect',outcome:{}}]}))).protection",2,'Collapsed protection sequence counts install and removal');
check("pathFinderRouteMetrics(rankRoute(rankCandidate({pgSteps:[]}))).steps",1,'Empty legacy sequence does not become a free operation');
check("ranksBefore(rankRoute(),rankRoute(rankCandidate({stereo:'racemic'})))",true,'Recorded stereo concern worsens an otherwise equal rank');
check("ranksBefore(rankRoute(),rankRoute(rankCandidate({minor:true})))",true,'Minor-product selection is an explicit disadvantage');
check("ranksBefore(rankRoute(),rankRoute(rankCandidate({outcome:{stoichiometry:{conversion:1}}})))",true,'Missing scope/source records are gaps, not free certainty');
check("routePlanningStepFacts(rankCandidate({outcome:{evidence:{scope:'Detailed scope has not yet been curated.',references:[]}}})).gaps.some(g=>g.code==='scope')",true,'Uncurated scope is exposed');
check("routePlanningStepFacts(rankCandidate({outcome:{evidence:{scope:'Known',references:'invalid'}}})).gaps.some(g=>g.code==='references')",true,'Malformed legacy references are unresolved');
check("routePlanningStepFacts(rankCandidate({outcome:{evidence:{scope:'Known',references:[{url:'javascript:alert(1)'}]}}})).gaps.some(g=>g.code==='references')",true,'Non-source URI does not count as a reference');
check(`(()=>{const a=rankCandidate(),b=rankCandidate();b.outcome.evidence.assumptions=Array(100).fill('Documentation');b.outcome.evidence.limitations=Array(100).fill('Bounded scope');return JSON.stringify(pathFinderRouteRank(rankRoute(a)))===JSON.stringify(pathFinderRouteRank(rankRoute(b)));})()`,true,'Documentation verbosity does not affect rank');
check("ranksBefore(rankRoute(rankCandidate({precursors:[{smiles:'C'},{smiles:'CCCC'}]})),rankRoute(rankCandidate({precursors:[{smiles:'C'},{smiles:'CO'},{smiles:'CCl'}]})))",true,'Fewer extra building blocks precede atom-count tie-breaking');
check("pathFinderRouteMetrics(rankRoute(rankCandidate({precursors:[{smiles:'C'},{smiles:'CO'},{smiles:'OC'}]}))).buildingBlocks",1,'Equivalent building blocks deduplicate by identity');
check("pathFinderProcessBurden(rankRoute())",0,'No-solvent entry adds no material burden');
check("ranksBefore(rankRoute(),rankRoute(rankCandidate({reagents:[{smiles:'O',role:'reagent'}]})))",true,'Fewer process-material entries break remaining ties');
check(`(()=>{const a=rankCandidate(),b=rankCandidate();a.outcome.stoichiometry={conversion:0.25};b.outcome.stoichiometry={conversion:1};return rsearchScore(rankTree(a)).score===rsearchScore(rankTree(b)).score;})()`,true,'Numerical conversion ceiling is not an experimental-yield score');
check(`(()=>{const m=rsearchScore(rankTree(rankCandidate()));return m.scoreBasis==='structural-and-recorded-scope'&&!Object.keys(m.scoreContributions).some(k=>/yield|conversion/i.test(k));})()`,true,'Tree ranking exposes its non-yield basis');
check(`(()=>{const m=rsearchScore(rankTree(rankCandidate()));return Math.abs(m.score-Object.values(m.scoreContributions).reduce((s,v)=>s+v,0))<0.11;})()`,true,'Displayed score contributions sum to the score');
check("rsearchScore(rankTree(rankCandidate({planning:{kind:'protect'}}))).pg",1,'Tree and linear protection counts agree');
check("rsearchScore(rankTree(rankCandidate({stereo:'racemic'}))).score>rsearchScore(rankTree(rankCandidate())).score",true,'Tree scoring penalizes recorded stereo concerns');
check("rsearchScore(rankTree(rankCandidate({reagents:[{smiles:'O',role:'reagent'}]}))).score>rsearchScore(rankTree(rankCandidate())).score",true,'Tree scoring includes material entries');
check(`(()=>{const c=rankCandidate(),r=rankRoute(c),before=JSON.stringify(r);pathFinderRouteRank(r);rsearchScore(rankTree(c));return before===JSON.stringify(r);})()`,true,'Ranking does not mutate route or outcome records');
check(`(()=>{const t=rankTree(rankCandidate());t.children=[{target:'CO',candidate:null,stock:{tier:1},children:[]},{target:'OC',candidate:null,stock:{tier:1},children:[]}];return rsearchScore(t).feedstocks;})()`,1,'Tree feedstocks deduplicate equivalent structures');
check(`(()=>{const c=rankCandidate({pgSteps:[{role:'protect',reagents:[{smiles:'O',role:'reagent'}],outcome:{}},{role:'step',reagents:[{smiles:'N',role:'reagent'}],outcome:{}},{role:'deprotect',reagents:[{smiles:'O',role:'reagent'}],outcome:{}}]});return pathFinderProcessBurden(rankRoute(c));})()`,2,'Collapsed sequence includes all process-material entries');
check(`(()=>{const c=rankCandidate({pgSteps:[{role:'protect',reagents:[{smiles:'O',role:'reagent'}],outcome:{}},{role:'step',outcome:{}},{role:'deprotect',outcome:{}}]});const s=routeComparisonSummaries({start:'C',target:'CO',routes:[rankRoute(c)]})[0];return s.ranking.steps===3&&s.ranking.protection===2&&s.scopeGaps.length===s.ranking.scopeGaps&&s.reagents.some(p=>p.smiles==='O');})()`,true,'Comparison shows the same expanded-operation counts and gaps used to rank');
check("routePlanningStepFacts(rankCandidate({outcome:{id:'fixture',products:[],stoichiometry:{}}})).gaps.some(g=>g.code==='loading-model')",true,'Empty loading metadata is unresolved');
check("routePlanningStepFacts(rankCandidate({outcome:{stoichiometry:{conversion:1}}})).gaps.some(g=>g.code==='outcome')",true,'An incomplete outcome record is not treated as forward evidence');
console.log('Route ranking policy: '+checks+' checks passed');
