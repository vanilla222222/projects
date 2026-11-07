import {ORBIT_ADVANCEMENTS} from './world-three-content.mjs';
import {ADVANCEMENTS,ALL_ADVANCEMENTS,worldOf} from './expansion-content.mjs?v=45';
import {pointFor,roomLayout} from './layouts.mjs?v=49';
import {skillLevel} from './progression.mjs?v=45';
import {canPay,pay} from './inventory.mjs?v=45';
export const tierTwoDiscoveries=s=>[...new Set(s.characters.map(c=>c.advancement).filter(Boolean))];
export function advancementStatus(s,c){
 const d=(worldOf(c.area)===3?ORBIT_ADVANCEMENTS:ADVANCEMENTS)[c.class];if(!d)return{open:false,reason:'Choose your first class through its mentor first.'};
 const result={...d,open:false};
 if(c.advancement)return{...result,reason:'This character has already chosen a Tier 2 class.'};
 if(!s.worldCompletionCrafted||!s.storyFlags.complete)return{...result,reason:'Finish World One and forge its completion token.'};
 const point=pointFor(roomLayout(d.area,d.zone),'advancement');
 if(c.area!==d.area||c.zone!==d.zone||c.secret||c.dungeon||c.trial||Math.abs((c.position?.x??0)-point.x)>=110||Math.abs((c.position?.y??0)-point.y)>=65)return{...result,reason:'Walk to the Pathfinder at '+roomLayout(d.area,d.zone).title+'.'};
 const discoveries=tierTwoDiscoveries(s);
 if(discoveries.includes(d.id)&&discoveries.length<10)return{...result,reason:'No duplicate Tier 2 classes until ten different Tier 2 classes have been discovered. Train the five branches in each of Worlds Two and Three.'};
 if(worldOf(d.area)===3&&c.level<35)return{...result,reason:"Reach character level 35."};
 if(c.level<20)return{...result,reason:'Reach character level 20.'};
 if(skillLevel(c,d.skill)<3)return{...result,reason:'Train '+d.skill+' to level 3.'};
 if(worldOf(d.area)===2&&(c.journey.kills[d.area+'-0']||0)<20)return{...result,reason:'Defeat 20 enemies in this Pathfinder’s first room.'};
 if(!canPay(s,d.needs,c))return{...result,reason:'Bring the training supplies in your backpack (or local shared storage).'};
 return{...result,open:true,reason:'Ready to advance. Your original class and talents are retained.'};
}
export function advanceClass(s,c){const d=advancementStatus(s,c);if(!d.open||!pay(s,d.needs,c))return false;c.advancement=d.id;return true;}
export function validateAdvancements(s){const ids=ALL_ADVANCEMENTS.map(d=>d.id);for(const c of s.characters)if(c.advancement!==null&&(!ids.includes(c.advancement)||![ADVANCEMENTS[c.class]?.id,ORBIT_ADVANCEMENTS[c.class]?.id].includes(c.advancement)))throw Error('Invalid Tier 2 advancement.');if(tierTwoDiscoveries(s).length<10&&s.characters.filter(c=>c.advancement).length!==tierTwoDiscoveries(s).length)throw Error('Duplicate Tier 2 classes require ten unique discoveries.');}
export const advancementName=c=>ALL_ADVANCEMENTS.find(d=>d.id===c.advancement)?.name;
export const inWorldTwo=c=>worldOf(c.area)===2;
