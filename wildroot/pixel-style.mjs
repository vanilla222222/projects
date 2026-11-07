// Shared visual grammar for inventory, actors and scenery. All art is original.
export const PIXEL_STYLE={outline:'#24383c',light:'#f1e4bd',shadow:'#304a43',earth:'#9e744e',leaf:'#71976a',water:'#78adbe'};
export const shade=(hex,n)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(hex.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('');
export function finishSprite(pixels,width,height,{outline=true,description=''}={}){
 const source=[...pixels];if(outline)for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(!source[y*width+x]&&[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(([a,b])=>a>=0&&a<width&&b>=0&&b<height&&source[b*width+a]))pixels[y*width+x]=PIXEL_STYLE.outline;
 const runs=[];for(let y=0;y<height;y++)for(let x=0;x<width;){const color=pixels[y*width+x];let end=x+1;while(end<width&&pixels[y*width+end]===color)end++;if(color)runs.push({x,y,w:end-x,color});x=end;}
 const rects=[],previous=new Map();for(const run of runs){const key=run.x+'/'+run.w+'/'+run.color,prior=previous.get(key);if(prior&&prior.y+prior.h===run.y)prior.h++;else{const rect={...run,h:1};rects.push(rect);previous.set(key,rect);}}
 return{pixels,runs,rects,width,height,description};
}
export function spritePainter(width,height,palette){const pixels=Array(width*height).fill(null),r=(x,y,w,h,k)=>{for(let yy=Math.max(0,Math.round(y));yy<Math.min(height,Math.round(y+h));yy++)for(let xx=Math.max(0,Math.round(x));xx<Math.min(width,Math.round(x+w));xx++)pixels[yy*width+xx]=palette[k]||k;},line=(x,y,a,b,k,w=1)=>{const n=Math.max(Math.abs(a-x),Math.abs(b-y));for(let i=0;i<=n;i++)r(Math.round(x+(a-x)*i/(n||1)),Math.round(y+(b-y)*i/(n||1)),w,w,k);},oval=(x,y,rx,ry,k)=>{for(let yy=Math.floor(y-ry);yy<=y+ry;yy++)for(let xx=Math.floor(x-rx);xx<=x+rx;xx++)if(((xx-x)/rx)**2+((yy-y)/ry)**2<=1)r(xx,yy,1,1,k);};return{pixels,r,line,oval};}
export function drawSprite(g,s,x,y,scale=1){
 if(!s)return;g.save();g.translate(Math.round(x),Math.round(y));g.scale(scale,scale);
 if((typeof OffscreenCanvas!=='undefined'||typeof document!=='undefined')&&typeof g.drawImage==='function'){if(!s.bitmap){s.bitmap=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(s.width,s.height):document.createElement('canvas');s.bitmap.width=s.width;s.bitmap.height=s.height;const ctx=s.bitmap.getContext('2d');for(const p of s.rects||s.runs){ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.w,p.h||1);}}g.imageSmoothingEnabled=false;g.drawImage(s.bitmap,0,0);}else for(const p of s.rects||s.runs){g.fillStyle=p.color;g.fillRect(p.x,p.y,p.w,p.h||1);}
 g.restore();
}
export function spriteSvg(s,cls='',attributes=''){if(!s.url){const raw=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s.width} ${s.height}" shape-rendering="crispEdges">${(s.rects||s.runs).map(p=>`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h||1}" fill="${p.color}"/>`).join('')}</svg>`;s.url='data:image/svg+xml;base64,'+btoa(raw);}return`<svg class="${String(cls).replace(/[^a-zA-Z0-9 _-]/g,'')}" viewBox="0 0 ${s.width} ${s.height}" shape-rendering="crispEdges" aria-hidden="true" ${attributes}><image width="${s.width}" height="${s.height}" href="${s.url}" style="image-rendering:pixelated"/></svg>`;}
