'use strict';

function roomTypeColor(type){
  switch (type) {
    case 'start': return '#4fd1c5';
    case 'boss': return '#e35b6a';
    case 'treasure': return '#e3c15b';
    case 'shop': return '#8b5cf6';
    case 'secret': return '#c9a3ff';
    case 'supersecret': return '#7a3fd6';
    case 'mirror': return '#a8c3d4';
    case 'karma': return '#c9d15e';
    case 'bosschallenge': return '#ff3860';
    case 'petshop': return '#5ba050';
    case 'curse': return '#8a2e46';
    case 'sacrifice': return '#4a2458';
    case 'vault': return '#3a6e8a';
    case 'challenge': return '#a85a2e';
    case 'crystal': return '#8fd6f0';
    case 'sombra': return '#7a1f2e';
    case 'star': return '#f5a623';
    case 'cpathgate': return '#4a8f7a';
    case 'planetarium': return '#6a5ce0';
    case 'shrine': return '#d4af37';
    case 'arcade': return '#c93f6b';
    default: return '#8b86a8';
  }
}

const ROOM_TYPE_ICON = {
  start: '🏠',
  boss: '💀',
  treasure: '💰',
  shop: '🛒',
  secret: '❓',
  supersecret: '💠',
  mirror: '🪞',
  karma: '🙏',
  bosschallenge: '👹',
  petshop: '🐾',
  curse: '🩸',
  sacrifice: '🔪',
  vault: '🏦',
  challenge: '⚔️',
  crystal: '💎',
  sombra: '👿',
  star: '⭐',
  cpathgate: '🕳️',
  planetarium: '🔭',
  shrine: '🕯️',
  arcade: '🎰',
  miniboss: '☠️',
};

const ROOM_TYPE_LEGEND = {
  start: 'Start Room', boss: 'Boss Room', treasure: 'Treasure Room', shop: 'Shop',
  secret: 'Secret Room', supersecret: 'Super Secret Room', mirror: 'Mirror Room (mirror boss)', karma: 'Karma Room (resource donation)', bosschallenge: 'Boss Challenge Room', petshop: 'Pet Shop', curse: 'Cursed Room', sacrifice: 'Sacrifice Room',
  vault: 'Vault (key-locked)', challenge: 'Challenge Room', crystal: 'Crystal Room (blessing)', sombra: 'Sombra Room (devil deal)',
  star: 'Star Room (key-locked, pick 1 of 2)',
  cpathgate: 'Storm Drain (floor 2 only — takes the C-branch)',
  planetarium: 'Planetarium (floor 3 only — takes the D-branch)',
  shrine: 'Shrine (blessing paid in coins)',
  arcade: 'Arcade (coin-toll gambling machines)',
  miniboss: 'Miniboss Room (25% per floor — drops a penny, chest, item, or star)',
};

function toggleMinimapLegend(){
  const el = document.getElementById('minimapLegend');
  if (!el) return;
  if (!el.classList.contains('hidden')) { el.classList.add('hidden'); return; }
  el.innerHTML = '';
  for (const type in ROOM_TYPE_LEGEND) {
    const row = document.createElement('div');
    row.className = 'legend-row';
    row.textContent = ROOM_TYPE_ICON[type] + ' ' + ROOM_TYPE_LEGEND[type];
    el.appendChild(row);
  }
  const ring = document.createElement('div');
  ring.className = 'legend-row';
  ring.textContent = '◌ pulsing ring — the room you\'re standing in';
  el.appendChild(ring);
  el.classList.remove('hidden');
}

function roomCentroidBlock(node){
  const mask = node.shape.mask;
  let sx = 0, sy = 0, n = 0;
  for (let r = 0; r < mask.length; r++) {
    for (let c = 0; c < mask[r].length; c++) {
      if (!mask[r][c]) continue;
      sx += node.gx + c; sy += node.gy + r; n++;
    }
  }
  return n ? { bx: sx / n, by: sy / n } : { bx: node.gx, by: node.gy };
}

function roomLootEntries(node){
  const entries = [];
  if (node.itemPedestals) for (const p of node.itemPedestals) if (!p.taken) entries.push({ kind:'item', item: p.item });
  if (node.pickups) for (const p of node.pickups) if (!p.collected) entries.push({ kind:'pickup', kindId: p.kind, coin: p.coin, pillColor: p.pillColor, starId: p.starId, wispDyeId: p.wispDyeId, wispAugmentId: p.wispAugmentId });
  if (node.chests) for (const c of node.chests) if (!c.opened) entries.push({ kind:'chest', def: c.def });
  return entries;
}

function drawLootEntry(ctx, entry, x, y){
  if (entry.kind === 'item') Util.drawItemIcon(ctx, x, y, entry.item);
  else if (entry.kind === 'pickup') Util.drawPickupIcon(ctx, { kind: entry.kindId, coin: entry.coin, pillColor: entry.pillColor, starId: entry.starId, wispDyeId: entry.wispDyeId, wispAugmentId: entry.wispAugmentId, x, y }, 0);
  else if (entry.kind === 'chest') Util.drawChestIcon(ctx, { x, y, opened: false, def: entry.def });
}

function drawLootMarkers(ctx, entries, cx, cy){
  if (!entries.length) return;
  const cols = Math.min(3, entries.length);
  const rows = Math.ceil(entries.length / cols);
  const pitch = 9, scale = 0.4;
  const gridW = (cols - 1) * pitch, gridH = (rows - 1) * pitch;
  ctx.save();
  ctx.translate(cx - gridW / 2, cy - gridH / 2);
  ctx.scale(scale, scale);
  entries.forEach((entry, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    drawLootEntry(ctx, entry, (col * pitch) / scale, (row * pitch) / scale);
  });
  ctx.restore();
}

const _hudCache = { hearts: null, coins: null, keys: null, bombs: null, leftPanel: null, familiars: null, turrets: null, minions: null, synergy: null, floor: null, hitFlash: null, statSec: null, proxItem: undefined };

function _hudBump(el, cls){
  if (!el) return;
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
}

