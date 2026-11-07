import {ITEMS,GATHER_NODES} from './content.mjs?v=45';
import {PIXEL_STYLE,shade,spritePainter,finishSprite,drawSprite,spriteSvg} from './pixel-style.mjs?v=50';
import {itemTexture,drawItemTexture} from './item-textures.mjs?v=50';
const cache=new Map();
export function environmentSprite(kind,variant='oak',tint=null){const key=[kind,variant,tint].join('/');if(cache.has(key))return cache.get(key);const width=kind==='house'?96:kind==='tree'?64:48,height=kind==='house'?84:kind==='tree'?96:48,bark=variant==='birch'?'#c9c6a7':'#9e744e',leaf=variant==='jungle-wood'?'#56866b':variant==='saltwillow'?'#8fa895':'#71976a',stone=tint||'#899e96',p=spritePainter(width,height,{o:PIXEL_STYLE.outline,b:bark,l:shade(bark,28),s:shade(bark,-30),leaf,leaflight:shade(leaf,28),leafshade:shade(leaf,-30),stone,stoneLight:shade(stone,30),stoneShade:shade(stone,-32),cream:PIXEL_STYLE.light}),{r,line,oval}=p;
 if(kind==='tree'){
  const dead=variant==='driftwood';r(28,34,10,57,'s');r(29,34,6,58,'b');r(30,40,2,45,'l');line(30,62,17,46,'b',5);line(34,54,47,34,'b',4);r(23,90,20,4,'s');r(19,93,12,2,'b');r(35,92,13,3,'b');
  if(variant==='birch')for(let i=0;i<6;i++)r(29+i%2*3,47+i*7,5,2,'s');
  if(!dead){for(const[x,y,rx,ry]of [[19,37,16,14],[44,32,17,14],[31,23,20,18],[21,15,13,12],[41,13,13,10]])oval(x,y,rx,ry,'leafshade');for(const[x,y,rx,ry]of [[18,32,14,11],[42,27,16,12],[30,19,17,14],[21,12,11,9],[40,11,10,8]])oval(x,y,rx,ry,'leaf');for(const[x,y,rx,ry]of [[15,26,9,6],[27,10,10,6],[41,18,8,5]])oval(x,y,rx,ry,'leaflight');for(let i=0;i<13;i++)r(12+i*3,19+(i*7)%20,2,1,'leaflight');if(variant==='jungle-wood'||variant==='saltwillow')for(let i=0;i<4;i++){line(9+i*14,37,8+i*14,61+i%2*11,'leafshade',1);r(6+i*14,55+i%2*9,4,5,'leaf');}}
  else{line(29,48,18,34,'b',4);line(36,43,44,23,'l',3);line(34,57,48,49,'b',3);for(let i=0;i<6;i++)r(29+(i%2)*4,52+i*6,2,4,'s');}
 }else if(kind==='house'){
  r(13,35,70,45,'#bcba91');r(14,36,5,43,'#9b9f79');r(77,36,5,43,'#8c936e');r(14,47,68,3,'#8b8059');r(13,78,71,4,'#7a7657');r(8,81,81,2,'#4b6555');
  for(let row=0;row<6;row++){const x=9+row*5,y=31-row*5,w=80-row*10;r(x,y,w,6,tint||'#aa7858');r(x,y,w,1,'#d3ab78');for(let xx=x+4;xx<x+w-2;xx+=11)r(xx,y+1,1,4,'#805943');}r(5,36,88,4,'#625a43');r(60,3,9,15,'#8f9176');r(58,2,13,3,'#bdc09a');r(39,55,18,25,'#435f52');r(41,57,14,22,'#5c7760');r(51,67,2,3,'#d5b86e');for(const x of [22,63]){r(x,52,12,16,'#526958');r(x+2,54,8,11,'#dfca8c');r(x+6,54,1,11,'#8d805b');r(x+1,60,11,1,'#8d805b');}r(35,80,27,3,'#a6a17b');
 }else if(kind==='rock'){
  oval(24,33,22,12,'stoneShade');oval(24,29,20,14,'stone');oval(18,24,13,9,'stoneLight');r(9,34,13,6,'stoneShade');r(24,20,12,8,'stone');line(14,22,25,21,'cream');for(let i=0;i<7;i++)r(10+i*4,27+(i*5)%13,2,1,'stoneLight');
 }else if(kind==='lock'){
  oval(24,18,10,11,'stoneShade');oval(24,18,6,7,'o');r(11,20,27,23,'stoneShade');r(13,22,23,18,'#bfa778');r(14,23,21,2,'cream');r(22,28,5,5,'o');r(23,32,3,5,'o');
 }else if(kind==='bush'){
  for(const[x,y,rx,ry]of [[12,31,10,12],[25,22,15,14],[38,32,9,10]])oval(x,y,rx,ry,'leafshade');for(const[x,y,rx,ry]of [[12,27,9,9],[24,17,12,10],[36,27,9,8]])oval(x,y,rx,ry,'leaf');for(const[x,y]of [[10,23],[21,13],[31,22]])r(x,y,6,2,'leaflight');const berry=tint||'#638fa6';for(const[x,y]of [[12,32],[23,25],[34,33],[27,13],[8,23]]){oval(x,y,3,3,shade(berry,-28));r(x-1,y-2,3,3,berry);r(x-1,y-2,1,1,'cream');}
 }
 const sprite=finishSprite(p.pixels,width,height,{description:kind+' '+variant+' in the shared field-journal pixel style'});cache.set(key,sprite);return sprite;}
