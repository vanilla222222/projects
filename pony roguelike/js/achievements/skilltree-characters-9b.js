'use strict';

const SKILL_TREE_UF_BOUNDS_9B = {
  'hypogriff|damageTakenMult':  { min:-0.4,  max:0.5 },
  'hypogriff|baseRangeTiles':   { min:0,     max:0.6 },
  'hypogriff|rockCoinChance':   { min:0,     max:0.25 },
  'seapony|damageTakenMult':    { min:-0.4,  max:0.5 },
  'seapony|changelingMinionDmg':      { min:0,  max:4 },
  'seapony|changelingMinionRadius':   { min:0,  max:60 },
  'seapony|changelingSummonCooldown': { min:-4, max:0 },
  'ponybot|turretDamageMult':   { min:-0.5,  max:0.6 },
  'ponybot|maxTurrets':         { min:-2,    max:4 },
  'griffin|damageTakenMult':    { min:-0.5,  max:0.5 },
  'griffin|chargeTime':         { min:0,     max:1.5 },
  'griffin|crystalShardCount':  { min:0,     max:5 },
  'kirin|damageTakenMult':      { min:-0.5,  max:0.5 },
  'kirin|chargeTime':           { min:0,     max:1.5 },
};

function ST9B(classId, stat, amount){ return { type:'stat', classId, stat, amount }; }
function UF9B(classId, field, amount){
  const b = SKILL_TREE_UF_BOUNDS_9B[classId + '|' + field];
  return { type:'uniqueField', classId, field, amount, min:b.min, max:b.max };
}
function FL9B(classId, field, value){ return { type:'uniqueFlag', classId, field, value }; }

