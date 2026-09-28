'use strict';

addTierSet({ baseId:'mastery_meleekills', name:'Hoof to Hoof', icon:'🗡️',
  category:'Mastery', statKey:'meleeKills',
  desc: n => 'Reach ' + n + ' enemies defeated with melee attacks.',
  tiers:[
    { threshold:150, itemId:'masterytrophy_meleekills_t1' },
    { threshold:600, itemId:'masterytrophy_meleekills_t2' },
    { threshold:1500, itemId:'hardhitter' },
  ] });
addTierSet({ baseId:'mastery_rangedkills', name:'Long Shot', icon:'🏹',
  category:'Mastery', statKey:'rangedKills',
  desc: n => 'Reach ' + n + ' enemies defeated with ranged attacks.',
  tiers:[
    { threshold:150, itemId:'masterytrophy_rangedkills_t1' },
    { threshold:600, itemId:'masterytrophy_rangedkills_t2' },
    { threshold:1500, itemId:'quickdraw' },
  ] });
addTierSet({ baseId:'mastery_critslanded', name:'Precision', icon:'✴️',
  category:'Mastery', statKey:'critsLanded',
  desc: n => 'Reach ' + n + ' critical hits landed.',
  tiers:[
    { threshold:75, itemId:'masterytrophy_critslanded_t1' },
    { threshold:400, itemId:'masterytrophy_critslanded_t2' },
    { threshold:1200, trinketId:'silvermirror' },
  ] });
addTierSet({ baseId:'mastery_bombsplaced', name:'Demolition Habit', icon:'💣',
  category:'Mastery', statKey:'bombsPlaced',
  desc: n => 'Reach ' + n + ' bombs placed.',
  tiers:[
    { threshold:75, itemId:'masterytrophy_bombsplaced_t1' },
    { threshold:300, itemId:'masterytrophy_bombsplaced_t2' },
    { threshold:900, itemId:'bombsatchel' },
  ] });
addTierSet({ baseId:'mastery_shotsfired', name:'Trigger Discipline', icon:'🔫',
  category:'Mastery', statKey:'shotsFired',
  desc: n => 'Reach ' + n + ' shots fired.',
  tiers:[
    { threshold:750, itemId:'masterytrophy_shotsfired_t1' },
    { threshold:3000, itemId:'masterytrophy_shotsfired_t2' },
    { threshold:10000, trinketId:'stormprism' },
  ] });
addTierSet({ baseId:'mastery_obstaclesdestroyed', name:'Wrecking Crew', icon:'🪨',
  category:'Mastery', statKey:'obstaclesDestroyed',
  desc: n => 'Reach ' + n + ' obstacles destroyed.',
  tiers:[
    { threshold:100, itemId:'masterytrophy_obstaclesdestroyed_t1' },
    { threshold:400, itemId:'masterytrophy_obstaclesdestroyed_t2' },
    { threshold:1200, itemId:'bouldershoulder' },
  ] });
addTierSet({ baseId:'mastery_enemiesfrozen', name:'Deep Freeze', icon:'❄️',
  category:'Mastery', statKey:'enemiesFrozen',
  desc: n => 'Reach ' + n + ' enemies frozen.',
  tiers:[
    { threshold:25, itemId:'masterytrophy_enemiesfrozen_t1' },
    { threshold:100, itemId:'masterytrophy_enemiesfrozen_t2' },
    { threshold:300, itemId:'frostbite' },
  ] });
addTierSet({ baseId:'mastery_turretsdestroyed', name:'Sentry Breaker', icon:'🛠️',
  category:'Mastery', statKey:'turretsDestroyed',
  desc: n => 'Reach ' + n + ' turrets destroyed.',
  tiers:[
    { threshold:15, itemId:'masterytrophy_turretsdestroyed_t1' },
    { threshold:75, itemId:'masterytrophy_turretsdestroyed_t2' },
    { threshold:250, trinketId:'fadedgauntlet' },
  ] });
