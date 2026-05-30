/**
 * Extracts the K most-dominant colors from an image using k-means in RGB
 * (same approach as `bakeBrioImage`), then returns them sorted by luminance
 * shadow-to-highlight and lightly vibrance-boosted. Used to drive the
 * footage-color lava lamp effect on the homepage case backgrounds.
 */
export function extractPalette(src: string, K: number = 6): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onerror = reject;
    img.onload = () => {
      const W = 160;
      const aspect = img.naturalHeight / img.naturalWidth;
      const H = Math.max(1, Math.round(W * aspect));
      const sample = document.createElement("canvas");
      sample.width = W;
      sample.height = H;
      const ctx = sample.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, W, H);

      const data = ctx.getImageData(0, 0, W, H).data;
      const N = W * H;
      const k = Math.max(2, Math.min(16, K));

      let centroids: [number, number, number][] = [];
      for (let i = 0; i < k; i++) {
        const v = k === 1 ? 128 : Math.round((i / (k - 1)) * 255);
        centroids.push([v, v, v]);
      }
      for (let it = 0; it < 8; it++) {
        const sums: number[][] = Array.from({ length: k }, () => [0, 0, 0, 0]);
        for (let i = 0; i < N; i++) {
          const o = i * 4;
          const r = data[o], g = data[o + 1], b = data[o + 2];
          let bestD = Infinity, bestK = 0;
          for (let j = 0; j < k; j++) {
            const c = centroids[j];
            const dr = r - c[0], dg = g - c[1], db = b - c[2];
            const d = dr * dr + dg * dg + db * db;
            if (d < bestD) { bestD = d; bestK = j; }
          }
          const s = sums[bestK];
          s[0] += r; s[1] += g; s[2] += b; s[3]++;
        }
        for (let j = 0; j < k; j++) {
          const s = sums[j];
          if (s[3] > 0) centroids[j] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
        }
      }

      // Light vibrance + shadow lift (mirrors bakeBrioImage's display map).
      const lift = ([r, g, b]: [number, number, number]) => {
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
        ] as [number, number, number];
      };

      const toHex = ([r, g, b]: [number, number, number]) => {
        const h = (v: number) => Math.round(v).toString(16).padStart(2, "0");
        return `#${h(r)}${h(g)}${h(b)}`;
      };
      const lum = ([r, g, b]: [number, number, number]) =>
        (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

      const colors = centroids.map(lift).sort((a, b) => lum(a) - lum(b));
      resolve(colors.map(toHex));
    };
    img.src = src;
  });
}
