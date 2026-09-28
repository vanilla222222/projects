'use strict';

const BESTIARY_TABS = [
  { id:'enemies', label:'Enemies', icon:'💀' },
  { id:'items', label:'Items', icon:'🎒' },
  { id:'stars', label:'Stars', icon:'⭐' },
  { id:'pills', label:'Pills', icon:'💊' },
  { id:'trinkets', label:'Trinkets', icon:'🔩' },
  { id:'familiars', label:'Familiars', icon:'🐾' },
  { id:'objects', label:'Objects', icon:'🪨' },
  { id:'pickups', label:'Pickups', icon:'🎁' },
  { id:'roomtypes', label:'Room Types', icon:'🚪' },
  { id:'stages', label:'Stages', icon:'🗺️' },
];

function loadBestiaryTabPref(){
  try {
    const v = localStorage.getItem('nightfallBestiaryTab');
    return BESTIARY_TABS.some(t => t.id === v) ? v : 'enemies';
  } catch (e) { return 'enemies'; }
}
let _bestiaryTab = loadBestiaryTabPref();

const BESTIARY_FLOORKEY_STAGE_LABEL = {
  '9A':'The Final Reckoning — Branch A', '9B':'The Final Reckoning — Branch B',
  '10A':'The Uncharted Reaches — Branch A', '10B':'The Uncharted Reaches — Branch B',
  '11A':'The Sunken Frequency — Branch A', '11B':'The Sunken Frequency — Branch B',
  '12A':'The Shattered Refrain — Branch A', '12B':'The Shattered Refrain — Branch B',
  '13':'The Hollow Chorus', '14':'The Final Waveform', '15':'The One True Descent',
  '3C':'The Gutters', '4C':'The Gutters',
  '5C':'The Sewers', '6C':'The Sewers',
  '7C':'The Rainforest', '8C':'The Rainforest', '9C':'The Rainforest', '10C':'The Rainforest',
  '11C':'The Mangroves', '12C':'The Mangroves',

  '13C':'The Flooded Undercity', '14C':'The Flooded Undercity',
  '15C':'The Coral Boneyard', '16C':'The Coral Boneyard',
  '17C':'The Abyssal Vents', '18C':'The Abyssal Vents',
  '19C':'The Drowned Cathedral', '20C':'The Drowned Cathedral',
  '21C':'The Black Current', '22C':'The Black Current',
  '23C':'The Leviathan\'s Maw', '24C':'The Leviathan\'s Maw',
  '4D':'The Observatory', '5D':'The Observatory',
  '6D':'The Orrery', '7D':'The Orrery',
  '8D':'The Void Between', '9D':'The Void Between', '10D':'The Void Between',
};

const BESTIARY_FLOORKEY_ORDER = [
  '9A', '9B', '10A', '10B', '11A', '11B', '12A', '12B', '13', '14', '15',
  '3C', '4C', '5C', '6C', '7C', '8C', '9C', '10C', '11C', '12C',

  '13C', '14C', '15C', '16C', '17C', '18C', '19C', '20C', '21C', '22C', '23C', '24C',
  '4D', '5D', '6D', '7D', '8D', '9D', '10D',
];

function bestiaryStageLabel(e){
  if (e.stage === 'universal') return 'Universal (Every Floor)';
  if (typeof e.stage === 'number') return (STAGES[e.stage] && STAGES[e.stage].name) || ('Stage ' + (e.stage + 1));
  if (e.floorKey) return BESTIARY_FLOORKEY_STAGE_LABEL[e.floorKey] || ('Floor ' + e.floorKey);
  return 'Other';
}
function bestiaryStageSortKey(e){
  if (e.stage === 'universal') return -1;
  if (typeof e.stage === 'number') return e.stage < LEGACY_STAGE_COUNT ? e.stage : 1000 + e.stage;
  if (e.floorKey) return 100 + BESTIARY_FLOORKEY_ORDER.indexOf(e.floorKey);
  return 9999;
}

function bestiaryStageGroups(list){
  const groups = new Map();
  for (const e of list) {
    const label = bestiaryStageLabel(e);
    let g = groups.get(label);
    if (!g) { g = { label, sortKey: bestiaryStageSortKey(e), items: [] }; groups.set(label, g); }
    g.items.push(e);
  }
  return Array.from(groups.values()).sort((a, b) => a.sortKey - b.sortKey);
}

