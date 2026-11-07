import * as D from './content.mjs?v=45';
import * as E from './engine.mjs?v=45';
// Estimates use a copy of the character; inspecting a room never changes an assignment.
export function roomPreparation(s,c,area,zone){
 const enemy=D.zoneEnemy(area,zone);if(!enemy)return null;
 const probe={...c,area,zone,activity:'fight',secret:null,encounter:null},f=E.fightStats(s,probe),hp=E.maxHp(c),food=c.foodSlots.reduce((n,t)=>n+(t?.count||0),0);
 const accuracy=E.accuracy(c),required=E.enemyAccuracy(enemy),accuracyGap=Math.max(0,Math.ceil(required-accuracy));
 const tier=['jungle','deep','tree'].includes(area)?'iron':area==='caves'||zone>=2?'copper':'starter';
 const tide=area.startsWith('tide-'),late=s.recipeUnlocks.includes('verdant-steel'),weapon=tide&&s.recipeUnlocks.includes('tempest-arms')?'tempest-'+c.class:late?D.VERDANT_WEAPONS[c.class]||'gold-sword':tier==='iron'?'iron-sword':tier==='copper'?'copper-sword':null,armor=tide?'tide-mail':late?'tempered-mail':tier==='iron'?'iron-mail':tier==='copper'?'copper-mail':null;
 const upgrades=[weapon,armor].filter(Boolean).filter(id=>{const d=D.EQUIPMENT[id],worn=E.equipmentStats(c.loadout[d.slot]);return(d.stats.attack||0)>(worn.attack||0)||(d.stats.defense||0)>(worn.defense||0);}).map(id=>{const recipe=D.RECIPES.find(r=>r.equipment===id);return{id,recipe:recipe.id,open:E.recipeOpen(s,recipe),hint:E.blueprintHint(s,recipe)};});
 const warnings=[];
 if(accuracyGap)warnings.push(`${accuracyGap} more accuracy for guaranteed hits. Precision adds 2 per point${c.class?`; ${E.CLASS_DESIGNS[c.class].accuracy} adds 1.5 per attribute point`:''}.`);
 if(f.incoming>=hp)warnings.push('Estimated damage per kill exceeds maximum health. Improve armor, vitality or use an earlier room before assigning idle combat.');
 else if(f.incoming>0&&!food)warnings.push('No healing food equipped. Buy Trail Bread at the Hearthstead shop for 4 coins each, then equip it in Items → Foods.');
 else if(f.incoming>0)warnings.push(`${food} food equipped. Food supply and recovery affect sustained gains.`);
 if(!warnings.length)warnings.push('Accuracy and estimated survival cover this room. Active attacks still need dodging.');
 return{enemy,required,accuracy,accuracyGap,chance:f.chance,incoming:f.incoming,hp,seconds:f.duration,food,upgrades,warnings};
}
export function bossCraftProgress(s,c,tier){
 const recipe=D.RECIPES.find(r=>r.bossTier===tier),cost=E.craftCost(c,recipe),required=cost['rootwarden-scale'],owned=E.amount(s,'rootwarden-scale',c),missing=Math.max(0,required-owned),scales=E.BOSS_TIERS[tier].scales;
 return{recipe,cost,required,owned,missing,clears:Math.ceil(missing/scales),unlocked:E.recipeOpen(s,recipe)};
}
