const CONFIG = {
  VIEW_H: 420,
  MIN_VIEW_W: 620,
  MAX_VIEW_W: 1180,
  STEP: 1 / 120,

  GRAVITY: 3000,
  GRAVITY_HOLD: 1500,
  HOLD_TIME: 0.28,
  JUMP_V: 780,
  DOUBLE_JUMP_V: 700,
  FAST_FALL_V: 1500,
  COYOTE: 0.09,
  BUFFER: 0.13,

  START_SPEED: 370,
  MAX_SPEED: 880,
  SPEED_K: 34000,

  SCORE_DIVISOR: 10,
  CARROT_SCORE: 10,
  GOLD_CARROT_SCORE: 100,
  NEAR_MISS_SCORE: 25,
  SMASH_SCORE: 30,
  COMBO_WINDOW: 1.4,
  COMBO_MAX: 5,

  DAY_CYCLE: 52000,

  POWERUPS: {
    machete: { label: "Machete", duration: 7, color: "#8cff50" },
    magnet: { label: "Magnet", duration: 9, color: "#ff5d5d" },
    feather: { label: "Double Jump", duration: 12, color: "#7fd4ff" },
    shield: { label: "Shield", duration: 0, color: "#ffd34d" },
  },

  POWERUP_GAP_MIN: 9000,
  POWERUP_GAP_MAX: 15000,
  POWERUP_FIRST: 5000,

  OBSTACLES: {
    cactusS: { w: 26, h: 44 },
    cactusL: { w: 32, h: 64 },
    cactusDuo: { w: 64, h: 52 },
    rock: { w: 46, h: 30 },
    scorpion: { w: 40, h: 30, extra: 60 },
    tumbleweed: { w: 34, h: 34, extra: 150 },
    larper: { w: 30, h: 62 },
    fan: { w: 30, h: 56 },
    buzzard: { w: 50, h: 22, extra: 90 },
    monkey: { w: 44, h: 30, extra: 260 },
  },

  BOSS: {
    FIRST_SCORE: 1000,
    GAP: 1800,
    GAP_GROWTH: 400,
    WARNING: 1.8,
    ATTACKS: 6,
    ATTACKS_PER_TIER: 2,
    INTERVAL: 1.35,
    INTERVAL_MIN: 0.75,
    INTERVAL_DECAY: 0.12,
    TELEGRAPH: 0.5,
    PROJECTILE_MULT: 1.3,
    BONUS: 500,
  },

  BOSSES: [
    { id: "bear", name: "Giant Nestle Bear", w: 96, h: 116, body: "#6b4226", belly: "#a8703e", accent: "#c62828", attack: "choc" },
    { id: "nyx", name: "Lilac Nyx", w: 96, h: 96, body: "#b47fe5", mane: "#4b2d73", wing: "#5b3a8a", attack: "bolt" },
    { id: "king", name: "The King of Ukraine", w: 76, h: 116, robe: "#2d5fd6", trim: "#ffd34d", attack: "flower" },
    { id: "hugeponer", name: "Hugeponer", w: 100, h: 120, shirt: ["#c8102e", "#ffffff", "#012169"], skin: "#e8b48c", attack: "pint" },
  ],

  SKINS: [
    { id: "dusty", name: "Dusty", coat: "#9b6a43", dark: "#6e4528", muzzle: "#d9b48c", mane: "#3d2617", blanket: "#d6453a", trim: "#ffd34d", req: null },
    { id: "ash", name: "Ash", coat: "#8f8b87", dark: "#635f5c", muzzle: "#d8d2c8", mane: "#3a3634", blanket: "#2a9d8f", trim: "#e9f5db", req: { type: "carrots", n: 100, text: "Collect 100 carrots total" } },
    { id: "pinto", name: "Pinto", coat: "#efe6d8", dark: "#b9a993", muzzle: "#f7efe4", mane: "#5a3a22", blanket: "#3a6ea5", trim: "#f4d35e", patches: "#8a5a35", req: { type: "best", n: 1500, text: "Score 1,500 in one run" } },
    { id: "prospector", name: "Prospector", coat: "#7a5233", dark: "#523520", muzzle: "#c9a27a", mane: "#2a1a10", blanket: "#5c7a3a", trim: "#c9a227", hat: true, req: { type: "runs", n: 10, text: "Play 10 runs" } },
    { id: "midnight", name: "Midnight", coat: "#3b3142", dark: "#241d2a", muzzle: "#6b5a78", mane: "#120d16", blanket: "#7b4fd6", trim: "#9ef0ff", glowEyes: true, req: { type: "bosses", n: 1, text: "Defeat a boss" } },
    { id: "golden", name: "Golden", coat: "#e8b83a", dark: "#b8861c", muzzle: "#fbe3a0", mane: "#8a5a10", blanket: "#ffffff", trim: "#e8b83a", sparkle: true, crown: true, req: { type: "best", n: 5000, text: "Score 5,000 in one run" } },
  ],

  GROWTH: {
    STORAGE_KEY: "muleGrowthState",
    MAX_OFFLINE_SECONDS: 60 * 60 * 24 * 7,
    WELCOME_BACK_SECONDS: 60,
    STAGES: [
      { seconds: 0, label: "Foal", scale: 0.86 },
      { seconds: 10 * 60, label: "Young Mule", scale: 0.93 },
      { seconds: 2 * 60 * 60, label: "Adult Mule", scale: 1.0 },
      { seconds: 12 * 60 * 60, label: "Elder Mule", scale: 1.05 },
      { seconds: 3 * 24 * 60 * 60, label: "Legendary Mule", scale: 1.1 },
    ],
  },

  SAVE_KEY: "muleRun.save.v2",
  LEGACY_BEST_KEY: "muleRunHighScore",
  MUSIC_BPM: 174,
};
