const TERRAIN_VS = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const TERRAIN_FS = `#version 300 es
precision highp float;
uniform sampler2D u_terrain;
uniform sampler2D u_veg;
uniform sampler2D u_info;
uniform vec2 u_origin;
uniform float u_scale;
uniform vec2 u_res;
uniform vec2 u_map;
uniform float u_vegAmount;
uniform float u_winter;
uniform float u_time;
uniform float u_grid;
uniform float u_overlay;
out vec4 outColor;

void main() {
	vec2 px = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y);
	vec2 w = u_origin + px * u_scale;
	vec3 bg = vec3(0.043, 0.059, 0.055);
	if (w.x < 0.0 || w.y < 0.0 || w.x > u_map.x || w.y > u_map.y) {
		outColor = vec4(bg, 1.0);
		return;
	}
	vec2 uv = w / u_map;
	vec4 t = texture(u_terrain, uv);
	vec4 v = texture(u_veg, uv);
	vec4 info = texture(u_info, uv);
	vec3 col = t.rgb;
	col = mix(col, v.rgb, v.a * u_vegAmount);
	float water = info.g;
	float snow = smoothstep(0.42, 0.18, info.r + 0.22 * (1.0 - u_winter)) * (1.0 - water) * u_winter * (1.0 - u_overlay);
	col = mix(col, vec3(0.93, 0.95, 0.97), snow * 0.8);
	float sh = sin(w.x * 0.9 + u_time * 1.3) * sin(w.y * 1.1 - u_time * 1.1);
	col += water * sh * 0.025 * (1.0 - u_overlay);
	col *= t.a * 2.0;
	if (u_grid > 0.0) {
		vec2 f = abs(fract(w) - 0.5);
		float g = smoothstep(0.5 - u_scale * 1.2, 0.5, max(f.x, f.y));
		col = mix(col, col * 0.8, g * u_grid);
	}
	vec2 e = min(w, u_map - w);
	float edge = smoothstep(0.0, 2.5, min(e.x, e.y));
	outColor = vec4(mix(bg, col, 0.35 + 0.65 * edge), 1.0);
}`;

const SPRITE_VS = `#version 300 es
in vec2 a_corner;
in vec4 a_inst;
in vec2 a_extra;
in vec3 a_c0;
in vec3 a_c1;
in vec3 a_c2;
uniform vec2 u_origin;
uniform float u_scale;
uniform vec2 u_res;
uniform vec2 u_grid;
out vec2 v_uv;
out vec3 v_c0;
out vec3 v_c1;
out vec3 v_c2;
out float v_alpha;
void main() {
	vec2 w = a_inst.xy + a_corner * a_inst.z;
	vec2 p = (w - u_origin) / u_scale;
	gl_Position = vec4(p.x / u_res.x * 2.0 - 1.0, 1.0 - p.y / u_res.y * 2.0, 0.0, 1.0);
	float icon = a_inst.w;
	vec2 cell = vec2(mod(icon, u_grid.x), floor(icon / u_grid.x));
	vec2 c = a_corner + 0.5;
	if (a_extra.x < 0.0) c.x = 1.0 - c.x;
	v_uv = (cell + c) / u_grid;
	v_c0 = a_c0;
	v_c1 = a_c1;
	v_c2 = a_c2;
	v_alpha = a_extra.y;
}`;

const SPRITE_FS = `#version 300 es
precision mediump float;
uniform sampler2D u_role;
uniform sampler2D u_fixed;
in vec2 v_uv;
in vec3 v_c0;
in vec3 v_c1;
in vec3 v_c2;
in float v_alpha;
out vec4 outColor;
void main() {
	vec4 r = texture(u_role, v_uv);
	if (r.a < 0.01) discard;
	vec4 f = texture(u_fixed, v_uv);
	float s = r.r + r.g + r.b;
	vec3 tint = s > 0.001 ? (r.r * v_c0 + r.g * v_c1 + r.b * v_c2) / s : vec3(0.0);
	vec3 col = tint * max(r.a - f.a, 0.0) + f.rgb;
	outColor = vec4(col, r.a) * v_alpha;
}`;

function compileProgram(gl, vs, fs) {
	const mk = (type, src) => {
		const s = gl.createShader(type);
		gl.shaderSource(s, src);
		gl.compileShader(s);
		if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
		return s;
	};
	const p = gl.createProgram();
	gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
	gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
	gl.linkProgram(p);
	if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
	const u = {};
	const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
	for (let i = 0; i < n; i++) {
		const name = gl.getActiveUniform(p, i).name;
		u[name] = gl.getUniformLocation(p, name);
	}
	return { p, u };
}

