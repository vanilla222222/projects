import * as U from './panels.mjs?v=5';
import {GameAudio} from './audio.mjs?v=5';
import {CLASSES,SKILLS,AREAS,ITEMS,RECIPES,OFFERINGS,STORY,SECRETS,purposes,areaById,zoneEnemy} from './content.mjs?v=5';
import * as E from './engine.mjs?v=5';
import {World,ABILITIES,GROUND,abilitySet} from './world.mjs?v=5';
import {drawWorld,viewFor} from './scene.mjs?v=5';
const $=id=>document.getElementById(id),KEY='wildroot-v1';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.floor(n).toLocaleString(),emblems={warrior:'⚔',mage:'✧',blacksmith:'⚒',enchanter:'✦',alchemist:'⚗'};
let state,raw=null,loadError=null,paused=false,panelKind=null,npc=null,toastTimer,loot=[],last=performance.now(),lastUi=0,lastSave=0,lastWall=Date.now(),offline=null,input={},assignmentId=null;
const audio=new GameAudio();
try{raw=localStorage.getItem(KEY);}catch{}
try{state=raw?E.restoreSave(JSON.parse(raw)):E.freshSave();if(raw)offline=E.claimOffline(state);}catch(err){state=E.freshSave();loadError=err.message;}
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4000);}
function save(){if(paused||loadError)return;state.savedAt=Date.now();try{localStorage.setItem(KEY,JSON.stringify(state));$('save-state').textContent='Saved locally';}catch{$('save-state').textContent='Export a backup';}}
const world=new World(state,{onIntent:handleIntent,onEvent:event=>{audio.play(event.type);if(event.type==='notice')toast(event.text);if(event.type==='loot'){loot.unshift({text:`+${event.count} ${ITEMS[event.id].name}`,until:Date.now()+5500});loot=loot.slice(0,4);}}});
function handleIntent(event){
 if(event.type==='npc'){npc=event.entity;openPanel('npc');}
 if(event.type==='station')openPanel('craft');
 if(event.type==='storage')openPanel('inventory');
 if(event.type==='victory'){save();openPanel('victory');}
}
let rendered=new Map();
function html(id,content){if(rendered.get(id)!==content){$(id).innerHTML=content;rendered.set(id,content);}}
function costs(cost){return U.costs(state,cost);}
function closePanel(){if(loadError){toast('Your original save is preserved. Import a backup or explicitly start fresh.');return;}if(paused){location.reload();return;}$('panel').close();panelKind=null;npc=null;last=performance.now();}
function openPanel(kind){panelKind=kind;input={};renderPanel();if(!$('panel').open)$('panel').showModal();}
function travel(area,index=0){if(world.travel(area,Number(index))){closePanel();buildTargets();save();refresh();}else toast(E.lockReason(state,area,Number(index))||'That route is not open yet.');}
function classCard(id,c){const def=CLASSES[id],q=E.classQuest(state,c,id),owned=state.unlockedClasses.includes(id);return`<article class="quest-card"><span class="emblem">${emblems[id]}</span><h3>${def.name}</h3><p>${SKILLS[def.skill]} specialist · ${def.trainer}</p><p class="step">${owned?'CLASS DISCOVERED':`INITIATION ${Math.min(3,q.stage+1)} / 3`}</p><p>${c.class?(c.class===id?'Your chosen class.':'Create another character to choose this path.'):!E.availableClass(state,id)?'Discover all five classes before choosing another of this class.':q.text}</p>${!c.class&&q.stage===2?costs(q.needs):''}<p>${def.motto}</p><button data-find-npc="${id}" ${c.class?'disabled':''}>Find ${def.trainer} ↗</button></article>`;}
function renderPanel(){
 const c=world.c,kind=panelKind;let title='',eyebrow='ADVENTURER’S JOURNAL',body='';
 if(kind==='welcome'){title='Welcome to the Greenreach';body=`<p class="intro">This is your world to explore. Walk across the map, climb ladders, and click enemies to fight them. Head through the left portal to meet the class mentors in Hearthstead.</p><div class="welcome-controls"><span>A / D · Move</span><span>W / S · Climb</span><span>Space · Jump</span><span>F · Attack</span><span>1 · Class skill</span><span>E · Interact</span></div><p class="intro">On mobile, tap the map to walk and tap enemies, trees, ore, NPCs, or portals to interact. Movement buttons and combat skills are below the world.</p><p class="intro">Your first goal: reach level 3, learn a profession, and complete a mentor’s initiation. Each first class adds another character slot. Other characters keep working while you explore.</p><button class="primary" data-close="">Enter the world</button>`;}
 if(kind==='inventory'){title='Backpack & universal storage';body=U.inventory(state,c,itemCard);}
 if(kind==='quests'){title='World One journal';body=U.story(state)+'<h3 class="section-title">Individual class initiations</h3><div class="grid">'+Object.keys(CLASSES).map(id=>classCard(id,c)).join('')+'</div>';}
 if(kind==='npc'&&npc?.classId){
  const def=CLASSES[npc.classId],q=E.classQuest(state,c,npc.classId);title=def.trainer;eyebrow=`${def.name.toUpperCase()} MENTOR`;
  let speech=c.class?`You have chosen the ${CLASSES[c.class].name} path. Keep growing your roster; another adventurer can learn from me.`:!E.availableClass(state,npc.classId)?`You already have a ${def.name}. Discover the other classes before taking a duplicate.`:q.stage===0?`Every adventurer needs a calling. Reach level 3, then I’ll begin teaching you ${SKILLS[def.skill].toLowerCase()}.`:q.stage===1?`Practise ${SKILLS[def.skill].toLowerCase()} until you reach skill level 2. ${['mining','logging'].includes(def.skill)?'Click a resource node in the wild to begin gathering.':'Use the crafting station to practise your profession.'}`:`You’re ready for the last step. Bring these materials, and I’ll welcome you as a ${def.name}.`;
  body=`<div class="dialogue"><div class="npc-portrait">${emblems[npc.classId]}</div><div><h3>“${def.motto}”</h3><p>${speech}</p></div></div>${!c.class&&q.stage===2?costs(q.needs):''}<div class="quest-actions"><button class="primary" data-quest="${npc.classId}" ${q.ready?'':'disabled'}>${c.class?(c.class===npc.classId?'Training complete':'Another class already chosen'):!E.availableClass(state,npc.classId)?'Discover the other classes first':q.stage===2?'Become '+def.name:'Complete initiation step '+(q.stage+1)}</button><button data-panel="quests">Open quest journal</button><button data-close="">Back to exploring</button></div>`;
 body+=U.npcStories(state,npc.classId);
 }
 if(kind==='npc'&&npc&&!npc.classId){title=npc.name;eyebrow='GUILD STEWARD';body='<div class="dialogue"><div class="npc-portrait">⚑</div><div><h3>A village grows together.</h3><p>Blackened roots have reached our well. We need miners, foresters and makers working together. Bring your supplies to the storage chest and help us find the cause.</p></div></div>'+U.npcStories(state,'steward');}
 if(kind==='skills'){title='Class builds & professions';body=U.talents(state,c);}
 if(kind==='craft'){title='Professions';const near=world.map.stations.some(e=>Math.abs(e.x-world.player.x)<110&&Math.abs(e.y-world.player.y)<70);body=U.crafting(state,c,near);}
 if(kind==='map'){
  title='World One';eyebrow='THE GREENREACH';body=`<p class="intro">Portals connect neighbouring zones. Clear 12 of the previous zone’s enemy to open the next route. You can also travel to discovered maps here.</p><div class="map-grid">${AREAS.map(a=>`<article class="map-area"><h3>${a.icon} ${a.name}</h3><p>${a.label} · ${a.zones.length} zones<br>${esc(a.text)}</p>${a.zones.map((name,i)=>`<button data-travel="${a.id}" data-zone="${i}" class="${c.area===a.id&&c.zone===i?'current':''}" ${E.zoneUnlocked(state,a.id,i)?'':'disabled'}>${i+1}. ${name}<span>${E.zoneUnlocked(state,a.id,i)?'↗':'⌑'}</span></button>`).join('')}${!E.areaUnlocked(state,a.id)?`<p>${E.lockReason(state,a.id)}</p>`:''}</article>`).join('')}</div>`;
 }
 if(kind==='archive'){title='Guild upgrades & studies';body=U.guild(state);}
 if(kind==='roster'){title='Roster management';body=U.roster(state);}
 if(kind==='assignment'){title='Change assignment';body=U.assignment(state,state.characters.find(c=>c.id===assignmentId));}
 if(kind==='settings'){title='Save & help';body=`<p class="intro">Each character has a backpack. Town chests share one universal storage. Your roster saves on this browser. Export a backup to move devices or protect your progress. Friends play their own rosters; this prototype has no shared multiplayer server.</p><div class="save-actions"><button data-audio="">${audio.enabled?'Mute sounds':'Enable sounds'}</button><label>Sound volume <input id="audio-volume" type="range" min="0" max="1" step="0.05" value="${audio.volume}"></label><button data-export="">Export save</button><button data-import="">Import save</button><a href="../index.html">Back to Projects ↗</a></div><div class="two-column"><div><h3>Controls</h3><ul class="help-list"><li>Click the ground to walk.</li><li>Click enemies to approach and attack.</li><li>Click trees or ores to gather.</li><li>Click NPCs, stations and portals to interact.</li><li>A / D or arrows: walk. W / S: climb.</li><li>Space: jump. F: attack. 1 / 2 / 3: class abilities. E: interact.</li><li>AUTO finds enemies and uses your class skill.</li></ul></div><div><h3>Progression</h3><p class="intro">Follow a mentor’s three-step class quest. Each first class grants another character slot. You need all five classes before duplicates. Other characters continue their assigned tasks.</p><p class="intro">Up to eight hours of offline progress are calculated on return. Active combat uses actual hits and positions; background progress uses your character’s combat or gathering rate.</p><p class="small">Your existing saves and older equipment are retained. World One is the development focus; no World Two content is enabled. No purchases or anti-cheat service.</p></div></div>`;}
 if(kind==='new'){title='A new adventurer';body=`<p class="intro">${state.characters.length} / ${E.slots(state)} character slots used. Each character chooses a class individually through their quest line.</p><label for="character-name">Name your adventurer</label><input id="character-name" class="name-input" maxlength="24" autocomplete="off" placeholder="Adventurer name"><button class="primary" data-create="">Join the roster</button>`;}
 if(kind==='offline'&&offline){title='Your roster kept adventuring';body=`<p class="intro">Welcome back. ${Math.floor(offline.seconds/3600)}h ${Math.floor(offline.seconds%3600/60)}m of progress${offline.capped?' (eight-hour limit)':''}.</p><div class="offline-grid"><div>${fmt(offline.kills)}<small>ENEMIES</small></div><div>${fmt(offline.items)}<small>MATERIALS</small></div><div>${fmt(offline.coins)}<small>COINS</small></div></div><button class="primary" data-close="">Return to the world</button>`;}
 if(kind==='victory'){title='The Rootwarden falls';eyebrow='THE ROOTWARDEN DEFEATED';body='<p class="intro">The ancient gate is quiet. Your roster has conquered the first world. Collect the heart and return it to Hesta to finish the World One story. Your five professions made this possible.</p><button class="primary" data-close="">Keep exploring</button>';}
 if(kind==='chapter-complete'){title='The Greenreach restored';eyebrow='WORLD ONE STORY COMPLETE';body='<p class="intro">Hesta repairs the well. You have brought five callings together, quieted the Rootbound Gate and earned the Heartwood blueprint. Secret discoveries, guild projects and equipment builds remain within World One.</p><button class="primary" data-close="">Return to the Greenreach</button>';}
 if(kind==='load-error'){title='Your save needs attention';body=`<p class="intro">${esc(loadError)}. Your existing save has been left untouched. Export it before starting fresh, or import a backup.</p><div class="save-actions"><button data-export="">Export original save</button><button data-import="">Import backup</button><button data-fresh="">Start fresh</button></div>`;}
 if(kind==='paused'){title='This roster is open elsewhere';body='<p class="intro">Another tab updated the save. Reload to continue from the latest version.</p><button data-reload="">Reload latest save</button>';}
 $('panel-title').textContent=title;$('panel-eyebrow').textContent=eyebrow;html('panel-content',body);
}
function itemCard(id,n,archive=false){const item=ITEMS[id],level=state.archive[id]||0,cost=item.rarity==='common'?10*(level+1):level+1;return`<article class="item-card rarity-${item.rarity}"><div><span class="icon">${item.icon}</span><strong class="quantity">${fmt(n)}</strong></div><h3>${esc(item.name)}</h3><p>${item.rarity.toUpperCase()}${archive?` · Archive level ${level}`:''}</p><p>${purposes(id).map(esc).join(' · ')}</p>${archive?`<button data-offer="${id}" ${n>=cost?'':'disabled'}>Offer ${cost} · +1.5% damage</button>`:''}</article>`;}
function findNpc(id){const def=id==='steward'?{town:'town'}:CLASSES[id];if(!E.areaUnlocked(state,def.town)){toast(E.lockReason(state,def.town));return;}const zone=def.town==='town'?0:id==='enchanter'?0:1;travel(def.town,zone);world.select(`npc-${id}`);}
function findStation(station){const [area,zone]={anvil:['town',1],foundry:['town',2],enchanting:['jungle-town',0],alchemy:['jungle-town',1]}[station];if(!E.zoneUnlocked(state,area,zone)){toast(E.lockReason(state,area,zone));return;}travel(area,zone);world.select('station');}
let targetKey='',lastPanelRefresh=0,panelInteraction=false;
$('panel').addEventListener('pointerdown',()=>{panelInteraction=true;});
$('panel').addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter')panelInteraction=true;});
window.addEventListener('pointerup',()=>{panelInteraction=false;});
window.addEventListener('pointercancel',()=>{panelInteraction=false;});
window.addEventListener('keyup',()=>{panelInteraction=false;});
function buildTargets(){
 const key=world.key+':'+world.map.boss+':'+world.map.monsters.map(e=>e.id).join(',')+':'+world.groundLoot.map(d=>d.id).join(',');if(key===targetKey)return;targetKey=key;
 html('world-objects',[...world.map.entities,...world.groundLoot].map((e,i)=>{const label=e.kind==='drop'?`Pick up ${e.itemId==='coins'?'coins':ITEMS[e.itemId].name}`:e.kind==='enemy'?`Attack ${e.enemy.name} ${i+1}`:e.kind==='node'?`${['copper','iron','gold'].includes(e.resource)?'Mine':'Chop'} ${ITEMS[e.resource].name}`:e.kind==='storage'?'Open storage chest':e.kind==='discovery'?`Inspect ${e.name}`:e.kind==='npc'?`Talk to ${e.name}`:e.kind==='station'?`Use ${e.name}`:e.direction<0?'Enter previous map':'Enter next map';return`<button class="map-target" data-target="${e.id}" aria-label="${esc(label)}"><span>${esc(label)}</span></button>`;}).join(''));
}
function projectTargets(){const v=viewFor($('scene'),world.player);for(const button of $('world-objects').children){const e=[...world.map.entities,...world.groundLoot].find(e=>e.id===button.dataset.target);if(!e)continue;button.hidden=e.kind==='enemy'&&e.dead>0;const w=e.kind==='drop'?44:e.kind==='node'?110:90,h=e.kind==='drop'?44:e.kind==='node'?160:e.kind==='portal'?135:120;button.style.left=`${(e.x-w/2-v.x)/v.width*100}%`;button.style.top=`${(e.y-h)/v.height*100}%`;button.style.width=`${w/v.width*100}%`;button.style.height=`${h/v.height*100}%`;}}
function refresh(){
 const c=world.c,a=areaById(c.area),ability=ABILITIES[c.class||'novice'],abilities=abilitySet(c);
 html('roster',state.characters.map(ch=>`<button data-character="${ch.id}" class="${ch.id===c.id?'active':''}" aria-pressed="${ch.id===c.id}"><span class="portrait">${ch.class?emblems[ch.class]:'♙'}</span><span>${esc(ch.name)}<span class="sub">${ch.class?CLASSES[ch.class].name:'Beginner'} · Lv. ${ch.level}</span></span></button>`).join(''));
 $('new-character').disabled=state.characters.length>=E.slots(state);$('new-character').title=`${state.characters.length} / ${E.slots(state)} slots. Discover a class to unlock another.`;
 $('area-label').textContent=`WORLD 1 · ${a.label.toUpperCase()} · ${c.zone+1}/${a.zones.length}`;$('zone-name').textContent=world.map.boss?'The Rootwarden':world.map.secret?SECRETS[world.map.secret].name:a.zones[c.zone];
 $('bag-count').textContent=`Backpack ${E.bagUsed(c)}/${E.bagCapacity(c)}`;
 $('player-name').textContent=c.name;$('player-class').textContent=`${c.class?CLASSES[c.class].name:'Beginner'} · Lv. ${c.level}`;$('coin-count').textContent=`◈ ${fmt(state.coins)}`;
 $('health-bar').style.width=`${Math.max(0,c.hp/E.maxHp(c)*100)}%`;$('health-label').textContent=`${fmt(c.hp)} / ${E.maxHp(c)} HP`;$('xp-bar').style.width=`${c.xp/E.xpNeeded(c)*100}%`;$('xp-label').textContent=`${fmt(c.xp)} / ${E.xpNeeded(c)} XP`;
 $('skill-button').querySelector('span').textContent=ability.icon;$('skill-button').querySelector('small').textContent=ability.name.toUpperCase();$('skill-button').title=ability.description;$('skill-cooldown').textContent=world.player.skill>0?Math.ceil(world.player.skill):'';$('auto-button').setAttribute('aria-pressed',String(world.auto));$('auto-button').querySelector('i').textContent=world.auto?'ON':'OFF';
 for(const [i,id]of [[1,'secondary-button'],[2,'utility-button']]){const button=$(id),skill=abilities[i];button.disabled=!skill||c.level<(i===1?6:10);button.querySelector('span').textContent=skill?.icon||'⌑';button.querySelector('small').textContent=skill?skill.name.toUpperCase():'CLASS REQUIRED';button.title=skill?.description||'Choose a class';button.querySelector('b').textContent=world.player.cooldowns[i]>0?Math.ceil(world.player.cooldowns[i]):'';}
 const kills=state.kills[zoneEnemy(c.area,c.zone)?.id]||0;
 let tracker=c.class?`<strong>${CLASSES[c.class].name} · ${esc(c.name)}</strong><p>✦ ${E.talentPoints(c)} unspent talent points</p><p>${state.unlockedClasses.length} / 5 classes discovered</p>`:`<strong>Find your calling</strong><p class="${c.level>=3?'done':''}">${c.level>=3?'✓':'○'} Reach character level 3 (${c.level}/3)</p><p>○ Talk to a mentor in Hearthstead</p><p>○ Complete your class initiation</p>`;
 const quest=E.questStatus(state,state.trackedQuest)||STORY.map(q=>E.questStatus(state,q.id)).find(q=>q.available&&!q.done);if(c.class&&quest)tracker=`<strong>${quest.q.name}</strong><p>${quest.accepted?'':'Talk to '+(quest.q.giver==='steward'?'Hesta':CLASSES[quest.q.giver].trainer)+' · '}${quest.tasks.filter(t=>!t.done).slice(0,2).map(t=>t.text+' ('+fmt(t.have)+'/'+t.need+')').join(' · ')||'Return to the quest giver'}</p><p>${state.unlockedClasses.length}/5 classes · Backpack ${E.bagUsed(c)}/${E.bagCapacity(c)}</p>`;
 if(zoneEnemy(c.area,c.zone))tracker+=`<p class="${kills>=12?'done':''}">${kills>=12?'✓ Next route unlocked':`○ Open next route: ${kills}/12 kills`}</p>`;html('quest-tracker',tracker);
 $('world-hint').textContent=world.player.climbing?'Climbing · W / S or touch arrows':world.target?.kind==='node'?`Gathering ${ITEMS[world.target.resource].name} · Other characters keep working`:world.auto?'AUTO is on · Click a target or use movement controls to take over':'Tap ground to walk · Tap targets to interact · W / S for ladders';
 loot=loot.filter(l=>l.until>Date.now());html('loot-feed',loot.map(l=>`<p>${esc(l.text)}</p>`).join(''));
 $('knockout').hidden=world.player.respawn<=0;
 buildTargets();if($('panel').open&&!panelInteraction&&performance.now()-lastPanelRefresh>1000&&!['new','welcome','offline','settings','load-error','paused','victory','assignment','chapter-complete'].includes(panelKind)){renderPanel();lastPanelRefresh=performance.now();}
}
document.addEventListener('click',event=>{
 const b=event.target.closest('button');if(!b||b.disabled)return;const d=b.dataset,c=world.c;
 if(d.reload!==undefined){location.reload();return;}
 if(paused)return;
 if(d.close!==undefined){closePanel();return;}
 if(d.target){if(d.target.startsWith('loot-'))world.pickLoot(d.target);else world.select(d.target);refresh();save();return;}
 if(d.panel){openPanel(d.panel);return;}
 if(d.character){world.collectAll();state.active=Number(d.character);world.switchCheck();buildTargets();save();refresh();return;}
 if(d.travel){travel(d.travel,Number(d.zone));return;}
 if(d.findNpc){findNpc(d.findNpc);return;}
 if(d.findStation){findStation(d.findStation);return;}
 if(d.findStorage!==undefined){if(!['town','jungle-town'].includes(c.area))travel('town',0);else closePanel();world.select('storage');return;}
 if(d.expand){toast(E.useExpansion(state,c,d.expand)?'Expansion consumed. Capacity increased.':'That expansion was already used, or is not in this backpack.');save();renderPanel();refresh();return;}
 if(d.deposit){toast('Deposited '+fmt(E.deposit(state,c,d.deposit))+' items.');save();renderPanel();return;}
 if(d.withdraw){toast('Withdrew '+fmt(E.withdraw(state,c,d.withdraw))+' items.');save();renderPanel();return;}
 if(d.depositAll!==undefined){toast('Deposited '+fmt(E.depositAll(state,c))+' items.');save();renderPanel();return;}
 if(d.reclaim!==undefined){toast('Claimed '+fmt(E.reclaim(c))+' pending items.');save();renderPanel();return;}
 if(d.depositGear){E.depositGear(state,c,d.depositGear);save();renderPanel();return;}
 if(d.withdrawGear){E.withdrawGear(state,c,d.withdrawGear);save();renderPanel();return;}
 if(d.equip){toast(E.equip(state,c,d.equip)?'Equipment changed.':'That item cannot be equipped.');c.hp=Math.min(c.hp,E.maxHp(c));save();renderPanel();refresh();return;}
 if(d.unequip){toast(E.unequip(state,c,d.unequip)?'Item placed in backpack.':'Make room in the backpack first.');c.hp=Math.min(c.hp,E.maxHp(c));save();renderPanel();refresh();return;}
 if(d.drink){if(E.drink(state,c,d.drink))toast('Potion active for 20 minutes.');save();renderPanel();return;}
 if(d.profTalent){E.train(c,d.profTalent,'profession');save();renderPanel();refresh();return;}
 if(d.saveBuild!==undefined){E.saveBuild(c,Number(d.saveBuild));save();renderPanel();return;}
 if(d.loadBuild!==undefined){E.loadBuild(c,Number(d.loadBuild));c.hp=Math.min(c.hp,E.maxHp(c));save();renderPanel();refresh();return;}
 if(d.resetBuild!==undefined){E.resetBuild(c);c.hp=Math.min(c.hp,E.maxHp(c));save();renderPanel();refresh();return;}
 if(d.queue){if(E.enqueue(state,c,d.queue,Number(d.count)))toast('Foundry inputs reserved. Batches started.');else toast('Not enough materials, coins or queue slots.');save();renderPanel();return;}
 if(d.cancelJob){E.cancelJob(state,Number(d.cancelJob));save();renderPanel();return;}
 if(d.rune){if(world.map.stations.some(e=>e.station==='enchanting'&&Math.abs(e.x-world.player.x)<110)&&E.enchant(state,c,d.slot,d.rune,Number(d.index)))toast('Rune etched.');save();renderPanel();refresh();return;}
 if(d.research){if(E.research(state,c,d.research))toast('Alchemy research improved the roster.');save();renderPanel();refresh();return;}
 if(d.guild){if(E.buyGuild(state,d.guild))toast('Guild upgrade built.');save();renderPanel();refresh();return;}
 if(d.track){state.trackedQuest=d.track;save();refresh();return;}
 if(d.story){const giver=npc?.classId||npc?.role,st=E.questStatus(state,d.story);if(!npc||Math.abs(world.player.x-npc.x)>110||st?.q.giver!==giver)return;if(!st.accepted)E.acceptQuest(state,d.story);else if(E.claimQuest(state,c,d.story,giver)){audio.play('quest');toast('Quest complete: '+st.q.name);if(st.q.reward.complete){openPanel('chapter-complete');save();refresh();return;}}save();renderPanel();refresh();return;}
 if(d.assignment){assignmentId=Number(d.assignment);openPanel('assignment');return;}
 if(d.applyAssignment){const worker=state.characters.find(c=>c.id===Number(d.applyAssignment)),[area,index]=$('assignment-route').value.split(':'),activity=$('assignment-task').value;if(worker.id===state.active)world.collectAll();else{for(const drop of worker.groundLoot||[]){if(drop.itemId==='coins')state.coins+=drop.count;else E.give(worker,drop.itemId,drop.count);}worker.groundLoot=[];}if(!E.travel(state,worker,area,Number(index))){toast('Route is locked.');return;}const resource=activity==='gather'?areaById(area).resources[Number(index)][0]:null;if(!E.start(state,worker,activity,resource))toast(resource?E.gatherRequirement(worker,resource):'That task is unavailable.');if(worker.id===state.active){world.enter();targetKey='';}save();openPanel('roster');refresh();return;}
 if(d.audio!==undefined){audio.enable(!audio.enabled);state.settings={...state.settings,audio:audio.enabled,volume:audio.volume};save();renderPanel();return;}
 if(d.quest){if(!npc||npc.classId!==d.quest||Math.abs(world.player.x-npc.x)>110)return;if(E.progressClass(state,c,d.quest)){toast(c.class?`${c.name} became a ${CLASSES[c.class].name}! A new path opens.`:'Initiation step complete.');save();renderPanel();refresh();}return;}
 if(d.craft){if(world.map.stations.some(e=>Math.abs(e.x-world.player.x)<110)&&E.craft(state,c,d.craft)){toast(state.log[0]);save();renderPanel();refresh();}return;}
 if(d.talent){if(E.trainTalent(c,d.talent)){save();renderPanel();refresh();}return;}
 if(d.offer){if(E.offer(state,d.offer)){toast(state.log[0]);save();renderPanel();refresh();}return;}
 if(d.heal!==undefined){E.heal(state,c);save();renderPanel();refresh();return;}
 if(d.create!==undefined){if(E.createCharacter(state,$('character-name').value)){closePanel();world.switchCheck();buildTargets();save();refresh();}return;}
 if(d.export!==undefined){const a=document.createElement('a'),blob=new Blob([loadError&&raw?raw:JSON.stringify({...state,savedAt:Date.now()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);a.href=url;a.download='wildroot-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Save exported.');return;}
 if(d.import!==undefined){$('import-file').click();return;}
 if(d.fresh!==undefined){loadError=null;save();closePanel();refresh();}
});
$('close-panel').addEventListener('click',closePanel);
$('panel').addEventListener('cancel',e=>{e.preventDefault();closePanel();});
$('map-shortcut').addEventListener('click',()=>openPanel('map'));
$('open-settings').addEventListener('click',()=>openPanel('settings'));
$('new-character').addEventListener('click',()=>{openPanel('new');$('character-name').focus();});
$('auto-button').addEventListener('click',()=>{world.toggleAuto();save();refresh();});
$('attack-button').addEventListener('click',()=>{if(!world.basicAttack()){world.findTarget();if(world.target)world.c.activity=world.map.boss?'boss':'fight';}refresh();});
$('skill-button').addEventListener('click',()=>{world.useSkill(0);refresh();});
$('secondary-button').addEventListener('click',()=>{world.useSkill(1);refresh();});
$('utility-button').addEventListener('click',()=>{world.useSkill(2);refresh();});
$('manage-roster').addEventListener('click',()=>openPanel('roster'));
document.addEventListener('input',e=>{if(e.target.id==='audio-volume'){audio.volume=Number(e.target.value);state.settings={...state.settings,volume:audio.volume};save();}});
document.addEventListener('pointerdown',()=>{if(state.settings?.audio&&!audio.enabled){audio.volume=state.settings.volume??.2;audio.enable(true);}},{once:true});
$('interact-button').addEventListener('click',()=>world.interact());
$('jump-button').addEventListener('click',()=>{input.jump=true;});
$('scene').addEventListener('pointerdown',e=>{if($('panel').open)return;const rect=$('scene').getBoundingClientRect(),v=viewFor($('scene'),world.player),x=(e.clientX-rect.left)/rect.width*v.width+v.x,y=(e.clientY-rect.top)/rect.height*v.height;world.walkTo(x,y);$('scene').focus({preventScroll:true});});
for(const b of document.querySelectorAll('[data-hold]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);input[b.dataset.hold]=true;});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>{input[b.dataset.hold]=false;});}
const keyMap={a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right',w:'up',ArrowUp:'up',s:'down',ArrowDown:'down',f:'attack'};
window.addEventListener('keydown',e=>{if($('panel').open||e.target.matches('input'))return;const mapped=keyMap[e.key]||keyMap[e.key.toLowerCase()];if(mapped){e.preventDefault();input[mapped]=true;}if(e.code==='Space'){e.preventDefault();if(!e.repeat)input.jump=true;}if(['1','2','3'].includes(e.key)&&!e.repeat)world.useSkill(Number(e.key)-1);if(e.key.toLowerCase()==='e'&&!e.repeat)world.interact();if(e.key.toLowerCase()==='m'&&!e.repeat)openPanel('map');if(e.key.toLowerCase()==='i'&&!e.repeat)openPanel('inventory');});
window.addEventListener('keyup',e=>{const mapped=keyMap[e.key]||keyMap[e.key.toLowerCase()];if(mapped)input[mapped]=false;});window.addEventListener('blur',()=>{input={};});
$('import-file').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>2000000)throw Error('File is too large.');const incoming=E.restoreSave(JSON.parse(await file.text()));if(!confirm('Replace this roster with the imported save? Export a backup first if you want to keep it.'))return;state=incoming;world.state=state;loadError=null;offline=E.claimOffline(state);world.enter();targetKey='';closePanel();save();refresh();toast('Save imported.');}catch(err){toast(`Could not import: ${err.message}`);}});
window.addEventListener('storage',e=>{if(e.key===KEY&&e.newValue){paused=true;input={};openPanel('paused');}});
window.addEventListener('pagehide',save);
document.addEventListener('visibilitychange',()=>{input={};if(paused)return;if(document.hidden){save();}else{offline=E.claimOffline(state);last=performance.now();lastWall=Date.now();world.enter();targetKey='';refresh();save();if(offline.seconds>60)openPanel('offline');}});
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let renderTime=0;
function frame(time){const delta=Math.max(0,(time-last)/1000);last=time;
 if(!paused&&!document.hidden){
  const wall=Date.now(),elapsed=Math.max(0,(wall-lastWall)/1000);lastWall=wall;
  // Suspended tabs are claimed once from their last saved timestamp, never through a giant physics step.
  if(elapsed>10){E.advance(state,elapsed);world.enter();targetKey='';save();}else{E.advanceProduction(state,elapsed);E.advanceBackground(state,elapsed);let remain=Math.min(.25,delta);const controls=$('panel').open?{}:input;while(remain>0){const dt=Math.min(.025,remain);world.step(dt,{horizontal:(controls.right?1:0)-(controls.left?1:0),vertical:(controls.up?1:0)-(controls.down?1:0),jump:!!controls.jump,attack:!!controls.attack});input.jump=false;remain-=dt;}}
  if(time-lastUi>180){refresh();lastUi=time;}if(time-lastSave>8000){save();lastSave=time;}
 }
 if(time-renderTime>(reduced?120:25)){drawWorld($('scene'),world,time/1000,reduced);projectTargets();renderTime=time;}
 requestAnimationFrame(frame);
}
refresh();requestAnimationFrame(frame);
if(loadError)openPanel('load-error');else if(offline?.seconds>60)openPanel('offline');else if(!state.worldViewIntro){state.worldViewIntro=true;openPanel('welcome');}
