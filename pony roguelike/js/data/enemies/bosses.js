'use strict';

const BOSS_TYPES = {
  warlord: { id:'warlord', name:'Grung, the DNB Warlord', hp:46, dmg:2, speed:82, radius:26,
    color:'#8a4b2b', dark:'#552c17', behavior:'bossWarlord', stage:0 },
  bonesentinel: { id:'bonesentinel', name:'The Bone Sentinel', hp:46, dmg:2, speed:62, radius:28,
    color:'#8a8578', dark:'#4a463c', behavior:'bossBoneSentinel', stage:0 },

  bonecaller: { id:'bonecaller', name:'Skrell, the DNB Bonecaller', hp:46, dmg:2, speed:54, radius:26,
    color:'#6a5a7a', dark:'#3a2f45', behavior:'bossBoneCaller', stage:0 },
  gravechorus: { id:'gravechorus', name:'The Grave Chorus', hp:48, dmg:2, speed:48, radius:27,
    color:'#9a8fa8', dark:'#4e4658', behavior:'bossGraveChorus', stage:0 },

  eclipsewraith: { id:'eclipsewraith', name:'The Eclipse Wraith', hp:40, dmg:2, speed:96, radius:24,
    color:'#2c2440', dark:'#16101f', behavior:'bossEclipseWraith', stage:0 },
  ironbastion: { id:'ironbastion', name:'The Iron Bastion', hp:58, dmg:3, speed:36, radius:32,
    color:'#5a5a62', dark:'#2c2c32', behavior:'bossIronBastion', burstRadius:85, stage:0 },

  colossus: { id:'colossus', name:'The Colossus Husk', hp:52, dmg:3, speed:40, radius:34,
    color:'#5e4530', dark:'#382a1c', behavior:'bossColossus', stage:1 },
  brambleQueen: { id:'brambleQueen', name:'The Bramble Queen', hp:48, dmg:2, speed:52, radius:27,
    color:'#4a7a3a', dark:'#274a20', behavior:'bossBrambleQueen', stage:1 },

  rotbloom: { id:'rotbloom', name:'The Rot Bloom', hp:48, dmg:2, speed:46, radius:28,
    color:'#8a9a3a', dark:'#4a5218', behavior:'bossRotBloom', burstRadius:78, stage:1 },
  antlerwarden: { id:'antlerwarden', name:'The Antler Warden', hp:50, dmg:3, speed:52, radius:29,
    color:'#8a6a4a', dark:'#4a3524', behavior:'bossAntlerWarden', stage:1 },

  canopychorus: { id:'canopychorus', name:'The Canopy Chorus', hp:46, dmg:2, speed:62, radius:25,
    color:'#4a7a4e', dark:'#22402a', behavior:'bossGraveChorus', stage:1 },
  thicketbastion: { id:'thicketbastion', name:'The Thicket Bastion', hp:58, dmg:3, speed:36, radius:31,
    color:'#5a6a3a', dark:'#2c341c', behavior:'bossBrickGolem', stage:1 },
  mirewretch: { id:'mirewretch', name:'The Mire Wretch', hp:48, dmg:2, speed:58, radius:26,
    color:'#3a5a3a', dark:'#1c2e1c', behavior:'bossSlagbound', stage:1 },

  hivemother: { id:'hivemother', name:'The Hive Mother', hp:50, dmg:2, speed:56, radius:24,
    color:'#7a3f55', dark:'#4a2534', behavior:'bossHiveMother', stage:2 },
  sandwyrm: { id:'sandwyrm', name:'The Sand Wyrm', hp:50, dmg:3, speed:70, radius:26,
    color:'#d9b463', dark:'#8a6e35', behavior:'bossSandWyrm', stage:2 },

  glassscorpion: { id:'glassscorpion', name:'The Glass Scorpion', hp:48, dmg:2, speed:74, radius:24,
    color:'#6ab49a', dark:'#316052', behavior:'bossGlassScorpion', stage:2 },
  duneravager: { id:'duneravager', name:'The Dune Ravager', hp:50, dmg:3, speed:68, radius:27,
    color:'#c98a4a', dark:'#6a4620', behavior:'bossDuneRavager', stage:2 },

  sanddevilhorror: { id:'sanddevilhorror', name:'The Sand Devil Horror', hp:52, dmg:3, speed:56, radius:28,
    color:'#c9a04a', dark:'#684f1e', behavior:'bossVineHorror', stage:2 },
  duststormwraith: { id:'duststormwraith', name:'The Duststorm Wraith', hp:46, dmg:2, speed:88, radius:22,
    color:'#e0c890', dark:'#6e5c3a', behavior:'bossBlizzardWraith', stage:2 },
  emberdunewarden: { id:'emberdunewarden', name:'The Emberdune Warden', hp:56, dmg:3, speed:40, radius:31,
    color:'#d97a3a', dark:'#6e3c18', behavior:'bossFurnaceHeart', stage:2 },

  ashtyrant: { id:'ashtyrant', name:'The Ash Tyrant', hp:52, dmg:3, speed:56, radius:30,
    color:'#c9382e', dark:'#6a1810', behavior:'bossAshTyrant', stage:3 },
  cindercolossus: { id:'cindercolossus', name:'The Cinder Colossus', hp:56, dmg:3, speed:36, radius:36,
    color:'#4a2418', dark:'#240f0a', behavior:'bossCinderColossus', stage:3 },
  magmawraith: { id:'magmawraith', name:'The Magma Wraith', hp:50, dmg:2, speed:66, radius:26,
    color:'#e0762e', dark:'#7a3a14', behavior:'bossMagmaWraith', stage:3 },
  brimstonehorror: { id:'brimstonehorror', name:'The Brimstone Horror', hp:52, dmg:3, speed:50, radius:28,
    color:'#8a3a1a', dark:'#4a1c0c', behavior:'bossBrimstoneHorror', stage:3 },

  furnaceheart: { id:'furnaceheart', name:'The Furnace Heart', hp:52, dmg:3, speed:44, radius:30,
    color:'#f0a03a', dark:'#8a5418', behavior:'bossFurnaceHeart', stage:3 },
  slagbound: { id:'slagbound', name:'The Slagbound Effigy', hp:54, dmg:3, speed:38, radius:32,
    color:'#9c3ac9', dark:'#52205c', behavior:'bossSlagbound', stage:3 },

  shadowstalker: { id:'shadowstalker', name:'The Shadow Stalker', hp:52, dmg:2, speed:62, radius:24,
    color:'#2c2840', dark:'#15121f', behavior:'bossShadowStalker', floorKey:'9A' },
  stormbringer: { id:'stormbringer', name:'The Stormbringer', hp:52, dmg:2, speed:56, radius:25,
    color:'#4a4a70', dark:'#24243a', behavior:'bossStormbringer', floorKey:'9A' },

  frostsentinel: { id:'frostsentinel', name:'The Frost Sentinel', hp:52, dmg:2, speed:52, radius:24,
    color:'#7fa8c9', dark:'#3e5468', behavior:'bossFrostSentinel', floorKey:'9B' },
  brickgolem: { id:'brickgolem', name:'The Brick Golem', hp:56, dmg:3, speed:42, radius:28,
    color:'#8a5a4a', dark:'#4a2e24', behavior:'bossBrickGolem', floorKey:'9B' },

  glacierfiend: { id:'glacierfiend', name:'The Glacier Fiend', hp:56, dmg:3, speed:40, radius:30,
    color:'#9ac9e0', dark:'#4a6a7a', behavior:'bossGlacierFiend', floorKey:'10A' },
  blizzardwraith: { id:'blizzardwraith', name:'The Blizzard Wraith', hp:52, dmg:2, speed:76, radius:24,
    color:'#e8f4ff', dark:'#8aa8c0', behavior:'bossBlizzardWraith', floorKey:'10A' },

  vinehorror: { id:'vinehorror', name:'The Vine Horror', hp:56, dmg:3, speed:50, radius:29,
    color:'#3a6a2a', dark:'#1e3a15', behavior:'bossVineHorror', floorKey:'10B' },
  canopystalker: { id:'canopystalker', name:'The Canopy Stalker', hp:52, dmg:2, speed:66, radius:25,
    color:'#5a8a3a', dark:'#2e4a1c', behavior:'bossCanopyStalker', floorKey:'10B' },

  subdrowner: { id:'subdrowner', name:'The Sub Drowner', hp:58, dmg:3, speed:44, radius:30,
    color:'#4f7fd8', dark:'#1e3468', behavior:'bossFurnaceHeart', floorKey:'11A' },
  pressurechoir: { id:'pressurechoir', name:'The Pressure Choir', hp:56, dmg:2, speed:48, radius:28,
    color:'#2e4a8a', dark:'#16244a', behavior:'bossGraveChorus', floorKey:'11A' },

  brinebloom: { id:'brinebloom', name:'The Brine Bloom', hp:56, dmg:3, speed:48, radius:28,
    color:'#2fe0c4', dark:'#12604c', behavior:'bossRotBloom', burstRadius:80, floorKey:'11B' },
  glassreef: { id:'glassreef', name:'The Glass Reef', hp:54, dmg:2, speed:76, radius:25,
    color:'#6ae0b4', dark:'#276a54', behavior:'bossGlassScorpion', floorKey:'11B' },

  feedbackeffigy: { id:'feedbackeffigy', name:'The Feedback Effigy', hp:60, dmg:3, speed:40, radius:32,
    color:'#b04ff0', dark:'#4e1c74', behavior:'bossSlagbound', floorKey:'12A' },
  brokenrefrain: { id:'brokenrefrain', name:'The Broken Refrain', hp:58, dmg:3, speed:54, radius:29,
    color:'#8a3ad9', dark:'#42186a', behavior:'bossAntlerWarden', floorKey:'12A' },

  redlineravager: { id:'redlineravager', name:'The Redline Ravager', hp:58, dmg:3, speed:70, radius:28,
    color:'#ff3d7a', dark:'#7a0e34', behavior:'bossDuneRavager', floorKey:'12B' },
  clippingcolossus: { id:'clippingcolossus', name:'The Clipping Colossus', hp:62, dmg:3, speed:38, radius:34,
    color:'#c9203a', dark:'#5c0c18', behavior:'bossColossus', floorKey:'12B' },

  lastovertone: { id:'lastovertone', name:'The Last Overtone', hp:64, dmg:2, speed:84, radius:23,
    color:'#7a8ac0', dark:'#38406a', behavior:'bossShadowStalker', floorKey:'13' },
  hollowcantor: { id:'hollowcantor', name:'The Hollow Cantor', hp:68, dmg:3, speed:44, radius:31,
    color:'#525d80', dark:'#262c40', behavior:'bossFrostSentinel', floorKey:'13' },

  flatlinewraith: { id:'flatlinewraith', name:'The Flatline Wraith', hp:70, dmg:2, speed:80, radius:26,
    color:'#e0604a', dark:'#7a2e1a', behavior:'bossBrimstoneHorror', floorKey:'14' },
  zeroamplitude: { id:'zeroamplitude', name:'The Zero Amplitude', hp:73, dmg:3, speed:46, radius:34,
    color:'#8a2818', dark:'#3e1008', behavior:'bossCinderColossus', floorKey:'14' },

  mausoleumtitan: { id:'mausoleumtitan', name:'The Mausoleum Titan', hp:50, dmg:3, speed:36, radius:32,
    color:'#6a6458', dark:'#38342c', behavior:'bossBrickGolem', stage:0 },

  sepulchershade: { id:'sepulchershade', name:'The Sepulcher Shade', hp:44, dmg:2, speed:78, radius:22,
    color:'#3f3a52', dark:'#1e1b29', behavior:'bossShadowStalker', stage:0 },

  hollowstag: { id:'hollowstag', name:'The Hollow Stag', hp:44, dmg:2, speed:74, radius:22,
    color:'#7a6a4a', dark:'#3f3624', behavior:'bossCanopyStalker', stage:1 },

  fenwarden: { id:'fenwarden', name:'The Fen Warden', hp:50, dmg:3, speed:40, radius:30,
    color:'#5a7a6a', dark:'#2e4036', behavior:'bossFrostSentinel', stage:1 },

  sunflaredjinn: { id:'sunflaredjinn', name:'The Sunflare Djinn', hp:44, dmg:2, speed:72, radius:22,
    color:'#f0c04a', dark:'#8a6a14', behavior:'bossGlacierFiend', stage:2 },

  sandstonebehemoth: { id:'sandstonebehemoth', name:'The Sandstone Behemoth', hp:56, dmg:3, speed:34, radius:33,
    color:'#b09060', dark:'#5e4a30', behavior:'bossStormbringer', stage:2 },

  emberlash: { id:'emberlash', name:'The Emberlash', hp:46, dmg:2, speed:78, radius:23,
    color:'#ff5a2e', dark:'#8a2410', behavior:'bossVineHorror', stage:3 },

  ashfallleviathan: { id:'ashfallleviathan', name:'The Ashfall Leviathan', hp:58, dmg:3, speed:44, radius:31,
    color:'#5a4a44', dark:'#2c2422', behavior:'bossBlizzardWraith', stage:3 },

  wailingdark: { id:'wailingdark', name:'The Wailing Dark', hp:46, dmg:2, speed:72, radius:22,
    color:'#2a2338', dark:'#13101c', behavior:'bossGraveChorus', floorKey:'9A' },

  thunderhead: { id:'thunderhead', name:'The Thunderhead', hp:60, dmg:3, speed:40, radius:33,
    color:'#3f4a86', dark:'#1e2444', behavior:'bossDuneRavager', floorKey:'9A' },

  rimeeffigy: { id:'rimeeffigy', name:'The Rime Effigy', hp:46, dmg:2, speed:62, radius:24,
    color:'#a8d4ec', dark:'#4a6c80', behavior:'bossSlagbound', floorKey:'9B' },

  rampartcrawler: { id:'rampartcrawler', name:'The Rampart Crawler', hp:58, dmg:3, speed:44, radius:31,
    color:'#9c6448', dark:'#4e3122', behavior:'bossGlassScorpion', floorKey:'9B' },

  whiteoutheart: { id:'whiteoutheart', name:'The Whiteout Heart', hp:46, dmg:2, speed:72, radius:23,
    color:'#eef8ff', dark:'#8fb0c4', behavior:'bossFurnaceHeart', floorKey:'10A' },

  calvingtitan: { id:'calvingtitan', name:'The Calving Titan', hp:48, dmg:2, speed:64, radius:24,
    color:'#6fa8c9', dark:'#345264', behavior:'bossColossus', floorKey:'10A' },

  feverblossom: { id:'feverblossom', name:'The Fever Blossom', hp:46, dmg:2, speed:74, radius:23,
    color:'#e0609c', dark:'#7a2a50', behavior:'bossRotBloom', burstRadius:66, floorKey:'10B' },

  bogtuskwarden: { id:'bogtuskwarden', name:'The Bogtusk Warden', hp:62, dmg:3, speed:36, radius:34,
    color:'#5a4a2e', dark:'#2c2417', behavior:'bossAntlerWarden', floorKey:'10B' },

  sonarlance: { id:'sonarlance', name:'The Sonar Lance', hp:44, dmg:2, speed:76, radius:22,
    color:'#8ab8f0', dark:'#3a5480', behavior:'bossFrostSentinel', floorKey:'11A' },

  abyssrender: { id:'abyssrender', name:'The Abyss Render', hp:62, dmg:3, speed:36, radius:33,
    color:'#16264a', dark:'#0a1226', behavior:'bossShadowStalker', floorKey:'11A' },

  reefleviathan: { id:'reefleviathan', name:'The Reef Leviathan', hp:62, dmg:3, speed:34, radius:34,
    color:'#137a68', dark:'#093c34', behavior:'bossVineHorror', floorKey:'11B' },

  tidefiend: { id:'tidefiend', name:'The Tide Fiend', hp:46, dmg:2, speed:84, radius:21,
    color:'#7af0d0', dark:'#2f7a68', behavior:'bossGlacierFiend', floorKey:'11B' },

  fractalwraith: { id:'fractalwraith', name:'The Fractal Wraith', hp:44, dmg:2, speed:90, radius:20,
    color:'#e0b4ff', dark:'#6a5480', behavior:'bossBlizzardWraith', floorKey:'12A' },

  monolithofnoise: { id:'monolithofnoise', name:'The Monolith of Noise', hp:62, dmg:3, speed:24, radius:36,
    color:'#4a2a70', dark:'#241338', behavior:'bossStormbringer', floorKey:'12A' },

  clippingstag: { id:'clippingstag', name:'The Clipping Stag', hp:62, dmg:3, speed:38, radius:33,
    color:'#7a0c26', dark:'#3c0612', behavior:'bossCanopyStalker', floorKey:'12B' },

  transientgolem: { id:'transientgolem', name:'The Transient Golem', hp:44, dmg:2, speed:80, radius:21,
    color:'#ffb0c0', dark:'#7a5058', behavior:'bossBrickGolem', floorKey:'12B' },

};
const BOSS_LIST = Object.values(BOSS_TYPES);

