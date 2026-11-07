const clamp=value=>Math.max(.2,Math.min(2,value));
export function zoomAnchor(left,top,x,y,oldZoom,newZoom){return{left:(left+x)/oldZoom*newZoom-x,top:(top+y)/oldZoom*newZoom-y};}
export function installAtlasZoom(root){
 let zoom=1;
 const parts=()=>{const viewport=root.querySelector('.atlas-scroll'),map=viewport?.querySelector('.world-atlas'),canvas=viewport?.querySelector('.atlas-canvas');return viewport&&map&&canvas?{viewport,map,canvas}:null;};
 const dimensions=p=>({width:Number(p.map.dataset.mapWidth)||1240,height:Number(p.map.dataset.mapHeight)||1100});
 function apply(p,next,x=p.viewport.clientWidth/2,y=p.viewport.clientHeight/2){const old=zoom,anchor=zoomAnchor(p.viewport.scrollLeft,p.viewport.scrollTop,x,y,old,clamp(next));zoom=clamp(next);const size=dimensions(p);p.canvas.style.width=size.width*zoom+'px';p.canvas.style.height=size.height*zoom+'px';p.map.style.transform=`scale(${zoom})`;p.viewport.scrollLeft=anchor.left;p.viewport.scrollTop=anchor.top;root.querySelectorAll('[data-map-zoom-value]').forEach(el=>{el.textContent=Math.round(zoom*100)+'%';});root.querySelectorAll('[data-map-zoom]').forEach(el=>{el.disabled=el.dataset.mapZoom==='out'?zoom<=.2:el.dataset.mapZoom==='in'?zoom>=2:false;});}
 function refresh(center=true){const p=parts();if(!p)return;apply(p,zoom);if(center){const pin=p.map.querySelector('.atlas-node.selected');if(pin){p.viewport.scrollLeft=pin.offsetLeft*zoom-p.viewport.clientWidth/2;p.viewport.scrollTop=pin.offsetTop*zoom-p.viewport.clientHeight/2;}}}
 root.addEventListener('click',e=>{const button=e.target.closest('[data-map-zoom]');if(!button)return;const p=parts();if(!p)return;const mode=button.dataset.mapZoom,size=dimensions(p);apply(p,mode==='in'?zoom+.15:mode==='out'?zoom-.15:mode==='fit'?Math.min((p.viewport.clientWidth-16)/size.width,(p.viewport.clientHeight-16)/size.height):1);if(mode==='fit'){p.viewport.scrollLeft=0;p.viewport.scrollTop=0;}});
 root.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;const p=parts();if(!p||!p.viewport.contains(e.target))return;e.preventDefault();const rect=p.viewport.getBoundingClientRect();apply(p,zoom*(e.deltaY<0?1.12:1/1.12),e.clientX-rect.left,e.clientY-rect.top);},{passive:false});
 return{refresh,get zoom(){return zoom;}};
}