const SYNERGY_BADGES = [
  { id: 'synEcosystem', flag: 'ecosystemSetActive' },
  { id: 'synRotRuin', flag: 'rotAndRuinActive' },
  { id: 'synMarksman', flag: 'marksmansEyeActive' },
  { id: 'synPackBond', flag: 'packBondActive' },
  { id: 'synTwinFangs', flag: 'twinFangsActive' },
];

function hudPanelEntry(label, thing){
  const body = thing
    ? '<div class="hudPanelName">' + (thing.icon ? thing.icon + ' ' : '') + thing.name + '</div>'
      + '<div class="hudPanelDesc">' + thing.desc + '</div>'
    : '<div class="hudPanelEmpty">None</div>';
  return '<div class="hudPanelTitle">' + label + '</div>' + body;
}

function hudPillReadout(game){
  let html = '<div class="hudPanelTitle">Pills</div>';
  let unknown = 0, known = 0;
  for (const c of PILL_COLORS) {
    if (!(game.pillIdentified && game.pillIdentified[c.id])) { unknown++; continue; }
    const effect = PILL_EFFECTS[game.pillEffectMap[c.id]];
    if (!effect) { unknown++; continue; }
    known++;
    html += '<div class="hudPillRow">'
      + '<span class="hudPillSwatch" style="background:' + c.color + '"></span>'
      + '<span class="hudPillName">' + c.name + '</span>'
      + '<span class="hudPillEffect ' + (effect.good ? 'good' : 'bad') + '" title="' + effect.desc + '">' + effect.name + '</span>'
      + '</div>';
  }
  if (!known) html += '<div class="hudPanelEmpty">None identified yet</div>';
  if (unknown) html += '<div class="hudPillRow"><span class="hudPillEffect unknown">??? — ' + unknown + ' unknown</span></div>';
  return html;
}