addTierSet({ baseId:'mastery_bombbarrels', name:'Chain Reaction', icon:'🛢️',
  category:'Mastery', statKey:'bombBarrelsDetonated',
  desc: n => 'Reach ' + n + ' bomb barrels detonated.',
  tiers:[
    { threshold:15, itemId:'masterytrophy_bombbarrels_t1' },
    { threshold:75, itemId:'masterytrophy_bombbarrels_t2' },
    { threshold:250, trinketId:'emberbauble' },
  ] });
addTierSet({ baseId:'mastery_swarmerdnb', name:'Swarm Control', icon:'🐝',
  category:'Mastery', statKey:'swarmerdnbKilled',
  desc: n => 'Reach ' + n + ' Swarmer DNBs defeated.',
  tiers:[
    { threshold:40, itemId:'masterytrophy_swarmerdnb_t1' },
    { threshold:200, itemId:'masterytrophy_swarmerdnb_t2' },
    { threshold:700, trinketId:'wildcrown' },
  ] });
addTierSet({ baseId:'mastery_activeitemuses', name:'Button Masher', icon:'🔋',
  category:'Mastery', statKey:'activeItemUses',
  desc: n => 'Reach ' + n + ' active item uses.',
  tiers:[
    { threshold:75, itemId:'masterytrophy_activeitemuses_t1' },
    { threshold:300, itemId:'masterytrophy_activeitemuses_t2' },
    { threshold:900, itemId:'chronoshard' },
  ] });
addTierSet({ baseId:'mastery_itemscollected', name:'Packrat', icon:'🎒',
  category:'Mastery', statKey:'itemsCollected',
  desc: n => 'Reach ' + n + ' items collected.',
  tiers:[
    { threshold:40, itemId:'masterytrophy_itemscollected_t1' },
    { threshold:150, itemId:'masterytrophy_itemscollected_t2' },
    { threshold:450, itemId:'junkyardmagnet' },
  ] });
addTierSet({ baseId:'mastery_trinketsequipped', name:'Charm Collector', icon:'🔩',
  category:'Mastery', statKey:'trinketsEquipped',
  desc: n => 'Reach ' + n + ' trinkets equipped.',
  tiers:[
    { threshold:8, itemId:'masterytrophy_trinketsequipped_t1' },
    { threshold:30, itemId:'masterytrophy_trinketsequipped_t2' },
    { threshold:90, trinketId:'crackedlocket' },
  ] });
addTierSet({ baseId:'mastery_familiarscollected', name:'Menagerie', icon:'🐾',
  category:'Mastery', statKey:'familiarsCollected',
  desc: n => 'Reach ' + n + ' familiars collected.',
  tiers:[
    { threshold:8, itemId:'masterytrophy_familiarscollected_t1' },
    { threshold:25, itemId:'masterytrophy_familiarscollected_t2' },
    { threshold:70, familiarId:'goldenhare' },
  ] });
addTierSet({ baseId:'mastery_roomscleared', name:'Room Sweeper', icon:'🚪',
  category:'Mastery', statKey:'roomsCleared',
  desc: n => 'Reach ' + n + ' rooms cleared.',
  tiers:[
    { threshold:150, itemId:'masterytrophy_roomscleared_t1' },
    { threshold:500, itemId:'masterytrophy_roomscleared_t2' },
    { threshold:1500, itemId:'swiftstep' },
  ] });

addAchievement({ id:'exploration_destroy_rock', name:'Rock Breaker', icon:'💥',
  desc:'Destroy 15 Rocks.', category:'Exploration', itemId:'explorationtrophy_rock',
  bestiarySection:'objectsDestroyed', bestiaryId:'rock', threshold:15 });
addAchievement({ id:'exploration_destroy_tallrock', name:'Tall Order', icon:'💥',
  desc:'Destroy 15 Tall Rocks.', category:'Exploration', itemId:'explorationtrophy_tallrock',
  bestiarySection:'objectsDestroyed', bestiaryId:'tallrock', threshold:15 });
