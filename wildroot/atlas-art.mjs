import {esc} from './ui-art.mjs?v=50';

export const ATLAS_THEMES={
 1:{title:'Greenreach',caption:'Woodland & mountain chart',ink:'#0b2421',deep:'#102f2a',light:'#366654',gold:'#e6cd8f',route:'#dce7ae',paper:'#7d966b',glow:'#a1d492'},
 2:{title:'The Tidewilds',caption:'Coast & highland chart',ink:'#092633',deep:'#123d4d',light:'#376a78',gold:'#e8d098',route:'#b9eee8',paper:'#75969a',glow:'#82d4dc'},
 3:{title:'The Astral Reach',caption:'Orbital navigation chart',ink:'#14172d',deep:'#20233e',light:'#3c4c74',gold:'#e8d8aa',route:'#bad9ff',paper:'#6b78a4',glow:'#acbbff'},
 4:{title:'The Hollow Between',caption:'Survey of the drifting islands',ink:'#1a1027',deep:'#291a3c',light:'#533465',gold:'#edd1a3',route:'#e3c4ff',paper:'#8668a1',glow:'#d5a3fa'}
};

function island(x,y,w,h){
 const k=Math.min(29,h*.29),r=x+w,b=y+h;
 return `M${x+k} ${y+4} L${x+w*.26} ${y} L${x+w*.62} ${y+3} L${r-k} ${y} L${r-7} ${y+k*.45} L${r} ${y+h*.54} L${r-k*.6} ${b-10} L${r-k*1.45} ${b} L${x+w*.47} ${b-4} L${x+k} ${b} L${x+7} ${b-k*.67} L${x} ${y+h*.36}Z`;
}
function plate(a,rooms){
 const r=rooms[0],last=rooms.at(-1),x=Math.min(r.x,last.x)-73,y=Math.min(r.y,last.y)-43,w=Math.abs(r.x-last.x)+146,h=Math.abs(r.y-last.y)+108;
 const d=island(x,y,w,h),title=esc(a.name.toUpperCase()),icon=esc(r.icon);
 return `<g class="atlas-territory" >
  <path d="${d}" transform="translate(0 6)" fill="#080f19" opacity=".6"/>
  <path d="${d}" fill="url(#atlas-plate)" stroke="${r.color}" stroke-width="1.7"/>
  <path d="${d}" fill="${r.color}" opacity=".17"/>
  <path d="${d}" fill="url(#atlas-contours)" opacity=".6"/>
  <path d="M${x+12} ${y-11}h19m-19 0v-8" stroke="${r.color}" stroke-width="1" fill="none"/>
  <text x="${x+36}" y="${y-10}" class="region-name">${icon} ${title}</text>
 </g>`;
}
function atlasMarks(world,height,theme){
 const marks=[];
 const total=world<3?30:92;
 for(let i=0;i<total;i++){
  const x=35+(i*157+world*73)%1170,y=48+(i*113+world*31)%(height-96);
  if(world>=3)marks.push(i%11===0?`<path d="M${x-5} ${y}h10m-5-5v10" stroke="${theme.glow}" opacity=".55"/>`:`<circle cx="${x}" cy="${y}" r="${i%4===0?1.6:.8}" fill="${theme.glow}" opacity=".32"/>`);
  else if(world===2)marks.push(`<path d="M${x} ${y}q8-6 16 0t16 0m-27 6q7-4 14 0" stroke="${theme.glow}" opacity=".26" fill="none"/>`);
  else marks.push(`<path d="M${x} ${y}l7-11 7 11m-5-1 7-9 6 9" stroke="${theme.glow}" opacity=".29" fill="none"/>`);
 }
 return marks.join('');
}
function worldEmblem(world,height,t){
 const y=Math.round(height*.37),motif=[
  '<path d="M-154 81-62-63-25-11 19-101 129 81M-84-29l22-34 19 31m41-30 21-39 28 45M-169 94H146"/><path d="M-127 86v-32m-17 18 17-28 17 28m183 14v-45m-20 22 20-36 20 36"/>',
  '<path d="M-160 42Q-116 0-72 42T16 42 104 42 192 42M-145 69Q-101 27-57 69T31 69 119 69M-145 95Q-101 53-57 95T31 95 119 95M-35 11h70m-56 0v-71h42v71m-52-71h62L0-83Z"/><path d="M-43-48h-49m135 0h49"/>',
  '<circle r="71"/><ellipse rx="146" ry="39" transform="rotate(-22)"/><ellipse rx="164" ry="50" transform="rotate(-22)" stroke-dasharray="3 7"/><path d="M-111-78h20m-10-10v20m199 145h20m-10-10v20"/>',
  '<path d="M-10-125-45-69-12-25-51 16-7 58-27 118 30 52 14 13 63-35 25-62 52-117 8-78Z"/><path d="M-124-42-90-63-77-34-116-27ZM83 55l49-25 14 47-51 9Z"/><ellipse rx="151" ry="98" transform="rotate(-18)" stroke-dasharray="4 8"/>'
 ][world-1];
 return `<g transform="translate(1040 ${y})" stroke="${t.glow}" fill="none" stroke-width="1.4" opacity=".31">${motif}</g>`;
}
function compass(height,theme){
 const x=1170,y=height-83;
 return `<g transform="translate(${x} ${y})" class="atlas-rose" fill="none" stroke="${theme.gold}">
 <circle r="35" opacity=".55"/><circle r="28" opacity=".37" stroke-dasharray="1 4"/>
 <path d="M0-32 6-6 31 0 6 6 0 32-6 6-31 0-6-6Z" opacity=".72"/>
 <path d="M0-27 5 0 0 8-5 0Z" fill="${theme.gold}"/>
 <circle r="3" fill="${theme.ink}"/>
 <text x="0" y="-43" text-anchor="middle" fill="${theme.gold}" stroke="none">N</text></g>`;
}
export function atlasArtwork(world,height,areas,nodes,routes){
 const t=ATLAS_THEMES[world];
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240 ${height}" aria-hidden="true">
 <defs>
 <linearGradient id="atlas-field" x2=".85" y2="1"><stop stop-color="${t.deep}"/><stop offset=".55" stop-color="${t.light}"/><stop offset="1" stop-color="${t.ink}"/></linearGradient>
 <linearGradient id="atlas-plate" x2="0" y2="1"><stop stop-color="${t.light}"/><stop offset="1" stop-color="${t.deep}"/></linearGradient>
 <pattern id="atlas-grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M0 60V0H60" fill="none" stroke="${t.glow}" stroke-opacity=".09"/></pattern>
 <pattern id="atlas-contours" width="43" height="23" patternUnits="userSpaceOnUse"><path d="M-4 15Q9 3 21 13T47 10" fill="none" stroke="${t.paper}" stroke-opacity=".31"/></pattern>
 </defs>
 <rect width="1240" height="${height}" fill="url(#atlas-field)"/><rect width="1240" height="${height}" fill="url(#atlas-grid)"/>
 <rect x="15" y="15" width="1210" height="${height-30}" rx="18" fill="none" stroke="${t.gold}" stroke-opacity=".55"/>
 <rect x="22" y="22" width="1196" height="${height-44}" rx="13" fill="none" stroke="${t.gold}" stroke-opacity=".21"/>
 ${atlasMarks(world,height,t)}${worldEmblem(world,height,t)}
 ${areas.map(a=>plate(a,nodes.filter(n=>n.area===a.id))).join('')}
 ${routes}${compass(height,t)}</svg>`;
}
