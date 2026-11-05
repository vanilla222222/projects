'use strict';
// Health and mana. The shape of the rules is taken from REFERENCE.md: regeneration climbs the
// longer you go without taking damage and climbs further while standing still, and mana
// regenerates faster the larger your pool. The constants are Fathom's own.

const HEART = 20;
const STAR = 20;
const BASE_HEALTH = 100;
const BASE_MANA = 20;
const MAX_HEALTH = 400;
const MAX_MANA = 200;
const CRYSTAL_HEALTH = 20;
const CRYSTAL_MANA = 20;

const REGEN_DELAY = 1.2;
const REGEN_RAMP = 7;
const REGEN_BASE = 0.55;
const REGEN_STILL = 2.1;
const MANA_REGEN_BASE = 1.6;
const MANA_REGEN_STILL = 2.4;
const MANA_SPEND_DELAY = 0.45;
const INVULNERABLE = 0.65;

function makeStats() {
  return {
    health: BASE_HEALTH,
    maxHealth: BASE_HEALTH,
    mana: BASE_MANA,
    maxMana: BASE_MANA,
    sinceDamage: REGEN_DELAY,
    sinceSpend: MANA_SPEND_DELAY,
    invulnerable: 0,
    dead: false
  };
}

function hearts(stats) {
  return Math.ceil(stats.maxHealth / HEART);
}

function stars(stats) {
  return Math.ceil(stats.maxMana / STAR);
}

function damage(stats, amount) {
  if (stats.dead || stats.invulnerable > 0) return 0;
  const dealt = Math.min(stats.health, Math.max(0, amount));
  stats.health -= dealt;
  stats.sinceDamage = 0;
  stats.invulnerable = INVULNERABLE;
  if (stats.health <= 0) {
    stats.health = 0;
    stats.dead = true;
  }
  return dealt;
}

function heal(stats, amount) {
  const before = stats.health;
  stats.health = Math.min(stats.maxHealth, stats.health + Math.max(0, amount));
  return stats.health - before;
}

function spendMana(stats, amount) {
  if (amount <= 0) return true;
  if (stats.mana < amount) return false;
  stats.mana -= amount;
  stats.sinceSpend = 0;
  return true;
}

function raiseMaxHealth(stats) {
  if (stats.maxHealth >= MAX_HEALTH) return false;
  stats.maxHealth = Math.min(MAX_HEALTH, stats.maxHealth + CRYSTAL_HEALTH);
  stats.health = Math.min(stats.maxHealth, stats.health + CRYSTAL_HEALTH);
  return true;
}

function raiseMaxMana(stats) {
  if (stats.maxMana >= MAX_MANA) return false;
  stats.maxMana = Math.min(MAX_MANA, stats.maxMana + CRYSTAL_MANA);
  stats.mana = Math.min(stats.maxMana, stats.mana + CRYSTAL_MANA);
  return true;
}

function stepStats(stats, dt, moving) {
  stats.invulnerable = Math.max(0, stats.invulnerable - dt);
  stats.sinceDamage += dt;
  stats.sinceSpend += dt;
  if (stats.dead) return stats;

  if (stats.sinceDamage >= REGEN_DELAY && stats.health < stats.maxHealth) {
    const ramp = Math.min(1, (stats.sinceDamage - REGEN_DELAY) / REGEN_RAMP);
    const rate = REGEN_BASE * (1 + ramp * 2) * (moving ? 1 : REGEN_STILL);
    stats.health = Math.min(stats.maxHealth, stats.health + rate * dt);
  }

  if (stats.sinceSpend >= MANA_SPEND_DELAY && stats.mana < stats.maxMana) {
    const pool = stats.maxMana / BASE_MANA;
    const rate = MANA_REGEN_BASE * pool * (moving ? 1 : MANA_REGEN_STILL);
    stats.mana = Math.min(stats.maxMana, stats.mana + rate * dt);
  }
  return stats;
}

function respawn(stats) {
  stats.dead = false;
  stats.health = stats.maxHealth;
  stats.mana = stats.maxMana;
  stats.sinceDamage = REGEN_DELAY;
  stats.invulnerable = INVULNERABLE * 3;
  return stats;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { makeStats, step: stepStats, stepStats, damage, heal, spendMana, respawn,
    raiseMaxHealth, raiseMaxMana, hearts, stars,
    HEART, STAR, BASE_HEALTH, BASE_MANA, MAX_HEALTH, MAX_MANA };
}
