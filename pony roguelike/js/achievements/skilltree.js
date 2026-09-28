'use strict';

const SKILL_TREE_STAT_FIELDS = ['speed','meleeDamage','rangedDamage','critChance','luck','fireCooldown','meleeCooldown','rangeTiles','boltSpeed','magnetRadius',

  'venomChance','stunChance','charmChance','freezeChance','fearChance','vulnerableChance','lifestealChance','onKillHealChance','dodgeChance',

  'shopDiscountBonus'];
const SKILL_TREE_STAT_CAP = 0.25;

const SKILL_TREE_STAT_CAP_OVERRIDES = { lifestealChance: 0.10, shopDiscountBonus: 0.10 };

const SKILL_TREE_ADDITIVE_STAT_FIELDS = ['venomChance','stunChance','charmChance','freezeChance','fearChance','vulnerableChance','lifestealChance','onKillHealChance','dodgeChance',

  'shopDiscountBonus'];

function nodeEffects(node){
  return node.effects || (node.effect ? [node.effect] : []);
}

const SKILL_TREE_SIGNED_EFFECT_TYPES = ['stat','globalStat','uniqueField'];

function skillNodeParentIds(node){
  if (!node) return [];
  const out = [];
  if (node.parent != null) out.push(node.parent);
  if (Array.isArray(node.parents)) {
    for (const p of node.parents) {
      if (p != null && out.indexOf(p) === -1) out.push(p);
    }
  }
  return out;
}

function skillNodePrimaryParent(node){
  const ids = skillNodeParentIds(node);
  return ids.length ? ids[0] : null;
}

function isTradeoffNode(node){
  let pos = false, neg = false;
  for (const eff of nodeEffects(node)) {
    if (!eff || SKILL_TREE_SIGNED_EFFECT_TYPES.indexOf(eff.type) === -1) continue;
    if (typeof eff.amount !== 'number' || !isFinite(eff.amount)) continue;
    if (eff.amount > 0) pos = true;
    else if (eff.amount < 0) neg = true;
    if (pos && neg) return true;
  }
  return false;
}

let skillTreeExclusionMap = null;
function buildSkillTreeExclusionMap(){
  skillTreeExclusionMap = {};
  const link = (a, b) => {
    if (a == null || b == null || a === b) return;
    const list = skillTreeExclusionMap[a] || (skillTreeExclusionMap[a] = []);
    if (list.indexOf(b) === -1) list.push(b);
  };
  for (const n of SKILL_TREE_NODES) {
    if (!Array.isArray(n.excludes)) continue;
    for (const other of n.excludes) { link(n.id, other); link(other, n.id); }
  }
}
function skillNodeExclusionPeers(nodeId){
  if (!skillTreeExclusionMap) buildSkillTreeExclusionMap();
  return skillTreeExclusionMap[nodeId] || [];
}
function skillNodeExcludedBy(unlocks, nodeId){
  if (isSkillNodeOwned(unlocks, nodeId)) return null;
  for (const peer of skillNodeExclusionPeers(nodeId)) {
    if (isSkillNodeOwned(unlocks, peer)) return peer;
  }
  return null;
}
function isSkillNodeExcluded(unlocks, nodeId){
  return !!skillNodeExcludedBy(unlocks, nodeId);
}
const SKILL_TREE_NODES = [
  { id:'start', parent:null, cost:0, name:'Awakening', desc:'The root of your meta-progression.', effect:null },

  ...Object.keys(CLASSES).map(classId => ({
    id:'char_hub_' + classId, parent:'start', cost:1,
    name:CLASSES[classId].name + ' Path',
    desc:'Unlocks this character\'s upgrade path.', effect:null,
  })),
  { id:'unlock_hub', parent:'start', cost:1, name:'Unlocks Path', desc:'Unlocks the path to new content.', effect:null },
  { id:'general_hub', parent:'start', cost:1, name:'General Path', desc:'Unlocks the path to general upgrades.', effect:null },
];
const SKILL_TREE_NODES_BY_ID = {};
for (const n of SKILL_TREE_NODES) SKILL_TREE_NODES_BY_ID[n.id] = n;

function isSkillNodeOwned(unlocks, nodeId){
  return nodeId === 'start' || !!(unlocks.skillTree.unlockedNodes && unlocks.skillTree.unlockedNodes[nodeId]);
}

function skillNodeMaxRank(node){
  return (node && typeof node.maxRank === 'number' && node.maxRank > 1) ? Math.floor(node.maxRank) : 1;
}
function skillNodeRank(unlocks, nodeId){
  if (!isSkillNodeOwned(unlocks, nodeId)) return 0;
  const raw = unlocks.skillTree.unlockedNodes && unlocks.skillTree.unlockedNodes[nodeId];
  if (typeof raw === 'number' && raw > 0) {
    const max = skillNodeMaxRank(SKILL_TREE_NODES_BY_ID[nodeId]);
    return Math.min(Math.floor(raw), max);
  }
  return 1;
}
function skillNodeRankCost(node, rank){
  if (!node) return 0;
  const base = node.cost || 0;
  const r = rank > 1 ? rank : 1;
  if (r === 1) return base;
  const step = (typeof node.costStep === 'number') ? node.costStep : base;
  return base + (r - 1) * step;
}
function skillNodeNextRankCost(unlocks, node){
  return skillNodeRankCost(node, skillNodeRank(unlocks, node.id) + 1);
}
function skillNodeEffectScale(node, eff, rank){
  if (skillNodeMaxRank(node) === 1) return 1;
  const r = rank > 1 ? rank : 1;
  const per = (eff && typeof eff.perRank === 'number') ? eff.perRank : 1;
  return 1 + (r - 1) * per;
}
function skillNodeOwnedScale(unlocks, node, eff){
  if (skillNodeMaxRank(node) === 1) return 1;
  return skillNodeEffectScale(node, eff, skillNodeRank(unlocks, node.id));
}
function skillNodeNextRankScaleDelta(unlocks, node, eff){
  const rank = skillNodeRank(unlocks, node.id);
  if (skillNodeMaxRank(node) === 1) return rank > 0 ? 0 : 1;
  return skillNodeEffectScale(node, eff, rank + 1) - skillNodeEffectScale(node, eff, rank);
}

function skillNodeBranchKey(nodeId){
  const tab = getSkillTreeNodeTab(nodeId);
  if (!tab) return null;
  let rest = nodeId;
  const charPrefix = 'char_' + tab + '_';
  if (rest.indexOf(charPrefix) === 0) rest = rest.slice(charPrefix.length);
  else {
    const i = rest.indexOf('_');
    if (i !== -1) rest = rest.slice(i + 1);
  }
  const m = /^[A-Za-z]+/.exec(rest);
  return tab + '|' + (m ? m[0].toLowerCase() : rest);
}
function skillTreeSpentOnNode(unlocks, nodeId){
  const spent = unlocks.skillTree.spent;
  if (spent && typeof spent[nodeId] === 'number') return spent[nodeId];
  if (!isSkillNodeOwned(unlocks, nodeId)) return 0;
  const node = SKILL_TREE_NODES_BY_ID[nodeId];
  return (node && node.cost) || 0;
}
function skillTreeSpentInScope(unlocks, node, scope){
  const tab = getSkillTreeNodeTab(node.id);
  if (!tab) return 0;
  const branch = scope === 'tab' ? null : skillNodeBranchKey(node.id);
  let total = 0;
  for (const n of SKILL_TREE_NODES) {
    if (!isSkillNodeOwned(unlocks, n.id)) continue;
    if (getSkillTreeNodeTab(n.id) !== tab) continue;
    if (branch != null && skillNodeBranchKey(n.id) !== branch) continue;
    total += skillTreeSpentOnNode(unlocks, n.id);
  }
  return total;
}
function skillNodeSpentGate(unlocks, node){
  const req = node && node.requiresSpent;
  if (!req || typeof req.amount !== 'number') return null;
  const scope = req.scope === 'tab' ? 'tab' : 'branch';
  const have = skillTreeSpentInScope(unlocks, node, scope);
  return { scope, have, need: req.amount, met: have >= req.amount };
}
function skillNodeSpentGateUnmet(unlocks, node){
  const gate = skillNodeSpentGate(unlocks, node);
  return (gate && !gate.met) ? gate : null;
}

function countOwnedTaggedNodes(unlocks, classId, tag, cache){
  const key = classId + '|' + tag;
  if (cache && cache[key] != null) return cache[key];
  let count = 0;
  for (const n of SKILL_TREE_NODES) {
    if (!Array.isArray(n.tags) || n.tags.indexOf(tag) === -1) continue;
    if (!isSkillNodeOwned(unlocks, n.id)) continue;
    if (getSkillTreeNodeTab(n.id) !== classId) continue;
    count++;
  }
  if (cache) cache[key] = count;
  return count;
}

function canBuySkillNode(unlocks, nodeId){
  const node = SKILL_TREE_NODES_BY_ID[nodeId];
  if (!node) return false;
  const rank = skillNodeRank(unlocks, nodeId);
  if (rank > 0 && rank >= skillNodeMaxRank(node)) return false;
  for (const pid of skillNodeParentIds(node)) {
    if (!isSkillNodeOwned(unlocks, pid)) return false;
  }
  if (skillNodeExcludedBy(unlocks, nodeId)) return false;
  if (skillNodeSpentGateUnmet(unlocks, node)) return false;
  return unlocks.skillTree.points >= skillNodeRankCost(node, rank + 1);
}

