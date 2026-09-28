'use strict';

'use strict';

const TILE = 32;
const BLOCK = 10;

const ROOM_SHAPES = [
  { name:'single',   w:1, blocks:4, mask:[[1]] },
  { name:'wideDom',  w:2, blocks:3, mask:[[1,1]] },
  { name:'tallDom',  w:2, blocks:3, mask:[[1],[1]] },
  { name:'wideTri',  w:2, blocks:2, mask:[[1,1,1]] },
  { name:'tallTri',  w:2, blocks:2, mask:[[1],[1],[1]] },
  { name:'square4',  w:2, blocks:2, mask:[[1,1],[1,1]] },
  { name:'lA',       w:3, blocks:2, mask:[[1,0],[1,1]] },
  { name:'lB',       w:3, blocks:2, mask:[[0,1],[1,1]] },
  { name:'lC',       w:3, blocks:2, mask:[[1,1],[1,0]] },
  { name:'lD',       w:3, blocks:2, mask:[[1,1],[0,1]] },
  { name:'wideQuad', w:4, blocks:1, mask:[[1,1,1,1]] },
  { name:'tallQuad', w:4, blocks:1, mask:[[1],[1],[1],[1]] },
  { name:'tShape',   w:4, blocks:1, mask:[[1,1,1],[0,1,0]] },
  { name:'tShape2',  w:4, blocks:1, mask:[[0,1,0],[1,1,1]] },
  { name:'sShape',   w:4, blocks:1, mask:[[0,1,1],[1,1,0]] },
  { name:'zShape',   w:4, blocks:1, mask:[[1,1,0],[0,1,1]] },
  { name:'lBig1',    w:4, blocks:1, mask:[[1,0],[1,0],[1,1]] },
  { name:'lBig2',    w:4, blocks:1, mask:[[0,1],[0,1],[1,1]] },
  { name:'plus',     w:4, blocks:1, mask:[[0,1,0],[1,1,1],[0,1,0]] },
  { name:'uShape',   w:4, blocks:1, mask:[[1,0,1],[1,1,1]] },
  { name:'bigNotch', w:4, blocks:1, mask:[[1,1,1],[1,1,1],[1,1,0]] },
  { name:'hallWide', w:4, blocks:1, mask:[[1,1,1,1,1]] },
  { name:'hallTall', w:4, blocks:1, mask:[[1],[1],[1],[1],[1]] },
];
function pickRoomShape(minBlocks, maxBlocks){
  const pool = ROOM_SHAPES.filter(s => {
    const n = s.mask.flat().reduce((a,b)=>a+b,0);
    return n >= minBlocks && n <= maxBlocks;
  });
  const weighted = pool.map(s => ({ w: s.w, shape: s }));
  return Util.weighted(weighted).shape;
}

