import { useEffect, useRef, type RefObject } from "react";

export interface LiquidFlowParams {
  enabled: boolean;
  speed: number;   // 0..2
  morph: number;   // 0..3
  flow: number;    // 0..3
  scale: number;   // 0.3..8
  warp: number;    // 1..4 (int)
}

interface Props extends LiquidFlowParams {
  mediaSrc: string;
  mediaKind: "video" | "image";
  className?: string;
  /** Optional live canvas source. Used when another effect has already rendered
   *  into a canvas and this WebGL pass should continue the chain from there. */
  sourceCanvasRef?: RefObject<HTMLCanvasElement>;
  /** Blur applied to the incoming texture before the liquid pass. */
  preBlur?: number;
  /** Optional SVG filter id to apply on top of the WebGL output, so the
   *  liquid effect stacks with brio (color/blur/contrast/warp) instead of
   *  replacing it. */
  filterId?: string;
  /** Compat props (unused here, accepted for type compatibility with newer ReelPreview). */
  cropX?: number;
  cropY?: number;
  cropSize?: number;
  zoom?: number;
  paused?: boolean;
  currentTime?: number;
  frameRateTempo?: number;
}

const VS = `
attribute vec2 a_pos;
varying vec2 vUv;
void main(){
  vUv = (a_pos + 1.0) * 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D u_image;
uniform float u_time;
uniform float u_morph;
uniform float u_flow;
uniform float u_scale;
uniform int   u_warp;
uniform vec2  u_imageSize;
uniform vec2  u_canvasSize;

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

void main(){
  vec2 uv = vUv;
  float arImg = u_imageSize.x / max(u_imageSize.y, 1.0);
  float arCan = u_canvasSize.x / max(u_canvasSize.y, 1.0);
  vec2 imgUv = uv;
  if (arCan > arImg) { float sY = arImg/arCan; imgUv.y = (uv.y-0.5)*sY+0.5; }
  else { float sX = arCan/arImg; imgUv.x = (uv.x-0.5)*sX+0.5; }
  imgUv.y = 1.0 - imgUv.y;

  float tA=u_time*0.10, tB=u_time*0.13, tC=u_time*0.17;
  vec2 p = uv * u_scale;
  vec2 q = vec2(snoise(p+tA), snoise(p+vec2(5.2,1.3)+tB));
  vec2 r = vec2(
    snoise(p+4.0*q+vec2(1.7,9.2)+tA*1.15),
    snoise(p+4.0*q+vec2(8.3,2.8)+tB*1.26)
  );
  if (u_warp >= 3) {
    r = vec2(
      snoise(p+4.0*r+vec2(3.1,6.7)+tC*0.83),
      snoise(p+4.0*r+vec2(0.4,4.5)+tC*0.97)
    );
  }
  if (u_warp >= 4) {
    r = vec2(
      snoise(p+4.0*r+vec2(2.1,1.7)+tA*1.40),
      snoise(p+4.0*r+vec2(7.3,0.5)+tB*1.10)
    );
  }
  float n = snoise(p+4.0*r+tC);
  vec2 disp = r * 0.20 * u_morph;
  vec2 warpedUv = clamp(imgUv + disp, 0.0, 1.0);
  vec4 src = texture2D(u_image, warpedUv);
  float flowValue = n * 0.40 * u_flow;
  vec3 col = clamp(src.rgb + flowValue * 0.25, 0.0, 1.0);
  gl_FragColor = vec4(col, src.a);
}`;