function bestiarySuperbossStageGroups(list){
  const groups = new Map();
  for (const e of list) {
    const route = SUPERBOSS_ROUTE[e.id] || 'main';
    const label = 'Route ' + (SUPERBOSS_ROUTE_LABELS[route] || route);
    let g = groups.get(label);
    if (!g) { g = { label, sortKey: SUPERBOSS_ROUTE_ORDER.indexOf(route), seq: SUPERBOSS_ROUTE_SEQUENCE[route] || [], items: [] }; groups.set(label, g); }
    g.items.push(e);
  }
  const out = Array.from(groups.values());
  for (const g of out) g.items.sort((a, b) => g.seq.indexOf(a.id) - g.seq.indexOf(b.id));
  return out.sort((a, b) => a.sortKey - b.sortKey);
}

function bestiaryCard(opts){
  const card = document.createElement('div');
  card.className = 'best-card' + (opts.seen ? ' done' : '') + (opts.category ? ' best-cat-' + opts.category : '');
  card.dataset.name = opts.seen ? (opts.name || '') : '';
  card.dataset.seen = opts.seen ? '1' : '0';
  card.dataset.tier = opts.tier || 0;

  const head = document.createElement('div');
  head.className = 'best-card-head';
  const icon = document.createElement('div');
  icon.className = 'best-card-icon';
  if (opts.seen && opts.dotColor) {
    icon.classList.add('best-dot');
    icon.style.background = opts.dotColor;
  } else {
    icon.textContent = opts.seen ? opts.icon : '❓';
  }
  head.appendChild(icon);

  const name = document.createElement('div');
  name.className = 'best-card-name';
  name.textContent = opts.seen ? opts.name : '???';

  if (opts.seen && opts.tier > 0) {
    const badge = document.createElement('span');
    const tierName = BESTIARY_TIER_NAMES[opts.tier - 1];
    badge.className = 'best-tier';
    badge.textContent = ' ' + BESTIARY_TIER_ICONS[tierName];
    badge.style.color = BESTIARY_TIER_COLORS[tierName];
    badge.title = bestiaryTierLabel(opts.tier);
    name.appendChild(badge);
  }
  head.appendChild(name);
  card.appendChild(head);

  const lines = opts.seen ? (opts.lines || []) : ['Not yet discovered.'];
  for (const line of lines) {
    if (!line) continue;
    const d = document.createElement('div');
    d.className = 'best-card-desc';
    d.textContent = line;
    card.appendChild(d);
  }

  if (opts.seen && opts.chips && opts.chips.length) {
    const chipRow = document.createElement('div');
    chipRow.className = 'best-card-chips';
    for (const c of opts.chips) {
      if (!c) continue;
      const chip = document.createElement('span');
      chip.className = 'best-chip';
      if (typeof c === 'string') { chip.textContent = c; }
      else { chip.textContent = c.text; if (c.title) chip.title = c.title; }
      chipRow.appendChild(chip);
    }
    card.appendChild(chipRow);
  }

  if (opts.seen && opts.extra) {
    const ex = document.createElement('div');
    ex.className = 'best-card-tally';
    ex.textContent = opts.extra;
    card.appendChild(ex);
  }

  if (opts.seen && opts.category && opts.count != null) {
    const hint = bestiaryTierProgressHint(opts.category, opts.count);
    if (hint) {
      const pr = document.createElement('div');
      pr.className = 'best-tier-progress';
      pr.textContent = hint;
      card.appendChild(pr);
    }
  }
  return card;
}

function bestiaryCategoryHeader(wrap, label, done, total){
  const h = document.createElement('h3');
  h.className = 'achv-category';
  h.textContent = label + ' (' + done + '/' + total + ')';
  wrap.appendChild(h);
}

function bestiarySubHeader(wrap, label, done, total){
  const h = document.createElement('h4');
  h.className = 'best-subcategory';
  h.textContent = label + ' (' + done + '/' + total + ')';
  wrap.appendChild(h);
}
function bestiaryGrid(){
  const grid = document.createElement('div');
  grid.className = 'best-grid';
  return grid;
}

