'use strict';
(function(root){
 function utf8(s){const escaped=encodeURIComponent(String(s));const out=[];for(let i=0;i<escaped.length;i++){if(escaped[i]==='%'){out.push(parseInt(escaped.slice(i+1,i+3),16));i+=2;}else out.push(escaped.charCodeAt(i));}return Uint8Array.from(out);}
 function crc32(data){let c=0xffffffff;for(const b of data){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
 const u16=x=>[x&255,(x>>>8)&255],u32=x=>[x&255,(x>>>8)&255,(x>>>16)&255,(x>>>24)&255];
 function join(parts){let len=0;for(const p of parts)len+=p.length;const out=new Uint8Array(len);let off=0;for(const p of parts){out.set(p,off);off+=p.length;}return out;}
 function makeZip(files){if(!files.length)throw Error('ZIP requires files');const local=[],directory=[];let offset=0;
  for(const file of files){const name=String(file.name||'');if(!name||name.includes('..')||name.includes('/')||name.includes('\\'))throw Error('Invalid ZIP filename');
   const nameBytes=utf8(name),data=typeof file.content==='string'?utf8(file.content):file.content;
   if(!(data instanceof Uint8Array))throw Error('Expected bytes or string');
   const crc=crc32(data),size=data.length;
   const head=Uint8Array.from([...u32(0x04034b50),...u16(20),...u16(0x800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(size),...u32(size),...u16(nameBytes.length),...u16(0)]);
   local.push(head,nameBytes,data);
   directory.push(Uint8Array.from([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(size),...u32(size),...u16(nameBytes.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset)]),nameBytes);
   offset+=head.length+nameBytes.length+data.length;
  }
  const central=join(directory),end=Uint8Array.from([...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(central.length),...u32(offset),...u16(0)]);
  return join([...local,central,end]);
 }
 const api={utf8,crc32,makeZip};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ResearchZip=api;
})(typeof globalThis!=='undefined'?globalThis:this);
