'use strict';

Object.assign(ENEMY_TYPES, {
  crushwraith: { id:'crushwraith', name:'DNB Crush Wraith', hp:8, dmg:2, speed:64, radius:13, color:'#2a4a8a', dark:'#14244a',
    behavior:'snk3Crushwraith', crushCooldown:2.8, crushRadius:100, floorKey:'11A' },
  sonarcolossus: { id:'sonarcolossus', name:'DNB Sonar Colossus', hp:14, dmg:3, speed:0, radius:20, color:'#4a6ab0', dark:'#243458',
    behavior:'snk3Sonarcolossus', pingCooldown:2.2, pingRadius:220, floorKey:'11A' },
  trenchsiren: { id:'trenchsiren', name:'DNB Trench Siren', hp:7, dmg:2, speed:48, radius:12, color:'#5a8ad0', dark:'#2c4468',
    behavior:'snk3Trenchsiren', luresRadius:180, keepDistance:210, floorKey:'11A' },
  abysshulk: { id:'abysshulk', name:'DNB Abyss Hulk', hp:12, dmg:3, speed:32, radius:18, color:'#1a2a4a', dark:'#0c1524',
    behavior:'snk3Abysshulk', rollCooldown:3.4, floorKey:'11A' },
  fathomstalker: { id:'fathomstalker', name:'DNB Fathom Stalker', hp:8, dmg:2, speed:62, radius:13, color:'#3a6ac0', dark:'#1c3460',
    behavior:'snk3Fathomstalker', mirrorRange:250, floorKey:'11A' },

  coralbrood: { id:'coralbrood', name:'DNB Coral Brood', hp:9, dmg:2, speed:44, radius:15, color:'#2fc8a4', dark:'#146054',
    behavior:'snk3Coralbrood', spawnCooldown:4, floorKey:'11B' },
  reeftitan: { id:'reeftitan', name:'DNB Reef Titan', hp:13, dmg:3, speed:32, radius:19, color:'#1a9a7a', dark:'#0c4c3c',
    behavior:'snk3Reeftitan', pulseCooldown:3, pulseRadius:110, floorKey:'11B' },
  bloomweaver: { id:'bloomweaver', name:'DNB Bloom Weaver', hp:7, dmg:2, speed:58, radius:13, color:'#5ae0a0', dark:'#2c7050',
    behavior:'snk3Bloomweaver', webCooldown:2.4, floorKey:'11B' },
  tideguardian: { id:'tideguardian', name:'DNB Tide Guardian', hp:8, dmg:2, speed:52, radius:14, color:'#2ab0c8', dark:'#155a64',
    behavior:'snk3Tideguardian', barrageCooldown:2.6, floorKey:'11B' },
  leviathanidol: { id:'leviathanidol', name:'DNB Leviathan Idol', hp:15, dmg:3, speed:0, radius:21, color:'#0f8a70', dark:'#084538',
    behavior:'snk3Leviathanidol', novaCooldown:3.2, novaRadius:120, floorKey:'11B' },
});
