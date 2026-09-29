const SHARE_FORMAT_VERSION = 1;
const SHARE_LINK_WARN_LENGTH = 8000;
const SHARE_MAX_JSON_LENGTH = 4000000;
const SHARE_STEREO_CODES = [null, 'wedge', 'hash'];
const SHARE_B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function shareTenths(value) {
  return Math.round(value * 10);
}

function shareTrim(row, defaults) {
  let end = row.length;
  while (end > 0 && defaults[end - 1] !== undefined && row[end - 1] === defaults[end - 1]) {
    end--;
  }
  return row.slice(0, end);
}

function shareEncodeAnnotation(a) {
  if (a.kind === 'arrow') {
    const row = ['a', a.id, shareTenths(a.x1), shareTenths(a.y1), shareTenths(a.x2), shareTenths(a.y2), a.style || 'forward',
      Number.isFinite(a.bend) ? a.bend : null,
      typeof a.above === 'string' ? a.above : null,
      typeof a.below === 'string' ? a.below : null];
    return shareTrim(row, [undefined, undefined, undefined, undefined, undefined, undefined, 'forward', null, null, null]);
  }
  if (a.kind === 'text') {
    return ['t', a.id, shareTenths(a.x), shareTenths(a.y), String(a.text)];
  }
  if (a.kind === 'plus') {
    return ['p', a.id, shareTenths(a.x), shareTenths(a.y)];
  }
  if (a.kind === 'bracket') {
    const row = ['b', a.id, a.atomIds.slice(), a.n || 'n', typeof a.label === 'string' ? a.label : null];
    return shareTrim(row, [undefined, undefined, undefined, 'n', null]);
  }
  return null;
}

function shareEncodeGraph(state) {
  const data = typeof state === 'string' ? JSON.parse(state) : state;
  const atoms = (data.atoms || []).map((a) => shareTrim(
    [a.id, a.element, shareTenths(a.x), shareTenths(a.y), a.charge || 0, a.abbr || '', a.abbrHidden ? 1 : 0],
    [undefined, undefined, undefined, undefined, 0, '', 0]));
  const bonds = (data.bonds || []).map((b) => shareTrim(
    [b.id, b.atomA, b.atomB, b.order, Math.max(0, SHARE_STEREO_CODES.indexOf(b.stereo || null))],
    [undefined, undefined, undefined, 1, 0]));
  const annotations = (data.annotations || []).map(shareEncodeAnnotation).filter((row) => row);
  const next = [data.nextAtomId || 1, data.nextBondId || 1, data.nextAnnotationId || 1];
  return JSON.stringify([SHARE_FORMAT_VERSION, next, atoms, bonds, annotations]);
}

function shareIsInt(value) {
  return Number.isInteger(value);
}

function shareOptionalString(value) {
  return value === undefined || value === null || typeof value === 'string';
}

function shareDecodeAnnotation(row) {
  if (!Array.isArray(row) || !shareIsInt(row[1])) {
    return null;
  }
  const kind = row[0];
  if (kind === 'a' && row.length >= 6 && row.slice(2, 6).every(shareIsInt) && shareOptionalString(row[6]) && shareOptionalString(row[8]) && shareOptionalString(row[9]) &&
    (row[7] === undefined || row[7] === null || Number.isFinite(row[7]))) {
    const arrow = { id: row[1], kind: 'arrow', x1: row[2] / 10, y1: row[3] / 10, x2: row[4] / 10, y2: row[5] / 10, style: row[6] || 'forward' };
    if (Number.isFinite(row[7])) {
      arrow.bend = row[7];
    }
    if (typeof row[8] === 'string') {
      arrow.above = row[8];
    }
    if (typeof row[9] === 'string') {
      arrow.below = row[9];
    }
    return arrow;
  }
  if (kind === 't' && shareIsInt(row[2]) && shareIsInt(row[3]) && typeof row[4] === 'string') {
    return { id: row[1], kind: 'text', x: row[2] / 10, y: row[3] / 10, text: row[4] };
  }
  if (kind === 'p' && shareIsInt(row[2]) && shareIsInt(row[3])) {
    return { id: row[1], kind: 'plus', x: row[2] / 10, y: row[3] / 10 };
  }
  if (kind === 'b' && Array.isArray(row[2]) && row[2].length > 0 && row[2].every(shareIsInt) && shareOptionalString(row[3]) && shareOptionalString(row[4])) {
    const bracket = { id: row[1], kind: 'bracket', atomIds: row[2].slice(), n: row[3] || 'n' };
    if (typeof row[4] === 'string') {
      bracket.label = row[4];
    }
    return bracket;
  }
  return null;
}

