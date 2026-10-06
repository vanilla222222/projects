(function (root) {
  'use strict';

  const WORLD = { L: 1400, W: 800, towerR: 20, minGap: 44 };
  const MAX_WAVE = 100;
  const LIVES = 10;
  const SAVE_VER = 9;
  const MAX_STARS = 5;
  const SPAWN_GUARD = 15;
  const UNLOCK_AT = 50;
  const BASE_LEN = 1480;

  const TUNE = {
    hp0: 14, hpAll: 1.25,
    hpCurve: [[1, 1.25], [10, 1.21], [20, 1.2], [30, 1.185], [35, 1.16], [45, 1.17], [50, 1.15], [55, 1.105], [60, 1.105], [75, 1.083], [82, 1.054], [90, 1.056], [100, 1.045]],
    cash0: 2.2, cashGrowth: 1.2,
    clear0: 45, clearGrowth: 1.2,
    towerGrowth: 1.5, sellRate: 0.7,
    nodeBase: 0.6, nodeGrowth: 2.1,
    infBase: 4, infGrowth: 4, infMul: 1.25,
    startCash: 160,
  };

  const STAR = { hp: [0, 0.19, 0.21, 0.22, 0.23, 0.23], res: 0.019, speed: 0.03, cash: 0.25, moon: 20, mapMoon: 0.5, bossPlate: 0.06, swift: 0.75, regen: 0.003, lives: 7, eliteFrom: 20, eliteAdd: 0.1 };
  const STAR_MODS = [
    { id: 'plated', star: 1, name: 'Armored bosses', short: 'Plated', desc: 'Bosses wear iron plates: every hit loses a flat chunk of damage.' },
    { id: 'swift', star: 2, name: 'Faster spawns', short: 'Swift', desc: 'DNBs march in 25% closer together.' },
    { id: 'regen', star: 3, name: 'Enemy regen', short: 'Regen', desc: 'DNBs regrow 0.3% of their HP each second, bosses half that.' },
    { id: 'fragile', star: 4, name: 'Fewer lives', short: '7 lives', desc: 'Every wave starts with 7 lives instead of 10.' },
    { id: 'elite', star: 5, name: 'Elites common', short: 'Elites', desc: 'Elite DNBs appear from wave 20 and 10% more often.' },
  ];

  const BRANCHES = [
    { id: 'eco', name: 'Economy', color: '#e3c15b', desc: 'Cash, bonuses and interest.' },
    { id: 'pony', name: 'Ponies', color: '#8fd18b', desc: 'Damage, range and race training.' },
    { id: 'abil', name: 'Abilities', color: '#c39bff', desc: 'Signature power and cooldowns.' },
    { id: 'util', name: 'Utility', color: '#7fc8ff', desc: 'Lives, wave skips and Moonstones.' },
  ];
  const RESEARCH = [
    { id: 'eco_start', br: 'eco', name: 'Nest Egg', max: 3, base: 4, pos: [1, 0], req: [], per: '+50% starting cash on every map', total: lv => '+' + 50 * lv + '% starting cash' },
    { id: 'eco_kill', br: 'eco', name: 'Bounty Ledger', max: 5, base: 6, pos: [0, 1], req: ['eco_start'], per: '+6% cash from every kill', total: lv => '+' + 6 * lv + '% kill cash' },
    { id: 'eco_first', br: 'eco', name: 'Victory Purse', max: 5, base: 6, pos: [2, 1], req: ['eco_start'], per: '+10% first-clear bonus', total: lv => '+' + 10 * lv + '% first-clear bonus' },
    { id: 'eco_interest', br: 'eco', name: 'Moonlit Interest', max: 3, base: 10, pos: [0, 2], req: ['eco_kill'], per: 'Every win pays 1% of held cash, capped at half a clear bonus per level', total: lv => lv + '% interest per win' },
    { id: 'eco_sell', br: 'eco', name: 'Fair Trade', max: 2, base: 10, pos: [1, 2], req: ['eco_kill'], per: '+5% sell refund', total: lv => 'Sell refund ' + (70 + 5 * lv) + '%' },
    { id: 'eco_boss', br: 'eco', name: 'Boss Bounty', max: 3, base: 10, pos: [2, 2], req: ['eco_first'], per: '+25% cash from boss kills', total: lv => '+' + 25 * lv + '% boss cash' },
    { id: 'eco_master', br: 'eco', name: 'Golden Age', max: 1, base: 90, pos: [1, 3], req: ['eco_interest', 'eco_boss'], per: '+15% to all cash', total: () => '+15% all cash' },
    { id: 'eco_offline', br: 'eco', name: 'Night Shift', max: 5, base: 8, pos: [0, 3], req: ['eco_interest'], per: '+20% offline and background earnings', total: lv => '+' + 20 * lv + '% offline earnings' },
    { id: 'pony_dmg', br: 'pony', name: 'Drill Yard', max: 5, base: 4, pos: [1, 0], req: [], per: '+10% damage for every pony', total: lv => '+' + 10 * lv + '% damage' },
    { id: 'pony_cheap', br: 'pony', name: 'Recruiting Fair', max: 2, base: 6, pos: [0, 1], req: ['pony_dmg'], per: 'The first pony of each race costs 25% less', total: lv => 'First copy -' + 25 * lv + '%' },
    { id: 'pony_rate', br: 'pony', name: 'Quick Hooves', max: 4, base: 6, pos: [1, 1], req: ['pony_dmg'], per: '+5% attack speed for every pony', total: lv => '+' + 5 * lv + '% attack speed' },
    { id: 'pony_range', br: 'pony', name: 'Keen Eyes', max: 3, base: 6, pos: [2, 1], req: ['pony_dmg'], per: '+4% range for every pony', total: lv => '+' + 4 * lv + '% range' },
    { id: 'pony_earth', br: 'pony', name: 'Earth Training', max: 3, base: 10, pos: [0, 2], req: ['pony_cheap'], race: 'earth', per: 'Earth ponies: +10% damage, +5% attack speed', total: lv => 'Earth +' + 10 * lv + '% dmg, +' + 5 * lv + '% speed' },
    { id: 'pony_unicorn', br: 'pony', name: 'Unicorn Training', max: 3, base: 10, pos: [1, 2], req: ['pony_rate'], race: 'unicorn', per: 'Unicorns: +10% damage, +5% attack speed', total: lv => 'Unicorn +' + 10 * lv + '% dmg, +' + 5 * lv + '% speed' },
    { id: 'pony_pegasus', br: 'pony', name: 'Pegasus Training', max: 3, base: 10, pos: [2, 2], req: ['pony_range'], race: 'pegasus', per: 'Pegasi: +10% damage, +5% attack speed', total: lv => 'Pegasus +' + 10 * lv + '% dmg, +' + 5 * lv + '% speed' },
    { id: 'pony_bat', br: 'pony', name: 'Bat Training', max: 3, base: 14, pos: [0.5, 3], req: ['pony_unicorn'], race: 'bat', per: 'Bat ponies: +10% damage, +5% attack speed', total: lv => 'Bat +' + 10 * lv + '% dmg, +' + 5 * lv + '% speed' },
    { id: 'pony_crystal', br: 'pony', name: 'Crystal Training', max: 3, base: 14, pos: [1.5, 3], req: ['pony_unicorn'], race: 'crystal', per: 'Crystal ponies: +10% damage, +5% attack speed', total: lv => 'Crystal +' + 10 * lv + '% dmg, +' + 5 * lv + '% speed' },
    { id: 'abil_power', br: 'abil', name: 'Spark of Power', max: 5, base: 4, pos: [1, 0], req: [], per: '+15% signature damage', total: lv => '+' + 15 * lv + '% signature damage' },
    { id: 'abil_cd', br: 'abil', name: 'Second Wind', max: 4, base: 6, pos: [0, 1], req: ['abil_power'], per: 'Signature cooldowns 5% shorter', total: lv => 'Cooldowns -' + 5 * lv + '%' },
    { id: 'abil_crit', br: 'abil', name: 'Lucky Horseshoe', max: 3, base: 6, pos: [2, 1], req: ['abil_power'], per: '+2% crit chance for every pony', total: lv => '+' + 2 * lv + '% crit chance' },
    { id: 'abil_stun', br: 'abil', name: 'Lingering Hex', max: 3, base: 10, pos: [0, 2], req: ['abil_cd'], per: 'Stuns and slows last 10% longer', total: lv => '+' + 10 * lv + '% stun and slow time' },
    { id: 'abil_first', br: 'abil', name: 'Ready Stance', max: 1, base: 40, pos: [1, 2], req: ['abil_cd'], per: 'Signatures start every wave fully charged', total: () => 'Signatures start charged' },
    { id: 'abil_aura', br: 'abil', name: 'Bright Auras', max: 3, base: 10, pos: [2, 2], req: ['abil_crit'], per: 'Auras grant 15% more damage and speed', total: lv => '+' + 15 * lv + '% aura strength' },
    { id: 'abil_master', br: 'abil', name: 'Mythic Surge', max: 1, base: 90, pos: [1, 3], req: ['abil_stun', 'abil_aura'], per: '+25% signature damage, cooldowns 10% shorter', total: () => '+25% power, -10% cooldowns' },
    { id: 'abil_hero', br: 'abil', name: 'Heroic Legends', max: 3, base: 12, pos: [2, 3], req: ['abil_aura'], per: '+15% hero damage, hero cooldowns 8% shorter', total: lv => 'Hero +' + 15 * lv + '% dmg, -' + 8 * lv + '% cooldowns' },
    { id: 'util_lives', br: 'util', name: 'Sturdy Gate', max: 3, base: 4, pos: [1, 0], req: [], per: '+1 life every wave', total: lv => '+' + lv + ' lives' },
    { id: 'util_skip', br: 'util', name: 'Head Start', max: 3, base: 6, pos: [0, 1], req: ['util_lives'], per: 'After a star-up, skip 3 more opening waves (bonuses paid)', total: lv => 'Skip ' + 3 * lv + ' waves after star-up' },
    { id: 'util_leak', br: 'util', name: 'Boss Wardens', max: 2, base: 6, pos: [1, 1], req: ['util_lives'], per: 'Leaked bosses cost 1 life less (min 1)', total: lv => 'Boss leaks -' + lv + ' lives' },
    { id: 'util_moon', br: 'util', name: 'Moon Lens', max: 5, base: 6, pos: [2, 1], req: ['util_lives'], per: '+10% Moonstones from every source', total: lv => '+' + 10 * lv + '% Moonstones' },
    { id: 'util_auto', br: 'util', name: 'Muster Plans', max: 1, base: 30, pos: [0, 2], req: ['util_skip'], per: 'Save your layout on star-up and rebuild it with one click, plus 2 more plan slots', total: () => 'Star-up layout and 5 plan slots' },
    { id: 'util_star', br: 'util', name: 'Star Hunter', max: 3, base: 10, pos: [2, 2], req: ['util_moon'], per: '+1 Moonstone per first-clear boss wave', total: lv => '+' + lv + ' per boss wave' },
    { id: 'util_hero', br: 'util', name: 'Hero Academy', max: 3, base: 8, pos: [1, 2], req: ['util_leak'], per: '+25% hero XP from every kill', total: lv => '+' + 25 * lv + '% hero XP' },
    { id: 'util_master', br: 'util', name: 'Moonlit Crown', max: 1, base: 90, pos: [1, 3], req: ['util_auto', 'util_star'], per: '+2 lives and +20% Moonstones', total: () => '+2 lives, +20% Moonstones' },
    { id: 'util_offline', br: 'util', name: 'Long Watch', max: 4, base: 8, pos: [2, 3], req: ['util_star'], per: 'Offline earnings cap +2h', total: lv => 'Offline cap ' + (8 + 2 * lv) + 'h' },
  ];
  const RESEARCH_BY_ID = {};
  for (const r of RESEARCH) RESEARCH_BY_ID[r.id] = r;
  const NO_RS = {};

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
      ability: 'Skyward Eye: rapid feather darts that see and hit flying DNBs from long range. Cannot harm magical DNBs.',
    },
    bat: {
      id: 'bat', name: 'Bat Pony', cost: 80, range: 145, dmg: 7, rate: 1.6,
      body: '#5b5470', mane: '#2b2238', accent: '#ff5a7a',
      role: 'Night hunter',
      ability: 'Echo Fang: quick sonic bites that see flyers and deal 50% more damage to fast or sprinting DNBs. Cannot harm magical DNBs.',
    },
    crystal: {
      id: 'crystal', name: 'Crystal Pony', cost: 110, range: 130, dmg: 7, rate: 0.8,
      body: '#9fe6ff', mane: '#d68bff', accent: '#7fe8ff',
      role: 'Gem support',
      ability: 'Heartglow: ponies within 130 deal 4% more damage and attack 2% faster. Its glow lights dark caves and reveals stealthy DNBs within 70. Fires crystal shards at ground DNBs. Cannot see flyers or harm magical DNBs.',
    },
  };
  const RACE_IDS = ['earth', 'unicorn', 'pegasus', 'bat', 'crystal'];

  function pct(v) { return Math.round(v * 100) + '%'; }

  const PATHS = {
    earth: [
      { id: 'stonehoof', name: 'Stonehoof', blurb: 'Harder stomps that rattle DNBs senseless.',
        node: '+20% damage, stomps ignore 10% of armor. From node 5, stomps may stun. Counters Ironhides.',
        sig: 'Earthshatter', sigDesc: 'Every 4th stomp deals 5x damage and stuns everything hit for 1s.',
        apply(lv, s) { s.dmg *= 1 + 0.2 * lv; s.pierce = Math.min(1, s.pierce + 0.1 * lv); if (lv >= 5) { s.stunCh = Math.max(s.stunCh, 0.15); s.stunDur = Math.max(s.stunDur, 0.4); } if (lv >= 10) s.sigs.push('earthshatter'); } },
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
        node: '+20% damage, bolts ignore 10% of armor. Counters Ironhides.',
        sig: 'Starfall', sigDesc: 'Every 6s a falling star strikes the toughest DNB in range for 12x damage in a wide blast that hits anything.',
        apply(lv, s) { s.dmg *= 1 + 0.2 * lv; s.pierce = Math.min(1, s.pierce + 0.1 * lv); if (lv >= 10) s.sigs.push('starfall'); } },
      { id: 'skyward', name: 'Skyward Sight', blurb: 'A far-seeing spell that tracks DNBs in the air.',
        node: 'Node 1 lets this unicorn target flyers. From node 3 it detects stealthy DNBs. +6% range, +12% vs flyers.',
        sig: 'Aurora Lance', sigDesc: 'Bolts deal 3x damage to flyers and arc to 2 more flyers.',
        apply(lv, s) { if (lv >= 1) s.canFly = true; if (lv >= 3) s.detects = true; s.range *= 1 + 0.06 * lv; s.flyMul *= 1 + 0.12 * lv; if (lv >= 10) { s.flyMul *= 3; s.sigs.push('aurora'); } } },
      { id: 'chrono', name: 'Chronomancy', blurb: 'Bends the moments around each bolt.',
        node: 'Bolts slow by +4% for 1.5s, +5% attack speed.',
        sig: 'Time Stop', sigDesc: 'Every 10s freezes every DNB in range for 1.5s (bosses 0.5s).',
        apply(lv, s) { s.slow = Math.max(s.slow, 0.04 * lv); s.slowDur = Math.max(s.slowDur, 1.5); s.rate *= 1 + 0.05 * lv; if (lv >= 10) s.sigs.push('timestop'); } },
      { id: 'prismatic', name: 'Prismatic', blurb: 'Bolts that shatter into light on impact.',
        node: 'Bolts splash (radius grows), +6% damage, +15% vs swarms. Counters Gnats.',
        sig: 'Prism Burst', sigDesc: 'Each bolt also splits into 4 shards that seek nearby DNBs for half damage.',
        apply(lv, s) { if (lv > 0) s.splash = Math.max(s.splash, 24 + 6 * lv); s.dmg *= 1 + 0.06 * lv; s.swarmMul *= 1 + 0.15 * lv; if (lv >= 10) s.sigs.push('prismburst'); } },
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
        node: '+1 extra target at nodes 3, 6 and 9. +6% damage, +10% vs swarms.',
        sig: 'Feather Storm', sigDesc: 'Every attack fires at every valid DNB in range.',
        apply(lv, s) { s.multi += (lv >= 3) + (lv >= 6) + (lv >= 9); s.dmg *= 1 + 0.06 * lv; s.swarmMul *= 1 + 0.1 * lv; if (lv >= 10) s.sigs.push('featherstorm'); } },
    ],
    bat: [
      { id: 'nightstalker', name: 'Nightstalker', blurb: 'Hunts whatever runs fastest.',
        node: '+12% damage, +10% vs fast DNBs.',
        sig: 'Midnight Feast', sigDesc: 'Fast DNBs take triple damage, and every bite on one slows it by 30% for 2s.',
        apply(lv, s) { s.dmg *= 1 + 0.12 * lv; s.fastMul *= 1 + 0.1 * lv; if (lv >= 10) { s.fastMul *= 3; s.sigs.push('nightfeast'); } } },
      { id: 'sonar', name: 'Echolocation', blurb: 'Sonar that finds whatever hides. Reveals stealthy DNBs.',
        node: 'Node 1 lets this bat detect stealthy DNBs. +6% range. From node 5, ponies within 160 detect them too.',
        sig: 'Deep Echo', sigDesc: 'Every 5s a sonar pulse reveals every DNB within twice this bat\'s range for 4s: any pony can hit them and they take 20% more damage. This bat can also bite burrowed DNBs.',
        apply(lv, s) { if (lv >= 1) s.detects = true; s.range *= 1 + 0.06 * lv; if (lv >= 5) s.detectR = Math.max(s.detectR, 160); if (lv >= 10) { s.seesBurrow = true; s.sigs.push('deepecho'); } } },
      { id: 'colony', name: 'Colony', blurb: 'A bat pony never hunts alone.',
        node: '+1 extra target at nodes 3, 6 and 9. +6% damage.',
        sig: 'Swarm Night', sigDesc: 'Every 7s releases 8 swarm bats that seek DNBs in range for 3x damage each.',
        apply(lv, s) { s.multi += (lv >= 3) + (lv >= 6) + (lv >= 9); s.dmg *= 1 + 0.06 * lv; if (lv >= 10) s.sigs.push('swarmnight'); } },
      { id: 'crimson', name: 'Crimson Fang', blurb: 'Bites that always find the vein.',
        node: '+3% crit chance, crits deal 3x. +5% damage.',
        sig: 'Blood Moon', sigDesc: 'Every 14s, for 5s, every bite crits and lands on every valid DNB in range.',
        apply(lv, s) { s.crit += 0.03 * lv; if (lv >= 1) s.critMul = Math.max(s.critMul, 3); s.dmg *= 1 + 0.05 * lv; if (lv >= 10) s.sigs.push('bloodmoon'); } },
      { id: 'terror', name: 'Night Terror', blurb: 'Shrieks that rattle anything with wings.',
        node: '+12% vs flyers, +4% attack speed. From node 5, bites may stun for 0.4s.',
        sig: 'Dread Screech', sigDesc: 'Every 9s a screech stuns every DNB in range for 1s (bosses 0.3s) and hexes them to take 25% more damage for 4s.',
        apply(lv, s) { s.flyMul *= 1 + 0.12 * lv; s.rate *= 1 + 0.04 * lv; if (lv >= 5) { s.stunCh = Math.max(s.stunCh, 0.1); s.stunDur = Math.max(s.stunDur, 0.4); } if (lv >= 10) s.sigs.push('dreadscreech'); } },
    ],
    crystal: [
      { id: 'resonance', name: 'Resonance', blurb: 'A gem song that lifts every pony nearby.',
        node: 'Aura +0.8% damage, +0.5% attack speed, +4 radius.',
        sig: 'Harmonic Chorus', sigDesc: 'Every 10s a harmonic surge gives every pony in the aura +25% attack speed for 3s.',
        apply(lv, s) { s.auraDmg += 0.008 * lv; s.auraRate += 0.005 * lv; s.auraR += 4 * lv; if (lv >= 10) s.sigs.push('chorus'); } },
      { id: 'wall', name: 'Crystal Wall', blurb: 'Grows a crystal wall across the nearest road to bog DNBs down.',
        node: 'Ground DNBs inside the wall move 5% slower per node (bosses half). +4 wall radius.',
        sig: 'Prism Fortress', sigDesc: 'Every 3s the wall pulses: 6x damage to every ground DNB inside it and a 0.6s stun (bosses 0.2s).',
        apply(lv, s) { s.wall = 0.05 * lv; s.wallR = 46 + 4 * lv; if (lv >= 10) s.sigs.push('fortress'); } },
      { id: 'spellshard', name: 'Spellshard', blurb: 'Shards cut with old unicorn runes. Lets a crystal pony hurt magical DNBs.',
        node: 'Node 1 unlocks damage to magical DNBs. +8% damage, +12% vs magical.',
        sig: 'Dispel Prism', sigDesc: 'Shards strip magic from DNBs for 4s so any pony can hit them, and deal triple damage to magical foes.',
        apply(lv, s) { if (lv >= 1) s.canMagic = true; s.dmg *= 1 + 0.08 * lv; s.magicMul *= 1 + 0.12 * lv; if (lv >= 10) { s.magicMul *= 3; s.sigs.push('dispelprism'); } } },
      { id: 'lumen', name: 'Lumen', blurb: 'A heart of light that pushes back the dark and sharpens every eye.',
        node: '+14 light radius, +8 reveal radius, ponies in the aura gain +0.6% range. +4% damage.',
        sig: 'Dawnstone', sigDesc: 'The light fills the whole aura, ponies in it gain another +3% range, and they all detect stealthy DNBs.',
        apply(lv, s) { s.lightR += 14 * lv; s.revealR += 8 * lv; s.auraRange += 0.006 * lv; s.dmg *= 1 + 0.04 * lv; if (lv >= 10) { s.auraRange += 0.03; s.detects = true; s.sigs.push('dawnstone'); } } },
      { id: 'geode', name: 'Geode Burst', blurb: 'Shards that burst into glittering fragments.',
        node: 'Shards splash (radius grows), +8% damage, +15% vs swarms. Counters Gnats.',
        sig: 'Crystal Cataclysm', sigDesc: 'Every 8s a giant crystal erupts under the toughest DNB in range: 15x damage to everything nearby and a 1s encase (bosses 0.3s).',
        apply(lv, s) { if (lv > 0) s.splash = Math.max(s.splash, 22 + 6 * lv); s.dmg *= 1 + 0.08 * lv; s.swarmMul *= 1 + 0.15 * lv; if (lv >= 10) s.sigs.push('cataclysm'); } },
    ],
  };

  const ENEMIES = {
    basic: { id: 'basic', name: 'DNB Shambler', short: 'Shambler', trait: 'Plain and steady.', hp: 1, speed: 62, r: 13, cash: 1, color: '#8a6544', dark: '#4a3220' },
    fast: { id: 'fast', name: 'DNB Skitter', short: 'Skitter', trait: 'Fast and frail.', hp: 0.55, speed: 118, r: 11, cash: 0.8, color: '#a8805a', dark: '#5a3f26' },
    tanky: { id: 'tanky', name: 'DNB Brute', short: 'Brute', trait: 'Slow, with 3.4x HP.', hp: 3.4, speed: 38, r: 18, cash: 2.5, color: '#6b4c31', dark: '#36261a' },
    flying: { id: 'flying', name: 'DNB Duskwing', short: 'Duskwing', trait: 'Flies. Only pegasi and sky-sighted unicorns can hit it.', hp: 0.8, speed: 78, r: 12, cash: 1.3, flying: true, color: '#7d5c48', dark: '#3f2c22' },
    magical: { id: 'magical', name: 'DNB Hexling', short: 'Hexling', trait: 'Magical. Only unicorns and ley-hoofed earth ponies can hurt it.', hp: 1.3, speed: 56, r: 13, cash: 1.5, magical: true, color: '#86606a', dark: '#46303a' },
    swarm: { id: 'swarm', name: 'DNB Gnat', short: 'Gnat', trait: 'Tiny and fast, and always arrives in a swarm of 5.', hp: 0.2, speed: 128, r: 7, cash: 0.22, swarm: true, color: '#9a7a52', dark: '#4e3a22' },
    healer: { id: 'healer', name: 'DNB Mender', short: 'Mender', trait: 'Every 2.5s it heals DNBs within 110 for 6% of their max HP.', hp: 0.9, speed: 54, r: 13, cash: 1.6, heal: { every: 2.5, r: 110, pct: 0.06 }, color: '#7a8a5a', dark: '#3a4428' },
    splitter: { id: 'splitter', name: 'DNB Splitter', short: 'Splitter', trait: 'Splits into 3 quick Splitlings when slain. They pick up right where it fell.', hp: 1.1, speed: 52, r: 15, cash: 1.1, split: { n: 3, type: 'mini' }, color: '#8a6a7a', dark: '#44323c' },
    mini: { id: 'mini', name: 'DNB Splitling', short: 'Splitling', trait: 'A shard of a Splitter. Small, quick and frail.', hp: 0.25, speed: 88, r: 8, cash: 0.25, child: true, color: '#9a7a8a', dark: '#4c3a44' },
    stealth: { id: 'stealth', name: 'DNB Lurker', short: 'Lurker', trait: 'Stealthy: only ponies that detect can target it, unless something reveals it.', hp: 0.8, speed: 70, r: 12, cash: 1.4, stealth: true, color: '#6a6a7e', dark: '#30303e' },
    burrower: { id: 'burrower', name: 'DNB Tunneler', short: 'Tunneler', trait: 'Dives underground on stretches of the road and cannot be hit while buried.', hp: 1.2, speed: 60, r: 14, cash: 1.4, burrow: { cycle: 460, under: 190 }, color: '#7a5a3a', dark: '#3c2a1a' },
    shield: { id: 'shield', name: 'DNB Bulwark', short: 'Bulwark', trait: 'Projects a bubble over DNBs within 100 that soaks up damage equal to 25% of their max HP.', hp: 1.3, speed: 48, r: 15, cash: 1.8, aegis: { r: 100, pct: 0.25 }, color: '#5a6a7e', dark: '#2a323e' },
    armored: { id: 'armored', name: 'DNB Ironhide', short: 'Ironhide', trait: 'Armored: every hit loses a flat chunk of damage, so small hits barely scratch it.', hp: 1.8, speed: 44, r: 16, cash: 2.1, plate: 0.03, color: '#6a645a', dark: '#34302a' },
    boss: { id: 'boss', name: 'Boss', short: 'Boss', trait: 'A wave boss. Leaking it costs 5 lives.', hp: 26, speed: 36, r: 26, cash: 20, color: '#5e3f28', dark: '#2c1c12' },
  };
  const ENEMY_IDS = ['basic', 'fast', 'tanky', 'flying', 'magical', 'swarm', 'healer', 'splitter', 'mini', 'stealth', 'burrower', 'shield', 'armored'];
  const ELITE = { hp: 2.2, cash: 3, speed: 1.12, r: 1.2 };

  const MECH = {
    plain: { tag: 'Plain', weak: 'Nothing special. Any pony will do.', counters: ['Any pony'] },
    fast: { tag: 'Fast', weak: 'Low HP. Slows and bat ponies punish it.', counters: ['Bat Pony (Nightstalker)', 'Unicorn (Chronomancy)', 'Earth Pony (Mudslide)'] },
    tanky: { tag: 'Tough', weak: 'Slow, so every pony gets many hits in.', counters: ['Unicorn (Hexweaver)', 'Earth Pony (Stonehoof)'] },
    flying: { tag: 'Flies', weak: 'Ground ponies cannot reach it.', counters: ['Pegasus', 'Bat Pony', 'Unicorn (Skyward Sight)'] },
    magical: { tag: 'Magical', weak: 'Only magic-touched ponies can hurt it.', counters: ['Unicorn', 'Earth Pony (Ley Hooves)', 'Crystal Pony (Spellshard)'] },
    swarm: { tag: 'Swarm', weak: 'Tiny HP. Splash and multi-target attacks shred whole swarms.', counters: ['Unicorn (Prismatic)', 'Crystal Pony (Geode Burst)', 'Earth Pony stomps', 'Pegasus (Feather Volley)'] },
    healer: { tag: 'Heals', weak: 'Frail itself. Kill it first or out-damage the pulse.', counters: ['Pegasus (Skyhunter crits)', 'Unicorn (Arcanist)', 'Bat Pony (Crimson Fang)'] },
    split: { tag: 'Splits', weak: 'The pieces are frail and keep its place on the road. Splash cleans them up.', counters: ['Unicorn (Prismatic)', 'Crystal Pony (Geode Burst)', 'Earth Pony stomps'] },
    stealth: { tag: 'Stealth', weak: 'Cannot be targeted until detected or revealed.', counters: ['Bat Pony (Echolocation)', 'Unicorn (Skyward Sight 3+)', 'Crystal Pony glow', 'Glowing cave crystals'] },
    burrow: { tag: 'Burrows', weak: 'Exposed while above ground. Place ponies where it surfaces.', counters: ['Bat Pony (Deep Echo)', 'Earth Pony (Herd Call stampede)', 'Crystal Pony (Crystal Wall)'] },
    aegis: { tag: 'Shields', weak: 'The bubble pops under steady fire, and dies with the Bulwark.', counters: ['Pegasus (Swiftfeather)', 'Bat Pony (Colony)', 'Unicorn (Hexweaver)'] },
    plate: { tag: 'Armored', weak: 'Big hits matter. Armor piercing ignores it.', counters: ['Earth Pony (Stonehoof)', 'Unicorn (Arcanist)', 'Crits from Crimson Fang or Skyhunter'] },
    regen: { tag: 'Regrows', weak: 'Burst it down before it recovers.', counters: ['Unicorn (Arcanist)', 'Bat Pony (Crimson Fang)'] },
    sprint: { tag: 'Sprints', weak: 'Slows and stuns blunt the charge.', counters: ['Unicorn (Chronomancy)', 'Earth Pony (Mudslide)', 'Bat Pony (Night Terror)'] },
    blink: { tag: 'Blinks', weak: 'Long range ponies get more time on it.', counters: ['Unicorn', 'Pegasus (Stormwing)'] },
    shell: { tag: 'Shell', weak: 'Save your burst for when the shell drops.', counters: ['Unicorn (Hexweaver)', 'Earth Pony (Stonehoof)'] },
    haste: { tag: 'Hastes', weak: 'Kill the escort, or slow the whole pack.', counters: ['Crystal Pony (Crystal Wall)', 'Unicorn (Chronomancy)'] },
    brood: { tag: 'Broods', weak: 'Splash handles the spawn.', counters: ['Unicorn (Prismatic)', 'Earth Pony stomps', 'Crystal Pony (Geode Burst)'] },
    phase: { tag: 'Shifts form', weak: 'Bring both flyer hunters and magic.', counters: ['Unicorn (Skyward Sight)', 'Crystal Pony (Spellshard)'] },
    twin: { tag: 'Twins', weak: 'Two bodies, each with less HP.', counters: ['Cover every road'] },
    elite: { tag: 'Elite', weak: '2.2x HP, faster, and late on an extra trick. Focus fire with Strongest targeting.', counters: ['Unicorn (Arcanist)', 'Earth Pony (Stonehoof)'] },
  };

  const BOSSES = [
    { id: 'mudmaw', name: 'Mudmaw', trick: 'burrow', hpMul: 1, desc: 'Burrows underground every few seconds and cannot be hit while buried.', color: '#7a5634', dark: '#3a2616' },
    { id: 'mother-mire', name: 'Mother Mire', hpMul: 0.9, desc: 'Spits out a swarm of 6 Gnats each time she loses a quarter of her HP.', color: '#6e5a3a', dark: '#352a1a',
      tricks: { brood: { type: 'swarm', n: 6, at: [0.75, 0.5, 0.25] } }, look: { horns: 'ears', eyes: '#ffcf6a', size: 1.05 } },
    { id: 'skyrend', name: 'Skyrend', trick: 'flying', hpMul: 0.55, desc: 'A winged brute. Only pegasi, bat ponies and sky-sighted unicorns can hit it.', color: '#6b4d3c', dark: '#33231a' },
    { id: 'hexhulk', name: 'The Hexhulk', hpMul: 0.5, desc: 'Wrapped in dark magic and iron plates. Only magic-touched ponies can hurt it, and small hits glance off.', color: '#6e4a5c', dark: '#35222c',
      tricks: { magic: true, plate: 0.12 }, look: { horns: 'curl', aura: '#c08bff', eyes: '#f0c8ff', size: 1.1 } },
    { id: 'gloamrunner', name: 'Gloamrunner', hpMul: 0.9, desc: 'Breaks into a triple-speed sprint every 6s, and fades from sight for 2s every 7s.', color: '#8a6040', dark: '#432c1a',
      tricks: { sprint: { every: 6, dur: 1.5, mul: 3 }, cloak: { every: 7, dur: 2 } }, look: { horns: 'ears', eyes: '#ffe066' } },
    { id: 'bramble-king', name: 'Bramble King', hpMul: 0.5, desc: 'Regrows 1% HP per second, and every 3s a green pulse heals DNBs within 150 for 10% of their HP.', color: '#5c5a34', dark: '#2c2a16',
      tricks: { regen: { rate: 0.01, aura: 0 }, heal: { every: 3, r: 150, pct: 0.1 } }, look: { horns: 'antler', spikes: true, aura: '#9fe36a', eyes: '#d8ff8a' } },
    { id: 'duskwraith', name: 'Duskwraith', hpMul: 0.55, desc: 'Flickers between flying and magical forms every 4s, and vanishes for 2s every 6s.', color: '#5a4660', dark: '#2a2030',
      tricks: { phase: { every: 4 }, cloak: { every: 6, dur: 2 } }, look: { horns: 'none', aura: '#b48bff', eyes: '#e0c8ff' } },
    { id: 'colossus', name: 'Stonehide Colossus', hpMul: 0.7, desc: 'Thick stone plates shrug off small hits, and its shell blocks 40% of damage until it drops below half HP.', color: '#6a6258', dark: '#34302a',
      tricks: { plate: 0.18, armor: { cut: 0.4, until: 0.5 } }, look: { horns: 'spike', spikes: true, eyes: '#ffb04a', size: 1.2 } },
    { id: 'twin-shade', name: 'Twin Shade', hpMul: 0.17, desc: 'Shields DNBs within 130 with a bubble worth 35% of their HP, and splits into two shades when slain.', color: '#4e3a30', dark: '#241a14',
      tricks: { aegis: { r: 130, pct: 0.35 }, split: { n: 2, frac: 0.25, name: 'Shade' } }, look: { horns: 'curl', aura: '#8ab0ff', eyes: '#c8d8ff' } },
    { id: 'nightmother', name: 'The Nightmother', hpMul: 0.11, desc: 'Sprints and summons Gnats, then takes to the air and cloaks, then turns magical, regrows and shields her brood.', color: '#3e2a3a', dark: '#1c121a',
      tricks: { stages: [{ above: 0.66, sprint: { every: 7, dur: 1.2, mul: 3 }, summon: { type: 'swarm', every: 6, n: 4 } }, { above: 0.33, fly: true, cloak: { every: 7, dur: 1.6 } }, { above: 0, magic: true, regen: { rate: 0.012, aura: 120 }, aegis: { r: 140, pct: 0.3 } }] },
      look: { horns: 'curl', spikes: true, aura: '#c06bff', eyes: '#ff6a8a', size: 1.25 } },
  ];

  const MAP_BOSSES = {
    woods: [
      { id: 'thornback', name: 'Thornback Boar', hpMul: 0.8, desc: 'Charges in bursts of 2.6x speed every 5s. Its thorny hide is armored, so small hits barely scratch it.', color: '#6a5232', dark: '#33261a',
        tricks: { sprint: { every: 5, dur: 1.6, mul: 2.6 }, plate: 0.1 }, look: { horns: 'tusk', spikes: true, eyes: '#ffb04a' } },
      { id: 'hollow-stag', name: 'Hollow Stag', hpMul: 0.9, desc: 'Fades into the trees for 1.6s every 4.5s. Only detecting ponies can hit it while it is hidden.', color: '#5e6650', dark: '#2c3226',
        tricks: { cloak: { every: 4.5, dur: 1.6 } }, look: { horns: 'antler', eyes: '#d8f0a0' } },
      { id: 'mossmother', name: 'Mossmother', hpMul: 0.8, desc: 'Sheds a swarm of 6 Gnats every time she loses a fifth of her HP.', color: '#4f6a3a', dark: '#26341c',
        tricks: { brood: { type: 'swarm', n: 6, at: [0.8, 0.6, 0.4, 0.2] } }, look: { horns: 'ears', aura: '#7fd66a', eyes: '#c8ff8a' } },
      { id: 'owlbear-shade', name: 'Owlbear Shade', hpMul: 0.55, desc: 'A winged beast that swoops at 2x speed every 6s. Only flyer hunters can hit it.', color: '#6a5a4a', dark: '#342a22',
        tricks: { fly: true, sprint: { every: 6, dur: 1.4, mul: 2 } }, look: { horns: 'ears', eyes: '#ffe066' } },
      { id: 'willow-wisp', name: 'Willow Wisp', hpMul: 0.48, desc: 'A drifting magical light that blinks 110 paces ahead every 6s and winks out of sight for 2s every 5s.', color: '#6a7a86', dark: '#2e3640',
        tricks: { magic: true, blink: { every: 6, dist: 110 }, cloak: { every: 5, dur: 2 } }, look: { horns: 'none', aura: '#9fe8ff', eyes: '#e8ffff', size: 0.9 } },
      { id: 'rootcrawler', name: 'Rootcrawler', hpMul: 0.7, desc: 'Burrows for 2s every 4s and regrows 1% HP per second.', color: '#5c4a30', dark: '#2a2014',
        tricks: { burrow: { every: 4, dur: 2 }, regen: { rate: 0.01, aura: 0 } }, look: { horns: 'spike', spikes: true, eyes: '#ff9a5a' } },
      { id: 'fungal-titan', name: 'Fungal Titan', hpMul: 0.5, desc: 'Every 3s a spore pulse heals DNBs within 150 for 12% of their HP. Bursts into 4 Splitters at half HP.', color: '#7a5a6a', dark: '#3a2a34',
        tricks: { heal: { every: 3, r: 150, pct: 0.12 }, brood: { type: 'splitter', n: 4, at: [0.5] } }, look: { horns: 'curl', aura: '#d68bff', eyes: '#ffd0f0', size: 1.15 } },
      { id: 'barkskin-warden', name: 'Barkskin Warden', hpMul: 0.7, desc: 'Every 6s it hardens its bark for 3s, blocking 70% of damage, and shields DNBs within 130 for 35% of their HP.', color: '#6b5436', dark: '#33281a',
        tricks: { shell: { every: 6, dur: 3, cut: 0.7 }, aegis: { r: 130, pct: 0.35 } }, look: { horns: 'antler', spikes: true, eyes: '#ffcf6a', size: 1.1 } },
      { id: 'twin-dryads', name: 'Twin Dryads', hpMul: 0.3, desc: 'Two dryads walk together. Each quickens DNBs within 140 by 40% and heals them for 8% every 3s.', color: '#5a7a4a', dark: '#2a3a22',
        tricks: { twin: true, haste: { r: 140, mul: 1.4 }, heal: { every: 3, r: 140, pct: 0.08 } }, look: { horns: 'ears', aura: '#9fe39a', eyes: '#f0ffc8', size: 0.9 } },
      { id: 'elder-blight', name: 'The Elder Blight', hpMul: 0.15, desc: 'Plated and spawning Gnats, then airborne and hastening its kin, then magical, regrowing and healing.', color: '#3a3a26', dark: '#1a1a10',
        tricks: { brood: { type: 'swarm', n: 6, at: [0.85, 0.7] }, stages: [{ above: 0.66, plate: 0.12 }, { above: 0.33, fly: true, haste: { r: 160, mul: 1.4 } }, { above: 0, magic: true, regen: { rate: 0.012, aura: 0 }, heal: { every: 3, r: 150, pct: 0.1 } }] },
        look: { horns: 'antler', spikes: true, aura: '#8aff6a', eyes: '#c8ff3a', size: 1.2 } },
    ],
    caverns: [
      { id: 'geode-grub', name: 'Geode Grub', hpMul: 0.95, desc: 'Tunnels through the rock for 1.8s every 5s.', color: '#6a5a6e', dark: '#342a36',
        tricks: { burrow: { every: 5, dur: 1.8 } }, look: { horns: 'none', spikes: true, eyes: '#c8a8ff' } },
      { id: 'shardling-queen', name: 'Shardling Queen', hpMul: 0.8, desc: 'Sheds 3 Lurkers each time she loses a quarter of her HP. Bring detection.', color: '#7a5a86', dark: '#3a2a40',
        tricks: { brood: { type: 'stealth', n: 3, at: [0.75, 0.5, 0.25] } }, look: { horns: 'spike', aura: '#c08bff', eyes: '#f0c8ff' } },
      { id: 'quartz-golem', name: 'Quartz Golem', hpMul: 0.7, desc: 'Crystal plates shrug off small hits, and it shields DNBs within 120 for 35% of their HP.', color: '#8a8a96', dark: '#44444c',
        tricks: { plate: 0.12, aegis: { r: 120, pct: 0.35 } }, look: { horns: 'spike', spikes: true, eyes: '#a8f0ff', size: 1.15 } },
      { id: 'glimmer-moth', name: 'Glimmer Moth', hpMul: 0.52, desc: 'Flies, blinks 120 paces ahead every 5s, and dims to nothing for 1.8s every 6s.', color: '#8a7a5a', dark: '#44382a',
        tricks: { fly: true, blink: { every: 5, dist: 120 }, cloak: { every: 6, dur: 1.8 } }, look: { horns: 'curl', aura: '#ffe9a8', eyes: '#fff2c8', size: 0.9 } },
      { id: 'echo-bat-lord', name: 'Echo Bat Lord', hpMul: 0.5, desc: 'Flies, and screeches out 4 Duskwings each time it loses a quarter of its HP.', color: '#5a4a5e', dark: '#2a2030',
        tricks: { fly: true, brood: { type: 'flying', n: 4, at: [0.75, 0.5, 0.25] } }, look: { horns: 'ears', eyes: '#ff6a8a' } },
      { id: 'amethyst-hex', name: 'Amethyst Hex', hpMul: 0.45, desc: 'Magical. Regrows 1% HP per second and pulses every 3s to heal DNBs within 140 for 10%.', color: '#7a4a8a', dark: '#3a2244',
        tricks: { magic: true, regen: { rate: 0.01, aura: 0 }, heal: { every: 3, r: 140, pct: 0.1 } }, look: { horns: 'curl', aura: '#c08bff', eyes: '#e8b0ff' } },
      { id: 'prism-wyrm', name: 'Prism Wyrm', hpMul: 0.52, desc: 'Flickers between flying and magical forms every 3.5s and lunges at 2.4x speed every 7s.', color: '#5a6a8a', dark: '#2a3244',
        tricks: { phase: { every: 3.5 }, sprint: { every: 7, dur: 1.2, mul: 2.4 } }, look: { horns: 'spike', aura: '#9fd0ff', eyes: '#c8f0ff', size: 1.1 } },
      { id: 'deepvein-twins', name: 'Deepvein Twins', hpMul: 0.33, desc: 'One twin takes each tunnel. Both burrow for 1.5s every 5s.', color: '#6a4a3a', dark: '#34241a',
        tricks: { twin: true, burrow: { every: 5, dur: 1.5 } }, look: { horns: 'tusk', spikes: true, eyes: '#ffa86a' } },
      { id: 'obsidian-colossus', name: 'Obsidian Colossus', hpMul: 0.2, desc: 'Plated in obsidian, and every 6s its shell blocks 60% of damage for 2.5s. Shatters into 3 shards when slain.', color: '#3a3440', dark: '#1a161e',
        tricks: { plate: 0.1, shell: { every: 6, dur: 2.5, cut: 0.6 }, split: { n: 3, frac: 0.2, name: 'Obsidian Shard' } }, look: { horns: 'spike', spikes: true, eyes: '#ff5a3a', size: 1.25 } },
      { id: 'crystal-heart', name: 'The Crystal Heart', hpMul: 0.14, desc: 'Magical behind a crystal bubble, then shifting forms and cloaking, then airborne, regrowing and hastening every DNB near it.', color: '#8a5aa0', dark: '#40244e',
        tricks: { stages: [{ above: 0.66, magic: true, bubble: { every: 8, pct: 0.06 } }, { above: 0.33, phase: { every: 3 }, cloak: { every: 7, dur: 1.6 } }, { above: 0, fly: true, regen: { rate: 0.012, aura: 140 }, haste: { r: 170, mul: 1.5 } }] },
        look: { horns: 'spike', spikes: true, aura: '#f08bff', eyes: '#ffe0ff', size: 1.2 } },
    ],
    cliffs: [
      { id: 'gale-harpy', name: 'Gale Harpy', hpMul: 0.55, desc: 'Flies and rides the wind: gusts never push her back, and she surges at 2x speed during them.', color: '#6a6a7a', dark: '#32323c',
        tricks: { fly: true, windrider: true }, look: { horns: 'ears', eyes: '#ffe066' } },
      { id: 'cliff-crusher', name: 'Cliff Crusher', hpMul: 0.7, desc: 'Rock plates shrug off small hits, and it charges at 2.4x speed every 6s.', color: '#6a6256', dark: '#34302a',
        tricks: { plate: 0.12, sprint: { every: 6, dur: 1.4, mul: 2.4 } }, look: { horns: 'tusk', spikes: true, eyes: '#ffb04a', size: 1.15 } },
      { id: 'thunder-ram', name: 'Thunder Ram', hpMul: 0.9, desc: 'Charges at 3.5x speed for 1.2s every 4s.', color: '#7a6a4a', dark: '#3a3222',
        tricks: { sprint: { every: 4, dur: 1.2, mul: 3.5 } }, look: { horns: 'curl', eyes: '#a8e0ff' } },
      { id: 'squall-brood', name: 'Squall Brood', hpMul: 0.5, desc: 'Flies, and releases a swarm of 6 Gnats each time it loses a quarter of its HP.', color: '#5a6a7a', dark: '#2a323c',
        tricks: { fly: true, brood: { type: 'swarm', n: 6, at: [0.75, 0.5, 0.25] } }, look: { horns: 'ears', aura: '#9fd0ff', eyes: '#c8f0ff' } },
      { id: 'rain-wraith', name: 'Rain Wraith', hpMul: 0.48, desc: 'Magical. Heals DNBs within 140 for 10% every 3s, and hides in the rain for 2s every 6s.', color: '#4a5a6e', dark: '#222a36',
        tricks: { magic: true, heal: { every: 3, r: 140, pct: 0.1 }, cloak: { every: 6, dur: 2 } }, look: { horns: 'none', aura: '#7fb8ff', eyes: '#d0e8ff' } },
      { id: 'rockslide', name: 'Rockslide', hpMul: 0.2, desc: 'Plated in stone, and breaks into 4 boulders when slain.', color: '#7a6e5e', dark: '#3a342c',
        tricks: { plate: 0.1, split: { n: 4, frac: 0.17, name: 'Boulder' } }, look: { horns: 'spike', spikes: true, eyes: '#ffcf6a', size: 1.2 } },
      { id: 'stormcaller', name: 'Stormcaller', hpMul: 0.55, desc: 'Quickens every DNB within 180 by 50%, and wraps those within 140 in storm bubbles worth 35% of their HP.', color: '#5a5a7a', dark: '#2a2a3c',
        tricks: { haste: { r: 180, mul: 1.5 }, aegis: { r: 140, pct: 0.35 } }, look: { horns: 'curl', aura: '#bfe8ff', eyes: '#ffffff' } },
      { id: 'lightning-drake', name: 'Lightning Drake', hpMul: 0.45, desc: 'Flies, rides the wind, and blinks 130 paces ahead every 5s.', color: '#4a5a8a', dark: '#222a44',
        tricks: { fly: true, windrider: true, blink: { every: 5, dist: 130 } }, look: { horns: 'spike', aura: '#e6f4ff', eyes: '#fff27a', size: 1.1 } },
      { id: 'tempest-twins', name: 'Tempest Twins', hpMul: 0.28, desc: 'A pair that flickers between flying and magical forms every 4s, each re-forming a storm bubble every 8s.', color: '#5a6a86', dark: '#2a3240',
        tricks: { twin: true, phase: { every: 4 }, bubble: { every: 8, pct: 0.05 } }, look: { horns: 'ears', aura: '#9fd0ff', eyes: '#e8f4ff' } },
      { id: 'eye-of-storm', name: 'The Eye of the Storm', hpMul: 0.14, desc: 'Charging behind a storm bubble, then airborne and calling Gnats, then magical, healing and hastening.', color: '#3a4a6a', dark: '#1a2234',
        tricks: { windrider: true, stages: [{ above: 0.66, bubble: { every: 8, pct: 0.05 }, sprint: { every: 6, dur: 1.4, mul: 2.5 } }, { above: 0.33, fly: true, summon: { type: 'swarm', every: 6, n: 4 } }, { above: 0, magic: true, heal: { every: 3, r: 150, pct: 0.1 }, haste: { r: 180, mul: 1.5 } }] },
        look: { horns: 'curl', spikes: true, aura: '#bfe8ff', eyes: '#ffffff', size: 1.25 } },
    ],
    castle: [
      { id: 'gargoyle', name: 'Gargoyle Sentinel', hpMul: 0.5, desc: 'Flies, and turns to stone for 2.5s every 5s, blocking 80% of damage.', color: '#5e5a62', dark: '#2c2a30',
        tricks: { fly: true, shell: { every: 5, dur: 2.5, cut: 0.8 } }, look: { horns: 'curl', spikes: true, eyes: '#ff6a5a' } },
      { id: 'iron-knight', name: 'Iron Knight', hpMul: 0.6, desc: 'Full plate armor: every hit loses a large flat chunk. Bring big hitters or armor piercing.', color: '#6a6e78', dark: '#34363c',
        tricks: { plate: 0.2 }, look: { horns: 'spike', eyes: '#ff8a5a', size: 1.1 } },
      { id: 'hound-pack', name: 'Shadow Hound Pack', hpMul: 0.26, desc: 'Lunges at 2.5x speed every 5s, melts into shadow for 1.5s every 6s, and splits into 3 hounds when slain.', color: '#3e3434', dark: '#1c1616',
        tricks: { sprint: { every: 5, dur: 1.2, mul: 2.5 }, cloak: { every: 6, dur: 1.5 }, split: { n: 3, frac: 0.28, name: 'Shadow Hound' } }, look: { horns: 'ears', eyes: '#ff3a3a' } },
      { id: 'banshee', name: 'Banshee', hpMul: 0.48, desc: 'Flickers between flying and magical forms every 3s, quickens DNBs within 150 by 40%, and fades out for 1.5s every 6s.', color: '#6a6a7e', dark: '#32323e',
        tricks: { phase: { every: 3 }, haste: { r: 150, mul: 1.4 }, cloak: { every: 6, dur: 1.5 } }, look: { horns: 'none', aura: '#d0d8ff', eyes: '#e8f0ff' } },
      { id: 'plague-abbot', name: 'Plague Abbot', hpMul: 0.4, desc: 'Magical. Heals DNBs within 150 for 10% every 3s, and calls 2 Menders at each third of his HP.', color: '#5a6a4a', dark: '#2a3222',
        tricks: { magic: true, heal: { every: 3, r: 150, pct: 0.1 }, brood: { type: 'healer', n: 2, at: [0.66, 0.33] } }, look: { horns: 'curl', aura: '#a8e06a', eyes: '#d8ff8a' } },
      { id: 'siege-engine', name: 'Dread Siege Engine', hpMul: 0.5, desc: 'Plated in iron, and unloads 2 Ironhides at each quarter of its HP.', color: '#5a4a3a', dark: '#2a221a',
        tricks: { plate: 0.14, brood: { type: 'armored', n: 2, at: [0.75, 0.5, 0.25] } }, look: { horns: 'tusk', spikes: true, eyes: '#ffb04a', size: 1.25 } },
      { id: 'phantom-duelist', name: 'Phantom Duelist', hpMul: 0.55, desc: 'Steps out of sight for 1.6s every 4.5s, and blinks 100 paces ahead every 6s.', color: '#5a4a6a', dark: '#2a2234',
        tricks: { cloak: { every: 4.5, dur: 1.6 }, blink: { every: 6, dist: 100 } }, look: { horns: 'spike', aura: '#b48bff', eyes: '#e0c8ff' } },
      { id: 'gate-wardens', name: 'Twin Gate Wardens', hpMul: 0.33, desc: 'One warden at each gate. Each hardens for 2.5s every 5s, and shields DNBs within 130 for 35% of their HP.', color: '#6a5a4a', dark: '#342a22',
        tricks: { twin: true, shell: { every: 5, dur: 2.5, cut: 0.6 }, aegis: { r: 130, pct: 0.35 } }, look: { horns: 'antler', spikes: true, eyes: '#ffd27a', size: 1.1 } },
      { id: 'lich-regent', name: 'The Lich Regent', hpMul: 0.1, desc: 'Magical. Heals DNBs within 150 for 8% every 3s, calls 3 Lurkers at each third of his HP, and splits into 2 liches when slain.', color: '#4a3e5a', dark: '#221c2c',
        tricks: { magic: true, heal: { every: 3, r: 150, pct: 0.08 }, brood: { type: 'stealth', n: 3, at: [0.66, 0.33] }, split: { n: 2, frac: 0.22, name: 'Lesser Lich' } }, look: { horns: 'spike', aura: '#a08bff', eyes: '#8affd8', size: 1.15 } },
      { id: 'shadow-queen', name: 'The Shadow Queen', hpMul: 0.13, desc: 'Plated and sprinting, then airborne and cloaking, then magical, regrowing and shielding. Splits into 2 shades when slain.', color: '#2e2234', dark: '#140e18',
        tricks: { split: { n: 2, frac: 0.2, name: 'Queen\'s Shade' }, stages: [{ above: 0.66, plate: 0.12, sprint: { every: 6, dur: 1.4, mul: 2.5 } }, { above: 0.33, fly: true, cloak: { every: 7, dur: 1.6 } }, { above: 0, magic: true, regen: { rate: 0.012, aura: 150 }, aegis: { r: 160, pct: 0.3 } }] },
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
    spacing: { tanky: 1.4, fast: 0.6, swarm: 1.4, armored: 1.3, shield: 1.2 },
    types: [
      { id: 'basic', from: 1, w: 10, theme: 0 },
      { id: 'fast', from: 3, w: 4, theme: 10 },
      { id: 'tanky', from: 5, w: 3, theme: 6 },
      { id: 'flying', from: 6, w: 3, theme: 8 },
      { id: 'magical', from: 8, w: 3, theme: 8 },
      { id: 'swarm', from: 999, w: 1.6, theme: 7 },
      { id: 'healer', from: 999, w: 1, theme: 5 },
      { id: 'splitter', from: 999, w: 1.4, theme: 7 },
      { id: 'stealth', from: 999, w: 1.2, theme: 7 },
      { id: 'burrower', from: 999, w: 1.3, theme: 7 },
      { id: 'shield', from: 999, w: 0.9, theme: 5 },
      { id: 'armored', from: 999, w: 1.3, theme: 7 },
    ],
    elite: { from: 60, base: 0.02, per: 0.0015, max: 0.07, combo: 80 },
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
    if (o.elite) Object.assign(g.elite, o.elite);
    if (o.intro) {
      for (const ty of g.types) if (o.intro[ty.id]) ty.from = o.intro[ty.id];
      const intro = Object.keys(o.intro).map(id => ({ id, at: [o.intro[id]], intro: true }));
      g.themes = [g.themes[0]].concat(intro, COMBOS, g.themes.slice(1));
    }
    return g;
  }
  const COMBOS = [
    { id: 'ironwall', name: 'Iron wall', mod: 13, rem: 3, min: 40, boost: { armored: 2, shield: 1.5 } },
    { id: 'ghosts', name: 'Ghost march', mod: 13, rem: 9, min: 45, boost: { stealth: 2.5, healer: 1.5 } },
    { id: 'hive', name: 'Hive tide', mod: 17, rem: 5, min: 50, boost: { swarm: 3, splitter: 3 } },
    { id: 'sappers', name: 'Sappers', mod: 17, rem: 12, min: 55, boost: { burrower: 3, armored: 2, healer: 1 } },
  ];

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
      waves: waveVariant({ elite: { per: 0.001, max: 0.05 }, intro: { swarm: 12, healer: 15, splitter: 18, armored: 22, burrower: 26, shield: 32, stealth: 36 } }),
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
      hpShift: 16, hpMul: 1, cashMul: 7583.7, startCash: 1.958e7, priceMul: 1900, hpCurve: [[1, 1.135], [50, 1.115], [65, 1.095], [80, 1.075], [95, 1.045], [100, 1.03]],
      bosses: MAP_BOSSES.woods.map(b => b.id),
      waves: waveVariant({ count: { base: 9 }, types: { fast: { from: 2, w: 7, theme: 10 }, tanky: { w: 2 } }, intro: { swarm: 6, healer: 11, stealth: 16, splitter: 21, burrower: 25, armored: 31, shield: 35 } }),
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
      hpShift: 14, hpMul: 1, cashMul: 5.75e7, startCash: 1.372e11, priceMul: 1.44e7, hpCurve: [[1, 1.135], [50, 1.115], [65, 1.1], [80, 1.08], [90, 1.05], [100, 1.04]],
      bosses: MAP_BOSSES.caverns.map(b => b.id),
      waves: waveVariant({ types: { magical: { from: 5, w: 6, theme: 10 }, flying: { w: 2 }, burrower: { w: 1.7 }, stealth: { w: 1.5 } }, intro: { burrower: 5, stealth: 11, healer: 15, shield: 21, splitter: 25, armored: 31, swarm: 35 } }),
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
      hpShift: 17, hpMul: 0.92, cashMul: 4.36e11, startCash: 1.075e15, priceMul: 1.09e11, hpCurve: [[1, 1.145], [40, 1.125], [60, 1.095], [75, 1.072], [90, 1.042], [100, 1.035]],
      bosses: MAP_BOSSES.cliffs.map(b => b.id),
      waves: waveVariant({ types: { flying: { from: 3, w: 6, theme: 10 } }, themes: [{ id: 'boss', mod: 10, rem: 0 }, { id: 'flying', at: [3], mod: 6, rem: 0 }, { id: 'magical', at: [8], mod: 11, rem: 6 }, { id: 'fast', mod: 7, rem: 0 }, { id: 'tanky', mod: 8, rem: 4 }], intro: { swarm: 4, splitter: 11, shield: 15, armored: 21, healer: 25, stealth: 31, burrower: 35 } }),
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
      hpShift: 15, hpMul: 0.92, cashMul: 3.31e15, startCash: 7.925e18, priceMul: 8.3e14, gateFrom: 4, hpCurve: [[1, 1.14], [50, 1.12], [70, 1.086], [84, 1.05], [100, 1.035]],
      bosses: MAP_BOSSES.castle.map(b => b.id),
      waves: waveVariant({ count: { base: 11, per: 0.55 }, types: { basic: { w: 8 }, fast: { from: 2, w: 5 }, tanky: { from: 3, w: 4 }, flying: { from: 4, w: 4 }, magical: { from: 5, w: 4 }, armored: { w: 1.6 }, shield: { w: 1.1 } }, elite: { from: 55 }, intro: { armored: 4, shield: 8, healer: 12, stealth: 16, splitter: 21, burrower: 24, swarm: 28 } }),
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
  const mapHp = {};
  function hpMap(n, map) {
    let c = mapHp[map.id];
    const key = map.hpCurve, b0 = hpBase(1 + (map.hpShift || 0)) * map.hpMul;
    if (!c || c.key !== key || c.b0 !== b0) { c = mapHp[map.id] = [b0]; c.key = key; c.b0 = b0; }
    n = Math.max(1, n | 0);
    while (c.length < n) c.push(c[c.length - 1] * growthAt(key, c.length + 1));
    return c[n - 1];
  }
  function hpFor(n, map) {
    if (!map) return hpBase(n) * TUNE.hpAll;
    if (map.hpCurve) return hpMap(n, map) * TUNE.hpAll;
    return hpBase(n + (map.hpShift || 0)) * map.hpMul * TUNE.hpAll;
  }
  function priceOf(map) { return (map && map.priceMul) || 1; }
  function rl(S, id) { return (S && S.research && S.research[id]) | 0; }
  function rsl(rs, id) { return (rs && rs[id]) | 0; }
  function starOf(S, id) { return (S && S.stars && S.stars[id || S.map]) | 0; }
  function starMods(star) { return STAR_MODS.filter(m => m.star <= star); }
  function researchLevels(S) { let n = 0; if (S && S.research) for (const k in S.research) n += S.research[k] | 0; return n; }
  function starHpMul(star, S) { star = Math.max(0, Math.min(MAX_STARS, star | 0)); return star ? (1 + STAR.hp[star]) * (1 + STAR.res * researchLevels(S)) : 1; }
  function starSpeedMul(star) { return 1 + STAR.speed * star; }
  function starCashMul(star) { return 1 + STAR.cash * star; }
  function cashResearchMul(S) { return rl(S, 'eco_master') ? 1.15 : 1; }
  function bon(S, k) { return (S && S.bonus && S.bonus[k]) || 0; }
  function killMul(S, star) { return starCashMul(star) * (1 + 0.06 * rl(S, 'eco_kill')) * cashResearchMul(S) * (1 + bon(S, 'cash')); }
  function clearMul(S, star) { return starCashMul(star) * (1 + 0.1 * rl(S, 'eco_first')) * cashResearchMul(S) * (1 + bon(S, 'clear')); }
  function moonMul(S) { return 1 + 0.1 * rl(S, 'util_moon') + (rl(S, 'util_master') ? 0.2 : 0); }
  function livesFor(S, star) {
    if (star == null) star = starOf(S);
    return (star >= 4 ? STAR.lives : LIVES) + rl(S, 'util_lives') + 2 * rl(S, 'util_master');
  }
  function killCash(n, map) { return TUNE.cash0 * Math.pow(TUNE.cashGrowth, n - 1) * (map ? map.cashMul : 1); }
  function clearBonus(n, map) { return Math.round(TUNE.clear0 * (1 + 0.1 * n) * Math.pow(TUNE.clearGrowth, n - 1) * (n % 10 === 0 ? 2.5 : 1) * (map ? map.cashMul : 1)); }
  function bossFor(n, map) {
    map = map || MAPS.moonlit;
    const every = map.waves.bossEvery;
    if (n % every !== 0) return null;
    const list = map.bosses;
    return BOSS_BY_ID[list[Math.min(list.length - 1, n / every - 1)]] || null;
  }

  function themeRule(n, gen) {
    gen = gen || WAVEGEN;
    for (const r of gen.themes) {
      if (r.min && n < r.min) continue;
      if ((r.at && r.at.indexOf(n) >= 0) || (r.mod && n % r.mod === r.rem)) return r;
    }
    return null;
  }
  function themeFor(n, gen) { const r = themeRule(n, gen); return r ? r.id : ''; }
  function themeName(rule) {
    if (!rule || rule.id === 'boss') return '';
    if (rule.name) return rule.name;
    const d = ENEMIES[rule.id];
    return d ? (rule.intro ? 'New: ' + d.short : d.short + ' swarm') : '';
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
    const rule = themeRule(n, gen);
    const theme = rule ? rule.id : '';
    const boost = (rule && rule.boost) || {};
    const pool = [];
    let total = 0;
    for (const ty of gen.types) {
      const w = n >= ty.from ? ty.w + (theme === ty.id ? ty.theme : 0) + (boost[ty.id] || 0) : 0;
      pool.push([ty.id, w]); total += w;
    }
    const gap = Math.max(gen.gap.min, gen.gap.base - n * gen.gap.per);
    const el = gen.elite || WAVEGEN.elite;
    const eliteCh = n >= el.from ? Math.min(el.max, el.base + (n - el.from) * el.per) : 0;
    const list = [];
    let t = 0;
    for (let i = 0; i < count; i++) {
      let r = rng() * total, type = pool[0][0];
      for (const [k, w] of pool) { r -= w; if (r <= 0) { type = k; break; } }
      if (type === 'swarm') for (let j = 0; j < 5; j++) list.push({ t: t + j * 0.14, type, g: i });
      else {
        const it = { t, type, g: i };
        if (eliteCh && type !== 'basic' && rng() < eliteCh) it.elite = true;
        list.push(it);
      }
      t += gap * (gen.spacing[type] || 1) * (1 - gen.gap.jitter / 2 + rng() * gen.gap.jitter);
    }
    const nR = map.route.length;
    const oneGate = nR > 1 && map.gateFrom && n < map.gateFrom;
    if (nR > 1) list.forEach(e => { e.route = oneGate ? 0 : e.g % nR; });
    if (boss) {
      const b = { t: t + gen.bossLead, type: 'boss' };
      if (nR > 1) b.route = oneGate ? 0 : (n / gen.bossEvery) % nR;
      list.push(b);
      if (boss.tricks && boss.tricks.twin) list.push({ t: b.t + (nR > 1 ? 0 : 1.6), type: 'boss', route: nR > 1 ? (b.route + 1) % nR : 0, twin: true });
    }
    const counts = {};
    for (const e of list) { counts[e.type] = (counts[e.type] || 0) + 1; if (e.elite) counts.elite = (counts.elite || 0) + 1; }
    const spec = { n, list, boss, counts, theme, themeName: themeName(rule), map: map.id, duration: list.length ? list[list.length - 1].t : 0 };
    specCache[key] = spec;
    return spec;
  }

  function towerCost(race, owned, pm) { return Math.round(RACES[race].cost * Math.pow(TUNE.towerGrowth, owned) * (pm || 1)); }
  function nodeCost(race, k, pm) { return Math.round(RACES[race].cost * TUNE.nodeBase * Math.pow(TUNE.nodeGrowth, k) * (pm || 1)); }
  function infCost(race, lv) { return Math.round(RACES[race].cost * TUNE.infBase * Math.pow(TUNE.infGrowth, lv)); }

  const DEFAULT_SETTINGS = { sound: true, vol: 0.6, shake: true, dmgNums: true, numFmt: 'short', speed: 1 };
  const NUM_FORMATS = ['short', 'sci', 'full'];
  const SPEEDS = [1, 2, 4];

  const BONUS_KEYS = ['dmg', 'rate', 'range', 'cash', 'clear', 'start', 'xp'];
  const BONUS_NAMES = { dmg: 'pony damage', rate: 'attack speed', range: 'range', cash: 'kill cash', clear: 'wave clear cash', start: 'starting cash', xp: 'hero XP' };
  function newBonus() { const b = {}; for (const k of BONUS_KEYS) b[k] = 0; return b; }
  function newStats() { return { played: 0, dmg: 0, bossKills: 0, earned: 0, killsBy: {}, eliteKills: 0, raceDmg: {}, heroDmg: {}, moonEarned: 0, playActive: 0, playOffline: 0, waves: 0, starUps: 0, upgrades: 0, sold: 0, mapKills: {} }; }
  function newDaily() { return { day: 0, best: 0, won: 0, runs: 0, wins: 0, streak: 0, lastWin: 0, bestStreak: 0 }; }
  const TOKENS = { lantern: 'Lantern', crown: 'Boss Crown', gild: 'Gilded Hooves', nightfall: 'Nightfall Banner' };
  function numMap(o, ok, int) {
    const out = {};
    if (o && typeof o === 'object') for (const k in o) if (ok(k)) { const v = int ? o[k] | 0 : +o[k] || 0; if (v > 0 && isFinite(v)) out[k] = v; }
    return out;
  }
  function cleanStats(st) {
    const s = newStats();
    if (!st || typeof st !== 'object') return s;
    for (const k of ['played', 'bossKills', 'eliteKills', 'waves', 'starUps', 'upgrades', 'sold']) s[k] = Math.max(0, st[k] | 0);
    for (const k of ['dmg', 'earned', 'moonEarned', 'playActive', 'playOffline']) s[k] = Math.max(0, +st[k] || 0);
    s.killsBy = numMap(st.killsBy, k => !!ENEMIES[k] || k === 'boss', true);
    s.raceDmg = numMap(st.raceDmg, k => !!RACES[k]);
    s.heroDmg = numMap(st.heroDmg, k => !!HEROES[k]);
    s.mapKills = numMap(st.mapKills, k => !!MAPS[k], true);
    return s;
  }
  function cleanFlags(o, allowed) { const out = {}; if (o && typeof o === 'object') for (const k in o) if (allowed[k] && o[k]) out[k] = 1; return out; }
  function cleanDaily(o) {
    const d = newDaily();
    if (!o || typeof o !== 'object') return d;
    for (const k in d) d[k] = Math.max(0, Math.floor(+o[k] || 0));
    d.won = d.won ? 1 : 0;
    d.bestStreak = Math.max(d.bestStreak, d.streak);
    return d;
  }
  function cleanChalDone(o) { const out = {}; if (o && typeof o === 'object') for (const k in o) if (CHAL_BY_ID[k] && o[k]) out[k] = { score: Math.max(0, (o[k].score | 0)) }; return out; }
  function cleanChalBest(o) { return numMap(o, k => !!CHAL_BY_ID[k], true); }

  function profileOf(S) { return S && S.chal ? S.chal.parent : S; }
  function feat(S, id) { const P = profileOf(S); if (P && P.feats && !P.feats[id]) P.feats[id] = 1; }
  function ft(P, id) { return P.feats && P.feats[id] ? 1 : 0; }
  function boardsOf(P) { const out = [{ towers: P.towers, hero: P.hero, id: P.map }]; for (const id in P.boards || {}) out.push({ towers: P.boards[id].towers || [], hero: P.boards[id].hero, id }); return out; }
  function scan(P, f) { for (const b of boardsOf(P)) if (f(b.towers || [])) return 1; return 0; }
  function bestCleared(P) { let m = 0; for (const id of MAP_IDS) m = Math.max(m, starOf(P, id) > 0 ? MAX_WAVE : mapCleared(P, id)); return m; }
  function mapsOpen(P) { let c = 0; for (const id of MAP_IDS) if (mapUnlocked(P, id)) c++; return c; }
  function heroTop(P) { let m = 0; for (const b of boardsOf(P)) if (b.hero && b.hero.prog) for (const k in b.hero.prog) m = Math.max(m, b.hero.prog[k].lv | 0); return m; }
  function starTotal(P) { let c = 0; for (const id of MAP_IDS) c += starOf(P, id); return c; }
  function starMaps(P) { let c = 0; for (const id of MAP_IDS) if (starOf(P, id) > 0) c++; return c; }
  function starTop(P) { let c = 0; for (const id of MAP_IDS) c = Math.max(c, starOf(P, id)); return c; }
  function chalCount(P) { return Object.keys(P.chalDone || {}).length; }
  function racePath(race) { return P => ft(P, 'r_' + race) || scan(P, l => l.some(t => t.race === race && t.paths.some(v => v >= 10))); }
  function heroOwned(id) { return P => (P.heroUnlocks && P.heroUnlocks[id]) ? 1 : 0; }
  const ACH_CATS = [
    { id: 'progress', name: 'Progress' }, { id: 'combat', name: 'Combat' }, { id: 'economy', name: 'Economy' }, { id: 'races', name: 'Races' },
    { id: 'heroes', name: 'Heroes' }, { id: 'stars', name: 'Stars' }, { id: 'challenges', name: 'Challenges' }, { id: 'secrets', name: 'Secrets' },
  ];
  const ACH = [
    { id: 'p_w1', cat: 'progress', name: 'First Light', desc: 'Clear wave 1 on any map.', goal: 1, v: bestCleared, b: { dmg: 0.0025 } },
    { id: 'p_w10', cat: 'progress', name: 'Holding the Line', desc: 'Clear wave 10 on any map.', goal: 10, v: bestCleared, b: { start: 0.01 } },
    { id: 'p_w25', cat: 'progress', name: 'Quarter Moon', desc: 'Clear wave 25 on any map.', goal: 25, v: bestCleared, b: { rate: 0.0025 } },
    { id: 'p_w50', cat: 'progress', name: 'Halfway Home', desc: 'Clear wave 50 on any map.', goal: 50, v: bestCleared, b: { xp: 0.05 } },
    { id: 'p_w75', cat: 'progress', name: 'Long Night', desc: 'Clear wave 75 on any map.', goal: 75, v: bestCleared, b: { range: 0.0025 } },
    { id: 'p_w100', cat: 'progress', name: 'Dawn Breaks', desc: 'Clear wave 100 on any map.', goal: 100, v: bestCleared, b: { dmg: 0.0025 } },
    { id: 'p_map2', cat: 'progress', name: 'New Ground', desc: 'Open a second map.', goal: 2, v: mapsOpen, b: { clear: 0.01 } },
    { id: 'p_map3', cat: 'progress', name: 'Wanderer', desc: 'Open three maps.', goal: 3, v: mapsOpen, b: { cash: 0.01 } },
    { id: 'p_map5', cat: 'progress', name: 'Every Road', desc: 'Open all five maps.', goal: 5, v: mapsOpen, b: { dmg: 0.005 } },
    { id: 'p_waves', cat: 'progress', name: 'Veteran', desc: 'Clear 250 waves in total, replays included.', goal: 250, v: P => P.stats.waves | 0, b: { xp: 0.05 } },
    { id: 'p_codex', cat: 'progress', name: 'Field Guide', desc: 'Meet all 13 kinds of DNB.', goal: 13, v: P => Object.keys(P.codex.e).length, b: { range: 0.0025 } },
    { id: 'p_bosses', cat: 'progress', name: 'Rogues Gallery', desc: 'Meet 10 different bosses.', goal: 10, v: P => Object.keys(P.codex.b).length, b: { dmg: 0.005 } },
    { id: 'c_k1', cat: 'combat', name: 'First Thousand', desc: 'Defeat 1,000 DNBs.', goal: 1000, v: P => P.totalKills, b: { dmg: 0.0025 } },
    { id: 'c_k2', cat: 'combat', name: 'Night Watch', desc: 'Defeat 25,000 DNBs.', goal: 25000, v: P => P.totalKills, b: { rate: 0.0025 } },
    { id: 'c_k3', cat: 'combat', name: 'Endless Vigil', desc: 'Defeat 250,000 DNBs.', goal: 250000, v: P => P.totalKills, b: { dmg: 0.005 } },
    { id: 'c_b1', cat: 'combat', name: 'Giant Slayer', desc: 'Defeat a boss.', goal: 1, v: P => P.stats.bossKills, b: { cash: 0.01 } },
    { id: 'c_b2', cat: 'combat', name: 'Boss Hunter', desc: 'Defeat 25 bosses.', goal: 25, v: P => P.stats.bossKills, b: { dmg: 0.0025 } },
    { id: 'c_b3', cat: 'combat', name: 'Legend of the Road', desc: 'Defeat 100 bosses.', goal: 100, v: P => P.stats.bossKills, b: { rate: 0.005 } },
    { id: 'c_el', cat: 'combat', name: 'Elite Breaker', desc: 'Defeat 100 elite DNBs.', goal: 100, v: P => P.stats.eliteKills | 0, b: { cash: 0.005 } },
    { id: 'c_flaw', cat: 'combat', name: 'Flawless', desc: 'Clear a boss wave without losing a life.', goal: 1, v: P => ft(P, 'c_flaw'), b: { range: 0.0025 } },
    { id: 'c_clutch', cat: 'combat', name: 'By a Hair', desc: 'Clear a wave with exactly one life left.', goal: 1, v: P => ft(P, 'c_clutch'), b: { xp: 0.05 } },
    { id: 'e_1', cat: 'economy', name: 'Pocket Change', desc: 'Earn 10K cash in total.', goal: 1e4, log: true, v: P => P.stats.earned, b: { start: 0.01 } },
    { id: 'e_2', cat: 'economy', name: 'Saddlebags', desc: 'Earn 1B cash in total.', goal: 1e9, log: true, v: P => P.stats.earned, b: { cash: 0.01 } },
    { id: 'e_3', cat: 'economy', name: 'Treasury', desc: 'Earn 1Qa cash in total.', goal: 1e15, log: true, v: P => P.stats.earned, b: { clear: 0.01 } },
    { id: 'e_4', cat: 'economy', name: 'Dragon Hoard', desc: 'Earn 1Sx cash in total.', goal: 1e21, log: true, v: P => P.stats.earned, b: { cash: 0.01 } },
    { id: 'e_5', cat: 'economy', name: 'Golden Moon', desc: 'Earn 1Oc cash in total.', goal: 1e27, log: true, v: P => P.stats.earned, b: { dmg: 0.005 } },
    { id: 'e_up', cat: 'economy', name: 'Tinkerer', desc: 'Buy 500 upgrades.', goal: 500, v: P => P.stats.upgrades | 0, b: { rate: 0.0025 } },
    { id: 'e_off', cat: 'economy', name: 'Paid in Dreams', desc: 'Collect offline earnings.', goal: 1, v: P => ft(P, 'e_off'), b: { start: 0.01 } },
    { id: 'e_moon', cat: 'economy', name: 'Moon Collector', desc: 'Earn 100 Moonstones in total.', goal: 100, v: P => P.moonTotal | 0, b: { clear: 0.01 } },
    { id: 'r_earth', cat: 'races', name: 'Bedrock', desc: 'Max an earth pony path.', goal: 1, v: racePath('earth'), b: { dmg: 0.0025 } },
    { id: 'r_unicorn', cat: 'races', name: 'Archmage', desc: 'Max a unicorn path.', goal: 1, v: racePath('unicorn'), b: { dmg: 0.0025 } },
    { id: 'r_pegasus', cat: 'races', name: 'Stormcaller', desc: 'Max a pegasus path.', goal: 1, v: racePath('pegasus'), b: { rate: 0.0025 } },
    { id: 'r_bat', cat: 'races', name: 'Night Hunter', desc: 'Max a bat pony path.', goal: 1, v: racePath('bat'), b: { range: 0.0025 } },
    { id: 'r_crystal', cat: 'races', name: 'Prism Heart', desc: 'Max a crystal pony path.', goal: 1, v: racePath('crystal'), b: { dmg: 0.0025 } },
    { id: 'r_herd', cat: 'races', name: 'Full Herd', desc: 'Have all five races on one board.', goal: 1, v: P => scan(P, l => RACE_IDS.every(r => l.some(t => t.race === r))), b: { range: 0.0025 } },
    { id: 'r_army', cat: 'races', name: 'Cavalry', desc: 'Have 25 ponies on one board.', goal: 1, v: P => ft(P, 'r_army') || scan(P, l => l.length >= 25), b: { rate: 0.0025 } },
    { id: 'r_dual', cat: 'races', name: 'Twin Mastery', desc: 'Max two paths on one pony.', goal: 1, v: P => ft(P, 'r_dual') || scan(P, l => l.some(t => t.paths.filter(v => v >= 10).length >= 2)), b: { dmg: 0.005 } },
    { id: 'h_field', cat: 'heroes', name: 'Champion', desc: 'Start a wave with a hero on the field.', goal: 1, v: P => ft(P, 'h_field') || (boardsOf(P).some(b => b.hero && b.hero.id) ? 1 : 0), b: { xp: 0.05 } },
    { id: 'h_10', cat: 'heroes', name: 'Seasoned', desc: 'Raise a hero to level 10.', goal: 10, v: heroTop, b: { xp: 0.05 } },
    { id: 'h_30', cat: 'heroes', name: 'Living Legend', desc: 'Raise a hero to level 30.', goal: 30, v: heroTop, b: { rate: 0.0025 } },
    { id: 'h_iron', cat: 'heroes', name: 'Iron Will', desc: 'Unlock Ironmane.', goal: 1, v: heroOwned('ironmane'), b: { xp: 0.05 } },
    { id: 'h_sky', cat: 'heroes', name: 'Sky Friend', desc: 'Unlock Skyflick.', goal: 1, v: heroOwned('skyflick'), b: { range: 0.0025 } },
    { id: 'h_dusk', cat: 'heroes', name: 'Dusk Pact', desc: 'Unlock Duskfang.', goal: 1, v: heroOwned('duskfang'), b: { dmg: 0.0025 } },
    { id: 'h_all', cat: 'heroes', name: 'Hall of Heroes', desc: 'Unlock every hero.', goal: 4, v: P => HERO_IDS.filter(id => heroUnlocked(P, id)).length, b: { rate: 0.005 } },
    { id: 's_1', cat: 'stars', name: 'Rising Star', desc: 'Earn a star on any map.', goal: 1, v: starTotal, b: { dmg: 0.005 } },
    { id: 's_5', cat: 'stars', name: 'Constellation', desc: 'Earn 5 stars in total.', goal: 5, v: starTotal, b: { cash: 0.01 } },
    { id: 's_max', cat: 'stars', name: 'Supernova', desc: 'Reach 5 stars on one map.', goal: 5, v: starTop, b: { dmg: 0.01 } },
    { id: 's_all', cat: 'stars', name: 'Starry Sky', desc: 'Earn a star on every map.', goal: 5, v: starMaps, b: { rate: 0.005 } },
    { id: 's_res', cat: 'stars', name: 'Scholar', desc: 'Buy 10 research levels.', goal: 10, v: researchLevels, b: { range: 0.0025 } },
    { id: 's_cap', cat: 'stars', name: 'Capstone', desc: 'Buy a capstone research.', goal: 1, v: P => (rl(P, 'eco_master') || rl(P, 'abil_master') || rl(P, 'util_master')) ? 1 : 0, b: { dmg: 0.005 } },
    { id: 'ch_d1', cat: 'challenges', name: 'Daily Rider', desc: 'Win a daily challenge.', goal: 1, v: P => P.daily.wins | 0, b: { start: 0.01 } },
    { id: 'ch_d3', cat: 'challenges', name: 'Good Habit', desc: 'Win dailies 3 days in a row.', goal: 3, v: P => P.daily.bestStreak | 0, b: { cash: 0.01 } },
    { id: 'ch_d7', cat: 'challenges', name: 'Devotion', desc: 'Win dailies 7 days in a row.', goal: 7, v: P => P.daily.bestStreak | 0, b: { dmg: 0.005 } },
    { id: 'ch_p1', cat: 'challenges', name: 'Challenger', desc: 'Complete a permanent challenge.', goal: 1, v: chalCount, b: { dmg: 0.0025 } },
    { id: 'ch_p6', cat: 'challenges', name: 'Trial Master', desc: 'Complete 6 permanent challenges.', goal: 6, v: chalCount, b: { rate: 0.005 } },
    { id: 'ch_p12', cat: 'challenges', name: 'Unbroken', desc: 'Complete every permanent challenge.', goal: 12, v: chalCount, b: { dmg: 0.01 } },
    { id: 'x_lone', cat: 'secrets', name: 'Hero Alone', desc: 'Clear a wave with only your hero on the field.', goal: 1, hidden: true, v: P => ft(P, 'x_lone'), b: { xp: 0.1 } },
    { id: 'x_fast', cat: 'secrets', name: 'Blur', desc: 'Clear a boss wave at 4x speed.', goal: 1, hidden: true, v: P => ft(P, 'x_fast'), b: { rate: 0.0025 } },
    { id: 'x_gate', cat: 'secrets', name: 'Photo Finish', desc: 'Defeat a boss right at the gate.', goal: 1, hidden: true, v: P => ft(P, 'x_gate'), b: { range: 0.0025 } },
    { id: 'x_sell', cat: 'secrets', name: 'Cold Feet', desc: 'Sell a pony while a boss is on the road.', goal: 1, hidden: true, v: P => ft(P, 'x_sell'), b: { cash: 0.005 } },
    { id: 'x_owl', cat: 'secrets', name: 'Night Owl', desc: 'Play between midnight and 4 am.', goal: 1, hidden: true, v: P => ft(P, 'x_owl'), b: { start: 0.01 } },
  ];
  const ACH_BY_ID = {};
  for (const a of ACH) ACH_BY_ID[a.id] = a;
  function pctText(v) { return String(Math.round((+v || 0) * 10000) / 100) + '%'; }
  function bonusText(b) { return Object.keys(b).map(k => '+' + pctText(b[k]) + ' ' + BONUS_NAMES[k]).join(', '); }
  function achVal(P, a) { const v = +a.v(P) || 0; return isFinite(v) ? v : 0; }
  function recalcBonus(S) {
    const P = profileOf(S);
    if (!P) return null;
    if (!P.bonus) P.bonus = newBonus();
    const b = P.bonus;
    for (const k of BONUS_KEYS) b[k] = 0;
    for (const a of ACH) if (P.ach && P.ach[a.id]) for (const k in a.b) b[k] += a.b[k];
    for (const k of BONUS_KEYS) b[k] = Math.round(b[k] * 10000) / 10000;
    for (const X of S === P ? [S] : [S, P]) {
      for (const t of X.towers || []) { t.bo = b; t._s = null; }
      if (X.hero) { X.hero.bo = b; X.hero._s = null; }
      X.buffsDirty = true;
    }
    return b;
  }
  function checkAch(S, quiet) {
    const P = profileOf(S);
    if (!P || !P.ach || !P.stats) return [];
    const got = [];
    for (const a of ACH) {
      if (P.ach[a.id] || achVal(P, a) < a.goal) continue;
      P.ach[a.id] = 1;
      got.push(a);
    }
    if (!got.length) return got;
    recalcBonus(S);
    if (quiet) emit(S, 'achRetro', { n: got.length, ids: got.map(a => a.id) });
    else for (const a of got) emit(S, 'ach', { id: a.id, name: a.name, desc: a.desc, cat: a.cat, bonus: bonusText(a.b) });
    return got;
  }
  function achList(S) {
    const P = profileOf(S);
    return ACH.map(a => {
      const done = !!(P.ach && P.ach[a.id]), val = done ? a.goal : Math.min(a.goal, achVal(P, a));
      const pct = done ? 1 : a.log ? Math.max(0, Math.min(1, Math.log10(Math.max(1, val)) / Math.log10(a.goal))) : Math.max(0, Math.min(1, val / a.goal));
      return { id: a.id, cat: a.cat, name: a.name, desc: a.desc, goal: a.goal, val, pct, done, hidden: !!a.hidden && !done, bonus: bonusText(a.b), log: !!a.log };
    });
  }

  const CHAL_MODS = {
    unicorns: { name: 'Unicorns only', desc: 'Only unicorns can be placed. They are priced like a mixed herd.', races: ['unicorn'], w: 1.5 },
    grounded: { name: 'Grounded', desc: 'No pegasi or bat ponies. The rest are priced like a mixed herd.', ban: ['pegasus', 'bat'], w: 0.5 },
    nosell: { name: 'No selling', desc: 'Ponies cannot be sold.', w: 0.5 },
    flyers: { name: 'Flyers only', desc: 'Every DNB flies.', w: 1 },
    double: { name: 'Double speed', desc: 'DNBs move twice as fast.', w: 1.5 },
    short: { name: 'Short sight', desc: 'Ponies and the hero have 25% less range.', w: 1.5 },
    nohero: { name: 'No hero', desc: 'Heroes stay home.', w: 0.5 },
    bosses5: { name: 'Boss tide', desc: 'A boss every 5 waves.', w: 1.5 },
    stealth: { name: 'Shadow march', desc: 'Half of all DNBs are cloaked.', w: 1.5 },
    armored: { name: 'Armored horde', desc: 'Every DNB wears plate.', w: 1.5 },
    onelife: { name: 'One life', desc: 'A single leak ends the run.', w: 2, perm: true },
    limit: { name: 'Small herd', desc: 'Only a few ponies allowed.', w: 2 },
    rich: { name: 'Golden start', desc: 'Triple starting cash, but kills pay nothing.', w: 1 },
    tough: { name: 'Thick hides', desc: 'DNBs have 40% more health.', w: 1 },
    glass: { name: 'Glass cannon', desc: 'Ponies deal 50% more damage, but only 10 lives.', w: 1 },
  };
  const CHAL_IDS = Object.keys(CHAL_MODS);
  const DAILY_MODS = CHAL_IDS.filter(id => !CHAL_MODS[id].perm);
  const CHAL_CLASH = [['unicorns', 'flyers'], ['grounded', 'flyers'], ['unicorns', 'grounded'], ['onelife', 'glass'], ['onelife', 'double'], ['onelife', 'bosses5'], ['onelife', 'short'], ['armored', 'tough'], ['armored', 'short']];
  const CHAL_LIVES = 20;
  const CHAL_ECO = { start: 3, kill: 2, clear: 2, hp: 0.4, boss: 0.55, soft: 0.15 };
  const DAILY_WEIGHT = 3.5;
  const DAILY_BANDS = { moonlit: [1, 11, 21], woods: [1, 11, 21], caverns: [1, 11, 21], cliffs: [1], castle: [1, 11] };
  function chalClash(a, b) { return CHAL_CLASH.some(c => (c[0] === a && c[1] === b) || (c[0] === b && c[1] === a)); }
  function chalLives(mods, lives) { return mods.indexOf('onelife') >= 0 ? 1 : mods.indexOf('glass') >= 0 ? 10 : lives || CHAL_LIVES; }
  function chalWeight(mods) { let w = 0; for (const m of mods) w += CHAL_MODS[m] ? CHAL_MODS[m].w : 0; return w; }
  function chalHpMul(def) { return CHAL_ECO.hp / (1 + CHAL_ECO.soft * chalWeight(def.mods)); }
  const CHALLENGES = [
    { id: 'horn', name: 'Horn and Hoof', map: 'moonlit', from: 1, to: 20, mods: ['unicorns'], diff: 1, reward: { moon: 15 }, blurb: 'A herd of unicorns holds the moonlit road alone.' },
    { id: 'nosell', name: 'Nothing to Sell', map: 'moonlit', from: 1, to: 25, mods: ['nosell', 'limit'], cap: 8, diff: 2, reward: { rp: 10 }, blurb: 'Eight ponies, placed for keeps.' },
    { id: 'feather', name: 'Featherfall', map: 'cliffs', from: 1, to: 20, mods: ['flyers'], diff: 2, reward: { hero: 'skyflick' }, blurb: 'Every DNB on the cliffs takes to the wind.' },
    { id: 'lightless', name: 'Lightless', map: 'caverns', from: 1, to: 20, mods: ['stealth'], diff: 3, reward: { token: 'lantern' }, blurb: 'Nothing in the caverns can be seen without help.' },
    { id: 'iron', name: 'Iron Tide', map: 'castle', from: 1, to: 20, mods: ['armored'], diff: 3, reward: { rp: 15 }, blurb: 'Plated DNBs march on the castle.' },
    { id: 'glass', name: 'Glass Gate', map: 'moonlit', from: 11, to: 30, mods: ['onelife'], diff: 4, reward: { moon: 40 }, blurb: 'One leak and the gate shatters.' },
    { id: 'rest', name: 'Hero\'s Rest', map: 'woods', from: 1, to: 25, mods: ['nohero', 'short'], diff: 3, reward: { hero: 'ironmane' }, blurb: 'No hero, and the trees crowd every pony\'s view.' },
    { id: 'rush', name: 'Boss Rush', map: 'moonlit', from: 1, to: 25, mods: ['bosses5'], diff: 3, reward: { token: 'crown' }, blurb: 'A boss walks the road every five waves.' },
    { id: 'stampede', name: 'Stampede', map: 'woods', from: 1, to: 20, mods: ['double'], diff: 3, reward: { moon: 30 }, blurb: 'Everything runs twice as fast.' },
    { id: 'golden', name: 'Golden Hooves', map: 'cliffs', from: 1, to: 25, mods: ['rich'], diff: 2, reward: { token: 'gild' }, blurb: 'A fortune up front, and not a coin after.' },
    { id: 'few', name: 'Few and Proud', map: 'castle', from: 1, to: 25, mods: ['limit', 'tough'], cap: 5, diff: 4, reward: { hero: 'duskfang' }, blurb: 'Five ponies against thick-hided DNBs.' },
    { id: 'nightfall', name: 'Nightfall', map: 'castle', from: 21, to: 40, mods: ['stealth', 'armored', 'bosses5'], diff: 5, reward: { moon: 60, token: 'nightfall' }, blurb: 'Cloaked, plated and led by bosses. The last trial.' },
  ];
  const CHAL_BY_ID = {};
  for (const c of CHALLENGES) { c.kind = 'perm'; c.w = chalWeight(c.mods); c.lives = chalLives(c.mods, c.lives); CHAL_BY_ID[c.id] = c; }
  function dayIndex(now) { return Math.floor((+now || 0) / 864e5); }
  function dayLabel(day) { return new Date(day * 864e5).toISOString().slice(0, 10); }
  function dailyDef(day) {
    day = day | 0;
    const rng = mulberry(hashSeed(day, 0x6d6f6f6e, 8));
    const map = MAP_IDS[Math.floor(rng() * MAP_IDS.length)];
    const bands = DAILY_BANDS[map];
    const from = bands[Math.floor(rng() * bands.length)];
    const k = rng() < 0.4 ? 3 : 2;
    const mods = [];
    for (let g = 0; mods.length < k && g < 60; g++) {
      const m = DAILY_MODS[Math.floor(rng() * DAILY_MODS.length)];
      if (mods.indexOf(m) >= 0 || mods.some(o => chalClash(o, m))) continue;
      if (mods.length >= 2 && chalWeight(mods.concat(m)) > DAILY_WEIGHT) continue;
      mods.push(m);
    }
    const cap = mods.indexOf('limit') >= 0 ? 8 + Math.floor(rng() * 3) : 0;
    const w = chalWeight(mods);
    const diff = Math.max(1, Math.min(5, Math.round(w + (from - 1) / 15 + (MAPS[map].order - 1) * 0.25)));
    return { id: 'daily', kind: 'daily', day, name: 'Daily ' + dayLabel(day), map, from, to: from + 19, mods, cap, diff, w, lives: chalLives(mods), reward: { moon: 15 } };
  }
  function dailyMoon(streak) { return 15 + Math.min(10, Math.max(0, streak - 1)); }
  function rollDaily(P, day) {
    const d = P.daily || (P.daily = newDaily());
    if (day > d.day) { d.day = day; d.best = 0; d.won = 0; d.runs = 0; }
    return d;
  }
  function dailyStreak(P, day) { const d = P.daily; if (!d) return 0; return d.lastWin >= day - 1 ? d.streak : 0; }
  function modText(id, def) { const m = CHAL_MODS[id]; if (!m) return ''; return id === 'limit' && def && def.cap ? m.name + ' (' + def.cap + ')' : m.name; }
  function modDesc(id, def) { const m = CHAL_MODS[id]; if (!m) return ''; return id === 'limit' && def && def.cap ? 'At most ' + def.cap + ' ponies.' : m.desc; }
  function rewardText(r) {
    const out = [];
    if (!r) return '';
    if (r.moon) out.push(r.moon + ' Moonstones');
    if (r.rp) out.push(r.rp + ' research points');
    if (r.hero && HEROES[r.hero]) out.push('Hero: ' + HEROES[r.hero].name);
    if (r.token && TOKENS[r.token]) out.push('Token: ' + TOKENS[r.token]);
    return out.join(', ');
  }
  function chalRaces(S) {
    const ch = S && S.chal;
    if (!ch) return RACE_IDS.slice();
    let list = RACE_IDS.slice();
    for (const m of ch.def.mods) { const d = CHAL_MODS[m]; if (d.races) list = list.filter(r => d.races.indexOf(r) >= 0); if (d.ban) list = list.filter(r => d.ban.indexOf(r) < 0); }
    return list;
  }
  function chalHas(S, id) { return !!(S && S.chal && S.chal.mods[id]); }
  function chalBlock(S, race) {
    const ch = S && S.chal;
    if (!ch) return '';
    if (ch.over) return 'over';
    if (chalRaces(S).indexOf(race) < 0) return 'race';
    if (ch.def.cap && S.towers.length >= ch.def.cap) return 'cap';
    return '';
  }
  function chalEnemy(cm, e) {
    if (cm.flyers) e.flying = true;
    if (cm.stealth && e.id % 2 === 0) e.stealth = true;
    if (cm.armored) e.plate = Math.max(e.plate, 0.04 * e.plateBase);
  }
  function chalRun(S, run, ch) {
    const m = ch.mods;
    run.cashMul *= CHAL_ECO.kill; run.clearMul *= CHAL_ECO.clear; run.hpMul *= chalHpMul(ch.def); run.bossHp = CHAL_ECO.boss;
    if (m.tough) run.hpMul *= 1.4;
    if (m.double) run.spdMul *= 2;
    if (m.rich) { run.cashMul = 0; run.bossCash = 0; }
    run.cm = (m.flyers || m.stealth || m.armored) ? { flyers: !!m.flyers, stealth: !!m.stealth, armored: !!m.armored } : null;
    const n = run.n, map = run.map;
    if (m.bosses5 && n % 5 === 0 && !run.spec.boss) {
      const list = map.bosses;
      run.xboss = BOSS_BY_ID[list[Math.min(list.length - 1, Math.floor(n / 10))]] || BOSSES[0];
      const last = run.queue.length ? run.queue[run.queue.length - 1].t : 0;
      const it = { t: last + map.waves.bossLead, type: 'boss', xb: true };
      if (map.route.length > 1) it.route = (n / 5) % map.route.length;
      run.queue.push(it);
      run.enrageAt += map.waves.bossLead + 10;
    }
  }
  const CHAL_SHARED = ['stats', 'settings', 'codex', 'research', 'heroUnlocks', 'ach', 'feats', 'bonus', 'daily', 'chalDone', 'chalBest', 'tokens'];
  function chalStartCash(X, def, map) {
    let c = Math.round((mapStartCash(map, X) + skipCash(X, map, def.from - 1, 0) * 0.85) * CHAL_ECO.start);
    if (def.mods.indexOf('rich') >= 0) c *= 3;
    return c;
  }
  function startChallenge(P, def, now) {
    if (!P || P.chal || P.run) return null;
    if (typeof def === 'string') def = def === 'daily' ? dailyDef(dayIndex(now || Date.now())) : CHAL_BY_ID[def];
    if (!def || !MAPS[def.map]) return null;
    const map = getMap(def.map);
    const X = newState(map.id);
    for (const k of CHAL_SHARED) X[k] = P[k];
    X.fxOn = P.fxOn;
    X.seed = hashSeed(P.seed, def.kind === 'daily' ? def.day : def.from * 131 + def.to, 99);
    const mods = {};
    for (const m of def.mods) mods[m] = true;
    X.cm = (mods.short || mods.glass) ? { range: mods.short ? 0.75 : 1, dmg: mods.glass ? 1.5 : 1 } : null;
    X.stars = {}; X.moon = 0; X.moonTotal = 0; X.presets = {}; X.slots = {}; X.boards = {}; X.lastSeen = 0;
    Object.assign(X, newBoard(map, X));
    X.cash = chalStartCash(X, def, map);
    X.cleared = def.from - 1; X.sel = def.from;
    const lives = def.lives || chalLives(def.mods);
    X.chal = { id: def.id, kind: def.kind, def, mods, parent: P, from: def.from, to: def.to, lives, livesMax: lives, t: 0, waves: 0, over: null, day: def.day || 0, result: null };
    if (!mods.nohero && P.hero && P.hero.id) {
      const p = heroHome(map);
      X.hero = { id: P.hero.id, x: p.x, y: p.y, auto: !!P.hero.auto, prog: JSON.parse(JSON.stringify(P.hero.prog || {})) };
    }
    prepTowers(X);
    if (def.kind === 'daily') rollDaily(P, def.day).runs++;
    emit(X, 'chalStart', { id: def.id, name: def.name });
    return X;
  }
  function chalScore(waves, lives, t, won) { return waves * 1000 + (won ? lives * 100 + 5000 + Math.max(0, Math.round(4000 - 2 * t)) : 0); }
  function grantReward(P, X, r) {
    const got = [];
    if (!r) return got;
    if (r.moon) { grantMoon(P, r.moon); got.push(r.moon + ' Moonstones'); }
    if (r.rp) { P.rp = (P.rp || 0) + r.rp; got.push(r.rp + ' research points'); }
    if (r.hero && HEROES[r.hero]) {
      if (heroUnlocked(P, r.hero)) { const m = HEROES[r.hero].unlock.moon || 0; grantMoon(P, m); got.push(m + ' Moonstones (' + HEROES[r.hero].name + ' already joined)'); }
      else { P.heroUnlocks[r.hero] = 1; got.push('Hero: ' + HEROES[r.hero].name); emit(X, 'heroUnlock', { id: r.hero, name: HEROES[r.hero].name, how: 'challenge' }); }
    }
    if (r.token && TOKENS[r.token]) { P.tokens[r.token] = 1; got.push('Token: ' + TOKENS[r.token]); }
    return got;
  }
  function chalFinish(X, result) {
    const c = X && X.chal;
    if (!c || c.over) return null;
    c.over = result;
    X.run = null;
    const P = c.parent, def = c.def, won = result === 'won';
    const score = chalScore(c.waves, c.lives, c.t, won);
    const out = { id: def.id, kind: def.kind, name: def.name, result, waves: c.waves, total: def.to - def.from + 1, lives: won ? c.lives : 0, t: Math.round(c.t), score, reward: [], best: false, first: false, streak: 0 };
    if (def.kind === 'daily') {
      const d = rollDaily(P, def.day);
      if (def.day === d.day) {
        if (score > d.best) { d.best = score; out.best = true; }
        if (won && !d.won) {
          d.won = 1; d.wins++;
          d.streak = d.lastWin === def.day - 1 ? d.streak + 1 : 1;
          d.lastWin = def.day;
          d.bestStreak = Math.max(d.bestStreak, d.streak);
          out.first = true;
          out.reward = grantReward(P, X, { moon: dailyMoon(d.streak) });
        }
        out.streak = dailyStreak(P, def.day);
      }
    } else {
      if (score > (P.chalBest[def.id] | 0)) { P.chalBest[def.id] = score; out.best = true; }
      if (won && !P.chalDone[def.id]) { P.chalDone[def.id] = { score }; out.first = true; out.reward = grantReward(P, X, def.reward); }
    }
    c.result = out;
    emit(X, 'chalEnd', out);
    checkAch(X);
    return out;
  }
  function quitChallenge(X) {
    const c = X && X.chal;
    if (!c || c.over) return null;
    if (X.run) { c.t += X.run.t; X.run = null; }
    return chalFinish(X, 'quit');
  }
  function chalInfo(P, now) {
    const day = dayIndex(now || Date.now());
    const dd = dailyDef(day);
    const d = P.daily || newDaily();
    const today = d.day === day;
    return {
      daily: { def: dd, day, label: dayLabel(day), best: today ? d.best : 0, won: today && !!d.won, runs: today ? d.runs : 0, streak: dailyStreak(P, day), bestStreak: d.bestStreak, wins: d.wins, moon: dailyMoon(dailyStreak(P, day) + 1) },
      perm: CHALLENGES.map(c => ({ def: c, done: !!P.chalDone[c.id], best: P.chalBest[c.id] | 0, reward: rewardText(c.reward) })),
    };
  }
  function tickPlay(S, dt) { const P = profileOf(S); if (P && P.stats && dt > 0 && dt < 5) P.stats.playActive += dt; }
  function statsSummary(S) {
    const P = profileOf(S), st = P.stats;
    let favP = null, favH = null;
    for (const k in st.raceDmg) if (!favP || st.raceDmg[k] > favP.dmg) favP = { id: k, name: RACES[k].name, dmg: st.raceDmg[k] };
    for (const k in st.heroDmg) if (!favH || st.heroDmg[k] > favH.dmg) favH = { id: k, name: HEROES[k].name, dmg: st.heroDmg[k] };
    const maps = MAP_IDS.map(id => {
      const b = boardOf(P, id), r = b && b.records;
      let bosses = 0;
      if (r) for (const k in r.bosses) bosses += r.bosses[k] | 0;
      return { id, name: MAPS[id].name, open: mapUnlocked(P, id), cleared: b ? b.cleared : 0, stars: starOf(P, id), wins: r ? r.wins : 0, att: r ? r.att : 0, time: r ? r.time : 0, kills: st.mapKills[id] | 0, bosses };
    });
    return {
      kills: P.totalKills, killsBy: Object.assign({}, st.killsBy), bossKills: st.bossKills, eliteKills: st.eliteKills, earned: st.earned, moonEarned: Math.max(st.moonEarned, P.moonTotal | 0),
      playActive: st.playActive, playOffline: st.playOffline, waves: st.waves, starUps: st.starUps, upgrades: st.upgrades, sold: st.sold, played: st.played, dmg: st.dmg,
      favPony: favP, favHero: favH, maps, ach: Object.keys(P.ach).length, achTotal: ACH.length, chal: chalCount(P), dailyWins: P.daily.wins, bestStreak: P.daily.bestStreak,
    };
  }

  function newRecords() { return { time: 0, att: 0, wins: 0, bosses: {}, firsts: {} }; }
  function mapStartCash(map, S) { return Math.round((map.startCash || TUNE.startCash) * (1 + 0.5 * rl(S, 'eco_start')) * (1 + bon(S, 'start'))); }
  function newFarm() { return { on: false, pick: 0, fails: 0, safe: 0, val: 0, secs: 0, runs: 0, inG: 0, inT: 0 }; }
  function newBoard(map, S) { return { cash: mapStartCash(map, S), cleared: 0, sel: 1, auto: false, towers: [], records: newRecords(), hero: null, farm: newFarm(), build: null }; }
  const BOARD_KEYS = ['cash', 'cleared', 'sel', 'auto', 'towers', 'records', 'hero', 'farm', 'build'];

  function newState(mapId) {
    const map = getMap(mapId);
    const S = {
      ver: SAVE_VER, map: map.id, seed: 0x2545F491,
      cash: 0, cleared: 0, sel: 1, auto: false, towers: [], records: null, boards: {}, nextId: 1,
      run: null, time: 0, fxOn: true, fx: [], events: [], buffsDirty: true, totalKills: 0,
      stats: newStats(),
      settings: Object.assign({}, DEFAULT_SETTINGS),
      sfx: { hit: 0, crit: 0, kill: 0, leak: 0 },
      codex: { e: {}, b: {} },
      stars: {}, moon: 0, moonTotal: 0, research: {}, presets: {}, heroUnlocks: { nova: 1 },
      slots: {}, rules: newRules(), lastSeen: 0,
      ach: {}, feats: {}, bonus: newBonus(), daily: newDaily(), chalDone: {}, chalBest: {}, rp: 0, tokens: {}, chal: null, cm: null,
    };
    Object.assign(S, newBoard(map, S));
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
    return mapCleared(S, prev) >= UNLOCK_AT || starOf(S, prev) > 0;
  }
  function prepTowers(S) {
    const map = mapOf(S);
    for (const t of S.towers) { t.face = faceRoad(map, t.x, t.y); t.light = lightAt(map, t.x, t.y); t.wallPt = null; t.pm = map.priceMul || 1; t._s = null; }
    if (S.hero) ensureHero(S, S.hero);
    S.buffsDirty = true;
  }
  function switchMap(S, id) {
    if (S.run || !MAPS[id] || !mapUnlocked(S, id)) return false;
    if (id === S.map) return true;
    S.boards[S.map] = boardOf(S, S.map);
    const b = S.boards[id] || newBoard(MAPS[id], S);
    delete S.boards[id];
    S.map = id;
    for (const k of BOARD_KEYS) S[k] = b[k];
    S.fx.length = 0;
    prepTowers(S);
    emit(S, 'map', { id });
    return true;
  }

  function owned(S, race) { let c = 0; for (const t of S.towers) if (t.race === race) c++; return c; }
  function nextTowerCost(S, race) {
    let k = owned(S, race);
    if (S.chal) { const n = chalRaces(S).length; if (n < RACE_IDS.length) k = Math.floor(k * n / RACE_IDS.length); }
    const c = towerCost(race, k, priceOf(mapOf(S)));
    return k === 0 ? Math.round(c * (1 - 0.25 * rl(S, 'pony_cheap'))) : c;
  }

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
      cd: 0, sigT: 0, sigTs: {}, stomp: 0, boomT: 0, bloodT: 0, surgeT: 0, face: 0, kills: 0, dmg: 0, wDmg: 0, wKills: 0, anim: 0,
      pm: priceOf(mapOf(S)), buff: null, wallPt: null, _s: null, rs: S.research, bo: S.bonus, cm: S.cm,
    };
  }

  function placeTower(S, race, x, y) {
    if (!canPlace(S, x, y) || chalBlock(S, race)) return null;
    const cost = nextTowerCost(S, race);
    if (S.cash < cost) return null;
    S.cash -= cost;
    const t = makeTower(S, race, x, y);
    t.spent = cost;
    t.face = faceRoad(mapOf(S), x, y);
    t.light = lightAt(mapOf(S), x, y);
    S.towers.push(t);
    S.buffsDirty = true;
    if (S.towers.length >= 25) feat(S, 'r_army');
    return t;
  }

  function sellValue(t) { return Math.floor(t.spent * (TUNE.sellRate + 0.05 * rsl(t.rs, 'eco_sell'))); }
  function sellTower(S, t) {
    const i = S.towers.indexOf(t);
    if (i < 0 || chalHas(S, 'nosell')) return 0;
    if (S.run && S.run.enemies.some(e => e.alive && e.boss)) feat(S, 'x_sell');
    S.stats.sold = (S.stats.sold || 0) + 1;
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
  function nextNodeCost(t, i) { return t.paths[i] >= 10 ? Infinity : nodeCost(t.race, t.paths[i], t.pm); }
  function buyNode(S, t, i) {
    const st = pathState(t, i);
    if (st === 'locked' || st === 'maxed') return false;
    const c = nextNodeCost(t, i);
    if (S.cash < c) return false;
    S.cash -= c; t.spent += c; t.paths[i]++; t._s = null; S.buffsDirty = true;
    if (S.stats) S.stats.upgrades = (S.stats.upgrades || 0) + 1;
    if (t.paths[i] >= 10 && S.stats) { feat(S, 'r_' + t.race); if (t.paths.filter(v => v >= 10).length >= 2) feat(S, 'r_dual'); }
    return true;
  }
  function infNext(t, which) { return Math.round(infCost(t.race, which === 'dmg' ? t.infD : t.infR) * (t.pm || 1)); }
  function buyInf(S, t, which) {
    const c = infNext(t, which);
    if (S.cash < c) return false;
    S.cash -= c; t.spent += c;
    if (which === 'dmg') t.infD++; else t.infR++;
    t._s = null;
    if (S.stats) S.stats.upgrades = (S.stats.upgrades || 0) + 1;
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
    const clone = { race: t.race, paths: t.paths.slice(), infD: t.infD, infR: t.infR, spent: 0, pm: t.pm, _s: null };
    const sim = { cash: S.cash, buffsDirty: false };
    const r = buyMaxAffordable(sim, clone);
    return { count: r.count, spent: r.spent, paths: clone.paths, infD: clone.infD, infR: clone.infR };
  }

  function computeStats(t) {
    const r = RACES[t.race];
    const crystal = t.race === 'crystal';
    const s = {
      range: r.range, dmg: r.dmg, rate: r.rate,
      canFly: t.race === 'pegasus' || t.race === 'bat', canMagic: t.race === 'unicorn',
      flyMul: 1, magicMul: 1, fastMul: t.race === 'bat' ? 1.5 : 1, splash: 0, chain: 0, slow: 0, slowDur: 0, stunCh: 0, stunDur: 0,
      knock: 0, multi: 1, crit: 0, critMul: 2.5, hex: 0, cash: 1,
      auraR: crystal ? 130 : 0, auraDmg: crystal ? 0.04 : 0, auraRate: crystal ? 0.02 : 0, auraRange: 0,
      detects: false, detectR: 0, seesBurrow: false, wall: 0, wallR: 0, lightR: crystal ? 110 : 0, sigs: [],
      pierce: 0, swarmMul: 1, revealR: crystal ? 70 : 0,
    };
    PATHS[t.race].forEach((p, i) => { if (t.paths[i] > 0) p.apply(t.paths[i], s); });
    s.slow = Math.min(0.6, s.slow);
    s.wall = Math.min(0.5, s.wall);
    if (s.sigs.indexOf('dawnstone') >= 0) { s.lightR = Math.max(s.lightR, s.auraR); s.detectR = Math.max(s.detectR, s.auraR); s.revealR = Math.max(s.revealR, s.auraR); }
    const bf = t.buff || {};
    if (bf.detect) s.detects = true;
    if (bf.crit) s.crit += bf.crit;
    if (bf.range) s.range *= 1 + bf.range;
    if (t.light && t.light !== 1) { s.baseRange = s.range; s.range *= t.light; }
    s.dmg *= Math.pow(TUNE.infMul, t.infD || 0);
    s.rate *= Math.pow(TUNE.infMul, t.infR || 0);
    const rs = t.rs || NO_RS;
    const raceLv = rsl(rs, 'pony_' + t.race);
    s.dmg *= (1 + 0.1 * rsl(rs, 'pony_dmg')) * (1 + 0.1 * raceLv);
    s.rate *= (1 + 0.05 * rsl(rs, 'pony_rate')) * (1 + 0.05 * raceLv);
    const rg = 1 + 0.04 * rsl(rs, 'pony_range');
    s.range *= rg;
    if (s.baseRange) s.baseRange *= rg;
    const bo = t.bo, cm = t.cm;
    if (bo) { s.dmg *= 1 + (bo.dmg || 0); s.rate *= 1 + (bo.rate || 0); s.range *= 1 + (bo.range || 0); if (s.baseRange) s.baseRange *= 1 + (bo.range || 0); }
    if (cm) { s.dmg *= cm.dmg || 1; s.range *= cm.range || 1; if (s.baseRange) s.baseRange *= cm.range || 1; }
    s.crit += 0.02 * rsl(rs, 'abil_crit');
    const hold = 1 + 0.1 * rsl(rs, 'abil_stun');
    s.stunDur *= hold; s.slowDur *= hold;
    const aura = 1 + 0.15 * rsl(rs, 'abil_aura');
    s.auraDmg *= aura; s.auraRate *= aura;
    const master = rsl(rs, 'abil_master');
    s.sigPow = (1 + 0.15 * rsl(rs, 'abil_power')) * (master ? 1.25 : 1);
    s.sigCd = (1 - 0.05 * rsl(rs, 'abil_cd')) * (master ? 0.9 : 1);
    s.has = {};
    for (const k of s.sigs) s.has[k] = true;
    return s;
  }
  function stats(t) { if (!t._s) t._s = t.isHero ? heroStats(t) : computeStats(t); return t._s; }

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
    if (s1.auraDmg > s0.auraDmg) lines.push((t.race === 'crystal' ? 'Gem aura +' : 'Herd aura +') + pct(s1.auraDmg) + ' damage');
    if (s1.auraRate > s0.auraRate) lines.push('Aura +' + pct(s1.auraRate) + ' attack speed');
    if (s1.auraR > s0.auraR && s0.auraR) lines.push('Aura radius ' + Math.round(s1.auraR));
    if (s1.auraRange > s0.auraRange) lines.push('Aura +' + pct(s1.auraRange) + ' range');
    if (s1.fastMul > s0.fastMul) rel(s0.fastMul, s1.fastMul, 'vs fast DNBs');
    if (s1.detects && !s0.detects) lines.push('Detects stealthy DNBs');
    if (s1.detectR > s0.detectR) lines.push('Ponies within ' + Math.round(s1.detectR) + ' detect stealth');
    if (s1.wall > s0.wall) lines.push('Wall slow ' + pct(s1.wall) + ', radius ' + Math.round(s1.wallR));
    if (s1.lightR > s0.lightR) lines.push('Light radius ' + Math.round(s1.lightR));
    if (s1.critMul > s0.critMul) lines.push('Crits deal ' + s1.critMul + 'x');
    if (s1.pierce > s0.pierce) lines.push('Ignores ' + pct(s1.pierce) + ' of armor');
    if (s1.swarmMul > s0.swarmMul) rel(s0.swarmMul, s1.swarmMul, 'vs swarms');
    if (s1.revealR > s0.revealR) lines.push('Reveals stealth within ' + Math.round(s1.revealR));
    const p = PATHS[t.race][i];
    if (k === 10) lines.push('Signature: ' + p.sig);
    return { name: p.name, k, cost: nodeCost(t.race, k - 1, t.pm), lines, sig: k === 10 ? p.sigDesc : '' };
  }

  function stackBuff(list) {
    if (!list.length) return 0;
    list.sort((a, b) => b - a);
    let sum = 0, w = 1;
    for (const v of list) { sum += v * w; w *= 0.3; }
    return sum;
  }
  function lightSources(S) {
    const out = [];
    for (const t of S.towers) { const s = stats(t); if (s.lightR > 0) out.push({ x: t.x, y: t.y, r: s.lightR, t }); }
    return out;
  }
  function lightFor(S, x, y, srcs) {
    const map = mapOf(S);
    const base = lightAt(map, x, y);
    if (base >= 1) return base;
    for (const c of srcs || lightSources(S)) if ((c.x - x) ** 2 + (c.y - y) ** 2 <= c.r * c.r) return 1;
    return base;
  }
  function refreshBuffs(S) {
    const T = S.towers;
    const src = T.map(stats);
    const lights = lightSources(S);
    const H = S.hero && S.hero.id ? S.hero : null, hs = H ? stats(H) : null;
    for (const b of T) {
      const dm = [], rt = [], rg = [];
      let detect = false;
      for (let i = 0; i < T.length; i++) {
        const a = T[i], s = src[i];
        const d2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
        if (s.detectR && d2 <= s.detectR * s.detectR) detect = true;
        if (a === b || !s.auraR || d2 > s.auraR * s.auraR) continue;
        if (s.auraDmg) dm.push(s.auraDmg);
        if (s.auraRate) rt.push(s.auraRate);
        if (s.auraRange) rg.push(s.auraRange);
      }
      const buff = { dmg: stackBuff(dm), rate: stackBuff(rt), range: stackBuff(rg), detect, crit: 0, hero: false };
      if (H && (H.x - b.x) ** 2 + (H.y - b.y) ** 2 <= hs.auraR * hs.auraR) {
        buff.hero = true;
        if (hs.auraKind === 'dmg') buff.dmg += hs.auraV;
        else if (hs.auraKind === 'rate') buff.rate += hs.auraV;
        else if (hs.auraKind === 'crit') { buff.crit = Math.round(hs.auraV * 1000) / 1000; buff.detect = true; }
      }
      const light = lightFor(S, b.x, b.y, lights);
      const old = b.buff || {};
      if (b.light !== light || (old.range || 0) !== buff.range || !!old.detect !== buff.detect || (old.crit || 0) !== buff.crit) b._s = null;
      b.light = light;
      b.buff = buff;
    }
    S.buffsDirty = false;
  }

  function effDmg(t) { return stats(t).dmg * (1 + ((t.buff && t.buff.dmg) || 0)); }
  function effRate(t) { return stats(t).rate * (1 + ((t.buff && t.buff.rate) || 0)) * (t.boomT > 0 ? 3 : 1) * (t.surgeT > 0 ? 1.25 : 1); }

  function topWave(S) { return Math.min(MAX_WAVE, S.cleared + 1); }

  function startWave(S, n) {
    if (S.run) return false;
    const ch = S.chal;
    if (ch) { if (ch.over) return false; n = S.cleared + 1; if (n > ch.to) return false; }
    n = Math.max(1, Math.min(n || S.sel, topWave(S)));
    S.sel = n;
    const map = mapOf(S);
    const spec = waveSpec(n, map);
    S.stats.played++;
    if (S.records) S.records.att++;
    const star = starOf(S);
    let queue = spec.list.slice();
    if (star >= 2) {
      queue = spec.list.map(it => Object.assign({}, it));
      for (const it of queue) it.t *= STAR.swift;
      if (star >= 5 && n >= STAR.eliteFrom) {
        const er = mulberry(hashSeed(S.seed, n, 77));
        for (const it of queue) if (!it.elite && it.type !== 'basic' && it.type !== 'boss' && er() < STAR.eliteAdd) it.elite = true;
      }
    }
    const lives = ch ? ch.lives : livesFor(S, star);
    S.run = {
      n, spec, map, route: map.route, queue, t: 0, lives, livesMax: ch ? ch.livesMax : lives, lives0: lives, enemies: [], proj: [], earned: 0, kills: 0, eid: 1,
      star, hpMul: starHpMul(star, S), spdMul: starSpeedMul(star), cashMul: killMul(S, star), clearMul: clearMul(S, star), regen: star >= 3 ? STAR.regen : 0,
      bossCash: 1 + 0.25 * rl(S, 'eco_boss'), leakCut: rl(S, 'util_leak'),
      fresh: n > S.cleared, over: null, rng: mulberry(hashSeed(S.seed, n, S.stats.played)), bossIds: [],
      enrageAt: (queue.length ? queue[queue.length - 1].t : 0) + 75 * Math.max(1, map.maxLen / BASE_LEN), windT: 0, gust: 0, gustWarn: 0, gustKind: '', gustDir: 1, gustOn: false,
    };
    if (ch) chalRun(S, S.run, ch);
    const ready = rl(S, 'abil_first') > 0;
    for (const t of S.towers) {
      t.cd = 0; t.sigT = 0; t.sigTs = {}; t.boomT = 0; t.bloodT = 0; t.surgeT = 0; t.stomp = 0; t.wDmg = 0; t.wKills = 0;
      if (ready) for (const k of stats(t).sigs) t.sigTs[k] = 999;
    }
    S.run.zones = [];
    if (S.hero && S.hero.id) {
      const h = S.hero;
      ensureHero(S, h);
      h.ab = [0, 0, 0]; h.cd = 0; h.stunT = 0; h.frenzyT = 0; h.wDmg = 0; h.wKills = 0; h.thinkT = 0;
    }
    if (S.hero && S.hero.id) feat(S, 'h_field');
    emit(S, 'start', { n, boss: spec.boss || S.run.xboss || null });
    return true;
  }

  function emit(S, type, data) { S.events.push(Object.assign({ type }, data || {})); }
  function fx(S, o) { if (S.fxOn && S.fx.length < 700) { o.t = 0; S.fx.push(o); } }
  function snd(S, k) { if (S.sfx) S.sfx[k] = (S.sfx[k] || 0) + 1; }

  function runHp(run) { return hpFor(run.n, run.map) * (run.hpMul || 1); }
  function spawnEnemy(S, run, type, d, opts) {
    const n = run.n;
    const def = ENEMIES[type];
    const base = runHp(run);
    const hpMax = base * def.hp;
    const e = {
      id: run.eid++, type, path: 0, d: d === undefined ? 0 : d, off: 0, x: 0, y: 0, tx: 1, ty: 0,
      hpMax, hp: hpMax, speed: def.speed, r: def.r, flying: !!def.flying, magical: !!def.magical,
      boss: type === 'boss', cash: def.cash, color: def.color, dark: def.dark, alive: true,
      slow: 0, slowT: 0, stunT: 0, hexAmp: 0, hexT: 0, doom: false, dispelT: 0, burrowT: 0, trickT: 0, sprintT: 0,
      quag: false, wallSlow: 0, revealT: 0, echoAmp: 0, stealth: !!def.stealth, hit: 0, leak: 1, phase: 0, seed: (run.eid * 977) % 1000, dn: 0, dnT: 0, dnCrit: false,
      dnDim: false, sh: 0, shMax: 0, shT: 0, ownSh: false, plateBase: base, plate: 0, swarm: !!def.swarm, timers: {}, seen: true,
    };
    e.plate = def.plate ? def.plate * e.plateBase : 0;
    if (def.heal) e.timers.heal = def.heal.every * e.seed / 1000;
    if (e.boss) {
      const b = (opts && opts.xb && run.xboss) || run.spec.boss || BOSSES[0];
      e.bossDef = b; e.trick = b.trick; e.name = b.name; e.color = b.color; e.dark = b.dark; e.leak = 5;
      e.hpMax = e.hp = base * def.hp * (1 + n / 100) * (b.hpMul || 1) * (run.bossHp || 1);
      if (run.star >= 1) e.starPlate = STAR.bossPlate * base;
      e.thresholds = [0.75, 0.5, 0.25];
      if (e.trick === 'flying') e.flying = true;
      if (e.trick === 'magical') e.magical = true;
      if (e.trick === 'armor') e.armor = true;
      if (e.trick === 'phase') e.flying = true;
      if (b.tricks) setupTricks(e, b);
      if (opts && opts.xb) e.hpMax = e.hp = e.hpMax * 0.6;
    }
    if (opts) Object.assign(e, opts);
    if (run.cm && !e.boss) chalEnemy(run.cm, e);
    if (run.spdMul) e.speed *= run.spdMul;
    if (e.elite) applyElite(e, n);
    if (S.codex) {
      const box = e.boss ? S.codex.b : S.codex.e, key = e.boss ? e.bossDef.id : type;
      if (!box[key]) { box[key] = 1; emit(S, 'codex', { kind: e.boss ? 'b' : 'e', id: key, name: e.boss ? e.bossDef.name : def.name }); }
    }
    const rng = mulberry(n * 131 + e.id * 31);
    e.off = (rng() - 0.5) * (e.boss ? 10 : 34);
    placeOnRoute(run, e);
    run.enemies.push(e);
    if (e.boss && !e.splitDone) { run.bossIds.push(e.id); if (!e.quiet) emit(S, 'boss', { name: e.name, n }); }
    return e;
  }

  function applyElite(e, n) {
    e.hpMax *= ELITE.hp; e.hp = e.hpMax; e.cash *= ELITE.cash; e.speed *= ELITE.speed; e.r *= ELITE.r; e.leak = 2;
    if (n < WAVEGEN.elite.combo) return;
    const k = e.seed % 3;
    if (k === 0) { e.eliteMod = 'plate'; e.plate = Math.max(e.plate, 0.02 * e.plateBase); }
    else if (k === 1) { e.eliteMod = 'bubble'; e.ownSh = true; e.sh = e.shMax = e.hpMax * 0.15; }
    else { e.eliteMod = 'cloak'; e.stealth = true; }
  }
  function armorFor(type, n, map) { const d = ENEMIES[type]; return d && d.plate ? d.plate * hpFor(n, map) : 0; }

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
  function isFast(e) { return e.speed >= 90 || e.sprintT > 0 || e.hasteT > 0; }
  function isHidden(e) { return !!e.stealth && !(e.revealT > 0); }
  function canHit(s, e) {
    if (!e.alive || e.d < SPAWN_GUARD) return false;
    if (e.burrowT > 0 && !s.seesBurrow && !(e.unearthT > 0)) return false;
    if (isHidden(e) && !s.detects) return false;
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
    if (e.dn > 0 && S.settings.dmgNums) fx(S, { k: 'num', x: e.x, y: e.y - e.r, s: fmt(e.dn), crit: e.dnCrit, dim: e.dnDim && !e.dnCrit, big: e.boss, life: e.dnCrit ? 0.95 : 0.75, seed: e.id });
    e.dn = 0; e.dnCrit = false; e.dnDim = false; e.dnT = 0;
  }

  function damage(S, run, e, amt, t, crit) {
    if (!e.alive || amt <= 0) return;
    let m = 1 + (e.hexT > 0 ? e.hexAmp : 0) + (e.quag ? 0.15 : 0) + (e.revealT > 0 && e.echoAmp ? e.echoAmp : 0);
    if (e.armor && e.hp > e.hpMax * 0.5) m *= 0.4;
    if (e.cut) m *= 1 - e.cut;
    let dealt = amt * m, dim = false, ab = 0;
    const plv = e.plate + (e.starPlate || 0);
    if (plv > 0) {
      const pl = plv * (1 - (t ? stats(t).pierce : 0));
      if (pl > 0) { dealt = Math.max(dealt * 0.2, dealt - pl); dim = true; }
    }
    if (e.sh > 0) {
      ab = Math.min(e.sh, dealt);
      e.sh -= ab; dealt -= ab; e.shHit = 0.15;
      if (e.sh <= 0) { e.sh = 0; fx(S, { k: 'shieldpop', x: e.x, y: e.y, r: e.r + 9, life: 0.4 }); snd(S, 'shield'); }
    }
    const real = Math.min(e.hp, dealt);
    S.stats.dmg += real;
    if (t) { t.dmg += real; t.wDmg += real; const bx = t.isHero ? S.stats.heroDmg : S.stats.raceDmg, key = t.isHero ? t.id : t.race; if (bx && key) bx[key] = (bx[key] || 0) + real; }
    e.hp -= dealt;
    e.hit = 0.12;
    S.sfx.hit++;
    if (S.fxOn) { if (e.dn === 0) e.dnT = 0.16; e.dn += real + ab; if (crit) e.dnCrit = true; if (dim || ab > 0) e.dnDim = true; }
    if (dealt <= 0) return;
    if (e.hp <= 0) { kill(S, run, e, t); return; }
    if (e.thresholds && (e.trick === 'brood' || e.trick === 'mother')) {
      while (e.thresholds.length && e.hp < e.hpMax * e.thresholds[0]) {
        e.thresholds.shift();
        for (let i = 0; i < 4; i++) {
          const m2 = spawnEnemy(S, run, 'basic', Math.max(20, e.d - 12 - i * 14));
          m2.hpMax = m2.hp = runHp(run) * 1.2;
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
          m2.hpMax = m2.hp = runHp(run) * def.hp * 1.2;
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
    const gain = killCash(run.n, run.map) * e.cash * mult * (run.cashMul || 1) * (e.boss ? run.bossCash || 1 : 1);
    S.cash += gain; run.earned += gain; run.kills++; S.totalKills++; S.stats.earned += gain;
    if (S.chal) S.chal.parent.totalKills++;
    const st = S.stats;
    if (st.killsBy) st.killsBy[e.boss ? 'boss' : e.type] = (st.killsBy[e.boss ? 'boss' : e.type] || 0) + 1;
    if (e.elite) st.eliteKills = (st.eliteKills || 0) + 1;
    if (!S.chal && st.mapKills) st.mapKills[run.map.id] = (st.mapKills[run.map.id] || 0) + 1;
    if (e.boss && !e.splitDone) { const R = run.route[e.path] || run.route[0]; if (R && e.d > R.len - 90) feat(S, 'x_gate'); }
    S.sfx.kill++;
    if (t) { t.kills++; t.wKills++; }
    heroXp(S, run, e, t);
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
    const def = ENEMIES[e.type];
    if (def.split && !e.boss) {
      const P = run.route[e.path] || run.route[0];
      for (let i = 0; i < def.split.n; i++) {
        const c = spawnEnemy(S, run, def.split.type, Math.min(P.len - 1, Math.max(SPAWN_GUARD + 1, e.d + 6 - i * 12)), { path: e.path });
        if (e.elite) { c.hpMax *= 2; c.hp = c.hpMax; }
      }
      fx(S, { k: 'ring', x: e.x, y: e.y, r: 34, c: '#d8a8c8', life: 0.4 });
      snd(S, 'split');
    }
    if (e.boss && e.tk && e.tk.split && !e.splitDone) {
      const sp = e.tk.split;
      for (let i = 0; i < sp.n; i++) {
        const c = spawnEnemy(S, run, 'boss', Math.max(20, e.d - 20 - i * 24), { path: e.path, splitDone: true, quiet: true });
        c.hpMax = c.hp = e.hpMax * sp.frac; c.r = e.r * 0.75; c.leak = 2; c.name = sp.name;
        c.tk = { fly: e.flying, magic: e.magical }; c.eff = null; c.stage = -1; c.broodQ = []; c.cut = 0; c.timers = {}; c.plate = 0; c.sh = 0; c.shMax = 0; c.ownSh = false; c.stealth = false;
        c.flying = e.flying; c.magical = e.magical;
      }
      fx(S, { k: 'ring', x: e.x, y: e.y, r: 70, c: (e.bossDef.look && e.bossDef.look.aura) || e.color, life: 0.6 });
    }
  }

  const KNOCK_CD = 0.2;
  function knockBack(run, e, amt) { if (run.t - (e.knockAt ?? -1) < KNOCK_CD) return; e.knockAt = run.t; e.d = Math.max(16, e.d - amt); }
  function hitEnemy(S, run, t, s, e, base, force) {
    if (!e.alive) return;
    let d = base;
    if (e.swarm) d *= s.swarmMul;
    if (isFly(e)) d *= s.flyMul;
    if (isMagic(e) || (e.magical && (s.has.leyrupture || s.has.dispelprism))) d *= s.magicMul;
    const fast = s.fastMul !== 1 && isFast(e);
    if (fast) d *= s.fastMul;
    let crit = false;
    if (force || (s.crit > 0 && run.rng() < s.crit)) { crit = true; d *= (s.has.raptordive && isFly(e)) ? 5 : s.critMul; S.sfx.crit++; }
    damage(S, run, e, d, t, crit);
    if (crit) fx(S, { k: 'spark', x: e.x, y: e.y, c: '#fff2a8', life: 0.3 });
    if (!e.alive) return;
    if (s.slow > 0) { e.slow = Math.max(e.slow, e.boss ? s.slow * 0.5 : s.slow); e.slowT = Math.max(e.slowT, s.slowDur); }
    if (s.stunCh > 0 && run.rng() < s.stunCh) stunE(e, e.boss ? s.stunDur * 0.3 : s.stunDur);
    if (s.hex > 0) { e.hexAmp = Math.max(e.hexAmp, s.hex); e.hexT = 4; if (s.has.doomhex) e.doom = true; }
    if (s.knock > 0) knockBack(run, e, s.knock * (e.boss ? 0.15 : 1));
    if (fast && s.has.nightfeast) { e.slow = Math.max(e.slow, e.boss ? 0.15 : 0.3); e.slowT = Math.max(e.slowT, 2); }
    if (s.has.raptordive && isFly(e) && !e.boss && e.hp < e.hpMax * 0.2) kill(S, run, e, t);
  }

  const PROJ_SPEED = { unicorn: 560, pegasus: 820, bat: 900, crystal: 640 };
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
    const blood = s.has.bloodmoon && t.bloodT > 0;
    if (s.has.featherstorm || blood) list = targets;
    else {
      list = [first];
      if (s.multi > 1) {
        const rest = targets.filter(e => e !== first).sort((a, b) => b.d - a.d);
        for (let i = 0; i < s.multi - 1 && i < rest.length; i++) list.push(rest[i]);
      }
    }
    for (const e of list) {
      run.proj.push({ x: t.x, y: t.y - 10, e, t, dmg, sp: PROJ_SPEED[t.race] || 820, kind: t.race, life: 3, a: 0, crit: blood });
    }
    if (list.length && t.race === 'bat') snd(S, 'chirp');
    else if (list.length && t.race === 'crystal') snd(S, 'chime');
  }

  function projHit(S, run, p) {
    const t = p.t;
    if (t.isHero) { heroProjHit(S, run, p); return; }
    const s = stats(t), e = p.e;
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
    } else if (t.race === 'crystal') {
      const d = p.dmg;
      if (s.has.dispelprism && e.magical) e.dispelT = Math.max(e.dispelT, 4);
      hitEnemy(S, run, t, s, e, d);
      if (s.splash > 0) {
        fx(S, { k: 'shards', x: p.x, y: p.y, r: s.splash, c: '#9fe6ff', seed: e.id, life: 0.35 });
        for (const o of run.enemies) {
          if (o === e || dist2(o, p) > s.splash * s.splash) continue;
          if (s.has.dispelprism && o.magical && o.alive) o.dispelT = Math.max(o.dispelT, 4);
          if (canHit(s, o)) hitEnemy(S, run, t, s, o, d * 0.6);
        }
      }
    } else if (t.race === 'bat') {
      hitEnemy(S, run, t, s, e, p.dmg, p.crit);
      if (p.crit || p.kind === 'swarm') fx(S, { k: 'bite', x: e.x, y: e.y, c: p.crit ? '#ff3a5c' : '#c9b8ff', life: 0.25 });
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
    if (t.boomT > 0) t.boomT -= dt;
    if (t.bloodT > 0) t.bloodT -= dt;
    if (!s.sigs.length) return;
    dmg *= s.sigPow || 1;
    const cdm = s.sigCd || 1;
    const T = t.sigTs || (t.sigTs = {});
    for (const k of s.sigs) T[k] = (T[k] || 0) + dt;
    let cur = '';
    const every = (sec) => { if (T[cur] >= sec * cdm) { T[cur] = 0; return true; } return false; };
    const on = (k) => { cur = k; return !!s.has[k]; };
    if (on('starfall') && targets.length && every(6)) {
      let best = targets[0]; for (const e of targets) if (e.hp > best.hp) best = e;
      const R = 75;
      fx(S, { k: 'star', x: best.x, y: best.y, r: R, c: '#ffe9a8', life: 0.6 });
      for (const o of run.enemies) if (o.alive && o.burrowT <= 0 && dist2(o, best) <= R * R) damage(S, run, o, dmg * 12, t);
    }
    if (on('timestop') && targets.length && every(10)) {
      fx(S, { k: 'ring', x: t.x, y: t.y, r: s.range, c: '#9fe3ff', life: 0.6 });
      for (const o of run.enemies) if (o.alive && inRange(t, o, s.range)) stunE(o, o.boss ? 0.5 : 1.5);
    }
    if (on('thunderhead') && targets.length && every(5)) {
      const list = targets.slice().sort((a, b) => b.hp - a.hp).slice(0, 8);
      for (const o of list) { fx(S, { k: 'bolt', x: o.x, y: o.y, c: '#e6f4ff', life: 0.3 }); hitEnemy(S, run, t, s, o, dmg * 5); }
    }
    if (on('cyclone') && targets.length && every(9)) {
      fx(S, { k: 'swirl', x: t.x, y: t.y, r: s.range, c: '#bdf5ee', life: 0.7 });
      for (const o of run.enemies) if (o.alive && !o.boss && inRange(t, o, s.range)) { knockBack(run, o, 150); stunE(o, 0.6); }
    }
    if (on('rainboom') && targets.length && every(15)) {
      t.boomT = 4;
      fx(S, { k: 'rainbow', x: t.x, y: t.y, r: s.range, life: 0.9 });
    }
    if (on('stampede') && every(12)) {
      let any = false;
      for (const o of run.enemies) {
        if (!o.alive || o.flying || o.burrowT > 0 || o.d < SPAWN_GUARD) continue;
        if (isMagic(o) && !s.canMagic) continue;
        any = true; hitEnemy(S, run, t, s, o, dmg * 6);
      }
      if (any) fx(S, { k: 'stampede', x: 0, y: 0, life: 0.9 });
      else T.stampede = 12;
    }
    if (on('deepecho') && every(5)) {
      const R = s.range * 2;
      fx(S, { k: 'sonar', x: t.x, y: t.y, r: R, c: '#ff8fb0', life: 0.8 }); snd(S, 'sonar');
      for (const o of run.enemies) if (o.alive && dist2(o, t) <= R * R) { o.revealT = 4; o.echoAmp = Math.max(o.echoAmp || 0, 0.2); }
    }
    if (on('swarmnight') && targets.length && every(7)) {
      for (let i = 0; i < 8; i++) {
        const e = targets[i % targets.length];
        const a = i / 8 * Math.PI * 2;
        run.proj.push({ x: t.x + Math.cos(a) * 16, y: t.y - 10 + Math.sin(a) * 12, e, t, dmg: dmg * 3, sp: 520, kind: 'swarm', life: 3, a });
      }
      fx(S, { k: 'ring', x: t.x, y: t.y, r: 34, c: '#c9b8ff', life: 0.4 }); snd(S, 'swarm');
    }
    if (on('bloodmoon') && targets.length && every(14)) {
      t.bloodT = 5;
      fx(S, { k: 'bloodmoon', x: t.x, y: t.y, r: s.range, life: 1 }); snd(S, 'bloodmoon');
    }
    if (on('dreadscreech') && targets.length && every(9)) {
      fx(S, { k: 'screech', x: t.x, y: t.y, r: s.range, c: '#ff5a7a', life: 0.6 }); snd(S, 'screech');
      for (const o of run.enemies) if (o.alive && inRange(t, o, s.range) && canHit(s, o)) { stunE(o, o.boss ? 0.3 : 1); o.hexAmp = Math.max(o.hexAmp, 0.25); o.hexT = Math.max(o.hexT, 4); }
    }
    if (on('chorus') && every(10)) {
      let any = false;
      for (const o of S.towers) if (o !== t && dist2(o, t) <= s.auraR * s.auraR) { o.surgeT = 3; any = true; }
      if (any) { fx(S, { k: 'chorus', x: t.x, y: t.y, r: s.auraR, life: 0.9 }); snd(S, 'chorus'); }
    }
    if (on('fortress') && every(3)) {
      const W = t.wallPt || (t.wallPt = nearestOnMap(run.map, t.x, t.y));
      let any = false;
      for (const o of run.enemies) {
        if (!o.alive || o.flying || o.burrowT > 0 || o.d < SPAWN_GUARD || dist2(o, W) > s.wallR * s.wallR) continue;
        if (isHidden(o) && !s.detects) continue;
        any = true;
        hitEnemy(S, run, t, s, o, dmg * 6);
        if (o.alive) stunE(o, o.boss ? 0.2 : 0.6);
      }
      if (any) { fx(S, { k: 'wallpulse', x: W.x, y: W.y, r: s.wallR, life: 0.5 }); snd(S, 'quake'); }
    }
    if (on('cataclysm') && targets.length && every(8)) {
      let best = targets[0]; for (const e of targets) if (e.hp > best.hp) best = e;
      const R = 80;
      fx(S, { k: 'cataclysm', x: best.x, y: best.y, r: R, seed: best.id, life: 0.8 }); snd(S, 'cataclysm');
      for (const o of run.enemies) {
        if (!o.alive || dist2(o, best) > R * R || !canHit(s, o)) continue;
        damage(S, run, o, dmg * 15, t);
        if (o.alive) stunE(o, o.boss ? 0.3 : 1);
      }
    }
  }

  function stunE(e, dur) { if (e.stunT > 0 || e.stunImm > 0) return; e.stunT = dur; }

  function enemyUpdate(S, run, e, dt) {
    if (e.hit > 0) e.hit -= dt;
    if (e.dn > 0) { e.dnT -= dt; if (e.dnT <= 0) flushNum(S, e); }
    if (e.hexT > 0) { e.hexT -= dt; if (e.hexT <= 0) { e.hexAmp = 0; } }
    if (e.dispelT > 0) e.dispelT -= dt;
    if (e.unearthT > 0) e.unearthT -= dt;
    if (e.revealT > 0) { e.revealT -= dt; if (e.revealT <= 0) e.echoAmp = 0; }
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slow = 0; }
    if (e.shHit > 0) e.shHit -= dt;
    if (e.healed > 0) e.healed -= dt;
    if (e.shT > 0) { e.shT -= dt; if (e.shT <= 0 && !e.ownSh) { e.sh = 0; e.shMax = 0; } }
    if (e.boss) bossTrick(S, run, e, dt);
    else mobTrick(S, run, e, dt);
    if (run.regen && e.hp < e.hpMax) e.hp = Math.min(e.hpMax, e.hp + e.hpMax * run.regen * (e.boss ? 0.5 : 1) * dt);
    if (e.stunImm > 0) e.stunT = 0;
    let sp = e.speed * (1 - e.slow) * (e.quag ? 0.5 : 1) * (1 - (e.wallSlow || 0)) * (e.sprintT > 0 ? (e.sprintMul || 3) : 1);
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
      run.lives -= e.boss ? Math.max(1, e.leak - (run.leakCut || 0)) : e.leak;
      S.sfx.leak++;
      const end = P.pts[P.pts.length - 1];
      fx(S, { k: 'leak', x: Math.min(WORLD.L, end[0]), y: end[1], life: 0.6 });
      emit(S, 'leak', { boss: e.boss, lives: run.lives, dnb: e.type, elite: e.elite ? e.eliteMod || 'elite' : '' });
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

  function healPulse(S, run, src, R, p) {
    const R2 = R * R;
    let any = false;
    for (const o of run.enemies) {
      if (o === src || !o.alive || o.hp >= o.hpMax || dist2(o, src) > R2) continue;
      o.hp = Math.min(o.hpMax, o.hp + o.hpMax * p * (o.boss ? 0.25 : 1)); o.healed = 0.5; any = true;
    }
    fx(S, { k: 'heal', x: src.x, y: src.y, r: R, life: 0.7 });
    if (any) snd(S, 'heal');
  }
  function aegisAura(run, src, R, p) {
    const R2 = R * R;
    for (const o of run.enemies) {
      if (o === src || !o.alive || o.ownSh || dist2(o, src) > R2) continue;
      const cap = o.hpMax * (o.boss ? Math.min(p, 0.05) : p);
      if (!(o.shT > 0)) { o.shMax = cap; o.sh = cap; }
      else if (cap > o.shMax) o.shMax = cap;
      o.shT = 0.25;
      o.shSrc = src.id;
    }
  }
  function shieldRegen(run, dt) {
    for (const o of run.enemies) if (o.alive && o.shT > 0 && !o.ownSh && o.sh < o.shMax) o.sh = Math.min(o.shMax, o.sh + o.shMax * 0.04 * dt);
  }
  function mobTrick(S, run, e, dt) {
    const def = ENEMIES[e.type];
    if (def.heal && tick(e, 'heal', def.heal.every, dt)) healPulse(S, run, e, def.heal.r, def.heal.pct);
    if (def.aegis) aegisAura(run, e, def.aegis.r, def.aegis.pct);
    if (def.burrow) {
      const P = run.route[e.path] || run.route[0];
      const c = def.burrow.cycle, u = def.burrow.under;
      const under = e.d > 110 && e.d < P.len - 90 && ((e.d + e.seed * 0.4) % c) > c - u;
      if (under !== (e.burrowT > 0)) { fx(S, { k: 'dust', x: e.x, y: e.y, r: e.r + 10, seed: e.id, life: 0.55 }); if (under) snd(S, 'burrow'); }
      e.burrowT = under ? 1 : 0;
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
    e.plate = t.plate ? t.plate * e.plateBase : 0;
    if (t.cloak) {
      if (tick(e, 'cloak', t.cloak.every, dt)) { e.cloakT = t.cloak.dur; fx(S, { k: 'puff', x: e.x, y: e.y, r: 30, c: '#8a8aa8', life: 0.45 }); }
      if (e.cloakT > 0) e.cloakT -= dt;
      e.stealth = e.cloakT > 0;
    } else e.stealth = false;
    if (t.heal && tick(e, 'heal', t.heal.every, dt)) healPulse(S, run, e, t.heal.r, t.heal.pct);
    if (t.aegis) aegisAura(run, e, t.aegis.r, t.aegis.pct);
    if (t.bubble && tick(e, 'bubble', t.bubble.every, dt)) { e.ownSh = true; e.sh = e.shMax = e.hpMax * t.bubble.pct; fx(S, { k: 'ring', x: e.x, y: e.y, r: e.r + 14, c: '#9fd0ff', life: 0.4 }); snd(S, 'shield'); }
    if (t.summon && tick(e, 'summon', t.summon.every, dt)) {
      const sd = ENEMIES[t.summon.type];
      for (let i = 0; i < t.summon.n; i++) {
        const m2 = spawnEnemy(S, run, t.summon.type, Math.max(SPAWN_GUARD + 1, e.d - 14 - i * 8), { path: e.path });
        m2.hpMax = m2.hp = runHp(run) * sd.hp * 1.2;
      }
      fx(S, { k: 'ring', x: e.x, y: e.y, r: 50, c: aura, life: 0.45 });
    }
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

  function revealStep(S, run) {
    const cr = run.map.crystals;
    let rev = null, det = null;
    for (const e of run.enemies) {
      if (!e.alive || !e.stealth) { e.seen = true; continue; }
      if (!rev) {
        rev = []; det = [];
        for (const t of S.towers) { const s = stats(t); if (s.revealR > 0) rev.push([t.x, t.y, s.revealR]); if (s.detects) det.push([t, s.range]); }
        if (cr) for (const c of cr) rev.push([c.x, c.y, c.r * 0.6]);
      }
      for (const [x, y, R] of rev) if ((e.x - x) ** 2 + (e.y - y) ** 2 <= R * R) { e.revealT = Math.max(e.revealT, 0.15); break; }
      let seen = e.revealT > 0;
      if (!seen) for (const [t, R] of det) if (inRange(t, e, R)) { seen = true; break; }
      e.seen = seen;
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

  const HERO_TUNE = { hit: 0.01, grow: 1.02, xp0: 20, xpGrow: 1.16, maxLv: 30, ranks: [5, 10, 20, 30], roarR: 260, roarStun: 1.6, roarEvery: 9, think: 0.25, pickR: 30 };
  function hm(R) { return 1 + 0.25 * (R - 1); }
  function hNear(run, x, y, R, f) {
    const out = [];
    for (const e of run.enemies) if (e.alive && e.d >= SPAWN_GUARD && (e.x - x) ** 2 + (e.y - y) ** 2 <= (R + e.r * 0.5) ** 2 && (!f || f(e))) out.push(e);
    return out;
  }
  function hStrong(list) { let b = null; for (const e of list) if (!b || (e.boss && !b.boss) || (e.boss === b.boss && e.hp > b.hp)) b = e; return b; }
  function hCluster(run, h, s, r) {
    const list = hNear(run, h.x, h.y, s.range, e => canHit(s.ab, e));
    let best = null, bn = 0;
    for (const e of list) {
      let n = 0;
      for (const o of list) if ((o.x - e.x) ** 2 + (o.y - e.y) ** 2 <= r * r) n += o.boss ? 4 : 1;
      if (n > bn) { bn = n; best = e; }
    }
    return best ? { e: best, n: bn } : null;
  }
  const HEROES = {
    nova: {
      id: 'nova', name: 'Nova Quill', race: 'unicorn', role: 'Unicorn mage', title: 'Starlit scholar',
      body: '#b89ae6', mane: '#2c2f6e', cape: '#5b3fa8', accent: '#ffd6f6', crown: 'tiara', horn: true,
      range: 175, rate: 0.85, pow: 1, splash: 48, speed: 150, canFly: true, canMagic: true, attack: 'bolt', proj: { sp: 620, c: '#e6c8ff' },
      blurb: 'Bolts of starlight that splash and hit every kind of DNB.',
      aura: { kind: 'dmg', r: 150, base: 0.05, per: 0.003, name: 'Scholar\'s Glow', text: v => 'Ponies in the glow deal +' + pct(v) + ' damage' },
      unlock: { free: true, moon: 0, text: 'Free' },
      abil: [
        { id: 'starburst', name: 'Starburst', cd: 12, icon: 'burst', text: R => 'Blast the thickest knot of DNBs for ' + (6 * hm(R)).toFixed(1) + 'x hit power and dispel magical DNBs there.',
          want: (S, run, h, s) => { const c = hCluster(run, h, s, 90); return !!c && c.n >= 3; },
          cast: (S, run, h, s, P, R) => {
            const c = hCluster(run, h, s, 90);
            if (!c) return false;
            const r = 90 + 6 * R, x = c.e.x, y = c.e.y;
            for (const e of hNear(run, x, y, r, o => canHit(s.ab, o) || o.magical)) {
              if (e.magical) e.dispelT = Math.max(e.dispelT, 4);
              if (canHit(s.ab, e)) hitEnemy(S, run, h, s.ab, e, 6 * P * hm(R));
            }
            fx(S, { k: 'nova', x, y, r, c: '#e6c8ff', c2: '#7a5cff', life: 0.55 });
            h.face = Math.atan2(y - h.y, x - h.x);
            return true;
          } },
        { id: 'reveal', name: 'Revealing Light', cd: 18, icon: 'eye', text: R => 'Reveal every DNB within ' + (220 + 30 * R) + ' for ' + (5 + R) + 's. Revealed DNBs take +' + pct(0.12 + 0.03 * R) + ' damage.',
          want: (S, run, h, s) => { const l = hNear(run, h.x, h.y, 220 + 30 * s.rank); return l.some(e => e.stealth && !(e.revealT > 0.5)) || l.length >= 6 || l.some(e => e.boss); },
          cast: (S, run, h, s, P, R) => {
            const r = 220 + 30 * R;
            const l = hNear(run, h.x, h.y, r);
            if (!l.length) return false;
            for (const e of l) { e.revealT = Math.max(e.revealT, 5 + R); e.echoAmp = Math.max(e.echoAmp || 0, 0.12 + 0.03 * R); }
            fx(S, { k: 'sonar', x: h.x, y: h.y, r: Math.min(r, 700), c: '#fff2c8', life: 0.8 });
            return true;
          } },
        { id: 'prison', name: 'Arcane Prison', cd: 26, icon: 'cage', text: R => 'Freeze DNBs within 150 for ' + (1.5 + 0.25 * R).toFixed(2) + 's (bosses ' + (0.5 + 0.1 * R).toFixed(1) + 's) and deal ' + (2 * hm(R)).toFixed(1) + 'x hit power.',
          want: (S, run, h, s) => { const l = hNear(run, h.x, h.y, 150, e => canHit(s.ab, e)); return l.length >= 6 || l.some(e => e.boss); },
          cast: (S, run, h, s, P, R) => {
            const l = hNear(run, h.x, h.y, 150, e => canHit(s.ab, e));
            if (!l.length) return false;
            for (const e of l) { stunE(e, e.boss ? 0.5 + 0.1 * R : 1.5 + 0.25 * R); hitEnemy(S, run, h, s.ab, e, 2 * P * hm(R)); }
            fx(S, { k: 'ring', x: h.x, y: h.y, r: 150, c: '#b48bff', life: 0.6 });
            return true;
          } },
      ],
    },
    ironmane: {
      id: 'ironmane', name: 'Ironmane', race: 'earth', role: 'Earth pony tank', title: 'Wall of the valley',
      body: '#c8875a', mane: '#f2e3b0', cape: '#8a2f2a', accent: '#e3c15b', crown: 'helm',
      range: 90, rate: 0.8, pow: 1.1, speed: 115, canFly: false, canMagic: true, attack: 'stomp', stunCut: 0.5,
      blurb: 'Stomps every ground DNB in reach. Cannot reach flyers. Boss roars stun him for half as long.',
      aura: { kind: 'slow', r: 130, base: 0.08, per: 0.003, name: 'Stone Presence', text: v => 'DNBs near Ironmane move ' + pct(v) + ' slower (bosses half)' },
      unlock: { moon: 15, map: 'moonlit', wave: 25, text: 'Clear wave 25 on Moonlit Road' },
      abil: [
        { id: 'breaker', name: 'Shield Breaker', cd: 10, icon: 'shield', text: R => 'Smash the toughest DNB nearby for ' + (8 * hm(R)).toFixed(1) + 'x hit power through any plate, and pop every shield within 70.',
          want: (S, run, h, s) => { const l = hNear(run, h.x, h.y, s.range + 50, e => canHit(s.ab, e)); return l.some(e => e.sh > 0 || e.plate > 0 || e.boss || e.elite) || l.length >= 3; },
          cast: (S, run, h, s, P, R) => {
            const l = hNear(run, h.x, h.y, s.range + 50, e => canHit(s.ab, e));
            if (!l.length) return false;
            let tg = null, bv = -1;
            for (const e of l) { const v = e.hp * (e.sh > 0 ? 3 : 1) * (e.plate > 0 || e.starPlate ? 2 : 1) * (e.boss ? 4 : 1); if (v > bv) { bv = v; tg = e; } }
            for (const e of hNear(run, tg.x, tg.y, 70)) if (e.sh > 0) { e.sh = 0; if (e.ownSh) e.shMax = 0; fx(S, { k: 'shieldpop', x: e.x, y: e.y, r: e.r + 9, life: 0.4 }); snd(S, 'shield'); }
            hitEnemy(S, run, h, s.abP, tg, 8 * P * hm(R));
            fx(S, { k: 'stomp', x: tg.x, y: tg.y, r: 70, c: '#ffd27a', life: 0.4 });
            h.face = Math.atan2(tg.y - h.y, tg.x - h.x);
            return true;
          } },
        { id: 'bellow', name: 'Taunting Bellow', cd: 16, icon: 'shout', text: R => 'Stun DNBs within 140 for ' + (1.2 + 0.2 * R).toFixed(1) + 's (bosses ' + (0.4 + 0.08 * R).toFixed(2) + 's).',
          want: (S, run, h) => { const l = hNear(run, h.x, h.y, 140, e => !(e.burrowT > 0)); return l.length >= 4 || l.some(e => e.boss); },
          cast: (S, run, h, s, P, R) => {
            const l = hNear(run, h.x, h.y, 140, e => !(e.burrowT > 0));
            if (!l.length) return false;
            for (const e of l) stunE(e, e.boss ? 0.4 + 0.08 * R : 1.2 + 0.2 * R);
            fx(S, { k: 'ring', x: h.x, y: h.y, r: 140, c: '#ffb04a', life: 0.5 });
            return true;
          } },
        { id: 'quake', name: 'Earthquake', cd: 24, icon: 'quake', text: R => 'Shake the ground within 130 for ' + (4 + 0.5 * R) + 's: ' + (1.2 * hm(R)).toFixed(1) + 'x hit power every half second, 40% slow, and burrowed DNBs are dragged up where any pony can hit them.',
          want: (S, run, h) => { const l = hNear(run, h.x, h.y, 130, e => !e.flying); return l.length >= 4 || l.some(e => e.boss || e.burrowT > 0); },
          cast: (S, run, h, s, P, R) => {
            const l = hNear(run, h.x, h.y, 130, e => !e.flying);
            if (!l.length) return false;
            const life = 4 + 0.5 * R;
            run.zones.push({ x: h.x, y: h.y, r: 130, life, t: 0, tick: 0, mul: 1.2 * hm(R) });
            fx(S, { k: 'quake', x: h.x, y: h.y, r: 130, life });
            return true;
          } },
      ],
    },
    skyflick: {
      id: 'skyflick', name: 'Skyflick', race: 'pegasus', role: 'Pegasus speedster', title: 'Fastest wings in the vale',
      body: '#8fd0f5', mane: '#ff7a59', cape: '#ffd24a', accent: '#ffffff', crown: 'goggles', wings: true,
      range: 155, rate: 2.2, pow: 0.42, speed: 270, canFly: true, canMagic: false, flyMul: 2, attack: 'dart', proj: { sp: 980, c: '#bfe8ff' },
      blurb: 'Rapid wind darts, double damage to flyers. Cannot harm magical DNBs. Moves faster than any hero.',
      aura: { kind: 'rate', r: 150, base: 0.05, per: 0.003, name: 'Tailwind', text: v => 'Ponies in the tailwind attack ' + pct(v) + ' faster' },
      unlock: { moon: 25, map: 'woods', wave: 50, text: 'Clear wave 50 on Whispering Woods' },
      abil: [
        { id: 'cyclone', name: 'Cyclone Nova', cd: 11, icon: 'swirl', text: R => 'Spin a cyclone of radius 160: ' + (3 * hm(R)).toFixed(1) + 'x hit power, triple against swarms, and knocks DNBs back.',
          want: (S, run, h, s) => { const l = hNear(run, h.x, h.y, 160, e => canHit(s.ab, e)); return l.length >= 4 || l.filter(e => e.swarm).length >= 3; },
          cast: (S, run, h, s, P, R) => {
            const l = hNear(run, h.x, h.y, 160, e => canHit(s.ab, e));
            if (!l.length) return false;
            for (const e of l) {
              hitEnemy(S, run, h, s.ab, e, 3 * P * hm(R) * (e.swarm ? 3 : 1));
              if (e.alive && !e.boss) knockBack(run, e, e.swarm ? 80 : 40);
            }
            fx(S, { k: 'swirl', x: h.x, y: h.y, r: 160, c: '#bfe8ff', life: 0.6 });
            return true;
          } },
        { id: 'lightning', name: 'Lightning Strike', cd: 9, icon: 'bolt', text: R => 'Lightning leaps between ' + (4 + R) + ' DNBs for ' + (4 * hm(R)).toFixed(1) + 'x hit power each, double on flyers.',
          want: (S, run, h, s) => { const l = hNear(run, h.x, h.y, s.range * 1.3, e => canHit(s.ab, e)); return l.length >= 2 || l.some(e => e.boss); },
          cast: (S, run, h, s, P, R) => {
            const l = hNear(run, h.x, h.y, s.range * 1.3, e => canHit(s.ab, e));
            if (!l.length) return false;
            let cur = pick(l, 'first', h);
            const hit = new Set();
            let from = { x: h.x, y: h.y - 18 };
            for (let i = 0; i < 4 + R && cur; i++) {
              hit.add(cur);
              fx(S, { k: 'zap', x1: from.x, y1: from.y, x2: cur.x, y2: cur.y, c: '#fff6a0', life: 0.25 });
              hitEnemy(S, run, h, s.ab, cur, 4 * P * hm(R) * (cur.flying ? 2 : 1));
              from = { x: cur.x, y: cur.y };
              let nx = null, bd = 150 * 150;
              for (const o of run.enemies) { if (hit.has(o) || !canHit(s.ab, o)) continue; const dd = dist2(o, from); if (dd < bd) { bd = dd; nx = o; } }
              cur = nx;
            }
            return true;
          } },
        { id: 'gale', name: 'Gale Wall', cd: 20, icon: 'wind', text: R => 'A wall of wind within 220 hurls flyers back and slows ground DNBs by 30% for ' + (3 + 0.5 * R) + 's.',
          want: (S, run, h) => { const l = hNear(run, h.x, h.y, 220); return l.some(e => e.flying) || l.length >= 6; },
          cast: (S, run, h, s, P, R) => {
            const l = hNear(run, h.x, h.y, 220);
            if (!l.length) return false;
            for (const e of l) {
              if (e.flying) knockBack(run, e, e.boss ? 30 : 120);
              else { e.slow = Math.max(e.slow, e.boss ? 0.15 : 0.3); e.slowT = Math.max(e.slowT, 3 + 0.5 * R); }
              if (canHit(s.ab, e)) hitEnemy(S, run, h, s.ab, e, P * hm(R));
            }
            fx(S, { k: 'wallpulse', x: h.x, y: h.y, r: 220, c: '#d8f4ff', life: 0.6 });
            return true;
          } },
      ],
    },
    duskfang: {
      id: 'duskfang', name: 'Duskfang', race: 'bat', role: 'Bat pony assassin', title: 'Shadow of the moon',
      body: '#4e4566', mane: '#c23a5a', cape: '#1c1426', accent: '#ff5c7a', crown: 'hood', batWings: true,
      range: 145, rate: 0.6, pow: 2.2, crit: 0.2, critMul: 3, speed: 195, canFly: true, canMagic: true, detects: true, fastMul: 1.5, attack: 'fang', proj: { sp: 1100, c: '#ff5c7a' },
      blurb: 'Heavy strikes on the strongest DNB in reach, with big crits. Sees stealthed DNBs.',
      aura: { kind: 'crit', r: 140, base: 0.03, per: 0.0015, name: 'Night Eyes', text: v => 'Ponies nearby see stealthed DNBs and gain +' + pct(v) + ' crit chance' },
      unlock: { moon: 40, star: 1, text: 'Earn a first star on any map' },
      abil: [
        { id: 'assassinate', name: 'Assassinate', cd: 10, icon: 'dagger', text: R => 'Strike the strongest DNB in reach for ' + (10 * hm(R)).toFixed(1) + 'x hit power. Non-boss DNBs left under 30% HP are finished off.',
          want: (S, run, h, s) => hNear(run, h.x, h.y, s.range * 1.3, e => canHit(s.ab, e)).length > 0,
          cast: (S, run, h, s, P, R) => {
            const tg = hStrong(hNear(run, h.x, h.y, s.range * 1.3, e => canHit(s.ab, e)));
            if (!tg) return false;
            hitEnemy(S, run, h, s.ab, tg, 10 * P * hm(R));
            if (tg.alive && !tg.boss && tg.hp < tg.hpMax * 0.3) kill(S, run, tg, h);
            fx(S, { k: 'bite', x: tg.x, y: tg.y, c: '#ff3a5c', life: 0.35 });
            h.face = Math.atan2(tg.y - h.y, tg.x - h.x);
            return true;
          } },
        { id: 'mark', name: 'Shadow Mark', cd: 15, icon: 'mark', text: R => 'Mark the ' + (2 + R) + ' strongest DNBs in reach for 6s: revealed, and they take +' + pct(0.25 + 0.03 * R) + ' damage.',
          want: (S, run, h, s) => { const l = hNear(run, h.x, h.y, s.range * 1.5); return l.length >= 2 || l.some(e => e.boss); },
          cast: (S, run, h, s, P, R) => {
            const l = hNear(run, h.x, h.y, s.range * 1.5).sort((a, b) => (b.boss - a.boss) || (b.hp - a.hp)).slice(0, 2 + R);
            if (!l.length) return false;
            for (const e of l) { e.hexAmp = Math.max(e.hexAmp, 0.25 + 0.03 * R); e.hexT = Math.max(e.hexT, 6); e.revealT = Math.max(e.revealT, 6); fx(S, { k: 'spark', x: e.x, y: e.y - e.r, c: '#ff5c7a', life: 0.5 }); }
            return true;
          } },
        { id: 'frenzy', name: 'Blood Frenzy', cd: 22, icon: 'moon', text: R => 'For ' + (5 + 0.5 * R) + 's Duskfang attacks 2.5x as fast with +25% crit chance.',
          want: (S, run, h, s) => { const l = hNear(run, h.x, h.y, s.range, e => canHit(s, e)); return l.length >= 3 || l.some(e => e.boss); },
          cast: (S, run, h, s, P, R) => {
            h.frenzyT = 5 + 0.5 * R;
            fx(S, { k: 'bloodmoon', x: h.x, y: h.y, r: 60, life: 0.8 });
            return true;
          } },
      ],
    },
  };
  const HERO_IDS = ['nova', 'ironmane', 'skyflick', 'duskfang'];
  function xpNeed(lv) { return Math.round(HERO_TUNE.xp0 * Math.pow(HERO_TUNE.xpGrow, lv - 1)); }
  function rankFor(lv) { let r = 1; for (const k of HERO_TUNE.ranks) if (lv >= k) r++; return r; }
  function heroProg(h, id) { id = id || h.id; let p = h.prog[id]; if (!p) p = h.prog[id] = { lv: 1, xp: 0 }; return p; }
  function heroStats(h) {
    const d = HEROES[h.id], lv = heroProg(h).lv, rs = h.rs || NO_RS, R = rankFor(lv);
    const s = {
      range: d.range * (1 + 0.015 * (lv - 1)), rate: d.rate * (1 + 0.012 * (lv - 1)), canFly: !!d.canFly, canMagic: !!d.canMagic, detects: !!d.detects, seesBurrow: false,
      flyMul: d.flyMul || 1, magicMul: 1, fastMul: d.fastMul || 1, swarmMul: 1, crit: d.crit || 0, critMul: d.critMul || 2.5, slow: 0, slowDur: 0, stunCh: 0, stunDur: 0,
      hex: 0, knock: 0, pierce: 0, cash: 1, has: {}, sigs: [], splash: d.splash || 0, lv, rank: R,
      pow: d.pow * Math.pow(HERO_TUNE.grow, lv - 1) * (1 + 0.15 * rsl(rs, 'abil_hero')),
      cdMul: (1 - 0.08 * rsl(rs, 'abil_hero')) * (1 - 0.03 * (R - 1)),
      auraR: d.aura.r + 2 * (lv - 1), auraV: (d.aura.base + d.aura.per * (lv - 1)) * (1 + 0.15 * rsl(rs, 'abil_aura')), auraKind: d.aura.kind,
    };
    const bo = h.bo, cm = h.cm;
    if (bo) { s.pow *= 1 + (bo.dmg || 0); s.rate *= 1 + (bo.rate || 0); s.range *= 1 + (bo.range || 0); }
    if (cm) { s.pow *= cm.dmg || 1; s.range *= cm.range || 1; }
    s.ab = Object.assign({}, s, { canFly: true, canMagic: true, crit: 0, flyMul: 1, fastMul: 1 });
    s.abP = Object.assign({}, s.ab, { pierce: 1 });
    s.fz = Object.assign({}, s, { crit: s.crit + 0.25 });
    return s;
  }
  function heroHome(map) {
    const P = map.route[0], o = {};
    routePos(P, P.len * 0.5, o);
    return { x: Math.max(30, Math.min(WORLD.L - 30, o.x - o.ty * 54)), y: Math.max(30, Math.min(WORLD.W - 30, o.y + o.tx * 54)) };
  }
  function ensureHero(S, h) {
    if (!h) return;
    h.isHero = true;
    if (!h.prog) h.prog = {};
    if (!isFinite(h.x) || !isFinite(h.y)) { const p = heroHome(mapOf(S)); h.x = p.x; h.y = p.y; }
    if (h.tx == null || !isFinite(h.tx)) { h.tx = h.x; h.ty = h.y; }
    if (!h.ab) h.ab = [0, 0, 0];
    for (const k of ['cd', 'stunT', 'frenzyT', 'anim', 'dmg', 'wDmg', 'kills', 'wKills', 'thinkT', 'moved', 'walk', 'lvT']) if (!isFinite(h[k])) h[k] = 0;
    if (h.face == null) h.face = 0;
    h.rs = S.research;
    h.bo = S.bonus;
    h.cm = S.cm;
    h._s = null;
  }
  function heroAt(S, x, y) {
    const h = S.hero;
    return h && h.id && (h.x - x) ** 2 + (h.y - 8 - y) ** 2 <= HERO_TUNE.pickR * HERO_TUNE.pickR;
  }
  function heroMilestone(S, id) {
    const u = HEROES[id] && HEROES[id].unlock;
    if (!u) return false;
    if (u.free) return true;
    if (u.map && mapCleared(S, u.map) >= u.wave) return true;
    if (u.map && starOf(S, u.map) > 0) return true;
    if (u.star) { for (const m of MAP_IDS) if (starOf(S, m) >= u.star) return true; }
    return false;
  }
  function heroUnlocked(S, id) { return !!HEROES[id] && (!!HEROES[id].unlock.free || !!(S.heroUnlocks && S.heroUnlocks[id])); }
  function syncHeroUnlocks(S, quiet) {
    if (!S.heroUnlocks) S.heroUnlocks = { nova: 1 };
    const got = [];
    for (const id of HERO_IDS) {
      if (S.heroUnlocks[id] || !heroMilestone(S, id)) continue;
      S.heroUnlocks[id] = 1;
      got.push(id);
      if (!quiet) emit(S, 'heroUnlock', { id, name: HEROES[id].name, how: 'milestone' });
    }
    return got;
  }
  function unlockHero(S, id) {
    const d = HEROES[id];
    if (!d || heroUnlocked(S, id)) return false;
    if ((S.moon || 0) < d.unlock.moon) return false;
    S.moon -= d.unlock.moon;
    S.heroUnlocks[id] = 1;
    emit(S, 'heroUnlock', { id, name: d.name, how: 'moon' });
    checkAch(S);
    return true;
  }
  function pickHero(S, id) {
    if (S.run || !HEROES[id] || !heroUnlocked(S, id) || chalHas(S, 'nohero')) return false;
    if (!S.hero) { const p = heroHome(mapOf(S)); S.hero = { id, x: p.x, y: p.y, auto: false, prog: {} }; }
    else S.hero.id = id;
    ensureHero(S, S.hero);
    heroProg(S.hero);
    S.buffsDirty = true;
    emit(S, 'heroPick', { id, name: HEROES[id].name });
    return true;
  }
  function moveHero(S, x, y) {
    const h = S.hero;
    if (!h || !h.id || !isFinite(x) || !isFinite(y)) return false;
    h.tx = Math.max(20, Math.min(WORLD.L - 20, x));
    h.ty = Math.max(24, Math.min(WORLD.W - 16, y));
    return true;
  }
  function heroPow(S, run, h) { return hpFor(run.n, run.map) / TUNE.hpAll * HERO_TUNE.hit * stats(h).pow; }
  function castHero(S, i) {
    const h = S.hero, run = S.run;
    if (!h || !h.id) return 'none';
    if (!run || run.over) return 'idle';
    if (h.stunT > 0) return 'stunned';
    if (h.ab[i] > 0) return 'cooldown';
    const a = HEROES[h.id].abil[i];
    if (!a) return 'none';
    const s = stats(h);
    if (!a.cast(S, run, h, s, heroPow(S, run, h), s.rank)) return 'notarget';
    h.ab[i] = a.cd * s.cdMul;
    h.anim = 0.35;
    h.casts = (h.casts || 0) + 1;
    snd(S, 'cast');
    emit(S, 'herocast', { i, name: a.name });
    return true;
  }
  function heroAuto(S) {
    const h = S.hero, run = S.run;
    if (!h || !h.id || !run || run.over || h.stunT > 0) return 0;
    const d = HEROES[h.id], s = stats(h);
    let n = 0;
    for (let i = 0; i < 3; i++) if (h.ab[i] <= 0 && d.abil[i].want(S, run, h, s) && castHero(S, i) === true) n++;
    return n;
  }
  function heroXp(S, run, e, t) {
    const h = S.hero;
    if (!h || !h.id) return;
    const p = heroProg(h);
    if (p.lv >= HERO_TUNE.maxLv) return;
    addHeroXp(S, (e.boss ? 20 : e.elite ? 3 : 1) * (1 + 0.04 * run.n) * (t === h ? 2 : 1) * (1 + 0.25 * rl(S, 'util_hero')) * (1 + bon(S, 'xp')));
  }
  function addHeroXp(S, amt) {
    const h = S.hero;
    if (!h || !h.id) return 0;
    const p = heroProg(h);
    if (p.lv >= HERO_TUNE.maxLv) return p.lv;
    p.xp += Math.max(0, +amt || 0);
    while (p.lv < HERO_TUNE.maxLv && p.xp >= xpNeed(p.lv)) {
      p.xp -= xpNeed(p.lv);
      p.lv++;
      const rankUp = HERO_TUNE.ranks.indexOf(p.lv) >= 0;
      h._s = null;
      h.lvT = 1.2;
      S.buffsDirty = true;
      emit(S, 'herolv', { lv: p.lv, rank: rankFor(p.lv), rankUp, name: HEROES[h.id].name });
      fx(S, { k: 'levelup', x: h.x, y: h.y, rank: rankUp, life: 1.2 });
      snd(S, 'levelup');
    }
    if (p.lv >= HERO_TUNE.maxLv) p.xp = 0;
    return p.lv;
  }
  function heroMove(S, dt) {
    const h = S.hero;
    if (!h || !h.id) return;
    if (h.anim > 0) h.anim -= dt;
    if (h.lvT > 0) h.lvT -= dt;
    if (h.stunT > 0) { h.stunT -= dt; return; }
    const dx = h.tx - h.x, dy = h.ty - h.y, dd = Math.hypot(dx, dy);
    if (dd > 0.5) {
      const mv = Math.min(dd, HEROES[h.id].speed * dt);
      h.x += dx / dd * mv; h.y += dy / dd * mv;
      h.face = Math.atan2(dy, dx);
      h.walk += dt;
      h.moving = true;
      h.moved += mv;
      if (h.moved > 14) { h.moved = 0; S.buffsDirty = true; }
    } else if (h.moving) { h.moving = false; h.moved = 0; S.buffsDirty = true; }
  }
  function heroAuraSlow(S, run) {
    const h = S.hero;
    if (!h || !h.id || HEROES[h.id].aura.kind !== 'slow') return;
    const s = stats(h), R2 = s.auraR * s.auraR;
    for (const e of run.enemies) if (e.alive && dist2(e, h) <= R2) e.wallSlow = Math.max(e.wallSlow, e.boss ? s.auraV * 0.5 : s.auraV);
  }
  function canRoar(e) {
    if (!e.boss || e.splitDone) return false;
    if (e.tk) return !!(e.tk.stages || e.tk.sprint || e.tk.twin);
    return e.trick === 'sprint' || e.trick === 'mother';
  }
  function heroStep(S, run, dt) {
    const h = S.hero;
    if (!h || !h.id) return;
    const d = HEROES[h.id], s = stats(h);
    for (let i = 0; i < 3; i++) if (h.ab[i] > 0) h.ab[i] -= dt;
    if (h.frenzyT > 0) h.frenzyT -= dt;
    if (run.zones && run.zones.length) {
      const P = heroPow(S, run, h);
      for (let i = run.zones.length - 1; i >= 0; i--) {
        const z = run.zones[i];
        z.t += dt; z.tick -= dt;
        const pulse = z.tick <= 0;
        if (pulse) z.tick += 0.5;
        for (const e of hNear(run, z.x, z.y, z.r, o => !o.flying)) {
          e.unearthT = 0.3;
          if (pulse) { e.slow = Math.max(e.slow, e.boss ? 0.2 : 0.4); e.slowT = Math.max(e.slowT, 0.6); if (canHit(s.ab, e)) hitEnemy(S, run, h, s.abP, e, P * z.mul); }
        }
        if (z.t >= z.life) run.zones.splice(i, 1);
      }
    }
    for (const e of run.enemies) {
      if (!canRoar(e) || !e.alive || !tick(e, 'roar', HERO_TUNE.roarEvery, dt)) continue;
      fx(S, { k: 'roar', x: e.x, y: e.y, r: HERO_TUNE.roarR, life: 0.7 });
      snd(S, 'roar');
      if (dist2(e, h) <= HERO_TUNE.roarR * HERO_TUNE.roarR && !(h.stunT > 0)) {
        h.stunT = HERO_TUNE.roarStun * (d.stunCut || 1);
        h.stuns = (h.stuns || 0) + 1;
        snd(S, 'herostun');
        emit(S, 'herostun', { name: e.name, dur: h.stunT });
      }
    }
    if (h.stunT > 0) return;
    if (h.auto) { h.thinkT -= dt; if (h.thinkT <= 0) { h.thinkT = HERO_TUNE.think; heroAuto(S); } }
    h.cd -= dt;
    if (h.cd > 0) return;
    const fz = h.frenzyT > 0;
    const targets = targetsFor(run, h, s);
    if (!targets.length) { h.cd = 0; return; }
    h.cd += 1 / (s.rate * (fz ? 2.5 : 1));
    if (h.cd < 0) h.cd = 0;
    const P = heroPow(S, run, h);
    const hs = fz ? s.fz : s;
    h.anim = 0.22;
    if (d.attack === 'stomp') {
      for (const e of targets) hitEnemy(S, run, h, hs, e, P);
      fx(S, { k: 'stomp', x: h.x, y: h.y, r: s.range, c: '#e0a86a', life: 0.35 });
      return;
    }
    const e = d.attack === 'fang' ? hStrong(targets) : pick(targets, 'first', h);
    h.face = Math.atan2(e.y - h.y, e.x - h.x);
    run.proj.push({ x: h.x, y: h.y - 22, e, t: h, dmg: P, sp: d.proj.sp, kind: 'hero', c: d.proj.c, hk: h.id, life: 3, a: 0, fz });
  }
  function heroProjHit(S, run, p) {
    const h = p.t, e = p.e;
    if (S.hero !== h || !h.id || !e.alive) return;
    const s = stats(h), hs = p.fz ? s.fz : s;
    hitEnemy(S, run, h, hs, e, p.dmg);
    if (s.splash > 0) {
      fx(S, { k: 'ring', x: p.x, y: p.y, r: s.splash, c: p.c, life: 0.3 });
      for (const o of run.enemies) if (o !== e && canHit(s, o) && dist2(o, p) <= s.splash * s.splash) hitEnemy(S, run, h, s, o, p.dmg * 0.5);
    }
  }
  function heroInfo(S) {
    const h = S.hero;
    if (!h || !h.id) return null;
    const d = HEROES[h.id], p = heroProg(h), s = stats(h);
    return {
      id: h.id, def: d, lv: p.lv, xp: p.xp, need: p.lv >= HERO_TUNE.maxLv ? 0 : xpNeed(p.lv), max: p.lv >= HERO_TUNE.maxLv, rank: s.rank,
      nextRank: HERO_TUNE.ranks.find(k => k > p.lv) || 0, range: s.range, rate: s.rate, auraR: s.auraR, auraV: s.auraV, auraText: d.aura.text(s.auraV),
      stunT: h.stunT, frenzyT: h.frenzyT, auto: !!h.auto, dmg: h.dmg, kills: h.kills,
      abil: d.abil.map((a, i) => ({ key: 'QWE'[i], id: a.id, name: a.name, icon: a.icon, text: a.text(s.rank), cd: a.cd * s.cdMul, left: Math.max(0, h.ab[i]), ready: h.ab[i] <= 0 })),
    };
  }
  function cleanHero(src) {
    if (!src || typeof src !== 'object' || !HEROES[src.id]) return null;
    const h = { id: src.id, x: +src.x, y: +src.y, auto: !!src.auto, prog: {} };
    if (!isFinite(h.x) || !isFinite(h.y)) { h.x = NaN; h.y = NaN; }
    else { h.x = Math.max(20, Math.min(WORLD.L - 20, h.x)); h.y = Math.max(24, Math.min(WORLD.W - 16, h.y)); }
    if (src.prog && typeof src.prog === 'object') for (const id of HERO_IDS) {
      const p = src.prog[id];
      if (p && typeof p === 'object') h.prog[id] = { lv: Math.max(1, Math.min(HERO_TUNE.maxLv, p.lv | 0 || 1)), xp: Math.max(0, +p.xp || 0) };
    }
    return h;
  }
  function serHero(h) {
    if (!h || !h.id) return null;
    const prog = {};
    for (const id in h.prog) prog[id] = { lv: h.prog[id].lv, xp: Math.round(h.prog[id].xp * 100) / 100 };
    return { id: h.id, x: Math.round(h.tx != null ? h.tx : h.x), y: Math.round(h.ty != null ? h.ty : h.y), auto: !!h.auto, prog };
  }
  function cleanUnlocks(o) {
    const out = { nova: 1 };
    if (o && typeof o === 'object') for (const id of HERO_IDS) if (o[id]) out[id] = 1;
    return out;
  }

  function step(S, dt) {
    S.time += dt;
    for (let i = S.fx.length - 1; i >= 0; i--) { const f = S.fx[i]; f.t += dt; if (f.t >= f.life) S.fx.splice(i, 1); }
    for (const t of S.towers) { if (t.anim > 0) t.anim -= dt; if (t.surgeT > 0) t.surgeT -= dt; }
    heroMove(S, dt);
    if (S.buffsDirty) refreshBuffs(S);
    const run = S.run;
    if (!run || run.over) return;
    run.t += dt;
    if (S.records) S.records.time += dt;
    if (!run.queue.length && !run.enrage && run.t > run.enrageAt) { run.enrage = true; emit(S, 'enrage', {}); }
    while (run.queue.length && run.queue[0].t <= run.t) { const it = run.queue.shift(); const o = it.route != null ? { path: it.route, quiet: !!it.twin } : {}; if (it.elite) o.elite = true; if (it.xb) o.xb = true; spawnEnemy(S, run, it.type, undefined, o); }
    if (run.map.wind) windStep(S, run, dt);

    for (const e of run.enemies) { e.quag = false; e.wallSlow = 0; }
    for (const t of S.towers) {
      const s = stats(t);
      if (s.has.quagmire) for (const e of run.enemies) if (e.alive && !e.flying && inRange(t, e, s.range)) e.quag = true;
      if (s.wall > 0) {
        const W = t.wallPt || (t.wallPt = nearestOnMap(run.map, t.x, t.y));
        const R2 = s.wallR * s.wallR;
        for (const e of run.enemies) if (e.alive && !e.flying && dist2(e, W) <= R2) e.wallSlow = Math.max(e.wallSlow, e.boss ? s.wall * 0.5 : s.wall);
      }
    }

    heroAuraSlow(S, run);
    for (const e of run.enemies) if (e.alive) enemyUpdate(S, run, e, dt);
    shieldRegen(run, dt);
    revealStep(S, run);

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
    heroStep(S, run, dt);

    for (let i = run.proj.length - 1; i >= 0; i--) {
      const p = run.proj[i];
      p.life -= dt;
      const e = p.e;
      if (!e.alive || p.life <= 0 || (e.burrowT > 0 && !stats(p.t).seesBurrow && !(e.unearthT > 0))) { run.proj.splice(i, 1); continue; }
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy), mv = p.sp * dt;
      if (d <= mv + e.r * 0.5) { p.x = e.x; p.y = e.y; run.proj.splice(i, 1); projHit(S, run, p); }
      else { p.x += dx / d * mv; p.y += dy / d * mv; p.a = Math.atan2(dy, dx); }
    }

    run.enemies = run.enemies.filter(e => e.alive);

    if (run.lives <= 0) {
      run.over = 'lost';
      if (!S.chal) trackIncome(S, run.earned, run.t);
      emit(S, 'lost', { n: run.n, earned: run.earned });
      S.run = null;
      if (S.chal) { S.chal.t += run.t; S.chal.lives = 0; chalFinish(S, 'lost'); }
      else checkAch(S);
      return;
    }
    if (!run.queue.length && !run.enemies.length) {
      run.over = 'won';
      let bonus = 0, moon = 0, interest = 0;
      if (run.n > S.cleared) {
        bonus = Math.round(clearBonus(run.n, run.map) * (run.clearMul || 1)); S.cash += bonus; S.cleared = run.n;
        if (S.records) S.records.firsts[run.n] = { at: Math.round(S.records.time), att: S.records.att, lives: run.lives };
        if (run.star >= 1 && run.spec.boss) moon = grantMoon(S, (run.star + rl(S, 'util_star')) * moonMul(S));
      }
      const iv = rl(S, 'eco_interest');
      if (iv) { interest = Math.min(Math.max(0, S.cash) * 0.01 * iv, clearBonus(run.n, run.map) * 0.5 * iv); S.cash += interest; }
      if (S.records) S.records.wins++;
      if (S.farm && run.lives >= run.livesMax) {
        const val = boardValue(S.towers);
        if (run.n > S.farm.safe || (run.n === S.farm.safe && (!S.farm.val || val < S.farm.val))) { S.farm.safe = run.n; S.farm.val = val; S.farm.secs = Math.round(run.t * 10) / 10; }
      }
      if (!S.chal) trackIncome(S, run.earned + bonus + interest, run.t);
      if (bonus && !S.chal) syncHeroUnlocks(S);
      S.stats.waves = (S.stats.waves || 0) + 1;
      const bossWave = !!(run.spec.boss || run.xboss);
      if (bossWave && run.lives >= run.lives0) feat(S, 'c_flaw');
      if (run.lives === 1 && run.lives0 > 1) feat(S, 'c_clutch');
      if (!S.towers.length && S.hero && S.hero.id && run.kills > 0) feat(S, 'x_lone');
      if (bossWave && S.settings && S.settings.speed >= 4) feat(S, 'x_fast');
      emit(S, 'won', { n: run.n, bonus, earned: run.earned, fresh: bonus > 0, lives: run.lives, moon, interest });
      S.run = null;
      if (S.chal) { const c = S.chal; c.lives = run.lives; c.t += run.t; c.waves++; if (run.n >= c.to) chalFinish(S, 'won'); }
      checkAch(S);
    }
  }

  function grantMoon(S, amt) {
    const g = Math.max(0, Math.round(amt));
    S.moon = (S.moon || 0) + g; S.moonTotal = (S.moonTotal || 0) + g;
    if (S.stats) S.stats.moonEarned = (S.stats.moonEarned || 0) + g;
    return g;
  }
  function canStarUp(S) { return !S.run && !S.chal && S.cleared >= MAX_WAVE && starOf(S) < MAX_STARS; }
  function starUpGain(S, id) {
    id = id || S.map;
    const m = MAPS[id], next = Math.min(MAX_STARS, starOf(S, id) + 1);
    return Math.round(STAR.moon * next * (1 + STAR.mapMoon * (m.order - 1)) * moonMul(S));
  }
  function skipFor(S) { return Math.min(9, 3 * rl(S, 'util_skip')); }
  function skipCash(S, map, k, star) {
    let c = 0;
    for (let n = 1; n <= k; n++) c += clearBonus(n, map) * clearMul(S, star) + killCash(n, map) * killMul(S, star) * waveSpec(n, map).list.length;
    return Math.round(c);
  }
  function starUp(S) {
    if (!canStarUp(S)) return null;
    const id = S.map, map = mapOf(S);
    const gain = starUpGain(S, id);
    S.presets[id] = S.towers.map(t => ({ race: t.race, x: t.x, y: t.y }));
    const star = starOf(S, id) + 1;
    S.stars[id] = star;
    grantMoon(S, gain);
    const keep = S.records ? S.records.bosses : {};
    const b = newBoard(map, S);
    b.records.bosses = keep;
    const k = skipFor(S);
    if (k) { b.cleared = k; b.sel = k + 1; b.cash += skipCash(S, map, k, star); }
    if (S.hero && S.hero.id) b.hero = { id: S.hero.id, x: S.hero.tx, y: S.hero.ty, auto: !!S.hero.auto, prog: {} };
    for (const key of BOARD_KEYS) S[key] = b[key];
    S.fx.length = 0;
    prepTowers(S);
    syncHeroUnlocks(S);
    S.stats.starUps = (S.stats.starUps || 0) + 1;
    emit(S, 'starup', { id, star, gain, skip: k });
    checkAch(S);
    snd(S, 'starup');
    fx(S, { k: 'starup', x: WORLD.L / 2, y: WORLD.W / 2, star, life: 2.4 });
    return { id, star, gain, skip: k };
  }
  function presetOf(S, id) { return (S.presets && S.presets[id || S.map]) || []; }
  function placePreset(S) {
    if (S.run || !rl(S, 'util_auto')) return 0;
    let n = 0;
    for (const p of presetOf(S)) {
      if (!RACES[p.race] || !canPlace(S, p.x, p.y)) continue;
      if (S.cash < nextTowerCost(S, p.race)) continue;
      if (placeTower(S, p.race, p.x, p.y)) n++;
    }
    return n;
  }
  const OFFLINE = { cap: 8 * 3600, capStep: 2 * 3600, eff: 0.2, boost: 0.2, side: 0.25, min: 60, overhead: 6, walk: 0.5, waveDrop: 1.2, decay: 0.85, minT: 60, floor: 0.85 };
  const SLOT_BASE = 3, SLOT_BONUS = 2, SLOT_MAX = 5;
  const RULE_KINDS = ['dmg', 'rate', 'path', 'cheap'];
  const RULE_TICKS = ['end', 'sec', 'both'];
  const RESERVES = [0, 10, 20, 30, 50];
  const RULE_MAX = 8;

  function trackIncome(S, gain, t) {
    const f = S.farm;
    if (!f || !isFinite(gain) || !isFinite(t)) return;
    f.inG = (f.inG || 0) * OFFLINE.decay + Math.max(0, gain);
    f.inT = (f.inT || 0) * OFFLINE.decay + Math.max(0, t) + OFFLINE.overhead;
  }
  function incomeRate(f) { return f && f.inT >= OFFLINE.minT ? f.inG / f.inT : 0; }
  function boardValue(towers) { let v = 0; for (const t of towers || []) v += +t.spent || 0; return v; }
  function farmTarget(S) {
    const f = S.farm || newFarm();
    const n = f.pick > 0 ? f.pick : (f.safe > 0 ? f.safe : S.cleared);
    return Math.max(1, Math.min(topWave(S), n));
  }
  function setFarm(S, on, pick) {
    if (!S.farm) S.farm = newFarm();
    const f = S.farm;
    if (pick != null) f.pick = Math.max(0, Math.min(MAX_WAVE, pick | 0));
    f.on = !!on;
    f.fails = 0;
    if (f.on) S.auto = false;
    emit(S, 'farm', { on: f.on, wave: farmTarget(S) });
    return f;
  }
  function farmResult(S, ev) {
    const f = S.farm;
    if (!f || !f.on || !ev) return null;
    if (ev.type === 'won') { f.fails = 0; f.runs++; return { next: farmTarget(S) }; }
    if (ev.type !== 'lost') return null;
    f.fails++;
    if (f.fails < 2) return { next: farmTarget(S), retry: true };
    const drop = Math.max(1, (ev.n | 0) - 1);
    f.on = false;
    f.fails = 0;
    if (f.pick > 0) f.pick = drop;
    f.safe = Math.min(f.safe > 0 ? f.safe : drop, drop);
    S.sel = Math.min(drop, topWave(S));
    emit(S, 'farmStop', { n: ev.n, drop });
    return { stop: true, drop };
  }
  function safeWave(S, b) {
    if (!b || !b.towers || !b.towers.length || !b.cleared) return 0;
    const f = b.farm || newFarm();
    let n = Math.min(b.cleared, Math.max(f.safe | 0, Math.floor(b.cleared * OFFLINE.floor)));
    const val = boardValue(b.towers);
    if (f.val > 0 && val < f.val) n -= Math.ceil(Math.log(f.val / Math.max(1, val)) / Math.log(OFFLINE.waveDrop));
    return Math.max(0, Math.min(MAX_WAVE, n));
  }
  function farmCash(S, n, map, star) {
    const spec = waveSpec(n, map);
    const boss = 1 + 0.25 * rl(S, 'eco_boss');
    let c = 0;
    for (const e of spec.list) {
      const d = ENEMIES[e.type];
      if (!d) continue;
      c += d.cash * (e.elite ? ELITE.cash : 1) * (e.type === 'boss' ? boss : 1);
      if (d.split && ENEMIES[d.split.type]) c += d.split.n * ENEMIES[d.split.type].cash;
    }
    return c * killCash(n, map) * killMul(S, star);
  }
  function farmTime(n, map, star) {
    const spec = waveSpec(n, map);
    const spawn = spec.duration * (star >= 2 ? STAR.swift : 1);
    const walk = map.maxLen / (ENEMIES.basic.speed * starSpeedMul(star)) * OFFLINE.walk;
    return spawn + walk + OFFLINE.overhead;
  }
  function offlineMul(S) { return 1 + OFFLINE.boost * rl(S, 'eco_offline'); }
  function offlineCap(S) { return OFFLINE.cap + OFFLINE.capStep * rl(S, 'util_offline'); }
  function farmRate(S, id) {
    id = id || S.map;
    const b = boardOf(S, id), map = MAPS[id];
    if (!b || !map) return { wave: 0, rate: 0, cash: 0, time: 0 };
    const n = safeWave(S, b);
    if (n < 1) return { wave: 0, rate: 0, cash: 0, time: 0 };
    const star = starOf(S, id);
    const f = b.farm || newFarm();
    const cash = farmCash(S, n, map, star), time = f.secs > 0 && n === f.safe ? f.secs + OFFLINE.overhead : farmTime(n, map, star);
    const inc = incomeRate(f), raw = cash / time;
    const base = inc > 0 ? Math.min(raw, inc) : raw;
    return { wave: n, cash, time, raw, inc, rate: base * OFFLINE.eff * offlineMul(S) };
  }
  function touchSeen(S, now) {
    if (isFinite(now) && now > (S.lastSeen || 0)) S.lastSeen = Math.floor(now);
    return S.lastSeen;
  }
  function offlineGain(S, now, from) {
    if (from == null) from = S.lastSeen;
    if (!(from > 0) || !isFinite(now) || now <= from) return null;
    const away = (now - from) / 1000;
    const cap = offlineCap(S), secs = Math.min(away, cap);
    const maps = [];
    let total = 0;
    for (const id of MAP_IDS) {
      const fr = farmRate(S, id);
      if (!fr.rate) continue;
      const share = id === S.map ? 1 : OFFLINE.side;
      const cash = Math.floor(fr.rate * share * secs);
      if (cash <= 0) continue;
      maps.push({ id, name: MAPS[id].name, wave: fr.wave, rate: fr.rate * share, cash, active: id === S.map });
      total += cash;
    }
    return { away, secs, cap, capped: away > cap, maps, total, from, now };
  }
  function applyOffline(S, g) {
    if (!g) return 0;
    for (const m of g.maps) {
      if (m.id === S.map) S.cash += m.cash;
      else if (S.boards[m.id]) S.boards[m.id].cash += m.cash;
    }
    S.stats.earned += g.total;
    S.stats.playOffline = (S.stats.playOffline || 0) + (g.secs || 0);
    touchSeen(S, g.now);
    if (g.total > 0) feat(S, 'e_off');
    emit(S, 'offline', { total: g.total, secs: g.secs });
    checkAch(S);
    return g.total;
  }

  function newRules() { return { on: false, tick: 'both', reserve: 0, race: {}, pony: {} }; }
  function cleanRule(r) {
    if (!r || typeof r !== 'object' || RULE_KINDS.indexOf(r.k) < 0) return null;
    if (r.k === 'dmg' || r.k === 'rate') return { k: r.k, to: Math.max(0, Math.min(99, r.to | 0)) };
    if (r.k === 'cheap') return { k: 'cheap' };
    const a = Math.max(0, Math.min(4, r.a | 0)), an = Math.max(1, Math.min(10, r.an | 0 || 10));
    let b = r.b == null ? -1 : r.b | 0;
    if (b < 0 || b > 4 || b === a) b = -1;
    const bn = b < 0 ? 0 : Math.max(1, Math.min(10, r.bn | 0 || 10));
    return { k: 'path', a, an, b, bn };
  }
  function cleanRuleList(l) { return Array.isArray(l) ? l.map(cleanRule).filter(Boolean).slice(0, RULE_MAX) : []; }
  function cleanRules(o) {
    const out = newRules();
    if (!o || typeof o !== 'object') return out;
    out.on = !!o.on;
    if (RULE_TICKS.indexOf(o.tick) >= 0) out.tick = o.tick;
    out.reserve = Math.max(0, Math.min(90, Math.round(+o.reserve || 0)));
    if (o.race && typeof o.race === 'object') for (const r of RACE_IDS) { const l = cleanRuleList(o.race[r]); if (l.length) out.race[r] = l; }
    if (o.pony && typeof o.pony === 'object') for (const k in o.pony) { const id = k | 0; if (id > 0 && Array.isArray(o.pony[k])) out.pony[id] = cleanRuleList(o.pony[k]); }
    return out;
  }
  function rulesFor(S, t) {
    const R = S.rules;
    if (!R || !t) return [];
    if (R.pony && R.pony[t.id]) return R.pony[t.id];
    return (R.race && R.race[t.race]) || [];
  }
  function setRules(S, scope, key, list) {
    if (!S.rules) S.rules = newRules();
    const R = S.rules;
    if (scope === 'race' && RACES[key]) { const l = cleanRuleList(list); if (l.length) R.race[key] = l; else delete R.race[key]; return true; }
    if (scope === 'pony') {
      const id = key | 0;
      if (!id) return false;
      if (list == null) delete R.pony[id]; else R.pony[id] = cleanRuleList(list);
      return true;
    }
    return false;
  }
  function ruleText(r, race) {
    if (!r) return '';
    if (r.k === 'dmg') return 'Buy Damage' + (r.to ? ' to Lv ' + r.to : '') + ' when affordable';
    if (r.k === 'rate') return 'Buy Rate' + (r.to ? ' to Lv ' + r.to : '') + ' when affordable';
    if (r.k === 'cheap') return 'Buy the cheapest upgrade';
    const P = PATHS[race] || [];
    const nm = i => (P[i] && P[i].name) || 'Path ' + (i + 1);
    let s = 'Follow ' + nm(r.a) + ' to node ' + r.an;
    if (r.b >= 0) s += ', then ' + nm(r.b) + ' to node ' + r.bn;
    return s;
  }
  function ruleAction(t, r) {
    if (!r || !t) return null;
    if (r.k === 'dmg' || r.k === 'rate') {
      const lv = r.k === 'dmg' ? t.infD : t.infR;
      if (r.to && lv >= r.to) return null;
      return { kind: 'inf', which: r.k, cost: infNext(t, r.k) };
    }
    if (r.k === 'cheap') return upgradeOptions(t)[0] || null;
    if (r.k === 'path') {
      for (const [i, n] of [[r.a, r.an], [r.b, r.bn]]) {
        if (i < 0 || i > 4 || !n || t.paths[i] >= n) continue;
        const st = pathState(t, i);
        if (st === 'locked' || st === 'maxed') return null;
        return { kind: 'node', i, cost: nextNodeCost(t, i) };
      }
    }
    return null;
  }
  function runRules(S, why) {
    const R = S.rules;
    const res = { count: 0, spent: 0 };
    if (!R || !R.on || !S.towers.length) return res;
    if (why === 'end' && R.tick === 'sec') return res;
    if (why === 'sec' && R.tick === 'end') return res;
    const keep = Math.max(0, S.cash) * (R.reserve || 0) / 100;
    for (let guard = 0; guard < 400; guard++) {
      let best = null;
      for (const t of S.towers) {
        const list = rulesFor(S, t);
        for (let p = 0; p < list.length; p++) {
          const a = ruleAction(t, list[p]);
          if (!a || !isFinite(a.cost) || S.cash - a.cost < keep) continue;
          if (!best || p < best.p || (p === best.p && a.cost < best.a.cost)) best = { t, a, p };
          break;
        }
      }
      if (!best) break;
      const ok = best.a.kind === 'node' ? buyNode(S, best.t, best.a.i) : buyInf(S, best.t, best.a.which);
      if (!ok) break;
      best.t.anim = 0.3;
      res.count++;
      res.spent += best.a.cost;
    }
    if (res.count) emit(S, 'rules', { count: res.count, spent: res.spent, why: why || '' });
    return res;
  }

  function slotCount(S) { return SLOT_BASE + (rl(S, 'util_auto') ? SLOT_BONUS : 0); }
  function slotsOf(S, id) {
    id = id || S.map;
    if (!S.slots) S.slots = {};
    if (!S.slots[id]) S.slots[id] = [];
    return S.slots[id];
  }
  function cleanName(s) { return String(s == null ? '' : s).replace(/[<>&"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24); }
  function snapTower(t) { return { race: t.race, x: Math.round(t.x), y: Math.round(t.y), paths: t.paths.slice(0, 5), infD: t.infD | 0, infR: t.infR | 0, mode: t.mode || 'first' }; }
  function planCost(items, pm) {
    const cnt = {};
    let c = 0;
    for (const it of items) {
      const k = cnt[it.race] || 0;
      cnt[it.race] = k + 1;
      c += towerCost(it.race, k, pm);
      for (let p = 0; p < 5; p++) for (let l = 0; l < it.paths[p]; l++) c += nodeCost(it.race, l, pm);
      for (let l = 0; l < it.infD; l++) c += Math.round(infCost(it.race, l) * pm);
      for (let l = 0; l < it.infR; l++) c += Math.round(infCost(it.race, l) * pm);
    }
    return c;
  }
  function savePreset(S, i, name, now) {
    i = i | 0;
    if (i < 0 || i >= slotCount(S) || !S.towers.length) return null;
    const list = slotsOf(S);
    const h = S.hero && S.hero.id ? { id: S.hero.id, x: Math.round(S.hero.tx != null ? S.hero.tx : S.hero.x), y: Math.round(S.hero.ty != null ? S.hero.ty : S.hero.y) } : null;
    const towers = S.towers.map(snapTower);
    const slot = { name: cleanName(name) || 'Plan ' + (i + 1), towers, hero: h, at: Math.floor(+now || 0), cleared: S.cleared, cost: planCost(towers, priceOf(mapOf(S))) };
    while (list.length <= i) list.push(null);
    list[i] = slot;
    emit(S, 'slotSaved', { i, name: slot.name });
    return slot;
  }
  function deletePreset(S, i) {
    const list = slotsOf(S);
    if (!list[i]) return false;
    list[i] = null;
    while (list.length && !list[list.length - 1]) list.pop();
    return true;
  }
  function renamePreset(S, i, name) {
    const sl = slotsOf(S)[i], nm = cleanName(name);
    if (!sl || !nm) return false;
    sl.name = nm;
    return true;
  }
  function loadPreset(S, i) {
    const sl = slotsOf(S)[i];
    if (!sl || i >= slotCount(S)) return null;
    S.build = {
      slot: i, name: sl.name,
      items: sl.towers.map(it => ({ race: it.race, x: it.x, y: it.y, paths: it.paths.slice(), infD: it.infD, infR: it.infR, mode: it.mode })),
      ids: sl.towers.map(() => 0), skip: sl.towers.map(() => 0),
      hero: sl.hero ? { id: sl.hero.id, x: sl.hero.x, y: sl.hero.y } : null, heroDone: !sl.hero,
    };
    emit(S, 'buildStart', { name: sl.name, i });
    buildStep(S);
    return S.build;
  }
  function cancelBuild(S) { if (!S.build) return false; S.build = null; return true; }
  function buildTowers(S) { const m = {}; for (const t of S.towers) m[t.id] = t; return m; }
  function buildPending(S) {
    const B = S.build, out = [];
    if (!B) return out;
    const by = buildTowers(S);
    B.items.forEach((it, i) => {
      if (B.skip[i]) return;
      const t = B.ids[i] ? by[B.ids[i]] : null;
      if (!t) { out.push({ kind: 'place', i, cost: nextTowerCost(S, it.race) }); return; }
      for (let p = 0; p < 5; p++) {
        if (t.paths[p] >= it.paths[p]) continue;
        const st = pathState(t, p);
        if (st === 'locked' || st === 'maxed') continue;
        out.push({ kind: 'node', i, t, p, cost: nextNodeCost(t, p) });
      }
      if (t.infD < it.infD) out.push({ kind: 'inf', i, t, which: 'dmg', cost: infNext(t, 'dmg') });
      if (t.infR < it.infR) out.push({ kind: 'inf', i, t, which: 'rate', cost: infNext(t, 'rate') });
    });
    return out.sort((a, b) => a.cost - b.cost || a.i - b.i);
  }
  function buildAdopt(S) {
    const B = S.build, by = buildTowers(S), used = {};
    for (const id of B.ids) if (id && by[id]) used[id] = 1;
    B.items.forEach((it, i) => {
      if (B.skip[i] || (B.ids[i] && by[B.ids[i]])) return;
      B.ids[i] = 0;
      for (const t of S.towers) {
        if (used[t.id] || t.race !== it.race || (t.x - it.x) ** 2 + (t.y - it.y) ** 2 > 100) continue;
        B.ids[i] = t.id;
        used[t.id] = 1;
        break;
      }
      if (!B.ids[i] && !canPlace(S, it.x, it.y)) B.skip[i] = 1;
    });
  }
  function buildStep(S, limit) {
    const B = S.build;
    if (!B) return 0;
    if (!B.heroDone && !S.run) {
      const h = B.hero;
      if (h && heroUnlocked(S, h.id)) {
        if (!S.hero || S.hero.id !== h.id) pickHero(S, h.id);
        moveHero(S, h.x, h.y);
      }
      B.heroDone = true;
    }
    buildAdopt(S);
    let n = 0;
    for (let g = 0; g < (limit || 400); g++) {
      const a = buildPending(S)[0];
      if (!a || a.cost > S.cash) break;
      let ok = false;
      if (a.kind === 'place') {
        const it = B.items[a.i];
        if (!canPlace(S, it.x, it.y)) { B.skip[a.i] = 1; continue; }
        const t = placeTower(S, it.race, it.x, it.y);
        if (t) { t.mode = it.mode || 'first'; B.ids[a.i] = t.id; ok = true; }
      } else if (a.kind === 'node') ok = buyNode(S, a.t, a.p);
      else ok = buyInf(S, a.t, a.which);
      if (!ok) break;
      n++;
    }
    if (n) emit(S, 'buildBuy', { count: n });
    if (!buildPending(S).length) {
      const name = B.name;
      S.build = null;
      emit(S, 'buildDone', { name });
    }
    return n;
  }
  function buildProgress(S) {
    const B = S.build;
    if (!B) return null;
    const by = buildTowers(S);
    let total = 0, done = 0, placed = 0, skipped = 0;
    const sum = a => a.reduce((x, y) => x + y, 0);
    B.items.forEach((it, i) => {
      const steps = 1 + sum(it.paths) + it.infD + it.infR;
      total += steps;
      if (B.skip[i]) { done += steps; skipped++; return; }
      const t = B.ids[i] ? by[B.ids[i]] : null;
      if (!t) return;
      placed++;
      let d = 1 + Math.min(t.infD, it.infD) + Math.min(t.infR, it.infR);
      for (let p = 0; p < 5; p++) d += Math.min(t.paths[p], it.paths[p]);
      done += d;
    });
    const next = buildPending(S)[0];
    return { name: B.name, slot: B.slot, done, total, left: total - done, pct: total ? done / total : 1, placed, skipped, towers: B.items.length, next: next ? next.cost : 0, nextKind: next ? next.kind : '' };
  }
  function cleanFarm(src, cleared) {
    const f = newFarm();
    if (!src || typeof src !== 'object') { f.safe = cleared; return f; }
    f.on = !!src.on;
    f.pick = Math.max(0, Math.min(MAX_WAVE, src.pick | 0));
    f.fails = Math.max(0, Math.min(1, src.fails | 0));
    f.safe = Math.max(0, Math.min(cleared, src.safe | 0));
    f.val = Math.max(0, +src.val || 0);
    f.secs = Math.max(0, Math.min(3600, +src.secs || 0));
    f.inG = Math.max(0, +src.inG || 0);
    f.inT = Math.max(0, Math.min(1e6, +src.inT || 0));
    if (!isFinite(f.inG)) f.inG = 0;
    f.runs = Math.max(0, src.runs | 0);
    return f;
  }
  function cleanItem(it) {
    if (!it || !RACES[it.race] || !isFinite(it.x) || !isFinite(it.y)) return null;
    const paths = (Array.isArray(it.paths) ? it.paths : []).slice(0, 5).map(v => Math.max(0, Math.min(10, v | 0)));
    while (paths.length < 5) paths.push(0);
    let n = 0;
    for (let p = 0; p < 5; p++) { if (paths[p] > 0) n++; if (n > 2) paths[p] = 0; }
    return { race: it.race, x: Math.round(+it.x), y: Math.round(+it.y), paths, infD: Math.max(0, Math.min(99, it.infD | 0)), infR: Math.max(0, Math.min(99, it.infR | 0)), mode: typeof it.mode === 'string' ? it.mode.slice(0, 12) : 'first' };
  }
  function cleanSlotHero(h) { return h && HEROES[h.id] && isFinite(h.x) && isFinite(h.y) ? { id: h.id, x: Math.round(+h.x), y: Math.round(+h.y) } : null; }
  function cleanSlot(sl) {
    if (!sl || typeof sl !== 'object' || !Array.isArray(sl.towers)) return null;
    const towers = sl.towers.map(cleanItem).filter(Boolean).slice(0, 400);
    if (!towers.length) return null;
    return { name: cleanName(sl.name) || 'Plan', towers, hero: cleanSlotHero(sl.hero), at: Math.max(0, Math.floor(+sl.at || 0)), cleared: Math.max(0, Math.min(MAX_WAVE, sl.cleared | 0)), cost: Math.max(0, +sl.cost || 0) };
  }
  function cleanSlots(o) {
    const out = {};
    if (!o || typeof o !== 'object') return out;
    for (const id of MAP_IDS) {
      if (!Array.isArray(o[id])) continue;
      const l = o[id].slice(0, SLOT_MAX).map(cleanSlot);
      while (l.length && !l[l.length - 1]) l.pop();
      if (l.length) out[id] = l;
    }
    return out;
  }
  function cleanBuild(src) {
    if (!src || typeof src !== 'object' || !Array.isArray(src.items)) return null;
    const items = [], ids = [], skip = [];
    src.items.forEach((it, i) => {
      const c = cleanItem(it);
      if (!c) return;
      items.push(c);
      ids.push(Math.max(0, (src.ids || [])[i] | 0));
      skip.push((src.skip || [])[i] ? 1 : 0);
    });
    if (!items.length) return null;
    return { slot: Math.max(0, Math.min(SLOT_MAX - 1, src.slot | 0)), name: cleanName(src.name) || 'Plan', items, ids, skip, hero: cleanSlotHero(src.hero), heroDone: !!src.heroDone };
  }

  function researchCost(id, lv) {
    const r = RESEARCH_BY_ID[id];
    if (!r || lv >= r.max) return Infinity;
    return Math.round(r.base * Math.pow(1.7, lv));
  }
  function researchTotal() { let c = 0; for (const r of RESEARCH) for (let l = 0; l < r.max; l++) c += researchCost(r.id, l); return c; }
  function researchState(S, id) {
    const r = RESEARCH_BY_ID[id];
    if (!r) return 'locked';
    const lv = rl(S, id);
    if (lv >= r.max) return 'maxed';
    for (const q of r.req) if (!rl(S, q)) return 'locked';
    return (S.moon || 0) + (S.rp || 0) >= researchCost(id, lv) ? 'afford' : 'open';
  }
  function buyResearch(S, id) {
    if (S.chal || researchState(S, id) !== 'afford') return false;
    const c = researchCost(id, rl(S, id));
    const fromRp = Math.min(S.rp || 0, c);
    S.rp = (S.rp || 0) - fromRp;
    S.moon -= c - fromRp;
    S.research[id] = rl(S, id) + 1;
    for (const t of S.towers) { t.rs = S.research; t._s = null; }
    if (S.hero) { S.hero.rs = S.research; S.hero._s = null; }
    S.buffsDirty = true;
    emit(S, 'research', { id, lv: S.research[id], rp: fromRp });
    checkAch(S);
    return true;
  }
  function cleanStars(o) {
    const out = {};
    if (o && typeof o === 'object') for (const id of MAP_IDS) { const v = Math.max(0, Math.min(MAX_STARS, o[id] | 0)); if (v) out[id] = v; }
    return out;
  }
  function cleanResearch(o) {
    const out = {};
    if (o && typeof o === 'object') for (const r of RESEARCH) { const v = Math.max(0, Math.min(r.max, o[r.id] | 0)); if (v) out[r.id] = v; }
    return out;
  }
  function cleanPresets(o) {
    const out = {};
    if (!o || typeof o !== 'object') return out;
    for (const id of MAP_IDS) {
      if (!Array.isArray(o[id])) continue;
      out[id] = o[id].filter(p => p && RACES[p.race] && isFinite(p.x) && isFinite(p.y)).slice(0, 400).map(p => ({ race: p.race, x: +p.x, y: +p.y }));
    }
    return out;
  }

  function serTower(t) { return { id: t.id, race: t.race, x: t.x, y: t.y, spent: t.spent, paths: t.paths, infD: t.infD, infR: t.infR, mode: t.mode, kills: t.kills, dmg: t.dmg }; }
  function serialize(S) {
    const boards = {};
    for (const id of MAP_IDS) {
      const b = boardOf(S, id);
      if (!b) continue;
      boards[id] = { cash: b.cash, cleared: b.cleared, sel: b.sel, auto: b.auto, towers: b.towers.map(serTower), records: b.records, hero: serHero(b.hero), farm: b.farm, build: b.build };
    }
    return JSON.stringify({
      ver: SAVE_VER, map: S.map, seed: S.seed, nextId: S.nextId, totalKills: S.totalKills,
      stats: S.stats, settings: S.settings, boards, codex: S.codex,
      stars: S.stars, moon: S.moon, moonTotal: S.moonTotal, research: S.research, presets: S.presets, heroUnlocks: S.heroUnlocks,
      slots: S.slots, rules: S.rules, lastSeen: S.lastSeen || 0,
      ach: S.ach, feats: S.feats, daily: S.daily, chalDone: S.chalDone, chalBest: S.chalBest, rp: S.rp || 0, tokens: S.tokens,
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
    3(o) {
      const boards = o.boards && typeof o.boards === 'object' ? o.boards : {};
      for (const id in boards) {
        const b = boards[id];
        if (!b || !Array.isArray(b.towers)) continue;
        b.towers = b.towers.filter(t => t && RACES[t.race]);
      }
      o.ver = 4;
      return o;
    },
    4(o) {
      const cx = { e: {}, b: {} };
      const boards = o.boards && typeof o.boards === 'object' ? o.boards : {};
      for (const id of MAP_IDS) {
        const b = boards[id];
        if (!b || typeof b !== 'object') continue;
        const top = Math.max(0, Math.min(MAX_WAVE, b.cleared | 0));
        for (let n = 1; n <= top; n++) {
          const sp = waveSpec(n, MAPS[id]);
          for (const k in sp.counts) if (ENEMIES[k] && k !== 'boss') cx.e[k] = 1;
          if (sp.boss) cx.b[sp.boss.id] = 1;
        }
        if (b.records && b.records.bosses) for (const k in b.records.bosses) if (BOSS_BY_ID[k]) cx.b[k] = 1;
      }
      if (cx.e.splitter) cx.e.mini = 1;
      o.codex = cx;
      o.ver = 5;
      return o;
    },
    5(o) {
      o.stars = {};
      o.moon = 0;
      o.moonTotal = 0;
      o.research = {};
      o.presets = {};
      o.ver = 6;
      return o;
    },
    6(o) {
      o.heroUnlocks = { nova: 1 };
      const boards = o.boards && typeof o.boards === 'object' ? o.boards : {};
      for (const id in boards) if (boards[id] && typeof boards[id] === 'object') boards[id].hero = null;
      o.ver = 7;
      return o;
    },
    7(o) {
      o.lastSeen = 0;
      o.slots = {};
      o.rules = newRules();
      const boards = o.boards && typeof o.boards === 'object' ? o.boards : {};
      for (const id in boards) {
        const b = boards[id];
        if (!b || typeof b !== 'object') continue;
        const f = newFarm();
        f.safe = Math.max(0, Math.min(MAX_WAVE, b.cleared | 0));
        f.val = boardValue(Array.isArray(b.towers) ? b.towers : []);
        b.farm = f;
        b.build = null;
      }
      o.ver = 8;
      return o;
    },
    8(o) {
      const st = o.stats && typeof o.stats === 'object' ? o.stats : {};
      const boards = o.boards && typeof o.boards === 'object' ? o.boards : {};
      let waves = 0, mk = {};
      for (const id of MAP_IDS) {
        const b = boards[id];
        if (!b || typeof b !== 'object') continue;
        waves += (b.records && b.records.wins) | 0;
      }
      let ups = 0;
      if (o.stars && typeof o.stars === 'object') for (const id of MAP_IDS) ups += Math.max(0, Math.min(MAX_STARS, o.stars[id] | 0));
      for (const id of MAP_IDS) { const b = boards[id]; if (b && Array.isArray(b.towers)) { let k = 0; for (const t of b.towers) k += (t && t.kills) | 0; if (k) mk[id] = k; } }
      o.stats = Object.assign({}, st, { waves: Math.max(st.waves | 0, waves), starUps: Math.max(st.starUps | 0, ups), moonEarned: Math.max(+st.moonEarned || 0, Math.floor(+o.moonTotal || 0)), mapKills: st.mapKills || mk });
      o.ach = {}; o.feats = {}; o.daily = newDaily(); o.chalDone = {}; o.chalBest = {}; o.rp = 0; o.tokens = {};
      o.ver = 9;
      return o;
    },
  };
  function cleanCodex(c) {
    const out = { e: {}, b: {} };
    if (!c || typeof c !== 'object') return out;
    if (c.e && typeof c.e === 'object') for (const k in c.e) if (ENEMIES[k] && k !== 'boss' && c.e[k]) out.e[k] = 1;
    if (c.b && typeof c.b === 'object') for (const k in c.b) if (BOSS_BY_ID[k] && c.b[k]) out.b[k] = 1;
    return out;
  }
  const TRICK_MECH = { fly: 'flying', magic: 'magical', heal: 'healer', aegis: 'aegis', bubble: 'aegis', cloak: 'stealth', plate: 'plate', armor: 'shell', shell: 'shell', burrow: 'burrow', sprint: 'sprint', windrider: 'sprint', regen: 'regen', blink: 'blink', haste: 'haste', brood: 'brood', summon: 'brood', phase: 'phase', twin: 'twin', split: 'split' };
  const OLD_MECH = { burrow: 'burrow', brood: 'brood', flying: 'flying', magical: 'magical', sprint: 'sprint', regen: 'regen', phase: 'phase', armor: 'shell', split: 'split', mother: 'brood' };
  function mechOf(kind, id) {
    const out = [];
    const add = (k) => { if (k && out.indexOf(k) < 0) out.push(k); };
    if (kind === 'b') {
      const b = BOSS_BY_ID[id];
      if (!b) return out;
      if (b.tricks) {
        const scan = (o) => { for (const k in o) if (k !== 'stages' && o[k]) add(TRICK_MECH[k]); };
        scan(b.tricks);
        if (b.tricks.stages) for (const st of b.tricks.stages) scan(st);
      } else add(OLD_MECH[b.trick]);
      if (b.trick === 'mother') { add('sprint'); add('flying'); add('magical'); add('regen'); }
      return out;
    }
    const d = ENEMIES[id];
    if (!d) return out;
    if (d.flying) add('flying');
    if (d.magical) add('magical');
    if (d.swarm) add('swarm');
    if (d.heal) add('healer');
    if (d.split || d.child) add('split');
    if (d.stealth) add('stealth');
    if (d.burrow) add('burrow');
    if (d.aegis) add('aegis');
    if (d.plate) add('plate');
    if (d.speed >= 90 && !d.swarm) add('fast');
    if (d.hp >= 3) add('tanky');
    if (!out.length) add('plain');
    return out;
  }
  function codexList() {
    const e = ENEMY_IDS.map(id => ({ kind: 'e', id, def: ENEMIES[id], mech: mechOf('e', id) }));
    const b = [];
    for (const id of MAP_IDS) for (const bid of MAPS[id].bosses) b.push({ kind: 'b', id: bid, map: id, def: BOSS_BY_ID[bid], mech: mechOf('b', bid), wave: (MAPS[id].bosses.indexOf(bid) + 1) * MAPS[id].waves.bossEvery });
    return { e, b };
  }
  function firstSeen(type, mapId) {
    const map = getMap(mapId);
    for (const ty of map.waves.types) if (ty.id === type) return ty.from <= MAX_WAVE ? ty.from : 0;
    return 0;
  }
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
    const b = newBoard(map, S);
    b.cash = Number(src.cash) || 0;
    b.cleared = Math.max(0, Math.min(MAX_WAVE, src.cleared | 0));
    b.sel = Math.max(1, Math.min(Math.max(1, src.sel | 0), Math.min(MAX_WAVE, b.cleared + 1)));
    b.auto = !!src.auto;
    b.records = cleanRecords(src.records);
    b.hero = cleanHero(src.hero);
    b.farm = cleanFarm(src.farm, b.cleared);
    b.build = cleanBuild(src.build);
    for (const r of src.towers || []) {
      if (!r || !RACES[r.race] || !isFinite(r.x) || !isFinite(r.y)) continue;
      const t = makeTower(S, r.race, +r.x, +r.y);
      t.id = r.id | 0; t.spent = +r.spent || 0; t.paths = (r.paths || [0, 0, 0, 0, 0]).slice(0, 5).map(v => Math.max(0, Math.min(10, v | 0)));
      while (t.paths.length < 5) t.paths.push(0);
      t.infD = r.infD | 0; t.infR = r.infR | 0; t.mode = r.mode || 'first'; t.kills = r.kills | 0; t.dmg = +r.dmg || 0;
      t.face = faceRoad(map, t.x, t.y); t.light = lightAt(map, t.x, t.y); t.pm = priceOf(map);
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
    S.stats = cleanStats(o.stats);
    S.settings = cleanSettings(o.settings);
    S.codex = cleanCodex(o.codex);
    S.stars = cleanStars(o.stars);
    S.moon = Math.max(0, Math.floor(+o.moon || 0));
    S.moonTotal = Math.max(S.moon, Math.floor(+o.moonTotal || 0));
    S.research = cleanResearch(o.research);
    S.presets = cleanPresets(o.presets);
    S.heroUnlocks = cleanUnlocks(o.heroUnlocks);
    S.slots = cleanSlots(o.slots);
    S.rules = cleanRules(o.rules);
    S.lastSeen = Math.max(0, Math.floor(+o.lastSeen || 0));
    S.ach = cleanFlags(o.ach, ACH_BY_ID);
    S.feats = cleanFlags(o.feats, ACH_BY_ID);
    S.daily = cleanDaily(o.daily);
    S.chalDone = cleanChalDone(o.chalDone);
    S.chalBest = cleanChalBest(o.chalBest);
    S.rp = Math.max(0, Math.floor(+o.rp || 0));
    S.tokens = cleanFlags(o.tokens, TOKENS);
    recalcBonus(S);
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
    const b = boards[cur] || newBoard(MAPS[cur], S);
    delete boards[cur];
    for (const k of BOARD_KEYS) S[k] = b[k];
    S.nextId = Math.max(S.nextId, maxId + 1, 1);
    const live = {};
    for (const t of S.towers) live[t.id] = 1;
    for (const id in S.boards) for (const t of S.boards[id].towers) live[t.id] = 1;
    for (const k in S.rules.pony) if (!live[k]) delete S.rules.pony[k];
    syncHeroUnlocks(S, true);
    for (const id of MAP_IDS) { const hb = id === S.map ? S : S.boards[id]; if (hb && hb.hero && !heroUnlocked(S, hb.hero.id)) hb.hero.id = 'nova'; }
    prepTowers(S);
    checkAch(S, true);
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
    stats, computeStats, effDmg, effRate, refreshBuffs, startWave, step, canHit, isMagic, isFly, isFast, isHidden,
    lightFor, lightSources, stackBuff, priceOf, spawnEnemy,
    serialize, deserialize, migrate, cleanSettings, fmt, setNumFormat, pct, mulberry, hashSeed,
    MAP_BOSSES, UNLOCK_AT, lightAt, crossings, placeBlockReason, switchMap, mapUnlocked, mapCleared, boardOf, newBoard, mapStartCash, activeTricks,
    ENEMY_IDS, ELITE, MECH, COMBOS, armorFor, mechOf, codexList, cleanCodex, firstSeen, themeRule, damage, kill,
    MAX_STARS, STAR, STAR_MODS, BRANCHES, RESEARCH, RESEARCH_BY_ID, rl, starOf, starMods, starHpMul, researchLevels, starSpeedMul, starCashMul,
    killMul, clearMul, moonMul, livesFor, canStarUp, starUpGain, starUp, skipFor, presetOf, placePreset,
    researchCost, researchTotal, researchState, buyResearch, grantMoon, cleanStars, cleanResearch, cleanPresets,
    HEROES, HERO_IDS, HERO_TUNE, xpNeed, rankFor, heroProg, heroStats, heroHome, heroAt, heroMilestone, heroUnlocked, syncHeroUnlocks, unlockHero,
    pickHero, moveHero, heroPow, addHeroXp, castHero, heroAuto, heroInfo, cleanHero, serHero, cleanUnlocks,
    OFFLINE, SLOT_BASE, SLOT_BONUS, SLOT_MAX, RULE_KINDS, RULE_TICKS, RESERVES, RULE_MAX,
    newFarm, trackIncome, incomeRate, boardValue, farmTarget, setFarm, farmResult, safeWave, farmCash, farmTime, farmRate, offlineMul, offlineCap, touchSeen, offlineGain, applyOffline,
    newRules, cleanRule, cleanRules, rulesFor, setRules, ruleText, ruleAction, runRules,
    slotCount, slotsOf, cleanName, savePreset, deletePreset, renamePreset, loadPreset, cancelBuild, buildPending, buildStep, buildProgress, planCost,
    cleanFarm, cleanSlots, cleanBuild,
    BONUS_KEYS, BONUS_NAMES, newBonus, newStats, cleanStats, TOKENS, profileOf, feat, ACH, ACH_BY_ID, ACH_CATS, bonusText, pctText, recalcBonus, checkAch, achList, bestCleared,
    CHAL_ECO, CHAL_MODS, CHAL_IDS, DAILY_MODS, CHAL_CLASH, CHALLENGES, CHAL_BY_ID, DAILY_BANDS, chalClash, chalWeight, chalHpMul, dayIndex, dayLabel, dailyDef, dailyMoon, dailyStreak, modText, modDesc, rewardText,
    chalRaces, chalHas, chalBlock, startChallenge, quitChallenge, chalFinish, chalScore, chalInfo, chalStartCash, tickPlay, statsSummary, newDaily,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.NDCore = API;
})(typeof window !== 'undefined' ? window : globalThis);
