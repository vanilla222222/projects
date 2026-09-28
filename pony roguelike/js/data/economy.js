'use strict';

const SHOP_ITEM_PRICE = 16;
const SHOP_TRINKET_PRICE = 9;
const SHOP_FAMILIAR_PRICE = 12;

const SHOP_PICKUP_PRICES = [
  { kind:'heartRed', price:3 },
  { kind:'heartBlue', price:6 },
  { kind:'bomb', price:5 },
  { kind:'key', price:5 },
  { kind:'pill', price:5 },
  { kind:'star', price:7 },
  { kind:'sack', price:8 },
  { kind:'battery', price:9 },
  { kind:'trashbag', price:10 },

  { kind:'pearl', price:9 },
  { kind:'driftnet', price:8 },
  { kind:'tideflask', price:6 },
];

const CHEST_TYPES = {

  stone:  { id:'stone', name:'Stone Chest', requires:'bomb',
            color:'#7a746a', dark:'#524d46', lidColor:'#3f3b34', itemChance:0.08 },
  gold:   { id:'gold', name:'Gold Chest', requires:'key',
            color:'#c9a13a', dark:'#8a6a1c', lidColor:'#5c4a1a', itemChance:0.10 },
  grey:   { id:'grey', name:'Chest', requires:'none',
            color:'#8a8578', dark:'#524d46', lidColor:'#403c34', itemChance:0 },
  cursed: { id:'cursed', name:'Cursed Chest', requires:'hearts', heartCost:2,
            color:'#4a2458', dark:'#28122f', lidColor:'#1a0a1f', itemChance:0.16 },

  eternal:{ id:'eternal', name:'Eternal Chest', requires:'key',
            color:'#8fd0f0', dark:'#3a6a8a', lidColor:'#23485e', itemChance:0.10 },

  wood:   { id:'wood', name:'Wooden Chest', requires:'none',
            color:'#9a6b3a', dark:'#5e3f20', lidColor:'#3f2a15', itemChance:1.0 },
};

const CHEST_TYPE_POOL = [
  { id:'grey', w:40 },
  { id:'gold', w:20 },
  { id:'stone', w:20 },
  { id:'cursed', w:10 },
  { id:'eternal', w:5 },
  { id:'wood', w:5 },
];

const CLEAR_REWARD_CHANCE = { nothing:0.10, common:0.73, rare:0.15, legendary:0.02 };

const COMMON_CATEGORY_POOL = [
  { id:'penny', w:25 },
  { id:'heart', w:25 },
  { id:'bomb', w:25 },
  { id:'key', w:25 },
];
const COMMON_PENNY_POOL = [
  { id:'penny', w:85 },
  { id:'nickel', w:7 },
  { id:'cursedpenny', w:5 },
  { id:'dime', w:2 },
  { id:'luckypenny', w:1 },
  { id:'wispcoin', w:1 },
];
function wdCoinPool(game, pool){
  if (!game || game.mode !== 'wavedefense') return pool;
  return pool.filter(t => (t.id !== 'nickel' || game.wdNickelsUnlocked) && (t.id !== 'dime' || game.wdDimesUnlocked));
}
function wdCoinDef(game, def){
  if (!def || !game || game.mode !== 'wavedefense') return def;
  if (def.id === 'nickel' && !game.wdNickelsUnlocked) return COIN_TYPES.find(c => c.id === 'penny');
  if (def.id === 'dime' && !game.wdDimesUnlocked) return COIN_TYPES.find(c => c.id === 'penny');
  return def;
}

const COMMON_HEART_POOL = [
  { id:'heartRed', w:50 },
  { id:'heartBlue', w:25 },
  { id:'halfheartRed', w:10 },
  { id:'halfheartBlue', w:10 },
  { id:'doubleheart', w:3 },
  { id:'eternalheart', w:1 },
  { id:'goldheart', w:1 },
];

const RARE_POOL = [
  { id:'pill', w:45 },
  { id:'star', w:20 },
  { id:'sack', w:20 },
  { id:'battery', w:15 },
  { id:'trashbag', w:12 },

  { id:'pearl', w:10 },
  { id:'driftnet', w:10 },
  { id:'tideflask', w:14 },
];

const LEGENDARY_POOL = [
  { id:'chest', w:50 },
  { id:'trinket', w:48 },
  { id:'familiar', w:2 },
];

