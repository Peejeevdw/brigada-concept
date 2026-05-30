import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export interface LavaOnlySettings {
  enabled: boolean;
  intensity: number;
  softness: number;
  speed: number;
  scale: number;
  blobCount: number;
  blur: number;
}

interface Props {
  /** Element the canvas is portaled into (also the size source). */
  target: HTMLElement | null;
  /** Source canvas to sample. Populated externally each frame. */
  sourceCanvasRef: React.RefObject<HTMLCanvasElement>;
  settings?: Partial<LavaOnlySettings>;
}

const MAX_BLOBS = 8;

const DEFAULTS: LavaOnlySettings = {
  enabled: true,
  intensity: 1,
  softness: 0.5,
  speed: 0.3,
  scale: 0.6,
  blobCount: 6,
  blur: 0,
};

const VS = `
attribute vec2 a_pos;
varying vec2 vUv;
void main(){ vUv = (a_pos + 1.0) * 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// Metaball "pull" of source pixels toward soft blob centroids, then sample.
// No palette remap, no mesh: the source canvas already contains the
// pre-colorized + wiped composite. We just distort it.
const FS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D u_image;
uniform vec2 u_blobs[${MAX_BLOBS}];
uniform float u_radii[${MAX_BLOBS}];
uniform int u_count;
uniform float u_softness;
uniform float u_pull;
uniform vec2 u_imageSize;
uniform vec2 u_canvasSize;

void main(){
  vec2 cssUv = vec2(vUv.x, 1.0 - vUv.y);

  float field = 0.0;
  vec2 pullTo = vec2(0.0);
  float wSum = 0.0;
  vec2 ar = vec2(u_canvasSize.x / max(u_canvasSize.y, 1.0), 1.0);
  for (int i = 0; i < ${MAX_BLOBS}; i++) {
    if (i >= u_count) break;
    vec2 c = u_blobs[i];
    vec2 d = (cssUv - c) * ar;
    float r = max(u_radii[i], 0.001);
    float dist2 = max(dot(d, d), 1e-5);
    float w = (r * r) / dist2;
    field += w;
    pullTo += c * w;
    wSum  += w;
  }
  vec2 centroid = wSum > 1e-5 ? pullTo / wSum : cssUv;
  float soft = clamp(u_softness, 0.0, 1.0);
  float lo = mix(0.20, 0.02, soft);
  float hi = mix(1.60, 0.60, soft);
  float pullAmt = clamp(u_pull * smoothstep(lo, hi, field), 0.0, 0.92);
  vec2 sampleUv = mix(cssUv, centroid, pullAmt);

  // Cover-fit the source canvas.
  float arImg = u_imageSize.x / max(u_imageSize.y, 1.0);
  float arCan = u_canvasSize.x / max(u_canvasSize.y, 1.0);
  vec2 imgUv = sampleUv;
  if (arCan > arImg) { float sY = arImg / arCan; imgUv.y = (sampleUv.y - 0.5) * sY + 0.5; }
  else               { float sX = arCan / arImg; imgUv.x = (sampleUv.x - 0.5) * sX + 0.5; }
  imgUv = clamp(imgUv, 0.0, 1.0);

  gl_FragColor = vec4(texture2D(u_image, imgUv).rgb, 1.0);
}
`;

/**
 * LavaOnlyOverlay
 *
 * Pure metaball/lava-lamp distortion pass. Reads pixels from a user-supplied
 * source canvas and pulls them toward animated blob centroids. No palette
 * mapping, no clustering, no mesh: meant to be layered on top of an already
 * fully-colorized composite.
 */
