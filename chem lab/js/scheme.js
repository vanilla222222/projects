const SCHEME_SETTINGS = {
  minBand: 120,
  labelGap: 12,
};

const CURVED_ARROW_STYLES = ['electron', 'fishhook'];

const CURVED_ARROW_SETTINGS = {
  defaultBend: -0.4,
  shortBend: -0.8,
  shortLength: 70,
  maxBend: 1.5,
  samples: 32,
};

function isCurvedArrow(arrow) {
  return Boolean(arrow) && CURVED_ARROW_STYLES.includes(arrow.style);
}

function arrowBend(arrow) {
  if (!Number.isFinite(arrow.bend) || arrow.bend === 0) {
    return CURVED_ARROW_SETTINGS.defaultBend;
  }
  return Math.max(-CURVED_ARROW_SETTINGS.maxBend, Math.min(CURVED_ARROW_SETTINGS.maxBend, arrow.bend));
}

function defaultArrowBend(length) {
  const settings = CURVED_ARROW_SETTINGS;
  if (!(length > 0) || length >= settings.shortLength) {
    return settings.defaultBend;
  }
  return Math.max(settings.shortBend, (settings.defaultBend * settings.shortLength) / length);
}

function curvedArrowControl(arrow) {
  const bend = arrowBend(arrow);
  return {
    x: (arrow.x1 + arrow.x2) / 2 - (arrow.y2 - arrow.y1) * bend,
    y: (arrow.y1 + arrow.y2) / 2 + (arrow.x2 - arrow.x1) * bend,
  };
}

function arrowPathPoints(arrow) {
  if (!isCurvedArrow(arrow)) {
    return [{ x: arrow.x1, y: arrow.y1 }, { x: arrow.x2, y: arrow.y2 }];
  }
  const c = curvedArrowControl(arrow);
  const points = [];
  for (let i = 0; i <= CURVED_ARROW_SETTINGS.samples; i++) {
    const t = i / CURVED_ARROW_SETTINGS.samples;
    const u = 1 - t;
    points.push({
      x: u * u * arrow.x1 + 2 * u * t * c.x + t * t * arrow.x2,
      y: u * u * arrow.y1 + 2 * u * t * c.y + t * t * arrow.y2,
    });
  }
  return points;
}

function polylineLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total;
}

function polylineTrim(points, fromStart, fromEnd) {
  const total = polylineLength(points);
  const start = Math.max(0, fromStart);
  const end = Math.min(total, total - fromEnd);
  if (end <= start) {
    return [];
  }
  const result = [];
  let walked = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    const at = (d) => {
      const t = seg > 0 ? (d - walked) / seg : 0;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    };
    if (walked + seg >= start && walked <= end) {
      if (result.length === 0) {
        result.push(at(Math.max(start, walked)));
      }
      result.push(at(Math.min(end, walked + seg)));
    }
    walked += seg;
  }
  return result;
}

function schemeFrame(arrow) {
  const length = Math.hypot(arrow.x2 - arrow.x1, arrow.y2 - arrow.y1) || 1;
  const ux = (arrow.x2 - arrow.x1) / length;
  const uy = (arrow.y2 - arrow.y1) / length;
  return {
    length,
    band: Math.max(SCHEME_SETTINGS.minBand, length),
    project: (point) => ({
      along: (point.x - arrow.x1) * ux + (point.y - arrow.y1) * uy,
      across: Math.abs(-(point.x - arrow.x1) * uy + (point.y - arrow.y1) * ux),
    }),
  };
}

