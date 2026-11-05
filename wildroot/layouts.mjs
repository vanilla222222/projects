// Authored room profiles. Upper platforms connect directly to the ground for reliable tap navigation.
export const GROUND=644;
const D={
'forest-0':[2560,'Oakside Clearing',[[180,410,462],[730,440,342],[1430,470,480],[2010,350,358]],[[425,644]],{mage:[270,644]},[['log',1240,320],['pond',1790,240]]],
'forest-1':[2940,'Briar Watch',[[290,490,510],[940,400,350],[1530,600,438],[2360,360,300]],[[830,644]],{},[['thorns',1280,300],['watch',2110,160]]],
'forest-2':[2720,'Birchwater Banks',[[220,520,420],[900,580,510],[1640,350,305],[2180,360,450]],[[630,420]],{},[['birches',1360,400],['pond',2020,180]]],
'forest-3':[3180,'Lantern Pilgrimage',[[340,410,475],[1000,520,330],[1740,420,490],[2440,520,375]],[[1370,330]],{},[['lanterns',840,850],['shrine',2570,220]],{'secret-sunwell':[2850,375]}],
'forest-4':[3540,'The Elder’s Roots',[[240,560,490],[990,430,355],[1660,620,430],[2520,460,285],[3130,250,470]],[[910,644],[2120,430]],{},[['elder',1830,480],['roots',2990,290]],{'portal-tree':[1850,430],'portal-tree-summit':[2180,430]}],
'caves-0':[2640,'Copper Timberworks',[[260,440,500],[850,550,350],[1570,480,460],[2200,270,295]],[[430,644]],{warrior:[270,644]},[['timbers',1250,350],['crystals',2080,260]]],
'caves-1':[3090,'Abandoned Cartway',[[200,390,370],[780,600,490],[1580,520,310],[2320,550,455]],[[1180,490]],{},[['cart',1460,160],['orewall',2300,380]]],
'caves-2':[3460,'Resonance Hall',[[300,500,470],[1010,440,300],[1660,650,410],[2550,620,342]],[[2190,410]],{},[['gong',1530,220],['crystals',2360,420]],{'portal-deep-return':[3000,342]}],
'deep-0':[2920,'Iron Cathedral',[[260,560,435],[1030,390,285],[1620,570,495],[2380,350,355]],[[720,435]],{},[['arches',1320,420],['orewall',2150,330]]],
'deep-1':[3370,'Suspended Works',[[260,430,500],[920,520,340],[1640,430,450],[2280,700,280]],[[1280,340]],{},[['hoist',1550,390],['bridge',2390,500]]],
'deep-2':[3200,'Gilded Reservoir',[[220,500,320],[920,550,470],[1670,390,350],[2300,630,495]],[[1880,350]],{},[['goldpillars',1580,540],['pool',2390,440]]],
'deep-3':[3800,'The Sealed Engine',[[300,590,470],[1100,500,305],[1810,650,435],[2660,430,285],[3280,340,460]],[[950,644],[2360,435]],{},[['sentinel',1900,350],['forgedoor',3060,270]],{'secret-vault':[3440,460]}],
'jungle-0':[3160,'Ropeway Canopy',[[280,610,480],[1110,470,320],[1780,550,440],[2500,410,280]],[[790,480]],{},[['ropebridge',1170,800],['vines',2410,340]]],
'jungle-1':[3520,'Rainfall Basin',[[310,430,350],[940,620,500],[1760,480,305],[2470,680,430]],[[1420,500]],{},[['pond',850,460],['waterfall',2250,340]]],
'jungle-2':[3340,'High Sun Steps',[[250,500,495],[930,400,405],[1510,540,310],[2240,780,240]],[[1940,310]],{},[['steps',1370,640],['totem',2880,190]]],
'jungle-3':[3680,'Orchid Ruins',[[290,550,440],[1060,560,295],[1850,470,485],[2520,750,365]],[[2220,485]],{},[['orchids',930,600],['ruins',2520,560]]],
'town-0':[2300,'Village Green',[[350,500,470],[1030,430,350],[1660,430,342]],[],{steward:[1510,644]},[['market',770,560],['well',1630,160]],{'portal-town-square':[1940,342],shop:[1100,644]}],
'town-1':[2100,'Hammer Street',[[280,450,455],[980,600,335],[1720,220,490]],[],{blacksmith:[760,644]},[['workshops',620,550],['chimneys',1630,300]],{station:[1390,644]}],
'town-2':[2420,'The Furnace Yard',[[270,420,510],[900,480,360],[1630,530,460]],[],{},[['chimneys',900,550],['orepiles',2080,220]],{station:[1520,644]}],
'town-3':[3060,'Legacy Square',[[330,460,450],[1040,520,325],[1840,440,470],[2530,330,350]],[],{},[['flags',1000,700],['fountain',1670,180]],{arena:[2350,644],stamps:[650,644],statues:[1330,644],tasks:[1990,644],'world-gate':[2700,644]}],
'jungle-town-0':[2700,'Canopy Market',[[330,450,460],[1040,550,300],[1810,520,425]],[],{enchanter:[810,644]},[['canopyhouses',620,780],['vines',2360,220]],{shop:[1200,644],station:[1700,644]}],
'jungle-town-1':[2460,'The Alchemist’s Garden',[[240,430,335],[900,530,470],[1690,510,310]],[],{alchemist:[850,644]},[['garden',660,660],['pond',1940,300]],{station:[1510,644]}],
'jungle-town-2':[2800,'Rootbound Approach',[[300,600,465],[1110,430,290],[1750,620,400]],[],{},[['roots',1200,600],['ruins',2220,400]]],
sunwell:[2120,'The Hidden Sunwell',[[260,440,460],[910,500,320],[1580,330,450]],[],{},[['spring',1050,550],['shrine',1740,230]]],
vault:[2460,'The Forgotten Vault',[[300,480,485],[1010,580,330],[1830,370,440]],[],{},[['forgedoor',960,350],['hoist',1960,260]]],
boss:[3240,'Heart of the Rootwarden',[[390,510,435],[1190,470,305],[1930,500,465],[2680,350,350]],[],{},[['elder',2390,650],['roots',1480,500],['ruins',2870,220]]]
};
for(let zone=0;zone<3;zone++){const upper=Array.from({length:10+zone*2},(_,i)=>[i%2?850:350,1000,GROUND-(i+1)*180]);D['tree-'+zone]=[2200,['Rootspire Ascent','Heartwood Stair','Crown Observatory'][zone],upper,[[700,upper[2][2]]],{},[['elder',1100,600],['vines',1650,400]],{'portal-left':[65,GROUND],'portal-right':[1760,upper.at(-1)[2]],...(zone===2?{telescope:[1450,upper.at(-1)[2]]}:{})}];}
export const ROOM_KEYS=Object.keys(D);
export function roomLayout(area,index,boss=false,secret=null){const key=boss?'boss':secret||`${area}-${index}`,d=D[key];if(!d)throw Error('Unknown room '+key);const[width,title,upper,resources,npcs,landmarks,points={}]=d,platforms=[{id:'ground',x:0,w:width,y:GROUND},...upper.map(([x,w,y],i)=>({id:'shelf-'+i,x,w,y}))],ladders=platforms.slice(1).map((p,i)=>({id:'ladder-'+i,x:area==='tree'?1000+(i%3)*100:p.x+p.w*(i%2?.62:.42),top:p.y,bottom:area==='tree'&&i>0?platforms[i].y:GROUND,from:area==='tree'&&i>0?platforms[i].id:'ground',platform:p.id}));let spawns=[.28,.44,.65,.84].map(t=>({x:Math.round(width*t),y:GROUND})).concat(upper.map(([x,w,y])=>({x:x+w*.65,y})));if(key==='forest-0')spawns=[{x:700,y:GROUND},{x:940,y:GROUND},{x:1110,y:GROUND},{x:490,y:462},{x:840,y:342},{x:1620,y:480},{x:2140,y:GROUND},{x:2200,y:358}];if(boss||secret)spawns=[{x:boss?2390:secret==='sunwell'?1490:1740,y:GROUND}];const cave=['caves','deep'].includes(area)||secret==='vault',jungle=area.includes('jungle');return{key,width,title,minY:area==='tree'?upper.at(-1)[2]-230:0,height:area==='tree'?GROUND-upper.at(-1)[2]+306:720,platforms,ladders,resources:resources.map(([x,y])=>({x,y})),npcs,points,landmarks,spawns,sky:cave?['#18243b','#3f5b68']:jungle?['#4c92a5','#9ec6aa']:['#79b8d7','#d6e8b7']};}
export function pointFor(layout,id){if(id==='portal-left')return{x:65,y:GROUND};if(layout.points[id])return{x:layout.points[id][0],y:layout.points[id][1]};if(id==='portal-right')return{x:layout.width-70,y:GROUND};if(id==='storage')return{x:160,y:GROUND};const p=layout.points[id]||layout.npcs[id.replace('npc-','')];return p?{x:p[0],y:p[1]}:{x:layout.width*.6,y:GROUND};}
