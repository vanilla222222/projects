const region=(id,name,entry,rooms,town=false,world=4)=>({
 id:'void-'+id,name,entry,zones:rooms.split('|'),town,world,theme:'deep',
 sky:world===4?['#17132e','#493659']:['#253545',['#657278','#5b7785','#796c98'][world-1]],motif:'void'
});
export const VOID_AREAS=[
 region('landing','Anchorhold',['orbit-chart',3],'The Last Dock|Survey Hall|Bridge Yard|Riftworks|Anchor Market|The Outer Rail',true),
 region('fragments','The Shattered Reach',['void-landing',5],'First Shard|Split Span|Rubble Drift|Wreck Stair|Hanging Causeway|The Far Anchor'),
 region('grove','The Inverted Grove',['void-fragments',2],'Rootless Gate|Twilight Boughs|Upturned Soil|Mirrorfruit Orchard|The Canopy Below|Midnight Crown'),
 region('quarry','The Silent Quarry',['void-fragments',5],'Slackline|Cracked Hoist|Pale Seam|Hollow Gantry|The Lift House|Lower Anchor'),
 region('lantern','Lamplight Refuge',['void-quarry',5],'Lantern Dock|Lamplighter’s Post|Echo Workshop|Reliquary|Foundry Deck|Watch Rail',true),
 region('hollows','The Unlit Hollows',['void-lantern',5],'Darkwater Shelf|Lantern Run|The Blind Turn|Ash Gallery|Lost Signal|The Black Arch'),
 region('drift','The Echo Drift',['void-hollows',2],'Whisper Gate|Resonance Step|Pale Orchestra|Shivering Walk|Quiet Well|Echo Vault'),
 region('relics','The Broken Archive',['void-hollows',5],'Tablet Shore|Stair of Names|Memory Bank|Collapsed Stacks|The Index|Final Shelf'),
 region('crown','Last Meridian',['void-relics',5],'Meridian Dock|The Last Chart|Refuge Market|Anchor Chamber|Starlit Balcony|The Severed Gate',true),
 region('rim','The Falling Rim',['void-crown',5],'The First Fall|Violet Traverse|Frayed Edge|False Horizon|Gravity Steps|Last Stable Rock'),
 region('wound','The Rift Wound',['void-rim',1],'Tear’s Edge|Shiverbridge|Unwritten Mile|Rift Orchard|Hollow Crown|The Deep Wound'),
 region('end','The Far Silence',['void-rim',5],'Quiet Entry|Endless Stair|Gravelight|Edge of Speech|Final Anchorage|Still Point')
];
export const RETRO_AREAS=[
 region('watch','The Forgotten Watch',['forest',4],'Ravine Landing|Abandoned Watchtower',false,1),
 region('reef','The Cutaway Reef',['tide-shore',4],'Reef Catwalk|The Wreck Below',false,2),
 region('vault','The Sealed Observatory Wing',['orbit-chart',2],'Maintenance Catwalk|The Sealed Orrery',false,3)
];
const names=[
 ['Shard Skulk','Span Stalker','Wreckmite','Fracture Wisp','Causeway Guard','Anchor Eater'],
 ['Rootless Hare','Twilight Moth','Inverted Crawler','Glass Grazer','Hanging Stag','Crown Warden'],
 ['Slackline Spider','Hoist Shade','Seam Golem','Gantry Wraith','Lift Sentinel','Quarry Titan'],
 ['Darkwater Wisp','Lamp Thief','Blind Crawler','Ash Guardian','Signal Hunter','Arch Revenant'],
 ['Whisper Bat','Resonant Shade','Chime Moth','Drifting Guard','Quiet Golem','Echo Keeper'],
 ['Tablet Mite','Name Thief','Memory Weaver','Stack Mimic','Index Watcher','Archive Knight'],
 ['Falling Wisp','Violet Stalker','Edge Gnawer','Horizon Mimic','Gravity Hound','Rim Sentinel'],
 ['Rift Skipper','Shiver Shade','Unwritten Moth','Rift Grazer','Hollow Knight','Wound Keeper'],
 ['Silent Bat','Stair Wraith','Gravelight Golem','Mute Hunter','Anchor Shade','Still Point Guardian']
];
const habitat=[['void-silt','riftwood'],['riftwood','gloamfruit','rift-moth'],['void-silt','rift-moth'],['gloamfruit','rift-moth'],['rift-moth','void-silt'],['void-silt','riftwood'],['riftwood','gloamfruit'],['rift-moth','gloamfruit'],['void-silt','riftwood']];
let combat=0;
for(const a of VOID_AREAS){
 if(!a.town){a.names=names[combat];a.resources=a.zones.map((_,i)=>[habitat[combat][i%habitat[combat].length]]);combat++;}
 else a.resources=a.zones.map(()=>[]);
}
for(const [i,a] of RETRO_AREAS.entries()){
 a.motif=['watchtower','reservoir','observatory'][i];
 a.names=[['Ravine Mite','Watchtower Sentinel'],['Reef Wisp','Wreck Guardian'],['Survey Drone','Orrery Keeper']][i];
 a.resources=a.zones.map(()=>[[ 'birch','silverfin','starwood'][i]]);
}
export const VOID_RESOURCES={
 'void-silt':{name:'Void Silt',skill:'digging',level:15,tier:4,threshold:230},
 riftwood:{name:'Riftwood',skill:'logging',level:15,tier:6,threshold:250},
 gloamfruit:{name:'Gloamfruit',skill:'foraging',level:14,tier:4,threshold:220},
 'rift-moth':{name:'Rift Moth',skill:'bugcatching',level:14,tier:4,threshold:220},
 'null-ore':{name:'Null Ore',skill:'mining',level:16,tier:6,threshold:285},
 'umbra-ore':{name:'Umbral Ore',skill:'mining',level:19,tier:6,threshold:320},
 'rift-carp':{name:'Rift Carp',skill:'fishing',level:13,tier:4,threshold:210},
 'shade-ray':{name:'Shade Ray',skill:'fishing',level:16,tier:5,threshold:260}
};
export const VOID_SKILLS={construction:'Construction',riftkeeping:'Rift Tending',echobinding:'Echo Binding',lightkeeping:'Lightkeeping',restoration:'Relic Restoration'};
export const VOID_PROJECTS={
 'void-quarry':{name:'Far Anchor Bridge',cost:{'void-fragments-hide':8,plank:8},xp:72},
 'void-hollows':{name:'Lamplight Span',cost:{'void-quarry-hide':8,'binding-resin':5},xp:84},
 'void-rim':{name:'Meridian Crossing',cost:{'void-relics-hide':8,'tempered-bar':4},xp:96},
 'void-watch':{name:'Greenreach Ravine Bridge',reward:'The Watchtower Sentinel drops the Ravine Hewing Axe blueprint.',cost:{birch:12,'void-fragments-hide':5},xp:72},
 'void-reef':{name:'Cutaway Reef Catwalk',reward:'Fish for Wrecklight Koi below the wreck to make healing chowder.',cost:{saltwillow:12,'void-fragments-hide':5},xp:72},
 'void-vault':{name:'Orrery Maintenance Bridge',reward:'Defeat the Orrery Keeper and complete The Clockwork Orbit to recover a museum relic.',cost:{starwood:8,'void-quarry-hide':5},xp:84}
};
export const VOID_WORK={
 riftkeeping:{area:'void-landing',zone:3,output:'rift-shard',cost:{'void-fragments-hide':4},name:'Stabilize a rift'},
 echobinding:{area:'void-lantern',zone:2,output:'bound-echo',cost:{'void-hollows-hide':4},name:'Bind a combat echo'},
 lightkeeping:{area:'void-lantern',zone:1,output:'void-lantern',cost:{'rift-shard':1,'void-quarry-hide':2},name:'Kindle a Void lantern'},
 restoration:{area:'void-lantern',zone:3,output:'restored-relic',cost:{'void-relics-hide':4,'rift-shard':1,fossil:2,dust:2},name:'Restore a broken relic'}
};
export const VOID_CLASSES={
 warrior:{id:'bridgewright',name:'Bridgewright',skill:'construction'},
 mage:{id:'riftkeeper',name:'Riftkeeper',skill:'riftkeeping'},
 blacksmith:{id:'relicwright',name:'Relicwright',skill:'restoration'},
 enchanter:{id:'echobinder',name:'Echobinder',skill:'echobinding'},
 alchemist:{id:'lamplighter',name:'Lamplighter',skill:'lightkeeping'}
};
export const VOID_NPCS={
 anchor:{name:'Anchor Keeper Rook',area:'void-landing',zone:0,work:'Bring spare plating to secure the landing dock.',deliver:{'void-fragments-hide':4}},
 bridge:{name:'Builder Nima',area:'void-landing',zone:2,work:'Bring planks to stock the bridge yard.',deliver:{plank:8}},
 rift:{name:'Rift Tender Kes',area:'void-landing',zone:3,work:'Stabilize a rift and bring back a shard.',deliver:{'rift-shard':1}},
 lamp:{name:'Lamplighter Ves',area:'void-lantern',zone:1,work:'Kindle a lantern for the refuge.',deliver:{'void-lantern':1}},
 echo:{name:'Echo Keeper Tarn',area:'void-lantern',zone:2,work:'Bring an echo from the Hollows back to the workshop.',deliver:{'bound-echo':1}},
 relic:{name:'Curator Senn',area:'void-lantern',zone:3,work:'Restore a relic for the new archive.',deliver:{'restored-relic':1}},
 chartkeeper:{name:'Chartkeeper Ilex',area:'void-crown',zone:1,work:'Mark the Still Point at the far end of the Rim.',visits:['void-end-5']},
 sentinel:{name:'Sentinel Mael',area:'void-crown',zone:3,work:'Defeat the Unmoored and recover its anchor.',kills:{unmoored:1},deliver:{'unmoored-anchor':1}}
};
for(const d of Object.values(VOID_NPCS))Object.assign(d,{x:840,y:644,role:'Hollow Between expedition',color:'#9d87bd'});
export const VOID_QUESTS=Object.entries(VOID_NPCS).map(([giver,d])=>({
 id:'hollow-'+giver,world:4,name:d.name+'’s Request',giver,requires:({bridge:['hollow-anchor'],rift:['hollow-bridge'],lamp:['hollow-rift'],echo:['hollow-lamp'],relic:['hollow-echo'],chartkeeper:['hollow-relic'],sentinel:['hollow-chartkeeper']})[giver]||[],text:d.work,hint:'Complete the objective, then return to '+d.name+'.',
 deliver:d.deliver,visits:d.visits,kills:d.kills,reward:{coins:1800,items:giver==='sentinel'?{'unmoored-anchor':1}:{feast:8}}
}));
