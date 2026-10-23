const ROUTE_WORKSPACE_LIMITS = { routes: 30, steps: 20, importBytes: 1000000 };
const ROUTE_WORKSPACE_STORAGE = 'chemgraph.route-workspace.v1';

function routeWorkspaceKey(smiles) {
  if (typeof moleculeIdentity === 'function') return moleculeIdentity(smiles).key;
  const graph = reactionFragmentGraph(smilesToFragment(smiles));
  const props = reactionGraphProperties(graph);
  return props.isomericSmiles || props.smiles;
}

function routeWorkspaceSmiles(value) {
  if (typeof value !== 'string' || value.length > 5000 || !value.trim()) throw new Error('Every structure needs a valid name or SMILES.');
  const parsed = reactionParseCompound(value.trim());
  return reactionIsomericSmiles(parsed.fragment, parsed.smiles);
}

function routeWorkspaceNormalize(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.steps) || raw.steps.length > ROUTE_WORKSPACE_LIMITS.steps) throw new Error('A route must contain at most ' + ROUTE_WORKSPACE_LIMITS.steps + ' steps.');
  if (raw.version !== undefined && raw.version !== 1) throw new Error('Unsupported route version.');
  const roles = ['reactant', 'reagent', 'catalyst', 'solvent'];
  const steps = raw.steps.map((link, index) => {
    if (!link || typeof link !== 'object') throw new Error('Invalid route step ' + (index + 1) + '.');
    const source = link.candidate || link;
    const compounds = source.compounds;
    if (!Array.isArray(compounds) || !compounds.length || compounds.length > REACTION_LIMITS.maxCompounds) throw new Error('Step ' + (index + 1) + ' needs 1–' + REACTION_LIMITS.maxCompounds + ' compounds.');
    return {
      from: routeWorkspaceSmiles(link.from),
      to: routeWorkspaceSmiles(link.to),
      name: String(source.outcomeName || source.name || 'Reaction step').slice(0, 120),
      ruleId: String(source.outcomeId || source.ruleId || source.id || '').slice(0, 100),
      planning: source.planning && ['protect', 'reaction', 'deprotect'].includes(source.planning.kind) ? { kind: source.planning.kind, group: String(source.planning.group || '').slice(0, 80), groupId: String(source.planning.groupId || '').slice(0, 80), reason: String(source.planning.reason || '').slice(0, 800) } : null,
      compounds: compounds.map((c) => {
        if (!c || !roles.includes(c.role)) throw new Error('Step ' + (index + 1) + ' has an invalid compound role.');
        return { smiles: routeWorkspaceSmiles(c.isomericSmiles || c.smiles), role: c.role, label: String(c.label || '').slice(0, 80) };
      }),
      conditions: normalizeReactionConditions(source.conditions || {}),
    };
  });
  return {
    version: 1,
    id: String(raw.id || 'route-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)).slice(0, 100),
    name: String(raw.name || 'Untitled route').slice(0, 120),
    start: routeWorkspaceSmiles(raw.start || (steps[0] && steps[0].from)),
    target: routeWorkspaceSmiles(raw.target || (steps.length && steps[steps.length - 1].to)),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt.slice(0, 40) : new Date().toISOString(),
    steps,
  };
}

function routeWorkspaceValidateStep(step) {
  try {
    const from = routeWorkspaceKey(step.from);
    const target = routeWorkspaceKey(step.to);
    const compounds = step.compounds.map((c) => Object.assign({}, c, { fragment: smilesToFragment(c.smiles) }));
    if (!compounds.some((c) => c.role === 'reactant' && routeWorkspaceKey(c.smiles) === from)) return { status: 'invalid', message: 'The starting intermediate is missing from this step’s reactants.' };
    const prediction = predictReaction(compounds, normalizeReactionConditions(step.conditions));
    const outcomes = [prediction.best].concat(prediction.alternatives || []).filter(Boolean);
    const outcome = outcomes.find((o) => (!step.ruleId || o.id === step.ruleId) && (o.products || []).concat(o.minor || []).some((p) => {
      try { return routeWorkspaceKey(p.isomericSmiles || p.smiles) === target; } catch (error) { return false; }
    }));
    if (outcome && outcome.partialConversion) return {status:'unverified',message:'This is a one-site partial-conversion alternative; selective preparation is not established by the current rules.',ruleId:outcome.id,outcome};
    return outcome ? { status: 'verified', message: 'Target reproduced by ' + outcome.name + ' in the current rule model.', ruleId: outcome.id, outcome }
      : { status: 'unverified', message: 'The current rules did not reproduce the selected target with these inputs and conditions.' };
  } catch (error) { return { status: 'invalid', message: error.message }; }
}

