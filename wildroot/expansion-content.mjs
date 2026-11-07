// Region data is independent of saves and rendering. Mining stays in W1, fishing in W2.
export const SKILL_TOOLS={mining:'pick',logging:'axe',fishing:'rod',bugcatching:'net',digging:'shovel',foraging:'gloves'};
export const WORLD_TWO={id:2,name:'The Tidewilds',entry:'tide-town',areas:[
 {id:'tide-town',name:'Tidehaven',zones:['Landfall Quay','Artisan Boardwalk','Pathfinders’ Hall'],theme:'town',town:true,resources:[[],[],[]],sky:['#70b9d3','#f4d9a3'],motif:'stiltmarket',entry:null},
 {id:'tide-shore',name:'Silverfin Coast',zones:['Shellwater Beach','Reedpool Inlet','Silverfin Pier','Coral Stair','Stormglass Cove'],theme:'forest',resources:[['reed-fish'],['reed-fish'],['silverfin'],['silverfin'],['storm-eel']],sky:['#68b7d1','#bce8de'],motif:'reservoir',entry:['tide-town',0],names:['Shell Skipper','Reed Crab','Pier Gull','Coralback','Storm Ray']},
 {id:'tide-marsh',name:'Lanternfen',zones:['Reed Gate','Firefly Pools','Amber Nest','Willow Channels','Lantern Hive'],theme:'jungle',resources:[['glowbug'],['glowbug'],['amber-beetle'],['amber-beetle'],['glasswing']],sky:['#386c85','#a0caa0'],motif:'lanterns',entry:['tide-shore',1],names:['Reed Hopper','Pool Glider','Amber Wasp','Willow Eel','Hive Keeper']},
 {id:'tide-dunes',name:'Buried Coast',zones:['Shovelbank','Fossil Steps','Lost Anchorage','Relic Basin'],theme:'caves',resources:[['clay'],['clay'],['fossil'],['sun-relic']],sky:['#c89878','#f5d7a0'],motif:'quarry',entry:['tide-town',1],names:['Sand Claw','Fossil Roller','Anchor Mimic','Relic Watcher']},
 {id:'tide-bramble',name:'Berrywild Rise',zones:['Berrybank','Saltwillow Bend','Cloudberry Ledges','Briar Crown'],theme:'forest',resources:[['tideberry','saltwillow'],['tideberry','saltwillow'],['cloudberry','driftwood'],['cloudberry','driftwood']],sky:['#7fbfa3','#ece6a3'],motif:'orchids',entry:['tide-town',2],names:['Berry Nibbler','Salt Hare','Cloud Finch','Briar Stag']},
 {id:'tide-hunt',name:'Hunters’ Highlands',zones:['Tracks in the Grass','Antler Pass','Raptor Shelf','Moonfang Ridge','Highland Den'],theme:'forest',resources:[['tideberry'],['saltwillow'],['cloudberry'],['driftwood'],['cloudberry']],sky:['#9298c0','#ead4b2'],motif:'watchtower',entry:['tide-bramble',1],names:['Trail Fox','Antler Charger','Shelf Raptor','Moonfang','Den Matriarch']},
 {id:'tide-cliffs',name:'Tempest Cliffs',zones:['Gale Foot','Windrope Ascent','Thunder Shelf','Skybreak Beacon'],theme:'deep',resources:[['glasswing'],['sun-relic'],['cloudberry'],['driftwood']],sky:['#3d557d','#c2a6c0'],motif:'ropeways',entry:['tide-shore',4],names:['Gale Moth','Rope Spider','Thunder Ram','Beacon Sentinel']},
 {id:'tide-gate',name:'Farwatch',zones:['Expedition Camp','The Sealed Horizon'],theme:'town',town:true,resources:[[],[]],sky:['#555b88','#eab88e'],motif:'gate',entry:['tide-cliffs',3]}
]};
export const MINING_EXPANSION={id:'depths',name:'The Lower Reaches',label:'Lower Reaches',world:1,zones:['Cobalt Fault','Obsidian Descent','The Black Crucible'],theme:'deep',icon:'◈',text:'Three deeper seams beyond the old mountain engine.',resources:[['cobalt'],['obsidian'],['cobalt','obsidian']],sky:['#172943','#666186'],motif:'crystal',entry:['deep',3],names:['Cobalt Armadillo','Obsidian Drake','Crucible Colossus']};
export const EXPANSION_AREAS=[MINING_EXPANSION,...WORLD_TWO.areas.map(a=>({...a,world:2,label:a.name,icon:a.town?'⌂':'◇',text:a.town?'A sheltered stop with shared storage.':'Follow the Tidewilds route. Gather, train and open the next passage.'}))];
export const NEW_RESOURCES={
 cobalt:{name:'Cobalt Ore',skill:'mining',level:7,tier:2,threshold:110},obsidian:{name:'Obsidian Ore',skill:'mining',level:10,tier:3,threshold:170},
 'saltwillow':{name:'Saltwillow Log',skill:'logging',level:6,tier:2,threshold:95},driftwood:{name:'Ancient Driftwood',skill:'logging',level:9,tier:3,threshold:150},
 'reed-fish':{name:'Reedfish',skill:'fishing',level:1,tier:1,threshold:15},silverfin:{name:'Silverfin',skill:'fishing',level:3,tier:1,threshold:45},'storm-eel':{name:'Storm Eel',skill:'fishing',level:6,tier:2,threshold:95},
 glowbug:{name:'Glowbug',skill:'bugcatching',level:1,tier:1,threshold:15},'amber-beetle':{name:'Amber Beetle',skill:'bugcatching',level:3,tier:1,threshold:45},glasswing:{name:'Glasswing',skill:'bugcatching',level:6,tier:2,threshold:95},
 clay:{name:'Coastal Clay',skill:'digging',level:1,tier:1,threshold:15},fossil:{name:'Tide Fossil',skill:'digging',level:3,tier:1,threshold:45},'sun-relic':{name:'Buried Sun Relic',skill:'digging',level:6,tier:2,threshold:95},
 tideberry:{name:'Tideberry',skill:'foraging',level:1,tier:1,threshold:15},cloudberry:{name:'Cloudberry',skill:'foraging',level:5,tier:2,threshold:75}
};
export const ADVANCEMENTS={
 warrior:{id:'ranger',name:'Ranger',skill:'hunting',area:'tide-hunt',zone:0,needs:{'tide-hunt-hide':20,'cobalt-bar':3}},
 mage:{id:'grovekeeper',name:'Grovekeeper',skill:'foraging',area:'tide-bramble',zone:0,needs:{tideberry:40,saltwillow:20}},
 blacksmith:{id:'excavator',name:'Excavator',skill:'digging',area:'tide-dunes',zone:0,needs:{clay:40,'cobalt-bar':3}},
 enchanter:{id:'weaver',name:'Lantern Weaver',skill:'bugcatching',area:'tide-marsh',zone:0,needs:{glowbug:40,dust:20}},
 alchemist:{id:'tidecaller',name:'Tidecaller',skill:'fishing',area:'tide-shore',zone:0,needs:{'reed-fish':40,tonic:10}}
};
export const EXPANSION_GOALS=Object.fromEntries(EXPANSION_AREAS.filter(a=>!a.town).map((a,i)=>[a.id,a.zones.map((_,z)=>a.id==='depths'?320+z*100:340+i*45+z*90)]));
export function expansionParent(area){return EXPANSION_AREAS.find(a=>a.id===area)?.entry;}
export const worldOf=area=>EXPANSION_AREAS.find(a=>a.id===area)?.world||1;
// Transferable gathering gains 1–3 resources per subsequent world. No W3 loot is spawned early.
export const RESOURCE_POLICY={logging:{from:1,perWorld:[1,3]},bugcatching:{from:2,perWorld:[1,3]},digging:{from:2,perWorld:[1,3]},foraging:{from:2,perWorld:[1,3]},mining:{only:1},fishing:{only:2},hunting:{from:2,xp:'monster kills'}};
export function installExpansion(D){
 const {AREAS,ITEMS,ENEMIES,RECIPES,EQUIPMENT,GEAR_SLOTS,GATHER_NODES,SKILLS,CAPACITY_BAGS,FOODS}=D;
 Object.assign(SKILLS,{fishing:'Fishing',bugcatching:'Bug Catching',digging:'Digging',foraging:'Foraging',hunting:'Hunting'});
 Object.assign(GEAR_SLOTS,{rod:'Fishing Rod',net:'Bug Net',shovel:'Shovel',gloves:'Foraging Gloves'});
 const add=(id,name,rarity='common',icon='◇')=>ITEMS[id]={id,name,rarity,icon,description:'Tidewilds expedition supplies.'};
 AREAS.push(...EXPANSION_AREAS);
 for(const[id,d]of Object.entries(NEW_RESOURCES)){add(id,d.name);GATHER_NODES[id]={...d};}
 for(const[aIndex,a]of EXPANSION_AREAS.entries())if(!a.town){const drop=a.id+'-hide';add(drop,a.name+' Trophy');a.zones.forEach((_,i)=>{const id=a.id+'-'+i,tier=a.id==='depths'?i:5+aIndex+i;add(id+'-rare',a.names[i]+' Fragment','rare');add(id+'-legend',a.names[i]+' Relic','legendary');ENEMIES[id]={id,name:a.names[i],area:a.id,index:i,shape:['crab','bat','golem','boar'][i%4],hp:Math.round(950*1.22**tier),attack:20+tier*3,xp:85+tier*14,coins:14+tier*3,accuracy:160+tier*15,loot:[{id:drop,chance:.85},{id:id+'-rare',chance:.04},{id:id+'-legend',chance:.0001}]};});}
 for(const[id,name,cost]of [['cobalt-bar','Cobalt Alloy',{cobalt:6,'tempered-bar':2}],['obsidian-bar','Obsidian Composite',{obsidian:10,'cobalt-bar':3,'gold-bar':2}]]){add(id,name,'rare','▱');RECIPES.push({id,name,skill:'smithing',station:'foundry',output:id,count:1,cost,requiresCompletion:true});}
 for(const[skill,slot]of Object.entries(SKILL_TOOLS)){
  const newTool=['rod','net','shovel','gloves'].includes(slot);
  for(const tier of newTool?[1,2]:[3]){const id=`tide-${slot}-${tier}`,name=(tier===1?'Reedbound ':tier===2?'Cobalt ':'Deep Cobalt ')+GEAR_SLOTS[slot];
   add(id,name,'rare','⚒');EQUIPMENT[id]={name,slot,stats:{[skill]:tier*.2},gatherTier:tier,gatherEfficiency:[0,28,85,150][tier]};
   RECIPES.push({id:'gear-'+id,name,skill:'smithing',station:'anvil',equipment:id,requiresCompletion:true,cost:tier===1?{'tempered-bar':3,'binding-resin':3}:tier===2?{'cobalt-bar':6,[{fishing:'silverfin',bugcatching:'amber-beetle',digging:'fossil',foraging:'tideberry'}[skill]]:25}:{'cobalt-bar':8,saltwillow:35,'binding-resin':10}});
  }
 }
 // One equipment branch turns all five new gathering loops into useful progression.
 const chain=[['expedition-charm','Expedition Charm','charm',{accuracy:20,health:50},{'reed-fish':30,glowbug:30,clay:30,tideberry:30,'cobalt-bar':5}],['tide-mail','Tidewild Mail','body',{defense:18,health:110},{silverfin:40,'amber-beetle':40,fossil:40,cloudberry:40,'obsidian-bar':8}],['storm-charm','Stormglass Charm','charm',{attack:30,accuracy:45,health:100},{'storm-eel':60,glasswing:60,'sun-relic':60,driftwood:60,'obsidian-bar':12}]];
 for(const[id,name,slot,stats,cost]of chain){add(id,name,'rare','✦');EQUIPMENT[id]={name,slot,stats};RECIPES.push({id:'gear-'+id,name,skill:'smithing',station:'anvil',equipment:id,cost,requiresCompletion:true});}
 for(const a of EXPANSION_AREAS.filter(a=>!a.town)){const id=a.id+'-supply',name=a.name+' Travel Ration';add(id,name);FOODS[id]={name,heal:75,cooldown:22};RECIPES.push({id,name,skill:'alchemy',station:'alchemy',output:id,count:5,cost:{[a.id+'-hide']:12,tideberry:10},requiresCompletion:true});}
 for(const skill of ['fishing','bugcatching','digging','foraging']){const resource=Object.entries(NEW_RESOURCES).find(([,d])=>d.skill===skill)[0],id=skill+'-pouch';add(id,SKILLS[skill]+' Satchel','rare','▣');CAPACITY_BAGS[id]={name:ITEMS[id].name,type:skill,bonus:75};RECIPES.push({id,name:ITEMS[id].name,skill:'smithing',station:'anvil',output:id,count:1,cost:{[resource]:60,'binding-resin':6,'cobalt-bar':3},requiresCompletion:true});}
}
