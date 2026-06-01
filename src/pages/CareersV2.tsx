import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BrigadaWordmark from "@/components/BrigadaWordmark";
import CareersCarousel from "@/components/CareersCarousel";
import CareersFooter from "@/components/CareersFooter";
import HlsBackgroundVideo from "@/components/HlsBackgroundVideo";
import { BrioEffect } from "@/brio-effect";
import { usePageTransition } from "@/components/PageTransition";

gsap.registerPlugin(ScrollTrigger);

// Bunny HLS stream that plays full-bleed behind the careers hero text.
const HERO_HLS_SRC =
  "https://vz-329506f6-bc3.b-cdn.net/c2b163ea-71a6-4fdd-a960-ac6ac4157268/playlist.m3u8";

// Careers page (v2) — started as a copy of the /brand page, in the concept-page
// idiom (self-contained, framer-motion, Antarctica, public/ assets via BASE_URL).
// Lives standalone at /careers-v2 (its own nav, outside SiteLayout). Content is
// still the brand copy — to be replaced with careers content from here.

const SANS = '"Antarctica", system-ui, sans-serif';
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const INK = "#2d2928";

// Navigation — same treatment as the /concept page (progressive blur + the
// Expertise dropdown), with a centred Brigada wordmark and an extra "More" item
// on the right. Left group / wordmark / right group together fill the bar.
type NavItemDef = { label: string; items: string[] };
const NAV_LEFT: NavItemDef[] = [
  { label: "Expertise", items: ["Brand", "Product", "People", "Marketing"] },
  { label: "Work", items: [] },
  { label: "About", items: [] },
];
const NAV_RIGHT: NavItemDef[] = [
  { label: "Careers", items: [] },
  { label: "Contact", items: [] },
  { label: "More", items: [] },
];

