'use strict';
const assert = require('node:assert/strict');
const {run} = require('../js/cooperative-batch.js');
(async () => {
  const rows = Array.from({length:10000}, (_,i)=>i);
  const visited = [];
  let yields = 0;
  const progress = [];
  const done = await run(rows, (value,index) => visited.push([value,index]), {
    now:()=>0, chunkSize:37, yieldControl:async()=>{yields++;},
    onProgress:(n,total)=>progress.push([n,total])
  });
  assert.deepEqual(visited, rows.map((value,index)=>[value,index]), 'order and record identity must be unchanged');
  assert.equal(done.completed, 10000);
  assert.equal(done.cancelled, false);
  assert.equal(yields, Math.ceil(rows.length/37));
  assert.deepEqual(progress[0],[0,10000]);
  assert.deepEqual(progress.at(-1),[10000,10000]);
  let cancelled = false;
  const processed = [];
  const stopped = await run(rows, value=>processed.push(value), {
    now:()=>0, chunkSize:3, yieldControl:async()=>{},
    onProgress:n=>{if(n===6)cancelled=true;}, isCancelled:()=>cancelled
  });
  assert.deepEqual(processed,[0,1,2,3,4,5]);
  assert.deepEqual(stopped,{completed:6,total:10000,cancelled:true});
  let firstYield = false;
  const beforeStart = await run([1],()=>assert.fail('cancelled before first record'), {
    yieldControl:async()=>{firstYield=true;},isCancelled:()=>firstYield
  });
  assert.equal(beforeStart.completed,0);
  assert.equal(beforeStart.cancelled,true);
  let tick=0, timeYields=0;
  await run([1,2,3,4],()=>{}, {
    now:()=>tick+=10, budgetMs:12, chunkSize:100,
    yieldControl:async()=>{timeYields++;}
  });
  assert.equal(timeYields,2, 'time budget must yield before reaching item cap');
  await assert.rejects(run([1],()=>{throw Error('failure');},{yieldControl:async()=>{}}), /failure/);
  assert.deepEqual(await run([],()=>assert.fail(),{yieldControl:async()=>{}}),
    {completed:0,total:0,cancelled:false});
  console.log('Cooperative batch: 10,000 ordered records, time/item budgets, cancellation, errors and empty input passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
