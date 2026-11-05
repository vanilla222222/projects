import {CLASSES,AREAS,ENEMIES,ITEMS,SECRETS,CONSTELLATIONS,TELESCOPE,TRIAL_WAVES,areaById,zoneEnemy} from './content.mjs?v=16';
import {roomLayout,pointFor} from './layouts.mjs?v=16';
import * as E from './engine.mjs?v=16';
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
export const SECONDARY={warrior:{name:'Shield Bash',icon:'▣',cooldown:12,mult:1.5,range:145,aoe:true,stun:1.5,description:'Stun nearby enemies for 1.5 seconds.'},mage:{name:'Thorn Volley',icon:'❧',cooldown:10,mult:1.8,range:420,aoe:true,description:'Strike every enemy on your platform in range.'},blacksmith:{name:'Forge Sweep',icon:'⚒',cooldown:11,mult:2.1,range:160,aoe:true,description:'A broad hammer sweep.'},enchanter:{name:'Binding Roots',icon:'❋',cooldown:12,mult:1.4,range:270,aoe:true,stun:2,description:'Bind enemies for two seconds.'},alchemist:{name:'Volatile Brew',icon:'⚗',cooldown:12,mult:1.3,range:290,aoe:true,poison:true,description:'Splash foes and poison them for five seconds.'}};
export const UTILITY={warrior:{name:'Rally',icon:'⚑',cooldown:25,self:true,range:0,mult:0,heal:.2,buff:{type:'attack',value:.12,remaining:12},description:'Restore 20% health and gain 12% attack for 12s.'},mage:{name:'Windstep',icon:'➶',cooldown:22,self:true,range:0,mult:0,buff:{type:'speed',value:.3,remaining:12},description:'+30% movement speed for 12 seconds.'},blacksmith:{name:'Iron Skin',icon:'▱',cooldown:25,self:true,range:0,mult:0,buff:{type:'defense',value:4,remaining:15},description:'+4 defense for 15 seconds.'},enchanter:{name:'Warding Light',icon:'✦',cooldown:24,self:true,range:0,mult:0,heal:30,buff:{type:'defense',value:3,remaining:12},description:'Heal 30 and gain +3 defense for 12 seconds.'},alchemist:{name:'Restorative',icon:'♥',cooldown:25,self:true,range:0,mult:0,heal:.35,description:'Restore 35% maximum health.'}};
export function abilitySet(c){return[ABILITIES[c.class||'novice'],SECONDARY[c.class],UTILITY[c.class]];}
export function assignedAbilities(c){const all=abilitySet(c);return(c.hotbar||[0,1,2]).map(i=>all[i]);}
export function abilityAvailable(c,index){return index===0||!!c.class&&c.level>=(index===1?6:10)&&(c.classTalents?.[index===1?'secondary':'utility']||0)>0;}
export function createMap(area,index,boss=false,secret=null,trial=false){
 const layout=roomLayout(area,index,boss,secret);const town=!boss&&!secret&&['town','jungle-town'].includes(area),enemy=boss?ENEMIES.boss:secret?ENEMIES[SECRETS[secret]?.enemy]:zoneEnemy(area,index);
 const monsters=enemy?layout.spawns.map((p,i)=>({...p,ledgeMin:layout.platforms.find(f=>f.y===p.y&&p.x>=f.x&&p.x<=f.x+f.w).x+25,ledgeMax:(()=>{const f=layout.platforms.find(f=>f.y===p.y&&p.x>=f.x&&p.x<=f.x+f.w);return f.x+f.w-25;})(),home:p.x,id:`enemy-${i}`,kind:'enemy',enemy,hp:enemy.hp,dead:0,attack:1.5+i*.15,phase:i,facing:-1})):[];
 const resources=areaById(area).resources[index].map((resource,i)=>({id:`node-${i}`,kind:'node',resource,...(layout.resources[i]||layout.resources[0]||{x:425,y:GROUND}),progress:0}));
 const npcs=[];
 for(const[id,d]of Object.entries(CLASSES))if(!boss&&!secret&&area===d.town&&index===d.zone)npcs.push({id:'npc-'+id,kind:'npc',classId:id,name:d.trainer,...pointFor(layout,'npc-'+id)});
 if(area==='town'&&index===0)npcs.push({id:'npc-steward',kind:'npc',classId:null,role:'steward',name:'Hesta',...pointFor(layout,'npc-steward')});
 const station=area==='town'?(index===1?'anvil':index===2?'foundry':null):area==='jungle-town'?(index===0?'enchanting':index===1?'alchemy':null):null;
 const stations=station?[{id:'station',kind:'station',station,...pointFor(layout,'station'),name:station[0].toUpperCase()+station.slice(1)}]:[];
 const facilities=town?(area==='town'&&index===3?[{id:'stamps',kind:'stamps',name:'Stamp Registry',x:350,y:GROUND},{id:'statues',kind:'statues',name:'Statue Keeper',x:650,y:GROUND},{id:'vault',kind:'vault',name:'Upgrade Vault',x:1670,y:GROUND},{id:'tasks',kind:'tasks',name:'World Task Board',x:1990,y:GROUND},{id:'world-gate',kind:'worldgate',name:'World 2 Gate · dormant',x:1030,y:GROUND}]:index===0?[{id:'shop',kind:'shop',name:area==='town'?'Pip’s General Store':'Nori’s Supply Stall',x:area==='town'?680:565,y:GROUND}]:[]):[];
 for(const e of facilities)Object.assign(e,pointFor(layout,e.id));
 if(area===TELESCOPE.area&&index===TELESCOPE.zone&&!boss&&!secret)facilities.push({id:'telescope',kind:'telescope',name:'Crown Telescope',...pointFor(layout,'telescope')});if(town&&area==='town'&&index===3)facilities.push({id:'arena',kind:'arena',name:'Solo Trial Board',...pointFor(layout,'arena')});for(const d of CONSTELLATIONS)if(d.area===area&&d.zone===index&&(d.secret||null)===(secret||null)&&!boss)facilities.push({id:'constellation-'+d.id,kind:'constellation',constellation:d.id,name:d.name,x:d.x,y:d.y});
 const portals=roomPortals(area,index,boss,secret);
 const storage=town&&!secret?[{id:'storage',kind:'storage',name:'Storage Chest',x:160,y:GROUND}]:[];
 const discoveries=!secret&&!boss?Object.entries(SECRETS).filter(([id,d])=>d.area===area&&d.zone===index).map(([id,d])=>({id:'secret-'+id,kind:'discovery',secret:id,name:d.name,...pointFor(layout,'secret-'+id)})):[];
 if(trial){facilities.length=0;npcs.length=0;stations.length=0;resources.length=0;storage.length=0;discoveries.length=0;monsters.length=0;portals.splice(0,portals.length,{id:'portal-left',kind:'portal',x:65,y:GROUND,direction:-1,destination:{area,zone:index,entrance:'arena'},name:'Leave solo trial'});}
 return{area,index,boss,secret,town,trial,layout,height:layout.height,minY:layout.minY,width:layout.width,platforms:layout.platforms,ladders:layout.ladders,facilities,monsters,resources:secret?[]:resources,npcs:secret?[]:npcs,stations:secret?[]:stations,portals,discoveries,storage,entities:[...facilities,...storage,...monsters,...(secret?[]:resources),...(secret?[]:npcs),...(secret?[]:stations),...portals,...discoveries]};
}
export function nextRoute(area,index,direction){
 const zones=area==='town'?3:areaById(area).zones.length;
 if(area==='tree'){if(direction<0)return index?{area,zone:index-1}:{area:'forest',zone:4};return index<2?{area,zone:index+1}:{area:'forest',zone:4};}
 if(area==='town'&&index===3)return{area:'town',zone:0};
 if(direction<0){if(index>0)return{area,zone:index-1};return{town:['forest',0],forest:['town',0],caves:['town',2],jungle:['forest',4],deep:['caves',2],'jungle-town':['jungle',3]}[area].reduce((o,v,i)=>(o[i?'zone':'area']=v,o),{});}
 if(index<zones-1)return{area,zone:index+1};
 if(area==='jungle-town')return{boss:true};
 const dest={town:['caves',0],forest:['jungle',0],caves:['deep',0],jungle:['jungle-town',0],deep:['caves',2]}[area];return{area:dest[0],zone:dest[1]};
}
// Every doorway names both its destination room and the entrance in that room.
export function entrancePoint(id='portal-left',area='forest',index=0,boss=false,secret=null){const layout=roomLayout(area,index,boss,secret),point=pointFor(layout,id),facing=id==='portal-left'||id.startsWith('secret-')?1:-1;return{x:point.x+70*facing,y:point.y,facing};}
export function roomPortals(area,index,boss=false,secret=null){
 const make=(id,direction,to)=>{const point=pointFor(roomLayout(area,index,boss,secret),id);return{id,kind:'portal',...point,direction,destination:to,name:to.boss?'The Rootwarden':to.secret?SECRETS[to.secret].name:areaById(to.area).zones[to.zone]};};
 if(area==='tree')return[make('portal-left',-1,{...nextRoute(area,index,-1),entrance:index?'portal-right':'portal-tree'}),make('portal-right',1,{...nextRoute(area,index,1),entrance:index===2?'portal-tree-summit':'portal-left'})];
 if(area==='town'&&index===3&&!secret&&!boss)return[make('portal-left',-1,{area:'town',zone:0,entrance:'portal-town-square'})];
 if(secret)return[make('portal-left',-1,{area,zone:index,entrance:'secret-'+secret})];
 if(boss)return[make('portal-left',-1,{area,zone:index,entrance:'portal-right'})];
 const portals=[-1,1].map(direction=>{const route=nextRoute(area,index,direction),to=route.boss?{area,zone:index,boss:true,entrance:'portal-left'}:{...route};
  if(!to.entrance){if(area==='deep'&&index===3&&direction===1)to.entrance='portal-deep-return';else to.entrance=[-1,1].find(d=>{const back=nextRoute(to.area,to.zone,d);return !back.boss&&back.area===area&&back.zone===index;})===1?'portal-right':'portal-left';}
  return make(direction<0?'portal-left':'portal-right',direction,to);
 });
 // The deep-cavern loop has its own elevated doorway in the Echo Chamber.
 if(area==='town'&&index===0)portals.push(make('portal-town-square',0,{area:'town',zone:3,entrance:'portal-left'}));
 if(area==='forest'&&index===4){portals.push(make('portal-tree',0,{area:'tree',zone:0,entrance:'portal-left'}));portals.push({...make('portal-tree-summit',0,{area:'tree',zone:2,entrance:'portal-right'}),summit:true});}
 if(area==='caves'&&index===2)portals.push(make('portal-deep-return',0,{area:'deep',zone:3,entrance:'portal-right'}));
 return portals;
}
export function makePlayer(c,layout=roomLayout(c.area||'forest',c.zone||0,c.activity==='boss',c.secret||null)){const saved=c.position,x=Math.max(25,Math.min(layout.width-25,Number.isFinite(saved?.x)?saved.x:190)),y=layout.platforms.some(p=>p.y===saved?.y&&x>=p.x&&x<=p.x+p.w)?saved.y:GROUND;return{x,y,roomWidth:layout.width,roomMinY:layout.minY,roomHeight:layout.height,vx:0,vy:0,grounded:true,facing:saved?.facing===-1?-1:1,climbing:false,climbTo:null,attack:0,skill:0,cooldowns:[0,0,0],flash:0,walk:0,respawn:0};}
export class World {
 constructor(state,{onIntent=()=>{},onEvent=()=>{},rng=Math.random}={}){this.state=state;this.onIntent=onIntent;this.onEvent=onEvent;this.rng=rng;this.particles=[];this.drops=[];this.time=0;this.auto=false;this.enter();}
 get c(){return E.selected(this.state);}
 beginTrial(){this.collectAll();if(!E.startTrial(this.state,this.c))return false;this.enter(false);return true;}
 spawnTrialWave(){const run=this.c.trial;if(!run)return;const base=ENEMIES[TRIAL_WAVES[run.wave]],monsters=Array.from({length:4},(_,i)=>({id:'trial-'+run.wave+'-'+i,kind:'enemy',enemy:{...base,hp:Math.round(base.hp*.8)},x:700+i*330,y:GROUND,home:700+i*330,ledgeMin:25,ledgeMax:this.map.width-25,hp:Math.round(base.hp*.8),dead:0,attack:2+i*.2,phase:i}));this.map.entities=this.map.entities.filter(e=>e.kind!=='enemy').concat(monsters);this.map.monsters=monsters;this.target=null;this.auto=true;}
 endTrial(completed){const result=E.finishTrial(this.state,this.c,completed);this.enter(false);this.c.hp=Math.max(1,this.c.hp);this.onIntent({type:'trial-result',result});}

