import {VOID_NPCS} from './void-content.mjs';
export const COMPLETION_ITEMS={1:'world-one-completion',2:'tide-completion-token',3:'astral-completion-token',4:'hollow-completion-token'};
export const SIDE_NPCS={
 forester:{name:'Scout Rowan',area:'forest',zone:1,world:1,material:'oak',count:12,work:'Mark a safe trail through the forest.'},
 prospector:{name:'Prospector Flintlock',area:'caves',zone:0,world:1,material:'copper',count:12,work:'Shore up the mine entrance before the next shift.'},
 fisher:{name:'Netmender Nessa',area:'tide-shore',zone:0,world:2,material:'reed-fish',count:12,work:'Stock the coast’s rescue boats.'},
 fenwarden:{name:'Fenwarden Ash',area:'tide-marsh',zone:0,world:2,material:'glowbug',count:12,work:'Light the lantern posts without disturbing the nests.'},
 excavator:{name:'Surveyor Dell',area:'tide-dunes',zone:0,world:2,material:'clay',count:14,work:'Patch the trail signs above the dig.'},
 gardener:{name:'Bramblekeeper Ren',area:'tide-bramble',zone:0,world:2,material:'tideberry',count:14,work:'Replant berry bushes along the trail.'},
 lookout:{name:'Lookout Kael',area:'tide-cliffs',zone:1,world:2,material:'driftwood',count:12,work:'Brace the wind ropes with driftwood.'},
 orchardist:{name:'Orchardist Iri',area:'orbit-garden',zone:1,world:3,material:'moonfruit',count:12,work:'Replenish the hydroponics seed stock.'},
 tracker:{name:'Tracker Orin',area:'orbit-wilds',zone:0,world:3,material:'orbit-fossil',count:12,work:'Recover fossils for the habitat archive.'},
 tailor:{name:'Tailor Nyx',area:'orbit-silk',zone:0,world:3,material:'void-moth',count:10,work:'Restock the emergency suit repair kits.'},
 icewarden:{name:'Icewarden Tala',area:'orbit-comets',zone:1,world:3,material:'starbrew',count:6,work:'Bring provisions to the comet salvage crew.'},
 technician:{name:'Technician Lux',area:'orbit-relay',zone:1,world:3,material:'nebula-cloth',count:6,work:'Replace the relay’s burned insulation.'}
};
for(const d of Object.values(SIDE_NPCS))Object.assign(d,{x:400,y:644,color:d.world===1?'#779865':d.world===2?'#568c96':'#a18ec3',role:'Field expedition contact'});
export const SIDE_QUESTS=Object.entries(SIDE_NPCS).map(([giver,d])=>({
 id:'field-'+giver,world:d.world,name:d.name+'’s Fieldwork',giver,requires:[],deliver:{[d.material]:d.count},
 text:d.work,hint:'Bring the requested supplies to '+d.name+'. This field quest earns a world token.',
 reward:{coins:d.world*220,items:{[d.world===1?'bread':d.world===2?'feast':'starbrew']:4}}
}));
export const WORLD_GIVERS={
 1:['steward','warrior','mage','blacksmith','enchanter','alchemist'],
 2:['captain','naturalist','archivist'],
 3:['habitat','quartermaster','navigator'],
 4:Object.keys(VOID_NPCS)
};
for(const [id,d] of Object.entries(SIDE_NPCS))WORLD_GIVERS[d.world].push(id);
export const STAR_BOOKS={
 'just-exp':{name:'Just Exp',effect:'characterXP',amount:.004,world:1,enemy:'forest-2'},
 'tick-tock':{name:'Tick Tock',effect:'afk',amount:.004,world:1,quest:'field-prospector'},
 'ancient-multitool':{name:'Ancient Multitool',effect:'gathering',amount:.008,world:2,enemy:'tide-marsh-2'},
 'tiptoe-quickness':{name:'Tiptoe Quickness',effect:'speed',amount:.006,world:2,quest:'field-lookout'},
 'overaccurate-crit':{name:'Overaccurate Crit',effect:'crit',amount:.003,world:3,enemy:'orbit-relay-3'},
 'ubercharged-health':{name:'Ubercharged Health',effect:'health',amount:.007,world:3,quest:'field-technician'},
 'trail-rhythm':{name:'Trail Rhythm',effect:'haste',amount:.004,world:1,enemy:'forest-4'},
 'scrappers-instinct':{name:'Scrapper’s Instinct',effect:'coins',amount:.005,world:1,quest:'field-forester'},
 'rootward-practice':{name:'Rootward Practice',effect:'health',amount:.004,world:1,enemy:'boss'},
 'undertow-focus':{name:'Undertow Focus',effect:'accuracy',amount:.004,world:2,enemy:'tide-shore-4'},
 'field-notebook':{name:'Field Notebook',effect:'skillXP',amount:.006,world:2,quest:'field-excavator'},
 'tempest-resolve':{name:'Tempest Resolve',effect:'skill',amount:.006,world:2,enemy:'tempest'},
 'comet-recovery':{name:'Comet Recovery',effect:'killHeal',amount:.001,world:3,enemy:'orbit-comets-5'},
 'zero-g-discipline':{name:'Zero-G Discipline',effect:'combatAFK',amount:.004,world:3,quest:'field-icewarden'},
 'eventide-echo':{name:'Eventide Echo',effect:'attack',amount:.004,world:3,enemy:'singularity'},
 'anchor-discipline':{name:'Anchor Discipline',effect:'defense',amount:.3,world:4,enemy:'void-quarry-5'},
 'echo-practice':{name:'Echo Practice',effect:'skill',amount:.006,world:4,quest:'hollow-echo'},
 'still-point':{name:'Still Point',effect:'characterXP',amount:.006,world:4,enemy:'unmoored'}
};
export const PRODUCTION_REWARDS=[
 ['rivets','Iron Rivets',1,7,95,'iron','caves-2','defense',4],
 ['storm-fasteners','Storm Fasteners',2,11,135,'saltwillow','tide-hunt-3','accuracy',18],
 ['orbital-filament','Orbital Filament',3,16,185,'starwood','orbit-rim-2','attack',24]
];
export const WORLD_SKILL_STATUES=[
 ['smithing','enchanting','alchemy'],['fishing','bugcatching','digging','foraging','hunting'],['beastkeeping','cultivation','weaving','fermentation','cartography']
];
export const WORLD_EXTRA_STATUES=[
 ['accuracy','crit','coins'],['health','defense','afk'],['attack','speed','carry']
];
export const EXTRA_SKILL_TOOLS={
 smithing:'smithing-hammer',enchanting:'etching-focus',alchemy:'brew-kit',hunting:'tracking-kit',
 beastkeeping:'habitat-kit',cultivation:'cultivator',weaving:'shuttle',fermentation:'brew-vessel',cartography:'survey-kit'
};
export const EXTRA_TOOL_LABELS={
 'smithing-hammer':'Smithing Hammer','etching-focus':'Etching Focus','brew-kit':'Alchemy Kit','tracking-kit':'Tracking Kit',
 'habitat-kit':'Habitat Kit',cultivator:'Cultivator',shuttle:'Loom Shuttle','brew-vessel':'Fermentation Vessel','survey-kit':'Survey Kit'
};

