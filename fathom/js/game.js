'use strict';
// Game shell: input, camera, mining, placing, stats and save. A fixed simulation timestep
// keeps physics independent of frame rate; rendering shows whatever the latest state is.

const STEP = 1 / 120;
const DAY_SECONDS = 1440;
const PICKUP_RANGE = 2.2;

function makeGame(canvas, deps) {
  const { rng, tiles, worldgen: overworldGenerator, chunks, light, texture, render, player: physics,
    noise, autotile, mining, craft, liquid: liquidModule, enemy: enemyModule,
    minimap: minimapModule, housing, villager: villagerModule,
    inventory: inventoryModule, stats: statsModule, ui: uiModule,
    profile: profileModule, menu: menuModule, sprite, audio: audioModule,
    buffs: buffModule, fishing: fishModule, settlement: settlementModule } = deps;

  let worldgen = overworldGenerator;
  let dimension = 'overworld';
  let portalLink = null;
  let worldChoice = null;
  craft.registerEnemyBanners(enemyModule.ENEMIES);
  const profiles = profileModule.makeProfiles(window.localStorage);
  const menu = menuModule.makeMenu(document.getElementById('menu'),
    { profiles, palette: profileModule, parseSeed: profileModule.parseSeed, sprite, worldgen });

  // Nothing world-shaped exists until a world is chosen, so each of these is filled in by
  // boot(). A character brings its own inventory and stats into whichever world it enters.
  let seed = 0;
  let worldSettings = worldgen.normalizeWorldSettings();
  let worldRules = worldgen.worldSettingValues();
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
  let mineSite = null;
  let nextSkyAnchor = 0;
  let nextAudioScene = 0;
  let nextRailSound = 0;
  let audioScene = {};
  let cargoItems = [];
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
  let settlements = settlementModule.makeSettlementLedger();
  let expedition = null;
  let activePortalTrial = null;
  let defeatedBosses = new Set();
  let bestiary = Object.create(null);
  let enemyBanners = new Map();
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
    ['J', 'Field Journal and settlements'],
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

  function sampleAudioScene() {
    const x = Math.floor(state.player.x);
    const y = Math.floor(state.player.y);
    const naturalLayer = worldgen.layerAt(y).key;
    if (dimension === 'underworld') return { layer: 'hell', biome: worldgen.biomeAt(seed, x).key,
      night: true, wet: state.player.submerged };
    const layer = naturalLayer === 'surface' && y > worldgen.surfaceHeight(seed, x) + 14 ? 'caves' : naturalLayer;
    const biome = world.biomeAt(x, y).key;
    const ossuary = worldgen.dungeonAt(seed, x, y);
    const site = worldgen.biomeSiteAt(seed, x, y);
    const armory = worldgen.chapterArmoryAt(seed, x, y);
    let dungeon = armory && y > armory.y ? armory.name : site?.name;
    if (ossuary) dungeon = y >= ossuary.y + 100 ? 'Lens Vault'
      : y >= ossuary.y + 58 ? 'Hardmode Ossuary' : 'Ossuary';
    else if (worldgen.ashvaultAt(seed, x, y)) dungeon = 'Ashvault';
    else if (worldgen.foundryAt(seed, x, y)) dungeon = 'Starfall Foundry';
    else if (worldgen.archiveAt(seed, x, y)) dungeon = 'Tidal Archive';
    else if (worldgen.runawayMineAt(seed, x, y)) dungeon = 'Runaway Mine';
    else if (worldgen.siegeAt(seed, x, y)) dungeon = 'Astral Siege';
    const geology = layer === 'caves' || layer === 'deep' ? worldgen.caveSoundscape(seed, x, y) : null;
    return { layer, biome, dungeon, geology, boss: swarm?.bossAlive()?.key, event: eventKey(),
      night: state.dayPhase > 0.27 && state.dayPhase < 0.73, rain: state.weather?.rain > 0.35,
      submerged: state.player.submerged };
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
    const edge = worldgen.starterForestEdge(seed);
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
    settlements.increment('defeat:' + target.key);
    if (target.spec.campaignBoss) {
      if (activePortalTrial?.boss === target && insidePortalTrial(activePortalTrial.site)) {
        defeatedBosses.add(target.key);
        settlements.claimed.add('campaign-reward:' + target.key);
        say('Victory. Recover your trophy at the campaign altar.', 4);
      }
      if (activePortalTrial?.boss === target) activePortalTrial = null;
      return;
    }
    if (target.spec.underworldGuardian) {
      if (activePortalTrial?.boss === target && insidePortalTrial(activePortalTrial.site)) {
        settlements.claimed.add('underworld-win:' + target.key);
        say('Guardian defeated. Recover its relics at the seal.', 4);
      }
      activePortalTrial = null;
      return;
    }
    if (target.spec.portalTrial) {
      if (activePortalTrial?.boss === target && insidePortalTrial(activePortalTrial.site)) {
        settlements.claimed.add('portal-win:' + target.spec.portalTrial);
        say('Seal broken. Return to the Trial Seal to recover the portal component.', 5);
      }
      activePortalTrial = null;
      return;
    }
    if (!target.spec.boss && !target.spec.passive && !target.spec.specimen && !target.spec.summonOnly) {
      settlements.increment('hunt:' + townRegion(target.x, target.y));
      recordPatrol(target.x, target.y);
    }
    // A boss gives up everything it carries, every time. A fight you had to prepare for
    // should not then also be a lottery.
    if (target.spec.bossDrops) {
      const firstClear = !defeatedBosses.has(target.spec.key);
      defeatedBosses.add(target.spec.key);
      const armory = firstClear && worldgen.chapterArmories(seed).find(site => site.boss === target.key);
      for (const entry of target.spec.bossDrops) {
        const [key, count] = Array.isArray(entry) ? entry : [entry, 1];
        const x = target.x + target.width / 2;
        const buried = enemyModule.ARCHETYPES[target.spec.kind].burrows && tiles.isSolid(world.get(Math.floor(x), Math.floor(target.y)));
        dropItem(buried ? state.player.x : x, buried ? state.player.y : target.y, key, craft.kindOf(key), count);
      }
      if (target.key === 'prismsentinel' && world.enableHardmode()) {
        say('Hardmode begins. The Hallow rises and the lower Ossuary seal can be opened.', 6);
      } else if (target.key === 'astralregent') {
        world.enableAstral();
        say('The siege is broken · Lunarium, Solarium and Eventide now form inside planetoids.', 6);
      } else if (target.key === 'railbreaker') {
        say('Railbreaker Drive recovered · Build a Railworks Bench for cargo carts and powered rails.', 6);
      } else if (target.key === 'drownedarchivist') {
        setArchiveArenaWater(false);
        say('Archivist Core recovered · Build a Hydraulic Bench at an Optics Bench.', 6);
      } else if (target.key === 'foundrywarden') {
        say('Foundry Prism recovered · Craft a Refraction Bench at a Heavy Workbench.', 6);
      } else if (target.key === 'starwyvern') {
        say('Wild wyverns now roam Space. Hunt them for essence to craft wings.', 6);
      } else say(target.spec.name + ' is dead', 3.4);
      if (armory) say(armory.name + ' unsealed at x ' + armory.x + ' · New enemies roam the world. See Journal.', 6);
      return;
    }
    const table = RARE_BY_ENEMY[target.key];
    if (!table || !table.length || Math.random() > (target.spec.armoryLootChance || RARE_CHANCE)) return;
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
    } else if (use.campaign) {
      if (dimension !== 'underworld') { say('Bring this to its Underworld campaign altar', 2); return true; }
      const site = worldgen.encounterSiteAt(seed, Math.floor(state.player.x), Math.floor(state.player.y));
      if (site?.encounter.key !== use.summon) { say(spec.text, 3); return true; }
      return startUnderworldCampaignFight(site);
    } else if (use.summon !== undefined) {
      if (!swarm) return true;
      if (expedition) { say('Finish the active expedition first', 2); return true; }
      if (dimension === 'underworld') { say('Challenge local guardians at their seals', 2); return true; }
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
      if (use.runawayMine) {
        const site = worldgen.runawayMineAt(seed, state.player.x, state.player.y);
        if (!site || state.player.y < site.y + 37 || state.player.y >= site.y + 46
          || tiles.tile(world.get(site.x + 13, site.y + 25)).mine === 'flood') {
          say('Use the whistle in the rail arena below the flooded spur', 2.5);
          return true;
        }
        arena = { left: site.x - 42, right: site.x + 43, top: site.y + 29, bottom: site.y + 45 };
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
      if (use.siege) {
        const site = worldgen.siegeAt(seed, state.player.x, state.player.y);
        if (!site || state.player.x < site.x - 10 || state.player.x > site.x + 9
          || Math.abs(state.player.y - (site.y - 3)) > 5) {
          say('Raise the Astral Standard on the middle siege platform', 2.5);
          return true;
        }
        arena = { left: site.x - 35, right: site.x + 35, top: site.y - 27, bottom: site.y - 4 };
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
      state.bloodMoon = dimension !== 'underworld' && worldgen.bloodMoonAt(seed, state.nights, worldRules.bloodMoon);
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
    const power = rod.power * (state.gear?.fishingPower || 1);
    state.bobber = {
      x: pointer.x,
      y: pointer.y,
      tx,
      ty,
      liquid,
      rod: item.key,
      power,
      amount,
      wait: fishModule.biteDelay(Math.random(), power, amount),
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
    if (got.key !== 'junk' && !Object.hasOwn(fishModule.CRATES, got.key)) {
      settlements.record('fish', got.key);
      settlements.record('fish:' + ctx.biome, got.key);
      settlements.increment('daily-fish:' + ctx.biome);
      recordFieldwork('fish', got.key, bobber.tx, bobber.ty, ctx.biome);
    }
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
    if (state.player.cart) physics.dismountMinecart(state.player);
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
    if (spec.foundry || spec.vault || spec.archive || spec.mine || spec.siege || spec.chapterArmory || spec.portalTrial
      || spec.dimensionGate || spec.underworldShrine || spec.underworldCampaign
      || spec.underworldConduit || spec.underworldWaystone || spec.underworldTablet || spec.underworldLock || spec.brineQuest
      || (dimension === 'underworld' && Math.abs(aim.x) <= 3 && aim.y === worldgen.SEA_LEVEL)) {
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
      const bannerKey = aim.x + ':' + aim.y;
      const banner = spec.enemyBanner && enemyBanners.get(bannerKey);
      if (banner) enemyBanners.delete(bannerKey);
      const leaves = banner ? 'banner-' + banner.species : mining.dropsOf(spec);
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
  const combatRhythm = new Map();

  function nextCombatBeat(weapon) {
    if (!weapon.rhythm) return null;
    const index = combatRhythm.get(weapon) || 0;
    combatRhythm.set(weapon, (index + 1) % weapon.rhythm.length);
    const name = weapon.rhythm[index];
    return { name, colour: craft.COMBAT_BEATS[name][0], used: false };
  }

  function applyCombatBeat(beat, target, damage) {
    if (!beat || beat.used || !combatTarget(target) || target.practice) return damage;
    beat.used = true;
    const name = beat.name;
    const player = state.player;
    const x = target.x + target.width / 2, y = target.y + target.height / 2;
    spawnParticles(x, y, beat.colour, 9);
    if (name === 'Break') return Math.round(damage * 1.22);
    if (name === 'Recoil') player.vx -= Math.sign(x - player.x) * 5;
    if (name === 'Launch' && !target.boss) target.vy -= 8;
    if (name === 'Pull' && !target.boss) target.vx += Math.sign(player.x - x) * 9;
    if (name === 'Frost') target.combatChill = Math.max(target.combatChill || 0, target.boss ? 0.18 : 0.65);
    if (name === 'Mend') statsModule.heal(stats, Math.min(4, Math.max(1, Math.round(damage * 0.04))));
    if (name === 'Ward') state.wardUntil = Math.max(state.wardUntil || 0, state.time + 0.28);
    if (name === 'Focus') stats.mana = Math.min(stats.maxMana, stats.mana + 2);
    if (name === 'Pulse' || name === 'Spark') {
      const radius = name === 'Spark' ? 6 : 2.7;
      const victims = swarm.list.filter(enemy => enemy !== target && combatTarget(enemy)
        && Math.hypot(enemy.x + enemy.width / 2 - x, enemy.y + enemy.height / 2 - y) <= radius
        && spiritLine(x, y, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2));
      for (const enemy of victims.slice(0, name === 'Spark' ? 1 : 3)) {
        projectileHit(enemy, Math.max(1, Math.round(damage * 0.3)));
      }
    }
    return damage;
  }

  function shoot(weapon) {
    const quiver = inventory.section('ammo');
    const preferred = inventory.slots.slice(quiver.from, quiver.to).map(slot => slot?.key);
    const ammo = craft.bestAmmo(key => inventory.countOf(key), weapon.ammo, preferred);
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
    const speed = 42 * kind.speed * (gear.arrowSpeed || 1);
    const heading = Math.atan2(dy, dx);
    const spreads = weapon.signature === 'burst' ? [0, -0.025, 0.025] : weapon.scatter
      ? [-1, -0.5, 0, 0.5, 1].map(fraction => fraction * weapon.scatter)
      : weapon.volley ? [-0.14, 0, 0.14] : [0];
    const hitLimit = Math.max(Number(weapon.pierce === true ? 3 : weapon.pierce) || 1, kind.pierce || 1);
    const beat = nextCombatBeat(weapon);
    for (const [index, spread] of spreads.entries()) {
      const burst = weapon.signature === 'burst';
      const scale = burst ? 0.44 : weapon.scatter ? 0.42 : spread ? 0.32 : 1;
      state.arrows.push({ x: cx, y: cy, vx: Math.cos(heading + spread) * speed, vy: Math.sin(heading + spread) * speed,
        damage: Math.round((weapon.damage + kind.bonus) * (gear.ranged || 1) * scale),
        life: weapon.reach / speed, colour: kind.colour, beat,
        gravity: kind.family === 'bullet' ? 0 : kind.family === 'bolt' ? 9 : 26,
        delay: burst ? index * 0.055 : 0, bounces: weapon.signature === 'ricochet' ? 2 : 0,
        burns: kind.burns, shove: kind.shove, hits: hitLimit > 1 ? new Set() : null, hitLimit });
    }
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
    const heading = Math.atan2(dy, dx);
    const rune = weapon.signature === 'rune';
    const beat = nextCombatBeat(weapon);
    for (const spread of weapon.signature === 'spellfan' ? [-0.21, 0, 0.21] : [0]) {
      state.arrows.push({ x: cx, y: cy, vx: Math.cos(heading + spread) * 34, vy: Math.sin(heading + spread) * 34,
        damage: Math.round(weapon.damage * (gear.magic || 1) * (spread ? 0.46 : 1)),
        life: weapon.spell || weapon.signature ? weapon.reach / 34 : 1.8,
        colour: weapon.bolt, gravity: 0, magic: true, spell: weapon.spell, beat,
        seeker: weapon.signature === 'seeker', plant: rune ? 'rune' : null,
        blastRadius: rune ? 4.5 : 0, hits: weapon.spell === 'pierce' ? new Set() : null });
    }
    if (weapon.spell === 'ward') state.wardUntil = state.time + 4;
    spawnParticles(cx, cy, weapon.bolt, 4);
    sfx('cast');
    return true;
  }

  function projectileHit(target, damage, beat, sourceX = state.player.x + state.player.width / 2) {
    if (target.dead) return;
    damage = applyCombatBeat(beat, target, damage);
    if (!swarm.damage(target, bannerDamage(target, damage), sourceX) || target.practice) return;
    if (target.expedition) { target.expeditionDefeated = true; return; }
    for (const [key, count] of target.spec.drops || []) {
      dropItem(target.x, target.y, key, craft.kindOf(key), count);
    }
    if (target.key === 'kingslime') dropMeteor();
    rareDrop(target);
  }

  function throwWeapon(weapon) {
    const player = state.player;
    const x = player.x + player.width / 2, y = player.y + player.height * 0.4;
    const angle = Math.atan2(pointer.y - y, pointer.x - x);
    const style = weapon.throwStyle;
    const speedScale = state.gear?.throwSpeed || 1;
    const speed = (style === 'blast' ? 31 : style === 'pierce' ? 51 : 39) * speedScale;
    const beat = nextCombatBeat(weapon);
    for (const spread of style === 'fan' ? [-0.18, 0, 0.18] : [0]) {
      state.arrows.push({ x, y, vx: Math.cos(angle + spread) * speed, vy: Math.sin(angle + spread) * speed,
        life: weapon.reach / speed, colour: weapon.colour, throwStyle: style, beat, returnSpeed: 49 * speedScale,
        bounces: weapon.signature === 'bank' ? 2 : 0, plant: weapon.signature === 'fuse' ? 'fuse' : null,
        gravity: style === 'blast' ? 24 : 11, blastRadius: 4 * (state.gear?.throwBlast || 1), hitLimit: style === 'pierce' ? 3 : Infinity,
        hits: style === 'pierce' || style === 'returning' ? new Set() : null,
        damage: Math.round(weapon.damage * (state.gear?.thrower || 1) * (spread ? 0.38 : 1)) });
    }
    sfx('swing');
  }

  function burstThrow(a) {
    spawnParticles(a.x, a.y, a.colour, 14);
    for (const enemy of swarm.list) {
      if (enemy.dead || enemy.spec.passive || enemy.spec.specimen) continue;
      const x = enemy.x + enemy.width / 2, y = enemy.y + enemy.height / 2;
      if (Math.hypot(a.x - x, a.y - y) <= a.blastRadius && spiritLine(a.x, a.y, x, y)) {
        projectileHit(enemy, Math.round(a.damage * (a.armed ? 1 : 0.7)), a.beat);
      }
    }
  }

  function combatTarget(enemy) {
    return !enemy.dead && !enemy.spec.passive && !enemy.spec.specimen;
  }

  function steerShot(shot, dt) {
    let nearest = null, distance = 10;
    for (const enemy of swarm.list) {
      if (!combatTarget(enemy)) continue;
      const x = enemy.x + enemy.width / 2, y = enemy.y + enemy.height / 2;
      const d = Math.hypot(x - shot.x, y - shot.y);
      if (d >= distance || !spiritLine(shot.x, shot.y, x, y)) continue;
      nearest = Math.atan2(y - shot.y, x - shot.x);
      distance = d;
    }
    if (nearest === null) return;
    const heading = Math.atan2(shot.vy, shot.vx);
    const difference = Math.atan2(Math.sin(nearest - heading), Math.cos(nearest - heading));
    const angle = heading + Math.max(-4 * dt, Math.min(4 * dt, difference));
    const speed = Math.hypot(shot.vx, shot.vy);
    shot.vx = Math.cos(angle) * speed;
    shot.vy = Math.sin(angle) * speed;
  }

  function updateArrows(dt) {
    for (let i = state.arrows.length - 1; i >= 0; i -= 1) {
      const a = state.arrows[i];
      if (a.delay > 0) { a.delay -= dt; continue; }
      a.life -= dt;
      if (a.armed) {
        const trigger = a.armed === 'rune' && a.life < 1.65 && swarm.list.some(enemy =>
          combatTarget(enemy) && Math.hypot(enemy.x + enemy.width / 2 - a.x, enemy.y + enemy.height / 2 - a.y) < 2.6
          && spiritLine(a.x, a.y, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2));
        if (trigger || a.life <= 0) { burstThrow(a); state.arrows.splice(i, 1); }
        continue;
      }
      if (a.seeker) steerShot(a, dt);
      if (a.returning) {
        const dx = state.player.x + state.player.width / 2 - a.x;
        const dy = state.player.y + state.player.height * 0.4 - a.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 0.7 || a.life <= 0) { state.arrows.splice(i, 1); continue; }
        a.vx = dx / distance * a.returnSpeed;
        a.vy = dy / distance * a.returnSpeed;
      }
      a.vy += (a.gravity === undefined ? 26 : a.gravity) * dt;
      const steps = Math.ceil(Math.hypot(a.vx, a.vy) * dt / 0.3) || 1;
      let hit = false;
      for (let s2 = 0; s2 < steps && !hit; s2 += 1) {
        const previousX = a.x, previousY = a.y;
        a.x += (a.vx * dt) / steps;
        a.y += (a.vy * dt) / steps;
        const solid = tiles.isSolid(world.get(Math.floor(a.x), Math.floor(a.y)));
        if (solid && a.bounces > 0) {
          const horizontal = tiles.isSolid(world.get(Math.floor(a.x), Math.floor(previousY)));
          const vertical = tiles.isSolid(world.get(Math.floor(previousX), Math.floor(a.y)));
          if (horizontal || !vertical) a.vx *= -0.86;
          if (vertical || !horizontal) a.vy *= -0.86;
          a.x = previousX;
          a.y = previousY;
          a.bounces -= 1;
          spawnParticles(a.x, a.y, a.colour, 4);
        } else if (solid && !a.escapeTerrain && !a.returning) {
          a.x = previousX; a.y = previousY;
          hit = true;
        }
        else if (a.hostile) {
          if (!solid) {
            a.escapeTerrain = false;
            if (pointHitsPlayer(a.x, a.y, a.radius || 0)) {
              if (statsModule.damage(stats, a.damage * worldRules.damage) > 0) lastHurt = a.hostile;
              hit = true;
            }
          }
        } else if (a.trap && pointHitsPlayer(a.x, a.y)) {
          if (statsModule.damage(stats, a.damage) > 0) lastHurt = 'a dart trap';
          hit = true;
        } else if (swarm && (!a.returning || !solid)) {
          const target = swarm.at(a.x, a.y);
          if (target && !a.hits?.has(target)) {
            a.hits?.add(target);
            hit = !a.hits || a.hits.size >= (a.hitLimit || 3);
            spawnParticles(a.x, a.y, target.spec.colour, 5);
            if (a.plant) { hit = true; continue; }
            const center = target.x + target.width / 2;
            const sourceX = Math.abs(a.vx) > 0.01 ? center - Math.sign(a.vx) : previousX;
            projectileHit(target, a.damage, a.beat, sourceX);
            if (a.shove && !target.dead && !target.boss) target.vx += Math.sign(a.vx) * a.shove;
            if (a.burns) {
              for (const other of swarm.list) {
                if (other === target || other.dead || other.spec.passive || other.spec.specimen
                  || Math.hypot(other.x - a.x, other.y - a.y) > 2.3
                  || !spiritLine(a.x, a.y, other.x + other.width / 2, other.y + other.height / 2)) continue;
                projectileHit(other, Math.round(a.damage * 0.22));
              }
            }
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
      if (hit || a.life <= 0) {
        if (a.plant) {
          a.armed = a.plant;
          a.plant = null;
          a.life = a.armed === 'rune' ? 1.8 : 0.42;
          a.vx = a.vy = 0;
        } else if (a.throwStyle === 'returning' && !a.returning) {
          a.returning = true;
          a.gravity = 0;
          a.life = 2;
          a.hits.clear();
        } else {
          if (a.throwStyle === 'blast') {
            burstThrow(a);
          }
          state.arrows.splice(i, 1);
        }
      }
    }
  }

  // Swing at an enemy under the cursor. Returns true if something was struck, so mining
  // does not also happen in the same frame.
  let boundFocus = null;
  let nextSpiritStrike = 0;
  let spiritMark = null;

  function spiritLine(x, y, tx, ty) {
    const steps = Math.ceil(Math.hypot(tx - x, ty - y) * 2);
    for (let n = 1; n < steps; n += 1) {
      if (tiles.isSolid(world.get(Math.floor(x + (tx - x) * n / steps),
        Math.floor(y + (ty - y) * n / steps)))) return false;
    }
    return true;
  }

  function stepSpirit() {
    const weapon = craft.WEAPONS[boundFocus];
    const player = state.player;
    if (!weapon || selectedItem()?.key !== boundFocus) {
      state.spirit = null;
      return;
    }
    const x = player.x + player.width / 2 + Math.cos(state.time * 4) * 0.8;
    const y = player.y + 0.3 + Math.sin(state.time * 4) * 0.25;
    const mark = spiritMark && spiritMark.until > state.time && combatTarget(spiritMark.target) ? spiritMark.target : null;
    state.spirit = { x, y, colour: weapon.colour, mark };
    if (state.time < nextSpiritStrike) return;
    nextSpiritStrike = state.time + weapon.useTime * Math.max(0.6, state.gear?.spiritInterval || 1);
    const range = weapon.reach + (state.gear?.spiritReach || 0);
    let target = null, distance = range;
    for (const enemy of swarm.list) {
      if (enemy.dead || enemy.spec.passive || enemy.spec.specimen) continue;
      const ex = enemy.x + enemy.width / 2, ey = enemy.y + enemy.height / 2;
      const d = Math.hypot(ex - x, ey - y);
      if (d > (enemy === mark ? range : distance) || !spiritLine(x, y, ex, ey)) continue;
      if (enemy === mark) { target = enemy; break; }
      distance = d;
      target = enemy;
    }
    if (!target) return;
    const damage = Math.round(weapon.damage * (state.gear?.summoner || 1));
    projectileHit(target, damage, nextCombatBeat(weapon));
    spawnParticles(target.x + target.width / 2, target.y + target.height / 2, weapon.colour, 6);
    if (weapon.summon === 'ward') state.wardUntil = Math.max(state.wardUntil || 0, state.time + 0.25);
    if (weapon.summon === 'twin') projectileHit(target, Math.round(damage * 0.28));
    if (weapon.summon === 'chain' || weapon.summon === 'burst') {
      const radius = weapon.summon === 'chain' ? 7 : 3;
      const nearby = swarm.list.filter(enemy => enemy !== target && !enemy.dead && !enemy.spec.passive
        && !enemy.spec.specimen && Math.hypot(enemy.x - target.x, enemy.y - target.y) <= radius
        && spiritLine(target.x + target.width / 2, target.y + target.height / 2,
          enemy.x + enemy.width / 2, enemy.y + enemy.height / 2));
      for (const enemy of nearby.slice(0, weapon.summon === 'chain' ? 1 : 3)) {
        projectileHit(enemy, Math.round(damage * 0.45));
      }
    }
  }

  function aimedMeleeTarget(weapon, x, y) {
    const heading = Math.atan2(pointer.y - y, pointer.x - x);
    const width = weapon.signature === 'lunge' ? 0.34 : 1.0;
    let target = null, closest = Infinity;
    for (const enemy of swarm.list) {
      if (!combatTarget(enemy)) continue;
      const ex = enemy.x + enemy.width / 2, ey = enemy.y + enemy.height / 2;
      const dx = ex - x, dy = ey - y;
      const distance = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx) - heading;
      if (distance >= closest || Math.cos(angle) < Math.cos(width) || !spiritLine(x, y, ex, ey)) continue;
      closest = distance;
      target = enemy;
    }
    return target;
  }

  function attack() {
    if (swingCooldown > 0) return false;
    const item = selectedItem();
    if (item?.key === 'critter-net') return true;
    const weapon = item ? craft.WEAPONS[item.key] : null;
    if (weapon?.throwStyle) {
      throwWeapon(weapon);
      swingCooldown = swingTotal = weapon.useTime * (state.gear?.swing || 1);
      return true;
    }
    if (weapon?.summon) {
      if (boundFocus !== item.key) {
        boundFocus = item.key;
        spiritMark = null;
        say(weapon.name + ' called', 2);
      }
      const target = swarm.at(pointer.x, pointer.y);
      if (target && combatTarget(target)) spiritMark = { target, until: state.time + 3 };
      return true;
    }
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
    const reach = weapon ? weapon.reach + (state.gear?.meleeReach || 0) : 2.2;
    const cx = state.player.x + state.player.width / 2;
    const cy = state.player.y + state.player.height / 2;
    const signature = weapon?.signature;
    if (signature === 'wave') {
      const angle = Math.atan2(pointer.y - cy, pointer.x - cx);
      state.arrows.push({ x: cx, y: cy, vx: Math.cos(angle) * 27, vy: Math.sin(angle) * 27,
        damage: Math.round(weapon.damage * (state.gear?.melee || 1) * 0.82), life: 0.36,
        colour: weapon.colour || '#efad82', gravity: 0, shockwave: true, beat: nextCombatBeat(weapon), hits: new Set(), hitLimit: 4 });
      swingCooldown = swingTotal = weapon.useTime * (state.gear?.swing || 1);
      sfx('swing');
      return true;
    }
    const target = swarm.at(pointer.x, pointer.y) || (signature ? aimedMeleeTarget(weapon, cx, cy) : null);
    if (!target) {
      if (signature !== 'guard') return false;
      state.wardUntil = Math.max(state.wardUntil || 0, state.time + weapon.useTime * 0.55);
      swingCooldown = swingTotal = weapon.useTime * (state.gear?.swing || 1);
      sfx('swing');
      return true;
    }
    const ex = Math.max(target.x, Math.min(cx, target.x + target.width));
    const ey = Math.max(target.y, Math.min(cy, target.y + target.height));
    if (Math.hypot(ex - cx, ey - cy) > reach + (target.boss && weapon ? 2.5 : 1.5) + (signature === 'lunge' ? 1.5 : 0)) return false;
    if ((target.boss || signature) && !spiritLine(cx, cy, ex, ey)) return false;

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
    if (signature === 'guard') state.wardUntil = Math.max(state.wardUntil || 0, state.time + cooldown * 0.55);
    if (signature === 'lunge') {
      state.player.vx += Math.sign(pointer.x - cx) * 7;
      const dx = pointer.x - cx, dy = pointer.y - cy;
      const length = Math.hypot(dx, dy) || 1;
      for (const other of swarm.list) {
        if (other === target || !combatTarget(other)) continue;
        const ox = other.x + other.width / 2 - cx, oy = other.y + other.height / 2 - cy;
        const along = (ox * dx + oy * dy) / length;
        const across = Math.abs(ox * dy - oy * dx) / length;
        if (along > 0 && along < reach + 1.5 && across < 1.1 && spiritLine(cx, cy, cx + ox, cy + oy)) {
          projectileHit(other, Math.round(hit * 0.55));
        }
      }
    }
    target.vx += Math.sign(target.x - cx) * 6 * (weapon?.knockback || 1);
    target.vy -= 3;
    spawnParticles(target.x, target.y, target.spec.colour, 5);
    if (weapon?.cleave || signature === 'sweep') {
      for (const other of swarm.list.slice()) {
        if (other === target || !combatTarget(other) || Math.hypot(other.x - target.x, other.y - target.y) > 3
          || !spiritLine(cx, cy, other.x + other.width / 2, other.y + other.height / 2)) continue;
        projectileHit(other, Math.round(hit * 0.55));
      }
    }
    hit = applyCombatBeat(weapon && nextCombatBeat(weapon), target, hit);
    if (swarm.damage(target, bannerDamage(target, hit), cx) && !target.practice) {
      if (target.expedition) { target.expeditionDefeated = true; return true; }
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
    boundFocus = null;
    spiritMark = null;
    combatRhythm.clear();
    state.spirit = null;
    state.progress.deaths += 1;
    statsModule.respawn(stats);
    const spot = state.spawn || defaultSpawn();
    if (state.player.cart) physics.dismountMinecart(state.player);
    state.player.x = spot.x;
    state.player.y = spot.y;
    state.player.vx = 0;
    state.player.vy = 0;
    stopExpedition();
    activePortalTrial = null;
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
    if (spec.chest === 'chapter-armory-cache') {
      const site = worldgen.chapterArmoryAt(seed, aim.x, aim.y);
      if (!site || !defeatedBosses.has(site.boss)) {
        say('This cache is bound to the dungeon seal', 2);
        return true;
      }
    }
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
    if (openChest) closeChest();
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
    if (openChest.cargo) cargoItems = openChest.items.filter(Boolean);
    else world.setContainer(openChest.x, openChest.y, openChest.items.filter(Boolean));
    openChest = null;
    ui.closeChest();
  }

  function chestMove(index, toChest) {
    if (!openChest) return;
    if (toChest) {
      // Stow whatever is selected in the hotbar into the first free chest slot.
      const held = selectedItem();
      if (!held || (openChest.cargo && held.key === 'cargo-cart')) return;
      let slot = openChest.items.findIndex(it => it && it.key === held.key
        && it.count < inventoryModule.STACK_MAX);
      if (slot < 0) slot = openChest.items.findIndex(it => !it);
      if (slot < 0) {
        say('Chest is full', 1.0);
        return;
      }
      const moving = Math.min(held.count, inventoryModule.STACK_MAX - (openChest.items[slot]?.count || 0));
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
    const quest = ['guide', 'builder'].includes(who.key) ? () => {
      ui.setOpen(false);
      openRangerTrail();
    } : null;
    ui.openShop(who, { coins: inventory.countOf('coin'), discount: shopDiscount, quest });
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
    const progress = { ...state.progress, marraRescued: dimension === 'underworld' && settlements.claimed.has('marra-rescued'),
      keraRescued: dimension === 'underworld' && settlements.claimed.has('kera-rescued') };
    const available = new Set(villagerModule.eligible(progress).map(v => v.key));
    const actions = [{ label: 'Campaign', run: openCampaign }, { label: 'Progression Journal', run: openProgression },
      { label: 'Town Contracts', run: openTownOrders }, { label: 'Quest Board', run: openQuestBoard }, { label: 'Bestiary', run: openBestiary },
      { label: 'Field Journal', run: openFieldJournal }, { label: 'Town directory', run: openTownDirectory },
      { label: 'A Road Through the Deepwood', run: openRangerTrail }];
    const pylon = nearestTown(x, y, device => physics.aimTile(state.player, device).inReach, 8);
    if (pylon) actions.push({ label: 'Local Settlement', run: () => openSettlement(pylon) });
    if (world.astral) actions.push({ label: 'Astral Expeditions', run: openExpeditions });
    for (const spec of villagerModule.VILLAGERS) {
      if (spec.region && (dimension !== 'underworld' || worldgen.biomeAt(seed, Math.floor(x)).key !== spec.region)) continue;
      const housed = village.list.some(v => v.key === spec.key);
      if (!housed && !available.has(spec.key)) {
        rows.push(spec.name + ' ' + spec.wantsText + '.');
      } else if (room.valid && !occupant) {
        actions.push({ label: (housed ? 'Move ' : 'Invite ') + spec.name, run() {
          if (!physics.aimTile(state.player, { x, y }).inReach) return;
          const result = village.settle(progress, x, y, spec.key);
          if (result.moved) say(spec.name + ' has moved in', 3);
          checkHousing();
        } });
      }
    }
    rows.push('Build a Town Pylon near two occupied homes to found a regional outpost and link other settlements.');
    ui.showTown('Town Hall', rows, actions);
  }

  const rangerRepairs = [['oakwood', 12], ['torch', 4], ['glass', 2]];
  const rangerStock = [['oakwood', 40, 30], ['oakback', 60, 36], ['rope', 25, 55],
    ['torch', 25, 45], ['town-pylon', 1, 340]];
  const rangerPayout = [['storage-crafter', 1], ['minecart-rail', 24], ['coin', 300]];

  function rangerCampFor(device) {
    const spacing = worldgen.BIOME_SITE_SPACING;
    const slot = Math.floor(device.x / spacing);
    let closest = null;
    for (const index of new Set([0, ...Array.from({ length: 15 }, (_, i) => slot + i - 7)])) {
      const camp = worldgen.biomeSitesForSlot(seed, index)?.[0];
      if (camp?.biome === 'forest' && (!closest || Math.abs(camp.x - device.x) < Math.abs(closest.x - device.x))) {
        closest = camp;
      }
    }
    return closest && { x: closest.x, y: closest.top + closest.height - 2 };
  }

  function rangerFixtures(camp) {
    return [{ x: camp.x - 3, y: camp.y, key: 'lantern' }, { x: camp.x + 3, y: camp.y, key: 'oakbench' }];
  }

  function rangerCampIntact(camp) {
    return rangerFixtures(camp).every(part => world.get(part.x, part.y) === tiles.idOf(part.key));
  }

  function rangerNextRegion(device) {
    for (let distance = 128; distance <= 4096; distance += 64) {
      for (const direction of [1, -1]) {
        const x = device.x + direction * distance;
        const region = worldgen.biomeAt(seed, x);
        if (['forest', 'ocean'].includes(region.key) || worldgen.biomeAt(seed, x + direction * 24).key !== region.key) continue;
        return { x, name: region.name };
      }
    }
    return null;
  }

  function openRangerTrail() {
    if (dimension === 'underworld') { openUnderworldJournal(); return; }
    input.left = input.right = input.jump = input.down = false;
    const trail = settlements.rangerTrail;
    const player = state.player;
    const x = Math.floor(player.x + player.width / 2), y = Math.floor(player.y + player.height / 2);
    const rows = [];
    const actions = [{ label: 'Town Hall', run: checkHousing }];
    const reach = point => physics.aimTile(player, point).inReach;
    const pylon = nearestTown(x, y, device => reach(device) && townHomes(device) >= 2 &&
      (settlements.town(device)?.region || townRegion(device.x, device.y)) === 'forest', 8);

    if (!trail.started) {
      rows.push('Guide · “Start with two furnished homes here in the Deepwood. Stand inside each room and press H to invite a resident. I’m available first, and the Builder moves in after ten smelted bars.”',
        'Builder · “I’ll supply the first pylon and a little rope when both rooms are occupied.”');
      if (townRegion(x, y) === 'forest' && village.nearbyHomes(x, y, PYLON_RADIUS) >= 2) {
        actions.push({ label: 'Accept the Builder’s starter pylon', run() {
          if (trail.started || village.nearbyHomes(x, y, PYLON_RADIUS) < 2 || !reach({ x, y })) return;
          const reward = pylon ? [['rope', 15], ['torch', 12]] : [['town-pylon', 1], ['rope', 15], ['torch', 12]];
          if (!townExchange([], reward)) return;
          trail.started = true;
          openRangerTrail();
        } });
      }
    } else if (!trail.town) {
      rows.push('Builder · “Put the pylon within 45 tiles of both homes. Use its supplies to found a Ranger Outpost.”',
        'Return here beside the outpost pylon once it is founded. An existing Deepwood outpost also works.');
      if (pylon && settlements.town(pylon)) {
        actions.push({ label: 'Choose this Ranger Outpost', run() {
          if (trail.town || !reach(pylon) || deviceAt(pylon.x, pylon.y) !== pylon || townHomes(pylon) < 2) return;
          const camp = rangerCampFor(pylon);
          if (!camp) { say('No Ranger Camp could be found', 2.5); return; }
          trail.town = settlementModule.settlementKey(pylon);
          trail.camp = camp;
          openRangerTrail();
        } });
      }
    } else {
      const source = townPylons().find(device => settlementModule.settlementKey(device) === trail.town);
      const camp = trail.camp;
      const atCamp = Math.abs(x - camp.x) <= 8 && Math.abs(y - camp.y) <= 3;
      const sourceActive = source && settlements.town(source)?.rank >= 2 && townHomes(source) >= 2;
      rows.push('Ranger Camp · x ' + camp.x + ', y ' + camp.y);
      if (!trail.restored || !rangerCampIntact(camp)) {
        rows.push('Builder · “Relight the camp and install a timber supply counter. Bring ' + townItems(rangerRepairs) + '.”');
        if (atCamp && reach(camp)) actions.push({ label: 'Restore the Ranger Camp', run() {
          if (!reach(camp)) return;
          const parts = rangerFixtures(camp);
          if (parts.some(part => {
            const id = world.get(part.x, part.y);
            return id !== tiles.AIR && id !== tiles.idOf(part.key);
          })) {
            say('Clear the two fixture tiles three blocks to either side of the camp marker', 4);
            return;
          }
          if (trail.restored && rangerCampIntact(camp)) return;
          if (!townExchange(rangerRepairs, [])) return;
          for (const part of parts) world.set(part.x, part.y, tiles.idOf(part.key));
          trail.restored = true;
          const site = worldgen.biomeSiteAt(seed, camp.x, camp.y);
          if (site) settlements.record('survey', siteMark(site));
          say('The Ranger Camp is lit. Its supply counter is open.', 4);
          openRangerTrail();
        } });
      } else {
        rows.push('Supply counter open · Use the timber bench under the camp roof.');
        if (atCamp && reach(rangerFixtures(camp)[1])) actions.push({ label: 'Ranger Supply Counter', run: openRangerCounter });
      }

      if (trail.completed) rows.push('Guide · “Two towns, one trade road. The Deepwood has neighbours again.”');
      else if (trail.deliveredTo) {
        rows.push('Builder · “The first shipment arrived. Collect a storage terminal and rails to keep the route running.”');
        if (sourceActive && reach(source)) actions.push({ label: 'Collect the trade road reward', run() {
          if (trail.completed || !reach(source) || deviceAt(source.x, source.y) !== source || townHomes(source) < 2) return;
          if (!townExchange([], rangerPayout)) return;
          trail.completed = true;
          openRangerTrail();
        } });
        else rows.push('Claim the reward at your original Deepwood charter pylon · ' + trail.town.replace(':', ', ') + '.');
      } else if (trail.restored && !sourceActive) {
        rows.push('Guide · “Return to your outpost and charter it from the pylon. Restoring the camp counts as its field assignment.”',
          'Original Deepwood pylon · ' + trail.town.replace(':', ', '));
      } else if (trail.restored) {
        rows.push('Guide · “Use your second pylon to found and charter a town in a different region. Keep two occupied homes at each end.”',
          'Builder · “Pack a shipment at your original Deepwood pylon and deliver it at the partner pylon.”');
        const next = rangerNextRegion(source);
        if (next) rows.push('Suggested second site · ' + next.name + ' around x ' + next.x + '.');
        const partners = charterRegions();
        if ([...partners].some(region => region !== 'forest')) rows.push('Trade route ready · Return to your original Deepwood pylon to pack a shipment.');
      }
    }
    ui.showTown('A Road Through the Deepwood', rows, actions);
  }

  function openRangerCounter() {
    const trail = settlements.rangerTrail;
    if (!trail.restored || !rangerCampIntact(trail.camp)) return;
    const bench = rangerFixtures(trail.camp)[1];
    if (!physics.aimTile(state.player, bench).inReach) return;
    input.left = input.right = input.jump = input.down = false;
    const actions = rangerStock.map(([key, count, price]) => ({
      label: 'Buy ' + townItems([[key, count]]) + ' · ' + price + ' coin',
      run() {
        if (rangerCampIntact(trail.camp) && physics.aimTile(state.player, bench).inReach) {
          townExchange([['coin', price]], [[key, count]]);
        }
      }
    }));
    actions.push({ label: 'Deepwood questline', run: openRangerTrail });
    ui.showTown('Ranger Supply Counter', ['The Builder keeps building supplies and spare pylons here.'], actions);
  }

  function useRangerCounter(aim) {
    const trail = settlements.rangerTrail;
    if (!trail.restored) return false;
    const bench = rangerFixtures(trail.camp)[1];
    if (aim.x !== bench.x || aim.y !== bench.y || world.get(bench.x, bench.y) !== tiles.idOf(bench.key)) return false;
    if (rangerCampIntact(trail.camp)) openRangerCounter();
    else say('Relight the camp from the Deepwood questline', 2.5);
    return true;
  }

  function townRegion(x, y) {
    const layer = worldgen.layerAt(y).key;
    return dimension === 'underworld' || layer === 'surface' ? world.biomeAt(Math.floor(x), Math.floor(y)).key : layer;
  }

  function townRegionName(region) {
    return worldgen.LAYERS.find(layer => layer.key === region)?.name
      || worldgen.BIOMES.find(biome => biome.key === region)?.name || region;
  }

  function townPylons() {
    return townDevices.filter(device => device.type === 'pylon' && deviceAt(device.x, device.y) === device);
  }

  function townHomes(device) {
    return village.nearbyHomes(device.x, device.y, PYLON_RADIUS);
  }

  function charterRegions() {
    return settlements.charterRegions(townPylons(), townHomes);
  }

  function nearestTown(x, y, accepts, range) {
    let best = null;
    for (const device of townPylons()) {
      const distance = Math.hypot(device.x - x, device.y - y);
      if (distance > range || !accepts(device)) continue;
      best = device;
      range = distance;
    }
    return best;
  }

  function recordFieldwork(job, id, x, y, region = townRegion(x, y)) {
    const device = nearestTown(x, y, candidate => {
      const local = settlements.town(candidate);
      return local?.rank === 1 && local.region === region
        && settlementModule.settlementJob(region) === job
        && settlements.progress(local) < settlementModule.JOBS[job].goal && townHomes(candidate) >= 2;
    }, 1600);
    if (device && settlements.mark(settlements.town(device), job, id)) {
      say(settlementModule.settlementRole(region).name + ' fieldwork complete', 3);
    }
  }

  function recordTownCraft(recipe) {
    if (recipe.out.kind === 'bar') {
      state.progress.bars += recipe.out.count;
      if (['lunarium-bar', 'solarium-bar', 'eventide-bar'].includes(recipe.out.key)) {
        settlements.record('campaign-astral', recipe.out.key);
      }
    }
    const key = recipe.out.key;
    settlements.record('craft:' + key, key);
    if (craft.ITEMS[key]?.use?.meal || key === 'cooked-fish' || key === 'seared-fish') settlements.record('food', key);
    if (tiles.BY_KEY[key]?.circuit) settlements.record('mechanism', key);
  }

  function recordPatrol(x, y) {
    const region = townRegion(x, y);
    if (settlementModule.settlementJob(region) === 'hunt') {
      recordFieldwork('hunt', null, x, y, region);
      return;
    }
    const job = settlementModule.settlementJob(region);
    if (job !== 'survey' && job !== 'repair') return;
    const device = nearestTown(x, y, candidate => {
      const local = settlements.town(candidate);
      return local?.rank === 1 && local.region === region && local.kills < 6
        && settlements.progress(local) < settlementModule.JOBS[job].goal && townHomes(candidate) >= 2;
    }, 1600);
    if (device) {
      const local = settlements.town(device);
      if (!nextLandmark(device, local)) local.kills += 1;
    }
  }

  function townExchange(needs, rewards) {
    const result = villagerModule.completeTownOrder(inventory, { needs, rewards }, craft.kindOf);
    if (result === 'missing') say('Missing supplies', 2);
    if (result === 'full') say('Make room for the reward', 2);
    if (result === 'complete') ui.sync(state);
    return result === 'complete';
  }

  function townItems(items) {
    return items.map(([key, count]) => craft.nameOf(key, tiles) + ' ×' + count).join(', ');
  }

  function siteMark(site) {
    return site.x + ':' + site.top;
  }

  function nextLandmark(device, local) {
    const spacing = worldgen.BIOME_SITE_SPACING;
    const slot = Math.floor(device.x / spacing);
    let best = null, distance = Infinity;
    for (let offset = -11; offset <= 11; offset += 1) {
      for (const site of worldgen.biomeSitesForSlot(seed, slot + offset) || []) {
        if (site.biome !== local.region || local.marks.includes(siteMark(site))) continue;
        const d = Math.hypot(site.x - device.x, site.top - device.y);
        if (d < distance && d <= 1580) { best = site; distance = d; }
      }
    }
    return best;
  }

  function usableCharter(device, homes = 2) {
    return device && deviceAt(device.x, device.y) === device && settlements.town(device)?.rank >= 2
      && physics.aimTile(state.player, device).inReach && townHomes(device) >= homes;
  }

  function residentAt(device, key) {
    const resident = village.list.find(entry => entry.key === key);
    return !!resident && Math.hypot(resident.home.x - device.x, resident.home.y - device.y) <= PYLON_RADIUS
      && village.survey(resident.home.x, resident.home.y + 0.72).occupant === resident;
  }

  function openTownDirectory() {
    input.left = input.right = input.jump = input.down = false;
    const rows = [dimension === 'underworld' ? 'Underworld charters' : 'Overworld charters',
      'Build towns in distinct regions to start new trade routes. A charter needs two occupied homes to stay active.'];
    const actions = [{ label: 'Town Hall', run: checkHousing }];
    const pylons = townPylons();
    for (const device of pylons) {
      const local = settlements.town(device);
      const region = local?.region || townRegion(device.x, device.y);
      const homes = townHomes(device);
      const routes = pylons.filter(other => other !== device && settlements.route(
        settlementModule.settlementKey(device), settlementModule.settlementKey(other))).length;
      rows.push(settlementModule.settlementRole(region).name + ' · ' + townRegionName(region) + ' · Rank '
        + (local?.rank || 0) + ' · ' + homes + ' homes · ' + routes + ' routes · x ' + device.x + ', y ' + device.y);
      if (physics.aimTile(state.player, device).inReach) actions.push({
        label: 'Manage town at x ' + device.x, run: () => openSettlement(device)
      });
    }
    ui.showTown('Town Directory', rows, actions);
  }

  function openCivicProjects(device) {
    const local = settlements.town(device);
    if (!local) return;
    const townId = settlementModule.settlementKey(device);
    const rows = ['Build the listed station near the pylon and contribute supplies. Each project pays once per town.'];
    const actions = [{ label: 'Local Settlement', run: () => openSettlement(device) }];
    const canBuild = station => craft.stationsNear(world, tiles, device.x, device.y).has(station);
    for (const [id, name, station, needs, reward] of settlementModule.townProjects(local.region)) {
      const key = 'civic:' + townId + ':' + id;
      const complete = settlements.claimed.has(key);
      rows.push(name + ' · ' + (complete ? 'Complete' : townItems(needs) + ' · Requires ' + craft.nameOf(station, tiles)
        + ' · Reward ' + townItems(reward)));
      const staffed = () => local.region !== 'ember-bloom' || residentAt(device, 'kera');
      if (!complete && !staffed()) rows.push('House Kera near this charter to commission its forge projects.');
      if (!complete) actions.push({ label: 'Commission ' + name, run() {
        if (!usableCharter(device) || !staffed() || settlements.claimed.has(key)) return;
        if (!canBuild(station)) { say('Place ' + craft.nameOf(station, tiles) + ' beside the pylon', 3); return; }
        if (townExchange(needs, reward)) {
          settlements.claimed.add(key);
          openCivicProjects(device);
        }
      } });
    }
    const hasRoute = () => townPylons().some(partner => partner !== device && townHomes(partner) >= 2
      && settlementModule.tradeRank(settlements.route(townId, settlementModule.settlementKey(partner))) >= 2);
    const built = () => settlementModule.townProjects(local.region).every(([id]) => settlements.claimed.has('civic:' + townId + ':' + id));
    rows.push(local.rank >= 4 ? 'Civic Center chartered' : 'Civic Center · Rank 3, four homes, both projects, and a reciprocal trade route.');
    if (local.rank === 3) actions.push({ label: 'Charter Civic Center', run() {
      if (!usableCharter(device, 4) || !built() || !hasRoute() || local.rank !== 3) {
        say('A Civic Center needs four homes, both projects, and a reciprocal route', 3);
        return;
      }
      if (townExchange([], [['town-pylon', 1], ['storage-crafter', 1], ['coin', 1200]])) {
        local.rank = 4;
        openCivicProjects(device);
      }
    } });
    if (local.rank >= 4) {
      const day = Math.max(0, state.nights - (wasNight ? 1 : 0));
      const [[key, count]] = settlementModule.settlementRole(local.region).stock;
      rows.push('Public storehouse · One ration of ' + townItems([[key, count]]) + ' each in-game day while staffed.');
      if (local.lastCivicRation !== day) actions.push({ label: 'Collect daily public ration', run() {
        const today = Math.max(0, state.nights - (wasNight ? 1 : 0));
        if (!usableCharter(device, 4) || !hasRoute() || local.lastCivicRation === today) return;
        if (townExchange([], [[key, count]])) {
          local.lastCivicRation = today;
          openCivicProjects(device);
        }
      } });
    }
    ui.showTown('Civic Projects', rows, actions);
  }

  function openTradePartnerships(device) {
    const local = settlements.town(device);
    if (!local) return;
    const townId = settlementModule.settlementKey(device);
    const rows = ['Deliver shipments to establish a route. Send cargo in both directions to reach rank 2 after three deliveries and rank 3 after six.'];
    const actions = [{ label: 'Local Settlement', run: () => openSettlement(device) }];
    for (const partner of townPylons()) {
      const other = settlements.town(partner);
      if (partner === device || other?.rank < 2 || !other || other.region === local.region) continue;
      const partnerId = settlementModule.settlementKey(partner);
      const route = settlements.route(townId, partnerId);
      const rank = settlementModule.tradeRank(route);
      const name = townRegionName(other.region);
      rows.push(name + ' at x ' + partner.x + ' · Rank ' + rank + ' · ' + (route?.delivered || 0)
        + ' deliveries · ' + (townHomes(partner) >= 2 ? 'Active' : 'Partner needs two homes'));
      if (rank >= 2) {
        const [key, count, price] = settlementModule.settlementRole(other.region).stock[rank - 1];
        const cost = Math.ceil(price * (rank === 3 ? 0.8 : 0.95));
        actions.push({ label: 'Import ' + townItems([[key, count]]) + ' from ' + name + ' · ' + cost + ' coin', run() {
          if (!usableCharter(device) || deviceAt(partner.x, partner.y) !== partner || townHomes(partner) < 2) return;
          townExchange([['coin', cost]], [[key, count]]);
        } });
      }
      if (rank >= 1 && local.region === 'ember-bloom' && other.region === 'brine-depths') {
        actions.push({ label: 'Import Brine Cooling Salt ×3 · 360 coin', run() {
          if (usableCharter(device) && deviceAt(partner.x, partner.y) === partner && townHomes(partner) >= 2) {
            townExchange([['coin', 360]], [['brine-cooling-salt', 3]]);
          }
        } });
      }
    }
    ui.showTown('Trade Partnerships', rows, actions);
  }

  function openEmberTown(device) {
    if (dimension !== 'underworld') return;
    const crucible = worldgen.dungeonSite(seed, tiles.UNDERWORLD_DUNGEONS.find(encounter => encounter.key === 'furnace-mycelium'));
    const rows = ['Spore Crucible entrance · x ' + crucible.x + ', y ' + crucible.entrance + '.',
      'Defeat Furnace Mycelium and release Kera from her cell. House her near a chartered pylon in Emberbloom.',
      'Commission the Banked Kiln for an Ember Forge. Deliver a shipment from Brine Depths to receive cooling salt for the five class weapons.'];
    const actions = [{ label: 'Underworld journal', run: openUnderworldJournal }, { label: 'Town directory', run: openTownDirectory }];
    if (settlements.claimed.has('kera-rescued')) rows.push('Kera rescued');
    if (usableCharter(device) && settlements.town(device).region === 'ember-bloom') {
      actions.push({ label: 'Civic projects', run: () => openCivicProjects(device) },
        { label: 'Trade partnerships', run: () => openTradePartnerships(device) });
    }
    ui.showTown('Emberbloom Forge Town', rows, actions);
  }

  function openSettlement(device) {
    const local = settlements.town(device);
    const region = local?.region || townRegion(device.x, device.y);
    const role = settlementModule.settlementRole(region);
    const residents = townHomes(device);
    const job = settlementModule.settlementJob(region);
    const work = settlementModule.JOBS[job];
    const partners = charterRegions();
    const rows = [townRegionName(region) + ' · ' + residents + ' occupied homes · Rank ' + (local?.rank || 0),
      partners.size + ' distinct active charter regions in the network.',
      'Supply counters and fieldwork need two valid homes. A district needs three.'];
    const actions = [{ label: 'Pylon Network', run: () => openPylon(device) },
      { label: 'Field Journal', run: openFieldJournal }, { label: 'Quest Board', run: () => openQuestBoard(device) },
      { label: 'Town directory', run: openTownDirectory }];
    if (dimension === 'underworld' && region === 'brine-depths') {
      actions.push({ label: 'Tidekeeper’s Landing', run: () => openBrineQuest(device) });
    }
    if (dimension === 'underworld' && region === 'ember-bloom') {
      actions.push({ label: 'Emberbloom Forge Town', run: () => openEmberTown(device) });
    }
    if (region === 'forest') actions.push({ label: 'A Road Through the Deepwood', run: openRangerTrail });
    const canUse = (homes = 2) => deviceAt(device.x, device.y) === device
      && physics.aimTile(state.player, device).inReach && townHomes(device) >= homes;
    if (residents < 2) {
      rows.push('Build and assign two furnished homes within 45 tiles of this pylon.');
    } else if (!local) {
      const crowded = townPylons().some(other => other !== device && settlements.town(other)
        && Math.hypot(other.x - device.x, other.y - device.y) < PYLON_RADIUS * 2);
      if (crowded) rows.push('Place the pylon at least 90 tiles from the nearest founded town.');
      else actions.push({ label: 'Found outpost · ' + townItems(role.supplies), run() {
        if (!canUse() || settlements.town(device)) return;
        if (townExchange(role.supplies, []) && settlements.found(device, region)) {
          say(role.name + ' founded', 3);
          openSettlement(device);
        }
      } });
    } else {
      if (local.rank === 1) {
        const progress = settlements.progress(local);
        rows.push('Fieldwork · ' + work.text + ' ' + progress + ' / ' + work.goal);
        if (job === 'survey' || job === 'repair') {
          const site = nextLandmark(device, local);
          if (site) rows.push('Nearest assignment · ' + site.name + ' · x ' + site.x + ', y ' + (site.top + site.height - 2));
          else rows.push('No landmark in range. Complete the alternate regional patrol instead.');
          if (!site) {
            rows.push('Patrol · ' + local.kills + ' / 6 wild hostiles defeated.');
          }
        }
        const restoredCamp = settlements.rangerTrail.restored
          && settlements.rangerTrail.town === settlementModule.settlementKey(device);
        if (restoredCamp) rows.push('The restored Ranger Camp completes this outpost’s field assignment.');
        if (progress >= work.goal || local.kills >= 6 || restoredCamp) {
          actions.push({ label: 'Charter this town · receive a pylon and 250 coin', run() {
            if (!canUse() || local.rank !== 1) return;
            if (townExchange([], [['town-pylon', 1], ['coin', 250]])) {
              local.rank = 2;
              openSettlement(device);
            }
          } });
        }
      }
      if (local.rank === 2) {
        const station = craft.nameOf(role.station, tiles);
        rows.push('District upgrade · House three residents and place a ' + station + ' beside this pylon.');
        actions.push({ label: 'Open a district workshop', run() {
          if (!canUse(3) || local.rank !== 2 || !craft.stationsNear(world, tiles, device.x, device.y).has(role.station)) {
            say('The district needs three homes and a ' + station + ' nearby', 3);
            return;
          }
          if (townExchange([], [['storage-access', 1], ['coin', 400]])) {
            local.rank = 3;
            openSettlement(device);
          }
        } });
      }
      if (local.rank >= 3) rows.push(residents >= 3
        ? 'District workshop active · preferred prices and all regional stock.'
        : 'District needs its third resident to restore preferred prices and stock.');
      const discount = Math.max(0.55, 1 - (local.rank >= 3 && residents >= 3 ? 0.18 : 0)
        - Math.max(0, partners.size - 1) * 0.08);
      for (const [key, count, price] of role.stock.slice(0, residents < 3 ? Math.min(2, local.rank) : local.rank)) {
        const cost = Math.ceil(price * discount);
        actions.push({ label: 'Buy ' + townItems([[key, count]]) + ' · ' + cost + ' coin', run() {
          if (canUse()) townExchange([['coin', cost]], [[key, count]]);
        } });
      }
      if (local.rank >= 2) {
        actions.push({ label: 'Civic projects', run: () => openCivicProjects(device) },
          { label: 'Trade partnerships', run: () => openTradePartnerships(device) });
      }
      if (local.rank >= 2 && partners.size >= 2) {
        rows.push('Trade shipment · Pack one shipment per town per day. Deliver it at a partner pylon.');
        const delivery = role.supplies[local.deliveries % role.supplies.length];
        if (local.lastDelivery < state.nights && !settlements.shipment) {
          for (const partnerRegion of partners) {
            if (partnerRegion === region) continue;
            const partner = nearestTown(device.x, device.y, candidate => {
              const other = settlements.town(candidate);
              return other?.rank >= 2 && other.region === partnerRegion && townHomes(candidate) >= 2;
            }, Infinity);
            if (!partner) continue;
            const destination = townRegionName(partnerRegion) + ' at x ' + partner.x;
            actions.push({ label: 'Pack shipment to ' + destination + ' · ' + townItems([delivery]), run() {
              if (!canUse() || settlements.shipment || local.lastDelivery >= state.nights
                || deviceAt(partner.x, partner.y) !== partner || townHomes(partner) < 2) return;
              if (!townExchange([delivery], [])) return;
              settlements.shipment = { from: settlementModule.settlementKey(device), to: settlementModule.settlementKey(partner), cargo: delivery };
              local.lastDelivery = state.nights;
              local.deliveries += 1;
              say('Shipment packed for ' + destination, 3);
              openSettlement(device);
            } });
          }
        }
      }
      const shipment = settlements.shipment;
      if (shipment?.to === settlementModule.settlementKey(device) && local.rank >= 2) {
        actions.push({ label: 'Deliver shipment · 420 coin and regional supplies', run() {
          if (!canUse() || settlements.shipment !== shipment) return;
          const [key, count] = role.stock[0];
          const route = settlements.route(shipment.from, shipment.to);
          const tier = settlementModule.tradeRank(route);
          const from = townPylons().find(pylon => settlementModule.settlementKey(pylon) === shipment.from);
          const forgeRoute = dimension === 'underworld' && settlements.town(from || {})?.region === 'brine-depths'
            && local.region === 'ember-bloom';
          const reward = [['coin', 420 + tier * 120], [key, count]];
          if (forgeRoute) reward.push(['brine-cooling-salt', 3 + tier]);
          if (townExchange([], reward)) {
            if (shipment.from !== shipment.to) settlements.recordDelivery(shipment.from, shipment.to);
            const trail = settlements.rangerTrail;
            if (trail.restored && !trail.deliveredTo && shipment.from === trail.town && local.region !== 'forest') {
              trail.deliveredTo = shipment.to;
              say('First Deepwood shipment delivered. Collect the reward at the original pylon.', 4);
            }
            settlements.shipment = null;
            openSettlement(device);
          }
        } });
      }
      const origin = shipment && townPylons().find(pylon => settlementModule.settlementKey(pylon) === shipment.from);
      const ownShipment = shipment?.from === settlementModule.settlementKey(device);
      if (shipment && (ownShipment || !origin && local.rank >= 2)) {
        rows.push(ownShipment ? 'Shipment awaiting delivery at pylon ' + shipment.to.replace(':', ', ') + '.'
          : 'The origin pylon was removed. Recover the stranded shipment here.');
        actions.push({ label: 'Unpack shipment and recover supplies', run() {
          if (!canUse() || settlements.shipment !== shipment || (!ownShipment
            && townPylons().some(pylon => settlementModule.settlementKey(pylon) === shipment.from))) return;
          if (townExchange([], [shipment.cargo])) {
            settlements.shipment = null;
            openSettlement(device);
          }
        } });
      }
    }
    ui.showTown(role.name, rows, actions);
  }

  function openFieldJournal() {
    input.left = input.right = input.jump = input.down = false;
    const player = state.player;
    const x = Math.floor(player.x + player.width / 2), y = Math.floor(player.y + player.height / 2);
    const site = worldgen.biomeSiteAt(seed, x, y);
    const regions = charterRegions();
    const rows = ['Collections track distinct catches, exhibits, dishes, mechanisms and sites in this world.',
      'Claims are available beside any active charter pylon.',
      'Charter regions · ' + ([...regions].map(townRegionName).join(', ') || 'None')];
    const actions = [{ label: 'Town Hall', run: checkHousing },
      { label: 'Campaign', run: openCampaign }, { label: 'A Road Through the Deepwood', run: openRangerTrail }];
    if (site) {
      const id = siteMark(site);
      rows.push('Current landmark · ' + site.name);
      actions.push({ label: 'Survey ' + site.name, run() {
        if (!physics.aimTile(player, { x, y }).inReach) return;
        const fresh = settlements.record('survey', id);
        settlements.record('survey:' + site.biome, id);
        recordFieldwork('survey', id, x, y, site.biome);
        if (fresh) say(site.name + ' recorded', 2);
        openFieldJournal();
      } });
      const repair = nearestTown(x, y, device => {
        const local = settlements.town(device);
        return local?.region === site.biome && local.rank === 1 && settlementModule.settlementJob(local.region) === 'repair'
          && settlements.progress(local) === 0 && townHomes(device) >= 2;
      }, 1600);
      if (repair) actions.push({ label: 'Restore landmark · install a lantern for 4 torches and 2 glass', run() {
        if (!physics.aimTile(player, { x, y }).inReach || world.get(x, y) !== tiles.AIR) {
          say('Stand in a clear tile inside the landmark', 2);
          return;
        }
        if (!townExchange([['torch', 4], ['glass', 2]], [])) return;
        world.set(x, y, tiles.idOf('lantern'));
        settlements.record('survey', id);
        settlements.record('survey:' + site.biome, id);
        recordFieldwork('repair', id, x, y, site.biome);
        openFieldJournal();
      } });
    }
    const charter = nearestTown(x, y, device => settlements.town(device)?.rank >= 2
      && townHomes(device) >= 2 && physics.aimTile(player, device).inReach, 8);
    const canClaim = () => charter && deviceAt(charter.x, charter.y) === charter
      && physics.aimTile(player, charter).inReach && townHomes(charter) >= 2;
    function showGoal(goal, count, id) {
      rows.push(goal.name + ' · ' + Math.min(count, goal.goal) + ' / ' + goal.goal
        + (settlements.claimed.has(id) ? ' · Claimed' : ' · ' + townItems(goal.reward)));
      if (!charter || count < goal.goal || settlements.claimed.has(id)) return;
      actions.push({ label: 'Claim ' + goal.name, run() {
        if (settlements.claimed.has(id) || !canClaim()) return;
        if (townExchange([], goal.reward)) {
          settlements.claimed.add(id);
          openFieldJournal();
        }
      } });
    }
    for (const goal of settlementModule.MILESTONES) showGoal(goal, settlements.count(goal.key), goal.key + ':' + goal.goal);
    for (const goal of settlementModule.NETWORK) showGoal(goal, regions.size, 'network:' + goal.goal);
    for (const [index, reward] of settlements.prizes) {
      const name = settlementModule.EXPEDITIONS[index].name;
      rows.push(name + ' reward ready · ' + townItems(reward));
      if (charter) actions.push({ label: 'Claim ' + name + ' reward', run() {
        if (!canClaim() || settlements.prizes.get(index) !== reward) return;
        if (townExchange([], reward)) {
          settlements.prizes.delete(index);
          openFieldJournal();
        }
      } });
    }
    if (world.astral) actions.push({ label: 'Astral Expeditions', run: openExpeditions });
    ui.showTown('Field Journal', rows, actions);
  }

  function openExpeditions() {
    const partners = charterRegions().size;
    const site = worldgen.siegeLayout(seed);
    const rows = ['Return to the middle Astral Siege platform at x ' + site.x + ', y ' + (site.y - 4) + '.',
      'Defeat three bosses before time runs out. Leaving the arena, dying or quitting ends the run.',
      'Each active charter region improves the payout. The harder runs require two and three regions.',
      'Claim completed runs from the Field Journal at any active charter pylon.'];
    const actions = [{ label: 'Field Journal', run: openFieldJournal }, { label: 'Quest Board', run: openQuestBoard }];
    for (const [index, contract] of settlementModule.EXPEDITIONS.entries()) {
      const record = settlements.records.get(index);
      rows.push(contract.name + ' · ' + contract.seconds + 's · ' + contract.bosses
        .map(key => enemyModule.BY_KEY[key].name).join(' → ')
        + (record ? ' · Best ' + record.best + 's · ' + record.clears + ' clears' : ''));
      rows.push(contract.rule);
      if (partners < index + 1) rows.push('Requires ' + (index + 1) + ' active charter regions.');
      else if (settlements.prizes.has(index)) rows.push('Claim your last reward before starting another run.');
      else actions.push({ label: 'Start ' + contract.name, run: () => startExpedition(index) });
    }
    ui.showTown('Astral Expeditions', rows, actions);
  }

  function startExpedition(index) {
    const partners = charterRegions().size;
    if (!world.astral || expedition || swarm.bossAlive() || partners < index + 1 || settlements.prizes.has(index)) return;
    const site = worldgen.siegeLayout(seed);
    if (Math.abs(state.player.x - site.x) > 9 || Math.abs(state.player.y - (site.y - 4)) > 4) {
      say('Start on the middle Astral Siege platform', 3);
      return;
    }
    const contract = settlementModule.EXPEDITIONS[index];
    const arena = { left: site.x - 38, right: site.x + 38, top: site.y - 32, bottom: site.y + 1 };
    const target = swarm.summon(contract.bosses[0], state.player, arena);
    if (!target) { say('Clear the air above the siege platform', 3); return; }
    prepareExpeditionBoss(target, contract);
    expedition = { index, contract, arena, target, wave: 0, start: state.time, partners, nextStrike: state.time + 8 };
    state.expeditionStatus = contract.name + ' · Wave 1 / 3';
    ui.closeTown();
    say(contract.name + ' started', 3);
  }

  function prepareExpeditionBoss(target, contract) {
    target.expedition = true;
    if (contract.health) target.hp = target.maxHp = Math.round(target.maxHp * contract.health);
  }

  function stopExpedition(message) {
    if (!expedition) return;
    expedition.target.dead = true;
    state.arrows = state.arrows.filter(arrow => !arrow.hostile);
    expedition = null;
    state.expeditionStatus = '';
    if (message) say(message, 4);
  }

  function stepExpedition() {
    if (!expedition) return;
    const run = expedition;
    const player = state.player;
    const elapsed = state.time - run.start;
    if (elapsed >= run.contract.seconds) { stopExpedition('Expedition timed out'); return; }
    if (player.x < run.arena.left - 7 || player.x > run.arena.right + 7 ||
      player.y < run.arena.top - 15 || player.y > run.arena.bottom + 12) {
      stopExpedition('Expedition failed · You left the siege platforms');
      return;
    }
    if (run.target.dead) {
      if (!run.target.expeditionDefeated) { stopExpedition('Expedition interrupted'); return; }
      if (run.wave + 1 >= run.contract.bosses.length) {
        settlements.finish(run.index, elapsed);
        const rewards = [[run.contract.ore, 3 + Math.min(5, run.partners)], ['coin', 3000 + run.partners * 400]];
        settlements.prizes.set(run.index, rewards);
        stopExpedition(run.contract.name + ' cleared in ' + Math.ceil(elapsed) + 's');
        return;
      }
      const target = swarm.summon(run.contract.bosses[run.wave + 1], player, run.arena);
      if (!target) {
        state.expeditionStatus = 'Move into open space for the next wave · ' + Math.ceil(run.contract.seconds - elapsed) + 's';
        return;
      }
      prepareExpeditionBoss(target, run.contract);
      run.strike = null;
      run.target = target;
      run.wave += 1;
      say(run.contract.name + ' · Wave ' + (run.wave + 1), 2);
    }
    if (run.contract.lightning && state.time >= run.nextStrike) {
      if (run.strike) {
        fireSiegeStrike(run.target, run.strike);
        run.strike = null;
        run.target.siegeMarks = null;
        run.nextStrike = state.time + 7;
      } else {
        const x = Math.floor(player.x);
        const y = Math.ceil(player.y + 2);
        run.strike = [-2, 0, 2].map(offset => ({ x: x + offset, y }));
        run.target.siegeMarks = run.strike;
        run.nextStrike = state.time + 1.2;
      }
    }
    state.expeditionStatus = run.contract.name + ' · Wave ' + (run.wave + 1) + ' / 3 · '
      + Math.ceil(run.contract.seconds - elapsed) + 's';
  }

  function bannerDamage(target, damage) {
    if (target.practice || target.expedition) return damage;
    for (const banner of enemyBanners.values()) {
      if (banner.species !== target.key || Math.hypot(banner.x - state.player.x, banner.y - state.player.y) > 24
        || world.get(banner.x, banner.y) !== tiles.idOf('enemy-banner')) continue;
      return Math.round(damage * 1.15);
    }
    return damage;
  }

  function useEnemyBanner(aim, item) {
    if (!aim.inReach) return false;
    const key = aim.x + ':' + aim.y;
    const existing = enemyBanners.get(key);
    if (existing && world.get(aim.x, aim.y) === tiles.idOf('enemy-banner')) {
      say(enemyModule.BY_KEY[existing.species].name + ' Banner · +15% damage to this species nearby', 3);
      return true;
    }
    const species = craft.ITEMS[item?.key]?.banner;
    if (!species) return false;
    if (world.get(aim.x, aim.y) !== tiles.AIR) return true;
    if (!world.getWall(aim.x, aim.y) && !tiles.isSolid(world.get(aim.x, aim.y - 1))) {
      say('Hang banners from a background wall or a ceiling', 2);
      return true;
    }
    if (!inventory.take(item.key, 1)) return true;
    enemyBanners.set(key, { x: aim.x, y: aim.y, species, colour: enemyModule.BY_KEY[species].colour });
    world.set(aim.x, aim.y, tiles.idOf('enemy-banner'));
    sfxAt('place', aim.x, aim.y);
    return true;
  }

  function openBestiary() {
    const known = enemyModule.ENEMIES.filter(spec => bestiary[spec.key]).sort((a, b) => a.name.localeCompare(b.name));
    const summary = known.length + ' / ' + enemyModule.ENEMIES.length + ' creatures discovered';
    ui.showTown('Bestiary', [], [], query => {
      const rows = [summary, 'Banners · 50 defeats, 25 catches for passive wildlife, or one boss win.'];
      const actions = [{ label: 'Back to Town Hall', run: checkHousing }];
      for (const spec of known) {
        const record = bestiary[spec.key];
        const type = spec.boss ? 'Boss' : spec.specimen ? spec.specimen.rare || 'Critter' : 'Enemy';
        const habitat = spec.foundry ? 'Starfall Foundry' : spec.dungeon ? 'Ossuary'
          : [...(spec.biomes || []), ...(spec.layers || [])].join(', ') || 'Special encounter';
        const loot = [...(spec.drops || []), ...(spec.bossDrops || []),
          ...(spec.bossDrops ? [] : (RARE_BY_ENEMY[spec.key] || []).map(entry => entry.key))];
        const drops = record.defeated > 0 ? [...new Set(loot.map(entry => Array.isArray(entry) ? entry[0] : entry))]
          .map(key => craft.nameOf(key, tiles)).join(', ') : '';
        const search = [spec.name, type, habitat, drops].join(' ').toLowerCase();
        if (query && !search.includes(query)) continue;
        rows.push(spec.name + ' · ' + type + ' · ' + habitat + ' · ' + record.defeated + ' defeated'
          + (spec.specimen ? ' · ' + record.caught + ' caught' : '') + (drops ? ' · Drops: ' + drops : ''));
        const earned = () => craft.earnedEnemyBanners(spec, record.defeated, record.caught, defeatedBosses.has(spec.key));
        const available = earned() - (record.banners || 0);
        if (available > 0) actions.push({ label: 'Claim ' + spec.name + ' Banner (' + available + ')', run() {
          if (earned() <= (record.banners || 0)) return;
          if (townExchange([], [['banner-' + spec.key, 1]])) record.banners = (record.banners || 0) + 1;
        } });
      }
      if (rows.length === 2) rows.push(query ? 'No discovered entries match.' : 'Encounter creatures or catch them with a net.');
      return { rows, actions };
    }, 'Search creatures and habitats');
  }

  function campaignMilestones() {
    const goals = new Set();
    if (state.progress.bars >= 5 || defeatedBosses.has('kingslime')) goals.add('forge');
    if (settlements.claimed.has('campaign:astral') || settlements.count('campaign-astral') || ['lunarium-bar', 'solarium-bar', 'eventide-bar']
      .some(key => inventory.countOf(key) > 0)) goals.add('astral');
    return goals;
  }

  function recipeLine(key) {
    const recipe = craft.RECIPES.find(r => r.out.key === key);
    return recipe.need.map(([item, count]) =>
      craft.heldOf(inventory, item) + '/' + count + ' ' + craft.nameOf(item, tiles)).join(' · ')
      + (recipe.station ? ' · ' + recipe.station : '');
  }

  function campaignBossDetails(key) {
    const boss = enemyModule.BY_KEY[key];
    const summon = Object.entries(craft.ITEMS).find(([, item]) => item.use?.summon === key);
    if (!summon) return [boss.name];
    const [itemKey, item] = summon;
    const recipe = craft.RECIPES.find(entry => entry.out.key === itemKey);
    const rows = [boss.name + ' · ' + item.name + (item.text ? ' · ' + item.text : '')];
    if (recipe) rows.push('Summon recipe · ' + townItems(recipe.need)
      + (recipe.station ? ' at ' + craft.nameOf(recipe.station, tiles) : ''));
    return rows;
  }

  function campaignLandmark(chapter) {
    if (chapter.id === 'foundry') {
      const site = worldgen.foundryLayout(seed);
      return 'Foundry landing · x ' + (site.x - 30) + ', y ' + site.y;
    }
    if (chapter.id === 'regent') {
      const site = worldgen.siegeLayout(seed);
      return 'Siege platform · x ' + site.x + ', y ' + (site.y - 3);
    }
    return '';
  }

  function campaignReward(id, reward, refresh) {
    return { label: 'Claim ' + id.name, run() {
      if (settlements.claimed.has(id.key)) return;
      if (townExchange([], reward)) {
        settlements.claimed.add(id.key);
        refresh?.();
      }
    } };
  }

  function openCampaign() {
    if (dimension === 'underworld') { openUnderworldJournal(); return; }
    input.left = input.right = input.jump = input.down = false;
    const chapters = settlementModule.CAMPAIGN;
    const milestones = campaignMilestones();
    const complete = chapter => settlementModule.campaignChapterReady(chapter, defeatedBosses, milestones, craft.HARDMODE_TRIO);
    const active = chapters.findIndex(chapter => !complete(chapter));
    const rows = [active < 0 ? 'Campaign complete · The Astral Siege is over.' :
      'Act ' + (active + 1) + ' / ' + chapters.length + ' · ' + chapters[active].name,
      'Objectives follow your world progress. Claim earned supplies here whenever you have room.'];
    const actions = [{ label: 'Boss Side Quests', run: () => openCampaignHunts() },
      { label: 'Progression Journal', run: openProgression }, { label: 'Deepwood Town Quest', run: openRangerTrail },
      { label: 'Town Hall', run: checkHousing }];
    if (active >= 0) {
      const chapter = chapters[active];
      rows.push(chapter.story, chapter.clue);
      const landmark = campaignLandmark(chapter);
      if (landmark) rows.push(landmark);
      for (const key of (chapter.trio ? craft.HARDMODE_TRIO : chapter.bosses || [])) {
        if (!defeatedBosses.has(key)) rows.push(...campaignBossDetails(key));
      }
      const hunts = (chapter.recommendedHunts || []).filter(key => !defeatedBosses.has(key)
        && !craft.bossPrerequisite(key, defeatedBosses));
      if (hunts.length) {
        rows.push('Optional detours for this act · ' + hunts.map(key => enemyModule.BY_KEY[key].name).join(', '));
        actions.push({ label: 'This act’s detours', run: () => openCampaignHunts(hunts) });
      }
    }
    for (const [index, chapter] of chapters.entries()) {
      if (active >= 0 && index > active) break;
      const key = 'campaign:' + chapter.id;
      if (!complete(chapter)) continue;
      rows.push('Act ' + (index + 1) + ' · ' + chapter.name
        + (settlements.claimed.has(key) ? ' · Complete' : ' · Reward ' + townItems(chapter.reward)));
      if (!settlements.claimed.has(key)) actions.push(campaignReward({ key, name: chapter.name }, chapter.reward, openCampaign));
    }
    if (active < 0 || world.portalHunt) actions.push({ label: 'Chapter 2 · The Scattered Gate', run: openPortalHunt });
    if (world.astral) actions.push({ label: 'Astral Expeditions', run: openExpeditions });
    ui.showTown('Campaign · From Deepwood to Astral', rows, actions);
  }

  function insidePortalTrial(site) {
    const player = state.player;
    return player.x >= site.left - 3 && player.x <= site.right + 3
      && player.y >= site.top - 3 && player.y <= site.bottom + 3;
  }

  function openPortalHunt() {
    input.left = input.right = input.jump = input.down = false;
    const rows = ['The Astral Siege has scattered nine fragments and an activator across four layers.',
      'Reach each structure, challenge its guardian at the Trial Seal, then return to the seal for its component.'];
    const actions = [{ label: 'Chapter 1', run: openCampaign }];
    if (!world.portalHunt) {
      const milestones = campaignMilestones();
      const ready = world.astral && settlementModule.CAMPAIGN.every(chapter =>
        settlementModule.campaignChapterReady(chapter, defeatedBosses, milestones, craft.HARDMODE_TRIO));
      if (ready) actions.push({ label: 'Begin Chapter 2', run() {
        settlements.record('campaign-astral', 'chapter-two');
        world.enablePortalHunt();
        say('Ten Trial Seals have awakened', 4);
        openPortalHunt();
      } });
      else rows.push('Complete Chapter 1 to awaken the Trial Seals.');
      ui.showTown('Chapter 2 · The Scattered Gate', rows, actions);
      return;
    }
    const sites = worldgen.portalTrialSites(seed);
    const collected = site => settlements.claimed.has('portal-loot:' + site.id);
    const fragments = sites.filter(site => site.reward !== 'portal-activator' && collected(site)).length;
    const activator = sites.some(site => site.reward === 'portal-activator' && collected(site));
    rows.push('Fragments ' + fragments + ' / 9 · Activator ' + (activator ? 'recovered' : 'missing'));
    if (fragments === 9 && activator) rows.push(portalLink
      ? 'Underworld Gate · x ' + portalLink.x + ', y ' + portalLink.y
      : 'The hunt is complete. Carry all ten components and use the Portal Activator on a clear tile above solid ground.');
    for (const site of sites) {
      const won = settlements.claimed.has('portal-win:' + site.id);
      rows.push(site.name + ' · ' + townRegionName(site.layer) + ' · x ' + site.x + ', y ' + (site.y - 1)
        + ' · ' + site.guardian + ' · ' + (collected(site) ? 'Recovered' : won ? 'Reward ready' : craft.nameOf(site.reward, tiles)));
      if (!collected(site) && physics.aimTile(state.player, { x: site.x, y: site.y - 1 }).inReach) {
        actions.push({ label: (won ? 'Recover component · ' : 'Challenge ') + (won ? site.name : site.guardian),
          run: () => activatePortalTrial(site) });
      }
    }
    ui.showTown('Chapter 2 · The Scattered Gate', rows, actions);
  }

  function activatePortalTrial(site) {
    if (!world.portalHunt || !physics.aimTile(state.player, { x: site.x, y: site.y - 1 }).inReach) return;
    const win = 'portal-win:' + site.id;
    const loot = 'portal-loot:' + site.id;
    if (settlements.claimed.has(loot)) { say('This Trial Seal has been emptied', 2); return; }
    if (settlements.claimed.has(win)) {
      if (townExchange([], [[site.reward, 1]])) {
        settlements.claimed.add(loot);
        say(craft.nameOf(site.reward, tiles) + ' recovered', 3);
        openPortalHunt();
      }
      return;
    }
    if (swarm.bossAlive() || expedition || activePortalTrial) {
      say('Finish the current encounter first', 2);
      return;
    }
    const boss = swarm.summon(site.boss, state.player, site);
    if (!boss) { say('Clear room beside the seal and try again', 3); return; }
    activePortalTrial = { site, boss };
    ui.closeTown();
    say(site.guardian + ' awakens', 3);
    sfx('roar');
  }

  function openUnderworldJournal() {
    input.left = input.right = input.jump = input.down = false;
    const rows = ['The Underworld · Return Gate at x 0, y ' + (worldgen.SEA_LEVEL - 1) + '.',
      'Each region has a surface refuge, a cave stronghold and a deep ruin. Challenge the guardians at the two lower seals.'];
    const actions = [{ label: 'Boss campaign', run: openUnderworldCampaign },
      { label: 'Optional dungeons', run: openUnderworldDungeons }, { label: 'Emberbloom Forge Town', run: () => openEmberTown() }, { label: 'Tidekeeper’s Landing', run: () => openBrineQuest() }, { label: 'Town Hall', run: checkHousing }];
    for (const biome of worldgen.BIOMES) {
      const centers = [-2, -1, 0, 1, 2].map(band => band * worldgen.bandWidth);
      const center = centers.find(x => worldgen.biomeAt(seed, x).key === biome.key);
      rows.push(biome.name + ' · x ' + center + ' · ' + biome.oreName + ', ' + biome.woodName + ', ' + biome.fish.name);
      const locations = [[center + 84, worldgen.surfaceHeight(seed, center + 84)],
        [center - 76, worldgen.SEA_LEVEL + 102], [center + 24, worldgen.SEA_LEVEL + 236]];
      for (const [index, [x, y]] of locations.entries()) rows.push(biome.structures[index] + ' · x ' + x + ', y ' + y);
      rows.push('Guardian rewards · ' + [1, 2].filter(depth =>
        settlements.claimed.has('underworld-loot:' + biome.key + '-guardian-' + depth)).length + '/2 guardians recovered');
    }
    ui.showTown('Chapter 2 · The Underworld', rows, actions);
  }

  function openUnderworldCampaign() {
    const route = tiles.UNDERWORLD_CAMPAIGN;
    const next = route.find(encounter => !defeatedBosses.has(encounter.key));
    const count = route.filter(encounter => defeatedBosses.has(encounter.key)).length;
    const rows = [count + '/' + route.length + ' bosses defeated' + (next ? ' · Next: ' + next.name : ' · Chapter 2 complete'),
      'Craft each reusable summon at an Iron Anvil using the listed biome’s bars and relics. Fight at the named arena and claim the trophy at its altar.',
      'Every three trophies can be forged into a class accessory at an Iron Anvil.'];
    for (const encounter of route) {
      const site = worldgen.campaignSite(seed, encounter);
      const biome = worldgen.BIOMES.find(entry => entry.key === encounter.biome);
      const status = settlements.claimed.has('campaign-reward:' + encounter.key) ? 'Trophy ready'
        : defeatedBosses.has(encounter.key) ? 'Defeated' : encounter === next ? 'Available' : 'Locked';
      rows.push((encounter.index + 1) + '. ' + encounter.name + ' · ' + status + ' · ' + encounter.structure
        + ' · x ' + site.x + ', y ' + (site.floor - 1) + ' · ' + encounter.summonName + ' (' + biome.name + ')');
      if (encounter === next) rows.push(recipeLine(encounter.summon));
    }
    ui.showTown('Chapter 2 · The Crown Below', rows, [{ label: 'Underworld journal', run: openUnderworldJournal }]);
  }

  function startUnderworldCampaignFight(site) {
    const { encounter } = site;
    if (encounter.side && !settlements.claimed.has('dungeon-open:' + encounter.key)) {
      say('Attune the three conduits to unlock the arena', 3);
      return true;
    }
    const required = craft.bossPrerequisite(encounter.key, defeatedBosses);
    if (required) { say('Defeat ' + enemyModule.BY_KEY[required].name + ' first', 3); return true; }
    if (settlements.claimed.has('campaign-reward:' + encounter.key)) { say('Claim the trophy at the altar first', 3); return true; }
    if (!swarm || swarm.bossAlive() || activePortalTrial || expedition) { say('Finish the current encounter first', 2); return true; }
    const boss = swarm.summon(encounter.key, state.player, { ...site, top: site.top + 1 });
    if (!boss) { say('Stand nearer the center of the arena and try again', 3); return true; }
    activePortalTrial = { site, boss };
    say(encounter.name + ' awakens', 3);
    sfx('roar');
    return true;
  }

  function useCampaignAltar(aim, item) {
    if (dimension !== 'underworld' || !aim.inReach || !tiles.tile(world.get(aim.x, aim.y)).underworldCampaign) return false;
    const site = worldgen.encounterSiteAt(seed, aim.x, aim.y);
    if (!site || aim.x !== site.x || aim.y !== site.floor - 1) return true;
    const { encounter } = site;
    const reward = 'campaign-reward:' + encounter.key;
    if (settlements.claimed.has(reward)) {
      if (townExchange([], enemyModule.BY_KEY[encounter.key].bossDrops)) {
        settlements.claimed.delete(reward);
        if (encounter.side) settlements.claimed.add('dungeon-cleared:' + encounter.key);
        say(encounter.side ? 'Dungeon trophy recovered · The waystone is now active'
          : encounter.index === tiles.UNDERWORLD_CAMPAIGN.length - 1 ? 'The Crown Below has fallen · Chapter 2 complete'
            : 'Trophy recovered · Check the campaign journal for your next fight', 4);
      }
    } else if (item?.key === encounter.summon && insidePortalTrial(site)) return startUnderworldCampaignFight(site);
    else say('Use ' + encounter.summonName + ' inside ' + encounter.structure, 3);
    return true;
  }

  function activeBrineMarket(device) {
    if (dimension !== 'underworld' || !device || deviceAt(device.x, device.y) !== device
      || settlements.town(device)?.region !== 'brine-depths' || settlements.town(device).rank < 2
      || !physics.aimTile(state.player, device).inReach || townHomes(device) < 2) return false;
    return residentAt(device, 'marra');
  }

  function openBrineQuest(selected) {
    if (dimension !== 'underworld') return;
    input.left = input.right = input.jump = input.down = false;
    const sluice = worldgen.dungeonSite(seed, tiles.UNDERWORLD_DUNGEONS.find(encounter => encounter.key === 'undertow-warden'));
    const ruin = worldgen.tidalRuin(seed);
    const tide = deps.underworld.brineTide(state.dayPhase);
    const minutes = Math.ceil(tide.untilChange * worldRules.day / 60);
    const flags = settlements.claimed;
    const device = selected || nearestTown(state.player.x, state.player.y, activeBrineMarket, 8);
    const rows = ['Brine Depths · ' + (tide.low ? 'Low tide' : 'High tide') + ' · changes in about ' + minutes + ' real-time min.',
      'The Sunken Sluice entrance is at x ' + sluice.x + ', y ' + sluice.entrance + '.'];
    const actions = [{ label: 'Underworld journal', run: openUnderworldJournal }];
    if (!flags.has('marra-rescued')) rows.push('Defeat the Undertow Warden, then open Marra’s cell beside the altar.');
    else {
      rows.push('Marra is free. Assign her a furnished room through Town Hall in Brine Depths. Found and charter a surface Brine outpost with two occupied homes.');
      if (flags.has('lowwater-chart')) rows.push('Lowwater Hatch · x ' + ruin.x + ', y ' + ruin.hatch.y
        + ' · Enter at low tide. The emergency ladder always works.');
      if (activeBrineMarket(device)) {
        rows.push('Tide Market is open. Daily contracts pay scrip at the town quest board.');
        actions.push({ label: 'Brine daily contracts', run: () => openQuestBoard(device) });
        for (const [cost, key, count] of [[2, 'gills-potion', 3], [3, 'brine-depths-fish-stew', 2], [5, 'brine-depths-crate', 1]]) {
          actions.push({ label: 'Trade ' + cost + ' scrip for ' + townItems([[key, count]]), run() {
            if (activeBrineMarket(device)) townExchange([['tide-market-scrip', cost]], [[key, count]]);
          } });
        }
        if (!flags.has('lowwater-chart')) actions.push({ label: 'Take Marra’s Lowwater Survey', run() {
          if (!activeBrineMarket(device)) return;
          flags.add('lowwater-chart');
          openBrineQuest(device);
        } });
        else if (!flags.has('lowwater-complete')) actions.push({ label: 'Return the survey ledger for a Tideglass Rod', run() {
          if (activeBrineMarket(device) && !flags.has('lowwater-complete')
            && townExchange([['lowwater-ledger', 1]], [['tideglass-rod', 1], ['tide-market-scrip', 5]])) {
            flags.add('lowwater-complete');
            openBrineQuest(device);
          }
        } });
      } else rows.push('Visit a charter pylon within 45 tiles of Marra’s occupied home to open the market.');
      if (flags.has('lowwater-complete')) rows.push('Lowwater Survey complete · The Tideglass Rod improves water fishing power.');
    }
    ui.showTown('Tidekeeper’s Landing', rows, actions);
  }

  function useBrineFixture(aim) {
    if (dimension !== 'underworld' || !aim.inReach) return false;
    const spec = tiles.tile(world.get(aim.x, aim.y));
    if (!spec.brineQuest) return false;
    const flags = settlements.claimed;
    if (spec.key === 'kilnsmith-cell') {
      if (!defeatedBosses.has('furnace-mycelium')) say('Defeat Furnace Mycelium to free Kera', 3);
      else if (!flags.has('kera-rescued')) {
        flags.add('kera-rescued');
        say('Kera is free. Invite her to a furnished Emberbloom home.', 4);
      } else say('Kera’s cell is empty', 2);
      return true;
    }
    if (spec.key === 'tidekeeper-cell') {
      if (!defeatedBosses.has('undertow-warden')) say('Defeat the Undertow Warden to free Marra', 3);
      else if (!flags.has('marra-rescued')) {
        flags.add('marra-rescued');
        say('Marra is free. Invite her into a furnished Brine Depths home.', 4);
      } else say('Marra’s cell is empty', 2);
      return true;
    }
    if (swarm.bossAlive() || activePortalTrial) { say('Finish the encounter first', 2); return true; }
    const ruin = worldgen.tidalRuin(seed);
    if (spec.key === 'tidal-archive') {
      if (!flags.has('lowwater-entered')) say('Enter through the Lowwater Hatch with Marra’s survey', 3);
      else if (flags.has('lowwater-complete') || inventory.countOf('lowwater-ledger')) say('Return to the Tide Market', 2);
      else if (townExchange([], [['lowwater-ledger', 1]])) say('Survey ledger recovered. Bring it to Marra’s market.', 4);
      return true;
    }
    const entering = spec.key === 'tidal-hatch';
    if (entering && !flags.has('lowwater-chart')) { say('Ask Marra for a survey at an active Tide Market', 3); return true; }
    if (entering && !deps.underworld.brineTide(state.dayPhase).low) { say('The hatch only opens at low tide', 3); return true; }
    const landing = safePylonLanding(entering ? ruin.exit : ruin.hatch);
    if (!landing) { say('The other side needs a clear landing', 3); return true; }
    relocateWithinRealm(landing);
    if (entering) flags.add('lowwater-entered');
    say(entering ? 'Entered the Lowwater Archive' : 'Returned to the Lowwater Hatch', 3);
    return true;
  }

  function openUnderworldDungeons() {
    const rows = ['Read the inscription at each entrance. Descend the rope shaft and attune the three conduits in the order the inscription describes.',
      'Craft a summon at an Iron Anvil and use it in the unlocked arena. Recovering the trophy activates the dungeon waystone.'];
    for (const encounter of tiles.UNDERWORLD_DUNGEONS) {
      const site = worldgen.dungeonSite(seed, encounter);
      const status = defeatedBosses.has(encounter.key) ? 'Defeated'
        : settlements.claimed.has('dungeon-open:' + encounter.key) ? 'Arena open' : 'Arena locked';
      rows.push(encounter.structure + ' · ' + encounter.name + ' · ' + status + ' · entrance x ' + site.x + ', y ' + site.entrance);
      rows.push(encounter.summonName + ' · ' + recipeLine(encounter.summon));
    }
    ui.showTown('Underworld · Optional Dungeons', rows, [{ label: 'Underworld journal', run: openUnderworldJournal }]);
  }

  function useUnderworldDungeonFixture(aim) {
    if (dimension !== 'underworld' || !aim.inReach) return false;
    const spec = tiles.tile(world.get(aim.x, aim.y));
    if (!spec.underworldConduit && !spec.underworldTablet && !spec.underworldWaystone && !spec.underworldLock) return false;
    const site = worldgen.dungeonSiteAt(seed, aim.x, aim.y);
    if (spec.underworldWaystone) {
      openUnderworldWaystones(aim);
      return true;
    }
    if (!site) return true;
    const { encounter, conduits } = site;
    if (spec.underworldTablet) {
      input.left = input.right = input.jump = input.down = false;
      ui.showTown(encounter.structure, [encounter.clue, 'From the upper gallery to the lower gallery: ' + encounter.conduits.join(', ') + '.',
        encounter.summonName + ' · ' + recipeLine(encounter.summon)], []);
      return true;
    }
    if (spec.underworldLock) { say('Three conduits control this lock', 2); return true; }
    const index = conduits.findIndex(point => point.x === aim.x && point.y === aim.y);
    const unlocked = 'dungeon-open:' + encounter.key;
    if (index < 0 || settlements.claimed.has(unlocked)) return true;
    const lit = tiles.idOf('underworld-conduit-lit');
    const progress = conduits.filter(point => world.get(point.x, point.y) === lit).length;
    if (world.get(aim.x, aim.y) === lit) { say(encounter.conduits[index] + ' is already attuned', 2); return true; }
    if (index !== encounter.order[progress]) {
      for (const point of conduits) world.set(point.x, point.y, tiles.idOf('underworld-conduit'));
      say('The conduits reset. Read the entrance inscription.', 3);
      return true;
    }
    world.set(aim.x, aim.y, lit);
    if (progress + 1 === conduits.length) {
      for (const dx of [-1, 0, 1]) world.set(site.x + dx, site.top, dx ? tiles.AIR : tiles.idOf('rope'));
      settlements.claimed.add(unlocked);
      say('The arena lock opens', 3);
    } else say(encounter.conduits[index] + ' attuned · ' + (progress + 1) + '/' + conduits.length, 2);
    sfx('use');
    return true;
  }

  function openUnderworldWaystones(source) {
    if (swarm.bossAlive() || activePortalTrial) { say('Waystones go dark during encounters', 2); return; }
    const camp = { x: 5, y: worldgen.SEA_LEVEL - 1, name: 'Return Gate camp' };
    const sites = tiles.UNDERWORLD_DUNGEONS.map(encounter => worldgen.dungeonSite(seed, encounter));
    const unlocked = sites.filter(({ encounter }) => settlements.claimed.has('dungeon-cleared:' + encounter.key));
    const destinations = [camp, ...unlocked.map(site => ({ ...site.waystone, name: site.encounter.structure }))];
    if (!destinations.some(point => point.x === source.x && point.y === source.y)) {
      say('Recover this dungeon’s trophy to awaken the waystone', 3);
      return;
    }
    input.left = input.right = input.jump = input.down = false;
    const actions = destinations.filter(point => point.x !== source.x || point.y !== source.y).map(destination => ({
      label: 'Travel to ' + destination.name,
      run() {
        if (dimension !== 'underworld' || swarm.bossAlive() || activePortalTrial
          || !physics.aimTile(state.player, source).inReach) return;
        if (!tiles.tile(world.get(destination.x, destination.y)).underworldWaystone) return;
        const landing = safePylonLanding(destination);
        if (!landing) { say('Clear a landing beside the destination waystone', 3); return; }
        relocateWithinRealm(landing);
        ui.closeTown();
        say('Arrived at ' + destination.name, 2.5);
      }
    }));
    ui.showTown('Underworld Waystones', [unlocked.length + '/' + sites.length + ' dungeon waystones active. Recover dungeon trophies to link more destinations.'], actions);
  }

  function useUnderworldShrine(aim) {
    if (dimension !== 'underworld' || !aim.inReach || !tiles.tile(world.get(aim.x, aim.y)).underworldShrine) return false;
    const site = worldgen.biomeSiteAt(seed, aim.x, aim.y);
    if (!site || !site.layer || aim.x !== site.x || aim.y !== site.floor - 1) return true;
    const key = site.biome + '-guardian-' + site.layer;
    const win = 'underworld-win:' + key, loot = 'underworld-loot:' + key;
    if (settlements.claimed.has(loot)) { say('This seal has been claimed', 2); return true; }
    if (settlements.claimed.has(win)) {
      if (townExchange([], enemyModule.BY_KEY[key].bossDrops)) {
        settlements.claimed.add(loot);
        say('Guardian relics recovered', 3);
      }
      return true;
    }
    if (swarm.bossAlive() || activePortalTrial) { say('Finish the current encounter first', 2); return true; }
    const arena = { ...site, left: site.x - 10, right: site.x + 10, bottom: site.floor, top: site.top + 1 };
    const boss = swarm.summon(key, state.player, arena);
    if (!boss) { say('Stand to one side of the seal and try again', 2); return true; }
    activePortalTrial = { site: arena, boss };
    say(boss.spec.name + ' awakens', 3);
    sfx('roar');
    return true;
  }

  function travelDimension(destination) {
    if (swarm.bossAlive() || expedition || activePortalTrial) {
      say('The gate closes during boss fights', 3);
      return;
    }
    closeChest();
    releaseHook();
    if (!save()) { say('The world could not be saved. The gate stays closed.', 3); return; }
    boot(worldChoice, destination);
    save();
  }

  function useDimensionGate(aim, item) {
    if (!aim.inReach) return false;
    const spec = tiles.tile(world.get(aim.x, aim.y));
    if (spec.dimensionGate) {
      if (spec.key === 'underworld-gate' && dimension === 'overworld' && portalLink) travelDimension('underworld');
      else if (spec.key === 'underworld-return' && dimension === 'underworld') travelDimension('overworld');
      return true;
    }
    if (item?.key !== 'portal-activator' || dimension !== 'overworld') return false;
    if (portalLink) { say('The Underworld Gate is already open', 2); return true; }
    const trials = tiles.PORTAL_TRIALS;
    if (!world.portalHunt || !trials.every(trial =>
      settlements.claimed.has('portal-loot:' + trial.id) && inventory.countOf(trial.reward) > 0)) {
      say('Bring the activator and all nine recovered fragments', 3);
      return true;
    }
    if (swarm.bossAlive() || expedition || activePortalTrial) { say('Finish the current encounter first', 2); return true; }
    if (world.get(aim.x, aim.y) !== tiles.AIR || world.get(aim.x, aim.y - 1) !== tiles.AIR
      || !tiles.isSolid(world.get(aim.x, aim.y + 1)) || world.getLevel(aim.x, aim.y)) {
      say('Choose a dry, clear tile above solid ground', 3);
      return true;
    }
    for (const trial of trials) inventory.take(trial.reward, 1);
    portalLink = { x: aim.x, y: aim.y };
    world.set(aim.x, aim.y, tiles.idOf('underworld-gate'));
    save();
    say('The Underworld Gate opens. Use it to descend.', 4);
    return true;
  }

  function usePortalSeal(aim) {
    if (!world.portalHunt || !aim.inReach || !tiles.tile(world.get(aim.x, aim.y)).portalTrial) return false;
    const site = world.portalSiteAt(aim.x, aim.y);
    if (site && aim.x === site.x && aim.y === site.y - 1) activatePortalTrial(site);
    return true;
  }

  function stepPortalTrial() {
    if (!activePortalTrial || insidePortalTrial(activePortalTrial.site)) return;
    activePortalTrial.boss.dead = true;
    activePortalTrial = null;
    state.arrows = state.arrows.filter(arrow => !arrow.hostile);
    say('The encounter resets when you leave the arena', 3);
  }

  function openCampaignHunts(only) {
    ui.showTown('Campaign · Boss Side Quests', [], [], query => {
      const rows = ['Optional hunts unlock as you advance. Each pays once in this world.'];
      const actions = [{ label: 'Campaign', run: openCampaign }];
      for (const [chapter, bosses] of craft.BOSS_CHAPTERS.entries()) {
        for (const key of bosses.slice(1)) {
          if (craft.HARDMODE_TRIO.includes(key) || (only && !only.includes(key))) continue;
          const boss = enemyModule.BY_KEY[key];
          const title = settlementModule.CAMPAIGN_HUNTS[key] || boss.name;
          const label = title + ' · ' + boss.name;
          const summon = Object.values(craft.ITEMS).find(item => item.use?.summon === key);
          if (query && ![title, boss.name, summon?.name, summon?.text].join(' ').toLowerCase().includes(query)) continue;
          const required = craft.bossPrerequisite(key, defeatedBosses);
          const id = 'campaign-hunt:' + key;
          const reward = [['coin', 110 + chapter * 60], ['healing-salve', 2 + Math.floor(chapter / 2)]];
          if (settlements.claimed.has(id)) rows.push(label + ' · Complete');
          else if (defeatedBosses.has(key)) {
            rows.push(label + ' · Reward ' + townItems(reward));
            actions.push(campaignReward({ key: id, name: title }, reward));
          } else if (required) rows.push(label + ' · Unlocks after ' + enemyModule.BY_KEY[required].name);
          else {
            rows.push(title, ...campaignBossDetails(key));
            if (key === 'dungeonkeeper') {
              const site = worldgen.dungeonLayout(seed);
              rows.push('Ossuary entrance · x ' + site.x + '. Ring the bell at night.');
            }
            if (key === 'railbreaker' && mineSite) {
              rows.push('Runaway Mine · x ' + (mineSite.x - 35) + '. Repair the bridge and drain the rail spur.');
            }
            if (key === 'ossuarymechanist') rows.push('Open the lower Ossuary after defeating the Keeper in Hardmode.');
            if (key === 'lenscustodian') rows.push('Defeat the Mechanist, then power the shield sensor beneath its arena.');
            if (key === 'drownedarchivist' && archiveSite) {
              rows.push('Tidal Archive airlock · x ' + archiveSite.x + ', y ' + (archiveSite.y - 2) + '. Open the floodgate.');
            }
          }
        }
      }
      return { rows, actions };
    }, 'Search side bosses and summons');
  }

  function openProgression() {
    if (dimension === 'underworld') { openUnderworldJournal(); return; }
    const picks = Object.entries(mining.TOOLS).filter(([key, spec]) => spec.job === 'pick' && key !== 'meteor-pick')
      .sort((a, b) => a[1].power - b[1].power);
    const power = Math.max(0, ...Object.entries(mining.TOOLS).filter(([key, spec]) =>
      spec.job === 'pick' && inventory.countOf(key)).map(([, spec]) => spec.power));
    const rank = picks.reduce((best, [, spec], index) => spec.power <= power ? index : best, -1);
    const rows = ['Mining · ' + (rank < 0 ? 'Recover a pickaxe from the Guide or make one at a Work Bench.'
      : power + ' base pickaxe power')];
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
    const armories = worldgen.chapterArmories(seed).filter(site => defeatedBosses.has(site.boss));
    for (const armory of armories) {
      rows.push(armory.name + ' · x ' + armory.x + ', y ' + armory.y
        + ' · Four caches with class gear. ' + armory.material + ' roamers hunt in '
        + armory.layers.map(layer => worldgen.LAYERS.find(band => band.key === layer)?.name || layer).join(', ') + '.');
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
    if (defeatedBosses.has('foundrywarden')) {
      const siege = worldgen.siegeLayout(seed);
      rows.push('Astral Siege · Space platform at x ' + siege.x + ', y ' + (siege.y - 3) + '. Raise an Astral Standard in the middle.');
      rows.push('Lens Vault · The seal is beneath the Mechanist arena rope.');
    }
    if (world.astral) rows.push('Astral Expeditions · Open the Field Journal at the middle Astral Siege platform.');
    if (world.astral) rows.push('Planetoid ores · Lunarium 750–1,030, Solarium 1,030–1,260, Eventide above 1,260 tiles over sea level.');

    rows.push('Minecarts · Craft at an Anvil. Repair abandoned rail gaps or lay your own route.');
    if (mineSite && defeatedBosses.has('furnacewarden')) {
      rows.push('Runaway Mine · Optional lift at x ' + (mineSite.x - 35) + ', y ' + mineSite.mouth + '. Bring three rails.');
    }
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
      drownedarchivist: 'After the Lens Custodian, open the Tidal Archive floodgate and summon the Archivist below.',
      railbreaker: 'Repair the bridge, switch the junction, and drain the spur to reach the rail arena.',
      astralregent: 'Use wings to avoid marked bombardment lanes across the three Space platforms.'
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
    ui.showTown('Progression Journal', rows, [{ label: 'Campaign', run: openCampaign }, { label: 'Back to Town Hall', run: checkHousing }]);
  }

  function showTownDaily(rows, actions, selected) {
    const player = state.player;
    const eligible = device => deviceAt(device.x, device.y) === device && settlements.town(device)?.rank >= 2
      && physics.aimTile(player, device).inReach && townHomes(device) >= 2;
    const device = selected && eligible(selected) ? selected : nearestTown(player.x, player.y, eligible, 8);
    if (!device) {
      rows.push('Town daily · Open the board beside an active charter pylon.');
      return;
    }
    const local = settlements.town(device);
    const dayNumber = () => Math.max(0, state.nights - (wasNight ? 1 : 0));
    const day = dayNumber();
    const quest = settlementModule.settlementDaily(device, local.region, day);
    const daily = local.daily?.day === day ? local.daily : null;
    const brineDaily = dimension === 'underworld' && local.region === 'brine-depths';
    if (brineDaily && !activeBrineMarket(device)) {
      rows.push('Tide Market contracts require Marra in a valid home near this charter.');
      return;
    }
    const canUse = () => eligible(device) && dayNumber() === day && (!brineDaily || activeBrineMarket(device));
    const progress = quest.key && daily ? settlements.count(quest.key) - daily.start : 0;
    rows.push('Town daily · ' + townRegionName(local.region) + ' · Day ' + (day + 1) + ' · ' + quest.name);
    rows.push(daily?.done ? 'Completed for today.' : (quest.needs ? 'Deliver ' + townItems(quest.needs)
      : 'Progress since acceptance · ' + Math.min(progress, quest.goal) + ' / ' + quest.goal)
      + ' · Reward ' + townItems(quest.reward) + ' · Refreshes at dawn.');
    if (daily?.done) return;
    if (!daily) {
      actions.push({ label: 'Accept town daily', run() {
        if (!canUse() || local.daily?.day === day) return;
        local.daily = { day, start: quest.key ? settlements.count(quest.key) : 0, done: false };
      } });
    } else if (!quest.key || progress >= quest.goal) {
      actions.push({ label: 'Complete town daily', run() {
        if (!canUse() || local.daily !== daily || daily.done) return;
        if (townExchange(quest.needs || [], quest.reward)) {
          daily.done = true;
          say('Town daily completed', 3);
        }
      } });
    }
  }

  function openQuestBoard(selected) {
    const player = state.player;
    ui.showTown('Quest Board', [], [], query => {
      const rows = ['Field objectives track automatically. Claim regional quests beside a charter in that region. Guild quests accept any charter.'];
      const actions = [{ label: 'Town Hall', run: checkHousing }];
      showTownDaily(rows, actions, selected);
      for (const line of settlementModule.QUESTLINES) {
        const name = line.name + (line.region ? ' · ' + townRegionName(line.region) : ' · Guild');
        if (query && !name.toLowerCase().includes(query)) continue;
        const index = line.steps.findIndex((_, n) => !settlements.claimed.has('quest:' + line.id + ':' + n));
        if (index < 0) { rows.push(name + ' · Complete'); continue; }
        const step = line.steps[index];
        const id = 'quest:' + line.id + ':' + index;
        const count = step.boss ? Number(defeatedBosses.has(step.boss)) : step.key ? settlements.count(step.key) : 0;
        const objective = (step.key || step.boss) ? Math.min(count, step.goal) + ' / ' + step.goal : townItems(step.needs);
        rows.push(name + ' · ' + (index + 1) + '/3 · ' + step.name + ' · ' + objective
          + ' · Reward ' + townItems(step.reward));
        if ((step.key || step.boss) && count < step.goal) continue;
        const charter = nearestTown(player.x, player.y, device => {
          const local = settlements.town(device);
          return local?.rank >= 2 && (!line.region || line.region === local.region)
            && physics.aimTile(player, device).inReach && townHomes(device) >= 2;
        }, 8);
        if (charter) actions.push({ label: 'Complete ' + line.name + ' · ' + step.name, run() {
          if (settlements.claimed.has(id) || deviceAt(charter.x, charter.y) !== charter
            || !physics.aimTile(player, charter).inReach || townHomes(charter) < 2) return;
          if (townExchange(step.needs || [], step.reward)) {
            settlements.claimed.add(id);
            say(line.name + ' · ' + step.name + ' complete', 3);
          }
        } });
      }
      return { rows, actions };
    }, 'Search questlines and regions');
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
              recordTownCraft(recipe);
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

  function relocateWithinRealm(landing) {
    releaseHook();
    closeChest();
    if (state.player.cart) physics.dismountMinecart(state.player);
    Object.assign(state.player, landing, { vx: 0, vy: 0, mining: null, fell: 0, landed: 0 });
    state.camera.x = landing.x;
    state.camera.y = landing.y;
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
        const local = settlements.town(destination);
        const name = (local ? settlementModule.settlementRole(local.region).name + ' · ' : '')
          + area + ' · ' + destination.x + ', ' + destination.y;
        return { label: 'Travel to ' + name, run() {
          if (expedition || swarm.bossAlive()) { say('Pylons go dark during boss fights', 2); return; }
          if (!physics.aimTile(state.player, source).inReach || deviceAt(source.x, source.y) !== source) return;
          if (deviceAt(destination.x, destination.y) !== destination ||
            village.nearbyHomes(source.x, source.y, PYLON_RADIUS) < 2 ||
            village.nearbyHomes(destination.x, destination.y, PYLON_RADIUS) < 2) {
            say('Both pylons need two occupied homes', 2.5);
            return;
          }
          const landing = safePylonLanding(destination);
          if (!landing) { say('Clear a landing beside the destination pylon', 2.5); return; }
          relocateWithinRealm(landing);
          ui.closeTown();
          say('Arrived at ' + name, 2.5);
        } };
      });
    if (residents >= 2 && !actions.length) rows.push('Place another pylon at least 90 tiles away to link a second town.');
    actions.unshift({ label: 'Local Settlement', run: () => openSettlement(source) });
    ui.showTown('Pylon Network', rows, actions);
  }

  function useTownDevice(aim) {
    const device = deviceAt(aim.x, aim.y);
    if (!device) return false;
    input.left = input.right = input.jump = input.down = false;
    if (device.type === 'pylon') openSettlement(device);
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
    if (key === 'chapter-armory-seal') {
      const armory = worldgen.chapterArmoryAt(seed, aim.x, aim.y);
      if (!armory) return true;
      if (!defeatedBosses.has(armory.boss)) {
        say(armory.name + ' opens after defeating ' + enemyModule.BY_KEY[armory.boss].name, 3);
        return true;
      }
      for (let dx = -1; dx <= 1; dx += 1) {
        if (tiles.tile(world.get(armory.x + dx, armory.y)).key === key) {
          world.set(armory.x + dx, armory.y, dx === 0 ? tiles.idOf('rope') : tiles.AIR);
        }
      }
      say(armory.name + ' is open', 2.5);
      return true;
    }
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

  function pointHitsPlayer(x, y, radius = 0) {
    const player = state.player;
    return x + radius >= player.x && x - radius < player.x + player.width && y >= player.y && y < player.y + player.height;
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

  function fireSiegeStrike(boss, marks) {
    for (const mark of marks) {
      state.arrows.push({ x: mark.x, y: mark.y - 18, vx: 0, vy: 32, life: 0.58,
        gravity: 0, radius: 1.15, damage: boss.enraged ? 152 : 132, colour: '#d7c5ff', hostile: boss.spec.name });
    }
    sfx('roar');
  }

  function fireBossBarrage(boss, shot) {
    if (boss.key === 'drownedarchivist') {
      setArchiveArenaWater(!archiveFlooded);
      if (!archiveFlooded) shot.angles = [0, Math.PI, -0.32, Math.PI + 0.32];
      say(archiveFlooded ? 'The Archivist floods the arena' : 'The Archivist drains the arena', 1.5);
    }
    const wave = shot.pattern === 'shatter';
    const fieldShot = shot.pattern === 'field';
    const signature = shot.pattern === 'signature';
    const speed = signature ? shot.speed : fieldShot ? 14 : wave ? 23 : shot.pattern === 'cross' ? 25 : 29;
    const inside = tiles.isSolid(world.get(Math.floor(shot.x), Math.floor(shot.y)));
    for (const angle of shot.angles) {
      state.arrows.push({ x: shot.x, y: shot.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: (fieldShot || signature ? shot.range : wave ? 17 : 23) / speed,
        gravity: shot.gravity || 0, bounces: shot.bounces,
        damage: signature ? Math.round(boss.spec.damage * (shot.enraged ? 0.9 : 0.72))
          : fieldShot ? boss.spec.damage : shot.enraged ? 109 : 96,
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
    if (!signature || shot.first) {
      sfxAt(wave ? 'hit' : 'cast', shot.x, shot.y);
    }
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
    if (circuit === 'mine-floodgate') {
      const site = worldgen.runawayMineAt(seed, point.x, point.y);
      if (!site || !defeatedBosses.has('furnacewarden') || world.getLevel(site.x + 20, site.y + 22) > 0) return;
      for (let dx = 12; dx <= 14; dx += 1) {
        world.set(site.x + dx, site.y + 25, dx === 13 ? tiles.idOf('rope') : tiles.AIR);
      }
      say('Spur drained · Railbreaker arena unlocked', 2.5);
      return;
    }
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
    if (player.cart) physics.dismountMinecart(player);
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
      sfx('flood');
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
      sfxAt('sensor', x, y, { gain: 0.55 });
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
    if (spec.skyAnchor) {
      const player = state.player;
      if (player.onGround || !player.flight || player.cart) say('Use a Sky Anchor in midair while wearing wings', 2);
      else if (state.time < nextSkyAnchor) say('Sky Anchor recharging', 1.4);
      else {
        releaseHook();
        player.flightUsed = Math.max(0, player.flightUsed - 0.55);
        player.vy = -6;
        nextSkyAnchor = state.time + 5;
        sfx('anchor');
        say('Sky Anchor restored a burst of flight', 1.5);
      }
      return true;
    }
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
      else sfx('switch');
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
      settlements.record('specimen', target.spec.specimen.key);
      const region = world.biomeAt(Math.floor(target.x), Math.floor(target.y)).key;
      settlements.record('specimen:' + region, target.spec.specimen.key);
      settlements.increment('daily-specimen:' + region);
      recordFieldwork('specimen', target.spec.specimen.key, target.x, target.y);
      sfx('net');
      say('Caught ' + target.spec.name, 2);
      return true;
    }
    if (!aim.inReach) return false;
    const spec = tiles.tile(world.get(aim.x, aim.y));
    const specimen = craft.ITEMS[item?.key]?.critter;
    if (spec.key === 'empty-terrarium' && specimen) {
      world.set(aim.x, aim.y, tiles.idOf('terrarium-' + specimen));
      inventory.take(item.key, 1);
      settlements.record('exhibit', specimen);
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

  function useMineDevice(aim, spec) {
    if (!mineSite) return false;
    const { x, y } = mineSite;
    if (spec.mine === 'entry') {
      if (!defeatedBosses.has('furnacewarden')) say('Defeat the Furnace Warden to power the lift', 2);
      else {
        archiveLift(x - 37, y + 8);
        say('Runaway Mine · Repair the missing bridge rails', 2.5);
      }
    } else if (spec.mine === 'exit') {
      archiveLift(x - 35, mineSite.mouth - 2);
      say('Mine lift returned to the surface', 2);
    } else if (spec.mine === 'repair' || spec.mine === 'junction') {
      const repair = spec.mine === 'repair';
      const ready = repair
        ? worldgen.RUNAWAY_BRIDGE_GAPS.every(dx => tiles.tile(world.get(x + dx, y + 10)).rail)
        : tiles.tile(world.get(x - 10, y + 10)).rail === 'lower';
      if (!ready) say(repair ? 'Replace the three missing bridge rails' : 'Set the junction to the lower track', 2);
      else {
        const gateX = x + (repair ? -20 : 3);
        for (let dy = 6; dy <= 10; dy += 1) {
          world.set(gateX, y + dy, dy === 10 ? tiles.idOf('minecart-rail') : tiles.AIR);
        }
        say(repair ? 'Bridge route opened' : 'Spur route opened', 2);
      }
    } else if (spec.mine === 'flood') say('Use the spur pump switch to open the floodgate', 2);
    else return false;
    return true;
  }

  function openCargoHold() {
    if (openChest) closeChest();
    const items = cargoItems.map(item => ({ ...item }));
    while (items.length < ui.CHEST_SLOTS) items.push(null);
    openChest = { cargo: true, items: items.slice(0, ui.CHEST_SLOTS) };
    ui.openChest(openChest);
    ui.setOpen(true);
  }

  function useRail(aim, item) {
    const cargo = item?.key === 'cargo-cart';
    if (cargo && state.player.cart?.cargo) {
      openCargoHold();
      return true;
    }
    if (!aim.inReach) return false;
    const spec = tiles.tile(world.get(aim.x, aim.y));
    if (spec.mine && useMineDevice(aim, spec)) return true;
    if (item?.key === 'minecart' || cargo) {
      if (state.player.cart) {
        physics.dismountMinecart(state.player);
        return true;
      }
      if (physics.mountMinecart(state.player, world, tiles, aim.x, aim.y)) {
        state.player.cart.cargo = cargo;
        releaseHook();
        say('Move to drive · Down to brake · Jump to exit', 2.5);
        sfx('use');
      } else say('Use the minecart on clear rail', 1.4);
      return true;
    }
    if (spec.rail === 'upper' || spec.rail === 'lower') {
      world.set(aim.x, aim.y, tiles.idOf(spec.circuitPair));
      say(spec.rail === 'upper' ? 'Junction set to lower track' : 'Junction set to upper track', 1.4);
      sfx('use');
      return true;
    }
    return false;
  }

  function place() {
    const aim0 = physics.aimTile(state.player, pointer);
    const item = selectedItem();
    if (useDimensionGate(aim0, item) || useBrineFixture(aim0) || useUnderworldDungeonFixture(aim0) || useUnderworldShrine(aim0) || useCampaignAltar(aim0, item) || usePortalSeal(aim0) || useEnemyBanner(aim0, item) || useWildlife(aim0, item) || useCircuit(aim0, item) || useRail(aim0, item)) return;
    if (aim0.inReach && (useRangerCounter(aim0) || useFoundryShortcut(aim0))) return;
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
    if (craft.ITEMS[item.key]?.portalComponent) {
      say('Keep this component for the first subworld portal', 2.5);
      return;
    }
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
    if (!againstBlock && !((spec.emit > 0 || spec.optic || spec.rail) && againstWall)) return;
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
    if (player.cart && Math.abs(player.cart.speed) > 2 && state.time >= nextRailSound) {
      nextRailSound = state.time + Math.max(0.085, 2.3 / Math.abs(player.cart.speed));
      sfx('rail', { gain: 0.32 });
    }
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
      if (!ui.isOpen || (openChest.cargo ? !state.player.cart?.cargo : Math.hypot(dx, dy) > physics.REACH + 3)) closeChest();
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
    stepEvents();
    if (audio?.running) {
      if (state.time >= nextAudioScene) {
        nextAudioScene = state.time + 0.24;
        audioScene = sampleAudioScene();
        audio.setAmbience(audioScene.layer, audioScene);
      }
      audio.stepMusic(dt, audioScene.layer, audioScene.night, audioScene);
    }
    state.weather = worldRules.weather ? worldgen.weatherAt(seed, state.time,
      worldgen.biomeAt(seed, Math.floor(state.player.x)).key) : null;

    const gear = currentEffects();
    state.gear = gear;
    stats.defense = gear.defense + (state.wardUntil > state.time ? 14 : 0);
    state.player.speedScale = gear.speed;
    state.player.canDoubleJump = gear.doubleJump;
    state.player.flight = gear.flight ? gear.flight + gear.flightBonus : 0;

    if (swarm) {
      stepPortalTrial();
      swarm.step(state.player, dt, state.dayPhase, eventKey());
      stepExpedition();
      const hit = swarm.touching(state.player);
      // The Royal Gel: slimes stop noticing you. The king is still a slime, and is the
      // one slime it does not work on, because a trinket that turns off the boss fight
      // you paid for is not a reward.
      const friendly = hit && hit.spec.kind === 'slime'
        && state.gear && state.gear.slimeFriend;
      if (hit && !friendly) {
        const dealt = statsModule.damage(stats, hit.spec.damage * worldRules.damage);
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
    stepSpirit();
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

    state.dayPhase = (state.dayPhase + dt / worldRules.day) % 1;
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
      const worker = new Worker('workers/chunk.js?v=settlement-network-2');
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
      chunkWorker.postMessage({ ...next, dimension, seed: Number(seed), settings: seed.factors ? worldSettings : undefined });
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
    ui.setMessage(state.time < state.messageUntil ? state.message : state.expeditionStatus || '');
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
      if (ev.code === 'KeyJ') {
        openFieldJournal();
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
    if (!running) return false;
    const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
    const characterSaved = profiles.saveCharacter(characterId, {
      inventory: inventory.serialize(),
      stats: { health: stats.health, maxHealth: stats.maxHealth,
        mana: stats.mana, maxMana: stats.maxMana },
      colours: state.colours,
      bestiary,
      cargoItems: openChest?.cargo ? openChest.items.filter(Boolean) : cargoItems,
      progress: state.progress,
      playedSeconds: carriedCharacterSeconds + elapsed
    });
    if (!characterSaved) return false;
    const realmRecord = {
      world: world.serialize(),
      wiring: wiring.serialize(),
      lowerOssuaryWiring: true,
      lensVaultWiring: true,
      archiveWiring: true,
      runawayMineWiring: true,
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
      enemyBanners: [...enemyBanners.values()],
      completedOrders: [...completedOrders],
      settlements: settlements.serialize(),
      defeatedBosses: [...defeatedBosses],
      storageItems,
      position: { x: state.player.x, y: state.player.y }
    };
    const patch = dimension === 'underworld' ? { underworld: realmRecord } : realmRecord;
    return profiles.saveWorld(worldId, { ...patch, activeDimension: dimension, portalLink,
      playedSeconds: carriedWorldSeconds + elapsed });
  }

  function resize() {
    const width = Math.max(1, canvas.clientWidth), height = Math.max(1, canvas.clientHeight);
    const mobile = !!window.matchMedia?.('(pointer: coarse)').matches;
    const budget = mobile ? 1000000 : 2400000;
    const dpr = Math.min(mobile ? 1.25 : 2, window.devicePixelRatio || 1, Math.sqrt(budget / (width * height)));
    const w = Math.max(1, Math.floor(width * dpr)), h = Math.max(1, Math.floor(height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }

  function boot(choice, destination) {
    worldChoice = choice;
    characterId = choice.character.id;
    worldId = choice.world.id;
    const characterRecord = profiles.loadCharacter(characterId) || {};
    bestiary = Object.assign(Object.create(null), characterRecord.bestiary || {});
    cargoItems = characterRecord.cargoItems || [];
    const record = profiles.loadWorld(worldId) || {};
    portalLink = record.portalLink || null;
    dimension = portalLink && (destination || record.activeDimension) === 'underworld' ? 'underworld' : 'overworld';
    worldgen = dimension === 'underworld' ? deps.underworld.makeUnderworldGenerator(overworldGenerator) : overworldGenerator;
    const worldRecord = dimension === 'underworld' ? record.underworld || {} : record;
    worldSettings = worldgen.normalizeWorldSettings(record.settings || choice.world.settings);
    worldRules = worldgen.worldSettingValues(worldSettings);
    seed = worldgen.generationSeed(choice.world.seed, worldSettings);

    world = chunks.makeWorld(seed, worldgen);
    startChunkWorker();
    if (worldRecord.world && worldRecord.world.seed === Number(seed)) world.restore(worldRecord.world);

    renderer = render.makeRenderer(canvas, { tiles, texture, autotile, light, worldgen, noise, sprite, webgl: deps.webgl });
    liquid = liquidModule.makeLiquid(world, tiles);
    swarm = enemyModule.makeSwarm(world, tiles, {
      worldgen, dungeonOpen: () => defeatedBosses.has('dungeonkeeper'),
      bossDefeated: key => defeatedBosses.has(key), bossBarrage: fireBossBarrage,
      enemyActivity: worldRules.enemies, bossHealth: worldRules.bossHealth,
      wyvernsUnlocked: () => defeatedBosses.has('starwyvern'), lensLit: lensSensorLit, siegeStrike: fireSiegeStrike
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
    mineSite = worldgen.runawayMineLayout(seed);
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
    if (mineSite && !worldRecord.runawayMineWiring) {
      for (let dx = 12; dx <= 24; dx += 1) wiring.add(mineSite.x + dx, mineSite.y + 24);
      for (const dx of [20, 24]) wiring.add(mineSite.x + dx, mineSite.y + 23);
      wiring.add(mineSite.x + 13, mineSite.y + 25);
    }
    if (lensSite && !worldRecord.lensVaultWiring) deps.wiring.seedLensWiring(wiring, lensSite);
    mechanistPhase = -1;
    minimap = minimapModule.makeMinimap(document.getElementById('minimap'),
      { tiles, worldgen });
    village = villagerModule.makeVillage(world, tiles, { housing });
    if (worldRecord.villagers) village.restore(worldRecord.villagers);
    townDevices = worldRecord.townDevices || [];
    enemyBanners = new Map((worldRecord.enemyBanners || []).filter(banner => enemyModule.BY_KEY[banner.species])
      .map(banner => [banner.x + ':' + banner.y, banner]));
    state.enemyBanners = enemyBanners;
    completedOrders = new Set(worldRecord.completedOrders || []);
    settlements = settlementModule.makeSettlementLedger(worldRecord.settlements);
    expedition = null;
    activePortalTrial = null;
    state.expeditionStatus = '';
    defeatedBosses = craft.restoreBossProgress(worldRecord.defeatedBosses);
    for (const key of worldRecord.defeatedBosses || []) {
      const spec = enemyModule.BY_KEY[key];
      if (spec?.boss) recordWildlife(spec);
    }
    if (defeatedBosses.has('prismsentinel') && !world.hardmode) world.enableHardmode();
    if (defeatedBosses.has('astralregent') && !world.astral) world.enableAstral();
    nextSkyAnchor = 0;
    nextAudioScene = nextRailSound = 0;
    audioScene = {};
    state.wardUntil = 0;
    storageItems = worldRecord.storageItems || [];
    state.villagers = village.list;
    state.settlementMarkers = () => townPylons().filter(device => settlements.town(device))
      .map(device => ({ x: device.x, y: device.y, rank: settlements.town(device).rank }));
    state.progress = Object.assign({ coins: 0, bars: 0, deaths: 0, deepest: 0 },
      characterRecord.progress || {});
    state.enemies = swarm.list;
    inventory = inventoryModule.makeInventory();
    stats = statsModule.makeStats();
    const hud = document.getElementById('hud');
    if (destination && hud) hud.textContent = '';
    ui = uiModule.makeUI(hud,
      { tiles, texture, inventory, atlas: renderer.atlas, mining, craft,
        controls: CONTROLS });
    state.itemArt = ui.itemArt;
    ui.onChestMove = chestMove;
    ui.onBuy = buyFrom;
    ui.onHeal = healFrom;
    ui.onSelectHotbar = index => { state.player.selected = index - inventory.section('hotbar').from; ui.sync(state); };
    ui.onCraft = (recipe) => {
      if (craft.craft(inventory, recipe)) {
        recordTownCraft(recipe);
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

    carriedCharacterSeconds = characterRecord.playedSeconds || choice.character.playedSeconds || 0;
    carriedWorldSeconds = record.playedSeconds || choice.world.playedSeconds || 0;
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
    const arrival = destination ? dimension === 'underworld'
      ? { x: 2, y: worldgen.SEA_LEVEL - 3 }
      : { x: portalLink.x + 0.1, y: portalLink.y + 1 - state.player.height }
      : worldRecord.position || worldRecord.spawn;
    if (arrival && !physics.overlapsSolid(world, tiles, arrival.x, arrival.y, state.player.width, state.player.height)) {
      state.player.x = arrival.x;
      state.player.y = arrival.y;
    }
    if (destination) {
      state.arrows = [];
      state.drops = [];
      state.particles = [];
      state.stars = [];
      state.hook = state.bobber = state.spirit = null;
      boundFocus = spiritMark = talking = null;
      swingCooldown = 0;
      lastView = null;
      input.left = input.right = input.jump = input.down = input.dig = false;
    }
    state.camera.x = state.player.x;
    state.camera.y = state.player.y;

    ui.build();
    running = true;
    if (touchControls) {
      touchControls.setPlaying(true);
      if (touchControls.active) state.camera.zoom = canvas.clientWidth < 600 ? 1.5 : 2;
    }
    if (destination) {
      say(dimension === 'underworld' ? 'The Underworld · The Return Gate is behind you' : 'Returned through the Underworld Gate', 5);
      return;
    }
    say((dimension === 'underworld' ? 'The Underworld' : choice.world.name) + ' \u2014 seed ' + seed + (touchControls?.active ? '. Tap the world to aim and dig. Bag opens the backpack.' : '. E opens the backpack.'), 7);
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
    get seed() { return Number(seed); },
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
