'use strict';

const SKILL_TREE_UF_BOUNDS_9A = {
  'earth|damageTakenMult':     { min:-0.25, max:0.25 },
  'earth|rockCoinChance':      { min:0,     max:0.25 },
  'pegasus|damageTakenMult':   { min:-0.25, max:0.25 },
  'pegasus|baseRangeTiles':    { min:0,     max:1.5 },
  'unicorn|damageTakenMult':   { min:-0.25, max:0.25 },
  'unicorn|radius':            { min:-2,    max:2 },
  'unicorn|chargeTime':        { min:0,     max:1.2 },
  'batpony|damageTakenMult':   { min:-0.25, max:0.25 },
  'batpony|radius':            { min:-2,    max:2 },
  'batpony|changelingMinionDmg':      { min:0, max:1 },
  'batpony|changelingSummonCooldown': { min:-4, max:0 },
  'zebra|damageTakenMult':     { min:-0.25, max:0.25 },
  'zebra|radius':              { min:-2,    max:2 },
};

function ST9A(classId, stat, amount){ return { type:'stat', classId, stat, amount }; }
function UF9A(classId, field, amount){
  const b = SKILL_TREE_UF_BOUNDS_9A[classId + '|' + field];
  return { type:'uniqueField', classId, field, amount, min:b.min, max:b.max };
}
function FL9A(classId, field, value){ return { type:'uniqueFlag', classId, field, value }; }

