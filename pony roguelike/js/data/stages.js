'use strict';

const STAGES = [
  {
    id:'crypt', flavor:'bone', name:'The Crypt',
    palette: {
      floorA:'#38363d', floorB:'#403e46', wall:'#242229', voidC:'#000',
      doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#100f13', accent:'#9a958c',
    },
  },
  {
    id:'forest', flavor:'leaf', name:'The Whitetail Forest',
    palette: {
      floorA:'#233420', floorB:'#293c26', wall:'#16241a', voidC:'#000',
      doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#0e1a10', accent:'#7fbf6a',
    },
  },
  {
    id:'desert', flavor:'sand', name:'The Sandswept Dunes',
    palette: {
      floorA:'#4a3d24', floorB:'#54452a', wall:'#332a19', voidC:'#000',
      doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#221b0f', accent:'#e0c374',
    },
  },
  {
    id:'inferno', flavor:'fire', name:'The Inferno',
    palette: {
      floorA:'#421a10', floorB:'#4f2013', wall:'#2c0f0a', voidC:'#000',
      doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#180705', accent:'#e0592f',
    },
  },

  {
    id:'frozendesert', flavor:'ice', name:'The Frozen Desert',
    palette: {
      floorA:'#8fa4b0', floorB:'#9cb2be', wall:'#5c707c', voidC:'#000',
      doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#3c4c56', accent:'#e8f4ff',
    },
  },
  {
    id:'badlands', flavor:'rust', name:'The Badlands',
    palette: {
      floorA:'#5a3a2a', floorB:'#674433', wall:'#3a2519', voidC:'#000',
      doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#241610', accent:'#d98a4a',
    },
  },
  {
    id:'beach', flavor:'shell', name:'The Beach',
    palette: {
      floorA:'#d8c89a', floorB:'#e2d4a8', wall:'#9a8a5e', voidC:'#000',
      doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#6e6040', accent:'#4fc8e0',
    },
  },
  {
    id:'ocean', flavor:'tide', name:'The Ocean',
    palette: {
      floorA:'#1e5a78', floorB:'#246a8a', wall:'#123a50', voidC:'#000',
      doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#0a2230', accent:'#7fe8ff',
    },
  },
  {
    id:'seafloor', flavor:'silt', name:'The Sea Floor',
    palette: {
      floorA:'#1a4054', floorB:'#204c62', wall:'#0e2836', voidC:'#000',
      doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#061620', accent:'#8ad4b0',
    },
  },
  {
    id:'trench', flavor:'abyss', name:'The Trench',
    palette: {
      floorA:'#122c40', floorB:'#16344c', wall:'#081a28', voidC:'#000',
      doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#040e16', accent:'#4fa8d8',
    },
  },
  {
    id:'trenchdepths', flavor:'vent', name:'The Trench Depths',
    palette: {
      floorA:'#0c1c2e', floorB:'#102338', wall:'#050f1c', voidC:'#000',
      doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#02070e', accent:'#3f7fc0',
    },
  },
  {
    id:'deepdark', flavor:'void', name:'The Deep Dark',
    palette: {
      floorA:'#080a12', floorB:'#0c0e18', wall:'#04050a', voidC:'#000',
      doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#010204', accent:'#2f5f8a',
    },
  },
  {
    id:'metarealm', flavor:'crystal', name:'The Meta Realm',
    palette: {
      floorA:'#1c1230', floorB:'#241740', wall:'#0e0820', voidC:'#000',
      doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#050310', accent:'#00ffa8',
    },
  },
  {
    id:'hyperspace', flavor:'crystal', name:'Hyperspace',
    palette: {
      floorA:'#12082a', floorB:'#180c38', wall:'#08041a', voidC:'#000',
      doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#03010c', accent:'#ff4fd8',
    },
  },
];

const STAGE_MUSIC_TRACKS = {
  crypt:'crypt', forest:'forest', desert:'desert', inferno:'inferno',
  frozendesert:'frozendesert', badlands:'badlands', beach:'beach', ocean:'ocean',
  seafloor:'seafloor', trench:'trench', trenchdepths:'trenchdepths', deepdark:'deepdark',
  metarealm:'metarealm', hyperspace:'hyperspace',
};