export function drawTree(g,x,y,scale=1,variant='oak'){const s=environmentSprite('tree',variant);drawSprite(g,s,x-s.width*scale,y-s.height*2*scale,2*scale);}
export function drawHouse(g,x,y,scale=1,tint=null){const s=environmentSprite('house','village',tint),unit=scale*1.6;drawSprite(g,s,x-s.width*unit/2,y-s.height*unit,unit);}
export function drawRock(g,x,y,scale=1,tint=null){const s=environmentSprite('rock','stone',tint);drawSprite(g,s,x-24*scale,y-46*scale,scale);}
export function environmentSvg(kind,variant='oak'){return spriteSvg(environmentSprite(kind,variant),'atlas-sprite');}
export function drawResourceArt(g,id,x,y,time=0){const skill=GATHER_NODES[id]?.skill,base=itemTexture(id)?.base||'#c1b587';if(skill==='logging'){drawTree(g,x,y,1.5,id);return 288;}if(skill==='mining'){drawRock(g,x,y,2.1);drawItemTexture(g,id,x,y-12,71);return 109;}
 if(skill==='foraging'){const s=environmentSprite('bush','berries',base);drawSprite(g,s,x-65,y-116,2.7);return 118;}
 if(skill==='fishing'){g.fillStyle=PIXEL_STYLE.outline;g.fillRect(x-104,y-17,208,17);g.fillStyle='#538c9f';g.fillRect(x-99,y-14,198,10);g.fillStyle='#9bcdd0';for(let i=0;i<8;i++)g.fillRect(x-85+i*24,y-12+(i%2)*3,15,2);for(const dx of [-90,92]){g.fillStyle='#5d8162';g.fillRect(x+dx,y-55,3,40);g.fillRect(x+dx-7,y-43,3,28);g.fillStyle='#bcb17a';g.fillRect(x+dx-1,y-60,5,12);}drawItemTexture(g,id,x+Math.round(Math.sin(time)*4),y-20,40);return 64;}
 if(skill==='bugcatching'){for(let i=0;i<4;i++){g.fillStyle='#628765';g.fillRect(x-58+i*36,y-38,3,38);g.fillRect(x-63+i*36,y-27,12,3);drawItemTexture(g,id,x-58+i*36,y-43-(i%2)*20+Math.round(Math.sin(time+i)*2),25);}return 96;}
 if(skill==='digging'){g.fillStyle=PIXEL_STYLE.outline;g.fillRect(x-73,y-15,146,14);g.fillStyle='#ab8964';g.fillRect(x-69,y-13,138,9);for(let i=0;i<6;i++){g.fillStyle=i%2?'#d4bd8d':'#7d715b';g.fillRect(x-58+i*21,y-14+(i%2)*5,14,4);}drawItemTexture(g,id,x+9,y-12,45);return 64;}return 0;
}
