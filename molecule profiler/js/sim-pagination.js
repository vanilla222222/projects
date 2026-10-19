'use strict';
// Pure ranked-result pagination; does not recalculate fingerprints or alter rankings.
(function(root) {
  function paginateRanked(items, count, page, allPageSize) {
    const rows = Array.isArray(items) ? items : [];
    const requested = Number(count);
    const total = Number.isFinite(requested) && requested > 0 ? Math.min(rows.length, Math.floor(requested)) : rows.length;
    const pageSize = Number.isFinite(requested) && requested > 0 ? Math.min(total || 1, Math.floor(requested)) : (Number(allPageSize) > 0 ? Math.floor(Number(allPageSize)) : 50);
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const rawPage = Number(page);
    const selected = Number.isFinite(rawPage) ? Math.max(1, Math.min(pages, Math.floor(rawPage))) : 1;
    const start = (selected - 1) * pageSize;
    return { rows: rows.slice(start, Math.min(total, start + pageSize)), total, page: selected, pages, start,
      pageSize, from: total ? start + 1 : 0, to: total ? Math.min(start + pageSize, total) : 0 };
  }
  const api = { paginateRanked };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SimPagination = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
