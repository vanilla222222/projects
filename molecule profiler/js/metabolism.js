'use strict';

const MET_BAND_MAJOR = 0.1;
const MET_BAND_MINOR = 0.02;

function metaboliteBand(score) {
  if (score >= MET_BAND_MAJOR) return 'major';
  if (score >= MET_BAND_MINOR) return 'minor';
  return 'trace';
}

const META_DEPTH = 2;
const META_FRAGMENT_FLOOR = 5;
const META_MAX_NODES = 120;
const META_PHASES = ['I', 'II'];

const META_KEY_ROUNDS = 4;

function metaboliteInvariant(mol, atom) {
  return [atom.element, atom.aromatic ? 1 : 0, atom.charge || 0, atom.totalH,
    atom.neighbors.length, atom.rings.length ? 1 : 0, atom.isotope || 0].join('|');
}

function metaboliteShells(mol) {
  let codes = mol.atoms.map((atom) => hash32(metaboliteInvariant(mol, atom)));
  const layers = [codes.slice()];
  for (let round = 1; round <= META_KEY_ROUNDS; round += 1) {
    const next = codes.slice();
    mol.atoms.forEach((atom, index) => {
      const pairs = atom.neighbors.map((link) => {
        const bond = mol.bonds[link.bond];
        return (bond.aromatic ? 4 : bond.order) + ':' + codes[link.atom];
      });
      pairs.sort();
      next[index] = hash32(round + '|' + codes[index] + '|' + pairs.join('|'));
    });
    codes = next;
    layers.push(codes.slice());
  }
  return layers;
}

function metaboliteKey(mol, d) {
  const parts = metaboliteShells(mol).map((layer) => layer.slice().sort((a, b) => a - b).join(','));
  return (d && d.formula ? d.formula : mol.atoms.length) + '|' + parts.join('/');
}

function metaboliteRecord(smiles) {
  const mol = buildMolecule(parseSmiles(smiles));
  const d = describe(mol);
  return { smiles: smiles, mol: mol, d: d, v: evaluate(d) };
}

function metaboliteFragments(result, diagnostics) {
  const pieces = [];
  result.fragments.forEach((smiles) => {
    let record = null;
    try { record = metaboliteRecord(smiles); } catch (error) { if(diagnostics)diagnostics.rejectedFragments++;return; }
    pieces.push(record);
  });
  if (!pieces.length) return { kept: [], released: [] };
  const kept = pieces.filter((piece) => piece.mol.atoms.length >= META_FRAGMENT_FLOOR);
  if (!kept.length) {
    let best = pieces[0];
    pieces.forEach((piece) => { if (piece.mol.atoms.length > best.mol.atoms.length) best = piece; });
    return { kept: [best], released: pieces.filter((piece) => piece !== best) };
  }
  return { kept: kept, released: pieces.filter((piece) => kept.indexOf(piece) === -1) };
}

function metabolicNotes(mol) {
  const found = [];
  METABOLIC_NOTES.forEach((entry) => {
    const matches = smartsMatches(compileSmarts(entry.smarts), mol, {});
    if (!matches.length) return;
    const atoms = [];
    matches.forEach((match) => match.forEach((index) => {
      if (atoms.indexOf(index) === -1) atoms.push(index);
    }));
    atoms.sort((a, b) => a - b);
    found.push({ name: entry.name, enzyme: entry.enzyme, note: entry.note, count: matches.length, atoms: atoms });
  });
  return found;
}

function metaboliteTox(record) {
  if (!record.tox) record.tox = toxScan(record);
  return record.tox;
}

function newToxHits(node, root) {
  const before = new Set();
  metaboliteTox(root).rows.forEach((row) => { if (row.count > 0) before.add(row.name); });
  return metaboliteTox(node).rows.filter((row) => row.count > 0 && !row.context && !before.has(row.name));
}

