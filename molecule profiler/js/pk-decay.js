// A conditional elimination curve, not an effect-strength or dose prediction.
const PK_DECAY_SOURCE = {
  title: 'An ABC of PK/PD: Half-life of elimination',
  url: 'https://pressbooks.openeducationalberta.ca/abcofpkpd/chapter/half-life-elim/'
};

function pkDecayRemaining(timeHours, halfLifeHours) {
  const time = Number(timeHours), halfLife = Number(halfLifeHours);
  if (!Number.isFinite(time) || time < 0 || !Number.isFinite(halfLife) || halfLife <= 0) {
    throw new Error('Time must be finite and nonnegative; half-life must be finite and positive.');
  }
  return 100 * Math.exp(-Math.LN2 * (time / halfLife));
}

function pkDecayCurve(options) {
  const input = options || {}, halfLife = Number(input.halfLifeHours);
  const horizon = input.horizonHalfLives === undefined ? 4 : Number(input.horizonHalfLives);
  const points = input.points === undefined ? 121 : Number(input.points);
  if (!Number.isFinite(halfLife) || halfLife <= 0) throw new Error('A positive finite half-life in hours is required.');
  if (!Number.isFinite(horizon) || horizon <= 0 || horizon > 20) throw new Error('Use a horizon greater than zero and at most 20 half-lives.');
  if (!Number.isInteger(points) || points < 2 || points > 1001) throw new Error('Use 2–1001 curve points.');
  const endHours = halfLife * horizon;
  if (!Number.isFinite(endHours) || endHours <= 0) throw new Error('The time horizon is outside the numerical range.');
  let interval = null;
  if (input.intervalHours !== undefined && input.intervalHours !== null) {
    if (!Array.isArray(input.intervalHours) || input.intervalHours.length !== 2) throw new Error('The half-life interval needs two endpoints.');
    const [low, high] = input.intervalHours.map(Number);
    if (!Number.isFinite(low) || !Number.isFinite(high) || low <= 0 || low > halfLife || high < halfLife) {
      throw new Error('The positive half-life interval must contain the central half-life.');
    }
    interval = [low, high];
  }
  return {
    halfLifeHours: halfLife, horizonHalfLives: horizon, endHours, intervalHours: interval,
    assumption: 'Single-compartment, first-order elimination after an instantaneous initial systemic exposure; 100% is the starting amount.',
    limitation: 'Remaining parent amount is not subjective effect strength, duration of action, a measured concentration or an individual prediction. Absorption, repeated exposure, active metabolites and nonlinear kinetics are not modeled.',
    bandMeaning: interval ? 'The shaded envelope propagates the supplied half-life endpoints mathematically. It is not a validated concentration interval and adds no coverage guarantee.' : null,
    rows: Array.from({length: points}, (_, i) => {
      const timeHours = endHours * (i / (points - 1));
      return {
        timeHours, remainingPercent: pkDecayRemaining(timeHours, halfLife),
        lowerPercent: interval ? pkDecayRemaining(timeHours, interval[0]) : null,
        upperPercent: interval ? pkDecayRemaining(timeHours, interval[1]) : null
      };
    })
  };
}

function pkDecayCsv(curve, metadata) {
  if (!curve || !Array.isArray(curve.rows)) return '';
  const meta = metadata || {};
  const escape = value => {
    let text = String(value === undefined || value === null ? '' : value);
    if (/^\s*[=+@-]/.test(text) && !/^\s*-?\d+(?:\.\d+)?(?:e[+-]?\d+)?\s*$/i.test(text)) text = "'" + text;
    return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  };
  const rows = [
    ['Subject', meta.subjectLabel || 'Selected molecule'], ['Source', meta.sourceLabel || 'Supplied half-life'],
    ['Evidence', meta.evidenceLabel || 'Conditional calculation'], ['Half-life (h)', curve.halfLifeHours],
    ['Half-life interval low (h)', curve.intervalHours && curve.intervalHours[0]],
    ['Half-life interval high (h)', curve.intervalHours && curve.intervalHours[1]],
    ['Assumption', curve.assumption], ['Limitation', curve.limitation],
    ['Envelope meaning', curve.bandMeaning || 'No half-life interval supplied'], [],
    ['Time (h)', 'Parent amount remaining (%)', 'Lower envelope (%)', 'Upper envelope (%)']
  ];
  curve.rows.forEach(row => rows.push([row.timeHours, row.remainingPercent, row.lowerPercent, row.upperPercent]));
  return rows.map(row => row.map(escape).join(',')).join('\r\n');
}

