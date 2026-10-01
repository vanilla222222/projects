function prepCanvas(canvas) {
	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	const w = canvas.clientWidth;
	const h = canvas.clientHeight;
	if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
		canvas.width = Math.round(w * dpr);
		canvas.height = Math.round(h * dpr);
	}
	const ctx = canvas.getContext('2d');
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.clearRect(0, 0, w, h);
	return { ctx, w, h };
}

function chartInk() {
	const cs = getComputedStyle(document.documentElement);
	return { text: cs.getPropertyValue('--chart-text').trim() || 'rgba(200,215,205,0.45)', grid: cs.getPropertyValue('--chart-grid').trim() || 'rgba(200,215,205,0.08)' };
}

function formatCount(n) {
	if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
	if (n >= 1e4) return Math.round(n / 1e3) + 'k';
	if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
	return String(Math.round(n));
}

function drawSparkline(canvas, values, color, maxPoints = 120) {
	const { ctx, w, h } = prepCanvas(canvas);
	const n = values.length;
	if (n < 2) return;
	const start = Math.max(0, n - maxPoints);
	let max = 1;
	for (let i = start; i < n; i++) if (values[i] > max) max = values[i];
	const pts = n - start;
	ctx.beginPath();
	for (let i = 0; i < pts; i++) {
		const x = (i / (pts - 1)) * w;
		const y = h - 1 - (values[start + i] / max) * (h - 3);
		if (i === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}
	ctx.strokeStyle = color;
	ctx.lineWidth = 1.5;
	ctx.lineJoin = 'round';
	ctx.stroke();
	ctx.lineTo(w, h);
	ctx.lineTo(0, h);
	ctx.closePath();
	ctx.globalAlpha = 0.14;
	ctx.fillStyle = color;
	ctx.fill();
	ctx.globalAlpha = 1;
}

function drawPopulationChart(canvas, ticks, series, opts = {}) {
	const { ctx, w, h } = prepCanvas(canvas);
	const padL = 30;
	const padB = 14;
	const pw = w - padL - 4;
	const ph = h - padB - 6;
	const n = ticks.length;
	const ink = chartInk();
	ctx.font = '10px Inter, system-ui, sans-serif';
	ctx.fillStyle = ink.text;
	ctx.strokeStyle = ink.grid;
	ctx.lineWidth = 1;
	let max = 10;
	for (const s of series) if (!s.hidden) for (const v of s.values) if (v > max) max = v;
	const logMax = Math.log10(max + 1);
	const yOf = (v) => 6 + ph - (Math.log10(v + 1) / logMax) * ph;
	for (let p = 0; p <= Math.ceil(logMax); p++) {
		const v = Math.pow(10, p) - 1;
		if (v > max * 1.01) break;
		const y = Math.round(yOf(v)) + 0.5;
		ctx.beginPath();
		ctx.moveTo(padL, y);
		ctx.lineTo(w - 4, y);
		ctx.stroke();
		ctx.textAlign = 'right';
		ctx.fillText(formatCount(Math.pow(10, p)), padL - 5, y + 3);
	}
	if (n < 2) return;
	const t0 = ticks[0];
	const t1 = ticks[n - 1];
	const xOf = (t) => padL + ((t - t0) / (t1 - t0 || 1)) * pw;
	if (opts.yearTicks) {
		ctx.textAlign = 'center';
		const step = Math.max(1, Math.ceil((t1 - t0) / opts.yearTicks / 6));
		for (let yr = Math.ceil(t0 / opts.yearTicks); yr * opts.yearTicks <= t1; yr += step) {
			const x = xOf(yr * opts.yearTicks);
			ctx.fillText('Y' + (yr + 1), x, h - 2);
		}
	}
	for (const s of series) {
		if (s.hidden) continue;
		ctx.beginPath();
		for (let i = 0; i < n; i++) {
			const x = xOf(ticks[i]);
			const y = yOf(s.values[i]);
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.strokeStyle = s.color;
		ctx.lineWidth = s.width || 1.6;
		ctx.lineJoin = 'round';
		ctx.globalAlpha = s.dim ? 0.55 : 1;
		ctx.stroke();
		ctx.globalAlpha = 1;
	}
}

function drawSpeciesChart(canvas, history, color, nowTick) {
	const { ctx, w, h } = prepCanvas(canvas);
	const n = history.length / 2;
	const ink = chartInk();
	ctx.font = '10px Inter, system-ui, sans-serif';
	if (n < 2) {
		ctx.fillStyle = ink.text;
		ctx.textAlign = 'center';
		ctx.fillText('Collecting data…', w / 2, h / 2 + 3);
		return;
	}
	const padL = 30;
	const pw = w - padL - 4;
	const ph = h - 18;
	let max = 1;
	for (let i = 1; i < history.length; i += 2) if (history[i] > max) max = history[i];
	const t0 = history[0];
	const t1 = Math.max(nowTick, history[history.length - 2]);
	const xOf = (t) => padL + ((t - t0) / (t1 - t0 || 1)) * pw;
	const yOf = (v) => 6 + ph - (v / max) * ph;
	ctx.fillStyle = ink.text;
	ctx.strokeStyle = ink.grid;
	ctx.textAlign = 'right';
	for (const v of [0, max / 2, max]) {
		const y = Math.round(yOf(v)) + 0.5;
		ctx.beginPath();
		ctx.moveTo(padL, y);
		ctx.lineTo(w - 4, y);
		ctx.stroke();
		ctx.fillText(formatCount(v), padL - 5, y + 3);
	}
	ctx.beginPath();
	ctx.moveTo(xOf(history[0]), yOf(history[1]));
	for (let i = 2; i < history.length; i += 2) ctx.lineTo(xOf(history[i]), yOf(history[i + 1]));
	ctx.strokeStyle = color;
	ctx.lineWidth = 1.8;
	ctx.stroke();
	ctx.lineTo(xOf(history[history.length - 2]), yOf(0));
	ctx.lineTo(xOf(history[0]), yOf(0));
	ctx.closePath();
	ctx.globalAlpha = 0.18;
	ctx.fillStyle = color;
	ctx.fill();
	ctx.globalAlpha = 1;
}
