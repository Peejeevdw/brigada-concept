import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Exact reproduction of the codrops "WAVE" word (filter goo-1 + js/filter1.js).
// NOT a turbulence/displacement wave — it's a gooey blur reveal:
//   feGaussianBlur → feColorMatrix ("goo" alpha threshold) → feComposite atop.
// The high blur + alpha threshold blooms the letters into hard-edged blobs that
// resolve to crisp text (no soft blur visible). The animation runs:
//   • on scroll into view  (ScrollTrigger start 'center bottom')
//   • on click             (replay button → timeline.restart())
// stdDeviation 50 → 0, opacity 0 → 1, duration 2, ease 'expo'.

const SANS = '"Antarctica", system-ui, sans-serif';

const DEF_BLUR_START = 50; // feGaussianBlur stdDeviation at the start
const DEF_ALPHA_MUL = 13; // feColorMatrix alpha multiplier (goo contrast)
const DEF_ALPHA_OFF = -6; // feColorMatrix alpha offset (goo threshold)
const DEF_DURATION = 2; // seconds

const WaveTest = () => {
  const [text, setText] = useState("Wave");
  const [fontSize, setFontSize] = useState(180);
  const [blurStart, setBlurStart] = useState(DEF_BLUR_START);
  const [alphaMul, setAlphaMul] = useState(DEF_ALPHA_MUL);
  const [alphaOff, setAlphaOff] = useState(DEF_ALPHA_OFF);
  const [duration, setDuration] = useState(DEF_DURATION);

  const textRef = useRef<HTMLHeadingElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  // Build the faithful filter1.js timeline: plays on scroll into view, and can
  // be replayed on demand. Rebuilt when the tunable knobs change.
  useLayoutEffect(() => {
    const el = textRef.current;
    const feBlur = document.querySelector<SVGFEGaussianBlurElement>("#wave-goo feGaussianBlur");
    if (!el || !feBlur) return;
    const vals = { stdDeviation: blurStart };
    feBlur.setAttribute("stdDeviation", String(blurStart));
    gsap.set(el, { opacity: 0 });
    const tl = gsap
      .timeline({
        defaults: { duration, ease: "expo" },
        onUpdate: () => feBlur.setAttribute("stdDeviation", String(vals.stdDeviation)),
        scrollTrigger: { trigger: el, start: "center bottom" },
      })
      .to(vals, { startAt: { stdDeviation: blurStart }, stdDeviation: 0 }, 0)
      .to(el, { startAt: { opacity: 0 }, opacity: 1 }, 0);
    tlRef.current = tl;
    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blurStart, duration, text, fontSize, alphaMul, alphaOff]);

  const replay = () => tlRef.current?.restart();

  const gooValues = `1 0 0 0 0  0 1 0 0 0  1 0 1 0 0  0 0 0 ${alphaMul} ${alphaOff}`;

  const Slider = ({
    label, value, min, max, step = 1, factor = 1, onChange, fmt,
  }: {
    label: string; value: number; min: number; max: number; step?: number;
    factor?: number; onChange: (v: number) => void; fmt?: (v: number) => string;
  }) => (
    <label className="mb-3 block">
      <span className="flex justify-between">
        <span>{label}</span>
        <span className="text-white/50">{fmt ? fmt(value) : value}</span>
      </span>
      <input
        type="range" min={min} max={max} step={step}
        value={Math.round(value * factor)}
        onChange={(e) => onChange(+e.target.value / factor)}
        className="mt-1 w-full accent-white"
      />
    </label>
  );

  return (
    <main className="relative w-full bg-black text-white" style={{ fontFamily: SANS }}>
      {/* Exact goo-1 filter */}
      <svg aria-hidden width="0" height="0" className="absolute">
        <defs>
          <filter id="wave-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values={gooValues} result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Spacer so the text starts below the fold — scroll down to trigger it */}
      <section className="flex h-screen items-end justify-center pb-10 text-white/30">
        <span className="text-[12px] uppercase tracking-[0.2em]">scroll ↓</span>
      </section>

      {/* WAVE text — triggers on scroll into view (center bottom) */}
      <section className="flex h-screen items-center justify-center px-[6vw]">
        <h1
          ref={textRef}
          className="w-full text-center uppercase leading-[1.0] tracking-[-0.02em]"
          style={{
            fontSize: `min(${fontSize}px, ${fontSize / 17.28}vw)`,
            fontWeight: 400,
            opacity: 0,
            filter: "url(#wave-goo)",
          } as CSSProperties}
        >
          {text}
        </h1>
      </section>

      {/* tail spacer so there's room to scroll past */}
      <section className="h-[50vh]" />

      {/* Control panel */}
      <div
        className="fixed right-4 top-4 z-50 max-h-[92vh] w-[290px] select-none overflow-y-auto rounded-lg border border-white/15 bg-black/85 p-4 text-[12px] leading-tight shadow-xl backdrop-blur-md"
        style={{ fontFamily: "ui-monospace, monospace" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="uppercase tracking-[0.15em] text-white/40">WAVE · goo-1 (exact)</span>
          <button type="button" onClick={replay} className="rounded bg-white/20 px-2 py-0.5 hover:bg-white/30">▶ replay</button>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block">Tekst</span>
          <input
            type="text" value={text} onChange={(e) => setText(e.target.value)}
            className="w-full rounded border border-white/15 bg-white/5 px-2 py-1 text-white outline-none focus:border-white/40"
          />
        </label>

        <Slider label="Font size" value={fontSize} min={40} max={320} onChange={setFontSize} fmt={(v) => `${Math.round(v)}px`} />
        <Slider label="Blur start (stdDeviation)" value={blurStart} min={0} max={120} onChange={setBlurStart} />
        <Slider label="Goo alpha mult" value={alphaMul} min={1} max={40} onChange={setAlphaMul} />
        <Slider label="Goo alpha offset" value={alphaOff} min={-30} max={0} onChange={setAlphaOff} />
        <Slider label="Duration" value={duration} min={2} max={50} factor={10} onChange={setDuration} fmt={(v) => `${v.toFixed(1)}s`} />

        <p className="mt-2 text-[10px] leading-snug text-white/40">
          Speelt op scroll (center bottom) én op replay. goo-1 = feGaussianBlur → feColorMatrix (alpha {alphaMul} {alphaOff}) → feComposite atop. Geen turbulence/displacement.
        </p>
      </div>
    </main>
  );
};

export default WaveTest;