function buySkillNode(nodeId){
  const unlocks = ensureUnlockShape(loadUnlocks());
  if (!canBuySkillNode(unlocks, nodeId)) return false;
  const node = SKILL_TREE_NODES_BY_ID[nodeId];
  const nextRank = skillNodeRank(unlocks, nodeId) + 1;
  const cost = skillNodeRankCost(node, nextRank);
  unlocks.skillTree.points -= cost;
  unlocks.skillTree.spent[nodeId] = (unlocks.skillTree.spent[nodeId] || 0) + cost;
  unlocks.skillTree.unlockedNodes[nodeId] = skillNodeMaxRank(node) > 1 ? nextRank : true;
  for (const eff of nodeEffects(node)) {
    if (eff.type === 'unlock') applySkillTreeUnlockEffect(unlocks, eff);
  }
  saveUnlocks(unlocks);
  return true;
}

function nodeHasOwnedChildren(unlocks, nodeId){
  for (const n of SKILL_TREE_NODES) {
    if (skillNodeParentIds(n).indexOf(nodeId) !== -1 && isSkillNodeOwned(unlocks, n.id)) return true;
  }
  return false;
}
function canSellSkillNode(unlocks, nodeId){
  if (nodeId === 'start') return false;
  const node = SKILL_TREE_NODES_BY_ID[nodeId];
  if (!node || !node.cost) return false;
  if (!isSkillNodeOwned(unlocks, nodeId)) return false;
  if (nodeEffects(node).some(e => e.type === 'unlock')) return false;
  if (nodeHasOwnedChildren(unlocks, nodeId)) return false;
  return true;
}
function sellSkillNode(nodeId){
  const unlocks = ensureUnlockShape(loadUnlocks());
  if (!canSellSkillNode(unlocks, nodeId)) return false;
  const node = SKILL_TREE_NODES_BY_ID[nodeId];
  const rank = skillNodeRank(unlocks, nodeId);
  const refund = skillNodeRankCost(node, rank);
  unlocks.skillTree.points += refund;
  if (rank > 1) {
    unlocks.skillTree.unlockedNodes[nodeId] = rank - 1;
    if (unlocks.skillTree.spent) unlocks.skillTree.spent[nodeId] = Math.max(0, (unlocks.skillTree.spent[nodeId] || 0) - refund);
  } else {
    delete unlocks.skillTree.unlockedNodes[nodeId];
    if (unlocks.skillTree.spent) delete unlocks.skillTree.spent[nodeId];
  }
  saveUnlocks(unlocks);
  return true;
}

function applySkillTreeUnlockEffect(unlocks, effect){

  const bucket = { star:'unlockedStars', trinket:'unlockedTrinkets', familiar:'unlockedFamiliars', item:'unlockedItems' }[effect.category];
  if (!bucket || !unlocks[bucket]) return;
  if (unlocks[bucket][effect.id]) return;
  unlocks[bucket][effect.id] = true;
}

function getSkillTreeStatBonus(unlocks, classId, stat){
  let total = 0;
  const tagCache = {};
  for (const n of SKILL_TREE_NODES) {
    if (!isSkillNodeOwned(unlocks, n.id)) continue;
    for (const eff of nodeEffects(n)) {
      if (eff.type === 'stat' && eff.classId === classId && eff.stat === stat) total += eff.amount * skillNodeOwnedScale(unlocks, n, eff);

      else if (eff.type === 'globalStat' && eff.stat === stat) total += eff.amount * skillNodeOwnedScale(unlocks, n, eff);
      else if (eff.type === 'synergyStat' && eff.classId === classId && eff.stat === stat) {
        total += (eff.perOwned || 0) * countOwnedTaggedNodes(unlocks, eff.classId, eff.tag, tagCache) * skillNodeOwnedScale(unlocks, n, eff);
      }
    }
  }

  const cap = SKILL_TREE_STAT_CAP_OVERRIDES[stat] != null ? SKILL_TREE_STAT_CAP_OVERRIDES[stat] : SKILL_TREE_STAT_CAP;
  return Util.clamp(total, -cap, cap);
}

function applySkillTreeStatBonuses(player){
  const unlocks = ensureUnlockShape(loadUnlocks());
  for (const stat of SKILL_TREE_STAT_FIELDS) {
    if (typeof player[stat] !== 'number') continue;
    const bonus = getSkillTreeStatBonus(unlocks, player.classId, stat);
    if (bonus === 0) continue;
    if (SKILL_TREE_ADDITIVE_STAT_FIELDS.indexOf(stat) !== -1) player[stat] += bonus;
    else player[stat] *= (1 + bonus);
  }
  applySkillTreeUniqueFieldBonuses(player);
  applySkillTreeUniqueFlagEffects(player);
  applySkillTreeRunModifiers(player);
}

function applySkillTreeUniqueFieldBonuses(player){
  const unlocks = ensureUnlockShape(loadUnlocks());
  const groups = {};
  for (const n of SKILL_TREE_NODES) {
    if (!isSkillNodeOwned(unlocks, n.id)) continue;
    for (const eff of nodeEffects(n)) {
      if (eff.type !== 'uniqueField' || eff.classId !== player.classId) continue;
      const key = eff.classId + '|' + eff.field;
      const g = groups[key] || (groups[key] = { sum: 0, min: eff.min, max: eff.max });
      g.sum += eff.amount * skillNodeOwnedScale(unlocks, n, eff);

      if (eff.min > g.min) g.min = eff.min;
      if (eff.max < g.max) g.max = eff.max;
    }
  }

  if (!player._skillTreeFieldBase) player._skillTreeFieldBase = {};
  for (const key in groups) {
    const field = key.split('|')[1];
    if (typeof player[field] !== 'number') continue;
    if (!(field in player._skillTreeFieldBase)) player._skillTreeFieldBase[field] = player[field];
    const g = groups[key];
    player[field] = player._skillTreeFieldBase[field] + Util.clamp(g.sum, g.min, g.max);
  }
}

function applySkillTreeUniqueFlagEffects(player){
  const unlocks = ensureUnlockShape(loadUnlocks());
  for (const n of SKILL_TREE_NODES) {
    if (!isSkillNodeOwned(unlocks, n.id)) continue;
    for (const eff of nodeEffects(n)) {
      if (eff.type === 'uniqueFlag' && eff.classId === player.classId) player[eff.field] = eff.value;
    }
  }
}

function applySkillTreeRunModifiers(player){
  const unlocks = ensureUnlockShape(loadUnlocks());
  if (!player.skillTreeMods) player.skillTreeMods = {};
  else for (const k in player.skillTreeMods) delete player.skillTreeMods[k];
  for (const n of SKILL_TREE_NODES) {
    if (!isSkillNodeOwned(unlocks, n.id)) continue;
    for (const eff of nodeEffects(n)) {
      if (eff.type === 'runModifier' && eff.classId === player.classId) player.skillTreeMods[eff.key] = eff.value;
    }
  }
}

function applySkillTreePoolNudge(pool, poolName){
  const unlocks = ensureUnlockShape(loadUnlocks());
  let out = null;
  for (const n of SKILL_TREE_NODES) {
    if (!isSkillNodeOwned(unlocks, n.id)) continue;
    for (const eff of nodeEffects(n)) {
      if (eff.type !== 'poolWeight' || eff.pool !== poolName) continue;
      if (!out) out = pool.map(e => ({ id:e.id, w:e.w }));
      const entry = out.find(e => e.id === eff.id);
      if (entry) entry.w += eff.bonus * skillNodeOwnedScale(unlocks, n, eff);
    }
  }
  return out || pool;
}

function applySkillTreeStartingPickups(player){
  const unlocks = ensureUnlockShape(loadUnlocks());
  for (const n of SKILL_TREE_NODES) {
    if (!isSkillNodeOwned(unlocks, n.id)) continue;
    for (const eff of nodeEffects(n)) {
      if (eff.type !== 'startingPickup') continue;
      const field = { bombs:'bombs', keys:'keys', coins:'coins', blue:'blueCurrent' }[eff.pickup];
      if (field && typeof player[field] === 'number') player[field] += eff.amount * skillNodeOwnedScale(unlocks, n, eff);
    }
  }
}

const SKILL_TREE_RING_BASE = 260;
const SKILL_TREE_RING_STEP = 210;
const SKILL_TREE_MIN_ARC = 128;
const SKILL_TREE_INNER_ORBIT = 124;
const SKILL_TREE_MAX_RING_INFLATE = 1.6;
const SKILL_TREE_MIN_ANGLE_GAP = 0.0035;
const SKILL_TREE_STAGGER_STEP = 84;
const SKILL_TREE_MAX_STAGGER_TIERS = 3;