function updateHUD(game){
  const player = game.player;

  let canvas = document.getElementById('heartsCanvas');
  let freshCanvas = false;
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'heartsCanvas';
    canvas.height = 22;
    document.getElementById('hearts').appendChild(canvas);
    freshCanvas = true;
  }
  const heartsKey = player.redMax + '|' + player.redCurrent + '|' + player.blueCurrent + '|' + (player.eternalHeart ? 1 : 0);
  if (freshCanvas || heartsKey !== _hudCache.hearts) {
    _hudCache.hearts = heartsKey;
    const blueWhole = Math.ceil(player.blueCurrent);

    const redPips = Math.ceil(player.redMax);
    canvas.width = Math.max(1, (redPips + blueWhole) * 20);
    const hctx = canvas.getContext('2d');
    hctx.clearRect(0, 0, canvas.width, canvas.height);
    let idx = 0;
    for (let i = 0; i < redPips; i++) {
      const frac = Util.clamp(player.redCurrent - i, 0, 1);

      const eternal = player.eternalHeart && i === redPips - 1;
      Util.drawHeart(hctx, idx * 20, 2, 18, frac, eternal ? '#e8e8e8' : '#e35b6a', eternal ? '#2a2430' : '#160b0d');
      idx++;
    }
    let remBlue = player.blueCurrent;
    while (remBlue > 0.001) {
      const frac = Util.clamp(remBlue, 0, 1);
      Util.drawHeart(hctx, idx * 20, 2, 18, frac, '#5b9ee3', '#0b1420');
      remBlue -= 1; idx++;
    }
  }

  const canvasWrap = document.getElementById('canvasWrap');
  const lowHealth = player.totalHearts() <= 1;
  if (canvasWrap) canvasWrap.classList.toggle('low-health', lowHealth);

  const heartsRow = document.getElementById('hearts');
  if (heartsRow) heartsRow.classList.toggle('low-health', lowHealth);

  if (player.coins !== _hudCache.coins) {
    const firstRun = _hudCache.coins === null;
    _hudCache.coins = player.coins;
    document.querySelector('#resCoins b').textContent = Util.formatNum(player.coins);

    if (!firstRun && player.coins > (_hudCache._prevCoins || 0)) _hudBump(document.getElementById('resCoins'), 'res-bump');
    _hudCache._prevCoins = player.coins;
  }
  const keysEl = document.getElementById('resKeys'), bombsEl = document.getElementById('resBombs');

  const keysText = player.unlimitedKeysFloor ? '∞' : String(player.keys);
  if (keysText !== _hudCache.keys) {
    const keysUp = _hudCache.keys !== null && player.keys > (_hudCache._prevKeys || 0);
    _hudCache.keys = keysText;
    _hudCache._prevKeys = player.keys;
    keysEl.querySelector('b').textContent = keysText;

    keysEl.classList.toggle('res-empty', !player.unlimitedKeysFloor && player.keys === 0);
    if (keysUp) _hudBump(keysEl, 'res-bump');
  }
  const bombsText = (player.unlimitedBombsFloor || player.unlimitedBombsAlways) ? '∞' : String(player.bombs);
  if (bombsText !== _hudCache.bombs) {
    const bombsUp = _hudCache.bombs !== null && player.bombs > (_hudCache._prevBombs || 0);
    _hudCache.bombs = bombsText;
    _hudCache._prevBombs = player.bombs;
    bombsEl.querySelector('b').textContent = bombsText;
    bombsEl.classList.toggle('res-empty', !player.unlimitedBombsFloor && !player.unlimitedBombsAlways && player.bombs === 0);
    if (bombsUp) _hudBump(bombsEl, 'res-bump');
  }

  const floorText = floorLabelFor(game.dungeon.floorNum, game.floorPath) + ' — ' + floorNameFor(game.dungeon.floorNum, game.floorPath);
  if (floorText !== _hudCache.floor) {
    const notFirstRun = _hudCache.floor !== null;
    _hudCache.floor = floorText;
    document.querySelector('#resFloor b').textContent = floorText;
    if (notFirstRun) _hudBump(document.getElementById('resFloor'), 'floor-bump');
  }

  if (player._hitFlashAt && player._hitFlashAt !== _hudCache.hitFlash) {
    _hudCache.hitFlash = player._hitFlashAt;
    _hudBump(canvasWrap, 'hit-flash');
  }
  const screenshotBtn = document.getElementById('screenshotBtn');
  if (screenshotBtn) screenshotBtn.classList.remove('hidden');

  const turretsEl = document.getElementById('resTurrets');

  const hasTurretAbility = !!(player.canBuildTurrets || player.canPlantMarkers || player.canDropStacks || player.canConjureWards || player.canPlantSentries);
  if (turretsEl) {
    turretsEl.classList.toggle('hidden', !hasTurretAbility);
    if (hasTurretAbility) {
      const count = (game.currentRoom.playerTurrets || []).length;
      const turretsText = count + '/3';
      if (turretsText !== _hudCache.turrets) {
        _hudCache.turrets = turretsText;
        turretsEl.querySelector('b').textContent = turretsText;
      }
    }
  }

  const touchTurretBtn = document.getElementById('touchTurretBtn');
  if (touchTurretBtn) touchTurretBtn.classList.toggle('hidden', !hasTurretAbility);

  const sideBuildBtn = document.getElementById('sideActionBuildTurret');
  if (sideBuildBtn) sideBuildBtn.classList.toggle('hidden', !hasTurretAbility);
  const sideDestroyBtn = document.getElementById('sideActionDestroyTurret');
  if (sideDestroyBtn) sideDestroyBtn.classList.toggle('hidden', !hasTurretAbility || !((game.currentRoom.playerTurrets || []).length));

  const sidePocketBtn = document.getElementById('sideActionPocket');
  if (sidePocketBtn) sidePocketBtn.classList.toggle('hidden', !player.pocketActive);

  const sideDonateBtn = document.getElementById('sideActionDonateArcade');
  if (sideDonateBtn) {
    const node = game.currentRoom;
    const hasDonateOrArcade = !!(node.donationMachine || (node.karmaMachines && node.karmaMachines.length) || (node.fillies && node.fillies.length) || (node.machines && node.machines.length));
    sideDonateBtn.classList.toggle('hidden', !hasDonateOrArcade);
  }

  const minionsEl = document.getElementById('resMinions');

  const hasMinionSummon = !!(player.summonsChangelings || player.summonsRoostmates || player.summonsThralls || player.summonsHive || player.summonsBrood);
  if (minionsEl) {
    minionsEl.classList.toggle('hidden', !hasMinionSummon);
    if (hasMinionSummon) {
      const minionsText = (player.changelingMinions || []).length + '/' + player.maxChangelingMinions;
      if (minionsText !== _hudCache.minions) {
        _hudCache.minions = minionsText;
        minionsEl.querySelector('b').textContent = minionsText;
      }
    }
  }

  const synKey = SYNERGY_BADGES.map(s => player[s.flag] ? '1' : '0').join('');
  if (synKey !== _hudCache.synergy) {
    const prevKey = _hudCache.synergy || '';
    _hudCache.synergy = synKey;
    SYNERGY_BADGES.forEach((s, i) => {
      const el = document.getElementById(s.id);
      if (!el) return;
      const isActive = !!player[s.flag];
      el.classList.toggle('active', isActive);

      if (isActive && prevKey[i] !== '1') {
        el.classList.remove('just-activated');
        void el.offsetWidth;
        el.classList.add('just-activated');
      }
    });
  }

  const iconEl = document.getElementById('activeItemIcon');
  const pipsEl = document.getElementById('activeItemPips');
  if (player.activeItem) {
    iconEl.textContent = player.activeItem.icon;
    iconEl.title = player.activeItem.name + ': ' + player.activeItem.desc;
    pipsEl.innerHTML = '';
    for (let i = 0; i < player.activeItem.maxCharge; i++) {
      const pip = document.createElement('div');
      pip.className = 'pip' + (i < player.activeCharge ? ' full' : '');
      pipsEl.appendChild(pip);
    }

    iconEl.classList.toggle('ready-glow', player.activeCharge >= player.activeItem.maxCharge);
  } else {
    iconEl.textContent = '—'; iconEl.title = ''; pipsEl.innerHTML = '';
    iconEl.classList.remove('ready-glow');
  }

  const touchActiveBtn = document.getElementById('touchActiveBtn');
  if (touchActiveBtn) touchActiveBtn.classList.toggle('ready-glow', !!player.activeItem && player.activeCharge >= player.activeItem.maxCharge);

  const pocketRowEl = document.getElementById('pocketItemRow');
  if (pocketRowEl) {
    pocketRowEl.classList.toggle('hidden', !player.pocketActive);
    if (player.pocketActive) {
      const pIconEl = document.getElementById('pocketItemIcon');
      const pPipsEl = document.getElementById('pocketItemPips');
      pIconEl.textContent = player.pocketActive.icon;
      pIconEl.title = player.pocketActive.name + ': ' + player.pocketActive.desc;
      pPipsEl.innerHTML = '';
      for (let i = 0; i < player.pocketActive.maxCharge; i++) {
        const pip = document.createElement('div');
        pip.className = 'pip' + (i < player.pocketCharge ? ' full' : '');
        pPipsEl.appendChild(pip);
      }
      pIconEl.classList.toggle('ready-glow', player.pocketCharge >= player.pocketActive.maxCharge);
    }
  }
  const sidePocketReadyBtn = document.getElementById('sideActionPocket');
  if (sidePocketReadyBtn) sidePocketReadyBtn.classList.toggle('ready-glow', !!player.pocketActive && player.pocketCharge >= player.pocketActive.maxCharge);

  const trinketEl = document.getElementById('trinketIcon');
  if (trinketEl) {
    const trinket = player.trinketId ? TRINKETS[player.trinketId] : null;
    trinketEl.textContent = trinket ? trinket.icon : '—';
    trinketEl.title = trinket ? (trinket.name + ': ' + trinket.desc) : 'No trinket equipped';
    trinketEl.classList.toggle('empty', !trinket);
  }

  const pillEl = document.getElementById('pillIcon');
  if (pillEl) {
    const colorId = player.pillPocket;
    const color = colorId ? PILL_COLORS_BY_ID[colorId] : null;
    pillEl.textContent = color ? '💊' : '—';
    pillEl.style.color = color ? color.color : '';
    if (color) {
      const known = game.pillIdentified && game.pillIdentified[colorId];
      pillEl.title = known ? (color.name + ': ' + PILL_EFFECTS[game.pillEffectMap[colorId]].name + ' (Q to use)') : (color.name + ': unknown effect (Q to use)');
    } else {
      pillEl.title = 'No pill held';
    }
    pillEl.classList.toggle('empty', !color);
    pillEl.classList.toggle('ready-glow', !!color);
  }
  const touchPillBtn = document.getElementById('touchPillBtn');
  if (touchPillBtn) touchPillBtn.classList.toggle('ready-glow', !!(player.pillPocket));

  const starEl = document.getElementById('starIcon');
  if (starEl) {
    const starId = player.starPocket;
    const star = starId ? STAR_TYPES[starId] : null;
    starEl.textContent = star ? star.icon : '—';
    starEl.style.color = star ? star.color : '';
    starEl.title = star ? (star.name + ': ' + star.desc + ' (R to use)') : 'No star held';
    starEl.classList.toggle('empty', !star);
    starEl.classList.toggle('ready-glow', !!star);
  }
  const touchStarBtn = document.getElementById('touchStarBtn');
  if (touchStarBtn) touchStarBtn.classList.toggle('ready-glow', !!(player.starPocket));

  const cooldown = player.attackType === 'melee' ? player.meleeCooldown : player.fireCooldown;
  const dmg = player.attackType === 'melee' ? player.meleeDamage : player.rangedDamage;
  document.querySelector('#statSpeed b').textContent = Util.formatNum(player.speed);
  document.querySelector('#statRate b').textContent = (1 / cooldown).toFixed(1) + '/s';
  document.querySelector('#statDamage b').textContent = Util.formatNum(dmg * 10) / 10;
  document.querySelector('#statLuck b').textContent = Util.formatNum(player.luck);
  const rangeEl = document.querySelector('#statRange b');
  if (player.laser) { rangeEl.textContent = '∞'; rangeEl.parentElement.title = 'Pony Bot\'s laser ignores Range entirely.'; }
  else if (player.unlimitedRange) { rangeEl.textContent = '∞'; rangeEl.parentElement.title = "Breezie's bolts never run out of range — only a wall stops them."; }
  else { rangeEl.textContent = player.rangeTiles.toFixed(2).replace(/\.?0+$/, ''); rangeEl.parentElement.title = 'Attack range, in tiles.'; }

  const passivesBar = document.getElementById('passivesBar');
  passivesBar.innerHTML = '';
  const shownPassives = Object.assign({}, player.passives, player.statPassives);
  for (const id in shownPassives) {
    const item = ITEMS[id];
    const count = shownPassives[id];
    const chip = document.createElement('div');
    chip.className = 'passive-chip';
    chip.textContent = item.icon;
    chip.title = item.name + (count > 1 ? ' x' + count : '') + ' — ' + item.desc;
    passivesBar.appendChild(chip);
  }

  const familiarBar = document.getElementById('familiarBar');
  if (familiarBar) {
    const counts = {};
    const order = [];
    for (const f of player.familiars) {
      if (!f.def) continue;
      if (!counts[f.def.id]) { counts[f.def.id] = 0; order.push(f.def); }
      counts[f.def.id]++;
    }
    const famKey = order.map(d => d.id + ':' + counts[d.id]).join(',');
    if (famKey !== _hudCache.familiars) {
      _hudCache.familiars = famKey;
      familiarBar.innerHTML = '';
      for (const def of order) {
        const chip = document.createElement('div');
        chip.className = 'familiar-chip';
        chip.textContent = def.icon;
        chip.title = def.name + (counts[def.id] > 1 ? ' x' + counts[def.id] : '') + ' — ' + def.desc;
        if (counts[def.id] > 1) {
          const badge = document.createElement('span');
          badge.className = 'chip-count';
          badge.textContent = counts[def.id];
          chip.appendChild(badge);
        }
        familiarBar.appendChild(chip);
      }
    }
  }

  const leftActiveEl = document.getElementById('leftPanelActive');
  if (leftActiveEl) {
    const trinket = player.trinketId ? TRINKETS[player.trinketId] : null;
    const star = player.starPocket ? STAR_TYPES[player.starPocket] : null;
    let idKey = (player.activeItem ? player.activeItem.id : '-') + '|' + (player.trinketId || '-') + '|' + (player.starPocket || '-') + '|';

    for (const c of PILL_COLORS) idKey += (game.pillIdentified && game.pillIdentified[c.id]) ? (game.pillEffectMap[c.id] || '?') : '0';
    if (idKey !== _hudCache.leftPanel) {
      _hudCache.leftPanel = idKey;
      leftActiveEl.innerHTML = hudPanelEntry('Active Item', player.activeItem || null);
      document.getElementById('leftPanelTrinket').innerHTML = hudPanelEntry('Trinket', trinket);
      document.getElementById('leftPanelStar').innerHTML = hudPanelEntry('Star', star);
      document.getElementById('leftPanelPills').innerHTML = hudPillReadout(game);
    }
  }

  updateStatPanel(game);
  updateLogPanel(game);
  updateItemProxTooltip(game);
}

