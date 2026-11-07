// Shared attack geometry is used for both warnings and damage resolution.
export const ATTACKS={
 hop:{name:'Close swipe',hint:'Step away',windup:.8,recovery:1.8,range:100,radius:85,mult:1},
 charge:{name:'Bramble charge',hint:'Jump over the lane',windup:1.05,recovery:2.7,range:270,distance:230,mult:1.4},
 bolt:{name:'Aimed bolt',hint:'Jump or change platforms',windup:1.05,recovery:2.2,range:420,speed:260,mult:1},
 volley:{name:'Split volley',hint:'Keep moving',windup:1.35,recovery:3,range:440,speed:240,mult:.85},
 slam:{name:'Heavy slam',hint:'Leave the marked circle',windup:1.25,recovery:2.8,range:180,radius:120,mult:1.25},
 pounce:{name:'Marked pounce',hint:'Move out of the landing mark',windup:1.2,recovery:2.6,range:260,radius:65,mult:1.2},
 rootwave:{name:'Root sweep',hint:'Jump over the roots',windup:1.45,recovery:2.9,range:600,speed:270,mult:1.3},
 rootburst:{name:'Root eruption',hint:'Leave the marked ground',windup:1.7,recovery:3.2,range:650,radius:100,mult:1.45}
};
export const ENCOUNTER_STYLES={
 'forest-0':{pattern:'hop',pace:34},'forest-1':{pattern:'charge',pace:52},
 'forest-2':{pattern:'bolt',pace:24},'forest-3':{pattern:'slam',pace:29},
 'forest-4':{pattern:'rootburst',pace:26},'caves-0':{pattern:'bolt',pace:32},
 'caves-1':{pattern:'hop',guard:true,pace:28},'caves-2':{pattern:'slam',pace:24},
 'jungle-0':{pattern:'slam',pace:40},'jungle-1':{pattern:'pounce',pace:52},
 'jungle-2':{pattern:'charge',guard:true,pace:40},'jungle-3':{pattern:'volley',pace:35},
 'deep-0':{pattern:'slam',guard:true,pace:22},'deep-1':{pattern:'volley',pace:30},
 'deep-2':{pattern:'charge',guard:true,pace:46},'deep-3':{pattern:'rootburst',pace:20},
 'tree-0':{pattern:'pounce',pace:48},'tree-1':{pattern:'volley',pace:32},
 'tree-2':{pattern:'rootburst',guard:true,pace:23},
 tempest:{pattern:'volley',pace:25},sunwell:{pattern:'rootburst',pace:25},vault:{pattern:'slam',guard:true,pace:22}
};
export function encounterStyle(enemy){return ENCOUNTER_STYLES[enemy.id]||{pattern:ATTACKS[enemy.behavior]?enemy.behavior:'hop',pace:40,guard:enemy.behavior==='guard'};}
export function nextAttack(e){
 if(e.enemy.id==='tempest')return(e.phaseLevel||1)===1?'slam':(e.phaseLevel||1)===2?'volley':(e.attackCount||0)%2?'charge':'volley';
 if(e.enemy.id==='boss')return(e.phaseLevel||1)===1?'rootwave':(e.attackCount||0)%2?'rootwave':'rootburst';
 return encounterStyle(e.enemy).pattern;
}
export function makeTell(e,player,width){
 const kind=nextAttack(e),d=ATTACKS[kind],direction=Math.sign(player.x-e.x)||e.facing||-1;
 const target=['rootburst','pounce'].includes(kind)?Math.max(e.ledgeMin||25,Math.min(e.ledgeMax||width-25,player.x)):e.x;
 const end=kind==='charge'?Math.max(e.ledgeMin||25,Math.min(e.ledgeMax||width-25,e.x+direction*d.distance)):target;
 const zones=kind==='rootburst'&&(e.phaseLevel||1)>=3?[{left:target-75,right:target+75},{left:Math.max(e.ledgeMin||25,Math.min(e.ledgeMax||width-25,target+direction*230))-75,right:Math.max(e.ledgeMin||25,Math.min(e.ledgeMax||width-25,target+direction*230))+75}]:null;
 const left=kind==='charge'?Math.min(e.x,end)-30:target-(d.radius||30),right=kind==='charge'?Math.max(e.x,end)+30:target+(d.radius||30);
 return{zones,threatened:Math.abs(player.y-e.y)<65&&(zones||[{left,right}]).some(z=>player.x>=z.left&&player.x<=z.right),kind,remaining:d.windup,total:d.windup,x:target,y:e.y,direction,origin:e.x,end,
  left:kind==='charge'?Math.min(e.x,end)-30:target-(d.radius||30),
  right:kind==='charge'?Math.max(e.x,end)+30:target+(d.radius||30)};
}
export function attackDescription(enemy){const style=encounterStyle(enemy),d=ATTACKS[style.pattern];return enemy.id==='boss'?'Jump root sweeps. Later phases add eruption marks and rootlings. In the final phase, sweeps travel both ways and eruptions mark two fixed locations.':d.name+': '+d.hint+'.'+(style.guard?' Its shell opens while winding up and recovering.':'');}
