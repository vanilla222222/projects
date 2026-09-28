'use strict';

class Player {
  constructor(classId){
    const def = CLASSES[classId];
    this.classId = classId;
    this.def = def;
    this.x = 0; this.y = 0;
    this.radius = 12;
    this.baseSpeed = def.speed;
    this.canFly = !!def.canFly;
    this.attackType = def.attackType;
    this.baseMeleeDamage = def.meleeDamage || 0;
    this.baseRangedDamage = def.rangedDamage || 0;
    this.meleeCooldownBase = def.meleeCooldown || 0.4;
    this.fireCooldownBase = def.fireCooldown || 0.5;
    this.boltSpeed = def.boltSpeed || 340;
    this.onKillHealChance = def.lifedrinkChance || 0;
    this.laser = !!def.laser;

    this.charged = !!def.charged;
    this.chargeTimer = 0;
    this.chargeTime = def.chargeTime || 0;
    this.crystalVolley = !!def.crystalVolley;

    this.crystalShardCount = def.crystalVolley ? 3 : 0;

    this.crystalVolleySpacing = def.crystalVolley ? CRYSTAL_VOLLEY_SPACING_DEFAULT : 0;
    this.greenFireAttack = !!def.greenFireAttack;
    this.fireZone = null;

    this.fireZoneRootMult = 0.25;

    this.fireZoneRadius = def.fireZoneRadius || 50;
    this.fireZoneRange = def.fireZoneRange || 40;

    this.innateFireRing = !!def.innateFireRing;

    this.fireRingRadius = def.fireRingRadius || 60;
    this.shockwaveAttack = !!def.shockwaveAttack;

    this.faultlineQuake = !!def.faultlineQuake;
    this.quakeSwings = 0;

    this.slipstreamSurge = !!def.slipstreamSurge;
    this.slipstreamTimer = 0;
    this.slipstreamReady = false;

    this.arcaneEcho = !!def.arcaneEcho;
    this.arcaneEchoHits = 0;

    this.echoHunt = !!def.echoHunt;
    this.echoTimer = 0;

    this.bitterbrew = !!def.bitterbrew;
    this.brewSwings = 0;

    this.talonRend = !!def.talonRend;

    this.tidewatch = !!def.tidewatch;
    this.tideTimer = 0;

    this.overcharge = !!def.overcharge;
    this.overchargeMeter = 0;
    this.overchargeTimer = 0;

    this.stoopKill = !!def.stoopKill;

    this.nirikNature = !!def.nirikNature;
    this.nirikHeat = 0;
    this.nirikBurning = false;

    this.hoardfire = !!def.hoardfire;

    this.deepChill = !!def.deepChill;
    this.deepChillTimer = 0;

    this.riptideLure = !!def.riptideLure;
    this.riptideTimer = 0;

    this.galeStep = !!def.galeStep;
    this.galeDistance = 0;

    this.bassDrop = !!def.bassDrop;
    this.beatCombo = 0;
    this.beatWindowTimer = 0;

    this.prismBloom = !!def.prismBloom;
    this.prismCharge = 0;

    this.stubbornGround = !!def.stubbornGround;
    this.gritStacks = 0;
    this.gritDecayTimer = 0;

    this.tripleCrown = !!def.tripleCrown;
    this.crownStance = 0;
    this.crownTimer = 0;

    this.loveHarvest = !!def.loveHarvest;
    this.loveStacks = 0;

    this.tunnelAmbush = !!def.tunnelAmbush;
    this.tunnelAmbushDistance = 0;

    this.stoneVigil = !!def.stoneVigil;
    this.vigilIdleTime = 0;
    this.vigilActive = false;

    this.emberMolt = !!def.emberMolt;
    this.moltStacks = 0;
    this.moltStackTimer = 0;

    this.royalDecree = !!def.royalDecree;
    this.decreeTimer = 0;

    this.scrappySurge = !!def.scrappySurge;
    this.scrappySurgeTimer = 0;
    this.scrappySurgeCooldown = 0;

    this.salvageProtocol = !!def.salvageProtocol;
    this.salvageKills = 0;

    this.spiteSwarm = !!def.spiteSwarm;
    this.spiteSwarmTimer = 0;
    this.spiteSwarmCooldown = 0;

    this.rollingCharge = !!def.rollingCharge;
    this.rollingChargeDistance = 0;

    this.shatterfrost = !!def.shatterfrost;
    this.shatterfrostRime = 0;

    this.rockCoinChance = def.rockCoinChance || 0;

    this.summonsChangelings = !!def.summonsChangelings;
    this.changelingSummonCooldown = def.changelingSummonCooldown || 8;
    this.maxChangelingMinions = def.maxChangelingMinions || 2;
    this.changelingMinionDmg = def.changelingMinionDmg || 0;
    this.changelingMinionRadius = def.changelingMinionRadius || 0;
    this._changelingSummonTimer = 0;

    this.canBuildTurrets = !!def.canBuildTurrets;
    this.turretBuildTimer = 0;

    this.turretDamageMult = 0.5;
    this.maxTurrets = 3;

    this.damageTakenMult = def.damageTakenMult || 1;
    this.unlimitedRange = !!def.unlimitedRange;

    this.attackLayers = [];

    this.delayedActions = [];

    this.baseRangeTiles = this.laser ? 0 : (def.baseRangeTiles != null ? def.baseRangeTiles : (this.attackType === 'melee' ? 1 : 7));
    this.rangeTiles = this.baseRangeTiles;
    this.meleeRange = this.baseRangeTiles * TILE;

    this.trinketId = null;
    this.familiars = [];
    this.changelingMinions = [];

    this.pillPocket = null;

    this.pillSpeedBonus = 0;
    this.pillDamageBonus = 0;
    this.pillLuckBonus = 0;
    this.pillRangeBonus = 0;
    this.pillFireRateBonus = 0;

    this.starPocket = null;

    this.starDamageBonus = 0;
    this.starSpeedMult = 1;

    this.starRangeBonus = 0;

    this.redMax = def.redMax;
    this.redCurrent = def.redMax;
    this.blueCurrent = def.startBlue || 0;

    this.dealFreebieUsed = false;

    this.coins = def.startCoins || 0;
    this.keys = def.startKeys || 0;
    this.bombs = def.startBombs || 0;
    this.unlimitedKeysFloor = false;
    this.unlimitedBombsFloor = false;

    this.passives = {};
    this.statPassives = {};
    this.activeItem = null;
    this.activeCharge = 0;

    this.pocketActive = def.pocketActive || null;
    this.pocketCharge = 0;

    this.pocketChargeAccum = 0;

    this.noAttack = !!def.noAttack;

    this.unlimitedBombsAlways = !!def.unlimitedBombs;

    this.itemsBecomeFamiliars = !!def.itemsBecomeFamiliars;

    this.gainsFlyPerFloor = !!def.gainsFlyPerFloor;

    this.facing = { x: 0, y: 1 };
    this.moving = false;
    this.attackTimer = 0;
    this.invulnTimer = 0;
    this.invincibleTimer = 0;
    this.speedBoostTimer = 0;
    this.dmgFlashTimer = 0;
    this.freezeTimer = 0;
    this.secondWindUsedThisFloor = false;
    this.tookDamageThisFloor = false;
    this.isDead = false;
    this.lastDamageSource = null;

    this.luckyPennies = 0;

    this.speed = this.baseSpeed;
    this.meleeDamage = this.baseMeleeDamage;
    this.rangedDamage = this.baseRangedDamage;
    this.meleeCooldown = this.meleeCooldownBase;
    this.fireCooldown = this.fireCooldownBase;
    this.spikedBarding = false;
    this.lifestealChance = 0;
    this.critChance = 0;
    this.revealMap = false;
    this.eyeUsed = false;
    this.hasSecondWind = false;
    this.luck = 0;

    this.venomChance = 0;
    this.stunChance = 0;
    this.charmChance = 0;
    this.freezeChance = 0;
    this.fearChance = 0;

    this.magnetRadius = 0;
    this.bombRadiusMult = 1;

    this.bombDamageMult = 1;

    this.familiarDamageMult = 1;

    this.pocketChargeRateMult = 1;

    this.wispHpBonus = 0;

    this.chudExtraFlyChance = 0;

    this.chadDoubleBombChance = 0;
    this.bombFuseTimeMult = 1;

    this.wispCountBonus = 0;
    this.wispShotCooldownMult = 1;

    this.wispDamageRatio = 0.25;

    this.wispFormationAngle = 0;

    this.tearFlags = { pierce: 0, homing: 0, spectral: 0, explosive: 0,
      sizeMult: 1, shape: null, chainLightning: 0, splitOnHit: 0, knockbackPulse: 0 };
    this.multishotExtra = 0;
    this.dodgeChance = 0;
    this.critMultiplier = 2;
    this.shieldHits = 0;

    this.eternalHeart = false;

    this.goldHeart = false;
    this.bossDamageBonus = 0;
    this.bossDamageTakenMult = 1;

    this.tookDamageThisBossRoom = false;
    this.bossRoomsNoDamageStreak = 0;
    this.tookDamageThisRun = false;
    this.tookDamageThisRoom = false;

    this.visitedShopThisRun = false;

    this._ecosystemSetSeen = false;
  }

