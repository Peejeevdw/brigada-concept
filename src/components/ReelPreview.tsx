import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_REEL_URL as reelVideo } from "@/lib/media";

import GrainOverlay from "@/components/GrainOverlay";
import LiquidFlowOverlay from "@/components/LiquidFlowOverlay";
import BrioWebGLOverlay from "@/components/BrioWebGLOverlay";
import {
  duotones,
  quadtones,
  getEffectiveQuadtone,
  expandStops4to7,
  DEFAULT_BRIO_TOGGLES,
  type BrioToggles,
  type BrioThresholds,
  type Duotone,
  type Quadtone,
} from "@/data/duotones";
import { BrioFilter, applyBrio, useBrioFilterId, type BrioRefs } from "@/lib/brio";

interface ReelPreviewProps {
  /** Selected palette id ("random", a duotone id, or a quadtone id). */
  mode: string;
  /** Per-stop luminance thresholds for the quadtone (0..1, ascending). */
  thresholds?: BrioThresholds;
  /** Grain opacity multiplier (0..2). */
  grain?: number;
  /** Blur amount (0..1). */
  blur?: number;
  /** Contrast amount (0..1). */
  contrast?: number;
  /** Warp amount (0..2). */
  warp?: number;
  /** Liquify amount (0..2). */
  liquify?: number;
  /** Zoom multiplier applied to the brio side (1 = default). */
  zoom?: number;
  /** Overall effect amount (0..1). 0 = no effect, 1 = full. */
  amount?: number;
  /** Per-effect on/off toggles. */
  toggles?: BrioToggles;
  /** Override the quadtone stops (for live previewing unsaved palette edits). */
  stopsOverride?: [string, string, string, string];
  /** Override the source media (uploaded file). */
  mediaSrc?: string;
  /** "video" or "image" — controls which element is rendered. */
  mediaKind?: "video" | "image";
  /** CSS aspect-ratio value, e.g. "16/9", "9/16", "1/1". */
  aspectRatio?: string;
  /** Optional logo overlay on the brio side. */
  logoSrc?: string;
  /** Optional text logo rendered with Brigada Variable font. */
  logoText?: string;
  /** Logo color (hex/css). Defaults to white. */
  logoColor?: string;
  /** Logo position 0..1 (fraction of frame). */
  logoX?: number;
  logoY?: number;
  /** Logo size as fraction of frame width (0..1). */
  logoSize?: number;
  /** Callback when the user drags the logo. Receives normalized 0..1 coordinates. */
  onLogoMove?: (pos: { x: number; y: number }) => void;
  /** Crop region of the source, 0..1 in cover-fit space. Default full frame. */
  cropX?: number;
  cropY?: number;
  cropSize?: number;
  /** Liquid Flow WebGL overlay params. */
  liquidFlow?: {
    enabled: boolean;
    speed: number;
    morph: number;
    flow: number;
    scale: number;
    warp: number;
  };
  /** Mesh (gradient-mesh) effect over footage colours. */
  cluster?: {
    enabled: boolean;
    /** Deprecated. Video frame stepping cadence (0..4). Mesh tempo was removed. */
    tempo?: number;
    /** Deprecated alias for `points`. */
    colors?: number;
    /** Number of mesh control points (2..16). Default 6. */
    points?: number;
    /** 0..1 normalized Cauchy power: 0 = soft gradient, 1 = near-Voronoi. */
    sharpness?: number;
    /** 0..1 saturation boost applied to mesh point colors. */
    vibrance?: number;
    /** When provided, skip k-means; use these hex colors as fixed centroids. */
    paletteColors?: string[];
  };
  /** Tone overlay applied on top of all effects ("none", "dark", "light"). */
  overlay?: "none" | "dark" | "light";
  className?: string;
  /** When provided, mirrors play/pause/seek from this video into both preview videos. */
  controllerRef?: React.RefObject<HTMLVideoElement>;
  /** When true, run the full brio chain (blur, contrast, palette, warp, liquify,
   *  grain, cluster, tone, lava) in a single WebGL canvas instead of SVG filters +
   *  Canvas2D cluster + SVG grain + separate lava overlay. Used by /v3. */
  webgl?: boolean;
  /** Lava-lamp metaball pass (only used when webgl=true; folded into the chain). */
  lava?: {
    enabled: boolean;
    intensity: number;
    softness: number;
    speed: number;
    scale: number;
    blobCount: number;
    blur: number;
    /** Blob-pull strength. Defaults to the locked 0.85 if omitted. */
    pull?: number;
  };
  /** Receives the live extracted cluster colors when cluster.enabled. */
  onClusterColors?: (colors: string[]) => void;
}