const BOSS_LIST_BESTIARY_EXTRA = [
  { id:'mirrorboss_earth', name:'The Mirror: Tiller', desc:'Your Earth Pony reflection. Roots itself, telegraphs, then erupts in a stomp and a ring of shrapnel.',
    hp:220, dmg:5, speed:150, radius:17, color:'#c98a4b', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
  { id:'mirrorboss_pegasus', name:'The Mirror: Squall', desc:'Your Pegasus reflection. Cycles short hovers into blistering dash-shots that close the gap for you.',
    hp:220, dmg:5, speed:150, radius:17, color:'#7fc1e3', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
  { id:'mirrorboss_unicorn', name:'The Mirror: Arcanum', desc:'Your Unicorn reflection. Keeps its distance and punctuates every fourth cast with an eight-bolt nova.',
    hp:220, dmg:5, speed:150, radius:17, color:'#b48ce0', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
  { id:'mirrorboss_batpony', name:'The Mirror: Umbra', desc:'Your Bat Pony reflection. Alternates a shielded orbit with a reckless dive, feeding on the gaps.',
    hp:220, dmg:5, speed:150, radius:17, color:'#5a4270', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
  { id:'mirrorboss_zebra', name:'The Mirror: Totem', desc:'Your Zebra reflection. Every third bolt lands fat, fast and critical.',
    hp:220, dmg:5, speed:150, radius:17, color:'#e8e4dc', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
  { id:'mirrorboss_hypogriff', name:'The Mirror: Tideclaw', desc:'Your Hypogriff reflection. Weaves in a sine drift that makes it a miserable thing to lead.',
    hp:220, dmg:5, speed:150, radius:17, color:'#7a5ac9', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
  { id:'mirrorboss_seapony', name:'The Mirror: Undertow', desc:'Your Sea Pony reflection. Swaps between a close pressure-wave phase and a ranged three-bolt fan.',
    hp:220, dmg:5, speed:150, radius:17, color:'#3ab0c9', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
  { id:'mirrorboss_ponybot', name:'The Mirror: Chassis', desc:'Your Pony Bot reflection. Locks on, then sweeps a continuous piercing laser that tracks slower than you run.',
    hp:220, dmg:5, speed:150, radius:17, color:'#9a9aa8', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
  { id:'mirrorboss_griffin', name:'The Mirror: Talon', desc:'Your Griffin reflection. Buries you under a fast, slightly inaccurate stream of light shots.',
    hp:220, dmg:5, speed:150, radius:17, color:'#c9a35a', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
  { id:'mirrorboss_kirin', name:'The Mirror: Nirik', desc:'Your Kirin reflection. Slow, heavy explosive bolts, with a delayed flame bloom under your hooves.',
    hp:220, dmg:5, speed:150, radius:17, color:'#e0592f', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
  { id:'mirrorboss_dragon', name:'The Mirror: Emberwyrm', desc:'Your Dragon reflection. Winds up, then breathes a short scattered jet that shreds anything in the cone.',
    hp:220, dmg:5, speed:150, radius:17, color:'#c9522e', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
  { id:'mirrorboss_windigo', name:'The Mirror: Rime', desc:'Your Windigo reflection. Drifting, homing frost shards punctuated by a wide slow ring.',
    hp:220, dmg:5, speed:150, radius:17, color:'#9ac9e0', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
  { id:'mirrorboss_kelpie', name:'The Mirror: Drowner', desc:'Your Kelpie reflection. No projectiles worth naming, just an unreasonably long reaching lunge.',
    hp:220, dmg:5, speed:150, radius:17, color:'#2e6e6a', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
  { id:'mirrorboss_breezie', name:'The Mirror: Gustling', desc:'Your Breezie reflection. Tiny, orbiting, endlessly circling, spitting small homing motes.',
    hp:220, dmg:5, speed:150, radius:17, color:'#e07a9c', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
  { id:'mirrorboss_dnbpony', name:'The Mirror: Subwoofer', desc:'Your DNB Pony reflection. Rapid bass stabs building to a twelve-bolt drop and a shockwave.',
    hp:220, dmg:5, speed:150, radius:17, color:'#6a4bd6', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
  { id:'mirrorboss_crystalpony', name:'The Mirror: Facet', desc:'Your Crystal Pony reflection. Charges, then fires three converging shards from offset points.',
    hp:220, dmg:5, speed:150, radius:17, color:'#8fd6e8', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
  { id:'mirrorboss_mule', name:'The Mirror: Packbearer', desc:'Your Mule reflection. Lobs a delayed charge onto your position and plods after you regardless.',
    hp:220, dmg:5, speed:150, radius:17, color:'#8a7a6a', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
  { id:'mirrorboss_alicorn', name:'The Mirror: Ascendant', desc:'Your Alicorn reflection. Three rotating phases: aimed fire, an orbiting nova, then close blast pressure.',
    hp:220, dmg:5, speed:150, radius:17, color:'#f0e6f5', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
  { id:'mirrorboss_changeling', name:'The Mirror: Husk', desc:'Your Changeling reflection. Green fire that drinks life back out of every third hit it lands.',
    hp:220, dmg:5, speed:150, radius:17, color:'#3a3f46', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
  { id:'mirrorboss_diamonddog', name:'The Mirror: Delver', desc:'Your Diamond Dog reflection. Closes slowly, telegraphs, then detonates a huge shockwave and ring.',
    hp:220, dmg:5, speed:150, radius:17, color:'#a8926e', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
  { id:'mirrorboss_gargoyle', name:'The Mirror: Statue', desc:'Your Gargoyle reflection. Petrifies into an invulnerable ring-spewing turret, then hunts.',
    hp:220, dmg:5, speed:150, radius:17, color:'#7a8290', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
  { id:'mirrorboss_changedling', name:'The Mirror: Reformed', desc:'Your Changedling reflection. Chases hard, periodically bursting into a fire ring at point blank.',
    hp:220, dmg:5, speed:150, radius:17, color:'#3f4a44', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
  { id:'mirrorboss_changelingqueen', name:'The Mirror: Hivemother', desc:'Your Changeling Queen reflection. Hangs back, calls swarmers, and rings the room every fourth cast.',
    hp:220, dmg:5, speed:150, radius:17, color:'#2f3a35', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
  { id:'mirrorboss_filly', name:'The Mirror: Brat', desc:'Your Filly reflection. Small, quick, weaving, and relentlessly in your face.',
    hp:220, dmg:5, speed:150, radius:17, color:'#f0a8c9', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
  { id:'mirrorboss_engineerpony', name:'The Mirror: Fabricator', desc:'Your Engineer Pony reflection. Drops a firing position behind it that keeps shooting after it moves.',
    hp:220, dmg:5, speed:150, radius:17, color:'#5a7a9a', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
  { id:'mirrorboss_chudfilly', name:'The Mirror: Swarmfather', desc:'Your Chud Filly reflection. Barely shoots at all; instead it keeps producing more of everything else.',
    hp:220, dmg:5, speed:150, radius:17, color:'#a8a89a', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
  { id:'mirrorboss_chadfilly', name:'The Mirror: Demolitionist', desc:'Your Chad Filly reflection. Infinite ordnance, thrown at your feet on a delay, sometimes twice.',
    hp:220, dmg:5, speed:150, radius:17, color:'#c98a4b', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
  { id:'mirrorboss_snowpitymare', name:'The Mirror: Wispmother', desc:'Your Snowpity Mare reflection. Fights entirely through a staggered halo of homing wisps.',
    hp:220, dmg:5, speed:150, radius:17, color:'#dceaf5', dark:'#2b2f45', behavior:'mirrorboss', stage:'universal' },
];
