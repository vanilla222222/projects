const MAX_VALENCE = { C: 4, N: 3, O: 2, S: 2, P: 5, D: 1, F: 1, Cl: 1, Br: 1, I: 1, B: 3, Si: 4, Se: 2, Li: 1, Na: 1, K: 1, Cs: 1, Mg: 2, Ca: 2, Zn: 2, Sn: 4 };
const HYPERVALENT_OXO_CEILING = { N: 5, S: 6, Se: 6 };
const HYPERVALENT_MAX_OXO_COUNT = { N: 2, S: 2, Se: 2 };
const ALKALI_METALS = new Set(['Li', 'Na', 'K', 'Rb', 'Cs', 'Fr']);
const DIVALENT_METALS = new Set(['Be', 'Mg', 'Ca', 'Sr', 'Ba', 'Ra', 'Zn']);
const ELECTROPOSITIVE_ELEMENTS = new Set(['B'].concat(PERIODIC_ELEMENTS.filter((element) => isMetalElement(element.symbol) && element.symbol !== 'Sn').map((element) => element.symbol)));
const NO_IMPLICIT_HYDROGEN = new Set(PERIODIC_ELEMENTS.filter((element) => !element.implicitHydrogens && !['Sn', 'Se'].includes(element.symbol)).map((element) => element.symbol));

fillElementTable(MAX_VALENCE, (element) => element.maxValence);

function maxValenceFor(element) {
  return Object.prototype.hasOwnProperty.call(MAX_VALENCE, element) ? MAX_VALENCE[element] : 0;
}

const CHARGED_BASE_VALENCE = { P: 3, As: 3, Sb: 3, Bi: 3, Te: 2, Po: 2 };

function valenceFor(element, charge) {
  const base = maxValenceFor(element);
  if (!charge || base === 0) {
    return base;
  }
  if (element === 'H' || element === 'D') {
    return 0;
  }
  if (element === 'C' || element === 'Si') {
    return Math.max(0, base - Math.abs(charge));
  }
  if (ELECTROPOSITIVE_ELEMENTS.has(element)) {
    return Math.max(0, base - charge);
  }
  const normal = Object.prototype.hasOwnProperty.call(CHARGED_BASE_VALENCE, element) ? CHARGED_BASE_VALENCE[element] : base;
  return Math.max(0, normal + charge);
}

function atomValence(atom) {
  return valenceFor(atom.element, atom.charge || 0);
}

const STANDARD_VALENCES = { C: [4], N: [3, 5], O: [2], S: [2, 4, 6], P: [3, 5], D: [1], F: [1], Cl: [1], Br: [1], I: [1], B: [3], Si: [4], Se: [2, 4, 6], Li: [1], Na: [1], K: [1], Cs: [1], Mg: [2], Ca: [2], Zn: [2], Sn: [4] };

fillElementTable(STANDARD_VALENCES, (element) => element.valences.slice());

function implicitHydrogenCount(element, charge, bondSum) {
  if (element === 'H' || ALKALI_METALS.has(element) || DIVALENT_METALS.has(element) || NO_IMPLICIT_HYDROGEN.has(element)) {
    return 0;
  }
  if (charge) {
    return Math.max(0, valenceFor(element, charge) - bondSum);
  }
  const list = STANDARD_VALENCES[element] || [];
  const v = list.find((x) => x >= bondSum);
  return v === undefined ? 0 : v - bondSum;
}

function chargeText(charge) {
  if (!charge) {
    return '';
  }
  const mag = Math.abs(charge);
  return (mag > 1 ? String(mag) : '') + (charge > 0 ? '+' : '\u2212');
}

function projectedBondsFor(graph, atomId, otherAtomId, deltaOrder) {
  const bonds = graph.bondsForAtom(atomId).map((bond) => ({
    otherId: bond.atomA === atomId ? bond.atomB : bond.atomA,
    order: bond.order,
  }));
  const idx = otherAtomId !== null ? bonds.findIndex((b) => b.otherId === otherAtomId) : -1;
  if (idx !== -1) {
    bonds[idx] = { otherId: otherAtomId, order: bonds[idx].order + deltaOrder };
  } else {
    bonds.push({ otherId: otherAtomId, order: deltaOrder });
  }
  return bonds;
}