const CLASSES = {
  earth: {
    id:'earth', name:'Earth Pony', color:'#c98a4b', mane:'#6b3f22',
    unlocked:true,
    redMax:6, speed:150, canFly:false,
    attackType:'melee', meleeDamage:2, meleeCooldown:0.4,
    startBombs:1, startKeys:0, startCoins:0,
    desc:'Sturdy hooves, strong melee attacks. No ranged option, but hits hardest.',
  },
  pegasus: {
    id:'pegasus', name:'Pegasus', color:'#7fc1e3', mane:'#e3e3e3',
    unlocked:true,
    redMax:5, speed:175, canFly:true,
    attackType:'melee', meleeDamage:1.25, meleeCooldown:0.36,
    startBombs:1, startKeys:0, startCoins:0,
    desc:'Light on the attack, but flies over rocks and pits with ease.',
  },
  unicorn: {
    id:'unicorn', name:'Unicorn', color:'#b48ce0', mane:'#4a2e73',
    unlocked:true,
    redMax:5, speed:145, canFly:false,
    attackType:'ranged', rangedDamage:1.6, fireCooldown:0.45, boltSpeed:360,
    startBombs:1, startKeys:0, startCoins:0,
    desc:'Casts magic bolts at range. Middling hooves, but never needs to get close.',
  },
  batpony: {
    id:'batpony', name:'Bat Pony', color:'#5a4270', mane:'#1a1420',
    unlocked:false, unlockHint:'Defeat any boss to unlock',
    redMax:4, speed:180, canFly:true,
    attackType:'melee', meleeDamage:1.25, meleeCooldown:0.34,
    startBombs:1, startKeys:0, startCoins:0,
    lifedrinkChance:0.12,
    desc:'A frail flier of the night — but every kill has a 12% chance to mend half a heart.',
  },
  zebra: {
    id:'zebra', name:'Zebra', color:'#e8e4dc', mane:'#161616', stripes:true,
    unlocked:false, unlockHint:'Clear 2 floors in a row without taking damage',
    redMax:4, speed:155, canFly:false,
    attackType:'melee', meleeDamage:2.6, meleeCooldown:0.42,
    startBombs:1, startKeys:0, startCoins:0,
    desc:'Frail but ferocious — the hardest-hitting hoof in Equestria, with two fewer hearts than an earth pony to spare.',
  },
  hypogriff: {
    id:'hypogriff', name:'Hypogriff', color:'#7a5ac9', mane:'#e8d16a',
    unlocked:false, unlockHint:'Defeat Polish DNB on Floor 6',
    redMax:4, speed:190, canFly:true,
    attackType:'melee', meleeDamage:2, meleeCooldown:0.36,
    startBombs:1, startKeys:0, startCoins:0,
    desc:'Eagle-winged and lion-hearted — hits harder and flies faster than any pegasus, with a thinner hide to show for it.',
  },
  seapony: {
    id:'seapony', name:'Sea Pony', color:'#3ab0c9', mane:'#1a6b7a',
    unlocked:false, unlockHint:'Clear Floors 1-6 without taking any damage',
    redMax:6, speed:120, canFly:false,
    attackType:'ranged', rangedDamage:3, fireCooldown:0.72, boltSpeed:300,
    startBombs:1, startKeys:0, startCoins:0,
    desc:'Slow out of water, but every bolt hits like a rolling tide.',
  },
  ponybot: {
    id:'ponybot', name:'Pony Bot', color:'#9a9aa8', mane:'#4fd1c5',
    unlocked:false, unlockHint:'Die to a cactus',
    redMax:0, startBlue:6, speed:145, canFly:false,
    attackType:'ranged', rangedDamage:0.875, fireCooldown:0.24, laser:true, noRedContainers:true,

    damageTakenMult:1.25,
    startBombs:1, startKeys:0, startCoins:0,
    desc:'A jury-rigged automaton. Fires a piercing, room-spanning laser — runs on blue magic alone, can never gain heart containers, and takes 25% more damage from everything.',
  },
  griffin: {
    id:'griffin', name:'Griffin', color:'#c9a35a', mane:'#8a6a3a',
    unlocked:false, unlockHint:'Defeat Pineapple Gatorade DNB on Floor 9A',
    redMax:5, speed:185, canFly:true,
    attackType:'ranged', rangedDamage:1, fireCooldown:0.3, boltSpeed:420,
    startBombs:1, startKeys:0, startCoins:0,
    desc:'A swift aerial hunter — rapid-fire feather volleys trade power for blistering speed.',
  },
  kirin: {
    id:'kirin', name:'Kirin', color:'#e0592f', mane:'#2c0f0a',
    unlocked:false, unlockHint:'Defeat Israel DNB on Floor 9B',
    redMax:0.5, speed:150, canFly:false,
    attackType:'ranged', rangedDamage:3.5, fireCooldown:0.58, boltSpeed:380, noRedContainers:true, noBlueHearts:true,
    startBombs:1, startKeys:0, startCoins:0,
    desc:"One hit and it's over — but a Kirin's wrath burns hotter than anything else in Equestria.",
  },
  dragon: {
    id:'dragon', name:'Dragon', color:'#c9522e', mane:'#e0895a',
    unlocked:false, unlockHint:'Defeat Tyrone, the DNB King on Floor 7',
    redMax:7, speed:145, canFly:true,

    attackType:'ranged', rangedDamage:3, fireCooldown:0.3, charged:true, chargeTime:0.5, baseRangeTiles:4,
    startBombs:1, startKeys:0, startCoins:0,
    desc:'A young dragon whelp — thick-scaled and tough. Hold the attack to charge a short jet of dragonfire that burns through everything in its path.',
  },
  windigo: {
    id:'windigo', name:'Windigo', color:'#9ac9e0', mane:'#e8f4ff',
    unlocked:false, unlockHint:'Freeze 30 enemies',
    redMax:6, speed:160, canFly:true,

    attackType:'ranged', rangedDamage:3, fireCooldown:0.8, boltSpeed:280, innateFreezeChance:0.12,
    startBombs:1, startKeys:0, startCoins:0,
    desc:'A spirit of the bitter cold. Slow, heavy-hitting frost bolts that have a natural 12% chance to freeze on contact.',
  },
  kelpie: {
    id:'kelpie', name:'Kelpie', color:'#2e6e6a', mane:'#0f3a38',
    unlocked:false, unlockHint:'Defeat 300 enemies with melee attacks',
    redMax:7, speed:120, canFly:false,
    attackType:'melee', meleeDamage:2, meleeCooldown:0.42, baseRangeTiles:2.25,
    startBombs:1, startKeys:0, startCoins:0,
    desc:'A hulking water-horse that drags prey down from a distance. Slow on land, but its reach is more than twice any other hoof or claw.',
  },
  breezie: {
    id:'breezie', name:'Breezie', color:'#e07a9c', mane:'#f4d35e', sizeMult:0.62,
    unlocked:false, unlockHint:'Defeat 300 enemies with ranged attacks',
    redMax:2, speed:195, canFly:true,

    attackType:'ranged', rangedDamage:1.2, fireCooldown:0.38, boltSpeed:400, unlimitedRange:true,
    startBombs:1, startKeys:0, startCoins:0,
    desc:'A pixie-sized pony, barely bigger than a hoofprint. The fastest hooves alive and dust motes that never lose momentum — but the thinnest hide of anything that can take a hit at all.',
  },
  dnbpony: {
    id:'dnbpony', name:'DNB Pony', color:'#6a4bd6', mane:'#3ef0e0',
    unlocked:false, unlockHint:'Defeat The One True DNB on floor 13',
    redMax:5, startBlue:1, speed:178, canFly:false,

    attackType:'ranged', rangedDamage:2, fireCooldown:0.32, boltSpeed:330,
    startBombs:1, startKeys:1, startCoins:0,
    desc:'Born from the drop itself — a blur of violet and neon that fires bass pulses faster than anything alive, each one barely more than a tap.',
  },

  crystalpony: {
    id:'crystalpony', name:'Crystal Pony', color:'#8fd6e8', mane:'#d8b4f0',
    unlocked:true,

    redMax:8, speed:130, canFly:false,

    attackType:'ranged', charged:true, chargeTime:0.7, fireCooldown:0.3,
    rangedDamage:1.0, boltSpeed:260, crystalVolley:true,
    startBombs:1, startKeys:0, startCoins:8,
    desc:'Faceted hide of living gemstone — the toughest thing on four legs. Charges her horn, then looses three crystal shards that converge on wherever you\'re aiming. Starts with a pocketful of coins.',
  },
  mule: {
    id:'mule', name:'Mule', color:'#8a7a6a', mane:'#3a3028', sizeMult:1.18,
    unlocked:true,

    redMax:7, speed:132, canFly:false,
    attackType:'melee', meleeDamage:2.2, meleeCooldown:0.48,
    startBombs:3, startKeys:2, startCoins:12,
    desc:'Broad-backed and stubborn. Plods where a pony would trot, but hauls a whole prospector\'s kit down with it — three bombs, two keys and coin to spare.',
  },
  alicorn: {
    id:'alicorn', name:'Alicorn', color:'#f0e6f5', mane:'#c98ae0',
    unlocked:false, unlockHint:'Channel 25 stars',

    redMax:4, speed:165, canFly:true,
    attackType:'ranged', rangedDamage:1.8, fireCooldown:0.5, boltSpeed:400,
    startBombs:1, startKeys:0, startCoins:0,
    desc:'Wing and horn both — flight and magic in one frame, and a frame far too fine to take a beating for it.',
  },
  changeling: {
    id:'changeling', name:'Changeling', color:'#3a3f46', mane:'#5ae0a0',
    unlocked:false, unlockHint:'Collect 25 familiars',

    redMax:4, speed:170, canFly:true,

    attackType:'ranged', rangedDamage:1.4, fireCooldown:0.4,
    greenFireAttack:true, fireZoneRadius:50, fireZoneRange:40,
    lifedrinkChance:0.18,
    startBombs:1, startKeys:0, startCoins:0,
    desc:'A carapaced infiltrator that feeds on what it fells — 18% of kills give back half a heart, the greediest drain in Equestria. Spits a pool of clinging green fire that burns and mires anything standing in it. Flies, but barely holds together.',
  },
  diamonddog: {
    id:'diamonddog', name:'Diamond Dog', color:'#a8926e', mane:'#5a4a32',
    unlocked:false, unlockHint:'Destroy 100 rocks with bombs',

    redMax:7, speed:140, canFly:false,

    attackType:'melee', meleeDamage:2.5, meleeCooldown:0.55,
    shockwaveAttack:true, rockCoinChance:0.02, noTintedRocks:true,
    startBombs:4, startKeys:0, startCoins:20,
    desc:'A tunnel-digging gem hound. Slow, ponderous claws that land like a pickaxe — heavy enough to shatter solid rock — and it never goes underground without a satchel of bombs and gems.',
  },
  gargoyle: {
    id:'gargoyle', name:'Gargoyle', color:'#7a8290', mane:'#4a5058',
    unlocked:false, unlockHint:'Mark 50 enemies Vulnerable',

    redMax:6, speed:165, canFly:true,

    attackType:'ranged', rangedDamage:2, fireCooldown:0.5, boltSpeed:320, innateVulnerableChance:0.10,
    startBombs:1, startKeys:0, startCoins:0,
    desc:'A stone sentinel that wakes at nightfall. Grit-hard hide and a natural 10% chance to mark whatever it strikes as easy prey for everything else in the room.',
  },

  changedling: {
    id:'changedling', name:'Changedling', color:'#3f4a44', mane:'#7aeeb0',
    unlocked:false, unlockHint:'Secret',

    redMax:4, speed:190, canFly:true,

    attackType:'ranged', rangedDamage:1.0, fireCooldown:0.5,
    innateFireRing:true, fireRingRadius:70,
    startBombs:1, startKeys:0, startCoins:0,
    desc:'A changeling who never quite finished the change — caught somewhere between forms, and permanently smouldering because of it. Trails a faint ring of green fire everywhere she flies, no effort required. Quick on the wing, but thin-shelled.',
  },
  changelingqueen: {
    id:'changelingqueen', name:'Changeling Queen', color:'#2f3a35', mane:'#f4d35e',
    unlocked:false, unlockHint:'Secret',

    redMax:4, speed:160, canFly:true,

    attackType:'ranged', rangedDamage:0.8, fireCooldown:0.45,
    greenFireAttack:true, fireZoneRadius:35, fireZoneRange:30,

    summonsChangelings:true, changelingSummonCooldown:4, maxChangelingMinions:4,
    changelingMinionDmg:0.75, changelingMinionRadius:25,
    startBombs:1, startKeys:0, startCoins:0,
    desc:'The hive-mother herself — her own flame burns low, but she never fights alone. Calls in loose-drifting changeling minions to burn beside her, each carrying a small coal of her own green fire.',
  },
  filly: {
    id:'filly', name:'Filly', color:'#f0a8c9', mane:'#e8d16a', sizeMult:0.8,
    unlocked:false, unlockHint:'Charm 60 enemies',

    redMax:4, speed:175, canFly:false,
    attackType:'melee', meleeDamage:1.4, meleeCooldown:0.36,

    innateCharmChance:0.25,
    startBombs:1, startKeys:0, startCoins:0,
    desc:"A plucky young filly, hooves too small for a proper kick — but there's something about her nopony can say no to. 25% of her hits charm the target outright.",
  },
  engineerpony: {
    id:'engineerpony', name:'Engineer Pony', color:'#5a7a9a', mane:'#e0c25a',
    unlocked:false, unlockHint:'Secret',
    redMax:5, speed:150, canFly:false,

    attackType:'ranged', rangedDamage:1.0, fireCooldown:0.5, boltSpeed:300,

    canBuildTurrets:true,
    startBombs:1, startKeys:0, startCoins:0,
    desc:"A tinkerer with a bandolier of spare parts. Holds no grudge against getting her hooves dirty, but would rather let a turret do the shooting — hold the build key to plant one wherever she's standing.",
  },

  chudfilly: {
    id:'chudfilly', name:'Chud Filly', color:'#a8a89a', mane:'#5a5a4e', sizeMult:0.78,
    unlocked:false, unlockHint:'Kill 1,000 flies',

    redMax:3, speed:168, canFly:false,
    attackType:'melee', meleeDamage:0, meleeCooldown:0.4,
    noAttack:true,

    startingFamiliars:[{ id:'housefly', count:3 }, { id:'bloatfly', count:3 }, { id:'gorefly', count:3 }],

    itemsBecomeFamiliars:true,

    gainsFlyPerFloor:true,
    startBombs:1, startKeys:0, startCoins:0,
    desc:"A filly who never quite grew out of chasing bugs — she can't land a hoof of her own, so nine flies do it for her, three more join every floor down, and every stray item she finds turns into one more.",
  },
  chadfilly: {
    id:'chadfilly', name:'Chad Filly', color:'#c98a4b', mane:'#e8d16a', sizeMult:0.78,
    unlocked:false, unlockHint:'Complete the C Route',

    redMax:4, speed:160, canFly:false,
    attackType:'melee', meleeDamage:0, meleeCooldown:0.4,
    noAttack:true,

    unlimitedBombs:true,
    startBombs:3, startKeys:0, startCoins:0,
    desc:"Never met a locked door — or a wall, or an enemy — she didn't think a bomb would fix. Bottomless satchel, no hooves-on attack at all, and every superboss she puts down makes the next bomb she drops a little nastier.",
  },
  snowpitymare: {
    id:'snowpitymare', name:'Snowpity Mare', color:'#dceaf5', mane:'#9ac9e0',
    unlocked:false, unlockHint:'Consume 100 stars',

    redMax:5, speed:158, canFly:false,
    attackType:'ranged', rangedDamage:0, fireCooldown:0.5,
    noAttack:true,

    startingFamiliars:[{ id:'snowwisp', count:5 }],

    pocketActive:{ id:'wispcall', name:'Wisp Call', icon:'❄️', maxCharge:1,
      desc:'Charges over time (slower with more than 5 wisps already out, faster on every room cleared) — then summons one more Snow Wisp.' },
    startBombs:1, startKeys:0, startCoins:0,
    desc:"A gentle winter spirit who never raises a hoof herself — five wisps of frozen light orbit her at all times, biting anything they touch and loosing a volley to every side. Charge her pocket long enough (or clear enough rooms) and a sixth joins the circle.",
  },
};

const POOLS_ALL = ['secret', 'treasure', 'boss', 'chest', 'shop', 'curse', 'challenge'];
const POOLS_SPECIAL = ['secret', 'treasure', 'boss'];
const POOLS_CRYSTAL = ['crystal', 'secret'];
const POOLS_SOMBRA = ['sombra', 'curse'];

const POOLS_SHRINE = ['shrine', 'shop'];