function computeSkillTreeLayout(nodes, rootId){
  nodes = nodes || SKILL_TREE_NODES;
  const byId = {};
  for (const n of nodes) byId[n.id] = n;
  const primaryParent = {};
  const childrenOf = {};
  for (const n of nodes) {
    let pid = null;
    for (const candidate of skillNodeParentIds(n)) {
      if (byId[candidate]) { pid = candidate; break; }
    }
    primaryParent[n.id] = pid;
  }
  for (const n of nodes) {
    const pid = primaryParent[n.id];
    if (pid != null) (childrenOf[pid] || (childrenOf[pid] = [])).push(n.id);
  }
  let root = (rootId != null && byId[rootId]) ? rootId : null;
  if (root == null) {
    for (const n of nodes) {
      if (primaryParent[n.id] == null) { root = n.id; break; }
    }
  }
  if (root == null && nodes.length) root = nodes[0].id;

  const positions = {};
  const depthOf = {};
  const weight = {};
  const angleOf = {};
  const order = [];
  const seen = {};
  if (root != null) {
    (function walk(id, depth){
      if (seen[id]) return;
      seen[id] = true;
      depthOf[id] = depth;
      order.push(id);
      const kids = childrenOf[id] || [];
      for (const kid of kids) walk(kid, depth + 1);
    })(root, 0);
    for (let i = order.length - 1; i >= 0; i--) {
      const id = order[i];
      let w = 0;
      for (const kid of (childrenOf[id] || [])) {
        if (weight[kid]) w += weight[kid];
      }
      weight[id] = w > 0 ? w : 1;
    }
    const countAtDepth = [];
    for (const id of order) {
      const d = depthOf[id];
      countAtDepth[d] = (countAtDepth[d] || 0) + 1;
    }
    (function assign(id, a0, a1){
      angleOf[id] = (a0 + a1) / 2;
      const kids = (childrenOf[id] || []).filter(kid => seen[kid] && depthOf[kid] === depthOf[id] + 1);
      if (!kids.length) return;
      let total = 0;
      for (const kid of kids) total += weight[kid] || 1;
      let cursor = a0;
      for (const kid of kids) {
        const span = (a1 - a0) * ((weight[kid] || 1) / (total || 1));
        assign(kid, cursor, cursor + span);
        cursor += span;
      }
    })(root, -Math.PI / 2, Math.PI * 1.5);
    for (const n of nodes) {
      if (angleOf[n.id] == null) continue;
      const parentAngles = skillNodeParentIds(n).filter(p => angleOf[p] != null);
      if (parentAngles.length < 2) continue;
      let sx = 0, sy = 0;
      for (const p of parentAngles) {
        const w = weight[p] || 1;
        sx += Math.cos(angleOf[p]) * w;
        sy += Math.sin(angleOf[p]) * w;
      }
      if (sx === 0 && sy === 0) continue;
      angleOf[n.id] = Math.atan2(sy, sx);
    }
    const idsAtDepth = [];
    for (const id of order) {
      if (angleOf[id] == null) continue;
      const d = depthOf[id];
      (idsAtDepth[d] || (idsAtDepth[d] = [])).push(id);
    }
    const ringRadius = [0];
    for (let d = 1; d < countAtDepth.length; d++) {
      const base = SKILL_TREE_RING_BASE + (d - 1) * SKILL_TREE_RING_STEP;
      const uniform = ((countAtDepth[d] || 1) * SKILL_TREE_MIN_ARC) / (Math.PI * 2);
      const list = (idsAtDepth[d] || []).map(id => angleOf[id]).sort((a, b) => a - b);
      let gap = Math.PI * 2;
      for (let i = 1; i < list.length; i++) {
        const g = list[i] - list[i - 1];
        if (g < gap) gap = g;
      }
      if (list.length > 1) {
        const wrapGap = (list[0] + Math.PI * 2) - list[list.length - 1];
        if (wrapGap < gap) gap = wrapGap;
      }
      if (!(gap > SKILL_TREE_MIN_ANGLE_GAP)) gap = SKILL_TREE_MIN_ANGLE_GAP;
      const packed = SKILL_TREE_MIN_ARC / (2 * Math.sin(Math.min(gap, Math.PI) / 2));
      let r = Math.max(base, uniform, Math.min(packed, base * SKILL_TREE_MAX_RING_INFLATE));
      const floorR = ringRadius[d - 1] + SKILL_TREE_RING_STEP;
      if (r < floorR) r = floorR;
      ringRadius[d] = r;
    }
    const radialTier = {};
    for (let d = 1; d < idsAtDepth.length; d++) {
      const ids = (idsAtDepth[d] || []).slice().sort((a, b) => angleOf[a] - angleOf[b]);
      const lastAngleInTier = [];
      for (const id of ids) {
        let tier = 0;
        while (tier < SKILL_TREE_MAX_STAGGER_TIERS - 1) {
          const prev = lastAngleInTier[tier];
          if (prev == null) break;
          const r = (ringRadius[d] || 0) + tier * SKILL_TREE_STAGGER_STEP;
          const chord = 2 * r * Math.sin(Math.min(Math.abs(angleOf[id] - prev), Math.PI) / 2);
          if (chord >= SKILL_TREE_MIN_ARC) break;
          tier++;
        }
        lastAngleInTier[tier] = angleOf[id];
        radialTier[id] = tier;
      }
    }
    for (const id of order) {
      const r = (ringRadius[depthOf[id]] || 0) + (depthOf[id] > 0 ? (radialTier[id] || 0) * SKILL_TREE_STAGGER_STEP : 0);
      const a = angleOf[id] != null ? angleOf[id] : 0;
      positions[id] = { x: r * Math.cos(a), y: r * Math.sin(a) };
    }
  }

  const orphans = [];
  for (const n of nodes) {
    if (!positions[n.id]) orphans.push(n.id);
  }
  for (let i = 0; i < orphans.length; i++) {
    const a = -Math.PI / 2 + (i / orphans.length) * Math.PI * 2;
    positions[orphans[i]] = {
      x: Math.cos(a) * SKILL_TREE_INNER_ORBIT,
      y: Math.sin(a) * SKILL_TREE_INNER_ORBIT,
    };
  }

  const edges = [];
  for (const n of nodes) {
    for (const pid of skillNodeParentIds(n)) {
      if (!byId[pid]) continue;
      edges.push({ from: pid, to: n.id, primary: pid === primaryParent[n.id] });
    }
  }
  return { positions, edges, root };
}

const SKILL_TREE_NODE_SIZE = 74;
const SKILL_TREE_PADDING = 90;

const SKILL_TREE_BOTTOM_LABEL_ROOM = 40;

let skillTreeZoom = null;
let skillTreePanX = 0, skillTreePanY = 0;

let skillTreeLastBoughtId = null;

let skillTreeFilter = 'all';

let skillTreeOverviewOpen = false;

let skillTreeFocusedBranch = null;

const SKILL_TREE_BRANCH_FOCUS_PAD = 70;

