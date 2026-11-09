'use strict';

// Each entry describes a signature route and a competing specialist route.
const tune = (field, amount, label, type = 'multiply') => ({ type, field, amount, label });
const add = (field, amount, label) => tune(field, amount, label, 'add');
const permanent = (field, amount, label) => tune(field, amount, label, 'innate');

const SKILL_SPECIALIZATIONS = {
  earth: [
    ['Faultline', 'faultlineQuake', 'Repeated swings release a ground quake.', tune('meleeCooldown', -0.10, 'Swing cooldown'), add('rangeTiles', 0.15, 'Melee reach in tiles')],
    ['Pile Driver', ['Heavy Hoof', tune('meleeDamage', 0.13, 'Melee damage')], ['Set Your Feet', add('rangeTiles', 0.22, 'Melee reach in tiles')], ['Bedrock Impact', tune('meleeDamage', 0.26, 'Melee damage'), tune('meleeCooldown', 0.16, 'Swing cooldown')]],
  ],
  pegasus: [
    ['Slipstream', 'slipstreamSurge', 'Build up a slipstream by moving before the next strike.', tune('speed', 0.06, 'Movement speed'), add('rangeTiles', 0.18, 'Melee reach in tiles')],
    ['Wingblade', ['Crosswind', tune('meleeCooldown', -0.09, 'Swing cooldown')], ['Feather Edge', add('rangeTiles', 0.25, 'Melee reach in tiles')], ['Shear Line', tune('meleeCooldown', -0.17, 'Swing cooldown'), tune('meleeDamage', -0.09, 'Melee damage')]],
  ],
  unicorn: [
    ['Arcane Echo', 'arcaneEcho', 'Repeated bolt hits build up an extra arcane strike.', tune('boltSpeed', 0.13, 'Bolt speed'), tune('fireCooldown', -0.07, 'Fire cooldown')],
    ['Spell Lance', ['Long Focus', add('rangeTiles', 0.9, 'Bolt range in tiles')], ['Piercing Aim', tune('boltSpeed', 0.23, 'Bolt speed')], ['Overcast', tune('rangedDamage', 0.30, 'Ranged damage'), tune('fireCooldown', 0.20, 'Fire cooldown')]],
  ],
  batpony: [
    ['Echo Hunt', 'echoHunt', 'Echoes mark nearby enemies for a stronger follow-up strike.', tune('speed', 0.05, 'Movement speed'), add('rangeTiles', 0.17, 'Melee reach in tiles')],
    ['Blood Hunt', ['Quick Bite', tune('meleeCooldown', -0.09, 'Swing cooldown')], ['Blood Scent', add('onKillHealChance', 0.04, 'On-kill heal chance')], ['Night Feeding', add('onKillHealChance', 0.10, 'On-kill heal chance'), add('rangeTiles', -0.12, 'Melee reach in tiles')]],
  ],
  zebra: [
    ['Bitterbrew', 'bitterbrew', 'Repeated strikes prepare a brewed effect for the next swing.', tune('meleeCooldown', -0.08, 'Swing cooldown'), add('rangeTiles', 0.16, 'Melee reach in tiles')],
    ['Omen Staff', ['Read the Gap', add('rangeTiles', 0.20, 'Melee reach in tiles')], ['Measured Blow', tune('meleeDamage', 0.13, 'Melee damage')], ['Last Word', tune('meleeDamage', 0.24, 'Melee damage'), tune('meleeCooldown', 0.14, 'Swing cooldown')]],
  ],
  hypogriff: [
    ['Talon Rend', 'talonRend', 'Talon hits leave a wound on their target.', add('rangeTiles', 0.18, 'Melee reach in tiles'), tune('meleeDamage', 0.12, 'Melee damage')],
    ['Sky Duelist', ['Gust Step', tune('speed', 0.06, 'Movement speed')], ['Hook and Turn', tune('meleeCooldown', -0.09, 'Swing cooldown')], ['Rake Pass', add('rangeTiles', 0.48, 'Melee reach in tiles'), tune('meleeDamage', -0.11, 'Melee damage')]],
  ],
  seapony: [
    ['Tidewatch', 'tidewatch', 'A timed tide empowers the next shot.', add('rangeTiles', 0.7, 'Bolt range in tiles'), tune('rangedDamage', 0.12, 'Ranged damage')],
    ['Breaker Current', ['Cross Current', tune('boltSpeed', 0.15, 'Bolt speed')], ['Short Tide', tune('fireCooldown', -0.10, 'Fire cooldown')], ['Whitewater', tune('fireCooldown', -0.21, 'Fire cooldown'), tune('rangedDamage', -0.14, 'Ranged damage')]],
  ],
  ponybot: [
    ['Overcharge', 'overcharge', 'Build up the overcharge meter by firing the laser.', tune('fireCooldown', -0.08, 'Laser cooldown'), tune('rangedDamage', 0.10, 'Laser damage')],
    ['Shield Chassis', ['Shock Mounts', permanent('damageTakenMult', -0.08, 'Damage taken multiplier')], ['Stabilized Beam', tune('rangedDamage', 0.12, 'Laser damage')], ['Armored Housing', permanent('damageTakenMult', -0.22, 'Damage taken multiplier'), tune('speed', -0.08, 'Movement speed')]],
  ],
  griffin: [
    ['Stoop Kill', 'stoopKill', 'Projectile hits execute weakened non-boss enemies.', tune('fireCooldown', -0.08, 'Fire cooldown'), tune('speed', 0.05, 'Movement speed')],
    ['High Perch', ['Sight the Lane', add('rangeTiles', 0.75, 'Bolt range in tiles')], ['Quill Flight', tune('boltSpeed', 0.18, 'Bolt speed')], ['Pinpoint Volley', tune('rangedDamage', 0.29, 'Ranged damage'), tune('fireCooldown', 0.17, 'Fire cooldown')]],
  ],
  kirin: [
    ['Nirik', 'nirikNature', 'Build up heat to enter Nirik form.', tune('fireCooldown', -0.08, 'Fire cooldown'), tune('speed', 0.06, 'Movement speed')],
    ['Keepaway', ['Long Fuse', add('rangeTiles', 0.85, 'Bolt range in tiles')], ['Hot Spark', tune('boltSpeed', 0.20, 'Bolt speed')], ['Glass Flame', tune('rangedDamage', 0.33, 'Ranged damage'), tune('fireCooldown', 0.19, 'Fire cooldown')]],
  ],
  dragon: [
    ['Hoardfire', 'hoardfire', 'Carried coins feed the strength of the flame.', add('rangeTiles', 0.55, 'Flame reach in tiles'), permanent('chargeTime', -0.06, 'Charge time in seconds')],
    ['Bellows', ['Draw Breath', permanent('chargeTime', -0.08, 'Charge time in seconds')], ['Deep Lung', add('rangeTiles', 0.9, 'Flame reach in tiles')], ['Flash Breath', permanent('chargeTime', -0.12, 'Charge time in seconds'), tune('rangedDamage', -0.13, 'Flame damage')]],
  ],
  windigo: [
    ['Deep Chill', 'deepChill', 'Periodically releases a chill pulse around the Windigo.', tune('speed', 0.05, 'Movement speed'), add('freezeChance', 0.035, 'Freeze chance')],
    ['Hail Sniper', ['Ice Needle', tune('boltSpeed', 0.19, 'Bolt speed')], ['White Horizon', add('rangeTiles', 0.9, 'Bolt range in tiles')], ['Hard Hail', add('freezeChance', 0.12, 'Freeze chance'), tune('fireCooldown', 0.15, 'Fire cooldown')]],
  ],
  kelpie: [
    ['Riptide Lure', 'riptideLure', 'Periodically draws nearby enemies into reach.', tune('meleeCooldown', -0.08, 'Swing cooldown'), tune('meleeDamage', 0.12, 'Melee damage')],
    ['Long Hook', ['Waterline', add('rangeTiles', 0.25, 'Melee reach in tiles')], ['Undertow Grip', tune('meleeDamage', 0.13, 'Melee damage')], ['Drag Net', add('rangeTiles', 0.65, 'Melee reach in tiles'), tune('meleeCooldown', 0.16, 'Swing cooldown')]],
  ],
  breezie: [
    ['Gale Step', 'galeStep', 'Travel builds up an extra gust attack.', tune('speed', 0.06, 'Movement speed'), tune('boltSpeed', 0.12, 'Bolt speed')],
    ['Needle Swarm', ['Light Volley', tune('fireCooldown', -0.09, 'Fire cooldown')], ['Slip the Gap', permanent('radius', -1, 'Collision radius in pixels')], ['Mote Storm', tune('fireCooldown', -0.18, 'Fire cooldown'), tune('rangedDamage', -0.12, 'Ranged damage')]],
  ],
  dnbpony: [
    ['Bass Drop', 'bassDrop', 'Chaining attacks in rhythm builds toward a bass drop.', tune('fireCooldown', -0.08, 'Fire cooldown'), tune('speed', 0.05, 'Movement speed')],
    ['Subwoofer', ['Low End', tune('rangedDamage', 0.13, 'Ranged damage')], ['Room Tone', add('rangeTiles', 0.8, 'Bolt range in tiles')], ['Half Time', tune('rangedDamage', 0.31, 'Ranged damage'), tune('fireCooldown', 0.21, 'Fire cooldown')]],
  ],
  crystalpony: [
    ['Prism Bloom', 'prismBloom', 'Charged volleys build up a prism burst.', permanent('chargeTime', -0.08, 'Charge time in seconds'), tune('boltSpeed', 0.12, 'Shard speed')],
    ['Cut Glass', ['Faceting', permanent('crystalVolleySpacing', -0.03, 'Shard spacing in radians')], ['Tempering', tune('boltSpeed', 0.19, 'Shard speed')], ['Five-Facet Fan', permanent('crystalShardCount', 2, 'Shards per volley'), permanent('chargeTime', 0.17, 'Charge time in seconds')]],
  ],
  mule: [
    ['Stubborn Ground', 'stubbornGround', 'Hold ground to build grit for close combat.', tune('meleeDamage', 0.12, 'Melee damage'), permanent('damageTakenMult', -0.06, 'Damage taken multiplier')],
    ['Packguard', ['Solid Stance', permanent('damageTakenMult', -0.08, 'Damage taken multiplier')], ['Long Kick', add('rangeTiles', 0.28, 'Melee reach in tiles')], ['Dead Weight', permanent('damageTakenMult', -0.14, 'Damage taken multiplier'), tune('speed', -0.09, 'Movement speed')]],
  ],
  alicorn: [
    ['Triple Crown', 'tripleCrown', 'Cycle through three royal combat stances.', tune('fireCooldown', -0.07, 'Fire cooldown'), tune('boltSpeed', 0.13, 'Bolt speed')],
    ['Aurora Lance', ['High Arc', add('rangeTiles', 0.75, 'Bolt range in tiles')], ['Crown Ray', tune('rangedDamage', 0.13, 'Ranged damage')], ['Fixed Constellation', tune('rangedDamage', 0.24, 'Ranged damage'), tune('speed', -0.08, 'Movement speed')]],
  ],
  changeling: [
    ['Love Harvest', 'loveHarvest', 'Harvest love through kills to fuel the next fire pool.', permanent('fireZoneRange', 10, 'Pool placement reach in pixels'), tune('fireCooldown', -0.08, 'Pool cooldown')],
    ['Snare Pool', ['Wide Mire', permanent('fireZoneRadius', 9, 'Pool radius in pixels')], ['Sticky Surface', permanent('fireZoneRootMult', 0.15, 'Movement multiplier in own pool')], ['Bog Mouth', permanent('fireZoneRadius', 16, 'Pool radius in pixels'), permanent('fireZoneRange', -7, 'Pool placement reach in pixels')]],
  ],
  diamonddog: [
    ['Tunnel Ambush', 'tunnelAmbush', 'Travel underground to prepare an ambush strike.', tune('speed', 0.06, 'Movement speed'), add('rangeTiles', 0.19, 'Melee reach in tiles')],
    ['Quarry Breaker', ['Ore Nose', permanent('rockCoinChance', 0.04, 'Rock coin drop chance')], ['Stonebreaker', add('rangeTiles', 0.28, 'Melee reach in tiles')], ['Deep Vein', permanent('rockCoinChance', 0.08, 'Rock coin drop chance'), tune('meleeCooldown', 0.10, 'Swing cooldown')]],
  ],
  gargoyle: [
    ['Stone Vigil', 'stoneVigil', 'Standing still readies a defensive vigil.', add('rangeTiles', 0.7, 'Bolt range in tiles'), tune('rangedDamage', 0.12, 'Ranged damage')],
    ['Fault Marker', ['Find the Seam', add('vulnerableChance', 0.035, 'Vulnerable chance')], ['Stone Dart', tune('boltSpeed', 0.20, 'Bolt speed')], ['Crack the Shell', add('vulnerableChance', 0.10, 'Vulnerable chance'), tune('fireCooldown', 0.15, 'Fire cooldown')]],
  ],
  changedling: [
    ['Ember Molt', 'emberMolt', 'Build ember stacks through the fire ring.', permanent('fireRingRadius', 9, 'Fire ring radius in pixels'), tune('speed', 0.05, 'Movement speed')],
    ['Walking Kiln', ['Hot Boundary', permanent('fireRingRadius', 10, 'Fire ring radius in pixels')], ['Refractory Shell', permanent('damageTakenMult', -0.07, 'Damage taken multiplier')], ['Kiln Mantle', permanent('fireRingRadius', 23, 'Fire ring radius in pixels'), tune('speed', -0.09, 'Movement speed')]],
  ],
  changelingqueen: [
    ['Royal Decree', 'royalDecree', 'Periodically marks nearby enemies as vulnerable.', permanent('changelingSummonCooldown', -0.5, 'Summon cooldown in seconds'), permanent('changelingMinionDmg', 0.3, 'Brood damage')],
    ['Hive Nursery', ['Feeding Cells', permanent('changelingMinionRadius', 3, 'Brood collision radius in pixels')], ['Rapid Hatch', permanent('changelingSummonCooldown', -0.65, 'Summon cooldown in seconds')], ['Second Clutch', permanent('maxChangelingMinions', 2, 'Maximum brood size'), permanent('fireZoneRadius', -7, 'Pool radius in pixels')]],
  ],
  filly: [
    ['Scrappy Surge', 'scrappySurge', 'Low health can trigger a burst of scrappy combat power.', tune('meleeCooldown', -0.09, 'Swing cooldown'), tune('speed', 0.05, 'Movement speed')],
    ['Sweet Talk', ['Bright Eyes', add('charmChance', 0.045, 'Charm chance')], ['Close Enough', add('rangeTiles', 0.24, 'Melee reach in tiles')], ['Puppy Eyes', add('charmChance', 0.11, 'Charm chance'), tune('meleeDamage', -0.13, 'Melee damage')]],
  ],
  engineerpony: [
    ['Salvage Protocol', 'salvageProtocol', 'Kills provide scrap for the salvage mechanic.', permanent('turretDamageMult', 0.06, 'Turret damage multiplier'), tune('speed', 0.05, 'Movement speed')],
    ['Turret Grid', ['Calibrate', permanent('turretDamageMult', 0.08, 'Turret damage multiplier')], ['Cover the Crew', permanent('damageTakenMult', -0.07, 'Damage taken multiplier')], ['Extra Emplacement', permanent('maxTurrets', 1, 'Maximum turrets'), tune('rangedDamage', -0.17, 'Personal bolt damage')]],
  ],
  chudfilly: [
    ['Spite Swarm', 'spiteSwarm', 'Taking damage can trigger a retaliatory swarm.', permanent('familiarDamageMult', 0.10, 'Familiar damage multiplier'), permanent('radius', -1, 'Collision radius in pixels')],
    ['Apiary', ['Worker Feed', permanent('familiarDamageMult', 0.12, 'Familiar damage multiplier')], ['Keeper Boots', tune('speed', 0.07, 'Movement speed')], ['Heavy Swarm', permanent('familiarDamageMult', 0.23, 'Familiar damage multiplier'), tune('speed', -0.08, 'Movement speed')]],
  ],
  chadfilly: [
    ['Rolling Charge', 'rollingCharge', 'Travel a set distance to drop a bomb automatically.', tune('speed', 0.06, 'Movement speed'), tune('bombRadiusMult', 0.10, 'Blast radius')],
    ['Demolitions', ['Packed Powder', tune('bombDamageMult', 0.13, 'Bomb damage')], ['Long Fuse', permanent('bombFuseTimeMult', 0.15, 'Bomb fuse time'), tune('bombRadiusMult', 0.12, 'Blast radius')], ['Breach Charge', tune('bombDamageMult', 0.29, 'Bomb damage'), tune('bombRadiusMult', -0.09, 'Blast radius')]],
  ],
  snowpitymare: [
    ['Shatterfrost', 'shatterfrost', 'Frozen kills shatter, and other kills build up rime.', permanent('familiarDamageMult', 0.11, 'Wisp damage multiplier'), permanent('pocketChargeRateMult', 0.15, 'Wisp Call charge multiplier')],
    ['Wisp Keeper', ['Winter Shelter', permanent('wispHpBonus', 1, 'Wisp HP')], ['Call and Answer', permanent('pocketChargeRateMult', 0.19, 'Wisp Call charge multiplier')], ['Hearth Circle', permanent('wispHpBonus', 2, 'Wisp HP'), permanent('familiarDamageMult', -0.10, 'Familiar damage multiplier')]],
  ],
};

