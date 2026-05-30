/**
 * BrioWebGLOverlay
 *
 * Unified WebGL pipeline for the /v3 preview. Replaces the SVG filter chain,
 * Canvas2D cluster pass, SVG grain overlay and CSS tone tint with one canvas
 * sampling the live <video>/<img> element rendered inside `target`.
 *
 * Effect chain (single fragment shader):
 *   source -> crop/zoom -> warp+liquify displacement -> sample -> cluster
 *          -> contrast -> luminance -> palette (quadtone LUT or duotone)
 *          -> grain -> tone overlay
 *
 * Blur is applied beforehand via a separable 2-pass gaussian into an FBO
 * when `settings.blur > 0`. Otherwise the source is sampled directly.
 */

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  duotoneToTintMatrix,
  type BrioSettings,
  type BrioThresholds,
  type Duotone,
  type Quadtone,
} from "@/data/duotones";

export interface BrioWebGLLavaSettings {
  enabled: boolean;
  intensity: number;
  softness: number;
  speed: number;
  scale: number;
  blobCount: number;
  blur: number;
}

export interface BrioWebGLOverlayProps {
  target: HTMLElement | null;
  amount: number; // 0..1
  settings: BrioSettings;
  quadtone: Quadtone | null;
  duotone: Duotone | null;
  cropX: number;
  cropY: number;
  cropSize: number;
  zoom: number;
  overlay: "none" | "dark" | "light";
  /** Mesh (gradient-mesh) mode. K control points placed inside their own
   *  colour zones, blended with a Cauchy kernel per fragment.
   *  `colors` is kept as a deprecated alias for `points`. */
  cluster?: {
    enabled: boolean;
    colors?: number;
    points?: number;
    /** 0..1 normalized. Maps to Cauchy power, low = soft gradient, high = near-Voronoi. */
    sharpness?: number;
    /** 0..1 saturation boost applied to mesh point colors. 0 = source, 1 = fully saturated. */
    vibrance?: number;
    /** When provided, mesh points use these hex colors (mapped by luminance)
     *  instead of footage-extracted colors. K is forced to the palette length. */
    paletteColors?: string[];
  };
  lava?: BrioWebGLLavaSettings;
  onClusterColors?: (colors: string[]) => void;
  className?: string;
}

const VS = `
attribute vec2 a_pos;
varying vec2 vUv;
void main(){ vUv = (a_pos + 1.0) * 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// Simplex noise (Ashima) reused from LiquidFlowOverlay for warp/liquify.
const NOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
float snoise(vec2 v){
  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i=floor(v+dot(v,C.yy));
  vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1;
  i=mod289(i);
  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
  m=m*m; m=m*m;
  vec3 x=2.0*fract(p*C.www)-1.0;
  vec3 h=abs(x)-0.5;
  vec3 ox=floor(x+0.5);
  vec3 a0=x-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
  vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.0*dot(m,g);
}
`;