addAchievement({ id:'exploration_destroy_yellowfire', name:'Flame Douser', icon:'💥',
  desc:'Douse 15 Yellow Fires.', category:'Exploration', itemId:'explorationtrophy_yellowfire',
  bestiarySection:'objectsDestroyed', bestiaryId:'yellowfire', threshold:15 });
addAchievement({ id:'exploration_destroy_redfire', name:'Ember Douser', icon:'💥',
  desc:'Douse 15 Red Fires.', category:'Exploration', itemId:'explorationtrophy_redfire',
  bestiarySection:'objectsDestroyed', bestiaryId:'redfire', threshold:15 });
addAchievement({ id:'exploration_destroy_spikedrock', name:'Spike Splitter', icon:'💥',
  desc:'Destroy 15 Spiked Rocks.', category:'Exploration', itemId:'explorationtrophy_spikedrock',
  bestiarySection:'objectsDestroyed', bestiaryId:'spikedrock', threshold:15 });
addAchievement({ id:'exploration_destroy_tintedrock', name:'Tint Hunter', icon:'💥',
  desc:'Destroy 15 Tinted Rocks.', category:'Exploration', itemId:'explorationtrophy_tintedrock',
  bestiarySection:'objectsDestroyed', bestiaryId:'tintedrock', threshold:15 });
addAchievement({ id:'exploration_destroy_turretn', name:'North Turret Buster', icon:'💥',
  desc:'Destroy 15 North Turrets.', category:'Exploration', itemId:'explorationtrophy_turretn',
  bestiarySection:'objectsDestroyed', bestiaryId:'turretn', threshold:15 });
addAchievement({ id:'exploration_destroy_turrete', name:'East Turret Buster', icon:'💥',
  desc:'Destroy 15 East Turrets.', category:'Exploration', itemId:'explorationtrophy_turrete',
  bestiarySection:'objectsDestroyed', bestiaryId:'turrete', threshold:15 });
addAchievement({ id:'exploration_destroy_turrets', name:'South Turret Buster', icon:'💥',
  desc:'Destroy 15 South Turrets.', category:'Exploration', itemId:'explorationtrophy_turrets',
  bestiarySection:'objectsDestroyed', bestiaryId:'turrets', threshold:15 });
addAchievement({ id:'exploration_destroy_turretw', name:'West Turret Buster', icon:'💥',
  desc:'Destroy 15 West Turrets.', category:'Exploration', itemId:'explorationtrophy_turretw',
  bestiarySection:'objectsDestroyed', bestiaryId:'turretw', threshold:15 });
addAchievement({ id:'exploration_destroy_turretplus', name:'Plus Turret Buster', icon:'💥',
  desc:'Destroy 15 Plus Turrets.', category:'Exploration', itemId:'explorationtrophy_turretplus',
  bestiarySection:'objectsDestroyed', bestiaryId:'turretplus', threshold:15 });
addAchievement({ id:'exploration_destroy_turretx', name:'X Turret Buster', icon:'💥',
  desc:'Destroy 15 X Turrets.', category:'Exploration', itemId:'explorationtrophy_turretx',
  bestiarySection:'objectsDestroyed', bestiaryId:'turretx', threshold:15 });
addAchievement({ id:'exploration_destroy_turrettarget', name:'Targeting Turret Buster', icon:'💥',
  desc:'Destroy 15 Targeting Turrets.', category:'Exploration', itemId:'explorationtrophy_turrettarget',
  bestiarySection:'objectsDestroyed', bestiaryId:'turrettarget', threshold:15 });
addAchievement({ id:'exploration_destroy_bombbarrel', name:'Barrel Blaster', icon:'💥',
  desc:'Destroy 15 Bomb Barrels.', category:'Exploration', itemId:'explorationtrophy_bombbarrel',
  bestiarySection:'objectsDestroyed', bestiaryId:'bombbarrel', threshold:15 });
