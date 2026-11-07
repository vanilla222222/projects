export const COLS = 12, ROWS = 24;
export const COLORS = ['#9be5c4', '#b6adf6', '#f5bd83', '#8cccec', '#ef99ba', '#d7db8b'];
export const sizeForScore = score => Math.max(2, Math.floor(Math.log2(Math.max(1, score))) - 8);
export const nextThreshold = score => 2 ** (sizeForScore(score) + 9);
export function normalize(cells) {
  const x = Math.min(...cells.map(c => c[0])), y = Math.min(...cells.map(c => c[1]));
  return cells.map(([a,b]) => [a-x,b-y]);
}
export const rotateCells = (cells, dir = 1) => normalize(cells.map(([x,y]) => dir > 0 ? [-y,x] : [y,-x]));
export function generatePiece(n, random = Math.random) {
  let cells = [[0,0]];
  // Grow only along shared edges. Bound the footprint so every piece can spawn.
  while (cells.length < n) {
    const occupied = new Set(cells.map(c => c.join(','))), frontier = new Map();
    for (const [x,y] of cells) for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const cell = [x+dx,y+dy], key = cell.join(',');
      if (occupied.has(key)) continue;
      const trial = [...cells,cell];
      const width = Math.max(...trial.map(c=>c[0])) - Math.min(...trial.map(c=>c[0])) + 1;
      const height = Math.max(...trial.map(c=>c[1])) - Math.min(...trial.map(c=>c[1])) + 1;
      if (width <= COLS && height <= ROWS) frontier.set(key,cell);
    }
    const choices = [...frontier.values()];
    if (!choices.length) throw new Error('Piece exceeds board capacity');
    cells.push(choices[Math.floor(random()*choices.length)]);
  }
  cells = normalize(cells);
  return {cells, color: COLORS[Math.floor(random()*COLORS.length)]};
}
export class Game {
  constructor(random = Math.random) { this.random = random; this.reset(); }
  reset() {
    this.board = Array.from({length:ROWS},()=>Array(COLS).fill(null));
    this.score = 0; this.lines = 0; this.pieces = 0; this.over = false;
    this.queue = []; this.queueSize = 2; this.combo = -1; this.lastClear = 0;
    this.spawn();
  }
  get size() { return sizeForScore(this.score); }
  get interval() { return Math.max(130, 850 - this.lines*12 - (this.size-2)*65); }
  fillQueue() {
    if (this.queueSize !== this.size) { this.queue = []; this.queueSize = this.size; }
    while (this.queue.length < 4) this.queue.push(generatePiece(this.size,this.random));
  }
  spawn() {
    this.fillQueue();
    const p = this.queue.shift();
    const width = Math.max(...p.cells.map(c=>c[0]))+1;
    this.active = {...p,x:Math.floor((COLS-width)/2),y:0};
    this.fillQueue();
    if (!this.fits(this.active)) this.over = true;
  }
  fits(p) {
    return p.cells.every(([x,y]) => {
      x += p.x; y += p.y;
      return x >= 0 && x < COLS && y >= 0 && y < ROWS && !this.board[y][x];
    });
  }
  move(dx,dy) {
    if (this.over) return false;
    const p = {...this.active,x:this.active.x+dx,y:this.active.y+dy};
    if (!this.fits(p)) return false;
    this.active = p; return true;
  }
  rotate(dir = 1) {
    if (this.over) return false;
    const cells = rotateCells(this.active.cells,dir);
    // Horizontal wall kicks and small floor kicks for arbitrary polyominoes.
    for (const dy of [0,-1,-2]) for (const dx of [0,-1,1,-2,2,-3,3]) {
      const p = {...this.active,cells,x:this.active.x+dx,y:this.active.y+dy};
      if (this.fits(p)) { this.active = p; return true; }
    }
    return false;
  }
  ghostY() {
    let y = this.active.y;
    while (this.fits({...this.active,y:y+1})) y++;
    return y;
  }
  hardDrop() {
    if (this.over) return;
    const y = this.ghostY(); this.score += (y-this.active.y)*2;
    this.active.y = y; this.lock();
  }
  softDrop() { if (this.move(0,1)) { this.score++; return true; } return false; }
  tick() { if (!this.over && !this.move(0,1)) this.lock(); }
  lock() {
    if (this.over) return;
    for (const [x,y] of this.active.cells) this.board[y+this.active.y][x+this.active.x] = this.active.color;
    const remaining = this.board.filter(row => !row.every(Boolean));
    const cleared = ROWS-remaining.length;
    this.lastClear = cleared;
    this.combo = cleared ? this.combo+1 : -1;
    if (cleared) {
      this.score += 100*cleared*cleared + Math.max(0,this.combo)*50;
      this.lines += cleared;
    }
    this.board = [...Array.from({length:cleared},()=>Array(COLS).fill(null)),...remaining];
    this.pieces++; this.spawn();
  }
}
