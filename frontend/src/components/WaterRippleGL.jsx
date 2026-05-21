import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";

// ── GLSL Shaders ──────────────────────────────────────────────────────────────

const VERT_SRC = /* glsl */ `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

// Fragment shader: procedural water using multi-layer sine waves + mouse ripples
const FRAG_SRC = /* glsl */ `
  precision mediump float;

  uniform vec2  u_resolution;   // canvas size in pixels
  uniform float u_time;         // seconds since mount
  uniform vec3  u_ripples[8];   // up to 8 mouse ripples: (x, y, birth_time)
  uniform int   u_ripple_count;

  // ── Palette ───────────────────────────────────────────────────────────────
  // Water colors: deep blue-indigo tones matching the BUAP dark theme
  const vec3 COLOR_DEEP = vec3(0.97, 0.99, 1.00);  // Pure bright highlight
  const vec3 COLOR_MID = vec3(0.90, 0.95, 0.99);  // Very pale sky blue
  const vec3 COLOR_TROUGH = vec3(0.83, 0.91, 0.97);  // Shallow, bright water

  // ── Helpers ───────────────────────────────────────────────────────────────
  float wave(vec2 uv, vec2 dir, float speed, float freq, float phase) {
    return sin(dot(uv, dir) * freq + u_time * speed + phase);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    // Keep aspect ratio neutral for wave math
    vec2 p  = uv * vec2(u_resolution.x / u_resolution.y, 1.0);

    // ── Ambient procedural waves (4 layers) ──────────────────────────────
    float h = 0.0;
    h += wave(p, vec2(1.0, 0.4),  0.30, 6.0,  0.00) * 0.18;
    h += wave(p, vec2(-0.7, 1.0), 0.22, 9.0,  1.57) * 0.12;
    h += wave(p, vec2(0.5, -0.8), 0.40, 13.0, 0.80) * 0.08;
    h += wave(p, vec2(-0.3, 0.6), 0.18, 20.0, 2.40) * 0.05;

    // ── Mouse / touch ripples ────────────────────────────────────────────
    for (int i = 0; i < 8; i++) {
      if (i >= u_ripple_count) break;
      vec2  origin = u_ripples[i].xy;               // 0..1 UV
      float birth  = u_ripples[i].z;
      float age    = u_time - birth;                 // seconds
      if (age < 0.0 || age > 3.5) continue;

      float dist   = distance(uv, origin);
      float speed  = 0.55;                           // wave front speed (UV/s)
      float front  = age * speed;
      float spread = 0.06 + age * 0.04;             // ring thickness grows

      // Gaussian envelope around the expanding ring
      float ring   = exp(-pow(dist - front, 2.0) / (2.0 * spread * spread));
      float decay  = exp(-age * 1.1);               // amplitude fades over time
      float osc    = cos((dist - front) * 40.0);    // high-freq oscillation

      h += ring * decay * osc * 0.22;
    }

    // ── Map height to color ──────────────────────────────────────────────
    // h is roughly in [-0.5, 0.5]; remap to [0,1]
    float t = clamp(h * 1.0 + 0.5, 0.0, 1.0);

    vec3 color = mix(COLOR_TROUGH, COLOR_MID, t);
    color      = mix(color, COLOR_DEEP, smoothstep(0.55, 1.0, t));

    // Subtle vignette so edges fade to bg
    float vign = 1.0 - smoothstep(0.45, 0.85, length(uv - 0.5));
    color = mix(vec3(0.941, 0.961, 0.980), color, 0.55 + 0.45 * vign);

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ── WebGL helpers ─────────────────────────────────────────────────────────────

function createShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

function createProgram(gl, vertSrc, fragSrc) {
  const vert = createShader(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = createShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!vert || !frag) return null;
  const prog = gl.createProgram();
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(prog));
    return null;
  }
  return prog;
}

// ── Component ─────────────────────────────────────────────────────────────────

const MAX_RIPPLES = 8;

const WaterRippleGL = forwardRef(function WaterRippleGL({ className = "" }, ref) {
  const canvasRef = useRef(null);
  const glRef = useRef(null);
  const progRef = useRef(null);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const ripplesRef = useRef([]);   // [{ x, y, birth }] in UV coords

  // ── Add ripple — called from parent via ref ────────────────────────────
  const addRipple = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const x = (clientX - rect.left) / rect.width;
    const y = 1.0 - (clientY - rect.top) / rect.height; // flip Y for GL
    const birth = (performance.now() - startRef.current) / 1000;

    const ripples = ripplesRef.current;
    // Throttle: skip if very close to last ripple in time
    if (ripples.length > 0 && birth - ripples[ripples.length - 1].birth < 0.05) return;

    ripples.push({ x, y, birth });
    if (ripples.length > MAX_RIPPLES) ripples.shift();
  }, []);

  // Expose addRipple to parent via ref
  useImperativeHandle(ref, () => ({ addRipple }), [addRipple]);

  // ── WebGL setup & render loop ──────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) { console.warn("WebGL not supported"); return; }
    glRef.current = gl;

    const prog = createProgram(gl, VERT_SRC, FRAG_SRC);
    if (!prog) return;
    progRef.current = prog;

    // Full-screen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.useProgram(prog);

    // Resize handler
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    startRef.current = performance.now();

    const render = () => {
      const t = (performance.now() - startRef.current) / 1000;

      gl.uniform2f(gl.getUniformLocation(prog, "u_resolution"), canvas.width, canvas.height);
      gl.uniform1f(gl.getUniformLocation(prog, "u_time"), t);

      // Pack ripples into flat Float32Array [x,y,birth, x,y,birth, ...]
      const ripples = ripplesRef.current;
      const flat = new Float32Array(MAX_RIPPLES * 3).fill(0);
      ripples.forEach((r, i) => {
        flat[i * 3] = r.x;
        flat[i * 3 + 1] = r.y;
        flat[i * 3 + 2] = r.birth;
      });
      gl.uniform3fv(gl.getUniformLocation(prog, "u_ripples"), flat);
      gl.uniform1i(gl.getUniformLocation(prog, "u_ripple_count"), ripples.length);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full h-full ${className}`}
    />
  );
});

export default WaterRippleGL;
