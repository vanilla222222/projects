import {itemTextureSvg} from './item-textures.mjs?v=49';
import {ITEMS,EQUIPMENT,CLASSES} from './content.mjs?v=45';
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fmt=n=>Math.floor(n||0).toLocaleString();
export const percent=n=>(n!==0&&Math.abs(n)<.001?Number((n*100).toPrecision(2)):Number((n*100).toFixed(1)))+'%';
const shapes={
 sword:'<path d="m7 22 3 3 16-17-1-4-5 1-15 17 3 3m-2-7 9 9M5 27l4-4"/>',
 shield:'<path d="M6 5h20v13L16 28 6 18ZM16 7v17M8 15h16"/>',
 pick:'<path d="m9 27 12-19M4 9q13-10 25 5L17 9 7 12Z"/>',
 axe:'<path d="m10 28 9-22M11 5l15 5-3 12-11-6Z"/>',
 helm:'<path d="M5 24v-9q0-12 11-12t11 12v9H20v-8h-8v8ZM6 13h20M15 3v9"/>',
 body:'<path d="m9 5 7 4 7-4 7 8-7 5v11H9V18l-7-5Z"/>',
 legs:'<path d="M7 4h18v24h-7l-2-14-2 14H7ZM8 8h16"/>',
 boot:'<path d="M8 4h13v15l6 3v6H5v-9h3ZM10 9h9"/>',
 ring:'<circle cx="16" cy="19" r="9"/><path d="m11 7 5-5 5 5-5 6Z"/>',
 cape:'<path d="m10 3 6 4 6-4 7 25-13-4-13 4ZM10 6l-4 17M22 6l4 17"/>',
 trophy:'<path d="M9 3h14v11q0 7-7 7t-7-7ZM9 6H3v6l7 5m13-11h6v6l-7 5M16 21v6M9 28h14"/>',
 bag:'<path d="M9 8V5h14v3m-17 4 4-4h12l4 4v17H6ZM10 17h12v8H10Z"/>',
 chest:'<path d="M3 13q0-9 13-9t13 9v15H3ZM3 15h26M13 12h6v9h-6ZM7 15v13m18-13v13"/>',
 food:'<path d="M4 15Q4 4 16 4t12 11v13H4ZM10 10l-1 7m8-8-2 8m9-6-3 7"/>',
 potion:'<path d="M12 2h8v8l8 13-3 6H7l-3-6 8-13ZM10 4h12M8 21h16"/>',
 ore:'<path d="m3 21 5-12 12-6 10 13-6 13H9ZM8 10l6 8 6-14m-6 14 10 9M4 21l10-3 14-2"/>',
 wood:'<path d="M5 10 23 3l6 17-18 9Z"/><ellipse cx="8" cy="20" rx="6" ry="9"/><path d="m12 11 12-5M16 17l9-3m-9 10 10-4"/>',
 bar:'<path d="m4 12 19-6 6 11-20 8-6-7ZM4 12l6 8 19-8m-19 8-1 5"/>',
 leaf:'<path d="M4 27Q0 3 29 3q-1 26-25 24Zm0 0L25 7M10 21l-1-9m7 3 9-1"/>',
 star:'<path d="m16 2 4 9 10 1-8 7 2 11-8-6-9 6 2-11-7-7 10-1Z"/>',
 book:'<path d="M16 7Q9 2 3 5v22q6-3 13 1 7-4 13-1V5q-6-3-13 2Zm0 0v21M7 10l5 1m-5 5 5 1m9-6 5-1m-5 7 5-1"/>',
 map:'<path d="m2 6 9-3 10 4 9-3v23l-9 3-10-4-9 3ZM11 3v23M21 7v23M5 18l7-5 10 6 5-8"/>',
 eye:'<path d="M2 16Q16-3 30 16 16 35 2 16Z"/><circle cx="16" cy="16" r="5"/>',
 hourglass:'<path d="M7 3h18M7 29h18M9 3v8l14 10v8M23 3v8L9 21v8M11 25h10"/>',
 gear:'<path d="m13 2 6 0 1 5 5 2 4-1 2 6-4 3-1 5 2 4-5 4-4-3-5 0-4 3-5-4 2-4-1-5-4-3 2-6 5 1 4-2Z"/><circle cx="16" cy="16" r="5"/>',
 people:'<circle cx="11" cy="8" r="5"/><path d="M2 29v-9q0-6 9-6t9 6v9Zm18-25q9 0 8 8M23 17q8 1 7 12"/>',
 coin:'<circle cx="16" cy="16" r="13"/><circle cx="16" cy="16" r="9"/><path d="M18 8h-4l-3 5 10 6-3 5h-4M16 6v20"/>',
 stamp:'<path d="M3 3h26v26H3ZM7 7h18v18H7ZM13 10h6v12h-6Z"/>',
 statue:'<path d="M5 26h22v4H5ZM10 23h12l-2-11H12ZM11 9V3h10v6ZM7 14h18"/>',
 cards:'<path d="M4 7 20 3l7 23-16 4ZM9 3h16l4 20M10 11l6-3 5 14-6 3Z"/>',
 flag:'<path d="M7 30V3h18l-5 7 6 7H8"/>',
 attack:'<path d="m5 26 5-4m-4-4 8 8M8 21 25 4l3 2-2 5-16 14M5 3l21 24M5 7l3-4"/>',
 gem:'<path d="m3 11 6-8h14l6 8-13 19ZM3 11h26M9 3l7 27 7-27M9 3l7 8 7-8"/>'
};
export function icon(kind='star',color='#e8c67c',cls='ui-icon'){return`<svg class="${cls}" viewBox="0 0 32 32" aria-hidden="true" shape-rendering="geometricPrecision"><g fill="${color}33" stroke="${color}" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">${shapes[kind]||shapes.star}</g></svg>`;}
export function itemArt(id,cls='item-art'){return itemTextureSvg(id,cls)||icon('gem','#d8cba2',cls);}
export function portrait(c,cls='character-art'){
 const col=c.color||CLASSES[c.class]?.color||'#a19163',skin='#e6be91',dark='#293c36',rect=(x,y,w,h,fill)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
 let body=rect(9,68,31,4,'#283d3626')+rect(15,50,8,18,'#40514b')+rect(27,50,8,18,'#40514b')+rect(13,65,11,5,'#33433b')+rect(26,65,12,5,'#33433b')+rect(12,28,26,27,col)+rect(12,29,5,23,'#ffffff22')+rect(32,29,6,23,'#17372b33')+rect(8,32,6,20,skin)+rect(37,32,6,20,skin)+rect(16,8,22,21,skin)+rect(14,5,24,8,'#785d41')+rect(13,10,7,12,'#785d41')+rect(18,14,3,4,'#f5d1a2')+rect(28,17,3,3,dark)+rect(35,17,2,3,dark)+rect(29,24,5,2,'#b78c66')+rect(13,49,24,4,'#69543b')+rect(24,48,5,5,'#d6bc7e');
 if(c.class==='warrior')body+=rect(12,7,28,6,'#acbabb')+rect(13,10,5,15,'#7f9696')+rect(36,10,4,14,'#7f9696')+rect(25,2,5,7,'#c89b66')+rect(10,28,11,7,'#91a7a0')+rect(32,28,9,7,'#91a7a0')+rect(40,32,3,27,'#dbe3cb')+rect(35,51,13,3,'#c8a862');
 if(c.class==='mage')body+=`<path d="M13 6h29l-8-18-9 7-4 11Z" fill="${col}"/>`+rect(10,5,34,5,'#4d758b')+rect(16,9,24,3,'#c7be85')+rect(18,32,4,18,'#d8c589')+rect(41,21,3,44,'#977348')+rect(37,17,11,10,'#7cc2c4')+rect(39,18,3,4,'#d2e8c4');
 if(c.class==='blacksmith')body+=rect(18,30,18,25,'#775a41')+rect(19,32,3,18,'#ad8253')+rect(21,40,12,8,'#5b4c3b')+rect(38,34,3,31,'#a7885e')+rect(32,29,16,10,'#91a7ad')+rect(33,29,14,3,'#c7d5c7')+rect(18,7,20,3,'#566b5b');
 if(c.class==='enchanter')body+=rect(14,6,26,5,'#b1a1cc')+rect(24,5,5,7,'#e4d295')+rect(15,29,7,18,'#d6c7a0')+rect(33,29,4,18,'#d6c7a0')+rect(40,24,3,37,'#817386')+`<path d="m42 16 7 9-7 9-7-9Z" fill="#c1a9e2"/>`+rect(40,22,3,6,'#eee0bd');
 if(c.class==='alchemist')body+=rect(6,31,7,25,'#6e8054')+rect(7,33,4,9,'#b7b779')+rect(15,28,21,5,'#ded3ae')+rect(24,33,5,14,'#b4b694')+rect(39,44,7,12,'#86bda8')+rect(41,38,3,6,'#c2d9b8')+rect(38,52,9,4,'#c4df86')+rect(14,8,25,4,'#748c60');
 if(!c.class)body+=rect(7,30,8,23,'#927f57')+rect(8,31,5,6,'#b6a377')+rect(19,31,4,16,'#d2bf83');
 if(c.loadout?.head)body+=rect(13,5,27,6,'#abbdb3')+rect(13,11,5,11,'#859e94')+rect(36,11,4,11,'#859e94');
 return`<svg class="${String(cls).replace(/[^a-zA-Z0-9 _-]/g,'')}" viewBox="0 -12 50 86" aria-hidden="true" shape-rendering="crispEdges">${body}</svg>`;
}

export const section=(title,body,cls='')=>`<section class="ledger-box ${cls}"><h3 class="ledger-title">${title}</h3>${body}</section>`;
export function tabs(entries,active,attribute){return`<div class="rpg-tabs" role="tablist">${entries.map(([id,name])=>`<button role="tab" aria-selected="${id===active}" ${attribute}="${id}" class="${id===active?'selected':''}">${name}</button>`).join('')}</div>`;}
