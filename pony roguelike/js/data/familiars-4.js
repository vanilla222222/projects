'use strict';

Object.assign(FAMILIAR_TYPES, {
  housefly: { id:'housefly', name:'Housefly', icon:'🪰', color:'#8a8678', behavior:'orbiter',
    dmg:1, radius:38, orbitSpeed:3.4, contactCooldown:0.5,
    desc:'A plain, tireless housefly. Circles close and stings anything it touches.' },
  bloatfly: { id:'bloatfly', name:'Bloatfly', icon:'🪰', color:'#8fe030', behavior:'shooter',
    dmg:1, cooldown:1.3, boltSpeed:250,
    desc:'A bloated, buzzing fly that keeps its distance and spits at whatever gets close to you.' },
  gorefly: { id:'gorefly', name:'Gorefly', icon:'🪰', color:'#c9382e', behavior:'orbiter',
    dmg:1, radius:46, orbitSpeed:2.6, contactCooldown:0.4,
    desc:'A heavier, slower-circling fly that hits a little harder for it.' },

  snowwisp: { id:'snowwisp', name:'Snow Wisp', icon:'❄️', color:'#9ac9e0', behavior:'wisp', hp:2,
    dmg:1, radius:34, orbitSpeed:2.2, contactCooldown:0.5,
    wispShotCooldown:1.4, wispShotDmg:1, boltSpeed:250,
    desc:'A small mote of frozen light that circles you closely, stinging on contact, and fires a bolt in each of the four cardinal directions every couple of seconds. Two hits and it winks out.' },

  waspswarm: { id:'waspswarm', name:'Wasp Swarm', icon:'🐝', color:'#e0c23a', locked:true, behavior:'orbiter',
    dmg:2, radius:42, orbitSpeed:4.2, contactCooldown:0.4,
    desc:'A tight, furious knot of wasps circling faster than any single fly manages alone.' },
  fruitfly: { id:'fruitfly', name:'Fruit Fly', icon:'🪰', color:'#e0895a', locked:true, behavior:'shooter',
    dmg:1, cooldown:1.0, boltSpeed:280,
    desc:'Small, quick, and everywhere at once — fires more often than any of its cousins.' },
  blackfly: { id:'blackfly', name:'Black Fly', icon:'🪰', color:'#2c2c2c', locked:true, behavior:'orbiter',
    dmg:3, radius:50, orbitSpeed:2.0, contactCooldown:0.6,
    desc:'A slow, biting fly that leaves a real welt — the hardest single hit of the fly family.' },
  midgecloud: { id:'midgecloud', name:'Midge Cloud', icon:'🦟', color:'#8ac95a', locked:true, behavior:'swarmer',
    dmg:1, interval:5.5, orbCount:4, orbLife:4.5, orbRadius:30, orbSpeed:4.4,
    desc:'A haze of midges that periodically scatters into a short-lived stinging cloud around you.' },
});

const CHUD_FLY_FAMILIAR_IDS = ['housefly', 'bloatfly', 'gorefly', 'waspswarm', 'fruitfly', 'blackfly', 'midgecloud'];
function pickChudFlyFamiliar(){
  const candidates = CHUD_FLY_FAMILIAR_IDS.map(id => FAMILIAR_TYPES[id]).filter(f => f && (!f.locked || isFamiliarUnlocked(f.id)));
  return candidates.length ? Util.choice(candidates) : null;
}