let pkDecayViewCount = 0;
function createPKDecayView(container) {
  if (!container || !container.ownerDocument) throw new Error('A DOM container is required for the elimination curve.');
  const doc = container.ownerDocument, uid = 'pk-decay-' + (++pkDecayViewCount);
  const make = (tag, text) => { const node = doc.createElement(tag); if (text !== undefined) node.textContent = text; return node; };
  const svgNode = (tag, attrs, text) => {
    const node = doc.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs || {}).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const root = make('section'); root.className = 'pk-decay-view'; root.setAttribute('aria-label', 'Conditional parent elimination curve');
  const heading = make('h3', 'Estimated parent amount remaining over time');
  const status = make('p'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const provenance = make('p'); provenance.className = 'note';
  const controls = make('div'); controls.className = 'tgt-controls';
  const horizonLabel = make('label', 'Time window '), horizon = make('select'); horizon.setAttribute('aria-label', 'Elimination curve time window');
  [1, 2, 4, 8, 12].forEach(value => { const option = make('option', value + ' half-lives'); option.value = String(value); horizon.appendChild(option); });
  horizon.value = '4'; horizonLabel.appendChild(horizon);
  const download = make('button', 'Download curve CSV'); download.type = 'button';
  controls.append(horizonLabel, download);
  const figure = make('figure'); figure.style.margin = '1rem 0';
  const graph = svgNode('svg', {viewBox:'0 0 660 330', role:'img', 'aria-labelledby':uid+'-title '+uid+'-description'});
  graph.style.width = '100%'; graph.style.height = 'auto'; graph.style.display = 'block';
  const caption = make('figcaption'); caption.className = 'note'; figure.append(graph, caption);
  const caveat = make('p', 'This graph shows a conditional percentage of the parent compound remaining, not how strong its effects feel. It assumes instantaneous systemic exposure followed by first-order elimination in one compartment. Oral absorption, distribution phases, repeat exposure, active metabolites and nonlinear elimination can give different curves.'); caveat.className = 'hint';
  const details = make('details'), summary = make('summary', 'View numerical milestones');
  const scroll = make('div'); scroll.className = 'table-scroll';
  const table = make('table'), tableCaption = make('caption'), thead = make('thead'), header = make('tr'), tbody = make('tbody');
  ['Time (h)', 'Amount remaining (%)', 'Lower envelope (%)', 'Upper envelope (%)'].forEach(text => { const th = make('th', text); th.setAttribute('scope','col'); header.appendChild(th); });
  thead.appendChild(header); table.append(tableCaption, thead, tbody); scroll.appendChild(table); details.append(summary, scroll);
  const source = make('a', PK_DECAY_SOURCE.title); source.href = PK_DECAY_SOURCE.url; source.target = '_blank'; source.rel = 'noopener noreferrer';
  const sourceLine = make('p'); sourceLine.className = 'note'; sourceLine.append(source);
  root.append(heading, status, provenance, controls, figure, caveat, details, sourceLine); container.replaceChildren(root);
  let estimate = null, currentCurve = null;
  const number = value => value === null ? '—' : (value !== 0 && Math.abs(value) < 0.001 || Math.abs(value) >= 100000 ? value.toExponential(2) : Number(value.toFixed(3)).toString());
  const render = () => {
    graph.replaceChildren(); tbody.replaceChildren();
    if (!estimate) {
      currentCurve = null; root.removeAttribute('data-subject');
      status.textContent = 'No supported half-life is available for this molecule. Supply a positive half-life or pharmacokinetic scenario to draw a conditional curve.';
      provenance.textContent = ''; figure.hidden = true; details.hidden = true; download.disabled = true; horizon.disabled = true; return;
    }
    currentCurve = pkDecayCurve({...estimate, horizonHalfLives:Number(horizon.value)});
    root.setAttribute('data-subject', estimate.subjectKey || '');
    figure.hidden = false; details.hidden = false; download.disabled = false; horizon.disabled = false;
    status.textContent = (estimate.subjectLabel || 'Selected molecule') + ': half-life used = ' + number(currentCurve.halfLifeHours) + ' h.';
    provenance.textContent = [estimate.sourceLabel || 'Supplied half-life', estimate.evidenceLabel || 'Conditional calculation', estimate.contextLabel].filter(Boolean).join(' · ');
    caption.textContent = currentCurve.bandMeaning || 'One conditional decay line; no half-life interval was supplied.';
    tableCaption.textContent = (estimate.subjectLabel || 'Selected molecule') + ' — conditional elimination milestones';
    graph.append(svgNode('title',{id:uid+'-title'},'Parent amount remaining over time'), svgNode('desc',{id:uid+'-description'},'A normalized first-order elimination curve. Half-life '+number(currentCurve.halfLifeHours)+' hours. It does not estimate subjective effect strength. Numerical milestones follow the graph.'));
    const left = 68, top = 22, width = 562, height = 244;
    [0,25,50,75,100].forEach(value => {
      const y = top + height*(1-value/100);
      graph.append(svgNode('line',{x1:left,y1:y,x2:left+width,y2:y,stroke:'currentColor','stroke-opacity':0.15}),svgNode('text',{x:left-10,y:y+4,'text-anchor':'end',fill:'currentColor','font-size':12},value+'%'));
    });
    for(let i=0;i<=4;i++){
      const x = left + width*i/4;
      graph.append(svgNode('text',{x,y:top+height+22,'text-anchor':'middle',fill:'currentColor','font-size':12},number(currentCurve.endHours*i/4)));
    }
    graph.append(svgNode('text',{x:left+width/2,y:322,'text-anchor':'middle',fill:'currentColor','font-size':13},'Time (hours)'),svgNode('text',{x:18,y:top+height/2,transform:'rotate(-90 18 '+(top+height/2)+')','text-anchor':'middle',fill:'currentColor','font-size':13},'Parent amount remaining (%)'));
    const pathFor = (rows,key,reverse) => (reverse ? rows.slice().reverse() : rows).map((row,index) => (index?'L':'M')+(left+width*(row.timeHours/currentCurve.endHours)).toFixed(3)+','+(top+height*(1-row[key]/100)).toFixed(3)).join(' ');
    if(currentCurve.intervalHours){
      const upper = pathFor(currentCurve.rows,'upperPercent'), lower = pathFor(currentCurve.rows,'lowerPercent',true).replace(/^M/,'L');
      graph.append(svgNode('path',{d:upper+' '+lower+' Z',fill:'#51c4cf','fill-opacity':0.19,stroke:'none'}));
    }
    graph.append(svgNode('path',{d:pathFor(currentCurve.rows,'remainingPercent'),fill:'none',stroke:'#51c4cf','stroke-width':3}));
    const milestones = [0,0.5,1,2,3,4,6,8,12].filter(value=>value<=currentCurve.horizonHalfLives);
    if(!milestones.includes(currentCurve.horizonHalfLives))milestones.push(currentCurve.horizonHalfLives);
    milestones.forEach(value=>{
      const time = value*currentCurve.halfLifeHours, row = make('tr');
      const values = [time,pkDecayRemaining(time,currentCurve.halfLifeHours),currentCurve.intervalHours?pkDecayRemaining(time,currentCurve.intervalHours[0]):null,currentCurve.intervalHours?pkDecayRemaining(time,currentCurve.intervalHours[1]):null];
      values.forEach(value=>row.appendChild(make('td',number(value)))); tbody.appendChild(row);
    });
  };
  horizon.addEventListener('change',render);
  download.addEventListener('click',()=>{
    if(!currentCurve)return;
    const win = doc.defaultView || globalThis, url = win.URL.createObjectURL(new win.Blob([pkDecayCsv(currentCurve,estimate)],{type:'text/csv;charset=utf-8'}));
    const anchor = make('a'); anchor.href=url; anchor.download='parent-elimination-curve.csv'; anchor.click();
    win.setTimeout(()=>win.URL.revokeObjectURL(url),1000);
  });
  render();
  return {
    setEstimate(value) {
      // Validate first, but clear a stale previous subject even when new data
      // are invalid. A failing estimate must never leave the old curve visible.
      const previousSubject = estimate && estimate.subjectKey;
      estimate = null; currentCurve = null;
      try {
        const validated = pkDecayCurve(value);
        estimate = {...value,halfLifeHours:validated.halfLifeHours,intervalHours:validated.intervalHours&&validated.intervalHours.slice()};
        if(previousSubject !== value.subjectKey)horizon.value='4';
      } catch(error) { render(); status.textContent='Curve unavailable: '+error.message; return false; }
      render(); return true;
    },
    clear(message) { estimate=null; currentCurve=null; horizon.value='4'; render(); if(message)status.textContent=String(message); },
    getData() { return currentCurve ? JSON.parse(JSON.stringify({...currentCurve,metadata:estimate})) : null; },
    csv() { return currentCurve ? pkDecayCsv(currentCurve,estimate) : ''; },
    destroy() { estimate=null; currentCurve=null; container.replaceChildren(); }
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = {pkDecayRemaining,pkDecayCurve,pkDecayCsv,createPKDecayView};
