'use strict';

function useHeldPill(game){
  const player = game.player;
  if (!player.pillPocket) { game.toast('No pill to take.'); return; }
  const colorId = player.pillPocket;
  player.pillPocket = null;
  identifyAndApplyPill(game, colorId);
  bumpStat('pillsUsed', 1, game);
}

function identifyAndApplyPill(game, colorId){
  const effectId = game.pillEffectMap[colorId];
  const effect = PILL_EFFECTS[effectId];
  const wasKnown = !!game.pillIdentified[colorId];
  if (!wasKnown) game.pillIdentified[colorId] = true;

  applyPillEffect(game, effectId);

  const colorName = PILL_COLORS_BY_ID[colorId].name;
  const label = wasKnown ? (colorName + ' (' + effect.name + ')') : (colorName + ' was... ' + effect.name + '!');
  Sound.play(effect.good === false ? 'uiDeny' : 'itemGet');
  game.toast(label);
  game.logEvent('pill', colorName);
}

function applyPillEffect(game, effectId){
  const player = game.player;
  switch (effectId) {
    case 'fullhealth':
      player.redCurrent = player.redMax;
      break;
    case 'speedup':
      player.pillSpeedBonus += 0.10;
      recalcPlayerStats(player);
      break;
    case 'speeddown':
      player.pillSpeedBonus -= 0.075;
      recalcPlayerStats(player);
      break;
    case 'damageup':
      player.pillDamageBonus += 1;
      recalcPlayerStats(player);
      break;
    case 'damagedown':
      player.pillDamageBonus -= 0.75;
      recalcPlayerStats(player);
      break;
    case 'luckup':
      player.pillLuckBonus += 2;
      recalcPlayerStats(player);
      break;
    case 'luckdown':
      player.pillLuckBonus -= 1.5;
      recalcPlayerStats(player);
      break;
    case 'rangeup':
      player.pillRangeBonus += 1;
      recalcPlayerStats(player);
      break;
    case 'rangedown':
      player.pillRangeBonus -= 0.75;
      recalcPlayerStats(player);
      break;
    case 'tearsup':
      player.pillFireRateBonus += 0.15;
      recalcPlayerStats(player);
      break;
    case 'tearsdown':
      player.pillFireRateBonus -= 0.11;
      recalcPlayerStats(player);
      break;
    case 'chargeup':
      if (player.activeItem) player.activeCharge = player.activeItem.maxCharge;
      break;
    case 'heartup':
      player.grantHeartContainer(1);
      break;
    case 'hpdown': {

      let dmg = 1;
      const fromBlue = Math.min(player.blueCurrent, dmg);
      player.blueCurrent -= fromBlue; dmg -= fromBlue;
      if (dmg > 0 && player.redCurrent > 0) {
        player.redCurrent = Math.max(0, player.redCurrent - dmg);
        if (player.redCurrent <= 0) { player.redCurrent = 0; player.isDead = true; }
      }
      player.dmgFlashTimer = 0.3;
      Sound.play('playerHurt');
      break;
    }
    case 'hpup':

      if (player.redMax > 0) player.heal(1); else player.healBlue(1);
      break;
    case 'mystery': {

      const goodPool = PILL_EFFECT_LIST.filter(e => e.good === true && e.id !== 'mystery');
      const badPool = PILL_EFFECT_LIST.filter(e => e.good === false && e.id !== 'mystery');
      if (goodPool.length) applyPillEffect(game, Util.choice(goodPool).id);
      if (badPool.length) applyPillEffect(game, Util.choice(badPool).id);
      break;
    }
  }
}
