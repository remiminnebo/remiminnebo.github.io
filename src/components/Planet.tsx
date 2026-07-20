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
  for (int i = 0; i < 5; i++) {
    v += amp * noise(p);
    p = r * p * 2.02;
    amp *= 0.5;
  }
  return v;
}

vec3 hueShift(vec3 color, float a) {
  const vec3 k = vec3(0.57735);
  float c = cos(a);
  return color * c + cross(k, color) * sin(a) + k * dot(k, color) * (1.0 - c);
}

// iridescent neon palette: magenta / orange / teal / electric blue
vec3 pal(float x) {
  return vec3(0.55, 0.35, 0.60)
       + vec3(0.45, 0.35, 0.40) * cos(6.28318 * (x + vec3(0.90, 0.55, 0.15)));
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

  // double-warped flow field — this is what makes it feel alive
  float t1 = uFlow * 0.02;
  vec2 q = vec2(
    fbm(s + vec2(t1, -t1 * 0.7)),
    fbm(s + vec2(5.2, 1.3) - vec2(t1 * 0.8, t1 * 0.5))
  );
  vec2 w = vec2(
    fbm(s + 3.0 * q + vec2(1.7, 9.2) + vec2(t1 * 0.6, 0.0)),
    fbm(s + 3.0 * q + vec2(8.3, 2.8))
  );
  float f = fbm(s + 2.5 * w);

  // violet-magenta body, tinted faintly by the tone accent
  vec3 col = mix(vec3(0.10, 0.04, 0.20), vec3(0.36, 0.12, 0.45), f * 1.25);
  col = mix(col, vec3(0.55, 0.16, 0.40), q.x * q.x * 0.7);
  col = mix(col, uAccent * 0.30, q.y * 0.22);

  // marbled iridescent rivers along the flow contours
  float fil = pow(0.5 + 0.5 * sin(f * 14.0 - uFlow * 0.15), 10.0);
  vec3 neon = pal(fract(w.x * 0.8 + uFlow * 0.004));
  col += neon * fil * (0.40 + 0.7 * w.y) * (1.0 + 1.3 * uEnergy);

  // glowing ember crack-veins, like cooling lava seams
  float crackBase = fbm(s * 2.6 + 2.2 * w + 3.0);
  float vein = pow(0.5 + 0.5 * sin(crackBase * 18.0 + w.y * 4.0), 16.0);
  float flicker = 0.8 + (0.3 + 0.5 * uEnergy) * sin(uFlow * 0.8 + crackBase * 20.0);
  vec3 ember = mix(vec3(0.85, 0.10, 0.06), vec3(1.0, 0.62, 0.16), vein * flicker);
  col += ember * vein * flicker * (0.5 + 0.8 * q.x) * (1.0 + 1.6 * uEnergy);

  // frosted pale highlands with mineral texture
  float land = smoothstep(0.52, 0.62, fbm(s * 1.4 + 4.0 * q + 11.0));
  float rock = fbm(s * 7.0 + w * 2.0);
  vec3 frost = mix(vec3(0.52, 0.48, 0.66), vec3(0.84, 0.82, 0.91), rock * rock * 1.3);
  col = mix(col, frost, land * 0.85);
  // embers burn through at the highland edges
  col += ember * land * (1.0 - land) * 4.0 * vein * 1.6;

  // soft lighting from the upper right, like the reference
  float l = dot(vec3(p, z), normalize(vec3(0.25, 0.55, 0.80)));
  col *= 0.45 + 0.65 * clamp(l, 0.0, 1.0);

  // atmosphere rim + warm horizon glow at the top; brightens when awake
  float rim = pow(1.0 - z, 2.5);
  col += vec3(0.55, 0.30, 0.55) * rim * (0.35 + 0.4 * uEnergy);
  col += vec3(1.0, 0.55, 0.35) * rim * max(p.y, 0.0) * 0.45;
  col += uAccent * rim * uEnergy * 0.3;

  // slow whole-planet hue breathing
  col = hueShift(col, sin(uTime * 0.03) * 0.6);

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
      canvas.width = Math.max(1, Math.floor(size * dpr));
      canvas.height = Math.max(1, Math.floor(size * dpr));
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

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      // energy: keystroke bumps decay toward calm; excitement holds it high
      const floor = excitedRef.current ? 0.7 : 0;
      const e = Math.max(floor, floor + (energyRef.current - floor) * Math.exp(-dt / 0.9));
      energyRef.current = e;
      // typing makes the surface churn up to ~6x faster
      flowTime += dt * (1 + 5 * e);

      const [r, g, b] = hexToRgb(accentRef.current);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - start) / 1000 + 40.0);
      gl.uniform1f(uFlow, flowTime);
      gl.uniform1f(uEnergy, e);
      gl.uniform3f(uAccent, r, g, b);
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
