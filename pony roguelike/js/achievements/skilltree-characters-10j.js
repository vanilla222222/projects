'use strict';

const SKILL_TREE_UF_BOUNDS_10J = {
  'snowpitymare|damageTakenMult': { min:-0.25, max:0.6 },
  'snowpitymare|radius':          { min:-2,    max:2 },
};

function ST10J(classId, stat, amount, perRank){
  const e = { type:'stat', classId, stat, amount };
  if (perRank != null) e.perRank = perRank;
  return e;
}
function UF10J(classId, field, amount){
  const b = SKILL_TREE_UF_BOUNDS_10J[classId + '|' + field];
  return { type:'uniqueField', classId, field, amount, min:b.min, max:b.max };
}
function FL10J(classId, field, value){ return { type:'uniqueFlag', classId, field, value }; }
function SY10J(classId, stat, perOwned, tag){ return { type:'synergyStat', classId, stat, perOwned, tag }; }

const SKILL_TREE_CHARACTER_CONFIG_10J = {

  snowpitymare: [

    { k:'t1', p:null, cursed:true, name:'Thin Ice Underhoof', desc:'A winter spirit who never learned to strike carries a sliver of black lake ice that has never once melted since floor one, and nopony has ever talked her out of it. Permanently increases damage taken by 6%. Neither road below opens any other way.',
      e:UF10J('snowpitymare','damageTakenMult',0.06) },
    { k:'t2a', p:'t1', name:'Reading the Cold', desc:'She has started noticing trouble in a sliver of black lake ice that has never once melted before it starts. Increases luck by 0.5%.',
      e:ST10J('snowpitymare','luck',0.005) },
    { k:'t3a', p:'t2a', name:'Bitten by Frost', desc:'Something bit once already, and the cold kept the mark. Increases fear chance by 1%.',
      e:ST10J('snowpitymare','fearChance',0.01) },
    { k:'t4a', p:'t3a', name:'Worn Thin', desc:'Carrying a winter this openly wears a body thin. Increases charm chance by 1%.',
      e:ST10J('snowpitymare','charmChance',0.01) },
    { k:'t5a', p:'t4a', name:'Drifting Too Far Out', desc:'Letting the wisps range that wide leaves her uncovered behind them. Increases vulnerable chance by 1%.',
      e:ST10J('snowpitymare','vulnerableChance',0.01) },
    { k:'t6a', p:'t5a', name:'Settling Snow', desc:'Every close call since has left something a little colder and a little harder behind. Reduces damage taken by 2%.',
      e:UF10J('snowpitymare','damageTakenMult',-0.02) },
    { k:'t2b', p:'t1', name:'Lighter on the Drift', desc:'A frame built around a sliver of black lake ice that has never once melted barely needs to try to move fast. Increases movement speed by 0.5%.',
      e:ST10J('snowpitymare','speed',0.005) },
    { k:'t3b', p:'t2b', name:'Quicker to Answer', desc:'The circle has learned to answer before she asks it to. Its shots come 1% faster.',
      e:ST10J('snowpitymare','fireCooldown',-0.01) },
    { k:'t4b', p:'t3b', name:'Longer Reach', desc:'A wisp built to orbit still carries when sent out further. Extends its attack range by 1%.',
      e:ST10J('snowpitymare','rangeTiles',0.01) },
    { k:'t5b', p:'t4b', name:'Something Given Back', desc:'Whatever the cold takes gives a little of itself back. Increases lifesteal chance by 0.5%.',
      e:ST10J('snowpitymare','lifestealChance',0.005) },
    { k:'t6b', p:'t5b', name:'Hardened Rime', desc:'Every close call since has hardened something a gentle start never would. Reduces damage taken by 2%.',
      e:UF10J('snowpitymare','damageTakenMult',-0.02) },
    { k:'t7', p:'t6a', pp:['t6b'], cost:2, icon:'❄️', name:'Two Winters Agreeing', desc:'Both halves of a sliver of black lake ice that has never once melted finally pull the same direction for once. Increases fear chance by 0.5% and extends its attack range by 0.5%.',
      es:[ST10J('snowpitymare','fearChance',0.005), ST10J('snowpitymare','rangeTiles',0.005)] },
    { k:'t8', p:'t7', cost:3, icon:'⚖', name:'Never Letting the Circle Rest', desc:'She stops letting the wisps drift idle between passes entirely. Its shots come 4% faster — and a spirit that never rests never fully resets her guard, so she takes 4% more damage.',
      es:[ST10J('snowpitymare','fireCooldown',-0.04), UF10J('snowpitymare','damageTakenMult',0.04)] },
    { k:'t9', p:'t8', name:'Reading It Twice', desc:'She has learned to double-check a frost-white hoofprint that outlasts the thaw before trusting the first read of it. Increases luck by 0.5%.',
      e:ST10J('snowpitymare','luck',0.005) },
    { k:'t10', p:'t9', name:'Knowing the Price', desc:'She knows exactly what a sliver of black lake ice that has never once melted is actually worth at the counter. Improves shop prices by 0.5%.',
      e:ST10J('snowpitymare','shopDiscountBonus',0.005) },

    { k:'u1', p:null, name:'Three Kinds of Winter', desc:'Every winter settles into one temper in the end, and the temper decides the rest of her. Gives kills a 0.4% chance to mend her.',
      e:ST10J('snowpitymare','onKillHealChance',0.004) },
    { k:'u2', p:'u1', x:['u3','u4'], cost:2, icon:'🩸', name:'The Biting Winter', desc:'Kept sharp on purpose, and it shows the moment anything steps into the circle. Increases stun chance by 1.5% and vulnerable chance by 1%. Choosing this closes the other two.',
      es:[ST10J('snowpitymare','stunChance',0.015), ST10J('snowpitymare','vulnerableChance',0.01)] },
    { k:'u5a', p:'u2', name:'Deeper Bite', desc:'She has never once been satisfied with what the last frost gave up. Increases stun chance by a further 1%.',
      e:ST10J('snowpitymare','stunChance',0.01) },
    { k:'u6a', p:'u5a', name:'Panic Behind It', desc:'Something about how the cold lands leaves more than a bruise behind. Increases fear chance by 0.5%.',
      e:ST10J('snowpitymare','fearChance',0.005) },
    { k:'u7a', p:'u6a', name:'Lingering Sting', desc:'What the circle marks keeps suffering long after she has drifted on. Increases poison chance by 0.5%.',
      e:ST10J('snowpitymare','venomChance',0.005) },
    { k:'u8a', p:'u7a', name:'Hardened Guard', desc:'A winter built this sharp barely notices most of what hits it back. Reduces damage taken by 2%.',
      e:UF10J('snowpitymare','damageTakenMult',-0.02) },
    { k:'u3', p:'u1', x:['u2','u4'], cost:2, icon:'💨', name:'The Drifting Winter', desc:'Too scattered and too weightless for anything to ever really pin down. Increases movement speed by 1% and dodge chance by 1%. Choosing this closes the other two.',
      es:[ST10J('snowpitymare','speed',0.01), ST10J('snowpitymare','dodgeChance',0.01)] },
    { k:'u5b', p:'u3', name:'Never Quite There', desc:'She has never once accepted this is as fast as a snowfall can move. Increases movement speed by a further 1%.',
      e:ST10J('snowpitymare','speed',0.01) },
    { k:'u6b', p:'u5b', name:'Nothing to Grab', desc:'Something this loose is very hard to actually get a hold of. Increases dodge chance by 0.5%.',
      e:ST10J('snowpitymare','dodgeChance',0.005) },
    { k:'u7b', p:'u6b', name:'Faster Cycling', desc:'She has trimmed the wisps\' wind-up down to almost nothing. Its shots come 1% faster.',
      e:ST10J('snowpitymare','fireCooldown',-0.01) },
    { k:'u8b', p:'u7b', name:'Practiced Vanishing', desc:'Something this light learns to be elsewhere before a hit lands. Reduces damage taken by a further 2%.',
      e:UF10J('snowpitymare','damageTakenMult',-0.02) },
    { k:'u4', p:'u1', x:['u2','u3'], cost:2, icon:'🕯', name:'The Gentle Winter', desc:'Quiet, patient, and very fond of whoever stands still long enough in it. Increases charm chance by 1% and luck by 1%. Choosing this closes the other two.',
      es:[ST10J('snowpitymare','charmChance',0.01), ST10J('snowpitymare','luck',0.01)] },
    { k:'u5c', p:'u4', name:'Better Company', desc:'Whatever room she drifts into trusts her more than the last one did. Increases charm chance by a further 1%.',
      e:ST10J('snowpitymare','charmChance',0.01) },
    { k:'u6c', p:'u5c', name:'Never Caught Out', desc:'She has never once been asked a question the cold did not already answer. Increases luck by a further 0.5%.',
      e:ST10J('snowpitymare','luck',0.005) },
    { k:'u7c', p:'u6c', name:'Known at Every Table', desc:'Every merchant between here and the last floor already likes her. Improves shop prices by 0.5%.',
      e:ST10J('snowpitymare','shopDiscountBonus',0.005) },
    { k:'u8c', p:'u7c', name:'An Answer for Anything', desc:'A winter this well practiced has an answer ready for almost anything. Reduces damage taken by 2%.',
      e:UF10J('snowpitymare','damageTakenMult',-0.02) },

    { k:'v1', p:null, name:'Taking Its Time', desc:'She has learned that rushing a frost-white hoofprint that outlasts the thaw only ends one way. Increases luck by 0.5%.',
      e:ST10J('snowpitymare','luck',0.005) },
    { k:'v2', p:'v1', maxRank:4, costStep:1, name:'Deeper Every Season', desc:'Each season a sliver of black lake ice that has never once melted carries a little further than the last. Increases charm chance, with each rank adding half as much again.',
      e:ST10J('snowpitymare','charmChance',0.003,0.5) },
    { k:'v3', p:'v2', name:'Tighter Rhythm', desc:'Every gap between wisp volleys closes a little further. Its shots come faster.',
      e:ST10J('snowpitymare','fireCooldown',-0.005) },
    { k:'v4', p:'v3', maxRank:3, costStep:2, name:'Colder Every Trip', desc:'Each trip the circle bites a little harder than the trip before. Increases fear chance, with each rank adding half as much again.',
      e:ST10J('snowpitymare','fearChance',0.006,0.5) },
    { k:'v5', p:'v4', name:'Half a Step', desc:'She has learned exactly how little a drift actually needs. Increases dodge chance by 0.4%.',
      e:ST10J('snowpitymare','dodgeChance',0.004) },
    { k:'v6', p:'v5', maxRank:3, costStep:1, name:'Bargained Down Twice', desc:'Every season the haggling gets a little less patient. Improves shop prices, with each rank adding half as much again.',
      e:ST10J('snowpitymare','shopDiscountBonus',0.004,0.5) },
    { k:'v7', p:'v6', name:'Kept Warmth', desc:'Whatever the cold takes gives a little back to her. Increases lifesteal chance by 0.5%.',
      e:ST10J('snowpitymare','lifestealChance',0.005) },
    { k:'v8', p:'v7', name:'Weathered', desc:'Years of near misses have hardened parts of her that a quiet winter never could. Reduces damage taken by 2%.',
      e:UF10J('snowpitymare','damageTakenMult',-0.02) },
    { k:'v9', p:'v8', name:'Reading It Twice Over', desc:'She double-checks a room before trusting her own first read of it. Increases luck by 0.4%.',
      e:ST10J('snowpitymare','luck',0.004) },
    { k:'v10', p:'v9', name:'Loosened Wind-Up', desc:'Every trip shaves a little more off the time before the volley actually lands. Its shots come faster.',
      e:ST10J('snowpitymare','fireCooldown',-0.005) },
    { k:'v11', p:'v10', name:'Sidestep', desc:'She has learned to lean off the line just enough. Increases dodge chance by 0.4%.',
      e:ST10J('snowpitymare','dodgeChance',0.004) },
    { k:'v12', p:'v11', cost:2, icon:'❄️', name:'Every Trick at Once', desc:'Every quiet trick she has ever picked up, carried at the same time. Increases charm chance by 0.5% and gives kills a further 0.5% chance to mend her.',
      es:[ST10J('snowpitymare','charmChance',0.005), ST10J('snowpitymare','onKillHealChance',0.005)] },

    { k:'w1', p:null, name:'The Old Snowdrift', desc:'Somewhere at the back of the hollow there is a drift nopony has finished digging out since she was small. Increases charm chance by 0.4%.',
      e:ST10J('snowpitymare','charmChance',0.004) },
    { k:'w2', p:'w1', tags:['snowpitymare_drift'], name:'Loose Frost Dust', desc:'It clings to anything worth carrying and drifts back when asked. Increases pickup range by 0.5%.',
      e:ST10J('snowpitymare','magnetRadius',0.005) },
    { k:'w3', p:'w1', tags:['snowpitymare_drift'], name:'Spent Wisp Shell', desc:'A little of every light that went out lingers here, technically. Gives kills a 0.4% chance to mend her.',
      e:ST10J('snowpitymare','onKillHealChance',0.004) },
    { k:'w4', p:'w1', tags:['snowpitymare_drift'], name:'Foalhood Stillness', desc:'A stillness learned young that most grown things never quite manage. Increases stun chance by 0.5%.',
      e:ST10J('snowpitymare','stunChance',0.005) },
    { k:'w5', p:'w1', tags:['snowpitymare_drift'], name:'Coins Under the Ice', desc:'Every frozen pond keeps a few, and nopony has ever found which. Improves shop prices by 0.5%.',
      e:ST10J('snowpitymare','shopDiscountBonus',0.005) },
    { k:'w6', p:'w1', tags:['snowpitymare_drift'], name:'Old Hoarfrost Plates', desc:'Cracked off and set aside, and somehow still catching the light right. Increases movement speed by 0.4%.',
      e:ST10J('snowpitymare','speed',0.004) },
    { k:'w7', p:'w1', tags:['snowpitymare_drift'], name:'Traded Icicle Beads', desc:'Small bright things kept off travellers who never noticed the swap. Increases charm chance by 0.5%.',
      e:ST10J('snowpitymare','charmChance',0.005) },
    { k:'w8', p:'w1', tags:['snowpitymare_drift'], name:'Cracked Meltwater Shells', desc:'Every one of them a winter that did not quite hold together in the end. Increases vulnerable chance by 0.5%.',
      e:ST10J('snowpitymare','vulnerableChance',0.005) },
    { k:'w9', p:'w1', tags:['snowpitymare_drift'], name:'Drift-Hollow Whispering', desc:'Nopony else will listen to it, which is exactly why it still carries. Increases fear chance by 0.5%.',
      e:ST10J('snowpitymare','fearChance',0.005) },
    { k:'w10', p:'w1', tags:['snowpitymare_drift'], name:'Lucky Frozen Feather', desc:'Nopony has ever explained why keeping one of these helps. Increases luck by 0.5%.',
      e:ST10J('snowpitymare','luck',0.005) },
    { k:'w11', p:'w1', tags:['snowpitymare_drift'], name:'Snowmelt Rations', desc:'Not for the fight itself — for the quiet moment right before it, which turns out to matter more. Its shots come 0.4% faster.',
      e:ST10J('snowpitymare','fireCooldown',-0.004) },
    { k:'w12', p:'w1', cost:2, icon:'🌨', req:{ scope:'branch', amount:10 }, name:'Drift Keeper', desc:'Enough of the old snowdrift dug out that nothing in it surprises her anymore. Opens only once at least 10 points sit in this branch. Reduces damage taken by 2%.',
      e:UF10J('snowpitymare','damageTakenMult',-0.02) },
    { k:'w13', p:'w12', cost:3, icon:'❄️', name:'The Whole Drift Answering', desc:'Every scrap of winter she ever kept back finally counts at once. Increases fear chance by 0.4% for each owned The Old Snowdrift piece.',
      e:SY10J('snowpitymare','fearChance',0.004,'snowpitymare_drift') },
    { k:'w14', p:'w13', name:'Well Practiced', desc:'Not one wasted motion left anywhere in the circle. Extends its attack range by 0.5%.',
      e:ST10J('snowpitymare','rangeTiles',0.005) },
    { k:'w15', p:'w14', name:'Full Take', desc:'She trades off everything the drift is not actively holding, and there is a lot of that. Improves shop prices by 0.5%.',
      e:ST10J('snowpitymare','shopDiscountBonus',0.005) },
    { k:'w16', p:'w15', cost:2, icon:'⚖', name:'Emptying the Whole Drift at Once', desc:'She spends the drift all at once rather than ration it out. Its shots come 3% faster — and a hollow emptied this fast has nothing left to bank behind her either.',
      es:[ST10J('snowpitymare','fireCooldown',-0.03), UF10J('snowpitymare','damageTakenMult',0.04)] },

    { k:'x1', p:null, name:'Reading the Room', desc:'She has started noticing trouble in a room a beat before it starts. Increases luck by 0.4%.',
      e:ST10J('snowpitymare','luck',0.004) },
    { k:'x2', p:'x1', name:'Half a Step Further', desc:'She lets the circle range a little wider than it wants to. Extends its attack range by 0.5%.',
      e:ST10J('snowpitymare','rangeTiles',0.005) },
    { k:'x3', p:'x2', name:'Settled Nerve', desc:'She has stopped flinching at things that used to rattle her. Reduces damage taken by 2%.',
      e:UF10J('snowpitymare','damageTakenMult',-0.02) },
    { k:'x4', p:'x3', name:'Overreaching on Purpose', desc:'A circle spread this wide leaves the middle of it open. Increases vulnerable chance by 0.5%.',
      e:ST10J('snowpitymare','vulnerableChance',0.005) },
    { k:'x5', p:'x4', name:'Winning Over the Room', desc:'Something about her this steady puts a room at ease before it should be. Increases charm chance by 0.5%.',
      e:ST10J('snowpitymare','charmChance',0.005) },
    { k:'x6', p:'x3', name:'Ringing Cold', desc:'Every landed touch of frost carries a shock that lingers a beat too long. Increases stun chance by 0.5%.',
      e:ST10J('snowpitymare','stunChance',0.005) },
    { k:'x7', p:'x6', name:'Practiced Legs', desc:'Years of close calls have taught her legs something standing still never could. Increases movement speed by 0.4%.',
      e:ST10J('snowpitymare','speed',0.004) },
    { k:'x8', p:'x7', name:'Shorter Set-Up', desc:'She has stopped waiting on the circle and simply lets it go. Its shots come 1% faster.',
      e:ST10J('snowpitymare','fireCooldown',-0.01) },
    { k:'x9', p:'x3', name:'Drawing the Circle In', desc:'She pulls the wisps tighter than their orbit would suggest. It presents a smaller target.',
      e:UF10J('snowpitymare','radius',-0.1) },
    { k:'x10', p:'x9', name:'Nothing Loose Left', desc:'Years of practice have taken more off her outline than anypony watching would guess. It presents a smaller target still.',
      e:UF10J('snowpitymare','radius',-0.1) },
    { k:'x11', p:'x10', name:'Known Prices', desc:'Nopony haggles her down twice. Improves shop prices by 0.5%.',
      e:ST10J('snowpitymare','shopDiscountBonus',0.005) },
    { k:'x12', p:'x8', pp:['x11'], cost:2, icon:'❄️', name:'Reach and Nerve Together', desc:'Reach, timing and a settled nerve, all working together now. Extends its attack range by 0.5% and increases stun chance by 0.5%.',
      es:[ST10J('snowpitymare','rangeTiles',0.005), ST10J('snowpitymare','stunChance',0.005)] },
    { k:'x13', p:'x12', maxRank:3, costStep:1, name:'Further Every Season', desc:'Each season the circle reaches a little further before it gives up. Extends its attack range, with each rank adding half as much again.',
      e:ST10J('snowpitymare','rangeTiles',0.003,0.5) },
    { k:'x14', p:'x13', cost:3, icon:'🛡', name:'Standing in the Whiteout', desc:'She stops drifting behind the wisps and plants herself in the middle of the storm instead. Reduces damage taken by 5% — and there is nowhere left in that stance to step out of the way.',
      es:[UF10J('snowpitymare','damageTakenMult',-0.05), UF10J('snowpitymare','radius',0.15)] },

    { k:'y1', p:null, name:'Winter Rites', desc:'The old snow-hollows kept a ceremony for a spirit\'s first frost, and nopony outside the hollow was ever shown it. Extends its attack range by 0.5%.',
      e:ST10J('snowpitymare','rangeTiles',0.005) },
    { k:'y2', p:'y1', name:'Struck Lake Ice', desc:'One tap on the black lake ice that has rung true for a hundred winters. Increases stun chance by 0.4%.',
      e:ST10J('snowpitymare','stunChance',0.004) },
    { k:'y3', p:'y2', name:'Offering Meltwater', desc:'A bowl left out at dusk is reliably frozen over by the next dawn. Increases pickup range by 0.4%.',
      e:ST10J('snowpitymare','magnetRadius',0.004) },
    { k:'y4', p:'y3', cost:2, cursed:true, icon:'🕯', name:'The First Winter Lost', desc:'A whole season spent holding a circle that went out anyway, and some of what it cost does not come back either. Permanently increases damage taken by 5%, and nothing further along this road opens without it.',
      e:UF10J('snowpitymare','damageTakenMult',0.05) },
    { k:'y5', p:'y4', name:'Rite Toll', desc:'Everypony asking after her settles with her first. Improves shop prices by 0.4%.',
      e:ST10J('snowpitymare','shopDiscountBonus',0.004) },
    { k:'y6', p:'y5', name:'Cold Vow', desc:'The oath is set into the deep floor ice rather than spoken aloud, and the ice keeps it better. Increases freeze chance by 0.4%.',
      e:ST10J('snowpitymare','freezeChance',0.004) },
    { k:'y7', p:'y6', name:'Broken In', desc:'A season on this road has taught her legs something a fresh snowfall never could. Increases movement speed by 0.4%.',
      e:ST10J('snowpitymare','speed',0.004) },
    { k:'y8', p:'y7', maxRank:4, costStep:1, name:'Kept Frost Records', desc:'One pane of ice set aside for every rite she has stood, and there are a great many of them. Increases charm chance, with each rank adding half as much again.',
      e:ST10J('snowpitymare','charmChance',0.002,0.5) },
    { k:'y9', p:'y8', name:'Reading the Old Ground', desc:'She knows what happened here before the snow has finished covering it. Increases pickup range by 0.3%.',
      e:ST10J('snowpitymare','magnetRadius',0.003) },
    { k:'y10', p:'y9', name:'Standing Rights', desc:'She stopped being modest about what she is owed. Improves shop prices by 0.3%.',
      e:ST10J('snowpitymare','shopDiscountBonus',0.003) },
    { k:'y11', p:'y8', name:'Full Rite', desc:'The blessing is set over the whole circle now, not just the one wisp. Its shots come slightly faster.',
      e:ST10J('snowpitymare','fireCooldown',-0.01) },
    { k:'y12', p:'y11', name:'Sealed', desc:'Wax, thread and one old word, worked in before the long road started. Reduces damage taken by 3%.',
      e:UF10J('snowpitymare','damageTakenMult',-0.03) },
    { k:'y13', p:'y10', pp:['y12'], cost:2, icon:'🕯', name:'Rites Observed', desc:'Every old rite kept in order, for once. Increases stun chance by 0.2% and increases pickup range by 0.2%.',
      es:[ST10J('snowpitymare','stunChance',0.002), ST10J('snowpitymare','magnetRadius',0.002)] },
    { k:'y14', p:'y13', cost:3, icon:'⚖', name:'Wearing the First Spirit\'s Mantle', desc:'She takes the hollow\'s oldest frost-mantle down off its hook and does not put it back. Reduces damage taken by 4% — and it is a great deal more winter to carry than it looks like.',
      es:[UF10J('snowpitymare','damageTakenMult',-0.04), UF10J('snowpitymare','radius',0.12)] },

    { k:'z1', p:null, name:'Watching Closer', desc:'She has started noticing the exact moment things are about to go wrong. Increases bolt speed by 0.4%.',
      e:ST10J('snowpitymare','boltSpeed',0.004) },
    { k:'z2', p:'z1', name:'Held Breath', desc:'One beat of stillness before the circle commits, every time, without fail. Increases stun chance by 0.2%.',
      e:ST10J('snowpitymare','stunChance',0.002) },
    { k:'z3', p:'z2', name:'Loose Change', desc:'Small things come free when the cold really lands. Increases pickup range by 0.1%.',
      e:ST10J('snowpitymare','magnetRadius',0.001) },
    { k:'z4', p:'z3', name:'Sharp Instinct', desc:'She has stopped paying full price for anything. Improves shop prices by 0.2%.',
      e:ST10J('snowpitymare','shopDiscountBonus',0.002) },
    { k:'z5', p:'z4', name:'Shorter Wind-Up', desc:'She has stopped waiting and started simply letting winter happen. Its shots come 1% faster.',
      e:ST10J('snowpitymare','fireCooldown',-0.01) },
    { k:'z6', p:'z5', cost:2, icon:'📏', name:'Truer Drift', desc:'The volley lands along exactly the line it meant this time. Increases charm chance by 0.5%.',
      e:ST10J('snowpitymare','charmChance',0.005) },
    { k:'z7', p:'z6', name:'Second Layer', desc:'A second skin of rime under the first one is doing some of the work now. Reduces damage taken by 2%.',
      e:UF10J('snowpitymare','damageTakenMult',-0.02) },
    { k:'z8', p:'z7', name:'Drawn Tight', desc:'She has stopped trailing anything loose behind the circle. It presents a smaller target.',
      e:UF10J('snowpitymare','radius',-0.1) },
    { k:'z9', p:'z8', name:'Second Winter', desc:'Under the first cold there is another one nothing has reached yet. Reduces damage taken by a further 2%.',
      e:UF10J('snowpitymare','damageTakenMult',-0.02) },
    { k:'z10', p:'z9', cost:2, maxRank:3, costStep:2, name:'Harder Every Season', desc:'Each season she pushes the cold a little further than the season before. Increases fear chance, with each rank adding half as much again.',
      e:ST10J('snowpitymare','fearChance',0.005,0.5) },
    { k:'z11', p:'z10', name:'Settled for Good', desc:'She has stopped flinching entirely, even at things worth flinching at. Reduces damage taken by a further 2%.',
      e:UF10J('snowpitymare','damageTakenMult',-0.02) },
    { k:'z12', p:'z11', cost:2, name:'Last Word', desc:'She has stopped losing arguments the winter started for her. Increases luck by 0.4%.',
      e:ST10J('snowpitymare','luck',0.004) },
    { k:'z13', p:'z12', cost:3, icon:'🛡', name:'Nothing Left Loose', desc:'Every stray flake finally worked back into the whole. It presents a smaller target.',
      e:UF10J('snowpitymare','radius',-0.1) },
    { k:'z14', p:'z13', cost:5, icon:'❄️', req:{ scope:'tab', amount:60 }, name:'Shatterfrost', desc:'She stops letting the cold simply hold things still and starts letting it finish them. Anything that dies while frozen bursts apart into a ring of ice shards that cut through whatever stands around it, and every few foes she puts down warm gather enough rime on the circle to flash-freeze the nearest one outright, so the shattering keeps feeding itself. Opens only once 60 points sit anywhere in this tree. Also reduces damage taken by 2%.',
      es:[FL10J('snowpitymare','shatterfrost',true), UF10J('snowpitymare','damageTakenMult',-0.02)] },
  ],
};

const SKILL_TREE_CHARACTER_NODES_10J = [];
(function buildCharacterSkillNodes10J(){
  for (const classId in SKILL_TREE_CHARACTER_CONFIG_10J) {
    const full = key => 'char_' + classId + '_' + key;
    for (const entry of SKILL_TREE_CHARACTER_CONFIG_10J[classId]) {
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
      if (entry.maxRank) node.maxRank = entry.maxRank;
      if (entry.costStep) node.costStep = entry.costStep;
      if (entry.req) node.requiresSpent = entry.req;
      if (entry.tags) node.tags = entry.tags.slice();
      if (entry.es) node.effects = entry.es;
      else node.effect = entry.e || null;
      if (entry.cursed) node.cursed = true;
      SKILL_TREE_CHARACTER_NODES_10J.push(node);
    }
  }
})();

for (const n of SKILL_TREE_CHARACTER_NODES_10J) {
  SKILL_TREE_NODES.push(n);
  SKILL_TREE_NODES_BY_ID[n.id] = n;
}
