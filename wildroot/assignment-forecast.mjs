// Deterministic forecast uses the same combat, cooldown, food and progression
// functions as offline claims, on an isolated save. The live save is never changed.
export function forecastAssignment(s,c,advance,seconds=3600){
 if(!Number.isFinite(seconds)||seconds<=0||seconds>28800)throw Error('Forecast duration must be within eight hours.');
 const copy=structuredClone(s),who=copy.characters.find(w=>w.id===c.id);
 copy.familyRoster=copy.characters;copy.characters=[who];
 const before={kills:who.kills,coins:who.earnedCoins,xp:who.lifetimeXp,skills:{...who.skills},food:who.foodEaten};
 const initialResource=c.resource?((who.bag[c.resource]||0)+(who.overflow[c.resource]||0)):0;
 let seed=713503,foodSeconds=Infinity,retreatSeconds=null;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const hadFood=who.foodSlots.some(t=>t?.count);
 advance(copy,seconds,random,{production:false});
 if(hadFood&&!who.foodSlots.some(f=>f?.count))foodSeconds=seconds;
 if(c.activity==='fight'&&who.activity==='rest')retreatSeconds=seconds;
 return{resourceItems:c.resource?((who.bag[c.resource]||0)+(who.overflow[c.resource]||0)-initialResource):0,kills:who.kills-before.kills,coins:who.earnedCoins-before.coins,xp:who.lifetimeXp-before.xp,
  skills:Object.fromEntries(Object.entries(who.skills).map(([id,n])=>[id,n-before.skills[id]])),
  foodUsed:who.foodEaten-before.food,foodSeconds,retreatSeconds};
}

// Multiple common drops compete for the same empty slots. Keep existing partial
// stacks and per-category limits, rather than assigning every drop the full bag.
export function commonLootSeconds(c,loot,clone,carry){
 const drops=loot.filter(d=>d.rate>0);if(!drops.length)return Infinity;
 const fits=seconds=>{const bag=clone(c);return drops.every(d=>{const n=Math.floor(seconds*d.rate/3600);return !n||carry(bag,d.id,n)===n;});};
 let hi=3600;while(hi<3600*65536&&fits(hi))hi*=2;
 if(fits(hi))return Infinity;let lo=0;for(let i=0;i<35;i++){const mid=(lo+hi)/2;if(fits(mid))lo=mid;else hi=mid;}return lo;
}