const PICKUP_TYPE_LIST = [

  { id:'penny', name:'Penny', icon:'🪙', desc:'Worth 1 coin. The common drop.' },
  { id:'nickel', name:'Nickel', icon:'🥈', desc:'Worth 5 coins.' },
  { id:'dime', name:'Dime', icon:'🥇', desc:'Worth 10 coins.' },
  { id:'luckypenny', name:'Lucky Penny', icon:'🍀', desc:'Worth 1 coin and +1 Luck for the run.' },
  { id:'cursedpenny', name:'Cursed Penny', icon:'🎰', desc:'A gamble — gain coins, lose coins, or nothing at all.' },
  { id:'wispcoin', name:'Wisp Coin', icon:'❄️', desc:'Grants a wisp familiar instead of coins — any class can use it.' },

  { id:'heartRed', name:'Red Heart', icon:'❤️', desc:'Heals a full heart of red health.' },
  { id:'heartBlue', name:'Blue Heart', icon:'💙', desc:'Adds a full soul heart — spent before your red health.' },
  { id:'halfheartRed', name:'Half Red Heart', icon:'💔', desc:'Heals half a heart of red health.' },
  { id:'halfheartBlue', name:'Half Blue Heart', icon:'🩵', desc:'Adds half a soul heart.' },
  { id:'doubleheart', name:'Double Heart', icon:'💕', desc:'Heals two full red hearts at once.' },
  { id:'heartContainer', name:'Heart Container', icon:'🫀', desc:'Permanently raises your maximum health by one heart.' },
  { id:'eternalheart', name:'Eternal Heart', icon:'🤍', desc:'Survive to the end of the floor holding it and it becomes a permanent heart container.' },
  { id:'goldheart', name:'Gold Heart', icon:'💛', desc:'Heals half a heart at the end of any room you took no damage in. Lost the instant you\'re hit.' },

  { id:'bomb', name:'Bomb', icon:'💣', desc:'Grants 1 bomb.' },
  { id:'doublebomb', name:'Double Bomb', icon:'🧨', desc:'Grants 2 bombs instead of 1.' },
  { id:'goldbomb', name:'Golden Bomb', icon:'✨', desc:'Unlimited bombs for the rest of this floor.' },

  { id:'key', name:'Key', icon:'🔑', desc:'Grants 1 key.' },
  { id:'doublekey', name:'Double Key', icon:'🗝️', desc:'Grants 2 keys instead of 1.' },
  { id:'goldkey', name:'Golden Key', icon:'👑', desc:'Unlimited keys for the rest of this floor.' },

  { id:'sack', name:'Sack', icon:'🎒', desc:'Bursts open into a random handful of pickups.' },
  { id:'battery', name:'Battery', icon:'🔋', desc:'Fully recharges your active item.' },
  { id:'minibattery', name:'Micro Battery', icon:'🪫', desc:'Partially recharges your active item.' },

  { id:'trashbag', name:'Trash Bag', icon:'🗑️', desc:'Bursts open into one random friendly fly.' },

  { id:'pearl', name:'Pearl', icon:'🦪', desc:'Grants +1 Luck for the rest of the run.' },
  { id:'driftnet', name:'Driftnet', icon:'🕸️', desc:'Bursts open into a random handful of pickups.' },
  { id:'tideflask', name:'Tide Flask', icon:'🧪', desc:'Instantly triggers one random pill effect — good or bad — without spending a pill.' },

  { id:'reddye', name:'Red Dye', icon:'🔴', desc:'Dyes a random wisp: shoots 2 tears, but drops it to 1 heart.' },
  { id:'purpledye', name:'Purple Dye', icon:'🟣', desc:"Dyes a random wisp: shots home in, but at half speed." },
  { id:'golddye', name:'Gold Dye', icon:'🟡', desc:'Dyes a random wisp: shoots 3 tears.' },
  { id:'neondye', name:'Neon Dye', icon:'🟢', desc:'Dyes a random wisp: gives it 4 hearts.' },
  { id:'blackdye', name:'Black Dye', icon:'⚫', desc:"Dyes a random wisp: shots explode on impact, but its contact sting lands half as often." },
  { id:'bluedye', name:'Blue Dye', icon:'🔵', desc:'Dyes a random wisp: shots pierce 2 extra enemies, but it deals no contact damage.' },
  { id:'whitedye', name:'White Dye', icon:'⚪', desc:'Dyes a random wisp: fires 40% faster, but costs it 1 heart.' },
  { id:'orangedye', name:'Orange Dye', icon:'🟠', desc:'Dyes a random wisp: shots deal 50% more damage, but it fires half as often.' },
  { id:'tearsaugment', name:'Tears Augment', icon:'💧', desc:'Augments a random wisp: +1 tear.' },
  { id:'damageaugment', name:'Damage Augment', icon:'💥', desc:'Augments a random wisp: +1 damage.' },
  { id:'healthaugment', name:'Health Augment', icon:'❤️', desc:'Augments a random wisp: +1 heart.' },
  { id:'goldaugment', name:'Gold Augment', icon:'✨', desc:'Augments a random wisp with all three augments at once.' },
  { id:'pierceaugment', name:'Pierce Augment', icon:'💠', desc:"Augments a random wisp: +1 pierce to its shots." },
  { id:'hasteaugment', name:'Haste Augment', icon:'⚡', desc:'Augments a random wisp: -10% shot cooldown (stacks, caps at -50%).' },
  { id:'freezeaugment', name:'Freeze Augment', icon:'❄️', desc:"Augments a random wisp: +5% freeze chance on contact hits (stacks)." },
];

