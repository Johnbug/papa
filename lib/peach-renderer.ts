import { deform, type Impact } from './soft-body';

export function createPeachRenderer(canvas: HTMLCanvasElement, image: HTMLImageElement) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
  if (!gl) return null;
  function shader(type: number, source: string) {
    const s = gl!.createShader(type)!;
    gl!.shaderSource(s, source); gl!.compileShader(s);
    if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) { gl!.deleteShader(s); throw new Error('Could not initialize toy graphics'); }
    return s;
  }
  const vs = shader(gl.VERTEX_SHADER, 'attribute vec2 aPosition; attribute vec2 aUV; varying vec2 vUV; void main(){vUV=aUV;gl_Position=vec4(aPosition.x*2.0-1.0,1.0-aPosition.y*2.0,0.0,1.0);}');
  const fs = shader(gl.FRAGMENT_SHADER, 'precision mediump float; varying vec2 vUV; uniform sampler2D uImage; void main(){gl_FragColor=texture2D(uImage,vUV);}');
  const program = gl.createProgram()!; gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Could not link toy graphics');
  gl.useProgram(program);
  const grid = 40, vertices = (grid + 1) ** 2;
  const uv = new Float32Array(vertices * 2), position = new Float32Array(vertices * 2);
  const indices: number[] = [];
  for (let y = 0; y <= grid; y++) for (let x = 0; x <= grid; x++) {
    const i = (y * (grid + 1) + x) * 2; uv[i] = x / grid; uv[i + 1] = y / grid;
    if (x < grid && y < grid) { const a = y * (grid + 1) + x, b = a + grid + 1; indices.push(a, b, a + 1, a + 1, b, b + 1); }
  }
  const uvBuffer = gl.createBuffer()!, posBuffer = gl.createBuffer()!, indexBuffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer); gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
  const ua = gl.getAttribLocation(program, 'aUV'); gl.enableVertexAttribArray(ua); gl.vertexAttribPointer(ua, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer); gl.bufferData(gl.ARRAY_BUFFER, position, gl.DYNAMIC_DRAW);
  const pa = gl.getAttribLocation(program, 'aPosition'); gl.enableVertexAttribArray(pa); gl.vertexAttribPointer(pa, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  const texture = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.uniform1i(gl.getUniformLocation(program, 'uImage'), 0);
  return {
    draw(now: number, impacts: Impact[], softness: number, press: { x: number; y: number; amount: number } | null, reduced: boolean) {
      const size = Math.round(canvas.clientWidth * Math.min(devicePixelRatio || 1, 2));
      if (canvas.width !== size || canvas.height !== size) { canvas.width = size; canvas.height = size; gl.viewport(0, 0, size, size); }
      for (let i = 0; i < uv.length; i += 2) {
        const x = uv[i], y = uv[i + 1];
        const [dx, dy] = reduced ? [0, 0] : deform(x, y, now, impacts, softness);
        let px = 0, py = 0;
        if (press && !reduced) {
          const rx = x - press.x, ry = y - press.y;
          const local = Math.exp(-(rx * rx + ry * ry) / .026) * press.amount;
          px = -rx * local * .52; py = (-ry * .4 + .028) * local;
        }
        position[i] = x + dx + px; position[i + 1] = y + dy + py;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer); gl.bufferSubData(gl.ARRAY_BUFFER, 0, position);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    },
    dispose() { gl.deleteBuffer(uvBuffer); gl.deleteBuffer(posBuffer); gl.deleteBuffer(indexBuffer); gl.deleteTexture(texture); gl.deleteProgram(program); gl.deleteShader(vs); gl.deleteShader(fs); },
  };
}
