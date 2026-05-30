/**
 * Shared "Brío" effect primitives.
 *
 * One implementation of the SVG filter chain + value math used by the Hero,
 * the Work tile thumbnails, and the /brio reel preview. Components own the
 * source media and the trigger (hover, scroll, slider); this module only
 * builds the filter and writes attributes through refs.
 */

import { useId } from "react";
import {
  duotoneToTintMatrix,
  quadtoneToTableValues,
  type BrioSettings,
  type Duotone,
  type Quadtone,
} from "@/data/duotones";

export const BRIO_IDENTITY_MATRIX =
  "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0";
export const BRIO_IDENTITY_TABLE = "0 0.25 0.5 0.75 1";

export type BrioRefs = {
  desat: React.RefObject<SVGFEColorMatrixElement>;
  contrast: React.RefObject<SVGFEColorMatrixElement>;
  blur: React.RefObject<SVGFEGaussianBlurElement>;
  tint: React.RefObject<SVGFEColorMatrixElement>;
  quadR: React.RefObject<SVGFEFuncRElement>;
  quadG: React.RefObject<SVGFEFuncGElement>;
  quadB: React.RefObject<SVGFEFuncBElement>;
  disp: React.RefObject<SVGFEDisplacementMapElement>;
  liquify: React.RefObject<SVGFEDisplacementMapElement>;
};

export interface BrioFilterProps {
  /** Unique filter id; consumers reference it via `filter: url(#id)`. */
  id: string;
  refs: BrioRefs;
  /** SVG filter region. Defaults work for most cases. */
  region?: { x: string; y: string; width: string; height: string };
}

const DEFAULT_REGION = { x: "-20%", y: "-20%", width: "140%", height: "140%" };

/**
 * Renders the canonical Brío filter chain. Place inside an off-screen SVG;
 * apply via `style={{ filter: "url(#" + id + ")" }}` on your media element.
 */
export const BrioFilter = ({ id, refs, region = DEFAULT_REGION }: BrioFilterProps) => (
  <svg className="absolute -z-10 w-0 h-0" aria-hidden>
    <defs>
      <filter
        id={id}
        x={region.x}
        y={region.y}
        width={region.width}
        height={region.height}
        colorInterpolationFilters="sRGB"
      >
        <feColorMatrix
          ref={refs.desat}
          in="SourceGraphic"
          type="matrix"
          values={BRIO_IDENTITY_MATRIX}
          result="gray"
        />
        <feColorMatrix
          ref={refs.contrast}
          in="gray"
          type="matrix"
          values={BRIO_IDENTITY_MATRIX}
          result="contrast"
        />
        <feGaussianBlur
          ref={refs.blur}
          in="contrast"
          stdDeviation="0"
          edgeMode="duplicate"
          result="blurred"
        />
        <feColorMatrix
          ref={refs.tint}
          in="blurred"
          type="matrix"
          values={BRIO_IDENTITY_MATRIX}
          result="tinted"
        />
        <feComponentTransfer in="tinted" result="mapped">
          <feFuncR ref={refs.quadR} type="table" tableValues={BRIO_IDENTITY_TABLE} />
          <feFuncG ref={refs.quadG} type="table" tableValues={BRIO_IDENTITY_TABLE} />
          <feFuncB ref={refs.quadB} type="table" tableValues={BRIO_IDENTITY_TABLE} />
        </feComponentTransfer>
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.6"
          numOctaves="1"
          seed="4"
          result="noise"
        />
        <feDisplacementMap
          ref={refs.disp}
          in="mapped"
          in2="noise"
          scale="0"
          xChannelSelector="R"
          yChannelSelector="G"
          result="displaced"
        />
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.008"
          numOctaves="2"
          seed="9"
          result="liquidNoise"
        />
        <feDisplacementMap
          ref={refs.liquify}
          in="displaced"
          in2="liquidNoise"
          scale="0"
          xChannelSelector="R"
          yChannelSelector="G"
          result="liquid"
        />
      </filter>
    </defs>
  </svg>
);

// ---------------------------------------------------------------------------
// Apply math
// ---------------------------------------------------------------------------