addAchievement({ id:'exploration_destroy_pushablebombbarrel', name:'Push and Boom', icon:'💥',
  desc:'Destroy 15 Pushable Bomb Barrels.', category:'Exploration', itemId:'explorationtrophy_pushablebombbarrel',
  bestiarySection:'objectsDestroyed', bestiaryId:'pushablebombbarrel', threshold:15 });

addTierSet({ baseId:'exploration_objectsseen', name:'Cartographer', icon:'🗺️',
  category:'Exploration', bestiarySection:'objectsSeen', distinct:true,
  desc: n => 'Encounter ' + n + ' different kinds of obstacle.',
  tiers:[
    { threshold:8, familiarId:'mapmite' },
    { threshold:16, familiarId:'atlasbeetle' },
    { threshold:24, itemId:'starlitcompass' },
  ] });
addTierSet({ baseId:'exploration_fieldguide', name:'Field Guide', icon:'📖',
  category:'Exploration', bestiarySection:'enemyKills', distinct:true,
  desc: n => 'Defeat ' + n + ' different kinds of foe at least once.',
  tiers:[
    { threshold:80, familiarId:'guidefinch' },
    { threshold:180, familiarId:'tallyowl' },
    { threshold:265, itemId:'allseeingeye' },
  ] });
addTierSet({ baseId:'exploration_causeofdeath', name:'Cause of Death', icon:'☠️',
  category:'Exploration', bestiarySection:'enemyDeaths', distinct:true,
  desc: n => 'Be defeated by ' + n + ' different kinds of foe.',
  tiers:[
    { threshold:10, familiarId:'mournmoth' },
    { threshold:30, familiarId:'revenantsprite' },
    { threshold:60, itemId:'secondwind' },
  ] });

addTierSet({ baseId:'exploration_petshops', name:'Pet Shop Regular', icon:'🐾',
  category:'Exploration', statKey:'petshopsVisited',
  desc: n => 'Visit ' + n + ' Pet Shops.',
  tiers:[
    { threshold:5, familiarId:'kennelpup' },
    { threshold:30, familiarId:'adoptedwhelp' },
    { threshold:100, familiarId:'goldenfirefly' },
  ] });
addTierSet({ baseId:'exploration_curserooms', name:'Curse Seeker', icon:'😈',
  category:'Exploration', statKey:'curseRoomsVisited',
  desc: n => 'Visit ' + n + ' Cursed Rooms.',
  tiers:[
    { threshold:5, familiarId:'hexmite' },
    { threshold:30, familiarId:'cursedimp' },
    { threshold:100, itemId:'cursedhalo' },
  ] });
addTierSet({ baseId:'exploration_crystalrooms', name:'Crystal Pilgrim', icon:'💎',
  category:'Exploration', statKey:'crystalRoomsVisited',
  desc: n => 'Visit ' + n + ' Crystal Rooms.',
  tiers:[
    { threshold:5, familiarId:'geodemote' },
    { threshold:25, familiarId:'crystalwarden' },
    { threshold:75, itemId:'prismveil' },
  ] });

addTierSet({ baseId:'exploration_starrooms', name:'Star Pilgrim', icon:'🌟',
  category:'Exploration', statKey:'starRoomsVisited',
  desc: n => 'Visit ' + n + ' Star Rooms.',
  tiers:[
    { threshold:5, pillColorId:'iridescent' },
    { threshold:25, trinketId:'lightlattice' },
    { threshold:75, shopDiscount:'star' },
  ] });

addTierSet({ baseId:'misc_rerollaltar', name:'Altar of Second Chances', icon:'🔄',
  category:'Miscellaneous', statKey:'rerollAltarUses',
  desc: n => 'Use a shop Reroll Altar ' + n + ' times.',
  tiers:[
    { threshold:10, trinketId:'airylocket' },
    { threshold:40, itemId:'hallowedsignet' },
    { threshold:120, familiarId:'hearthcell' },
  ] });

