import { MutableRefObject, useEffect, useRef, useState } from "react";

import FootageColors from "@/components/FootageColors";
import LavaOnlyOverlay, { type LavaOnlySettings } from "@/components/LavaOnlyOverlay";

export interface FootageColorsSequenceProps {
  /** Ordered case image URLs. */
  sources: string[];
  /** Live scroll progress in [0, sources.length - 1]. Driven by the parent. */
  progressRef: MutableRefObject<number>;
  points?: number;
  /** 0..100 mapped to 0..1 mesh sharpness. */
  sharpness?: number;
  /** 0..100 mapped to 0..1 mesh vibrance. */
  vibrance?: number;
  zoom?: number;
  cropX?: number;
  cropY?: number;
  cropSize?: number;
  lava?: Partial<LavaOnlySettings>;
  className?: string;
}

// Off-screen colorization canvases run at this resolution; the lava pass
// upsamples them to whatever the visible target is.
const COLORIZE_W = 960;
const COLORIZE_H = 540;

/**
 * Single-WebGL footage-colors background for a sequence of case stills.
 *
 * Pipeline:
 *   each source ─► hidden FootageColors (cluster + mesh, no lava) ─► its canvas
 *   wipe between two canvases into one 2D composite (per scroll progress)
 *   composite ─► LavaOnlyOverlay (metaball pull only) ─► screen
 *
 * Each image keeps its own true colorization (cluster + mesh are isolated per
 * source), the wipe operates on already-colorized canvases, and the lava
 * blobs ripple across the whole composite on top.
 */
const FootageColorsSequence = ({
  sources,
  progressRef,
  points = 7,
  sharpness = 100,
  vibrance = 90,
  zoom = 1.5,
  cropX = 0.5,
  cropY = 0.5,
  cropSize = 1,
  lava,
  className,
}: FootageColorsSequenceProps) => {
  const compositeCanvasRef = useRef<HTMLCanvasElement>(null);
  const colorizeWrapperRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [target, setTarget] = useState<HTMLDivElement | null>(null);

  // Per-frame 2D composite loop. Reads progress and the live colorized
  // canvases from each hidden FootageColors instance.
  useEffect(() => {
    const canvas = compositeCanvasRef.current;
    if (!canvas) return;
    canvas.width = COLORIZE_W;
    canvas.height = COLORIZE_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scratch = document.createElement("canvas");
    scratch.width = COLORIZE_W;
    scratch.height = COLORIZE_H;
    const sctx = scratch.getContext("2d");
    if (!sctx) return;

    const FEATHER = 0.6;

    let raf = 0;
    let visible = true;
    let io: IntersectionObserver | null = null;
    if (target) {
      io = new IntersectionObserver(
        (entries) => {
          const wasVisible = visible;
          visible = entries.some((e) => e.isIntersecting);
          if (visible && !wasVisible && raf === 0) {
            raf = requestAnimationFrame(tick);
          } else if (!visible && wasVisible) {
            if (raf) cancelAnimationFrame(raf);
            raf = 0;
          }
        },
        { rootMargin: "200px" },
      );
      io.observe(target);
    }

    const findWebglCanvas = (i: number): HTMLCanvasElement | null => {
      const wrap = colorizeWrapperRefs.current[i];
      if (!wrap) return null;
      return wrap.querySelector("canvas");
    };

    const drawCover = (src: HTMLCanvasElement) => {
      const sw = src.width;
      const sh = src.height;
      if (!sw || !sh) return;
      ctx.drawImage(src, 0, 0, sw, sh, 0, 0, COLORIZE_W, COLORIZE_H);
    };

    const tick = () => {
      if (!visible) { raf = 0; return; }
      const N = sources.length;
      if (N > 0) {
        const p = Math.max(0, Math.min(N - 1, progressRef.current));
        const a = Math.floor(p);
        const b = Math.min(N - 1, a + 1);
        const t = p - a;

        ctx.fillStyle = "#1F1B16";
        ctx.fillRect(0, 0, COLORIZE_W, COLORIZE_H);

        const ca = findWebglCanvas(a);
        const cb = findWebglCanvas(b);

        if (ca) drawCover(ca);
        if (cb && a !== b && t > 0) {
          sctx.globalCompositeOperation = "source-over";
          sctx.clearRect(0, 0, COLORIZE_W, COLORIZE_H);
          const sw = cb.width;
          const sh = cb.height;
          if (sw && sh) {
            sctx.drawImage(cb, 0, 0, sw, sh, 0, 0, COLORIZE_W, COLORIZE_H);

            const cx = (1 - t) * COLORIZE_W;
            const half = (FEATHER * COLORIZE_W) / 2;
            const x0 = cx - half;
            const x1 = cx + half;
            const grad = sctx.createLinearGradient(x0, 0, x1, 0);
            grad.addColorStop(0, "rgba(0,0,0,0)");
            grad.addColorStop(1, "rgba(0,0,0,1)");
            sctx.globalCompositeOperation = "destination-in";
            sctx.fillStyle = grad;
            sctx.fillRect(0, 0, COLORIZE_W, COLORIZE_H);
            sctx.globalCompositeOperation = "source-over";

            ctx.drawImage(scratch, 0, 0);
          }
        }
      }
      raf = visible ? requestAnimationFrame(tick) : 0;
    };

    raf = requestAnimationFrame(tick);
    return () => {
      if (io) io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [progressRef, sources.length, target]);

  return (
    <div
      ref={setTarget}
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "#1F1B16",
        overflow: "hidden",
      }}
    >
      {/* Hidden per-source colorization rigs. Each runs its own cluster + mesh
          and exposes its WebGL canvas via DOM query for the composite loop.
          Lava is disabled here, that pass is applied once on the composite. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: COLORIZE_W,
          height: COLORIZE_H,
          opacity: 0,
          pointerEvents: "none",
          visibility: "hidden",
        }}
      >
        {sources.map((src, i) => (
          <div
            key={src + i}
            ref={(el) => {
              colorizeWrapperRefs.current[i] = el;
            }}
            style={{
              position: "absolute",
              inset: 0,
              width: COLORIZE_W,
              height: COLORIZE_H,
            }}
          >
            <FootageColors
              mediaSrc={src}
              mediaKind="image"
              points={points}
              sharpness={sharpness}
              vibrance={vibrance}
              zoom={zoom}
              cropX={cropX}
              cropY={cropY}
              cropSize={cropSize}
              lava={{ enabled: false }}
              className="absolute inset-0 h-full w-full"
            />
          </div>
        ))}
      </div>

      {/* Source canvas, hidden, sampled by LavaOnlyOverlay. */}
      <canvas
        ref={compositeCanvasRef}
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          visibility: "hidden",
        }}
      />

      {target && (
        <LavaOnlyOverlay
          target={target}
          sourceCanvasRef={compositeCanvasRef}
          settings={lava}
        />
      )}
    </div>
  );
};

export default FootageColorsSequence;
