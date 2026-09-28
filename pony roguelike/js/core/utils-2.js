'use strict';

const PONY_BUILD = {
  stout:   { bw:0.54, bh:0.39, hs:0.285, legW:0.115, legH:0.145, legX:0.24, neck:0.40, angular:false },
  lanky:   { bw:0.46, bh:0.31, hs:0.245, legW:0.082, legH:0.205, legX:0.20, neck:0.48, angular:false },
  round:   { bw:0.50, bh:0.43, hs:0.30,  legW:0.105, legH:0.12,  legX:0.22, neck:0.37, angular:false },
  angular: { bw:0.50, bh:0.34, hs:0.265, legW:0.10,  legH:0.175, legX:0.23, neck:0.43, angular:true  },
  compact: { bw:0.45, bh:0.35, hs:0.30,  legW:0.098, legH:0.135, legX:0.20, neck:0.36, angular:false },
  lean:    { bw:0.53, bh:0.31, hs:0.26,  legW:0.088, legH:0.19,  legX:0.23, neck:0.45, angular:false },
};

const CRYPT_ENEMY_MARKS = {
  barrowblink: { k:'rift', g:1, t:0.6, sp:420 },
  bonecaller: { k:'staff', g:1, t:0.5 },
  boneguard: { k:'shieldSlab', s:1.15, sd:1 },
  bonelobber: { k:'flail', sd:1 },
  bonepicker: { k:'beak', s:1 },
  boneskirmisher: { k:'blade', b:0, sd:1 },
  boneskitter: { k:'legs', n:3, len:0.9, s:0.9 },
  boulderroller: { k:'boulder', s:1 },
  charnelmites: { k:'orbit', n:4, s:0.8, g:1 },
  cryptcircler: { k:'spiral', n:5, g:1 },
  cryptcrawler: { k:'legs', n:4, len:1.3, s:1.1 },
  cryptleech: { k:'maw', n:8 },
  cryptmarksman: { k:'bow', s:1 },
  cryptmite: { k:'antennae', s:1 },
  cryptslinger: { k:'sling', sd:1 },
  cryptwarden: { k:'crown', n:5, t:0.6 },
  deathrattler: { k:'rattle', n:4 },
  dirgechanter: { k:'notes', n:3, g:1 },
  gravedigger: { k:'blade', b:2, sd:-1 },
  gravegrub: { k:'segments', n:4 },
  gravetender: { k:'sprout', n:3, t:0.35 },
  graveturret: { k:'barrel', s:1.1 },
  gravewisp: { k:'wisptail', g:1, t:0.65 },
  hollowknight: { k:'helm', s:1 },
  miasmadrifter: { k:'cloud', n:4, t:0.3 },
  ossuarysentry: { k:'ribs', n:4 },
  pallweaver: { k:'threads', n:4 },
  rattleraider: { k:'horns', s:1.1 },
  sarcophaguscrawler: { k:'slab' },
  shadestalker: { k:'hood', t:-0.3 },
  shellbone: { k:'shell', s:1.1 },
  shroudmoth: { k:'wings', w:'moth', s:1.1 },
  skeletalarcher: { k:'quiver', n:3 },
  skullcharger: { k:'skullface', s:1 },
  tombbloater: { k:'blisters', n:3, s:1.1 },
  tombguardian: { k:'pauldrons', s:1.15 },
  tombtoller: { k:'bell', s:1.1 },
  urnlurker: { k:'urn', s:1 },
  wailingspecter: { k:'waves', n:3, g:1 },
  witchlantern: { k:'lantern', g:1, t:0.7 },
  ossuarysaint: { k:'halo', g:1, t:0.7 },
  reliquarymite: { k:'gem', g:1, t:0.65 },
  pallbearer: { k:'slab', up:1, s:1.2 },
  candlewake: { k:'candles', n:3, g:1 },
  batscout: { k:'wings', w:'bat', s:1 },
  ravenpicker: { k:'plume', n:3 },
  dnbmoth: { k:'motes', n:5, t:0.5 },
  dnbmayfly: { k:'glyph', g:1 },
  gravelurker: { k:'mound', s:1.1 },
  bonerattler: { k:'spikes', n:5 },
  sepulchertwin: { k:'double', t:0.4 },
  coffincrawler: { k:'nails', n:5 },
  wraitharcher: { k:'bow', s:1.15, g:1, t:0.6 },
  crypthive: { k:'hexcells', n:4 },
  dnbfly: { k:'bigeye', s:0.9 },
  cryptbombhive: { k:'fuse', g:1 },
  cryptwallhugger: { k:'pads', n:4 },
  cryptbloat: { k:'drips', n:4, t:0.35 },
  cryptjumper: { k:'coil', n:3 },
  cryptstrider: { k:'legs', n:2, len:2.0, s:0.8 },
  crypthaunter: { k:'ghosttail', t:0.5 },
  dnbfirecircler: { k:'flames', n:3, g:1 },
  graverobber: { k:'sack', sd:-1 },
  coffinlid: { k:'boxlid', s:1.1 },
  chainrattler: { k:'chains', n:4 },
  bonepiler: { k:'stack', n:3 },
  bonecrawler: { k:'claws', s:1 },
  epitaphreader: { k:'tablet', s:1 },
  mourner: { k:'veil', s:1 },
  sexton: { k:'keys', n:3 },
  sarcophagus: { k:'mask', s:1 },
  armoredsarcophagus: { k:'plates', n:3, s:1.15 },
  tombscribe: { k:'quill', s:1.05, t:0.5 },
  grudgebell: { k:'clapper', s:1.1, g:1, sp:420 },
  ashenwidow: { k:'spinneret', n:4, s:1 },
  sableescort: { k:'banner', s:1.05, t:0.55 },
  cindermarrow: { k:'embers', n:5, g:1, sp:360 },
  rookossuary: { k:'battlement', n:4, s:1.1 },
  boneloom: { k:'shuttle', n:6, s:1, sp:300 },
  vaultjailer: { k:'cage', n:5, s:1.1 },
  gristlehound: { k:'snout', s:1.05, t:0.4 },
  relicwarden: { k:'reliquary', s:1.05, g:1 },
};

const FOREST_ENEMY_MARKS = {
  sporepopper: { k:'sporeburst', n:5, t:0.5 },
  firefly: { k:'lampglow', g:1, t:0.7, sp:380 },
  thornhide: { k:'thorns', n:7, s:1.05 },
  sapling: { k:'saplingleaf', n:2, t:0.5 },
  frogtongue: { k:'tongue', sd:1, s:1.05 },
  vineslinger: { k:'vinecoil', n:3, sd:1 },
  thornbeast: { k:'tusks', s:1.15 },
  mosshide: { k:'mosspatch', n:5, t:0.35 },
  willowisp: { k:'wispflame', g:1, t:0.72, sp:300 },
  stingswarm: { k:'swarmdots', n:6, sp:180 },
  brambleknight: { k:'thornshield', s:1.15, sd:1 },
  boarrusher: { k:'snort', n:3, s:1.1 },
  owlsentinel: { k:'owleyes', s:1, g:1, t:0.65 },
  direfox: { k:'foxears', s:1.05 },
  fernstalker: { k:'fernfrond', n:5 },
  creepervine: { k:'tendrils', n:4, len:1.2 },
  thicketweaver: { k:'weave', n:4 },
  barkwatcher: { k:'barkrings', n:4, t:0.3 },
  glowmoth: { k:'mothwings', s:1.1, g:1, t:0.6 },
  rootburrower: { k:'dirtmound', n:4, s:1.05 },
  sporeseeder: { k:'seedpods', n:3, t:0.5 },
  hive: { k:'honeycomb', n:4, s:1, t:0.3 },
  waspine: { k:'papernest', n:3, s:1, t:0.15 },
  rootgrower: { k:'rootlash', n:3 },
  treeburner: { k:'emberpair', g:1, sp:220 },
  oilrig: { k:'pumpjack', s:1.05, t:0.55, sp:320 },
  mossmender: { k:'healcross', g:1, t:0.6 },
  treelinesniper: { k:'scope', s:1.05, sd:1 },
  gnatcloud: { k:'gnats', n:7, sp:140 },
  bramblelurker: { k:'ambushbush', n:5, t:0.25 },
  wispblinker: { k:'blinkring', g:1, t:0.68, sp:440 },
  rootroller: { k:'rollball', s:1.1 },
  staticwisp: { k:'sparkarc', n:4, g:1, t:0.75, sp:160 },
  venomskitter: { k:'venomdrip', n:4, t:0.55 },
  brambleflail: { k:'thornflail', sd:1, s:1.05 },
  vinewhip: { k:'whipvine', sd:1, n:3 },
  bramblewarden: { k:'brambleward', n:5, s:1.1 },
  acornmortar: { k:'acorn', s:1.05, sd:1 },
  bristleback: { k:'bristles', n:6, s:1.1 },
  thistlepod: { k:'thistle', n:6, t:0.55 },
  hivestump: { k:'stumprings', n:3, s:1.1 },
  puffcap: { k:'mushcap', s:1.1, t:0.5 },
  loamweaver: { k:'loamthreads', n:5 },
  oaksentry: { k:'oakcrown', n:5, s:1.1 },
  burrbloater: { k:'burrs', n:4, s:1.1 },
  sporechanter: { k:'chantglyph', n:3, g:1, t:0.6 },
  mistlestag: { k:'antlers', n:3, s:1.15 },
  fungalchoir: { k:'fungalnotes', n:3, g:1, t:0.55 },
  dewdancer: { k:'dewdrops', n:5, g:1, t:0.7 },
  heartseedling: { k:'heartseed', g:1, t:0.6, sp:460 },
  crowsentinel: { k:'crowbeak', s:1.05 },
  owlstalker: { k:'plume2', n:4, s:1.05 },
  graveswift: { k:'wings2', w:'swift', s:1.05 },
  dnbdragonfly: { k:'wings2', w:'dragon', s:1.1, g:1, t:0.6 },
  dnbcicada: { k:'cicadashell', n:3, s:1.05 },
  bramblestalker: { k:'stalkerclaws', s:1.05, sd:1 },
  vinewhipper: { k:'whipvine', sd:-1, n:4 },
  twinthorn: { k:'twinspike', s:1.1 },
  mossambusher: { k:'vinecoil', n:4, sd:-1, t:0.3 },
  canopysniper: { k:'canopyleaf', n:3, s:1.05 },
  mudstomper: { k:'mudclod', n:3, s:1.1 },
  pollenshaman: { k:'pollencloud', n:4, g:1, t:0.55 },
  beetleclutch: { k:'beetlebacks', n:3, s:1.05 },
  stumplurker: { k:'barknub', n:4, t:0.3 },
  battlebloom: { k:'bloompetals', n:5, g:1, t:0.6 },
  thicketguard: { k:'guardvines', n:4, s:1.1 },
  duskstalker: { k:'duskwisp', g:1, t:0.68, sp:340 },
  gourdcannon: { k:'gourdcap', s:1.1, t:0.5 },
  briertrap: { k:'briercoil', n:4, sd:1 },
  hedgehowl: { k:'quillburst', n:6, s:1.05 },
};