function skillTreeBranchHue(branchKey){
  let h = 0;
  const s = String(branchKey || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

let skillTreeApplyTransform = null;

let skillTreeActiveTab = 'earth';
let skillTreeNodeTabMap = null;

function skillTreeTabRootId(tab){
  if (tab === 'general') return 'general_hub';
  if (tab === 'unlocks') return 'unlock_hub';
  return 'char_hub_' + tab;
}
function buildSkillTreeNodeTabMap(){
  skillTreeNodeTabMap = {};
  const hubTab = {};
  for (const classId in CLASSES) hubTab['char_hub_' + classId] = classId;
  hubTab['general_hub'] = 'general';
  hubTab['unlock_hub'] = 'unlocks';
  function resolve(id, seen){
    if (id == null) return null;
    if (skillTreeNodeTabMap[id]) return skillTreeNodeTabMap[id];
    if (hubTab[id]) { skillTreeNodeTabMap[id] = hubTab[id]; return hubTab[id]; }
    if (seen[id]) return null;
    seen[id] = true;
    const node = SKILL_TREE_NODES_BY_ID[id];
    if (!node) return null;
    for (const pid of skillNodeParentIds(node)) {
      const tab = resolve(pid, seen);
      if (tab) { skillTreeNodeTabMap[id] = tab; return tab; }
    }
    return null;
  }
  for (const n of SKILL_TREE_NODES) resolve(n.id, {});
}
function getSkillTreeNodeTab(nodeId){
  if (!skillTreeNodeTabMap) buildSkillTreeNodeTabMap();
  return skillTreeNodeTabMap[nodeId] || null;
}
function skillTreeTabNodeSet(tab){
  if (!skillTreeNodeTabMap) buildSkillTreeNodeTabMap();
  const set = { start: true };
  for (const n of SKILL_TREE_NODES) {
    if (skillTreeNodeTabMap[n.id] === tab) set[n.id] = true;
  }
  return set;
}
function setSkillTreeActiveTab(tab){
  if (!tab || tab === skillTreeActiveTab) return;
  skillTreeActiveTab = tab;
  resetSkillTreeCamera();
  buildSkillTreePanel();
}
function resetSkillTreeCamera(){
  skillTreeZoom = null;
  skillTreePanX = 0;
  skillTreePanY = 0;
  skillTreeLastBoughtId = null;
  skillTreeFocusedBranch = null;
}

const SKILL_TREE_UNIQUE_FIELD_UNITS = {
  damageTakenMult: 'percent', rockCoinChance: 'percent', turretDamageMult: 'percent', fireZoneRootMult: 'percent',
  baseRangeTiles: 'tiles', crystalVolleySpacing: 'px', chargeTime: 'seconds',
  fireRingRadius: 'px', fireZoneRadius: 'px', fireZoneRange: 'px', radius: 'px', changelingMinionRadius: 'px',
  changelingSummonCooldown: 'seconds', changelingMinionDmg: 'dmg',
  maxTurrets: 'count', maxChangelingMinions: 'count', crystalShardCount: 'count',
};
function formatUniqueFieldAmount(field, amount){
  const unit = SKILL_TREE_UNIQUE_FIELD_UNITS[field] || 'raw';
  if (unit === 'percent') {
    const pct = Math.round(amount * 1000) / 10;
    return (pct >= 0 ? '+' : '') + pct + '%';
  }
  const rounded = Math.round(amount * 100) / 100;
  const sign = rounded >= 0 ? '+' : '';
  if (unit === 'tiles') return sign + rounded + ' tiles';
  if (unit === 'px') return sign + rounded + ' px';
  if (unit === 'seconds') return sign + rounded + 's';
  if (unit === 'dmg') return sign + rounded + ' dmg';
  return sign + rounded;
}

function describeSkillEffect(eff){
  if (eff.type === 'stat') {
    const pct = Math.round(eff.amount * 1000) / 10;
    const sign = pct >= 0 ? '+' : '';
    return sign + pct + '% ' + eff.stat;
  }
  if (eff.type === 'uniqueField') {
    return formatUniqueFieldAmount(eff.field, eff.amount) + ' ' + eff.field + ' (unique)';
  }
  if (eff.type === 'uniqueFlag') return 'Grants ' + eff.field;
  if (eff.type === 'unlock') return 'Unlocks ' + eff.category + ': ' + eff.id;
  if (eff.type === 'poolWeight') return 'Nudges ' + eff.pool + ' pool weighting';
  if (eff.type === 'startingPickup') return '+' + eff.amount + ' starting ' + eff.pickup;
  if (eff.type === 'globalStat') {
    const pct = Math.round(eff.amount * 1000) / 10;
    const sign = pct >= 0 ? '+' : '';
    return sign + pct + '% ' + eff.stat + ' (every character)';
  }
  if (eff.type === 'runModifier') return 'Sets ' + eff.key + ' = ' + eff.value;
  if (eff.type === 'synergyStat') {
    const pct = Math.round((eff.perOwned || 0) * 1000) / 10;
    const sign = pct >= 0 ? '+' : '';
    return sign + pct + '% ' + eff.stat + ' per owned "' + eff.tag + '" node';
  }
  return eff.type;
}

function describeSkillEffectTotal(unlocks, eff, node){
  if (eff.type === 'stat') return describeStatTotal(unlocks, eff, node);
  if (eff.type === 'uniqueField') return describeUniqueFieldTotal(unlocks, eff, node);
  if (eff.type === 'synergyStat') return describeSynergyStatTotal(unlocks, eff, node);
  return null;
}
function describeSynergyStatTotal(unlocks, eff, node){
  const count = countOwnedTaggedNodes(unlocks, eff.classId, eff.tag, null);
  const scale = node ? (isSkillNodeOwned(unlocks, node.id) ? skillNodeOwnedScale(unlocks, node, eff) : 1) : 1;
  const pct = Math.round((eff.perOwned || 0) * count * scale * 1000) / 10;
  return count + ' owned "' + eff.tag + '" node' + (count === 1 ? '' : 's') + ' — currently worth ' + (pct >= 0 ? '+' : '') + pct + '% ' + eff.stat;
}
function describeStatTotal(unlocks, eff, node){
  const cap = SKILL_TREE_STAT_CAP_OVERRIDES[eff.stat] != null ? SKILL_TREE_STAT_CAP_OVERRIDES[eff.stat] : SKILL_TREE_STAT_CAP;
  const capPct = Math.round(cap * 1000) / 10;
  const current = getSkillTreeStatBonus(unlocks, eff.classId, eff.stat);
  const curPct = Math.round(current * 1000) / 10;
  const delta = node ? skillNodeNextRankScaleDelta(unlocks, node, eff) : 1;
  const owned = node && isSkillNodeOwned(unlocks, node.id);
  if (owned && delta === 0) return 'Current total: ' + curPct + '% / ' + capPct + '% cap';
  let rawTotal = 0;
  for (const n of SKILL_TREE_NODES) {
    if (!isSkillNodeOwned(unlocks, n.id)) continue;
    for (const e of nodeEffects(n)) {
      if (e.type === 'stat' && e.classId === eff.classId && e.stat === eff.stat) rawTotal += e.amount * skillNodeOwnedScale(unlocks, n, e);
      else if (e.type === 'synergyStat' && e.classId === eff.classId && e.stat === eff.stat) rawTotal += (e.perOwned || 0) * countOwnedTaggedNodes(unlocks, e.classId, e.tag, null) * skillNodeOwnedScale(unlocks, n, e);
    }
  }
  rawTotal += eff.amount * delta;
  const afterPct = Math.round(Util.clamp(rawTotal, -cap, cap) * 1000) / 10;
  if (afterPct === curPct) return 'Current total: ' + curPct + '% / ' + capPct + '% cap (already at cap — this would add nothing)';
  return 'Current: ' + curPct + '% → after buying: ' + afterPct + '% / ' + capPct + '% cap';
}

function describeUniqueFieldTotal(unlocks, eff, node){
  let sum = 0, min = eff.min, max = eff.max;
  for (const n of SKILL_TREE_NODES) {
    if (!isSkillNodeOwned(unlocks, n.id)) continue;
    for (const e of nodeEffects(n)) {
      if (e.type !== 'uniqueField' || e.classId !== eff.classId || e.field !== eff.field) continue;
      sum += e.amount * skillNodeOwnedScale(unlocks, n, e);
      if (e.min > min) min = e.min;
      if (e.max < max) max = e.max;
    }
  }
  const delta = node ? skillNodeNextRankScaleDelta(unlocks, node, eff) : 1;
  const owned = node && isSkillNodeOwned(unlocks, node.id);
  const curClamped = Util.clamp(sum, min, max);
  const fmt = (v) => formatUniqueFieldAmount(eff.field, v).replace(/^\+/, '');
  if (owned && delta === 0) return 'Current total: ' + fmt(curClamped);
  const afterClamped = Util.clamp(sum + eff.amount * delta, min, max);
  if (afterClamped === curClamped) return 'Current total: ' + fmt(curClamped) + ' (already at its limit — this would add nothing)';
  return 'Current: ' + fmt(curClamped) + ' → after buying: ' + fmt(afterClamped);
}

function showSkillNodeDetail(node){
  const panel = document.getElementById('skillTreeDetailPanel');
  if (!panel) return;
  if (!node) { panel.classList.add('hidden'); return; }
  const unlocks = ensureUnlockShape(loadUnlocks());
  const nameEl = document.getElementById('skillTreeDetailName');
  const costEl = document.getElementById('skillTreeDetailCost');
  const descEl = document.getElementById('skillTreeDetailDesc');
  const effEl = document.getElementById('skillTreeDetailEffects');
  const tradeoff = !node.cursed && isTradeoffNode(node);
  const excludedBy = skillNodeExcludedBy(unlocks, node.id);
  const maxRank = skillNodeMaxRank(node);
  const rank = skillNodeRank(unlocks, node.id);
  const spentGate = skillNodeSpentGate(unlocks, node);
  if (nameEl) nameEl.textContent = (node.icon ? node.icon + ' ' : '') + node.name + (maxRank > 1 ? ' (' + rank + '/' + maxRank + ')' : '') + (node.cursed ? ' ☠' : '') + (tradeoff ? ' ⚖' : '') + (/_capstone$/.test(node.id) ? ' ♛' : '') + (/_ascension$/.test(node.id) ? ' ⚡' : '');
  if (costEl) {
    const nextCost = skillNodeRankCost(node, Math.min(rank + 1, maxRank));
    costEl.textContent = node.cost ? (nextCost + ' pt' + (maxRank > 1 && rank < maxRank ? ' (next rank)' : '')) : 'Free';
  }
  if (descEl) descEl.textContent = node.desc || '';
  if (effEl) {
    effEl.innerHTML = '';
    const effs = nodeEffects(node);
    for (const eff of effs) {
      const row = document.createElement('div');
      row.className = 'skilltree-detail-effect-row';
      row.textContent = describeSkillEffect(eff);
      const totalNote = describeSkillEffectTotal(unlocks, eff, node);
      if (totalNote) {
        const sub = document.createElement('span');
        sub.className = 'skilltree-detail-effect-total';
        sub.textContent = totalNote;
        row.appendChild(sub);
      }
      effEl.appendChild(row);
    }
    if (!effs.length) {
      const row = document.createElement('div');
      row.className = 'skilltree-detail-effect-row';
      row.textContent = 'No direct effect — unlocks its children.';
      effEl.appendChild(row);
    }
    if (maxRank > 1) {
      const row = document.createElement('div');
      row.className = 'skilltree-detail-effect-row detail-note-rank';
      const step = (typeof node.costStep === 'number') ? node.costStep : (node.cost || 0);
      row.textContent = 'Ranked — ' + rank + ' / ' + maxRank + ' bought'
        + (rank < maxRank ? ' · next rank costs ' + skillNodeRankCost(node, rank + 1) + ' pt (+' + step + ' per rank)' : ' · fully ranked');
      effEl.appendChild(row);
    }
    if (spentGate) {
      const row = document.createElement('div');
      row.className = 'skilltree-detail-effect-row detail-note-spentgate';
      row.textContent = (spentGate.met ? 'Breadth gate met — ' : 'Breadth gate — needs ')
        + spentGate.need + ' pt spent in this ' + (spentGate.scope === 'tab' ? 'character tree' : 'branch')
        + ' (' + spentGate.have + ' pt so far).';
      effEl.appendChild(row);
    }
    const parentIds = skillNodeParentIds(node);
    if (parentIds.length > 1) {
      const row = document.createElement('div');
      row.className = 'skilltree-detail-effect-row detail-note-converge';
      row.textContent = 'Convergence — needs all ' + parentIds.length + ' incoming paths owned.';
      effEl.appendChild(row);
    }
    if (Array.isArray(node.excludes) && node.excludes.length) {
      const names = node.excludes.map(id => {
        const other = SKILL_TREE_NODES_BY_ID[id];
        return (other && other.name) || id;
      });
      const row = document.createElement('div');
      row.className = 'skilltree-detail-effect-row detail-note-keystone';
      row.textContent = 'Keystone choice — buying this locks out: ' + names.join(', ') + '.';
      effEl.appendChild(row);
    }
    if (excludedBy) {
      const blocker = SKILL_TREE_NODES_BY_ID[excludedBy];
      const row = document.createElement('div');
      row.className = 'skilltree-detail-effect-row detail-note-excluded';
      row.textContent = 'Locked out — "' + ((blocker && blocker.name) || excludedBy) + '" is already owned.';
      effEl.appendChild(row);
    }
  }
  panel.classList.remove('hidden');
  panel.classList.toggle('detail-tradeoff', tradeoff);
  panel.classList.toggle('detail-excluded', !!excludedBy);
  panel.classList.toggle('detail-cursed', !!node.cursed);
  panel.classList.toggle('detail-spent-locked', !!(spentGate && !spentGate.met));
  panel.classList.toggle('detail-owned', isSkillNodeOwned(unlocks, node.id));
}

let skillTreeKeyboardBound = false;
function bindSkillTreeKeyboardNav(){
  if (skillTreeKeyboardBound) return;
  skillTreeKeyboardBound = true;
  const PAN_STEP = 60;
  document.addEventListener('keydown', (e) => {
    const screen = document.getElementById('skillTreeScreen');
    if (!screen || screen.classList.contains('hidden')) return;
    if (!skillTreeApplyTransform || skillTreeZoom == null) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.key === 'Escape') {
      if (skillTreeOverviewOpen) {
        skillTreeOverviewOpen = false;
        const panel = document.getElementById('skillTreeOverviewPanel');
        if (panel) panel.classList.add('hidden');
      }
      return;
    }
    let handled = true;
    if (e.key === 'ArrowLeft') skillTreePanX += PAN_STEP;
    else if (e.key === 'ArrowRight') skillTreePanX -= PAN_STEP;
    else if (e.key === 'ArrowUp') skillTreePanY += PAN_STEP;
    else if (e.key === 'ArrowDown') skillTreePanY -= PAN_STEP;
    else if (e.key === '+' || e.key === '=') skillTreeStepZoomAtCenter(1);
    else if (e.key === '-' || e.key === '_') skillTreeStepZoomAtCenter(-1);
    else handled = false;
    if (handled) { e.preventDefault(); skillTreeApplyTransform(); }
  });
}

function skillTreeStepZoomAtCenter(dir){
  const scroller = document.querySelector('#skillTreeList .skilltree-scroll');
  const viewportW = (scroller && scroller.clientWidth) || 800;
  const viewportH = (scroller && scroller.clientHeight) || 600;
  const newZoom = Util.clamp(skillTreeZoom + dir * 0.1, 0.4, 2);
  if (newZoom === skillTreeZoom) return;
  const worldX = (viewportW / 2 - skillTreePanX) / skillTreeZoom;
  const worldY = (viewportH / 2 - skillTreePanY) / skillTreeZoom;
  skillTreePanX = viewportW / 2 - worldX * newZoom;
  skillTreePanY = viewportH / 2 - worldY * newZoom;
  skillTreeZoom = newZoom;
}

function buildSkillTreePanel(){
  const wrap = document.getElementById('skillTreeList');
  if (!wrap) return;
  wrap.innerHTML = '';
  const unlocks = ensureUnlockShape(loadUnlocks());
  const summaryEl = document.getElementById('skillTreeSummary');
  const ownedCount = Object.keys(unlocks.skillTree.unlockedNodes).length + 1;
  if (summaryEl) {
    summaryEl.textContent = unlocks.skillTree.points + ' points available — ' + ownedCount + ' / ' + SKILL_TREE_NODES.length + ' nodes unlocked'
      + (unlocks.skillTree.lifetimeEarned ? ' — ' + unlocks.skillTree.lifetimeEarned + ' lifetime earned' : '');
  }

  function isVisible(nodeId){
    if (isSkillNodeOwned(unlocks, nodeId)) return true;
    const node = SKILL_TREE_NODES_BY_ID[nodeId];
    if (!node) return false;
    const parentIds = skillNodeParentIds(node);
    if (!parentIds.length) return false;
    return parentIds.some(pid => isSkillNodeOwned(unlocks, pid));
  }
  const tabNodeSet = skillTreeTabNodeSet(skillTreeActiveTab);
  const visibleNodes = SKILL_TREE_NODES.filter(n => tabNodeSet[n.id] && isVisible(n.id));

  const { positions, edges } = computeSkillTreeLayout(visibleNodes, skillTreeTabRootId(skillTreeActiveTab));
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const id in positions) {
    const p = positions[id];
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 0; maxY = 0; }
  const originX = SKILL_TREE_PADDING - minX;
  const originY = SKILL_TREE_PADDING - minY;
  const toPx = (p) => ({ left: originX + p.x, top: originY + p.y });
  const canvasW = SKILL_TREE_PADDING * 2 + (maxX - minX) + SKILL_TREE_NODE_SIZE;
  const canvasH = SKILL_TREE_PADDING * 2 + (maxY - minY) + SKILL_TREE_NODE_SIZE + SKILL_TREE_BOTTOM_LABEL_ROOM;
  const hubCenterPx = { x: originX + SKILL_TREE_NODE_SIZE / 2, y: originY + SKILL_TREE_NODE_SIZE / 2 };

  const scroller = document.createElement('div');
  scroller.className = 'skilltree-scroll';
  const canvas = document.createElement('div');
  canvas.className = 'skilltree-canvas';
  canvas.style.width = canvasW + 'px';
  canvas.style.height = canvasH + 'px';

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'skilltree-svg');
  svg.setAttribute('width', canvasW);
  svg.setAttribute('height', canvasH);
  for (const edge of edges) {

    const from = positions[edge.from], to = positions[edge.to];
    if (!from || !to) continue;
    const fromPx = toPx(from), toPx2 = toPx(to);
    const x1 = fromPx.left + SKILL_TREE_NODE_SIZE / 2;
    const y1 = fromPx.top + SKILL_TREE_NODE_SIZE / 2;
    const x2 = toPx2.left + SKILL_TREE_NODE_SIZE / 2;
    const y2 = toPx2.top + SKILL_TREE_NODE_SIZE / 2;
    const owned = isSkillNodeOwned(unlocks, edge.to);
    const toNode = SKILL_TREE_NODES_BY_ID[edge.to];
    const toCursed = !!(toNode && toNode.cursed);
    const toTradeoff = !toCursed && !!(toNode && isTradeoffNode(toNode));
    const toExcluded = !!(toNode && skillNodeExcludedBy(unlocks, toNode.id));

    const r1 = Math.hypot(x1 - hubCenterPx.x, y1 - hubCenterPx.y);
    const r2 = Math.hypot(x2 - hubCenterPx.x, y2 - hubCenterPx.y);
    const a1 = Math.atan2(y1 - hubCenterPx.y, x1 - hubCenterPx.x);
    const a2 = Math.atan2(y2 - hubCenterPx.y, x2 - hubCenterPx.x);
    const rMid = r1 + (r2 - r1) * 0.5;
    const c1x = hubCenterPx.x + Math.cos(a1) * rMid;
    const c1y = hubCenterPx.y + Math.sin(a1) * rMid;
    const c2x = hubCenterPx.x + Math.cos(a2) * rMid;
    const c2y = hubCenterPx.y + Math.sin(a2) * rMid;
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M ' + x1 + ' ' + y1 + ' C ' + c1x + ' ' + c1y + ', ' + c2x + ' ' + c2y + ', ' + x2 + ' ' + y2);
    path.setAttribute('fill', 'none');
    path.setAttribute('class', 'skilltree-edge'
      + (owned ? ' owned' : '')
      + (edge.primary === false ? ' converge' : '')
      + (toExcluded ? ' to-excluded' : toCursed ? ' to-cursed' : toTradeoff ? ' to-tradeoff' : ''));
    svg.appendChild(path);
  }
  canvas.appendChild(svg);

  const minimapPoints = [];

  for (const node of visibleNodes) {
    const pos = positions[node.id];
    if (!pos) continue;
    const px = toPx(pos);
    const owned = isSkillNodeOwned(unlocks, node.id);

    const parentIds = skillNodeParentIds(node);
    const parentOwned = owned || !parentIds.length || parentIds.every(pid => isSkillNodeOwned(unlocks, pid));
    const excludedBy = skillNodeExcludedBy(unlocks, node.id);
    const excludedByNode = excludedBy ? SKILL_TREE_NODES_BY_ID[excludedBy] : null;
    const maxRank = skillNodeMaxRank(node);
    const rank = skillNodeRank(unlocks, node.id);
    const spentGate = skillNodeSpentGate(unlocks, node);
    const spentLocked = !!(spentGate && !spentGate.met);
    const affordable = !excludedBy && parentOwned && canBuySkillNode(unlocks, node.id);
    const unaffordable = !owned && !excludedBy && parentOwned && !affordable;
    const rankable = owned && rank < maxRank;
    const nextCost = skillNodeRankCost(node, Math.min(rank + 1, maxRank));
    const cursed = !!node.cursed;
    const tradeoff = !cursed && isTradeoffNode(node);
    const convergence = parentIds.length > 1;
    const keystone = Array.isArray(node.excludes) && node.excludes.length > 0;

    const isCapstone = /_capstone$/.test(node.id);

    const isAscension = /_ascension$/.test(node.id);
    const sellable = owned && canSellSkillNode(unlocks, node.id);
    const filterState = owned ? 'owned' : affordable ? 'buyable' : 'unaffordable';
    const isUniqueMechanic = nodeEffects(node).some(e => e.type === 'uniqueField' || e.type === 'uniqueFlag');
    const synergyEffects = nodeEffects(node).filter(e => e.type === 'synergyStat');
    const isSynergy = synergyEffects.length > 0;
    const synergyTags = isSynergy ? synergyEffects.map(e => e.tag).filter(t => t) : [];

    const matchesFilter = skillTreeFilter === 'all'
      || skillTreeFilter === filterState
      || (skillTreeFilter === 'cursed' && cursed)
      || (skillTreeFilter === 'unique' && isUniqueMechanic)
      || (skillTreeFilter === 'synergy' && isSynergy)
      || (skillTreeFilter === 'capstone' && (isCapstone || isAscension));
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'skilltree-node'
      + (owned ? ' owned' : affordable ? ' buyable' : unaffordable ? ' unaffordable' : '')
      + (cursed ? ' cursed' : '')
      + (tradeoff ? ' tradeoff' : '')
      + (excludedBy ? ' excluded' : '')
      + (spentLocked ? ' spent-locked' : '')
      + (maxRank > 1 ? ' ranked' : '')
      + (rankable ? ' rankable' : '')
      + (maxRank > 1 && rank >= maxRank ? ' rank-maxed' : '')
      + (convergence ? ' convergence' : '')
      + (keystone ? ' keystone' : '')
      + (isSynergy ? ' synergy' : '')
      + (isCapstone ? ' capstone' : '')
      + (isAscension ? ' ascension' : '')
      + (sellable ? ' sellable' : '')
      + (matchesFilter ? '' : ' dimmed')
      + (node.id === skillTreeLastBoughtId ? ' just-bought' : '');
    el.style.left = px.left + 'px';
    el.style.top = px.top + 'px';
    el.style.width = SKILL_TREE_NODE_SIZE + 'px';
    el.style.height = SKILL_TREE_NODE_SIZE + 'px';

    el.title = node.name + (node.cost ? ' (' + nextCost + ' pt)' : '') + ' — ' + node.desc
      + (maxRank > 1 ? ' [RANK ' + rank + '/' + maxRank + (rankable ? ' — buy again to rank up' : ' — fully ranked') + ']' : '')
      + (spentLocked ? ' [BREADTH GATE — needs ' + spentGate.need + ' pt spent in this ' + (spentGate.scope === 'tab' ? 'character tree' : 'branch') + ', ' + spentGate.have + ' so far]' : '')
      + (unaffordable ? ' [need ' + nextCost + ' pt, have ' + unlocks.skillTree.points + ']' : '')
      + (cursed ? ' [CURSED — permanent drawback]' : '')
      + (tradeoff ? ' [TRADE-OFF — a gain paid for with a loss]' : '')
      + (keystone ? ' [KEYSTONE — buying it locks out its alternatives]' : '')
      + (convergence ? ' [needs every incoming path: ' + parentIds.join(', ') + ']' : '')
      + (excludedBy ? ' [LOCKED OUT — you already own "' + ((excludedByNode && excludedByNode.name) || excludedBy) + '", which excludes this choice]' : '')
      + (isUniqueMechanic ? ' [unique mechanic]' : '')
      + (isSynergy ? ' [SYNERGY — its payoff scales with how many owned nodes carry the tag' + (synergyTags.length ? ' ' + synergyTags.join(', ') : '') + ']' : '')
      + (sellable && !affordable ? ' [click to sell back for ' + skillNodeRankCost(node, rank) + ' pt]' : '');

    const glyph = document.createElement('span');
    glyph.className = 'skilltree-node-glyph' + (node.icon ? ' icon' : '');
    glyph.textContent = node.icon ? node.icon
      : isAscension ? '⚡' : isCapstone ? '♛' : (node.name || '?').trim().charAt(0).toUpperCase();
    el.appendChild(glyph);
    if (node.cost) {
      const costBadge = document.createElement('span');
      costBadge.className = 'skilltree-node-cost';
      costBadge.textContent = nextCost;
      el.appendChild(costBadge);
    }
    if (maxRank > 1) {
      const rankBadge = document.createElement('span');
      rankBadge.className = 'skilltree-node-rank';
      rankBadge.textContent = rank + '/' + maxRank;
      el.appendChild(rankBadge);
    }
    if (spentLocked) {
      const gateBadge = document.createElement('span');
      gateBadge.className = 'skilltree-node-spentgate';
      gateBadge.textContent = '◔';
      el.appendChild(gateBadge);
    }
    if (isUniqueMechanic) {
      const uniqueBadge = document.createElement('span');
      uniqueBadge.className = 'skilltree-node-unique';
      uniqueBadge.textContent = '✦';
      el.appendChild(uniqueBadge);
    }
    if (isSynergy) {
      const synergyBadge = document.createElement('span');
      synergyBadge.className = 'skilltree-node-synergy';
      synergyBadge.textContent = '◈';
      el.appendChild(synergyBadge);
    }
    if (excludedBy) {
      const lockBadge = document.createElement('span');
      lockBadge.className = 'skilltree-node-lock';
      lockBadge.textContent = '🔒';
      el.appendChild(lockBadge);
    }
    if (sellable) {

      const refundBadge = document.createElement('span');
      refundBadge.className = 'skilltree-node-refund';
      refundBadge.textContent = '↩';
      el.appendChild(refundBadge);
    }
    const label = document.createElement('span');
    label.className = 'skilltree-node-label';
    label.textContent = node.name;
    el.appendChild(label);
    if (affordable) {
      el.addEventListener('click', () => {
        if (buySkillNode(node.id)) {
          Sound.play(isAscension ? 'ascensionChime' : isCapstone ? 'achievement' : 'shopBuy');
          skillTreeLastBoughtId = node.id;
          buildSkillTreePanel();
        }
      });
    } else if (sellable) {

      el.disabled = false;
      el.addEventListener('click', () => {
        const refund = skillNodeRankCost(node, rank);
        if (!confirm('Sell "' + node.name + '" back for ' + refund + ' point' + (refund === 1 ? '' : 's') + '?')) return;
        if (sellSkillNode(node.id)) { Sound.play('coin'); buildSkillTreePanel(); }
        else Sound.play('uiDeny');
      });
    } else {
      el.disabled = !owned;
    }

    el.addEventListener('mouseenter', () => showSkillNodeDetail(node));
    el.dataset.nodeId = node.id;
    canvas.appendChild(el);
    minimapPoints.push({
      x: px.left + SKILL_TREE_NODE_SIZE / 2,
      y: px.top + SKILL_TREE_NODE_SIZE / 2,
      state: owned ? 'owned' : affordable ? 'buyable' : 'unaffordable',
      cursed,
      tradeoff,
      excluded: !!excludedBy,
      endgame: isCapstone || isAscension,
      endgameColor: isAscension ? '#4fd8ff' : '#e3c15d',
      synergy: isSynergy,
      branch: skillNodeBranchKey(node.id),
    });
  }

  scroller.appendChild(canvas);
  wrap.appendChild(scroller);

  const SKILL_TREE_ZOOM_MIN = 0.4;
  const SKILL_TREE_ZOOM_MAX = 2;
  const SKILL_TREE_ZOOM_STEP = 0.1;
  const zoomReadoutEl = document.getElementById('skillTreeZoomReadout');
  function applyTransform(){
    canvas.style.transform = 'translate(' + skillTreePanX.toFixed(2) + 'px,' + skillTreePanY.toFixed(2) + 'px) scale(' + skillTreeZoom.toFixed(3) + ')';
    if (zoomReadoutEl) zoomReadoutEl.textContent = Math.round(skillTreeZoom * 100) + '%';
    drawMinimap();
  }

  skillTreeApplyTransform = applyTransform;

  const minimapCanvas = document.getElementById('skillTreeMinimap');
  const minimapCtx = minimapCanvas && minimapCanvas.getContext && minimapCanvas.getContext('2d');
  const MINIMAP_COLORS = { owned:'#ffd970', buyable:'#a97bff', unaffordable:'#6b6b78' };
  let minimapScale = 1, minimapOffsetX = 0, minimapOffsetY = 0;
  function drawMinimap(){
    if (!minimapCtx) return;
    const mw = minimapCanvas.width, mh = minimapCanvas.height;
    minimapCtx.clearRect(0, 0, mw, mh);
    if (!canvasW || !canvasH) return;
    const pad = 8;
    minimapScale = Math.min((mw - pad * 2) / canvasW, (mh - pad * 2) / canvasH);
    minimapOffsetX = (mw - canvasW * minimapScale) / 2;
    minimapOffsetY = (mh - canvasH * minimapScale) / 2;
    const dense = minimapPoints.length > 180;
    const baseDot = dense ? 1.7 : 2.1;
    const bigDot = dense ? 2.8 : 3.2;
    for (const p of minimapPoints) {
      const mx = minimapOffsetX + p.x * minimapScale;
      const my = minimapOffsetY + p.y * minimapScale;
      const big = p.cursed || p.endgame || p.tradeoff || p.synergy;
      if (p.state === 'unaffordable' && p.branch) {
        minimapCtx.fillStyle = 'hsl(' + skillTreeBranchHue(p.branch) + ',42%,58%)';
        minimapCtx.globalAlpha = 0.55;
      } else {
        minimapCtx.fillStyle = MINIMAP_COLORS[p.state] || MINIMAP_COLORS.unaffordable;
        minimapCtx.globalAlpha = 1;
      }
      minimapCtx.beginPath();
      minimapCtx.arc(mx, my, big ? bigDot : baseDot, 0, Math.PI * 2);
      minimapCtx.fill();
      minimapCtx.globalAlpha = 1;
      let ring = null;
      if (p.excluded) ring = '#8a7fb8';
      else if (p.cursed) ring = '#ff4d4d';
      else if (p.tradeoff) ring = '#f0a840';
      else if (p.endgame) ring = p.endgameColor;
      else if (p.synergy) ring = '#5ae0a0';
      if (ring) {
        minimapCtx.strokeStyle = ring;
        minimapCtx.lineWidth = 1.1;
        minimapCtx.stroke();
      }
      if (p.state === 'buyable') {
        minimapCtx.strokeStyle = 'rgba(255,255,255,.55)';
        minimapCtx.lineWidth = 0.7;
        minimapCtx.stroke();
      }
    }

    const viewportW = scroller.clientWidth || canvasW;
    const viewportH = scroller.clientHeight || canvasH;
    const worldLeft = -skillTreePanX / skillTreeZoom;
    const worldTop = -skillTreePanY / skillTreeZoom;
    const worldW = viewportW / skillTreeZoom;
    const worldH = viewportH / skillTreeZoom;
    minimapCtx.strokeStyle = '#4fd8ff';
    minimapCtx.lineWidth = 1.2;
    minimapCtx.strokeRect(
      minimapOffsetX + worldLeft * minimapScale, minimapOffsetY + worldTop * minimapScale,
      worldW * minimapScale, worldH * minimapScale
    );
  }
  if (minimapCanvas) {
    minimapCanvas.onclick = (e) => {
      const rect = minimapCanvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (minimapCanvas.width / rect.width);
      const my = (e.clientY - rect.top) * (minimapCanvas.height / rect.height);
      if (!minimapScale) return;
      const worldX = (mx - minimapOffsetX) / minimapScale;
      const worldY = (my - minimapOffsetY) / minimapScale;
      Sound.play('uiClick');
      centerOnWorldPixel(worldX, worldY);
    };
  }

  if (skillTreeZoom == null) {
    skillTreeZoom = 1;
    skillTreePanX = 0;
    skillTreePanY = 0;
    const rootPos = positions[skillTreeTabRootId(skillTreeActiveTab)] || positions['start'];
    if (rootPos) {
      const rootPx = toPx(rootPos);
      const rootCenterX = rootPx.left + SKILL_TREE_NODE_SIZE / 2;
      const rootCenterY = rootPx.top + SKILL_TREE_NODE_SIZE / 2;
      const viewportW = scroller.clientWidth || canvasW;
      const viewportH = scroller.clientHeight || canvasH;
      skillTreePanX = viewportW / 2 - rootCenterX;
      skillTreePanY = viewportH / 2 - rootCenterY;
    }
  }
  applyTransform();

  function centerOnWorldPixel(worldX, worldY){
    const viewportW = scroller.clientWidth || canvasW;
    const viewportH = scroller.clientHeight || canvasH;
    skillTreePanX = viewportW / 2 - worldX * skillTreeZoom;
    skillTreePanY = viewportH / 2 - worldY * skillTreeZoom;
    applyTransform();
  }
  function centerOnNode(nodeId){
    const pos = positions[nodeId];
    if (!pos) return false;
    const px = toPx(pos);
    centerOnWorldPixel(px.left + SKILL_TREE_NODE_SIZE / 2, px.top + SKILL_TREE_NODE_SIZE / 2);
    return true;
  }

  function focusOnRect(bx0, by0, bx1, by1){
    const viewportW = scroller.clientWidth || canvasW;
    const viewportH = scroller.clientHeight || canvasH;
    const pad = SKILL_TREE_BRANCH_FOCUS_PAD;
    const boxW = Math.max(1, (bx1 - bx0) + SKILL_TREE_NODE_SIZE + pad * 2);
    const boxH = Math.max(1, (by1 - by0) + SKILL_TREE_NODE_SIZE + pad * 2);
    skillTreeZoom = Util.clamp(Math.min(viewportW / boxW, viewportH / boxH), SKILL_TREE_ZOOM_MIN, SKILL_TREE_ZOOM_MAX);
    const cx = (bx0 + bx1) / 2 + SKILL_TREE_NODE_SIZE / 2;
    const cy = (by0 + by1) / 2 + SKILL_TREE_NODE_SIZE / 2;
    skillTreePanX = viewportW / 2 - cx * skillTreeZoom;
    skillTreePanY = viewportH / 2 - cy * skillTreeZoom;
    applyTransform();
  }

  const branchBar = document.getElementById('skillTreeBranchBar');
  if (branchBar) {
    branchBar.innerHTML = '';
    const branchBounds = {};
    for (const node of visibleNodes) {
      const pos = positions[node.id];
      if (!pos) continue;
      const key = skillNodeBranchKey(node.id);
      if (!key) continue;
      const px = toPx(pos);
      const b = branchBounds[key] || (branchBounds[key] = { x0:Infinity, y0:Infinity, x1:-Infinity, y1:-Infinity, total:0, owned:0 });
      if (px.left < b.x0) b.x0 = px.left;
      if (px.top < b.y0) b.y0 = px.top;
      if (px.left > b.x1) b.x1 = px.left;
      if (px.top > b.y1) b.y1 = px.top;
      b.total++;
      if (isSkillNodeOwned(unlocks, node.id)) b.owned++;
    }
    const keys = Object.keys(branchBounds).sort();
    for (const key of keys) {
      const b = branchBounds[key];
      const letter = key.slice(key.indexOf('|') + 1);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'skilltree-branch-btn' + (key === skillTreeFocusedBranch ? ' active' : '');
      btn.style.setProperty('--branch-hue', skillTreeBranchHue(key));
      btn.textContent = letter.toUpperCase() + ' ' + b.owned + '/' + b.total;
      btn.title = 'Zoom to branch "' + letter.toUpperCase() + '" — ' + b.total + ' visible node' + (b.total === 1 ? '' : 's') + ', ' + b.owned + ' owned';
      btn.onclick = () => {
        Sound.play('uiClick');
        skillTreeFocusedBranch = key;
        branchBar.querySelectorAll('.skilltree-branch-btn').forEach(other => other.classList.remove('active'));
        btn.classList.add('active');
        focusOnRect(b.x0, b.y0, b.x1, b.y1);
      };
      branchBar.appendChild(btn);
    }
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'skilltree-branch-btn branch-all' + (skillTreeFocusedBranch ? '' : ' active');
    allBtn.textContent = 'Whole tree';
    allBtn.title = 'Zoom back out to fit the whole character tree';
    allBtn.onclick = () => {
      Sound.play('uiClick');
      skillTreeFocusedBranch = null;
      branchBar.querySelectorAll('.skilltree-branch-btn').forEach(other => other.classList.remove('active'));
      allBtn.classList.add('active');
      focusOnRect(SKILL_TREE_PADDING, SKILL_TREE_PADDING, canvasW - SKILL_TREE_PADDING, canvasH - SKILL_TREE_PADDING);
    };
    branchBar.insertBefore(allBtn, branchBar.firstChild);
  }

  const tabStrip = document.getElementById('skillTreeTabStrip');
  if (tabStrip) {
    const tabTotals = {}, tabOwned = {};
    for (const n of SKILL_TREE_NODES) {
      const tab = getSkillTreeNodeTab(n.id);
      if (!tab) continue;
      tabTotals[tab] = (tabTotals[tab] || 0) + 1;
      if (isSkillNodeOwned(unlocks, n.id)) tabOwned[tab] = (tabOwned[tab] || 0) + 1;
    }
    tabStrip.querySelectorAll('.skilltree-tab').forEach(btn => {
      const tab = btn.dataset.tab;
      btn.classList.toggle('active', tab === skillTreeActiveTab);
      const countEl = btn.querySelector('.skilltree-tab-count');
      if (countEl) countEl.textContent = (tabOwned[tab] || 0) + '/' + (tabTotals[tab] || 0);
      btn.onclick = () => { Sound.play('uiClick'); setSkillTreeActiveTab(tab); };
    });
    const activeBtn = tabStrip.querySelector('.skilltree-tab.active');
    if (activeBtn && activeBtn.scrollIntoView) activeBtn.scrollIntoView({ block:'nearest' });
  }

  const recenterBtn = document.getElementById('skillTreeRecenterBtn');
  if (recenterBtn) recenterBtn.onclick = () => {
    Sound.play('uiClick');
    skillTreeFocusedBranch = null;
    if (branchBar) branchBar.querySelectorAll('.skilltree-branch-btn').forEach(b => b.classList.toggle('active', b.classList.contains('branch-all')));
    if (!centerOnNode(skillTreeTabRootId(skillTreeActiveTab))) centerOnNode('start');
  };

  const undoBtn = document.getElementById('skillTreeUndoBtn');
  if (undoBtn) {
    const undoable = !!skillTreeLastBoughtId && canSellSkillNode(unlocks, skillTreeLastBoughtId);
    undoBtn.classList.toggle('hidden', !undoable);
    undoBtn.disabled = !undoable;
    undoBtn.onclick = () => {
      if (!skillTreeLastBoughtId || !canSellSkillNode(unlocks, skillTreeLastBoughtId)) return;
      const undoneNode = SKILL_TREE_NODES_BY_ID[skillTreeLastBoughtId];
      if (sellSkillNode(skillTreeLastBoughtId)) {
        Sound.play('coin');
        skillTreeLastBoughtId = null;
        buildSkillTreePanel();
        showSkillNodeDetail(undoneNode || null);
      } else {
        Sound.play('uiDeny');
      }
    };
  }

  const overviewPanel = document.getElementById('skillTreeOverviewPanel');
  const overviewList = document.getElementById('skillTreeOverviewList');
  const overviewBtn = document.getElementById('skillTreeOverviewBtn');
  const overviewCloseBtn = document.getElementById('skillTreeOverviewCloseBtn');
  if (overviewList) {
    overviewList.innerHTML = '';
    const rows = [];
    for (const classId in CLASSES) {
      const prefix = 'char_' + classId + '_';
      let owned = 0, total = 0, spent = 0, hasCapstone = false, hasAscension = false;
      for (const n of SKILL_TREE_NODES) {
        if (n.id.indexOf(prefix) !== 0) continue;
        total++;
        if (isSkillNodeOwned(unlocks, n.id)) {
          owned++;
          spent += n.cost || 0;
          if (/_capstone$/.test(n.id)) hasCapstone = true;
          if (/_ascension$/.test(n.id)) hasAscension = true;
        }
      }
      if (owned > 0) rows.push({ classId, owned, total, spent, hasCapstone, hasAscension });
    }
    rows.sort((a, b) => b.spent - a.spent);
    if (!rows.length) {
      const empty = document.createElement('div');
      empty.className = 'skilltree-overview-empty';
      empty.textContent = 'No nodes owned yet — spend a point to get started.';
      overviewList.appendChild(empty);
    } else {
      for (const r of rows) {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'skilltree-overview-row';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'skilltree-overview-name';
        nameSpan.textContent = (CLASSES[r.classId].name || r.classId) + (r.hasCapstone ? ' ♛' : '') + (r.hasAscension ? ' ⚡' : '');
        const statsSpan = document.createElement('span');
        statsSpan.className = 'skilltree-overview-stats';
        statsSpan.textContent = r.owned + '/' + r.total + ' · ' + r.spent + ' pt';
        row.appendChild(nameSpan);
        row.appendChild(statsSpan);
        row.addEventListener('click', () => {
          Sound.play('uiClick');
          if (r.classId !== skillTreeActiveTab) { setSkillTreeActiveTab(r.classId); return; }
          centerOnNode('char_hub_' + r.classId);
        });
        overviewList.appendChild(row);
      }
    }
  }
  if (overviewPanel) overviewPanel.classList.toggle('hidden', !skillTreeOverviewOpen);
  if (overviewBtn) overviewBtn.onclick = () => {
    Sound.play('uiClick');
    skillTreeOverviewOpen = !skillTreeOverviewOpen;
    if (overviewPanel) overviewPanel.classList.toggle('hidden', !skillTreeOverviewOpen);
  };
  if (overviewCloseBtn) overviewCloseBtn.onclick = () => {
    Sound.play('uiClick');
    skillTreeOverviewOpen = false;
    if (overviewPanel) overviewPanel.classList.add('hidden');
  };

  const filterBar = document.getElementById('skillTreeFilterBar');
  if (filterBar) {
    filterBar.querySelectorAll('.skilltree-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === skillTreeFilter);
      btn.onclick = () => { Sound.play('uiClick'); skillTreeFilter = btn.dataset.filter; buildSkillTreePanel(); };
    });
  }
  bindSkillTreeKeyboardNav();

  const searchInput = document.getElementById('skillTreeSearchInput');
  const searchCountEl = document.getElementById('skillTreeSearchCount');
  const searchPrevBtn = document.getElementById('skillTreeSearchPrevBtn');
  const searchNextBtn = document.getElementById('skillTreeSearchNextBtn');
  let searchMatches = [];
  let searchIndex = -1;
  function updateSearchUI(){
    canvas.querySelectorAll('.skilltree-node.search-match').forEach(el => el.classList.remove('search-match'));
    if (searchCountEl) searchCountEl.textContent = !searchMatches.length ? (searchInput && searchInput.value ? '0 / 0' : '') : (searchIndex + 1) + ' / ' + searchMatches.length;
    if (searchIndex >= 0) {
      const id = searchMatches[searchIndex];
      const el = canvas.querySelector('.skilltree-node[data-node-id="' + id + '"]');
      if (el) el.classList.add('search-match');
      centerOnNode(id);
    }
  }
  function runSearch(){
    const q = ((searchInput && searchInput.value) || '').trim().toLowerCase();
    if (!q) { searchMatches = []; searchIndex = -1; updateSearchUI(); return; }
    searchMatches = SKILL_TREE_NODES.filter(n => tabNodeSet[n.id] && isVisible(n.id) &&
      (((n.name || '').toLowerCase().indexOf(q) !== -1) || ((n.desc || '').toLowerCase().indexOf(q) !== -1))
    ).map(n => n.id);
    searchIndex = searchMatches.length ? 0 : -1;
    updateSearchUI();
  }
  function stepSearch(dir){
    if (!searchMatches.length) return;
    searchIndex = (searchIndex + dir + searchMatches.length) % searchMatches.length;
    updateSearchUI();
  }
  if (searchInput) {
    searchInput.oninput = runSearch;
    if (searchInput.value) runSearch();

    searchInput.onkeydown = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); stepSearch(e.shiftKey ? -1 : 1); }
      else if (e.key === 'Escape') { searchInput.value = ''; runSearch(); searchInput.blur(); }
    };
  }
  if (searchPrevBtn) searchPrevBtn.onclick = () => { Sound.play('uiClick'); stepSearch(-1); };
  if (searchNextBtn) searchNextBtn.onclick = () => { Sound.play('uiClick'); stepSearch(1); };

  scroller.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = scroller.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    const dir = e.deltaY < 0 ? 1 : -1;
    const newZoom = Util.clamp(skillTreeZoom + dir * SKILL_TREE_ZOOM_STEP, SKILL_TREE_ZOOM_MIN, SKILL_TREE_ZOOM_MAX);
    if (newZoom === skillTreeZoom) return;
    const worldX = (cursorX - skillTreePanX) / skillTreeZoom;
    const worldY = (cursorY - skillTreePanY) / skillTreeZoom;
    skillTreePanX = cursorX - worldX * newZoom;
    skillTreePanY = cursorY - worldY * newZoom;
    skillTreeZoom = newZoom;
    applyTransform();
  }, { passive: false });

  let dragging = false;
  let dragStartX = 0, dragStartY = 0, panStartX = 0, panStartY = 0;
  scroller.addEventListener('mousedown', (e) => {
    if (e.target.closest && e.target.closest('.skilltree-node')) return;
    dragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    panStartX = skillTreePanX;
    panStartY = skillTreePanY;
    scroller.classList.add('skilltree-dragging');
  });
  scroller.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    skillTreePanX = panStartX + (e.clientX - dragStartX);
    skillTreePanY = panStartY + (e.clientY - dragStartY);
    applyTransform();
  });
  function endDrag(){
    if (!dragging) return;
    dragging = false;
    scroller.classList.remove('skilltree-dragging');
  }
  scroller.addEventListener('mouseup', endDrag);
  scroller.addEventListener('mouseleave', endDrag);

  scroller.addEventListener('mouseleave', () => showSkillNodeDetail(null));
}
