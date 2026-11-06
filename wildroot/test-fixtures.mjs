// Explicit fixtures for old tests that previously represented route unlocks with account totals.
import {ENEMIES} from './content.mjs?v=36';
import {PORTAL_GOALS} from './journey.mjs?v=36';
export function seedKill(s,id,n){s.kills[id]=id==='jungle-3'?Math.max(n,PORTAL_GOALS.jungle[3]):n;if(ENEMIES[id])for(const c of s.characters)c.journey.kills[id]=Math.max(n,PORTAL_GOALS[ENEMIES[id].area]?.[ENEMIES[id].index]||0);}
export function seedStory(s,id,value){s.story[id]=value;const c=s.characters.find(c=>c.id===s.active)||s.characters[0];c.journey.story[id]={...value};}
