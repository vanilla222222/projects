'use strict';
// Pure presentation data for side-by-side descriptor comparisons. Never infers
// toxicity, pharmacological effectiveness, or compound suitability.
(function (root) {
  const FIELDS = Object.freeze([
    { key: 'formula', label: 'Molecular formula', unit: '', group: 'Identity' },
    { key: 'mw', label: 'Molecular weight', unit: 'g/mol', digits: 2, group: 'Physical properties' },
    { key: 'exactMass', label: 'Monoisotopic mass', unit: 'Da', digits: 4, group: 'Physical properties' },
    { key: 'tpsa', label: 'Topological polar surface area', unit: 'Å²', digits: 2, group: 'Physical properties' },
    { key: 'logp', label: 'WLOGP (estimated)', unit: '', digits: 2, group: 'Estimated properties' },
    { key: 'logS', label: 'Aqueous log S (estimated)', unit: '', digits: 2, group: 'Estimated properties' },
    { key: 'mr', label: 'Molar refractivity (estimated)', unit: '', digits: 2, group: 'Estimated properties' },
    { key: 'hbd', label: 'Hydrogen-bond donors', unit: '', digits: 0, group: 'Structure counts' },
    { key: 'hba', label: 'Hydrogen-bond acceptors', unit: '', digits: 0, group: 'Structure counts' },
    { key: 'rotatableBonds', label: 'Rotatable bonds', unit: '', digits: 0, group: 'Structure counts' },
    { key: 'rings', label: 'Rings', unit: '', digits: 0, group: 'Structure counts' },
    { key: 'aromaticRings', label: 'Aromatic rings', unit: '', digits: 0, group: 'Structure counts' },
    { key: 'fractionCsp3', label: 'Fraction sp³ carbon', unit: '', digits: 3, group: 'Structure counts' },
    { key: 'charge', label: 'Formal charge', unit: '', digits: 0, group: 'Structure counts' }
  ]);
  function valuesFor(record) {
    const d = record && record.d || {};
    const v = record && record.v || {};
    return Object.assign({}, d, { logS: v.logS, formula: d.formula });
  }
  function comparisonRows(records, indices, baselineIndex, differencesOnly) {
    const columns = indices.map(index => ({ index, name: records[index].name, values: valuesFor(records[index]) }));
    const base = columns.find(column => column.index === baselineIndex) || columns[0];
    if (!base) return [];
    return FIELDS.map(field => {
      const reference = base.values[field.key];
      const cells = columns.map(column => {
        const value = column.values[field.key];
        const numeric = Number.isFinite(value) && Number.isFinite(reference);
        return {
          index: column.index, value,
          delta: field.digits !== undefined && numeric ? value - reference : null,
          isReference: column.index === base.index
        };
      });
      const valid = cells.map(cell => cell.value).filter(value => value !== undefined && value !== null && !(typeof value === 'number' && !Number.isFinite(value)));
      const different = valid.length > 1 && valid.some(value => value !== valid[0]);
      return { field, cells, different };
    }).filter(row => !differencesOnly || row.different);
  }
  function display(value, digits) {
    if (typeof value === 'number') return Number.isFinite(value) ? value.toFixed(digits === undefined ? 2 : digits) : 'Unavailable';
    return value === undefined || value === null || value === '' ? 'Unavailable' : String(value);
  }
  function csvEscape(value) {
    let v = String(value === undefined || value === null ? '' : value);
    // Avoid formula interpretation when imported into spreadsheet software.
    if (/^[\s]*[=+@\-]/.test(v) && !/^-[0-9]+(?:\.[0-9]+)?$/.test(v.trim())) v = "'" + v;
    return '"' + v.replace(/"/g, '""') + '"';
  }
  function comparisonCsv(records, indices, baselineIndex, differencesOnly) {
    const columns = indices.map(index => records[index]);
    const rows = comparisonRows(records, indices, baselineIndex, differencesOnly);
    const head = ['Property', 'Unit', ...columns.map(record => record.name), ...columns.filter((_, i) => indices[i] !== baselineIndex).map(record => 'Δ ' + record.name + ' vs reference')];
    const lines = [head.map(csvEscape).join(',')];
    for (const row of rows) {
      const vals = row.cells.map(cell => display(cell.value, row.field.digits));
      const deltas = row.cells.filter(cell => !cell.isReference).map(cell => cell.delta === null ? '' : cell.delta.toFixed(row.field.digits));
      lines.push([row.field.label, row.field.unit, ...vals, ...deltas].map(csvEscape).join(','));
    }
    return lines.join('\r\n') + '\r\n';
  }
  const api = { FIELDS, comparisonRows, display, comparisonCsv };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MoleculeComparison = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
