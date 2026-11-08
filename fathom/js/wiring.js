'use strict';

const WIRE_NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const WIRE_LIMIT = 1024;
const WIRE_TIMER_SECONDS = 2;
const wireKey = (x, y) => x + ':' + y;

function makeWiring(world, tiles, hooks = {}) {
  const wires = new Map();
  const timers = new Map();
  const cooldowns = new Map();
  let pressed = null;
  let pruneAt = 1;

  function add(x, y) {
    const key = wireKey(x, y);
    if (wires.has(key)) return false;
    wires.set(key, { x, y });
    return true;
  }

  function remove(x, y) { return wires.delete(wireKey(x, y)); }
  function has(x, y) { return wires.has(wireKey(x, y)); }

  function pulse(x, y, time = 0) {
    if (!has(x, y)) return 0;
    const seen = new Set([wireKey(x, y)]);
    const queue = [wires.get(wireKey(x, y))];
    for (let i = 0; i < queue.length; i += 1) {
      const point = queue[i];
      for (const [dx, dy] of WIRE_NEIGHBOURS) {
        const key = wireKey(point.x + dx, point.y + dy);
        if (!wires.has(key) || seen.has(key)) continue;
        if (queue.length === WIRE_LIMIT) return -1;
        seen.add(key);
        queue.push(wires.get(key));
      }
    }

    const doors = new Set();
    const inlets = [];
    const outlets = [];
    for (const point of queue) {
      const spec = tiles.tile(world.get(point.x, point.y));
      const key = wireKey(point.x, point.y);
      if (spec.door) {
        const origin = tiles.originOf(spec, point.x, point.y);
        const originKey = wireKey(origin.x, origin.y);
        if (!doors.has(originKey)) {
          doors.add(originKey);
          hooks.door?.(point);
        }
      } else if (spec.circuitPair) {
        const next = tiles.BY_KEY[spec.circuitPair];
        if (next.solid && (hooks.occupied?.(point.x, point.y) || world.getLevel(point.x, point.y))) continue;
        world.set(point.x, point.y, next.id);
        if (next.solid !== spec.solid) hooks.liquid?.(point.x, point.y);
      } else if (spec.circuit === 'inlet') inlets.push(point);
      else if (spec.circuit === 'outlet') outlets.push(point);
      else if (spec.circuit === 'puzzle-gate') hooks.puzzle?.(point);
      else if (spec.circuit === 'trap' || spec.statueEnemy) {
        if ((cooldowns.get(key) || 0) > time) continue;
        const activated = spec.statueEnemy
          ? hooks.statue?.(spec.statueEnemy, point)
          : hooks.trap?.(point);
        if (activated) cooldowns.set(key, time + (spec.statueEnemy ? 12 : 1));
      }
    }
    for (let i = 0; i < Math.min(inlets.length, outlets.length); i += 1) pump(inlets[i], outlets[i]);
    return queue.length;
  }

  function pump(inlet, outlet) {
    const x1 = inlet.x, y1 = inlet.y - 1;
    const x2 = outlet.x, y2 = outlet.y - 1;
    const source = world.get(x1, y1);
    const target = world.get(x2, y2);
    if (!tiles.tile(source).liquid || (target !== tiles.AIR && target !== source)) return;
    const available = world.getLevel(x1, y1);
    const held = world.getLevel(x2, y2);
    const moved = Math.min(available, world.LEVEL_FULL - held);
    if (moved <= 0 || !world.setLevel(x2, y2, held + moved, source)) return;
    world.setLevel(x1, y1, available - moved, source);
    hooks.liquid?.(x1, y1);
    hooks.liquid?.(x2, y2);
  }

  function toggleTimer(x, y, time) {
    const key = wireKey(x, y);
    if (timers.delete(key)) return false;
    timers.set(key, { x, y, due: time + WIRE_TIMER_SECONDS });
    return true;
  }

  function clearDevice(x, y) {
    const key = wireKey(x, y);
    timers.delete(key);
    cooldowns.delete(key);
  }

  function step(time, plate) {
    const key = plate ? wireKey(plate.x, plate.y) : null;
    if (key && key !== pressed) pulse(plate.x, plate.y, time);
    pressed = key;
    for (const [key, timer] of timers) {
      if (time < timer.due) continue;
      if (tiles.tile(world.get(timer.x, timer.y)).circuit !== 'timer') {
        timers.delete(key);
        continue;
      }
      timer.due = time + WIRE_TIMER_SECONDS;
      pulse(timer.x, timer.y, time);
    }
    // Expired entries are removed on the next one-second boundary.
    if (time >= pruneAt) {
      pruneAt = time + 1;
      for (const [key, until] of cooldowns) if (until <= time) cooldowns.delete(key);
    }
  }

  function serialize() {
    return { wires: Array.from(wires.values(), ({ x, y }) => [x, y]),
      timers: Array.from(timers.values(), ({ x, y }) => [x, y]) };
  }

  function restore(saved, time = 0) {
    wires.clear();
    timers.clear();
    cooldowns.clear();
    pressed = null;
    pruneAt = time + 1;
    for (const [x, y] of saved?.wires || []) if (Number.isInteger(x) && Number.isInteger(y)) add(x, y);
    for (const [x, y] of saved?.timers || []) if (Number.isInteger(x) && Number.isInteger(y)) toggleTimer(x, y, time);
  }

  return { add, remove, has, pulse, step, toggleTimer, clearDevice, serialize, restore,
    get size() { return wires.size; } };
}

const EXPORTS_wiring = { makeWiring };
if (typeof module !== 'undefined' && module.exports) module.exports = EXPORTS_wiring;
else if (typeof FATHOM !== 'undefined') FATHOM.wiring = EXPORTS_wiring;
