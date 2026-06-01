import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BrigadaWordmark from "@/components/BrigadaWordmark";

gsap.registerPlugin(ScrollTrigger);

// Test bed for the codrops "WAVE" gooey-blur reveal (filter goo-1):
//   feGaussianBlur → feColorMatrix ("goo" alpha threshold) → feComposite atop.
// Each section has its OWN filter so they reveal independently. Every section
// plays on scroll into view (ScrollTrigger 'center bottom') and on replay.

const SANS = '"Antarctica", system-ui, sans-serif';
const BRIGADA = '"Brigada Sans", "Brigada Variable", serif';

const DEF_BLUR_START = 50;
const DEF_ALPHA_MUL = 31;
const DEF_ALPHA_OFF = -6;
const DEF_DURATION = 2;

// One reusable gooey-blur reveal with its own filter + scroll/replay timeline.
const GooReveal = ({
  id, blurStart, alphaMul, alphaOff, duration, playKey, className, style, children,
}: {
  id: string;
  blurStart: number;
  alphaMul: number;
  alphaOff: number;
  duration: number;
  playKey: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const first = useRef(true);

  useLayoutEffect(() => {
    const el = ref.current;
    const feBlur = document.querySelector<SVGFEGaussianBlurElement>(`#${id} feGaussianBlur`);
    if (!el || !feBlur) return;
    const vals = { stdDeviation: blurStart };
    feBlur.setAttribute("stdDeviation", String(blurStart));
    el.style.filter = `url(#${id})`;
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
  }, [id, blurStart, duration, children]);

  // Replay on demand (skip the initial mount).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    tlRef.current?.restart();
  }, [playKey]);

  return (
    <>
      <svg aria-hidden width="0" height="0" className="absolute">
        <defs>
          <filter id={id} x="-20%" y="-100%" width="140%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values={`1 0 0 0 0  0 1 0 0 0  1 0 1 0 0  0 0 0 ${alphaMul} ${alphaOff}`} result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>
      <div ref={ref} className={className} style={style}>
        {children}
      </div>
    </>
  );
};

const WaveTest = () => {
  const [text, setText] = useState("How we build your brand");
  const [fontSize, setFontSize] = useState(80);
  const [wordmarkW, setWordmarkW] = useState(60); // vw
  const [blurStart, setBlurStart] = useState(DEF_BLUR_START);
  const [alphaMul, setAlphaMul] = useState(DEF_ALPHA_MUL);
  const [alphaOff, setAlphaOff] = useState(DEF_ALPHA_OFF);
  const [duration, setDuration] = useState(DEF_DURATION);
  const [playKey, setPlayKey] = useState(0);

  const replayAll = () => setPlayKey((k) => k + 1);

  const goo = { blurStart, alphaMul, alphaOff, duration, playKey };

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

  const Label = ({ n, children }: { n: number; children: ReactNode }) => (
    <span className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-[0.2em] text-white/30">
      {n} · {children}
    </span>
  );

  return (
    <main className="relative w-full bg-brigada-black text-white" style={{ fontFamily: SANS }}>
      {/* intro spacer */}
      <section className="flex h-screen items-end justify-center pb-10 text-white/30">
        <span className="text-[12px] uppercase tracking-[0.2em]">scroll ↓</span>
      </section>

      {/* 1 — editable text, Antarctica */}
      <section className="relative flex h-screen items-center justify-center px-[6vw]">
        <GooReveal id="goo-text" {...goo} className="w-full">
          <h1
            className="w-full text-center uppercase leading-[1.0] tracking-[-0.02em]"
            style={{ fontFamily: SANS, fontSize: `min(${fontSize}px, ${fontSize / 17.28}vw)`, fontWeight: 400 }}
          >
            {text}
          </h1>
        </GooReveal>
        <Label n={1}>Antarctica · editable</Label>
      </section>

      {/* 2 — "Brigada" in the Brigada font */}
      <section className="relative flex h-screen items-center justify-center px-[6vw]">
        <GooReveal id="goo-brigada" {...goo} className="w-full">
          <h1
            className="w-full text-center leading-[1.0] tracking-[-0.01em]"
            style={{ fontFamily: BRIGADA, fontSize: `min(${fontSize * 1.4}px, ${(fontSize * 1.4) / 17.28}vw)`, fontWeight: 500 }}
          >
            Brigada
          </h1>
        </GooReveal>
        <Label n={2}>Brigada Sans (font)</Label>
      </section>

      {/* 3 — Brigada wordmark (SVG logo) */}
      <section className="relative flex h-screen items-center justify-center px-[6vw]">
        <GooReveal id="goo-wordmark" {...goo} className="flex w-full justify-center">
          <BrigadaWordmark className="block h-auto text-white" style={{ width: `${wordmarkW}vw` }} />
        </GooReveal>
        <Label n={3}>Wordmark (SVG)</Label>
      </section>

      {/* tail spacer */}
      <section className="h-[50vh]" />

      {/* Control panel — shared across all three */}
      <div
        className="fixed right-4 top-4 z-50 max-h-[92vh] w-[290px] select-none overflow-y-auto rounded-lg border border-white/15 bg-brigada-black/85 p-4 text-[12px] leading-tight shadow-xl backdrop-blur-md"
        style={{ fontFamily: "ui-monospace, monospace" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="uppercase tracking-[0.15em] text-white/40">WAVE · goo-1</span>
          <button type="button" onClick={replayAll} className="rounded bg-white/20 px-2 py-0.5 hover:bg-white/30">▶ replay all</button>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block">Tekst (sectie 1)</span>
          <input
            type="text" value={text} onChange={(e) => setText(e.target.value)}
            className="w-full rounded border border-white/15 bg-white/5 px-2 py-1 text-white outline-none focus:border-white/40"
          />
        </label>

        <Slider label="Font size (1 & 2)" value={fontSize} min={40} max={320} onChange={setFontSize} fmt={(v) => `${Math.round(v)}px`} />
        <Slider label="Wordmark width (3)" value={wordmarkW} min={20} max={90} onChange={setWordmarkW} fmt={(v) => `${Math.round(v)}vw`} />
        <Slider label="Blur start (stdDeviation)" value={blurStart} min={0} max={120} onChange={setBlurStart} />
        <Slider label="Goo alpha mult" value={alphaMul} min={1} max={40} onChange={setAlphaMul} />
        <Slider label="Goo alpha offset" value={alphaOff} min={-30} max={0} onChange={setAlphaOff} />
        <Slider label="Duration" value={duration} min={2} max={50} factor={10} onChange={setDuration} fmt={(v) => `${v.toFixed(1)}s`} />

        <p className="mt-2 text-[10px] leading-snug text-white/40">
          3 secties, elk eigen filter. Speelt op scroll (center bottom) én op replay. goo-1 = feGaussianBlur → feColorMatrix (alpha {alphaMul} {alphaOff}) → feComposite atop.
        </p>
      </div>
    </main>
  );
};

export default WaveTest;
