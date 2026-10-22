#!/usr/bin/env node
'use strict';
// JSON bridge only. Independent chemistry assertions are performed by RDKit.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.join(__dirname, '..');
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'rdkit-fixtures.json'), 'utf8'));
const legacy = JSON.parse(fs.readFileSync(path.join(__dirname, 'chemistry-fixtures.json'), 'utf8'));
const context = vm.createContext({ console, performance, setTimeout, clearTimeout });
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]).filter((file) => file !== 'js/app.js');
const scriptSha256 = Object.fromEntries(scripts.map((file) => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file.split('?')[0]))).digest('hex')]));
scripts.forEach((file) => vm.runInContext(fs.readFileSync(path.join(root, file.split('?')[0]), 'utf8'), context, { filename: file }));
const evaluate = (code, item) => { context.item = item; return vm.runInContext(code, context); };
const structures = fixtures.structures.map((item) => {
  try {
    return Object.assign({}, item, evaluate(`(() => {
      const graph=reactionFragmentGraph(smilesToFragment(item.smiles));
      const props=computeProperties(graph,graph.atoms.map(a=>a.id));
      return { exported:props.isomericSmiles||props.smiles, molblock:graphToMolfile(graph,null,item.id),
        properties:{formula:props.formula,exactMass:props.exactMass,averageMass:props.averageMass,charge:props.charge,heavyAtoms:props.heavyAtoms},
        tetrahedral:findStereocenters(graph,graph.atoms.map(a=>a.id)).map(c=>c.type).sort(),
        doubleBond:findStereoDoubleBonds(graph,graph.atoms.map(a=>a.id)).map(c=>c.type).sort(),
        appKey:moleculeIdentity(graph).key };
    })()`, item));
  } catch (error) { return Object.assign({}, item, { error: error.message }); }
});
const reactions = legacy.reactions.concat(fixtures.reactions || []).map((item) => {
  try {
    return Object.assign({}, item, evaluate(`(() => {
      const compounds=item.compounds.map(c=>({...c,fragment:smilesToFragment(c.smiles)}));
      const result=predictReaction(compounds,{...defaultReactionConditions(),...item.conditions});
      const outcome=[result.best,...result.alternatives].filter(Boolean).find(o=>o.id===item.rule);
      return { found:!!outcome,actual:outcome?outcome.products.flatMap(p=>Array(p.count||1).fill(p.isomericSmiles||p.smiles)):[] };
    })()`, item));
  } catch (error) { return Object.assign({}, item, { error: error.message }); }
});
const pairs = fixtures.identityPairs.map((item) => {
  try { return Object.assign({}, item, { actual: evaluate('moleculeSame(item.a,item.b)', item) }); }
  catch (error) { return Object.assign({}, item, { error: error.message }); }
});
const routePlans = (fixtures.routePlans || []).map((item) => {
  try {
    return Object.assign({}, item, evaluate(`(() => {
      const job=pathFinderCreate(item.start,item.target,item.options);
      while(job.status==='running') job.step(100);
      return {status:job.status,steps:job.route.map(link=>{
        const c=link.candidate;
        const inputs=c.compounds.map(p=>({...p,fragment:smilesToFragment(p.isomericSmiles||p.smiles)}));
        const prediction=predictReaction(inputs,c.conditions);
        const outcome=[prediction.best,...prediction.alternatives].filter(Boolean).find(o=>o.id===c.outcomeId);
        return {from:link.from,to:link.to,planning:c.planning?c.planning.kind:null,rule:c.outcomeId,found:!!outcome,
          reactants:inputs.filter(p=>p.role==='reactant').map(p=>p.isomericSmiles||p.smiles),
          products:outcome?outcome.products.map(p=>p.isomericSmiles||p.smiles):[]};
      })};
    })()`, item));
  } catch (error) { return Object.assign({}, item, { error:error.message }); }
});
process.stdout.write(JSON.stringify({schemaVersion:1,sourceFiles:['rdkit-fixtures.json','chemistry-fixtures.json'],scriptSha256,structures,reactions,pairs,routePlans}));
