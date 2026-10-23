'use strict';
const assert = require('node:assert/strict');
const {pkDecayRemaining,pkDecayCurve,pkDecayCsv,createPKDecayView} = require('../js/pk-decay.js');
assert.equal(pkDecayRemaining(0,2),100);
assert.ok(Math.abs(pkDecayRemaining(2,2)-50)<1e-12);
assert.ok(Math.abs(pkDecayRemaining(8,2)-6.25)<1e-12);
const curve = pkDecayCurve({halfLifeHours:2,intervalHours:[1,4],horizonHalfLives:4,points:5});
assert.equal(curve.endHours,8);
assert.equal(curve.rows.length,5);
assert.ok(curve.rows.every((row,i)=>row.lowerPercent<=row.remainingPercent&&row.remainingPercent<=row.upperPercent&&(!i||row.remainingPercent<=curve.rows[i-1].remainingPercent)));
assert.equal(curve.rows[1].lowerPercent,25);
assert.ok(Math.abs(curve.rows[1].upperPercent-100*Math.SQRT1_2)<1e-12);
for(const invalid of [{halfLifeHours:0},{halfLifeHours:Infinity},{halfLifeHours:2,intervalHours:[3,4]},{halfLifeHours:2,horizonHalfLives:Infinity}])assert.throws(()=>pkDecayCurve(invalid));
assert.throws(()=>pkDecayRemaining(-1,2));
assert.ok(pkDecayCsv(curve,{subjectLabel:'=example'}).includes("'=example"));
assert.ok(pkDecayCsv(curve,{}).includes('not subjective effect strength'));
// A subject change or invalid estimate must not retain the previous curve.
const doc={createElement:tag=>node(tag),createElementNS:(_,tag)=>node(tag)};
function node(tag){return {tagName:tag,ownerDocument:doc,children:[],style:{},attrs:{},events:{},append(...ns){this.children.push(...ns);},appendChild(n){this.children.push(n);return n;},replaceChildren(...ns){this.children=ns;},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},addEventListener(k,v){this.events[k]=v;}};}
const host=node('div'),view=createPKDecayView(host);
assert.equal(view.getData(),null);
assert.equal(view.setEstimate({halfLifeHours:2,subjectKey:'one',subjectLabel:'First'}),true);
assert.equal(view.getData().metadata.subjectKey,'one');
assert.equal(view.setEstimate({halfLifeHours:-1,subjectKey:'two'}),false);
assert.equal(view.getData(),null);
assert.equal(view.csv(),'');
view.setEstimate({halfLifeHours:3,subjectKey:'two'});view.clear();assert.equal(view.getData(),null);
console.log('PK decay: focused formula, interval, input and export checks passed.');
