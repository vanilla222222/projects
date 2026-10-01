const TERRAIN_VS = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const TERRAIN_FS = `#version 300 es
precision highp float;
uniform sampler2D u_terrain;
uniform sampler2D u_veg;
uniform sampler2D u_info;
uniform sampler2D u_bugs;
uniform vec2 u_origin;
uniform float u_scale;
uniform vec2 u_res;
uniform vec2 u_map;
uniform float u_vegAmount;
uniform float u_winter;
uniform float u_time;
uniform float u_grid;
uniform float u_overlay;
uniform float u_warp;
uniform float u_cloud;
out vec4 outColor;

float hash(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	float a = hash(i);
	float b = hash(i + vec2(1.0, 0.0));
	float c = hash(i + vec2(0.0, 1.0));
	float d = hash(i + vec2(1.0, 1.0));
	return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
	vec2 px = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y);
	vec2 w = u_origin + px * u_scale;
	vec3 bg = vec3(0.043, 0.059, 0.055);
	if (w.x < 0.0 || w.y < 0.0 || w.x > u_map.x || w.y > u_map.y) {
		outColor = vec4(bg, 1.0);
		return;
	}
	vec2 uv = w / u_map;
	vec2 tw = w;
	if (u_warp > 0.0) tw += (vec2(vnoise(w * 1.3), vnoise(w * 1.3 + 17.7)) - 0.5) * 0.7 * u_warp;
	vec2 tuv = tw / u_map;
	vec4 t = texture(u_terrain, tuv);
	vec4 v = texture(u_veg, uv);
	vec4 info = texture(u_info, tuv);
	vec3 col = t.rgb;
	float land = 1.0 - u_overlay;
	float water = info.g;
	float dep = info.b;
	col *= 1.0 - water * smoothstep(0.08, 0.9, dep) * 0.3 * land;
	col = mix(col, v.rgb, v.a * u_vegAmount);
	float snow = smoothstep(0.42, 0.18, info.r + 0.22 * (1.0 - u_winter)) * (1.0 - water) * u_winter * land;
	col = mix(col, vec3(0.93, 0.95, 0.97), snow * 0.8);
	float shore = water * (1.0 - smoothstep(0.0, 0.07, dep)) * land;
	col = mix(col, vec3(0.62, 0.8, 0.78), shore * 0.28);
	float sh = sin(w.x * 0.9 + u_time * 1.3) * sin(w.y * 1.1 - u_time * 1.1);
	sh += 0.5 * sin(w.x * 2.3 + w.y * 0.7 - u_time * 2.1) * sin(w.y * 2.6 - w.x * 0.5 + u_time * 1.7);
	col += water * sh * 0.022 * land;
	col *= t.a * 2.0;
	if (u_cloud > 0.0) {
		vec2 drift = vec2(u_time * 0.35, -u_time * 0.27);
		vec2 bw = (w + (vec2(vnoise(w * 0.3 + drift * 0.5), vnoise(w * 0.3 - drift * 0.5 + 9.1)) - 0.5) * 2.0) / u_map;
		vec2 o = 1.1 / u_map;
		vec4 bc = (texture(u_bugs, bw + vec2(o.x, o.y)) + texture(u_bugs, bw + vec2(-o.x, o.y)) + texture(u_bugs, bw + vec2(o.x, -o.y)) + texture(u_bugs, bw - o)) * 0.25;
		float nz = vnoise(w * 0.38 + drift) * 0.7 + vnoise(w * 0.95 - drift * 1.5) * 0.3;
		float a = bc.a * smoothstep(0.25, 0.7, nz + bc.a * 0.3) * u_cloud;
		col = mix(col, bc.rgb / max(bc.a, 0.004), a * 0.55);
	}
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

const WX_VS = `#version 300 es
in vec2 a_corner;
uniform vec4 u_storm;
uniform vec2 u_origin;
uniform float u_scale;
uniform vec2 u_res;
out vec2 v_q;
void main() {
	vec2 q = a_corner * 2.6 * u_storm.z;
	v_q = q;
	vec2 p = (u_storm.xy + q - u_origin) / u_scale;
	gl_Position = vec4(p.x / u_res.x * 2.0 - 1.0, 1.0 - p.y / u_res.y * 2.0, 0.0, 1.0);
}`;

const WX_FS = `#version 300 es
precision highp float;
uniform vec4 u_storm;
uniform vec2 u_seed;
uniform float u_snow;
uniform float u_time;
uniform float u_px;
uniform float u_cloud;
uniform float u_dens;
uniform vec2 u_map;
in vec2 v_q;
out vec4 outColor;

