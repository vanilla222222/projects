'use strict';

function encounterGrowth(floorNum, early, late){
  const floor = Math.max(0, floorNum || 0);
  const depth = Math.max(0, floor - 7);
  return early ** Math.min(floor, 7) * (1 + late * depth + 0.22 * (late * depth) ** 2);
}

function enemyHpScale(floorNum){ return encounterGrowth(floorNum, 1.17, 0.10); }
function bossHpScale(floorNum){ return encounterGrowth(floorNum, 1.28, 0.17); }
function minibossHpScale(floorNum){ return encounterGrowth(floorNum, 1.23, 0.13); }
function bossDmgScale(floorNum){ return encounterGrowth(floorNum, 1.04, 0.012); }
function minibossDmgScale(floorNum){ return bossDmgScale(floorNum); }

function explosionDamage(floorNum){ return Math.max(1, Math.round(4 * encounterGrowth(floorNum, 1.22, 0.16))); }

function statusTickDamage(floorNum){ return Math.max(1, Math.round(0.6 * enemyHpScale(floorNum))); }

const STAGE_DIFFICULTY_HP = [
  1.00, 1.00,
  1.18, 1.30,
  1.34, 1.38, 1.42, 1.46, 1.50,
  1.54, 1.58, 1.62, 1.66, 1.70
];

const STAGE_AGGRESSION_SHARE = 0.18;

const STAGE_DAMAGE_SHARE = 0.32;

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

