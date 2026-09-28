'use strict';

const SKILL_TREE_CHARACTER_CONFIG_4B = [

  { classId:'hypogriff', nodes:{

    i1:{ name:'Wingfold Plunge', desc:'Tuck the wings at the top of the arc and let gravity finish the approach. Increases movement speed by 4%.', effect:{ type:'stat', classId:'hypogriff', stat:'speed', amount:0.04 } },
    i2:{ name:'Lion-Heart Impact', desc:'All that diving weight lands somewhere. Increases melee damage by 5%.', effect:{ type:'stat', classId:'hypogriff', stat:'meleeDamage', amount:0.05 } },
    i3:{ name:'Eagle\'s Grip', desc:'Talons that close and do not open again. Increases melee damage by 4%.', effect:{ type:'stat', classId:'hypogriff', stat:'meleeDamage', amount:0.04 } },
    i4:{ name:'Weight of the Stoop', desc:'A diver built this heavy never climbs as quickly again. Permanently reduces movement speed by 5%. Nothing deeper on this branch opens without it.', cursed:true, effect:{ type:'stat', classId:'hypogriff', stat:'speed', amount:-0.05 } },
    i5a:{ name:'Skullcracker Descent', desc:'The whole dive delivered through one talon. Increases melee damage by 6%.', effect:{ type:'stat', classId:'hypogriff', stat:'meleeDamage', amount:0.06 } },
    i6a:{ name:'Rending Backswing', desc:'The claw is already returning before the first strike lands. Reduces melee cooldown by 3%.', effect:{ type:'stat', classId:'hypogriff', stat:'meleeCooldown', amount:-0.03 } },

    i7a:{ name:'Stonesplitter Talons', desc:'Your talons stop glancing off anything — every strike lands exactly where it needs to. Hitting that precisely is slower work: melee cooldown up 4%.', cost:2, effects:[
      { type:'stat', classId:'hypogriff', stat:'critChance', amount:0.08 },
      { type:'stat', classId:'hypogriff', stat:'meleeCooldown', amount:0.04 },
    ] },
    i5b:{ name:'Hunter\'s Angle', desc:'A raptor picks its line before it commits. Increases critical hit chance by 3%.', effect:{ type:'stat', classId:'hypogriff', stat:'critChance', amount:0.03 } },
    i6b:{ name:'Torn Flank', desc:'What your talons open, everything else can find. Increases vulnerable chance by 3%.', effect:{ type:'stat', classId:'hypogriff', stat:'vulnerableChance', amount:0.03 } },
    i7b:{ name:'Gemsight Gullet', desc:'Hypogriff eyes were made for glitter, wherever it is. Increases luck by 6%. Eyes on the glitter means eyes off the floor: pickup magnet radius down 4%.', cost:2, effects:[
      { type:'stat', classId:'hypogriff', stat:'luck', amount:0.06 },
      { type:'stat', classId:'hypogriff', stat:'magnetRadius', amount:-0.04 },
    ] },
    i8:{ name:'Thermal Lift', desc:'Ride the warm column instead of beating against it. Increases movement speed by 4%.', effect:{ type:'stat', classId:'hypogriff', stat:'speed', amount:0.04 } },
    i9:{ name:'Hooked Beak', desc:'When the talons are busy, the beak is not. Increases melee damage by 3%.', effect:{ type:'stat', classId:'hypogriff', stat:'meleeDamage', amount:0.03 } },
    i10:{ name:'Feint on the Wing', desc:'A half-beat sideslip that reads as a dive right up until it isn\'t. Increases dodge chance by 3%.', effect:{ type:'stat', classId:'hypogriff', stat:'dodgeChance', amount:0.03 } },

    j1:{ name:'Updraft Reader', desc:'You can see the warm air the way other fliers see the ground. Increases movement speed by 5%.', effect:{ type:'stat', classId:'hypogriff', stat:'speed', amount:0.05 } },
    j2:{ name:'Scavenger\'s Eye', desc:'Nothing shiny survives a pass overhead. Increases pickup magnet radius by 5%.', effect:{ type:'stat', classId:'hypogriff', stat:'magnetRadius', amount:0.05 } },
    j3:{ name:'Longer Reach', desc:'Wingspan counts for reach as much as it counts for lift. Increases range by 4%.', effect:{ type:'stat', classId:'hypogriff', stat:'rangeTiles', amount:0.04 } },
    j4:{ name:'Hollowed Bones', desc:'Lighter bones fly further and hit softer. Permanently reduces melee damage by 10%. The rest of this thermal is closed until you accept it.', cursed:true, effect:{ type:'stat', classId:'hypogriff', stat:'meleeDamage', amount:-0.10 } },
    j5a:{ name:'Jetstream Chase', desc:'Find the fastest air in the room and stay in it. Increases movement speed by 6%.', effect:{ type:'stat', classId:'hypogriff', stat:'speed', amount:0.06 } },
    j6a:{ name:'Cloud-Skimmer', desc:'Level flight at a speed most fliers only manage falling. Increases movement speed by 5%.', effect:{ type:'stat', classId:'hypogriff', stat:'speed', amount:0.05 } },
    j7a:{ name:'Ironed Feathers', desc:'Every feather packed flat and locked, until the whole flank turns a hit aside — you take 10% less damage from everything. All that packing is dead weight: movement speed down 4%.', cost:2, effects:[
      { type:'uniqueField', classId:'hypogriff', field:'damageTakenMult', amount:-0.10, min:-0.4, max:0.5 },
      { type:'stat', classId:'hypogriff', stat:'speed', amount:-0.04 },
    ] },
    j5b:{ name:'Carrion Instinct', desc:'A hypogriff always knows which room is worth the detour. Increases luck by 4%.', effect:{ type:'stat', classId:'hypogriff', stat:'luck', amount:0.04 } },
    j6b:{ name:'Fresh Kill', desc:'Feeding on the wing, mid-hunt. Increases on-kill heal chance by 3%.', effect:{ type:'stat', classId:'hypogriff', stat:'onKillHealChance', amount:0.03 } },
    j7b:{ name:'Shadow Overhead', desc:'Prey that sees a raptor\'s shadow stops thinking straight. Increases fear chance by 3%.', effect:{ type:'stat', classId:'hypogriff', stat:'fearChance', amount:0.03 } },
    j8:{ name:'Nest-Hoarder', desc:'Everything loose ends up in the aerie eventually. Increases pickup magnet radius by 4%.', effect:{ type:'stat', classId:'hypogriff', stat:'magnetRadius', amount:0.04 } },
    j9:{ name:'Full Wingspan', desc:'Both wings out, nothing held back. Increases range by 4%.', effect:{ type:'stat', classId:'hypogriff', stat:'rangeTiles', amount:0.04 } },
    j10:{ name:'Rolling Bank', desc:'Turn on a wingtip and the blow goes past you. Increases dodge chance by 3%.', effect:{ type:'stat', classId:'hypogriff', stat:'dodgeChance', amount:0.03 } },

    k1:{ name:'Sheared Air', desc:'Slip the strike the way you slip a crosswind. Increases dodge chance by 3%.', effect:{ type:'stat', classId:'hypogriff', stat:'dodgeChance', amount:0.03 } },
    k2:{ name:'Hunter\'s Portion', desc:'Every kill is a meal if you are quick about it. Increases on-kill heal chance by 4%.', effect:{ type:'stat', classId:'hypogriff', stat:'onKillHealChance', amount:0.04 } },
    k3:{ name:'Old Scars, Old Lessons', desc:'Four hearts teaches caution faster than six ever could. Increases luck by 3%.', effect:{ type:'stat', classId:'hypogriff', stat:'luck', amount:0.03 } },
    k4:{ name:'Thin Hide Confirmed', desc:'You stop pretending the hide will hold and fight accordingly. Permanently reduces melee damage by 8%. Required to press deeper into this branch.', cursed:true, effect:{ type:'stat', classId:'hypogriff', stat:'meleeDamage', amount:-0.08 } },
    k5a:{ name:'Wingtip Parry', desc:'A primary feather is a poor shield and an excellent distraction. Increases dodge chance by 4%.', effect:{ type:'stat', classId:'hypogriff', stat:'dodgeChance', amount:0.04 } },
    k6a:{ name:'Scar Lattice', desc:'Old wounds knit into something closer to plate — you take 8% less damage from everything. Scar tissue does not swing well: melee damage down 4%.', cost:2, effects:[
      { type:'uniqueField', classId:'hypogriff', field:'damageTakenMult', amount:-0.08, min:-0.4, max:0.5 },
      { type:'stat', classId:'hypogriff', stat:'meleeDamage', amount:-0.04 },
    ] },
    k7a:{ name:'Gorge on the Fallen', desc:'The lion half is not fussy about timing. Increases on-kill heal chance by 4%.', effect:{ type:'stat', classId:'hypogriff', stat:'onKillHealChance', amount:0.04 } },
    k5b:{ name:'Exposed Throat', desc:'You know exactly where a thing is soft, because you are soft in the same place. Increases vulnerable chance by 3%.', effect:{ type:'stat', classId:'hypogriff', stat:'vulnerableChance', amount:0.03 } },
    k6b:{ name:'Raptor Scream', desc:'The cry a hypogriff makes at the top of a dive. Increases fear chance by 3%.', effect:{ type:'stat', classId:'hypogriff', stat:'fearChance', amount:0.03 } },
    k7b:{ name:'Golden Eyes', desc:'Something in that stare that not everything can fight. Increases charm chance by 3%.', effect:{ type:'stat', classId:'hypogriff', stat:'charmChance', amount:0.03 } },
    k8:{ name:'Blood on the Beak', desc:'What the beak takes, the body keeps. Increases lifesteal chance by 4%.', effect:{ type:'stat', classId:'hypogriff', stat:'lifestealChance', amount:0.04 } },
    k9:{ name:'Lion\'s Half', desc:'The predator half of you does not stop to ask. Increases lifesteal chance by 3%.', effect:{ type:'stat', classId:'hypogriff', stat:'lifestealChance', amount:0.03 } },

    l1:{ name:'Locked On', desc:'Pick one target and stop considering the others. Increases critical hit chance by 3%.', effect:{ type:'stat', classId:'hypogriff', stat:'critChance', amount:0.03 } },
    l2:{ name:'Killing Weight', desc:'Two hundred pounds of eagle and lion, arriving all at once. Increases melee damage by 5%.', effect:{ type:'stat', classId:'hypogriff', stat:'meleeDamage', amount:0.05 } },
    l3:{ name:'Talon Extension', desc:'The last joint straightens a heartbeat before contact. Increases range by 4%.', effect:{ type:'stat', classId:'hypogriff', stat:'rangeTiles', amount:0.04 } },
    l4:{ name:'Tunnel Vision', desc:'Fixating on the kill means missing everything else in the room. Permanently reduces luck by 4%. The end of this branch demands it.', cursed:true, effect:{ type:'stat', classId:'hypogriff', stat:'luck', amount:-0.04 } },
    l5a:{ name:'Throat-Finder', desc:'You have stopped aiming for the body. Increases critical hit chance by 4%.', effect:{ type:'stat', classId:'hypogriff', stat:'critChance', amount:0.04 } },
    l6a:{ name:'Full Commitment', desc:'No pulling out of the dive halfway. Increases melee damage by 5%.', effect:{ type:'stat', classId:'hypogriff', stat:'meleeDamage', amount:0.05 } },
    l7a:{ name:'Glass Stoop', desc:'Everything thrown into the dive and nothing at all held back for the landing: melee damage up 8%, and you take 12% MORE damage from everything for the rest of the run.', cost:2, effects:[
      { type:'stat', classId:'hypogriff', stat:'meleeDamage', amount:0.08 },
      { type:'uniqueField', classId:'hypogriff', field:'damageTakenMult', amount:0.12, min:-0.4, max:0.5 },
    ] },
    l5b:{ name:'Marked Prey', desc:'You leave a wound the whole room can work with. Increases vulnerable chance by 3%.', effect:{ type:'stat', classId:'hypogriff', stat:'vulnerableChance', amount:0.03 } },
    l6b:{ name:'Carrion Filth', desc:'A raptor\'s talons are never clean. Increases venom chance by 3%.', effect:{ type:'stat', classId:'hypogriff', stat:'venomChance', amount:0.03 } },
    l7b:{ name:'Sky Terror', desc:'Nothing that lives on the ground likes a shape that comes from above. Increases fear chance by 3%.', effect:{ type:'stat', classId:'hypogriff', stat:'fearChance', amount:0.03 } },
    l8:{ name:'Second Talon', desc:'The other foot was never idle. Increases melee damage by 5%.', effect:{ type:'stat', classId:'hypogriff', stat:'meleeDamage', amount:0.05 } },
    l9:{ name:'Aerie Instinct', desc:'You know which way the good rooms lie. Increases luck by 4%.', effect:{ type:'stat', classId:'hypogriff', stat:'luck', amount:0.04 } },
  }},

  { classId:'seapony', nodes:{

    i1:{ name:'Swell Behind the Bolt', desc:'A wave does not hit harder by moving faster. Increases ranged damage by 5%.', effect:{ type:'stat', classId:'seapony', stat:'rangedDamage', amount:0.05 } },
    i2:{ name:'Surface Skip', desc:'The bolt planes across the floor instead of ploughing it. Increases bolt speed by 3%.', effect:{ type:'stat', classId:'seapony', stat:'boltSpeed', amount:0.03 } },
    i3:{ name:'Reach of the Tide', desc:'High water always comes further in than you expect. Increases range by 3%.', effect:{ type:'stat', classId:'seapony', stat:'rangeTiles', amount:0.03 } },
    i4:{ name:'Drawn-Out Swell', desc:'A bigger wave takes longer to gather. Permanently increases fire cooldown by 5%. The deep water past this point does not open otherwise.', cursed:true, effect:{ type:'stat', classId:'seapony', stat:'fireCooldown', amount:0.05 } },
    i5a:{ name:'Breaker Weight', desc:'The whole ocean arriving in one place. Increases ranged damage by 7%.', effect:{ type:'stat', classId:'seapony', stat:'rangedDamage', amount:0.07 } },
    i6a:{ name:'Deep Displacement', desc:'What moves the water is what hurts, not the water. Increases ranged damage by 6%.', effect:{ type:'stat', classId:'seapony', stat:'rangedDamage', amount:0.06 } },
    i7a:{ name:'The Tide That Never Breaks', desc:'Your bolts stop expiring with distance entirely — they roll on until a wall stops them, no matter how far the room runs. A tide is patient, not quick: bolt speed down 5%.', cost:2, effects:[
      { type:'uniqueFlag', classId:'seapony', field:'unlimitedRange', value:true },
      { type:'stat', classId:'seapony', stat:'boltSpeed', amount:-0.05 },
    ] },
    i5b:{ name:'Undertow Read', desc:'You can feel where the water is thinnest. Increases critical hit chance by 4%.', effect:{ type:'stat', classId:'seapony', stat:'critChance', amount:0.04 } },
    i6b:{ name:'Saltburn', desc:'Brine in an open wound does its own work. Increases vulnerable chance by 3%.', effect:{ type:'stat', classId:'seapony', stat:'vulnerableChance', amount:0.03 } },
    i7b:{ name:'Bloom Water', desc:'Something in the shallows is not clean. Increases venom chance by 3%.', effect:{ type:'stat', classId:'seapony', stat:'venomChance', amount:0.03 } },
    i8:{ name:'Storm Surge', desc:'The tide with a gale behind it. Increases ranged damage by 6%.', effect:{ type:'stat', classId:'seapony', stat:'rangedDamage', amount:0.06 } },
    i9:{ name:'Spring Tide', desc:'Once a month the water goes further than it has any right to. Increases range by 3%.', effect:{ type:'stat', classId:'seapony', stat:'rangeTiles', amount:0.03 } },
    i10:{ name:'Trough and Crest', desc:'Time the strike to the crest and it lands twice as hard. Increases critical hit chance by 4%.', effect:{ type:'stat', classId:'seapony', stat:'critChance', amount:0.04 } },

    j1:{ name:'Land Legs', desc:'A sea pony out of water learns to walk eventually. Increases movement speed by 5%.', effect:{ type:'stat', classId:'seapony', stat:'speed', amount:0.05 } },
    j2:{ name:'Slick Trail', desc:'You leave enough water behind to slide on. Increases movement speed by 4%.', effect:{ type:'stat', classId:'seapony', stat:'speed', amount:0.04 } },
    j3:{ name:'Beachcomber', desc:'The tide brings everything to you in the end. Increases pickup magnet radius by 4%.', effect:{ type:'stat', classId:'seapony', stat:'magnetRadius', amount:0.04 } },
    j4:{ name:'Thinned Brine', desc:'Moving light means striking light. Permanently reduces ranged damage by 5%. The rest of this current is closed without it.', cursed:true, effect:{ type:'stat', classId:'seapony', stat:'rangedDamage', amount:-0.05 } },
    j5a:{ name:'Riding the Current', desc:'Stop fighting the floor and let it carry you. Increases movement speed by 6%.', effect:{ type:'stat', classId:'seapony', stat:'speed', amount:0.06 } },
    j6a:{ name:'Tail-Kick', desc:'One flick of the fluke and you are across the room. Increases movement speed by 5%.', effect:{ type:'stat', classId:'seapony', stat:'speed', amount:0.05 } },

    j7a:{ name:'Waterspout Ascent', desc:'You raise a column of water under yourself and ride it across the floor faster than legs ever carried you. Holding a spout up takes everything you had been putting behind the bolts: ranged damage down 6%.', cost:2, effects:[
      { type:'stat', classId:'seapony', stat:'speed', amount:0.10 },
      { type:'stat', classId:'seapony', stat:'rangedDamage', amount:-0.06 },
    ] },
    j5b:{ name:'Slipstream Body', desc:'Nothing gets a good grip on something this smooth. Increases dodge chance by 3%.', effect:{ type:'stat', classId:'seapony', stat:'dodgeChance', amount:0.03 } },
    j6b:{ name:'Eel-Turn', desc:'A whole body-length of course correction in one beat. Increases dodge chance by 3%.', effect:{ type:'stat', classId:'seapony', stat:'dodgeChance', amount:0.03 } },
    j7b:{ name:'Flotsam Sense', desc:'You have always known which wreck was worth diving. Increases luck by 4%.', effect:{ type:'stat', classId:'seapony', stat:'luck', amount:0.04 } },
    j8:{ name:'Shore Sprint', desc:'Short bursts are what a sea pony has instead of endurance. Increases movement speed by 4%.', effect:{ type:'stat', classId:'seapony', stat:'speed', amount:0.04 } },
    j9:{ name:'Drift Net', desc:'Everything loose in the water ends up in the net. Increases pickup magnet radius by 3%.', effect:{ type:'stat', classId:'seapony', stat:'magnetRadius', amount:0.03 } },
    j10:{ name:'Pearl-Diver', desc:'Six hearts of lung and the patience to use them. Increases luck by 4%.', effect:{ type:'stat', classId:'seapony', stat:'luck', amount:0.04 } },

    k1:{ name:'Crush Depth Grin', desc:'You have been deeper than anything in this room. Increases vulnerable chance by 3%.', effect:{ type:'stat', classId:'seapony', stat:'vulnerableChance', amount:0.03 } },
    k2:{ name:'Feed on the Fallen', desc:'The reef wastes nothing. Increases on-kill heal chance by 4%.', effect:{ type:'stat', classId:'seapony', stat:'onKillHealChance', amount:0.04 } },
    k3:{ name:'Reef Memory', desc:'Every channel and every dead end, remembered. Increases luck by 4%.', effect:{ type:'stat', classId:'seapony', stat:'luck', amount:0.04 } },
    k4:{ name:'Ballast', desc:'Weight is how you stop being pushed around. Permanently reduces movement speed by 4%. Required to press further down.', cursed:true, effect:{ type:'stat', classId:'seapony', stat:'speed', amount:-0.04 } },
    k5a:{ name:'Pressure Hull', desc:'A body built for the deep shrugs off what surface things do to it — you take 10% less damage from everything. All that mass drags on land: movement speed down 3%.', cost:2, effects:[
      { type:'uniqueField', classId:'seapony', field:'damageTakenMult', amount:-0.10, min:-0.4, max:0.5 },
      { type:'stat', classId:'seapony', stat:'speed', amount:-0.03 },
    ] },
    k6a:{ name:'Filter-Feeder', desc:'You take something back from every kill without stopping. Increases on-kill heal chance by 4%.', effect:{ type:'stat', classId:'seapony', stat:'onKillHealChance', amount:0.04 } },
    k7a:{ name:'Barnacle Bite', desc:'The bolt leaves something behind that keeps drinking. Increases lifesteal chance by 4%.', effect:{ type:'stat', classId:'seapony', stat:'lifestealChance', amount:0.04 } },
    k5b:{ name:'Concussive Wave', desc:'Water carries a shock better than air ever will. Increases stun chance by 3%.', effect:{ type:'stat', classId:'seapony', stat:'stunChance', amount:0.03 } },
    k6b:{ name:'Siren Note', desc:'The old songs still work on most things. Increases charm chance by 3%.', effect:{ type:'stat', classId:'seapony', stat:'charmChance', amount:0.03 } },
    k7b:{ name:'Something Below', desc:'Nothing likes not being able to see the bottom. Increases fear chance by 3%.', effect:{ type:'stat', classId:'seapony', stat:'fearChance', amount:0.03 } },
    k8:{ name:'Abyssal Patience', desc:'One shot, taken exactly when it should be. Increases critical hit chance by 5%.', effect:{ type:'stat', classId:'seapony', stat:'critChance', amount:0.05 } },
    k9:{ name:'Undertow Drain', desc:'The water going back out takes something with it. Increases lifesteal chance by 4%.', effect:{ type:'stat', classId:'seapony', stat:'lifestealChance', amount:0.04 } },

    l1:{ name:'Quicker Swell', desc:'Gather the next wave before the last one lands. Reduces fire cooldown by 3%.', effect:{ type:'stat', classId:'seapony', stat:'fireCooldown', amount:-0.03 } },
    l2:{ name:'Packed Water', desc:'Nothing compressible left in the bolt at all. Increases ranged damage by 4%.', effect:{ type:'stat', classId:'seapony', stat:'rangedDamage', amount:0.04 } },
    l3:{ name:'Cold Eye', desc:'Slow shooters get to choose their moment. Increases critical hit chance by 4%.', effect:{ type:'stat', classId:'seapony', stat:'critChance', amount:0.04 } },
    l4:{ name:'Split Swell', desc:'Water divided is water weakened. Permanently reduces ranged damage by 5%. The end of this branch demands it.', cursed:true, effect:{ type:'stat', classId:'seapony', stat:'rangedDamage', amount:-0.05 } },
    l5a:{ name:'Chop', desc:'Short, ugly, frequent waves. Reduces fire cooldown by 4%.', effect:{ type:'stat', classId:'seapony', stat:'fireCooldown', amount:-0.04 } },
    l6a:{ name:'Riptide Cadence', desc:'A faster rhythm bought the only way it can be — fire cooldown down 3%, ranged damage down 4%.', effects:[
      { type:'stat', classId:'seapony', stat:'fireCooldown', amount:-0.03 },
      { type:'stat', classId:'seapony', stat:'rangedDamage', amount:-0.04 },
    ] },

    l7a:{ name:'Abyssal Lance', desc:'The tide stops being a bolt and becomes a hammer-blow: pressure enough behind it to find the one seam that matters, every time. Winding one up is slow work — fire cooldown up 10%.', cost:2, effects:[
      { type:'stat', classId:'seapony', stat:'critChance', amount:0.12 },
      { type:'stat', classId:'seapony', stat:'fireCooldown', amount:0.10 },
    ] },
    l5b:{ name:'Stonefish Spine', desc:'You learned this one from something worse than you. Increases venom chance by 3%.', effect:{ type:'stat', classId:'seapony', stat:'venomChance', amount:0.03 } },
    l6b:{ name:'Slam Water', desc:'A wall of water arriving at once rings a skull nicely. Increases stun chance by 3%.', effect:{ type:'stat', classId:'seapony', stat:'stunChance', amount:0.03 } },
    l7b:{ name:'Scoured Shell', desc:'The tide takes the armour off a thing before it takes the thing. Increases vulnerable chance by 3%.', effect:{ type:'stat', classId:'seapony', stat:'vulnerableChance', amount:0.03 } },
    l8:{ name:'Full Fathom', desc:'The deepest water carries the heaviest hit. Increases ranged damage by 5%.', effect:{ type:'stat', classId:'seapony', stat:'rangedDamage', amount:0.05 } },
    l9:{ name:'Jetted Bolt', desc:'A little propulsion behind the wave. Increases bolt speed by 3%.', effect:{ type:'stat', classId:'seapony', stat:'boltSpeed', amount:0.03 } },
  }},

  { classId:'ponybot', nodes:{

    i1:{ name:'Focusing Lens', desc:'A cleaner beam is a hotter beam. Increases ranged damage by 5%.', effect:{ type:'stat', classId:'ponybot', stat:'rangedDamage', amount:0.05 } },
    i2:{ name:'Second Capacitor', desc:'More charge behind every pulse down the line. Increases ranged damage by 5%.', effect:{ type:'stat', classId:'ponybot', stat:'rangedDamage', amount:0.05 } },
    i3:{ name:'Targeting Solution', desc:'The optics finally agree with the emitter. Increases critical hit chance by 4%.', effect:{ type:'stat', classId:'ponybot', stat:'critChance', amount:0.04 } },
    i4:{ name:'Thermal Runaway', desc:'The chassis was never rated for this duty cycle, so the firmware forces a cooling pause it never used to need. Permanently increases fire cooldown by 5%. Nothing deeper in the emitter array opens without it.', cursed:true, effect:{ type:'stat', classId:'ponybot', stat:'fireCooldown', amount:0.05 } },
    i5a:{ name:'Redlined Emitter', desc:'Past every safe marking on the dial. Increases ranged damage by 6%.', effect:{ type:'stat', classId:'ponybot', stat:'rangedDamage', amount:0.06 } },
    i6a:{ name:'Coherent Column', desc:'The beam stops scattering and starts cutting. Increases ranged damage by 6%.', effect:{ type:'stat', classId:'ponybot', stat:'rangedDamage', amount:0.06 } },
    i7a:{ name:'Reserve Cell Bank', desc:'Two spare blue cells bolted to the frame — you start every run with 2 extra blue magic, the only life this chassis can hold. The bank draws off the emitter line: fire cooldown up 6%.', cost:2, effects:[
      { type:'startingPickup', pickup:'blue', amount:2 },
      { type:'stat', classId:'ponybot', stat:'fireCooldown', amount:0.06 },
    ] },
    i5b:{ name:'Spectral Analysis', desc:'The machine knows where the seams are. Increases critical hit chance by 4%.', effect:{ type:'stat', classId:'ponybot', stat:'critChance', amount:0.04 } },
    i6b:{ name:'Ablation Marking', desc:'The beam burns a mark everything else can aim at. Increases vulnerable chance by 3%.', effect:{ type:'stat', classId:'ponybot', stat:'vulnerableChance', amount:0.03 } },
    i7b:{ name:'Arc Discharge', desc:'Sometimes the charge goes somewhere it should not. Increases stun chance by 3%.', effect:{ type:'stat', classId:'ponybot', stat:'stunChance', amount:0.03 } },
    i8:{ name:'Doubled Emitter Stack', desc:'Two stages where the schematic called for one. Increases ranged damage by 4%.', effect:{ type:'stat', classId:'ponybot', stat:'rangedDamage', amount:0.04 } },
    i9:{ name:'Faster Recharge Loop', desc:'The capacitor tops itself off a little sooner. Reduces fire cooldown by 3%.', effect:{ type:'stat', classId:'ponybot', stat:'fireCooldown', amount:-0.03 } },
    i10:{ name:'Probability Subroutine', desc:'A jury-rigged luck heuristic that mostly works. Increases luck by 4%.', effect:{ type:'stat', classId:'ponybot', stat:'luck', amount:0.04 } },

    j1:{ name:'Servo Overhaul', desc:'New actuators in all four legs. Increases movement speed by 5%.', effect:{ type:'stat', classId:'ponybot', stat:'speed', amount:0.05 } },
    j2:{ name:'Gyro Balance', desc:'It no longer has to slow down to turn. Increases movement speed by 4%.', effect:{ type:'stat', classId:'ponybot', stat:'speed', amount:0.04 } },
    j3:{ name:'Evasion Routine', desc:'A sidestep the operator never has to think about. Increases dodge chance by 3%.', effect:{ type:'stat', classId:'ponybot', stat:'dodgeChance', amount:0.03 } },
    j4:{ name:'Power Diverted to Legs', desc:'Every watt spent on servos is a watt not spent on the gun. Permanently reduces ranged damage by 12%. Required to press deeper into the chassis.', cursed:true, effect:{ type:'stat', classId:'ponybot', stat:'rangedDamage', amount:-0.12 } },
    j5a:{ name:'Deflection Plating', desc:'Plate hung at an angle over the jury-rigged frame, so half of what hits it skids off instead of landing — dodge chance up 5%. Plate is heavy: movement speed down 4%.', cost:2, effects:[
      { type:'stat', classId:'ponybot', stat:'dodgeChance', amount:0.05 },
      { type:'stat', classId:'ponybot', stat:'speed', amount:-0.04 },
    ] },
    j6a:{ name:'Threat Prediction', desc:'It reads the room a frame ahead of everything in it. Increases dodge chance by 4%.', effect:{ type:'stat', classId:'ponybot', stat:'dodgeChance', amount:0.04 } },
    j7a:{ name:'Backup Core', desc:'A sealed spare core welded into the belly plate — one extra blue magic at the start of every run, which on a chassis that can never hold a heart container is a whole extra life. The core sits where a servo used to: movement speed down 3%.', cost:2, effects:[
      { type:'startingPickup', pickup:'blue', amount:1 },
      { type:'stat', classId:'ponybot', stat:'speed', amount:-0.03 },
    ] },
    j5b:{ name:'Salvage Magnet', desc:'A literal electromagnet, wired straight to the hopper. Increases pickup magnet radius by 4%.', effect:{ type:'stat', classId:'ponybot', stat:'magnetRadius', amount:0.04 } },
    j6b:{ name:'Wider Field Coil', desc:'The magnet\'s field pushed out another half-metre. Increases pickup magnet radius by 3%.', effect:{ type:'stat', classId:'ponybot', stat:'magnetRadius', amount:0.03 } },
    j7b:{ name:'Loot Heuristics', desc:'It has opinions about which door is worth taking. Increases luck by 4%.', effect:{ type:'stat', classId:'ponybot', stat:'luck', amount:0.04 } },
    j8:{ name:'Overclocked Drive Train', desc:'Well outside the tolerance printed on the housing. Increases movement speed by 5%.', effect:{ type:'stat', classId:'ponybot', stat:'speed', amount:0.05 } },
    j9:{ name:'Emergency Sidestep', desc:'One hard-coded panic manoeuvre. Increases dodge chance by 3%.', effect:{ type:'stat', classId:'ponybot', stat:'dodgeChance', amount:0.03 } },
    j10:{ name:'Friendly Handshake Protocol', desc:'It tries talking first, occasionally with results. Increases charm chance by 3%.', effect:{ type:'stat', classId:'ponybot', stat:'charmChance', amount:0.03 } },

    k1:{ name:'Schematic Cache', desc:'Blueprints for things it was never issued. Increases luck by 4%.', effect:{ type:'stat', classId:'ponybot', stat:'luck', amount:0.04 } },
    k2:{ name:'Machine Precision', desc:'No hoof shake, ever. Increases critical hit chance by 4%.', effect:{ type:'stat', classId:'ponybot', stat:'critChance', amount:0.04 } },
    k3:{ name:'Extended Optics', desc:'It can see a good deal further than it can shoot. Increases range by 4%.', effect:{ type:'stat', classId:'ponybot', stat:'rangeTiles', amount:0.04 } },
    k4:{ name:'Fabrication Cycle', desc:'Building things mid-fight means not shooting for a moment. Permanently increases fire cooldown by 5%. The foundry stays locked otherwise.', cursed:true, effect:{ type:'stat', classId:'ponybot', stat:'fireCooldown', amount:0.05 } },
    k5a:{ name:'Deployable Sentry Frame', desc:'Hold the build key to plant a stationary turret that fights alongside you for the rest of the room, exactly as an Engineer Pony would. Every part it plants is a part off your own emitter: ranged damage down 6%.', cost:2, effects:[
      { type:'uniqueFlag', classId:'ponybot', field:'canBuildTurrets', value:true },
      { type:'stat', classId:'ponybot', stat:'rangedDamage', amount:-0.06 },
    ] },
    k6a:{ name:'Sentry Gun Upgrade', desc:'Your turrets hit substantially harder. Hauling the heavier barrels around costs 3% movement speed.', cost:2, effects:[
      { type:'uniqueField', classId:'ponybot', field:'turretDamageMult', amount:0.15, min:-0.5, max:0.6 },
      { type:'stat', classId:'ponybot', stat:'speed', amount:-0.03 },
    ] },
    k7a:{ name:'Swarm Manufacture', desc:'Two more turrets can stand at once than the frame was rated for. The parts come out of your own gun: ranged damage down 5%.', cost:2, effects:[
      { type:'uniqueField', classId:'ponybot', field:'maxTurrets', amount:2, min:-2, max:4 },
      { type:'stat', classId:'ponybot', stat:'rangedDamage', amount:-0.05 },
    ] },
    k5b:{ name:'Coolant Leak', desc:'Whatever is dripping out of the knee joint is not water. Increases venom chance by 3%.', effect:{ type:'stat', classId:'ponybot', stat:'venomChance', amount:0.03 } },
    k6b:{ name:'Cryo Vent', desc:'Waste heat has to go somewhere, and the exhaust runs cold. Increases freeze chance by 3%.', effect:{ type:'stat', classId:'ponybot', stat:'freezeChance', amount:0.03 } },
    k7b:{ name:'Klaxon Protocol', desc:'It has one alarm tone and it is a bad one. Increases fear chance by 3%.', effect:{ type:'stat', classId:'ponybot', stat:'fearChance', amount:0.03 } },
    k8:{ name:'Rangefinder Array', desc:'The optics resolve a good deal further out. Increases range by 4%.', effect:{ type:'stat', classId:'ponybot', stat:'rangeTiles', amount:0.04 } },
    k9:{ name:'Weak-Point Database', desc:'Everything it has ever shot, catalogued by where it broke. Increases critical hit chance by 4%.', effect:{ type:'stat', classId:'ponybot', stat:'critChance', amount:0.04 } },

    l1:{ name:'Trimmed Firmware', desc:'Every wasted instruction stripped out of the fire loop. Reduces fire cooldown by 3%.', effect:{ type:'stat', classId:'ponybot', stat:'fireCooldown', amount:-0.03 } },
    l2:{ name:'Higher Rail Voltage', desc:'More potential behind every discharge. Increases ranged damage by 5%.', effect:{ type:'stat', classId:'ponybot', stat:'rangedDamage', amount:0.05 } },
    l3:{ name:'Sensor Fusion', desc:'Three bad sensors averaged into one good one. Increases critical hit chance by 4%.', effect:{ type:'stat', classId:'ponybot', stat:'critChance', amount:0.04 } },
    l4:{ name:'Risk Model Deleted', desc:'The subroutine that used to tell it which door was a bad idea has been overwritten with emitter code. Permanently reduces luck by 5%. The redline branch ends past this point.', cursed:true, effect:{ type:'stat', classId:'ponybot', stat:'luck', amount:-0.05 } },
    l5a:{ name:'Interrupt Priority', desc:'The fire routine now pre-empts everything else on the bus. Reduces fire cooldown by 4%.', effect:{ type:'stat', classId:'ponybot', stat:'fireCooldown', amount:-0.04 } },
    l6a:{ name:'Emitter Damage Report', desc:'Somewhere under all this, the gun is complaining. Increases ranged damage by 4%.', effect:{ type:'stat', classId:'ponybot', stat:'rangedDamage', amount:0.04 } },
    l7a:{ name:'Siege Capacitor', desc:'One enormous bank dumped into every shot: ranged damage up 10%, and the whole thing needs to recharge between pulses — fire cooldown up 8%.', cost:2, effects:[
      { type:'stat', classId:'ponybot', stat:'rangedDamage', amount:0.10 },
      { type:'stat', classId:'ponybot', stat:'fireCooldown', amount:0.08 },
    ] },
    l5b:{ name:'Dirty Discharge', desc:'The beam carries whatever was left in the barrel. Increases venom chance by 3%.', effect:{ type:'stat', classId:'ponybot', stat:'venomChance', amount:0.03 } },
    l6b:{ name:'EM Pulse Bloom', desc:'A hard pulse scrambles more than metal. Increases stun chance by 3%.', effect:{ type:'stat', classId:'ponybot', stat:'stunChance', amount:0.03 } },
    l7b:{ name:'Flash-Frost Exhaust', desc:'The cooling loop vents straight down the firing line. Increases freeze chance by 3%.', effect:{ type:'stat', classId:'ponybot', stat:'freezeChance', amount:0.03 } },
    l8:{ name:'Salvage Appraiser', desc:'It has learned which scrap heap is worth stopping at. Increases luck by 4%.', effect:{ type:'stat', classId:'ponybot', stat:'luck', amount:0.04 } },
    l9:{ name:'Hopper Intake', desc:'A wider mouth on the collection chute. Increases pickup magnet radius by 2%.', effect:{ type:'stat', classId:'ponybot', stat:'magnetRadius', amount:0.02 } },
  }},

  { classId:'griffin', nodes:{

    i1:{ name:'Stiffened Quills', desc:'A stiffer shaft flies flatter and faster. Increases bolt speed by 5%.', effect:{ type:'stat', classId:'griffin', stat:'boltSpeed', amount:0.05 } },
    i2:{ name:'Barbed Vane', desc:'Every feather now carries a hook on the way in. Increases ranged damage by 4%.', effect:{ type:'stat', classId:'griffin', stat:'rangedDamage', amount:0.04 } },
    i3:{ name:'Loosed on the Downbeat', desc:'Fire on the wingbeat instead of between them. Reduces fire cooldown by 3%.', effect:{ type:'stat', classId:'griffin', stat:'fireCooldown', amount:-0.03 } },
    i4:{ name:'Thinned Plumage', desc:'You cannot throw this many feathers and keep them heavy. Permanently reduces ranged damage by 5%. The volley past this point stays closed without it.', cursed:true, effect:{ type:'stat', classId:'griffin', stat:'rangedDamage', amount:-0.05 } },
    i5a:{ name:'Snap-Loosed Shafts', desc:'Feathers thrown hard enough to whistle. Increases bolt speed by 6%.', effect:{ type:'stat', classId:'griffin', stat:'boltSpeed', amount:0.06 } },

    i6a:{ name:'Raking Feather Line', desc:'The storm stops being individual feathers and becomes one raking flurry — a blur of strikes that always lands in exactly the same seam. A flurry that fast takes real work to loose: fire cooldown up 8%, and each strike carries 4% less than a single feather did.', cost:3, effects:[
      { type:'stat', classId:'griffin', stat:'critChance', amount:0.10 },
      { type:'stat', classId:'griffin', stat:'fireCooldown', amount:0.08 },
      { type:'stat', classId:'griffin', stat:'rangedDamage', amount:-0.04 },
    ] },
    i7a:{ name:'Planted Pinions', desc:'Both feet down and both wings braced, so the line comes out of you far faster than it should — fire cooldown down 5%. A griffin that has planted itself is a griffin that is not flying: movement speed down 5%.', cost:2, effects:[
      { type:'stat', classId:'griffin', stat:'fireCooldown', amount:-0.05 },
      { type:'stat', classId:'griffin', stat:'speed', amount:-0.05 },
    ] },
    i5b:{ name:'Raptor Focus', desc:'The eye picks the seam before the wing moves. Increases critical hit chance by 4%.', effect:{ type:'stat', classId:'griffin', stat:'critChance', amount:0.04 } },
    i6b:{ name:'Nest Filth', desc:'An aerie is not a clean place and neither are the feathers from one. Increases venom chance by 3%.', effect:{ type:'stat', classId:'griffin', stat:'venomChance', amount:0.03 } },
    i7b:{ name:'Weighted Shafts', desc:'A little lead at the base of each quill. Increases ranged damage by 5%.', effect:{ type:'stat', classId:'griffin', stat:'rangedDamage', amount:0.05 } },
    i8:{ name:'Killing Line', desc:'The hunter\'s trick of shooting where a thing will be. Increases critical hit chance by 4%.', effect:{ type:'stat', classId:'griffin', stat:'critChance', amount:0.04 } },
    i9:{ name:'Gale Behind the Throw', desc:'Loose downwind, always. Increases bolt speed by 5%.', effect:{ type:'stat', classId:'griffin', stat:'boltSpeed', amount:0.05 } },
    i10:{ name:'High Perch', desc:'Shooting from altitude buys you distance for free. Increases range by 4%.', effect:{ type:'stat', classId:'griffin', stat:'rangeTiles', amount:0.04 } },

    j1:{ name:'Hunting Dive', desc:'Wings back, nothing wasted. Increases movement speed by 5%.', effect:{ type:'stat', classId:'griffin', stat:'speed', amount:0.05 } },
    j2:{ name:'Long Glide', desc:'Cross the whole room without a single beat. Increases movement speed by 5%.', effect:{ type:'stat', classId:'griffin', stat:'speed', amount:0.05 } },
    j3:{ name:'Aerie Hoarding', desc:'A griffin takes everything back to the nest. Increases pickup magnet radius by 4%.', effect:{ type:'stat', classId:'griffin', stat:'magnetRadius', amount:0.04 } },
    j4:{ name:'Ragged Flight Feathers', desc:'Fly this hard for long enough and the primaries go. Permanently reduces bolt speed by 5%. Required to press deeper into the hunt.', cursed:true, effect:{ type:'stat', classId:'griffin', stat:'boltSpeed', amount:-0.05 } },
    j5a:{ name:'Stoop Velocity', desc:'The fastest thing in the sky, briefly. Increases movement speed by 6%.', effect:{ type:'stat', classId:'griffin', stat:'speed', amount:0.06 } },
    j6a:{ name:'Wing-Over', desc:'Roll out of the line of fire on instinct. Increases dodge chance by 4%.', effect:{ type:'stat', classId:'griffin', stat:'dodgeChance', amount:0.04 } },
    j7a:{ name:'Layered Down', desc:'A second coat under the flight feathers turns a good deal aside — you take 12% less damage from everything. All that loft costs you 4% movement speed.', cost:2, effects:[
      { type:'uniqueField', classId:'griffin', field:'damageTakenMult', amount:-0.12, min:-0.5, max:0.5 },
      { type:'stat', classId:'griffin', stat:'speed', amount:-0.04 },
    ] },
    j5b:{ name:'Scavenger\'s Nose', desc:'You always know which room already has something dead in it. Increases luck by 4%.', effect:{ type:'stat', classId:'griffin', stat:'luck', amount:0.04 } },
    j6b:{ name:'Preening Display', desc:'Half the hunt is looking like the wrong thing to fight. Increases charm chance by 3%.', effect:{ type:'stat', classId:'griffin', stat:'charmChance', amount:0.03 } },
    j7b:{ name:'Shriek from Above', desc:'The sound a griffin makes at the top of a dive. Increases fear chance by 3%.', effect:{ type:'stat', classId:'griffin', stat:'fearChance', amount:0.03 } },
    j8:{ name:'Talon Hooks', desc:'Nothing loose survives a low pass. Increases pickup magnet radius by 4%.', effect:{ type:'stat', classId:'griffin', stat:'magnetRadius', amount:0.04 } },
    j9:{ name:'Sightline of the Peaks', desc:'Mountain eyes, resolving things nothing else can. Increases range by 4%.', effect:{ type:'stat', classId:'griffin', stat:'rangeTiles', amount:0.04 } },
    j10:{ name:'Territory Sense', desc:'You know your ground better than whatever is standing on it. Increases luck by 4%.', effect:{ type:'stat', classId:'griffin', stat:'luck', amount:0.04 } },

    k1:{ name:'Predator\'s Patience', desc:'Rapid fire is a habit, not a rule. Increases critical hit chance by 4%.', effect:{ type:'stat', classId:'griffin', stat:'critChance', amount:0.04 } },
    k2:{ name:'Opened Wound', desc:'You leave something for the rest of the room to work with. Increases vulnerable chance by 3%.', effect:{ type:'stat', classId:'griffin', stat:'vulnerableChance', amount:0.03 } },
    k3:{ name:'Cliffside Angle', desc:'The best hunting perch is always the furthest one. Increases range by 4%.', effect:{ type:'stat', classId:'griffin', stat:'rangeTiles', amount:0.04 } },
    k4:{ name:'Grounded Stance', desc:'Heavy shots want a still shooter. Permanently reduces movement speed by 5%. The heavy end of this branch demands it.', cursed:true, effect:{ type:'stat', classId:'griffin', stat:'speed', amount:-0.05 } },
    k5a:{ name:'Eye of the Eagle-Half', desc:'The half of you that hunts from a mile up. Increases critical hit chance by 5%.', effect:{ type:'stat', classId:'griffin', stat:'critChance', amount:0.05 } },
    k6a:{ name:'Spine-Finder', desc:'Aiming for the one place a hit ends things. Increases critical hit chance by 4%.', effect:{ type:'stat', classId:'griffin', stat:'critChance', amount:0.04 } },
    k7a:{ name:'Bone-Cracker Quills', desc:'Quills the length of a foreleg, thrown one at a time: ranged damage up 10%, fire cooldown up 10%. The griffin\'s whole identity, traded away on purpose.', cost:2, effects:[
      { type:'stat', classId:'griffin', stat:'rangedDamage', amount:0.10 },
      { type:'stat', classId:'griffin', stat:'fireCooldown', amount:0.10 },
    ] },
    k5b:{ name:'Highland Chill', desc:'Air off the peaks, carried in on the shaft. Increases freeze chance by 3%.', effect:{ type:'stat', classId:'griffin', stat:'freezeChance', amount:0.03 } },
    k6b:{ name:'Buffeting Wings', desc:'A wingbeat to the head rings it properly. Increases stun chance by 3%.', effect:{ type:'stat', classId:'griffin', stat:'stunChance', amount:0.03 } },
    k7b:{ name:'Carrion Barbs', desc:'Feathers pulled from something long dead. Increases venom chance by 3%.', effect:{ type:'stat', classId:'griffin', stat:'venomChance', amount:0.03 } },
    k8:{ name:'Drink from the Kill', desc:'A hunter takes its meal where it falls. Increases lifesteal chance by 4%.', effect:{ type:'stat', classId:'griffin', stat:'lifestealChance', amount:0.04 } },
    k9:{ name:'Lion-Half Appetite', desc:'The other half of you is never full either. Increases lifesteal chance by 4%.', effect:{ type:'stat', classId:'griffin', stat:'lifestealChance', amount:0.04 } },

    l1:{ name:'Full Quiver of Wing', desc:'More feathers to spend means less care about spending them. Increases ranged damage by 5%.', effect:{ type:'stat', classId:'griffin', stat:'rangedDamage', amount:0.05 } },
    l2:{ name:'Tailwind Loosing', desc:'Throw with the gale, never across it. Increases bolt speed by 5%.', effect:{ type:'stat', classId:'griffin', stat:'boltSpeed', amount:0.05 } },
    l3:{ name:'Updraft Reader', desc:'You can read a room\'s air the way others read its floor. Increases luck by 4%.', effect:{ type:'stat', classId:'griffin', stat:'luck', amount:0.04 } },
    l4:{ name:'Close-Quarters Habit', desc:'Firing this fast means firing this near. Permanently reduces range by 4%. The end of this branch demands it.', cursed:true, effect:{ type:'stat', classId:'griffin', stat:'rangeTiles', amount:-0.04 } },
    l5a:{ name:'Blur of Wing', desc:'The wing never fully stops moving. Reduces fire cooldown by 4%.', effect:{ type:'stat', classId:'griffin', stat:'fireCooldown', amount:-0.04 } },
    l6a:{ name:'Frantic Molt', desc:'Shedding feathers faster than any griffin should: fire cooldown down 3%, and each feather carries 5% less behind it.', effects:[
      { type:'stat', classId:'griffin', stat:'fireCooldown', amount:-0.03 },
      { type:'stat', classId:'griffin', stat:'rangedDamage', amount:-0.05 },
    ] },
    l7a:{ name:'Feathers That Never Fall', desc:'Your feathers stop losing momentum entirely — they fly until a wall stops them, however far the room runs. Feathers that light are also slow: bolt speed down 6%.', cost:2, effects:[
      { type:'uniqueFlag', classId:'griffin', field:'unlimitedRange', value:true },
      { type:'stat', classId:'griffin', stat:'boltSpeed', amount:-0.06 },
    ] },
    l5b:{ name:'Broken Line', desc:'Never twice from the same piece of air. Increases dodge chance by 4%.', effect:{ type:'stat', classId:'griffin', stat:'dodgeChance', amount:0.04 } },
    l6b:{ name:'Plucked Guard', desc:'The first feathers go where the armour is. Increases vulnerable chance by 3%.', effect:{ type:'stat', classId:'griffin', stat:'vulnerableChance', amount:0.03 } },
    l7b:{ name:'Golden Crest', desc:'Some things simply do not want to fight something that looks like that. Increases charm chance by 3%.', effect:{ type:'stat', classId:'griffin', stat:'charmChance', amount:0.03 } },
    l8:{ name:'Storm-Fed Wing', desc:'A gale in the primaries and everything it carries. Increases ranged damage by 5%.', effect:{ type:'stat', classId:'griffin', stat:'rangedDamage', amount:0.05 } },
    l9:{ name:'Wide Sweep', desc:'One low pass and the floor is clean. Increases pickup magnet radius by 4%.', effect:{ type:'stat', classId:'griffin', stat:'magnetRadius', amount:0.04 } },
  }},

  { classId:'kirin', nodes:{

    i1:{ name:'Banked Coal', desc:'Something is always smouldering under the mane. Increases ranged damage by 5%.', effect:{ type:'stat', classId:'kirin', stat:'rangedDamage', amount:0.05 } },
    i2:{ name:'Rising Temper', desc:'Every room stokes it a little higher. Increases ranged damage by 5%.', effect:{ type:'stat', classId:'kirin', stat:'rangedDamage', amount:0.05 } },
    i3:{ name:'White-Heat Focus', desc:'The hottest part of a flame is the smallest part. Increases critical hit chance by 5%.', effect:{ type:'stat', classId:'kirin', stat:'critChance', amount:0.05 } },
    i4:{ name:'Slow Kindling', desc:'A fire this size does not catch quickly. Permanently increases fire cooldown by 5%. The nirik past this point does not wake without it.', cursed:true, effect:{ type:'stat', classId:'kirin', stat:'fireCooldown', amount:0.05 } },
    i5a:{ name:'Forge-Breath', desc:'Air pulled straight over the coals. Increases ranged damage by 6%.', effect:{ type:'stat', classId:'kirin', stat:'rangedDamage', amount:0.06 } },
    i6a:{ name:'Nirik Ignition', desc:'The rage finally takes: your bolts become a held, charged jet of nirik fire — hold the attack, and a full charge looses a short cone that burns through everything in its path for 8% more damage. Nothing at all fires until the charge fills, and the jet reaches only a fraction as far as a bolt did.', cost:3, effects:[
      { type:'uniqueFlag', classId:'kirin', field:'charged', value:true },
      { type:'uniqueField', classId:'kirin', field:'chargeTime', amount:0.5, min:0, max:1.5 },
      { type:'stat', classId:'kirin', stat:'rangedDamage', amount:0.08 },
    ] },
    i7a:{ name:'Flashpoint Temper', desc:'The nirik wakes noticeably faster — charge time cut by 0.15s. A fire that catches that quickly never burns as hot: ranged damage down 5%.', cost:2, effects:[
      { type:'uniqueField', classId:'kirin', field:'chargeTime', amount:-0.15, min:0, max:1.5 },
      { type:'stat', classId:'kirin', stat:'rangedDamage', amount:-0.05 },
    ] },
    i5b:{ name:'Cinder-Eye', desc:'You can see exactly where a thing will catch. Increases critical hit chance by 5%.', effect:{ type:'stat', classId:'kirin', stat:'critChance', amount:0.05 } },
    i6b:{ name:'Choking Smoke', desc:'The smoke off a nirik is not survivable either. Increases venom chance by 4%.', effect:{ type:'stat', classId:'kirin', stat:'venomChance', amount:0.04 } },
    i7b:{ name:'Ash-Shock', desc:'Everything that burns that fast goes cold just as fast. Increases freeze chance by 4%.', effect:{ type:'stat', classId:'kirin', stat:'freezeChance', amount:0.04 } },
    i8:{ name:'Deep Furnace', desc:'The fire goes further down than anypony wants to know. Increases ranged damage by 5%.', effect:{ type:'stat', classId:'kirin', stat:'rangedDamage', amount:0.05 } },
    i9:{ name:'Killing Ember', desc:'One ember in the right place ends things. Increases critical hit chance by 5%.', effect:{ type:'stat', classId:'kirin', stat:'critChance', amount:0.05 } },
    i10:{ name:'Thrown Cinders', desc:'Sparks travel faster than flame. Increases bolt speed by 5%.', effect:{ type:'stat', classId:'kirin', stat:'boltSpeed', amount:0.05 } },

    j1:{ name:'Light on the Ash', desc:'A kirin leaves scorch marks, not hoofprints. Increases movement speed by 3%.', effect:{ type:'stat', classId:'kirin', stat:'speed', amount:0.03 } },
    j2:{ name:'Heat-Shimmer', desc:'The air around you lies about where you are. Increases dodge chance by 3%.', effect:{ type:'stat', classId:'kirin', stat:'dodgeChance', amount:0.03 } },
    j3:{ name:'Draw of the Flame', desc:'Fire pulls everything loose toward it. Increases pickup magnet radius by 5%.', effect:{ type:'stat', classId:'kirin', stat:'magnetRadius', amount:0.05 } },
    j4:{ name:'Cooled Coals', desc:'Staying alive means not burning at full. Permanently reduces ranged damage by 5%. Required to press deeper into this branch.', cursed:true, effect:{ type:'stat', classId:'kirin', stat:'rangedDamage', amount:-0.05 } },
    j5a:{ name:'Smoke-Step', desc:'Half of you is smoke at any given moment. Increases dodge chance by 3%.', effect:{ type:'stat', classId:'kirin', stat:'dodgeChance', amount:0.03 } },
    j6a:{ name:'Nothing to Grab', desc:'A body this hot is a body nothing wants to hold. Increases dodge chance by 2%.', effect:{ type:'stat', classId:'kirin', stat:'dodgeChance', amount:0.02 } },
    j7a:{ name:'Ember-Cooled Hide', desc:'The scales finally hold heat instead of passing it through — you take 20% less damage from everything, which on half a heart of hide is the difference between a bad room and the last one. Carrying that much slag costs 3% movement speed.', cost:3, effects:[
      { type:'uniqueField', classId:'kirin', field:'damageTakenMult', amount:-0.20, min:-0.5, max:0.5 },
      { type:'stat', classId:'kirin', stat:'speed', amount:-0.03 },
    ] },
    j5b:{ name:'Stream-Kissed', desc:'The old kirin remedy still works, a little. Increases luck by 5%.', effect:{ type:'stat', classId:'kirin', stat:'luck', amount:0.05 } },
    j6b:{ name:'Village Memory', desc:'You have been through worse rooms than this one. Increases luck by 5%.', effect:{ type:'stat', classId:'kirin', stat:'luck', amount:0.05 } },
    j7b:{ name:'Updraft of the Blaze', desc:'Hot air lifts everything light off the floor and toward you. Increases pickup magnet radius by 5%.', effect:{ type:'stat', classId:'kirin', stat:'magnetRadius', amount:0.05 } },
    j8:{ name:'Fanned Gait', desc:'Fire moves fastest when it is moving away from something. Increases movement speed by 3%.', effect:{ type:'stat', classId:'kirin', stat:'speed', amount:0.03 } },
    j9:{ name:'Long Scorch', desc:'The burn reaches further than the flame does. Increases range by 5%.', effect:{ type:'stat', classId:'kirin', stat:'rangeTiles', amount:0.05 } },
    j10:{ name:'Fortune of the Nirik', desc:'Things go well for a while, and then they go very badly. Increases luck by 5%.', effect:{ type:'stat', classId:'kirin', stat:'luck', amount:0.05 } },

    k1:{ name:'Silence Before the Burn', desc:'A kirin says nothing at all right before it goes up. Increases stun chance by 4%.', effect:{ type:'stat', classId:'kirin', stat:'stunChance', amount:0.04 } },
    k2:{ name:'Stream-Song', desc:'The old song still turns most things aside. Increases charm chance by 4%.', effect:{ type:'stat', classId:'kirin', stat:'charmChance', amount:0.04 } },
    k3:{ name:'Cold Water Vow', desc:'The vow that keeps the fire down, used as a weapon instead. Increases freeze chance by 4%.', effect:{ type:'stat', classId:'kirin', stat:'freezeChance', amount:0.04 } },
    k4:{ name:'Vow of Stillness', desc:'Holding the rage back blunts what is left of it. Permanently reduces critical hit chance by 5%. The far end of this branch demands it.', cursed:true, effect:{ type:'stat', classId:'kirin', stat:'critChance', amount:-0.05 } },
    k5a:{ name:'Thunderclap Quiet', desc:'The silence lands harder than the noise would have. Increases stun chance by 5%.', effect:{ type:'stat', classId:'kirin', stat:'stunChance', amount:0.05 } },
    k6a:{ name:'Smouldering Lungs', desc:'Whatever you exhale, nothing else should breathe. Increases venom chance by 5%.', effect:{ type:'stat', classId:'kirin', stat:'venomChance', amount:0.05 } },
    k7a:{ name:'Wildfire Unbounded', desc:'Your fire stops going out with distance — it carries until a wall stops it, however far the room runs. Fire that spreads that far spreads slowly: bolt speed down 6%.', cost:2, effects:[
      { type:'uniqueFlag', classId:'kirin', field:'unlimitedRange', value:true },
      { type:'stat', classId:'kirin', stat:'boltSpeed', amount:-0.06 },
    ] },
    k5b:{ name:'Warmth Worth Following', desc:'Not everything that comes to a fire wants to fight it. Increases charm chance by 5%.', effect:{ type:'stat', classId:'kirin', stat:'charmChance', amount:0.05 } },
    k6b:{ name:'Quenched Instant', desc:'Everything the fire touches and then abandons goes rigid. Increases freeze chance by 5%.', effect:{ type:'stat', classId:'kirin', stat:'freezeChance', amount:0.05 } },
    k7b:{ name:'Fumes of the Nirik', desc:'The air behind a nirik stays poison long after it has gone. Increases venom chance by 5%.', effect:{ type:'stat', classId:'kirin', stat:'venomChance', amount:0.05 } },
    k8:{ name:'Heat Haze Horizon', desc:'You can strike as far as the shimmer reaches. Increases range by 5%.', effect:{ type:'stat', classId:'kirin', stat:'rangeTiles', amount:0.05 } },
    k9:{ name:'Concussion of the Flare', desc:'A flare that size arrives before its own sound. Increases stun chance by 4%.', effect:{ type:'stat', classId:'kirin', stat:'stunChance', amount:0.04 } },

    l1:{ name:'Bellows Rhythm', desc:'Breathe with the fire, not against it. Reduces fire cooldown by 3%.', effect:{ type:'stat', classId:'kirin', stat:'fireCooldown', amount:-0.03 } },
    l2:{ name:'Hammered Flame', desc:'Fire folded over on itself like steel. Increases ranged damage by 5%.', effect:{ type:'stat', classId:'kirin', stat:'rangedDamage', amount:0.05 } },
    l3:{ name:'Spark-Thrower', desc:'Sparks off the anvil, moving faster than they have any right to. Increases bolt speed by 5%.', effect:{ type:'stat', classId:'kirin', stat:'boltSpeed', amount:0.05 } },
    l4:{ name:'Guttering Forge', desc:'A forge left too long between strikes goes cold. Permanently increases fire cooldown by 6%. Required to press deeper into the forge.', cursed:true, effect:{ type:'stat', classId:'kirin', stat:'fireCooldown', amount:0.06 } },
    l5a:{ name:'Struck While Hot', desc:'No waiting between blows. Reduces fire cooldown by 4%.', effect:{ type:'stat', classId:'kirin', stat:'fireCooldown', amount:-0.04 } },
    l6a:{ name:'Chainflame Rhythm', desc:'Flame after flame with nothing between them: fire cooldown down 3%, and each one carries 6% less.', effects:[
      { type:'stat', classId:'kirin', stat:'fireCooldown', amount:-0.03 },
      { type:'stat', classId:'kirin', stat:'rangedDamage', amount:-0.06 },
    ] },

    l7a:{ name:'Sunline Beam', desc:'The wrath narrows to a single line — every shot finds the one seam that matters. Spreading the fire that thin costs it its weight: ranged damage down 10%.', cost:3, effects:[
      { type:'stat', classId:'kirin', stat:'critChance', amount:0.12 },
      { type:'stat', classId:'kirin', stat:'rangedDamage', amount:-0.10 },
    ] },
    l5b:{ name:'Anvil Eye', desc:'A smith sees the flaw before the hammer falls. Increases critical hit chance by 5%.', effect:{ type:'stat', classId:'kirin', stat:'critChance', amount:0.05 } },
    l6b:{ name:'Coal-Sifter', desc:'You have always been able to tell which pile is worth digging. Increases luck by 5%.', effect:{ type:'stat', classId:'kirin', stat:'luck', amount:0.05 } },
    l7b:{ name:'Draw of the Forge', desc:'The forge pulls its own fuel in. Increases pickup magnet radius by 5%.', effect:{ type:'stat', classId:'kirin', stat:'magnetRadius', amount:0.05 } },
    l8:{ name:'Quench and Temper', desc:'The last blow is always the hardest one. Increases ranged damage by 5%.', effect:{ type:'stat', classId:'kirin', stat:'rangedDamage', amount:0.05 } },
    l9:{ name:'Forge-Flung', desc:'Thrown off the anvil at full heat. Increases bolt speed by 5%.', effect:{ type:'stat', classId:'kirin', stat:'boltSpeed', amount:0.05 } },
  }},
];