  totalHearts(){ return this.redCurrent + this.blueCurrent; }

  takeDamage(amount, source){
    if (this.invulnTimer > 0 || this.invincibleTimer > 0 || this.isDead) return;
    if (this.shieldHits > 0) { this.shieldHits--; Sound.play('shieldBlock'); return; }
    if (this.dodgeChance && RNG.random() < this.dodgeChance) { Sound.play('dodge'); return; }
    Sound.play('playerHurt');

    this._hitFlashAt = Date.now();

    if (this.eternalHeart && this.blueCurrent <= 0) {
      this.eternalHeart = false;
      this.redMax = Math.max(0, this.redMax - 0.5);
      this.redCurrent = Math.min(this.redCurrent, this.redMax);
    }

    this.lastDamageSource = source;
    this.tookDamageThisFloor = true;
    this.tookDamageThisBossRoom = true;
    this.tookDamageThisRun = true;
    this.tookDamageThisRoom = true;

    this.goldHeart = false;
    let dmg = amount;
    if (this.blueCurrent > 0) {
      const used = Math.min(this.blueCurrent, dmg);
      this.blueCurrent -= used; dmg -= used;
    }

    if (dmg > 0) {
      this.redCurrent -= dmg;
      if (this.redCurrent <= 0) {
        if (this.hasSecondWind && !this.secondWindUsedThisFloor) {
          this.secondWindUsedThisFloor = true;
          this.redCurrent = 0.5;
        } else {
          this.redCurrent = 0;
          this.isDead = true;
          if (source === 'cactus') unlockAchievement('unlock_ponybot', null);
        }
      }
    }

    this.invulnTimer = Math.min(1.8,
      0.85 + (this.trinketId === 'foolsfeather' ? 0.5 : 0)
      + 0.3 * (this.passives.seraphshield || 0)

      + 0.2 * (this.passives.phoenixfeathershard || 0) + 0.15 * (this.passives.steadfastheart || 0));
    this.dmgFlashTimer = 0.3;
  }

