import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from './engine.mjs?v=45';
import {crafting,map} from './ui-panels.mjs?v=58';
import {roomPreparation} from './route-preparation.mjs?v=50';
import {itemSources} from './item-sources.mjs';

test('Ingredient sources link to resource rooms, enemy rooms and recipes',()=>{
 const s=E.freshSave(),c=E.selected(s);
 assert.ok(itemSources('wrecklight-koi').some(x=>x.room==='void-reef:1'));
 assert.ok(itemSources('pattern-ravine-axe').some(x=>x.room==='void-watch:1'));
 assert.ok(itemSources('null-bar').some(x=>x.recipe==='null-bar'));
 const html=crafting(s,c,false,{recipe:'blade'});
 assert.match(html,/Ingredient sources/);
 assert.match(html,/data-open-recipe="copper-bar"/);
});

test('Atlas exits distinguish local walking from opening another room’s atlas entry',()=>{
 const s=E.freshSave(),c=E.selected(s);
 assert.match(map(s,c,{mapRoom:'forest:0'}),/data-walk-portal="portal-left"/);
 assert.doesNotMatch(map(s,c,{mapRoom:'forest:1'}),/data-walk-portal=/);
 assert.match(map(s,c,{mapRoom:'forest:1'}),/SHOW ROOM/);
 assert.match(map(s,c,{mapRoom:'void-quarry:0'}),/Defeat the Eventide Colossus/);
 assert.ok(roomPreparation(s,c,'void-fragments',0).upgrades.some(u=>u.id==='null-sword'));
});