const BEHAVIOR_INFO = {
  chaser:'Walks straight at you.', ranged:'Backs off and fires from range.',
  flyer:'Airborne chaser — ignores ground hazards.', bomber:'Chases, then drops a live bomb.',
  charger:'Chases, then telegraphs a fast dash.', turret:'Stationary, fires on a cooldown.',
  leaper:'Telegraphs, then hops at you.', splitter:'Splits into two on death.',
  orbiter:'Strafes a ring around you.', burrower:'Dives underground, resurfaces near you.',
  summoner:'Periodically raises minions.', healer:'Restores nearby allies\' health.',
  sniper:'Holds max range, fires aimed shots.', swarm:'Wander blended with a light chase.',
  ambusher:'Springs a one-time trap when triggered.', teleporter:'Blinks around the room.',
  shielder:'Grants a nearby ally a shield.', lobber:'Arcs a slow, telegraphed projectile.',
  weaver:'Chases along a sine-wave path.', sentry:'Reacts to how you last moved.',
  skirmisher:'Hit-and-run: dashes in, fires, retreats.', whiplash:'Melee with real reach — plants and strikes.',
  shielded:'Cycles between shielded and vulnerable.', aimless:'Pure wander, never seeks you.',
  skitter:'Erratic short bursts with real pauses.', pouncer:'Waits, then commits to one leap.',
  strafer:'Kites at a fixed ring, firing as it circles.', splitshot:'Fires two bolts in a diverging V.',
  flee:'Always runs — never closes distance.', wallHugger:'Pinned to the nearest wall, tracks you along it.',
  cardinalBloat:'Wanders, then volleys all 4 compass directions.', randomJumper:'Hops randomly until you\'re close, then aims.',
  dvdStrider:'One heading forever, bounces off every wall.', haunter:'Possesses a room object to attack through it.',
  thief:'Steals the nearest pickup, then flees with it.', trapLid:'One ambush lunge, then permanently inert.',
  chainlink:'Tethered to a linked partner — kill one, kill both.', bonepiler:'Arms up the longer it survives unbothered.',
  curser:'Stationary — grows a curse zone that freezes you.', mourner:'Passive until another enemy dies, then enraged forever.',
  sexton:'Digs a real pit where you WERE standing.', sarcophagus:'Stationary — periodically vomits flies.',
  sarcophagusArmored:'Stationary, cyclically shielded — vomits tougher flies.',
};
function behaviorTitle(behavior){
  if (BEHAVIOR_INFO[behavior]) return BEHAVIOR_INFO[behavior];
  if (!behavior) return null;
  if (behavior.indexOf('boss') === 0) return 'Bespoke boss AI, unique to this fight.';

  return 'Bespoke AI, unique to this enemy.';
}

const BESTIARY_EXTRA_FIELD_CHIPS = [
  ['contactCooldown', v => 'Touch every ' + v + 's'],
  ['fireCooldown', v => 'Fires every ' + v + 's'],
  ['telegraphTime', v => 'Telegraph ' + v + 's'],
  ['chargeCooldown', v => 'Charges every ' + v + 's'],
  ['leapCooldown', v => 'Leaps every ' + v + 's'],
  ['blinkCooldown', v => 'Blinks every ' + v + 's'],
  ['summonCooldown', v => 'Summons every ' + v + 's'],
  ['maxSummons', v => 'Up to ' + v + ' minions'],
  ['healCooldown', v => 'Heals every ' + v + 's'],
  ['pounceRange', v => 'Pounce range ' + v],
  ['triggerRange', v => 'Triggers within ' + v],
  ['engageRange', v => 'Engages past ' + v],
  ['retreatRange', v => 'Retreats within ' + v],
  ['keepDistance', v => 'Holds range ' + v],
  ['burstRadius', v => 'Burst radius ' + v],
  ['shieldTime', v => 'Shielded ' + v + 's'],
  ['vulnTime', v => 'Exposed ' + v + 's'],
  ['armorTime', v => 'Armored ' + v + 's'],
  ['chainLength', v => 'Tether length ' + v],
  ['curseMaxRadius', v => 'Curse radius ' + v],
  ['digCooldownMin', v => 'Digs every ' + v + '+s'],
  ['flySpawnCount', v => 'Vomits ×' + v],
  ['splitInto', v => 'Splits on death'],
  ['spawnFliesOnDeath', v => 'Death spawn ×' + (v.count || '?')],
  ['spawnBombsOnDeath', v => 'Drops ' + v + ' bombs on death'],
  ['linkedDeath', v => v ? 'Linked-death pair' : null],
];
function extraFieldChips(e){
  const out = [];
  for (const [field, fmt] of BESTIARY_EXTRA_FIELD_CHIPS) {
    if (e[field] === undefined || e[field] === null) continue;
    const text = fmt(e[field]);
    if (text) out.push(text);
  }
  return out;
}

function bestiaryThreatRating(e){
  const score = (e.hp || 0) * (e.dmg || 0);
  if (score <= 0) return 'Harmless';
  if (score < 8) return 'Trivial';
  if (score < 20) return 'Low';
  if (score < 50) return 'Moderate';
  if (score < 150) return 'High';
  return 'Extreme';
}

