'use strict';

const MINIBOSS_TYPES = {
  mbrustfangprowler: { id:'mbrustfangprowler', name:'The Rustfang Prowler', hp:17, dmg:2, speed:98, radius:17,
    color:'#a8482c', dark:'#4e1e11', behavior:'mbRustfangProwler', xpTier:2,
    desc:'Circles at range, feinting closer, then commits to one long telegraphed lunge before peeling straight back out to range.' },
  mbchainreaver: { id:'mbchainreaver', name:'The Chainbound Reaver', hp:19, dmg:2, speed:66, radius:18,
    color:'#5a5a68', dark:'#26262e', behavior:'mbChainReaver', fireCooldown:2.6, xpTier:2,
    desc:'Keeps its distance and volleys three aimed rounds — but closes into a full charging dash the instant you get near it.' },
  mbcinderduke: { id:'mbcinderduke', name:'Cinderbrand, the Ember Duke', hp:18, dmg:2, speed:60, radius:17,
    color:'#e0662e', dark:'#7a2c10', behavior:'mbCinderDuke', xpTier:2,
    desc:'Walks a slow patrol and drops a smoldering ember behind itself every step — the floor it already crossed is the real threat.' },
  mbstaticchoir: { id:'mbstaticchoir', name:'The Static Choir', hp:16, dmg:2, speed:74, radius:16,
    color:'#8a5ac9', dark:'#3e2668', behavior:'mbStaticChoir', fireCooldown:0.5, xpTier:1,
    desc:'Holds a fixed orbit around you and leaks one crackling bolt per tick off its rotating arm, tracing a slow spiral of shots.' },
  mbmarrowcolossus: { id:'mbmarrowcolossus', name:'The Marrow Colossus', hp:22, dmg:3, speed:38, radius:22,
    color:'#8a8272', dark:'#3e3a30', behavior:'mbMarrowColossus', burstRadius:70, xpTier:2, weight:0.8,
    desc:'A lumbering wall. Every few seconds it winds up and slams, sending a shockwave out and shrapnel flying in every direction.' },
  mbnightglassduelist: { id:'mbnightglassduelist', name:'The Nightglass Duelist', hp:16, dmg:3, speed:80, radius:16,
    color:'#2a2438', dark:'#120e1c', behavior:'mbNightglassDuelist', blinkCooldown:2.4, xpTier:2,
    desc:'Blinks to a point beside you, telegraphs one heavy lunge, then blinks away again before you can answer it.' },
  mbverdantwarden: { id:'mbverdantwarden', name:'The Verdant Warden', hp:20, dmg:2, speed:0, radius:19,
    color:'#3a8a4a', dark:'#194a22', behavior:'mbVerdantWarden', fireCooldown:1.3, xpTier:1, weight:0.8,
    desc:'Rooted. Fires a four-way cross of thorns that rotates a notch each volley, sweeping the whole room over time.' },
  mbriptidehexer: { id:'mbriptidehexer', name:'The Riptide Hexer', hp:17, dmg:2, speed:88, radius:16,
    color:'#3a92c9', dark:'#18415a', behavior:'mbRiptideHexer', fireCooldown:1.9, xpTier:2,
    desc:'Dashes to a fresh spot along the room\'s edge, plants, and fires a wide fanned burst before dashing off to the next one.' },
  mbcinderwingreaper: { id:'mbcinderwingreaper', name:'The Cinderwing Reaper', hp:16, dmg:3, speed:70, radius:16,
    color:'#c9384a', dark:'#5c141e', behavior:'mbCinderwingReaper', flies:true, chargeCooldown:2.2, xpTier:2, weight:0.8,
    desc:'Circles high overhead, then folds its wings into one long diving charge clean across the room before climbing again.' },
  mbhollowsentinel: { id:'mbhollowsentinel', name:'The Hollow Sentinel', hp:18, dmg:2, speed:0, radius:19,
    color:'#8a8a94', dark:'#3e3e46', behavior:'mbHollowSentinel', fireCooldown:0.35, xpTier:1,
    desc:'Rooted and armoured; nothing you throw at it lands. Wait for the plates to open — that\'s the only window it can be hurt in, and the only window it fires back in.' },

  mbashenprowler: { id:'mbashenprowler', name:'The Ashen Prowler', hp:20, dmg:2, speed:88, radius:17,
    color:'#c9622e', dark:'#5c2c11', behavior:'mbRustfangProwler', xpTier:2,
    desc:'A heavier cousin of the Rustfang line — slower to commit to its lunge, but it hits harder when it finally does.' },
  mbglasschoir: { id:'mbglasschoir', name:'The Glasschoir', hp:14, dmg:2, speed:82, radius:15,
    color:'#5ac9c0', dark:'#265c56', behavior:'mbStaticChoir', fireCooldown:0.42, xpTier:1, weight:0.7,
    desc:'A lighter, faster relative of the Static Choir — its orbit is tighter and its bolts come quicker, but it drops in one or two less hits.' },
};
const MINIBOSS_LIST = Object.values(MINIBOSS_TYPES);

function resolveMiniboss(floorNum){
  return Util.choice(MINIBOSS_LIST);
}
