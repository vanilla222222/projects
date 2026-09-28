const PUBCHEM_BASE = 'https://pubchem.ncbi.nlm.nih.gov/rest';
const PUBCHEM_TRAITS = [
  ['Physical description', 'Physical+Description'],
  ['Melting point', 'Melting+Point'],
  ['Boiling point', 'Boiling+Point'],
  ['Density', 'Density'],
  ['Solubility', 'Solubility'],
  ['Vapor pressure', 'Vapor+Pressure'],
  ['Flash point', 'Flash+Point'],
  ['LogP (measured)', 'LogP'],
  ['pKa', 'Dissociation+Constants'],
  ['Refractive index', 'Refractive+Index'],
];
const PUBCHEM_EXTRA_HEADINGS = [
  'GHS+Classification', 'Mechanism+of+Action', 'ATC+Code', 'Drug+Classes',
  'MeSH+Pharmacological+Classification', 'Toxicity+Summary', 'Non-Human+Toxicity+Values',
  'Human+Toxicity+Values', 'Spectral+Information',
];
const pubchemCache = new Map();
const chemblCache = new Map();

function pubchemInfos(record) {
  const out = [];
  const walk = (section, path) => {
    (section.Information || []).forEach((info) => {
      const v = info.Value || {};
      const strings = (v.StringWithMarkup || []).map((x) => x.String);
      const extras = [];
      (v.StringWithMarkup || []).forEach((x) => (x.Markup || []).forEach((m) => {
        if (m.Extra) {
          extras.push(m.Extra);
        }
      }));
      out.push({ name: info.Name || null, path, strings, extras });
    });
    (section.Section || []).forEach((child) => walk(child, path.concat(child.TOCHeading)));
  };
  walk((record && record.Record) || {}, []);
  return out;
}

function pubchemSubheadings(record) {
  const names = [];
  const walk = (section) => (section.Section || []).forEach((child) => {
    if (child.Information && child.Information.length) {
      names.push(child.TOCHeading);
    }
    walk(child);
  });
  walk((record && record.Record) || {});
  return names;
}

function pubchemClip(text, limit) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > limit ? clean.slice(0, limit - 1) + '\u2026' : clean;
}

function pubchemSafety(record) {
  if (!record) {
    return null;
  }
  const infos = pubchemInfos(record);
  const pick = (name) => infos.filter((i) => i.name === name);
  const signal = pick('Signal')[0];
  const hazards = [];
  pick('GHS Hazard Statements').forEach((i) => i.strings.forEach((t) => {
    const clean = t.replace(/\s*\(\d+(\.\d+)?%\)/, '');
    if (/^H\d{3}/.test(clean) && !hazards.some((h) => h.slice(0, 4) === clean.slice(0, 4))) {
      hazards.push(pubchemClip(clean, 110));
    }
  }));
  const pictograms = [];
  pick('Pictogram(s)').forEach((i) => i.extras.forEach((x) => {
    if (!pictograms.includes(x)) {
      pictograms.push(x);
    }
  }));
  if (!signal && !hazards.length) {
    return null;
  }
  return { signal: signal ? signal.strings[0] : null, pictograms, hazards: hazards.slice(0, 8) };
}

function pubchemToxicity(summary, nonHuman, human) {
  const values = [];
  [nonHuman, human].forEach((record) => {
    if (record) {
      pubchemInfos(record).forEach((i) => i.strings.forEach((t) => {
        if (/LD50|LC50|LDLo|TDLo|LD|LC/.test(t)) {
          values.push(pubchemClip(t, 130));
        }
      }));
    }
  });
  const text = summary ? pubchemInfos(summary).map((i) => i.strings[0]).filter(Boolean)[0] : null;
  return { summary: text ? pubchemClip(text, 420) : null, values: values.slice(0, 5) };
}

