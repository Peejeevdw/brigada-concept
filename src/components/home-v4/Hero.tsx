import { useEffect, useRef, useState } from "react";
const reelVideo = "/reel.mp4";
import GrainOverlay from "@/components/GrainOverlay";
import CircularCursor from "@/components/CircularCursor";
import {
  duotoneToTintMatrix,
  pickDuotone,
  pickQuadtone,
  quadtoneToTableValues,
  getBrioSettings,
  type Quadtone,
} from "@/data/duotones";

const Hero = () => {
  const [hovered, setHovered] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const blurRef = useRef<SVGFEGaussianBlurElement>(null);
  const dispRef = useRef<SVGFEDisplacementMapElement>(null);
  const desatRef = useRef<SVGFEColorMatrixElement>(null);
  const contrastRef = useRef<SVGFEColorMatrixElement>(null);
  const tintRef = useRef<SVGFEColorMatrixElement>(null);
  const quadRRef = useRef<SVGFEFuncRElement>(null);
  const quadGRef = useRef<SVGFEFuncGElement>(null);
  const quadBRef = useRef<SVGFEFuncBElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const grainRef = useRef<HTMLDivElement>(null);
  const lastP = useRef(-1);
  const tintRefVal = useRef(duotoneToTintMatrix(pickDuotone()));
  const quadRef = useRef<Quadtone | null>(pickQuadtone());
  const wasAtStart = useRef(true);
  const brioRef = useRef(getBrioSettings());
  const brioTick = useRef(0);

  useEffect(() => {
    let raf = 0;
    let ticking = false;

    const apply = () => {
      ticking = false;
      const el = triggerRef.current;
      const wrap = wrapperRef.current;
      if (!el || !wrap) return;
      const rect = el.getBoundingClientRect();
      const distance = el.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), distance);
      const p = distance > 0 ? scrolled / distance : 0;

      // Re-pick palette whenever progress returns to the start frame.
      const atStart = p <= 0.001;
      if (atStart && !wasAtStart.current) {
        tintRefVal.current = duotoneToTintMatrix(pickDuotone());
        quadRef.current = pickQuadtone();
      }
      wasAtStart.current = atStart;

      // Skip if change is negligible. Higher threshold = fewer SVG attr writes.
      if (Math.abs(p - lastP.current) < 0.005) return;
      lastP.current = p;

      const pShape = 1 - p;
      const pDesat = Math.min(1, p / 0.5);
      const lerp = (a: number, b: number) => a + (b - a) * p;
      const lerpShape = (a: number, b: number) => a + (b - a) * pShape;
      const lerpDesat = (a: number, b: number) => a + (b - a) * pDesat;

      // Push CSS vars driving padding, video transform, wordmark transform.
      wrap.style.setProperty("--p", p.toFixed(4));
      wrap.style.setProperty("--pShape", pShape.toFixed(4));
      wrap.style.setProperty("--padX", `${lerpShape(2.5, 0)}rem`);
      wrap.style.setProperty("--padT", `${lerp(0, 4.5)}rem`);
      wrap.style.setProperty("--padB", `${lerpShape(2.5, 0)}rem`);
      wrap.style.setProperty("--reelH", `calc(100vh - ${lerp(0, 4.5)}rem - ${lerpShape(2.5, 0)}rem)`);
      wrap.style.setProperty("--vidScale", `${lerp(1, 1.05)}`);
      wrap.style.setProperty("--wmTy", `calc(${-50 * p}vh + ${lerpShape(0, 3) * p}rem + ${50 * p}%)`);
      wrap.style.setProperty("--wmLs", `${lerp(0.22, -0.02)}em`);
      wrap.style.setProperty("--wmPl", `${lerp(0.22, 0)}em`);
      wrap.style.setProperty("--wmStroke", `${(p * 0.06).toFixed(3)}em`);

      // Toggle filter only when meaningfully active.
      if (videoRef.current) {
        videoRef.current.style.filter = p > 0.01 ? "url(#inkblot-v3)" : "none";
      }
      if (grainRef.current) {
        grainRef.current.style.opacity = `${p * 1.0 * 0}`;
      }

      const tg = brioRef.current.toggles;

      // Cap blur/displacement during active scrolling: these are the heaviest
      // filter primitives and don't visually contribute much until near the end.
      const blurAmt = Math.max(0, Math.min(1, brioRef.current.blur));
      const contrastAmt = Math.max(0, Math.min(1, 0));
      const blurMax = 18; // was 32
      const dispMax = 10; // was 16

      // Update SVG filter primitives directly.
      if (blurRef.current) {
        blurRef.current.setAttribute("stdDeviation", String(lerp(0, blurMax) * blurAmt));
      }
      if (dispRef.current) {
        dispRef.current.setAttribute("scale", String(lerp(0, dispMax) * Math.max(0, Math.min(2, 0))));
      }
      const quad = quadRef.current;
      if (desatRef.current) {
        if (quad) {
          // Quadtone: collapse to luminance ramp so the LUT can remap it.
          const id = lerpDesat(1, 0.2126);
          const g = lerpDesat(0, 0.7152);
          const b = lerpDesat(0, 0.0722);
          const r1 = id, r2 = g, r3 = b;
          const g1 = lerpDesat(0, 0.2126), g2 = lerpDesat(1, 0.7152), g3 = lerpDesat(0, 0.0722);
          const b1 = lerpDesat(0, 0.2126), b2 = lerpDesat(0, 0.7152), b3 = lerpDesat(1, 0.0722);
          desatRef.current.setAttribute(
            "values",
            `${r1} ${r2} ${r3} 0 0 ${g1} ${g2} ${g3} 0 0 ${b1} ${b2} ${b3} 0 0 0 0 0 1 0`
          );
        } else {
          const dR1 = lerpDesat(1, 0.33), dR2 = lerpDesat(0, 0.33), dR3 = lerpDesat(0, 0.33);
          const dG1 = lerpDesat(0, 0.33), dG2 = lerpDesat(1, 0.33), dG3 = lerpDesat(0, 0.33);
          const dB1 = lerpDesat(0, 0.33), dB2 = lerpDesat(0, 0.33), dB3 = lerpDesat(1, 0.33);
          desatRef.current.setAttribute(
            "values",
            `${dR1} ${dR2} ${dR3} 0 0 ${dG1} ${dG2} ${dG3} 0 0 ${dB1} ${dB2} ${dB3} 0 0 0 0 0 1 0`
          );
        }
      }
      if (contrastRef.current) {
        // contrastAmt scales the crush from identity (1,0) to full (8,-3.5),
        // and lerp(...) on top scales by scroll progress.
        const c = lerp(1, 1 + 7 * contrastAmt);
        const o = lerp(0, -3.5 * contrastAmt);
        contrastRef.current.setAttribute(
          "values",
          `${c} 0 0 0 ${o} 0 ${c} 0 0 ${o} 0 0 ${c} 0 ${o} 0 0 0 1 0`
        );
      }
      if (tintRef.current) {
        if (!tg.color || quad) {
          // Color off, or quadtone (LUT handles color): identity tint.
          tintRef.current.setAttribute(
            "values",
            "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"
          );
        } else {
          const tint = tintRefVal.current;
          const r = lerp(1, tint.rScale), rO = lerp(0, tint.rOffset);
          const g = lerp(1, tint.gScale), gO = lerp(0, tint.gOffset);
          const b = lerp(1, tint.bScale), bO = lerp(0, tint.bOffset);
          tintRef.current.setAttribute(
            "values",
            `${r} 0 0 0 ${rO} 0 ${g} 0 0 ${gO} 0 0 ${b} 0 ${bO} 0 0 0 1 0`
          );
        }
      }
      if (quadRRef.current && quadGRef.current && quadBRef.current) {
        if (tg.color && quad) {
          const t = quadtoneToTableValues(quad, p, brioRef.current.thresholds);
          quadRRef.current.setAttribute("tableValues", t.r);
          quadGRef.current.setAttribute("tableValues", t.g);
          quadBRef.current.setAttribute("tableValues", t.b);
        } else {
          const idTable = "0 0.25 0.5 0.75 1";
          quadRRef.current.setAttribute("tableValues", idTable);
          quadGRef.current.setAttribute("tableValues", idTable);
          quadBRef.current.setAttribute("tableValues", idTable);
        }
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(apply);
    };

    apply();
    const onBrioChange = () => {
      brioRef.current = getBrioSettings();
      lastP.current = -1; // force a re-apply on next scroll tick
      apply();
    };
    window.addEventListener("brio-settings-changed", onBrioChange);
    window.addEventListener("storage", onBrioChange);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("brio-settings-changed", onBrioChange);
      window.removeEventListener("storage", onBrioChange);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section
      ref={triggerRef}
      className="relative w-full bg-[#f3f2ef]"
      style={{ height: "150vh" }}
    >
      <div
        ref={wrapperRef}
        className="sticky top-0 h-screen w-full bg-[#f3f2ef] overflow-hidden"
        style={{ contain: "paint" } as React.CSSProperties}
      >
        <div
          style={{
            paddingLeft: "var(--padX, 2.5rem)",
            paddingRight: "var(--padX, 2.5rem)",
            paddingTop: "var(--padT, 0rem)",
            paddingBottom: "var(--padB, 2.5rem)",
          }}
          className="w-full h-screen"
        >
          <div
            className="relative w-full mx-auto overflow-hidden"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
              height: "var(--reelH, calc(100vh - 6rem))",
              backgroundColor: "#f3f2ef",
              transform: "translateZ(0)",
              cursor: hovered ? "none" : "auto",
            }}
          >
            <svg className="absolute -z-10 w-0 h-0" aria-hidden>
              <defs>
                <filter
                  id="inkblot-v3"
                  x="-5%"
                  y="-5%"
                  width="110%"
                  height="110%"
                  colorInterpolationFilters="sRGB"
                >
                  <feColorMatrix
                    ref={desatRef}
                    in="SourceGraphic"
                    type="matrix"
                    values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"
                    result="gray"
                  />
                  <feColorMatrix
                    ref={contrastRef}
                    in="gray"
                    type="matrix"
                    values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"
                    result="contrast"
                  />
                  <feGaussianBlur ref={blurRef} in="contrast" stdDeviation="0" result="blurred" />
                  <feColorMatrix
                    ref={tintRef}
                    in="blurred"
                    type="matrix"
                    values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"
                    result="tinted"
                  />
                  <feComponentTransfer in="tinted" result="mapped">
                    <feFuncR ref={quadRRef} type="table" tableValues="0 0.25 0.5 0.75 1" />
                    <feFuncG ref={quadGRef} type="table" tableValues="0 0.25 0.5 0.75 1" />
                    <feFuncB ref={quadBRef} type="table" tableValues="0 0.25 0.5 0.75 1" />
                  </feComponentTransfer>
                  <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="1" seed="4" result="noise" />
                  <feDisplacementMap
                    ref={dispRef}
                    in="mapped"
                    in2="noise"
                    scale="0"
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="displaced"
                  />
                </filter>
              </defs>
            </svg>

            <video
              ref={videoRef}
              src={reelVideo}
              autoPlay
              preload="metadata"
              muted
              loop
              playsInline
              className="h-full w-full object-cover"
              style={{
                transform: "scale(var(--vidScale, 1))",
                willChange: "transform",
              }}
            />

            <GrainOverlay ref={grainRef} opacity={0} />

            <h1
              className="absolute left-1/2 bottom-0 text-[20vw] md:text-[18vw] leading-[0.85] select-none pointer-events-none whitespace-nowrap"
              style={{
                color: "#f3f2ef",
                transform: "translate(-50%, var(--wmTy, 0))",
                fontFamily: "'Antarctica', system-ui, sans-serif",
                fontWeight: 400,
                letterSpacing: "var(--wmLs, 0.22em)",
                paddingLeft: "var(--wmPl, 0.22em)",
                WebkitTextStroke: "var(--wmStroke, 0em) #f3f2ef",
                willChange: "transform",
                mixBlendMode: "normal",
              }}
            >
              Naranja
            </h1>
          </div>
        </div>
      </div>
      <CircularCursor text="SHARP · BEATS · LOUD · " active={hovered} />
    </section>
  );
};

export default Hero;
