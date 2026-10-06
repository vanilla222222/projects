(function (root) {
  'use strict';

  const WORLD = { L: 1400, W: 800, towerR: 20, minGap: 44 };
  const MAX_WAVE = 100;
  const LIVES = 10;
  const SAVE_VER = 3;
  const SPAWN_GUARD = 15;
  const UNLOCK_AT = 50;
  const BASE_LEN = 1480;

  const TUNE = {
    hp0: 14,
    hpCurve: [[1, 1.25], [10, 1.21], [20, 1.2], [30, 1.185], [35, 1.16], [45, 1.17], [50, 1.15], [55, 1.09], [60, 1.085], [80, 1.072], [100, 1.058]],
    cash0: 2.2, cashGrowth: 1.2,
    clear0: 45, clearGrowth: 1.2,
    towerGrowth: 1.5, sellRate: 0.7,
    nodeBase: 0.6, nodeGrowth: 2.1,
    infBase: 4, infGrowth: 4, infMul: 1.25,
    startCash: 160,
  };

  const RACES = {
    earth: {
      id: 'earth', name: 'Earth Pony', cost: 50, range: 100, dmg: 9, rate: 0.85,
      body: '#d2a86c', mane: '#7a4a2a', accent: '#e3a95b',
      role: 'Melee stomper',
      ability: 'Stomp: every attack hits all ground DNBs in its short range. Cannot reach flyers or harm magical DNBs.',
    },
    unicorn: {
      id: 'unicorn', name: 'Unicorn', cost: 90, range: 175, dmg: 26, rate: 0.55,
      body: '#ece4f7', mane: '#8b5cf6', accent: '#a98bff',
      role: 'Arcane artillery',
      ability: 'Arcane Bolt: slow, heavy magic bolts. The only base pony that can harm magical DNBs. Cannot see flyers.',
    },
    pegasus: {
      id: 'pegasus', name: 'Pegasus', cost: 70, range: 150, dmg: 5, rate: 2.0,
      body: '#a9cdea', mane: '#4fd1c5', accent: '#4fd1c5',
      role: 'Sky skirmisher',
      ability: 'Skyward Eye: rapid feather darts. The only base pony that can see and hit flying DNBs. Cannot harm magical DNBs.',
    },
  };
  const RACE_IDS = ['earth', 'unicorn', 'pegasus'];

  function pct(v) { return Math.round(v * 100) + '%'; }

  const PATHS = {
    earth: [
      { id: 'stonehoof', name: 'Stonehoof', blurb: 'Harder stomps that rattle DNBs senseless.',
        node: '+20% damage. From node 5, stomps may stun.',
        sig: 'Earthshatter', sigDesc: 'Every 4th stomp deals 5x damage and stuns everything hit for 1s.',
        apply(lv, s) { s.dmg *= 1 + 0.2 * lv; if (lv >= 5) { s.stunCh = Math.max(s.stunCh, 0.15); s.stunDur = Math.max(s.stunDur, 0.4); } if (lv >= 10) s.sigs.push('earthshatter'); } },
      { id: 'leyhooves', name: 'Ley Hooves', blurb: 'Hooves tuned to the ley lines. Lets an earth pony hurt magical DNBs.',
        node: 'Node 1 unlocks damage to magical DNBs. +10% damage, +12% vs magical.',
        sig: 'Leyline Rupture', sigDesc: 'Stomps strip magic from DNBs for 3s so any pony can hit them, and deal double damage to magical foes.',
        apply(lv, s) { if (lv >= 1) s.canMagic = true; s.dmg *= 1 + 0.1 * lv; s.magicMul *= 1 + 0.12 * lv; if (lv >= 10) { s.magicMul *= 2; s.sigs.push('leyrupture'); } } },
      { id: 'harvest', name: 'Golden Harvest', blurb: 'A farmer\'s eye for value. Kills by this pony pay more.',
        node: '+8% cash from this pony\'s kills, +5% damage.',
        sig: 'Harvest Moon', sigDesc: 'Kills by this pony pay triple cash.',
        apply(lv, s) { s.cash += 0.08 * lv; s.dmg *= 1 + 0.05 * lv; if (lv >= 10) { s.cash *= 3; s.sigs.push('harvestmoon'); } } },
      { id: 'mudslide', name: 'Mudslide', blurb: 'Churned earth that bogs DNBs down.',
        node: '+5% range, stomps slow by +4% for 1.2s.',
        sig: 'Quagmire', sigDesc: 'A permanent bog: ground DNBs in range move at half speed and take 15% more damage.',
        apply(lv, s) { s.range *= 1 + 0.05 * lv; s.slow = Math.max(s.slow, 0.04 * lv); s.slowDur = Math.max(s.slowDur, 1.2); if (lv >= 10) s.sigs.push('quagmire'); } },
      { id: 'herdcall', name: 'Herd Call', blurb: 'A rallying whinny that lifts the whole herd.',
        node: 'Ponies within 170 gain +3% damage, this pony +3% attack speed.',
        sig: 'Stampede', sigDesc: 'The aura also grants +25% attack speed, and every 12s a stampede hits every ground DNB on the map for 6x damage.',
        apply(lv, s) { if (lv > 0) { s.auraR = 170; s.auraDmg += 0.03 * lv; } s.rate *= 1 + 0.03 * lv; if (lv >= 10) { s.auraRate += 0.25; s.sigs.push('stampede'); } } },
    ],
    unicorn: [
      { id: 'arcanist', name: 'Arcanist', blurb: 'Pure study of the destructive arts.',
        node: '+20% damage.',
        sig: 'Starfall', sigDesc: 'Every 6s a falling star strikes the toughest DNB in range for 12x damage in a wide blast that hits anything.',
        apply(lv, s) { s.dmg *= 1 + 0.2 * lv; if (lv >= 10) s.sigs.push('starfall'); } },
      { id: 'skyward', name: 'Skyward Sight', blurb: 'A far-seeing spell that tracks DNBs in the air.',
        node: 'Node 1 lets this unicorn target flyers. +6% range, +12% vs flyers.',
        sig: 'Aurora Lance', sigDesc: 'Bolts deal 3x damage to flyers and arc to 2 more flyers.',
        apply(lv, s) { if (lv >= 1) s.canFly = true; s.range *= 1 + 0.06 * lv; s.flyMul *= 1 + 0.12 * lv; if (lv >= 10) { s.flyMul *= 3; s.sigs.push('aurora'); } } },
      { id: 'chrono', name: 'Chronomancy', blurb: 'Bends the moments around each bolt.',
        node: 'Bolts slow by +4% for 1.5s, +5% attack speed.',
        sig: 'Time Stop', sigDesc: 'Every 10s freezes every DNB in range for 1.5s (bosses 0.5s).',
        apply(lv, s) { s.slow = Math.max(s.slow, 0.04 * lv); s.slowDur = Math.max(s.slowDur, 1.5); s.rate *= 1 + 0.05 * lv; if (lv >= 10) s.sigs.push('timestop'); } },
      { id: 'prismatic', name: 'Prismatic', blurb: 'Bolts that shatter into light on impact.',
        node: 'Bolts splash (radius grows), +6% damage.',
        sig: 'Prism Burst', sigDesc: 'Each bolt also splits into 4 shards that seek nearby DNBs for half damage.',
        apply(lv, s) { if (lv > 0) s.splash = Math.max(s.splash, 24 + 6 * lv); s.dmg *= 1 + 0.06 * lv; if (lv >= 10) s.sigs.push('prismburst'); } },
      { id: 'hexweaver', name: 'Hexweaver', blurb: 'Curses that make DNBs brittle for the whole herd.',
        node: 'Hits hex the target: it takes +4% damage from every source for 4s. +3% damage.',
        sig: 'Doomhex', sigDesc: 'Hexed DNBs burst on death, dealing 25% of their max HP to DNBs nearby.',
        apply(lv, s) { s.hex = Math.max(s.hex, 0.04 * lv); s.dmg *= 1 + 0.03 * lv; if (lv >= 10) s.sigs.push('doomhex'); } },
    ],
    pegasus: [
      { id: 'stormwing', name: 'Stormwing', blurb: 'Feathers charged with storm static.',
        node: 'Hits chain lightning to +1 DNB at nodes 2, 5 and 8. +6% damage.',
        sig: 'Thunderhead', sigDesc: 'Every 5s lightning strikes up to 8 DNBs in range for 5x damage.',
        apply(lv, s) { s.chain += (lv >= 2) + (lv >= 5) + (lv >= 8); s.dmg *= 1 + 0.06 * lv; if (lv >= 10) s.sigs.push('thunderhead'); } },
      { id: 'galeforce', name: 'Galeforce', blurb: 'Wingbeats that shove DNBs back down the road.',
        node: 'Hits push DNBs back (+5 each node), +5% attack speed.',
        sig: 'Cyclone', sigDesc: 'Every 9s a cyclone throws every non-boss DNB in range 150 back and stuns it.',
        apply(lv, s) { s.knock += 5 * lv; s.rate *= 1 + 0.05 * lv; if (lv >= 10) s.sigs.push('cyclone'); } },
      { id: 'swiftfeather', name: 'Swiftfeather', blurb: 'Faster, faster, faster.',
        node: '+12% attack speed.',
        sig: 'Sonic Rainboom', sigDesc: 'Every 15s a rainboom triples attack speed for 4s.',
        apply(lv, s) { s.rate *= 1 + 0.12 * lv; if (lv >= 10) s.sigs.push('rainboom'); } },
      { id: 'skyhunter', name: 'Skyhunter', blurb: 'A raptor\'s eye for anything with wings.',
        node: '+15% vs flyers, +2% crit chance (2.5x).',
        sig: 'Raptor Dive', sigDesc: 'Crits deal 5x to flyers, and non-boss flyers below 20% HP are executed.',
        apply(lv, s) { s.flyMul *= 1 + 0.15 * lv; s.crit += 0.02 * lv; if (lv >= 10) s.sigs.push('raptordive'); } },
      { id: 'volley', name: 'Feather Volley', blurb: 'Why throw one feather when you can throw five?',
        node: '+1 extra target at nodes 3, 6 and 9. +6% damage.',
        sig: 'Feather Storm', sigDesc: 'Every attack fires at every valid DNB in range.',
        apply(lv, s) { s.multi += (lv >= 3) + (lv >= 6) + (lv >= 9); s.dmg *= 1 + 0.06 * lv; if (lv >= 10) s.sigs.push('featherstorm'); } },
    ],
  };

  const ENEMIES = {
    basic: { id: 'basic', name: 'DNB Shambler', short: 'Shambler', trait: 'Plain and steady.', hp: 1, speed: 62, r: 13, cash: 1, color: '#8a6544', dark: '#4a3220' },
    fast: { id: 'fast', name: 'DNB Skitter', short: 'Skitter', trait: 'Fast and frail.', hp: 0.55, speed: 118, r: 11, cash: 0.8, color: '#a8805a', dark: '#5a3f26' },
    tanky: { id: 'tanky', name: 'DNB Brute', short: 'Brute', trait: 'Slow, with 3.4x HP.', hp: 3.4, speed: 38, r: 18, cash: 2.5, color: '#6b4c31', dark: '#36261a' },
    flying: { id: 'flying', name: 'DNB Duskwing', short: 'Duskwing', trait: 'Flies. Only pegasi and sky-sighted unicorns can hit it.', hp: 0.8, speed: 78, r: 12, cash: 1.3, flying: true, color: '#7d5c48', dark: '#3f2c22' },
    magical: { id: 'magical', name: 'DNB Hexling', short: 'Hexling', trait: 'Magical. Only unicorns and ley-hoofed earth ponies can hurt it.', hp: 1.3, speed: 56, r: 13, cash: 1.5, magical: true, color: '#86606a', dark: '#46303a' },
    boss: { id: 'boss', name: 'Boss', short: 'Boss', trait: 'A wave boss. Leaking it costs 5 lives.', hp: 26, speed: 36, r: 26, cash: 20, color: '#5e3f28', dark: '#2c1c12' },
  };

  const BOSSES = [
    { id: 'mudmaw', name: 'Mudmaw', trick: 'burrow', hpMul: 1, desc: 'Burrows underground every few seconds and cannot be hit while buried.', color: '#7a5634', dark: '#3a2616' },
    { id: 'mother-mire', name: 'Mother Mire', trick: 'brood', hpMul: 0.9, desc: 'Spits out a brood of Shamblers each time she loses a quarter of her HP.', color: '#6e5a3a', dark: '#352a1a' },
    { id: 'skyrend', name: 'Skyrend', trick: 'flying', hpMul: 0.55, desc: 'A winged brute. Only pegasi and sky-sighted unicorns can hit it.', color: '#6b4d3c', dark: '#33231a' },
    { id: 'hexhulk', name: 'The Hexhulk', trick: 'magical', hpMul: 0.55, desc: 'Wrapped in dark magic. Only unicorns and ley-hoofed earth ponies can hurt it.', color: '#6e4a5c', dark: '#35222c' },
    { id: 'gloamrunner', name: 'Gloamrunner', trick: 'sprint', hpMul: 1, desc: 'Breaks into a triple-speed sprint every 6 seconds.', color: '#8a6040', dark: '#432c1a' },
    { id: 'bramble-king', name: 'Bramble King', trick: 'regen', hpMul: 0.5, desc: 'Regrows 1.5% HP per second and heals DNBs around him.', color: '#5c5a34', dark: '#2c2a16' },
    { id: 'duskwraith', name: 'Duskwraith', trick: 'phase', hpMul: 0.6, desc: 'Flickers between flying and magical forms every 4 seconds.', color: '#5a4660', dark: '#2a2030' },
    { id: 'colossus', name: 'Stonehide Colossus', trick: 'armor', hpMul: 0.8, desc: 'A stone shell blocks 60% of damage until it drops below half HP.', color: '#6a6258', dark: '#34302a' },
    { id: 'twin-shade', name: 'Twin Shade', trick: 'split', hpMul: 0.17, desc: 'Splits into two smaller shades when slain.', color: '#4e3a30', dark: '#241a14' },
    { id: 'nightmother', name: 'The Nightmother', trick: 'mother', hpMul: 0.16, desc: 'Sprints and summons, then takes to the air, then turns magical and regrows.', color: '#3e2a3a', dark: '#1c121a' },
  ];

  const MAP_BOSSES = {
    woods: [
      { id: 'thornback', name: 'Thornback Boar', hpMul: 0.85, desc: 'Charges in bursts of 2.6x speed every 5s. Its thorny hide blocks 40% of damage until it drops below 70% HP.', color: '#6a5232', dark: '#33261a',
        tricks: { sprint: { every: 5, dur: 1.6, mul: 2.6 }, armor: { cut: 0.4, until: 0.7 } }, look: { horns: 'tusk', spikes: true, eyes: '#ffb04a' } },
      { id: 'hollow-stag', name: 'Hollow Stag', hpMul: 0.95, desc: 'Fades into the trees every 4.5s and cannot be hit while hidden.', color: '#5e6650', dark: '#2c3226',
        tricks: { burrow: { every: 4.5, dur: 1.4 } }, look: { horns: 'antler', eyes: '#d8f0a0' } },
      { id: 'mossmother', name: 'Mossmother', hpMul: 0.8, desc: 'Sheds a pack of 5 Skitters every time she loses a fifth of her HP.', color: '#4f6a3a', dark: '#26341c',
        tricks: { brood: { type: 'fast', n: 5, at: [0.8, 0.6, 0.4, 0.2] } }, look: { horns: 'ears', aura: '#7fd66a', eyes: '#c8ff8a' } },
      { id: 'owlbear-shade', name: 'Owlbear Shade', hpMul: 0.55, desc: 'A winged beast that swoops at 2x speed every 6s. Only pegasi and sky-sighted unicorns can hit it.', color: '#6a5a4a', dark: '#342a22',
        tricks: { fly: true, sprint: { every: 6, dur: 1.4, mul: 2 } }, look: { horns: 'ears', eyes: '#ffe066' } },
      { id: 'willow-wisp', name: 'Willow Wisp', hpMul: 0.5, desc: 'A drifting magical light that blinks 110 paces ahead every 6s.', color: '#6a7a86', dark: '#2e3640',
        tricks: { magic: true, blink: { every: 6, dist: 110 } }, look: { horns: 'none', aura: '#9fe8ff', eyes: '#e8ffff', size: 0.9 } },
      { id: 'rootcrawler', name: 'Rootcrawler', hpMul: 0.7, desc: 'Burrows for 2s every 4s and regrows 1% HP per second.', color: '#5c4a30', dark: '#2a2014',
        tricks: { burrow: { every: 4, dur: 2 }, regen: { rate: 0.01 } }, look: { horns: 'spike', spikes: true, eyes: '#ff9a5a' } },
      { id: 'fungal-titan', name: 'Fungal Titan', hpMul: 0.5, desc: 'Regrows 1.2% HP per second, heals nearby DNBs, and bursts into Shamblers at half HP.', color: '#7a5a6a', dark: '#3a2a34',
        tricks: { regen: { rate: 0.012, aura: 140 }, brood: { type: 'basic', n: 6, at: [0.5] } }, look: { horns: 'curl', aura: '#d68bff', eyes: '#ffd0f0', size: 1.15 } },
      { id: 'barkskin-warden', name: 'Barkskin Warden', hpMul: 0.75, desc: 'Every 6s it hardens its bark for 3s, blocking 70% of damage.', color: '#6b5436', dark: '#33281a',
        tricks: { shell: { every: 6, dur: 3, cut: 0.7 } }, look: { horns: 'antler', spikes: true, eyes: '#ffcf6a', size: 1.1 } },
      { id: 'twin-dryads', name: 'Twin Dryads', hpMul: 0.32, desc: 'Two dryads walk together. Each one quickens the DNBs around her by 50%.', color: '#5a7a4a', dark: '#2a3a22',
        tricks: { twin: true, haste: { r: 140, mul: 1.5 } }, look: { horns: 'ears', aura: '#9fe39a', eyes: '#f0ffc8', size: 0.9 } },
      { id: 'elder-blight', name: 'The Elder Blight', hpMul: 0.17, desc: 'Armored and spawning Skitters, then airborne and hastening its kin, then magical and regrowing.', color: '#3a3a26', dark: '#1a1a10',
        tricks: { brood: { type: 'fast', n: 5, at: [0.85, 0.7] }, stages: [{ above: 0.66, armor: { cut: 0.5, until: 0 } }, { above: 0.33, fly: true, haste: { r: 160, mul: 1.5 } }, { above: 0, magic: true, regen: { rate: 0.015, aura: 120 } }] },
        look: { horns: 'antler', spikes: true, aura: '#8aff6a', eyes: '#c8ff3a', size: 1.2 } },
    ],
    caverns: [
      { id: 'geode-grub', name: 'Geode Grub', hpMul: 0.95, desc: 'Tunnels through the rock for 1.8s every 5s.', color: '#6a5a6e', dark: '#342a36',
        tricks: { burrow: { every: 5, dur: 1.8 } }, look: { horns: 'none', spikes: true, eyes: '#c8a8ff' } },
      { id: 'shardling-queen', name: 'Shardling Queen', hpMul: 0.8, desc: 'Sheds 4 Hexlings each time she loses a quarter of her HP.', color: '#7a5a86', dark: '#3a2a40',
        tricks: { brood: { type: 'magical', n: 4, at: [0.75, 0.5, 0.25] } }, look: { horns: 'spike', aura: '#c08bff', eyes: '#f0c8ff' } },
      { id: 'quartz-golem', name: 'Quartz Golem', hpMul: 0.7, desc: 'Crystal plating blocks 65% of damage until it drops below half HP.', color: '#8a8a96', dark: '#44444c',
        tricks: { armor: { cut: 0.65, until: 0.5 } }, look: { horns: 'spike', spikes: true, eyes: '#a8f0ff', size: 1.15 } },
      { id: 'glimmer-moth', name: 'Glimmer Moth', hpMul: 0.55, desc: 'Flies, and blinks 120 paces ahead every 5s.', color: '#8a7a5a', dark: '#44382a',
        tricks: { fly: true, blink: { every: 5, dist: 120 } }, look: { horns: 'curl', aura: '#ffe9a8', eyes: '#fff2c8', size: 0.9 } },
      { id: 'echo-bat-lord', name: 'Echo Bat Lord', hpMul: 0.5, desc: 'Flies, and screeches out 4 Duskwings each time it loses a quarter of its HP.', color: '#5a4a5e', dark: '#2a2030',
        tricks: { fly: true, brood: { type: 'flying', n: 4, at: [0.75, 0.5, 0.25] } }, look: { horns: 'ears', eyes: '#ff6a8a' } },
      { id: 'amethyst-hex', name: 'Amethyst Hex', hpMul: 0.45, desc: 'Magical. Regrows 1.2% HP per second and heals nearby DNBs.', color: '#7a4a8a', dark: '#3a2244',
        tricks: { magic: true, regen: { rate: 0.012, aura: 120 } }, look: { horns: 'curl', aura: '#c08bff', eyes: '#e8b0ff' } },
      { id: 'prism-wyrm', name: 'Prism Wyrm', hpMul: 0.55, desc: 'Flickers between flying and magical forms every 3.5s and lunges at 2.4x speed every 7s.', color: '#5a6a8a', dark: '#2a3244',
        tricks: { phase: { every: 3.5 }, sprint: { every: 7, dur: 1.2, mul: 2.4 } }, look: { horns: 'spike', aura: '#9fd0ff', eyes: '#c8f0ff', size: 1.1 } },
      { id: 'deepvein-twins', name: 'Deepvein Twins', hpMul: 0.35, desc: 'One twin takes each tunnel. Both burrow for 1.5s every 5s.', color: '#6a4a3a', dark: '#34241a',
        tricks: { twin: true, burrow: { every: 5, dur: 1.5 } }, look: { horns: 'tusk', spikes: true, eyes: '#ffa86a' } },
      { id: 'obsidian-colossus', name: 'Obsidian Colossus', hpMul: 0.22, desc: 'Every 5s its obsidian shell blocks 75% of damage for 2.5s. Shatters into 3 shards when slain.', color: '#3a3440', dark: '#1a161e',
        tricks: { shell: { every: 5, dur: 2.5, cut: 0.75 }, split: { n: 3, frac: 0.2, name: 'Obsidian Shard' } }, look: { horns: 'spike', spikes: true, eyes: '#ff5a3a', size: 1.25 } },
      { id: 'crystal-heart', name: 'The Crystal Heart', hpMul: 0.15, desc: 'Magical and shelled, then flickering between forms, then airborne, regrowing and hastening every DNB near it.', color: '#8a5aa0', dark: '#40244e',
        tricks: { stages: [{ above: 0.66, magic: true, shell: { every: 5, dur: 2.5, cut: 0.6 } }, { above: 0.33, phase: { every: 3 } }, { above: 0, fly: true, regen: { rate: 0.012, aura: 140 }, haste: { r: 170, mul: 1.6 } }] },
        look: { horns: 'spike', spikes: true, aura: '#f08bff', eyes: '#ffe0ff', size: 1.2 } },
    ],
    cliffs: [
      { id: 'gale-harpy', name: 'Gale Harpy', hpMul: 0.55, desc: 'Flies and rides the wind: gusts never push her back, and she surges at 2x speed during them.', color: '#6a6a7a', dark: '#32323c',
        tricks: { fly: true, windrider: true }, look: { horns: 'ears', eyes: '#ffe066' } },
      { id: 'cliff-crusher', name: 'Cliff Crusher', hpMul: 0.7, desc: 'A rock shell blocks 60% of damage above half HP, and it charges at 2.4x speed every 6s.', color: '#6a6256', dark: '#34302a',
        tricks: { armor: { cut: 0.6, until: 0.5 }, sprint: { every: 6, dur: 1.4, mul: 2.4 } }, look: { horns: 'tusk', spikes: true, eyes: '#ffb04a', size: 1.15 } },
      { id: 'thunder-ram', name: 'Thunder Ram', hpMul: 0.9, desc: 'Charges at 3.5x speed for 1.2s every 4s.', color: '#7a6a4a', dark: '#3a3222',
        tricks: { sprint: { every: 4, dur: 1.2, mul: 3.5 } }, look: { horns: 'curl', eyes: '#a8e0ff' } },
      { id: 'squall-brood', name: 'Squall Brood', hpMul: 0.5, desc: 'Flies, and releases 5 Duskwings each time it loses a quarter of its HP.', color: '#5a6a7a', dark: '#2a323c',
        tricks: { fly: true, brood: { type: 'flying', n: 5, at: [0.75, 0.5, 0.25] } }, look: { horns: 'ears', aura: '#9fd0ff', eyes: '#c8f0ff' } },
      { id: 'rain-wraith', name: 'Rain Wraith', hpMul: 0.5, desc: 'Magical. Regrows 1.5% HP per second and heals the DNBs around it.', color: '#4a5a6e', dark: '#222a36',
        tricks: { magic: true, regen: { rate: 0.015, aura: 130 } }, look: { horns: 'none', aura: '#7fb8ff', eyes: '#d0e8ff' } },
      { id: 'rockslide', name: 'Rockslide', hpMul: 0.22, desc: 'Plated in stone above 60% HP, and breaks into 4 boulders when slain.', color: '#7a6e5e', dark: '#3a342c',
        tricks: { armor: { cut: 0.5, until: 0.6 }, split: { n: 4, frac: 0.17, name: 'Boulder' } }, look: { horns: 'spike', spikes: true, eyes: '#ffcf6a', size: 1.2 } },
      { id: 'stormcaller', name: 'Stormcaller', hpMul: 0.6, desc: 'Quickens every DNB within 180 by 60%, and wraps itself in a storm shell for 2s every 6s.', color: '#5a5a7a', dark: '#2a2a3c',
        tricks: { haste: { r: 180, mul: 1.6 }, shell: { every: 6, dur: 2, cut: 0.7 } }, look: { horns: 'curl', aura: '#bfe8ff', eyes: '#ffffff' } },
      { id: 'lightning-drake', name: 'Lightning Drake', hpMul: 0.45, desc: 'Flies, rides the wind, and blinks 130 paces ahead every 5s.', color: '#4a5a8a', dark: '#222a44',
        tricks: { fly: true, windrider: true, blink: { every: 5, dist: 130 } }, look: { horns: 'spike', aura: '#e6f4ff', eyes: '#fff27a', size: 1.1 } },
      { id: 'tempest-twins', name: 'Tempest Twins', hpMul: 0.3, desc: 'A pair that flickers between flying and magical forms every 4s.', color: '#5a6a86', dark: '#2a3240',
        tricks: { twin: true, phase: { every: 4 } }, look: { horns: 'ears', aura: '#9fd0ff', eyes: '#e8f4ff' } },
      { id: 'eye-of-storm', name: 'The Eye of the Storm', hpMul: 0.15, desc: 'Charging behind a shell, then airborne and riding the wind, then magical, regrowing and hastening.', color: '#3a4a6a', dark: '#1a2234',
        tricks: { windrider: true, stages: [{ above: 0.66, shell: { every: 5, dur: 2.5, cut: 0.6 }, sprint: { every: 6, dur: 1.4, mul: 2.5 } }, { above: 0.33, fly: true, brood: { type: 'flying', n: 5, at: [0.6, 0.45] } }, { above: 0, magic: true, regen: { rate: 0.015, aura: 140 }, haste: { r: 180, mul: 1.6 } }] },
        look: { horns: 'curl', spikes: true, aura: '#bfe8ff', eyes: '#ffffff', size: 1.25 } },
    ],
    castle: [
      { id: 'gargoyle', name: 'Gargoyle Sentinel', hpMul: 0.5, desc: 'Flies, and turns to stone for 2.5s every 5s, blocking 80% of damage.', color: '#5e5a62', dark: '#2c2a30',
        tricks: { fly: true, shell: { every: 5, dur: 2.5, cut: 0.8 } }, look: { horns: 'curl', spikes: true, eyes: '#ff6a5a' } },
      { id: 'iron-knight', name: 'Iron Knight', hpMul: 0.65, desc: 'Plate armor blocks 70% of damage until it drops below 40% HP.', color: '#6a6e78', dark: '#34363c',
        tricks: { armor: { cut: 0.7, until: 0.4 } }, look: { horns: 'spike', eyes: '#ff8a5a', size: 1.1 } },
      { id: 'hound-pack', name: 'Shadow Hound Pack', hpMul: 0.28, desc: 'Lunges at 2.5x speed every 5s and splits into 3 hounds when slain.', color: '#3e3434', dark: '#1c1616',
        tricks: { sprint: { every: 5, dur: 1.2, mul: 2.5 }, split: { n: 3, frac: 0.3, name: 'Shadow Hound' } }, look: { horns: 'ears', eyes: '#ff3a3a' } },
      { id: 'banshee', name: 'Banshee', hpMul: 0.5, desc: 'Flickers between flying and magical forms every 3s, and her wail quickens DNBs within 150 by 50%.', color: '#6a6a7e', dark: '#32323e',
        tricks: { phase: { every: 3 }, haste: { r: 150, mul: 1.5 } }, look: { horns: 'none', aura: '#d0d8ff', eyes: '#e8f0ff' } },
      { id: 'plague-abbot', name: 'Plague Abbot', hpMul: 0.42, desc: 'Magical. Regrows 1% HP per second, heals nearby DNBs, and calls 4 Hexlings at each third of his HP.', color: '#5a6a4a', dark: '#2a3222',
        tricks: { magic: true, regen: { rate: 0.01, aura: 130 }, brood: { type: 'magical', n: 4, at: [0.66, 0.33] } }, look: { horns: 'curl', aura: '#a8e06a', eyes: '#d8ff8a' } },
      { id: 'siege-engine', name: 'Dread Siege Engine', hpMul: 0.55, desc: 'Armored above 60% HP, and unloads 3 Brutes at each quarter of its HP.', color: '#5a4a3a', dark: '#2a221a',
        tricks: { armor: { cut: 0.5, until: 0.6 }, brood: { type: 'tanky', n: 3, at: [0.75, 0.5, 0.25] } }, look: { horns: 'tusk', spikes: true, eyes: '#ffb04a', size: 1.25 } },
      { id: 'phantom-duelist', name: 'Phantom Duelist', hpMul: 0.6, desc: 'Steps out of reality for 1.4s every 4.5s, and blinks 100 paces ahead every 6s.', color: '#5a4a6a', dark: '#2a2234',
        tricks: { burrow: { every: 4.5, dur: 1.4 }, blink: { every: 6, dist: 100 } }, look: { horns: 'spike', aura: '#b48bff', eyes: '#e0c8ff' } },
      { id: 'gate-wardens', name: 'Twin Gate Wardens', hpMul: 0.35, desc: 'One warden at each gate. Each hardens for 2.5s every 5s, blocking 70% of damage.', color: '#6a5a4a', dark: '#342a22',
        tricks: { twin: true, shell: { every: 5, dur: 2.5, cut: 0.7 } }, look: { horns: 'antler', spikes: true, eyes: '#ffd27a', size: 1.1 } },
      { id: 'lich-regent', name: 'The Lich Regent', hpMul: 0.2, desc: 'Magical. Regrows 1.2% HP per second, calls Hexlings at each third of his HP, and splits into 2 liches when slain.', color: '#4a3e5a', dark: '#221c2c',
        tricks: { magic: true, regen: { rate: 0.012, aura: 140 }, brood: { type: 'magical', n: 5, at: [0.66, 0.33] }, split: { n: 2, frac: 0.25, name: 'Lesser Lich' } }, look: { horns: 'spike', aura: '#a08bff', eyes: '#8affd8', size: 1.15 } },
      { id: 'shadow-queen', name: 'The Shadow Queen', hpMul: 0.14, desc: 'Shelled and sprinting, then airborne with Duskwings, then magical, regrowing and hastening. Splits into 2 shades when slain.', color: '#2e2234', dark: '#140e18',
        tricks: { split: { n: 2, frac: 0.2, name: 'Queen\'s Shade' }, stages: [{ above: 0.66, shell: { every: 5, dur: 2.5, cut: 0.65 }, sprint: { every: 6, dur: 1.4, mul: 2.5 } }, { above: 0.33, fly: true, brood: { type: 'flying', n: 5, at: [0.6, 0.45] } }, { above: 0, magic: true, regen: { rate: 0.015, aura: 150 }, haste: { r: 180, mul: 1.6 } }] },
        look: { horns: 'curl', spikes: true, aura: '#c06bff', eyes: '#ff4a8a', size: 1.3 } },
    ],
  };

  function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashSeed(a, b, c) {
    let h = (a >>> 0) ^ Math.imul(b | 0, 0x9E3779B1) ^ Math.imul((c | 0) + 1, 0x85EBCA77);
    h = Math.imul(h ^ (h >>> 16), 0x7FEB352D);
    h = Math.imul(h ^ (h >>> 15), 0x846CA68B);
    return (h ^ (h >>> 16)) >>> 0;
  }

  const WAVEGEN = {
    count: { base: 8, per: 0.45, bossMul: 0.6 },
    gap: { base: 1.05, per: 0.007, min: 0.38, jitter: 0.4 },
    spacing: { tanky: 1.4, fast: 0.6 },
    types: [
      { id: 'basic', from: 1, w: 10, theme: 0 },
      { id: 'fast', from: 3, w: 4, theme: 10 },
      { id: 'tanky', from: 5, w: 3, theme: 6 },
      { id: 'flying', from: 6, w: 3, theme: 8 },
      { id: 'magical', from: 8, w: 3, theme: 8 },
    ],
    themes: [
      { id: 'boss', mod: 10, rem: 0 },
      { id: 'flying', at: [6], mod: 9, rem: 0 },
      { id: 'magical', at: [8], mod: 11, rem: 6 },
      { id: 'fast', mod: 7, rem: 0 },
      { id: 'tanky', mod: 8, rem: 4 },
    ],
    bossEvery: 10, bossLead: 1.5,
  };

  function waveVariant(o) {
    const g = JSON.parse(JSON.stringify(WAVEGEN));
    if (o.count) Object.assign(g.count, o.count);
    if (o.gap) Object.assign(g.gap, o.gap);
    if (o.types) for (const ty of g.types) if (o.types[ty.id]) Object.assign(ty, o.types[ty.id]);
    if (o.themes) g.themes = o.themes;
    return g;
  }

  function spiralArm(cx, cy, sx, sy, r0, r1, a0, span, lead, steps) {
    const pts = [lead];
    for (let i = 0; i <= steps; i++) {
      const k = i / steps, a = a0 + span * k, r = r0 + (r1 - r0) * k;
      pts.push([Math.round(cx + Math.cos(a) * r * sx), Math.round(cy + Math.sin(a) * r * sy)]);
    }
    pts.push([cx, cy]);
    return pts;
  }

  function segDist(px, py, pts) {
    let best = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1;
      const k = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
      best = Math.min(best, Math.hypot(px - x1 - dx * k, py - y1 - dy * k));
    }
    return best;
  }

  function scatter(o) {
    const rng = mulberry(o.seed), keep = o.keep || [], out = keep.slice();
    for (let tries = 0; tries < 6000 && out.length < o.n + keep.length; tries++) {
      const x = o.x0 + rng() * (o.x1 - o.x0), y = o.y0 + rng() * (o.y1 - o.y0), r = o.rmin + rng() * (o.rmax - o.rmin);
      let ok = true;
      for (const R of o.routes) if (segDist(x, y, R) < o.half + r + o.pad) { ok = false; break; }
      if (ok) for (const b of out) if (Math.hypot(b.x - x, b.y - y) < b.r + r + o.gap) { ok = false; break; }
      if (ok) out.push({ x: Math.round(x), y: Math.round(y), r: Math.round(r), kind: o.kind });
    }
    return out;
  }

  const WOODS_ROUTE = [[-40, 140], [1080, 140], [1080, 400], [320, 400], [320, 660], [1440, 660]];
  const CAVE_A = [[-40, 400], [380, 400], [540, 210], [980, 210], [1140, 130], [1440, 130]];
  const CAVE_B = [[-40, 400], [380, 400], [540, 590], [980, 590], [1140, 670], [1440, 670]];
  const CLIFF_ROUTE = [[-40, 330], [950, 330], [950, 640], [480, 640], [480, 110], [1440, 110]];
  const CASTLE_A = spiralArm(700, 400, 1.55, 0.9, 380, 92, Math.PI, Math.PI * 2, [-40, 400], 72);
  const CASTLE_B = spiralArm(700, 400, 1.55, 0.9, 380, 92, 0, Math.PI * 2, [1440, 400], 72);
  const CRYSTALS = [{ x: 760, y: 400, r: 140 }, { x: 250, y: 250, r: 140 }, { x: 250, y: 560, r: 140 }, { x: 1230, y: 400, r: 140 }, { x: 760, y: 70, r: 140 }, { x: 760, y: 735, r: 140 }];

  const MAPS = {
    moonlit: {
      id: 'moonlit', name: 'Moonlit Road', order: 1,
      blurb: 'A straight road under the moon. Where every herd begins.',
      feature: 'One straight road',
      routes: [[[-40, 400], [1440, 400]]],
      half: 38,
      blocks: [],
      hpMul: 1, cashMul: 1, startCash: 0,
      bosses: ['mudmaw', 'mother-mire', 'skyrend', 'hexhulk', 'gloamrunner', 'bramble-king', 'duskwraith', 'colossus', 'twin-shade', 'nightmother'],
      waves: WAVEGEN,
      palette: {
        ground: ['#1d2a2c', '#141c22', '#0a0b13'], grass: ['rgba(90,140,110,.22)', 'rgba(60,100,90,.25)'],
        flowers: ['#c9a0dc', '#a0c4ff', '#ffe1a8'], rock: 'rgba(70,72,90,.55)',
        road: ['#3a2c2a', '#4d3a33'], roadEdge: 'rgba(20,14,12,.6)', roadLine: 'rgba(255,230,200,.07)', pebble: 'rgba(120,100,90,.35)',
        tree: '#0c1210', gate: '#e3c15b',
      },
      decor: { grass: 900, flowers: 40, rocks: 26, trees: 9, seed: 1234 },
    },
    woods: {
      id: 'woods', name: 'Whispering Woods', order: 2,
      blurb: 'A winding trail through old trees. The trunks leave little room to build, and Skitters love the cover.',
      feature: 'Winding S-path, trees block building',
      routes: [WOODS_ROUTE],
      half: 36,
      blocks: scatter({ seed: 4242, n: 38, x0: 20, x1: 1380, y0: 20, y1: 780, rmin: 17, rmax: 27, routes: [WOODS_ROUTE], half: 36, pad: 6, gap: 10, kind: 'tree' }),
      hpMul: 1, cashMul: 1, startCash: 0,
      bosses: MAP_BOSSES.woods.map(b => b.id),
      waves: waveVariant({ count: { base: 9 }, types: { fast: { from: 2, w: 7, theme: 10 }, tanky: { w: 2 } } }),
      palette: {
        ground: ['#1a2a1c', '#111c14', '#080d0a'], grass: ['rgba(100,160,90,.26)', 'rgba(60,120,70,.28)'],
        flowers: ['#e8f0a0', '#c8ffb0', '#ffd0e0'], rock: 'rgba(60,70,60,.6)',
        road: ['#3a3022', '#4a3c2a'], roadEdge: 'rgba(16,12,8,.6)', roadLine: 'rgba(230,240,200,.06)', pebble: 'rgba(110,100,80,.35)',
        tree: '#0a140c', gate: '#b8e36a', canopy: ['#1f3a22', '#2a4a2a', '#183020'],
      },
      decor: { grass: 1200, flowers: 34, rocks: 8, trees: 7, seed: 2222 },
    },
    caverns: {
      id: 'caverns', name: 'Crystal Caverns', order: 3,
      blurb: 'The tunnel forks and DNBs split between two exits. It is dark down here: ponies see 35% less far unless they stand in a crystal\'s glow.',
      feature: 'Forked path, two exits, darkness',
      routes: [CAVE_A, CAVE_B],
      half: 34,
      dark: { range: 0.65 },
      crystals: CRYSTALS,
      blocks: scatter({ seed: 777, n: 14, x0: 20, x1: 1380, y0: 20, y1: 780, rmin: 12, rmax: 20, routes: [CAVE_A, CAVE_B], half: 34, pad: 8, gap: 30, kind: 'stalagmite',
        keep: CRYSTALS.map(c => ({ x: c.x, y: c.y, r: 16, kind: 'crystal' })) }),
      hpMul: 1, cashMul: 1, startCash: 0,
      bosses: MAP_BOSSES.caverns.map(b => b.id),
      waves: waveVariant({ types: { magical: { from: 5, w: 6, theme: 10 }, flying: { w: 2 } } }),
      palette: {
        ground: ['#1a1830', '#100e20', '#06050c'], grass: ['rgba(120,100,180,.14)', 'rgba(80,70,140,.16)'],
        flowers: ['#a8f0ff', '#d0a8ff', '#ffc8f0'], rock: 'rgba(60,56,84,.7)',
        road: ['#2a2434', '#383044'], roadEdge: 'rgba(8,6,14,.7)', roadLine: 'rgba(200,180,255,.06)', pebble: 'rgba(120,110,150,.3)',
        tree: '#0a0814', gate: '#c8a8ff', crystal: ['#b48bff', '#7fe8ff', '#ffb0f0'],
      },
      decor: { grass: 500, flowers: 60, rocks: 30, trees: 0, seed: 3333 },
    },
    cliffs: {
      id: 'cliffs', name: 'Stormy Cliffs', order: 4,
      blurb: 'The road loops back over itself on an old bridge. Gusts sweep the cliffs every few seconds and shove flyers around.',
      feature: 'Self-crossing bridge, wind gusts move flyers',
      routes: [CLIFF_ROUTE],
      half: 34,
      wind: { every: 14, dur: 3.2, warn: 2.2, push: 120, side: 70, bossMul: 0.4 },
      blocks: scatter({ seed: 9191, n: 16, x0: 20, x1: 1380, y0: 20, y1: 780, rmin: 16, rmax: 30, routes: [CLIFF_ROUTE], half: 34, pad: 8, gap: 24, kind: 'boulder' }),
      hpMul: 1, cashMul: 1, startCash: 0,
      bosses: MAP_BOSSES.cliffs.map(b => b.id),
      waves: waveVariant({ types: { flying: { from: 3, w: 6, theme: 10 } }, themes: [{ id: 'boss', mod: 10, rem: 0 }, { id: 'flying', at: [3], mod: 6, rem: 0 }, { id: 'magical', at: [8], mod: 11, rem: 6 }, { id: 'fast', mod: 7, rem: 0 }, { id: 'tanky', mod: 8, rem: 4 }] }),
      palette: {
        ground: ['#24282e', '#181c22', '#0b0d12'], grass: ['rgba(140,150,130,.18)', 'rgba(100,110,100,.2)'],
        flowers: ['#d0d8e0', '#a8c0e0', '#fff0c0'], rock: 'rgba(80,84,92,.7)',
        road: ['#3a3634', '#4a4440'], roadEdge: 'rgba(14,12,12,.65)', roadLine: 'rgba(230,230,240,.07)', pebble: 'rgba(130,126,120,.35)',
        tree: '#0e1012', gate: '#9fd0ff', bridge: ['#5a4430', '#7a5c40', '#3a2a1c'],
      },
      decor: { grass: 600, flowers: 20, rocks: 50, trees: 5, seed: 4444 },
    },
    castle: {
      id: 'castle', name: 'Castle of Shadows', order: 5,
      blurb: 'Two gates, two spiral roads, one keep. The largest waves and the cruellest bosses march here.',
      feature: 'Double spiral, two spawn gates, hardest waves',
      routes: [CASTLE_A, CASTLE_B],
      half: 30,
      blocks: scatter({ seed: 5150, n: 8, x0: 20, x1: 1380, y0: 20, y1: 780, rmin: 14, rmax: 18, routes: [CASTLE_A, CASTLE_B], half: 30, pad: 6, gap: 60, kind: 'pillar',
        keep: [{ x: 700, y: 400, r: 46, kind: 'keep' }] }),
      hpMul: 1, cashMul: 1, startCash: 0,
      bosses: MAP_BOSSES.castle.map(b => b.id),
      waves: waveVariant({ count: { base: 11, per: 0.55 }, types: { basic: { w: 8 }, fast: { from: 2, w: 5 }, tanky: { from: 3, w: 4 }, flying: { from: 4, w: 4 }, magical: { from: 5, w: 4 } } }),
      palette: {
        ground: ['#221a26', '#16101a', '#08060a'], grass: ['rgba(120,90,130,.14)', 'rgba(90,70,100,.16)'],
        flowers: ['#ff8a9a', '#c8a0ff', '#ffd0a0'], rock: 'rgba(64,58,70,.75)',
        road: ['#2e2a30', '#3c363e'], roadEdge: 'rgba(8,6,10,.7)', roadLine: 'rgba(255,200,220,.06)', pebble: 'rgba(110,100,116,.35)',
        tree: '#0a080c', gate: '#ff6a8a', stone: ['#3a343e', '#4a424e', '#2a2430'],
      },
      decor: { grass: 300, flowers: 24, rocks: 30, trees: 0, seed: 5555 },
    },
  };
  const MAP_IDS = ['moonlit', 'woods', 'caverns', 'cliffs', 'castle'];
  const BOSS_BY_ID = {};
  for (const b of BOSSES) BOSS_BY_ID[b.id] = b;
  for (const k in MAP_BOSSES) for (const b of MAP_BOSSES[k]) { b.map = k; BOSS_BY_ID[b.id] = b; }

  function buildRoute(pts) {
    const segs = [];
    let len = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      const l = Math.hypot(x2 - x1, y2 - y1);
      if (l < 0.001) continue;
      segs.push({ x1, y1, x2, y2, tx: (x2 - x1) / l, ty: (y2 - y1) / l, l, s: len });
      len += l;
    }
    return { pts, segs, len };
  }
  for (const id of MAP_IDS) {
    const m = MAPS[id];
    m.route = m.routes.map(buildRoute);
    m.maxLen = Math.max(...m.route.map(r => r.len));
    m.bossList = m.bosses.map(b => BOSS_BY_ID[b]);
  }

  function getMap(id) { return MAPS[id] || MAPS.moonlit; }
  function mapOf(S) { return getMap(S.map); }

  function routePos(P, d, out) {
    const segs = P.segs;
    let s = segs[segs.length - 1];
    if (d <= 0) s = segs[0];
    else if (d < s.s + s.l) {
      let lo = 0, hi = segs.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (d < segs[mid].s + segs[mid].l) hi = mid; else lo = mid + 1; }
      s = segs[lo];
    }
    const k = d - s.s;
    out.x = s.x1 + s.tx * k; out.y = s.y1 + s.ty * k; out.tx = s.tx; out.ty = s.ty;
    return out;
  }
  function nearestOnMap(map, x, y) {
    let best = { dist: Infinity, x: 0, y: 0 };
    for (const P of map.route) {
      for (const s of P.segs) {
        const k = Math.max(0, Math.min(s.l, (x - s.x1) * s.tx + (y - s.y1) * s.ty));
        const px = s.x1 + s.tx * k, py = s.y1 + s.ty * k;
        const dd = Math.hypot(x - px, y - py);
        if (dd < best.dist) best = { dist: dd, x: px, y: py };
      }
    }
    return best;
  }
  function faceRoad(map, x, y) {
    const p = nearestOnMap(map, x, y);
    return Math.atan2(p.y - y, p.x - x);
  }
  function lightAt(map, x, y) {
    if (!map.dark) return 1;
    for (const c of map.crystals) if ((c.x - x) ** 2 + (c.y - y) ** 2 <= c.r * c.r) return 1;
    return map.dark.range;
  }
  function crossings(P) {
    const out = [];
    const S = P.segs;
    for (let i = 0; i < S.length; i++) for (let j = i + 2; j < S.length; j++) {
      const a = S[i], b = S[j];
      const den = a.tx * b.ty - a.ty * b.tx;
      if (Math.abs(den) < 1e-6) continue;
      const dx = b.x1 - a.x1, dy = b.y1 - a.y1;
      const u = (dx * b.ty - dy * b.tx) / den, v = (dx * a.ty - dy * a.tx) / den;
      if (u > 0 && u < a.l && v > 0 && v < b.l) out.push({ x: a.x1 + a.tx * u, y: a.y1 + a.ty * u, under: i, over: j, dUnder: a.s + u, dOver: b.s + v, tx: b.tx, ty: b.ty });
    }
    return out;
  }

  let hpCache = null, hpCacheKey = null;
  function growthAt(curve, n) {
    if (n <= curve[0][0]) return curve[0][1];
    for (let i = 1; i < curve.length; i++) {
      const [n1, g1] = curve[i];
      if (n <= n1) { const [n0, g0] = curve[i - 1]; return g0 + (g1 - g0) * (n - n0) / (n1 - n0); }
    }
    return curve[curve.length - 1][1];
  }
  function hpBase(n) {
    if (hpCacheKey !== TUNE.hpCurve || hpCache.hp0 !== TUNE.hp0) { hpCache = [TUNE.hp0]; hpCache.hp0 = TUNE.hp0; hpCacheKey = TUNE.hpCurve; }
    n = Math.max(1, n | 0);
    while (hpCache.length < n) hpCache.push(hpCache[hpCache.length - 1] * growthAt(TUNE.hpCurve, hpCache.length + 1));
    return hpCache[n - 1];
  }
  function hpFor(n, map) { return hpBase(n) * (map ? map.hpMul : 1); }
  function killCash(n, map) { return TUNE.cash0 * Math.pow(TUNE.cashGrowth, n - 1) * (map ? map.cashMul : 1); }
  function clearBonus(n, map) { return Math.round(TUNE.clear0 * (1 + 0.1 * n) * Math.pow(TUNE.clearGrowth, n - 1) * (n % 10 === 0 ? 2.5 : 1) * (map ? map.cashMul : 1)); }
  function bossFor(n, map) {
    map = map || MAPS.moonlit;
    const every = map.waves.bossEvery;
    if (n % every !== 0) return null;
    const list = map.bosses;
    return BOSS_BY_ID[list[Math.min(list.length - 1, n / every - 1)]] || null;
  }

  function themeFor(n, gen) {
    gen = gen || WAVEGEN;
    for (const r of gen.themes) if ((r.at && r.at.indexOf(n) >= 0) || (r.mod && n % r.mod === r.rem)) return r.id;
    return '';
  }

  const specCache = {};
  function waveSpec(n, map) {
    map = map || MAPS.moonlit;
    const key = map.id + ':' + n;
    if (specCache[key]) return specCache[key];
    const gen = map.waves;
    const rng = mulberry(n * 7919 + 17);
    const boss = bossFor(n, map);
    let count = gen.count.base + Math.floor(n * gen.count.per);
    if (boss) count = Math.round(count * gen.count.bossMul);
    const theme = themeFor(n, gen);
    const pool = [];
    let total = 0;
    for (const ty of gen.types) {
      const w = n >= ty.from ? ty.w + (theme === ty.id ? ty.theme : 0) : 0;
      pool.push([ty.id, w]); total += w;
    }
    const gap = Math.max(gen.gap.min, gen.gap.base - n * gen.gap.per);
    const list = [];
    let t = 0;
    for (let i = 0; i < count; i++) {
      let r = rng() * total, type = pool[0][0];
      for (const [k, w] of pool) { r -= w; if (r <= 0) { type = k; break; } }
      list.push({ t, type });
      t += gap * (gen.spacing[type] || 1) * (1 - gen.gap.jitter / 2 + rng() * gen.gap.jitter);
    }
    const nR = map.route.length;
    if (nR > 1) list.forEach((e, i) => { e.route = i % nR; });
    if (boss) {
      const b = { t: t + gen.bossLead, type: 'boss' };
      if (nR > 1) b.route = (n / gen.bossEvery) % nR;
      list.push(b);
      if (boss.tricks && boss.tricks.twin) list.push({ t: b.t + (nR > 1 ? 0 : 1.6), type: 'boss', route: nR > 1 ? (b.route + 1) % nR : 0, twin: true });
    }
    const counts = {};
    for (const e of list) counts[e.type] = (counts[e.type] || 0) + 1;
    const spec = { n, list, boss, counts, theme, map: map.id, duration: list.length ? list[list.length - 1].t : 0 };
    specCache[key] = spec;
    return spec;
  }

  function towerCost(race, owned) { return Math.round(RACES[race].cost * Math.pow(TUNE.towerGrowth, owned)); }
  function nodeCost(race, k) { return Math.round(RACES[race].cost * TUNE.nodeBase * Math.pow(TUNE.nodeGrowth, k)); }
  function infCost(race, lv) { return Math.round(RACES[race].cost * TUNE.infBase * Math.pow(TUNE.infGrowth, lv)); }

  const DEFAULT_SETTINGS = { sound: true, vol: 0.6, shake: true, dmgNums: true, numFmt: 'short', speed: 1 };
  const NUM_FORMATS = ['short', 'sci', 'full'];
  const SPEEDS = [1, 2, 4];

  function newRecords() { return { time: 0, att: 0, wins: 0, bosses: {}, firsts: {} }; }
  function mapStartCash(map) { return map.startCash || TUNE.startCash; }
  function newBoard(map) { return { cash: mapStartCash(map), cleared: 0, sel: 1, auto: false, towers: [], records: newRecords() }; }
  const BOARD_KEYS = ['cash', 'cleared', 'sel', 'auto', 'towers', 'records'];

  function newState(mapId) {
    const map = getMap(mapId);
    const S = {
      ver: SAVE_VER, map: map.id, seed: 0x2545F491,
      cash: 0, cleared: 0, sel: 1, auto: false, towers: [], records: null, boards: {}, nextId: 1,
      run: null, time: 0, fxOn: true, fx: [], events: [], buffsDirty: true, totalKills: 0,
      stats: { played: 0, dmg: 0, bossKills: 0, earned: 0 },
      settings: Object.assign({}, DEFAULT_SETTINGS),
      sfx: { hit: 0, crit: 0, kill: 0, leak: 0 },
    };
    Object.assign(S, newBoard(map));
    return S;
  }

  function boardOf(S, id) {
    if (id === S.map) { const b = {}; for (const k of BOARD_KEYS) b[k] = S[k]; return b; }
    return S.boards[id] || null;
  }
  function mapCleared(S, id) { const b = boardOf(S, id); return b ? b.cleared : 0; }
  function mapUnlocked(S, id) {
    const m = MAPS[id];
    if (!m) return false;
    if (m.order <= 1) return true;
    const prev = MAP_IDS[m.order - 2];
    return mapCleared(S, prev) >= UNLOCK_AT;
  }
  function prepTowers(S) {
    const map = mapOf(S);
    for (const t of S.towers) { t.face = faceRoad(map, t.x, t.y); t.light = lightAt(map, t.x, t.y); t._s = null; }
    S.buffsDirty = true;
  }
  function switchMap(S, id) {
    if (S.run || !MAPS[id] || !mapUnlocked(S, id)) return false;
    if (id === S.map) return true;
    S.boards[S.map] = boardOf(S, S.map);
    const b = S.boards[id] || newBoard(MAPS[id]);
    delete S.boards[id];
    S.map = id;
    for (const k of BOARD_KEYS) S[k] = b[k];
    S.fx.length = 0;
    prepTowers(S);
    emit(S, 'map', { id });
    return true;
  }

  function owned(S, race) { let c = 0; for (const t of S.towers) if (t.race === race) c++; return c; }
  function nextTowerCost(S, race) { return towerCost(race, owned(S, race)); }

  function placeBlockReason(S, x, y, ignore) {
    const R = WORLD.towerR, map = mapOf(S);
    if (x < R || x > WORLD.L - R || y < R || y > WORLD.W - R) return 'edge';
    if (nearestOnMap(map, x, y).dist < map.half + R) return 'road';
    for (const b of map.blocks) if ((b.x - x) ** 2 + (b.y - y) ** 2 < (b.r + R) ** 2) return b.kind || 'rock';
    for (const t of S.towers) {
      if (t === ignore) continue;
      if ((t.x - x) ** 2 + (t.y - y) ** 2 < WORLD.minGap * WORLD.minGap) return 'pony';
    }
    return '';
  }
  function canPlace(S, x, y, ignore) { return !placeBlockReason(S, x, y, ignore); }

  function makeTower(S, race, x, y) {
    return {
      id: S.nextId++, race, x, y, spent: 0, paths: [0, 0, 0, 0, 0], infD: 0, infR: 0, mode: 'first',
      cd: 0, sigT: 0, stomp: 0, boomT: 0, face: 0, kills: 0, dmg: 0, wDmg: 0, wKills: 0, anim: 0, _s: null,
    };
  }

  function placeTower(S, race, x, y) {
    if (!canPlace(S, x, y)) return null;
    const cost = nextTowerCost(S, race);
    if (S.cash < cost) return null;
    S.cash -= cost;
    const t = makeTower(S, race, x, y);
    t.spent = cost;
    t.face = faceRoad(mapOf(S), x, y);
    t.light = lightAt(mapOf(S), x, y);
    S.towers.push(t);
    S.buffsDirty = true;
    return t;
  }

  function sellValue(t) { return Math.floor(t.spent * TUNE.sellRate); }
  function sellTower(S, t) {
    const i = S.towers.indexOf(t);
    if (i < 0) return 0;
    const refund = sellValue(t);
    S.cash += refund;
    S.towers.splice(i, 1);
    S.buffsDirty = true;
    return refund;
  }

  function chosenPaths(t) { const out = []; t.paths.forEach((lv, i) => { if (lv > 0) out.push(i); }); return out; }
  function pathState(t, i) {
    const ch = chosenPaths(t);
    if (t.paths[i] >= 10) return 'maxed';
    if (t.paths[i] > 0) return 'chosen';
    return ch.length >= 2 ? 'locked' : 'open';
  }
  function nextNodeCost(t, i) { return t.paths[i] >= 10 ? Infinity : nodeCost(t.race, t.paths[i]); }
  function buyNode(S, t, i) {
    const st = pathState(t, i);
    if (st === 'locked' || st === 'maxed') return false;
    const c = nextNodeCost(t, i);
    if (S.cash < c) return false;
    S.cash -= c; t.spent += c; t.paths[i]++; t._s = null; S.buffsDirty = true;
    return true;
  }
  function infNext(t, which) { return infCost(t.race, which === 'dmg' ? t.infD : t.infR); }
  function buyInf(S, t, which) {
    const c = infNext(t, which);
    if (S.cash < c) return false;
    S.cash -= c; t.spent += c;
    if (which === 'dmg') t.infD++; else t.infR++;
    t._s = null;
    return true;
  }

  function upgradeOptions(t) {
    const out = [];
    for (const i of chosenPaths(t)) if (t.paths[i] < 10) out.push({ kind: 'node', i, cost: nextNodeCost(t, i) });
    out.push({ kind: 'inf', which: 'dmg', cost: infNext(t, 'dmg') });
    out.push({ kind: 'inf', which: 'rate', cost: infNext(t, 'rate') });
    return out.sort((a, b) => a.cost - b.cost);
  }
  function buyMaxAffordable(S, t) {
    let count = 0, spent = 0;
    for (let guard = 0; guard < 1000; guard++) {
      const o = upgradeOptions(t)[0];
      if (!o || o.cost > S.cash) break;
      const ok = o.kind === 'node' ? buyNode(S, t, o.i) : buyInf(S, t, o.which);
      if (!ok) break;
      count++; spent += o.cost;
    }
    return { count, spent };
  }
  function maxAffordablePreview(S, t) {
    const clone = { race: t.race, paths: t.paths.slice(), infD: t.infD, infR: t.infR, spent: 0, _s: null };
    const sim = { cash: S.cash, buffsDirty: false };
    const r = buyMaxAffordable(sim, clone);
    return { count: r.count, spent: r.spent, paths: clone.paths, infD: clone.infD, infR: clone.infR };
  }

  function computeStats(t) {
    const r = RACES[t.race];
    const s = {
      range: r.range, dmg: r.dmg, rate: r.rate,
      canFly: t.race === 'pegasus', canMagic: t.race === 'unicorn',
      flyMul: 1, magicMul: 1, splash: 0, chain: 0, slow: 0, slowDur: 0, stunCh: 0, stunDur: 0,
      knock: 0, multi: 1, crit: 0, critMul: 2.5, hex: 0, cash: 1, auraR: 0, auraDmg: 0, auraRate: 0, sigs: [],
    };
    PATHS[t.race].forEach((p, i) => { if (t.paths[i] > 0) p.apply(t.paths[i], s); });
    s.slow = Math.min(0.6, s.slow);
    if (t.light && t.light !== 1) { s.baseRange = s.range; s.range *= t.light; }
    s.dmg *= Math.pow(TUNE.infMul, t.infD || 0);
    s.rate *= Math.pow(TUNE.infMul, t.infR || 0);
    s.has = {};
    for (const k of s.sigs) s.has[k] = true;
    return s;
  }
  function stats(t) { if (!t._s) t._s = computeStats(t); return t._s; }

  function nodeInfo(t, i, k) {
    const a = t.paths.slice(), b = t.paths.slice();
    a[i] = k - 1; b[i] = k;
    const s0 = computeStats({ race: t.race, paths: a, infD: 0, infR: 0 });
    const s1 = computeStats({ race: t.race, paths: b, infD: 0, infR: 0 });
    const lines = [];
    const rel = (x, y, label) => { if (Math.abs(y / x - 1) > 0.001) lines.push((y > x ? '+' : '') + Math.round((y / x - 1) * 1000) / 10 + '% ' + label); };
    rel(s0.dmg, s1.dmg, 'damage');
    rel(s0.rate, s1.rate, 'attack speed');
    rel(s0.range, s1.range, 'range');
    if (s1.canFly && !s0.canFly) lines.push('Can target flyers');
    if (s1.canMagic && !s0.canMagic) lines.push('Can harm magical DNBs');
    if (s1.flyMul > s0.flyMul) rel(s0.flyMul, s1.flyMul, 'vs flyers');
    if (s1.magicMul > s0.magicMul) rel(s0.magicMul, s1.magicMul, 'vs magical');
    if (s1.chain > s0.chain) lines.push('+1 chain target');
    if (s1.multi > s0.multi) lines.push('+1 extra target');
    if (s1.crit > s0.crit) lines.push('+' + Math.round((s1.crit - s0.crit) * 100) + '% crit chance');
    if (s1.stunCh > s0.stunCh) lines.push('Stomps may stun (' + pct(s1.stunCh) + ')');
    if (s1.slow > s0.slow) lines.push('Slow ' + pct(s1.slow));
    if (s1.splash > s0.splash) lines.push('Splash radius ' + Math.round(s1.splash));
    if (s1.knock > s0.knock) lines.push('Knockback ' + s1.knock);
    if (s1.hex > s0.hex) lines.push('Hex +' + pct(s1.hex) + ' damage taken');
    if (s1.cash > s0.cash) lines.push('Kill cash x' + (Math.round(s1.cash * 100) / 100));
    if (s1.auraDmg > s0.auraDmg) lines.push('Herd aura +' + pct(s1.auraDmg) + ' damage');
    const p = PATHS[t.race][i];
    if (k === 10) lines.push('Signature: ' + p.sig);
    return { name: p.name, k, cost: nodeCost(t.race, k - 1), lines, sig: k === 10 ? p.sigDesc : '' };
  }

  function refreshBuffs(S) {
    for (const t of S.towers) t.buff = { dmg: 0, rate: 0 };
    for (const a of S.towers) {
      const s = stats(a);
      if (!s.auraR) continue;
      for (const b of S.towers) {
        if (a === b) continue;
        if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= s.auraR * s.auraR) { b.buff.dmg += s.auraDmg; b.buff.rate += s.auraRate; }
      }
    }
    S.buffsDirty = false;
  }

  function effDmg(t) { return stats(t).dmg * (1 + ((t.buff && t.buff.dmg) || 0)); }
  function effRate(t) { return stats(t).rate * (1 + ((t.buff && t.buff.rate) || 0)) * (t.boomT > 0 ? 3 : 1); }

  function topWave(S) { return Math.min(MAX_WAVE, S.cleared + 1); }

  function startWave(S, n) {
    if (S.run) return false;
    n = Math.max(1, Math.min(n || S.sel, topWave(S)));
    S.sel = n;
    const map = mapOf(S);
    const spec = waveSpec(n, map);
    S.stats.played++;
    if (S.records) S.records.att++;
    S.run = {
      n, spec, map, route: map.route, queue: spec.list.slice(), t: 0, lives: LIVES, enemies: [], proj: [], earned: 0, kills: 0, eid: 1,
      fresh: n > S.cleared, over: null, rng: mulberry(hashSeed(S.seed, n, S.stats.played)), bossIds: [],
      enrageAt: spec.duration + 75 * Math.max(1, map.maxLen / BASE_LEN), windT: 0, gust: 0, gustWarn: 0, gustKind: '', gustDir: 1, gustOn: false,
    };
    for (const t of S.towers) { t.cd = 0; t.sigT = 0; t.boomT = 0; t.stomp = 0; t.wDmg = 0; t.wKills = 0; }
    emit(S, 'start', { n, boss: spec.boss });
    return true;
  }

  function emit(S, type, data) { S.events.push(Object.assign({ type }, data || {})); }
  function fx(S, o) { if (S.fxOn && S.fx.length < 700) { o.t = 0; S.fx.push(o); } }

  function spawnEnemy(S, run, type, d, opts) {
    const n = run.n;
    const def = ENEMIES[type];
    const hpMax = hpFor(n, run.map) * def.hp;
    const e = {
      id: run.eid++, type, path: 0, d: d === undefined ? 0 : d, off: 0, x: 0, y: 0, tx: 1, ty: 0,
      hpMax, hp: hpMax, speed: def.speed, r: def.r, flying: !!def.flying, magical: !!def.magical,
      boss: type === 'boss', cash: def.cash, color: def.color, dark: def.dark, alive: true,
      slow: 0, slowT: 0, stunT: 0, hexAmp: 0, hexT: 0, doom: false, dispelT: 0, burrowT: 0, trickT: 0, sprintT: 0,
      quag: false, hit: 0, leak: 1, phase: 0, seed: (run.eid * 977) % 1000, dn: 0, dnT: 0, dnCrit: false,
    };
    if (e.boss) {
      const b = run.spec.boss || BOSSES[0];
      e.bossDef = b; e.trick = b.trick; e.name = b.name; e.color = b.color; e.dark = b.dark; e.leak = 5;
      e.hpMax = e.hp = hpFor(n, run.map) * def.hp * (1 + n / 100) * (b.hpMul || 1);
      e.thresholds = [0.75, 0.5, 0.25];
      if (e.trick === 'flying') e.flying = true;
      if (e.trick === 'magical') e.magical = true;
      if (e.trick === 'armor') e.armor = true;
      if (e.trick === 'phase') e.flying = true;
      if (b.tricks) setupTricks(e, b);
    }
    if (opts) Object.assign(e, opts);
    const rng = mulberry(n * 131 + e.id * 31);
    e.off = (rng() - 0.5) * (e.boss ? 10 : 34);
    placeOnRoute(run, e);
    run.enemies.push(e);
    if (e.boss && !e.splitDone) { run.bossIds.push(e.id); if (!e.quiet) emit(S, 'boss', { name: e.name, n }); }
    return e;
  }

  function setupTricks(e, b) {
    const tk = b.tricks;
    e.tk = tk;
    e.trick = '';
    e.stage = -1;
    e.cut = 0;
    e.timers = {};
    e.broodQ = [];
    const addBrood = (br) => { if (br) for (const at of br.at) e.broodQ.push({ at, type: br.type, n: br.n }); };
    addBrood(tk.brood);
    if (tk.stages) for (const st of tk.stages) addBrood(st.brood);
    e.broodQ.sort((a, b2) => b2.at - a.at);
    e.thresholds = null;
    applyStage(e);
    if (tk.phase && !tk.stages) e.flying = true;
    if (tk.twin) e.leak = 3;
  }

  function activeTricks(e) {
    const tk = e.tk;
    if (!tk.stages) return tk;
    const f = e.hp / e.hpMax;
    let i = 0;
    while (i < tk.stages.length - 1 && f <= tk.stages[i].above) i++;
    if (i !== e.stage) {
      e.stage = i;
      e.eff = Object.assign({}, tk, tk.stages[i]);
      e.stageNew = true;
    }
    return e.eff;
  }

  function applyStage(e) {
    const t = activeTricks(e);
    if (!t.phase) { e.flying = !!t.fly; e.magical = !!t.magic; }
    else if (e.stageNew) { e.flying = true; e.magical = false; }
    e.stageNew = false;
    return t;
  }

  function placeOnRoute(run, e) {
    routePos(run.route[e.path] || run.route[0], e.d, e);
    const o = e.off + (e.flying ? Math.sin(e.phase * 2.2 + e.seed) * 22 : 0);
    e.x += -e.ty * o; e.y += e.tx * o;
    if (e.wy) e.y += e.wy;
  }

  function isFly(e) { return e.flying; }
  function isMagic(e) { return e.magical && !(e.dispelT > 0); }
  function canHit(s, e) {
    if (!e.alive || e.burrowT > 0 || e.d < SPAWN_GUARD) return false;
    if (isFly(e) && !s.canFly) return false;
    if (isMagic(e) && !s.canMagic) return false;
    return true;
  }
  function dist2(a, b) { return (a.x - b.x) ** 2 + (a.y - b.y) ** 2; }
  function inRange(t, e, R) { return (t.x - e.x) ** 2 + (t.y - e.y) ** 2 <= (R + e.r * 0.5) ** 2; }

  function targetsFor(run, t, s) {
    const out = [];
    for (const e of run.enemies) if (canHit(s, e) && inRange(t, e, s.range)) out.push(e);
    return out;
  }
  function pick(list, mode, t) {
    let best = null, bv = -Infinity;
    for (const e of list) {
      let v;
      if (mode === 'last') v = -e.d;
      else if (mode === 'strong') v = e.hp;
      else if (mode === 'close') v = -((e.x - t.x) ** 2 + (e.y - t.y) ** 2);
      else v = e.d;
      if (v > bv) { bv = v; best = e; }
    }
    return best;
  }

  function flushNum(S, e) {
    if (e.dn > 0 && S.settings.dmgNums) fx(S, { k: 'num', x: e.x, y: e.y - e.r, s: fmt(e.dn), crit: e.dnCrit, big: e.boss, life: e.dnCrit ? 0.95 : 0.75, seed: e.id });
    e.dn = 0; e.dnCrit = false; e.dnT = 0;
  }

  function damage(S, run, e, amt, t, crit) {
    if (!e.alive || amt <= 0) return;
    let m = 1 + (e.hexT > 0 ? e.hexAmp : 0) + (e.quag ? 0.15 : 0);
    if (e.armor && e.hp > e.hpMax * 0.5) m *= 0.4;
    if (e.cut) m *= 1 - e.cut;
    const dealt = amt * m;
    const real = Math.min(e.hp, dealt);
    S.stats.dmg += real;
    if (t) { t.dmg += real; t.wDmg += real; }
    e.hp -= dealt;
    e.hit = 0.12;
    S.sfx.hit++;
    if (S.fxOn) { if (e.dn === 0) e.dnT = 0.16; e.dn += real; if (crit) e.dnCrit = true; }
    if (e.hp <= 0) { kill(S, run, e, t); return; }
    if (e.thresholds && (e.trick === 'brood' || e.trick === 'mother')) {
      while (e.thresholds.length && e.hp < e.hpMax * e.thresholds[0]) {
        e.thresholds.shift();
        for (let i = 0; i < 4; i++) {
          const m2 = spawnEnemy(S, run, 'basic', Math.max(20, e.d - 12 - i * 14));
          m2.hpMax = m2.hp = hpFor(run.n, run.map) * 1.2;
        }
        fx(S, { k: 'ring', x: e.x, y: e.y, r: 60, c: '#a07a52', life: 0.5 });
      }
    }
    if (e.broodQ && e.broodQ.length) {
      while (e.broodQ.length && e.hp < e.hpMax * e.broodQ[0].at) {
        const br = e.broodQ.shift();
        const def = ENEMIES[br.type];
        for (let i = 0; i < br.n; i++) {
          const m2 = spawnEnemy(S, run, br.type, Math.max(20, e.d - 10 - i * 12), { path: e.path });
          m2.hpMax = m2.hp = hpFor(run.n, run.map) * def.hp * 1.2;
        }
        fx(S, { k: 'ring', x: e.x, y: e.y, r: 60, c: e.bossDef.look && e.bossDef.look.aura || '#a07a52', life: 0.5 });
      }
    }
  }

  function kill(S, run, e, t) {
    if (!e.alive) return;
    e.alive = false;
    if (S.fxOn) flushNum(S, e);
    const mult = t ? stats(t).cash : 1;
    const gain = killCash(run.n, run.map) * e.cash * mult;
    S.cash += gain; run.earned += gain; run.kills++; S.totalKills++; S.stats.earned += gain;
    S.sfx.kill++;
    if (t) { t.kills++; t.wKills++; }
    fx(S, { k: 'puff', x: e.x, y: e.y, r: e.r, c: e.color, life: 0.45 });
    fx(S, { k: 'burst', x: e.x, y: e.y, r: e.r, c: e.color, c2: e.dark, seed: e.id * 7 + run.n, life: e.boss ? 0.9 : 0.5, big: e.boss });
    if (e.boss || mult > 1.5) fx(S, { k: 'text', x: e.x, y: e.y - 20, s: '+' + fmt(gain), c: '#e3c15b', life: 1.1 });
    if (e.boss) { S.stats.bossKills++; emit(S, 'bossDown', { name: e.name, split: !!e.splitDone }); }
    if (e.boss && !e.splitDone && e.bossDef.tricks && S.records) S.records.bosses[e.bossDef.id] = (S.records.bosses[e.bossDef.id] || 0) + 1;
    if (e.doom) {
      const R = 90, dmgAmt = e.hpMax * 0.25;
      fx(S, { k: 'ring', x: e.x, y: e.y, r: R, c: '#c06bff', life: 0.45 });
      for (const o of run.enemies) if (o !== e && o.alive && dist2(o, e) <= R * R) damage(S, run, o, dmgAmt, t);
    }
    if (e.boss && e.trick === 'split' && !e.splitDone) {
      for (const s of [-1, 1]) {
        const c = spawnEnemy(S, run, 'boss', Math.max(20, e.d - 160 + s * 18), { path: e.path });
        c.hpMax = c.hp = e.hpMax * 0.25; c.splitDone = true; c.r = e.r * 0.75; c.leak = 3; c.speed = 46; c.name = 'Shade';
      }
      fx(S, { k: 'ring', x: e.x, y: e.y, r: 70, c: '#6b5a8a', life: 0.6 });
    }
    if (e.boss && e.tk && e.tk.split && !e.splitDone) {
      const sp = e.tk.split;
      for (let i = 0; i < sp.n; i++) {
        const c = spawnEnemy(S, run, 'boss', Math.max(20, e.d - 20 - i * 24), { path: e.path, splitDone: true, quiet: true });
        c.hpMax = c.hp = e.hpMax * sp.frac; c.r = e.r * 0.75; c.leak = 2; c.name = sp.name;
        c.tk = { fly: e.flying, magic: e.magical }; c.eff = null; c.stage = -1; c.broodQ = []; c.cut = 0; c.timers = {};
        c.flying = e.flying; c.magical = e.magical;
      }
      fx(S, { k: 'ring', x: e.x, y: e.y, r: 70, c: (e.bossDef.look && e.bossDef.look.aura) || e.color, life: 0.6 });
    }
  }

  function hitEnemy(S, run, t, s, e, base) {
    if (!e.alive) return;
    let d = base;
    if (isFly(e)) d *= s.flyMul;
    if (isMagic(e) || (e.magical && s.has.leyrupture)) d *= s.magicMul;
    let crit = false;
    if (s.crit > 0 && run.rng() < s.crit) { crit = true; d *= (s.has.raptordive && isFly(e)) ? 5 : s.critMul; S.sfx.crit++; }
    damage(S, run, e, d, t, crit);
    if (crit) fx(S, { k: 'spark', x: e.x, y: e.y, c: '#fff2a8', life: 0.3 });
    if (!e.alive) return;
    if (s.slow > 0) { e.slow = Math.max(e.slow, e.boss ? s.slow * 0.5 : s.slow); e.slowT = Math.max(e.slowT, s.slowDur); }
    if (s.stunCh > 0 && run.rng() < s.stunCh) stunE(e, e.boss ? s.stunDur * 0.3 : s.stunDur);
    if (s.hex > 0) { e.hexAmp = Math.max(e.hexAmp, s.hex); e.hexT = 4; if (s.has.doomhex) e.doom = true; }
    if (s.knock > 0) e.d = Math.max(16, e.d - s.knock * (e.boss ? 0.15 : 1));
    if (s.has.raptordive && isFly(e) && !e.boss && e.hp < e.hpMax * 0.2) kill(S, run, e, t);
  }

  function fire(S, run, t, s, targets, dmg) {
    if (t.race === 'earth') {
      t.stomp++;
      let d = dmg, stun = 0;
      if (s.has.earthshatter && t.stomp % 4 === 0) { d *= 5; stun = 1; }
      for (const e of targets) {
        if (s.has.leyrupture && e.magical) e.dispelT = 3;
        hitEnemy(S, run, t, s, e, d);
        if (stun && e.alive) stunE(e, e.boss ? 0.3 : stun);
      }
      t.anim = 0.25;
      fx(S, { k: 'stomp', x: t.x, y: t.y, r: s.range, c: stun ? '#ffd27a' : (s.has.leyrupture ? '#b48bff' : '#c9a36b'), life: 0.35 });
      return;
    }
    const first = pick(targets, t.mode, t);
    t.face = Math.atan2(first.y - t.y, first.x - t.x);
    t.anim = 0.2;
    let list;
    if (s.has.featherstorm) list = targets;
    else {
      list = [first];
      if (s.multi > 1) {
        const rest = targets.filter(e => e !== first).sort((a, b) => b.d - a.d);
        for (let i = 0; i < s.multi - 1 && i < rest.length; i++) list.push(rest[i]);
      }
    }
    for (const e of list) {
      run.proj.push({ x: t.x, y: t.y - 10, e, t, dmg, sp: t.race === 'unicorn' ? 560 : 820, kind: t.race, life: 3, a: 0 });
    }
  }

  function projHit(S, run, p) {
    const t = p.t, s = stats(t), e = p.e;
    if (S.towers.indexOf(t) < 0) return;
    if (!e.alive) return;
    if (t.race === 'unicorn') {
      const d = p.dmg;
      hitEnemy(S, run, t, s, e, d);
      if (s.splash > 0) {
        fx(S, { k: 'ring', x: p.x, y: p.y, r: s.splash, c: '#d6b8ff', life: 0.3 });
        for (const o of run.enemies) if (o !== e && canHit(s, o) && dist2(o, p) <= s.splash * s.splash) hitEnemy(S, run, t, s, o, d * 0.6);
      }
      if (s.has.prismburst) {
        const near = run.enemies.filter(o => o !== e && canHit(s, o) && dist2(o, p) <= 110 * 110).sort((a, b) => dist2(a, p) - dist2(b, p)).slice(0, 4);
        for (const o of near) { fx(S, { k: 'zap', x1: p.x, y1: p.y, x2: o.x, y2: o.y, c: '#ffc8f4', life: 0.2 }); hitEnemy(S, run, t, s, o, d * 0.5); }
      }
      if (s.has.aurora && e.flying) {
        const fl = run.enemies.filter(o => o !== e && o.alive && o.flying && canHit(s, o) && dist2(o, p) <= 160 * 160).slice(0, 2);
        for (const o of fl) { fx(S, { k: 'zap', x1: p.x, y1: p.y, x2: o.x, y2: o.y, c: '#7dffcf', life: 0.25 }); hitEnemy(S, run, t, s, o, d); }
      }
    } else {
      hitEnemy(S, run, t, s, e, p.dmg);
      if (s.chain > 0) {
        const hit = new Set([e]);
        let from = { x: p.x, y: p.y };
        for (let i = 0; i < s.chain; i++) {
          let best = null, bd = 130 * 130;
          for (const o of run.enemies) { if (hit.has(o) || !canHit(s, o)) continue; const dd = dist2(o, from); if (dd < bd) { bd = dd; best = o; } }
          if (!best) break;
          hit.add(best);
          fx(S, { k: 'zap', x1: from.x, y1: from.y, x2: best.x, y2: best.y, c: '#bfe8ff', life: 0.18 });
          hitEnemy(S, run, t, s, best, p.dmg * 0.6);
          from = { x: best.x, y: best.y };
        }
      }
    }
  }

  function signatures(S, run, t, s, dt, targets, dmg) {
    if (!s.sigs.length) return;
    t.sigT += dt;
    if (t.boomT > 0) t.boomT -= dt;
    const every = (sec) => { if (t.sigT >= sec) { t.sigT = 0; return true; } return false; };
    if (s.has.starfall && targets.length && every(6)) {
      let best = targets[0]; for (const e of targets) if (e.hp > best.hp) best = e;
      const R = 75;
      fx(S, { k: 'star', x: best.x, y: best.y, r: R, c: '#ffe9a8', life: 0.6 });
      for (const o of run.enemies) if (o.alive && o.burrowT <= 0 && dist2(o, best) <= R * R) damage(S, run, o, dmg * 12, t);
    }
    if (s.has.timestop && targets.length && every(10)) {
      fx(S, { k: 'ring', x: t.x, y: t.y, r: s.range, c: '#9fe3ff', life: 0.6 });
      for (const o of run.enemies) if (o.alive && inRange(t, o, s.range)) stunE(o, o.boss ? 0.5 : 1.5);
    }
    if (s.has.thunderhead && targets.length && every(5)) {
      const list = targets.slice().sort((a, b) => b.hp - a.hp).slice(0, 8);
      for (const o of list) { fx(S, { k: 'bolt', x: o.x, y: o.y, c: '#e6f4ff', life: 0.3 }); hitEnemy(S, run, t, s, o, dmg * 5); }
    }
    if (s.has.cyclone && targets.length && every(9)) {
      fx(S, { k: 'swirl', x: t.x, y: t.y, r: s.range, c: '#bdf5ee', life: 0.7 });
      for (const o of run.enemies) if (o.alive && !o.boss && inRange(t, o, s.range)) { o.d = Math.max(16, o.d - 150); stunE(o, 0.6); }
    }
    if (s.has.rainboom && targets.length && every(15)) {
      t.boomT = 4;
      fx(S, { k: 'rainbow', x: t.x, y: t.y, r: s.range, life: 0.9 });
    }
    if (s.has.stampede && every(12)) {
      let any = false;
      for (const o of run.enemies) {
        if (!o.alive || o.flying || o.burrowT > 0 || o.d < SPAWN_GUARD) continue;
        if (isMagic(o) && !s.canMagic) continue;
        any = true; hitEnemy(S, run, t, s, o, dmg * 6);
      }
      if (any) fx(S, { k: 'stampede', x: 0, y: 0, life: 0.9 });
      else t.sigT = 12;
    }
  }

  function stunE(e, dur) { if (e.stunT > 0 || e.stunImm > 0) return; e.stunT = dur; }

  function enemyUpdate(S, run, e, dt) {
    if (e.hit > 0) e.hit -= dt;
    if (e.dn > 0) { e.dnT -= dt; if (e.dnT <= 0) flushNum(S, e); }
    if (e.hexT > 0) { e.hexT -= dt; if (e.hexT <= 0) { e.hexAmp = 0; } }
    if (e.dispelT > 0) e.dispelT -= dt;
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slow = 0; }
    if (e.boss) bossTrick(S, run, e, dt);
    if (e.stunImm > 0) e.stunT = 0;
    let sp = e.speed * (1 - e.slow) * (e.quag ? 0.5 : 1) * (e.sprintT > 0 ? (e.sprintMul || 3) : 1);
    if (e.hasteT > 0) { e.hasteT -= dt; sp *= e.hasteMul || 1; }
    if (e.stunT > 0) { e.stunT -= dt; sp = 0; if (e.stunT <= 0) e.stunImm = e.boss ? 2.5 : 1.2; }
    if (e.stunImm > 0) e.stunImm -= dt;
    if (run.enrage) { e.stunT = 0; e.slow = 0; sp = e.speed * 1.6; }
    e.d += sp * dt;
    e.phase += dt * (sp > 0 ? 1 : 0.2);
    placeOnRoute(run, e);
    const P = run.route[e.path] || run.route[0];
    if (e.d >= P.len) {
      e.alive = false;
      run.lives -= e.leak;
      S.sfx.leak++;
      const end = P.pts[P.pts.length - 1];
      fx(S, { k: 'leak', x: Math.min(WORLD.L, end[0]), y: end[1], life: 0.6 });
      emit(S, 'leak', { boss: e.boss, lives: run.lives });
    }
  }

  function bossTrick(S, run, e, dt) {
    e.trickT += dt;
    if (e.burrowT > 0) e.burrowT -= dt;
    if (e.sprintT > 0) e.sprintT -= dt;
    if (e.tk) { tkTrick(S, run, e, dt); return; }
    const tr = e.trick;
    if (tr === 'burrow' && e.trickT >= 5) { e.trickT = 0; e.burrowT = 1.6; fx(S, { k: 'puff', x: e.x, y: e.y, r: 30, c: '#5a4030', life: 0.5 }); }
    if (tr === 'sprint' && e.trickT >= 6) { e.trickT = 0; e.sprintT = 1.5; }
    if (tr === 'regen' || (tr === 'mother' && e.hp < e.hpMax * 0.33)) {
      e.hp = Math.min(e.hpMax, e.hp + e.hpMax * 0.015 * dt);
      for (const o of run.enemies) if (o !== e && o.alive && !o.boss && dist2(o, e) < 120 * 120) o.hp = Math.min(o.hpMax, o.hp + o.hpMax * 0.03 * dt);
    }
    if (tr === 'phase' && e.trickT >= 4) { e.trickT = 0; e.flying = !e.flying; e.magical = !e.flying; fx(S, { k: 'ring', x: e.x, y: e.y, r: 40, c: e.magical ? '#c08bff' : '#9fd0ff', life: 0.4 }); }
    if (tr === 'mother') {
      const f = e.hp / e.hpMax;
      if (f > 0.66) { if (e.trickT >= 7) { e.trickT = 0; e.sprintT = 1.2; } e.flying = false; e.magical = false; }
      else if (f > 0.33) { e.flying = true; e.magical = false; }
      else { e.flying = false; e.magical = true; }
    }
  }

  function tick(e, key, every, dt) {
    const T = e.timers;
    T[key] = (T[key] || 0) + dt;
    if (T[key] >= every) { T[key] -= every; return true; }
    return false;
  }

  function tkTrick(S, run, e, dt) {
    const t = applyStage(e);
    const aura = (e.bossDef.look && e.bossDef.look.aura) || e.color;
    if (t.burrow && tick(e, 'burrow', t.burrow.every, dt)) { e.burrowT = t.burrow.dur; fx(S, { k: 'puff', x: e.x, y: e.y, r: 30, c: e.dark, life: 0.5 }); }
    if (t.sprint && tick(e, 'sprint', t.sprint.every, dt)) { e.sprintT = t.sprint.dur; e.sprintMul = t.sprint.mul; }
    if (t.windrider && run.gustOn) { e.sprintT = Math.max(e.sprintT, 0.1); e.sprintMul = 2; }
    if (t.regen) {
      e.hp = Math.min(e.hpMax, e.hp + e.hpMax * t.regen.rate * dt);
      const R2 = t.regen.aura * t.regen.aura;
      for (const o of run.enemies) if (o !== e && o.alive && !o.boss && dist2(o, e) < R2) o.hp = Math.min(o.hpMax, o.hp + o.hpMax * t.regen.rate * 2 * dt);
    }
    let cut = 0;
    if (t.armor && e.hp > e.hpMax * t.armor.until) cut = t.armor.cut;
    if (t.shell) {
      if (tick(e, 'shell', t.shell.every, dt)) { e.shellT = t.shell.dur; fx(S, { k: 'ring', x: e.x, y: e.y, r: 36, c: '#d8d0c0', life: 0.4 }); }
      if (e.shellT > 0) { e.shellT -= dt; cut = Math.max(cut, t.shell.cut); }
    } else e.shellT = 0;
    e.cut = cut;
    if (t.phase && tick(e, 'phase', t.phase.every, dt)) { e.flying = !e.flying; e.magical = !e.flying; fx(S, { k: 'ring', x: e.x, y: e.y, r: 40, c: e.magical ? '#c08bff' : '#9fd0ff', life: 0.4 }); }
    if (t.haste) {
      const R2 = t.haste.r * t.haste.r;
      for (const o of run.enemies) if (o !== e && o.alive && !o.boss && dist2(o, e) < R2) { o.hasteT = 0.3; o.hasteMul = t.haste.mul; }
    }
    if (t.blink && tick(e, 'blink', t.blink.every, dt)) {
      const P = run.route[e.path] || run.route[0];
      if (e.d < P.len - 60) {
        fx(S, { k: 'puff', x: e.x, y: e.y, r: 26, c: aura, life: 0.4 });
        e.d = Math.min(P.len - 60, e.d + t.blink.dist);
        placeOnRoute(run, e);
        fx(S, { k: 'ring', x: e.x, y: e.y, r: 34, c: aura, life: 0.4 });
      }
    }
  }

  function windStep(S, run, dt) {
    const w = run.map.wind;
    run.windT += dt;
    const c = run.windT % w.every;
    const g0 = w.every - w.dur;
    const k = Math.floor(run.windT / w.every);
    const on = c >= g0;
    run.gustWarn = !on && c >= g0 - w.warn ? (c - (g0 - w.warn)) / w.warn : 0;
    run.gustKind = k % 2 ? 'side' : 'back';
    run.gustDir = (k >> 1) % 2 ? 1 : -1;
    if (on && !run.gustOn) emit(S, 'gust', { kind: run.gustKind, dir: run.gustDir });
    run.gustOn = on;
    run.gust = on ? Math.sin(Math.PI * (c - g0) / w.dur) : 0;
    for (const e of run.enemies) {
      if (!e.alive || !e.flying) continue;
      const tt = e.tk && (e.eff || e.tk);
      if (on && !(tt && tt.windrider)) {
        const m = run.gust * (e.boss ? w.bossMul : 1) * dt;
        if (run.gustKind === 'back') e.d = Math.max(20, e.d - w.push * m);
        else e.wy = Math.max(-80, Math.min(80, (e.wy || 0) + run.gustDir * w.side * m));
      } else if (e.wy) {
        e.wy *= Math.max(0, 1 - dt * 0.6);
        if (Math.abs(e.wy) < 0.5) e.wy = 0;
      }
    }
  }

  function bossStatus(run) {
    if (!run) return null;
    let hp = 0, max = 0, name = '', def = null, count = 0;
    for (const e of run.enemies) {
      if (!e.boss || !e.alive) continue;
      hp += Math.max(0, e.hp); max += e.hpMax; count++;
      if (!def) { def = e.bossDef; name = e.splitDone ? e.bossDef.name + ' (shades)' : e.name; }
    }
    if (!count) return null;
    const lead = run.enemies.find(e => e.boss && e.alive);
    return { name, def, hp, max, count, frac: max ? hp / max : 0, lead };
  }

  function step(S, dt) {
    S.time += dt;
    for (let i = S.fx.length - 1; i >= 0; i--) { const f = S.fx[i]; f.t += dt; if (f.t >= f.life) S.fx.splice(i, 1); }
    for (const t of S.towers) if (t.anim > 0) t.anim -= dt;
    const run = S.run;
    if (!run || run.over) return;
    if (S.buffsDirty) refreshBuffs(S);
    run.t += dt;
    if (S.records) S.records.time += dt;
    if (!run.queue.length && !run.enrage && run.t > run.enrageAt) { run.enrage = true; emit(S, 'enrage', {}); }
    while (run.queue.length && run.queue[0].t <= run.t) { const it = run.queue.shift(); spawnEnemy(S, run, it.type, undefined, it.route != null ? { path: it.route, quiet: !!it.twin } : undefined); }
    if (run.map.wind) windStep(S, run, dt);

    for (const e of run.enemies) e.quag = false;
    for (const t of S.towers) {
      const s = stats(t);
      if (!s.has.quagmire) continue;
      for (const e of run.enemies) if (e.alive && !e.flying && inRange(t, e, s.range)) e.quag = true;
    }

    for (const e of run.enemies) if (e.alive) enemyUpdate(S, run, e, dt);

    for (const t of S.towers) {
      const s = stats(t);
      const dmg = effDmg(t);
      const targets = targetsFor(run, t, s);
      signatures(S, run, t, s, dt, targets, dmg);
      t.cd -= dt;
      if (t.cd > 0) continue;
      if (!targets.length) { t.cd = 0; continue; }
      t.cd += 1 / effRate(t);
      if (t.cd < 0) t.cd = 0;
      fire(S, run, t, s, targets, dmg);
    }

    for (let i = run.proj.length - 1; i >= 0; i--) {
      const p = run.proj[i];
      p.life -= dt;
      const e = p.e;
      if (!e.alive || p.life <= 0 || e.burrowT > 0) { run.proj.splice(i, 1); continue; }
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy), mv = p.sp * dt;
      if (d <= mv + e.r * 0.5) { p.x = e.x; p.y = e.y; run.proj.splice(i, 1); projHit(S, run, p); }
      else { p.x += dx / d * mv; p.y += dy / d * mv; p.a = Math.atan2(dy, dx); }
    }

    run.enemies = run.enemies.filter(e => e.alive);

    if (run.lives <= 0) {
      run.over = 'lost';
      emit(S, 'lost', { n: run.n, earned: run.earned });
      S.run = null;
      return;
    }
    if (!run.queue.length && !run.enemies.length) {
      run.over = 'won';
      let bonus = 0;
      if (run.n > S.cleared) {
        bonus = clearBonus(run.n, run.map); S.cash += bonus; S.cleared = run.n;
        if (S.records) S.records.firsts[run.n] = { at: Math.round(S.records.time), att: S.records.att, lives: run.lives };
      }
      if (S.records) S.records.wins++;
      emit(S, 'won', { n: run.n, bonus, earned: run.earned, fresh: bonus > 0, lives: run.lives });
      S.run = null;
    }
  }

  function serTower(t) { return { id: t.id, race: t.race, x: t.x, y: t.y, spent: t.spent, paths: t.paths, infD: t.infD, infR: t.infR, mode: t.mode, kills: t.kills, dmg: t.dmg }; }
  function serialize(S) {
    const boards = {};
    for (const id of MAP_IDS) {
      const b = boardOf(S, id);
      if (!b) continue;
      boards[id] = { cash: b.cash, cleared: b.cleared, sel: b.sel, auto: b.auto, towers: b.towers.map(serTower), records: b.records };
    }
    return JSON.stringify({
      ver: SAVE_VER, map: S.map, seed: S.seed, nextId: S.nextId, totalKills: S.totalKills,
      stats: S.stats, settings: S.settings, boards,
    });
  }

  const MIGRATIONS = {
    1(o) {
      o.map = 'moonlit';
      o.seed = 0x2545F491;
      o.stats = { played: 0, dmg: 0, bossKills: 0, earned: 0 };
      o.settings = Object.assign({}, DEFAULT_SETTINGS);
      for (const t of o.towers || []) t.dmg = 0;
      o.ver = 2;
      delete o.v;
      return o;
    },
    2(o) {
      const b = { cash: o.cash, cleared: o.cleared, sel: o.sel, auto: o.auto, towers: o.towers || [], records: newRecords() };
      for (const k of ['cash', 'cleared', 'sel', 'auto', 'towers']) delete o[k];
      o.boards = { moonlit: b };
      o.map = 'moonlit';
      o.ver = 3;
      return o;
    },
  };
  function saveVersion(o) { return o.ver | 0 || (o.v === 1 ? 1 : 0); }
  function migrate(o) {
    if (!o || typeof o !== 'object') return null;
    let ver = saveVersion(o);
    if (!ver || ver > SAVE_VER) return null;
    while (ver < SAVE_VER) {
      if (!MIGRATIONS[ver]) return null;
      o = MIGRATIONS[ver](o);
      ver = o.ver;
    }
    return o;
  }

  function cleanSettings(src) {
    const out = Object.assign({}, DEFAULT_SETTINGS);
    if (!src || typeof src !== 'object') return out;
    for (const k of ['sound', 'shake', 'dmgNums']) if (k in src) out[k] = !!src[k];
    if (isFinite(src.vol)) out.vol = Math.max(0, Math.min(1, +src.vol));
    if (NUM_FORMATS.indexOf(src.numFmt) >= 0) out.numFmt = src.numFmt;
    if (SPEEDS.indexOf(src.speed) >= 0) out.speed = src.speed;
    return out;
  }

  function cleanRecords(r) {
    const out = newRecords();
    if (!r || typeof r !== 'object') return out;
    out.time = Math.max(0, +r.time || 0); out.att = r.att | 0; out.wins = r.wins | 0;
    if (r.bosses && typeof r.bosses === 'object') for (const k in r.bosses) if (BOSS_BY_ID[k]) out.bosses[k] = r.bosses[k] | 0;
    if (r.firsts && typeof r.firsts === 'object') for (const k in r.firsts) {
      const n = k | 0, f = r.firsts[k];
      if (n >= 1 && n <= MAX_WAVE && f && typeof f === 'object') out.firsts[n] = { at: Math.max(0, +f.at || 0), att: f.att | 0, lives: f.lives | 0 };
    }
    return out;
  }

  function loadBoard(S, map, src) {
    const b = newBoard(map);
    b.cash = Number(src.cash) || 0;
    b.cleared = Math.max(0, Math.min(MAX_WAVE, src.cleared | 0));
    b.sel = Math.max(1, Math.min(Math.max(1, src.sel | 0), Math.min(MAX_WAVE, b.cleared + 1)));
    b.auto = !!src.auto;
    b.records = cleanRecords(src.records);
    for (const r of src.towers || []) {
      if (!r || !RACES[r.race] || !isFinite(r.x) || !isFinite(r.y)) continue;
      const t = makeTower(S, r.race, +r.x, +r.y);
      t.id = r.id | 0; t.spent = +r.spent || 0; t.paths = (r.paths || [0, 0, 0, 0, 0]).slice(0, 5).map(v => Math.max(0, Math.min(10, v | 0)));
      while (t.paths.length < 5) t.paths.push(0);
      t.infD = r.infD | 0; t.infR = r.infR | 0; t.mode = r.mode || 'first'; t.kills = r.kills | 0; t.dmg = +r.dmg || 0;
      t.face = faceRoad(map, t.x, t.y); t.light = lightAt(map, t.x, t.y);
      b.towers.push(t);
    }
    return b;
  }

  function deserialize(str) {
    const o = migrate(JSON.parse(str));
    if (!o) return null;
    const S = newState();
    S.seed = o.seed >>> 0 || S.seed;
    S.nextId = o.nextId | 0 || 1; S.totalKills = o.totalKills | 0;
    const st = o.stats || {};
    S.stats = { played: st.played | 0, dmg: +st.dmg || 0, bossKills: st.bossKills | 0, earned: +st.earned || 0 };
    S.settings = cleanSettings(o.settings);
    setNumFormat(S.settings.numFmt);
    const src = o.boards && typeof o.boards === 'object' ? o.boards : {};
    const boards = {};
    let maxId = 0;
    for (const id of MAP_IDS) {
      if (!src[id] || typeof src[id] !== 'object') continue;
      boards[id] = loadBoard(S, MAPS[id], src[id]);
      for (const t of boards[id].towers) maxId = Math.max(maxId, t.id);
    }
    let cur = MAPS[o.map] ? o.map : 'moonlit';
    S.boards = boards;
    S.map = cur;
    if (cur !== 'moonlit' && !mapUnlocked(S, cur)) cur = 'moonlit';
    S.map = cur;
    const b = boards[cur] || newBoard(MAPS[cur]);
    delete boards[cur];
    for (const k of BOARD_KEYS) S[k] = b[k];
    S.nextId = Math.max(S.nextId, maxId + 1, 1);
    prepTowers(S);
    return S;
  }

  let numFmt = 'short';
  function setNumFormat(m) { if (NUM_FORMATS.indexOf(m) >= 0) numFmt = m; return numFmt; }
  const UNITS = [[1e33, 'Dc'], [1e30, 'No'], [1e27, 'Oc'], [1e24, 'Sp'], [1e21, 'Sx'], [1e18, 'Qi'], [1e15, 'Qa'], [1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  function sci(n) {
    const a = Math.abs(n);
    const e = Math.floor(Math.log10(a));
    let m = n / Math.pow(10, e);
    if (Math.abs(m) >= 9.995) return (m / 10).toFixed(2) + 'e' + (e + 1);
    return m.toFixed(2) + 'e' + e;
  }
  function fmt(n) {
    if (!isFinite(n)) return '∞';
    const a = Math.abs(n);
    if (a < 1000) return (a < 10 && a % 1 !== 0 ? (Math.round(n * 10) / 10) : Math.floor(n)).toString();
    if (numFmt === 'sci') return sci(n);
    if (numFmt === 'full') return a < 1e15 ? Math.floor(n).toLocaleString('en-US') : sci(n);
    if (a >= 1e36) return sci(n);
    for (const [v, u] of UNITS) if (a >= v) { const x = n / v; const s = x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2); return (s === '1000' ? '999' : s) + u; }
    return String(Math.floor(n));
  }

  const API = {
    WORLD, MAX_WAVE, LIVES, SAVE_VER, TUNE, RACES, RACE_IDS, PATHS, ENEMIES, BOSSES, BOSS_BY_ID, MAPS, MAP_IDS, WAVEGEN,
    DEFAULT_SETTINGS, NUM_FORMATS, SPEEDS,
    hpFor, killCash, clearBonus, waveSpec, bossFor, themeFor, towerCost, nodeCost, infCost, getMap, mapOf, routePos, nearestOnMap, faceRoad,
    newState, owned, nextTowerCost, canPlace, placeTower, sellTower, sellValue, chosenPaths, pathState, nextNodeCost, buyNode, infNext, buyInf,
    upgradeOptions, buyMaxAffordable, maxAffordablePreview, nodeInfo, topWave, bossStatus,
    stats, computeStats, effDmg, effRate, refreshBuffs, startWave, step, canHit, isMagic, isFly,
    serialize, deserialize, migrate, cleanSettings, fmt, setNumFormat, pct, mulberry, hashSeed,
    MAP_BOSSES, UNLOCK_AT, lightAt, crossings, placeBlockReason, switchMap, mapUnlocked, mapCleared, boardOf, newBoard, mapStartCash, activeTricks,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.NDCore = API;
})(typeof window !== 'undefined' ? window : globalThis);