function metabolicTree(record, options) {
  const settings = options || {};
  const requestedDepth = settings.depth === undefined ? META_DEPTH : Number(settings.depth);
  if (!Number.isInteger(requestedDepth) || requestedDepth < 0 || requestedDepth > 3) throw new Error('Metabolism depth must be an integer from 0 to 3.');
  const depth = requestedDepth;
  const maxNodes = settings.maxNodes === undefined ? META_MAX_NODES : Number(settings.maxNodes);
  if (!Number.isInteger(maxNodes) || maxNodes < 1 || maxNodes > 500) throw new Error('Metabolism product budget must be an integer from 1 to 500.');
  const phases = settings.phases || META_PHASES;
  if (!Array.isArray(phases) || phases.some(p=>!META_PHASES.includes(p))) throw new Error('Unknown metabolic phase.');
  const rules = METABOLISM.filter((rule) => phases.indexOf(rule.phase) !== -1);

  const root = {
    id: 0,
    parent: null,
    depth: 0,
    name: record.name || 'parent',
    smiles: record.smiles,
    mol: record.mol,
    d: record.d,
    v: record.v,
    rule: null,
    enzyme: null,
    route: null,
    phase: null,
    weight: 1,
    score: 1,
    touched: [],
    released: [],
    children: [],
    steps: []
  };

  const nodes = [root];
  const byKey = new Map();
  byKey.set(metaboliteKey(record.mol, record.d), root);
  let truncated = false;

  const diagnostics={ruleApplications:0,transformMatches:0,rejectedTransforms:0,ruleErrors:[],
    revisitedProducts:0,rejectedFragments:0,candidatesDiscardedByCap:0,uniqueCandidatesByGeneration:[]};
  let frontier = [root];
  for (let level = 1; level <= depth; level += 1) {
    const candidates = new Map();
    for (const parent of frontier) {
      for (const rule of rules) {
        diagnostics.ruleApplications++;
        let results;
        const transformStats={};
        try { results=applyTransform(parent.mol,rule.smirks,transformStats); }
        catch(error) {diagnostics.ruleErrors.push({rule:rule.name,parent:parent.id,reason:error.message});continue;}
        diagnostics.transformMatches+=transformStats.matches||0;
        diagnostics.rejectedTransforms+=transformStats.rejected||0;
        for (const result of results) {
          const split=metaboliteFragments(result,diagnostics);
          for (const piece of split.kept) {
            const key=metaboliteKey(piece.mol,piece.d);
            const site=typeof siteScore==='function'?siteScore(parent.mol,rule,result.touched||[]):{factor:1,reasons:[],atom:null};
            const siteWeight=rule.weight*site.factor;
            const step={rule:rule.name,enzyme:rule.enzyme,route:rule.route,phase:rule.phase,
              weight:siteWeight,ruleWeight:rule.weight,siteFactor:site.factor,siteReasons:site.reasons,
              siteAtom:site.atom,note:rule.note,from:parent.id,generation:level,routeScore:parent.score*siteWeight};
            const seen=byKey.get(key);
            if(seen) {
              if(seen!==root && seen!==parent) {
                diagnostics.revisitedProducts++;
                if(!seen.steps.some(s=>s.rule===step.rule&&s.from===step.from&&s.siteAtom===step.siteAtom))seen.steps.push(step);
              }
              // Do not recycle a deeper route back through a previously expanded
              // node. Its representative score/path stays internally consistent.
              continue;
            }
            const candidate={key,piece,parent,rule,site,siteWeight,step,result,split,score:step.routeScore};
            const old=candidates.get(key);
            if(!old)candidates.set(key,{best:candidate,steps:[step]});
            else {
              if(!old.steps.some(s=>s.rule===step.rule&&s.from===step.from&&s.siteAtom===step.siteAtom))old.steps.push(step);
              if(candidate.score>old.best.score || (candidate.score===old.best.score &&
                (rule.name+'::'+parent.id)<(old.best.rule.name+'::'+old.best.parent.id)))old.best=candidate;
            }
          }
        }
      }
    }
    const ordered=[...candidates.values()].sort((a,b)=>b.best.score-a.best.score||a.best.key.localeCompare(b.best.key));
    diagnostics.uniqueCandidatesByGeneration.push({generation:level,candidates:ordered.length});
    const slots=Math.max(0,maxNodes-nodes.length);
    if(ordered.length>slots){truncated=true;diagnostics.candidatesDiscardedByCap+=ordered.length-slots;}
    const next=[];
    for(const candidate of ordered.slice(0,slots)) {
      const {best:c,steps}=candidate;
      const node={id:nodes.length,parent:c.parent.id,depth:level,name:c.rule.name,smiles:c.piece.smiles,
        mol:c.piece.mol,d:c.piece.d,v:c.piece.v,rule:c.rule.name,enzyme:c.rule.enzyme,route:c.rule.route,
        phase:c.rule.phase,weight:c.siteWeight,ruleWeight:c.rule.weight,siteFactor:c.site.factor,
        siteReasons:c.site.reasons,siteAtom:c.site.atom,score:c.score,touched:c.result.touched||[],
        released:c.split.released.map(piece=>piece.smiles),children:[],steps:[c.step,...steps.filter(step=>step!==c.step)]};
      byKey.set(c.key,node);nodes.push(node);c.parent.children.push(node.id);next.push(node);
    }
    frontier=next;
    if(!frontier.length)break;
    if(nodes.length>=maxNodes && level<depth){truncated=true;break;}
  }

  const metabolites = nodes.slice(1);
  metabolites.forEach((node) => {
    node.newTox = settings.includeToxicity===false?[]:newToxHits(node, root);
    node.toxHits = settings.includeToxicity===false?[]:metaboliteTox(node).hits;
  });
  metabolites.sort((a, b) => b.score - a.score || a.depth - b.depth);

  const enzymes = new Map();
  metabolites.forEach((node) => {
    if (!enzymes.has(node.enzyme)) enzymes.set(node.enzyme, { enzyme: node.enzyme, count: 0, weight: 0 });
    const row = enzymes.get(node.enzyme);
    row.count += 1;
    row.weight += node.score;
  });
  const routes = [...enzymes.values()].sort((a, b) => b.weight - a.weight);

  return {
    root: root,
    nodes: nodes,
    metabolites: metabolites,
    routes: routes,
    notes: metabolicNotes(record.mol),
    depth: depth,
    phaseI: metabolites.filter((node) => node.phase === 'I').length,
    phaseII: metabolites.filter((node) => node.phase === 'II').length,
    rulesTried: rules.length,
    truncated: truncated,
    diagnostics, maxNodes, toxicityIncluded:settings.includeToxicity!==false,
    rankingPolicy:'Generation-wise best-relative-weight selection; representative route is best among shortest-generation routes. Deeper revisits do not recycle scores.',
    identityScope:'Graph-hash grouping is approximate and does not establish stereochemical identity.'
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    META_DEPTH, META_FRAGMENT_FLOOR, META_MAX_NODES,
    META_KEY_ROUNDS, MET_BAND_MAJOR, MET_BAND_MINOR,
    metaboliteKey, metaboliteShells, metaboliteRecord, metaboliteFragments,
    metabolicNotes, metabolicTree, newToxHits, metaboliteBand
  };
}
