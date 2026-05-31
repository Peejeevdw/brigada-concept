import { useEffect, useMemo, useRef, useState } from "react";
import BrioWebGLOverlay from "@/components/BrioWebGLOverlay";
import { DEFAULT_BRIO_TOGGLES } from "@/data/duotones";
import type { BrioEffectProps, BrioLavaSettings, BrioMeshSettings } from "./types";
import { PRESETS } from "./presets";
import {
  PALETTE_IDS,
  PALETTES,
  buildQuadtoneFromColors,
  getPalette,
  getPalettes,
  type Quadtone,
} from "./palettes";
import { extractDominantColors } from "./cluster-colors";

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i;
const detectKind = (src: string): "image" | "video" =>
  VIDEO_EXT.test(src) ? "video" : "image";

// Locked defaults. These mirror the homepage hero and the "motion" export
// on /settings. The public component intentionally does not expose props
// to override them, so the look stays consistent across projects.
const DEFAULT_MESH: BrioMeshSettings = {
  enabled: true,
  points: 7,
  sharpness: 1,
  vibrance: 0.9,
  spread: 1,
  minBrightness: 0,
  maxBrightness: 1,
};

const DEFAULT_LAVA: BrioLavaSettings = {
  enabled: true,
  intensity: 1,
  softness: 0,
  speed: 0.3,
  scale: 0.6,
  blobCount: 6,
  blur: 0,
  pull: 0.85,
};

const DEFAULT_GRAIN = 0.25;
const DEFAULT_PRESET = "medium" as const;
const DEFAULT_FOOTAGE_POINTS = 5;

export const BrioEffect = ({
  src,
  mode,
  paletteId,
  colors,
  className,
}: BrioEffectProps) => {
  const mediaKind = detectKind(src);
  const isImage = mediaKind === "image";
  const p = PRESETS[DEFAULT_PRESET];

  const [footagePalette, setFootagePalette] = useState<string[] | null>(null);
  const [paletteRevision, setPaletteRevision] = useState(0);

  useEffect(() => {
    const bump = () => setPaletteRevision((v) => v + 1);
    window.addEventListener("brio-palette-changed", bump);
    return () => window.removeEventListener("brio-palette-changed", bump);
  }, []);

  useEffect(() => {
    if (mode !== "footage") { setFootagePalette(null); return; }
    let cancelled = false;
    extractDominantColors(src, mediaKind, DEFAULT_FOOTAGE_POINTS)
      .then((cols) => { if (!cancelled && cols.length) setFootagePalette(cols); })
      .catch(() => { /* tainted canvas / load error */ });
    return () => { cancelled = true; };
  }, [src, mode, mediaKind]);

  const quadtone = useMemo<Quadtone | null>(() => {
    if (mode === "palette") return getPalette(paletteId ?? "") ?? getPalettes()[0];
    if (mode === "custom")  return buildQuadtoneFromColors(colors ?? []);
    if (mode === "footage" && footagePalette) return buildQuadtoneFromColors(footagePalette);
    return null;
  }, [mode, paletteId, colors, footagePalette, paletteRevision]);

  const meshPaletteColors: string[] | undefined =
    mode === "palette" ? quadtone?.stops as unknown as string[] | undefined
    : mode === "custom" ? colors
    : undefined;

  const meshPoints = meshPaletteColors?.length ?? DEFAULT_MESH.points ?? 7;
  const colorPassOn = mode === "footage" && !!quadtone;

  const [frameEl, setFrameEl] = useState<HTMLDivElement | null>(null);
  const mediaRef = useRef<HTMLVideoElement | HTMLImageElement | null>(null);

  return (
    <div
      className={className}
      style={{ position: "relative", overflow: "hidden", background: "#1F1B16" }}
    >
      <div ref={setFrameEl} style={{ position: "absolute", inset: 0 }}>
        {isImage ? (
          <img
            ref={mediaRef as React.RefObject<HTMLImageElement>}
            src={src}
            alt=""
            crossOrigin="anonymous"
            style={{ width: "100%", height: "100%", objectFit: "cover", visibility: "hidden" }}
          />
        ) : (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={src}
            crossOrigin="anonymous"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            style={{ width: "100%", height: "100%", objectFit: "cover", visibility: "hidden" }}
          />
        )}

        <BrioWebGLOverlay
          target={frameEl}
          amount={1}
          settings={{
            thresholds: p.thresholds,
            grain:    DEFAULT_GRAIN,
            blur:     0,
            contrast: 0,
            warp:     0,
            liquify:  0,
            toggles:  { ...DEFAULT_BRIO_TOGGLES, color: colorPassOn },
          }}
          quadtone={quadtone}
          duotone={null}
          cropX={0.5}
          cropY={0.5}
          cropSize={1}
          zoom={1.5}
          overlay="none"
          cluster={{
            enabled: DEFAULT_MESH.enabled,
            points: meshPoints,
            sharpness: DEFAULT_MESH.sharpness,
            vibrance: DEFAULT_MESH.vibrance,
            spread: DEFAULT_MESH.spread,
            minBrightness: DEFAULT_MESH.minBrightness,
            maxBrightness: DEFAULT_MESH.maxBrightness,
            paletteColors: meshPaletteColors,
          }}
          lava={DEFAULT_LAVA}
        />
      </div>
    </div>
  );
};

export { PALETTE_IDS, PALETTES };
export default BrioEffect;