  spendHearts(cost){
    let remaining = cost;
    const fromBlue = Math.min(this.blueCurrent, remaining);
    this.blueCurrent -= fromBlue; remaining -= fromBlue;
    this.redCurrent -= remaining;
    this.dmgFlashTimer = 0.3;
  }

  heal(amount){ this.redCurrent = Math.min(this.redMax, this.redCurrent + amount); }
  healBlue(amount){ if (this.def.noBlueHearts) return; const cap = 20 - this.redMax; this.blueCurrent = Util.clamp(this.blueCurrent + amount, 0, Math.max(0, cap)); }
  grantHeartContainer(n){
    if (this.def.noRedContainers) return;
    const cap = 20;
    const newMax = Math.min(cap - this.blueCurrent, this.redMax + n);
    const gained = Math.max(0, newMax - this.redMax);
    this.redMax = newMax;
    this.redCurrent = Math.min(this.redMax, this.redCurrent + gained);
  }

  onKill(){
    if (this.onKillHealChance && RNG.random() < this.onKillHealChance && this.redCurrent < this.redMax) this.heal(0.5);
  }

  onHitLanded(game){
    if (game && game.runStats) game.runStats.hitsLanded++;
    if (this.lifestealChance && RNG.random() < this.lifestealChance && this.redCurrent < this.redMax) {
      this.heal(0.5);
      if (game && game.runStats) game.runStats.lifestealHeals++;
    }
  }

  gainRoomClearCharge(){
    if (this.activeItem && this.activeCharge < this.activeItem.maxCharge) this.activeCharge++;

    if (this.pocketActive && this.pocketCharge < this.pocketActive.maxCharge) this.pocketCharge++;
  }
  pickupActiveItem(item){ this.activeItem = item; this.activeCharge = 0; }
}

