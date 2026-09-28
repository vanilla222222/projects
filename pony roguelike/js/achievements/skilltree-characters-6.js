'use strict';

const SKILL_TREE_CHARACTER_CONFIG_6 = [

  { classId:'chudfilly', nodes:{
    a1:{ name:'Overfed Swarm', desc:'The flies eat well. Increases familiar damage by 8%.',
      effects:[{ type:'uniqueField', classId:'chudfilly', field:'familiarDamageMult', amount:0.08, min:0, max:0.4 }] },
    a2a:{ name:'More Buzzing', desc:'Increases familiar damage by a further 7%.',
      effects:[{ type:'uniqueField', classId:'chudfilly', field:'familiarDamageMult', amount:0.07, min:0, max:0.4 }] },
    a3a:{ name:'Feeding Frenzy', desc:'Increases familiar damage by a further 6%.',
      effects:[{ type:'uniqueField', classId:'chudfilly', field:'familiarDamageMult', amount:0.06, min:0, max:0.4 }] },
    a2b:{ name:'Thicker Wings', desc:'Increases familiar damage by a further 7%.',
      effects:[{ type:'uniqueField', classId:'chudfilly', field:'familiarDamageMult', amount:0.07, min:0, max:0.4 }] },
    a3b:{ name:'Stinging Cloud', desc:'Increases familiar damage by a further 6%.',
      effects:[{ type:'uniqueField', classId:'chudfilly', field:'familiarDamageMult', amount:0.06, min:0, max:0.4 }] },
    b1:{ name:'Quick Little Hooves', desc:'She keeps up with her own swarm. Increases speed by 5%.',
      effects:[{ type:'stat', classId:'chudfilly', stat:'speed', amount:0.05 }] },
    b2a:{ name:'Never Falls Behind', desc:'Increases speed by a further 4%.',
      effects:[{ type:'stat', classId:'chudfilly', stat:'speed', amount:0.04 }] },
    b3a:{ name:'Outpaces the Cloud', desc:'Increases speed by a further 3%.',
      effects:[{ type:'stat', classId:'chudfilly', stat:'speed', amount:0.03 }] },
    b2b:{ name:'A Nose for Trouble', desc:'Increases luck by 4%.',
      effects:[{ type:'stat', classId:'chudfilly', stat:'luck', amount:0.04 }] },
    b3b:{ name:'Lucky Little Pest', desc:'Increases luck by a further 3%.',
      effects:[{ type:'stat', classId:'chudfilly', stat:'luck', amount:0.03 }] },
  }},

  { classId:'chadfilly', nodes:{
    a1:{ name:'Hotter Fuse', desc:'Increases bomb damage by 8%.',
      effects:[{ type:'uniqueField', classId:'chadfilly', field:'bombDamageMult', amount:0.08, min:0, max:0.4 }] },
    a2a:{ name:'Denser Powder', desc:'Increases bomb damage by a further 7%.',
      effects:[{ type:'uniqueField', classId:'chadfilly', field:'bombDamageMult', amount:0.07, min:0, max:0.4 }] },
    a3a:{ name:'Overpacked Charge', desc:'Increases bomb damage by a further 6%.',
      effects:[{ type:'uniqueField', classId:'chadfilly', field:'bombDamageMult', amount:0.06, min:0, max:0.4 }] },
    a2b:{ name:'Refined Blastcap', desc:'Increases bomb damage by a further 7%.',
      effects:[{ type:'uniqueField', classId:'chadfilly', field:'bombDamageMult', amount:0.07, min:0, max:0.4 }] },
    a3b:{ name:'Weapons-Grade Satchel', desc:'Increases bomb damage by a further 6%.',
      effects:[{ type:'uniqueField', classId:'chadfilly', field:'bombDamageMult', amount:0.06, min:0, max:0.4 }] },
    b1:{ name:'Wider Fuse Ring', desc:'Increases bomb blast radius by 6%.',
      effects:[{ type:'uniqueField', classId:'chadfilly', field:'bombRadiusMult', amount:0.06, min:0, max:0.3 }] },
    b2a:{ name:'Looser Casing', desc:'Increases bomb blast radius by a further 5%.',
      effects:[{ type:'uniqueField', classId:'chadfilly', field:'bombRadiusMult', amount:0.05, min:0, max:0.3 }] },
    b3a:{ name:'Room-Clearing Charge', desc:'Increases bomb blast radius by a further 4%.',
      effects:[{ type:'uniqueField', classId:'chadfilly', field:'bombRadiusMult', amount:0.04, min:0, max:0.3 }] },
    b2b:{ name:'Scattershot Packing', desc:'Increases bomb blast radius by a further 5%.',
      effects:[{ type:'uniqueField', classId:'chadfilly', field:'bombRadiusMult', amount:0.05, min:0, max:0.3 }] },
    b3b:{ name:'Never Enough Boom', desc:'Increases bomb blast radius by a further 4%.',
      effects:[{ type:'uniqueField', classId:'chadfilly', field:'bombRadiusMult', amount:0.04, min:0, max:0.3 }] },
  }},

  { classId:'snowpitymare', nodes:{
    a1:{ name:'Colder Light', desc:'Increases wisp damage by 8%.',
      effects:[{ type:'uniqueField', classId:'snowpitymare', field:'familiarDamageMult', amount:0.08, min:0, max:0.4 }] },
    a2a:{ name:'Sharper Frost', desc:'Increases wisp damage by a further 7%.',
      effects:[{ type:'uniqueField', classId:'snowpitymare', field:'familiarDamageMult', amount:0.07, min:0, max:0.4 }] },
    a3a:{ name:'Denser Wisp', desc:'The circle holds together better. Wisps have 1 more max HP.',
      effects:[{ type:'uniqueField', classId:'snowpitymare', field:'wispHpBonus', amount:1, min:0, max:2 }] },
    a2b:{ name:'Deeper Chill', desc:'Increases wisp damage by a further 7%.',
      effects:[{ type:'uniqueField', classId:'snowpitymare', field:'familiarDamageMult', amount:0.07, min:0, max:0.4 }] },
    a3b:{ name:'Killing Frost', desc:'Increases wisp damage by a further 6%.',
      effects:[{ type:'uniqueField', classId:'snowpitymare', field:'familiarDamageMult', amount:0.06, min:0, max:0.4 }] },
    b1:{ name:'Gathering Chill', desc:'Wisp Call charges 8% faster.',
      effects:[{ type:'uniqueField', classId:'snowpitymare', field:'pocketChargeRateMult', amount:0.08, min:0, max:0.4 }] },
    b2a:{ name:'Quickening Frost', desc:'Wisp Call charges a further 7% faster.',
      effects:[{ type:'uniqueField', classId:'snowpitymare', field:'pocketChargeRateMult', amount:0.07, min:0, max:0.4 }] },
    b3a:{ name:'Never Quite Still', desc:'Wisp Call charges a further 6% faster.',
      effects:[{ type:'uniqueField', classId:'snowpitymare', field:'pocketChargeRateMult', amount:0.06, min:0, max:0.4 }] },
    b2b:{ name:'Restless Winter', desc:'Wisp Call charges a further 7% faster.',
      effects:[{ type:'uniqueField', classId:'snowpitymare', field:'pocketChargeRateMult', amount:0.07, min:0, max:0.4 }] },
    b3b:{ name:'The Circle Never Waits', desc:'Wisp Call charges a further 6% faster.',
      effects:[{ type:'uniqueField', classId:'snowpitymare', field:'pocketChargeRateMult', amount:0.06, min:0, max:0.4 }] },
  }},
];

