'use strict';

(() => {
  const get = id => document.getElementById(id);
  const results = get('results');
  const status = get('search-status');
  const run = get('run');
  const cancel = get('cancel');
  const download = get('export-results');
  let active = null;
  let lastRun = null;

  const examples = {
    route:{ mode:'route', target:'O=C(NCc1ccccc1)c1ccc(-c2ccncc2)cc1', start:'' },
    path:{ mode:'path', target:'CC(=O)Oc1ccccc1C(=O)O', start:'OC(=O)c1ccccc1O' },
    analogues:{ mode:'analogues', target:'CC(=O)Nc1ccc(Br)cc1', start:'' },
  };
  const stopLabels = {
    'time-limit':'Time limit reached.',
    'state-limit':'Search size limit reached.',
    'depth-limit':'Step limit reached on at least one branch.',
    'route-limit':'Requested route count reached.',
    'analogue-limit':'Requested analogue count reached.',
    exhausted:'Search frontier exhausted.',
  };

  function element(tag, className, text){
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function setStatus(text, error = false){
    status.textContent = text;
    status.classList.toggle('bad', error);
  }

  function syncQuestion(settings, invalid){
    const ready = RETRO.settings.ready(settings);
    get('run-note').textContent = invalid ? 'Resolve the highlighted settings error.' : ready.ok ? '' : ready.reason;
    run.disabled = !!active || !!invalid || !ready.ok;
  }

  const panel = RETRO.settingsUI.settingsUI(get('settings'), RETRO.settings, syncQuestion);
  get('settings').insertBefore(get('runbar'), get('settings').querySelector('.settings-advanced'));
  syncQuestion(panel.read(), !panel.valid());
  for (const button of document.querySelectorAll('[data-example]')) {
    button.addEventListener('click', () => {
      panel.set({ ...panel.read(), ...examples[button.dataset.example] });
      run.focus();
    });
  }

  function stepRow(step, index){
    const row = element('div', 'rstep');
    const body = element('div');
    const line = element('div', 'rmol');
    line.append(document.createTextNode(step.precursors.join(' + ')),
      element('span', 'rarrow', ' → '), document.createTextNode(step.product));
    const details = [step.name, ...step.reagents];
    if (step.conditions?.solvent) details.push(step.conditions.solvent);
    if (Number.isFinite(step.conditions?.temperature)) details.push(step.conditions.temperature + ' °C');
    body.append(line, element('div', 'rwhy', details.join(' · ')));
    const verdict = step.verdict;
    const label = !verdict?.checked ? 'Forward check unavailable or off'
      : verdict.selective ? 'Forward model reproduced the target without alternatives'
        : 'Forward model also predicts alternatives';
    const check = element('div', 'rcheck ' + (!verdict?.checked ? 'unchecked' : verdict.selective ? 'good' : 'mixed'), label);
    if (verdict?.alternatives?.length) check.append(document.createTextNode(' · ' + verdict.alternatives.join(', ')));
    body.append(check);
    row.append(element('span', 'rnum', String(index + 1)), body);
    return row;
  }

  function renderRoute(route, title, open){
    const card = element('details', 'route');
    card.open = open;
    card.append(element('summary', null, title));
    const checked = route.steps.filter(step => step.verdict?.checked).length;
    const mixed = route.steps.filter(step => step.verdict?.checked && !step.verdict.selective).length;
    card.append(element('p', 'rwhy', checked + '/' + route.steps.length + ' steps checked by the forward model'
      + (mixed ? ' · ' + mixed + ' with alternatives' : '')));
    route.steps.forEach((step, i) => card.append(stepRow(step, i)));
    card.append(element('h3', null, 'Starting materials'));
    const sources = route.sources || route.startsFrom.map(smiles => ({ smiles, source:'stock' }));
    for (const entry of new Map(sources.map(item => [item.smiles, item])).values()) {
      const material = element('div', 'route-source');
      material.append(element('code', null, entry.smiles), element('span', 'rwhy', entry.source));
      card.append(material);
    }
    return card;
  }

  function render(answer, settings){
    lastRun = { settings, result:answer };
    download.hidden = false;
    const timing = answer.seconds === undefined ? '' : ' · ' + answer.seconds + ' s';
    const stop = stopLabels[answer.stop] ? ' ' + stopLabels[answer.stop] : '';
    if (settings.mode === 'analogues') {
      setStatus(answer.ok
        ? answer.analogues.length + ' analogues · ' + answer.proposed + ' candidates above the similarity cutoff' + timing + '.' + stop
        : answer.reason + timing + '.', !answer.ok);
      answer.analogues.forEach((candidate, i) => {
        const title = candidate.smiles + ' · similarity ' + candidate.similarity.toFixed(3);
        const card = candidate.route ? renderRoute(candidate.route, title, i === 0) : element('div', 'route');
        if (!candidate.route) card.append(element('strong', 'rmol', title));
        const description = candidate.change + (candidate.source ? ' · ' + candidate.source
          : candidate.route ? '' : ' · route check off');
        if (candidate.route) card.querySelector('summary').after(element('p', 'rwhy', description));
        else card.append(element('p', 'rwhy', description));
        results.append(card);
      });
      return;
    }
    if (!answer.routes.length) {
      const explored = answer.explored === undefined ? '' : ' · ' + answer.explored + ' states explored';
      setStatus(answer.reason + (answer.source ? ' · ' + answer.source : '') + explored + timing + '.', !answer.ok);
      return;
    }
    setStatus(answer.routes.length + (answer.routes.length === 1 ? ' route' : ' routes')
      + ' · ' + answer.explored + ' states explored' + timing + '.' + stop);
    answer.routes.forEach((route, i) => {
      results.append(renderRoute(route, 'Route ' + (i + 1) + ' · ' + route.depth
        + (route.depth === 1 ? ' step' : ' steps') + ' · score ' + route.cost, i === 0));
    });
  }

  function finish(job, message){
    if (active !== job) return;
    job.worker?.terminate();
    active = null;
    cancel.hidden = true;
    syncQuestion(panel.read(), !panel.valid());
    if (message.type === 'result') render(message.result, job.settings);
    else setStatus(message.message, message.type === 'error');
  }

  function start(){
    if (active) return;
    const settings = panel.read();
    if (!panel.valid() || !RETRO.settings.ready(settings).ok) return;
    results.replaceChildren();
    download.hidden = true;
    lastRun = null;
    const job = { settings, worker:null };
    active = job;
    syncQuestion(settings);
    setStatus('Searching…');
    // Direct file opening remains supported by the synchronous engine.
    if (location.protocol === 'file:' || typeof Worker === 'undefined') {
      setStatus('Searching in this tab. Background search requires an HTTP page.');
      setTimeout(() => {
        try { finish(job, { type:'result', result:RETRO.run(settings) }); }
        catch (err) { finish(job, { type:'error', message:err.message }); }
      }, 30);
      return;
    }
    try {
      const worker = new Worker('js/worker.js');
      job.worker = worker;
      cancel.hidden = false;
      worker.onmessage = ({ data }) => {
        if (active !== job) return;
        if (data.type !== 'progress') { finish(job, data); return; }
        const p = data.progress;
        const visited = p.checked === undefined ? p.explored + ' states explored' : p.checked + ' candidates checked';
        setStatus('Searching… ' + visited + ' · ' + p.found + ' found · ' + (p.elapsedMs / 1000).toFixed(1) + ' s');
      };
      worker.onerror = () => finish(job, { type:'error', message:'The background search could not start.' });
      worker.postMessage(settings);
    } catch (err) {
      finish(job, { type:'error', message:err.message });
    }
  }

  run.addEventListener('click', start);
  get('set-target').addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.isComposing) return;
    event.preventDefault();
    event.target.blur();
    start();
  });
  cancel.addEventListener('click', () => {
    if (active) finish(active, { type:'cancelled', message:'Search cancelled.' });
  });
  download.addEventListener('click', () => {
    if (!lastRun) return;
    const blob = new Blob([JSON.stringify(lastRun, null, 2) + '\n'], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = element('a');
    anchor.href = url;
    anchor.download = 'retrosynth-' + lastRun.settings.mode + '.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  const theme = get('theme');
  function setTheme(value){
    document.body.dataset.theme = value;
    theme.textContent = value === 'dark' ? 'Light' : 'Dark';
  }
  try { setTheme(localStorage.getItem('project-index-theme') === 'light' ? 'light' : 'dark'); }
  catch (err) { void err; setTheme('dark'); }
  theme.addEventListener('click', () => {
    const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem('project-index-theme', next); } catch (err) { void err; }
  });
})();