function shareDecodeGraph(text) {
  if (typeof text !== 'string' || text.length === 0 || text.length > SHARE_MAX_JSON_LENGTH) {
    return { error: 'the link is empty or too large' };
  }
  let data = null;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return { error: 'the link data is not readable' };
  }
  if (!Array.isArray(data) || data[0] !== SHARE_FORMAT_VERSION || !Array.isArray(data[1]) || !Array.isArray(data[2]) || !Array.isArray(data[3]) || !Array.isArray(data[4])) {
    return { error: 'the link is not a structure from this app' };
  }
  const atoms = [];
  for (const row of data[2]) {
    if (!Array.isArray(row) || !shareIsInt(row[0]) || typeof row[1] !== 'string' || !shareIsInt(row[2]) || !shareIsInt(row[3]) ||
      !(row[4] === undefined || shareIsInt(row[4])) || !shareOptionalString(row[5])) {
      return { error: 'an atom in the link is malformed' };
    }
    const atom = { id: row[0], element: row[1], x: row[2] / 10, y: row[3] / 10 };
    if (row[4]) {
      atom.charge = row[4];
    }
    if (row[5]) {
      atom.abbr = row[5];
    }
    if (row[6] === 1) {
      atom.abbrHidden = true;
    }
    atoms.push(atom);
  }
  const ids = new Set(atoms.map((a) => a.id));
  const bonds = [];
  for (const row of data[3]) {
    const order = row && row[3] === undefined ? 1 : row && row[3];
    const stereo = row && row[4] === undefined ? 0 : row && row[4];
    if (!Array.isArray(row) || !shareIsInt(row[0]) || !ids.has(row[1]) || !ids.has(row[2]) || ![1, 2, 3].includes(order) || ![0, 1, 2].includes(stereo)) {
      return { error: 'a bond in the link is malformed' };
    }
    bonds.push({ id: row[0], atomA: row[1], atomB: row[2], order, stereo: SHARE_STEREO_CODES[stereo] });
  }
  const annotations = [];
  for (const row of data[4]) {
    const annotation = shareDecodeAnnotation(row);
    if (!annotation) {
      return { error: 'an annotation in the link is malformed' };
    }
    annotations.push(annotation);
  }
  const next = data[1];
  if (!next.slice(0, 3).every(shareIsInt)) {
    return { error: 'the link header is malformed' };
  }
  return {
    format: 'chemical-graph-constructor',
    version: 1,
    atoms,
    bonds,
    nextAtomId: next[0],
    nextBondId: next[1],
    annotations,
    nextAnnotationId: next[2],
  };
}

function shareBase64UrlEncode(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    out += SHARE_B64_ALPHABET[(n >> 18) & 63] + SHARE_B64_ALPHABET[(n >> 12) & 63];
    if (i + 1 < bytes.length) {
      out += SHARE_B64_ALPHABET[(n >> 6) & 63];
    }
    if (i + 2 < bytes.length) {
      out += SHARE_B64_ALPHABET[n & 63];
    }
  }
  return out;
}

function shareBase64UrlDecode(text) {
  if (typeof text !== 'string' || !/^[A-Za-z0-9_-]*$/.test(text) || text.length % 4 === 1) {
    return null;
  }
  const bytes = new Uint8Array(Math.floor(text.length * 3 / 4));
  let o = 0;
  for (let i = 0; i < text.length; i += 4) {
    const chunk = text.slice(i, i + 4);
    let n = 0;
    for (let j = 0; j < 4; j++) {
      n = (n << 6) | (j < chunk.length ? SHARE_B64_ALPHABET.indexOf(chunk[j]) : 0);
    }
    bytes[o++] = (n >> 16) & 255;
    if (chunk.length > 2) {
      bytes[o++] = (n >> 8) & 255;
    }
    if (chunk.length > 3) {
      bytes[o++] = n & 255;
    }
  }
  return bytes.slice(0, o);
}

function shareUtf8Encode(text) {
  return new TextEncoder().encode(text);
}

function shareUtf8Decode(bytes) {
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function sharePackPayload(bytes, compressed) {
  return (compressed ? 'z' : 'u') + shareBase64UrlEncode(bytes);
}

function shareUnpackPayload(payload) {
  const text = typeof payload === 'string' ? payload.trim() : '';
  const prefix = text.charAt(0);
  if (prefix !== 'z' && prefix !== 'u') {
    return { error: 'the link payload has an unknown format' };
  }
  const bytes = shareBase64UrlDecode(text.slice(1));
  if (!bytes || bytes.length === 0) {
    return { error: 'the link payload is damaged' };
  }
  return { compressed: prefix === 'z', bytes };
}

function shareParseHash(hash) {
  const text = String(hash || '').replace(/^#/, '');
  const graphMatch = /^g=(.*)$/.exec(text);
  if (graphMatch) {
    return { kind: 'g', payload: graphMatch[1] };
  }
  const smilesMatch = /^smiles=(.*)$/.exec(text);
  if (smilesMatch) {
    let smiles = null;
    try {
      smiles = decodeURIComponent(smilesMatch[1]).trim();
    } catch (error) {
      smiles = null;
    }
    return { kind: 'smiles', payload: smiles || null };
  }
  return null;
}

function shareUrl(base, kind, payload) {
  const root = String(base || '').split('#')[0];
  return root + '#' + kind + '=' + (kind === 'smiles' ? encodeURIComponent(payload) : payload);
}
