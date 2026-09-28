'use strict';

const STAGE7_9_SUPERBOSSES = {

  japan: { id:'japan', name:'Japan DNB', hp:82, dmg:4, speed:86, radius:32,
    color:'#4fa8d6', dark:'#1f5b80', behavior:'bossJapanDnb', icon:'🌊',
    desc:'Four phases over a rising tide — the pull grows band by band while the patterns tighten. RISING SUN throws wide alternating fans; TSUNAMI walls the room with one walking gap; RIPTIDE crosses in dashes that leave swells behind them; TYPHOON stops moving almost entirely and lets the room do the work.' },

  deannb: { id:'deannb', name:'DeanNB', hp:85, dmg:4, speed:80, radius:33,
    color:'#7ae0c0', dark:'#2c6a58', behavior:'bossDeanNb', burstRadius:60, icon:'🐚',
    desc:'The light is the whole fight. DeanNB is only hittable during its LIT half, and the lit half gets shorter every phase; the dark half is armoured, anchored, and fills the floor with slow bioluminescent walls. Lantern shoals keep the dark from ever being idle time.' },

  israelprimeprime: { id:'israelprimeprime', name:'Israel DNB Prime Prime', hp:88, dmg:4, speed:90, radius:33,
    color:'#1e4a6a', dark:'#0c2434', behavior:'bossIsraelPrimePrime', burstRadius:56, icon:'✡️',
    desc:'Five bands, and it never walks anywhere — it blinks, faster each phase, leaving a parting ring at the spot it left. Cross beams give way to counter-rotating spirals, then columns marching inward, then walls with one gap, and finally every pattern at once at half density.' },
};
Object.assign(SUPERBOSSES, STAGE7_9_SUPERBOSSES);
SUPERBOSS_LIST.push(...Object.values(STAGE7_9_SUPERBOSSES));
