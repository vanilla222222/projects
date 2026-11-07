'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g))if(m[1]!=='js/app.js')vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),ctx,{filename:m[1]});
let checks=0;const check=(c,e,label)=>{assert.equal(vm.runInContext(c,ctx),e,label);checks++;};
// Topology/selection fixtures only; these mock candidates do not assert chemistry.
vm.runInContext(`function leaf(target){return {target,children:[],candidate:null};}
function tree(mid,family,cost){return {target:'CC(=O)O',candidate:{group:family},children:[{target:mid,candidate:{group:family},children:[leaf('CCO')]}],cost};}
const a=tree('CC=O','Oxidation',0),b=tree('CC=O','Other recipe',1),c=tree('CCCl','Substitution',2);
const near=Array.from({length:5},(_,i)=>({target:'CC(=O)O',candidate:{group:'Oxidation'},children:[a,leaf('C'.repeat(i+2))],cost:i}));
const far=Array.from({length:4},(_,i)=>tree('C'.repeat(i+4),'Distinct-'+i,10+i));
const chosen=pathFinderSelectDiverseRoutes([...near,...far],5,(a,b)=>a.cost-b.cost,pathFinderRecipeFeatures);`,ctx);
check('pathFinderRecipeStrategyKey(a)===pathFinderRecipeStrategyKey(b)',true,'Same precursor tree groups different recipe families');
check('pathFinderRecipeStrategyKey(a)!==pathFinderRecipeStrategyKey(c)',true,'Different intermediate trees stay separate');
check("pathFinderRecipeStrategyKey({target:'CC',children:[leaf('CO'),leaf('CCC')]})===pathFinderRecipeStrategyKey({target:'CC',children:[leaf('CCC'),leaf('CO')]})",true,'Child ordering does not invent another strategy');
check("pathFinderRecipeStrategyKey(leaf('N[C@H](C)O'))!==pathFinderRecipeStrategyKey(leaf('N[C@@H](C)O'))",true,'Specified stereoisomers remain distinct');
check('chosen[0]===near[0]',true,'Best scored tree retained');
check('far.every(t=>chosen.includes(t))',true,'Different families/intermediates replace near duplicate trees');
vm.runInContext(`const stock=s=>({smiles:s,stock:{tier:1},ands:[],skeleton:{}});
const mid={smiles:'CC=O',stock:null,ands:[1,2,3].map(i=>({solved:true,candidate:{key:'variant-'+i},children:[stock('CCO')]})),skeleton:{}};
const rootNode={smiles:'CC(=O)O',ands:[{solved:true,candidate:{key:'branch-A'},children:[mid]},{solved:true,candidate:{key:'branch-B'},children:[stock('CCC')]}],skeleton:{}};
const enumJob={root:rootNode,options:{maxDepth:3,diverseRootEnumeration:true}};`,ctx);
check("rsearchEnumerate(enumJob,rootNode,new Set(),2).map(t=>t.candidate.key).join(',')",'branch-A,branch-B','Root branches take turns before recipe combinations fill enumeration cap');
check("(()=>{enumJob.options.diverseRootEnumeration=false;return rsearchEnumerate(enumJob,rootNode,new Set(),2).map(t=>t.candidate.key).join(',');})()",'branch-A,branch-A','Default retrosynthesis enumeration retains existing behavior');
check("(()=>{const j=pathFinderCreate('CCO','CCOC(C)=O',{recipeTree:true,stockPolicy:'custom',maxDepth:2,maxRoutes:5,budgetMs:10000});while(j.status==='running')j.step(100);const walk=n=>n.candidate?retroForwardCheck(n.candidate,n.target)&&n.children.length===n.candidate.precursors.length&&n.children.every(walk):!!n.stock;return j.status==='found'&&j.recipeTrees.length===1&&j.routeRecipes.length>j.recipeTrees.length&&j.routeRecipes.every(walk)&&new Set(j.recipeTrees.map(pathFinderRecipeStrategyKey)).size===j.recipeTrees.length;})()",true,'Real five-tree request groups recipes and preserves complete forward-verified branches');
console.log('Recipe diversity: '+checks+' checks passed.');
