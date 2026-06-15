"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BrandFooter from "@/components/BrandFooter";
import {
  MediaFill,
  thumbVideoMedia,
  HeroMedia,
  toMedia,
  type SanityMedia,
} from "@/components/case-media";
import { useRouter } from "next/navigation";
import { usePageTransition } from "@/components/PageTransition";
import { BRIGADA_BLACK } from "@/lib/colors";
import { useCanvasColor } from "@/hooks/useCanvasColor";
import { useCoarsePointer } from "@/lib/useCoarsePointer";
import { urlFor } from "@/lib/sanity";
import { BrioEffect } from "@/brio-effect";
import { onPreloaderReveal } from "@/lib/preloader-gate";
import CyclingPhrases from "@/components/CyclingPhrases";
import LogoWall from "@/components/LogoWall";
import Reveal from "@/components/site/Reveal";
import { GUTTER } from "@/lib/siteTokens";

gsap.registerPlugin(ScrollTrigger);


const NAV_ITEMS = [
  { label: "Services", items: ["Brand", "Marketing", "People", "Product"] },
  { label: "Work", items: [] as string[] },
  { label: "About", items: [] as string[] },
  { label: "Careers", items: [] as string[] },
  { label: "Contact", items: [] as string[] },
];
const TAGLINE = ["Sharp", "Beats", "Loud"];
const PARAGRAPH = [
  "We cut through the noise to set brands",
  "in motion across everything they do.",
];
const SANS = '"Antarctica", system-ui, sans-serif';

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

// Flip to true (in dev) to show the on-page type-tuning panel.
const SHOW_TUNING_PANEL = false;

// "Proud not loud" awards section — tijdelijk verborgen; zet op true om terug.
const SHOW_AWARDS = false;
// Cases-collectie op de homepage — verborgen; zet op true om terug te tonen.
const SHOW_CASES = false;
// Intro-explainer (zwart tekstvlak onder de hero) — verborgen; zet op true terug.
const SHOW_INTRO_EXPLAINER = false;
// "Working with the best" recognition section — verborgen; zet op true om terug.
const SHOW_WORKING_WITH_BEST = false;
// Reel-sectie boven de footer — verborgen; zet op true om terug te tonen.
const SHOW_REEL = false;
// Dev-tuningpaneel voor de hero-timings (dwell per zin + fade). Zet op false om
// te verbergen.
const SHOW_TIMING_PANEL = true;

// "This is us" scroll-hero (v3) — de agencies onder Brigada, gestapeld in scène 2.
// Hardcoded concept-lijst (zie visuals).
const AGENCIES = [
  "mortierbrigade",
  "fantastic",
  "meetmarcel",
  "onlyhumans",
  "today",
  "who owns the zebra",
];

// v4 — de volledige hero-sequentie: één gecentreerde zin per "scherm", auto-
// cyclend op een timer (niet scroll). "\n" = regeleinde binnen een zin.
const ALL_PHRASES = [
  "This is us",
  ...AGENCIES,
  "We build a new and unique agency",
  "Around four interconnected domains.",
  "Brand.",
  "Marketing",
  "People",
  "Product",
  "As one we will be sharper",
  "To cut the noise\nand put brands in motion",
  "With a new name\nthat carries legacy\nand boosts energy",
];

// Achtergrond-wissels: vanaf "We build…" de /careers-brio "Green & Blue", en
// vanaf "As one we will be sharper" de /work-footer brio "Pink & Yellow".
const WE_BUILD_INDEX = ALL_PHRASES.indexOf("We build a new and unique agency");
const AS_ONE_INDEX = ALL_PHRASES.indexOf("As one we will be sharper");

// Placeholder client logos voor de "Clients"-wall — zelfde set als de
// service-detailpagina's (/product, /people). Vervang later door echte
// client-SVG's in /public/assets/logos.
const CLIENT_LOGOS = [
  "northwind", "lumen", "vertex", "atlas", "orbit", "pulse",
  "nova", "forge", "halo", "quanta", "zenith", "drift",
].map((name) => ({ src: `/assets/logos/${name}.svg`, alt: name }));

// Aggregate awards metrics for the "Proud not loud" list — DRAFT placeholder,
// pending final copy/numbers from the team. Rendered when Sanity has no
// awards.items yet. `count` is the metric, `label` the award, `note` an aside.
type AwardMetric = { count: string; label: string; note?: string };
const AWARDS_PLACEHOLDER: AwardMetric[] = [
  { count: "15", label: "Effies" },
  { count: "40", label: "Cannes Lions", note: "including the prestigious Titanium Lion" },
  { count: "3", label: "Eurobest Grand Prix" },
  { count: "Multiple", label: "Gold awards at BEA World" },
  { count: "300+", label: "Creative Belgium Awards" },
  { count: "3×", label: "Specialist Agency of the Year" },
  { count: "Several", label: "Agency of the Year awards" },
];

// Staggered slide-up reveal for the awards rows as the list scrolls into view.
const AWARDS_LIST_VARIANTS = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const AWARDS_ROW_VARIANTS = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};

// Counts a metric up from 0 to its number the first time it scrolls into view.
// Parses a leading integer + optional suffix ("300+", "3×"); non-numeric values
// ("Multiple", "Several") render as-is. rAF-driven (an animated motion value
// doesn't progress reliably here under Next 16 + React 19), cubic-out, and
// honours prefers-reduced-motion by showing the final value straight away.
const CountUp = ({
  value,
  className,
  style,
  duration = 1400,
}: {
  value: string;
  className?: string;
  style?: CSSProperties;
  duration?: number;
}) => {
  const match = value.match(/^(\d+)(.*)$/);
  const target = match ? parseInt(match[1], 10) : null;
  const suffix = match ? match[2] : "";
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    if (target === null) return;
    const el = ref.current;
    if (!el) return;
    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduce) {
      setN(target);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const start = performance.now();
        const step = (now: number) => {
          const k = Math.min(1, (now - start) / duration);
          setN(Math.round((1 - Math.pow(1 - k, 3)) * target));
          if (k < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, duration]);

  return (
    <span ref={ref} className={className} style={style}>
      {target === null ? value : `${n}${suffix}`}
    </span>
  );
};

// goo-1 "WAVE" reveal values (codrops), shared with the brand footers.
const GOO_BLUR_START = 46;
const GOO_ALPHA_MUL = 14;
const GOO_ALPHA_OFF = -5;
// Hero wordmark goo-reveal duration (ms).
const GOO_REVEAL_MS = 1550;

// Recognition list for the "Proud not loud" section (placeholder content from Figma).
// `img` = the case visual shown in the cursor-follower preview on hover (placeholder).
export interface ConceptData {
  intro?: {
    eyebrow?: string | null;
    taglines?: string[] | null;
    paragraphLines?: string[] | null;
    explainer?: string | null;
  } | null;
  reel?: {
    hlsUrl?: string | null;
    loopVideoUrl?: string | null;
  } | null;
  cases?: {
    title?: string | null;
    items?: Array<{
      _key?: string;
      fgColor?: string | null;
      brioColors?: string[] | null;
      brioImage?: unknown;
      trail?: unknown[] | null;
      work?: {
        _id?: string;
        name?: string | null;
        client?: string | null;
        slug?: string | null;
        image?: unknown;
        lqip?: string | null;
        thumbVimeoId?: string | null;
        thumbVideoUrl?: string | null;
        serviceCategories?: Array<{
          _id?: string;
          name?: string | null;
          slug?: string | null;
          image?: unknown;
          brioPaletteId?: string | null;
        }> | null;
      } | null;
    }> | null;
  } | null;
  awards?: {
    eyebrow?: string | null;
    title?: string | null;
    description?: string | null;
    recognition?: string | null;
    items?: Array<{
      _key?: string;
      year?: string | null;
      organization?: string | null;
      title?: string | null;
      image?: unknown;
    }> | null;
  } | null;
}

