import {Game,COLS,ROWS,sizeForScore,nextThreshold} from './engine.mjs';
const $ = id => document.getElementById(id);
const game = new Game();
const canvas = $('board'), ctx = canvas.getContext('2d');
const S = canvas.width/COLS;
let started = false, paused = false, confirmRestart = false, lastTime = 0, fallTime = 0, lockTime = 0;
let best = 0, messageTimer = 0, shownSize = 2;
const held = new Map();
try { best = Math.max(0,Number(localStorage.getItem('polyfall-best-v1')) || 0); } catch {}
const fmt = n => n.toLocaleString('en-US');
const names = {2:'Dominoes',3:'Triominoes',4:'Tetrominoes',5:'Pentominoes',6:'Hexominoes',7:'Heptominoes',8:'Octominoes'};
const isPlaying = () => started && !paused && !game.over;

function tile(context,x,y,size,color,ghost=false) {
  if (ghost) {
    context.strokeStyle=color;context.globalAlpha=.45;context.lineWidth=1.2;
    context.strokeRect(x+3,y+3,size-6,size-6);context.globalAlpha=1;return;
  }
  context.fillStyle=color;context.fillRect(x+1.5,y+1.5,size-3,size-3);
  context.fillStyle='#ffffff33';context.fillRect(x+3,y+3,size-6,2);
  context.fillStyle='#00000020';context.fillRect(x+3,y+size-5,size-6,2);
}
function preview(id,piece) {
  const c=$(id),p=c.getContext('2d');p.clearRect(0,0,c.width,c.height);
  const w=Math.max(...piece.cells.map(c=>c[0]))+1,h=Math.max(...piece.cells.map(c=>c[1]))+1;
  const s=Math.min(27,(c.width-28)/w,(c.height-30)/h);
  const ox=(c.width-w*s)/2,oy=(c.height-h*s)/2+8;
  for(const [x,y] of piece.cells) tile(p,ox+x*s,oy+y*s,s,piece.color);
}
function render() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle='#203027';ctx.lineWidth=.5;
  for(let x=0;x<=COLS;x++){ctx.beginPath();ctx.moveTo(x*S,0);ctx.lineTo(x*S,ROWS*S);ctx.stroke();}
  for(let y=0;y<=ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*S);ctx.lineTo(COLS*S,y*S);ctx.stroke();}
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(game.board[y][x])tile(ctx,x*S,y*S,S,game.board[y][x]);
  if(!game.over){
    const a=game.active,gy=game.ghostY();
    for(const [x,y] of a.cells)tile(ctx,(x+a.x)*S,(y+gy)*S,S,a.color,true);
    for(const [x,y] of a.cells)tile(ctx,(x+a.x)*S,(y+a.y)*S,S,a.color);
  }
}
function sync() {
  if(game.score>best){best=game.score;try{localStorage.setItem('polyfall-best-v1',String(best));}catch{}}
  $('score').textContent=fmt(game.score);$('best').textContent=fmt(best);
  $('lines').textContent=fmt(game.lines);$('pieces').textContent=fmt(game.pieces);
  // The current piece keeps its size until locked; growth applies at spawn.
  const n=game.active.cells.length;
  $('order').textContent=n;$('order-name').textContent=names[n]||`${n}-ominoes`;
  const target=nextThreshold(game.score),floor=game.size===2?0:2**(game.size+8);
  $('threshold').textContent=fmt(target)+' pts';
  $('remaining').textContent=fmt(Math.max(0,target-game.score))+` points to ${game.size+1} cells`;
  $('progress').style.width=Math.max(0,Math.min(100,(game.score-floor)/(target-floor)*100))+'%';
  preview('order-preview',game.active);
  game.queue.slice(0,3).forEach((piece,i)=>preview(`next-${i}`,piece));
  if(n>shownSize){say(`Evolved! Welcome to ${n} cells.`);shownSize=n;}
  if(game.over&&started){
    held.clear();$('pause').disabled=true;$('status').textContent='ROOM TO GROW';
    showOverlay('ONE MORE POSSIBILITY','A good run.',`${fmt(game.score)} points · ${game.lines} lines cleared`,'Play again ↗');
  }
  render();
}
function say(text) { $('feedback').textContent=text;messageTimer=performance.now()+3000; }
function showOverlay(kicker,title,copy,button) {
  $('overlay-kicker').textContent=kicker;$('overlay-title').textContent=title;
  $('overlay-copy').textContent=copy;$('start').textContent=button;$('overlay').hidden=false;
}
function start() {
  $('start').blur();
  if(paused&&!game.over&&!confirmRestart){setPaused(false);return;}
  game.reset();started=true;paused=false;confirmRestart=false;fallTime=0;lockTime=0;held.clear();shownSize=2;
  $('overlay').hidden=true;$('pause').disabled=false;$('pause').textContent='Ⅱ Pause';
  $('pause').setAttribute('aria-label','Pause game');$('status').textContent='IN THE FLOW';
  say('Small beginnings. You have this.');sync();
}
function setPaused(value) {
  if(!started||game.over)return;
  paused=value;confirmRestart=false;held.clear();fallTime=0;lockTime=0;
  $('pause').textContent=paused?'▶ Resume':'Ⅱ Pause';
  $('pause').setAttribute('aria-label',paused?'Resume game':'Pause game');
  $('status').textContent=paused?'TAKE YOUR TIME':'IN THE FLOW';
  if(paused)showOverlay('NO RUSH','A little breather.','Your next move can wait.','Keep playing ↗');
  else $('overlay').hidden=true;
  render();
}
function afterLock(previousPieces) {
  if(game.pieces!==previousPieces){fallTime=0;lockTime=0;if(game.lastClear)say(`${game.lastClear} ${game.lastClear===1?'line':'lines'} cleared${game.combo>0?' · combo ×'+(game.combo+1):''}`);}
}
function action(name) {
  if(!isPlaying())return;
  const pieces=game.pieces;
  if(name==='left')game.move(-1,0);
  if(name==='right')game.move(1,0);
  if(name==='cw')game.rotate(1);
  if(name==='ccw')game.rotate(-1);
  if(name==='down')game.softDrop();
  if(name==='drop')game.hardDrop();
  afterLock(pieces);sync();
}
const keyActions={ArrowLeft:'left',ArrowRight:'right',ArrowDown:'down',ArrowUp:'cw',KeyX:'cw',KeyZ:'ccw',Space:'drop'};
document.addEventListener('keydown',e=>{
  if(e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement)return;
  if(keyActions[e.code]||['KeyP','Escape','Enter'].includes(e.code))e.preventDefault();
  if(e.repeat)return;
  if(e.code==='Enter'){if(!started||game.over)start();else if(paused)setPaused(false);return;}
  if(e.code==='KeyP'||e.code==='Escape'){setPaused(!paused);return;}
  const name=keyActions[e.code];if(!name)return;
  action(name);
  if(['left','right','down'].includes(name)&&isPlaying())held.set(e.code,{name,next:performance.now()+160});
});
document.addEventListener('keyup',e=>held.delete(e.code));
document.querySelectorAll('[data-action]').forEach(button=>{
  const key='touch-'+button.dataset.action;
  button.addEventListener('pointerdown',e=>{
    e.preventDefault();button.setPointerCapture(e.pointerId);const name=button.dataset.action;action(name);
    if(['left','right','down'].includes(name)&&isPlaying())held.set(key,{name,next:performance.now()+160});
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>held.delete(key));
});
$('start').addEventListener('click',start);
$('pause').addEventListener('click',()=>{setPaused(!paused);$('pause').blur();});
$('restart').addEventListener('click',()=>{
  if(!started||game.over){start();return;}
  setPaused(true);
  confirmRestart=true;
  showOverlay('A FRESH START?','Begin again?','Your current run will be replaced.','Start new game ↗');
  $('restart').blur();
});
window.addEventListener('blur',()=>setPaused(true));
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPaused(true);});
function frame(time) {
  const dt=Math.min(100,time-lastTime||0);lastTime=time;
  if(isPlaying()){
    for(const h of held.values())if(time>=h.next){action(h.name);h.next=time+(h.name==='down'?35:65);}
    const pieces=game.pieces;
    // 450 ms to slide/rotate a grounded piece. Lateral moves don't reset the timer.
    if(!game.fits({...game.active,y:game.active.y+1})){
      lockTime+=dt;
      if(lockTime>=450)game.lock();
    }else{
      lockTime=0;fallTime+=dt;
      if(fallTime>=game.interval){game.move(0,1);fallTime=0;}
    }
    afterLock(pieces);
    if(game.pieces!==pieces)sync();
    render();
  }
  if(messageTimer&&time>messageTimer){$('feedback').textContent='Make room for what’s next.';messageTimer=0;}
  requestAnimationFrame(frame);
}
sync();requestAnimationFrame(frame);