function schemeSides(graph, arrow) {
  const frame = schemeFrame(arrow);
  if (isCurvedArrow(arrow)) {
    return { reactants: [], products: [] };
  }
  let lower = -Infinity;
  let upper = Infinity;
  graph.annotations.forEach((other) => {
    if (other.kind !== 'arrow' || other.id === arrow.id || isCurvedArrow(other)) {
      return;
    }
    const p = frame.project({ x: (other.x1 + other.x2) / 2, y: (other.y1 + other.y2) / 2 });
    if (p.across > frame.band) {
      return;
    }
    if (p.along < 0) {
      lower = Math.max(lower, p.along);
    } else if (p.along > frame.length) {
      upper = Math.min(upper, p.along);
    }
  });
  const reactants = [];
  const products = [];
  graph.connectedComponents().forEach((component) => {
    let x = 0;
    let y = 0;
    component.atomIds.forEach((id) => {
      const atom = graph.getAtom(id);
      x += atom.x;
      y += atom.y;
    });
    const p = frame.project({ x: x / component.atomIds.length, y: y / component.atomIds.length });
    if (p.across > frame.band) {
      return;
    }
    if (p.along < 0 && p.along > lower) {
      reactants.push(component.atomIds);
    } else if (p.along > frame.length && p.along < upper) {
      products.push(component.atomIds);
    }
  });
  return { reactants, products };
}

const ARROW_LABEL_SLOTS = ['above', 'below'];

function arrowLabelAnchor(arrow, slot, height) {
  const length = Math.hypot(arrow.x2 - arrow.x1, arrow.y2 - arrow.y1) || 1;
  let nx = -(arrow.y2 - arrow.y1) / length;
  let ny = (arrow.x2 - arrow.x1) / length;
  if (ny > 0 || (ny === 0 && nx > 0)) {
    nx = -nx;
    ny = -ny;
  }
  const side = slot === 'above' ? 1 : -1;
  const offset = SCHEME_SETTINGS.labelGap + (height || 0) / 2;
  return {
    x: (arrow.x1 + arrow.x2) / 2 + nx * offset * side,
    y: (arrow.y1 + arrow.y2) / 2 + ny * offset * side,
  };
}

function schemeComponentBox(graph, atomIds) {
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  atomIds.forEach((id) => {
    const atom = graph.getAtom(id);
    box.minX = Math.min(box.minX, atom.x);
    box.minY = Math.min(box.minY, atom.y);
    box.maxX = Math.max(box.maxX, atom.x);
    box.maxY = Math.max(box.maxY, atom.y);
  });
  return box;
}

function schemePlusPositions(graph, arrow) {
  const sides = schemeSides(graph, arrow);
  const length = Math.hypot(arrow.x2 - arrow.x1, arrow.y2 - arrow.y1) || 1;
  const ux = (arrow.x2 - arrow.x1) / length;
  const uy = (arrow.y2 - arrow.y1) / length;
  const positions = [];
  [sides.reactants, sides.products].forEach((group) => {
    const items = group.map((ids) => {
      const box = schemeComponentBox(graph, ids);
      const corners = [[box.minX, box.minY], [box.maxX, box.minY], [box.minX, box.maxY], [box.maxX, box.maxY]]
        .map(([x, y]) => (x - arrow.x1) * ux + (y - arrow.y1) * uy);
      return { box, start: Math.min(...corners), end: Math.max(...corners) };
    }).sort((a, b) => a.start - b.start);
    for (let i = 1; i < items.length; i++) {
      const along = (items[i - 1].end + items[i].start) / 2;
      const centerA = { x: (items[i - 1].box.minX + items[i - 1].box.maxX) / 2, y: (items[i - 1].box.minY + items[i - 1].box.maxY) / 2 };
      const centerB = { x: (items[i].box.minX + items[i].box.maxX) / 2, y: (items[i].box.minY + items[i].box.maxY) / 2 };
      const acrossA = -(centerA.x - arrow.x1) * uy + (centerA.y - arrow.y1) * ux;
      const acrossB = -(centerB.x - arrow.x1) * uy + (centerB.y - arrow.y1) * ux;
      const across = (acrossA + acrossB) / 2;
      positions.push({ x: arrow.x1 + ux * along - uy * across, y: arrow.y1 + uy * along + ux * across, from: items[i - 1].end, to: items[i].start });
    }
  });
  return positions;
}

