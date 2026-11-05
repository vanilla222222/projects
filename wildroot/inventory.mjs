import {ITEMS,EXPANSIONS} from './content.mjs?v=5';
export const BAG_STACK=99,CHEST_STACK=999;
export function initBag(c){c.bag??={};c.packGear??=[];c.usedExpansions??=[];c.overflow??={};return c;}
export function bagCapacity(c){return 16+(c.usedExpansions||[]).reduce((n,id)=>n+(EXPANSIONS[id]?.target==='bag'?EXPANSIONS[id].slots:0),0);}
export function chestCapacity(s){return 24+(s.usedChestExpansions||[]).reduce((n,id)=>n+(EXPANSIONS[id]?.target==='chest'?EXPANSIONS[id].slots:0),0);}
export function materialSlots(bag,stack){return Object.values(bag||{}).reduce((n,q)=>n+(q>0?Math.ceil(q/stack):0),0);}
export function bagUsed(c){return materialSlots(c.bag,BAG_STACK)+(c.packGear?.length||0);}
export function chestUsed(s){return materialSlots(s.inventory,CHEST_STACK)+(s.armory?.length||0);}
export function roomFor(bag,id,capacity,used,stack){const qty=bag[id]||0,open=Math.max(0,capacity-used),partial=qty%stack?stack-qty%stack:0;return open*stack+partial;}
export function give(c,id,n){initBag(c);if(!ITEMS[id]||!Number.isFinite(n)||n<=0)return 0;n=Math.floor(n);const accepted=Math.min(n,roomFor(c.bag,id,bagCapacity(c),bagUsed(c),BAG_STACK));if(accepted)c.bag[id]=(c.bag[id]||0)+accepted;if(accepted<n)c.overflow[id]=(c.overflow[id]||0)+n-accepted;return accepted;}
export function carry(c,id,n){initBag(c);const accepted=Math.min(Math.floor(n),roomFor(c.bag,id,bagCapacity(c),bagUsed(c),BAG_STACK));if(accepted>0)c.bag[id]=(c.bag[id]||0)+accepted;return Math.max(0,accepted);}
export function reclaim(c){initBag(c);let total=0;for(const[id,n]of Object.entries(c.overflow)){const moved=carry(c,id,n);c.overflow[id]-=moved;total+=moved;}return total;}
export function storageAccess(c){return['town','jungle-town'].includes(c.area)&&Math.abs((c.position?.x??190)-160)<115&&Math.abs((c.position?.y??644)-644)<55;}
export function deposit(s,c,id,n=Infinity){if(!storageAccess(c)||!ITEMS[id])return 0;const amount=Math.min(c.bag[id]||0,n,roomFor(s.inventory,id,chestCapacity(s),chestUsed(s),CHEST_STACK));if(amount>0){c.bag[id]-=amount;s.inventory[id]=(s.inventory[id]||0)+amount;}return Math.max(0,amount);}
export function withdraw(s,c,id,n=Infinity){if(!storageAccess(c)||!ITEMS[id])return 0;const amount=Math.min(s.inventory[id]||0,n,roomFor(c.bag,id,bagCapacity(c),bagUsed(c),BAG_STACK));if(amount>0){s.inventory[id]-=amount;c.bag[id]=(c.bag[id]||0)+amount;}return Math.max(0,amount);}
export function depositAll(s,c){let total=0;for(const id of Object.keys(c.bag))total+=deposit(s,c,id);return total;}
export function depositGear(s,c,uid){if(!storageAccess(c)||chestUsed(s)>=chestCapacity(s))return false;const i=c.packGear.findIndex(e=>e.uid===Number(uid));if(i<0)return false;s.armory.push(c.packGear.splice(i,1)[0]);return true;}
export function withdrawGear(s,c,uid){if(!storageAccess(c)||bagUsed(c)>=bagCapacity(c))return false;const i=s.armory.findIndex(e=>e.uid===Number(uid));if(i<0)return false;c.packGear.push(s.armory.splice(i,1)[0]);return true;}
export function useExpansion(s,c,id){const d=EXPANSIONS[id],used=d?.target==='bag'?c.usedExpansions:s.usedChestExpansions;if(!d||!used||(c.bag[id]||0)<1||used.includes(id))return false;c.bag[id]--;used.push(id);return true;}
export function amount(s,id,c=s.characters.find(c=>c.id===s.active)||s.characters[0]){return(s.inventory[id]||0)+(c?.bag?.[id]||0);}
export function canPay(s,cost,c){return Object.entries(cost).every(([id,n])=>amount(s,id,c)>=n);}
export function pay(s,cost,c=s.characters.find(c=>c.id===s.active)||s.characters[0]){if(!canPay(s,cost,c))return false;for(const[id,n]of Object.entries(cost)){const fromBag=Math.min(c.bag[id]||0,n);c.bag[id]=(c.bag[id]||0)-fromBag;s.inventory[id]=(s.inventory[id]||0)-(n-fromBag);}return true;}
export function validateBags(s){const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;for(const c of s.characters){for(const bag of [c.bag,c.overflow])if(!bag||Object.values(bag).some(n=>!finite(n)))throw Error('Invalid carried inventory.');if(!Array.isArray(c.packGear)||!Array.isArray(c.usedExpansions)||new Set(c.usedExpansions).size!==c.usedExpansions.length||c.usedExpansions.some(id=>EXPANSIONS[id]?.target!=='bag'))throw Error('Invalid backpack expansion history.');}if(!Array.isArray(s.usedChestExpansions)||new Set(s.usedChestExpansions).size!==s.usedChestExpansions.length||s.usedChestExpansions.some(id=>EXPANSIONS[id]?.target!=='chest'))throw Error('Invalid chest expansion history.');return s;}
