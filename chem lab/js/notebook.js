const NOTEBOOK_APP_NAME = 'Chemical Graph Constructor';

const NOTEBOOK_SECTIONS = [
  { key: 'properties', label: 'Properties' },
  { key: 'nmrH', label: '¹H NMR' },
  { key: 'nmrC', label: '¹³C NMR' },
  { key: 'ir', label: 'IR' },
  { key: 'ms', label: 'MS' },
];

const NOTEBOOK_CSS = [
  '.notebook { max-width: 860px; margin: 0 auto; padding: 28px 24px 40px; color: #111827; background: #ffffff; font: 14px/1.5 "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif; }',
  '.notebook h1 { margin: 0 0 4px; font-size: 24px; }',
  '.notebook h2 { margin: 0 0 10px; font-size: 18px; }',
  '.notebook h3 { margin: 16px 0 6px; font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; color: #374151; }',
  '.notebook .nb-meta { color: #6b7280; font-size: 12.5px; }',
  '.notebook .nb-head { padding-bottom: 12px; margin-bottom: 18px; border-bottom: 2px solid #111827; }',
  '.notebook .nb-notes { margin-bottom: 22px; }',
  '.notebook .nb-notes-text { white-space: pre-wrap; padding: 10px 12px; background: #f6f7f9; border: 1px solid #e5e7eb; border-radius: 6px; }',
  '.notebook .nb-entry { padding-top: 18px; margin-top: 18px; border-top: 1px solid #d1d5db; }',
  '.notebook .nb-entry:first-of-type { border-top: 0; margin-top: 0; padding-top: 0; }',
  '.notebook .nb-top { display: flex; flex-wrap: wrap; gap: 18px; align-items: flex-start; }',
  '.notebook .nb-structure { flex: 0 1 300px; }',
  '.notebook .nb-structure svg { display: block; max-width: 100%; height: auto; max-height: 260px; }',
  '.notebook table { border-collapse: collapse; font-size: 13px; }',
  '.notebook td, .notebook th { padding: 3px 10px 3px 0; text-align: left; vertical-align: top; }',
  '.notebook td:first-child { color: #6b7280; white-space: nowrap; }',
  '.notebook .nb-ids { flex: 1 1 320px; }',
  '.notebook .nb-mono { font-family: "IBM Plex Mono", Menlo, Consolas, monospace; word-break: break-all; }',
  '.notebook .nb-section { break-inside: avoid; page-break-inside: avoid; }',
  '.notebook .nb-spectrum { display: block; max-width: 100%; height: auto; }',
  '.notebook .nb-peaks { margin: 4px 0 0; font-size: 12.5px; color: #374151; }',
  '.notebook .nb-missing { color: #6b7280; font-style: italic; }',
  '.notebook .nb-foot { margin-top: 28px; color: #6b7280; font-size: 11.5px; }',
].join('\n');

