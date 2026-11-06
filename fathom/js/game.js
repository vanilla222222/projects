'use strict';
// Game shell: input, camera, mining, placing, stats and save. A fixed simulation timestep
// keeps physics independent of frame rate; rendering shows whatever the latest state is.

const STEP = 1 / 120;
const DAY_SECONDS = 600;
const PICKUP_RANGE = 2.2;

function makeGame(canvas, deps) {
  const { tiles, worldgen, chunks, light, texture, render, player: physics,
    noise, autotile, mining, craft, liquid: liquidModule, enemy: enemyModule,
    minimap: minimapModule, housing, villager: villagerModule,
    inventory: inventoryModule, stats: statsModule, ui: uiModule,
    profile: profileModule, menu: menuModule } = deps;

  const profiles = profileModule.makeProfiles(window.localStorage);
  const menu = menuModule.makeMenu(document.getElementById('menu'),
    { profiles, palette: profileModule, parseSeed: profileModule.parseSeed });

  // Nothing world-shaped exists until a world is chosen, so each of these is filled in by
  // boot(). A character brings its own inventory and stats into whichever world it enters.
  let seed = 0;
  let world = null;
  let renderer = null;
  let inventory = null;
  let stats = null;
  let ui = null;
  let liquid = null;
  let swarm = null;
  let minimap = null;
  let village = null;
  let talking = null;
  let swingCooldown = 0;
  let openChest = null;
  let characterId = null;
  let worldId = null;
  let running = false;
  let sessionStart = 0;
  let carriedCharacterSeconds = 0;
  let carriedWorldSeconds = 0;

  const state = {
    world: null,
    stations: new Set(),
    arrows: [],
    stats: null,
    player: null,
    colours: null,
    camera: { x: 0, y: 0, zoom: 2 },
    dayPhase: 0.12,
    time: 0,
    particles: [],
    drops: [],
    paused: false,
    message: '',
    messageUntil: 0
  };

  const input = { left: false, right: false, jump: false, down: false, dig: false };
  const pointer = { x: 0, y: 0 };
  let lastView = null;

  // Somewhere to stand, not merely somewhere that is not solid. Cave mouths now break the
  // surface often enough that spawning on the first clear column dropped the player down
  // a shaft at the start of the game; it has to be clear AND have ground under it.
  // Where a character with no bed comes back to: the same search that places them at the
  // start of a new world, so it is always somewhere standable rather than world origin.
  function defaultSpawn() {
    const p = spawnPlayer();
    return { x: p.x, y: p.y };
  }

  function spawnPlayer() {
    for (let probe = 0; probe < 400; probe += 1) {
      const column = (probe % 2 ? -1 : 1) * Math.ceil(probe / 2) * 7;
      const surface = worldgen.surfaceHeight(seed, column);
      if (!tiles.isSolid(world.get(column, surface))) continue;
      const candidate = physics.makePlayer(column + 0.1, surface - 3);
      if (physics.overlapsSolid(world, tiles, candidate.x, candidate.y,
        candidate.width, candidate.height)) continue;
      // And not standing in the sea.
      if (world.getLevel(column, surface - 1) > 0) continue;
      return candidate;
    }
    return physics.makePlayer(0, worldgen.SKY_H);
  }

  function say(text, seconds) {
    state.message = text;
    state.messageUntil = state.time + (seconds || 2.6);
  }

  function selectedItem() {
    return inventory.slots[inventory.section('hotbar').from + state.player.selected];
  }

  function spawnParticles(x, y, colour, count) {
    for (let i = 0; i < count; i += 1) {
      state.particles.push({
        x: x + Math.random(), y: y + Math.random(),
        vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 5,
        size: 0.1 + Math.random() * 0.14,
        life: 0.5 + Math.random() * 0.5, maxLife: 1,
        colour: colour || '#ffffff'
      });
    }
  }

  // Mined blocks become items on the ground that fly to the player, rather than appearing in
  // the backpack from nowhere. A full backpack therefore leaves them lying there.
  function dropItem(x, y, key, kind, count) {
    state.drops.push({ x: x + 0.5, y: y + 0.5, vx: (Math.random() - 0.5) * 2, vy: -3,
      key, kind: kind || 'block', count: count || 1, age: 0 });
  }

  function updateDrops(dt) {
    const p = state.player;
    const px = p.x + p.width / 2;
    const py = p.y + p.height / 2;
    for (let i = state.drops.length - 1; i >= 0; i -= 1) {
      const d = state.drops[i];
      d.age += dt;
      d.vy = Math.min(32, d.vy + 44 * dt);
      const nextY = d.y + d.vy * dt;
      if (tiles.isSolid(world.get(Math.floor(d.x), Math.floor(nextY)))) {
        d.vy = 0;
        d.vx *= 0.7;
      } else {
        d.y = nextY;
      }
      const nextX = d.x + d.vx * dt;
      if (!tiles.isSolid(world.get(Math.floor(nextX), Math.floor(d.y)))) d.x = nextX;
      else d.vx = 0;
      if (d.age < 0.35) continue;
      const dist = Math.hypot(px - d.x, py - d.y);
      if (dist < PICKUP_RANGE * ((state.gear && state.gear.pickup) || 1)) {
        const pull = 26 * dt;
        d.x += (px - d.x) * Math.min(1, pull);
        d.y += (py - d.y) * Math.min(1, pull);
      }
      if (dist < 0.55) {
        const left = inventory.add({ key: d.key, kind: d.kind }, d.count);
        if (left === 0) state.drops.splice(i, 1);
        else if (left < d.count) d.count = left;
        else if (d.age > 1.2) say('Backpack full', 1.4);
      }
    }
    if (state.drops.length > 300) state.drops.splice(0, state.drops.length - 300);
  }

  function mine(dt) {
    const aim = physics.aimTile(state.player, pointer);
    if (!aim.inReach) {
      state.player.mining = null;
      return;
    }
    const id = world.get(aim.x, aim.y);
    const wallId = world.getWall(aim.x, aim.y);
    const diggingWall = id === tiles.AIR && wallId !== 0;
    if (id === tiles.AIR && !diggingWall) {
      state.player.mining = null;
      return;
    }

    // You have to be holding the right tool, as in Terraria: a pickaxe for blocks, an axe
    // for trees, a hammer for the background walls. That is what makes the starting four
    // a set rather than four copies of the same thing.
    const held = selectedItem();
    const tool = mining.isTool(held) ? held : null;
    const spec = diggingWall ? tiles.wall(wallId) : tiles.tile(id);
    const wanted = mining.jobFor(diggingWall ? null : spec, diggingWall);
    if (!tool) {
      state.player.mining = null;
      say('Hold a ' + wanted + ' to break that', 0.9);
      return;
    }
    const job = mining.toolSpec(tool.key).job;
    if (job !== wanted) {
      state.player.mining = null;
      say(spec.name + ' needs a ' + wanted, 1.1);
      return;
    }

    const gear = state.gear || { power: 1, swing: 1 };
    const power = mining.powerOf(tool) * gear.power;
    // Walls come away like soft ground: they are a backing, not a seam of rock.
    const perHit = diggingWall ? power * 2 : mining.damagePerHit(power, spec);
    if (perHit <= 0) {
      state.player.mining = null;
      say(spec.name + ' needs a ' + mining.requirementName(spec), 1.6);
      return;
    }

    const current = state.player.mining;
    if (!current || current.x !== aim.x || current.y !== aim.y || current.wall !== diggingWall) {
      // A fresh tile starts undamaged and swings at once, so the first click always bites.
      const toughness = diggingWall ? mining.BREAK_AT : mining.toughnessOf(spec);
      state.player.mining = { x: aim.x, y: aim.y, damage: perHit, swing: 0,
        id, wall: diggingWall, perHit, toughness };
      spawnParticles(aim.x, aim.y, spec.colour, 2);
      if (perHit < toughness) return;
    } else {
      current.perHit = perHit;
      current.swing += dt;
      const swingTime = mining.useTimeOf(tool) * gear.swing;
      if (current.swing < swingTime) return;
      current.swing -= swingTime;
      current.damage += perHit;
      spawnParticles(aim.x, aim.y, spec.colour, 2);
      if (current.damage < current.toughness) return;
    }

    if (diggingWall) {
      world.setWall(aim.x, aim.y, 0);
      spawnParticles(aim.x, aim.y, spec.colour, 6);
      dropItem(aim.x, aim.y, spec.key, 'wall', 1);
    } else {
      const origin = tiles.originOf(spec, aim.x, aim.y);
      if (origin && spec.chest) {
        // A broken chest gives up everything inside it rather than swallowing it.
        if (openChest && openChest.x === origin.x && openChest.y === origin.y) closeChest();
        for (const item of world.getContainer(origin.x, origin.y) || []) {
          dropItem(origin.x, origin.y, item.key, item.kind, item.count);
        }
        world.setContainer(origin.x, origin.y, []);
      }
      if (origin) breakMulti(origin);
      else world.set(aim.x, aim.y, tiles.AIR);
      spawnParticles(aim.x, aim.y, spec.colour, 9);
      dropItem(aim.x, aim.y, spec.drops || spec.key, craft.kindOf(spec.drops || spec.key), 1);
      // Cutting rock can open a reservoir, so every neighbour of the hole is woken.
      if (liquid) liquid.activateAround(aim.x, aim.y);
    }
    state.player.mining = null;
  }

  // A bucket holds exactly one full tile of water. Scooping takes the fullest tile within
  // reach rather than the aimed one, so dipping into a pool works without pixel-hunting
  // for the tile that happens to be brim-full.
  function useBucket(item, aim) {
    if (item.key === 'water-bucket') {
      if (tiles.isSolid(world.get(aim.x, aim.y))) return true;
      if (world.getLevel(aim.x, aim.y) >= world.LEVEL_FULL) return true;
      const room = world.LEVEL_FULL - world.getLevel(aim.x, aim.y);
      world.setLevel(aim.x, aim.y, world.getLevel(aim.x, aim.y) + room);
      liquid.activateAround(aim.x, aim.y);
      inventory.take('water-bucket', 1);
      inventory.add({ key: 'bucket', kind: 'tool' }, 1);
      say('Poured', 0.8);
      return true;
    }
    if (item.key !== 'bucket') return false;
    let best = null;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const level = world.getLevel(aim.x + dx, aim.y + dy);
        if (level > 0 && (!best || level > best.level)) {
          best = { x: aim.x + dx, y: aim.y + dy, level };
        }
      }
    }
    if (!best) {
      say('Nothing to scoop', 0.9);
      return true;
    }
    // A partial tile still fills the bucket: a bucket is a unit, not a measure.
    world.setLevel(best.x, best.y, 0);
    liquid.activateAround(best.x, best.y);
    inventory.take('bucket', 1);
    inventory.add({ key: 'water-bucket', kind: 'tool' }, 1);
    say('Filled', 0.8);
    return true;
  }

  // Everything the worn equipment adds up to, recomputed each step rather than cached,
  // so taking a piece off in the inventory screen matters immediately.
  function wornKeys(section) {
    const range = inventory.section(section);
    const out = [];
    for (let i = range.from; i < range.to; i += 1) {
      out.push(inventory.slots[i] ? inventory.slots[i].key : null);
    }
    return out;
  }

  function currentEffects() {
    return craft.equipEffects(wornKeys('armor'), wornKeys('accessory'));
  }

  // Loose a bow. An arrow is a small body that flies, falls, and stops at the first thing
  // it meets; spending the ammunition is what distinguishes it from a sword swing.
  function shoot(weapon) {
    if (!inventory.countOf(weapon.ammo)) {
      say('Out of ' + craft.nameOf(weapon.ammo, tiles), 1.0);
      return false;
    }
    inventory.take(weapon.ammo, 1);
    const cx = state.player.x + state.player.width / 2;
    const cy = state.player.y + state.player.height * 0.4;
    const dx = pointer.x - cx;
    const dy = pointer.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    state.arrows.push({ x: cx, y: cy, vx: (dx / len) * 42, vy: (dy / len) * 42,
      damage: weapon.damage, life: 2.6 });
    return true;
  }

  function updateArrows(dt) {
    for (let i = state.arrows.length - 1; i >= 0; i -= 1) {
      const a = state.arrows[i];
      a.life -= dt;
      a.vy += 26 * dt;
      const steps = Math.ceil(Math.hypot(a.vx, a.vy) * dt / 0.3) || 1;
      let hit = false;
      for (let s2 = 0; s2 < steps && !hit; s2 += 1) {
        a.x += (a.vx * dt) / steps;
        a.y += (a.vy * dt) / steps;
        if (tiles.isSolid(world.get(Math.floor(a.x), Math.floor(a.y)))) hit = true;
        else if (swarm) {
          const target = swarm.at(a.x, a.y);
          if (target) {
            hit = true;
            spawnParticles(a.x, a.y, target.spec.colour, 5);
            if (swarm.damage(target, a.damage)) {
              for (const [key, count] of target.spec.drops || []) {
                dropItem(target.x, target.y, key, craft.kindOf(key), count);
              }
            }
          }
        }
      }
      if (hit || a.life <= 0) state.arrows.splice(i, 1);
    }
  }

  // Swing at an enemy under the cursor. Returns true if something was struck, so mining
  // does not also happen in the same frame.
  function attack() {
    if (swingCooldown > 0) return false;
    const item = selectedItem();
    const weapon = item ? craft.WEAPONS[item.key] : null;
    // A bow does not need something under the cursor: it fires where you point.
    if (weapon && weapon.ranged) {
      if (!shoot(weapon)) return true;
      swingCooldown = weapon.useTime;
      return true;
    }
    if (!swarm) return false;
    const reach = weapon ? weapon.reach : 2.2;
    const target = swarm.at(pointer.x, pointer.y);
    if (!target) return false;
    const cx = state.player.x + state.player.width / 2;
    const cy = state.player.y + state.player.height / 2;
    if (Math.hypot(target.x - cx, target.y - cy) > reach + 1.5) return false;

    // A pickaxe will do, badly. That is the argument for making a sword.
    let hit = 3;
    let cooldown = 0.4;
    if (weapon) {
      hit = weapon.damage;
      cooldown = weapon.useTime;
    } else if (mining.isTool(item)) {
      hit = Math.max(3, Math.round(mining.powerOf(item) * 0.3));
      cooldown = mining.useTimeOf(item) * 1.5;
    }
    swingCooldown = cooldown;
    target.vx += Math.sign(target.x - cx) * 6;
    target.vy -= 3;
    spawnParticles(target.x, target.y, target.spec.colour, 5);
    if (swarm.damage(target, hit)) {
      for (const [key, count] of target.spec.drops || []) {
        dropItem(target.x, target.y, key, craft.kindOf(key), count);
      }
      spawnParticles(target.x, target.y, target.spec.colour, 14);
      say(target.spec.name + ' died', 1.0);
    }
    return true;
  }

  function respawnPlayer() {
    state.progress.deaths += 1;
    statsModule.respawn(stats);
    const spot = state.spawn || defaultSpawn();
    state.player.x = spot.x;
    state.player.y = spot.y;
    state.player.vx = 0;
    state.player.vy = 0;
    if (swarm) swarm.clear();
    say('You died', 2.2);
  }

  // A door swings when you use it, whatever you are holding. Checked before anything the
  // held item would do, because reaching for a door with a block in hand is the common
  // case and walling the doorway up instead would be infuriating.
  // Open the chest under the cursor, or shut the one that is open. A chest is a
  // multi-tile object, so any of its four cells opens the same box.
  function useChest(aim) {
    const spec = tiles.tile(world.get(aim.x, aim.y));
    if (!spec.chest) return false;
    const origin = tiles.originOf(spec, aim.x, aim.y);
    if (!origin) return false;
    if (openChest && openChest.x === origin.x && openChest.y === origin.y) {
      closeChest();
      return true;
    }
    const items = (world.getContainer(origin.x, origin.y) || []).map(it => ({ ...it }));
    while (items.length < ui.CHEST_SLOTS) items.push(null);
    openChest = { x: origin.x, y: origin.y, items: items.slice(0, ui.CHEST_SLOTS) };
    ui.openChest(openChest);
    ui.setOpen(true);
    say(spec.name, 1.0);
    return true;
  }

  function closeChest() {
    if (!openChest) return;
    // Write back only what is actually there, so an emptied chest saves as an empty
    // list rather than twenty nulls.
    world.setContainer(openChest.x, openChest.y, openChest.items.filter(Boolean));
    openChest = null;
    ui.closeChest();
  }

  function chestMove(index, toChest) {
    if (!openChest) return;
    if (toChest) {
      // Stow whatever is selected in the hotbar into the first free chest slot.
      const held = selectedItem();
      if (!held) return;
      let slot = openChest.items.findIndex(it => it && it.key === held.key
        && it.count < inventoryModule.STACK_MAX);
      if (slot < 0) slot = openChest.items.findIndex(it => !it);
      if (slot < 0) {
        say('Chest is full', 1.0);
        return;
      }
      const moving = held.count;
      if (openChest.items[slot]) openChest.items[slot].count += moving;
      else openChest.items[slot] = { key: held.key, kind: held.kind, count: moving };
      inventory.take(held.key, moving);
      ui.sync(state);
      return;
    }
    const item = openChest.items[index];
    if (!item) return;
    const left = inventory.add({ key: item.key, kind: item.kind }, item.count);
    if (left === item.count) {
      say('Backpack full', 1.0);
      return;
    }
    if (left > 0) item.count = left;
    else openChest.items[index] = null;
    ui.sync(state);
  }

  // Sleeping sets where you come back. In an infinite world this is the difference
  // between dying and losing an afternoon's walk.
  // Talk to whoever is standing nearby. Checked before the tile under the cursor,
  // because walking up to somebody and clicking is how a player expects to start a
  // conversation, not aiming at their feet.
  function talkTo() {
    if (!village) return false;
    const who = village.nearest(state.player.x + state.player.width / 2,
      state.player.y + state.player.height / 2);
    if (!who) return false;
    if (talking && talking.key === who.key) {
      talking = null;
      ui.closeShop();
      return true;
    }
    talking = who;
    ui.openShop(who, { coins: inventory.countOf('coin') });
    ui.setOpen(true);
    say(who.spec.greeting, 4);
    return true;
  }

  function buyFrom(index) {
    if (!talking) return;
    const entry = talking.spec.stock[index];
    if (!entry) return;
    if (inventory.countOf('coin') < entry.price) {
      say('Not enough coin', 1.2);
      return;
    }
    const left = inventory.add({ key: entry.key, kind: craft.kindOf(entry.key) }, entry.count);
    if (left > 0) {
      inventory.take(entry.key, entry.count - left);
      say('No room for that', 1.2);
      return;
    }
    inventory.take('coin', entry.price);
    say('Bought ' + craft.nameOf(entry.key, tiles), 1.2);
    ui.openShop(talking, { coins: inventory.countOf('coin') });
    ui.sync(state);
  }

  function healFrom() {
    if (!talking || !talking.spec.heals) return;
    if (stats.health >= stats.maxHealth) {
      say('You are unhurt', 1.2);
      return;
    }
    if (inventory.countOf('coin') < talking.spec.healPrice) {
      say('Not enough coin', 1.2);
      return;
    }
    inventory.take('coin', talking.spec.healPrice);
    statsModule.heal(stats, stats.maxHealth);
    say('Patched up', 1.4);
    ui.openShop(talking, { coins: inventory.countOf('coin') });
    ui.sync(state);
  }

  // Ask whether the room the player is standing in is a house, and move somebody in if
  // it is. The answer is a list of what is missing, which is the useful form.
  function checkHousing() {
    if (!village) return;
    const result = village.settle(state.progress,
      state.player.x + state.player.width / 2, state.player.y);
    if (result.moved) {
      say(result.moved.spec.name + ' has moved in', 3);
      return;
    }
    if (!result.room.valid) {
      say('Not a home: ' + result.room.problems[0], 3.5);
      return;
    }
    say('A fine room, but nobody new wants it yet', 3);
  }

  function useBed(aim) {
    const spec = tiles.tile(world.get(aim.x, aim.y));
    if (!spec.bed) return false;
    const origin = tiles.originOf(spec, aim.x, aim.y);
    if (!origin) return false;
    // Stand the player beside the bed when they wake, not inside it.
    state.spawn = { x: origin.x + 1, y: origin.y - 1 };
    say('Spawn point set', 1.6);
    return true;
  }

  function useDoor(aim) {
    const spec = tiles.tile(world.get(aim.x, aim.y));
    if (!spec.door) return false;
    const origin = tiles.originOf(spec, aim.x, aim.y);
    if (!origin) return false;
    const want = tiles.MULTI[spec.swings];
    if (!want) return false;

    // A door only closes into empty space, so it can never shut on the player.
    if (spec.door === 'open') {
      const p = state.player;
      for (let dy = 0; dy < origin.h; dy += 1) {
        const ty = origin.y + dy;
        if (origin.x + 1 > p.x && origin.x < p.x + p.width
          && ty + 1 > p.y && ty < p.y + p.height) {
          say('Something is in the way', 0.9);
          return true;
        }
      }
    }
    for (let dy = 0; dy < origin.h; dy += 1) {
      for (let dx = 0; dx < origin.w; dx += 1) {
        world.set(origin.x + dx, origin.y + dy, tiles.cellOf(spec.swings, dx, dy).id);
      }
    }
    if (liquid) liquid.activateAround(origin.x, origin.y);
    return true;
  }

  // Put down a whole multi-tile object, or refuse. Every cell must be clear and the
  // object must have something to stand on, so a door cannot be hung in mid-air.
  function placeMulti(def, aim) {
    const x0 = aim.x;
    const y0 = aim.y - (def.h - 1);          // anchored by the cell under the cursor
    for (let dy = 0; dy < def.h; dy += 1) {
      for (let dx = 0; dx < def.w; dx += 1) {
        const id = world.get(x0 + dx, y0 + dy);
        if (id !== tiles.AIR) return false;
      }
    }
    let supported = false;
    for (let dx = 0; dx < def.w; dx += 1) {
      if (tiles.isSolid(world.get(x0 + dx, y0 + def.h))) supported = true;
    }
    if (!supported) return false;
    for (let dy = 0; dy < def.h; dy += 1) {
      for (let dx = 0; dx < def.w; dx += 1) {
        world.set(x0 + dx, y0 + dy, tiles.cellOf(def.key, dx, dy).id);
      }
    }
    if (liquid) liquid.activateAround(x0, y0);
    return true;
  }

  // Take a whole multi-tile object away when any one of its cells is broken, so a door
  // can never be left as two thirds of a door.
  function breakMulti(origin) {
    for (let dy = 0; dy < origin.h; dy += 1) {
      for (let dx = 0; dx < origin.w; dx += 1) {
        world.set(origin.x + dx, origin.y + dy, tiles.AIR);
      }
    }
    if (liquid) liquid.activateAround(origin.x, origin.y);
  }

  function place() {
    const aim0 = physics.aimTile(state.player, pointer);
    if (talkTo()) return;
    if (aim0.inReach && useBed(aim0)) return;
    if (aim0.inReach && useChest(aim0)) return;
    if (aim0.inReach && useDoor(aim0)) return;
    const item = selectedItem();
    if (!item) return;
    const aim = physics.aimTile(state.player, pointer);
    if (!aim.inReach) return;
    if (useBucket(item, aim)) return;

    // A multi-tile object is placed as one piece or not at all.
    const multi = tiles.MULTI[item.key];
    if (multi) {
      if (placeMulti(multi, aim)) inventory.take(item.key, 1);
      return;
    }

    if (item.kind === 'wall') {
      if (world.getWall(aim.x, aim.y) !== 0) return;
      const anchored = world.getWall(aim.x - 1, aim.y) || world.getWall(aim.x + 1, aim.y)
        || world.getWall(aim.x, aim.y - 1) || world.getWall(aim.x, aim.y + 1)
        || tiles.isSolid(world.get(aim.x, aim.y));
      if (!anchored) return;
      world.setWall(aim.x, aim.y, tiles.wallIdOf(item.key));
      inventory.take(item.key, 1);
      return;
    }

    if (world.get(aim.x, aim.y) !== tiles.AIR) return;
    const spec = tiles.BY_KEY[item.key];
    if (!spec) return;
    if (spec.solid) {
      const p = state.player;
      const overlapsPlayer = aim.x + 1 > p.x && aim.x < p.x + p.width
        && aim.y + 1 > p.y && aim.y < p.y + p.height;
      if (overlapsPlayer) return;
    }
    // A torch can hang on a wall with no block beneath it; a block needs something to sit against.
    const againstBlock = tiles.isSolid(world.get(aim.x - 1, aim.y))
      || tiles.isSolid(world.get(aim.x + 1, aim.y))
      || tiles.isSolid(world.get(aim.x, aim.y - 1))
      || tiles.isSolid(world.get(aim.x, aim.y + 1));
    const againstWall = world.getWall(aim.x, aim.y) !== 0;
    if (!againstBlock && !(spec.emit > 0 && againstWall)) return;
    world.set(aim.x, aim.y, spec.id);
    inventory.take(item.key, 1);
    // Placing a block can displace or dam water just as surely as removing one.
    if (liquid) liquid.activateAround(aim.x, aim.y);
  }

  function simulate(dt) {
    // Water first, so what the player collides with this step is where the water ended up
    // rather than where it was. The budget is per step, not per frame, which keeps a
    // collapsing reservoir from stalling the loop.
    if (liquid) liquid.step(900);
    swingCooldown = Math.max(0, swingCooldown - dt);
    const before = state.player.x;
    physics.step(state.player, world, tiles, input, dt);
    const moving = Math.abs(state.player.x - before) > 1e-4 || !state.player.onGround;
    statsModule.step(stats, dt * (((state.gear && state.gear.regen) || 1)), moving);
    // A swing at something alive takes priority over a swing at the rock behind it.
    if (input.dig && !ui.isOpen && attack()) state.player.mining = null;
    else if (input.dig && !ui.isOpen) mine(dt);
    else state.player.mining = null;

    // An open chest is shut by walking away from it, and by the backpack closing for any
    // reason at all. Making that an invariant checked every step, rather than something
    // each exit path has to remember, is what stops a chest being left open and its
    // contents never written back.
    if (openChest) {
      const dx = openChest.x - state.player.x;
      const dy = openChest.y - state.player.y;
      if (!ui.isOpen || Math.hypot(dx, dy) > physics.REACH + 3) closeChest();
    }
    if (talking && !ui.isOpen) { talking = null; ui.closeShop(); }

    // Revealed from the simulation rather than the draw, so the map fills in whether or
    // not the player is looking at it.
    if (minimap) minimap.reveal(world, state.player.x, state.player.y);

    if (village) village.step(dt);
    // What the player has done, which is what decides who is willing to move in.
    const depth = Math.floor(state.player.y) - worldgen.surfaceHeight(seed, Math.floor(state.player.x));
    if (depth > state.progress.deepest) state.progress.deepest = depth;
    state.progress.coins = inventory.countOf('coin');

    const gear = currentEffects();
    state.gear = gear;
    stats.defense = gear.defense;
    state.player.speedScale = gear.speed;
    state.player.canDoubleJump = gear.doubleJump;

    if (swarm) {
      swarm.step(state.player, dt, state.dayPhase);
      const hit = swarm.touching(state.player);
      if (hit) {
        const dealt = statsModule.damage(stats, hit.spec.damage);
        if (dealt > 0) {
          // Knocked away from whatever hit you, so contact damage is not a death loop.
          const away = Math.sign(state.player.x - hit.x) || 1;
          state.player.vx = away * 9;
          state.player.vy = -7;
          say(hit.spec.name + ' hit you for ' + dealt, 1.1);
        }
      }
    }

    // Landing hard. `landed` is the distance of the fall that just ended, set by the
    // physics step on the frame the feet touch down.
    if (state.player.landed > 0) {
      const hurt = Math.round(statsModule.fallDamage(state.player.landed) * gear.fallMul);
      state.player.landed = 0;
      if (hurt > 0) {
        // Armour does not soften a fall, so the mitigation is explicitly skipped.
        const dealt = statsModule.damage(stats, hurt, 0);
        if (dealt > 0) {
          say('Hard landing', 1.2);
          spawnParticles(state.player.x, state.player.y + state.player.height, '#9a8878', 8);
        }
      }
    }

    // Air. Running out of it costs health every second until you surface.
    const drowning = statsModule.stepBreath(stats, dt / gear.breathMul,
      state.player.submerged && gear.breathMul !== Infinity);
    if (drowning > 0) {
      stats.invulnerable = 0;
      const dealt = statsModule.damage(stats, drowning, 0);
      if (dealt > 0 && Math.random() < 0.08) say('Drowning!', 0.8);
    }

    // Standing in lava burns. It is the only tile in the world that hurts by itself.
    const feet = tiles.tile(world.get(Math.floor(state.player.x + state.player.width / 2),
      Math.floor(state.player.y + state.player.height * 0.6)));
    if (feet.hot && !gear.fireproof) {
      const burnt = statsModule.damage(stats, 24);
      if (burnt > 0) say('Burning!', 0.9);
    }

    if (stats.dead) respawnPlayer();
    updateDrops(dt);
    updateArrows(dt);

    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.vy += 34 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (tiles.isSolid(world.get(Math.floor(p.x), Math.floor(p.y)))) {
        p.vy = -p.vy * 0.26;
        p.vx *= 0.52;
      }
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }

    state.dayPhase = (state.dayPhase + dt / DAY_SECONDS) % 1;
    const target = state.player;
    const lerp = 1 - Math.pow(0.0015, dt);
    state.camera.x += (target.x + target.width / 2 - state.camera.x) * lerp;
    state.camera.y += (target.y + target.height / 2 - state.camera.y) * lerp;

    const size = texture.TILE * state.camera.zoom;
    const cols = Math.ceil(canvas.width / size) + 2;
    const rows = Math.ceil(canvas.height / size) + 2;
    const cx = Math.floor(state.camera.x / worldgen.CHUNK);
    const cy = Math.floor(state.camera.y / worldgen.CHUNK);
    const span = Math.ceil(Math.max(cols, rows) / worldgen.CHUNK) + 2;
    world.evictOutside(cx - span, cy - span, cx + span, cy + span);
  }

  let accumulator = 0;
  let previous = 0;
  function frame(now) {
    if (!running) return;
    const dt = previous ? Math.min(0.25, (now - previous) / 1000) : 0;
    previous = now;
    if (!state.paused) {
      accumulator += dt;
      let guard = 0;
      while (accumulator >= STEP && guard < 240) {
        simulate(STEP);
        accumulator -= STEP;
        state.time += STEP;
        guard += 1;
      }
    }
    lastView = renderer.draw(state);
    if (minimap) minimap.draw(state, dt);
    drawAim();
    syncUI();
    requestAnimationFrame(frame);
  }

  function drawAim() {
    if (!lastView || ui.isOpen) return;
    const ctx = canvas.getContext('2d');
    const size = texture.TILE * lastView.zoom;
    const aim = physics.aimTile(state.player, pointer);
    const sx = (aim.x - lastView.x0) * size - lastView.offsetX;
    const sy = (aim.y - lastView.y0) * size - lastView.offsetY;
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = aim.inReach ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.18)';
    ctx.strokeRect(sx + 1, sy + 1, size - 2, size - 2);
    const dig = state.player.mining;
    if (dig) {
      const spec = dig.wall ? tiles.wall(dig.id) : tiles.tile(dig.id);

      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.fillRect(sx + 2, sy + size - 6, (size - 4) * Math.min(1, dig.damage / dig.toughness), 4);
    }
    ctx.restore();
  }

  function syncUI() {
    // Recomputed every frame so that mining a bench out, or walking away from one, closes
    // its recipes the moment it happens rather than the next time the screen is opened.
    state.stations = craft.stationsNear(world, tiles, state.player.x, state.player.y);
    const hour = ((state.dayPhase + 0.5) * 24) % 24;
    ui.setField('clock', String(Math.floor(hour)).padStart(2, '0') + ':'
      + String(Math.floor((hour % 1) * 60)).padStart(2, '0'));
    ui.setField('biome', worldgen.biomeAt(seed, Math.floor(state.player.x)).name);
    const depth = Math.floor(state.player.y) - worldgen.surfaceHeight(seed, Math.floor(state.player.x));
    ui.setField('depth', depth > 0 ? depth + 'm down' : 'surface');
    ui.setField('coords', Math.floor(state.player.x) + ', ' + Math.floor(state.player.y));
    ui.setField('seed', String(seed));
    ui.setMessage(state.time < state.messageUntil ? state.message : '');
    ui.sync(state);
  }

  function worldFromScreen(ev) {
    const rect = canvas.getBoundingClientRect();
    const px = (ev.clientX - rect.left) * (canvas.width / rect.width);
    const py = (ev.clientY - rect.top) * (canvas.height / rect.height);
    const size = texture.TILE * state.camera.zoom;
    pointer.x = state.camera.x + (px - canvas.width / 2) / size;
    pointer.y = state.camera.y + (py - canvas.height / 2) / size;
  }

  function bind() {
    const keymap = {
      ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
      ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', ArrowDown: 'down', KeyS: 'down'
    };
    addEventListener('keydown', (ev) => {
      if (!running) return;
      if (ev.code === 'KeyE' || ev.code === 'Tab' || ev.code === 'KeyI') {
        // Shutting the backpack shuts whatever chest was open with it, which is both
        // what a player expects and what makes sure the contents get written back.
        if (ui.isOpen) closeChest();
        ui.toggle();
        ev.preventDefault();
        return;
      }
      if (ev.code === 'KeyH') {
        checkHousing();
        ev.preventDefault();
        return;
      }
      if (ev.code === 'KeyM' && minimap) {
        minimap.setLarge(!minimap.isLarge);
        ev.preventDefault();
        return;
      }
      if ((ev.code === 'BracketLeft' || ev.code === 'BracketRight') && minimap) {
        minimap.zoomBy(ev.code === 'BracketRight' ? 1 : -1);
        ev.preventDefault();
        return;
      }
      if (ev.code === 'Escape' && minimap && minimap.isLarge) {
        minimap.setLarge(false);
        return;
      }
      if (ev.code === 'Escape' && ui.isOpen) {
        closeChest();
        ui.setOpen(false);
        return;
      }
      if (keymap[ev.code]) {
        input[keymap[ev.code]] = true;
        ev.preventDefault();
      }
      if (ev.code.startsWith('Digit')) {
        const n = Number(ev.code.slice(5));
        state.player.selected = n === 0 ? 9 : n - 1;
      }
      if (ev.code === 'KeyP') state.paused = !state.paused;
      if (ev.code === 'BracketRight') state.camera.zoom = Math.min(4, state.camera.zoom + 0.5);
      if (ev.code === 'BracketLeft') state.camera.zoom = Math.max(1, state.camera.zoom - 0.5);
    });
    addEventListener('keyup', (ev) => {
      if (!running) return;
      if (keymap[ev.code]) input[keymap[ev.code]] = false;
    });
    canvas.addEventListener('mousemove', (ev) => { if (running) worldFromScreen(ev); });
    canvas.addEventListener('mousedown', (ev) => {
      if (!running) return;
      worldFromScreen(ev);
      if (ui.isOpen) return;
      if (ev.button === 0) input.dig = true;
      if (ev.button === 2) place();
      ev.preventDefault();
    });
    addEventListener('mouseup', () => { input.dig = false; });
    canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
    canvas.addEventListener('wheel', (ev) => {
      if (!running) return;
      const count = inventory.section('hotbar').size;
      state.player.selected = (state.player.selected + (ev.deltaY > 0 ? 1 : -1) + count) % count;
      ev.preventDefault();
    }, { passive: false });
    addEventListener('beforeunload', save);
  }

  function save() {
    if (!running) return;
    const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
    profiles.saveCharacter(characterId, {
      inventory: inventory.serialize(),
      stats: { health: stats.health, maxHealth: stats.maxHealth,
        mana: stats.mana, maxMana: stats.maxMana },
      colours: state.colours,
      playedSeconds: carriedCharacterSeconds + elapsed
    });
    profiles.saveWorld(worldId, {
      world: world.serialize(),
      dayPhase: state.dayPhase,
      spawn: state.spawn || null,
      villagers: village ? village.serialize() : [],
      spawn: { x: state.player.x, y: state.player.y },
      playedSeconds: carriedWorldSeconds + elapsed
    });
  }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
  }

  function boot(choice) {
    characterId = choice.character.id;
    worldId = choice.world.id;
    const characterRecord = profiles.loadCharacter(characterId) || {};
    const worldRecord = profiles.loadWorld(worldId) || {};
    seed = choice.world.seed;

    world = chunks.makeWorld(seed, worldgen);
    if (worldRecord.world && worldRecord.world.seed === seed) world.restore(worldRecord.world);

    renderer = render.makeRenderer(canvas, { tiles, texture, autotile, light, worldgen, noise });
    liquid = liquidModule.makeLiquid(world, tiles);
    swarm = enemyModule.makeSwarm(world, tiles, { worldgen });
    minimap = minimapModule.makeMinimap(document.getElementById('minimap'),
      { tiles, worldgen });
    village = villagerModule.makeVillage(world, tiles, { housing });
    if (worldRecord.villagers) village.restore(worldRecord.villagers);
    state.villagers = village.list;
    state.progress = Object.assign({ coins: 0, bars: 0, deaths: 0, deepest: 0 },
      characterRecord.progress || {});
    state.enemies = swarm.list;
    inventory = inventoryModule.makeInventory();
    stats = statsModule.makeStats();
    ui = uiModule.makeUI(document.getElementById('hud'),
      { tiles, texture, inventory, atlas: renderer.atlas, mining, craft });
    ui.onChestMove = chestMove;
    ui.onBuy = buyFrom;
    ui.onHeal = healFrom;
    ui.onCraft = (recipe) => {
      if (craft.craft(inventory, recipe)) {
        say('Crafted ' + craft.nameOf(recipe.out.key, tiles), 1.2);
      } else {
        say('No room for that', 1.2);
      }
      ui.sync(state);
    };

    if (characterRecord.inventory) inventory.restore(characterRecord.inventory);
    else {
      // The starting four: one of each job, so every kind of thing in the world can be
      // taken apart from the first minute without a crafting station.
      inventory.add({ key: 'tin-pick', kind: 'tool' }, 1, 'hotbar');
      inventory.add({ key: 'tin-axe', kind: 'tool' }, 1, 'hotbar');
      inventory.add({ key: 'tin-hammer', kind: 'tool' }, 1, 'hotbar');
      inventory.add({ key: 'tin-sword', kind: 'tool' }, 1, 'hotbar');
      inventory.add({ key: 'torch', kind: 'block' }, 40, 'hotbar');
    }
    if (characterRecord.stats) Object.assign(stats, characterRecord.stats);

    carriedCharacterSeconds = choice.character.playedSeconds || 0;
    carriedWorldSeconds = choice.world.playedSeconds || 0;
    sessionStart = Date.now();

    state.world = world;
    state.stats = stats;
    state.colours = characterRecord.colours || choice.character.colours;
    state.dayPhase = worldRecord.dayPhase === undefined ? 0.12 : worldRecord.dayPhase;
    state.spawn = worldRecord.spawn || null;
    state.player = spawnPlayer();
    if (worldRecord.spawn
      && !physics.overlapsSolid(world, tiles, worldRecord.spawn.x, worldRecord.spawn.y,
        state.player.width, state.player.height)) {
      state.player.x = worldRecord.spawn.x;
      state.player.y = worldRecord.spawn.y;
    }
    state.camera.x = state.player.x;
    state.camera.y = state.player.y;

    ui.build();
    running = true;
    say(choice.world.name + ' \u2014 seed ' + seed + '. E opens the backpack.', 7);
    setInterval(save, 20000);
    requestAnimationFrame(frame);
  }

  function start() {
    resize();
    addEventListener('resize', resize);
    bind();
    menu.open().then(boot);
  }

  // A narrow seam for the browser checks: aim the cursor at a tile and swing once. It
  // drives the same mine() the mouse does, so a wiring mistake shows up here too.
  function swingAt(x, y, dt) {
    pointer.x = x + 0.5;
    pointer.y = y + 0.5;
    mine(dt);
  }

  // Test seams for the browser checks: wake the water near the player, and ask how much
  // of it is still moving.
  function liquidWake() {
    if (!liquid) return;
    const px = Math.floor(state.player.x);
    const py = Math.floor(state.player.y);
    liquid.activateRegion(px - 60, py - 60, 120, 140);
  }

  function liquidActive() {
    return liquid ? liquid.activeCount : 0;
  }

  // Test seam: use the held bucket on a named tile, the same path the mouse takes.
  function useBucketAt(x, y) {
    const item = selectedItem();
    if (!item) return false;
    return useBucket(item, { x, y, inReach: true });
  }

  // Test seams: how many enemies are alive, swing at a point, and advance the clock by
  // hand so a browser check does not have to wait in real time.
  function swarmCount() {
    return swarm ? swarm.count : 0;
  }

  function attackAt(x, y) {
    pointer.x = x;
    pointer.y = y;
    swingCooldown = 0;
    return attack();
  }

  function advance(seconds) {
    let left = seconds;
    while (left > 0) {
      simulate(Math.min(STEP, left));
      left -= STEP;
    }
  }

  function useBedAt(x, y) {
    return useBed({ x, y, inReach: true });
  }

  function useChestAt(x, y) {
    return useChest({ x, y, inReach: true });
  }

  function useDoorAt(x, y) {
    return useDoor({ x, y, inReach: true });
  }

  return { state, start, deps, swingAt, selectedItem, liquidWake, liquidActive, useBucketAt,
    useDoorAt, useChestAt, useBedAt, chestMove, checkHousing, talkTo, buyFrom,
    get village() { return village; }, get openChest() { return openChest; },
    swarmCount, attackAt, advance,
    get inventory() { return inventory; },
    get stats() { return stats; },
    get seed() { return seed; },
    get ui() { return ui; },
    get profiles() { return profiles; } };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { makeGame, STEP, DAY_SECONDS };
}
