import {seedKill,seedStory} from './test-fixtures.mjs?v=38';
import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import * as E from './engine.mjs?v=38';import * as D from './content.mjs?v=38';
import {roomLayout,ROOM_KEYS,GROUND} from './layouts.mjs?v=38';import {ROOM_DESIGNS} from './room-designs.mjs?v=38';
import {World,createMap} from './world.mjs?v=38';import {drawWorld,viewFor} from './scene.mjs?v=38';
const rooms=()=>[...D.AREAS.flatMap(a=>a.zones.map((_,zone)=>({area:a.id,zone}))),...Object.entries(D.SECRETS).map(([secret,d])=>({area:d.area,zone:d.zone,secret})),{area:'jungle-town',zone:2,boss:true}];
function setup(r){const s=E.freshSave();for(const a of D.AREAS)for(let i=0;i<a.zones.length;i++)seedKill(s,a.id+'-'+i,12);s.storyFlags.bossPermit=true;s.stars.unlocked=true;s.secretUnlocks=['sunwell'];const c=E.selected(s);Object.assign(c,{area:r.area,zone:r.zone,secret:r.secret||null,activity:r.boss?'boss':'rest'});return{s,c,w:new World(s,{rng:()=>.5})};}
const tick=(w,seconds)=>{for(let i=0;i<seconds*50;i++)w.step(.02);};
test('All 29 rooms have their own art direction, colours and authored vertical silhouettes',()=>{
 const moods=new Set(),motifs=new Set(),colours=new Set();assert.equal(Object.keys(ROOM_DESIGNS).length,29);for(const r of rooms()){const m=createMap(r.area,r.zone,r.boss,r.secret),d=m.layout.design;moods.add(d.mood);motifs.add(d.motif);colours.add(d.sky.join());assert.ok(m.minY<0,m.layout.key);assert.ok(m.height>900,m.layout.key);assert.ok(m.platforms.some(p=>p.y<0),m.layout.key);}assert.equal(moods.size,29);assert.equal(motifs.size,29);assert.equal(colours.size,29);
});
test('Combat route exits require real climbs and remain connected to reciprocal arrivals',()=>{
 for(const r of rooms().filter(r=>ROOM_DESIGNS[r.secret||(r.boss?'boss':r.area+'-'+r.zone)].exit)){const{s,c,w}=setup(r),exit=w.map.portals.find(p=>p.id==='portal-right');assert.ok(exit.y<0,w.map.layout.key);w.select(exit.id);tick(w,55);assert.notEqual(c.area+'-'+c.zone,r.area+'-'+r.zone,w.map.layout.key);assert.equal(s.visited[c.area+'-'+c.zone],true);}
});
test('Every non-boss room rewards physically surveying its highest route once without deleting overflow',()=>{
 for(const r of rooms().filter(r=>!r.boss)){const{s,c,w}=setup(r),point=E.surveyPoint(w.map.layout),marker=w.map.facilities.find(e=>e.kind==='survey');assert.deepEqual({x:marker.x,y:marker.y},point);assert.equal(E.claimSurvey(s,c),false);w.walkTo(point.x,point.y);tick(w,55);assert.ok(Math.abs(w.player.x-point.x)<12,w.map.layout.key);const coins=s.coins,result=E.claimSurvey(s,c);assert.ok(result,w.map.layout.key);assert.equal(s.coins,coins+result.coins);assert.equal(c.bag[result.id],result.count);assert.equal(E.claimSurvey(s,c),false);assert.doesNotThrow(()=>E.restoreSave(JSON.parse(JSON.stringify(s))));}
});
test('Vertical cameras follow the actual new ascents on desktop and phone aspect ratios',()=>{
 for(const r of rooms()){const{s,c,w}=setup(r),top=w.map.platforms.reduce((a,b)=>b.y<a.y?b:a);w.player.y=top.y;for(const canvas of [{clientWidth:1280,clientHeight:720},{clientWidth:390,clientHeight:600},{clientWidth:844,clientHeight:390}]){const v=viewFor(canvas,w.player);assert.ok(v.y<0,w.map.layout.key);assert.ok(w.player.y-v.y>0);assert.ok(w.player.y-v.y<720);assert.ok(v.x>=0);}}
});
test('All rooms render finite, distinct scenery at ground and summit with balanced canvas state',()=>{
 const signatures=new Set();globalThis.devicePixelRatio=1;
 for(const r of rooms()){const{s,c,w}=setup(r),commands=[];let saves=0;const context=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get(o,k){if(k in o)return o[k];if(k==='save')return()=>{saves++;};if(k==='restore')return()=>{saves--;assert.ok(saves>=0);};return(...args)=>{for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a),w.map.layout.key+'/'+String(k));if(k==='fillRect')commands.push([o.fillStyle,...args]);};},set(o,k,v){if(k==='fillStyle')assert.ok(typeof v==='string'||typeof v?.addColorStop==='function',w.map.layout.key);o[k]=v;return true;}}),canvas={clientWidth:1000,clientHeight:600,getContext:()=>context};drawWorld(canvas,w,5,true);assert.equal(saves,0);signatures.add(createHash('sha256').update(JSON.stringify(commands)).digest('hex'));w.player.y=Math.min(...w.map.platforms.map(p=>p.y));drawWorld(canvas,w,7,false);assert.equal(saves,0);assert.ok(commands.length<10000,w.map.layout.key+' excessive scenery');}
 assert.equal(signatures.size,29);delete globalThis.devicePixelRatio;
});
test('Invalid survey keys cannot enter saves and late old coordinates keep a safe supported floor',()=>{
 const{s,c,w}=setup({area:'deep',zone:3});s.surveys=['deep-99'];assert.throws(()=>E.validate(s));s.surveys=[];c.position={x:2900,y:644};const loaded=new World(E.restoreSave(JSON.parse(JSON.stringify(s))));assert.equal(loaded.player.y,GROUND);assert.ok(loaded.map.platforms.some(p=>p.y===loaded.player.y&&loaded.player.x>=p.x&&loaded.player.x<=p.x+p.w));
});
