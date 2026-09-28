'use strict';

const ITEM_SYNERGY_DEFAULT_CLAMP = 0.25;

const ITEM_SYNERGY_FIELD_CLAMPS = {
  meleeDamage: 3,
  rangedDamage: 3,
  luck: 3,
  speed: 20,
  meleeRange: 16,
  boltSpeed: 60,
  meleeCooldown: 0.15,
  fireCooldown: 0.15,
  critMultiplier: 1,
  multishotExtra: 2,
  magnetRadius: 40,
  bombRadiusMult: 0.25
};

const ITEM_SYNERGY_FIELDS = ['boltSpeed','bombRadiusMult','bossDamageBonus','bossDamageTakenMult','charmChance',
  'critChance','critMultiplier','dealDiscount','dodgeChance','fearChance','fireCooldown','freezeChance',
  'lifestealChance','luck','magnetRadius','meleeCooldown','meleeDamage','meleeRange','multishotExtra',
  'onKillHealChance','rangedDamage','shopDiscountBonus','speed','stunChance','venomChance','vulnerableChance'];

function itemSynergyClamp(field){
  const c = Object.prototype.hasOwnProperty.call(ITEM_SYNERGY_FIELD_CLAMPS, field)
    ? ITEM_SYNERGY_FIELD_CLAMPS[field] : ITEM_SYNERGY_DEFAULT_CLAMP;
  return c;
}

function applySynergyFieldBonuses(player, groups, bases, last, bounds){

  for (const field in bases) if (!(field in groups)) groups[field] = 0;
  for (const field in groups) {
    if (typeof player[field] !== 'number') continue;

    if (!(field in last) || player[field] !== last[field]) bases[field] = player[field];
    const c = itemSynergyClamp(field);
    const b = (bounds && bounds[field]) || { min: -c, max: c };
    player[field] = bases[field] + Util.clamp(groups[field], b.min, b.max);
    last[field] = player[field];
  }
}