// One nav entry (label + optional hover dropdown), faithful to the concept nav.
const NavItem = ({
  item,
  openLabel,
  openMenu,
  scheduleClose,
  alignRight,
  onSub,
}: {
  item: NavItemDef;
  openLabel: string | null;
  openMenu: (label: string) => void;
  scheduleClose: () => void;
  alignRight: boolean;
  onSub: (sub: string) => void;
}) => (
  <div
    className="relative flex items-center px-5 -mx-5"
    onMouseEnter={() => openMenu(item.label)}
    onMouseLeave={scheduleClose}
  >
    <span
      className="cursor-pointer text-[14px] uppercase tracking-[0.1em] opacity-90 transition-opacity hover:opacity-100"
      style={{ fontFamily: SANS }}
      onClick={() => onSub(item.label)}
    >
      {item.label}
    </span>
    <AnimatePresence>
      {openLabel === item.label && item.items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.28, ease: EASE_OUT }}
          className={`absolute top-full pt-2 ${alignRight ? "right-5" : "left-5"}`}
        >
          <ul className="flex flex-row items-center gap-[clamp(32px,4vw,80px)] whitespace-nowrap">
            {item.items.map((sub) => (
              <li key={sub}>
                <button
                  type="button"
                  onClick={() => onSub(sub)}
                  className="block text-[14px] uppercase leading-[20px] tracking-[1.4px] opacity-90 transition-opacity hover:opacity-60"
                  style={{ fontFamily: SANS }}
                >
                  {sub}
                </button>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// Open positions — placeholder list (same copy repeated for now).
const VACANCY_BLURB =
  "As a Senior Client Manager you will be responsible for leading and delivering complex client projects and mid-size accounts; creating clarity, consistency and momentum while growing your commercial and strategic impact.";
const VACANCIES = [
  { title: "Senior Brand Strategist", description: VACANCY_BLURB },
  { title: "Senior Brand Strategist", description: VACANCY_BLURB },
  { title: "Senior Brand Strategist", description: VACANCY_BLURB },
  { title: "Senior Brand Strategist", description: VACANCY_BLURB },
];

// Shared gutter — same as the /concept page so content runs full-bleed (no
// centred max-width), gutters only.
const GUTTER = "px-[clamp(24px,5vw,72px)]";

// Subtle fade-up reveal on scroll into view (concept-style polish).
const Reveal = ({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-10% 0px" }}
    transition={{ duration: 0.7, ease: EASE_OUT, delay }}
  >
    {children}
  </motion.div>
);

const SectionLabel = ({ children }: { children: ReactNode }) => (
  <h2
    className="shrink-0 text-[clamp(18px,1.5vw,22px)] uppercase leading-none"
    style={{ fontWeight: 500 }}
  >
    {children}
  </h2>
);

const CareersV2 = () => {
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  // Hover-intent voor het nav-submenu: korte sluit-vertraging zodat bewegen
  // tussen label en submenu (of net links/rechts van het label) het menu niet
  // dichtklapt. Opnieuw een nav-item binnenkomen annuleert het sluiten.
  const navCloseTimer = useRef<number | null>(null);
  const openMenu = (label: string) => {
    if (navCloseTimer.current !== null) {
      window.clearTimeout(navCloseTimer.current);
      navCloseTimer.current = null;
    }
    setOpenLabel(label);
  };
  const scheduleMenuClose = () => {
    if (navCloseTimer.current !== null) window.clearTimeout(navCloseTimer.current);
    navCloseTimer.current = window.setTimeout(() => {
      setOpenLabel(null);
      navCloseTimer.current = null;
    }, 180);
  };
  const transitionTo = usePageTransition();
  // Nav targets — Expertise→Brand goes to /brand, Careers goes to /careers-v2.
  const onSub = (sub: string) => {
    if (sub === "Brand") transitionTo("/brand");
    else if (sub === "Product") transitionTo("/product");
    else if (sub === "People") transitionTo("/people");
    else if (sub === "Careers") transitionTo("/careers-v2");
    else if (sub === "About") transitionTo("/about-v2");
    else if (sub === "Expertise") transitionTo("/expertise-v2");
  };

  // Smooth scroll — same Lenis setup as /concept, so the carousel + parallax
  // footer glide instead of stepping with the native wheel. ScrollTrigger is
  // kept in sync each frame; reduced-motion falls back to native scroll. (The
  // page background is intentionally static here — no scroll-driven tint.)
  useEffect(() => {
    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduce) return;

    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);
  return (
    <main className="min-h-screen w-full bg-white" style={{ fontFamily: SANS }}>
      <style>{`
        html.lenis, html.lenis body { height: auto; }
        .lenis.lenis-smooth { scroll-behavior: auto !important; }
        .lenis.lenis-smooth [data-lenis-prevent] { overscroll-behavior: contain; }
        .lenis.lenis-stopped { overflow: hidden; }
        .progressive-blur { z-index: 40; pointer-events: none; isolation: isolate; contain: paint; width: 100%; height: 20em; transform-style: preserve-3d; position: absolute; top: 0; left: 0; overflow: hidden; transform: translateZ(0); transition: height 0.4s cubic-bezier(0.625, 0.05, 0, 1); }
        .progressive-blur.is--open { height: var(--blur-depth, 48em); }
        .progressive-blur__layer { width: 100%; height: 100%; position: absolute; }
        .progressive-blur__layer.is--1 { -webkit-backdrop-filter: blur(.09375em); backdrop-filter: blur(.09375em); -webkit-mask: linear-gradient(to top, #0000 50%, #000 62.5% 75%, #0000 87.5%); mask: linear-gradient(to top, #0000 50%, #000 62.5% 75%, #0000 87.5%); }
        .progressive-blur__layer.is--2 { -webkit-backdrop-filter: blur(.1875em); backdrop-filter: blur(.1875em); -webkit-mask: linear-gradient(to top, #0000 62.5%, #000 75% 87.5%, #0000 100%); mask: linear-gradient(to top, #0000 62.5%, #000 75% 87.5%, #0000 100%); }
        .progressive-blur__layer.is--3 { -webkit-backdrop-filter: blur(.375em); backdrop-filter: blur(.375em); -webkit-mask: linear-gradient(to top, #0000 75%, #000 87.5% 100%); mask: linear-gradient(to top, #0000 75%, #000 87.5% 100%); }
        .progressive-blur__layer.is--4 { -webkit-backdrop-filter: blur(.75em); backdrop-filter: blur(.75em); -webkit-mask: linear-gradient(to top, #0000 82%, #000 92% 100%); mask: linear-gradient(to top, #0000 82%, #000 92% 100%); }
        .progressive-blur__layer.is--5 { -webkit-backdrop-filter: blur(1.5em); backdrop-filter: blur(1.5em); -webkit-mask: linear-gradient(to top, #0000 88%, #000 100%); mask: linear-gradient(to top, #0000 88%, #000 100%); }
      `}</style>

      {/* Navigation — concept-page nav (progressive blur + Expertise dropdown),
          centred Brigada wordmark, extra "More" on the right. */}
      <motion.div
        className="fixed inset-x-0 top-0 z-50"
        initial={{ y: "-100%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}
      >
        <div className={`progressive-blur${[...NAV_LEFT, ...NAV_RIGHT].some((i) => i.label === openLabel && i.items.length > 0) ? " is--open" : ""}`} aria-hidden>
          <div className="progressive-blur__layer is--1" />
          <div className="progressive-blur__layer is--2" />
          <div className="progressive-blur__layer is--3" />
          <div className="progressive-blur__layer is--4" />
          <div className="progressive-blur__layer is--5" />
        </div>
        <nav className="relative z-50 flex h-[72px] items-stretch justify-between px-[clamp(24px,5vw,72px)] text-brigada-black">
          {NAV_LEFT.map((item) => (
            <NavItem key={item.label} item={item} openLabel={openLabel} openMenu={openMenu} scheduleClose={scheduleMenuClose} alignRight={false} onSub={onSub} />
          ))}
          {/* Wordmark — in-flow centre item so justify-between spreads all 7
              elements with equal gaps; click transitions back to /concept */}
          <button
            type="button"
            onClick={() => transitionTo("/concept")}
            aria-label="Brigada — home"
            className="flex items-center"
          >
            <BrigadaWordmark className="block h-auto w-[100px]" />
          </button>
          {NAV_RIGHT.map((item) => (
            <NavItem key={item.label} item={item} openLabel={openLabel} openMenu={openMenu} scheduleClose={scheduleMenuClose} alignRight onSub={onSub} />
          ))}
        </nav>
      </motion.div>

      {/* Content — full width (gutters only, no centred max-width), like /concept.
          Its height drives the white→#FEECF2 background progress. */}
      <div className="w-full">
        {/* Hero — careers intro text over a full-bleed HLS background video. */}
        <section
          className={`relative overflow-hidden ${GUTTER} pt-[clamp(120px,18vw,250px)] pb-[clamp(80px,12vw,160px)]`}
        >
          {/* Background — brio "Green & Blue" (palette brio-03) over the concept
              hero image, full-bleed behind the nav and hero text. Wrapped because
              BrioEffect forces position:relative on its own container. */}
          <div className="absolute inset-0 z-0">
            <BrioEffect
              src={`${import.meta.env.BASE_URL}concept-hero.jpg`}
              mode="palette"
              paletteId="brio-03"
              className="h-full w-full"
            />
          </div>
          <div className="relative z-10">
            <Reveal>
              <p
                className="text-[clamp(20px,2.5vw,36px)] uppercase leading-[0.9] tracking-[-0.02em] text-brigada-black"
                style={{ fontWeight: 500, fontStretch: "125%" }}
              >
                Baby make your move
              </p>
            </Reveal>
            <Reveal delay={0.08} className="mt-[clamp(18px,1.7vw,25px)]">
              <h1
                className="w-full text-[clamp(32px,5.56vw,80px)] leading-[1.06] tracking-[-0.01em] text-brigada-black"
                style={{ fontWeight: 400 }}
              >
                We think for ourselves. We want to keep learning and pushing for
                better, even after a substantial lunch. We make the hard choices
                and say what needs to be said.
              </h1>
            </Reveal>
          </div>
        </section>

        {/* Disciplines (Figma 308:2633) */}
        <section
          className={`${GUTTER} pt-[clamp(48px,7vw,96px)] pb-[clamp(80px,12vw,180px)]`}
          style={{ color: INK }}
        >
          {VACANCIES.map((v, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <div className="border-t" style={{ borderColor: INK }} />
              <div className="mt-[clamp(20px,2vw,26px)] mb-[clamp(28px,3.5vw,52px)] flex flex-col gap-8 md:flex-row md:justify-between">
                <SectionLabel>{v.title}</SectionLabel>
                <p className="w-full text-[clamp(15px,1.25vw,18px)] leading-[1.6] md:w-[49%]">
                  {v.description}
                </p>
              </div>
            </Reveal>
          ))}
        </section>
      </div>

      {/* Careers image carousel (Skiper54 Carousel_006 — expand-on-active). */}
      <CareersCarousel />

      {/* Footer — parallax reveal, white background + black wordmark */}
      <CareersFooter />
    </main>
  );
};

export default CareersV2;
