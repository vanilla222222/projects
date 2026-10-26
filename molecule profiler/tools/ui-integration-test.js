'use strict';
// Static browser integration contract: catches missing script imports, bad ordering,
// duplicate DOM IDs, and missing evidence/coverage hosts. No browser simulation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/g)].map(x => x[1].split('?')[0]);
assert.ok(scripts.length > 0, 'No external scripts found');
assert.equal(new Set(scripts).size, scripts.length, 'Duplicate external script imports');
for (const script of scripts) {
  assert.ok(!script.startsWith('/') && !script.includes('..'), 'Unexpected script path: ' + script);
  assert.ok(fs.existsSync(path.join(root, script)), 'Missing script file: ' + script);
}
const order = ['js/descriptors.js', 'js/evidence-report.js', 'js/screen-coverage.js', 'js/app.js'];
for (let i = 1; i < order.length; i += 1) {
  assert.ok(scripts.indexOf(order[i - 1]) >= 0 && scripts.indexOf(order[i]) > scripts.indexOf(order[i - 1]),
    'Script dependency order incorrect: ' + order[i]);
}
const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(x => x[1]);
assert.equal(new Set(ids).size, ids.length, 'Duplicate HTML IDs');
for (const id of ['evidence-descriptors', 'evidence-warnings', 'tox-coverage', 'met-coverage']) {
  assert.ok(ids.includes(id), 'Missing UI element: ' + id);
}
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
assert.match(app, /propertyEvidenceRows\(\{\s*\.\.\.d,\s*logS:\s*v\s*&&\s*v\.logS\s*\}\s*,/,
  'Evidence table must read calculated logS from record.v');
const metabolismRenderer = app.slice(app.indexOf('function renderMetabolism(record) {'));
assert.match(metabolismRenderer, /const coverageSlot = document\.getElementById\('met-coverage'\);\s*if \(coverageSlot\) coverageSlot\.textContent = '';/,
  'Metabolism coverage must clear stale output before early errors');
for (const fn of ['toxicityCoverageReport', 'metabolismCoverageReport']) {
  assert.ok(app.includes(fn + '('), 'Coverage report is not wired: ' + fn);
}
const styles = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/g)].map(x => x[1].split('?')[0]);
assert.ok(styles.includes('css/workspace.css'), 'Workspace stylesheet not loaded');
assert.ok(scripts.indexOf('js/workspace-ui.js') > scripts.indexOf('js/app.js'), 'Workspace UI must load after analysis engine');
for (const id of ['workspace-nav', 'module-search', 'workspace-description']) {
  assert.ok(ids.includes(id), 'Missing workspace control: ' + id);
}
const workspace = fs.readFileSync(path.join(root, 'js/workspace-ui.js'), 'utf8');
const headings = [...html.matchAll(/<article class=["']panel[^"']*["'][\s\S]*?<h2>([^<]+)<\/h2>/g)]
  .map(x => x[1].replace(/&amp;/g, '&').trim());