const LiquidFlowOverlay = ({
  enabled, speed, morph, flow, scale, warp,
  mediaSrc, mediaKind, className, sourceCanvasRef, preBlur = 0, filterId,
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaElRef = useRef<HTMLVideoElement | HTMLImageElement | null>(null);
  const stateRef = useRef({ speed, morph, flow, scale, warp, preBlur });
  stateRef.current = { speed, morph, flow, scale, warp, preBlur };

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: true, preserveDrawingBuffer: true });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(sh));
      }
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog); gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = {
      image: gl.getUniformLocation(prog, "u_image"),
      time: gl.getUniformLocation(prog, "u_time"),
      morph: gl.getUniformLocation(prog, "u_morph"),
      flow: gl.getUniformLocation(prog, "u_flow"),
      scale: gl.getUniformLocation(prog, "u_scale"),
      warp: gl.getUniformLocation(prog, "u_warp"),
      imageSize: gl.getUniformLocation(prog, "u_imageSize"),
      canvasSize: gl.getUniformLocation(prog, "u_canvasSize"),
    };

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([20, 20, 20, 255]));

    let imageSize: [number, number] = [1, 1];
    let mediaReady = false;
    let mediaEl: HTMLVideoElement | HTMLImageElement | null = null;
    const blurCanvas = document.createElement("canvas");
    const blurCtx = blurCanvas.getContext("2d")!;

    if (mediaKind === "video") {
      const v = document.createElement("video");
      v.src = mediaSrc; v.muted = true; v.loop = true; v.playsInline = true;
      v.crossOrigin = "anonymous"; v.autoplay = true;
      v.addEventListener("loadeddata", () => {
        imageSize = [v.videoWidth, v.videoHeight];
        mediaReady = true;
      });
      v.play().catch(() => {});
      mediaEl = v;
    } else {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        imageSize = [img.naturalWidth, img.naturalHeight];
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        mediaReady = true;
      };
      img.src = mediaSrc;
      mediaEl = img;
    }
    mediaElRef.current = mediaEl;

    // Pin the WebGL canvas internal pixel size to the viewport. CSS
    // (w-full h-full) stretches it to whatever the parent's current height
    // is, so scroll-driven layout changes never reallocate the GL buffer
    // (which would clear it and flash dark between frames).
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextW = Math.max(2, Math.round(window.innerWidth * dpr));
      const nextH = Math.max(2, Math.round(window.innerHeight * dpr));
      if (canvas.width !== nextW || canvas.height !== nextH) {
        canvas.width = nextW;
        canvas.height = nextH;
      }
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let simTime = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      simTime += dt * stateRef.current.speed;

      const sourceCanvas = sourceCanvasRef?.current;
      if (sourceCanvas?.width && sourceCanvas.height) {
        imageSize = [sourceCanvas.width, sourceCanvas.height];
        mediaReady = true;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        const blurPx = Math.max(0, stateRef.current.preBlur) * 32;
        if (blurPx > 0.01) {
          if (blurCanvas.width !== sourceCanvas.width) blurCanvas.width = sourceCanvas.width;
          if (blurCanvas.height !== sourceCanvas.height) blurCanvas.height = sourceCanvas.height;
          blurCtx.clearRect(0, 0, blurCanvas.width, blurCanvas.height);
          blurCtx.filter = `blur(${blurPx}px)`;
          blurCtx.drawImage(sourceCanvas, 0, 0, blurCanvas.width, blurCanvas.height);
          blurCtx.filter = "none";
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, blurCanvas);
        } else {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
        }
      } else if (mediaReady && mediaEl) {
        if (mediaKind === "video") {
          gl.bindTexture(gl.TEXTURE_2D, tex);
          try {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mediaEl as HTMLVideoElement);
          } catch { /* not ready */ }
        }
      }

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(u.image, 0);
      gl.uniform1f(u.time, simTime);
      gl.uniform1f(u.morph, stateRef.current.morph);
      gl.uniform1f(u.flow, stateRef.current.flow);
      gl.uniform1f(u.scale, stateRef.current.scale);
      gl.uniform1i(u.warp, Math.round(stateRef.current.warp));
      gl.uniform2f(u.imageSize, imageSize[0], imageSize[1]);
      gl.uniform2f(u.canvasSize, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      if (mediaEl && mediaKind === "video") {
        (mediaEl as HTMLVideoElement).pause();
        (mediaEl as HTMLVideoElement).src = "";
      }
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, [enabled, mediaSrc, mediaKind, sourceCanvasRef]);

  if (!enabled) return null;
  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className ?? ""}`}
      style={filterId ? { filter: `url(#${filterId})` } : undefined}
    />
  );
};

export default LiquidFlowOverlay;
