'use strict';

// Local projects follow a pylon site. The network counts distinct active regions.
const SETTLEMENT_ROLES = {
  ranger: { name: 'Ranger Outpost', station: 'sawmill', job: 'hunt',
    supplies: [['rope', 15], ['torch', 12]], stock: [['rope', 25, 75], ['torch', 25, 85], ['spelunk-potion', 2, 200]] },
  trade: { name: 'Trade Station', station: 'loom', job: 'survey',
    supplies: [['glass', 8], ['copper-bar', 4]], stock: [['bottle', 12, 90], ['glass', 25, 140], ['town-pylon', 1, 340]] },
  forge: { name: 'Rail and Forge Depot', station: 'anvil', job: 'repair',
    supplies: [['iron-bar', 5], ['stone', 20]], stock: [['minecart-rail', 24, 110], ['wire-spool', 24, 140], ['iron-bar', 5, 210]] },
  kitchen: { name: 'Waterside Kitchen', station: 'cauldron', job: 'fish',
    supplies: [['cooked-fish', 3], ['bottle', 4]], stock: [['cooked-fish', 5, 140], ['gills-potion', 3, 220], ['regen-potion', 2, 200]] },
  lab: { name: 'Survey Lab', station: 'alchemy-table', job: 'specimen',
    supplies: [['bottle', 6], ['glowmoss', 8]], stock: [['shine-potion', 3, 190], ['clarity-potion', 3, 240], ['spelunk-potion', 3, 260]] }
};

const SETTLEMENT_REGIONS = {
  forest: 'ranger', taiga: 'ranger', jungle: 'ranger',
  desert: 'trade', plains: 'trade', savanna: 'trade',
  highlands: 'forge', badlands: 'forge', hell: 'forge', hellcaves: 'forge', trench: 'forge',
  beach: 'kitchen', ocean: 'kitchen', marsh: 'kitchen',
  tundra: 'lab', blight: 'lab', crimson: 'lab', hallow: 'lab',
  caves: 'ranger', deep: 'forge', sky: 'trade', space: 'lab', void: 'lab'
};

const SETTLEMENT_JOBS = {
  hunt: { goal: 6, text: 'Defeat six wild hostiles in this region.' },
  survey: { goal: 2, text: 'Survey two landmark sites in this region from the field journal.' },
  repair: { goal: 1, text: 'Restore a landmark by installing a lantern inside it and inspecting it from the field journal.' },
  fish: { goal: 3, text: 'Catch three different fish in this region.' },
  specimen: { goal: 2, text: 'Net two different critters in this region.' }
};

const SETTLEMENT_MILESTONES = [
  { key: 'fish', name: 'Angler’s Ledger', goal: 8, reward: [['gills-potion', 5], ['coin', 400]] },
  { key: 'fish', name: 'Master Angler', goal: 16, reward: [['gold-rod', 1], ['coin', 800]] },
  { key: 'specimen', name: 'Naturalist’s Collection', goal: 8, reward: [['empty-terrarium', 4], ['coin', 400]] },
  { key: 'specimen', name: 'Living Archive', goal: 20, reward: [['empty-terrarium', 12], ['coin', 950]] },
  { key: 'exhibit', name: 'Natural History Gallery', goal: 6, reward: [['empty-terrarium', 8], ['coin', 600]] },
  { key: 'food', name: 'Field Kitchen', goal: 4, reward: [['regen-potion', 5], ['coin', 400]] },
  { key: 'food', name: 'Regional Feast', goal: 12, reward: [['cauldron', 1], ['coin', 700]] },
  { key: 'survey', name: 'Landmark Atlas', goal: 8, reward: [['town-pylon', 1], ['coin', 500]] },
  { key: 'survey', name: 'Grand Survey', goal: 20, reward: [['crystal-hook', 1], ['coin', 1000]] },
  { key: 'mechanism', name: 'Circuit Workshop', goal: 6, reward: [['wire-spool', 60], ['inlet-pump', 2], ['outlet-pump', 2]] }
];

