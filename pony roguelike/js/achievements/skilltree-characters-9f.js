'use strict';

const SKILL_TREE_UF_BOUNDS_9F = {
  'chudfilly|damageTakenMult':          { min:-0.25, max:0.25 },
  'chudfilly|baseMeleeDamage':          { min:0,    max:3.5 },
  'chudfilly|baseRangedDamage':         { min:0,    max:3 },
  'chudfilly|fireRingRadius':           { min:0,    max:60 },
  'chudfilly|changelingMinionDmg':      { min:0,    max:3 },
  'chudfilly|changelingMinionRadius':   { min:0,    max:60 },
  'chudfilly|changelingSummonCooldown': { min:-5,   max:0 },
  'chadfilly|damageTakenMult':          { min:-0.25, max:0.25 },
  'chadfilly|baseMeleeDamage':          { min:0,    max:4.5 },
  'chadfilly|baseRangedDamage':         { min:0,    max:3 },
  'chadfilly|turretDamageMult':         { min:0,    max:0.5 },
  'chadfilly|changelingMinionDmg':      { min:0,    max:3 },
  'chadfilly|changelingMinionRadius':   { min:0,    max:60 },
  'chadfilly|changelingSummonCooldown': { min:-5,   max:0 },
  'snowpitymare|damageTakenMult':       { min:-0.25, max:0.25 },
  'snowpitymare|baseRangedDamage':      { min:0,    max:5 },
  'snowpitymare|fireRingRadius':        { min:0,    max:60 },
  'snowpitymare|turretDamageMult':      { min:0,    max:0.5 },
};

function ST9F(classId, stat, amount){ return { type:'stat', classId, stat, amount }; }
function UF9F(classId, field, amount){
  const b = SKILL_TREE_UF_BOUNDS_9F[classId + '|' + field];
  return { type:'uniqueField', classId, field, amount, min:b.min, max:b.max };
}
function FL9F(classId, field, value){ return { type:'uniqueFlag', classId, field, value }; }

