'use strict';
// Enhances the existing batch analysis without modifying chemistry computation.
(function () {
  const panel = document.getElementById('comparison-panel');
  const choices = document.getElementById('comparison-choices');
  const baseline = document.getElementById('comparison-baseline');
  const onlyChanges = document.getElementById('comparison-differences');
  const status = document.getElementById('comparison-status');
  const table = document.getElementById('comparison-table');
  const exportButton = document.getElementById('comparison-export');
  if (!panel || !window.MoleculeComparison) return;
  let selected = [];
  let referenceIndex = 0;
  const maxColumns = 4;

  function getRecords() {
    // records is the existing top-level lexical binding in app.js.
    return typeof records !== 'undefined' && Array.isArray(records) ? records : [];
  }
  function escapeText(value) {
    return String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);
  }
  function paintTable() {
    const list = getRecords();
    const active = selected.filter(index => index >= 0 && index < list.length);
    if (!active.includes(referenceIndex)) referenceIndex = active[0];
    baseline.replaceChildren();
    active.forEach(index => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = list[index].name;
      baseline.appendChild(option);
    });
    baseline.value = String(referenceIndex);
    baseline.disabled = active.length < 2;
    exportButton.disabled = active.length < 2;
    status.textContent = active.length < 2
      ? 'Choose at least two molecules to compare. You can select up to four.'
      : active.length + ' molecules selected. Differences use the first/reference column as their baseline.';
    if (active.length < 2) {
      table.querySelector('thead').replaceChildren();
      table.querySelector('tbody').replaceChildren();
      return;
    }
    const rows = MoleculeComparison.comparisonRows(list, active, referenceIndex, onlyChanges.checked);
    const columnNames = ['Property', ...active.map(index => list[index].name)];
    table.querySelector('thead').innerHTML = '<tr>' + columnNames.map((name, i) => '<th scope="col">' + escapeText(name)
      + (i > 0 && active[i - 1] === referenceIndex ? '<span class="compare-reference">reference</span>' : '') + '</th>').join('') + '</tr>';
    table.querySelector('tbody').innerHTML = rows.map(row => '<tr><th scope="row">' + escapeText(row.field.label)
      + (row.field.unit ? '<small> ' + escapeText(row.field.unit) + '</small>' : '') + '</th>'
      + row.cells.map(cell => '<td><span class="compare-value">' + escapeText(MoleculeComparison.display(cell.value, row.field.digits))
        + '</span>' + (cell.delta !== null && !cell.isReference && row.different
          ? '<small class="compare-delta">Δ ' + (cell.delta > 0 ? '+' : '') + cell.delta.toFixed(row.field.digits) + ' vs ref.</small>'
          : '') + '</td>').join('') + '</tr>').join('');
    if (!rows.length) status.textContent = 'No differences found among the selected fields.';
  }
  function paintChoices() {
    const list = getRecords();
    choices.replaceChildren();
    list.forEach((record, index) => {
      const label = document.createElement('label');
      label.className = 'compare-choice';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.value = String(index);
      box.checked = selected.includes(index);
      box.disabled = !box.checked && selected.length >= maxColumns;
      const name = document.createElement('span');
      name.textContent = record.name;
      label.append(box, name);
      choices.appendChild(label);
    });
    paintTable();
  }
  function refresh() {
    const list = getRecords();
    selected = selected.filter(index => index < list.length);
    if (selected.length < 2 && list.length > 1) selected = [0, 1];
    if (list.length < 2) selected = [];
    if (!selected.includes(referenceIndex)) referenceIndex = selected[0] || 0;
    paintChoices();
  }
  choices.addEventListener('change', event => {
    if (!event.target.matches('input[type="checkbox"]')) return;
    const index = Number(event.target.value);
    if (event.target.checked && !selected.includes(index) && selected.length < maxColumns) selected.push(index);
    if (!event.target.checked) selected = selected.filter(value => value !== index);
    paintChoices();
  });
  baseline.addEventListener('change', () => {
    referenceIndex = Number(baseline.value);
    paintTable();
  });
  onlyChanges.addEventListener('change', paintTable);
  exportButton.addEventListener('click', () => {
    const csv = MoleculeComparison.comparisonCsv(getRecords(), selected, referenceIndex, onlyChanges.checked);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = 'molecule-comparison.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Release the temporary URL after the click has been dispatched.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  document.addEventListener('molecule-profiler:updated', refresh);
  refresh();
})();
