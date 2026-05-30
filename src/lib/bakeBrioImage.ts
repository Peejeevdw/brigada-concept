import type { BrioSettings } from "@/data/duotones";

/**
 * Pre-bakes the k-means cluster posterization step from BrioImageComposite
 * into an offscreen canvas. Mirrors the algorithm in
 * src/components/BrioImageComposite.tsx so output is visually identical.
 *
 * The result is a static, colorized bitmap per (src, settings) pair. The
 * shared LiquidFlowOverlay can then run its WebGL pass on top, so we only
 * pay the k-means cost once per case instead of every render.
 */
export function bakeBrioImage(
  src: string,
  settings: BrioSettings,
  focal: "center" | "top" = "center",
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onerror = reject;
    img.onload = () => {
      const W = 160;
      const aspect = img.naturalHeight / img.naturalWidth;
      const H = Math.max(1, Math.round(W * aspect));
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const sample = document.createElement("canvas");
      sample.width = W;
      sample.height = H;
      const sctx = sample.getContext("2d", { willReadFrequently: true })!;
      const dctx = canvas.getContext("2d")!;

      const zoom = settings.zoom;
      const scale = 1.25 * zoom;
      const srcW = img.naturalWidth / scale;
      const srcH = img.naturalHeight / scale;
      const sx = (img.naturalWidth - srcW) / 2;
      const sy = focal === "top" ? 0 : (img.naturalHeight - srcH) / 2;
      sctx.drawImage(img, sx, sy, srcW, srcH, 0, 0, W, H);

      const imageData = sctx.getImageData(0, 0, W, H);
      const data = imageData.data;
      const N = W * H;
      const K = Math.max(2, Math.min(16, settings.cluster?.colors ?? 9));

      let centroids: [number, number, number][] = [];
      for (let k = 0; k < K; k++) {
        const v = K === 1 ? 128 : Math.round((k / (K - 1)) * 255);
        centroids.push([v, v, v]);
      }

      for (let it = 0; it < 8; it++) {
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

      const display: [number, number, number][] = centroids.map(([r, g, b]) => {
        const r1 = r / 255, g1 = g / 255, b1 = b / 255;
        const max = Math.max(r1, g1, b1), min = Math.min(r1, g1, b1);
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
        const c = display[bestK];
        data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2];
      }
      dctx.putImageData(imageData, 0, 0);
      resolve(canvas);
    };
    img.src = src;
  });
}