function notebookEscape(text) {
  return String(text === undefined || text === null ? '' : text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function notebookFixed(value, digits) {
  return Number.isFinite(value) ? Number(value).toFixed(digits) : '';
}

function notebookFormulaHtml(formula) {
  return notebookEscape(formula).replace(/(\d+)/g, '<sub>$1</sub>');
}

function notebookWanted(opts) {
  const sections = (opts && opts.sections) || {};
  const wanted = {};
  NOTEBOOK_SECTIONS.forEach((s) => {
    wanted[s.key] = sections[s.key] !== false;
  });
  return wanted;
}

function notebookEntry(graph, ids, opts) {
  const options = opts || {};
  const field = options.field || 400;
  const wanted = notebookWanted(options);
  const p = computeProperties(graph, ids);
  let names = { full: '', common: '' };
  try {
    names = nameStructureDetailed(graph, ids) || names;
  } catch (error) {
    names = { full: '', common: '' };
  }
  const entry = {
    name: names.common || names.full || p.formula,
    iupac: names.full || '',
    formula: p.formula,
    mw: p.averageMass,
    exactMass: p.exactMass,
    smiles: p.smiles,
    properties: null,
    nmrH: [],
    nmrC: [],
    ir: [],
    ms: [],
    field,
    sections: wanted,
    peakLists: {},
    errors: [],
  };
  if (wanted.properties) {
    entry.properties = {
      heavyAtoms: p.heavyAtoms,
      hydrogens: p.hydrogens,
      charge: p.charge,
      rings: p.rings,
      aromaticRings: p.aromaticRings,
      donors: p.donors,
      acceptors: p.acceptors,
      rotatable: p.rotatable,
      tpsa: p.tpsa,
      logP: p.logP,
      lipinski: p.lipinski.slice(),
      veber: p.veber.slice(),
    };
  }
  const peakList = (tab, data) => (typeof spectraPeakList === 'function' ? spectraPeakList(tab, data, { field }) : '');
  if (wanted.nmrH) {
    try {
      const data = predictProtonNmr(graph, ids, { field });
      entry.nmrH = data.signals.map((s) => ({ shift: s.shift, count: s.count, multiplicity: s.multiplicity, J: (s.J || []).slice(), broad: !!s.broad }));
      entry.peakLists.nmrH = peakList('h', data);
    } catch (error) {
      entry.errors.push('nmrH');
    }
  }
  if (wanted.nmrC) {
    try {
      const data = predictCarbonNmr(graph, ids);
      entry.nmrC = data.signals.map((s) => ({ shift: s.shift, count: s.count, type: s.type }));
      entry.peakLists.nmrC = peakList('c', data);
    } catch (error) {
      entry.errors.push('nmrC');
    }
  }
  if (wanted.ir) {
    try {
      const data = predictIrBands(graph, ids);
      entry.ir = data.map((b) => ({ center: b.center, from: b.from, to: b.to, intensity: b.intensity, shape: b.shape, label: b.label }));
      entry.peakLists.ir = peakList('ir', data);
    } catch (error) {
      entry.errors.push('ir');
    }
  }
  if (wanted.ms) {
    try {
      const data = predictMassSpectrum(graph, ids);
      entry.ms = data.peaks.map((pk) => ({ mz: pk.mz, intensity: pk.intensity, label: pk.label || '' }));
      entry.peakLists.ms = peakList('ms', data);
    } catch (error) {
      entry.errors.push('ms');
    }
  }
  return entry;
}

function notebookNum(value) {
  return String(Math.round(value * 10) / 10);
}

function notebookNiceStep(span, target) {
  const raw = span / Math.max(1, target);
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  const unit = raw / power;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power;
}

function notebookSpectrumSvg(kind, data, options) {
  const opts = options || {};
  const width = opts.width || 560;
  const height = opts.height || 170;
  const m = { l: 14, r: 14, t: 22, b: 30 };
  const pw = width - m.l - m.r;
  const ph = height - m.t - m.b;
  const list = Array.isArray(data) ? data : [];
  let lo = 0;
  let hi = 10;
  let reversed = true;
  let axisTitle = 'δ (ppm)';
  if (kind === 'nmrH') {
    lo = Math.min(0, Math.floor(Math.min(...list.map((s) => s.shift), 0) - 0.5));
    hi = Math.max(10, Math.ceil(Math.max(...list.map((s) => s.shift), 0) + 0.5));
  } else if (kind === 'nmrC') {
    lo = 0;
    hi = Math.max(220, Math.ceil((Math.max(...list.map((s) => s.shift), 0) + 10) / 10) * 10);
  } else if (kind === 'ir') {
    lo = 400;
    hi = 4000;
    axisTitle = 'ν̃ (cm⁻¹)';
  } else {
    reversed = false;
    lo = 0;
    hi = Math.max(50, Math.ceil((Math.max(...list.map((p) => p.mz), 0) + 10) / 10) * 10);
    axisTitle = 'm/z';
  }
  const x = (v) => m.l + (reversed ? (hi - v) / (hi - lo) : (v - lo) / (hi - lo)) * pw;
  const base = m.t + ph;
  const parts = [];
  const label = (tx, ty, text, anchor, size, color) => parts.push('<text x="' + notebookNum(tx) + '" y="' + notebookNum(ty) + '" text-anchor="' + (anchor || 'middle') +
    '" font-size="' + (size || 10) + '" fill="' + (color || '#374151') + '">' + notebookEscape(text) + '</text>');
  parts.push('<rect x="0" y="0" width="' + width + '" height="' + height + '" fill="#ffffff"/>');
  parts.push('<line x1="' + m.l + '" y1="' + base + '" x2="' + (m.l + pw) + '" y2="' + base + '" stroke="#6b7280" stroke-width="1"/>');
  const step = notebookNiceStep(hi - lo, kind === 'ir' ? 9 : 10);
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) {
    const tx = x(v);
    parts.push('<line x1="' + notebookNum(tx) + '" y1="' + base + '" x2="' + notebookNum(tx) + '" y2="' + (base + 4) + '" stroke="#6b7280" stroke-width="1"/>');
    label(tx, base + 14, notebookNum(v), 'middle', 9, '#6b7280');
  }
  label(m.l + pw, height - 3, axisTitle, 'end', 9.5, '#6b7280');
  const ink = '#0e7490';
  if (kind === 'nmrH' || kind === 'nmrC') {
    const maxCount = Math.max(1, ...list.map((s) => s.count || 1));
    list.forEach((s) => {
      const weight = kind === 'nmrH' ? (s.count || 1) / maxCount : (s.type && !/H/.test(s.type) ? 0.45 : 0.9);
      const top = base - Math.max(4, weight * (ph - 4));
      const tx = x(s.shift);
      parts.push('<line x1="' + notebookNum(tx) + '" y1="' + base + '" x2="' + notebookNum(tx) + '" y2="' + notebookNum(top) + '" stroke="' + ink + '" stroke-width="1.6"/>');
      if (kind === 'nmrH') {
        label(tx, top - 4, (s.broad ? 'br ' : '') + (s.multiplicity || ''), 'middle', 9.5, '#111827');
      }
    });
  } else if (kind === 'ir') {
    const curve = typeof irSpectrum === 'function' ? irSpectrum(list, { from: hi, to: lo, points: 520 }) : [];
    const y = (t) => m.t + (1 - Math.max(0, Math.min(100, t)) / 100) * ph;
    if (curve.length) {
      parts.push('<polyline fill="none" stroke="' + ink + '" stroke-width="1.3" stroke-linejoin="round" points="' +
        curve.map((pt) => notebookNum(x(pt.x)) + ',' + notebookNum(y(pt.y))).join(' ') + '"/>');
    }
    const depth = { s: 3, m: 2, w: 1 };
    const placed = [];
    list.slice().sort((a, b) => (depth[b.intensity] || 0) - (depth[a.intensity] || 0))
      .forEach((band) => {
        const tx = x(band.center);
        if (placed.length >= 10 || placed.some((px) => Math.abs(px - tx) < 16)) {
          return;
        }
        placed.push(tx);
        const nearest = curve.reduce((best, pt) => (Math.abs(pt.x - band.center) < Math.abs(best.x - band.center) ? pt : best), curve[0] || { x: band.center, y: 100 });
        const ty = Math.min(base - 2, y(nearest.y) + 11);
        label(tx, ty, String(Math.round(band.center)), 'middle', 8.5, '#111827');
      });
    label(m.l, m.t - 8, '%T', 'start', 9, '#6b7280');
  } else {
    const maxIntensity = Math.max(1, ...list.map((p) => p.intensity));
    const top5 = list.slice().sort((a, b) => b.intensity - a.intensity).slice(0, 5).map((p) => p.mz);
    list.forEach((p) => {
      const top = base - (p.intensity / maxIntensity) * (ph - 4);
      const tx = x(p.mz);
      parts.push('<line x1="' + notebookNum(tx) + '" y1="' + base + '" x2="' + notebookNum(tx) + '" y2="' + notebookNum(top) + '" stroke="' + ink + '" stroke-width="2"/>');
      if (top5.includes(p.mz)) {
        label(tx, top - 4, String(p.mz), 'middle', 9.5, '#111827');
      }
    });
  }
  const title = { nmrH: '¹H NMR', nmrC: '¹³C NMR', ir: 'IR', ms: 'MS' }[kind] || kind;
  return '<svg xmlns="http://www.w3.org/2000/svg" class="nb-spectrum" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height +
    '" role="img" aria-label="' + notebookEscape('Predicted ' + title + ' spectrum') + '" font-family="Helvetica, Arial, sans-serif">' + parts.join('') + '</svg>';
}

function notebookPropertyRows(entry) {
  const p = entry.properties;
  if (!p) {
    return [];
  }
  return [
    ['Heavy atoms / H', p.heavyAtoms + ' / ' + p.hydrogens],
    ['Net charge', p.charge ? (p.charge > 0 ? '+' : '−') + Math.abs(p.charge) : '0'],
    ['Rings (aromatic)', p.rings + ' (' + p.aromaticRings + ')'],
    ['H-bond donors / acceptors', p.donors + ' / ' + p.acceptors],
    ['Rotatable bonds', String(p.rotatable)],
    ['TPSA', notebookFixed(p.tpsa, 1) + ' Å²'],
    ['logP (Crippen-style)', notebookFixed(p.logP, 2)],
    ['Lipinski rule of 5', p.lipinski.length ? p.lipinski.join(', ') : 'passes'],
    ['Veber rules', p.veber.length ? p.veber.join(', ') : 'passes'],
  ];
}

function notebookIdRows(entry) {
  return [
    ['IUPAC name', entry.iupac || '—'],
    ['Formula', entry.formula],
    ['Molecular weight', notebookFixed(entry.mw, 3) + ' g/mol'],
    ['Exact mass', notebookFixed(entry.exactMass, 4)],
    ['SMILES', entry.smiles],
  ];
}

function notebookMetaLine(meta) {
  return [meta.date, meta.appName || NOTEBOOK_APP_NAME].filter((x) => x).join(' · ');
}

function notebookBody(entries, meta, svgs) {
  const info = meta || {};
  const title = info.title || 'Lab notebook';
  let html = '<div class="notebook">';
  html += '<header class="nb-head"><h1>' + notebookEscape(title) + '</h1><div class="nb-meta">' + notebookEscape(notebookMetaLine(info)) + '</div></header>';
  if (info.notes && String(info.notes).trim()) {
    html += '<section class="nb-notes"><h3>Notes / procedure</h3><div class="nb-notes-text">' + notebookEscape(String(info.notes).trim()) + '</div></section>';
  }
  entries.forEach((entry, index) => {
    html += '<article class="nb-entry"><h2>' + (index + 1) + '. ' + notebookEscape(entry.name) + '</h2><div class="nb-top">';
    if (svgs && svgs[index]) {
      html += '<div class="nb-structure">' + svgs[index] + '</div>';
    }
    html += '<table class="nb-ids"><tbody>' + notebookIdRows(entry).map(([k, v]) => '<tr><td>' + notebookEscape(k) + '</td><td' +
      (k === 'SMILES' ? ' class="nb-mono"' : '') + '>' + (k === 'Formula' ? notebookFormulaHtml(v) : notebookEscape(v)) + '</td></tr>').join('') + '</tbody></table></div>';
    NOTEBOOK_SECTIONS.forEach((section) => {
      if (!entry.sections[section.key]) {
        return;
      }
      html += '<section class="nb-section" data-section="' + section.key + '"><h3>' + notebookEscape(section.label) + '</h3>';
      if (section.key === 'properties') {
        html += '<table><tbody>' + notebookPropertyRows(entry).map(([k, v]) => '<tr><td>' + notebookEscape(k) + '</td><td>' + notebookEscape(v) + '</td></tr>').join('') + '</tbody></table>';
      } else if (entry.errors.includes(section.key) || entry[section.key].length === 0) {
        html += '<p class="nb-missing">No prediction available for this structure.</p>';
      } else {
        html += notebookSpectrumSvg(section.key, entry[section.key]);
        if (entry.peakLists[section.key]) {
          html += '<p class="nb-peaks">' + notebookEscape(entry.peakLists[section.key]) + '</p>';
        }
      }
      html += '</section>';
    });
    html += '</article>';
  });
  html += '<p class="nb-foot">Spectra and properties are rule-based predictions from ' + notebookEscape(info.appName || NOTEBOOK_APP_NAME) + ', not measured data.</p>';
  html += '</div>';
  return html;
}

function notebookHtml(entries, meta, svgs) {
  const info = meta || {};
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<meta name="generator" content="' + notebookEscape(info.appName || NOTEBOOK_APP_NAME) + '">\n' +
    '<title>' + notebookEscape(info.title || 'Lab notebook') + '</title>\n<style>\nbody { margin: 0; background: #ffffff; }\n' + NOTEBOOK_CSS + '\n</style>\n</head>\n<body>\n' +
    notebookBody(entries, info, svgs) + '\n</body>\n</html>\n';
}

function notebookMdEscape(text) {
  return notebookEscape(text).replace(/([\\`*_[\]|#])/g, '\\$1');
}

function notebookSvgDataUri(svg) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg).replace(/\(/g, '%28').replace(/\)/g, '%29');
}

function notebookMarkdown(entries, meta, svgs) {
  const info = meta || {};
  const lines = ['# ' + notebookMdEscape(info.title || 'Lab notebook'), '', '*' + notebookMdEscape(notebookMetaLine(info)) + '*', ''];
  if (info.notes && String(info.notes).trim()) {
    lines.push('## Notes / procedure', '');
    String(info.notes).trim().split(/\r?\n/).forEach((line) => lines.push(notebookMdEscape(line) + '  '));
    lines.push('');
  }
  const table = (rows) => ['| Field | Value |', '| --- | --- |'].concat(rows.map(([k, v]) => '| ' + notebookMdEscape(k) + ' | ' + notebookMdEscape(v) + ' |'));
  entries.forEach((entry, index) => {
    lines.push('## ' + (index + 1) + '. ' + notebookMdEscape(entry.name), '');
    if (svgs && svgs[index]) {
      lines.push('![' + notebookMdEscape(entry.name) + '](' + notebookSvgDataUri(svgs[index]) + ')', '');
    }
    lines.push(...table(notebookIdRows(entry)), '');
    NOTEBOOK_SECTIONS.forEach((section) => {
      if (!entry.sections[section.key]) {
        return;
      }
      lines.push('### ' + section.label, '');
      if (section.key === 'properties') {
        lines.push(...table(notebookPropertyRows(entry)));
      } else if (entry.errors.includes(section.key) || entry[section.key].length === 0) {
        lines.push('*No prediction available for this structure.*');
      } else {
        lines.push(notebookMdEscape(entry.peakLists[section.key] || ''));
      }
      lines.push('');
    });
  });
  lines.push('*Spectra and properties are rule-based predictions from ' + notebookMdEscape(info.appName || NOTEBOOK_APP_NAME) + ', not measured data.*', '');
  return lines.join('\n');
}
