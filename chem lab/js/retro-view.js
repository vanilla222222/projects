const RETRO_VIEW_COVERAGE = 'Disconnections are only offered when the Reaction lab rules run them forward to this exact structure. Covered: alcohols (hydration, hydroboration, carbonyl reduction, Grignard, SN2), alkyl halides, ethers, esters and amides, alkenes (dehydration, E2, Wittig, Diels–Alder), hydrogenation, oxidations, nitriles, aldol products, alkynes, epoxides, diols, and aromatic halogenation, Friedel–Crafts acylation, nitro reduction and reductive amination. Aromatic nitration has no forward rule, so nitroarenes have no disconnection.';

function retroViewName(smiles) {
  const common = retroCommonName(smiles);
  if (common) {
    return common;
  }
  try {
    const info = reactionDescribeFragment(smilesToFragment(smiles));
    return info.name || info.formula || smiles;
  } catch (error) {
    return smiles;
  }
}

function retroViewElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) {
    el.className = className;
  }
  if (text !== undefined) {
    el.textContent = text;
  }
  return el;
}

function createRetroView(deps) {
  const overlay = document.getElementById('retro-overlay');
  const trail = document.getElementById('retro-trail');
  const summary = document.getElementById('retro-summary');
  const list = document.getElementById('retro-list');
  const hint = document.getElementById('retro-hint');
  const sendButton = document.getElementById('retro-send');
  const labButton = document.getElementById('retro-lab');
  const state = { open: false, tree: null, chain: [], selected: null, names: new Map(), job: 0 };

  function nameFor(smiles) {
    if (!state.names.has(smiles)) {
      state.names.set(smiles, retroViewName(smiles));
    }
    return state.names.get(smiles);
  }

  function thumbnail(smiles) {
    try {
      return deps.structureThumbnail(retroFromSmiles(smiles));
    } catch (error) {
      return retroViewElement('div', 'retro-thumb-missing', smiles);
    }
  }

  function currentNode() {
    if (!state.tree) {
      return null;
    }
    const last = state.chain[state.chain.length - 1];
    return last ? last.candidate.children[last.precursor] : state.tree.root;
  }

  function route() {
    const node = currentNode();
    const chosen = node && node.result && state.selected !== null ? node.result.candidates[state.selected] : null;
    return state.chain.concat(chosen ? [{ candidate: chosen, precursor: null }] : []);
  }

  function labCandidate() {
    const r = route();
    return r.length ? r[r.length - 1].candidate : null;
  }

  function renderTrail() {
    trail.innerHTML = '';
    if (!state.tree) {
      return;
    }
    const crumbs = [state.tree.root].concat(state.chain.map((link) => link.candidate.children[link.precursor]));
    crumbs.forEach((node, index) => {
      if (index) {
        trail.appendChild(retroViewElement('span', 'retro-trail-arrow', '⇒'));
      }
      const crumb = retroViewElement('button', 'retro-crumb' + (index === crumbs.length - 1 ? ' current' : ''), nameFor(node.smiles));
      crumb.type = 'button';
      crumb.title = node.smiles;
      crumb.disabled = index === crumbs.length - 1;
      crumb.addEventListener('click', () => {
        state.chain = state.chain.slice(0, index);
        state.selected = null;
        render();
      });
      trail.appendChild(crumb);
    });
  }

  function renderButtons() {
    const r = route();
    sendButton.disabled = r.length === 0;
    labButton.disabled = r.length === 0;
    if (!r.length) {
      hint.textContent = 'Select a disconnection to build a route; Disconnect breaks a precursor down further';
    } else {
      hint.textContent = r.length === 1 ? 'Route: 1 step' : 'Route: ' + r.length + ' steps';
    }
  }

  function precursorFigure(tree, candidate, index, node) {
    const precursor = candidate.precursors[index];
    const child = candidate.children[index];
    const figure = retroViewElement('div', 'retro-precursor');
    figure.appendChild(thumbnail(precursor.smiles));
    figure.appendChild(retroViewElement('div', 'retro-caption', precursor.label || nameFor(precursor.smiles)));
    if (precursor.common) {
      figure.appendChild(retroViewElement('span', 'retro-badge common', 'common starting material'));
    }
    if (retroCanExpand(tree, child)) {
      const expand = retroViewElement('button', 'retro-expand', 'Disconnect');
      expand.type = 'button';
      expand.title = 'Find disconnections for ' + nameFor(precursor.smiles);
      expand.addEventListener('click', (event) => {
        event.stopPropagation();
        drill(node, candidate, index);
      });
      figure.appendChild(expand);
    }
    return figure;
  }

  function candidateCard(tree, node, candidate, index) {
    const card = retroViewElement('div', 'retro-card' + (state.selected === index ? ' selected' : ''));
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.dataset.index = String(index);
    const head = retroViewElement('div', 'retro-card-head');
    head.appendChild(retroViewElement('span', 'retro-card-name', candidate.name));
    head.appendChild(retroViewElement('span', 'retro-card-group', candidate.group));
    if (candidate.minor) {
      head.appendChild(retroViewElement('span', 'retro-badge minor', 'minor route'));
    }
    card.appendChild(head);
    const body = retroViewElement('div', 'retro-card-body');
    const arrow = retroViewElement('div', 'retro-arrow');
    arrow.appendChild(retroViewElement('span', 'retro-arrow-label', candidate.labels.above || ''));
    arrow.appendChild(retroViewElement('span', 'retro-arrow-symbol', '⇒'));
    arrow.appendChild(retroViewElement('span', 'retro-arrow-label', candidate.labels.below || ''));
    body.appendChild(arrow);
    candidate.precursors.forEach((p, i) => {
      if (i) {
        body.appendChild(retroViewElement('span', 'retro-plus', '+'));
      }
      body.appendChild(precursorFigure(tree, candidate, i, node));
    });
    card.appendChild(body);
    const select = () => {
      state.selected = state.selected === index ? null : index;
      Array.from(list.querySelectorAll('.retro-card')).forEach((el) => el.classList.toggle('selected', Number(el.dataset.index) === state.selected));
      renderButtons();
    };
    card.addEventListener('click', select);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select();
      }
    });
    return card;
  }

  function emptyMessage(result) {
    if (result.reason === 'components') {
      return 'Select a single molecule: the target must be one connected structure.';
    }
    if (result.reason === 'size') {
      return 'The target is too large (limit ' + RETRO_LIMITS.maxHeavy + ' heavy atoms).';
    }
    if (result.reason === 'empty') {
      return 'Draw a molecule first.';
    }
    return 'No verified disconnection for ' + nameFor(result.smiles) + '. ' + RETRO_VIEW_COVERAGE;
  }

  function render() {
    renderTrail();
    list.innerHTML = '';
    const node = currentNode();
    if (!node) {
      summary.textContent = '';
      renderButtons();
      return;
    }
    const result = retroExpand(state.tree, node) || node.result;
    const target = retroViewElement('div', 'retro-target');
    target.appendChild(thumbnail(node.smiles));
    const text = retroViewElement('div', 'retro-target-text');
    text.appendChild(retroViewElement('strong', '', nameFor(node.smiles)));
    const count = result ? result.candidates.length : 0;
    const detail = result
      ? (count === 1 ? '1 verified disconnection' : count + ' verified disconnections') + ' · ' + result.ms + ' ms' + (result.truncated ? ' · time limit reached' : '')
      : 'Depth limit reached';
    text.appendChild(retroViewElement('span', '', detail));
    text.appendChild(retroViewElement('span', 'retro-depth', 'Step ' + (node.depth + 1) + ' of ' + state.tree.maxDepth));
    target.appendChild(text);
    summary.innerHTML = '';
    summary.appendChild(target);
    if (!result || !count) {
      list.appendChild(retroViewElement('p', 'retro-empty', result ? emptyMessage(result) : 'Maximum depth reached.'));
    } else {
      result.candidates.forEach((candidate, index) => list.appendChild(candidateCard(state.tree, node, candidate, index)));
    }
    list.scrollTop = 0;
    renderButtons();
  }

  function drill(node, candidate, index) {
    if (currentNode() !== node) {
      return;
    }
    state.chain.push({ candidate, precursor: index });
    state.selected = null;
    busy(() => render());
  }

  function busy(run) {
    const job = ++state.job;
    list.innerHTML = '';
    list.appendChild(retroViewElement('p', 'retro-empty', 'Searching…'));
    setTimeout(() => {
      if (job === state.job && state.open) {
        run();
      }
    }, 20);
  }

  function open(atomIds) {
    const ids = (atomIds || deps.targetAtomIds()).filter((id) => deps.graph.getAtom(id) && deps.graph.getAtom(id).element !== 'H');
    if (!ids.length) {
      deps.toast('Draw a molecule first', { kind: 'warn' });
      return;
    }
    const target = retroTarget(deps.graph, ids);
    if (!target.smiles) {
      deps.toast('Could not read this structure', { kind: 'warn' });
      return;
    }
    state.open = true;
    overlay.hidden = false;
    state.chain = [];
    state.selected = null;
    state.tree = null;
    trail.innerHTML = '';
    summary.textContent = '';
    renderButtons();
    busy(() => {
      state.tree = retroTree(target.smiles);
      render();
    });
  }

  function close() {
    state.open = false;
    state.job += 1;
    overlay.hidden = true;
  }

  document.getElementById('retro-close').addEventListener('click', close);
  document.getElementById('retro-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      close();
    }
  });
  sendButton.addEventListener('click', () => {
    const r = route();
    if (!r.length) {
      return;
    }
    const steps = retroRouteSteps(r);
    if (!steps.length) {
      deps.toast('Could not build this route', { kind: 'warn' });
      return;
    }
    close();
    deps.sendScheme(buildRouteScheme(steps), steps.length);
  });
  labButton.addEventListener('click', () => {
    const candidate = labCandidate();
    if (!candidate) {
      return;
    }
    close();
    deps.openInLab(candidate.compounds.map((c) => ({ smiles: c.smiles, role: c.role, label: c.label || '' })), candidate.conditions);
  });

  return {
    open,
    close,
    isOpen: () => state.open,
    state,
  };
}