const LavaOnlyOverlay = ({ target, sourceCanvasRef, settings }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settingsRef = useRef<LavaOnlySettings>({ ...DEFAULTS, ...settings });
  settingsRef.current = { ...DEFAULTS, ...settings };

  // Procedural blob parameters: deterministic so the look is reproducible.
  const blobParams = useRef(
    Array.from({ length: MAX_BLOBS }, (_, i) => {
      const rand = (s: number) => {
        const x = Math.sin(s * 9301 + 49297) * 233280;
        return x - Math.floor(x);
      };
      return {
        baseX: 0.2 + rand(i + 1) * 0.6,
        baseY: 0.2 + rand(i + 7) * 0.6,
        ampX: 0.08 + rand(i + 13) * 0.10,
        ampY: 0.08 + rand(i + 19) * 0.10,
        freqX: 0.18 + rand(i + 23) * 0.25,
        freqY: 0.22 + rand(i + 29) * 0.25,
        phaseX: rand(i + 37) * Math.PI * 2,
        phaseY: rand(i + 41) * Math.PI * 2,
        radiusSeed: 0.7 + rand(i + 31) * 0.6,
      };
    }),
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !target) return;
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: true });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(sh));
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("LavaOnlyOverlay link failed:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = {
      image: gl.getUniformLocation(prog, "u_image"),
      blobs: gl.getUniformLocation(prog, "u_blobs"),
      radii: gl.getUniformLocation(prog, "u_radii"),
      count: gl.getUniformLocation(prog, "u_count"),
      softness: gl.getUniformLocation(prog, "u_softness"),
      pull: gl.getUniformLocation(prog, "u_pull"),
      imageSize: gl.getUniformLocation(prog, "u_imageSize"),
      canvasSize: gl.getUniformLocation(prog, "u_canvasSize"),
    };

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));

    let imageSize: [number, number] = [1, 1];

    const resize = () => {
      const r = target.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.max(2, Math.round(r.width * dpr));
      canvas.height = Math.max(2, Math.round(r.height * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(target);

    let raf = 0;
    let simTime = 0;
    let last = performance.now();
    const blobArr = new Float32Array(MAX_BLOBS * 2);
    const radArr = new Float32Array(MAX_BLOBS);

    // Pause the loop when the host target is offscreen.
    let visible = true;
    const io = new IntersectionObserver(
      (entries) => {
        const wasVisible = visible;
        visible = entries.some((e) => e.isIntersecting);
        if (visible && !wasVisible && raf === 0) {
          last = performance.now();
          raf = requestAnimationFrame(loop);
        } else if (!visible && wasVisible) {
          if (raf) cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(target);

    const loop = (now: number) => {
      if (!visible) { raf = 0; return; }
      const dt = (now - last) / 1000;
      last = now;
      const s = settingsRef.current;
      if (s.enabled && s.speed > 0) simTime += dt * (0.15 + s.speed * 1.6);

      const srcCanvas = sourceCanvasRef.current;
      if (srcCanvas && srcCanvas.width > 0 && srcCanvas.height > 0) {
        imageSize = [srcCanvas.width, srcCanvas.height];
        gl.bindTexture(gl.TEXTURE_2D, tex);
        try {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcCanvas);
        } catch {
          /* not ready */
        }
      }

      const count = Math.max(3, Math.min(MAX_BLOBS, Math.round(s.blobCount)));
      const sizeFactor = 0.18 + s.scale * 0.32;
      for (let i = 0; i < MAX_BLOBS; i++) {
        const p = blobParams.current[i];
        const x = p.baseX + Math.sin(simTime * p.freqX + p.phaseX) * p.ampX;
        const y = p.baseY + Math.sin(simTime * p.freqY + p.phaseY) * p.ampY;
        blobArr[i * 2] = x;
        blobArr[i * 2 + 1] = y;
        radArr[i] = sizeFactor * p.radiusSeed;
      }

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(u.image, 0);
      gl.uniform2fv(u.blobs, blobArr);
      gl.uniform1fv(u.radii, radArr);
      gl.uniform1i(u.count, count);
      gl.uniform1f(u.softness, s.softness);
      gl.uniform1f(u.pull, 0.85 * Math.max(0, Math.min(2, s.intensity)));
      gl.uniform2f(u.imageSize, imageSize[0], imageSize[1]);
      gl.uniform2f(u.canvasSize, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, [target, sourceCanvasRef]);

  if (!target) return null;
  return createPortal(
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    />,
    target,
  );
};

export default LavaOnlyOverlay;
