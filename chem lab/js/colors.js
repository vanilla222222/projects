const ELEMENT_COLORS = {
  C: '#cbd5e1',
  N: '#4f8ff7',
  O: '#f0483e',
  S: '#f5c542',
  P: '#ff9f43',
  D: '#94a3b8',
  F: '#2dd4bf',
  Cl: '#4ade80',
  Br: '#d9823b',
  I: '#a855f7',
  B: '#fb7185',
  Si: '#e2b17a',
  Se: '#fbbf24',
  Li: '#c084fc',
  Na: '#818cf8',
  K: '#e879f9',
  Cs: '#a78bfa',
  Mg: '#86efac',
  Ca: '#fda4af',
  Zn: '#94a3b8',
  Sn: '#cbd5e1',
};

const ELEMENT_COLORS_LIGHT = {
  C: '#1e293b',
  N: '#2563eb',
  O: '#dc2626',
  S: '#b7791f',
  P: '#ea580c',
  D: '#64748b',
  F: '#0d9488',
  Cl: '#16a34a',
  Br: '#92400e',
  I: '#7e22ce',
  B: '#be123c',
  Si: '#92400e',
  Se: '#a16207',
  Li: '#7c3aed',
  Na: '#4338ca',
  K: '#a21caf',
  Cs: '#6d28d9',
  Mg: '#15803d',
  Ca: '#be185d',
  Zn: '#475569',
  Sn: '#334155',
};

const ELEMENT_CATEGORY_COLORS = {
  alkali: '#c4b5fd',
  alkaline: '#86efac',
  transition: '#93c5fd',
  'post-transition': '#a5b4c8',
  metalloid: '#e2b17a',
  nonmetal: '#e5e7eb',
  halogen: '#5eead4',
  noble: '#67e8f9',
  lanthanide: '#f9a8d4',
  actinide: '#fca5a5',
};

const ELEMENT_CATEGORY_COLORS_LIGHT = {
  alkali: '#6d28d9',
  alkaline: '#15803d',
  transition: '#1d4ed8',
  'post-transition': '#475569',
  metalloid: '#92400e',
  nonmetal: '#334155',
  halogen: '#0f766e',
  noble: '#0e7490',
  lanthanide: '#be185d',
  actinide: '#b91c1c',
};

fillElementTable(ELEMENT_COLORS, (element) => ELEMENT_CATEGORY_COLORS[element.category]);
fillElementTable(ELEMENT_COLORS_LIGHT, (element) => ELEMENT_CATEGORY_COLORS_LIGHT[element.category]);

function colorForElement(element, theme) {
  const palette = theme === 'light' ? ELEMENT_COLORS_LIGHT : ELEMENT_COLORS;
  return Object.prototype.hasOwnProperty.call(palette, element)
    ? palette[element]
    : palette.C;
}