function bestiaryTouchDps(e){
  if (e.harmless || !e.dmg) return null;
  const cd = e.contactCooldown || (e.isBoss ? 0.6 : 0.7);
  return (e.dmg / cd).toFixed(1);
}

function bestiaryRarityLabel(e){
  if (e.weight === undefined) return null;
  if (e.weight < 0.7) return 'Rare spawn';
  if (e.weight < 1) return 'Uncommon spawn';
  if (e.weight > 1.2) return 'Frequent spawn';
  return null;
}

function enemyChips(e){
  const chips = ['HP ' + e.hp, 'DMG ' + e.dmg];
  chips.push(e.speed > 0 ? ('SPD ' + e.speed) : 'Stationary');
  if (e.radius) chips.push('R' + e.radius);
  if (e.behavior) chips.push({ text: e.behavior, title: behaviorTitle(e.behavior) });
  chips.push({ text: '⚔ ' + bestiaryThreatRating(e), title: 'Threat Rating — a relative read on hp×dmg against the rest of the bestiary, not a run-scaled number.' });
  const dps = bestiaryTouchDps(e);
  if (dps) chips.push({ text: 'Touch ' + dps + '/s', title: 'Damage per second from standing in continuous contact with it (its own contact cooldown, half-hearts/s).' });
  if (e.flies) chips.push('✈ Flies');
  if (e.harmless) chips.push('Harmless');
  if (e.groupSize) chips.push('Group ×' + e.groupSize);
  if (e.xpTier) chips.push('Tier ' + e.xpTier);
  if (e.isMinion) chips.push('Summon Only');
  if (e.locked) chips.push('🔒 Locked');
  const rarity = bestiaryRarityLabel(e);
  if (rarity) chips.push(rarity);
  if (e.onlyFloorNum !== undefined) chips.push('Floor ' + (e.onlyFloorNum + 1) + ' Only');
  chips.push({ text: '🗺 ' + bestiaryStageLabel(e), title: 'Where this enemy is native to.' });
  chips.push(...extraFieldChips(e));
  return chips;
}

function renderBestiaryEnemies(wrap){
  const unlocks = ensureUnlockShape(loadUnlocks());
  const kills = unlocks.bestiary.enemyKills, deaths = unlocks.bestiary.enemyDeaths;
  const groups = [
    { label:'Enemies', list: ENEMY_LIST, tierCat:'enemy', stageGroups: bestiaryStageGroups },
    { label:'Bosses', list: BOSS_LIST.concat(BOSS_LIST_BESTIARY_EXTRA), tierCat:'boss', stageGroups: bestiaryStageGroups },
    { label:'Superbosses', list: SUPERBOSS_LIST, tierCat:'superboss', stageGroups: bestiarySuperbossStageGroups },
  ];
  for (const g of groups) {
    const done = g.list.filter(e => kills[e.id]).length;
    bestiaryCategoryHeader(wrap, g.label, done, g.list.length);
    for (const stageGroup of g.stageGroups(g.list)) {
      const sDone = stageGroup.items.filter(e => kills[e.id]).length;
      bestiarySubHeader(wrap, stageGroup.label, sDone, stageGroup.items.length);
      const stageWrap = document.createElement('div');
      stageWrap.className = 'best-stage-group';
      const grid = bestiaryGrid();
      for (const e of stageGroup.items) {
        const seen = !!kills[e.id];
        const k = kills[e.id] || 0, d = deaths[e.id] || 0;
        const tally = 'Defeated ' + Util.formatNum(k) + ' time' + (k === 1 ? '' : 's') + ' · Killed you ' + Util.formatNum(d) + ' time' + (d === 1 ? '' : 's');
        grid.appendChild(bestiaryCard({
          seen, icon: e.icon || '💀', dotColor: e.icon ? null : e.color, name: e.name,
          lines: [e.desc || null], chips: enemyChips(e), extra: tally,
          tier: bestiaryTierFor(g.tierCat, k), category: g.tierCat, count: k,
        }));
      }
      stageWrap.appendChild(grid);
      wrap.appendChild(stageWrap);
    }
  }
}

