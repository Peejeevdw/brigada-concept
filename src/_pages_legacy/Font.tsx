import { useEffect, useId, useMemo, useRef, useState } from "react";
import GrainOverlay from "@/components/GrainOverlay";
import {
  quadtones,
  DEFAULT_QUADTONE_ID,
  DEFAULT_BRIO_SETTINGS,
  quadtoneToTableValues,
} from "@/data/duotones";
import bg1 from "@/assets/font-bg/bg-1.jpg";
import bg2 from "@/assets/font-bg/bg-2.jpg";
import bg3 from "@/assets/font-bg/bg-3.jpg";
import bg4 from "@/assets/font-bg/bg-4.jpg";
import bg5 from "@/assets/font-bg/bg-5.jpg";
import bg6 from "@/assets/font-bg/bg-6.jpg";

const PRESETS = [
  { id: "sans", name: "Sans", wght: 0 },
  { id: "mid", name: "Mid", wght: 100 },
  { id: "serif", name: "Serif", wght: 200 },
] as const;

type PresetId = typeof PRESETS[number]["id"];

const RANDOM_IMAGES = [bg1, bg2, bg3, bg4, bg5, bg6];

const Font = () => {
  const [wght, setWght] = useState(0);
  const [text, setText] = useState("Brigada");
  const [presetId, setPresetId] = useState<PresetId>("sans");
  const [imgSrc] = useState(
    () => RANDOM_IMAGES[Math.floor(Math.random() * RANDOM_IMAGES.length)],
  );

  const userInteractedRef = useRef(false);

  const selectPreset = (id: PresetId) => {
    userInteractedRef.current = true;
    const p = PRESETS.find((p) => p.id === id)!;
    setPresetId(id);
    setWght(p.wght);
  };

  // Auto-animate the wght slider on mount: wait 2s, then ramp 0 -> 200 over 3s.
  useEffect(() => {
    const startDelay = 2000;
    const duration = 3000;
    let rafId = 0;
    let startTs = 0;
    const tick = (ts: number) => {
      if (userInteractedRef.current) return;
      if (!startTs) startTs = ts;
      const t = Math.min(1, (ts - startTs) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      setWght(Math.round(eased * 200));
      if (t < 1) rafId = requestAnimationFrame(tick);
      else setPresetId("serif");
    };
    const timeout = window.setTimeout(() => {
      if (userInteractedRef.current) return;
      rafId = requestAnimationFrame(tick);
    }, startDelay);
    return () => {
      window.clearTimeout(timeout);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Brio filter (default Brio 01 + Normal preset)
  const rawId = useId().replace(/:/g, "");
  const fid = `font-brio-${rawId}`;
  const quadtone = useMemo(
    () => quadtones.find((q) => q.id === DEFAULT_QUADTONE_ID) ?? quadtones[0],
    [],
  );
  const lut = useMemo(
    () => quadtoneToTableValues(quadtone, 1, DEFAULT_BRIO_SETTINGS.thresholds),
    [quadtone],
  );
  const { blur } = DEFAULT_BRIO_SETTINGS;
  const blurStd = blur * 32 + Math.pow(blur, 3) * 96;

  return (
    <div className="h-screen overflow-hidden bg-[#f3f2ef]" style={{ color: "#2D2928" }}>
      <main className="h-full px-6 md:px-10 pt-6 pb-6 w-full flex flex-row gap-6 lg:gap-10 overflow-hidden">
        {/* Column 1: title + description */}
        <div className="w-[22%] min-w-[240px] h-full flex flex-col shrink-0">
          <h1 className="leading-none font-semibold text-4xl md:text-5xl mb-4">Font</h1>
          <p className="text-xs md:text-sm opacity-80 mb-6 italic whitespace-pre-line">
            Brigada Variable{"\n\n"}A bespoke variable typeface morphing from Sans to Serif along a single weight axis. Adjust the axis to find your voice.
          </p>
          <div className="text-[11px] uppercase tracking-widest opacity-60 mt-auto">
            Axis: wght 0 → 200
          </div>
        </div>

        {/* Column 2: live preview */}
        <div className="flex-1 min-w-0 h-full flex flex-col">
          <div className="relative flex-1 min-h-0 border border-[#2D2928]/15 bg-[#2D2928] flex items-center justify-center p-10 overflow-hidden [container-type:inline-size]">
            <svg className="absolute w-0 h-0 overflow-hidden pointer-events-none" aria-hidden>
              <defs>
                <filter id={fid} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
                  <feColorMatrix
                    in="SourceGraphic"
                    type="matrix"
                    values="0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 1 0"
                    result="gray"
                  />
                  <feGaussianBlur in="gray" stdDeviation={blurStd} edgeMode="duplicate" result="blurred" />
                  <feComponentTransfer in="blurred">
                    <feFuncR type="table" tableValues={lut.r} />
                    <feFuncG type="table" tableValues={lut.g} />
                    <feFuncB type="table" tableValues={lut.b} />
                  </feComponentTransfer>
                </filter>
              </defs>
            </svg>

            <img
              src={imgSrc}
              alt=""
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: `url(#${fid})`, transform: "scale(1.25)", transformOrigin: "center", willChange: "transform" }}
            />
            <GrainOverlay opacity={1.0 * 0} />

            <div
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => setText(e.currentTarget.textContent ?? "")}
              className="relative w-full text-center focus:outline-none whitespace-nowrap text-white"
              style={{
                fontFamily: '"Brigada Variable", serif',
                fontVariationSettings: `"wght" ${wght}`,
                fontSize: "14cqw",
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {text}
            </div>
          </div>
        </div>

        {/* Column 3: settings */}
        <div className="w-[320px] shrink-0 h-full flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-12">
            {/* Preset selector */}
            <section>
              <div className="text-xs uppercase tracking-widest opacity-60 mb-3">Preset</div>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((p) => {
                  const active = p.id === presetId;
                  return (
                    <button
                      key={p.id}
                      onClick={() => selectPreset(p.id)}
                      className={`p-2 border text-xs uppercase tracking-widest transition ${
                        active
                          ? "border-[#2D2928] bg-[#2D2928] text-[#f3f2ef]"
                          : "border-[#2D2928]/20 hover:border-[#2D2928]/60"
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Axis */}
            <section>
              <div className="text-xs uppercase tracking-widest opacity-60 mb-3">Axes</div>
              <div className="space-y-5">
                <SliderRow
                  label="Weight (wght)"
                  desc="0 = Sans, 200 = Serif."
                  value={wght}
                  min={0}
                  max={200}
                  step={1}
                  onChange={(v) => {
                    userInteractedRef.current = true;
                    setWght(v);
                    setPresetId("sans");
                  }}
                  format={(v) => v.toFixed(0)}
                />
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

interface SliderRowProps {
  label: string;
  desc: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}

const SliderRow = ({ label, desc, value, min, max, step, onChange, format }: SliderRowProps) => (
  <div>
    <div className="flex justify-between text-xs opacity-70 mb-1">
      <span className="uppercase tracking-widest">{label}</span>
      <span className="font-mono">{format(value)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-[#2D2928]"
    />
    <div className="text-[11px] opacity-50 mt-1">{desc}</div>
  </div>
);

export default Font;
