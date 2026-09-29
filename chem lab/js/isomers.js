const ISOMER_VALENCE = { C: 4, N: 3, O: 2, S: 2, P: 3, F: 1, Cl: 1, Br: 1, I: 1 };
const ISOMER_HALOGENS = new Set(['F', 'Cl', 'Br', 'I']);
const ISOMER_SETTINGS = { maxHeavy: 12, limit: 2000, timeBudgetMs: 4000, stepMs: 25 };
const ISOMER_SUBSCRIPTS = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };

function parseFormula(text) {
  const clean = String(text || '').replace(/[₀-₉]/g, (d) => ISOMER_SUBSCRIPTS[d]).replace(/\s+/g, '');
  if (!clean) {
    return { error: 'Enter a molecular formula such as C6H14' };
  }
  if (!/^([A-Z][a-z]?\d*)+$/.test(clean)) {
    return { error: 'Could not read “' + text + '” as a formula' };
  }
  const counts = {};
  const pattern = /([A-Z][a-z]?)(\d*)/g;
  let match;
  while ((match = pattern.exec(clean)) !== null) {
    const element = match[1];
    if (element !== 'H' && !Object.prototype.hasOwnProperty.call(ISOMER_VALENCE, element)) {
      return { error: 'Element ' + element + ' is not supported (use C, H, N, O, S, P, F, Cl, Br, I)' };
    }
    const n = match[2] === '' ? 1 : Number(match[2]);
    if (!Number.isInteger(n) || n < 0) {
      return { error: 'Bad count for ' + element };
    }
    counts[element] = (counts[element] || 0) + n;
  }
  Object.keys(counts).forEach((element) => {
    if (counts[element] === 0) {
      delete counts[element];
    }
  });
  const heavy = isomerHeavyCount(counts);
  if (heavy === 0) {
    return { error: 'The formula needs at least one heavy atom' };
  }
  const dou = isomerUnsaturation(counts);
  if (!Number.isInteger(dou)) {
    return { error: 'Impossible formula — the degree of unsaturation is not a whole number' };
  }
  if (dou < 0) {
    return { error: 'Too many hydrogens — the degree of unsaturation is negative' };
  }
  return counts;
}

function isomerHeavyCount(counts) {
  return Object.keys(counts).filter((e) => e !== 'H').reduce((sum, e) => sum + counts[e], 0);
}

function isomerUnsaturation(counts) {
  const heavy = Object.keys(counts).filter((e) => e !== 'H');
  const valenceSum = heavy.reduce((sum, e) => sum + ISOMER_VALENCE[e] * counts[e], 0);
  const n = isomerHeavyCount(counts);
  return (valenceSum - 2 * (n - 1) - (counts.H || 0)) / 2;
}

function isomerFormulaText(counts) {
  const order = [];
  if (counts.C) {
    order.push('C');
  }
  if (counts.H) {
    order.push('H');
  }
  Object.keys(counts).filter((e) => e !== 'C' && e !== 'H').sort().forEach((e) => order.push(e));
  return order.map((e) => (counts[e] > 1 ? e + counts[e] : e)).join('');
}

function isomerRefine(n, adj, colors) {
  let current = colors.slice();
  let classes = new Set(current).size;
  for (;;) {
    const sigs = [];
    for (let i = 0; i < n; i++) {
      const parts = [];
      for (let j = 0; j < n; j++) {
        const o = adj[i * n + j];
        if (o) {
          parts.push(o + '.' + String(current[j]).padStart(3, '0'));
        }
      }
      sigs.push(String(current[i]).padStart(3, '0') + ':' + parts.sort().join(','));
    }
    const sorted = Array.from(new Set(sigs)).sort();
    const rank = new Map(sorted.map((s, index) => [s, index]));
    current = sigs.map((s) => rank.get(s));
    if (sorted.length === classes) {
      return current;
    }
    classes = sorted.length;
  }
}

function isomerLeafString(n, el, adj, colors) {
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => colors[a] - colors[b]);
  let text = order.map((i) => el[i]).join(',') + ';';
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      text += adj[order[a] * n + order[b]];
    }
  }
  return text;
}