float hash(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	float a = hash(i);
	float b = hash(i + vec2(1.0, 0.0));
	float c = hash(i + vec2(0.0, 1.0));
	float d = hash(i + vec2(1.0, 1.0));
	return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
	vec2 w = u_storm.xy + v_q;
	if (w.x < 0.0 || w.y < 0.0 || w.x > u_map.x || w.y > u_map.y) discard;
	float r = u_storm.z;
	float d = length(v_q);
	vec2 np = v_q / r * 2.2 + u_seed;
	float n1 = vnoise(np + vec2(u_time * 0.06, 0.0));
	float n2 = vnoise(np * 2.7 + vec2(5.3, u_time * 0.09));
	float rr = r * (0.78 + 0.34 * n1 + 0.12 * n2);
	float body = 1.0 - smoothstep(rr * 0.5, rr * 1.05, d);
	if (body <= 0.0) discard;
	float heavy = clamp(u_storm.w / 0.35, 0.0, 1.0);
	float n3 = vnoise(v_q * 0.4 + u_seed * 3.0 + vec2(u_time * 0.12, 0.0));
	float puff = smoothstep(0.15, 0.85, n3);
	float core = 1.0 - smoothstep(rr * 0.15, rr * 0.8, d);
	vec3 cc = mix(vec3(0.86, 0.88, 0.92), vec3(0.3, 0.34, 0.42), (0.35 + 0.65 * heavy) * (0.45 + 0.55 * core) * (1.0 - 0.45 * puff));
	float ca = body * (0.7 + 0.2 * heavy) * (0.65 + 0.35 * puff) * u_cloud;
	float dens = u_dens * (0.3 + 0.7 * heavy);
	vec2 sp = v_q / u_px;
	float pa;
	vec3 pc;
	if (u_snow < 0.5) {
		vec2 g = vec2((sp.x + sp.y * 0.25) / 6.0, (sp.y - u_time * 260.0) / 22.0);
		float cx = floor(g.x);
		float fx = fract(g.x);
		float gy = g.y + hash(vec2(cx, u_seed.x)) * 7.0;
		float cy = floor(gy);
		float fy = fract(gy);
		float on = step(hash(vec2(cx, mod(cy, 251.0)) + u_seed.y), dens);
		pa = on * (1.0 - smoothstep(0.08, 0.2, abs(fx - 0.5))) * smoothstep(0.0, 0.1, fy) * (1.0 - smoothstep(0.3, 0.45, fy)) * 0.65;
		pc = vec3(0.72, 0.82, 0.96);
	} else {
		vec2 g = vec2(sp.x + sin(sp.y * 0.05 + u_time * 1.5) * 4.0, sp.y - u_time * 40.0) / 11.0;
		vec2 c = floor(g);
		c.y = mod(c.y, 251.0);
		vec2 f = fract(g);
		vec2 o = vec2(hash(c + u_seed), hash(c + u_seed + 3.7)) * 0.6 + 0.2;
		float on = step(hash(c + u_seed.yx + 1.3), dens);
		pa = on * (1.0 - smoothstep(0.08, 0.16, length(f - o))) * 0.85;
		pc = vec3(0.97, 0.98, 1.0);
	}
	pa *= 1.0 - smoothstep(rr * 0.3, rr * 0.9, d);
	outColor = vec4(pc * pa + cc * ca * (1.0 - pa), pa + ca * (1.0 - pa));
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
	rain: [[0, '#b58a4a'], [0.2, '#d8c68a'], [0.45, '#8cc4b0'], [0.7, '#3f8fc8'], [1, '#1b3f8f']],
	water: [[0, '#2aa39a'], [0.2, '#6fbf94'], [0.45, '#d9cb8a'], [0.7, '#d99a55'], [1, '#b8413a']],
};