const SETTLEMENT_NETWORK = [
  { goal: 2, name: 'First Trade Route', reward: [['storage-heart', 1], ['storage-unit', 1], ['storage-access', 2]] },
  { goal: 3, name: 'Regional Exchange', reward: [['storage-crafter', 1], ['town-pylon', 1], ['coin', 800]] },
  { goal: 5, name: 'Grand Network', reward: [['storage-unit', 4], ['town-pylon', 2], ['coin', 1800]] }
];

const SETTLEMENT_EXPEDITIONS = [
  { name: 'Storm Run', bosses: ['prismsentinel', 'starwyvern', 'zenithengine'], seconds: 200, ore: 'lunarium-bar',
    rule: 'Marked lightning strikes follow you during waves.', lightning: true },
  { name: 'Refraction Run', bosses: ['glasscolossus', 'coilserpent', 'foundrywarden'], seconds: 230, ore: 'solarium-bar',
    rule: 'All three bosses have 25% more health.', health: 1.25 },
  { name: 'Regent’s Run', bosses: ['riftarchon', 'starwyvern', 'astralregent'], seconds: 230, ore: 'eventide-bar',
    rule: 'The Regent returns with full platform bombardment.' }
];

function settlementRole(region) {
  return SETTLEMENT_ROLES[SETTLEMENT_REGIONS[region] || 'trade'];
}

function settlementJob(region) {
  if (['caves', 'deep', 'sky', 'space', 'hell', 'hellcaves', 'trench', 'void', 'hallow'].includes(region)) return 'hunt';
  return settlementRole(region).job;
}

function settlementKey(device) {
  return device.x + ':' + device.y;
}

function makeSettlementLedger(saved = {}) {
  const towns = new Map(saved.towns || []);
  const collections = new Map((saved.collections || []).map(([key, values]) => [key, new Set(values)]));
  const claimed = new Set(saved.claimed || []);
  const records = new Map(saved.records || []);
  const prizes = new Map(saved.prizes || []);
  const town = device => towns.get(settlementKey(device));
  function found(device, region) {
    if (town(device)) return false;
    towns.set(settlementKey(device), { region, rank: 1, marks: [], kills: 0, deliveries: 0, lastDelivery: -1 });
    return true;
  }

  function record(key, id) {
    if (!collections.has(key)) collections.set(key, new Set());
    const group = collections.get(key);
    const fresh = !group.has(id);
    group.add(id);
    return fresh;
  }

  function mark(local, job, id) {
    if (!local || settlementJob(local.region) !== job || local.rank < 1) return false;
    const goal = SETTLEMENT_JOBS[job].goal;
    if (progress(local) >= goal) return false;
    if (job === 'hunt') local.kills += 1;
    else if (!local.marks.includes(id)) local.marks.push(id);
    else return false;
    return progress(local) === goal;
  }

  function progress(local) {
    return settlementJob(local.region) === 'hunt' ? local.kills : local.marks.length;
  }

  function charterRegions(pylons, homes) {
    const regions = new Set();
    for (const device of pylons) {
      const local = town(device);
      if (local?.rank >= 2 && !regions.has(local.region) && homes(device) >= 2) regions.add(local.region);
    }
    return regions;
  }

  function finish(index, seconds) {
    const before = records.get(index) || { clears: 0, best: Infinity };
    const result = { clears: before.clears + 1, best: Math.min(before.best, Math.ceil(seconds)) };
    records.set(index, result);
    return result;
  }

  return { town, found, record, mark, progress, charterRegions, finish, claimed, records, prizes,
    shipment: saved.shipment || null,
    count: key => collections.get(key)?.size || 0,
    serialize() { return { shipment: this.shipment, towns: [...towns], collections: [...collections].map(([key, group]) => [key, [...group]]),
      claimed: [...claimed], records: [...records], prizes: [...prizes] }; } };
}

const EXPORTS_settlement = { makeSettlementLedger, settlementRole, settlementJob, settlementKey,
  JOBS: SETTLEMENT_JOBS, MILESTONES: SETTLEMENT_MILESTONES, NETWORK: SETTLEMENT_NETWORK, EXPEDITIONS: SETTLEMENT_EXPEDITIONS };
if (typeof module !== 'undefined' && module.exports) module.exports = EXPORTS_settlement;
else if (typeof FATHOM !== 'undefined') FATHOM.settlement = EXPORTS_settlement;
