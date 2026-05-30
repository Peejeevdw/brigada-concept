/**
 * Cluster the source media into K dominant colors using a simple k-means
 * over downsampled pixels. Returns colors sorted dark to light so they
 * can be used directly as quadtone stops.
 */

const toHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();

const lum = (r: number, g: number, b: number) =>
  (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

const sampleSourceToPixels = async (
  src: string,
  kind: "image" | "video",
  sample = 96,
): Promise<Uint8ClampedArray | null> => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
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
    h = Math.max(1, Math.round(sample * ar));
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
    if (isFinite(vid.duration) && vid.duration > 0) {
      vid.currentTime = Math.min(vid.duration * 0.3, vid.duration - 0.05);
      await new Promise<void>((res) => { vid.onseeked = () => res(); });
    }
    const ar = vid.videoHeight / vid.videoWidth || 1;
    h = Math.max(1, Math.round(sample * ar));
    canvas.width = w; canvas.height = h;
    ctx.drawImage(vid, 0, 0, w, h);
    vid.pause();
    vid.src = "";
  }
  try {
    return ctx.getImageData(0, 0, w, h).data;
  } catch {
    return null;
  }
};

export const clusterDominantColors = async (
  src: string,
  kind: "image" | "video",
  k = 4,
  iterations = 8,
): Promise<string[]> => {
  const px = await sampleSourceToPixels(src, kind, 96);
  if (!px) return [];

  // Build the pixel array, skipping near-transparent pixels.
  const pixels: number[][] = [];
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 200) continue;
    pixels.push([px[i], px[i + 1], px[i + 2]]);
  }
  if (pixels.length < k) return [];

  // Initialise centroids with k random pixels.
  const centroids: number[][] = [];
  const used = new Set<number>();
  while (centroids.length < k) {
    const idx = Math.floor(Math.random() * pixels.length);
    if (used.has(idx)) continue;
    used.add(idx);
    centroids.push([...pixels[idx]]);
  }

  const assignments = new Int32Array(pixels.length);
  for (let it = 0; it < iterations; it++) {
    // Assign.
    for (let i = 0; i < pixels.length; i++) {
      const p = pixels[i];
      let best = 0, bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const dr = p[0] - centroids[c][0];
        const dg = p[1] - centroids[c][1];
        const db = p[2] - centroids[c][2];
        const d = dr * dr + dg * dg + db * db;
        if (d < bestD) { bestD = d; best = c; }
      }
      assignments[i] = best;
    }
    // Update.
    const sums = Array.from({ length: k }, () => [0, 0, 0, 0]);
    for (let i = 0; i < pixels.length; i++) {
      const c = assignments[i];
      const p = pixels[i];
      sums[c][0] += p[0]; sums[c][1] += p[1]; sums[c][2] += p[2]; sums[c][3] += 1;
    }
    for (let c = 0; c < k; c++) {
      if (sums[c][3] > 0) {
        centroids[c][0] = sums[c][0] / sums[c][3];
        centroids[c][1] = sums[c][1] / sums[c][3];
        centroids[c][2] = sums[c][2] / sums[c][3];
      }
    }
  }

  centroids.sort((a, b) => lum(a[0], a[1], a[2]) - lum(b[0], b[1], b[2]));
  return centroids.map((c) => toHex(c[0], c[1], c[2]));
};