const ReelPreview = ({
  mode,
  thresholds,
  grain = 1,
  blur = 1,
  contrast = 0,
  warp = 0,
  liquify = 0,
  zoom = 1,
  amount = 1,
  toggles = DEFAULT_BRIO_TOGGLES,
  stopsOverride,
  mediaSrc,
  mediaKind = "video",
  aspectRatio,
  logoSrc,
  logoText,
  logoColor,
  logoX = 0.5,
  logoY = 0.5,
  logoSize = 0.25,
  onLogoMove,
  cropX = 0.5,
  cropY = 0.5,
  cropSize = 1,
  liquidFlow,
  cluster,
  overlay = "none",
  className,
  controllerRef,
  webgl = false,
  lava,
  onClusterColors,
}: ReelPreviewProps) => {
  const srcUrl = mediaSrc ?? reelVideo;
  const isImage = mediaKind === "image";
  const fid = useBrioFilterId("inkblot-reel-preview");
  const cs = Math.max(0.05, Math.min(1, cropSize));
  const rawTransform = `scale(${(1.05 / cs).toFixed(4)}) translate(${((0.5 - cropX) * 100).toFixed(3)}%, ${((0.5 - cropY) * 100).toFixed(3)}%)`;
  const z = Math.max(0.5, Math.min(4, zoom));
  const brioTransform = `scale(${(1.25 * z / cs).toFixed(4)}) translate(${((0.5 - cropX) * 100).toFixed(3)}%, ${((0.5 - cropY) * 100).toFixed(3)}%)`;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || !aspectRatio) return;
    const [arW, arH] = aspectRatio.split("/").map(Number);
    if (!arW || !arH) return;
    const ar = arW / arH;
    const update = () => {
      const r = el.getBoundingClientRect();
      const cw = r.width, ch = r.height;
      if (!cw || !ch) return;
      const containerAr = cw / ch;
      if (containerAr > ar) {
        setFit({ w: ch * ar, h: ch });
      } else {
        setFit({ w: cw, h: cw / ar });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspectRatio]);

  const rawVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // "Previous frame" video stacked underneath videoRef. Used to crossfade
  // between discrete frame steps when the video frame rate slider is < live.
  const prevVideoRef = useRef<HTMLVideoElement>(null);
  const [controllerPaused, setControllerPaused] = useState(false);
  const [controllerTime, setControllerTime] = useState(0);
  // Frame element used as portal target for the unified WebGL overlay.
  const [brioFrameEl, setBrioFrameEl] = useState<HTMLDivElement | null>(null);

  // Mirror playback from an external controller video (e.g. focus picker).
  useEffect(() => {
    if (!controllerRef) return;
    let raf = 0;
    let cancelled = false;
    let detach: (() => void) | null = null;

    const SEEK_EPSILON = 0.05;
    const mirror = (action: "play" | "pause" | "seek", time?: number) => {
      [videoRef.current, rawVideoRef.current].forEach((v) => {
        if (!v || typeof (v as HTMLVideoElement).pause !== "function") return;
        if (action === "seek" && typeof time === "number") {
          if (Math.abs(v.currentTime - time) > SEEK_EPSILON) v.currentTime = time;
        } else if (action === "play" && v.paused) {
          v.play().catch(() => {});
        } else if (action === "pause" && !v.paused) {
          v.pause();
        }
      });
    };

    const attach = (c: HTMLVideoElement) => {
      const onPlay = () => { setControllerTime(c.currentTime); setControllerPaused(false); mirror("play"); };
      const onPause = () => { setControllerTime(c.currentTime); mirror("seek", c.currentTime); setControllerPaused(true); mirror("pause"); };
      const onSeek = () => { setControllerTime(c.currentTime); mirror("seek", c.currentTime); };
      const onTime = () => {
        // Keep in sync while paused (scrubbing fires timeupdate too).
        if (c.paused) { setControllerTime(c.currentTime); mirror("seek", c.currentTime); }
      };
      c.addEventListener("play", onPlay);
      c.addEventListener("pause", onPause);
      c.addEventListener("seeked", onSeek);
      c.addEventListener("seeking", onSeek);
      c.addEventListener("timeupdate", onTime);
      // Initial sync.
      mirror("seek", c.currentTime);
      setControllerTime(c.currentTime);
      setControllerPaused(c.paused);
      mirror(c.paused ? "pause" : "play");
      return () => {
        c.removeEventListener("play", onPlay);
        c.removeEventListener("pause", onPause);
        c.removeEventListener("seeked", onSeek);
        c.removeEventListener("seeking", onSeek);
        c.removeEventListener("timeupdate", onTime);
      };
    };

    const tryAttach = () => {
      if (cancelled) return;
      const c = controllerRef.current;
      if (c) detach = attach(c);
      else raf = requestAnimationFrame(tryAttach);
    };
    tryAttach();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      detach?.();
    };
  }, [controllerRef, mediaSrc, mediaKind]);

  // Re-enforce the controller's paused state on every render. The brio video
  // element has autoPlay, so visibility/branch flips (palette change, liquid
  // toggle, etc.) can re-trigger playback even when the controller is paused.
  useEffect(() => {
    const steppedMode =
      !isImage && Math.max(0, Math.min(4, Math.round(tempoRef.current))) < 4;
    [videoRef.current, rawVideoRef.current].forEach((v) => {
      if (!v || typeof (v as HTMLVideoElement).pause !== "function") return;
      if (controllerPaused && !v.paused) v.pause();
      // Don't force-play when the tempo stepper is driving the video.
      if (!controllerPaused && v.paused && !steppedMode) v.play().catch(() => {});
    });
  });

  const brioRefs: BrioRefs = {
    desat: useRef<SVGFEColorMatrixElement>(null),
    contrast: useRef<SVGFEColorMatrixElement>(null),
    blur: useRef<SVGFEGaussianBlurElement>(null),
    tint: useRef<SVGFEColorMatrixElement>(null),
    quadR: useRef<SVGFEFuncRElement>(null),
    quadG: useRef<SVGFEFuncGElement>(null),
    quadB: useRef<SVGFEFuncBElement>(null),
    disp: useRef<SVGFEDisplacementMapElement>(null),
    liquify: useRef<SVGFEDisplacementMapElement>(null),
  };

  // The currently *applied* palette/preset. Updates are deferred until the
  // mask is fully off screen so users never see the gray intermediate state.
  const [appliedMode, setAppliedMode] = useState(mode);
  const [appliedStops, setAppliedStops] = useState<typeof stopsOverride>(stopsOverride);
  const appliedOverrideKey = appliedStops ? appliedStops.join("|") : "";

  const { duotone, quadtone } = useMemo<{
    duotone: Duotone | null;
    quadtone: Quadtone | null;
  }>(() => {
    const base = getEffectiveQuadtone(appliedMode) ?? quadtones.find((x) => x.id === appliedMode);
    if (base) {
      // Override is a legacy 4-stop tuple; expand to the new 7-stop model.
      const q: Quadtone = appliedStops
        ? { ...base, stops: expandStops4to7(appliedStops) }
        : base;
      return { duotone: null, quadtone: q };
    }
    const d = duotones.find((x) => x.id === appliedMode);
    if (d) return { duotone: d, quadtone: null };
    // Unknown mode (e.g. "footage"): no palette mapping, let the shader pass through.
    return { duotone: null, quadtone: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedMode, appliedOverrideKey]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.style.filter = webgl ? "" : `url(#${fid})`;
    }
    if (prevVideoRef.current) {
      prevVideoRef.current.style.filter = webgl ? "" : `url(#${fid})`;
    }
    applyBrio(brioRefs, {
      amount,
      settings: {
        thresholds: thresholds ?? [0.20, 0.30, 0.45, 0.55, 0.70, 0.80],
        grain,
        blur,
        contrast,
        warp,
        liquify,
        toggles,
      },
      quadtone,
      duotone,
    });
    // Force a repaint of the filtered element. Paused <video> elements don't
    // automatically re-render when only the SVG filter primitives change, so
    // toggling the filter style here makes palette/threshold edits visible
    // on the current still frame.
    const el = videoRef.current;
    if (el) {
      const prev = el.style.filter;
      el.style.filter = "none";
      // Read layout to flush.
      void el.offsetWidth;
      el.style.filter = prev;
    }
  }, [duotone, quadtone, fid, thresholds, toggles, blur, contrast, grain, warp, liquify, amount, isImage, srcUrl]);

  // Footage-color clustering: when enabled, run a small k-means each frame to
  // quantize the video into the selected number of dominant colors and draw it on a canvas. The
  // canvas is layered on top of the brio chain (clipped to the brio side).
  const clusterEnabled = !!cluster?.enabled && !webgl;
  const clusterCanvasRef = useRef<HTMLCanvasElement>(null);
  const tempoRef = useRef(cluster?.tempo ?? 1);
  const colorsRef = useRef(Math.max(2, Math.min(16, cluster?.colors ?? 4)));
  const paletteRef = useRef<[number, number, number][] | null>(null);
  const parseHex = (h: string): [number, number, number] | null => {
    const m = /^#?([0-9a-fA-F]{6})$/.exec(h.trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  useEffect(() => { tempoRef.current = cluster?.tempo ?? 1; }, [cluster?.tempo]);
  useEffect(() => { colorsRef.current = Math.max(2, Math.min(16, cluster?.colors ?? 4)); }, [cluster?.colors]);
  useEffect(() => {
    const list = cluster?.paletteColors;
    if (list && list.length >= 2) {
      const parsed = list.map(parseHex).filter((c): c is [number, number, number] => !!c);
      paletteRef.current = parsed.length >= 2 ? parsed : null;
    } else {
      paletteRef.current = null;
    }
    clusterDirtyRef.current++;
  }, [cluster?.paletteColors]);

  // Always honor the "video frame rate" (tempo) setting by stepping the source
  // videos discretely instead of playing live.
  const controllerPausedRef = useRef(false);
  useEffect(() => { controllerPausedRef.current = controllerPaused; }, [controllerPaused]);
  const enforceFrozenControllerFrame = () => {
    const c = controllerRef?.current;
    if (!c || !c.paused) return;
    controllerPausedRef.current = true;
    if (!controllerPausedRef.current) setControllerPaused(true);
    setControllerTime((time) => (Math.abs(time - c.currentTime) > 0.03 ? c.currentTime : time));
    [videoRef.current, rawVideoRef.current].forEach((v) => {
      if (!v || typeof (v as HTMLVideoElement).pause !== "function") return;
      if (!v.paused) v.pause();
      if (Math.abs(v.currentTime - c.currentTime) > 0.03) {
        try { v.currentTime = c.currentTime; } catch {}
      }
    });
  };
  useEffect(() => {
    if (isImage) return;
    let raf = 0;
    let lastAdvance = performance.now();
    let crossfadeFrom = performance.now();
    let crossfadeMs = 0;
    const HOLDS = [1500, 1000, 500, 250, 0];
    // Default to ~250ms crossfade, clamped to the hold interval.
    const CROSSFADE_MS = 300;
    const setOpacities = (nextOp: number, prevOp: number) => {
      const v = videoRef.current;
      const pv = prevVideoRef.current;
      if (v) v.style.opacity = String(nextOp);
      if (pv) pv.style.opacity = String(prevOp);
    };
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      // When footage is actively playing, always use live framerate and
      // ignore the stepped tempo. Stepping only applies while paused/scrubbed.
      const playingLive = !controllerPausedRef.current;
      const step = playingLive ? 4 : Math.max(0, Math.min(4, Math.round(tempoRef.current)));
      const interval = HOLDS[step];
      const v = videoRef.current as HTMLVideoElement | null;
      const rv = rawVideoRef.current as HTMLVideoElement | null;
      const pv = prevVideoRef.current as HTMLVideoElement | null;
      enforceFrozenControllerFrame();
      if (controllerPausedRef.current) {
        setOpacities(1, 0);
        return;
      }
      if (interval === 0) {
        // Live playback: ensure crossfade layer is off.
        setOpacities(1, 0);
        if (v && v.paused) v.play().catch(() => {});
        if (rv && rv.paused) rv.play().catch(() => {});
        if (pv && !pv.paused) pv.pause();
        return;
      }
      if (v && !v.paused) v.pause();
      if (rv && !rv.paused) rv.pause();
      if (pv && !pv.paused) pv.pause();
      if (now - lastAdvance >= interval) {
        lastAdvance = now;
        // Snapshot the OLD frame onto the prev video before bumping next.
        const dt = interval / 1000;
        if (v && pv) {
          try { pv.currentTime = v.currentTime; } catch { /* ignore */ }
        }
        const bump = (el: HTMLVideoElement) => {
          const d = el.duration || 0;
          el.currentTime = d > 0 ? (el.currentTime + dt) % d : el.currentTime + dt;
        };
        if (v) bump(v);
        if (rv) bump(rv);
        // Force the SVG-filtered video to repaint the new frame.
        if (v) {
          const prev = v.style.filter;
          v.style.filter = "none";
          void v.offsetWidth;
          v.style.filter = prev;
        }
        if (pv) {
          const prev = pv.style.filter;
          pv.style.filter = "none";
          void pv.offsetWidth;
          pv.style.filter = prev;
        }
        crossfadeFrom = now;
        crossfadeMs = Math.min(CROSSFADE_MS, interval);
        setOpacities(0, 1);
      } else if (crossfadeMs > 0) {
        const p = Math.min(1, (now - crossfadeFrom) / crossfadeMs);
        // Smoothstep for a softer fade.
        const s = p * p * (3 - 2 * p);
        setOpacities(s, 1 - s);
        if (p >= 1) crossfadeMs = 0;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      const v = videoRef.current as HTMLVideoElement | null;
      const rv = rawVideoRef.current as HTMLVideoElement | null;
      const pv = prevVideoRef.current as HTMLVideoElement | null;
      if (v) v.style.opacity = "1";
      if (pv) pv.style.opacity = "0";
      if (v && v.paused && !controllerPausedRef.current) v.play().catch(() => {});
      if (rv && rv.paused && !controllerPausedRef.current) rv.play().catch(() => {});
    };
  }, [isImage, srcUrl]);
  // Keep latest zoom/crop in refs so the cluster sampler reads the currently
  // visible (post-zoom) region without re-creating the RAF loop on each change.
  const zoomRef = useRef(z);
  const cropXRef = useRef(cropX);
  const cropYRef = useRef(cropY);
  const csRef = useRef(cs);
  const clusterDirtyRef = useRef(0);
  useEffect(() => { zoomRef.current = z; clusterDirtyRef.current++; }, [z]);
  useEffect(() => { cropXRef.current = cropX; clusterDirtyRef.current++; }, [cropX]);
  useEffect(() => { cropYRef.current = cropY; clusterDirtyRef.current++; }, [cropY]);
  useEffect(() => { csRef.current = cs; clusterDirtyRef.current++; }, [cs]);
  useEffect(() => {
    if (!clusterEnabled) return;
    const canvas = clusterCanvasRef.current;
    if (!canvas) return;

    // Source: either the raw video element, or a loaded HTMLImageElement.
    const video = isImage ? null : rawVideoRef.current;
    let imageEl: HTMLImageElement | null = null;
    let imageReady = false;
    let cancelled = false;
    if (isImage) {
      imageEl = new Image();
      imageEl.crossOrigin = "anonymous";
      imageEl.onload = () => {
        if (cancelled) return;
        imageReady = true;
        clusterDirtyRef.current++;
      };
      imageEl.src = srcUrl;
    }

    const onSeek = () => { clusterDirtyRef.current++; };
    if (video) {
      video.addEventListener("seeked", onSeek);
      video.addEventListener("loadeddata", onSeek);
    }

    const W = 160;
    let H = 90;
    const sample = document.createElement("canvas");
    sample.width = W; sample.height = H;
    const sctx = sample.getContext("2d", { willReadFrequently: true })!;
    const dctx = canvas.getContext("2d")!;

    const prevC = document.createElement("canvas");
    const nextC = document.createElement("canvas");
    prevC.width = nextC.width = W;
    prevC.height = nextC.height = H;
    const pctx = prevC.getContext("2d")!;
    const nctx = nextC.getContext("2d")!;
    let hasPrev = false;
    let hasNext = false;

    // Initial centroids spread across the luma range so k-means converges
    // to dominant footage colors (matches the original Motion UI behavior).
    const seedCentroids = (K: number): [number, number, number][] => {
      const out: [number, number, number][] = [];
      for (let k = 0; k < K; k++) {
        const v = K === 1 ? 128 : Math.round((k / (K - 1)) * 255);
        out.push([v, v, v]);
      }
      return out;
    };
    let centroids: [number, number, number][] = seedCentroids(Math.max(2, Math.min(16, colorsRef.current)));
    let lastK = centroids.length;

    let raf = 0;
    let frame = 0;
    let lastUpdate = 0;
    let interval = 0;
    let lastDirty = clusterDirtyRef.current;

    const getSource = (): { el: CanvasImageSource; w: number; h: number } | null => {
      if (video) {
        if (video.readyState < 2 || video.videoWidth === 0) return null;
        return { el: video, w: video.videoWidth, h: video.videoHeight };
      }
      if (imageEl && imageReady && imageEl.naturalWidth > 0) {
        return { el: imageEl, w: imageEl.naturalWidth, h: imageEl.naturalHeight };
      }
      return null;
    };

    const computeNext = () => {
      const src = getSource();
      if (!src) return;
      const aspect = src.h / src.w;
      H = Math.max(1, Math.round(W * aspect));
      if (sample.height !== H) sample.height = H;
      if (canvas.width !== W) canvas.width = W;
      if (canvas.height !== H) canvas.height = H;
      if (prevC.height !== H) prevC.height = H;
      if (nextC.height !== H) nextC.height = H;

      const vW = src.w, vH = src.h;
      const scale = 1.25 * zoomRef.current / csRef.current;
      const srcW = vW / scale;
      const srcH = vH / scale;
      const sx = (vW - srcW) / 2 - (0.5 - cropXRef.current) * vW;
      const sy = (vH - srcH) / 2 - (0.5 - cropYRef.current) * vH;
      sctx.drawImage(src.el, sx, sy, srcW, srcH, 0, 0, W, H);
      const img = sctx.getImageData(0, 0, W, H);
      const data = img.data;
      const N = W * H;
      const palette = paletteRef.current;
      const K = palette
        ? palette.length
        : Math.max(2, Math.min(16, colorsRef.current));

      let displayCentroids: [number, number, number][];

      if (palette) {
        // Fixed-palette mode: skip k-means, use the provided colors as-is.
        centroids = palette;
        lastK = K;
        displayCentroids = palette;
      } else {
        if (K !== lastK) {
          centroids = seedCentroids(K);
          lastK = K;
        }

        const iters = frame % 6 === 0 ? 4 : 1;
        frame++;

        for (let it = 0; it < iters; it++) {
          const sums: number[][] = Array.from({ length: K }, () => [0, 0, 0, 0]);
          for (let i = 0; i < N; i++) {
            const o = i * 4;
            const r = data[o], g = data[o + 1], b = data[o + 2];
            let bestD = Infinity, bestK = 0;
            for (let k = 0; k < K; k++) {
              const c = centroids[k];
              const dr = r - c[0], dg = g - c[1], db = b - c[2];
              const d = dr * dr + dg * dg + db * db;
              if (d < bestD) { bestD = d; bestK = k; }
            }
            const s = sums[bestK];
            s[0] += r; s[1] += g; s[2] += b; s[3]++;
          }
          for (let k = 0; k < K; k++) {
            const s = sums[k];
            if (s[3] > 0) centroids[k] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
          }
        }

        // Brighten centroids: push saturation up and lift very dark colors so
        // the clustered output reads as vivid rather than muddy.
        displayCentroids = centroids.slice(0, K).map(([r, g, b]) => {
          const r1 = r / 255, g1 = g / 255, b1 = b / 255;
          const max = Math.max(r1, g1, b1), min = Math.min(r1, g1, b1);
          let h = 0;
          const l = (max + min) / 2;
          const d = max - min;
          let s = 0;
          if (d !== 0) {
            s = d / (1 - Math.abs(2 * l - 1));
            if (max === r1) h = ((g1 - b1) / d) % 6;
            else if (max === g1) h = (b1 - r1) / d + 2;
            else h = (r1 - g1) / d + 4;
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
      }

      for (let i = 0; i < N; i++) {
        const o = i * 4;
        const r = data[o], g = data[o + 1], b = data[o + 2];
        let bestD = Infinity, bestK = 0;
        for (let k = 0; k < K; k++) {
          const c = centroids[k];
          const dr = r - c[0], dg = g - c[1], db = b - c[2];
          const d = dr * dr + dg * dg + db * db;
          if (d < bestD) { bestD = d; bestK = k; }
        }
        const c = displayCentroids[bestK];
        data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2];
      }

      if (hasNext) {
        pctx.clearRect(0, 0, W, H);
        pctx.drawImage(nextC, 0, 0);
        hasPrev = true;
      }
      nctx.putImageData(img, 0, 0);
      hasNext = true;
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!getSource()) return;
      // When the controller is paused, freeze the cluster preview too: no
      // recompute, no crossfade progress, keep the last drawn frame.
      if (controllerPausedRef.current) { lastUpdate = now; return; }
      // tempo is a discrete step 0..4 mapped to hold durations:
      // 0 -> 3000ms, 1 -> 2000ms, 2 -> 1000ms, 3 -> 500ms, 4 -> 0 (live).
      // When footage is playing, force live updates regardless of tempo.
      const playingLive = !controllerPausedRef.current && !isImage;
      const step = playingLive ? 4 : Math.max(0, Math.min(4, Math.round(tempoRef.current)));
      const HOLDS = [1500, 1000, 500, 250, 0];
      // For static images, only update when crop/zoom/colors change.
      interval = isImage ? Infinity : HOLDS[step];
      const dirty = clusterDirtyRef.current !== lastDirty;
      const timeUp = interval !== Infinity && now - lastUpdate >= interval;
      if (dirty || timeUp) {
        lastDirty = clusterDirtyRef.current;
        lastUpdate = now;
        computeNext();
      }
      if (!hasNext) return;
      const progress = interval > 0 && interval !== Infinity ? Math.min(1, (now - lastUpdate) / interval) : 1;
      dctx.clearRect(0, 0, canvas.width, canvas.height);
      if (hasPrev && interval !== Infinity) {
        dctx.globalAlpha = 1;
        dctx.drawImage(prevC, 0, 0, canvas.width, canvas.height);
        dctx.globalAlpha = progress;
        dctx.drawImage(nextC, 0, 0, canvas.width, canvas.height);
        dctx.globalAlpha = 1;
      } else {
        dctx.drawImage(nextC, 0, 0, canvas.width, canvas.height);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (video) {
        video.removeEventListener("seeked", onSeek);
        video.removeEventListener("loadeddata", onSeek);
      }
      if (imageEl) imageEl.onload = null;
    };
  }, [clusterEnabled, srcUrl, isImage, cluster?.colors]);

  const [split, setSplit] = useState(0); // fully revealed (no before/after slider)
  const [transitionSplit, setTransitionSplit] = useState<number | null>(100);
  const [animating, setAnimating] = useState(true);
  const animatingRef = useRef(false);
  const displaySplit = transitionSplit ?? split;
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  // Animate the mask away, swap to the new preset while it's hidden, then
  // animate back. This keeps users from ever seeing the gray intermediate.
  const isFirstChangeRef = useRef(true);
  const incomingOverrideKey = stopsOverride ? stopsOverride.join("|") : "";
  useEffect(() => {
    setAppliedMode(mode);
    setAppliedStops(stopsOverride);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Apply override stops live without re-running the reveal animation.
  useEffect(() => {
    if (animatingRef.current) return;
    setAppliedStops(stopsOverride);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingOverrideKey]);

  // Attach a non-passive wheel listener so we can preventDefault and stop the
  // browser from bouncing the page when scrolling over the preview.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (animatingRef.current) return;
      const width = el.getBoundingClientRect().width || 1;
      const deltaPct = (e.deltaY / width) * 100;
      setSplit((s) => Math.max(0, Math.min(100, s - deltaPct)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const updateFromClientX = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplit(Math.max(0, Math.min(100, pct)));
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      updateFromClientX(e.clientX);
    };
    const onUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const sizedStyle: React.CSSProperties = aspectRatio && fit
    ? { width: `${fit.w}px`, height: `${fit.h}px` }
    : { width: "100%", height: "100%" };

  return (
    <div ref={wrapperRef} className={`flex items-center justify-center w-full h-full ${className ?? ""}`}>
      <div
        ref={containerRef}
        className="relative overflow-hidden bg-[#1F1B16] select-none overscroll-contain"
        style={sizedStyle}
      >
      <BrioFilter
        id={fid}
        refs={brioRefs}
        region={{ x: "-50%", y: "-50%", width: "200%", height: "200%" }}
      />

      {/* Raw media (underneath) */}
      {isImage ? (
        <img
          src={srcUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ transform: rawTransform, willChange: "transform", transformOrigin: "center", visibility: "hidden" }}
        />
      ) : (
        <video crossOrigin="anonymous"
          ref={rawVideoRef}
          src={srcUrl}
          autoPlay
          preload="metadata"
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          style={{ transform: rawTransform, willChange: "transform", transformOrigin: "center", visibility: "hidden" }}
        />
      )}

      {/* Brio effect always fully visible. */}
      <div ref={setBrioFrameEl} className="absolute inset-0 bg-[#1F1B16]">
        {isImage ? (
          <img
            ref={videoRef as unknown as React.RefObject<HTMLImageElement>}
            src={srcUrl}
            alt=""
            className="h-full w-full object-cover"
            style={{
              transform: brioTransform,
              willChange: "transform",
              transformOrigin: "center",
              visibility: webgl || (liquidFlow?.enabled && ((liquidFlow.morph ?? 0) > 0 || (liquidFlow.scale ?? 0) > 0)) || clusterEnabled ? "hidden" : "visible",
            }}
          />
        ) : (
          <>
            {/* Previous-frame video, stacked underneath videoRef for crossfade. */}
            <video crossOrigin="anonymous"
              ref={prevVideoRef}
              src={srcUrl}
              preload="metadata"
              muted
              loop
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
              style={{
                transform: brioTransform,
                willChange: "transform, opacity",
                transformOrigin: "center",
                opacity: 0,
                visibility: webgl || (liquidFlow?.enabled && ((liquidFlow.morph ?? 0) > 0 || (liquidFlow.scale ?? 0) > 0)) || clusterEnabled ? "hidden" : "visible",
              }}
            />
            <video crossOrigin="anonymous"
              ref={videoRef}
              src={srcUrl}
              autoPlay
              preload="metadata"
              muted
              loop
              playsInline
              className="relative h-full w-full object-cover"
              style={{
                transform: brioTransform,
                willChange: "transform, opacity",
                transformOrigin: "center",
                visibility: webgl || (liquidFlow?.enabled && ((liquidFlow.morph ?? 0) > 0 || (liquidFlow.scale ?? 0) > 0)) || clusterEnabled ? "hidden" : "visible",
              }}
            />
          </>
        )}
        {liquidFlow?.enabled && ((liquidFlow.morph ?? 0) > 0 || (liquidFlow.scale ?? 0) > 0) && (
          <LiquidFlowOverlay
            enabled
            speed={liquidFlow.speed}
            morph={liquidFlow.morph}
            flow={liquidFlow.flow}
            scale={liquidFlow.scale}
            warp={liquidFlow.warp}
            cropX={cropX}
            cropY={cropY}
            cropSize={cs}
            zoom={z}
            mediaSrc={srcUrl}
            mediaKind={isImage ? "image" : "video"}
            sourceCanvasRef={clusterEnabled ? clusterCanvasRef : undefined}
            preBlur={clusterEnabled ? blur : 0}
            filterId={clusterEnabled ? undefined : fid}
            paused={controllerPaused}
            currentTime={controllerTime}
            frameRateTempo={cluster?.tempo ?? 1}
          />
        )}
        {clusterEnabled && (
          <canvas
            ref={clusterCanvasRef}
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
            style={{
              imageRendering: "pixelated",
              opacity: liquidFlow?.enabled && ((liquidFlow.morph ?? 0) > 0 || (liquidFlow.scale ?? 0) > 0) ? 0 : 1,
              filter: blur > 0 ? `blur(${(blur * 20).toFixed(2)}px)` : undefined,
              transform: blur > 0 ? `scale(${(1 + blur * 0.12).toFixed(3)})` : undefined,
              transformOrigin: "center",
            }}
          />
        )}
        {webgl && (
          <BrioWebGLOverlay
            target={brioFrameEl}
            amount={amount}
            settings={{
              thresholds: thresholds ?? [0.20, 0.30, 0.45, 0.55, 0.70, 0.80],
              grain,
              blur,
              contrast,
              warp,
              liquify,
              toggles,
            }}
            quadtone={quadtone}
            duotone={duotone}
            cropX={cropX}
            cropY={cropY}
            cropSize={cs}
            zoom={z}
            overlay={overlay}
            cluster={cluster}
            lava={lava ? { ...lava, pull: lava.pull ?? 0.85 } : undefined}
            onClusterColors={onClusterColors}
          />
        )}
        {!webgl && (
          <GrainOverlay
            opacity={1.0 * Math.max(0, Math.min(2, grain))}
          />
        )}

        {!webgl && overlay !== "none" && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundColor: overlay === "dark" ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)",
            }}
          />
        )}

        {/* Optional logo overlay (brio side only) */}
        {(logoText || logoSrc) && (
          <div
            onPointerDown={(e) => {
              if (!onLogoMove) return;
              const parent = (e.currentTarget.parentElement as HTMLElement) ?? e.currentTarget;
              const target = e.currentTarget as HTMLElement;
              target.setPointerCapture(e.pointerId);
              const move = (ev: PointerEvent) => {
                const r = parent.getBoundingClientRect();
                const x = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
                const y = Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height));
                onLogoMove({ x, y });
              };
              const up = () => {
                target.removeEventListener("pointermove", move as EventListener);
                target.removeEventListener("pointerup", up as EventListener);
                target.removeEventListener("pointercancel", up as EventListener);
              };
              target.addEventListener("pointermove", move as EventListener);
              target.addEventListener("pointerup", up as EventListener);
              target.addEventListener("pointercancel", up as EventListener);
            }}
            className="absolute select-none"
            style={{
              left: `${logoX * 100}%`,
              top: `${logoY * 100}%`,
              width: `${logoSize * 100}%`,
              transform: "translate(-50%, -50%)",
              cursor: onLogoMove ? "grab" : "default",
              touchAction: "none",
            }}
          >
            {logoText ? (
              <svg
                className="block w-full overflow-visible pointer-events-none"
                viewBox="0 0 100 24"
                preserveAspectRatio="xMidYMid meet"
              >
                <text
                  x="50"
                  y="12"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="20"
                  fill={logoColor ?? "#f3f2ef"}
                  style={{
                    fontFamily: '"Brigada Variable", "Brigada Sans", sans-serif',
                    fontVariationSettings: '"wght" 700',
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {logoText}
                </text>
              </svg>
            ) : (
              <img src={logoSrc} alt="" className="block w-full pointer-events-none" style={{ objectFit: "contain" }} />
            )}
          </div>
        )}
      </div>

      </div>
    </div>
  );
};

export default ReelPreview;