export interface ApplyBrioOptions {
  /** Effect intensity 0..1. */
  amount: number;
  settings: BrioSettings;
  /** Active palette: provide quadtone OR duotone (or neither for pass-through). */
  quadtone?: Quadtone | null;
  duotone?: Duotone | null;
  /** Legacy: keep source colors (no-op in this build, kept for compat). */
  preserveColor?: boolean;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Writes filter primitive values for a given effect amount.
 * Mirrors the math used by Hero, WorkThumb and ReelPreview before extraction
 * (single source of truth, identical visual output).
 */
export const applyBrio = (refs: BrioRefs, opts: ApplyBrioOptions) => {
  const p = clamp01(opts.amount);
  const lerp = (a: number, b: number) => a + (b - a) * p;
  const pDesat = Math.min(1, p / 0.5);
  const lerpDesat = (a: number, b: number) => a + (b - a) * pDesat;
  const tg = opts.settings.toggles;
  const blurAmt = clamp01(opts.settings.blur);
  const contrastAmt = clamp01(opts.settings.contrast);
  const warpAmt = Math.max(0, Math.min(2, opts.settings.warp));
  const quad = tg.color ? opts.quadtone ?? null : null;

  if (refs.blur.current) {
    const b = blurAmt * p;
    refs.blur.current.setAttribute(
      "stdDeviation",
      String(b * 32 + Math.pow(b, 3) * 96),
    );
  }
  if (refs.disp.current) {
    refs.disp.current.setAttribute("scale", String(lerp(0, 16) * warpAmt));
  }
  if (refs.liquify.current) {
    const liquifyAmt = Math.max(0, Math.min(2, opts.settings.liquify ?? 0));
    refs.liquify.current.setAttribute("scale", String(lerp(0, 120) * liquifyAmt));
  }
  if (refs.desat.current) {
    if (!tg.color) {
      // Recolor disabled: keep source colors, no desaturation.
      refs.desat.current.setAttribute("values", BRIO_IDENTITY_MATRIX);
    } else if (quad) {
      // Luminance ramp: collapse to grayscale so the LUT can remap it.
      const lr = lerpDesat(1, 0.2126), lg = lerpDesat(0, 0.7152), lb = lerpDesat(0, 0.0722);
      const lr2 = lerpDesat(0, 0.2126), lg2 = lerpDesat(1, 0.7152), lb2 = lerpDesat(0, 0.0722);
      const lr3 = lerpDesat(0, 0.2126), lg3 = lerpDesat(0, 0.7152), lb3 = lerpDesat(1, 0.0722);
      refs.desat.current.setAttribute(
        "values",
        `${lr} ${lg} ${lb} 0 0 ${lr2} ${lg2} ${lb2} 0 0 ${lr3} ${lg3} ${lb3} 0 0 0 0 0 1 0`,
      );
    } else {
      const dR1 = lerpDesat(1, 0.33), dR2 = lerpDesat(0, 0.33), dR3 = lerpDesat(0, 0.33);
      const dG1 = lerpDesat(0, 0.33), dG2 = lerpDesat(1, 0.33), dG3 = lerpDesat(0, 0.33);
      const dB1 = lerpDesat(0, 0.33), dB2 = lerpDesat(0, 0.33), dB3 = lerpDesat(1, 0.33);
      refs.desat.current.setAttribute(
        "values",
        `${dR1} ${dR2} ${dR3} 0 0 ${dG1} ${dG2} ${dG3} 0 0 ${dB1} ${dB2} ${dB3} 0 0 0 0 0 1 0`,
      );
    }
  }
  if (refs.contrast.current) {
    const c = lerp(1, 1 + 7 * contrastAmt);
    const o = lerp(0, -3.5 * contrastAmt);
    refs.contrast.current.setAttribute(
      "values",
      `${c} 0 0 0 ${o} 0 ${c} 0 0 ${o} 0 0 ${c} 0 ${o} 0 0 0 1 0`,
    );
  }
  if (refs.tint.current) {
    if (!tg.color || quad) {
      // Quadtones get color from the LUT; identity here.
      refs.tint.current.setAttribute("values", BRIO_IDENTITY_MATRIX);
    } else if (opts.duotone) {
      const tint = duotoneToTintMatrix(opts.duotone);
      const r = lerp(1, tint.rScale), rO = lerp(0, tint.rOffset);
      const g = lerp(1, tint.gScale), gO = lerp(0, tint.gOffset);
      const b = lerp(1, tint.bScale), bO = lerp(0, tint.bOffset);
      refs.tint.current.setAttribute(
        "values",
        `${r} 0 0 0 ${rO} 0 ${g} 0 0 ${gO} 0 0 ${b} 0 ${bO} 0 0 0 1 0`,
      );
    } else {
      refs.tint.current.setAttribute("values", BRIO_IDENTITY_MATRIX);
    }
  }
  if (refs.quadR.current && refs.quadG.current && refs.quadB.current) {
    if (quad) {
      const t = quadtoneToTableValues(quad, p, opts.settings.thresholds);
      refs.quadR.current.setAttribute("tableValues", t.r);
      refs.quadG.current.setAttribute("tableValues", t.g);
      refs.quadB.current.setAttribute("tableValues", t.b);
    } else {
      refs.quadR.current.setAttribute("tableValues", BRIO_IDENTITY_TABLE);
      refs.quadG.current.setAttribute("tableValues", BRIO_IDENTITY_TABLE);
      refs.quadB.current.setAttribute("tableValues", BRIO_IDENTITY_TABLE);
    }
  }
};

/** Convenience: stable per-component filter id. */
export const useBrioFilterId = (prefix = "brio") => {
  const raw = useId().replace(/:/g, "");
  return `${prefix}-${raw}`;
};
