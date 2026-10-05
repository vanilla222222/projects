const PlantGpu = (() => {
	const K = PlantKernels;
	const SF = K.SLOT_F;
	const SU = K.SLOT_U;
	const TF = K.TILE_F;
	const PT = K.PART;
	const contexts = new WeakMap();
	const live = new Set();
	let devicePromise = null;
	let current = null;

	function available() {
		return typeof navigator !== 'undefined' && !!navigator.gpu;
	}

	function warn(msg, err) {
		console.warn('Fast mode: ' + msg + (err ? ' (' + ((err && err.message) || err) + ')' : '') + ', using the CPU path');
	}

	function failAll(ref, why) {
		for (const ctx of live) if (ctx.ref === ref) fail(ctx, why);
	}

	async function makeDevice() {
		const adapter = await navigator.gpu.requestAdapter();
		if (!adapter) throw new Error('no WebGPU adapter');
		const device = await adapter.requestDevice();
		const ref = { device, lost: false, layout: null, pipes: null };
		device.lost.then((info) => {
			ref.lost = true;
			if (current === ref) {
				current = null;
				devicePromise = null;
			}
			failAll(ref, 'GPU device lost: ' + ((info && info.message) || 'unknown'));
		});
		device.addEventListener('uncapturederror', (e) => failAll(ref, 'GPU error: ' + ((e.error && e.error.message) || 'unknown')));
		const S = GPUShaderStage.COMPUTE;
		const storage = (binding) => ({ binding, visibility: S, buffer: { type: 'storage' } });
		ref.layout = device.createBindGroupLayout({
			entries: [{ binding: 0, visibility: S, buffer: { type: 'uniform' } }, storage(1), storage(2), storage(3), storage(4), storage(5), { binding: 6, visibility: S, buffer: { type: 'read-only-storage' } }],
		});
		const layout = device.createPipelineLayout({ bindGroupLayouts: [ref.layout] });
		const make = async (code) => {
			const module = device.createShaderModule({ code });
			const info = await module.getCompilationInfo();
			const errs = info.messages.filter((m) => m.type === 'error');
			if (errs.length) throw new Error('shader: ' + errs.map((m) => m.lineNum + ': ' + m.message).join('; '));
			return device.createComputePipelineAsync({ layout, compute: { module, entryPoint: 'main' } });
		};
		const [patch, soilA, soilB, plant] = await Promise.all([make(K.patchShader()), make(K.soilAShader()), make(K.soilBShader()), make(K.plantShader())]);
		ref.pipes = { patch, soilA, soilB, plant };
		current = ref;
		return ref;
	}

	function device() {
		if (current && !current.lost) return Promise.resolve(current);
		if (!devicePromise) {
			devicePromise = makeDevice().catch((err) => {
				devicePromise = null;
				throw err;
			});
		}
		return devicePromise;
	}

	function makeCtx(layer, ref) {
		const d = ref.device;
		const n = layer.n;
		const n2 = 2 * n;
		const nwg = Math.ceil(n / K.WG);
		const maskWords = Math.ceil(n2 / 32);
		const patchCap = Math.max(1 << 16, n);
		const B = GPUBufferUsage;
		const buf = (size, usage) => d.createBuffer({ size: Math.max(16, size), usage });
		const slotBytes = 3 * n2 * 4;
		const tileBytes = 4 * n * 4;
		const partBytes = K.N_PART * nwg * 4;
		const maskBytes = maskWords * 4;
		const ctx = {
			ref,
			layer,
			n,
			n2,
			nwg,
			maskWords,
			patchCap,
			slotBytes,
			tileBytes,
			partBytes,
			maskBytes,
			uni: buf(K.UNIFORM_BYTES, B.UNIFORM | B.COPY_DST),
			sF: buf(K.NF_SLOT * n2 * 4, B.STORAGE | B.COPY_DST | B.COPY_SRC),
			sU: buf(K.NU_SLOT * n2 * 4, B.STORAGE | B.COPY_DST),
			tF: buf(K.NF_TILE * n * 4, B.STORAGE | B.COPY_DST | B.COPY_SRC),
			part: buf(partBytes, B.STORAGE | B.COPY_SRC),
			mask: buf(maskBytes, B.STORAGE | B.COPY_SRC | B.COPY_DST),
			patch: buf(patchCap * 12, B.STORAGE | B.COPY_DST),
			staging: buf(slotBytes + tileBytes + partBytes + maskBytes, B.MAP_READ | B.COPY_DST),
			uniU: new Uint32Array(K.UNIFORM_BYTES / 4),
			patchU: new Uint32Array(patchCap * 3),
			patchF: null,
			patches: 0,
			bBio: new Float32Array(n2),
			bHealth: new Float32Array(n2),
			bFruit: new Float32Array(n2),
			bTile: [new Float32Array(n), new Float32Array(n), new Float32Array(n), new Float32Array(n)],
			sOcc: new Uint8Array(n2),
			sCap: new Float32Array(n2),
			sLife: new Uint16Array(n2),
			sBlight: new Uint8Array(n2),
			sForm: new Uint8Array(n2),
			sMoist: new Float32Array(n),
			sAmp: new Float32Array(n),
			ageU: new Uint32Array(n2),
			seed: (Math.random() * 4294967296) >>> 0,
			full: true,
			pending: false,
			ready: false,
			mapped: false,
			syncing: 0,
			failed: false,
			why: '',
			waiters: [],
			tick: 0,
		};
		ctx.uniF = new Float32Array(ctx.uniU.buffer);
		ctx.patchF = new Float32Array(ctx.patchU.buffer);
		const entry = (binding, buffer) => ({ binding, resource: { buffer } });
		ctx.bind = d.createBindGroup({ layout: ref.layout, entries: [entry(0, ctx.uni), entry(1, ctx.sF), entry(2, ctx.sU), entry(3, ctx.tF), entry(4, ctx.part), entry(5, ctx.mask), entry(6, ctx.patch)] });
		return ctx;
	}

	function wake(ctx) {
		const w = ctx.waiters;
		ctx.waiters = [];
		for (const f of w) f();
	}

	function fail(ctx, why) {
		if (ctx.failed) return;
		ctx.failed = true;
		ctx.why = why;
		wake(ctx);
	}

	function destroy(ctx) {
		live.delete(ctx);
		if (contexts.get(ctx.layer) === ctx) contexts.delete(ctx.layer);
		try {
			if (ctx.mapped) ctx.staging.unmap();
		} catch (e) {}
		for (const k of ['uni', 'sF', 'sU', 'tF', 'part', 'mask', 'patch', 'staging']) {
			try {
				ctx[k].destroy();
			} catch (e) {}
		}
		wake(ctx);
	}

	async function attach(layer) {
		if (!available()) return false;
		const old = contexts.get(layer);
		if (old && !old.failed) return true;
		if (old) destroy(old);
		let ref;
		try {
			ref = await device();
		} catch (err) {
			warn('WebGPU device unavailable', err);
			return false;
		}
		try {
			const ctx = makeCtx(layer, ref);
			contexts.set(layer, ctx);
			live.add(ctx);
			return true;
		} catch (err) {
			warn('could not allocate GPU buffers', err);
			return false;
		}
	}

	function active(layer) {
		const ctx = contexts.get(layer);
		return !!ctx && !ctx.failed;
	}

	function busy(layer) {
		const ctx = contexts.get(layer);
		if (!ctx || ctx.failed) return false;
		return ctx.syncing > 0 || (ctx.pending && !ctx.ready);
	}

	function whenIdle(layer) {
		const ctx = contexts.get(layer);
		if (!ctx || !busy(layer)) return Promise.resolve();
		return new Promise((resolve) => ctx.waiters.push(resolve));
	}

	function mergeTile(C, Bt, R, ro) {
		for (let i = 0; i < C.length; i++) {
			const c = C[i];
			const b = Bt[i];
			const r = R[ro + i];
			let v = c === b ? r : r + (c - b);
			if (v < 0) v = 0;
			C[i] = v;
		}
	}

	function consume(ctx, tick) {
		const L = ctx.layer;
		const soil = L.soil;
		const n = ctx.n;
		const n2 = ctx.n2;
		const raw = ctx.staging.getMappedRange();
		const R = new Float32Array(raw, 0, 3 * n2 + 4 * n);
		const P = new Float32Array(raw, ctx.slotBytes + ctx.tileBytes, K.N_PART * ctx.nwg);
		const M = new Uint32Array(raw, ctx.slotBytes + ctx.tileBytes + ctx.partBytes, ctx.maskWords);
		ctx.R = R;
		const to = 3 * n2;
		mergeTile(soil.nutrient, ctx.bTile[0], R, to);
		mergeTile(soil.litter, ctx.bTile[1], R, to + n);
		mergeTile(soil.carrion, ctx.bTile[2], R, to + 2 * n);
		mergeTile(L.poll, ctx.bTile[3], R, to + 3 * n);
		const species = L.species;
		const cap = L.cap;
		const life = L.life;
		const bio = L.biomass;
		const health = L.health;
		const fruit = L.fruit;
		const { sOcc, sCap, sLife, bBio, bHealth, bFruit } = ctx;
		for (let p = 0; p < n2; p++) {
			if (!species[p] || !sOcc[p] || cap[p] !== sCap[p] || life[p] !== sLife[p]) continue;
			const r = R[p];
			if (r < 0) {
				if (r < -1.5) {
					if (L.blight[p]) {
						L.disease.blightDeath(p);
						L.blighted++;
					} else L.starved++;
				}
				L._clear(p);
				continue;
			}
			const cb = bio[p];
			const bb = bBio[p];
			let v = cb === bb ? r : r + (cb - bb);
			bio[p] = v < 0 ? 0 : v;
			const ch = health[p];
			const bh = bHealth[p];
			health[p] = ch === bh ? R[n2 + p] : R[n2 + p] + (ch - bh);
			const cf = fruit[p];
			const bf = bFruit[p];
			v = cf === bf ? R[2 * n2 + p] : R[2 * n2 + p] + (cf - bf);
			fruit[p] = v < 0 ? 0 : v;
		}
		const sum = (f) => {
			let s = 0;
			const o = f * ctx.nwg;
			for (let k = 0; k < ctx.nwg; k++) s += P[o + k];
			return s;
		};
		L.totalBiomass = sum(PT.total);
		L.totalFruit = sum(PT.fruit);
		L.fungusTiles = Math.round(sum(PT.fungi));
		const flowers = Math.round(sum(PT.flowers));
		L.flowerTiles = flowers;
		L.flowerPoll = flowers ? sum(PT.flowerPoll) / flowers : 0;
		const st = L.stages;
		st.seedlings = Math.round(sum(PT.seedlings));
		st.mature = Math.round(sum(PT.mature));
		st.old = Math.round(sum(PT.old));
		soil.totalLitter = sum(PT.litter);
		soil.totalCarrion = sum(PT.carrion);
		const W = L.world.width;
		const H = L.world.height;
		for (let w = 0; w < ctx.maskWords; w++) {
			let bits = M[w];
			while (bits) {
				const low = bits & -bits;
				const p = w * 32 + (31 - Math.clz32(low));
				bits ^= low;
				if (!species[p] || !sOcc[p] || cap[p] !== sCap[p] || life[p] !== sLife[p]) continue;
				L._spread(p, p < n ? p : p - n, W, H, tick);
			}
		}
	}

	function release(ctx) {
		if (ctx.mapped) {
			ctx.staging.unmap();
			ctx.mapped = false;
		}
		ctx.R = null;
		ctx.pending = false;
		ctx.ready = false;
	}

	function cpuPart(L, tick, ck) {
		const n = L.n;
		const species = L.species;
		if (ck) {
			const age = L.age;
			const life = L.life;
			const floor = L.floor;
			const floorM = L.floorM;
			const rng = L.rng;
			for (let p = 0; p < 2 * n; p++) {
				const id = species[p];
				if (!id) continue;
				const ag = age[p] + 1;
				age[p] = ag;
				const lf = life[p];
				if (ag > OLD_DEATH_FRAC * lf && rng.next() < OLD_DEATH_P * Math.exp(OLD_DEATH_K * (ag / lf - OLD_DEATH_FRAC))) {
					L.oldDeaths++;
					L._selfSeed(p, p < n ? p : p - n, id);
					L._clear(p);
					continue;
				}
				if (L.leafOff && L.form[p] & FORM_DECID) L._dropLeaves(p, p < n ? p : p - n);
				const mt = lf * SEEDLING_FRAC > SEEDLING_MIN / AGE_STEP ? lf * SEEDLING_FRAC : SEEDLING_MIN / AGE_STEP;
				if (ag >= mt && floor[p] !== floorM[p]) floor[p] = floorM[p];
			}
		}
		let cover = 0;
		let seedTiles = 0;
		if (ck) {
			L._strategies(tick);
			seedTiles = L._seedPass(tick);
		}
		for (let i = 0; i < n; i++) {
			if (species[i] || species[n + i]) cover++;
		}
		L.coverTiles = cover;
		if (ck) {
			L.stages.seedTiles = seedTiles;
			L.stages.seedDormant = L.seedResting;
			L.seedResting = 0;
			L.updatePheno(tick, L.season);
		}
	}

	function addPatch(ctx, t, idx) {
		if (ctx.patches >= ctx.patchCap) return -1;
		const k = ctx.patches++ * 3;
		ctx.patchU[k] = t;
		ctx.patchU[k + 1] = idx;
		return k + 2;
	}

	function patchF(ctx, t, idx, v) {
		const k = addPatch(ctx, t, idx);
		if (k < 0) return false;
		ctx.patchF[k] = v;
		return true;
	}

	function patchU(ctx, idx, v) {
		const k = addPatch(ctx, 1, idx);
		if (k < 0) return false;
		ctx.patchU[k] = v;
		return true;
	}

	function fullUpload(ctx) {
		const L = ctx.layer;
		const soil = L.soil;
		const n = ctx.n;
		const n2 = ctx.n2;
		const q = ctx.ref.device.queue;
		const sF = new Float32Array(K.NF_SLOT * n2);
		const sU = new Uint32Array(K.NU_SLOT * n2);
		const tF = new Float32Array(K.NF_TILE * n);
		const f = (field, src) => sF.set(src, field * n2);
		f(SF.bio, L.biomass);
		f(SF.health, L.health);
		f(SF.fruit, L.fruit);
		f(SF.cap, L.cap);
		f(SF.growth, L.growth);
		f(SF.shade, L.shade);
		f(SF.disp, L.disp);
		f(SF.fruitK, L._fruitK);
		f(SF.bloomK, L._bloomK);
		f(SF.root, L.root);
		f(SF.sat, L.sat);
		for (let p = 0; p < n2; p++) {
			const occ = L.species[p] ? 1 : 0;
			const bl = L.blight[p] ? 1 : 0;
			sU[SU.occ * n2 + p] = occ;
			sU[SU.kind * n2 + p] = L.kind[p];
			sU[SU.myco * n2 + p] = L.myco[p];
			sU[SU.life * n2 + p] = L.life[p];
			sU[SU.age * n2 + p] = L.age[p];
			sU[SU.blight * n2 + p] = bl;
			sU[SU.form * n2 + p] = L.form[p];
			ctx.sForm[p] = L.form[p];
			ctx.sOcc[p] = occ;
			ctx.sCap[p] = L.cap[p];
			ctx.sLife[p] = L.life[p];
			ctx.sBlight[p] = bl;
		}
		const t = (field, src) => tF.set(src, field * n);
		t(TF.nut, soil.nutrient);
		t(TF.litter, soil.litter);
		t(TF.carrion, soil.carrion);
		t(TF.poll, L.poll);
		t(TF.samp, L.seasonAmp);
		t(TF.base, soil.base);
		t(TF.water, L.water);
		t(TF.decay, soil.decayK);
		if (L.moistMul) t(TF.moist, L.moistMul);
		else tF.fill(1, TF.moist * n, TF.moist * n + n);
		ctx.sMoist.set(tF.subarray(TF.moist * n, TF.moist * n + n));
		ctx.sAmp.set(L.seasonAmp);
		ctx.bBio.set(L.biomass);
		ctx.bHealth.set(L.health);
		ctx.bFruit.set(L.fruit);
		ctx.bTile[0].set(soil.nutrient);
		ctx.bTile[1].set(soil.litter);
		ctx.bTile[2].set(soil.carrion);
		ctx.bTile[3].set(L.poll);
		q.writeBuffer(ctx.sF, 0, sF);
		q.writeBuffer(ctx.sU, 0, sU);
		q.writeBuffer(ctx.tF, 0, tF);
		ctx.patches = 0;
		ctx.full = false;
	}

	function diffUpload(ctx, ck) {
		const L = ctx.layer;
		const soil = L.soil;
		const n = ctx.n;
		const n2 = ctx.n2;
		const R = ctx.R;
		const to = 3 * n2;
		ctx.patches = 0;
		const tiles = [soil.nutrient, soil.litter, soil.carrion, L.poll];
		for (let f = 0; f < 4; f++) {
			const C = tiles[f];
			const Bt = ctx.bTile[f];
			const o = to + f * n;
			for (let i = 0; i < n; i++) {
				const v = C[i];
				if (v !== R[o + i] && !patchF(ctx, 2, f * n + i, v)) return false;
				Bt[i] = v;
			}
		}
		const moist = L.moistMul;
		const amp = L.seasonAmp;
		const { sMoist, sAmp } = ctx;
		for (let i = 0; i < n; i++) {
			const m = moist ? moist[i] : 1;
			if (m !== sMoist[i]) {
				if (!patchF(ctx, 2, TF.moist * n + i, m)) return false;
				sMoist[i] = m;
			}
			const a = amp[i];
			if (a !== sAmp[i]) {
				if (!patchF(ctx, 2, TF.samp * n + i, a)) return false;
				sAmp[i] = a;
			}
		}
		const species = L.species;
		const cap = L.cap;
		const life = L.life;
		const bio = L.biomass;
		const health = L.health;
		const fruit = L.fruit;
		const blight = L.blight;
		const { sOcc, sCap, sLife, sBlight, sForm, bBio, bHealth, bFruit } = ctx;
		const form = L.form;
		for (let p = 0; p < n2; p++) {
			const occ = species[p] ? 1 : 0;
			const b = bio[p];
			const h = health[p];
			const fr = fruit[p];
			if (occ !== sOcc[p] || form[p] !== sForm[p] || (occ && (cap[p] !== sCap[p] || life[p] !== sLife[p]))) {
				const ok =
					patchU(ctx, SU.occ * n2 + p, occ) &&
					patchU(ctx, SU.kind * n2 + p, L.kind[p]) &&
					patchU(ctx, SU.myco * n2 + p, L.myco[p]) &&
					patchU(ctx, SU.life * n2 + p, life[p]) &&
						patchU(ctx, SU.form * n2 + p, form[p]) &&
					(ck || patchU(ctx, SU.age * n2 + p, L.age[p])) &&
					patchF(ctx, 0, SF.cap * n2 + p, cap[p]) &&
					patchF(ctx, 0, SF.growth * n2 + p, L.growth[p]) &&
					patchF(ctx, 0, SF.shade * n2 + p, L.shade[p]) &&
					patchF(ctx, 0, SF.disp * n2 + p, L.disp[p]) &&
					patchF(ctx, 0, SF.fruitK * n2 + p, L._fruitK[p]) &&
					patchF(ctx, 0, SF.bloomK * n2 + p, L._bloomK[p]) &&
					patchF(ctx, 0, SF.root * n2 + p, L.root[p]) &&
					patchF(ctx, 0, SF.bio * n2 + p, b) &&
					patchF(ctx, 0, SF.health * n2 + p, h) &&
					patchF(ctx, 0, SF.fruit * n2 + p, fr);
				if (!ok) return false;
				sOcc[p] = occ;
				sCap[p] = cap[p];
				sLife[p] = life[p];
				sForm[p] = form[p];
			} else {
				if (b !== R[p] && !patchF(ctx, 0, SF.bio * n2 + p, b)) return false;
				if (h !== R[n2 + p] && !patchF(ctx, 0, SF.health * n2 + p, h)) return false;
				if (fr !== R[2 * n2 + p] && !patchF(ctx, 0, SF.fruit * n2 + p, fr)) return false;
			}
			bBio[p] = b;
			bHealth[p] = h;
			bFruit[p] = fr;
			const bl = blight[p] ? 1 : 0;
			if (bl !== sBlight[p]) {
				if (!patchU(ctx, SU.blight * n2 + p, bl)) return false;
				sBlight[p] = bl;
			}
		}
		if (ck) {
			const ageU = ctx.ageU;
			const age = L.age;
			for (let p = 0; p < n2; p++) ageU[p] = age[p];
			ctx.ref.device.queue.writeBuffer(ctx.sU, SU.age * n2 * 4, ageU);
		}
		return true;
	}

	function dispatch(ctx, tick, ck) {
		const L = ctx.layer;
		const d = ctx.ref.device;
		const q = d.queue;
		const u = ctx.uniU;
		const uf = ctx.uniF;
		u[0] = ctx.n;
		u[1] = L.world.width;
		u[2] = L.world.height;
		u[3] = tick >>> 0;
		u[4] = ctx.seed;
		u[5] = ctx.nwg;
		u[6] = ctx.patches;
		u[7] = ck ? 1 : 0;
		uf[8] = L.season;
		uf[9] = L.bloomNow;
		uf[10] = L.fruitNow;
		uf[11] = 0.55 * FLOWER_SEED_BONUS * FRUIT_WIND;
		for (let b = 0; b < PHASE_BINS; b++) {
			uf[12 + b] = L.bloomBin[b];
			uf[20 + b] = L.fruitBin[b];
		}
		q.writeBuffer(ctx.uni, 0, u);
		if (ctx.patches) q.writeBuffer(ctx.patch, 0, ctx.patchU, 0, ctx.patches * 3);
		const enc = d.createCommandEncoder();
		enc.clearBuffer(ctx.mask);
		const pass = enc.beginComputePass();
		pass.setBindGroup(0, ctx.bind);
		const P = ctx.ref.pipes;
		if (ctx.patches) {
			pass.setPipeline(P.patch);
			pass.dispatchWorkgroups(Math.ceil(ctx.patches / K.WG));
		}
		pass.setPipeline(P.soilA);
		pass.dispatchWorkgroups(ctx.nwg);
		pass.setPipeline(P.soilB);
		pass.dispatchWorkgroups(ctx.nwg);
		pass.setPipeline(P.plant);
		pass.dispatchWorkgroups(ctx.nwg);
		pass.end();
		enc.copyBufferToBuffer(ctx.sF, 0, ctx.staging, 0, ctx.slotBytes);
		enc.copyBufferToBuffer(ctx.tF, 0, ctx.staging, ctx.slotBytes, ctx.tileBytes);
		enc.copyBufferToBuffer(ctx.part, 0, ctx.staging, ctx.slotBytes + ctx.tileBytes, ctx.partBytes);
		enc.copyBufferToBuffer(ctx.mask, 0, ctx.staging, ctx.slotBytes + ctx.tileBytes + ctx.partBytes, ctx.maskBytes);
		q.submit([enc.finish()]);
		ctx.pending = true;
		ctx.ready = false;
		ctx.tick = tick;
		ctx.staging.mapAsync(GPUMapMode.READ).then(
			() => {
				if (ctx.failed) return;
				ctx.mapped = true;
				ctx.ready = true;
				wake(ctx);
			},
			(err) => fail(ctx, 'readback failed: ' + ((err && err.message) || err))
		);
	}

	function step(L, tick) {
		const ctx = contexts.get(L);
		if (!ctx) return false;
		if (ctx.failed) {
			warn(ctx.why);
			destroy(ctx);
			return false;
		}
		const season = Math.sin((tick / YEAR_TICKS) * Math.PI * 2);
		L.season = season;
		L.bloomNow = L.seasonsOn ? bloomFactor(season) : 0.5;
		L.fruitNow = L.seasonsOn ? fruitFactor(Math.sin((tick / YEAR_TICKS - FRUIT_LAG) * Math.PI * 2)) : 0.5;
		L.phaseTick(tick, season);
		const ck = (tick & 7) === 0;
		if (ctx.pending && !ctx.ready) {
			L.version++;
			return true;
		}
		try {
			if (ctx.ready) consume(ctx, tick);
			cpuPart(L, tick, ck);
			if (ctx.full || !ctx.R || !diffUpload(ctx, ck)) fullUpload(ctx);
			release(ctx);
			dispatch(ctx, tick, ck);
		} catch (err) {
			fail(ctx, 'step failed: ' + ((err && err.message) || err));
			warn(ctx.why);
			destroy(ctx);
		}
		const soil = L.soil;
		if (soil._cellTick++ % CARRION_CELL_EVERY === 0) soil._buildCarrionCells();
		L.version++;
		return true;
	}

	async function sync(L) {
		const ctx = contexts.get(L);
		if (!ctx) return false;
		ctx.syncing++;
		try {
			while (ctx.pending && !ctx.ready && !ctx.failed) await new Promise((resolve) => ctx.waiters.push(resolve));
			if (ctx.failed) return false;
			if (ctx.ready) {
				consume(ctx, ctx.tick + 1);
				release(ctx);
				ctx.full = true;
			}
			return true;
		} catch (err) {
			fail(ctx, 'sync failed: ' + ((err && err.message) || err));
			return false;
		} finally {
			ctx.syncing--;
			if (!ctx.syncing) wake(ctx);
		}
	}

	async function detach(L) {
		const ctx = contexts.get(L);
		if (!ctx) return;
		await sync(L);
		destroy(ctx);
	}

	function drop(L) {
		const ctx = contexts.get(L);
		if (ctx) destroy(ctx);
	}

	return { available, attach, detach, drop, step, sync, busy, whenIdle, active };
})();
