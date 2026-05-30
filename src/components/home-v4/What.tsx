import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Appear from "@/components/Appear";

type Pillar = {
  label: string;
  to: string;
  bg: string; // background color
  fg: string; // foreground / type color
};

const pillars: Pillar[] = [
  {
    label: "Brand",
    to: "/expertise/brand",
    bg: "#f3f2ef",
    fg: "#2D2928",
  },
  {
    label: "Product",
    to: "/expertise/product",
    bg: "#f3f2ef",
    fg: "#2D2928",
  },
  {
    label: "People",
    to: "/expertise/people",
    bg: "#f3f2ef",
    fg: "#2D2928",
  },
  {
    label: "Marketing",
    to: "/expertise/marketing",
    bg: "#f3f2ef",
    fg: "#2D2928",
  },
];

const PillarRow = ({ p, i, total }: { p: Pillar; i: number; total: number }) => {
  const rowRef = useRef<HTMLAnchorElement>(null);
  const labelRef = useRef<HTMLHeadingElement>(null);
  const rafRef = useRef(0);
  const scrollRafRef = useRef(0);
  const [hovered, setHovered] = useState(false);
  const [progress, setProgress] = useState(0); // 0 = off-screen right, 1 = settled

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setProgress(1);
      return;
    }

    const compute = () => {
      const el = rowRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      // Stagger: each row starts later than the previous one.
      // Row i becomes "active" once its top crosses (vh * (1 - startBand)) - i*step.
      const startBand = 0.25; // start when row enters bottom 25% of viewport
      const span = vh * 0.45;  // distance over which it travels in
      const stagger = vh * 0.08 * i; // later rows wait longer
      const start = vh * (1 - startBand) + stagger; // rect.top value where progress = 0
      const end = start - span; // rect.top value where progress = 1
      const raw = (start - rect.top) / (start - end);
      const clamped = Math.max(0, Math.min(1, raw));
      setProgress(clamped);
    };

    const onScroll = () => {
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, [i, total]);

  const handleMove = (e: React.MouseEvent) => {
    const row = rowRef.current;
    const label = labelRef.current;
    if (!row || !label) return;
    const rRect = row.getBoundingClientRect();
    const lRect = label.getBoundingClientRect();
    const cx = lRect.left + lRect.width / 2;
    const cy = lRect.top + lRect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const maxX = rRect.width / 2 - lRect.width / 2 - 8;
    const maxY = rRect.height / 2 - lRect.height / 2 - 8;
    const x = Math.max(-maxX, Math.min(maxX, dx));
    const y = Math.max(-maxY, Math.min(maxY, dy));
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      label.style.transform = `translate(${x}px, ${y}px)`;
    });
  };

  const handleLeave = () => {
    setHovered(false);
    const label = labelRef.current;
    if (label) label.style.transform = "translate(0px, 0px)";
  };

  // Ease-out for nicer motion.
  const eased = 1 - Math.pow(1 - progress, 3);

  // Word-by-word reveal: each "word" gets its own slice of progress.
  const words: string[] = [`0${i + 1}`, p.label, "Explore"];
  const perWord = 1 / words.length;
  const wordOpacity = (idx: number) => {
    const local = (eased - idx * perWord) / perWord;
    return Math.max(0, Math.min(1, local));
  };
  const wordTranslate = (idx: number) => {
    const o = wordOpacity(idx);
    return (1 - o) * 16; // px shift up from below
  };

  return (
    <Link
      ref={rowRef}
      to={p.to}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="group relative flex items-center justify-between px-2 md:px-4 py-8 md:py-10 border-b transition-colors"
      style={{
        borderColor: "#2D2928",
        color: p.fg,
      }}
    >
      <div className="flex items-baseline gap-3 md:gap-5">
        <span
          className="text-xs uppercase tracking-widest opacity-60 w-8 inline-block will-change-transform"
          style={{
            opacity: wordOpacity(0) * 0.6,
            transform: `translate3d(0, ${wordTranslate(0)}px, 0)`,
          }}
        >
          0{i + 1}
        </span>
        <h3
          ref={labelRef}
          className="text-3xl md:text-5xl font-normal tracking-tight group-hover:font-serif pointer-events-none will-change-transform"
          style={{
            transition: hovered
              ? "transform 120ms ease-out"
              : "transform 500ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <span
            style={{
              display: "inline-block",
              overflow: "hidden",
              verticalAlign: "bottom",
              lineHeight: "inherit",
            }}
          >
            <span
              className="inline-block will-change-transform"
              style={{
                transform: `translateY(${(1 - wordOpacity(1)) * 110}%)`,
                transition: "transform 900ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              {p.label}
            </span>
          </span>
        </h3>
      </div>
      <span
        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest opacity-60 group-hover:opacity-100 will-change-transform"
        style={{
          opacity: wordOpacity(2) * 0.6,
          transform: `translate3d(0, ${wordTranslate(2)}px, 0)`,
        }}
      >
        Explore
        <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
      </span>
    </Link>
  );
};

const TopBorder = () => {
  return (
    <div
      className="h-px w-full"
      style={{ backgroundColor: "#2D2928" }}
    />
  );
};

const What = () => {
  return (
    <section className="relative px-6 md:px-10 pt-4 pb-16 md:pb-20 bg-[#f3f2ef]">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 items-start">
        <div className="md:sticky md:top-24 md:self-start">
          <Appear from="up" delay={120}>
            <Link
              to="/expertise"
              className="inline-flex items-center gap-2 text-lg md:text-2xl uppercase tracking-widest font-bold link-cta"
            >
              (All services)
              <ArrowUpRight className="w-6 h-6 md:w-8 md:h-8" strokeWidth={2.5} />
            </Link>
          </Appear>
        </div>
        <div className="relative z-10 md:col-span-2">
          <div className="overflow-hidden">
            <TopBorder />
            {pillars.map((p, i) => (
              <PillarRow key={p.label} p={p} i={i} total={pillars.length} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default What;
