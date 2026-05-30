import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import {
  getActivePaletteMode,
  getBrioSettings,
  getEffectiveQuadtone,
  quadtones,
  type BrioSettings,
  type Quadtone,
} from "@/data/duotones";

const reelVideo = "/reel.mp4";
const MAX_PALETTE_SIZE = 16;
// Offscreen passes run at full canvas resolution so blur radius == screen pixels.
const FBO_SCALE = 1.0;

export interface HeroBrioCanvasHandle {
  setAmount: (p: number) => void;
}

const VS = /* glsl */ `
attribute vec2 a_pos;
varying vec2 vUv;
void main(){
  vUv = (a_pos + 1.0) * 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// ---------------------------------------------------------------------------
// Pass 1: source -> desat -> contrast
// ---------------------------------------------------------------------------
const PREP_FS = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D u_image;
uniform float u_amount;
uniform float u_zoom;
uniform float u_contrast;
uniform float u_useColor;
uniform vec2 u_imageSize;
uniform vec2 u_canvasSize;

vec2 coverUv(vec2 uv){
  float arImg = u_imageSize.x / max(u_imageSize.y, 1.0);
  float arCan = u_canvasSize.x / max(u_canvasSize.y, 1.0);
  vec2 imgUv = uv;
  if (arCan > arImg) { float sY = arImg/arCan; imgUv.y = (uv.y-0.5)*sY+0.5; }
  else { float sX = arCan/arImg; imgUv.x = (uv.x-0.5)*sX+0.5; }
  float z = mix(1.0, 1.25 * u_zoom, u_amount);
  imgUv = (imgUv - 0.5) / z + 0.5;
  imgUv.y = 1.0 - imgUv.y;
  return clamp(imgUv, 0.0, 1.0);
}

void main(){
  vec3 src = texture2D(u_image, coverUv(vUv)).rgb;
  float L = dot(src, vec3(0.2126, 0.7152, 0.0722));
  float pDesat = clamp(u_amount / 0.5, 0.0, 1.0) * (1.0 - u_useColor);
  vec3 col = mix(src, vec3(L), pDesat);
  float c = mix(1.0, 1.0 + 7.0 * u_contrast, u_amount);
  float o = mix(0.0, -3.5 * u_contrast, u_amount);
  col = clamp(col * c + o, 0.0, 1.0);
  gl_FragColor = vec4(col, 1.0);
}`;

// ---------------------------------------------------------------------------
// Pass 2: separable 13-tap gaussian blur (H or V)
// ---------------------------------------------------------------------------
const BLUR_FS = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D u_tex;
uniform vec2 u_texel;
uniform vec2 u_dir;
uniform float u_radiusPx;