function updateStatPanel(game){
  const body = document.getElementById('statPanelBody');
  if (!body) return;
  const sec = Math.floor(game.runElapsed || 0);
  if (sec === _hudCache.statSec) return;
  _hudCache.statSec = sec;

  const p = game.player;

  const alignment = game.dealAlignment
    ? (game.dealAlignment === 'crystal' ? 'Crystal' : 'Sombra')
    : 'Unset';
  const dealFreebieSpent = !!(p && p.dealFreebieUsed);
  const dealPct = dealFreebieSpent ? 0
    : ((p && p.tookDamageThisFloor) ? 16 : 50);

  const row = (label, val) => '<div class="statRow"><span>' + label + '</span><span>' + val + '</span></div>';
  const head = (label) => '<div class="statSectionHead">' + label + '</div>';
  const pct = (v) => Math.round((v || 0) * 100) + '%';

  const dmg = p ? (p.attackType === 'melee' ? p.meleeDamage : p.rangedDamage) : 0;
  const cooldown = p ? (p.attackType === 'melee' ? p.meleeCooldown : p.fireCooldown) : 0;
  const fireRate = cooldown > 0 ? (1 / cooldown).toFixed(1) : '—';

  body.innerHTML =
    head('Main Stats') +
    row('Damage', dmg ? dmg.toFixed(1) : 0) +
    row('Speed', p ? p.speed.toFixed(2) : 0) +
    row('Range', p ? p.rangeTiles.toFixed(1) : 0) +
    row('Fire Rate', fireRate + '/s') +
    row('Luck', p ? p.luck : 0) +
    head('Chance Stats') +
    row('Crit %', pct(p && p.critChance)) +
    row('Lifesteal %', pct(p && p.lifestealChance)) +
    row('Freeze %', pct(p && p.freezeChance)) +
    row('Venom %', pct(p && p.venomChance)) +
    row('Stun %', pct(p && p.stunChance)) +
    row('Charm %', pct(p && p.charmChance)) +
    row('Fear %', pct(p && p.fearChance)) +
    head('Deals') +
    row('Alignment', alignment) +
    row('Deal Chance', dealPct + '%');
}

