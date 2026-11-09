import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,COLS,ROWS,generatePiece,sizeForScore,nextThreshold,rotateCells} from './engine.mjs';
function rng(seed=42){return ()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296);}
test('score boundaries and first evolution threshold',()=>{
  for(const [s,n] of [[0,2],[1,2],[1024,2],[2047,2],[2048,3],[4095,3],[4096,4],[8192,5]])assert.equal(sizeForScore(s),n);
  assert.equal(nextThreshold(0),2048);assert.equal(nextThreshold(2048),4096);
});
test('random pieces have exact area, edge connectivity, unique cells and fit the board',()=>{
  const random=rng();
  for(let n=2;n<=45;n++)for(let attempt=0;attempt<40;attempt++){
    const {cells}=generatePiece(n,random);assert.equal(cells.length,n);
    const set=new Set(cells.map(c=>c.join(',')));assert.equal(set.size,n);
    const seen=new Set([cells[0].join(',')]),queue=[cells[0]];
    for(let i=0;i<queue.length;i++){
      const [x,y]=queue[i];for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]){
        const p=[x+dx,y+dy],key=p.join(',');if(set.has(key)&&!seen.has(key)){seen.add(key);queue.push(p);}
      }
    }
    assert.equal(seen.size,n);
    assert.ok(Math.max(...cells.map(c=>c[0]))<COLS);assert.ok(Math.max(...cells.map(c=>c[1]))<ROWS);
    let rotated=cells;for(let i=0;i<4;i++)rotated=rotateCells(rotated);
    assert.deepEqual(rotated,cells);
  }
});
test('movement, ghost, hard drop and collision with the floor',()=>{
  const g=new Game(rng());g.active={cells:[[0,0],[1,0]],x:0,y:0,color:'#fff'};
  assert.equal(g.move(-1,0),false);assert.equal(g.ghostY(),ROWS-1);
  g.hardDrop();assert.equal(g.board[ROWS-1][0],'#fff');assert.equal(g.board[ROWS-1][1],'#fff');
  assert.equal(g.score,(ROWS-1)*2);assert.equal(g.pieces,1);
});
test('simultaneous line clears score quadratically and preserve upper cells',()=>{
  const g=new Game(rng());
  g.board[ROWS-1].fill('#fff');g.board[ROWS-2].fill('#fff');
  g.board[ROWS-1][0]=null;g.board[ROWS-2][0]=null;g.board[ROWS-3][5]='#abc';
  g.active={cells:[[0,0],[0,1]],x:0,y:ROWS-2,color:'#fff'};g.lock();
  assert.equal(g.lines,2);assert.equal(g.score,400);assert.equal(g.board[ROWS-1][5],'#abc');
  assert.equal(g.board.length,ROWS);
});
test('evolution replaces queued pieces at spawn, leaving active piece intact until lock',()=>{
  const g=new Game(rng());g.score=2048;assert.equal(g.active.cells.length,2);
  g.hardDrop();assert.equal(g.active.cells.length,3);assert.ok(g.queue.every(p=>p.cells.length===3));
});
test('rotation kicks away from walls without entering occupied cells',()=>{
  const g=new Game(rng());g.active={cells:[[0,0],[0,1],[0,2],[0,3]],x:COLS-1,y:4,color:'#fff'};
  assert.equal(g.rotate(),true);assert.ok(g.fits(g.active));
  const old=structuredClone(g.active);g.board=Array.from({length:ROWS},()=>Array(COLS).fill('#fff'));
  assert.equal(g.rotate(),false);assert.deepEqual(g.active,old);
});
test('blocked spawn ends game; reset creates a clean playable board',()=>{
  const g=new Game(rng());g.board[0].fill('#fff');g.spawn();assert.equal(g.over,true);
  const board=structuredClone(g.board);g.hardDrop();g.tick();assert.deepEqual(g.board,board);
  g.reset();assert.equal(g.over,false);assert.equal(g.score,0);assert.ok(g.board.flat().every(c=>!c));
});
