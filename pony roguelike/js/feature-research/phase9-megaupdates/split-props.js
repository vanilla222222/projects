'use strict';
// Splits a `Object.assign(ITEMS, { key: {...}, key2: {...} });`-style file's
// top-level properties (2-space indented `key: {`) into {start, end, text, key}
// spans, brace-depth-aware so multi-line/nested values never miscount, and
// string-aware so a `}` or `{` inside a quoted string never miscounts either.
function splitProps(src) {
  const props = [];
  const startRe = /^  ([a-zA-Z0-9_]+): \{/gm;
  let m;
  while ((m = startRe.exec(src))) {
    const start = m.index;
    let i = start + m[0].length - 1; // index of the opening '{'
    let depth = 0;
    let inStr = null;
    for (; i < src.length; i++) {
      const c = src[i];
      if (inStr) {
        if (c === '\\') { i++; continue; }
        if (c === inStr) inStr = null;
        continue;
      }
      if (c === '\'' || c === '"' || c === '`') { inStr = c; continue; }
      if (c === '{' || c === '[' || c === '(') depth++;
      else if (c === '}' || c === ']' || c === ')') {
        depth--;
        if (depth === 0) { i++; break; }
      }
    }
    let end = i;
    if (src[end] === ',') end++;
    props.push({ start, end, text: src.slice(start, end), key: m[1] });
    startRe.lastIndex = end;
  }
  return props;
}
module.exports = { splitProps };
