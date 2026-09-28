'use strict';
// Shared statement-splitter: scans a defs-*.js source file and returns every
// top-level `addAchievement(...)`/`addTierSet(...)` call as {start, end, text},
// where end is just past the trailing ';' (and any immediately trailing
// whitespace up to and including the next newline, so removal doesn't leave
// a blank line gap... actually we keep the newline removal separate so
// callers can choose). Depth-tracking respects string literals so a paren
// inside a quoted string never miscounts.
function splitCalls(src) {
  const calls = [];
  const startRe = /^(addAchievement|addTierSet)\(/gm;
  let m;
  while ((m = startRe.exec(src))) {
    const start = m.index;
    let i = start + m[0].length - 1; // index of the opening '('
    let depth = 0;
    let inStr = null; // quote char currently inside, or null
    for (; i < src.length; i++) {
      const c = src[i];
      if (inStr) {
        if (c === '\\') { i++; continue; }
        if (c === inStr) inStr = null;
        continue;
      }
      if (c === '\'' || c === '"' || c === '`') { inStr = c; continue; }
      if (c === '(' || c === '{' || c === '[') depth++;
      else if (c === ')' || c === '}' || c === ']') {
        depth--;
        if (depth === 0) { i++; break; }
      }
    }
    // i is now just past the matching close-paren of the call.
    // Consume an optional trailing ';'
    let end = i;
    if (src[end] === ';') end++;
    calls.push({ start, end, text: src.slice(start, end), kind: m[1] });
    startRe.lastIndex = end;
  }
  return calls;
}
module.exports = { splitCalls };