function isomerCanonicalString(el, adj, extra) {
  const n = el.length;
  if (n === 0) {
    return '';
  }
  const labels = el.map((e, i) => {
    const orders = [];
    for (let j = 0; j < n; j++) {
      if (adj[i * n + j]) {
        orders.push(adj[i * n + j]);
      }
    }
    return e + (extra ? extra[i] : '') + '|' + orders.sort().join('');
  });
  const sortedLabels = Array.from(new Set(labels)).sort();
  const start = isomerRefine(n, adj, labels.map((l) => sortedLabels.indexOf(l)));
  const tags = el.map((e, i) => e + (extra ? extra[i] : ''));
  let best = null;
  const search = (colors) => {
    const sizes = new Map();
    colors.forEach((c) => sizes.set(c, (sizes.get(c) || 0) + 1));
    let target = -1;
    sizes.forEach((size, color) => {
      if (size > 1 && (target === -1 || color < target)) {
        target = color;
      }
    });
    if (target === -1) {
      const leaf = isomerLeafString(n, tags, adj, colors);
      if (best === null || leaf < best) {
        best = leaf;
      }
      return;
    }
    for (let v = 0; v < n; v++) {
      if (colors[v] !== target) {
        continue;
      }
      const next = colors.map((c, i) => (c * 2 + (c === target && i !== v ? 1 : 0)));
      search(isomerRefine(n, adj, next));
    }
  };
  search(start);
  return best;
}

function isomerStateFromGraph(graph, atomIds) {
  const ids = atomIds || graph.atoms.map((a) => a.id);
  const index = new Map(ids.map((id, i) => [id, i]));
  const n = ids.length;
  const el = ids.map((id) => graph.getAtom(id).element);
  const adj = new Array(n * n).fill(0);
  graph.bonds.forEach((b) => {
    if (index.has(b.atomA) && index.has(b.atomB)) {
      const i = index.get(b.atomA);
      const j = index.get(b.atomB);
      adj[i * n + j] = b.order;
      adj[j * n + i] = b.order;
    }
  });
  return { el, adj, n, index, ids };
}

function isomerCanonicalKey(graph, atomIds) {
  const state = isomerStateFromGraph(graph, atomIds);
  return isomerCanonicalString(state.el, state.adj);
}

function isomerBondSum(state, i) {
  let sum = 0;
  for (let j = 0; j < state.n; j++) {
    sum += state.adj[i * state.n + j];
  }
  return sum;
}

function isomerFree(state, i) {
  return ISOMER_VALENCE[state.el[i]] - isomerBondSum(state, i);
}

function isomerNeighbors(state, i) {
  const out = [];
  for (let j = 0; j < state.n; j++) {
    if (state.adj[i * state.n + j]) {
      out.push(j);
    }
  }
  return out;
}

function isomerPathLength(state, from, to, blockedVertex, blockedEdge) {
  const dist = new Map([[from, 0]]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift();
    for (const next of isomerNeighbors(state, cur)) {
      if (next === blockedVertex || dist.has(next)) {
        continue;
      }
      if (blockedEdge && ((cur === blockedEdge[0] && next === blockedEdge[1]) || (cur === blockedEdge[1] && next === blockedEdge[0]))) {
        continue;
      }
      dist.set(next, dist.get(cur) + 1);
      if (next === to) {
        return dist.get(next);
      }
      queue.push(next);
    }
  }
  return -1;
}

function isomerLongestCycleThrough(state, u, v) {
  let best = -1;
  const visited = new Set([u]);
  const walk = (cur, length) => {
    for (const next of isomerNeighbors(state, cur)) {
      if (cur === u && next === v) {
        continue;
      }
      if (next === v) {
        best = Math.max(best, length + 1);
        continue;
      }
      if (visited.has(next)) {
        continue;
      }
      visited.add(next);
      walk(next, length + 1);
      visited.delete(next);
    }
  };
  walk(u, 1);
  return best;
}

function isomerRingBond(state, i, j) {
  return isomerPathLength(state, i, j, -1, [i, j]) > 0;
}

function isomerAromaticAtom(state, start) {
  const n = state.n;
  const walk = (cur, depth, path, lastOrder) => {
    for (const next of isomerNeighbors(state, cur)) {
      const order = state.adj[cur * n + next];
      if ((order !== 1 && order !== 2) || order === lastOrder) {
        continue;
      }
      if (next === start && depth === 5) {
        return true;
      }
      if (depth < 5 && !path.includes(next) && walk(next, depth + 1, path.concat([next]), order)) {
        return true;
      }
    }
    return false;
  };
  return walk(start, 0, [start], 0);
}

function isomerHeteroPairAllowed(a, b) {
  return a === 'C' || b === 'C' || (a === 'N' && b === 'N') || (a === 'S' && b === 'S');
}