const BRANCH_MUSIC_TRACKS = {
  A: 'inferno',
  B: 'infernoB',
};
const FINALE_MUSIC_TRACK = 'finale';
const BRANCH_MUSIC_FIRST_FLOOR = 8;
const BRANCH_MUSIC_LAST_FLOOR = 11;

function legacyMusicTrackFor(floorNum, branch){
  if (floorNum >= BRANCH_MUSIC_FIRST_FLOOR && floorNum <= BRANCH_MUSIC_LAST_FLOOR) {
    return BRANCH_MUSIC_TRACKS[branch === 'B' ? 'B' : 'A'];
  }
  if (floorNum > BRANCH_MUSIC_LAST_FLOOR && floorNum <= OLD_MAIN_ROUTE_FINAL_FLOOR) return FINALE_MUSIC_TRACK;
  return STAGE_MUSIC_TRACKS[STAGES[stageIndexForFloor(floorNum)].id] || null;
}

const LEGACY_STAGE_COUNT = 4;

const STAGE_LIST = [
  { id:'crypt', name:'The Crypt', icon:'💀', desc:'Floors 1-2 — dusty catacombs and bone-strewn crypts.' },
  { id:'forest', name:'The Whitetail Forest', icon:'🌲', desc:'Floors 3-4 — overgrown woodland, sprouts and vines.' },
  { id:'desert', name:'The Sandswept Dunes', icon:'🏜️', desc:'Floors 5-6 — scorching dunes, sand traps and cacti.' },
  { id:'inferno', name:'The Inferno', icon:'🔥', desc:'Floors 7-8 — molten depths, the last floors before the run branches.' },

  { id:'9a', name:'The Final Reckoning — Branch A', icon:'🅰️', desc:'Floor 9, Branch A — one of two forks the run can take from here.' },
  { id:'9b', name:'The Final Reckoning — Branch B', icon:'🅱️', desc:'Floor 9, Branch B — the other fork.' },
  { id:'10a', name:'The Uncharted Reaches — Branch A', icon:'🅰️', desc:'Floor 10, Branch A.' },
  { id:'10b', name:'The Uncharted Reaches — Branch B', icon:'🅱️', desc:'Floor 10, Branch B.' },
  { id:'11a', name:'The Sunken Frequency — Branch A', icon:'🅰️', desc:'Floor 11, Branch A.' },
  { id:'11b', name:'The Sunken Frequency — Branch B', icon:'🅱️', desc:'Floor 11, Branch B.' },
  { id:'12a', name:'The Shattered Refrain — Branch A', icon:'🅰️', desc:'Floor 12, Branch A — one floor from the convergence.' },
  { id:'12b', name:'The Shattered Refrain — Branch B', icon:'🅱️', desc:'Floor 12, Branch B — one floor from the convergence.' },

  { id:'13', name:'The Hollow Chorus', icon:'🕳️', desc:'Floor 13 — the branches have converged; the chorus sings with no voices left.' },
  { id:'14', name:'The Final Waveform', icon:'📉', desc:'Floor 14 — the last full bar before the descent bottoms out.' },
  { id:'15', name:'The One True Descent', icon:'🏁', desc:'Floor 15 — the final fight, whichever branch the run took to get here.' },

  { id:'gutters', name:'The Gutters', icon:'🌊', desc:'C-branch floors 3C-4C — flooded overflow channels.' },
  { id:'sewers', name:'The Sewers', icon:'💧', desc:'C-branch floors 5C-6C — the drowned mix, capped by Drenched DNB.' },
  { id:'rainforest', name:'The Rainforest', icon:'🌴', desc:'C-branch floors 7C-10C — canopy to the storm-lashed crown.' },

  { id:'mangroves', name:'The Mangroves', icon:'🌊', desc:'C-branch floors 11C-12C — brackish tidal roots, and Kirk’s last set.' },

  { id:'floodedundercity', name:'The Flooded Undercity', icon:'🏚️', desc:'C-branch floors 13C-14C — a sunken ruin just past the mangroves, still lit from above.' },
  { id:'coralboneyard', name:'The Coral Boneyard', icon:'🦴', desc:'C-branch floors 15C-16C — a bleached reef graveyard of old wrecks.' },
  { id:'abyssalvents', name:'The Abyssal Vents', icon:'♨️', desc:'C-branch floors 17C-18C — a hydrothermal vent field, scalding water in the cold dark.' },
  { id:'drownedcathedral', name:'The Drowned Cathedral', icon:'🔔', desc:'C-branch floors 19C-20C — a sunken ruin of stone and bell-bronze, eerily still.' },
  { id:'blackcurrent', name:'The Black Current', icon:'🌑', desc:'C-branch floors 21C-22C — true lightless deep water, and a current that never stops pulling.' },
  { id:'leviathansmaw', name:'The Leviathan\'s Maw', icon:'🐋', desc:'C-branch floors 23C-24C — the drowned path\'s new end, and whatever is actually down here.' },

  { id:'observatory', name:'The Observatory', icon:'🔭', desc:'D-branch floors 4D-5D — dust-choked lenses under a broken dome.' },
  { id:'orrery', name:'The Orrery', icon:'🪐', desc:'D-branch floors 6D-7D — brass meridians turning a sky made of gears.' },
  { id:'voidbetween', name:'The Void Between', icon:'🌌', desc:'D-branch floors 8D-10D — the cold drift outside the machine, down to the last light.' },
];
const FLOORS_PER_STAGE = 2;
const BASE_MAX_FLOORS = 6;
const FLOOR_NAMES = [
  'Crypt — Upper Catacombs', 'Crypt — Bone Vault',
  'Whitetail Forest — The Eaves', 'Everfree Depths',
  'Dune Sea — Sunburnt Flats', 'The DNB Hive Core',
  'The Inferno — Ashfall Gate', 'The Inferno — Brimstone Throne',
  'The Final Reckoning', 'The Uncharted Reaches',
  'The Sunken Frequency', 'The Shattered Refrain',

  'The Hollow Chorus', 'The Final Waveform',
  'The One True Descent',

  'Frozen Desert — Rime Flats', 'Frozen Desert — The Drifts',
  'Badlands — Cracked Mesa', 'Badlands — The Rust Gulch',
  'Beach — Bleached Shore', 'Beach — The Tideline',
  'Ocean — The Shelf', 'Ocean — Open Water',
  'The Sea Floor — Silt Plains', 'The Sea Floor — The Wreck Field',
  'Trench — The Descent Wall', 'Trench — Cold Seep',
  'Trench Depths — Crush Zone', 'Trench Depths — The Black Vents',
  'Deep Dark — No Light Reaches', 'Deep Dark — The Long Quiet',
  'Meta Realm — Behind The Curtain', 'Meta Realm — The Author\'s Margin',
  'Hyperspace — Fold', 'Hyperspace — The Last Exit',
];
const MAX_FLOORS = FLOOR_NAMES.length;

