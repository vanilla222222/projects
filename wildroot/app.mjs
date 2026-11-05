import * as UI from './ui-panels.mjs?v=15';
import {icon,portrait} from './ui-art.mjs?v=15';
import * as AUI from './adventure-panels.mjs?v=15';
import * as T from './town-panels.mjs?v=15';
import * as U from './panels.mjs?v=15';
import {GameAudio} from './audio.mjs?v=15';
import {CLASSES,SKILLS,AREAS,ITEMS,RECIPES,OFFERINGS,STORY,SECRETS,purposes,areaById,zoneEnemy} from './content.mjs?v=15';
import * as E from './engine.mjs?v=15';
import {World,ABILITIES,GROUND,abilitySet,assignedAbilities,abilityAvailable} from './world.mjs?v=15';
import {drawWorld,viewFor} from './scene.mjs?v=15';
const $=id=>document.getElementById(id),KEY='wildroot-v1';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.floor(n).toLocaleString(),emblems={warrior:'⚔',mage:'✧',blacksmith:'⚒',enchanter:'✦',alchemist:'⚗'};
let state,raw=null,loadError=null,paused=false,panelKind=null,npc=null,toastTimer,loot=[],last=performance.now(),lastUi=0,lastSave=0,lastWall=Date.now(),offline=null,input={},assignmentId=null;
let uiView={},panelHistory=[],trialResult=null;
let talentView={tab:"beginner",count:1},shopView={};
let inventoryView={tab:"equipment",page:0,chestPage:0,source:"bag",index:null};
const audio=new GameAudio();
try{raw=localStorage.getItem(KEY);}catch{}
try{state=raw?E.restoreSave(JSON.parse(raw)):E.freshSave();if(raw)offline=E.claimOffline(state);}catch(err){state=E.freshSave();loadError=err.message;}
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4000);}
function save(){if(paused||loadError)return;state.savedAt=Date.now();try{localStorage.setItem(KEY,JSON.stringify(state));$('save-state').textContent='Saved locally';}catch{$('save-state').textContent='Export a backup';}}
const world=new World(state,{onIntent:handleIntent,onEvent:event=>{audio.play(event.type);if(event.type==='notice')toast(event.text);if(event.type==='loot'){loot.unshift({text:`+${event.count} ${ITEMS[event.id].name}`,until:Date.now()+5500});loot=loot.slice(0,4);}}});
function handleIntent(event){
 if(event.type==='telescope'){if(E.unlockStars(state,world.c)){save();openPanel('stars');}}
 if(event.type==='constellation'){const result=E.observeConstellation(state,world.c,event.entity.constellation);toast(result==='complete'?'Constellation completed · +2 star points':result?'Constellation observed. Meet its requirement and return.':'Climb to the telescope in Crown Observatory first.');save();}
 if(event.type==='arena')openPanel('trial');
 if(event.type==='trial-result'){trialResult=event.result;save();openPanel('trial-result');}
 if(event.type==='npc'){npc=event.entity;if(npc.classId&&!world.c.metMentors.includes(npc.classId))world.c.metMentors.push(npc.classId);openPanel('npc');}
 if(event.type==='tasks'){state.tasksUnlocked=true;save();openPanel('tasks');}
 if(event.type==='station')openPanel('craft');
 if(['shop','stamps','statues'].includes(event.type)){shopView={};openPanel(event.type);}
 if(event.type==='worldgate'){openPanel('world-gate');}
 if(event.type==='storage'){inventoryView.storage=true;openPanel('inventory');}
 if(event.type==='victory'){save();openPanel('victory');}
}
let rendered=new Map();
function html(id,content){if(rendered.get(id)!==content){$(id).innerHTML=content;rendered.set(id,content);}}
function costs(cost){return U.costs(state,cost);}
function closePanel(){if(loadError){toast('Your original save is preserved. Import a backup or explicitly start fresh.');return;}if(paused){location.reload();return;}if(panelKind==='minigame')world.c.minigame=null;$('panel').close();panelKind=null;panelHistory=[];npc=null;last=performance.now();}
function openPanel(kind,back=false){if(panelKind&&panelKind!==kind&&!back)panelHistory.push(panelKind);if(panelKind==='minigame'&&kind!=='minigame')world.c.minigame=null;panelKind=kind;input={};renderPanel();if(!$('panel').open)$('panel').showModal();}
function travel(area,index=0){if(world.teleport(area,Number(index))){closePanel();buildTargets();save();refresh();return true;}toast(E.lockReason(state,area,Number(index))||(!E.discovered(state,area,Number(index))?'Walk there through the portals to discover this room.':'No map teleports left. Walk through portals or use a Bottled Town Return.'));return false;}
function classCard(id,c){const def=CLASSES[id],q=E.classQuest(state,c,id),owned=state.unlockedClasses.includes(id);return`<article class="quest-card"><span class="emblem">${emblems[id]}</span><h3>${def.name}</h3><p>${SKILLS[def.skill]} specialist · ${def.trainer}</p><p class="step">${owned?'CLASS DISCOVERED':`INITIATION ${Math.min(3,q.stage+1)} / 3`}</p><p>${c.class?(c.class===id?'Your chosen class.':'Create another character to choose this path.'):!E.availableClass(state,id)?'Discover all five classes before choosing another of this class.':q.text}</p>${!c.class&&q.stage===2?costs(q.needs):''}<p>${def.motto}</p><button data-find-npc="${id}" ${c.class?'disabled':''}>Find ${def.trainer} ↗</button></article>`;}
function renderPanel(){
 const c=world.c,kind=panelKind;let title='',eyebrow='ADVENTURER’S JOURNAL',body='';
 if(kind==='welcome'){title='Welcome to the Greenreach';body=`<p class="intro">This is your world to explore. Walk across the map, climb ladders, and click enemies to fight them. Meet Willow beside the first oak tree, or Brann by the first copper seam. Other mentors work near their specialty stations.</p><div class="welcome-controls"><span>A / D · Move</span><span>W / S · Climb</span><span>Space · Jump</span><span>F · Attack</span><span>1 · Class skill</span><span>E · Interact</span></div><p class="intro">On mobile, tap the map to walk and tap enemies, trees, ore, NPCs, or portals to interact. Movement buttons and combat skills are below the world.</p><p class="intro">Your first goal: reach level 3, learn a profession, and complete a mentor’s initiation. Each first class adds another character slot. Other characters keep working while you explore.</p><button class="primary" data-close="">Enter the world</button>`;}
 if(kind==='cards'){title='Cards';body=UI.cards(state,c,uiView);}
 if(kind==='afk'){title='AFK & gathering';body=AUI.afk(state,c);}
 if(kind==='tasks'){title='World & daily tasks';body=AUI.tasks(state);}
 if(kind==='industry'){title='Anvil & furnace production';body=UI.industry(state,c,world.map.stations.some(e=>Math.abs(e.x-world.player.x)<110&&Math.abs(e.y-world.player.y)<70),uiView);}
 if(kind==='minigame'){title='Gathering challenge';body=AUI.minigame(c);}
 if(kind==='inventory'){title='Backpack & universal storage';body=UI.inventory(state,c,inventoryView);}
 if(kind==='quests'){title='Quest Journal';body=UI.journal(state,c,uiView);}
 if(kind==='npc'&&npc?.classId){
  const def=CLASSES[npc.classId],q=E.classQuest(state,c,npc.classId);title=def.trainer;eyebrow=`${def.name.toUpperCase()} MENTOR`;
  let speech=c.class?`You have chosen the ${CLASSES[c.class].name} path. Keep growing your roster; another adventurer can learn from me.`:!E.availableClass(state,npc.classId)?`You already have a ${def.name}. Discover the other classes before taking a duplicate.`:q.stage===0?`Every adventurer needs a calling. Reach level 3, then I’ll begin teaching you ${SKILLS[def.skill].toLowerCase()}.`:q.stage===1?`Practise ${SKILLS[def.skill].toLowerCase()} until you reach skill level 2. ${['mining','logging'].includes(def.skill)?'Click a resource node in the wild to begin gathering.':'Use the crafting station to practise your profession.'}`:`You’re ready for the last step. Bring these materials, and I’ll welcome you as a ${def.name}.`;
  body=`<div class="dialogue"><div class="npc-portrait">${emblems[npc.classId]}</div><div><h3>“${def.motto}”</h3><p>${speech}</p></div></div>${!c.class&&q.stage===2?costs(q.needs):''}<div class="quest-actions"><button class="primary" data-quest="${npc.classId}" ${q.ready?'':'disabled'}>${c.class?(c.class===npc.classId?'Training complete':'Another class already chosen'):!E.availableClass(state,npc.classId)?'Discover the other classes first':q.stage===2?'Become '+def.name:'Complete initiation step '+(q.stage+1)}</button><button data-panel="quests">Open quest journal</button><button data-close="">Back to exploring</button></div>`;
 body+=U.npcStories(state,npc.classId);
 }
 if(kind==='npc'&&npc&&!npc.classId){title=npc.name;eyebrow='VILLAGE STEWARD';body='<div class="dialogue"><div class="npc-portrait">⚑</div><div><h3>A village grows together.</h3><p>Blackened roots have reached our well. We need miners, foresters and makers working together. Bring your supplies to the storage chest and help us find the cause.</p></div></div>'+U.npcStories(state,'steward');}
 if(kind==='skills'){title='Class builds & professions';body=UI.talents(state,c,talentView);}
 if(kind==='craft'){title='Professions';const near=world.map.stations.some(e=>Math.abs(e.x-world.player.x)<110&&Math.abs(e.y-world.player.y)<70);body=UI.crafting(state,c,near,uiView);}
 if(kind==='map'){title='World One · Routes & teleports';eyebrow='THE GREENREACH';body=UI.map(state,c,uiView);}
 if(kind==='stamps'){title='Legacy Square · Stamp Registry';body=UI.stamps(state,c,uiView);}
 if(kind==='statues'){title='Legacy Square · Statue Keeper';body=UI.statues(state,c,uiView);}
 if(kind==='shop'){title=c.area==='town'?'Pip’s General Store':'Nori’s Supply Stall';body=UI.shop(state,c,shopView);}
 if(kind==='gems'){title='Gem wardrobe';body=T.gems(state,c);}
 if(kind==='world-gate'){title='The World Gate';body=`<div class="world-gate-card"><span>⌖</span><h3>World 2 · Not yet built</h3><p>${state.storyFlags.complete?(state.worldCompletionCrafted?'The gate recognises your Greenreach Completion Token. World Two will arrive in a future update.':'The Rootwarden is defeated. Complete each NPC’s three quests and combine all six tokens at the anvil for World One completion.'):'Complete the World One story and restore the Greenreach to prepare this gate.'}</p><p>World One remains the active world. The gate has no destination yet.</p></div>`;}
 if(kind==='town'){title='Town services';body='<p class="intro">Hearthstead’s Village Green connects to Legacy Square by its upper portal. Visit the square for stamps, statues and the future World Gate. Pip’s shop is on the Green; Nori’s stall is in Canopy Market.</p><div class="save-actions"><button data-panel="cards">Cards</button><button data-panel="afk">AFK & gathering</button><button data-panel="tasks">Tasks & merits</button><button data-find-facility="tasks">Task board</button><button data-find-facility="stamps">Stamp Registry</button><button data-find-facility="statues">Statue Keeper</button><button data-find-shop="town">Pip’s Shop</button><button data-find-shop="jungle-town">Nori’s Shop</button></div>';}
 if(kind==='roster'){title='Roster management';body=UI.roster(state);}
 if(kind==='assignment'){title='Change assignment';body=U.assignment(state,state.characters.find(c=>c.id===assignmentId));}
 if(kind==='settings'){title='Options & Save';body=UI.options(state,audio);}
 if(['codex','quick'].includes(kind)){title='Codex';body=UI.quickRef(state,c);}
 if(kind==='menu'){title='Menu';body=UI.menu(state,c);}
 if(kind==='bestiary'){title='Creature Codex';body=UI.bestiary(state,c,uiView);}
 if(kind==='items'){title='Item Codex';body=UI.itemIndex(state,c,uiView);}
 if(kind==='stars'){title='Star Signs & Constellations';body=UI.stars(state,c,uiView);}
 if(kind==='vault'){title='Greenreach Upgrade Vault';body=UI.vault(state);}
 if(kind==='achievements'){title='World One Achievements';body=UI.achievements(state);}
 if(kind==='trial'){title='Solo Trials';body=UI.trials(state,c);}
 if(kind==='trial-result'&&trialResult){title=trialResult.completed?'All Waves Cleared':'Trial Complete';body=`<div class="trial-banner">${icon('trophy')}<h3>${trialResult.score} POINTS</h3></div><div class="offline-grid"><div>${trialResult.wave+1}<small>WAVE REACHED</small></div><div>${trialResult.kills}<small>FOES DEFEATED</small></div><div>${E.money(trialResult.coins)}<small>COINS EARNED</small></div></div><button data-panel="trial">Trial records</button><button data-close="">Return to town</button>`;}
 if(kind==='new'){title='A new adventurer';body=`<p class="intro">${state.characters.length} / ${E.slots(state)} character slots used. Each character chooses a class individually through their quest line.</p><label for="character-name">Name your adventurer</label><input id="character-name" class="name-input" maxlength="24" autocomplete="off" placeholder="Adventurer name"><button class="primary" data-create="">Join the roster</button>`;}
 if(kind==='offline'&&offline){title='Your roster kept adventuring';body=`<p class="intro">Welcome back. ${Math.floor(offline.seconds/3600)}h ${Math.floor(offline.seconds%3600/60)}m of progress${offline.capped?' (eight-hour limit)':''}.</p><div class="offline-grid"><div>${fmt(offline.kills)}<small>ENEMIES</small></div><div>${fmt(offline.items)}<small>MATERIALS</small></div><div>${fmt(offline.coins)}<small>COINS</small></div></div><button class="primary" data-close="">Return to the world</button>`;}
 if(kind==='victory'){title='The Rootwarden falls';eyebrow='THE ROOTWARDEN DEFEATED';body='<p class="intro">The ancient gate is quiet. Your roster has conquered the first world. Collect the heart and return it to Hesta to finish the World One story. Your five professions made this possible.</p><button class="primary" data-close="">Keep exploring</button>';}
 if(kind==='chapter-complete'){title='The Greenreach restored';eyebrow='WORLD ONE STORY COMPLETE';body='<p class="intro">Hesta repairs the well. You have brought five callings together, quieted the Rootbound Gate and earned the Heartwood blueprint. Secret discoveries, world tasks and equipment builds remain within World One.</p><button class="primary" data-close="">Return to the Greenreach</button>';}
 if(kind==='load-error'){title='Your save needs attention';body=`<p class="intro">${esc(loadError)}. Your existing save has been left untouched. Export it before starting fresh, or import a backup.</p><div class="save-actions"><button data-export="">Export original save</button><button data-import="">Import backup</button><button data-fresh="">Start fresh</button></div>`;}
 if(kind==='paused'){title='This roster is open elsewhere';body='<p class="intro">Another tab updated the save. Reload to continue from the latest version.</p><button data-reload="">Reload latest save</button>';}
 const codexKinds=['codex','quick','quests','cards','bestiary','items','stars','achievements','tasks'];html('panel-tabs',codexKinds.includes(kind)?UI.codexNav(['codex','quick'].includes(kind)?'quick':kind):'');$('panel').dataset.kind=kind;$('panel-back').hidden=!panelHistory.length;$('panel-footer-text').textContent=`WORLD ONE · ${c.name} · ${E.money(state.coins)} · ${fmt(state.gems)} GEMS`;
 $('panel-title').textContent=title;$('panel-eyebrow').textContent=eyebrow;html('panel-content',body);
}
function itemCard(id,n,archive=false){const item=ITEMS[id],level=state.archive[id]||0,cost=item.rarity==='common'?10*(level+1):level+1;return`<article class="item-card rarity-${item.rarity}"><div><span class="icon">${item.icon}</span><strong class="quantity">${fmt(n)}</strong></div><h3>${esc(item.name)}</h3><p>${item.rarity.toUpperCase()}${archive?` · Archive level ${level}`:''}</p><p>${purposes(id).map(esc).join(' · ')}</p>${archive?`<button data-offer="${id}" ${n>=cost?'':'disabled'}>Offer ${cost} · +1.5% damage</button>`:''}</article>`;}
function findNpc(id){const def=id==='steward'?{town:'town'}:CLASSES[id];if(!E.areaUnlocked(state,def.town)){toast(E.lockReason(state,def.town));return;}const zone=def.zone||0;if(!travel(def.town,zone))return;world.select(`npc-${id}`);}
function findStation(station){const [area,zone]={anvil:['town',1],foundry:['town',2],enchanting:['jungle-town',0],alchemy:['jungle-town',1]}[station];if(!E.zoneUnlocked(state,area,zone)){toast(E.lockReason(state,area,zone));return;}if(!travel(area,zone))return;world.select('station');}
let targetKey='',lastPanelRefresh=0,panelInteraction=false;
$('panel').addEventListener('pointerdown',()=>{panelInteraction=true;});
$('panel').addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter')panelInteraction=true;});
window.addEventListener('pointerup',()=>{panelInteraction=false;});
window.addEventListener('pointercancel',()=>{panelInteraction=false;});
window.addEventListener('keyup',()=>{panelInteraction=false;});
function buildTargets(){
 const key=world.key+':'+world.map.boss+':'+world.map.monsters.map(e=>e.id).join(',')+':'+world.groundLoot.map(d=>d.id).join(',');if(key===targetKey)return;targetKey=key;
 html('world-objects',[...world.map.entities,...world.groundLoot].map((e,i)=>{const label=e.kind==='drop'?`Pick up ${e.itemId==='coins'?'coins':ITEMS[e.itemId].name}`:e.kind==='enemy'?`Attack ${e.enemy.name} ${i+1}`:e.kind==='node'?`${['copper','iron','gold'].includes(e.resource)?'Mine':'Chop'} ${ITEMS[e.resource].name}`:e.kind==='storage'?'Open storage chest':e.kind==='discovery'?`Inspect ${e.name}`:e.kind==='npc'?`Talk to ${e.name}`:e.kind==='station'?`Use ${e.name}`:['shop','stamps','statues','worldgate','tasks','telescope','constellation','arena'].includes(e.kind)?`Visit ${e.name}`:`Enter ${e.name}`;return`<button class="map-target" data-target="${e.id}" aria-label="${esc(label)}"><span>${esc(label)}</span></button>`;}).join(''));projectTargets();
}
function projectTargets(){renderMinimap();const v=viewFor($('scene'),world.player);for(const button of $('world-objects').children){const e=[...world.map.entities,...world.groundLoot].find(e=>e.id===button.dataset.target);if(!e)continue;button.hidden=e.kind==='enemy'&&e.dead>0||e.x<v.x-80||e.x>v.x+v.width+80||e.y<v.y-160||e.y>v.y+v.height+160;const w=e.kind==='drop'?44:e.kind==='node'?110:90,h=e.kind==='drop'?44:e.kind==='node'?160:e.kind==='portal'?135:120;button.style.left=`${(e.x-w/2-v.x)/v.width*100}%`;button.style.top=`${(e.y-h-v.y)/v.height*100}%`;button.style.width=`${w/v.width*100}%`;button.style.height=`${h/v.height*100}%`;}}
function renderMinimap(){const map=world.map,v=viewFor($('scene'),world.player),svg=$('room-minimap'),x=n=>n/map.width*260,y=n=>(n-map.minY)/map.height*75;svg.dataset.vertical=String(map.minY<0);svg.innerHTML=`<svg viewBox="0 0 260 75" preserveAspectRatio="none" aria-hidden="true">${map.platforms.map(p=>`<path d="M${x(p.x)} ${y(p.y)}h${x(p.w)}" stroke="#8bba82" stroke-width="2"/>`).join('')}${map.ladders.map(l=>`<path d="M${x(l.x)} ${y(l.top)}V${y(l.bottom)}" stroke="#a38b65"/>`).join('')}${map.entities.filter(e=>e.kind!=='enemy').map(e=>`<circle cx="${x(e.x)}" cy="${y(e.y)-3}" r="2" fill="${e.kind==='portal'?'#72dfff':'#e9c06d'}"/>`).join('')}<rect x="${x(v.x)}" y="${y(v.y)}" width="${x(v.width)}" height="${v.height/map.height*75}" fill="#ffffff0c" stroke="#d3e8ef44"/><circle cx="${x(world.player.x)}" cy="${y(world.player.y)-3}" r="3" fill="#fff4be"/></svg>`;}
$('room-minimap').addEventListener('click',event=>{const rect=$('room-minimap').getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width*world.map.width,y=world.map.minY+(event.clientY-rect.top)/rect.height*world.map.height;const e=world.map.entities.filter(e=>e.kind!=='enemy').sort((a,b)=>Math.abs(a.x-x)+Math.abs(a.y-y)-Math.abs(b.x-x)-Math.abs(b.y-y))[0];if(e&&Math.abs(e.x-x)<world.map.width*.035&&Math.abs(e.y-y)<Math.max(100,world.map.height*4/75))world.select(e.id);else world.walkTo(x,y);});
function refresh(){
 const c=world.c,a=areaById(c.area),abilities=assignedAbilities(c);E.claimGems(state);E.refreshTeleports(state);
 html('roster',state.characters.map(ch=>`<button data-character="${ch.id}" class="${ch.id===c.id?'active':''}" aria-pressed="${ch.id===c.id}"><span class="portrait">${portrait(ch)}</span><span>${esc(ch.name)}<span class="sub">${ch.class?CLASSES[ch.class].name:'Beginner'} · Lv. ${ch.level}</span></span></button>`).join(''));
 $('new-character').disabled=state.characters.length>=E.slots(state);$('new-character').title=`${state.characters.length} / ${E.slots(state)} slots. Discover a class to unlock another.`;
 $('area-label').textContent=`WORLD 1 · ${a.label.toUpperCase()} · ${c.zone+1}/${a.zones.length}`;$('zone-name').textContent=world.map.layout.title|| (world.map.boss?'The Rootwarden':world.map.secret?SECRETS[world.map.secret].name:a.zones[c.zone]);
 $('mana-status').textContent='AFK INFO';$('mana-bar').style.width=(c.mp/E.maxMana(c)*100)+'%';$('mana-label').textContent=`${Math.floor(c.mp)} / ${E.maxMana(c)} MP`;$('food-count').textContent='FOOD '+c.foodSlots.reduce((n,t)=>n+(t?.count||0),0);$('quest-tracker').hidden=!state.options.questHelper;document.body.classList.toggle('ui-compact',state.options.compact);$('trial-hud').hidden=!c.trial;if(c.trial)$('trial-status').textContent=`WAVE ${c.trial.wave+1}/8 · ${Math.ceil(c.trial.time)}s · ${c.trial.score} POINTS`;
 document.querySelectorAll('.game-menu [data-panel]').forEach(b=>b.classList.toggle('active',b.dataset.panel===panelKind));
 $('bag-count').textContent=`Backpack ${E.bagUsed(c)}/${E.bagCapacity(c)}`;
 $('player-name').textContent=c.name;$('player-class').textContent=`${c.class?CLASSES[c.class].name:'Beginner'} · Lv. ${c.level}`;$('coin-count').textContent=E.money(state.coins);$('gem-count').textContent=`◇ ${fmt(state.gems)}`;
 $('health-bar').style.width=`${Math.max(0,c.hp/E.maxHp(c)*100)}%`;$('health-label').textContent=`${fmt(c.hp)} / ${E.maxHp(c)} HP`;$('xp-bar').style.width=`${c.xp/E.xpNeeded(c)*100}%`;$('xp-label').textContent=`${fmt(c.xp)} / ${E.xpNeeded(c)} XP`;
 $('auto-button').setAttribute('aria-pressed',String(world.auto));$('auto-button').querySelector('i').textContent=world.auto?'ON':'OFF';
 for(const [slot,id]of [[0,'skill-button'],[1,'secondary-button'],[2,'utility-button']]){const button=$(id),skill=abilities[slot],index=c.hotbar[slot],available=!!skill&&abilityAvailable(c,index);button.disabled=!available;button.querySelector('span').textContent=skill?.icon||'⌑';button.querySelector('small').textContent=available?skill.name.toUpperCase():skill?'TRAIN TALENT':'CLASS REQUIRED';button.title=available?skill.description:'Learn this technique in the class talent tab';const cd=index===0?world.player.skill:world.player.cooldowns[index];button.querySelector('b').textContent=cd>0?Math.ceil(cd):'';}
 const kills=state.kills[zoneEnemy(c.area,c.zone)?.id]||0;
 let tracker=c.class?`<strong>${CLASSES[c.class].name} · ${esc(c.name)}</strong><p>✦ ${E.talentPoints(c)} unspent talent points</p><p>${state.unlockedClasses.length} / 5 classes discovered</p>`:`<strong>Find your calling</strong><p class="${c.level>=3?'done':''}">${c.level>=3?'✓':'○'} Reach character level 3 (${c.level}/3)</p><p>○ Find Willow by the oak tree or Brann by copper ore</p><p>○ Complete your class initiation</p>`;
 const tracked=E.questStatus(state,state.trackedQuest),quest=tracked?.accepted&&!tracked.done?tracked:STORY.map(q=>E.questStatus(state,q.id)).find(q=>q.accepted&&!q.done);if(quest?.accepted)tracker=`<strong>${quest.q.name}</strong><p>${quest.accepted?'':'Talk to '+(quest.q.giver==='steward'?'Hesta':CLASSES[quest.q.giver].trainer)+' · '}${quest.tasks.filter(t=>!t.done).slice(0,2).map(t=>t.text+' ('+fmt(t.have)+'/'+t.need+')').join(' · ')||'Return to the quest giver'}</p><p>${state.unlockedClasses.length}/5 classes · Backpack ${E.bagUsed(c)}/${E.bagCapacity(c)}</p>`;
 if(zoneEnemy(c.area,c.zone))tracker+=`<p class="${kills>=12?'done':''}">${kills>=12?'✓ Next route unlocked':`○ Open next route: ${kills}/12 kills`}</p>`;html('quest-tracker',`<button data-panel="quests" class="tracker-edit" aria-label="Open quest journal">!</button>`+tracker);
 $('world-hint').textContent=world.player.climbing?'Climbing · W / S or touch arrows':world.target?.kind==='node'?`Gathering ${ITEMS[world.target.resource].name} · Other characters keep working`:world.auto?'AUTO is on · Click a target or use movement controls to take over':'Tap ground to walk · Tap targets to interact · W / S for ladders';
 loot=loot.filter(l=>l.until>Date.now());html('loot-feed',loot.map(l=>`<p>${esc(l.text)}</p>`).join(''));
 $('knockout').hidden=world.player.respawn<=0;
 buildTargets();if($('panel').open&&!panelInteraction&&!document.activeElement?.matches('#panel input,#panel select')&&performance.now()-lastPanelRefresh>1000&&!['new','welcome','offline','settings','load-error','paused','victory','assignment','chapter-complete','minigame','trial-result'].includes(panelKind)){renderPanel();lastPanelRefresh=performance.now();}
}
document.addEventListener('click',event=>{
 const b=event.target.closest('button');if(!b||b.disabled)return;const d=b.dataset,c=world.c;
 if(paused&&d.reload===undefined)return;
 if(d.panelBack!==undefined){const previous=panelHistory.pop();if(previous)openPanel(previous,true);return;}
 if(d.attackToggle!==undefined){const open=document.body.classList.toggle('attacks-open');b.setAttribute('aria-expanded',String(open));return;}
 if(d.endTrial!==undefined){world.endTrial(false);return;}
 if(d.startTrial!==undefined){if(world.beginTrial()){closePanel();targetKey='';save();refresh();}else toast('Stand by the trial board with a ticket at level 3 or higher.');return;}
 if(d.option){if(Object.hasOwn(state.options,d.option))state.options[d.option]=!state.options[d.option];save();renderPanel();refresh();return;}
 if(d.selectTalent){talentView.selected=d.selectTalent;renderPanel();return;}
 const selections={questFilter:'questFilter',selectQuest:'quest',cardGroup:'cardGroup',selectCard:'card',recipeFilter:'recipeFilter',selectRecipe:'recipe',enemyArea:'enemyArea',selectEnemy:'enemy',selectItem:'item',starTab:'starTab',selectSign:'sign',mapRoom:'mapRoom',stampGroup:'stampGroup',selectStamp:'stamp',selectStatue:'statue',industryTab:'industryTab',stoneItem:'stoneItem'};
 for(const[key,value]of Object.entries(selections))if(d[key]!==undefined){uiView[value]=key==='stoneItem'?Number(d[key]):d[key];if(d.openCard!==undefined)openPanel('cards');else if(d.openEnemy!==undefined)openPanel('bestiary');else renderPanel();return;}
 if(d.openIndustry){uiView.industryTab=d.openIndustry;openPanel('industry');return;}
 if(d.codexTab){openPanel(d.codexTab);return;}
 if(d.codexItem){uiView.item=d.codexItem;uiView.itemSearch='';openPanel('items');return;}
 if(d.openRecipe){uiView.recipe=d.openRecipe;uiView.recipeFilter='all';uiView.recipeSearch='';openPanel('craft');return;}
 if(d.revealRoom){uiView.mapRoom=d.revealRoom;openPanel('map');return;}
 if(d.recipeFavorite){E.favoriteRecipe(state,d.recipeFavorite);save();renderPanel();return;}
 if(d.shopItem){shopView.item=d.shopItem;renderPanel();return;}
 if(d.cardCollection){E.chooseCardCollection(state,c,d.cardCollection);save();renderPanel();return;}
 if(d.unlockSign||d.equipSign||d.vaultUpgrade||d.achievement){let ok=false;if(d.unlockSign)ok=E.unlockSign(state,d.unlockSign);if(d.equipSign)ok=E.equipSign(state,c,d.equipSign);if(d.vaultUpgrade)ok=E.upgradeVault(state,d.vaultUpgrade);if(d.achievement)ok=E.claimAchievement(state,d.achievement);if(!ok)toast('Requirements are not met yet.');E.syncAccount(state);save();renderPanel();refresh();return;}
 const stationNear=station=>world.map.stations.some(e=>e.station===station&&Math.abs(e.x-world.player.x)<110&&Math.abs(e.y-world.player.y)<70);
 if(d.card||d.cardPreset||d.foodEquip!==undefined||d.foodRemove!==undefined||d.product||d.claimProduct||d.anvilUpgrade||d.anvilPoint!==undefined||d.furnaceConfig!==undefined||d.furnaceLoad!==undefined||d.furnaceClaim!==undefined||d.furnaceUnload!==undefined||d.stone||d.task||d.merit){
 let ok=false;
 if(d.card)ok=E.equipCard(state,c,d.card);
 if(d.cardPreset)ok=E.chooseCards(state,c,d.cardPreset);
 if(d.foodEquip!==undefined)ok=E.equipFood(c,Number(d.foodEquip),Number(d.index),inventoryView.quantity||Infinity);
 if(d.foodRemove!==undefined)ok=E.unequipFood(c,Number(d.foodRemove));
 if(d.product)ok=E.chooseProduct(c,d.product);
 if(d.claimProduct)ok=E.claimAnvil(state,c,d.claimProduct);
 if(d.anvilUpgrade)ok=E.upgradeAnvil(c,d.anvilUpgrade);
 if(d.anvilPoint!==undefined)ok=stationNear('anvil')&&E.buyAnvilPoint(state,c);
 if(d.furnaceConfig!==undefined)ok=stationNear('foundry')&&E.configureFurnace(state,c,Number(d.furnaceConfig),d.ore);
 if(d.furnaceLoad!==undefined)ok=stationNear('foundry')&&E.loadFurnace(state,c,Number(d.furnaceLoad),d.kind,10);
 if(d.furnaceClaim!==undefined)ok=stationNear('foundry')&&E.claimFurnace(state,c,Number(d.furnaceClaim));
 if(d.furnaceUnload!==undefined)ok=stationNear('foundry')&&E.unloadFurnace(state,c,Number(d.furnaceUnload));
 if(d.stone)ok=stationNear('anvil')&&E.applyStone(state,c,Number(d.uid),d.stone);
 if(d.task)ok=E.claimTask(state,d.task,d.daily==='true');
 if(d.merit){ok=E.buyMerit(state,d.merit);E.syncAccount(state);}
 if(!ok)toast('Could not complete that action. Check materials, bag space and station access.');save();renderPanel();refresh();return;
 }
 if(d.minigame){const node=world.map.resources.find(n=>n.resource===d.minigame&&Math.abs(n.x-world.player.x)<100&&Math.abs(n.y-world.player.y)<60);if(!node||E.gatherRequirement(c,d.minigame)){toast('Approach this resource and begin gathering first.');return;}if(!E.beginMinigame(c,d.minigame)){toast('Three games per skill per day. Come back tomorrow.');return;}world.stop();openPanel('minigame');save();return;}
 if(d.minigameHit!==undefined){const result=E.hitMinigame(c);if(result?.done){E.give(c,result.resource,result.count);E.skillXp(c,result.skill,result.xp);E.recordGather(state,c,result.resource,result.count);const node=world.map.resources.find(n=>n.resource===result.resource);if(node)world.select(node.id);toast(`Score ${result.score}/15 · +${result.count} resources · +${result.xp} skill XP`);openPanel('afk');}else renderPanel();save();return;}
 if(d.reload!==undefined){location.reload();return;}
 if(paused)return;
 if(d.close!==undefined){closePanel();return;}
 if(d.target){if(d.target.startsWith('loot-'))world.pickLoot(d.target);else world.select(d.target);refresh();save();return;}
 if(d.panel){openPanel(d.panel);return;}
 if(d.character){world.collectAll();state.active=Number(d.character);world.switchCheck();buildTargets();save();refresh();return;}
 if(d.travel){travel(d.travel,Number(d.zone));return;}
 if(d.findNpc){findNpc(d.findNpc);return;}
 if(d.findStation){findStation(d.findStation);return;}
 if(d.findStorage!==undefined){if(!['town','jungle-town'].includes(c.area)){if(!travel('town',0))return;}else closePanel();world.select('storage');return;}
 if(d.findFacility){if(travel('town',3))world.select(d.findFacility);return;}
 if(d.findShop){if(travel(d.findShop,0))world.select('shop');return;}
 if(d.talentsTab){talentView.tab=d.talentsTab;talentView.selected=null;renderPanel();return;}
 if(d.talentCount){talentView.count=Number(d.talentCount);renderPanel();return;}
 if(d.classTalent){E.train(c,d.classTalent,'class',talentView.count);save();renderPanel();refresh();return;}
 if(d.assignAbility!==undefined){E.assignAbility(c,Number(d.assignAbility),Number(d.slot));save();renderPanel();refresh();return;}
 if(d.townAction){const ok=E.townAction(state,c,d.townAction,d.id);toast(ok?'Progress saved. Bonuses updated.':'Bring the required carried items and stand near this facility.');save();renderPanel();refresh();return;}
 if(d.shopBuy){toast(E.buyShop(state,c,d.shopBuy,Number(d.count))?'Purchased into this backpack.':'Not enough coins, stock or backpack space.');save();renderPanel();refresh();return;}
 if(d.shopSelect!==undefined){shopView={...shopView,sellIndex:Number(d.shopSelect),quantity:1,confirm:false};renderPanel();return;}
 if(d.shopSell!==undefined){const t=E.bagSlots(c)[Number(d.shopSell)];if(!shopView.confirm){shopView.confirm=true;shopView.key=t?.uid||t?.id;renderPanel();return;}const ok=shopView.key===(t?.uid||t?.id)&&E.sellSlot(state,c,Number(d.shopSell),shopView.quantity||1);toast(ok?'Sold selected items.':'Cannot sell this slot.');shopView={};save();renderPanel();refresh();return;}
 if(d.townReturn){toast(world.townReturn(d.townReturn)?'Town return consumed.':'Carry a Bottled Town Return and choose a discovered town.');closePanel();save();refresh();return;}
 if(d.cosmeticBuy){toast(E.buyCosmetic(state,d.cosmeticBuy)?'Cosmetic unlocked for the roster.':'Not enough gems or already owned.');save();renderPanel();refresh();return;}
 if(d.cosmeticWear){E.wearCosmetic(state,c,d.cosmeticWear==='none'?null:d.cosmeticWear);save();renderPanel();return;}
 if(d.invStorage!==undefined){inventoryView.storage=inventoryView.storage===false;renderPanel();return;}
 if(d.invTab){inventoryView.tab=d.invTab;inventoryView.worn=null;renderPanel();return;}
 if(d.invPage!==undefined){inventoryView[d.source==='chest'?'chestPage':'page']=Number(d.invPage);renderPanel();return;}
 if(d.invLockMode!==undefined){inventoryView.lockMode=!inventoryView.lockMode;inventoryView.moving=false;renderPanel();return;}
 if(d.invSort!==undefined){E.sortBag(c);inventoryView.index=null;save();renderPanel();return;}
 if(d.invWorn){inventoryView.worn=d.invWorn;inventoryView.index=null;renderPanel();return;}
 if(d.invSlot!==undefined){const index=Number(d.invSlot);if(inventoryView.lockMode&&d.source==='bag')E.toggleSlotLock(c,index);else if(inventoryView.moving&&d.source===inventoryView.source){toast((d.source==='bag'?E.moveSlot(c,inventoryView.index,index,inventoryView.quantity):E.storageAccess(c)&&E.moveChestSlot(state,inventoryView.index,index,inventoryView.quantity))?'Items moved.':'Cannot move into that slot. Unlock it or choose another.');inventoryView.moving=false;}else{inventoryView.index=index;inventoryView.source=d.source;inventoryView.worn=null;inventoryView.quantity=null;inventoryView.confirmDrop=false;}save();renderPanel();return;}
 if(d.invLock!==undefined){E.toggleSlotLock(c,Number(d.invLock));inventoryView.moving=false;save();renderPanel();return;}
 if(d.invMove!==undefined){if(!inventoryView.quantity){const g=inventoryView.source==='bag'?E.bagSlots(c):E.chestSlots(state);inventoryView.quantity=g[inventoryView.index]?.qty||1;}inventoryView.moving=!inventoryView.moving;inventoryView.confirmDrop=false;renderPanel();return;}
 if(d.capacityBag){toast(E.useCapacityBag(c,d.capacityBag)?'Pouch consumed. This character can carry larger stacks.':'This pouch was already used or is not in the backpack.');save();renderPanel();refresh();return;}
 if(d.invTransfer!==undefined){toast('Transferred '+fmt(E.transferSlot(state,c,inventoryView.index,inventoryView.quantity||Infinity,inventoryView.source))+' items.');inventoryView.confirmDrop=false;save();renderPanel();return;}
 if(d.invDrop!==undefined){if(!inventoryView.confirmDrop){const t=E.bagSlots(c)[inventoryView.index];inventoryView.dropKey=t?.uid||t?.id;inventoryView.confirmDrop=true;renderPanel();return;}const t=E.bagSlots(c)[inventoryView.index];const dropped=(t?.uid||t?.id)===inventoryView.dropKey&&world.dropInventory(inventoryView.index,inventoryView.quantity||Infinity);toast(dropped?'Item dropped beside your character.':'Unlock this slot before dropping.');inventoryView.confirmDrop=false;save();renderPanel();buildTargets();return;}
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
 if(d.profTalent){E.train(c,d.profTalent,'profession',talentView.count);save();renderPanel();refresh();return;}
 if(d.saveBuild!==undefined){E.saveBuild(c,Number(d.saveBuild));save();renderPanel();return;}
 if(d.loadBuild!==undefined){E.loadBuild(c,Number(d.loadBuild));c.hp=Math.min(c.hp,E.maxHp(c));save();renderPanel();refresh();return;}
 if(d.resetBuild!==undefined){E.resetBuild(c);c.hp=Math.min(c.hp,E.maxHp(c));save();renderPanel();refresh();return;}
 if(d.queue){if(E.enqueue(state,c,d.queue,Number(d.count)))toast('Foundry inputs reserved. Batches started.');else toast('Not enough materials, coins or queue slots.');save();renderPanel();return;}
 if(d.cancelJob){E.cancelJob(state,Number(d.cancelJob));save();renderPanel();return;}
 if(d.rune){if(world.map.stations.some(e=>e.station==='enchanting'&&Math.abs(e.x-world.player.x)<110)&&E.enchant(state,c,d.slot,d.rune,Number(d.index)))toast('Rune etched.');save();renderPanel();refresh();return;}
 if(d.research){if(E.research(state,c,d.research))toast('Alchemy research improved the roster.');save();renderPanel();refresh();return;}

 if(d.track){state.trackedQuest=d.track;save();renderPanel();refresh();return;}
 if(d.story){const giver=npc?.classId||npc?.role,st=E.questStatus(state,d.story);if(!npc||Math.abs(world.player.x-npc.x)>110||st?.q.giver!==giver)return;if(!st.accepted)E.acceptQuest(state,d.story);else if(E.claimQuest(state,c,d.story,giver)){audio.play('quest');toast('Quest complete: '+st.q.name);if(st.q.reward.complete){openPanel('chapter-complete');save();refresh();return;}}save();renderPanel();refresh();return;}
 if(d.assignment){assignmentId=Number(d.assignment);openPanel('assignment');return;}
 if(d.applyAssignment){const worker=state.characters.find(c=>c.id===Number(d.applyAssignment)),[area,index]=$('assignment-route').value.split(':'),activity=$('assignment-task').value;if(worker.id===state.active)world.collectAll();else{for(const drop of worker.groundLoot||[]){if(drop.itemId==='coins')state.coins+=drop.count;else E.give(worker,drop.itemId,drop.count);}worker.groundLoot=[];}if(!E.travel(state,worker,area,Number(index))){toast('Route is locked.');return;}const resource=activity==='gather'?areaById(area).resources[Number(index)][0]:null;if(!E.start(state,worker,activity,resource))toast(resource?E.gatherRequirement(worker,resource):'That task is unavailable.');if(worker.id===state.active){world.enter();targetKey='';}save();openPanel('roster');refresh();return;}
 if(d.audio!==undefined){audio.enable(!audio.enabled);state.settings={...state.settings,audio:audio.enabled,volume:audio.volume};save();renderPanel();return;}
 if(d.quest){if(!npc||npc.classId!==d.quest||Math.abs(world.player.x-npc.x)>110)return;if(E.progressClass(state,c,d.quest)){toast(c.class?`${c.name} became a ${CLASSES[c.class].name}! A new path opens.`:'Initiation step complete.');save();renderPanel();refresh();}return;}
 if(d.craft){if(world.map.stations.some(e=>Math.abs(e.x-world.player.x)<110)&&E.craft(state,c,d.craft)){toast(state.log[0]);save();renderPanel();refresh();}return;}
 if(d.talent){if(E.trainTalent(c,d.talent,talentView.count)){save();renderPanel();refresh();}return;}
 if(d.offer){if(!E.nearFacility(c,'stamps'))return;if(E.offer(state,d.offer)){toast(state.log[0]);save();renderPanel();refresh();}return;}
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
$('attack-button').addEventListener('click',()=>{if(!world.basicAttack()){world.findTarget();if(world.target)world.c.activity=world.map.trial?'trial':world.map.boss?'boss':'fight';}refresh();});
$('skill-button').addEventListener('click',()=>{world.useSkill(0);refresh();});
$('secondary-button').addEventListener('click',()=>{world.useSkill(1);refresh();});
$('utility-button').addEventListener('click',()=>{world.useSkill(2);refresh();});
$('manage-roster').addEventListener('click',()=>openPanel('roster'));
document.addEventListener('input',e=>{if(['recipe-search','item-search'].includes(e.target.id)){const id=e.target.id,key=id==='recipe-search'?'recipeSearch':'itemSearch',start=e.target.selectionStart;uiView[key]=e.target.value;renderPanel();const input=$(id);input.focus();input.setSelectionRange(start,start);return;}if(e.target.id==='audio-volume'){audio.volume=Number(e.target.value);state.settings={...state.settings,volume:audio.volume};save();}});
document.addEventListener('pointerdown',()=>{if(state.settings?.audio&&!audio.enabled){audio.volume=state.settings.volume??.2;audio.enable(true);}},{once:true});
$('interact-button').addEventListener('click',()=>world.interact());
$('jump-button').addEventListener('click',()=>{input.jump=true;});
$('scene').addEventListener('pointerdown',e=>{if($('panel').open)return;const rect=$('scene').getBoundingClientRect(),v=viewFor($('scene'),world.player),x=(e.clientX-rect.left)/rect.width*v.width+v.x,y=(e.clientY-rect.top)/rect.height*v.height;world.walkTo(x,y);$('scene').focus({preventScroll:true});});
for(const b of document.querySelectorAll('[data-hold]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);input[b.dataset.hold]=true;});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>{input[b.dataset.hold]=false;});}
const keyMap={a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right',w:'up',ArrowUp:'up',s:'down',ArrowDown:'down',f:'attack'};
window.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea'))return;if(!$('panel').open){const shortcut={i:'inventory',t:'skills',c:'codex',m:'map',p:'roster',Escape:'menu'}[e.key==='Escape'?e.key:e.key.toLowerCase()];if(shortcut&&!e.repeat){e.preventDefault();openPanel(shortcut);return;}if(e.key.toLowerCase()==='q'&&!e.repeat){document.body.classList.toggle('attacks-open');return;}}if($('panel').open)return;const mapped=keyMap[e.key]||keyMap[e.key.toLowerCase()];if(mapped){e.preventDefault();input[mapped]=true;}if(e.code==='Space'){e.preventDefault();if(!e.repeat)input.jump=true;}if(['1','2','3'].includes(e.key)&&!e.repeat)world.useSkill(Number(e.key)-1);if(e.key.toLowerCase()==='e'&&!e.repeat)world.interact();if(e.key.toLowerCase()==='m'&&!e.repeat)openPanel('map');if(e.key.toLowerCase()==='i'&&!e.repeat)openPanel('inventory');});
window.addEventListener('keyup',e=>{const mapped=keyMap[e.key]||keyMap[e.key.toLowerCase()];if(mapped)input[mapped]=false;});window.addEventListener('blur',()=>{input={};});
$('import-file').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>2000000)throw Error('File is too large.');const incoming=E.restoreSave(JSON.parse(await file.text()));if(!confirm('Replace this roster with the imported save? Export a backup first if you want to keep it.'))return;state=incoming;world.state=state;loadError=null;offline=E.claimOffline(state);world.enter();targetKey='';closePanel();save();refresh();toast('Save imported.');}catch(err){toast(`Could not import: ${err.message}`);}});
window.addEventListener('storage',e=>{if(e.key===KEY&&e.newValue){paused=true;input={};openPanel('paused');}});
window.addEventListener('pagehide',save);
document.addEventListener('visibilitychange',()=>{input={};if(paused)return;if(document.hidden){save();}else{offline=E.claimOffline(state);last=performance.now();lastWall=Date.now();world.enter();targetKey='';refresh();save();if(offline.seconds>60)openPanel('offline');}});
const systemReduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let renderTime=0;
function frame(time){const reduced=systemReduced||state.options.reducedMotion;const delta=Math.max(0,(time-last)/1000);last=time;
 if(!paused&&!document.hidden){
  const wall=Date.now(),elapsed=Math.max(0,(wall-lastWall)/1000);lastWall=wall;
  // Suspended tabs are claimed once from their last saved timestamp, never through a giant physics step.
  if(elapsed>10){E.advance(state,elapsed);world.enter();targetKey='';save();}else{E.advanceProduction(state,elapsed);E.advanceBackground(state,elapsed);let remain=Math.min(.25,delta);const controls=$('panel').open?{}:input;while(remain>0){const dt=Math.min(.025,remain);world.step(dt,{horizontal:(controls.right?1:0)-(controls.left?1:0),vertical:(controls.up?1:0)-(controls.down?1:0),jump:!!controls.jump,attack:!!controls.attack});input.jump=false;remain-=dt;}}
  if(time-lastUi>180){refresh();lastUi=time;}if(time-lastSave>8000){save();lastSave=time;}
 }
 const timing=$('timing-marker'),game=world.c.minigame;if(timing&&game){const phase=(Date.now()-game.started)%1200/1200;timing.style.left=((phase<.5?phase*2:2-phase*2)*100)+'%';}
 if(time-renderTime>(reduced?120:25)){drawWorld($('scene'),world,time/1000,reduced);projectTargets();renderTime=time;}
 requestAnimationFrame(frame);
}
refresh();requestAnimationFrame(frame);
if(loadError)openPanel('load-error');else if(offline?.seconds>60)openPanel('offline');else if(!state.worldViewIntro){state.worldViewIntro=true;openPanel('welcome');}

// Tap-to-move is the primary touch interaction; native dragging is a PC shortcut.
document.addEventListener('input',event=>{if(event.target.id==='shop-sell-quantity'){shopView.quantity=Math.max(1,Math.floor(Number(event.target.value)||1));shopView.confirm=false;}if(event.target.id==='inventory-quantity'){const value=Number(event.target.value);inventoryView.quantity=Number.isFinite(value)&&value>0?Math.floor(value):1;inventoryView.confirmDrop=false;}});
let draggedInventory=null;
document.addEventListener('dragstart',event=>{const slot=event.target.closest('[data-inv-slot]');if(!slot||slot.draggable!==true)return;draggedInventory={source:slot.dataset.source,index:Number(slot.dataset.invSlot)};event.dataTransfer.setData('text/plain','wildroot-item');event.dataTransfer.effectAllowed='move';});
document.addEventListener('dragover',event=>{if(draggedInventory&&event.target.closest('[data-inv-slot]'))event.preventDefault();});
document.addEventListener('drop',event=>{const slot=event.target.closest('[data-inv-slot]');if(!draggedInventory||!slot)return;event.preventDefault();const from=draggedInventory;draggedInventory=null;const dest=slot.dataset.source;if(from.source==='bag'&&dest==='bag')E.moveSlot(world.c,from.index,Number(slot.dataset.invSlot));else if(from.source==='chest'&&dest==='chest'&&E.storageAccess(world.c))E.moveChestSlot(state,from.index,Number(slot.dataset.invSlot));else if(from.source!==dest)E.transferSlot(state,world.c,from.index,Infinity,from.source);save();renderPanel();});
document.addEventListener('dragend',()=>{draggedInventory=null;});
