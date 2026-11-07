import {TELESCOPE} from './content.mjs?v=45';
import {roomLayout,pointFor} from './layouts.mjs?v=49';

export const SERVICES={
 dungeon:{area:'town',zone:3,point:'dungeon',name:'Mossroot Ruins',place:'Legacy Square',lesson:'Four solo chambers. Run gear and boons reset each attempt; credits and relic marks buy permanent rewards. Requires level 4.'},
 bossboard:{area:'jungle-town',zone:2,point:'bossboard',name:'Rootwarden Hunt Board',place:'Rootbound Approach',lesson:'Claim three daily keys and choose difficulty. Your first normal clear is free. Secret guardians have personal encounter cooldowns shared by the roster.'},
 shop:{area:'town',zone:0,point:'shop',name:'Town Shop',place:'Village Green or Canopy Market',lesson:'Buy supplies and sell unlocked carried items at the stall. Stock is shared by your roster and refreshes each UTC day.'},
 anvil:{area:'town',zone:1,point:'station',name:'Anvil',place:'Hammer Street',lesson:'Craft gear, select a passive product, then spend your personal anvil points. Products stop when their storage fills.'},
 foundry:{area:'town',zone:2,point:'station',name:'Foundry',place:'The Furnace Yard',lesson:'Load ore and charcoal into furnaces. Queued batches reserve their inputs and deliver finished materials to their owner.'},
 enchanting:{area:'jungle-town',zone:0,point:'station',name:'Enchanting Bench',place:'Canopy Market',lesson:'Enchant equipped gear permanently. Preview the result first. Replacing an enchantment consumes materials and overwrites that slot.'},
 alchemy:{area:'jungle-town',zone:1,point:'station',name:'Alchemy',place:'The Alchemist’s Garden',lesson:'Assign characters to brewing or liquids. Spend brew points on discoveries and boosts, improve bubbles, and submit materials to discover vials.'},
 stamps:{area:'town',zone:3,point:'stamps',name:'Stamp Registry',place:'Legacy Square',lesson:'Register carried stamps, level them with coins and deliver materials to raise their caps.'},
 statues:{area:'town',zone:3,point:'statues',name:'Statue Keeper',place:'Legacy Square',lesson:'Each character needs a chisel. Their deposited statues improve that character.'},
 tasks:{area:'town',zone:3,point:'tasks',name:'Task Board',place:'Legacy Square',lesson:'Complete world tasks for merits and blueprint tokens. Daily tasks award merits. Return here to claim rewards and spend them.'},
 vault:{area:'town',zone:3,point:'vault',name:'Upgrade Vault',place:'Legacy Square',lesson:'Spend coins here on permanent roster upgrades. Each level increases the next price.'},
 stars:{...TELESCOPE,point:'telescope',name:'Telescope',place:'Crown Observatory summit',lesson:'Observe constellations in the world, then return here to unlock and equip star signs.'}
};
export function nearService(c,id){const base=SERVICES[id],expedition=id==='tasks'&&c.zone===0&&['tide-town','orbit-dock','orbit-loom','orbit-chart'].includes(c.area),coastal=(c.area==='orbit-loom'&&c.zone===0&&id==='anvil')||c.area==='tide-town'&&((id==='anvil'&&c.zone===1)||(id==='alchemy'&&c.zone===2)),d=coastal||expedition?{...base,area:c.area,zone:c.zone}:id==='shop'&&['town','jungle-town','tide-town','tide-gate','orbit-dock','orbit-loom','orbit-chart'].includes(c.area)?{...base,area:c.area}:base;if(!d||c.area!==d.area||c.zone!==d.zone||c.secret||(c.activity==='trial'||c.dungeon)||!c.position)return false;const p=id==='stars'?d:pointFor(roomLayout(d.area,d.zone),d.point);return Math.abs(c.position.x-p.x)<110&&Math.abs(c.position.y-p.y)<70;}
export function initializeAccess(s){s.access??={seen:[],remote:{}};return s;}
export function serviceAccess(s,c,id,action='view'){return nearService(c,id)||s.access?.remote?.[id]?.[action]===true;}
export function discoverService(s,c,id){initializeAccess(s);if(!nearService(c,id))return false;const first=!s.access.seen.includes(id);if(first)s.access.seen.push(id);return first;}
export function validateAccess(s){if(!s.access||!Array.isArray(s.access.seen)||new Set(s.access.seen).size!==s.access.seen.length||s.access.seen.some(id=>!SERVICES[id])||!s.access.remote||Object.entries(s.access.remote).some(([id,v])=>!SERVICES[id]||!v||Object.entries(v).some(([k,n])=>!['view','claim','upgrade'].includes(k)||typeof n!=='boolean')))throw Error('Invalid facility access.');}
