import {PIXEL_STYLE,shade} from './pixel-style.mjs?v=50';
// Original geometric scenery, authored around each room's silhouette and palette.
const rect=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));};
const line=(g,points,c,w=4)=>{g.strokeStyle=c;g.lineWidth=w;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();};
const circle=(g,x,y,r,c)=>{const step=Math.max(2,Math.round(r/12));for(let yy=-r;yy<=r;yy+=step){const half=Math.sqrt(Math.max(0,r*r-yy*yy));rect(g,x-half,y+yy,half*2,step,c);}};
function gear(g,x,y,r,t,c){g.save();g.translate(x,y);g.rotate(t);for(let i=0;i<12;i++){g.rotate(Math.PI/6);rect(g,-r*.12,-r*1.12,r*.24,r*.3,c);}circle(g,0,0,r,c);circle(g,0,0,r*.68,'#273647');for(let i=0;i<6;i++){g.rotate(Math.PI/3);rect(g,-r*.07,-r*.8,r*.14,r*.75,c);}circle(g,0,0,r*.2,'#d1ad77');g.restore();}
function trunk(g,x,bottom,top,w,c){rect(g,x-w/2,top,w,bottom-top,c);for(let i=0;i<5;i++)rect(g,x-w*.4+i*w*.17,top+30+(i%2)*80,8,bottom-top-60,'#162d302b');}
export function drawRoomBackdrop(g,layout,v,t){
 const d=layout.design,depth=layout.minY,seed=[...layout.key].reduce((n,c)=>n+c.charCodeAt(0),0),cave=/caves|deep|depths|vault/.test(layout.key),space=d.motif.startsWith("orbit:"),night=/orbit|lanterns|observatory|rootcrown/.test(d.motif),coastal=/tide-shore|tide-town|tide-gate/.test(layout.key),dunes=/tide-dunes/.test(layout.key),highland=/tide-hunt|tide-cliffs/.test(layout.key);
 const grad=g.createLinearGradient(0,0,0,720);grad.addColorStop(0,d.sky[0]);grad.addColorStop(1,d.sky[1]);g.fillStyle=grad;g.fillRect(0,0,v.width,720);
 g.save();g.translate(-v.x*.16,-v.y*.12);
 if(space){for(let i=0;i<54;i++)rect(g,(i*137+seed*3)%layout.width,(i*71+seed)%900-180,2+i%3,2+i%3,i%5?'#d9e8ffaa':'#bd87ff');const x=layout.width*.18;circle(g,x,150,95,'#967ac3');g.save();g.translate(x,150);g.rotate(-.25);g.strokeStyle='#d8a6e78a';g.lineWidth=10;g.beginPath();g.ellipse(0,0,154,29,0,0,Math.PI*2);g.stroke();g.restore();}
 else if(night){for(let i=0;i<28;i++){const x=(i*137+seed*3)%Math.ceil(layout.width*1.2),y=(i*71+seed)%650-100;rect(g,x,y,2+i%2,2+i%2,'#dcebe0aa');}circle(g,layout.width*.48,-40,45,'#ecdfbf');circle(g,layout.width*.48+18,-48,39,d.sky[0]);}
 else if(!cave){circle(g,layout.width*.45,90,38,'#fff3bf88');for(let i=0;i<6;i++)rect(g,i*440,110+(i%4)*53,130,12,'#f0f2dd25');}
 if(coastal){rect(g,0,300,layout.width,600,'#6eabb5');rect(g,0,300,layout.width,5,'#c4decc');for(let i=0;i<16;i++)rect(g,(i*113+seed)%layout.width,330+i%7*53,35+i%4*14,2,'#c7e1d259');}
 const low=depth*.15-150;
 for(let i=0;i<Math.ceil(layout.width/250)+3;i++){
  const x=i*270,h=160+(i*97+seed)%300;if(x<v.x*.16-260||x>v.x*.16+v.width+260)continue;
  if(coastal){if(i%3===0){rect(g,x+15,277,125,23,d.rock+'66');rect(g,x+38,261,78,20,d.rock+'66');rect(g,x+58,252,40,12,d.rock+'66');}}
  else if(dunes){g.fillStyle='#b39b7955';g.beginPath();g.moveTo(x-200,720);g.lineTo(x-120,450+h/3);g.lineTo(x,420+h/3);g.lineTo(x+110,460+h/3);g.lineTo(x+260,720);g.fill();}
  else if(highland){g.fillStyle=d.rock+'66';g.beginPath();g.moveTo(x-180,800);g.lineTo(x-90,400-h/3);g.lineTo(x-35,400-h/3);g.lineTo(x,310-h/3);g.lineTo(x+70,390-h/3);g.lineTo(x+230,800);g.fill();}
  else if(space){if(i%3===0){circle(g,x,425+h/3,34+i%4*11,d.rock+'88');rect(g,x-28,418+h/3,54,5,d.trim+'44');}}
  else if(cave){rect(g,x,low,80,h,d.rock+'55');rect(g,x+10,low+h,35,70,d.rock+'44');rect(g,x+30,550-h,75,h+350,d.rock+'44');}
  else{g.fillStyle=d.rock+'55';g.beginPath();g.moveTo(x-200,680);g.lineTo(x,220+(i*31+seed)%180);g.lineTo(x+250,680);g.fill();trunk(g,x,800,low+120,35,d.rock+'55');circle(g,x,low+140,100,d.rock+'44');}
 }
 g.restore();
 // Weather stays decorative: no random state or gameplay effects.
 const weather=d.weather;
 for(let i=0;i<(weather==='rain'?22:8);i++){
  const x=((i*113+seed*7-v.x*.35+(weather==='rain'?t*25:t*7))%Math.ceil(v.width+80)+v.width+80)%(v.width+80)-40;
  const y=((i*79+seed-v.y*.25+t*(weather==='rain'?210:weather==='embers'?-21:13))%800+800)%800-40;
  if(weather==='rain')line(g,[[x,y],[x-8,y+32]],'#b4dfdc44',2);
  else if(weather==='mist'||weather==='smoke')rect(g,x,y,100+i%4*20,10,'#dae9e710');
  else rect(g,x,y,weather==='petals'?6:3,weather==='leaves'?7:3,weather==='embers'?'#f6b36a88':weather==='fireflies'?'#dceea8aa':weather==='stars'?'#d4e2e999':d.trim+'66');
 }
}
export function drawRoomSetpieces(g,layout,v,t){
 const d=layout.design,m=d.motif.split(':')[0],x=layout.width*.57,b=644,top=layout.minY+120,height=b-top;
 g.save();g.globalAlpha=.33;
 if(['oak','roots','fungus','amber','orchids'].includes(m)){
  trunk(g,x,b,top, m==='roots'?250:m==='oak'?115:190,m==='amber'?'#70503e':'#4e5b3f');
  for(let i=0;i<Math.ceil(height/180);i++){const y=b-i*180,side=i%2?-1:1;if(y<v.y-350||y>v.y+1100)continue;line(g,[[x,y-80],[x+side*180,y-150],[x+side*330,y-165]],d.rock,28);
   if(m==='orchids'){line(g,[[x+side*250,y-160],[x+side*260,y+30]],'#548463',5);for(let j=0;j<4;j++)circle(g,x+side*(220+j*18),y-40+j*12,13,['#c29bc7','#ebc4d5'][j%2]);}
   else if(m==='fungus'){rect(g,x+side*160-8,y-70,16,60,'#d3c69a');rect(g,x+side*160-55,y-91,110,22,'#bc7d87');rect(g,x+side*160-35,y-105,70,15,'#d49a9a');}
   else if(m==='amber'){circle(g,x+side*42,y-90,28,'#e1ac6888');circle(g,x+side*42,y-90,13,'#ffd087aa');}
   else{circle(g,x+side*230,y-170,75,d.rock);circle(g,x+side*300,y-180,48,d.trim+'77');}
  }
 }
 else if(m==='watchtower'){
  for(const dx of [-170,170])trunk(g,x+dx,b,top,24,'#6f5650');for(let y=b-120;y>top;y-=190){if(y<v.y-350||y>v.y+1100)continue;rect(g,x-220,y,440,16,'#967451');line(g,[[x-170,y],[x+170,y-175]],'#584d50',12);}rect(g,x-240,top-30,480,35,'#665969');for(let i=0;i<5;i++)rect(g,x-225+i*96,top-65,45,40,'#726274');
 }
 else if(['birchwater','waterfall','reservoir','sunwell'].includes(m)){
  const w=m==='waterfall'?260:m==='reservoir'?170:100;
  rect(g,x-w/2,top,w,height,'#7cbfca66');for(let i=0;i<10;i++)rect(g,x-w/2+i*w/10,top+((t*100+i*131)%Math.max(100,height)),5,100,'#d5f0e455');
  if(m==='birchwater')for(const dx of [-400,330]){trunk(g,x+dx,b,top,55,'#d2d5bd');for(let y=b-70;y>top;y-=90)rect(g,x+dx-22,y,30,10,'#657b71');}
  if(m==='reservoir'){for(const dx of [-270,270]){trunk(g,x+dx,b,top,45,'#8e8865');for(let y=b-80;y>top;y-=160)circle(g,x+dx,y,16,'#d9b95a');}}
  if(m==='sunwell'){g.strokeStyle='#e5d797';g.lineWidth=17;g.beginPath();g.arc(x,top+300,180,0,Math.PI*2);g.stroke();for(let i=0;i<8;i++){const a=i*Math.PI/4;line(g,[[x+Math.cos(a)*195,top+300+Math.sin(a)*195],[x+Math.cos(a)*230,top+300+Math.sin(a)*230]],'#e0d69f',9);}}
 }
 else if(['mine','quarry','chains','workshop','kilns'].includes(m)){
  const steel=m==='chains',smoke=m==='kilns';
  for(const dx of [-300,300]){trunk(g,x+dx,b,top,steel?18:26,steel?'#74818a':'#76644f');for(let y=b-60;y>top;y-=140)line(g,[[x+dx-8,y],[x-dx+8,y-120]],steel?'#7b8588':'#8a785f',7);}
  for(let y=b-180;y>top;y-=240){if(y<v.y-350||y>v.y+1100)continue;rect(g,x-350,y,700,18,'#7c6a53');if(m==='mine'){rect(g,x-100,y-65,180,45,'#736051');circle(g,x-60,y-15,19,'#373d49');circle(g,x+30,y-15,19,'#373d49');}if(m==='quarry'){for(let i=0;i<5;i++)rect(g,x-170+i*60,y-80-(i%2)*20,35,70,'#ae7853');}}
  if(steel){for(const dx of [-140,140])for(let y=top;y<b;y+=27){g.strokeStyle='#a4a391';g.lineWidth=5;g.strokeRect(x+dx-7,y,14,30);}gear(g,x,top+180,100,0,'#a39471');}
  if(smoke||m==='workshop'){for(const dx of [-190,40,230]){trunk(g,x+dx,b,top+100+(dx%3)*80,65,'#846655');rect(g,x+dx-40,top+80+(dx%3)*80,80,25,'#b59a7d');circle(g,x+dx,top+40+(dx%3)*80,55,'#8e8e9633');}rect(g,x-190,b-160,380,155,'#66534d');rect(g,x-125,b-120,250,120,'#d87b3e');rect(g,x-90,b-80,180,80,'#f6c475');}
 }
 else if(['crystal','cathedral','gate','rootcrown'].includes(m)){
  for(let i=0;i<5;i++){const xx=x-500+i*250,h=height*(.65+(i%3)*.1);trunk(g,xx,b,b-h,45,d.rock);rect(g,xx-40,b-h-22,80,25,d.trim);if(m==='crystal'){line(g,[[xx-30,b-h],[xx,b-h-130],[xx+40,b-h],[xx,b-h+40],[xx-30,b-h]],'#b9add9',8);}
   if(m==='cathedral')line(g,[[xx,b-h+30],[xx+125,b-h-120],[xx+250,b-h+30]],'#99aab1',14);
   if(m==='gate'||m==='rootcrown')line(g,[[xx,b-h],[xx+70,b-h-140],[xx+100,b-h+60]],m==='rootcrown'?'#b18e8b':'#a5b084',18);
  }
  if(m==='rootcrown'){circle(g,x,b-230,100,'#503349');circle(g,x,b-230,60,'#bb799a55');}
 }
 else if(['engine','clockvault'].includes(m)){for(let y=b-400;y>top+100;y-=500){if(y<v.y-350||y>v.y+1100)continue;gear(g,x,y,210,t*.025,'#a3946d');gear(g,x+280,y-160,100,-t*.05,'#858c8b');gear(g,x-270,y+190,125,-t*.04,'#8a7b65');}for(const dx of [-420,420])trunk(g,x+dx,b,top,55,'#4c5664');}
 else if(m==='ziggurat'){for(let i=0;i<8;i++){const w=1100-i*100;rect(g,x-w/2,b-i*150,w,130,d.rock);rect(g,x-w/2,b-i*150,w,14,d.trim);for(let j=0;j<5;j++)rect(g,x-w/2+30+j*w/5,b-i*150+30,25,25,'#b6a779');}circle(g,x,b-1150,65,'#ffe4a577');}
 else if(['ropeways','stiltmarket'].includes(m)){
  for(const dx of [-450,0,450])trunk(g,x+dx,b,top,30,'#5b684c');for(let y=b-190;y>top;y-=220){if(y<v.y-350||y>v.y+1100)continue;line(g,[[x-450,y-60],[x,y-10],[x+450,y-60]],'#c5b879',7);rect(g,x-450,y,900,12,'#8b7852');for(let xx=x-430;xx<x+450;xx+=40)line(g,[[xx,y],[xx,y-40-Math.abs(xx-x)*.04]],'#aa9b6a',3);if(m==='stiltmarket'){rect(g,x-120,y-120,240,120,'#8a9a70');rect(g,x-150,y-140,300,22,'#b6a469');rect(g,x-30,y-80,60,80,'#426555');}}
 }
 else if(m==='windmill'){trunk(g,x,b,top+100,150,'#b5ad8b');g.save();g.translate(x,top+200);g.rotate(t*.04);for(let i=0;i<4;i++){g.rotate(Math.PI/2);rect(g,-12,0,24,250,'#8b7350');rect(g,12,70,90,170,'#e5d1a0');}g.restore();}
 else if(m==='plaza'){for(const dx of [-400,400]){trunk(g,x+dx,b,top,100,'#8c9c96');rect(g,x+dx-70,top-40,140,35,'#c0bd9e');circle(g,x+dx,top+120,30,'#b7a174');}for(let y=b-160;y>top;y-=230){if(y<v.y-350||y>v.y+1100)continue;line(g,[[x-400,y],[x,y+50],[x+400,y]],'#b0a37d',3);for(let i=0;i<9;i++)rect(g,x-360+i*90,y+8+Math.sin(i/8*Math.PI)*40,30,40,['#9c705f','#8c9b79','#bead78'][i%3]);}}
 else if(m==='greenhouse'){for(let y=b-180;y>top;y-=230){if(y<v.y-350||y>v.y+1100)continue;rect(g,x-360,y-120,720,120,'#8bbcb644');line(g,[[x-400,y-120],[x,y-270],[x+400,y-120]],'#bbc7a2',9);for(let xx=x-320;xx<=x+320;xx+=80){line(g,[[xx,y],[xx,y-120]],'#b0b99c',5);rect(g,xx-23,y-55,46,45,['#85b6a5','#b29cbe','#bbc481'][(Math.floor(Math.abs(xx))%3)]);rect(g,xx-12,y-70,24,20,'#d4d1a8');}}}
 else if(m==='lanterns'){for(let y=b-180;y>top;y-=210){if(y<v.y-350||y>v.y+1100)continue;line(g,[[x-600,y],[x,y+40],[x+600,y]],'#6c635f',4);for(let i=0;i<10;i++){const xx=x-550+i*120,yy=y+Math.sin(i/9*Math.PI)*35;circle(g,xx,yy+20,25,'#f0cd7e18');rect(g,xx-10,yy,20,35,'#e6bd76');rect(g,xx-5,yy+7,10,20,'#fff0b4');}}}
 else if(m==='observatory'){for(let y=b-150;y>top;y-=250)rect(g,x-3,y,6,70,'#c9d6bc55');const yy=top+250;g.strokeStyle='#b6c8b9';g.lineWidth=12;g.beginPath();g.arc(x,yy,160,Math.PI,0);g.stroke();rect(g,x-160,yy,320,110,'#7d9695');rect(g,x-50,yy+40,100,70,'#243c59');}
 g.restore();
}
const GROUND_COLOURS={'tide-town':['#8d8969','#d0c099'],'tide-shore':['#a99677','#d5c79b'],'tide-marsh':['#64806b','#b7c18c'],'tide-dunes':['#aa8d6a','#dfc79b'],'tide-bramble':['#698b67','#bfcb8c'],'tide-hunt':['#7d8670','#c3c397'],'tide-cliffs':['#6f8193','#b9c4b6'],'tide-gate':['#7c867f','#d0c5a0'],depths:['#5c7087','#9caec4']};
export function drawRoomPlatform(g,p,design){const {motif}=design,colours=Object.entries(GROUND_COLOURS).find(([id])=>motif.includes(':'+id))?.[1],rock=colours?.[0]||design.rock,trim=colours?.[1]||design.trim,wood=/ropeways|stiltmarket|amber|fungus|workshop|windmill/.test(motif),face=wood?26:48;
 rect(g,p.x-2,p.y-2,p.w+4,face+8,PIXEL_STYLE.outline);rect(g,p.x,p.y,p.w,7,shade(trim,8));rect(g,p.x,p.y+7,p.w,5,trim);rect(g,p.x,p.y+12,p.w,face-8,rock);rect(g,p.x,p.y+face,p.w,p.id==='ground'?85:8,shade(rock,-25));
 for(let x=p.x+8;x<p.x+p.w;x+=wood?38:64){rect(g,x,p.y+16,wood?2:26,wood?13:3,shade(rock,22));if(!wood){rect(g,x+11,p.y+27,23,3,shade(rock,-20));rect(g,x+29,p.y+15,3,10,shade(rock,-13));}else rect(g,x+5,p.y+21,2,2,PIXEL_STYLE.outline);}
 if(!wood&&p.id!=='ground')for(let x=p.x+20;x<p.x+p.w;x+=101){rect(g,x,p.y+face+6,12,8+(x%17),shade(rock,-24));rect(g,x,p.y+face+6,3,6,shade(rock,6));}
 if(/oak|roots|orchid|fungus|birch|lantern|greenhouse/.test(motif))for(let x=p.x+13;x<p.x+p.w;x+=58){rect(g,x,p.y-6,3,6,trim);rect(g,x+4,p.y-10,3,10,shade(trim,-16));}
}
