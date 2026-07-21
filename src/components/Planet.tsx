import { useEffect, useRef } from 'react';

const VERT = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

// A slowly rotating luminous planet: deep indigo world veined with
// glowing marbled rivers that flow and shift hue, dark rocky landmasses,
// soft atmosphere rim. Outside the disk the canvas is transparent.
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uFlow;   // accumulated flow-time; typing accelerates it
uniform float uEnergy; // 0 calm … 1 fully awake
uniform vec3 uAccent;

float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 7; i++) {
    v += amp * noise(p);
    p = r * p * 2.02;
    amp *= 0.5;
  }
  return v;
}

// ridged fbm — sharp marble/vein ridges instead of soft blobs
float ridged(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 6; i++) {
    float n = 1.0 - abs(noise(p) * 2.0 - 1.0);
    v += amp * n * n;
    p = r * p * 2.03;
    amp *= 0.5;
  }
  return v;
}

// swirl the domain around a moving vortex center — storm eddies
vec2 swirl(vec2 p, vec2 c, float strength, float radius) {
  vec2 d = p - c;
  float r = length(d);
  float a = strength * exp(-r * r / (radius * radius));
  float s = sin(a), co = cos(a);
  return c + mat2(co, -s, s, co) * d;
}

vec3 hueShift(vec3 color, float a) {
  const vec3 k = vec3(0.57735);
  float c = cos(a);
  return color * c + cross(k, color) * sin(a) + k * dot(k, color) * (1.0 - c);
}

