import {ITEMS,EQUIPMENT} from './content.mjs?v=45';
import {bagCapacity,bagUsed,bagSlots,carryRoom,carry,takeSlot} from './inventory.mjs?v=45';
import {nearService} from './services.mjs?v=45';

const MILESTONES=[10,25,50,100,200,400];
export const museumGear=s=>Object.values(s.museum||{}).map(e=>e?.gear).filter(Boolean);
export function exhibitItem(s,c,id){
 if(!nearService(c,'museum')||!ITEMS[id]||s.museum[id]?.stored)return false;
 const index=bagSlots(c).findIndex((slot,i)=>!c.lockedSlots.includes(i)&&(slot?.id===id||slot?.uid&&c.packGear.some(g=>g.uid===slot.uid&&g.base===id)));
 const taken=index<0?null:takeSlot(c,index,1);
 if(!taken)return false;
 const count=Object.keys(s.museum).length;
 s.museum[id]={stored:true,...(taken.gear?{gear:{...taken.gear,museumBound:true}}:{})};
 if(Object.keys(s.museum).length>count&&MILESTONES.includes(count+1))s.gems+=Math.max(1,Math.floor((count+1)/5));
 return true;
}
export function retrieveExhibit(s,c,id){
 const exhibit=s.museum[id];
 if(!nearService(c,'museum')||!exhibit?.stored)return false;
 if(exhibit.gear){
  if(bagUsed(c)>=bagCapacity(c))return false;
  c.packGear.push(exhibit.gear);
  bagSlots(c);
 }else{
  if(carryRoom(c,id)<1)return false;
  carry(c,id,1);
 }
 s.museum[id]={stored:false};
 return true;
}
export function validateMuseum(s){
 if(!s.museum||typeof s.museum!=='object'||Array.isArray(s.museum)||Object.entries(s.museum).some(([id,e])=>!ITEMS[id]||!e||typeof e.stored!=='boolean'||(e.stored&&!!EQUIPMENT[id]!==!!e.gear)||e.gear&&(!e.stored||e.gear.base!==id||e.gear.museumBound!==true)))throw Error('Invalid museum exhibits.');
}
