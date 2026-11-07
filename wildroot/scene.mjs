import {drawRock,drawResourceArt} from './environment-art.mjs?v=50';
import {drawCharacter} from './player-art.mjs?v=50';
import {TIDE_NPCS} from './tide-campaign.mjs?v=45';
import {drawItemTexture} from './item-textures.mjs?v=50';
import {drawAttackEffects,bossHudLayout} from './combat-effects.mjs?v=45';
import {ATTACKS} from './combat-patterns.mjs?v=45';
import {zoneUnlocked,routeRequirement} from './engine.mjs?v=45';
import {drawMonsterArt} from './monster-art.mjs?v=53';
import {npcMarker} from './conversations.mjs?v=45';
import {drawRoomBackdrop,drawRoomSetpieces,drawRoomPlatform} from './scenery.mjs?v=52';
// Original canvas scenery. No external artwork or game assets.
import {areaById,zoneEnemy,ITEMS,ENEMIES,CLASSES,EQUIPMENT,COSMETICS} from './content.mjs?v=45';
const PALETTES={forest:['#b0c6a0','#8fae8b','#6f9575','#375c47','#203e32','#75905b'],jungle:['#b0c7a0','#759b7a','#497c63','#2a5745','#1b3d32','#7f9c5b'],caves:['#67777a','#56676c','#3d4f55','#283c42','#192f34','#54726a'],deep:['#565e71','#444f62','#354152','#263442','#1c2937','#657776'],town:['#c7d4b1','#a7bb94','#829c73','#4f6f48','#36533b','#a2af70'],'jungle-town':['#bdcdac','#8eae88','#699373','#3e6b53','#274d3e','#8ea76a']};
const R=(x,y,w,h,c,g)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));};
function rock(g,x,y,scale=1,tint=null){drawRock(g,x,y,scale,tint);}

