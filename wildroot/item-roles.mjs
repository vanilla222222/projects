// Shared descriptions are tied to real action handlers in item-economy.mjs.
export const BADGES={
 'world-token-steward':{name:'Hesta’s Hearth',effect:'health',amount:.03,base:'hearth-cloak',gear:'Hearthkeeper Cloak',slot:'cape',stats:{health:16,defense:1},cost:{birch:20,'boar-hide':8}},
 'world-token-warrior':{name:'Brann’s Resolve',effect:'mining',amount:.03,base:'copperheart-pick',gear:'Copperheart Pick',slot:'pick',stats:{mining:.65,attack:2},cost:{'iron-bar':5,'echo-stone':12}},
 'world-token-mage':{name:'Willow’s Patience',effect:'logging',amount:.03,base:'living-birch-axe',gear:'Living Birch Hatchet',slot:'axe',stats:{logging:.65,health:8},cost:{birch:30,'grove-seed':10,'iron-bar':3}},
 'world-token-blacksmith':{name:'Flint’s Precision',effect:'crafting',amount:.03,base:'artisan-hammer',gear:'Artisan’s Hammer',slot:'weapon',class:'blacksmith',stats:{attack:36,crafting:.3,defense:2},cost:{'iron-bar':6,'sentinel-core':5,plank:8}},
 'world-token-enchanter':{name:'Mira’s Clarity',effect:'skillXP',amount:.03,base:'runewoven-focus',gear:'Runewoven Focus',slot:'weapon',class:'enchanter',stats:{attack:34,skill:.38,accuracy:8},cost:{dust:16,'binding-resin':6,'moth-wing':10}},
 'world-token-alchemist':{name:'Fern’s Care',effect:'health',amount:.03,base:'garden-retort',gear:'Garden Retort',slot:'weapon',class:'alchemist',stats:{attack:36,alchemy:.35,skill:.24},cost:{'gold-bar':3,'binding-resin':8,'frog-dew':12}},
 'rootbound-key':{name:'Rootward Oath',effect:'defense',amount:1,base:'rootward-charm',gear:'Rootward Charm',slot:'charm',stats:{defense:2,health:18},cost:{'tempered-bar':3,dust:12,'vine-fiber':15}},
 'world-one-completion':{name:'Greenreach Legacy',effect:'afk',amount:.03,base:'greenreach-crown',gear:'Crown of the Greenreach',slot:'head',stats:{attack:4,defense:4,health:25},cost:{'gold-bar':8,'tempered-bar':4,'grove-seed':15}}
};
export const PROJECTS={
 arsenal:{name:'Village Arsenal',effect:'attack',amount:.003,text:'+0.3% roster damage per level'},
 stores:{name:'Supply Depot',effect:'carry',amount:.005,text:'+0.5% item stack capacity per level'},
 academy:{name:'Field Academy',effect:'skillXP',amount:.004,text:'+0.4% profession XP per level'}
};
export function itemProject(id,gear=false){return gear||id.startsWith('stone-')?'arsenal':/stamp-|statue-|reset-|dust|essence|rune|expansion|legend|rare|pearl|flame|heart|thread/.test(id)?'academy':'stores';}
export function extraItemRoles(id,gear=false){if(BADGES[id])return[{id:'attune',text:'Attune at the Legacy Square vault: permanent roster bonus; token is kept'},{id:'pattern',text:'Present at the Legacy Square vault: learn the '+BADGES[id].gear+' blueprint; token is kept'}];return[{id:'reclaim',text:'Reclaim spare copies at the foundry for salvage; exchange salvage for crafting materials'},{id:'project',text:'Contribute spare copies to the '+PROJECTS[itemProject(id,gear)].name+' at the Legacy Square vault'}];}