const BESTIARY_POOL_LABELS = { secret:'Secret Room', treasure:'Treasure Room', boss:'Boss Drop', chest:'Chests', shop:'Shop', curse:'Cursed Room', challenge:'Challenge Room' };
function poolsChip(item){
  if (!item.pools || !item.pools.length) return null;
  if (item.pools.length >= POOLS_ALL.length) return { text:'All Pools', title:'Can appear from any item source in the game.' };
  const names = item.pools.map(p => BESTIARY_POOL_LABELS[p] || p).join(', ');
  return { text: 'Pools: ' + item.pools.length, title: 'Only appears from: ' + names };
}

function renderBestiaryItems(wrap){
  const unlocks = ensureUnlockShape(loadUnlocks());
  const seenMap = unlocks.bestiary.seenItems;
  const counts = unlocks.bestiary.itemsCollectedCount || {};
  const groups = [
    { label:'Passive Items', list: PASSIVE_ITEMS },
    { label:'Active Items', list: ACTIVE_ITEMS },
  ];
  for (const g of groups) {
    const done = g.list.filter(i => seenMap[i.id]).length;
    bestiaryCategoryHeader(wrap, g.label, done, g.list.length);
    const grid = bestiaryGrid();
    for (const item of g.list) {
      const seen = !!seenMap[item.id];
      const chips = [item.type === 'active' ? 'Active' : 'Passive'];
      if (item.quality) chips.push('Quality ' + item.quality + '/4');
      if (item.maxCharge) chips.push('Charge ' + item.maxCharge);
      const pc = poolsChip(item);
      if (pc) chips.push(pc);
      if (item.locked) chips.push({ text:'🔒 Locked', title:'Unlocked by an achievement — see the Achievements panel.' });
      grid.appendChild(bestiaryCard({
        seen, icon: item.icon, name: item.name,
        lines: [item.desc], chips,
        extra: item.quality ? ('★'.repeat(item.quality) + '☆'.repeat(4 - item.quality)) : null,
        tier: bestiaryTierFor('item', counts[item.id] || 0), category: 'item', count: counts[item.id] || 0,
      }));
    }
    wrap.appendChild(grid);
  }
}

function renderBestiarySimple(wrap, list, seenSection, extraFn, chipsFn){
  const unlocks = ensureUnlockShape(loadUnlocks());
  const seenMap = unlocks.bestiary[seenSection] || {};

  const tierInfo = _BESTIARY_SEEN_TIER_MAP[seenSection];
  const counts = tierInfo ? (unlocks.bestiary[tierInfo.countBucket] || {}) : {};
  const grid = bestiaryGrid();
  for (const entry of list) {
    const seen = !!seenMap[entry.id];
    grid.appendChild(bestiaryCard({
      seen, icon: entry.icon, name: entry.name,
      lines: [entry.desc],
      chips: chipsFn ? chipsFn(entry) : null,
      extra: extraFn ? extraFn(entry) : null,
      tier: tierInfo ? bestiaryTierFor(tierInfo.category, counts[entry.id] || 0) : 0,
      category: tierInfo ? tierInfo.category : null, count: tierInfo ? (counts[entry.id] || 0) : null,
    }));
  }
  wrap.appendChild(grid);
}

