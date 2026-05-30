import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import Placeholder from "@/components/wireframe/Placeholder";
import GrainOverlay from "@/components/GrainOverlay";
import { cn } from "@/lib/utils";
import {
  duotones,
  pickDuotone,
  pickQuadtone,
  quadtones,
  getBrioSettings,
  getBrioPreset,
  type BrioPresetId,
  type Duotone,
  type Quadtone,
} from "@/data/duotones";
import { caseImages } from "@/data/caseImages";
import {
  BrioFilter,
  applyBrio,
  useBrioFilterId,
  type BrioRefs,
} from "@/lib/brio";

export type Pillar = "Brand" | "Marketing" | "Product" | "People";

interface WorkThumbProps {
  pillars: Pillar[];
  className?: string;
  /** Optional stable seed used to pick a random image. */
  seed?: string;
  /**
   * Optional externally controlled effect amount (0 = clean, 1 = full duotone).
   * When provided, internal hover handling is disabled.
   */
  effect?: number;
  /** When true, the component skips React state for the effect prop and exposes setEffect via ref. */
  imperative?: boolean;
  /** When true, the inner image fills its parent instead of using a fixed 16:10 aspect ratio. */
  fill?: boolean;
  /** Lock to a specific quadtone (e.g. "brio-zero"). Disables random palette swaps. */
  quadtoneId?: string;
  /** Lock to a specific brio intensity preset (e.g. "soft"). Ignores user/global brio settings. */
  brioPresetId?: BrioPresetId;
  /** Keep original image colors; only apply zoom/blur/grain/contrast/warp. */
  preserveColor?: boolean;
  /** Load the image eagerly with high priority instead of lazily. */
  eager?: boolean;
}

export interface WorkThumbHandle {
  setEffect: (p: number) => void;
}

const pickHoverDuotone = (exclude?: Duotone): Duotone => {
  const mode =
    typeof window !== "undefined"
      ? window.localStorage.getItem("brigada.duotone.mode")
      : null;
  const isRandom = mode === "random";
  const chosen = pickDuotone();
  if (!isRandom) return chosen;
  if (!exclude || chosen.id !== exclude.id) return chosen;
  const pool = duotones.filter((d) => d.id !== exclude.id);
  if (pool.length === 0) return chosen;
  return pool[Math.floor(Math.random() * pool.length)];
};

const DURATION = 300; // ms hover transition
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

