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
 if(OFFERINGS.includes(id))uses.push('Archive: permanent account power');
 if(id==='tonic')uses.push('Recover health');
 return [...new Set(uses)];
}
export function areaById(id){return AREAS.find(a=>a.id===id);}
export function zoneEnemy(area,index){return ENEMIES[`${area}-${index}`];}
