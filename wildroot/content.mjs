// World 1 content is data-driven. Later worlds can add branches without changing saves.
export const CLASSES = {
  warrior: {name:'Warrior', skill:'mining', color:'#bf7146', trainer:'Brann', town:'town', motto:'Stand firm. Break stone.', needs:{copper:20,'moss-slime':10}},
  mage: {name:'Mage', skill:'logging', color:'#6c8fca', trainer:'Willow', town:'town', motto:'There is magic in the grain.', needs:{oak:20,'moss-slime':10}},
  blacksmith: {name:'Blacksmith', skill:'smithing', color:'#ba9144', trainer:'Flint', town:'town', motto:'Build what the wild cannot give.', needs:{'copper-bar':6,'boar-hide':10}},
  enchanter: {name:'Enchanter', skill:'enchanting', color:'#a57fbd', trainer:'Mira', town:'jungle-town', motto:'Find the strength beneath the surface.', needs:{dust:8,'moth-wing':10}},
  alchemist: {name:'Alchemist', skill:'alchemy', color:'#77a45f', trainer:'Fern', town:'jungle-town', motto:'A little curiosity. A careful measure.', needs:{tonic:4,'vine-fiber':10}}
};
export const SKILLS = {mining:'Mining',logging:'Logging',smithing:'Smithing',enchanting:'Enchanting',alchemy:'Alchemy'};
export const AREAS = [
 {id:'town',name:'Hearthstead',label:'Town',zones:['Village Green','Hammer Lane','The Foundry'],theme:'town',icon:'⌂',text:'A warm hearth, a patient anvil, and a beginning.',resources:[[],[],[]]},
 {id:'forest',name:'The Greenreach',label:'Forest',zones:['Mossy Clearing','Bramble Path','Birch Hollow','Firefly Bend','Ancient Grove'],theme:'forest',icon:'♧',text:'Old roots run deep. Something stirs beneath the canopy.',resources:[['oak'],['oak'],['birch'],['birch'],['oak','birch']]},
 {id:'caves',name:'Copperlight Caves',label:'Caves',zones:['Lantern Mouth','Copper Vein','Echo Chamber'],theme:'caves',icon:'◇',text:'Follow the lamplight. Listen for the pick against stone.',resources:[['copper'],['copper'],['copper']]},
 {id:'jungle',name:'The Tangled Wild',label:'Jungle',zones:['Vine Crossing','Rainleaf Trail','Overgrown Steps','Emerald Thicket'],theme:'jungle',icon:'❧',text:'Through the rain and the roots, another settlement waits.',resources:[['jungle-wood'],['jungle-wood'],['jungle-wood'],['jungle-wood']]},
 {id:'deep',name:'The Deep Caverns',label:'Deep Caverns',zones:['Iron Descent','Forgotten Shaft','Gilded Grotto','Heart of the Mountain'],theme:'deep',icon:'◈',text:'Rich seams and restless guardians, far below the daylight.',resources:[['iron'],['iron'],['gold'],['iron','gold']]},
 {id:'jungle-town',name:'Verdant Outpost',label:'Jungle Town',zones:['Canopy Market','Alchemists’ Terrace','The Rootbound Gate'],theme:'jungle-town',icon:'⌂',text:'Bottled wonders, woven spells, and a gate to something ancient.',resources:[[],[],[]]}
];
export const ITEMS = {};
function item(id,name,rarity='common',icon='◇',description=''){ITEMS[id]={id,name,rarity,icon,description};}
for(const [id,name,icon] of [['copper','Copper Ore','◆'],['iron','Iron Ore','◆'],['gold','Gold Ore','◆'],['oak','Oak Log','▰'],['birch','Birch Log','▰'],['jungle-wood','Jungle Wood','▰'],['copper-bar','Copper Bar','▱'],['iron-bar','Iron Bar','▱'],['gold-bar','Gold Bar','▱'],['plank','Oak Plank','▰'],['dust','Enchanting Dust','✦'],['tonic','Field Tonic','⚗']])item(id,name,'common',icon);
export const ENEMIES = {};
const families = {
 forest:[['Moss Slime','moss-slime','Moss Gel','slime'],['Bramble Boar','boar-hide','Boar Hide','boar'],['Lantern Moth','moth-wing','Moth Wing','moth'],['Barkling','bark-shard','Living Bark','stump'],['Grove Guardian','grove-seed','Grove Seed','stump']],
 caves:[['Pebble Bat','bat-fang','Bat Fang','bat'],['Copper Crawler','crawler-shell','Crawler Shell','crab'],['Echo Golem','echo-stone','Echo Stone','golem']],
 jungle:[['Vine Creeper','vine-fiber','Vine Fiber','slime'],['Rainfrog','frog-dew','Rainfrog Dew','slime'],['Sunscale','scale','Sunscale Scale','crab'],['Orchid Mantis','orchid-petal','Orchid Petal','moth']],
 deep:[['Ironback','iron-shell','Ironback Shell','crab'],['Cave Wisp','wisp-ember','Wisp Ember','moth'],['Gilded Scarab','scarab-husk','Scarab Husk','crab'],['Stone Sentinel','sentinel-core','Sentinel Core','golem']]
};
const bases={forest:0,caves:2,jungle:5,deep:7};
for(const [area,rows] of Object.entries(families)) rows.forEach(([name,drop,dropName,shape],i)=>{
 const id=`${area}-${i}`,tier=bases[area]+i;
 item(drop,dropName,'common','◉'); item(`${drop}-rare`,`${dropName} Fragment`,'rare','✧'); item(`${drop}-legend`,`${name} Relic`,'legendary','✹');
 ENEMIES[id]={id,name,area,index:i,shape,hp:16+tier*10,attack:1+Math.floor(tier/2),xp:5+tier*2,coins:1+tier,
 loot:[{id:drop,chance:.8},{id:`${drop}-rare`,chance:.05},{id:`${drop}-legend`,chance:Math.max(.0000001,.001/(i+1))}]};
});
export const WORLD_LOOT=[{id:'amber',chance:.02},{id:'root-crystal',chance:.008},{id:'ancient-seed',chance:.003},{id:'sunstone',chance:.0001},{id:'world-heart',chance:.00001}];
for(const [id,name,rare] of [['amber','Wild Amber','rare'],['root-crystal','Root Crystal','rare'],['ancient-seed','Ancient Seed','rare'],['sunstone','Sunstone','legendary'],['world-heart','Heart of the Wild','legendary']])item(id,name,rare,'✦');
export const GLOBAL_LOOT=['star-thread','everleaf','void-pearl','time-splinter','first-flame'].map((id,i)=>{item(id,['Star Thread','Everleaf','Void Pearl','Time Splinter','First Flame'][i],'mythical','✺');return{id,chance:.000001/(i+1)};});
item('boss-heart','Rootwarden Heart','legendary','♥');
ENEMIES.boss={id:'boss',name:'The Rootwarden',area:'jungle-town',index:2,shape:'stump',hp:1600,attack:15,xp:500,coins:200,loot:[{id:'boss-heart',chance:1},{id:'world-heart',chance:.02}]};
export const RECIPES = [
 {id:'copper-bar',name:'Smelt Copper',skill:'smithing',station:'foundry',cost:{copper:3},output:'copper-bar',count:1},
 {id:'iron-bar',name:'Smelt Iron',skill:'smithing',station:'foundry',cost:{iron:3,'copper-bar':1},output:'iron-bar',count:1},
 {id:'gold-bar',name:'Smelt Gold',skill:'smithing',station:'foundry',cost:{gold:3,'iron-bar':1},output:'gold-bar',count:1},
 {id:'plank',name:'Cut Oak Planks',skill:'smithing',station:'anvil',cost:{oak:3},output:'plank',count:1},
 {id:'dust',name:'Distil Enchanting Dust',skill:'enchanting',station:'enchanting',cost:{'moss-slime':2,oak:1},output:'dust',count:2},
 {id:'tonic',name:'Brew Field Tonic',skill:'alchemy',station:'alchemy',cost:{'moss-slime':2,birch:1},output:'tonic',count:1},
 {id:'blade',name:'Copper Weapon',skill:'smithing',station:'anvil',cost:{'copper-bar':4,plank:2},upgrade:'weapon',tier:1},
 {id:'iron-blade',name:'Iron Weapon',skill:'smithing',station:'anvil',cost:{'iron-bar':6,'boar-hide':8},upgrade:'weapon',tier:2},
 {id:'gold-blade',name:'Gilded Weapon',skill:'smithing',station:'anvil',cost:{'gold-bar':8,'jungle-wood':15},upgrade:'weapon',tier:3},
 {id:'armor',name:'Copper Armour',skill:'smithing',station:'anvil',cost:{'copper-bar':5,'boar-hide':6},upgrade:'armor',tier:1},
 {id:'iron-armor',name:'Iron Armour',skill:'smithing',station:'anvil',cost:{'iron-bar':8,'crawler-shell':10},upgrade:'armor',tier:2},
 {id:'gold-armor',name:'Gilded Armour',skill:'smithing',station:'anvil',cost:{'gold-bar':10,'iron-shell':10},upgrade:'armor',tier:3},
 {id:'pick',name:'Copper Pickaxe',skill:'smithing',station:'anvil',cost:{'copper-bar':3,oak:8},upgrade:'pick',tier:1},
 {id:'iron-pick',name:'Iron Pickaxe',skill:'smithing',station:'anvil',cost:{'iron-bar':5,birch:10},upgrade:'pick',tier:2},
 {id:'axe',name:'Copper Hatchet',skill:'smithing',station:'anvil',cost:{'copper-bar':3,oak:8},upgrade:'axe',tier:1},
 {id:'iron-axe',name:'Iron Hatchet',skill:'smithing',station:'anvil',cost:{'iron-bar':5,'jungle-wood':10},upgrade:'axe',tier:2},
 {id:'rune',name:'Etch a Power Rune',skill:'enchanting',station:'enchanting',cost:{dust:5,'bat-fang':5},upgrade:'rune',repeat:true},
 {id:'elixir',name:'Permanent Vitality Elixir',skill:'alchemy',station:'alchemy',cost:{tonic:3,'frog-dew':5},upgrade:'vitality',repeat:true}
];
// Every material has a real sink. Rare discoveries create permanent account growth.
export const OFFERINGS=Object.keys(ITEMS).filter(id=>!['copper','iron','gold','oak','birch','jungle-wood','copper-bar','iron-bar','gold-bar','plank','dust','tonic'].includes(id));
export function purposes(id){
 const uses=RECIPES.filter(r=>r.cost[id]).map(r=>r.name);
 for(const c of Object.values(CLASSES))if(c.needs[id])uses.push(`${c.name} initiation`);
 if(OFFERINGS.includes(id))uses.push('Guild studies: a specific account bonus');
 if(EQUIPMENT[id])uses.push('Equip '+GEAR_SLOTS[EQUIPMENT[id].slot]);
 for(const r of Object.values(RUNES))if(r.cost[id])uses.push(r.name+' enchantment');
 for(const r of Object.values(ALCHEMY))if(r.cost[id])uses.push(r.name+' research');
 for(const r of Object.values(GUILD))if(r.cost[id])uses.push(r.name+' guild upgrade');
 for(const q of STORY)if(q.deliver?.[id])uses.push(q.name+' quest');
 if(EXPANSIONS[id])uses.push('Consume once '+(EXPANSIONS[id].target==='bag'?'per character':'per account')+': +'+EXPANSIONS[id].slots+' slots');
 if(CAPACITY_BAGS[id])uses.push('Consume once per character: +'+CAPACITY_BAGS[id].bonus+' '+CAPACITY_BAGS[id].type+' per stack');
 if(POTIONS[id])uses.push('Drink: 20 minute profession or combat boost');
 if(id==='rootbound-key')uses.push('Permanent access to the Rootwarden');
 if(id==='tonic')uses.push('Recover health');
 return [...new Set(uses)];
}
export function areaById(id){return AREAS.find(a=>a.id===id);}
export function zoneEnemy(area,index){return ENEMIES[`${area}-${index}`];}

