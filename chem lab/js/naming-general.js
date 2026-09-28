let lastSubstituentStereoLocants = null;
let genParentLocants = null;
let genLegacyNLocants = false;
let genMixedNLocants = false;
function takeLastSubstituentStereoLocants() {
  const locants = lastSubstituentStereoLocants;
  lastSubstituentStereoLocants = null;
  return locants;
}

const GEN_HALO = { F: 'fluoro', Cl: 'chloro', Br: 'bromo', I: 'iodo' };
const GEN_RETAINED = {
  '1-methylethyl': 'isopropyl',
  '2-methylpropyl': 'isobutyl',
  '1-oxoethyl': 'acetyl',
  '1-oxopropyl': 'propanoyl',
  '1-oxobutyl': 'butanoyl',
  '1-methylpropyl': 'sec-butyl',
  '1,1-dimethylethyl': 'tert-butyl',
  '1-methylethenyl': 'prop-1-en-2-yl',
};

function genContext(graph, atomIds) {
  const idSet = new Set(atomIds);
  const bonds = graph.bonds.filter((b) => idSet.has(b.atomA) && idSet.has(b.atomB));
  const adjacency = new Map();
  atomIds.forEach((id) => adjacency.set(id, []));
  bonds.forEach((b) => {
    adjacency.get(b.atomA).push({ id: b.atomB, order: b.order });
    adjacency.get(b.atomB).push({ id: b.atomA, order: b.order });
  });
  const ctx = { graph, idSet, adjacency, bondCount: bonds.length };
  ctx.ringSet = genRingAtoms(adjacency);
  return ctx;
}

function genReachable(adjacency, from, to, skipA, skipB) {
  const seen = new Set([from]);
  const stack = [from];
  while (stack.length > 0) {
    const id = stack.pop();
    if (id === to) {
      return true;
    }
    for (const e of adjacency.get(id)) {
      if ((id === skipA && e.id === skipB) || (id === skipB && e.id === skipA)) {
        continue;
      }
      if (!seen.has(e.id)) {
        seen.add(e.id);
        stack.push(e.id);
      }
    }
  }
  return false;
}

function genRingAtoms(adjacency) {
  const ringNbr = new Map();
  adjacency.forEach((list, id) => ringNbr.set(id, []));
  adjacency.forEach((list, id) => {
    list.forEach((e) => {
      if (id < e.id && genReachable(adjacency, id, e.id, id, e.id)) {
        ringNbr.get(id).push(e.id);
        ringNbr.get(e.id).push(id);
      }
    });
  });
  const alive = new Set();
  ringNbr.forEach((list, id) => {
    if (list.length > 0) {
      alive.add(id);
    }
  });
  alive.ringNbr = ringNbr;
  return alive;
}

function genEl(ctx, id) {
  return ctx.graph.getAtom(id).element;
}

function genMult(count, plain, complex) {
  const table = MULTIPLIER_PREFIXES;
  const complexTable = { 2: 'bis', 3: 'tris', 4: 'tetrakis', 5: 'pentakis', 6: 'hexakis', 7: 'heptakis', 8: 'octakis', 9: 'nonakis', 10: 'decakis' };
  if (count === 1) {
    return complex ? '(' + plain + ')' : plain;
  }
  return complex ? complexTable[count] + '(' + plain + ')' : table[count] + (/^tert-/.test(plain) ? '-' : '') + plain;
}

function genSortKey(name) {
  return name.replace(/^[^a-z]+/, '').replace(/^tert-/, '').replace(/[^a-z]/g, '');
}

function genCompoundPrefix(name) {
  return /(yl|\))(oxy|sulfanyl|disulfanyl|sulfonyl|sulfinyl|amino|carbonyl)$/.test(name);
}

function genFullyWrapped(name) {
  if (name[0] !== '(') {
    return false;
  }
  let depth = 0;
  for (let i = 0; i < name.length; i += 1) {
    depth += name[i] === '(' ? 1 : name[i] === ')' ? -1 : 0;
    if (depth === 0) {
      return i === name.length - 1;
    }
  }
  return false;
}