const OLD_MAIN_ROUTE_FINAL_FLOOR = 14;

const MAIN_ROUTE_FINAL_FLOOR = MAX_FLOORS - 1;

const C_FLOOR_NAMES = {
  2:'Gutters — Overflow Channels', 3:'Gutters — The Silt Run',
  4:'Sewers — Effluent Mains', 5:'Sewers — The Drowned Mix',
  6:'Rainforest — Canopy Floor', 7:'Rainforest — Emerald Deep',
  8:'Rainforest — The Prime Grove', 9:'Rainforest — The Storm Canopy',

  10:'Mangroves — The Tangled Shallows', 11:'Mangroves — Kirk\'s Last Set',

  12:'The Flooded Undercity — The Sunken Nave', 13:'The Flooded Undercity — The Silt Warden\'s Hall',
  14:'The Coral Boneyard — The Wreck Field', 15:'The Coral Boneyard — The Bleached Reef',
  16:'The Abyssal Vents — The Scalding Shelf', 17:'The Abyssal Vents — The Black Smokers',
  18:'The Drowned Cathedral — The Nave of Bells', 19:'The Drowned Cathedral — The Choir Below',
  20:'The Black Current — The Lightless Reach', 21:'The Black Current — The Undertow',
  22:'The Leviathan\'s Maw — The Last Descent', 23:'The Leviathan\'s Maw — The Maw Itself',
};
const C_LAST_FLOORNUM = 23;