// iridescent jewel palette: violet / teal / rose / gold, harmonized
vec3 pal(float x) {
  return vec3(0.50, 0.40, 0.55)
       + vec3(0.40, 0.34, 0.38) * cos(6.28318 * (x + vec3(0.98, 0.42, 0.18)));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * uRes.y);
  float rPlanet = 0.90;

  vec2 p = uv / rPlanet;
  float pd = dot(p, p);
  float rr0 = sqrt(pd);
  float edgeA = 1.0 - smoothstep(0.988, 1.004, rr0);

  if (edgeA <= 0.0) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // sphere surface; longitude spins slowly
  float z = sqrt(max(0.0, 1.0 - pd));
  float lon = atan(p.x, z) + uTime * 0.015;
  float lat = asin(clamp(p.y, -1.0, 1.0));
  vec2 s = vec2(lon * 1.6, lat * 2.0);

  // storm eddies: swirl the surface domain around a few slow-drifting vortices
  // so the flow spirals like weather systems instead of just drifting
  float t1 = uFlow * 0.02;
  vec2 sw = s;
  sw = swirl(sw, vec2(0.9 + 0.5 * sin(t1 * 0.3), 0.6), 0.85 + 0.5 * uEnergy, 1.1);
  sw = swirl(sw, vec2(-1.4, -0.8 + 0.4 * cos(t1 * 0.24)), -0.65 - 0.4 * uEnergy, 0.9);
  sw = swirl(sw, vec2(0.2 + 0.7 * cos(t1 * 0.19), 1.7), 0.55, 0.7);

  // double-warped flow field — this is what makes it feel alive
  vec2 q = vec2(
    fbm(sw + vec2(t1, -t1 * 0.7)),
    fbm(sw + vec2(5.2, 1.3) - vec2(t1 * 0.8, t1 * 0.5))
  );
  vec2 w = vec2(
    fbm(sw + 3.0 * q + vec2(1.7, 9.2) + vec2(t1 * 0.6, 0.0)),
    fbm(sw + 3.0 * q + vec2(8.3, 2.8))
  );
  float f = fbm(sw + 2.5 * w);

  // MAIN COLOR: the body is built from shades of the tone accent, so the hue
  // lives in the material itself instead of washing over it like a filter
  vec3 aDeep = uAccent * 0.14 + vec3(0.03, 0.02, 0.05);
  vec3 aBody = uAccent * 0.60;
  vec3 aLit  = mix(uAccent, vec3(1.0), 0.28);
  vec3 col = mix(aDeep, aBody, f * 1.25);
  col = mix(col, aLit, q.x * q.x * 0.55);

  // SECONDARY minerals: quiet teal deeps + magenta swells for depth, kept low
  // so they read as veining in the rock rather than a second wash of color
  col = mix(col, vec3(0.07, 0.24, 0.32), q.y * q.y * 0.24);
  col = mix(col, vec3(0.40, 0.13, 0.38), pow(q.x, 3.0) * 0.26);

  // ridged marble veins carve sharp structure into the surface — dark seams
  // in the troughs, bright mineral crests on the ridges
  float marble = ridged(sw * 2.3 + 1.5 * w);
  col *= 0.72 + 0.5 * marble;                                   // carve shadowed seams
  col += mix(uAccent, vec3(1.0), 0.5) * pow(marble, 4.0) * 0.35; // bright crests

  // marbled iridescent rivers — a subtle secondary shimmer
  float fil = pow(0.5 + 0.5 * sin(f * 14.0 - uFlow * 0.15), 10.0);
  vec3 neon = pal(fract(w.x * 0.8 + uFlow * 0.004));
  col += neon * fil * (0.26 + 0.5 * w.y) * (1.0 + 1.1 * uEnergy);
  // finer capillary rivers layered on top for intricate marbling
  float fil2 = pow(0.5 + 0.5 * sin(f * 34.0 + w.x * 7.0 - uFlow * 0.22), 14.0);
  col += pal(fract(w.y * 0.9 + 0.4 + uFlow * 0.006)) * fil2 * 0.16 * (1.0 + 1.2 * uEnergy);

  // GOLDEN BURST: ember veins that smoulder faintly at rest and flare bright
  // gold as you type (uEnergy drives the pop)
  float crackBase = fbm(s * 2.6 + 2.2 * w + 3.0);
  float vein = pow(0.5 + 0.5 * sin(crackBase * 18.0 + w.y * 4.0), 16.0);
  float flicker = 0.8 + (0.3 + 0.6 * uEnergy) * sin(uFlow * 0.8 + crackBase * 20.0);
  vec3 ember = mix(vec3(0.96, 0.44, 0.08), vec3(1.0, 0.86, 0.40), vein * flicker);
  col += ember * vein * flicker * (0.30 + 0.6 * q.x) * (0.55 + 3.2 * uEnergy);

  // frosted highlands — cool icy clouds that keep the accent from going flat
  float land = smoothstep(0.52, 0.62, fbm(s * 1.4 + 4.0 * q + 11.0));
  float rock = fbm(s * 7.0 + w * 2.0);
  vec3 frost = mix(vec3(0.46, 0.50, 0.72), vec3(0.82, 0.86, 0.96), rock * rock * 1.3);
  col = mix(col, frost, land * 0.70);
  // golden embers burn through at the highland edges, brighter as you type
  col += ember * land * (1.0 - land) * 4.0 * vein * (1.0 + 2.0 * uEnergy);

  // fine mineral grain — micro-texture that only shows at high resolution
  float micro = fbm(s * 15.0 + 3.0 * w);
  col *= 0.93 + 0.14 * micro;

  // photographic lighting from the upper right
  vec3 nrm = vec3(p, z);
  vec3 lightDir = normalize(vec3(0.28, 0.52, 0.80));
  float l = dot(nrm, lightDir);
  col *= 0.42 + 0.68 * clamp(l, 0.0, 1.0);
  // subsurface warmth bleeding through the lit hemisphere
  col += uAccent * 0.05 * smoothstep(-0.1, 1.0, l);
  // glossy specular sheen — a wet, glassy catch-light, brighter as you type
  float spec = pow(max(0.0, l), 42.0);
  col += vec3(1.0, 0.96, 0.90) * spec * (0.14 + 0.16 * uEnergy);
  // limb darkening rounds the sphere and deepens the terminator
  col *= mix(1.0, 0.52, pow(clamp(rr0, 0.0, 1.0), 3.2));

  // thin-film iridescence — an oil-on-water sheen that shifts with view angle,
  // strongest near the grazing limb where the atmosphere catches the light
  float fres = pow(1.0 - z, 2.0);
  vec3 film = 0.5 + 0.5 * cos(6.28318 * (fres * 2.4 + w.x * 0.5 + vec3(0.0, 0.33, 0.66)));
  col += film * fres * (0.10 + 0.10 * uEnergy) * clamp(l + 0.3, 0.0, 1.0);

  // sparkle flecks — tiny mineral glints scattered across the lit face
  float spk = fbm(sw * 26.0 + 7.0 * w);
  float glint = smoothstep(0.86, 0.99, spk) * pow(max(0.0, l), 2.0);
  col += vec3(1.0, 0.97, 0.9) * glint * (0.6 + 1.4 * uEnergy)
       * (0.6 + 0.4 * sin(uFlow * 1.3 + spk * 40.0));

  // atmosphere rim: accent-tinted halo with a golden horizon glow up top
  float rim = pow(1.0 - z, 2.5);
  col += mix(vec3(0.42, 0.34, 0.66), uAccent, 0.6) * rim * (0.34 + 0.4 * uEnergy);
  col += vec3(1.0, 0.78, 0.34) * rim * max(p.y, 0.0) * (0.28 + 0.4 * uEnergy);
  col += uAccent * rim * uEnergy * 0.3;

  // slow whole-planet hue breathing — narrowed so it stays near the accent hue
  col = hueShift(col, sin(uTime * 0.03) * 0.12);

  col += (hash(floor(gl_FragCoord.xy / 2.0) + fract(uTime)) - 0.5) * 0.015;

  gl_FragColor = vec4(col * edgeA, edgeA);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

