function createReactionLab(host) {
  const root = document.getElementById('reaction-view');
  const input = document.getElementById('rx-input');
  const addButton = document.getElementById('rx-add');
  const onlineButton = document.getElementById('rx-online');
  const message = document.getElementById('rx-message');
  const cards = document.getElementById('rx-cards');
  const emptyHint = document.getElementById('rx-empty');
  const tempRange = document.getElementById('rx-temp');
  const tempNumber = document.getElementById('rx-temp-value');
  const tempPresets = document.getElementById('rx-temp-presets');
  const solventSearch = document.getElementById('rx-solvent-search');
  const solventList = document.getElementById('rx-solvent-list');
  const solventChosen = document.getElementById('rx-solvent-chosen');
  const additiveBox = document.getElementById('rx-additives');
  const atmosphereSelect = document.getElementById('rx-atmosphere');
  const pressureInput = document.getElementById('rx-pressure');
  const energyBox = document.getElementById('rx-energy');
  const timeInput = document.getElementById('rx-time');
  const concInput = document.getElementById('rx-conc');
  const notesInput = document.getElementById('rx-notes');
  const summary = document.getElementById('rx-summary');
  const preview = document.getElementById('rx-preview');
  const sendButton = document.getElementById('rx-send');
  const resetButton = document.getElementById('rx-reset');
  const predictionBox = document.getElementById('rx-prediction');
  const routeBox = document.getElementById('rx-route');
  const sheetBlock = document.getElementById('rx-sheet-block');
  const sheet = document.getElementById('rx-sheet');
  const scaleInput = document.getElementById('rx-scale');

  const saved = restoreReactionState(host.storageGet('reaction') || '');
  const state = { compounds: saved.compounds, conditions: saved.conditions, route: saved.route, prediction: null, branches: null, selected: '' };

  let scale = Number(host.storageGet('reactionScale')) || 1;
  scaleInput.value = String(scale);

  function amountText(value, digits) {
    return value === null ? '—' : value >= 1000 ? value.toFixed(0) : value.toFixed(digits);
  }

  function renderSheet() {
    sheetBlock.hidden = state.compounds.length === 0;
    sheet.innerHTML = '';
    const head = document.createElement('tr');
    ['Compound', 'MW', 'equiv', 'mmol', 'mg'].forEach((text) => {
      const th = document.createElement('th');
      th.textContent = text;
      head.appendChild(th);
    });
    const thead = document.createElement('thead');
    thead.appendChild(head);
    const tbody = document.createElement('tbody');
    reactionStoichiometry(state.compounds, scale).forEach((row) => {
      const tr = document.createElement('tr');
      tr.className = 'role-' + row.role;
      const cells = [row.name, row.mw === null ? '—' : row.mw.toFixed(2), row.role === 'solvent' ? 'solvent' : amountText(row.equiv, 2), amountText(row.mmol, 2), amountText(row.mg, 1)];
      cells.forEach((text, i) => {
        const td = document.createElement('td');
        td.textContent = text;
        if (i === 0) {
          td.title = text;
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    sheet.append(thead, tbody);
  }

  function save() {
    host.storageSet('reaction', serializeReactionState(state));
  }

  function setMessage(text, kind) {
    message.textContent = text;
    message.className = kind || '';
  }

  function drawFragment(canvas, fragment, padding, maxScale) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    const temp = reactionFragmentGraph(fragment);
    (fragment.annotations || []).forEach((a) => temp.addAnnotation(Object.assign({}, a)));
    (fragment.stereoHydrogens || []).forEach((h) => {
      const index = fragment.atoms.findIndex((a) => a.id === h.atom);
      temp.bonds.filter((b) => index >= 0 && b.atomA === temp.atoms[index].id && b.stereo).forEach((b) => {
        b.stereo = null;
      });
      const hydrogen = temp.addAtom('H', h.x, h.y);
      const bond = index >= 0 ? temp.addBond(temp.atoms[index].id, hydrogen.id) : null;
      if (bond) {
        bond.stereo = h.stereo;
      }
    });
    const renderer = new Renderer(canvas.getContext('2d'), temp);
    renderer.theme = host.theme();
    renderer.pixelRatio = ratio;
    renderer.showGrid = false;
    renderer.showEmptyHint = false;
    renderer.showNames = false;
    renderer.fitToContent(padding);
    if (maxScale && renderer.view.scale > maxScale) {
      const bounds = renderer.contentBounds();
      const size = renderer.viewportSize();
      renderer.view.scale = maxScale;
      renderer.view.x = size.width / 2 - ((bounds.minX + bounds.maxX) / 2) * maxScale;
      renderer.view.y = size.height / 2 - ((bounds.minY + bounds.maxY) / 2) * maxScale;
      renderer.render();
    }
  }

  function addCompound(parsed, role) {
    if (state.compounds.length >= REACTION_LIMITS.maxCompounds) {
      setMessage('At most ' + REACTION_LIMITS.maxCompounds + ' compounds per reaction', 'error');
      return null;
    }
    const info = reactionDescribeFragment(parsed.fragment);
    const compound = {
      input: parsed.input,
      smiles: parsed.smiles,
      fragment: parsed.fragment,
      name: info.name,
      formula: info.formula,
      mass: info.mass,
      equiv: '1',
      label: (!info.name || info.name === info.formula) && (parsed.source === 'name' || parsed.source === 'pubchem') ? parsed.input : '',
    };
    compound.role = role || reactionGuessRole(compound, state.compounds);
    state.compounds.push(compound);
    save();
    renderCards();
    renderSummary();
    return compound;
  }

  function addFromInput() {
    const text = input.value.trim();
    onlineButton.hidden = true;
    input.classList.remove('invalid');
    try {
      const parsed = reactionParseCompound(text);
      const compound = addCompound(parsed);
      if (compound) {
        setMessage('Added ' + (compound.name || compound.formula) + ' as ' + compound.role + (parsed.source === 'name' ? ' (name recognized)' : ''), 'ok');
        input.value = '';
      }
    } catch (error) {
      input.classList.add('invalid');
      onlineButton.hidden = !error.canSearchOnline;
      setMessage(error.message, 'error');
    }
  }

  async function searchOnline() {
    const query = input.value.trim();
    if (!query) {
      return;
    }
    onlineButton.disabled = true;
    setMessage('Searching PubChem…', '');
    try {
      const response = await fetch('https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/' + encodeURIComponent(query) + '/property/IsomericSMILES,SMILES/JSON');
      const data = response.ok ? await response.json() : null;
      const props = data && data.PropertyTable && data.PropertyTable.Properties && data.PropertyTable.Properties[0];
      const smiles = props && (props.IsomericSMILES || props.SMILES);
      if (!smiles) {
        throw new Error('No PubChem match for “' + query + '”');
      }
      const compound = addCompound({ input: query, smiles, fragment: smilesToFragment(smiles), source: 'pubchem' });
      if (compound) {
        compound.label = query;
        save();
        renderCards();
        renderSummary();
        setMessage('Added ' + query + ' from PubChem as ' + compound.role, 'ok');
        input.value = '';
        input.classList.remove('invalid');
        onlineButton.hidden = true;
      }
    } catch (error) {
      setMessage(error.message === 'Failed to fetch' ? 'PubChem is unreachable' : error.message, 'error');
    } finally {
      onlineButton.disabled = false;
    }
  }

  function addFromEditor() {
    const list = host.editorSmiles();
    if (list.length === 0) {
      setMessage('The editor canvas is empty — draw or select a molecule first', 'error');
      return;
    }
    let added = 0;
    list.forEach((smiles) => {
      try {
        if (addCompound({ input: smiles, smiles, fragment: smilesToFragment(smiles), source: 'editor' })) {
          added += 1;
        }
      } catch (error) {
        return;
      }
    });
    setMessage(added ? 'Added ' + added + ' compound' + (added === 1 ? '' : 's') + ' from the editor' : 'Could not read the editor structures', added ? 'ok' : 'error');
  }

  function renderCards() {
    cards.innerHTML = '';
    emptyHint.hidden = state.compounds.length > 0;
    state.compounds.forEach((compound, index) => {
      const card = document.createElement('div');
      card.className = 'rx-card role-' + compound.role;
      card.dataset.index = String(index);
      const thumb = document.createElement('canvas');
      thumb.className = 'rx-thumb';
      const body = document.createElement('div');
      body.className = 'rx-card-body';
      const title = document.createElement('div');
      title.className = 'rx-card-name';
      title.textContent = compound.label || compound.name || compound.input;
      title.title = compound.name || compound.input;
      const meta = document.createElement('div');
      meta.className = 'rx-card-meta';
      meta.innerHTML = formulaHtml(compound.formula) + (compound.mass ? ' · ' + compound.mass.toFixed(2) + ' g/mol' : '');
      const controls = document.createElement('div');
      controls.className = 'rx-card-controls';
      const role = document.createElement('select');
      role.className = 'rx-role';
      role.setAttribute('aria-label', 'Role');
      REACTION_ROLES.forEach((r) => {
        const option = document.createElement('option');
        option.value = r;
        option.textContent = r.charAt(0).toUpperCase() + r.slice(1);
        role.appendChild(option);
      });
      role.value = compound.role;
      role.addEventListener('change', () => {
        compound.role = role.value;
        card.className = 'rx-card role-' + compound.role;
        save();
        renderSheet();
        renderSummary();
      });
      const equiv = document.createElement('input');
      equiv.className = 'rx-equiv';
      equiv.type = 'text';
      equiv.value = compound.equiv;
      equiv.setAttribute('aria-label', 'Equivalents');
      equiv.title = 'Equivalents or amount (e.g. 1.2, 5 mol%, 2 mmol)';
      equiv.addEventListener('input', () => {
        compound.equiv = equiv.value.slice(0, 20);
        save();
        renderSheet();
        renderSummary();
      });
      const equivLabel = document.createElement('span');
      equivLabel.className = 'rx-equiv-label';
      equivLabel.textContent = 'equiv';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'rx-remove';
      remove.title = 'Remove';
      remove.textContent = '×';
      remove.addEventListener('click', () => {
        state.compounds.splice(index, 1);
        save();
        renderCards();
        renderSummary();
      });
      controls.append(role, equiv, equivLabel);
      body.append(title, meta, controls);
      card.append(thumb, body, remove);
      cards.appendChild(card);
      drawFragment(thumb, compound.fragment, 10, 0.5);
    });
    renderSheet();
  }

  function chip(text, active, onClick, title) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rx-chip' + (active ? ' active' : '');
    button.textContent = text;
    if (title) {
      button.title = title;
    }
    button.addEventListener('click', onClick);
    return button;
  }

  function updateConditions(mutator) {
    mutator(state.conditions);
    state.conditions = normalizeReactionConditions(state.conditions);
    save();
    renderConditions();
    renderSummary();
  }

  function renderSolvents() {
    const query = solventSearch.value.trim().toLowerCase();
    solventList.innerHTML = '';
    REACTION_SOLVENTS.filter((s) => s.id !== 'none' && (!query || s.name.toLowerCase().includes(query))).forEach((s) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'rx-solvent' + (state.conditions.solvents.includes(s.id) ? ' active' : '');
      row.dataset.solvent = s.id;
      const name = document.createElement('span');
      name.className = 'rx-solvent-name';
      name.textContent = s.name;
      const tags = document.createElement('span');
      tags.className = 'rx-solvent-tags';
      tags.textContent = 'bp ' + s.bp + ' °C · ε ' + s.dielectric + ' · ' + (s.protic ? 'protic' : 'aprotic');
      row.append(name, tags);
      row.addEventListener('click', () => updateConditions((c) => {
        c.solvents = c.solvents.includes(s.id) ? c.solvents.filter((id) => id !== s.id) : c.solvents.concat(s.id);
      }));
      solventList.appendChild(row);
    });
    solventChosen.innerHTML = '';
    if (state.conditions.solvents.length === 0) {
      const none = document.createElement('span');
      none.className = 'rx-muted';
      none.textContent = 'No solvent (neat)';
      solventChosen.appendChild(none);
    }
    state.conditions.solvents.forEach((id) => {
      solventChosen.appendChild(chip(reactionSolvent(id).name + ' ×', true, () => updateConditions((c) => {
        c.solvents = c.solvents.filter((x) => x !== id);
      }), 'Remove solvent'));
    });
  }

  function renderConditions() {
    const c = state.conditions;
    const t = reactionEffectiveTemperature(c);
    tempRange.value = String(t);
    tempNumber.value = String(t);
    tempRange.disabled = c.reflux;
    tempNumber.disabled = c.reflux;
    tempPresets.innerHTML = '';
    REACTION_TEMPERATURE_PRESETS.forEach((p) => {
      const refluxBp = reactionRefluxTemperature(c);
      const active = p.value === null ? c.reflux : !c.reflux && c.temperature === p.value;
      const button = chip(p.value === null && refluxBp !== null ? p.name + ' (' + refluxBp + ' °C)' : p.name, active, () => updateConditions((x) => {
        if (p.value === null) {
          x.reflux = !x.reflux;
        } else {
          x.reflux = false;
          x.temperature = p.value;
        }
      }), p.value === null ? 'Boiling point of the lowest-boiling solvent' : null);
      button.dataset.preset = p.id;
      if (p.value === null && refluxBp === null) {
        button.disabled = true;
        button.title = 'Pick a solvent to reflux in';
      }
      tempPresets.appendChild(button);
    });
    renderSolvents();
    additiveBox.innerHTML = '';
    const groups = [];
    REACTION_ADDITIVES.forEach((a) => {
      if (!groups.includes(a.group)) {
        groups.push(a.group);
      }
    });
    groups.forEach((group) => {
      const row = document.createElement('div');
      row.className = 'rx-additive-group';
      const label = document.createElement('span');
      label.className = 'rx-group-label';
      label.textContent = group;
      row.appendChild(label);
      REACTION_ADDITIVES.filter((a) => a.group === group).forEach((a) => {
        const button = chip(a.name, c.additives.includes(a.id), () => updateConditions((x) => {
          x.additives = x.additives.includes(a.id) ? x.additives.filter((id) => id !== a.id) : x.additives.concat(a.id);
        }));
        button.dataset.additive = a.id;
        row.appendChild(button);
      });
      additiveBox.appendChild(row);
    });
    atmosphereSelect.value = c.atmosphere;
    pressureInput.value = String(c.pressure);
    energyBox.innerHTML = '';
    REACTION_ENERGY.forEach((e) => {
      const button = chip(e.name, c.energy === e.id, () => updateConditions((x) => {
        x.energy = e.id;
      }));
      button.dataset.energy = e.id;
      energyBox.appendChild(button);
    });
    if (document.activeElement !== timeInput) {
      timeInput.value = c.time;
    }
    if (document.activeElement !== concInput) {
      concInput.value = c.concentration;
    }
    if (document.activeElement !== notesInput) {
      notesInput.value = c.notes;
    }
  }

  function predict() {
    try {
      state.prediction = predictReaction(state.compounds, state.conditions);
    } catch (error) {
      state.prediction = { best: null, alternatives: [], hints: ['Prediction failed: ' + error.message] };
    }
    const key = JSON.stringify([state.compounds.map((c) => [c.smiles, c.role]), state.conditions]);
    if (!state.branches || state.branches.key !== key) {
      let result = { factors: [], branches: [], more: 0 };
      try {
        result = reactionBranches(state.compounds, state.conditions, state.prediction);
      } catch (error) {
        result = { factors: [], branches: [], more: 0 };
      }
      state.branches = Object.assign(result, { key });
    }
  }

  function outcomeText(outcome) {
    if (!outcome) {
      return 'no reaction';
    }
    return outcome.products.map((pr) => reactionDescribeFragment(reactionProductFragment(pr)).name || pr.smiles).join(' + ') + ' (' + outcome.name + ')';
  }

  function applyChange(change) {
    state.selected = '';
    updateConditions((c) => {
      if (change.type === 'additive') {
        c.additives = change.on ? c.additives.concat(change.id) : c.additives.filter((id) => id !== change.id);
      } else if (change.type === 'solvent') {
        c.solvents = change.on ? c.solvents.concat(change.id) : c.solvents.filter((id) => id !== change.id);
      } else if (change.type === 'energy') {
        c.energy = change.id;
      } else if (change.type === 'atmosphere') {
        c.atmosphere = change.id;
      } else if (change.type === 'temperature') {
        c.temperature = change.value;
        c.reflux = false;
      }
    });
  }

  function renderBranches(title) {
    const b = state.branches;
    const box = element('div', 'rx-branching');
    if (b && b.factors.length) {
      box.appendChild(element('div', 'rx-branch-title', 'Why this outcome'));
      const list = element('ul', 'rx-factors');
      b.factors.forEach((f) => {
        const li = element('li');
        li.append(element('strong', '', f.label), document.createTextNode(' \u2014 without it: ' + outcomeText(f.outcome)));
        list.appendChild(li);
      });
      box.appendChild(list);
    }
    if (b && b.branches.length) {
      box.appendChild(element('div', 'rx-branch-title', title));
      const list = element('div', 'rx-branches');
      b.branches.forEach((branch) => {
        const row = element('div', 'rx-branch');
        const options = element('div', 'rx-branch-options');
        branch.variants.slice(0, 4).forEach((v) => {
          const chip = element('button', 'rx-chip', v.label);
          chip.type = 'button';
          chip.title = 'Apply this change';
          chip.addEventListener('click', () => applyChange(v.change));
          options.appendChild(chip);
        });
        row.append(options, element('div', 'rx-branch-result', '\u2192 ' + outcomeText(branch.outcome)));
        list.appendChild(row);
      });
      box.appendChild(list);
      if (b.more) {
        box.appendChild(element('div', 'rx-branch-more', '+' + b.more + ' more outcomes reachable by changing one condition'));
      }
    }
    if (box.childNodes.length) {
      predictionBox.appendChild(box);
    }
  }

  function chosenOutcome() {
    const p = state.prediction;
    if (!p || !p.best) {
      return null;
    }
    return [p.best].concat(p.alternatives).find((o) => o.key === state.selected) || p.best;
  }

  function currentScheme() {
    const outcome = chosenOutcome();
    if (outcome && outcome.ratio && outcome.products.length === 1 && (outcome.minor || []).length === 1) {
      return buildReactionScheme(state.compounds, state.conditions, outcome.products.concat(outcome.minor).map(reactionProductFragment),
        ['~' + outcome.ratio[0] + '% (major)', '~' + outcome.ratio[1] + '% (minor)']);
    }
    return buildReactionScheme(state.compounds, state.conditions, outcome ? outcome.products.map(reactionProductFragment) : []);
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text !== undefined) {
      node.textContent = text;
    }
    return node;
  }

  function productDisplayName(product) {
    const name = reactionDescribeFragment(reactionProductFragment(product)).name;
    if (!name || !product.stereo || product.stereo.kind !== 'racemic') {
      return name;
    }
    return name.replace(/(^|\s)\(((?:\d+[a-z]?)?[RS](?:,(?:\d+[a-z]?)?[RS])*)\)-/, '$1rac-($2)-');
  }

  function renderStoichiometry(stoich, productNames) {
    const box = element('div', 'rx-stoich');
    const m = stoich.multiplier;
    const coefficient = (value) => {
      const n = Math.round(value * m * 100) / 100;
      return n === 1 ? '' : n + ' ';
    };
    const left = stoich.rows.map((r) => coefficient(r.need) + r.label).join(' + ');
    const right = productNames.map((p) => coefficient(p.count) + p.name).join(' + ');
    box.appendChild(element('div', 'rx-equation', left + ' \u2192 ' + right));
    const table = element('table', 'rx-stoich-table');
    const head = element('tr');
    ['Compound', 'Ratio', 'Supplied', ''].forEach((t) => head.appendChild(element('th', '', t)));
    table.appendChild(head);
    stoich.rows.forEach((r) => {
      const row = element('tr');
      const status = r.status === 'limiting' ? 'limiting' : r.status === 'excess' ? 'excess (+' + (Math.round(r.leftover * 100) / 100) + ')' : 'exact';
      row.append(element('td', '', r.label), element('td', '', (Math.round(r.need * 100) / 100) + ' equiv'),
        element('td', '', r.have + ' equiv'), element('td', 'rx-stoich-status ' + r.status, status));
      table.appendChild(row);
    });
    box.appendChild(table);
    box.appendChild(element('div', 'rx-stoich-yield' + (stoich.conversion < 0.999 ? ' short' : ''),
      'Max. conversion of ' + stoich.rows[0].label + ': ' + Math.round(stoich.conversion * 100) + '%' +
      (stoich.limiting && stoich.limiting !== stoich.rows[0] ? ' (limited by ' + stoich.limiting.label + ')' : '')));
    return box;
  }

  function renderPrediction() {
    predictionBox.innerHTML = '';
    const p = state.prediction;
    const outcome = chosenOutcome();
    if (!outcome) {
      const box = element('div', 'rx-hints');
      box.appendChild(element('div', 'rx-outcome-type', 'No product predicted'));
      (p ? p.hints : []).forEach((h) => box.appendChild(element('p', 'rx-hint', h)));
      predictionBox.appendChild(box);
      renderBranches('Try one change');
      return;
    }
    const head = element('div', 'rx-outcome-head');
    head.append(element('span', 'rx-outcome-name', outcome.name), element('span', 'rx-outcome-type', outcome.type));
    predictionBox.appendChild(head);
    const products = element('div', 'rx-products');
    const thumbs = [];
    const productNames = [];
    const ratio = outcomeRatio(outcome);
    const addCard = (product, minor, index) => {
      const fragment = reactionProductFragment(product);
      const info = reactionDescribeFragment(fragment);
      const card = element('div', 'rx-product' + (minor ? ' minor' : ''));
      const canvas = element('canvas', 'rx-product-thumb');
      const shown = productDisplayName(product);
      const label = element('div', 'rx-product-name', (product.count > 1 ? product.count + ' × ' : '') + (shown || info.formula));
      const formulaLine = element('div', 'rx-product-formula', '');
      formulaLine.innerHTML = '<span>' + (minor ? 'minor · ' : '') + (ratio && index === 0 ? '~' + ratio[minor ? 1 : 0] + '% · ' : '') + formulaHtml(info.formula) + ' · ' + info.mass.toFixed(2) + ' g/mol</span>';
      card.append(canvas, label, formulaLine);
      if (product.stereo) {
        card.appendChild(element('div', 'rx-product-stereo ' + product.stereo.kind, product.stereo.text));
      }
      if (product.smiles && product.smiles.indexOf('.') < 0) {
        const use = element('button', 'text-button rx-use-product', 'Use as reactant \u2192');
        use.type = 'button';
        use.title = 'Add this step to the route and start the next step from this product';
        use.addEventListener('click', () => useAsReactant(outcome, product, minor));
        card.appendChild(use);
      }
      products.appendChild(card);
      thumbs.push([canvas, fragment]);
      if (!minor) {
        productNames.push({ name: shown || info.formula, count: product.count });
      }
    };
    outcome.products.forEach((product, i) => addCard(product, false, i));
    (outcome.minor || []).forEach((product, i) => addCard(product, true, i));
    predictionBox.appendChild(products);
    let mechanismCanvas = null;
    if (outcome.mechanism) {
      const box = element('div', 'rx-mechanism');
      box.appendChild(element('div', 'rx-mechanism-title', 'Mechanism · click to enlarge'));
      box.title = 'Click to enlarge or shrink';
      box.addEventListener('click', () => {
        const big = box.classList.toggle('expanded');
        box.firstChild.textContent = big ? 'Mechanism · click to shrink' : 'Mechanism · click to enlarge';
        drawFragment(mechanismCanvas, outcome.mechanism.fragment, 18, big ? 1.3 : 0.9);
      });
      mechanismCanvas = element('canvas', 'rx-mechanism-canvas');
      box.appendChild(mechanismCanvas);
      if (outcome.mechanism.caption) {
        box.appendChild(element('div', 'rx-mechanism-caption', outcome.mechanism.caption));
      }
      const actions = element('div', 'rx-mechanism-actions');
      ['png', 'svg'].forEach((kind) => {
        const b = element('button', 'text-button rx-mechanism-export', kind.toUpperCase());
        b.type = 'button';
        b.dataset.kind = kind;
        b.title = 'Download the mechanism as ' + kind.toUpperCase();
        b.addEventListener('click', (event) => {
          event.stopPropagation();
          exportFragment(outcome.mechanism.fragment, kind, 'mechanism-' + outcome.id, 'the mechanism');
        });
        actions.appendChild(b);
      });
      box.appendChild(actions);
      predictionBox.appendChild(box);
    }
    if (outcome.stoichiometry) {
      predictionBox.appendChild(renderStoichiometry(outcome.stoichiometry, productNames));
    }
    thumbs.forEach(([canvas, fragment]) => drawFragment(canvas, fragment, 14, 0.75));
    if (mechanismCanvas) {
      drawFragment(mechanismCanvas, outcome.mechanism.fragment, 18, 0.9);
    }
    if (outcome.byproducts.length) {
      predictionBox.appendChild(element('div', 'rx-byproducts', 'Also formed: ' + outcome.byproducts.join(', ')));
    }
    predictionBox.appendChild(element('p', 'rx-reason', outcome.reason));
    if (outcome.warnings.length) {
      const list = element('ul', 'rx-warnings');
      outcome.warnings.forEach((w) => list.appendChild(element('li', '', w)));
      predictionBox.appendChild(list);
    }
    if ((outcome.whyNot || []).length) {
      const why = element('details', 'rx-why-not');
      why.appendChild(element('summary', '', 'Why not\u2026?'));
      const list = element('ul');
      outcome.whyNot.forEach((w) => {
        const li = element('li');
        if (w.title) {
          li.appendChild(element('strong', '', w.title + ' '));
        }
        li.appendChild(document.createTextNode(w.text));
        list.appendChild(li);
      });
      why.appendChild(list);
      predictionBox.appendChild(why);
    }
    const all = [p.best].concat(p.alternatives);
    if (all.length > 1) {
      const alt = element('div', 'rx-alternatives');
      alt.appendChild(element('span', 'rx-summary-key', 'Other outcomes'));
      all.forEach((o) => {
        const b = element('button', 'rx-chip' + (o === outcome ? ' active' : ''), o.name);
        b.type = 'button';
        b.dataset.outcome = o.key;
        b.addEventListener('click', () => {
          state.selected = o.key;
          renderSummary();
        });
        alt.appendChild(b);
      });
      predictionBox.appendChild(alt);
    }
    renderBranches('What if\u2026');
  }

  function useAsReactant(outcome, product, minor) {
    if (state.route.length >= REACTION_ROUTE_LIMITS.maxSteps) {
      setMessage('A route can have at most ' + REACTION_ROUTE_LIMITS.maxSteps + ' steps', 'error');
      return;
    }
    const last = state.route[state.route.length - 1];
    const step = reactionRouteStep(state.compounds, state.conditions, outcome, product, minor, last ? last.to.smiles : null);
    if (!step) {
      setMessage('This product cannot be carried forward', 'error');
      return;
    }
    if (last && last.to.smiles !== step.from.smiles) {
      state.route = [];
    }
    state.route.push(step);
    state.compounds = [];
    state.conditions = defaultReactionConditions();
    state.selected = '';
    addCompound({ input: step.to.smiles, smiles: step.to.smiles, fragment: step.to.fragment, source: 'route' }, 'reactant');
    save();
    renderAll();
    setMessage('Step ' + state.route.length + ' added to the route \u2014 choose reagents and conditions for the next step', 'ok');
  }

  function routeFrame(fragment) {
    const temp = reactionFragmentGraph(fragment);
    (fragment.annotations || []).forEach((a) => temp.addAnnotation(Object.assign({}, a)));
    const probe = new Renderer(document.createElement('canvas').getContext('2d'), temp);
    const bounds = probe.contentBounds();
    if (!bounds) {
      return null;
    }
    const pad = 30;
    const width = bounds.maxX - bounds.minX + pad * 2;
    const height = bounds.maxY - bounds.minY + pad * 2;
    return { temp, width, height, view: { x: pad - bounds.minX, y: pad - bounds.minY, scale: 1 } };
  }

  function routeRender(ctx, frame, scale) {
    const exporter = new Renderer(ctx, frame.temp);
    exporter.theme = 'light';
    exporter.pixelRatio = scale;
    exporter.showGrid = false;
    exporter.showEmptyHint = false;
    exporter.showNames = false;
    exporter.view = frame.view;
    exporter.render();
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportRoute(kind) {
    exportFragment(buildRouteScheme(state.route), kind, 'synthesis-route', 'the route');
  }

  function exportFragment(fragment, kind, name, what) {
    const frame = routeFrame(fragment);
    if (!frame) {
      return;
    }
    if (kind === 'svg') {
      const ctx = new SvgContext(frame.width, frame.height);
      routeRender(ctx, frame, 1);
      download(new Blob([ctx.toSvg()], { type: 'image/svg+xml' }), name + '.svg');
      setMessage('Exported ' + what + ' as SVG', 'ok');
      return;
    }
    const scale = 2;
    const off = document.createElement('canvas');
    off.width = Math.round(frame.width * scale);
    off.height = Math.round(frame.height * scale);
    const ctx = off.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, off.width, off.height);
    routeRender(ctx, frame, scale);
    off.toBlob((blob) => {
      if (blob) {
        download(blob, name + '.png');
        setMessage('Exported ' + what + ' as PNG', 'ok');
      }
    }, 'image/png');
  }

  function renderRoute() {
    routeBox.innerHTML = '';
    routeBox.classList.remove('expanded');
    routeBox.hidden = state.route.length === 0;
    if (routeBox.hidden) {
      return;
    }
    const head = element('div', 'rx-route-head');
    const total = element('span', 'rx-route-total');
    head.append(element('span', 'rx-route-title', 'Synthesis route'), total);
    const canvas = element('canvas', 'rx-route-canvas');
    canvas.title = 'Click to enlarge or shrink';
    canvas.addEventListener('click', () => {
      routeBox.classList.toggle('expanded');
      drawFragment(canvas, buildRouteScheme(state.route), 14, routeBox.classList.contains('expanded') ? 1.3 : undefined);
    });
    const list = element('ol', 'rx-route-steps');
    const refresh = () => {
      total.textContent = state.route.length + ' step' + (state.route.length === 1 ? '' : 's') + ' \u00b7 overall ' + reactionRouteYield(state.route) + '%';
      drawFragment(canvas, buildRouteScheme(state.route), 14);
    };
    state.route.forEach((step) => {
      const li = element('li', 'rx-route-step');
      const text = element('span', 'rx-route-text', step.from.name + ' \u2192 ' + step.to.name);
      text.title = [step.reaction, step.above, step.below].filter(Boolean).join(' \u00b7 ');
      const yieldInput = element('input', 'rx-route-yield');
      yieldInput.type = 'number';
      yieldInput.min = '0';
      yieldInput.max = '100';
      yieldInput.value = String(step.yield);
      yieldInput.setAttribute('aria-label', 'Step yield (%)');
      yieldInput.title = 'Step yield in %. The default is the selectivity times the maximum conversion; enter your isolated yield.';
      yieldInput.addEventListener('input', () => {
        const v = Number(yieldInput.value);
        step.yield = Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 0;
        save();
        refresh();
      });
      li.append(element('span', 'rx-route-reaction', step.reaction), text, yieldInput, element('span', 'rx-equiv-label', '%'));
      list.appendChild(li);
    });
    const actions = element('div', 'rx-route-actions');
    const button = (label, id, onClick, title) => {
      const b = element('button', 'text-button', label);
      b.type = 'button';
      b.id = id;
      b.title = title;
      b.addEventListener('click', onClick);
      actions.appendChild(b);
    };
    button('Undo step', 'rx-route-undo', () => {
      const step = state.route.pop();
      state.compounds = [];
      state.conditions = defaultReactionConditions();
      state.selected = '';
      addCompound({ input: step.from.smiles, smiles: step.from.smiles, fragment: step.from.fragment || smilesToFragment(step.from.smiles), source: 'route' }, 'reactant');
      save();
      renderAll();
      setMessage('Removed the last step', '');
    }, 'Remove the last step and go back to its starting material');
    button('Clear route', 'rx-route-clear', () => {
      state.route = [];
      save();
      renderRoute();
      setMessage('Route cleared', '');
    }, 'Forget the route; the current reaction stays');
    button('PNG', 'rx-route-png', () => exportRoute('png'), 'Download the route scheme as a PNG image');
    button('SVG', 'rx-route-svg', () => exportRoute('svg'), 'Download the route scheme as an SVG image');
    button('Send route to editor', 'rx-route-send', () => host.sendScheme(buildRouteScheme(state.route)), 'Draw the whole route on the editor canvas');
    actions.lastChild.classList.add('primary');
    routeBox.append(head, canvas, list, actions);
    refresh();
  }

  function outcomeRatio(outcome) {
    return outcome.ratio && outcome.minor && outcome.minor.length === 1 ? outcome.ratio : null;
  }

  function renderSummary() {
    const labels = reactionConditionLabels(state.conditions, state.compounds);
    const reactants = state.compounds.filter((c) => c.role === 'reactant');
    summary.innerHTML = '';
    predict();
    const outcome = chosenOutcome();
    const lines = [
      ['Reactants', reactants.length ? reactants.map((c) => (c.equiv && c.equiv !== '1' ? c.equiv + ' × ' : '') + (c.label || c.name || c.formula)).join(' + ') : '—'],
      ['Over the arrow', labels.above || '—'],
      ['Under the arrow', labels.below || '—'],
      ['Products', outcome ? outcome.products.map((pr) => (pr.count > 1 ? pr.count + ' × ' : '') + (productDisplayName(pr) || pr.smiles)).join(' + ') +
        (outcome.minor.length ? ' (minor' + (outcomeRatio(outcome) ? ' ~' + outcome.ratio[1] + '%' : '') + ': ' + outcome.minor.map((pr) => productDisplayName(pr) || pr.smiles).join(', ') + ')' : '') : '—'],
    ];
    if (state.conditions.notes.trim()) {
      lines.push(['Notes', state.conditions.notes.trim()]);
    }
    lines.forEach(([k, v]) => {
      const row = document.createElement('div');
      row.className = 'rx-summary-row';
      const key = document.createElement('span');
      key.className = 'rx-summary-key';
      key.textContent = k;
      const value = document.createElement('span');
      value.textContent = v;
      row.append(key, value);
      summary.appendChild(row);
    });
    sendButton.disabled = reactants.length === 0;
    drawFragment(preview, currentScheme(), 18);
    renderPrediction();
  }

  function renderAll() {
    renderRoute();
    renderCards();
    renderConditions();
    renderSummary();
  }

  scaleInput.addEventListener('input', () => {
    const value = Number(scaleInput.value);
    if (Number.isFinite(value) && value > 0) {
      scale = value;
      host.storageSet('reactionScale', String(scale));
      renderSheet();
    }
  });
  addButton.addEventListener('click', addFromInput);
  onlineButton.addEventListener('click', searchOnline);
  document.addEventListener('keydown', (event) => {
    const open = event.key === 'Escape' ? predictionBox.querySelector('.rx-mechanism.expanded') : null;
    if (open) {
      open.click();
    } else if (event.key === 'Escape' && routeBox.classList.contains('expanded')) {
      routeBox.querySelector('.rx-route-canvas').click();
    }
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addFromInput();
    }
  });
  input.addEventListener('input', () => {
    input.classList.remove('invalid');
    onlineButton.hidden = true;
  });
  document.getElementById('rx-from-editor').addEventListener('click', addFromEditor);
  tempRange.min = String(REACTION_LIMITS.tempMin);
  tempRange.max = String(REACTION_LIMITS.tempMax);
  tempRange.addEventListener('input', () => updateConditions((c) => {
    c.temperature = Number(tempRange.value);
  }));
  tempNumber.addEventListener('change', () => updateConditions((c) => {
    c.temperature = Number(tempNumber.value);
  }));
  solventSearch.addEventListener('input', renderSolvents);
  solventSearch.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const first = solventList.querySelector('.rx-solvent');
      if (first) {
        first.click();
        solventSearch.value = '';
        renderSolvents();
      }
    }
  });
  REACTION_ATMOSPHERES.forEach((a) => {
    const option = document.createElement('option');
    option.value = a.id;
    option.textContent = a.name;
    atmosphereSelect.appendChild(option);
  });
  atmosphereSelect.addEventListener('change', () => updateConditions((c) => {
    c.atmosphere = atmosphereSelect.value;
  }));
  pressureInput.addEventListener('change', () => updateConditions((c) => {
    c.pressure = Number(pressureInput.value);
  }));
  [[timeInput, 'time'], [concInput, 'concentration'], [notesInput, 'notes']].forEach(([field, key]) => {
    field.addEventListener('input', () => updateConditions((c) => {
      c[key] = field.value;
    }));
  });
  sendButton.addEventListener('click', () => {
    if (state.compounds.some((c) => c.role === 'reactant')) {
      host.sendScheme(currentScheme());
    }
  });
  resetButton.addEventListener('click', () => {
    state.compounds = [];
    state.conditions = defaultReactionConditions();
    save();
    setMessage('Reaction cleared', '');
    renderAll();
  });

  return {
    root,
    state,
    show() {
      renderAll();
      input.focus();
    },
    repaint() {
      if (!root.hidden) {
        renderRoute();
        renderCards();
        renderSummary();
      }
    },
    addSmiles(smiles, role) {
      return addCompound({ input: smiles, smiles, fragment: smilesToFragment(smiles), source: 'api' }, role);
    },
  };
}
