import {serviceAccess} from './services.mjs?v=36';
import {STORY} from './content.mjs?v=36';
export const SPECIAL_TALENTS={
 hemoglobin:{name:'Rootblood Recovery',text:'Heal 0.15% maximum HP per kill per level, including AFK.',effect:'killHeal',amount:.0015,max:20,source:'World Task Board: 2 merits',sourceType:'merit',cost:2},
 simmer:{name:'Attacks on Simmer',text:'+0.5% combat AFK progress per level.',effect:'combatAFK',amount:.005,max:20,source:'Finish Flint’s Tools for Tomorrow quest',sourceType:'quest',quest:'tools'},
 fieldcraft:{name:'Fieldcraft Almanac',text:'+1% gathering efficiency per level.',effect:'gathering',amount:.01,max:20,source:'Finish Willow’s Letters from the Canopy quest',sourceType:'quest',quest:'canopy-letter'},
 froth:{name:'Frothing Flask',text:'+1% potion strength per level.',effect:'potionPower',amount:.01,max:20,source:'Defeat the Sunwell Keeper',sourceType:'boss',boss:'sunwell'},
 veteran:{name:'Veteran’s Lessons',text:'+0.5% character XP per level.',effect:'characterXP',amount:.005,max:20,source:'Defeat the Forge Vault Warden',sourceType:'boss',boss:'vault'},
 dungeon:{name:'Ruins Scholar',text:'+1% profession XP per level.',effect:'skillXP',amount:.01,max:20,source:'Dungeon reward shop: 12 relic marks',sourceType:'dungeon',cost:12}
};
export function initBooks(s){s.books??=[];for(const c of s.characters)c.specialTalents??={};}
export function specialPoints(c){return Math.max(0,c.level-1-Object.values(c.specialTalents).reduce((a,n)=>a+n,0));}
export function learnBook(s,id){const d=SPECIAL_TALENTS[id];if(!d||s.books.includes(id))return false;const c=s.characters.find(c=>c.id===s.active);if(d.sourceType==='quest'&&!c.journey.story[d.quest]?.done||d.sourceType==='boss'&&!(s.bossHunt?.kills[d.boss]>0))return false;if(d.sourceType==='merit'){if(!serviceAccess(s,c,'tasks','upgrade')||!s.tasksUnlocked||s.meritPoints<d.cost)return false;s.meritPoints-=d.cost;}if(d.sourceType==='dungeon'){if(!serviceAccess(s,c,'dungeon','upgrade')||s.dungeons.marks<d.cost)return false;s.dungeons.marks-=d.cost;}s.books.push(id);return true;}
export function trainSpecial(s,c,id,n=1){const d=SPECIAL_TALENTS[id];if(!d||!s.books.includes(id)||!Number.isInteger(n)||n<1||specialPoints(c)<1||(c.specialTalents[id]||0)>=d.max)return false;c.specialTalents[id]=(c.specialTalents[id]||0)+Math.min(n,specialPoints(c),d.max-(c.specialTalents[id]||0));return true;}
export function specialBonuses(c){const b={};for(const[id,n]of Object.entries(c.specialTalents||{})){const d=SPECIAL_TALENTS[id];if(d)b[d.effect]=(b[d.effect]||0)+n*d.amount;}return b;}
export function validateBooks(s){if(!Array.isArray(s.books)||new Set(s.books).size!==s.books.length||s.books.some(id=>!SPECIAL_TALENTS[id]))throw Error('Invalid talent book collection.');for(const c of s.characters)if(!c.specialTalents||Object.entries(c.specialTalents).some(([id,n])=>!SPECIAL_TALENTS[id]||!s.books.includes(id)||!Number.isInteger(n)||n<0||n>SPECIAL_TALENTS[id].max)||Object.values(c.specialTalents).reduce((a,n)=>a+n,0)>c.level-1)throw Error('Invalid special talent points.');}