interface PlanetProps {
  accent: string;
  /** Increment on every keystroke — each bump wakes the planet a little. */
  pulse?: number;
  /** While true (thinking/streaming) the planet stays fully awake. */
  excited?: boolean;
}

export function Planet({ accent, pulse = 0, excited = false }: PlanetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accentRef = useRef(accent);
  const energyRef = useRef(0);
  const excitedRef = useRef(excited);

  useEffect(() => {
    accentRef.current = accent;
  }, [accent]);

  useEffect(() => {
    excitedRef.current = excited;
  }, [excited]);

  useEffect(() => {
    if (pulse > 0) energyRef.current = Math.min(1, energyRef.current + 0.35);
  }, [pulse]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
    if (!gl) return;
    if (gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.restoreContext();

    const compile = (type: number, src: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      return shader;
    };

    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPosition = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, 'uRes');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uFlow = gl.getUniformLocation(program, 'uFlow');
    const uEnergy = gl.getUniformLocation(program, 'uEnergy');
    const uAccent = gl.getUniformLocation(program, 'uAccent');

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = canvas.clientWidth;
      // supersample above the display size for crisp filaments, then let CSS
      // downscale — capped so huge viewports don't melt the GPU
      const px = Math.max(1, Math.min(Math.floor(size * dpr * 1.5), 1800));
      canvas.width = px;
      canvas.height = px;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const start = performance.now();
    let last = start;
    let flowTime = 40.0;
    // current accent, eased toward the target so tone changes glide in color
    const curAccent = hexToRgb(accentRef.current);

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      // energy: keystroke bumps decay toward calm; excitement holds it high
      const floor = excitedRef.current ? 0.7 : 0;
      const e = Math.max(floor, floor + (energyRef.current - floor) * Math.exp(-dt / 0.9));
      energyRef.current = e;
      // typing makes the surface churn up to ~6x faster
      flowTime += dt * (1 + 5 * e);

      const [tr, tg, tb] = hexToRgb(accentRef.current);
      const k = 1 - Math.exp(-dt / 0.35); // ~0.35s ease toward the new accent
      curAccent[0] += (tr - curAccent[0]) * k;
      curAccent[1] += (tg - curAccent[1]) * k;
      curAccent[2] += (tb - curAccent[2]) * k;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - start) / 1000 + 40.0);
      gl.uniform1f(uFlow, flowTime);
      gl.uniform1f(uEnergy, e);
      gl.uniform3f(uAccent, curAccent[0], curAccent[1], curAccent[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reducedMotion) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="planet-canvas" aria-hidden="true" />;
}