const D_FLOOR_NAMES = {
  3:'Observatory — The Dust Lens', 4:'Observatory — The Broken Dome',
  5:'Orrery — Brass Meridians', 6:'Orrery — The Gear Sky',
  7:'The Void Between — Cold Drift', 8:'The Void Between — Event Shore',
  9:'The Void Between — The Last Light',
};
const D_LAST_FLOORNUM = 9;

function floorLabelFor(floorNum, floorPath){
  if (floorPath === 'C') return (floorNum + 1) + 'C';
  if (floorPath === 'D') return (floorNum + 1) + 'D';
  return String(floorNum + 1);
}
function floorNameFor(floorNum, floorPath){
  if (floorPath === 'C') return C_FLOOR_NAMES[floorNum] || 'The Drowned Path';
  if (floorPath === 'D') return D_FLOOR_NAMES[floorNum] || 'The Starlit Path';
  return FLOOR_NAMES[floorNum];
}

function stageIndexForFloor(floorNum){
  if (floorNum <= OLD_MAIN_ROUTE_FINAL_FLOOR) return Math.min(LEGACY_STAGE_COUNT - 1, Math.floor(floorNum / FLOORS_PER_STAGE));
  const offset = floorNum - (OLD_MAIN_ROUTE_FINAL_FLOOR + 1);
  return Math.min(STAGES.length - 1, LEGACY_STAGE_COUNT + Math.floor(offset / FLOORS_PER_STAGE));
}

const C_FLOOR_KEYS = { 2:'3C', 3:'4C', 4:'5C', 5:'6C', 6:'7C', 7:'8C', 8:'9C', 9:'10C', 10:'11C', 11:'12C',

  12:'13C', 13:'14C', 14:'15C', 15:'16C', 16:'17C', 17:'18C', 18:'19C', 19:'20C',
  20:'21C', 21:'22C', 22:'23C', 23:'24C' };
const D_FLOOR_KEYS = { 3:'4D', 4:'5D', 5:'6D', 6:'7D', 7:'8D', 8:'9D', 9:'10D' };
function floorKeyFor(floorNum, branch, floorPath){
  if (floorPath === 'C') return C_FLOOR_KEYS[floorNum] || null;
  if (floorPath === 'D') return D_FLOOR_KEYS[floorNum] || null;
  if (floorNum === 8) return branch === 'B' ? '9B' : '9A';
  if (floorNum === 9) return branch === 'B' ? '10B' : '10A';
  if (floorNum === 10) return branch === 'B' ? '11B' : '11A';
  if (floorNum === 11) return branch === 'B' ? '12B' : '12A';

  if (floorNum === 12) return '13';
  if (floorNum === 13) return '14';
  if (floorNum === 14) return '15';
  return null;
}

const BRANCH_PALETTES = {
  A: {
    floorA:'#23242f', floorB:'#282a37', wall:'#15161e', voidC:'#000',
    doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#0c0d12', accent:'#8a8ac9',
  },
  B: {
    floorA:'#3a4c60', floorB:'#425670', wall:'#20303e', voidC:'#000',
    doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#18232d', accent:'#eef0ea',
  },
};

const BRANCH_PALETTES_10 = {
  A: {
    floorA:'#c8dce8', floorB:'#b0ccdc', wall:'#5a7a90', voidC:'#000',
    doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#3a5468', accent:'#eaf6ff',
  },
  B: {
    floorA:'#1e3a24', floorB:'#24462a', wall:'#122a18', voidC:'#000',
    doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#0c1a10', accent:'#7fe08a',
  },
};

const BRANCH_PALETTES_11 = {
  A: {
    floorA:'#141a2e', floorB:'#19203a', wall:'#0b0f1e', voidC:'#000',
    doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#05070f', accent:'#4f7fd8',
  },
  B: {
    floorA:'#0d2a2e', floorB:'#113438', wall:'#06181c', voidC:'#000',
    doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#030d10', accent:'#2fe0c4',
  },
};

const BRANCH_PALETTES_12 = {
  A: {
    floorA:'#1c1030', floorB:'#23143c', wall:'#0f0820', voidC:'#000',
    doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#070312', accent:'#b04ff0',
  },
  B: {
    floorA:'#2a0c1c', floorB:'#341024', wall:'#180410', voidC:'#000',
    doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#0c0208', accent:'#ff3d7a',
  },
};

