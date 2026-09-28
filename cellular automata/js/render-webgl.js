"use strict";

  /* ============================================================
     WEBGL RENDERER (square, hex, and tri grids)
     ============================================================ */

  let gl = null;
  let glSupported = false;
  let glProgram = null;
  let glTexture = null;
  let glTexData = null;
  let glUniforms = {};

  function compileShader(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error("AUTOMATON WebGL shader error:", gl.getShaderInfoLog(sh));
    }
    return sh;
  }

  function initWebGL() {
    gl = glCanvasEl.getContext("webgl2") || glCanvasEl.getContext("webgl");
    if (!gl) { glSupported = false; return; }
    glSupported = true;

    const vsSrc = `
      attribute vec2 aPos;
      varying vec2 vUv;
      void main() {
        vUv = aPos * 0.5 + 0.5;
        gl_Position = vec4(aPos, 0.0, 1.0);
      }
    `;
    // Fragment shader maps each pixel back to a (col,row) grid cell using the
    // same picking math as the CPU hexCellFromPixel/triCellFromPixel/square
    // helpers (input.js), then looks that cell up in the small state texture.
    // Because the cell is resolved geometrically from a top-left-origin pixel
    // coordinate (not sampled directly via vUv), this is immune to the
    // vUv/texture v-axis flip that a direct-sample approach would have.
    const fsSrc = `
      precision mediump float;
      varying vec2 vUv;
      uniform sampler2D uTex;
      uniform vec2 uGridSize;
      uniform vec2 uCanvasPx;
      uniform float uShowGrid;
      uniform float uShape;
      uniform float uCellSize;
      uniform float uHexRadius;
      uniform float uTriWidth;

      const float SQRT3 = 1.7320508;

      float triSignGL(vec2 p, vec2 a, vec2 b) {
        return (p.x - b.x) * (a.y - b.y) - (a.x - b.x) * (p.y - b.y);
      }

      bool pointInTriGL(vec2 p, vec2 a, vec2 b, vec2 c) {
        float d1 = triSignGL(p, a, b);
        float d2 = triSignGL(p, b, c);
        float d3 = triSignGL(p, c, a);
        bool hasNeg = (d1 < 0.0) || (d2 < 0.0) || (d3 < 0.0);
        bool hasPos = (d1 > 0.0) || (d2 > 0.0) || (d3 > 0.0);
        return !(hasNeg && hasPos);
      }

      void triVertsGL(float col, float row, out vec2 a, out vec2 b, out vec2 c) {
        float w = uTriWidth;
        float h = w * SQRT3 * 0.5;
        bool up = mod(col + row, 2.0) < 0.5;
        float left = col * (w * 0.5);
        float right = left + w;
        float midX = left + w * 0.5;
        float top = row * h;
        float bottom = (row + 1.0) * h;
        if (up) { a = vec2(left, bottom); b = vec2(right, bottom); c = vec2(midX, top); }
        else { a = vec2(left, top); b = vec2(right, top); c = vec2(midX, bottom); }
      }

      void main() {
        vec2 domPixel = vec2(vUv.x * uCanvasPx.x, (1.0 - vUv.y) * uCanvasPx.y);
        vec2 cell = vec2(-1.0, -1.0);
        float border = 0.0;

        if (uShape > 1.5) {
          float w = uTriWidth;
          float h = w * SQRT3 * 0.5;
          float rowGuess = floor(domPixel.y / h);
          float colGuess = floor(domPixel.x / (w * 0.5));
          for (int dy = -1; dy <= 1; dy++) {
            for (int dx = -2; dx <= 2; dx++) {
              float row = rowGuess + float(dy);
              float col = colGuess + float(dx);
              if (row >= 0.0 && row < uGridSize.y && col >= 0.0 && col < uGridSize.x) {
                vec2 a, b, c;
                triVertsGL(col, row, a, b, c);
                if (pointInTriGL(domPixel, a, b, c)) {
                  cell = vec2(col, row);
                  float e1 = abs(triSignGL(domPixel, a, b)) / length(b - a);
                  float e2 = abs(triSignGL(domPixel, b, c)) / length(c - b);
                  float e3 = abs(triSignGL(domPixel, c, a)) / length(a - c);
                  border = min(e1, min(e2, e3)) < max(1.0, w * 0.035) ? 1.0 : 0.0;
                }
              }
            }
          }
        } else if (uShape > 0.5) {
          float r = uHexRadius;
          float hexWidth = SQRT3 * r;
          float originX = hexWidth * 0.5;
          float originY = r;
          float approxRow = floor((domPixel.y - originY) / (1.5 * r) + 0.5);
          float bestD = 1.0e9;
          float best2D = 1.0e9;
          for (int ry = -1; ry <= 1; ry++) {
            float rowCand = approxRow + float(ry);
            if (rowCand >= 0.0 && rowCand < uGridSize.y) {
              float rowOffset = mod(rowCand, 2.0) >= 0.999 ? hexWidth * 0.5 : 0.0;
              float approxCol = floor((domPixel.x - originX - rowOffset) / hexWidth + 0.5);
              for (int rx = -1; rx <= 1; rx++) {
                float colCand = approxCol + float(rx);
                if (colCand >= 0.0 && colCand < uGridSize.x) {
                  float cx = originX + hexWidth * colCand + rowOffset;
                  float cy = originY + 1.5 * r * rowCand;
                  float d = distance(domPixel, vec2(cx, cy));
                  if (d < bestD) { best2D = bestD; bestD = d; cell = vec2(colCand, rowCand); }
                  else if (d < best2D) { best2D = d; }
                }
              }
            }
          }
          border = (best2D - bestD) < (r * 0.09) ? 1.0 : 0.0;
        } else {
          cell = floor(domPixel / uCellSize);
          vec2 f = fract(domPixel / uCellSize);
          float edge = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)) * uCellSize;
          border = edge < 1.0 ? 1.0 : 0.0;
        }

        if (cell.x < 0.0 || cell.x >= uGridSize.x || cell.y < 0.0 || cell.y >= uGridSize.y) {
          discard;
        }

        vec2 texUv = (cell + 0.5) / uGridSize;
        vec4 c = texture2D(uTex, texUv);

        if (uShowGrid > 0.5 && border > 0.5) {
          vec3 lineColor = vec3(0.106, 0.129, 0.169);
          c = vec4(mix(c.rgb, lineColor, 0.6), max(c.a, 0.4));
        }
        gl_FragColor = c;
      }
    `;

    const vs = compileShader(gl.VERTEX_SHADER, vsSrc);
    const fs = compileShader(gl.FRAGMENT_SHADER, fsSrc);
    glProgram = gl.createProgram();
    gl.attachShader(glProgram, vs);
    gl.attachShader(glProgram, fs);
    gl.linkProgram(glProgram);
    if (!gl.getProgramParameter(glProgram, gl.LINK_STATUS)) {
      console.error("AUTOMATON WebGL program link error:", gl.getProgramInfoLog(glProgram));
      glSupported = false;
      return;
    }

    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(glProgram, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    glTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, glTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(7 / 255, 9 / 255, 17 / 255, 1);

    glUniforms.uTex = gl.getUniformLocation(glProgram, "uTex");
    glUniforms.uGridSize = gl.getUniformLocation(glProgram, "uGridSize");
    glUniforms.uCanvasPx = gl.getUniformLocation(glProgram, "uCanvasPx");
    glUniforms.uShowGrid = gl.getUniformLocation(glProgram, "uShowGrid");
    glUniforms.uShape = gl.getUniformLocation(glProgram, "uShape");
    glUniforms.uCellSize = gl.getUniformLocation(glProgram, "uCellSize");
    glUniforms.uHexRadius = gl.getUniformLocation(glProgram, "uHexRadius");
    glUniforms.uTriWidth = gl.getUniformLocation(glProgram, "uTriWidth");
  }

  function renderWebGL() {
    if (!glSupported) return;
    const dpr = window.devicePixelRatio || 1;
    const { w: pxW, h: pxH } = boardPixelSize();
    const targetW = Math.round(pxW * dpr);
    const targetH = Math.round(pxH * dpr);
    if (glCanvasEl.width !== targetW || glCanvasEl.height !== targetH) {
      glCanvasEl.width = targetW;
      glCanvasEl.height = targetH;
    }
    glCanvasEl.style.width = pxW + "px";
    glCanvasEl.style.height = pxH + "px";

    const n = state.cols * state.rows;
    if (!glTexData || glTexData.length !== n * 4) {
      glTexData = new Uint8Array(n * 4);
    }

    const rgbs = teams.map((t) => hexToRgb01(t.color));

    for (let i = 0; i < n; i++) {
      const s = grid[i];
      const p = i * 4;
      const owner = ownerOf(s);
      if (owner === null || owner >= rgbs.length) {
        glTexData[p] = 0; glTexData[p + 1] = 0; glTexData[p + 2] = 0; glTexData[p + 3] = 0;
      } else {
        const rgb = rgbs[owner];
        const a = stateAlpha(s);
        glTexData[p] = Math.round(rgb[0] * 255);
        glTexData[p + 1] = Math.round(rgb[1] * 255);
        glTexData[p + 2] = Math.round(rgb[2] * 255);
        glTexData[p + 3] = Math.round(a * 255);
      }
    }

    gl.viewport(0, 0, glCanvasEl.width, glCanvasEl.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(glProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, glTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, state.cols, state.rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, glTexData);
    gl.uniform1i(glUniforms.uTex, 0);
    gl.uniform2f(glUniforms.uGridSize, state.cols, state.rows);
    gl.uniform2f(glUniforms.uCanvasPx, pxW, pxH);
    gl.uniform1f(glUniforms.uShowGrid, state.showGrid ? 1 : 0);
    gl.uniform1f(glUniforms.uShape, state.gridShape === "hex" ? 1 : state.gridShape === "tri" ? 2 : 0);
    gl.uniform1f(glUniforms.uCellSize, state.cellSize);
    gl.uniform1f(glUniforms.uHexRadius, state.hexRadius);
    gl.uniform1f(glUniforms.uTriWidth, state.triWidth);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function usingWebGL() {
    return state.renderer === "webgl" && glSupported;
  }

  function activeCanvasEl() {
    return usingWebGL() ? glCanvasEl : canvas;
  }

  function updateRendererAvailability() {
    btnRendererWebgl.disabled = !glSupported;
    btnRendererWebgl.title = !glSupported ? "WebGL not supported in this browser" : "";
  }

  function setRenderer(mode) {
    if (mode === "webgl" && !glSupported) mode = "canvas2d";
    state.renderer = mode;
    const isGL = mode === "webgl";
    btnRendererCanvas.classList.toggle("is-active", !isGL);
    btnRendererCanvas.setAttribute("aria-checked", String(!isGL));
    btnRendererWebgl.classList.toggle("is-active", isGL);
    btnRendererWebgl.setAttribute("aria-checked", String(isGL));
    render();
  }

  btnRendererCanvas.addEventListener("click", () => setRenderer("canvas2d"));
  btnRendererWebgl.addEventListener("click", () => setRenderer("webgl"));
