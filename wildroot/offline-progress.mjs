import * as D from './content.mjs?v=45';
import * as I from './inventory.mjs?v=45';
import {roomLayout} from './layouts.mjs?v=45';
const sum=bag=>Object.values(bag).reduce((n,v)=>n+v,0);
const foodCounts=c=>{const out={};for(const t of c.foodSlots)if(t?.count)out[t.id]=(out[t.id]||0)+t.count;return out;};
export function offlineSnapshot(s,c,rates){const r=rates(s,c);return{coins:c.earnedCoins,kills:c.kills,xp:c.lifetimeXp,skills:{...c.skills},food:c.foodEaten,
 items:Object.fromEntries([...new Set([...Object.keys(c.bag),...Object.keys(c.overflow)])].map(id=>[id,(c.bag[id]||0)+(c.overflow[id]||0)])),
 foodItems:foodCounts(c),pending:sum(c.overflow),buffs:c.buffs.length,limiter:r.breakdown?.limiter||r.label,
 assignment:{activity:c.activity,area:c.area,zone:c.zone,resource:c.resource,room:roomLayout(c.area,c.zone,c.activity==='boss',c.secret||null).title}};}
export function offlineRow(s,c,before,seconds,rates){const after=offlineSnapshot(s,c,rates),retreated=before.assignment.activity==='fight'&&c.activity==='rest';return{
 id:c.id,name:c.name,coins:after.coins-before.coins,kills:after.kills-before.kills,xp:after.xp-before.xp,food:after.food-before.food,
 skills:Object.fromEntries(Object.entries(c.skills).map(([id,n])=>[id,n-before.skills[id]]).filter(([,n])=>n>0)),
 items:Object.fromEntries(Object.entries(after.items).map(([id,n])=>[id,Math.max(0,n-(before.items[id]||0))]).filter(([,n])=>n)),limiter:before.limiter,
 details:{seconds,partial:false,assignment:before.assignment,endActivity:c.activity,endLimiter:retreated?'Retreated: survival':after.limiter,
 foodItems:Object.fromEntries(Object.entries(before.foodItems).map(([id,n])=>[id,Math.max(0,n-(after.foodItems[id]||0))]).filter(([,n])=>n)),
 pendingAdded:Math.max(0,after.pending-before.pending),pendingTotal:after.pending,bagUsed:I.bagUsed(c),bagCapacity:I.bagCapacity(c),
 foodRemaining:sum(after.foodItems),buffsExpired:Math.max(0,before.buffs-after.buffs),retreated}};}
export function mergeOfflineDetails(previous,next){if(!previous)return{...next,partial:true};return{...next,seconds:previous.seconds+next.seconds,partial:previous.partial||next.partial,
 assignment:previous.assignment,foodItems:Object.fromEntries([...new Set([...Object.keys(previous.foodItems),...Object.keys(next.foodItems)])].map(id=>[id,(previous.foodItems[id]||0)+(next.foodItems[id]||0)])),
 pendingAdded:previous.pendingAdded+next.pendingAdded,buffsExpired:previous.buffsExpired+next.buffsExpired,retreated:previous.retreated||next.retreated};}
export function validateOfflineDetails(d){if(d===undefined)return;const finite=n=>Number.isFinite(n)&&n>=0,int=n=>Number.isSafeInteger(n)&&n>=0,a=d?.assignment;
 if(!d||!finite(d.seconds)||typeof d.partial!=='boolean'||!a||!D.AREAS.some(area=>area.id===a.area&&Number.isInteger(a.zone)&&a.zone>=0&&a.zone<area.zones.length)||
 !['rest','fight','gather','boss','trial','dungeon'].includes(a.activity)||a.resource!==null&&!D.ITEMS[a.resource]||typeof a.room!=='string'||a.room.length>100||
 !['rest','fight','gather','boss','trial','dungeon'].includes(d.endActivity)||typeof d.endLimiter!=='string'||d.endLimiter.length>300||!d.foodItems||Object.entries(d.foodItems).some(([id,n])=>!D.FOODS[id]||!int(n))||
 ['pendingAdded','pendingTotal','bagUsed','bagCapacity','foodRemaining','buffsExpired'].some(k=>!int(d[k]))||d.bagCapacity<16||typeof d.retreated!=='boolean')throw Error('Invalid offline progress details.');
}