function pubchemPharmacology(mech, atc, classes, mesh) {
  const mechanism = mech ? pubchemInfos(mech).map((i) => i.strings[0]).filter(Boolean).slice(0, 2).map((t) => pubchemClip(t, 380)) : [];
  const atcCodes = [];
  if (atc) {
    pubchemInfos(atc).forEach((i) => i.strings.forEach((t) => {
      if (/^[A-Z]\d{2}[A-Z]{2}\d{2}$/.test(t.trim()) && !atcCodes.includes(t.trim())) {
        atcCodes.push(t.trim());
      }
    }));
  }
  const drugClasses = [];
  if (classes) {
    pubchemInfos(classes).forEach((i) => i.strings.forEach((t) => t.split(/;\s*/).forEach((c) => {
      if (c && !drugClasses.includes(c)) {
        drugClasses.push(c);
      }
    })));
  }
  const meshClasses = mesh ? pubchemInfos(mesh).map((i) => i.name).filter(Boolean) : [];
  return { mechanism, atc: atcCodes.slice(0, 4), classes: drugClasses.slice(0, 8), mesh: meshClasses.slice(0, 8) };
}

function pubchemFindCas(names) {
  return names.find((n) => /^\d{2,7}-\d{2}-\d$/.test(n)) || null;
}

async function receptorData(chemblIds, inchikey) {
  const cacheKey = chemblIds.join(',') + '|' + inchikey;
  if (chemblCache.has(cacheKey)) {
    return chemblCache.get(cacheKey);
  }
  const result = { drug: null, mechanisms: [], ki: [], chemblId: null, kiError: null };
  const base = 'https://www.ebi.ac.uk/chembl/api/data/';
  const ids = chemblIds.slice();
  const bindingIds = [];
  try {
    const mol = await pubchemJson(base + 'molecule.json?molecule_structures__standard_inchi_key__startswith=' + inchikey.split('-')[0] + '&limit=6');
    ((mol && mol.molecules) || []).forEach((m) => {
      bindingIds.push(m.molecule_chembl_id);
      if (!ids.includes(m.molecule_chembl_id)) {
        ids.push(m.molecule_chembl_id);
      }
    });
  } catch (error) {
    result.kiError = error.message;
  }
  if (ids.length) {
    const fields = 'name maximumClinicalStage mechanismsOfAction { rows { mechanismOfAction actionType targets { approvedSymbol approvedName } } }';
    const query = '{ ' + ids.map((id, i) => 'd' + i + ': drug(chemblId: "' + id + '") { ' + fields + ' }').join(' ') + ' }';
    const response = await fetch('https://api.platform.opentargets.org/api/v4/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) {
      throw new Error('Open Targets returned ' + response.status);
    }
    const data = (await response.json()).data || {};
    ids.forEach((id, i) => {
      const drug = data['d' + i];
      if (drug && !result.drug) {
        result.drug = { name: drug.name, stage: drug.maximumClinicalStage };
        result.chemblId = id;
        ((drug.mechanismsOfAction && drug.mechanismsOfAction.rows) || []).forEach((row) => {
          result.mechanisms.push({
            text: row.mechanismOfAction,
            action: row.actionType,
            targets: row.targets.map((t) => t.approvedSymbol + ' (' + t.approvedName + ')'),
          });
        });
      }
    });
  }
  try {
    const best = new Map();
    for (const id of bindingIds.slice(0, 3)) {
      const acts = await pubchemJson(base + 'activity.json?molecule_chembl_id=' + id + '&standard_type=Ki&limit=500');
      ((acts && acts.activities) || []).forEach((a) => {
        const value = Number(a.standard_value);
        if (a.target_pref_name && isFinite(value) && a.standard_units === 'nM' && a.target_organism === 'Homo sapiens') {
          const prev = best.get(a.target_pref_name);
          if (prev === undefined || value < prev) {
            best.set(a.target_pref_name, value);
          }
        }
      });
    }
    result.ki = Array.from(best.entries()).sort((x, y) => x[1] - y[1]).slice(0, 12).map(([target, nM]) => ({ target, nM }));
  } catch (error) {
    result.kiError = error.message;
  }
  chemblCache.set(cacheKey, result);
  return result;
}

let pubchemActive = 0;
const pubchemWaiting = [];

async function pubchemSlot() {
  if (pubchemActive >= 3) {
    await new Promise((resolve) => pubchemWaiting.push(resolve));
  }
  pubchemActive += 1;
}

function pubchemRelease() {
  pubchemActive -= 1;
  const next = pubchemWaiting.shift();
  if (next) {
    next();
  }
}