class Enemy {
  constructor(type, tx, ty, floorNum){

    const stageMult = (typeof stageDifficultyMult === 'function') ? stageDifficultyMult(floorNum) : 1;
    const stageAggro = (typeof stageAggressionMult === 'function') ? stageAggressionMult(floorNum) : 1;
    if (typeof stageTunedType === 'function') type = stageTunedType(type, floorNum);
    this.type = type;
    this.name = type.name;
    this.x = tileToPx(tx); this.y = tileToPx(ty);
    this.radius = type.radius;

    const diffMult = (typeof difficultyStatMult === 'function') ? difficultyStatMult() : 1;
    this.hp = Math.max(1, Math.round(type.hp * enemyHpScale(floorNum) * stageMult * diffMult));
    this.maxHp = this.hp;

    const stageDmg = (typeof stageDamageMult === 'function') ? stageDamageMult(floorNum) : 1;
    this.dmg = Math.max(1, Math.round(type.dmg * stageDmg * diffMult));
    this.isChampion = false;
    this.speed = type.speed * stageAggro;
    this.flies = !!type.flies;
    this.behavior = type.behavior;
    this.color = type.color; this.dark = type.dark;
    this.contactCooldown = 0;
    this.fireTimer = Util.rand(0.4, type.fireCooldown || 1.5);
    this.pathTimer = 0;
    this.pathDir = null;
    this.navPath = null;
    this.isBoss = false;
    this.isDead = false;
    this.hitFlash = 0;
    this.knockX = 0; this.knockY = 0;
    this.fuseTimer = 0; this.arming = false;
    this.shielded = type.behavior === 'shielded';
    this.shieldTimer = type.shieldTime || 0;
    this.shieldHitCount = 0;
    this.shieldActiveTimer = 0;
    this.shieldLockoutTimer = 0;
    this.vx = 0; this.vy = 0;

    this.attackTimer = Util.rand(0.5, type.chargeCooldown || type.leapCooldown || 1.5);
    this.dashing = false; this.dashTimer = 0; this.dashVX = 0; this.dashVY = 0;
    this.telegraph = 0;
    this.splitDone = false;
    this.facingAngle = 0;

    this.orbitDir = RNG.random() < 0.5 ? -1 : 1;
    this.submerged = false;
    this.burrowTimer = type.burrowCooldown || 3;
    this.summonTimer = Util.rand(1, type.summonCooldown || 6);
    this.minionsSpawned = 0;
    this.healTimer = Util.rand(0.5, type.healCooldown || 3);
    this.triggered = false;
    this.blinkTimer = Util.rand(0.5, type.blinkCooldown || 3.5);
    this.grantedShield = false;
    this.lobTimer = 0; this.lobTime = 0; this.lobX = 0; this.lobY = 0;
    this.weavePhase = RNG.random() * Math.PI * 2;
    this.lastPX = null; this.lastPY = null;

    this.rootTimer = Util.rand(0.6, type.rootCycle || 2.4);
    this.rootStrike = 0;
    this.burnTimer = Util.rand(0.8, type.burnCooldown || 3);
    this.burnFlash = 0;
    this.burnPulse = -1;
    this.tarTimer = Util.rand(0.1, type.tarInterval || 0.4);

    this.wardOwner = null;
    this.wardTimer = 0;
    this.waveTimer = Util.rand(2, 3.5);
    this.spinTimer = 0;
    this.spinAngle = 0;
    this.bounces = 0;
    this.pyres = [];
    this.pyreDrop = 0;
    this.pulseCount = 0;
    this.pulseTimer = 0;
    this.exhaustTimer = 0;
    this.prevHp = this.hp;
    this.retaliation = 0;

    this.beatTimer = Util.rand(0.8, 1.4);
    this.burstShots = 0;
    this.shotTimer = 0;
    this.barCount = 0;
    this.clapCount = 0;
    this.buildTimer = 0;
    this.dropShots = 0;
    this.dropAngle = 0;
    this.sweepTimer = 0;
    this.sweepDir = RNG.random() < 0.5 ? -1 : 1;
    this.regenTimer = 0;
    this.phaseIndex = 0;
    this.phaseShift = 0;

    this.minions2 = false;

    this.poisonTimer = 0; this.poisonTickTimer = 0;
    this.creepTickTimer = 0;
    this.stunTimer = 0;
    this.freezeTimer = 0;
    this.fearTimer = 0;
    this.charmTimer = 0;
    this.vulnerableTimer = 0;
    for (const k in type) if (typeof type[k] === 'number' && !(k in this)) this[k] = type[k];
  }
  takeDamage(amount, kx, ky){
    if (this.shielded) {
      if (!this.isBoss) {
        this.shieldHitCount = (this.shieldHitCount || 0) + 1;
        if (this.shieldHitCount >= 3) {
          this.shielded = false;
          this.shieldHitCount = 0;
          this.shieldActiveTimer = 0;
          this.shieldLockoutTimer = 5;
        }
      }
      return false;
    }

    if (this.vulnerableTimer > 0) amount *= 1.5;
    this.hp -= amount;
    this.hitFlash = 0.15;
    this.knockX += kx || 0; this.knockY += ky || 0;
    if (this.hp <= 0) this.isDead = true;
    return true;
  }
}