void main(){
  if (u_radiusPx < 0.5) {
    gl_FragColor = texture2D(u_tex, vUv);
    return;
  }
  // Spread 6 taps each side across the radius.
  vec2 step = u_dir * u_texel * (u_radiusPx / 6.0);
  vec3 col = texture2D(u_tex, vUv).rgb * 0.196482;
  col += texture2D(u_tex, vUv + step * 1.0).rgb * 0.174670;
  col += texture2D(u_tex, vUv - step * 1.0).rgb * 0.174670;
  col += texture2D(u_tex, vUv + step * 2.0).rgb * 0.121281;
  col += texture2D(u_tex, vUv - step * 2.0).rgb * 0.121281;
  col += texture2D(u_tex, vUv + step * 3.0).rgb * 0.065591;
  col += texture2D(u_tex, vUv - step * 3.0).rgb * 0.065591;
  col += texture2D(u_tex, vUv + step * 4.0).rgb * 0.027630;
  col += texture2D(u_tex, vUv - step * 4.0).rgb * 0.027630;
  col += texture2D(u_tex, vUv + step * 5.0).rgb * 0.009060;
  col += texture2D(u_tex, vUv - step * 5.0).rgb * 0.009060;
  col += texture2D(u_tex, vUv + step * 6.0).rgb * 0.002319;
  col += texture2D(u_tex, vUv - step * 6.0).rgb * 0.002319;
  gl_FragColor = vec4(col, 1.0);
}`;

// ---------------------------------------------------------------------------
// Pass 3: quadtone LUT + palette posterize (color chain end)
// ---------------------------------------------------------------------------
const QUAD_FS = (paletteSize: number) => /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D u_tex;
uniform float u_amount;
uniform vec3  u_quad0;
uniform vec3  u_quad1;
uniform vec3  u_quad2;
uniform vec3  u_quad3;
uniform float u_thresholds[6];
uniform vec3  u_palette[${paletteSize}];
uniform int   u_paletteCount;
uniform float u_paletteMix;

vec3 quadSample(float x){
  if (x <= u_thresholds[0]) return u_quad0;
  if (x < u_thresholds[1]) {
    float s = max(1e-5, u_thresholds[1] - u_thresholds[0]);
    return mix(u_quad0, u_quad1, (x - u_thresholds[0]) / s);
  }
  if (x <= u_thresholds[2]) return u_quad1;
  if (x < u_thresholds[3]) {
    float s = max(1e-5, u_thresholds[3] - u_thresholds[2]);
    return mix(u_quad1, u_quad2, (x - u_thresholds[2]) / s);
  }
  if (x <= u_thresholds[4]) return u_quad2;
  if (x < u_thresholds[5]) {
    float s = max(1e-5, u_thresholds[5] - u_thresholds[4]);
    return mix(u_quad2, u_quad3, (x - u_thresholds[4]) / s);
  }
  return u_quad3;
}

vec3 quadtoneMap(vec3 col){
  vec3 tR = quadSample(col.r);
  vec3 tG = quadSample(col.g);
  vec3 tB = quadSample(col.b);
  return vec3(
    mix(col.r, tR.r, u_amount),
    mix(col.g, tG.g, u_amount),
    mix(col.b, tB.b, u_amount)
  );
}

vec3 paletteQuantize(vec3 col){
  if (u_paletteMix < 0.001) return col;
  int count = u_paletteCount;
  if (count < 1) count = 1;
  vec3 best = u_palette[0];
  float bestD = dot(col - u_palette[0], col - u_palette[0]);
  for (int i = 1; i < ${paletteSize}; i++) {
    if (i >= count) continue;
    vec3 cand = u_palette[i];
    float d = dot(col - cand, col - cand);
    if (d < bestD) { bestD = d; best = cand; }
  }
  return mix(col, best, u_paletteMix * u_amount);
}

void main(){
  vec3 col = texture2D(u_tex, vUv).rgb;
  col = quadtoneMap(col);
  col = paletteQuantize(col);
  gl_FragColor = vec4(col, 1.0);
}`;

// ---------------------------------------------------------------------------
// Pass 4: warp + liquify displacement on the colored result
// ---------------------------------------------------------------------------
const DISP_FS = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D u_tex;
uniform float u_amount;
uniform float u_time;
uniform vec2  u_canvasSize;
uniform float u_warpAmt;
uniform float u_liquifyAmt;
uniform float u_morph;
uniform float u_flow;
uniform float u_scale;
uniform int   u_warpOctaves;
uniform float u_lfEnabled;

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

vec2 warpDisp(vec2 uv){
  if (u_warpAmt < 0.001) return vec2(0.0);
  vec2 p = uv * 80.0;
  float nx = snoise(p + u_time * 0.30);
  float ny = snoise(p + vec2(13.7, 5.1) + u_time * 0.27);
  return vec2(nx, ny) * mix(0.0, 16.0, u_amount) * u_warpAmt / u_canvasSize;
}

vec2 liquifyDisp(vec2 uv){
  vec2 disp = vec2(0.0);
  if (u_lfEnabled > 0.5) {
    float tA = u_time * 0.10;
    float tB = u_time * 0.13;
    float tC = u_time * 0.17;
    vec2 p = uv * mix(1.0, u_scale, u_amount);
    vec2 q = vec2(snoise(p + tA), snoise(p + vec2(5.2, 1.3) + tB));
    vec2 r = vec2(
      snoise(p + 4.0 * q + vec2(1.7, 9.2) + tA * 1.15),
      snoise(p + 4.0 * q + vec2(8.3, 2.8) + tB * 1.26)
    );
    if (u_warpOctaves >= 3) {
      r = vec2(
        snoise(p + 4.0 * r + vec2(3.1, 6.7) + tC * 0.83),
        snoise(p + 4.0 * r + vec2(0.4, 4.5) + tC * 0.97)
      );
    }
    if (u_warpOctaves >= 4) {
      r = vec2(
        snoise(p + 4.0 * r + vec2(2.1, 1.7) + tA * 1.40),
        snoise(p + 4.0 * r + vec2(7.3, 0.5) + tB * 1.10)
      );
    }
    disp += r * 0.20 * u_morph * u_amount;
  }
  if (u_liquifyAmt > 0.001) {
    vec2 p = uv * 1.5;
    vec2 n = vec2(
      snoise(p + u_time * 0.05),
      snoise(p + vec2(31.0, 17.0) + u_time * 0.07)
    );
    disp += n * mix(0.0, 120.0, u_amount) * u_liquifyAmt / u_canvasSize;
  }
  // unused but kept for shader-uniform parity with previous version
  if (u_flow > 999.0) disp += vec2(u_flow);
  return disp;
}