const SKILL_TREE_CHARACTER_NODES_6 = [];
(function buildCharacterSkillNodes6(){

  const PARENT_OF = {
    a1:'char_hub_', a2a:'a1', a3a:'a2a', a2b:'a1', a3b:'a2b',
    b1:'char_hub_', b2a:'b1', b3a:'b2a', b2b:'b1', b3b:'b2b',
  };
  const ORDER = ['a1','a2a','a3a','a2b','a3b','b1','b2a','b3a','b2b','b3b'];
  for (const cfg of SKILL_TREE_CHARACTER_CONFIG_6) {
    const classId = cfg.classId;
    for (const key of ORDER) {
      const content = cfg.nodes[key];
      const parentKey = PARENT_OF[key];
      const parentId = parentKey === 'char_hub_' ? 'char_hub_' + classId : 'char_' + classId + '_' + parentKey;
      SKILL_TREE_CHARACTER_NODES_6.push({
        id: 'char_' + classId + '_' + key,
        parent: parentId,
        cost: 1,
        name: content.name,
        desc: content.desc,
        effects: content.effects,
      });
    }
  }
})();

for (const n of SKILL_TREE_CHARACTER_NODES_6) {
  SKILL_TREE_NODES.push(n);
  SKILL_TREE_NODES_BY_ID[n.id] = n;
}