for (const title of headings) {
  assert.ok(workspace.includes("'" + title + "':"), 'Workspace view map missing module: ' + title);
}
for (const group of ['overview', 'properties', 'screening', 'metabolism', 'discovery', 'data', 'all']) {
  assert.ok(workspace.includes("id: '" + group + "'"), 'Missing workspace navigation view: ' + group);
}
assert.ok(workspace.includes('search.addEventListener'), 'Section search is not interactive');
assert.ok(workspace.includes('event.key === \'/\''), 'Keyboard section search shortcut missing');
for (const id of ['comparison-panel', 'comparison-choices', 'comparison-baseline', 'comparison-differences', 'comparison-table', 'comparison-export']) {
  assert.ok(ids.includes(id), 'Missing comparison control: ' + id);
}
assert.ok(scripts.indexOf('js/comparison-data.js') > -1, 'Comparison data script missing');
assert.ok(scripts.indexOf('js/comparison-ui.js') > scripts.indexOf('js/workspace-ui.js'), 'Comparison UI script order incorrect');
assert.ok(workspace.includes("id: 'compare'"), 'Compare workspace navigation missing');
assert.ok(app.includes("molecule-profiler:updated"), 'Comparison updates not wired to batch analysis');
const cacheVersions = [...html.matchAll(/(?:src|href)="(?:data|js|css)\/[^"]+\?v=([^"]+)"/g)].map(x=>x[1]);
assert.ok(cacheVersions.length > 20 && new Set(cacheVersions).size === 1, 'Static assets must share one cache version');
assert.ok(!html.includes('<h2>Physical addiction potential</h2>'), 'Misleading dependence heading reintroduced');
assert.ok(workspace.includes("'Dependence-related structural similarity': ['discovery']"),
  'Dependence analogy must be grouped with reference comparisons, not toxicity screening');
const inspector = fs.readFileSync(path.join(root, 'library-inspector.html'), 'utf8');
assert.ok(html.includes('href="library-inspector.html"'), 'Reference catalogue not linked from main app');
assert.match(html, /<option value="0">All parsed entries<\/option>/, 'Similarity all-results option is still capped');
assert.ok(!html.includes('<option value="596">all</option>'), 'Stale similarity result limit still present');
assert.ok(app.includes('SimPagination.paginateRanked(hits, limit, simPage, 50)'), 'All-results option must paginate the entire ranked pool');
assert.ok(inspector.includes('js/library-catalog.js'), 'Library catalogue data script missing');
assert.ok(inspector.includes('js/library-inspector.js'), 'Library catalogue UI script missing');
assert.ok(fs.existsSync(path.join(root, 'js/library-catalog.js')), 'Library catalogue code missing');
assert.ok(fs.existsSync(path.join(root, 'js/library-inspector.js')), 'Library catalogue UI missing');
assert.ok(html.includes('id="sim-include-property-only"'), 'Reference filter missing');
assert.ok(app.includes('rankedPool = includeProperty'), 'Filtered similarity pool missing');
assert.ok(workspace.includes('details.open = false'), 'Detailed methods should use progressive disclosure');
assert.ok(app.includes('entry.propertyOnly === true'), 'Similarity filtering must use explicit dataset-role flags');
assert.ok(html.includes('earlier set of 596 compounds'), 'Historical validation cohort not disclosed');
assert.ok(scripts.indexOf('js/sim-pagination.js') < scripts.indexOf('js/app.js') && scripts.includes('js/sim-pagination.js'),
  'Similarity pagination must load before the main application');
for (const id of ['sim-prev','sim-next','sim-page','sim-pagination']) assert.ok(ids.includes(id), 'Missing pagination control: ' + id);
assert.ok(app.includes('SimPagination.paginateRanked'), 'Pagination engine not wired');
assert.ok(scripts.indexOf('js/batch-browser.js') < scripts.indexOf('js/app.js') && scripts.includes('js/batch-browser.js'), 'Batch browser script must load before app');
for (const id of ['batch-search','batch-sort','batch-order','batch-count','batch-prev','batch-next','batch-page']) assert.ok(ids.includes(id),'Missing batch browser control: '+id);
assert.ok(app.includes('BatchBrowser.browseBatch'), 'Batch browsing not wired into analysis');
assert.ok(scripts.indexOf('js/input-workflow.js') < scripts.indexOf('js/app.js'), 'Input workflow helper must load before application');
for(const id of ['molecule-file','input-feedback','input-summary','input-errors','export-snapshot'])assert.ok(ids.includes(id),'Missing input workflow control: '+id);
assert.ok(app.includes('InputWorkflow.parseInputText'), 'Structured input parser not connected');
assert.ok(app.includes('InputWorkflow.createSnapshot'), 'Snapshot exporter not connected');
assert.ok(scripts.indexOf('js/report-model.js') > -1,'Summary model not included');
assert.ok(scripts.indexOf('js/report-ui.js') > scripts.indexOf('js/app.js'),'Summary UI should load after analysis app');
for(const id of ['molecule-report','report-title','report-metrics','report-validation','report-cautions','report-print']) assert.ok(ids.includes(id),'Missing report element: '+id);
assert.ok(app.includes("molecule-profiler:selected"),'Selected-molecule reporting update missing');
assert.ok(scripts.indexOf('js/full-csv-export.js') > -1 && scripts.indexOf('js/full-csv-export.js') < scripts.indexOf('js/app.js'),
  'Full CSV schema must load before app');
assert.ok(ids.includes('export-full-dictionary'),'Full CSV dictionary button missing');
assert.ok(app.includes('exported=await fullExportRows(record)')&&app.includes('FullCsvExport.createCsv(record,exported)'),'Full CSV export schema not wired');
assert.ok(app.includes('FullCsvExport.topRanked(similarityRanked)'), 'Full CSV similarity ranking limit missing');
assert.ok(app.includes('FullCsvExport.topRanked(ranked)'), 'Full CSV target ranking limit missing');
assert.ok(ids.includes('export-research'),'Research package button missing');
assert.ok(scripts.includes('js/research-package.js')&&scripts.includes('js/research-zip.js'),'Research ZIP scripts missing');
assert.ok(app.includes('ResearchPackage.createPackage(records'),'Research package not wired');
assert.ok(ids.includes('distribution-metric') && ids.includes('distribution-plot'),'Descriptor statistics UI missing');
assert.ok(scripts.indexOf('js/descriptor-stats-ui.js') > scripts.indexOf('js/descriptor-stats.js'),'Chart scripts out of order');
assert.ok(ids.includes('quality-summary') && ids.includes('quality-issues') && ids.includes('quality-status'), 'Quality panel missing');
assert.ok(scripts.indexOf('js/molecule-quality.js') < scripts.indexOf('js/app.js'),'Quality evaluator must load before app');
assert.ok(app.includes('MoleculeQuality.evaluate(record)'),'Quality panel is not connected');
assert.ok(app.includes('preparedBatchRows = nextPrepared;'), 'Completed analysis must publish cached batch rows');
assert.ok(scripts.indexOf('js/cooperative-batch.js') < scripts.indexOf('js/app.js'), 'Cooperative scheduler must load before application');
for (const id of ['cancel-analysis', 'analysis-progress']) assert.ok(ids.includes(id), 'Missing batch progress control: ' + id);
assert.ok(app.includes('BatchBrowser.browseBatch(preparedBatchRows'), 'Batch browsing must reuse cached rows');
assert.ok(app.includes("button.setAttribute('aria-selected', String(selected))"), 'Tab selected-state sync missing');
console.log('UI integration contract passed: ' + scripts.length + ' scripts, ' + ids.length + ' unique DOM IDs');
assert.ok(app.includes('const DEP_GATE = 0.45;'), 'Dependence gate threshold missing');
assert.ok(app.includes('const gated = profile.top < DEP_GATE;'), 'Dependence gate is not computed from the threshold');
assert.ok(app.includes('ranking.open = !gated;'), 'Ranked dependence tables are not withheld below the gate');
assert.ok(app.includes("cards.innerHTML = gated ?"), 'Reward-circuit card is not suppressed below the gate');
for (const id of ['dep-gate-note', 'dep-ranking', 'dep-ranking-summary']) {
  assert.ok(ids.includes(id), 'Missing dependence gate element: ' + id);
}
assert.ok(app.includes("pair('dependence', 'gate'"), 'CSV export does not record the dependence gate state');
const inspectorSheet=inspector.match(/css\/library-inspector\.css\?v=([^"]+)"/);
assert.ok(inspectorSheet,'Inspector must load its dedicated responsive stylesheet');
assert.ok(fs.existsSync(path.join(root,'css/library-inspector.css')),'Inspector stylesheet is missing');

assert.ok(scripts.indexOf('js/candidate-info.js') > scripts.indexOf('js/metabolism.js') && scripts.indexOf('js/candidate-info.js') < scripts.indexOf('js/pharmacology-upgrade.js'), 'Candidate summaries must load after metabolism and before Quick UI');
assert.ok(scripts.indexOf('js/prodrug-explorer.js') > scripts.indexOf('js/cleavable-groups.js'), 'Explorer must load after pathway engine');
assert.ok(scripts.indexOf('js/prodrug-explorer-ui.js') > scripts.indexOf('js/prodrug-site-evidence.js'), 'Explorer UI must load after site controls');

assert.ok(scripts.indexOf('js/prodrug-priority.js') > scripts.indexOf('js/prodrug-explorer.js') && scripts.indexOf('js/prodrug-priority.js') < scripts.indexOf('js/prodrug-explorer-ui.js'), 'Research priority must load between explorer engine and UI');

assert.ok(scripts.indexOf('js/layout-ui.js') > scripts.indexOf('js/prodrug-explorer-ui.js'), 'Layout controller must load after the design controls');

assert.ok(scripts.indexOf('data/library-receptor-tags.js') < scripts.indexOf('js/library-catalog.js'),'Receptor metadata must precede catalogue queries');
assert.ok(inspector.includes('data/library-receptor-tags.js'),'Reference explorer must load receptor evidence');

assert.ok(scripts.indexOf('js/analogue-edit-extensions.js') > scripts.indexOf('js/mol.js') && scripts.indexOf('js/analogue-edit-extensions.js') < scripts.indexOf('js/analogue-candidates.js'),'Generic edit extensions must load before the analogue generator');
