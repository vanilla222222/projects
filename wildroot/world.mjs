import {CLASSES,AREAS,ENEMIES,ITEMS,areaById,zoneEnemy} from './content.mjs?v=3';
import * as E from './engine.mjs?v=3';
export const WIDTH=1280,HEIGHT=720,GROUND=644;
export const PLATFORMS=[{x:0,w:1280,y:GROUND},{x:180,w:410,y:462},{x:730,w:440,y:342}];
export const LADDERS=[{x:370,top:462,bottom:GROUND},{x:1000,top:342,bottom:GROUND}];
export const ABILITIES={
 novice:{name:'Power Strike',icon:'⚔',cooldown:7,mult:2,range:115,description:'A heavy strike for double damage.'},
 warrior:{name:'Cleave',icon:'⚔',cooldown:8,mult:2.4,range:150,aoe:true,description:'Hit nearby enemies with a sweeping strike.'},
 mage:{name:'Arc Bolt',icon:'ϟ',cooldown:6,mult:2.7,range:380,description:'A ranged bolt of woodland magic.'},
 blacksmith:{name:'Hammerfall',icon:'⚒',cooldown:9,mult:3.2,range:125,description:'Bring your hammer down for a powerful hit.'},
 enchanter:{name:'Rune Burst',icon:'✦',cooldown:10,mult:2,range:230,aoe:true,heal:10,description:'Burst nearby foes and restore 10 health.'},
 alchemist:{name:'Acid Flask',icon:'⚗',cooldown:11,mult:2.2,range:280,aoe:true,heal:20,description:'Splash nearby enemies and restore 20 health.'}
};
export function createMap(area,index,boss=false){
 const town=['town','jungle-town'].includes(area),enemy=boss?ENEMIES.boss:zoneEnemy(area,index);
 const monsters=enemy?(boss?[{x:950,y:GROUND}]:[{x:700,y:GROUND},{x:940,y:GROUND},{x:1110,y:GROUND},{x:490,y:462},{x:840,y:342}]).map((p,i)=>({...p,home:p.x,id:`enemy-${i}`,kind:'enemy',enemy,hp:enemy.hp,dead:0,attack:1.5+i*.15,phase:i,facing:-1})):[];
 const resources=areaById(area).resources[index].map((resource,i)=>({id:`node-${i}`,kind:'node',resource,x:i?520:425,y:i?462:GROUND,progress:0}));
 const npcs=[];
 if(area==='town'&&index===0){for(const [i,id]of ['warrior','mage','blacksmith'].entries())npcs.push({id:`npc-${id}`,kind:'npc',classId:id,name:CLASSES[id].trainer,x:300+i*260,y:GROUND});}
 if(area==='town'&&index===1)npcs.push({id:'npc-blacksmith',kind:'npc',classId:'blacksmith',name:'Flint',x:355,y:GROUND});
 if(area==='town'&&index===2)npcs.push({id:'npc-blacksmith',kind:'npc',classId:'blacksmith',name:'Flint',x:355,y:GROUND});
 if(area==='jungle-town'&&index<2){const id=index===0?'enchanter':'alchemist';npcs.push({id:`npc-${id}`,kind:'npc',classId:id,name:CLASSES[id].trainer,x:355,y:GROUND});}
 const station=area==='town'?(index===1?'anvil':index===2?'foundry':null):area==='jungle-town'?(index===0?'enchanting':index===1?'alchemy':null):null;
 const stations=station?[{id:'station',kind:'station',station,x:815,y:GROUND,name:station[0].toUpperCase()+station.slice(1)}]:[];
 const portals=[{id:'portal-left',kind:'portal',x:65,y:GROUND,direction:-1,name:'Previous map'},{id:'portal-right',kind:'portal',x:1210,y:GROUND,direction:1,name:area==='jungle-town'&&index===2?'The Rootwarden':'Next map'}];
 return{area,index,boss,town,monsters,resources,npcs,stations,portals,entities:[...monsters,...resources,...npcs,...stations,...portals]};
}
export function nextRoute(area,index,direction){
 const zones=areaById(area).zones.length;
 if(direction<0){if(index>0)return{area,zone:index-1};return{town:['forest',0],forest:['town',0],caves:['town',2],jungle:['forest',4],deep:['caves',2],'jungle-town':['jungle',3]}[area].reduce((o,v,i)=>(o[i?'zone':'area']=v,o),{});}
 if(index<zones-1)return{area,zone:index+1};
 if(area==='jungle-town')return{boss:true};
 const dest={town:['caves',0],forest:['jungle',0],caves:['deep',0],jungle:['jungle-town',0],deep:['caves',2]}[area];return{area:dest[0],zone:dest[1]};
}
export function makePlayer(c){const saved=c.position;return{x:Math.max(100,Math.min(1180,Number.isFinite(saved?.x)?saved.x:190)),y:GROUND,vx:0,vy:0,grounded:true,facing:1,climbing:false,climbTo:null,attack:0,skill:0,flash:0,walk:0,respawn:0};}
export class World {
 constructor(state,{onIntent=()=>{},onEvent=()=>{},rng=Math.random}={}){this.state=state;this.onIntent=onIntent;this.onEvent=onEvent;this.rng=rng;this.particles=[];this.drops=[];this.time=0;this.auto=false;this.enter();}
 get c(){return E.selected(this.state);}
 enter(boss=this.c.activity==='boss'){this.map=createMap(this.c.area,this.c.zone,boss);this.player=makePlayer(this.c);this.target=null;this.destination=null;this.pendingSkill=false;this.particles=[];this.drops=[];this.groundLoot=(Array.isArray(this.c.groundLoot)?this.c.groundLoot:[]).filter(d=>d&&typeof d.id==='string'&&Number.isFinite(d.x)&&Number.isFinite(d.y)&&Number.isFinite(d.count)&&d.count>0&&(d.itemId==='coins'||ITEMS[d.itemId]));this.c.groundLoot=this.groundLoot;this.auto=['fight','boss'].includes(this.c.activity);if(this.c.activity==='gather'){this.target=this.map.resources.find(e=>e.resource===this.c.resource)||null;}this.c.progress=0;this.key=`${this.c.id}:${this.c.area}:${this.c.zone}`;}
 switchCheck(){if(this.key!==`${this.c.id}:${this.c.area}:${this.c.zone}`)this.enter();}
 travel(area,index){if(!E.zoneUnlocked(this.state,area,index))return false;this.collectAll();if(!E.travel(this.state,this.c,area,index))return false;this.c.position=null;this.enter();return true;}
 select(id){const entity=this.map.entities.find(e=>e.id===id);if(!entity||entity.kind==='enemy'&&entity.dead>0)return false;this.target=entity;this.destination=null;this.pendingSkill=false;if(entity.kind==='enemy'){this.c.activity=this.map.boss?'boss':'fight';this.c.resource=null;}else if(entity.kind==='node'){this.c.activity='gather';this.c.resource=entity.resource;}else{this.c.activity='rest';this.auto=false;}this.c.progress=0;return true;}
 walkTo(x,y=GROUND){let floor=PLATFORMS.filter(p=>x>=p.x&&x<=p.x+p.w).sort((a,b)=>Math.abs(a.y-y)-Math.abs(b.y-y))[0]||PLATFORMS[0];this.destination={x:Math.max(25,Math.min(WIDTH-25,x)),y:floor.y};this.target=null;this.c.activity='rest';this.c.progress=0;this.auto=false;}
 stop(){this.target=null;this.destination=null;this.auto=false;this.c.activity='rest';this.c.progress=0;}
 toggleAuto(){if(!this.map.monsters.length){this.onEvent({type:'notice',text:'There are no enemies on this map.'});return false;}this.auto=!this.auto;if(this.auto){this.c.activity=this.map.boss?'boss':'fight';this.findTarget();}else this.stop();return this.auto;}
 findTarget(){const p=this.player,nearest=this.map.monsters.filter(e=>e.dead<=0).sort((a,b)=>Math.abs(a.x-p.x)+Math.abs(a.y-p.y)*2-Math.abs(b.x-p.x)-Math.abs(b.y-p.y)*2)[0];if(nearest)this.target=nearest;}
 particle(x,y,text,color='#fff2a8'){this.particles.push({x,y,text,color,life:1.2});}
 hit(e,mult=1){if(!e||e.dead>0)return;const damage=Math.max(1,Math.round(E.power(this.state,this.c)*mult));e.hp-=damage;e.flash=.15;this.particle(e.x,e.y-62,damage);if(e.hp<=0){e.hp=0;e.dead=this.map.boss?Infinity:5;const before={...this.state.inventory},coins=this.state.coins;E.grantKills(this.state,this.c,e.enemy,1,this.rng);this.particle(e.x,e.y-100,`+${e.enemy.xp} XP`,'#b8f3ff');const money=this.state.coins-coins;this.state.coins-=money;this.spawnLoot('coins',money,e.x,e.y);for(const[id,n]of Object.entries(this.state.inventory)){const count=n-(before[id]||0);if(count>0){this.state.inventory[id]-=count;this.spawnLoot(id,count,e.x+(this.groundLoot.length%3)*22,e.y);}}if(this.map.boss){this.auto=false;this.c.activity='rest';this.onIntent({type:'victory'});}if(this.target===e)this.target=null;}}
 spawnLoot(itemId,count,x,y){if(count<=0)return;this.groundLoot.push({id:`loot-${Date.now()}-${Math.floor(this.rng()*1000000)}-${this.groundLoot.length}`,kind:'drop',itemId,count,x,y});this.c.groundLoot=this.groundLoot;}
 collect(drop){if(!this.groundLoot.includes(drop))return false;if(drop.itemId==='coins')this.state.coins+=drop.count;else{E.addItem(this.state,drop.itemId,drop.count);this.onEvent({type:'loot',id:drop.itemId,count:drop.count});}this.drops.push({x:drop.x,y:drop.y-20,life:1.8,text:`+${drop.count} ${drop.itemId==='coins'?'◈':ITEMS[drop.itemId].name}`});this.groundLoot.splice(this.groundLoot.indexOf(drop),1);this.c.groundLoot=this.groundLoot;return true;}
 collectAll(){for(const drop of [...this.groundLoot])this.collect(drop);}
 pickLoot(id){const drop=this.groundLoot.find(d=>d.id===id);if(!drop)return false;this.target=drop;this.destination=null;this.auto=false;return true;}
 basicAttack(){const p=this.player;if(p.attack>0||p.respawn>0)return false;let e=this.target?.kind==='enemy'?this.target:this.map.monsters.find(e=>e.dead<=0&&Math.abs(e.x-p.x)<110&&Math.abs(e.y-p.y)<65);if(!e||e.dead>0||Math.abs(e.x-p.x)>115||Math.abs(e.y-p.y)>65)return false;this.target=e;this.c.activity=this.map.boss?'boss':'fight';p.facing=e.x>p.x?1:-1;p.attack=.9;p.flash=.24;this.hit(e);return true;}
 useSkill(){const p=this.player;if(p.skill>0||p.respawn>0)return false;const ability=ABILITIES[this.c.class||'novice'];let targets=this.map.monsters.filter(e=>e.dead<=0&&Math.abs(e.x-p.x)<ability.range&&Math.abs(e.y-p.y)<80).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x));if(!targets.length){this.onEvent({type:'notice',text:'Move closer to an enemy first.'});return false;}this.target=targets[0];this.c.activity=this.map.boss?'boss':'fight';if(!ability.aoe)targets=targets.slice(0,1);for(const e of targets)this.hit(e,ability.mult);p.skill=ability.cooldown;p.flash=.4;if(ability.heal)this.c.hp=Math.min(E.maxHp(this.c),this.c.hp+ability.heal);this.particle(p.x,p.y-110,ability.name,'#b4dcff');return true;}
 interact(){const p=this.player,near=this.map.entities.filter(e=>e.kind!=='enemy'&&Math.abs(e.x-p.x)<110&&Math.abs(e.y-p.y)<90).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];if(near){this.select(near.id);return true;}return this.basicAttack();}
 follow(dt){const p=this.player,t=this.target||this.destination;if(!t)return 0;const distance=Math.abs(t.x-p.x),range=t.kind==='enemy'?85:t.kind==='node'?58:t.kind?65:5;
  if(Math.abs(t.y-p.y)>30&&!p.climbing&&p.grounded){const onUpper=p.y<GROUND-30;const ladder=onUpper?LADDERS.find(l=>Math.abs(l.top-p.y)<10):LADDERS.find(l=>Math.abs(l.top-t.y)<10);if(ladder){if(Math.abs(p.x-ladder.x)<10){p.climbing=true;p.climbTo=onUpper?ladder.bottom:ladder.top;p.ladder=ladder;p.vy=0;}else return Math.sign(ladder.x-p.x);}return 0;}
  if(p.climbing)return 0;
  if(Math.abs(t.y-p.y)<35&&distance<=range){
   if(t.kind==='enemy'){this.basicAttack();if(this.auto&&p.skill<=0)this.useSkill();}
   else if(t.kind==='node'){this.c.activity='gather';this.c.resource=t.resource;this.c.progress+=dt;const interval=E.gatherInterval(this.c,t.resource);if(this.c.progress>=interval){this.c.progress-=interval;E.addItem(this.state,t.resource,1);this.c.skills[E.gatherSkill(t.resource)]+=2;E.gainXp(this.c,.4);p.flash=.25;this.particle(t.x,t.y-100,'+1','#c1ef8f');this.onEvent({type:'loot',id:t.resource,count:1});}}
   else if(t.kind==='drop'){this.collect(t);this.target=null;}
   else if(t.kind==='portal'){this.target=null;const route=nextRoute(this.c.area,this.c.zone,t.direction);if(route.boss){this.enter(true);this.c.activity='boss';this.auto=true;this.findTarget();}else if(!this.travel(route.area,route.zone)){this.onEvent({type:'notice',text:E.lockReason(this.state,route.area,route.zone)});}}
   else if(t.kind){this.target=null;this.onIntent({type:t.kind,entity:t});}
   else this.destination=null;
   return 0;
  }
  return Math.sign(t.x-p.x);
 }
 step(dt,input={}){
  if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.06);this.switchCheck();this.time+=dt;const p=this.player,c=this.c;
  p.attack=Math.max(0,p.attack-dt);p.skill=Math.max(0,p.skill-dt);p.flash=Math.max(0,p.flash-dt);
  for(const e of this.map.monsters){e.flash=Math.max(0,(e.flash||0)-dt);if(e.dead>0){e.dead-=dt;if(e.dead<=0){e.dead=0;e.hp=e.enemy.hp;e.attack=1.5;}}}
  for(const particle of this.particles){particle.life-=dt;particle.y-=dt*35;}this.particles=this.particles.filter(p=>p.life>0);for(const d of this.drops)d.life-=dt;this.drops=this.drops.filter(d=>d.life>0);
  if(p.respawn>0){p.respawn-=dt;if(p.respawn<=0){p.x=190;p.y=GROUND;p.vy=0;p.grounded=true;c.hp=E.maxHp(c);this.stop();}return;}
  if(input.horizontal||input.vertical||input.jump){this.target=null;this.destination=null;this.auto=false;c.activity='rest';c.progress=0;}
  if(this.target?.kind==='enemy'&&this.target.dead>0)this.target=null;
  if(this.auto&&!this.target)this.findTarget();
  let direction=input.horizontal||0;
  if(!direction&&!input.vertical)direction=this.follow(dt);
  if(p.climbing){
   if(p.climbTo!==null){const sign=Math.sign(p.climbTo-p.y);p.y+=sign*220*dt;if(Math.abs(p.climbTo-p.y)<8){p.y=p.climbTo;p.climbing=false;p.climbTo=null;p.grounded=true;}}
   else{p.y-=input.vertical*220*dt;if(p.y<=p.ladder.top){p.y=p.ladder.top;p.climbing=false;p.grounded=true;}if(p.y>=p.ladder.bottom){p.y=p.ladder.bottom;p.climbing=false;p.grounded=true;}}
   if(input.horizontal){p.climbing=false;p.climbTo=null;p.grounded=false;}
  }else{
   if(input.vertical){const ladder=LADDERS.find(l=>Math.abs(l.x-p.x)<30&&p.y>=l.top-8&&p.y<=l.bottom+8);if(ladder){p.x=ladder.x;p.ladder=ladder;p.climbing=true;p.climbTo=null;p.grounded=false;}}
   if(input.jump&&p.grounded){p.vy=-535;p.grounded=false;}
   const before=p.y;p.vx=direction*245;p.x=Math.max(20,Math.min(WIDTH-20,p.x+p.vx*dt));if(direction){p.facing=Math.sign(direction);p.walk+=dt*10;}
   if(!p.climbing){p.vy+=1250*dt;p.y+=p.vy*dt;p.grounded=false;for(const floor of [...PLATFORMS].sort((a,b)=>a.y-b.y)){if(p.vy>=0&&p.x>=floor.x&&p.x<=floor.x+floor.w&&before<=floor.y+2&&p.y>=floor.y){p.y=floor.y;p.vy=0;p.grounded=true;break;}}}
  }
  if(input.attack)this.basicAttack();if(input.skill)this.useSkill();
  for(const drop of [...this.groundLoot])if(Math.abs(drop.x-p.x)<95&&Math.abs(drop.y-p.y)<55)this.collect(drop);
  const fighting=this.target?.kind==='enemy'||this.auto;
  for(const e of this.map.monsters){if(e.dead>0)continue;const same=Math.abs(e.y-p.y)<45,dx=p.x-e.x;
   if(!(same&&Math.abs(dx)<240&&fighting)){e.x=e.home+Math.sin(this.time*.65+e.phase)*20;}
   if(same&&Math.abs(dx)<240&&fighting){e.x+=Math.sign(dx)*Math.min(Math.abs(dx),40*dt);e.facing=dx>0?1:-1;}
   if(same&&Math.abs(dx)<90&&fighting){e.attack-=dt;if(e.attack<=0){const damage=Math.max(1,e.enemy.attack-c.gear.armor*2);c.hp=Math.max(0,c.hp-damage);e.attack=1.8;this.particle(p.x,p.y-80,`−${damage}`,'#ff9989');}}
  }
  if(c.hp<=0){p.respawn=3;this.target=null;this.auto=false;this.particle(p.x,p.y-120,'Recovering…','#ffcf8a');this.onEvent({type:'notice',text:'You were knocked out. Recovering at the entrance.'});}
  else if(!fighting)c.hp=Math.min(E.maxHp(c),c.hp+dt*(c.activity==='gather'?1:3));
  c.position={x:p.x,y:p.y};
 }
}