function canAddBond(graph, atomId, deltaOrder, other) {
  const atom = graph.getAtom(atomId);
  if (!atom) return false;
  if (deltaOrder <= 0) return true;

  const base = atomValence(atom);
  const newTotal = graph.totalBondOrder(atomId) + deltaOrder;
  if (newTotal <= base) {
    return true;
  }
  if (atom.charge) {
    return false;
  }

  let otherElement = null;
  let otherAtomId = null;
  if (typeof other === 'string') {
    otherElement = other;
  } else if (typeof other === 'number') {
    otherAtomId = other;
    const otherAtom = graph.getAtom(other);
    otherElement = otherAtom ? otherAtom.element : null;
  }

  const ceiling = HYPERVALENT_OXO_CEILING[atom.element];
  const maxOxoCount = HYPERVALENT_MAX_OXO_COUNT[atom.element];
  if (ceiling && maxOxoCount && newTotal <= ceiling) {
    const bonds = projectedBondsFor(graph, atomId, otherAtomId, deltaOrder);

    const isTerminalOxygen = (bond) => {
      if (bond.otherId === null) {
        return otherElement === 'O';
      }
      const bondAtom = graph.getAtom(bond.otherId);
      if (!bondAtom || bondAtom.element !== 'O') return false;
      const outsideBonds = graph
        .bondsForAtom(bond.otherId)
        .filter((b) => b.atomA !== atomId && b.atomB !== atomId);
      return outsideBonds.length === 0;
    };

    const minOxoOrder = atom.element === 'S' ? 1 : 2;
    let normalSum = 0;
    let oxoCount = 0;
    let looseOxo = 0;
    for (const bond of bonds) {
      if (bond.order >= 2 && isTerminalOxygen(bond)) {
        oxoCount += 1;
      } else if (bond.order >= minOxoOrder && isTerminalOxygen(bond)) {
        looseOxo += 1;
      } else {
        normalSum += bond.order;
      }
    }
    const looseAsOxo = Math.min(looseOxo, Math.max(0, maxOxoCount - oxoCount));
    oxoCount += looseAsOxo;
    normalSum += looseOxo - looseAsOxo;
    if (normalSum <= base && oxoCount <= maxOxoCount) {
      return true;
    }
  }

  if (atom.element === 'N' && otherAtomId !== null && newTotal === 4) {
    const bonds = projectedBondsFor(graph, atomId, otherAtomId, deltaOrder);
    if (bonds.length === 2 && bonds.every((bond) => bond.order === 2)) {
      return true;
    }
  }

  return false;
}

const VALENCE_FIX_CHARGES = [0, 1, -1, 2, -2];
const BOND_ORDER_WORDS = { 1: 'single', 2: 'double', 3: 'triple' };

function atomValenceOk(graph, atomId) {
  return graph.bondsForAtom(atomId).every((bond) => {
    const otherId = bond.atomA === atomId ? bond.atomB : bond.atomA;
    bond.order -= 1;
    const ok = canAddBond(graph, atomId, 1, otherId);
    bond.order += 1;
    return ok;
  });
}

function valenceCheckable(atom) {
  return !atom.abbr && atom.element !== 'D' && maxValenceFor(atom.element) > 0;
}

function valenceChargeFix(graph, atom) {
  const previous = atom.charge || 0;
  let found = null;
  for (const charge of VALENCE_FIX_CHARGES) {
    if (charge === previous) {
      continue;
    }
    atom.charge = charge;
    if (atomValenceOk(graph, atom.id)) {
      found = charge;
      break;
    }
  }
  if (previous) {
    atom.charge = previous;
  } else {
    delete atom.charge;
  }
  return found;
}

function valenceOrderFix(graph, atom) {
  const bonds = graph.bondsForAtom(atom.id).filter((bond) => bond.order > 1).sort((a, b) => b.order - a.order);
  for (const bond of bonds) {
    bond.order -= 1;
    const otherId = bond.atomA === atom.id ? bond.atomB : bond.atomA;
    const ok = atomValenceOk(graph, atom.id);
    bond.order += 1;
    if (ok) {
      return { bondId: bond.id, order: bond.order - 1, otherId };
    }
  }
  return null;
}

function valenceProblems(graph) {
  const problems = [];
  graph.atoms.forEach((atom) => {
    if (!valenceCheckable(atom) || atomValenceOk(graph, atom.id)) {
      return;
    }
    const label = atom.element + chargeText(atom.charge || 0);
    const message = label + ' has ' + graph.totalBondOrder(atom.id) + ' bonds but allows ' + atomValence(atom);
    const charge = valenceChargeFix(graph, atom);
    if (charge !== null) {
      problems.push({
        atomId: atom.id,
        message,
        fix: { type: 'charge', charge, label: charge ? 'set charge to ' + (charge > 0 ? '+' : '\u2212') + Math.abs(charge) : 'remove the charge' },
      });
      return;
    }
    const order = valenceOrderFix(graph, atom);
    if (order) {
      const other = graph.getAtom(order.otherId);
      problems.push({
        atomId: atom.id,
        message,
        fix: { type: 'order', bondId: order.bondId, order: order.order, label: 'make the ' + atom.element + '–' + (other ? other.element : '?') + ' bond ' + BOND_ORDER_WORDS[order.order] },
      });
      return;
    }
    problems.push({ atomId: atom.id, message, fix: null });
  });
  return problems;
}

function applyValenceFix(graph, problem) {
  const fix = problem.fix;
  if (!fix) {
    return false;
  }
  if (fix.type === 'charge') {
    const atom = graph.getAtom(problem.atomId);
    if (!atom) {
      return false;
    }
    if (fix.charge) {
      atom.charge = fix.charge;
    } else {
      delete atom.charge;
    }
    return true;
  }
  const bond = graph.bonds.find((b) => b.id === fix.bondId);
  if (!bond) {
    return false;
  }
  bond.order = fix.order;
  return true;
}

function fixAllValenceProblems(graph, chargesOnly) {
  let fixed = 0;
  for (let pass = 0; pass < graph.atoms.length + 1; pass += 1) {
    const problem = valenceProblems(graph).find((p) => p.fix && (!chargesOnly || p.fix.type === 'charge'));
    if (!problem || !applyValenceFix(graph, problem)) {
      break;
    }
    fixed += 1;
  }
  return fixed;
}
