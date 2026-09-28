'use strict';

const Theme = {

  rgb: {
    black:      '0,0,0',
    white:      '255,255,255',
    fadeVeil:   '6,5,10',
    ice:        '140,220,255',
    iceFill:    '160,225,255',
    shield:     '120,200,255',
    fear:       '138,90,201',
    poison:     '111,168,58',
    laser:      '140,225,255',
    swingTrail: '255,220,160',
    emberRing:  '255,200,120',
  },

  rgba(triplet, a){ return 'rgba(' + triplet + ',' + a + ')'; },

  ui: {
    text:         '#fff',
    textDim:      'rgba(255,255,255,.75)',
    onIcon:       '#000',
    onIconSoft:   '#222',
    gold:         '#e3c15b',
    goldDim:      '#8a7a4a',
    bossBarBack:  'rgba(0,0,0,.5)',
    bossBarEmpty: '#7a2030',
    bossBarFill:  '#e35b6a',
    hpBarBack:    '#000',
    hpBarFill:    '#7fd66a',
  },

  floatText: {
    damage:   '#fff',
    crit:     '#ffcf5c',
    heal:     '#7fd66a',
    shield:   '#7fd6c9',
    playerHurt:'#e35b6a',
    coin:     '#e3c15b',
    curse:    '#8a2e46',
    neutral:  '#dcdcdc',
    muted:    '#8a86a0',
    arcane:   '#c9c3ff',
    stun:     '#f4d35e',
  },

  projectile: {
    player:    '#9ac9e0',
    enemy:     '#e35b6a',
    familiar:  '#c9a3ff',
    turretBolt:'#9ac9e0',
    turretEye: '#e35b6a',
    glint:     'rgba(255,255,255,.65)',
    glowBlur:      6,
    glowBlurBig:  10,
  },

  status: {
    freezeRing: 'rgba(140,220,255,.85)',
    freezeFill: 'rgba(160,225,255,.25)',
    freezeFillPlayer: 'rgba(160,225,255,.2)',
    freezeWidth: 3,
    stun:       '#f4d35e',
    charm:      '#e07a9c',
    fearRing:   'rgba(138,90,201,.75)',
    poisonAura: 'rgba(111,168,58,.3)',
    poisonBlob: '#6fa83a',
    vulnerableRing: 'rgba(217,30,50,.8)',
    vulnerableMark: '#d91e32',
    shieldRing: 'rgba(120,200,255,.7)',
    invincibleGlow: '#ffd76e',
  },

  quality: {
    q4: { color: '#f4d35e', blur: 15, ring: true },
    q3: { color: '#c9a3ff', blur: 9,  ring: true },
    q2: { color: '#9ac9e0', blur: 5,  ring: false },
  },

  fx: {

    blastCore:  '255,255,220',
    blastMidR:  255,
    blastMidG:  140,
    blastMidGRamp: 80,
    blastMidB:  60,
    blastEdge:  'rgba(120,30,10,0)',
    blastRing:  '255,200,120',

    bombBody:   '#2a2a2a',
    bombBodyDark:'#1a1a1a',
    fuse:       '#e07a3a',
    fuseHot:    '#ff5a3a',
    fuseCord:   '#5c4a2e',
    fuseSpark:  '#e0492f',

    ember:      '#e07a3a',
    emberGlow:  '#f4a13a',

  },

  shadow: {
    ground:     'rgba(0,0,0,.25)',
    groundSoft: 'rgba(0,0,0,.3)',
    groundHard: 'rgba(0,0,0,.4)',
    pedestal:   'rgba(0,0,0,.25)',
    ao:         'rgba(0,0,0,.22)',
    aoWidth:    5,
    outline:    'rgba(0,0,0,.35)',
    outlineSoft:'rgba(0,0,0,.25)',
    outlineHard:'rgba(0,0,0,.5)',
    rim:        'rgba(255,255,255,.15)',
    sheen:      'rgba(255,255,255,.3)',
    glint:      'rgba(255,255,255,.55)',
  },

  vignette: {
    enabled: true,

    stops: [
      [0,    'rgba(0,0,0,0)'],
      [0.55, 'rgba(0,0,0,.05)'],
      [0.82, 'rgba(2,2,6,.17)'],
      [1,    'rgba(4,3,8,.36)'],
    ],
  },

  particle: {
    hitSpark:   '#ffd9a0',
    critSpark:  '#fff2c0',
    bloodPuff:  '#3a2430',
    dust:       'rgba(190,180,200,.45)',
    dustSolid:  '#bcb4c8',
    sparkle:    '#ffe9a8',
    heal:       '#7fd66a',
  },

  door: {
    boss:      { open:'#8a2530', locked:'#4a151c' },
    treasure:  { open:'#c9a13a', locked:'#6b551f' },
    shop:      { open:'#6a3fa8', locked:'#3a2258' },
    petshop:   { open:'#3f7a3f', locked:'#1e3a1e' },
    curse:     { open:'#7a2a44', locked:'#3a1420' },
    sacrifice: { open:'#5a2a70', locked:'#2a1438' },
    vault:     { open:'#2f6080', locked:'#183040' },
    challenge: { open:'#a05a2e', locked:'#502c16' },
    crystal:   { open:'#5a9ab8', locked:'#2c4d5c' },
    sombra:    { open:'#5c1420', locked:'#2c0a10' },
    normal:    { open:'#4a3320', locked:'#26201a' },

    planetarium: { open:'#6a5ce0', locked:'#2e2870' },
    arcade:    { open:'#c93f6b', locked:'#5c1a30' },

    start:     { open:'#5a6a80', locked:'#2c3440' },
    secret:    { open:'#4a5c48', locked:'#232c22' },
    supersecret: { open:'#1c1a24', locked:'#0e0d12' },
    star:      { open:'#4fd6e0', locked:'#1e5c62' },
    cpathgate: { open:'#2fa08a', locked:'#164c42' },
    shrine:    { open:'#e0d2a8', locked:'#6e6450' },
    mirror:    { open:'#9a8ad0', locked:'#443c66' },
    karma:     { open:'#d8a02c', locked:'#6a4c12' },
    bosschallenge: { open:'#a01c1c', locked:'#3c0a0a' },
  },

  world: {
    secretOpen:   '#463a5e',
    pedestalBase: '#38334f',
    pedestalTop:  '#4a4468',
    shopPickup:   '#c9c3d8',
    stairsPit:    '#0c0c14',
    stairsRing:   '#e3c15b',
    branchA:      '#8a8ac9',
    branchB:      '#3a6ec9',
    pitFill:      '#050508',
    pitEdge:      '#2a2a3a',
  },

  icon: {
    key:          '#e3d98a',
    keyGold:      '#e3c15b',
    bombBody:     '#262626',
    bombBodyGold: '#8a6a1c',
    bombFuse:     '#e07a3a',
    bombFuseGold: '#e3c15b',
    goldGlowBlur: 8,
    heartRed:     '#e35b6a',
    heartRedLine: '#160b0d',
    heartBlue:    '#5b9ee3',
    heartBlueLine:'#0b1420',
    heartContainer:'#ff8fa0',
    sack:         '#a97c4f',
    sackSeam:     '#6b4a2c',
    sackTie:      '#5c3f22',
    trashBag:     '#4a6e3a',
    trashBagSeam: '#2c4522',
    driftnet:     '#4a7a8a',
    driftnetSeam: '#22404a',
    pearlBody:    '#eef0ea',
    pearlShine:   '#c9a3ff',
    flaskGlass:   '#8fd0f0',
    flaskLiquid:  '#4fd1c5',
    flaskCork:    '#a97c4f',
    batteryShell: '#33304f',
    batteryCharge:'#4fd1c5',
    pillHalf:     '#e8e8e8',
    itemRing:     'rgba(255,255,255,.4)',
  },

  chest: {
    lockBomb:  '#1a1a1a',
    lockKey:   '#3a2e10',
    lockHeart: '#e07a9c',
    lockPlain: '#4a4640',
  },

  machine: {
    body:    '#3a3454',
    frame:   '#231f38',
    meterBg: '#1c1930',
    meterFill:'#e3c15b',
    slot:    '#161228',
    label:   '#e3c15b',

    altarBody:  '#2f2a4e',
    altarFrame: '#6d4fd6',
    altarGlow:  '#a98bff',

    friendshipBody:  '#4a2a3a',
    friendshipFrame: '#c9527a',
    toolsBody:       '#3a3a2a',
    toolsFrame:      '#a8934a',
    darkBody:        '#221a30',
    darkFrame:       '#5a4a8a',

    fillySign:     '#5c4a38',
    fillySignEdge: '#8a6a4a',

    spinRing: '#f0e0a0',
  },

  pony: {
    flash:     '#ffffff',
    beak:      '#e0a83a',
    talon:     '#e0a83a',
    fang:      '#f2f0e8',
    horn:      '#ece4cc',
    chargerHorn:'#e8e4dc',
    eyeWhite:  '#f5f0e6',
    pupil:     '#171220',
    eyeGlint:  'rgba(255,255,255,.85)',
    robotEye:  '#4fd1c5',
    robotSeam: 'rgba(0,0,0,.25)',
    ghostAlpha: 0.78,
  },

  enemy: {
    flash:     '#ffffff',
    flashSoft: '#eeeeee',
    eye:       '#1a1420',
    submergedAlpha: 0.25,
  },

  obstacle: {
    flash:      '#fff',
    flashSoft:  '#eee',
    hardOutline:'#000',
  },
};

const DOOR_COLORS = Theme.door;
