import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import bgImage from "@/assets/today-bg.png";
import GrainOverlay from "@/components/GrainOverlay";
import LiquidFlowOverlay from "@/components/LiquidFlowOverlay";
import { bakeBrioImage } from "@/lib/bakeBrioImage";
import { DEFAULT_BRIO_SETTINGS, type BrioSettings } from "@/data/duotones";

// Matches the homepage selected-cases preset exactly.
const BRIO_02_SETTINGS: BrioSettings = {
  ...DEFAULT_BRIO_SETTINGS,
  amount: 0.8,
  contrast: 0.55,
  blur: 0.35,
  grain: 0.5,
  zoom: 1.5,
  liquidFlow: { enabled: true, speed: 0.04, morph: 0.5, flow: 0, scale: 0.2, warp: 1 },
  cluster: { enabled: true, tempo: 0, colors: 5 },
};

const Today = () => {
  const sourceCanvasRef = useRef<HTMLCanvasElement>(null);
  const brigadaWrapRef = useRef<HTMLDivElement>(null);
  const brigadaTextRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const wrap = brigadaWrapRef.current;
    const span = brigadaTextRef.current;
    if (!wrap || !span) return;
    const fit = () => {
      span.style.fontSize = "100px";
      const w = span.getBoundingClientRect().width;
      const style = getComputedStyle(wrap);
      const target =
        wrap.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight);
      if (w > 0) span.style.fontSize = `${(100 * target) / w}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    let raf = 0;
    if ((document as any).fonts?.ready) {
      (document as any).fonts.ready.then(() => {
        raf = requestAnimationFrame(fit);
      });
    }
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    bakeBrioImage(bgImage, BRIO_02_SETTINGS).then((baked) => {
      if (cancelled || !baked) return;
      const dst = sourceCanvasRef.current;
      if (!dst) return;
      dst.width = baked.width;
      dst.height = baked.height;
      const ctx = dst.getContext("2d");
      if (ctx) ctx.drawImage(baked, 0, 0);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const lf = BRIO_02_SETTINGS.liquidFlow!;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#2D2928] text-[#f3f2ef] px-6">
      <canvas
        ref={sourceCanvasRef}
        className="absolute"
        style={{ left: -99999, top: -99999, width: 1, height: 1, pointerEvents: "none" }}
        aria-hidden
      />
      <LiquidFlowOverlay
        enabled
        speed={lf.speed}
        morph={lf.morph}
        flow={lf.flow}
        scale={lf.scale}
        warp={lf.warp}
        mediaSrc=""
        mediaKind="image"
        sourceCanvasRef={sourceCanvasRef}
        preBlur={BRIO_02_SETTINGS.blur}
      />
      <GrainOverlay opacity={BRIO_02_SETTINGS.grain ?? 0.5} />
      <div className="absolute inset-0 bg-brigada-black/20 pointer-events-none" aria-hidden />

      <div className="absolute left-0 right-0 top-0 px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96">
        <div className="grid grid-cols-6 gap-3 md:gap-5 w-full">
          <div
            className="col-span-3 uppercase text-left min-w-0"
            style={{
              fontFamily: '"Shapiro", system-ui, sans-serif',
              fontSize: "clamp(1.25rem, 5.5vw, 6.5rem)",
              lineHeight: "0.8",
              marginTop: "-0.18em",
            }}
          >
            Today
          </div>
        </div>
      </div>

      <div className="absolute left-0 right-0 top-1/3 px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96">
        <div className="grid grid-cols-6 gap-3 md:gap-5 w-full items-start">
          <h1 className="font-title col-span-3 text-left leading-none m-0">TURNS INTO</h1>
          <p className="font-body col-span-3 text-left">
            Today joined forces with Fantastic, Onlyhumans, Who Owns The Zebra and Mortierbrigade to form Brigada. United as one agency we cut through the noise and set brands in motion.
          </p>
          <div className="col-start-4 col-span-1 text-left pointer-events-auto flex justify-start leading-none">
            <Link
              to="/"
              className="font-body inline-flex items-center gap-2 link-cta"
            >
              (brigada.be)
              <ArrowUpRight className="w-5 h-5" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </div>

      <div
        ref={brigadaWrapRef}
        className="absolute left-0 right-0 text-center leading-none px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96"
        style={{ bottom: "6vh" }}
      >
        <span
          ref={brigadaTextRef}
          className="inline-block whitespace-nowrap"
          style={{
            fontFamily: '"Brigada Serif", serif',
            fontSize: "12vw",
            lineHeight: 0.8,
          }}
        >
          Brigada
        </span>
      </div>
    </div>
  );
};

export default Today;
