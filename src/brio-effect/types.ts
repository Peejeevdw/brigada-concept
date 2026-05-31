import type React from "react";

export type BrioMode = "footage" | "palette" | "custom";

export type BrioThresholds = [number, number, number, number, number, number];

export interface BrioLavaSettings {
  enabled: boolean;
  intensity: number;
  softness: number;
  speed: number;
  scale: number;
  blobCount: number;
  blur: number;
  pull: number;
}

export interface BrioMeshSettings {
  enabled: boolean;
  points?: number;
  sharpness?: number;
  vibrance?: number;
  spread?: number;
  minBrightness?: number;
  maxBrightness?: number;
}

/**
 * BrioEffect public API is intentionally minimal: the look (grain, lava,
 * mesh, zoom, preset, etc.) is locked to match the homepage. The only
 * choices are the color mode and, in palette/custom modes, which colors.
 */
export interface BrioEffectProps {
  /** Image or video URL. */
  src: string;
  /** Color mode. */
  mode: BrioMode;
  /** Required when mode = "palette". One of PALETTE_IDS. */
  paletteId?: string;
  /** Required when mode = "custom". 2 to 7 hex colors. */
  colors?: string[];
  /** Sizes the container. */
  className?: string;
}
