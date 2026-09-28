'use strict';

ENEMY_BEHAVIOR_HANDLERS.fwf1Deadaircoda = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (v.d < 250) hlwStep(game, e, dt, -v.x, -v.y, 0.6);
  e.fwfCharge = e.fwfCharge || 0;
  e.fwfCd = (e.fwfCd === undefined) ? 1.5 : e.fwfCd - dt;
  if (e.fwfCd <= 0 && e.fwfCharge === 0) e.fwfCharge = 1;
  if (e.fwfCharge > 0) {
    e.fwfCharge -= dt; e.hitFlash = 0.05;
    if (e.fwfCharge <= 0) { for (let i = 0; i < 3; i++) fireProjectileAngle(game, e, hlwAim(e, player), 300 + i * 50, e.dmg + 1, { pierce: 3, color: '#404050' }); e.fwfCd = 2.6; }
  }
};

ENEMY_BEHAVIOR_HANDLERS.fwf1Flatlineburrower = function(game, e, dt){
  const player = game.player;
  if (e.fwfBurrow === undefined) { e.fwfBurrow = 0; e.fwfCd = Util.rand(0.5, 1.5); }
  if (e.fwfBurrow > 0) {
    e.fwfBurrow -= dt; e.submerged = true; e.shielded = true;
    if (e.fwfBurrow <= 0) {
      e.submerged = false; e.shielded = false;
      const spot = findNearestFloor(game.currentRoom, Math.floor(player.x / TILE), Math.floor(player.y / TILE));
      e.x = spot.x; e.y = spot.y; e.hitFlash = 0.2; e.fwfCd = 2.2;
      hlwBlast(game, e, e.x, e.y, 55, 0);
      hlwArc(game, e, 0, 6, Math.PI * 2, 160, { color: '#606070' });
    }
    return;
  }
  e.fwfCd -= dt;
  if (e.fwfCd <= 0) e.fwfBurrow = 1;
};

ENEMY_BEHAVIOR_HANDLERS.fwf1Silencestalker = function(game, e, dt){
  const player = game.player;
  const v = seekVector(e, player.x, player.y);
  if (e.fwfHidden === undefined) e.fwfHidden = true;
  if (e.fwfHidden) {
    e.submerged = true; hlwStep(game, e, dt, v.x, v.y, 0.6);
    if (v.d < 120) { e.fwfHidden = false; e.submerged = false; e.fwfLunge = 0.5; e.fwfDX = v.x; e.fwfDY = v.y; e.hitFlash = 0.2; }
    return;
  }
  e.fwfLunge -= dt;
  hlwStep(game, e, dt, e.fwfDX, e.fwfDY, 3);
  hlwContact(game, e, v, 1);
  if (e.fwfLunge <= 0) e.fwfHidden = true;
};

ENEMY_BEHAVIOR_HANDLERS.fwf1Decrescendosplitter = function(game, e, dt){
  const v = seekVector(e, game.player.x, game.player.y);
  e.fwfStage = e.fwfStage || 0;
  hlwStep(game, e, dt, v.x, v.y, 1 - e.fwfStage * 0.2);
  const frac = e.hp / e.maxHp;
  if (e.fwfStage === 0 && frac < 0.66) { e.fwfStage = 1; hlwSpawn(game, game.currentRoom, 'silencestalker', e.x + 20, e.y); }
  if (e.fwfStage === 1 && frac < 0.33) { e.fwfStage = 2; hlwSpawn(game, game.currentRoom, 'silencestalker', e.x - 20, e.y); hlwSpawn(game, game.currentRoom, 'silencestalker', e.x, e.y + 20); }
  hlwContact(game, e, v);
};
