'use strict';
// Yield between unchanged, synchronous molecule calculations. This is not a
// worker: one expensive molecule can still block until its calculation returns.
(function(root) {
  async function run(items, processItem, options) {
    const o = options || {};
    const now = o.now || (() => performance.now());
    const yieldControl = o.yieldControl || (() => new Promise(resolve => setTimeout(resolve, 0)));
    const cancelled = o.isCancelled || (() => false);
    const progress = o.onProgress || (() => {});
    const budget = Number.isFinite(o.budgetMs) && o.budgetMs > 0 ? o.budgetMs : 12;
    const limit = Number.isInteger(o.chunkSize) && o.chunkSize > 0 ? o.chunkSize : 25;
    let completed = 0;
    progress(completed, items.length);
    // Give the browser an opportunity to display progress before calculations.
    await yieldControl();
    while (completed < items.length && !cancelled()) {
      const started = now();
      let inChunk = 0;
      do {
        processItem(items[completed], completed);
        completed += 1;
        inChunk += 1;
      } while (completed < items.length && !cancelled() && inChunk < limit && now() - started < budget);
      progress(completed, items.length);
      if (completed < items.length && !cancelled()) await yieldControl();
    }
    return {completed, total:items.length, cancelled:cancelled()};
  }
  const api = {run};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CooperativeBatch = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
