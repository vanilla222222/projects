'use strict';
(function(){
 const section=document.getElementById('descriptor-distributions');if(!section)return;
 const select=document.getElementById('distribution-metric');
 for(const metric of DescriptorStats.METRICS){const op=document.createElement('option');op.value=metric.key;op.textContent=metric.label;select.appendChild(op);}
 function draw(){
  const list=typeof records!=='undefined'&&Array.isArray(records)?records:[];
  const result=DescriptorStats.histogram(list,select.value,12),host=document.getElementById('distribution-plot');
  host.replaceChildren();
  const summary=document.getElementById('distribution-summary');
  summary.textContent=result.count+' valid of '+list.length+' molecules · '+result.missing+' missing'+(result.count?' · minimum '+result.min.toFixed(2)+' · median '+result.median.toFixed(2)+' · mean '+result.mean.toFixed(2)+' · maximum '+result.max.toFixed(2):'');
  if(!result.count){host.textContent='Analyze molecules to view a descriptor distribution.';return;}
  const width=760,height=225,left=53,right=15,top=16,bottom=48,innerW=width-left-right,innerH=height-top-bottom;
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 760 225');svg.setAttribute('role','img');
  svg.setAttribute('aria-label',result.metric.label+' histogram of '+result.count+' molecules');
  const add=(tag,attrs,text)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(text!=null)e.textContent=text;svg.appendChild(e);return e;};
  const maxCount=Math.max(1,...result.bins.map(x=>x.count));
  add('line',{x1:left,y1:top+innerH,x2:width-right,y2:top+innerH,stroke:'currentColor','stroke-opacity':'.5'});
  result.bins.forEach((bar,i)=>{const x=left+i*innerW/result.bins.length+2,bw=innerW/result.bins.length-4,bh=bar.count/maxCount*(innerH-10);
   const rect=add('rect',{x,y:top+innerH-bh,width:bw,height:Math.max(0,bh),rx:2,fill:'currentColor','fill-opacity':'.6'});
   const title=document.createElementNS(ns,'title');title.textContent=bar.from.toFixed(2)+' to '+bar.to.toFixed(2)+': '+bar.count+' molecules';rect.appendChild(title);
  });
  add('text',{x:left,y:height-24,fill:'currentColor','font-size':'13'},result.min.toFixed(2));
  add('text',{x:width-right,y:height-24,fill:'currentColor','font-size':'13','text-anchor':'end'},result.max.toFixed(2));
  add('text',{x:(left+width-right)/2,y:height-5,fill:'currentColor','font-size':'12','text-anchor':'middle'},result.metric.label+(result.metric.unit?' ('+result.metric.unit+')':''));
  add('text',{x:left-10,y:top+10,fill:'currentColor','font-size':'12','text-anchor':'end'},String(maxCount));
  add('text',{x:left-10,y:top+innerH,fill:'currentColor','font-size':'12','text-anchor':'end'},'0');
  host.appendChild(svg);
 }
 select.addEventListener('change',draw);
 document.addEventListener('molecule-profiler:updated',draw);
 draw();
})();