function renderBestiaryFamiliars(wrap){
  const unlocks = ensureUnlockShape(loadUnlocks());
  const seenMap = unlocks.bestiary.seenFamiliars;
  const counts = unlocks.bestiary.familiarsCollectedCount || {};
  const groups = [
    { label:'Orbiters', behavior:'orbiter' },
    { label:'Shooters', behavior:'shooter' },
    { label:'Procs', behavior:'proc' },
    { label:'Swarmers', behavior:'swarmer' },
  ];

  const bucketed = new Set(groups.map(g => g.behavior));
  for (const g of groups) {
    const list = FAMILIAR_LIST.filter(f => f.behavior === g.behavior);
    if (!list.length) continue;
    const done = list.filter(f => seenMap[f.id]).length;
    bestiaryCategoryHeader(wrap, g.label, done, list.length);
    const grid = bestiaryGrid();
    for (const f of list) {
      const seen = !!seenMap[f.id];
      const chips = [];
      if (f.behavior === 'orbiter') chips.push('DMG ' + f.dmg, 'Orbit Speed ' + f.orbitSpeed);
      else if (f.behavior === 'shooter') chips.push('DMG ' + f.dmg, 'Fires every ' + f.cooldown + 's');
      else if (f.behavior === 'proc') chips.push('Every ' + f.interval + 's');
      else if (f.behavior === 'swarmer') chips.push('DMG ' + f.dmg, 'Every ' + f.interval + 's', '×' + f.orbCount + ' orbs');
      if (f.radius) chips.push('R' + f.radius);
      if (f.trashBagOnly) chips.push({ text:'🗑 Trash Bag Only', title:'Only ever obtained from the Trash Bag sack.' });
      if (f.locked) chips.push({ text:'🔒 Locked', title:'Unlocked by an achievement — see the Achievements panel.' });
      chips.push(...extraFieldChips(f));
      grid.appendChild(bestiaryCard({ seen, icon: f.icon, name: f.name, lines: [f.desc], chips, tier: bestiaryTierFor('familiar', counts[f.id] || 0), category:'familiar', count: counts[f.id] || 0 }));
    }
    wrap.appendChild(grid);
  }
  const other = FAMILIAR_LIST.filter(f => !bucketed.has(f.behavior));
  if (other.length) {
    const done = other.filter(f => seenMap[f.id]).length;
    bestiaryCategoryHeader(wrap, 'Other', done, other.length);
    const grid = bestiaryGrid();
    for (const f of other) {
      const seen = !!seenMap[f.id];
      const chips = [f.behavior, 'DMG ' + f.dmg];
      if (f.radius) chips.push('R' + f.radius);
      if (f.locked) chips.push({ text:'🔒 Locked', title:'Unlocked by an achievement — see the Achievements panel.' });
      chips.push(...extraFieldChips(f));
      grid.appendChild(bestiaryCard({ seen, icon: f.icon, name: f.name, lines: [f.desc], chips, tier: bestiaryTierFor('familiar', counts[f.id] || 0), category:'familiar', count: counts[f.id] || 0 }));
    }
    wrap.appendChild(grid);
  }
}

function renderBestiaryPills(wrap){
  const unlocks = ensureUnlockShape(loadUnlocks());
  const seenMap = unlocks.bestiary.seenPills;
  const pillCounts = unlocks.bestiary.pillsDrunkCount || {};

  const note = document.createElement('p');
  note.className = 'bestiary-note';
  note.textContent = "A color's actual effect is re-randomized every run, so the same pill won't always do the same thing twice. Every possible effect: " +
    PILL_EFFECT_LIST.map(e => e.name).join(', ') + '.';
  wrap.appendChild(note);

  const grid = bestiaryGrid();
  for (const c of PILL_COLORS) {
    const seen = !!seenMap[c.id];
    const n = pillCounts[c.id] || 0;
    grid.appendChild(bestiaryCard({
      seen, dotColor: c.color, icon:'💊', name: c.name,
      lines: [],
      extra: n ? ('Taken ' + Util.formatNum(n) + ' time' + (n === 1 ? '' : 's') + '.') : 'Taken at least once.',
      tier: bestiaryTierFor('pill', n), category: 'pill', count: n,
    }));
  }
  wrap.appendChild(grid);
}

function renderBestiaryObjects(wrap){
  const unlocks = ensureUnlockShape(loadUnlocks());
  const seenMap = unlocks.bestiary.objectsSeen, destroyedMap = unlocks.bestiary.objectsDestroyed;
  const grid = bestiaryGrid();
  for (const ob of Object.values(OBSTACLES)) {
    const seen = !!seenMap[ob.id];
    const canBeDestroyed = !!(ob.destructible || ob.attackable);
    const n = destroyedMap[ob.id] || 0;
    const chips = [];
    if (ob.hazard) chips.push('⚠ Hazard');
    if (ob.dmg) chips.push('DMG ' + ob.dmg);
    if (ob.attackable) chips.push('Attackable');
    if (ob.destructible) chips.push('Bombable');
    if (ob.maxHp) chips.push('HP ' + ob.maxHp);
    if (ob.blocksFlight) chips.push('Blocks Flight');
    if (ob.walkable) chips.push('Walk-Over');
    if (ob.solid) chips.push('Solid');
    if (ob.freeze) chips.push('Freezes ' + (ob.freezeDuration || 0.5) + 's');
    if (ob.current) chips.push({ text:'Current', title:'Pushes anything standing on it in a fixed direction.' });
    if (ob.projectile) chips.push({ text:'Fires · every ' + ob.fireCooldown + 's', title:'Periodically shoots a projectile.' });
    if (ob.homing) chips.push('Homing Bolts');
    if (ob.explosiveBolt) chips.push('Explosive Bolts');
    if (ob.spreadShots) chips.push('Fan of ' + ob.spreadShots);
    if (ob.spin) chips.push('Spinning Sweep');
    if (ob.heartDropChance) chips.push({ text: Math.round(ob.heartDropChance * 100) + '% Heart Drop', title:'Chance to drop a heart when destroyed.' });
    if (ob.sacrifice) chips.push({ text:'Sacrifice', title:'Feed it health for escalating rewards.' });
    const line2 = canBeDestroyed ? ('Destroyed ' + Util.formatNum(n) + ' time' + (n === 1 ? '' : 's')) : 'Indestructible.';

    grid.appendChild(bestiaryCard({ seen, dotColor: ob.color, icon:'🪨', name: ob.name, lines: [ob.desc], chips, extra: line2, tier: canBeDestroyed ? bestiaryTierFor('object', n) : 0, category: canBeDestroyed ? 'object' : null, count: canBeDestroyed ? n : null }));
  }
  wrap.appendChild(grid);
}

