const TREE_PAD = { l: 12, r: 16, t: 24, b: 10 };
const TREE_GROUP_LABEL = { plant: 'plants', animal: 'animals', bug: 'bugs', pathogen: 'pathogens' };

class FamilyTree {
	constructor(canvas, tip, onPick) {
		this.canvas = canvas;
		this.tip = tip;
		this.onPick = onPick;
		this.eco = null;
		this.mode = 'species';
		this.focus = 0;
		this.nodes = [];
		this.byId = new Map();
		this.kx = 1;
		this.rh = 12;
		this.ox = 0;
		this.oy = 0;
		this.hover = null;
		this._bind();
	}

	show(eco, id, mode) {
		this.eco = eco;
		this.mode = mode || this.mode;
		this.focus = id;
		this._build();
		this._fit();
		this.centerOn(id);
		this.draw();
	}

	title() {
		const sp = this.eco && this.eco.registry.get(this.focus);
		if (!sp) return 'Family tree';
		const n = this.nodes.length;
		return this.mode === 'kingdom' ? `All ${TREE_GROUP_LABEL[sp.group] || 'species'} · ${n.toLocaleString()} species` : `${sp.name} · ${n.toLocaleString()} in lineage`;
	}

	_build() {
		const reg = this.eco.registry;
		const sp = reg.get(this.focus);
		const set = new Set();
		if (sp && this.mode === 'kingdom') {
			for (const s of reg.all.values()) if (s.group === sp.group && !s.merged) set.add(s);
			set.add(sp);
		} else if (sp) {
			for (let s = sp; s; s = s.parentId ? reg.get(s.parentId) : null) set.add(s);
			const stack = [sp];
			while (stack.length) {
				for (const c of stack.pop().children) {
					if (set.has(c)) continue;
					set.add(c);
					stack.push(c);
				}
			}
		}
		const kids = new Map();
		const roots = [];
		const up = new Map();
		for (const s of set) {
			let p = s.parentId ? reg.get(s.parentId) : null;
			while (p && !set.has(p)) p = p.parentId ? reg.get(p.parentId) : null;
			up.set(s, p);
			if (!p) roots.push(s);
			else if (kids.has(p)) kids.get(p).push(s);
			else kids.set(p, [s]);
		}
		const order = (a, b) => b.createdTick - a.createdTick || b.id - a.id;
		roots.sort(order);
		for (const list of kids.values()) list.sort(order);
		const nodes = [];
		const byId = new Map();
		const stack = roots.slice();
		while (stack.length) {
			const s = stack.pop();
			const node = { sp: s, row: nodes.length, parent: byId.get(up.get(s) ? up.get(s).id : -1) || null };
			nodes.push(node);
			byId.set(s.id, node);
			const k = kids.get(s);
			if (k) for (const c of k) stack.push(c);
		}
		this.nodes = nodes;
		this.byId = byId;
		let t0 = Infinity;
		for (const n of nodes) if (n.sp.createdTick < t0) t0 = n.sp.createdTick;
		this.t0 = Number.isFinite(t0) ? t0 : 0;
		this.hover = null;
		this.tip.hidden = true;
	}

	_size() {
		const w = this.canvas.clientWidth;
		const h = this.canvas.clientHeight;
		return { w, h, pw: Math.max(1, w - TREE_PAD.l - TREE_PAD.r), ph: Math.max(1, h - TREE_PAD.t - TREE_PAD.b) };
	}

	_fit() {
		const { pw, ph } = this._size();
		const span = Math.max(YEAR_TICKS, this.eco.tick - this.t0);
		this.kx = pw / span;
		this.ox = this.t0;
		this.rh = Math.max(3, Math.min(18, ph / Math.max(1, this.nodes.length)));
		this.oy = 0;
	}

	_clampY() {
		const { ph } = this._size();
		const max = Math.max(0, this.nodes.length * this.rh - ph * 0.5);
		this.oy = Math.max(Math.min(0, this.nodes.length * this.rh - ph), Math.min(max, this.oy));
	}

	centerOn(id) {
		const node = this.byId.get(id);
		if (!node) return;
		const { pw, ph } = this._size();
		if (this.nodes.length * this.rh > ph) this.oy = node.row * this.rh + this.rh / 2 - ph / 2;
		this._clampY();
		const x = (node.sp.createdTick - this.ox) * this.kx;
		if (x < 0 || x > pw) this.ox = node.sp.createdTick - (pw * 0.3) / this.kx;
	}

