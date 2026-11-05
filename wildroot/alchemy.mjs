import * as I from './inventory.mjs?v=16';
import {serviceAccess} from './services.mjs?v=16';

export const CAULDRONS={
 orange:{name:'Ember Cauldron',color:'#ba633b',bubbles:['copperheart','ironwill','bigstrike']},
 green:{name:'Grove Cauldron',color:'#58743d',bubbles:['rootwise','sapwise','bigharvest']},
 purple:{name:'Twilight Cauldron',color:'#805a92',bubbles:['sparkwise','fleetwise','bigstudy']},
 yellow:{name:'Sun Cauldron',color:'#ac8428',bubbles:['coinwise','forgewise','bigforge']}
};
// Small bubbles improve the roster; large bubbles must be equipped per character.
export const BUBBLES={
 copperheart:{name:'Copper Heart',effect:'health',amount:.02,cost:{copper:10}},
 ironwill:{name:'Iron Will',effect:'attack',amount:.02,cost:{'iron-bar':2}},
 bigstrike:{name:'Mighty Strikes',effect:'attack',amount:.04,cost:{'boar-hide':8},big:true},
 rootwise:{name:'Deep Roots',effect:'mining',amount:.03,cost:{oak:12}},
 sapwise:{name:'Rising Sap',effect:'logging',amount:.03,cost:{birch:12}},
 bigharvest:{name:'Gather Together',effect:'mining',extra:'logging',amount:.05,cost:{'jungle-wood':8},big:true},
 sparkwise:{name:'Brighter Ideas',effect:'skillXP',amount:.03,cost:{dust:4}},
 fleetwise:{name:'Light Feet',effect:'speed',amount:.01,cost:{'moth-wing':5}},
 bigstudy:{name:'Hands-on Learning',effect:'skillXP',amount:.06,cost:{'wisp-ember':5},big:true},
 coinwise:{name:'Golden Habit',effect:'coins',amount:.02,cost:{'grove-seed':6}},
 forgewise:{name:'Steady Furnace',effect:'crafting',amount:.03,cost:{'copper-bar':3}},
 bigforge:{name:'Master Maker',effect:'crafting',amount:.06,cost:{'gold-bar':2},big:true}
};
export const VIALS={
 copper:{name:'Copper Suspension',effect:'mining',amount:.02},
 oak:{name:'Oak Extract',effect:'logging',amount:.02},
 'moss-slime':{name:'Moss Jelly',effect:'health',amount:.02},
 'bat-fang':{name:'Fang Tincture',effect:'attack',amount:.01},
 birch:{name:'Birch Essence',effect:'skillXP',amount:.02},
 'vine-fiber':{name:'Vine Solution',effect:'crafting',amount:.02}
};
const DAY=86400000,level=c=>1+Math.floor(Math.sqrt(c.skills.alchemy/12));
export const alchemyLevel=s=>Math.max(...s.characters.map(level));
export const bigBubbleSlots=s=>alchemyLevel(s)>=7?2:1;
export function initializeAlchemy(s){
 const a=s.alchemy;
 a.cauldrons??=Object.fromEntries(Object.keys(CAULDRONS).map(id=>[id,{progress:0,points:0,unlocked:[],failures:0,boosts:{speed:0,luck:0,cost:0,extra:0},coins:0}]));
 a.bubbles??={};a.vials??={};a.vialFailures??={};a.assignments??={};a.liquidUpgrades??={water:{rate:0,capacity:0},mist:{rate:0,capacity:0}};a.mist??=0;
 a.vialDay??={day:Math.floor(Date.now()/DAY),used:0};a.lastResult??='Assign characters to begin brewing. Your old research bonuses remain active.';
 for(const c of s.characters)c.bigBubbles??=[];
 return s;
}
export const waterCap=s=>40+(s.guild?.study||0)*10+s.alchemy.liquidUpgrades.water.capacity*10;
export const mistCap=s=>20+s.alchemy.liquidUpgrades.mist.capacity*5;
export function brewDuration(s,id){const a=s.alchemy.cauldrons[id];return 90/(1+a.boosts.speed*.15+a.coins*.05);}
export function assigned(s,id){return s.characters.filter(c=>s.alchemy.assignments[c.id]===id);}
export function assignCauldron(s,c,characterId,id){const who=s.characters.find(c=>c.id===Number(characterId));if(!serviceAccess(s,c,'alchemy','upgrade')||!who||id!==''&&!CAULDRONS[id]&&!['water','mist'].includes(id)||id==='mist'&&alchemyLevel(s)<5||id&&assigned(s,id).length>=2&&s.alchemy.assignments[who.id]!==id)return false;if(id)s.alchemy.assignments[who.id]=id;else delete s.alchemy.assignments[who.id];return true;}
export function advanceAlchemy(s,seconds){
 const a=s.alchemy;
 a.liquid=Math.min(waterCap(s),a.liquid+seconds*.03*(1+(s.guild.study||0)*.1+a.liquidUpgrades.water.rate*.15+assigned(s,'water').length*.5));
 if(alchemyLevel(s)>=5)a.mist=Math.min(mistCap(s),a.mist+seconds*.01*(1+a.liquidUpgrades.mist.rate*.15+assigned(s,'mist').length*.5));
 for(const id of Object.keys(CAULDRONS)){const workers=assigned(s,id);if(!workers.length)continue;const d=a.cauldrons[id],duration=brewDuration(s,id);if(d.points>=10)continue;
  const strength=workers.reduce((n,c)=>n+(1+(level(c)-1)*.05)*(c.class==='alchemist'?1.35:1),0);
  d.progress+=seconds*strength;const n=Math.min(10-d.points,Math.floor(d.progress/duration));d.points+=n;d.progress-=n*duration;if(d.points>=10)d.progress=0;
  for(const c of workers)c.skills.alchemy+=n*2;
 }
}
export function bubbleChance(s,id){const d=s.alchemy.cauldrons[id];return d.unlocked.length===0||d.failures>=3?1:Math.min(.9,.35+d.boosts.luck*.06+d.coins*.01+d.failures*.15);}
export function brewBubble(s,c,id,rng=Math.random){const d=s.alchemy.cauldrons[id],defs=CAULDRONS[id];if(!serviceAccess(s,c,'alchemy','upgrade')||!d||d.points<1||d.unlocked.length>=defs.bubbles.length)return false;d.points--;
 if(rng()<bubbleChance(s,id)){const next=defs.bubbles[d.unlocked.length];d.unlocked.push(next);s.alchemy.bubbles[next]=1;d.failures=0;s.alchemy.lastResult=`Discovered ${BUBBLES[next].name}!`;if(d.boosts.extra&&rng()<Math.min(.5,d.boosts.extra*.05))d.points=Math.min(10,d.points+1);}
 else{d.failures++;s.alchemy.lastResult=`No bubble this time. Discovery chance increased; guaranteed after three misses.`;}
 c.skills.alchemy+=4;return true;
}
export function boostCauldron(s,c,id,kind){const d=s.alchemy.cauldrons[id];if(!serviceAccess(s,c,'alchemy','upgrade')||!d||!Object.hasOwn(d.boosts,kind)||d.boosts[kind]>=10||d.points<1)return false;d.points--;d.boosts[kind]++;return true;}
export function bubbleCost(s,id){const d=BUBBLES[id],n=s.alchemy.bubbles[id]||0,cauldron=Object.keys(CAULDRONS).find(k=>CAULDRONS[k].bubbles.includes(id)),discount=s.alchemy.cauldrons[cauldron]?.boosts.cost||0;return{water:Math.max(1,Math.ceil((3+n*2)*(1-discount*.04))),mist:n>=5?n-4:0,items:Object.fromEntries(Object.entries(d?.cost||{}).map(([k,v])=>[k,v*n]))};}
export function upgradeBubble(s,c,id){const n=s.alchemy.bubbles[id],cost=BUBBLES[id]?bubbleCost(s,id):null;if(!serviceAccess(s,c,'alchemy','upgrade')||!n||n>=10||s.alchemy.liquid<cost.water||s.alchemy.mist<cost.mist||!I.pay(s,cost.items,c))return false;s.alchemy.liquid-=cost.water;s.alchemy.mist-=cost.mist;s.alchemy.bubbles[id]++;c.skills.alchemy+=4;return true;}
export function equipBubble(s,c,id){if(!serviceAccess(s,c,'alchemy','upgrade')||!BUBBLES[id]?.big||!s.alchemy.bubbles[id])return false;const i=c.bigBubbles.indexOf(id);if(i>=0)c.bigBubbles.splice(i,1);else if(c.bigBubbles.length<bigBubbleSlots(s))c.bigBubbles.push(id);else return false;return true;}
export function rollVialDay(s,now=Date.now()){const day=Math.floor(now/DAY);if(day>s.alchemy.vialDay.day)s.alchemy.vialDay={day,used:0};}
export function discoverVial(s,c,id,rng=Math.random,now=Date.now()){rollVialDay(s,now);const a=s.alchemy;if(!serviceAccess(s,c,'alchemy','upgrade')||!VIALS[id]||a.vials[id]||a.vialDay.used>=6||I.unlockedAmount(c,id)<10)return false;let remaining=10;for(let i=0;i<I.bagSlots(c).length&&remaining;i++){const t=I.bagSlots(c)[i];if(t?.id===id&&!c.lockedSlots.includes(i)){const taken=I.takeSlot(c,i,remaining);remaining-=taken.count;}}a.vialDay.used++;
 const guaranteed=!Object.keys(a.vials).length||(a.vialFailures[id]||0)>=4;
 if(guaranteed||rng()<.25){a.vials[id]=1;delete a.vialFailures[id];a.lastResult=`Discovered ${VIALS[id].name}!`;}
 else{a.vialFailures[id]=(a.vialFailures[id]||0)+1;a.lastResult=`Experiment failed (${a.vialFailures[id]}/4 misses). The fifth attempt on this material is guaranteed.`;}
 c.skills.alchemy+=4;return true;
}
export function upgradeVial(s,c,id){const n=s.alchemy.vials[id],cost=10*n;if(!serviceAccess(s,c,'alchemy','upgrade')||!VIALS[id]||!n||n>=5||s.alchemy.liquid<5*n||!I.pay(s,{[id]:cost},c))return false;s.alchemy.liquid-=5*n;s.alchemy.vials[id]++;c.skills.alchemy+=4;return true;}
export function alchemyCoinCost(s,id,kind){return Math.ceil(25*1.6**(CAULDRONS[id]?s.alchemy.cauldrons[id].coins:s.alchemy.liquidUpgrades[id]?.[kind]||0));}
export function coinAlchemy(s,c,id,kind){if(!serviceAccess(s,c,'alchemy','upgrade')||!CAULDRONS[id]&&!['water','mist'].includes(id)||id==='mist'&&alchemyLevel(s)<5||!CAULDRONS[id]&&!['rate','capacity'].includes(kind))return false;const n=CAULDRONS[id]?s.alchemy.cauldrons[id].coins:s.alchemy.liquidUpgrades[id][kind],cost=alchemyCoinCost(s,id,kind);if(n>=10||s.coins<cost)return false;s.coins-=cost;if(CAULDRONS[id])s.alchemy.cauldrons[id].coins++;else s.alchemy.liquidUpgrades[id][kind]++;return true;}
export function alchemyBonuses(s,c=null){const b={};for(const[id,n]of Object.entries(s.alchemy.bubbles)){const d=BUBBLES[id];if(d&&(!d.big||c?.bigBubbles.includes(id))){b[d.effect]=(b[d.effect]||0)+d.amount*n;if(d.extra)b[d.extra]=(b[d.extra]||0)+d.amount*n;}}for(const[id,n]of Object.entries(s.alchemy.vials)){const d=VIALS[id];if(d)b[d.effect]=(b[d.effect]||0)+d.amount*n;}return b;}
export function validateAlchemy(s){
 const a=s.alchemy,int=n=>Number.isSafeInteger(n)&&n>=0,finite=n=>Number.isFinite(n)&&n>=0;
 if(!a.cauldrons||Object.keys(a.cauldrons).length!==4||Object.keys(CAULDRONS).some(id=>!a.cauldrons[id])||!a.bubbles||!a.vials||!a.assignments||!finite(a.mist)||!a.liquidUpgrades||!a.vialFailures||!a.vialDay||!int(a.vialDay.day)||!int(a.vialDay.used)||a.vialDay.used>6||typeof a.lastResult!=='string'||a.lastResult.length>500)throw Error('Invalid alchemy.');
 for(const[id,d]of Object.entries(a.cauldrons)){if(!CAULDRONS[id]||!finite(d.progress)||!int(d.points)||d.points>10||!int(d.failures)||d.failures>3||!int(d.coins)||d.coins>10||!Array.isArray(d.unlocked)||d.unlocked.some((x,i)=>CAULDRONS[id].bubbles[i]!==x)||d.unlocked.length>3||!d.boosts||['speed','luck','cost','extra'].some(k=>!int(d.boosts[k])||d.boosts[k]>10))throw Error('Invalid brewing cauldron.');}
 for(const[id,n]of Object.entries(a.bubbles))if(!BUBBLES[id]||!int(n)||n<1||n>10||!Object.values(a.cauldrons).some(d=>d.unlocked.includes(id)))throw Error('Invalid bubble.');
 if(Object.values(a.cauldrons).some(d=>d.unlocked.some(id=>!a.bubbles[id]))||Object.entries(a.vials).some(([id,n])=>!VIALS[id]||!int(n)||n<1||n>5)||Object.entries(a.vialFailures).some(([id,n])=>!VIALS[id]||!int(n)||n>4))throw Error('Invalid vial.');
 for(const id of ['water','mist'])if(!a.liquidUpgrades[id]||['rate','capacity'].some(k=>!int(a.liquidUpgrades[id][k])||a.liquidUpgrades[id][k]>10))throw Error('Invalid liquids.');
 if(Object.entries(a.assignments).some(([id,v])=>!s.characters.some(c=>c.id===Number(id))||!CAULDRONS[v]&&!['water','mist'].includes(v))||[...Object.keys(CAULDRONS),'water','mist'].some(id=>assigned(s,id).length>2))throw Error('Invalid cauldron assignment.');
 for(const c of s.characters)if(!Array.isArray(c.bigBubbles)||new Set(c.bigBubbles).size!==c.bigBubbles.length||c.bigBubbles.length>bigBubbleSlots(s)||c.bigBubbles.some(id=>!BUBBLES[id]?.big||!a.bubbles[id]))throw Error('Invalid equipped bubbles.');
}