const C_PALETTES = {
  gutters: {
    floorA:'#3a4038', floorB:'#434a40', wall:'#22271f', voidC:'#000',
    doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#141812', accent:'#8fb8a0',
  },
  sewers: {
    floorA:'#2a3428', floorB:'#31402e', wall:'#161f16', voidC:'#000',
    doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#0a1009', accent:'#b8d44a',
  },
  rainforest: {
    floorA:'#123020', floorB:'#173a26', wall:'#0a1e14', voidC:'#000',
    doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#050f0a', accent:'#4fe08a',
  },

  mangroves: {
    floorA:'#2a2a1e', floorB:'#333424', wall:'#181a12', voidC:'#000',
    doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#0a0b07', accent:'#d8c88a',
  },

  floodedundercity: {
    floorA:'#243038', floorB:'#2c3a42', wall:'#141c22', voidC:'#000',
    doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#0a1216', accent:'#6ab4c9',
  },
  coralboneyard: {
    floorA:'#2e3a3a', floorB:'#354444', wall:'#182020', voidC:'#000',
    doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#0c1414', accent:'#e0a878',
  },
  abyssalvents: {
    floorA:'#241c1a', floorB:'#2c221e', wall:'#140f0d', voidC:'#000',
    doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#0a0706', accent:'#e0703a',
  },
  drownedcathedral: {
    floorA:'#221e2c', floorB:'#282436', wall:'#131019', voidC:'#000',
    doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#08070c', accent:'#a89ad0',
  },
  blackcurrent: {
    floorA:'#0e1420', floorB:'#121826', wall:'#080b12', voidC:'#000',
    doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#050710', accent:'#4a6ac0',
  },
  leviathansmaw: {
    floorA:'#0a0808', floorB:'#100c0c', wall:'#050404', voidC:'#000',
    doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#030202', accent:'#c9382e',
  },
};
function cPaletteFor(floorNum){
  if (floorNum <= 3) return C_PALETTES.gutters;
  if (floorNum <= 5) return C_PALETTES.sewers;
  if (floorNum <= 9) return C_PALETTES.rainforest;
  if (floorNum <= 11) return C_PALETTES.mangroves;

  if (floorNum <= 13) return C_PALETTES.floodedundercity;
  if (floorNum <= 15) return C_PALETTES.coralboneyard;
  if (floorNum <= 17) return C_PALETTES.abyssalvents;
  if (floorNum <= 19) return C_PALETTES.drownedcathedral;
  if (floorNum <= 21) return C_PALETTES.blackcurrent;
  return C_PALETTES.leviathansmaw;
}

const C_MUSIC_TRACKS = {
  gutters:'gutters', sewers:'sewers', rainforest:'rainforest', mangroves:'mangroves',

  floodedundercity:'floodedundercity', coralboneyard:'coralboneyard', abyssalvents:'abyssalvents',
  drownedcathedral:'drownedcathedral', blackcurrent:'blackcurrent', leviathansmaw:'leviathansmaw',
};
function cMusicTrackFor(floorNum){
  if (floorNum <= 3) return C_MUSIC_TRACKS.gutters;
  if (floorNum <= 5) return C_MUSIC_TRACKS.sewers;
  if (floorNum <= 9) return C_MUSIC_TRACKS.rainforest;
  if (floorNum <= 11) return C_MUSIC_TRACKS.mangroves;

  if (floorNum <= 13) return C_MUSIC_TRACKS.floodedundercity;
  if (floorNum <= 15) return C_MUSIC_TRACKS.coralboneyard;
  if (floorNum <= 17) return C_MUSIC_TRACKS.abyssalvents;
  if (floorNum <= 19) return C_MUSIC_TRACKS.drownedcathedral;
  if (floorNum <= 21) return C_MUSIC_TRACKS.blackcurrent;
  return C_MUSIC_TRACKS.leviathansmaw;
}