 enter(boss=this.c.activity==='boss'){this.map=createMap(this.c.area,this.c.zone,boss,this.c.secret||null,!!this.c.trial);this.player=makePlayer(this.c,this.map.layout);this.target=null;this.destination=null;this.pendingSkill=false;this.particles=[];this.drops=[];this.hazards=[];this.projectiles=[];this.groundLoot=(Array.isArray(this.c.groundLoot)?this.c.groundLoot:[]).filter(d=>d&&typeof d.id==='string'&&Number.isFinite(d.x)&&Number.isFinite(d.y)&&Number.isFinite(d.count)&&d.count>0&&(d.itemId==='coins'||ITEMS[d.itemId]));for(const d of this.groundLoot){d.collectAfter=0;d.x=Math.max(25,Math.min(this.map.width-25,d.x));const floors=this.map.platforms.filter(f=>d.x>=f.x&&d.x<=f.x+f.w&&f.y>=d.y).sort((a,b)=>a.y-b.y);d.y=(floors[0]||this.map.platforms[0]).y;}this.c.groundLoot=this.groundLoot;this.auto=['fight','boss','trial'].includes(this.c.activity);if(this.c.trial)this.spawnTrialWave();if(this.c.activity==='gather'){this.target=this.map.resources.find(e=>e.resource===this.c.resource)||null;}this.c.progress=0;this.key=`${this.c.id}:${this.c.area}:${this.c.zone}:${this.c.secret||''}:${!!this.c.trial}`;}
 switchCheck(){if(this.key!==`${this.c.id}:${this.c.area}:${this.c.zone}:${this.c.secret||''}:${!!this.c.trial}`)this.enter();}
 travel(area,index,destination=null){
 if(!E.zoneUnlocked(this.state,area,index))return false;if(this.c.trial)E.finishTrial(this.state,this.c,false);
 const from=this.map,back=roomPortals(area,index).find(p=>p.destination.area===from.area&&p.destination.zone===from.index&&!p.destination.boss&&!from.boss&&!from.secret),entrance=destination?.entrance||back?.id;
 if(destination?.boss&&!this.state.storyFlags.bossPermit)return false;
 if(destination?.secret&&!E.secretOpen(this.state,destination.secret))return false;
 this.collectAll();if(!E.travel(this.state,this.c,area,index))return false;
 this.c.secret=destination?.secret||null;this.c.activity=destination?.boss?'boss':'rest';
 this.c.entryPoint=entrance?entrancePoint(entrance,area,index,!!destination?.boss,destination?.secret||null):{x:190,y:GROUND,facing:1};this.c.position={...this.c.entryPoint};
 this.enter(!!destination?.boss);if(destination?.boss)this.findTarget();this.onEvent({type:'portal'});return true;
 }
 usePortal(portal){if(!this.map.portals.includes(portal))return false;if(portal.summit&&!this.state.stars.unlocked){this.onEvent({type:'notice',text:'Reach the telescope by climbing all three Elder Tree zones first.'});return false;}const to=portal.destination;if(this.travel(to.area,to.zone,to))return true;this.onEvent({type:'notice',text:to.boss?'Complete An Unquiet Seal with Mira to open the boss gate.':E.lockReason(this.state,to.area,to.zone)||'That route is not open yet.'});return false;}
 teleport(area,index,now=Date.now()){if(!E.teleportAllowed(this.state,this.c,area,index,now))return false;if(this.c.area===area&&this.c.zone===index&&!this.map.boss&&!this.map.secret&&!this.map.trial)return true;if(this.state.teleports.count<=0)return false;if(!this.travel(area,index))return false;this.state.teleports.count--;return true;}
 townReturn(area='town'){if(!['town','jungle-town'].includes(area)||!E.discovered(this.state,area,0)||!this.c.bag['town-teleport'])return false;if(this.c.area===area&&this.c.zone===0&&!this.map.boss&&!this.map.secret)return false;if(!this.travel(area,0))return false;this.c.bag['town-teleport']--;return true;}
 select(id){const entity=this.map.entities.find(e=>e.id===id);if(!entity||entity.kind==='enemy'&&entity.dead>0)return false;if(entity.kind==='node'&&E.gatherRequirement(this.c,entity.resource)){this.onEvent({type:'notice',text:E.gatherRequirement(this.c,entity.resource)});return false;}this.target=entity;this.destination=null;this.pendingSkill=false;if(entity.kind==='enemy'){this.c.activity=this.map.trial?'trial':this.map.boss?'boss':'fight';this.c.resource=null;}else if(entity.kind==='node'){this.c.activity='gather';this.c.resource=entity.resource;}else{this.c.activity='rest';this.auto=false;}this.c.progress=0;return true;}
 walkTo(x,y=GROUND){let floor=this.map.platforms.filter(p=>x>=p.x&&x<=p.x+p.w).sort((a,b)=>Math.abs(a.y-y)-Math.abs(b.y-y))[0]||this.map.platforms[0];this.destination={x:Math.max(25,Math.min(this.map.width-25,x)),y:floor.y};this.target=null;this.c.activity=this.map.trial?'trial':'rest';this.c.progress=0;this.auto=false;}
 stop(){this.target=null;this.destination=null;this.auto=false;this.c.activity=this.map.trial?'trial':'rest';this.c.progress=0;}
 toggleAuto(){if(!this.map.monsters.length){this.onEvent({type:'notice',text:'There are no enemies on this map.'});return false;}this.auto=!this.auto;if(this.auto){this.c.activity=this.map.trial?'trial':this.map.boss?'boss':'fight';this.findTarget();}else this.stop();return this.auto;}
 findTarget(){const p=this.player,nearest=this.map.monsters.filter(e=>e.dead<=0).sort((a,b)=>Math.abs(a.x-p.x)+Math.abs(a.y-p.y)*2-Math.abs(b.x-p.x)-Math.abs(b.y-p.y)*2)[0];if(nearest)this.target=nearest;}
 particle(x,y,text,color='#fff2a8'){if(this.state.options?.damageNumbers===false&&/^([0-9−]|MISS)/.test(String(text)))return;this.particles.push({x,y,text,color,life:1.2});}
 hit(e,mult=1){if(!e||e.dead>0)return;if(this.rng()>E.hitChance(this.c,e.enemy)){this.particle(e.x,e.y-62,'MISS','#adc2d4');return;}const spread=.8+.4*this.rng(),critical=this.rng()<E.critChance(this.c),guard=e.guarding?.65:1,damage=Math.max(1,Math.round(E.power(this.state,this.c)*spread*mult*(critical?2:1)*guard));e.hp-=damage;e.flash=.15;this.particle(e.x,e.y-62,critical?damage+'!':damage,critical?'#ffbd6a':'#fff2a8');this.onEvent({type:'hit'});if(e.hp<=0){e.hp=0;if(this.map.trial){e.dead=Infinity;this.c.trial.kills++;this.c.trial.score+=(this.c.trial.wave+1)*5;this.particle(e.x,e.y-90,'+'+((this.c.trial.wave+1)*5),'#ffd477');if(this.target===e)this.target=null;return;}e.dead=this.map.boss?Infinity:this.map.secret?9:5;const coins=this.state.coins,loot=E.grantKills(this.state,this.c,e.enemy,1,this.rng,{collect:false});this.particle(e.x,e.y-100,`+${e.enemy.xp} XP`,'#b8f3ff');const money=this.state.coins-coins;this.state.coins-=money;this.spawnLoot('coins',money,e.x,e.y);for(const drop of loot)this.spawnLoot(drop.id,drop.count,e.x+(this.groundLoot.length%3)*22,e.y);if(this.map.boss&&e.enemy.id==='boss'){this.hazards=[];for(const other of this.map.monsters)if(other!==e)other.dead=Infinity;this.collectAll();this.auto=false;this.c.activity='rest';this.onIntent({type:'victory'});}if(this.target===e)this.target=null;}}
 dropInventory(index,n=Infinity){const taken=E.takeSlot(this.c,index,n);if(!taken)return false;this.groundLoot.push({id:`loot-drop-${Date.now()}-${this.groundLoot.length}`,kind:'drop',...taken,x:Math.max(25,Math.min(this.map.width-25,this.player.x+this.player.facing*145)),y:this.player.y,collectAfter:this.time+2});this.c.groundLoot=this.groundLoot;return true;}
 spawnLoot(itemId,count,x,y){if(count<=0)return;const pile=this.groundLoot.find(d=>!d.gear&&d.itemId===itemId&&Math.abs(d.y-y)<30&&Math.abs(d.x-x)<90);if(pile){pile.count+=count;return;}this.groundLoot.push({id:`loot-${Date.now()}-${Math.floor(this.rng()*1000000)}-${this.groundLoot.length}`,kind:'drop',itemId,count,x,y});this.c.groundLoot=this.groundLoot;}
 collect(drop){if(!this.groundLoot.includes(drop))return false;let moved=drop.count;if(drop.itemId==='coins')this.state.coins+=moved;else{moved=drop.gear?(E.bagUsed(this.c)<E.bagCapacity(this.c)?(this.c.packGear.push(drop.gear),1):0):E.carry(this.c,drop.itemId,drop.count);if(!moved){if(this.auto){this.auto=false;this.target=null;this.c.activity='rest';}if(!this.lastFullNotice||this.time-this.lastFullNotice>5){this.lastFullNotice=this.time;this.onEvent({type:'notice',text:'Your backpack is full. Deposit items at a town chest.'});}return false;}this.onEvent({type:'loot',id:drop.itemId,count:moved});}this.drops.push({x:drop.x,y:drop.y-20,life:1.8,text:`+${moved} ${drop.itemId==='coins'?'◈':ITEMS[drop.itemId].name}`});drop.count-=moved;if(!drop.count)this.groundLoot.splice(this.groundLoot.indexOf(drop),1);this.c.groundLoot=this.groundLoot;return true;}
 collectAll(){for(const drop of [...this.groundLoot]){this.collect(drop);if(this.groundLoot.includes(drop)&&drop.itemId!=='coins'){if(drop.gear)this.c.packGear.push(drop.gear);else E.give(this.c,drop.itemId,drop.count);this.groundLoot.splice(this.groundLoot.indexOf(drop),1);}}this.c.groundLoot=this.groundLoot;}
 pickLoot(id){const drop=this.groundLoot.find(d=>d.id===id);if(!drop)return false;this.target=drop;this.destination=null;this.auto=false;return true;}
 basicAttack(){const p=this.player;if(p.attack>0||p.respawn>0)return false;let e=this.target?.kind==='enemy'?this.target:this.map.monsters.find(e=>e.dead<=0&&Math.abs(e.x-p.x)<110&&Math.abs(e.y-p.y)<65);if(!e||e.dead>0||Math.abs(e.x-p.x)>115||Math.abs(e.y-p.y)>65)return false;this.target=e;this.c.activity=this.map.trial?'trial':this.map.boss?'boss':'fight';p.facing=e.x>p.x?1:-1;p.attack=E.attackInterval(this.c);p.flash=.24;this.onEvent({type:'attack'});this.hit(e);return true;}
 useSkill(index=0,quiet=false){index=this.c.hotbar?.[index]??index;const p=this.player,abilities=abilitySet(this.c),ability=abilities[index];if(!ability||!abilityAvailable(this.c,index)){if(!quiet)this.onEvent({type:'notice',text:'Learn this ability in the class talent tab (level '+(index===1?6:10)+').'});return false;}const cooldown=index===0?p.skill:p.cooldowns[index];if(cooldown>0||p.respawn>0)return false;let targets=this.map.monsters.filter(e=>e.dead<=0&&Math.abs(e.x-p.x)<ability.range&&Math.abs(e.y-p.y)<80).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x));if(!targets.length&&!ability.self){if(!quiet)this.onEvent({type:'notice',text:'Move closer to an enemy first.'});return false;}const manaCost=[4,8,12][index];if(this.c.mp<manaCost){if(!quiet)this.onEvent({type:'notice',text:'Not enough mana. It regenerates over time.'});return false;}this.c.mp-=manaCost;if(targets.length&&!ability.self){this.target=targets[0];this.c.activity=this.map.trial?'trial':this.map.boss?'boss':'fight';}if(!ability.aoe)targets=targets.slice(0,1);for(const e of ability.self?[]:targets){this.hit(e,ability.mult*E.skillPower(this.c)*(index===1?1+Math.max(0,(this.c.classTalents?.secondary||0)-1)*.05:1));if(ability.stun)e.stun=ability.stun;if(ability.poison)e.poison={remaining:5,next:1,mult:.25};}if(index===0)p.skill=ability.cooldown;else p.cooldowns[index]=ability.cooldown;p.flash=.4;if(ability.heal)this.c.hp=Math.min(E.maxHp(this.c),this.c.hp+(ability.heal<=1?ability.heal*E.maxHp(this.c):ability.heal));if(ability.buff){this.c.buffs=this.c.buffs.filter(b=>b.source!=='ability'||b.type!==ability.buff.type);this.c.buffs.push({...ability.buff,remaining:ability.buff.remaining*(1+Math.max(0,(this.c.classTalents?.utility||0)-1)*.03),source:'ability'});}this.particle(p.x,p.y-110,ability.name,'#b4dcff');this.onEvent({type:'ability'});return true;}
 interact(){const p=this.player,near=this.map.entities.filter(e=>e.kind!=='enemy'&&Math.abs(e.x-p.x)<110&&Math.abs(e.y-p.y)<90).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];if(near){this.select(near.id);return true;}return this.basicAttack();}
 follow(dt){const p=this.player,t=this.target||this.destination;if(!t)return 0;const distance=Math.abs(t.x-p.x),range=t.kind==='enemy'?85:t.kind==='node'?58:t.kind?65:5;
  const currentFloor=this.map.platforms.find(f=>Math.abs(f.y-p.y)<3&&p.x>=f.x&&p.x<=f.x+f.w),targetFloor=this.map.platforms.find(f=>f.y===t.y&&t.x>=f.x&&t.x<=f.x+f.w);if(currentFloor&&targetFloor&&currentFloor!==targetFloor&&!p.climbing&&p.grounded){const queue=[{id:currentFloor.id,path:[]}],seen=new Set([currentFloor.id]);let path=null;while(queue.length){const n=queue.shift();if(n.id===targetFloor.id){path=n.path;break;}for(const l of this.map.ladders){const from=l.from||'ground',to=l.platform;if(from!==n.id&&to!==n.id)continue;const next=from===n.id?to:from;if(!seen.has(next)){seen.add(next);queue.push({id:next,path:[...n.path,{ladder:l,y:next===to?l.top:l.bottom}]});}}}const next=path?.[0];if(next){const ladder=next.ladder;if(Math.abs(p.x-ladder.x)<10){p.x=ladder.x;p.climbing=true;p.climbTo=next.y;p.ladder=ladder;p.vy=0;}else return Math.sign(ladder.x-p.x);}return 0;}
  if(p.climbing)return 0;
  if(Math.abs(t.y-p.y)<35&&distance<=range){
   if(t.kind==='enemy'){this.basicAttack();if(this.auto&&this.state.options?.autoSkills!==false)for(let slot=0;slot<3;slot++){const abilityIndex=this.c.hotbar?.[slot]??slot;if(abilityIndex!==2||this.c.hp<E.maxHp(this.c)*.6)this.useSkill(slot,true);}}
   else if(t.kind==='node'){if(E.carryRoom(this.c,t.resource)<1){this.stop();this.onEvent({type:'notice',text:'Backpack full. Deposit items at a town chest.'});return 0;}const requirement=E.gatherRequirement(this.c,t.resource);if(requirement){this.stop();this.onEvent({type:'notice',text:requirement});return 0;}this.c.activity='gather';this.c.resource=t.resource;this.c.progress+=dt;const interval=E.gatherInterval(this.c,t.resource);if(this.c.progress>=interval){this.c.progress-=interval;const odds=E.gatherOdds(this.c,t.resource),yielded=E.gatherYield(this.c,E.successes(1,odds.chance,this.rng),this.rng)*odds.multi;E.recordGather(this.state,this.c,t.resource,yielded,this.rng);E.give(this.c,t.resource,yielded);E.grantGatherStatues(this.c,t.resource,1,this.rng);E.skillXp(this.c,E.gatherSkill(t.resource),2);E.gainXp(this.c,.4);p.flash=.25;this.particle(t.x,t.y-100,yielded?'+'+yielded:'Miss','#c1ef8f');this.onEvent({type:'loot',id:t.resource,count:yielded});this.onEvent({type:'gather',resource:t.resource});}}
   else if(t.kind==='drop'){this.collect(t);this.target=null;}
   else if(t.kind==='discovery'){this.target=null;if(!this.travel(this.c.area,this.c.zone,{secret:t.secret,entrance:'portal-left'}))this.onEvent({type:'notice',text:t.secret==='sunwell'?'Complete Letters from the Canopy with Willow.':'Complete Outpost Supplies and train all five class professions to level 2.'});}
   else if(t.kind==='portal'){this.target=null;this.usePortal(t);}
   else if(t.kind){this.target=null;this.onIntent({type:t.kind,entity:t});}
   else this.destination=null;
   return 0;
  }
  return Math.sign(t.x-p.x);
 }
 hurt(base){const damage=Math.max(1,Math.round(base-E.defense(this.state,this.c)));this.c.hp=Math.max(0,this.c.hp-damage);E.useFood(this.c,E.maxHp(this.c));this.particle(this.player.x,this.player.y-80,'−'+damage,'#ff9989');this.onEvent({type:'hurt'});}
 resolveAttack(e){const tell=e.telegraph,p=this.player,kind=tell.kind,base=e.enemy.attack;
  if(kind==='bolt'){this.hazards.push({kind:'bolt',x:e.x,y:e.y-55,vx:tell.direction*280,width:22,height:27,damage:base,life:4});}
  else if(kind==='charge'){const end=Math.max(e.ledgeMin||25,Math.min(e.ledgeMax||this.map.width-25,e.x+tell.direction*210)),lo=Math.min(e.x,end),hi=Math.max(e.x,end);if(p.x>lo-30&&p.x<hi+30&&Math.abs(p.y-e.y)<45)this.hurt(base*1.4);e.x=end;this.particle(e.x,e.y-70,'CHARGE','#ffcf8c');}
  else if(kind==='rootwave'){this.hazards.push({kind:'wave',x:e.x,y:GROUND-20,vx:tell.direction*290,width:35,height:35,damage:base*1.3,life:4});if((e.phaseLevel||1)>=2)this.hazards.push({kind:'bolt',x:e.x,y:GROUND-130,vx:tell.direction*250,width:23,height:28,damage:base,life:4});}
  else{const range=kind==='slam'?125:85;if(Math.abs(p.x-e.x)<range&&Math.abs(p.y-e.y)<45)this.hurt(base*(kind==='slam'?1.25:1));this.particle(e.x,e.y-65,kind==='slam'?'SLAM':'!', '#ffd59b');}
 }
 step(dt,input={}){
  if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.06);this.switchCheck();this.time+=dt;const p=this.player,c=this.c;
  p.attack=Math.max(0,p.attack-dt);p.skill=Math.max(0,p.skill-dt);p.cooldowns=p.cooldowns.map(n=>Math.max(0,n-dt));E.advanceBuffs(c,dt);E.regenerate(c,dt,E.maxHp(c));p.flash=Math.max(0,p.flash-dt);
  for(const e of this.map.monsters){e.flash=Math.max(0,(e.flash||0)-dt);if(e.dead>0){e.dead-=dt;if(e.dead<=0){e.dead=0;e.hp=e.enemy.hp;e.attack=1.5;e.telegraph=null;}}}
  for(const particle of this.particles){particle.life-=dt;particle.y-=dt*35;}this.particles=this.particles.filter(p=>p.life>0);for(const d of this.drops)d.life-=dt;this.drops=this.drops.filter(d=>d.life>0);
  if(p.respawn>0){p.respawn-=dt;if(p.respawn<=0){const spawn=this.c.entryPoint?makePlayer({position:this.c.entryPoint},this.map.layout):{x:190,y:GROUND};p.x=spawn.x;p.y=spawn.y;p.facing=spawn.facing||1;p.vy=0;p.grounded=true;c.hp=E.maxHp(c);this.stop();}return;}
  if(input.horizontal||input.vertical||input.jump){this.target=null;this.destination=null;this.auto=false;c.activity=this.map.trial?'trial':'rest';c.progress=0;}
  if(this.target?.kind==='enemy'&&this.target.dead>0)this.target=null;
  if(this.auto&&!this.target)this.findTarget();
  let direction=input.horizontal||0;
  if(!direction&&!input.vertical)direction=this.follow(dt);
  if(p!==this.player)return; // A doorway replaced the room; do not save source-room coordinates.
  if(p.climbing){
   if(p.climbTo!==null){const sign=Math.sign(p.climbTo-p.y);p.y+=sign*220*dt;if(Math.abs(p.climbTo-p.y)<8){p.y=p.climbTo;p.climbing=false;p.climbTo=null;p.grounded=true;}}
   else{p.y-=input.vertical*220*dt;if(p.y<=p.ladder.top){p.y=p.ladder.top;p.climbing=false;p.grounded=true;}if(p.y>=p.ladder.bottom){p.y=p.ladder.bottom;p.climbing=false;p.grounded=true;}}
   if(input.horizontal){p.climbing=false;p.climbTo=null;p.grounded=false;}
  }else{
   if(input.vertical){const ladder=this.map.ladders.find(l=>Math.abs(l.x-p.x)<30&&p.y>=l.top-8&&p.y<=l.bottom+8);if(ladder){p.x=ladder.x;p.ladder=ladder;p.climbing=true;p.climbTo=null;p.grounded=false;}}
   if(input.jump&&p.grounded){p.vy=-535;p.grounded=false;}
   const before=p.y;p.vx=direction*E.movementSpeed(c);p.x=Math.max(20,Math.min(this.map.width-20,p.x+p.vx*dt));if(direction){p.facing=Math.sign(direction);p.walk+=dt*10;}
   if(!p.climbing){p.vy+=1250*dt;p.y+=p.vy*dt;p.grounded=false;for(const floor of [...this.map.platforms].sort((a,b)=>a.y-b.y)){if(p.vy>=0&&p.x>=floor.x&&p.x<=floor.x+floor.w&&before<=floor.y+2&&p.y>=floor.y){p.y=floor.y;p.vy=0;p.grounded=true;break;}}}
  }
  if(input.attack)this.basicAttack();if(input.skill)this.useSkill();
  for(const drop of [...this.groundLoot])if(this.state.options?.autoPickup!==false&&((!drop.collectAfter||this.time>=drop.collectAfter)&&Math.abs(drop.x-p.x)<95&&Math.abs(drop.y-p.y)<55))this.collect(drop);
  const fighting=this.target?.kind==='enemy'||this.auto;
  for(const e of this.map.monsters){
   if(e.dead>0)continue;
   if(e.poison){e.poison.remaining-=dt;e.poison.next-=dt;if(e.poison.next<=0){e.poison.next+=1;this.hit(e,e.poison.mult);}if(e.poison.remaining<=0)e.poison=null;if(e.dead>0)continue;}
   if((e.stun||0)>0){e.stun-=dt;continue;}
   const same=Math.abs(e.y-p.y)<50,dx=p.x-e.x,engaged=same&&Math.abs(dx)<(e.enemy.behavior==='bolt'?380:270)&&fighting;
   e.guarding=e.enemy.behavior==='guard'&&Math.floor(this.time/3)%2===0;
   if(e.enemy.id==='boss'&&fighting){const phase=e.hp/e.enemy.hp<.3?3:e.hp/e.enemy.hp<.65?2:1;if(phase>(e.phaseLevel||1)){e.phaseLevel=phase;this.particle(e.x,e.y-230,'PHASE '+phase,'#ffa588');this.onEvent({type:'boss-phase'});for(let i=0;i<2;i++){const enemy={...ENEMIES['jungle-0'],id:'boss-rootling',name:'Rootling',hp:35,attack:3,xp:4,coins:1},add={id:'add-'+phase+'-'+i,kind:'enemy',enemy,x:e.x-400+i*450,home:e.x-400+i*450,ledgeMin:25,ledgeMax:this.map.width-25,y:GROUND,hp:35,dead:0,attack:1.5,phase:i};this.map.monsters.push(add);this.map.entities.push(add);}}}
   if(e.telegraph){e.telegraph.remaining-=dt;if(e.telegraph.remaining<=0){this.resolveAttack(e);e.telegraph=null;e.attack=e.enemy.id==='boss'?2.6:2;}continue;}
   if(!engaged){e.x=e.home+Math.sin(this.time*.65+e.phase)*20;continue;}
   const behavior=e.enemy.behavior||'hop';
   if(Math.abs(dx)>85&&behavior!=='bolt')e.x+=Math.sign(dx)*Math.min(Math.abs(dx),45*dt);
   e.x=Math.max(e.ledgeMin||25,Math.min(e.ledgeMax||this.map.width-25,e.x));e.facing=dx>0?1:-1;e.attack-=dt;
   if(e.attack<=0&&(Math.abs(dx)<(behavior==='bolt'?380:behavior==='rootwave'?500:behavior==='charge'?240:150))){e.telegraph={kind:behavior,remaining:e.enemy.windup||1,total:e.enemy.windup||1,x:p.x,direction:Math.sign(dx)||-1};this.onEvent({type:'warning'});}
  }
  for(const hazard of this.hazards){hazard.life-=dt;hazard.x+=(hazard.vx||0)*dt;if(!hazard.hit&&Math.abs(hazard.x-p.x)<hazard.width&&Math.abs((hazard.y||GROUND)-(p.y-35))<hazard.height){hazard.hit=true;this.hurt(hazard.damage);}}
  this.hazards=this.hazards.filter(h=>h.life>0&&h.x>-60&&h.x<this.map.width+60);
  if(this.c.trial){this.c.trial.time=Math.max(0,this.c.trial.time-dt);if(c.hp<=0||this.c.trial.time<=0){this.endTrial(false);return;}if(this.map.monsters.every(e=>e.dead>0)){if(this.c.trial.wave>=TRIAL_WAVES.length-1){this.endTrial(true);return;}this.c.trial.wave++;this.spawnTrialWave();}}
  if(c.hp<=0){p.respawn=3;this.target=null;this.auto=false;this.particle(p.x,p.y-120,'Recovering…','#ffcf8a');this.onEvent({type:'notice',text:'You were knocked out. Recovering at the entrance.'});}
  else if(!fighting)c.hp=Math.min(E.maxHp(c),c.hp+dt*(c.activity==='gather'?1:3));
  c.position={x:p.x,y:p.y,facing:p.facing};
 }
}