// World One's connected economy. No World Two content is enabled here.
export const EQUIPMENT={
 'copper-sword':{name:'Copper Sword',slot:'weapon',stats:{attack:7},recipe:'blade'},
 'iron-sword':{name:'Iron Sword',slot:'weapon',stats:{attack:14,crit:.02},recipe:'iron-blade'},
 'gold-sword':{name:'Gilded Sword',slot:'weapon',stats:{attack:21,crit:.04},recipe:'gold-blade'},
 'copper-mail':{name:'Copper Mail',slot:'body',stats:{defense:2,health:20},recipe:'armor'},
 'iron-mail':{name:'Iron Mail',slot:'body',stats:{defense:4,health:40},recipe:'iron-armor'},
 'gold-mail':{name:'Gilded Mail',slot:'body',stats:{defense:6,health:60},recipe:'gold-armor'},
 'copper-pick':{name:'Copper Pickaxe',slot:'pick',stats:{mining:.25},recipe:'pick'},
 'iron-pick':{name:'Iron Pickaxe',slot:'pick',stats:{mining:.5},recipe:'iron-pick'},
 'copper-axe':{name:'Copper Hatchet',slot:'axe',stats:{logging:.25},recipe:'axe'},
 'iron-axe':{name:'Iron Hatchet',slot:'axe',stats:{logging:.5},recipe:'iron-axe'},
 'oak-staff':{name:'Living Oak Staff',slot:'weapon',class:'mage',stats:{attack:12,logging:.15,skill:.15}},
 'forge-hammer':{name:'Forgekeeper Hammer',slot:'weapon',class:'blacksmith',stats:{attack:13,crafting:.15,defense:1}},
 'rune-focus':{name:'Birch Rune Focus',slot:'weapon',class:'enchanter',stats:{attack:11,skill:.25,health:15}},
 'catalyst-flask':{name:'Catalyst Flask',slot:'weapon',class:'alchemist',stats:{attack:11,skill:.15,alchemy:.2}},
 'warden-blade':{name:'Warden Blade',slot:'weapon',class:'warrior',stats:{attack:32,defense:2,crit:.04}},
 'copper-helm':{name:'Copper Helm',slot:'head',stats:{defense:1,health:12}},
 'birch-boots':{name:'Trailwalker Boots',slot:'feet',stats:{speed:.1,health:8}},
 'iron-helm':{name:'Iron Helm',slot:'head',stats:{defense:3,health:25}},
 'tempered-mail':{name:'Verdant Steel Mail',slot:'body',stats:{defense:9,health:85}},
 'guild-charm':{name:'Artisan’s Charm',slot:'charm',stats:{mining:.1,logging:.1,crafting:.1}},
 'warden-charm':{name:'Heartwood Charm',slot:'charm',stats:{attack:9,health:35,skill:.15}},
 'sunwell-staff':{name:'Sunwell Branch',slot:'weapon',stats:{attack:25,skill:.2,logging:.15}}
};
export const GEAR_SLOTS={weapon:'Weapon',head:'Head',body:'Body',feet:'Feet',pick:'Pickaxe',axe:'Hatchet',charm:'Accessory'};
for(const [id,e]of Object.entries(EQUIPMENT)){item(id,e.name,'rare',e.slot==='weapon'?'⚔':e.slot==='body'?'▱':e.slot==='head'?'♜':e.slot==='feet'?'♟':'✦');const r=RECIPES.find(r=>r.id===e.recipe);if(r)r.equipment=id;}
for(const [id,name,icon]of [['charcoal','Charcoal','●'],['tempered-bar','Verdant Steel Bar','▱'],['binding-resin','Binding Resin','◈'],['mining-tonic','Prospector’s Tonic','⚗'],['logging-tonic','Forester’s Tonic','⚗'],['battle-tonic','Battle Draught','⚗'],['ward-tonic','Warding Draught','⚗'],['sap-essence','Sunwell Sap','✺'],['vault-seal','Forge Vault Seal','◈'],['rootbound-key','Rootbound Seal','⚿']])item(id,name,id.includes('essence')||id==='vault-seal'?'rare':'common',icon);
RECIPES.unshift({id:'charcoal',name:'Burn Charcoal',skill:'smithing',station:'foundry',cost:{oak:3},output:'charcoal',count:2,duration:5});
for(const r of RECIPES){if(r.station==='foundry'){r.duration??=r.id==='copper-bar'?8:r.id==='iron-bar'?14:24;if(r.id!=='charcoal')r.cost.charcoal=r.id==='copper-bar'?1:2;}if(r.id.startsWith('iron-')||r.id==='iron-bar')r.unlock='ironworking';if(r.id.startsWith('gold-')||r.id==='gold-bar')r.unlock='gilding';}
RECIPES.push(
 {id:'tempered-bar',name:'Forge Verdant Steel',skill:'smithing',station:'foundry',cost:{'iron-bar':2,'gold-bar':1,'jungle-wood':3,charcoal:2},output:'tempered-bar',count:1,duration:30,unlock:'verdant-steel'},
 ...[
 ['oak-staff',{plank:5,birch:12,'grove-seed':8}],['forge-hammer',{'iron-bar':5,plank:4,'echo-stone':6}],['rune-focus',{birch:15,dust:8,'moth-wing':8}],['catalyst-flask',{'copper-bar':4,tonic:3,'frog-dew':8}],
 ['copper-helm',{'copper-bar':3,'boar-hide':5}],['birch-boots',{birch:10,'boar-hide':8}],['iron-helm',{'iron-bar':5,'crawler-shell':8}],['tempered-mail',{'tempered-bar':6,'iron-shell':12,'binding-resin':4}],
 ['guild-charm',{'copper-bar':4,plank:4,dust:4,tonic:2}],['warden-blade',{'tempered-bar':8,'binding-resin':5,'sentinel-core':10}],['warden-charm',{'boss-heart':1,dust:15,'gold-bar':5}],['sunwell-staff',{'sap-essence':3,'tempered-bar':3,'jungle-wood':15}]
 ].map(([id,cost])=>({id:`gear-${id}`,name:EQUIPMENT[id].name,skill:'smithing',station:'anvil',cost,equipment:id,unlock:['tempered-mail','warden-blade'].includes(id)?'verdant-steel':id==='warden-charm'?'heartwood':id==='sunwell-staff'?'sunwell':id==='iron-helm'?'ironworking':null})),
 {id:'binding-resin',name:'Mix Binding Resin',skill:'alchemy',station:'alchemy',cost:{'jungle-wood':3,'moss-slime':2},output:'binding-resin',count:2},
 ...[['mining-tonic',{tonic:1,copper:8,'bat-fang':3}],['logging-tonic',{tonic:1,birch:8,'grove-seed':3}],['battle-tonic',{tonic:1,'wisp-ember':4,'vine-fiber':4}],['ward-tonic',{tonic:1,'crawler-shell':4,'frog-dew':4}]].map(([id,cost])=>({id,name:ITEMS[id].name,skill:'alchemy',station:'alchemy',cost,output:id,count:1,unlock:'brewing'}))
);
export const RUNES={
 force:{name:'Force',description:'+3 attack',stats:{attack:3},cost:{dust:4,'bat-fang':3}},
 fortitude:{name:'Fortitude',description:'+20 health, +1 defense',stats:{health:20,defense:1},cost:{dust:5,'crawler-shell':3}},
 insight:{name:'Insight',description:'+12% mining and logging speed',stats:{mining:.12,logging:.12},cost:{dust:6,'moth-wing':5}},
 fleet:{name:'Fleet',description:'+4% attack speed, +5% movement',stats:{haste:.04,speed:.05},cost:{dust:8,'vine-fiber':6}},
 living:{name:'Living',description:'+15 health, +18% skill power',stats:{health:15,skill:.18},cost:{dust:8,'sap-essence':1},unlock:'sunwell'}
};
export const POTIONS={
 'mining-tonic':{type:'mining',value:.25,duration:1200},'logging-tonic':{type:'logging',value:.25,duration:1200},'battle-tonic':{type:'attack',value:.18,duration:1200},'ward-tonic':{type:'defense',value:3,duration:1200}
};
export const ALCHEMY={
 ferrous:{name:'Ferrous Focus',effect:'mining',amount:.04,description:'+4% mining speed per level',cost:{'copper-bar':3,'bat-fang':5}},
 grain:{name:'Living Grain',effect:'logging',amount:.04,description:'+4% logging speed per level',cost:{birch:15,'bark-shard':5}},
 blood:{name:'Hardy Blood',effect:'health',amount:.03,description:'+3% account maximum health per level',cost:{tonic:2,'frog-dew':5}},
 resonance:{name:'Resonance',effect:'skillXP',amount:.05,description:'+5% profession XP per level',cost:{dust:4,'moth-wing':5}},
 catalyst:{name:'Compound Catalyst',effect:'crafting',amount:.04,description:'+4% foundry speed per level',cost:{'binding-resin':2,'vine-fiber':5}}
};
export const GUILD={
 supports:{name:'Mine Supports',effect:'defense',amount:1,max:5,description:'+1 account defense per level',cost:{copper:40,'copper-bar':4,'bat-fang':8}},
 lodge:{name:'Foresters’ Lodge',effect:'logging',amount:.08,max:5,description:'+8% logging speed per level',cost:{oak:40,birch:15,plank:5}},
 supply:{name:'Supply Lines',effect:'crafting',amount:.06,max:3,description:'+6% foundry speed; +1 queue slot at levels 1 and 3',cost:{plank:6,'boar-hide':12,'copper-bar':4}},
 study:{name:'Runic Study',effect:'liquid',amount:.1,max:5,description:'+10% liquid generation and +10 liquid capacity per level',cost:{dust:8,'bark-shard':10,'vine-fiber':8}},
 trails:{name:'Trail Maps',effect:'speed',amount:.05,max:4,description:'+5% movement speed per level',cost:{'vine-fiber':15,'moth-wing':8,birch:15}},
 hospital:{name:'Field Hospital',effect:'health',amount:.08,max:5,description:'+8% account maximum health per level',cost:{'frog-dew':12,tonic:3,'boar-hide':10}},
 bestiary:{name:'Guild Bestiary',effect:'crit',amount:.015,max:5,description:'+1.5% critical chance per level',cost:{'moss-slime':20,'crawler-shell':10,'scale':8}},
 arsenal:{name:'Guild Arsenal',effect:'attack',amount:.04,max:5,description:'+4% account attack per level',cost:{'iron-bar':8,'grove-seed':10,'wisp-ember':8}}
};
export const TALENTS={power:{name:'Strength',description:'+2 base attack',max:30},vitality:{name:'Vitality',description:'+10 maximum health',max:30},industry:{name:'Versatility',description:'+5% gathering speed (legacy combat talent)',max:30},precision:{name:'Precision',description:'+1.5% critical chance',max:15},haste:{name:'Tempo',description:'+2% attack speed',max:15},signature:{name:'Class Mastery',description:'+8% active ability damage',max:20}};
export const PROF_TALENTS={efficiency:{name:'Efficient Hands',description:'+5% gathering speed',max:20},prosperity:{name:'Careful Harvest',description:'+2% chance of an extra resource',max:15},mastery:{name:'Patient Study',description:'+5% profession XP',max:20},workmanship:{name:'Workmanship',description:'+5% foundry speed',max:20}};
export const STORY=[
 {id:'first-roots',name:'A Foot in the Greenreach',giver:'steward',text:'Hesta has found blackened roots in the village well. Find out what is stirring in the forest.',requires:[],kills:{'forest-0':8},reward:{coins:35,items:{oak:12}}},
 {id:'tools',name:'Tools for Tomorrow',giver:'blacksmith',text:'Flint needs a working supply line: oak becomes charcoal, copper becomes bars, and planks become tool handles.',requires:['first-roots'],deliver:{'copper-bar':4,plank:2},reward:{coins:50,items:{charcoal:8},recipes:['field-gear']}},
 {id:'under-roots',name:'Under the Roots',giver:'warrior',text:'The echo golems guard a seam of iron. Clear the passage and bring proof from the caves.',requires:['tools'],kills:{'caves-2':12},deliver:{'bat-fang':8},reward:{coins:80,recipes:['ironworking']}},
 {id:'canopy-letter',name:'Letters from the Canopy',giver:'mage',text:'Old birch marks describe a spring behind Firefly Bend. Willow can translate them with living bark.',requires:['tools'],deliver:{birch:20,'bark-shard':8},reward:{coins:60,recipes:['sunwell'],secrets:['sunwell']}},
 {id:'outpost',name:'Outpost Supplies',giver:'alchemist',text:'Fern needs timber and iron for the outpost. In return she will teach advanced brewing and verdant steel.',requires:['under-roots'],deliver:{'jungle-wood':20,'iron-bar':6},reward:{coins:100,recipes:['brewing','gilding','verdant-steel'],liquid:20}},
 {id:'seal',name:'An Unquiet Seal',giver:'enchanter',text:'Five callings must work together to quiet the gate: metal, timber, runes and medicine. Bring the completed seal to the Rootwarden.',requires:['canopy-letter','outpost'],classes:5,deliver:{dust:12,tonic:4,'tempered-bar':2},reward:{coins:120,items:{'rootbound-key':1},permit:true}},
 {id:'heart',name:'Heart of the Wild',giver:'steward',text:'Return the Rootwarden’s heart to Hesta. The village can finally repair its well.',requires:['seal'],kills:{boss:1},deliver:{'boss-heart':1},reward:{coins:250,recipes:['heartwood'],complete:true}},
 {id:'spring',name:'A Living Spring',giver:'mage',text:'The Sunwell Keeper sheds living sap. A sample will help Willow restore the grove.',requires:['canopy-letter'],deliver:{'sap-essence':3},reward:{coins:100,items:{dust:12},guild:'lodge'}},
 {id:'vault',name:'The Forgotten Makers',giver:'blacksmith',text:'The old forge vault opens for a roster that has learned all five professions. Its keeper carries a maker’s seal.',requires:['outpost'],deliver:{'vault-seal':1},reward:{coins:150,guild:'supply'}}
];
export const SECRETS={sunwell:{name:'The Hidden Sunwell',area:'forest',zone:3,unlock:'sunwell',enemy:'sunwell',text:'A spring tucked beneath Firefly Bend.'},vault:{name:'The Forge Vault',area:'deep',zone:3,unlock:'vault',enemy:'vault',text:'The last workshop of the forgotten makers.'}};
for(const [id,name,drop,hp,attack,shape]of [['sunwell','Sunwell Keeper','sap-essence',260,6,'stump'],['vault','Vault Custodian','vault-seal',420,8,'golem']])ENEMIES[id]={id,name,area:id==='sunwell'?'forest':'deep',index:3,shape,hp,attack,xp:90,coins:35,loot:[{id:drop,chance:1}]};
// Distinct monster mechanics: tell, wind-up, then a dodgeable attack.
for(const e of Object.values(ENEMIES)){e.behavior=e.id==='boss'?'rootwave':e.shape==='boar'?'charge':e.shape==='moth'||e.shape==='bat'?'bolt':e.shape==='golem'||e.shape==='stump'?'slam':e.shape==='crab'?'guard':'hop';e.windup=e.id==='boss'?1.35:e.behavior==='charge'?.85:1;}

