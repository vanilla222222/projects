// Short-lived feedback only; damage is resolved by World, never by these drawings.
export function drawAttackEffects(g,effects,reducedMotion=false){
 for(const f of effects||[]){const progress=1-f.life/f.total,calling=f.calling,color={warrior:'#ffe5a3',mage:'#a4e8ff',blacksmith:'#ffc18c',enchanter:'#d4b1ff',alchemist:'#bce89a'}[calling]||'#fff1ba';g.save();g.globalAlpha=Math.min(1,f.life*5);g.strokeStyle=color;g.fillStyle=color;g.lineWidth=f.skill?6:3;g.beginPath();
  if(calling==='mage'){g.moveTo(f.x,f.y);g.lineTo(f.toX,f.toY);g.stroke();const t=reducedMotion?1:Math.min(1,progress*2);g.fillRect(f.x+(f.toX-f.x)*t-4,f.y+(f.toY-f.y)*t-4,8,8);}
  else if(calling==='blacksmith'){g.moveTo(f.toX-22,f.toY-70);g.lineTo(f.toX,f.toY);g.lineTo(f.toX+22,f.toY-10);g.stroke();g.beginPath();g.ellipse(f.toX,f.toY+35,30,10,0,0,Math.PI*2);g.stroke();}
  else if(calling==='enchanter'){g.arc(f.toX,f.toY,22,0,Math.PI*2);g.moveTo(f.toX,f.toY-32);g.lineTo(f.toX+32,f.toY);g.lineTo(f.toX,f.toY+32);g.lineTo(f.toX-32,f.toY);g.closePath();g.stroke();}
  else if(calling==='alchemist'){g.arc(f.toX,f.toY,18+(reducedMotion?8:progress*20),0,Math.PI*2);g.stroke();for(const [x,y]of [[-19,-18],[20,-6],[-6,22]])g.fillRect(f.toX+x,f.toY+y,5,5);}
  else{g.arc(f.toX,f.toY,calling==='warrior'?42:27,-1.4,1.2);g.stroke();}g.restore();
 }
}

export function bossHudLayout(width){return{top:width<800?115:25,width:Math.min(390,width-40)};}