function updateLogPanel(game){
  const list = document.getElementById('logPanelList');
  if (!list) return;
  const len = (game.runLog || []).length;
  if (len === _hudCache.logLen) return;
  _hudCache.logLen = len;

  if (!len) { list.innerHTML = '<div class="hudPanelEmpty">Nothing yet.</div>'; return; }

  const fmtTime = (t) => {
    const s = Math.max(0, Math.floor(t || 0));
    const m = Math.floor(s / 60), r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  };

  let html = '';
  for (let i = game.runLog.length - 1; i >= 0; i--) {
    const e = game.runLog[i];
    html += '<div class="logRow"><span class="logTime">' + fmtTime(e.time) + '</span><span class="logLabel">' + e.label + '</span></div>';
  }
  list.innerHTML = html;
}

const ITEM_PROX_RADIUS = 70;

function itemProxThingFromSlot(slot){
  if (!slot || slot.bought) return null;
  if (slot.kind === 'item') return slot.item;
  if (slot.kind === 'trinket') return slot.trinket;
  if (slot.kind === 'familiar') return slot.familiar;
  return null;
}

function updateItemProxTooltip(game){
  const panel = document.getElementById('itemProxTooltip');
  const body = document.getElementById('itemProxTooltipBody');
  if (!panel || !body) return;
  const node = game.currentRoom;
  const player = game.player;
  let best = null, bestD = ITEM_PROX_RADIUS;

  if (node && player) {
    const consider = (thing, tx, ty) => {
      if (!thing || !thing.name) return;
      const d = Util.dist(player.x, player.y, tx * TILE, ty * TILE);
      if (d < bestD) { bestD = d; best = thing; }
    };
    if (node.shopSlots) {
      for (const slot of node.shopSlots) consider(itemProxThingFromSlot(slot), slot.x, slot.y);
    }
    if (node.itemPedestals) {
      for (const ped of node.itemPedestals) { if (!ped.taken) consider(ped.item, ped.x, ped.y); }
    }
  }

  const key = best ? (best.id || best.name) : null;
  if (key === _hudCache.proxItem) return;
  _hudCache.proxItem = key;

  if (!best) { panel.classList.add('hud-panel-hidden'); body.innerHTML = ''; return; }
  panel.classList.remove('hud-panel-hidden');
  body.innerHTML = '<div class="hudPanelName">' + (best.icon ? best.icon + ' ' : '') + best.name + '</div>'
    + (best.desc ? '<div class="hudPanelDesc">' + best.desc + '</div>' : '');
}

let _mmCanvas = null;
let _mmDungeon = null;
let _mmKey = '';

let _mmZoom = 1, _mmPanX = 0, _mmPanY = 0;
let _mmUserAdjusted = false;
let _mmLastCurNode = null;
let _mmDragging = false, _mmDragMoved = false, _mmDragLastX = 0, _mmDragLastY = 0;
const MM_ZOOM_MIN = 1, MM_ZOOM_MAX = 3, MM_ZOOM_STEP = 0.25;

let _mmBlockMap = new Map();

function resetMinimapCamera(){
  _mmZoom = 1; _mmPanX = 0; _mmPanY = 0; _mmUserAdjusted = false;
}

function minimapCacheKey(game){
  let key = game.currentRoom.id + '|' + (game.player.revealMap ? 1 : 0);
  for (const node of game.dungeon.rooms.values()) {
    if (node.discovered) key += 'd';
    else if (node.revealed) key += 'r';
    else if (node.seen) key += 's';
    else key += '.';
  }
  return key;
}

