'use strict';

const STAR_TYPES = {
  alcyone: { id:'alcyone', name:'Alcyone', icon:'⭐', color:'#f4d35e', desc:'+3 damage for the rest of this room.' },
  atlas:   { id:'atlas', name:'Atlas', icon:'⭐', color:'#5b9ee3', desc:'+2 blue hearts.' },
  electra: { id:'electra', name:'Electra', icon:'⭐', color:'#7fd66a', desc:'+50% speed for the rest of this room.' },
  maia:    { id:'maia', name:'Maia', icon:'⭐', color:'#e35b6a', desc:'Drops 4 hearts on the ground.' },
  merope:  { id:'merope', name:'Merope', icon:'⭐', color:'#dcdcdc', desc:'Drops 2 keys on the ground.' },
  taygeta: { id:'taygeta', name:'Taygeta', icon:'⭐', color:'#e0895a', desc:'Destroys every destructible object in the room.' },
  pleione: { id:'pleione', name:'Pleione', icon:'⭐', color:'#c9a3ff', desc:'Drops 3 bombs on the ground.' },
  celaeno: { id:'celaeno', name:'Celaeno', icon:'⭐', color:'#b48ce0', desc:'Drops 2 pills on the ground.' },

  antares:  { id:'antares', name:'Antares', icon:'🌟', color:'#c9522e', locked:true, desc:'Deal heavy damage to every enemy in the room — scaled to how deep you are.' },
  polaris:  { id:'polaris', name:'Polaris', icon:'🌟', color:'#9ac9e0', locked:true, desc:'Freeze every enemy in the room.' },
  achernar: { id:'achernar', name:'Achernar', icon:'🌟', color:'#e35b6a', locked:true, desc:'+3 red hearts.' },
  vega:     { id:'vega', name:'Vega', icon:'🌟', color:'#e07a9c', locked:true, desc:'+100% speed for the rest of this room.' },

  deneb:      { id:'deneb', name:'Deneb', icon:'🔄', color:'#8fd0f0', locked:true, desc:'Rerolls one untaken pedestal in this room into something else.' },
  altair:     { id:'altair', name:'Altair', icon:'♻️', color:'#f09a4a', locked:true, desc:'Rerolls every hazard in this room into a different hazard.' },
  capella:    { id:'capella', name:'Capella', icon:'🎲', color:'#d4b03a', locked:true, desc:'Rerolls every enemy in this room into a fresh set.' },
  bellatrix:  { id:'bellatrix', name:'Bellatrix', icon:'👑', color:'#b03a5a', locked:true, desc:'Promotes every enemy in this room to a champion — double health, double damage, better drops.' },
  arcturus:   { id:'arcturus', name:'Arcturus', icon:'🔶', color:'#f0a030', locked:true, desc:'+5 damage for the rest of this room.' },
  aldebaran:  { id:'aldebaran', name:'Aldebaran', icon:'🛡️', color:'#e06a3a', locked:true, desc:'Blocks the next hit you take.' },

  merak:      { id:'merak', name:'Merak', icon:'🔋', color:'#7ac0d0', locked:true, desc:'Fully recharges your active item.' },
  alkaid:     { id:'alkaid', name:'Alkaid', icon:'✨', color:'#c0d8f0', locked:true, desc:'Invincible for 10 seconds.' },
  dubhe:      { id:'dubhe', name:'Dubhe', icon:'⚔️', color:'#f0e07a', locked:true, desc:'+8 damage for the rest of this room.' },
  phecda:     { id:'phecda', name:'Phecda', icon:'🧊', color:'#6ad0e0', locked:true, desc:'Freezes every enemy in the room for 8 seconds.' },
  megrez:     { id:'megrez', name:'Megrez', icon:'🪞', color:'#a0b8d0', locked:true, desc:'Blocks the next 3 hits you take.' },
  mizar:      { id:'mizar', name:'Mizar', icon:'💗', color:'#f07a90', locked:true, desc:'Fully restores your red hearts.' },

  alnitak:    { id:'alnitak', name:'Alnitak', icon:'🗺️', color:'#8a9ae0', locked:true, desc:"Reveals this floor's entire map, secret rooms included." },
  alnilam:    { id:'alnilam', name:'Alnilam', icon:'😱', color:'#6a6ad0', locked:true, desc:'Terrifies every enemy in the room — they flee for 8 seconds.' },
  mintaka:    { id:'mintaka', name:'Mintaka', icon:'💞', color:'#d06ac0', locked:true, desc:'Charms one enemy into fighting for you for 12 seconds.' },
  saiph:      { id:'saiph', name:'Saiph', icon:'💥', color:'#e0c05a', locked:true, desc:'Blasts every enemy in the room away from you.' },
  rigel:      { id:'rigel', name:'Rigel', icon:'☠️', color:'#9ad0f0', locked:true, desc:'Instantly destroys the weakest enemy in the room.' },
  betelgeuse: { id:'betelgeuse', name:'Betelgeuse', icon:'🪙', color:'#e0703a', locked:true, desc:'Drops 6 coins on the ground.' },
  sirius:     { id:'sirius', name:'Sirius', icon:'🌠', color:'#eaf2ff', locked:true, desc:'Sears every enemy in the room and freezes whatever survives.' },

  procyon:    { id:'procyon', name:'Procyon', icon:'❤️', color:'#f0d0a0', locked:true, desc:'+1 heart container, permanently.' },
  castor:     { id:'castor', name:'Castor', icon:'✴️', color:'#d0d0f0', locked:true, desc:'Drops 2 more stars on the ground.' },
  pollux:     { id:'pollux', name:'Pollux', icon:'🏛️', color:'#f0b060', locked:true, desc:'Spawns a free item pedestal in this room.' },
  regulus:    { id:'regulus', name:'Regulus', icon:'🎁', color:'#c0a0e0', locked:true, desc:'Spawns a treasure chest in this room.' },
  spica:      { id:'spica', name:'Spica', icon:'🍀', color:'#5ad08a', locked:true, desc:'+1 Luck for the rest of the run.' },
  antlia:     { id:'antlia', name:'Antlia', icon:'🧰', color:'#a0a8b0', locked:true, desc:'+2 keys and +2 bombs.' },

  teleport_treasure:  { id:'teleport_treasure', name:'Compass — Treasure', icon:'💰', color:'#f0c85a', locked:true, desc:'Teleport straight to the nearest Treasure Room on this floor.' },
  teleport_shop:      { id:'teleport_shop', name:'Compass — Shop', icon:'🛒', color:'#5ad0a8', locked:true, desc:'Teleport straight to the nearest Shop on this floor.' },
  teleport_secret:    { id:'teleport_secret', name:'Compass — Secret', icon:'🗝️', color:'#b0a890', locked:true, desc:'Teleport straight to the nearest Secret Room on this floor.' },
  teleport_petshop:   { id:'teleport_petshop', name:'Compass — Pet Shop', icon:'🐾', color:'#e0a070', locked:true, desc:'Teleport straight to the nearest Pet Shop on this floor.' },
  teleport_curse:     { id:'teleport_curse', name:'Compass — Curse', icon:'💀', color:'#8a6ad0', locked:true, desc:'Teleport straight to the nearest Curse Room on this floor.' },
  teleport_sacrifice: { id:'teleport_sacrifice', name:'Compass — Sacrifice', icon:'🩸', color:'#c0303a', locked:true, desc:'Teleport straight to the nearest Sacrifice Room on this floor.' },
  teleport_vault:     { id:'teleport_vault', name:'Compass — Vault', icon:'🏦', color:'#c9a13a', locked:true, desc:'Teleport straight to the nearest Vault on this floor.' },
  teleport_challenge: { id:'teleport_challenge', name:'Compass — Challenge', icon:'🏟️', color:'#e07a4a', locked:true, desc:'Teleport straight to the nearest Challenge Room on this floor.' },
  teleport_crystal:   { id:'teleport_crystal', name:'Compass — Crystal', icon:'💎', color:'#7fe0e0', locked:true, desc:'Teleport straight to the nearest Crystal Room on this floor.' },
  teleport_sombra:    { id:'teleport_sombra', name:'Compass — Sombra', icon:'🌑', color:'#5a4a70', locked:true, desc:'Teleport straight to the nearest Sombra Room on this floor.' },
  teleport_star:      { id:'teleport_star', name:'Compass — Star', icon:'🌌', color:'#a0b0f0', locked:true, desc:'Teleport straight to the nearest Star Room on this floor.' },

  vindemiatrix: { id:'vindemiatrix', name:'Vindemiatrix', icon:'🐍', color:'#6fa83a', locked:true, desc:'Poisons every enemy in the room for 10 seconds.' },
  zubeneschamali: { id:'zubeneschamali', name:'Zubeneschamali', icon:'🥁', color:'#e0c25a', locked:true, desc:'Stuns every enemy in the room for 5 seconds.' },
  gacrux: { id:'gacrux', name:'Gacrux', icon:'🎯', color:'#8fa8e0', locked:true, desc:'Marks every enemy in the room Vulnerable for 12 seconds — they take 50% more damage.' },
  acrux: { id:'acrux', name:'Acrux', icon:'💞', color:'#d06ac0', locked:true, desc:'Charms every enemy in the room into fighting for you for 10 seconds.' },
  shaula: { id:'shaula', name:'Shaula', icon:'🩸', color:'#c93a5a', locked:true, desc:'Halves the current health of every enemy in the room.' },
  sabik: { id:'sabik', name:'Sabik', icon:'💙', color:'#5b9ee3', locked:true, desc:'+4 blue hearts.' },
  nunki: { id:'nunki', name:'Nunki', icon:'🧰', color:'#a0a8b0', locked:true, desc:'Drops 3 keys and 3 bombs on the ground.' },
  ascella: { id:'ascella', name:'Ascella', icon:'🏛️', color:'#f0b060', locked:true, desc:'Spawns two free item pedestals in this room.' },
  kausaustralis: { id:'kausaustralis', name:'Kaus Australis', icon:'💥', color:'#e0c05a', locked:true, desc:'Blasts every enemy away from you and sears them on the way out.' },
  rasalhague: { id:'rasalhague', name:'Rasalhague', icon:'❄️', color:'#9ac9e0', locked:true, desc:'Freezes every enemy solid for 12 seconds.' },
  alphecca: { id:'alphecca', name:'Alphecca', icon:'🍀', color:'#5ad08a', locked:true, desc:'+2 Luck for the rest of the run.' },
  izar: { id:'izar', name:'Izar', icon:'🔭', color:'#7fd6e0', locked:true, desc:'+2 tiles of attack range for the rest of the run.' },
  mirfak: { id:'mirfak', name:'Mirfak', icon:'🛡️', color:'#b8c4d8', locked:true, desc:'Blocks the next 5 hits you take.' },
  algol: { id:'algol', name:'Algol', icon:'☠️', color:'#8a3ae0', locked:true, desc:'Instantly destroys the STRONGEST regular enemy in the room.' },
  almach: { id:'almach', name:'Almach', icon:'💝', color:'#f0a8c9', locked:true, desc:'Fully restores your red hearts AND tops you up with 2 blue ones.' },
  hamal: { id:'hamal', name:'Hamal', icon:'❤️', color:'#f0d0a0', locked:true, desc:'+2 heart containers, permanently.' },
  menkar: { id:'menkar', name:'Menkar', icon:'💣', color:'#c9522e', locked:true, desc:'Drops 5 bombs and blows every destructible object in the room apart.' },
  diphda: { id:'diphda', name:'Diphda', icon:'🪙', color:'#e3c15b', locked:true, desc:'Drops 12 coins on the ground.' },
  markab: { id:'markab', name:'Markab', icon:'💊', color:'#b48ce0', locked:true, desc:'Drops 4 pills on the ground.' },
  scheat: { id:'scheat', name:'Scheat', icon:'✨', color:'#c0d8f0', locked:true, desc:'Invincible for 20 seconds.' },
  algenib: { id:'algenib', name:'Algenib', icon:'♻️', color:'#f09a4a', locked:true, desc:'Rerolls every untaken pedestal in this room, one after another.' },
  enif: { id:'enif', name:'Enif', icon:'🗺️', color:'#8a9ae0', locked:true, desc:'Reveals the whole floor AND drops 2 keys to open what it finds.' },
  sadalsuud: { id:'sadalsuud', name:'Sadalsuud', icon:'🌠', color:'#eaf2ff', locked:true, desc:'Drops 3 more stars on the ground.' },
  zosma: { id:'zosma', name:'Zosma', icon:'👑', color:'#b03a5a', locked:true, desc:'Promotes every enemy to a champion, then marks them all Vulnerable.' },
  alphard: { id:'alphard', name:'Alphard', icon:'🗡️', color:'#c93a5a', locked:true, desc:'+12 damage for the rest of this room, but you drop to 1 red heart.' },

  sk8s_pyrrha:       { id:'sk8s_pyrrha', name:'Pyrrha', icon:'🔥', color:'#e2653a', locked:true, desc:'+4 damage for the rest of this room.' },
  sk8s_borealis:     { id:'sk8s_borealis', name:'Borealis', icon:'💨', color:'#7fd6c9', locked:true, desc:'+60% speed for the rest of this room.' },
  sk8s_thessaly:     { id:'sk8s_thessaly', name:'Thessaly', icon:'❤️', color:'#e35b6a', locked:true, desc:'+2 red hearts.' },
  sk8s_wren:         { id:'sk8s_wren', name:'Wren', icon:'💙', color:'#5b9ee3', locked:true, desc:'+3 blue hearts.' },
  sk8s_gilded:       { id:'sk8s_gilded', name:'Gilded', icon:'💫', color:'#f0d878', locked:true, desc:'Fully restores your red hearts AND your blue hearts.' },
  sk8s_cinder:       { id:'sk8s_cinder', name:'Cinder', icon:'☄️', color:'#d0532e', locked:true, desc:'Deal moderate damage to every enemy in the room — scaled to how deep you are.' },
  sk8s_frostbind:    { id:'sk8s_frostbind', name:'Frostbind', icon:'🧊', color:'#6ad0e0', locked:true, desc:'Freezes every enemy in the room for 6 seconds.' },
  sk8s_thornveil:    { id:'sk8s_thornveil', name:'Thornveil', icon:'🛡️', color:'#7aa86a', locked:true, desc:'Blocks the next 2 hits you take.' },
  sk8s_aegis:        { id:'sk8s_aegis', name:'Aegis', icon:'✨', color:'#c0d8f0', locked:true, desc:'Invincible for 15 seconds.' },
  sk8s_venomkiss:    { id:'sk8s_venomkiss', name:'Venomkiss', icon:'🐍', color:'#6fa83a', locked:true, desc:'Poisons every enemy in the room for 8 seconds.' },
  sk8s_dreadhowl:    { id:'sk8s_dreadhowl', name:'Dreadhowl', icon:'😱', color:'#6a6ad0', locked:true, desc:'Terrifies every enemy in the room — they flee for 6 seconds.' },
  sk8s_puppeteer:    { id:'sk8s_puppeteer', name:'Puppeteer', icon:'🎭', color:'#d06ac0', locked:true, desc:'Charms the strongest enemy in the room into fighting for you for 14 seconds.' },
  sk8s_direstrike:   { id:'sk8s_direstrike', name:'Direstrike', icon:'⚔️', color:'#8a3ae0', locked:true, desc:'Deals damage equal to 75% of the strongest enemy\'s current health.' },
  sk8s_gale:         { id:'sk8s_gale', name:'Gale', icon:'💥', color:'#e0c05a', locked:true, desc:'Blasts every enemy in the room away from you.' },
  sk8s_fortune:      { id:'sk8s_fortune', name:'Fortune', icon:'🍀', color:'#5ad08a', locked:true, desc:'+1 Luck for the rest of the run.' },
  sk8s_farsight:     { id:'sk8s_farsight', name:'Farsight', icon:'🔭', color:'#7fd6e0', locked:true, desc:'+1 tile of attack range for the rest of the run.' },
  sk8s_battery:      { id:'sk8s_battery', name:'Battery', icon:'🔋', color:'#7ac0d0', locked:true, desc:'Fully recharges your active item.' },
  sk8s_cartographer: { id:'sk8s_cartographer', name:'Cartographer', icon:'🗺️', color:'#8a9ae0', locked:true, desc:"Reveals this floor's entire map, secret rooms included." },
  sk8s_demolition:   { id:'sk8s_demolition', name:'Demolition', icon:'💣', color:'#c9522e', locked:true, desc:'Destroys every destructible object in the room.' },
  sk8s_prospector:   { id:'sk8s_prospector', name:'Prospector', icon:'🪙', color:'#e3c15b', locked:true, desc:'Drops 5 coins on the ground.' },
  sk8s_medic:        { id:'sk8s_medic', name:'Medic', icon:'💗', color:'#f07a90', locked:true, desc:'Drops 3 hearts on the ground.' },
  sk8s_quartermaster:{ id:'sk8s_quartermaster', name:'Quartermaster', icon:'🧰', color:'#a0a8b0', locked:true, desc:'Drops 2 keys and 2 bombs on the ground.' },
  sk8s_alchemist:    { id:'sk8s_alchemist', name:'Alchemist', icon:'💊', color:'#b48ce0', locked:true, desc:'Drops 3 pills on the ground.' },
  sk8s_pyroclast:    { id:'sk8s_pyroclast', name:'Pyroclast', icon:'🧨', color:'#e0895a', locked:true, desc:'Drops 4 bombs on the ground.' },
  sk8s_shrine:       { id:'sk8s_shrine', name:'Shrine', icon:'🏛️', color:'#f0b060', locked:true, desc:'Spawns a free item pedestal in this room.' },

  canopus:     { id:'canopus', name:'Canopus', icon:'💥', color:'#e0895a', locked:true, desc:'Destroys every destructible object in the room and drops 6 bombs.' },
  achird:      { id:'achird', name:'Achird', icon:'🪙', color:'#e3c15b', locked:true, desc:'Drops 15 coins on the ground.' },
  alderamin:   { id:'alderamin', name:'Alderamin', icon:'🗝️', color:'#b08d57', locked:true, desc:'Two chests, freshly rolled, appear in this room.' },
  kochab:      { id:'kochab', name:'Kochab', icon:'🖤', color:'#4a4460', locked:true, desc:'Blocks the next 4 hits you take.' },
  errai:       { id:'errai', name:'Errai', icon:'💠', color:'#6fd6e8', locked:true, desc:'+3 tiles of attack range for the rest of the run.' },
  thuban:      { id:'thuban', name:'Thuban', icon:'🐉', color:'#3f6b4a', locked:true, desc:'+3 heart containers, permanently.' },
  miaplacidus: { id:'miaplacidus', name:'Miaplacidus', icon:'☠️', color:'#5c2a4d', locked:true, desc:'Poisons every enemy in the room for 14 seconds.' },
  avior:       { id:'avior', name:'Avior', icon:'🗡️', color:'#8a1f2d', locked:true, desc:'+15 damage for the rest of this room, but you drop to 1 red heart.' },
  naos:        { id:'naos', name:'Naos', icon:'💣', color:'#a63d2f', locked:true, desc:'Drops 7 bombs on the ground.' },
  wezen:       { id:'wezen', name:'Wezen', icon:'🔁', color:'#6a8caf', locked:true, desc:'Rerolls every hazard in this room and drops 2 bombs.' },
  adhara:      { id:'adhara', name:'Adhara', icon:'💞', color:'#d97878', locked:true, desc:'Charms the two strongest enemies in the room for 12 seconds.' },
  ankaa:       { id:'ankaa', name:'Ankaa', icon:'🔥', color:'#e0663d', locked:true, desc:'Terrifies every enemy in the room for 10 seconds.' },
  peacock:     { id:'peacock', name:'Peacock', icon:'🦚', color:'#2f8f8a', locked:true, desc:'A free item pedestal appears, plus 2 keys.' },
  hadar:       { id:'hadar', name:'Hadar', icon:'❄️', color:'#7fb2d9', locked:true, desc:'Freezes every enemy in the room for 15 seconds.' },
  rigilkent:   { id:'rigilkent', name:'Rigil Kentaurus', icon:'💜', color:'#d989c0', locked:true, desc:'Charms every enemy in the room for 10 seconds.' },
  menkalinan:  { id:'menkalinan', name:'Menkalinan', icon:'😵', color:'#7a8c3f', locked:true, desc:'Stuns every enemy in the room for 7 seconds.' },
  alhena:      { id:'alhena', name:'Alhena', icon:'🎯', color:'#c94f4f', locked:true, desc:'Marks every enemy in the room Vulnerable for 18 seconds.' },
  elnath:      { id:'elnath', name:'Elnath', icon:'🏹', color:'#4f8ac9', locked:true, desc:'Executes the two weakest enemies in the room.' },
  mirach:      { id:'mirach', name:'Mirach', icon:'👑', color:'#9b59b6', locked:true, desc:'Promotes every enemy in this room to a champion, then blasts them all away from you.' },
  sargas:      { id:'sargas', name:'Sargas', icon:'💗', color:'#8c3a3a', locked:true, desc:'Fully restores your red hearts and blocks the next 2 hits you take.' },

  algorab:    { id:'algorab', name:'Algorab', icon:'⚔️', color:'#c9622e', locked:true, desc:'+6 damage for the rest of this room.' },
  gienah:     { id:'gienah', name:'Gienah', icon:'💨', color:'#6ad0b0', locked:true, desc:'+70% speed for the rest of this room.' },
  kraz:       { id:'kraz', name:'Kraz', icon:'💗', color:'#5b9ee3', locked:true, desc:'+3 blue hearts.' },
  minkar:     { id:'minkar', name:'Minkar', icon:'❤️', color:'#e35b6a', locked:true, desc:'Fully restores your red hearts.' },
  zaurak:     { id:'zaurak', name:'Zaurak', icon:'🛡️', color:'#8a97a8', locked:true, desc:'Blocks the next 3 hits you take.' },
  cursa:      { id:'cursa', name:'Cursa', icon:'✨', color:'#c0d8f0', locked:true, desc:'Invincible for 12 seconds.' },
  tejat:      { id:'tejat', name:'Tejat', icon:'❤️', color:'#f0d0a0', locked:true, desc:'+1 heart container, permanently.' },
  mebsuta:    { id:'mebsuta', name:'Mebsuta', icon:'🍀', color:'#5ad08a', locked:true, desc:'+1 Luck for the rest of the run.' },
  alzirr:     { id:'alzirr', name:'Alzirr', icon:'🔭', color:'#7fd6e0', locked:true, desc:'+2 tiles of attack range for the rest of the run.' },
  propus:     { id:'propus', name:'Propus', icon:'☠️', color:'#6fa83a', locked:true, desc:'Poisons every enemy in the room for 12 seconds.' },
  muscida:    { id:'muscida', name:'Muscida', icon:'😱', color:'#6a6ad0', locked:true, desc:'Terrifies every enemy in the room — they flee for 9 seconds.' },
  talitha:    { id:'talitha', name:'Talitha', icon:'😵', color:'#e0c25a', locked:true, desc:'Stuns every enemy in the room for 6 seconds.' },
  yildun:     { id:'yildun', name:'Yildun', icon:'🎯', color:'#8fa8e0', locked:true, desc:'Marks every enemy in the room Vulnerable for 15 seconds.' },
  pherkad:    { id:'pherkad', name:'Pherkad', icon:'💞', color:'#d06ac0', locked:true, desc:'Charms every enemy in the room for 9 seconds.' },
  chara:      { id:'chara', name:'Chara', icon:'❄️', color:'#9ac9e0', locked:true, desc:'Freezes every enemy in the room for 10 seconds.' },
  denebola:   { id:'denebola', name:'Denebola', icon:'💥', color:'#d0532e', locked:true, desc:'Deal moderate damage to every enemy in the room — scaled to how deep you are.' },
  seginus:    { id:'seginus', name:'Seginus', icon:'☠️', color:'#5c2a4d', locked:true, desc:'Instantly destroys the weakest enemy in the room.' },
  nekkar:     { id:'nekkar', name:'Nekkar', icon:'🗡️', color:'#8a1f2d', locked:true, desc:'+10 damage for the rest of this room, but you drop to 1 red heart.' },
  sadalmelik: { id:'sadalmelik', name:'Sadalmelik', icon:'🪙', color:'#e3c15b', locked:true, desc:'Drops 10 coins on the ground.' },
  dabih:      { id:'dabih', name:'Dabih', icon:'🧰', color:'#a0a8b0', locked:true, desc:'+3 keys and +3 bombs.' },
};
const STAR_LIST = Object.values(STAR_TYPES);

