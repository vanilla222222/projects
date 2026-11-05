# Reference notes from Terraria

Fathom is its own game, but several systems are worth building on known-good foundations
rather than on an impression of them. These facts were read from the official wiki
(terraria.wiki.gg) on 2026-11-05 and apply to Desktop/Console/Mobile 1.4.4+. Where Fathom
departs deliberately, that is noted. Nothing here is recalled; anything not on this page was
not checked.

## Walls — *Walls*

- Walls are tiles that draw **behind everything else, including blocks**. They are one of the
  three things a world is made of, alongside blocks and liquids. They are **never collidable**.
- A wall and a block can occupy the same tile. The wall is what remains when the block is
  mined out.
- Placement: on any tile that **does not already contain a wall**, provided the tile is
  **adjacent to another wall or block**. Walls have their own placement layer.
- Removal: a **hammer** or explosives. Not a pickaxe.
- **Safe vs unsafe is the mechanically important distinction.** Safe walls stop enemies
  spawning in front of them and are required for a structure to count as an NPC house or for a
  bed to set a spawn point. Unsafe walls do neither. **Most player-placed walls are safe; most
  naturally generated walls are unsafe.** Unsafe walls must be removed starting from an edge —
  a tile adjacent to open space with no wall.
- Torches, paintings, signs, switches and item frames can be placed **directly on a wall** with
  no block beneath them.

## Inventory — *Inventory*

| section | slots |
|---|---|
| hotbar | 10 |
| main inventory | 40 |
| coins | 4 |
| ammo | 4 |
| trash | 1 |
| armor | 3 |
| vanity armor | 3 |
| armor dye | 3 |
| accessories | 5, 6 or 7 |
| vanity accessories | 5, 6 or 7 |

- Accessory count is difficulty-dependent: 5 in Classic; 5 in Expert, rising to 6 after a Demon
  Heart; 6 in Master, rising to 7. Any accessory fits any accessory slot.
- **Stack limit is 9999** on current versions. The familiar 999 for blocks and walls is the
  old-gen console and 3DS rule, where the limit was per-item.
- A stack is split by picking up a single item from it with the Open/Activate key.
- An item held on the cursor counts as removed from the inventory and is dropped if the
  inventory closes.

## Health — *Health*

- Start: **100**, shown as 5 red hearts. A red heart is **20 HP**; a gold heart is **25 HP**.
- Life Crystal: **+20** each, to a cap of **400** (20 red hearts, so 15 crystals).
- Life Fruit: **+5 per heart**, turning each heart gold; 20 of them reach **500**.
- A Lifeforce Potion lifts the cap temporarily to **600**.
- Regeneration rises **the longer the player avoids taking damage**, with a **further boost for
  standing still**, and more from equipment, potions and nearby campfires or heart lanterns.

## Mana — *Mana*

- Start: **20**, shown as one star. A star is **20 mana**.
- Mana Crystal: **+20**, usable **9 times**, to a cap of **200** (10 stars).
- Regeneration is **slower while mana is being spent**, **faster standing still**, and faster
  the **larger the player's total mana**.
- Casting without enough mana is allowed, at a **60% attack speed penalty**.

## Trees — *Trees*

- **"Trees are background objects that do not affect player or enemy movement."** You walk
  through them. They cannot be climbed, and blocks cannot be placed overlapping their limbs,
  but platforms and torches can be attached to a trunk.
- Cutting the **lowermost centre tile destroys the whole tree**. Parts left standing do not
  regrow.
- Yield is **1–2 wood per tile**, branches included, and up to **one acorn per leaf patch**.
  Axe power sets both the hits per tile and the average wood yield.
- Blocks directly beneath a tree cannot be destroyed.
- A sapling needs **one horizontal open space either side** and appropriate ground — grass,
  snow or sand.

## Where Fathom departs

- Fathom has no difficulty modes, so accessory slots are a fixed count rather than 5/6/7.
- Fathom's stack limit is its own choice; 9999 suits a game with Terraria's item breadth and
  Fathom has far fewer item types.
- Fathom has no NPCs yet, so the safe/unsafe wall distinction currently affects only whether a
  wall reads as natural or built. It is modelled now because retrofitting it later would mean
  rewriting every generated wall.
