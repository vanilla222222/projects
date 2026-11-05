# Mandatory Blueprint expansions

- Workshop automatically starts a required Mining → Mastery → Rebirth → Smeltery → Forest → Sawmill → Workshop chain. Five fresh-production milestones per addition target roughly 20 minutes. Finishing one addition unlocks and opens the next; no project can be skipped. There are no Stats or Achievements expansions.
- Smeltery expansion opens Forest; Nursery completion builds Sawmill. These rewards replace their old standalone Silicon and Spruce-log unlock fees. Existing purchased base tabs remain open in legacy saves.
- Mining: Geode-bearing tiles, ore caches and permanent ore bonuses.
- Mastery: selectable ore focus, focused yield and Mastery discounts.
- Rebirth: selectable permanent ore, automation or Mastery talent.
- Smeltery: Electrum from Gold and Silver, with new automation, ore and research upgrades.
- Forest: targeted Nursery planting, a configurable automated Charcoal reserve, and log bonuses. Processed trees include both harvests and burns for expansion progress.
- Sawmill: each completed cut supplies an offcut; three offcuts produce a Beam. Joinery jigs and milestones improve plank output. No extra plank stockpile is required to start this addition.
- Workshop: choose one research line to specialize in, improving its existing bonus.
- Separate fresh-production ledgers preserve progress through resource spending, rebirth, offline production and reload, including when lifetime balances are very large. Current targets stay fixed. Future expansions cannot receive progress early.
- Mobile-friendly expansion panels, 44px controls and native selectors use the existing navigation and theme. Core, game and style assets are cache-bumped together.

The prior hour-scale path and prices up to Workshop remain intact. The required chapter replaces the old downstream unlock sequence. All pre-existing saves remain under `vanilla-incremental-save-v1`; older saves start the chain when Workshop is available. Full reset still erases all progress. See BALANCE.md and expansion-results.json for calibration assumptions and limitations.
