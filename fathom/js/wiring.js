'use strict';

const WIRE_NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const WIRE_LIMIT = 1024;
const WIRE_TIMER_SECONDS = 2;
const WIRE_CHANNELS = ['copper', 'blue', 'green'];
const wireKey = (x, y) => x + ':' + y;
const channelKey = (x, y, channel) => wireKey(x, y) + ':' + channel;

function makeWiring(world, tiles, hooks = {}) {
  const wires = new Map();
  const timers = new Map();
  const cooldowns = new Map();
  const relayInputs = new Map();
  let pressed = null;
  let pruneAt = 1;

  function add(x, y, channel = 'copper') {
    if (!WIRE_CHANNELS.includes(channel)) return false;
    const key = channelKey(x, y, channel);
    if (wires.has(key)) return false;
    wires.set(key, { x, y, channel });
    return true;
  }

  function remove(x, y, channel = 'copper') { return wires.delete(channelKey(x, y, channel)); }
  function has(x, y, channel = 'copper') { return wires.has(channelKey(x, y, channel)); }
  function channelsAt(x, y) { return WIRE_CHANNELS.filter(channel => has(x, y, channel)); }

  function pulseAll(x, y, time) {
    let count = 0;
    for (const channel of channelsAt(x, y)) {
      const reached = pulse(x, y, time, channel);
      if (reached < 0) return -1;
      count += reached;
    }
    return count;
  }

  function pulse(x, y, time = 0, channel = 'copper') {
    if (!has(x, y, channel)) return 0;
    const start = channelKey(x, y, channel);
    const seen = new Set([start]);
    const queue = [wires.get(start)];
    for (let i = 0; i < queue.length; i += 1) {
      const point = queue[i];
      for (const [dx, dy] of WIRE_NEIGHBOURS) {
        const key = channelKey(point.x + dx, point.y + dy, channel);
        if (!wires.has(key) || seen.has(key)) continue;
        if (queue.length === WIRE_LIMIT) return -1;
        seen.add(key);
        queue.push(wires.get(key));
      }
    }

    const doors = new Set();
    const inlets = [];
    const outlets = [];
    const outputs = [];
    for (const point of queue) {
      const spec = tiles.tile(world.get(point.x, point.y));
      const key = wireKey(point.x, point.y);
      if (spec.logic) {
        if (channel === 'copper') continue;
        const inputs = (relayInputs.get(key) || 0) | (channel === 'blue' ? 1 : 2);
        if (spec.logic === 'or' || inputs === 3) {
          relayInputs.delete(key);
          outputs.push(point);
        } else relayInputs.set(key, inputs);
      } else if (spec.door) {
        const origin = tiles.originOf(spec, point.x, point.y);
        const originKey = wireKey(origin.x, origin.y);
        if (!doors.has(originKey)) {
          doors.add(originKey);
          hooks.door?.(point);
        }
      } else if (spec.circuitPair) {
        const next = tiles.BY_KEY[spec.circuitPair];
        if (next.solid) {
          if (hooks.occupied?.(point.x, point.y)) continue;
          const level = world.getLevel(point.x, point.y);
          if (level && (!spec.valve || !displaceValveWater(point.x, point.y, level))) continue;
        }
        world.set(point.x, point.y, next.id);
        if (next.solid !== spec.solid) hooks.liquid?.(point.x, point.y);
      } else if (spec.circuit === 'inlet') inlets.push(point);
      else if (spec.circuit === 'outlet') outlets.push(point);
      else if (['puzzle-gate', 'relay-gate', 'drain-gate', 'lens-gate', 'mine-floodgate'].includes(spec.circuit)) continue;
      else if (spec.circuit === 'trap' || spec.circuit === 'arena-trap' || spec.statueEnemy) {
        if ((cooldowns.get(key) || 0) > time) continue;
        const activated = spec.statueEnemy
          ? hooks.statue?.(spec.statueEnemy, point)
          : hooks.trap?.(point);
        if (activated) cooldowns.set(key, time + (spec.statueEnemy ? 12 : 1));
      }
    }
    for (let i = 0; i < Math.min(inlets.length, outlets.length); i += 1) pump(inlets[i], outlets[i]);
    for (const point of queue) {
      const circuit = tiles.tile(world.get(point.x, point.y)).circuit;
      if (['puzzle-gate', 'relay-gate', 'drain-gate', 'lens-gate', 'mine-floodgate'].includes(circuit)) hooks.puzzle?.(point, circuit);
    }
    for (const point of outputs) pulse(point.x, point.y, time, 'copper');
    return queue.length;
  }

  function displaceValveWater(x, y, amount) {
    const water = tiles.idOf('water');
    const destinations = [];
    let remaining = amount;
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
      const tx = x + dx, ty = y + dy;
      const id = world.get(tx, ty);
      if (id !== tiles.AIR && id !== water) continue;
      const held = world.getLevel(tx, ty);
      const moved = Math.min(remaining, world.LEVEL_FULL - held);
      if (moved > 0) destinations.push({ x: tx, y: ty, level: held + moved });
      remaining -= moved;
      if (!remaining) break;
    }
    if (remaining) return false;
    for (const target of destinations) {
      world.setLevel(target.x, target.y, target.level, water);
      hooks.liquid?.(target.x, target.y);
    }
    world.setLevel(x, y, 0, water);
    return true;
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
    relayInputs.delete(key);
  }

  function step(time, plate) {
    const key = plate ? wireKey(plate.x, plate.y) : null;
    if (key && key !== pressed) pulseAll(plate.x, plate.y, time);
    pressed = key;
    for (const [key, timer] of timers) {
      if (time < timer.due) continue;
      if (tiles.tile(world.get(timer.x, timer.y)).circuit !== 'timer') {
        timers.delete(key);
        continue;
      }
      timer.due = time + WIRE_TIMER_SECONDS;
      pulseAll(timer.x, timer.y, time);
    }
    // Expired entries are removed on the next one-second boundary.
    if (time >= pruneAt) {
      pruneAt = time + 1;
      for (const [key, until] of cooldowns) if (until <= time) cooldowns.delete(key);
    }
  }

  function serialize() {
    return { wires: Array.from(wires.values(), ({ x, y, channel }) => channel === 'copper' ? [x, y] : [x, y, channel]),
      relays: [...relayInputs],
      timers: Array.from(timers.values(), ({ x, y }) => [x, y]) };
  }

  function restore(saved, time = 0) {
    wires.clear();
    timers.clear();
    cooldowns.clear();
    relayInputs.clear();
    pressed = null;
    pruneAt = time + 1;
    for (const [x, y, channel] of saved?.wires || []) if (Number.isInteger(x) && Number.isInteger(y)) add(x, y, channel);
    for (const [key, inputs] of saved?.relays || []) if (inputs === 1 || inputs === 2) relayInputs.set(key, inputs);
    for (const [x, y] of saved?.timers || []) if (Number.isInteger(x) && Number.isInteger(y)) toggleTimer(x, y, time);
  }

  return { add, remove, has, channelsAt, pulse, pulseAll, step, toggleTimer, clearDevice, serialize, restore,
    get size() { return wires.size; } };
}