// Separable 9-tap gaussian blur. u_dir is (1/w,0) horizontal or (0,1/h) vertical.
const BLUR_FS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D u_src;
uniform vec2 u_dir;
uniform float u_radius;
void main(){
  vec4 sum = vec4(0.0);
  // Gaussian weights for 9 taps (sigma ~ 2).
  float w[5];
  w[0] = 0.2270270270; w[1] = 0.1945945946; w[2] = 0.1216216216;
  w[3] = 0.0540540541; w[4] = 0.0162162162;
  sum += texture2D(u_src, vUv) * w[0];
  for (int i = 1; i < 5; i++) {
    vec2 off = u_dir * (float(i) * u_radius);
    sum += texture2D(u_src, vUv + off) * w[i];
    sum += texture2D(u_src, vUv - off) * w[i];
  }
  gl_FragColor = sum;
}
`;

const MAIN_FS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D u_image;     // (possibly blurred) source
uniform vec2 u_imageSize;
uniform vec2 u_canvasSize;
uniform vec4 u_crop;           // cropX, cropY, cropSize, zoom
uniform float u_time;
// Warp / liquify
uniform float u_warp;          // 0..2
uniform float u_liquify;       // 0..2
// Color
uniform float u_desat;         // 0..1
uniform float u_contrast;      // 0..1
// Palette mode: 0 = passthrough, 1 = quadtone, 2 = duotone
uniform int u_paletteMode;
uniform vec3 u_stops[4];
uniform float u_thresh[6];
uniform vec4 u_duoScale;       // rgb scale + unused
uniform vec4 u_duoOffset;      // rgb offset + unused
// Mesh (gradient-mesh) — Cauchy soft blend of N control points.
uniform int u_meshEnabled;
uniform int u_meshCount;
uniform float u_meshPower;
uniform float u_meshProgress;       // 0..1, crossfade prev -> next point set
uniform vec2 u_meshPosA[16];
uniform vec2 u_meshPosB[16];
uniform float u_meshSigA[16];
uniform float u_meshSigB[16];
uniform vec3 u_meshColA[16];
uniform vec3 u_meshColB[16];
// Grain / overlay
uniform float u_grain;         // 0..2
uniform int u_toneMode;        // 0 none, 1 dark, 2 light
// Lava lamp metaball pass (post-grade, pre-grain).
uniform int u_lavaEnabled;
uniform int u_lavaCount;
uniform vec2 u_lavaBlobs[8];
uniform float u_lavaRadii[8];
uniform float u_lavaSoftness;
uniform float u_lavaPull;
${NOISE}

vec3 paletteQuad(float x){
  if (x <= u_thresh[0]) return u_stops[0];
  if (x <  u_thresh[1]) {
    float span = max(u_thresh[1] - u_thresh[0], 1e-5);
    return mix(u_stops[0], u_stops[1], (x - u_thresh[0]) / span);
  }
  if (x <= u_thresh[2]) return u_stops[1];
  if (x <  u_thresh[3]) {
    float span = max(u_thresh[3] - u_thresh[2], 1e-5);
    return mix(u_stops[1], u_stops[2], (x - u_thresh[2]) / span);
  }
  if (x <= u_thresh[4]) return u_stops[2];
  if (x <  u_thresh[5]) {
    float span = max(u_thresh[5] - u_thresh[4], 1e-5);
    return mix(u_stops[2], u_stops[3], (x - u_thresh[4]) / span);
  }
  return u_stops[3];
}

float overlayChan(float base, float over){
  return base < 0.5 ? (2.0*base*over) : (1.0 - 2.0*(1.0-base)*(1.0-over));
}

float hash(vec2 p){
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}

// Gradient-mesh blend — per point Cauchy weight w = (sigma/(d+sigma))^power.
// Positions are in source-image uv; sigma in same units. Crossfades both prev
// and next point sets so palette changes ease over the tempo cadence.
vec3 mesh(vec3 col, vec2 uv){
  if (u_meshEnabled == 0 || u_meshCount <= 0) return col;
  float t = clamp(u_meshProgress, 0.0, 1.0);
  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  vec3 nearestCol = col;
  float maxW = -1.0;
  for (int i = 0; i < 16; i++) {
    if (i >= u_meshCount) break;
    vec2 p = mix(u_meshPosA[i], u_meshPosB[i], t);
    float sig = mix(u_meshSigA[i], u_meshSigB[i], t);
    vec3 c = mix(u_meshColA[i], u_meshColB[i], t);
    vec2 dv = uv - p;
    float dist = sqrt(dot(dv, dv));
    float w = pow(sig / (dist + sig + 1e-5), u_meshPower);
    acc += w * c;
    wsum += w;
    if (w > maxW) { maxW = w; nearestCol = c; }
  }
  return wsum > 1e-12 ? acc / wsum : nearestCol;
}

void main(){
  vec2 cssUv = vec2(vUv.x, 1.0 - vUv.y);

  // Lava lamp metaball field (computed in canvas-uv space).
  float lavaField = 0.0;
  vec2 lavaCentroid = cssUv;
  if (u_lavaEnabled == 1) {
    vec2 ar = vec2(u_canvasSize.x / max(u_canvasSize.y, 1.0), 1.0);
    vec2 pullTo = vec2(0.0);
    float wSum = 0.0;
    for (int i = 0; i < 8; i++) {
      if (i >= u_lavaCount) break;
      vec2 c = u_lavaBlobs[i];
      vec2 d = (cssUv - c) * ar;
      float r = max(u_lavaRadii[i], 0.001);
      float dist2 = max(dot(d, d), 1e-5);
      float w = (r * r) / dist2;
      lavaField += w;
      pullTo += c * w;
      wSum += w;
    }
    lavaCentroid = wSum > 1e-5 ? pullTo / wSum : cssUv;
    float pullAmt = clamp(u_lavaPull * smoothstep(0.2, 1.6, lavaField), 0.0, 0.85);
    cssUv = mix(cssUv, lavaCentroid, pullAmt);
  }

  // Map canvas uv to source uv via crop/zoom (matches LavaLamp/LiquidFlow).
  float cropScale = max(0.01, 1.25 * max(u_crop.w, 0.5) / max(u_crop.z, 0.05));
  vec2 uv = (cssUv - 0.5) / cropScale + u_crop.xy;
  float arImg = u_imageSize.x / max(u_imageSize.y, 1.0);
  float arCan = u_canvasSize.x / max(u_canvasSize.y, 1.0);
  vec2 imgUv = uv;
  if (arCan > arImg) { float sY = arImg / arCan; imgUv.y = (uv.y - 0.5) * sY + 0.5; }
  else               { float sX = arCan / arImg; imgUv.x = (uv.x - 0.5) * sX + 0.5; }

  // Liquify: slow, large-scale low-freq displacement.
  if (u_liquify > 0.001) {
    float tA = u_time * 0.10, tB = u_time * 0.13;
    vec2 p = imgUv * 1.5;
    vec2 q = vec2(snoise(p + tA), snoise(p + vec2(5.2,1.3) + tB));
    vec2 r = vec2(
      snoise(p + 4.0 * q + vec2(1.7,9.2) + tA*1.15),
      snoise(p + 4.0 * q + vec2(8.3,2.8) + tB*1.26)
    );
    imgUv += r * 0.12 * u_liquify;
  }
  // Warp: high-frequency hash-noise displacement (cheap, matches feTurbulence vibe).
  if (u_warp > 0.001) {
    float n1 = snoise(imgUv * 60.0 + u_time * 0.3);
    float n2 = snoise(imgUv * 60.0 + vec2(7.0,3.0) + u_time * 0.3);
    imgUv += vec2(n1, n2) * 0.008 * u_warp;
  }
  imgUv = clamp(imgUv, 0.0, 1.0);

  vec3 col = texture2D(u_image, imgUv).rgb;

  // Gradient-mesh blend (replaces the previous cluster-quantize Voronoi snap).
  col = mesh(col, imgUv);

  // Contrast around mid-gray.
  if (u_contrast > 0.001) {
    float c = 1.0 + 7.0 * u_contrast;
    col = clamp((col - 0.5) * c + 0.5, 0.0, 1.0);
  }

  // Palette mapping.
  if (u_paletteMode == 1) {
    // Quadtone via luminance LUT (collapsed to gray, remapped).
    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    vec3 mapped = paletteQuad(lum);
    col = mix(col, mapped, clamp(u_desat, 0.0, 1.0));
  } else if (u_paletteMode == 2) {
    // Duotone: per-channel scale + offset (matches duotoneToTintMatrix).
    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    vec3 gray = vec3(lum);
    vec3 base = mix(col, gray, clamp(u_desat, 0.0, 1.0));
    vec3 tinted = base * u_duoScale.rgb + u_duoOffset.rgb;
    col = clamp(tinted, 0.0, 1.0);
  }

  // Lava lamp background: keep the pulled source sample everywhere so the
  // off-blob area becomes duplicated edge pixels instead of a solid fill.


  // Grain (procedural noise, overlay blend).
  if (u_grain > 0.001) {
    float n = hash(gl_FragCoord.xy + vec2(u_time * 60.0));
    float strength = clamp(u_grain, 0.0, 2.0) * 0.45;
    vec3 g3 = vec3(n);
    vec3 blended = vec3(
      overlayChan(col.r, g3.r),
      overlayChan(col.g, g3.g),
      overlayChan(col.b, g3.b)
    );
    col = mix(col, blended, strength);
  }

  // Tone overlay.
  if (u_toneMode == 1) col = mix(col, vec3(0.0), 0.2);
  else if (u_toneMode == 2) col = mix(col, vec3(1.0), 0.2);

  gl_FragColor = vec4(col, 1.0);
}
`;

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f0-9]{6})$/i.exec(hex || "");
  if (!m) return [0.12, 0.11, 0.09];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const DEFAULT_THRESH: BrioThresholds = [0.2, 0.3, 0.45, 0.55, 0.7, 0.8];

