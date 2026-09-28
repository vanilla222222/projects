'use strict';

const SKILL_TREE_STARROOM_NODES = [
  { id:'unlock_starroom_1', parent:'unlock_hub', cost:1,
    name:'Stargazer\'s Charm',
    desc:'Raises the odds of a star room appearing on each floor by 25%.',
    effect:null },
  { id:'unlock_starroom_2', parent:'unlock_starroom_1', cost:1,
    name:'Wishing Star',
    desc:'Raises the odds of a star room appearing on each floor by another 25%.',
    effect:null },
  { id:'unlock_starroom_3', parent:'unlock_starroom_2', cost:1,
    name:'Celestial Beacon',
    desc:'Raises the odds of a star room appearing on each floor by another 25%.',
    effect:null },
];

for (const n of SKILL_TREE_STARROOM_NODES) {
  SKILL_TREE_NODES.push(n);
  SKILL_TREE_NODES_BY_ID[n.id] = n;
}