const BOMB_TIER_POOL = [
  { id:'bomb', w:90 },
  { id:'doublebomb', w:8, locked:true },
  { id:'goldbomb', w:2, locked:true },
];
const KEY_TIER_POOL = [
  { id:'key', w:90 },
  { id:'doublekey', w:8, locked:true },
  { id:'goldkey', w:2, locked:true },
];

const OBSTACLES = {
  rock:         { id:'rock', weight:10, name:'Rock', desc:'Bombable rubble. Blocks the ground but flies over it.', destructible:true, color:'#7a746a', dark:'#524d46' },
  hardrock:     { id:'hardrock', weight:10, name:'Hard Rock', desc:'Permanent, indestructible rubble. Flyable.', destructible:false, color:'#4a4640', dark:'#2c2924' },
  pit:          { id:'pit', weight:10, name:'Pitfall', desc:'A bottomless gap — blocks the ground, but flyers pass right over it.', isPit:true, color:'#0c0c14', dark:'#000' },

  tallrock:     { id:'tallrock', weight:10, name:'Tall Rock', desc:'Bombable rubble tall enough to block flight too.', destructible:true, blocksFlight:true, tall:true, color:'#847e70', dark:'#524d46' },
  tallhardrock: { id:'tallhardrock', weight:10, name:'Tall Hard Rock', desc:'Permanent rubble tall enough to block flight too.', destructible:false, blocksFlight:true, tall:true, color:'#3d392f', dark:'#232019' },

  cactus:       { id:'cactus', weight:4, floorRules:[{ minFloor:4, maxFloor:5, pathExclude:'C' }], name:'Cactus', desc:'Non-solid hazard — hurts on contact, otherwise walk right through.', hazard:true, dmg:1, color:'#4f8a3f', dark:'#2c5222' },
  yellowfire:   { id:'yellowfire', weight:4, name:'Yellow Fire', desc:'Hazard flame — 3 hits douses it, with a small chance to drop a heart.', hazard:true, attackable:true, maxHp:3, dmg:1, heartDropChance:0.10, color:'#f0c23a', dark:'#a86a1a' },
  redfire:      { id:'redfire', weight:4, name:'Red Fire', desc:'Hazard flame that also spits fireballs — 3 hits douses it.', hazard:true, attackable:true, maxHp:3, dmg:1, heartDropChance:0.10,
                  projectile:true, fireCooldown:10, color:'#e0492f', dark:'#8a2318' },

  bluefire:     { id:'bluefire', weight:4, name:'Blue Fire', desc:'Hazard flame that spits bolts. Attacks do nothing — only a bomb blast puts it out.', hazard:true, attackable:false, destructible:true, dmg:1, heartDropChance:0.10,
                  projectile:true, fireCooldown:10, boltColor:'#6aa8f0', color:'#4a7fd6', dark:'#254a80' },

  purplefire:   { id:'purplefire', weight:4, name:'Purple Fire', desc:'Hazard flame whose bolts curve after you. Attacks do nothing — only a bomb blast puts it out.', hazard:true, attackable:false, destructible:true, dmg:1, heartDropChance:0.10,
                  projectile:true, fireCooldown:20, homing:2, boltColor:'#c98af0', color:'#a34fd6', dark:'#4f2570' },

  greenfire:    { id:'greenfire', weight:1.5, name:'Green Fire', desc:'Hazard flame that fires a 3-bolt fan instead of a single shot — 3 hits douses it.',
                  hazard:true, attackable:true, maxHp:3, dmg:1, heartDropChance:0.10,
                  projectile:true, fireCooldown:10, spreadShots:3, spreadAngle:0.5, boltColor:'#6ad65a', color:'#3a9a3a', dark:'#1c5c1c' },

  whitefire:    { id:'whitefire', weight:4, name:'White Fire', desc:'Hazard flame whose bolt detonates into a small blast when it burns out. Attacks do nothing — only a bomb blast puts it out.',
                  hazard:true, attackable:false, destructible:true, dmg:1, heartDropChance:0.10,
                  projectile:true, fireCooldown:14, explosiveBolt:true, boltColor:'#f0ece0', color:'#d8d0b8', dark:'#8a8268' },

  blackfire:    { id:'blackfire', weight:4, name:'Black Fire', desc:'Hazard flame that never aims — it just spins, leaking one bolt per tick around a full circle. Attacks do nothing — only a bomb blast puts it out.',
                  hazard:true, attackable:false, destructible:true, dmg:1, heartDropChance:0.10,
                  projectile:true, fireCooldown:0.4, spin:true, boltColor:'#8a3ac9', color:'#3a1c52', dark:'#160a24' },

  spike:        { id:'spike', weight:0, name:'Sacrifice Spike', desc:'Sacrifice Room centerpiece — a full heart per hit, but pays out rewards as you feed it.', hazard:true, sacrifice:true, color:'#c9c2b0', dark:'#5c574a' },

  spiketrap:    { id:'spiketrap', weight:10, name:'Spike Trap', desc:'A plain hazard spike — hurts twice as much as a cactus, no reward.', hazard:true, dmg:2, color:'#c9c2b0', dark:'#5c574a' },

  spikedrock:   { id:'spikedrock', weight:10, name:'Spiked Rock', desc:'Solid AND a hazard — blocks the ground and hurts on contact. Bombable.', hazard:true, dmg:2, solid:true, destructible:true, color:'#8a7d70', dark:'#4a4038' },

  tintedrock:   { id:'tintedrock', weight:0.2, name:'Tinted Rock', desc:'A rare rock reskin — a much better reward table when bombed.', destructible:true, color:'#9a7dc9', dark:'#5c3d8a' },

  thornbush:    { id:'thornbush', weight:4, floorRules:[{ minFloor:2, maxFloor:3, pathExclude:'C' }], name:'Thorn Bush', desc:'Hazard bramble — hurts on contact. Attacks do nothing, only a bomb blast clears it.', hazard:true, attackable:false, destructible:true, dmg:1, heartDropChance:0.10, color:'#3a6b2e', dark:'#1c3a16' },

  luckcrystal:  { id:'luckcrystal', weight:0.2, name:'Luck Crystal', desc:'A crystalline rock formation — a small luck-flavored bonus when bombed.', destructible:true, color:'#7fe0a0', dark:'#3a8a5c' },

  movingspike:  { id:'movingspike', weight:10, name:'Moving Spike', desc:'Patrols the perimeter of the wall or rock patch it starts beside.', hazard:true, dmg:2, moving:true, color:'#c96a5a', dark:'#6a2e24' },

  sandtrap:     { id:'sandtrap', weight:4, floorRules:[{ minFloor:4, maxFloor:5, pathExclude:'C' }], name:'Sand Trap', desc:'Freezes you in place briefly on contact — no damage.', freeze:true, freezeDuration:0.5, walkable:true, color:'#d9c47a', dark:'#a8894a' },

  mud:          { id:'mud', weight:4, floorRules:[{ minFloor:2, maxFloor:3, pathExclude:'C' }, { minFloor:4, maxFloor:5, path:'C' }], name:'Mud', desc:'Halves your speed while you stand on it — otherwise harmless.', walkable:true, color:'#5c4a2e', dark:'#3a2e1c' },

  currentn:     { id:'currentn', weight:4, floorRules:[{ path:'C' }], name:'Current — North', desc:'A rushing current — pushes you north while you stand in it.', walkable:true, current:true, pushX:0, pushY:-1, color:'#4fa8d6', dark:'#25597a' },
  currents:     { id:'currents', weight:4, floorRules:[{ path:'C' }], name:'Current — South', desc:'A rushing current — pushes you south while you stand in it.', walkable:true, current:true, pushX:0, pushY:1, color:'#4fa8d6', dark:'#25597a' },
  currente:     { id:'currente', weight:4, floorRules:[{ path:'C' }], name:'Current — East', desc:'A rushing current — pushes you east while you stand in it.', walkable:true, current:true, pushX:1, pushY:0, color:'#4fa8d6', dark:'#25597a' },
  currentw:     { id:'currentw', weight:4, floorRules:[{ path:'C' }], name:'Current — West', desc:'A rushing current — pushes you west while you stand in it.', walkable:true, current:true, pushX:-1, pushY:0, color:'#4fa8d6', dark:'#25597a' },

  floorswitch:  { id:'floorswitch', weight:0, name:'???', desc:'Placeholder — the stage-specific special objects land in a future content phase.', walkable:true, pushX:0, pushY:0, color:'#6a6a7a', dark:'#3a3a46' },

  iceslidan:    { id:'iceslidan', weight:4, floorRules:[{ minFloor:15, maxFloor:16 }], name:'Ice Slide — North', desc:'Polished glacier glass. Skates you north for as long as you are standing on it.', walkable:true, current:true, pushX:0, pushY:-1.25, color:'#bfe4f7', dark:'#4a7a92' },
  iceslidas:    { id:'iceslidas', weight:4, floorRules:[{ minFloor:15, maxFloor:16 }], name:'Ice Slide — South', desc:'Polished glacier glass. Skates you south for as long as you are standing on it.', walkable:true, current:true, pushX:0, pushY:1.25, color:'#bfe4f7', dark:'#4a7a92' },
  iceslidae:    { id:'iceslidae', weight:4, floorRules:[{ minFloor:15, maxFloor:16 }], name:'Ice Slide — East', desc:'Polished glacier glass. Skates you east for as long as you are standing on it.', walkable:true, current:true, pushX:1.25, pushY:0, color:'#bfe4f7', dark:'#4a7a92' },
  iceslidaw:    { id:'iceslidaw', weight:4, floorRules:[{ minFloor:15, maxFloor:16 }], name:'Ice Slide — West', desc:'Polished glacier glass. Skates you west for as long as you are standing on it.', walkable:true, current:true, pushX:-1.25, pushY:0, color:'#bfe4f7', dark:'#4a7a92' },
  quicksand:    { id:'quicksand', weight:4, floorRules:[{ minFloor:17, maxFloor:18 }], name:'Quicksand', desc:'Badlands sink-sand — grabs and holds you for a moment. No damage, but you are not going anywhere while it has you.', freeze:true, freezeDuration:0.85, walkable:true, color:'#c2a663', dark:'#6e5a2c' },
  dustvent:     { id:'dustvent', weight:4, floorRules:[{ minFloor:18, maxFloor:18 }], name:'Dust Vent', desc:'A canyon fissure venting grit on all four diagonals. Walk straight through it if you like — the grit still lands.', projectile:true, fireCooldown:1.8, dmg:1, angles:[Math.PI / 4, 3 * Math.PI / 4, -3 * Math.PI / 4, -Math.PI / 4], boltColor:'#e0c089', walkable:true, color:'#b09060', dark:'#5e4a28' },
  tidesurgee:   { id:'tidesurgee', weight:4, floorRules:[{ minFloor:19, maxFloor:20 }], name:'Tide Surge — East', desc:'A rip channel running east. Far stronger than a sewer current — crossing it costs you ground.', walkable:true, current:true, pushX:1.6, pushY:0, color:'#4fc8e0', dark:'#1e6c80' },
  tidesurgew:   { id:'tidesurgew', weight:4, floorRules:[{ minFloor:19, maxFloor:20 }], name:'Tide Surge — West', desc:'A rip channel running west. Far stronger than a sewer current — crossing it costs you ground.', walkable:true, current:true, pushX:-1.6, pushY:0, color:'#4fc8e0', dark:'#1e6c80' },
  tidepool:     { id:'tidepool', weight:4, floorRules:[{ minFloor:19, maxFloor:20 }], name:'Tide Pool', desc:'Ankle-deep undertow. Grabs briefly on contact — shorter than quicksand, and always somewhere you needed to keep moving.', freeze:true, freezeDuration:0.45, walkable:true, color:'#6fd0e0', dark:'#2c6470' },

  riptiden:      { id:'riptiden', weight:4, floorRules:[{ minFloor:21, maxFloor:22 }], name:'Riptide — North', desc:'Open-ocean riptide running north. The strongest water in the game — you do not cross this one, you go with it.', walkable:true, current:true, pushX:0, pushY:-1.9, color:'#3d9ad6', dark:'#154a70' },
  riptides:      { id:'riptides', weight:4, floorRules:[{ minFloor:21, maxFloor:22 }], name:'Riptide — South', desc:'Open-ocean riptide running south. The strongest water in the game — you do not cross this one, you go with it.', walkable:true, current:true, pushX:0, pushY:1.9, color:'#3d9ad6', dark:'#154a70' },
  riptidee:      { id:'riptidee', weight:4, floorRules:[{ minFloor:21, maxFloor:22 }], name:'Riptide — East', desc:'Open-ocean riptide running east. The strongest water in the game — you do not cross this one, you go with it.', walkable:true, current:true, pushX:1.9, pushY:0, color:'#3d9ad6', dark:'#154a70' },
  riptidew:      { id:'riptidew', weight:4, floorRules:[{ minFloor:21, maxFloor:22 }], name:'Riptide — West', desc:'Open-ocean riptide running west. The strongest water in the game — you do not cross this one, you go with it.', walkable:true, current:true, pushX:-1.9, pushY:0, color:'#3d9ad6', dark:'#154a70' },
  glowbloom:     { id:'glowbloom', weight:4, floorRules:[{ minFloor:23, maxFloor:24 }], name:'Glow Bloom', desc:'A bed of bioluminescent polyps. Walk through it and it burns — attacks do nothing to it, only a bomb blast clears a patch.', hazard:true, attackable:false, destructible:true, dmg:2, heartDropChance:0.08, color:'#7ae0c0', dark:'#1e5a48' },
  pressurecolumn:{ id:'pressurecolumn', weight:4, floorRules:[{ minFloor:25, maxFloor:26 }], name:'Pressure Column', desc:'A standing column of compressed trench water. Solid as rock and it crushes on contact — every wall down here is also a wound. Bombable.', hazard:true, solid:true, destructible:true, dmg:2, color:'#2a4a62', dark:'#101f2c' },

  crushvent:    { id:'crushvent', weight:1.5, floorRules:[{ minFloor:27, maxFloor:28 }], name:'Crush Vent', desc:'A black smoker venting on all eight bearings. It does not need you to touch it — standing anywhere near it is the mistake.', projectile:true, fireCooldown:2.2, dmg:2, angles:[0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, -3 * Math.PI / 4, -Math.PI / 2, -Math.PI / 4], boltColor:'#3f7fc0', destructible:false, color:'#1c3c5c', dark:'#0a1826' },
  lurehorn:     { id:'lurehorn', weight:1.5, floorRules:[{ minFloor:29, maxFloor:30 }, { minFloor:18, maxFloor:18 }], name:'Lure Horn', desc:'Something in the dark is aiming this. One slow bolt every few seconds, and it curves after you the whole way.', projectile:true, fireCooldown:4.5, dmg:2, targeting:true, homing:2.2, boltColor:'#8aa0b8', destructible:false, color:'#1a1c24', dark:'#0a0b0f' },
  phantomwall:  { id:'phantomwall', weight:1.5, floorRules:[{ minFloor:31, maxFloor:32 }], name:'Phantom Wall', desc:'Indistinguishable from solid rock, and not there. Walk through it — everything else in the room can too.', walkable:true, tall:true, color:'#3d392f', dark:'#232019' },
  warpstreamn:  { id:'warpstreamn', weight:1.5, floorRules:[{ minFloor:33, maxFloor:34 }], name:'Warp Stream — North', desc:'A fold in space running north. Nothing in the game pulls harder — you do not walk across this, you arrive on the far side of it.', walkable:true, current:true, pushX:0, pushY:-2.4, color:'#ff4fd8', dark:'#6a1c5a' },
  warpstreams:  { id:'warpstreams', weight:1.5, floorRules:[{ minFloor:33, maxFloor:34 }], name:'Warp Stream — South', desc:'A fold in space running south. Nothing in the game pulls harder — you do not walk across this, you arrive on the far side of it.', walkable:true, current:true, pushX:0, pushY:2.4, color:'#ff4fd8', dark:'#6a1c5a' },
  warpstreame:  { id:'warpstreame', weight:1.5, floorRules:[{ minFloor:33, maxFloor:34 }], name:'Warp Stream — East', desc:'A fold in space running east. Nothing in the game pulls harder — you do not walk across this, you arrive on the far side of it.', walkable:true, current:true, pushX:2.4, pushY:0, color:'#ff4fd8', dark:'#6a1c5a' },
  warpstreamw:  { id:'warpstreamw', weight:1.5, floorRules:[{ minFloor:33, maxFloor:34 }], name:'Warp Stream — West', desc:'A fold in space running west. Nothing in the game pulls harder — you do not walk across this, you arrive on the far side of it.', walkable:true, current:true, pushX:-2.4, pushY:0, color:'#ff4fd8', dark:'#6a1c5a' },

  boneshard:    { id:'boneshard', weight:4, floorRules:[{ minFloor:0, maxFloor:1 }], name:'Bone Shard', desc:'A splintered ossuary fragment jutting from the floor. Cuts on contact — two hits clears it.', hazard:true, attackable:true, maxHp:2, dmg:1, heartDropChance:0.08, color:'#c9c2a8', dark:'#7a7358' },
  graveslick:   { id:'graveslick', weight:4, floorRules:[{ minFloor:0, maxFloor:1 }], name:'Grave Slick', desc:'A slick of ossuary damp. Footing goes out from under you for a moment — no damage.', freeze:true, freezeDuration:0.5, walkable:true, color:'#4a4740', dark:'#26241f' },
  brambletangle:{ id:'brambletangle', weight:4, floorRules:[{ minFloor:2, maxFloor:3, pathExclude:'C' }], name:'Bramble Tangle', desc:'A snarl of thorned undergrowth. Attacks do nothing, only a bomb blast clears it.', hazard:true, attackable:false, destructible:true, dmg:1, heartDropChance:0.10, color:'#2e5a24', dark:'#173a12' },
  pollenpuff:   { id:'pollenpuff', weight:4, floorRules:[{ minFloor:2, maxFloor:3, pathExclude:'C' }], name:'Pollen Puff', freeze:true, freezeDuration:0.55, walkable:true, desc:'A drifting cloud of forest pollen. Breathing it in slows you for a moment — no damage.', color:'#c9d97a', dark:'#8a9a48' },
  duneslip:     { id:'duneslip', weight:4, floorRules:[{ minFloor:4, maxFloor:5, pathExclude:'C' }], name:'Dune Slip', desc:'A shifting slope of loose sand. Grabs your footing briefly — no damage.', freeze:true, freezeDuration:0.5, walkable:true, color:'#e0c67a', dark:'#a8894a' },
  mirageheat:   { id:'mirageheat', weight:4, floorRules:[{ minFloor:4, maxFloor:5, pathExclude:'C' }], name:'Mirage Heat', desc:'A shimmer of rising desert heat. Pushes you gently east while you stand in it.', walkable:true, current:true, pushX:0.9, pushY:0, color:'#f0d89a', dark:'#a8863c' },
  ashfall:      { id:'ashfall', weight:4, floorRules:[{ minFloor:6, maxFloor:7, pathExclude:'C' }], name:'Ashfall', desc:'A drift of still-hot cinders. Two hits clears it.', hazard:true, attackable:true, maxHp:2, dmg:1, heartDropChance:0.08, color:'#8a6a3a', dark:'#4a3218' },
  cinderdraft:  { id:'cinderdraft', weight:4, floorRules:[{ minFloor:6, maxFloor:7, pathExclude:'C' }], name:'Cinder Draft', desc:'A column of superheated updraft. Pushes you north while you stand in it.', walkable:true, current:true, pushX:0, pushY:-1.1, color:'#e0834a', dark:'#7a3c18' },
  echostatic:   { id:'echostatic', weight:4, floorRules:[{ minFloor:8, maxFloor:11, pathExclude:'C' }], name:'Echo Static', desc:'A pocket of dead signal. Grabs your footing briefly — no damage.', freeze:true, freezeDuration:0.5, walkable:true, color:'#8a8ac9', dark:'#4a4a7a' },
  signalrot:    { id:'signalrot', weight:4, floorRules:[{ minFloor:12, maxFloor:14, pathExclude:'C' }], name:'Signal Rot', desc:'Corrupted broadcast matter, thick on the floor. Attacks do nothing, only a bomb blast clears it.', hazard:true, attackable:false, destructible:true, dmg:1, heartDropChance:0.08, color:'#5a5a8a', dark:'#2c2c4a' },
  nullpulse:    { id:'nullpulse', weight:4, floorRules:[{ minFloor:8, maxFloor:14, pathExclude:'C' }], name:'Null Pulse', desc:'A steady wave of dead-air pressure. Pushes you east while you stand in it.', walkable:true, current:true, pushX:1.0, pushY:0, color:'#6a6ab0', dark:'#33335a' },
  rimecrust:    { id:'rimecrust', weight:4, floorRules:[{ minFloor:15, maxFloor:16 }], name:'Rime Crust', desc:'A crust of brittle hoarfrost. Grabs your footing briefly — no damage.', freeze:true, freezeDuration:0.6, walkable:true, color:'#d8eef7', dark:'#7fa8c0' },
  frostbite:    { id:'frostbite', weight:4, floorRules:[{ minFloor:15, maxFloor:16 }], name:'Frostbite Patch', desc:'Skin-blackening cold seeping up from the ice. Two hits clears it.', hazard:true, attackable:true, maxHp:2, dmg:1, heartDropChance:0.08, color:'#a8d8f0', dark:'#4a7a92' },
  rustspur:     { id:'rustspur', weight:4, floorRules:[{ minFloor:17, maxFloor:18 }], name:'Rust Spur', desc:'A jagged shard of oxidized scrap. Attacks do nothing, only a bomb blast clears it.', hazard:true, attackable:false, destructible:true, dmg:1, heartDropChance:0.10, color:'#b0662e', dark:'#5c3316' },
  grittide:     { id:'grittide', weight:4, floorRules:[{ minFloor:17, maxFloor:18 }], name:'Grit Tide', desc:'A rolling sheet of wind-driven rust dust. Pushes you east while you stand in it.', walkable:true, current:true, pushX:1.1, pushY:0, color:'#c98a4a', dark:'#6e4622' },
  shellspike:   { id:'shellspike', weight:4, floorRules:[{ minFloor:19, maxFloor:20 }], name:'Shell Spike', desc:'A broken spire of bleached shell. Two hits clears it.', hazard:true, attackable:true, maxHp:2, dmg:1, heartDropChance:0.08, color:'#e8d8b8', dark:'#a8926a' },
  undertow:     { id:'undertow', weight:4, floorRules:[{ minFloor:19, maxFloor:20 }], name:'Undertow', desc:'A shoreline pull dragging back toward the water. Pushes you south while you stand in it.', walkable:true, current:true, pushX:0, pushY:1.3, color:'#6fc0d0', dark:'#2c6a76' },
  saltspray:    { id:'saltspray', weight:4, floorRules:[{ minFloor:21, maxFloor:22 }], name:'Salt Spray', desc:'A stinging haze of wind-flung brine. Grabs your footing briefly — no damage.', freeze:true, freezeDuration:0.5, walkable:true, color:'#a8d8e0', dark:'#4a828e' },
  ripcurrent:   { id:'ripcurrent', weight:4, floorRules:[{ minFloor:21, maxFloor:22 }], name:'Rip Current', desc:'Open water pulling hard toward deeper sea. Pushes you east while you stand in it.', walkable:true, current:true, pushX:1.8, pushY:0, color:'#4a9ad6', dark:'#1c4e70' },
  siltcloud:    { id:'siltcloud', weight:4, floorRules:[{ minFloor:23, maxFloor:24 }], name:'Silt Cloud', desc:'A billow of stirred sea-floor sediment. Grabs your footing briefly — no damage.', freeze:true, freezeDuration:0.5, walkable:true, color:'#7a8a6a', dark:'#3a4632' },
  wreckrust:    { id:'wreckrust', weight:4, floorRules:[{ minFloor:23, maxFloor:24 }], name:'Wreck Rust', desc:'Corroded hull plating, sharp at every edge. Attacks do nothing, only a bomb blast clears it.', hazard:true, attackable:false, destructible:true, dmg:2, heartDropChance:0.08, color:'#5a6a58', dark:'#2a342a' },
  coldseep:     { id:'coldseep', weight:4, floorRules:[{ minFloor:25, maxFloor:26 }], name:'Cold Seep', desc:'A trench-bottom vent leaking near-freezing brine. Grabs your footing briefly — no damage.', freeze:true, freezeDuration:0.6, walkable:true, color:'#2c4a62', dark:'#101f2c' },
  pressureveil: { id:'pressureveil', weight:4, floorRules:[{ minFloor:25, maxFloor:26 }], name:'Pressure Veil', desc:'A standing sheet of crushing depth-pressure. Attacks do nothing, only a bomb blast clears it.', hazard:true, attackable:false, destructible:true, dmg:2, heartDropChance:0.06, color:'#1c3a52', dark:'#0a1622' },
  smokervent:   { id:'smokervent', weight:4, floorRules:[{ minFloor:27, maxFloor:28 }], name:'Smoker Vent', desc:'A black-smoker plume boiling up off the trench floor. Pushes you north while you stand in it.', walkable:true, current:true, pushX:0, pushY:-1.4, color:'#3f7fc0', dark:'#1c3c5c' },
  blacksilt:    { id:'blacksilt', weight:4, floorRules:[{ minFloor:27, maxFloor:28 }], name:'Black Silt', desc:'A drift of mineral-choked trench sediment. Two hits clears it.', hazard:true, attackable:true, maxHp:2, dmg:2, heartDropChance:0.06, color:'#223244', dark:'#0e1620' },
  voideddrift:  { id:'voideddrift', weight:4, floorRules:[{ minFloor:29, maxFloor:30 }], name:'Voided Drift', desc:'A patch of light-swallowing dark, thicker than the rest. Grabs your footing briefly — no damage.', freeze:true, freezeDuration:0.65, walkable:true, color:'#241c30', dark:'#100c18' },
  hushglow:     { id:'hushglow', weight:4, floorRules:[{ minFloor:29, maxFloor:30 }], name:'Hush Glow', desc:'A cold bioluminescent bruise on the dark. Two hits clears it.', hazard:true, attackable:true, maxHp:2, dmg:2, heartDropChance:0.06, color:'#3a2c4a', dark:'#1c1626' },
  marginrift:   { id:'marginrift', weight:4, floorRules:[{ minFloor:31, maxFloor:32 }], name:'Margin Rift', desc:'A tear along the edge of the page. Pushes you east while you stand in it.', walkable:true, current:true, pushX:1.6, pushY:0, color:'#b070e0', dark:'#5a2c7a' },
  authorsmark:  { id:'authorsmark', weight:4, floorRules:[{ minFloor:31, maxFloor:32 }], name:"Author's Mark", desc:'Wet ink pooled where it should not be. Attacks do nothing, only a bomb blast clears it.', hazard:true, attackable:false, destructible:true, dmg:2, heartDropChance:0.06, color:'#8a5ac0', dark:'#402868' },
  foldshear:    { id:'foldshear', weight:4, floorRules:[{ minFloor:33, maxFloor:34 }], name:'Fold Shear', desc:'A seam where space folds against itself. Pushes you north while you stand in it.', walkable:true, current:true, pushX:0, pushY:-2.2, color:'#ff7fe0', dark:'#7a2c68' },
  lastexit:     { id:'lastexit', weight:4, floorRules:[{ minFloor:33, maxFloor:34 }], name:'Last Exit', desc:'A doorway that only ever leads back in. Two hits clears it.', hazard:true, attackable:true, maxHp:2, dmg:2, heartDropChance:0.06, color:'#ff4fd8', dark:'#6a1c5a' },

  overflowgrime:{ id:'overflowgrime', weight:4, floorRules:[{ minFloor:2, maxFloor:3, path:'C' }], name:'Overflow Grime', desc:'A slick of gutter runoff. Grabs your footing briefly — no damage.', freeze:true, freezeDuration:0.5, walkable:true, color:'#5c6a3a', dark:'#2c3418' },
  effluentooze: { id:'effluentooze', weight:4, floorRules:[{ minFloor:4, maxFloor:5, path:'C' }], name:'Effluent Ooze', desc:'A sludge of sewer effluent. Attacks do nothing, only a bomb blast clears it.', hazard:true, attackable:false, destructible:true, dmg:1, heartDropChance:0.08, color:'#4a5228', dark:'#232612' },
  canopydrip:   { id:'canopydrip', weight:4, floorRules:[{ minFloor:6, maxFloor:9, path:'C' }], name:'Canopy Drip', desc:'A steady runoff pouring off the rainforest canopy. Pushes you south while you stand in it.', walkable:true, current:true, pushX:0, pushY:1.0, color:'#2e6a3a', dark:'#163a1c' },
  rootsnag:     { id:'rootsnag', weight:4, floorRules:[{ minFloor:10, maxFloor:11, path:'C' }], name:'Root Snag', desc:'A tangle of drowned mangrove root. Two hits clears it.', hazard:true, attackable:true, maxHp:2, dmg:1, heartDropChance:0.08, color:'#4a3a28', dark:'#241c14' },
  navewash:     { id:'navewash', weight:4, floorRules:[{ minFloor:12, maxFloor:13, path:'C' }], name:'Nave Wash', desc:'A current running the length of a flooded nave. Pushes you east while you stand in it.', walkable:true, current:true, pushX:1.2, pushY:0, color:'#3a5a6a', dark:'#1c2c34' },
  bleachedspine:{ id:'bleachedspine', weight:4, floorRules:[{ minFloor:14, maxFloor:15, path:'C' }], name:'Bleached Spine', desc:'A rib of dead coral, sun-white and sharp. Attacks do nothing, only a bomb blast clears it.', hazard:true, attackable:false, destructible:true, dmg:2, heartDropChance:0.06, color:'#d8ccb0', dark:'#8a7a5a' },
  scaldingjet:  { id:'scaldingjet', weight:4, floorRules:[{ minFloor:16, maxFloor:17, path:'C' }], name:'Scalding Jet', desc:'A vent jet boiling straight up off the sea floor. Pushes you north while you stand in it.', walkable:true, current:true, pushX:0, pushY:-1.5, color:'#e0834a', dark:'#7a3c18' },
  bellrust:     { id:'bellrust', weight:4, floorRules:[{ minFloor:18, maxFloor:19, path:'C' }], name:'Bell Rust', desc:'A fallen, corroded cathedral bell. Two hits clears it.', hazard:true, attackable:true, maxHp:2, dmg:2, heartDropChance:0.06, color:'#5a6a7a', dark:'#2a3440' },
  lightlessdrag:{ id:'lightlessdrag', weight:4, floorRules:[{ minFloor:20, maxFloor:21, path:'C' }], name:'Lightless Drag', desc:'A current with no light to show which way it runs. Pushes you west while you stand in it.', walkable:true, current:true, pushX:-1.7, pushY:0, color:'#1c2c3a', dark:'#0a1218' },
  mawgrip:      { id:'mawgrip', weight:4, floorRules:[{ minFloor:22, maxFloor:23, path:'C' }], name:'Maw Grip', desc:'Cartilage and grit, closing slow. Attacks do nothing, only a bomb blast clears it.', hazard:true, attackable:false, destructible:true, dmg:2, heartDropChance:0.05, color:'#2a1c28', dark:'#120a10' },

  dustlens:     { id:'dustlens', weight:4, floorRules:[{ minFloor:3, maxFloor:4, path:'D' }], name:'Dust Lens', desc:'A film of settled dust across old glass. Grabs your footing briefly — no damage.', freeze:true, freezeDuration:0.5, walkable:true, color:'#6a6a7a', dark:'#303038' },
  brokenglass:  { id:'brokenglass', weight:4, floorRules:[{ minFloor:3, maxFloor:4, path:'D' }], name:'Broken Glass', desc:'A shattered observation lens, still sharp. Two hits clears it.', hazard:true, attackable:true, maxHp:2, dmg:1, heartDropChance:0.08, color:'#8a8aa0', dark:'#40404e' },
  lensflare:    { id:'lensflare', weight:4, floorRules:[{ minFloor:3, maxFloor:4, path:'D' }], name:'Lens Flare', desc:'A stray beam bent off a cracked mirror array. Pushes you south while you stand in it.', walkable:true, current:true, pushX:0, pushY:1.1, color:'#9ab0d0', dark:'#465268' },
  meridiandrag: { id:'meridiandrag', weight:4, floorRules:[{ minFloor:5, maxFloor:6, path:'D' }], name:'Meridian Drag', desc:'A slow pull along an old orrery meridian ring. Pushes you east while you stand in it.', walkable:true, current:true, pushX:1.3, pushY:0, color:'#c9a84a', dark:'#6a5622' },
  gearjam:      { id:'gearjam', weight:4, floorRules:[{ minFloor:5, maxFloor:6, path:'D' }], name:'Gear Jam', desc:'A seized brass gear train, teeth still sharp. Attacks do nothing, only a bomb blast clears it.', hazard:true, attackable:false, destructible:true, dmg:2, heartDropChance:0.06, color:'#a08040', dark:'#4a3a1c' },
  brasscog:     { id:'brasscog', weight:4, floorRules:[{ minFloor:5, maxFloor:6, path:'D' }], name:'Brass Cog', desc:'A loose cog still spinning free. Two hits clears it.', hazard:true, attackable:true, maxHp:2, dmg:1, heartDropChance:0.08, color:'#d4af5a', dark:'#6e5626' },
  colddrift:    { id:'colddrift', weight:4, floorRules:[{ minFloor:7, maxFloor:9, path:'D' }], name:'Cold Drift', desc:'A current of absolute-zero nothing between the stars. Grabs your footing briefly — no damage.', freeze:true, freezeDuration:0.6, walkable:true, color:'#2c2c44', dark:'#141420' },
  eventhorizon: { id:'eventhorizon', weight:4, floorRules:[{ minFloor:7, maxFloor:9, path:'D' }], name:'Event Horizon', desc:'A point past which light does not return. Two hits clears it.', hazard:true, attackable:true, maxHp:2, dmg:2, heartDropChance:0.05, color:'#1c1c30', dark:'#0a0a16' },
  lastlightflare:{ id:'lastlightflare', weight:4, floorRules:[{ minFloor:7, maxFloor:9, path:'D' }], name:'Last Light Flare', desc:'The last photons this stretch of void will ever see. Pushes you north while you stand in it.', walkable:true, current:true, pushX:0, pushY:-1.8, color:'#e8e0ff', dark:'#6a5ea0' },

  turretn:      { id:'turretn', weight:1.5, name:'Turret — North', desc:'Fires straight up every second, infinite range. Only a bomb takes it down.', projectile:true, fireCooldown:2.0, dmg:1, angles:[-Math.PI / 2], boltColor:'#9ac9e0', color:'#5a5548', dark:'#332f28', destructible:true },
  turrete:      { id:'turrete', weight:1.5, name:'Turret — East', desc:'Fires right every second, infinite range. Only a bomb takes it down.', projectile:true, fireCooldown:2.0, dmg:1, angles:[0], boltColor:'#9ac9e0', color:'#5a5548', dark:'#332f28', destructible:true },
  turrets:      { id:'turrets', weight:1.5, name:'Turret — South', desc:'Fires straight down every second, infinite range. Only a bomb takes it down.', projectile:true, fireCooldown:2.0, dmg:1, angles:[Math.PI / 2], boltColor:'#9ac9e0', color:'#5a5548', dark:'#332f28', destructible:true },
  turretw:      { id:'turretw', weight:1.5, name:'Turret — West', desc:'Fires left every second, infinite range. Only a bomb takes it down.', projectile:true, fireCooldown:2.0, dmg:1, angles:[Math.PI], boltColor:'#9ac9e0', color:'#5a5548', dark:'#332f28', destructible:true },

  turretplus:   { id:'turretplus', weight:4, name:'Turret — Plus', desc:'Fires N/E/S/W simultaneously every second. Only a bomb takes it down.', projectile:true, fireCooldown:2.0, dmg:1, angles:[0, Math.PI / 2, Math.PI, -Math.PI / 2], boltColor:'#9ac9e0', color:'#6a5548', dark:'#3a2f28', destructible:true },

  turretx:      { id:'turretx', weight:4, name:'Turret — X', desc:'Fires all 4 diagonals simultaneously every second. Only a bomb takes it down.', projectile:true, fireCooldown:2.0, dmg:1, angles:[Math.PI / 4, 3 * Math.PI / 4, -3 * Math.PI / 4, -Math.PI / 4], boltColor:'#9ac9e0', color:'#6a5548', dark:'#3a2f28', destructible:true },

  turrettarget: { id:'turrettarget', weight:1.5, name:'Turret — Targeting', desc:'Aims straight at you every shot, once a second. Only a bomb takes it down.', projectile:true, fireCooldown:1.0, dmg:1, targeting:true, boltColor:'#e35b6a', color:'#7a4548', dark:'#4a2528', destructible:true },

  bombbarrel:         { id:'bombbarrel', weight:10, name:'Bomb Barrel', desc:'Blocks the ground. 3 ranged hits (or a nearby blast) destroys and detonates it.', attackable:true, maxHp:3, explodesOnDestroy:true, color:'#3a3a3a', dark:'#1c1c1c' },

  pushablebombbarrel: { id:'pushablebombbarrel', weight:4, name:'Pushable Bomb Barrel', desc:'Same as a Bomb Barrel, but you can shove it around by walking into it.', attackable:true, maxHp:3, explodesOnDestroy:true, pushable:true, color:'#4a3a2a', dark:'#241c14' },

  glimmerrock:  { id:'glimmerrock', weight:0.2, name:'Glimmer Rock', desc:'A crystal-veined rock. 3 hits cracks it open, with a small chance to drop a heart.', attackable:true, maxHp:3, solid:true, heartDropChance:0.08, color:'#7fd6c9', dark:'#2c6b5e' },

  frostvent:    { id:'frostvent', weight:1.5, name:'Frost Vent', desc:'A vent breathing bitter cold. Standing in it freezes you in place for a moment.', walkable:true, freeze:true, freezeDuration:1.0, color:'#bfe4f7', dark:'#4a7a92' },

  thornspire:   { id:'thornspire', weight:1.5, name:'Thorn Spire', desc:'A spike tall enough to block flight, not just a footstep.', hazard:true, dmg:2, solid:true, blocksFlight:true, tall:true, color:'#7a9c4a', dark:'#3a4e22' },

  driftstone:   { id:'driftstone', weight:1.5, name:'Driftstone Current', desc:'A diagonal current pad — pushes you both ways at once.', walkable:true, current:true, pushX:0.9, pushY:0.9, color:'#6a8fd6', dark:'#2c3f70' },

  cinderkeg:    { id:'cinderkeg', weight:1.5, name:'Cinder Keg', desc:'A pushable powder keg — shove it into position, then pop it for a blast.', attackable:true, maxHp:3, explodesOnDestroy:true, pushable:true, heartDropChance:0.05, color:'#c9662e', dark:'#5c2c10' },

  stunspore:    { id:'stunspore', weight:1.5, name:'Stunspore Puffball', desc:'A drifting spore cloud. Brushing past it locks your feet for a moment.', walkable:true, freeze:true, freezeDuration:0.8, color:'#c9a8e0', dark:'#5c3a7a' },

  turretspinner: { id:'turretspinner', weight:1.5, name:'Turret — Spinner', desc:'A turret that never aims — it just spins, leaking bolts around a full circle. Only a bomb takes it down.', projectile:true, fireCooldown:0.6, dmg:1, spin:true, boltColor:'#9ac9e0', color:'#5a5548', dark:'#332f28', destructible:true },

  glasscolumn:  { id:'glasscolumn', weight:4, name:'Glass Column', desc:'A brittle glass pillar — one hit shatters it completely.', attackable:true, maxHp:1, solid:true, color:'#bfe4f0', dark:'#4a7a86' },

  sparkbush:    { id:'sparkbush', weight:1.5, name:'Spark Bush', desc:'A shrub turret — fires a 3-bolt spread on a slow cooldown. Only a bomb takes it down.', projectile:true, fireCooldown:2.4, dmg:1, spreadShots:3, spreadAngle:0.5, boltColor:'#e0d64f', color:'#4a6e2c', dark:'#22380f', destructible:true },

  magmapod:     { id:'magmapod', weight:4, name:'Magma Pod', desc:'An attackable pod that bursts in a blast when destroyed.', attackable:true, maxHp:2, explodesOnDestroy:true, heartDropChance:0.08, color:'#e0662e', dark:'#7a2c10' },
};

function fireHeartDrop(kind){
  if (kind === 'yellowfire' || kind === 'redfire') return { id:'heartRed', chance:0.10 };
  if (kind === 'bluefire' || kind === 'purplefire') return { id:'heartBlue', chance:0.10 };
  if (kind === 'greenfire' || kind === 'whitefire' || kind === 'blackfire') return { id:'eternalheart', chance:0.04 };
  return null;
}