function schemeAutoPlus(graph, arrow) {
  const length = Math.hypot(arrow.x2 - arrow.x1, arrow.y2 - arrow.y1) || 1;
  const ux = (arrow.x2 - arrow.x1) / length;
  const uy = (arrow.y2 - arrow.y1) / length;
  let added = 0;
  schemePlusPositions(graph, arrow).forEach((spot) => {
    const exists = graph.annotations.some((a) => {
      if (a.kind !== 'plus') {
        return false;
      }
      const along = (a.x - arrow.x1) * ux + (a.y - arrow.y1) * uy;
      return along >= spot.from - 1 && along <= spot.to + 1 && Math.hypot(a.x - spot.x, a.y - spot.y) < SCHEME_SETTINGS.minBand;
    });
    if (!exists) {
      graph.addAnnotation({ kind: 'plus', x: spot.x, y: spot.y });
      added += 1;
    }
  });
  return added;
}

function schemeFormulaCounts(graph, atomIds) {
  const properties = computeProperties(graph, atomIds);
  const suffix = chargeText(properties.charge);
  const formula = properties.formula.slice(0, properties.formula.length - suffix.length);
  const counts = {};
  const pattern = /([A-Z][a-z]?)(\d*)/g;
  let match;
  while ((match = pattern.exec(formula)) !== null) {
    counts[match[1]] = (counts[match[1]] || 0) + (match[2] ? Number(match[2]) : 1);
  }
  return { counts, charge: properties.charge, formula: properties.formula, display: schemeSubscript(formula) + suffix };
}

function schemeSubscript(formula) {
  return formula.replace(/\d/g, (digit) => String.fromCharCode(0x2080 + Number(digit)));
}

function schemeHillFormula(counts) {
  const keys = Object.keys(counts).filter((k) => counts[k] > 0);
  const rest = keys.filter((k) => k !== 'C' && k !== 'H').sort();
  const order = counts.C > 0 ? ['C'].concat(counts.H > 0 ? ['H'] : [], rest) : keys.sort();
  return order.map((k) => k + (counts[k] > 1 ? counts[k] : '')).join('');
}

function schemeBalance(graph, arrow) {
  const sides = schemeSides(graph, arrow);
  const total = (groups) => {
    const counts = {};
    let charge = 0;
    const formulas = groups.map((ids) => {
      const part = schemeFormulaCounts(graph, ids);
      Object.keys(part.counts).forEach((k) => {
        counts[k] = (counts[k] || 0) + part.counts[k];
      });
      charge += part.charge;
      return part;
    });
    return { counts, charge, formulas: formulas.map((part) => part.formula), display: formulas.map((part) => part.display) };
  };
  const left = total(sides.reactants);
  const right = total(sides.products);
  const gained = {};
  const lost = {};
  new Set(Object.keys(left.counts).concat(Object.keys(right.counts))).forEach((k) => {
    const delta = (right.counts[k] || 0) - (left.counts[k] || 0);
    if (delta > 0) {
      gained[k] = delta;
    } else if (delta < 0) {
      lost[k] = -delta;
    }
  });
  const chargeDelta = right.charge - left.charge;
  return {
    reactants: left.formulas,
    products: right.formulas,
    reactantDisplay: left.display,
    productDisplay: right.display,
    gained: schemeHillFormula(gained),
    lost: schemeHillFormula(lost),
    chargeDelta,
    balanced: Object.keys(gained).length === 0 && Object.keys(lost).length === 0 && chargeDelta === 0,
    complete: sides.reactants.length > 0 && sides.products.length > 0,
  };
}

function schemeBalanceText(balance) {
  if (!balance.complete) {
    return balance.reactants.length === 0 ? 'No molecules before this arrow' : 'No molecules after this arrow';
  }
  const equation = balance.reactantDisplay.join(' + ') + ' → ' + balance.productDisplay.join(' + ');
  if (balance.balanced) {
    return 'Balanced · ' + equation;
  }
  const parts = [];
  if (balance.gained) {
    parts.push('products gain ' + schemeSubscript(balance.gained));
  }
  if (balance.lost) {
    parts.push('products lose ' + schemeSubscript(balance.lost));
  }
  if (balance.chargeDelta) {
    parts.push('charge changes by ' + (balance.chargeDelta > 0 ? '+' : '−') + Math.abs(balance.chargeDelta));
  }
  return 'Not balanced · ' + parts.join(', ') + ' · ' + equation;
}
