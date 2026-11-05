# Hour-scale progression and Workshop update

- Main path: Mines → Mastery → Rebirth → Smeltery → Workshop → Forest → Sawmill. Costs and prerequisites target about one hour per major stage, with no elapsed-playtime gates. Achievements and Stats are utility tabs.
- Automation (1,000 Stone), Pickaxe (1,500 Silver), Achievements (250 Diamond) and Offline Mining (5,000 Gold) arrive inside the Mines stage. Major gates are Mastery (1.5B Dirt), Rebirth (900B Copper), Smeltery (500B Iron after one rebirth), Workshop (5,000 Copper Ingots), Forest (250K Silicon after Workshop), and Sawmill (50K Spruce logs).
- Smelters start at 3 base output; the second Gold smelting expansion costs 1,000 Gold Ingots. Existing upgrades still add output and speed.
- Workshop: six permanent research lines with 42 total levels. Ingots and planks improve ore yields, autominer speed, ingot output, special-tile frequency, and chopping. Research buys one level per click independently of the Buy selector.
- Steel unlocks with Forest, consuming 1,000 Iron and 5 Charcoal per batch. Permanent Steel upgrades include a forged axe head, steel saw teeth, and mine supports. In-progress batches refund both ingredients when switching recipes.
- Tougher tree species enter new spawn rolls as chopping damage increases; the next threshold is shown. Existing saved trees retain their species and HP.
- New milestone guidance and Workshop achievements. Mobile tabs and wallet scroll horizontally; purchases and allocation buttons have larger targets. Opt-in drag mining preserves normal scrolling when off. Reduced-motion preference is respected.
- Cleared saved layers now advance after reload; reset cancels pending transitions and clears old generation flags.

Existing `vanilla-incremental-save-v1` saves are retained. Previously purchased unlocks stay purchased even if their new price/prerequisite is higher; no refunds or automatic purchases are applied. Research and Steel default to zero in older saves. Existing Forest/Sawmill saves inherit Workshop access. Rebirth retains research, Steel upgrades, ingots, planks and unlocks; full reset erases all progress.

Validation: `node --test "vanilla incremental/game.test.cjs"`. See `BALANCE.md` for estimated timings, reference-player assumptions and limits.