for(let i=RECIPES.length-1;i>=0;i--)if(['rune','elixir'].includes(RECIPES[i].id))RECIPES.splice(i,1);
export const EXPANSIONS={
 'woven-pouch':{name:'Woven Pouch',target:'bag',slots:4},'reinforced-pack':{name:'Reinforced Pack',target:'bag',slots:6},'runic-satchel':{name:'Runic Satchel',target:'bag',slots:8},
 'wooden-crate':{name:'Wooden Storage Crate',target:'chest',slots:8},'iron-lockbox':{name:'Iron Lockbox',target:'chest',slots:12},'runed-cabinet':{name:'Runed Cabinet',target:'chest',slots:16}
};
for(const[id,d]of Object.entries(EXPANSIONS))item(id,d.name,'rare',d.target==='bag'?'▣':'▤');
for(const[id,cost,unlock]of [['woven-pouch',{'boar-hide':6,plank:2},null],['reinforced-pack',{'iron-bar':3,'vine-fiber':10,birch:6},'ironworking'],['runic-satchel',{dust:10,'binding-resin':4,'moth-wing':5},'gilding'],['wooden-crate',{oak:30,plank:6},null],['iron-lockbox',{'iron-bar':5,'boar-hide':10},'ironworking'],['runed-cabinet',{'gold-bar':4,dust:12,'jungle-wood':20},'gilding']])RECIPES.push({id,name:ITEMS[id].name,skill:'smithing',station:'anvil',cost,output:id,count:1,unlock});
STORY[0].reward.items['woven-pouch']=1;