function isomerPermanentHeteroLink(state, a, b) {
  return state.adj[a * state.n + b] === 1 && !isomerHeteroPairAllowed(state.el[a], state.el[b]) &&
    (isomerFree(state, a) < 1 || isomerFree(state, b) < 1);
}

function isomerIsStable(state) {
  const n = state.n;
  const el = state.el;
  const hydrogens = el.map((_, i) => isomerFree(state, i));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const order = state.adj[i * n + j];
      if (order === 1 && !isomerHeteroPairAllowed(el[i], el[j])) {
        return false;
      }
      if (order === 3 && isomerRingBond(state, i, j)) {
        const ring = isomerPathLength(state, i, j, -1, [i, j]) + 1;
        if (ring < 8) {
          return false;
        }
      }
    }
  }
  for (let i = 0; i < n; i++) {
    const nbrs = isomerNeighbors(state, i);
    if (el[i] === 'O' && nbrs.length === 1 && hydrogens[i] === 1) {
      const c = nbrs[0];
      const multiple = isomerNeighbors(state, c).some((k) => el[k] === 'C' && state.adj[c * n + k] >= 2);
      if (el[c] === 'C' && multiple && !isomerAromaticAtom(state, c)) {
        return false;
      }
    }
    if (el[i] === 'C') {
      const saturated = nbrs.every((k) => state.adj[i * n + k] === 1);
      if (saturated) {
        const oxygens = nbrs.filter((k) => el[k] === 'O');
        const hydroxyls = oxygens.filter((k) => hydrogens[k] === 1);
        const nitrogens = nbrs.filter((k) => el[k] === 'N');
        if (oxygens.length >= 2 && hydroxyls.length >= 1) {
          return false;
        }
        if (nitrogens.length >= 2 || (nitrogens.length >= 1 && hydroxyls.length >= 1)) {
          return false;
        }
      }
      const doubles = nbrs.filter((k) => state.adj[i * n + k] === 2);
      if (doubles.length === 2) {
        const ring = isomerPathLength(state, doubles[0], doubles[1], i, null);
        if (ring > 0 && ring + 2 < 9) {
          return false;
        }
      }
    }
  }
  for (let u = 0; u < n; u++) {
    for (let v = 0; v < n; v++) {
      if (u === v || state.adj[u * n + v] !== 2 || !isomerRingBond(state, u, v)) {
        continue;
      }
      const others = isomerNeighbors(state, u).filter((k) => k !== v && isomerRingBond(state, u, k));
      if (others.length < 2) {
        continue;
      }
      let bridged = false;
      for (let a = 0; a < others.length && !bridged; a++) {
        for (let b = a + 1; b < others.length && !bridged; b++) {
          const blocked = { u, v };
          bridged = isomerPathAvoiding(state, others[a], others[b], blocked);
        }
      }
      if (bridged && isomerLongestCycleThrough(state, u, v) < 8) {
        return false;
      }
    }
  }
  return true;
}

function isomerPathAvoiding(state, from, to, blocked) {
  const seen = new Set([from, blocked.u, blocked.v]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift();
    for (const next of isomerNeighbors(state, cur)) {
      if (next === to) {
        return true;
      }
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}

function isomerStateToGraph(state) {
  const graph = new Graph();
  const atoms = state.el.map((e) => graph.addAtom(e, 0, 0));
  for (let i = 0; i < state.n; i++) {
    for (let j = i + 1; j < state.n; j++) {
      const order = state.adj[i * state.n + j];
      if (order) {
        graph.addBond(atoms[i].id, atoms[j].id).order = order;
      }
    }
  }
  return graph;
}

function isomerGrow(state, element, attach) {
  const n = state.n;
  const m = n + 1;
  const adj = new Array(m * m).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      adj[i * m + j] = state.adj[i * n + j];
    }
  }
  adj[attach * m + n] = 1;
  adj[n * m + attach] = 1;
  return { el: state.el.concat([element]), adj, n: m };
}

