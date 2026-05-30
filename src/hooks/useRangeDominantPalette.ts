import { useCallback, useEffect, useRef, useState } from "react";

const SAMPLE_W = 64;

const toHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();

const lum = (r: number, g: number, b: number) =>
  (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

const shade = (hex: string, k: number) => {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * k);
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * k);
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * k);
  const cl = (v: number) => Math.max(0, Math.min(255, v));
  return "#" + [r, g, b].map((v) => cl(v).toString(16).padStart(2, "0")).join("").toUpperCase();
};
const tint = (hex: string, k: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * k);
  const lg = Math.round(g + (255 - g) * k);
  const lb = Math.round(b + (255 - b) * k);
  return "#" + [lr, lg, lb].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
};

/**
 * On-demand dominant color sampling per luminance range.
 *
 * Unlike the previous polling version, this version only samples when:
 *   - `enabled` flips to true
 *   - `lowSplit`/`highSplit` change
 *   - the caller invokes the returned `resample()` function
 *
 * That keeps the CPU/RAM cost bounded and avoids decoding a duplicate
 * hidden <video> in the background.
 */
export const useRangeDominantPalette = (
  src: string,
  kind: "video" | "image",
  enabled: boolean,
  lowSplit: number,
  highSplit: number,
) => {
  const [colors, setColors] = useState<string[]>([]);
  const [stops, setStops] = useState<[string, string, string, string] | null>(null);
  const [loading, setLoading] = useState(false);
  // Bump to trigger a resample.
  const [tick, setTick] = useState(0);
  const resample = useCallback(() => setTick((t) => t + 1), []);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled) {
      setColors([]);
      setStops(null);
      return;
    }
    let cancelled = false;
    let cleanupEl: (() => void) | null = null;

    if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    setLoading(true);

    const compute = (el: HTMLVideoElement | HTMLImageElement, w: number, h: number) => {
      if (cancelled || !w || !h) return;
      const ar = h / w;
      canvas.width = SAMPLE_W;
      canvas.height = Math.max(1, Math.round(SAMPLE_W * ar));
      try { ctx.drawImage(el, 0, 0, canvas.width, canvas.height); } catch { setLoading(false); return; }
      let data: ImageData;
      try { data = ctx.getImageData(0, 0, canvas.width, canvas.height); } catch { setLoading(false); return; }

      const ranges: Array<Map<number, { r: number; g: number; b: number; n: number }>> = [
        new Map(), new Map(), new Map(),
      ];
      const px = data.data;
      for (let i = 0; i < px.length; i += 4) {
        const a = px[i + 3];
        if (a < 200) continue;
        const r = px[i], g = px[i + 1], b = px[i + 2];
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        if (max < 12 || min > 243) continue;
        const L = lum(r, g, b);
        const idx = L < lowSplit ? 0 : L < highSplit ? 1 : 2;
        const key = (r >> 4) << 8 | (g >> 4) << 4 | (b >> 4);
        const bucket = ranges[idx];
        const cur = bucket.get(key);
        if (cur) { cur.r += r; cur.g += g; cur.b += b; cur.n += 1; }
        else bucket.set(key, { r, g, b, n: 1 });
      }

      const pickFrom = (m: Map<number, { r: number; g: number; b: number; n: number }>) => {
        if (m.size === 0) return null;
        let best: { r: number; g: number; b: number; n: number } | null = null;
        for (const v of m.values()) if (!best || v.n > best.n) best = v;
        if (!best) return null;
        return toHex(Math.round(best.r / best.n), Math.round(best.g / best.n), Math.round(best.b / best.n));
      };

      const picked = ranges.map(pickFrom);
      for (let i = 0; i < 3; i++) if (!picked[i]) picked[i] = picked.find((p) => p) ?? "#808080";
      const [c1, c2, c3] = picked as [string, string, string];
      if (cancelled) return;
      setColors([c1, c2, c3]);
      setStops([shade(c1, 0.4), c1, c2, tint(c3, 0.3)]);
      setLoading(false);
    };

    if (kind === "video") {
      const v = document.createElement("video");
      v.src = src;
      v.crossOrigin = "anonymous";
      v.muted = true;
      v.playsInline = true;
      v.preload = "auto";
      const onReady = () => {
        // Try to seek to a representative frame, sample once, then dispose.
        const target = isFinite(v.duration) && v.duration > 0
          ? Math.min(v.duration * 0.3, v.duration - 0.05)
          : 0;
        const onSeeked = () => {
          compute(v, v.videoWidth, v.videoHeight);
          v.removeEventListener("seeked", onSeeked);
          try { v.pause(); } catch {}
          v.src = "";
        };
        v.addEventListener("seeked", onSeeked);
        try { v.currentTime = target; } catch {
          compute(v, v.videoWidth, v.videoHeight);
          v.src = "";
        }
      };
      v.addEventListener("loadeddata", onReady);
      cleanupEl = () => {
        v.removeEventListener("loadeddata", onReady);
        try { v.pause(); } catch {}
        v.src = "";
      };
    } else {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => compute(img, img.naturalWidth, img.naturalHeight);
      img.src = src;
      cleanupEl = () => { img.src = ""; };
    }

    return () => {
      cancelled = true;
      setLoading(false);
      if (cleanupEl) cleanupEl();
    };
  }, [enabled, src, kind, lowSplit, highSplit, tick]);

  return { colors, stops, loading, resample };
};