export function worldSkillBonus(c,skill,equipment){
 const key='skill-'+skill;
 return (c.accountBonuses?.worldXP||0)+(c.accountBonuses?.[key]||0)+
  Object.values(c.loadout||{}).reduce((sum,g)=>sum+(equipment[g.base]?.stats[key]||0),0);
}

// Reward sources span early routes, field quests, and each world's finale.
export const EXTRA_STAMPS=[
 ['trail', 'Trail Stamp','Misc','speed',.003,'birch','forest-3'],
 ['steady-hand','Steady Hand Stamp','Combat','accuracy',.004,'iron',null,'field-prospector'],
 ['kiln','Kiln Stamp','Skills','skill-smithing',.01,'charcoal','caves-2'],
 ['rootwarden','Rootwarden Stamp','Combat','health',.005,'vine-fiber','boss'],
 ['cast','Long Cast Stamp','Skills','skill-fishing',.01,'reed-fish',null,'field-fisher'],
 ['lantern-net','Lantern Net Stamp','Skills','skill-bugcatching',.01,'glowbug','tide-marsh-3'],
 ['relic','Relic Stamp','Skills','skill-digging',.01,'clay',null,'field-excavator'],
 ['tempest','Tempest Stamp','Combat','skill',.004,'storm-eel','tempest'],
 ['hydroponic','Hydroponic Stamp','Skills','skill-cultivation',.01,'moonfruit',null,'field-orchardist'],
 ['pressure-seal','Pressure Seal Stamp','Skills','skill-weaving',.01,'nebula-cloth','orbit-silk-5'],
 ['star-chart','Star Chart Stamp','Skills','skill-cartography',.01,'orbit-fossil',null,'field-technician'],
 ['eventide','Eventide Stamp','Combat','attack',.003,'voidglass-ore','singularity']
];
export const EXTRA_STATUES=[
 ['oakrunner','Oakrunner Statue','speed',.004,'forest-1',null],
 ['cave-watch','Cave Watch Statue','accuracy',.005,'caves-1',null],
 ['greenreach-harvest','Greenreach Harvest Statue','skill-logging',.012,'forest-4','field-forester'],
 ['berrywarden','Berrywarden Statue','skill-foraging',.012,'tide-bramble-3','field-gardener'],
 ['coast-runner','Coast Runner Statue','speed',.004,'tide-shore-3',null],
 ['storm-hunter','Storm Hunter Statue','skill-hunting',.012,'tide-hunt-4',null],
 ['starlamb','Starlamb Statue','skill-beastkeeping',.012,'orbit-wilds-4','field-tracker'],
 ['brewkeeper','Brewkeeper Statue','skill-fermentation',.012,'orbit-comets-4','field-icewarden'],
 ['orbit-warden','Orbit Warden Statue','health',.006,'orbit-rim-4',null]
];
