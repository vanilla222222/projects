// WebGL renderer: the biome/altitude/temperature/humidity/fertility grid is
// uploaded as a single texture and drawn as one full-screen quad, while
// plants and animals are drawn as GL points in a single draw call each —
// far fewer GPU calls than the old per-cell/per-organism Canvas2D fillRect
// approach, which matters once populations run into the thousands.

function compileShader(gl, type, source) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const info = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		throw new Error('Shader compile error: ' + info);
	}
	return shader;
}

function createProgram(gl, vertexSrc, fragmentSrc) {
	const program = gl.createProgram();
	gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexSrc));
	gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentSrc));
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		const info = gl.getProgramInfoLog(program);
		gl.deleteProgram(program);
		throw new Error('Program link error: ' + info);
	}
	return program;
}

function hslToRgb01(h, s, l) {
	if (s === 0) return [l, l, l];
	const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	const p = 2 * l - q;
	const hue2rgb = (p, q, t) => {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	};
	return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
}

// Parses either "#rrggbb" or "hsl(h, s%, l%)" (the two formats used
// elsewhere in this project) into 0..1 RGB. Results are cached on whatever
// object supplies the color string, since a species' color never changes.
function parseColor01(str) {
	if (str[0] === '#') {
		const v = parseInt(str.slice(1), 16);
		return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
	}
	const m = str.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/);
	if (!m) return [1, 1, 1];
	return hslToRgb01(parseFloat(m[1]) / 360, parseFloat(m[2]) / 100, parseFloat(m[3]) / 100);
}

const QUAD_VERT_SRC = `
	attribute vec2 aPosition;
	attribute vec2 aTexCoord;
	varying vec2 vTexCoord;
	void main() {
		gl_Position = vec4(aPosition, 0.0, 1.0);
		vTexCoord = aTexCoord;
	}
`;
const QUAD_FRAG_SRC = `
	precision mediump float;
	uniform sampler2D uTexture;
	varying vec2 vTexCoord;
	void main() {
		gl_FragColor = texture2D(uTexture, vTexCoord);
	}
`;
const POINT_VERT_SRC = `
	attribute vec2 aPosition;
	attribute vec3 aColor;
	uniform float uPointSize;
	varying vec3 vColor;
	void main() {
		gl_Position = vec4(aPosition, 0.0, 1.0);
		gl_PointSize = uPointSize;
		vColor = aColor;
	}
`;
const POINT_FRAG_SRC = `
	precision mediump float;
	varying vec3 vColor;
	void main() {
		gl_FragColor = vec4(vColor, 1.0);
	}
`;

