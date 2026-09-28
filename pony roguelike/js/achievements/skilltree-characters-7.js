'use strict';

const SKILL_TREE_UF_BOUNDS_7 = {

  'chudfilly|familiarDamageMult':      { min:0,     max:0.40 },
  'chadfilly|bombDamageMult':          { min:0,     max:0.40 },
  'chadfilly|bombRadiusMult':          { min:0,     max:0.30 },
  'snowpitymare|familiarDamageMult':   { min:0,     max:0.40 },
  'snowpitymare|wispHpBonus':          { min:0,     max:2 },
  'snowpitymare|pocketChargeRateMult': { min:0,     max:0.40 },

  'chudfilly|damageTakenMult':         { min:-0.25, max:0.25 },
  'chadfilly|damageTakenMult':         { min:-0.25, max:0.25 },
  'snowpitymare|damageTakenMult':      { min:-0.25, max:0.25 },

  'chudfilly|chudExtraFlyChance':      { min:0,     max:0.15 },
  'chadfilly|chadDoubleBombChance':    { min:0,     max:0.20 },
  'chadfilly|bombFuseTimeMult':        { min:-0.30, max:0.30 },
  'snowpitymare|wispCountBonus':       { min:0,     max:3 },
  'snowpitymare|wispShotCooldownMult': { min:-0.30, max:0.30 },
};
function ST(classId, stat, amount){ return { type:'stat', classId, stat, amount }; }
function UF(classId, field, amount){
  const b = SKILL_TREE_UF_BOUNDS_7[classId + '|' + field];
  return { type:'uniqueField', classId, field, amount, min:b.min, max:b.max };
}

