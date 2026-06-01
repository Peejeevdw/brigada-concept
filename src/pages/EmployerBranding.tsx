import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BrigadaWordmark from "@/components/BrigadaWordmark";
import CareersFooter from "@/components/CareersFooter";
import { usePageTransition } from "@/components/PageTransition";
import { BRIGADA_BLACK } from "@/lib/colors";

gsap.registerPlugin(ScrollTrigger);

// Brand page — implemented from Figma (node 308:2369), built in the concept-page
// idiom (self-contained, framer-motion, Antarctica, public/ assets via BASE_URL).
// Reel layer and the trailing "Meet the clients" heading are intentionally left
// out for now (design not finalised there).

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

// Brand disciplines list (Figma 308:2434).
const DISCIPLINES = [
  "Brand strategy & platforms",
  "Naming, verbal & sonic identity",
  "Brand identity concept & design",
  "Motion to spatial identity design",
  "Brand implementation & management",
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

const EmployerBranding = () => {
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
    else if (sub === "Careers") transitionTo("/careers-v2");
    else if (sub === "About") transitionTo("/about-v2");
  };

  // Scroll-driven background — the page warms from white to #FEECF2 as you scroll
  // through the (white) content block, reaching full tint right as the dark orbit
  // slides over. framer-motion interpolates the hex colour for us.
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollP = useMotionValue(0);
  // Achtergrond zweeft heel traag tussen een paar lichte groentinten — even zacht,
  // alleen een subtiele hue-verschuiving. Geanimeerd op de motion.main hieronder.
  const BG_TINTS = ["#E7FFE5", "#E6FFEF", "#ECFFE4", "#E2FBEC", "#E7FFE5"];

  // Smooth scroll — same Lenis setup as /concept, so the orbit + parallax footer
  // glide instead of stepping with the native wheel. ScrollTrigger is kept in
  // sync each frame; the background progress follows the same scroll, and
  // reduced-motion falls back to native scroll.
  useEffect(() => {
    // Progress 0→1 across the white content block (top → orbit entering view).
    const updateProgress = () => {
      const el = contentRef.current;
      const range = el ? el.offsetHeight - window.innerHeight : window.innerHeight;
      scrollP.set(range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0);
    };
    updateProgress();
    window.addEventListener("resize", updateProgress);

    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduce) {
      window.addEventListener("scroll", updateProgress, { passive: true });
      return () => {
        window.removeEventListener("scroll", updateProgress);
        window.removeEventListener("resize", updateProgress);
      };
    }

    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    lenis.on("scroll", updateProgress);
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      window.removeEventListener("resize", updateProgress);
    };
  }, [scrollP]);
  return (
    <motion.main
      className="min-h-screen w-full"
      style={{ fontFamily: SANS }}
      animate={{ backgroundColor: BG_TINTS }}
      transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
    >
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
      <div ref={contentRef} className="w-full">
        {/* Intro — employer branding. Placeholder copy for now. */}
        <section className={`${GUTTER} pt-[clamp(110px,15vw,200px)]`}>
          <Reveal>
            <button
              type="button"
              onClick={() => transitionTo("/brand")}
              className="group inline-flex items-center gap-2 text-[clamp(14px,1vw,16px)] text-brigada-black transition-opacity hover:opacity-60"
            >
              <span className="relative top-[-2px] inline-block transition-transform duration-300 ease-out group-hover:-translate-x-1">
                ←
              </span>
              <span>Brand</span>
            </button>
          </Reveal>
          <Reveal delay={0.06} className="mt-[clamp(20px,2vw,32px)]">
            <h1
              className="w-full text-[clamp(40px,5.79vw,100px)] leading-[1.04] tracking-[-0.01em] text-brigada-black"
              style={{ fontWeight: 400 }}
            >
              Employer Branding is not a recruitment campaign
            </h1>
          </Reveal>
          <Reveal delay={0.12} className="mt-[clamp(56px,7vw,128px)]">
            <div className="flex flex-col gap-10 md:flex-row md:justify-between">
              {/* Left — supporting body copy (placeholder) */}
              <div
                className="flex w-full flex-col gap-[18px] text-[20px] md:w-[42%]"
                style={{ lineHeight: "150%", color: BRIGADA_BLACK }}
              >
                <p>
                  Employer branding is often approached as a recruitment
                  challenge. How do we attract more people? How do we generate
                  more applications? How do we fill the pipeline?
                </p>
                <p>
                  Those are important questions, but they&rsquo;re not the
                  starting point according to us.
                </p>
                <p>
                  A recruitment campaign is designed to solve a specific
                  challenge in a specific moment. An employer brand should do
                  something much bigger. It should provide a long-term framework
                  that shapes how an organization presents itself to current and
                  future employees, not for a few months, but for years.
                </p>
                <p>
                  That&rsquo;s why recruitment campaigns should be expressions
                  of an employer brand, not the other way around. The employer
                  brand provides the story, the belief and the direction.
                  Campaigns simply bring that story to life for a particular
                  audience or hiring need.
                </p>
                <p>
                  Yet many organizations still treat employer branding as an
                  attraction exercise. The focus shifts to adding more messages,
                  more benefits and more reasons to apply. In the process, the
                  brand becomes broader, safer and less distinctive.
                </p>
                <p>
                  We believe employer branding should be held to the same
                  standards as any other branding discipline. Because branding
                  is about making choices. Defining what matters. Being honest.
                  Having the courage to focus. Not trying to appeal to everyone,
                  but becoming impossible to confuse with anyone else.
                </p>
              </div>
              {/* Right — statement (placeholder) */}
              <p
                className="w-full text-[clamp(26px,2.6vw,42px)] leading-[1.3] text-brigada-black md:w-[42%]"
                style={{ fontWeight: 400 }}
              >
                An employer brand should do something much bigger. It should
                provide a long-term framework that shapes how an organization
                presents itself to current and future employees, not for a few
                months, but for years.
              </p>
            </div>
          </Reveal>
        </section>

        {/* Disciplines (Figma 308:2633) */}
        <section className={`${GUTTER} pt-[clamp(48px,7vw,96px)] pb-[clamp(80px,12vw,180px)]`} style={{ color: INK }}>
          <Reveal>
            <div className="border-t" style={{ borderColor: INK }} />
            <div className="mt-[clamp(20px,2vw,26px)] flex flex-col gap-8 md:flex-row md:justify-between">
              <SectionLabel>Brand</SectionLabel>
              <ul
                className="w-full text-[clamp(15px,1.25vw,18px)] md:w-[42%]"
                style={{ lineHeight: "40px" }}
              >
                {DISCIPLINES.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          </Reveal>
        </section>

      </div>

      {/* Footer — zwarte variant: zwarte achtergrond, witte tekst + wit wordmark */}
      <CareersFooter />
    </motion.main>
  );
};

export default EmployerBranding;
