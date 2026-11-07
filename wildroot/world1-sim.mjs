import assert from 'node:assert/strict';
import * as E from './engine.mjs?v=40';
import * as D from './content.mjs?v=40';
import {World} from './world.mjs?v=43';
export function runWorldOne({rng=()=>.5,completeNpcChains=false,starter='warrior'}={}){
 assert.ok(['warrior','mage','blacksmith'].includes(starter),'Starter trainer must be in the first settlement or its adjacent skill rooms.');
 const s=E.freshSave(),events=[];let seconds=0,depth=0;
 const hero=s.characters[0];
 const tick=n=>{E.advance(s,n,rng);seconds+=n;};
 const use=c=>{s.active=c.id;};
 const needed=new Set([...D.STORY.flatMap(q=>Object.keys(q.deliver||{})),...D.RECIPES.filter(r=>!r.retired).flatMap(r=>Object.keys(r.cost).filter(id=>D.ITEMS[id].rarity==='common')),...Object.values(D.CLASSES).flatMap(d=>Object.keys(d.needs))]);
 const spareDrop=id=>!needed.has(id)&&Object.values(D.ENEMIES).some(e=>e.loot.some(d=>d.id===id))||!needed.has(id)&&[...D.WORLD_LOOT,...D.GLOBAL_LOOT].some(d=>d.id===id);
 const bank=c=>{use(c);for(const items of Object.values(D.QUEST_UPGRADES))for(const id of Object.keys(items))if(c.bag[id]){if(D.EXPANSIONS[id])E.useExpansion(s,c,id);if(D.CAPACITY_BAGS[id])E.useCapacityBag(c,id);}
  if(Object.keys(c.bag).some(id=>c.bag[id]&&spareDrop(id))||Object.keys(c.overflow).some(id=>c.overflow[id]&&spareDrop(id))){E.travel(s,c,'town',2);c.position={x:1520,y:644};let again=true;while(again){again=false;for(let i=E.bagSlots(c).length-1;i>=0;i--){const t=E.itemSlot(c,i);if(t&&!t.gear&&spareDrop(t.id)){const n=E.spareQuantity(s,c,i);if(n)assert.ok(E.reclaimItem(s,c,i,n));}}if(E.reclaim(c))again=true;}}
  E.travel(s,c,'town',0);c.position=null;E.reclaim(c);E.depositAll(s,c);E.reclaim(c);E.depositAll(s,c);};
 const bankAll=()=>{for(const c of s.characters)bank(c);};
 const stock=id=>(s.inventory[id]||0);
 const available=(id,c)=>E.amount(s,id,c);
 const worker=skill=>s.characters.find(c=>c.class&&D.CLASSES[c.class].skill===skill)||hero;
 function openRoute(c,area,zone){const req=E.routeRequirement(area,zone);if(!req||E.zoneUnlocked(s,area,zone,c))return;const fighter=req.shared?hero:c;openRoute(fighter,req.area,req.index);const missing=req.goal-((req.shared?s.kills:c.journey.kills)[req.id]||0);if(missing>0)fight(fighter,req.area,req.index,missing);}
 function trainBuild(c){if(c.class){E.investAttribute(c,E.CLASS_DESIGNS[c.class].accuracy,Math.ceil(E.attributePoints(c)/2)||1);E.investAttribute(c,E.CLASS_DESIGNS[c.class].primary,E.attributePoints(c)||1);}E.syncAccount(s);for(const id of ['precision','vitality','haste'])while(E.combatPoints(c)&&c.talents[id]<5)E.train(c,id);for(const id of ['power','precision','vitality','haste','signature','industry'])while(E.combatPoints(c)&&E.train(c,id)){}}
 function fight(c,area,zone,count){openRoute(c,area,zone);trainBuild(c);use(c);assert.ok(E.travel(s,c,area,zone),`route ${area}:${zone}`);assert.ok(E.start(s,c,'fight'));const id=`${area}-${zone}`,target=(s.kills[id]||0)+count;let guard=0;while((s.kills[id]||0)<target&&guard++<2000){tick(10);if(c.activity==='rest')throw Error(`Combat stall at ${id}; attack=${E.power(s,c)}, hp=${E.maxHp(c)}`);}assert.ok((s.kills[id]||0)>=target,id);E.start(s,c,'rest');bank(c);}
 function ensureTool(c,resource){const need=E.gatherRequirement(c,resource);if(!need)return;const skill=E.gatherSkill(resource),level={birch:2,iron:3,'jungle-wood':3,gold:5}[resource]||1;let training=0;while(E.skillLevel(c,skill)<level){assert.ok(training++<20,'Gathering skill training stalled');const raw=skill==='mining'?'copper':'oak',required=Math.max(4,Math.ceil((12*(level-1)**2-c.skills[skill])/2));gather(c,raw,required);}
  const base=skill==='mining'?(resource==='gold'?'iron-pick':'copper-pick'):'copper-axe',slot=D.EQUIPMENT[base].slot;if(E.gatherRequirement(c,resource)&&!c.loadout[slot])gear(base,c);else if(resource==='gold'&&c.loadout.pick?.base!=='iron-pick')gear(base,c);
 }
 function gather(c,id,n){const routes={oak:['forest',0],birch:['forest',2],'jungle-wood':['jungle',0],copper:['caves',0],iron:['deep',0],gold:['deep',2]},[area,zone]=routes[id];ensureTool(c,id);openRoute(c,area,zone);use(c);assert.ok(E.travel(s,c,area,zone));assert.ok(E.start(s,c,'gather',id),`${id}: ${E.gatherRequirement(c,id)}`);const initial=(c.bag[id]||0)+(c.overflow[id]||0),target=initial+n;let guard=0;while((c.bag[id]||0)+(c.overflow[id]||0)<target&&guard++<5000)tick(5);assert.ok(guard<5000,`gather stalled ${id}`);E.start(s,c,'rest');bank(c);}
 function material(id,n,forced=null){if(stock(id)>=n)return;if(++depth>30)throw Error('Recipe dependency cycle: '+id);try{const shortage=n-stock(id);if(D.ANVIL_PRODUCTS[id]){const c=worker('smithing');use(c);E.travel(s,c,'town',1);c.position={x:1390,y:644};assert.ok(E.chooseProduct(c,id,s));let guard=0;while((c.anvil.stored[id]||0)<shortage&&guard++<5000)tick(5);assert.ok(E.claimAnvil(s,c,id));bank(c);return;}const raw=['oak','birch','jungle-wood','copper','iron','gold'];if(raw.includes(id)){gather(worker(E.gatherSkill(id)),id,shortage);return;}
  const source=Object.values(D.ENEMIES).find(e=>e.loot.some(d=>d.id===id&&d.chance>=.5)&&/^(forest|caves|jungle|deep)-/.test(e.id));if(source){fight(hero,source.area,source.index,Math.ceil(shortage/.65)+3);return;}
  if(D.WORLD_LOOT.some(d=>d.id===id)||id==='statue-power'){let guard=0;while(stock(id)<n&&guard++<60)fight(hero,'forest',0,100);assert.ok(stock(id)>=n,'farm '+id);return;}const r=D.RECIPES.find(r=>r.output===id);if(!r)throw Error('No common source for '+id);ensurePage(r);if(!E.recipeOpen(s,r))throw Error('Locked recipe '+r.id+' needs '+r.unlock);const crafter=forced||worker(r.skill),yieldPer=r.count*(crafter.class&&D.CLASSES[crafter.class].skill===r.skill?2:1),batches=Math.ceil(shortage/yieldPer);
  ensureCosts(Object.fromEntries(Object.entries(r.cost).map(([k,q])=>[k,q*batches])));
  use(crafter);const where=r.station==='foundry'?['town',2]:r.station==='alchemy'?['jungle-town',1]:r.station==='enchanting'?['jungle-town',0]:['town',1];assert.ok(E.travel(s,crafter,...where));crafter.position={x:{anvil:1390,foundry:1520,alchemy:1510,enchanting:1700}[r.station],y:644};
  if(r.station==='foundry'){let left=batches;while(left){const count=Math.min(20,left);assert.ok(E.enqueue(s,crafter,r.id,count),`enqueue ${id}, coins ${s.coins}`);while(s.jobs.length)tick(5);left-=count;}}
  else for(let i=0;i<batches;i++)assert.ok(E.craft(s,crafter,r.id),'craft '+id+' coins '+s.coins+' cost '+JSON.stringify(Object.entries(r.cost).map(([k,n])=>[k,stock(k),n])));
  bank(crafter);assert.ok(stock(id)>=n,`stock ${id}: ${stock(id)}/${n}`);
 }finally{depth--;}}
 function ensureCosts(cost){let guard=0;while(!Object.entries(cost).every(([id,n])=>stock(id)>=n)&&guard++<20)for(const[id,n]of Object.entries(cost))material(id,n);assert.ok(guard<20,'overlapping ingredient cycle');}
 function ensurePage(r){const page=E.recipePage(r);while(s.workshop.pages<page){const next=s.workshop.pages+1,id='anvil-expansion-'+next;material(id,1);const crafter=worker('smithing');bank(crafter);E.withdraw(s,crafter,id,1);use(crafter);E.travel(s,crafter,'town',1);crafter.position={x:1390,y:644};assert.ok(E.useAnvilExpansion(s,crafter,next));bank(crafter);}}
 function gear(base,target){const def=D.EQUIPMENT[base],r=D.RECIPES.find(r=>r.equipment===base);assert.ok(r);ensurePage(r);assert.ok(E.recipeOpen(s,r),`gear unlock ${base}`);ensureCosts(r.cost);const crafter=worker('smithing');use(crafter);E.travel(s,crafter,'town',1);crafter.position={x:1390,y:644};const uid=s.nextEquipmentId;assert.ok(E.craft(s,crafter,r.id),'gear '+base);if(crafter.loadout[def.slot]?.uid===uid){if(crafter===target)return;assert.ok(E.unequip(s,crafter,def.slot));}bank(crafter);assert.ok(E.depositGear(s,crafter,uid));bank(target);assert.ok(E.withdrawGear(s,target,uid));assert.ok(E.equip(s,target,uid));}
 function expand(id,c=hero){material(id,1);bank(c);assert.ok(E.withdraw(s,c,id,1));assert.ok(E.useExpansion(s,c,id));bank(c);}
 function personalCraft(id,count=1){const r=D.RECIPES.find(r=>r.id===id);assert.ok(r,id);ensurePage(r);ensureCosts(Object.fromEntries(Object.entries(r.cost).map(([k,n])=>[k,n*count])));use(hero);const [area,zone]=r.station==='alchemy'?['jungle-town',1]:r.station==='enchanting'?['jungle-town',0]:r.station==='foundry'?['town',2]:['town',1];openRoute(hero,area,zone);E.travel(s,hero,area,zone);hero.position={x:{anvil:1390,foundry:1520,alchemy:1510,enchanting:1700}[r.station],y:644};if(r.station==='foundry'){assert.ok(E.enqueue(s,hero,id,count));while(s.jobs.length)tick(5);}else for(let i=0;i<count;i++)assert.ok(E.craft(s,hero,id));bank(hero);}
 function guardian(id){const area=id==='sunwell'?'forest':'deep',zone=3;openRoute(hero,area,zone);use(hero);const before=s.bossHunt.kills[id]||0,w=new World(s,{rng});assert.ok(w.travel(area,zone,{secret:id}),'guardian entry '+id);let frames=0;while((s.bossHunt.kills[id]||0)===before&&frames++<30000){if(!w.auto)w.toggleAuto();if(hero.hp<E.maxHp(hero)*.7)w.useSkill(2,true);w.step(.02);seconds+=.02;}assert.ok((s.bossHunt.kills[id]||0)>before,'guardian clear '+id);w.collectAll();bank(hero);}
 function questActions(q){for(const[key,n]of Object.entries(q.actions||{})){let missing=n-(hero.journey.events[key]||0);if(missing<=0)continue;
  if(key.startsWith('gather:'))gather(hero,key.slice(7),missing);
  else if(key==='craft:equipment'){while((hero.journey.events[key]||0)<n)gear('copper-sword',hero);}
  else if(key==='enchant:gear'){for(let i=0;i<missing;i++){ensureCosts(D.RUNES.force.cost);use(hero);E.travel(s,hero,'jungle-town',0);hero.position={x:1700,y:644};assert.ok(E.enchant(s,hero,'weapon','force',0,!!hero.loadout.weapon.runes[0]));bank(hero);}}
  else if(key==='craft:brew'){for(const id of ['mining-tonic','logging-tonic','battle-tonic','ward-tonic'])personalCraft(id);}
  else if(key.startsWith('craft:'))personalCraft(key.slice(6),missing);
  else if(key==='bank:deposit'){material('oak',1);bank(hero);E.withdraw(s,hero,'oak',1);E.deposit(s,hero,'oak',1);}
  else if(key==='food:equip'){material('bread',1);bank(hero);E.withdraw(s,hero,'bread',1);const slot=E.bagSlots(hero).findIndex(t=>t?.id==='bread');assert.ok(E.equipFood(hero,0,slot,1));}
  else if(key==='shop:buy'){bank(hero);hero.position={...new World(s).map.facilities.find(f=>f.kind==='shop')};assert.ok(E.buyShop(s,hero,'tonic'));}
  else throw Error('Unhandled campaign quest action '+key);
 }}
 function story(id){const q=D.STORY.find(q=>q.id===id);use(hero);const giver=q.giver==='steward'?{town:'town'}:D.CLASSES[q.giver];openRoute(hero,giver.town,giver.zone||0);E.travel(s,hero,giver.town,giver.zone||0);assert.ok(E.acceptQuest(s,id),'accept '+id);
  for(const[enemy,n]of Object.entries(q.kills||{})){const e=D.ENEMIES[enemy],missing=n-(hero.journey.kills[enemy]||0);if(missing>0)fight(hero,e.area,e.index,missing);}
  questActions(q);for(const[k,n]of Object.entries(q.deliver||{})){if(['sap-essence','vault-seal'].includes(k)&&stock(k)<n)guardian(k==='sap-essence'?'sunwell':'vault');else material(k,n);}ensureCosts(q.deliver||{});
  for(const room of q.visits||[]){const i=room.lastIndexOf('-'),area=room.slice(0,i),zone=Number(room.slice(i+1));openRoute(hero,area,zone);E.travel(s,hero,area,zone);}
  if(q.minigame){E.travel(s,hero,'forest',0);let now=100000;assert.ok(E.beginMinigame(hero,'oak',now));let result;for(let i=0;i<5;i++){now+=hero.minigame.target*600;result=E.hitMinigame(hero,now);}E.give(hero,result.resource,result.count);E.skillXp(hero,result.skill,result.xp);E.recordGather(s,hero,result.resource,result.count);seconds+=2;}
  bankAll();use(hero);E.travel(s,hero,giver.town,giver.zone||0);assert.ok(E.questStatus(s,id).ready,`quest ${id}: ${JSON.stringify(E.questStatus(s,id).tasks)}`);assert.ok(E.claimQuest(s,hero,id,q.giver),'claim '+id);events.push({event:id,minutes:+(seconds/60).toFixed(2)});bank(hero);
 }
 function initiation(c,id){use(c);while(c.level<3)fight(c,'forest',0,8);const def=D.CLASSES[id];openRoute(c,def.town,def.zone);E.travel(s,c,def.town,def.zone);assert.ok(E.progressClass(s,c,id),'first step '+id);
  if(['mining','logging'].includes(def.skill)){gather(c,def.skill==='mining'?'copper':'oak',Math.max(30,Math.ceil((12-c.skills[def.skill])/2)));}
  else if(def.skill==='smithing'){material('oak',6);use(c);E.travel(s,c,'town',2);c.position={x:1520,y:644};assert.ok(E.enqueue(s,c,'charcoal',2));while(s.jobs.length)tick(5);bank(c);}
  else{const r=D.RECIPES.find(r=>r.id===(id==='enchanter'?'dust':'tonic'));for(const[k,n]of Object.entries(r.cost))material(k,n*2);use(c);E.travel(s,c,def.town,def.zone);c.position={x:id==='enchanter'?1700:1510,y:644};assert.ok(E.craft(s,c,r.id));assert.ok(E.craft(s,c,r.id));bank(c);}
  for(const[k,n]of Object.entries(def.needs))material(k,n);use(c);E.travel(s,c,def.town,def.zone);assert.ok(E.progressClass(s,c,id),'practice '+id);assert.ok(E.progressClass(s,c,id),'deliver '+id);events.push({event:'class-'+id,minutes:+(seconds/60).toFixed(2)});bank(c);
 }
 fight(hero,'forest',0,24);initiation(hero,starter);story('first-roots');E.withdraw(s,hero,'woven-pouch',1);E.useExpansion(s,hero,'woven-pouch');bank(hero);
 E.createCharacter(s,'Second Apprentice');initiation(E.selected(s),starter==='mage'?'warrior':'mage');const mage=worker('logging');story('tools');expand('wooden-crate');gear('copper-sword',hero);gear('copper-mail',hero);gear('copper-pick',hero);gear('copper-axe',mage);
 for(const area of ['forest','caves'])for(let zone=0;zone<D.areaById(area).zones.length;zone++)if((s.kills[`${area}-${zone}`]||0)<16)fight(hero,area,zone,16-(s.kills[`${area}-${zone}`]||0));
 story('under-roots');expand('iron-lockbox');gear('iron-sword',hero);gear('iron-pick',hero);gear('iron-mail',hero);gear('iron-helm',hero);gear('birch-boots',hero);story('canopy-letter');
 E.createCharacter(s,'Third Apprentice');initiation(E.selected(s),['warrior','mage','blacksmith'].find(id=>!s.unlockedClasses.includes(id)));
 for(const area of ['jungle','deep'])for(let zone=0;zone<D.areaById(area).zones.length;zone++)if((s.kills[`${area}-${zone}`]||0)<16)fight(hero,area,zone,16-(s.kills[`${area}-${zone}`]||0));
 E.createCharacter(s,'Mira’s Apprentice');initiation(E.selected(s),'enchanter');E.createCharacter(s,'Fern’s Apprentice');initiation(E.selected(s),'alchemist');story('outpost');expand('runed-cabinet');for(const c of s.characters)if(c!==hero)gear(D.VERDANT_WEAPONS[c.class],c);story('seal');
 gear(D.VERDANT_WEAPONS[hero.class],hero);gear('tempered-mail',hero);gear('iron-helm',hero);gear('birch-boots',hero);
 material('mining-tonic',1);bank(hero);E.withdraw(s,hero,'mining-tonic',1);assert.ok(E.drink(s,hero,'mining-tonic'));
 material('dust',8);material('bat-fang',6);use(hero);E.travel(s,hero,'jungle-town',0);hero.position={x:1700,y:644};assert.ok(E.enchant(s,hero,'weapon','force',0));assert.ok(E.enchant(s,hero,'weapon','force',1));
 bankAll();use(hero);E.travel(s,hero,'jungle-town',2);const world=new World(s,{rng});assert.ok(world.select('portal-right'));
 let frames=0;while(!s.bossDefeated&&frames++<18000){const boss=world.map.monsters.find(e=>e.enemy.id==='boss');if(world.map.boss&&boss){if(!world.auto)world.toggleAuto();if(hero.level>=10&&hero.hp<E.maxHp(hero)*.7)world.useSkill(2,true);}world.step(.02);seconds+=.02;}
 assert.ok(s.bossDefeated,`Boss did not fall: ${hero.hp} hp, level ${hero.level}, power ${E.power(s,hero)}, frames ${frames}, room ${world.map.area}/${world.map.index}, boss ${world.map.boss}, position ${world.player.x}/${world.player.y}, target ${world.target?.id}, hp ${world.map.monsters[0]?.hp}`);bank(hero);story('heart');
 if(completeNpcChains){let seed=3187;rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};let guard=0;while(D.STORY.some(q=>!hero.journey.story[q.id]?.done)&&guard++<30){const q=D.STORY.find(q=>!hero.journey.story[q.id]?.done&&q.requires.every(id=>hero.journey.story[id]?.done));assert.ok(q,'quest dependency cycle');story(q.id);}assert.equal(s.npcTokens.length,6);material('world-one-completion',1);assert.ok(s.worldCompletionCrafted);}
 assert.equal(s.storyFlags.complete,true);assert.equal(s.unlockedClasses.length,5);assert.equal(E.slots(s),6);assert.ok(E.restoreSave(JSON.parse(JSON.stringify(s))));
 return{seconds,minutes:+(seconds/60).toFixed(2),events,level:hero.level,attack:E.power(s,hero),defense:E.defense(s,hero),chestSlots:E.chestUsed(s),chestCapacity:E.chestCapacity(s),characters:s.characters.map(c=>({name:c.name,class:c.class,bagSlots:E.bagUsed(c),capacity:E.bagCapacity(c)})),storyComplete:s.storyFlags.complete,state:s};
}
if(process.argv[1]?.endsWith('world1-sim.mjs')){const{state,...result}=runWorldOne();console.log(JSON.stringify(result,null,2));}
