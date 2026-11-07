'use strict';

// Batches the terrain atlas, walls, and edge shading into one ordered WebGL draw.
function makeTerrainGL(doc, atlas) {
  const canvas = doc.createElement('canvas');
  let gl;
  try { gl = canvas.getContext('webgl2', { alpha: true, antialias: false, depth: false, stencil: false }); }
  catch (_) { return null; }
  if (!gl || typeof gl.createShader !== 'function') return null;
  const shaders = [];
  function shader(type, source) {
    const handle = gl.createShader(type);
    shaders.push(handle);
    gl.shaderSource(handle, source);
    gl.compileShader(handle);
    if (!gl.getShaderParameter(handle, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(handle));
    return handle;
  }
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  const texture = gl.createTexture();
  try {
    if (atlas.height > gl.getParameter(gl.MAX_TEXTURE_SIZE)) throw Error('Terrain atlas is too large.');
    gl.attachShader(program, shader(gl.VERTEX_SHADER, `#version 300 es
      layout(location=0) in vec2 point;
      layout(location=1) in vec2 uv;
      layout(location=2) in vec4 tint;
      uniform vec2 viewport;
      out vec2 vUv;
      out vec4 vTint;
      void main(){gl_Position=vec4(point/viewport*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);vUv=uv;vTint=tint;}`));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `#version 300 es
      precision highp float;
      uniform sampler2D tiles;
      in vec2 vUv;
      in vec4 vTint;
      out vec4 color;
      void main(){vec4 c=vUv.x<0.?vTint:texture(tiles,vUv)*vTint;color=vec4(c.rgb*c.a,c.a);}`));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    for (const flag of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, flag, gl.NEAREST);
    for (const flag of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, flag, gl.CLAMP_TO_EDGE);
    if (gl.getError() !== gl.NO_ERROR) throw Error('Terrain texture upload failed.');
  } catch (_) {
    gl.deleteTexture(texture); gl.deleteBuffer(buffer); gl.deleteProgram(program);
    return null;
  } finally {
    for (const handle of shaders) gl.deleteShader(handle);
  }
  const viewport = gl.getUniformLocation(program, 'viewport');
  const white = [1, 1, 1, 1], clear = [0, 0, 0, 0], shade = [0, 0, 0, .42];
  const colours = new Map();
  let vertices = new Float32Array(65536), used = 0, lost = false;
  canvas.addEventListener('webglcontextlost', ev => { ev.preventDefault(); lost = true; });
  // A lost GPU falls back to Canvas2D for the remainder of this renderer's lifetime.
  function colour(text) {
    if (colours.has(text)) return colours.get(text);
    let result = white;
    if (text.startsWith('#')) {
      let hex = text.slice(1);
      if (hex.length === 3) hex = [...hex].map(c => c + c).join('');
      result = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).concat(1);
    } else {
      const channels = text.match(/[\d.]+/g);
      if (channels && channels.length >= 3) result = channels.slice(0, 3).map(n => Number(n) / 255).concat(channels.length > 3 ? Number(channels[3]) : 1);
    }
    colours.set(text, result);
    return result;
  }
  function vertex(x, y, u, v, c) {
    vertices[used++] = x; vertices[used++] = y; vertices[used++] = u; vertices[used++] = v;
    vertices[used++] = c[0]; vertices[used++] = c[1]; vertices[used++] = c[2]; vertices[used++] = c[3];
  }
  function quad(x, y, w, h, u, v, u1, v1, top, bottom = top) {
    if (used + 48 > vertices.length) {
      const larger = new Float32Array(vertices.length * 2); larger.set(vertices); vertices = larger;
    }
    vertex(x,y,u,v,top); vertex(x+w,y,u1,v,top); vertex(x,y+h,u,v1,bottom);
    vertex(x,y+h,u,v1,bottom); vertex(x+w,y,u1,v,top); vertex(x+w,y+h,u1,v1,bottom);
  }
  const painter = {
    fillStyle: '#ffffff',
    fillRect(x,y,w,h) { quad(x,y,w,h,-1,-1,-1,-1,colour(this.fillStyle)); },
    drawImage(source,sx,sy,sw,sh,x,y,w,h) {
      quad(x,y,w,h,sx/atlas.width,sy/atlas.height,(sx+sw)/atlas.width,(sy+sh)/atlas.height,white);
    },
    surfaceShade(x,y,w,h) { quad(x,y,w,h,-1,-1,-1,-1,clear,shade); }
  };
  return {
    canvas, painter,
    begin(w, h) {
      if (lost || gl.isContextLost()) return false;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      used = 0;
      return true;
    },
    end() {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(program); gl.uniform2f(viewport, canvas.width, canvas.height);
      gl.bindTexture(gl.TEXTURE_2D, texture); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices.subarray(0, used), gl.STREAM_DRAW);
      for (const [index, size, offset] of [[0,2,0],[1,2,8],[2,4,16]]) {
        gl.enableVertexAttribArray(index); gl.vertexAttribPointer(index,size,gl.FLOAT,false,32,offset);
      }
      gl.drawArrays(gl.TRIANGLES, 0, used / 8);
      return used / 48;
    }
  };
}
const EXPORTS_webgl = { makeTerrainGL };
if (typeof module !== 'undefined' && module.exports) module.exports = EXPORTS_webgl;
else if (typeof FATHOM !== 'undefined') FATHOM.webgl = EXPORTS_webgl;