const SKILL_TREE_CHARACTER_CONFIG_9A = {

  earth: [
    { k:'r1', p:null, cursed:true, name:'Quarry Debt', desc:'The quarry road is the only road down off the ridge, and it has never once been kind to a pony walking it. Permanently increases damage taken by 6%. Both forks below open no other way.',
      e:UF9A('earth','damageTakenMult',0.06) },
    { k:'r2a', p:'r1', name:'Drystone Courses', desc:'Stone laid without mortar holds because every piece leans on the next one. She learns to stand the same way. Reduces damage taken by 3%.',
      e:UF9A('earth','damageTakenMult',-0.03) },
    { k:'r3a', p:'r2a', name:'Keyed Capstone', desc:'One stone sits at the top of the arch and every other stone in it is arguing with that one. Reduces damage taken by a further 2%.',
      e:UF9A('earth','damageTakenMult',-0.02) },
    { k:'r4a', p:'r3a', name:'Mortar Line', desc:'A wall that gives a finger-width in the right place outlasts a wall that gives none. Increases dodge chance by 4%.',
      e:ST9A('earth','dodgeChance',0.04) },
    { k:'r2b', p:'r1', name:'Wedge and Feather', desc:'Two iron feathers, one wedge, and the ridge splits along a line nopony could see. Increases stun chance by 4%.',
      e:ST9A('earth','stunChance',0.04) },
    { k:'r3b', p:'r2b', name:'Splitting Blow', desc:'Everything has a seam. Hers is the hoof that finds it on the first try. Increases vulnerable chance by 4%.',
      e:ST9A('earth','vulnerableChance',0.04) },
    { k:'r4b', p:'r3b', name:'Dust Choke', desc:'A split face throws up rock flour that hangs in the air for a minute and makes cowards of anything breathing it. Increases fear chance by 4%.',
      e:ST9A('earth','fearChance',0.04) },
    { k:'r5', p:'r4a', pp:['r4b'], cost:2, icon:'⛰', name:'Quarry Face', desc:'Walling and splitting turn out to be the same trade learned from opposite ends, and she has now learned both. Increases dodge chance by 3% and stun chance by 3%.',
      es:[ST9A('earth','dodgeChance',0.03), ST9A('earth','stunChance',0.03)] },
    { k:'r6', p:'r5', cost:3, icon:'💥', name:'Blast Shot', desc:'She stops placing the charge carefully and starts placing it fast. Everything near the face comes apart — increases vulnerable chance by 5% — but she is always half-running from her own work, and the hurry costs 5% movement speed.',
      es:[ST9A('earth','vulnerableChance',0.05), ST9A('earth','speed',-0.05)] },

    { k:'s1', p:null, name:'Reading the Ground', desc:'Before the first swing she walks the whole face once, looking at nothing in particular. Increases pickup magnet radius by 4%.',
      e:ST9A('earth','magnetRadius',0.04) },
    { k:'s2', p:'s1', cost:2, icon:'⛏', x:['s3','s4'], name:'Quarryhoof', desc:'She stops working around the rock and starts working through it. Her hooves now shatter rock and tall rock outright on contact, and 8% of the stone she breaks has something worth pocketing in it. Choosing this closes the other two roads.',
      es:[FL9A('earth','shockwaveAttack',true), UF9A('earth','rockCoinChance',0.08)] },
    { k:'s5a', p:'s2', name:"Prospector's Ear", desc:'A struck stone rings differently when there is a pocket behind it, and she has started listening for it. Raises the chance shattered rock pays out by 6%.',
      e:UF9A('earth','rockCoinChance',0.06) },
    { k:'s6a', p:'s5a', name:'Gemstone Seam', desc:'The seam runs deeper than the survey said and she has told nopony. Raises the chance shattered rock pays out by a further 6%.',
      e:UF9A('earth','rockCoinChance',0.06) },
    { k:'s3', p:'s1', cost:2, icon:'🌾', x:['s4'], name:'Threshing Stance', desc:'The flail, not the pick. She works a crowd the way a thresher works a floor of barley. Increases stun chance by 4%. Choosing this closes the other two roads.',
      e:ST9A('earth','stunChance',0.04) },
    { k:'s5b', p:'s3', name:'Flail Rhythm', desc:'Set the rhythm early and nothing on the floor gets a beat of its own. Increases stun chance by a further 3%.',
      e:ST9A('earth','stunChance',0.03) },
    { k:'s6b', p:'s5b', name:'Winnowed', desc:'Chaff goes up, grain stays down, and everything on the barn floor learns which one it is. Increases fear chance by 4%.',
      e:ST9A('earth','fearChance',0.04) },
    { k:'s4', p:'s1', cost:2, icon:'🚧', name:'Deep Furrow Watch', desc:'She does not clear the field so much as occupy it, and she has been occupying it a long time. Increases dodge chance by 4%. Choosing this closes the other two roads.',
      e:ST9A('earth','dodgeChance',0.04) },
    { k:'s5c', p:'s4', name:'Hedgerow Eyes', desc:'Thorn and blackthorn on three sides and her on the fourth. Reduces damage taken by 3%.',
      e:UF9A('earth','damageTakenMult',-0.03) },
    { k:'s6c', p:'s5c', name:'Gatekeeper', desc:'The gap in the hedge is where everything has to come through, and she has made it her whole job. Increases dodge chance by a further 3%.',
      e:ST9A('earth','dodgeChance',0.03) },
  ],

  pegasus: [
    { k:'r1', p:null, cursed:true, name:'Thin Air Debt', desc:'Flying the cold layer where the fronts meet costs her something every single time, and it is never given back. Permanently increases damage taken by 6%. Both fronts below open no other way.',
      e:UF9A('pegasus','damageTakenMult',0.06) },
    { k:'r2a', p:'r1', name:'Cold Front', desc:'She drags the cold layer down with her and everything under it stiffens. Increases freeze chance by 4%.',
      e:ST9A('pegasus','freezeChance',0.04) },
    { k:'r3a', p:'r2a', name:'Rime Wing', desc:'Ice forms on the leading edge of a wing that holds the cold long enough, and it comes off on whatever she hits. Increases freeze chance by a further 4%.',
      e:ST9A('pegasus','freezeChance',0.04) },
    { k:'r4a', p:'r3a', name:'Glazed Over', desc:'A body that has been cold for a moment is a body that has forgotten how to guard itself. Increases vulnerable chance by 4%.',
      e:ST9A('pegasus','vulnerableChance',0.04) },
    { k:'r2b', p:'r1', name:'Shear Line', desc:'Two winds meeting at an angle will knock anything standing in the seam flat. Increases stun chance by 4%.',
      e:ST9A('pegasus','stunChance',0.04) },
    { k:'r3b', p:'r2b', name:'Rotor Cloud', desc:'The ugly ragged roll of cloud that forms under a mountain wave. Nothing that has seen one wants to be under it twice. Increases fear chance by 4%.',
      e:ST9A('pegasus','fearChance',0.04) },
    { k:'r4b', p:'r3b', name:'Gust Front', desc:'The wind arrives a full second before she does. Extends her reach by 0.1 tiles.',
      e:UF9A('pegasus','baseRangeTiles',0.1) },
    { k:'r5', p:'r4a', pp:['r4b'], cost:2, icon:'🌀', name:'Eye of the Storm', desc:'Cold front and shear line close around the same point, and she is standing in the calm at the middle of it. Reduces damage taken by 4% and increases freeze chance by 3%.',
      es:[UF9A('pegasus','damageTakenMult',-0.04), ST9A('pegasus','freezeChance',0.03)] },
    { k:'r6', p:'r5', cost:3, icon:'⚡', name:'Downburst', desc:'She drops the whole column at once instead of steering it. Her strikes land 6% faster — but riding the collapse down means she arrives with it, and takes 5% more damage for the privilege.',
      es:[ST9A('pegasus','meleeCooldown',-0.06), UF9A('pegasus','damageTakenMult',0.05)] },

    { k:'s1', p:null, name:'Weather Sense', desc:'She can feel a pressure drop in her wing joints an hour before it arrives, and it has never once been wrong. Increases luck by 4%.',
      e:ST9A('pegasus','luck',0.04) },
    { k:'s2', p:'s1', cost:2, icon:'🗡', x:['s3'], name:"Skirmisher's Line", desc:'The weather team is a fine career and she has decided against it. Increases critical hit chance by 4%. Choosing this closes the cloudwright road for good.',
      e:ST9A('pegasus','critChance',0.04) },
    { k:'s4a', p:'s2', name:'Diving Pass', desc:'Height spent all at once, in the one second it is worth anything. Increases critical hit chance by a further 3%.',
      e:ST9A('pegasus','critChance',0.03) },
    { k:'s5a', p:'s4a', name:'Talon Turn', desc:'The turn at the bottom of the dive is the part that hurts, and she has stopped caring. Increases vulnerable chance by 4%.',
      e:ST9A('pegasus','vulnerableChance',0.04) },
    { k:'s6a', p:'s5a', name:'Sonic Entry', desc:'She comes in loud enough that the first rank never gets its guard up. Increases stun chance by 4%.',
      e:ST9A('pegasus','stunChance',0.04) },
    { k:'s3', p:'s1', cost:2, icon:'☁', name:"Cloudwright's Vigil", desc:'She builds instead of dives — and what she builds, she stands behind. Reduces damage taken by 5%. Choosing this closes the skirmisher road for good.',
      e:UF9A('pegasus','damageTakenMult',-0.05) },
    { k:'s4b', p:'s3', name:'Anvil Cloud', desc:'Packed flat and hard at the top where the storm ran out of sky to climb. Reduces damage taken by a further 4%.',
      e:UF9A('pegasus','damageTakenMult',-0.04) },
    { k:'s5b', p:'s4b', name:'Updraft Cushion', desc:'Anything that swings at her swings into a column of rising air first. Increases fear chance by 4%.',
      e:ST9A('pegasus','fearChance',0.04) },
    { k:'s6b', p:'s5b', name:'Stormwall', desc:'She has stopped building weather and started building architecture out of it. Reduces damage taken by a further 4% and extends her reach by 0.05 tiles.',
      es:[UF9A('pegasus','damageTakenMult',-0.04), UF9A('pegasus','baseRangeTiles',0.05)] },
  ],

  unicorn: [
    { k:'r1', p:null, cursed:true, name:'Burnt Reserve', desc:'She has been drawing on the deep reserve for years and the horn has started charging her interest on it. Permanently increases damage taken by 6%. Neither discipline below opens any other way.',
      e:UF9A('unicorn','damageTakenMult',0.06) },
    { k:'r2a', p:'r1', name:'Contracted Aura', desc:'She pulls the field in tight against her coat instead of letting it hang loose. She presents a smaller target.',
      e:UF9A('unicorn','radius',-0.3) },
    { k:'r3a', p:'r2a', name:'Standing Ward', desc:'A ward that is never dropped is a ward that is never late. Reduces damage taken by 4%.',
      e:UF9A('unicorn','damageTakenMult',-0.04) },
    { k:'r4a', p:'r3a', name:'Slip Sigil', desc:'The ward is shaped to turn a blow aside rather than meet it. Increases dodge chance by 4%.',
      e:ST9A('unicorn','dodgeChance',0.04) },
    { k:'r2b', p:'r1', name:'Bitter Glyph', desc:'A curse worked into the bolt itself, riding along and waiting for skin. Increases poison chance by 4%.',
      e:ST9A('unicorn','venomChance',0.04) },
    { k:'r3b', p:'r2b', name:'Freezing Script', desc:'The second line of the glyph does nothing but take heat out of whatever it lands on. Increases freeze chance by 4%.',
      e:ST9A('unicorn','freezeChance',0.04) },
    { k:'r4b', p:'r3b', name:'Unravelling Mark', desc:'The third line simply tells a thing to come apart, and most things listen. Increases vulnerable chance by 4%.',
      e:ST9A('unicorn','vulnerableChance',0.04) },
    { k:'r5', p:'r4a', pp:['r4b'], cost:2, icon:'✶', name:'Unified Field', desc:'Ward-work and curse-work were the same equation read in two directions, which is obvious once somepony finally writes both halves down. Increases luck by 4% and reduces damage taken by 3%.',
      es:[ST9A('unicorn','luck',0.04), UF9A('unicorn','damageTakenMult',-0.03)] },
    { k:'r6', p:'r5', cost:3, icon:'🔮', name:'Overchannel', desc:'She stops waiting for the horn to be ready and simply takes what is there. Cuts her charge time considerably — but nothing shields the caster while the reserve is open, and she takes 6% more damage.',
      es:[UF9A('unicorn','chargeTime',-0.15), UF9A('unicorn','damageTakenMult',0.06)] },

    { k:'s1', p:null, name:'Horn Discipline', desc:'Two hours of scales every morning before she is allowed to cast anything interesting. It shows. Increases luck by 4%.',
      e:ST9A('unicorn','luck',0.04) },
    { k:'s2', p:'s1', cost:2, icon:'🜂', x:['s3'], name:'Evocation', desc:'The loud school. Everything she knows now points outward. Increases stun chance by 4%. Choosing this closes abjuration to her permanently.',
      e:ST9A('unicorn','stunChance',0.04) },
    { k:'s4a', p:'s2', name:'Shattering Bolt', desc:'The bolt is built to break on impact and let the break do the work. Increases vulnerable chance by 4%.',
      e:ST9A('unicorn','vulnerableChance',0.04) },
    { k:'s5a', p:'s4a', name:'Ember Lattice', desc:'A structure of cold fire that hangs in the air a half-second after the bolt has gone. Increases freeze chance by 4%.',
      e:ST9A('unicorn','freezeChance',0.04) },
    { k:'s6a', p:'s5a', name:'Runaway Cascade', desc:'The reaction stopped needing her about four steps ago and she is only here to point it. Increases poison chance by 4%.',
      e:ST9A('unicorn','venomChance',0.04) },
    { k:'s3', p:'s1', cost:2, icon:'🛡', name:'Abjuration', desc:'The quiet school. Nothing she knows now points outward at all. Reduces damage taken by 5%. Choosing this closes evocation to her permanently.',
      e:UF9A('unicorn','damageTakenMult',-0.05) },
    { k:'s4b', p:'s3', name:'Sigil Ward', desc:'The ward is drawn on her rather than around her, and it fits like a second coat. She presents a smaller target.',
      e:UF9A('unicorn','radius',-0.3) },
    { k:'s5b', p:'s4b', name:'Mirror Glaze', desc:'A finish on the ward so slick that half of what arrives never gets a grip on it. Increases dodge chance by 4%.',
      e:ST9A('unicorn','dodgeChance',0.04) },
    { k:'s6b', p:'s5b', name:'Sanctum', desc:'Wherever she is standing has become, by her own ruling, consecrated ground. Reduces damage taken by a further 4% and gives kills a 3% chance to mend her.',
      es:[UF9A('unicorn','damageTakenMult',-0.04), ST9A('unicorn','onKillHealChance',0.03)] },
  ],

  batpony: [
    { k:'r1', p:null, cursed:true, name:'Sunblind', desc:'She has started hunting into the grey hour on either side of the night, and her eyes have not forgiven her for it. Permanently increases damage taken by 6%. Neither hunting line below opens any other way.',
      e:UF9A('batpony','damageTakenMult',0.06) },
    { k:'r2a', p:'r1', name:'Roost Call', desc:'The colony answers a call it has heard since it could fly. Her roostmates strike harder.',
      e:UF9A('batpony','changelingMinionDmg',0.06) },
    { k:'r3a', p:'r2a', name:'Close Rafters', desc:'They roost nearer to her now, which means they drop in sooner. Shortens the wait between roostmates.',
      e:UF9A('batpony','changelingSummonCooldown',-0.5) },
    { k:'r4a', p:'r3a', name:'Blooded Wings', desc:'A colony that has fed well is a colony that hits like one animal. Her roostmates strike harder still.',
      e:UF9A('batpony','changelingMinionDmg',0.06) },
    { k:'r2b', p:'r1', name:'Ranging Cry', desc:'A call thrown wide comes back carrying the shape of everything loose on the floor. Increases pickup magnet radius by 6%.',
      e:ST9A('batpony','magnetRadius',0.06) },
    { k:'r3b', p:'r2b', name:'Returning Echo', desc:'She knows where a thing is standing before it has finished standing there. Extends her attack range by 5%.',
      e:ST9A('batpony','rangeTiles',0.05) },
    { k:'r4b', p:'r3b', name:'Read in the Dark', desc:'The echo comes back detailed enough to pick the gap in a guard. Increases vulnerable chance by 4%.',
      e:ST9A('batpony','vulnerableChance',0.04) },
    { k:'r5', p:'r4a', pp:['r4b'], cost:2, icon:'🦇', name:'Hunting Cry', desc:'One call that tells the colony where to fall and tells the floor what is about to happen to it. Her roostmates strike harder and fear chance rises 3%.',
      es:[UF9A('batpony','changelingMinionDmg',0.06), ST9A('batpony','fearChance',0.03)] },
    { k:'r6', p:'r5', cost:3, icon:'🌑', name:'Nightfall Swarm', desc:'She stops calling them and simply stops telling them to wait. Roostmates arrive markedly sooner — but a colony in the air around her is a colony that is not covering her, and she takes 6% more damage.',
      es:[UF9A('batpony','changelingSummonCooldown',-0.5), UF9A('batpony','damageTakenMult',0.06)] },

    { k:'s1', p:null, name:'Dusk Sense', desc:'She wakes at the exact minute the light turns, every night, without ever having learned how. Increases luck by 4%.',
      e:ST9A('batpony','luck',0.04) },
    { k:'s2', p:'s1', cost:2, icon:'🩸', x:['s3'], name:'Bloodwing', desc:'The hunger wins the argument and she stops holding it at the table. Increases poison chance by 4%. Choosing this closes the shadow road for good.',
      e:ST9A('batpony','venomChance',0.04) },
    { k:'s4a', p:'s2', name:'Serrated Fang', desc:'A tooth shaped so the wound keeps its own appointment long after she has let go. Increases poison chance by a further 4%.',
      e:ST9A('batpony','venomChance',0.04) },
    { k:'s5a', p:'s4a', name:'Dizzying Bite', desc:'Whatever is in the bite, it is not only in the blood. Increases stun chance by 4%.',
      e:ST9A('batpony','stunChance',0.04) },
    { k:'s6a', p:'s5a', name:'Terror Feed', desc:'Everything in the room has worked out what she is and what the room is for. Increases fear chance by 4%.',
      e:ST9A('batpony','fearChance',0.04) },
    { k:'s3', p:'s1', cost:2, icon:'🌫', name:'Shadowcloak', desc:'The hunger loses the argument and she goes quiet instead. Increases dodge chance by 4% and reduces damage taken by 5%. Choosing this closes the blood road for good.',
      es:[ST9A('batpony','dodgeChance',0.04), UF9A('batpony','damageTakenMult',-0.05)] },
    { k:'s4b', p:'s3', name:'Silent Membrane', desc:'Wing skin that makes no sound at all against the air, folded tight to her ribs. She presents a smaller target.',
      e:UF9A('batpony','radius',-0.3) },
    { k:'s5b', p:'s4b', name:'Umbral Step', desc:'She is not where the swing expected her, and she never really was. Increases dodge chance by a further 4%.',
      e:ST9A('batpony','dodgeChance',0.04) },
    { k:'s6b', p:'s5b', name:'Nightshroud', desc:'Things stop being able to decide whether she is there, and some of them stop wanting to decide. Reduces damage taken by a further 5% and increases charm chance by 3%.',
      es:[UF9A('batpony','damageTakenMult',-0.05), ST9A('batpony','charmChance',0.03)] },
  ],

  zebra: [
    { k:'r1', p:null, cursed:true, name:'Bitter Draught', desc:'The first cup of the rattle road is drunk before dawn and it never stops being the worst thing she does all day. Permanently increases damage taken by 6%. Neither line below opens any other way.',
      e:UF9A('zebra','damageTakenMult',0.06) },
    { k:'r2a', p:'r1', name:'Ward Post', desc:'A carved post set at the edge of a camp does most of its work before anything arrives. Reduces damage taken by 4%.',
      e:UF9A('zebra','damageTakenMult',-0.04) },
    { k:'r3a', p:'r2a', name:'Ash Circle', desc:'Ash and ground bone, laid in a ring, and she has stood inside one since she was a foal. Increases dodge chance by 4%.',
      e:ST9A('zebra','dodgeChance',0.04) },
    { k:'r4a', p:'r3a', name:'Drawn Thin', desc:'The ring is only useful if she stays small inside it, and she has learned to. She presents a smaller target.',
      e:UF9A('zebra','radius',-0.3) },
    { k:'r2b', p:'r1', name:'Rattle and Smoke', desc:'The noise is for the living and the smoke is for whatever the living have brought with them. Increases fear chance by 4%.',
      e:ST9A('zebra','fearChance',0.04) },
    { k:'r3b', p:'r2b', name:'Honeyed Word', desc:'One line of the old tongue, pitched low, and something that came to kill her sits down instead. Increases charm chance by 4%.',
      e:ST9A('zebra','charmChance',0.04) },
    { k:'r4b', p:'r3b', name:'Softening Brew', desc:'It does nothing on its own. It only makes the next thing work. Increases vulnerable chance by 4%.',
      e:ST9A('zebra','vulnerableChance',0.04) },
    { k:'r5', p:'r4a', pp:['r4b'], cost:2, icon:'🏺', name:'Mask and Mortar', desc:'The ward keeps her standing and the brew keeps the rest of the room from wanting to. Gives kills a 4% chance to mend her and increases luck by 4%.',
      es:[ST9A('zebra','onKillHealChance',0.04), ST9A('zebra','luck',0.04)] },
    { k:'r6', p:'r5', cost:3, icon:'⚗', name:'Last Reagent', desc:'She puts the thing she was saving into the mortar, because there is no later left to save it for. Her strikes land 7% faster — but there is no ward left in the bag afterwards, and she takes 6% more damage.',
      es:[ST9A('zebra','meleeCooldown',-0.07), UF9A('zebra','damageTakenMult',0.06)] },

    { k:'s1', p:null, name:"Apothecary's Eye", desc:'She can tell what a root is for by the ground it came out of, and she is almost never wrong. Increases luck by 4%.',
      e:ST9A('zebra','luck',0.04) },
    { k:'s2', p:'s1', cost:2, icon:'🎭', x:['s3'], name:'Warpaint', desc:'The stripes are already a warning. She has decided to make them an argument. Increases vulnerable chance by 4%. Choosing this closes the healer road for good.',
      e:ST9A('zebra','vulnerableChance',0.04) },
    { k:'s4a', p:'s2', name:'Striped Feint', desc:'Nothing that has looked straight at her is sure how many of her there are. Increases stun chance by 4%.',
      e:ST9A('zebra','stunChance',0.04) },
    { k:'s5a', p:'s4a', name:'Rattle Charm', desc:'Bone on bone, a rhythm older than the road, and it gets into a chest and stays there. Increases fear chance by 4%.',
      e:ST9A('zebra','fearChance',0.04) },
    { k:'s6a', p:'s5a', name:'Hex Brand', desc:'Painted on in the dark and warm to the touch a day later. Increases charm chance by 4%.',
      e:ST9A('zebra','charmChance',0.04) },
    { k:'s3', p:'s1', cost:2, icon:'🌿', name:'Poultice', desc:'The same shelf, the same jars, used for the opposite purpose. Gives kills a 4% chance to mend her. Choosing this closes the warpaint road for good.',
      e:ST9A('zebra','onKillHealChance',0.04) },
    { k:'s4b', p:'s3', name:'Bound Wounds', desc:'Wrapped properly the first time, so it does not have to be wrapped again in an hour. Reduces damage taken by 5%.',
      e:UF9A('zebra','damageTakenMult',-0.05) },
    { k:'s5b', p:'s4b', name:'Tonic Roots', desc:'Bitter enough that the body sits up and starts paying attention. Increases dodge chance by 4%.',
      e:ST9A('zebra','dodgeChance',0.04) },
    { k:'s6b', p:'s5b', name:'Long Simmer', desc:'Eleven hours on a low fire, and the pot has not been off it since the second floor. Reduces damage taken by a further 5% and increases pickup magnet radius by 4%.',
      es:[UF9A('zebra','damageTakenMult',-0.05), ST9A('zebra','magnetRadius',0.04)] },
  ],
};

const SKILL_TREE_CHARACTER_NODES_9A = [];
(function buildCharacterSkillNodes9A(){
  for (const classId in SKILL_TREE_CHARACTER_CONFIG_9A) {
    const full = key => 'char_' + classId + '_' + key;
    for (const entry of SKILL_TREE_CHARACTER_CONFIG_9A[classId]) {
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
      SKILL_TREE_CHARACTER_NODES_9A.push(node);
    }
  }
})();

for (const n of SKILL_TREE_CHARACTER_NODES_9A) {
  SKILL_TREE_NODES.push(n);
  SKILL_TREE_NODES_BY_ID[n.id] = n;
}
