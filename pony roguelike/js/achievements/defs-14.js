'use strict';

addTierSet({
  baseId:'milestone_enemieskilled', name:'Endless Hunt', icon:'💀', category:'Miscellaneous',
  desc: n => 'Kill ' + n.toLocaleString() + ' enemies, lifetime.',
  statKey:'enemiesKilled',
  tiers: [
    { threshold:2500, itemId:'feraltalisman' },
    { threshold:4000, itemId:'forgottenemblem' },
  ],
});
addTierSet({
  baseId:'milestone_wins', name:'Serial Victor', icon:'🏆', category:'Miscellaneous',
  desc: n => 'Win ' + n + ' runs, lifetime.',
  statKey:'wins',
  tiers: [
    { threshold:10, itemId:'forgottenrune' },
    { threshold:20, itemId:'frostedbell' },
  ],
});
addTierSet({
  baseId:'milestone_bosseskilled', name:'Boss Rush Veteran', icon:'👹', category:'Miscellaneous',
  desc: n => 'Defeat ' + n + ' bosses, lifetime.',
  statKey:'bossesKilled',
  tiers: [
    { threshold:200, itemId:'gildedring' },
    { threshold:300, itemId:'gildedseal' },
  ],
});
addTierSet({
  baseId:'milestone_roomscleared', name:'Room by Room', icon:'🚪', category:'Miscellaneous',
  desc: n => 'Clear ' + n.toLocaleString() + ' rooms, lifetime.',
  statKey:'roomsCleared',
  tiers: [
    { threshold:2000, itemId:'goldenboots' },
    { threshold:3000, itemId:'goldengauntlet' },
  ],
});
addTierSet({
  baseId:'milestone_coinscollected', name:'Fortune Amassed', icon:'💰', category:'Miscellaneous',
  desc: n => 'Collect ' + n.toLocaleString() + ' coins, lifetime.',
  statKey:'coinsCollected',
  tiers: [
    { threshold:6000, itemId:'goldenmedallion' },
    { threshold:9000, itemId:'hollowwhistle' },
  ],
});
addTierSet({
  baseId:'milestone_shotsfired', name:'Never Miss', icon:'🎯', category:'Miscellaneous',
  desc: n => 'Fire ' + n.toLocaleString() + ' shots, lifetime.',
  statKey:'shotsFired',
  tiers: [
    { threshold:15000, trinketId:'cottoncandytuft' },
    { threshold:25000, trinketId:'crackedhoofprint' },
  ],
});
addTierSet({
  baseId:'milestone_critslanded', name:'Weak Point Found', icon:'💥', category:'Miscellaneous',
  desc: n => 'Land ' + n.toLocaleString() + ' critical hits, lifetime.',
  statKey:'critsLanded',
  tiers: [
    { threshold:1800, trinketId:'crackedlens' },
    { threshold:2500, trinketId:'crackedmanhole' },
  ],
});
addTierSet({
  baseId:'milestone_meleekills', name:'Close Quarters Legend', icon:'🗡️', category:'Miscellaneous',
  desc: n => 'Defeat ' + n.toLocaleString() + ' enemies with melee attacks, lifetime.',
  statKey:'meleeKills',
  tiers: [
    { threshold:2000, trinketId:'cracklecharm' },
    { threshold:3000, trinketId:'cratercharm' },
  ],
});
addTierSet({
  baseId:'milestone_rangedkills', name:'Distance Marksman', icon:'🏹', category:'Miscellaneous',
  desc: n => 'Defeat ' + n.toLocaleString() + ' enemies with ranged attacks, lifetime.',
  statKey:'rangedKills',
  tiers: [
    { threshold:2000, trinketId:'crimsonleech' },
    { threshold:3000, trinketId:'crosshaircluster' },
  ],
});
addTierSet({
  baseId:'milestone_chestsopened', name:'Vault Cracker', icon:'🗝️', category:'Miscellaneous',
  desc: n => 'Open ' + n + ' chests, lifetime.',
  statKey:'chestsOpened',
  tiers: [
    { threshold:450, familiarId:'gravitonpebble' },
    { threshold:600, familiarId:'hearthstar' },
  ],
});