function isomerEnumerator(counts, options) {
  const opts = Object.assign({ stableOnly: true, limit: ISOMER_SETTINGS.limit, timeBudgetMs: ISOMER_SETTINGS.timeBudgetMs }, options || {});
  const job = { isomers: [], complete: false, done: false, error: null, elapsed: 0, visited: 0, cancelled: false };
  const heavy = isomerHeavyCount(counts);
  if (heavy > ISOMER_SETTINGS.maxHeavy) {
    job.error = 'too large';
    job.done = true;
    return Object.assign(job, { step: () => true, result: () => ({ error: 'too large', isomers: [], complete: false, count: 0 }) });
  }
  const dou = isomerUnsaturation(counts);
  if (heavy === 0 || dou < 0 || !Number.isInteger(dou)) {
    job.error = 'bad formula';
    job.done = true;
    return Object.assign(job, { step: () => true, result: () => ({ error: 'bad formula', isomers: [], complete: false, count: 0 }) });
  }
  const elements = Object.keys(counts).filter((e) => e !== 'H');
  const first = elements.slice().sort((a, b) => ISOMER_VALENCE[b] - ISOMER_VALENCE[a] || a.localeCompare(b))[0];
  const seen = new Set();
  const stack = [];
  const push = (state, remaining, units) => {
    const key = isomerCanonicalString(state.el, state.adj);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    stack.push({ state, remaining, units, key });
  };
  const remaining0 = Object.assign({}, counts);
  delete remaining0.H;
  remaining0[first] -= 1;
  push({ el: [first], adj: [0], n: 1 }, remaining0, dou);
  const expand = (entry) => {
    const { state, remaining, units } = entry;
    const left = elements.reduce((sum, e) => sum + remaining[e], 0);
    if (left > 0) {
      for (let i = 0; i < state.n; i++) {
        if (isomerFree(state, i) < 1) {
          continue;
        }
        elements.forEach((e) => {
          if (remaining[e] > 0) {
            const next = isomerGrow(state, e, i);
            const freeTotal = next.el.reduce((sum, _, k) => sum + isomerFree(next, k), 0);
            if ((left - 1 > 0 && freeTotal < 1) || (opts.stableOnly && isomerPermanentHeteroLink(next, i, next.n - 1))) {
              return;
            }
            const rest = Object.assign({}, remaining);
            rest[e] -= 1;
            push(next, rest, units);
          }
        });
      }
      return;
    }
    if (units > 0) {
      const n = state.n;
      for (let i = 0; i < n; i++) {
        if (isomerFree(state, i) < 1) {
          continue;
        }
        for (let j = i + 1; j < n; j++) {
          if (isomerFree(state, j) < 1 || state.adj[i * n + j] >= 3) {
            continue;
          }
          const adj = state.adj.slice();
          adj[i * n + j] += 1;
          adj[j * n + i] += 1;
          const next = { el: state.el, adj, n };
          if (opts.stableOnly && isomerPermanentHeteroLink(next, i, j)) {
            continue;
          }
          push(next, remaining, units - 1);
        }
      }
      return;
    }
    if (!opts.stableOnly || isomerIsStable(state)) {
      job.isomers.push({ graph: isomerStateToGraph(state), key: entry.key });
    }
  };
  job.step = (budgetMs) => {
    if (job.done) {
      return true;
    }
    const started = Date.now();
    const slice = budgetMs === undefined ? Infinity : budgetMs;
    while (stack.length) {
      if (job.cancelled || job.isomers.length >= opts.limit || job.elapsed + (Date.now() - started) > opts.timeBudgetMs) {
        break;
      }
      expand(stack.pop());
      job.visited++;
      if ((job.visited & 15) === 0 && Date.now() - started > slice) {
        break;
      }
    }
    job.elapsed += Date.now() - started;
    if (stack.length === 0) {
      job.complete = true;
      job.done = true;
    } else if (job.cancelled || job.isomers.length >= opts.limit || job.elapsed > opts.timeBudgetMs) {
      job.done = true;
      job.stoppedBy = job.cancelled ? 'cancel' : job.isomers.length >= opts.limit ? 'limit' : 'time';
    }
    return job.done;
  };
  job.result = () => ({ isomers: job.isomers, complete: job.complete, count: job.isomers.length, stoppedBy: job.stoppedBy || null });
  return job;
}

function enumerateIsomers(counts, options) {
  const job = isomerEnumerator(counts, options);
  if (job.error) {
    return job.result();
  }
  while (!job.step()) {
    continue;
  }
  return job.result();
}

function isomerBranching(graph) {
  return graph.atoms.reduce((sum, atom) => sum + Math.max(0, graph.bondsForAtom(atom.id).length - 2), 0);
}

function isomerLayout(graph) {
  const ids = graph.atoms.map((a) => a.id);
  const positions = computeLayout(graph, ids);
  positions.forEach((p, id) => {
    const atom = graph.getAtom(id);
    atom.x = p.x;
    atom.y = p.y;
  });
  return graph;
}
