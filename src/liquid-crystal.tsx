import React, { useRef, useEffect } from 'react';

// Props interface for the InteractiveShader component
interface ShaderProps {
  flowSpeed?: number;
  colorIntensity?: number;
  noiseLayers?: number;
  mouseInfluence?: number;
}

// The core component responsible for rendering the WebGL shader
const InteractiveShader: React.FC<ShaderProps> = ({
  flowSpeed = 1.3,
  colorIntensity = 3.0,
  noiseLayers = 4.0,
  mouseInfluence = 0.0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePos = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) {
      console.error("WebGL is not supported in this browser.");
      return;
    }

    // --- Shader Sources ---
    const vertexShaderSource = `
      attribute vec2 aPosition;
      void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    // This fragment shader uses ray marching to render a volumetric aurora effect.
    const fragmentShaderSource = `
      precision highp float;
      uniform vec2 iResolution;
      uniform float iTime;
      uniform vec2 iMouse;
      uniform float uFlowSpeed;
      uniform float uColorIntensity;
      uniform float uNoiseLayers;
      uniform float uMouseInfluence;

      #define MARCH_STEPS 32

      // --- UTILITY & NOISE FUNCTIONS ---
      // 2D rotation matrix.
      mat2 rot(float a) {
          float s=sin(a), c=cos(a);
          return mat2(c, -s, s, c);
      }

      // Pseudo-random value generator.
      float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p+45.32);
          return fract(p.x*p.y);
      }

      // 3D Fractal Brownian Motion (FBM) for volumetric noise.
      float fbm(vec3 p) {
          float f = 0.0;
          float amp = 0.5;
          for (int i = 0; i < 8; i++) {
              if (float(i) >= uNoiseLayers) break;
              f += amp * hash(p.xy);
              p *= 2.0;
              amp *= 0.5;
          }
          return f;
      }

      // --- SCENE MAPPING ---
      // This function defines the density of the volume at a given point.
      float map(vec3 p) {
          vec3 q = p;
          // Fixed at the beautiful state (no time animation)
          q.z += 4.0; // Fixed offset equivalent to the beautiful moment
          // Mouse interaction: warp the space around the cursor.
          vec2 mouse = (iMouse.xy / iResolution.xy - 0.5) * 2.0;
          q.xy += mouse * uMouseInfluence;

          // Generate the base volumetric noise.
          float f = fbm(q * 2.0);

          // Carve out the aurora shape using sine waves - fixed at beautiful state
          f *= sin(p.y * 2.0 + 4.0) * 0.5 + 0.5;

          return clamp(f, 0.0, 1.0);
      }

      void main() {
        // --- UV & CAMERA SETUP ---
        vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
        vec3 ro = vec3(0, -1, 0); // Ray origin (camera position)
        vec3 rd = normalize(vec3(uv, 1.0)); // Ray direction

        // --- VOLUMETRIC RAY MARCHING ---
        vec3 col = vec3(0);
        float t = 0.0; // Distance traveled along the ray.

        // Fixed at the beautiful state - no time animation
        float fixedTime = 4.0; // Equivalent to the beautiful moment

        for (int i=0; i<MARCH_STEPS; i++) {
            vec3 p = ro + rd * t;

            // Get the density from our volume map.
            float density = map(p);

            // Bright blue color palette - all bright, no dark tones
            vec3 brightBlue1 = vec3(0.4, 0.8, 1.0);     // Bright blue
            vec3 brightBlue2 = vec3(0.2, 0.9, 1.0);     // Bright cyan-blue
            vec3 brightBlue3 = vec3(0.3, 0.7, 1.0);     // Bright sky blue
            vec3 brandBlue = vec3(0.0118, 0.749, 0.953); // #03BFF3 brand color

            // Fixed color transitions at the beautiful state
            float colorPhase = sin(fixedTime * 0.3 + p.y * 1.5) * 0.5 + 0.5;
            float colorPhase2 = sin(fixedTime * 0.4 + p.x * 1.2) * 0.5 + 0.5;
            float colorPhase3 = sin(fixedTime * 0.35 + p.z * 0.8) * 0.5 + 0.5;

            // Mix between different bright blue shades including brand color
            vec3 auroraColor = mix(brightBlue1, brightBlue2, colorPhase);
            auroraColor = mix(auroraColor, brightBlue3, colorPhase2 * 0.6);
            auroraColor = mix(auroraColor, brandBlue, colorPhase3 * 0.5);

            // Make it bright at the top for better visual hierarchy
            float topBrightness = smoothstep(0.5, -1.0, uv.y); // Bright at top, dimmer at bottom

            // Use density but ensure minimum brightness to prevent black - reduced noise level
            float adjustedDensity = max(density * 0.46, 0.05 + 0.15 * topBrightness); // Reduced noise (0.5 instead of 0.8)
            col += auroraColor * adjustedDensity * 0.17 * uColorIntensity; // Sweet spot between 0.15 and 0.2

            // Step forward through the volume.
            t += 0.1;
        }

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    // --- WebGL Setup (Boilerplate) ---
    const compileShader = (source: string, type: number): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(`Shader compile error: ${gl.getShaderInfoLog(shader)}`);
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(`Program linking error: ${gl.getProgramInfoLog(program)}`);
      return;
    }
    gl.useProgram(program);

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const iResolutionLocation = gl.getUniformLocation(program, "iResolution");
    const iTimeLocation = gl.getUniformLocation(program, "iTime");
    const iMouseLocation = gl.getUniformLocation(program, "iMouse");
    const uFlowSpeedLocation = gl.getUniformLocation(program, "uFlowSpeed");
    const uColorIntensityLocation = gl.getUniformLocation(program, "uColorIntensity");
    const uNoiseLayersLocation = gl.getUniformLocation(program, "uNoiseLayers");
    const uMouseInfluenceLocation = gl.getUniformLocation(program, "uMouseInfluence");

    // --- Animation and Interaction ---
    const startTime = performance.now();
    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        mousePos.current = {
            x: (e.clientX - rect.left) / rect.width,
            y: (e.clientY - rect.top) / rect.height
        };
    };
    window.addEventListener('mousemove', handleMouseMove);

    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.uniform2f(iResolutionLocation, gl.canvas.width, gl.canvas.height);
    };
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    const renderLoop = () => {
      if (!gl || gl.isContextLost()) return;

      const currentTime = performance.now();
      gl.uniform1f(iTimeLocation, (currentTime - startTime) / 1000.0);

      gl.uniform2f(iMouseLocation, mousePos.current.x * canvas.width, (1.0 - mousePos.current.y) * canvas.height);
      gl.uniform1f(uFlowSpeedLocation, flowSpeed);
      gl.uniform1f(uColorIntensityLocation, colorIntensity);
      gl.uniform1f(uNoiseLayersLocation, noiseLayers);
      gl.uniform1f(uMouseInfluenceLocation, mouseInfluence);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationFrameId = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    // Cleanup function to prevent memory leaks
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      if (gl && !gl.isContextLost()) {
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        gl.deleteBuffer(vertexBuffer);
      }
    };
  }, [flowSpeed, colorIntensity, noiseLayers, mouseInfluence]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'block'
      }}
    />
  );
};

export const LiquidCrystalBackground = () => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: -1,
      pointerEvents: 'none'
    }}>
      <InteractiveShader
        flowSpeed={3.0}
        colorIntensity={1.0}
        noiseLayers={4.0}
        mouseInfluence={0.0}
      />
    </div>
  );
};