addAchievement({ id:'milestone_deaths', name:'Getting Back Up', icon:'⚰️',
  desc:'Die 75 times, lifetime.', category:'Miscellaneous', statKey:'deaths', threshold:75, familiarId:'hungrymote' });
addAchievement({ id:'milestone_keysused', name:'Master Locksmith', icon:'🔑',
  desc:'Use 120 keys, lifetime.', category:'Miscellaneous', statKey:'keysUsed', threshold:120, familiarId:'icedrake' });
addAchievement({ id:'milestone_secretroomsfound', name:'Nothing Stays Hidden', icon:'🕵️',
  desc:'Find 80 secret rooms, lifetime.', category:'Miscellaneous', statKey:'secretRoomsFound', threshold:80, familiarId:'impactorling' });
addAchievement({ id:'milestone_itemscollected', name:'Shelves Overflowing', icon:'🎁',
  desc:'Collect 900 items, lifetime.', category:'Miscellaneous', statKey:'itemsCollected', threshold:900, familiarId:'lastlighthalo' });
addAchievement({ id:'milestone_trinketsequipped', name:'Charm Bracelet Full', icon:'📿',
  desc:'Equip 180 trinkets, lifetime.', category:'Miscellaneous', statKey:'trinketsEquipped', threshold:180, familiarId:'lodestarwisp' });

addAchievement({ id:'milestone_familiarscollected', name:'Menagerie Overflowing', icon:'🐾',
  desc:'Collect 130 familiars, lifetime.', category:'Miscellaneous', statKey:'familiarsCollected', threshold:130, familiarId:'magpiesatellite' });
addAchievement({ id:'milestone_obstaclesdestroyed', name:'Nothing Left Standing', icon:'🪨',
  desc:'Destroy 1,800 obstacles, lifetime.', category:'Miscellaneous', statKey:'obstaclesDestroyed', threshold:1800, familiarId:'mendingmoth' });
addAchievement({ id:'milestone_coinsspent', name:'Big Spender', icon:'🛍️',
  desc:'Spend 3,000 coins, lifetime.', category:'Miscellaneous', statKey:'coinsSpent', threshold:3000, familiarId:'mendingnova' });
addAchievement({ id:'milestone_rocksbombed', name:'Demolition Expert', icon:'🧨',
  desc:'Bomb 300 rocks, lifetime.', category:'Miscellaneous', statKey:'rocksBombed', threshold:300, familiarId:'meteorshower' });
addAchievement({ id:'milestone_activeitemuses', name:'Charge and Release', icon:'🔋',
  desc:'Use active items 1,300 times, lifetime.', category:'Miscellaneous', statKey:'activeItemUses', threshold:1300, familiarId:'midgecloud' });

addAchievement({ id:'veteran_shotsfired', name:'Endless Barrage', icon:'🎯',
  desc:'Fire 40,000 shots total.', category:'Miscellaneous', statKey:'shotsFired', threshold:40000, skillPoints:6 });
addAchievement({ id:'veteran_critslanded', name:'Precision Incarnate', icon:'💥',
  desc:'Land 4,000 critical hits.', category:'Miscellaneous', statKey:'critsLanded', threshold:4000, skillPoints:5 });
addAchievement({ id:'veteran_roomscleared', name:'Nothing Left Uncleared', icon:'🧹',
  desc:'Clear 5,000 rooms total.', category:'Miscellaneous', statKey:'roomsCleared', threshold:5000, skillPoints:6 });
addAchievement({ id:'veteran_enemieskilled', name:'Endless Extermination', icon:'☠️',
  desc:'Defeat 6,000 enemies total.', category:'Miscellaneous', statKey:'enemiesKilled', threshold:6000, skillPoints:6 });
