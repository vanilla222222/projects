import {ATLAS_THEMES,atlasArtwork} from './atlas-art.mjs';
import {environmentSvg} from './environment-art.mjs?v=50';
import * as D from './content.mjs?v=45';
import * as E from './engine.mjs?v=45';
import {roomLayout} from './layouts.mjs?v=49';
import {roomPortals} from './world.mjs?v=49';
import {VOID_AREAS,RETRO_AREAS} from './void-content.mjs';
import {WORLD_THREE,worldOf} from './expansion-content.mjs?v=45';
import {esc} from './ui-art.mjs?v=50';
// Geographic routes match the real portal graph, including branch doors.
const regions={
 town:{x:125,y:610,dx:165,dy:0,color:'#b38c59',icon:'⌂'},forest:{x:125,y:430,dx:165,dy:0,color:'#54896b',icon:'♧'},
 caves:{x:785,y:610,dx:165,dy:0,color:'#798a9e',icon:'◈'},deep:{x:1115,y:790,dx:-165,dy:0,color:'#68668c',icon:'◈'},depths:{x:620,y:970,dx:-165,dy:0,color:'#416e96',icon:'◆'},
 jungle:{x:785,y:250,dx:-165,dy:0,color:'#438b85',icon:'❧'},'jungle-town':{x:290,y:70,dx:165,dy:0,color:'#b29161',icon:'⌂'},tree:{x:1115,y:430,dx:0,dy:-180,color:'#7d9465',icon:'♧'},
 'tide-town':{x:145,y:470,dx:180,dy:0,color:'#bd9c68',icon:'⚑'},'tide-shore':{x:145,y:650,dx:180,dy:0,color:'#549dab',icon:'≈'},
 'tide-marsh':{x:145,y:830,dx:180,dy:0,color:'#64886c',icon:'✧'},'tide-dunes':{x:325,y:290,dx:180,dy:0,color:'#b49870',icon:'◇'},
 'tide-bramble':{x:145,y:1010,dx:180,dy:0,color:'#7f9b61',icon:'❧'},'tide-hunt':{x:145,y:110,dx:180,dy:0,color:'#8f8296',icon:'♜'},
 'tide-cliffs':{x:1045,y:650,dx:0,dy:-180,color:'#70849c',icon:'ϟ'},'tide-gate':{x:1045,y:1010,dx:-180,dy:0,color:'#ad8f7f',icon:'⌂'}
};
for(const [i,a] of WORLD_THREE.areas.entries())regions[a.id]={x:140,y:110+i*145,dx:176,dy:0,color:['#ab78d7','#6baecb','#bc8792'][i%3],icon:a.town?'⌂':'✦'};
for(const [i,a] of VOID_AREAS.entries())regions[a.id]={x:140,y:110+i*145,dx:176,dy:0,color:['#a283ce','#756ca8','#8eb5c9'][i%3],icon:a.town?'⌂':'✦'};
for(const a of RETRO_AREAS)regions[a.id]={x:810,y:a.world===1?965:a.world===2?1150:1435,dx:175,dy:0,color:'#a982be',icon:'◇'};
export function atlasNodes(world){return D.AREAS.filter(a=>worldOf(a.id)===world).flatMap(a=>a.zones.map((_,zone)=>{const r=regions[a.id];return{area:a.id,zone,name:roomLayout(a.id,zone).title,x:r.x+r.dx*zone,y:r.y+r.dy*zone,color:r.color,icon:r.icon};}));}
function roomEmblem(n,world,open){
 const town=D.areaById(n.area).town||['town','jungle-town'].includes(n.area);
 if(!open)return environmentSvg('lock');
 if(world<3)return environmentSvg(town?'house':['caves','deep','depths','tide-dunes','tide-cliffs'].includes(n.area)?'rock':'tree',n.area==='jungle'?'jungle-wood':'oak');
 const shape=town?'<path d="M6 25h24M9 24V14l9-7 9 7v10M15 24v-7h6v7M7 14h22"/>':world===3?'<circle cx="18" cy="18" r="7"/><ellipse cx="18" cy="18" rx="14" ry="5" transform="rotate(-27 18 18)"/><path d="M26 7h5m-2.5-2.5v5"/>':'<path d="M5 14l12-6 14 7-13 4ZM5 14l7 11 6 4 13-14M18 19v10M26 7h5m-2.5-2.5v5"/>';
 return `<svg class="atlas-chart-icon" viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shape}</svg>`;
}
export function travelAtlas(s,c,world,selected){const theme=ATLAS_THEMES[world],nodes=atlasNodes(world),areas=D.AREAS.filter(a=>worldOf(a.id)===world),edges=new Map(),height=world===4?1790:world===3?1540:world===1?1060:1250;for(const n of nodes)for(const p of roomPortals(n.area,n.zone)){const to=nodes.find(x=>x.area===p.destination.area&&x.zone===p.destination.zone);if(!to||p.destination.boss)continue;const key=[n.area+':'+n.zone,to.area+':'+to.zone].sort().join('/');edges.set(key,[n,to]);}
 const paths=[...edges.values()].map(([a,b])=>{const unlocked=E.zoneUnlocked(s,a.area,a.zone,c)&&E.zoneUnlocked(s,b.area,b.zone,c);return`<path class="atlas-route ${unlocked?'open':''}" d="M${a.x} ${a.y} C${(a.x+b.x)/2} ${a.y},${(a.x+b.x)/2} ${b.y},${b.x} ${b.y}"/>`;}).join('');
 return`<div class="atlas-pane atlas-theme" style="--atlas-ink:${theme.ink};--atlas-deep:${theme.deep};--atlas-light:${theme.light};--atlas-gold:${theme.gold};--atlas-glow:${theme.glow};--atlas-route:${theme.route}"><div class="atlas-toolbar" role="group" aria-label="Map zoom"><span class="atlas-masthead"><small>EXPLORER’S ATLAS · WORLD ${world}</small><strong>${theme.title}</strong><em>${theme.caption}</em></span><button data-map-zoom="out" aria-label="Zoom map out">−</button><output data-map-zoom-value aria-live="polite">100%</output><button data-map-zoom="in" aria-label="Zoom map in">+</button><button data-map-zoom="fit">FIT WORLD</button><button data-map-zoom="reset">100%</button></div><div class="atlas-legend"><span>● Discovered</span><span>◇ Walk to discover</span><span>▣ Locked route</span><span>◎ You are here</span><small>Click a room · Drag to pan · Ctrl / ⌘ + wheel to zoom</small></div><div class="atlas-scroll" role="region" aria-label="Scrollable World ${world} teleport map" tabindex="0"><div class="atlas-canvas" style="width:1240px;height:${height}px"><div class="world-atlas atlas-redesign world-${world}" data-map-width="1240" data-map-height="${height}" style="height:${height}px;width:1240px">${atlasArtwork(world,height,areas,nodes,paths)}${nodes.map(n=>{const seen=E.discovered(s,n.area,n.zone),open=E.zoneUnlocked(s,n.area,n.zone,c),here=c.area===n.area&&c.zone===n.zone,id=n.area+':'+n.zone;return`<button class="atlas-node ${seen?'discovered':''} ${!open?'route-locked':''} ${here?'current':''} ${selected===id?'selected':''}" style="left:${n.x}px;top:${n.y}px;--region:${n.color}" data-map-room="${id}" aria-pressed="${selected===id}" aria-label="${esc(n.name)} · ${here?'You are here':!open?'Route locked':seen?'Discovered':'Walk to discover'}"><span class="atlas-pin">${roomEmblem(n,world,open)}</span><small>${esc(n.name)}</small>${here?'<b>YOU ARE HERE</b>':''}</button>`;}).join('')}</div></div></div></div>`;
}
