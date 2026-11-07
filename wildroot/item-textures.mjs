import {ITEMS,EQUIPMENT,FOODS,POTIONS,GATHER_NODES} from './content.mjs?v=45';
// Original 32px inventory sprites. Families determine anatomy; an item's material,
// cut, surface grain, fittings and engraved motif give it its own visible texture.
const SIZE=32,cache=new Map();
const hash=s=>{let h=2166136261;for(const ch of s)h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0;};
const shade=(hex,n)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(hex.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('');
const named={copper:'#c78659',iron:'#a2b6bf',gold:'#dfbc59',cobalt:'#578bce',obsidian:'#716493',tempered:'#73a995',verdant:'#78a87b',tempest:'#77c7cf',root:'#9b785c',sun:'#e7bc68',amber:'#d79c47',birch:'#ddd3ad',oak:'#9e744e',jungle:'#5d9b6c',saltwillow:'#a4b6a1',driftwood:'#a99786',tide:'#589bb5',cloud:'#dec58a',glow:'#cbd87d',glass:'#9cd6cc',void:'#9e82c6',orchid:'#cd91b9',moss:'#82ac6b',stone:'#93a3ac',rune:'#a599ce',runic:'#a599ce',woven:'#bc9967',reinforced:'#a17a58',bread:'#d9af68',stew:'#ba794e',feast:'#a47952'};
export function textureFamily(id){const d=EQUIPMENT[id],skill=GATHER_NODES[id]?.skill;
 if(d){if(d.slot==='weapon')return({mage:'staff',blacksmith:'hammer',enchanter:'focus',alchemist:'retort'}[d.class])||(/staff|branch/.test(id)?'staff':/hammer/.test(id)?'hammer':/focus/.test(id)?'focus':/retort|flask/.test(id)?'retort':'sword');return d.slot;}
 if(skill)return({mining:'ore',logging:'log',fishing:'fish',bugcatching:'bug',digging:id==='clay'?'clay':id==='fossil'?'fossil':'relic',foraging:'berry'})[skill];
 if(FOODS[id])return id==='bread'?'bread':id==='stew'?'stew':id==='feast'?'feast':'ration';
 if(POTIONS[id]||/tonic|potion|resin|essence|dew/.test(id))return'potion';
 if(/stamp-/.test(id))return'stamp';if(/statue-/.test(id))return'statue';if(/bag|pouch|pack|satchel/.test(id))return'bag';if(/crate|chest|lockbox|cabinet/.test(id))return'chest';
 if(/expansion|book/.test(id))return'book';if(/token|completion/.test(id))return'token';if(/key/.test(id))return'key';if(/heart/.test(id))return'heart';if(/bar/.test(id))return'bar';if(/plank|charcoal/.test(id))return'log';if(/thread|fiber/.test(id))return'thread';if(/nail/.test(id))return'nails';if(/brick|clay/.test(id))return'clay';if(/seed/.test(id))return'seed';if(/petal|leaf/.test(id))return'leaf';if(/fang/.test(id))return'fang';if(/wing/.test(id))return'wing';if(/shell|scale|husk/.test(id))return'shell';if(/hide|slime/.test(id))return'hide';if(/ember|flame/.test(id))return'flame';if(/pearl/.test(id))return'pearl';if(/seal|relic|legend/.test(id))return'relic';if(/dust/.test(id))return'dust';if(/sculpting/.test(id))return'chisel';if(/stone|crystal|shard|splinter|fragment|rare/.test(id))return'crystal';return'curio';
}
function makeTexture(id){
 const item=ITEMS[id],seed=hash(id),family=textureFamily(id),base=EQUIPMENT[id]?.gatherTier&&id.startsWith('tide-')?['','#b8a270','#679bdb','#527bbc'][EQUIPMENT[id].gatherTier]:/mining-tonic/.test(id)?'#78a7ca':/logging-tonic/.test(id)?'#8eb775':/battle-tonic/.test(id)?'#d48c79':/ward-tonic/.test(id)?'#b298ce':Object.entries(named).find(([key])=>id.includes(key))?.[1]||['#92b6ab','#ac95b9','#c4a57b','#86a9b9','#b8b77f'][seed%5],palette={o:'#24383c',s:shade(base,-48),b:base,l:shade(base,34),w:'#f1e4bd',g:['#edc777','#85d5c3','#c1a7e5','#d3dd8c'][seed%4],wood:'#92704e',iron:'#a8bec3'},pixels=Array(SIZE*SIZE).fill(null);
 const r=(x,y,w,h,k)=>{for(let yy=Math.max(0,Math.round(y));yy<Math.min(SIZE,Math.round(y+h));yy++)for(let xx=Math.max(0,Math.round(x));xx<Math.min(SIZE,Math.round(x+w));xx++)pixels[yy*SIZE+xx]=palette[k]||k;};
 const line=(x,y,a,b,k,width=1)=>{const n=Math.max(Math.abs(a-x),Math.abs(b-y));for(let i=0;i<=n;i++)r(Math.round(x+(a-x)*i/(n||1)),Math.round(y+(b-y)*i/(n||1)),width,width,k);};
 const oval=(x,y,rx,ry,k)=>{for(let yy=Math.floor(y-ry);yy<=y+ry;yy++)for(let xx=Math.floor(x-rx);xx<=x+rx;xx++)if(((xx-x)/rx)**2+((yy-y)/ry)**2<=1)r(xx,yy,1,1,k);};
 const polygon=(points,k)=>{for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const [a,b]=points[i],[c,d]=points[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;}if(inside)r(x,y,1,1,k);}};
 const metal=(x,y,w,h)=>{r(x-1,y-1,w+2,h+2,'o');r(x,y,w,h,'b');r(x,y,w,2,'l');r(x+w-2,y+2,2,h-2,'s');};
 const cut=seed%3;
 switch(family){
 case'sword':polygon([[8,25],[5,22],[23,3],[28,2],[27,7]],'o');polygon([[9,22],[7,21],[24,4],[26,4],[25,7]],'b');line(10,20,24,5,'l');line(5,27,10,22,'wood',3);line(4,20,13,27,'g',2);break;
 case'staff':line(9,28,20,6,'o',4);line(10,27,21,6,'wood',2);oval(22,6,6,5,'s');oval(22,6,4,4,'g');r(20,3,2,3,'w');for(let i=0;i<3;i++)r(13+i*2,19-i*4,4,2,'l');break;
 case'hammer':line(10,28,21,7,'o',4);line(11,27,22,7,'wood',2);polygon([[8,5],[24,3],[29,13],[14,17]],'o');polygon([[11,6],[23,5],[26,12],[15,14]],'b');line(11,6,22,5,'l',2);r(17,8,5,4,'g');break;
 case'focus':case'charm':oval(16,16,12,12,'o');oval(16,16,10,10,'s');polygon([[16,3],[25,15],[16,29],[7,15]],'b');polygon([[16,6],[21,15],[16,24],[11,15]],'g');line(16,8,13,14,'w');break;
 case'retort':line(8,27,20,6,'wood',3);r(17,2,9,3,'o');r(19,5,5,8,'iron');oval(21,19,9,9,'o');oval(21,19,7,7,'b');r(15,20,13,4,'g');r(17,14,2,5,'w');break;
 case'pick':case'axe':case'rod':case'net':case'shovel':case'chisel':line(8,29,22,5,'o',3);line(9,28,23,5,'wood',2);if(family==='pick'){polygon([[4,8],[12,3],[23,4],[29,11],[25,9],[16,7],[7,11]],'iron');line(5,8,13,4,'l');}if(family==='axe'){polygon([[12,3],[26,5],[28,14],[18,17],[16,9]],'o');polygon([[14,4],[25,7],[25,13],[19,14],[17,8]],'b');line(25,7,25,12,'l',2);}if(family==='rod'){line(23,5,29,9,'l');line(29,9,27,22,'w');r(25,22,4,4,'g');oval(15,20,3,3,'iron');}if(family==='net'){oval(23,8,8,7,'o');oval(23,8,6,5,'l');for(let x=19;x<29;x+=3)line(x,4,x-3,12,'s');for(let y=5;y<14;y+=3)line(18,y,28,y,'s');}if(family==='shovel'){polygon([[9,17],[18,20],[14,30],[9,31],[5,26]],'iron');line(9,20,7,26,'l');oval(24,5,4,4,'o');oval(24,5,2,2,'wood');}if(family==='chisel')metal(18,3,8,12);break;
 case'head':metal(5,11,23,13);oval(16,12,11,8,'b');r(8,19,7,8,'s');r(20,19,6,8,'s');r(15,12,3,14,'l');r(9,17,14,3,'o');r(13,4,5,6,'g');break;
 case'body':polygon([[10,5],[16,8],[22,5],[30,12],[25,18],[23,16],[24,29],[8,29],[9,16],[6,18],[2,12]],'o');polygon([[10,7],[16,10],[22,7],[28,12],[23,15],[22,27],[10,27],[9,15],[4,12]],'b');r(11,12,2,14,'l');r(15,11,3,15,'s');r(9,23,15,3,'g');break;
 case'legs':metal(7,4,19,7);r(8,11,7,18,'b');r(18,11,7,18,'s');r(9,13,2,14,'l');r(19,20,6,3,'g');break;
 case'feet':polygon([[6,7],[15,6],[15,21],[19,23],[19,29],[3,29],[3,22],[6,20]],'o');polygon([[19,3],[27,4],[27,17],[31,20],[31,25],[17,25],[17,19],[19,17]],'o');r(7,9,6,15,'b');r(5,24,12,3,'l');r(20,6,5,16,'b');r(19,21,10,2,'g');break;
 case'gloves':for(const [x,y]of [[3,11],[17,6]]){r(x,y,10,16,'o');for(let i=0;i<3;i++)r(x+i*3,y-4-i%2,2,7,'b');r(x+1,y+1,8,11,'b');r(x+1,y+12,9,3,'g');r(x+9,y+4,3,7,'l');}break;
 case'ring':oval(16,20,10,10,'o');oval(16,20,8,8,'g');oval(16,20,5,5,'o');polygon([[16,1],[24,8],[16,15],[8,8]],'b');line(15,3,11,8,'w');break;
 case'cape':polygon([[10,3],[16,7],[22,3],[29,29],[16,25],[3,29]],'o');polygon([[11,6],[16,10],[21,6],[26,26],[16,22],[6,26]],'b');line(12,10,9,23,'l',2);r(13,7,6,3,'g');break;
 case'trophy':metal(10,4,13,13);r(4,6,6,10,'g');r(23,6,5,10,'g');r(14,17,5,9,'wood');metal(8,26,17,4);break;
 case'ore':case'crystal':polygon([[3,23],[6,10+cut],[15,3],[26,7],[30,21],[21,29],[8,28]],'o');polygon([[5,22],[8,11+cut],[15,5],[25,9],[27,21],[20,26],[9,26]],'s');polygon([[8,11],[15,6],[18,17],[13,23]],'b');polygon([[18,11],[24,10],[26,20],[20,24]],'l');if(family==='crystal')polygon([[16,2],[21,8],[18,24],[13,25]],'g');break;
 case'bar':polygon([[2,14],[23,5],[30,19],[9,28]],'o');polygon([[5,14],[22,8],[26,17],[11,23]],'b');line(6,14,22,9,'l',2);polygon([[11,23],[26,17],[26,21],[10,26]],'s');break;
 case'log':line(9,21,23,9,'s',11);line(10,19,23,8,'b',8);oval(9,22,7,8,'o');oval(9,22,5,6,'l');oval(9,22,3,4,'s');r(8,20,2,4,'b');line(15,14,24,7,'l');break;
 case'fish':oval(15,17,10,6+cut,'o');oval(15,17,8,4+cut,'b');polygon([[23,16],[30,9],[30,25]],'l');polygon([[12,12],[17,5],[20,12]],'s');r(7,15,2,2,'w');r(8,15,1,1,'o');line(12,19,20,17,'l');if(id==='storm-eel'){line(3,21,12,25,'g',3);line(12,25,22,19,'g',2);}break;
 case'bug':oval(16,18,7+cut,10,'o');oval(16,18,5+cut,8,'b');oval(16,7,4,4,'s');line(16,12,16,25,'l');for(const side of [-1,1]){line(16+side*3,5,16+side*8,2,'g');for(let y=12;y<26;y+=5)line(16+side*6,y,16+side*12,y+3,'s');}if(id==='glasswing'||id==='glowbug'){oval(8,14,6,8,'l');oval(24,14,6,8,'l');r(15,12,3,15,'g');}break;
 case'berry':for(const [x,y]of [[9,20],[19,22],[16,13]]){oval(x,y,7,7,'o');oval(x,y,5,5,'b');r(x-2,y-2,2,2,'l');}polygon([[12,9],[9,2],[17,6],[24,3],[22,10]],'g');break;
 case'clay':r(4,20,24,9,'s');r(7,13,20,9,'b');r(12,7,13,8,'l');line(7,24,23,24,'l');break;
 case'fossil':oval(16,17,13,12,'s');oval(16,17,11,10,'b');for(let i=0;i<22;i++){const a=i*.55,rr=10-i*.36;r(16+Math.cos(a)*rr,16+Math.sin(a)*rr,2,2,'w');}break;
 case'bag':polygon([[9,6],[23,6],[29,15],[27,29],[5,29],[3,15]],'o');r(7,14,19,13,'b');r(9,8,14,6,'l');r(10,3,12,3,'wood');r(5,15,3,11,'s');metal(11,17,11,8);r(15,12,3,7,'g');break;
 case'chest':r(3,12,27,17,'o');r(5,15,23,12,'wood');oval(16,12,13,8,'s');r(4,12,25,5,'b');r(7,8,3,20,'iron');r(23,8,3,20,'iron');metal(13,14,6,7);break;
 case'potion':r(11,3,11,4,'wood');r(13,7,7,7,'l');oval(16,22,11,9,'o');oval(16,22,9,7,'b');r(10,23,14,4,'g');r(10,16,2,7,'w');r(13,13,7,2,'l');break;
 case'bread':oval(16,18,14,10,'o');oval(16,17,12,8,'b');for(let i=0;i<3;i++)line(8+i*7,14,5+i*7,20,'l',2);break;
 case'stew':oval(16,13,13,6,'o');oval(16,13,11,4,'b');r(5,14,22,10,'s');oval(16,23,10,5,'s');for(let i=0;i<5;i++)r(8+i*4,11+i%2*3,3,2,i%2?'g':'l');line(22,10,29,2,'wood',2);break;
 case'feast':oval(16,24,15,6,'iron');oval(17,18,11,9,'s');oval(16,15,9,7,'b');r(9,14,2,3,'l');r(24,17,6,3,'w');r(28,15,3,7,'w');r(3,21,5,3,'g');break;
 case'ration':r(4,8,24,20,'o');r(6,10,20,16,'wood');r(14,8,4,21,'g');r(4,16,24,3,'l');r(8,11,4,4,'b');break;
 case'stamp':r(3,3,27,27,'o');r(5,5,23,23,'w');for(let x=7;x<28;x+=4){r(x,3,2,2,'b');r(x,28,2,2,'b');r(3,x,2,2,'b');r(28,x,2,2,'b');}r(9,9,15,15,'b');r(11,11,11,11,'s');if(/blade|sight/.test(id))line(12,22,21,11,'w',2);else if(/pick|orebag/.test(id)){line(13,22,19,12,'w',2);line(12,13,22,13,'g',2);}else if(/heart/.test(id)){oval(14,14,3,3,'g');oval(20,14,3,3,'g');polygon([[11,15],[23,15],[17,23]],'g');}else if(/hatchet|logbag/.test(id)){line(14,22,18,11,'w',2);r(17,11,6,6,'g');}else{r(13,13,8,7,'g');r(16,10,2,3,'w');}break;
 case'statue':metal(6,27,22,4);r(10,23,14,4,'s');r(13,12,10,12,'b');oval(17,8,6,6,'b');r(12,5,8,2,'l');r(7,15,7,5,'s');r(23,13,6,5,'l');break;
 case'book':r(5,4,23,26,'o');r(7,5,20,22,'b');r(5,5,4,24,'s');r(10,27,17,2,'w');r(12,10,10,11,'g');r(15,12,4,7,'s');break;
 case'token':case'relic':oval(16,16,14,14,'o');oval(16,16,12,12,'g');oval(16,16,9,9,'s');polygon([[16,7],[23,16],[16,25],[9,16]],'b');r(15,10,2,8,'l');if(/warrior|blade/.test(id))line(11,22,22,10,'w',2);if(/mage|steward/.test(id)){oval(16,13,4,4,'g');line(16,17,16,23,'w',2);}if(/blacksmith/.test(id)){r(11,11,11,6,'w');r(16,17,2,7,'g');}if(/alchemist/.test(id)){r(14,10,4,6,'w');oval(16,20,5,5,'g');}if(/enchanter|completion/.test(id)){line(11,18,21,18,'g');line(16,11,16,24,'w');}break;
 case'key':oval(22,9,8,7,'o');oval(22,9,6,5,'g');oval(22,9,3,2,'o');line(17,13,4,27,'g',3);r(4,23,3,6,'l');r(8,19,3,6,'g');break;
 case'heart':oval(10,10,8,7,'o');oval(23,10,8,7,'o');polygon([[2,11],[30,11],[28,20],[16,31],[4,21]],'o');oval(11,11,6,6,'b');oval(22,11,6,6,'b');polygon([[5,12],[28,12],[25,20],[16,28],[7,20]],'b');r(8,7,3,4,'l');line(16,11,13,19,'g',2);break;
 case'fang':polygon([[6,3],[27,5],[24,15],[10,29],[4,30],[11,18]],'o');polygon([[9,5],[25,7],[22,14],[9,26],[14,16]],'w');line(12,7,18,9,'b',2);break;
 case'wing':for(const side of [-1,1]){polygon([[16,16],[16+side*13,3],[16+side*14,18],[16+side*5,28]],'o');polygon([[16,16],[16+side*11,6],[16+side*11,17],[16+side*5,24]],'b');line(16,16,16+side*10,10,'l');}r(15,9,3,18,'s');break;
 case'shell':oval(16,18,13,11,'o');oval(16,17,11,9,'b');for(let i=0;i<5;i++)line(16,26,6+i*5,11+Math.abs(2-i)*2,'l');break;
 case'hide':polygon([[4,5],[12,7],[19,3],[28,8],[25,15],[29,24],[23,30],[16,26],[7,30],[2,21],[7,15]],'o');polygon([[6,8],[13,10],[19,6],[25,10],[22,16],[26,23],[22,27],[16,23],[8,27],[5,21],[10,15]],'b');break;
 case'leaf':case'seed':oval(17,18,10,12,'o');oval(17,17,8,10,'b');line(12,26,20,9,'l',2);if(family==='leaf'){line(16,18,9,13,'g');line(17,14,23,11,'g');}else{r(18,3,3,7,'g');r(12,13,2,6,'w');}break;
 case'thread':metal(9,3,15,4);r(11,7,11,18,'b');for(let i=0;i<6;i++)line(10,8+i*3,24,10+i*3,'l');metal(8,26,18,4);line(22,23,29,28,'g');break;
 case'nails':for(let i=0;i<3;i++){line(7+i*8,7-i%2*3,3+i*8,28-i%2*3,'iron',2);r(3+i*8,6-i%2*3,8,3,'s');}break;
 case'flame':polygon([[16,1],[21,11],[26,6],[30,21],[25,29],[8,29],[2,20],[7,8],[11,18]],'s');polygon([[16,7],[20,17],[25,13],[26,23],[22,27],[10,26],[7,20],[12,13],[13,21]],'b');polygon([[17,17],[22,24],[15,28],[11,24]],'g');break;
 case'pearl':oval(16,17,13,13,'o');oval(16,17,11,11,'b');oval(13,13,6,6,'l');r(10,9,3,3,'w');break;
 case'dust':for(let i=0;i<12;i++){const x=4+(seed>>>(i%4*5))%23,y=5+(i*7)%24;r(x,y,2+i%2,2+i%3,['b','g','l'][i%3]);}break;
 default:polygon([[16,2],[29,10],[25,25],[10,30],[2,17]],'o');polygon([[16,5],[26,12],[22,23],[11,26],[5,17]],'b');oval(16,16,5,6,'g');break;
 }
 // Material grain and item-specific engraving live on the object, never as a
 // number/badge pasted over an otherwise identical shared icon.
 let rng=seed;for(let i=0;i<44;i++){rng=(Math.imul(rng,1664525)+1013904223)>>>0;const x=3+rng%26,y=3+(rng>>>8)%26,at=y*SIZE+x;if(pixels[at]&&pixels[at]!==palette.o)pixels[at]=[palette.l,palette.s,palette.g][i%3];}
 const runs=[];for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;){const color=pixels[y*SIZE+x];let end=x+1;while(end<SIZE&&pixels[y*SIZE+end]===color)end++;if(color)runs.push({x,y,w:end-x,color});x=end;}
 return{id,family,pixels,runs,width:SIZE,height:SIZE};
}
export function itemTexture(id){if(!ITEMS[id])return null;if(!cache.has(id))cache.set(id,makeTexture(id));return cache.get(id);}
export function itemTextureSvg(id,cls='item-art'){const t=itemTexture(id);if(!t)return'';const safe=String(cls).replace(/[^a-zA-Z0-9 _-]/g,'');if(!t.dataUrl){const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">${t.runs.map(p=>`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="1" fill="${p.color}"/>`).join('')}</svg>`;t.dataUrl='data:image/svg+xml;base64,'+btoa(svg);}return`<svg class="${safe}" viewBox="0 0 32 32" aria-hidden="true" data-item-texture="${id}"><image width="32" height="32" href="${t.dataUrl}" style="image-rendering:pixelated"/></svg>`;}

export function drawItemTexture(g,id,x,y,size=26){const t=itemTexture(id);if(!t)return false;g.save();g.translate(x-size/2,y-size);g.scale(size/32,size/32);for(const p of t.runs){g.fillStyle=p.color;g.fillRect(p.x,p.y,p.w,1);}g.restore();return true;}