	_x(t) {
		return TREE_PAD.l + (t - this.ox) * this.kx;
	}

	_y(row) {
		return TREE_PAD.t + row * this.rh - this.oy;
	}

	draw() {
		if (!this.eco) return;
		const { ctx, w, h } = prepCanvas(this.canvas);
		const { pw, ph } = this._size();
		const cs = getComputedStyle(document.documentElement);
		const tok = (k) => cs.getPropertyValue(k).trim();
		const ink = chartInk();
		const now = this.eco.tick;
		const yt = YEAR_TICKS;
		const px = yt * this.kx;
		let step = 1;
		for (const s of [1, 2, 5, 10, 20, 50, 100, 200, 500]) {
			step = s;
			if (px * s >= 56) break;
		}
		ctx.font = '10px Inter, system-ui, sans-serif';
		ctx.textBaseline = 'middle';
		ctx.fillStyle = ink.text;
		ctx.strokeStyle = ink.grid;
		ctx.lineWidth = 1;
		const y0 = Math.max(0, Math.floor(this.ox / yt / step) * step);
		for (let y = y0; ; y += step) {
			const x = this._x(y * yt);
			if (x > w) break;
			if (x < TREE_PAD.l) continue;
			ctx.beginPath();
			ctx.moveTo(Math.round(x) + 0.5, TREE_PAD.t - 4);
			ctx.lineTo(Math.round(x) + 0.5, h - TREE_PAD.b);
			ctx.stroke();
			ctx.fillText('Y' + (y + 1), x + 3, 11);
		}
		ctx.save();
		ctx.beginPath();
		ctx.rect(TREE_PAD.l, TREE_PAD.t, pw, ph);
		ctx.clip();
		const rh = this.rh;
		const top = TREE_PAD.t;
		const bot = TREE_PAD.t + ph;
		ctx.strokeStyle = tok('--line-2');
		ctx.beginPath();
		for (const n of this.nodes) {
			if (!n.parent) continue;
			const ya = this._y(n.parent.row) + rh / 2;
			const yb = this._y(n.row) + rh / 2;
			if (yb < top || ya > bot) continue;
			const x = Math.round(this._x(n.sp.createdTick)) + 0.5;
			if (x < TREE_PAD.l || x > TREE_PAD.l + pw) continue;
			ctx.moveTo(x, ya);
			ctx.lineTo(x, yb);
		}
		ctx.stroke();
		const r0 = Math.max(0, Math.floor(this.oy / rh) - 1);
		const r1 = Math.min(this.nodes.length - 1, Math.ceil((this.oy + ph) / rh) + 1);
		const bh = Math.max(1, Math.min(rh - 1, rh * 0.62));
		const faint = tok('--faint');
		const text = tok('--text');
		const muted = tok('--muted');
		const card = tok('--card');
		const labels = rh >= 11;
		for (let r = r0; r <= r1; r++) {
			const n = this.nodes[r];
			const sp = n.sp;
			const dead = sp.population <= 0;
			const xa = this._x(sp.createdTick);
			const xb = Math.max(xa + 2, this._x(dead && sp.extinctTick != null ? sp.extinctTick : now));
			const yc = this._y(r) + rh / 2;
			ctx.globalAlpha = dead ? 0.5 : 1;
			ctx.fillStyle = dead ? faint : sp.color;
			ctx.fillRect(xa, yc - bh / 2, xb - xa, bh);
			ctx.globalAlpha = 1;
			if (sp.id === this.focus || n === this.hover) {
				ctx.strokeStyle = sp.id === this.focus ? text : muted;
				ctx.lineWidth = 1.5;
				ctx.strokeRect(xa - 1.5, yc - bh / 2 - 1.5, xb - xa + 3, bh + 3);
				ctx.lineWidth = 1;
			}
			if (labels || sp.id === this.focus) {
				const tw = ctx.measureText(sp.name).width;
				let lx = xb + 5;
				if (lx + tw > TREE_PAD.l + pw) lx = xa - tw - 5;
				if (lx < TREE_PAD.l) {
					lx = Math.max(xa, TREE_PAD.l) + 6;
					ctx.globalAlpha = 0.85;
					ctx.fillStyle = card;
					ctx.fillRect(lx - 3, yc - 7, tw + 6, 14);
					ctx.globalAlpha = 1;
				}
				ctx.fillStyle = sp.id === this.focus ? text : dead ? faint : muted;
				ctx.fillText(sp.name, lx, yc);
			}
		}
		ctx.restore();
	}

