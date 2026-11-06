'use strict';
// Housing. A room is a sealed pocket of air with a background behind it and the right
// furniture in it, and finding one is a flood fill that is allowed to fail.
//
// The important property is that the fill must be *bounded*: starting it anywhere in an
// open cave would otherwise walk the whole world. It stops at a tile budget and reports
// "not enclosed", which is both the correct answer and the cheap one, so this can be run
// on demand without thinking about where the player is standing.
//
// Requirements follow Terraria's: an area between a floor and a ceiling, a background on
// every tile of it, a door to get in by, a light to see by, a flat surface to work at and
// something to sit on. Each is reported separately, because a house that fails is a house
// the player wants to be told how to fix.

const MIN_AREA = 50;
const MAX_AREA = 750;
const FILL_BUDGET = 2600;        // comfortably past MAX_AREA, so "too big" is detectable

// Flood fill the open space containing (x, y). Returns the tiles of the room, or a
// failure if the space is not enclosed or is too large to be a room.
function findRoom(world, tiles, x, y) {
  const start = { x: Math.floor(x), y: Math.floor(y) };
  if (tiles.isSolid(world.get(start.x, start.y))) {
    return { ok: false, reason: 'solid', cells: [] };
  }
  const seen = new Set();
  const cells = [];
  const stack = [start];
  seen.add(start.x + ',' + start.y);

  while (stack.length) {
    const cell = stack.pop();
    cells.push(cell);
    if (cells.length > FILL_BUDGET) {
      return { ok: false, reason: 'open', cells: [] };
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cell.x + dx;
      const ny = cell.y + dy;
      const key = nx + ',' + ny;
      if (seen.has(key)) continue;
      const id = world.get(nx, ny);
      // A door is a wall for the purpose of sealing a room even when it is open, which
      // is what lets a house have a way in without leaking into the world.
      const spec = tiles.tile(id);
      if (tiles.isSolid(id) || spec.door || spec.platform) continue;
      seen.add(key);
      stack.push({ x: nx, y: ny });
    }
  }
  return { ok: true, cells };
}

// What a set of room cells contains, including the furniture standing in the wall of it.
function surveyRoom(world, tiles, cells) {
  const found = { light: false, surface: false, seat: false, door: false, bed: null,
    walled: 0, unwalled: [] };
  const inside = new Set(cells.map(c => c.x + ',' + c.y));

  for (const cell of cells) {
    if (world.getWall(cell.x, cell.y) !== 0) found.walled += 1;
    else found.unwalled.push(cell);
    const spec = tiles.tile(world.get(cell.x, cell.y));
    if (spec.emit > 0) found.light = true;
    if (spec.furniture === 'table' || spec.furniture === 'bench' || spec.station) {
      found.surface = true;
    }
    if (spec.furniture === 'chair') found.seat = true;
    if (spec.bed) {
      found.seat = true;
      if (!found.bed) found.bed = tiles.originOf(spec, cell.x, cell.y);
    }
  }

  // A door is in the wall of the room rather than inside it, so look at the boundary.
  for (const cell of cells) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cell.x + dx;
      const ny = cell.y + dy;
      if (inside.has(nx + ',' + ny)) continue;
      const spec = tiles.tile(world.get(nx, ny));
      if (spec.door || spec.platform) found.door = true;
    }
  }
  return found;
}

// Is this a house? Returns every reason it is not, so the answer can be shown to the
// player as a list of things to go and do.
function validateRoom(world, tiles, x, y) {
  const room = findRoom(world, tiles, x, y);
  if (!room.ok) {
    return { valid: false, area: 0, cells: [],
      problems: [room.reason === 'solid' ? 'That is solid rock.'
        : 'The room is not sealed - air escapes from it.'] };
  }
  const problems = [];
  const area = room.cells.length;
  if (area < MIN_AREA) problems.push('Too small: ' + area + ' of ' + MIN_AREA + ' tiles.');
  if (area > MAX_AREA) problems.push('Too large: ' + area + ' of ' + MAX_AREA + ' tiles.');

  const survey = surveyRoom(world, tiles, room.cells);
  if (survey.unwalled.length > 0) {
    problems.push(survey.unwalled.length + ' tiles have no background behind them.');
  }
  if (!survey.door) problems.push('No door or platform to get in by.');
  if (!survey.light) problems.push('No light source.');
  if (!survey.surface) problems.push('No table or work bench.');
  if (!survey.seat) problems.push('No chair or bed.');

  return { valid: problems.length === 0, area, cells: room.cells,
    survey, problems };
}

// A point inside the room to stand an occupant at: the lowest, most central cell with
// floor under it, so a villager appears standing rather than hovering.
function roomAnchor(world, tiles, cells) {
  let best = null;
  for (const cell of cells) {
    if (!tiles.isSolid(world.get(cell.x, cell.y + 1))) continue;
    if (!best || cell.y > best.y) best = cell;
  }
  if (!best) return cells[0] || null;
  // Prefer the middle of that floor row.
  const row = cells.filter(c => c.y === best.y);
  row.sort((a, b) => a.x - b.x);
  return row[Math.floor(row.length / 2)] || best;
}

const EXPORTS_housing = { findRoom, surveyRoom, validateRoom, roomAnchor,
  MIN_AREA, MAX_AREA, FILL_BUDGET };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_housing;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.housing = EXPORTS_housing;
}
