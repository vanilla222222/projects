'use strict';

// Each path teaches a technique at node two and changes its behavior at node three.
const SKILL_TECHNIQUES = {
  earth: [
    ['Fault Step', 'hit', 4, 'self', 82, 'shove', 'quake', 'Every fourth hit knocks nearby enemies back.', 'The stomp also damages enemies it pushes.'],
    ['Bedrock Brace', 'hurt', 7, 'self', 96, 'guard', 'shove', 'After taking damage, briefly brace against the next hit.', 'Bracing also throws back nearby enemies.'],
  ],
  pegasus: [
    ['Slipstream Cut', 'move', 155, 'forward', 105, 'lance', 'mark', 'After travelling 155 pixels in combat, cut through the lane ahead.', 'The cut leaves enemies vulnerable.'],
    ['Wing Screen', 'hit', 5, 'self', 100, 'screen', 'haste', 'Every fifth hit deflects nearby hostile shots.', 'Deflecting a shot gives a brief burst of speed.'],
  ],
  unicorn: [
    ['Refract', 'hit', 5, 'impact', 165, 'ricochet', 'mark', 'Every fifth hit arcs to a second enemy.', 'The second enemy is also marked vulnerable.'],
    ['Astral Pin', 'hit', 6, 'impact', 68, 'freeze', 'quake', 'Every sixth hit freezes enemies around the impact.', 'The pin also damages enemies in the cluster.'],
  ],
  batpony: [
    ['Night Scent', 'kill', 3, 'impact', 156, 'mark', 'haste', 'Every third kill exposes nearby enemies.', 'A successful mark also grants a burst of speed.'],
    ['Blood Flight', 'hurt', 8, 'self', 104, 'fear', 'mend', 'After taking damage, scatter nearby enemies.', 'Recover half a red heart if the screech scatters an enemy.'],
  ],
  zebra: [
    ['Spill the Brew', 'hit', 4, 'impact', 70, 'poison', 'freeze', 'Every fourth hit poisons enemies around the impact.', 'The spill also briefly freezes those enemies.'],
    ['Omen Circle', 'kill', 3, 'impact', 94, 'charm', 'guard', 'Every third kill charms nearby enemies.', 'A successful charm also grants a brief guard.'],
  ],
  hypogriff: [
    ['Talon Draft', 'hit', 4, 'forward', 126, 'lance', 'shove', 'Every fourth hit rakes a lane ahead.', 'The rake sends enemies in that lane backward.'],
    ['Wing Hook', 'move', 180, 'forward', 146, 'pull', 'mark', 'After travelling 180 pixels in combat, pull enemies ahead toward you.', 'Pulled enemies also take increased damage.'],
  ],
  seapony: [
    ['Undertow', 'hit', 4, 'impact', 100, 'pull', 'quake', 'Every fourth hit pulls nearby enemies toward the impact.', 'The collapse also deals damage.'],
    ['Foam Break', 'hurt', 8, 'self', 112, 'screen', 'freeze', 'Taking damage clears hostile shots in a ring.', 'The ring also freezes nearby enemies.'],
  ],
  ponybot: [
    ['Circuit Breaker', 'hit', 7, 'impact', 150, 'ricochet', 'freeze', 'Every seventh hit discharges into the nearest other enemy.', 'The discharge also briefly freezes its target.'],
    ['Emergency Ground', 'hurt', 8, 'self', 122, 'screen', 'guard', 'Taking damage grounds nearby hostile projectiles.', 'Successful grounding grants a brief guard.'],
  ],
  griffin: [
    ['Carrion Dive', 'kill', 3, 'impact', 175, 'ricochet', 'shove', 'Every third kill sends a follow-up strike to a nearby enemy.', 'The follow-up knocks its target away from the kill.'],
    ['Cross Talon', 'move', 175, 'forward', 156, 'lance', 'quake', 'After travelling 175 pixels in combat, rake enemies in a narrow lane.', 'A successful rake also bursts around you.'],
  ],
  kirin: [
    ['Ash Wake', 'move', 140, 'behind', 92, 'poison', 'quake', 'After travelling 140 pixels in combat, sear enemies trailing you.', 'The ash also deals an immediate burst of damage.'],
    ['Flashpoint', 'hit', 5, 'impact', 86, 'quake', 'fear', 'Every fifth hit ignites a blast at the point of impact.', 'The blast sends surviving enemies fleeing.'],
  ],
  dragon: [
    ['Coinflare', 'kill', 3, 'impact', 97, 'hoard', 'shove', 'Every third kill ignites a blast that grows with carried coins.', 'The blast also knocks survivors away.'],
    ['Backdraft', 'hit', 4, 'forward', 140, 'pull', 'poison', 'Every fourth hit draws enemies ahead into breath range.', 'Pulled enemies continue taking damage over time.'],
  ],
  windigo: [
    ['Whiteout', 'hurt', 8, 'self', 126, 'freeze', 'screen', 'Taking damage freezes enemies nearby.', 'The whiteout also clears hostile shots.'],
    ['Ice Fault', 'hit', 4, 'impact', 103, 'quake', 'freeze', 'Every fourth hit cracks the ice around the impact.', 'Survivors are frozen in place.'],
  ],
  kelpie: [
    ['Drown the Bank', 'kill', 3, 'impact', 105, 'pull', 'poison', 'Every third kill drags nearby enemies toward it.', 'Dragged enemies take damage over time.'],
    ['Water Lash', 'hit', 4, 'forward', 155, 'lance', 'fear', 'Every fourth hit lashes enemies farther along the swing lane.', 'Survivors flee from the lash.'],
  ],
  breezie: [
    ['Gust Veil', 'move', 170, 'self', 83, 'screen', 'haste', 'After travelling 170 pixels in combat, sweep away nearby shots.', 'Sweeping away a shot briefly increases movement speed.'],
    ['Mote Crosswind', 'hit', 6, 'impact', 110, 'shove', 'poison', 'Every sixth hit scatters enemies from the impact.', 'Scattered enemies also take damage over time.'],
  ],
  dnbpony: [
    ['Downbeat', 'hit', 5, 'self', 126, 'syncopate', 'quake', 'Land five hits without a gap longer than 1.15 seconds to stun nearby enemies.', 'The downbeat also deals damage.'],
    ['Feedback Loop', 'hurt', 7, 'self', 142, 'fear', 'screen', 'Taking damage drives nearby enemies away.', 'The feedback also deletes hostile shots.'],
  ],
  crystalpony: [
    ['Prism Split', 'hit', 6, 'impact', 170, 'ricochet', 'ricochet', 'Every sixth hit refracts into another enemy.', 'Refraction splits into up to two secondary targets.'],
    ['Glass Cage', 'hit', 5, 'impact', 84, 'pull', 'freeze', 'Every fifth shard hit draws enemies into the volley.', 'The cage freezes enemies it catches.'],
  ],
  mule: [
    ['Pack Brace', 'hurt', 7, 'self', 95, 'guard', 'mark', 'Taking damage briefly guards against the next hit.', 'Nearby enemies are marked while you brace.'],
    ['Kickback', 'hit', 4, 'forward', 122, 'shove', 'quake', 'Every fourth hit kicks enemies in front of you away.', 'The kick also damages enemies it reaches.'],
  ],
  alicorn: [
    ['Orbit Edict', 'kill', 3, 'self', 136, 'screen', 'quake', 'Every third kill clears hostile shots around you.', 'The edict also damages nearby enemies.'],
    ['Falling Crown', 'hit', 5, 'impact', 95, 'mark', 'ricochet', 'Every fifth hit exposes the enemies around it.', 'The crown also jumps to a nearby secondary enemy.'],
  ],
  changeling: [
    ['Stolen Breath', 'kill', 4, 'impact', 102, 'charm', 'mend', 'Every fourth kill charms nearby enemies.', 'A successful charm recovers half a red heart.'],
    ['Pool Collapse', 'hit', 5, 'impact', 114, 'pull', 'quake', 'Every fifth direct pool tick drags enemies into its center.', 'The collapse also damages the cluster.'],
  ],
  diamonddog: [
    ['Fault Tunnel', 'move', 160, 'forward', 118, 'lance', 'mark', 'After travelling 160 pixels in combat, crack the ground ahead.', 'Enemies in the crack are also exposed.'],
    ['Quarry Shock', 'blast', 2, 'impact', 130, 'shove', 'quake', 'Every second bomb pushes enemies outward from the blast.', 'The shock deals damage beyond the original blast.'],
  ],
  gargoyle: [
    ['Perch Release', 'hurt', 7, 'self', 115, 'shove', 'guard', 'Taking damage knocks enemies away from your perch.', 'The release briefly guards against the next hit.'],
    ['Crack Shot', 'hit', 4, 'impact', 106, 'mark', 'lance', 'Every fourth hit exposes enemies around the impact.', 'The fracture also strikes a lane beyond the impact.'],
  ],
  changedling: [
    ['Ember Castoff', 'hurt', 7, 'self', 110, 'quake', 'poison', 'Taking damage sheds a damaging ring of embers.', 'Lingering embers continue damaging survivors.'],
    ['Kiln Orbit', 'move', 165, 'self', 104, 'poison', 'screen', 'After travelling 165 pixels in combat, scorch nearby enemies.', 'The orbit also burns away hostile shots.'],
  ],
  changelingqueen: [
    ['Brood Claim', 'kill', 3, 'impact', 115, 'mark', 'pull', 'Every third kill marks nearby enemies for the brood.', 'Marked enemies are drawn toward the kill.'],
    ['Hive Alarm', 'hurt', 8, 'self', 128, 'charm', 'summon', 'Taking damage charms nearby enemies.', 'The alarm also calls one brood member if there is room.'],
  ],
  filly: [
    ['Scram!', 'hurt', 7, 'self', 103, 'haste', 'fear', 'Taking damage gives you a burst of speed.', 'Nearby enemies also panic.'],
    ['Make Friends', 'hit', 5, 'impact', 79, 'charm', 'screen', 'Every fifth hit charms enemies around the target.', 'The charm also clears nearby hostile shots.'],
  ],
  engineerpony: [
    ['Scrap Magnet', 'kill', 4, 'impact', 124, 'pull', 'screen', 'Every fourth kill draws nearby enemies to the scrap.', 'The magnet also pulls hostile shots out of the air.'],
    ['Crossfire Relay', 'hit', 5, 'impact', 157, 'relay', 'mark', 'Every fifth hit relays a shot from the nearest turret.', 'The relay shot also exposes its target.'],
  ],
  chudfilly: [
    ['Hive Reflex', 'hurt', 7, 'self', 125, 'poison', 'shove', 'Taking damage sends the swarm to sting nearby enemies.', 'The swarm also knocks the attackers away.'],
    ['Feeding Frenzy', 'kill', 3, 'impact', 142, 'ricochet', 'poison', 'Every third kill sends a fly strike into another enemy.', 'The fly leaves a lingering sting.'],
  ],
  chadfilly: [
    ['Blast Draft', 'blast', 2, 'impact', 126, 'screen', 'haste', 'Every second bomb clears nearby hostile shots.', 'Clearing shots briefly increases movement speed.'],
    ['Shaped Charge', 'blast', 3, 'impact', 154, 'lance', 'mark', 'Every third bomb sends a directional shock down your facing lane.', 'The shock exposes survivors.'],
  ],
  snowpitymare: [
    ['Cold Lantern', 'kill', 3, 'impact', 102, 'freeze', 'ricochet', 'Every third kill freezes enemies around its remains.', 'The lantern also sends a spark to a secondary enemy.'],
    ['Wisp Shelter', 'hurt', 8, 'self', 106, 'screen', 'guard', 'Taking damage makes the wisps clear nearby projectiles.', 'Successful interception briefly guards against the next hit.'],
  ],
};