	_nodeAt(mx, my) {
		const row = Math.floor((my - TREE_PAD.t + this.oy) / this.rh);
		const n = this.nodes[row];
		if (!n || my < TREE_PAD.t) return null;
		const sp = n.sp;
		const xa = this._x(sp.createdTick);
		const xb = Math.max(xa + 2, this._x(sp.population <= 0 && sp.extinctTick != null ? sp.extinctTick : this.eco.tick));
		return mx >= xa - 6 && mx <= xb + 6 ? n : null;
	}

	_showTip(n, mx, my) {
		const tip = this.tip;
		if (!n) {
			tip.hidden = true;
			return;
		}
		const sp = n.sp;
		const yr = (t) => 'Y' + (Math.floor(t / YEAR_TICKS) + 1);
		const end = sp.population > 0 ? 'now' : sp.extinctTick != null ? yr(sp.extinctTick) : '?';
		tip.innerHTML = `<div class="tt-row"><div><strong>${sp.name}</strong><small>${yr(sp.createdTick)} – ${end}${sp.merged ? ' · merged' : ''}</small><small>peak ${formatCount(sp.peak)} · now ${formatCount(sp.population)}</small></div></div>`;
		tip.hidden = false;
		const bw = tip.offsetWidth;
		const bh = tip.offsetHeight;
		const w = this.canvas.clientWidth;
		const h = this.canvas.clientHeight;
		tip.style.left = Math.max(4, mx + 14 + bw > w - 4 ? mx - bw - 10 : mx + 14) + 'px';
		tip.style.top = Math.max(4, my + 14 + bh > h - 4 ? my - bh - 10 : my + 14) + 'px';
	}

	_bind() {
		const c = this.canvas;
		let drag = null;
		const local = (e) => {
			const r = c.getBoundingClientRect();
			return [e.clientX - r.left, e.clientY - r.top];
		};
		c.addEventListener('pointerdown', (e) => {
			c.setPointerCapture(e.pointerId);
			const [x, y] = local(e);
			drag = { x, y, moved: 0 };
		});
		c.addEventListener('pointermove', (e) => {
			if (!this.eco) return;
			const [x, y] = local(e);
			if (drag) {
				const dx = x - drag.x;
				const dy = y - drag.y;
				drag.moved += Math.abs(dx) + Math.abs(dy);
				drag.x = x;
				drag.y = y;
				if (drag.moved > 4) {
					c.classList.add('dragging');
					this.ox -= dx / this.kx;
					this.oy -= dy;
					this._clampY();
					this.tip.hidden = true;
					this.draw();
					return;
				}
			}
			const n = this._nodeAt(x, y);
			if (n !== this.hover) {
				this.hover = n;
				this.draw();
			}
			this._showTip(n, x, y);
		});
		const end = (e) => {
			if (drag && drag.moved <= 4 && this.eco) {
				const [x, y] = local(e);
				const n = this._nodeAt(x, y);
				if (n) this.onPick(n.sp.id);
			}
			drag = null;
			c.classList.remove('dragging');
		};
		c.addEventListener('pointerup', end);
		c.addEventListener('pointercancel', end);
		c.addEventListener('pointerleave', () => {
			this.hover = null;
			this.tip.hidden = true;
			if (this.eco) this.draw();
		});
		c.addEventListener(
			'wheel',
			(e) => {
				e.preventDefault();
				if (!this.eco) return;
				const [x, y] = local(e);
				const f = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0016));
				const { pw } = this._size();
				const t = this.ox + (x - TREE_PAD.l) / this.kx;
				const span = Math.max(YEAR_TICKS, this.eco.tick - this.t0);
				this.kx = Math.max((pw / span) * 0.5, Math.min(40, this.kx * f));
				this.ox = t - (x - TREE_PAD.l) / this.kx;
				const row = (y - TREE_PAD.t + this.oy) / this.rh;
				this.rh = Math.max(1, Math.min(28, this.rh * f));
				this.oy = row * this.rh - (y - TREE_PAD.t);
				this._clampY();
				this.tip.hidden = true;
				this.draw();
			},
			{ passive: false }
		);
	}
}