class Boss extends Enemy {
  constructor(type, tx, ty, floorNum){
    super(type, tx, ty, floorNum);
    this.isBoss = true;

    const bossStageMult = (typeof stageDifficultyMult === 'function') ? stageDifficultyMult(floorNum) : 1;
    this.hp = Math.max(1, Math.round(type.hp * bossHpScale(floorNum) * bossStageMult * ((typeof difficultyStatMult === 'function') ? difficultyStatMult() : 1)));
    this.maxHp = this.hp;

    this.dmg = Math.max(1, Math.round(type.dmg * bossDmgScale(floorNum) * ((typeof difficultyStatMult === 'function') ? difficultyStatMult() : 1)));

    this.prevHp = this.hp;
    this.name = type.name;
    this.attackTimer = Util.rand(0.6, 1.3);
    this.pattern = 0;
    this.minionsSpawned = false;
    this.dashTimer = 0; this.dashing = false; this.dashVX = 0; this.dashVY = 0;
    this.telegraph = 0;
    this.shielded = false;
    this.enraged = false;
  }
}

class Miniboss extends Enemy {
  constructor(type, tx, ty, floorNum){
    super(type, tx, ty, floorNum);
    this.isMiniboss = true;
    const mbStageMult = (typeof stageDifficultyMult === 'function') ? stageDifficultyMult(floorNum) : 1;
    this.hp = Math.max(1, Math.round(type.hp * minibossHpScale(floorNum) * mbStageMult * ((typeof difficultyStatMult === 'function') ? difficultyStatMult() : 1)));
    this.maxHp = this.hp;
    this.dmg = Math.max(1, Math.round(type.dmg * minibossDmgScale(floorNum) * ((typeof difficultyStatMult === 'function') ? difficultyStatMult() : 1)));
    this.prevHp = this.hp;
    this.name = type.name;
  }
}

class Projectile {
  constructor(x, y, vx, vy, damage, owner, opts){
    opts = opts || {};
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.damage = damage; this.owner = owner;
    this.radius = opts.radius || 5;
    this.color = opts.color || (owner === 'player' ? '#c9c3ff' : '#e0895a');
    this.life = opts.life !== undefined ? opts.life : 2.5;
    this.dead = false;
    this.pierce = opts.pierce || 0;
    this.hitEnemies = [];
    this.fromBoss = !!opts.fromBoss;

    this.source = opts.source || null;

    this.homing = opts.homing || 0;
    this.spectral = !!opts.spectral;
    this.explosive = opts.explosive || 0;
    this.exploded = false;

    this.statusScale = opts.statusScale || 0;

    this.statusColor = opts.statusColor || null;

    this.appliedStatus = opts.appliedStatus || [];

    this.shape = opts.shape || 'round';

    this.sizeMult = opts.sizeMult || 1;

    this.boomerang = null;
    this.orbit = null;

    this.chainLightning = opts.chainLightning || 0;
    this.splitOnHit = opts.splitOnHit || 0;
    this.knockbackPulse = opts.knockbackPulse || 0;
    this.isSplitChild = !!opts.isSplitChild;
    this.pullPulse = opts.pullPulse || 0;
    this.chaosStatus = opts.chaosStatus || 0;
    this.creepOnHit = opts.creepOnHit || 0;
  }
}

