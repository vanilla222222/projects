(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BlueprintCore = api;
})(globalThis, function () {
  'use strict';
  const PROJECTS = [
    { id: 'mines', name: 'Geode seams', tab: 'mines', metrics: ['geodes'], budget: 1.6, feature: 'Find Geodes while mining. Crack caches for ores; each milestone adds +2% all ore gains.' },
    { id: 'mastery', name: 'Ore schools', tab: 'mastery', metrics: ['focus'], budget: 1.8, feature: 'Choose an ore focus. Each milestone adds +3% focused ore yield and reduces its Mastery price by 3%.' },
    { id: 'rebirth', name: 'Legacy talents', tab: 'rebirth', metrics: ['points'], budget: 1.5, feature: 'Choose a permanent legacy: ore yield, autominer speed or Mastery discounts. +2% per milestone.' },
    { id: 'smelt', name: 'Electrum laboratory', tab: 'smelt', metrics: ['ingot:electrum'], budget: 1.1, feature: 'Smelt Gold and Silver into Electrum for new conductivity, radiance and research upgrades.' },
    { id: 'forest', name: 'The Nursery', tab: 'forest', metrics: ['trees'], budget: 2.6, feature: 'Choose which eligible, discovered tree regrows and reserve automated trees for Charcoal. Each milestone gives +2% log yield.' },
    { id: 'mill', name: 'Beam joinery', tab: 'mill', metrics: ['beams'], budget: 0.8, feature: 'Join three sawmill offcuts into a Beam. Buy permanent joinery jigs; milestones give +3% plank output.' },
    { id: 'workshop', name: 'Engineering schools', tab: 'workshop', metrics: ['ingots'], budget: 1, feature: 'Specialize in a research line. Each milestone strengthens its existing bonus by 3%.' },
  ];
  const IDS = PROJECTS.map(p => p.id);
  const positive = v => Number.isFinite(v) && v >= 0;
  function fresh() {
    return { office: false, active: '', levels: Object.fromEntries(IDS.map(id => [id, 0])), job: null,
      geodes: 0, geodesTotal: 0, beams: 0, beamsTotal: 0, offcuts: 0, joiner: true, joinBusy: false, joinTime: 0, jig: 0,
      focus: 'dirt', legacy: 'ores', plant: 'random', school: 'drill', fuelReserve: true };
  }
  const level = (s, id) => s.levels[id] || 0;
  const next = s => PROJECTS.find(p => level(s, p.id) < 5);
  const open = (s, id) => s.active === id || level(s, id) > 0;
  const validKey = key => ['geodes','points','tiles','trees','beams','ingots','ores','ingot:electrum'].includes(key) || /^ore:(dirt|stone|copper|iron|zinc|gold|silver|diamond|obsidian|quartz)$/.test(key);
  function restore(raw) {
    const s = fresh();
    if (!raw || typeof raw !== 'object') return s;
    s.office = raw.office === true;
    for (const k of ['geodes','geodesTotal','beams','beamsTotal','offcuts']) if (positive(raw[k])) s[k] = raw[k];
    if (positive(raw.jig)) s.jig = Math.min(10, Math.floor(raw.jig));
    for (const k of ['focus','plant','school']) if (typeof raw[k] === 'string' && /^[a-z]+$/.test(raw[k])) s[k] = raw[k];
    if (['ores','speed','mastery'].includes(raw.legacy)) s.legacy = raw.legacy;
    s.joiner = raw.joiner !== false;
    s.fuelReserve = raw.fuelReserve !== false;
    let blocked = !s.office;
    for (const id of IDS) {
      if (!blocked && positive(raw.levels?.[id])) s.levels[id] = Math.min(5, Math.floor(raw.levels[id]));
      if (s.levels[id] < 5) blocked = true;
    }
    const p = next(s), j = raw.job;
    if (s.office && p && raw.active === p.id && j?.id === p.id && Array.isArray(j.targets) && j.targets.length === p.metrics.length) {
      const valid = j.targets.every((t,i) => t && typeof t.key === 'string' && validKey(t.key) && (p.metrics[i] === 'focus' ? t.key.startsWith('ore:') : t.key === p.metrics[i]) && positive(t.earned) && positive(t.step) && t.step >= 1 && t.step <= 1e300);
      if (valid) { s.active = p.id; s.job = { id: p.id, targets: j.targets.map(t => ({key:t.key, earned:t.earned, step:t.step})) }; }
    }
    if (p && !s.job && level(s,p.id) > 0) s.levels[p.id] = 0;
    if (open(s,'mill') && raw.joinBusy === true && positive(raw.joinTime)) { s.joinBusy = true; s.joinTime = Math.min(6, raw.joinTime); }
    if (!open(s,'mill')) s.jig = 0;
    return s;
  }
  function start(s, id, estimates) {
    const p = next(s);
    if (!s.office || s.active || !p || p.id !== id) return false;
    const targets = p.metrics.map(key => {
      const metric = key === 'focus' ? `ore:${s.focus}` : key;
      const rate = estimates[metric];
      if (!validKey(metric) || !Number.isFinite(rate) || rate <= 0) return null;
      return { key: metric, earned: 0, step: Math.max(1, Math.min(1e300, Math.ceil(rate * 240 * p.budget))) };
    });
    if (targets.some(t => !t)) return false;
    s.active = id; s.job = {id, targets}; return true;
  }
  function record(s, key, amount) {
    if (!Number.isFinite(amount) || amount <= 0 || !s.job) return;
    for (const t of s.job.targets) if (t.key === key) t.earned = Math.min(1e305, t.earned + amount);
  }
  function status(s) {
    if (!s.job) return {ready:false, progress:0, available:0};
    const produced = Math.min(...s.job.targets.map(t => t.earned / t.step));
    const current = level(s,s.active);
    return {ready:produced >= current + 1, progress:Math.max(0,Math.min(1,produced-current)), available:Math.max(0,Math.min(5,Math.floor(produced))-current)};
  }
  function claim(s) {
    if (!s.active || !status(s).ready) return false;
    const id = s.active;
    s.levels[id]++;
    if (s.levels[id] >= 5) { s.active = ''; s.job = null; }
    return true;
  }
  return {PROJECTS, fresh, restore, next, level, open, start, record, status, claim};
});