// Beams advance one tile at a time and stop at a wall, sensor, or repeating state.
function traceBeam(world, tiles, x, y, limit = 48) {
  const points = [{ x, y }];
  let dx = 1, dy = 0;
  const visited = new Set();
  for (let distance = 0; distance < limit; distance += 1) {
    x += dx;
    y += dy;
    const spec = tiles.tile(world.get(x, y));
    if (spec.solid) break;
    const key = x + ':' + y + ':' + dx + ':' + dy;
    if (visited.has(key)) break;
    visited.add(key);
    points.push({ x, y });
    if (spec.optic === 'sensor') return { points, sensor: { x, y } };
    if (spec.optic === 'slash') [dx, dy] = [-dy, -dx];
    if (spec.optic === 'backslash') [dx, dy] = [dy, dx];
  }
  return { points, sensor: null };
}

function seedLensWiring(wiring, site) {
  function line(channel, x, y, x2, y2) {
    for (;;) {
      wiring.add(site.x + x, site.y + y, channel);
      if (x === x2 && y === y2) break;
      x += Math.sign(x2 - x);
      y += Math.sign(y2 - y);
    }
  }
  line('blue', 4, 120, 4, 119);
  line('blue', 4, 119, 8, 119);
  line('green', 15, 120, 8, 120);
  line('green', 8, 120, 8, 119);
  line('copper', 8, 119, 8, 114);
  line('copper', 8, 114, 11, 114);
  line('copper', 11, 119, 11, 121);
  line('copper', 11, 110, 18, 110);
  line('copper', 18, 110, 18, 119);
  line('copper', -14, 144, -14, 135);
  line('copper', -14, 135, -10, 135);
}

const EXPORTS_wiring = { makeWiring, traceBeam, seedLensWiring };
if (typeof module !== 'undefined' && module.exports) module.exports = EXPORTS_wiring;
else if (typeof FATHOM !== 'undefined') FATHOM.wiring = EXPORTS_wiring;