const SKILL_SPECIALIZATION_COSTS = [1, 2, 3];
const SKILL_SPECIALIZATION_LIMIT = SKILL_SPECIALIZATION_COSTS.reduce((sum, cost) => sum + cost, 0);
const SKILL_SPECIALIZATION_NODES = {};

for (const [classId, [signature, alternate]] of Object.entries(SKILL_SPECIALIZATIONS)) {
  const [title, flag, desc, opener, setup] = signature;
  const paths = [
    [[title + ' Footing', opener], [title + ' Practice', setup], [title, { type:'flag', field:flag, label:desc }]],
    alternate.slice(1),
  ];
  const nodes = SKILL_SPECIALIZATION_NODES[classId] = [];
  paths.forEach((path, route) => {
    let parent = 'char_hub_' + classId;
    path.forEach(([name, ...effects], tier) => {
      const id = 'spec_' + classId + '_' + route + '_' + tier + (tier === 2 ? '_capstone' : '');
      const technique = SKILL_TECHNIQUES[classId][route];
      if (tier === 1 || tier === 2) {
        effects.push({ type:'technique', technique, rank:tier, label:technique[tier === 1 ? 7 : 8] });
      }
      const node = {
        id, parent, classId, name: tier === 1 ? technique[0] : name, effects, cost:SKILL_SPECIALIZATION_COSTS[tier],
        pathName: route === 0 ? title : alternate[0],
        tradeoff: route === 1 && effects.filter(effect => effect.type !== 'technique').length > 1,
        desc: (route === 0 ? title : alternate[0]) + ' · ' + (tier + 1) + '/3',
      };
      if (tier === 0) node.excludes = ['spec_' + classId + '_' + (1 - route) + '_0'];
      nodes.push(node);
      SKILL_TREE_NODES.push(node);
      SKILL_TREE_NODES_BY_ID[id] = node;
      parent = id;
    });
  });
}