function bestiaryDiscoveredTotals(){
  const unlocks = ensureUnlockShape(loadUnlocks());
  const b = unlocks.bestiary;
  const enemyList = ENEMY_LIST.concat(BOSS_LIST, BOSS_LIST_BESTIARY_EXTRA, SUPERBOSS_LIST);
  return {
    enemies: { done: enemyList.filter(e => b.enemyKills[e.id]).length, total: enemyList.length },
    items: { done: ITEM_LIST.filter(i => b.seenItems[i.id]).length, total: ITEM_LIST.length },
    stars: { done: STAR_LIST.filter(s => b.seenStars[s.id]).length, total: STAR_LIST.length },
    pills: { done: PILL_COLORS.filter(p => b.seenPills[p.id]).length, total: PILL_COLORS.length },
    trinkets: { done: TRINKET_LIST.filter(t => b.seenTrinkets[t.id]).length, total: TRINKET_LIST.length },
    familiars: { done: FAMILIAR_LIST.filter(f => b.seenFamiliars[f.id]).length, total: FAMILIAR_LIST.length },
    objects: { done: Object.values(OBSTACLES).filter(o => b.objectsSeen[o.id]).length, total: Object.keys(OBSTACLES).length },
    pickups: { done: PICKUP_TYPE_LIST.filter(p => (b.seenPickupKinds || {})[p.id]).length, total: PICKUP_TYPE_LIST.length },
    roomtypes: { done: ROOM_TYPE_LIST.filter(r => (b.seenRoomTypes || {})[r.id]).length, total: ROOM_TYPE_LIST.length },
    stages: { done: STAGE_LIST.filter(s => (b.seenStages || {})[s.id]).length, total: STAGE_LIST.length },
  };
}
function bestiaryTotalDiscovered(){
  const totals = bestiaryDiscoveredTotals();
  let sum = 0;
  for (const k in totals) sum += totals[k].done;
  return sum;
}

function _loadBestiaryTabSeen(){
  try { return JSON.parse(localStorage.getItem('nightfallBestiaryTabSeen') || '{}'); } catch (e) { return {}; }
}
function _saveBestiaryTabSeen(map){
  try { localStorage.setItem('nightfallBestiaryTabSeen', JSON.stringify(map)); } catch (e) {  }
}

