import {EXPANSION_AREAS} from './expansion-content.mjs?v=45';
// Every room owns a visual identity and a separate ascent. Coordinates extend
// existing shelves so saved positions, service locations and old drops remain valid.
export const ROOM_DESIGNS={
 'forest-0':{mood:'Morning oak glade',sky:['#82cbd8','#e6efb9'],rock:'#65845d',trim:'#c5dd79',motif:'oak',weather:'seeds',shelves:[[1260,640,180],[1560,700,-30]],exit:false},
 'forest-1':{mood:'Briar watchtower',sky:['#9c9bba','#d4b6a0'],rock:'#735c66',trim:'#b6a079',motif:'watchtower',weather:'leaves',shelves:[[700,850,130],[1200,850,-75],[1550,900,-290]],exit:true},
 'forest-2':{mood:'Birchwater gorge',sky:['#b8d8df','#dbe6ce'],rock:'#748f8b',trim:'#d7e4c4',motif:'birchwater',weather:'mist',shelves:[[1700,650,90],[1250,800,-100],[1700,850,-320],[2050,550,-535]],exit:true},
 'forest-3':{mood:'Twilight lantern walk',sky:['#202f60','#826c91'],rock:'#6a6681',trim:'#bcab8a',motif:'lanterns',weather:'fireflies',shelves:[[650,900,110],[1250,800,-100],[1800,850,-310],[2200,700,-520]],exit:true},
 'forest-4':{mood:'Cathedral of roots',sky:['#527768','#9da47b'],rock:'#625b3f',trim:'#a9b67e',motif:'roots',weather:'seeds',shelves:[[2000,900,60],[1650,900,-160],[2050,850,-380],[2500,750,-600],[2700,650,-820]],exit:true},
 'caves-0':{mood:'Copper quarry terraces',sky:['#253944','#745849'],rock:'#775548',trim:'#d49a68',motif:'quarry',weather:'dust',shelves:[[1200,850,120],[1650,700,-100],[1250,850,-320]],exit:true},
 'caves-1':{mood:'Abandoned mine shaft',sky:['#1a2434','#5b514b'],rock:'#545667',trim:'#ab9271',motif:'mine',weather:'dust',shelves:[[1400,850,100],[950,850,-110],[1350,850,-330],[1800,750,-550],[1450,850,-770]],exit:true},
 'caves-2':{mood:'Amethyst resonance vault',sky:['#251e43','#5e5879'],rock:'#665b85',trim:'#b5a2d2',motif:'crystal',weather:'sparks',shelves:[[1100,950,90],[1650,850,-140],[2050,800,-370],[1600,1000,-600]],exit:true},
 'deep-0':{mood:'Iron cathedral',sky:['#172d38','#5b7181'],rock:'#526776',trim:'#a0b4ba',motif:'cathedral',weather:'dust',shelves:[[1200,900,100],[1700,850,-130],[1250,950,-360],[1700,800,-590]],exit:true},
 'deep-1':{mood:'Suspended foundry works',sky:['#242130','#65565c'],rock:'#675866',trim:'#c99a6d',motif:'chains',weather:'embers',shelves:[[1600,950,80],[1150,1000,-160],[1750,850,-400],[2200,800,-640],[1700,1000,-880]],exit:true},
 'deep-2':{mood:'Gold-lit underground reservoir',sky:['#163e48','#6e8265'],rock:'#637e7a',trim:'#dfc16b',motif:'reservoir',weather:'mist',shelves:[[1500,950,70],[2000,850,-160],[1450,1000,-390],[2000,850,-620]],exit:true},
 'deep-3':{mood:'The sealed clockwork engine',sky:['#252c40','#6d6555'],rock:'#626773',trim:'#c3ae74',motif:'engine',weather:'sparks',shelves:[[1900,1000,70],[1400,1000,-170],[2000,1000,-410],[2600,850,-650],[2100,1100,-890]],exit:true},
 'jungle-0':{mood:'High canopy ropeways',sky:['#438b8c','#c4d7a1'],rock:'#5b7148',trim:'#b8bf6b',motif:'ropeways',weather:'leaves',shelves:[[1600,950,90],[2100,800,-140],[1650,950,-370],[2050,850,-600]],exit:true},
 'jungle-1':{mood:'Monsoon waterfall basin',sky:['#325e75','#91b8b4'],rock:'#557e7b',trim:'#a8c9ab',motif:'waterfall',weather:'rain',shelves:[[1400,1000,60],[2000,950,-180],[1500,1000,-420],[2100,900,-660],[2500,750,-900]],exit:true},
 'jungle-2':{mood:'Sunstone terrace ruins',sky:['#b18b60','#ecdc91'],rock:'#938367',trim:'#e4cb7b',motif:'ziggurat',weather:'seeds',shelves:[[1400,1000,60],[2000,850,-180],[1500,1000,-420],[2100,900,-660]],exit:true},
 'jungle-3':{mood:'Hanging orchid gardens',sky:['#654c7e','#bcb79a'],rock:'#746084',trim:'#d6a7c0',motif:'orchids',weather:'petals',shelves:[[1600,1000,70],[2100,900,-160],[1600,1000,-390],[2150,850,-620],[2600,800,-850]],exit:true},
 'town-0':{mood:'Hearthstead mill and rooftops',sky:['#98c8dd','#ecd8a9'],rock:'#9b7c59',trim:'#e0bf80',motif:'windmill',weather:'seeds',shelves:[[650,1000,100],[1200,800,-120]],exit:false},
 'town-1':{mood:'Hammer Street smith balconies',sky:['#6f9fae','#cbb395'],rock:'#80604c',trim:'#c69b64',motif:'workshop',weather:'embers',shelves:[[550,1000,100],[1050,850,-130],[650,1000,-360]],exit:false},
 'town-2':{mood:'Furnace Yard chimney climb',sky:['#6f6877','#bf9d80'],rock:'#785a52',trim:'#c7a080',motif:'kilns',weather:'smoke',shelves:[[900,1000,80],[1400,850,-150],[950,1000,-380],[1450,800,-610]],exit:false},
 'town-3':{mood:'Legacy Square bell towers',sky:['#739baa','#ded5ab'],rock:'#82918d',trim:'#d6c395',motif:'plaza',weather:'flags',shelves:[[850,1000,100],[1450,1000,-130],[1950,850,-360]],exit:false},
 'jungle-town-0':{mood:'Canopy Market stilt houses',sky:['#569588','#d1d6a0'],rock:'#657e55',trim:'#c5b873',motif:'stiltmarket',weather:'leaves',shelves:[[1000,1000,70],[1600,900,-170],[1150,1000,-410]],exit:false},
 'jungle-town-1':{mood:'Terraced alchemist greenhouse',sky:['#648d9d','#c9dab8'],rock:'#677f70',trim:'#c4d9a5',motif:'greenhouse',weather:'pollen',shelves:[[750,1000,70],[1300,950,-170],[850,1000,-410],[1350,850,-650]],exit:false},
 'jungle-town-2':{mood:'Rootbound gate spires',sky:['#4c475d','#a6ac8a'],rock:'#675b61',trim:'#b3bd83',motif:'gate',weather:'sparks',shelves:[[900,1000,70],[1500,950,-170],[1050,1000,-410]],exit:false},
 'tree-0':{mood:'Rootspire mushroom stairs',sky:['#527f7d','#acc699'],rock:'#6b5c40',trim:'#b8c77c',motif:'fungus',weather:'pollen',shelves:[],exit:false},
 'tree-1':{mood:'Amber hollow heartwood',sky:['#5c526a','#c49c6d'],rock:'#785338',trim:'#e5b66d',motif:'amber',weather:'fireflies',shelves:[],exit:false},
 'tree-2':{mood:'Moonlit crown observatory',sky:['#14284e','#668f97'],rock:'#606b65',trim:'#b6d4c7',motif:'observatory',weather:'stars',shelves:[],exit:false},
 sunwell:{mood:'Sunwell hanging sanctuary',sky:['#5b8585','#dce2ad'],rock:'#8a9c7a',trim:'#efdda0',motif:'sunwell',weather:'pollen',shelves:[[650,950,80],[1000,850,-160],[650,950,-400]],exit:false},
 vault:{mood:'Forgotten maker mechanism',sky:['#242c42','#6d717b'],rock:'#63697e',trim:'#c8b276',motif:'clockvault',weather:'sparks',shelves:[[800,1000,70],[1300,900,-170],[850,1000,-410],[1400,850,-650]],exit:false},
 boss:{mood:'Heart of the broken crown',sky:['#291d3b','#785368'],rock:'#675362',trim:'#c09678',motif:'rootcrown',weather:'embers',shelves:[[850,1000,70],[1450,1000,-170],[2000,950,-410]],exit:false}
};