const RAMPS = {
	altitude: [[0, '#08213d'], [0.3, '#1d5f96'], [0.42, '#6fb4d8'], [0.43, '#3f7d3a'], [0.6, '#a9a660'], [0.78, '#8a6f55'], [1, '#f4f4f4']],
	temperature: [[0, '#2c3e8f'], [0.3, '#4aa3d8'], [0.5, '#d9e6a0'], [0.72, '#f0a84a'], [1, '#c2352b']],
	humidity: [[0, '#b58a4a'], [0.35, '#e0d08a'], [0.6, '#6bbf8a'], [1, '#1b5c8f']],
	fertility: [[0, '#5a4636'], [0.4, '#8f8350'], [0.7, '#7cae55'], [1, '#2f7d3c']],
	nutrients: [[0, '#6b6259'], [0.1, '#8a7650'], [0.25, '#9c9a4e'], [0.45, '#4f8a3c'], [0.7, '#1f4d24'], [1, '#12331a']],
	litter: [[0, '#5d6360'], [0.15, '#7a6a4c'], [0.4, '#8f6a3a'], [0.7, '#6b4424'], [1, '#3a2312']],
	bugs: [[0, '#1b1d20'], [0.12, '#2f2a22'], [0.35, '#8a5a1c'], [0.6, '#e0a02a'], [0.82, '#f0605e'], [1, '#ff3fa4']],
	disease: [[0, '#16191a'], [0.1, '#262b22'], [0.35, '#4d5b2a'], [0.6, '#8ea636'], [0.85, '#c8d84a'], [1, '#eef27a']],
};

const LIVE_MODES = { nutrients: 1, litter: 1, bugs: 1, disease: 1 };
const BUG_DOT = 0.1;
const BUG_DOT_PX = 4.5;
const BUG_HL_SCALE = 1.6;
const BUG_PER_DENSITY = 4;
const BUG_JITTER = [0.05, 0.03, 0.04, 0.12];
const BUG_SPEED = [1.6, 0.7, 1.1, 2.6];
const FLOWER_LEAF = [92, 138, 66];
const FLOWER_TINT = 0.7;
const FLOWER_SHADED = 0.3;
const FRUIT_SHOW = 0.06;
const FRUIT_EMPTY_SIZE = 0.85;
const FUNGUS_SCALE = 0.5;

function percentile99(src, out) {
	const n = src.length;
	let max = 0;
	for (let i = 0; i < n; i++) if (src[i] > max) max = src[i];
	if (!(max > 0)) {
		out.fill(0);
		return 0;
	}
	const bins = new Uint32Array(1024);
	let count = 0;
	for (let i = 0; i < n; i++) {
		const v = src[i];
		if (v > 0) {
			bins[Math.min(1023, ((v / max) * 1024) | 0)]++;
			count++;
		}
	}
	let want = count * 0.99;
	let k = 0;
	while (k < 1023 && want > bins[k]) want -= bins[k++];
	const p = ((k + 1) / 1024) * max;
	for (let i = 0; i < n; i++) out[i] = Math.min(1, src[i] / p);
	return p;
}

const SICK_RGB = [150, 120, 50];
const SICK_MIX = 0.65;
const BLIGHT_RGB = [125, 140, 115];
const BLIGHT_MIX = 0.6;
const INFECT_MIX = 0.55;
const MARK_SCALE = 0.4;

function rampLookup(stops) {
	const lut = new Uint8Array(256 * 3);
	const rgb = stops.map(([t, c]) => [t, hexToRgb(c)]);
	for (let i = 0; i < 256; i++) {
		const t = i / 255;
		let k = 0;
		while (k < rgb.length - 2 && t > rgb[k + 1][0]) k++;
		const [t0, a] = rgb[k];
		const [t1, b] = rgb[k + 1];
		const f = Math.max(0, Math.min(1, (t - t0) / (t1 - t0 || 1)));
		for (let c = 0; c < 3; c++) lut[i * 3 + c] = a[c] + (b[c] - a[c]) * f;
	}
	return lut;
}

const ALPINE_ID = BIOME_LIST.indexOf('ALPINE');
const GLACIER_ID = BIOME_LIST.indexOf('GLACIER');
const FROZEN_DESERT_ID = BIOME_LIST.indexOf('FROZEN_DESERT');
const FROZEN_OCEAN_ID = BIOME_LIST.indexOf('FROZEN_OCEAN');