function drawMinimap(game){
  const canvas = document.getElementById('minimap');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const dungeon = game.dungeon;
  const curNode = game.currentRoom;
  const cellSize = 13;
  const originX = canvas.width / 2, originY = canvas.height / 2;
  const toScreen = (bx, by) => ({ x: originX + (bx - curNode.gx) * cellSize, y: originY + (by - curNode.gy) * cellSize });

  if (_mmLastCurNode !== curNode) { _mmLastCurNode = curNode; _mmPanX = 0; _mmPanY = 0; }

  const knowsExistence = (node) => node.discovered || node.seen || node.revealed || game.player.revealMap;
  const knowsType = (node) => node.discovered || node.revealed || game.player.revealMap;

  const key = minimapCacheKey(game);
  if (!_mmCanvas || _mmDungeon !== dungeon || _mmKey !== key
      || _mmCanvas.width !== canvas.width || _mmCanvas.height !== canvas.height) {
    _mmDungeon = dungeon;
    _mmKey = key;
    if (!_mmCanvas) _mmCanvas = document.createElement('canvas');
    if (_mmCanvas.width !== canvas.width) _mmCanvas.width = canvas.width;
    if (_mmCanvas.height !== canvas.height) _mmCanvas.height = canvas.height;
    const bctx = _mmCanvas.getContext('2d');
    bctx.clearRect(0, 0, _mmCanvas.width, _mmCanvas.height);
    _mmBlockMap = new Map();

    bctx.strokeStyle = 'rgba(255,255,255,.35)';
    bctx.lineWidth = 2.5;
    bctx.lineCap = 'round';
    for (const node of dungeon.rooms.values()) {
      if (!knowsExistence(node)) continue;
      for (const slot of node.doorSlots) {
        if (slot.type !== 'normal' || !slot.pairedSlot) continue;
        const other = slot.pairedSlot.room;
        if (other.id < node.id || !knowsExistence(other)) continue;
        const a = toScreen(slot.bx, slot.by);
        const b = toScreen(slot.pairedSlot.bx, slot.pairedSlot.by);
        bctx.beginPath(); bctx.moveTo(a.x, a.y); bctx.lineTo(b.x, b.y); bctx.stroke();
      }
    }

    for (const node of dungeon.rooms.values()) {
      if (!knowsExistence(node)) continue;
      const known = knowsType(node);
      const color = known ? roomTypeColor(node.type) : '#2c2847';
      const mask = node.shape.mask;
      for (let r = 0; r < mask.length; r++) {
        for (let c = 0; c < mask[r].length; c++) {
          if (!mask[r][c]) continue;
          _mmBlockMap.set((node.gx + c) + ',' + (node.gy + r), node);
          const { x: px, y: py } = toScreen(node.gx + c, node.gy + r);
          if (px < -cellSize || py < -cellSize || px > canvas.width + cellSize || py > canvas.height + cellSize) continue;
          const s = cellSize - 2;

          bctx.fillStyle = color;
          if (bctx.roundRect) { bctx.beginPath(); bctx.roundRect(px - s / 2, py - s / 2, s, s, 2); bctx.fill(); }
          else bctx.fillRect(px - s / 2, py - s / 2, s, s);
          bctx.strokeStyle = known ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.06)';
          bctx.lineWidth = 1;
          bctx.strokeRect(px - s / 2 + 0.5, py - s / 2 + 0.5, s - 1, s - 1);
        }
      }
    }
  }

  ctx.save();
  ctx.translate(originX + _mmPanX - _mmZoom * originX, originY + _mmPanY - _mmZoom * originY);
  ctx.scale(_mmZoom, _mmZoom);

  ctx.drawImage(_mmCanvas, 0, 0);

  for (const node of dungeon.rooms.values()) {
    if (!knowsExistence(node)) continue;
    const mask = node.shape.mask;
    if (node === curNode) {
      for (let r = 0; r < mask.length; r++) {
        for (let c = 0; c < mask[r].length; c++) {
          if (!mask[r][c]) continue;
          const { x: px, y: py } = toScreen(node.gx + c, node.gy + r);
          if (px < -cellSize || py < -cellSize || px > canvas.width + cellSize || py > canvas.height + cellSize) continue;
          const s = cellSize - 2;

          const pulse = 0.5 + 0.5 * Math.sin((game.now || 0) / 260);
          ctx.strokeStyle = `rgba(255,255,255,${0.6 + pulse * 0.4})`;
          ctx.lineWidth = 1.5 + pulse;
          ctx.strokeRect(px - s / 2 + 0.5, py - s / 2 + 0.5, s - 1, s - 1);
        }
      }
    }

    const centroid = roomCentroidBlock(node);
    const { x: icx, y: icy } = toScreen(centroid.bx, centroid.by);
    const hasTypeIcon = !!ROOM_TYPE_ICON[node.type];
    if (hasTypeIcon) {
      ctx.font = 'bold ' + Math.floor(cellSize * 0.9) + 'px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(10,8,20,.85)';
      ctx.fillText(ROOM_TYPE_ICON[node.type], icx, icy + 1);
    }

    if (node.discovered) {
      const lootY = hasTypeIcon ? icy + cellSize * 0.85 : icy;
      drawLootMarkers(ctx, roomLootEntries(node), icx, lootY);
    }

    const pinIcon = (typeof getMinimapPinIcon === 'function') ? getMinimapPinIcon(game, node.id) : null;
    if (pinIcon) {
      const { x: pinX, y: pinY } = toScreen(node.gx - 0.25, node.gy - 0.25);
      drawMinimapPin(ctx, pinX, pinY, pinIcon, cellSize);
    }
  }

  ctx.restore();
}

function minimapUnprojectNode(game, canvas, clientX, clientY){
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const sx = (clientX - rect.left) * (canvas.width / rect.width);
  const sy = (clientY - rect.top) * (canvas.height / rect.height);
  const originX = canvas.width / 2, originY = canvas.height / 2;
  const curNode = game.currentRoom;
  const cellSize = 13;
  const ux = originX + (sx - originX - _mmPanX) / _mmZoom;
  const uy = originY + (sy - originY - _mmPanY) / _mmZoom;
  const bx = Math.round(curNode.gx + (ux - originX) / cellSize);
  const by = Math.round(curNode.gy + (uy - originY) / cellSize);
  return _mmBlockMap.get(bx + ',' + by) || null;
}

function minimapHandleWheel(game, canvas, e){
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const sx = (e.clientX - rect.left) * (canvas.width / rect.width);
  const sy = (e.clientY - rect.top) * (canvas.height / rect.height);
  const originX = canvas.width / 2, originY = canvas.height / 2;
  const ux = originX + (sx - originX - _mmPanX) / _mmZoom;
  const uy = originY + (sy - originY - _mmPanY) / _mmZoom;
  const dir = e.deltaY > 0 ? -1 : 1;
  const newZoom = Util.clamp(_mmZoom + dir * MM_ZOOM_STEP, MM_ZOOM_MIN, MM_ZOOM_MAX);
  if (newZoom === _mmZoom) return;
  _mmPanX = sx - originX - (ux - originX) * newZoom;
  _mmPanY = sy - originY - (uy - originY) * newZoom;
  _mmZoom = newZoom;
  _mmUserAdjusted = true;
}

function minimapHandlePointerDown(e){
  _mmDragging = true; _mmDragMoved = false;
  _mmDragLastX = e.clientX; _mmDragLastY = e.clientY;
}