addTierSet({ baseId:'exploration_playtime', name:'Long Haul', icon:'⏳',
  category:'Exploration', statKey:'totalPlaytime',
  desc: n => 'Play for ' + (n / 3600) + (n === 3600 ? ' hour' : ' hours') + ' in total.',
  tiers:[
    { threshold:3600, familiarId:'hourglassjar' },
    { threshold:18000, familiarId:'vigilbloom' },
    { threshold:72000, itemId:'brokenwatch' },
  ] });
addTierSet({ baseId:'exploration_runsstarted', name:'Again and Again', icon:'🔁',
  category:'Exploration', statKey:'runsStarted',
  desc: n => 'Start ' + n + ' runs.',
  tiers:[
    { threshold:25, familiarId:'startersatchel' },
    { threshold:100, familiarId:'loopwhirl' },
    { threshold:300, itemId:'ironwill' },
  ] });

addTierSet({ baseId:'collection_items', name:'Compendium', icon:'📚',
  category:'Collection', bestiarySection:'seenItems', distinct:true,
  desc: n => 'Discover ' + n + ' different items.',
  tiers:[
    { threshold:25, familiarId:'curiomite' },
    { threshold:75, familiarId:'tomefinch' },
    { threshold:150, familiarId:'codexbeetle' },
    { threshold:250, familiarId:'archiveowl' },
    { threshold:340, itemId:'polishedscroll' },
  ] });

addTierSet({ baseId:'collection_trinkets', name:'Trinket Archivist', icon:'🔩',
  category:'Collection', bestiarySection:'seenTrinkets', distinct:true,
  desc: n => 'Equip ' + n + ' different trinkets.',
  tiers:[
    { threshold:15, familiarId:'charmmite' },
    { threshold:45, familiarId:'keepsakejar' },
    { threshold:90, familiarId:'relicwarden' },
    { threshold:150, itemId:'gildedtrinket' },
  ] });

addTierSet({ baseId:'collection_familiars', name:'Beast Befriender', icon:'🐾',
  category:'Collection', bestiarySection:'seenFamiliars', distinct:true,
  desc: n => 'Collect ' + n + ' different familiars.',
  tiers:[
    { threshold:12, familiarId:'pactmite' },
    { threshold:35, familiarId:'packleveret' },
    { threshold:70, familiarId:'sacredhare' },
  ] });

addAchievement({ id:'collection_stars', name:'Constellation', icon:'⭐',
  desc:'Discover 12 different stars.', category:'Collection',
  bestiarySection:'seenStars', distinctThreshold:12, itemId:'moonshard' });

addAchievement({ id:'collection_pills', name:'Full Spectrum', icon:'💊',
  desc:'Sample all 60 pill colors.', category:'Collection',
  bestiarySection:'seenPills', distinctThreshold:60, itemId:'crystalflask' });

addAchievement({ id:'challenge_wins_8classes', name:'Eightfold Champion', icon:'🏆',
  desc:'Win a run with 8 different characters.', category:'Challenge',
  itemId:'gildedhoof' });
addAchievement({ id:'challenge_wins_allclasses', name:'Every Last Pony', icon:'👑',
  desc:'Win a run with all 20 characters.', category:'Challenge',
  trinketId:'coralcrown' });

addAchievement({ id:'challenge_floors_nodamage_4', name:'Spotless Descent', icon:'🛡️',
  desc:'Clear 4 floors in a row without taking any damage.', category:'Challenge',
  itemId:'guardianhalo' });
addAchievement({ id:'challenge_floors_nodamage_6', name:'Immaculate Descent', icon:'🕊️',
  desc:'Clear 6 floors in a row without taking any damage.', category:'Challenge',
  itemId:'seraphshield' });

addAchievement({ id:'challenge_bossstreak_2', name:'Twice Untouched', icon:'✨',
  desc:'Defeat 2 superbosses in a row without being hit in their boss rooms.', category:'Challenge',
  familiarId:'ironshrew' });
addAchievement({ id:'challenge_bossstreak_4', name:'Four Times Untouched', icon:'💫',
  desc:'Defeat 4 superbosses in a row without being hit in their boss rooms.', category:'Challenge',
  itemId:'wingedgrace' });