const SKILL_TREE_PARENT_4B = {
  i1:null, i2:'i1', i3:'i2', i4:'i3', i5a:'i4', i6a:'i5a', i7a:'i6a', i5b:'i4', i6b:'i5b', i7b:'i6b', i8:'i3', i9:'i8', i10:'i9',
  j1:null, j2:'j1', j3:'j2', j4:'j3', j5a:'j4', j6a:'j5a', j7a:'j6a', j5b:'j4', j6b:'j5b', j7b:'j6b', j8:'j3', j9:'j8', j10:'j9',
  k1:null, k2:'k1', k3:'k2', k4:'k3', k5a:'k4', k6a:'k5a', k7a:'k6a', k5b:'k4', k6b:'k5b', k7b:'k6b', k8:'k3', k9:'k8',
  l1:null, l2:'l1', l3:'l2', l4:'l3', l5a:'l4', l6a:'l5a', l7a:'l6a', l5b:'l4', l6b:'l5b', l7b:'l6b', l8:'l3', l9:'l8',
};
const SKILL_TREE_ORDER_4B = [
  'i1','i2','i3','i4','i5a','i6a','i7a','i5b','i6b','i7b','i8','i9','i10',
  'j1','j2','j3','j4','j5a','j6a','j7a','j5b','j6b','j7b','j8','j9','j10',
  'k1','k2','k3','k4','k5a','k6a','k7a','k5b','k6b','k7b','k8','k9',
  'l1','l2','l3','l4','l5a','l6a','l7a','l5b','l6b','l7b','l8','l9',
];

const SKILL_TREE_CHARACTER_NODES_4B = [];
(function buildCharacterSkillNodes4B(){
  for (const cfg of SKILL_TREE_CHARACTER_CONFIG_4B) {
    const classId = cfg.classId;
    for (const key of SKILL_TREE_ORDER_4B) {
      const content = cfg.nodes[key];
      const parentKey = SKILL_TREE_PARENT_4B[key];
      const node = {
        id: 'char_' + classId + '_' + key,
        parent: parentKey ? ('char_' + classId + '_' + parentKey) : ('char_hub_' + classId),
        cost: content.cost || 1,
        name: content.name,
        desc: content.desc,
      };

      if (content.effects) node.effects = content.effects;
      else node.effect = content.effect;
      if (content.cursed) node.cursed = true;
      SKILL_TREE_CHARACTER_NODES_4B.push(node);
    }
  }
})();

for (const n of SKILL_TREE_CHARACTER_NODES_4B) {
  SKILL_TREE_NODES.push(n);
  SKILL_TREE_NODES_BY_ID[n.id] = n;
}