function minimapHandlePointerMove(e){
  if (!_mmDragging) return false;
  const dx = e.clientX - _mmDragLastX, dy = e.clientY - _mmDragLastY;
  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) _mmDragMoved = true;
  if (_mmDragMoved) {
    _mmPanX += dx; _mmPanY += dy;
    _mmUserAdjusted = true;
    _mmDragLastX = e.clientX; _mmDragLastY = e.clientY;
  }
  return _mmDragMoved;
}

function minimapHandlePointerUp(){
  const wasDrag = _mmDragging && _mmDragMoved;
  _mmDragging = false; _mmDragMoved = false;
  return wasDrag;
}

function updateMinimapTooltip(game, canvas, node, clientX, clientY){
  const wrap = document.getElementById('minimapWrap');
  const tip = document.getElementById('minimapTooltip');
  if (!wrap || !tip) return;
  if (!node) { tip.classList.add('hidden'); return; }
  const knowsType = node.discovered || node.revealed || game.player.revealMap;
  const titleEl = document.getElementById('minimapTooltipTitle');
  titleEl.textContent = knowsType ? (ROOM_TYPE_LEGEND[node.type] || 'Room') : 'Unexplored';
  if (node === game.currentRoom) titleEl.textContent += ' (here)';

  const tipCanvas = document.getElementById('minimapTooltipCanvas');
  const tctx = tipCanvas.getContext('2d');
  tctx.clearRect(0, 0, tipCanvas.width, tipCanvas.height);
  let entries = [];
  if (node.discovered) entries = roomLootEntries(node);
  if (entries.length) {
    tipCanvas.classList.remove('hidden');
    drawLootMarkers(tctx, entries, tipCanvas.width / 2, tipCanvas.height / 2);
  } else {
    tipCanvas.classList.add('hidden');
  }

  const wrapRect = wrap.getBoundingClientRect();
  tip.style.left = Math.round(clientX - wrapRect.left + 12) + 'px';
  tip.style.top = Math.round(clientY - wrapRect.top + 12) + 'px';
  tip.classList.remove('hidden');
}

function hideMinimapTooltip(){
  const tip = document.getElementById('minimapTooltip');
  if (tip) tip.classList.add('hidden');
}

let _toastTimer = null;
let _toastQueue = [];
let _toastShowing = false;

function toast(msg, long, kind){
  _toastQueue.push({ msg, long, kind });
  if (!_toastShowing) advanceToastQueue();
}
function advanceToastQueue(){
  const el = document.getElementById('toast');
  const next = _toastQueue.shift();
  if (!next) { _toastShowing = false; return; }
  _toastShowing = true;
  el.textContent = next.msg;
  el.classList.remove('toast-good', 'toast-bad', 'toast-info');
  if (next.kind) el.classList.add('toast-' + next.kind);
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(advanceToastQueue, 180);
  }, next.long ? 3200 : 2200);
}

let _bannerTimer = null;

function showRoomBanner(text, roomType){
  const el = document.getElementById('roomBanner');

  const icon = roomType && ROOM_TYPE_ICON[roomType];
  el.textContent = icon ? icon + '  ' + text : text;
  el.classList.add('show');
  el.style.setProperty('--banner-color', roomType ? roomTypeColor(roomType) : '');
  clearTimeout(_bannerTimer);
  _bannerTimer = setTimeout(() => el.classList.remove('show'), 1600);
}

let _lastExaminePed = null;
function showItemExamine(ped, player){
  const el = document.getElementById('itemExamine');
  if (!ped) { el.classList.remove('show'); _lastExaminePed = null; return; }
  const thing = ped.item;
  const kindLabel = ped.isTrinket ? 'Trinket' : ped.isFamiliar ? 'Familiar' : ped.isStar ? 'Star' : (thing.type === 'active' ? 'Active Item' : 'Passive Item');
  const iconEl = document.getElementById('itemExamineIcon');
  iconEl.textContent = thing.icon;

  if (ped !== _lastExaminePed) {
    _lastExaminePed = ped;
    iconEl.classList.remove('examine-pop');
    void iconEl.offsetWidth;
    iconEl.classList.add('examine-pop');
  }
  document.getElementById('itemExamineName').textContent = thing.name;
  document.getElementById('itemExamineQuality').textContent = thing.quality
    ? kindLabel + ' — ' + '★'.repeat(thing.quality) + '☆'.repeat(4 - thing.quality)
    : kindLabel;
  document.getElementById('itemExamineDesc').textContent = thing.desc;

  const swapEl = document.getElementById('itemExamineSwap');
  if (swapEl) {
    if (ped.isTrinket && player && player.trinketId && player.trinketId !== thing.id) {
      swapEl.textContent = 'Will replace: ' + TRINKETS[player.trinketId].name;
      swapEl.classList.remove('hidden');
    } else {
      swapEl.textContent = '';
      swapEl.classList.add('hidden');
    }
  }

  const costEl = document.getElementById('itemExamineCost');
  if (costEl) {
    if (ped.isDeal && player) {
      let label;
      if (player.def.id === 'kirin') {
        label = player.dealFreebieUsed ? null : 'FREE';
      } else {
        const q = thing.quality || 1;
        const containerCost = q <= 2 ? 1 : 2;
        const blueCost = q <= 2 ? 2 : 3;
        const discount = Math.min(1, player.dealDiscount || 0);
        if (!player.def.noRedContainers && (player.redMax - containerCost) >= 1) {
          const effectiveCost = Math.max(0, Math.round(containerCost * (1 - discount)));
          label = effectiveCost > 0 ? ('Cost: -' + effectiveCost + ' heart container') : 'Cost: FREE';
        } else {
          const effectiveCost = Math.max(0, Math.round(blueCost * (1 - discount)));
          label = effectiveCost > 0 ? ('Cost: -' + effectiveCost + ' blue hearts') : 'Cost: FREE';
        }
      }
      if (label) {
        costEl.textContent = label;
        costEl.classList.remove('hidden');
      } else {
        costEl.textContent = '';
        costEl.classList.add('hidden');
      }
    } else {
      costEl.textContent = '';
      costEl.classList.add('hidden');
    }
  }
  el.classList.add('show');
}

