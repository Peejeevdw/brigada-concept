import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Appear from "@/components/Appear";
import RevealText from "@/components/RevealText";

const clients = [
  "Telenet",
  "Agristo",
  "What's Cooking",
  "Golazo",
  "Proximus",
  "KBC",
  "Colruyt",
  "Bpost",
  "Delhaize",
  "Brussels Airlines",
  "Lotus Bakeries",
  "Argenta",
];

const RotatingBrand = () => {
  const ref = useRef<HTMLSpanElement>(null);
  const measureRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [idx, setIdx] = useState(0);
  const prevIdxRef = useRef(0);
  const [phase, setPhase] = useState<"idle" | "anim">("idle");
  const [width, setWidth] = useState<number | null>(null);
  const lastIdxRef = useRef(0);

  const widthFor = (i: number) => {
    const m = measureRefs.current[i];
    return m ? m.getBoundingClientRect().width : 0;
  };

  useEffect(() => {
    setWidth(widthFor(0));
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const next = (lastIdxRef.current + 1) % clients.length;
      prevIdxRef.current = lastIdxRef.current;
      lastIdxRef.current = next;
      setIdx(next);
      setPhase("idle");
      setWidth(widthFor(prevIdxRef.current));
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPhase("anim");
          setWidth(widthFor(next));
        });
      });
    }, 2000);
    return () => window.clearInterval(interval);
  }, []);

  const transition = "transform 500ms cubic-bezier(0.22, 1, 0.36, 1)";

  return (
    <span
      ref={ref}
      style={{
        display: "inline-block",
        overflow: "hidden",
        verticalAlign: "bottom",
        lineHeight: "inherit",
        position: "relative",
        width: width != null ? `${width}px` : undefined,
        transition: "width 500ms cubic-bezier(0.22, 1, 0.36, 1)",
        whiteSpace: "nowrap",
      }}
    >
      {/* Inline sizer keeps the line height correct (children below are absolute). */}
      <span style={{ display: "inline-block", visibility: "hidden" }}>
        {clients[idx]}
      </span>
      {/* Hidden measurers for every brand to know their widths. */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          visibility: "hidden",
          pointerEvents: "none",
          left: 0,
          top: 0,
          whiteSpace: "nowrap",
        }}
      >
        {clients.map((c, i) => (
          <span
            key={c}
            ref={(el) => (measureRefs.current[i] = el)}
            style={{ display: "inline-block" }}
          >
            {c}
          </span>
        ))}
      </span>
      {/* Outgoing previous word slides up out. */}
      <span
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          display: "inline-block",
          transform: phase === "anim" ? "translateY(-110%)" : "translateY(0)",
          transition: phase === "anim" ? transition : "none",
          willChange: "transform",
        }}
      >
        {clients[prevIdxRef.current]}
      </span>
      {/* Incoming current word slides up from below. */}
      <span
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          display: "inline-block",
          transform: phase === "anim" ? "translateY(0)" : "translateY(110%)",
          transition: phase === "anim" ? transition : "none",
          willChange: "transform",
        }}
      >
        {clients[idx]}
      </span>
    </span>
  );
};

type Award = {
  year: number;
  show: string;
  category: string;
  client: string;
};

const awards: Award[] = [
  { year: 2026, show: "Cannes Lions", category: "Gold, Film Craft", client: "Volvo" },
  { year: 2025, show: "Webby", category: "Best Visual Design", client: "Patagonia" },
  { year: 2025, show: "FWA", category: "Site of the Day", client: "Bolt" },
  { year: 2024, show: "D&AD", category: "Yellow Pencil, Branding", client: "Lotus Bakeries" },
  { year: 2024, show: "The One Show", category: "Gold Pencil, Design", client: "Delhaize" },
  { year: 2024, show: "Clio", category: "Gold, Integrated Campaign", client: "Proximus" },
  { year: 2023, show: "ADC", category: "Silver Cube, Direction", client: "BNP Paribas Fortis" },
  { year: 2023, show: "Eurobest", category: "Gold, Outdoor", client: "Telenet" },
  { year: 2023, show: "CSS Design Awards", category: "Site of the Day", client: "KBC" },
  { year: 2022, show: "ADCE", category: "Silver, Brand Identity", client: "VRT" },
  { year: 2022, show: "Lovie Awards", category: "Gold, Best Practices", client: "Brussels Airlines" },
  { year: 2021, show: "Awwwards", category: "Honorable Mention", client: "Studio Brussel" },
  { year: 2020, show: "FWA", category: "Site of the Month", client: "Telenet" },
];

/**
 * Wraps a child and translates it from the right (positive X) to 0 based on
 * the element's vertical position in the viewport. Fully tied to scroll.
 */
const ScrollSlideInRight = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      el.style.transform = "none";
      el.style.opacity = "1";
      return;
    }

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const center = rect.top + rect.height / 2;
      // Only animate while entering (center below viewport mid). Once it
      // crosses the middle going up, keep it settled in place.
      const raw = Math.max(0, (center - vh / 2) / (vh / 2));
      const dist = Math.min(1, raw);
      const eased = Math.pow(dist, 2);
      const x = eased * 160;
      el.style.transform = `translate3d(${x}px, 0, 0)`;
      el.style.opacity = String(1 - eased * 0.7);
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} style={{ willChange: "transform, opacity" }}>
      {children}
    </div>
  );
};

const ReasonsToBelieve = () => {
  return (
    <section className="px-6 md:px-10 pt-8 md:pt-12 pb-24 md:pb-32 bg-[#f3f2ef] text-[#2D2928]">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 items-start">
        <div className="md:sticky md:top-24 md:self-start">
          <Appear from="up" delay={120}>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 text-lg md:text-2xl uppercase tracking-widest font-bold link-cta"
            >
              (Contact us)
              <ArrowUpRight className="w-6 h-6 md:w-8 md:h-8" strokeWidth={2.5} />
            </Link>
          </Appear>
        </div>

        <div className="md:sticky md:top-24 md:self-start">
          <p className="text-3xl md:text-5xl leading-[1.25] font-normal text-left">
            <RotatingBrand />
            <br />
            <RevealText as="span" text="moved forward with our award " className="inline" />
            <RevealText as="span" text="winning work." className="inline" />
          </p>
        </div>

        <div>
          <ul className="space-y-10">
            {awards.map((a, i) => (
              <ScrollSlideInRight key={i}>
                <li className="flex flex-col gap-2 border-b border-[#2D2928]/20 pb-8 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest font-bold tabular-nums">
                      {a.year}
                    </span>
                    <span className="text-xs uppercase tracking-widest opacity-60">
                      {a.show}
                    </span>
                  </div>
                  <span className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
                    {a.category}
                  </span>
                  <span className="text-xs uppercase tracking-widest opacity-60">
                    For {a.client}
                  </span>
                </li>
              </ScrollSlideInRight>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default ReasonsToBelieve;