OFFERINGS.push('sap-essence','vault-seal');

// Stack capacity pouches are separate from inventory-slot expansions.
export const CAPACITY_BAGS={};
for(const[type,label,small,medium,large]of [
 ['materials','Materials',{'moss-slime':8,plank:2},{'boar-hide':12,'iron-bar':2},{'sentinel-core':8,'gold-bar':2,dust:8}],
 ['mining','Mining',{copper:15,plank:2},{iron:25,'crawler-shell':8},{gold:35,'iron-shell':8,dust:8}],
 ['logging','Logging',{oak:15,'moss-slime':5},{birch:25,'boar-hide':8},{'jungle-wood':35,'vine-fiber':12,dust:8}],
 ['food','Food',{tonic:3,'boar-hide':5},{tonic:6,'frog-dew':8},{tonic:10,'orchid-petal':8,dust:8}]
])for(const[tier,bonus,cost,unlock]of [['woven',100,small,null],['reinforced',300,medium,'ironworking'],['runic',600,large,'gilding']]){
 const id=`${tier}-${type}-bag`,name=`${tier[0].toUpperCase()+tier.slice(1)} ${label} Pouch`;
 CAPACITY_BAGS[id]={name,type,bonus};item(id,name,'rare','▣');RECIPES.push({id,name,skill:'smithing',station:'anvil',cost,output:id,count:1,unlock});
}