function buildClassSelect(onPick){
  const wrap = document.getElementById('classSelect');
  wrap.innerHTML = '';
  const unlocks = loadUnlocks();
  let _cardIndex = 0;
  for (const id in CLASSES) {
    const def = CLASSES[id];
    const unlocked = def.unlocked || !!unlocks[id];
    const card = document.createElement('div');
    card.className = 'class-card' + (unlocked ? '' : ' locked');

    card.style.animationDelay = (Math.min(_cardIndex++, 16) * 28) + 'ms';

    const canvas = document.createElement('canvas');
    canvas.width = 120; canvas.height = 90;
    const cctx = canvas.getContext('2d');
    if (unlocked) {
      Util.drawPony(cctx, 60, 55, 62 * (def.sizeMult || 1), Object.assign({}, Util.classPonyOpts(def), { facing: { x: 0, y: -1 } }));
    } else {
      cctx.fillStyle = '#4a4560';
      cctx.font = '42px sans-serif';
      cctx.textAlign = 'center';
      cctx.fillText('?', 60, 68);
    }
    card.appendChild(canvas);

    const h = document.createElement('h3');
    h.textContent = unlocked ? def.name : '???';
    card.appendChild(h);

    const p = document.createElement('p');
    if (unlocked) {
      p.textContent = def.desc;
    } else {

      const unlockAchv = ACHIEVEMENTS.find(a => a.classId === id);
      const stats = ensureUnlockShape(unlocks).stats;
      const progress = unlockAchv && unlockAchv.statKey
        ? ' (' + Util.formatNum(stats[unlockAchv.statKey] || 0) + '/' + Util.formatNum(unlockAchv.threshold) + ')'
        : '';
      p.textContent = def.unlockHint + progress;
    }
    card.appendChild(p);

    if (unlocked) {
      const statsBlock = document.createElement('div');
      statsBlock.className = 'class-card-stats';
      const addStat = (label, value) => {
        const row = document.createElement('div');
        row.className = 'statRow';
        const l = document.createElement('span'); l.textContent = label;
        const v = document.createElement('span'); v.textContent = value;
        row.appendChild(l); row.appendChild(v);
        statsBlock.appendChild(row);
      };
      if (def.redMax) addStat('HP', Util.formatNum(def.redMax));
      if (def.speed) addStat('Speed', Util.formatNum(def.speed));
      const dmg = def.attackType === 'melee' ? def.meleeDamage : def.rangedDamage;
      if (dmg) addStat('Damage', Util.formatNum(dmg * 10) / 10);
      const cooldown = def.attackType === 'melee' ? def.meleeCooldown : def.fireCooldown;
      if (cooldown) addStat('Rate/s', (1 / cooldown).toFixed(1));
      if (def.baseRangeTiles) addStat('Range', def.baseRangeTiles);
      card.appendChild(statsBlock);
    }

    if (unlocked) {
      const classDefeats = (unlocks.classSuperbossDefeats && unlocks.classSuperbossDefeats[id]) || {};
      const routeCounts = {};
      for (const route of SUPERBOSS_ROUTE_ORDER) routeCounts[route] = { beaten: 0, total: 0 };
      for (const boss of SUPERBOSS_LIST) {
        const route = SUPERBOSS_ROUTE[boss.id] || 'main';
        routeCounts[route].total++;
        if (classDefeats[boss.id]) routeCounts[route].beaten++;
      }
      const routesRow = document.createElement('div');
      routesRow.className = 'class-superboss-routes';
      for (const route of SUPERBOSS_ROUTE_ORDER) {
        const rc = routeCounts[route];
        if (!rc.total) continue;
        const badge = document.createElement('span');
        badge.className = 'class-superboss-route'
          + (rc.beaten > 0 ? ' has-progress' : '')
          + (rc.beaten === rc.total ? ' complete' : '');
        badge.textContent = SUPERBOSS_ROUTE_LABELS[route] + ' ' + rc.beaten + '/' + rc.total;

        const names = (SUPERBOSS_ROUTE_SEQUENCE[route] || [])
          .map(id => SUPERBOSSES[id])
          .filter(Boolean)
          .map(b => (classDefeats[b.id] ? '✓ ' : '· ') + b.name)
          .join('\n');
        badge.title = SUPERBOSS_ROUTE_LABELS[route] + ' route superbosses beaten by ' + def.name + ':\n' + names;
        routesRow.appendChild(badge);
      }
      card.appendChild(routesRow);
    }

    if (unlocked) {
      card.addEventListener('click', () => { Sound.unlock(); Sound.play('uiClick'); onPick(id); });
    } else {
      card.addEventListener('click', () => { Sound.unlock(); Sound.play('uiDeny'); });
    }
    wrap.appendChild(card);
  }
}

function buildSuperbossTrophies(){
  const wrap = document.getElementById('trophyRow');
  if (!wrap) return;
  wrap.innerHTML = '';
  const unlocks = loadUnlocks();
  const defeats = unlocks.superbossDefeats || {};

  for (const route of SUPERBOSS_ROUTE_ORDER) {
    const bosses = (SUPERBOSS_ROUTE_SEQUENCE[route] || []).map(id => SUPERBOSSES[id]).filter(Boolean);
    if (!bosses.length) continue;

    const group = document.createElement('div');
    group.className = 'trophy-route-group';

    const label = document.createElement('div');
    label.className = 'trophy-route-label';
    label.textContent = SUPERBOSS_ROUTE_LABELS[route] + ' route';
    group.appendChild(label);

    const row = document.createElement('div');
    row.className = 'trophy-row';
    for (const boss of bosses) {
      const count = defeats[boss.id] || 0;
      const beaten = count > 0;
      const card = document.createElement('div');
      card.className = 'trophy' + (beaten ? ' beaten' : ' locked');

      const icon = document.createElement('div');
      icon.className = 'icon';
      icon.textContent = beaten ? boss.icon : '❓';
      card.appendChild(icon);

      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = beaten ? boss.name : '???';
      card.appendChild(name);

      if (beaten) {
        const countEl = document.createElement('div');
        countEl.className = 'count';
        countEl.textContent = count + 'x beaten';
        card.appendChild(countEl);
      }
      row.appendChild(card);
    }
    group.appendChild(row);
    wrap.appendChild(group);
  }
}
