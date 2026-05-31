// Shared brio quadtone palettes plus a helper to build an ad-hoc quadtone from
// arbitrary brand colors. This intentionally reads from the same source used by
// `/` and `/settings` so the demo cannot drift onto stale palette values.
import {
  getEffectiveQuadtone,
  getEffectiveQuadtones,
  quadtones,
  type Quadtone,
  type QuadtoneStops,
} from "@/data/duotones";

export type { Quadtone, QuadtoneStops } from "@/data/duotones";

const hexByte = (s: string, i: number) => parseInt(s.slice(i, i + 2), 16);
const toHex2 = (n: number) =>
  Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");

const hexMix = (a: string, b: string): string => {
  const r = (hexByte(a, 1) + hexByte(b, 1)) / 2;
  const g = (hexByte(a, 3) + hexByte(b, 3)) / 2;
  const bl = (hexByte(a, 5) + hexByte(b, 5)) / 2;
  return ("#" + toHex2(r) + toHex2(g) + toHex2(bl)).toUpperCase();
};

/** Expand a 4-stop palette to 7 stops by inserting linear midpoints. */
const expand4to7 = (s: readonly string[]): QuadtoneStops => {
  const safe = (i: number) => s[i] ?? s[s.length - 1] ?? "#000000";
  const a = safe(0), b = safe(1), c = safe(2), d = safe(3);
  return [a, hexMix(a, b), b, hexMix(b, c), c, hexMix(c, d), d];
};

export const PALETTES: Quadtone[] = quadtones;

export const PALETTE_IDS = PALETTES.map((p) => p.id);

export const getPalette = (id: string): Quadtone | undefined =>
  getEffectiveQuadtone(id) ?? quadtones.find((p) => p.id === id);

export const getPalettes = (): Quadtone[] => getEffectiveQuadtones();

// Build a 7-stop quadtone by resampling N hex colors along luminance.
const lum = (hex: string) => {
  const r = hexByte(hex, 1) / 255, g = hexByte(hex, 3) / 255, b = hexByte(hex, 5) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const lerpHex = (a: string, b: string, t: number) => {
  const r = hexByte(a, 1) + (hexByte(b, 1) - hexByte(a, 1)) * t;
  const g = hexByte(a, 3) + (hexByte(b, 3) - hexByte(a, 3)) * t;
  const bl = hexByte(a, 5) + (hexByte(b, 5) - hexByte(a, 5)) * t;
  return ("#" + toHex2(r) + toHex2(g) + toHex2(bl)).toUpperCase();
};

export const buildQuadtoneFromColors = (colors: string[]): Quadtone => {
  const valid = colors.filter((c) => /^#?[0-9a-f]{6}$/i.test(c)).map((c) => c.startsWith("#") ? c : "#" + c);
  if (valid.length === 0) return getPalette("brio-01")!;
  if (valid.length === 1) {
    // Single color: ramp from black through it to white.
    const c = valid[0];
    return { id: "custom", name: "Custom", stops: expand4to7(["#000000", c, c, "#FFFFFF"]) };
  }
  const sorted = [...valid].sort((a, b) => lum(a) - lum(b));
  const n = sorted.length;
  const stops: string[] = [];
  for (let i = 0; i < 7; i++) {
    const t = (i / 6) * (n - 1);
    const lo = Math.floor(t), hi = Math.min(n - 1, lo + 1);
    stops.push(lerpHex(sorted[lo], sorted[hi], t - lo));
  }
  return { id: "custom", name: "Custom", stops: stops as unknown as QuadtoneStops };
};