const BrioWebGLOverlay = ({
  target,
  amount,
  settings,
  quadtone,
  duotone,
  cropX,
  cropY,
  cropSize,
  zoom,
  overlay,
  cluster,
  lava,
  onClusterColors,
  className,
}: BrioWebGLOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onClusterColorsRef = useRef(onClusterColors);
  onClusterColorsRef.current = onClusterColors;
  const stateRef = useRef({
    amount, settings, quadtone, duotone, cropX, cropY, cropSize, zoom, overlay, cluster, lava,
  });
  stateRef.current = { amount, settings, quadtone, duotone, cropX, cropY, cropSize, zoom, overlay, cluster, lava };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !target) return;
    const gl = canvas.getContext("webgl", {
      premultipliedAlpha: true,
      antialias: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("BrioWebGLOverlay shader:", gl.getShaderInfoLog(sh));
      }
      return sh;
    };
    const link = (vs: string, fs: string) => {
      const p = gl.createProgram()!;
      gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error("BrioWebGLOverlay link:", gl.getProgramInfoLog(p));
      }
      return p;
    };
    const blurProg = link(VS, BLUR_FS);
    const mainProg = link(VS, MAIN_FS);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const bindQuad = (prog: WebGLProgram) => {
      const aPos = gl.getAttribLocation(prog, "a_pos");
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    };

    // Source texture + ping-pong FBOs for blur.
    const makeTex = (w: number, h: number) => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      return t;
    };
    const srcTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, srcTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255]));

    let fboW = 0, fboH = 0;
    let texA: WebGLTexture | null = null, texB: WebGLTexture | null = null;
    let fboA: WebGLFramebuffer | null = null, fboB: WebGLFramebuffer | null = null;
    const ensureFbos = (w: number, h: number) => {
      if (w === fboW && h === fboH && texA && texB) return;
      if (texA) gl.deleteTexture(texA);
      if (texB) gl.deleteTexture(texB);
      if (fboA) gl.deleteFramebuffer(fboA);
      if (fboB) gl.deleteFramebuffer(fboB);
      texA = makeTex(w, h);
      texB = makeTex(w, h);
      fboA = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboA);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texA, 0);
      fboB = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fboB);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texB, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      fboW = w; fboH = h;
    };

    // Find live source element inside target (mirrors LavaLampOverlay).
    // Also picks up `<canvas data-brio-source>` so external composers can feed
    // a hand-drawn frame (e.g. a wipe between two case stills) through the
    // same pipeline.
    const findSource = (): HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | null => {
      const cans = target.querySelectorAll<HTMLCanvasElement>("canvas[data-brio-source]");
      for (let i = cans.length - 1; i >= 0; i--) {
        const c = cans[i];
        if (c.width > 0 && c.height > 0) return c;
      }
      const vids = target.querySelectorAll<HTMLVideoElement>("video");
      for (let i = vids.length - 1; i >= 0; i--) {
        const v = vids[i];
        if (v.readyState >= 2 && v.videoWidth > 0) return v;
      }
      const imgs = target.querySelectorAll<HTMLImageElement>("img");
      for (let i = imgs.length - 1; i >= 0; i--) {
        const im = imgs[i];
        if (im.complete && im.naturalWidth > 0) return im;
      }
      return null;
    };

    const resize = () => {
      const r = target.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.max(2, Math.round(r.width * dpr));
      canvas.height = Math.max(2, Math.round(r.height * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(target);

    // Pause the render loop when the target is offscreen.
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

    // Uniforms cache.
    const uBlur = {
      src: gl.getUniformLocation(blurProg, "u_src"),
      dir: gl.getUniformLocation(blurProg, "u_dir"),
      radius: gl.getUniformLocation(blurProg, "u_radius"),
    };
    const uMain = {
      image: gl.getUniformLocation(mainProg, "u_image"),
      imageSize: gl.getUniformLocation(mainProg, "u_imageSize"),
      canvasSize: gl.getUniformLocation(mainProg, "u_canvasSize"),
      crop: gl.getUniformLocation(mainProg, "u_crop"),
      time: gl.getUniformLocation(mainProg, "u_time"),
      warp: gl.getUniformLocation(mainProg, "u_warp"),
      liquify: gl.getUniformLocation(mainProg, "u_liquify"),
      desat: gl.getUniformLocation(mainProg, "u_desat"),
      contrast: gl.getUniformLocation(mainProg, "u_contrast"),
      paletteMode: gl.getUniformLocation(mainProg, "u_paletteMode"),
      stops: gl.getUniformLocation(mainProg, "u_stops"),
      thresh: gl.getUniformLocation(mainProg, "u_thresh"),
      duoScale: gl.getUniformLocation(mainProg, "u_duoScale"),
      duoOffset: gl.getUniformLocation(mainProg, "u_duoOffset"),
      meshEnabled: gl.getUniformLocation(mainProg, "u_meshEnabled"),
      meshCount: gl.getUniformLocation(mainProg, "u_meshCount"),
      meshPower: gl.getUniformLocation(mainProg, "u_meshPower"),
      meshProgress: gl.getUniformLocation(mainProg, "u_meshProgress"),
      meshPosA: gl.getUniformLocation(mainProg, "u_meshPosA"),
      meshPosB: gl.getUniformLocation(mainProg, "u_meshPosB"),
      meshSigA: gl.getUniformLocation(mainProg, "u_meshSigA"),
      meshSigB: gl.getUniformLocation(mainProg, "u_meshSigB"),
      meshColA: gl.getUniformLocation(mainProg, "u_meshColA"),
      meshColB: gl.getUniformLocation(mainProg, "u_meshColB"),
      grain: gl.getUniformLocation(mainProg, "u_grain"),
      toneMode: gl.getUniformLocation(mainProg, "u_toneMode"),
      lavaEnabled: gl.getUniformLocation(mainProg, "u_lavaEnabled"),
      lavaCount: gl.getUniformLocation(mainProg, "u_lavaCount"),
      lavaBlobs: gl.getUniformLocation(mainProg, "u_lavaBlobs"),
      lavaRadii: gl.getUniformLocation(mainProg, "u_lavaRadii"),
      lavaSoftness: gl.getUniformLocation(mainProg, "u_lavaSoftness"),
      lavaPull: gl.getUniformLocation(mainProg, "u_lavaPull"),
    };

    // Mesh point extraction state (computed in JS, uploaded as uniforms).
    // Sample grid is small so K-means++ + Lloyd iters stay cheap; tempo cadence
    // throttles how often this re-runs.
    const SAMPLE_W = 96;
    let sampleH = 54;
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = SAMPLE_W; sampleCanvas.height = sampleH;
    const sctx = sampleCanvas.getContext("2d", { willReadFrequently: true });
    type MeshPoint = { x: number; y: number; r: number; g: number; b: number; sigma: number };
    const seedMeshPoints = (K: number): MeshPoint[] => {
      const out: MeshPoint[] = [];
      for (let k = 0; k < K; k++) {
        const v = K === 1 ? 0.5 : k / (K - 1);
        out.push({ x: 0.5, y: 0.5, r: v, g: v, b: v, sigma: 0.25 });
      }
      return out;
    };
    let meshPoints: MeshPoint[] = seedMeshPoints(4);
    let prevMeshPoints: MeshPoint[] = seedMeshPoints(4);
    let lastK = 4;
    let clusterLastUpdate = -1;
    let clusterLastK = -1;
    let clusterLastVib = -1;
    let clusterLastPaletteKey = "";
    let clusterLastCropKey = "";
    const meshPosBufA = new Float32Array(16 * 2);
    const meshPosBufB = new Float32Array(16 * 2);
    const meshSigBufA = new Float32Array(16);
    const meshSigBufB = new Float32Array(16);
    const meshColBufA = new Float32Array(16 * 3);
    const meshColBufB = new Float32Array(16 * 3);

    // Lava-lamp blob params (mirrors LavaLampOverlay sin/cos motion).
    const MAX_BLOBS = 8;
    const lavaParams = Array.from({ length: MAX_BLOBS }, (_, i) => {
      const rand = (s: number) => {
        const x = Math.sin(s * 9301 + 49297) * 233280;
        return x - Math.floor(x);
      };
      return {
        baseX: 0.2 + rand(i + 1) * 0.6,
        baseY: 0.2 + rand(i + 7) * 0.6,
        ampX: 0.18 + rand(i + 13) * 0.18,
        ampY: 0.20 + rand(i + 19) * 0.20,
        freqX: 0.18 + rand(i + 23) * 0.25,
        freqY: 0.22 + rand(i + 29) * 0.25,
        phaseX: rand(i + 37) * Math.PI * 2,
        phaseY: rand(i + 41) * Math.PI * 2,
        radiusSeed: 0.7 + rand(i + 31) * 0.6,
      };
    });
    const lavaBlobBuf = new Float32Array(MAX_BLOBS * 2);
    const lavaRadBuf = new Float32Array(MAX_BLOBS);
    let lavaSimTime = 0;

    // Mesh point extraction. K-means in joint (position, colour) feature space
    // seeded with K-means++ (vibrance-weighted). Each cluster reports its mean
    // colour, the medoid sample position (real pixel inside its zone) and an
    // influence radius sigma proportional to zone size.
    const computeMeshPoints = () => {
      const src = findSource();
      if (!src || !sctx) return;
      const c = stateRef.current.cluster;
      if (!c) return;
      const palette = c.paletteColors && c.paletteColors.length >= 2 ? c.paletteColors : null;
      const K = palette
        ? palette.length
        : Math.max(2, Math.min(16, c.points ?? c.colors ?? 6));
      const sw = (src as HTMLVideoElement).videoWidth || (src as HTMLImageElement).naturalWidth || (src as HTMLCanvasElement).width;
      const sh = (src as HTMLVideoElement).videoHeight || (src as HTMLImageElement).naturalHeight || (src as HTMLCanvasElement).height;
      if (!sw || !sh) return;
      const aspect = sh / sw;
      sampleH = Math.max(1, Math.round(SAMPLE_W * aspect));
      if (sampleCanvas.height !== sampleH) sampleCanvas.height = sampleH;
      const scale = 1.25 * stateRef.current.zoom / stateRef.current.cropSize;
      const srcW = sw / scale;
      const srcH = sh / scale;
      const sx = (sw - srcW) / 2 - (0.5 - stateRef.current.cropX) * sw;
      const sy = (sh - srcH) / 2 - (0.5 - stateRef.current.cropY) * sh;
      try {
        sctx.clearRect(0, 0, SAMPLE_W, sampleH);
        const x0 = clamp01(sx / sw);
        const y0 = clamp01(sy / sh);
        const x1 = clamp01((sx + srcW) / sw);
        const y1 = clamp01((sy + srcH) / sh);
        const safeSw = Math.max(1, (x1 - x0) * sw);
        const safeSh = Math.max(1, (y1 - y0) * sh);
        const dx0 = ((x0 * sw - sx) / srcW) * SAMPLE_W;
        const dy0 = ((y0 * sh - sy) / srcH) * sampleH;
        const dw = (safeSw / srcW) * SAMPLE_W;
        const dh = (safeSh / srcH) * sampleH;
        sctx.save();
        sctx.imageSmoothingEnabled = false;
        sctx.drawImage(src, x0 * sw, y0 * sh, safeSw, safeSh, dx0, 0, dw, sampleH);
        sctx.drawImage(src, x0 * sw, y0 * sh, safeSw, safeSh, 0, dy0, SAMPLE_W, dh);
        sctx.restore();
        sctx.drawImage(src, x0 * sw, y0 * sh, safeSw, safeSh, dx0, dy0, dw, dh);
      }
      catch { return; }
      const img = sctx.getImageData(0, 0, SAMPLE_W, sampleH);
      const data = img.data;
      const N = SAMPLE_W * sampleH;
      if (K !== lastK) {
        meshPoints = seedMeshPoints(K);
        prevMeshPoints = seedMeshPoints(K);
        lastK = K;
      }

      // Per-sample features. Position normalised to [0,1] of the cropped frame;
      // colour weighted slightly stronger so clusters track colour zones, not a
      // regular spatial grid. Vibrance weight biases seeding toward vivid pixels.
      const SW = 1.0, CW = 1.8;
      const fx = new Float32Array(N), fy = new Float32Array(N);
      const fr = new Float32Array(N), fg = new Float32Array(N), fb = new Float32Array(N);
      const pr = new Float32Array(N), pg = new Float32Array(N), pb = new Float32Array(N);
      const vb = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const xi = (i % SAMPLE_W) / Math.max(1, SAMPLE_W - 1);
        const yi = ((i / SAMPLE_W) | 0) / Math.max(1, sampleH - 1);
        const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
        fx[i] = xi * SW; fy[i] = yi * SW;
        fr[i] = (r / 255) * CW; fg[i] = (g / 255) * CW; fb[i] = (b / 255) * CW;
        pr[i] = r; pg[i] = g; pb[i] = b;
        const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255;
        const l = (mx + mn) / 2, d = mx - mn;
        const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
        vb[i] = s * (1 - Math.abs(2 * l - 1));
      }

      // K-means++ init, biased by vibrance.
      const cfx = new Float32Array(K), cfy = new Float32Array(K);
      const cfr = new Float32Array(K), cfg = new Float32Array(K), cfb = new Float32Array(K);
      const setCenter = (k: number, i: number) => {
        cfx[k] = fx[i]; cfy[k] = fy[i];
        cfr[k] = fr[i]; cfg[k] = fg[i]; cfb[k] = fb[i];
      };
      const pickW = (w: Float32Array) => {
        let tot = 0; for (let i = 0; i < N; i++) tot += w[i];
        if (tot <= 0) return Math.floor(Math.random() * N);
        const rnd = Math.random() * tot;
        let cum = 0;
        for (let i = 0; i < N; i++) { cum += w[i]; if (cum >= rnd) return i; }
        return N - 1;
      };
      const w0 = new Float32Array(N);
      for (let i = 0; i < N; i++) w0[i] = vb[i] + 0.05;
      setCenter(0, pickW(w0));
      const wk = new Float32Array(N);
      for (let k = 1; k < K; k++) {
        for (let i = 0; i < N; i++) {
          let mD = Infinity;
          for (let j = 0; j < k; j++) {
            const dx = fx[i] - cfx[j], dy = fy[i] - cfy[j];
            const dr = fr[i] - cfr[j], dg = fg[i] - cfg[j], db = fb[i] - cfb[j];
            const d2 = dx * dx + dy * dy + dr * dr + dg * dg + db * db;
            if (d2 < mD) mD = d2;
          }
          wk[i] = (vb[i] + 0.05) * mD;
        }
        setCenter(k, pickW(wk));
      }

      // Lloyd iterations.
      const asgn = new Int32Array(N);
      for (let iter = 0; iter < 8; iter++) {
        let changed = false;
        for (let i = 0; i < N; i++) {
          let bD = Infinity, bK = 0;
          for (let k = 0; k < K; k++) {
            const dx = fx[i] - cfx[k], dy = fy[i] - cfy[k];
            const dr = fr[i] - cfr[k], dg = fg[i] - cfg[k], db = fb[i] - cfb[k];
            const d2 = dx * dx + dy * dy + dr * dr + dg * dg + db * db;
            if (d2 < bD) { bD = d2; bK = k; }
          }
          if (asgn[i] !== bK) { changed = true; asgn[i] = bK; }
        }
        if (!changed) break;
        const sFX = new Float32Array(K), sFY = new Float32Array(K);
        const sFR = new Float32Array(K), sFG = new Float32Array(K), sFB = new Float32Array(K);
        const cnt = new Int32Array(K);
        for (let i = 0; i < N; i++) {
          const k = asgn[i];
          sFX[k] += fx[i]; sFY[k] += fy[i];
          sFR[k] += fr[i]; sFG[k] += fg[i]; sFB[k] += fb[i];
          cnt[k]++;
        }
        for (let k = 0; k < K; k++) if (cnt[k] > 0) {
          cfx[k] = sFX[k] / cnt[k]; cfy[k] = sFY[k] / cnt[k];
          cfr[k] = sFR[k] / cnt[k]; cfg[k] = sFG[k] / cnt[k]; cfb[k] = sFB[k] / cnt[k];
        }
      }

      // Per-cluster stats: size, mean RGB and medoid sample position.
      const size = new Int32Array(K);
      const sumR = new Float32Array(K), sumG = new Float32Array(K), sumB = new Float32Array(K);
      const medD = new Float32Array(K).fill(Infinity);
      const medX = new Float32Array(K), medY = new Float32Array(K);
      for (let i = 0; i < N; i++) {
        const k = asgn[i];
        size[k]++;
        sumR[k] += pr[i]; sumG[k] += pg[i]; sumB[k] += pb[i];
        const dx = fx[i] - cfx[k], dy = fy[i] - cfy[k];
        const dr = fr[i] - cfr[k], dg = fg[i] - cfg[k], db = fb[i] - cfb[k];
        const d2 = dx * dx + dy * dy + dr * dr + dg * dg + db * db;
        if (d2 < medD[k]) {
          medD[k] = d2;
          medX[k] = (i % SAMPLE_W) / Math.max(1, SAMPLE_W - 1);
          medY[k] = ((i / SAMPLE_W) | 0) / Math.max(1, sampleH - 1);
        }
      }

      // Convert cropped-frame coords to source-image uv, sigma from zone area.
      // sigmaCropped = sqrt(n / (N * PI)); sigmaSource = sigmaCropped / scale.
      const sxUv = sx / sw, syUv = sy / sh;
      const invScale = 1 / scale;
      const vib = Math.max(0, Math.min(1, c.vibrance ?? 0));

      // Parse palette colors (if any) sorted by luminance, ascending.
      let paletteRGB: Array<[number, number, number]> | null = null;
      if (palette) {
        const parsed: Array<[number, number, number]> = [];
        for (const hex of palette) {
          const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
          if (!m) continue;
          const n = parseInt(m[1], 16);
          parsed.push([((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]);
        }
        if (parsed.length >= 2) {
          parsed.sort((a, b) => (0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2])
                              - (0.2126 * b[0] + 0.7152 * b[1] + 0.0722 * b[2]));
          paletteRGB = parsed.slice(0, K);
          // Pad if palette shorter than K (shouldn't happen since K = palette.length).
          while (paletteRGB.length < K) paletteRGB.push(paletteRGB[paletteRGB.length - 1]);
        }
      }

      // Rank clusters by extracted mean luminance, then assign palette colors in
      // ascending luma order so dark zones get dark palette colors.
      const meanLuma: number[] = [];
      for (let k = 0; k < K; k++) {
        const n = size[k] || 1;
        const rr = sumR[k] / n / 255, gg = sumG[k] / n / 255, bb = sumB[k] / n / 255;
        meanLuma.push(0.2126 * rr + 0.7152 * gg + 0.0722 * bb);
      }
      const lumaOrder = meanLuma.map((_, i) => i).sort((a, b) => meanLuma[a] - meanLuma[b]);
      const palettePosition = new Array<number>(K);
      lumaOrder.forEach((kIdx, rank) => { palettePosition[kIdx] = rank; });

      const next: MeshPoint[] = [];
      for (let k = 0; k < K; k++) {
        const n = size[k] || 1;
        const sigC = Math.max(Math.sqrt(n / (N * Math.PI)), 0.055);
        let rr: number, gg: number, bb: number;
        if (paletteRGB) {
          const pc = paletteRGB[palettePosition[k]];
          rr = pc[0]; gg = pc[1]; bb = pc[2];
        } else {
          rr = sumR[k] / n / 255;
          gg = sumG[k] / n / 255;
          bb = sumB[k] / n / 255;
          if (vib > 0) {
            const luma = 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
            const boost = 1 + vib * 2;
            rr = Math.max(0, Math.min(1, luma + (rr - luma) * boost));
            gg = Math.max(0, Math.min(1, luma + (gg - luma) * boost));
            bb = Math.max(0, Math.min(1, luma + (bb - luma) * boost));
          }
        }
        next.push({
          x: sxUv + medX[k] * invScale,
          y: syUv + medY[k] * invScale,
          r: rr, g: gg, b: bb,
          sigma: sigC * invScale,
        });
      }

      prevMeshPoints = meshPoints;
      meshPoints = next;

      const cb = onClusterColorsRef.current;
      if (cb) {
        const toHex = (v: number) => {
          const n = Math.max(0, Math.min(255, Math.round(v * 255)));
          return n.toString(16).padStart(2, "0");
        };
        const hexes = next.slice(0, lastK).map((p) => `#${toHex(p.r)}${toHex(p.g)}${toHex(p.b)}`.toUpperCase());
        cb(hexes);
      }
    };

    let raf = 0;
    let simTime = 0;
    let last = performance.now();
    let lastTextureSrcKey = "";
    let lastTextureTime = -1;

    const loop = (now: number) => {
      if (!visible) { raf = 0; return; }
      const dt = (now - last) / 1000; last = now;
      simTime += dt;
      const st = stateRef.current;
      const s = st.settings;

      const mediaEl = findSource();
      if (!mediaEl) { raf = requestAnimationFrame(loop); return; }

      const isVideo = mediaEl instanceof HTMLVideoElement;
      const isCanvas = mediaEl instanceof HTMLCanvasElement;
      const sw = isVideo
        ? (mediaEl as HTMLVideoElement).videoWidth
        : isCanvas
          ? (mediaEl as HTMLCanvasElement).width
          : (mediaEl as HTMLImageElement).naturalWidth;
      const sh = isVideo
        ? (mediaEl as HTMLVideoElement).videoHeight
        : isCanvas
          ? (mediaEl as HTMLCanvasElement).height
          : (mediaEl as HTMLImageElement).naturalHeight;
      if (!sw || !sh) { raf = requestAnimationFrame(loop); return; }

      // Upload source texture only when the frame actually changed. Canvas
      // sources are uploaded every tick (the caller is animating them) and
      // expose an explicit cluster-recompute throttle via `data-brio-cluster-key`.
      const vTime = isVideo ? (mediaEl as HTMLVideoElement).currentTime : 0;
      const srcKey = isVideo
        ? ((mediaEl as HTMLVideoElement).currentSrc || (mediaEl as HTMLVideoElement).src || "v")
        : isCanvas
          ? `c:${now.toFixed(2)}`
          : (mediaEl as HTMLImageElement).src;
      const srcChanged = isCanvas ? true : srcKey !== lastTextureSrcKey;
      const sourceChanged = isVideo
        ? (srcChanged || vTime !== lastTextureTime || !(mediaEl as HTMLVideoElement).paused)
        : srcChanged;
      const canvasClusterKey = isCanvas
        ? ((mediaEl as HTMLCanvasElement).dataset.brioClusterKey ?? "")
        : "";
      const clusterSourceChanged = isCanvas
        ? canvasClusterKey !== lastTextureSrcKey
        : sourceChanged;
      if (sourceChanged) {
        gl.bindTexture(gl.TEXTURE_2D, srcTex);
        try {
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mediaEl);
        } catch { /* not ready */ }
        lastTextureTime = vTime;
        if (!isCanvas) lastTextureSrcKey = srcKey;
      }
      if (clusterSourceChanged && isCanvas) {
        lastTextureSrcKey = canvasClusterKey;
        clusterLastUpdate = -1;
      } else if (clusterSourceChanged && !isCanvas && srcChanged) {
        clusterLastUpdate = -1;
      }

      // Mesh: recompute live while the source frame is changing (video playing).
      // For paused video or still images, compute once and freeze.
      const cl = st.cluster;
      const meshProgress = 1;
      if (cl?.enabled) {
        const palette = cl.paletteColors && cl.paletteColors.length >= 2 ? cl.paletteColors : null;
        const K = palette
          ? palette.length
          : Math.max(2, Math.min(16, cl.points ?? cl.colors ?? 6));
        const vib = Math.max(0, Math.min(1, cl.vibrance ?? 0));
        const paletteKey = palette ? palette.join("|") : "";
        const cropKey = `${st.cropX.toFixed(4)}|${st.cropY.toFixed(4)}|${st.cropSize.toFixed(4)}|${st.zoom.toFixed(4)}`;
        if (
          clusterLastUpdate < 0 ||
          clusterSourceChanged ||
          K !== clusterLastK ||
          vib !== clusterLastVib ||
          paletteKey !== clusterLastPaletteKey ||
          cropKey !== clusterLastCropKey
        ) {
          computeMeshPoints();
          clusterLastUpdate = now;
          clusterLastK = K;
          clusterLastVib = vib;
          clusterLastPaletteKey = paletteKey;
          clusterLastCropKey = cropKey;
        }
        for (let i = 0; i < 16; i++) {
          const idx = Math.min(i, K - 1);
          const pa = prevMeshPoints[idx] ?? meshPoints[idx];
          const pb = meshPoints[idx] ?? prevMeshPoints[idx];
          meshPosBufA[i * 2] = pa?.x ?? 0.5; meshPosBufA[i * 2 + 1] = pa?.y ?? 0.5;
          meshPosBufB[i * 2] = pb?.x ?? 0.5; meshPosBufB[i * 2 + 1] = pb?.y ?? 0.5;
          meshSigBufA[i] = pa?.sigma ?? 0.25;
          meshSigBufB[i] = pb?.sigma ?? 0.25;
          meshColBufA[i * 3] = pa?.r ?? 0; meshColBufA[i * 3 + 1] = pa?.g ?? 0; meshColBufA[i * 3 + 2] = pa?.b ?? 0;
          meshColBufB[i * 3] = pb?.r ?? 0; meshColBufB[i * 3 + 1] = pb?.g ?? 0; meshColBufB[i * 3 + 2] = pb?.b ?? 0;
        }
      }

      // Optional blur: ping-pong into texA. Combine brio blur and lava pre-blur.
      const p = Math.max(0, Math.min(1, st.amount));
      const blurAmt = Math.max(0, Math.min(1, s.blur)) * p;
      const lavaBlurAmt = st.lava?.enabled ? Math.max(0, Math.min(1, st.lava.blur)) : 0;
      const effBlur = Math.max(blurAmt, lavaBlurAmt);
      const blurPx = effBlur * 32 + Math.pow(effBlur, 3) * 96;
      const sampleTex: WebGLTexture = srcTex;
      const sampleW = sw, sampleHpx = sh;
      // Blur is always applied AFTER the main pass (post color mapping) so it
      // softens the final palette/quantized output, not the raw source.
      const postBlur = blurPx > 0.5;
      if (postBlur) {
        ensureFbos(canvas.width, canvas.height);
      }

      // Main pass: target FBO (texA) when post-blurring, else default framebuffer.
      if (postBlur) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fboA);
        gl.viewport(0, 0, fboW, fboH);
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(mainProg);
      bindQuad(mainProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sampleTex);
      gl.uniform1i(uMain.image, 0);
      gl.uniform2f(uMain.imageSize, sampleW, sampleHpx);
      gl.uniform2f(uMain.canvasSize, canvas.width, canvas.height);
      gl.uniform4f(uMain.crop, st.cropX, st.cropY, st.cropSize, st.zoom);
      gl.uniform1f(uMain.time, simTime);
      gl.uniform1f(uMain.warp, Math.max(0, Math.min(2, s.warp)) * p);
      gl.uniform1f(uMain.liquify, Math.max(0, Math.min(2, s.liquify ?? 0)) * p);
      gl.uniform1f(uMain.desat, Math.min(1, p / 0.5));
      gl.uniform1f(uMain.contrast, Math.max(0, Math.min(1, s.contrast)) * p);

      // Palette mode + uniforms. When cluster is active, skip palette mapping so
      // the extracted footage colors survive to the end of the chain.
      const colorOn = s.toggles.color !== false && !cl?.enabled;
      let mode = 0;
      if (colorOn && st.quadtone) {
        mode = 1;
        const stopsArr = new Float32Array(4 * 3);
        const stops = st.quadtone.stops;
        for (let i = 0; i < 4; i++) {
          const [r, g, b] = hexToRgb(stops[i] ?? "#000000");
          stopsArr[i * 3] = r; stopsArr[i * 3 + 1] = g; stopsArr[i * 3 + 2] = b;
        }
        gl.uniform3fv(uMain.stops, stopsArr);
        const t = s.thresholds ?? DEFAULT_THRESH;
        const tSorted = [...t].sort((a, b) => a - b);
        gl.uniform1fv(uMain.thresh, new Float32Array(tSorted.map((x) => Math.max(0, Math.min(1, x)))));
      } else if (colorOn && st.duotone) {
        mode = 2;
        const tm = duotoneToTintMatrix(st.duotone);
        gl.uniform4f(uMain.duoScale, tm.rScale, tm.gScale, tm.bScale, 0);
        gl.uniform4f(uMain.duoOffset, tm.rOffset, tm.gOffset, tm.bOffset, 0);
      }
      gl.uniform1i(uMain.paletteMode, mode);

      // Mesh uniforms.
      gl.uniform1i(uMain.meshEnabled, cl?.enabled ? 1 : 0);
      gl.uniform1i(uMain.meshCount, cl?.enabled ? Math.max(2, Math.min(16, cl.points ?? cl.colors ?? 6)) : 0);
      if (cl?.enabled) {
        // Sharpness 0..1 -> Cauchy power 1.5..12 (soft gradient -> near-Voronoi).
        const sharp = Math.max(0, Math.min(1, cl.sharpness ?? 0.35));
        gl.uniform1f(uMain.meshPower, 1.5 + sharp * 10.5);
        gl.uniform1f(uMain.meshProgress, meshProgress);
        gl.uniform2fv(uMain.meshPosA, meshPosBufA);
        gl.uniform2fv(uMain.meshPosB, meshPosBufB);
        gl.uniform1fv(uMain.meshSigA, meshSigBufA);
        gl.uniform1fv(uMain.meshSigB, meshSigBufB);
        gl.uniform3fv(uMain.meshColA, meshColBufA);
        gl.uniform3fv(uMain.meshColB, meshColBufB);
      }

      gl.uniform1f(uMain.grain, Math.max(0, Math.min(2, s.grain)));
      gl.uniform1i(uMain.toneMode, st.overlay === "dark" ? 1 : st.overlay === "light" ? 2 : 0);

      // Lava lamp: advance simulation and upload blob uniforms.
      const lv = st.lava;
      if (lv?.enabled) {
        lavaSimTime += dt * (0.15 + lv.speed * 1.6);
        const count = Math.max(3, Math.min(MAX_BLOBS, Math.round(lv.blobCount)));
        const sizeFactor = 0.18 + lv.scale * 0.32;
        for (let i = 0; i < MAX_BLOBS; i++) {
          const lp = lavaParams[i];
          const x = lp.baseX + Math.sin(lavaSimTime * lp.freqX + lp.phaseX) * lp.ampX;
          const y = lp.baseY + Math.sin(lavaSimTime * lp.freqY + lp.phaseY) * lp.ampY;
          lavaBlobBuf[i * 2] = x;
          lavaBlobBuf[i * 2 + 1] = y;
          lavaRadBuf[i] = sizeFactor * lp.radiusSeed;
        }
        gl.uniform1i(uMain.lavaEnabled, 1);
        gl.uniform1i(uMain.lavaCount, count);
        gl.uniform2fv(uMain.lavaBlobs, lavaBlobBuf);
        gl.uniform1fv(uMain.lavaRadii, lavaRadBuf);
        gl.uniform1f(uMain.lavaSoftness, lv.softness);
        gl.uniform1f(uMain.lavaPull, 0.85);
      } else {
        gl.uniform1i(uMain.lavaEnabled, 0);
      }


      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Post-blur: iterated H+V gaussian passes. With only 9 taps the per-pass
      // radius must stay small (otherwise taps undersample and produce a grid
      // moire). We compound variances: sigma_total^2 = N * sigma_pass^2, so
      // per-pass radius = totalRadius / sqrt(N). Ping-pong between texA/texB
      // and write the final V pass to the default framebuffer.
      if (postBlur) {
        const MAX_PASS_PX = 6;
        const passes = Math.max(1, Math.ceil(blurPx / MAX_PASS_PX));
        const perPx = blurPx / Math.sqrt(passes);
        gl.useProgram(blurProg);
        bindQuad(blurProg);
        // Source for first pass is texA (main output). We alternate:
        //   read -> write to other FBO, swap, repeat.
        let readTex: WebGLTexture = texA!;
        for (let i = 0; i < passes; i++) {
          const lastPass = i === passes - 1;
          // Horizontal: read -> texB
          gl.bindFramebuffer(gl.FRAMEBUFFER, fboB);
          gl.viewport(0, 0, fboW, fboH);
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, readTex);
          gl.uniform1i(uBlur.src, 0);
          gl.uniform2f(uBlur.dir, 1 / fboW, 0);
          gl.uniform1f(uBlur.radius, perPx);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
          // Vertical: texB -> texA (or screen on last pass).
          if (lastPass) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
          } else {
            gl.bindFramebuffer(gl.FRAMEBUFFER, fboA);
            gl.viewport(0, 0, fboW, fboH);
          }
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, texB!);
          gl.uniform1i(uBlur.src, 0);
          gl.uniform2f(uBlur.dir, 0, 1 / fboH);
          gl.uniform1f(uBlur.radius, perPx);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
          readTex = texA!;
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (texA) gl.deleteTexture(texA);
      if (texB) gl.deleteTexture(texB);
      if (fboA) gl.deleteFramebuffer(fboA);
      if (fboB) gl.deleteFramebuffer(fboB);
      gl.deleteTexture(srcTex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(blurProg);
      gl.deleteProgram(mainProg);
    };
  }, [target]);

  if (!target) return null;
  return createPortal(
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className ?? ""}`}
      aria-hidden
    />,
    target,
  );
};

export default BrioWebGLOverlay;
