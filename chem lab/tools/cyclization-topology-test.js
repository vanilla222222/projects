'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g))if(m[1]!=='js/app.js')vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),ctx,{filename:m[1]});
const run=c=>vm.runInContext(c,ctx);let checks=0;const check=(c,e,label)=>{assert.equal(run(c),e,label);checks++;};
run(`function ringFixture(smiles,id='rcm',extra=[]){
 const compounds=[smiles,...extra].map(smiles=>({smiles,role:'reactant',fragment:smilesToFragment(smiles),equiv:'2'}));
 const conditions={...defaultReactionConditions(),solvents:['thf'],additives:['grubbs'],atmosphere:'n2'};
 if(id==='intramolecular-williamson')conditions.additives=['nah'];
 if(id==='amino-acid-lactamization'){conditions.additives=['dcc'];conditions.solvents=['dmf'];}
 const before=JSON.stringify(compounds),r=predictReaction(compounds,conditions),outcome=[r.best,...r.alternatives].find(o=>o&&o.id===id);
 return {compounds,conditions,outcome,unchanged:before===JSON.stringify(compounds)};
}`);
for(const [s,n] of [['C=CCCCC=C',5],['C=CCCCCC=C',6],['C=CCCCCCC=C',7],['C=CCCCCCCC=C',8]]){Object.assign(ctx,{s,n});
 check('ringFixture(s).outcome.cyclization.ringSize',n,'Encoded RCM ring size '+n);
 check('ringFixture(s).outcome.cyclization.status','within-encoded-topology','Single acyclic tether remains supported '+n);
 check('routeStepAssessment({outcome:ringFixture(s).outcome}).blockers.length',0,'Planner retains supported closure '+n);
}
check("!!ringFixture('C=CCCC=C').outcome",false,'Four-membered RCM remains outside encoded range');
check("!!ringFixture('C=CCCCCCCCC=C').outcome",false,'Nine-membered RCM remains outside encoded range');
check("ringFixture('C=CC1CCC(CC=C)CC1').outcome.cyclization.blockers.some(b=>b.code==='cyclic-tether')",true,'Alternate tether paths do not prove bridged-ring feasibility');
check("ringFixture('C=CCC(c1ccccc1)CCC=C').outcome.cyclization.blockers.length",0,'A pendant ring does not create alternate paths along the tether');
check("ringFixture('C=CCC(CC=C)CCC=C').outcome.cyclization.blockers.some(b=>b.code==='closure-site-choice')",true,'Multiple eligible RCM closures are not ranked into selective preparation');
check("ringFixture('C=CCCCC=C','rcm',['C=CCC']).outcome.cyclization.blockers.some(b=>b.code==='intermolecular-competition')",true,'Separate alkene partner is not silently inert');
check("routeStepAssessment({outcome:ringFixture('C=CCCCC=C','rcm',['C=CCC']).outcome}).status",'blocked','Planner rejects unresolved intermolecular competition');
check("(()=>{const f=ringFixture('C=CC1CCC(CC=C)CC1');return reactionScopeAssess(f.compounds,f.conditions,f.outcome).reasons.some(r=>r.code==='cyclic-tether'&&r.level==='conflict');})()",true,'Scope recomputes tether limitation');
check("(()=>{const f=ringFixture('C=CCCCC=C','rcm',['C=CCC']);return routeWorkspaceValidateStep({from:f.compounds[0].smiles,to:f.outcome.products[0].isomericSmiles,ruleId:'rcm',compounds:f.compounds,conditions:f.conditions}).status;})()",'unverified','Saved route cannot launder ambiguous closure');
check("ringFixture('C=CCCCC=C').unchanged",true,'Topology inspection does not mutate starting structure');
for(const [id,s] of [['intramolecular-williamson','OCCCCBr'],['amino-acid-lactamization','NCCCC(=O)O']]){Object.assign(ctx,{id,s});
 check('ringFixture(s,id).outcome.cyclization.ringSize',5,'Five-membered closure metadata '+id);
 check('!!ringFixture(s+".C1CC1",id).outcome',false,'Disconnected cyclic spectator cannot defeat acyclic-tree count '+id);
}
check("ringFixture('OCCCCBr','intramolecular-williamson',['CCBr']).outcome.cyclization.blockers.some(b=>b.code==='intermolecular-competition')",true,'Ether closure flags competing electrophile');
check("(()=>{const f=ringFixture('C=CCCCC=C'),before=JSON.stringify(f.outcome);reactionScopeAssess(f.compounds,f.conditions,f.outcome);return before===JSON.stringify(f.outcome);})()",true,'Scope inspection leaves recorded outcomes unchanged');
console.log('Cyclization topology: '+checks+' checks passed.');