const LIVE_MODES = { nutrients: 1, litter: 1, bugs: 1, disease: 1, humidity: 1, territory: 1, rain: 1, water: 1 };
const BUG_DOT = 0.1;
const BUG_DOT_PX = 4.5;
const BUG_HL_SCALE = 1.6;
const BUG_PER_DENSITY = 2;
const BUG_CLOUD_MS = 300;
const BUG_CLOUD_FULL = 1.2;
const CLOUD_FADE = [9, 14];
const SHADOW_ZOOM = 6;
const SHADOW_ALPHA = 0.45;
const FLY_SHADOW_ALPHA = 0.22;
const FLY_SHADOW = [0.45, 0.95, 0.6];
const FLY_LIFT = 0.3;
const TRAIL_K = 0.6;
const WARP_ZOOM = [4, 6];
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
const SHOW_BASE = 0.3;
const SHOW_SAT = 1.6;
const SHOW_LIFT = 40;
const CREST_ZOOM = 6;
const CREST_MIN = 0.45;
const CREST_SCALE = 0.45;
const PACK_LINK_ZOOM = 4;
const PACK_LINK_DOTS = 3;
const PACK_LINK_ALPHA = 0.55;
const PACK_LINK_RGB = [235, 225, 200];
const OLD_RGB = [160, 160, 160];
const OLD_MIX = 0.25;
const MARK_SCALE = 0.4;
const TERR_MIX = 0.8;
const TERR_SAT = 1.4;
const TERR_FADE = 10;
const TERR_EDGE_MIX = 1;
const TERR_EDGE_DARK = 0.7;
const ELDER_ALPHA = 0.8;
const EGG_ZOOM = 3;
const EGG_PX = 4;
const EGG_BASE = 0.34;
const EGG_SIZE_K = 0.24;
const EGG_WATER_ALPHA = 0.85;
const EGG_PALE = 0.15;
const FRESH_RGB = [70, 165, 250];
const DIM_WATER_RGB = [30, 46, 68];
const RAIN_VIEW_K = 2;
const THIRST_TINT = new Uint8Array(9).map((_, q) => [245, 140, 110][q % 3]);
const DRY_TINT = new Uint8Array(9).map((_, q) => [225, 30, 35][q % 3]);
const DRY_MARK = 1.35;
const WX_ZOOM = [6, 18];
const WX_TIME_WRAP = 600;

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
		this.showSwarms = true;
		this.showWeather = true;
		this.highlight = null;
		this.time = 0;

		this.terrainProg = compileProgram(gl, TERRAIN_VS, TERRAIN_FS);
		this.spriteProg = compileProgram(gl, SPRITE_VS, SPRITE_FS);
		this.wxProg = compileProgram(gl, WX_VS, WX_FS);

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
		this.wxVao = gl.createVertexArray();
		gl.bindVertexArray(this.wxVao);
		gl.bindBuffer(gl.ARRAY_BUFFER, quad);
		const wc = gl.getAttribLocation(this.wxProg.p, 'a_corner');
		gl.enableVertexAttribArray(wc);
		gl.vertexAttribPointer(wc, 2, gl.FLOAT, false, 0, 0);
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
		this.lastBugUpdate = 0;
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
		for (const t of [this.terrainTex, this.vegTex, this.infoTex, this.bugTex]) if (t) gl.deleteTexture(t);
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
		this.bugData = new Uint8Array(W * H * 4);
		this.bugTex = this._tex(W, H, this.bugData, true);
		this.lastBugUpdate = 0;
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
				const d = (a - l + (a - u)) * 20;
				shade[i] = Math.max(0.62, Math.min(1.28, 1 + d));
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
		const Wx = mode === 'humidity' || mode === 'rain' || mode === 'water' ? this.eco.weather : null;
		const snow = Wx && mode !== 'water' ? Wx.snow : null;
		const fresh = mode === 'water' && Wx ? Wx.fresh : null;
		const dimW = mode === 'rain' || mode === 'water';
		const A = mode === 'territory' ? this.eco.animals : null;
		let terrOwner = null;
		if (A) {
			this._refreshSpeciesLookup();
			this.lastSoilUpdate = performance.now();
			const until = A.terrUntil;
			const tsp = A.terrSp;
			const tuid = A.terrUid;
			const lim = this.spLookupSize;
			const tick = A.tick;
			terrOwner = (j) => (until[j] > tick && tsp[j] > 0 && tsp[j] < lim ? tuid[j] || -1 : 0);
		}
		if (mode === 'humidity') {
			if (Wx) {
				field = this.soilField;
				const hum = w.humidity;
				const wet = Wx.wet;
				for (let i = 0; i < n; i++) field[i] = Math.min(1, Math.max(0, hum[i] + 0.5 * wet[i]));
			}
			this.lastSoilUpdate = performance.now();
		} else if (mode === 'rain') {
			field = this.soilField;
			if (Wx) {
				field.set(Wx.wet);
				this._stormRain(field, Wx);
			} else field.fill(0);
			this.lastSoilUpdate = performance.now();
		} else if (mode === 'water') {
			field = this.soilField;
			if (Wx) {
				const wd = Wx.waterDist;
				for (let i = 0; i < n; i++) field[i] = wd[i] / WATER_DIST_MAX;
			} else field.fill(0);
			this.lastSoilUpdate = performance.now();
		} else if (mode === 'nutrients') {
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
				const vl = D.vectorLoad;
				for (let p = 0; p < n; p++) if (vl[p] > 0) src[p] += vl[p] * TRAIL_K;
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
				const wc = fresh && fresh[i] ? FRESH_RGB : dimW && water[i] ? DIM_WATER_RGB : null;
				if (wc) {
					r = wc[0];
					g = wc[1];
					b = wc[2];
				} else if (snow && snow[i] > 0) {
					const t = Math.min(1, snow[i]) * 0.75;
					r += (240 - r) * t;
					g += (244 - g) * t;
					b += (248 - b) * t;
				}
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
				if (A) {
					const own = terrOwner(i);
					if (own) {
						const sp = A.terrSp[i];
						const fade = Math.min(1, (A.terrUntil[i] - A.tick) / TERR_FADE);
						const x = i % w.width;
						const edge = x === 0 || x === w.width - 1 || i < w.width || i >= n - w.width || terrOwner(i - 1) !== own || terrOwner(i + 1) !== own || terrOwner(i - w.width) !== own || terrOwner(i + w.width) !== own;
						const c = this.spCol;
						const o = sp * 9 + (edge ? 3 : 0);
						const k = (edge ? TERR_EDGE_MIX : TERR_MIX) * fade;
						const dk = edge ? TERR_EDGE_DARK : 1;
						let cr = c[o] * dk;
						let cg = c[o + 1] * dk;
						let cb = c[o + 2] * dk;
						if (!edge) {
							const m = (cr + cg + cb) / 3;
							cr = Math.max(0, Math.min(255, m + (cr - m) * TERR_SAT));
							cg = Math.max(0, Math.min(255, m + (cg - m) * TERR_SAT));
							cb = Math.max(0, Math.min(255, m + (cb - m) * TERR_SAT));
						}
						r += (cr - r) * k;
						g += (cg - g) * k;
						b += (cb - b) * k;
					}
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

	_stormRain(field, Wx) {
		const W = this.world.width;
		const H = this.world.height;
		for (const s of Wx.storms) {
			if (!s.on) continue;
			const r = s.r;
			const a = s.rain * (s.life < 40 ? s.life / 40 : 1) * RAIN_VIEW_K;
			const x0 = Math.max(0, Math.floor(s.x - r));
			const x1 = Math.min(W - 1, Math.ceil(s.x + r));
			const y0 = Math.max(0, Math.floor(s.y - r));
			const y1 = Math.min(H - 1, Math.ceil(s.y + r));
			for (let y = y0; y <= y1; y++) {
				const dy = y + 0.5 - s.y;
				for (let x = x0; x <= x1; x++) {
					const dx = x + 0.5 - s.x;
					const d = Math.sqrt(dx * dx + dy * dy);
					if (d >= r) continue;
					const i = y * W + x;
					field[i] = Math.min(1, field[i] + a * (1 - d / r));
				}
			}
		}
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
			this._writeCol(id, sp);
		}
	}

	_writeCol(id, sp) {
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

	_updateBugCloud() {
		const B = this.eco.bugs;
		const out = this.bugData;
		const N = this.world.width * this.world.height;
		if (!B || !B.density || !B.species) {
			out.fill(0);
		} else {
			const niches = Math.min(BUG_JITTER.length, Math.floor(B.density.length / N));
			const dens = B.density;
			const spc = B.species;
			const col = this.spCol;
			const hsp = this.highlight !== null ? this.eco.registry.get(this.highlight) : null;
			const hb = hsp && hsp.group === 'bug' ? hsp.id : 0;
			for (let i = 0; i < N; i++) {
				let tot = 0;
				let best = 0;
				let bd = 0;
				let lit = false;
				for (let k = 0; k < niches; k++) {
					const q = k * N + i;
					const d = dens[q];
					if (!(d > 0) || !spc[q]) continue;
					tot += d;
					if (spc[q] === hb) lit = true;
					if (d > bd) {
						bd = d;
						best = spc[q];
					}
				}
				const o = i * 4;
				let a = Math.min(1, tot / BUG_CLOUD_FULL);
				if (hb && !lit) a *= 0.3;
				if (!best || !(a > 0)) {
					out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 0;
					continue;
				}
				const c = (lit ? hb : best) * 9;
				out[o] = col[c] * a;
				out[o + 1] = col[c + 1] * a;
				out[o + 2] = col[c + 2] * a;
				out[o + 3] = a * 255;
			}
		}
		const gl = this.gl;
		gl.bindTexture(gl.TEXTURE_2D, this.bugTex);
		gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.world.width, this.world.height, gl.RGBA, gl.UNSIGNED_BYTE, out);
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
		const ramp = RAMPS[this.mode] ? 1 : 0;
		const flat = ramp || this.mode === 'territory' ? 1 : 0;
		const smooth = (a, b, v) => {
			const k = Math.max(0, Math.min(1, (v - a) / (b - a)));
			return k * k * (3 - 2 * k);
		};
		const cloud = this.showSwarms && !flat ? 1 - smooth(CLOUD_FADE[0], CLOUD_FADE[1], c.zoom) : 0;
		if (cloud > 0 && now - this.lastBugUpdate > BUG_CLOUD_MS) {
			this._updateBugCloud();
			this.lastBugUpdate = now;
		}

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
		gl.activeTexture(gl.TEXTURE3);
		gl.bindTexture(gl.TEXTURE_2D, this.bugTex);
		gl.uniform1i(tp.u.u_terrain, 0);
		gl.uniform1i(tp.u.u_veg, 1);
		gl.uniform1i(tp.u.u_info, 2);
		gl.uniform1i(tp.u.u_bugs, 3);
		gl.uniform2f(tp.u.u_origin, ox, oy);
		gl.uniform1f(tp.u.u_scale, scale);
		gl.uniform2f(tp.u.u_res, this.canvas.width, this.canvas.height);
		gl.uniform2f(tp.u.u_map, W, H);
		gl.uniform1f(tp.u.u_vegAmount, !vegOn || !this.showPlants ? 0 : this.mode === 'vegetation' ? 1 : 0.5);
		const season = eco.options.seasons ? eco.plants.season || 0 : 0;
		gl.uniform1f(tp.u.u_winter, Math.max(0, -season));
		gl.uniform1f(tp.u.u_time, this.time);
		gl.uniform1f(tp.u.u_grid, c.zoom > 20 ? Math.min(1, (c.zoom - 20) / 20) * 0.5 : 0);
		gl.uniform1f(tp.u.u_overlay, flat);
		gl.uniform1f(tp.u.u_warp, flat ? 0 : smooth(WARP_ZOOM[0], WARP_ZOOM[1], c.zoom));
		gl.uniform1f(tp.u.u_cloud, cloud);
		gl.bindVertexArray(this.fsVao);
		gl.drawArrays(gl.TRIANGLES, 0, 3);

		const x0 = Math.max(0, Math.floor(ox) - 2);
		const y0 = Math.max(0, Math.floor(oy) - 2);
		const x1 = Math.min(W, Math.ceil(ox + this.cssW / c.zoom) + 2);
		const y1 = Math.min(H, Math.ceil(oy + this.cssH / c.zoom) + 2);
		let n = 0;
		if (this.showPlants && vegOn && c.zoom >= 9) n = this._pushPlants(n, x0, y0, x1, y1);
		if (this.showSwarms && c.zoom > CLOUD_FADE[0]) n = this._pushBugs(n, x0, y0, x1, y1, smooth(CLOUD_FADE[0], CLOUD_FADE[1], c.zoom));
		if (this.showAnimals) n = this._pushAnimals(n, alpha, x0, y0, x1, y1);
		this.spriteCount = n;
		if (n) {
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
		if (this.showWeather && !flat) this._drawWeather(alpha, ox, oy, scale, smooth(WX_ZOOM[0], WX_ZOOM[1], c.zoom));
	}

	_drawWeather(alpha, ox, oy, scale, hz) {
		const Wx = this.eco.weather;
		if (!Wx || !Wx.on || !Wx.stormCount) return;
		const gl = this.gl;
		const W = this.world.width;
		const H = this.world.height;
		const p = this.wxProg;
		const u = p.u;
		const k = (this.eco.tick % WEATHER_EVERY) + alpha;
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		gl.useProgram(p.p);
		gl.uniform2f(u.u_origin, ox, oy);
		gl.uniform1f(u.u_scale, scale);
		gl.uniform2f(u.u_res, this.canvas.width, this.canvas.height);
		gl.uniform1f(u.u_time, this.time % WX_TIME_WRAP);
		gl.uniform1f(u.u_px, 1 / this.cam.zoom);
		gl.uniform1f(u.u_cloud, 1 - 0.75 * hz);
		gl.uniform1f(u.u_dens, 1 - 0.5 * hz);
		gl.uniform2f(u.u_map, W, H);
		gl.bindVertexArray(this.wxVao);
		for (const s of Wx.storms) {
			if (!s.on) continue;
			const i = Math.min(H - 1, Math.max(0, s.y | 0)) * W + Math.min(W - 1, Math.max(0, s.x | 0));
			gl.uniform4f(u.u_storm, s.x + s.vx * k, s.y + s.vy * k, s.r, s.rain * (s.life < 40 ? s.life / 40 : 1));
			gl.uniform2f(u.u_seed, s.p1, s.p2);
			gl.uniform1f(u.u_snow, Wx.effTemp(i) < SNOW_T ? 1 : 0);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		}
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

	_tinted(id, h, col, blt, old) {
		const t = this._tint;
		const k = (1 - h) * SICK_MIX;
		const kb = blt ? BLIGHT_MIX : 0;
		const ko = old ? OLD_MIX : 0;
		const o = id * 9;
		for (let q = 0; q < 9; q++) {
			let v = col[o + q];
			v += (SICK_RGB[q % 3] - v) * k;
			v += (BLIGHT_RGB[q % 3] - v) * kb;
			t[q] = v + (OLD_RGB[q % 3] - v) * ko;
		}
		return t;
	}

	_eggTint(id, col) {
		const t = this._tint;
		const o = id * 9;
		for (let q = 0; q < 3; q++) {
			t[q] = col[o + 6 + q] + (255 - col[o + 6 + q]) * EGG_PALE;
			t[q + 3] = col[o + q];
			t[q + 6] = 255;
		}
		return t;
	}

	_showy(co, ca, s) {
		const t = this._showTint || (this._showTint = new Uint8Array(9));
		const k = 1 + SHOW_SAT * (s - SHOW_BASE);
		const lift = SHOW_LIFT * (s - SHOW_BASE);
		for (let q = 0; q < 9; q += 3) {
			const r = ca[co + q];
			const g = ca[co + q + 1];
			const b = ca[co + q + 2];
			const m = (r + g + b) / 3;
			t[q] = Math.max(0, Math.min(255, m + (r - m) * k + lift));
			t[q + 1] = Math.max(0, Math.min(255, m + (g - m) * k + lift));
			t[q + 2] = Math.max(0, Math.min(255, m + (b - m) * k + lift));
		}
		return t;
	}

	_pushPackLinks(n, alpha, x0, y0, x1, y1) {
		const A = this.eco.animals;
		const pk = A.pk;
		const pn = A.pn;
		if (!pk || !pn) return n;
		const map = this._packMap || (this._packMap = new Map());
		map.clear();
		for (let i = 0; i < A.count; i++) if (pn[i] > 1 && pk[i] === A.uid[i]) map.set(pk[i], i);
		if (!map.size) return n;
		const rgb = this._packRgb || (this._packRgb = Uint8Array.from([...PACK_LINK_RGB, ...PACK_LINK_RGB, ...PACK_LINK_RGB]));
		const dotIcon = ICON_INDEX.dot;
		const s = Math.max(3 / this.cam.zoom, 0.18);
		for (let i = 0; i < A.count; i++) {
			if (pn[i] < 2 || pk[i] === A.uid[i]) continue;
			const j = map.get(pk[i]);
			if (j === undefined) continue;
			const xa = A.px[i] + (A.x[i] - A.px[i]) * alpha;
			const ya = A.py[i] + (A.y[i] - A.py[i]) * alpha;
			const xb = A.px[j] + (A.x[j] - A.px[j]) * alpha;
			const yb = A.py[j] + (A.y[j] - A.py[j]) * alpha;
			if (Math.max(xa, xb) < x0 || Math.min(xa, xb) > x1 || Math.max(ya, yb) < y0 || Math.min(ya, yb) > y1) continue;
			for (let q = 1; q <= PACK_LINK_DOTS; q++) {
				const f = q / (PACK_LINK_DOTS + 1);
				n = this._put(n, xa + (xb - xa) * f, ya + (yb - ya) * f, s, dotIcon, 1, PACK_LINK_ALPHA, 0, rgb);
			}
		}
		return n;
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
		const age = P.age;
		const life = P.life;
		const stageScale = (p) => {
			if (!age) return 1;
			const m = P.matureAt(p);
			return age[p] < m ? 0.5 + (0.5 * age[p]) / m : 1;
		};
		const isOld = (p) => age && age[p] > OLD_FRAC * life[p];
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
					const size = ls * (0.45 + 0.55 * Math.sqrt(Math.min(lb, 3.2) / 3.2)) * (0.65 + 0.35 * full) * fruitScale(u, icons[low], lb) * stageScale(u);
					let a = water ? 0.75 : 1;
					if (hl !== null && low !== hl) a *= 0.3;
					n = this._put(n, x + 0.28 + jx * 0.5, y + 0.97 - size * 0.5, size, icons[low], -flip, a, 0, this._tinted(low, P.health[u], col, blight && blight[u], isOld(u)));
				}
				const id = P.species[i];
				if (!id) continue;
				const b = P.biomass[i];
				if (b < 0.08) continue;
				const full = P.cap[i] > 0 ? Math.min(1, b / P.cap[i]) : 0.5;
				const size = (0.45 + 0.55 * Math.sqrt(Math.min(b, 3.2) / 3.2)) * (0.65 + 0.35 * full) * fruitScale(i, icons[id], b) * stageScale(i);
				let a = water ? 0.75 : 1;
				if (hl !== null && id !== hl) a *= 0.3;
				n = this._put(n, x + 0.5 + jx, y + 0.9 - size * 0.5 + jy, size, icons[id], flip, a, 0, this._tinted(id, P.health[i], col, blight && blight[i], isOld(i)));
			}
		}
		return n;
	}

	_pushBugs(n, x0, y0, x1, y1, fade) {
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
					const a = (hl !== null && id !== hl ? 0.3 : 0.95) * fade;
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
		const wmode = this.mode === 'water';
		const wat = A.water;
		const dom = A.domain;
		const fly = A.fly;
		const dots = zoom < 3;
		const dotIcon = ICON_INDEX.dot;
		const ringIcon = ICON_INDEX.ring;
		const virusIcon = ICON_INDEX.virus;
		const white = this._white || (this._white = new Uint8Array(9).fill(255));
		const gf = A.gf;
		const ef = A.ef;
		const E = this.eco.eggs;
		this._ensureCapacity(n + A.count * 4 + (E ? E.count : 0) + 1);
		if (zoom >= SHADOW_ZOOM) {
			const shadowIcon = ICON_INDEX.shadow;
			for (let i = 0; i < A.count; i++) {
				const x = A.px[i] + (A.x[i] - A.px[i]) * alpha;
				const y = A.py[i] + (A.y[i] - A.py[i]) * alpha;
				if (x < x0 || y < y0 || x > x1 || y > y1) continue;
				const size = Math.max(12 / zoom, 0.8 + 0.45 * A.mass[i]) * (gf ? gf[i] : 1);
				if (dom[i] === 3 && fly[i]) n = this._put(n, x + size * FLY_SHADOW[0], y + size * FLY_SHADOW[1], size * FLY_SHADOW[2], shadowIcon, 1, FLY_SHADOW_ALPHA, 0, white);
				else n = this._put(n, x, y + size * 0.32, size * 0.9, shadowIcon, 1, SHADOW_ALPHA, 0, white);
			}
		}
		if (E && zoom >= EGG_ZOOM) n = this._pushEggs(n, E, x0, y0, x1, y1, hl);
		if (hl !== null || hs) {
			for (let i = 0; i < A.count; i++) {
				if (A.sp[i] !== hl && (!hs || strain[i] !== hs)) continue;
				const x = A.px[i] + (A.x[i] - A.px[i]) * alpha;
				const y = A.py[i] + (A.y[i] - A.py[i]) * alpha;
				if (x < x0 || y < y0 || x > x1 || y > y1) continue;
				const s = (dots ? 7 / zoom : Math.max(16 / zoom, 1.2 + 0.5 * A.mass[i])) * (gf ? gf[i] : 1);
				n = this._put(n, x, y, s, ringIcon, 1, 0.9, 0, white);
			}
		}
		if (zoom >= PACK_LINK_ZOOM) n = this._pushPackLinks(n, alpha, x0, y0, x1, y1);
		const show = A.show;
		const crestIcon = ICON_INDEX.crest;
		for (let k = 0, cnt = A.count; k < cnt * 2; k++) {
			const i = k < cnt ? k : k - cnt;
			const air = dom[i] === 3;
			if (air !== k >= cnt) continue;
			const x = A.px[i] + (A.x[i] - A.px[i]) * alpha;
			const y = A.py[i] + (A.y[i] - A.py[i]) * alpha;
			if (x < x0 || y < y0 || x > x1 || y > y1) continue;
			const id = A.sp[i];
			const sick = strain[i];
			const g = gf ? gf[i] : 1;
			const th = wmode && dom[i] !== 1 && wat[i] < THIRSTY ? (wat[i] <= 0 ? DRY_TINT : THIRST_TINT) : null;
			const a = ((hl !== null && id !== hl) || (hs && sick !== hs) || (dmode && !sick) || (wmode && !th) ? 0.35 : 1) * (ef && ef[i] < 1 ? ELDER_ALPHA : 1);
			const sv = show && !sick ? show[i] : 0;
			const bright = sv > SHOW_BASE;
			const ca = sick ? this._infected(id, col) : bright ? this._showy(id * 9, col, sv) : col;
			const co = sick || bright ? 0 : id * 9;
			if (dots) {
				const ds = ((3 + A.mass[i] * 0.9) / zoom) * g;
				n = th ? this._put(n, x, y, ds * (th === DRY_TINT ? DRY_MARK : 1), dotIcon, 1, a, 0, th) : this._put(n, x, y, ds, dotIcon, 1, a, co, ca);
			} else {
				const size = Math.max(12 / zoom, 0.8 + 0.45 * A.mass[i]) * g;
				const ly = air && fly[i] ? y - size * FLY_LIFT : y;
				if (sv >= CREST_MIN && zoom >= CREST_ZOOM) n = this._put(n, x - size * 0.12 * A.face[i], ly - size * 0.62, size * CREST_SCALE * (0.6 + sv), crestIcon, A.face[i], a, co, ca);
				n = this._put(n, x, ly - size * 0.1, size, icons[id], A.face[i], a, co, ca);
				if (sick) n = this._put(n, x + size * 0.38, ly - size * 0.5, size * MARK_SCALE, virusIcon, 1, a, 0, white);
				if (th) n = this._put(n, x - size * 0.38, ly - size * 0.5, size * MARK_SCALE * (th === DRY_TINT ? DRY_MARK : 1), dotIcon, 1, 1, 0, th);
			}
		}
		return n;
	}

	_pushEggs(n, E, x0, y0, x1, y1, hl) {
		const reg = this.eco.registry;
		const col = this.spCol;
		const lim = this.spLookupSize;
		const icon = ICON_INDEX.egg;
		const zoom = this.cam.zoom;
		const floor = EGG_PX / zoom;
		const gen = E.genome;
		for (let e = 0; e < E.count; e++) {
			if (!E.alive[e]) continue;
			const x = E.x[e];
			const y = E.y[e];
			if (x < x0 || y < y0 || x > x1 || y > y1) continue;
			const id = E.sp[e];
			if (id <= 0 || id >= lim) continue;
			if (!reg.living.has(id)) {
				const sp = reg.get(id);
				if (!sp) continue;
				this._writeCol(id, sp);
			}
			const size = Math.max(floor, EGG_BASE + EGG_SIZE_K * gen[e * AG + G_SIZE]);
			let a = E.dom[e] === 1 ? EGG_WATER_ALPHA : 1;
			if (hl !== null && id !== hl) a *= 0.35;
			n = this._put(n, x, y - size * 0.1, size, icon, 1, a, 0, this._eggTint(id, col));
		}
		return n;
	}
}
