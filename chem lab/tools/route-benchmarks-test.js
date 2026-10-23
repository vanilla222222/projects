'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
const loaded=new Set();for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g))if(m[1]!=='js/app.js'){vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),ctx,{filename:m[1]});loaded.add(m[1]);}
if(!loaded.has('js/route-benchmarks.js'))vm.runInContext(fs.readFileSync(path.join(root,'js/route-benchmarks.js'),'utf8'),ctx);
const run=c=>vm.runInContext(c,ctx);
(async()=>{
  const cases=run('routeBenchmarkCases()');assert.equal(cases.length,4);
  assert.equal(cases.filter(c=>c.references.some(r=>r.kind==='procedure')).length,1);
  assert.equal(cases.every(c=>c.references.every(r=>r.url.startsWith('https://'))&&c.scope.length>20),true);
  const reports=[];for(const c of cases){ctx.id=c.id;reports.push(await run('routeBenchmarkRun(id)'));}
  assert.equal(reports.find(r=>r.id==='reduction-esterification').status,'reproduced');
  assert.equal(reports.find(r=>r.id==='secondary-oxidation').status,'reproduced');
  const gap=reports.find(r=>r.id==='ring-cleavage-gap');assert.equal(gap.status,'coverage-gap');assert.equal(gap.reproducedEdges,1);
  assert.equal(reports.every(r=>r.expectedEdges===r.reproducedEdges+r.unsupportedEdges),true);
  await assert.rejects(run('routeBenchmarkRun("missing")'),/Unknown reference/);
  console.log('Reference routes: 9 focused checks passed. '+reports.map(r=>r.id+' '+r.reproducedEdges+'/'+r.expectedEdges).join('; '));
})().catch(error=>{console.error(error);process.exitCode=1;});
