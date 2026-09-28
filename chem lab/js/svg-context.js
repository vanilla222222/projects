function svgEscape(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function svgNumber(value) {
  return String(Math.round(value * 100) / 100);
}

class SvgGradient {
  constructor(id, x0, y0, r0, x1, y1, r1) {
    this.id = id;
    this.geometry = { x0, y0, r0, x1, y1, r1 };
    this.stops = [];
  }

  addColorStop(offset, color) {
    this.stops.push({ offset, color });
  }
}

const SVG_TEXT_ANCHORS = { left: 'start', start: 'start', center: 'middle', right: 'end', end: 'end' };
const SVG_BASELINES = { middle: 'central', top: 'text-before-edge', hanging: 'hanging', bottom: 'text-after-edge', alphabetic: 'alphabetic', ideographic: 'ideographic' };

class SvgContext {
  constructor(width, height) {
    this.canvas = { width, height };
    this.elements = [];
    this.definitions = [];
    this.gradientCount = 0;
    this.stack = [];
    this.path = [];
    this.current = null;
    this.state = {
      matrix: [1, 0, 0, 1, 0, 0],
      fillStyle: '#000',
      strokeStyle: '#000',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      dash: [],
      globalAlpha: 1,
      font: '10px sans-serif',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      shadowColor: 'transparent',
      shadowBlur: 0,
    };
    this.measurer = document.createElement('canvas').getContext('2d');
    ['fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'globalAlpha', 'font', 'textAlign', 'textBaseline', 'shadowColor', 'shadowBlur'].forEach((key) => {
      Object.defineProperty(this, key, {
        get: () => this.state[key],
        set: (value) => {
          this.state[key] = value;
        },
      });
    });
  }

  save() {
    this.stack.push(Object.assign({}, this.state, { matrix: this.state.matrix.slice(), dash: this.state.dash.slice() }));
  }

  restore() {
    if (this.stack.length) {
      this.state = this.stack.pop();
    }
  }

  setTransform(a, b, c, d, e, f) {
    this.state.matrix = [a, b, c, d, e, f];
  }

  setLineDash(segments) {
    this.state.dash = segments.slice();
  }

  getLineDash() {
    return this.state.dash.slice();
  }

  measureText(text) {
    this.measurer.font = this.state.font;
    return this.measurer.measureText(text);
  }

  createRadialGradient(x0, y0, r0, x1, y1, r1) {
    this.gradientCount += 1;
    return new SvgGradient('g' + this.gradientCount, x0, y0, r0, x1, y1, r1);
  }

  beginPath() {
    this.path = [];
    this.current = null;
  }

  moveTo(x, y) {
    this.path.push('M' + svgNumber(x) + ' ' + svgNumber(y));
    this.current = { x, y, startX: x, startY: y };
  }

  lineTo(x, y) {
    if (!this.current) {
      this.moveTo(x, y);
      return;
    }
    this.path.push('L' + svgNumber(x) + ' ' + svgNumber(y));
    this.current.x = x;
    this.current.y = y;
  }

  closePath() {
    if (this.current) {
      this.path.push('Z');
      this.current.x = this.current.startX;
      this.current.y = this.current.startY;
    }
  }

  arc(cx, cy, radius, start, end, counterclockwise) {
    let sweep = end - start;
    const full = Math.PI * 2;
    if (!counterclockwise && sweep < 0) {
      sweep = sweep <= -full ? full : sweep % full + full;
    } else if (counterclockwise && sweep > 0) {
      sweep = sweep >= full ? -full : sweep % full - full;
    }
    if (Math.abs(sweep) >= full) {
      sweep = counterclockwise ? -full : full;
    }
    const sx = cx + radius * Math.cos(start);
    const sy = cy + radius * Math.sin(start);
    if (this.current) {
      this.lineTo(sx, sy);
    } else {
      this.moveTo(sx, sy);
    }
    const steps = Math.abs(sweep) > Math.PI ? 2 : 1;
    for (let i = 1; i <= steps; i += 1) {
      const angle = start + sweep * i / steps;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      this.path.push('A' + svgNumber(radius) + ' ' + svgNumber(radius) + ' 0 0 ' + (sweep > 0 ? 1 : 0) + ' ' + svgNumber(x) + ' ' + svgNumber(y));
      this.current.x = x;
      this.current.y = y;
    }
  }

  arcTo(x1, y1, x2, y2, radius) {
    if (!this.current) {
      this.moveTo(x1, y1);
      return;
    }
    const x0 = this.current.x;
    const y0 = this.current.y;
    const ax = x0 - x1;
    const ay = y0 - y1;
    const bx = x2 - x1;
    const by = y2 - y1;
    const la = Math.hypot(ax, ay);
    const lb = Math.hypot(bx, by);
    const cross = ax * by - ay * bx;
    if (radius <= 0 || la === 0 || lb === 0 || Math.abs(cross) < 1e-9) {
      this.lineTo(x1, y1);
      return;
    }
    const angle = Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb))));
    const distance = radius / Math.tan(angle / 2);
    const tx0 = x1 + ax / la * distance;
    const ty0 = y1 + ay / la * distance;
    const tx1 = x1 + bx / lb * distance;
    const ty1 = y1 + by / lb * distance;
    this.lineTo(tx0, ty0);
    this.path.push('A' + svgNumber(radius) + ' ' + svgNumber(radius) + ' 0 0 ' + (cross < 0 ? 1 : 0) + ' ' + svgNumber(tx1) + ' ' + svgNumber(ty1));
    this.current.x = tx1;
    this.current.y = ty1;
  }

  transformAttribute() {
    const m = this.state.matrix;
    if (m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0) {
      return '';
    }
    return ' transform="matrix(' + m.map(svgNumber).join(' ') + ')"';
  }

  opacityAttribute() {
    return this.state.globalAlpha < 1 ? ' opacity="' + svgNumber(this.state.globalAlpha) + '"' : '';
  }

  paint(style) {
    if (!(style instanceof SvgGradient)) {
      return svgEscape(style);
    }
    const g = style.geometry;
    this.definitions.push('<radialGradient id="' + style.id + '" gradientUnits="userSpaceOnUse" cx="' + svgNumber(g.x1) + '" cy="' + svgNumber(g.y1) +
      '" r="' + svgNumber(g.r1) + '" fx="' + svgNumber(g.x0) + '" fy="' + svgNumber(g.y0) + '">' +
      style.stops.map((stop) => '<stop offset="' + svgNumber(stop.offset) + '" stop-color="' + svgEscape(stop.color) + '"/>').join('') + '</radialGradient>');
    return 'url(#' + style.id + ')';
  }

  fill() {
    if (this.path.length) {
      this.elements.push('<path d="' + this.path.join('') + '" fill="' + this.paint(this.state.fillStyle) + '"' + this.opacityAttribute() + this.transformAttribute() + '/>');
    }
  }

  stroke() {
    if (!this.path.length) {
      return;
    }
    const s = this.state;
    const dash = s.dash.length ? ' stroke-dasharray="' + s.dash.map(svgNumber).join(' ') + '"' : '';
    this.elements.push('<path d="' + this.path.join('') + '" fill="none" stroke="' + this.paint(s.strokeStyle) + '" stroke-width="' + svgNumber(s.lineWidth) +
      '" stroke-linecap="' + s.lineCap + '" stroke-linejoin="' + s.lineJoin + '"' + dash + this.opacityAttribute() + this.transformAttribute() + '/>');
  }

  rectPath(x, y, width, height) {
    return 'M' + svgNumber(x) + ' ' + svgNumber(y) + 'h' + svgNumber(width) + 'v' + svgNumber(height) + 'h' + svgNumber(-width) + 'Z';
  }

  fillRect(x, y, width, height) {
    this.elements.push('<path d="' + this.rectPath(x, y, width, height) + '" fill="' + this.paint(this.state.fillStyle) + '"' + this.opacityAttribute() + this.transformAttribute() + '/>');
  }

  strokeRect(x, y, width, height) {
    const saved = this.path;
    this.path = [this.rectPath(x, y, width, height)];
    this.stroke();
    this.path = saved;
  }

  clearRect() {
    this.elements = [];
    this.definitions = [];
  }

  fillText(text, x, y) {
    const s = this.state;
    this.elements.push('<text x="' + svgNumber(x) + '" y="' + svgNumber(y) + '" fill="' + this.paint(s.fillStyle) + '" style="font:' + svgEscape(s.font) +
      '" text-anchor="' + (SVG_TEXT_ANCHORS[s.textAlign] || 'start') + '" dominant-baseline="' + (SVG_BASELINES[s.textBaseline] || 'alphabetic') + '" xml:space="preserve"' +
      this.opacityAttribute() + this.transformAttribute() + '>' + svgEscape(text) + '</text>');
  }

  toSvg() {
    const w = svgNumber(this.canvas.width);
    const h = svgNumber(this.canvas.height);
    return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">\n' +
      (this.definitions.length ? '<defs>' + this.definitions.join('') + '</defs>\n' : '') + this.elements.join('\n') + '\n</svg>\n';
  }
}
