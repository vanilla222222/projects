const PlantKernels = (() => {
	const WG = 64;
	const SLOT_F = { bio: 0, health: 1, fruit: 2, cap: 3, growth: 4, shade: 5, disp: 6, fruitK: 7, bloomK: 8, root: 9, sat: 10, own: 11 };
	const SLOT_U = { occ: 0, kind: 1, myco: 2, life: 3, age: 4, blight: 5, form: 6 };
	const TILE_F = { nut: 0, litter: 1, carrion: 2, poll: 3, moist: 4, samp: 5, base: 6, water: 7, tile: 8 };
	const PART = { total: 0, fruit: 1, fungi: 2, flowers: 3, flowerPoll: 4, seedlings: 5, mature: 6, old: 7, litter: 8, carrion: 9 };
	const NF_SLOT = 12;
	const NU_SLOT = 7;
	const NF_TILE = 9;
	const N_PART = 10;
	const UNIFORM_BYTES = 112;

	function f(v) {
		const s = String(v);
		return /[.e]/.test(s) ? s : s + '.0';
	}

	function header() {
		return `
struct U {
	n: u32,
	W: u32,
	H: u32,
	tick: u32,
	seed: u32,
	nwg: u32,
	patches: u32,
	ck: u32,
	season: f32,
	bloomNow: f32,
	fruitNow: f32,
	flowerK: f32,
	bloomB: array<vec4<f32>, 2>,
	fruitB: array<vec4<f32>, 2>,
};
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read_write> sF: array<f32>;
@group(0) @binding(2) var<storage, read_write> sU: array<u32>;
@group(0) @binding(3) var<storage, read_write> tF: array<f32>;
@group(0) @binding(4) var<storage, read_write> part: array<f32>;
@group(0) @binding(5) var<storage, read_write> mask: array<atomic<u32>>;
@group(0) @binding(6) var<storage, read> pq: array<u32>;

fn fi(field: u32, p: u32) -> u32 { return field * u.n * 2u + p; }
fn ti(field: u32, i: u32) -> u32 { return field * u.n + i; }
fn bloomAt(fm: u32) -> f32 { let b = (fm >> 3u) & 7u; return u.bloomB[b >> 2u][b & 3u]; }
fn fruitAt(fm: u32) -> f32 { let b = (fm >> 3u) & 7u; return u.fruitB[b >> 2u][b & 3u]; }
`;
	}

	function patchShader() {
		return (
			header() +
			`
@compute @workgroup_size(${WG})
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
	let k = gid.x;
	if (k >= u.patches) { return; }
	let t = pq[k * 3u];
	let idx = pq[k * 3u + 1u];
	let v = pq[k * 3u + 2u];
	if (t == 0u) { sF[idx] = bitcast<f32>(v); }
	else if (t == 1u) { sU[idx] = v; }
	else { tF[idx] = bitcast<f32>(v); }
}
`
		);
	}

	function soilAShader() {
		return (
			header() +
			`
@compute @workgroup_size(${WG})
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
	let i = gid.x;
	if (i >= u.n) { return; }
	let un = u.n + i;
	var a = sF[fi(${SLOT_F.bio}u, i)] * ${f(SOIL_UPTAKE)} * (0.5 + sF[fi(${SLOT_F.root}u, i)]);
	var b = 0.0;
	if (sU[fi(${SLOT_U.kind}u, un)] == 0u && (sU[fi(${SLOT_U.form}u, un)] & 4u) == 0u) { b = sF[fi(${SLOT_F.bio}u, un)] * ${f(SOIL_UPTAKE)} * (0.5 + sF[fi(${SLOT_F.root}u, un)]); }
	a = select(0.0, a, a > 0.0);
	b = select(0.0, b, b > 0.0);
	sF[fi(${SLOT_F.own}u, i)] = a;
	sF[fi(${SLOT_F.own}u, un)] = b;
	tF[ti(${TILE_F.tile}u, i)] = a + b;
}
`
		);
	}

	function soilBShader() {
		return (
			header() +
			`
var<workgroup> red: array<f32, ${WG * 2}>;

fn rowAt(j: u32, x: u32) -> f32 {
	var s = tF[ti(${TILE_F.tile}u, j)];
	if (x > 0u) { s += tF[ti(${TILE_F.tile}u, j - 1u)]; }
	if (x + 1u < u.W) { s += tF[ti(${TILE_F.tile}u, j + 1u)]; }
	return s;
}

@compute @workgroup_size(${WG})
fn main(@builtin(global_invocation_id) gid: vec3<u32>, @builtin(local_invocation_index) lid: u32, @builtin(workgroup_id) wid: vec3<u32>) {
	let i = gid.x;
	var tl = 0.0;
	var tc = 0.0;
	if (i < u.n) {
		let x = i % u.W;
		let y = i / u.W;
		let un = u.n + i;
		var around = rowAt(i, x) - tF[ti(${TILE_F.tile}u, i)];
		if (y > 0u) { around += rowAt(i - u.W, x); }
		if (y + 1u < u.H) { around += rowAt(i + u.W, x); }
		around *= ${f(SOIL_NEIGHBOUR_W)};
		var N = tF[ti(${TILE_F.nut}u, i)];
		let a = sF[fi(${SLOT_F.own}u, i)];
		let b = sF[fi(${SLOT_F.own}u, un)];
		let pa = a + ${f(SOIL_SAME_TILE_W)} * b + around;
		let pb = b + ${f(SOIL_SAME_TILE_W)} * a + around;
		var sa = 1.0;
		if (pa > 0.0) { sa = (N * ${f(SOIL_SUPPLY)}) / pa; }
		var sb = 1.0;
		if (pb > 0.0) { sb = (N * ${f(SOIL_SUPPLY)}) / pb; }
		let va = select(1.0, sa, sa < 1.0);
		let vb = select(1.0, sb, sb < 1.0);
		sF[fi(${SLOT_F.sat}u, i)] = va;
		sF[fi(${SLOT_F.sat}u, un)] = select(vb, 1.0, sU[fi(${SLOT_U.kind}u, un)] != 0u || (sU[fi(${SLOT_U.form}u, un)] & 4u) != 0u);
		N -= a * va + b * vb;
		if (N < 0.0) { N = 0.0; }
		N += (tF[ti(${TILE_F.base}u, i)] - N) * ${f(SOIL_REFILL)};
		let C = tF[ti(${TILE_F.carrion}u, i)];
		if (C > 0.0) {
			let dc = C * ${f(CARRION_DECAY)};
			tF[ti(${TILE_F.carrion}u, i)] = C - dc;
			tc = C - dc;
			tF[ti(${TILE_F.litter}u, i)] += dc;
		}
		let L = tF[ti(${TILE_F.litter}u, i)];
		if (L > 0.0) {
			let d = L * ${f(LITTER_DECAY)};
			tF[ti(${TILE_F.litter}u, i)] = L - d;
			tl = L - d;
			N += d * ${f(SOIL_RECYCLE)};
			if (N > ${f(SOIL_MAX)}) { N = ${f(SOIL_MAX)}; }
		}
		tF[ti(${TILE_F.nut}u, i)] = N;
	}
	red[lid] = tl;
	red[${WG}u + lid] = tc;
	workgroupBarrier();
	if (lid == 0u) {
		var sl = 0.0;
		var sc = 0.0;
		for (var k = 0u; k < ${WG}u; k++) {
			sl += red[k];
			sc += red[${WG}u + k];
		}
		part[${PART.litter}u * u.nwg + wid.x] = sl;
		part[${PART.carrion}u * u.nwg + wid.x] = sc;
	}
}
`
		);
	}

	function plantShader() {
		const MT = f(SEEDLING_MIN / AGE_STEP);
		return (
			header() +
			`
var<workgroup> red: array<f32, ${WG * 8}>;
var<private> acc: array<f32, 8>;
var<private> canopy: bool;

fn hash(v: u32) -> u32 {
	var s = v * 747796405u + 2891336453u;
	let w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
	return (w >> 22u) ^ w;
}

fn rnd(p: u32) -> f32 {
	let h = hash(p ^ hash(u.tick ^ hash(u.seed)));
	return f32(h >> 8u) * (1.0 / 16777216.0);
}

fn kill(p: u32, code: f32) {
	sF[fi(${SLOT_F.bio}u, p)] = -code;
}

fn slot(p: u32, i: u32, under: bool) -> bool {
	if (sU[fi(${SLOT_U.occ}u, p)] == 0u) { return false; }
	let lf = f32(sU[fi(${SLOT_U.life}u, p)]);
	let ag = f32(sU[fi(${SLOT_U.age}u, p)]);
	var mt = ${MT};
	if (lf * ${f(SEEDLING_FRAC)} > ${MT}) { mt = lf * ${f(SEEDLING_FRAC)}; }
	let young = ag < mt;
	let aged = ag > ${f(OLD_FRAC)} * lf;
	if (young) { acc[5] += 1.0; }
	else if (aged) { acc[7] += 1.0; }
	else { acc[6] += 1.0; }
	let fk = sU[fi(${SLOT_U.kind}u, p)] != 0u;
	let mc = sU[fi(${SLOT_U.myco}u, p)] != 0u;
	let cap = sF[fi(${SLOT_F.cap}u, p)];
	let poll = tF[ti(${TILE_F.poll}u, i)];
	let bk = sF[fi(${SLOT_F.bloomK}u, p)];
	let fm = sU[fi(${SLOT_U.form}u, p)];
	var light = 1.0;
	var K = 0.0;
	if (fk) {
		if (mc) {
			var cb = 0.0;
			if (canopy) { cb = sF[fi(${SLOT_F.bio}u, i)]; }
			K = select(cap, (cap * cb) / ${f(MYCO_HOST_K)}, cb < ${f(MYCO_HOST_K)});
		} else {
			let L = tF[ti(${TILE_F.litter}u, i)];
			K = select(cap, (cap * L) / ${f(FUNGUS_LITTER_K)}, L < ${f(FUNGUS_LITTER_K)});
		}
		acc[2] += 1.0;
	} else {
		let climb = under && (fm & ${FORM_CLIMB}u) != 0u;
		if (under && canopy) {
			let cb = sF[fi(${SLOT_F.bio}u, i)];
			let sf = ${f(SHADE_MAX)} * select(1.0, cb / ${f(SHADE_FULL_BIOMASS)}, cb < ${f(SHADE_FULL_BIOMASS)}) * select(1.0, ${f(CLIMB_SHADE)}, climb);
			light = 1.0 - sf * (1.0 - sF[fi(${SLOT_F.shade}u, p)]);
		}
		K = cap * light;
		if (climb && !canopy) { K *= ${f(CLIMB_ALONE)}; }
		if (under && bk > u.flowerK && tF[ti(${TILE_F.water}u, i)] == 0.0) {
			acc[3] += 1.0;
			acc[4] += poll;
		}
	}
	var b = sF[fi(${SLOT_F.bio}u, p)];
	if (K < 0.015) {
		b -= 0.01;
		if (b <= 0.0) {
			kill(p, 1.0);
			return false;
		}
		sF[fi(${SLOT_F.bio}u, p)] = b;
		return true;
	}
	var h = sF[fi(${SLOT_F.health}u, p)];
	let bl = sU[fi(${SLOT_U.blight}u, p)] != 0u;
	if (h <= 0.0 && bl) {
		kill(p, 2.0);
		return false;
	}
	var s = sF[fi(${SLOT_F.sat}u, p)];
	var tax = 1.0;
	let un = u.n + i;
	if (!under && sU[fi(${SLOT_U.myco}u, un)] != 0u && sU[fi(${SLOT_U.occ}u, un)] != 0u) {
		s *= ${f(MYCO_BOOST)};
		if (s > 1.0) { s = 1.0; }
		sF[fi(${SLOT_F.sat}u, p)] = s;
		tax = ${f(MYCO_TAX)};
	}
	if (!under && (sU[fi(${SLOT_U.form}u, un)] & ${FORM_VINE}u) != 0u && sU[fi(${SLOT_U.occ}u, un)] != 0u) { tax *= ${f(VINE_TAX)}; }
	if (s >= ${f(SAT_OK)}) {
		h += ${f(HEALTH_RECOVER)};
		if (h > 1.0) { h = 1.0; }
	} else {
		h -= (${f(SAT_OK)} - s) * ${f(HEALTH_DECAY)};
		if (h <= 0.0) {
			kill(p, 3.0);
			return false;
		}
	}
	sF[fi(${SLOT_F.health}u, p)] = h;
	if (young) { K *= ${f(SEEDLING_K0)} + ((1.0 - ${f(SEEDLING_K0)}) * ag) / mt; }
	let sm = 1.0 + tF[ti(${TILE_F.samp}u, i)] * u.season;
	let r = sF[fi(${SLOT_F.growth}u, p)] * select(0.05, sm, sm > 0.05) * light * (0.35 + 0.65 * h) * tax * tF[ti(${TILE_F.moist}u, i)] * select(1.0, ${f(OLD_GROWTH)}, aged);
	let bb = select(0.03, b, b > 0.03);
	b += r * bb * (1.0 - b / K);
	if (b > K) { b = K; }
	if (b < 0.004) { b = 0.004; }
	sF[fi(${SLOT_F.bio}u, p)] = b;
	acc[0] += b;
	let fullness = b / K;
	if (fk && !mc) {
		let L = tF[ti(${TILE_F.litter}u, i)];
		if (L > 0.0) {
			let d = L * ${f(FUNGUS_DECOMP)} * select(1.0, fullness, fullness < 1.0);
			tF[ti(${TILE_F.litter}u, i)] = L - d;
			let N = tF[ti(${TILE_F.nut}u, i)] + d * ${f(FUNGUS_RETURN)};
			tF[ti(${TILE_F.nut}u, i)] = select(${f(SOIL_MAX)}, N, N < ${f(SOIL_MAX)});
		}
	}
	if (young) { return true; }
	let fq = sF[fi(${SLOT_F.fruitK}u, p)];
	if (fq > 0.0) {
		let goal = fq * b * fruitAt(fm) * h * (${f(POLL_FRUIT_BASE)} + (1.0 - ${f(POLL_FRUIT_BASE)}) * poll) * select(1.0, ${f(OLD_FRUIT)}, aged);
		var fr = sF[fi(${SLOT_F.fruit}u, p)];
		if (fr < goal) { fr += (goal - fr) * ${f(FRUIT_RATE)}; }
		else {
			let rot = (fr - goal) * ${f(FRUIT_ROT)};
			fr -= rot;
			tF[ti(${TILE_F.litter}u, i)] += rot;
		}
		sF[fi(${SLOT_F.fruit}u, p)] = fr;
		acc[1] += fr;
	}
	if (h >= ${f(HEALTH_SPREAD_MIN)} && fullness > 0.3) {
		let chance = (0.006 + 0.045 * sF[fi(${SLOT_F.disp}u, p)]) * fullness * (1.0 + bk * bloomAt(fm) * (${f(POLL_WIND)} + (1.0 - ${f(POLL_WIND)}) * poll));
		if (rnd(p) < chance) { atomicOr(&mask[p >> 5u], 1u << (p & 31u)); }
	}
	return true;
}

@compute @workgroup_size(${WG})
fn main(@builtin(global_invocation_id) gid: vec3<u32>, @builtin(local_invocation_index) lid: u32, @builtin(workgroup_id) wid: vec3<u32>) {
	let i = gid.x;
	for (var k = 0u; k < 8u; k++) { acc[k] = 0.0; }
	if (i < u.n) {
		canopy = false;
		canopy = slot(i, i, false);
		_ = slot(u.n + i, i, true);
		let pl = tF[ti(${TILE_F.poll}u, i)];
		if (pl > 0.0) { tF[ti(${TILE_F.poll}u, i)] = pl * ${f(POLL_DECAY)}; }
	}
	for (var k = 0u; k < 8u; k++) { red[k * ${WG}u + lid] = acc[k]; }
	workgroupBarrier();
	if (lid == 0u) {
		for (var k = 0u; k < 8u; k++) {
			var s = 0.0;
			for (var j = 0u; j < ${WG}u; j++) { s += red[k * ${WG}u + j]; }
			part[k * u.nwg + wid.x] = s;
		}
	}
}
`
		);
	}

	return { WG, SLOT_F, SLOT_U, TILE_F, PART, NF_SLOT, NU_SLOT, NF_TILE, N_PART, UNIFORM_BYTES, patchShader, soilAShader, soilBShader, plantShader };
})();
