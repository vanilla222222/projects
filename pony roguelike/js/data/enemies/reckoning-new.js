'use strict';

Object.assign(ENEMY_TYPES, {
  voidrend: { id:'voidrend', name:'DNB Void Rend', hp:6, dmg:2, speed:80, radius:12, color:'#4a1c74', dark:'#240e3a',
    behavior:'reck3Voidrend', tearCooldown:1.8, floorKey:'9A' },
  stormherald: { id:'stormherald', name:'DNB Storm Herald', hp:6, dmg:2, speed:44, radius:13, color:'#5050a0', dark:'#282850',
    behavior:'reck3Stormherald', strikeCooldown:2.2, keepDistance:220, floorKey:'9A' },
  hollowmarch: { id:'hollowmarch', name:'DNB Hollow March', hp:10, dmg:3, speed:34, radius:16, color:'#2e2a48', dark:'#161424',
    behavior:'reck3Hollowmarch', pulseCooldown:2.6, pulseRadius:100, floorKey:'9A' },
  nightveil: { id:'nightveil', name:'DNB Night Veil', hp:5, dmg:2, speed:68, radius:11, color:'#3a3560', dark:'#1c1a30',
    behavior:'reck3Nightveil', strikeRange:60, floorKey:'9A' },
  voidcarver: { id:'voidcarver', name:'DNB Void Carver', hp:7, dmg:2, speed:56, radius:14, color:'#6a3aa0', dark:'#341c50',
    behavior:'reck3Voidcarver', bladeRadius:46, floorKey:'9A' },

  frostbastion: { id:'frostbastion', name:'DNB Frost Bastion', hp:9, dmg:2, speed:0, radius:16, color:'#8ac4dc', dark:'#456270',
    behavior:'reck3Frostbastion', novaCooldown:3, novaRadius:110, floorKey:'9B' },
  rimewarden: { id:'rimewarden', name:'DNB Rime Warden', hp:7, dmg:1, speed:46, radius:14, color:'#a8c4d0', dark:'#546268',
    behavior:'reck3Rimewarden', reflectWindow:1.2, keepDistance:180, floorKey:'9B' },
  glaciermaw: { id:'glaciermaw', name:'DNB Glacier Maw', hp:8, dmg:3, speed:0, radius:15, color:'#6a94a8', dark:'#354a54',
    behavior:'reck3Glaciermaw', burrowCooldown:2.6, burrowTime:1.1, floorKey:'9B' },
  stonechant: { id:'stonechant', name:'DNB Stone Chant', hp:6, dmg:1, speed:50, radius:13, color:'#8a7258', dark:'#45392c',
    behavior:'reck3Stonechant', rallyCooldown:4.5, rallyRadius:170, floorKey:'9B' },
  shatterbrand: { id:'shatterbrand', name:'DNB Shatter Brand', hp:8, dmg:3, speed:58, radius:14, color:'#b8dcec', dark:'#5c6e76',
    behavior:'reck3Shatterbrand', chargeCooldown:2.4, chargeSpeed:6.8, telegraphTime:0.5, floorKey:'9B' },
});