class MapRenderer {
	constructor(canvas) {
		this.canvas = canvas;
		const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false });
		if (!gl) throw new Error('WebGL is not available in this browser.');
		this.gl = gl;

		this.quadProgram = createProgram(gl, QUAD_VERT_SRC, QUAD_FRAG_SRC);
		this.pointProgram = createProgram(gl, POINT_VERT_SRC, POINT_FRAG_SRC);

		// Attribute/uniform locations are looked up once here instead of every
		// frame — each lookup is a driver round-trip in some implementations.
		this.quadLocs = {
			aPosition: gl.getAttribLocation(this.quadProgram, 'aPosition'),
			aTexCoord: gl.getAttribLocation(this.quadProgram, 'aTexCoord'),
			uTexture: gl.getUniformLocation(this.quadProgram, 'uTexture'),
		};
		this.pointLocs = {
			aPosition: gl.getAttribLocation(this.pointProgram, 'aPosition'),
			aColor: gl.getAttribLocation(this.pointProgram, 'aColor'),
			uPointSize: gl.getUniformLocation(this.pointProgram, 'uPointSize'),
		};

		// Full-screen quad, positions in clip space with matching texture
		// coords — texCoord.y=0 is the first (top) row of our data, and
		// clip-space +1 is the top of the screen, so they line up directly.
		this.quadBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array([
				-1, 1, 0, 0,
				-1, -1, 0, 1,
				1, 1, 1, 0,
				1, 1, 1, 0,
				-1, -1, 0, 1,
				1, -1, 1, 1,
			]),
			gl.STATIC_DRAW
		);

		this.texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		this.pointBuffer = gl.createBuffer();
		this._textureData = null; // reused Uint8Array, resized only when map size changes
		this._pointScratch = new Float32Array(1024 * 5); // reused/grown, never shrunk

		this._lastWidth = 0;
		this._lastHeight = 0;
	}

	// Doubles the scratch buffer until it can hold `neededFloats`, reusing it
	// across calls/frames instead of allocating a fresh typed array every
	// time renderPlants/renderAnimals runs — the previous per-call
	// `new Float32Array(...)` was needless GC pressure at high population.
	_scratchFor(neededFloats) {
		if (this._pointScratch.length < neededFloats) {
			let len = this._pointScratch.length;
			while (len < neededFloats) len *= 2;
			this._pointScratch = new Float32Array(len);
		}
		return this._pointScratch;
	}

	render(worldMap, mode = 'biome') {
		const { gl } = this;
		const { width, height } = worldMap;

		if (width !== this._lastWidth || height !== this._lastHeight) {
			this.canvas.width = width;
			this.canvas.height = height;
			this._lastWidth = width;
			this._lastHeight = height;
			this._textureData = new Uint8Array(width * height * 4);
		}
		gl.viewport(0, 0, width, height);

		const data = this._textureData;
		const biomeGrid = worldMap.biome;
		for (let i = 0; i < width * height; i++) {
			let r, g, b;
			if (mode === 'biome') {
				// Direct table lookup by numeric id — no hex parsing, no
				// string-keyed object lookup, in the hottest loop in the app.
				const c = biomeGrid[i] * 3;
				r = BIOME_COLOR_TABLE[c];
				g = BIOME_COLOR_TABLE[c + 1];
				b = BIOME_COLOR_TABLE[c + 2];
			} else if (mode === 'altitude') {
				[r, g, b] = this._altitudeRamp(worldMap.altitude[i]);
			} else if (mode === 'temperature') {
				[r, g, b] = this._diverging(worldMap.temperature[i], [40, 100, 220], [220, 60, 40]);
			} else if (mode === 'humidity') {
				[r, g, b] = this._diverging(worldMap.humidity[i], [180, 150, 90], [30, 90, 160]);
			} else if (mode === 'fertility') {
				[r, g, b] = this._diverging(worldMap.fertility[i], [90, 70, 55], [70, 170, 70]);
			}
			const p = i * 4;
			data[p] = r;
			data[p + 1] = g;
			data[p + 2] = b;
			data[p + 3] = 255;
		}

		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);

		gl.clearColor(0, 0, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);

		gl.useProgram(this.quadProgram);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
		gl.enableVertexAttribArray(this.quadLocs.aPosition);
		gl.vertexAttribPointer(this.quadLocs.aPosition, 2, gl.FLOAT, false, 16, 0);
		gl.enableVertexAttribArray(this.quadLocs.aTexCoord);
		gl.vertexAttribPointer(this.quadLocs.aTexCoord, 2, gl.FLOAT, false, 16, 8);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.uniform1i(this.quadLocs.uTexture, 0);

		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	// Draws the first `count` points (5 floats each: clipX, clipY, r, g, b)
	// from the scratch buffer as one gl.POINTS call.
	_drawPointBuffer(count, pointSize) {
		if (count === 0) return;
		const { gl } = this;
		gl.useProgram(this.pointProgram);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuffer);
		// subarray is a view, not a copy — only the floats actually filled
		// this frame get uploaded, even though the scratch buffer may be larger.
		gl.bufferData(gl.ARRAY_BUFFER, this._pointScratch.subarray(0, count * 5), gl.DYNAMIC_DRAW);

		gl.enableVertexAttribArray(this.pointLocs.aPosition);
		gl.vertexAttribPointer(this.pointLocs.aPosition, 2, gl.FLOAT, false, 20, 0);
		gl.enableVertexAttribArray(this.pointLocs.aColor);
		gl.vertexAttribPointer(this.pointLocs.aColor, 3, gl.FLOAT, false, 20, 8);

		gl.uniform1f(this.pointLocs.uPointSize, pointSize);
		gl.drawArrays(gl.POINTS, 0, count);
	}

	renderPlants(plantSystem) {
		const { worldMap, plants, registry } = plantSystem;
		const buf = this._scratchFor(plants.length * 5);
		const { width, height } = worldMap;
		let count = 0;

		for (const plant of plants) {
			if (!plant.alive) continue; // eaten earlier this tick, about to drop out
			const species = registry.get(plant.speciesId);
			if (!species._glRgb) species._glRgb = parseColor01(species.color);
			const o = count * 5;
			buf[o] = ((plant.x + 0.5) / width) * 2 - 1;
			buf[o + 1] = 1 - ((plant.y + 0.5) / height) * 2;
			buf[o + 2] = species._glRgb[0];
			buf[o + 3] = species._glRgb[1];
			buf[o + 4] = species._glRgb[2];
			count++;
		}
		this._drawPointBuffer(count, 1);
	}

	// Animals get a larger marker than plants so they read as distinct
	// creatures rather than more foliage, even when zoomed out; carnivores
	// get a bigger marker still so the two are distinguishable from each other.
	renderAnimals(animalSystem) {
		const { worldMap, animals, registry } = animalSystem;
		const size = animalSystem.kind === 'carnivore' ? 3 : 2;
		const buf = this._scratchFor(animals.length * 5);
		const { width, height } = worldMap;
		let count = 0;

		for (const animal of animals) {
			if (!animal.alive) continue; // eaten earlier this tick, about to drop out
			const species = registry.get(animal.speciesId);
			if (!species._glRgb) species._glRgb = parseColor01(species.color);
			const o = count * 5;
			buf[o] = ((animal.x + 0.5) / width) * 2 - 1;
			buf[o + 1] = 1 - ((animal.y + 0.5) / height) * 2;
			buf[o + 2] = species._glRgb[0];
			buf[o + 3] = species._glRgb[1];
			buf[o + 4] = species._glRgb[2];
			count++;
		}
		this._drawPointBuffer(count, size);
	}

	_diverging(t, colorLow, colorHigh) {
		return [
			Math.round(colorLow[0] + (colorHigh[0] - colorLow[0]) * t),
			Math.round(colorLow[1] + (colorHigh[1] - colorLow[1]) * t),
			Math.round(colorLow[2] + (colorHigh[2] - colorLow[2]) * t),
		];
	}

	_altitudeRamp(v) {
		if (v < BIOME_THRESHOLDS.seaLevel) {
			const t = v / BIOME_THRESHOLDS.seaLevel;
			return this._diverging(t, [5, 20, 60], [80, 150, 210]);
		}
		const t = (v - BIOME_THRESHOLDS.seaLevel) / (1 - BIOME_THRESHOLDS.seaLevel);
		return this._diverging(t, [40, 110, 40], [255, 255, 255]);
	}
}
