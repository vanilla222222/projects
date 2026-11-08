'use strict';
// Game shell: input, camera, mining, placing, stats and save. A fixed simulation timestep
// keeps physics independent of frame rate; rendering shows whatever the latest state is.

const STEP = 1 / 120;
const DAY_SECONDS = 600;
const PICKUP_RANGE = 2.2;

function makeGame(canvas, deps) {
  const { rng, tiles, worldgen, chunks, light, texture, render, player: physics,
    noise, autotile, mining, craft, liquid: liquidModule, enemy: enemyModule,
    minimap: minimapModule, housing, villager: villagerModule,
    inventory: inventoryModule, stats: statsModule, ui: uiModule,
    profile: profileModule, menu: menuModule, sprite, audio: audioModule,
    buffs: buffModule, fishing: fishModule } = deps;

  const profiles = profileModule.makeProfiles(window.localStorage);
  const menu = menuModule.makeMenu(document.getElementById('menu'),
    { profiles, palette: profileModule, parseSeed: profileModule.parseSeed, sprite });

  // Nothing world-shaped exists until a world is chosen, so each of these is filled in by
  // boot(). A character brings its own inventory and stats into whichever world it enters.
  let seed = 0;
  let world = null;
  let renderer = null;
  let touchControls = null, lastUISync = -Infinity;
  let inventory = null;
  let stats = null;
  let ui = null;
  let liquid = null;
  let swarm = null;
  let wiring = null;
  let lensSite = null;
  let archiveSite = null;
  let archiveFlooded = false;
  let liquidSensors = new Map();
  let wetSensors = new Set();
  let opticSources = new Map();
  let opticTraces = [];
  let litSensors = new Set();
  let nextOpticScan = 0;
  let mechanistPhase = -1;
  let minimap = null;
  let village = null;
  let townDevices = [];
  let completedOrders = new Set();
  let defeatedBosses = new Set();
  let bestiary = Object.create(null);
  let storageItems = [];
  const PYLON_RADIUS = 45;
  const STORAGE_RADIUS = 24;
  let talking = null;
  let swingCooldown = 0;
  let swingTotal = 0.4;
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
    stars: [],
    hook: null,
    bobber: null,
    stats: null,
    player: null,
    colours: null,
    camera: { x: 0, y: 0, zoom: 2 },
    dayPhase: 0.12,
    time: 0,
    particles: [],
    drops: [],
    paused: false,
    buffs: [],
    weather: { rain: 0, wind: 0, snow: 0 },
    // Which night it is, and whether this one is a blood moon. One integer in the save
    // decides the whole event, because the moon is a pure function of the night's number.
    nights: 0,
    bloodMoon: false,
    meteors: 0,
    // Animation state the renderer reads. `anim` is the player's gait phase, advanced by
    // distance walked rather than by the clock so the legs match the ground; `swingArm`
    // is where in its arc the swing currently is, or null when the arms are at rest.
    anim: 0,
    swingArm: null,
    held: null,
    message: '',
    messageUntil: 0
  };

  const input = { left: false, right: false, jump: false, down: false, dig: false };

  // What the keys do, in one place, so the help the player reads cannot drift from the
  // keys the game listens for. Three of these - the hook, the sound, the music - were
  // added with no way for anybody to find out they existed.
  const CONTROLS = [
    ['A D \u2190\u2192', 'Walk'],
    ['W Space \u2191', 'Jump, climb, swim up'],
    ['S \u2193', 'Crouch, drop through, climb down'],
    ['Click', 'Mine, chop, attack'],
    ['Right click', 'Place, use, talk'],
    ['Wiring', 'Lay wire or cut it to recover it'],
    ['1 \u2013 0', 'Hotbar'],
    ['E', 'Backpack'],
    ['G', 'Grappling hook'],
    ['H', 'Town Hall and housing'],
    ['M', 'Map  ( [ ] zoom )'],
    ['N', 'Sound'],
    ['B', 'Music'],
    ['P', 'Pause']
  ];


  // Sound. One object for the whole game; it does nothing at all until a key or a click
  // has been seen, because no browser will start an audio context before one.
  const audio = audioModule ? audioModule.makeAudio(window) : null;

  // Effects that expire. The same kind of thing as a worn accessory - a bag of modifiers
  // craft.js knows how to fold in - with a clock on it.
  const buffs = buffModule ? buffModule.makeBuffs() : null;
  let hearthCheck = 0;

  // Sound at a place: quieter the further it is from the player, so a slime dying across
  // the cavern is a detail rather than an event.
  function sfxAt(name, x, y, opts) {
    if (!audio) return;
    const dx = x - (state.player.x + state.player.width / 2);
    const dy = y - (state.player.y + state.player.height / 2);
    audio.play(name, Object.assign({ distance: Math.hypot(dx, dy) }, opts || {}));
  }

  function sfx(name, opts) {
    if (audio) audio.play(name, opts);
  }

  // Which noise a material makes when it is struck. Soil is dull, wood knocks, and
  // everything else is stone, which covers ore and gems too.
  function digSound(spec) {
    if (!spec) return 'dig-stone';
    if (spec.wood || spec.trunkOf || /wood|log|plank|door|chest|bench|table|chair|platform/.test(spec.key)) {
      return 'dig-wood';
    }
    if (/dirt|grass|sand|snow|mud|clay|ash|peat/.test(spec.key)) return 'dig-soil';
    return 'dig-stone';
  }
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
    const edge = worldgen.START_FOREST_EDGE;
    for (let probe = 0; probe < Math.ceil(edge / 7) * 2; probe += 1) {
      const column = (probe % 2 ? -1 : 1) * Math.ceil(probe / 2) * 7;
      if (column < -edge || column >= edge) continue;
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
  // Things that only ever drop. Each is tied to one species, so the way to get one is to
  // go where that species lives and kill it - which turns a roster of enemies into a map
  // of what is worth hunting. The table is derived from the items themselves rather than
  // written out here, so an item cannot name a monster the monster does not know about.
  const RARE_BY_ENEMY = {};
  for (const entry of craft.dropOnly()) {
    if (!RARE_BY_ENEMY[entry.from]) RARE_BY_ENEMY[entry.from] = [];
    RARE_BY_ENEMY[entry.from].push(entry);
  }
  const RARE_CHANCE = 0.055;

  function recordWildlife(spec, field) {
    const record = bestiary[spec.key] ||= { defeated: 0, caught: 0 };
    if (field) record[field] += 1;
  }

  function rareDrop(target) {
    recordWildlife(target.spec, 'defeated');
    // A boss gives up everything it carries, every time. A fight you had to prepare for
    // should not then also be a lottery.
    if (target.spec.bossDrops) {
      defeatedBosses.add(target.spec.key);
      for (const entry of target.spec.bossDrops) {
        const [key, count] = Array.isArray(entry) ? entry : [entry, 1];
        const x = target.x + target.width / 2;
        const buried = enemyModule.ARCHETYPES[target.spec.kind].burrows && tiles.isSolid(world.get(Math.floor(x), Math.floor(target.y)));
        dropItem(buried ? state.player.x : x, buried ? state.player.y : target.y, key, craft.kindOf(key), count);
      }
      if (target.key === 'prismsentinel' && world.enableHardmode()) {
        say('Hardmode begins. The Hallow rises and the lower Ossuary seal can be opened.', 6);
      } else if (target.key === 'drownedarchivist') {
        setArchiveArenaWater(false);
        say('Archivist Core recovered · Build a Hydraulic Bench at an Optics Bench.', 6);
      } else if (target.key === 'foundrywarden') {
        say('Foundry Prism recovered · Craft a Refraction Bench at a Heavy Workbench.', 6);
      } else if (target.key === 'starwyvern') {
        say('Wild wyverns now roam Space. Hunt them for essence to craft wings.', 6);
      } else say(target.spec.name + ' is dead', 3.4);
      return;
    }
    const table = RARE_BY_ENEMY[target.key];
    if (!table || !table.length || Math.random() > RARE_CHANCE) return;
    const prize = table[Math.floor(Math.random() * table.length)];
    dropItem(target.x, target.y, prize.key, prize.kind, 1);
    say(craft.nameOf(prize.key, tiles) + '!', 2.4);
  }

  // Items that are used where they stand rather than worn or swung. One place for all of
  // them, because the alternative is a branch per item in the place() path.
  function useConsumable(item) {
    const spec = craft.ITEMS[item.key];
    if (!spec || !spec.use) return false;
    const use = spec.use;
    if (use.mana !== undefined) {
      if (!statsModule.raiseMaxMana(stats)) {
        say('Your mana is already as deep as it goes', 1.8);
        return true;
      }
      say('Maximum mana is now ' + stats.maxMana, 2.2);
      sfx('upgrade');
    } else if (use.meal) {
      if (!buffs || !buffs.give('meal-' + use.meal)) return true;
      statsModule.heal(stats, use.heal);
      say(spec.name, 1.6);
    } else if (use.heal !== undefined) {
      if (stats.health >= stats.maxHealth) { say('You are unhurt', 1.2); return true; }
      statsModule.heal(stats, use.heal);
    } else if (use.summon !== undefined) {
      if (!swarm) return true;
      const required = craft.bossPrerequisite(use.summon, defeatedBosses);
      if (required) {
        say('Defeat ' + enemyModule.BY_KEY[required].name + ' first', 2.4);
        return true;
      }
      if (use.night && light.solarElevation(state.dayPhase) >= 0) {
        say('Wait until night', 1.8);
        return true;
      }
      if (use.layer && worldgen.layerAt(Math.floor(state.player.y)).key !== use.layer) {
        say('Use this in ' + worldgen.LAYERS.find(layer => layer.key === use.layer).name, 1.8);
        return true;
      }
      let arena;
      if (use.dungeon) {
        const site = worldgen.dungeonLayout(seed);
        if (!site || Math.abs(state.player.x - site.x) > 18 || Math.abs(state.player.y - site.y) > 12) {
          say('Ring the bell at the Ossuary entrance', 2);
          return true;
        }
        arena = { left: site.x - 11, right: site.x + 12, top: site.y - 7, bottom: site.y };
      }
      if (use.archive) {
        const site = worldgen.archiveAt(seed, state.player.x, state.player.y);
        if (!site || state.player.y < site.y + 44 || state.player.y >= site.y + 59
          || tiles.tile(world.get(site.x - 3, site.y + 25)).archive === 'gate') {
          say('Use the Tide Seal in the arena below the floodgate', 2.4);
          return true;
        }
        arena = { left: site.x - 22, right: site.x + 23, top: site.y + 30, bottom: site.y + 59 };
      }
      if (use.lensVault) {
        const site = worldgen.dungeonAt(seed, state.player.x, state.player.y);
        if (!site || state.player.y < site.y + 131 || state.player.y >= site.y + 145
          || !defeatedBosses.has('ossuarymechanist')
          || tiles.tile(world.get(site.x + 11, site.y + 121)).circuit === 'lens-gate') {
          say('Use the Lens Sigil in the arena beyond the beam gate', 2.4);
          return true;
        }
        arena = { left: site.x - 23, right: site.x + 24, top: site.y + 123, bottom: site.y + 145 };
      }
      if (use.foundry) {
        const site = worldgen.foundryAt(seed, state.player.x, state.player.y);
        if (!site || state.player.x < site.x + 31 || state.player.x > site.x + 61
          || Math.abs(state.player.y - (site.y - 8)) > 9) {
          say('Use the igniter on the far arena at Starfall Foundry', 2.4);
          return true;
        }
        arena = { left: site.x + 29, right: site.x + 63, top: site.y - 31, bottom: site.y - 8 };
      }
      if (use.lowerOssuary) {
        const site = worldgen.dungeonAt(seed, Math.floor(state.player.x), Math.floor(state.player.y));
        if (!site || state.player.y < site.y + 87 || state.player.y >= site.y + 100
          || !defeatedBosses.has('dungeonkeeper')
          || tiles.tile(world.get(site.x + 14, site.y + 74)).circuit === 'drain-gate') {
          say('Use this beyond the Reservoir Gate in the lower Ossuary', 2.5);
          return true;
        }
        arena = { left: site.x - 23, right: site.x + 24, top: site.y + 78, bottom: site.y + 100 };
      }
      if (use.vault && !inventory.countOf('ashvault-key')) {
        say('Bring an Ashvault Key forged from a Furnace Core', 2);
        return true;
      }
      if (use.biome && worldgen.biomeAt(seed, Math.floor(state.player.x)).key !== use.biome) {
        say('Use this in the ' + worldgen.BIOMES.find(b => b.key === use.biome).name, 2);
        return true;
      }
      if (use.vault) {
        const x = Math.floor(state.player.x), y = Math.floor(state.player.y);
        const vault = worldgen.ashvaultAt(seed, x, y);
        if (!vault || x <= vault.x - 32 || x >= vault.x + 12 || y <= vault.y - 11 || y >= vault.y + 10) {
          say('Use the effigy in the main hall of an Ashvault', 2);
          return true;
        }
        arena = { left: vault.x - 31, right: vault.x + 12, top: vault.y - 10, bottom: vault.y + 10 };
      }
      if (swarm.bossAlive()) { say('It is already here', 1.4); return true; }
      const boss = swarm.summon(use.summon, state.player, arena);
      if (!boss) { say('There is no room here', 1.6); return true; }
      say(boss.spec.name + ' has awoken', 3.2);
      sfx('roar');
      spawnParticles(boss.x + boss.width / 2, boss.y + boss.height / 2, boss.spec.colour, 26);
    } else if (use.buff !== undefined) {
      if (!use.buff) { say('The bottle is empty', 1.4); return true; }
      if (!buffs) return true;
      const buff = buffModule.BUFFS[use.buff];
      if (!buff) return true;
      buffs.give(use.buff, buff.seconds * (use.duration || 1));
      say(spec.name, 1.6);
    } else if (use.open !== undefined) {
      // A crate holds what it holds because of where it was caught, like a pot.
      const px = Math.floor(state.player.x);
      const py = Math.floor(state.player.y);
      for (const got of fishModule.crateContents(rng.unit, seed, px, py, use.open)) {
        dropItem(px, py, got.key, craft.kindOf(got.key), got.count);
      }
      sfx('chest');
    } else if (use.restore !== undefined) {
      if (stats.mana >= stats.maxMana) { say('Your mana is full', 1.2); return true; }
      stats.mana = Math.min(stats.maxMana, stats.mana + use.restore);
    } else {
      return false;
    }
    inventory.take(item.key, 1);
    // Return the empty bottle after spending the potion so a freed slot can hold it.
    if (use.buff && inventory.add({ key: 'bottle', kind: 'use' }, 1)) {
      dropItem(state.player.x, state.player.y, 'bottle', 'use', 1);
    }
    spawnParticles(state.player.x + 0.5, state.player.y + 0.5, spec.colour, 10);
    if (!use.summon) sfx('use');
    return true;
  }

  // --- events ---------------------------------------------------------------------
  // The night counter is the only thing saved: whether a given night is a blood moon is
  // a hash of its number, so every player of a seed meets the same nights and nothing
  // about the event has to be written down.
  const NIGHT_FROM = 0.27;
  const NIGHT_TO = 0.73;
  let wasNight = false;

  function stepEvents() {
    const night = state.dayPhase > NIGHT_FROM && state.dayPhase < NIGHT_TO;
    if (night && !wasNight) {
      state.nights += 1;
      state.bloodMoon = worldgen.bloodMoonAt(seed, state.nights);
      if (state.bloodMoon) {
        say('The moon is bleeding', 4.2);
        sfx('roar', { gain: 0.7, pitch: 1.3 });
      }
    }
    if (!night && wasNight && state.bloodMoon) {
      state.bloodMoon = false;
      say('The blood moon has set', 2.6);
    }
    wasNight = night;
  }

  function eventKey() {
    return state.bloodMoon ? 'bloodmoon' : null;
  }

  // A meteor lands somewhere far off when the King dies. The crater is written into the
  // world's edit diff exactly like anything the player built, so it survives a save with
  // no new machinery at all - and so it can be mined out and will stay mined out.
  const METEOR_RADIUS = 7;

  function dropMeteor() {
    state.meteors += 1;
    const site = worldgen.meteorSite(seed, state.meteors);
    const ore = tiles.idOf('meteorite');
    const r = METEOR_RADIUS;
    for (let dy = -r; dy <= r; dy += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        const d = Math.hypot(dx, dy * 1.25);
        if (d > r) continue;
        const x = site.x + dx;
        const y = site.y + dy;
        if (deviceAt(x, y)) continue;
        // A bowl: hollow above the ground line, ore below it, and a ragged rim.
        if (d > r - 1.6 && Math.random() < 0.45) continue;
        if (y < site.y) world.set(x, y, tiles.AIR);
        else world.set(x, y, ore);
      }
    }
    say('A star has fallen to the ' + (site.side > 0 ? 'east' : 'west'), 4.6);
    return site;
  }

  // --- fishing ------------------------------------------------------------------------
  // Cast at water, wait, and pull when it dips. The bobber is a thing in the world with
  // its own position, like the hook, so the same shape applies: the game holds it and
  // the player is only attached to it.
  function castLine(item) {
    if (!fishModule) return false;
    const spec = craft.ITEMS[item.key];
    if (!spec || !spec.rod) return false;
    if (state.bobber) { reelIn(); return true; }
    const rod = fishModule.RODS[item.key] || { power: 1 };
    const cx = state.player.x + state.player.width / 2;
    const cy = state.player.y + state.player.height * 0.4;
    const away = Math.hypot(pointer.x - cx, pointer.y - cy);
    if (away > fishModule.CAST_RANGE) { say('Too far', 1.0); return true; }
    const tx = Math.floor(pointer.x);
    const ty = Math.floor(pointer.y);
    const liquid = fishModule.liquidAt(tiles, world.get(tx, ty));
    if (!liquid) { say('Cast at water', 1.2); return true; }
    if (liquid === 'lava' && !rod.lava) {
      say('The line burns away', 1.8);
      return true;
    }

    const survey = fishModule.surveyLiquid(world, tiles, tx, ty);
    const amount = liquid === 'lava' ? survey.lava : survey.water;
    if (amount < fishModule.PUDDLE / 3) {
      say('There is hardly anything there', 1.6);
      return true;
    }
    state.bobber = {
      x: pointer.x,
      y: pointer.y,
      tx,
      ty,
      liquid,
      rod: item.key,
      power: rod.power,
      amount,
      wait: fishModule.biteDelay(Math.random(), rod.power, amount),
      biting: 0,
      bob: 0
    };
    sfx('splash', { gain: 0.5, pitch: liquid === 'lava' ? 0.7 : 1.3 });
    return true;
  }

  // Pull. Early and you get nothing; during the bite and you get what was on the line.
  function reelIn() {
    const bobber = state.bobber;
    state.bobber = null;
    if (!bobber) return;
    if (bobber.biting <= 0) {
      sfx('swing', { gain: 0.4 });
      say('Nothing yet', 0.9);
      return;
    }
    const ctx = {
      biome: worldgen.biomeAt(seed, bobber.tx).key,
      layer: worldgen.layerAt(bobber.ty).key,
      liquid: bobber.liquid,
      amount: bobber.amount
    };
    const got = fishModule.rollCatch(ctx, Math.random(), bobber.power);
    if (!got) { say('Nothing is biting here', 1.4); return; }
    dropItem(bobber.tx, bobber.ty - 1, got.key, craft.kindOf(got.key), 1);
    sfx('pickup', { pitch: 1.35 });
    spawnParticles(bobber.x, bobber.y,
      bobber.liquid === 'lava' ? '#ffb05a' : '#bfe6ff', 8);
    say(craft.nameOf(got.key, tiles), 1.6);
  }

  function stepFishing(dt) {
    const bobber = state.bobber;
    if (!bobber) return;
    // The line breaks if you walk away from it, which is what stops a cast being
    // something you set down and forget.
    const away = Math.hypot(bobber.x - state.player.x, bobber.y - state.player.y);
    if (away > fishModule.CAST_RANGE + 6) {
      state.bobber = null;
      say('The line broke', 1.2);
      return;
    }
    if (fishModule.liquidAt(tiles, world.get(bobber.tx, bobber.ty)) !== bobber.liquid) {
      state.bobber = null;
      say('The water is gone', 1.2);
      return;
    }
    bobber.bob += dt;
    if (bobber.biting > 0) {
      bobber.biting -= dt;
      if (bobber.biting <= 0) {
        say('It got away', 1.1);
        bobber.wait = fishModule.biteDelay(Math.random(), bobber.power, bobber.amount);
      }
      return;
    }
    bobber.wait -= dt;
    if (bobber.wait <= 0) {
      bobber.biting = fishModule.BITE_WINDOW;
      sfx('splash', { gain: 0.35, pitch: bobber.liquid === 'lava' ? 0.9 : 1.6 });
    }
  }

  // --- the grappling hook ----------------------------------------------------------
  // A head that flies until it bites, and then reels you in. It is the single thing that
  // turns a cave from a series of one-way drops into somewhere you can move around in,
  // which is why Terraria gives you one early and why it is worth the state it costs.
  //
  // The hook lives on the game rather than on the player because it is a thing in the
  // world with its own position: the player is simply held by it.
  function fireHook() {
    const spec = craft.grappleOf(selectedItem());
    if (!spec) return false;
    if (state.hook) { releaseHook(); return true; }
    const cx = state.player.x + state.player.width / 2;
    const cy = state.player.y + state.player.height * 0.4;
    const dx = pointer.x - cx;
    const dy = pointer.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    state.hook = { x: cx, y: cy, vx: (dx / len) * spec.speed, vy: (dy / len) * spec.speed,
      anchored: false, from: { x: cx, y: cy }, spec };
    sfx('hook');
    return true;
  }

  function releaseHook() {
    state.hook = null;
    state.player.hooked = false;
  }

  function stepHook(dt) {
    const hook = state.hook;
    if (!hook) return;
    const p = state.player;
    const cx = p.x + p.width / 2;
    const cy = p.y + p.height * 0.4;

    if (!hook.anchored) {
      const steps = Math.ceil(Math.hypot(hook.vx, hook.vy) * dt / 0.25) || 1;
      for (let i = 0; i < steps; i += 1) {
        hook.x += (hook.vx * dt) / steps;
        hook.y += (hook.vy * dt) / steps;
        if (tiles.isSolid(world.get(Math.floor(hook.x), Math.floor(hook.y)))) {
          hook.anchored = true;
          sfxAt('grab', hook.x, hook.y);
          break;
        }
      }
      // A hook that reaches the end of its rope without biting simply comes back.
      if (!hook.anchored && Math.hypot(hook.x - cx, hook.y - cy) > hook.spec.range) {
        releaseHook();
      }
      return;
    }

    // Anchored. Reel in until the player is close, then hold. Jumping lets go, which is
    // how you get off a hook and the reason a hook never traps you.
    p.hooked = true;
    const dx = hook.x - cx;
    const dy = hook.y - cy;
    const away = Math.hypot(dx, dy) || 1;
    if (away > 1.4) {
      p.vx = (dx / away) * hook.spec.pull;
      p.vy = (dy / away) * hook.spec.pull;
    } else {
      // Hanging. A little damping rather than a hard stop, so the player settles under
      // the anchor instead of locking rigidly to it.
      p.vx *= 0.82;
      p.vy *= 0.82;
    }
    // The anchor can be mined out from under you.
    if (!tiles.isSolid(world.get(Math.floor(hook.x), Math.floor(hook.y)))) releaseHook();
    if (input.jump && away < 3.2) {
      releaseHook();
      p.vy = -10;
    }
  }

  // --- falling stars -------------------------------------------------------------------
  // They fall at night, land on the surface, and lie there glowing until somebody picks
  // one up. Five of them make a mana crystal, which is the only way maximum mana ever
  // goes up - so a clear night is worth looking up at.
  const STAR_EVERY = 7.5;
  let starCooldown = STAR_EVERY;

  function stepStars(dt) {
    const night = state.dayPhase > 0.27 && state.dayPhase < 0.73;
    const outside = worldgen.layerAt(Math.floor(state.player.y)).key;
    starCooldown -= dt;
    if (starCooldown <= 0) {
      starCooldown = STAR_EVERY * (0.6 + Math.random() * 0.8);
      // Only while the player is somewhere a falling star could be seen, and only at
      // night. A star that fell into a cave the player is standing in would be absurd.
      if (night && (outside === 'surface' || outside === 'sky')) {
        const x = state.player.x + (Math.random() - 0.5) * 120;
        const top = worldgen.surfaceHeight(seed, Math.floor(x)) - 90;
        state.stars.push({ x, y: top, vx: (Math.random() - 0.5) * 3, vy: 16 + Math.random() * 8 });
      }
    }
    for (let i = state.stars.length - 1; i >= 0; i -= 1) {
      const star = state.stars[i];
      star.vy = Math.min(46, star.vy + 22 * dt);
      const steps = Math.ceil(star.vy * dt / 0.4) || 1;
      let landed = false;
      for (let k = 0; k < steps && !landed; k += 1) {
        star.x += (star.vx * dt) / steps;
        star.y += (star.vy * dt) / steps;
        if (tiles.isSolid(world.get(Math.floor(star.x), Math.floor(star.y)))) landed = true;
      }
      // Anything that falls too far below the player is forgotten rather than tracked.
      if (landed || star.y > state.player.y + 160) {
        if (landed) {
          dropItem(Math.floor(star.x), Math.floor(star.y) - 1, 'fallenstar', 'loot', 1);
          spawnParticles(star.x, star.y, '#ffe9a0', 12);
          sfxAt('star', star.x, star.y);
        }
        state.stars.splice(i, 1);
      }
    }
  }

  // What last took health off the player, so death can say what killed them. Terraria
  // does this and it matters for the same reason a stack trace matters: dying without
  // being told why teaches nothing.
  let lastHurt = null;
  const deathsBy = {};

  // What a heart restores when you walk over it.
  const HEART_HEAL = 20;

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
        // A heart is used where it is picked up rather than carried: Terraria's rule,
        // and the reason a fight you are losing can still be turned around by pushing
        // forward into what you just killed.
        if (d.kind === 'pickup') {
          if (d.key === 'heart') statsModule.heal(stats, HEART_HEAL);
          sfx('pickup', { pitch: 1.2 });
          state.drops.splice(i, 1);
          continue;
        }
        const left = inventory.add({ key: d.key, kind: d.kind }, d.count);
        if (left === 0) {
          sfx(d.kind === 'coin' ? 'coin' : 'pickup', { gain: 0.7 });
          state.drops.splice(i, 1);
        }
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
    const cache = spec.chest === 'dungeon-cache' ? tiles.originOf(spec, aim.x, aim.y) : null;
    if (spec.foundry || spec.vault || spec.archive) {
      state.player.mining = null;
      return;
    }
    if (spec.circuit === 'puzzle-gate' || spec.chest === 'ossuary-workshop-cache') {
      state.player.mining = null;
      say('Find the switch for the Mechanist Cache', 1.6);
      return;
    }
    if ((spec.key.startsWith('ossuary-') && spec.circuit)
      || spec.circuit === 'lower-seal' || spec.chest === 'mechanist-armory') {
      state.player.mining = null;
      say('The lower Ossuary is sealed with mechanisms', 1.4);
      return;
    }
    if (spec.key === 'dungeon-gate' || spec.key === 'dungeon-bell'
      || (spec.key === 'dungeon-brick' && !defeatedBosses.has('dungeonkeeper'))
      || (cache && !world.hasStoredContainer(cache.x, cache.y))) {
      state.player.mining = null;
      say('The Ossuary is sealed', 1.4);
      return;
    }
    if (spec.key === 'ashvault-gate' || (spec.chest === 'ashvault-cache' && !inventory.countOf('guardian-seal'))) {
      state.player.mining = null;
      say('This seal must be opened with a key', 1.4);
      return;
    }
    if (spec.mimic) {
      wakeChestMimic(tiles.originOf(spec, aim.x, aim.y), spec.mimic);
      state.player.mining = null;
      return;
    }
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
    const basePower = mining.powerOf(tool);
    const power = basePower * gear.power;
    // Walls come away like soft ground: they are a backing, not a seam of rock.
    const perHit = diggingWall ? power * 2 : mining.damagePerHit(power, spec, basePower);
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
      sfxAt(digSound(spec), aim.x, aim.y, { gain: 0.8 });
      if (current.damage < current.toughness) return;
    }

    if (!diggingWall && spec.townDevice) {
      const device = deviceAt(aim.x, aim.y);
      if (device && storageCapacity(device) < storageItems.length) {
        state.player.mining = null;
        say('Withdraw stored items before removing capacity', 1.8);
        return;
      }
      if (device) townDevices.splice(townDevices.indexOf(device), 1);
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
      // A pot spills what it holds. Which items those are is a function of where the
      // pot is, so a pot is a place rather than a dice roll, and the same pot broken in
      // two different sessions gives the same things.
      if (spec.pot) {
        for (const item of worldgen.potContents(seed, aim.x, aim.y)) {
          dropItem(aim.x, aim.y, item.key, craft.kindOf(item.key), item.count);
        }
      }
      if (origin) breakMulti(origin);
      else {
        wiring?.clearDevice(aim.x, aim.y);
        opticSources.delete(aim.x + ':' + aim.y);
        liquidSensors.delete(aim.x + ':' + aim.y);
        wetSensors.delete(aim.x + ':' + aim.y);
        world.set(aim.x, aim.y, tiles.AIR);
      }
      spawnParticles(aim.x, aim.y, spec.colour, 9);
      sfxAt('break', aim.x, aim.y);
      const leaves = mining.dropsOf(spec);
      if (leaves) dropItem(aim.x, aim.y, leaves, craft.kindOf(leaves), 1);
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

  let appearanceKeys = '';
  let appearance = {};
  function wornAppearance() {
    const armor = wornKeys('armor');
    const accessories = wornKeys('accessory');
    const keys = armor.concat(accessories).join('|');
    if (keys !== appearanceKeys) {
      appearanceKeys = keys;
      appearance = {};
      for (const key of armor) {
        const piece = craft.ARMOUR[key];
        if (piece) appearance[piece.slot] = piece;
      }
      appearance.accessories = accessories.map(key => craft.ACCESSORIES[key]).filter(Boolean);
    }
    return appearance;
  }

  function currentEffects() {
    return craft.equipEffects(wornKeys('armor'), wornKeys('accessory'),
      buffs ? buffs.effects() : null);
  }

  // Loose a bow. An arrow is a small body that flies, falls, and stops at the first thing
  // it meets; spending the ammunition is what distinguishes it from a sword swing.
  function shoot(weapon) {
    // The best arrow held, not the one in the selected slot: a second hotbar for
    // ammunition is a chore, and Terraria does not ask for one either.
    const ammo = craft.bestAmmo(key => inventory.countOf(key), weapon.ammo);
    if (!ammo) {
      say('Out of ' + craft.nameOf(weapon.ammo, tiles), 1.0);
      return false;
    }
    const kind = craft.AMMO[ammo];
    inventory.take(ammo, 1);
    const gear = state.gear || {};
    const cx = state.player.x + state.player.width / 2;
    const cy = state.player.y + state.player.height * 0.4;
    const dx = pointer.x - cx;
    const dy = pointer.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    const speed = 42 * kind.speed * (gear.arrowSpeed || 1);
    state.arrows.push({ x: cx, y: cy, vx: (dx / len) * speed, vy: (dy / len) * speed,
      damage: Math.round((weapon.damage + kind.bonus) * (gear.ranged || 1)),
      life: kind.family === 'bullet' ? weapon.reach / speed : 2.6 * (gear.arrowSpeed || 1), colour: kind.colour,
      gravity: kind.family === 'bullet' ? 0 : 26,
      burns: !!kind.burns, hits: weapon.pierce ? new Set() : null,
      hitLimit: Number(weapon.pierce) > 1 ? weapon.pierce : 3 });
    return true;
  }

  // A staff spends mana rather than ammunition and throws a bolt that ignores gravity.
  // Mana comes back by itself, so magic never runs out and never fires as fast as you
  // would like - which is the whole trade against a bow.
  function cast(weapon) {
    const gear = state.gear || {};
    const cost = Math.max(1, Math.round(weapon.mana * (gear.manaCost || 1)));
    if (!statsModule.spendMana(stats, cost)) {
      say('Not enough mana', 1.0);
      return false;
    }
    const cx = state.player.x + state.player.width / 2;
    const cy = state.player.y + state.player.height * 0.4;
    const dx = pointer.x - cx;
    const dy = pointer.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    state.arrows.push({ x: cx, y: cy, vx: (dx / len) * 34, vy: (dy / len) * 34,
      damage: Math.round(weapon.damage * (gear.magic || 1)),
      life: weapon.spell ? weapon.reach / 34 : 1.8, colour: weapon.bolt, gravity: 0, magic: true, spell: weapon.spell,
      hits: weapon.spell === 'pierce' ? new Set() : null });
    if (weapon.spell === 'ward') state.wardUntil = state.time + 4;
    spawnParticles(cx, cy, weapon.bolt, 4);
    sfx('cast');
    return true;
  }

  function projectileHit(target, damage) {
    if (target.dead || !swarm.damage(target, damage) || target.practice) return;
    for (const [key, count] of target.spec.drops || []) {
      dropItem(target.x, target.y, key, craft.kindOf(key), count);
    }
    if (target.key === 'kingslime') dropMeteor();
    rareDrop(target);
  }

  function updateArrows(dt) {
    for (let i = state.arrows.length - 1; i >= 0; i -= 1) {
      const a = state.arrows[i];
      a.life -= dt;
      a.vy += (a.gravity === undefined ? 26 : a.gravity) * dt;
      const steps = Math.ceil(Math.hypot(a.vx, a.vy) * dt / 0.3) || 1;
      let hit = false;
      for (let s2 = 0; s2 < steps && !hit; s2 += 1) {
        a.x += (a.vx * dt) / steps;
        a.y += (a.vy * dt) / steps;
        const solid = tiles.isSolid(world.get(Math.floor(a.x), Math.floor(a.y)));
        if (solid && !a.escapeTerrain) hit = true;
        else if (a.hostile) {
          if (!solid) {
            a.escapeTerrain = false;
            if (pointHitsPlayer(a.x, a.y)) {
              if (statsModule.damage(stats, a.damage) > 0) lastHurt = a.hostile;
              hit = true;
            }
          }
        } else if (a.trap && pointHitsPlayer(a.x, a.y)) {
          if (statsModule.damage(stats, a.damage) > 0) lastHurt = 'a dart trap';
          hit = true;
        } else if (swarm) {
          const target = swarm.at(a.x, a.y);
          if (target && !a.hits?.has(target)) {
            a.hits?.add(target);
            hit = !a.hits || a.hits.size >= (a.hitLimit || 3);
            spawnParticles(a.x, a.y, target.spec.colour, 5);
            projectileHit(target, a.damage);
            if (a.spell === 'chain') {
              const links = swarm.list.filter(other => other !== target
                && Math.hypot(other.x - target.x, other.y - target.y) <= 6).slice(0, 2);
              for (const other of links) {
                spawnParticles(other.x, other.y, a.colour, 5);
                projectileHit(other, Math.round(a.damage * 0.55));
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
    if (item?.key === 'critter-net') return true;
    const weapon = item ? craft.WEAPONS[item.key] : null;
    // A bow or a staff does not need something under the cursor: it fires where you
    // point. Both still cost their use time even when the shot fails, so spamming a
    // staff with no mana does not also spam the message.
    if (weapon && (weapon.ranged || weapon.magic)) {
      const fired = weapon.magic ? cast(weapon) : shoot(weapon);
      if (!fired) return true;
      const swingScale = (state.gear && state.gear.swing) || 1;
      swingCooldown = weapon.useTime * swingScale;
      swingTotal = swingCooldown;
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
    const gear = state.gear || {};
    if (weapon) {
      hit = Math.round(weapon.damage * (gear.melee || 1));
      cooldown = weapon.useTime;
    } else if (mining.isTool(item)) {
      hit = Math.max(3, Math.round(mining.powerOf(item) * 0.3 * (gear.melee || 1)));
      cooldown = mining.useTimeOf(item) * 1.5;
    }
    cooldown *= gear.swing || 1;
    swingCooldown = cooldown;
    sfx('swing');
    sfxAt('hit', target.x, target.y);
    swingTotal = cooldown;
    target.vx += Math.sign(target.x - cx) * 6 * (weapon?.knockback || 1);
    target.vy -= 3;
    spawnParticles(target.x, target.y, target.spec.colour, 5);
    if (weapon?.cleave) {
      for (const other of swarm.list.slice()) {
        if (other === target || Math.hypot(other.x - target.x, other.y - target.y) > 3) continue;
        projectileHit(other, Math.round(hit * 0.55));
      }
    }
    if (swarm.damage(target, hit) && !target.practice) {
      for (const [key, count] of target.spec.drops || []) {
        dropItem(target.x, target.y, key, craft.kindOf(key), count);
      }
      spawnParticles(target.x, target.y, target.spec.colour, 14);
      sfxAt('enemydie', target.x, target.y, { pitch: target.boss ? 0.5 : 1 });
      // Killing the King brings something down out of the sky, which is how the next
      // tier of material arrives: it is not in the ground anywhere.
      if (target.key === 'kingslime') dropMeteor();
      rareDrop(target);
      // Roughly one kill in five leaves a heart behind, and a hurt player sees them
      // more often: the drop is there to keep a fight going, so it arrives when the
      // fight is going badly.
      const need = 1 - stats.health / Math.max(1, stats.maxHealth);
      if (Math.random() < 0.16 + need * 0.3) {
        state.drops.push({ x: target.x + 0.5, y: target.y + 0.5,
          vx: (Math.random() - 0.5) * 3, vy: -5, key: 'heart', kind: 'pickup',
          count: 1, age: 0 });
      }
      if (!target.boss) say(target.spec.name + ' died', 1.0);
    }
    return true;
  }

  function respawnPlayer() {
    state.wardUntil = 0;
    state.progress.deaths += 1;
    statsModule.respawn(stats);
    const spot = state.spawn || defaultSpawn();
    state.player.x = spot.x;
    state.player.y = spot.y;
    state.player.vx = 0;
    state.player.vy = 0;
    if (swarm) swarm.clear();
    releaseHook();
    state.bobber = null;
    sfx('death');
    const blame = lastHurt || 'something';
    deathsBy[blame] = (deathsBy[blame] || 0) + 1;
    say('Killed by ' + blame, 2.6);
    lastHurt = null;
  }

  // A life crystal is used where it stands rather than carried away: it is the one
  // thing in the world that makes the player permanently stronger, and consuming it on
  // the spot is what makes finding one an event rather than an inventory entry.
  function useCrystal(aim) {
    const spec = tiles.tile(world.get(aim.x, aim.y));
    if (spec.crystal !== 'life') return false;
    const origin = tiles.originOf(spec, aim.x, aim.y);
    if (!origin) return false;
    if (!statsModule.raiseMaxHealth(stats)) {
      say('You are as strong as a heart can make you', 1.8);
      return true;
    }
    breakMulti(origin);
    spawnParticles(origin.x + 0.5, origin.y + 0.5, '#e0405c', 20);
    say('Maximum health is now ' + stats.maxHealth, 2.2);
    sfx('upgrade');
    return true;
  }

  // A door swings when you use it, whatever you are holding. Checked before anything the
  // held item would do, because reaching for a door with a block in hand is the common
  // case and walling the doorway up instead would be infuriating.
  // Open the chest under the cursor, or shut the one that is open. A chest is a
  // multi-tile object, so any of its four cells opens the same box.
  function wakeChestMimic(origin, key) {
    const site = worldgen.biomeSiteAt(seed, origin.x, origin.y);
    const species = site?.mimic ? site.biome + 'mimic' : key;
    const mimic = swarm && swarm.wakeMimic(origin.x, origin.y, species);
    if (mimic) {
      breakMulti(origin);
      sfx('roar');
      say('That chest has teeth', 2);
    }
    return true;
  }

  function useChest(aim) {
    const spec = tiles.tile(world.get(aim.x, aim.y));
    if (!spec.chest) return false;
    if (spec.chest === 'ossuary-workshop-cache') {
      const site = worldgen.dungeonAt(seed, aim.x, aim.y);
      if (!site || !defeatedBosses.has('dungeonkeeper')
        || tiles.tile(world.get(site.x + 14, site.y + 17)).circuit === 'puzzle-gate') {
        say('Trace the circuit to open the Mechanist Cache', 2);
        return true;
      }
    }
    if (spec.chest === 'ashvault-cache' && !inventory.countOf('guardian-seal')) {
      say('The reliquary needs a Guardian Seal', 2);
      return true;
    }
    const origin = tiles.originOf(spec, aim.x, aim.y);
    if (!origin) return false;
    if (spec.chest === 'mechanist-armory' && !world.hasStoredContainer(origin.x, origin.y)) {
      if (!defeatedBosses.has('ossuarymechanist') || !inventory.countOf('mechanist-key')) {
        say('Defeat the Mechanist and bring an Armory Key', 2);
        return true;
      }
      inventory.take('mechanist-key', 1);
      world.setContainer(origin.x, origin.y, world.getContainer(origin.x, origin.y) || []);
    }
    if (spec.chest === 'dungeon-cache' && !world.hasStoredContainer(origin.x, origin.y)) {
      if (!defeatedBosses.has('dungeonkeeper') || !inventory.countOf('dungeon-key')) {
        say('Defeat the Keeper and bring a Gilded Ossuary Key', 2);
        return true;
      }
      inventory.take('dungeon-key', 1);
      world.setContainer(origin.x, origin.y, world.getContainer(origin.x, origin.y) || []);
    }
    if (spec.mimic) return wakeChestMimic(origin, spec.mimic);
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
    openTownShop(who);
    ui.setOpen(true);
    say(who.spec.greeting, 4);
    return true;
  }

  let shopDiscount = 1;
  function openTownShop(who) {
    const homes = village.nearbyHomes(who.home.x, who.home.y, PYLON_RADIUS);
    shopDiscount = homes >= 3 ? 0.85 : homes >= 2 ? 0.93 : 1;
    ui.openShop(who, { coins: inventory.countOf('coin'), discount: shopDiscount });
  }

  function buyFrom(index) {
    if (!talking) return;
    const entry = talking.spec.stock[index];
    if (!entry) return;
    const price = Math.ceil(entry.price * shopDiscount);
    if (inventory.countOf('coin') < price) {
      say('Not enough coin', 1.2);
      return;
    }
    const left = inventory.add({ key: entry.key, kind: craft.kindOf(entry.key) }, entry.count);
    if (left > 0) {
      inventory.take(entry.key, entry.count - left);
      say('No room for that', 1.2);
      return;
    }
    inventory.take('coin', price);
    say('Bought ' + craft.nameOf(entry.key, tiles), 1.2);
    openTownShop(talking);
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
    openTownShop(talking);
    ui.sync(state);
  }

  function checkHousing() {
    if (!village) return;
    input.left = input.right = input.jump = input.down = false;
    const x = state.player.x + state.player.width / 2, y = state.player.y;
    const { room, occupant } = village.survey(x, y);
    const rows = village.list.length
      ? village.list.map(v => v.spec.name + ' · ' + Math.floor(v.home.x) + ', ' + Math.floor(v.home.y))
      : ['No residents yet.'];
    if (occupant) rows.unshift('Room occupied by ' + occupant.spec.name + '.');
    else if (room.valid) rows.unshift('This room is ready for a resident.');
    else rows.unshift(...room.problems);
    const available = new Set(villagerModule.eligible(state.progress).map(v => v.key));
    const actions = [{ label: 'Progression Journal', run: openProgression },
      { label: 'Town Contracts', run: openTownOrders }, { label: 'Bestiary', run: openBestiary }];
    for (const spec of villagerModule.VILLAGERS) {
      const housed = village.list.some(v => v.key === spec.key);
      if (!housed && !available.has(spec.key)) {
        rows.push(spec.name + ' ' + spec.wantsText + '.');
      } else if (room.valid && !occupant) {
        actions.push({ label: (housed ? 'Move ' : 'Invite ') + spec.name, run() {
          if (!physics.aimTile(state.player, { x, y }).inReach) return;
          const result = village.settle(state.progress, x, y, spec.key);
          if (result.moved) say(spec.name + ' has moved in', 3);
          checkHousing();
        } });
      }
    }
    rows.push('Two occupied homes in range power a pylon. Shops discount prices in clusters of two or more.');
    ui.showTown('Town Hall', rows, actions);
  }

  function openBestiary() {
    const known = enemyModule.ENEMIES.filter(spec => bestiary[spec.key]).sort((a, b) => a.name.localeCompare(b.name));
    const summary = known.length + ' / ' + enemyModule.ENEMIES.length + ' creatures discovered';
    ui.showTown('Bestiary', [], [], query => {
      const rows = [summary];
      for (const spec of known) {
        const record = bestiary[spec.key];
        const type = spec.boss ? 'Boss' : spec.specimen ? spec.specimen.rare || 'Critter' : 'Enemy';
        const habitat = spec.foundry ? 'Starfall Foundry' : spec.dungeon ? 'Ossuary'
          : [...(spec.biomes || []), ...(spec.layers || [])].join(', ') || 'Special encounter';
        const drops = record.defeated > 0 ? [...(spec.drops || []), ...(spec.bossDrops || [])]
          .map(entry => craft.nameOf(Array.isArray(entry) ? entry[0] : entry, tiles)).join(', ') : '';
        const search = [spec.name, type, habitat, drops].join(' ').toLowerCase();
        if (query && !search.includes(query)) continue;
        rows.push(spec.name + ' · ' + type + ' · ' + habitat + ' · ' + record.defeated + ' defeated'
          + (spec.specimen ? ' · ' + record.caught + ' caught' : '') + (drops ? ' · Drops: ' + drops : ''));
      }
      if (rows.length === 1) rows.push(query ? 'No discovered entries match.' : 'Encounter creatures or catch them with a net.');
      return { rows, actions: [{ label: 'Back to Town Hall', run: checkHousing }] };
    }, 'Search creatures and habitats');
  }

  function openProgression() {
    const picks = Object.entries(mining.TOOLS).filter(([key, spec]) => spec.job === 'pick' && key !== 'meteor-pick')
      .sort((a, b) => a[1].power - b[1].power);
    const power = Math.max(0, ...Object.entries(mining.TOOLS).filter(([key, spec]) =>
      spec.job === 'pick' && inventory.countOf(key)).map(([, spec]) => spec.power));
    const rank = picks.reduce((best, [, spec], index) => spec.power <= power ? index : best, -1);
    const rows = ['Mining · ' + (rank < 0 ? 'Recover a pickaxe from the Guide or make one at a Work Bench.'
      : power + ' base pickaxe power')];
    const recipeLine = key => {
      const recipe = craft.RECIPES.find(r => r.out.key === key);
      return recipe.need.map(([item, count]) =>
        craft.heldOf(inventory, item) + '/' + count + ' ' + craft.nameOf(item, tiles)).join(' · ')
        + (recipe.station ? ' · ' + recipe.station : '');
    };
    if (rank >= 0 && rank + 1 < picks.length) {
      const [key, spec] = picks[rank + 1];
      rows.push('Next pickaxe · ' + spec.name + ' · ' + recipeLine(key));
      const ore = key.replace('-pick', '');
      const band = worldgen.ORE_BANDS.find(entry => entry.key === ore);
      const hardmodeDepth = { 'palladium-pick': '160–849', 'mythril-pick': '850–1,949', 'adamantite-pick': '1,950 or deeper' }[key];
      if (hardmodeDepth) rows.push(world.hardmode
        ? 'Look for this ore in unexplored rock ' + hardmodeDepth + ' tiles below sea level.'
        : 'Defeat the Prism Sentinel to start Hardmode in this world.');
      if (key === 'aetherite-pick') rows.push('Mine Aetherite in the underside of sky islands, then smelt it at a Furnace.');
      if (key === 'rift-pick') rows.push('Defeat the Rift Archon for a Rift Core. The Rift Pickaxe mines Aetherite on sky islands.');
      if (band) rows.push('Find ' + craft.nameOf(ore, tiles) + ' · '
        + (ore === 'emberite' ? 'Search Hell and smelt it with obsidian.'
          : 'Usually ' + band.from + '–' + band.to + ' tiles below the surface.'));
      if (rank < 2) rows.push('Build a Furnace, then craft an Anvil at a Work Bench using ' + recipeLine('anvil') + '.');
    }
    if (world.hardmode) {
      const playerX = Math.floor(state.player.x);
      let hallow = null;
      for (let offset = 0; offset <= 4800 && hallow === null; offset += 24) {
        for (const x of [playerX + offset, playerX - offset]) {
          if (world.biomeAt(x, worldgen.surfaceHeight(seed, x)).key === 'hallow') { hallow = x; break; }
        }
      }
      if (hallow !== null) rows.push('Hallow surface near x ' + hallow + ' · Search the caves below for spell crystals.');
    }
    rows.push('Workshop · Build a Heavy Workbench at a Work Bench to unlock advanced stations and statues.');
    rows.push('Sawmill furniture · Loom textiles · Alchemy Table potions · Cauldron meals');
    rows.push('Mechanisms · Craft Copper Wire and Wire Cutters at an Anvil. Build devices at a Heavy Workbench.');
    if (world.hardmode) rows.push('Hardmode Ossuary · Defeat the Keeper and use the seal at the bottom of the original galleries.');
    if (defeatedBosses.has('ossuarymechanist')) rows.push('Signal Bench · Build one from the Mechanist Core for colored wire and logic relays.');
    if (defeatedBosses.has('dungeonkeeper')) rows.push('Ossuary · Find the switch for the Mechanist Cache in the first gallery.');
    if (world.hardmode) rows.push('Hardmode trio · ' + craft.HARDMODE_TRIO.filter(key => defeatedBosses.has(key)).length
      + ' / 3 defeated · Fight in any order. All three cores craft the Triune Emblem.');
    if (defeatedBosses.has('starwyvern')) {
      const foundry = worldgen.foundryLayout(seed);
      rows.push('Space · Hunt wild wyverns. Craft Wyvern Wings or Starweave Wings at an Anvil.');
      rows.push('Starfall Foundry · x ' + (foundry.x - 30) + ', y ' + foundry.y + ' · Follow the landing pads east.');
    }
    if (defeatedBosses.has('lenscustodian') && archiveSite) {
      rows.push('Tidal Archive · Airlock beneath the ocean at x ' + archiveSite.x + ', y ' + (archiveSite.y - 2) + '.');
    }
    if (defeatedBosses.has('foundrywarden')) rows.push('Lens Vault · The seal is beneath the Mechanist arena rope.');
    rows.push('Smelted bars · ' + state.progress.bars + '    Residents · ' + village.count);
    const summons = new Map(Object.entries(craft.ITEMS)
      .filter(([, item]) => item.use?.summon).map(([key, item]) => [item.use.summon, [key, item]]));
    const dungeon = worldgen.dungeonLayout(seed);
    if (dungeon && defeatedBosses.has('hollloweye')) {
      rows.push('Ossuary entrance · x ' + dungeon.x + ' · Ring the bell at night with a Bone Clapper.');
    }
    const mainHints = {
      kingslime: 'Its defeat brings down a meteor.',
      hollloweye: 'Summon at night. Its lens improves ranged combat.',
      furnacewarden: 'Summon in Hell. Forge an Ashvault Key from a core.',
      ashguardian: 'Bring the key to an Ashvault in the Trench.',
      voidsovereign: 'Mine Void Crystals with an Emberite Pickaxe.',
      riftarchon: 'The Rift Core unlocks the pickaxe for sky-island ore.',
      prismsentinel: 'Fight in the sky. Victory unlocks the Hallow and three Hardmode ores.',
      starwyvern: 'Defeat all three Hardmode machines, then sound the horn above the sky islands in Space.',
      foundrywarden: 'Cross the Starfall Foundry and use the igniter on the far platform.',
      lenscustodian: 'After the Mechanist and Starfall Warden, enter the Lens Vault and power its shield sensor.',
      drownedarchivist: 'After the Lens Custodian, open the Tidal Archive floodgate and summon the Archivist below.'
    };
    for (const [index, [main, ...optional]] of craft.BOSS_CHAPTERS.entries()) {
      rows.push('Chapter ' + (index + 1) + ' · ' + enemyModule.BY_KEY[main].name);
      for (const boss of [main, ...optional]) {
        const [summon, item] = summons.get(boss);
        const required = craft.bossPrerequisite(boss, defeatedBosses);
        const done = defeatedBosses.has(boss);
        const status = done ? 'Defeated' : required ? 'Locked until ' + enemyModule.BY_KEY[required].name : 'Unlocked';
        const role = craft.HARDMODE_TRIO.includes(boss) ? 'Hardmode main' : boss === main ? 'Main' : 'Optional';
        rows.push(role + ' · ' + enemyModule.BY_KEY[boss].name + ' · ' + status);
        if (!done) rows.push(item.name + ' · ' + recipeLine(summon) + ' · ' + (mainHints[boss] || item.text));
      }
    }
    ui.showTown('Progression Journal', rows, [{ label: 'Back to Town Hall', run: checkHousing }]);
  }

  function openTownOrders() {
    const rows = [completedOrders.size + ' / ' + villagerModule.TOWN_ORDERS.length + ' completed in this world.',
      'Visit a settlement to fulfill orders from its residents. Each order pays once.'];
    const actions = [{ label: 'Back to Town Hall', run: checkHousing }];
    const sponsors = new Set(village.list.filter(v =>
      Math.hypot(v.home.x - state.player.x, v.home.y - state.player.y) <= PYLON_RADIUS).map(v => v.key));
    const items = entries => entries.map(([key, count]) => count + ' ' + craft.nameOf(key, tiles)).join(', ');
    let unavailable = 0;
    for (const order of villagerModule.TOWN_ORDERS) {
      if (completedOrders.has(order.id)) continue;
      if (!sponsors.has(order.sponsor)) { unavailable += 1; continue; }
      const ready = order.needs.every(([key, count]) => inventory.countOf(key) >= count);
      actions.push({
        label: (ready ? 'Complete ' : 'Needs supplies · ') + order.name + ' · ' + items(order.needs)
          + ' → ' + items(order.rewards),
        run() {
          if (completedOrders.has(order.id) || !village.list.some(v => v.key === order.sponsor &&
            Math.hypot(v.home.x - state.player.x, v.home.y - state.player.y) <= PYLON_RADIUS)) return;
          const result = villagerModule.completeTownOrder(inventory, order, key => craft.kindOf(key));
          if (result !== 'complete') {
            say(result === 'full' ? 'Make room for the rewards' : 'Bring the listed supplies', 2);
            return;
          }
          completedOrders.add(order.id);
          say('Contract complete · ' + order.name, 2.5);
          openTownOrders();
        }
      });
    }
    if (unavailable) rows.push(unavailable + ' more orders need other residents nearby.');
    ui.showTown('Town Contracts', rows, actions);
  }

  function deviceAt(x, y) {
    const device = townDevices.find(entry => entry.x === x && entry.y === y);
    return device && tiles.tile(world.get(x, y)).townDevice === device.type ? device : null;
  }

  function storageCapacity(excluding) {
    return villagerModule.townStorageCapacity(townDevices, STORAGE_RADIUS, excluding);
  }

  function openStorage(device) {
    function canUse() {
      return deviceAt(device.x, device.y) === device && physics.aimTile(state.player, device).inReach;
    }
    function view(query) {
      const capacity = storageCapacity();
      const status = capacity ? storageItems.length + ' / ' + capacity + ' stacks used'
        : 'Place a storage unit within 24 tiles of a Storage Heart to add capacity.';
      if (!canUse()) return { rows: ['Move closer to use this terminal.'], actions: [] };
      const port = villagerModule.townStoragePort(storageItems, storageCapacity, inventoryModule.STACK_MAX);
      const matches = key => craft.nameOf(key, tiles).toLowerCase().includes(query);
      const actions = [];
      const held = selectedItem();
      if (held && capacity) actions.push({ label: 'Deposit held stack · ' + craft.nameOf(held.key, tiles), run() {
        if (!canUse()) return;
        const stack = selectedItem();
        if (!stack) return;
        const left = port.add(stack, stack.count);
        stack.count = left;
        if (!left) inventory.slots[inventory.section('hotbar').from + state.player.selected] = null;
        if (left) say('Storage is full', 1.4);
      } });
      if (capacity) actions.push({ label: 'Deposit backpack', run() {
        if (!canUse()) return;
        const { from, to } = inventory.section('main');
        for (let i = from; i < to; i += 1) {
          const item = inventory.slots[i];
          if (!item) continue;
          item.count = port.add(item, item.count);
          if (!item.count) inventory.slots[i] = null;
        }
      } });
      const names = [...new Set(storageItems.map(item => item.key))].filter(matches)
        .sort((a, b) => craft.nameOf(a, tiles).localeCompare(craft.nameOf(b, tiles)));
      for (const key of names) actions.push({ label: 'Withdraw ' + craft.nameOf(key, tiles) + ' · ' + port.countOf(key), run() {
        if (!canUse()) return;
        const amount = Math.min(inventoryModule.STACK_MAX, port.countOf(key));
        const left = inventory.add({ key, kind: craft.kindOf(key) }, amount);
        port.take(key, amount - left);
        if (left) say('Backpack is full', 1.4);
      } });
      if (device.type === 'crafter') {
        const stations = craft.stationsNear(world, tiles, device.x, device.y);
        for (const recipe of craft.available(port, stations).filter(r => matches(r.out.key))) {
          actions.push({ label: 'Craft ' + craft.nameOf(recipe.out.key, tiles) + ' ×' + recipe.out.count, run() {
            if (!canUse()) return;
            const current = craft.stationsNear(world, tiles, device.x, device.y);
            if (recipe.station && !current.has(recipe.station)) return;
            const before = storageItems.map(stack => ({ ...stack }));
            if (craft.craft(port, recipe)) {
              if (recipe.out.kind === 'bar') state.progress.bars += recipe.out.count;
            } else {
              storageItems.splice(0, storageItems.length, ...before);
              say('Not enough room or materials', 1.4);
            }
          } });
        }
      }
      return { rows: [status, device.type === 'crafter'
        ? 'Crafting uses stored ingredients and stations near this terminal.'
        : 'Terminals share stock across this world.'], actions };
    }
    ui.showTown(device.type === 'crafter' ? 'Storage Crafting' : 'Magic Storage', [], [], view);
  }

  function safePylonLanding(device) {
    const p = state.player;
    for (const dx of [0, 1, -1, 2, -2, 3, -3, 4, -4]) {
      for (const dy of [1, 0, 2, -1, 3, -2]) {
        const x = device.x + dx + 0.1;
        const floor = device.y + dy;
        const y = floor - p.height;
        if (!tiles.isSolid(world.get(Math.floor(x), floor))) continue;
        if (physics.overlapsSolid(world, tiles, x, y, p.width, p.height)) continue;
        if (world.getLevel(Math.floor(x), floor - 1) || world.getLevel(Math.floor(x), Math.floor(y))) continue;
        return { x, y };
      }
    }
    return null;
  }

  function openPylon(source) {
    const residents = village.nearbyHomes(source.x, source.y, PYLON_RADIUS);
    const rows = [residents + ' occupied homes nearby. Each endpoint needs two.',
      'Travel requires a clear landing and is blocked during boss fights.'];
    const actions = residents < 2 ? [] : townDevices
      .filter(d => d.type === 'pylon' && d !== source && Math.hypot(d.x - source.x, d.y - source.y) >= PYLON_RADIUS * 2)
      .map(destination => {
        const layer = worldgen.layerAt(destination.y);
        const area = layer.key === 'surface' ? worldgen.biomeAt(seed, destination.x).name : layer.name;
        const name = area + ' · ' + destination.x + ', ' + destination.y;
        return { label: 'Travel to ' + name, run() {
          if (swarm.bossAlive()) { say('Pylons go dark during boss fights', 2); return; }
          if (!physics.aimTile(state.player, source).inReach || deviceAt(source.x, source.y) !== source) return;
          if (deviceAt(destination.x, destination.y) !== destination ||
            village.nearbyHomes(source.x, source.y, PYLON_RADIUS) < 2 ||
            village.nearbyHomes(destination.x, destination.y, PYLON_RADIUS) < 2) {
            say('Both pylons need two occupied homes', 2.5);
            return;
          }
          const landing = safePylonLanding(destination);
          if (!landing) { say('Clear a landing beside the destination pylon', 2.5); return; }
          releaseHook();
          closeChest();
          Object.assign(state.player, landing, { vx: 0, vy: 0, mining: null, fell: 0, landed: 0 });
          state.camera.x = landing.x;
          state.camera.y = landing.y;
          ui.closeTown();
          say('Arrived at ' + name, 2.5);
        } };
      });
    if (residents >= 2 && !actions.length) rows.push('Place another pylon at least 90 tiles away to link a second town.');
    ui.showTown('Pylon Network', rows, actions);
  }

  function useTownDevice(aim) {
    const device = deviceAt(aim.x, aim.y);
    if (!device) return false;
    input.left = input.right = input.jump = input.down = false;
    if (device.type === 'pylon') openPylon(device);
    else openStorage(device);
    return true;
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
        if (world.getLevel(origin.x, ty) || (origin.x + 1 > p.x && origin.x < p.x + p.width
          && ty + 1 > p.y && ty < p.y + p.height)) {
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

  function useDungeonEntrance(aim) {
    const key = tiles.tile(world.get(aim.x, aim.y)).key;
    if (key !== 'dungeon-bell' && key !== 'dungeon-gate') return false;
    if (!defeatedBosses.has('dungeonkeeper')) {
      if (key === 'dungeon-bell' && inventory.countOf('bone-toll')) return useConsumable({ key: 'bone-toll' });
      say('Bring a Bone Clapper to the Ossuary Bell at night', 2.5);
      return true;
    }
    const site = worldgen.dungeonAt(seed, aim.x, aim.y);
    if (!site) return true;
    for (let x = site.x - 2; x <= site.x + 2; x += 1) {
      if (tiles.tile(world.get(x, site.y)).key === 'dungeon-gate') world.set(x, site.y, tiles.AIR);
    }
    say('The Ossuary is open', 1.5);
    return true;
  }

  function unlockAshvault(aim) {
    if (tiles.tile(world.get(aim.x, aim.y)).key !== 'ashvault-gate') return false;
    const vault = worldgen.ashvaultAt(seed, aim.x, aim.y);
    const inner = vault && aim.x === vault.x + 12;
    const key = inner ? 'guardian-seal' : 'ashvault-key';
    if (!vault || !inventory.countOf(key)) {
      say('This gate needs ' + craft.nameOf(key, tiles), 2);
      return true;
    }
    for (let y = vault.y + 6; y <= vault.y + 9; y += 1) {
      if (tiles.tile(world.get(aim.x, y)).key === 'ashvault-gate') world.set(aim.x, y, tiles.AIR);
    }
    say('Ashvault gate unlocked', 1.5);
    return true;
  }

  function pointHitsPlayer(x, y) {
    const player = state.player;
    return x >= player.x && x < player.x + player.width && y >= player.y && y < player.y + player.height;
  }

  const channelItems = { copper: 'wire-spool', blue: 'blue-wire', green: 'green-wire' };
  const channelColors = { copper: '#f9ad6ee0', blue: '#80c4ffe0', green: '#7be4aee0' };

  function circuitChannel(item) {
    return item?.key === 'wire-spool' ? 'copper' : craft.ITEMS[item?.key]?.wireChannel;
  }

  function playerOccupiesTile(x, y) {
    const p = state.player;
    return x + 1 > p.x && x < p.x + p.width && y + 1 > p.y && y < p.y + p.height;
  }

  function fireBossBarrage(boss, shot) {
    if (boss.key === 'drownedarchivist') {
      setArchiveArenaWater(!archiveFlooded);
      if (!archiveFlooded) shot.angles = [0, Math.PI, -0.32, Math.PI + 0.32];
      say(archiveFlooded ? 'The Archivist floods the arena' : 'The Archivist drains the arena', 1.5);
    }
    const wave = shot.pattern === 'shatter';
    const speed = wave ? 23 : shot.pattern === 'cross' ? 25 : 29;
    const inside = tiles.isSolid(world.get(Math.floor(shot.x), Math.floor(shot.y)));
    for (const angle of shot.angles) {
      state.arrows.push({ x: shot.x, y: shot.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: wave ? 17 / speed : 23 / speed, gravity: 0, damage: shot.enraged ? 109 : 96,
        colour: boss.spec.colour, hostile: boss.spec.name,
        escapeTerrain: shot.pattern === 'cross' && inside });
    }
    if (boss.key === 'lenscustodian' && lensSite) {
      const x = lensSite.x - 10, y = lensSite.y + 135;
      if (tiles.tile(world.get(x, y)).optic === 'backslash') {
        world.set(x, y, tiles.idOf('vault-mirror'));
        stepOptics(true);
        say('The Custodian reversed the mirror · Use the arena switch', 1.6);
      }
    }
    sfxAt(wave ? 'hit' : 'cast', shot.x, shot.y);
  }

  function fireMechanismDart(point, direction = 1) {
    if (state.arrows.length >= 100) return false;
    state.arrows.push({ x: point.x + (direction > 0 ? 0.8 : 0.2), y: point.y + 0.48,
      vx: direction * 28, vy: 0, life: 1.2, gravity: 0,
      damage: point.hard ? 75 : 18, colour: point.hard ? '#d49fe9' : '#d7c0a8', trap: true });
    return true;
  }

  function openLowerOssuary(aim) {
    if (!world.hardmode || !defeatedBosses.has('dungeonkeeper')) {
      say('The seal requires the Prism Sentinel and the Ossuary Keeper', 2.5);
      return;
    }
    const site = worldgen.dungeonAt(seed, aim.x, aim.y);
    if (!site) return;
    for (let dx = -2; dx <= 2; dx += 1) {
      if (tiles.tile(world.get(site.x + dx, site.y + 58)).circuit === 'lower-seal') {
        world.set(site.x + dx, site.y + 58, dx === 0 ? tiles.idOf('rope') : tiles.AIR);
      }
    }
    say('The lower Ossuary is open', 2);
  }

  function openOssuaryCircuit(point, circuit) {
    const site = worldgen.dungeonAt(seed, point.x, point.y);
    if (!site || !defeatedBosses.has('dungeonkeeper')) return;
    if (circuit === 'lens-gate') {
      if (!defeatedBosses.has('ossuarymechanist') || !defeatedBosses.has('foundrywarden')) return;
      for (let dx = 9; dx <= 13; dx += 1) {
        world.set(site.x + dx, site.y + 121, dx === 11 ? tiles.idOf('rope') : tiles.AIR);
      }
      say('Beam aligned · Lens Vault arena unlocked', 2.5);
    } else if (circuit === 'puzzle-gate') {
      for (let y = site.y + 14; y <= site.y + 17; y += 1) world.set(point.x, y, tiles.AIR);
      say('The Mechanist Cache is open', 2.5);
    } else if (world.hardmode && circuit === 'relay-gate') {
      for (let y = site.y + 69; y <= site.y + 73; y += 1) world.set(point.x, y, tiles.AIR);
      if (tiles.tile(world.get(site.x + 6, site.y + 72)).circuit === 'arena-trap') {
        world.set(site.x + 6, site.y + 72, tiles.AIR);
      }
      say('Relay rerouted · dart trap disarmed', 2.5);
    } else if (world.hardmode && circuit === 'drain-gate' && world.getLevel(site.x + 18, site.y + 72) === 0) {
      for (let dx = 13; dx <= 15; dx += 1) world.set(site.x + dx, site.y + 74, dx === 14 ? tiles.idOf('rope') : tiles.AIR);
      say('Reservoir drained · arena unlocked', 2.5);
    }
  }

  function setMechanistShutters(site, phase) {
    const open = tiles.idOf('ossuary-shutter-open');
    const closed = tiles.idOf('ossuary-shutter');
    for (const side of [-1, 1]) {
      const x = site.x + side * 7;
      const close = phase >= 0 && (phase % 2 === 0 ? side < 0 : side > 0);
      const blocked = Array.from({ length: 6 }, (_, i) => site.y + 94 + i)
        .some(y => playerOccupiesTile(x, y) || world.getLevel(x, y));
      for (let y = site.y + 94; y <= site.y + 99; y += 1) {
        const current = world.get(x, y);
        if (current === open || current === closed) world.set(x, y, close && !blocked ? closed : open);
      }
    }
  }

  function stepMechanistArena() {
    const boss = swarm.bossAlive();
    if (boss?.key !== 'ossuarymechanist' && mechanistPhase < 0) return;
    const site = worldgen.dungeonLayout(seed);
    if (!site) return;
    if (boss?.key !== 'ossuarymechanist') {
      setMechanistShutters(site, -1);
      mechanistPhase = -1;
      return;
    }
    const phase = Math.floor(boss.timer / (boss.hp <= boss.maxHp / 2 ? 3 : 5));
    if (phase === mechanistPhase) return;
    mechanistPhase = phase;
    setMechanistShutters(site, phase);
    const side = phase % 2 === 0 ? 1 : -1;
    fireMechanismDart({ x: site.x + side * 13, y: site.y + 98, hard: true }, -side);
    say(side > 0 ? 'Dart volley from the right' : 'Dart volley from the left', 1.4);
  }

  function fillArchiveRows(site, first, last, flooded) {
    const water = tiles.idOf('water');
    for (let dy = first; dy <= last; dy += 1) {
      for (let dx = -22; dx <= 22; dx += 1) {
        const x = site.x + dx, y = site.y + dy;
        if (tiles.isSolid(world.get(x, y))) continue;
        const next = flooded ? world.LEVEL_FULL : 0;
        if (world.getLevel(x, y) !== next) world.setLevel(x, y, next, water);
      }
    }
  }

  function setArchiveArenaWater(flooded) {
    if (!archiveSite || archiveFlooded === flooded) return;
    fillArchiveRows(archiveSite, flooded ? 48 : 27, 58, flooded);
    archiveFlooded = flooded;
  }

  function archiveLift(x, y) {
    const player = state.player;
    player.x = x;
    player.y = y;
    player.vx = player.vy = player.fell = 0;
    releaseHook();
    state.camera.x = x;
    state.camera.y = y;
  }

  function useArchive(aim, spec) {
    if (spec.archive === 'entry') {
      if (!defeatedBosses.has('lenscustodian')) say('Defeat the Lens Custodian to unlock the airlock', 2.4);
      else {
        archiveLift(archiveSite.x - 17, archiveSite.y + 21);
        say('Flood the gallery, then reach the balcony controls', 2.6);
      }
    } else if (spec.archive === 'fill') {
      fillArchiveRows(archiveSite, 10, 24, true);
      world.set(aim.x, aim.y, tiles.idOf('archive-filled'));
      say('Gallery flooded · Swim to the balcony', 2);
    } else if (spec.archive === 'drain') {
      if (tiles.tile(world.get(archiveSite.x - 18, archiveSite.y + 24)).archive !== 'filled'
        || !litSensors.has((archiveSite.x + 14) + ':' + (archiveSite.y + 8))) {
        say('Flood the gallery and align the balcony mirror first', 2.4);
      } else {
        fillArchiveRows(archiveSite, 1, 24, false);
        for (let dx = -4; dx <= -2; dx += 1) {
          world.set(archiveSite.x + dx, archiveSite.y + 25, dx === -3 ? tiles.idOf('rope') : tiles.AIR);
        }
        say('Gallery drained · Lower floodgate open', 2.4);
      }
    } else if (spec.archive === 'exit') {
      archiveLift(archiveSite.x, archiveSite.y - 5);
      say('The airlock returned you to the seabed', 2);
    } else if (spec.archive === 'return') {
      archiveLift(archiveSite.x, worldgen.SEA_LEVEL - 2);
      say('The lift returned you to the ocean surface', 2);
    } else if (spec.archive === 'gate') say('The balcony console controls this floodgate', 2);
    else if (spec.archive === 'filled') say('Use the balcony controls to drain the gallery', 2);
    else return false;
    return true;
  }

  function lensSensorLit() {
    return !!lensSite && litSensors.has((lensSite.x - 10) + ':' + (lensSite.y + 141));
  }

  function stepOptics(force = false) {
    if (!force && state.time < nextOpticScan) return;
    nextOpticScan = state.time + 0.12;
    const player = state.player;
    const sources = [...opticSources.values()];
    if (lensSite && defeatedBosses.has('foundrywarden')) {
      sources.push({ x: lensSite.x + 2, y: lensSite.y + 114 }, { x: lensSite.x - 19, y: lensSite.y + 135 });
    }
    if (archiveSite && defeatedBosses.has('lenscustodian')) sources.push({ x: archiveSite.x + 8, y: archiveSite.y + 7 });
    const traces = [];
    const sensors = new Set();
    for (const { x, y } of sources) {
      if (Math.abs(x - player.x) > 120 || Math.abs(y - player.y) > 90
        || tiles.tile(world.get(x, y)).optic !== 'emitter') continue;
      const trace = deps.wiring.traceBeam(world, tiles, x, y);
      traces.push(trace.points);
      if (trace.sensor) sensors.add(trace.sensor.x + ':' + trace.sensor.y);
    }
    const previouslyLit = litSensors;
    opticTraces = traces;
    litSensors = new Set(sensors);
    for (const key of previouslyLit) {
      const [x, y] = key.split(':').map(Number);
      if (Math.abs(x - player.x) > 72 || Math.abs(y - player.y) > 42) litSensors.add(key);
    }
    for (const [key, { x, y }] of liquidSensors) {
      if (Math.abs(x - player.x) > 72 || Math.abs(y - player.y) > 42) continue;
      const wet = world.getLevel(x, y - 1) >= world.LEVEL_FULL / 2;
      if (!wet) wetSensors.delete(key);
      else if (!wetSensors.has(key)) {
        wetSensors.add(key);
        wiring.pulseAll(x, y, state.time);
      }
    }
    for (const key of sensors) {
      if (previouslyLit.has(key)) continue;
      const [x, y] = key.split(':').map(Number);
      wiring.pulseAll(x, y, state.time);
    }
  }

  function useCircuit(aim, item) {
    if (!wiring) return false;
    const channel = circuitChannel(item);
    if (channel || item?.key === 'wire-cutters') {
      if (!aim.inReach) return true;
      if (channel) {
        if (wiring.add(aim.x, aim.y, channel)) inventory.take(item.key, 1);
      } else {
        const removed = wiring.channelsAt(aim.x, aim.y)[0];
        if (removed && wiring.remove(aim.x, aim.y, removed)) {
          const key = channelItems[removed];
          if (inventory.add({ key, kind: 'loot' }, 1)) dropItem(aim.x, aim.y, key, 'loot', 1);
        }
      }
      return true;
    }
    if (!aim.inReach) return false;
    const spec = tiles.tile(world.get(aim.x, aim.y));
    if (spec.circuit === 'lens-seal') {
      if (!lensSite || !defeatedBosses.has('ossuarymechanist') || !defeatedBosses.has('foundrywarden')) {
        say('Defeat the Ossuary Mechanist and Starfall Warden to open this seal', 2.5);
      } else {
        for (let dx = 13; dx <= 15; dx += 1) {
          world.set(lensSite.x + dx, lensSite.y + 100, dx === 14 ? tiles.idOf('rope') : tiles.AIR);
        }
        say('Lens Vault open · Pulse both colored switches to turn the mirror', 3);
      }
      return true;
    }
    if (spec.archive && useArchive(aim, spec)) return true;
    if (spec.liquidSensor) {
      say(wetSensors.has(aim.x + ':' + aim.y) ? 'Liquid sensor wet' : 'Liquid sensor dry', 1.5);
      return true;
    }
    if (spec.optic) {
      if (spec.vault && spec.circuitPair) say('This mirror turns with a circuit pulse', 1.5);
      else if (spec.circuitPair) {
        world.set(aim.x, aim.y, tiles.idOf(spec.circuitPair));
        stepOptics(true);
      } else if (spec.optic === 'sensor') say(litSensors.has(aim.x + ':' + aim.y) ? 'Sensor lit' : 'Sensor dark', 1.5);
      return true;
    }
    if (spec.circuit === 'lower-seal') {
      openLowerOssuary(aim);
      return true;
    }
    if (spec.logic) {
      say(spec.logic.toUpperCase() + ' Relay · Blue and green inputs, copper output', 2);
      return true;
    }
    if (spec.circuit === 'timer') {
      say(wiring.toggleTimer(aim.x, aim.y, state.time) ? 'Timer running · pulse every 2 seconds' : 'Timer stopped', 1.5);
      return true;
    }
    if (spec.circuit === 'switch') {
      const connected = wiring.pulseAll(aim.x, aim.y, state.time);
      if (connected < 0) say('Circuit exceeds 1,024 wire segments', 2);
      else if (!connected) say('Connect copper wire to this switch', 1.5);
      else sfx('use');
      return true;
    }
    if (['puzzle-gate', 'relay-gate', 'drain-gate', 'lens-gate'].includes(spec.circuit)) {
      say('Follow the mechanism back to its switch', 2);
      return true;
    }
    return false;
  }

  function useWildlife(aim, item) {
    if (item?.key === 'critter-net') {
      if (!aim.inReach) return true;
      const target = swarm.list.find(e => !e.dead && !e.practice && e.spec.specimen
        && pointer.x >= e.x - 0.18 && pointer.x <= e.x + e.width + 0.18
        && pointer.y >= e.y - 0.18 && pointer.y <= e.y + e.height + 0.18);
      if (!target) {
        say('Aim at a nearby critter', 1.2);
        return true;
      }
      const px = state.player.x + state.player.width / 2;
      const py = state.player.y + state.player.height * 0.4;
      const steps = Math.ceil(Math.hypot(pointer.x - px, pointer.y - py) * 4);
      for (let i = 1; i <= steps; i += 1) {
        const x = Math.floor(px + (pointer.x - px) * i / steps);
        const y = Math.floor(py + (pointer.y - py) * i / steps);
        if (tiles.isSolid(world.get(x, y))) {
          say('Something blocks your net', 1.2);
          return true;
        }
      }
      if (inventory.add({ key: 'critter-' + target.spec.specimen.key, kind: 'loot' }, 1)) {
        say('No room to catch that critter', 1.4);
        return true;
      }
      target.dead = true;
      recordWildlife(target.spec, 'caught');
      sfx('use');
      say('Caught ' + target.spec.name, 2);
      return true;
    }
    if (!aim.inReach) return false;
    const spec = tiles.tile(world.get(aim.x, aim.y));
    const specimen = craft.ITEMS[item?.key]?.critter;
    if (spec.key === 'empty-terrarium' && specimen) {
      world.set(aim.x, aim.y, tiles.idOf('terrarium-' + specimen));
      inventory.take(item.key, 1);
      say(craft.ITEMS[item.key].name + ' is now on display', 1.5);
      return true;
    }
    return false;
  }

  function useFoundryShortcut(aim) {
    if (tiles.tile(world.get(aim.x, aim.y)).key !== 'foundry-console') return false;
    const site = worldgen.foundryAt(seed, aim.x, aim.y);
    if (!site || !defeatedBosses.has('starwyvern')) {
      say('Defeat the Star Wyvern to power this console', 2);
      return true;
    }
    for (let i = 1; i < worldgen.FOUNDRY_PADS.length; i += 1) {
      const [left, , floor] = worldgen.FOUNDRY_PADS[i];
      for (let dx = worldgen.FOUNDRY_PADS[i - 1][1] + 1; dx < left; dx += 1) {
        const x = site.x + dx, y = site.y + floor;
        if (world.get(x, y) === tiles.AIR) world.set(x, y, tiles.idOf('oakplatform'));
      }
    }
    say('Foundry skybridges deployed', 2.2);
    return true;
  }

  function place() {
    const aim0 = physics.aimTile(state.player, pointer);
    const item = selectedItem();
    if (useWildlife(aim0, item) || useCircuit(aim0, item)) return;
    if (aim0.inReach && useFoundryShortcut(aim0)) return;
    if (aim0.inReach && (useDungeonEntrance(aim0) || unlockAshvault(aim0) || useTownDevice(aim0))) return;
    if (talkTo()) return;
    if (aim0.inReach && useCrystal(aim0)) return;
    if (aim0.inReach && useBed(aim0)) return;
    if (aim0.inReach && useChest(aim0)) return;
    if (aim0.inReach && useDoor(aim0)) return;
    if (!item) return;
    // A rod casts rather than places, and casting again pulls the line in.
    if (castLine(item)) return;
    // Something used rather than placed is used wherever you are standing.
    if (useConsumable(item)) return;
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
    if (!againstBlock && !((spec.emit > 0 || spec.optic) && againstWall)) return;
    if (spec.townDevice) {
      if (!tiles.isSolid(world.get(aim.x, aim.y + 1))) { say('Place it on a floor', 1.4); return; }
      townDevices.push({ x: aim.x, y: aim.y, type: spec.townDevice });
    }
    world.set(aim.x, aim.y, spec.id);
    if (spec.optic === 'emitter') opticSources.set(aim.x + ':' + aim.y, { x: aim.x, y: aim.y });
    if (spec.liquidSensor) liquidSensors.set(aim.x + ':' + aim.y, { x: aim.x, y: aim.y });
    inventory.take(item.key, 1);
    sfxAt('place', aim.x, aim.y);
    // Placing a block can displace or dam water just as surely as removing one.
    if (liquid) liquid.activateAround(aim.x, aim.y);
  }

  // What is in the player's hand, as the renderer needs it: a shape and two colours.
  // Derived rather than stored, because the hand holds whatever the hotbar says it does.
  function heldLook() {
    const item = selectedItem();
    if (!item) return null;
    const key = item.key;
    if (craft.WEAPONS[key]) {
      const w = craft.WEAPONS[key];
      return { shape: w.ammo === 'bullet' ? 'rifle' : w.ranged ? 'axe' : 'blade', head: w.colour || '#cfd6e0',
        handle: '#6d4f30', length: w.ranged ? 0.4 : 0.5 };
    }
    if (mining.isTool(item)) {
      return { shape: mining.toolSpec(key).job,
        head: mining.tierColour(item), handle: '#6d4f30', length: 0.46 };
    }
    if (key === 'torch') return { shape: 'torch', head: '#ffbd5b', handle: '#795335', length: 0.36 };
    const spec = tiles.BY_KEY[key];
    if (spec) return { shape: 'block', head: spec.colour, handle: spec.colour, length: 0.2 };
    return null;
  }

  // Footsteps, jumps, landings and splashes. Driven off the gait phase rather than off a
  // timer, so footfalls land with the feet at any speed, and off the physics' own
  // onGround and swimming flags rather than off the keys, so a player who is pushed or
  // who walks off a ledge is treated the same as one who jumped.
  let lastFoot = 0;
  let wasGround = true;
  let wasWet = false;

  function stepFootfalls(beforeX, dt) {
    const p = state.player;
    if (p.onGround && Math.abs(p.x - beforeX) > 1e-4) {
      // One step per half stride.
      if (Math.floor(state.anim / Math.PI) !== lastFoot) {
        lastFoot = Math.floor(state.anim / Math.PI);
        const under = tiles.tile(world.get(Math.floor(p.x + p.width / 2),
          Math.floor(p.y + p.height + 0.1)));
        sfx('step', { gain: 0.55, pitch: digSound(under) === 'dig-soil' ? 0.9 : 1.15 });
      }
    }
    if (!p.onGround && wasGround && p.vy < -1) sfx('jump', { gain: 0.6 });
    if (p.onGround && !wasGround) sfx('land', { gain: 0.6 });
    if (p.swimming && !wasWet) sfx('splash');
    if (!p.swimming && wasWet) sfx('splash', { gain: 0.6, pitch: 1.2 });
    wasGround = p.onGround;
    wasWet = !!p.swimming;
  }

  function simulate(dt) {
    // Water first, so what the player collides with this step is where the water ended up
    // rather than where it was. The budget is per step, not per frame, which keeps a
    // collapsing reservoir from stalling the loop.
    if (liquid) liquid.step(900);
    swingCooldown = Math.max(0, swingCooldown - dt);
    // Before the physics, not after: the hook decides the player's velocity and whether
    // gravity applies at all this step, and a hook that ran afterwards would always be
    // one frame behind what the player can see.
    stepHook(dt);
    const before = state.player.x;
    physics.step(state.player, world, tiles, input, dt);
    const player = state.player;
    const footX = Math.floor(player.x + player.width / 2);
    const footY = Math.floor(player.y + player.height - 0.01);
    const plate = player.onGround && wiring.channelsAt(footX, footY).length
      && tiles.tile(world.get(footX, footY)).circuit === 'plate';
    wiring.step(state.time, plate ? { x: footX, y: footY } : null);
    stepMechanistArena();
    stepOptics();
    if (archiveFlooded && swarm.bossAlive()?.key !== 'drownedarchivist') setArchiveArenaWater(false);
    const moving = Math.abs(state.player.x - before) > 1e-4 || !state.player.onGround;
    statsModule.step(stats, dt * (((state.gear && state.gear.regen) || 1)), moving,
      (state.gear && state.gear.manaRegen) || 1);
    // A swing at something alive takes priority over a swing at the rock behind it.
    if (input.dig && !ui.isOpen && attack()) state.player.mining = null;
    else if (input.dig && !ui.isOpen) mine(dt);
    else state.player.mining = null;

    // Where the arms are. Mining drives the arc from the dig timer so the swing lands
    // when the tile takes damage; a weapon swing drives it from its own cooldown.
    state.anim += Math.abs(state.player.x - before) * 2.3;
    stepFootfalls(before, dt);
    const dug = state.player.mining;
    if (dug) {
      const tool = selectedItem();
      const period = Math.max(0.08, mining.useTimeOf(tool)
        * ((state.gear && state.gear.swing) || 1));
      state.swingArm = Math.min(1, (dug.swing % period) / period);
    } else if (swingCooldown > 0) {
      state.swingArm = Math.min(1, 1 - swingCooldown / Math.max(0.01, swingTotal));
    } else {
      state.swingArm = null;
    }
    state.held = heldLook();

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

    if (village) village.step(dt, state.player);
    stepStars(dt);
    stepFishing(dt);
    if (buffs) {
      buffs.step(dt);
      // Standing buffs are re-given while their source is in reach and expire a second
      // or two after it is not, so "am I still near the fire" never has to be asked.
      // The scan is a few times a second rather than every frame: it is a box of tiles.
      hearthCheck -= dt;
      if (hearthCheck <= 0) {
        hearthCheck = 0.4;
        const warm = buffModule.hearthsNear(world, tiles,
          state.player.x + state.player.width / 2,
          state.player.y + state.player.height / 2);
        for (const key of warm) buffs.give(key);
      }
      state.buffs = buffs.list();
    }
    // What the player has done, which is what decides who is willing to move in.
    const depth = Math.floor(state.player.y) - worldgen.surfaceHeight(seed, Math.floor(state.player.x));
    if (depth > state.progress.deepest) state.progress.deepest = depth;
    state.progress.coins = inventory.countOf('coin');

    // Weather lives in worldgen because it is a property of the world, pure in seed and
    // clock. Keeping one definition matters more here than usual: a copy of this rule in
    // the test would make the test agree with the copy rather than with the game.
    if (audio) {
      const layerKey = worldgen.layerAt(Math.floor(state.player.y)).key;
      audio.setAmbience(layerKey);
      audio.stepMusic(dt, layerKey, state.dayPhase > 0.27 && state.dayPhase < 0.73);
    }
    stepEvents();
    state.weather = worldgen.weatherAt(seed, state.time,
      worldgen.biomeAt(seed, Math.floor(state.player.x)).key);

    const gear = currentEffects();
    state.gear = gear;
    stats.defense = gear.defense + (state.wardUntil > state.time ? 14 : 0);
    state.player.speedScale = gear.speed;
    state.player.canDoubleJump = gear.doubleJump;
    state.player.flight = gear.flight;

    if (swarm) {
      swarm.step(state.player, dt, state.dayPhase, eventKey());
      const hit = swarm.touching(state.player);
      // The Royal Gel: slimes stop noticing you. The king is still a slime, and is the
      // one slime it does not work on, because a trinket that turns off the boss fight
      // you paid for is not a reward.
      const friendly = hit && hit.spec.kind === 'slime'
        && state.gear && state.gear.slimeFriend;
      if (hit && !friendly) {
        const dealt = statsModule.damage(stats, hit.spec.damage);
        lastHurt = hit.spec.name;
        if (dealt > 0) {
          // Knocked away from whatever hit you, so contact damage is not a death loop.
          const away = Math.sign(state.player.x - hit.x) || 1;
          state.player.vx = away * 9 * (hit.spec.push || 1);
          state.player.vy = -7;
          sfx('hurt');
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
        lastHurt = 'the fall';
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
      lastHurt = 'the water';
      if (dealt > 0 && Math.random() < 0.08) say('Drowning!', 0.8);
    }

    // Check hazards at the player's feet.
    const feet = tiles.tile(world.get(Math.floor(state.player.x + state.player.width / 2),
      Math.floor(state.player.y + state.player.height * 0.6)));
    if (feet.spikeDamage) {
      const hit = statsModule.damage(stats, feet.spikeDamage);
      if (hit > 0) { lastHurt = feet.name; say('Watch the floor', 1.3); }
    }
    if (feet.hot && !gear.fireproof) {
      const burnt = statsModule.damage(stats, 24 * (feet.key === 'lava' ? gear.lavaDamage : 1));
      lastHurt = feet.key === 'lava' ? 'the lava' : 'the heat';
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

  }

  let chunkWorker = null;
  let chunkJob = null;
  let lastChunkBounds = '';
  let chunkBounds = null;
  function startChunkWorker() {
    if (chunkWorker) chunkWorker.terminate();
    chunkWorker = null;
    chunkJob = null;
    lastChunkBounds = '';
    if (typeof Worker !== 'function') return;
    try {
      const worker = new Worker('workers/chunk.js?v=tidal-archive-1');
      chunkWorker = worker;
      worker.onmessage = ({ data }) => {
        if (chunkWorker !== worker || !chunkJob) return;
        const { cx, cy, world: targetWorld } = chunkJob;
        chunkJob = null;
        if (targetWorld !== world || cx < chunkBounds.left || cx > chunkBounds.right
          || cy < chunkBounds.top || cy > chunkBounds.bottom) return;
        world.acceptGeneratedChunk(cx, cy, data);
      };
      worker.onerror = () => {
        if (chunkWorker !== worker) return;
        worker.terminate();
        chunkWorker = null;
        chunkJob = null;
      };
    } catch {
      // Chunk reads still generate synchronously if workers are unavailable.
    }
  }

  function maintainChunks() {
    const size = texture.TILE * state.camera.zoom;
    const chunkSize = worldgen.CHUNK;
    const cx = Math.floor(state.camera.x / chunkSize);
    const cy = Math.floor(state.camera.y / chunkSize);
    const span = Math.ceil(Math.max(canvas.width, canvas.height) / (size * chunkSize)) + 2;
    const key = cx + ':' + cy + ':' + span;
    if (key !== lastChunkBounds) {
      chunkBounds = { left: cx - span, top: cy - span, right: cx + span, bottom: cy + span };
      world.evictOutside(chunkBounds.left, chunkBounds.top, chunkBounds.right, chunkBounds.bottom);
      lastChunkBounds = key;
    }
    if (!chunkWorker || chunkJob) return;
    const halfWidth = canvas.width / (size * 2);
    const halfHeight = canvas.height / (size * 2);
    const left = Math.floor((state.camera.x - halfWidth - 3) / chunkSize) - 1;
    const right = Math.floor((state.camera.x + halfWidth + 3) / chunkSize) + 1;
    const top = Math.floor((state.camera.y - halfHeight - 3) / chunkSize) - 1;
    const bottom = Math.floor((state.camera.y + halfHeight + 3) / chunkSize) + 1;
    let next = null;
    let closest = Infinity;
    const aheadX = state.camera.x / chunkSize + Math.sign(state.player.vx || 0) * 0.8;
    const aheadY = state.camera.y / chunkSize + Math.sign(state.player.vy || 0) * 0.8;
    for (let y = top; y <= bottom; y += 1) {
      for (let x = left; x <= right; x += 1) {
        const distance = (x + 0.5 - aheadX) ** 2 + (y + 0.5 - aheadY) ** 2;
        if (distance >= closest || world.hasChunk(x, y)) continue;
        closest = distance;
        next = { cx: x, cy: y };
      }
    }
    if (next) {
      chunkJob = { ...next, world };
      chunkWorker.postMessage({ ...next, seed });
    }
  }

  let accumulator = 0;
  let previous = 0;
  function frame(now) {
    if (!running) return;
    const dt = previous ? Math.min(0.25, (now - previous) / 1000) : 0;
    previous = now;
    if (!state.paused) {
      // Bound catch-up after a stall so one slow frame does not trigger another.
      accumulator = Math.min(accumulator + dt, STEP * 10);
      let guard = 0;
      while (accumulator >= STEP && guard < 10) {
        simulate(STEP);
        accumulator -= STEP;
        state.time += STEP;
        guard += 1;
      }
    }
    state.wornAppearance = wornAppearance();
    lastView = renderer.draw(state);
    maintainChunks();
    if (minimap && (minimap.isLarge || !window.matchMedia?.('(max-width: 900px)').matches)) minimap.draw(state, dt);
    drawAim();
    if (now - lastUISync >= (ui.isOpen ? 40 : 100)) {
      syncUI();
      touchControls?.sync();
      lastUISync = now;
    }
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
    if (opticTraces.length) {
      ctx.strokeStyle = '#d5e9ffdb';
      ctx.lineWidth = Math.max(1.5, size / 9);
      for (const points of opticTraces) {
        ctx.beginPath();
        for (const [i, point] of points.entries()) {
          const x = (point.x - lastView.x0 + 0.5) * size - lastView.offsetX;
          const y = (point.y - lastView.y0 + 0.5) * size - lastView.offsetY;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    const held = selectedItem();
    if (wiring?.size && (circuitChannel(held) || held?.key === 'wire-cutters')) {
      const line = Math.max(2, size / 10);
      for (let y = lastView.y0; y <= lastView.y0 + Math.ceil(canvas.height / size) + 1; y += 1) {
        for (let x = lastView.x0; x <= lastView.x0 + Math.ceil(canvas.width / size) + 1; x += 1) {
          for (const channel of wiring.channelsAt(x, y)) {
            ctx.fillStyle = channelColors[channel];
            const offset = (channel === 'blue' ? -1 : channel === 'green' ? 1 : 0) * line * 1.4;
            const cx = (x - lastView.x0 + 0.5) * size - lastView.offsetX + offset;
            const cy = (y - lastView.y0 + 0.5) * size - lastView.offsetY + offset;
            ctx.fillRect(cx - line, cy - line, line * 2, line * 2);
            if (wiring.has(x + 1, y, channel)) ctx.fillRect(cx, cy - line / 2, size, line);
            if (wiring.has(x, y + 1, channel)) ctx.fillRect(cx - line / 2, cy, line, size);
          }
        }
      }
    }
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
    for (const target of swarm.list) {
      if (!target.dead && !target.practice && !bestiary[target.key]
        && Math.hypot(target.x - state.player.x, target.y - state.player.y) <= 14) recordWildlife(target.spec);
    }
    // Refresh the open inventory frequently so nearby station changes appear promptly.
    state.stations = craft.stationsNear(world, tiles, state.player.x, state.player.y);
    const hour = ((state.dayPhase + 0.5) * 24) % 24;
    ui.setField('clock', String(Math.floor(hour)).padStart(2, '0') + ':'
      + String(Math.floor((hour % 1) * 60)).padStart(2, '0'));
    ui.setField('biome', world.biomeAt(Math.floor(state.player.x), Math.floor(state.player.y)).name);
    const layer = worldgen.layerAt(Math.floor(state.player.y));
    const depth = Math.floor(state.player.y) - worldgen.surfaceHeight(seed, Math.floor(state.player.x));
    ui.setField('depth', depth > 0 ? layer.name + ' · ' + depth + 'm' : layer.name);
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
      if (ui.townOpen) {
        if (ev.code === 'Escape') ui.closeTown();
        return;
      }
      if (audio) audio.unlock();
      if (ev.code === 'KeyN') {
        const on = audio ? audio.setEnabled(!audio.enabled) : false;
        say(on ? 'Sound on' : 'Sound off', 1.2);
        ev.preventDefault();
        return;
      }
      if (ev.code === 'KeyB') {
        const on = audio ? audio.setMusic(!audio.musicOn) : false;
        say(on ? 'Music on' : 'Music off', 1.2);
        ev.preventDefault();
        return;
      }
      if (ev.code === 'KeyE' || ev.code === 'Tab' || ev.code === 'KeyI') {
        // Shutting the backpack shuts whatever chest was open with it, which is both
        // what a player expects and what makes sure the contents get written back.
        if (ui.isOpen) closeChest();
        ui.toggle();
        ev.preventDefault();
        return;
      }
      if (ev.code === 'KeyG') {
        fireHook();
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
      if (audio) audio.unlock();
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
      bestiary,
      progress: state.progress,
      playedSeconds: carriedCharacterSeconds + elapsed
    });
    profiles.saveWorld(worldId, {
      world: world.serialize(),
      wiring: wiring.serialize(),
      lowerOssuaryWiring: true,
      lensVaultWiring: true,
      archiveWiring: true,
      archiveFlooded,
      liquidSensors: [...liquidSensors.values()],
      wetSensors: [...wetSensors],
      opticSources: [...opticSources.values()],
      opticLit: [...litSensors],
      dayPhase: state.dayPhase,
      spawn: state.spawn || null,
      nights: state.nights,
      meteors: state.meteors,
      buffs: buffs ? buffs.serialize() : {},
      villagers: village ? village.serialize() : [],
      townDevices,
      completedOrders: [...completedOrders],
      defeatedBosses: [...defeatedBosses],
      storageItems,
      spawn: { x: state.player.x, y: state.player.y },
      playedSeconds: carriedWorldSeconds + elapsed
    });
  }

  function resize() {
    const width = Math.max(1, canvas.clientWidth), height = Math.max(1, canvas.clientHeight);
    const mobile = !!window.matchMedia?.('(pointer: coarse)').matches;
    const budget = mobile ? 1000000 : 2400000;
    const dpr = Math.min(mobile ? 1.25 : 2, window.devicePixelRatio || 1, Math.sqrt(budget / (width * height)));
    const w = Math.max(1, Math.floor(width * dpr)), h = Math.max(1, Math.floor(height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }

  function boot(choice) {
    characterId = choice.character.id;
    worldId = choice.world.id;
    const characterRecord = profiles.loadCharacter(characterId) || {};
    bestiary = Object.assign(Object.create(null), characterRecord.bestiary || {});
    const worldRecord = profiles.loadWorld(worldId) || {};
    seed = choice.world.seed;

    world = chunks.makeWorld(seed, worldgen);
    startChunkWorker();
    if (worldRecord.world && worldRecord.world.seed === seed) world.restore(worldRecord.world);

    renderer = render.makeRenderer(canvas, { tiles, texture, autotile, light, worldgen, noise, sprite, webgl: deps.webgl });
    liquid = liquidModule.makeLiquid(world, tiles);
    swarm = enemyModule.makeSwarm(world, tiles, {
      worldgen, dungeonOpen: () => defeatedBosses.has('dungeonkeeper'), bossBarrage: fireBossBarrage,
      wyvernsUnlocked: () => defeatedBosses.has('starwyvern'), lensLit: lensSensorLit
    });
    wiring = deps.wiring.makeWiring(world, tiles, {
      door: point => useDoor(point),
      occupied: playerOccupiesTile,
      liquid: (x, y) => liquid.activateAround(x, y),
      statue: (key, point) => swarm.summonPractice(key, point.x, point.y),
      trap: point => {
        const site = worldgen.dungeonAt(seed, point.x, point.y);
        const hard = !!site && tiles.tile(world.get(point.x, point.y)).circuit === 'arena-trap';
        return fireMechanismDart({ ...point, hard }, hard ? -1 : 1);
      },
      puzzle: openOssuaryCircuit
    });
    const ossuary = worldgen.dungeonLayout(seed);
    lensSite = ossuary;
    archiveSite = worldgen.archiveLayout(seed);
    archiveFlooded = !!worldRecord.archiveFlooded;
    liquidSensors = new Map((worldRecord.liquidSensors || []).map(point => [point.x + ':' + point.y, point]));
    wetSensors = new Set(worldRecord.wetSensors || []);
    opticSources = new Map((worldRecord.opticSources || []).map(point => [point.x + ':' + point.y, point]));
    opticTraces = [];
    litSensors = new Set(worldRecord.opticLit || []);
    nextOpticScan = 0;
    if (worldRecord.wiring) wiring.restore(worldRecord.wiring, state.time);
    else if (ossuary) {
      for (let dx = 5; dx <= 16; dx += 1) wiring.add(ossuary.x + dx, ossuary.y + 17);
    }
    if (ossuary && !worldRecord.lowerOssuaryWiring) {
      for (let dx = 2; dx <= 6; dx += 1) wiring.add(ossuary.x + dx, ossuary.y + 73, 'blue');
      wiring.add(ossuary.x + 6, ossuary.y + 72, 'blue');
      for (let dx = 4; dx <= 9; dx += 1) wiring.add(ossuary.x + dx, ossuary.y + 73);
      for (let dx = 11; dx <= 21; dx += 1) wiring.add(ossuary.x + dx, ossuary.y + 73);
      wiring.add(ossuary.x + 14, ossuary.y + 74);
    }
    if (archiveSite && !worldRecord.archiveWiring) {
      for (let dy = 7; dy <= 9; dy += 1) wiring.add(archiveSite.x + 12, archiveSite.y + dy);
      for (let dx = 13; dx <= 14; dx += 1) wiring.add(archiveSite.x + dx, archiveSite.y + 7);
    }
    if (lensSite && !worldRecord.lensVaultWiring) deps.wiring.seedLensWiring(wiring, lensSite);
    mechanistPhase = -1;
    minimap = minimapModule.makeMinimap(document.getElementById('minimap'),
      { tiles, worldgen });
    village = villagerModule.makeVillage(world, tiles, { housing });
    if (worldRecord.villagers) village.restore(worldRecord.villagers);
    townDevices = worldRecord.townDevices || [];
    completedOrders = new Set(worldRecord.completedOrders || []);
    defeatedBosses = craft.restoreBossProgress(worldRecord.defeatedBosses);
    if (defeatedBosses.has('prismsentinel') && !world.hardmode) world.enableHardmode();
    state.wardUntil = 0;
    storageItems = worldRecord.storageItems || [];
    state.villagers = village.list;
    state.progress = Object.assign({ coins: 0, bars: 0, deaths: 0, deepest: 0 },
      characterRecord.progress || {});
    state.enemies = swarm.list;
    inventory = inventoryModule.makeInventory();
    stats = statsModule.makeStats();
    ui = uiModule.makeUI(document.getElementById('hud'),
      { tiles, texture, inventory, atlas: renderer.atlas, mining, craft,
        controls: CONTROLS });
    state.itemArt = ui.itemArt;
    ui.onChestMove = chestMove;
    ui.onBuy = buyFrom;
    ui.onHeal = healFrom;
    ui.onSelectHotbar = index => { state.player.selected = index - inventory.section('hotbar').from; ui.sync(state); };
    ui.onCraft = (recipe) => {
      if (craft.craft(inventory, recipe)) {
        if (recipe.out.kind === 'bar') state.progress.bars += recipe.out.count;
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
    state.nights = worldRecord.nights || 0;
    if (buffs) buffs.restore(worldRecord.buffs);
    state.meteors = worldRecord.meteors || 0;
    state.bloodMoon = false;
    wasNight = state.dayPhase > NIGHT_FROM && state.dayPhase < NIGHT_TO;
    state.spawn = worldRecord.spawn || null;
    state.player = spawnPlayer();
    if (world.hardmode && ossuary) setMechanistShutters(ossuary, -1);
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
    if (touchControls) {
      touchControls.setPlaying(true);
      if (touchControls.active) state.camera.zoom = canvas.clientWidth < 600 ? 1.5 : 2;
    }
    say(choice.world.name + ' \u2014 seed ' + seed + (touchControls?.active ? '. Tap the world to aim and dig. Bag opens the backpack.' : '. E opens the backpack.'), 7);
    setInterval(save, 20000);
    requestAnimationFrame(frame);
  }

  function start() {
    resize();
    addEventListener('resize', resize);
    bind();
    if (deps.touch) touchControls = deps.touch.bindTouchControls(canvas, document.getElementById('touch-controls'), {
      modal: () => !!(ui?.isOpen || minimap?.isLarge),
      hold: (key, value) => { input[key] = value; if (value && audio) audio.unlock(); },
      aim: worldFromScreen,
      run(action) {
        if (audio) audio.unlock();
        if (action === 'bag') {
          if (minimap?.isLarge) minimap.setLarge(false);
          if (ui.isOpen) closeChest();
          ui.toggle();
        } else if (action === 'map') {
          if (ui.isOpen) { closeChest(); ui.setOpen(false); }
          if (minimap) minimap.setLarge(!minimap.isLarge);
        } else if (action === 'place' && !state.paused) place();
        else if (action === 'hook' && !state.paused) fireHook();
        else if (action === 'pause') state.paused = !state.paused;
        else if (action === 'house') checkHousing();
        else if (action === 'zoomIn' || action === 'zoomOut') {
          const step = action === 'zoomIn' ? 1 : -1;
          if (minimap?.isLarge) minimap.zoomBy(step);
          else state.camera.zoom = Math.max(1, Math.min(4, state.camera.zoom + step * .5));
        }
      }
    });
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
    maintainChunks();
  }

  function useBedAt(x, y) {
    return useBed({ x, y, inReach: true });
  }

  function useChestAt(x, y) {
    return useChest({ x, y, inReach: true });
  }

  function useCrystalAt(x, y) {
    return useCrystal({ x, y, inReach: true });
  }

  function useDoorAt(x, y) {
    return useDoor({ x, y, inReach: true });
  }

  return { state, start, deps, swingAt, selectedItem, liquidWake, liquidActive, useBucketAt,
    useDoorAt, useChestAt, useBedAt, useCrystalAt, place, fireHook, releaseHook, chestMove, checkHousing, talkTo, buyFrom,
    get village() { return village; }, get openChest() { return openChest; },
    swarmCount, attackAt, advance,
    get swarm() { return swarm; },
    get inventory() { return inventory; },
    get stats() { return stats; },
    get seed() { return seed; },
    get ui() { return ui; },
    get profiles() { return profiles; },
    get audio() { return audio; },
    get controls() { return CONTROLS; },
    // What has been killing this character, which is worth knowing when tuning.
    get deathsBy() { return deathsBy; },
    get buffs() { return buffs; },
    // Test seams: what the keyboard and the mouse would set, so a long
    // automated session can play the game through the same path a person does.
    get input() { return input; },
    get pointer() { return pointer; },
    // A test seam: draw one frame without the animation loop, so a measurement can
    // separate the cost of simulating from the cost of drawing.
    drawOnce() { lastView = renderer.draw(state); return lastView; },
    get renderer() { return renderer; },
    dropMeteor, stepEvents, eventKey };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { makeGame, STEP, DAY_SECONDS };
}
