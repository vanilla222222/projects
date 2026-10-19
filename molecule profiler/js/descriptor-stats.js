'use strict';
// Descriptive statistics for existing physicochemical descriptors only.
(function(root){
 const METRICS=[
  {key:'mw',label:'Molecular weight',unit:'g/mol',source:'d'},
  {key:'tpsa',label:'TPSA',unit:'Å²',source:'d'},
  {key:'logp',label:'WLOGP (estimate)',unit:'log10',source:'d'},
  {key:'logS',label:'Aqueous log S (estimate)',unit:'log10 mol/L',source:'v'},
  {key:'hbdStrict',label:'H-bond donors',unit:'count',source:'d'},
  {key:'hbaStrict',label:'H-bond acceptors',unit:'count',source:'d'},
  {key:'rings',label:'Ring count',unit:'count',source:'d'}
 ];
 function histogram(records,key,bins=12){
  const metric=METRICS.find(x=>x.key===key)||METRICS[0],n=Math.max(2,Math.min(40,Math.floor(bins)||12));
  const values=(Array.isArray(records)?records:[]).map(r=>(r&&r[metric.source]||{})[metric.key]).filter(x=>typeof x==='number'&&Number.isFinite(x)).sort((a,b)=>a-b);
  const missing=(Array.isArray(records)?records.length:0)-values.length;
  if(!values.length)return {metric,bins:[],count:0,missing,min:null,max:null,mean:null,median:null};
  const min=values[0],max=values[values.length-1],delta=max-min,step=delta>0?delta/n:1;
  const bars=Array.from({length:n},(_,i)=>({from:min+i*step,to:min+(i+1)*step,count:0}));
  values.forEach(v=>bars[Math.min(n-1,Math.floor((v-min)/step))].count++);
  const mean=values.reduce((a,b)=>a+b,0)/values.length;
  const median=values.length%2?values[(values.length-1)/2]:(values[values.length/2-1]+values[values.length/2])/2;
  return {metric,bins:bars,count:values.length,missing,min,max,mean,median};
 }
 const api={METRICS,histogram};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.DescriptorStats=api;
})(typeof globalThis!=='undefined'?globalThis:this);