const D_PALETTES = {
  observatory: {
    floorA:'#2b2733', floorB:'#332e3d', wall:'#1a1722', voidC:'#05060f',
    doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#0d0b13', accent:'#c9b06a',
  },
  orrery: {
    floorA:'#232a44', floorB:'#2a3350', wall:'#141a2e', voidC:'#04050e',
    doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#080b16', accent:'#e0b45a',
  },
  voidbetween: {
    floorA:'#141426', floorB:'#1a1a30', wall:'#0b0b18', voidC:'#02030a',
    doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#030409', accent:'#9ab8ff',
  },
};
function dPaletteFor(floorNum){
  if (floorNum <= 4) return D_PALETTES.observatory;
  if (floorNum <= 6) return D_PALETTES.orrery;
  return D_PALETTES.voidbetween;
}

const D_MUSIC_TRACKS = { observatory:'observatory', orrery:'orrery', voidbetween:'voidbetween' };
function dMusicTrackFor(floorNum){
  if (floorNum <= 4) return D_MUSIC_TRACKS.observatory;
  if (floorNum <= 6) return D_MUSIC_TRACKS.orrery;
  return D_MUSIC_TRACKS.voidbetween;
}

const HOLLOW_CHORUS_PALETTE = {
  floorA:'#16141c', floorB:'#1c1a24', wall:'#0c0a11', voidC:'#000',
  doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#040308', accent:'#6a7fc9',
};
const FINAL_WAVEFORM_PALETTE = {
  floorA:'#1a0e12', floorB:'#211217', wall:'#0e0508', voidC:'#000',
  doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#050203', accent:'#e0604a',
};

const FINAL_PALETTE = {
  floorA:'#0a0a0c', floorB:'#101014', wall:'#050506', voidC:'#000',
  doorOpen:'#4a3320', doorLocked:'#26201a', grout:'#020202', accent:'#ffd447',
};

const PALETTE_FLAVORS = (function(){
  const m = new Map();
  for (const s of STAGES) if (s.flavor) m.set(s.palette, s.flavor);
  const extra = [
    [BRANCH_PALETTES_10.A, 'ice'], [BRANCH_PALETTES_10.B, 'leaf'],
    [BRANCH_PALETTES_11.A, 'void'], [BRANCH_PALETTES_11.B, 'tide'],
    [BRANCH_PALETTES_12.A, 'crystal'], [BRANCH_PALETTES_12.B, 'fire'],
    [C_PALETTES.gutters, 'moss'], [C_PALETTES.sewers, 'slime'],
    [C_PALETTES.rainforest, 'leaf'], [C_PALETTES.mangroves, 'mud'],
    [C_PALETTES.floodedundercity, 'silt'], [C_PALETTES.coralboneyard, 'bone'],
    [C_PALETTES.abyssalvents, 'fire'], [C_PALETTES.drownedcathedral, 'bone'],
    [C_PALETTES.blackcurrent, 'void'], [C_PALETTES.leviathansmaw, 'abyss'],
    [D_PALETTES.observatory, 'crystal'], [D_PALETTES.orrery, 'crystal'],
    [D_PALETTES.voidbetween, 'void'],
    [HOLLOW_CHORUS_PALETTE, 'void'], [FINAL_WAVEFORM_PALETTE, 'fire'],
    [FINAL_PALETTE, 'void'],
  ];
  for (const e of extra) if (e[0]) m.set(e[0], e[1]);
  return m;
})();

function paletteFlavor(pal){ return (pal && PALETTE_FLAVORS.get(pal)) || 'dust'; }

function floorPaletteFor(floorNum, floorPath, floorBranch){
  if (floorPath === 'C') return cPaletteFor(floorNum);
  if (floorPath === 'D') return dPaletteFor(floorNum);
  if (floorNum === 8) return BRANCH_PALETTES[floorBranch === 'B' ? 'B' : 'A'];
  if (floorNum === 9) return BRANCH_PALETTES_10[floorBranch === 'B' ? 'B' : 'A'];
  if (floorNum === 10) return BRANCH_PALETTES_11[floorBranch === 'B' ? 'B' : 'A'];
  if (floorNum === 11) return BRANCH_PALETTES_12[floorBranch === 'B' ? 'B' : 'A'];
  if (floorNum === 12) return HOLLOW_CHORUS_PALETTE;
  if (floorNum === 13) return FINAL_WAVEFORM_PALETTE;
  if (floorNum === 14) return FINAL_PALETTE;
  return STAGES[stageIndexForFloor(floorNum)].palette;
}
