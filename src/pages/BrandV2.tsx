import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BrigadaWordmark from "@/components/BrigadaWordmark";
import BrandOrbit from "@/components/BrandOrbit";
import BrandFooter from "@/components/BrandFooter";
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

// Hero text-reveal — ported from the /concept hero (just the "Sharp Beats Loud"
// tagline + "We cut through…" paragraph reveal; no logo, reel video or white cut).
const TAGLINE = ["how", "we", "build", "your", "brand"];
// Tagline reveal — codrops "WAVE" gooey blur (filter goo-1), tuned on /wave-test.
const GOO_BLUR_START = 50; // feGaussianBlur stdDeviation at the start
const GOO_ALPHA_MUL = 31; // feColorMatrix alpha multiplier (goo contrast)
const GOO_ALPHA_OFF = -6; // feColorMatrix alpha offset (goo threshold)
const GOO_DUR = 2; // settle duration (s)
const PARAGRAPH = [
  "We craft brands. We give them purpose",
  "and personality, and we make them look,",
  "sounds and feel like they’ve got a pulse.",
];
// Defaults for the live tuning state (see the dev panel at the bottom).
const DEF_HERO_VH = 139; // hero scroll length in vh
const DEF_CUT_AT = 0.3; // progress at which the tagline reaches full size / cut
const DEF_BASE_START = 42; // tagline size (px @1728) at scroll start
const DEF_BASE_END = 80; // tagline size (px @1728) once fully scrolled up
const DEF_TAGLINE_TOP = 50; // tagline start position (vh from top of sticky)
const DEF_PARA_TOP = 70; // paragraph start position (vh from top of sticky)
const DEF_GROUP_UP = 64; // how far the group scrolls up by p=1 (vh)
const DEF_SECTION_PULL = 30; // how far the pink section overlaps up over the hero (vh)

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

// Brand disciplines list (Figma 308:2434). Some link to a detail page.
const DISCIPLINES = [
  "Brand strategy & platforms",
  "Naming, verbal & sonic identity",
  "Brand identity concept & design",
  "Motion to spatial identity design",
  "Brand implementation & management",
];
const DISCIPLINE_LINKS: Record<string, string> = {
  "Brand strategy & platforms": "/employer-branding",
};

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

