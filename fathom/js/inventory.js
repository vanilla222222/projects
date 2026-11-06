'use strict';
// Slot-based inventory. Sections are contiguous ranges over one slot array, so a move between
// the hotbar and the backpack is the same operation as a move within either. Every mutation
// returns what it could not do rather than throwing, because the caller is a mouse.
// REFERENCE.md records the Terraria layout this follows and where Fathom departs.

const STACK_MAX = 999;

const LAYOUT = [
  { key: 'hotbar', label: 'Hotbar', size: 10 },
  { key: 'main', label: 'Backpack', size: 40 },
  { key: 'armor', label: 'Armour', size: 3, accepts: 'armor' },
  { key: 'accessory', label: 'Accessories', size: 6, accepts: 'accessory' },
  { key: 'vanity', label: 'Vanity', size: 3, accepts: 'armor' },
  { key: 'trash', label: 'Trash', size: 1 }
];

function makeInventory(spec) {
  const layout = spec || LAYOUT;
  const sections = {};
  let cursorIndex = 0;
  for (const section of layout) {
    sections[section.key] = { ...section, from: cursorIndex, to: cursorIndex + section.size };
    cursorIndex += section.size;
  }
  const slots = new Array(cursorIndex).fill(null);
  let held = null;

  function section(key) {
    const found = sections[key];
    if (!found) throw new Error('unknown inventory section: ' + key);
    return found;
  }

  function sectionOf(index) {
    for (const s of Object.values(sections)) {
      if (index >= s.from && index < s.to) return s;
    }
    return null;
  }

  function accepts(index, item) {
    if (!item) return true;
    const s = sectionOf(index);
    if (!s || !s.accepts) return true;
    return item.kind === s.accepts;
  }

  function stackLimit(item) {
    if (!item) return STACK_MAX;
    if (item.kind === 'armor' || item.kind === 'accessory' || item.kind === 'tool') return 1;
    return item.max || STACK_MAX;
  }

  function sameItem(a, b) {
    return !!a && !!b && a.key === b.key && a.kind === b.kind;
  }

  // Fills partial stacks before empty slots, which is what makes picking things up feel
  // right: a mined block joins the stack you already have rather than opening a new slot.
  function add(item, count, range) {
    let left = count;
    const from = range ? section(range).from : 0;
    const to = range ? section(range).to : slots.length;
    const trash = sections.trash;
    for (let pass = 0; pass < 2 && left > 0; pass += 1) {
      for (let i = from; i < to && left > 0; i += 1) {
        if (trash && i >= trash.from && i < trash.to) continue;
        const slot = slots[i];
        if (pass === 0) {
          if (!sameItem(slot, item)) continue;
          const room = stackLimit(slot) - slot.count;
          if (room <= 0) continue;
          const moved = Math.min(room, left);
          slot.count += moved;
          left -= moved;
        } else {
          if (slot !== null || !accepts(i, item)) continue;
          const moved = Math.min(stackLimit(item), left);
          slots[i] = { ...item, count: moved };
          left -= moved;
        }
      }
    }
    return left;
  }

  function countOf(key) {
    let n = 0;
    for (const slot of slots) if (slot && slot.key === key) n += slot.count;
    return n;
  }

  function take(key, count) {
    let left = count;
    for (let i = slots.length - 1; i >= 0 && left > 0; i -= 1) {
      const slot = slots[i];
      if (!slot || slot.key !== key) continue;
      const moved = Math.min(slot.count, left);
      slot.count -= moved;
      left -= moved;
      if (slot.count <= 0) slots[i] = null;
    }
    return count - left;
  }

  // One click: take the whole stack, drop the whole stack, merge into a like stack, or swap.
  function clickSlot(index) {
    if (index < 0 || index >= slots.length) return false;
    const slot = slots[index];
    if (!held) {
      if (!slot) return false;
      held = slot;
      slots[index] = null;
      return true;
    }
    if (!accepts(index, held)) return false;
    if (!slot) {
      slots[index] = held;
      held = null;
      return true;
    }
    if (sameItem(slot, held)) {
      const room = stackLimit(slot) - slot.count;
      if (room <= 0) {
        const swap = slots[index];
        slots[index] = held;
        held = swap;
        return true;
      }
      const moved = Math.min(room, held.count);
      slot.count += moved;
      held.count -= moved;
      if (held.count <= 0) held = null;
      return true;
    }
    if (!accepts(index, held)) return false;
    const swap = slots[index];
    slots[index] = held;
    held = swap;
    return true;
  }

  // Right click: take half of an untouched stack, or place one at a time from the hand.
  function splitSlot(index) {
    if (index < 0 || index >= slots.length) return false;
    const slot = slots[index];
    if (held) {
      if (slot && !sameItem(slot, held)) return false;
      if (!accepts(index, held)) return false;
      if (slot && slot.count >= stackLimit(slot)) return false;
      if (slot) slot.count += 1;
      else slots[index] = { ...held, count: 1 };
      held.count -= 1;
      if (held.count <= 0) held = null;
      return true;
    }
    if (!slot) return false;
    const half = Math.ceil(slot.count / 2);
    held = { ...slot, count: half };
    slot.count -= half;
    if (slot.count <= 0) slots[index] = null;
    return true;
  }

  // Move a stack to the other grid: hotbar to backpack and back, which is the shift-click verb.
  function quickMove(index) {
    const slot = slots[index];
    if (!slot) return false;
    const s = sectionOf(index);
    const target = s && s.key === 'hotbar' ? 'main' : 'hotbar';
    const left = add(slot, slot.count, target);
    if (left === slot.count) return false;
    slot.count = left;
    if (slot.count <= 0) slots[index] = null;
    return true;
  }

  function sort(range) {
    const s = section(range || 'main');
    const items = [];
    for (let i = s.from; i < s.to; i += 1) {
      if (slots[i]) items.push(slots[i]);
      slots[i] = null;
    }
    items.sort((a, b) => (a.kind === b.kind ? a.key.localeCompare(b.key) : a.kind.localeCompare(b.kind)));
    const merged = [];
    for (const item of items) {
      const last = merged[merged.length - 1];
      if (last && sameItem(last, item) && last.count < stackLimit(last)) {
        const room = stackLimit(last) - last.count;
        const moved = Math.min(room, item.count);
        last.count += moved;
        item.count -= moved;
        if (item.count <= 0) continue;
      }
      merged.push(item);
    }
    for (let i = 0; i < merged.length && s.from + i < s.to; i += 1) slots[s.from + i] = merged[i];
    return merged.length;
  }

  function serialize() {
    return slots.map((slot) => (slot ? { key: slot.key, kind: slot.kind, count: slot.count } : null));
  }

  function restore(saved) {
    if (!Array.isArray(saved)) return;
    for (let i = 0; i < slots.length; i += 1) {
      const entry = saved[i];
      slots[i] = entry && entry.key ? { ...entry } : null;
    }
  }

  return {
    slots, sections, section, sectionOf, add, take, countOf,
    clickSlot, splitSlot, quickMove, sort, serialize, restore, stackLimit, sameItem,
    get held() { return held; },
    set held(value) { held = value; },
    get size() { return slots.length; }
  };
}

// The module's public surface, declared once. index.html used to repeat these
// names by hand, and three separate times a new export was added here and
// forgotten there, which broke the game at runtime while every test passed.
const EXPORTS_inventory = { makeInventory, LAYOUT, STACK_MAX };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_inventory;
} else if (typeof FATHOM !== 'undefined') {
  FATHOM.inventory = EXPORTS_inventory;
}