function adventurer(g,x,y,c,t){drawCharacter(g,x,y,c,t);}
function enemy(g,x,y,e,t,boss=false){drawMonsterArt(g,e,x,y,t,boss);}
import {PLATFORMS,LADDERS,WIDTH,HEIGHT,GROUND} from './world.mjs?v=49';
function label(g,text,x,y,color='#fff8db',size=14){g.font=`bold ${size}px Trebuchet MS, sans-serif`;g.textAlign='center';g.fillStyle='#172d38';g.fillText(text,x+1,y+2);g.fillStyle=color;g.fillText(text,x,y);}
function platform(g,p,cave){const y=p.y;R(p.x,y,p.w,18,cave?'#687e82':'#6eab43',g);R(p.x,y+18,p.w,18,cave?'#50646f':'#7a643c',g);R(p.x,y+36,p.w,p.y===GROUND?90:26,cave?'#364757':'#514c35',g);for(let x=p.x;x<p.x+p.w;x+=32){R(x,y,24,5,cave?'#8da6a3':'#a9d467',g);R(x+8,y+25,8,6,cave?'#749091':'#ae925a',g);R(x+17,y+48,12,5,cave?'#465e6e':'#6d603f',g);}if(!cave)for(let x=p.x+8;x<p.x+p.w;x+=43){R(x,y-5,3,7,'#74ae45',g);R(x+4,y-10,3,12,'#a6cf61',g);}}
function portal(g,e,t,locked=false,progress=''){g.save();g.translate(e.x,e.y);const color=locked?'#687786':'#5ed5ff';for(let i=3;i>=0;i--){g.strokeStyle=[color+'20',color+'40',color+'80',color][3-i];g.lineWidth=7+i*4;g.beginPath();g.ellipse(0,-62,27+i*2,52+i*3,0,0,Math.PI*2);g.stroke();}R(-43,-8,86,13,'#65788a',g);R(-32,-15,64,8,'#a1b0b1',g);g.fillStyle='#143c6377';g.beginPath();g.ellipse(0,-64,23,49,0,0,Math.PI*2);g.fill();for(let i=0;i<6;i++){const phase=t*1.1+i;R(Math.sin(phase)*17,-60+Math.cos(phase*1.5)*39,3,5,'#d0f9ff',g);}label(g,e.name==='The Rootwarden'?'BOSS GATE':e.name,e.direction<0?55:e.direction>0?-55:0,-135,'#d8f6ff',10);if(progress)label(g,progress,e.direction<0?55:e.direction>0?-55:0,-115,'#ffe3a8',11);g.restore();}
function shop(g,{x,y,name},area){
 const orbit=area.startsWith('orbit-'),coastal=area.startsWith('tide-'),ink='#25303e';
 const [frame,trim,accent]=orbit?['#505781','#a99ae3','#8ce6e5']:coastal?['#537b7c','#ddba87','#f3e2ba']:['#82543e','#d5995f','#e8c66f'];
 R(x-64,y-100,128,100,ink,g);
 R(x-58,y-95,116,90,frame,g);
 R(x-47,y-83,94,53,ink,g);
 if(orbit){
  R(x-55,y-118,110,20,ink,g);R(x-47,y-115,94,10,trim,g);
  R(x-35,y-103,70,4,accent,g);
 }else{
  R(x-68,y-109,136,28,ink,g);
  for(let i=0;i<8;i++)R(x-64+i*16,y-105,16,21+(i%2)*3,i%2?accent:frame,g);
 }
 R(x-57,y-31,114,9,trim,g);
 R(x-36,y-48,24,17,trim,g);R(x-32,y-44,16,3,frame,g);
 R(x+17,y-49,22,18,accent,g);R(x+23,y-55,10,6,trim,g);
 R(x-25,y-15,50,4,accent,g);
 label(g,name,x,y-132,'#ffe2a3',12);
}
function anvil(g,x,y,area){
 const orbit=area.startsWith('orbit-'),coastal=area.startsWith('tide-');
 const [base,light,steel,accent]=orbit?['#504a72','#d6ccf2','#8285af','#77e0d2']:coastal?['#49655b','#d8e3df','#728e95','#e4bc75']:['#79513b','#e0e4da','#808f99','#d79a58'];
 const ink='#25303a';
 // The wide face and stepped horn are separate from the tapered waist.
 R(x-65,y-71,108,10,ink,g);R(x-55,y-61,98,10,ink,g);
 R(x-42,y-51,77,8,ink,g);R(x-22,y-43,43,13,ink,g);
 R(x-30,y-31,59,8,ink,g);R(x-59,y-67,97,5,light,g);
 R(x-49,y-62,87,7,steel,g);R(x-35,y-55,63,7,steel,g);
 R(x-17,y-48,28,15,steel,g);R(x-21,y-32,43,4,light,g);
 R(x+22,y-69,6,4,ink,g);
 // A low timber block or orbital mounting plinth keeps the outline clear.
 R(x-34,y-26,67,26,ink,g);R(x-29,y-24,57,22,base,g);
 R(x-29,y-23,57,4,accent,g);R(x-23,y-13,4,10,ink,g);
 R(x+15,y-14,4,11,ink,g);
 // Quench bucket and heated stock sit off the working surface.
 R(x+43,y-25,30,25,ink,g);R(x+47,y-21,22,17,base,g);
 R(x+43,y-27,30,7,steel,g);R(x+47,y-26,22,3,orbit?accent:'#84b5bb',g);
 R(x-14,y-76,24,5,orbit?accent:'#e89052',g);
 R(x+2,y-75,8,3,orbit?light:'#f9ce83',g);
}
function station(g,e,area){const x=e.x,y=e.y;if(e.station==='anvil'){anvil(g,x,y,area);}else if(e.station==='foundry'){R(x-47,y-122,94,122,'#8b756a',g);R(x-57,y-138,114,19,'#bba08a',g);R(x-26,y-65,52,65,'#302b31',g);R(x-19,y-50,38,47,'#df7540',g);R(x-11,y-34,23,31,'#ffcb67',g);R(x-46,y-85,92,8,'#624f4c',g);}else{R(x-55,y-53,110,13,'#a68558',g);R(x-45,y-40,9,40,'#665944',g);R(x+36,y-40,9,40,'#665944',g);if(e.station==='alchemy'){R(x-25,y-88,35,35,'#426b84',g);R(x-19,y-94,23,9,'#a1d8b7',g);R(x-17,y-78,22,22,'#9ddb75',g);R(x+20,y-76,22,23,'#b985c1',g);R(x+25,y-88,11,13,'#e2d6b3',g);}else{R(x-27,y-75,55,22,'#8171b0',g);label(g,'✦',x,y-89,'#d8c9ff',34);}}label(g,e.name,x,y-(e.station==='anvil'?96:159),'#ffdea3');}
export function viewFor(canvas,p){const ratio=canvas.clientWidth/Math.max(1,canvas.clientHeight);const width=Math.min(1280,Math.max(480,HEIGHT*ratio));return{x:Math.max(0,Math.min((p.roomWidth||WIDTH)-width,p.x-width*.43)),y:Math.max(p.roomMinY||0,Math.min(0,(p.y??GROUND)-HEIGHT*.76)),width,height:HEIGHT};}
export function drawWorld(canvas,world,t,reduced=false){
 const ctx=canvas.getContext('2d');if(!ctx)return;const dpr=Math.min(2,devicePixelRatio||1),cw=Math.round(canvas.clientWidth*dpr),ch=Math.round(canvas.clientHeight*dpr);if(cw&&ch&&(canvas.width!==cw||canvas.height!==ch)){canvas.width=cw;canvas.height=ch;}
 const g=ctx,v=viewFor(canvas,world.player),c=world.c,map=world.map,time=reduced?0:t;
 ctx.imageSmoothingEnabled=false;g.setTransform(canvas.width/v.width,0,0,canvas.height/v.height,0,0);g.clearRect(0,0,v.width,v.height);
 drawRoomBackdrop(g,map.layout,v,time);
 g.save();g.translate(-v.x,-v.y);
 drawRoomSetpieces(g,map.layout,v,time);
 const visible=(x,y,w=300,h=600)=>x+w>v.x&&x-w<v.x+v.width&&y>v.y-60&&y-h<v.y+v.height+60;
 for(const p of map.platforms)if(p.y>=v.y-100&&p.y<=v.y+850)drawRoomPlatform(g,p,map.layout.design);
 for(const l of map.ladders){if(!visible(l.x,l.bottom,32,l.bottom-l.top+12))continue;R(l.x-17,l.top-7,10,l.bottom-l.top+14,'#24383c',g);R(l.x+8,l.top-7,10,l.bottom-l.top+14,'#24383c',g);R(l.x-15,l.top-5,5,l.bottom-l.top+10,'#92704e',g);R(l.x+10,l.top-5,5,l.bottom-l.top+10,'#92704e',g);R(l.x-15,l.top-5,2,l.bottom-l.top+10,'#c4a475',g);for(let y=l.top+5;y<l.bottom;y+=21){if(y<v.y-25||y>v.y+v.height+25)continue;R(l.x-16,y-1,33,8,'#24383c',g);R(l.x-14,y,29,4,'#d0b37e',g);}}

 for(const e of map.facilities||[]){if(!visible(e.x,e.y,170,260))continue;const x=e.x,y=e.y;if(e.kind==='survey'){R(x-28,y-35,56,35,'#8d6f4d',g);R(x-32,y-45,64,13,'#c4a66b',g);R(x-5,y-35,10,18,'#e2cc7c',g);R(x+40,y-110,5,110,'#9c8d6c',g);R(x+45,y-110,40,35,map.layout.design.trim,g);label(g,'SURVEY CACHE',x,y-135,'#e7e4b4',11);}else if(e.kind==='telescope'){R(x-9,y-75,18,75,'#725a3e',g);g.save();g.translate(x,y-90);g.rotate(-.4);R(-55,-15,110,31,'#b6955b',g);R(28,-21,35,43,'#657f86',g);R(45,-17,9,35,'#b2e9ef',g);g.restore();label(g,'CROWN TELESCOPE',x,y-155,'#ffe4a4',13);}else if(e.kind==='constellation'){g.strokeStyle='#b6e2ef';g.lineWidth=2;g.beginPath();for(let i=0;i<5;i++){const xx=x+Math.sin(i*2.3)*32,yy=y-70+Math.cos(i*2.3)*28;i?g.lineTo(xx,yy):g.moveTo(xx,yy);R(xx-3,yy-3,6,6,'#fff3b5',g);}g.stroke();label(g,e.name,x,y-125,'#c5e7ed',11);}else if(e.kind==='dungeon'){R(x-64,y-130,128,130,'#637c70',g);R(x-45,y-110,90,110,'#213e35',g);R(x-68,y-141,136,18,'#9bab82',g);R(x-13,y-90,26,32,'#a4dbb3',g);label(g,'MOSSROOT RUINS',x,y-166,'#bbebc8',12);}else if(e.kind==='bossboard'){R(x-47,y-126,94,100,'#755543',g);R(x-55,y-137,110,17,'#bc9a60',g);R(x-32,y-108,64,62,'#dbcc99',g);label(g,'HUNT BOARD',x,y-162,'#f8dca0',12);}else if(e.kind==='arena'){R(x-37,y-103,74,90,'#78543e',g);R(x-44,y-113,88,15,'#c69e60',g);label(g,'⚔',x,y-49,'#f2d385',35);label(g,'SOLO TRIALS',x,y-140,'#ffdf95',12);}else if(e.kind==='orbit-job'){R(x-55,y-62,110,62,'#424774',g);R(x-59,y-72,118,12,'#a78bdf',g);R(x-34,y-53,68,26,'#6ebaca',g);label(g,e.name.toUpperCase(),x,y-101,'#e1d4ff',12);}else if(e.kind==='advancement'){R(x-30,y-90,60,90,'#657f8b',g);R(x-38,y-100,76,14,'#d8bb7c',g);label(g,'Ⅱ',x,y-45,'#fff1b8',30);label(g,'TIER 2 PATHFINDER',x,y-130,'#ffe2a3',12);}else if(e.kind==='shop'){shop(g,e,map.area);}else if(e.kind==='vault'){R(x-40,y-85,80,85,'#5b6874',g);R(x-35,y-79,70,73,'#a69a73',g);R(x-27,y-70,54,54,'#384958',g);R(x-5,y-50,10,23,'#e6c875',g);label(g,'UPGRADE VAULT',x,y-115,'#ffe1a1',12);}else if(e.kind==='tasks'){R(x-44,y-115,88,90,'#846444',g);R(x-49,y-124,98,12,'#c5a26c',g);R(x-35,y-22,9,24,'#634b36',g);R(x+25,y-22,9,24,'#634b36',g);for(let i=0;i<3;i++){R(x-29+i*21,y-101,17,45,'#e4d9ad',g);R(x-26+i*21,y-90,10,3,'#8e805d',g);}label(g,'WORLD TASKS',x,y-145,'#ffe1a1',12);}else if(e.kind==='worldgate'){for(const dx of [-52,38]){R(x+dx,y-180,18,180,'#728291',g);R(x+dx-4,y-190,26,16,'#b5b7a2',g);}R(x-40,y-190,80,17,'#92a4a2',g);R(x-36,y-173,72,166,'#26394b',g);label(g,'Ⅱ',x,y-105,'#697d8b',42);label(g,'WORLD 2 · TIDEWILDS',x,y-211,'#d2c5b1',12);}else if(e.kind==='stamps'){R(x-42,y-52,84,52,'#785e4b',g);R(x-47,y-62,94,14,'#cba46b',g);R(x-28,y-111,56,49,'#e3d3a0',g);R(x-16,y-100,32,26,'#9c6464',g);label(g,'STAMP REGISTRY',x,y-133,'#ffe1a1',12);}else{R(x-44,y-18,88,18,'#718391',g);R(x-33,y-36,66,20,'#9aa7a7',g);R(x-21,y-88,42,53,'#8b9d9f',g);R(x-18,y-122,36,33,'#bac1b2',g);R(x-37,y-83,74,17,'#9caead',g);label(g,'STATUE KEEPER',x,y-143,'#d5e3d2',12);}}
 for(const e of map.portals){const d=e.destination,r=routeRequirement(d.area,d.zone),locked=!d.boss&&!zoneUnlocked(world.state,d.area,d.zone,c),n=r?(r.shared?world.state.kills:c.journey.kills)[r.id]||0:0;portal(g,e,time,locked,locked&&r?Math.min(n,r.goal)+' / '+r.goal+' kills'+(r.shared?' · roster':''):'');}
 for(const node of map.resources){if(!visible(node.x,node.y,200,350))continue;const height=drawResourceArt(g,node.resource,node.x,node.y,time);if(world.target===node){label(g,ITEMS[node.resource].name,node.x,node.y-height-18,'#f2e6bf',12);R(node.x-38,node.y-height-8,76,7,'#24383c',g);R(node.x-36,node.y-height-6,72*Math.min(1,c.progress/3),3,'#b8d995',g);}}

 for(const e of map.stations)if(visible(e.x,e.y,140,180))station(g,e,map.area);
 for(const chest of map.storage||[]){const x=chest.x,y=chest.y;R(x-30,y-34,60,31,'#9b754c',g);R(x-32,y-48,64,17,'#bd965d',g);R(x-30,y-32,60,5,'#513c30',g);R(x-25,y-47,7,44,'#6c8893',g);R(x+18,y-47,7,44,'#6c8893',g);R(x-5,y-32,10,13,'#f0d37e',g);label(g,'STORAGE',x,y-63,'#f5dda4',12);}
 for(const entry of map.discoveries||[]){const x=entry.x,y=entry.y;rock(g,x,y,1.3,'#b29bda');label(g,'✦',x,y-65,'#dbc9ff',27);label(g,'Strange markings',x,y+20,'#d2c7ed',11);}
 for(const npc of map.npcs){if(!visible(npc.x,npc.y,90,200))continue;const fake={class:npc.classId,color:TIDE_NPCS[npc.role]?.color,activity:'rest'};adventurer(g,npc.x,npc.y,fake,time);const marker=npcMarker(world.state,c,npc.classId||npc.role);if(marker.symbol)label(g,marker.symbol,npc.x,npc.y-151,marker.color,31);label(g,npc.name,npc.x,npc.y-123,'#ffe5a8');label(g,(CLASSES[npc.classId]?.name?CLASSES[npc.classId].name+' mentor':(npc.role==='steward'?'Village steward':'Expedition crew')),npc.x,npc.y+22,'#f6f3cc',11);}
 for(const e of map.monsters){if(e.dead>0||e.x<v.x-300||e.x>v.x+v.width+300||e.y<v.y-200||e.y>v.y+950)continue;
 if(e.telegraph){const tell=e.telegraph,d=ATTACKS[tell.kind]||ATTACKS.hop,progress=1-tell.remaining/tell.total;
  g.globalAlpha=world.state.options?.reducedMotion ? .45 : .25+.2*Math.sin(time*10)**2;
  if(['charge','slam','hop','pounce','rootburst'].includes(tell.kind)){for(const zone of tell.zones||[{left:tell.left,right:tell.right}]){R(zone.left,tell.y-10,zone.right-zone.left,12,'#f48b61',g);g.strokeStyle='#ffe1a1';g.lineWidth=3;g.strokeRect(zone.left,tell.y-15,zone.right-zone.left,17);}}
  else{R(e.x-18,e.y-65,36,20,'#f48b61',g);g.strokeStyle='#ffe1a1';g.lineWidth=3;g.beginPath();g.moveTo(e.x,e.y-65);g.lineTo(e.x+tell.direction*(d.range||150),e.y-65);g.stroke();if(tell.kind==='rootwave'){const dirs=(e.phaseLevel||1)>=3?[-1,1]:[tell.direction];for(const direction of dirs){R(direction<0?25:e.x,e.y-16,direction<0?e.x-25:map.width-e.x-25,8,'#f48b61',g);}}}
  g.globalAlpha=1;label(g,d.name.toUpperCase()+' · '+Math.max(0,tell.remaining).toFixed(1)+'s',e.x,e.y-(map.boss?255:180),'#ffe0b4',15);label(g,d.hint,e.x,e.y-(map.boss?235:160),'#fff0cf',11);
  R(e.x-35,e.y-116,70,5,'#552c39',g);R(e.x-35,e.y-116,70*progress,5,'#f4b07d',g);}

 g.save();if(e.flash>0)g.globalAlpha=.6;g.translate(e.x,e.y);g.scale(e.facing||-1,1);enemy(g,0,e.enemy.behavior==='hop'?-Math.abs(Math.sin(time*3+e.phase))*5:0,e.enemy,time,(map.boss&&e.enemy.id==='boss')||e.enemy.id==='tempest');g.restore();
 if(e.guarding){g.strokeStyle='#9ed4ed';g.lineWidth=3;g.beginPath();g.arc(e.x,e.y-35,42,0,Math.PI*2);g.stroke();}
 if(e.hp<e.enemy.hp||world.target===e){const boss=e.enemy.id==='boss',w=boss?130:72;R(e.x-w/2-2,e.y-(boss?220:95),w+4,9,'#27323d',g);R(e.x-w/2,e.y-(boss?218:93),w*e.hp/e.enemy.hp,5,'#de6f60',g);if(!boss||!e.telegraph)label(g,e.enemy.name,e.x,e.y-(boss?230:104),'#fff3c4',12);}}
 for(const h of world.hazards||[]){if(h.kind==='bolt'){R(h.x-12,h.y-8,24,16,'#d7aaec',g);R(h.x-8,h.y-4,16,8,'#fbdfac',g);}else{R(h.x-17,h.y-24,34,55,'#9d7860',g);R(h.x-10,h.y-30,20,13,'#c3b384',g);}}
 drawAttackEffects(g,world.attackEffects,world.state.options?.reducedMotion);
 const p=world.player;if(COSMETICS[c.cosmetic]){g.strokeStyle=COSMETICS[c.cosmetic].color;g.lineWidth=4;g.beginPath();g.ellipse(p.x,p.y-129,25,8,0,0,Math.PI*2);g.stroke();}g.save();g.translate(p.x,p.y);g.scale(p.facing,1);adventurer(g,0,0,{...c,action:p.flash>0,activity:p.climbing||Math.abs(p.vx)>0?'fight':c.activity},p.walk||time);g.restore();if(p.hurtGrace>0){g.strokeStyle='#f0a08e';g.lineWidth=3;g.beginPath();g.ellipse(p.x,p.y-55,30,52,0,0,Math.PI*2);g.stroke();}label(g,c.name,p.x,p.y-134,'#fff3bd',14);label(g,c.class?CLASSES[c.class].name:'Beginner',p.x,p.y+22,'#d8e9f0',10);
 if(p.climbing){R(p.x-7,p.y-45,14,5,'#e5d8ae',g);}
 for(const d of world.groundLoot){const bob=Math.sin(time*3+d.x)*3;if(d.itemId==='coins'){R(d.x-7,d.y-15+bob,14,13,'#e8c260',g);R(d.x-4,d.y-13+bob,3,8,'#fff0a0',g);}else drawItemTexture(g,d.itemId,d.x,d.y+bob,27);}
 for(const d of world.drops){g.globalAlpha=Math.min(1,d.life);label(g,d.text,d.x,d.y-20,d.color||'#ffe08d',16);}g.globalAlpha=1;
 for(const particle of world.particles){g.globalAlpha=Math.min(1,particle.life*2);label(g,particle.text,particle.x,particle.y,particle.color,particle.text.length<5?23:14);}g.globalAlpha=1;
 if(p.respawn>0)label(g,'Recovering at the entrance…',p.x,p.y-175,'#ffddae',18);
 g.restore();
 if(map.boss||['tempest','singularity'].includes(map.secret)){const boss=map.monsters.find(e=>['boss','tempest','singularity'].includes(e.enemy.id));if(boss&&boss.dead<=0){const hud=bossHudLayout(v.width),w=hud.width,y=hud.top,x=(v.width-w)/2;R(x-3,y-3,w+6,(boss.phaseLevel||1)>=3?84:63,'#172635e8',g);R(x,y,w*boss.hp/boss.enemy.hp,20,'#a35d60',g);label(g,boss.enemy.name.toUpperCase()+' · PHASE '+(boss.phaseLevel||1),v.width/2,y+14,'#ffdfb4',12);label(g,boss.telegraph?(ATTACKS[boss.telegraph.kind]?.hint||'Move away').toUpperCase():'Watch the tells. Keep moving.',v.width/2,y+42,boss.telegraph?'#ffcb99':'#d1e0ce',12);if((boss.phaseLevel||1)>=3)label(g,boss.enemy.id==='tempest'?'CHARGES AND SPLIT VOLLEYS':'TWO ERUPTION MARKS · SWEEPS BOTH WAYS',v.width/2,y+62,'#ffe1ad',10);}}
 return v;
}
