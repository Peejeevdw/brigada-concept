// Brio intensity presets. Match the project's soft / medium / strong settings.

import type { BrioThresholds } from "./types";

export type BrioPresetId = "soft" | "medium" | "strong";

export type BrioPresetSettings = {
  thresholds: BrioThresholds;
  grain: number;
  blur: number;
  contrast: number;
  warp: number;
  liquify: number;
};

export const PRESETS: Record<BrioPresetId, BrioPresetSettings> = {
  soft: {
    thresholds: [0.15, 0.40, 0.50, 0.60, 0.70, 0.85],
    grain: 0.4, blur: 0.35, contrast: 0.35, warp: 0.3, liquify: 0,
  },
  medium: {
    thresholds: [0.20, 0.30, 0.45, 0.55, 0.70, 0.80],
    grain: 1, blur: 0.6, contrast: 0.7, warp: 1, liquify: 0,
  },
  strong: {
    thresholds: [0.22, 0.28, 0.45, 0.55, 0.72, 0.78],
    grain: 1.4, blur: 0.9, contrast: 1, warp: 1.6, liquify: 0,
  },
};
