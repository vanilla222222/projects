const region=(id,name,entry,rooms,options={})=>({
 id:'orbit-'+id,name,entry:entry&&[entry[0]==='tide-gate'?entry[0]:'orbit-'+entry[0],entry[1]],
 zones:rooms.split('|'),theme:'deep',sky:['#111538','#574589'],motif:'orbit',...options
});
export const WORLD_THREE={id:3,name:'The Astral Reach',entry:'orbit-dock',areas:[
 region('dock','Sporeport',['tide-gate',1],'Landing Ring|Habitat Pens|Seed Vault|Hydroponics',{town:true}),
 region('garden','Moon Gardens',['dock',3],'Glass Orchard|Dew Terrace|Spore Ledge|Twilight Beds|Sunlamp Walk|Crown Greenhouse'),
 region('wilds','Crater Wilds',['garden',5],'Dust Gate|Lunar Tracks|Burrow Ridge|Fossil Scar|Impact Basin|Horned Crater'),
 region('loom','Shuttlecross',['wilds',5],'Trade Ring|Gravity Loom|Starter Cellar|Aging Bay',{town:true}),
 region('silk','Silk Nebula',['loom',1],'Threadbank|Cocoon Drift|Needle Rocks|Web Bridge|Moth Cloud|Silken Core'),
 region('comets','Comet Graveyard',['silk',5],'Cold Tail|Glacial Shards|Slush Hollow|Broken Comet|Ice Needle|Perihelion'),
 region('relay','Dead Satellites',['comets',5],'Silent Array|Mirror Platform|Broken Signal|Wreck Field|Dark Dish|Last Transmitter'),
 region('chart','Zenith Observatory',['relay',5],'Observatory Dock|Chart Room|Orrery|Singularity Gate',{town:true}),
 region('rim','Event Horizon',['chart',3],'Tidal Shelf|Blacklight Traverse|Accretion Ring|Photon Rim|Last Light|Gravity Well'),
]};
const native={
 garden:['Starbud Grazer','Dew Hopper','Spore Wisp','Twilight Crawler','Sunlamp Moth','Crown Stag'],
 wilds:['Dust Hound','Lunar Jackal','Burrow Strider','Fossilback','Impact Drake','Craterhorn'],
 silk:['Thread Mite','Cocoon Glider','Needle Wasp','Web Stalker','Nebula Moth','Silk Queen'],
 comets:['Frost Wisp','Shard Crawler','Slush Eel','Comet Strider','Ice Drake','Solar Wraith'],
 relay:['Receiver Drone','Mirror Sentinel','Signal Wisp','Wreck Scavenger','Dish Golem','Relay Keeper'],
 rim:['Tidal Specter','Blacklight Bat','Accretion Golem','Photon Ray','Light Eater','Gravity Knight']
};
const harvest={garden:['starwood','moonfruit'],wilds:['orbit-fossil'],silk:['void-moth'],comets:['orbit-fossil','moonfruit'],relay:['void-moth','starwood'],rim:['moonfruit']};
for(const a of WORLD_THREE.areas){
 const key=a.id.slice(6);
 a.names=native[key];
 a.resources=a.zones.map((_,i)=>a.town?[]:[harvest[key][i%harvest[key].length]]);
}
export const ORBIT_RESOURCES={
 starwood:{name:'Starwood',skill:'logging',level:10,tier:3,threshold:180},
 moonfruit:{name:'Moonfruit',skill:'foraging',level:8,tier:2,threshold:130},
 'orbit-fossil':{name:'Meteor Fossil',skill:'digging',level:8,tier:2,threshold:130},
 'void-moth':{name:'Void Moth',skill:'bugcatching',level:8,tier:2,threshold:130}
};
export const ORBIT_JOBS={
 beastkeeping:{name:'Beastkeeping',area:'orbit-dock',zone:1,output:'starlamb-fleece',cost:{moonfruit:3},seconds:120,action:'Raise a starlamb'},
 cultivation:{name:'Cultivation',area:'orbit-dock',zone:2,output:'nova-bloom',cost:{moonfruit:2,cloudberry:1},seconds:90,action:'Crossbreed a nova bloom'},
 weaving:{name:'Weaving',area:'orbit-loom',zone:1,output:'nebula-cloth',cost:{'starlamb-fleece':2,'void-moth':1},seconds:100,action:'Weave nebula cloth'},
 fermentation:{name:'Fermentation',area:'orbit-loom',zone:2,output:'starbrew',cost:{'nova-bloom':2,cloudberry:2},seconds:150,action:'Age a batch of starbrew'},
 cartography:{name:'Cartography',area:'orbit-chart',zone:1,output:'astral-chart',cost:{'orbit-fossil':2,'nebula-cloth':1},seconds:60,action:'Draft an astral chart'}
};
export const ORBIT_ADVANCEMENTS={
 warrior:{id:'beastwarden',name:'Beastwarden',skill:'beastkeeping',area:'orbit-dock',zone:1,needs:{'starlamb-fleece':6}},
 mage:{id:'thornspeaker',name:'Thornspeaker',skill:'cultivation',area:'orbit-dock',zone:2,needs:{'nova-bloom':6}},
 blacksmith:{id:'silkguard',name:'Silkguard',skill:'weaving',area:'orbit-loom',zone:1,needs:{'nebula-cloth':6}},
 enchanter:{id:'starfarer',name:'Starfarer',skill:'cartography',area:'orbit-chart',zone:1,needs:{'astral-chart':6}},
 alchemist:{id:'hearthbrewer',name:'Hearthbrewer',skill:'fermentation',area:'orbit-loom',zone:2,needs:{starbrew:6}}
};
export const ORBIT_SECRETS={
 'chart-green':{name:'The Buried Meridian',area:'tree',zone:1,level:2},
 'chart-tide':{name:'The Drowned Ephemeris',area:'tide-cliffs',zone:2,level:3},
 'chart-orbit':{name:'The Lost Constellation',area:'orbit-rim',zone:3,level:4},
 singularity:{name:'The Singularity Chamber',area:'orbit-chart',zone:3,enemy:'singularity'}
};
export function installOrbit({ITEMS,ENEMIES,SKILLS,SECRETS,FOODS,EQUIPMENT,RECIPES}){
 const item=(id,name,icon)=>ITEMS[id]={id,name,icon,rarity:'rare',description:'Astral Reach expedition material.'};
 for(const [id,d] of Object.entries(ORBIT_JOBS))SKILLS[id]=d.name;
 for(const [id,name,icon] of [
  ['starlamb-fleece','Starlamb Fleece','❧'],['nova-bloom','Nova Bloom','✿'],['nebula-cloth','Nebula Cloth','▧'],
  ['starbrew','Starbrew','⚗'],['astral-chart','Astral Chart','⌖'],['singularity-core','Singularity Core','◉']
 ])item(id,name,icon);
 Object.assign(SECRETS,ORBIT_SECRETS);
 FOODS.starbrew={name:'Starbrew',heal:440,cooldown:16};
 ENEMIES.singularity={id:'singularity',name:'The Eventide Colossus',area:'orbit-chart',index:3,shape:'golem',hp:36000,attack:126,xp:6500,coins:1600,accuracy:425,loot:[{id:'singularity-core',chance:1}]};
 for(const [id,name,slot,stats,cost] of [
  ['nebula-mail','Nebula Mail','body',{defense:42,health:290},{'nebula-cloth':12,'obsidian-bar':8,'orbit-fossil':25}],
  ['nova-charm','Nova Charm','charm',{attack:54,accuracy:85,health:170},{'nova-bloom':12,starwood:25,'storm-eel':12}],
  ['eventide-ring','Eventide Ring','ring',{attack:35,accuracy:60,health:200},{'singularity-core':1,'astral-chart':8,'obsidian-bar':10}]
 ]){
  item(id,name,'✦');
  EQUIPMENT[id]={name,slot,stats};
  RECIPES.push({id:'gear-'+id,name,skill:'smithing',station:'anvil',equipment:id,cost,requiresCompletion:true});
 }
}
