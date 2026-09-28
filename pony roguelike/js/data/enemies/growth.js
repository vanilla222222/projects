'use strict';

'use strict';

const ENEMY_HP_GROWTH = 1.20;
function enemyHpScale(floorNum){ return Math.pow(ENEMY_HP_GROWTH, floorNum || 0); }

const BOSS_HP_GROWTH = 1.36;
function bossHpScale(floorNum){ return Math.pow(BOSS_HP_GROWTH, floorNum || 0); }

const BOSS_DMG_GROWTH = 1.06;
function bossDmgScale(floorNum){ return Math.pow(BOSS_DMG_GROWTH, floorNum || 0); }

const MINIBOSS_HP_GROWTH = 1.28;
function minibossHpScale(floorNum){ return Math.pow(MINIBOSS_HP_GROWTH, floorNum || 0); }
function minibossDmgScale(floorNum){ return bossDmgScale(floorNum); }

function explosionDamage(floorNum){ return Math.max(1, Math.round(4 * bossHpScale(floorNum))); }

function statusTickDamage(floorNum){ return Math.max(1, Math.round(0.6 * bossHpScale(floorNum))); }

const STAGE_DIFFICULTY_HP = [
  1.00, 1.00,
  1.18, 1.30,
  1.34, 1.38, 1.42, 1.46, 1.50,
  1.54, 1.58, 1.62, 1.66, 1.70
];

const STAGE_AGGRESSION_SHARE = 0.35;

const STAGE_DAMAGE_SHARE = 0.5;

function stageDifficultyMult(floorNum){
  if (typeof stageIndexForFloor !== 'function') return 1;
  const si = stageIndexForFloor(floorNum || 0);
  if (!(si >= 2)) return 1;
  const m = STAGE_DIFFICULTY_HP[si];
  return (typeof m === 'number') ? m : STAGE_DIFFICULTY_HP[STAGE_DIFFICULTY_HP.length - 1];
}
function stageAggressionMult(floorNum){
  return 1 + (stageDifficultyMult(floorNum) - 1) * STAGE_AGGRESSION_SHARE;
}
function stageDamageMult(floorNum){
  return 1 + (stageDifficultyMult(floorNum) - 1) * STAGE_DAMAGE_SHARE;
}

function stageTunedType(type, floorNum){
  const a = stageAggressionMult(floorNum);
  if (!type || !(a > 1)) return type;
  const out = {};
  const keys = Object.keys(type);
  for (let i = 0; i < keys.length; i++){
    const k = keys[i], v = type[k];
    out[k] = (typeof v === 'number' && k.length > 8 && k.slice(-8) === 'Cooldown') ? v / a : v;
  }
  return out;
}