Object.assign(Util, {

  _turretStatic(ctx, e, flash){
    const col = flash ? Theme.enemy.flash : e.color;
    const dark = flash ? Theme.enemy.flashSoft : e.dark;
    const r = e.radius;
    ctx.fillStyle = Theme.shadow.groundSoft;
    ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.75, r * 0.7, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = flash ? Theme.enemy.flashSoft : Util.bodyShade(ctx, e.x, e.y + r * 0.35, r * 0.5, dark);
    ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.5, r * 0.5, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = flash ? Theme.enemy.flash : Util.bodyShade(ctx, e.x, e.y, r * 0.7, col);
    ctx.beginPath();
    ctx.moveTo(e.x - r * 0.45, e.y + r * 0.5);
    ctx.lineTo(e.x - r * 0.3, e.y - r * 0.6);
    ctx.lineTo(e.x + r * 0.3, e.y - r * 0.6);
    ctx.lineTo(e.x + r * 0.45, e.y + r * 0.5);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1.5; ctx.stroke();
  },

  _humanoidStatic(ctx, e, flash){
    const col = flash ? Theme.enemy.flash : e.color;
    const dark = flash ? Theme.enemy.flashSoft : e.dark;
    const r = e.radius;
    const behavior = e.behavior || '';

    ctx.strokeStyle = dark; ctx.lineWidth = Math.max(2, r * 0.22);
    ctx.beginPath(); ctx.moveTo(e.x - r * 0.55, e.y - r * 0.1); ctx.lineTo(e.x - r * 0.9, e.y + r * 0.35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(e.x + r * 0.55, e.y - r * 0.1); ctx.lineTo(e.x + r * 0.9, e.y + r * 0.35); ctx.stroke();

    const bodyFill = flash ? col : Util.bodyShade(ctx, e.x, e.y - r * 0.3, r, col);
    ctx.fillStyle = bodyFill;
    ctx.beginPath(); ctx.ellipse(e.x, e.y, r * 0.62, r * 0.85, 0, 0, Math.PI * 2); ctx.fill();
    const hx = e.x, hy = e.y - r * 0.75;
    ctx.beginPath(); ctx.arc(hx, hy, r * 0.5, 0, Math.PI * 2); ctx.fill();

    if (!flash) {
      ctx.strokeStyle = Theme.shadow.rim; ctx.lineWidth = Math.max(1, r * 0.1);
      ctx.beginPath(); ctx.ellipse(e.x, e.y, r * 0.6, r * 0.82, 0, Math.PI * 1.12, Math.PI * 1.62); ctx.stroke();
    }

    if (!flash && e.type && (e.type.id === 'sapling' || e.type.id === 'sprout')) {
      ctx.fillStyle = Util.shadeColor(col, 0.35);
      ctx.beginPath(); ctx.ellipse(hx - r * 0.2, hy - r * 0.4, r * 0.16, r * 0.08, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(hx + r * 0.2, hy - r * 0.4, r * 0.16, r * 0.08, 0.5, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = Theme.enemy.eye;
    ctx.beginPath(); ctx.arc(e.x - r * 0.18, e.y - r * 0.78, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(e.x + r * 0.18, e.y - r * 0.78, r * 0.08, 0, Math.PI * 2); ctx.fill();

    if (behavior === 'shielded') {

      ctx.strokeStyle = dark; ctx.lineWidth = Math.max(1.5, r * 0.12);
      ctx.beginPath(); ctx.arc(hx, hy, r * 0.53, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      if (e.shielded) {
        const sx = e.x + r * 0.68, sy = e.y + r * 0.05;
        ctx.fillStyle = flash ? Theme.enemy.flashSoft : Util.bodyShade(ctx, sx, sy, r * 0.48, dark);
        ctx.beginPath(); ctx.arc(sx, sy, r * 0.48, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = Theme.shadow.sheen; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.strokeStyle = flash ? Theme.enemy.flash : col; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx - r * 0.28, sy); ctx.lineTo(sx + r * 0.28, sy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx, sy - r * 0.28); ctx.lineTo(sx, sy + r * 0.28); ctx.stroke();
      }
    } else if (behavior === 'charger') {
      ctx.fillStyle = flash ? Theme.enemy.flashSoft : Theme.pony.chargerHorn;
      ctx.beginPath(); ctx.moveTo(hx - r * 0.35, hy - r * 0.15); ctx.lineTo(hx - r * 0.6, hy - r * 0.48); ctx.lineTo(hx - r * 0.12, hy - r * 0.32); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx + r * 0.35, hy - r * 0.15); ctx.lineTo(hx + r * 0.6, hy - r * 0.48); ctx.lineTo(hx + r * 0.12, hy - r * 0.32); ctx.closePath(); ctx.fill();
    } else if (behavior === 'ranged') {
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(hx - r * 0.48, hy - r * 0.08);
      ctx.lineTo(hx, hy - r * 0.85);
      ctx.lineTo(hx + r * 0.48, hy - r * 0.08);
      ctx.quadraticCurveTo(hx, hy - r * 0.22, hx - r * 0.48, hy - r * 0.08);
      ctx.fill();
      ctx.fillStyle = Util.shadeColor(dark, 0.25);
      ctx.beginPath(); ctx.ellipse(e.x - r * 0.75, e.y + r * 0.25, r * 0.2, r * 0.26, 0.3, 0, Math.PI * 2); ctx.fill();

    } else if (behavior === 'orbiter') {

      ctx.strokeStyle = flash ? Theme.enemy.flashSoft : Util.shadeColor(col, 0.45);
      ctx.lineWidth = Math.max(1.2, r * 0.1);
      ctx.beginPath(); ctx.ellipse(hx, hy - r * 0.15, r * 0.78, r * 0.3, -0.35, 0, Math.PI * 2); ctx.stroke();
    } else if (behavior === 'burrower') {

      ctx.fillStyle = flash ? Theme.enemy.flashSoft : Util.shadeColor(dark, 0.3);
      ctx.beginPath(); ctx.moveTo(e.x - r * 0.75, e.y + r * 0.1); ctx.lineTo(e.x - r * 1.15, e.y + r * 0.5); ctx.lineTo(e.x - r * 0.6, e.y + r * 0.5); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(e.x + r * 0.75, e.y + r * 0.1); ctx.lineTo(e.x + r * 1.15, e.y + r * 0.5); ctx.lineTo(e.x + r * 0.6, e.y + r * 0.5); ctx.closePath(); ctx.fill();
    } else if (behavior === 'summoner') {

      ctx.strokeStyle = dark; ctx.lineWidth = Math.max(1.5, r * 0.13);
      ctx.beginPath(); ctx.moveTo(e.x + r * 0.9, e.y + r * 0.55); ctx.lineTo(e.x + r * 0.72, hy - r * 0.5); ctx.stroke();
      ctx.fillStyle = flash ? Theme.enemy.flash : Util.shadeColor(col, 0.55);
      ctx.beginPath(); ctx.arc(e.x + r * 0.72, hy - r * 0.62, r * 0.2, 0, Math.PI * 2); ctx.fill();
    } else if (behavior === 'healer') {

      ctx.fillStyle = flash ? Theme.enemy.flashSoft : Theme.particle.heal;
      ctx.fillRect(e.x - r * 0.09, e.y - r * 0.32, r * 0.18, r * 0.6);
      ctx.fillRect(e.x - r * 0.3, e.y - r * 0.11, r * 0.6, r * 0.18);
    } else if (behavior === 'sniper') {

      ctx.strokeStyle = flash ? Theme.enemy.flashSoft : Util.shadeColor(dark, 0.2);
      ctx.lineWidth = Math.max(1.5, r * 0.16);
      ctx.beginPath(); ctx.moveTo(e.x - r * 1.0, e.y + r * 0.35); ctx.lineTo(e.x + r * 1.1, e.y - r * 0.35); ctx.stroke();
      ctx.fillStyle = flash ? Theme.enemy.flash : Util.shadeColor(col, 0.5);
      ctx.beginPath(); ctx.arc(e.x + r * 0.35, e.y - r * 0.12, r * 0.13, 0, Math.PI * 2); ctx.fill();
    } else if (behavior === 'swarm') {

      ctx.fillStyle = flash ? Theme.enemy.flashSoft : Util.shadeColor(col, 0.5);
      ctx.beginPath(); ctx.arc(hx - r * 0.42, hy - r * 0.62, r * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx + r * 0.06, hy - r * 0.84, r * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx + r * 0.46, hy - r * 0.55, r * 0.1, 0, Math.PI * 2); ctx.fill();
    } else if (behavior === 'ambusher') {

      ctx.fillStyle = flash ? Theme.enemy.flashSoft : Util.shadeColor(dark, 0.15);
      for (let i = 0; i < 3; i++) {
        const sx = e.x + (i - 1) * r * 0.42, sy = e.y - r * 0.35;
        ctx.beginPath(); ctx.moveTo(sx - r * 0.13, sy); ctx.lineTo(sx, sy - r * 0.42); ctx.lineTo(sx + r * 0.13, sy); ctx.closePath(); ctx.fill();
      }
    } else if (behavior === 'teleporter') {

      ctx.fillStyle = flash ? Theme.enemy.flash : Util.shadeColor(col, 0.55);
      const diamond = (cx, cy, s) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s * 0.62, cy); ctx.lineTo(cx, cy + s); ctx.lineTo(cx - s * 0.62, cy);
        ctx.closePath(); ctx.fill();
      };
      diamond(hx, hy - r * 0.78, r * 0.26);
      diamond(e.x, e.y, r * 0.2);
    } else if (behavior === 'shielder') {

      ctx.strokeStyle = flash ? Theme.enemy.flashSoft : Theme.status.shieldRing;
      ctx.lineWidth = Math.max(1.2, r * 0.1);
      ctx.beginPath(); ctx.arc(e.x, e.y, r * 1.05, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = flash ? Theme.enemy.flash : Util.shadeColor(col, 0.4); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(e.x, e.y, r * 0.86, 0, Math.PI * 2); ctx.stroke();
    } else if (behavior === 'lobber') {

      ctx.strokeStyle = flash ? Theme.enemy.flashSoft : Util.shadeColor(dark, 0.1);
      ctx.lineWidth = Math.max(2, r * 0.26);
      ctx.beginPath(); ctx.moveTo(e.x + r * 0.25, e.y + r * 0.4); ctx.lineTo(e.x + r * 0.85, e.y - r * 0.5); ctx.stroke();
      ctx.fillStyle = flash ? Theme.enemy.flash : Util.shadeColor(col, 0.45);
      ctx.beginPath(); ctx.arc(e.x + r * 0.92, e.y - r * 0.62, r * 0.16, 0, Math.PI * 2); ctx.fill();
    } else if (behavior === 'weaver') {

      ctx.strokeStyle = flash ? Theme.enemy.flashSoft : Util.shadeColor(col, 0.5);
      ctx.lineWidth = Math.max(1.2, r * 0.11);
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const px = e.x - r * 0.5 + (r * i) / 12;
        const py = e.y - r * 0.05 + Math.sin((i / 12) * Math.PI * 2) * r * 0.24;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    } else if (behavior === 'sentry') {

      ctx.fillStyle = flash ? Theme.enemy.flashSoft : Theme.pony.eyeWhite;
      ctx.beginPath(); ctx.ellipse(e.x, e.y - r * 0.05, r * 0.4, r * 0.26, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? Theme.enemy.flash : Theme.pony.pupil;
      ctx.beginPath(); ctx.arc(e.x, e.y - r * 0.05, r * 0.15, 0, Math.PI * 2); ctx.fill();
    } else if (behavior === 'skirmisher') {

      ctx.strokeStyle = flash ? Theme.enemy.flashSoft : Util.shadeColor(col, 0.5);
      ctx.lineWidth = Math.max(1.2, r * 0.11);
      ctx.beginPath(); ctx.moveTo(e.x - r * 0.3, e.y - r * 0.25); ctx.lineTo(e.x, e.y - r * 0.02); ctx.lineTo(e.x - r * 0.3, e.y + r * 0.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(e.x + r * 0.05, e.y - r * 0.25); ctx.lineTo(e.x + r * 0.35, e.y - r * 0.02); ctx.lineTo(e.x + r * 0.05, e.y + r * 0.2); ctx.stroke();
    } else if (behavior === 'whiplash') {

      ctx.strokeStyle = dark; ctx.lineWidth = Math.max(1.5, r * 0.1);
      ctx.beginPath();
      ctx.moveTo(e.x + r * 0.6, e.y + r * 0.2);
      ctx.quadraticCurveTo(e.x + r * 1.3, e.y - r * 0.1, e.x + r * 1.55, e.y - r * 0.55);
      ctx.stroke();
    }
  },

  _cryptMark(ctx, e, flash, now, phase, col, dark, r, hx, hy, m){
    const k = m.k;
    const s = m.s || 1;
    const n = m.n || 3;
    const nd = n > 1 ? n - 1 : 1;
    const sd = m.sd || 1;
    const acc = flash ? Theme.enemy.flash : Util.shadeColor(col, m.t === undefined ? 0.45 : m.t);
    const deep = flash ? Theme.enemy.flashSoft : Util.shadeColor(dark, -0.08);
    const pul = 0.5 + 0.5 * Math.sin(now / (m.sp || 520) + phase);
    const lw = Math.max(1, r * 0.1 * s);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = acc;
    ctx.fillStyle = acc;
    ctx.lineWidth = lw;
    if (m.g) { ctx.shadowColor = acc; ctx.shadowBlur = 3 + 5 * pul; }

    if (k === 'rift') {
      const w = r * 0.5 * (0.6 + 0.4 * pul);
      ctx.globalAlpha = 0.55 + 0.35 * pul;
      ctx.beginPath();
      ctx.moveTo(hx, hy - r * 0.5);
      ctx.quadraticCurveTo(hx + w, hy, hx, hy + r * 0.55);
      ctx.quadraticCurveTo(hx - w, hy, hx, hy - r * 0.5);
      ctx.fill();
    } else if (k === 'staff') {
      const bx = hx + r * 0.55 * sd;
      ctx.beginPath(); ctx.moveTo(bx, e.y + r * 0.6); ctx.lineTo(bx, hy - r * 0.55); ctx.stroke();
      ctx.beginPath(); ctx.arc(bx, hy - r * 0.7, r * 0.16 * (0.8 + 0.3 * pul), 0, Math.PI * 2); ctx.fill();
    } else if (k === 'shieldSlab') {
      const bx = e.x + r * 0.72 * sd;
      ctx.fillStyle = deep;
      ctx.beginPath();
      ctx.moveTo(bx, e.y - r * 0.65 * s);
      ctx.lineTo(bx + r * 0.3 * sd, e.y - r * 0.35 * s);
      ctx.lineTo(bx + r * 0.3 * sd, e.y + r * 0.35 * s);
      ctx.lineTo(bx, e.y + r * 0.7 * s);
      ctx.lineTo(bx - r * 0.3 * sd, e.y + r * 0.35 * s);
      ctx.lineTo(bx - r * 0.3 * sd, e.y - r * 0.35 * s);
      ctx.closePath(); ctx.fill();
      ctx.lineWidth = Math.max(1, lw * 0.7); ctx.stroke();
    } else if (k === 'flail') {
      const ax = e.x + r * 0.6 * sd, ay = e.y - r * 0.15;
      const sw = Math.sin(now / 260 + phase) * 0.6;
      const bx2 = ax + Math.cos(sw - 1.2) * r * 0.8 * sd, by2 = ay + Math.sin(sw - 1.2) * r * 0.8;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx2, by2); ctx.stroke();
      ctx.beginPath(); ctx.arc(bx2, by2, r * 0.2, 0, Math.PI * 2); ctx.fill();
    } else if (k === 'beak') {
      ctx.beginPath();
      ctx.moveTo(hx + r * 0.1 * sd, hy - r * 0.05);
      ctx.lineTo(hx + r * 0.75 * s * sd, hy + r * 0.1);
      ctx.lineTo(hx + r * 0.1 * sd, hy + r * 0.22);
      ctx.closePath(); ctx.fill();
    } else if (k === 'blade') {
      const bx = e.x + r * 0.62 * sd;
      ctx.beginPath(); ctx.moveTo(bx, e.y + r * 0.5); ctx.lineTo(bx + r * 0.12 * sd, e.y - r * 0.8); ctx.stroke();
      ctx.fillStyle = deep;
      if (m.b === 2) {
        ctx.beginPath(); ctx.moveTo(bx - r * 0.22, e.y + r * 0.45); ctx.lineTo(bx + r * 0.26, e.y + r * 0.45); ctx.lineTo(bx + r * 0.02, e.y + r * 0.95); ctx.closePath(); ctx.fill();
      } else {
        ctx.beginPath(); ctx.moveTo(bx - r * 0.26, e.y - r * 0.08); ctx.lineTo(bx + r * 0.3, e.y - r * 0.08); ctx.lineTo(bx + r * 0.02, e.y - r * 0.24); ctx.closePath(); ctx.fill();
      }
    } else if (k === 'legs') {
      const len = (m.len || 1) * r * 0.7;
      for (let i = 0; i < n; i++) {
        const t = i / nd - 0.5;
        for (const g of [-1, 1]) {
          const ox = e.x + g * r * 0.3, oy = e.y + t * r * 0.3;
          const bend = Math.sin(now / 200 + phase + i) * r * 0.12;
          ctx.beginPath(); ctx.moveTo(ox, oy); ctx.quadraticCurveTo(ox + g * len * 0.7, oy - len * 0.4 + bend, ox + g * len, oy + len * 0.5); ctx.stroke();
        }
      }
    } else if (k === 'boulder') {
      ctx.fillStyle = deep;
      ctx.beginPath(); ctx.arc(e.x, e.y + r * 0.35, r * 0.55 * s, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = acc; ctx.lineWidth = Math.max(1, lw * 0.6);
      ctx.beginPath(); ctx.arc(e.x - r * 0.15, e.y + r * 0.25, r * 0.2 * s, 0.4, 2.6); ctx.stroke();
    } else if (k === 'orbit') {
      for (let i = 0; i < n; i++) {
        const a = now / 420 + phase + i * (Math.PI * 2 / n);
        ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * r * 1.05 * s, e.y - r * 0.2 + Math.sin(a) * r * 0.5 * s, Math.max(1, r * 0.13), 0, Math.PI * 2); ctx.fill();
      }
    } else if (k === 'spiral') {
      const steps = n * 8;
      ctx.lineWidth = Math.max(1, lw * 0.6);
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, a = now / 500 + phase + t * Math.PI * 3.2, rad = r * (0.25 + 0.75 * t);
        const px = e.x + Math.cos(a) * rad, py = e.y - r * 0.15 + Math.sin(a) * rad * 0.5;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    } else if (k === 'maw') {
      ctx.fillStyle = deep;
      ctx.beginPath(); ctx.arc(hx, hy + r * 0.05, r * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = acc;
      for (let i = 0; i < n; i++) {
        const a = i * (Math.PI * 2 / n) + phase;
        ctx.beginPath();
        ctx.moveTo(hx + Math.cos(a) * r * 0.3, hy + r * 0.05 + Math.sin(a) * r * 0.3);
        ctx.lineTo(hx + Math.cos(a + 0.28) * r * 0.3, hy + r * 0.05 + Math.sin(a + 0.28) * r * 0.3);
        ctx.lineTo(hx + Math.cos(a + 0.14) * r * 0.12, hy + r * 0.05 + Math.sin(a + 0.14) * r * 0.12);
        ctx.closePath(); ctx.fill();
      }
    } else if (k === 'bow') {
      const bx = e.x + r * 0.7 * s, by = e.y - r * 0.1, br = r * 0.55 * s;
      ctx.beginPath(); ctx.arc(bx, by, br, -1.15, 1.15); ctx.stroke();
      ctx.lineWidth = Math.max(1, lw * 0.5);
      ctx.beginPath();
      ctx.moveTo(bx + Math.cos(-1.15) * br, by + Math.sin(-1.15) * br);
      ctx.lineTo(bx + Math.cos(1.15) * br, by + Math.sin(1.15) * br);
      ctx.stroke();
    } else if (k === 'antennae') {
      for (const g of [-1, 1]) {
        ctx.lineWidth = Math.max(1, lw * 0.6);
        ctx.beginPath(); ctx.moveTo(hx + g * r * 0.14, hy - r * 0.24);
        ctx.quadraticCurveTo(hx + g * r * 0.5 * s, hy - r * 0.75 * s, hx + g * r * 0.28 * s, hy - r * s);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(hx + g * r * 0.28 * s, hy - r * s, Math.max(1, r * 0.09), 0, Math.PI * 2); ctx.fill();
      }
    } else if (k === 'sling') {
      const ax = e.x + r * 0.55 * sd, ay = e.y - r * 0.3;
      const sw = Math.sin(now / 220 + phase);
      ctx.lineWidth = Math.max(1, lw * 0.5);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + r * 0.5 * sd, ay + r * 0.55 + sw * r * 0.15); ctx.stroke();
      ctx.beginPath(); ctx.arc(ax + r * 0.5 * sd, ay + r * 0.62 + sw * r * 0.15, r * 0.16, 0, Math.PI * 2); ctx.fill();
    } else if (k === 'crown') {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const px = hx + (i / nd - 0.5) * r * 0.78 * s;
        ctx.moveTo(px, hy - r * 0.3); ctx.lineTo(px, hy - r * (i % 2 ? 0.5 : 0.72) * s);
      }
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx - r * 0.4 * s, hy - r * 0.3); ctx.lineTo(hx + r * 0.4 * s, hy - r * 0.3); ctx.stroke();
    } else if (k === 'rattle') {
      const tx = e.x - r * 0.6, ty = e.y + r * 0.2;
      for (let i = 0; i < n; i++) {
        const w = Math.sin(now / 160 + phase + i * 0.7) * r * 0.12;
        ctx.beginPath(); ctx.arc(tx - i * r * 0.24, ty + i * r * 0.12 + w, Math.max(1, r * (0.16 - i * 0.02)), 0, Math.PI * 2); ctx.fill();
      }
    } else if (k === 'notes') {
      ctx.lineWidth = Math.max(1, lw * 0.5);
      for (let i = 0; i < n; i++) {
        const t = (now / 900 + phase + i / n) % 1;
        ctx.globalAlpha = 0.8 * (1 - t);
        const px = hx + Math.sin(phase + i * 2 + t * 4) * r * 0.5, py = hy - r * 0.5 - t * r * 1.2;
        ctx.beginPath(); ctx.arc(px, py, Math.max(1, r * 0.11), 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(px + r * 0.1, py); ctx.lineTo(px + r * 0.1, py - r * 0.28); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (k === 'segments') {
      ctx.lineWidth = Math.max(1, lw * 0.7);
      for (let i = 0; i < n; i++) {
        const py = e.y - r * 0.3 + i * r * 0.34;
        ctx.beginPath(); ctx.arc(e.x, py, Math.max(1, r * (0.42 - i * 0.05)), 0.25, Math.PI - 0.25); ctx.stroke();
      }
    } else if (k === 'sprout') {
      ctx.lineWidth = Math.max(1, lw * 0.6);
      for (let i = 0; i < n; i++) {
        const g = i % 2 ? 1 : -1, sway = Math.sin(now / 700 + phase + i) * r * 0.1;
        ctx.beginPath(); ctx.moveTo(hx + g * r * 0.1, hy - r * 0.28);
        ctx.quadraticCurveTo(hx + g * r * 0.35, hy - r * 0.65, hx + g * r * 0.5 + sway, hy - r * 0.85);
        ctx.stroke();
        ctx.beginPath(); ctx.ellipse(hx + g * r * 0.5 + sway, hy - r * 0.9, r * 0.16, r * 0.09, g * 0.6, 0, Math.PI * 2); ctx.fill();
      }
    } else if (k === 'barrel') {
      ctx.fillStyle = deep;
      ctx.fillRect(e.x - r * 0.12, e.y - r * 0.95 * s, r * 0.24, r * 0.55 * s);
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.arc(e.x, e.y - r * 0.95 * s, r * 0.16, 0, Math.PI * 2); ctx.fill();
    } else if (k === 'wisptail') {
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 4; i++) {
        const t = i / 3;
        ctx.beginPath(); ctx.arc(e.x + Math.sin(now / 400 + phase + i * 0.8) * r * 0.25, e.y + r * 0.5 + t * r * 0.75, Math.max(1, r * (0.34 - t * 0.24)), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (k === 'helm') {
      ctx.fillStyle = deep;
      ctx.beginPath(); ctx.arc(hx, hy, r * 0.42 * s, Math.PI, 0);
      ctx.lineTo(hx + r * 0.42 * s, hy + r * 0.2); ctx.lineTo(hx - r * 0.42 * s, hy + r * 0.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = acc;
      ctx.fillRect(hx - r * 0.34 * s, hy - r * 0.02, r * 0.68 * s, Math.max(1, r * 0.08));
    } else if (k === 'cloud') {
      ctx.globalAlpha = 0.32;
      for (let i = 0; i < n; i++) {
        const a = now / 900 + phase + i * (Math.PI * 2 / n);
        ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * r * 0.6, e.y + Math.sin(a) * r * 0.45, r * 0.42, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (k === 'ribs') {
      ctx.lineWidth = Math.max(1, lw * 0.6);
      for (let i = 0; i < n; i++) {
        const py = e.y - r * 0.25 + i * r * 0.26;
        ctx.beginPath(); ctx.moveTo(e.x - r * 0.34, py); ctx.quadraticCurveTo(e.x, py + r * 0.12, e.x + r * 0.34, py); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(e.x, e.y - r * 0.35); ctx.lineTo(e.x, e.y + r * 0.45); ctx.stroke();
    } else if (k === 'threads') {
      ctx.globalAlpha = 0.6; ctx.lineWidth = Math.max(1, lw * 0.4);
      for (let i = 0; i < n; i++) {
        const g = (i / nd - 0.5) * 2;
        ctx.beginPath(); ctx.moveTo(e.x + g * r * 0.4, e.y - r * 0.2);
        ctx.quadraticCurveTo(e.x + g * r * 0.9, e.y + r * 0.4, e.x + g * r * 0.6, e.y + r);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (k === 'horns') {
      for (const g of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(hx + g * r * 0.22, hy - r * 0.2);
        ctx.quadraticCurveTo(hx + g * r * 0.55 * s, hy - r * 0.55 * s, hx + g * r * 0.3 * s, hy - r * 0.85 * s);
        ctx.stroke();
      }
    } else if (k === 'slab') {
      const cy = m.up ? hy - r * 0.75 : e.y + r * 0.25;
      ctx.fillStyle = deep;
      ctx.fillRect(e.x - r * 0.62 * s, cy - r * 0.16 * s, r * 1.24 * s, r * 0.32 * s);
      ctx.lineWidth = Math.max(1, lw * 0.5);
      ctx.strokeRect(e.x - r * 0.62 * s, cy - r * 0.16 * s, r * 1.24 * s, r * 0.32 * s);
    } else if (k === 'hood') {
      ctx.fillStyle = deep;
      ctx.beginPath(); ctx.arc(hx, hy - r * 0.02, r * 0.46 * s, Math.PI * 1.02, Math.PI * 1.98);
      ctx.lineTo(hx + r * 0.4 * s, hy + r * 0.38); ctx.lineTo(hx - r * 0.4 * s, hy + r * 0.38); ctx.closePath(); ctx.fill();
      ctx.fillStyle = flash ? Theme.enemy.flash : Util.shadeColor(col, 0.65);
      for (const g of [-1, 1]) { ctx.beginPath(); ctx.arc(hx + g * r * 0.15, hy + r * 0.02, Math.max(1, r * 0.07), 0, Math.PI * 2); ctx.fill(); }
    } else if (k === 'shell') {
      ctx.fillStyle = deep;
      ctx.beginPath(); ctx.ellipse(e.x, e.y - r * 0.05, r * 0.62 * s, r * 0.5 * s, 0, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = acc; ctx.lineWidth = Math.max(1, lw * 0.5);
      for (let i = 1; i < 3; i++) {
        ctx.beginPath(); ctx.ellipse(e.x, e.y - r * 0.05, r * 0.62 * s * (i / 3), r * 0.5 * s * (i / 3), 0, Math.PI, 0); ctx.stroke();
      }
    } else if (k === 'wings') {
      const bat = m.w === 'bat';
      const flap = 0.35 + 0.3 * Math.sin(now / (bat ? 120 : 220) + phase);
      ctx.globalAlpha = bat ? 0.9 : 0.6;
      ctx.fillStyle = bat ? deep : acc;
      for (const g of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(e.x + g * r * 0.2, e.y - r * 0.35);
        if (bat) {
          ctx.lineTo(e.x + g * r * 1.15 * s, e.y - r * (0.6 + flap));
          ctx.lineTo(e.x + g * r * 0.85 * s, e.y - r * 0.1);
          ctx.lineTo(e.x + g * r * 0.55 * s, e.y - r * 0.3);
        } else {
          ctx.quadraticCurveTo(e.x + g * r * 1.2 * s, e.y - r * (0.5 + flap), e.x + g * r * 0.7 * s, e.y + r * 0.25);
        }
        ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (k === 'quiver') {
      ctx.save();
      ctx.translate(e.x - r * 0.55, e.y - r * 0.1); ctx.rotate(-0.35);
      ctx.fillStyle = deep;
      ctx.fillRect(-r * 0.16, -r * 0.4, r * 0.32, r * 0.8);
      ctx.strokeStyle = acc; ctx.lineWidth = Math.max(1, lw * 0.5);
      for (let i = 0; i < n; i++) {
        const px = -r * 0.1 + i * r * 0.1;
        ctx.beginPath(); ctx.moveTo(px, -r * 0.4); ctx.lineTo(px, -r * 0.75); ctx.stroke();
      }
      ctx.restore();
    } else if (k === 'skullface') {
      ctx.fillStyle = deep;
      for (const g of [-1, 1]) { ctx.beginPath(); ctx.ellipse(hx + g * r * 0.16, hy - r * 0.02, r * 0.11 * s, r * 0.14 * s, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(hx, hy + r * 0.08); ctx.lineTo(hx - r * 0.07, hy + r * 0.2); ctx.lineTo(hx + r * 0.07, hy + r * 0.2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = acc; ctx.lineWidth = Math.max(1, lw * 0.4);
      for (let i = 0; i < 4; i++) {
        const px = hx - r * 0.18 + i * r * 0.12;
        ctx.beginPath(); ctx.moveTo(px, hy + r * 0.26); ctx.lineTo(px, hy + r * 0.38); ctx.stroke();
      }
    } else if (k === 'blisters') {
      ctx.globalAlpha = 0.8;
      for (let i = 0; i < n; i++) {
        const a = phase + i * (Math.PI * 2 / n);
        const rr = Math.max(1, r * (0.2 + 0.06 * Math.sin(now / 380 + phase + i)) * s);
        ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * r * 0.4, e.y + Math.sin(a) * r * 0.3, rr, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (k === 'pauldrons') {
      for (const g of [-1, 1]) {
        ctx.fillStyle = deep;
        ctx.beginPath(); ctx.arc(e.x + g * r * 0.45 * s, e.y - r * 0.28, r * 0.3 * s, Math.PI, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = acc; ctx.lineWidth = Math.max(1, lw * 0.5); ctx.stroke();
      }
    } else if (k === 'bell') {
      ctx.save();
      ctx.translate(hx, hy - r * 0.35); ctx.rotate(Math.sin(now / 340 + phase) * 0.22);
      ctx.fillStyle = deep;
      ctx.beginPath(); ctx.moveTo(-r * 0.3 * s, r * 0.45);
      ctx.quadraticCurveTo(-r * 0.28 * s, -r * 0.2, 0, -r * 0.3);
      ctx.quadraticCurveTo(r * 0.28 * s, -r * 0.2, r * 0.3 * s, r * 0.45);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.arc(0, r * 0.52, Math.max(1, r * 0.1), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (k === 'urn') {
      ctx.fillStyle = deep;
      ctx.beginPath(); ctx.moveTo(e.x - r * 0.2, e.y - r * 0.5);
      ctx.quadraticCurveTo(e.x - r * 0.55 * s, e.y, e.x - r * 0.25, e.y + r * 0.55);
      ctx.lineTo(e.x + r * 0.25, e.y + r * 0.55);
      ctx.quadraticCurveTo(e.x + r * 0.55 * s, e.y, e.x + r * 0.2, e.y - r * 0.5);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = acc; ctx.lineWidth = Math.max(1, lw * 0.5);
      ctx.beginPath(); ctx.moveTo(e.x - r * 0.28, e.y - r * 0.5); ctx.lineTo(e.x + r * 0.28, e.y - r * 0.5); ctx.stroke();
    } else if (k === 'waves') {
      ctx.lineWidth = Math.max(1, lw * 0.5);
      for (let i = 0; i < n; i++) {
        const t = (now / 800 + phase + i / n) % 1;
        const rad = r * (0.4 + t * 1.1);
        ctx.globalAlpha = 0.55 * (1 - t);
        ctx.beginPath(); ctx.arc(hx, hy, rad, -2.4, -0.75); ctx.stroke();
        ctx.beginPath(); ctx.arc(hx, hy, rad, Math.PI + 0.75, Math.PI + 2.4); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (k === 'lantern') {
      const lx = e.x + r * 0.7, ly = e.y - r * 0.1 + Math.sin(now / 500 + phase) * r * 0.08;
      ctx.lineWidth = Math.max(1, lw * 0.4);
      ctx.beginPath(); ctx.moveTo(e.x + r * 0.35, e.y - r * 0.45); ctx.lineTo(lx, ly - r * 0.3); ctx.stroke();
      ctx.fillStyle = deep; ctx.fillRect(lx - r * 0.22, ly - r * 0.28, r * 0.44, r * 0.5);
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.arc(lx, ly - r * 0.03, r * 0.15 * (0.75 + 0.35 * pul), 0, Math.PI * 2); ctx.fill();
    } else if (k === 'halo') {
      ctx.lineWidth = Math.max(1, lw * 0.8);
      ctx.globalAlpha = 0.6 + 0.3 * pul;
      ctx.beginPath(); ctx.ellipse(hx, hy - r * 0.7, r * 0.45 * s, r * 0.16 * s, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (k === 'gem') {
      const gy = hy - r * 0.05;
      ctx.beginPath(); ctx.moveTo(hx, gy - r * 0.34 * s); ctx.lineTo(hx + r * 0.24 * s, gy);
      ctx.lineTo(hx, gy + r * 0.34 * s); ctx.lineTo(hx - r * 0.24 * s, gy); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = deep; ctx.lineWidth = Math.max(1, lw * 0.4);
      ctx.beginPath(); ctx.moveTo(hx - r * 0.24 * s, gy); ctx.lineTo(hx + r * 0.24 * s, gy); ctx.stroke();
    } else if (k === 'candles') {
      for (let i = 0; i < n; i++) {
        const px = hx + (i / nd - 0.5) * r * 0.7;
        ctx.fillStyle = deep; ctx.fillRect(px - r * 0.06, hy - r * 0.6, r * 0.12, r * 0.34);
        ctx.fillStyle = acc;
        ctx.beginPath(); ctx.ellipse(px, hy - r * 0.7, r * 0.08, r * 0.14 * (0.8 + 0.35 * Math.sin(now / 180 + i * 2 + phase)), 0, 0, Math.PI * 2); ctx.fill();
      }
    } else if (k === 'plume') {
      for (let i = 0; i < n; i++) {
        const g = (i / nd - 0.5) * 2;
        ctx.beginPath(); ctx.moveTo(hx, hy - r * 0.3);
        ctx.quadraticCurveTo(hx + g * r * 0.5, hy - r * 0.85, hx + g * r * 0.75, hy - r * 0.55);
        ctx.quadraticCurveTo(hx + g * r * 0.35, hy - r * 0.6, hx, hy - r * 0.3);
        ctx.fill();
      }
    } else if (k === 'motes') {
      ctx.globalAlpha = 0.7;
      for (let i = 0; i < n; i++) {
        const a = now / 620 + phase + i * (Math.PI * 2 / n);
        ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * r * (0.7 + 0.3 * Math.sin(a * 2)), e.y - r * 0.3 + Math.sin(a * 1.3) * r * 0.6, Math.max(1, r * 0.08), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (k === 'glyph') {
      ctx.lineWidth = Math.max(1, lw * 0.6);
      ctx.globalAlpha = 0.55 + 0.4 * pul;
      ctx.save(); ctx.translate(e.x, e.y - r * 0.1); ctx.rotate(now / 1400 + phase);
      ctx.beginPath();
      for (let i = 0; i < 3; i++) { const a = i * (Math.PI * 2 / 3); ctx.lineTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5); }
      ctx.closePath(); ctx.stroke();
      ctx.restore(); ctx.globalAlpha = 1;
    } else if (k === 'mound') {
      ctx.fillStyle = deep;
      ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.72, r * 0.85 * s, r * 0.3 * s, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = acc;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.arc(e.x - r * 0.5 + i * r * 0.33, e.y + r * (0.6 + 0.08 * (i % 2)), Math.max(1, r * 0.07), 0, Math.PI * 2); ctx.fill();
      }
    } else if (k === 'spikes') {
      ctx.fillStyle = deep;
      for (let i = 0; i < n; i++) {
        const t = i / nd, px = e.x - r * 0.4 + t * r * 0.8, py = e.y - r * 0.35 - Math.sin(t * Math.PI) * r * 0.15;
        ctx.beginPath(); ctx.moveTo(px - r * 0.09, py); ctx.lineTo(px, py - r * 0.4); ctx.lineTo(px + r * 0.09, py); ctx.closePath(); ctx.fill();
      }
    } else if (k === 'double') {
      ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.arc(e.x + r * 0.5, e.y - r * 0.1, r * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(e.x + r * 0.5, hy, r * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (k === 'nails') {
      ctx.lineWidth = Math.max(1, lw * 0.5);
      for (let i = 0; i < n; i++) {
        const a = Math.PI * (0.15 + 0.7 * (i / nd));
        const px = e.x + Math.cos(a) * r * 0.55, py = e.y - r * 0.05 + Math.sin(a) * r * 0.55;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * r * 0.3, py + Math.sin(a) * r * 0.3); ctx.stroke();
      }
    } else if (k === 'hexcells') {
      ctx.lineWidth = Math.max(1, lw * 0.4);
      for (let i = 0; i < n; i++) {
        const cx = e.x + ((i % 2) - 0.5) * r * 0.5, cy = e.y - r * 0.25 + Math.floor(i / 2) * r * 0.45;
        ctx.beginPath();
        for (let j = 0; j < 6; j++) { const a = j * Math.PI / 3; ctx.lineTo(cx + Math.cos(a) * r * 0.22, cy + Math.sin(a) * r * 0.22); }
        ctx.closePath(); ctx.stroke();
      }
    } else if (k === 'bigeye') {
      ctx.beginPath(); ctx.arc(hx, hy, r * 0.4 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = deep;
      ctx.beginPath(); ctx.arc(hx + r * 0.08, hy, r * 0.18 * s, 0, Math.PI * 2); ctx.fill();
    } else if (k === 'fuse') {
      ctx.lineWidth = Math.max(1, lw * 0.5);
      ctx.beginPath(); ctx.moveTo(hx, hy - r * 0.3); ctx.quadraticCurveTo(hx + r * 0.25, hy - r * 0.7, hx + r * 0.05, hy - r * 0.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(hx + r * 0.05, hy - r * 0.95, r * 0.13 * (0.7 + 0.5 * pul), 0, Math.PI * 2); ctx.fill();
    } else if (k === 'pads') {
      for (let i = 0; i < n; i++) {
        const a = phase + i * (Math.PI * 2 / n);
        const px = e.x + Math.cos(a) * r * 0.55, py = e.y + Math.sin(a) * r * 0.45;
        ctx.fillStyle = acc;
        ctx.beginPath(); ctx.arc(px, py, Math.max(1, r * 0.15), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = deep;
        ctx.beginPath(); ctx.arc(px, py, Math.max(1, r * 0.07), 0, Math.PI * 2); ctx.fill();
      }
    } else if (k === 'drips') {
      ctx.globalAlpha = 0.7;
      for (let i = 0; i < n; i++) {
        const t = (now / 1100 + phase + i / n) % 1;
        const px = e.x + (i / nd - 0.5) * r * 0.9, py = e.y + r * 0.3 + t * r * 0.7;
        ctx.beginPath(); ctx.ellipse(px, py, r * 0.1, r * 0.15, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (k === 'coil') {
      const steps = n * 10;
      const sq = 0.6 + 0.4 * pul;
      ctx.lineWidth = Math.max(1, lw * 0.6);
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = e.x + Math.sin(t * Math.PI * 2 * n) * r * 0.28, py = e.y + r * 0.75 - t * r * 0.55 * sq;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    } else if (k === 'ghosttail') {
      ctx.globalAlpha = 0.45;
      ctx.beginPath(); ctx.moveTo(e.x - r * 0.55, e.y + r * 0.3);
      for (let i = 0; i <= 4; i++) {
        const t = i / 4;
        ctx.lineTo(e.x - r * 0.55 + t * r * 1.1, e.y + r * 0.3 + Math.sin(now / 300 + phase + t * 4) * r * 0.12);
      }
      ctx.lineTo(e.x + r * 0.3, e.y + r * 0.95); ctx.lineTo(e.x - r * 0.3, e.y + r * 0.95);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (k === 'flames') {
      for (let i = 0; i < n; i++) {
        const a = now / 340 + phase + i * (Math.PI * 2 / n);
        const px = e.x + Math.cos(a) * r * 0.85, py = e.y - r * 0.1 + Math.sin(a) * r * 0.55;
        const h = r * (0.3 + 0.12 * Math.sin(now / 130 + i));
        ctx.beginPath(); ctx.moveTo(px - r * 0.14, py);
        ctx.quadraticCurveTo(px, py - h * 0.5, px, py - h);
        ctx.quadraticCurveTo(px, py - h * 0.5, px + r * 0.14, py);
        ctx.closePath(); ctx.fill();
      }
    } else if (k === 'sack') {
      const sx = e.x + r * 0.6 * sd, sy = e.y - r * 0.1;
      ctx.fillStyle = deep;
      ctx.beginPath(); ctx.moveTo(sx, sy - r * 0.35);
      ctx.quadraticCurveTo(sx + r * 0.45, sy + r * 0.1, sx, sy + r * 0.5);
      ctx.quadraticCurveTo(sx - r * 0.45, sy + r * 0.1, sx, sy - r * 0.35);
      ctx.fill();
      ctx.strokeStyle = acc; ctx.lineWidth = Math.max(1, lw * 0.5);
      ctx.beginPath(); ctx.moveTo(sx - r * 0.18, sy - r * 0.2); ctx.lineTo(sx + r * 0.18, sy - r * 0.2); ctx.stroke();
    } else if (k === 'boxlid') {
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.translate(e.x, e.y - r * 0.15); ctx.rotate(-0.35 + 0.15 * pul);
      ctx.fillStyle = deep;
      ctx.fillRect(-r * 0.5 * s, -r * 0.7 * s, r * s, r * 1.4 * s);
      ctx.strokeStyle = acc; ctx.lineWidth = Math.max(1, lw * 0.5);
      ctx.strokeRect(-r * 0.5 * s, -r * 0.7 * s, r * s, r * 1.4 * s);
      ctx.beginPath(); ctx.moveTo(-r * 0.3, 0); ctx.lineTo(r * 0.3, 0); ctx.stroke();
      ctx.restore();
    } else if (k === 'chains') {
      ctx.lineWidth = Math.max(1, lw * 0.45);
      for (let i = 0; i < n; i++) {
        const t = i / nd;
        const px = e.x - r * 0.7 + t * r * 1.4, py = e.y + r * 0.15 + Math.sin(now / 260 + phase + t * 3) * r * 0.12;
        ctx.beginPath(); ctx.ellipse(px, py, r * 0.13, r * 0.09, 0.5, 0, Math.PI * 2); ctx.stroke();
      }
    } else if (k === 'stack') {
      ctx.fillStyle = deep;
      for (let i = 0; i < n; i++) {
        ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.55 - i * r * 0.3, Math.max(1, r * (0.5 - i * 0.1)), r * 0.14, 0, 0, Math.PI * 2); ctx.fill();
      }
    } else if (k === 'claws') {
      ctx.lineWidth = Math.max(1, lw * 0.6);
      for (const g of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const bx = e.x + g * r * 0.5, by = e.y + r * 0.05 + (i - 1) * r * 0.14;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + g * r * 0.35, by, bx + g * r * 0.45 * s, by + r * 0.18); ctx.stroke();
        }
      }
    } else if (k === 'tablet') {
      ctx.fillStyle = deep;
      ctx.beginPath(); ctx.moveTo(e.x - r * 0.4 * s, e.y + r * 0.5); ctx.lineTo(e.x - r * 0.4 * s, e.y - r * 0.2);
      ctx.quadraticCurveTo(e.x, e.y - r * 0.6, e.x + r * 0.4 * s, e.y - r * 0.2);
      ctx.lineTo(e.x + r * 0.4 * s, e.y + r * 0.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = acc; ctx.lineWidth = Math.max(1, lw * 0.35);
      for (let i = 0; i < 3; i++) {
        const py = e.y - r * 0.1 + i * r * 0.2;
        ctx.beginPath(); ctx.moveTo(e.x - r * 0.25, py); ctx.lineTo(e.x + r * 0.25, py); ctx.stroke();
      }
    } else if (k === 'veil') {
      ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.moveTo(hx - r * 0.45 * s, hy - r * 0.15);
      ctx.quadraticCurveTo(hx, hy - r * 0.62 * s, hx + r * 0.45 * s, hy - r * 0.15);
      ctx.lineTo(hx + r * 0.5 * s, e.y + r * 0.35);
      for (let i = 3; i >= 0; i--) {
        const t = i / 3;
        ctx.lineTo(hx - r * 0.5 * s + t * r * s, e.y + r * (0.35 + 0.12 * (i % 2)));
      }
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (k === 'keys') {
      ctx.lineWidth = Math.max(1, lw * 0.4);
      const kx = e.x + r * 0.5, ky = e.y + r * 0.1 - r * 0.25;
      ctx.beginPath(); ctx.arc(kx, ky, Math.max(1, r * 0.12), 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < n; i++) {
        const a = -0.6 + i * 0.55 + Math.sin(now / 420 + phase) * 0.12;
        const ex = kx + Math.sin(a) * r * 0.5, ey = ky + Math.cos(a) * r * 0.5;
        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + r * 0.12, ey + r * 0.06); ctx.stroke();
      }
    } else if (k === 'mask') {
      ctx.fillStyle = deep;
      ctx.beginPath(); ctx.ellipse(hx, hy, r * 0.38 * s, r * 0.46 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = acc;
      for (const g of [-1, 1]) { ctx.beginPath(); ctx.ellipse(hx + g * r * 0.15, hy - r * 0.08, r * 0.09, r * 0.06, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = acc; ctx.lineWidth = Math.max(1, lw * 0.35);
      ctx.beginPath(); ctx.moveTo(hx - r * 0.02, hy - r * 0.4); ctx.lineTo(hx + r * 0.02, hy + r * 0.4); ctx.stroke();
    } else if (k === 'plates') {
      for (let i = 0; i < n; i++) {
        const py = e.y - r * 0.4 + i * r * 0.38;
        ctx.fillStyle = deep;
        ctx.fillRect(e.x - r * 0.5 * s, py, r * s, r * 0.24);
        ctx.fillStyle = acc;
        for (let j = 0; j < 3; j++) {
          ctx.beginPath(); ctx.arc(e.x - r * 0.35 * s + j * r * 0.35 * s, py + r * 0.12, Math.max(1, r * 0.05), 0, Math.PI * 2); ctx.fill();
        }
      }
    } else if (k === 'quill') {
      const qx = hx + r * 0.5 * s;
      const qy = hy - r * 0.5 * s;
      ctx.strokeStyle = acc; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(qx - r * 0.55 * s, qy + r * 0.85 * s); ctx.stroke();
      ctx.fillStyle = deep;
      ctx.beginPath();
      ctx.moveTo(qx, qy);
      ctx.quadraticCurveTo(qx + r * 0.18 * s, qy - r * 0.5 * s, qx - r * 0.12 * s, qy - r * 0.62 * s);
      ctx.quadraticCurveTo(qx - r * 0.3 * s, qy - r * 0.24 * s, qx, qy);
      ctx.fill();
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.arc(qx - r * 0.62 * s, qy + r * 0.95 * s, Math.max(1, r * 0.11 * s) * (0.8 + 0.3 * pul), 0, Math.PI * 2); ctx.fill();
    } else if (k === 'clapper') {
      ctx.strokeStyle = acc; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.arc(hx, hy - r * 0.05, r * 0.5 * s, Math.PI * 0.08, Math.PI * 0.92); ctx.stroke();
      const sw = Math.sin(now / (m.sp || 520) + phase) * 0.6;
      const cx = hx + Math.sin(sw) * r * 0.34 * s;
      const cy = hy - r * 0.05 + Math.cos(sw) * r * 0.38 * s;
      ctx.strokeStyle = deep; ctx.lineWidth = Math.max(1, lw * 0.7);
      ctx.beginPath(); ctx.moveTo(hx, hy - r * 0.05); ctx.lineTo(cx, cy); ctx.stroke();
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, r * 0.13 * s), 0, Math.PI * 2); ctx.fill();
    } else if (k === 'spinneret') {
      ctx.strokeStyle = acc; ctx.lineWidth = Math.max(1, lw * 0.5);
      for (let i = 0; i < n; i++) {
        const a = Math.PI * 0.45 + (i / nd) * Math.PI * 0.5;
        const bx = e.x - Math.cos(a) * r * 0.2 * s;
        const by = e.y + r * 0.2;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx - Math.cos(a) * r * 0.5 * s, by + r * 0.4 * s, bx - Math.cos(a) * r * 0.95 * s, by + r * (0.5 + 0.1 * pul) * s);
        ctx.stroke();
      }
      ctx.fillStyle = deep;
      ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.18, r * 0.26 * s, r * 0.2 * s, 0, 0, Math.PI * 2); ctx.fill();
    } else if (k === 'banner') {
      const px = hx - r * 0.55 * s;
      ctx.strokeStyle = deep; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(px, hy - r * 0.75 * s); ctx.lineTo(px, hy + r * 0.75 * s); ctx.stroke();
      const wv = Math.sin(now / (m.sp || 520) + phase) * r * 0.12 * s;
      ctx.fillStyle = acc;
      ctx.beginPath();
      ctx.moveTo(px, hy - r * 0.72 * s);
      ctx.quadraticCurveTo(px + r * 0.4 * s, hy - r * 0.5 * s + wv, px + r * 0.72 * s, hy - r * 0.28 * s);
      ctx.lineTo(px, hy - r * 0.12 * s);
      ctx.closePath(); ctx.fill();
    } else if (k === 'embers') {
      for (let i = 0; i < n; i++) {
        const t = (now / (m.sp || 520) + phase + i / n) % 1;
        const ex = e.x + Math.sin((phase + i) * 2.3) * r * 0.5 * s;
        const ey = e.y + r * 0.35 - t * r * 1.5 * s;
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = t < 0.5 ? acc : deep;
        ctx.beginPath(); ctx.arc(ex, ey, Math.max(1, r * 0.1 * s * (1 - t * 0.6)), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (k === 'battlement') {
      const bw = r * 1.3 * s / n;
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = i % 2 === 0 ? acc : deep;
        ctx.fillRect(e.x - r * 0.65 * s + i * bw, hy - r * 0.95 * s - (i % 2 === 0 ? r * 0.2 : 0), bw * 0.82, r * 0.4 * s);
      }
      ctx.strokeStyle = deep; ctx.lineWidth = Math.max(1, lw * 0.6);
      ctx.beginPath(); ctx.moveTo(e.x - r * 0.68 * s, hy - r * 0.55 * s); ctx.lineTo(e.x + r * 0.68 * s, hy - r * 0.55 * s); ctx.stroke();
    } else if (k === 'shuttle') {
      const spin = now / (m.sp || 520) + phase;
      ctx.strokeStyle = acc; ctx.lineWidth = Math.max(1, lw * 0.6);
      for (let i = 0; i < n; i++) {
        const a = spin + (i / n) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(e.x + Math.cos(a) * r * 0.18 * s, e.y + Math.sin(a) * r * 0.18 * s);
        ctx.lineTo(e.x + Math.cos(a) * r * 0.72 * s, e.y + Math.sin(a) * r * 0.72 * s);
        ctx.stroke();
      }
      ctx.strokeStyle = deep; ctx.lineWidth = Math.max(1, lw * 0.5);
      ctx.beginPath(); ctx.arc(e.x, e.y, r * 0.72 * s, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.arc(e.x, e.y, Math.max(1, r * 0.12 * s), 0, Math.PI * 2); ctx.fill();
    } else if (k === 'cage') {
      ctx.strokeStyle = acc; ctx.lineWidth = Math.max(1, lw * 0.6);
      for (let i = 0; i < n; i++) {
        const t = -0.5 + i / nd;
        ctx.beginPath();
        ctx.moveTo(e.x + t * r * 1.1 * s, e.y - r * 0.75 * s);
        ctx.quadraticCurveTo(e.x + t * r * 1.45 * s, e.y, e.x + t * r * 1.1 * s, e.y + r * 0.75 * s);
        ctx.stroke();
      }
      ctx.strokeStyle = deep; ctx.lineWidth = Math.max(1, lw * 0.8);
      ctx.beginPath(); ctx.moveTo(e.x - r * 0.7 * s, e.y - r * 0.72 * s); ctx.lineTo(e.x + r * 0.7 * s, e.y - r * 0.72 * s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(e.x - r * 0.7 * s, e.y + r * 0.72 * s); ctx.lineTo(e.x + r * 0.7 * s, e.y + r * 0.72 * s); ctx.stroke();
    } else if (k === 'snout') {
      const dir = e.facingAngle !== undefined && Math.cos(e.facingAngle) < 0 ? -1 : 1;
      ctx.fillStyle = deep;
      ctx.beginPath();
      ctx.moveTo(hx, hy - r * 0.18 * s);
      ctx.lineTo(hx + dir * r * 0.95 * s, hy + r * 0.02 * s);
      ctx.lineTo(hx, hy + r * 0.34 * s);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.arc(hx + dir * r * 0.8 * s, hy + r * 0.06 * s, Math.max(1, r * 0.08 * s), 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx + dir * r * 0.62 * s, hy + r * 0.14 * s, Math.max(1, r * 0.06 * s), 0, Math.PI * 2); ctx.fill();
    } else if (k === 'reliquary') {
      const bw = r * 0.78 * s;
      const bh = r * 0.5 * s;
      ctx.fillStyle = deep;
      ctx.fillRect(hx - bw / 2, hy - bh * 0.1, bw, bh);
      ctx.fillStyle = acc;
      ctx.beginPath();
      ctx.moveTo(hx - bw / 2, hy - bh * 0.1);
      ctx.quadraticCurveTo(hx, hy - bh * (0.85 + 0.12 * pul), hx + bw / 2, hy - bh * 0.1);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = acc; ctx.lineWidth = Math.max(1, lw * 0.5);
      ctx.beginPath(); ctx.moveTo(hx, hy - bh * 0.1); ctx.lineTo(hx, hy + bh * 0.9); ctx.stroke();
    }
    ctx.restore();
  },

  _forestMark(ctx, e, flash, now, phase, col, dark, r, hx, hy, m){
    const k = m.k;
    const s = m.s || 1;
    const n = m.n || 3;
    const nd = n > 1 ? n - 1 : 1;
    const sd = m.sd || 1;
    const acc = flash ? Theme.enemy.flash : Util.shadeColor(col, m.t === undefined ? 0.42 : m.t);
    const deep = flash ? Theme.enemy.flashSoft : Util.shadeColor(dark, -0.08);
    const pul = 0.5 + 0.5 * Math.sin(now / (m.sp || 520) + phase);
    const lw = Math.max(1, r * 0.1 * s);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = acc;
    ctx.fillStyle = acc;
    ctx.lineWidth = lw;
    if (m.g) { ctx.shadowColor = acc; ctx.shadowBlur = 3 + 5 * pul; }

    if (k === 'sporeburst') {
      for (let i = 0; i < n; i++) {
        const t = (now / 1100 + phase + i / n) % 1;
        ctx.globalAlpha = 0.65 * (1 - t);
        const a = phase + i * 2.4;
        ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * r * (0.4 + t * 0.9), e.y - r * 0.1 + Math.sin(a) * r * (0.3 + t * 0.7), Math.max(1, r * 0.13 * (1 - t * 0.5)), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (k === 'lampglow') {
      ctx.globalAlpha = 0.4 + 0.5 * pul;
      ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.42, r * 0.34 * s, r * 0.26 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = Math.max(1, lw * 0.5);
      ctx.beginPath(); ctx.arc(e.x, e.y + r * 0.42, r * 0.48 * s * (0.9 + 0.25 * pul), 0, Math.PI * 2); ctx.stroke();
    } else if (k === 'thorns') {
      for (let i = 0; i < n; i++) {
        const a = i * (Math.PI * 2 / n) + phase * 0.3;
        const bx = e.x + Math.cos(a) * r * 0.62 * s, by = e.y + Math.sin(a) * r * 0.5 * s;
        ctx.beginPath();
        ctx.moveTo(bx - Math.sin(a) * r * 0.12, by + Math.cos(a) * r * 0.12);
        ctx.lineTo(bx + Math.cos(a) * r * 0.4 * s, by + Math.sin(a) * r * 0.4 * s);
        ctx.lineTo(bx + Math.sin(a) * r * 0.12, by - Math.cos(a) * r * 0.12);
        ctx.closePath(); ctx.fill();
      }
    } else if (k === 'saplingleaf') {
      ctx.lineWidth = Math.max(1, lw * 0.7);
      ctx.beginPath(); ctx.moveTo(hx, hy - r * 0.2); ctx.lineTo(hx, hy - r * 0.8 * s); ctx.stroke();
      for (const g of [-1, 1]) {
        const sway = Math.sin(now / 620 + phase + g) * 0.18;
        ctx.beginPath(); ctx.ellipse(hx + g * r * 0.26 * s, hy - r * 0.62 * s, r * 0.26 * s, r * 0.13 * s, g * 0.7 + sway, 0, Math.PI * 2); ctx.fill();
      }
    } else if (k === 'tongue') {
      const out = Math.max(0, Math.sin(now / 700 + phase));
      ctx.lineWidth = Math.max(1.2, lw * 0.8);
      ctx.beginPath();
      ctx.moveTo(hx, hy + r * 0.12);
      ctx.quadraticCurveTo(hx + sd * r * 0.7 * out, hy + r * 0.3, hx + sd * r * 1.3 * s * out, hy + r * 0.05);
      ctx.stroke();
      if (out > 0.15) { ctx.beginPath(); ctx.arc(hx + sd * r * 1.3 * s * out, hy + r * 0.05, Math.max(1, r * 0.11), 0, Math.PI * 2); ctx.fill(); }
    } else if (k === 'vinecoil') {
      ctx.lineWidth = Math.max(1, lw * 0.7);
      for (let i = 0; i < n; i++) {
        const cy = e.y - r * 0.35 + i * r * 0.36;
        const w = r * (0.55 + 0.12 * Math.sin(now / 640 + phase + i));
        ctx.beginPath(); ctx.arc(e.x + sd * r * 0.1, cy, w, -0.6, Math.PI + 0.6); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(e.x + sd * r * 0.65, e.y + r * 0.35, Math.max(1, r * 0.12), 0, Math.PI * 2); ctx.fill();
    } else if (k === 'tusks') {
      ctx.fillStyle = deep;
      for (const g of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(hx + g * r * 0.2, hy + r * 0.16);
        ctx.quadraticCurveTo(hx + g * r * 0.55 * s, hy + r * 0.1, hx + g * r * 0.46 * s, hy - r * 0.35 * s);
        ctx.quadraticCurveTo(hx + g * r * 0.4 * s, hy + r * 0.05, hx + g * r * 0.16, hy + r * 0.26);
        ctx.closePath(); ctx.fill();
      }
    } else if (k === 'mosspatch') {
      ctx.globalAlpha = 0.7;
      for (let i = 0; i < n; i++) {
        const a = phase + i * 1.9;
        ctx.beginPath(); ctx.ellipse(e.x + Math.cos(a) * r * 0.42, e.y + Math.sin(a) * r * 0.36, r * 0.24, r * 0.16, a, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (k === 'wispflame') {
      ctx.globalAlpha = 0.55 + 0.35 * pul;
      const h = r * (0.85 + 0.25 * pul);
      ctx.beginPath();
      ctx.moveTo(hx, hy - r * 0.3 - h);
      ctx.quadraticCurveTo(hx + r * 0.42, hy - r * 0.1, hx, hy + r * 0.2);
      ctx.quadraticCurveTo(hx - r * 0.42, hy - r * 0.1, hx, hy - r * 0.3 - h);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (k === 'swarmdots') {
      for (let i = 0; i < n; i++) {
        const a = now / (m.sp || 180) + phase + i * (Math.PI * 2 / n);
        ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * r * (0.9 + 0.2 * Math.sin(a * 3)), e.y - r * 0.1 + Math.sin(a * 1.7) * r * 0.6, Math.max(1, r * 0.1), 0, Math.PI * 2); ctx.fill();
      }
    } else if (k === 'thornshield') {
      const bx = e.x + r * 0.72 * sd;
      ctx.fillStyle = deep;
      ctx.beginPath(); ctx.ellipse(bx, e.y, r * 0.3 * s, r * 0.62 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = acc; ctx.lineWidth = Math.max(1, lw * 0.6);
      for (let i = 0; i < 4; i++) {
        const py = e.y - r * 0.42 * s + i * r * 0.28 * s;
        ctx.beginPath(); ctx.moveTo(bx, py); ctx.lineTo(bx + r * 0.36 * sd, py - r * 0.1); ctx.stroke();
      }
    } else if (k === 'snort') {
      for (let i = 0; i < n; i++) {
        const t = (now / 520 + phase + i / n) % 1;
        ctx.globalAlpha = 0.5 * (1 - t);
        for (const g of [-1, 1]) {
          ctx.beginPath(); ctx.arc(hx + g * r * (0.22 + t * 0.5) * s, hy + r * 0.22 - t * r * 0.2, Math.max(1, r * (0.09 + t * 0.12)), 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    } else if (k === 'owleyes') {
      ctx.fillStyle = flash ? Theme.enemy.flashSoft : Theme.pony.eyeWhite;
      for (const g of [-1, 1]) {
        ctx.beginPath(); ctx.arc(hx + g * r * 0.24 * s, hy - r * 0.02, r * 0.22 * s, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = acc;
      const gz = Math.sin(now / 1500 + phase) * r * 0.07;
      for (const g of [-1, 1]) {
        ctx.beginPath(); ctx.arc(hx + g * r * 0.24 * s + gz, hy - r * 0.02, r * 0.1 * s, 0, Math.PI * 2); ctx.fill();
      }
    } else if (k === 'foxears') {
      ctx.fillStyle = deep;
      for (const g of [-1, 1]) {
        const tw = Math.sin(now / 800 + phase + g) * r * 0.05;
        ctx.beginPath();
        ctx.moveTo(hx + g * r * 0.1, hy - r * 0.28);
        ctx.lineTo(hx + g * r * 0.44 * s + tw, hy - r * 0.95 * s);
        ctx.lineTo(hx + g * r * 0.5 * s, hy - r * 0.24);
        ctx.closePath(); ctx.fill();
      }
    } else if (k === 'fernfrond') {
      ctx.lineWidth = Math.max(1, lw * 0.5);
      const sway = Math.sin(now / 780 + phase) * 0.2;
      ctx.beginPath(); ctx.moveTo(e.x, e.y + r * 0.3); ctx.quadraticCurveTo(e.x + r * 0.2, e.y - r * 0.5, e.x + r * 0.15 + sway * r, e.y - r * 1.05); ctx.stroke();
      for (let i = 0; i < n; i++) {
        const t = i / nd;
        const px = e.x + 0.2 * r * t + sway * r * t, py = e.y + r * 0.3 - t * r * 1.3;
        for (const g of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + g * r * 0.3 * (1 - t * 0.5), py - r * 0.14); ctx.stroke();
        }
      }
    } else if (k === 'tendrils') {
      const len = (m.len || 1) * r * 0.8;
      ctx.lineWidth = Math.max(1, lw * 0.6);
      for (let i = 0; i < n; i++) {
        const g = i % 2 ? 1 : -1, t = Math.floor(i / 2);
        const oy = e.y + r * 0.1 + t * r * 0.35;
        const wob = Math.sin(now / 480 + phase + i) * r * 0.22;
        ctx.beginPath(); ctx.moveTo(e.x + g * r * 0.3, oy);
        ctx.quadraticCurveTo(e.x + g * (r * 0.3 + len * 0.6), oy + wob, e.x + g * (r * 0.3 + len), oy + r * 0.3);
        ctx.stroke();
      }
    } else if (k === 'weave') {
      ctx.lineWidth = Math.max(1, lw * 0.45);
      ctx.globalAlpha = 0.65;
      for (let i = 0; i < n; i++) {
        const t = i / nd - 0.5;
        ctx.beginPath(); ctx.moveTo(e.x - r * 0.75, e.y + t * r * 0.9); ctx.lineTo(e.x + r * 0.75, e.y + t * r * 0.9 + r * 0.2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(e.x + t * r * 0.9, e.y - r * 0.75); ctx.lineTo(e.x + t * r * 0.9 + r * 0.2, e.y + r * 0.75); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (k === 'barkrings') {
      ctx.lineWidth = Math.max(1, lw * 0.5);
      for (let i = 0; i < n; i++) {
        ctx.beginPath(); ctx.arc(e.x - r * 0.1, e.y + r * 0.05, r * (0.2 + i * 0.19), -1.1, 1.4); ctx.stroke();
      }
    } else if (k === 'mothwings') {
      const flap = Math.sin(now / 260 + phase) * 0.3;
      ctx.globalAlpha = 0.55;
      for (const g of [-1, 1]) {
        ctx.beginPath(); ctx.ellipse(e.x + g * r * 0.62 * s, e.y - r * 0.28, r * 0.5 * s, r * 0.3 * s, g * (0.5 + flap), 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(e.x + g * r * 0.5 * s, e.y + r * 0.16, r * 0.3 * s, r * 0.18 * s, g * (0.3 - flap), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (k === 'dirtmound') {
      ctx.fillStyle = deep;
      ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.72, r * 0.85 * s, r * 0.28 * s, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = acc;
      for (let i = 0; i < n; i++) {
        const t = i / nd - 0.5;
        ctx.beginPath(); ctx.arc(e.x + t * r * 1.2, e.y + r * 0.62 - Math.abs(t) * r * 0.15, Math.max(1, r * 0.09), 0, Math.PI * 2); ctx.fill();
      }
    } else if (k === 'seedpods') {
      for (let i = 0; i < n; i++) {
        const a = phase + i * (Math.PI * 2 / n) + now / 1400;
        const px = e.x + Math.cos(a) * r * 0.72, py = e.y - r * 0.1 + Math.sin(a) * r * 0.4;
        ctx.beginPath(); ctx.ellipse(px, py, r * 0.16, r * 0.24, a, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = deep; ctx.lineWidth = Math.max(1, lw * 0.4);
        ctx.beginPath(); ctx.moveTo(px, py - r * 0.22); ctx.lineTo(px, py + r * 0.22); ctx.stroke();
        ctx.strokeStyle = acc;
      }
    } else if (k === 'honeycomb') {
      ctx.fillStyle = flash ? Theme.enemy.flash : Util.shadeColor(col, 0.3);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.ellipse(e.x, e.y - r * 0.35 + i * r * 0.42, r * (1.0 - i * 0.22) * s, r * 0.26 * s, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = flash ? Theme.enemy.flash : dark;
      ctx.lineWidth = Math.max(1, r * 0.09);
      for (let i = 0; i < n; i++) {
        const cx2 = e.x + (i % 2 ? r * 0.34 : -r * 0.34);
        const cy2 = e.y - r * 0.2 + Math.floor(i / 2) * r * 0.42;
        ctx.beginPath();
        for (let q = 0; q < 6; q++) {
          const ang = q * Math.PI / 3;
          const px2 = cx2 + Math.cos(ang) * r * 0.16, py2 = cy2 + Math.sin(ang) * r * 0.16;
          if (q === 0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2);
        }
        ctx.closePath(); ctx.stroke();
      }
      const ready = e.summonTimer != null ? Util.clamp(1 - e.summonTimer / 2, 0, 1) : 0;
      ctx.fillStyle = flash ? Theme.enemy.flash : Theme.shadow.outlineSoft;
      if (ready > 0) { ctx.shadowColor = col; ctx.shadowBlur = 6 * ready; }
      ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.5, r * 0.22, r * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    } else if (k === 'papernest') {
      ctx.fillStyle = flash ? Theme.enemy.flash : Util.shadeColor(col, 0.15);
      for (let i = 0; i < n; i++) {
        ctx.beginPath(); ctx.ellipse(e.x, e.y - r * 0.35 + i * r * 0.42, r * (1.0 - i * 0.22) * s, r * 0.26 * s, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = flash ? Theme.enemy.flash : dark;
      ctx.lineWidth = Math.max(1, r * 0.09);
      for (let i = 0; i < n; i++) {
        ctx.beginPath(); ctx.ellipse(e.x, e.y - r * 0.35 + i * r * 0.42, r * (1.0 - i * 0.22) * s, r * 0.26 * s, 0, Math.PI, Math.PI * 2); ctx.stroke();
      }
      const ready = e.summonTimer != null ? Util.clamp(1 - e.summonTimer / 2, 0, 1) : 0;
      ctx.fillStyle = flash ? Theme.enemy.flash : Theme.shadow.outlineSoft;
      if (ready > 0) { ctx.shadowColor = col; ctx.shadowBlur = 6 * ready; }
      ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.5, r * 0.22, r * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    } else if (k === 'rootlash') {
      const grow = e.submerged ? 0.35 : 1;
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = flash ? Theme.enemy.flash : dark;
      ctx.lineWidth = Math.max(1.2, r * 0.14);
      for (let i = 0; i < n; i++) {
        const a2 = phase + i * 2.1 + Math.sin(now / 700 + i) * 0.25;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y + r * 0.55);
        ctx.lineTo(e.x + Math.cos(a2) * r * 0.9 * grow, e.y + r * 0.55 + Math.abs(Math.sin(a2)) * r * 0.3 * grow);
        ctx.stroke();
      }
      if (e.lobTimer > 0) {
        ctx.strokeStyle = flash ? Theme.enemy.flash : col;
        ctx.lineWidth = Math.max(1, r * 0.1);
        ctx.beginPath(); ctx.arc(e.x, e.y, r * 1.05, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (k === 'emberpair') {
      ctx.fillStyle = flash ? Theme.enemy.flash : Theme.fx.fuseHot;
      ctx.shadowColor = Theme.fx.fuseHot; ctx.shadowBlur = 4 + 6 * pul;
      for (const g of [-1, 1]) {
        ctx.beginPath(); ctx.arc(e.x + g * r * 0.55, e.y - r * 0.35 - pul * r * 0.18, r * 0.12, 0, Math.PI * 2); ctx.fill();
      }
      if (e.burnFlash > 0) {
        ctx.globalAlpha = Util.clamp(e.burnFlash / 0.18, 0, 1);
        ctx.strokeStyle = Theme.fx.fuseHot; ctx.lineWidth = Math.max(1.5, r * 0.16);
        ctx.beginPath(); ctx.arc(e.x, e.y, r * (1.1 + (1 - ctx.globalAlpha) * 1.4), 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    } else if (k === 'pumpjack') {
      const nod = Math.sin(now / (m.sp || 320) + phase) * r * 0.22;
      ctx.strokeStyle = acc;
      ctx.lineWidth = Math.max(1.4, r * 0.16);
      ctx.beginPath();
      ctx.moveTo(e.x - r * 0.6 * s, e.y - r * 0.5);
      ctx.lineTo(e.x + r * 0.6 * s, e.y - r * 0.5 + nod);
      ctx.stroke();
      ctx.fillStyle = flash ? Theme.enemy.flash : '#1a1410';
      ctx.beginPath(); ctx.ellipse(e.x + r * 0.6 * s, e.y - r * 0.28 + nod, r * 0.16, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    } else if (k === 'healcross') {
      const w = r * 0.13 * s, h = r * 0.42 * s * (0.85 + 0.2 * pul);
      ctx.globalAlpha = 0.65 + 0.35 * pul;
      ctx.fillRect(hx - w / 2, hy - r * 0.55 - h / 2, w, h);
      ctx.fillRect(hx - h / 2, hy - r * 0.55 - w / 2, h, w);
      ctx.globalAlpha = 1;
    } else if (k === 'scope') {
      const bx = e.x + r * 0.7 * s * sd, by = e.y - r * 0.25;
      ctx.lineWidth = Math.max(1, lw * 0.6);
      ctx.beginPath(); ctx.arc(bx, by, r * 0.3 * s, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx - r * 0.3 * s, by); ctx.lineTo(bx + r * 0.3 * s, by); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx, by - r * 0.3 * s); ctx.lineTo(bx, by + r * 0.3 * s); ctx.stroke();
      ctx.strokeStyle = deep;
      ctx.beginPath(); ctx.moveTo(e.x, e.y + r * 0.1); ctx.lineTo(bx, by); ctx.stroke();
    } else if (k === 'gnats') {
      for (let i = 0; i < n; i++) {
        const a = now / (m.sp || 140) + phase + i * 2.7;
        ctx.globalAlpha = 0.45 + 0.4 * Math.sin(a * 2);
        ctx.beginPath(); ctx.arc(e.x + Math.cos(a * 1.3) * r * 1.0, e.y - r * 0.15 + Math.sin(a) * r * 0.85, Math.max(1, r * 0.07), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (k === 'ambushbush') {
      ctx.globalAlpha = e.hidden ? 0.35 : 0.85;
      for (let i = 0; i < n; i++) {
        const a = Math.PI + i * (Math.PI / nd);
        ctx.beginPath(); ctx.ellipse(e.x + Math.cos(a) * r * 0.6, e.y - r * 0.15 + Math.sin(a) * r * 0.5, r * 0.28, r * 0.2, a, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (k === 'blinkring') {
      const t = (now / (m.sp || 440) + phase) % 1;
      ctx.globalAlpha = 0.7 * (1 - t);
      ctx.lineWidth = Math.max(1, lw * 0.7);
      ctx.beginPath(); ctx.arc(e.x, e.y, r * (0.4 + t * 1.0), 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.5 + 0.5 * pul;
      ctx.beginPath(); ctx.arc(hx, hy - r * 0.1, Math.max(1, r * 0.16), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (k === 'rollball') {
      const spin = now / 220 + phase;
      ctx.fillStyle = deep;
      ctx.beginPath(); ctx.arc(e.x, e.y + r * 0.3, r * 0.55 * s, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = acc; ctx.lineWidth = Math.max(1, lw * 0.6);
      for (let i = 0; i < 3; i++) {
        const a = spin + i * (Math.PI * 2 / 3);
        ctx.beginPath(); ctx.moveTo(e.x, e.y + r * 0.3); ctx.lineTo(e.x + Math.cos(a) * r * 0.55 * s, e.y + r * 0.3 + Math.sin(a) * r * 0.55 * s); ctx.stroke();
      }
    } else if (k === 'sparkarc') {
      ctx.lineWidth = Math.max(1, lw * 0.5);
      for (let i = 0; i < n; i++) {
        const a0 = phase + i * (Math.PI * 2 / n) + now / (m.sp || 160);
        const r0 = r * 0.5, r1 = r * (0.95 + 0.2 * pul);
        ctx.globalAlpha = 0.4 + 0.6 * ((Math.sin(now / 90 + i * 2) + 1) / 2);
        ctx.beginPath();
        ctx.moveTo(e.x + Math.cos(a0) * r0, e.y + Math.sin(a0) * r0);
        ctx.lineTo(e.x + Math.cos(a0 + 0.35) * r1 * 0.8, e.y + Math.sin(a0 + 0.35) * r1 * 0.8);
        ctx.lineTo(e.x + Math.cos(a0 + 0.1) * r1, e.y + Math.sin(a0 + 0.1) * r1);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (k === 'venomdrip') {
      for (let i = 0; i < n; i++) {
        const t = (now / 900 + phase + i / n) % 1;
        ctx.globalAlpha = 0.75 * (1 - t * 0.7);
        const px = e.x + (i / nd - 0.5) * r * 0.9;
        ctx.beginPath(); ctx.ellipse(px, e.y + r * 0.35 + t * r * 0.6, r * 0.09, r * 0.15, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (k === 'thornflail') {
      const ax = e.x + r * 0.55 * sd, ay = e.y - r * 0.2;
      const sw = Math.sin(now / 240 + phase) * 0.8;
      const bx2 = ax + Math.cos(sw - 1.0) * r * 0.95 * s * sd, by2 = ay + Math.sin(sw - 1.0) * r * 0.95 * s;
      ctx.lineWidth = Math.max(1, lw * 0.6);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx2, by2); ctx.stroke();
      ctx.fillStyle = deep;
      ctx.beginPath(); ctx.arc(bx2, by2, r * 0.2 * s, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = acc;
      for (let i = 0; i < 5; i++) {
        const a = i * (Math.PI * 2 / 5) + sw;
        ctx.beginPath(); ctx.moveTo(bx2, by2); ctx.lineTo(bx2 + Math.cos(a) * r * 0.34 * s, by2 + Math.sin(a) * r * 0.34 * s); ctx.stroke();
      }
    } else if (k === 'whipvine') {
      const sw = Math.sin(now / 300 + phase);
      ctx.lineWidth = Math.max(1.2, lw * 0.8);
      ctx.beginPath();
      ctx.moveTo(e.x + sd * r * 0.5, e.y + r * 0.15);
      ctx.bezierCurveTo(e.x + sd * r * 1.1, e.y + r * (0.3 + sw * 0.3), e.x + sd * r * 1.3, e.y - r * (0.3 + sw * 0.3), e.x + sd * r * 1.7, e.y - r * 0.5);
      ctx.stroke();
      for (let i = 0; i < n; i++) {
        const t = (i + 1) / (n + 1);
        ctx.beginPath(); ctx.arc(e.x + sd * r * (0.5 + t * 1.2), e.y + r * (0.15 - t * 0.6) + sw * r * 0.18, Math.max(1, r * 0.09), 0, Math.PI * 2); ctx.fill();
      }
    } else if (k === 'brambleward') {
      ctx.lineWidth = Math.max(1, lw * 0.5);
      for (let i = 0; i < n; i++) {
        const a = now / 900 + phase + i * (Math.PI * 2 / n);
        const px = e.x + Math.cos(a) * r * 1.05 * s, py = e.y + Math.sin(a) * r * 0.55 * s;
        ctx.beginPath();
        ctx.moveTo(px - r * 0.14, py); ctx.lineTo(px, py - r * 0.26); ctx.lineTo(px + r * 0.14, py); ctx.closePath(); ctx.fill();
      }
      ctx.beginPath(); ctx.ellipse(e.x, e.y, r * 1.05 * s, r * 0.55 * s, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (k === 'acorn') {
      const bx = e.x + r * 0.62 * sd, by = e.y - r * 0.55 * s;
      ctx.fillStyle = deep;
      ctx.beginPath(); ctx.arc(bx, by + r * 0.16, r * 0.24 * s, 0, Math.PI); ctx.fill();
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.ellipse(bx, by, r * 0.26 * s, r * 0.18 * s, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.lineWidth = Math.max(1, lw * 0.5);
      ctx.beginPath(); ctx.moveTo(bx, by - r * 0.18 * s); ctx.lineTo(bx, by - r * 0.4 * s); ctx.stroke();
    } else if (k === 'bristles') {
      ctx.lineWidth = Math.max(1, lw * 0.55);
      for (let i = 0; i < n; i++) {
        const t = i / nd - 0.5;
        const px = e.x + t * r * 1.1 * s, py = e.y - r * 0.35 - Math.cos(t * 2.4) * r * 0.15;
        const wob = Math.sin(now / 520 + phase + i) * r * 0.06;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + wob, py - r * 0.5 * s); ctx.stroke();
      }
    } else if (k === 'thistle') {
      ctx.lineWidth = Math.max(1, lw * 0.5);
      for (let i = 0; i < n; i++) {
        const a = i * (Math.PI * 2 / n) + phase * 0.2;
        ctx.beginPath(); ctx.moveTo(hx + Math.cos(a) * r * 0.2, hy + Math.sin(a) * r * 0.2);
        ctx.lineTo(hx + Math.cos(a) * r * 0.62, hy + Math.sin(a) * r * 0.62); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(hx, hy, r * 0.22, 0, Math.PI * 2); ctx.fill();
    } else if (k === 'stumprings') {
      ctx.lineWidth = Math.max(1, lw * 0.5);
      for (let i = 0; i < n; i++) {
        ctx.beginPath(); ctx.ellipse(e.x, e.y - r * 0.4, r * (0.25 + i * 0.24) * s, r * (0.12 + i * 0.11) * s, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = deep;
      ctx.beginPath(); ctx.ellipse(e.x, e.y - r * 0.4, r * 0.16 * s, r * 0.08 * s, 0, 0, Math.PI * 2); ctx.fill();
    } else if (k === 'mushcap') {
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.ellipse(hx, hy - r * 0.12, r * 0.72 * s, r * 0.42 * s, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = deep;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(hx + (i - 1) * r * 0.32 * s, hy - r * 0.26 - (i === 1 ? r * 0.08 : 0), r * 0.1 * s, 0, Math.PI * 2); ctx.fill();
      }
    } else if (k === 'loamthreads') {
      ctx.lineWidth = Math.max(1, lw * 0.4);
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < n; i++) {
        const a = phase + i * (Math.PI * 2 / n) + now / 1600;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.quadraticCurveTo(e.x + Math.cos(a) * r * 0.9, e.y + Math.sin(a) * r * 0.5, e.x + Math.cos(a + 0.5) * r * 1.35, e.y + Math.sin(a + 0.5) * r * 0.8);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (k === 'oakcrown') {
      ctx.fillStyle = deep;
      for (let i = 0; i < n; i++) {
        const t = i / nd - 0.5;
        ctx.beginPath(); ctx.ellipse(hx + t * r * 0.9 * s, hy - r * 0.46 * s + Math.abs(t) * r * 0.14, r * 0.2 * s, r * 0.13 * s, t * 1.1, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = acc; ctx.lineWidth = Math.max(1, lw * 0.5);
      ctx.beginPath(); ctx.moveTo(hx - r * 0.45 * s, hy - r * 0.34); ctx.quadraticCurveTo(hx, hy - r * 0.5, hx + r * 0.45 * s, hy - r * 0.34); ctx.stroke();
    } else if (k === 'burrs') {
      for (let i = 0; i < n; i++) {
        const a = phase + i * (Math.PI * 2 / n);
        const px = e.x + Math.cos(a) * r * 0.55 * s, py = e.y + Math.sin(a) * r * 0.45 * s;
        ctx.beginPath(); ctx.arc(px, py, r * 0.18 * s, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = Math.max(1, lw * 0.35);
        for (let q = 0; q < 6; q++) {
          const a2 = q * (Math.PI / 3);
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a2) * r * 0.3 * s, py + Math.sin(a2) * r * 0.3 * s); ctx.stroke();
        }
      }
    } else if (k === 'chantglyph') {
      ctx.lineWidth = Math.max(1, lw * 0.55);
      for (let i = 0; i < n; i++) {
        const t = (now / 1200 + phase + i / n) % 1;
        ctx.globalAlpha = 0.8 * (1 - t);
        const rad = r * (0.35 + t * 0.9);
        ctx.beginPath();
        for (let q = 0; q <= 6; q++) {
          const a = q * (Math.PI / 3) + t * 1.2 + phase;
          const px = hx + Math.cos(a) * rad, py = hy - r * 0.2 + Math.sin(a) * rad * 0.55;
          if (q === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (k === 'antlers') {
      ctx.lineWidth = Math.max(1, lw * 0.6);
      for (const g of [-1, 1]) {
        const bx = hx + g * r * 0.18, by = hy - r * 0.26;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + g * r * 0.4 * s, by - r * 0.6 * s, bx + g * r * 0.3 * s, by - r * 1.1 * s); ctx.stroke();
        for (let i = 0; i < n; i++) {
          const t = (i + 1) / (n + 1);
          const px = bx + g * r * 0.4 * s * t, py = by - r * 1.05 * s * t;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + g * r * 0.36 * s * (1 - t * 0.4), py - r * 0.26 * s); ctx.stroke();
        }
      }
    } else if (k === 'fungalnotes') {
      ctx.lineWidth = Math.max(1, lw * 0.5);
      for (let i = 0; i < n; i++) {
        const t = (now / 1000 + phase + i / n) % 1;
        ctx.globalAlpha = 0.85 * (1 - t);
        const px = hx + Math.sin(phase + i * 2.2 + t * 5) * r * 0.55, py = hy - r * 0.4 - t * r * 1.3;
        ctx.beginPath(); ctx.ellipse(px, py, r * 0.16, r * 0.1, 0, Math.PI, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + r * 0.22); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (k === 'dewdrops') {
      for (let i = 0; i < n; i++) {
        const a = now / 700 + phase + i * (Math.PI * 2 / n);
        const px = e.x + Math.cos(a) * r * 0.95, py = e.y - r * 0.1 + Math.sin(a) * r * 0.55;
        ctx.globalAlpha = 0.45 + 0.45 * ((Math.sin(a * 2) + 1) / 2);
        ctx.beginPath();
        ctx.moveTo(px, py - r * 0.22);
        ctx.quadraticCurveTo(px + r * 0.14, py + r * 0.06, px, py + r * 0.16);
        ctx.quadraticCurveTo(px - r * 0.14, py + r * 0.06, px, py - r * 0.22);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (k === 'heartseed') {
      const bt = 0.85 + 0.25 * pul;
      ctx.globalAlpha = 0.6 + 0.35 * pul;
      const hr = r * 0.3 * bt;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y + hr * 0.9);
      ctx.bezierCurveTo(e.x - hr * 1.5, e.y - hr * 0.4, e.x - hr * 0.5, e.y - hr * 1.3, e.x, e.y - hr * 0.5);
      ctx.bezierCurveTo(e.x + hr * 0.5, e.y - hr * 1.3, e.x + hr * 1.5, e.y - hr * 0.4, e.x, e.y + hr * 0.9);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (k === 'crowbeak') {
      ctx.fillStyle = deep;
      ctx.beginPath();
      ctx.moveTo(hx + r * 0.08, hy - r * 0.06);
      ctx.lineTo(hx + r * 0.85 * s, hy + r * 0.12);
      ctx.lineTo(hx + r * 0.08, hy + r * 0.24);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.arc(hx - r * 0.05, hy - r * 0.14, Math.max(1, r * 0.08 * s), 0, Math.PI * 2); ctx.fill();
    } else if (k === 'plume2') {
      ctx.lineWidth = Math.max(1, lw * 0.5);
      for (let i = 0; i < n; i++) {
        const t = i / nd - 0.5;
        const sway = Math.sin(now / 640 + phase + i) * r * 0.08;
        ctx.beginPath();
        ctx.moveTo(hx + t * r * 0.4 * s, hy - r * 0.28);
        ctx.quadraticCurveTo(hx + t * r * 0.8 * s + sway, hy - r * 0.7 * s, hx + t * r * 1.0 * s + sway, hy - r * 1.0 * s);
        ctx.stroke();
      }
    } else if (k === 'wings2') {
      const dragon = m.w === 'dragon';
      const flap = Math.sin(now / (dragon ? 60 : 130) + phase) * (dragon ? 0.5 : 0.35);
      ctx.globalAlpha = dragon ? 0.4 : 0.6;
      for (const g of [-1, 1]) {
        if (dragon) {
          ctx.beginPath(); ctx.ellipse(e.x + g * r * 0.75 * s, e.y - r * 0.3, r * 0.7 * s, r * 0.16 * s, g * (0.35 + flap), 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(e.x + g * r * 0.65 * s, e.y + r * 0.02, r * 0.58 * s, r * 0.13 * s, g * (0.2 - flap), 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(e.x + g * r * 0.2, e.y - r * 0.25);
          ctx.quadraticCurveTo(e.x + g * r * 0.9 * s, e.y - r * (0.7 + flap * 0.4) * s, e.x + g * r * 1.25 * s, e.y + r * 0.05);
          ctx.quadraticCurveTo(e.x + g * r * 0.7 * s, e.y + r * 0.18, e.x + g * r * 0.2, e.y - r * 0.05);
          ctx.closePath(); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    } else if (k === 'cicadashell') {
      ctx.lineWidth = Math.max(1, lw * 0.5);
      ctx.fillStyle = deep;
      ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.15, r * 0.46 * s, r * 0.62 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = acc;
      for (let i = 0; i < n; i++) {
        const py = e.y - r * 0.1 + i * r * 0.3;
        ctx.beginPath(); ctx.arc(e.x, py, r * 0.4 * s, 0.35, Math.PI - 0.35); ctx.stroke();
      }
    } else if (k === 'stalkerclaws') {
      const ext = 0.6 + 0.4 * pul;
      ctx.lineWidth = Math.max(1, lw * 0.55);
      for (const g of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const ox = e.x + g * r * 0.5, oy = e.y + r * 0.05 + (i - 1) * r * 0.2;
          ctx.beginPath(); ctx.moveTo(ox, oy);
          ctx.quadraticCurveTo(ox + g * r * 0.35 * s * ext, oy + r * 0.06, ox + g * r * 0.55 * s * ext, oy + r * 0.26);
          ctx.stroke();
        }
      }
    } else if (k === 'twinspike') {
      ctx.fillStyle = deep;
      for (const g of [-1, 1]) {
        const sp = Math.sin(now / 420 + phase + (g > 0 ? 1.6 : 0)) * r * 0.12;
        ctx.beginPath();
        ctx.moveTo(hx + g * r * 0.24 - r * 0.1, hy - r * 0.2);
        ctx.lineTo(hx + g * r * 0.4, hy - r * 1.0 * s - sp);
        ctx.lineTo(hx + g * r * 0.24 + r * 0.1, hy - r * 0.2);
        ctx.closePath(); ctx.fill();
      }
    } else if (k === 'canopyleaf') {
      ctx.globalAlpha = 0.75;
      for (let i = 0; i < n; i++) {
        const t = i / nd - 0.5;
        const sway = Math.sin(now / 840 + phase + i) * 0.24;
        ctx.beginPath(); ctx.ellipse(hx + t * r * 0.8 * s, hy - r * 0.55 * s + Math.abs(t) * r * 0.2, r * 0.3 * s, r * 0.12 * s, t * 1.3 + sway, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.lineWidth = Math.max(1, lw * 0.4);
      ctx.beginPath(); ctx.moveTo(hx, hy - r * 0.24); ctx.lineTo(hx, hy - r * 0.62 * s); ctx.stroke();
    } else if (k === 'mudclod') {
      for (let i = 0; i < n; i++) {
        const a = i * (Math.PI * 2 / n) + phase * 0.4;
        const cx = e.x + Math.cos(a) * r * 0.7 * s, cy = e.y + r * 0.35 + Math.sin(a) * r * 0.22;
        ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.2 * s, r * 0.14 * s, a, 0, Math.PI * 2); ctx.fill();
      }
    } else if (k === 'pollencloud') {
      for (let i = 0; i < n; i++) {
        const t = (now / 900 + phase + i / n) % 1;
        ctx.globalAlpha = 0.55 * (1 - t);
        const a = phase + i * 1.9;
        ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * r * (0.3 + t * 0.8), e.y - r * 0.3 + Math.sin(a) * r * (0.3 + t * 0.6), Math.max(1, r * 0.12 * (1 - t * 0.4)), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (k === 'beetlebacks') {
      for (let i = 0; i < n; i++) {
        const t = i / nd - 0.5;
        ctx.beginPath(); ctx.ellipse(hx + t * r * 0.7 * s, hy - r * 0.3, r * 0.26 * s, r * 0.18 * s, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(hx + t * r * 0.7 * s, hy - r * 0.48); ctx.lineTo(hx + t * r * 0.7 * s, hy - r * 0.12); ctx.stroke();
      }
    } else if (k === 'barknub') {
      ctx.globalAlpha = 0.7;
      for (let i = 0; i < n; i++) {
        const a = i * (Math.PI * 2 / n) + phase * 0.15;
        const bx = e.x + Math.cos(a) * r * 0.6 * s, by = e.y + Math.sin(a) * r * 0.5 * s;
        ctx.beginPath(); ctx.arc(bx, by, r * 0.16 * s, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (k === 'bloompetals') {
      for (let i = 0; i < n; i++) {
        const a = i * (Math.PI * 2 / n) + now / 700 + phase;
        ctx.beginPath(); ctx.ellipse(hx + Math.cos(a) * r * 0.5 * s, hy - r * 0.5 + Math.sin(a) * r * 0.4 * s, r * 0.22 * s, r * 0.11 * s, a, 0, Math.PI * 2); ctx.fill();
      }
    } else if (k === 'guardvines') {
      for (let i = 0; i < n; i++) {
        const t = i / nd - 0.5;
        const sway = Math.sin(now / 600 + phase + i) * r * 0.1;
        ctx.beginPath();
        ctx.moveTo(e.x + t * r * 0.9 * s, e.y + r * 0.4);
        ctx.lineTo(e.x + t * r * 0.9 * s + sway, e.y - r * 0.1);
        ctx.stroke();
      }
    } else if (k === 'duskwisp') {
      ctx.globalAlpha = 0.35 + 0.45 * pul;
      ctx.beginPath(); ctx.ellipse(e.x - sd * r * 0.4, e.y, r * 0.3 * s, r * 0.18 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (k === 'gourdcap') {
      ctx.beginPath(); ctx.ellipse(hx, hy - r * 0.1, r * 0.5 * s, r * 0.38 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = Math.max(1, lw * 0.5);
      ctx.beginPath(); ctx.moveTo(hx - r * 0.3 * s, hy - r * 0.1); ctx.lineTo(hx + r * 0.3 * s, hy - r * 0.1); ctx.stroke();
    } else if (k === 'briercoil') {
      for (let i = 0; i < n; i++) {
        const a = sd * i * 1.1 + phase + now / 1000;
        const rr = r * (0.3 + 0.1 * i);
        ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * rr, e.y + Math.sin(a) * rr, r * 0.1 * s, 0, Math.PI * 2); ctx.fill();
      }
    } else if (k === 'quillburst') {
      for (let i = 0; i < n; i++) {
        const a = i * (Math.PI * 2 / n) + phase;
        const bx = e.x + Math.cos(a) * r * 0.55 * s, by = e.y + Math.sin(a) * r * 0.55 * s;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(a) * r * 0.35 * s, by + Math.sin(a) * r * 0.35 * s);
        ctx.stroke();
      }
    }
    ctx.restore();
  },

  drawBrownHumanoid(ctx, e, flash, forceHealthBar, now, moving, bakeScale){
    now = now || 0;
    const col = flash ? Theme.enemy.flash : e.color;
    const dark = flash ? Theme.enemy.flashSoft : e.dark;
    const r = e.radius;
    const behavior = e.behavior || '';
    const isBoss = !!e.isBoss;
    const isSuper = isBoss && e.type && !!e.type.icon;
    const baked = !!bakeScale && !isBoss;

    if (behavior === 'turret') {
      if (baked) Util._blitSprite(ctx, Util._humanoidSprite(e, flash, bakeScale), e, bakeScale);
      else Util._turretStatic(ctx, e, flash);
      const pulse = 0.6 + Math.sin(now / 200) * 0.4;
      const glowCol = flash ? Theme.enemy.flash : Util.shadeColor(col, 0.6);
      ctx.save();
      ctx.shadowColor = glowCol; ctx.shadowBlur = 6 + 6 * pulse;
      ctx.fillStyle = glowCol;
      ctx.beginPath(); ctx.arc(e.x, e.y - r * 0.55, Math.max(1, r * 0.16 * pulse), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      const tmark = CRYPT_ENEMY_MARKS[e.type && e.type.id];
      if (tmark && !isBoss) Util._cryptMark(ctx, e, flash, now, (e.x + e.y) * 0.05, col, dark, r, e.x, e.y - r * 0.75, tmark);
      const tfmark = FOREST_ENEMY_MARKS[e.type && e.type.id];
      if (tfmark && !isBoss) Util._forestMark(ctx, e, flash, now, (e.x + e.y) * 0.05, col, dark, r, e.x, e.y - r * 0.75, tfmark);
      if ((e.maxHp > 3 || (forceHealthBar && e.maxHp > 0)) && !isBoss) Util.drawEnemyHealthBar(ctx, e);
      return;
    }

    if (e._faceSignPrevX !== undefined) {
      const dxFace = e.x - e._faceSignPrevX;
      if (dxFace > 0.3) e._faceSign = 1;
      else if (dxFace < -0.3) e._faceSign = -1;
    }
    e._faceSignPrevX = e.x;

    const faceSign = (!isBoss && e._faceSign) || 1;

    const phase = (e.x + e.y) * 0.05;

    const squashT = isBoss ? 0 : Util.clamp((e.hitFlash || 0) / 0.15, 0, 1);

    const breathe = Math.sin(now / 900 + phase) * 0.025 * (1 - squashT);
    const squashX = 1 + 0.14 * squashT + breathe, squashY = 1 - 0.14 * squashT + breathe;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(faceSign * squashX, squashY);
    ctx.translate(-e.x, -e.y);

    const flyer = behavior === 'flyer' || !!e.flies;

    ctx.fillStyle = Theme.shadow.ground;
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + r * (flyer ? 0.95 : 0.7), r * (flyer ? 0.55 : 0.8), r * (flyer ? 0.16 : 0.28), 0, 0, Math.PI * 2);
    ctx.fill();

    if (flyer) {

      const flap = Math.sin(now / (moving ? 90 : 260) + phase) * (moving ? 0.45 : 0.15);
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = flash ? Theme.enemy.flash : Util.shadeColor(col, -0.1);
      ctx.beginPath(); ctx.ellipse(e.x - r * 0.55, e.y - r * 0.15, r * 0.42, r * 0.18, -0.5 + flap, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(e.x + r * 0.55, e.y - r * 0.15, r * 0.42, r * 0.18, 0.5 - flap, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else {

      const swing = moving ? Math.sin(now / 110 + phase) * r * 0.22 : Math.sin(now / 700 + phase) * r * 0.03;
      ctx.fillStyle = flash ? Theme.enemy.flashSoft : Util.shadeColor(dark, -0.15);
      ctx.beginPath(); ctx.ellipse(e.x - r * 0.3, e.y + r * 0.55 + swing, r * 0.22, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(e.x + r * 0.3, e.y + r * 0.55 - swing, r * 0.22, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    }

    if (baked) Util._blitSprite(ctx, Util._humanoidSprite(e, flash, bakeScale), e, bakeScale);
    else Util._humanoidStatic(ctx, e, flash);

    const hx = e.x, hy = e.y - r * 0.75;

    if (!flash && behavior !== 'sentry') {
      const blinkCycle = 3400;
      const t = ((now + phase * 1000) % blinkCycle + blinkCycle) % blinkCycle;
      if (t < 120) {
        const k = 1 - Math.abs(t - 60) / 60;
        ctx.fillStyle = dark;
        ctx.beginPath(); ctx.ellipse(e.x - r * 0.18, e.y - r * 0.78, r * 0.09, Math.max(0.4, r * 0.09 * k), 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(e.x + r * 0.18, e.y - r * 0.78, r * 0.09, Math.max(0.4, r * 0.09 * k), 0, 0, Math.PI * 2); ctx.fill();
      }
    }

    const gearLit = flash ? Theme.enemy.flash : Util.shadeColor(col, 0.55);
    if (behavior === 'shielded') {

      if (e.shielded) {
        const sx = e.x + r * 0.68, sy = e.y + r * 0.05;
        const a = now / 900 + phase;
        ctx.save();
        ctx.strokeStyle = Theme.shadow.sheen; ctx.lineWidth = Math.max(1.2, r * 0.1);
        ctx.beginPath(); ctx.arc(sx, sy, r * 0.36, a, a + 0.7); ctx.stroke();
        ctx.restore();
      }
    } else if (behavior === 'charger') {

      const p = 0.5 + 0.5 * Math.sin(now / 260 + phase);
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.35 * p;
      ctx.strokeStyle = flash ? Theme.enemy.flash : Theme.pony.chargerHorn;
      ctx.lineWidth = Math.max(1, r * 0.08);
      ctx.shadowColor = Theme.pony.chargerHorn; ctx.shadowBlur = 3 + 5 * p;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(hx + s * r * 0.35, hy - r * 0.15);
        ctx.lineTo(hx + s * r * 0.6, hy - r * 0.48);
        ctx.lineTo(hx + s * r * 0.12, hy - r * 0.32);
        ctx.closePath(); ctx.stroke();
      }
      ctx.restore();
    } else if (behavior === 'ranged') {

      const qx = e.x - r * 0.75, qy = e.y + r * 0.25;
      const sway = Math.sin(now / 420 + phase) * r * 0.07;
      ctx.save();
      ctx.strokeStyle = flash ? Theme.enemy.flashSoft : Util.shadeColor(dark, 0.4);
      ctx.lineWidth = Math.max(1, r * 0.07); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(qx - r * 0.06, qy - r * 0.16); ctx.lineTo(qx - r * 0.06 + sway, qy - r * 0.46); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(qx + r * 0.08, qy - r * 0.14); ctx.lineTo(qx + r * 0.08 + sway * 0.65, qy - r * 0.4); ctx.stroke();
      ctx.restore();
    } else if (behavior === 'orbiter') {

      const a = now / 600 + phase;
      const ux = Math.cos(a) * r * 0.78, uy = Math.sin(a) * r * 0.3;
      const ct = 0.9394, st = -0.3428;
      const bx = hx + ux * ct - uy * st, by = hy - r * 0.15 + ux * st + uy * ct;
      ctx.save();
      ctx.fillStyle = gearLit; ctx.shadowColor = gearLit; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(bx, by, r * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (behavior === 'burrower') {

      const tw = Math.sin(now / 200 + phase) * 0.18;
      ctx.save();
      ctx.strokeStyle = flash ? Theme.enemy.flash : Util.shadeColor(dark, 0.45);
      ctx.lineWidth = Math.max(1, r * 0.1); ctx.lineCap = 'round';
      for (const s of [-1, 1]) {
        const bx2 = e.x + s * r * 0.7, by2 = e.y + r * 0.2;
        const a = s === 1 ? 0.5 + tw : Math.PI - 0.5 - tw;
        ctx.beginPath(); ctx.moveTo(bx2, by2); ctx.lineTo(bx2 + Math.cos(a) * r * 0.42, by2 + Math.sin(a) * r * 0.42); ctx.stroke();
      }
      ctx.restore();
    } else if (behavior === 'summoner') {

      const pulse = 0.6 + Math.sin(now / 240 + phase) * 0.4;
      ctx.save();
      ctx.fillStyle = gearLit; ctx.shadowColor = gearLit; ctx.shadowBlur = 5 + 7 * pulse;
      ctx.beginPath(); ctx.arc(e.x + r * 0.72, hy - r * 0.62, Math.max(1, r * 0.14 * pulse), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (behavior === 'healer') {

      const ready = typeof e.healTimer === 'number' && e.healTimer <= 0;
      const pulse = 0.5 + 0.5 * Math.sin(now / (ready ? 160 : 460) + phase);
      ctx.save();
      ctx.globalAlpha = (ready ? 0.3 : 0.16) + 0.3 * pulse;
      ctx.strokeStyle = flash ? Theme.enemy.flashSoft : Theme.particle.heal;
      ctx.lineWidth = Math.max(1, r * 0.09);
      ctx.shadowColor = Theme.particle.heal; ctx.shadowBlur = 4 + 6 * pulse;
      ctx.beginPath(); ctx.arc(e.x, e.y, r * (0.44 + 0.08 * pulse), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    } else if (behavior === 'sniper') {

      const t = ((now + phase * 400) % 2400) / 2400;
      if (t < 0.12) {
        const k = Math.sin((t / 0.12) * Math.PI);
        ctx.save();
        ctx.globalAlpha = k;
        ctx.fillStyle = Theme.shadow.glint; ctx.shadowColor = Theme.shadow.glint; ctx.shadowBlur = 6 * k;
        ctx.beginPath(); ctx.arc(e.x + r * 0.35, e.y - r * 0.12, r * 0.07, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    } else if (behavior === 'swarm') {

      ctx.save();
      ctx.fillStyle = gearLit;
      for (let i = 0; i < 3; i++) {
        const a = now / 520 + phase + (i * Math.PI * 2) / 3;
        const mx2 = hx + Math.cos(a) * r * 0.5;
        const my2 = hy - r * 0.68 + Math.sin(a) * r * 0.22;
        ctx.beginPath(); ctx.arc(mx2, my2, r * 0.09, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    } else if (behavior === 'ambusher') {

      ctx.save();
      ctx.fillStyle = flash ? Theme.enemy.flash : Util.shadeColor(dark, 0.5);
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = 0.12 + 0.3 * (0.5 + 0.5 * Math.sin(now / 300 + phase + i * 0.9));
        const sx = e.x + (i - 1) * r * 0.42, sy = e.y - r * 0.35;
        ctx.beginPath(); ctx.moveTo(sx - r * 0.13, sy); ctx.lineTo(sx, sy - r * 0.42); ctx.lineTo(sx + r * 0.13, sy); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    } else if (behavior === 'teleporter') {

      const t = ((now / 1100 + phase) % 1 + 1) % 1;
      ctx.save();
      ctx.globalAlpha = 0.55 * (1 - t);
      ctx.strokeStyle = gearLit; ctx.lineWidth = Math.max(1, r * 0.06);
      const echo = (cx, cy, s) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s * 0.62, cy); ctx.lineTo(cx, cy + s); ctx.lineTo(cx - s * 0.62, cy);
        ctx.closePath(); ctx.stroke();
      };
      echo(hx, hy - r * 0.78, r * (0.26 + 0.34 * t));
      echo(e.x, e.y, r * (0.2 + 0.26 * t));
      ctx.restore();
    } else if (behavior === 'shielder') {

      const p = 0.5 + 0.5 * Math.sin(now / 520 + phase);
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.4 * (1 - p);
      ctx.strokeStyle = flash ? Theme.enemy.flash : Theme.status.shieldRing;
      ctx.lineWidth = Math.max(1, r * 0.08);
      ctx.beginPath(); ctx.arc(e.x, e.y, r * (0.86 + 0.19 * p), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    } else if (behavior === 'lobber') {

      const hot = e.lobTimer > 0 ? Util.clamp(e.lobTimer / (e.lobTime || 1), 0, 1) : 0;
      const pulse = 0.5 + 0.5 * Math.sin(now / 300 + phase);
      const glow = flash ? Theme.enemy.flash : (hot > 0 ? Theme.fx.fuseHot : gearLit);
      ctx.save();
      ctx.fillStyle = glow; ctx.shadowColor = glow; ctx.shadowBlur = 4 + 5 * pulse + 10 * hot;
      ctx.beginPath(); ctx.arc(e.x + r * 0.92, e.y - r * 0.62, r * (0.1 + 0.05 * pulse + 0.12 * hot), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (behavior === 'weaver') {

      const u = ((now / 900 + phase) % 1 + 1) % 1;
      const px = e.x - r * 0.5 + r * u;
      const py = e.y - r * 0.05 + Math.sin(u * Math.PI * 2) * r * 0.24;
      ctx.save();
      ctx.fillStyle = gearLit; ctx.shadowColor = gearLit; ctx.shadowBlur = 5;
      ctx.beginPath(); ctx.arc(px, py, r * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (behavior === 'sentry') {

      const gx = Math.sin(now / 1300 + phase) * r * 0.16;
      const gy = Math.sin(now / 900 + phase * 1.7) * r * 0.05;
      ctx.save();
      ctx.fillStyle = flash ? Theme.enemy.flashSoft : Theme.pony.eyeWhite;
      ctx.beginPath(); ctx.ellipse(e.x, e.y - r * 0.05, r * 0.4, r * 0.26, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = flash ? Theme.enemy.flash : Theme.pony.pupil;
      ctx.beginPath(); ctx.arc(e.x + gx, e.y - r * 0.05 + gy, r * 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    const tid = e.type && e.type.id;
    if (tid === 'bumblebee' || tid === 'forestwasp') {
      const beat = Math.sin(now / 45 + phase);
      ctx.save();

      ctx.globalAlpha = 0.45;
      ctx.fillStyle = Theme.pony.eyeWhite;
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(e.x + sgn * r * 0.7, e.y - r * 0.45, r * 0.45, r * 0.2 + beat * r * 0.08,
          sgn * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = flash ? Theme.enemy.flash : dark;
      for (let i = 0; i < 2; i++) {
        ctx.fillRect(e.x - r * 0.5 + i * r * 0.5, e.y - r * 0.1, r * 0.24, r * 0.7);
      }

      ctx.beginPath();
      ctx.moveTo(e.x, e.y + r * 0.65);
      ctx.lineTo(e.x - r * 0.12, e.y + r * 0.45);
      ctx.lineTo(e.x + r * 0.12, e.y + r * 0.45);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    const cmark = CRYPT_ENEMY_MARKS[tid];
    if (cmark && !isBoss) Util._cryptMark(ctx, e, flash, now, phase, col, dark, r, hx, hy, cmark);
    const fmark = FOREST_ENEMY_MARKS[tid];
    if (fmark && !isBoss) Util._forestMark(ctx, e, flash, now, phase, col, dark, r, hx, hy, fmark);

    if (behavior === 'bomber') {
      const bx = e.x, by = e.y + r * 0.1;
      const armed = e.arming || e.fuseTimer > 0;
      const glowT = armed ? Util.clamp(1 - (e.fuseTimer || 0) / 1.2, 0, 1) : 0;
      ctx.save();
      if (armed) { ctx.shadowColor = Theme.fx.fuseHot; ctx.shadowBlur = 6 + glowT * 10; }
      ctx.fillStyle = Theme.fx.bombBodyDark;
      ctx.beginPath(); ctx.arc(bx, by, r * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      const fuseCol = armed ? Theme.fx.fuseHot : Theme.fx.fuse;
      ctx.strokeStyle = fuseCol; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx + r * 0.15, by - r * 0.35); ctx.lineTo(bx + r * 0.3, by - r * 0.55); ctx.stroke();
      ctx.fillStyle = fuseCol;
      ctx.beginPath(); ctx.arc(bx + r * 0.3, by - r * 0.55, r * 0.1, 0, Math.PI * 2); ctx.fill();
    }

    if (isBoss) {
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(now / 300) * 0.1;
      ctx.strokeStyle = Util.shadeColor(col, 0.5); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(e.x, e.y, r * 1.1, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = dark;
      const spikes = 5;
      for (let i = 0; i < spikes; i++) {
        const t = i / (spikes - 1) - 0.5;
        const sx = hx + t * r * 0.95, syBase = hy - r * 0.42;
        const tall = i === Math.floor(spikes / 2) ? 0.5 : 0.32;
        ctx.beginPath();
        ctx.moveTo(sx - r * 0.08, syBase);
        ctx.lineTo(sx, syBase - r * tall);
        ctx.lineTo(sx + r * 0.08, syBase);
        ctx.closePath(); ctx.fill();
      }
      if (isSuper) {
        ctx.font = Math.round(r * 0.6) + 'px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(e.type.icon, e.x, e.y - r * 1.4);
      }
    }

    ctx.restore();
    if ((e.maxHp > 3 || (forceHealthBar && e.maxHp > 0)) && !isBoss) Util.drawEnemyHealthBar(ctx, e);
  },

  drawEnemyHealthBar(ctx, e){
    if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) return;
    const w = e.radius * 1.8, barY = e.y - e.radius - 14;
    ctx.fillStyle = Theme.ui.hpBarBack; ctx.fillRect(e.x - w / 2, barY, w, 4);

    const grad = ctx.createLinearGradient(e.x, barY, e.x, barY + 4);
    grad.addColorStop(0, '#a8e896');
    grad.addColorStop(1, Theme.ui.hpBarFill);
    ctx.fillStyle = grad;
    ctx.fillRect(e.x - w / 2, barY, w * Util.clamp(e.hp / e.maxHp, 0, 1), 4);
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1;
    ctx.strokeRect(e.x - w / 2 + 0.5, barY + 0.5, w - 1, 3);
  },

  drawDonationMachine(ctx, x, y, frac){
    const w = 28, h = 34;
    ctx.fillStyle = Theme.shadow.groundSoft;
    ctx.beginPath(); ctx.ellipse(x, y + h / 2 + 3, w * 0.5, 5, 0, 0, Math.PI * 2); ctx.fill();

    {
      const g = ctx.createLinearGradient(x, y - h / 2, x, y + h / 2);
      g.addColorStop(0, Util.shadeColor(Theme.machine.body, 0.25));
      g.addColorStop(1, Util.shadeColor(Theme.machine.body, -0.15));
      ctx.fillStyle = g;
    }
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.strokeStyle = Theme.machine.frame; ctx.lineWidth = 2;
    ctx.strokeRect(x - w / 2, y - h / 2, w, h);
    const meterX = x - w / 2 + 4, meterW = 6, meterTop = y - h / 2 + 3, meterH = h - 6;
    ctx.fillStyle = Theme.machine.meterBg;
    ctx.fillRect(meterX, meterTop, meterW, meterH);
    const fillH = meterH * Util.clamp(frac, 0, 1);

    ctx.save();
    ctx.shadowColor = Theme.machine.meterFill; ctx.shadowBlur = 5;
    ctx.fillStyle = Theme.machine.meterFill;
    ctx.fillRect(meterX, meterTop + meterH - fillH, meterW, fillH);
    ctx.restore();
    ctx.fillStyle = Theme.machine.slot;
    ctx.fillRect(x - 1, y - h / 2 + 8, 3, 10);
    ctx.fillStyle = Theme.machine.label;
    ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('$', x + 7, y + 3);
  },

  drawRerollAltar(ctx, x, y, now){
    const w = 30, h = 22;
    ctx.fillStyle = Theme.shadow.groundSoft;
    ctx.beginPath(); ctx.ellipse(x, y + h / 2 + 3, w * 0.5, 5, 0, 0, Math.PI * 2); ctx.fill();
    {
      const g = ctx.createLinearGradient(x, y - h / 2, x, y + h / 2);
      g.addColorStop(0, Util.shadeColor(Theme.machine.altarBody, 0.25));
      g.addColorStop(1, Util.shadeColor(Theme.machine.altarBody, -0.15));
      ctx.fillStyle = g;
    }
    Util.drawRoundedRect(ctx, x - w / 2, y - h / 2, w, h, 3); ctx.fill();
    ctx.strokeStyle = Theme.machine.altarFrame; ctx.lineWidth = 2;
    Util.drawRoundedRect(ctx, x - w / 2, y - h / 2, w, h, 3); ctx.stroke();

    ctx.save();
    ctx.translate(x, y - h / 2 - 7);
    ctx.rotate(((now || 0) / 700) % (Math.PI * 2));
    ctx.shadowColor = Theme.machine.altarGlow; ctx.shadowBlur = 6;
    ctx.strokeStyle = Theme.machine.altarGlow; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 7, 0.5, Math.PI * 1.75); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7, -2.5); ctx.lineTo(4, 2); ctx.lineTo(10, 2); ctx.closePath();
    ctx.fillStyle = Theme.machine.altarGlow; ctx.fill();
    ctx.restore();
  },

  drawUpgradeStation(ctx, x, y, tier, now){
    const w = 30, h = 22;
    ctx.fillStyle = Theme.shadow.groundSoft;
    ctx.beginPath(); ctx.ellipse(x, y + h / 2 + 3, w * 0.5, 5, 0, 0, Math.PI * 2); ctx.fill();
    {
      const g = ctx.createLinearGradient(x, y - h / 2, x, y + h / 2);
      g.addColorStop(0, Util.shadeColor(Theme.machine.altarBody, 0.4));
      g.addColorStop(1, Util.shadeColor(Theme.machine.altarBody, -0.3));
      ctx.fillStyle = g;
    }
    Util.drawRoundedRect(ctx, x - w / 2, y - h / 2, w, h, 3); ctx.fill();
    ctx.strokeStyle = Theme.machine.frame; ctx.lineWidth = 2;
    Util.drawRoundedRect(ctx, x - w / 2, y - h / 2, w, h, 3); ctx.stroke();

    const pulse = 0.5 + 0.5 * Math.sin((now || 0) / 260);
    ctx.save();
    ctx.translate(x, y - h / 2 - 7);
    ctx.shadowColor = Theme.machine.meterFill; ctx.shadowBlur = 4 + pulse * 4;
    ctx.fillStyle = Theme.machine.meterFill;
    ctx.beginPath(); ctx.arc(0, 0, 4 + pulse * 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    const maxTier = 5, pipW = 4, pipGap = 2, pipH = 4;
    const total = maxTier * pipW + (maxTier - 1) * pipGap;
    let px = x - total / 2;
    const py = y + h / 2 + 8;
    for (let i = 0; i < maxTier; i++) {
      ctx.fillStyle = i < tier ? Theme.machine.meterFill : Theme.machine.meterBg;
      ctx.fillRect(px, py, pipW, pipH);
      px += pipW + pipGap;
    }
  },

  drawFilly(ctx, x, y, kind, now){
    Util.drawPony(ctx, x, y, 22, {
      bodyColor: '#8a8578', maneColor: '#5e5648',
      facing: { x: 0, y: 1 }, now: now || 0,
    });

    const signY = y - 30;
    ctx.fillStyle = Theme.machine.fillySign;
    Util.drawRoundedRect(ctx, x - 9, signY - 9, 18, 18, 3); ctx.fill();
    ctx.strokeStyle = Theme.machine.fillySignEdge; ctx.lineWidth = 1.5;
    Util.drawRoundedRect(ctx, x - 9, signY - 9, 18, 18, 3); ctx.stroke();
    switch (kind) {
      case 'coin':
        ctx.fillStyle = Util.bodyShade(ctx, x, signY, 6, '#e3c15b');
        ctx.beginPath(); ctx.arc(x, signY, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = Theme.shadow.groundHard; ctx.stroke();
        ctx.fillStyle = Theme.shadow.glint;
        ctx.beginPath(); ctx.arc(x - 2, signY - 2, 1.5, 0, Math.PI * 2); ctx.fill();
        break;
      case 'bomb': Util.drawBombIcon(ctx, x, signY, Theme.icon.bombBody, Theme.icon.bombFuse); break;
      case 'key': Util.drawKeyIcon(ctx, x, signY, Theme.icon.key); break;
      case 'heart': Util.drawHeart(ctx, x - 6, signY - 6, 12, 1, Theme.icon.heartRed, Theme.icon.heartRedLine); break;
      case 'battery': Util.drawBatteryIcon(ctx, x, signY, 1); break;
    }
  },

  drawFriendshipMachine(ctx, x, y, machine, now){
    const w = 28, h = 34;
    ctx.fillStyle = Theme.shadow.groundSoft;
    ctx.beginPath(); ctx.ellipse(x, y + h / 2 + 3, w * 0.5, 5, 0, 0, Math.PI * 2); ctx.fill();
    {
      const g = ctx.createLinearGradient(x, y - h / 2, x, y + h / 2);
      g.addColorStop(0, Util.shadeColor(Theme.machine.friendshipBody, 0.25));
      g.addColorStop(1, Util.shadeColor(Theme.machine.friendshipBody, -0.15));
      ctx.fillStyle = g;
    }
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.strokeStyle = Theme.machine.friendshipFrame; ctx.lineWidth = 2;
    ctx.strokeRect(x - w / 2, y - h / 2, w, h);
    Util.drawHeart(ctx, x - 7, y - 8, 14, 1, Theme.machine.friendshipFrame, Theme.machine.friendshipBody);
    Util.drawMachineSpinFlourish(ctx, x, y, machine, now);
  },

  drawToolsMachine(ctx, x, y, machine, now){
    const w = 28, h = 34;
    ctx.fillStyle = Theme.shadow.groundSoft;
    ctx.beginPath(); ctx.ellipse(x, y + h / 2 + 3, w * 0.5, 5, 0, 0, Math.PI * 2); ctx.fill();
    {
      const g = ctx.createLinearGradient(x, y - h / 2, x, y + h / 2);
      g.addColorStop(0, Util.shadeColor(Theme.machine.toolsBody, 0.25));
      g.addColorStop(1, Util.shadeColor(Theme.machine.toolsBody, -0.15));
      ctx.fillStyle = g;
    }
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.strokeStyle = Theme.machine.toolsFrame; ctx.lineWidth = 2;
    ctx.strokeRect(x - w / 2, y - h / 2, w, h);
    Util.drawKeyIcon(ctx, x, y - 2, Theme.machine.toolsFrame);
    Util.drawMachineSpinFlourish(ctx, x, y, machine, now);
  },

  drawDarkMachine(ctx, x, y){
    const w = 28, h = 34;
    ctx.fillStyle = Theme.shadow.groundSoft;
    ctx.beginPath(); ctx.ellipse(x, y + h / 2 + 3, w * 0.5, 5, 0, 0, Math.PI * 2); ctx.fill();
    {
      const g = ctx.createLinearGradient(x, y - h / 2, x, y + h / 2);
      g.addColorStop(0, Util.shadeColor(Theme.machine.darkBody, 0.25));
      g.addColorStop(1, Util.shadeColor(Theme.machine.darkBody, -0.15));
      ctx.fillStyle = g;
    }
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.strokeStyle = Theme.machine.darkFrame; ctx.lineWidth = 2;
    ctx.strokeRect(x - w / 2, y - h / 2, w, h);
    Util.drawStarIcon(ctx, x, y - 2, Theme.machine.darkFrame);
  },

  drawMachineSpinFlourish(ctx, x, y, machine, now){
    if (!machine || !machine.spinning) return;
    const ang = (now || 0) / 90;
    ctx.save();
    ctx.strokeStyle = Theme.machine.spinRing || '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y - 8, 10, ang, ang + Math.PI * 1.2);
    ctx.stroke();
    ctx.restore();
  },

  drawPlayerTurret(ctx, turret, now){
    if (turret.kind === 'crystal') { Util.drawCrystalSentry(ctx, turret, now); return; }
    const x = turret.x, y = turret.y;
    ctx.fillStyle = Theme.shadow.groundSoft;
    ctx.beginPath(); ctx.ellipse(x, y + 9, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#243a4a';
    ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = Util.bodyShade(ctx, x, y, 9, '#5a7a9a');
    ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7fc1e3';
    ctx.lineWidth = 3;
    const ang = turret.ang || 0;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(ang) * 6, y + Math.sin(ang) * 6);
    ctx.lineTo(x + Math.cos(ang) * 16, y + Math.sin(ang) * 16);
    ctx.stroke();
    ctx.fillStyle = '#7fc1e3';
    ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
  },

  drawCrystalSentry(ctx, turret, now){
    const x = turret.x, y = turret.y;
    const CORE = '#8fd6e8', DARK = '#4f7f96', GLOW = '#d8b4f0';
    const pulse = 0.6 + 0.4 * Math.abs(Math.sin((now || 0) / 340));
    ctx.fillStyle = Theme.shadow.groundSoft;
    ctx.beginPath(); ctx.ellipse(x, y + 10, 12, 4, 0, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.shadowColor = GLOW;
    ctx.shadowBlur = 6 + pulse * 6;

    const shards = [
      { dx:0, dy:-14, dx2:0, dy2:6, w:6 },
      { dx:-7, dy:-2, dx2:-3, dy2:9, w:4.5 },
      { dx:7, dy:-2, dx2:3, dy2:9, w:4.5 },
    ];
    for (const s of shards) {
      const bx = x + s.dx2, by = y + s.dy2;
      const tx = x + s.dx, ty = y + s.dy;
      ctx.fillStyle = DARK;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(bx - s.w, by);
      ctx.lineTo(bx + s.w, by);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = CORE;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(bx - s.w * 0.45, by);
      ctx.lineTo(bx + s.w * 0.1, by);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    ctx.fillStyle = GLOW;
    ctx.globalAlpha = 0.5 + pulse * 0.5;
    ctx.beginPath(); ctx.arc(x, y - 8, 2 + pulse * 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    const ang = turret.ang || 0;
    ctx.strokeStyle = CORE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(ang) * 5, y - 8 + Math.sin(ang) * 5);
    ctx.lineTo(x + Math.cos(ang) * 14, y - 8 + Math.sin(ang) * 14);
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.arc(x - 2, y - 11, 1, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  },

  drawChangelingMinion(ctx, m, now){
    const x = m.x, y = m.y;
    const pulse = 0.7 + 0.3 * Math.abs(Math.sin((now || 0) / 260));
    ctx.save();
    ctx.globalAlpha = 0.55 * pulse;
    ctx.fillStyle = 'rgba(90,224,160,.4)';
    ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = Theme.shadow.groundSoft;
    ctx.beginPath(); ctx.ellipse(x, y + 8, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c2420';
    ctx.beginPath(); ctx.ellipse(x, y, 8, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = Util.bodyShade(ctx, x, y, 6, '#2f3a35');
    ctx.beginPath(); ctx.ellipse(x, y, 6, 5.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f4d35e';
    ctx.beginPath(); ctx.arc(x, y - 5, 2.2, 0, Math.PI * 2); ctx.fill();
  },

  _ponyBodyPath(ctx, size, B){
    ctx.beginPath();
    if (B.angular) {
      const w = size * B.bw, h = size * B.bh, cy = size * 0.06;
      ctx.moveTo(-w, cy - h * 0.25);
      ctx.lineTo(-w * 0.55, cy - h);
      ctx.lineTo(w * 0.55, cy - h);
      ctx.lineTo(w, cy - h * 0.25);
      ctx.lineTo(w * 0.6, cy + h);
      ctx.lineTo(-w * 0.6, cy + h);
      ctx.closePath();
    } else {
      ctx.ellipse(0, size * 0.06, size * B.bw, size * B.bh, 0, 0, Math.PI * 2);
    }
  },

  _ponyAura(ctx, size, now, opts){
    const col = opts.auraColor || opts.maneColor;
    const kind = opts.aura;
    ctx.save();
    if (kind === 'static') {
      ctx.strokeStyle = col; ctx.lineWidth = size * 0.018; ctx.globalAlpha = 0.55;
      for (let i = 0; i < 3; i++) {
        const a = now / 220 + i * 2.1, r = size * 0.55;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.6);
        ctx.lineTo(Math.cos(a + 0.5) * r * 0.7, Math.sin(a + 0.5) * r * 0.42 - size * 0.1);
        ctx.lineTo(Math.cos(a + 0.9) * r, Math.sin(a + 0.9) * r * 0.6);
        ctx.stroke();
      }
    } else if (kind === 'frost') {
      ctx.fillStyle = col; ctx.globalAlpha = 0.28;
      for (let i = 0; i < 5; i++) {
        const t = ((now / 900) + i * 0.2) % 1;
        const a = i * 1.27;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * size * 0.5, size * 0.3 - t * size * 0.7, size * (0.09 - t * 0.05), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (kind === 'ember') {
      for (let i = 0; i < 5; i++) {
        const t = ((now / 620) + i * 0.19) % 1;
        ctx.globalAlpha = 0.7 * (1 - t);
        ctx.fillStyle = col;
        const a = i * 1.9 + now / 2400;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * size * 0.42, size * 0.34 - t * size * 0.85, size * 0.035 * (1 - t * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (kind === 'sparkle') {
      ctx.fillStyle = col;
      for (let i = 0; i < 6; i++) {
        const a = now / 700 + i * 1.047;
        const pulse = 0.5 + 0.5 * Math.sin(now / 300 + i);
        ctx.globalAlpha = 0.35 + pulse * 0.5;
        const r = size * (0.5 + pulse * 0.1);
        const px = Math.cos(a) * r, py = Math.sin(a) * r * 0.55;
        const s = size * 0.035 * (0.5 + pulse);
        ctx.beginPath();
        ctx.moveTo(px, py - s); ctx.lineTo(px + s * 0.4, py); ctx.lineTo(px, py + s); ctx.lineTo(px - s * 0.4, py);
        ctx.closePath(); ctx.fill();
      }
    } else if (kind === 'ooze') {
      ctx.fillStyle = col;
      for (let i = 0; i < 4; i++) {
        const t = ((now / 1100) + i * 0.25) % 1;
        ctx.globalAlpha = 0.5 * (1 - t);
        const px = (i - 1.5) * size * 0.22;
        ctx.beginPath();
        ctx.ellipse(px, size * 0.28 + t * size * 0.24, size * 0.04, size * 0.055, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (kind === 'dust') {
      ctx.fillStyle = col; ctx.globalAlpha = 0.3;
      for (let i = 0; i < 4; i++) {
        const t = ((now / 1000) + i * 0.25) % 1;
        ctx.beginPath();
        ctx.arc((i - 1.5) * size * 0.3, size * 0.42 - t * size * 0.1, size * 0.08 * t, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (kind === 'bubble') {
      ctx.strokeStyle = col; ctx.lineWidth = size * 0.014;
      for (let i = 0; i < 5; i++) {
        const t = ((now / 1300) + i * 0.2) % 1;
        ctx.globalAlpha = 0.55 * (1 - t);
        ctx.beginPath();
        ctx.arc(Math.sin(i * 2.3 + t * 3) * size * 0.4, size * 0.34 - t * size * 0.85, size * 0.05 * (0.4 + t), 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (kind === 'petal') {
      ctx.fillStyle = col;
      for (let i = 0; i < 4; i++) {
        const t = ((now / 1500) + i * 0.25) % 1;
        ctx.globalAlpha = 0.65 * (1 - t * 0.7);
        const px = Math.sin(i * 1.8 + t * 5) * size * 0.45;
        ctx.beginPath();
        ctx.ellipse(px, -size * 0.4 + t * size * 0.9, size * 0.05, size * 0.028, t * 6 + i, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  },

  _ponyWings(ctx, size, angle, flap, baseAlpha, bodyColor, maneColor, opts){
    const style = opts.wingStyle || 'feather';
    ctx.save();
    for (const s of [-1, 1]) {
      const rot = s * (angle * 0.2 + 0.3 + flap) * -1;
      ctx.save();
      ctx.translate(s * size * 0.28, -size * 0.02);
      ctx.rotate(rot);
      if (style === 'membrane') {
        ctx.globalAlpha = baseAlpha * 0.92;
        ctx.fillStyle = Util.shadeColor(bodyColor, -0.2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(s * size * 0.5, -size * 0.22);
        ctx.lineTo(s * size * 0.44, size * 0.02);
        ctx.lineTo(s * size * 0.3, -size * 0.02);
        ctx.lineTo(s * size * 0.24, size * 0.14);
        ctx.lineTo(s * size * 0.1, size * 0.02);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = Util.shadeColor(bodyColor, -0.45); ctx.lineWidth = size * 0.02;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * size * 0.5, -size * 0.22); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * size * 0.3, -size * 0.02); ctx.stroke();
      } else if (style === 'insect') {
        ctx.globalAlpha = baseAlpha * 0.42;
        ctx.fillStyle = maneColor;
        ctx.beginPath(); ctx.ellipse(s * size * 0.26, -size * 0.1, size * 0.28, size * 0.1, s * -0.35, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = baseAlpha * 0.3;
        ctx.beginPath(); ctx.ellipse(s * size * 0.2, size * 0.05, size * 0.22, size * 0.08, s * 0.25, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = baseAlpha * 0.6;
        ctx.strokeStyle = maneColor; ctx.lineWidth = size * 0.012;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * size * 0.5, -size * 0.14); ctx.stroke();
      } else if (style === 'tattered') {
        ctx.globalAlpha = baseAlpha * 0.7;
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.05);
        ctx.lineTo(s * size * 0.46, -size * 0.18);
        ctx.lineTo(s * size * 0.36, -size * 0.02);
        ctx.lineTo(s * size * 0.46, size * 0.06);
        ctx.lineTo(s * size * 0.22, size * 0.04);
        ctx.lineTo(s * size * 0.28, size * 0.16);
        ctx.lineTo(s * size * 0.06, size * 0.06);
        ctx.closePath(); ctx.fill();
      } else if (style === 'stone') {
        ctx.globalAlpha = baseAlpha;
        ctx.fillStyle = Util.shadeColor(bodyColor, -0.15);
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.06);
        ctx.lineTo(s * size * 0.24, -size * 0.28);
        ctx.lineTo(s * size * 0.48, -size * 0.12);
        ctx.lineTo(s * size * 0.4, size * 0.1);
        ctx.lineTo(s * size * 0.12, size * 0.1);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = Util.shadeColor(bodyColor, -0.4); ctx.lineWidth = size * 0.022;
        ctx.beginPath(); ctx.moveTo(s * size * 0.1, -size * 0.08); ctx.lineTo(s * size * 0.4, -size * 0.1); ctx.stroke();
      } else {
        ctx.globalAlpha = baseAlpha * 0.9;
        ctx.fillStyle = bodyColor;
        ctx.beginPath(); ctx.ellipse(0, 0, size * 0.30, size * 0.16, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = Util.shadeColor(bodyColor, -0.3); ctx.lineWidth = size * 0.016;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(i * size * 0.1, -size * 0.06);
          ctx.lineTo(i * size * 0.12, size * 0.13);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    ctx.restore();
  },

  _ponyTail(ctx, size, tx, ty, tailAng, maneColor, opts){
    const style = opts.hasFinTail ? 'fin' : (opts.tailStyle || 'fluffy');
    ctx.fillStyle = maneColor;
    if (style === 'fin') {
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + Math.cos(tailAng - 0.5) * size * 0.22, ty + Math.sin(tailAng - 0.5) * size * 0.22 - size * 0.08);
      ctx.lineTo(tx + Math.cos(tailAng + 0.5) * size * 0.22, ty + Math.sin(tailAng + 0.5) * size * 0.22 + size * 0.08);
      ctx.closePath(); ctx.fill();
    } else if (style === 'whip') {
      ctx.strokeStyle = maneColor; ctx.lineCap = 'round';
      for (let i = 3; i >= 1; i--) {
        ctx.lineWidth = size * 0.045 * (i / 3);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + Math.cos(tailAng + 0.25) * size * 0.14 * i, ty + Math.sin(tailAng + 0.25) * size * 0.13 * i);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    } else if (style === 'forked') {
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + Math.cos(tailAng + s * 0.42) * size * 0.32, ty + Math.sin(tailAng + s * 0.42) * size * 0.26);
        ctx.lineTo(tx + Math.cos(tailAng + s * 0.12) * size * 0.18, ty + Math.sin(tailAng + s * 0.12) * size * 0.16);
        ctx.closePath(); ctx.fill();
      }
    } else if (style === 'stubby') {
      ctx.beginPath();
      ctx.ellipse(tx * 0.7, ty * 0.85, size * 0.11, size * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === 'plume') {
      for (let i = 0; i < 3; i++) {
        const a = tailAng + (i - 1) * 0.34;
        ctx.beginPath();
        ctx.ellipse(tx + Math.cos(a) * size * 0.08, ty + Math.sin(a) * size * 0.07,
          size * (0.09 - i * 0.005), size * 0.21, a, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.ellipse(tx, ty, size * 0.14, size * 0.2, tailAng, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = Util.shadeColor(maneColor, 0.15);
      ctx.beginPath();
      ctx.ellipse(tx * 0.82, ty * 0.86, size * 0.1, size * 0.13, tailAng, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  _ponyPattern(ctx, size, B, bodyColor, maneColor, opts){
    const p = opts.pattern;
    if (!p || p === 'none') return;
    ctx.save();
    Util._ponyBodyPath(ctx, size, B);
    ctx.clip();
    if (p === 'spots') {
      ctx.fillStyle = Util.shadeColor(bodyColor, -0.28); ctx.globalAlpha = 0.75;
      for (let i = 0; i < 6; i++) {
        const a = i * 2.399;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * size * 0.3, size * 0.06 + Math.sin(a) * size * 0.22, size * (0.05 + (i % 3) * 0.012), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (p === 'patches') {
      ctx.fillStyle = Util.shadeColor(maneColor, 0.25); ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.ellipse(-size * 0.22, size * 0.02, size * 0.2, size * 0.16, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(size * 0.24, size * 0.16, size * 0.16, size * 0.12, -0.3, 0, Math.PI * 2); ctx.fill();
    } else if (p === 'fade') {
      ctx.fillStyle = maneColor; ctx.globalAlpha = 0.22;
      ctx.beginPath(); ctx.ellipse(0, size * (0.06 + B.bh * 0.55), size * B.bw, size * B.bh * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.14;
      ctx.beginPath(); ctx.ellipse(0, size * (0.06 + B.bh * 0.85), size * B.bw, size * B.bh * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    } else if (p === 'scalepat') {
      ctx.strokeStyle = Util.shadeColor(bodyColor, -0.3); ctx.lineWidth = size * 0.018; ctx.globalAlpha = 0.8;
      for (let r = 0; r < 3; r++) {
        for (let c = -2; c <= 2; c++) {
          ctx.beginPath();
          ctx.arc(c * size * 0.14 + (r % 2) * size * 0.07, -size * 0.1 + r * size * 0.13, size * 0.075, Math.PI * 0.12, Math.PI * 0.88);
          ctx.stroke();
        }
      }
    } else if (p === 'facets') {
      ctx.strokeStyle = Util.shadeColor(maneColor, 0.35); ctx.lineWidth = size * 0.016; ctx.globalAlpha = 0.7;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * size * 0.18, -size * 0.4);
        ctx.lineTo(i * size * 0.18 + size * 0.16, size * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(i * size * 0.18, size * 0.5);
        ctx.lineTo(i * size * 0.18 + size * 0.16, -size * 0.4);
        ctx.stroke();
      }
    } else if (p === 'holes') {
      ctx.globalAlpha = 0.55; ctx.fillStyle = Util.shadeColor(bodyColor, -0.5);
      for (let i = 0; i < 5; i++) {
        const a = i * 1.9;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * size * 0.26, size * 0.08 + Math.sin(a) * size * 0.18, size * 0.055, size * 0.04, a, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (p === 'cracks') {
      ctx.strokeStyle = Util.shadeColor(bodyColor, -0.45); ctx.lineWidth = size * 0.018; ctx.globalAlpha = 0.8;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * size * 0.22 - size * 0.08, -size * 0.3);
        ctx.lineTo(i * size * 0.22 + size * 0.04, size * 0.0);
        ctx.lineTo(i * size * 0.22 - size * 0.04, size * 0.12);
        ctx.lineTo(i * size * 0.22 + size * 0.08, size * 0.4);
        ctx.stroke();
      }
    } else if (p === 'circuit') {
      ctx.strokeStyle = maneColor; ctx.lineWidth = size * 0.016; ctx.globalAlpha = 0.65;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(-size * 0.42, i * size * 0.14);
        ctx.lineTo(-size * 0.1, i * size * 0.14);
        ctx.lineTo(size * 0.06, i * size * 0.14 + size * 0.1);
        ctx.lineTo(size * 0.42, i * size * 0.14 + size * 0.1);
        ctx.stroke();
      }
      ctx.fillStyle = maneColor;
      ctx.beginPath(); ctx.arc(size * 0.06, size * 0.24, size * 0.03, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  },

  _ponyEars(ctx, size, hx, hy, now, opts, bodyGrad, maneColor){
    const style = opts.earStyle || 'pointed';
    const earLen = opts.hasFangs || style === 'long' ? 0.5 : 0.4;
    ctx.fillStyle = bodyGrad;
    for (const s of [-1, 1]) {
      const tw = Math.sin(now / 340 + (s > 0 ? 1.9 : 0)) * 0.03;
      const bx = hx + s * size * 0.16, by = hy - size * 0.2;
      const px = hx + s * size * (0.26 + tw), py = hy - size * earLen;
      const ix = hx + s * size * 0.04, iy = hy - size * 0.28;
      if (style === 'round') {
        ctx.beginPath();
        ctx.ellipse(hx + s * size * 0.2, hy - size * 0.24, size * 0.1, size * 0.12, s * 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (style === 'notched') {
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(px, py);
        ctx.lineTo(hx + s * size * 0.17, hy - size * (earLen - 0.09));
        ctx.lineTo(hx + s * size * 0.19, hy - size * (earLen - 0.14));
        ctx.lineTo(ix, iy);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(px, py);
        ctx.lineTo(ix, iy);
        ctx.closePath(); ctx.fill();
      }
      if (style === 'tufted') {
        ctx.strokeStyle = maneColor; ctx.lineWidth = size * 0.018;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(hx + s * size * 0.18, hy - size * 0.26);
          ctx.lineTo(px + i * size * 0.05, py - size * 0.08);
          ctx.stroke();
        }
        ctx.fillStyle = bodyGrad;
      }
    }
  },

  _ponyHorn(ctx, size, hx, hy, now, opts, maneColor){
    const style = opts.hornStyle || 'straight';
    const col = Theme.pony.horn;
    if (style === 'pairhorn') {
      ctx.fillStyle = Util.shadeColor(col, -0.25);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(hx + s * size * 0.12, hy - size * 0.22);
        ctx.lineTo(hx + s * size * 0.3, hy - size * 0.44);
        ctx.lineTo(hx + s * size * 0.16, hy - size * 0.3);
        ctx.closePath(); ctx.fill();
      }
      return;
    }
    if (style === 'antler') {
      ctx.strokeStyle = col; ctx.lineWidth = size * 0.03; ctx.lineCap = 'round';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(hx + s * size * 0.08, hy - size * 0.24);
        ctx.lineTo(hx + s * size * 0.14, hy - size * 0.46);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(hx + s * size * 0.12, hy - size * 0.36);
        ctx.lineTo(hx + s * size * 0.24, hy - size * 0.42);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      return;
    }
    if (style === 'curved') {
      ctx.strokeStyle = col; ctx.lineWidth = size * 0.055; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx, hy - size * 0.26);
      ctx.quadraticCurveTo(hx + size * 0.14, hy - size * 0.42, hx + size * 0.04, hy - size * 0.54);
      ctx.stroke();
      ctx.lineCap = 'butt';
      return;
    }
    if (style === 'nub') {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(hx, hy - size * 0.29, size * 0.055, size * 0.07, 0, 0, Math.PI * 2); ctx.fill();
      return;
    }
    if (style === 'crystal') {
      ctx.fillStyle = col;
      ctx.shadowColor = maneColor; ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(hx, hy - size * 0.28);
      ctx.lineTo(hx - size * 0.07, hy - size * 0.4);
      ctx.lineTo(hx, hy - size * 0.56);
      ctx.lineTo(hx + size * 0.07, hy - size * 0.4);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      return;
    }
    ctx.fillStyle = col;
    const tip = style === 'spiral' ? 0.54 : 0.48;
    ctx.beginPath();
    ctx.moveTo(hx, hy - size * 0.28);
    ctx.lineTo(hx - size * 0.045, hy - size * tip);
    ctx.lineTo(hx + size * 0.045, hy - size * tip);
    ctx.closePath(); ctx.fill();
    if (style === 'spiral') {
      ctx.strokeStyle = Util.shadeColor(col, -0.35); ctx.lineWidth = size * 0.014;
      for (let i = 1; i <= 3; i++) {
        const t = i / 4;
        const w = size * 0.042 * (1 - t);
        const yy = hy - size * (0.28 + (tip - 0.28) * t);
        ctx.beginPath(); ctx.moveTo(hx - w, yy); ctx.lineTo(hx + w, yy - size * 0.02); ctx.stroke();
      }
    }
  },

  _ponyFlourish(ctx, size, hx, hy, angle, now, opts, bodyColor, maneColor){
    const f = opts.flourish;
    if (f === 'halo') {
      ctx.save();
      ctx.strokeStyle = opts.auraColor || maneColor;
      ctx.lineWidth = size * 0.03;
      ctx.globalAlpha = 0.5 + 0.35 * Math.sin(now / 500);
      ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(hx, hy - size * 0.5, size * 0.2, size * 0.07, Math.sin(now / 1400) * 0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (f === 'crown') {
      ctx.fillStyle = opts.auraColor || maneColor;
      ctx.beginPath();
      ctx.moveTo(hx - size * 0.18, hy - size * 0.24);
      ctx.lineTo(hx - size * 0.2, hy - size * 0.42);
      ctx.lineTo(hx - size * 0.09, hy - size * 0.32);
      ctx.lineTo(hx, hy - size * 0.5);
      ctx.lineTo(hx + size * 0.09, hy - size * 0.32);
      ctx.lineTo(hx + size * 0.2, hy - size * 0.42);
      ctx.lineTo(hx + size * 0.18, hy - size * 0.24);
      ctx.closePath(); ctx.fill();
    } else if (f === 'spineridge') {
      ctx.fillStyle = Util.shadeColor(maneColor, 0.1);
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * size * 0.16 - size * 0.05, -size * 0.24);
        ctx.lineTo(i * size * 0.16, -size * 0.44);
        ctx.lineTo(i * size * 0.16 + size * 0.05, -size * 0.24);
        ctx.closePath(); ctx.fill();
      }
    } else if (f === 'flamering') {
      ctx.save();
      ctx.strokeStyle = opts.auraColor || maneColor;
      ctx.lineWidth = size * 0.022; ctx.lineCap = 'round';
      ctx.globalAlpha = 0.75;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(hx + s * size * 0.2, hy + size * 0.06);
        ctx.quadraticCurveTo(hx + s * size * 0.42, hy + size * 0.02 + Math.sin(now / 260 + s) * size * 0.03,
          hx + s * size * 0.36, hy - size * 0.16);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      ctx.restore();
    } else if (f === 'frosttrail') {
      ctx.save();
      ctx.strokeStyle = opts.auraColor || maneColor;
      ctx.lineWidth = size * 0.02; ctx.globalAlpha = 0.45;
      for (let i = 0; i < 3; i++) {
        const off = -Math.cos(angle) * size * (0.5 + i * 0.16);
        const offy = -Math.sin(angle) * size * (0.5 + i * 0.16);
        ctx.beginPath();
        ctx.moveTo(off - size * 0.12, offy + Math.sin(now / 300 + i) * size * 0.03);
        ctx.lineTo(off + size * 0.12, offy - Math.sin(now / 300 + i) * size * 0.03);
        ctx.stroke();
      }
      ctx.restore();
    } else if (f === 'stoneplate') {
      ctx.fillStyle = Util.shadeColor(bodyColor, 0.18);
      ctx.beginPath();
      ctx.moveTo(-size * 0.2, -size * 0.02);
      ctx.lineTo(0, -size * 0.14);
      ctx.lineTo(size * 0.2, -size * 0.02);
      ctx.lineTo(size * 0.14, size * 0.2);
      ctx.lineTo(-size * 0.14, size * 0.2);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = Util.shadeColor(bodyColor, -0.35);
      ctx.beginPath();
      ctx.moveTo(hx - size * 0.2, hy - size * 0.1);
      ctx.lineTo(hx + size * 0.2, hy - size * 0.1);
      ctx.lineTo(hx + size * 0.16, hy - size * 0.02);
      ctx.lineTo(hx - size * 0.16, hy - size * 0.02);
      ctx.closePath(); ctx.fill();
    } else if (f === 'shards') {
      ctx.save();
      ctx.fillStyle = opts.auraColor || maneColor;
      for (let i = 0; i < 3; i++) {
        const a = now / 800 + i * 2.094;
        const px = Math.cos(a) * size * 0.52, py = Math.sin(a) * size * 0.26 - size * 0.2;
        ctx.globalAlpha = 0.5 + 0.4 * Math.sin(a);
        ctx.beginPath();
        ctx.moveTo(px, py - size * 0.09);
        ctx.lineTo(px + size * 0.05, py);
        ctx.lineTo(px, py + size * 0.09);
        ctx.lineTo(px - size * 0.05, py);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    } else if (f === 'antenna') {
      ctx.strokeStyle = Util.shadeColor(bodyColor, -0.3); ctx.lineWidth = size * 0.02;
      ctx.beginPath();
      ctx.moveTo(hx, hy - size * 0.24);
      ctx.lineTo(hx + size * 0.05, hy - size * 0.46);
      ctx.stroke();
      const blink = ((now % 1200) < 600) ? 1 : 0.3;
      ctx.globalAlpha = blink;
      ctx.fillStyle = Theme.pony.robotEye;
      ctx.beginPath(); ctx.arc(hx + size * 0.05, hy - size * 0.48, size * 0.035, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (f === 'goggles') {
      ctx.strokeStyle = Util.shadeColor(maneColor, -0.2); ctx.lineWidth = size * 0.026;
      ctx.beginPath();
      ctx.moveTo(hx - size * 0.24, hy - size * 0.12);
      ctx.lineTo(hx + size * 0.24, hy - size * 0.12);
      ctx.stroke();
      ctx.fillStyle = maneColor;
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.arc(hx + s * size * 0.13, hy - size * 0.14, size * 0.07, 0, Math.PI * 2); ctx.fill();
      }
    }
  },

  drawPony(ctx, x, y, size, opts){
    opts = opts || {};
    const facing = opts.facing || { x: 0, y: 1 };
    const angle = Math.atan2(facing.y, facing.x);
    const now = opts.now || 0;
    const bodyColor = opts.flash ? Theme.pony.flash : opts.bodyColor;
    const maneColor = opts.flash ? Theme.pony.flash : opts.maneColor;
    const B = PONY_BUILD[opts.build] || PONY_BUILD.stout;
    const bob = Math.sin(now / 250) * size * 0.015;
    ctx.save();
    ctx.translate(x, y + bob);
    if (opts.ghostly) ctx.globalAlpha = Theme.pony.ghostAlpha;

    if (opts.aura && !opts.flash) Util._ponyAura(ctx, size, now, opts);

    ctx.fillStyle = Theme.shadow.ground;
    ctx.beginPath(); ctx.ellipse(0, size * 0.42, size * B.bw * 0.82, size * 0.13, 0, 0, Math.PI * 2); ctx.fill();

    const legPhase = opts.moving ? Math.sin(now / 100) * size * 0.1 : Math.sin(now / 900) * size * 0.02;
    ctx.fillStyle = opts.flash ? Theme.pony.flash : Util.shadeColor(bodyColor, -0.35);
    for (const s of [-1, 1]) {
      const ly = size * 0.32 + legPhase * s;
      if (B.angular) {
        ctx.beginPath();
        ctx.rect(s * size * B.legX - size * B.legW, ly - size * B.legH, size * B.legW * 2, size * B.legH * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.ellipse(s * size * B.legX, ly, size * B.legW, size * B.legH, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (opts.hasWings) {
      const baseAlpha = opts.ghostly ? Theme.pony.ghostAlpha : 1;
      const flap = opts.moving ? Math.sin(now / 90) * 0.3 : Math.sin(now / 400) * 0.08;
      Util._ponyWings(ctx, size, angle, flap, baseAlpha, bodyColor, maneColor, opts);
      ctx.globalAlpha = baseAlpha;
    }

    const tailSway = (opts.moving ? Math.sin(now / 220) * 0.22 : Math.sin(now / 800) * 0.08);
    const tailAng = angle + Math.PI + tailSway;
    const tx = Math.cos(tailAng) * size * (B.bw * 0.9), ty = Math.sin(tailAng) * size * 0.3 + size * 0.1;
    Util._ponyTail(ctx, size, tx, ty, tailAng, maneColor, opts);

    const bodyGrad = opts.flash ? bodyColor : Util.bodyShadeLocal(ctx, 0, size * 0.06, size * 0.5, bodyColor);
    ctx.fillStyle = bodyGrad;
    Util._ponyBodyPath(ctx, size, B);
    ctx.fill();

    if (!opts.flash) {
      ctx.strokeStyle = Theme.shadow.rim; ctx.lineWidth = size * 0.02;
      ctx.beginPath(); ctx.ellipse(0, size * 0.06, size * B.bw * 0.88, size * B.bh * 0.85, 0, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
    }

    if (opts.hasScales && !opts.flash && opts.pattern !== 'scalepat') {
      ctx.strokeStyle = Util.shadeColor(bodyColor, -0.25); ctx.lineWidth = size * 0.02;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(i * size * 0.14, size * 0.02, size * 0.08, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      }
    }

    if (!opts.flash) Util._ponyPattern(ctx, size, B, bodyColor, maneColor, opts);

    if (opts.hasStripes && !opts.flash) {
      ctx.save();
      Util._ponyBodyPath(ctx, size, B);
      ctx.clip();
      ctx.strokeStyle = opts.maneColor;
      ctx.lineWidth = size * 0.055;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * size * 0.16, -size * 0.34);
        ctx.lineTo(i * size * 0.16 + size * 0.09, size * 0.5);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (opts.isRobot && !opts.flash) {
      ctx.strokeStyle = Theme.pony.robotSeam; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-size * 0.2, -size * 0.05); ctx.lineTo(-size * 0.2, size * 0.28); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(size * 0.2, -size * 0.05); ctx.lineTo(size * 0.2, size * 0.28); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-size * 0.3, size * 0.1); ctx.lineTo(size * 0.3, size * 0.1); ctx.stroke();
    }

    const hx = Math.cos(angle) * size * B.neck, hy = Math.sin(angle) * size * B.neck - size * 0.05;
    ctx.fillStyle = bodyGrad;

    ctx.beginPath();
    ctx.arc(hx, hy, size * B.hs, 0, Math.PI * 2);
    ctx.fill();

    if (!opts.hasBeak) {
      const mx = hx + Math.cos(angle) * size * 0.2, my = hy + Math.sin(angle) * size * 0.2;
      ctx.beginPath();
      ctx.ellipse(mx, my, size * 0.15, size * 0.125, angle, 0, Math.PI * 2);
      ctx.fill();
      if (!opts.flash) {
        ctx.fillStyle = Util.shadeColor(bodyColor, -0.4);
        const nAng = angle + 1.3;
        ctx.beginPath();
        ctx.arc(mx + Math.cos(angle) * size * 0.09 + Math.cos(nAng) * size * 0.06,
          my + Math.sin(angle) * size * 0.09 + Math.sin(nAng) * size * 0.06, size * 0.022, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    Util._ponyEars(ctx, size, hx, hy, now, opts, bodyGrad, maneColor);

    if (opts.hasBeak) {
      ctx.fillStyle = Theme.pony.beak;
      ctx.beginPath();
      ctx.moveTo(hx + Math.cos(angle) * size * 0.28, hy + Math.sin(angle) * size * 0.28 - size * 0.02);
      ctx.lineTo(hx + Math.cos(angle) * size * 0.44, hy + Math.sin(angle) * size * 0.44);
      ctx.lineTo(hx + Math.cos(angle) * size * 0.28, hy + Math.sin(angle) * size * 0.28 + size * 0.06);
      ctx.closePath(); ctx.fill();
    }

    if (opts.hasFangs && !opts.flash) {
      ctx.fillStyle = Theme.pony.fang;
      const fx = hx + Math.cos(angle) * size * 0.24, fy = hy + Math.sin(angle) * size * 0.24;
      ctx.beginPath(); ctx.moveTo(fx - size * 0.05, fy); ctx.lineTo(fx - size * 0.03, fy + size * 0.08); ctx.lineTo(fx - size * 0.01, fy); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(fx + size * 0.05, fy); ctx.lineTo(fx + size * 0.03, fy + size * 0.08); ctx.lineTo(fx + size * 0.01, fy); ctx.closePath(); ctx.fill();
    }

    if (opts.hasHorn || opts.extraHorn) Util._ponyHorn(ctx, size, hx, hy, now, opts, maneColor);

    ctx.fillStyle = opts.flash ? Theme.pony.flash : maneColor;
    if (opts.flameMane && !opts.flash) {
      const mx = hx - Math.cos(angle) * size * 0.08, my = hy - Math.sin(angle) * size * 0.08 - size * 0.04;
      const flick = Math.sin(now / 140) * size * 0.03;
      ctx.beginPath();
      ctx.moveTo(mx - size * 0.14, my + size * 0.14);
      ctx.lineTo(mx - size * 0.16 + flick, my - size * 0.1);
      ctx.lineTo(mx - size * 0.04, my - size * 0.02);
      ctx.lineTo(mx + size * 0.02 - flick, my - size * 0.26);
      ctx.lineTo(mx + size * 0.1, my - size * 0.06);
      ctx.lineTo(mx + size * 0.16 + flick, my - size * 0.18);
      ctx.lineTo(mx + size * 0.12, my + size * 0.14);
      ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(hx - Math.cos(angle) * size * 0.08, hy - Math.sin(angle) * size * 0.08 - size * 0.04,
        size * 0.16, size * 0.22, angle, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!opts.flash) {
      const eyeStyle = opts.isRobot ? 'robot' : (opts.eyeStyle || 'round');
      const blinking = !opts.isRobot && (((now % 3600) + 3600) % 3600) < 110;
      const blinkK = blinking ? 1 - Math.abs((((now % 3600) + 3600) % 3600) - 55) / 55 : 0;

      for (const s of [-1, 1]) {
        const ex = hx + Math.cos(angle) * size * 0.1 + Math.cos(angle + s * 1.2) * size * 0.12;
        const ey = hy + Math.sin(angle) * size * 0.1 + Math.sin(angle + s * 1.2) * size * 0.12;
        if (blinking) {
          ctx.fillStyle = bodyColor;
          ctx.beginPath(); ctx.ellipse(ex, ey, size * 0.062, Math.max(size * 0.008, size * 0.05 * blinkK), angle, 0, Math.PI * 2); ctx.fill();
          continue;
        }
        if (eyeStyle !== 'robot' && eyeStyle !== 'facet') {
          ctx.fillStyle = Theme.pony.eyeWhite;
          ctx.beginPath(); ctx.ellipse(ex, ey, size * 0.062, size * 0.05, angle, 0, Math.PI * 2); ctx.fill();
        }
        if (eyeStyle === 'robot') {
          ctx.fillStyle = Theme.pony.robotEye;
          ctx.shadowColor = Theme.pony.robotEye; ctx.shadowBlur = 5;
          ctx.beginPath(); ctx.arc(ex + Math.cos(angle) * size * 0.012, ey, size * 0.045, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        } else if (eyeStyle === 'slit') {
          ctx.fillStyle = Theme.pony.pupil;
          ctx.beginPath();
          ctx.ellipse(ex + Math.cos(angle) * size * 0.012, ey, size * 0.016, size * 0.05, angle, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = Theme.pony.eyeGlint;
          ctx.beginPath(); ctx.arc(ex - size * 0.02, ey - size * 0.018, size * 0.012, 0, Math.PI * 2); ctx.fill();
        } else if (eyeStyle === 'glow') {
          ctx.fillStyle = maneColor;
          ctx.shadowColor = maneColor; ctx.shadowBlur = 6;
          ctx.beginPath(); ctx.arc(ex + Math.cos(angle) * size * 0.012, ey, size * 0.042, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        } else if (eyeStyle === 'facet') {
          const fc = opts.auraColor || maneColor;
          ctx.fillStyle = fc;
          const r = size * 0.055;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = angle + i * Math.PI / 3;
            const px = ex + Math.cos(a) * r, py = ey + Math.sin(a) * r * 0.8;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = Util.shadeColor(fc, -0.4); ctx.lineWidth = size * 0.01;
          ctx.beginPath(); ctx.moveTo(ex - r, ey); ctx.lineTo(ex + r, ey); ctx.stroke();
        } else {
          ctx.fillStyle = Theme.pony.pupil;
          ctx.beginPath(); ctx.arc(ex + Math.cos(angle) * size * 0.012, ey, size * 0.036, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = Theme.pony.eyeGlint;
          ctx.beginPath(); ctx.arc(ex - size * 0.018, ey - size * 0.018, size * 0.015, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    if (opts.hasTalons && !opts.flash) {
      ctx.strokeStyle = Theme.pony.talon; ctx.lineWidth = size * 0.02;
      for (const s of [-1, 1]) {
        const lx = s * size * B.legX, ly = size * 0.42;
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + i * size * 0.03, ly + size * 0.07); ctx.stroke(); }
      }
    }

    if (opts.flourish && !opts.flash) Util._ponyFlourish(ctx, size, hx, hy, angle, now, opts, bodyColor, maneColor);

    ctx.restore();
  },
});

function bfsPath(cols, rows, isBlocked, startX, startY, goalX, goalY){
  if (startX === goalX && startY === goalY) return [];
  const visited = new Set();
  visited.add(Util.key(startX, startY));
  const q = [{ x: startX, y: startY, parent: null }];
  let head = 0;
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  let iterations = 0;
  while (head < q.length && iterations < 2500) {
    iterations++;
    const cur = q[head++];
    if (cur.x === goalX && cur.y === goalY) {
      const path = [];
      for (let n = cur; n.parent; n = n.parent) path.push({ x: n.x, y: n.y });
      path.reverse();
      return path;
    }
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const k = Util.key(nx, ny);
      if (visited.has(k)) continue;
      if (isBlocked(nx, ny) && !(nx === goalX && ny === goalY)) continue;
      visited.add(k);
      q.push({ x: nx, y: ny, parent: cur });
    }
  }
  return null;
}

function bfsNextStep(cols, rows, isBlocked, startX, startY, goalX, goalY){
  const path = bfsPath(cols, rows, isBlocked, startX, startY, goalX, goalY);
  return path && path.length ? path[0] : null;
}
