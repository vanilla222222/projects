# Nightfall Defense: the big update

There are ten slices, built in order. Each one is large, and each is merged and pushed before the next starts.

## Gates for every slice

- No console errors at 1280px or 390px wide.
- `tools/e2e.js` passes, extended with the slice's new flows.
- `tools/balance.js` runs and its result is written in the slice audit.
- Saves from the previous version load and migrate. The save key stays the same and the save carries a `ver` field.
- No code comments in source files and no build step.
- Each slice writes `audits/slice-N.md`.

## 1. Balance, feel and polish

- **Seeded randomness:** crits, stuns and procs come from a seeded RNG per wave attempt, so balance runs are repeatable.
- **Difficulty:** smooth the walls at waves 30–45 and 86–100. Aim for a steady difficulty curve plus boss spikes, and keep about 2h to wave 50 and 6h to wave 100.
- **Game speed:** 1x, 2x and 4x, with a pause.
- **Feedback:**
  - floating damage numbers;
  - hit flashes, death puffs and projectile trails;
  - a screen shake on boss spawn that can be turned off;
  - a boss health bar and wave preview, showing the enemy mix of the next wave before you start it.
- **Sound:** WebAudio synth effects for hits, kills, placing, upgrading and boss arrival, with a mute toggle.
- **Quality of life:**
  - hotkeys 1, 2 and 3 to pick ponies;
  - U to open upgrades, S to sell;
  - range circles for every pony while holding Shift;
  - an "upgrade max affordable" button;
  - tooltips on every node;
  - per-pony stats for damage dealt and kills.
- **Settings panel:** sound, shake, damage numbers, and number format.

## 2. Map system and maps 2–5

- **Map system:**
  - maps are data: path polylines, which can fork or loop, plus no-build zones, decor and a palette;
  - each map has its own wave progress, first-clear record, towers and cash multiplier;
  - a map select screen with previews and lock state;
  - map N+1 unlocks at wave 50 on map N.
- **Map 1, Moonlit Road:** the existing straight path.
- **Map 2, Whispering Woods:** a winding S-path through trees, which block some placement.
- **Map 3, Crystal Caverns:** a forked path where enemies split between two exits. It is dark, and ponies have a reduced range unless they are near a glowing crystal.
- **Map 4, Stormy Cliffs:** a path that crosses itself on a bridge, with wind gusts that push flyers.
- **Map 5, Castle of Shadows:** a spiral path with two spawn gates and the hardest waves.
- **Scaling:** each map scales HP, rewards and bosses. Every map has 100 waves and its own 10 bosses.

## 3. New pony races: bat pony and crystal pony

- **Bat pony:**
  - a night hunter that can hit flyers;
  - bonus damage to fast enemies;
  - sonar can reveal stealth enemies on one path.
- **Crystal pony:**
  - a support pony that buffs the damage and rate of nearby ponies;
  - crystal walls slow enemies;
  - one path can hit magical enemies.
- **Upgrades:** each race gets 5 paths of 10 nodes, the 2-path limit, the infinite Damage and Rate upgrades, signature node 10 abilities, and the x1.5 cost per copy.
- **Art and controls:** procedural art matching the roguelike's bat and crystal ponies, and hotkeys 4 and 5.

## 4. New enemy types

- **Healer:** heals nearby DNBs.
- **Splitter:** splits into 2–3 smaller DNBs on death.
- **Stealth:** invisible unless a pony has detection (from a bat pony path, a unicorn path, or near a crystal).
- **Burrower:** goes underground on part of the path and can't be hit there.
- **Shield-bearer:** projects a damage-absorbing shield over nearby DNBs.
- **Armored:** flat damage reduction, so it needs big hits.
- **Swarm:** many tiny, fast DNBs.
- **Bosses:** each map's boss roster uses the new types.
- **Codex:** a page that unlocks each enemy when first seen.

## 5. Prestige: map stars

- **Starring up:** after clearing wave 100 on a map, you can star it up.
- **Each star:**
  - resets that map's towers on the board, its cash and its wave progress;
  - raises the map to a higher difficulty;
  - grants Moonstones.
- **Difficulty per star:**
  - more HP and speed;
  - new modifiers per star, such as armored bosses, faster spawns, enemy regeneration, fewer lives, and elite variants.
- **Display:** stars show on the map select screen, up to 5 per map.
- **Moonstones:** spent in a global Research tree, with about 30 nodes across 4 branches:
  - Economy: starting cash, kill cash and first-clear bonus;
  - Ponies: base damage, cheaper first copy, and range;
  - Abilities: signature power and cooldowns;
  - Utility: extra lives, a starting wave skip, and auto-place presets.
- **Persistence:** research is permanent and global. Starring a map never removes research.

## 6. Hero pony

- **Heroes:** one hero per map run, chosen from 4 heroes, each with a unique kit:
  - Twilight-like unicorn mage;
  - earth pony tank;
  - pegasus speedster;
  - bat pony assassin.
- **Movement:** click or tap to move the hero around the field.
- **Progression:**
  - the hero levels 1–30 within a map from XP gained from kills;
  - 3 active abilities on cooldown, with hotkeys Q, W and E;
  - 1 passive aura.
- **Unlocks:** new heroes unlock with Moonstones or achievements.
- **Resets:** the hero's level resets with a map star.

## 7. Offline earnings and idle automation

- **Offline cash:** earned on return, based on the best wave you can farm on the active map. It is capped at 8h, extendable through research, and shown in a welcome-back summary.
- **Auto-farm:** loops the best wave that is safe to farm.
- **Auto-upgrade rules** per pony or per race, such as "buy Damage when affordable" or "follow path X to node N".
- **Auto-place presets:** save a board layout with its upgrades and rebuild it with one click after a star reset.

## 8. Challenges and achievements

- **Daily challenge:** a seeded map, wave set and rule modifiers, such as "unicorns only", "no selling", "flyers only" or "double speed". It gives a Moonstone reward and keeps a local best score.
- **Challenge list:** about 12 permanent challenges with fixed rules and one-time rewards.
- **Achievements:** about 50, each with a small permanent bonus.
- **Stats page:** total kills, cash earned, playtime, and favourite pony.

## 9. Codex, cosmetics and pony customisation

- **Codex:** a bestiary for enemies (lore, stats, weaknesses), plus pages for ponies and bosses.
- **Pony skins:** unlocked by achievements, challenges and stars. They include coat colours, manes, accessories and special effects.
- **Projectile and impact effect themes.**
- **Name your ponies:** a pony that reaches high levels earns a title.
- **Map decor themes:** seasonal palettes.

## 10. Endless mode and final polish

- **Endless mode:** unlocked per map after its first star. Waves past 100 scale forever, rare mutators are mixed in, and a local best record is kept.
- **Records:** a local leaderboard per map and star level.
- **Save management:** export and import save codes.
- **Performance:** object pooling, efficient handling of many enemies, and a check that 4x speed holds 60 fps with 300 enemies.
- **Final polish:** a full balance pass across maps 1–5 at stars 0–5, a tutorial on first launch, a credits page, and an accessibility check covering a colourblind-safe palette option and readable font sizes.