const ROOM_TYPE_LIST = [
  { id:'normal', name:'Normal Room', icon:'🚪', desc:'A plain room — clear the enemies for a chance at a reward.' },
  { id:'start', name:'Start Room', icon:'🏠', desc:'Where you arrive on each floor. Always empty and safe.' },
  { id:'boss', name:'Boss Room', icon:'👹', desc:"Where the floor's boss awaits. Beating it opens the way down." },
  { id:'treasure', name:'Treasure Room', icon:'💰', desc:'Holds a free item pedestal.' },
  { id:'shop', name:'Shop', icon:'🛒', desc:'Spend coins on items, pickups and consumables.' },
  { id:'secret', name:'Secret Room', icon:'🕳️', desc:'Hidden behind a wall — bomb your way in for whatever is stashed inside.' },
  { id:'petshop', name:'Pet Shop', icon:'🐾', desc:'Offers a free familiar to follow you for the run.' },
  { id:'curse', name:'Cursed Room', icon:'💀', desc:'A reward guarded by a price paid in health.' },
  { id:'sacrifice', name:'Sacrifice Room', icon:'🩸', desc:'Spikes that hurt you — step on them repeatedly for escalating rewards.' },
  { id:'vault', name:'Vault', icon:'🏦', desc:'Requires a key — guards a stash of coins and pickups.' },
  { id:'challenge', name:'Challenge Room', icon:'🏟️', desc:'Take the item and survive the waves of enemies it summons.' },
  { id:'crystal', name:'Crystal Room', icon:'💎', desc:'Offers a blessing — a free pedestal item, no strings attached.' },
  { id:'sombra', name:'Sombra Room', icon:'🌑', desc:'Strikes a costly deal for a powerful boon — items here are paid for in hearts.' },
  { id:'star', name:'Star Room', icon:'🌌', desc:'Key-locked — pick one of two items on offer.' },
  { id:'cpathgate', name:'Storm Drain', icon:'🚧', desc:'A hidden alternate path, found only on Floor 2.' },
  { id:'planetarium', name:'Planetarium', icon:'🔭', desc:'A room with no walls at all, open onto the stars. A second alternate path, found only on Floor 3.' },
  { id:'shrine', name:'Shrine', icon:'🕯️', desc:'Offers a blessing for a price paid in coins, not hearts.' },
  { id:'arcade', name:'Arcade', icon:'🎰', desc:'Costs 1 coin at the door. Feed fillies and machines inside for gambled rewards.' },
  { id:'supersecret', name:'Super Secret Room', icon:'🔐', desc:'A rare hidden vault, harder to find than a normal secret room, with a richer reward.' },
  { id:'mirror', name:'Mirror Room', icon:'🪞', desc:'Face a boss that mirrors your own build and stats. Found every fifth floor.' },
  { id:'karma', name:'Karma Room', icon:'☯️', desc:'Donate resources to a bank of machines for escalating unlocks.' },
  { id:'bosschallenge', name:'Boss Challenge Room', icon:'⚔️', desc:'Take the pedestal item to summon a floor boss; beat it for a guaranteed strong reward.' },
];

const ROOM_MUSIC_TRACKS = {
  boss:'bossroom',
  crystal:'crystalroom', shrine:'crystalroom',
  sombra:'sombraroom', curse:'sombraroom',
  treasure:'treasureroom',
  secret:'secretroom', sacrifice:'secretroom',
  shop:'shoproom', petshop:'shoproom',
};