for(const [aIndex,a]of EXPANSION_AREAS.entries())for(let i=0;i<a.zones.length;i++)ROOM_DESIGNS[a.id+'-'+i]={mood:a.zones[i],sky:['#'+[1,3,5].map((k,j)=>Math.max(0,Math.min(255,parseInt(a.sky[0].slice(k,k+2),16)-i*(3+j)+(a.world===3?aIndex:0))).toString(16).padStart(2,'0')).join(''),a.sky[1]],rock:['#718e91','#706f8d','#93785c','#67805a'][aIndex%4],trim:['#c4e2cb','#e5bb8e','#bdd1ed'][i%3],motif:a.motif+':'+a.id+'-'+i,weather:a.world===3?'stars':['mist','seeds','sparks','leaves'][i%4],shelves:[],exit:!a.town};

ROOM_DESIGNS.tempest={mood:'Stormglass amphitheatre',sky:['#263d67','#a0bfc3'],rock:'#526d83',trim:'#8dd9d6',motif:'cathedral:tempest',weather:'rain',shelves:[[400,900,100],[1100,800,-130]],exit:false};

for(const id of ['chart-green','chart-tide','chart-orbit','singularity'])ROOM_DESIGNS[id]={mood:id+' · Forgotten star charts',sky:[{ 'chart-green':'#151834','chart-tide':'#102a42','chart-orbit':'#24153f',singularity:'#180f27'}[id],'#554381'],rock:'#4c5379',trim:'#ad90ef',motif:'orbit:'+id,weather:'stars',shelves:[],exit:false};
