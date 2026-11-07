import {CLASSES} from './content.mjs?v=45';
import {itemTexture,drawItemTexture} from './item-textures.mjs?v=50';
import {PIXEL_STYLE,shade,spritePainter,finishSprite,drawSprite,spriteSvg} from './pixel-style.mjs?v=50';
const cache=new Map(),tone=(piece,fallback)=>piece?itemTexture(piece.base)?.base||fallback:fallback;
export function characterSprite(c,frame=0){
 const cloth=tone(c.loadout?.body,c.color||CLASSES[c.class]?.color||'#ad946b'),metal=tone(c.loadout?.head,'#a3b7b5'),boots=tone(c.loadout?.feet,'#625e4c'),legs=tone(c.loadout?.legs,'#52645a'),key=[c.class,cloth,metal,boots,legs,!!c.loadout?.head,frame].join('/');if(cache.has(key))return cache.get(key);
 const palette={o:PIXEL_STYLE.outline,b:cloth,l:shade(cloth,34),s:shade(cloth,-32),skin:'#dfb58c',skinlight:'#f0cfaa',hair:'#785a40',hairlight:'#9b7950',gold:'#d1ad69',metal,metalshade:shade(metal,-30),boot:boots,legs,cream:PIXEL_STYLE.light};
 const p=spritePainter(40,64,palette),{r,line,oval}=p,stride=frame===1?-2:frame===3?2:0;
 // Separate boots and knees let the walk cycle read without stretching the body.
 r(12-stride,46,7,14,'legs');r(23+stride,46,7,14,'legs');r(11-stride,58,9,5,'boot');r(22+stride,58,10,5,'boot');r(12-stride,59,3,2,'cream');r(23+stride,59,3,2,'metalshade');
 r(10,29,21,20,'b');r(11,30,4,17,'l');r(27,31,4,17,'s');r(11,47,20,3,'hair');r(19,46,5,5,'gold');r(20,47,2,2,'cream');
 r(7,31+stride,5,15,'b');r(7,43+stride,5,7,'skin');r(8,43+stride,2,3,'skinlight');r(30,31-stride,5,15,'s');r(31,43-stride,5,7,'skin');
 r(12,14,18,16,'skin');r(12,14,4,11,'skinlight');r(11,11,20,7,'hair');r(10,15,5,12,'hair');r(12,12,13,2,'hairlight');r(26,14,5,4,'hair');r(23,20,3,3,'o');r(24,20,1,1,'cream');r(29,20,2,3,'o');r(23,26,5,1,'hair');
 if(c.class==='warrior'){r(8,29,9,6,'metal');r(26,29,8,6,'metalshade');r(10,30,6,1,'cream');r(15,31,3,14,'gold');r(9,13,24,4,'metal');r(11,9,20,5,'metal');r(19,5,4,5,'gold');r(10,17,4,10,'metalshade');}
 if(c.class==='mage'){r(9,40,24,11,'b');r(11,42,4,8,'l');r(17,31,3,17,'gold');r(8,12,27,4,'s');r(13,8,19,5,'b');r(17,4,13,5,'b');r(22,0,7,5,'l');r(12,12,22,2,'gold');}
 if(c.class==='blacksmith'){r(14,30,14,21,'hair');r(16,32,2,17,'hairlight');r(17,40,10,7,'s');r(12,12,18,3,'metalshade');r(15,12,5,5,'gold');r(24,12,5,5,'gold');r(16,13,3,2,'metal');r(25,13,3,2,'metal');}
 if(c.class==='enchanter'){r(14,31,3,17,'cream');r(27,31,3,17,'gold');r(18,34,7,7,'s');line(21,34,21,41,'gold');line(18,37,24,37,'cream');r(11,12,20,3,'metal');r(20,10,4,6,'gold');r(13,16,3,12,'l');}
 if(c.class==='alchemist'){r(7,30,7,23,'s');r(8,33,4,6,'gold');r(14,29,16,4,'cream');r(19,33,4,11,'l');r(14,45,4,5,'#91bca3');r(26,43,4,6,'#c3d17a');r(10,11,22,4,'s');r(12,8,18,4,'b');r(14,9,12,1,'l');}
 if(!c.class){r(6,30,7,22,'hair');r(7,32,4,6,'gold');r(16,30,3,15,'cream');}
 if(c.loadout?.head){r(10,10,22,6,'metal');r(11,8,20,3,'metal');r(10,15,4,11,'metalshade');r(29,15,4,11,'metalshade');r(12,9,16,1,'cream');}
 // Small, intentional material seams echo the item icons' highlights and grain.
 for(let i=0;i<3;i++)r(21+i*2,42-i*2,1,1,'l');
 const s=finishSprite(p.pixels,40,64,{description:(c.class||'beginner')+' character with class outfit and equipped armour'});cache.set(key,s);if(cache.size>256)cache.delete(cache.keys().next().value);return s;
}
export function drawCharacter(g,x,y,c,time=0){const walking=c.activity!=='rest',frame=walking?Math.floor(time*2)%4:0,bob=walking&&frame%2?1:0,scale=2.1,s=characterSprite(c,frame);g.fillStyle='#24383c33';g.fillRect(Math.round(x-20),Math.round(y-3),42,5);drawSprite(g,s,x-20*scale,y-64*scale-bob,scale);
 const weapon=c.loadout?.weapon?.base;if(weapon){g.save();g.translate(Math.round(x+26),Math.round(y-38-bob));if(c.action)g.rotate(-.4);drawItemTexture(g,weapon,0,0,52);g.restore();}
}
export function characterSvg(c,cls='character-art'){return spriteSvg(characterSprite(c),cls);}