function genAssemblePrefixes(entries) {
  const groups = new Map();
  entries.forEach((entry) => {
    if (!groups.has(entry.name)) {
      groups.set(entry.name, []);
    }
    groups.get(entry.name).push(entry.locant);
  });
  const names = Array.from(groups.keys()).sort((a, b) => {
    const ka = genSortKey(a);
    const kb = genSortKey(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  const parts = names.map((name) => {
    const locants = groups.get(name).slice().sort((a, b) => genCompareLocant(a, b));
    const wrapped = genFullyWrapped(name);
    const complex = !wrapped && (/[0-9,-]/.test(name) || /\s/.test(name) || /[()]/.test(name));
    const simpleMultiplied = !complex;
    const body = wrapped && locants.length > 1
      ? genMult(locants.length, name.slice(1, -1), true)
      : locants.length > 1 && !simpleMultiplied
      ? genMult(locants.length, name, true)
      : locants.length > 1
        ? genMult(locants.length, name, false)
        : complex
          ? '(' + name + ')'
          : name;
    return (locants[0] === null ? '' : locants.join(',') + '-') + body;
  });
  return parts.join('-');
}

function genCompareLocant(a, b) {
  const na = typeof a === 'number';
  const nb = typeof b === 'number';
  if (na && nb) {
    return a - b;
  }
  if (na) {
    return 1;
  }
  if (nb) {
    return -1;
  }
  const va = genLocantValue(a);
  const vb = genLocantValue(b);
  if (va !== null && vb !== null) {
    return va - vb;
  }
  return a < b ? -1 : a > b ? 1 : 0;
}

function genLocantValue(loc) {
  const m = /^(\d+)([a-z]?)('*)$/.exec(String(loc));
  return m ? parseInt(m[1], 10) + (m[2] ? (m[2].charCodeAt(0) - 96) / 1000 : 0) + m[3].length / 100 : null;
}

function genCarbonPathsFrom(ctx, startId, blocked) {
  const results = [];
  const walk = (path) => {
    const tail = path[path.length - 1];
    let extended = false;
    ctx.adjacency.get(tail).forEach((entry) => {
      if (genEl(ctx, entry.id) !== 'C' || path.includes(entry.id) || blocked.has(entry.id) || ctx.ringSet.has(entry.id)) {
        return;
      }
      if (genIsFunctionalCarbon(ctx, entry.id, tail)) {
        return;
      }
      extended = true;
      walk(path.concat(entry.id));
    });
    if (!extended) {
      results.push(path);
    }
  };
  walk([startId]);
  return results;
}

function genTerminalNeighbors(ctx, id, exceptId) {
  return ctx.adjacency.get(id).filter(
    (e) => e.id !== exceptId && ctx.adjacency.get(e.id).length === 1
  );
}

function genFunctionalKind(ctx, id, fromId) {
  if (genEl(ctx, id) !== 'C') {
    return null;
  }
  const others = ctx.adjacency.get(id).filter((e) => e.id !== fromId);
  const dblO = others.filter((e) => e.order === 2 && genEl(ctx, e.id) === 'O' && ctx.adjacency.get(e.id).length === 1);
  const sglOH = others.filter((e) => e.order === 1 && genEl(ctx, e.id) === 'O' && ctx.adjacency.get(e.id).length === 1);
  const nitrile = others.filter((e) => e.order === 3 && genEl(ctx, e.id) === 'N');
  if (nitrile.length === 1 && others.length === 1) {
    return 'cyano';
  }
  if (dblO.length === 1 && sglOH.length === 1 && others.length === 2) {
    return 'carboxy';
  }
  if (dblO.length === 1 && others.length === 1) {
    return 'formyl';
  }
  return null;
}

function genAcylKind(ctx, id, fromId) {
  if (genEl(ctx, id) !== 'C' || ctx.ringSet.has(id)) {
    return null;
  }
  const others = ctx.adjacency.get(id).filter((e) => e.id !== fromId);
  const dblO = others.filter((e) => e.order === 2 && genEl(ctx, e.id) === 'O' && ctx.adjacency.get(e.id).length === 1);
  const single = others.filter((e) => e.order === 1);
  if (dblO.length !== 1 || others.length !== 2 || single.length !== 1) {
    return null;
  }
  const x = single[0];
  const el = genEl(ctx, x.id);
  if (GEN_HALO[el] && ctx.adjacency.get(x.id).length === 1) {
    return { type: 'halide', x: x.id, dblO: dblO[0].id };
  }
  if (el === 'N' && !ctx.ringSet.has(x.id) && ctx.adjacency.get(x.id).every((n) => n.order === 1)) {
    return { type: 'amide', x: x.id, dblO: dblO[0].id };
  }
  if (el === 'O' && ctx.adjacency.get(x.id).length === 2) {
    const r = ctx.adjacency.get(x.id).find((n) => n.id !== id);
    if (genEl(ctx, r.id) === 'C' && r.order === 1) {
      return { type: 'ester', x: x.id, r: r.id, dblO: dblO[0].id };
    }
  }
  return null;
}

function genIsFunctionalCarbon(ctx, id, fromId) {
  return genFunctionalKind(ctx, id, fromId) !== null || genAcylKind(ctx, id, fromId) !== null;
}

function genAcylSubstituent(ctx, id, fromId, kind, depth) {
  if (kind.type === 'halide') {
    return GEN_HALO[genEl(ctx, kind.x)] + 'carbonyl';
  }
  if (kind.type === 'amide') {
    const subs = ctx.adjacency.get(kind.x).filter((n) => n.id !== id).map((n) => genSubstituent(ctx, n.id, kind.x, depth + 1));
    if (subs.some((n) => !n)) {
      return null;
    }
    return genAssemblePrefixes(subs.map((name) => ({ name, locant: null }))) + 'carbamoyl';
  }
  const inner = genSubstituent(ctx, kind.r, kind.x, depth + 1);
  if (!inner) {
    return null;
  }
  return (/yl$/.test(inner) && !/[0-9,]/.test(inner) ? inner.slice(0, -2) + 'oxy' : inner + 'oxy') + 'carbonyl';
}

function genSubstituent(ctx, id, fromId, depth) {
  if (depth > 12) {
    return null;
  }
  const el = genEl(ctx, id);
  const others = ctx.adjacency.get(id).filter((e) => e.id !== fromId);
  if (ctx.ringSet.has(id) && !ctx.ringSet.ringNbr.get(id).includes(fromId)) {
    return genRingSubstituent(ctx, id, fromId, depth);
  }
  if (el === 'Si') {
    return genSilylSubstituent(ctx, id, fromId, depth);
  }
  if (el === 'N' && others.length === 1 && others[0].order === 2 && genEl(ctx, others[0].id) === 'N') {
    const tail = ctx.adjacency.get(others[0].id).filter((e) => e.id !== id);
    if (tail.length === 1 && tail[0].order === 2 && genEl(ctx, tail[0].id) === 'N' && ctx.adjacency.get(tail[0].id).length === 1) {
      return 'azido';
    }
  }
  if (GEN_HALO[el]) {
    return others.length === 0 ? GEN_HALO[el] : null;
  }
  const fn = genFunctionalKind(ctx, id, fromId);
  if (fn) {
    return fn;
  }
  const acyl = genAcylKind(ctx, id, fromId);
  if (acyl) {
    return genAcylSubstituent(ctx, id, fromId, acyl, depth);
  }
  if (el === 'O') {
    const link = ctx.adjacency.get(id).find((e) => e.id === fromId);
    if (link.order === 2) {
      return others.length === 0 ? 'oxo' : null;
    }
    if (others.length === 0) {
      return 'hydroxy';
    }
    if (others.length !== 1) {
      return null;
    }
    const inner = genSubstituent(ctx, others[0].id, id, depth + 1);
    if (!inner) {
      return null;
    }
    if (genEl(ctx, others[0].id) === 'O') {
      return inner + 'oxy';
    }
    if (genEl(ctx, others[0].id) === 'Si') {
      return inner + 'oxy';
    }
    return /^(meth|eth|prop|but|isoprop|isobut|sec-but|tert-but|phen)yl$/.test(inner) ? inner.slice(0, -2) + 'oxy' : inner + 'oxy';
  }
  if (el === 'S') {
    if (others.length === 0) {
      return 'sulfanyl';
    }
    const sOxo = others.filter((e) => e.order === 2 && genEl(ctx, e.id) === 'O' && ctx.adjacency.get(e.id).length === 1);
    const sRest = others.filter((e) => !sOxo.includes(e));
    if (sOxo.length > 0 && sOxo.length <= 2 && sRest.length === 1 && sRest[0].order === 1) {
      const inner = genSubstituent(ctx, sRest[0].id, id, depth + 1);
      return inner ? '(' + inner + (sOxo.length === 2 ? 'sulfonyl' : 'sulfinyl') + ')' : null;
    }
    if (others.length !== 1 || others[0].order !== 1) {
      return null;
    }
    const wrapInner = (name) => (/[0-9,\s()-]/.test(name.replace(/^(tert|sec)-/, '')) ? '(' + name + ')' : name);
    if (genEl(ctx, others[0].id) === 'S') {
      const next = ctx.adjacency.get(others[0].id).filter((e) => e.id !== id);
      if (next.length !== 1 || next[0].order !== 1 || genEl(ctx, next[0].id) === 'S') {
        return null;
      }
      const far = genSubstituent(ctx, next[0].id, others[0].id, depth + 1);
      return far ? wrapInner(far) + 'disulfanyl' : null;
    }
    const inner = genSubstituent(ctx, others[0].id, id, depth + 1);
    return inner ? wrapInner(inner) + 'sulfanyl' : null;
  }
  if (el === 'N') {
    const link = ctx.adjacency.get(id).find((e) => e.id === fromId);
    if (others.length === 2 && others.every((e) => e.order === 2 && genEl(ctx, e.id) === 'O')) {
      return 'nitro';
    }
    if (link.order === 3 && others.length === 0) {
      return 'nitrilo';
    }
    if (link.order === 2) {
      return others.length === 0 ? 'imino' : null;
    }
    if (others.some((e) => e.order !== 1)) {
      return null;
    }
    if (others.length === 0) {
      return 'amino';
    }
    const inner = others.map((e) => genSubstituent(ctx, e.id, id, depth + 1));
    if (inner.some((n) => !n)) {
      return null;
    }
    return genAssemblePrefixes(inner.map((name) => ({ name, locant: null }))) + 'amino';
  }
  if (el === 'C' || ctx.ringSet.has(id)) {
    if (ctx.ringSet.has(id)) {
      return genRingSubstituent(ctx, id, fromId, depth);
    }
    return genAlkylSubstituent(ctx, id, fromId, depth);
  }
  return null;
}

function genAlkylSubstituent(ctx, startId, fromId, depth) {
  const blocked = new Set([fromId]);
  const paths = genCarbonPathsFrom(ctx, startId, blocked);
  let best = null;
  paths.forEach((path) => {
    const parsed = genDescribeChain(ctx, path, fromId, depth, true);
    if (!parsed) {
      return;
    }
    const key = [path.length, parsed.substituents.length];
    if (!best || key[0] > best.key[0] || (key[0] === best.key[0] && key[1] > best.key[1])) {
      best = { path, parsed, key };
    }
  });
  if (!best) {
    return null;
  }
  const covered = genCountReach(ctx, startId, fromId);
  if (best.parsed.coveredAtoms !== covered) {
    return null;
  }
  const chain = best.parsed;
  const root = NAME_ROOTS[best.path.length];
  if (!root) {
    return null;
  }
  if (depth === 1) {
    const locants = new Map();
    best.path.forEach((id, index) => locants.set(id, index + 1));
    lastSubstituentStereoLocants = locants;
  }
  const prefix = genAssemblePrefixes(
    best.path.length === 1 ? chain.substituents.map((e) => ({ name: e.name, locant: null })) : chain.substituents
  );
  let stem;
  if (chain.multiple.length === 0) {
    stem = root + 'yl';
  } else if (chain.multiple.length === 1) {
    const m = chain.multiple[0];
    stem = best.path.length === 2 && m.locant === 1
      ? root + (m.order === 2 ? 'enyl' : 'ynyl')
      : root + '-' + m.locant + (m.order === 2 ? '-en-1-yl' : '-yn-1-yl');
  } else {
    return null;
  }
  const full = prefix + stem;
  if (Object.prototype.hasOwnProperty.call(GEN_RETAINED, full)) {
    return GEN_RETAINED[full];
  }
  return full;
}

function genCountReach(ctx, startId, fromId) {
  const seen = new Set([fromId, startId]);
  const queue = [startId];
  let count = 0;
  while (queue.length > 0) {
    const id = queue.shift();
    count++;
    ctx.adjacency.get(id).forEach((e) => {
      if (!seen.has(e.id)) {
        seen.add(e.id);
        queue.push(e.id);
      }
    });
  }
  return count;
}

function genChainMultiples(ctx, path) {
  const multiple = [];
  for (let i = 0; i < path.length - 1; i++) {
    const link = ctx.adjacency.get(path[i]).find((e) => e.id === path[i + 1]);
    if (link.order > 1) {
      multiple.push({ locant: i + 1, order: link.order });
    }
  }
  return multiple;
}

function genDescribeChain(ctx, path, fromId, depth) {
  const substituents = [];
  let covered = path.length;
  for (let i = 0; i < path.length; i++) {
    const exo = ctx.adjacency.get(path[i]).filter(
      (e) => e.id !== fromId && !path.includes(e.id)
    );
    for (const entry of exo) {
      if (entry.order > 1 && genEl(ctx, entry.id) === 'C') {
        return null;
      }
      const name = genSubstituent(ctx, entry.id, path[i], depth + 1);
      if (!name) {
        return null;
      }
      substituents.push({ name, locant: i + 1 });
      covered += genCountReach(ctx, entry.id, path[i]);
    }
  }
  return { substituents, multiple: genChainMultiples(ctx, path), coveredAtoms: covered };
}

function genClassifyPrincipal(ctx, id, path) {
  const groups = [];
  const inChain = new Set(path);
  const exo = ctx.adjacency.get(id).filter((e) => !inChain.has(e.id));
  const terminal = (e) => ctx.adjacency.get(e.id).length === 1;
  const isEnd = path[0] === id || path[path.length - 1] === id;
  const dblO = exo.filter((e) => e.order === 2 && genEl(ctx, e.id) === 'O' && terminal(e));
  const oh = exo.filter((e) => e.order === 1 && genEl(ctx, e.id) === 'O' && terminal(e));
  const nit = exo.filter((e) => e.order === 3 && genEl(ctx, e.id) === 'N' && terminal(e));
  if (dblO.length === 1 && oh.length === 1 && isEnd) {
    groups.push({ rank: 1, atoms: [dblO[0].id, oh[0].id] });
    return groups;
  }
  if (dblO.length === 1 && isEnd && exo.length === 2) {
    const kind = genAcylKind(ctx, id, path.length > 1 ? (path[0] === id ? path[1] : path[path.length - 2]) : -1);
    if (kind) {
      if (kind.type === 'ester') {
        groups.push({ rank: 1.3, atoms: [kind.dblO, kind.x], esterR: kind.r, esterFrom: kind.x });
      } else if (kind.type === 'halide') {
        groups.push({ rank: 1.5, atoms: [kind.dblO, kind.x], halide: genEl(ctx, kind.x) });
      } else {
        groups.push({ rank: 1.7, atoms: [kind.dblO, kind.x], nSubs: ctx.adjacency.get(kind.x).filter((n) => n.id !== id), nAtom: kind.x });
      }
      return groups;
    }
  }
  if (nit.length === 1 && isEnd) {
    groups.push({ rank: 2, atoms: [nit[0].id] });
    return groups;
  }
  if (dblO.length === 1) {
    groups.push({ rank: isEnd && exo.length === 1 ? 3 : 4, atoms: [dblO[0].id] });
  }
  exo.filter((e) => genEl(ctx, e.id) === 'S' && e.order === 1 && !ctx.ringSet.has(e.id)).forEach((e) => {
    const sNbrs = ctx.adjacency.get(e.id).filter((x) => x.id !== id);
    const sO = sNbrs.filter((x) => x.order === 2 && genEl(ctx, x.id) === 'O' && ctx.adjacency.get(x.id).length === 1);
    const sRest = sNbrs.filter((x) => !sO.includes(x));
    if (sO.length === 2 && sRest.length === 1 && sRest[0].order === 1) {
      const r = sRest[0];
      if (genEl(ctx, r.id) === 'O' && ctx.adjacency.get(r.id).length === 1) {
        groups.push({ rank: 1.1, atoms: [e.id, sO[0].id, sO[1].id, r.id] });
      } else if (genEl(ctx, r.id) === 'N' && ctx.adjacency.get(r.id).every((n) => n.order === 1)) {
        groups.push({ rank: 1.8, atoms: [e.id, sO[0].id, sO[1].id, r.id], nSubs: ctx.adjacency.get(r.id).filter((n) => n.id !== e.id), nAtom: r.id });
      }
    }
  });
  oh.forEach((e) => {
    if (dblO.length === 0 || !isEnd) {
      groups.push({ rank: 5, atoms: [e.id] });
    }
  });
  exo.filter((e) => e.order === 1 && genEl(ctx, e.id) === 'N' && !ctx.ringSet.has(e.id)).forEach((e) => {
    const nOthers = ctx.adjacency.get(e.id).filter((x) => x.id !== id);
    if (nOthers.every((x) => x.order === 1 && genEl(ctx, x.id) !== 'O')) {
      groups.push({ rank: 6, atoms: [e.id], nSubs: nOthers });
    }
  });
  exo.filter((e) => e.order === 2 && genEl(ctx, e.id) === 'N' && !ctx.ringSet.has(e.id)).forEach((e) => {
    const nOthers = ctx.adjacency.get(e.id).filter((x) => x.id !== id);
    if (nOthers.every((x) => x.order === 1)) {
      groups.push({ rank: 8, atoms: [e.id], nSubs: nOthers });
    }
  });
  exo.filter((e) => e.order === 1 && genEl(ctx, e.id) === 'S' && terminal(e) && !ctx.ringSet.has(e.id)).forEach((e) => {
    groups.push({ rank: 7, atoms: [e.id] });
  });
  return groups;
}

function genAllCarbonPaths(ctx, carbons) {
  const paths = [];
  const carbonSet = new Set(carbons);
  carbons.forEach((start) => {
    const walk = (path) => {
      if (path.length === 1 || path[0] < path[path.length - 1]) {
        paths.push(path);
      }
      const tail = path[path.length - 1];
      ctx.adjacency.get(tail).forEach((e) => {
        if (carbonSet.has(e.id) && !path.includes(e.id)) {
          walk(path.concat(e.id));
        }
      });
    };
    walk([start]);
  });
  return paths;
}

function genMany(word, count) {
  const mult = MULTIPLIER_PREFIXES[count];
  return mult === 'di' ? word : word.replace(/(^| )di/g, '$1' + mult);
}

const GEN_SUFFIX = {
  1: { one: 'oic acid', many: 'dioic acid', bare: true, skipLocant: true },
  2: { one: 'nitrile', many: 'dinitrile', bare: false, skipLocant: true },
  3: { one: 'al', many: 'dial', bare: true, skipLocant: true },
  4: { one: 'one', many: 'dione', bare: true },
  5: { one: 'ol', many: 'diol', bare: true },
  6: { one: 'amine', many: 'diamine', bare: true },
  7: { one: 'thiol', many: 'dithiol', bare: false },
  8: { one: 'imine', many: 'diimine', bare: true },
  1.1: { one: 'sulfonic acid', many: 'disulfonic acid', bare: true },
  1.3: { one: 'oate', many: 'dioate', bare: true, skipLocant: true },
  1.5: { one: 'oyl halide', many: 'dioyl dihalide', bare: true, skipLocant: true },
  1.7: { one: 'amide', many: 'diamide', bare: true, skipLocant: true },
  1.8: { one: 'sulfonamide', many: 'disulfonamide', bare: true },
};

function genEvaluateChain(ctx, path, bestRank, reverse) {
  const ordered = reverse ? path.slice().reverse() : path;
  const principal = [];
  const prefixes = [];
  let ok = true;
  ordered.forEach((id, index) => {
    const locant = index + 1;
    const groups = genClassifyPrincipal(ctx, id, ordered);
    const used = new Set();
    groups.forEach((g) => {
      if (g.rank === bestRank) {
        principal.push({ locant, group: g });
        g.atoms.forEach((a) => used.add(a));
        if (g.nSubs) {
          g.nSubs.forEach((n) => used.add('n' + n.id));
        }
      }
    });
    ctx.adjacency.get(id).forEach((e) => {
      if (ordered.includes(e.id) || used.has(e.id)) {
        return;
      }
      const isGroupAtom = groups.some((g) => g.rank === bestRank && g.atoms.includes(e.id));
      if (isGroupAtom) {
        return;
      }
      const name = genSubstituent(ctx, e.id, id, 1);
      if (!name) {
        ok = false;
        return;
      }
      prefixes.push({ name, locant });
    });
  });
  if (!ok) {
    return null;
  }
  const multiple = [];
  for (let i = 0; i < ordered.length - 1; i++) {
    const link = ctx.adjacency.get(ordered[i]).find((e) => e.id === ordered[i + 1]);
    if (link.order > 1) {
      multiple.push({ locant: i + 1, order: link.order });
    }
  }
  return { ordered, principal, prefixes, multiple };
}

function genCompareArrays(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      return a[i] - b[i];
    }
  }
  return a.length - b.length;
}

function genOrientationKey(result) {
  return [
    result.principal.map((p) => p.locant),
    result.multiple.map((m) => m.locant),
    result.prefixes.map((p) => p.locant).sort((x, y) => x - y),
  ];
}

function genCompareOrientation(x, y) {
  const kx = genOrientationKey(x);
  const ky = genOrientationKey(y);
  for (let i = 0; i < kx.length; i++) {
    const c = genCompareArrays(kx[i], ky[i]);
    if (c !== 0) {
      return c;
    }
  }
  const nameX = x.prefixes.slice().sort((p, q) => p.locant - q.locant).map((p) => genSortKey(p.name));
  const nameY = y.prefixes.slice().sort((p, q) => p.locant - q.locant).map((p) => genSortKey(p.name));
  for (let i = 0; i < Math.min(nameX.length, nameY.length); i++) {
    if (nameX[i] !== nameY[i]) {
      return nameX[i] < nameY[i] ? -1 : 1;
    }
  }
  return 0;
}

function genBestRank(ctx, carbons) {
  let best = null;
  const consider = (id, path) => {
    genClassifyPrincipal(ctx, id, path).forEach((g) => {
      const rank = g.rank === 4 && ctx.adjacency.get(id).length === 2 ? 3 : g.rank;
      if (best === null || rank < best) {
        best = rank;
      }
    });
  };
  carbons.forEach((id) => {
    consider(id, [id]);
    ctx.adjacency.get(id).forEach((e) => {
      if (genEl(ctx, e.id) === 'C' && carbons.includes(e.id)) {
        consider(id, [e.id, id]);
      }
    });
  });
  return best;
}

function genBuildStem(ordered, multiple) {
  const root = NAME_ROOTS[ordered.length];
  if (!root) {
    return null;
  }
  if (multiple.length === 0) {
    return root + 'an';
  }
  const enes = multiple.filter((m) => m.order === 2).map((m) => m.locant);
  const ynes = multiple.filter((m) => m.order === 3).map((m) => m.locant);
  const parts = [];
  const bare = ordered.length <= 2 && multiple.length === 1;
  const piece = (locs, tag) =>
    (bare ? '' : locs.join(',') + '-') + (locs.length > 1 ? MULTIPLIER_PREFIXES[locs.length] : '') + tag;
  if (enes.length) {
    parts.push(piece(enes, 'en'));
  }
  if (ynes.length) {
    parts.push(piece(ynes, 'yn'));
  }
  const first = enes.length ? enes : ynes;
  return root + (first.length > 1 ? 'a' : '') + (bare ? '' : '-') + parts.join('-');
}

function genAssembleParent(ctx, result, bestRank) {
  const stem = genBuildStem(result.ordered, result.multiple);
  if (stem === null) {
    return null;
  }
  genParentLocants = new Map(result.ordered.map((id, index) => [id, index + 1]));
  const prefixEntries = result.prefixes.slice();
  let nSubsOk = true;
  result.principal.forEach((p) => {
    if (p.group.nSubs) {
      p.group.nSubs.forEach((n) => {
        const name = genSubstituent(ctx, n.id, p.group.nAtom || p.group.atoms[0], 1);
        if (name) {
          prefixEntries.push({ name, locant: 'N' });
        } else {
          nSubsOk = false;
        }
      });
    }
  });
  if (!nSubsOk) {
    return null;
  }
  const mixedN = !genLegacyNLocants && prefixEntries.some((e) => e.locant === 'N') && prefixEntries.some((e) => e.locant !== 'N');
  if (mixedN && result.ordered.length === 1) {
    genMixedNLocants = true;
  }
  const dropAll = (result.ordered.length === 1 && !mixedN) ||
    (result.ordered.length === 2 && bestRank === null && result.prefixes.length === 1 && result.multiple.length === 0);
  const prefix = genAssemblePrefixes(
    dropAll ? prefixEntries.map((e) => ({ name: e.name, locant: e.locant === 'N' ? 'N' : null })) : prefixEntries
  );
  const glue = prefix && !/-$/.test(prefix) ? '' : '';
  if (bestRank === null) {
    return prefix + stem + (/n$|an$/.test(stem) || /[a-z]$/.test(stem) ? 'e' : '');
  }
  const info = GEN_SUFFIX[bestRank];
  const count = result.principal.length;
  const halideWord = { F: 'fluoride', Cl: 'chloride', Br: 'bromide', I: 'iodide' };
  const firstGroup = result.principal[0].group;
  let suffix = count === 1 ? info.one : MULTIPLIER_PREFIXES[count] ? genMany(info.many, count) : null;
  if (!suffix) {
    return null;
  }
  if (bestRank === 1.5) {
    const word = halideWord[firstGroup.halide];
    suffix = count === 1 ? 'oyl ' + word : 'dioyl di' + word;
  }
  const locants = result.principal.map((p) => p.locant).sort((a, b) => a - b);
  const retainable = count === 1 && result.multiple.length === 0 && result.ordered.length <= 2 &&
    [1, 1.3, 1.5, 1.7, 3].includes(bestRank) || (count === 1 && result.multiple.length === 0 && result.ordered.length === 2 && bestRank === 2);
  let body;
  let usedPrefix = prefix;
  if (retainable) {
    const short = result.ordered.length === 1 ? 'form' : 'acet';
    const tail = {
      1: 'ic acid', 1.3: 'ate', 1.5: 'yl ' + halideWord[firstGroup.halide], 1.7: 'amide', 2: 'onitrile', 3: 'aldehyde',
    }[bestRank];
    body = short + tail;
    usedPrefix = genAssemblePrefixes(prefixEntries.map((e) => ({ name: e.name, locant: e.locant === 'N' ? 'N' : null })));
  } else {
    const needLocant = !info.skipLocant && !(result.ordered.length === 1) &&
      !(result.ordered.length === 2 && count === 1 && result.multiple.length === 0);
    const startsVowel = /^[aeiou]/.test(suffix);
    let base = stem;
    if (!startsVowel || count > 1) {
      base += 'e';
    }
    body = needLocant ? base + '-' + locants.join(',') + '-' + suffix : base + suffix;
  }
  const whole = usedPrefix + glue + body;
  return genEsterWord(ctx, result.principal) + whole;
}

function genEsterWord(ctx, principal) {
  const groups = principal.map((p) => p.group).filter((g) => g.esterR !== undefined);
  if (groups.length === 0) {
    return '';
  }
  const names = groups.map((g) => genSubstituent(ctx, g.esterR, g.esterFrom, 1));
  if (names.some((n) => !n)) {
    return '';
  }
  const counts = new Map();
  names.forEach((n) => counts.set(n, (counts.get(n) || 0) + 1));
  return Array.from(counts.keys()).sort().map((n) => {
    const complex = /[0-9,]/.test(n) && !/^\(/.test(n);
    const c = counts.get(n);
    return c > 1 ? genMult(c, n, complex) : n;
  }).join(' ') + ' ';
}

function genNameAcyclic(ctx, atomIds) {
  const carbons = atomIds.filter((id) => genEl(ctx, id) === 'C' && !ctx.ringSet.has(id));
  if (carbons.length === 0 || carbons.length > MAX_NAMED_CHAIN * 3) {
    return null;
  }
  const bestRank = genBestRank(ctx, carbons);
  let best = null;
  genAllCarbonPaths(ctx, carbons).forEach((path) => {
    if (path.length > MAX_NAMED_CHAIN) {
      return;
    }
    const fwd = genEvaluateChain(ctx, path, bestRank, false);
    const rev = genEvaluateChain(ctx, path, bestRank, true);
    if (!fwd || !rev) {
      return;
    }
    const oriented = genCompareOrientation(fwd, rev) <= 0 ? fwd : rev;
    const key = [
      oriented.principal.length,
      path.length,
      oriented.multiple.length,
      oriented.prefixes.length,
    ];
    if (!best || genCompareArrays(key, best.key) > 0) {
      best = { oriented, key };
    }
  });
  if (!best) {
    return null;
  }
  return genAssembleParent(ctx, best.oriented, bestRank);
}

function generalName(graph, atomIds, allowRings) {
  genParentLocants = null;
  const ctx = genContext(graph, atomIds);
  if (ctx.ringSet.size > 0 && !allowRings) {
    return null;
  }
  if (!allowRings && genHasAcylDerivative(ctx, atomIds)) {
    return null;
  }
  if (ctx.ringSet.size === 0) {
    if (ctx.bondCount !== atomIds.length - 1) {
      return null;
    }
    return genNameHetero(ctx, atomIds) || genNameAcyclic(ctx, atomIds);
  }
  const sulfur = genHeteroChain(ctx, atomIds, 'S');
  if (sulfur && sulfur.endSubs.length === 2 && sulfur.chain.length <= 5) {
    const tail = ['', '', 'disulfide', 'trisulfide', 'tetrasulfide', 'pentasulfide'][sulfur.chain.length];
    const pair = genFunctionalPair(ctx, sulfur.endSubs, tail, tail);
    if (pair && !GEN_PRINCIPAL_PREFIX_PATTERN.test(pair.replace(/ [a-z]*sulfide$/, ''))) {
      return pair;
    }
  }
  return genPhosphorus(ctx, atomIds) || genNameWithRing(ctx, atomIds);
}

function genOrderedCycle(ctx, startId) {
  const component = new Set([startId]);
  const queue = [startId];
  while (queue.length > 0) {
    const id = queue.pop();
    ctx.ringSet.ringNbr.get(id).forEach((n) => {
      if (!component.has(n)) {
        component.add(n);
        queue.push(n);
      }
    });
  }
  for (const id of component) {
    if (ctx.ringSet.ringNbr.get(id).length !== 2) {
      return null;
    }
  }
  const cycle = [startId];
  while (cycle.length < component.size) {
    const tail = cycle[cycle.length - 1];
    const next = ctx.ringSet.ringNbr.get(tail).find((n) => !cycle.includes(n));
    if (next === undefined) {
      return null;
    }
    cycle.push(next);
  }
  return cycle;
}

function genRingComponents(ctx) {
  const done = new Set();
  const cycles = [];
  for (const id of ctx.ringSet) {
    if (done.has(id)) {
      continue;
    }
    const cycle = genOrderedCycle(ctx, id);
    if (!cycle) {
      return null;
    }
    cycle.forEach((c) => done.add(c));
    cycles.push(cycle);
  }
  return cycles;
}

function genRingNumberings(cycle) {
  const list = [];
  const n = cycle.length;
  for (let start = 0; start < n; start++) {
    list.push(Array.from({ length: n }, (_, i) => cycle[(start + i) % n]));
    list.push(Array.from({ length: n }, (_, i) => cycle[(start - i + n) % n]));
  }
  return list;
}

function genRingMultiples(ctx, ordered) {
  const multiple = [];
  for (let i = 0; i < ordered.length; i++) {
    const a = ordered[i];
    const b = ordered[(i + 1) % ordered.length];
    const link = ctx.adjacency.get(a).find((e) => e.id === b);
    if (link && link.order > 1) {
      multiple.push({ locant: i + 1, order: link.order });
    }
  }
  return multiple;
}

function genRingBaseName(ctx, cycle) {
  const hetero = cycle.filter((id) => genEl(ctx, id) !== 'C');
  const multiple = genRingMultiples(ctx, cycle);
  if (hetero.length === 0) {
    const root = NAME_ROOTS[cycle.length];
    if (!root) {
      return null;
    }
    if (cycle.length === 6 && multiple.length === 3) {
      return { name: 'benzene', aromatic: true };
    }
    return { name: 'cyclo' + root + 'ane', aromatic: false, carbocycle: true };
  }
  const saved = [lastChainStereoLocants, lastRingStereoLocants, lastRingDisplayLocants];
  const name = deriveName(ctx.graph, cycle);
  [lastChainStereoLocants, lastRingStereoLocants, lastRingDisplayLocants] = saved;
  return name ? { name, aromatic: false, hetero: true } : null;
}

function genRingGroups(ctx, id, cycleSet) {
  const groups = [];
  ctx.adjacency.get(id).filter((e) => !cycleSet.has(e.id)).forEach((e) => {
    const el = genEl(ctx, e.id);
    const terminal = ctx.adjacency.get(e.id).length === 1;
    const kind = genEl(ctx, e.id) === 'C' ? genFunctionalKind(ctx, e.id, id) : null;
    const acyl = genEl(ctx, e.id) === 'C' ? genAcylKind(ctx, e.id, id) : null;
    if (acyl) {
      if (acyl.type === 'ester') {
        groups.push({ rank: 1.3, atoms: [e.id], carbon: true, esterR: acyl.r, esterFrom: acyl.x });
      } else if (acyl.type === 'halide') {
        groups.push({ rank: 1.5, atoms: [e.id], carbon: true, halide: genEl(ctx, acyl.x) });
      } else {
        groups.push({
          rank: 1.7, atoms: [e.id], carbon: true, nAtom: acyl.x,
          nSubs: ctx.adjacency.get(acyl.x).filter((n) => n.id !== e.id),
        });
      }
    } else if (el === 'S' && e.order === 1) {
      const sNbrs = ctx.adjacency.get(e.id).filter((x) => x.id !== id);
      const sO = sNbrs.filter((x) => x.order === 2 && genEl(ctx, x.id) === 'O' && ctx.adjacency.get(x.id).length === 1);
      const rest = sNbrs.filter((x) => !sO.includes(x));
      if (sO.length === 2 && rest.length === 1 && rest[0].order === 1 && genEl(ctx, rest[0].id) === 'O' && ctx.adjacency.get(rest[0].id).length === 1) {
        groups.push({ rank: 1.1, atoms: [e.id, sO[0].id, sO[1].id, rest[0].id] });
      } else if (sO.length === 2 && rest.length === 1 && rest[0].order === 1 && genEl(ctx, rest[0].id) === 'N' && ctx.adjacency.get(rest[0].id).every((n) => n.order === 1)) {
        groups.push({
          rank: 1.8, atoms: [e.id, sO[0].id, sO[1].id, rest[0].id], nAtom: rest[0].id,
          nSubs: ctx.adjacency.get(rest[0].id).filter((n) => n.id !== e.id),
        });
      } else if (terminal) {
        groups.push({ rank: 7, atoms: [e.id] });
      }
    } else if (kind === 'carboxy') {
      groups.push({ rank: 1, atoms: [e.id], carbon: true });
    } else if (kind === 'cyano') {
      groups.push({ rank: 2, atoms: [e.id], carbon: true });
    } else if (kind === 'formyl') {
      groups.push({ rank: 3, atoms: [e.id], carbon: true });
    } else if (el === 'O' && e.order === 2 && terminal) {
      groups.push({ rank: 4, atoms: [e.id] });
    } else if (el === 'O' && e.order === 1 && terminal) {
      groups.push({ rank: 5, atoms: [e.id] });
    } else if (el === 'N' && e.order === 1 && !ctx.ringSet.has(e.id)) {
      const nOthers = ctx.adjacency.get(e.id).filter((x) => x.id !== id);
      if (nOthers.every((x) => x.order === 1 && genEl(ctx, x.id) !== 'O')) {
        groups.push({ rank: 6, atoms: [e.id], nSubs: nOthers });
      }
    }
  });
  return groups;
}

function genEvaluateRing(ctx, ordered, rank, attachId, skip) {
  const cycleSet = new Set(ordered);
  const heteroLocants = [];
  const principal = [];
  const prefixes = [];
  let ok = true;
  let attachLocant = 0;
  ordered.forEach((id, index) => {
    const locant = index + 1;
    if (genEl(ctx, id) !== 'C') {
      heteroLocants.push(locant);
    }
    const groups = genRingGroups(ctx, id, cycleSet);
    const used = new Set();
    groups.forEach((g) => {
      if (rank !== null && g.rank === rank) {
        principal.push({ locant, group: g });
        g.atoms.forEach((a) => used.add(a));
      }
    });
    ctx.adjacency.get(id).forEach((e) => {
      if (cycleSet.has(e.id) || used.has(e.id) || (skip && skip.has(e.id))) {
        return;
      }
      if (e.id === attachId) {
        attachLocant = locant;
        return;
      }
      const name = genSubstituent(ctx, e.id, id, 1);
      if (!name) {
        ok = false;
        return;
      }
      prefixes.push({ name, locant });
    });
  });
  if (!ok) {
    return null;
  }
  return { ordered, heteroLocants, principal, prefixes, attachLocant, multiple: genRingMultiples(ctx, ordered), rank };
}

function genCompareRingOrientation(x, y) {
  const keys = (r) => [
    r.heteroLocants,
    r.principal.map((p) => p.locant),
    r.hpos || [],
    r.attachLocant ? [r.attachLocant] : [],
    r.multiple.length * 2 === r.ordered.length ? [] : r.multiple.map((m) => m.locant),
    r.prefixes.map((p) => p.locant).sort((a, b) => a - b),
  ];
  const kx = keys(x);
  const ky = keys(y);
  for (let i = 0; i < kx.length; i++) {
    const c = genCompareArrays(kx[i], ky[i]);
    if (c !== 0) {
      return c;
    }
  }
  const names = (r) => r.prefixes.slice().sort((p, q) => p.locant - q.locant).map((p) => genSortKey(p.name));
  const nx = names(x);
  const ny = names(y);
  for (let i = 0; i < Math.min(nx.length, ny.length); i++) {
    if (nx[i] !== ny[i]) {
      return nx[i] < ny[i] ? -1 : 1;
    }
  }
  return 0;
}

function genBestRingOrientation(ctx, cycle, rank, attachId) {
  let best = null;
  for (const ordered of genRingNumberings(cycle)) {
    const result = genEvaluateRing(ctx, ordered, rank, attachId);
    if (!result) {
      return null;
    }
    if (!best || genCompareRingOrientation(result, best) < 0) {
      best = result;
    }
  }
  return best;
}

function genRingSubstituent(ctx, id, fromId, depth) {
  const assembly = genFindAssembly(ctx, id, fromId);
  if (assembly) {
    return genNameAssembly(ctx, assembly, null, fromId);
  }
  const cycle = genOrderedCycle(ctx, id);
  if (!cycle) {
    return genNamePoly(ctx, genRingComponentAtoms(ctx, id), null, fromId);
  }
  const base = genRingBaseName(ctx, cycle);
  if (!base) {
    if (cycle.some((cid) => genEl(ctx, cid) !== 'C')) {
      return genNameFused(ctx, new Set(cycle), null, fromId) || null;
    }
    return null;
  }
  const best = genBestRingOrientation(ctx, cycle, null, fromId);
  if (!best) {
    return null;
  }
  const prefix = genAssemblePrefixes(best.prefixes);
  let stem;
  if (base.aromatic) {
    stem = 'phenyl';
  } else if (base.carbocycle && best.multiple.length === 0) {
    stem = base.name.slice(0, -3) + 'yl';
  } else if (base.carbocycle) {
    const piece = (order, tag) => {
      const locs = best.multiple.filter((m) => m.order === order).map((m) => m.locant);
      return locs.length ? locs.join(',') + '-' + (locs.length > 1 ? MULTIPLIER_PREFIXES[locs.length] : '') + tag : null;
    };
    const tags = [piece(2, 'en'), piece(3, 'yn')].filter(Boolean);
    const vowel = /^[0-9,]+-[a-z]/.test(tags[0]) && best.multiple.filter((m) => m.order === (tags[0].endsWith('en') ? 2 : 3)).length > 1 ? 'a' : '';
    stem = 'cyclo' + NAME_ROOTS[cycle.length] + vowel + '-' + tags.join('-') + '-' + best.attachLocant + '-yl';
  } else {
    stem = base.name.replace(/e$/, '') + '-' + best.attachLocant + '-yl';
  }
  return prefix + stem;
}

function genRingBestRank(ctx, cycle) {
  const set = new Set(cycle);
  let best = null;
  cycle.forEach((id) => {
    genRingGroups(ctx, id, set).forEach((g) => {
      if (best === null || g.rank < best) {
        best = g.rank;
      }
    });
  });
  return best;
}

function genChainRankOutsideRing(ctx, atomIds) {
  const carbons = atomIds.filter((id) => {
    if (genEl(ctx, id) !== 'C' || ctx.ringSet.has(id)) {
      return false;
    }
    return !ctx.adjacency.get(id).some((e) => ctx.ringSet.has(e.id) && genFunctionalKind(ctx, id, e.id));
  });
  return { carbons, rank: genBestRank(ctx, carbons) };
}

const GEN_RING_SUFFIX = {
  1.1: { one: 'sulfonic acid', many: 'disulfonic acid', keepE: true },
  1.3: { one: 'carboxylate', many: 'dicarboxylate', attached: true },
  1.5: { one: 'carbonyl halide', many: 'dicarbonyl dihalide', attached: true },
  1.7: { one: 'carboxamide', many: 'dicarboxamide', attached: true },
  1.8: { one: 'sulfonamide', many: 'disulfonamide', keepE: true },
  1: { one: 'carboxylic acid', many: 'dicarboxylic acid', attached: true },
  2: { one: 'carbonitrile', many: 'dicarbonitrile', attached: true },
  3: { one: 'carbaldehyde', many: 'dicarbaldehyde', attached: true },
  4: { one: 'one', many: 'dione' },
  5: { one: 'ol', many: 'diol' },
  6: { one: 'amine', many: 'diamine' },
  7: { one: 'thiol', many: 'dithiol', keepE: true },
};

function genBenzeneSpecial(rank, count) {
  if (count !== 1) {
    return null;
  }
  return { 1: 'benzoic acid', 1.3: 'benzoate', 1.5: 'benzoyl halide', 1.7: 'benzamide', 2: 'benzonitrile', 3: 'benzaldehyde', 5: 'phenol', 6: 'aniline', 7: 'benzenethiol' }[rank] || null;
}

function genFinishAcyl(ctx, name) {
  if (!name) {
    return name;
  }
  const principal = ctx.lastPrincipal || [];
  const halideWord = { F: 'fluoride', Cl: 'chloride', Br: 'bromide', I: 'iodide' };
  const halide = principal.map((p) => p.group.halide).find((h) => h);
  let out = name;
  if (halide) {
    out = out.replace('halide', halideWord[halide]);
  }
  return genEsterWord(ctx, principal) + out;
}

function genNameRingParent(ctx, atomIds, cycle, rank) {
  return genFinishAcyl(ctx, genNameRingParentCore(ctx, atomIds, cycle, rank));
}

function genNameRingParentCore(ctx, atomIds, cycle, rank) {
  if (rank === 4 && cycle.some((id) => genEl(ctx, id) !== 'C')) {
    const ketoneRing = genNameFused(ctx, new Set(cycle), rank, null);
    if (ketoneRing) {
      return ketoneRing;
    }
  }
  const base = genRingBaseName(ctx, cycle);
  if (!base) {
    const templated = cycle.some((id) => genEl(ctx, id) !== 'C') ? genNameFused(ctx, new Set(cycle), rank, null) : undefined;
    return templated || null;
  }
  lastSubstituentStereoLocants = null;
  const best = genBestRingOrientation(ctx, cycle, rank, null);
  if (!best) {
    return null;
  }
  ctx.lastPrincipal = best.principal;
  genParentLocants = new Map(best.ordered.map((id, index) => [id, index + 1]));
  const entries = best.prefixes.slice();
  let nSubsOk = true;
  best.principal.forEach((p) => {
    if (p.group.nSubs) {
      p.group.nSubs.forEach((n) => {
        const name = genSubstituent(ctx, n.id, p.group.nAtom || p.group.atoms[0], 1);
        if (name) {
          entries.push({ name, locant: 'N' });
        } else {
          nSubsOk = false;
        }
      });
    }
  });
  if (!nSubsOk) {
    return null;
  }
  const soleSubstituent = rank === null && entries.length === 1 && (base.aromatic || (base.carbocycle && best.multiple.length === 0));
  const prefix = genAssemblePrefixes(
    soleSubstituent ? entries.map((e) => ({ name: e.name, locant: null })) : entries
  );
  const count = best.principal.length;
  let stemName = base.name;
  if (best.multiple.length > 0 && base.carbocycle) {
    const enes = best.multiple.filter((m) => m.order === 2).map((m) => m.locant);
    const ynes = best.multiple.filter((m) => m.order === 3).map((m) => m.locant);
    const root = NAME_ROOTS[cycle.length];
    const piece = (locs, tag) => locs.join(',') + '-' + (locs.length > 1 ? MULTIPLIER_PREFIXES[locs.length] : '') + tag;
    const tags = [];
    if (enes.length) {
      tags.push(piece(enes, 'en'));
    }
    if (ynes.length) {
      tags.push(piece(ynes, 'yn'));
    }
    const first = enes.length ? enes : ynes;
    const lone = cycle.length <= 6 && best.multiple.length === 1 && rank === null;
    stemName = 'cyclo' + root + (first.length > 1 ? 'a' : '') + (lone ? '' : '-') + (lone ? tags[0].replace(/^[0-9,]+-/, '') : tags.join('-')) + 'e';
  }
  const joinDash = prefix && /^[0-9]/.test(stemName) ? prefix + '-' : prefix;
  if (rank === null) {
    return joinDash + stemName;
  }
  if (base.aromatic) {
    const special = genBenzeneSpecial(rank, count);
    if (special && best.multiple.length === 3) {
      return prefix + special;
    }
  }
  const info = GEN_RING_SUFFIX[rank];
  const suffix = count === 1 ? info.one : MULTIPLIER_PREFIXES[count] ? genMany(info.many, count) : null;
  if (!suffix) {
    return null;
  }
  const locants = best.principal.map((p) => p.locant).sort((a, b) => a - b);
  const startsVowel = /^[aeiou]/.test(suffix) && !info.keepE;
  const stem = startsVowel && count === 1 ? stemName.replace(/e$/, '') : stemName;
  const lone = count === 1 && entries.length === 0 && !base.hetero && best.multiple.length <= (base.aromatic ? 3 : 0);
  if (info.attached) {
    const needs = !(count === 1 && entries.length === 0 && base.carbocycle);
    return joinDash + stem + (needs ? '-' + locants.join(',') + '-' : '') + suffix;
  }
  return joinDash + stem + (lone ? '' : '-' + locants.join(',') + '-') + suffix;
}

function genRingSeniority(ctx, cycle) {
  const hetero = cycle.filter((id) => genEl(ctx, id) !== 'C');
  const n = hetero.filter((id) => genEl(ctx, id) === 'N').length;
  const members = new Set(cycle);
  let doubles = 0;
  cycle.forEach((id) => ctx.adjacency.get(id).forEach((e) => {
    if (e.order === 2 && members.has(e.id)) {
      doubles++;
    }
  }));
  return [n > 0 ? 1 : 0, hetero.length > 0 ? 1 : 0, cycle.length, hetero.length, doubles / 2];
}

function genNameWithRing(ctx, atomIds) {
  const done = new Set();
  const info = [];
  for (const id of ctx.ringSet) {
    if (done.has(id)) {
      continue;
    }
    const comp = genRingComponentAtoms(ctx, id);
    comp.forEach((c) => done.add(c));
    const cycle = genOrderedCycle(ctx, id);
    const atoms = cycle || Array.from(comp);
    info.push({ cycle, comp, atoms, rank: genRingBestRank(ctx, atoms) });
  }
  const ringRank = info.reduce((m, i) => (i.rank !== null && (m === null || i.rank < m) ? i.rank : m), null);
  if (ringRank === null || ringRank >= 5) {
    const pair = atomIds.filter((id) => genEl(ctx, id) === 'N' && !ctx.ringSet.has(id) &&
      ctx.adjacency.get(id).some((e) => genEl(ctx, e.id) === 'N' && !ctx.ringSet.has(e.id) && e.order <= 2));
    if (pair.length === 2 && ctx.adjacency.get(pair[0]).length === 2 && ctx.adjacency.get(pair[1]).length === 2) {
      const azo = genNameHetero(ctx, pair);
      if (azo) {
        return azo;
      }
    }
  }
  const chain = genChainRankOutsideRing(ctx, atomIds);
  const pool = ringRank !== null ? info.filter((i) => i.rank === ringRank) : info.slice();
  pool.sort((a, b) => genCompareArrays(genRingSeniority(ctx, b.atoms), genRingSeniority(ctx, a.atoms)));
  const build = (rank) => {
    const top = pool[0];
    if (top.cycle) {
      const assembly = genFindAssembly(ctx, top.cycle[0], null);
      if (assembly) {
        return genNameAssembly(ctx, assembly, rank, null);
      }
    }
    return top.cycle ? genNameRingParent(ctx, atomIds, top.cycle, rank) : genNamePoly(ctx, top.comp, rank, null);
  };
  if (ringRank !== null && (chain.rank === null || ringRank <= chain.rank)) {
    return build(ringRank);
  }
  if (chain.rank === null) {
    const chainRings = new Set();
    chain.carbons.forEach((id) => {
      ctx.adjacency.get(id).forEach((e) => {
        const owner = info.findIndex((i) => i.atoms.includes(e.id));
        if (owner >= 0) {
          chainRings.add(owner);
        }
      });
    });
    if (info.length >= 2 && chainRings.size >= 2 && chain.carbons.length > 0 && !genFindAssembly(ctx, pool[0].atoms[0], null)) {
      const viaChain = genNameAcyclic(ctx, atomIds);
      if (viaChain) {
        return viaChain;
      }
    }
    return build(null);
  }
  return genNameAcyclic(ctx, atomIds);
}

function genHasAcylDerivative(ctx, atomIds) {
  return atomIds.some((id) => {
    if (genEl(ctx, id) !== 'C') {
      return false;
    }
    const nbrs = ctx.adjacency.get(id);
    const dblO = nbrs.some((e) => e.order === 2 && genEl(ctx, e.id) === 'O' && ctx.adjacency.get(e.id).length === 1);
    if (!dblO) {
      return false;
    }
    const hetero = nbrs.filter((e) => {
      const el = genEl(ctx, e.id);
      return e.order === 1 && (GEN_HALO[el] || el === 'N' || el === 'S' || el === 'O');
    });
    return hetero.length >= 2 || hetero.some((e) => genEl(ctx, e.id) === 'S') ||
      hetero.some((e) => genEl(ctx, e.id) === 'N' && (ctx.ringSet.has(e.id) || ctx.adjacency.get(e.id).some((x) => x.order !== 1)));
  });
}

const GEN_LONE_NAMES = { H2O: 'water', H3N: 'ammonia', H2O2: 'hydrogen peroxide', H2S: 'hydrogen sulfide' };

function genFunctionalPair(ctx, ends, tail, word) {
  const names = ends.map((end) => genSubstituent(ctx, end.id, end.from, 1));
  if (names.some((n) => !n)) {
    return null;
  }
  const sorted = names.slice().sort((a, b) => (genSortKey(a) < genSortKey(b) ? -1 : 1));
  if (sorted.length === 2 && sorted[0] === sorted[1]) {
    return genMult(2, sorted[0], /[0-9,-]|\s/.test(sorted[0])) + ' ' + tail;
  }
  if (sorted.length === 0) {
    return word;
  }
  return sorted.map((n) => (/[0-9,-]|\s/.test(n) ? '(' + n + ')' : n)).join(' ') + ' ' + tail;
}

function genHeteroChain(ctx, atomIds, element) {
  const atoms = atomIds.filter((id) => genEl(ctx, id) === element);
  const inner = (id) => ctx.adjacency.get(id).filter((e) => genEl(ctx, e.id) === element && (e.order === 1 || (element === 'N' && e.order === 2)));
  if (atoms.length < 2 || atoms.some((id) => inner(id).length > 2)) {
    return null;
  }
  const ends = atoms.filter((id) => inner(id).length === 1);
  if (ends.length !== 2) {
    return null;
  }
  const chain = [ends[0]];
  while (chain.length < atoms.length) {
    const next = inner(chain[chain.length - 1]).find((e) => !chain.includes(e.id));
    if (!next) {
      return null;
    }
    chain.push(next.id);
  }
  const interiorFree = chain.slice(1, -1).every((id) => ctx.adjacency.get(id).length === 2);
  if (!interiorFree) {
    return null;
  }
  const endSubs = [chain[0], chain[chain.length - 1]].map((id) => ({
    id: (ctx.adjacency.get(id).find((e) => !chain.includes(e.id)) || {}).id,
    from: id,
  })).filter((x) => x.id !== undefined);
  return { chain, endSubs };
}

function genFunctionalMany(ctx, ends, tail) {
  const groups = new Map();
  ends.forEach((end) => {
    const name = genSubstituent(ctx, end.id, end.from, 1);
    if (name) {
      groups.set(name, (groups.get(name) || 0) + 1);
    }
  });
  if (groups.size === 0 || Array.from(groups.values()).reduce((a, b) => a + b, 0) !== ends.length) {
    return null;
  }
  const names = Array.from(groups.keys()).sort((a, b) => (genSortKey(a) < genSortKey(b) ? -1 : 1));
  return names.map((n) => {
    const complex = /[0-9,-]|\s/.test(n);
    return groups.get(n) > 1 ? genMult(groups.get(n), n, complex) : complex ? '(' + n + ')' : n;
  }).join(' ') + ' ' + tail;
}

function genPhosphorus(ctx, atomIds) {
  const ps = atomIds.filter((id) => genEl(ctx, id) === 'P');
  if (ps.length !== 1 || genBestRank(ctx, atomIds.filter((id) => genEl(ctx, id) === 'C')) !== null) {
    return null;
  }
  const p = ps[0];
  const nbrs = ctx.adjacency.get(p);
  const oxo = nbrs.filter((e) => e.order === 2 && genEl(ctx, e.id) === 'O' && ctx.adjacency.get(e.id).length === 1);
  const singles = nbrs.filter((e) => e.order === 1);
  const thioCount = nbrs.filter((e) => e.order === 2 && genEl(ctx, e.id) === 'S' && ctx.adjacency.get(e.id).length === 1).length;
  if (nbrs.length !== oxo.length + thioCount + singles.length) {
    return null;
  }
  const esters = singles.filter((e) => genEl(ctx, e.id) === 'O' && ctx.adjacency.get(e.id).length === 2);
  const hydroxyls = singles.filter((e) => genEl(ctx, e.id) === 'O' && ctx.adjacency.get(e.id).length === 1);
  const carbons = singles.filter((e) => genEl(ctx, e.id) === 'C');
  const halides = singles.filter((e) => HALOGEN_PREFIXES[genEl(ctx, e.id)] && ctx.adjacency.get(e.id).length === 1);
  const thio = nbrs.filter((e) => e.order === 2 && genEl(ctx, e.id) === 'S' && ctx.adjacency.get(e.id).length === 1);
  const doubleEnd = oxo.length + thio.length;
  if (doubleEnd === 1 && esters.length + hydroxyls.length + carbons.length + halides.length === singles.length &&
      singles.length === 3 && carbons.length <= 2 && halides.length <= 1 && (nbrs.length === 4)) {
    const halideWord = { F: 'fluoridate', Cl: 'chloridate', Br: 'bromidate', I: 'iodidate' };
    const ends = esters.map((e) => ({ id: ctx.adjacency.get(e.id).find((x) => x.id !== p).id, from: e.id }));
    const subs = carbons.map((e) => genSubstituent(ctx, e.id, p, 1));
    if (subs.some((x) => !x)) {
      return null;
    }
    const subWord = subs.length === 0 ? '' : subs.length === 1 ? subs[0].replace(/^\((.*)\)$/, '$1') : genMult(2, subs[0], false);
    const stem = ['phosph', 'phosphon', 'phosphin'][carbons.length];
    const thioTag = thio.length ? 'othio' : '';
    let tail;
    if (halides.length) {
      tail = subWord + (carbons.length === 0 ? 'phosphoro' : stem + 'o') + halideWord[genEl(ctx, halides[0].id)];
    } else {
      tail = subWord + (carbons.length === 0 ? (thio.length ? 'phosphorothioate' : 'phosphate') : stem + thioTag + 'ate');
    }
    if (hydroxyls.length > 0 && ends.length === 0 && !halides.length) {
      return subWord + (carbons.length === 0 ? 'phosphor' + thioTag : stem + thioTag) + 'ic acid';
    }
    const hydrogen = hydroxyls.length === 0 ? '' : (hydroxyls.length === 1 ? 'hydrogen ' : hydroxyls.length === 2 ? 'dihydrogen ' : '');
    if (ends.length === 0) {
      return hydrogen + tail;
    }
    return genFunctionalMany(ctx, ends, hydrogen + tail);
  }
  if (oxo.length === 0 && carbons.length === 3 && singles.length === 3) {
    const entries = carbons.map((e) => ({ name: genSubstituent(ctx, e.id, p, 1), locant: null }));
    return entries.every((x) => x.name) ? genAssemblePrefixes(entries) + 'phosphine' : null;
  }
  return null;
}

function genNameHetero(ctx, atomIds) {
  const counts = {};
  atomIds.forEach((id) => {
    counts[genEl(ctx, id)] = (counts[genEl(ctx, id)] || 0) + 1;
  });
  const els = Object.keys(counts);
  if (atomIds.length <= 2 && els.every((e) => e !== 'C')) {
    const formula = molecularFormula(ctx.graph, atomIds);
    if (GEN_LONE_NAMES[formula]) {
      return GEN_LONE_NAMES[formula];
    }
  }
  const lone = atomIds.filter((id) => genEl(ctx, id) === 'S');
  if (lone.length === 1 && ctx.adjacency.get(lone[0]).length === 2 &&
      ctx.adjacency.get(lone[0]).every((e) => e.order === 1 && genEl(ctx, e.id) === 'C') &&
      atomIds.every((id) => ['C', 'S'].includes(genEl(ctx, id))) &&
      genBestRank(ctx, atomIds.filter((id) => genEl(ctx, id) === 'C')) === null) {
    return genFunctionalPair(ctx, ctx.adjacency.get(lone[0]).map((e) => ({ id: e.id, from: lone[0] })), 'sulfide', 'sulfide');
  }
  const oxo = (id) => ctx.adjacency.get(id).filter((e) => e.order === 2 && genEl(ctx, e.id) === 'O' && ctx.adjacency.get(e.id).length === 1);
  const sOx = atomIds.filter((id) => genEl(ctx, id) === 'S' && oxo(id).length > 0);
  if (sOx.length === 1 && oxo(sOx[0]).length <= 2 && ctx.adjacency.get(sOx[0]).length === oxo(sOx[0]).length + 2 &&
      ctx.adjacency.get(sOx[0]).every((e) => e.order === 2 || genEl(ctx, e.id) === 'C') &&
      atomIds.every((id) => ['C', 'S', 'O'].includes(genEl(ctx, id))) &&
      genBestRank(ctx, atomIds.filter((id) => genEl(ctx, id) === 'C')) === null) {
    const word = oxo(sOx[0]).length === 2 ? 'sulfone' : 'sulfoxide';
    return genFunctionalPair(ctx, ctx.adjacency.get(sOx[0]).filter((e) => e.order === 1).map((e) => ({ id: e.id, from: sOx[0] })), word, word);
  }
  const phosphorus = genPhosphorus(ctx, atomIds);
  if (phosphorus) {
    return phosphorus;
  }
  const cumul = atomIds.find((id) => genEl(ctx, id) === 'C' && ctx.adjacency.get(id).length === 2 &&
    ctx.adjacency.get(id).every((e) => e.order === 2) &&
    ctx.adjacency.get(id).some((e) => genEl(ctx, e.id) === 'N') &&
    ctx.adjacency.get(id).some((e) => ['O', 'S'].includes(genEl(ctx, e.id)) && ctx.adjacency.get(e.id).length === 1));
  if (cumul !== undefined) {
    const nAtom = ctx.adjacency.get(cumul).find((e) => genEl(ctx, e.id) === 'N').id;
    const chalc = ctx.adjacency.get(cumul).find((e) => genEl(ctx, e.id) !== 'N').id;
    const r = ctx.adjacency.get(nAtom).find((e) => e.id !== cumul);
    if (r && r.order === 1) {
      const name = genSubstituent(ctx, r.id, nAtom, 1);
      if (name) {
        return (/[0-9,-]|\s/.test(name) ? '(' + name + ')' : name) + (genEl(ctx, chalc) === 'S' ? ' isothiocyanate' : ' isocyanate');
      }
    }
  }
  const sulfur = genHeteroChain(ctx, atomIds, 'S');
  if (sulfur) {
    const k = sulfur.chain.length;
    const tail = (['', '', 'disulfide', 'trisulfide', 'tetrasulfide', 'pentasulfide'][k]) || null;
    return tail ? genFunctionalPair(ctx, sulfur.endSubs, tail, tail) : null;
  }
  const oxygen = genHeteroChain(ctx, atomIds, 'O');
  if (oxygen && oxygen.chain.length === 2) {
    return genFunctionalPair(ctx, oxygen.endSubs, 'peroxide', 'hydrogen peroxide');
  }
  const nitrogen = genHeteroChain(ctx, atomIds, 'N');
  if (nitrogen && nitrogen.chain.length === 2) {
    const entries = [];
    for (let i = 0; i < 2; i++) {
      const n = nitrogen.chain[i];
      for (const e of ctx.adjacency.get(n)) {
        if (e.id === nitrogen.chain[1 - i]) {
          continue;
        }
        const name = genSubstituent(ctx, e.id, n, 1);
        if (!name || e.order !== 1) {
          return null;
        }
        entries.push({ name, locant: i + 1 });
      }
    }
    const nnOrder = ctx.adjacency.get(nitrogen.chain[0]).find((e) => e.id === nitrogen.chain[1]).order;
    const parent = nnOrder === 2 ? 'diazene' : 'hydrazine';
    return genAssemblePrefixes(entries.length === 1 ? [{ name: entries[0].name, locant: null }] : entries) + parent;
  }
  const noBond = atomIds.find((id) => genEl(ctx, id) === 'N' &&
    ctx.adjacency.get(id).some((e) => genEl(ctx, e.id) === 'O' && e.order === 1 && ctx.adjacency.get(e.id).length <= 2 &&
      !ctx.adjacency.get(id).some((x) => x.order === 2)));
  if (noBond !== undefined) {
    const oId = ctx.adjacency.get(noBond).find((e) => genEl(ctx, e.id) === 'O').id;
    const entries = [];
    for (const [atom, from, locant] of [[noBond, oId, 'N'], [oId, noBond, 'O']]) {
      for (const e of ctx.adjacency.get(atom)) {
        if (e.id === from) {
          continue;
        }
        const name = genSubstituent(ctx, e.id, atom, 1);
        if (!name) {
          return null;
        }
        entries.push({ name, locant });
      }
    }
    return genAssemblePrefixes(entries) + 'hydroxylamine';
  }
  return null;
}

function genRingComponentAtoms(ctx, startId) {
  const component = new Set([startId]);
  const stack = [startId];
  while (stack.length > 0) {
    const id = stack.pop();
    ctx.ringSet.ringNbr.get(id).forEach((n) => {
      if (!component.has(n)) {
        component.add(n);
        stack.push(n);
      }
    });
  }
  return component;
}

function genPathBetween(ctx, comp, from, firstStep, to) {
  const path = [];
  let prev = from;
  let current = firstStep;
  while (current !== to) {
    path.push(current);
    const next = ctx.ringSet.ringNbr.get(current).find((n) => n !== prev);
    prev = current;
    current = next;
  }
  return path;
}

function genPolyNumberings(ctx, comp) {
  const degree = (id) => ctx.ringSet.ringNbr.get(id).length;
  const atoms = Array.from(comp);
  const nodes3 = atoms.filter((id) => degree(id) === 3);
  const nodes4 = atoms.filter((id) => degree(id) === 4);
  const rest = atoms.filter((id) => degree(id) === 2);
  const lists = [];
  const ringCount = atoms.reduce((sum, id) => sum + ctx.ringSet.ringNbr.get(id).length, 0) / 2 - atoms.length + 1;
  if (ringCount >= 3) {
    return genVonBaeyerNumberings(ctx, comp);
  }
  if (nodes3.length === 2 && nodes4.length === 0 && rest.length === atoms.length - 2) {
    const [b1, b2] = nodes3;
    const bridges = [];
    ctx.ringSet.ringNbr.get(b1).forEach((step) => {
      bridges.push(step === b2 ? [] : genPathBetween(ctx, comp, b1, step, b2));
    });
    if (bridges.length !== 3) {
      return null;
    }
    for (const [start, end, reverseAll] of [[b1, b2, false], [b2, b1, true]]) {
      const oriented = bridges.map((b) => (reverseAll ? b.slice().reverse() : b.slice()));
      const idx = [0, 1, 2];
      const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
      perms.forEach((perm) => {
        const [pa, pb, pc] = perm.map((i) => oriented[i]);
        if (pa.length < pb.length || pb.length < pc.length) {
          return;
        }
        const ordered = [start].concat(pa, [end], pb.slice().reverse(), pc);
        lists.push({
          ordered,
          kind: 'bicyclo',
          descriptor: '[' + [pa.length, pb.length, pc.length].join('.') + ']',
          idx,
        });
      });
    }
    return lists;
  }
  if (nodes4.length === 1 && nodes3.length === 0 && rest.length === atoms.length - 1) {
    const spiro = nodes4[0];
    const nbrs = ctx.ringSet.ringNbr.get(spiro);
    const ringsFound = [];
    const usedStart = new Set();
    nbrs.forEach((step) => {
      if (usedStart.has(step)) {
        return;
      }
      let prev = spiro;
      let current = step;
      const ring = [];
      while (current !== spiro) {
        ring.push(current);
        const next = ctx.ringSet.ringNbr.get(current).find((n) => n !== prev);
        prev = current;
        current = next;
      }
      usedStart.add(ring[0]);
      usedStart.add(ring[ring.length - 1]);
      ringsFound.push(ring);
    });
    if (ringsFound.length !== 2) {
      return null;
    }
    const sortedRings = ringsFound.slice().sort((a, b) => a.length - b.length);
    const variants = [];
    if (sortedRings[0].length === sortedRings[1].length) {
      variants.push([sortedRings[0], sortedRings[1]], [sortedRings[1], sortedRings[0]]);
    } else {
      variants.push([sortedRings[0], sortedRings[1]]);
    }
    variants.forEach(([small, big]) => {
      [small, small.slice().reverse()].forEach((s) => {
        [big, big.slice().reverse()].forEach((b) => {
          lists.push({
            ordered: s.concat([spiro], b),
            kind: 'spiro',
            descriptor: '[' + small.length + '.' + big.length + ']',
          });
        });
      });
    });
    return lists;
  }
  return null;
}

function genPolyMultiples(ctx, ordered) {
  const locantOf = new Map(ordered.map((id, i) => [id, i + 1]));
  const multiple = [];
  ordered.forEach((id) => {
    ctx.ringSet.ringNbr.get(id).forEach((n) => {
      if (id < n) {
        const link = ctx.adjacency.get(id).find((e) => e.id === n);
        if (link.order > 1) {
          const a = Math.min(locantOf.get(id), locantOf.get(n));
          const b = Math.max(locantOf.get(id), locantOf.get(n));
          multiple.push({ locant: a, order: link.order, text: b - a > 1 ? a + '(' + b + ')' : String(a) });
        }
      }
    });
  });
  return multiple.sort((x, y) => x.locant - y.locant);
}

const GEN_HETERO_PREFIX = [['O', 'oxa'], ['S', 'thia'], ['N', 'aza'], ['P', 'phospha']];

function genEvaluatePoly(ctx, numbering, rank, attachId, comp) {
  const result = genEvaluateRing(ctx, numbering.ordered, rank, attachId);
  if (!result) {
    return null;
  }
  result.multiple = genPolyMultiples(ctx, numbering.ordered);
  result.numbering = numbering;
  return result;
}

function genPolyStem(ctx, best, numbering) {
  const root = NAME_ROOTS[best.ordered.length];
  if (!root) {
    return null;
  }
  const enes = best.multiple.filter((m) => m.order === 2).map((m) => m.text);
  const ynes = best.multiple.filter((m) => m.order === 3).map((m) => m.text);
  let unsat = 'an';
  if (enes.length || ynes.length) {
    const tags = [];
    if (enes.length) {
      tags.push(enes.join(',') + '-' + (enes.length > 1 ? MULTIPLIER_PREFIXES[enes.length] : '') + 'en');
    }
    if (ynes.length) {
      tags.push(ynes.join(',') + '-' + (ynes.length > 1 ? MULTIPLIER_PREFIXES[ynes.length] : '') + 'yn');
    }
    const firstCount = enes.length ? enes.length : ynes.length;
    unsat = (firstCount > 1 ? 'a' : '') + '-' + tags.join('-');
  }
  let hetero = '';
  GEN_HETERO_PREFIX.forEach(([el, word]) => {
    const locs = best.ordered
      .map((id, i) => (genEl(ctx, id) === el ? i + 1 : null))
      .filter((v) => v !== null);
    if (locs.length) {
      hetero += (hetero ? '-' : '') + locs.join(',') + '-' + (locs.length > 1 ? MULTIPLIER_PREFIXES[locs.length] : '') + word;
    }
  });
  return (hetero ? hetero : '') + numbering.kind + numbering.descriptor + root + unsat;
}

function genNamePoly(ctx, comp, rank, attachId) {
  const name = genNamePolyCore(ctx, comp, rank, attachId);
  return attachId === null || attachId === undefined ? genFinishAcyl(ctx, name) : name;
}

function genNamePolyCore(ctx, comp, rank, attachId) {
  const fused = genNameFused(ctx, comp, rank, attachId);
  if (fused !== undefined) {
    return fused;
  }
  const numberings = genPolyNumberings(ctx, comp);
  if (!numberings || numberings.length === 0) {
    return null;
  }
  let best = null;
  for (const numbering of numberings) {
    const result = genEvaluatePoly(ctx, numbering, rank, attachId, comp);
    if (!result) {
      return null;
    }
    if (!best || genComparePolyOrientation(result, best) < 0) {
      best = result;
    }
  }
  ctx.lastPrincipal = best.principal;
  if (attachId === null || attachId === undefined) {
    genParentLocants = new Map(best.ordered.map((id, index) => [id, index + 1]));
  }
  const stem = genPolyStem(ctx, best, best.numbering);
  if (!stem) {
    return null;
  }
  const entries = best.prefixes.slice();
  best.principal.forEach((p) => {
    (p.group.nSubs || []).forEach((n) => {
      const name = genSubstituent(ctx, n.id, p.group.nAtom || p.group.atoms[0], 1);
      if (name) {
        entries.push({ name, locant: 'N' });
      }
    });
  });
  const prefix = genAssemblePrefixes(entries);
  const joiner = prefix && /^\d/.test(stem) ? '-' : '';
  const hasEne = best.multiple.length > 0;
  const ending = hasEne ? 'e' : 'e';
  if (attachId !== null && attachId !== undefined) {
    return prefix + joiner + stem + '-' + best.attachLocant + '-yl';
  }
  if (rank === null) {
    return prefix + joiner + stem + ending;
  }
  const info = GEN_RING_SUFFIX[rank];
  const count = best.principal.length;
  const suffix = count === 1 ? info.one : MULTIPLIER_PREFIXES[count] ? genMany(info.many, count) : null;
  if (!suffix) {
    return null;
  }
  const locants = best.principal.map((p) => p.locant).sort((a, b) => a - b);
  const vowel = /^[aeiou]/.test(suffix) && !info.keepE && count === 1;
  return prefix + joiner + stem + (vowel ? '' : ending) + '-' + locants.join(',') + '-' + suffix;
}

function genComparePolyOrientation(x, y) {
  const heteroKey = (r) => r.ordered.map((id, i) => (r.heteroLocants.includes(i + 1) ? i + 1 : null)).filter((v) => v !== null);
  const c = genCompareArrays(heteroKey(x), heteroKey(y));
  if (c !== 0) {
    return c;
  }
  const same = { ...x, heteroLocants: [] };
  const other = { ...y, heteroLocants: [] };
  const savedX = same.multiple;
  const savedY = other.multiple;
  return genCompareRingOrientation(
    { ...same, multiple: savedX, ordered: [] },
    { ...other, multiple: savedY, ordered: [] }
  );
}

const GEN_ASSEMBLY_MULT = ['', '', 'bi', 'ter', 'quater', 'quinque', 'sexi'];

function genFindAssembly(ctx, startId, blockId) {
  const startCycle = genOrderedCycle(ctx, startId);
  if (!startCycle) {
    return null;
  }
  const baseOf = (cycle) => {
    const b = genRingBaseName(ctx, cycle);
    if (!b || (b.carbocycle && genRingMultiples(ctx, cycle).length > 0)) {
      return null;
    }
    return b;
  };
  const base = baseOf(startCycle);
  if (!base) {
    return null;
  }
  const rings = [{ cycle: startCycle, links: [] }];
  const owner = new Map();
  startCycle.forEach((a) => owner.set(a, 0));
  for (let i = 0; i < rings.length; i++) {
    for (const a of rings[i].cycle) {
      for (const e of ctx.adjacency.get(a)) {
        if (e.id === blockId || owner.get(e.id) === i || e.order !== 1 || !ctx.ringSet.has(e.id) || ctx.ringSet.ringNbr.get(a).includes(e.id)) {
          continue;
        }
        if (owner.has(e.id)) {
          if (!rings[i].links.some((l) => l.from === a && l.to === e.id)) {
            return null;
          }
          continue;
        }
        const cycle = genOrderedCycle(ctx, e.id);
        const other = cycle && baseOf(cycle);
        if (!other || other.name !== base.name || cycle.length !== startCycle.length) {
          continue;
        }
        const idx = rings.length;
        rings.push({ cycle, links: [] });
        cycle.forEach((x) => owner.set(x, idx));
        rings[i].links.push({ from: a, to: e.id, ring: idx });
        rings[idx].links.push({ from: e.id, to: a, ring: i });
      }
    }
  }
  if (rings.length < 2 || rings.length > 6 || rings.some((r) => r.links.length > 2)) {
    return null;
  }
  const ends = rings.map((r, i) => i).filter((i) => rings[i].links.length === 1);
  if (ends.length !== 2) {
    return null;
  }
  const orders = [];
  ends.forEach((startIdx) => {
    const order = [startIdx];
    while (order.length < rings.length) {
      const cur = rings[order[order.length - 1]];
      const next = cur.links.find((l) => !order.includes(l.ring));
      if (!next) {
        return;
      }
      order.push(next.ring);
    }
    orders.push(order);
  });
  return { rings, base, orders };
}

function genAssemblyBest(ctx, assembly, rank, attachId) {
  let best = null;
  const evaluate = (order) => {
    const candidates = order.map((ri, pos) => {
      const ring = assembly.rings[ri];
      const skip = new Set(ring.links.map((l) => l.to));
      let list = genRingNumberings(ring.cycle).map((ordered) => genEvaluateRing(ctx, ordered, rank, attachId, skip));
      if (list.some((r) => !r)) {
        return null;
      }
      let minHetero = null;
      list.forEach((r) => {
        if (minHetero === null || genCompareArrays(r.heteroLocants, minHetero) < 0) {
          minHetero = r.heteroLocants;
        }
      });
      list = list.filter((r) => genCompareArrays(r.heteroLocants, minHetero) === 0);
      return list;
    });
    if (candidates.some((c) => !c)) {
      return;
    }
    const pick = new Array(order.length);
    const walk = (pos) => {
      if (pos === order.length) {
        const result = genAssemblyScore(assembly, order, pick.slice());
        if (!best || genAssemblyCompare(result, best) < 0) {
          best = result;
        }
        return;
      }
      candidates[pos].forEach((c) => {
        pick[pos] = c;
        walk(pos + 1);
      });
    };
    walk(0);
  };
  assembly.orders.forEach(evaluate);
  return best;
}

function genAssemblyScore(assembly, order, picks) {
  const value = (loc, pos) => loc + pos / 100;
  const links = [];
  order.forEach((ri, pos) => {
    const ring = assembly.rings[ri];
    const ordered = picks[pos].ordered;
    const loc = (atom) => ordered.indexOf(atom) + 1;
    if (pos > 0) {
      const back = ring.links.find((l) => l.ring === order[pos - 1]);
      links.push({ locant: loc(back.from), pos });
    }
    if (pos < order.length - 1) {
      const fwd = ring.links.find((l) => l.ring === order[pos + 1]);
      links.push({ locant: loc(fwd.from), pos });
    }
  });
  const principal = [];
  const prefixes = [];
  let attach = null;
  picks.forEach((r, pos) => {
    r.principal.forEach((p) => principal.push({ locant: p.locant, pos, group: p.group }));
    r.prefixes.forEach((p) => prefixes.push({ locant: p.locant, pos, name: p.name }));
    if (r.attachLocant) {
      attach = { locant: r.attachLocant, pos };
    }
  });
  const byValue = (a, b) => value(a.locant, a.pos) - value(b.locant, b.pos);
  principal.sort(byValue);
  prefixes.sort(byValue);
  return { order, picks, links, principal, prefixes, attach };
}

function genAssemblyCompare(x, y) {
  const arrays = (r) => [
    r.links.map((l) => l.locant),
    r.principal.map((p) => p.locant + p.pos / 100),
    r.attach ? [r.attach.locant + r.attach.pos / 100] : [],
    r.prefixes.map((p) => p.locant + p.pos / 100),
  ];
  const ax = arrays(x);
  const ay = arrays(y);
  for (let i = 0; i < ax.length; i++) {
    const c = genCompareArrays(ax[i], ay[i]);
    if (c !== 0) {
      return c;
    }
  }
  const nx = x.prefixes.map((p) => genSortKey(p.name));
  const ny = y.prefixes.map((p) => genSortKey(p.name));
  for (let i = 0; i < Math.min(nx.length, ny.length); i++) {
    if (nx[i] !== ny[i]) {
      return nx[i] < ny[i] ? -1 : 1;
    }
  }
  return 0;
}

function genNameAssembly(ctx, assembly, rank, attachId) {
  const best = genAssemblyBest(ctx, assembly, rank, attachId);
  if (!best) {
    return null;
  }
  const primes = (pos) => "'".repeat(pos);
  const label = (loc, pos) => String(loc) + primes(pos);
  const pairs = [];
  let li = 0;
  for (let pos = 0; pos < best.order.length - 1; pos++) {
    const a = best.links[li++];
    const b = best.links[li];
    pairs.push(label(a.locant, a.pos) + ',' + label(b.locant, b.pos));
    if (pos < best.order.length - 2) {
      li++;
    }
  }
  const linkStr = pairs.join(':');
  const base = assembly.base;
  const count = best.order.length;
  let stem;
  let stemYl;
  if (base.aromatic) {
    stem = stemYl = 'phenyl';
  } else if (base.carbocycle) {
    stem = stemYl = '(' + base.name.slice(0, -3) + 'yl)';
  } else {
    stem = base.name;
    stemYl = base.name.replace(/e$/, '');
  }
  const mult = GEN_ASSEMBLY_MULT[count];
  const entries = best.prefixes.map((p) => ({ name: p.name, locant: label(p.locant, p.pos) }));
  best.picks.forEach((r) => {
    r.principal.forEach((p) => {
      if (p.group.nSubs) {
        p.group.nSubs.forEach((n) => {
          const name = genSubstituent(ctx, n.id, p.group.nAtom || p.group.atoms[0], 1);
          if (name) {
            entries.push({ name, locant: 'N' });
          }
        });
      }
    });
  });
  const prefix = genAssemblePrefixes(entries);
  const principal = best.principal.map((p) => ({ locant: p.locant, group: p.group }));
  ctx.lastPrincipal = principal;
  const lead = prefix ? prefix + '-' : '';
  if (attachId !== null && attachId !== undefined && rank === null) {
    if (!best.attach) {
      return null;
    }
    return lead + '[' + linkStr + '-' + mult + stemYl + ']-' + label(best.attach.locant, best.attach.pos) + '-yl';
  }
  if (rank === null || principal.length === 0) {
    return lead + linkStr + '-' + mult + stem;
  }
  const info = GEN_RING_SUFFIX[rank];
  const total = principal.length;
  const suffix = total === 1 ? info.one : MULTIPLIER_PREFIXES[total] ? genMany(info.many, total) : null;
  if (!suffix) {
    return null;
  }
  const locs = best.principal.map((p) => label(p.locant, p.pos));
  const startsVowel = /^[aeiou]/.test(suffix) && !info.keepE;
  const stemOut = mult + (startsVowel && total === 1 ? stemYl : stem);
  const name = lead + '[' + linkStr + '-' + stemOut + ']-' + locs.join(',') + '-' + suffix;
  return genFinishAcyl(ctx, name);
}

const GEN_FUSED_TEMPLATES = [
  { name: 'naphthalene', labels: '1 2 3 4 4a 5 6 7 8 8a', bonds: '1-2 2-3 3-4 4-4a 4a-5 5-6 6-7 7-8 8-8a 8a-1 4a-8a' },
  { name: 'anthracene', labels: '1 2 3 4 4a 5 6 7 8 8a 9 9a 10 10a', bonds: '1-2 2-3 3-4 4-4a 4a-10 10-10a 10a-5 5-6 6-7 7-8 8-8a 8a-9 9-9a 9a-1 4a-9a 8a-10a' },
  { name: 'phenanthrene', labels: '1 2 3 4 4a 4b 5 6 7 8 8a 9 10 10a', bonds: '1-2 2-3 3-4 4-4a 4a-4b 4b-5 5-6 6-7 7-8 8-8a 8a-9 9-10 10-10a 10a-1 4a-10a 4b-8a' },
  { name: 'pyrene', labels: '1 2 3 3a 4 5 5a 6 7 8 8a 9 10 10a 10b 10c', bonds: '1-2 2-3 3-3a 3a-4 4-5 5-5a 5a-6 6-7 7-8 8-8a 8a-9 9-10 10-10a 10a-1 3a-10b 10a-10b 5a-10c 8a-10c 10b-10c' },
  { name: 'triphenylene', labels: '1 2 3 4 4a 4b 5 6 7 8 8a 8b 9 10 11 12 12a 12b', bonds: '1-2 2-3 3-4 4-4a 4a-4b 4b-5 5-6 6-7 7-8 8-8a 8a-8b 8b-9 9-10 10-11 11-12 12-12a 12a-12b 12b-1 12b-4a 4b-8a 8b-12a' },
  { name: 'perylene', labels: '1 2 3 3a 4 5 6 6a 6b 7 8 9 9a 10 11 12 12a 12b 12c 12d', bonds: '1-2 2-3 3-3a 3a-4 4-5 5-6 6-6a 6a-12c 12c-12b 12b-1 12c-3a 6b-7 7-8 8-9 9-9a 9a-10 10-11 11-12 12-12a 12a-12d 12d-6b 12d-9a 6a-6b 12a-12b' },
  { name: 'fluorene', indicated: '9H', sp3: ['9'], labels: '1 2 3 4 4a 4b 5 6 7 8 8a 9 9a', bonds: '1-2 2-3 3-4 4-4a 4a-4b 4b-5 5-6 6-7 7-8 8-8a 8a-9 9-9a 9a-1 4a-9a 4b-8a' },
  { name: 'carbazole', indicated: '9H', sp3: ['9'], hetero: { 9: 'N' }, labels: '1 2 3 4 4a 4b 5 6 7 8 8a 9 9a', bonds: '1-2 2-3 3-4 4-4a 4a-4b 4b-5 5-6 6-7 7-8 8-8a 8a-9 9-9a 9a-1 4a-9a 4b-8a' },
  { name: 'dibenzo[b,d]furan', sp3: ['5'], hetero: { 5: 'O' }, labels: '1 2 3 4 4a 5 5a 6 7 8 9 9a 9b', bonds: '1-2 2-3 3-4 4-4a 4a-5 5-5a 5a-6 6-7 7-8 8-9 9-9a 9a-9b 9b-1 4a-9b 5a-9a' },
  { name: 'dibenzo[b,d]thiophene', sp3: ['5'], hetero: { 5: 'S' }, labels: '1 2 3 4 4a 5 5a 6 7 8 9 9a 9b', bonds: '1-2 2-3 3-4 4-4a 4a-5 5-5a 5a-6 6-7 7-8 8-9 9-9a 9a-9b 9b-1 4a-9b 5a-9a' },
  { name: 'acridine', hetero: { 10: 'N' }, labels: '1 2 3 4 4a 5 6 7 8 8a 9 9a 10 10a', bonds: '1-2 2-3 3-4 4-4a 4a-10 10-10a 10a-5 5-6 6-7 7-8 8-8a 8a-9 9-9a 9a-1 4a-9a 8a-10a' },
  { name: 'xanthene', indicated: '9H', sp3: ['9', '10'], hetero: { 10: 'O' }, labels: '1 2 3 4 4a 5 6 7 8 8a 9 9a 10 10a', bonds: '1-2 2-3 3-4 4-4a 4a-10 10-10a 10a-5 5-6 6-7 7-8 8-8a 8a-9 9-9a 9a-1 4a-9a 8a-10a' },
  { name: 'thioxanthene', indicated: '9H', sp3: ['9', '10'], hetero: { 10: 'S' }, labels: '1 2 3 4 4a 5 6 7 8 8a 9 9a 10 10a', bonds: '1-2 2-3 3-4 4-4a 4a-10 10-10a 10a-5 5-6 6-7 7-8 8-8a 8a-9 9-9a 9a-1 4a-9a 8a-10a' },
  { name: 'phenazine', hetero: { 5: 'N', 10: 'N' }, labels: '1 2 3 4 4a 5 5a 6 7 8 9 9a 10 10a', bonds: '1-2 2-3 3-4 4-4a 4a-5 5-5a 5a-6 6-7 7-8 8-9 9-9a 9a-10 10-10a 10a-1 4a-10a 5a-9a' },
  { name: 'phenothiazine', indicated: '10H', sp3: ['5', '10'], hetero: { 5: 'S', 10: 'N' }, labels: '1 2 3 4 4a 5 5a 6 7 8 9 9a 10 10a', bonds: '1-2 2-3 3-4 4-4a 4a-5 5-5a 5a-6 6-7 7-8 8-9 9-9a 9a-10 10-10a 10a-1 4a-10a 5a-9a' },
  { name: 'phenoxazine', indicated: '10H', sp3: ['5', '10'], hetero: { 5: 'O', 10: 'N' }, labels: '1 2 3 4 4a 5 5a 6 7 8 9 9a 10 10a', bonds: '1-2 2-3 3-4 4-4a 4a-5 5-5a 5a-6 6-7 7-8 8-9 9-9a 9a-10 10-10a 10a-1 4a-10a 5a-9a' },
  { name: 'indole', indicated: '1H', sp3: ['1'], hetero: { 1: 'N' }, labels: '1 2 3 3a 4 5 6 7 7a', bonds: '1-2 2-3 3-3a 3a-4 4-5 5-6 6-7 7-7a 7a-1 3a-7a' },
  { name: 'benzofuran', sp3: ['1'], hetero: { 1: 'O' }, labels: '1 2 3 3a 4 5 6 7 7a', bonds: '1-2 2-3 3-3a 3a-4 4-5 5-6 6-7 7-7a 7a-1 3a-7a' },
  { name: 'benzothiophene', sp3: ['1'], hetero: { 1: 'S' }, labels: '1 2 3 3a 4 5 6 7 7a', bonds: '1-2 2-3 3-3a 3a-4 4-5 5-6 6-7 7-7a 7a-1 3a-7a' },
  { name: 'benzimidazole', indicated: '1H', sp3: ['1'], hetero: { 1: 'N', 3: 'N' }, labels: '1 2 3 3a 4 5 6 7 7a', bonds: '1-2 2-3 3-3a 3a-4 4-5 5-6 6-7 7-7a 7a-1 3a-7a' },
  { name: 'pyridine', ketoneOnly: true, hetero: { 1: 'N' }, labels: '1 2 3 4 5 6', bonds: '1-2 2-3 3-4 4-5 5-6 6-1' },
  { name: 'pyrimidine', ketoneOnly: true, hetero: { 1: 'N', 3: 'N' }, labels: '1 2 3 4 5 6', bonds: '1-2 2-3 3-4 4-5 5-6 6-1' },
  { name: 'pyrazine', ketoneOnly: true, hetero: { 1: 'N', 4: 'N' }, labels: '1 2 3 4 5 6', bonds: '1-2 2-3 3-4 4-5 5-6 6-1' },
  { name: 'pyridazine', ketoneOnly: true, hetero: { 1: 'N', 2: 'N' }, labels: '1 2 3 4 5 6', bonds: '1-2 2-3 3-4 4-5 5-6 6-1' },
  { name: 'pyran', ketoneOnly: true, indicated: '2H', sp3: ['1', '2'], hetero: { 1: 'O' }, labels: '1 2 3 4 5 6', bonds: '1-2 2-3 3-4 4-5 5-6 6-1' },
  { name: 'pyran', ketoneOnly: true, indicated: '4H', sp3: ['1', '4'], hetero: { 1: 'O' }, labels: '1 2 3 4 5 6', bonds: '1-2 2-3 3-4 4-5 5-6 6-1' },
  { name: 'pyrrole', ketoneOnly: true, indicated: '1H', sp3: ['1'], hetero: { 1: 'N' }, labels: '1 2 3 4 5', bonds: '1-2 2-3 3-4 4-5 5-1' },
  { name: 'imidazole', ketoneOnly: true, indicated: '1H', sp3: ['1'], hetero: { 1: 'N', 3: 'N' }, labels: '1 2 3 4 5', bonds: '1-2 2-3 3-4 4-5 5-1' },
  { name: 'pyrazole', ketoneOnly: true, indicated: '1H', sp3: ['1'], hetero: { 1: 'N', 2: 'N' }, labels: '1 2 3 4 5', bonds: '1-2 2-3 3-4 4-5 5-1' },
  { name: 'furan', ketoneOnly: true, hetero: { 1: 'O' }, labels: '1 2 3 4 5', bonds: '1-2 2-3 3-4 4-5 5-1' },
  { name: 'thiophene', ketoneOnly: true, hetero: { 1: 'S' }, labels: '1 2 3 4 5', bonds: '1-2 2-3 3-4 4-5 5-1' },
  { name: 'chromene', indicated: '2H', sp3: ['1', '2'], hetero: { 1: 'O' }, labels: '1 2 3 4 4a 5 6 7 8 8a', bonds: '1-2 2-3 3-4 4-4a 4a-5 5-6 6-7 7-8 8-8a 8a-1 4a-8a' },
  { name: 'quinazoline', hetero: { 1: 'N', 3: 'N' }, labels: '1 2 3 4 4a 5 6 7 8 8a', bonds: '1-2 2-3 3-4 4-4a 4a-5 5-6 6-7 7-8 8-8a 8a-1 4a-8a' },
  { name: 'quinoxaline', hetero: { 1: 'N', 4: 'N' }, labels: '1 2 3 4 4a 5 6 7 8 8a', bonds: '1-2 2-3 3-4 4-4a 4a-5 5-6 6-7 7-8 8-8a 8a-1 4a-8a' },
  { name: 'cinnoline', hetero: { 1: 'N', 2: 'N' }, labels: '1 2 3 4 4a 5 6 7 8 8a', bonds: '1-2 2-3 3-4 4-4a 4a-5 5-6 6-7 7-8 8-8a 8a-1 4a-8a' },
  { name: 'phthalazine', hetero: { 2: 'N', 3: 'N' }, labels: '1 2 3 4 4a 5 6 7 8 8a', bonds: '1-2 2-3 3-4 4-4a 4a-5 5-6 6-7 7-8 8-8a 8a-1 4a-8a' },
  { name: 'benzoxazole', sp3: ['1'], hetero: { 1: 'O', 3: 'N' }, labels: '1 2 3 3a 4 5 6 7 7a', bonds: '1-2 2-3 3-3a 3a-4 4-5 5-6 6-7 7-7a 7a-1 3a-7a' },
  { name: 'benzothiazole', sp3: ['1'], hetero: { 1: 'S', 3: 'N' }, labels: '1 2 3 3a 4 5 6 7 7a', bonds: '1-2 2-3 3-3a 3a-4 4-5 5-6 6-7 7-7a 7a-1 3a-7a' },
  { name: 'indazole', indicated: '1H', sp3: ['1'], hetero: { 1: 'N', 2: 'N' }, labels: '1 2 3 3a 4 5 6 7 7a', bonds: '1-2 2-3 3-3a 3a-4 4-5 5-6 6-7 7-7a 7a-1 3a-7a' },
  { name: 'benzimidazole', indicated: '3H', sp3: ['3'], hetero: { 1: 'N', 3: 'N' }, labels: '1 2 3 3a 4 5 6 7 7a', bonds: '1-2 2-3 3-3a 3a-4 4-5 5-6 6-7 7-7a 7a-1 3a-7a' },
  { name: 'purine', indicated: '9H', sp3: ['9'], hetero: { 1: 'N', 3: 'N', 7: 'N', 9: 'N' }, labels: '1 2 3 4 5 6 7 8 9', bonds: '1-2 2-3 3-4 4-5 5-6 6-1 5-7 7-8 8-9 9-4' },
  { name: 'purine', indicated: '7H', sp3: ['7'], hetero: { 1: 'N', 3: 'N', 7: 'N', 9: 'N' }, labels: '1 2 3 4 5 6 7 8 9', bonds: '1-2 2-3 3-4 4-5 5-6 6-1 5-7 7-8 8-9 9-4' },
  { name: '1,3-benzodioxole', sp3: ['1', '2', '3'], hetero: { 1: 'O', 3: 'O' }, labels: '1 2 3 3a 4 5 6 7 7a', bonds: '1-2 2-3 3-3a 3a-4 4-5 5-6 6-7 7-7a 7a-1 3a-7a' },
  { name: 'indene', indicated: '1H', sp3: ['1'], labels: '1 2 3 3a 4 5 6 7 7a', bonds: '1-2 2-3 3-3a 3a-4 4-5 5-6 6-7 7-7a 7a-1 3a-7a' },
  { name: 'indene', indicated: '2H', sp3: ['2'], labels: '1 2 3 3a 4 5 6 7 7a', bonds: '1-2 2-3 3-3a 3a-4 4-5 5-6 6-7 7-7a 7a-1 3a-7a' },
  { name: '1,3,5-triazine', hetero: { 1: 'N', 3: 'N', 5: 'N' }, labels: '1 2 3 4 5 6', bonds: '1-2 2-3 3-4 4-5 5-6 6-1' },
  { name: '1,2,4-triazine', hetero: { 1: 'N', 2: 'N', 4: 'N' }, labels: '1 2 3 4 5 6', bonds: '1-2 2-3 3-4 4-5 5-6 6-1' },
  { name: '1,2,3-triazole', indicated: '1H', sp3: ['1'], hetero: { 1: 'N', 2: 'N', 3: 'N' }, labels: '1 2 3 4 5', bonds: '1-2 2-3 3-4 4-5 5-1' },
  { name: '1,2,4-triazole', indicated: '1H', sp3: ['1'], hetero: { 1: 'N', 2: 'N', 4: 'N' }, labels: '1 2 3 4 5', bonds: '1-2 2-3 3-4 4-5 5-1' },
  { name: '1,2,4-triazole', indicated: '4H', sp3: ['4'], hetero: { 1: 'N', 2: 'N', 4: 'N' }, labels: '1 2 3 4 5', bonds: '1-2 2-3 3-4 4-5 5-1' },
  { name: '1,2,3-triazole', indicated: '2H', sp3: ['2'], hetero: { 1: 'N', 2: 'N', 3: 'N' }, labels: '1 2 3 4 5', bonds: '1-2 2-3 3-4 4-5 5-1' },
  { name: '1,3,4-oxadiazole', sp3: ['1'], hetero: { 1: 'O', 3: 'N', 4: 'N' }, labels: '1 2 3 4 5', bonds: '1-2 2-3 3-4 4-5 5-1' },
  { name: '1,3,4-thiadiazole', sp3: ['1'], hetero: { 1: 'S', 3: 'N', 4: 'N' }, labels: '1 2 3 4 5', bonds: '1-2 2-3 3-4 4-5 5-1' },
  { name: '1,2,4-oxadiazole', sp3: ['1'], hetero: { 1: 'O', 2: 'N', 4: 'N' }, labels: '1 2 3 4 5', bonds: '1-2 2-3 3-4 4-5 5-1' },
  { name: '1,2,4-thiadiazole', sp3: ['1'], hetero: { 1: 'S', 2: 'N', 4: 'N' }, labels: '1 2 3 4 5', bonds: '1-2 2-3 3-4 4-5 5-1' },
  { name: '1,2,5-oxadiazole', sp3: ['1'], hetero: { 1: 'O', 2: 'N', 5: 'N' }, labels: '1 2 3 4 5', bonds: '1-2 2-3 3-4 4-5 5-1' },
  { name: '1,2,3-thiadiazole', sp3: ['1'], hetero: { 1: 'S', 2: 'N', 3: 'N' }, labels: '1 2 3 4 5', bonds: '1-2 2-3 3-4 4-5 5-1' },
  { name: 'tetrazole', indicated: '2H', sp3: ['2'], hetero: { 1: 'N', 2: 'N', 3: 'N', 4: 'N' }, labels: '1 2 3 4 5', bonds: '1-2 2-3 3-4 4-5 5-1' },
  { name: 'tetrazole', indicated: '1H', sp3: ['1'], hetero: { 1: 'N', 2: 'N', 3: 'N', 4: 'N' }, labels: '1 2 3 4 5', bonds: '1-2 2-3 3-4 4-5 5-1' },
  { name: 'imidazo[1,2-a]pyridine', sp3: ['4'], hetero: { 4: 'N', 1: 'N' }, labels: '1 2 3 4 5 6 7 8 8a', bonds: '1-2 2-3 3-4 4-5 5-6 6-7 7-8 8-8a 8a-1 4-8a' },
  { name: '1,4-benzodioxine', sp3: ['1', '4'], hetero: { 1: 'O', 4: 'O' }, labels: '1 2 3 4 4a 5 6 7 8 8a', bonds: '1-2 2-3 3-4 4-4a 4a-5 5-6 6-7 7-8 8-8a 8a-1 4a-8a' },
  { name: 'indolizine', sp3: ['4'], hetero: { 4: 'N' }, labels: '1 2 3 4 5 6 7 8 8a', bonds: '1-2 2-3 3-4 4-5 5-6 6-7 7-8 8-8a 8a-1 4-8a' },

  { name: '1,4-dioxine', sp3: ['1', '4'], hetero: { 1: 'O', 4: 'O' }, labels: '1 2 3 4 5 6', bonds: '1-2 2-3 3-4 4-5 5-6 6-1' },
  { name: '2-benzofuran', sp3: ['2'], hetero: { 2: 'O' }, labels: '1 2 3 3a 4 5 6 7 7a', bonds: '1-2 2-3 3-3a 3a-4 4-5 5-6 6-7 7-7a 7a-1 3a-7a' },
  { name: '2-benzothiophene', sp3: ['2'], hetero: { 2: 'S' }, labels: '1 2 3 3a 4 5 6 7 7a', bonds: '1-2 2-3 3-3a 3a-4 4-5 5-6 6-7 7-7a 7a-1 3a-7a' },
  { name: 'isoindole', indicated: '2H', sp3: ['2'], hetero: { 2: 'N' }, labels: '1 2 3 3a 4 5 6 7 7a', bonds: '1-2 2-3 3-3a 3a-4 4-5 5-6 6-7 7-7a 7a-1 3a-7a' },
  { name: 'isoindole', indicated: '1H', sp3: ['1'], hetero: { 2: 'N' }, labels: '1 2 3 3a 4 5 6 7 7a', bonds: '1-2 2-3 3-3a 3a-4 4-5 5-6 6-7 7-7a 7a-1 3a-7a' },
  { name: '1,5-naphthyridine', hetero: { 1: 'N', 5: 'N' }, labels: '1 2 3 4 4a 5 6 7 8 8a', bonds: '1-2 2-3 3-4 4-4a 4a-5 5-6 6-7 7-8 8-8a 8a-1 4a-8a' },
  { name: '1,6-naphthyridine', hetero: { 1: 'N', 6: 'N' }, labels: '1 2 3 4 4a 5 6 7 8 8a', bonds: '1-2 2-3 3-4 4-4a 4a-5 5-6 6-7 7-8 8-8a 8a-1 4a-8a' },
  { name: '1,7-naphthyridine', hetero: { 1: 'N', 7: 'N' }, labels: '1 2 3 4 4a 5 6 7 8 8a', bonds: '1-2 2-3 3-4 4-4a 4a-5 5-6 6-7 7-8 8-8a 8a-1 4a-8a' },
  { name: '1,8-naphthyridine', hetero: { 1: 'N', 8: 'N' }, labels: '1 2 3 4 4a 5 6 7 8 8a', bonds: '1-2 2-3 3-4 4-4a 4a-5 5-6 6-7 7-8 8-8a 8a-1 4a-8a' },
  { name: 'pteridine', hetero: { 1: 'N', 3: 'N', 5: 'N', 8: 'N' }, labels: '1 2 3 4 4a 5 6 7 8 8a', bonds: '1-2 2-3 3-4 4-4a 4a-5 5-6 6-7 7-8 8-8a 8a-1 4a-8a' },
  { name: '1,4-benzodiazepine', indicated: '2H', sp3: ['2'], hetero: { 1: 'N', 4: 'N' }, labels: '1 2 3 4 5 5a 6 7 8 9 9a', bonds: '1-2 2-3 3-4 4-5 5-5a 5a-6 6-7 7-8 8-9 9-9a 9a-1 5a-9a' },
  { name: '1,4-benzodiazepine', indicated: '1H', sp3: ['1'], hetero: { 1: 'N', 4: 'N' }, labels: '1 2 3 4 5 5a 6 7 8 9 9a', bonds: '1-2 2-3 3-4 4-5 5-5a 5a-6 6-7 7-8 8-9 9-9a 9a-1 5a-9a' },
  { name: 'dibenzo[b,f]azepine', indicated: '5H', sp3: ['5'], hetero: { 5: 'N' }, labels: '1 2 3 4 4a 5 5a 6 7 8 9 9a 10 11 11a', bonds: '1-2 2-3 3-4 4-4a 4a-5 5-5a 5a-6 6-7 7-8 8-9 9-9a 9a-10 10-11 11-11a 11a-1 4a-11a 5a-9a' },
  { name: 'acenaphthylene', labels: '1 2 2a 3 4 5 5a 6 7 8 8a 8b', bonds: '1-2 2-2a 2a-3 3-4 4-5 5-5a 5a-6 6-7 7-8 8-8a 8a-1 2a-8b 5a-8b 8a-8b' },
  { name: 'azulene', labels: '1 2 3 3a 4 5 6 7 8 8a', bonds: '1-2 2-3 3-3a 3a-4 4-5 5-6 6-7 7-8 8-8a 8a-1 3a-8a' },
  { name: '1,10-phenanthroline', hetero: { 1: 'N', 10: 'N' }, labels: '1 2 3 4 4a 5 6 6a 7 8 9 10 10a 10b', bonds: '1-2 2-3 3-4 4-4a 4a-5 5-6 6-6a 6a-7 7-8 8-9 9-10 10-10a 10a-10b 10b-1 4a-10b 6a-10a' },
  { name: 'quinoline', hetero: { 1: 'N' }, labels: '1 2 3 4 4a 5 6 7 8 8a', bonds: '1-2 2-3 3-4 4-4a 4a-5 5-6 6-7 7-8 8-8a 8a-1 4a-8a' },
  { name: 'isoquinoline', hetero: { 2: 'N' }, labels: '1 2 3 4 4a 5 6 7 8 8a', bonds: '1-2 2-3 3-4 4-4a 4a-5 5-6 6-7 7-8 8-8a 8a-1 4a-8a' },
];

function genFusedTemplateData(tpl) {
  if (!tpl.parsed) {
    const labels = tpl.labels.split(' ');
    const index = new Map(labels.map((l, i) => [l, i]));
    const adj = labels.map(() => []);
    tpl.bonds.split(' ').forEach((b) => {
      const [x, y] = b.split('-').map((l) => index.get(l));
      adj[x].push(y);
      adj[y].push(x);
    });
    tpl.parsed = {
      labels,
      adj,
      elements: labels.map((l) => (tpl.hetero && tpl.hetero[l]) || 'C'),
      sp3: labels.map((l) => (tpl.sp3 || []).includes(l)),
    };
  }
  return tpl.parsed;
}

function genFusedMatches(ctx, comp, data) {
  const n = data.labels.length;
  const found = [];
  const order = [0];
  const seen = new Set([0]);
  for (let i = 0; i < order.length; i++) {
    data.adj[order[i]].forEach((j) => {
      if (!seen.has(j)) {
        seen.add(j);
        order.push(j);
      }
    });
  }
  const mapped = new Array(n).fill(null);
  const used = new Set();
  const atoms = Array.from(comp);
  const recurse = (pos) => {
    if (pos === n) {
      found.push(mapped.slice());
      return;
    }
    const t = order[pos];
    atoms.forEach((id) => {
      if (used.has(id) || genEl(ctx, id) !== data.elements[t]) {
        return;
      }
      const nbrs = ctx.ringSet.ringNbr.get(id);
      if (nbrs.length !== data.adj[t].length) {
        return;
      }
      for (const j of data.adj[t]) {
        if (mapped[j] !== null && !nbrs.includes(mapped[j])) {
          return;
        }
      }
      mapped[t] = id;
      used.add(id);
      recurse(pos + 1);
      mapped[t] = null;
      used.delete(id);
    });
  };
  recurse(0);
  return found;
}

function genFusedFullySaturated(ctx, comp, mapping, data) {
  return !data.sp3.some((v) => v) && mapping.every((id) => !ctx.adjacency.get(id).some((e) => e.order >= 2 && comp.has(e.id)));
}

function genFusedHydroSet(ctx, comp, mapping, data) {
  const hydro = [];
  for (let i = 0; i < mapping.length; i++) {
    const ringDoubles = ctx.adjacency.get(mapping[i]).filter((e) => e.order >= 2 && comp.has(e.id));
    if (ringDoubles.length > 1 || ringDoubles.some((e) => e.order !== 2)) {
      return null;
    }
    if (ringDoubles.length === 0 && !data.sp3[i] && data.elements[i] !== 'O' && data.elements[i] !== 'S') {
      hydro.push(i);
    }
  }
  return hydro.length > 0 && hydro.length % 2 === 0 && MULTIPLIER_PREFIXES[hydro.length] ? hydro : null;
}

function genFusedSaturationOk(ctx, comp, mapping, data) {
  return mapping.every((id, i) => {
    const ringDoubles = ctx.adjacency.get(id).filter((e) => e.order === 2 && comp.has(e.id)).length;
    return data.sp3[i] ? ringDoubles === 0 : ringDoubles === 1;
  });
}

function genKetoneMatching(atoms, adj, blocked) {
  const free = atoms.filter((i) => !blocked.has(i));
  const used = new Set();
  const best = (from) => {
    let top = 0;
    for (let x = from; x < free.length; x++) {
      const a = free[x];
      if (used.has(a)) {
        continue;
      }
      for (const b of adj[a]) {
        if (b > a && !blocked.has(b) && !used.has(b)) {
          used.add(a);
          used.add(b);
          top = Math.max(top, 1 + best(x + 1));
          used.delete(a);
          used.delete(b);
        }
      }
    }
    return top;
  };
  return best(0);
}

function genNameFusedKetone(ctx, comp, tpl, data, all, rank) {
  const n = data.labels.length;
  const isKetone = (id) => genEl(ctx, id) === 'C' && ctx.adjacency.get(id).some((e) => e.order === 2 && genEl(ctx, e.id) === 'O' && ctx.adjacency.get(e.id).length === 1);
  const inert = (id) => (genEl(ctx, id) === 'O' || genEl(ctx, id) === 'S') && ctx.adjacency.get(id).filter((e) => comp.has(e.id)).length === 2 && ctx.adjacency.get(id).every((e) => e.order === 1);
  let best = null;
  for (const mapping of all) {
    const ketones = new Set();
    const inertSet = new Set();
    const zero = [];
    let doubles = 0;
    let bad = false;
    mapping.forEach((id, i) => {
      const rd = ctx.adjacency.get(id).filter((e) => e.order === 2 && comp.has(e.id)).length;
      doubles += rd;
      if (isKetone(id) && rd === 0) {
        ketones.add(i);
      }
      if (inert(id)) {
        inertSet.add(i);
      } else if (rd === 0) {
        zero.push(i);
      } else if (rd > 1) {
        bad = true;
      }
    });
    doubles /= 2;
    if (bad || ketones.size === 0) {
      continue;
    }
    const blocked = new Set([...ketones, ...inertSet]);
    const maxDoubles = genKetoneMatching(Array.from({ length: n }, (_, i) => i), data.adj, blocked);
    if (doubles === 0 && (tpl.indicated || maxDoubles !== 0)) {
      continue;
    }
    if (!tpl.indicated && (doubles > maxDoubles || !MULTIPLIER_PREFIXES[2 * (maxDoubles - doubles)] && maxDoubles !== doubles)) {
      continue;
    }
    const result = genEvaluateRing(ctx, mapping, rank, null);
    if (!result) {
      return null;
    }
    if (result.principal.length !== ketones.size) {
      continue;
    }
    result.multiple = [];
    result.hpos = zero.filter((i) => !ketones.has(i)).map((i) => i + 1).sort((a, b) => a - b);
    result.hydroCount = tpl.indicated ? 0 : 2 * (maxDoubles - doubles);
    result.zero = zero.map((i) => i + 1);
    result.ketoneLocants = Array.from(ketones).map((i) => i + 1).sort((a, b) => a - b);
    if (!best || genCompareRingOrientation(result, best) < 0) {
      best = result;
    }
  }
  if (!best) {
    return null;
  }
  const label = (k) => data.labels[k - 1];
  genParentLocants = new Map(best.ordered.map((id, index) => [id, label(index + 1)]));
  const count = best.ketoneLocants.length;
  const suffix = count === 1 ? 'one' : count === 2 ? 'dione' : MULTIPLIER_PREFIXES[count] ? MULTIPLIER_PREFIXES[count] + 'one' : null;
  if (!suffix) {
    return null;
  }
  let stemPrefix = '';
  let hStr = '';
  if (tpl.indicated) {
    const zeroSorted = best.zero.slice().sort((a, b) => a - b);
    let chosen = null;
    for (const cand of zeroSorted) {
      const hydroList = zeroSorted.filter((z) => z !== cand && !best.ketoneLocants.includes(z));
      if (hydroList.length % 2 === 0) {
        chosen = { cand, hydroList };
        break;
      }
    }
    if (!chosen || (chosen.hydroList.length > 0 && !MULTIPLIER_PREFIXES[chosen.hydroList.length])) {
      return null;
    }
    stemPrefix = (chosen.hydroList.length ? chosen.hydroList.map(label).join(',') + '-' + MULTIPLIER_PREFIXES[chosen.hydroList.length] + 'hydro-' : '') + label(chosen.cand) + 'H-';
  } else {
    const added = best.hpos.slice(0, best.hpos.length - best.hydroCount);
    const hydroList = best.hpos.slice(best.hpos.length - best.hydroCount);
    if (hydroList.length > 0) {
      stemPrefix = hydroList.map(label).join(',') + '-' + MULTIPLIER_PREFIXES[hydroList.length] + 'hydro' + (/^\d/.test(tpl.name) ? '-' : '');
    }
    if (added.length > 0) {
      hStr = '(' + added.map((l) => label(l) + 'H').join(',') + ')';
    }
  }
  const entries = best.prefixes.map((p) => ({ name: p.name, locant: label(p.locant) }));
  best.principal.forEach((p) => {
    (p.group.nSubs || []).forEach((sub) => {
      const name = genSubstituent(ctx, sub.id, p.group.nAtom || p.group.atoms[0], 1);
      if (name) {
        entries.push({ name, locant: 'N' });
      }
    });
  });
  ctx.lastPrincipal = best.principal;
  const stem = count === 1 ? tpl.name.replace(/e$/, '') : tpl.name;
  const body = stemPrefix + stem + '-' + best.ketoneLocants.map(label).join(',') + hStr + '-' + suffix;
  const prefix = genAssemblePrefixes(entries);
  return prefix + (prefix && /^\d/.test(body) ? '-' : '') + body;
}

function genNameFused(ctx, comp, rank, attachId) {
  for (const tpl of GEN_FUSED_TEMPLATES) {
    const data = genFusedTemplateData(tpl);
    if (data.labels.length !== comp.size) {
      continue;
    }
    const all = genFusedMatches(ctx, comp, data);
    let mappings = tpl.ketoneOnly && !tpl.indicated ? [] : all.filter((m) => genFusedSaturationOk(ctx, comp, m, data));
    let hydro = '';
    let partial = false;
    if (mappings.length === 0 && all.length > 0 && rank === 4 && (attachId === null || attachId === undefined)) {
      const ketoneName = genNameFusedKetone(ctx, comp, tpl, data, all, rank);
      if (ketoneName) {
        return ketoneName;
      }
    }
    if (mappings.length === 0) {
      mappings = all.filter((m) => genFusedHydroSet(ctx, comp, m, data) && (!tpl.ketoneOnly || m.some((id) => ctx.adjacency.get(id).some((e) => e.order === 2 && comp.has(e.id)))));
      if (mappings.length === 0) {
        continue;
      }
      partial = true;
    }
    let best = null;
    for (const mapping of mappings) {
      const result = genEvaluateRing(ctx, mapping, rank, attachId);
      if (!result) {
        return null;
      }
      result.multiple = [];
      if (partial) {
        result.hydroIdx = genFusedHydroSet(ctx, comp, mapping, data);
        result.hpos = result.hydroIdx.map((i) => i + 1).sort((a, b) => a - b);
      }
      if (!best || genCompareRingOrientation(result, best) < 0) {
        best = result;
      }
    }
    const label = (n) => data.labels[n - 1];
    if (attachId === null || attachId === undefined) {
      genParentLocants = new Map(best.ordered.map((id, index) => [id, label(index + 1)]));
    }
    if (partial) {
      const everyCarbon = best.hydroIdx.length === data.labels.length && !tpl.indicated;
      hydro = everyCarbon
        ? MULTIPLIER_PREFIXES[best.hydroIdx.length] + 'hydro'
        : best.hpos.map(label).join(',') + '-' + MULTIPLIER_PREFIXES[best.hydroIdx.length] + 'hydro' + (tpl.indicated || /^\d/.test(tpl.name) ? '-' : '');
    }
    const entries = best.prefixes.map((p) => ({ name: p.name, locant: label(p.locant) }));
    best.principal.forEach((p) => {
      (p.group.nSubs || []).forEach((sub) => {
        const name = genSubstituent(ctx, sub.id, p.group.nAtom || p.group.atoms[0], 1);
        if (name) {
          entries.push({ name, locant: 'N' });
        }
      });
    });
    ctx.lastPrincipal = best.principal;
    const base = hydro + ((tpl.indicated ? tpl.indicated + '-' : '') + tpl.name);
    if (attachId !== null && attachId !== undefined) {
      const prefix = genAssemblePrefixes(entries);
      return prefix + (prefix ? '-' : '') + base.replace(/e$/, '') + '-' + label(best.attachLocant) + '-yl';
    }
    let body;
    if (rank === null) {
      body = base;
    } else {
      const info = GEN_RING_SUFFIX[rank];
      const count = best.principal.length;
      const suffix = count === 1 ? info.one : MULTIPLIER_PREFIXES[count] ? genMany(info.many, count) : null;
      if (!suffix) {
        return null;
      }
      const locants = best.principal.map((p) => p.locant).sort((a, b) => a - b).map(label);
      const drop = /^[aeiou]/.test(suffix) && !info.keepE && count === 1;
      body = (drop ? base.replace(/e$/, '') : base) + '-' + locants.join(',') + '-' + suffix;
    }
    const prefix = genAssemblePrefixes(entries);
    return prefix + (prefix && /^\d/.test(body) ? '-' : '') + body;
  }
  return undefined;
}

const GEN_SUPERSCRIPT = { 0: '\u2070', 1: '\u00b9', 2: '\u00b2', 3: '\u00b3', 4: '\u2074', 5: '\u2075', 6: '\u2076', 7: '\u2077', 8: '\u2078', 9: '\u2079', ',': '\u002c' };
const GEN_CYCLO_KIND = ['', '', 'bicyclo', 'tricyclo', 'tetracyclo', 'pentacyclo', 'hexacyclo', 'heptacyclo', 'octacyclo'];

function genSuperscript(text) {
  return String(text).split('').map((c) => GEN_SUPERSCRIPT[c] || c).join('');
}

function genEnumerateCycles(ctx, atoms) {
  const cycles = [];
  const order = new Map(atoms.map((id, i) => [id, i]));
  let budget = 200000;
  for (const start of atoms) {
    const path = [start];
    const seen = new Set([start]);
    const walk = (cur) => {
      if (budget-- < 0) {
        return;
      }
      ctx.ringSet.ringNbr.get(cur).forEach((n) => {
        if (n === start && path.length >= 3) {
          if (path[1] < path[path.length - 1]) {
            cycles.push(path.slice());
          }
        } else if (!seen.has(n) && order.get(n) > order.get(start)) {
          seen.add(n);
          path.push(n);
          walk(n);
          path.pop();
          seen.delete(n);
        }
      });
    };
    walk(start);
  }
  return budget < 0 ? null : cycles;
}

function genBridgeCandidates(ctx, cycle, cycleSet) {
  const position = new Map(cycle.map((id, i) => [id, i]));
  const L = cycle.length;
  const bridges = [];
  const seenKeys = new Set();
  const push = (u, v, atoms) => {
    const key = u < v ? u + ':' + v + ':' + atoms.join(',') : v + ':' + u + ':' + atoms.slice().reverse().join(',');
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      bridges.push({ u, v, atoms });
    }
  };
  cycle.forEach((u) => {
    const explore = (path, cur) => {
      ctx.ringSet.ringNbr.get(cur).forEach((z) => {
        if (cycleSet.has(z)) {
          if (path.length === 0) {
            const gap = Math.abs(position.get(u) - position.get(z));
            if (z !== u && gap !== 1 && gap !== L - 1) {
              push(u, z, []);
            }
          } else if (z !== u) {
            push(u, z, path.slice());
          }
        } else if (!path.includes(z)) {
          path.push(z);
          explore(path, z);
          path.pop();
        }
      });
    };
    explore([], u);
  });
  return bridges;
}

function genSecondaryBridges(ctx, comp, cycle, bridge) {
  const inMain = new Set(cycle.concat(bridge.atoms));
  const usedEdges = new Set();
  const edgeKey = (a, b) => (a < b ? a + ':' + b : b + ':' + a);
  cycle.forEach((id, i) => usedEdges.add(edgeKey(id, cycle[(i + 1) % cycle.length])));
  const chain = [bridge.u].concat(bridge.atoms, [bridge.v]);
  chain.forEach((id, i) => {
    if (i > 0) {
      usedEdges.add(edgeKey(chain[i - 1], id));
    }
  });
  const secondary = [];
  for (const a of inMain) {
    for (const b of ctx.ringSet.ringNbr.get(a)) {
      if (inMain.has(b) && a < b && !usedEdges.has(edgeKey(a, b))) {
        secondary.push({ x: a, y: b, atoms: [] });
      }
    }
  }
  const rest = Array.from(comp).filter((id) => !inMain.has(id));
  const visited = new Set();
  for (const start of rest) {
    if (visited.has(start)) {
      continue;
    }
    const group = [];
    const stack = [start];
    visited.add(start);
    while (stack.length) {
      const cur = stack.pop();
      group.push(cur);
      ctx.ringSet.ringNbr.get(cur).forEach((n) => {
        if (!inMain.has(n) && !visited.has(n)) {
          visited.add(n);
          stack.push(n);
        }
      });
    }
    const groupSet = new Set(group);
    const attachments = [];
    for (const id of group) {
      const inner = ctx.ringSet.ringNbr.get(id).filter((n) => groupSet.has(n));
      if (inner.length > 2) {
        return null;
      }
      ctx.ringSet.ringNbr.get(id).forEach((n) => {
        if (inMain.has(n)) {
          attachments.push({ inside: id, outside: n });
        }
      });
    }
    if (attachments.length !== 2 || attachments[0].outside === attachments[1].outside) {
      return null;
    }
    const path = [attachments[0].inside];
    while (path.length < group.length) {
      const tail = path[path.length - 1];
      const next = ctx.ringSet.ringNbr.get(tail).find((n) => groupSet.has(n) && !path.includes(n));
      if (next === undefined) {
        return null;
      }
      path.push(next);
    }
    if (path[path.length - 1] !== attachments[1].inside) {
      return null;
    }
    secondary.push({ x: attachments[0].outside, y: attachments[1].outside, atoms: path });
  }
  return secondary;
}

function genVonBaeyerNumberings(ctx, comp) {
  const atoms = Array.from(comp);
  const ringCount = atoms.reduce((sum, id) => sum + ctx.ringSet.ringNbr.get(id).length, 0) / 2 - atoms.length + 1;
  const kind = GEN_CYCLO_KIND[ringCount];
  if (!kind) {
    return null;
  }
  const cycles = genEnumerateCycles(ctx, atoms);
  if (!cycles || cycles.length === 0) {
    return null;
  }
  const maxLen = Math.max(...cycles.map((c) => c.length));
  const candidates = [];
  cycles.filter((c) => c.length === maxLen).forEach((cycle) => {
    const cycleSet = new Set(cycle);
    genBridgeCandidates(ctx, cycle, cycleSet).forEach((bridge) => {
      candidates.push({ cycle, bridge });
    });
  });
  if (candidates.length === 0) {
    return null;
  }
  const bestBridge = Math.max(...candidates.map((c) => c.bridge.atoms.length));
  let pool = candidates.filter((c) => c.bridge.atoms.length === bestBridge);
  const split = (c) => {
    const pu = c.cycle.indexOf(c.bridge.u);
    const pv = c.cycle.indexOf(c.bridge.v);
    const a = (Math.abs(pv - pu) - 1);
    return Math.abs(a - (c.cycle.length - 2 - a));
  };
  const bestSplit = Math.min(...pool.map(split));
  pool = pool.filter((c) => split(c) === bestSplit);
  const results = [];
  for (const { cycle, bridge } of pool) {
    const secondary = genSecondaryBridges(ctx, comp, cycle, bridge);
    if (!secondary || secondary.length !== ringCount - 2) {
      continue;
    }
    const L = cycle.length;
    const pu = cycle.indexOf(bridge.u);
    for (const [start, other] of [[bridge.u, bridge.v], [bridge.v, bridge.u]]) {
      for (const dir of [1, -1]) {
        const seg1 = [];
        let i = (cycle.indexOf(start) + dir + L) % L;
        while (cycle[i] !== other) {
          seg1.push(cycle[i]);
          i = (i + dir + L) % L;
        }
        const seg2 = [];
        i = (i + dir + L) % L;
        while (cycle[i] !== start) {
          seg2.push(cycle[i]);
          i = (i + dir + L) % L;
        }
        if (seg1.length < seg2.length) {
          continue;
        }
        const bridgeAtoms = start === bridge.u ? bridge.atoms.slice() : bridge.atoms.slice().reverse();
        const ordered = [start].concat(seg1, [other], seg2, bridgeAtoms);
        const locant = new Map(ordered.map((id, k) => [id, k + 1]));
        const bridges = secondary.map((b) => {
          let x = b.x;
          let y = b.y;
          let path = b.atoms.slice();
          if (locant.get(x) > locant.get(y)) {
            [x, y] = [y, x];
            path.reverse();
          }
          return { x, y, path };
        });
        const numbered = bridges.slice().sort((p, q) => locant.get(q.y) - locant.get(p.y) || q.path.length - p.path.length);
        let next = ordered.length;
        const full = ordered.slice();
        numbered.forEach((b) => {
          b.path.slice().reverse().forEach((id) => {
            locant.set(id, ++next);
            full.push(id);
          });
        });
        const superscripts = bridges
          .map((b) => [locant.get(b.x), locant.get(b.y)])
          .sort((p, q) => q[0] - p[0] || q[1] - p[1]);
        const key = bridges.flatMap((b) => [locant.get(b.x), locant.get(b.y)]).sort((p, q) => p - q);
        const parts = bridges
          .slice()
          .sort((p, q) => q.path.length - p.path.length || locant.get(p.x) - locant.get(q.x) || locant.get(p.y) - locant.get(q.y))
          .map((b) => '.' + b.path.length + genSuperscript(locant.get(b.x) + ',' + locant.get(b.y)));
        const descriptor = '[' + seg1.length + '.' + seg2.length + '.' + bridgeAtoms.length + parts.join('') + ']';
        results.push({ ordered: full, kind, descriptor, key, superscripts });
      }
    }
  }
  if (results.length === 0) {
    return null;
  }
  let bestKey = null;
  results.forEach((r) => {
    if (bestKey === null || genCompareArrays(r.key, bestKey) < 0) {
      bestKey = r.key;
    }
  });
  return results.filter((r) => genCompareArrays(r.key, bestKey) === 0);
}

const GEN_PRINCIPAL_PREFIX_PATTERN = /hydroxy|amino|carboxy|oxo|formyl|cyano|sulfanyl|carbamoyl|imino|sulfo/;

function silaneName(graph, atomIds) {
  const atoms = atomIds.map((id) => graph.getAtom(id)).filter(Boolean);
  const silicons = atoms.filter((atom) => atom.element === 'Si');
  if (silicons.length !== 1 || atoms.some((atom) => atom.element !== 'Si' && NAMING_UNSUPPORTED_ELEMENTS.has(atom.element))) {
    return null;
  }
  const si = silicons[0].id;
  const ctx = genContext(graph, atomIds);
  if (ctx.ringSet.has(si)) {
    return null;
  }
  const links = ctx.adjacency.get(si);
  if (links.some((link) => link.order !== 1)) {
    return null;
  }
  const names = [];
  for (const link of links) {
    const name = genSubstituent(ctx, link.id, si, 1);
    if (!name) {
      return null;
    }
    names.push(name);
  }
  if (names.some((name) => !['hydroxy', 'amino', 'cyano'].includes(name) && GEN_PRINCIPAL_PREFIX_PATTERN.test(name))) {
    return null;
  }
  const suffixGroup = ['cyano', 'hydroxy', 'amino'].find((group) => names.includes(group)) || null;
  const suffixCount = names.filter((name) => name === suffixGroup).length;
  const suffixWord = { cyano: 'carbonitrile', hydroxy: 'ol', amino: 'amine' }[suffixGroup];
  const suffix = suffixCount === 0
    ? 'silane'
    : (suffixCount > 1 || suffixGroup === 'cyano' ? 'silane' + (suffixCount > 1 ? MULTIPLIER_PREFIXES[suffixCount] : '') : 'silan') + suffixWord;
  return genAssembleCentralPrefixes(names.filter((name) => name !== suffixGroup)) + suffix;
}

function genAssembleCentralPrefixes(names) {
  const counts = new Map();
  names.forEach((name) => counts.set(name, (counts.get(name) || 0) + 1));
  const ordered = Array.from(counts.keys()).sort((a, b) => {
    const ka = genSortKey(a);
    const kb = genSortKey(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  let result = '';
  let previous = null;
  ordered.forEach((name) => {
    const count = counts.get(name);
    const wrapped = genFullyWrapped(name);
    const complex = !wrapped && (/[\d(),\[\]\s]|-/.test(name.replace(/^(tert|sec)-/, '')) || genCompoundPrefix(name));
    let piece = wrapped
      ? (count > 1 ? genMult(count, name.slice(1, -1), true) : name)
      : genMult(count, name, complex);
    if (!wrapped && !complex && count === 1 && previous && (/^(tert|sec)-/.test(previous.name) || previous.count > 1)) {
      piece = '(' + piece + ')';
    }
    result += piece;
    previous = { name, count };
  });
  return result;
}

function genSilylSubstituent(ctx, id, fromId, depth) {
  if (ctx.ringSet.has(id)) {
    return null;
  }
  const others = ctx.adjacency.get(id).filter((e) => e.id !== fromId);
  if (ctx.adjacency.get(id).some((e) => e.order !== 1)) {
    return null;
  }
  const names = [];
  for (const link of others) {
    const name = genSubstituent(ctx, link.id, id, depth + 1);
    if (!name) {
      return null;
    }
    names.push(name);
  }
  return names.length === 0 ? 'silyl' : '(' + genAssembleCentralPrefixes(names) + 'silyl)';
}