function buildBestiaryPanel(){
  const wrap = document.getElementById('bestiaryList');
  if (!wrap) return;
  wireBestiaryFilterControls();
  wrap.innerHTML = '';
  const totals = bestiaryDiscoveredTotals();
  const tabSeen = _loadBestiaryTabSeen();

  const tabsWrap = document.getElementById('bestiaryTabs');
  if (tabsWrap) {
    tabsWrap.innerHTML = '';
    for (const tab of BESTIARY_TABS) {
      const t = totals[tab.id];
      const btn = document.createElement('button');
      btn.classList.toggle('active', tab.id === _bestiaryTab);
      btn.textContent = tab.icon + ' ' + tab.label + ' (' + t.done + '/' + t.total + ')';
      if (t.done > (tabSeen[tab.id] || 0)) {
        const dot = document.createElement('span');
        dot.className = 'best-tab-dot';
        btn.appendChild(dot);
      }
      btn.addEventListener('click', () => {
        tabSeen[tab.id] = totals[tab.id].done;
        _saveBestiaryTabSeen(tabSeen);
        if (_bestiaryTab === tab.id) return;
        _bestiaryTab = tab.id;
        try { localStorage.setItem('nightfallBestiaryTab', tab.id); } catch (e) {  }
        Sound.play('uiClick');
        buildBestiaryPanel();
      });
      tabsWrap.appendChild(btn);
    }
  }
  if ((tabSeen[_bestiaryTab] || 0) < totals[_bestiaryTab].done) {
    tabSeen[_bestiaryTab] = totals[_bestiaryTab].done;
    _saveBestiaryTabSeen(tabSeen);
  }

  const summaryEl = document.getElementById('bestiarySummary');
  if (summaryEl) {
    let done = 0, total = 0;
    for (const k in totals) { done += totals[k].done; total += totals[k].total; }
    const t = totals[_bestiaryTab];
    summaryEl.textContent = done + ' / ' + total + ' discovered total · ' + t.done + ' / ' + t.total + ' in this tab';
  }

  switch (_bestiaryTab) {
    case 'enemies': renderBestiaryEnemies(wrap); break;
    case 'items': renderBestiaryItems(wrap); break;
    case 'stars': renderBestiarySimple(wrap, STAR_LIST, 'seenStars'); break;
    case 'pills': renderBestiaryPills(wrap); break;
    case 'trinkets': renderBestiarySimple(wrap, TRINKET_LIST, 'seenTrinkets', null, t => t.locked ? ['🔒 Locked'] : null); break;
    case 'familiars': renderBestiaryFamiliars(wrap); break;
    case 'objects': renderBestiaryObjects(wrap); break;
    case 'pickups': renderBestiarySimple(wrap, PICKUP_TYPE_LIST, 'seenPickupKinds'); break;
    case 'roomtypes': renderBestiarySimple(wrap, ROOM_TYPE_LIST, 'seenRoomTypes'); break;
    case 'stages': renderBestiarySimple(wrap, STAGE_LIST, 'seenStages'); break;
  }
  applyBestiaryFilters();
}

function applyBestiaryFilters(){
  const wrap = document.getElementById('bestiaryList');
  if (!wrap) return;
  const searchEl = document.getElementById('bestiarySearch');
  const sortEl = document.getElementById('bestiarySort');
  const query = searchEl ? searchEl.value.trim().toLowerCase() : '';
  const sortMode = sortEl ? sortEl.value : 'default';

  const grids = wrap.querySelectorAll('.best-grid');
  for (const grid of grids) {
    const cards = Array.from(grid.children);
    for (const card of cards) {
      const match = !query || card.dataset.seen === '1' && card.dataset.name.toLowerCase().includes(query);
      card.hidden = !!query && !match;
    }
    if (sortMode !== 'default') {
      cards.sort((a, b) => {
        if (sortMode === 'name') return (a.dataset.name || '').localeCompare(b.dataset.name || '');
        if (sortMode === 'discovered') return (b.dataset.seen - a.dataset.seen) || (b.dataset.tier - a.dataset.tier);
        if (sortMode === 'tier') return b.dataset.tier - a.dataset.tier;
        return 0;
      });
      for (const c of cards) grid.appendChild(c);
    }
  }

  const headers = wrap.querySelectorAll('.achv-category, .best-subcategory');
  for (const h of headers) {
    let sib = h.nextElementSibling;
    let anyVisible = false;
    while (sib && !sib.classList.contains('achv-category') && !sib.classList.contains('best-subcategory')) {
      const cards = sib.classList.contains('best-grid') ? sib.children : sib.querySelectorAll ? sib.querySelectorAll('.best-card') : [];
      for (const c of cards) if (!c.hidden) anyVisible = true;
      sib = sib.nextElementSibling;
    }
    h.hidden = !!query && !anyVisible;
  }
}

let _bestiaryFilterWired = false;
function wireBestiaryFilterControls(){
  if (_bestiaryFilterWired) return;
  _bestiaryFilterWired = true;
  const searchEl = document.getElementById('bestiarySearch');
  const sortEl = document.getElementById('bestiarySort');
  if (searchEl) searchEl.addEventListener('input', applyBestiaryFilters);
  if (sortEl) sortEl.addEventListener('change', applyBestiaryFilters);
}

function markBestiarySeenBadge(){
  try { localStorage.setItem('nightfallBestiarySeenCount', String(bestiaryTotalDiscovered())); } catch (e) {  }
  const badge = document.getElementById('bestiaryNewBadge');
  if (badge) badge.classList.add('hidden');
}
function refreshBestiaryBadge(){
  const badge = document.getElementById('bestiaryNewBadge');
  if (!badge) return;
  const doneCount = bestiaryTotalDiscovered();
  let seenCount = 0;
  try { seenCount = parseInt(localStorage.getItem('nightfallBestiarySeenCount') || '0', 10); } catch (e) {  }
  badge.classList.toggle('hidden', doneCount <= seenCount);
}
