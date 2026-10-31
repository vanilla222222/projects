'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g))if(m[1]!=='js/app.js')vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),ctx,{filename:m[1]});
let checks=0;const check=(c,e,label)=>{assert.equal(vm.runInContext(c,ctx),e,label);checks++;};
// Selection-only fixtures: these do not assert chemical feasibility.
vm.runInContext(`function fixtureRoute(mid,family,cost=1,recipe='a'){const points=['start',...mid,'target'];const route=points.slice(1).map((to,i)=>({fromKey:points[i],toKey:to,candidate:{group:family,conditions:{recipe}}}));route.cost=cost;return route;}
const compare=(a,b)=>a.cost-b.cost;
const shared=Array.from({length:5},(_,i)=>fixtureRoute(['shared','near-'+i],'Oxidation',i+1));
const different=Array.from({length:4},(_,i)=>fixtureRoute(['distinct-'+i],'Family-'+i,10+i));
const pool=[...shared,...different];
const selected=pathFinderSelectDiverseRoutes(pool,5,compare);`,ctx);
check('selected.length',5,'Five choices selected from larger pool');
check('selected[0]===shared[0]',true,'Best-cost route retained');
check('different.every(r=>selected.includes(r))',true,'Four distinct paths outrank four cheaper near-duplicates');
check('selected.filter(r=>shared.includes(r)).length',1,'Shared-intermediate family does not fill the list');
check('pathFinderSelectDiverseRoutes(pool,1,compare)[0]===shared[0]',true,'Single-route request keeps cost preference');
check('pathFinderSelectDiverseRoutes(pool,5,compare).every((r,i)=>r===selected[i])',true,'Selection deterministic');
check('pool.length',9,'Selection does not mutate candidate pool');
check("pathFinderRouteStrategyKey(fixtureRoute(['x'],'A',1,'hot'))===pathFinderRouteStrategyKey(fixtureRoute(['x'],'B',1,'cold'))",true,'Same intermediate sequence groups recipes and family variants');
check("pathFinderRouteStrategyKey(fixtureRoute(['x'],'A'))!==pathFinderRouteStrategyKey(fixtureRoute(['y'],'A'))",true,'Different intermediates remain different pathways');
check("pathFinderRouteStrategyKey([{from:'N[C@H](C)O',to:'CC=O'}])!==pathFinderRouteStrategyKey([{from:'N[C@@H](C)O',to:'CC=O'}])",true,'Specified stereoisomers are not collapsed');
check("(()=>{const j=pathFinderCreate('C=C','CC(=O)O',{maxRoutes:5,maxDepth:3});while(j.status==='running')j.step(100);return j.routes.length>0&&j.routes.length<=5&&new Set(j.routes.map(pathFinderRouteStrategyKey)).size===j.routes.length&&j.routes.every(r=>r.every(l=>retroForwardCheck(l.candidate,l.to)))&&j.diagnostics.routeVariants>0&&j.routeRecipes.length>j.routes.length&&j.routeRecipes.every(r=>r.every(l=>retroForwardCheck(l.candidate,l.to)));})()",true,'Real five-route request gives distinct forward-verified pathways without recipe padding');
console.log('Path diversity: '+checks+' checks passed.');