class Obstacle {
  constructor(kind, tx, ty){
    this.kind = kind;
    this.def = OBSTACLES[kind];
    this.x = tileToPx(tx); this.y = tileToPx(ty);
    this.tx = tx; this.ty = ty;
    this.radius = kind === 'pit' ? TILE / 2 : 14;
    this.destroyed = false;
    this.isPit = kind === 'pit';
    this.destructible = !!this.def.destructible;
    this.alwaysBlocks = !!this.def.blocksFlight;
    this.tall = !!this.def.tall;
    this.isHazard = !!this.def.hazard;
    this.attackable = !!this.def.attackable;

    this.solid = !!this.def.solid;

    this.isWalkable = !!this.def.walkable;

    this.isFreezeTrap = !!this.def.freeze;

    this.pushable = !!this.def.pushable;
    this.hp = this.def.maxHp || 0;
    this.hitFlash = 0;
    this.contactCooldownTimer = 0;
    this.fireTimer = this.def.fireCooldown ? Util.rand(0.6, this.def.fireCooldown) : 0;

    this.spikeDir = null; this.spikeWallDir = null; this.spikeTargetTx = null; this.spikeTargetTy = null;
  }
}

class Pickup {
  constructor(kind, tx, ty, extra){
    this.kind = kind;
    this.x = tileToPx(tx); this.y = tileToPx(ty);
    this.radius = 9;
    this.coin = extra;
    this.pillColor = kind === 'pill' ? extra : null;
    this.starId = kind === 'star' ? extra : null;

    this.wispDyeId = kind === 'wispdye' ? extra : null;
    this.wispAugmentId = kind === 'wispaugment' ? extra : null;
    this.collected = false;
    this.bobPhase = RNG.random() * Math.PI * 2;
  }
}

class Chest {
  constructor(kind, tx, ty){
    this.kind = kind;
    this.def = CHEST_TYPES[kind] || CHEST_TYPES.grey;
    this.x = tileToPx(tx); this.y = tileToPx(ty);
    this.radius = 13;
    this.opened = false;
  }
}

class Bomb {
  constructor(x, y, owner){
    this.x = x; this.y = y; this.owner = owner;
    this.timer = 1.7;
    this.exploded = false;
    this.radius = 8;
  }
}

class Explosion {
  constructor(x, y, radius){
    this.x = x; this.y = y; this.radius = radius;
    this.life = 0.35; this.maxLife = 0.35;
  }
}

class Creep {
  constructor(x, y, radius, life, kind, source){
    this.x = x; this.y = y; this.radius = radius;
    this.life = life; this.maxLife = life;
    this.kind = kind || 'tar';

    this.source = source || 'enemy';
    this.slowMult = 0.5;

    this.seed = Math.random() * 1000;
  }
}

class DustDevil {
  constructor(x, y, radius, life, source){
    this.x = x; this.y = y; this.radius = radius;
    this.life = life; this.maxLife = life;
    this.source = source || 'enemy';
    this.ang = Math.random() * Math.PI * 2;
    this.turnRate = (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.9);
    this.speed = 34 + Math.random() * 26;
    this.pullRadius = radius + 90;
    this.tickTimer = 0;
    this.seed = Math.random() * 1000;
  }
}

class FloatText {

  constructor(x, y, text, color, isDamage){
    this.x = x; this.y = y; this.text = text; this.color = color || '#fff';
    this.life = 0.9; this.maxLife = 0.9;
    this.isDamage = !!isDamage;
  }
}

class Familiar {
  constructor(def, player, index){
    this.def = def;
    this.index = index;

    const _masteryUnlocks = ensureUnlockShape(loadUnlocks());
    const _masteryCount = (_masteryUnlocks.bestiary.familiarUseCount && _masteryUnlocks.bestiary.familiarUseCount[def.id]) || 0;
    this.masteryDmgMult = 1 + bestiaryTierFor('familiarUseCount', _masteryCount) * 0.05;
    this.x = player.x; this.y = player.y;
    this.angle = (index * 1.7) % (Math.PI * 2);
    this.fireTimer = Util.rand(0, def.cooldown || 1);
    this.contactCooldown = 0;
    this.procTimer = Util.rand(def.interval ? def.interval * 0.3 : 3, def.interval || 5);

    const hpBonus = (def.hp != null && player && player.wispHpBonus) || 0;
    this.hp = def.hp != null ? def.hp + hpBonus : null;
    this.maxHp = def.hp != null ? def.hp + hpBonus : null;
    this.dead = false;

    this.wispShotTimer = Util.rand(0, def.wispShotCooldown || 1.4);
  }
}