const SKILL_TREE_CHARACTER_CONFIG_9B = {

  hypogriff: [
    { k:'r1', p:null, cursed:true, name:'Salt Debt', desc:'Nopony crosses back over the shelf twice without the sea taking a payment, and it has already been taken. Permanently increases damage taken by 6%. Neither line below opens any other way.',
      e:UF9B('hypogriff','damageTakenMult',0.06) },
    { k:'r2a', p:'r1', name:'Feathered Slip', desc:'A wing half-open at the right moment turns a blow into a shove. Increases dodge chance by 4%.',
      e:ST9B('hypogriff','dodgeChance',0.04) },
    { k:'r3a', p:'r2a', name:'Pinion Guard', desc:'The primaries are stiff enough to take a hit that the ribs should not have to. Reduces damage taken by 3%.',
      e:UF9B('hypogriff','damageTakenMult',-0.03) },
    { k:'r4a', p:'r3a', name:'Opened Guard', desc:'She does not land to strike. She lands where the guard already is not. Increases vulnerable chance by 4%.',
      e:ST9B('hypogriff','vulnerableChance',0.04) },
    { k:'r2b', p:'r1', name:'Eagle Scream', desc:'A note pitched to carry a mile over open water, used here in a corridor. Increases fear chance by 4%.',
      e:ST9B('hypogriff','fearChance',0.04) },
    { k:'r3b', p:'r2b', name:'Brine on the Claw', desc:'She stopped rinsing her talons somewhere around the third floor. Increases poison chance by 4%.',
      e:ST9B('hypogriff','venomChance',0.04) },
    { k:'r4b', p:'r3b', name:'Deep Shelf Cold', desc:'The cold she carried up out of the water has never entirely left her hands. Increases freeze chance by 4%.',
      e:ST9B('hypogriff','freezeChance',0.04) },
    { k:'r5', p:'r4a', pp:['r4b'], cost:2, icon:'🦅', name:'Two Bloods', desc:'The lion half and the eagle half stop arguing about which of them the body belongs to. Increases dodge chance by 3% and fear chance by 3%.',
      es:[ST9B('hypogriff','dodgeChance',0.03), ST9B('hypogriff','fearChance',0.03)] },
    { k:'r6', p:'r5', cost:3, icon:'🌊', name:'Breaking Surf', desc:'She stops choosing between the dive and the stoop and simply does both at once. Her strikes land 6% faster — but nothing about arriving that fast leaves room to guard, and she takes 6% more damage.',
      es:[ST9B('hypogriff','meleeCooldown',-0.06), UF9B('hypogriff','damageTakenMult',0.06)] },

    { k:'s1', p:null, name:'Beachcomber', desc:'Two lives on two sides of the waterline taught her that anything loose is eventually hers. Increases pickup magnet radius by 4%.',
      e:ST9B('hypogriff','magnetRadius',0.04) },
    { k:'s2', p:'s1', cost:2, icon:'🪨', x:['s3'], name:'Stonebreaker', desc:'Eagle talons are built to hold a thrashing fish. Put them into limestone instead and the limestone loses. Her strikes now shatter rock and tall rock outright, and 8% of what she breaks has something worth pocketing in it. Choosing this closes the reaching road for good.',
      es:[FL9B('hypogriff','shockwaveAttack',true), UF9B('hypogriff','rockCoinChance',0.08)] },
    { k:'s4a', p:'s2', name:'Shell Trick', desc:'Everything she ate as a sea creature came out of something hard, and the habit stayed. Raises the chance shattered rock pays out by 6%.',
      e:UF9B('hypogriff','rockCoinChance',0.06) },
    { k:'s5a', p:'s4a', name:'Wrecker', desc:'She has learned which stone is holding the rest of it up, and she goes for that one first. Raises the chance shattered rock pays out by a further 6%.',
      e:UF9B('hypogriff','rockCoinChance',0.06) },
    { k:'s6a', p:'s5a', name:'Salvage Right', desc:'What comes out of a wreck belongs to whoever was brave enough to go down for it. Gives kills a 4% chance to mend her.',
      e:ST9B('hypogriff','onKillHealChance',0.04) },
    { k:'s3', p:'s1', cost:2, icon:'🪶', name:'Long Talon', desc:'She stops closing the last stride and starts making the stride unnecessary. Extends her reach by a quarter of a tile. Choosing this closes the stonebreaking road for good.',
      e:UF9B('hypogriff','baseRangeTiles',0.25) },
    { k:'s4b', p:'s3', name:'Wing Measure', desc:'The wingspan was always the real weapon and she has finally started using it as one. Extends her reach by a further tenth of a tile.',
      e:UF9B('hypogriff','baseRangeTiles',0.1) },
    { k:'s5b', p:'s4b', name:'Raking Pass', desc:'Nothing she goes past comes out of it quite as whole as it went in. Increases vulnerable chance by 4%.',
      e:ST9B('hypogriff','vulnerableChance',0.04) },
    { k:'s6b', p:'s5b', name:'Out of Reach', desc:'She has arranged matters so that everything can be hit and nothing can hit back. Increases dodge chance by 4% and reduces damage taken by 4%.',
      es:[ST9B('hypogriff','dodgeChance',0.04), UF9B('hypogriff','damageTakenMult',-0.04)] },
  ],

  seapony: [
    { k:'r1', p:null, cursed:true, name:'Air Debt', desc:'Every hour she spends in a dry corridor is an hour the gills are quietly billing her for. Permanently increases damage taken by 6%. Neither current below opens any other way.',
      e:UF9B('seapony','damageTakenMult',0.06) },
    { k:'r2a', p:'r1', name:'Ballast', desc:'She stops fighting the weight and starts standing on it. Reduces damage taken by 3%.',
      e:UF9B('seapony','damageTakenMult',-0.03) },
    { k:'r3a', p:'r2a', name:'Slack Water', desc:'The turn of the tide, when the sea is holding still and deciding. Increases dodge chance by 4%.',
      e:ST9B('seapony','dodgeChance',0.04) },
    { k:'r4a', p:'r3a', name:'Kelp Bandage', desc:'Bitter, cold, and on the wound before she has finished noticing the wound. Gives kills a 4% chance to mend her.',
      e:ST9B('seapony','onKillHealChance',0.04) },
    { k:'r2b', p:'r1', name:'Stonefish Lesson', desc:'The reef taught her that the dull thing on the bottom is the one to be afraid of. Increases poison chance by 4%.',
      e:ST9B('seapony','venomChance',0.04) },
    { k:'r3b', p:'r2b', name:'Undertow', desc:'It does not pull hard. It only pulls without ever once stopping. Increases vulnerable chance by 4%.',
      e:ST9B('seapony','vulnerableChance',0.04) },
    { k:'r4b', p:'r3b', name:'Breaker', desc:'A wave that has finally found the bottom and has nowhere left to put its weight. Increases stun chance by 4%.',
      e:ST9B('seapony','stunChance',0.04) },
    { k:'r5', p:'r4a', pp:['r4b'], cost:2, icon:'🌀', name:'Set of the Tide', desc:'Holding water and moving water were never two skills, and she has stopped teaching them separately. Increases dodge chance by 3% and poison chance by 3%.',
      es:[ST9B('seapony','dodgeChance',0.03), ST9B('seapony','venomChance',0.03)] },
    { k:'r6', p:'r5', cost:3, icon:'🌊', name:'Spring Flood', desc:'She stops metering the current out and opens the whole channel. Her bolts come 6% faster — but a river that is not banked goes wherever it likes, and she takes 6% more damage.',
      es:[ST9B('seapony','fireCooldown',-0.06), UF9B('seapony','damageTakenMult',0.06)] },

    { k:'s1', p:null, name:'Reef Sense', desc:'She can hear the difference between water moving around stone and water moving around something alive. Increases luck by 4%.',
      e:ST9B('seapony','luck',0.04) },
    { k:'s2', p:'s1', cost:2, icon:'🐟', x:['s3'], name:'Call the Shoal', desc:'She was never really alone down there and she has stopped pretending she is up here. Small cold shapes answer the call and swim escort, striking whatever she is facing. Choosing this closes the deepwater road for good.',
      es:[FL9B('seapony','summonsThralls',true), UF9B('seapony','changelingMinionDmg',1.5), UF9B('seapony','changelingMinionRadius',30)] },
    { k:'s4a', p:'s2', name:'Baitball', desc:'A shoal that turns as one animal is a shoal that hits as one animal. Her escort strikes harder.',
      e:UF9B('seapony','changelingMinionDmg',1) },
    { k:'s5a', p:'s4a', name:'Running Silver', desc:'They arrive out of the dark sooner than they used to, and there are more of them behind. Shortens the wait between escorts.',
      e:UF9B('seapony','changelingSummonCooldown',-1.5) },
    { k:'s6a', p:'s5a', name:'Feeding Frenzy', desc:'Something in the water has gone wrong and every living thing in the corridor can feel it. Her escort strikes harder still and fear chance rises 4%.',
      es:[UF9B('seapony','changelingMinionDmg',1), ST9B('seapony','fearChance',0.04)] },
    { k:'s3', p:'s1', cost:2, icon:'🫧', name:'Deepwater Discipline', desc:'Alone, slow, and at a pressure nothing else in the dungeon could survive standing up in. Reduces damage taken by 5%. Choosing this closes the shoal road for good.',
      e:UF9B('seapony','damageTakenMult',-0.05) },
    { k:'s4b', p:'s3', name:'Crushing Depth', desc:'She has been carrying that weight so long she has started handing it out. Increases vulnerable chance by 4%.',
      e:ST9B('seapony','vulnerableChance',0.04) },
    { k:'s5b', p:'s4b', name:'Pressure Wave', desc:'The bolt arrives and then, a half-beat later, the water it pushed arrives too. Increases stun chance by 4%.',
      e:ST9B('seapony','stunChance',0.04) },
    { k:'s6b', p:'s5b', name:'Siren Depth', desc:'Whatever she is singing down there, the corridor has decided it would rather listen than fight. Reduces damage taken by a further 5% and increases charm chance by 3%.',
      es:[UF9B('seapony','damageTakenMult',-0.05), ST9B('seapony','charmChance',0.03)] },
  ],

  ponybot: [
    { k:'r1', p:null, cursed:true, name:'Governor Removed', desc:'The part that kept the drive from asking too much of itself is in a drawer on floor one. Permanently reduces movement speed by 8%. Neither bus below opens any other way.',
      e:ST9B('ponybot','speed',-0.08) },
    { k:'r2a', p:'r1', name:'Servo Trim', desc:'Backlash taken out of every joint, one shim at a time, over a very long night. Increases dodge chance by 4%.',
      e:ST9B('ponybot','dodgeChance',0.04) },
    { k:'r3a', p:'r2a', name:'Coolant Bleed', desc:'It vents the overflow forward now instead of down. Increases freeze chance by 4%.',
      e:ST9B('ponybot','freezeChance',0.04) },
    { k:'r4a', p:'r3a', name:'Fault Injection', desc:'It has learned where other things keep the equivalent of a loose connector. Increases vulnerable chance by 4%.',
      e:ST9B('ponybot','vulnerableChance',0.04) },
    { k:'r2b', p:'r1', name:'Klaxon Routine', desc:'An alarm tone nothing in the dungeon has heard before and nothing wants to hear twice. Increases fear chance by 4%.',
      e:ST9B('ponybot','fearChance',0.04) },
    { k:'r3b', p:'r2b', name:'Friendly Handshake', desc:'It broadcasts an identification packet. Whatever is listening decides it is on the same side. Increases charm chance by 4%.',
      e:ST9B('ponybot','charmChance',0.04) },
    { k:'r4b', p:'r3b', name:'Scrap Reclaim', desc:'Anything that stops moving near it is inventory. Gives kills a 4% chance to mend it.',
      e:ST9B('ponybot','onKillHealChance',0.04) },
    { k:'r5', p:'r4a', pp:['r4b'], cost:2, icon:'⚙', name:'Bus Arbitration', desc:'The two loops stop fighting over the same clock cycles and start sharing them. Its turrets hit harder and vulnerable chance rises 3%.',
      es:[UF9B('ponybot','turretDamageMult',0.08), ST9B('ponybot','vulnerableChance',0.03)] },
    { k:'r6', p:'r5', cost:3, icon:'🔋', name:'Cell Dump', desc:'It routes the whole reserve into the emplacements and keeps nothing back for the chassis. Its turrets hit considerably harder — but the drive is running on what is left, and it loses 6% movement speed.',
      es:[UF9B('ponybot','turretDamageMult',0.15), ST9B('ponybot','speed',-0.06)] },

    { k:'s1', p:null, name:'Thermal Survey', desc:'It maps the room by heat before it maps the room by anything else. Increases freeze chance by 4%.',
      e:ST9B('ponybot','freezeChance',0.04) },
    { k:'s2', p:'s1', cost:2, icon:'🛠', x:['s3'], name:'Forward Battery', desc:'Doctrine change: many small guns, placed early, everywhere. It can now keep two more emplacements standing at once. Choosing this closes the siege road for good.',
      e:UF9B('ponybot','maxTurrets',2) },
    { k:'s4a', p:'s2', name:'Interlocking Fire', desc:'No approach to it is covered by fewer than two of them any more. Increases fear chance by 4%.',
      e:ST9B('ponybot','fearChance',0.04) },
    { k:'s5a', p:'s4a', name:'Crossfire Doctrine', desc:'Being shot from two directions at once is not twice as bad. It is worse than that. Increases vulnerable chance by 4%.',
      e:ST9B('ponybot','vulnerableChance',0.04) },
    { k:'s6a', p:'s5a', name:'Field Repair Loop', desc:'The battery services the chassis between volleys without being asked to. Gives kills a 4% chance to mend it and increases charm chance by 3%.',
      es:[ST9B('ponybot','onKillHealChance',0.04), ST9B('ponybot','charmChance',0.03)] },
    { k:'s3', p:'s1', cost:2, icon:'🎯', name:'Siege Emplacement', desc:'Doctrine change: one gun, dug in, and nothing walks past it. Its turrets hit substantially harder. Choosing this closes the forward road for good.',
      e:UF9B('ponybot','turretDamageMult',0.12) },
    { k:'s4b', p:'s3', name:'Bored Barrel', desc:'Rifled properly this time, by a machine with nothing else to do between floors. Its turrets hit harder still.',
      e:UF9B('ponybot','turretDamageMult',0.08) },
    { k:'s5b', p:'s4b', name:'Recoil Sink', desc:'The mount takes the kick so the chassis does not have to stand in it. Increases dodge chance by 4%.',
      e:ST9B('ponybot','dodgeChance',0.04) },
    { k:'s6b', p:'s5b', name:'Registered Fire', desc:'It has shot this corridor before, in simulation, eleven thousand times. Increases vulnerable chance by 4% and bolt speed by 4%.',
      es:[ST9B('ponybot','vulnerableChance',0.04), ST9B('ponybot','boltSpeed',0.04)] },
  ],

  griffin: [
    { k:'r1', p:null, cursed:true, name:'Thermal Debt', desc:'She has been riding columns that were never meant to carry anything her size, and something in the shoulder knows it. Permanently increases damage taken by 6%. Neither line below opens any other way.',
      e:UF9B('griffin','damageTakenMult',0.06) },
    { k:'r2a', p:'r1', name:'Wing Loading', desc:'She has learned exactly how much air she is allowed to ask for. Reduces damage taken by 3%.',
      e:UF9B('griffin','damageTakenMult',-0.03) },
    { k:'r3a', p:'r2a', name:'Sideslip', desc:'A hunting bird does not dodge. It simply stops being in that particular column of air. Increases dodge chance by 4%.',
      e:ST9B('griffin','dodgeChance',0.04) },
    { k:'r4a', p:'r3a', name:'Hammer Strike', desc:'The stoop ends with a closed fist rather than an open claw, which surprises everything it lands on. Increases stun chance by 4%.',
      e:ST9B('griffin','stunChance',0.04) },
    { k:'r2b', p:'r1', name:'Carrion Quill', desc:'She has stopped being careful about what the feathers have been through. Increases poison chance by 4%.',
      e:ST9B('griffin','venomChance',0.04) },
    { k:'r3b', p:'r2b', name:'Broadhead Vane', desc:'A quill cut wide at the tip, which is a decision about the wound and not about the flight. Increases stun chance by 4%.',
      e:ST9B('griffin','stunChance',0.04) },
    { k:'r4b', p:'r3b', name:'Nesting Instinct', desc:'Everything shiny within a hundred strides has been quietly reclassified as hers. Increases pickup magnet radius by 5%.',
      e:ST9B('griffin','magnetRadius',0.05) },
    { k:'r5', p:'r4a', pp:['r4b'], cost:2, icon:'🪽', name:'Hunter and Hoarder', desc:'The two halves of what a griffin is for turn out to make each other faster. Increases dodge chance by 3% and poison chance by 4%.',
      es:[ST9B('griffin','dodgeChance',0.03), ST9B('griffin','venomChance',0.04)] },
    { k:'r6', p:'r5', cost:3, icon:'💨', name:'Full Stoop', desc:'She folds completely and lets the whole altitude go at once. Her volleys come 6% faster — but there is no steering left in a dive like that, and she takes 6% more damage.',
      es:[ST9B('griffin','fireCooldown',-0.06), UF9B('griffin','damageTakenMult',0.06)] },

    { k:'s1', p:null, name:'Eye of the Hunter', desc:'She has picked the target before the rest of the room has noticed there is a room. Increases luck by 4%.',
      e:ST9B('griffin','luck',0.04) },
    { k:'s2', p:'s1', cost:2, icon:'🎏', x:['s3'], name:'Feather Volley', desc:'She stops throwing quills one at a time and starts throwing the whole handful. Her attack becomes a drawn fan of three quills loosed together, which takes a beat to set and covers ground no single shot ever did. Choosing this closes the stooping road for good.',
      es:[FL9B('griffin','charged',true), FL9B('griffin','crystalVolley',true), UF9B('griffin','crystalShardCount',3), UF9B('griffin','chargeTime',0.45)] },
    { k:'s4a', p:'s2', name:'Fourth Quill', desc:'There was always room in the draw for one more and she has finally admitted it. Adds a quill to the fan.',
      e:UF9B('griffin','crystalShardCount',1) },
    { k:'s5a', p:'s4a', name:'Fanned Cover', desc:'Standing behind a wall of her own quills turns out to be very nearly as good as standing behind a wall. Increases dodge chance by 4%.',
      e:ST9B('griffin','dodgeChance',0.04) },
    { k:'s6a', p:'s5a', name:'Quick Draw', desc:'The fan sets in noticeably less time than it used to, because she has stopped watching herself do it. Shortens the draw.',
      e:UF9B('griffin','chargeTime',-0.1) },
    { k:'s3', p:'s1', cost:2, icon:'🏔', name:'Stooping Hunter', desc:'One quill, one target, and a great deal of patience about which target. Reduces damage taken by 5%. Choosing this closes the volley road for good.',
      e:UF9B('griffin','damageTakenMult',-0.05) },
    { k:'s4b', p:'s3', name:'Eyrie Tithe', desc:'She takes something from every kill back to a nest that is four floors behind her. Increases pickup magnet radius by 4%.',
      e:ST9B('griffin','magnetRadius',0.04) },
    { k:'s5b', p:'s4b', name:'Old Blood on the Beak', desc:'Nothing she has eaten this week has been fresh and it has stopped bothering her. Increases poison chance by 4%.',
      e:ST9B('griffin','venomChance',0.04) },
    { k:'s6b', p:'s5b', name:'Sovereign of the Ridge', desc:'She has decided the corridor is a ridge and that ridges have owners. Reduces damage taken by a further 4% and increases luck by 3%.',
      es:[UF9B('griffin','damageTakenMult',-0.04), ST9B('griffin','luck',0.03)] },
  ],

  kirin: [
    { k:'r1', p:null, cursed:true, name:'Kindled Debt', desc:'She has stopped going to the stream to put it out, and the not-putting-it-out costs her something every day. Permanently increases damage taken by 6%. Neither line below opens any other way.',
      e:UF9B('kirin','damageTakenMult',0.06) },
    { k:'r2a', p:'r1', name:'Banked Coals', desc:'Covered over at night so there is still something there in the morning. Reduces damage taken by 3%.',
      e:UF9B('kirin','damageTakenMult',-0.03) },
    { k:'r3a', p:'r2a', name:'Warmth Returned', desc:'What the fire takes from the room it gives back to her, eventually, in its own currency. Gives kills a 4% chance to mend her.',
      e:ST9B('kirin','onKillHealChance',0.04) },
    { k:'r4a', p:'r3a', name:'Village Silence', desc:'Everything in the corridor has worked out what she is and has elected, as a group, to say nothing. Increases fear chance by 4%.',
      e:ST9B('kirin','fearChance',0.04) },
    { k:'r2b', p:'r1', name:'Flash Frost', desc:'Heat leaving a thing that fast is indistinguishable, from the inside, from cold. Increases freeze chance by 4%.',
      e:ST9B('kirin','freezeChance',0.04) },
    { k:'r3b', p:'r2b', name:'Smoke in the Lungs', desc:'It is not the fire that finishes most of them and it never was. Increases poison chance by 4%.',
      e:ST9B('kirin','venomChance',0.04) },
    { k:'r4b', p:'r3b', name:'Backdraft', desc:'The air comes back into the room all at once and takes whatever was standing in the doorway with it. Increases stun chance by 4%.',
      e:ST9B('kirin','stunChance',0.04) },
    { k:'r5', p:'r4a', pp:['r4b'], cost:2, icon:'🔥', name:'Nirik and Kirin', desc:'The two of her stop taking turns. Increases fear chance by 4% and freeze chance by 3%.',
      es:[ST9B('kirin','fearChance',0.04), ST9B('kirin','freezeChance',0.03)] },
    { k:'r6', p:'r5', cost:3, icon:'🌋', name:'Open Flame', desc:'She stops holding the breath in while it builds and simply lets it go the moment it is lit. Her breath comes considerably sooner — but there is nothing between her and the room any more, and she takes 6% more damage.',
      es:[UF9B('kirin','chargeTime',-0.12), UF9B('kirin','damageTakenMult',0.06)] },

    { k:'s1', p:null, name:'Ash on the Tongue', desc:'She can taste which way the fire wants to go before she has decided whether to let it. Increases pickup magnet radius by 4%.',
      e:ST9B('kirin','magnetRadius',0.04) },
    { k:'s2', p:'s1', cost:2, icon:'🕯', x:['s3'], name:'Ashfall Cadence', desc:'Small breaths, taken often, given out before they have time to become anything worse. Shortens the time her breath takes to build. Choosing this closes the patient road for good.',
      e:UF9B('kirin','chargeTime',-0.15) },
    { k:'s4a', p:'s2', name:'Ember Spit', desc:'What leaves her now is barely lit and travelling very fast indeed. Increases bolt speed by 4%.',
      e:ST9B('kirin','boltSpeed',0.04) },
    { k:'s5a', p:'s4a', name:'Hearthbeat', desc:'A rhythm rather than an event, and nothing standing in front of it gets a beat of its own. Increases stun chance by 4%.',
      e:ST9B('kirin','stunChance',0.04) },
    { k:'s6a', p:'s5a', name:'Cinderfall', desc:'The room is warm and getting warmer and nopony in it can name the moment that started. Increases fear chance by 5%.',
      e:ST9B('kirin','fearChance',0.05) },
    { k:'s3', p:'s1', cost:2, icon:'⏳', name:"Nirik's Patience", desc:'She holds it. She holds it past the point where holding it is sensible, because what comes out the other side is worth the wait. Increases poison chance by 6% — but her breath takes markedly longer to build. Choosing this closes the cadence road for good.',
      es:[ST9B('kirin','venomChance',0.06), UF9B('kirin','chargeTime',0.2)] },
    { k:'s4b', p:'s3', name:'Long Inhale', desc:'The cold goes in before the heat comes out, which nopony has ever been able to explain to her satisfaction. Increases freeze chance by 4%.',
      e:ST9B('kirin','freezeChance',0.04) },
    { k:'s5b', p:'s4b', name:'Stream of Silence', desc:'The old remedy, remembered rather than used, and it works on the room instead of on her. Increases charm chance by 4%.',
      e:ST9B('kirin','charmChance',0.04) },
    { k:'s6b', p:'s5b', name:'Wildfire Season', desc:'She has stopped thinking of it as something that happens to her. Gives kills a 5% chance to mend her and increases fear chance by 4%.',
      es:[ST9B('kirin','onKillHealChance',0.05), ST9B('kirin','fearChance',0.04)] },
  ],
};

const SKILL_TREE_CHARACTER_NODES_9B = [];
(function buildCharacterSkillNodes9B(){
  for (const classId in SKILL_TREE_CHARACTER_CONFIG_9B) {
    const full = key => 'char_' + classId + '_' + key;
    for (const entry of SKILL_TREE_CHARACTER_CONFIG_9B[classId]) {
      const node = {
        id: full(entry.k),
        parent: entry.p == null ? ('char_hub_' + classId) : full(entry.p),
        cost: entry.cost || 1,
        name: entry.name,
        desc: entry.desc,
      };
      if (entry.pp) node.parents = entry.pp.map(full);
      if (entry.x) node.excludes = entry.x.map(full);
      if (entry.icon) node.icon = entry.icon;
      if (entry.es) node.effects = entry.es;
      else node.effect = entry.e || null;
      if (entry.cursed) node.cursed = true;
      SKILL_TREE_CHARACTER_NODES_9B.push(node);
    }
  }
})();

for (const n of SKILL_TREE_CHARACTER_NODES_9B) {
  SKILL_TREE_NODES.push(n);
  SKILL_TREE_NODES_BY_ID[n.id] = n;
}