const SKILL_TREE_CHARACTER_CONFIG_9F = {

  chudfilly: { nodes: [
    { k:'d1', p:null, cursed:true, name:'Touched Grass Once', desc:'It went badly, the flies were appalled, and something about her has been slightly wrong ever since. Permanently increases damage taken by 5%. Neither line below opens any other way.',
      e:UF9F('chudfilly','damageTakenMult',0.05) },
    { k:'d2a', p:'d1', name:'Thicker Than Air', desc:'Nine flies is enough flies that most things swing at a fly instead of at her. Increases dodge chance by 6%.',
      e:ST9F('chudfilly','dodgeChance',0.06) },
    { k:'d3a', p:'d2a', name:'Bug Blanket', desc:'They have started sleeping on her, which is disgusting and also armour. Reduces damage taken by 4%.',
      e:UF9F('chudfilly','damageTakenMult',-0.04) },
    { k:'d4a', p:'d3a', name:'Feeds The Swarm First', desc:'Whatever goes down gets picked over and a little of it comes back to her. Gives kills a 4% chance to mend her.',
      e:ST9F('chudfilly','onKillHealChance',0.04) },
    { k:'d2b', p:'d1', name:'Loud Opinions', desc:'She has told the corridor exactly what she thinks of it and the corridor is visibly shaken. Increases vulnerable chance by 7%.',
      e:ST9F('chudfilly','vulnerableChance',0.07) },
    { k:'d3b', p:'d2b', name:'Deeply Unwell', desc:'Something in the way she looks at a target makes the flies aim better. Increases critical chance by 7%.',
      e:ST9F('chudfilly','critChance',0.07) },
    { k:'d4b', p:'d3b', name:'Blocked Everypony', desc:'Nothing down here has been able to get a word in since floor two. Increases fear chance by 5%.',
      e:ST9F('chudfilly','fearChance',0.05) },
    { k:'d5', p:'d4a', pp:['d4b'], cost:2, icon:'🪰', name:'Swarm Consensus', desc:'The flies and the filly finally want the same thing at the same time, which has never once happened before. Increases dodge chance by 5% and vulnerable chance by 5%.',
      es:[ST9F('chudfilly','dodgeChance',0.05), ST9F('chudfilly','vulnerableChance',0.05)] },
    { k:'d6', p:'d5', cost:3, icon:'😤', name:'Posting Through It', desc:'She stops pacing herself entirely and simply goes, constantly, at everything. Her swings come 8% faster — but a filly who never stops has stopped watching the room, and she takes 6% more damage.',
      es:[ST9F('chudfilly','meleeCooldown',-0.08), UF9F('chudfilly','damageTakenMult',0.06)] },

    { k:'s1', p:null, name:'Terminally Online', desc:'She knows things about this dungeon that nopony sensible would have looked up. Increases luck by 1%.',
      e:ST9F('chudfilly','luck',0.01) },
    { k:'s2', p:'s1', cost:2, icon:'🦶', x:['s3','s3c'], name:'Touch Grass', desc:'The flies stage an intervention. She goes outside, she hits something with her own hoof, and for the first time in her life it works. She can attack. Choosing this closes both other roads for good.',
      es:[FL9F('chudfilly','noAttack',false), UF9F('chudfilly','baseMeleeDamage',2.5), ST9F('chudfilly','meleeDamage',0.1)] },
    { k:'s4a', p:'s2', name:'Hooves Like Bricks', desc:'Nopony taught her form. Nopony needed to. Increases her melee damage by 15%.',
      e:ST9F('chudfilly','meleeDamage',0.15) },
    { k:'s5a', p:'s2', name:'Reach Advantage', desc:'She has worked out that arms are for keeping things at a distance. Increases reach by 12%.',
      e:ST9F('chudfilly','rangeTiles',0.12) },
    { k:'s6a', p:'s5a', pp:['s4a'], name:'Ten Years Of Rage', desc:'All of it, arriving at once, at whatever is nearest. Hits substantially harder and her swings come 6% faster.',
      es:[UF9F('chudfilly','baseMeleeDamage',1), ST9F('chudfilly','meleeCooldown',-0.06)] },
    { k:'s3', p:'s1', cost:2, icon:'🐝', x:['s3c'], name:'Recruits Locally', desc:'The swarm has started bringing friends who are not flies and do not explain themselves. They peel off her flank and go looking. Choosing this closes both other roads for good.',
      es:[FL9F('chudfilly','summonsThralls',true), UF9F('chudfilly','changelingMinionDmg',2), UF9F('chudfilly','changelingMinionRadius',30), UF9F('chudfilly','changelingSummonCooldown',-3)] },
    { k:'s4b', p:'s3', name:'Big One In The Back', desc:'Nopony asked what it is. Her recruits hit harder.',
      e:UF9F('chudfilly','changelingMinionDmg',1) },
    { k:'s5b', p:'s3', name:'Working The Room', desc:'She has stopped keeping them close and the corridor is worse off for it. Widens the reach of her recruits.',
      e:UF9F('chudfilly','changelingMinionRadius',15) },
    { k:'s6b', p:'s5b', pp:['s4b'], name:'Always Hiring', desc:'There is no longer a gap between one leaving and the next arriving. The next recruit turns up much sooner and she moves 6% faster.',
      es:[UF9F('chudfilly','changelingSummonCooldown',-2), ST9F('chudfilly','speed',0.06)] },
    { k:'s3c', p:'s1', cost:2, icon:'🌪', name:'Cloud Becomes Weather', desc:'Enough flies in one place stops being a swarm and starts being a front. She no longer chases anything; the air around her simply is the attack. Choosing this closes both other roads for good.',
      es:[FL9F('chudfilly','innateBlizzardRing',true), UF9F('chudfilly','fireRingRadius',20), UF9F('chudfilly','baseRangedDamage',3)] },
    { k:'s4c', p:'s3c', name:'Low Pressure', desc:'The edge of it reaches things she has not looked at yet. Widens the front.',
      e:UF9F('chudfilly','fireRingRadius',15) },
    { k:'s5c', p:'s4c', name:'Hail Of Something', desc:'Whatever is in there is hard enough to knock a thing over. Increases stun chance by 5%.',
      e:ST9F('chudfilly','stunChance',0.05) },
    { k:'s6c', p:'s5c', name:'Whole Floor Advisory', desc:'There is no dry corner left on this level. Widens the front further and increases vulnerable chance by 3%.',
      es:[UF9F('chudfilly','fireRingRadius',15), ST9F('chudfilly','vulnerableChance',0.03)] },
  ] },

  chadfilly: { nodes: [
    { k:'d1', p:null, cursed:true, name:'All Gas, No Brakes', desc:'She has never once left a room by the door she came in through and the habit has cost her a rib or two. Permanently increases damage taken by 5%. Neither line below opens any other way.',
      e:UF9F('chadfilly','damageTakenMult',0.05) },
    { k:'d2a', p:'d1', name:'Blast Stance', desc:'She has been thrown by enough of her own bombs to have opinions about landing. Increases dodge chance by 3%.',
      e:ST9F('chadfilly','dodgeChance',0.03) },
    { k:'d3a', p:'d2a', name:'Soot-Proof', desc:'The coat has stopped catching and started shrugging. Reduces damage taken by 4%.',
      e:UF9F('chadfilly','damageTakenMult',-0.04) },
    { k:'d4a', p:'d3a', name:'Scavenges The Crater', desc:'There is always something edible in the hole afterwards. Gives kills a 7% chance to mend her.',
      e:ST9F('chadfilly','onKillHealChance',0.07) },
    { k:'d2b', p:'d1', name:'Ears Still Ringing', desc:'Everything else in the corridor got the same treatment and took it worse. Increases vulnerable chance by 7%.',
      e:ST9F('chadfilly','vulnerableChance',0.07) },
    { k:'d3b', p:'d2b', name:'Counts To One', desc:'She has started deciding where the bomb goes instead of merely where she is. Increases critical chance by 7%.',
      e:ST9F('chadfilly','critChance',0.07) },
    { k:'d4b', p:'d3b', name:'Loots The Rubble', desc:'She is the only pony down here who profits from demolition. Increases pickup magnet radius by 8%.',
      e:ST9F('chadfilly','magnetRadius',0.08) },
    { k:'d5', p:'d4a', pp:['d4b'], cost:2, icon:'💣', name:'Controlled Demolition', desc:'For one glorious floor she knows what the bomb is going to do before she drops it. Increases stun chance by 5% and vulnerable chance by 6%.',
      es:[ST9F('chadfilly','stunChance',0.05), ST9F('chadfilly','vulnerableChance',0.06)] },
    { k:'d6', p:'d5', cost:3, icon:'🔥', name:'Runs At It', desc:'She has decided the fastest way out of a blast radius is through the next one, so she has stopped waiting to see how the last one landed. Her swings come 9% faster — but a filly who never checks the blast radius is a filly standing in it, and she takes 6% more damage.',
      es:[ST9F('chadfilly','meleeCooldown',-0.09), UF9F('chadfilly','damageTakenMult',0.06)] },

    { k:'s1', p:null, name:'Reads The Room', desc:'Badly, and then bombs it anyway, but she does read it. Increases luck by 5%.',
      e:ST9F('chadfilly','luck',0.05) },
    { k:'s2', p:'s1', cost:2, icon:'🦶', x:['s3','s3c'], name:'Swings First, Asks Never', desc:'It occurs to her, four floors in, that she has hooves. She tries one out on a skeleton. The skeleton does not survive the experiment and neither does her entire prior worldview. She can attack. Choosing this closes both other roads for good.',
      es:[FL9F('chadfilly','noAttack',false), UF9F('chadfilly','baseMeleeDamage',3), ST9F('chadfilly','meleeDamage',0.1)] },
    { k:'s4a', p:'s2', name:'Follow Through', desc:'She commits to it the way she commits to everything, which is entirely. Increases her melee damage by 15%.',
      e:ST9F('chadfilly','meleeDamage',0.15) },
    { k:'s5a', p:'s2', name:'Wider Swing', desc:'No technique, enormous arc, several things hit at once. Increases reach by 12%.',
      e:ST9F('chadfilly','rangeTiles',0.12) },
    { k:'s6a', p:'s5a', pp:['s4a'], name:'Bombs Were A Phase', desc:'The satchel is still full and she has stopped opening it. Hits substantially harder and her swings come 6% faster.',
      es:[UF9F('chadfilly','baseMeleeDamage',1.5), ST9F('chadfilly','meleeCooldown',-0.06)] },
    { k:'s3', p:'s1', cost:2, icon:'🧨', x:['s3c'], name:'Bomb Buddies', desc:'She has started handing them out. Whatever takes one wanders off down the corridor holding it, delighted, and does not come back. Choosing this closes both other roads for good.',
      es:[FL9F('chadfilly','summonsThralls',true), UF9F('chadfilly','changelingMinionDmg',2), UF9F('chadfilly','changelingMinionRadius',30), UF9F('chadfilly','changelingSummonCooldown',-3)] },
    { k:'s4b', p:'s3', name:'Gave It The Big One', desc:'She does not ration and she never has. Her buddies hit harder.',
      e:UF9F('chadfilly','changelingMinionDmg',1) },
    { k:'s5b', p:'s3', name:'Sent Them Ahead', desc:'They have stopped waiting for her and started scouting. Widens the reach of her buddies.',
      e:UF9F('chadfilly','changelingMinionRadius',15) },
    { k:'s6b', p:'s5b', pp:['s4b'], name:'Bottomless Satchel', desc:'There was never a bottom and now everything knows it. The next buddy is armed much sooner and fear chance rises 5%.',
      es:[UF9F('chadfilly','changelingSummonCooldown',-2), ST9F('chadfilly','fearChance',0.05)] },
    { k:'s3c', p:'s1', cost:2, icon:'⚙', name:'Auto-Sapper', desc:'Carrying the bomb to the thing is, she realises, a step too many. She bolts the bomb to a tripod, points it down the hall, and walks away. Choosing this closes both other roads for good.',
      es:[FL9F('chadfilly','canBuildTurrets',true), UF9F('chadfilly','baseRangedDamage',3), UF9F('chadfilly','turretDamageMult',0.2)] },
    { k:'s4c', p:'s3c', name:'Ammunition Problem', desc:'The problem is that there is too much of it, which is not a problem. Her sappers hit harder.',
      e:UF9F('chadfilly','turretDamageMult',0.15) },
    { k:'s5c', p:'s4c', name:'Cracked Casing', desc:'One of them vents something that was supposed to stay inside. Increases freeze chance by 10%.',
      e:ST9F('chadfilly','freezeChance',0.1) },
    { k:'s6c', p:'s5c', name:'Nopony Walks This Hall', desc:'She has furnished the corridor and the furniture is loaded. Her sappers hit harder still and charm chance rises 5%.',
      es:[UF9F('chadfilly','turretDamageMult',0.15), ST9F('chadfilly','charmChance',0.05)] },
  ] },

  snowpitymare: { nodes: [
    { k:'d1', p:null, cursed:true, name:'Thin Coat', desc:'Whatever she is made of was never meant to be this far underground, and the cold she carries does not warm her. Permanently increases damage taken by 5%. Neither line below opens any other way.',
      e:UF9F('snowpitymare','damageTakenMult',0.05) },
    { k:'d2a', p:'d1', name:'Softly Between', desc:'She moves the way weather moves through a doorway. Increases dodge chance by 6%.',
      e:ST9F('snowpitymare','dodgeChance',0.06) },
    { k:'d3a', p:'d2a', name:'Banked Snow', desc:'The drift she trails has got deep enough to take a hit for her. Reduces damage taken by 4%.',
      e:UF9F('snowpitymare','damageTakenMult',-0.04) },
    { k:'d4a', p:'d3a', name:'Warmth Returned', desc:'Every ending down here gives a little of itself back to the circle. Gives kills a 7% chance to mend her.',
      e:ST9F('snowpitymare','onKillHealChance',0.07) },
    { k:'d2b', p:'d1', name:'Breath You Can See', desc:'She has stopped hiding what she is and the corridor has noticed. Increases freeze chance by 8%.',
      e:ST9F('snowpitymare','freezeChance',0.08) },
    { k:'d3b', p:'d2b', name:'Pity, Sharpened', desc:'She is sorry about it and her wisps find the seam regardless. Increases critical chance by 7%.',
      e:ST9F('snowpitymare','critChance',0.07) },
    { k:'d4b', p:'d3b', name:'Drifts Toward Her', desc:'Loose things in a cold room end up downwind, and she is downwind. Increases pickup magnet radius by 10%.',
      e:ST9F('snowpitymare','magnetRadius',0.1) },
    { k:'d5', p:'d4a', pp:['d4b'], cost:2, icon:'❄️', name:'Settled Winter', desc:'The kindness and the cold stop being two separate things she is doing. Increases freeze chance by 6% and dodge chance by 1%.',
      es:[ST9F('snowpitymare','freezeChance',0.06), ST9F('snowpitymare','dodgeChance',0.01)] },
    { k:'d6', p:'d5', cost:3, icon:'🌬', name:'Whiteout', desc:'She stops holding the season in and simply lets it move. Her shots come 10% faster — but a mare who is mostly weather is a mare with very little left in the way, and she takes 6% more damage.',
      es:[ST9F('snowpitymare','fireCooldown',-0.1), UF9F('snowpitymare','damageTakenMult',0.06)] },

    { k:'s1', p:null, name:'Quiet Vigil', desc:'She has been watching this dungeon a great deal longer than it has been watching her. Increases luck by 3%.',
      e:ST9F('snowpitymare','luck',0.03) },
    { k:'s2', p:'s1', cost:2, icon:'🦶', x:['s3','s3c'], name:'Raises A Hoof', desc:'A wisp goes out in front of her and does not come back, and something very old and very tired decides it has been gentle for long enough. She looses a shard herself, for the first time. She can attack. Choosing this closes both other roads for good.',
      es:[FL9F('snowpitymare','noAttack',false), UF9F('snowpitymare','baseRangedDamage',3.5), ST9F('snowpitymare','rangedDamage',0.1)] },
    { k:'s4a', p:'s2', name:'Learns The Lead', desc:'Five hundred years of watching wisps do it and she had never once tried. Increases bolt speed by 12%.',
      e:ST9F('snowpitymare','boltSpeed',0.12) },
    { k:'s5a', p:'s2', name:'Farther Than She Meant', desc:'She apologises to the far wall. Increases range by 12%.',
      e:ST9F('snowpitymare','rangeTiles',0.12) },
    { k:'s6a', p:'s5a', pp:['s4a'], name:'No Longer Sorry', desc:'The apology has stopped arriving before the shard does. Hits substantially harder and her shots come 6% faster.',
      es:[UF9F('snowpitymare','baseRangedDamage',1.5), ST9F('snowpitymare','fireCooldown',-0.06)] },
    { k:'s3', p:'s1', cost:2, icon:'🌨', x:['s3c'], name:'The Circle Closes', desc:'The wisps stop orbiting and start touching. What was five points of light becomes one standing ring of winter that turns around her wherever she walks. Choosing this closes both other roads for good.',
      es:[FL9F('snowpitymare','innateBlizzardRing',true), UF9F('snowpitymare','fireRingRadius',20), UF9F('snowpitymare','baseRangedDamage',3)] },
    { k:'s4b', p:'s3', name:'Wider Hush', desc:'The quiet part of the ring reaches the doorway now. Widens the circle.',
      e:UF9F('snowpitymare','fireRingRadius',15) },
    { k:'s5b', p:'s4b', name:'Cold That Stays', desc:'Whatever walks through it keeps walking a little slower for a while. Increases stun chance by 5%.',
      e:ST9F('snowpitymare','stunChance',0.05) },
    { k:'s6b', p:'s5b', name:'Season Of Her Own', desc:'The room has stopped having a warm edge. Widens the circle further and increases vulnerable chance by 8%.',
      es:[UF9F('snowpitymare','fireRingRadius',15), ST9F('snowpitymare','vulnerableChance',0.08)] },
    { k:'s3c', p:'s1', cost:2, icon:'🕯', name:'Wisps That Stay Put', desc:'She asks one to wait in the corridor behind her, and it does, because they always do. It is still there three rooms later, still watching, still biting. Choosing this closes both other roads for good.',
      es:[FL9F('snowpitymare','canPlantMarkers',true), UF9F('snowpitymare','baseRangedDamage',2.5), UF9F('snowpitymare','turretDamageMult',0.2)] },
    { k:'s4c', p:'s3c', name:'Told It Kindly', desc:'It was going to stay anyway and she asked nicely regardless. Increases charm chance by 5%.',
      e:ST9F('snowpitymare','charmChance',0.05) },
    { k:'s5c', p:'s4c', name:'Older Than The Wall', desc:'The one she left on floor one has been thinking. Her standing wisps bite harder.',
      e:UF9F('snowpitymare','turretDamageMult',0.15) },
    { k:'s6c', p:'s5c', name:'Nopony Walks Alone', desc:'There is one in every room she has been through and none of them has been asked to leave. Her standing wisps bite harder still and fear chance rises 5%.',
      es:[UF9F('snowpitymare','turretDamageMult',0.15), ST9F('snowpitymare','fearChance',0.05)] },
  ] },
};

const SKILL_TREE_CHARACTER_NODES_9F = [];
(function buildCharacterSkillNodes9F(){
  for (const classId in SKILL_TREE_CHARACTER_CONFIG_9F) {
    const full = key => 'char_' + classId + '_' + key;
    for (const entry of SKILL_TREE_CHARACTER_CONFIG_9F[classId].nodes) {
      const node = {
        id: full(entry.k),
        parent: entry.p == null ? ('char_hub_' + classId) : full(entry.p),
        cost: entry.cost || 1,
        name: entry.name,
        desc: entry.desc,
      };
      if (entry.pp) node.parents = entry.pp.map(full);
      if (entry.x && entry.x.length) node.excludes = entry.x.map(full);
      if (entry.icon) node.icon = entry.icon;
      if (entry.es) node.effects = entry.es;
      else node.effect = entry.e || null;
      if (entry.cursed) node.cursed = true;
      SKILL_TREE_CHARACTER_NODES_9F.push(node);
    }
  }
})();

for (const n of SKILL_TREE_CHARACTER_NODES_9F) {
  SKILL_TREE_NODES.push(n);
  SKILL_TREE_NODES_BY_ID[n.id] = n;
}