const SKILL_TREE_CHARACTER_CONFIG_7 = {

  chudfilly: [

    { k:'i1', p:null, name:'The First Bite', desc:'Something always crawls out of the last kill. 2% chance per kill to hatch a bonus fly familiar.', e:UF('chudfilly','chudExtraFlyChance',0.02) },
    { k:'i2', p:'i1', name:'Second Helpings', desc:'Increases the hatch chance by a further 2%.', e:UF('chudfilly','chudExtraFlyChance',0.02) },
    { k:'i3', p:'i1', name:'Drawn to the Glimmer', desc:'The swarm notices what glints before she does. Increases magnet radius by 5%.', e:ST('chudfilly','magnetRadius',0.05) },
    { k:'i4', p:'i2', name:'Third Course', desc:'Increases the hatch chance by a further 2%.', e:UF('chudfilly','chudExtraFlyChance',0.02) },
    { k:'i5', p:'i3', name:'A Nose for Shine', desc:'Increases magnet radius by a further 5%.', e:ST('chudfilly','magnetRadius',0.05) },
    { k:'i6', p:'i4', cursed:true, name:'Overripe', desc:'Feeding the swarm this well leaves her a little easier to catch. Permanently increases damage taken by 5%. The deep hive beyond it opens no other way.', e:UF('chudfilly','damageTakenMult',0.05) },
    { k:'i7', p:'i5', name:'Gleaming Trail', desc:'Increases magnet radius by a further 5%.', e:ST('chudfilly','magnetRadius',0.05) },
    { k:'i8', p:'i6', name:'Hive Behind the Ribs', desc:'Increases the hatch chance by a further 3%.', e:UF('chudfilly','chudExtraFlyChance',0.03) },
    { k:'i9', p:'i8', name:'Never Just One', desc:'Increases the hatch chance by a further 2%.', e:UF('chudfilly','chudExtraFlyChance',0.02) },
    { k:'i10', p:'i7', name:'Everything Shines Eventually', desc:'Increases magnet radius by a further 4%.', e:ST('chudfilly','magnetRadius',0.04) },
    { k:'i11', p:'i9', name:'The Hatching Never Stops', desc:'Increases the hatch chance by a further 2%.', e:UF('chudfilly','chudExtraFlyChance',0.02) },
    { k:'i12', p:'i10', name:'Nothing Left Ungathered', desc:'Increases magnet radius by a further 3%.', e:ST('chudfilly','magnetRadius',0.03) },
    { k:'i13', p:'i11', name:'Wrapped in Wings', desc:'A living coat, however small each thread of it is. Reduces damage taken by 3%.', e:UF('chudfilly','damageTakenMult',-0.03) },

    { k:'j1', p:null, name:'A Buzzing Shield', desc:'They land on the hits before she has to. Reduces damage taken by 3%.', e:UF('chudfilly','damageTakenMult',-0.03) },
    { k:'j2', p:'j1', name:'Denser Coat', desc:'Reduces damage taken by a further 3%.', e:UF('chudfilly','damageTakenMult',-0.03) },
    { k:'j3', p:'j1', name:'Erratic Flight', desc:'A body that small is hard to line up a hit against. Increases dodge chance by 2%.', e:ST('chudfilly','dodgeChance',0.02) },
    { k:'j4', p:'j2', name:'Second Layer', desc:'Reduces damage taken by a further 3%.', e:UF('chudfilly','damageTakenMult',-0.03) },
    { k:'j5', p:'j3', name:'Nothing Sits Still', desc:'Increases dodge chance by a further 2%.', e:ST('chudfilly','dodgeChance',0.02) },
    { k:'j6', p:'j4', cursed:true, name:'Heavy Cocoon', desc:'A shield that thick has weight to it. Permanently reduces movement speed by 4%. The deepest armor is only reachable through it.', e:ST('chudfilly','speed',-0.04) },
    { k:'j7', p:'j5', name:'Zigzag Instinct', desc:'Increases dodge chance by a further 2%.', e:ST('chudfilly','dodgeChance',0.02) },
    { k:'j8', p:'j6', name:'Living Plating', desc:'Reduces damage taken by a further 4%.', e:UF('chudfilly','damageTakenMult',-0.04) },
    { k:'j9', p:'j8', name:'Nothing Gets Through', desc:'Reduces damage taken by a further 3%.', e:UF('chudfilly','damageTakenMult',-0.03) },
    { k:'j10', p:'j7', name:'Never Where You Aimed', desc:'Increases dodge chance by a further 2%.', e:ST('chudfilly','dodgeChance',0.02) },
    { k:'j11', p:'j9', name:'One More Reflex', desc:'Increases dodge chance by a further 2%.', e:ST('chudfilly','dodgeChance',0.02) },
    { k:'j12', p:'j10', name:'Final Layer', desc:'Reduces damage taken by a further 2%.', e:UF('chudfilly','damageTakenMult',-0.02) },
    { k:'j13', p:'j11', name:'Gone Before It Lands', desc:'Increases dodge chance by a further 2%.', e:ST('chudfilly','dodgeChance',0.02) },

    { k:'k1', p:null, name:'Cold Carriers', desc:'Some of them have been somewhere colder than here. 2% chance to freeze on hit.', e:ST('chudfilly','freezeChance',0.02) },
    { k:'k2', p:'k1', name:'Deeper Chill', desc:'Increases freeze chance by a further 2%.', e:ST('chudfilly','freezeChance',0.02) },
    { k:'k3', p:'k1', name:'Filthy Stingers', desc:'2% chance to mark a target Vulnerable on hit.', e:ST('chudfilly','vulnerableChance',0.02) },
    { k:'k4', p:'k2', name:'Frostbitten Wings', desc:'Increases freeze chance by a further 2%.', e:ST('chudfilly','freezeChance',0.02) },
    { k:'k5', p:'k3', name:'Something Under the Skin', desc:'Increases Vulnerable chance by a further 2%.', e:ST('chudfilly','vulnerableChance',0.02) },
    { k:'k6', p:'k4', cursed:true, name:'Nothing Special About Numbers', desc:'The swarm is a trick of quantity, not fortune. Permanently reduces luck by 3%. Nothing colder than this opens without it.', e:ST('chudfilly','luck',-0.03) },
    { k:'k7', p:'k5', name:'Contagious Unease', desc:'Increases Vulnerable chance by a further 2%.', e:ST('chudfilly','vulnerableChance',0.02) },
    { k:'k8', p:'k6', name:'A Colder Bite', desc:'Increases freeze chance by a further 3%.', e:ST('chudfilly','freezeChance',0.03) },
    { k:'k9', p:'k8', name:'Overfed at Last', desc:'The swarm finally hits like it looks. Increases familiar damage by 6%.', e:UF('chudfilly','familiarDamageMult',0.06) },
    { k:'k10', p:'k7', name:'Spreading Unease', desc:'Increases Vulnerable chance by a further 2%.', e:ST('chudfilly','vulnerableChance',0.02) },
    { k:'k11', p:'k9', name:'Winter in Miniature', desc:'Increases freeze chance by a further 2%.', e:ST('chudfilly','freezeChance',0.02) },
    { k:'k12', p:'k10', name:'Marked All Over', desc:'Increases Vulnerable chance by a further 2%.', e:ST('chudfilly','vulnerableChance',0.02) },

    { k:'l1', p:null, name:'Light on Her Hooves', desc:'Increases movement speed by 3%.', e:ST('chudfilly','speed',0.03) },
    { k:'l2', p:'l1', name:'A Feeling About Things', desc:'Increases luck by 3%.', e:ST('chudfilly','luck',0.03) },
    { k:'l3', p:'l1', name:'Never Standing Still', desc:'Increases movement speed by a further 2%.', e:ST('chudfilly','speed',0.02) },
    { k:'l4', p:'l2', name:'Charmed Anyway', desc:'Increases luck by a further 3%.', e:ST('chudfilly','luck',0.03) },
    { k:'l5', p:'l3', name:'Haggling Instinct', desc:'Increases shop discounts by 3%.', e:ST('chudfilly','shopDiscountBonus',0.03) },
    { k:'l6', p:'l4', cursed:true, name:'Careless With It', desc:'Confidence like that has a cost. Permanently increases damage taken by 4%. What luck actually buys is behind it.', e:UF('chudfilly','damageTakenMult',0.04) },
    { k:'l7', p:'l5', name:'A Fair Price, Mostly', desc:'Increases shop discounts by a further 3%.', e:ST('chudfilly','shopDiscountBonus',0.03) },
    { k:'l8', p:'l6', name:'It Was Never Just Numbers', desc:'Increases luck by a further 4%.', e:ST('chudfilly','luck',0.04) },
    { k:'l9', p:'l8', name:'The House Always Loses Sometime', desc:'Increases luck by a further 3%.', e:ST('chudfilly','luck',0.03) },
    { k:'l10', p:'l7', name:'Quicker Still', desc:'Increases movement speed by a further 2%.', e:ST('chudfilly','speed',0.02) },
    { k:'l11', p:'l9', name:'Fortune Favors the Small', desc:'Increases luck by a further 2%.', e:ST('chudfilly','luck',0.02) },
    { k:'l12', p:'l10', name:'The Last Discount', desc:'Increases shop discounts by a further 2%.', e:ST('chudfilly','shopDiscountBonus',0.02) },

    { k:'i14', p:'i13', name:'Waste Not', desc:'The swarm leaves scraps behind only when there is nothing else worth eating. 3% chance to heal on kill.', e:ST('chudfilly','onKillHealChance',0.03) },
    { k:'j14', p:'j13', name:'Too Small to Hit', desc:'Increases dodge chance by a further 2%.', e:ST('chudfilly','dodgeChance',0.02) },
    { k:'l13', p:'l12', name:'One More Coin Flipped Her Way', desc:'Increases luck by a further 2%.', e:ST('chudfilly','luck',0.02) },
  ],

  chadfilly: [

    { k:'i1', p:null, name:'Denser Powder II', desc:'The last of the charge she can pack in by hand. Increases bomb damage by 3%.', e:UF('chadfilly','bombDamageMult',0.03) },
    { k:'i2', p:'i1', name:'Weapons-Grade Satchel II', desc:'Increases bomb damage by a further 3%. That is as hot as the fuse gets.', e:UF('chadfilly','bombDamageMult',0.03) },
    { k:'i3', p:'i1', name:'Two for One', desc:'She never carries just one. 3% chance any placed bomb drops a free second one nearby.', e:UF('chadfilly','chadDoubleBombChance',0.03) },
    { k:'i4', p:'i2', name:'Buy One Get One', desc:'Increases the double-drop chance by a further 3%.', e:UF('chadfilly','chadDoubleBombChance',0.03) },
    { k:'i5', p:'i3', name:'Never Just the One', desc:'Increases the double-drop chance by a further 3%.', e:UF('chadfilly','chadDoubleBombChance',0.03) },
    { k:'i6', p:'i4', cursed:true, name:'Too Close to the Flash', desc:'Standing this near her own fireworks has a price. Permanently increases damage taken by 5%. The bulk order below is only reachable through it.', e:UF('chadfilly','damageTakenMult',0.05) },
    { k:'i7', p:'i5', name:'The Whole Crate', desc:'Increases the double-drop chance by a further 3%.', e:UF('chadfilly','chadDoubleBombChance',0.03) },
    { k:'i8', p:'i6', name:'Bulk Order', desc:'Increases the double-drop chance by a further 4%.', e:UF('chadfilly','chadDoubleBombChance',0.04) },
    { k:'i9', p:'i8', name:'Two Really Is Better', desc:'Increases the double-drop chance by a further 2%.', e:UF('chadfilly','chadDoubleBombChance',0.02) },
    { k:'i10', p:'i7', name:'Shorter Fuse', desc:'Bombs detonate 3% faster.', e:UF('chadfilly','bombFuseTimeMult',-0.03) },
    { k:'i11', p:'i9', name:'No Time to Reconsider', desc:'Bombs detonate a further 3% faster.', e:UF('chadfilly','bombFuseTimeMult',-0.03) },
    { k:'i12', p:'i10', name:'Impatient Charge', desc:'Bombs detonate a further 3% faster.', e:UF('chadfilly','bombFuseTimeMult',-0.03) },
    { k:'i13', p:'i11', name:'Blast-Hardened', desc:'Reduces damage taken by 2%.', e:UF('chadfilly','damageTakenMult',-0.02) },

    { k:'j1', p:null, name:'Looser Casing II', desc:'The last of the packing she can afford to lose. Increases bomb blast radius by 3%.', e:UF('chadfilly','bombRadiusMult',0.03) },
    { k:'j2', p:'j1', name:'Never Enough Boom II', desc:'Increases bomb blast radius by a further 3%. That is as wide as the shell goes.', e:UF('chadfilly','bombRadiusMult',0.03) },
    { k:'j3', p:'j1', name:'Padded Satchel', desc:'Reduces damage taken by 3%.', e:UF('chadfilly','damageTakenMult',-0.03) },
    { k:'j4', p:'j2', name:'Lined Vest', desc:'Reduces damage taken by a further 3%.', e:UF('chadfilly','damageTakenMult',-0.03) },
    { k:'j5', p:'j3', name:'Light on Her Hooves', desc:'Increases movement speed by 3%.', e:ST('chadfilly','speed',0.03) },
    { k:'j6', p:'j4', cursed:true, name:'Overloaded Satchel', desc:'Every extra charge she carries is extra weight. Permanently reduces movement speed by 4%. The deepest padding is only reachable through it.', e:ST('chadfilly','speed',-0.04) },
    { k:'j7', p:'j5', name:'Quicker Retreat', desc:'Increases movement speed by a further 3%.', e:ST('chadfilly','speed',0.03) },
    { k:'j8', p:'j6', name:'Full Plating', desc:'Reduces damage taken by a further 4%.', e:UF('chadfilly','damageTakenMult',-0.04) },
    { k:'j9', p:'j8', name:'Nothing Gets Through Either', desc:'Reduces damage taken by a further 3%.', e:UF('chadfilly','damageTakenMult',-0.03) },
    { k:'j10', p:'j7', name:'Never Standing Still', desc:'Increases movement speed by a further 2%.', e:ST('chadfilly','speed',0.02) },
    { k:'j11', p:'j9', name:'A Feeling About Things', desc:'Increases luck by 3%.', e:ST('chadfilly','luck',0.03) },
    { k:'j12', p:'j10', name:'Charmed Anyway', desc:'Increases luck by a further 3%.', e:ST('chadfilly','luck',0.03) },
    { k:'j13', p:'j11', name:'Lucky Fuse', desc:'Increases luck by a further 2%.', e:ST('chadfilly','luck',0.02) },

    { k:'k1', p:null, name:'Twitchy Trigger', desc:'Bombs detonate 3% faster.', e:UF('chadfilly','bombFuseTimeMult',-0.03) },
    { k:'k2', p:'k1', name:'No Second Thoughts', desc:'Bombs detonate a further 3% faster.', e:UF('chadfilly','bombFuseTimeMult',-0.03) },
    { k:'k3', p:'k1', name:'Already Moving', desc:'Increases dodge chance by 2%.', e:ST('chadfilly','dodgeChance',0.02) },
    { k:'k4', p:'k2', name:'Never Where the Blast Was', desc:'Increases dodge chance by a further 2%.', e:ST('chadfilly','dodgeChance',0.02) },
    { k:'k5', p:'k3', name:'The Last Extra', desc:'The final drop of double-drop odds she can squeeze out. Increases the double-drop chance by 2%.', e:UF('chadfilly','chadDoubleBombChance',0.02) },
    { k:'k6', p:'k4', cursed:true, name:'Overloaded Sprint', desc:'Running with this much on her back was never going to be graceful. Permanently reduces movement speed by 4%. The steadiest hooves are behind it.', e:ST('chadfilly','speed',-0.04) },
    { k:'k7', p:'k5', name:'Reflexes Under Fire', desc:'Increases dodge chance by a further 2%.', e:ST('chadfilly','dodgeChance',0.02) },
    { k:'k8', p:'k6', name:'Hair-Trigger Instinct', desc:'Bombs detonate a further 4% faster.', e:UF('chadfilly','bombFuseTimeMult',-0.04) },
    { k:'k9', p:'k8', name:'Steadiest Hooves in the Business', desc:'Increases dodge chance by a further 3%.', e:ST('chadfilly','dodgeChance',0.03) },
    { k:'k10', p:'k7', name:'Never Twice in the Same Spot', desc:'Increases dodge chance by a further 2%.', e:ST('chadfilly','dodgeChance',0.02) },
    { k:'k11', p:'k9', name:'A Nose for Shine', desc:'Increases magnet radius by 5%.', e:ST('chadfilly','magnetRadius',0.05) },
    { k:'k12', p:'k10', name:'Everything Worth Grabbing', desc:'Increases magnet radius by a further 5%.', e:ST('chadfilly','magnetRadius',0.05) },

    { k:'l1', p:null, name:'Haggling Instinct', desc:'Increases shop discounts by 2%.', e:ST('chadfilly','shopDiscountBonus',0.02) },
    { k:'l2', p:'l1', name:'A Fair Price, Mostly', desc:'Increases shop discounts by a further 2%.', e:ST('chadfilly','shopDiscountBonus',0.02) },
    { k:'l3', p:'l1', name:'A Feeling About Timing', desc:'Increases luck by 3%.', e:ST('chadfilly','luck',0.03) },
    { k:'l4', p:'l2', name:'It Usually Works Out', desc:'Increases luck by a further 3%.', e:ST('chadfilly','luck',0.03) },
    { k:'l5', p:'l3', name:'Padded Boots', desc:'Reduces damage taken by 2%.', e:UF('chadfilly','damageTakenMult',-0.02) },
    { k:'l6', p:'l4', cursed:true, name:'Stops Flinching', desc:'She has set off too many of these to jump at her own work anymore, and it shows. Permanently increases damage taken by 6%. The grand finale is on the far side of it.', e:UF('chadfilly','damageTakenMult',0.06) },
    { k:'l7', p:'l5', name:'Padded Vest', desc:'Reduces damage taken by a further 2%.', e:UF('chadfilly','damageTakenMult',-0.02) },
    { k:'l8', p:'l6', name:'Running on Adrenaline', desc:'Increases movement speed by 5%.', e:ST('chadfilly','speed',0.05) },
    { k:'l9', p:'l8', name:'One Last Sprint', desc:'Increases movement speed by a further 3%.', e:ST('chadfilly','speed',0.03) },
    { k:'l10', p:'l7', name:'Lucky Streak', desc:'Increases luck by a further 2%.', e:ST('chadfilly','luck',0.02) },
    { k:'l11', p:'l9', name:'Still Standing', desc:'Increases luck by a further 2%.', e:ST('chadfilly','luck',0.02) },
    { k:'l12', p:'l10', name:'The Last Discount', desc:'Increases shop discounts by a further 2%.', e:ST('chadfilly','shopDiscountBonus',0.02) },

    { k:'i14', p:'i13', name:'No Time at All', desc:'Bombs detonate a further 3% faster. There is nothing left to trim off the fuse.', e:UF('chadfilly','bombFuseTimeMult',-0.03) },
    { k:'j14', p:'j13', name:'Never Miscounts the Charges', desc:'Increases luck by a further 2%.', e:ST('chadfilly','luck',0.02) },
    { k:'l13', p:'l12', name:'One More Deal', desc:'Increases shop discounts by a further 2%.', e:ST('chadfilly','shopDiscountBonus',0.02) },
  ],

  snowpitymare: [

    { k:'i1', p:null, name:'One More Joins', desc:'Starts with 1 more wisp.', e:UF('snowpitymare','wispCountBonus',1) },
    { k:'i2', p:'i1', name:'Colder Light II', desc:'Increases wisp damage by 3%.', e:UF('snowpitymare','familiarDamageMult',0.03) },
    { k:'i3', p:'i1', name:'Sharper Frost II', desc:'Increases wisp damage by a further 3%.', e:UF('snowpitymare','familiarDamageMult',0.03) },
    { k:'i4', p:'i2', name:'Packed Denser', desc:'The last of the frost the circle can hold. Wisps have 1 more max HP.', e:UF('snowpitymare','wispHpBonus',1) },
    { k:'i5', p:'i3', name:'Deeper Chill II', desc:'Increases wisp damage by a further 3%. That is as cold as the light gets.', e:UF('snowpitymare','familiarDamageMult',0.03) },
    { k:'i6', p:'i4', cursed:true, name:'A Wider Circle to Carry', desc:'Every wisp she keeps orbiting is a little more of herself given over to it. Permanently reduces movement speed by 4%. The full circle beyond it opens no other way.', e:ST('snowpitymare','speed',-0.04) },
    { k:'i7', p:'i5', name:'Killing Frost II', desc:'Increases wisp damage by a further 3%. The circle hits as hard as it ever will.', e:UF('snowpitymare','familiarDamageMult',0.03) },
    { k:'i8', p:'i6', name:'Two More Join', desc:'Starts with 1 more wisp.', e:UF('snowpitymare','wispCountBonus',1) },
    { k:'i9', p:'i8', name:'The Circle Is Full', desc:'Starts with 1 more wisp — the last the circle will hold.', e:UF('snowpitymare','wispCountBonus',1) },
    { k:'i10', p:'i7', name:'Frost-Hardened', desc:'Reduces damage taken by 3%.', e:UF('snowpitymare','damageTakenMult',-0.03) },
    { k:'i11', p:'i9', name:'Wrapped in Winter', desc:'Reduces damage taken by a further 3%.', e:UF('snowpitymare','damageTakenMult',-0.03) },
    { k:'i12', p:'i10', name:'Nothing Gets Through the Circle', desc:'Reduces damage taken by a further 2%.', e:UF('snowpitymare','damageTakenMult',-0.02) },
    { k:'i13', p:'i11', name:'The Last Layer of Frost', desc:'Reduces damage taken by a further 2%.', e:UF('snowpitymare','damageTakenMult',-0.02) },

    { k:'j1', p:null, name:'Gathering Chill II', desc:'The wisps fire 3% more often.', e:UF('snowpitymare','wispShotCooldownMult',-0.03) },
    { k:'j2', p:'j1', name:'Quickening Frost II', desc:'The wisps fire a further 3% more often.', e:UF('snowpitymare','wispShotCooldownMult',-0.03) },
    { k:'j3', p:'j1', name:'Restless Winter II', desc:'Wisp Call charges 3% faster.', e:UF('snowpitymare','pocketChargeRateMult',0.03) },
    { k:'j4', p:'j2', name:'The Circle Never Waits II', desc:'Wisp Call charges a further 3% faster. That is as fast as it fills.', e:UF('snowpitymare','pocketChargeRateMult',0.03) },
    { k:'j5', p:'j3', name:'Never Quite Still II', desc:'The wisps fire a further 3% more often.', e:UF('snowpitymare','wispShotCooldownMult',-0.03) },
    { k:'j6', p:'j4', cursed:true, name:'Conducting, Not Watching', desc:'Keeping the whole circle in time leaves nothing spare for watching her own back. Permanently increases damage taken by 5%. The fastest winter is behind it.', e:UF('snowpitymare','damageTakenMult',0.05) },
    { k:'j7', p:'j5', name:'No Pause Between Volleys', desc:'The wisps fire a further 3% more often.', e:UF('snowpitymare','wispShotCooldownMult',-0.03) },
    { k:'j8', p:'j6', name:'A Blur of Frost', desc:'The wisps fire a further 4% more often.', e:UF('snowpitymare','wispShotCooldownMult',-0.04) },
    { k:'j9', p:'j8', name:'The Fastest Winter', desc:'The wisps fire a further 3% more often — as fast as they will ever go.', e:UF('snowpitymare','wispShotCooldownMult',-0.03) },
    { k:'j10', p:'j7', name:'A Feeling About Things', desc:'Increases luck by 3%.', e:ST('snowpitymare','luck',0.03) },
    { k:'j11', p:'j9', name:'Charmed Anyway', desc:'Increases luck by a further 3%.', e:ST('snowpitymare','luck',0.03) },
    { k:'j12', p:'j10', name:'Lucky Frost', desc:'Increases luck by a further 3%.', e:ST('snowpitymare','luck',0.03) },
    { k:'j13', p:'j11', name:'Light on Her Hooves', desc:'Increases movement speed by 3%.', e:ST('snowpitymare','speed',0.03) },

    { k:'k1', p:null, name:'Already Drifting', desc:'Increases dodge chance by 2%.', e:ST('snowpitymare','dodgeChance',0.02) },
    { k:'k2', p:'k1', name:'Never Where the Frost Was', desc:'Increases dodge chance by a further 2%.', e:ST('snowpitymare','dodgeChance',0.02) },
    { k:'k3', p:'k1', name:'The Cold Reaches Further', desc:'2% chance to freeze on hit.', e:ST('snowpitymare','freezeChance',0.02) },
    { k:'k4', p:'k2', name:'Deeper Frost', desc:'Increases freeze chance by a further 2%.', e:ST('snowpitymare','freezeChance',0.02) },
    { k:'k5', p:'k3', name:'A Bitter Wind', desc:'Increases freeze chance by a further 2%.', e:ST('snowpitymare','freezeChance',0.02) },
    { k:'k6', p:'k4', cursed:true, name:'The Cold Slows Her Too', desc:'Winter does not make exceptions for the pony carrying it. Permanently reduces movement speed by 3%. Deep winter is on the far side of it.', e:ST('snowpitymare','speed',-0.03) },
    { k:'k7', p:'k5', name:'Numbing Touch', desc:'Increases freeze chance by a further 2%.', e:ST('snowpitymare','freezeChance',0.02) },
    { k:'k8', p:'k6', name:'Deep Winter', desc:'Increases freeze chance by a further 3%.', e:ST('snowpitymare','freezeChance',0.03) },
    { k:'k9', p:'k8', name:'Gone Before It Lands', desc:'Increases dodge chance by a further 3%.', e:ST('snowpitymare','dodgeChance',0.03) },
    { k:'k10', p:'k7', name:'Drawn to the Glimmer', desc:'Increases magnet radius by 5%.', e:ST('snowpitymare','magnetRadius',0.05) },
    { k:'k11', p:'k9', name:'A Nose for Shine', desc:'Increases magnet radius by a further 5%.', e:ST('snowpitymare','magnetRadius',0.05) },
    { k:'k12', p:'k10', name:'Everything Worth Gathering', desc:'Increases magnet radius by a further 5%.', e:ST('snowpitymare','magnetRadius',0.05) },

    { k:'l1', p:null, name:'Quick Little Hooves II', desc:'Increases movement speed by 3%.', e:ST('snowpitymare','speed',0.03) },
    { k:'l2', p:'l1', name:'A Feeling About Timing', desc:'Increases luck by 3%.', e:ST('snowpitymare','luck',0.03) },
    { k:'l3', p:'l1', name:'Never Falls Behind II', desc:'Increases movement speed by a further 2%.', e:ST('snowpitymare','speed',0.02) },
    { k:'l4', p:'l2', name:'It Usually Works Out', desc:'Increases luck by a further 3%.', e:ST('snowpitymare','luck',0.03) },
    { k:'l5', p:'l3', name:'Haggling Instinct', desc:'Increases shop discounts by 3%.', e:ST('snowpitymare','shopDiscountBonus',0.03) },
    { k:'l6', p:'l4', cursed:true, name:'Nothing Kept in Reserve', desc:'Everything she has goes into keeping the circle alive, and none of it stays behind to protect her. Permanently increases damage taken by 5%. The grand blizzard is on the far side of it.', e:UF('snowpitymare','damageTakenMult',0.05) },
    { k:'l7', p:'l5', name:'A Fair Price, Mostly', desc:'Increases shop discounts by a further 3%.', e:ST('snowpitymare','shopDiscountBonus',0.03) },
    { k:'l8', p:'l6', name:'One Last Acceleration', desc:'The wisps fire a further 3% more often.', e:UF('snowpitymare','wispShotCooldownMult',-0.03) },
    { k:'l9', p:'l8', name:'Fortune Favors the Circle', desc:'Increases luck by a further 3%.', e:ST('snowpitymare','luck',0.03) },
    { k:'l10', p:'l7', name:'Lucky Frost II', desc:'Increases luck by a further 2%.', e:ST('snowpitymare','luck',0.02) },
    { k:'l11', p:'l9', name:'Fastest Hooves in Winter', desc:'Increases movement speed by a further 3%.', e:ST('snowpitymare','speed',0.03) },
    { k:'l12', p:'l10', name:'The Last Discount', desc:'Increases shop discounts by a further 2%.', e:ST('snowpitymare','shopDiscountBonus',0.02) },

    { k:'i14', p:'i13', name:'Nothing Left to Give', desc:'Reduces damage taken by a further 3%.', e:UF('snowpitymare','damageTakenMult',-0.03) },
    { k:'j14', p:'j13', name:'One Last Chill', desc:'The wisps fire a further 2% more often.', e:UF('snowpitymare','wispShotCooldownMult',-0.02) },
    { k:'l13', p:'l12', name:'Fortune in the Frost', desc:'Increases luck by a further 2%.', e:ST('snowpitymare','luck',0.02) },
  ],
};

const SKILL_TREE_CHARACTER_NODES_7 = [];
(function buildCharacterSkillNodes7(){
  for (const classId in SKILL_TREE_CHARACTER_CONFIG_7) {
    for (const entry of SKILL_TREE_CHARACTER_CONFIG_7[classId]) {
      const node = {
        id: 'char_' + classId + '_' + entry.k,
        parent: entry.p == null ? ('char_hub_' + classId) : ('char_' + classId + '_' + entry.p),
        cost: 1,
        name: entry.name,
        desc: entry.desc,
      };
      if (entry.es) node.effects = entry.es;
      else node.effect = entry.e || null;
      if (entry.cursed) node.cursed = true;
      SKILL_TREE_CHARACTER_NODES_7.push(node);
    }
  }
})();

for (const n of SKILL_TREE_CHARACTER_NODES_7) {
  SKILL_TREE_NODES.push(n);
  SKILL_TREE_NODES_BY_ID[n.id] = n;
}
