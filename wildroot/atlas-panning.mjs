// Delegate to the stable panel root because room selection replaces the atlas DOM.
// Touch keeps the browser's native two-axis panning and pinch zoom.
export function installAtlasPanning(root){
 let gesture=null,suppressed=null;
 const finish=e=>{if(!gesture||e.pointerId!==gesture.id)return;const g=gesture;gesture=null;g.viewport.classList.remove('is-panning');if(g.dragged)suppressed=g.viewport;if(g.viewport.hasPointerCapture?.(g.id))g.viewport.releasePointerCapture(g.id);};
 root.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch'||e.button!==0||e.isPrimary===false||gesture)return;
  const viewport=e.target.closest('.atlas-scroll');if(!viewport||!root.contains(viewport))return;
  suppressed=null;gesture={viewport,id:e.pointerId,x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop,dragged:false};
 });
 root.addEventListener('pointermove',e=>{
  const g=gesture;if(!g||e.pointerId!==g.id)return;
  const dx=e.clientX-g.x,dy=e.clientY-g.y;
  if(!g.dragged&&Math.hypot(dx,dy)<6)return;
  if(!g.dragged){g.dragged=true;g.viewport.classList.add('is-panning');g.viewport.setPointerCapture(e.pointerId);}
  e.preventDefault();g.viewport.scrollLeft=g.left-dx;g.viewport.scrollTop=g.top-dy;
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])root.addEventListener(type,finish);
 root.addEventListener('click',e=>{
  if(e.detail===0)return; // Keyboard activation stays available after panning.
  if(suppressed?.contains(e.target)){suppressed=null;e.preventDefault();e.stopImmediatePropagation();}
 },true);
 root.addEventListener('dragstart',e=>{if(e.target.closest('.atlas-scroll'))e.preventDefault();});
}