// Image + bgVideo lookup keyed by work slug — used until Sanity image assets
// are uploaded for each case. Editors control bgColor / fgColor / work refs
// from Studio; this map is the only piece still living in code.
const CASE_ASSETS: Record<string, { img: string; bgVideo?: string; trail?: string[] }> = {
  tui: { img: "tui-image.jpg", trail: ["yellow-1.png", "yellow-2.png", "yellow-3.png"] },
  meetmarcel: {
    img: "meetmarcel.jpg",
    bgVideo: "meetmarcel-loop.mp4",
    trail: ["mm-1.jpg", "mm-2.jpg", "mm-3.jpg", "mm-4.jpg"],
  },
};

// Raw Sanity hero media reused from the /press/launch release (resolved to a
// renderable Media via toMedia below). Exported so app/page.tsx can type it.
export type ConceptPressHero = SanityMedia;

const ConceptV4 = ({
  data,
  pressHero,
}: {
  data?: ConceptData | null;
  pressHero?: ConceptPressHero | null;
} = {}) => {
  const transitionTo = usePageTransition();
  const router = useRouter();
  // The homepage opens on the dark hero, so claim a dark document canvas — keeps
  // a crossfade into the homepage from flashing the light default through the gap.
  useCanvasColor(BRIGADA_BLACK);
  // Sanity-driven content blocks — read once at render to keep the rest of the
  // component (which manages a lot of scroll choreography) untouched.
  const tagline = data?.intro?.taglines?.length ? data.intro.taglines : [];
  // Each entry in paragraphLines becomes its own whitespace-nowrap span,
  // so editors decide the line breaks explicitly. The auto-fit logic
  // (further down) scales the widest line to fill the viewport.
  const paragraphLines = (data?.intro?.paragraphLines ?? [])
    .map((line) => line?.trim() ?? "")
    .filter((line) => line.length > 0);
  const introExplainer = (data?.intro?.explainer ?? "").trim();
  // /press/launch hero video, same pipeline as that page (silent autoplay loop).
  // Null when there's no launch release/video, so the slot renders nothing.
  const pressHeroMedia = pressHero ? toMedia(pressHero, 3840) : null;
  const awardsItems = data?.awards?.items ?? [];
  const caseItems = data?.cases?.items ?? [];
  // ---- Intro: 0 = blurred + thick stroke · 1 = crisp full logo ----
  const t = useMotionValue(0);
  const [revealed, setRevealed] = useState(false);
  // Entrance van de hero-scène: bij het laden verschijnen This is us → reel →
  // agencies na elkaar. Getriggerd zodra de intro-preloader weg is (of meteen
  // bij interne navigatie).
  const [heroIn, setHeroIn] = useState(false);
  useEffect(() => onPreloaderReveal(() => setHeroIn(true)), []);
  // Huidige zin-index van de hero-cyclus — stuurt de achtergrond-wissel aan.
  const [phraseIdx, setPhraseIdx] = useState(0);
  // Live afstembare timings per zin (dwell, s) + globale fade-duur (s). Te tunen
  // via het dev-paneel (SHOW_TIMING_PANEL). Default: agencies snel, rest normaal.
  const [phraseTimings, setPhraseTimings] = useState<number[]>(() =>
    ALL_PHRASES.map((_, i) => (i >= 1 && i <= AGENCIES.length ? 0.7 : 1.6)),
  );
  const [fadeDur, setFadeDur] = useState(0.3);
  // Pauze + replay van de hero-cyclus (via het tuningpaneel).
  const [paused, setPaused] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  // Hover-intent voor het nav-submenu: een korte sluit-vertraging zodat de muis
  // tussen het label en zijn submenu (of net links/rechts van het label) bewegen
  // het menu niet dichtklapt. Opnieuw een nav-item binnenkomen annuleert het.
  const navCloseTimer = useRef<number | null>(null);
  const openMenu = (i: number) => {
    if (navCloseTimer.current !== null) {
      window.clearTimeout(navCloseTimer.current);
      navCloseTimer.current = null;
    }
    setOpenIdx(i);
  };
  const scheduleMenuClose = () => {
    if (navCloseTimer.current !== null) window.clearTimeout(navCloseTimer.current);
    navCloseTimer.current = window.setTimeout(() => {
      setOpenIdx(null);
      navCloseTimer.current = null;
    }, 180);
  };

  // Mobile menu (below md). The hover-dropdown nav collapses into a hamburger
  // that opens a full-screen overlay. Routing mirrors the inline nav below.
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);
  const NAV_TARGETS: Record<string, string> = {
    Services: "/services",
    Work: "/work",
    About: "/about",
    Careers: "/careers",
    Contact: "/contact",
    Brand: "/brand",
    Product: "/product",
    People: "/people",
  };
  const navTo = (label: string) => {
    const to = NAV_TARGETS[label];
    if (to) transitionTo(to);
    setMobileOpen(false);
  };
  // Warm the route on hover so the click commits near-instantly.
  const navPrefetch = (label: string) => {
    const to = NAV_TARGETS[label];
    if (to) router.prefetch(to);
  };
  // Dev-only live tuning (see the on-page panel below).
  const [baseStart, setBaseStart] = useState(42);
  const [baseEnd, setBaseEnd] = useState(61);
  // Hero scroll length in vh — shorter = the whole sequence (and the cut) is faster.
  const [heroVh, setHeroVh] = useState(100);
  // Cut position as a fraction of scroll progress (independent of hero length).
  // The whole choreography completes by this point, so it stays coherent.
  const [cutAt, setCutAt] = useState(0.24);
  // How far the video section is pulled up under the hero (vh) — higher = revealed sooner.
  // Capped so the video stays below the fold at scroll 0 (heroVh − videoPull ≥ ~100vh).
  const [videoPull, setVideoPull] = useState(46);
  // Dev-only multiplier on the auto-fitted paragraph size (1 = exactly fills width).
  const [paraScale, setParaScale] = useState(0.58);
  // Dev-only vertical nudge of the paragraph (px) — negative pulls it up, closer
  // to SHARP BEATS LOUD.
  const [paraOffsetY, setParaOffsetY] = useState(-94);
  // Gap between the SHARP / BEATS / LOUD words (px) — the block stays centred.
  const [taglineGap, setTaglineGap] = useState(40);

  // Reel section (above the footer) — its videos only start playing once the
  // section scrolls into view, and pause again when it leaves.
  const reelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const section = reelRef.current;
    if (!section) return;
    const videos = Array.from(section.querySelectorAll("video"));
    const io = new IntersectionObserver(
      ([entry]) => {
        videos.forEach((v) => {
          if (entry.isIntersecting) {
            v.play().catch(() => {});
          } else {
            v.pause();
          }
        });
      },
      { threshold: 0.25 }
    );
    io.observe(section);
    return () => io.disconnect();
  }, []);

  const strokePx = useTransform(t, [0, 1], [18, 0], { clamp: true });
  const introScale = useTransform(t, [0, 1], [1.06, 1]);
  const bgOpacity = useTransform(t, [0.55, 0.85], [0, 1], { clamp: true });
  const bgScale = useTransform(t, [0.3, 1], [1.08, 1], { clamp: true });

  // Logo entrance: drive `t` from 0 → 1 over GOO_REVEAL_MS. We use a manual rAF loop
  // because the imperative `animate(motionValue, ...)` was not progressing
  // under Next 16 + React 19 strict mode in this codebase — the value stayed
  // pinned at 0 and the change-listeners never fired. rAF is simpler and the
  // ease approximation (cubic-out) is visually indistinguishable from the
  // original cubic-bezier(0.16, 1, 0.3, 1).
  useEffect(() => {
    setRevealed(false);
    t.set(0);
    let raf = 0;
    const start = performance.now();
    const step = (ts: number) => {
      const k = Math.min(1, (ts - start) / GOO_REVEAL_MS);
      t.set(1 - Math.pow(1 - k, 3));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [t]);

  // Reveal the rest as soon as the logo is essentially sharp.
  useEffect(() => {
    const unsub = t.on("change", (v) => {
      if (v >= 0.78) setRevealed(true);
    });
    return unsub;
  }, [t]);

  // Hero logo entrance = codrops "WAVE" goo reveal instead of a plain blur: drive
  // the goo feGaussianBlur from the pre-roll t (GOO_BLUR_START → 0 as t 0 → 1).
  useEffect(() => {
    const feBlur = document.querySelector<SVGFEGaussianBlurElement>("#hero-goo feGaussianBlur");
    if (!feBlur) return;
    const apply = (v: number) => {
      const k = Math.min(1, Math.max(0, v));
      feBlur.setAttribute("stdDeviation", String(GOO_BLUR_START * (1 - k)));
    };
    apply(t.get());
    return t.on("change", apply);
  }, [t]);

  // ---- Scroll choreography across the pinned section ----
  // Own scroll-progress motion value (window scroll / max). framer-motion's
  // useScroll was unreliable here (lazy route + sticky), so drive it manually.
  const p = useMotionValue(0);
  const heroRef = useRef<HTMLElement>(null);
  const collectionRef = useRef<HTMLDivElement>(null);

  // Touch devices have no cursor, so the "Watch case" pill and image-preview
  // followers below never show — skip their pointer tracking and rendering.
  const isCoarse = useCoarsePointer();

  // Mobile (<768px) gets a different hero arrangement. Driven from JS + inline
  // styles (not new Tailwind classes) so tweaks come through HMR without a
  // dev-server restart. Starts false on SSR, resolves after mount.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767.98px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  // Custom cursor: a "Watch case" pill that trails the real cursor (with delay)
  // while hovering a case visual. The native cursor stays visible.
  // (Shared cursorX/Y also drives the award image-preview follower below.)
  const [hoverCase, setHoverCase] = useState(false);
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const pillX = useSpring(cursorX, { stiffness: 180, damping: 17, mass: 0.7 });
  const pillY = useSpring(cursorY, { stiffness: 180, damping: 17, mass: 0.7 });
  useEffect(() => {
    if (isCoarse) return;
    const move = (e: PointerEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [cursorX, cursorY, isCoarse]);

  // Image-preview cursor-follower for the awards list ("Proud not loud").
  // Hovering an award shows that case's visual, trailing the cursor.
  const [hoverAward, setHoverAward] = useState<number | null>(null);
  // Same mechanic for the clients list ("Working with the best"); shares the
  // preview springs below (only one list is hovered at a time).
  const previewX = useSpring(cursorX, { stiffness: 220, damping: 28, mass: 0.6 });
  const previewY = useSpring(cursorY, { stiffness: 220, damping: 28, mass: 0.6 });
  useEffect(() => {
    const setProgress = () => {
      // Progress within the HERO section only — independent of sections below it.
      const el = heroRef.current;
      const range = el ? el.offsetHeight - window.innerHeight : window.innerHeight * 2;
      p.set(range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0);
    };
    setProgress();
    window.addEventListener("resize", setProgress);

    // Respect reduced-motion: skip Lenis, fall back to native scroll.
    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduce) {
      window.addEventListener("scroll", setProgress, { passive: true });
      return () => {
        window.removeEventListener("scroll", setProgress);
        window.removeEventListener("resize", setProgress);
      };
    }

    // Lenis smooths the actual scroll position; progress follows it each frame.
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", setProgress);
    // Keep GSAP ScrollTrigger (stacking cards) in sync with Lenis' smoothing.
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
      window.removeEventListener("resize", setProgress);
    };
  }, [p]);

  // Recompute scroll progress when the hero length / video pull changes (dev sliders).
  useEffect(() => {
    window.dispatchEvent(new Event("resize"));
  }, [heroVh, videoPull]);

  // ---- Stacking case cards (Osmo "Stacking Cards Parallax") ----
  // As each card scrolls in, the PREVIOUS card parallaxes down (yPercent 0→50)
  // and its image rotates/lifts, so the incoming card slides over it.
  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>("[data-stacking-cards-item]");
      if (cards.length < 2) return;
      cards.forEach((card, i) => {
        if (i === 0) return;
        const previousCard = cards[i - 1];
        if (!previousCard) return;
        const previousCardImage = previousCard.querySelector(
          "[data-stacking-cards-img]"
        );
        const tl = gsap.timeline({
          defaults: { ease: "none", duration: 1 },
          scrollTrigger: {
            trigger: card,
            start: "top bottom",
            end: "top top",
            scrub: true,
            invalidateOnRefresh: true,
          },
        });
        tl.fromTo(previousCard, { yPercent: 0 }, { yPercent: 50 }).fromTo(
          previousCardImage,
          { yPercent: 0 },
          { yPercent: -25 },
          "<"
        );
      });
      ScrollTrigger.refresh();
    }, collectionRef);
    return () => ctx.revert();
  }, []);

  // ---- Rotating image trail (Osmo) — per case media block ----
  // TIJDELIJK UIT: teruggezet naar de "Watch case" pill-cursor. Om de trail
  // weer aan te zetten: dit useEffect uncommenten, de pill-cursor + zijn state
  // (hoverCase/pillX/pillY + de onPointerEnter/Leave op het mediablok)
  // verwijderen, en in het mediablok de data-trail-area / data-trail-collection
  // markup + de .rotating-image-trail CSS uncommenten. Per-case beelden staan
  // klaar in CASES[].trail (TUI = yellow-1..3, Meet Marcel = mm-1..4).
  // On mouse-move inside a [data-trail-area], clone the next source image and
  // spawn it at the cursor: hidden → visible → transition-out → removed. The
  // distance gate keeps clones spaced ~half a card apart. Faithful to Osmo's
  // mechanic; adapted to run per-area in React.
  /*
  useEffect(() => {
    const areas = Array.from(
      document.querySelectorAll<HTMLElement>("[data-trail-area]")
    );
    const cleanups: Array<() => void> = [];

    areas.forEach((area) => {
      const collection = area.querySelector("[data-trail-collection]");
      if (!collection) return;
      const items = collection.querySelectorAll<HTMLElement>("[data-trail-item]");
      if (!items.length) return;

      let index = 0;
      let lastX: number | null = null;
      let lastY: number | null = null;
      const cardWidth = items[0].getBoundingClientRect().width;
      const stepDistance = cardWidth * 0.5;
      const timeouts = new Set<number>();
      const clones = new Set<HTMLElement>();

      const spawn = (x: number, y: number) => {
        const clone = items[index].cloneNode(true) as HTMLElement;
        clone.style.left = `${x}px`;
        clone.style.top = `${y}px`;
        clone.setAttribute("data-trail-item", "hidden");
        area.appendChild(clone);
        clones.add(clone);
        void clone.getBoundingClientRect();
        clone.setAttribute("data-trail-item", "visible");

        const t1 = window.setTimeout(() => {
          clone.setAttribute("data-trail-item", "transition-out");
        }, 400);
        const t2 = window.setTimeout(() => {
          clone.remove();
          clones.delete(clone);
          timeouts.delete(t1);
          timeouts.delete(t2);
        }, 1200);
        timeouts.add(t1);
        timeouts.add(t2);

        index = (index + 1) % items.length;
        lastX = x;
        lastY = y;
      };

      const onMove = (event: MouseEvent) => {
        const rect = area.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
          lastX = null;
          lastY = null;
          return;
        }
        if (lastX === null || lastY === null) {
          spawn(x, y);
          return;
        }
        const dx = x - lastX;
        const dy = y - lastY;
        if (Math.sqrt(dx * dx + dy * dy) >= stepDistance) spawn(x, y);
      };

      area.addEventListener("mousemove", onMove);
      cleanups.push(() => {
        area.removeEventListener("mousemove", onMove);
        timeouts.forEach((t) => clearTimeout(t));
        clones.forEach((c) => c.remove());
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);
  */

  // Logo + baseline + paragraph move up together as one group (uniform 44vh).
  // Runs to p=1 (the exact pin-release point) so the group never freezes before
  // the sticky lets go — the text keeps scrolling instead of pausing at the end.
  const groupY = useTransform(p, [0, 1], ["0vh", "-64vh"]);
  // Logo fades as it scrolls off the top.
  const logoOpacity = useTransform(p, [0.56, 0.78], [1, 0]);
  // Extra lead so the logo scrolls up a bit faster than the rest of the group.
  const logoLead = useTransform(p, [0, 1], ["0vh", "-26vh"]);
  // Per-line clip-up reveal, staggered. Editors set the paragraph line breaks
  // in Sanity, so the count isn't fixed — derive a transform per line instead
  // of hard-wiring two. Fixed 0.18 stagger / 0.28 span keeps the original
  // 2-line cadence (0.22→0.5, 0.4→0.68) and still completes within p≤1 for up
  // to four lines. Hooks must run unconditionally, so we always create the
  // pool and slice to the actual line count below.
  const lineReveal = (i: number): [number, number] => {
    const start = 0.22 + i * 0.15;
    return [start, Math.min(1, start + 0.2)];
  };
  const line0Y = useTransform(p, lineReveal(0), ["115%", "0%"]);
  const line1Y = useTransform(p, lineReveal(1), ["115%", "0%"]);
  const line2Y = useTransform(p, lineReveal(2), ["115%", "0%"]);
  const line3Y = useTransform(p, lineReveal(3), ["115%", "0%"]);
  const lineYs = [line0Y, line1Y, line2Y, line3Y].slice(
    0,
    Math.max(1, paragraphLines.length),
  );

  // Baseline (SHARP/BEATS/LOUD) grows from baseStart→baseEnd as it scrolls up.
  const baselineSize = useMotionValue("36px");
  useEffect(() => {
    const update = (v: number) => {
      const tt = Math.min(1, Math.max(0, v / cutAt));
      const px = baseStart + (baseEnd - baseStart) * tt;
      // baseStart/baseEnd are tuned at a 1728px-wide screen (1vw = 17.28px).
      // Express the size as min(px, vw): at ≥1728px it's the exact px value, and
      // on narrower screens it scales DOWN with the viewport so the three words
      // shrink together instead of running into each other.
      baselineSize.set(`min(${px}px, ${px / 17.28}vw)`);
    };
    update(p.get());
    return p.on("change", update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseStart, baseEnd, cutAt]);

  // Tagline block width: starts full (gutter-to-gutter, so SHARP/LOUD align to
  // the logo edges via justify-between) and converges by the cut to exactly
  // `taglineGap` px between the three words, staying centred. justify-between
  // distributes (width − words) over the two gaps, so width = words + 2·gap
  // lands each gap on taglineGap.
  const taglineRowRef = useRef<HTMLDivElement>(null);
  const taglineWidth = useMotionValue("100%");
  useEffect(() => {
    const update = (v: number) => {
      const row = taglineRowRef.current;
      const wrap = row?.parentElement;
      if (!row || !wrap) return;
      const tt = Math.min(1, Math.max(0, v / cutAt));
      const cs = getComputedStyle(wrap);
      const full =
        wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const words = Array.from(row.children).reduce(
        (sum, el) => sum + (el as HTMLElement).offsetWidth,
        0
      );
      const end = Math.min(words + 2 * taglineGap, full);
      taglineWidth.set(`${full + (end - full) * tt}px`);
    };
    update(p.get());
    const onResize = () => update(p.get());
    window.addEventListener("resize", onResize);
    const unsub = p.on("change", update);
    return () => {
      window.removeEventListener("resize", onResize);
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cutAt, taglineGap, baseStart, baseEnd]);

  // Paragraph: all lines share ONE font size, fitted so the longest line
  // exactly fills the width. Shorter lines stay centred and don't fill the
  // gutter — this keeps the block visually even, instead of blowing a short
  // tail line ("Being sharper does.") up larger than its neighbours.
  const paraRef = useRef<HTMLDivElement>(null);
  const [paraSizes, setParaSizes] = useState<number[]>(() =>
    paragraphLines.map(() => 90),
  );
  useLayoutEffect(() => {
    const fit = () => {
      const root = paraRef.current;
      if (!root) return;
      const spans = root.querySelectorAll<HTMLElement>("[data-line]");
      if (!spans.length) return;
      const wrap = spans[0].parentElement as HTMLElement;
      const avail = wrap.clientWidth;
      if (avail <= 0) return;
      // Per-line natural width at the currently-rendered font size lets us
      // compute how much we'd have to scale each line individually to fill
      // the viewport.
      const raw: number[] = [];
      spans.forEach((s) => {
        const current = parseFloat(getComputedStyle(s).fontSize);
        const range = document.createRange();
        range.selectNodeContents(s);
        const natural = range.getBoundingClientRect().width;
        raw.push(natural > 0 ? (current * avail) / natural : current);
      });
      // One shared size = the smallest per-line fit (the longest line). Larger
      // sizes would overflow that line; this fills it exactly and applies the
      // same size to every line so the block reads as one even paragraph.
      const minSize = Math.min(...raw);
      const next = raw.map(() => minSize);
      setParaSizes(next);
    };
    fit();
    if (document.fonts?.ready) document.fonts.ready.then(fit);
    const ro = new ResizeObserver(fit);
    if (paraRef.current) ro.observe(paraRef.current);
    return () => ro.disconnect();
    // Re-fit whenever the line content changes — ResizeObserver only fires on
    // box-size changes, so if Sanity data arrives without resizing the wrapper
    // (same number of lines, different text) the previous fit can be stale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paragraphLines.join("|")]);
  // Hard cut: only once the group has fully scrolled up (text fully in view),
  // image → white background and text → black, simultaneously.
  const whiteOpacity = useTransform(p, [cutAt, cutAt + 0.025], [0, 1]);
  const textColor = useTransform(p, [cutAt, cutAt + 0.025], ["#ffffff", BRIGADA_BLACK]);

  // ---- v4 hero ----
  // Eén scherm: de rode video als achtergrond + één gecentreerde, auto-cyclende
  // zin per "scherm" (CyclingPhrases, timer-gedreven). Geen scroll-scènes meer.

  // Nav uses white + mix-blend-difference so it stays legible over every section
  // (replacing the old scroll-driven textColor switch); dropped while the
  // full-screen mobile menu is open so the labels stay crisp white on black.
  const navBlend = !mobileOpen;

  return (
    <main className="relative bg-brigada-black">
      <style>{`
        html.lenis, html.lenis body { height: auto; }
        .lenis.lenis-smooth { scroll-behavior: auto !important; }
        .lenis.lenis-smooth [data-lenis-prevent] { overscroll-behavior: contain; }
        .lenis.lenis-stopped { overflow: hidden; }
        .concept-logo path {
          stroke: #ffffff;
          stroke-width: var(--logo-stroke, 0);
          vector-effect: non-scaling-stroke;
          stroke-linejoin: round;
        }
        .progressive-blur {
          z-index: 40;
          pointer-events: none;
          isolation: isolate;
          contain: paint;
          width: 100%;
          height: 20em;
          transform-style: preserve-3d;
          position: absolute;
          top: 0;
          left: 0;
          overflow: hidden;
          transform: translateZ(0);
          transition: height 0.4s cubic-bezier(0.625, 0.05, 0, 1);
        }
        /* When the nav submenu is open, push the blur deeper so the
           horizontal sub-row sits inside the blurred area.
           Tune live in DevTools via the --blur-depth custom property. */
        .progressive-blur.is--open { height: var(--blur-depth, 48em); }
        .progressive-blur__layer { width: 100%; height: 100%; position: absolute; }
        .progressive-blur__layer.is--1 {
          -webkit-backdrop-filter: blur(.09375em); backdrop-filter: blur(.09375em);
          -webkit-mask: linear-gradient(to top, #0000 50%, #000 62.5% 75%, #0000 87.5%);
          mask: linear-gradient(to top, #0000 50%, #000 62.5% 75%, #0000 87.5%);
        }
        .progressive-blur__layer.is--2 {
          -webkit-backdrop-filter: blur(.1875em); backdrop-filter: blur(.1875em);
          -webkit-mask: linear-gradient(to top, #0000 62.5%, #000 75% 87.5%, #0000 100%);
          mask: linear-gradient(to top, #0000 62.5%, #000 75% 87.5%, #0000 100%);
        }
        .progressive-blur__layer.is--3 {
          -webkit-backdrop-filter: blur(.375em); backdrop-filter: blur(.375em);
          -webkit-mask: linear-gradient(to top, #0000 75%, #000 87.5% 100%);
          mask: linear-gradient(to top, #0000 75%, #000 87.5% 100%);
        }
        .progressive-blur__layer.is--4 {
          -webkit-backdrop-filter: blur(.75em); backdrop-filter: blur(.75em);
          -webkit-mask: linear-gradient(to top, #0000 82%, #000 92% 100%);
          mask: linear-gradient(to top, #0000 82%, #000 92% 100%);
        }
        .progressive-blur__layer.is--5 {
          -webkit-backdrop-filter: blur(1.5em); backdrop-filter: blur(1.5em);
          -webkit-mask: linear-gradient(to top, #0000 88%, #000 100%);
          mask: linear-gradient(to top, #0000 88%, #000 100%);
        }
        [data-underline-link] { position: relative; text-decoration: none; }
        [data-underline-link]::before {
          content: ""; position: absolute; bottom: -0.0625em; left: 0;
          width: 100%; height: 0.08em; background-color: currentColor;
          transform: scaleX(0) rotate(0.001deg); transform-origin: right;
          transition: transform 0.6s cubic-bezier(0.625, 0.05, 0, 1);
        }
        @media (hover: hover) and (pointer: fine) {
          [data-underline-link]:hover::before {
            transform-origin: left; transform: scaleX(1) rotate(0.001deg);
          }
        }
        /* Osmo "Rotating Image Trail" — TIJDELIJK UIT (terug naar pill-cursor).
           Uncommenten samen met het trail-useEffect en de data-trail markup.
        .rotating-image-trail__collection {
          position: absolute; top: 0; left: 0;
          display: flex; flex-flow: wrap; gap: 1em;
          opacity: 0; pointer-events: none;
        }
        .rotating-image-trail__item {
          z-index: 10; pointer-events: none;
          -webkit-user-select: none; user-select: none;
        }
        .rotating-image-trail__card {
          aspect-ratio: 3 / 4; width: 10vw; position: relative;
        }
        .rotating-image-trail__card-img {
          object-fit: cover; width: 100%; height: 100%;
          display: block; position: absolute; top: 0; left: 0;
        }
        [data-trail-item="hidden"] {
          transform: translate(-50%, -50%) scale(0) rotate(0.001deg);
          position: absolute;
        }
        [data-trail-item="visible"] {
          transform: translate(-50%, -50%) scale(1) rotate(0.001deg);
          transition: transform 0.4s cubic-bezier(0.625, 0.05, 0, 1);
          position: absolute;
        }
        [data-trail-item="transition-out"] {
          transform: translate(-50%, -50%) scale(0) rotate(0.001deg);
          transition: transform 0.8s cubic-bezier(0.625, 0, 0.875, 0);
          position: absolute;
        }
        */
      `}</style>

      {/* Navigation — fixed so it persists across sections (doesn't scroll away).
          Blur and nav are SEPARATE fixed layers: a transformed/fixed wrapper
          around the nav would create a stacking context that stops the nav's
          mix-blend-difference from reaching the page behind it. */}
      <motion.div
        className="fixed inset-x-0 top-0 z-40 pointer-events-none"
        aria-hidden
        initial={{ y: "-100%" }}
        animate={revealed ? { y: "0%" } : { y: "-100%" }}
        transition={{ duration: 0.6, ease: EASE_OUT, delay: revealed ? 0.45 : 0 }}
      >
        <div className={`progressive-blur${openIdx !== null && NAV_ITEMS[openIdx].items.length > 0 ? " is--open" : ""}`}>
          <div className="progressive-blur__layer is--1" />
          <div className="progressive-blur__layer is--2" />
          <div className="progressive-blur__layer is--3" />
          <div className="progressive-blur__layer is--4" />
          <div className="progressive-blur__layer is--5" />
        </div>
      </motion.div>

      {/* Nav — IS the fixed, blended element. White + mix-blend-difference keeps
          it legible over any section; the entrance slides via `top` (not
          transform) so the blended element itself carries no isolating
          transform. Blend drops while the mobile menu is open. */}
      <motion.nav
          style={navBlend ? { mixBlendMode: "difference" } : { color: textColor }}
          className={`fixed inset-x-0 z-50 flex h-[72px] items-stretch justify-between px-[clamp(24px,5vw,72px)] ${navBlend ? "text-white" : ""}`}
          initial={{ top: "-72px" }}
          animate={revealed ? { top: "0px" } : { top: "-72px" }}
          transition={{ duration: 0.6, ease: EASE_OUT, delay: revealed ? 0.45 : 0 }}
        >
          {/* Desktop nav — collapses into the hamburger below md.
              `md:contents` keeps the children spreading via justify-between. */}
          <div className="hidden md:contents">
          {NAV_ITEMS.map((item, i) => {
            const alignRight = i >= NAV_ITEMS.length - 2;
            return (
              <div
                key={item.label}
                className="relative flex items-center px-5 -mx-5"
                onMouseEnter={() => {
                  openMenu(i);
                  navPrefetch(item.label);
                }}
                onMouseLeave={scheduleMenuClose}
              >
                <span
                  className="cursor-pointer text-[14px] uppercase tracking-[0.1em] opacity-90 transition-opacity hover:opacity-100"
                  style={{ fontFamily: SANS }}
                  onClick={() => {
                    if (item.label === "Careers") transitionTo("/careers");
                    else if (item.label === "About") transitionTo("/about");
                    else if (item.label === "Services") transitionTo("/services");
                    else if (item.label === "Work") transitionTo("/work");
                    else if (item.label === "Contact") transitionTo("/contact");
                  }}
                >
                  {item.label}
                </span>
                <AnimatePresence>
                  {openIdx === i && item.items.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.28, ease: EASE_OUT }}
                      className={`absolute top-full pt-2 ${
                        alignRight ? "right-5" : "left-5"
                      }`}
                    >
                      <ul className="flex flex-row items-center gap-[clamp(32px,4vw,80px)] whitespace-nowrap">
                        {item.items.map((sub) => (
                          <li key={sub}>
                            <button
                              type="button"
                              onClick={() => {
                                if (sub === "Brand") transitionTo("/brand");
                                else if (sub === "Product") transitionTo("/product");
                                else if (sub === "People") transitionTo("/people");
                              }}
                              onMouseEnter={() => navPrefetch(sub)}
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
          })}
          </div>

          {/* Hamburger — only below md. */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Menu sluiten" : "Menu openen"}
            aria-expanded={mobileOpen}
            className="relative z-50 -mr-2 ml-auto flex h-11 w-11 items-center justify-center self-center md:hidden"
            style={mobileOpen ? { color: "#fff" } : undefined}
          >
            <span className="relative block h-[14px] w-6">
              <span
                className="absolute left-0 block h-[1.5px] w-full bg-current transition-all duration-300"
                style={{
                  top: mobileOpen ? "6px" : "0px",
                  transform: mobileOpen ? "rotate(45deg)" : "none",
                }}
              />
              <span
                className="absolute left-0 bottom-0 block h-[1.5px] w-full bg-current transition-all duration-300"
                style={{
                  bottom: mobileOpen ? "6px" : "0px",
                  transform: mobileOpen ? "rotate(-45deg)" : "none",
                }}
              />
            </span>
          </button>
        </motion.nav>

      {/* Full-screen mobile menu overlay — sibling of the nav so `fixed`
          resolves against the viewport. */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="fixed inset-0 z-40 flex flex-col bg-brigada-black px-[clamp(24px,5vw,72px)] pt-[88px] pb-12 text-white md:hidden"
            style={{ fontFamily: SANS }}
          >
            <ul className="mt-6 flex flex-1 flex-col gap-7 overflow-y-auto">
              {NAV_ITEMS.map((item, i) => (
                <motion.li
                  key={item.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.08 + i * 0.05 }}
                >
                  <button
                    type="button"
                    onClick={() => navTo(item.label)}
                    className="text-[28px] uppercase leading-none tracking-[0.02em]"
                  >
                    {item.label}
                  </button>
                  {item.items.length > 0 && (
                    <ul className="mt-4 flex flex-col gap-3 pl-1">
                      {item.items.map((sub) => (
                        <li key={sub}>
                          <button
                            type="button"
                            onClick={() => navTo(sub)}
                            className="text-[15px] uppercase tracking-[0.1em] text-white/60 transition-colors hover:text-white"
                          >
                            {sub}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dev-only type tuning panel — hidden (set SHOW_TUNING_PANEL = true to restore) */}
      {SHOW_TUNING_PANEL && (process.env.NODE_ENV !== "production") && (
        <div
          className="fixed bottom-4 left-4 z-[60] w-[230px] select-none rounded-lg border border-white/15 bg-brigada-black/80 p-3 text-[11px] leading-tight text-white shadow-xl backdrop-blur-md"
          style={{ fontFamily: "ui-monospace, monospace" }}
        >
          <div className="mb-2 uppercase tracking-[0.15em] text-white/40">Tuning · dev</div>
          <label className="mb-2 block">
            Hero length — {heroVh}vh <span className="text-white/40">(↓ = faster cut)</span>
            <input
              type="range"
              min={103}
              max={300}
              value={heroVh}
              onChange={(e) => setHeroVh(+e.target.value)}
              className="mt-1 w-full accent-white"
            />
          </label>
          <label className="mb-2 block">
            Cut at — {Math.round(cutAt * 100)}% of scroll
            <input
              type="range"
              min={5}
              max={95}
              value={Math.round(cutAt * 100)}
              onChange={(e) => setCutAt(+e.target.value / 100)}
              className="mt-1 w-full accent-white"
            />
          </label>
          <label className="mb-2 block">
            Video pull-up — {videoPull}vh <span className="text-white/40">(↑ = sooner)</span>
            <input
              type="range"
              min={0}
              max={100}
              value={videoPull}
              onChange={(e) => setVideoPull(+e.target.value)}
              className="mt-1 w-full accent-white"
            />
          </label>
          <label className="mb-2 block">
            Baseline start — {baseStart}px
            <input
              type="range"
              min={16}
              max={80}
              value={baseStart}
              onChange={(e) => setBaseStart(+e.target.value)}
              className="mt-1 w-full accent-white"
            />
          </label>
          <label className="mb-2 block">
            Baseline end — {baseEnd}px <span className="text-white/40">(Sharp Beats Loud)</span>
            <input
              type="range"
              min={24}
              max={140}
              value={baseEnd}
              onChange={(e) => setBaseEnd(+e.target.value)}
              className="mt-1 w-full accent-white"
            />
          </label>
          <label className="mb-2 block">
            Paragraph — {Math.round((paraSizes[0] ?? 0) * paraScale)}px (largest line){" "}
            <span className="text-white/40">({Math.round(paraScale * 100)}% of fit · "We cut through…")</span>
            <input
              type="range"
              min={50}
              max={150}
              value={Math.round(paraScale * 100)}
              onChange={(e) => setParaScale(+e.target.value / 100)}
              className="mt-1 w-full accent-white"
            />
          </label>
          <label className="mb-2 block">
            Paragraph offset — {paraOffsetY}px <span className="text-white/40">(↑ closer to SBL)</span>
            <input
              type="range"
              min={-200}
              max={100}
              value={paraOffsetY}
              onChange={(e) => setParaOffsetY(+e.target.value)}
              className="mt-1 w-full accent-white"
            />
          </label>
          <label className="block">
            Tagline gap — {taglineGap}px <span className="text-white/40">(between SHARP · BEATS · LOUD)</span>
            <input
              type="range"
              min={0}
              max={160}
              value={taglineGap}
              onChange={(e) => setTaglineGap(+e.target.value)}
              className="mt-1 w-full accent-white"
            />
          </label>
        </div>
      )}

      {/* Cursor-follower effects — only on devices with a real pointer. */}
      {!isCoarse && (
      <>
      {/* Custom cursor — delayed "Watch case" pill trailing the real cursor */}
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[100]"
        style={{ x: pillX, y: pillY }}
        aria-hidden
      >
        <div className="translate-x-4 translate-y-4">
          <AnimatePresence>
            {hoverCase && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className="whitespace-nowrap rounded-full border border-white/15 bg-brigada-black/50 px-4 py-2 text-[13px] uppercase tracking-[0.12em] text-white backdrop-blur-md"
                style={{ fontFamily: SANS }}
              >
                Check it out
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Image-preview cursor-follower — shows the hovered award's case visual */}
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[90]"
        style={{ x: previewX, y: previewY }}
        aria-hidden
      >
        <div className="relative aspect-[1/1.25] w-[clamp(180px,18vw,280px)] translate-x-6 -translate-y-1/2">
          <AnimatePresence>
            {hoverAward !== null && (
              <motion.div
                key={hoverAward}
                initial={{ opacity: 0, scale: 0.92, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -24 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
                className="absolute inset-0 overflow-hidden"
              >
                <img
                  src={`/${(awardsItems[hoverAward] as { img?: string } | undefined)?.img ?? "tui-image.jpg"}`}
                  className="h-full w-full object-cover"
                  alt=""
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      </>
      )}

      {/* Scroll track — pinned "This is us" hero (v3). De rode brio blijft sticky;
          alleen de scènes ervoor veranderen tijdens het scrollen. */}
      <section ref={heroRef} className="relative z-10" style={{ height: `${heroVh}vh` }}>
        <div className="sticky top-0 h-screen select-none overflow-hidden bg-brigada-black">
          {/* Sticky achtergrond — drie brio's die crossfaden: eerste gedeelte de
              rode brio "Red & Pink" (brio-06); vanaf "We build…" de /careers-hero
              brio "Green & Blue" (brio-03); vanaf "As one we will be sharper" de
              /work-footer brio "Pink & Yellow" (brio-01). Elke laag dekt de vorige af. */}
          <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
            <div className="absolute inset-0">
              <BrioEffect
                src={`/concept-hero.jpg`}
                mode="palette"
                paletteId="brio-06"
                className="h-full w-full"
              />
            </div>
            <motion.div
              className="absolute inset-0"
              initial={false}
              animate={{ opacity: phraseIdx >= WE_BUILD_INDEX ? 1 : 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >
              <BrioEffect
                src={`/concept-hero.jpg`}
                mode="palette"
                paletteId="brio-03"
                className="h-full w-full"
              />
            </motion.div>
            <motion.div
              className="absolute inset-0"
              initial={false}
              animate={{ opacity: phraseIdx >= AS_ONE_INDEX ? 1 : 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >
              <BrioEffect
                src={`/concept-hero.jpg`}
                mode="palette"
                paletteId="brio-01"
                className="h-full w-full"
              />
            </motion.div>
          </div>

          {/* Eén gecentreerde, auto-cyclende zin per "scherm" (CyclingPhrases,
              timer-gedreven). De rode video blijft de achtergrond. */}
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-[clamp(24px,5vw,72px)] text-center text-brigada-black">
            <motion.div
              className="text-[clamp(40px,5.5vw,104px)] font-medium leading-[1.05] tracking-[-0.02em]"
              initial={{ opacity: 0, y: 20 }}
              animate={heroIn ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, ease: EASE_OUT }}
            >
              <CyclingPhrases
                phrases={ALL_PHRASES}
                fade={fadeDur}
                // Per-zin dwell uit de (afstembare) timings-state.
                intervals={phraseTimings}
                paused={paused}
                restartKey={restartKey}
                onIndexChange={setPhraseIdx}
                className="mx-auto max-w-[15ch]"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Dev-tuningpaneel — dwell-tijd per zin (s) + globale fade. Verberg met
          SHOW_TIMING_PANEL = false. */}
      {SHOW_TIMING_PANEL && (
        <div className="fixed bottom-4 right-4 z-[200] max-h-[82vh] w-[300px] overflow-auto rounded-lg border border-white/15 bg-brigada-black/85 p-3 text-[11px] leading-tight text-white shadow-xl backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium uppercase tracking-[0.12em] text-white/70">
              Hero-timings (s)
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setPaused((v) => !v)}
                className="rounded border border-white/20 px-2 py-1 hover:bg-white/10"
              >
                {paused ? "▶ Play" : "⏸ Pause"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRestartKey((k) => k + 1);
                  setPaused(false);
                }}
                className="rounded border border-white/20 px-2 py-1 hover:bg-white/10"
              >
                ↺ Replay
              </button>
            </div>
          </div>
          <label className="mb-2.5 flex items-center gap-2">
            <span className="w-[88px] shrink-0 text-white/50">fade</span>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={fadeDur}
              onChange={(e) => setFadeDur(+e.target.value)}
              className="flex-1"
            />
            <span className="w-7 text-right tabular-nums">{fadeDur.toFixed(2)}</span>
          </label>
          {ALL_PHRASES.map((phrase, i) => {
            const label = phrase.replace(/\n/g, " ");
            return (
              <label key={`${label}-${i}`} className="mb-1.5 flex items-center gap-2">
                <span className="w-[88px] shrink-0 truncate text-white/50" title={label}>
                  {label}
                </span>
                <input
                  type="range"
                  min={0.2}
                  max={4}
                  step={0.1}
                  value={phraseTimings[i]}
                  onChange={(e) => {
                    const v = +e.target.value;
                    setPhraseTimings((t) => t.map((x, j) => (j === i ? v : x)));
                  }}
                  className="flex-1"
                />
                <span className="w-7 text-right tabular-nums">
                  {phraseTimings[i].toFixed(1)}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {/* Tagline explainer — short paragraph unpacking "Sharp beats loud". */}
      {SHOW_INTRO_EXPLAINER && introExplainer && (
        <section className="relative z-10 px-[clamp(24px,5vw,72px)] pt-[clamp(60px,8vw,120px)] pb-[clamp(40px,5vw,80px)] text-white">
          <p
            style={{ fontFamily: SANS }}
            className="mx-auto max-w-[42ch] text-center text-[clamp(16px,1.3vw,20px)] leading-[1.5] tracking-[-0.005em] opacity-80"
          >
            {introExplainer}
          </p>
        </section>
      )}

      {/* Cases — narrow meta label on the left, large landscape media on the
          right, over each case's background (Figma node 299-1977). Pulled up
          under the hero via videoPull so the reveal stays seamless.
          Verborgen achter SHOW_CASES. */}
      {SHOW_CASES && (
      <div
        ref={collectionRef}
        className="relative z-10 w-full"
        style={{ marginTop: `-${videoPull}vh` }}
      >
        {caseItems.map((c) => {
          const name = c.work?.name ?? "";
          const client = c.work?.client ?? "";
          const categories = (c.work?.serviceCategories ?? []).filter((e) => e?.name);
          const tags = categories
            .map((e) => e?.name)
            .filter(Boolean)
            .join(", ");
          const slug = c.work?.slug ?? "";
          const assets: { img?: string; bgVideo?: string } = CASE_ASSETS[slug] ?? {};
          // Prefer the Sanity-stored work.image; fall back to the local map
          // while editors haven't uploaded one yet. urlFor returns null when
          // the source is empty, so we keep the legacy path as a safety net.
          const sanityImg = c.work?.image
            ? urlFor(c.work.image)?.width(1342).height(813).fit("crop").auto("format").url()
            : null;
          const img = sanityImg ?? (assets.img ? `/${assets.img}` : "/placeholder.svg");
          // Optional silent looping video thumbnail; the image is its poster.
          const thumbVideo = c.work ? thumbVideoMedia(c.work, img) : null;
          const bgVideo = assets.bgVideo;
          // Sanity stega embeds invisible chars in every string when Draft
          // Mode is on; strip them before hex validation or the regex below
          // filters every colour out and the Brio backdrop silently
          // disappears. Covers the Tag-char range (U+E0000–U+E007F) used by
          // modern stega plus the older ZWJ/ZWNJ/BOM set.
          const stripStega = (s: string) =>
            s.replace(/[​-‍﻿]|[\u{E0000}-\u{E007F}]/gu, "");
          const brioStops = (c.brioColors ?? [])
            .map((s) => (typeof s === "string" ? stripStega(s) : ""))
            .filter((s) => /^#?[0-9a-f]{6}$/i.test(s));
          const fgColor = c.fgColor ? stripStega(c.fgColor) : "#181614";
          // Brio backdrop texture: a per-case override if set, else the case
          // still, else the site-wide default. We only mirror the shared
          // default so it doesn't read as a copy of the footer's brio.
          const brioOverride = c.brioImage
            ? urlFor(c.brioImage)?.width(1342).height(813).fit("crop").auto("format").url()
            : null;
          const brioSrc = brioOverride ?? sanityImg ?? "/concept-hero.jpg";
          const brioIsDefault = !brioOverride && !sanityImg;
          return (
          <section
            key={c._key ?? slug}
            data-stacking-cards-item
            className="relative -mt-4 flex min-h-screen w-full items-center overflow-hidden bg-white"
            role={slug ? "link" : undefined}
            tabIndex={slug ? 0 : undefined}
            onClick={slug ? () => transitionTo(`/work/${slug}`) : undefined}
            onKeyDown={
              slug
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      transitionTo(`/work/${slug}`);
                    }
                  }
                : undefined
            }
            style={{ cursor: slug ? "pointer" : undefined, color: fgColor }}
          >
            {/* Brio WebGL backdrop — colours from Sanity. Texture = the per-case
                brio image override if set, else the case still, else the
                site-wide default (same as the footer). The default keeps
                video-only cases (whose still can be very sober, or absent)
                from rendering an empty backdrop. */}
            {brioStops.length >= 2 && (
              <div
                className="pointer-events-none absolute inset-0 z-0"
                aria-hidden
                // Mirror only the shared default so it doesn't read as a carbon
                // copy of the footer's brio.
                style={brioIsDefault ? { transform: "scaleX(-1)" } : undefined}
              >
                <BrioEffect
                  src={brioSrc}
                  mode="custom"
                  colors={brioStops}
                  className="h-full w-full"
                />
              </div>
            )}

            {/* Full-width content row (same gutters as the paragraph above) */}
            <div className="relative z-10 flex w-full flex-col gap-8 px-[clamp(24px,5vw,72px)] py-[clamp(56px,12vh,140px)] md:flex-row md:items-center md:gap-[clamp(40px,10vw,221px)]">
              {/* Meta — client (large) + project title (small) */}
              <div className="flex shrink-0 flex-col gap-[clamp(16px,2vw,24px)] md:w-[171px]">
                <div className="flex flex-col gap-1">
                  <span
                    className="text-[clamp(20px,1.9vw,27px)] uppercase leading-none"
                    style={{ fontFamily: SANS, fontStretch: "125%", fontWeight: 500 }}
                  >
                    {client || name}
                  </span>
                  {client && name && (
                    <span
                      className="text-[clamp(12px,0.95vw,14px)] tracking-[-0.015em] opacity-70"
                      style={{ fontFamily: SANS }}
                    >
                      {name}
                    </span>
                  )}
                </div>
              </div>

              {/* Media — large landscape visual; "Watch case" pill on hover. */}
              <div
                className="relative w-full overflow-hidden md:flex-1"
                onPointerEnter={() => setHoverCase(true)}
                onPointerLeave={() => setHoverCase(false)}
              >
                {thumbVideo ? (
                  <div
                    data-stacking-cards-img
                    className="relative aspect-[1342/813] w-full overflow-hidden"
                  >
                    <MediaFill media={thumbVideo} />
                  </div>
                ) : (
                  <img
                    data-stacking-cards-img
                    className="block aspect-[1342/813] w-full object-cover"
                    src={img}
                    alt={`${name} — ${tags}`}
                  />
                )}
                {/* Trail source set — hidden originals the script clones from.
                <div data-trail-collection className="rotating-image-trail__collection" aria-hidden>
                  {(c.trail ?? [c.img]).map((src, ti) => (
                    <div data-trail-item="" key={ti} className="rotating-image-trail__item">
                      <div className="rotating-image-trail__card">
                        <img
                          src={`/${src}`}
                          loading="eager"
                          alt=""
                          className="rotating-image-trail__card-img"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                */}
              </div>
            </div>
          </section>
        );
        })}
      </div>
      )}

      {/* Clients — cycling logo wall in de Osmo-look: zwarte achtergrond, witte
          logo's, geen label. Gescoped via .logo-wall--osmo zodat de service-
          detailpagina's hun 3-koloms lichte versie houden. */}
      <section className={`${GUTTER} bg-brigada-black py-[clamp(80px,12vw,160px)]`}>
        <Reveal>
          <div className="logo-wall--osmo">
            <LogoWall logos={CLIENT_LOGOS} />
          </div>
        </Reveal>
      </section>

      {/* Recognition — "Proud not loud" intro + awards list (Figma node 299-1904) */}
      {SHOW_AWARDS && (
      <section className="relative z-10 w-full bg-white text-brigada-black">
        <div className="grid w-full grid-cols-1 gap-x-12 gap-y-12 px-[clamp(24px,5vw,72px)] py-[clamp(112px,20vh,280px)] md:grid-cols-2">
          {/* Left — intro (sticky; offset below the nav + its progressive blur) */}
          <div className="max-w-[420px] sticky self-start top-[150px]">
            <h2
              className="text-[clamp(18px,2vw,26px)] uppercase leading-[1.1] tracking-[-0.02em]"
              style={{ fontFamily: SANS, fontStretch: "125%", fontWeight: 500 }}
            >
              Proud not loud
            </h2>
            <p
              className="mt-4 text-[clamp(16px,1.4vw,20px)] leading-[1.7]"
              style={{ fontFamily: SANS }}
            >
              The talent at our agency has created some of the industry’s most
              awarded work, earning international recognition through:
            </p>
          </div>

          {/* Right — DRAFT aggregate-metrics list (count · award · note),
              pending final copy from the team. (Replaces the old Sanity
              awards.items demo list for now; that data was a different
              year/organisation/title format.) */}
          <motion.div
            className="flex flex-col"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "0px 0px -10% 0px" }}
            variants={AWARDS_LIST_VARIANTS}
          >
            {AWARDS_PLACEHOLDER.map((a) => (
              <motion.div
                key={a.label}
                variants={AWARDS_ROW_VARIANTS}
                className="flex items-center justify-between gap-[clamp(16px,2vw,32px)] border-b border-brigada-black/15 py-[22px] first:pt-0"
                style={{ fontFamily: SANS }}
              >
                <span className="flex flex-col gap-[2px]">
                  <span className="text-[clamp(18px,1.7vw,24px)] tracking-[-0.015em]">
                    {a.label}
                  </span>
                  {a.note && (
                    <span className="text-[14px] tracking-[-0.015em] text-brigada-black/60">
                      {a.note}
                    </span>
                  )}
                </span>
                <CountUp
                  value={a.count}
                  className="shrink-0 tabular-nums text-[clamp(18px,1.7vw,24px)] leading-none tracking-[-0.02em]"
                  style={{ fontWeight: 400 }}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      )}

      {/* Recognition — "Working with the best": tagline left, awards paragraph right.
          Single paragraph fades in once; copy comes from homePage.awards.recognition. */}
      {SHOW_WORKING_WITH_BEST && (
      <section className="relative z-10 w-full bg-white text-brigada-black">
        <div className="grid w-full grid-cols-1 gap-x-[clamp(48px,12vw,200px)] gap-y-12 px-[clamp(24px,5vw,72px)] py-[clamp(64px,12vh,160px)] md:grid-cols-2">
          {/* Left — intro (sticky; offset below the nav + its progressive blur) */}
          <h2
            className="font-display text-brigada-black sticky self-start top-[150px]"
            style={{ fontSize: "clamp(28px, 5vw, 50px)" }}
          >
            The best thing about our line of work? It’s working with the best.
          </h2>

          {/* Right — recognition paragraphs (awards copy from Sanity). Editors
              separate paragraphs with a blank line; we split on it so each
              paragraph renders as its own block instead of collapsing into
              one with a regular space. */}
          {data?.awards?.recognition && (
            <motion.div
              className="flex flex-col gap-[clamp(14px,1.4vw,22px)] text-brigada-black"
              style={{
                fontFamily: SANS,
                fontSize: "clamp(18px, 1.7vw, 26px)",
                fontWeight: 400,
                lineHeight: 1.35,
              }}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -10% 0px" }}
              transition={{ duration: 0.8, ease: EASE_OUT }}
            >
              {data.awards.recognition
                .split(/\n{2,}/)
                .map((p) => p.trim())
                .filter(Boolean)
                .map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
            </motion.div>
          )}
        </div>
      </section>
      )}

      {/* Reel — full-bleed gradient with a centered showreel blended in (Figma
          node 307-1985). Verborgen achter SHOW_REEL. */}
      {SHOW_REEL && (
      <section ref={reelRef} className="relative z-10 flex min-h-[70vh] w-full items-center justify-center overflow-hidden">
        {/* Full-bleed background video */}
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={`/bg-red.mp4`}
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
        />
        {/* Centered reel, blended into the background */}
        <video
          className="relative z-10 aspect-[560/240] w-[min(780px,60vw)] object-contain mix-blend-screen"
          src={`/Website-Baseline-Cropped.mp4`}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
        />
      </section>
      )}

      {/* Footer — shared BrandFooter met het roze brio-effect zoals op /brand
          ("Brio 02 Red & Pink", palette brio-06) in plaats van de dark-variant. */}
      <BrandFooter brioPaletteId="brio-06" brioSrc={`/meetmarcel.jpg`} />
    </main>
  );
};

export default ConceptV4;
