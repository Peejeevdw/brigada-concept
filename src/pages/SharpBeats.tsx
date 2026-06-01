import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { gsap } from "gsap";

// "Sharp beats loud" — gooey word-morph test bed.
// Sequence: word 1 sharp & spread → letters converge + goo builds → one blob →
// text swaps to word 2 (still a blob) → letters slide apart + goo melts away →
// word 2 sharp. Ping-pongs between the two words when looping.
//
// Goo filter (codrops "WAVE"): feGaussianBlur → feColorMatrix (alpha threshold)
// → feComposite atop. We drive stdDeviation + letter-spacing from one GSAP
// timeline so the swap lands exactly at peak blob, where it reads as invisible.

const SANS = '"Antarctica", system-ui, sans-serif';

const EASES = ["power2", "power3", "power4", "expo", "circ", "sine"] as const;

const SharpBeats = () => {
  const [word1, setWord1] = useState("SHARP");
  const [word2, setWord2] = useState("BEATS");
  const [word3, setWord3] = useState("LOUD");
  const [fontSize, setFontSize] = useState(180);
  const [fontWeight, setFontWeight] = useState(400);
  const [fontWidth, setFontWidth] = useState(150); // wdth — 150 = Figma "Expanded" instance

  const [blurMax, setBlurMax] = useState(34);
  const [alphaMul, setAlphaMul] = useState(26);
  const [alphaOff, setAlphaOff] = useState(-10);
  const [lsCollapse, setLsCollapse] = useState(-0.62); // em — how tightly letters stack into the blob

  const [convDur, setConvDur] = useState(1.1);
  const [holdDur, setHoldDur] = useState(0.12); // pause at the blob
  const [divDur, setDivDur] = useState(1.3);
  const [restDur, setRestDur] = useState(1.0); // pause on the sharp word between cycles

  const [easeIn, setEaseIn] = useState<(typeof EASES)[number]>("power3");
  const [easeOut, setEaseOut] = useState<(typeof EASES)[number]>("expo");

  const [loop, setLoop] = useState(true);
  const [playKey, setPlayKey] = useState(0);

  const wordRef = useRef<HTMLHeadingElement>(null);
  const feBlurRef = useRef<SVGFEGaussianBlurElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  // Which word is currently shown (mutable, flips on every blob swap).
  const showing = useRef(0);

  useLayoutEffect(() => {
    const el = wordRef.current;
    const feBlur = feBlurRef.current;
    if (!el || !feBlur) return;

    const words = [word1, word2, word3].filter((w) => w.trim().length > 0);
    showing.current = 0;
    el.textContent = words[0];
    el.style.filter = "url(#sb-goo)";

    const v = { blur: 0, ls: 0 };
    const apply = () => {
      feBlur.setAttribute("stdDeviation", String(v.blur));
      el.style.letterSpacing = `${v.ls}em`;
    };
    apply();

    const tl = gsap.timeline({
      paused: true,
      repeat: loop ? -1 : 0,
      onUpdate: apply,
    });

    // converge: sharp word melts into the blob
    tl.to(v, { blur: blurMax, ls: lsCollapse, duration: convDur, ease: `${easeIn}.in` });
    // hold at the blob, swap text at the peak (invisible — it's a featureless blob)
    tl.add(() => {
      showing.current = (showing.current + 1) % words.length;
      el.textContent = words[showing.current];
    });
    tl.to({}, { duration: holdDur });
    // diverge: new word slides apart and sharpens
    tl.to(v, { blur: 0, ls: 0, duration: divDur, ease: `${easeOut}.out` });
    // rest on the sharp word before the next cycle
    tl.to({}, { duration: restDur });

    tlRef.current = tl;
    tl.play();

    return () => {
      tl.kill();
    };
  }, [
    word1, word2, word3, blurMax, lsCollapse, convDur, holdDur, divDur, restDur,
    easeIn, easeOut, loop, playKey,
  ]);

  // Keep typography live without rebuilding the timeline.
  useEffect(() => {
    const el = wordRef.current;
    if (!el) return;
    el.style.fontSize = `min(${fontSize}px, ${fontSize / 11}vw)`;
    el.style.fontVariationSettings = `"wdth" ${fontWidth}, "wght" ${fontWeight}`;
  }, [fontSize, fontWeight, fontWidth]);

  const replay = () => setPlayKey((k) => k + 1);

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

  const EaseSelect = ({
    label, value, onChange,
  }: { label: string; value: string; onChange: (v: (typeof EASES)[number]) => void }) => (
    <label className="mb-3 block">
      <span className="mb-1 block">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as (typeof EASES)[number])}
        className="w-full rounded border border-white/15 bg-white/5 px-2 py-1 text-white outline-none focus:border-white/40"
      >
        {EASES.map((e) => (
          <option key={e} value={e} className="bg-black">{e}</option>
        ))}
      </select>
    </label>
  );

  const TextField = ({
    label, value, onChange,
  }: { label: string; value: string; onChange: (v: string) => void }) => (
    <label className="mb-3 block">
      <span className="mb-1 block">{label}</span>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="w-full rounded border border-white/15 bg-white/5 px-2 py-1 uppercase text-white outline-none focus:border-white/40"
      />
    </label>
  );

  return (
    <main className="relative h-screen w-full overflow-hidden bg-black text-white" style={{ fontFamily: SANS }}>
      {/* goo filter */}
      <svg aria-hidden width="0" height="0" className="absolute">
        <defs>
          <filter id="sb-goo" x="-50%" y="-100%" width="200%" height="300%">
            <feGaussianBlur ref={feBlurRef} in="SourceGraphic" stdDeviation="0" result="blur" />
            <feColorMatrix
              in="blur" mode="matrix"
              values={`1 0 0 0 0  0 1 0 0 0  1 0 1 0 0  0 0 0 ${alphaMul} ${alphaOff}`}
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* stage */}
      <div className="flex h-full w-full items-center justify-center px-[6vw]">
        <h1
          ref={wordRef}
          className="select-none whitespace-nowrap text-center uppercase leading-[1.0]"
          style={{
            fontFamily: SANS,
            fontSize: `min(${fontSize}px, ${fontSize / 11}vw)`,
            fontVariationSettings: `"wdth" ${fontWidth}, "wght" ${fontWeight}`,
          }}
        >
          {word1}
        </h1>
      </div>

      {/* control panel */}
      <div
        className="fixed right-4 top-4 z-50 max-h-[94vh] w-[300px] select-none overflow-y-auto rounded-lg border border-white/15 bg-black/85 p-4 text-[12px] leading-tight shadow-xl backdrop-blur-md"
        style={{ fontFamily: "ui-monospace, monospace" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="uppercase tracking-[0.15em] text-white/40">SHARP · BEATS</span>
          <div className="flex gap-1">
            <button type="button" onClick={() => setLoop((l) => !l)} className={`rounded px-2 py-0.5 ${loop ? "bg-white/30" : "bg-white/10"} hover:bg-white/40`}>↻ loop</button>
            <button type="button" onClick={replay} className="rounded bg-white/20 px-2 py-0.5 hover:bg-white/30">▶ replay</button>
          </div>
        </div>

        <TextField label="Woord 1" value={word1} onChange={setWord1} />
        <TextField label="Woord 2" value={word2} onChange={setWord2} />
        <TextField label="Woord 3" value={word3} onChange={setWord3} />

        <Slider label="Font size" value={fontSize} min={60} max={360} onChange={setFontSize} fmt={(v) => `${Math.round(v)}px`} />
        <Slider label="Font weight (wght)" value={fontWeight} min={100} max={900} step={10} onChange={setFontWeight} />
        <Slider label="Font width (wdth)" value={fontWidth} min={1} max={200} onChange={setFontWidth} fmt={(v) => `${Math.round(v)}${Math.round(v) === 150 ? " · expanded" : ""}`} />

        <div className="my-3 border-t border-white/10" />

        <Slider label="Goo blur max (blob)" value={blurMax} min={0} max={80} onChange={setBlurMax} />
        <Slider label="Goo alpha mult" value={alphaMul} min={1} max={40} onChange={setAlphaMul} />
        <Slider label="Goo alpha offset" value={alphaOff} min={-30} max={0} onChange={setAlphaOff} />
        <Slider label="Letters samen (collapse)" value={lsCollapse} min={-1.2} max={0} factor={100} onChange={setLsCollapse} fmt={(v) => `${v.toFixed(2)}em`} />

        <div className="my-3 border-t border-white/10" />

        <Slider label="Samenkomen (duur)" value={convDur} min={0.2} max={4} factor={10} onChange={setConvDur} fmt={(v) => `${v.toFixed(1)}s`} />
        <Slider label="Blob hold" value={holdDur} min={0} max={2} factor={20} onChange={setHoldDur} fmt={(v) => `${v.toFixed(2)}s`} />
        <Slider label="Uit elkaar (duur)" value={divDur} min={0.2} max={4} factor={10} onChange={setDivDur} fmt={(v) => `${v.toFixed(1)}s`} />
        <Slider label="Rust op woord" value={restDur} min={0} max={4} factor={10} onChange={setRestDur} fmt={(v) => `${v.toFixed(1)}s`} />

        <div className="my-3 border-t border-white/10" />

        <EaseSelect label="Ease samenkomen (.in)" value={easeIn} onChange={setEaseIn} />
        <EaseSelect label="Ease uit elkaar (.out)" value={easeOut} onChange={setEaseOut} />

        <p className="mt-2 text-[10px] leading-snug text-white/40">
          Woord 1 scherp → letters samen + goo → blob → swap naar woord 2 → uit elkaar + goo weg → scherp. goo = feGaussianBlur → feColorMatrix (alpha {alphaMul} {alphaOff}) → atop.
        </p>
      </div>
    </main>
  );
};

export default SharpBeats;
