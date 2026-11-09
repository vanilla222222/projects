'use strict';

importScripts('registry.js', 'elements.js', 'settings.js', 'molecule.js', 'smiles.js',
  'groups.js', 'transforms.js', 'stock.js', 'forward.js', 'search.js', 'analogues.js', 'run.js');

self.onmessage = ({ data }) => {
  try {
    const result = RETRO.run(data, progress => self.postMessage({ type:'progress', progress }));
    self.postMessage({ type:'result', result });
  } catch (err) {
    self.postMessage({ type:'error', message:err.message });
  }
};