class WorldRenderer {
	constructor(canvas) {
		this.canvas = canvas;
		const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: true, powerPreference: 'high-performance' });
		if (!gl) throw new Error('WebGL2 is not available in this browser.');
		this.gl = gl;
		this.dpr = 1;
		this.cam = { x: 0, y: 0, zoom: 4 };
		this.mode = 'biome';
		this.showPlants = true;
		this.showAnimals = true;
		this.highlight = null;
		this.time = 0;

		this.terrainProg = compileProgram(gl, TERRAIN_VS, TERRAIN_FS);
		this.spriteProg = compileProgram(gl, SPRITE_VS, SPRITE_FS);

		this.fsVao = gl.createVertexArray();
		gl.bindVertexArray(this.fsVao);
		const fsBuf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, fsBuf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
		const lp = gl.getAttribLocation(this.terrainProg.p, 'a_pos');
		gl.enableVertexAttribArray(lp);
		gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);

		this.capacity = 0;
		this.spriteVao = gl.createVertexArray();
		gl.bindVertexArray(this.spriteVao);
		const quad = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, quad);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]), gl.STATIC_DRAW);
		const sp = this.spriteProg.p;
		const aCorner = gl.getAttribLocation(sp, 'a_corner');
		gl.enableVertexAttribArray(aCorner);
		gl.vertexAttribPointer(aCorner, 2, gl.FLOAT, false, 0, 0);
		this.instF = gl.createBuffer();
		this.instC = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.instF);
		const fAttr = (name, size, off) => {
			const l = gl.getAttribLocation(sp, name);
			gl.enableVertexAttribArray(l);
			gl.vertexAttribPointer(l, size, gl.FLOAT, false, 24, off);
			gl.vertexAttribDivisor(l, 1);
		};
		fAttr('a_inst', 4, 0);
		fAttr('a_extra', 2, 16);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.instC);
		const cAttr = (name, off) => {
			const l = gl.getAttribLocation(sp, name);
			gl.enableVertexAttribArray(l);
			gl.vertexAttribPointer(l, 3, gl.UNSIGNED_BYTE, true, 12, off);
			gl.vertexAttribDivisor(l, 1);
		};
		cAttr('a_c0', 0);
		cAttr('a_c1', 3);
		cAttr('a_c2', 6);
		gl.bindVertexArray(null);
		this._ensureCapacity(8192);

		const atlas = buildIconAtlas(64);
		this.atlas = atlas;
		const up = (data) => {
			const tex = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, tex);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, atlas.width, atlas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			return tex;
		};
		this.roleTex = up(atlas.role);
		this.fixedTex = up(atlas.fixed);

		this.spIcon = new Int16Array(0);
		this.spCol = new Uint8Array(0);
		this.spLookupTick = -1;
		this.spLookupSize = 0;

		this.vegDirty = true;
		this.lastVegUpdate = 0;
		this.lastSoilUpdate = 0;
		this._tint = new Uint8Array(9);
	}

	_ensureCapacity(n) {
		if (n <= this.capacity) return;
		const cap = Math.max(n, this.capacity * 2);
		this.capacity = cap;
		this.bufF = new Float32Array(cap * 6);
		this.bufC = new Uint8Array(cap * 12);
		const gl = this.gl;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.instF);
		gl.bufferData(gl.ARRAY_BUFFER, this.bufF.byteLength, gl.DYNAMIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.instC);
		gl.bufferData(gl.ARRAY_BUFFER, this.bufC.byteLength, gl.DYNAMIC_DRAW);
	}

	_tex(w, h, data, linear) {
		const gl = this.gl;
		const tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
		const f = linear ? gl.LINEAR : gl.NEAREST;
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		return tex;
	}

	setWorld(world, eco) {
		const gl = this.gl;
		for (const t of [this.terrainTex, this.vegTex, this.infoTex]) if (t) gl.deleteTexture(t);
		this.world = world;
		this.eco = eco;
		const W = world.width;
		const H = world.height;
		this.terrainData = new Uint8Array(W * H * 4);
		this.vegData = new Uint8Array(W * H * 4);
		const info = new Uint8Array(W * H * 4);
		const water = eco.plants.water;
		for (let i = 0; i < W * H; i++) {
			info[i * 4] = world.temperature[i] * 255;
			info[i * 4 + 1] = water[i] ? 255 : 0;
			info[i * 4 + 2] = eco.plants.depth[i] * 255;
			info[i * 4 + 3] = 255;
		}
		this.terrainTex = this._tex(W, H, this.terrainData, true);
		this.vegTex = this._tex(W, H, this.vegData, true);
		this.infoTex = this._tex(W, H, info, true);
		this.soilField = new Float32Array(W * H);
		this.sickField = new Float32Array(W * H);
		this._computeShade();
		this.setMode(this.mode);
		this.spLookupTick = -1;
		this.spLookupSize = 0;
		this.vegDirty = true;
		this.fit();
	}

	_computeShade() {
		const w = this.world;
		const W = w.width;
		const H = w.height;
		const alt = w.altitude;
		const sea = BIOME_THRESHOLDS.seaLevel;
		const shade = new Float32Array(W * H);
		for (let y = 0; y < H; y++) {
			for (let x = 0; x < W; x++) {
				const i = y * W + x;
				const a = Math.max(alt[i], sea);
				const la = alt[y * W + Math.max(0, x - 1)];
				const ua = alt[Math.max(0, y - 1) * W + x];
				const l = la < sea ? a : la;
				const u = ua < sea ? a : ua;
				const d = (a - l + (a - u)) * 16;
				shade[i] = Math.max(0.68, Math.min(1.22, 1 + d));
			}
		}
		this.shade = shade;
	}

	setMode(mode) {
		this.mode = mode;
		const w = this.world;
		if (!w) return;
		const n = w.width * w.height;
		const out = this.terrainData;
		const sea = BIOME_THRESHOLDS.seaLevel;
		const lut = RAMPS[mode] ? rampLookup(RAMPS[mode]) : null;
		let field = mode === 'altitude' ? w.altitude : mode === 'temperature' ? w.temperature : mode === 'humidity' ? w.humidity : mode === 'fertility' ? w.fertility : null;
		if (mode === 'nutrients') {
			const nut = this.eco.plants.soil.nutrient;
			field = this.soilField;
			for (let i = 0; i < n; i++) field[i] = nut[i] / SOIL_MAX;
			this.lastSoilUpdate = performance.now();
		} else if (mode === 'litter') {
			field = this.soilField;
			const lit = this.eco.plants.soil.litter;
			if (lit) percentile99(lit, field);
			else field.fill(0);
			this.lastSoilUpdate = performance.now();
		} else if (mode === 'bugs') {
			field = this.soilField;
			const B = this.eco.bugs;
			if (B && B.total) percentile99(B.total, field);
			else field.fill(0);
			this.lastSoilUpdate = performance.now();
		} else if (mode === 'disease') {
			field = this.soilField;
			const D = this.eco.disease;
			const src = this.sickField;
			src.fill(0);
			if (D && D.on) {
				const A = this.eco.animals;
				const W = w.width;
				for (let i = 0; i < A.count; i++) {
					if (!A.strain[i]) continue;
					const x = Math.min(W - 1, Math.max(0, Math.floor(A.x[i])));
					const y = Math.min(w.height - 1, Math.max(0, Math.floor(A.y[i])));
					src[y * W + x] += 1;
				}
				const bl = this.eco.plants.blight;
				if (bl) for (let p = 0; p < bl.length; p++) if (bl[p]) src[p % n] += 0.5;
			}
			percentile99(src, field);
			this.lastSoilUpdate = performance.now();
		}
		const water = this.eco.plants.water;
		for (let i = 0; i < n; i++) {
			let r;
			let g;
			let b;
			if (lut) {
				const k = Math.max(0, Math.min(255, (field[i] * 255) | 0)) * 3;
				r = lut[k];
				g = lut[k + 1];
				b = lut[k + 2];
			} else {
				const id = w.biome[i] * 3;
				r = BIOME_COLOR_TABLE[id];
				g = BIOME_COLOR_TABLE[id + 1];
				b = BIOME_COLOR_TABLE[id + 2];
				const bk = w.biome[i];
				if (bk === ALPINE_ID) {
					const a = w.altitude[i];
					const s = Math.max(0, Math.min(1, (a - 0.72) / 0.2));
					const k = s * s * (3 - 2 * s);
					r = 128 + (226 - 128) * k;
					g = 132 + (232 - 132) * k;
					b = 128 + (236 - 128) * k;
				} else if (bk === GLACIER_ID) {
					r = 176; g = 212; b = 226;
				} else if (bk === FROZEN_DESERT_ID) {
					r = 172; g = 180; b = 176;
				} else if (bk === FROZEN_OCEAN_ID) {
					r = 150; g = 190; b = 204;
				}
				if (water[i]) {
					const depth = Math.max(0, (sea - w.altitude[i]) / sea);
					const k = 1 - depth * 0.55;
					r *= k;
					g *= k;
					b *= k * 0.95 + 0.05;
				}
				if (mode === 'vegetation') {
					const m = (r + g + b) / 3;
					r = g = b = water[i] ? m * 0.45 : m * 0.55;
					if (water[i]) b += 25;
				}
			}
			out[i * 4] = r;
			out[i * 4 + 1] = g;
			out[i * 4 + 2] = b;
			out[i * 4 + 3] = Math.min(255, this.shade[i] * 127.5);
		}
		const gl = this.gl;
		gl.bindTexture(gl.TEXTURE_2D, this.terrainTex);
		gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w.width, w.height, gl.RGBA, gl.UNSIGNED_BYTE, out);
		this.vegDirty = true;
	}

	_hostHighlight() {
		const hl = this.highlight;
		if (hl === null) return null;
		const sp = this.eco.registry.get(hl);
		return sp && (sp.group === 'bug' || sp.group === 'pathogen') ? null : hl;
	}

	_refreshSpeciesLookup() {
		const reg = this.eco.registry;
		const size = reg.nextId + 64;
		if (size > this.spLookupSize) {
			const n = Math.max(size, this.spLookupSize * 2, 256);
			this.spIcon = new Int16Array(n);
			this.spCol = new Uint8Array(n * 9);
			this.spLookupSize = n;
			this.spLookupTick = -1;
		}
		if (this.spLookupTick === this.eco.tick) return;
		this.spLookupTick = this.eco.tick;
		for (const id of reg.living) {
			const sp = reg.get(id);
			this.spIcon[id] = ICON_INDEX[sp.icon || sp.category] ?? ICON_INDEX.dot;
			const o = id * 9;
			const c = this.spCol;
			c[o] = sp.rgb[0] * 255;
			c[o + 1] = sp.rgb[1] * 255;
			c[o + 2] = sp.rgb[2] * 255;
			c[o + 3] = sp.rgbDark[0] * 255;
			c[o + 4] = sp.rgbDark[1] * 255;
			c[o + 5] = sp.rgbDark[2] * 255;
			c[o + 6] = sp.rgbLight[0] * 255;
			c[o + 7] = sp.rgbLight[1] * 255;
			c[o + 8] = sp.rgbLight[2] * 255;
		}
	}

	_updateVegetation() {
		const P = this.eco.plants;
		const out = this.vegData;
		const col = this.spCol;
		const hl = this._hostHighlight();
		const n = P.n;
		const health = P.health;
		const blight = P.blight;
		const icons = this.spIcon;
		const flowerIcon = ICON_INDEX.flower;
		const seasons = this.eco.options.seasons;
		let bloom = typeof P.bloomNow === 'number' ? P.bloomNow : typeof bloomFactor === 'function' ? (seasons ? bloomFactor(P.season || 0) : 0.5) : 0;
		bloom = Math.max(0, Math.min(1, bloom || 0)) * FLOWER_TINT;
		for (let i = 0; i < n; i++) {
			const u = n + i;
			const top = P.species[i];
			const low = P.species[u];
			const o = i * 4;
			if (!top && !low) {
				out[o + 3] = 0;
				continue;
			}
			const p = top && (P.biomass[i] > 0.3 || !low) ? i : u;
			const id = P.species[p];
			const b = P.biomass[i] + P.biomass[u];
			const wet = P.water[i];
			let a = wet ? Math.min(1, b / 1.4) * 0.4 : Math.min(1, b / 1.8) * 0.85;
			const lit = top === hl || low === hl;
			if (hl !== null) a = lit ? 1 : a * 0.25;
			const c = id * 9;
			let r;
			let g;
			let bl;
			if (wet && !lit) {
				r = col[c] * 0.35 + 20;
				g = col[c + 1] * 0.35 + 95;
				bl = col[c + 2] * 0.35 + 80;
			} else {
				r = col[c];
				g = col[c + 1];
				bl = col[c + 2];
			}
			if (low && icons[low] === flowerIcon && !wet && !(lit && top === hl)) {
				const fc = low * 9;
				let f = bloom;
				if (p === i) f *= FLOWER_SHADED;
				else {
					r = FLOWER_LEAF[0];
					g = FLOWER_LEAF[1];
					bl = FLOWER_LEAF[2];
				}
				r += (col[fc] - r) * f;
				g += (col[fc + 1] - g) * f;
				bl += (col[fc + 2] - bl) * f;
			}
			const k = (1 - health[p]) * SICK_MIX;
			r += (SICK_RGB[0] - r) * k;
			g += (SICK_RGB[1] - g) * k;
			bl += (SICK_RGB[2] - bl) * k;
			if (blight && blight[p]) {
				r += (BLIGHT_RGB[0] - r) * BLIGHT_MIX;
				g += (BLIGHT_RGB[1] - g) * BLIGHT_MIX;
				bl += (BLIGHT_RGB[2] - bl) * BLIGHT_MIX;
			}
			out[o] = r;
			out[o + 1] = g;
			out[o + 2] = bl;
			out[o + 3] = a * 255;
		}
		const gl = this.gl;
		gl.bindTexture(gl.TEXTURE_2D, this.vegTex);
		gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.world.width, this.world.height, gl.RGBA, gl.UNSIGNED_BYTE, out);
		this.vegDirty = false;
	}

	resize() {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const r = this.canvas.getBoundingClientRect();
		const w = Math.max(1, Math.round(r.width * dpr));
		const h = Math.max(1, Math.round(r.height * dpr));
		if (this.canvas.width !== w || this.canvas.height !== h) {
			this.canvas.width = w;
			this.canvas.height = h;
		}
		this.dpr = dpr;
		this.cssW = r.width;
		this.cssH = r.height;
	}

	minZoom() {
		if (!this.world) return 1;
		return Math.min(this.cssW / this.world.width, this.cssH / this.world.height) * 0.9;
	}

	fit() {
		this.resize();
		if (!this.world) return;
		this.cam.zoom = Math.min(this.cssW / this.world.width, this.cssH / this.world.height) * 0.98;
		this.cam.x = this.world.width / 2;
		this.cam.y = this.world.height / 2;
	}

	clampCam() {
		const c = this.cam;
		c.zoom = Math.max(this.minZoom(), Math.min(64, c.zoom));
		c.x = Math.max(0, Math.min(this.world.width, c.x));
		c.y = Math.max(0, Math.min(this.world.height, c.y));
	}

	screenToWorld(sx, sy) {
		const c = this.cam;
		return [c.x + (sx - this.cssW / 2) / c.zoom, c.y + (sy - this.cssH / 2) / c.zoom];
	}

	zoomAt(factor, sx, sy) {
		const [wx, wy] = this.screenToWorld(sx, sy);
		this.cam.zoom *= factor;
		this.clampCam();
		this.cam.x = wx - (sx - this.cssW / 2) / this.cam.zoom;
		this.cam.y = wy - (sy - this.cssH / 2) / this.cam.zoom;
		this.clampCam();
	}

	pan(dx, dy) {
		this.cam.x -= dx / this.cam.zoom;
		this.cam.y -= dy / this.cam.zoom;
		this.clampCam();
	}

	draw(alpha, dt) {
		if (!this.world) return;
		this.time += dt;
		this.resize();
		const gl = this.gl;
		const eco = this.eco;
		const c = this.cam;
		const W = this.world.width;
		const H = this.world.height;
		const scale = 1 / (c.zoom * this.dpr);
		const ox = c.x - (this.cssW / 2) / c.zoom;
		const oy = c.y - (this.cssH / 2) / c.zoom;

		this._refreshSpeciesLookup();
		const now = performance.now();
		const vegOn = this.mode === 'biome' || this.mode === 'vegetation';
		if (vegOn && (this.vegDirty || now - this.lastVegUpdate > 180)) {
			this._updateVegetation();
			this.lastVegUpdate = now;
		}
		if (LIVE_MODES[this.mode] && now - this.lastSoilUpdate > 500) this.setMode(this.mode);

		gl.viewport(0, 0, this.canvas.width, this.canvas.height);
		gl.disable(gl.BLEND);
		const tp = this.terrainProg;
		gl.useProgram(tp.p);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.terrainTex);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.vegTex);
		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, this.infoTex);
		gl.uniform1i(tp.u.u_terrain, 0);
		gl.uniform1i(tp.u.u_veg, 1);
		gl.uniform1i(tp.u.u_info, 2);
		gl.uniform2f(tp.u.u_origin, ox, oy);
		gl.uniform1f(tp.u.u_scale, scale);
		gl.uniform2f(tp.u.u_res, this.canvas.width, this.canvas.height);
		gl.uniform2f(tp.u.u_map, W, H);
		gl.uniform1f(tp.u.u_vegAmount, !vegOn || !this.showPlants ? 0 : this.mode === 'vegetation' ? 1 : 0.5);
		const season = eco.options.seasons ? eco.plants.season || 0 : 0;
		gl.uniform1f(tp.u.u_winter, Math.max(0, -season));
		gl.uniform1f(tp.u.u_time, this.time);
		gl.uniform1f(tp.u.u_grid, c.zoom > 20 ? Math.min(1, (c.zoom - 20) / 20) * 0.5 : 0);
		gl.uniform1f(tp.u.u_overlay, RAMPS[this.mode] ? 1 : 0);
		gl.bindVertexArray(this.fsVao);
		gl.drawArrays(gl.TRIANGLES, 0, 3);

		const x0 = Math.max(0, Math.floor(ox) - 2);
		const y0 = Math.max(0, Math.floor(oy) - 2);
		const x1 = Math.min(W, Math.ceil(ox + this.cssW / c.zoom) + 2);
		const y1 = Math.min(H, Math.ceil(oy + this.cssH / c.zoom) + 2);
		let n = 0;
		if (this.showPlants && vegOn && c.zoom >= 9) n = this._pushPlants(n, x0, y0, x1, y1);
		if (c.zoom >= 9) n = this._pushBugs(n, x0, y0, x1, y1);
		if (this.showAnimals) n = this._pushAnimals(n, alpha, x0, y0, x1, y1);
		this.spriteCount = n;
		if (!n) return;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.instF);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.bufF, 0, n * 6);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.instC);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.bufC, 0, n * 12);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		const sp = this.spriteProg;
		gl.useProgram(sp.p);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.roleTex);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.fixedTex);
		gl.uniform1i(sp.u.u_role, 0);
		gl.uniform1i(sp.u.u_fixed, 1);
		gl.uniform2f(sp.u.u_origin, ox, oy);
		gl.uniform1f(sp.u.u_scale, scale);
		gl.uniform2f(sp.u.u_res, this.canvas.width, this.canvas.height);
		gl.uniform2f(sp.u.u_grid, this.atlas.cols, this.atlas.rows);
		gl.bindVertexArray(this.spriteVao);
		gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n);
		gl.bindVertexArray(null);
	}

	_put(n, x, y, size, icon, flip, alpha, colOff, colArr) {
		if (n >= this.capacity) this._ensureCapacity(n + 1);
		const f = this.bufF;
		const o = n * 6;
		f[o] = x;
		f[o + 1] = y;
		f[o + 2] = size;
		f[o + 3] = icon;
		f[o + 4] = flip;
		f[o + 5] = alpha;
		const c = this.bufC;
		const k = n * 12;
		for (let q = 0; q < 9; q++) c[k + q] = colArr[colOff + q];
		return n + 1;
	}

	_tinted(id, h, col, blt) {
		const t = this._tint;
		const k = (1 - h) * SICK_MIX;
		const kb = blt ? BLIGHT_MIX : 0;
		const o = id * 9;
		for (let q = 0; q < 9; q++) {
			let v = col[o + q];
			v += (SICK_RGB[q % 3] - v) * k;
			t[q] = v + (BLIGHT_RGB[q % 3] - v) * kb;
		}
		return t;
	}

	_infected(id, col) {
		const t = this._tint;
		const o = id * 9;
		for (let q = 0; q < 9; q++) {
			const v = col[o + q];
			t[q] = v + (BLIGHT_RGB[q % 3] - v) * INFECT_MIX;
		}
		return t;
	}

	_pushPlants(n, x0, y0, x1, y1) {
		const P = this.eco.plants;
		const W = this.world.width;
		const N = P.n;
		const icons = this.spIcon;
		const col = this.spCol;
		const hl = this._hostHighlight();
		const kind = P.kind;
		const fruit = P.fruit;
		const blight = P.blight;
		const fruitA = ICON_INDEX.fruittree;
		const fruitB = ICON_INDEX.berrybush;
		const fruitScale = (p, ic, b) => {
			if (ic !== fruitA && ic !== fruitB) return 1;
			const f = fruit ? Math.min(1, fruit[p] / (FRUIT_SHOW * Math.max(b, 0.1))) : 0;
			return FRUIT_EMPTY_SIZE + (1 - FRUIT_EMPTY_SIZE) * f;
		};
		this._ensureCapacity(n + 2 * (x1 - x0) * (y1 - y0) + 1);
		for (let y = y0; y < y1; y++) {
			for (let x = x0; x < x1; x++) {
				const i = y * W + x;
				const h = Math.imul(i, 2654435761) >>> 0;
				const jx = ((h & 255) / 255 - 0.5) * 0.35;
				const jy = (((h >>> 8) & 255) / 255 - 0.5) * 0.25;
				const flip = h & 0x10000 ? 1 : -1;
				const water = P.water[i];
				const u = N + i;
				const low = P.species[u];
				const lb = P.biomass[u];
				if (low && lb >= 0.08) {
					const full = P.cap[u] > 0 ? Math.min(1, lb / P.cap[u]) : 0.5;
					const ls = kind && kind[u] ? FUNGUS_SCALE : 0.6;
					const size = ls * (0.45 + 0.55 * Math.sqrt(Math.min(lb, 3.2) / 3.2)) * (0.65 + 0.35 * full) * fruitScale(u, icons[low], lb);
					let a = water ? 0.75 : 1;
					if (hl !== null && low !== hl) a *= 0.3;
					n = this._put(n, x + 0.28 + jx * 0.5, y + 0.97 - size * 0.5, size, icons[low], -flip, a, 0, this._tinted(low, P.health[u], col, blight && blight[u]));
				}
				const id = P.species[i];
				if (!id) continue;
				const b = P.biomass[i];
				if (b < 0.08) continue;
				const full = P.cap[i] > 0 ? Math.min(1, b / P.cap[i]) : 0.5;
				const size = (0.45 + 0.55 * Math.sqrt(Math.min(b, 3.2) / 3.2)) * (0.65 + 0.35 * full) * fruitScale(i, icons[id], b);
				let a = water ? 0.75 : 1;
				if (hl !== null && id !== hl) a *= 0.3;
				n = this._put(n, x + 0.5 + jx, y + 0.9 - size * 0.5 + jy, size, icons[id], flip, a, 0, this._tinted(id, P.health[i], col, blight && blight[i]));
			}
		}
		return n;
	}

	_pushBugs(n, x0, y0, x1, y1) {
		const B = this.eco.bugs;
		if (!B || !B.density || !B.species) return n;
		const W = this.world.width;
		const N = W * this.world.height;
		const niches = Math.min(BUG_JITTER.length, Math.floor(B.density.length / N));
		const dens = B.density;
		const spc = B.species;
		const col = this.spCol;
		const hl = this.highlight;
		const t = this.time;
		const dotIcon = ICON_INDEX.dot;
		const size = Math.max(BUG_DOT, BUG_DOT_PX / this.cam.zoom);
		this._ensureCapacity(n + (x1 - x0) * (y1 - y0) * 2 + 1);
		for (let y = y0; y < y1; y++) {
			for (let x = x0; x < x1; x++) {
				const i = y * W + x;
				for (let k = 0; k < niches; k++) {
					const q = k * N + i;
					const d = dens[q];
					if (!(d > 0)) continue;
					const id = spc[q];
					if (!id) continue;
					const cnt = Math.ceil(Math.min(1, d) * BUG_PER_DENSITY);
					const a = hl !== null && id !== hl ? 0.3 : 0.95;
					const s = id === hl ? size * BUG_HL_SCALE : size;
					const amp = BUG_JITTER[k];
					for (let j = 0; j < cnt; j++) {
						const h = Math.imul(q * 8 + j + 1, 2654435761) >>> 0;
						const h2 = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
						const ph = ((h >>> 16) & 255) * 0.0246;
						const sp = BUG_SPEED[k] * (0.7 + (h2 & 255) / 425);
						const bx = x + 0.12 + ((h & 255) / 255) * 0.76 + Math.sin(t * sp + ph) * amp;
						const by = y + 0.12 + (((h >>> 8) & 255) / 255) * 0.76 + Math.cos(t * sp * 1.3 + ph) * amp;
						n = this._put(n, bx, by, s, dotIcon, 1, a, id * 9, col);
					}
				}
			}
		}
		return n;
	}

	_pushAnimals(n, alpha, x0, y0, x1, y1) {
		const A = this.eco.animals;
		const icons = this.spIcon;
		const col = this.spCol;
		const zoom = this.cam.zoom;
		const hl = this._hostHighlight();
		const hsp = this.highlight !== null ? this.eco.registry.get(this.highlight) : null;
		const hs = hsp && hsp.group === 'pathogen' && hsp.hostKind !== 'plant' ? hsp.id : 0;
		const strain = A.strain;
		const dmode = this.mode === 'disease';
		const dots = zoom < 3;
		const dotIcon = ICON_INDEX.dot;
		const ringIcon = ICON_INDEX.ring;
		const virusIcon = ICON_INDEX.virus;
		const white = this._white || (this._white = new Uint8Array(9).fill(255));
		this._ensureCapacity(n + A.count * 3 + 1);
		if (hl !== null || hs) {
			for (let i = 0; i < A.count; i++) {
				if (A.sp[i] !== hl && (!hs || strain[i] !== hs)) continue;
				const x = A.px[i] + (A.x[i] - A.px[i]) * alpha;
				const y = A.py[i] + (A.y[i] - A.py[i]) * alpha;
				if (x < x0 || y < y0 || x > x1 || y > y1) continue;
				const s = dots ? 7 / zoom : Math.max(16 / zoom, 1.2 + 0.5 * A.mass[i]);
				n = this._put(n, x, y, s, ringIcon, 1, 0.9, 0, white);
			}
		}
		for (let i = 0; i < A.count; i++) {
			const x = A.px[i] + (A.x[i] - A.px[i]) * alpha;
			const y = A.py[i] + (A.y[i] - A.py[i]) * alpha;
			if (x < x0 || y < y0 || x > x1 || y > y1) continue;
			const id = A.sp[i];
			const sick = strain[i];
			const a = (hl !== null && id !== hl) || (hs && sick !== hs) || (dmode && !sick) ? 0.35 : 1;
			const ca = sick ? this._infected(id, col) : col;
			const co = sick ? 0 : id * 9;
			if (dots) {
				n = this._put(n, x, y, (3 + A.mass[i] * 0.9) / zoom, dotIcon, 1, a, co, ca);
			} else {
				const size = Math.max(12 / zoom, 0.8 + 0.45 * A.mass[i]);
				n = this._put(n, x, y - size * 0.1, size, icons[id], A.face[i], a, co, ca);
				if (sick) n = this._put(n, x + size * 0.38, y - size * 0.5, size * MARK_SCALE, virusIcon, 1, a, 0, white);
			}
		}
		return n;
	}
}
