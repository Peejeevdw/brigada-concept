import { useEffect, useRef } from "react";
import GrainOverlay from "@/components/GrainOverlay";
import LiquidFlowOverlay from "@/components/LiquidFlowOverlay";
import {
  BrioFilter,
  applyBrio,
  useBrioFilterId,
  type BrioRefs,
} from "@/lib/brio";
import {
  type BrioSettings,
  type Quadtone,
  type Duotone,
  pickDuotone,
} from "@/data/duotones";

interface Props {
  src: string;
  settings: BrioSettings;
  quadtone: Quadtone | null;
  duotone?: Duotone;
  className?: string;
  focal?: "center" | "top";
}

/**
 * Static-image equivalent of the Hero brio composite: brio SVG filter +
 * cluster (k-means posterization) + liquid flow + grain. Mirrors the chain
 * in src/components/home-v4-v2/Hero.tsx so a tile gets the exact same look.
 */
const BrioImageComposite = ({
  src,
  settings,
  quadtone,
  duotone,
  className,
  focal = "center",
}: Props) => {
  const fid = useBrioFilterId("inkblot-tile");
  const imgRef = useRef<HTMLImageElement>(null);
  const grainRef = useRef<HTMLDivElement>(null);
  const clusterCanvasRef = useRef<HTMLCanvasElement>(null);
  const duotoneRef = useRef<Duotone>(duotone ?? pickDuotone());

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

  // Apply brio filter values
  useEffect(() => {
    applyBrio(brioRefs, {
      amount: 1,
      settings,
      quadtone,
      duotone: duotoneRef.current,
    });
    if (imgRef.current) {
      imgRef.current.style.filter = `url(#${fid})`;
    }
    if (grainRef.current) {
      grainRef.current.style.opacity = String(settings.grain ?? 0.5);
    }
  }, [settings, quadtone, fid]);

  // Cluster (k-means) pipeline on the static image
  const clusterEnabled = !!settings.cluster?.enabled;
  useEffect(() => {
    if (!clusterEnabled) return;
    const canvas = clusterCanvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    let cancelled = false;
    img.onload = () => {
      if (cancelled) return;
      const W = 160;
      const aspect = img.naturalHeight / img.naturalWidth;
      const H = Math.max(1, Math.round(W * aspect));
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

      // Seed centroids on a grayscale ramp
      let centroids: [number, number, number][] = [];
      for (let k = 0; k < K; k++) {
        const v = K === 1 ? 128 : Math.round((k / (K - 1)) * 255);
        centroids.push([v, v, v]);
      }

      // Run several iterations for a stable static result
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
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, clusterEnabled, settings.zoom, settings.cluster?.colors, focal]);

  const lf = settings.liquidFlow;
  const liquidActive = !!lf?.enabled && ((lf.morph ?? 0) > 0 || (lf.scale ?? 0) > 0);
  const blurForCluster = settings.blur;
  const zoom = settings.zoom;

  return (
    <div className={`relative overflow-hidden bg-[#2D2928] ${className ?? ""}`}>
      <BrioFilter id={fid} refs={brioRefs} />

      <img
        ref={imgRef}
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          objectPosition: focal === "top" ? "center top" : "center",
          transform: `scale(${1.25 * zoom})`,
          transformOrigin: focal === "top" ? "center top" : "center",
          willChange: "transform",
          visibility: liquidActive || clusterEnabled ? "hidden" : "visible",
        }}
      />

      {clusterEnabled && (
        <canvas
          ref={clusterCanvasRef}
          className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          style={{
            imageRendering: "pixelated",
            opacity: liquidActive ? 0 : 1,
            filter: blurForCluster > 0 ? `blur(${(blurForCluster * 20).toFixed(2)}px)` : undefined,
          }}
        />
      )}

      {liquidActive && lf && (
        <LiquidFlowOverlay
          enabled
          speed={lf.speed}
          morph={lf.morph}
          flow={lf.flow}
          scale={lf.scale}
          warp={lf.warp}
          mediaSrc={src}
          mediaKind="image"
          sourceCanvasRef={clusterEnabled ? clusterCanvasRef : undefined}
          preBlur={clusterEnabled ? blurForCluster : 0}
          filterId={clusterEnabled ? undefined : fid}
        />
      )}

      <GrainOverlay ref={grainRef} opacity={settings.grain ?? 0.5} />
    </div>
  );
};

export default BrioImageComposite;