const SYNERGY_COMBOS = [

  {
    id: 'ecosystemSet',
    name: 'Ecosystem Set',
    desc: 'Own a Mark, a Bloom and a Skyfall item at once: +0.3 melee and ranged damage.',
    flag: 'ecosystemSetActive',
    stage: 'legacy',
    anyOf: [
      ['huntersmark','quarrysigil','wardenseye','branderstag','snareglyph'],
      ['plaguebud','witherpetal','bloomrot','plaguebloom','rotcrown'],
      ['cometshard','stormcaller','skyrend','meteorcrest','celestialfall']
    ],
    effects: [{ field: 'meleeDamage', amount: 0.3 }, { field: 'rangedDamage', amount: 0.3 }]
  },

  {
    id: 'rotAndRuin',
    name: 'Rot & Ruin',
    desc: 'Any Venom chance plus any Vulnerable chance: poison ticks hit 30% harder on Vulnerable targets (combat-3.js).',
    flag: 'rotAndRuinActive',
    stage: 'legacy',
    when: function(player){ return player.vulnerableChance > 0 && player.venomChance > 0; }
  },

  {
    id: 'marksmansEye',
    name: "Marksman's Eye",
    desc: '20%+ crit chance backed by any Vulnerable source: +0.4 crit multiplier.',
    flag: 'marksmansEyeActive',
    stage: 'legacy',
    when: function(player){ return player.critChance >= 0.20 && player.vulnerableChance > 0; },
    effects: [{ field: 'critMultiplier', amount: 0.4 }]
  },

  {
    id: 'packBond',
    name: 'Pack Bond',
    desc: 'Three or more familiars at once: +0.3 melee and ranged damage, +5% movement speed.',
    flag: 'packBondActive',
    stage: 'legacy',
    when: function(player){ return !!(player.familiars && player.familiars.length >= 3); },

    effects: [{ field: 'meleeDamage', amount: 0.3 }, { field: 'rangedDamage', amount: 0.3 }, { field: 'speedMult', amount: 0.05 }]
  },

  {
    id: 'twinFangs',
    name: 'Twin Fangs',
    desc: 'Own both Fang Guard and Quiverstring at once: +5% crit chance.',
    flag: 'twinFangsActive',
    stage: 'legacy',
    items: ['fangguard','quiverstring'],
    effects: [{ field: 'critChance', amount: 0.05 }]
  },

  {
    id: 'turretSweep',
    name: 'Turret Sweep',
    desc: 'Own the East, West and X Turret Buster Trophies at once: +4% crit, stun and freeze chance.',
    items: ['explorationtrophy_turrete','explorationtrophy_turretw','explorationtrophy_turretx'],
    effects: [{ field: 'critChance', amount: 0.04 }, { field: 'stunChance', amount: 0.04 }, { field: 'freezeChance', amount: 0.04 }]
  },
  {
    id: 'frostboundCrown',
    name: 'Frostbound Crown',
    desc: 'Gilded Crown plus the X Turret Buster Trophy: +6% freeze chance, +3% lifesteal chance.',
    items: ['gildedcrown','explorationtrophy_turretx'],
    effects: [{ field: 'freezeChance', amount: 0.06 }, { field: 'lifestealChance', amount: 0.03 }]
  },
  {
    id: 'weightedPrecision',
    name: 'Weighted Precision',
    desc: 'Heavy Amulet plus the East Turret Buster Trophy: +4% crit chance and +0.25 crit multiplier.',
    items: ['heavyamulet','explorationtrophy_turrete'],
    effects: [{ field: 'critChance', amount: 0.04 }, { field: 'critMultiplier', amount: 0.25 }]
  },
  {
    id: 'prospectorsHoard',
    name: "Prospector's Hoard",
    desc: 'Rock Breaker Trophy plus any other Luck charm: +1 Luck and +15 pickup magnet radius.',

    anyOf: [
      ['explorationtrophy_rock'],
      ['luckup','ascendantcharm','puritycharm','gildedcompass']
    ],
    effects: [{ field: 'luck', amount: 1 }, { field: 'magnetRadius', amount: 15 }]
  },

  {
    id: 'rotwardensVigil',
    name: "Rotwarden's Vigil",
    desc: 'Own all three items-2 venoms (Hollow Compass, Roaring Coin, Venomous Kiss): +6% poison and +5% vulnerable chance.',
    items: ['hollowcompass','roaringcoin','venomouskiss'],
    effects: [{ field: 'venomChance', amount: 0.06 }, { field: 'vulnerableChance', amount: 0.05 }]
  },
  {
    id: 'frostboundHush',
    name: 'Frostbound Hush',
    desc: 'Braided Insignia + Whispering Idol + Smoke Bomb: +5% freeze and +5% stun chance.',
    items: ['braidedinsignia','whisperingidol','smokebomb'],
    effects: [{ field: 'freezeChance', amount: 0.05 }, { field: 'stunChance', amount: 0.05 }]
  },
  {
    id: 'maskedCourt',
    name: 'Masked Court',
    desc: 'Mesmerizing Veil + Dread Cloak: +5% charm and +5% fear chance.',
    items: ['mesmerizingveil','dreadcloak'],
    effects: [{ field: 'charmChance', amount: 0.05 }, { field: 'fearChance', amount: 0.05 }]
  },
  {
    id: 'prospectorsEye',
    name: "Prospector's Eye",
    desc: "Coin Collector's Glove + Gilded Compass + Keen Eye: +1 Luck, +4% crit chance, +4% shop discount.",
    items: ['coincollectorsglove','gildedcompass','keeneye'],
    effects: [{ field: 'luck', amount: 1 }, { field: 'critChance', amount: 0.04 }, { field: 'shopDiscountBonus', amount: 0.04 }]
  },

  {
    id: 'bloodTithe',
    name: 'Blood Tithe',
    desc: 'Black Heart + Blood Pact, backed by a heart-buffer (Thick Mane or Cursed Locket): +6% lifesteal, +0.3 melee and ranged damage.',
    items: ['blackheart','bloodpact'],
    anyOf: [['thickmane','cursedlocket']],
    effects: [{ field: 'lifestealChance', amount: 0.06 }, { field: 'meleeDamage', amount: 0.3 }, { field: 'rangedDamage', amount: 0.3 }]
  },

  {
    id: 'gallopsGrace',
    name: "Gallop's Grace",
    desc: 'A common speed item (Downy Feather / Speed Up) plus a pool one (Blessed Hoof / Gilded Wing / Shadow Step): +12 speed, +4% dodge.',
    anyOf: [
      ['downyfeather','speedup'],
      ['blessedhoof','gildedwing','shadowstep']
    ],
    effects: [{ field: 'speed', amount: 12 }, { field: 'dodgeChance', amount: 0.04 }]
  },

  {
    id: 'demolitionKit',
    name: 'Demolition Kit',
    desc: "Bomb Range Up + Moonlit Petal + Prospector's Pick: +20% bomb blast radius, +1 Luck.",
    items: ['bombrangeup','moonlitpetal','prospectorspick'],
    effects: [{ field: 'bombRadiusMult', amount: 0.2 }, { field: 'luck', amount: 1 }]
  },
  {
    id: 'satchelCharge',
    name: 'Satchel Charge',
    desc: 'Hold a Bomb Satchel while owning a Bomb Range Up: +15% bomb blast radius.',
    items: ['bombrangeup'],
    when: function(player){ return !!(player.activeItem && player.activeItem.id === 'bombsatchel'); },
    effects: [{ field: 'bombRadiusMult', amount: 0.15 }]
  },

  {
    id: 'courtOfWhispers',
    name: 'Court of Whispers',
    desc: 'Despair Token + Envy Shard + Terrifying: +6% charm and +6% fear chance.',
    items: ['despairtoken','envyshard','terrifying'],
    effects: [{ field: 'charmChance', amount: 0.06 }, { field: 'fearChance', amount: 0.06 }]
  },

  {
    id: 'concussivePair',
    name: 'Concussive Pair',
    desc: 'Direct Malice + Hard Hitter: +5% stun chance, +0.3 melee damage.',
    items: ['directmalice','hardhitter'],
    effects: [{ field: 'stunChance', amount: 0.05 }, { field: 'meleeDamage', amount: 0.3 }]
  },

  {
    id: 'fatPurse',
    name: 'Fat Purse',
    desc: "Gluttony's Coin + Whispering Key with a Large Penny held as your active: +1 Luck, +8% shop discount.",
    items: ['gluttonyscoin','whisperingkey'],
    when: function(player){ return !!(player.activeItem && player.activeItem.id === 'largepenny'); },
    effects: [{ field: 'luck', amount: 1 }, { field: 'shopDiscountBonus', amount: 0.08 }]
  },

  {
    id: 'killingEdge',
    name: 'Killing Edge',
    desc: 'Any crit-chance item (Grace of the Dawn / Soul Drain / Boxer) backed by Razor Focus: +5% crit chance, +0.3 crit multiplier.',
    anyOf: [
      ['graceofthedawn','souldrain','boxer'],
      ['razorfocus']
    ],
    effects: [{ field: 'critChance', amount: 0.05 }, { field: 'critMultiplier', amount: 0.3 }]
  },

  {
    id: 'wardedPilgrim',
    name: 'Warded Pilgrim',
    desc: 'Holy Water + Void Whisper plus a Winged Grace or Guardian Halo: +8% boss damage, -8% boss damage taken, +4% dodge.',
    items: ['holywater','voidwhisper'],
    anyOf: [['wingedgrace','guardianhalo']],
    effects: [{ field: 'bossDamageBonus', amount: 0.08 }, { field: 'bossDamageTakenMult', amount: -0.08 }, { field: 'dodgeChance', amount: 0.04 }]
  },

  {
    id: 'twinVenoms',
    name: 'Twin Venoms',
    desc: 'Venom + Plague Breath: +6% poison chance, +0.3 ranged damage.',
    items: ['venom','plaguebreath'],
    effects: [{ field: 'venomChance', amount: 0.06 }, { field: 'rangedDamage', amount: 0.3 }]
  },

  {
    id: 'guidedVolley',
    name: 'Guided Volley',
    desc: 'Piercing Shot + Range Up plus a homing lens (Halo Guidance / Hexed Tracker): +40 bolt speed, +0.3 ranged damage.',
    items: ['piercingshot','rangeup'],
    anyOf: [['haloguidance','hexedtracker']],
    effects: [{ field: 'boltSpeed', amount: 40 }, { field: 'rangedDamage', amount: 0.3 }]
  },

  {
    id: 'fortunesTrine',
    name: "Fortune's Trine",
    desc: 'Ascendant Charm + Purity Charm + Luck Up: +2 Luck.',
    items: ['ascendantcharm','puritycharm','luckup'],
    effects: [{ field: 'luck', amount: 2 }]
  },

  {
    id: 'moonshardResonance',
    name: 'Moonshard Resonance',
    desc: 'Holding the Moon Shard: +0.4 ranged damage.',
    when: function(player){
      return !!(player.activeItem && player.activeItem.id === 'moonshard');
    },
    effects: [{ field: 'rangedDamage', amount: 0.4 }]
  },
  {
    id: 'vialOfNerve',
    name: 'Vial of Nerve',
    desc: 'Holding the Vial of Courage: +6% dodge chance.',
    when: function(player){
      return !!(player.activeItem && player.activeItem.id === 'vialcourage');
    },
    effects: [{ field: 'dodgeChance', amount: 0.06 }]
  },
  {
    id: 'huntersEye',
    name: "Hunter's Eye",
    desc: 'Holding the All-Seeing Eye: +5% crit chance.',
    when: function(player){
      return !!(player.activeItem && player.activeItem.id === 'allseeingeye');
    },
    effects: [{ field: 'critChance', amount: 0.05 }]
  },
  {
    id: 'moonlitAffinity',
    name: 'Moonlit Affinity',
    desc: 'Holding the Lunar Affinity: +1 Luck.',
    when: function(player){
      return !!(player.activeItem && player.activeItem.id === 'lunaraffinity');
    },
    effects: [{ field: 'luck', amount: 1 }]
  },
  {
    id: 'dawnriderWings',
    name: 'Dawnrider Wings',
    desc: 'Holding the Dawnbringer: +10 speed.',
    when: function(player){
      return !!(player.activeItem && player.activeItem.id === 'dawnbringer');
    },
    effects: [{ field: 'speed', amount: 10 }]
  },
  {
    id: 'hollowVessel',
    name: 'Hollow Vessel',
    desc: "Holding Angel's Tears: -8% boss damage taken.",
    when: function(player){
      return !!(player.activeItem && player.activeItem.id === 'angelstears');
    },
    effects: [{ field: 'bossDamageTakenMult', amount: -0.08 }]
  },
  {
    id: 'bargainOfBlood',
    name: 'Bargain of Blood',
    desc: "Holding Sombra's Bargain: +6% lifesteal chance.",
    when: function(player){
      return !!(player.activeItem && player.activeItem.id === 'sombrasbargain');
    },
    effects: [{ field: 'lifestealChance', amount: 0.06 }]
  }
];

