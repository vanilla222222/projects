import assert from 'node:assert/strict';
import * as E from './engine.mjs?v=8';
import * as D from './content.mjs?v=8';
import {World} from './world.mjs?v=8';
export function runWorldOne({rng=()=>.5}={}){
 const s=E.freshSave(),events=[];let seconds=0,depth=0;
 const hero=s.characters[0];
 const tick=n=>{E.advance(s,n,rng);seconds+=n;};
 const use=c=>{s.active=c.id;};
 const bank=c=>{use(c);E.travel(s,c,'town',0);c.position=null;E.reclaim(c);E.depositAll(s,c);E.reclaim(c);E.depositAll(s,c);};
 const bankAll=()=>{for(const c of s.characters)bank(c);};
 const stock=id=>(s.inventory[id]||0);
 const available=(id,c)=>E.amount(s,id,c);
 const worker=skill=>s.characters.find(c=>c.class&&D.CLASSES[c.class].skill===skill)||hero;
 function fight(c,area,zone,count){use(c);assert.ok(E.travel(s,c,area,zone),`route ${area}:${zone}`);assert.ok(E.start(s,c,'fight'));const id=`${area}-${zone}`,target=(s.kills[id]||0)+count;let guard=0;while((s.kills[id]||0)<target&&guard++<2000){tick(10);if(c.activity==='rest')throw Error(`Combat stall at ${id}; attack=${E.power(s,c)}, hp=${E.maxHp(c)}`);}assert.ok((s.kills[id]||0)>=target,id);E.start(s,c,'rest');bank(c);}
 function ensureTool(c,resource){const need=E.gatherRequirement(c,resource);if(!need)return;const skill=E.gatherSkill(resource),level={birch:2,iron:3,'jungle-wood':3,gold:5}[resource]||1;if(E.skillLevel(c,skill)<level){const raw=skill==='mining'?'copper':'oak',required=Math.max(1,Math.ceil((12*(level-1)**2-c.skills[skill])/2));gather(c,raw,required);}
  const base=skill==='mining'?(resource==='gold'?'iron-pick':'copper-pick'):'copper-axe',slot=D.EQUIPMENT[base].slot;if(E.gatherRequirement(c,resource)&&!c.loadout[slot])gear(base,c);else if(resource==='gold'&&c.loadout.pick?.base!=='iron-pick')gear(base,c);
 }
 function gather(c,id,n){const routes={oak:['forest',0],birch:['forest',2],'jungle-wood':['jungle',0],copper:['caves',0],iron:['deep',0],gold:['deep',2]},[area,zone]=routes[id];ensureTool(c,id);use(c);assert.ok(E.travel(s,c,area,zone));assert.ok(E.start(s,c,'gather',id),`${id}: ${E.gatherRequirement(c,id)}`);const initial=(c.bag[id]||0)+(c.overflow[id]||0),target=initial+n;let guard=0;while((c.bag[id]||0)+(c.overflow[id]||0)<target&&guard++<5000)tick(5);assert.ok(guard<5000,`gather stalled ${id}`);E.start(s,c,'rest');bank(c);}
 function material(id,n,forced=null){if(stock(id)>=n)return;if(++depth>30)throw Error('Recipe dependency cycle: '+id);try{const shortage=n-stock(id),raw=['oak','birch','jungle-wood','copper','iron','gold'];if(raw.includes(id)){gather(worker(E.gatherSkill(id)),id,shortage);return;}
  const source=Object.values(D.ENEMIES).find(e=>e.loot.some(d=>d.id===id&&d.chance>=.5)&&/^(forest|caves|jungle|deep)-/.test(e.id));if(source){fight(hero,source.area,source.index,Math.ceil(shortage/.65)+3);return;}
  const r=D.RECIPES.find(r=>r.output===id);if(!r)throw Error('No common source for '+id);if(!E.recipeOpen(s,r))throw Error('Locked recipe '+r.id+' needs '+r.unlock);const crafter=forced||worker(r.skill),yieldPer=r.count*(crafter.class&&D.CLASSES[crafter.class].skill===r.skill?2:1),batches=Math.ceil(shortage/yieldPer);
  ensureCosts(Object.fromEntries(Object.entries(r.cost).map(([k,q])=>[k,q*batches])));
  use(crafter);const where=r.station==='foundry'?['town',2]:r.station==='alchemy'?['jungle-town',1]:r.station==='enchanting'?['jungle-town',0]:['town',1];assert.ok(E.travel(s,crafter,...where));
  if(r.station==='foundry'){let left=batches;while(left){const count=Math.min(20,left);assert.ok(E.enqueue(s,crafter,r.id,count),`enqueue ${id}, coins ${s.coins}`);while(s.jobs.length)tick(5);left-=count;}}
  else for(let i=0;i<batches;i++)assert.ok(E.craft(s,crafter,r.id),'craft '+id+' coins '+s.coins+' cost '+JSON.stringify(Object.entries(r.cost).map(([k,n])=>[k,stock(k),n])));
  bank(crafter);assert.ok(stock(id)>=n,`stock ${id}: ${stock(id)}/${n}`);
 }finally{depth--;}}
 function ensureCosts(cost){let guard=0;while(!Object.entries(cost).every(([id,n])=>stock(id)>=n)&&guard++<20)for(const[id,n]of Object.entries(cost))material(id,n);assert.ok(guard<20,'overlapping ingredient cycle');}
 function gear(base,target){const def=D.EQUIPMENT[base],r=D.RECIPES.find(r=>r.equipment===base);assert.ok(r);assert.ok(E.recipeOpen(s,r),`gear unlock ${base}`);ensureCosts(r.cost);const crafter=worker('smithing');use(crafter);E.travel(s,crafter,'town',1);const uid=s.nextEquipmentId;assert.ok(E.craft(s,crafter,r.id),'gear '+base);if(crafter.loadout[def.slot]?.uid===uid){if(crafter===target)return;assert.ok(E.unequip(s,crafter,def.slot));}bank(crafter);assert.ok(E.depositGear(s,crafter,uid));bank(target);assert.ok(E.withdrawGear(s,target,uid));assert.ok(E.equip(s,target,uid));}
 function expand(id,c=hero){material(id,1);bank(c);assert.ok(E.withdraw(s,c,id,1));assert.ok(E.useExpansion(s,c,id));bank(c);}
 function story(id){const q=D.STORY.find(q=>q.id===id);for(const[k,n]of Object.entries(q.deliver||{}))material(k,n);bankAll();use(hero);const giver=q.giver==='steward'?{town:'town'}:D.CLASSES[q.giver];E.travel(s,hero,giver.town,q.giver==='alchemist'?1:0);assert.ok(E.acceptQuest(s,id),'accept '+id);assert.ok(E.questStatus(s,id).ready,`quest ${id}: ${JSON.stringify(E.questStatus(s,id).tasks)}`);assert.ok(E.claimQuest(s,hero,id,q.giver),'claim '+id);events.push({event:id,minutes:+(seconds/60).toFixed(2)});bank(hero);}
 function initiation(c,id){use(c);while(c.level<3)fight(c,'forest',0,8);const def=D.CLASSES[id];E.travel(s,c,def.town,id==='alchemist'?1:0);assert.ok(E.progressClass(s,c,id),'first step '+id);
  if(['mining','logging'].includes(def.skill)){gather(c,def.skill==='mining'?'copper':'oak',Math.max(30,Math.ceil((12-c.skills[def.skill])/2)));}
  else if(def.skill==='smithing'){material('oak',6);use(c);E.travel(s,c,'town',2);assert.ok(E.enqueue(s,c,'charcoal',2));while(s.jobs.length)tick(5);bank(c);}
  else{const r=D.RECIPES.find(r=>r.id===(id==='enchanter'?'dust':'tonic'));for(const[k,n]of Object.entries(r.cost))material(k,n*2);use(c);E.travel(s,c,def.town,id==='alchemist'?1:0);assert.ok(E.craft(s,c,r.id));assert.ok(E.craft(s,c,r.id));bank(c);}
  for(const[k,n]of Object.entries(def.needs))material(k,n);use(c);E.travel(s,c,def.town,id==='alchemist'?1:0);assert.ok(E.progressClass(s,c,id),'practice '+id);assert.ok(E.progressClass(s,c,id),'deliver '+id);events.push({event:'class-'+id,minutes:+(seconds/60).toFixed(2)});bank(c);
 }
 fight(hero,'forest',0,24);initiation(hero,'warrior');story('first-roots');E.withdraw(s,hero,'woven-pouch',1);E.useExpansion(s,hero,'woven-pouch');bank(hero);
 E.createCharacter(s,'Willow’s Apprentice');const mage=E.selected(s);initiation(mage,'mage');story('tools');expand('wooden-crate');gear('copper-sword',hero);gear('copper-mail',hero);gear('copper-pick',hero);gear('copper-axe',mage);
 for(const area of ['forest','caves'])for(let zone=0;zone<D.areaById(area).zones.length;zone++)if((s.kills[`${area}-${zone}`]||0)<16)fight(hero,area,zone,16-(s.kills[`${area}-${zone}`]||0));
 story('under-roots');expand('iron-lockbox');gear('iron-sword',hero);gear('iron-pick',hero);gear('iron-mail',hero);story('canopy-letter');
 E.createCharacter(s,'Flint’s Apprentice');initiation(E.selected(s),'blacksmith');
 for(const area of ['jungle','deep'])for(let zone=0;zone<D.areaById(area).zones.length;zone++)if((s.kills[`${area}-${zone}`]||0)<16)fight(hero,area,zone,16-(s.kills[`${area}-${zone}`]||0));
 E.createCharacter(s,'Mira’s Apprentice');initiation(E.selected(s),'enchanter');E.createCharacter(s,'Fern’s Apprentice');initiation(E.selected(s),'alchemist');story('outpost');expand('runed-cabinet');story('seal');
 gear('warden-blade',hero);gear('tempered-mail',hero);gear('iron-helm',hero);gear('birch-boots',hero);
 material('mining-tonic',1);bank(hero);E.withdraw(s,hero,'mining-tonic',1);assert.ok(E.drink(s,hero,'mining-tonic'));
 material('dust',8);material('bat-fang',6);use(hero);E.travel(s,hero,'jungle-town',0);assert.ok(E.enchant(s,hero,'weapon','force',0));assert.ok(E.enchant(s,hero,'weapon','force',1));
 bankAll();use(hero);E.travel(s,hero,'jungle-town',2);const world=new World(s,{rng});assert.ok(world.select('portal-right'));
 let frames=0;while(!s.bossDefeated&&frames++<18000){const boss=world.map.monsters.find(e=>e.enemy.id==='boss');if(world.map.boss&&boss){if(!world.auto)world.toggleAuto();if(hero.level>=10&&hero.hp<E.maxHp(hero)*.7)world.useSkill(2,true);}world.step(.02);seconds+=.02;}
 assert.ok(s.bossDefeated,`Boss did not fall: ${hero.hp} hp, level ${hero.level}, power ${E.power(s,hero)}, frames ${frames}, room ${world.map.area}/${world.map.index}, boss ${world.map.boss}, position ${world.player.x}/${world.player.y}, target ${world.target?.id}, hp ${world.map.monsters[0]?.hp}`);bank(hero);story('heart');
 assert.equal(s.storyFlags.complete,true);assert.equal(s.unlockedClasses.length,5);assert.equal(E.slots(s),6);assert.ok(E.restoreSave(JSON.parse(JSON.stringify(s))));
 return{seconds,minutes:+(seconds/60).toFixed(2),events,level:hero.level,attack:E.power(s,hero),defense:E.defense(s,hero),chestSlots:E.chestUsed(s),chestCapacity:E.chestCapacity(s),characters:s.characters.map(c=>({name:c.name,class:c.class,bagSlots:E.bagUsed(c),capacity:E.bagCapacity(c)})),storyComplete:s.storyFlags.complete,state:s};
}
if(process.argv[1]?.endsWith('world1-sim.mjs')){const{state,...result}=runWorldOne();console.log(JSON.stringify(result,null,2));}