function routeWorkspaceValidate(route) {
  const steps = route.steps.map(routeWorkspaceValidateStep);
  const issues = [];
  const same = (a, b) => { try { return routeWorkspaceKey(a) === routeWorkspaceKey(b); } catch (error) { return false; } };
  if (!route.steps.length) {
    if (!same(route.start, route.target)) issues.push('The route has no steps between its different endpoints.');
  } else {
    if (!same(route.start, route.steps[0].from)) issues.push('The first step does not begin at the route’s starting material.');
    route.steps.slice(1).forEach((step, i) => { if (!same(route.steps[i].to, step.from)) issues.push('Steps ' + (i + 1) + ' and ' + (i + 2) + ' are disconnected.'); });
    if (!same(route.target, route.steps[route.steps.length - 1].to)) issues.push('The last step does not reach the route’s target.');
  }
  return { status: issues.length || steps.some((s) => s.status === 'invalid') ? 'invalid' : steps.some((s) => s.status !== 'verified') ? 'unverified' : 'verified', issues, steps };
}

function routeWorkspaceCsvEscape(value) {
  let text = String(value === null || value === undefined ? '' : value);
  if (/^[\s]*[=+@-]/.test(text) && !/^\s*-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\s*$/.test(text)) text = "'" + text;
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function routeWorkspaceCsv(route) {
  const report = routeWorkspaceValidate(route);
  const rows = [['Route', route.name], ['Starting material', route.start], ['Target', route.target], ['Route status', report.status], ['Continuity issues', report.issues.join('; ')], [], ['Step', 'Reaction', 'Rule', 'From SMILES', 'Target SMILES', 'Compounds (role: SMILES)', 'Temperature (°C)', 'Solvents', 'Additives', 'Atmosphere', 'Energy', 'Pressure (atm)', 'Reflux', 'Time', 'Concentration', 'Notes', 'Verification', 'Explanation', 'Step role', 'Protecting group', 'Planning rationale', 'Group preservation', 'Group preservation notes']];
  route.steps.forEach((s, i) => rows.push([i + 1, s.name, s.ruleId, s.from, s.to, s.compounds.map((c) => c.role + ': ' + c.smiles).join('\n'), s.conditions.temperature, s.conditions.solvents.join('; '), s.conditions.additives.join('; '), s.conditions.atmosphere, s.conditions.energy, s.conditions.pressure, s.conditions.reflux, s.conditions.time, s.conditions.concentration, s.conditions.notes, report.steps[i].status, report.steps[i].message, s.planning ? s.planning.kind : '', s.planning ? s.planning.group : '', s.planning ? s.planning.reason : '', report.steps[i].outcome && report.steps[i].outcome.protectionAssessment ? report.steps[i].outcome.protectionAssessment.status : '', report.steps[i].outcome && report.steps[i].outcome.protectionAssessment ? report.steps[i].outcome.protectionAssessment.sites.map(site => (site.label || site.id) + ': ' + site.status + '. ' + (site.reasons || []).join(' ')).join('\n') : '']));
  return rows.map((row) => row.map(routeWorkspaceCsvEscape).join(',')).join('\r\n');
}

function routeWorkspaceImport(text) {
  if (typeof text !== 'string' || text.length > ROUTE_WORKSPACE_LIMITS.importBytes) throw new Error('Route JSON must be smaller than 1 MB.');
  const raw = JSON.parse(text);
  const routes = raw && raw.format === 'chem-lab-route-workspace' ? raw.routes : [raw];
  if (raw && raw.format === 'chem-lab-route-workspace' && raw.version !== 1) throw new Error('Unsupported workspace version.');
  if (!Array.isArray(routes) || routes.length > ROUTE_WORKSPACE_LIMITS.routes) throw new Error('Import contains too many routes.');
  return routes.map(routeWorkspaceNormalize);
}

function createRouteWorkspace(deps) {
  const root = deps.container;
  const element = (tag, text, cls) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; return el; };
  const button = (label, fn) => { const b = element('button', label, 'text-button'); b.type = 'button'; b.addEventListener('click', fn); return b; };
  const storage = deps.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  let routes = [];
  let selected = '';
  let loadError = '';
  try { const saved = storage && storage.getItem(ROUTE_WORKSPACE_STORAGE); if (saved) routes = routeWorkspaceImport(saved); } catch (error) { loadError = 'Saved routes could not be loaded: ' + error.message; }
  const heading = element('div', undefined, 'workspace-heading');
  heading.append(element('h2', 'Route workspace'), element('p', 'Save and edit candidate routes, inspect intermediates, and recheck every step against the current reaction rules.'));
  const controls = element('div', undefined, 'workspace-controls');
  const picker = element('select'); picker.setAttribute('aria-label', 'Saved route');
  const message = element('p', loadError || 'Save a route from Path Finder, or import a route JSON file.', 'workspace-message'); message.setAttribute('role', 'status'); message.setAttribute('aria-live', 'polite');
  const content = element('div', undefined, 'workspace-content');
  const file = element('input'); file.type = 'file'; file.accept = '.json,application/json'; file.hidden = true;
  const current = () => routes.find((r) => r.id === selected) || null;
  const persist = () => {
    try { if (storage) storage.setItem(ROUTE_WORKSPACE_STORAGE, JSON.stringify({ format: 'chem-lab-route-workspace', version: 1, routes })); return true; }
    catch (error) { message.textContent = 'Your edits remain in this session, but could not be saved: ' + error.message; return false; }
  };
  const download = (name, type, text) => {
    if (deps.download) return deps.download(name, type, text);
    const url = URL.createObjectURL(new Blob([text], { type }));
    const anchor = element('a'); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const labelInput = (text, value, type) => { const wrap = element('label', text); const input = element(type === 'textarea' ? 'textarea' : 'input'); if (type !== 'textarea') input.type = type || 'text'; input.value = value; wrap.append(input); return { wrap, input }; };
  const simpleName = (smiles) => { try { return retroViewName(smiles); } catch (error) { return smiles; } };
  const redraw = () => {
    picker.replaceChildren();
    routes.forEach((r) => { const option = element('option', r.name); option.value = r.id; picker.append(option); });
    picker.value = selected;
    picker.disabled = !routes.length;
    content.replaceChildren();
    const route = current();
    if (!route) { content.append(element('p', 'No route selected. Path Finder has a Save route button for each candidate route.')); return; }
    const report = routeWorkspaceValidate(route);
    const meta = element('div', undefined, 'workspace-meta');
    const name = labelInput('Route name', route.name);
    name.input.addEventListener('change', () => { route.name = name.input.value.trim().slice(0, 120) || 'Untitled route'; persist(); redraw(); });
    const start = labelInput('Starting material (name or SMILES)', route.start);
    const target = labelInput('Target (name or SMILES)', route.target);
    meta.append(name.wrap, start.wrap, target.wrap, button('Update endpoints', () => {
      try { const a = routeWorkspaceSmiles(start.input.value), b = routeWorkspaceSmiles(target.input.value); route.start = a; route.target = b; if (persist()) message.textContent = 'Endpoints updated. Continuity was rechecked.'; redraw(); } catch (error) { message.textContent = error.message; }
    }));
    content.append(meta, element('p', simpleName(route.start) + ' → ' + simpleName(route.target), 'workspace-equation'), element('p', 'Route status: ' + report.status + '. ' + (report.issues.join(' ') || 'Intermediates connect in the current order.'), 'workspace-status ' + report.status));
    route.steps.forEach((step, index) => {
      const card = element('article', undefined, 'workspace-step');
      card.append(element('h3', (index + 1) + '. ' + step.name), element('p', report.steps[index].status + ': ' + report.steps[index].message, 'workspace-status ' + report.steps[index].status));
      if (step.planning) card.append(element('p', (step.planning.kind === 'protect' ? 'Install protecting group' : step.planning.kind === 'deprotect' ? 'Remove protecting group' : 'Protected reaction') + (step.planning.group ? ' · ' + step.planning.group : '') + ': ' + step.planning.reason, 'workspace-planning'));
      const verifiedOutcome = report.steps[index].outcome;
      if (verifiedOutcome && verifiedOutcome.protectionAssessment && typeof protectionAssessmentElement === 'function') card.append(protectionAssessmentElement(verifiedOutcome.protectionAssessment));
      if (typeof reactionEvidenceElement === 'function' && verifiedOutcome && verifiedOutcome.evidence) card.append(reactionEvidenceElement(verifiedOutcome.evidence, true));
      const structures = element('div', undefined, 'workspace-structures');
      [step.from, step.to].forEach((smiles, i) => {
        if (i) structures.append(element('span', '→'));
        const block = element('div');
        if (deps.thumbnail) { try { block.append(deps.thumbnail(retroFromSmiles(smiles))); } catch (error) { block.append(element('span', 'Structure preview unavailable')); } }
        block.append(element('p', simpleName(smiles)), element('code', smiles)); structures.append(block);
      });
      card.append(structures);
      const actions = element('div', undefined, 'workspace-actions');
      const up = button('Move up', () => { [route.steps[index - 1], route.steps[index]] = [route.steps[index], route.steps[index - 1]]; persist(); redraw(); }); up.disabled = index === 0;
      const down = button('Move down', () => { [route.steps[index + 1], route.steps[index]] = [route.steps[index], route.steps[index + 1]]; persist(); redraw(); }); down.disabled = index === route.steps.length - 1;
      actions.append(up, down, button('Delete step', () => { route.steps.splice(index, 1); persist(); redraw(); }), button('Open in Reactions', () => { if (deps.openInLab) deps.openInLab(step.compounds, step.conditions); }));
      card.append(actions);
      const editor = element('details'); editor.append(element('summary', 'Edit inputs and conditions'));
      const fields = element('div', undefined, 'workspace-fields');
      const from = labelInput('Starting intermediate (name or SMILES)', step.from);
      const to = labelInput('Target intermediate (name or SMILES)', step.to);
      const compounds = labelInput('Compounds: one role | name or SMILES per line', step.compounds.map((c) => c.role + ' | ' + c.smiles).join('\n'), 'textarea');
      const temperature = labelInput('Temperature (°C)', step.conditions.temperature, 'number');
      const solvents = labelInput('Solvents (IDs separated by commas, e.g. water, ethanol)', step.conditions.solvents.join(', '));
      const additives = labelInput('Additives (IDs separated by commas, e.g. h2so4)', step.conditions.additives.join(', '));
      const notes = labelInput('Notes', step.conditions.notes || '', 'textarea');
      fields.append(from.wrap, to.wrap, compounds.wrap, temperature.wrap, solvents.wrap, additives.wrap, notes.wrap);
      editor.append(fields, button('Apply edits and recheck', () => {
        try {
          const next = Object.assign({}, step, { from: routeWorkspaceSmiles(from.input.value), to: routeWorkspaceSmiles(to.input.value), ruleId: '', compounds: compounds.input.value.split(/\r?\n/).filter((line) => line.trim()).map((line) => {
            const split = line.indexOf('|'); if (split < 0) throw new Error('Use role | name or SMILES for each compound.');
            return { role: line.slice(0, split).trim(), smiles: line.slice(split + 1).trim() };
          }), conditions: Object.assign({}, step.conditions, { temperature: Number(temperature.input.value), solvents: solvents.input.value.split(',').map((s) => s.trim()).filter(Boolean), additives: additives.input.value.split(',').map((s) => s.trim()).filter(Boolean), notes: notes.input.value }) });
          route.steps[index] = routeWorkspaceNormalize(Object.assign({}, route, { steps: [next] })).steps[0];
          const result = routeWorkspaceValidateStep(route.steps[index]);
          if (result.status === 'verified') { route.steps[index].name = result.outcome.name; route.steps[index].ruleId = result.ruleId; }
          if (persist()) message.textContent = 'Edits saved; step is ' + result.status + '.';
          redraw();
        } catch (error) { message.textContent = error.message; }
      }));
      card.append(editor); content.append(card);
    });
    content.append(element('p', 'Verified means reproduced by the supported rule model. Experimental feasibility and yield are not established.', 'workspace-caveat'));
  };
  picker.addEventListener('change', () => { selected = picker.value; redraw(); });
  controls.append(picker, button('Recheck route', () => { redraw(); message.textContent = 'Route rechecked against the current rules.'; }), button('Export JSON', () => { const route = current(); if (route) download('chem-lab-route.json', 'application/json', JSON.stringify(route, null, 2)); }), button('Export CSV', () => { const route = current(); if (route) download('chem-lab-route.csv', 'text/csv;charset=utf-8', routeWorkspaceCsv(route)); }), button('Import JSON', () => file.click()), button('Delete route', () => {
    if (!current()) return;
    routes = routes.filter((r) => r.id !== selected); selected = routes[0] ? routes[0].id : ''; persist(); redraw();
  }));
  file.addEventListener('change', async () => {
    try {
      const item = file.files && file.files[0]; if (!item) return;
      if (item.size > ROUTE_WORKSPACE_LIMITS.importBytes) throw new Error('Route JSON must be smaller than 1 MB.');
      const imported = routeWorkspaceImport(await item.text());
      if (routes.length + imported.length > ROUTE_WORKSPACE_LIMITS.routes) throw new Error('Delete a saved route before importing more (maximum ' + ROUTE_WORKSPACE_LIMITS.routes + ').');
      imported.forEach((r) => { r.id = 'route-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8); });
      routes.push(...imported); selected = imported[0] ? imported[0].id : selected;
      if (persist()) message.textContent = 'Imported ' + imported.length + ' route(s). Verification was recomputed.';
      redraw();
    } catch (error) { message.textContent = 'Import failed: ' + error.message; }
    finally { file.value = ''; }
  });
  root.append(heading, controls, file, message, content);
  selected = routes[0] ? routes[0].id : '';
  redraw();
  return {
    addRoute(raw) {
      if (routes.length >= ROUTE_WORKSPACE_LIMITS.routes) throw new Error('At most ' + ROUTE_WORKSPACE_LIMITS.routes + ' routes can be saved.');
      const route = routeWorkspaceNormalize(raw); route.id = 'route-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      routes.push(route); selected = route.id; const saved = persist(); redraw(); if (saved) message.textContent = 'Route saved. You can rename it and edit individual steps.'; return route;
    },
    show() { redraw(); picker.focus(); },
  };
}