const SYNERGY_COMBOS_BY_ID = (function(){
  const m = {};
  for (const c of SYNERGY_COMBOS) m[c.id] = c;
  return m;
})();

function isSynergyComboActive(player, combo){
  const p = player.passives || {};
  if (combo.items) { for (const id of combo.items) if (!(p[id] > 0)) return false; }
  if (combo.anyOf) {
    for (const group of combo.anyOf) {
      let any = false;
      for (const id of group) { if (p[id] > 0) { any = true; break; } }
      if (!any) return false;
    }
  }
  if (combo.when && !combo.when(player, p)) return false;
  return true;
}

function applySynergyComboFlag(player, comboId){
  const combo = SYNERGY_COMBOS_BY_ID[comboId];
  if (!combo) return false;
  const active = isSynergyComboActive(player, combo);
  if (combo.flag) player[combo.flag] = active;
  return active;
}

function comboBonus(player, comboId, field){
  const combo = SYNERGY_COMBOS_BY_ID[comboId];
  if (!combo || !combo.effects) return 0;
  const active = combo.flag ? !!player[combo.flag] : isSynergyComboActive(player, combo);
  if (!active) return 0;
  let sum = 0;
  for (const e of combo.effects) if (e.field === field) sum += e.amount;
  return sum;
}

function applyItemComboSynergies(player){
  if (!player || !player.passives) return;
  const groups = {};
  const bounds = {};
  for (const combo of SYNERGY_COMBOS) {
    if (combo.stage === 'legacy') continue;
    const active = isSynergyComboActive(player, combo);
    if (combo.flag) player[combo.flag] = active;
    if (!active || !combo.effects) continue;
    for (const e of combo.effects) {
      if (!e.field || typeof e.amount !== 'number') continue;
      if (ITEM_SYNERGY_FIELDS.indexOf(e.field) === -1) continue;
      groups[e.field] = (groups[e.field] || 0) + e.amount;
      const c = itemSynergyClamp(e.field);
      const b = bounds[e.field] || (bounds[e.field] = { min: -c, max: c });
      if (typeof e.min === 'number' && e.min > b.min) b.min = e.min;
      if (typeof e.max === 'number' && e.max < b.max) b.max = e.max;
    }
  }
  if (!player._itemComboBase) { player._itemComboBase = {}; player._itemComboLast = {}; }
  applySynergyFieldBonuses(player, groups, player._itemComboBase, player._itemComboLast, bounds);
}