addAchievement({ id:'challenge_bossstreak_7', name:'Not a Single Scratch', icon:'🌠',
  desc:"Defeat 7 superbosses in a row without being hit in their boss rooms — every superboss of a full run, untouched.", category:'Challenge',
  trinketId:'radiantring' });

addAchievement({ id:'challenge_onehearted_flawless', name:'Glass Heart', icon:'💔',
  desc:'Win a run with only one red heart of maximum health, without ever taking damage.', category:'Challenge',
  trinketId:'crackedseal' });
addAchievement({ id:'challenge_flawless_run', name:'Flawless Legend', icon:'🌟',
  desc:'Defeat The One True DNB on Floor 13 without taking a single point of damage the whole run.', category:'Challenge',
  trinketId:'ancienthoofguard' });

addAchievement({ id:'challenge_speedrun_20min', name:'Brisk Escape', icon:'⏱️',
  desc:'Win a run in under 20 minutes.', category:'Challenge',
  itemId:'quickstepcharm' });
addAchievement({ id:'challenge_speedrun_12min', name:'Record Pace', icon:'⏲️',
  desc:'Win a run in under 12 minutes.', category:'Challenge',
  itemId:'swiftrecovery' });
addAchievement({ id:'challenge_speedrun_8min', name:'Blur', icon:'⚡',
  desc:'Win a run in under 8 minutes.', category:'Challenge',
  itemId:'speedup' });

addAchievement({ id:'star_arcturus', name:'Sweeper', icon:'🔶',
  desc:'Clear 50 rooms.', category:'Stars', starId:'arcturus', statKey:'roomsCleared', threshold:50 });
addAchievement({ id:'star_deneb', name:'Second Opinion', icon:'🔄',
  desc:'Collect 25 items.', category:'Stars', starId:'deneb', statKey:'itemsCollected', threshold:25 });
addAchievement({ id:'star_aldebaran', name:'Learn the Hard Way', icon:'🛡️',
  desc:'Die 5 times.', category:'Stars', starId:'aldebaran', statKey:'deaths', threshold:5 });
addAchievement({ id:'star_mizar', name:'Self-Medicated', icon:'💗',
  desc:'Swallow 50 pills.', category:'Stars', starId:'mizar', statKey:'pillsUsed', threshold:50 });
addAchievement({ id:'star_antlia', name:'Key Master', icon:'🧰',
  desc:'Spend 60 keys.', category:'Stars', starId:'antlia', statKey:'keysUsed', threshold:60 });
addAchievement({ id:'star_altair', name:'Hazard Pay', icon:'♻️',
  desc:'Destroy 250 obstacles.', category:'Stars', starId:'altair', statKey:'obstaclesDestroyed', threshold:250 });
addAchievement({ id:'star_capella', name:'Shuffle the Deck', icon:'🎲',
  desc:'Defeat 250 enemies.', category:'Stars', starId:'capella', statKey:'enemiesKilled', threshold:250 });
addAchievement({ id:'star_saiph', name:'Concussive Force', icon:'💥',
  desc:'Place 250 bombs.', category:'Stars', starId:'saiph', statKey:'bombsPlaced', threshold:250 });
addAchievement({ id:'star_alnitak', name:'Every Corner', icon:'🗺️',
  desc:'Discover 25 secret rooms.', category:'Stars', starId:'alnitak', statKey:'secretRoomsFound', threshold:25 });
addAchievement({ id:'star_procyon', name:'Star Gazer', icon:'❤️',
  desc:'Use 25 stars.', category:'Stars', starId:'procyon', statKey:'starsUsed', threshold:25 });
addAchievement({ id:'star_regulus', name:'Gilded Habit', icon:'🎁',
  desc:'Open 25 gold chests.', category:'Stars', starId:'regulus', statKey:'goldChestsOpened', threshold:25 });
addAchievement({ id:'star_spica', name:'Regular Customer', icon:'🍀',
  desc:'Buy 60 things from shops.', category:'Stars', starId:'spica', statKey:'shopPurchases', threshold:60 });
