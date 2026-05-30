import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export interface LavaLampSettings {
  enabled: boolean;
  intensity: number;
  softness: number;
  speed: number;
  scale: number;
  blobCount: number;
  blur: number;
}

interface Props {
  /** Element the canvas is portaled into (also the size-source). */
  target: HTMLElement | null;
  /** Live source canvas (already populated by parent each frame). */
  sourceCanvasRef: React.RefObject<HTMLCanvasElement>;
  /** Hex stops sorted by luminance shadow → highlight (4..8 entries). */
  stopsRef: React.RefObject<string[]>;
  settings?: Partial<LavaLampSettings>;
}

const MAX_BLOBS = 8;
const MAX_STOPS = 8;

const DEFAULTS: LavaLampSettings = {
  enabled: true,
  intensity: 1,
  softness: 0,
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

// Variable-length palette mapping (N stops with explicit luminance positions).
const FS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D u_image;
uniform vec2 u_blobs[${MAX_BLOBS}];
uniform float u_radii[${MAX_BLOBS}];
uniform int u_count;
uniform float u_softness;
uniform float u_pull;
uniform vec3 u_stops[${MAX_STOPS}];
uniform float u_stopPos[${MAX_STOPS}];
uniform int u_stopCount;
uniform vec2 u_imageSize;
uniform vec2 u_canvasSize;

vec3 paletteMap(float x){
  vec3 result = u_stops[0];
  if (u_stopCount <= 1) return result;
  if (x <= u_stopPos[0]) return u_stops[0];
  bool found = false;
  for (int i = 0; i < ${MAX_STOPS - 1}; i++) {
    if (i + 1 >= u_stopCount) {
      if (!found) result = u_stops[i];
      break;
    }
    float p0 = u_stopPos[i];
    float p1 = u_stopPos[i + 1];
    if (!found && x <= p1) {
      float span = max(p1 - p0, 1e-5);
      result = mix(u_stops[i], u_stops[i + 1], (x - p0) / span);
      found = true;
    }
  }
  return result;
}

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

  // Cover-fit the source canvas (canvas covers viewport).
  float arImg = u_imageSize.x / max(u_imageSize.y, 1.0);
  float arCan = u_canvasSize.x / max(u_canvasSize.y, 1.0);
  vec2 imgUv = sampleUv;
  if (arCan > arImg) { float sY = arImg / arCan; imgUv.y = (sampleUv.y - 0.5) * sY + 0.5; }
  else               { float sX = arCan / arImg; imgUv.x = (sampleUv.x - 0.5) * sX + 0.5; }
  imgUv = clamp(imgUv, 0.0, 1.0);

  vec4 src = texture2D(u_image, imgUv);
  float lum = dot(src.rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 tinted = paletteMap(lum);
  gl_FragColor = vec4(tinted, 1.0);
}
`;

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f0-9]{6})$/i.exec(hex || "");
  if (!m) return [0.12, 0.11, 0.09];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const FootageLavaOverlay = ({
  target,
  sourceCanvasRef,
  stopsRef,
  settings,
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settingsRef = useRef<LavaLampSettings>({ ...DEFAULTS, ...settings });
  settingsRef.current = { ...DEFAULTS, ...settings };

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
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: true, preserveDrawingBuffer: false });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(sh));
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("FootageLavaOverlay link failed:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
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
      stops: gl.getUniformLocation(prog, "u_stops"),
      stopPos: gl.getUniformLocation(prog, "u_stopPos"),
      stopCount: gl.getUniformLocation(prog, "u_stopCount"),
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

    // Pause the WebGL loop when the target (Hero) is offscreen.
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
      { rootMargin: "100px" },
    );
    io.observe(target);

    let raf = 0;
    let simTime = 0;
    let last = performance.now();
    const blobArr = new Float32Array(MAX_BLOBS * 2);
    const radArr = new Float32Array(MAX_BLOBS);
    const stopsArr = new Float32Array(MAX_STOPS * 3);
    const stopPosArr = new Float32Array(MAX_STOPS);

    const loop = (now: number) => {
      if (!visible) { raf = 0; return; }
      const dt = (now - last) / 1000; last = now;
      const s = settingsRef.current;
      if (s.enabled && s.speed > 0) simTime += dt * (0.15 + s.speed * 1.6);

      // Upload the live source canvas each frame.
      const srcCanvas = sourceCanvasRef.current;
      if (srcCanvas && srcCanvas.width > 0 && srcCanvas.height > 0) {
        imageSize = [srcCanvas.width, srcCanvas.height];
        gl.bindTexture(gl.TEXTURE_2D, tex);
        try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcCanvas); }
        catch { /* not ready */ }
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

      const stopList = stopsRef.current ?? [];
      const n = Math.max(2, Math.min(MAX_STOPS, stopList.length || 2));
      for (let i = 0; i < n; i++) {
        const [r, g, b] = hexToRgb(stopList[i] ?? "#1F1B16");
        stopsArr[i * 3] = r;
        stopsArr[i * 3 + 1] = g;
        stopsArr[i * 3 + 2] = b;
        // Even luminance positions across [0,1].
        stopPosArr[i] = n === 1 ? 0.5 : i / (n - 1);
      }
      for (let i = n; i < MAX_STOPS; i++) {
        stopsArr[i * 3] = stopsArr[(n - 1) * 3];
        stopsArr[i * 3 + 1] = stopsArr[(n - 1) * 3 + 1];
        stopsArr[i * 3 + 2] = stopsArr[(n - 1) * 3 + 2];
        stopPosArr[i] = 1.0;
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
      gl.uniform1f(u.pull, 0.85);
      gl.uniform3fv(u.stops, stopsArr);
      gl.uniform1fv(u.stopPos, stopPosArr);
      gl.uniform1i(u.stopCount, n);
      gl.uniform2f(u.imageSize, imageSize[0], imageSize[1]);
      gl.uniform2f(u.canvasSize, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = visible ? requestAnimationFrame(loop) : 0;
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
  }, [target, sourceCanvasRef, stopsRef]);

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

export default FootageLavaOverlay;
