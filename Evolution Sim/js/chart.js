// Minimal dependency-free line chart, used to plot a species' population
// over time on a small canvas.

function drawLineChart(canvas, points, options = {}) {
	const ctx = canvas.getContext('2d');
	const width = canvas.width;
	const height = canvas.height;
	const color = options.color || '#4fa3d1';
	const padding = { left: 34, right: 10, top: 10, bottom: 20 };

	ctx.clearRect(0, 0, width, height);

	const plotW = width - padding.left - padding.right;
	const plotH = height - padding.top - padding.bottom;

	if (!points || points.length === 0) {
		ctx.fillStyle = '#5a6670';
		ctx.font = '12px system-ui, sans-serif';
		ctx.fillText('No data yet', padding.left, height / 2);
		return;
	}

	const minTick = points[0].tick;
	const maxTick = points[points.length - 1].tick;
	const tickRange = Math.max(1, maxTick - minTick);
	const maxPop = Math.max(1, ...points.map((p) => p.population));

	const xFor = (tick) => padding.left + ((tick - minTick) / tickRange) * plotW;
	const yFor = (pop) => padding.top + plotH - (pop / maxPop) * plotH;

	// Axes
	ctx.strokeStyle = '#2c343c';
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(padding.left, padding.top);
	ctx.lineTo(padding.left, padding.top + plotH);
	ctx.lineTo(padding.left + plotW, padding.top + plotH);
	ctx.stroke();

	// Y axis labels (max and 0)
	ctx.fillStyle = '#9aa7b0';
	ctx.font = '10px system-ui, sans-serif';
	ctx.textAlign = 'right';
	ctx.fillText(String(Math.round(maxPop)), padding.left - 5, padding.top + 8);
	ctx.fillText('0', padding.left - 5, padding.top + plotH);
	ctx.textAlign = 'left';
	ctx.fillText(`tick ${minTick}`, padding.left, height - 6);
	ctx.textAlign = 'right';
	ctx.fillText(`tick ${maxTick}`, width - padding.right, height - 6);
	ctx.textAlign = 'left';

	// Filled area under the curve
	ctx.beginPath();
	ctx.moveTo(xFor(points[0].tick), padding.top + plotH);
	for (const p of points) ctx.lineTo(xFor(p.tick), yFor(p.population));
	ctx.lineTo(xFor(points[points.length - 1].tick), padding.top + plotH);
	ctx.closePath();
	ctx.save();
	ctx.globalAlpha = 0.2;
	ctx.fillStyle = color;
	ctx.fill();
	ctx.restore();

	// Line
	ctx.beginPath();
	points.forEach((p, i) => {
		const x = xFor(p.tick);
		const y = yFor(p.population);
		if (i === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	});
	ctx.strokeStyle = color;
	ctx.lineWidth = 1.5;
	ctx.stroke();
}
