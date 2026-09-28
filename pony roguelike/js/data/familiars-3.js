'use strict';

Object.assign(FAMILIAR_TYPES, {
  friendlybluefly: { id:'friendlybluefly', name:'Friendly Blue Fly', icon:'🪰', color:'#4a7fd6', behavior:'orbiter',
    trashBagOnly:true, dmg:1, radius:40, orbitSpeed:3.0, contactCooldown:0.5,
    desc:'A tame blue fly that circles you closely, stinging anything it grazes. Only ever found in a Trash Bag.' },
  friendlyyellowfly: { id:'friendlyyellowfly', name:'Friendly Yellow Fly', icon:'🪰', color:'#e0c23a', behavior:'shooter',
    trashBagOnly:true, dmg:1, cooldown:1.4, boltSpeed:260,
    desc:'A tame yellow fly that hovers nearby and fires at the nearest threat. Only ever found in a Trash Bag.' },
  flyhive: { id:'flyhive', name:'Fly Hive', icon:'🐝', color:'#c9a83a', behavior:'swarmer',
    dmg:1, interval:5, orbCount:3, orbLife:4, orbRadius:28, orbSpeed:5,
    desc:'A papery little nest that periodically bursts, releasing a short-lived cloud of stinging flies around you.' },
  maggotnest: { id:'maggotnest', name:'Maggot Nest', icon:'🪱', color:'#8ac95a', behavior:'swarmer',
    dmg:2, interval:7.5, orbCount:2, orbLife:5.5, orbRadius:34, orbSpeed:3.4,
    desc:'Slower and fewer than a Fly Hive, but each one that hatches hits noticeably harder.' },
});
