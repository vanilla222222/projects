// Shared constants for Mule Run.
// Logical game coordinates are fixed and the canvas is scaled to fit —
// this keeps physics predictable no matter the screen size.
const CONFIG = {
  WIDTH: 900,
  HEIGHT: 300,
  GROUND_Y: 240,

  GRAVITY: 0.62,
  JUMP_VELOCITY: -12.5,

  START_SPEED: 5.2,
  MAX_SPEED: 13,
  SPEED_RAMP: 0.0012, // added to speed every frame while playing

  MULE_X: 90,
  MULE_SIZE: 46,

  MIN_SPAWN_GAP: 46,   // frames, at max difficulty
  MAX_SPAWN_GAP: 95,   // frames, at min difficulty

  COIN_SCORE: 10,
  DISTANCE_SCORE_DIVISOR: 8, // higher = score climbs slower with distance

  STORAGE_KEY: "muleRunHighScore",

  OBSTACLE_TYPES: [
    { emoji: "🌵", width: 34, height: 46, groundOnly: true },
    { emoji: "🌵", width: 44, height: 58, groundOnly: true },
    { emoji: "🪨", width: 34, height: 30, groundOnly: true },
    { emoji: "🦂", width: 30, height: 24, groundOnly: true },
    { custom: "soyjak", width: 30, height: 52, groundOnly: true }, // hype fan blocking the trail
    { custom: "larper", width: 36, height: 54, groundOnly: true }, // foam-sword warrior blocking the trail
  ],

  COLLECTIBLE_EMOJI: "🥕",

  // Airborne hazard: monkeys riding rockets, swooping through the sky on
  // a sine-wave flight path. Rarer than ground obstacles, and their dips
  // force a well-timed jump rather than an instinctive one.
  ROCKET_MONKEY: {
    SIZE: 34,
    SPEED_MULTIPLIER: 1.55, // flies faster than the world scroll speed
    BASE_Y: 150,            // center of the flight band
    BASE_Y_JITTER: 25,
    AMPLITUDE: 72,          // how far above/below BASE_Y it swoops
    FREQUENCY: 0.055,       // radians added to phase per frame
    SPAWN_MIN_GAP: 320,     // frames, at max difficulty
    SPAWN_MAX_GAP: 620,     // frames, at min difficulty
    FIRST_SPAWN_DELAY: 260, // grace period before the first one appears
  },

  // Rare power-up: a glowing green machete. Grants "smash mode" — obstacles
  // and rocket monkeys get sliced for bonus points instead of ending the run.
  MACHETE: {
    SIZE: 32,
    DURATION_FRAMES: 360,   // ~6s of smash mode at 60fps
    SPAWN_MIN_GAP: 1400,    // frames, at max difficulty
    SPAWN_MAX_GAP: 2600,    // frames, at min difficulty
    FIRST_SPAWN_DELAY: 700,
    KILL_SCORE: 25,
  },

  // Persistent idle growth. The mule ages in real wall-clock time whether
  // the tab is open or closed — the elapsed gap since your last visit is
  // read back from localStorage on load, so it keeps growing offline.
  GROWTH: {
    STORAGE_KEY: "muleGrowthState",
    MAX_OFFLINE_SECONDS: 60 * 60 * 24 * 7, // cap a single absence at 7 days
    WELCOME_BACK_THRESHOLD_SECONDS: 60,     // only show the banner past 1 min away
    STAGES: [
      { seconds: 0, label: "Foal", scale: 0.72 },
      { seconds: 10 * 60, label: "Young Mule", scale: 0.86 },
      { seconds: 2 * 60 * 60, label: "Adult Mule", scale: 1.0 },
      { seconds: 12 * 60 * 60, label: "Elder Mule", scale: 1.14 },
      { seconds: 3 * 24 * 60 * 60, label: "Legendary Mule", scale: 1.3 },
    ],
  },

  MUSIC_BPM: 174, // classic drum & bass tempo

  // Boss fights: a fictional, purely-for-fun roster (no real people depicted —
  // "The King of Ukraine" and "Hugeponer" are original made-up characters,
  // and the bear is just a big candy-colored bear, no branding traced).
  // They cycle in order; each full lap through the roster raises the tier.
  BOSSES: [
    {
      id: "bear",
      name: "Giant Nestle Bear",
      width: 92, height: 112,
      bodyColor: "#6b4226",
      bellyColor: "#a8703e",
      accentColor: "#c62828",
      attackEmoji: "🍫",
    },
    {
      id: "nyx",
      name: "Lilac Nyx",
      width: 88, height: 92,
      bodyColor: "#b47fe5",
      maneColor: "#4b2d73",
      wingColor: "rgba(75, 45, 115, 0.75)",
      attackEmoji: null, // custom glowing shadow-bolt, drawn procedurally
    },
    {
      id: "ukraine",
      name: "The King of Ukraine",
      width: 72, height: 112,
      robeColor: "#2d5fd6",
      trimColor: "#ffd34d",
      attackEmoji: "🌻",
    },
    {
      id: "hugeponer",
      name: "Hugeponer",
      width: 96, height: 120,
      shirtColors: ["#c8102e", "#ffffff", "#012169"],
      skinColor: "#e8b48c",
      attackEmoji: "🍺",
    },
  ],

  BOSS: {
    FIRST_TRIGGER_SCORE: 400,
    SCORE_INCREMENT: 1200,        // score gap until the next boss, per cycle
    SCORE_INCREMENT_GROWTH: 300,  // extra gap added per full lap through the roster
    WARNING_FRAMES: 110,          // "BOSS INCOMING" banner duration
    SLIDE_IN_SPEED: 10,           // screen-space px/frame while entering
    HOLD_MARGIN: 40,              // gap kept from the right edge while dueling
    BASE_ATTACKS_TO_SURVIVE: 6,
    ATTACKS_PER_TIER: 2,
    BASE_ATTACK_INTERVAL: 85,     // frames between attacks, tier 0
    ATTACK_INTERVAL_MIN: 40,
    ATTACK_INTERVAL_DECAY_PER_TIER: 6,
    TELEGRAPH_FRAMES: 34,         // wind-up warning flash before each attack fires
    ENTRY_GRACE_FRAMES: 60,       // breathing room after the boss slides in
    PROJECTILE_SPEED_MULT: 1.35,
    PROJECTILE_SIZE: 30,
    VICTORY_FRAMES: 110,
    BONUS_SCORE: 500,
  },
};