const BrandV2 = () => {
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
  const bgColor = useTransform(scrollP, [0, 1], ["#FFFFFF", "#FEECF2"]);

  // ---- Hero text-reveal choreography (ported from /concept) ----
  // Own scroll-progress across the pinned hero; the tagline + paragraph rise into
  // view as one group, the tagline grows, the paragraph clips up line-by-line.
  const heroRef = useRef<HTMLElement>(null);
  const taglineRef = useRef<HTMLDivElement>(null);
  const p = useMotionValue(0);
  // Live tuning state (driven by the dev panel at the bottom of the page).
  const [heroVh, setHeroVh] = useState(DEF_HERO_VH);
  const [cutAt, setCutAt] = useState(DEF_CUT_AT);
  const [baseStart, setBaseStart] = useState(DEF_BASE_START);
  const [baseEnd, setBaseEnd] = useState(DEF_BASE_END);
  const [taglineTop, setTaglineTop] = useState(DEF_TAGLINE_TOP);
  const [paraTop, setParaTop] = useState(DEF_PARA_TOP);
  const [groupUp, setGroupUp] = useState(DEF_GROUP_UP);
  const [sectionPull, setSectionPull] = useState(DEF_SECTION_PULL);
  // Group (tagline + paragraph) scrolls up uniformly as the hero is scrolled.
  const groupY = useTransform(p, [0, 1], ["0vh", `-${groupUp}vh`]);
  // Per-line clip-up reveal, staggered.
  const line0Y = useTransform(p, [0.22, 0.5], ["115%", "0%"]);
  const line1Y = useTransform(p, [0.4, 0.68], ["115%", "0%"]);
  const line2Y = useTransform(p, [0.58, 0.86], ["115%", "0%"]);
  const lineYs = [line0Y, line1Y, line2Y];
  // Hard cut: right as the tagline reaches ~full size (cutAt) the black hero
  // flips to white, and the hero text + nav flip white → black simultaneously.
  const whiteOpacity = useTransform(p, [cutAt, cutAt + 0.025], [0, 1]);
  const cutColor = useTransform(p, [cutAt, cutAt + 0.025], ["#ffffff", BRIGADA_BLACK]);
  // Tagline grows from baseStart→baseEnd as it scrolls up (size relative to a
  // 1728px-wide screen, scaling down with the viewport on narrower screens).
  const baselineSize = useMotionValue("36px");
  useEffect(() => {
    const update = (v: number) => {
      const tt = Math.min(1, Math.max(0, v / cutAt));
      const px = baseStart + (baseEnd - baseStart) * tt;
      baselineSize.set(`min(${px}px, ${px / 17.28}vw)`);
    };
    update(p.get());
    return p.on("change", update);
  }, [p, baselineSize, baseStart, baseEnd, cutAt]);
  // Recompute scroll progress when the hero length changes (dev slider).
  useEffect(() => {
    window.dispatchEvent(new Event("resize"));
  }, [heroVh]);
  // Tagline reveal — codrops "WAVE" gooey blur (goo-1), played once on page load
  // (no scroll trigger): blur 50→0 + opacity 0→1, ease expo; filter dropped after.
  useLayoutEffect(() => {
    const el = taglineRef.current;
    const feBlur = document.querySelector<SVGFEGaussianBlurElement>("#brandv2-goo feGaussianBlur");
    if (!el || !feBlur) return;
    const vals = { stdDeviation: GOO_BLUR_START };
    feBlur.setAttribute("stdDeviation", String(GOO_BLUR_START));
    el.style.filter = "url(#brandv2-goo)";
    gsap.set(el, { opacity: 0 });
    const tl = gsap
      .timeline({
        defaults: { duration: GOO_DUR, ease: "expo" },
        onUpdate: () => feBlur.setAttribute("stdDeviation", String(vals.stdDeviation)),
        onComplete: () => {
          el.style.filter = "none";
        },
      })
      .to(vals, { startAt: { stdDeviation: GOO_BLUR_START }, stdDeviation: 0 }, 0)
      .to(el, { startAt: { opacity: 0 }, opacity: 1 }, 0);
    return () => {
      tl.kill();
      el.style.filter = "none";
      gsap.set(el, { opacity: 1 });
    };
  }, []);
  // Paragraph: one shared font size so the WIDEST line fills the full width.
  const paraRef = useRef<HTMLDivElement>(null);
  const [paraSize, setParaSize] = useState(90);
  useLayoutEffect(() => {
    const fit = () => {
      const root = paraRef.current;
      if (!root) return;
      const spans = root.querySelectorAll<HTMLElement>("[data-line]");
      if (!spans.length) return;
      const wrap = spans[0].parentElement as HTMLElement;
      const avail = wrap.clientWidth;
      const current = parseFloat(getComputedStyle(spans[0]).fontSize);
      let maxNatural = 0;
      spans.forEach((s) => {
        const range = document.createRange();
        range.selectNodeContents(s);
        maxNatural = Math.max(maxNatural, range.getBoundingClientRect().width);
      });
      if (maxNatural > 0 && avail > 0) setParaSize((current * avail) / maxNatural);
    };
    fit();
    if (document.fonts?.ready) document.fonts.ready.then(fit);
    const ro = new ResizeObserver(fit);
    if (paraRef.current) ro.observe(paraRef.current);
    return () => ro.disconnect();
  }, []);

  // Smooth scroll — same Lenis setup as /concept, so the orbit + parallax footer
  // glide instead of stepping with the native wheel. ScrollTrigger is kept in
  // sync each frame; the background progress follows the same scroll, and
  // reduced-motion falls back to native scroll.
  useEffect(() => {
    // Progress 0→1 across the white content block (top → orbit entering view),
    // plus the hero's own progress (top → pin release) for the text reveal.
    const updateProgress = () => {
      const el = contentRef.current;
      const range = el ? el.offsetHeight - window.innerHeight : window.innerHeight;
      scrollP.set(range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0);
      const hero = heroRef.current;
      const hRange = hero ? hero.offsetHeight - window.innerHeight : window.innerHeight * 2;
      p.set(hRange > 0 ? Math.min(1, Math.max(0, window.scrollY / hRange)) : 0);
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
  }, [scrollP, p]);
  return (
    <motion.main className="min-h-screen w-full" style={{ fontFamily: SANS, backgroundColor: bgColor }}>
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
        <motion.nav style={{ color: cutColor }} className="relative z-50 flex h-[72px] items-stretch justify-between px-[clamp(24px,5vw,72px)]">
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
        </motion.nav>
      </motion.div>

      {/* Content — full width (gutters only, no centred max-width), like /concept.
          Its height drives the white→#FEECF2 background progress. */}
      <div ref={contentRef} className="w-full">
        {/* Hero text-reveal — pinned section; "Sharp Beats Loud" + paragraph rise
            into view as one group while the tagline grows and the lines clip up.
            Ported from /concept (no logo / reel video / white cut). */}
        <section ref={heroRef} className="relative z-10" style={{ height: `${heroVh}vh` }}>
          <div className="sticky top-0 h-screen select-none overflow-hidden bg-brigada-black">
            {/* goo-1 filter for the tagline "WAVE" reveal (feGaussianBlur →
                feColorMatrix goo → feComposite). Region widened so the bloom
                isn't clipped on smaller text. */}
            <svg aria-hidden width="0" height="0" className="absolute">
              <defs>
                <filter id="brandv2-goo" x="-20%" y="-100%" width="140%" height="300%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="0" result="blur" />
                  <feColorMatrix in="blur" mode="matrix" values={`1 0 0 0 0  0 1 0 0 0  1 0 1 0 0  0 0 0 ${GOO_ALPHA_MUL} ${GOO_ALPHA_OFF}`} result="goo" />
                  <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                </filter>
              </defs>
            </svg>
            {/* White block that overtakes the black hero at the hard cut */}
            <motion.div
              className="pointer-events-none absolute inset-0 z-[5] bg-white"
              style={{ opacity: whiteOpacity }}
              aria-hidden
            />
            {/* Content group — tagline + paragraph scroll up uniformly; white → black at the cut */}
            <motion.div className="absolute inset-0 z-10" style={{ y: groupY, color: cutColor }}>
              {/* Tagline — HOW WE MOVE BRANDS (starts mid-screen, sits above the paragraph) */}
              <motion.div ref={taglineRef} className="absolute inset-x-0 flex justify-between px-[clamp(24px,5vw,72px)]" style={{ top: `${taglineTop}vh` }}>
                {TAGLINE.map((word) => (
                  <motion.span
                    key={word}
                    className="uppercase tracking-[-0.015em]"
                    style={{ fontFamily: SANS, fontStretch: "125%", fontSize: baselineSize }}
                  >
                    {word}
                  </motion.span>
                ))}
              </motion.div>

              {/* Paragraph — auto-sized; clips up line-by-line on scroll */}
              <motion.div ref={paraRef} className="absolute inset-x-0 px-[clamp(24px,5vw,72px)]" style={{ top: `${paraTop}vh` }}>
                {PARAGRAPH.map((line, i) => (
                  <div key={line} className="overflow-hidden">
                    <motion.span
                      data-line
                      style={{ y: lineYs[i], fontFamily: SANS, fontSize: `${paraSize}px` }}
                      className="block whitespace-nowrap pb-[0.06em] font-light leading-[1.0] tracking-[-0.02em]"
                    >
                      {line}
                    </motion.span>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Pink section — slides up OVER the hero via a negative top margin
            (tunable in the dev panel). Solid pink so it covers the hero behind it. */}
        <div
          className="relative z-20"
          style={{ marginTop: `-${sectionPull}vh`, backgroundColor: "#FEECF2" }}
        >
        {/* Disciplines (Figma 308:2633) — first pink-section block after the hero */}
        <section className={`${GUTTER} pt-[clamp(48px,7vw,96px)]`} style={{ color: INK }}>
          <Reveal>
            <div className="border-t" style={{ borderColor: INK }} />
            <div className="mt-[clamp(20px,2vw,26px)] flex flex-col gap-8 md:flex-row md:justify-between">
              <SectionLabel>Brand</SectionLabel>
              <ul
                className="w-full text-[clamp(15px,1.25vw,18px)] md:w-[49%]"
                style={{ lineHeight: "40px" }}
              >
                {DISCIPLINES.map((d) => {
                  const href = DISCIPLINE_LINKS[d];
                  return (
                    <li key={d}>
                      {href ? (
                        <button
                          type="button"
                          onClick={() => transitionTo(href)}
                          className="group inline-flex items-center gap-2 text-left transition-opacity hover:opacity-60"
                        >
                          <span>{d}</span>
                          <span className="relative top-[-2px] inline-block transition-transform duration-300 ease-out group-hover:translate-x-1">
                            →
                          </span>
                        </button>
                      ) : (
                        d
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </Reveal>
        </section>

        {/* Brand contact (Figma 308:2437–2440) */}
        <section
          className={`${GUTTER} pt-[clamp(40px,5vw,72px)] pb-[clamp(80px,12vw,180px)]`}
          style={{ color: INK }}
        >
          <Reveal>
            <div className="border-t" style={{ borderColor: INK }} />
            <div className="mt-[clamp(28px,3vw,42px)] flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
              <SectionLabel>Brand contact</SectionLabel>
              <div className="flex w-full flex-col gap-8 sm:flex-row sm:items-start sm:gap-[clamp(24px,2.4vw,34px)] md:w-[49%]">
                <div className="w-[clamp(200px,18vw,262px)] shrink-0 overflow-hidden">
                  {/* Blur-in on scroll into view */}
                  <motion.img
                    src={`${import.meta.env.BASE_URL}brand-mathias.jpg`}
                    alt="Mathias — Brand Lead"
                    className="block aspect-[262/362] w-full object-cover"
                    initial={{ filter: "blur(16px)", scale: 1.06 }}
                    whileInView={{ filter: "blur(0px)", scale: 1 }}
                    viewport={{ once: true, margin: "-10% 0px" }}
                    transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.22 }}
                  />
                </div>
                <div className="text-[clamp(15px,1.25vw,18px)] leading-[22px]">
                  <p>Mathias is the guy to talk to.</p>
                  <p className="mt-[18px]">Mathias</p>
                  <p>Brand Lead</p>
                  <p>mathias@brigada.be</p>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
        </div>
      </div>

      {/* Branding cases — Osmo "Orbit Tiles Infinite Loop" (full-viewport). */}
      <BrandOrbit />

      {/* Footer — parallax reveal, ported from /concept; wordmark gets the goo reveal */}
      <BrandFooter gooReveal />

      {/* Dev-only live tuning panel for the hero choreography.
          Hidden — flip `false` → `true` to restore. */}
      {false && import.meta.env.DEV && (
        <div
          className="fixed bottom-4 left-4 z-[60] w-[240px] select-none rounded-lg border border-white/15 bg-brigada-black/80 p-3 text-[11px] leading-tight text-white shadow-xl backdrop-blur-md"
          style={{ fontFamily: "ui-monospace, monospace" }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="uppercase tracking-[0.15em] text-white/40">Hero tuning · dev</span>
            <button
              type="button"
              onClick={() => {
                setHeroVh(DEF_HERO_VH);
                setCutAt(DEF_CUT_AT);
                setBaseStart(DEF_BASE_START);
                setBaseEnd(DEF_BASE_END);
                setTaglineTop(DEF_TAGLINE_TOP);
                setParaTop(DEF_PARA_TOP);
                setGroupUp(DEF_GROUP_UP);
                setSectionPull(DEF_SECTION_PULL);
              }}
              className="rounded bg-white/10 px-2 py-0.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
            >
              reset
            </button>
          </div>
          <label className="mb-2 block">
            Hero length — {heroVh}vh <span className="text-white/40">(↓ = sneller)</span>
            <input type="range" min={103} max={250} value={heroVh} onChange={(e) => setHeroVh(+e.target.value)} className="mt-1 w-full accent-white" />
          </label>
          <label className="mb-2 block">
            Cut at — {Math.round(cutAt * 100)}% of scroll
            <input type="range" min={5} max={95} value={Math.round(cutAt * 100)} onChange={(e) => setCutAt(+e.target.value / 100)} className="mt-1 w-full accent-white" />
          </label>
          <label className="mb-2 block">
            Tagline start size — {baseStart}px
            <input type="range" min={16} max={90} value={baseStart} onChange={(e) => setBaseStart(+e.target.value)} className="mt-1 w-full accent-white" />
          </label>
          <label className="mb-2 block">
            Tagline end size — {baseEnd}px
            <input type="range" min={40} max={160} value={baseEnd} onChange={(e) => setBaseEnd(+e.target.value)} className="mt-1 w-full accent-white" />
          </label>
          <label className="mb-2 block">
            Tagline start pos — {taglineTop}vh
            <input type="range" min={0} max={90} value={taglineTop} onChange={(e) => setTaglineTop(+e.target.value)} className="mt-1 w-full accent-white" />
          </label>
          <label className="mb-2 block">
            Paragraph start pos — {paraTop}vh
            <input type="range" min={0} max={100} value={paraTop} onChange={(e) => setParaTop(+e.target.value)} className="mt-1 w-full accent-white" />
          </label>
          <label className="mb-2 block">
            Group scroll-up — {groupUp}vh
            <input type="range" min={0} max={120} value={groupUp} onChange={(e) => setGroupUp(+e.target.value)} className="mt-1 w-full accent-white" />
          </label>
          <label className="block">
            Section pull (over hero) — {sectionPull}vh
            <input type="range" min={0} max={120} value={sectionPull} onChange={(e) => setSectionPull(+e.target.value)} className="mt-1 w-full accent-white" />
          </label>
        </div>
      )}
    </motion.main>
  );
};

export default BrandV2;
