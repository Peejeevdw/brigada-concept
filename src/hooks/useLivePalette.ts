import { useEffect, useRef, useState } from "react";
import { buildQuadtoneFromDominant } from "@/lib/extractDominantColors";

const SAMPLE_W = 96;

const toHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();

/**
 * Continuously sample the dominant colors of a media source and produce
 * quadtone stops that update in real time. For video, samples once per
 * `intervalMs`. For image, samples once.
 */
export const useLivePalette = (
  src: string,
  kind: "video" | "image",
  enabled: boolean,
  intervalMs = 400,
) => {
  const [stops, setStops] = useState<[string, string, string, string] | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const elRef = useRef<HTMLVideoElement | HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled) {
      setStops(null);
      setColors([]);
      return;
    }
    let cancelled = false;
    let timer: number | null = null;

    const canvas = document.createElement("canvas");
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const sampleFromElement = (
      el: HTMLVideoElement | HTMLImageElement,
      w: number,
      h: number,
    ) => {
      if (!w || !h) return;
      const ar = h / w;
      canvas.width = SAMPLE_W;
      canvas.height = Math.max(1, Math.round(SAMPLE_W * ar));
      try {
        ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
      } catch {
        return;
      }
      let data: ImageData;
      try {
        data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch {
        return;
      }
      const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
      const px = data.data;
      for (let i = 0; i < px.length; i += 4) {
        const a = px[i + 3];
        if (a < 200) continue;
        const r = px[i], g = px[i + 1], b = px[i + 2];
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        if (max < 12 || min > 243) continue;
        const key = (r >> 4) << 8 | (g >> 4) << 4 | (b >> 4);
        const cur = buckets.get(key);
        if (cur) { cur.r += r; cur.g += g; cur.b += b; cur.n += 1; }
        else buckets.set(key, { r, g, b, n: 1 });
      }
      const sorted = [...buckets.values()].sort((a, b) => b.n - a.n);
      const picked: { r: number; g: number; b: number }[] = [];
      for (const c of sorted) {
        const cr = c.r / c.n, cg = c.g / c.n, cb = c.b / c.n;
        const tooClose = picked.some((p) =>
          Math.abs(p.r - cr) < 32 && Math.abs(p.g - cg) < 32 && Math.abs(p.b - cb) < 32);
        if (tooClose) continue;
        picked.push({ r: cr, g: cg, b: cb });
        if (picked.length >= 3) break;
      }
      const hexes = picked.map((p) => toHex(Math.round(p.r), Math.round(p.g), Math.round(p.b)));
      if (cancelled) return;
      const built = buildQuadtoneFromDominant(hexes);
      if (built) {
        setColors(hexes);
        setStops(built);
      }
    };

    if (kind === "video") {
      const v = document.createElement("video");
      v.src = src;
      v.crossOrigin = "anonymous";
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.autoplay = true;
      elRef.current = v;
      const onReady = () => {
        v.play().catch(() => {});
        const tick = () => {
          if (cancelled) return;
          sampleFromElement(v, v.videoWidth, v.videoHeight);
          timer = window.setTimeout(tick, intervalMs);
        };
        tick();
      };
      v.addEventListener("loadeddata", onReady);
      return () => {
        cancelled = true;
        if (timer) window.clearTimeout(timer);
        v.removeEventListener("loadeddata", onReady);
        v.pause();
        v.src = "";
      };
    } else {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => sampleFromElement(img, img.naturalWidth, img.naturalHeight);
      img.src = src;
      elRef.current = img;
      return () => {
        cancelled = true;
      };
    }
  }, [enabled, src, kind, intervalMs]);

  return { stops, colors };
};
