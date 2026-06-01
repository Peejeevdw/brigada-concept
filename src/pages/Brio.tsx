import { useMemo, useState } from "react";
import { BrioEffect, getPalettes, type BrioMode } from "@/brio-effect";

const SANS = '"Antarctica", system-ui, sans-serif';

// Test media bundled in /public. Add more here to try them.
const MEDIA: { label: string; src: string }[] = [
  { label: "Brio export (img)", src: "/brio-export.png" },
  { label: "Concept hero (img)", src: "/concept-hero.jpg" },
  { label: "Brand — Mathias (img)", src: "/brand-mathias.jpg" },
  { label: "Meet Marcel (img)", src: "/meetmarcel.jpg" },
  { label: "TUI image (img)", src: "/tui-image.jpg" },
  { label: "Reel (video)", src: "/reel.mp4" },
  { label: "Brio loop (video)", src: "/brio-export-loop.mp4" },
  { label: "Brand 1 (video)", src: "/brand-video-1.mp4" },
  { label: "Meet Marcel (video)", src: "/meetmarcel-loop.mp4" },
];

const MODES: { id: BrioMode; label: string }[] = [
  { id: "footage", label: "Footage" },
  { id: "palette", label: "Palette" },
  { id: "custom", label: "Custom" },
];

const Pill = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`rounded-full border px-4 py-2 text-[12px] uppercase tracking-[0.12em] transition-colors ${
      active
        ? "border-white bg-white text-black"
        : "border-white/25 bg-transparent text-white/70 hover:border-white/60 hover:text-white"
    }`}
    style={{ fontFamily: SANS }}
  >
    {children}
  </button>
);

const Brio = () => {
  const [src, setSrc] = useState(MEDIA[0].src);
  const [mode, setMode] = useState<BrioMode>("footage");
  const [paletteId, setPaletteId] = useState("brio-01");
  const [customText, setCustomText] = useState("#0A0A0A, #E8401C, #F3F2EF");

  const palettes = useMemo(() => getPalettes(), []);

  const customColors = useMemo(
    () =>
      customText
        .split(",")
        .map((c) => c.trim())
        .filter((c) => /^#?[0-9a-fA-F]{6}$/.test(c))
        .map((c) => (c.startsWith("#") ? c : "#" + c)),
    [customText],
  );

  return (
    <div className="min-h-screen bg-[#0c0a08] text-white" style={{ fontFamily: SANS }}>
      <div className="mx-auto flex max-w-[1400px] flex-col gap-8 px-6 py-10 lg:flex-row">
        {/* Controls */}
        <aside className="w-full shrink-0 lg:w-[320px]">
          <h1 className="mb-1 text-[13px] uppercase tracking-[0.2em] text-white/50">
            Brio Effect
          </h1>
          <p className="mb-8 text-[11px] uppercase tracking-[0.12em] text-white/30">
            Test bed
          </p>

          <section className="mb-8">
            <h2 className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/40">
              Source
            </h2>
            <div className="flex flex-wrap gap-2">
              {MEDIA.map((m) => (
                <Pill key={m.src} active={src === m.src} onClick={() => setSrc(m.src)}>
                  {m.label}
                </Pill>
              ))}
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/40">
              Mode
            </h2>
            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => (
                <Pill key={m.id} active={mode === m.id} onClick={() => setMode(m.id)}>
                  {m.label}
                </Pill>
              ))}
            </div>
          </section>

          {mode === "palette" && (
            <section className="mb-8">
              <h2 className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/40">
                Palette
              </h2>
              <div className="flex flex-col gap-2">
                {palettes.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPaletteId(p.id)}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                      paletteId === p.id
                        ? "border-white/80"
                        : "border-white/15 hover:border-white/40"
                    }`}
                  >
                    <span className="flex h-5 overflow-hidden rounded">
                      {(p.stops as unknown as string[]).map((c, i) => (
                        <span key={i} style={{ background: c, width: 12, height: "100%" }} />
                      ))}
                    </span>
                    <span className="text-[12px] uppercase tracking-[0.1em]">
                      {p.name ?? p.id}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {mode === "custom" && (
            <section className="mb-8">
              <h2 className="mb-3 text-[11px] uppercase tracking-[0.18em] text-white/40">
                Custom colors (2–7 hex)
              </h2>
              <input
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                spellCheck={false}
                className="w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 text-[13px] outline-none focus:border-white/60"
                placeholder="#0A0A0A, #E8401C, #F3F2EF"
              />
              <div className="mt-3 flex gap-1">
                {customColors.map((c, i) => (
                  <span
                    key={i}
                    title={c}
                    className="h-6 flex-1 rounded"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <p className="mt-2 text-[11px] text-white/30">
                {customColors.length} valid color{customColors.length === 1 ? "" : "s"}
              </p>
            </section>
          )}
        </aside>

        {/* Preview */}
        <main className="flex-1">
          <BrioEffect
            key={`${src}-${mode}`}
            src={src}
            mode={mode}
            paletteId={paletteId}
            colors={customColors}
            className="aspect-video w-full rounded-xl"
          />
          <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-white/30">
            {mode} · {src}
          </p>
        </main>
      </div>
    </div>
  );
};

export default Brio;
