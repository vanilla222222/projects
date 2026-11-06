import {RECIPES} from './content.mjs?v=20';
import * as I from './inventory.mjs?v=20';
import {serviceAccess} from './services.mjs?v=20';

export const PRODUCT_LEVELS={thread:1,nails:3,brick:5};
export const recipePage=r=>r.station!=='anvil'||r.id.startsWith('anvil-expansion-')?1:['gilding','verdant-steel','heartwood','sunwell'].includes(r.unlock)||r.requiresCompletion||r.unlock?.startsWith('badge-')?3:r.unlock==='ironworking'?2:1;
export const OPTIONAL_BLUEPRINTS=['gear-copper-greaves','gear-grove-ring','gear-canopy-cape'];
export function initializeWorkshop(s){
 if(!s.workshop){const legacy=(s.metrics?.crafted||0)>0||s.jobs?.length||s.characters.some(c=>Object.keys(c.loadout).length);s.workshop={pages:1,blueprints:[],tokens:0,legacy:legacy?RECIPES.filter(r=>(!r.unlock||s.recipeUnlocks.includes(r.unlock))&&(!r.requiresCompletion||s.worldCompletionCrafted)).map(r=>r.id):[]};}
 return s;
}
export function blueprintOpen(s,r){return s.workshop?.legacy.includes(r.id)||recipePage(r)<=(s.workshop?.pages||1)&&(!OPTIONAL_BLUEPRINTS.includes(r.id)||s.workshop?.blueprints.includes(r.id));}
export function blueprintHint(s,r){if(s.workshop?.legacy.includes(r.id))return 'Previously learned blueprint';if(recipePage(r)>(s.workshop?.pages||1))return `Use Anvil Expansion ${recipePage(r)}. Craft it on page 1 after ${recipePage(r)===2?'Under the Roots':'Outpost Supplies'}.`;if(OPTIONAL_BLUEPRINTS.includes(r.id)&&!s.workshop.blueprints.includes(r.id))return 'Unlock at the anvil with 1 blueprint token. Earn tokens from world tasks.';if(r.unlock?.startsWith('badge-'))return 'Present the matching token at the Legacy Square vault and learn its signature pattern.';return r.requiresCompletion?'Forge the World One Completion Token':({ironworking:'Brann: Under the Roots',gilding:'Hesta: Outpost Supplies',brewing:'Hesta: Outpost Supplies','verdant-steel':'Hesta: Outpost Supplies',heartwood:'Hesta: Heart of the Wild',sunwell:'Willow: finish her quest line'})[r.unlock]||'Starter blueprint';}
export function useAnvilExpansion(s,c,page){const id='anvil-expansion-'+page;if(!serviceAccess(s,c,'anvil','upgrade')||![2,3].includes(page)||s.workshop.pages!==page-1||!I.unlockedAmount(c,id))return false;const slot=I.bagSlots(c).findIndex((t,i)=>t?.id===id&&!c.lockedSlots.includes(i));if(slot<0||!I.takeSlot(c,slot,1))return false;s.workshop.pages=page;return true;}
export function learnBlueprint(s,c,id){if(!serviceAccess(s,c,'anvil','upgrade')||!OPTIONAL_BLUEPRINTS.includes(id)||s.workshop.tokens<1||s.workshop.blueprints.includes(id))return false;s.workshop.tokens--;s.workshop.blueprints.push(id);return true;}
export function productOpen(c,id){return !!PRODUCT_LEVELS[id]&&(id===c.anvil.product||1+Math.floor(Math.sqrt(c.skills.smithing/12))>=PRODUCT_LEVELS[id]);}
export function validateWorkshop(s){const w=s.workshop;if(!w||![1,2,3].includes(w.pages)||!Number.isSafeInteger(w.tokens)||w.tokens<0||!Array.isArray(w.blueprints)||new Set(w.blueprints).size!==w.blueprints.length||w.blueprints.some(id=>!OPTIONAL_BLUEPRINTS.includes(id))||!Array.isArray(w.legacy)||w.legacy.some(id=>!RECIPES.some(r=>r.id===id)))throw Error('Invalid workshop blueprints.');}