addAchievement({ id:'veteran_meleekills', name:'Blade Never Rests', icon:'🗡️',
  desc:'Land 5,000 melee kills.', category:'Miscellaneous', statKey:'meleeKills', threshold:5000, skillPoints:5 });
addAchievement({ id:'veteran_rangedkills', name:'Quiver Never Empties', icon:'🏹',
  desc:'Land 5,000 ranged kills.', category:'Miscellaneous', statKey:'rangedKills', threshold:5000, skillPoints:5 });
addAchievement({ id:'veteran_bosseskilled', name:'Throne Room Regular', icon:'👑',
  desc:'Defeat 500 bosses total.', category:'Miscellaneous', statKey:'bossesKilled', threshold:500, skillPoints:6 });
addAchievement({ id:'veteran_bombsplaced', name:'Walking Arsenal', icon:'💣',
  desc:'Place 1,500 bombs total.', category:'Miscellaneous', statKey:'bombsPlaced', threshold:1500, skillPoints:5 });
addAchievement({ id:'veteran_coinscollected', name:'Coffers Overflowing', icon:'🪙',
  desc:'Collect 15,000 coins total.', category:'Miscellaneous', statKey:'coinsCollected', threshold:15000, skillPoints:5 });
addAchievement({ id:'veteran_totalplaytime', name:'A Second Home', icon:'⏳',
  desc:'Play for 30 hours in total.', category:'Miscellaneous', statKey:'totalPlaytime', threshold:108000, skillPoints:8 });
addAchievement({ id:'veteran_wins', name:'Undisputed Champion', icon:'🏆',
  desc:'Win the game 30 times.', category:'Miscellaneous', statKey:'wins', threshold:30, skillPoints:8 });
addAchievement({ id:'veteran_obstaclesdestroyed', name:'Scorched Earth', icon:'🪨',
  desc:'Destroy 3,000 obstacles total.', category:'Miscellaneous', statKey:'obstaclesDestroyed', threshold:3000, skillPoints:5 });
addAchievement({ id:'veteran_chestsopened', name:'Every Lock Broken', icon:'🗃️',
  desc:'Open 1,000 chests total.', category:'Miscellaneous', statKey:'chestsOpened', threshold:1000, skillPoints:5 });
addAchievement({ id:'veteran_turretsdestroyed', name:'Scrapyard Legacy', icon:'🛡️',
  desc:'Destroy 400 turrets.', category:'Miscellaneous', statKey:'turretsDestroyed', threshold:400, skillPoints:5 });
addAchievement({ id:'veteran_swarmerdnbkilled', name:'Hive Cleared', icon:'🐝',
  desc:'Kill 1,200 swarm enemies.', category:'Miscellaneous', statKey:'swarmerdnbKilled', threshold:1200, skillPoints:5 });
addAchievement({ id:'veteran_deaths', name:'Impossible to Discourage', icon:'⚰️',
  desc:'Die 150 times, lifetime.', category:'Miscellaneous', statKey:'deaths', threshold:150, skillPoints:3 });
addAchievement({ id:'veteran_familiarscollected', name:'Endless Menagerie', icon:'🐾',
  desc:'Collect 220 familiars, lifetime.', category:'Miscellaneous', statKey:'familiarsCollected', threshold:220, skillPoints:5 });
addAchievement({ id:'veteran_itemscollected', name:'Shelves Restocked Again', icon:'🎁',
  desc:'Collect 1,500 items, lifetime.', category:'Miscellaneous', statKey:'itemsCollected', threshold:1500, skillPoints:5 });
addAchievement({ id:'veteran_trinketsequipped', name:'Charm Bracelet Overflowing', icon:'📿',
  desc:'Equip 320 trinkets, lifetime.', category:'Miscellaneous', statKey:'trinketsEquipped', threshold:320, skillPoints:4 });
addAchievement({ id:'veteran_petshopsvisited', name:'Every Stall Known', icon:'🐷',
  desc:'Visit 220 pet shops, lifetime.', category:'Miscellaneous', statKey:'petshopsVisited', threshold:220, skillPoints:4 });
