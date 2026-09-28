'use strict';

const MENU_BACKDROP_PALETTE = ['#8b5cf6', '#4fd1c5', '#e3c15b', '#e35b6a', '#5b9ee3'];
const MENU_BACKDROP_COUNT = 46;
const MENU_STARS_FAR = 60;
const MENU_STARS_NEAR = 30;
const MENU_SHOOTER_MIN_GAP = 4;
const MENU_SHOOTER_MAX_GAP = 9;

let menuBackdropCanvas = null;
let menuBackdropCtx = null;
let menuBackdropParticles = null;
let menuBackdropStars = null;
let menuBackdropShooters = [];
let menuBackdropShooterTimer = MENU_SHOOTER_MIN_GAP;
let menuBackdropTime = 0;
let menuBackdropReducedQuery = null;

function menuBackdropReducedMotion(){
  if (!menuBackdropReducedQuery && window.matchMedia) {
    menuBackdropReducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  }
  return !!(menuBackdropReducedQuery && menuBackdropReducedQuery.matches);
}

function ensureMenuBackdropSized(){
  if (!menuBackdropCanvas) menuBackdropCanvas = document.getElementById('menuBackdrop');
  if (!menuBackdropCanvas) return false;
  if (!menuBackdropCtx) menuBackdropCtx = menuBackdropCanvas.getContext('2d');
  const w = window.innerWidth, h = window.innerHeight;
  if (menuBackdropCanvas.width !== w || menuBackdropCanvas.height !== h) {
    menuBackdropCanvas.width = w;
    menuBackdropCanvas.height = h;

    menuBackdropParticles = null;
    menuBackdropStars = null;
    menuBackdropShooters.length = 0;
  }
  return true;
}

function seedMenuBackdropParticles(){
  const w = menuBackdropCanvas.width, h = menuBackdropCanvas.height;
  menuBackdropParticles = [];
  for (let i = 0; i < MENU_BACKDROP_COUNT; i++) {
    menuBackdropParticles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.8 + Math.random() * 1.8,
      speed: 6 + Math.random() * 14,
      sway: 8 + Math.random() * 18,
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: 0.15 + Math.random() * 0.25,
      color: Util.choice(MENU_BACKDROP_PALETTE),
      alphaPhase: Math.random() * Math.PI * 2,
      alphaSpeed: 0.3 + Math.random() * 0.5,
    });
  }
}

function seedMenuBackdropStars(){
  const w = menuBackdropCanvas.width, h = menuBackdropCanvas.height;
  menuBackdropStars = [];
  for (let i = 0; i < MENU_STARS_FAR; i++) {
    menuBackdropStars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.4 + Math.random() * 0.7,
      speed: 1.5 + Math.random() * 3,
      base: 0.16 + Math.random() * 0.16,
      twinkle: 0,
      phase: Math.random() * Math.PI * 2,
      rate: 0,
      color: '#dfe6ff',
    });
  }
  for (let i = 0; i < MENU_STARS_NEAR; i++) {

    const tinted = Math.random() < 0.35;
    menuBackdropStars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 1.1 + Math.random() * 1.3,
      speed: 7 + Math.random() * 11,
      base: 0.4 + Math.random() * 0.2,
      twinkle: 0.28 + Math.random() * 0.22,
      phase: Math.random() * Math.PI * 2,
      rate: 0.7 + Math.random() * 1.5,
      color: tinted ? Util.choice(MENU_BACKDROP_PALETTE) : '#ffffff',
    });
  }
}

function spawnMenuBackdropShooter(){
  const w = menuBackdropCanvas.width, h = menuBackdropCanvas.height;
  const dir = Math.random() < 0.5 ? 1 : -1;
  const angle = (25 + Math.random() * 35) * Math.PI / 180;
  const speed = 620 + Math.random() * 420;
  const vx = Math.cos(angle) * speed * dir;
  const vy = Math.sin(angle) * speed;
  menuBackdropShooters.push({
    x: dir === 1 ? Math.random() * w * 0.5 : w * 0.5 + Math.random() * w * 0.5,
    y: Math.random() * h * 0.45,
    vx, vy,
    len: 90 + Math.random() * 110,
    ttl: 0.45 + Math.random() * 0.4,
    life: 0,
  });
}

function updateMenuBackdropShooters(dt, ctx){
  for (let i = menuBackdropShooters.length - 1; i >= 0; i--) {
    const s = menuBackdropShooters[i];
    s.life += dt;
    if (s.life >= s.ttl) { menuBackdropShooters.splice(i, 1); continue; }
    s.x += s.vx * dt;
    s.y += s.vy * dt;

    const t = s.life / s.ttl;
    const alpha = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
    const mag = Math.hypot(s.vx, s.vy) || 1;
    const tx = s.x - (s.vx / mag) * s.len, ty = s.y - (s.vy / mag) * s.len;

    const grad = ctx.createLinearGradient(s.x, s.y, tx, ty);
    grad.addColorStop(0, 'rgba(255,255,255,' + (0.9 * alpha).toFixed(3) + ')');
    grad.addColorStop(0.35, 'rgba(200,215,255,' + (0.35 * alpha).toFixed(3) + ')');
    grad.addColorStop(1, 'rgba(200,215,255,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();

    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function renderMenuBackdrop(dt){
  if (!ensureMenuBackdropSized()) return;
  if (!menuBackdropParticles) seedMenuBackdropParticles();
  if (!menuBackdropStars) seedMenuBackdropStars();
  const reduced = menuBackdropReducedMotion();
  const ctx = menuBackdropCtx;
  const w = menuBackdropCanvas.width, h = menuBackdropCanvas.height;
  ctx.clearRect(0, 0, w, h);

  if (reduced) {

    for (const s of menuBackdropStars) {
      ctx.globalAlpha = s.base;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const p of menuBackdropParticles) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    return;
  }

  menuBackdropTime += dt;

  for (const s of menuBackdropStars) {
    s.y -= s.speed * dt;
    if (s.y < -4) { s.y = h + 4; s.x = Math.random() * w; }
    const alpha = s.twinkle
      ? s.base + s.twinkle * (0.5 + 0.5 * Math.sin(menuBackdropTime * s.rate + s.phase))
      : s.base;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const p of menuBackdropParticles) {
    p.y -= p.speed * dt;
    if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
    const sway = Math.sin(menuBackdropTime * p.swaySpeed + p.swayPhase) * p.sway;
    const alpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(menuBackdropTime * p.alphaSpeed + p.alphaPhase));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x + sway, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  menuBackdropShooterTimer -= dt;
  if (menuBackdropShooterTimer <= 0) {
    spawnMenuBackdropShooter();
    menuBackdropShooterTimer = MENU_SHOOTER_MIN_GAP + Math.random() * (MENU_SHOOTER_MAX_GAP - MENU_SHOOTER_MIN_GAP);
  }
  updateMenuBackdropShooters(dt, ctx);
}