async function pubchemJson(url) {
  await pubchemSlot();
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await fetch(url);
      if (response.status === 404) {
        return null;
      }
      if (response.status === 429 || response.status >= 500) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
        continue;
      }
      if (!response.ok) {
        throw new Error('PubChem returned ' + response.status);
      }
      return await response.json();
    }
    throw new Error('PubChem is busy, try again shortly');
  } finally {
    pubchemRelease();
  }
}

function pubchemValues(record) {
  const found = [];
  const walk = (section) => {
    (section.Information || []).forEach((info) => {
      const v = info.Value;
      if (!v) {
        return;
      }
      if (v.StringWithMarkup && v.StringWithMarkup[0]) {
        found.push(v.StringWithMarkup[0].String);
      } else if (v.Number && v.Number.length) {
        found.push(v.Number[0] + (v.Unit ? ' ' + v.Unit : ''));
      }
    });
    (section.Section || []).forEach(walk);
  };
  walk(record.Record || {});
  const unique = [];
  found.forEach((text) => {
    const clean = text.replace(/\s+/g, ' ').trim().slice(0, 140);
    if (clean && !unique.includes(clean)) {
      unique.push(clean);
    }
  });
  const rank = (t) => (/°F|\(NTP|USCG/.test(t) ? 1 : 0);
  return unique.sort((a, b) => rank(a) - rank(b)).slice(0, 3);
}

async function pubchemLookup(smiles) {
  if (pubchemCache.has(smiles)) {
    return pubchemCache.get(smiles);
  }
  const encoded = encodeURIComponent(smiles);
  const ids = await pubchemJson(PUBCHEM_BASE + '/pug/compound/smiles/' + encoded + '/cids/JSON');
  const cid = ids && ids.IdentifierList && ids.IdentifierList.CID && ids.IdentifierList.CID[0];
  if (!cid || cid === 0) {
    const missing = { found: false };
    pubchemCache.set(smiles, missing);
    return missing;
  }
  const propNames = 'IUPACName,Title,XLogP,Complexity,Charge,InChIKey,InChI,MolecularFormula';
  const view = (heading) => pubchemJson(PUBCHEM_BASE + '/pug_view/data/compound/' + cid + '/JSON?heading=' + heading).catch(() => null);
  const [props, synonyms, ...records] = await Promise.all([
    pubchemJson(PUBCHEM_BASE + '/pug/compound/cid/' + cid + '/property/' + propNames + '/JSON'),
    pubchemJson(PUBCHEM_BASE + '/pug/compound/cid/' + cid + '/synonyms/JSON'),
  ].concat(PUBCHEM_TRAITS.map(([, heading]) => view(heading))).concat(PUBCHEM_EXTRA_HEADINGS.map(view)));
  const traitRecords = records.slice(0, PUBCHEM_TRAITS.length);
  const [ghs, mech, atc, classes, mesh, toxSummary, toxNonHuman, toxHuman, spectra] = records.slice(PUBCHEM_TRAITS.length);
  const row = (props && props.PropertyTable && props.PropertyTable.Properties[0]) || {};
  const names = (synonyms && synonyms.InformationList && synonyms.InformationList.Information[0].Synonym) || [];
  const traits = [];
  PUBCHEM_TRAITS.forEach(([label], i) => {
    const values = traitRecords[i] ? pubchemValues(traitRecords[i]) : [];
    if (values.length) {
      traits.push({ label, values });
    }
  });
  const title = row.Title || null;
  const result = {
    found: true,
    cid,
    title,
    iupac: row.IUPACName || null,
    formula: row.MolecularFormula || null,
    xlogp: row.XLogP,
    complexity: row.Complexity,
    charge: row.Charge,
    inchikey: row.InChIKey || null,
    inchi: row.InChI || null,
    cas: pubchemFindCas(names),
    chemblIds: names.filter((n) => /^CHEMBL\d+$/.test(n)).slice(0, 6),
    synonyms: names.filter((n) => n !== title).slice(0, 5),
    traits,
    safety: pubchemSafety(ghs),
    toxicity: pubchemToxicity(toxSummary, toxNonHuman, toxHuman),
    pharmacology: pubchemPharmacology(mech, atc, classes, mesh),
    spectra: spectra ? pubchemSubheadings(spectra).slice(0, 8) : [],
  };
  pubchemCache.set(smiles, result);
  return result;
}
