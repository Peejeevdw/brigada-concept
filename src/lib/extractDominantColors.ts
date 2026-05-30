/**
 * Extract the N most dominant colors from an image or video element.
 * Uses a simple coarse bucket histogram (4 bits per channel) for speed.
 */

const toHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();

export const extractDominantColorsFromSource = async (
  src: string,
  kind: "image" | "video",
  count = 3,
): Promise<string[]> => {
  const sample = 128; // downscale to 128px wide for speed
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  let w = sample, h = sample;
  if (kind === "image") {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.crossOrigin = "anonymous";
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });
    const ar = img.naturalHeight / img.naturalWidth || 1;
    w = sample; h = Math.max(1, Math.round(sample * ar));
    canvas.width = w; canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);
  } else {
    const vid = document.createElement("video");
    vid.crossOrigin = "anonymous";
    vid.muted = true;
    vid.playsInline = true;
    vid.src = src;
    await new Promise<void>((res, rej) => {
      vid.onloadeddata = () => res();
      vid.onerror = () => rej(new Error("video load failed"));
    });
    try { await vid.play(); } catch {}
    // seek to ~middle for a representative frame
    if (isFinite(vid.duration) && vid.duration > 0) {
      vid.currentTime = Math.min(vid.duration * 0.3, vid.duration - 0.05);
      await new Promise<void>((res) => { vid.onseeked = () => res(); });
    }
    const ar = vid.videoHeight / vid.videoWidth || 1;
    w = sample; h = Math.max(1, Math.round(sample * ar));
    canvas.width = w; canvas.height = h;
    ctx.drawImage(vid, 0, 0, w, h);
    vid.pause();
  }

  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, w, h);
  } catch {
    // tainted canvas (cross-origin) — bail
    return [];
  }

  // Bucket into 4 bits per channel = 16^3 = 4096 buckets.
  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3];
    if (a < 200) continue;
    const r = px[i], g = px[i + 1], b = px[i + 2];
    // Skip near-pure black/white so the palette is more useful.
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max < 12 || min > 243) continue;
    const key = (r >> 4) << 8 | (g >> 4) << 4 | (b >> 4);
    const cur = buckets.get(key);
    if (cur) {
      cur.r += r; cur.g += g; cur.b += b; cur.n += 1;
    } else {
      buckets.set(key, { r, g, b, n: 1 });
    }
  }

  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n);
  // De-dup buckets that are too close in RGB.
  const picked: { r: number; g: number; b: number }[] = [];
  for (const c of sorted) {
    const cr = c.r / c.n, cg = c.g / c.n, cb = c.b / c.n;
    const tooClose = picked.some((p) => Math.abs(p.r - cr) < 32 && Math.abs(p.g - cg) < 32 && Math.abs(p.b - cb) < 32);
    if (tooClose) continue;
    picked.push({ r: cr, g: cg, b: cb });
    if (picked.length >= count) break;
  }
  return picked.map((p) => toHex(Math.round(p.r), Math.round(p.g), Math.round(p.b)));
};

/**
 * Build a 4-stop quadtone palette from extracted dominant colors.
 * Sorted by luminance dark→light, with a deep shadow inserted if needed.
 */
export const buildQuadtoneFromDominant = (
  colors: string[],
): [string, string, string, string] | null => {
  if (colors.length < 1) return null;
  const lum = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const sorted = [...colors].sort((a, b) => lum(a) - lum(b));
  // Pad to at least 3 by repeating.
  while (sorted.length < 3) sorted.push(sorted[sorted.length - 1]);
  const [c1, c2, c3] = sorted;

  // Darken c1 a touch for a true shadow stop; lighten c3 for a highlight.
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
  return [shade(c1, 0.4), c1, c2, tint(c3, 0.3)];
};