const WorkThumb = forwardRef<WorkThumbHandle, WorkThumbProps>(({ pillars, className, seed, effect, imperative, fill, quadtoneId, brioPresetId, preserveColor, eager }, ref) => {
  const controlled = imperative || typeof effect === "number";
  const fid = useBrioFilterId("inkblot-tile");

  const imgSrc = useMemo(() => {
    const s = seed || Math.random().toString(36).slice(2, 10);
    if (seed && caseImages[seed]) return caseImages[seed];
    return `https://picsum.photos/seed/${encodeURIComponent(s)}/1200/750`;
  }, [seed]);

  const lockedQuadtone = useMemo<Quadtone | null>(
    () => (quadtoneId ? quadtones.find((q) => q.id === quadtoneId) ?? null : null),
    [quadtoneId],
  );

  const lastDuotone = useRef<Duotone>(pickHoverDuotone());
  const quadtoneRef = useRef<Quadtone | null>(lockedQuadtone ?? pickQuadtone());

  const imgRef = useRef<HTMLImageElement>(null);
  const grainRef = useRef<HTMLDivElement>(null);

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

  const progressRef = useRef(0); // 0 = clean image (default), 1 = effect on (hover)
  const targetRef = useRef(0);
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);
  const lastAppliedRef = useRef(-1); // last quantized value applied to SVG attrs

  const [hovered, setHovered] = useState(false);

  const lockedBrio = useMemo(
    () => (brioPresetId ? getBrioPreset(brioPresetId, quadtoneId).settings : null),
    [brioPresetId, quadtoneId],
  );
  const brioRef = useRef(lockedBrio ?? getBrioSettings());

  const apply = (rawP: number) => {
    // Quantize to ~1% steps: smooth visually, still cuts setAttribute spam.
    const p = Math.round(rawP * 100) / 100;
    if (p === lastAppliedRef.current) return;
    const prev = lastAppliedRef.current;
    lastAppliedRef.current = p;

    applyBrio(brioRefs, {
      amount: p,
      settings: brioRef.current,
      quadtone: quadtoneRef.current,
      duotone: lastDuotone.current,
      preserveColor,
    });

    if (imgRef.current) {
      // Only flip filter on/off at the boundary, not every frame.
      const wasOn = prev > 0;
      const isOn = p > 0;
      if (wasOn !== isOn) {
        imgRef.current.style.filter = isOn ? `url(#${fid})` : "none";
      }
      imgRef.current.style.transform = `scale(${1 + 0.5 * p})`;
    }
    if (grainRef.current) {
      const grainAmt = Math.max(0, Math.min(2, 0));
      grainRef.current.style.opacity = String(p * grainAmt);
    }
  };


  useImperativeHandle(ref, () => ({
    setEffect: (p: number) => {
      const clamped = Math.max(0, Math.min(1, p));
      targetRef.current = clamped;
      startAnim();
    },
  }), []);


  const tick = (ts: number) => {
    const last = lastTsRef.current || ts;
    const dt = ts - last;
    lastTsRef.current = ts;

    const dir = targetRef.current - progressRef.current;
    if (Math.abs(dir) < 0.001) {
      progressRef.current = targetRef.current;
      apply(easeOut(progressRef.current));
      rafRef.current = 0;
      lastTsRef.current = 0;
      return;
    }
    const step = (dt / DURATION) * Math.sign(dir);
    let next = progressRef.current + step;
    if ((dir > 0 && next > targetRef.current) || (dir < 0 && next < targetRef.current)) {
      next = targetRef.current;
    }
    progressRef.current = next;
    apply(easeOut(next));
    rafRef.current = requestAnimationFrame(tick);
  };

  const startAnim = () => {
    if (!rafRef.current) {
      lastTsRef.current = 0;
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  const handleEnter = () => {
    if (controlled) return;
    if (!lockedQuadtone) {
      quadtoneRef.current = pickQuadtone();
      const next = pickHoverDuotone(lastDuotone.current);
      lastDuotone.current = next;
    }
    targetRef.current = 1;
    setHovered(true);
    startAnim();
  };

  const handleLeave = () => {
    if (controlled) return;
    targetRef.current = 0;
    setHovered(false);
    startAnim();
  };

  useEffect(() => {
    apply(easeOut(controlled ? Math.max(0, Math.min(1, effect ?? 0)) : 0));
    const onBrioChange = lockedBrio
      ? null
      : () => {
          brioRef.current = getBrioSettings();
          lastAppliedRef.current = -1;
          apply(easeOut(progressRef.current));
        };
    if (onBrioChange) {
      window.addEventListener("brio-settings-changed", onBrioChange);
      window.addEventListener("storage", onBrioChange);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (onBrioChange) {
        window.removeEventListener("brio-settings-changed", onBrioChange);
        window.removeEventListener("storage", onBrioChange);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Externally controlled: drive effect amount from prop.
  useEffect(() => {
    if (!controlled) return;
    if (typeof effect !== "number") return;
    const p = Math.max(0, Math.min(1, effect));
    progressRef.current = p;
    targetRef.current = p;
    apply(easeOut(p));
  }, [effect, controlled]);

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <BrioFilter id={fid} refs={brioRefs} />

      <div className={cn("relative w-full bg-neutral-100 overflow-hidden", fill ? "h-full" : "aspect-[16/10]")}>
        <img
          ref={imgRef}
          src={imgSrc}
          alt=""
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          {...(eager ? { fetchPriority: "high" as const } : {})}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ willChange: "transform, filter", transform: "scale(1)" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        <Placeholder label="IMAGE" shade="light" className="absolute inset-0 -z-[1]" />
        <GrainOverlay ref={grainRef} opacity={0} blendMode="overlay" />
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 z-10">
          {pillars.map((p) => (
            <span
              key={p}
              className={cn(
                "inline-flex items-center px-2 py-1 text-[10px] uppercase tracking-widest bg-white/85 backdrop-blur-sm border border-neutral-300 text-neutral-800 transition-opacity duration-300",
                hovered ? "opacity-100" : "opacity-0"
              )}
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
});

WorkThumb.displayName = "WorkThumb";

export default WorkThumb;
