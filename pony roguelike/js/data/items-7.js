'use strict';

Object.assign(ITEMS, {
  flyjar: { id:'flyjar', type:'passive', quality:1, name:'Fly Jar', icon:'🫙', color:'#4a7fd6', pools:POOLS_ALL,
    attackLayer:{style:'impactBurst', itemId:'flyjar', radius:40, power:0.15},
    desc:'2% chance per kill to hatch a Friendly Blue Fly familiar. Stacks — 2 Fly Jars is 4%, and so on. Hits burst with a small gust of wings.' },
  honeycomb: { id:'honeycomb', type:'passive', quality:1, name:'Honeycomb', icon:'🍯', color:'#e0c23a', pools:POOLS_ALL,
    desc:'2% chance per kill to hatch a Friendly Yellow Fly familiar. Stacks — 2 Honeycombs is 4%, and so on.' },
  rottingcarcass: { id:'rottingcarcass', type:'passive', quality:2, name:'Rotting Carcass', icon:'🦴', color:'#8a9a5a', pools:POOLS_ALL,
    desc:'25% chance to hatch a random Friendly Fly familiar whenever you clear a room.' },
  swarmcanister: { id:'swarmcanister', type:'active', quality:2, name:'Swarm Canister', icon:'🧴', color:'#e0c23a', maxCharge:5, pools:POOLS_ALL,
    desc:'Crack it open to release one Friendly Blue Fly and one Friendly Yellow Fly, permanently.' },
  waspwhistle: { id:'waspwhistle', type:'active', quality:2, name:'Wasp Whistle', icon:'📯', color:'#c9a83a', maxCharge:4, pools:POOLS_ALL,
    desc:'Every friendly fly you own hits twice as hard for 10 seconds.' },
  trashcompactor: { id:'trashcompactor', type:'active', quality:3, name:'Trash Compactor', icon:'🗑️', color:'#8a8272', maxCharge:6, pools:POOLS_ALL,
    desc:'Crush every friendly fly you own into a single blast around you — more flies, bigger blast.' },
});