void main(){
  vec2 d = warpDisp(vUv) + liquifyDisp(vUv);
  vec2 uv = clamp(vUv + d, 0.0, 1.0);
  gl_FragColor = texture2D(u_tex, uv);
}`;

const hexToRgb01 = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return [r, g, b];
};

const clampPaletteCount = (settings: BrioSettings) =>
  Math.max(2, Math.min(MAX_PALETTE_SIZE, settings.cluster?.colors ?? 9));

const seedCentroids = (count: number): [number, number, number][] => {
  const next: [number, number, number][] = [];
  for (let k = 0; k < count; k++) {
    const v = count === 1 ? 128 : Math.round((k / (count - 1)) * 255);
    next.push([v, v, v]);
  }
  return next;
};

const uploadPalette = (
  gl: WebGLRenderingContext,
  location: WebGLUniformLocation | null,
  colors: [number, number, number][],
  activeCount: number
) => {
  if (!location) return;
  const out = new Float32Array(MAX_PALETTE_SIZE * 3);
  const fallback = colors[Math.max(0, activeCount - 1)] ?? [128, 128, 128];
  for (let k = 0; k < MAX_PALETTE_SIZE; k++) {
    const c = colors[k] ?? fallback;
    out[k * 3 + 0] = c[0] / 255;
    out[k * 3 + 1] = c[1] / 255;
    out[k * 3 + 2] = c[2] / 255;
  }
  gl.uniform3fv(location, out);
};

const HeroBrioCanvas = forwardRef<HeroBrioCanvasHandle, { className?: string }>(
  ({ className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const amountRef = useRef(0);
    const settingsRef = useRef<BrioSettings>(getBrioSettings());

    useImperativeHandle(ref, () => ({
      setAmount: (p: number) => {
        amountRef.current = Math.max(0, Math.min(1, p));
      },
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const gl = canvas.getContext("webgl", {
        premultipliedAlpha: true,
        antialias: false,
        preserveDrawingBuffer: false,
      });
      if (!gl) return;

      const initialSettings = settingsRef.current;
      const initialPaletteCount = clampPaletteCount(initialSettings);

      const compile = (type: number, src: string) => {
        const sh = gl.createShader(type)!;
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
          console.error("HeroBrio shader compile error:", gl.getShaderInfoLog(sh));
        }
        return sh;
      };
      const link = (fs: string): WebGLProgram | null => {
        const p = gl.createProgram()!;
        gl.attachShader(p, compile(gl.VERTEX_SHADER, VS));
        gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
          console.error("HeroBrio link error:", gl.getProgramInfoLog(p));
          return null;
        }
        return p;
      };

      const prepProg = link(PREP_FS);
      const blurProg = link(BLUR_FS);
      const quadProg = link(QUAD_FS(MAX_PALETTE_SIZE));
      const dispProg = link(DISP_FS);
      if (!prepProg || !blurProg || !quadProg || !dispProg) return;

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      );

      const bindAttribs = (p: WebGLProgram) => {
        const aPos = gl.getAttribLocation(p, "a_pos");
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      };

      // Uniform handles per program
      const uPrep = {
        image: gl.getUniformLocation(prepProg, "u_image"),
        amount: gl.getUniformLocation(prepProg, "u_amount"),
        zoom: gl.getUniformLocation(prepProg, "u_zoom"),
        contrast: gl.getUniformLocation(prepProg, "u_contrast"),
        useColor: gl.getUniformLocation(prepProg, "u_useColor"),
        imageSize: gl.getUniformLocation(prepProg, "u_imageSize"),
        canvasSize: gl.getUniformLocation(prepProg, "u_canvasSize"),
      };
      const uBlur = {
        tex: gl.getUniformLocation(blurProg, "u_tex"),
        texel: gl.getUniformLocation(blurProg, "u_texel"),
        dir: gl.getUniformLocation(blurProg, "u_dir"),
        radiusPx: gl.getUniformLocation(blurProg, "u_radiusPx"),
      };
      const uQuad = {
        tex: gl.getUniformLocation(quadProg, "u_tex"),
        amount: gl.getUniformLocation(quadProg, "u_amount"),
        quad0: gl.getUniformLocation(quadProg, "u_quad0"),
        quad1: gl.getUniformLocation(quadProg, "u_quad1"),
        quad2: gl.getUniformLocation(quadProg, "u_quad2"),
        quad3: gl.getUniformLocation(quadProg, "u_quad3"),
        thresholds: gl.getUniformLocation(quadProg, "u_thresholds[0]"),
        palette: gl.getUniformLocation(quadProg, "u_palette[0]"),
        paletteCount: gl.getUniformLocation(quadProg, "u_paletteCount"),
        paletteMix: gl.getUniformLocation(quadProg, "u_paletteMix"),
      };
      const uDisp = {
        tex: gl.getUniformLocation(dispProg, "u_tex"),
        amount: gl.getUniformLocation(dispProg, "u_amount"),
        time: gl.getUniformLocation(dispProg, "u_time"),
        canvasSize: gl.getUniformLocation(dispProg, "u_canvasSize"),
        warpAmt: gl.getUniformLocation(dispProg, "u_warpAmt"),
        liquifyAmt: gl.getUniformLocation(dispProg, "u_liquifyAmt"),
        morph: gl.getUniformLocation(dispProg, "u_morph"),
        flow: gl.getUniformLocation(dispProg, "u_flow"),
        scale: gl.getUniformLocation(dispProg, "u_scale"),
        warpOctaves: gl.getUniformLocation(dispProg, "u_warpOctaves"),
        lfEnabled: gl.getUniformLocation(dispProg, "u_lfEnabled"),
      };

      let centroids = seedCentroids(initialPaletteCount);

      // ---- Source video texture ----
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([20, 20, 20, 255])
      );

      // ---- Offscreen FBOs (3 buffers, ping-pong friendly) ----
      const makeFbo = () => {
        const t = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        const f = gl.createFramebuffer()!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, f);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
        return { tex: t, fbo: f, w: 0, h: 0 };
      };
      const fboA = makeFbo();
      const fboB = makeFbo();
      const fboC = makeFbo();

      const sizeFbos = (w: number, h: number) => {
        for (const f of [fboA, fboB, fboC]) {
          if (f.w === w && f.h === h) continue;
          gl.bindTexture(gl.TEXTURE_2D, f.tex);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
          f.w = w;
          f.h = h;
        }
      };

      // ---- Settings application ----
      let paletteInterval = Math.round(
        (1 - Math.max(0, Math.min(1, initialSettings.cluster?.tempo ?? 0))) * 3000
      ) + 33;
      let lastPaletteAt = -Infinity;

      const applySettings = () => {
        const settings = getBrioSettings();
        settingsRef.current = settings;

        const quad: Quadtone =
          getEffectiveQuadtone(getActivePaletteMode()) ??
          getEffectiveQuadtone("brio-four") ??
          quadtones[0];
        const quadStops = quad.stops.map(hexToRgb01);
        const paletteCount = clampPaletteCount(settings);
        if (centroids.length !== paletteCount) {
          centroids = seedCentroids(paletteCount);
        }

        paletteInterval = Math.round(
          (1 - Math.max(0, Math.min(1, settings.cluster?.tempo ?? 0))) * 3000
        ) + 33;

        // Prep program
        gl.useProgram(prepProg);
        if (uPrep.zoom) gl.uniform1f(uPrep.zoom, settings.zoom);
        if (uPrep.contrast) gl.uniform1f(uPrep.contrast, settings.contrast);
        if (uPrep.useColor) gl.uniform1f(uPrep.useColor, settings.toggles?.color ? 1.0 : 0.0);

        // Quad program
        gl.useProgram(quadProg);
        if (uQuad.thresholds) gl.uniform1fv(uQuad.thresholds, new Float32Array(settings.thresholds));
        if (uQuad.quad0) gl.uniform3f(uQuad.quad0, ...quadStops[0]);
        if (uQuad.quad1) gl.uniform3f(uQuad.quad1, ...quadStops[1]);
        if (uQuad.quad2) gl.uniform3f(uQuad.quad2, ...quadStops[2]);
        if (uQuad.quad3) gl.uniform3f(uQuad.quad3, ...quadStops[3]);
        if (uQuad.paletteMix) gl.uniform1f(uQuad.paletteMix, settings.cluster?.enabled ? 1.0 : 0.0);
        if (uQuad.paletteCount) gl.uniform1i(uQuad.paletteCount, paletteCount);
        uploadPalette(gl, uQuad.palette, centroids, paletteCount);

        // Disp program
        gl.useProgram(dispProg);
        if (uDisp.warpAmt) gl.uniform1f(uDisp.warpAmt, settings.warp ?? 0);
        if (uDisp.liquifyAmt) gl.uniform1f(uDisp.liquifyAmt, settings.liquify ?? 0);
        if (uDisp.morph) gl.uniform1f(uDisp.morph, settings.liquidFlow.enabled ? settings.liquidFlow.morph : 0);
        if (uDisp.flow) gl.uniform1f(uDisp.flow, settings.liquidFlow.enabled ? settings.liquidFlow.flow : 0);
        if (uDisp.scale) gl.uniform1f(uDisp.scale, settings.liquidFlow.enabled ? settings.liquidFlow.scale * 8.0 : 1.0);
        if (uDisp.warpOctaves) gl.uniform1i(uDisp.warpOctaves, settings.liquidFlow.enabled ? Math.round(settings.liquidFlow.warp) : 1);
        if (uDisp.lfEnabled) gl.uniform1f(uDisp.lfEnabled, settings.liquidFlow.enabled ? 1.0 : 0.0);
      };
      applySettings();

      // ---- Video source ----
      const video = document.createElement("video");
      video.src = reelVideo;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      video.autoplay = true;
      let imageW = 1;
      let imageH = 1;
      let mediaReady = false;
      video.addEventListener("loadeddata", () => {
        imageW = video.videoWidth;
        imageH = video.videoHeight;
        mediaReady = true;
      });
      video.play().catch(() => {});

      // ---- KMeans cluster sampling for palette ----
      const sampleW = 96;
      let sampleH = 54;
      const sample = document.createElement("canvas");
      sample.width = sampleW;
      sample.height = sampleH;
      const sctx = sample.getContext("2d", { willReadFrequently: true })!;

      const runKMeans = () => {
        if (!mediaReady || imageW === 0) return;
        const settings = settingsRef.current;
        const activeK = clampPaletteCount(settings);
        if (centroids.length !== activeK) centroids = seedCentroids(activeK);
        const aspect = imageH / imageW;
        sampleH = Math.max(1, Math.round(sampleW * aspect));
        if (sample.height !== sampleH) sample.height = sampleH;
        try {
          sctx.drawImage(video, 0, 0, sampleW, sampleH);
        } catch {
          return;
        }
        const data = sctx.getImageData(0, 0, sampleW, sampleH).data;
        const N = sampleW * sampleH;
        for (let it = 0; it < 4; it++) {
          const sums: number[][] = Array.from({ length: activeK }, () => [0, 0, 0, 0]);
          for (let i = 0; i < N; i++) {
            const o = i * 4;
            const r = data[o], g = data[o + 1], b = data[o + 2];
            let bestD = Infinity, bestK = 0;
            for (let k = 0; k < activeK; k++) {
              const c = centroids[k];
              const dr = r - c[0], dg = g - c[1], db = b - c[2];
              const d = dr * dr + dg * dg + db * db;
              if (d < bestD) { bestD = d; bestK = k; }
            }
            const s = sums[bestK];
            s[0] += r; s[1] += g; s[2] += b; s[3]++;
          }
          for (let k = 0; k < activeK; k++) {
            const s = sums[k];
            if (s[3] > 0) centroids[k] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
          }
        }
        const display: [number, number, number][] = centroids.map(([r, g, b]) => {
          const r1 = r / 255, g1 = g / 255, b1 = b / 255;
          const max = Math.max(r1, g1, b1);
          const min = Math.min(r1, g1, b1);
          let h = 0;
          const l = (max + min) / 2;
          const dl = max - min;
          let s = 0;
          if (dl !== 0) {
            s = dl / (1 - Math.abs(2 * l - 1));
            if (max === r1) h = ((g1 - b1) / dl) % 6;
            else if (max === g1) h = (b1 - r1) / dl + 2;
            else h = (r1 - g1) / dl + 4;
            h *= 60;
            if (h < 0) h += 360;
          }
          const s2 = Math.min(1, s * 1.6 + 0.15);
          const l2 = l < 0.5 ? Math.min(0.55, l * 1.15 + 0.05) : l;
          const c2 = (1 - Math.abs(2 * l2 - 1)) * s2;
          const x = c2 * (1 - Math.abs(((h / 60) % 2) - 1));
          const m = l2 - c2 / 2;
          let rr = 0, gg = 0, bb = 0;
          if (h < 60) { rr = c2; gg = x; }
          else if (h < 120) { rr = x; gg = c2; }
          else if (h < 180) { gg = c2; bb = x; }
          else if (h < 240) { gg = x; bb = c2; }
          else if (h < 300) { rr = x; bb = c2; }
          else { rr = c2; bb = x; }
          return [
            Math.max(0, Math.min(255, (rr + m) * 255)),
            Math.max(0, Math.min(255, (gg + m) * 255)),
            Math.max(0, Math.min(255, (bb + m) * 255)),
          ];
        });
        gl.useProgram(quadProg);
        uploadPalette(gl, uQuad.palette, display, activeK);
        if (uQuad.paletteCount) gl.uniform1i(uQuad.paletteCount, activeK);
      };

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
        const nextW = Math.max(2, Math.round(window.innerWidth * dpr));
        const nextH = Math.max(2, Math.round(window.innerHeight * dpr));
        if (canvas.width !== nextW || canvas.height !== nextH) {
          canvas.width = nextW;
          canvas.height = nextH;
        }
      };
      resize();
      window.addEventListener("resize", resize);

      // Pause the entire pipeline (and the source video) when the canvas is
      // offscreen. The brio rig is the most expensive thing on the page;
      // letting it run while the user is reading the rest of the homepage
      // saturates the main thread and makes scroll feel laggy.
      let visible = true;
      const io = new IntersectionObserver(
        (entries) => {
          const wasVisible = visible;
          visible = entries.some((e) => e.isIntersecting);
          if (visible && !wasVisible) {
            video.play().catch(() => {});
            if (raf === 0) raf = requestAnimationFrame(loop);
          } else if (!visible && wasVisible) {
            video.pause();
            if (raf) cancelAnimationFrame(raf);
            raf = 0;
          }
        },
        { rootMargin: "100px" },
      );
      io.observe(canvas);

      const onSettingsChange = () => {
        applySettings();
        lastPaletteAt = -Infinity;
      };
      window.addEventListener("brio-settings-changed", onSettingsChange);
      window.addEventListener("brio-palette-changed", onSettingsChange);
      window.addEventListener("storage", onSettingsChange);

      const drawQuad = () => gl.drawArrays(gl.TRIANGLES, 0, 6);

      let raf = 0;
      let simTime = 0;
      let last = performance.now();
      const loop = (now: number) => {
        if (!visible) { raf = 0; return; }
        const dt = (now - last) / 1000;
        last = now;
        simTime += dt * settingsRef.current.liquidFlow.speed;

        if (mediaReady) {
          // Slow the reel as the brio effect ramps in (1.0x -> 0.2x).
          const targetRate = 1.0 - 0.8 * amountRef.current;
          if (Math.abs(video.playbackRate - targetRate) > 0.01) {
            video.playbackRate = targetRate;
          }
          gl.bindTexture(gl.TEXTURE_2D, tex);
          try {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
          } catch {}
          if (now - lastPaletteAt >= paletteInterval) {
            lastPaletteAt = now;
            runKMeans();
          }
        }

        const cw = canvas.width;
        const ch = canvas.height;
        const fw = Math.max(2, Math.round(cw * FBO_SCALE));
        const fh = Math.max(2, Math.round(ch * FBO_SCALE));
        sizeFbos(fw, fh);

        const amt = amountRef.current;
        const settings = settingsRef.current;
        const b = Math.max(0, Math.min(1, settings.blur)) * amt;
        const blurPx = (b * 32 + Math.pow(b, 3) * 96) * FBO_SCALE;

        gl.bindBuffer(gl.ARRAY_BUFFER, buf);

        // ---- Pass 1: prep -> fboA ----
        gl.bindFramebuffer(gl.FRAMEBUFFER, fboA.fbo);
        gl.viewport(0, 0, fw, fh);
        gl.useProgram(prepProg);
        bindAttribs(prepProg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        if (uPrep.image) gl.uniform1i(uPrep.image, 0);
        if (uPrep.amount) gl.uniform1f(uPrep.amount, amt);
        if (uPrep.imageSize) gl.uniform2f(uPrep.imageSize, imageW, imageH);
        if (uPrep.canvasSize) gl.uniform2f(uPrep.canvasSize, cw, ch);
        drawQuad();

        // ---- Pass 2: blur H fboA -> fboB ----
        gl.bindFramebuffer(gl.FRAMEBUFFER, fboB.fbo);
        gl.viewport(0, 0, fw, fh);
        gl.useProgram(blurProg);
        bindAttribs(blurProg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, fboA.tex);
        if (uBlur.tex) gl.uniform1i(uBlur.tex, 0);
        if (uBlur.texel) gl.uniform2f(uBlur.texel, 1 / fw, 1 / fh);
        if (uBlur.dir) gl.uniform2f(uBlur.dir, 1, 0);
        if (uBlur.radiusPx) gl.uniform1f(uBlur.radiusPx, blurPx);
        drawQuad();

        // ---- Pass 3: blur V fboB -> fboA ----
        gl.bindFramebuffer(gl.FRAMEBUFFER, fboA.fbo);
        gl.viewport(0, 0, fw, fh);
        gl.bindTexture(gl.TEXTURE_2D, fboB.tex);
        if (uBlur.dir) gl.uniform2f(uBlur.dir, 0, 1);
        drawQuad();

        // ---- Pass 4: quadtone + palette fboA -> fboC ----
        gl.bindFramebuffer(gl.FRAMEBUFFER, fboC.fbo);
        gl.viewport(0, 0, fw, fh);
        gl.useProgram(quadProg);
        bindAttribs(quadProg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, fboA.tex);
        if (uQuad.tex) gl.uniform1i(uQuad.tex, 0);
        if (uQuad.amount) gl.uniform1f(uQuad.amount, amt);
        drawQuad();

        // ---- Pass 5: displace fboC -> screen ----
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, cw, ch);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(dispProg);
        bindAttribs(dispProg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, fboC.tex);
        if (uDisp.tex) gl.uniform1i(uDisp.tex, 0);
        if (uDisp.amount) gl.uniform1f(uDisp.amount, amt);
        if (uDisp.time) gl.uniform1f(uDisp.time, simTime);
        if (uDisp.canvasSize) gl.uniform2f(uDisp.canvasSize, cw, ch);
        drawQuad();

        raf = visible ? requestAnimationFrame(loop) : 0;
      };
      raf = requestAnimationFrame(loop);

      return () => {
        io.disconnect();
        if (raf) cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        window.removeEventListener("brio-settings-changed", onSettingsChange);
        window.removeEventListener("brio-palette-changed", onSettingsChange);
        window.removeEventListener("storage", onSettingsChange);
        video.pause();
        video.src = "";
        gl.deleteTexture(tex);
        for (const f of [fboA, fboB, fboC]) {
          gl.deleteTexture(f.tex);
          gl.deleteFramebuffer(f.fbo);
        }
        gl.deleteBuffer(buf);
        gl.deleteProgram(prepProg);
        gl.deleteProgram(blurProg);
        gl.deleteProgram(quadProg);
        gl.deleteProgram(dispProg);
      };
    }, []);

    return (
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full ${className ?? ""}`}
      />
    );
  }
);

HeroBrioCanvas.displayName = "HeroBrioCanvas";

export default HeroBrioCanvas;
