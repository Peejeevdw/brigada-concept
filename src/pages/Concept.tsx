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
  animate,
} from "framer-motion";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BrigadaWordmark from "@/components/BrigadaWordmark";
import BunnyReelLightbox from "@/components/BunnyReelLightbox";
import { usePageTransition } from "@/components/PageTransition";

gsap.registerPlugin(ScrollTrigger);

// Bunny HLS playlist for the hero reel — opened in the lightbox player.
const REEL_HLS_SRC =
  "https://vz-329506f6-bc3.b-cdn.net/a62cb18e-7507-4aba-ba4d-35ffcf06c530/playlist.m3u8";

const NAV_ITEMS = [
  { label: "Expertise", items: ["Brand", "Product", "People", "Marketing"] },
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

// goo-1 "WAVE" reveal values (codrops), shared with the brand footers.
const GOO_BLUR_START = 50;
const GOO_ALPHA_MUL = 31;
const GOO_ALPHA_OFF = -6;
const GOO_DUR = 2;

// Stacking case cards (Osmo "Stacking Cards Parallax" mechanic).
// First card = TUI (real). The rest are placeholders — drop visuals in /public
// and update `img` here. `bg` is any CSS background value; `fg` is the text colour.
const TUI_BG =
  "url(" +
  import.meta.env.BASE_URL +
  "concept-tui-bg.png) center/cover no-repeat, radial-gradient(140% 120% at 75% 6%, #FFFBEC 0%, #FFE25A 22%, #FFC21E 46%, #FF8A2E 70%, #FF5C46 88%, #FF4E73 100%)";
// `bg` is any CSS background; `bgVideo` (optional) renders a full-bleed looping
// video behind the content instead — takes precedence over `bg`.
// `trail` = the set of images that spawn in the cursor image-trail on hover
// (Osmo "Rotating Image Trail"). Per case its own set — placeholders for now,
// reusing existing /public images; drop real per-case visuals here later.
const CASES = [
  {
    name: "TUI",
    tags: "Brand, Marketing",
    img: "tui-image.jpg",
    bg: TUI_BG,
    fg: "#000000",
    trail: ["yellow-1.png", "yellow-2.png", "yellow-3.png"],
  },
  {
    name: "Meet Marcel",
    tags: "Brand, Product",
    img: "meetmarcel.jpg",
    bgVideo: "meetmarcel-loop.mp4",
    bg: "#1A232E",
    fg: "#000000",
    trail: ["mm-1.jpg", "mm-2.jpg", "mm-3.jpg", "mm-4.jpg"],
  },
  // Tijdelijk verborgen — terugzetten door uit te commenten:
  // { name: "Case Three", tags: "Marketing, Film", img: "placeholder.svg", bg: "#62594C", fg: "#FFFFFF", trail: ["placeholder.svg"] },
  // { name: "Case Four", tags: "Brand, Strategy", img: "placeholder.svg", bg: "#1F1715", fg: "#FFFFFF", trail: ["placeholder.svg"] },
] as { name: string; tags: string; img: string; bg: string; fg: string; bgVideo?: string; trail?: string[] }[];

// Recognition list for the "Proud not loud" section (placeholder content from Figma).
// `img` = the case visual shown in the cursor-follower preview on hover (placeholder).
const AWARDS = [
  { year: "2026", org: "Cannes Lions", title: "Gold, Film Craft, for Volvo", img: "tui-image.jpg" },
  { year: "2026", org: "Cannes Lions", title: "Gold, Film Craft, for Volvo", img: "meetmarcel.jpg" },
  { year: "2026", org: "Cannes Lions", title: "Gold, Film Craft, for Volvo", img: "tui-image.jpg" },
  { year: "2026", org: "Cannes Lions", title: "Gold, Film Craft, for Volvo", img: "meetmarcel.jpg" },
  { year: "2026", org: "Cannes Lions", title: "Gold, Film Craft, for Volvo", img: "tui-image.jpg" },
];

const Concept = () => {
  const transitionTo = usePageTransition();
  // ---- Intro: 0 = blurred + thick stroke · 1 = crisp full logo ----
  const t = useMotionValue(0);
  const [revealed, setRevealed] = useState(false);
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
  // Dev-only live tuning (see the on-page panel below).
  const [baseStart, setBaseStart] = useState(42);
  const [baseEnd, setBaseEnd] = useState(129);
  // Hero scroll length in vh — shorter = the whole sequence (and the cut) is faster.
  const [heroVh, setHeroVh] = useState(150);
  // Cut position as a fraction of scroll progress (independent of hero length).
  // The whole choreography completes by this point, so it stays coherent.
  const [cutAt, setCutAt] = useState(0.3);
  // How far the video section is pulled up under the hero (vh) — higher = revealed sooner.
  const [videoPull, setVideoPull] = useState(20);

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

  const run = () => {
    setRevealed(false);
    t.set(0);
    animate(t, 1, { duration: 2.6, ease: EASE_OUT });
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const footerRef = useRef<HTMLDivElement>(null);
  const footerWordmarkRef = useRef<HTMLDivElement>(null);

  // Custom cursor: a "Watch case" pill that trails the real cursor (with delay)
  // while hovering a case visual. The native cursor stays visible.
  // (Shared cursorX/Y also drives the award image-preview follower below.)
  const [hoverCase, setHoverCase] = useState(false);
  // Custom cursor for the hero reel: a large "Play reel" pill centred on the
  // cursor (native cursor hidden) that opens the lightbox on click. Only while
  // the reel is actually showing — once the hard cut flips to the white/black
  // section (scroll progress past cutAt) the trigger is disabled.
  const [hoverReel, setHoverReel] = useState(false);
  const [reelCut, setReelCut] = useState(false);
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const pillX = useSpring(cursorX, { stiffness: 180, damping: 17, mass: 0.7 });
  const pillY = useSpring(cursorY, { stiffness: 180, damping: 17, mass: 0.7 });
  useEffect(() => {
    const move = (e: PointerEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [cursorX, cursorY]);

  // Image-preview cursor-follower for the awards list ("Proud not loud").
  // Hovering an award shows that case's visual, trailing the cursor.
  const [hoverAward, setHoverAward] = useState<number | null>(null);
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

  // ---- Footer parallax (Osmo "Footer Parallax Effect") ----
  // As the footer scrolls in, its inner lifts (yPercent -25→0) and a dark
  // overlay fades out (opacity 0.5→0).
  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const inner = el.querySelector("[data-footer-parallax-inner]");
      const dark = el.querySelector("[data-footer-parallax-dark]");
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: "clamp(top bottom)",
          end: "clamp(top top)",
          scrub: true,
        },
      });
      if (inner) tl.from(inner, { yPercent: -25, ease: "none" });
      if (dark) tl.from(dark, { opacity: 0.5, ease: "none" }, "<");
    }, footerRef);
    return () => ctx.revert();
  }, []);

  // codrops gooey-blur reveal on the footer wordmark — plays as it scrolls into
  // view (center 85%) and reverses back to the start state on scroll up.
  useEffect(() => {
    const el = footerWordmarkRef.current;
    const feBlur = document.querySelector<SVGFEGaussianBlurElement>("#concept-footer-goo feGaussianBlur");
    if (!el || !feBlur) return;
    const vals = { stdDeviation: GOO_BLUR_START };
    feBlur.setAttribute("stdDeviation", String(GOO_BLUR_START));
    el.style.filter = "url(#concept-footer-goo)";
    gsap.set(el, { opacity: 0 });
    const ctx = gsap.context(() => {
      gsap
        .timeline({
          defaults: { duration: GOO_DUR, ease: "expo" },
          onUpdate: () => feBlur.setAttribute("stdDeviation", String(vals.stdDeviation)),
          scrollTrigger: {
            trigger: el,
            start: "center 85%",
            toggleActions: "play none none reverse",
          },
        })
        .fromTo(vals, { stdDeviation: GOO_BLUR_START }, { stdDeviation: 0 }, 0)
        .fromTo(el, { opacity: 0 }, { opacity: 1 }, 0);
    }, footerRef);
    return () => {
      ctx.revert();
      el.style.filter = "none";
      gsap.set(el, { opacity: 1 });
    };
  }, []);
  // Logo + baseline + paragraph move up together as one group (uniform 44vh).
  // Runs to p=1 (the exact pin-release point) so the group never freezes before
  // the sticky lets go — the text keeps scrolling instead of pausing at the end.
  const groupY = useTransform(p, [0, 1], ["0vh", "-64vh"]);
  // Logo fades as it scrolls off the top.
  const logoOpacity = useTransform(p, [0.56, 0.78], [1, 0]);
  // Extra lead so the logo scrolls up a bit faster than the rest of the group.
  const logoLead = useTransform(p, [0, 1], ["0vh", "-26vh"]);
  // Per-line clip-up reveal, staggered.
  const line0Y = useTransform(p, [0.22, 0.5], ["115%", "0%"]);
  const line1Y = useTransform(p, [0.4, 0.68], ["115%", "0%"]);
  const lineYs = [line0Y, line1Y];

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
  // Hard cut: only once the group has fully scrolled up (text fully in view),
  // image → white background and text → black, simultaneously.
  const whiteOpacity = useTransform(p, [cutAt, cutAt + 0.025], [0, 1]);
  const textColor = useTransform(p, [cutAt, cutAt + 0.025], ["#ffffff", "#000000"]);

  // Reel trigger only lives before the hard cut; track when we cross it.
  useEffect(() => {
    const update = (v: number) => setReelCut(v >= cutAt);
    update(p.get());
    return p.on("change", update);
  }, [p, cutAt]);

  return (
    <main className="relative bg-black">
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

      {/* Navigation — fixed so it persists across sections (doesn't scroll away) */}
      <motion.div
        className="fixed inset-x-0 top-0 z-50"
        initial={{ y: "-100%" }}
        animate={revealed ? { y: "0%" } : { y: "-100%" }}
        transition={{ duration: 0.6, ease: EASE_OUT, delay: revealed ? 0.45 : 0 }}
      >
        <div className={`progressive-blur${openIdx !== null && NAV_ITEMS[openIdx].items.length > 0 ? " is--open" : ""}`} aria-hidden>
          <div className="progressive-blur__layer is--1" />
          <div className="progressive-blur__layer is--2" />
          <div className="progressive-blur__layer is--3" />
          <div className="progressive-blur__layer is--4" />
          <div className="progressive-blur__layer is--5" />
        </div>
        <motion.nav
          style={{ color: textColor }}
          className="relative z-50 flex h-[72px] items-stretch justify-between px-[clamp(24px,5vw,72px)]"
        >
          {NAV_ITEMS.map((item, i) => {
            const alignRight = i >= NAV_ITEMS.length - 2;
            return (
              <div
                key={item.label}
                className="relative flex items-center px-5 -mx-5"
                onMouseEnter={() => openMenu(i)}
                onMouseLeave={scheduleMenuClose}
              >
                <span
                  className="cursor-pointer text-[14px] uppercase tracking-[0.1em] opacity-90 transition-opacity hover:opacity-100"
                  style={{ fontFamily: SANS }}
                  onClick={() => {
                    if (item.label === "Careers") transitionTo("/careers-v2");
                    else if (item.label === "About") transitionTo("/about-v2");
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
                              onClick={() => sub === "Brand" && transitionTo("/brand")}
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
        </motion.nav>
      </motion.div>

      {/* Dev-only type tuning panel — temporarily hidden (set `false &&` → remove to restore) */}
      {false && import.meta.env.DEV && (
        <div
          className="fixed bottom-4 left-4 z-[60] w-[230px] select-none rounded-lg border border-white/15 bg-black/80 p-3 text-[11px] leading-tight text-white shadow-xl backdrop-blur-md"
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
          <label className="block">
            Baseline end — {baseEnd}px
            <input
              type="range"
              min={24}
              max={140}
              value={baseEnd}
              onChange={(e) => setBaseEnd(+e.target.value)}
              className="mt-1 w-full accent-white"
            />
          </label>
        </div>
      )}

      {/* Custom cursor — large "Play reel" pill centred on the cursor over the hero reel */}
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[110]"
        style={{ x: pillX, y: pillY }}
        aria-hidden
      >
        <div className="-translate-x-1/2 -translate-y-1/2">
          <AnimatePresence>
            {hoverReel && !reelCut && openIdx === null && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
                className="flex items-center gap-2.5 whitespace-nowrap rounded-full bg-black p-2.5 text-[12px] uppercase tracking-[0.12em] text-white shadow-[0_4px_18px_rgba(0,0,0,0.35)]"
                style={{ fontFamily: SANS }}
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-black">
                  <svg width="8" height="9" viewBox="0 0 10 11" fill="none" className="translate-x-[1px]">
                    <path d="M9 4.634c.667.385.667 1.347 0 1.732L1.5 10.7A1 1 0 0 1 0 9.835V1.165A1 1 0 0 1 1.5.3L9 4.634Z" fill="currentColor" />
                  </svg>
                </span>
                Play reel
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

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
                className="whitespace-nowrap rounded-full border border-white/15 bg-black/50 px-4 py-2 text-[13px] uppercase tracking-[0.12em] text-white backdrop-blur-md"
                style={{ fontFamily: SANS }}
              >
                Watch case
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
                  src={`${import.meta.env.BASE_URL}${AWARDS[hoverAward].img}`}
                  className="h-full w-full object-cover"
                  alt=""
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Bunny HLS lightbox player — opened by the "Watch reel" button */}
      <BunnyReelLightbox />

      {/* Scroll track — drives the pinned hero through its states */}
      <section ref={heroRef} className="relative z-10" style={{ height: `${heroVh}vh` }}>
        <div className="sticky top-0 h-screen select-none overflow-hidden bg-black">
          {/* Replay intro — scoped so scrolling/clicking the page never restarts it */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              run();
            }}
            className="absolute bottom-5 right-5 z-30 text-[11px] uppercase tracking-[0.2em] text-white/50 mix-blend-difference transition-colors hover:text-white"
          >
            Replay
          </button>
          {/* Background reel — also the lightbox trigger: hovering shows a
              large "Play reel" pill cursor, clicking opens the HLS player. */}
          <motion.div
            data-bunny-lightbox-control={reelCut ? undefined : "open"}
            data-bunny-lightbox-src={reelCut ? undefined : REEL_HLS_SRC}
            onPointerEnter={() => setHoverReel(true)}
            onPointerLeave={() => setHoverReel(false)}
            className={`absolute inset-0 z-0 ${reelCut || openIdx !== null ? "" : "cursor-none"}`}
            style={{ opacity: bgOpacity, scale: bgScale }}
          >
            <video
              src={`${import.meta.env.BASE_URL}short-reel.mp4`}
              className="h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden
            />
            <div className="absolute inset-0 bg-black/20" />
            {/* Hidden poster — used by the lightbox as the loading placeholder */}
            <img data-bunny-lightbox-placeholder src={`${import.meta.env.BASE_URL}concept-reel-bg.jpg`} alt="" className="hidden" />
          </motion.div>

          {/* White block that overtakes the image near the end */}
          <motion.div
            className="pointer-events-none absolute inset-0 z-[5] bg-white"
            style={{ opacity: whiteOpacity }}
            aria-hidden
          />

          {/* Content group — logo + baseline + paragraph scroll up uniformly.
              pointer-events-none so hover/click falls through to the reel trigger. */}
          <motion.div className="pointer-events-none absolute inset-0 z-10" style={{ y: groupY }}>
          {/* goo-1 filter for the hero wordmark "WAVE" reveal (replaces the blur) */}
          <svg aria-hidden width="0" height="0" className="absolute">
            <defs>
              <filter id="hero-goo" x="-10%" y="-60%" width="120%" height="220%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="0" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values={`1 0 0 0 0  0 1 0 0 0  1 0 1 0 0  0 0 0 ${GOO_ALPHA_MUL} ${GOO_ALPHA_OFF}`} result="goo" />
                <feComposite in="SourceGraphic" in2="goo" operator="atop" />
              </filter>
            </defs>
          </svg>
          {/* Wordmark — centred, scrolls off the top */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              style={{
                filter: "url(#hero-goo)",
                scale: introScale,
                y: logoLead,
                opacity: logoOpacity,
                "--logo-stroke": strokePx,
              } as CSSProperties}
              className="w-full px-[clamp(24px,5vw,72px)] will-change-[filter,transform]"
            >
              <svg
                className="concept-logo block h-auto w-full"
                viewBox="0 0 1260 340"
                fill="white"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label="Brigada"
              >
                <path d="M1107.05 275.532C1073.5 275.532 1052.56 257.111 1052.56 227.639C1052.56 201.656 1068.85 184.981 1106.66 171.214L1143.89 157.641C1153.39 154.151 1157.85 147.946 1157.85 137.669V131.852C1157.85 110.911 1145.05 99.0829 1122.56 99.0829C1117.52 99.0829 1112.86 99.6646 1108.6 100.828C1095.99 103.93 1092.31 112.462 1095.8 115.564C1102.59 121.381 1104.72 128.362 1104.72 134.954C1104.72 149.303 1094.06 159.58 1079.71 159.58C1066.13 159.58 1053.53 150.272 1053.53 131.27C1053.53 104.9 1078.16 77.7539 1126.05 77.7539C1169.87 77.7539 1198.96 100.634 1198.96 135.148V235.007C1198.96 245.284 1204.58 250.907 1214.27 250.907C1227.65 250.907 1236.77 239.66 1236.77 223.567V170.632C1236.77 166.948 1238.9 164.815 1242.58 164.815H1253.25C1256.93 164.815 1259.06 166.754 1259.06 170.632V223.567C1259.06 254.591 1238.12 275.532 1208.07 275.532C1192.36 275.532 1179.57 269.715 1171.42 260.02C1165.02 251.682 1162.31 250.519 1155.72 257.111C1143.69 268.939 1127.02 275.532 1107.05 275.532ZM1099.48 234.425C1099.48 246.835 1107.43 254.203 1120.62 254.203C1143.31 254.203 1157.85 232.292 1157.85 196.809V196.227C1157.85 183.236 1149.9 177.806 1137.88 182.266L1115.97 190.216C1105.11 194.288 1099.48 202.626 1099.48 214.841V234.425Z" />
                <path d="M938.423 275.532C893.051 275.532 859.118 233.068 859.118 176.449C859.118 120.024 893.051 77.7539 938.423 77.7539C949.863 77.7539 960.334 80.2746 970.029 85.316C982.245 91.5208 989.031 89.3879 989.031 75.621V48.6689C989.031 37.2288 982.826 31.2179 971.58 31.2179H958.007C954.323 31.2179 952.19 29.085 952.19 25.4009V15.7059C952.19 11.8279 954.323 9.8889 958.007 9.8889H982.051C990.001 9.8889 995.818 8.72549 1003.38 6.0109L1016.95 1.16339C1019.47 0.193886 1021.61 0 1024.13 0H1024.32C1028.01 0 1030.14 1.939 1030.14 5.81699V238.885C1030.14 246.059 1035.57 250.907 1043.52 250.907C1053.79 250.907 1060.19 241.793 1060.19 227.445V219.301C1060.19 215.423 1062.33 213.484 1066.01 213.484H1076.67C1080.36 213.484 1082.49 215.423 1082.49 219.301V227.445C1082.49 255.948 1064.07 275.532 1037.31 275.532C1022.19 275.532 1009.78 270.103 1001.83 260.602C995.43 252.264 992.134 251.294 984.184 258.275C971.386 269.133 955.68 275.532 938.423 275.532ZM939.781 254.203C971.968 254.203 996.399 220.852 996.399 176.643C996.399 132.434 971.968 99.0829 939.781 99.0829C920.003 99.0829 907.981 111.686 907.981 132.24V221.046C907.981 241.599 920.003 254.203 939.781 254.203Z" />
                <path d="M744.517 275.532C710.972 275.532 690.031 257.111 690.031 227.639C690.031 201.656 706.319 184.981 744.129 171.214L781.358 157.641C790.859 154.151 795.319 147.946 795.319 137.669V131.852C795.319 110.911 782.522 99.0829 760.029 99.0829C754.988 99.0829 750.334 99.6646 746.068 100.828C733.465 103.93 729.781 112.462 733.271 115.564C740.057 121.381 742.19 128.362 742.19 134.954C742.19 149.303 731.526 159.58 717.177 159.58C703.604 159.58 691.001 150.272 691.001 131.27C691.001 104.9 715.626 77.7539 763.519 77.7539C807.341 77.7539 836.426 100.634 836.426 135.148V235.007C836.426 245.284 842.049 250.907 851.744 250.907C865.123 250.907 874.236 239.66 874.236 223.567V170.632C874.236 166.948 876.369 164.815 880.053 164.815H890.718C894.402 164.815 896.535 166.754 896.535 170.632V223.567C896.535 254.591 875.594 275.532 845.539 275.532C829.833 275.532 817.036 269.715 808.892 260.02C802.493 251.682 799.779 250.519 793.186 257.111C781.164 268.939 764.489 275.532 744.517 275.532ZM736.955 234.425C736.955 246.835 744.905 254.203 758.09 254.203C780.776 254.203 795.319 232.292 795.319 196.809V196.227C795.319 183.236 787.369 177.806 775.347 182.266L753.437 190.216C742.578 194.288 736.955 202.626 736.955 214.841V234.425Z" />
                <path d="M590.302 339.325C536.785 339.325 503.822 321.874 503.822 292.789C503.822 281.931 508.088 272.817 516.232 265.837C523.794 259.244 524.182 255.56 519.334 247.029C516.426 241.405 514.681 235.007 514.681 228.414C514.681 214.647 521.855 203.401 533.877 196.615C543.184 191.379 543.766 189.052 536.204 181.49C525.927 171.02 520.11 157.447 520.11 141.547C520.11 105.094 552.103 77.7539 594.374 77.7539C599.027 77.7539 603.681 78.1417 607.947 78.7234C618.805 80.2746 624.428 76.9783 628.694 66.5076C639.358 40.9129 661.463 29.085 680.853 29.085C701.019 29.085 711.101 41.4946 711.101 55.2615C711.101 69.2223 700.631 79.499 686.282 79.499C679.496 79.499 673.097 76.9783 666.698 71.3552C660.687 65.926 652.156 67.0894 648.084 76.9783C647.696 78.1417 647.308 79.3051 646.92 80.4685C644.012 89.5818 648.084 95.5927 654.095 102.767C663.402 113.625 669.025 127.392 669.025 142.71C669.025 179.551 637.032 207.473 594.568 207.473H561.604C552.103 207.473 545.511 213.096 545.511 221.24C545.511 229.384 552.103 234.813 561.604 234.813H630.245C663.402 234.813 685.507 253.427 685.507 281.931C685.507 318.578 648.666 339.325 590.302 339.325ZM594.568 186.144C611.243 186.144 622.683 175.286 622.683 160.161V125.259C622.683 109.747 611.243 99.0829 594.568 99.0829C577.892 99.0829 566.452 109.747 566.452 125.259V160.161C566.452 175.286 577.892 186.144 594.568 186.144ZM535.622 295.504C535.622 309.658 556.175 317.996 591.659 317.996C633.735 317.996 658.167 306.362 658.167 287.166C658.167 276.501 650.411 269.715 638.001 269.715H557.727C544.541 269.715 535.622 277.277 535.622 288.523V295.504Z" />
                <path d="M490.711 263.898C490.711 267.582 488.578 269.715 484.894 269.715H400.16C396.476 269.715 394.343 267.776 394.343 263.898V254.203C394.343 250.325 396.476 248.386 400.16 248.386H432.153C443.399 248.386 449.604 242.181 449.604 230.935V133.015C449.604 120.024 441.654 114.401 429.633 118.861L404.619 127.974C400.548 129.331 398.027 127.586 398.027 123.127V112.656C398.027 109.166 399.578 107.033 402.68 105.869L477.526 78.7235C480.047 77.754 482.179 77.5601 484.7 77.5601H484.894C488.578 77.5601 490.711 79.4991 490.711 83.3771V263.898ZM470.352 62.048C453.288 62.048 441.46 50.8019 441.46 34.3204C441.46 17.8389 453.288 6.59265 470.352 6.59265C487.415 6.59265 499.243 17.8389 499.243 34.3204C499.243 50.8019 487.415 62.048 470.352 62.048Z" />
                <path d="M253.945 269.715C250.261 269.715 248.128 267.776 248.128 263.898V254.203C248.128 250.325 250.261 248.386 253.945 248.386H267.518C278.764 248.386 284.969 242.181 284.969 230.935V126.229C284.969 114.983 278.764 108.778 267.518 108.778H253.945C250.261 108.778 248.128 106.645 248.128 102.961V93.266C248.128 89.388 250.261 87.449 253.945 87.449H277.989C285.938 87.449 291.755 86.2856 299.318 83.571L312.891 78.7235C315.411 77.754 317.544 77.5601 320.065 77.5601H320.259C323.943 77.5601 326.076 79.4991 326.076 83.3771C326.076 97.5318 331.117 98.5013 342.363 89.5819C352.058 81.8259 363.498 77.754 376.49 77.754C406.932 77.754 425.74 100.828 425.74 125.841C425.74 146.395 412.943 155.702 398.4 155.702C383.276 155.702 372.806 145.425 372.806 131.076C372.806 124.484 375.132 117.503 381.725 111.686C386.185 107.808 386.185 102.185 380.949 100.44C378.041 99.6647 374.939 99.083 371.448 99.083C342.751 99.083 326.076 133.015 326.076 190.216V230.935C326.076 242.181 332.281 248.386 343.527 248.386H374.745C378.429 248.386 380.562 250.325 380.562 254.203V263.898C380.562 267.582 378.429 269.715 374.745 269.715H253.945Z" />
                <path d="M157.835 269.715H5.817C2.1329 269.715 0 267.776 0 263.898V254.203C0 250.325 2.1329 248.386 5.817 248.386H30.4423C41.6885 248.386 47.8933 242.181 47.8933 230.935V48.6689C47.8933 37.4227 41.6885 31.2179 30.4423 31.2179H5.817C2.1329 31.2179 0 29.085 0 25.4009V15.7059C0 11.8279 2.1329 9.88892 5.817 9.88892H146.782C197.196 9.88892 232.486 36.0654 232.486 73.4881C232.486 93.6537 222.403 110.911 205.34 122.739C195.645 129.525 195.839 132.822 206.504 137.863C233.068 150.273 249.937 173.153 249.937 200.493C249.937 241.406 212.321 269.715 157.835 269.715ZM149.109 248.386C178.97 248.386 197.584 231.129 197.584 203.789V189.053C197.584 161.713 178.97 144.456 149.109 144.456H110.911C99.6646 144.456 93.4598 150.466 93.4598 161.907V230.935C93.4598 242.375 99.6646 248.386 110.911 248.386H149.109ZM93.4598 105.676C93.4598 117.116 99.6646 123.127 110.911 123.127H142.323C166.754 123.127 182.072 108.584 182.072 85.316V69.0284C182.072 45.7604 166.754 31.2179 142.323 31.2179H110.911C99.6646 31.2179 93.4598 37.2288 93.4598 48.6689V105.676Z" />
              </svg>
            </motion.div>
          </div>

          {/* Tagline — SHARP · BEATS · LOUD (sits above the paragraph) */}
          <motion.div
            style={{ color: textColor }}
            className="absolute inset-x-0 top-[76vh] flex justify-between px-[clamp(24px,5vw,72px)]"
          >
            {TAGLINE.map((word, i) => (
              <motion.span
                key={word}
                className="uppercase tracking-[-0.015em]"
                style={{ fontFamily: SANS, fontStretch: "125%", fontSize: baselineSize }}
                initial={{ opacity: 0, y: 24 }}
                animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
                transition={{ duration: 0.55, ease: EASE_OUT, delay: revealed ? 0.05 + i * 0.12 : 0 }}
              >
                {word}
              </motion.span>
            ))}
          </motion.div>

          {/* Paragraph — 2 lines, auto-sized; moves with the group (constant gap to baseline) */}
          <motion.div
            ref={paraRef}
            style={{ color: textColor }}
            className="absolute inset-x-0 top-[96vh] px-[clamp(24px,5vw,72px)]"
          >
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

      {/* Cases — narrow meta label on the left, large landscape media on the
          right, over each case's background (Figma node 299-1977). Pulled up
          under the hero via videoPull so the reveal stays seamless. */}
      <div
        ref={collectionRef}
        className="relative z-10 w-full"
        style={{ marginTop: `-${videoPull}vh` }}
      >
        {CASES.map((c) => (
          <section
            key={c.name}
            data-stacking-cards-item
            className="relative -mt-4 flex min-h-screen w-full items-center overflow-hidden"
            style={{ background: c.bg, color: c.fg }}
          >
            {/* Optional full-bleed video background */}
            {c.bgVideo && (
              <video
                className="absolute inset-0 h-full w-full object-cover"
                src={`${import.meta.env.BASE_URL}${c.bgVideo}`}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                aria-hidden
              />
            )}

            {/* Full-width content row (same gutters as the paragraph above) */}
            <div className="relative z-10 flex w-full flex-col gap-8 px-[clamp(24px,5vw,72px)] py-[clamp(56px,12vh,140px)] md:flex-row md:items-center md:gap-[clamp(40px,10vw,221px)]">
              {/* Meta — name + disciplines */}
              <div className="flex shrink-0 flex-col gap-4 md:w-[171px]">
                <span
                  className="text-[clamp(20px,1.9vw,27px)] uppercase leading-none"
                  style={{ fontFamily: SANS, fontStretch: "125%", fontWeight: 500 }}
                >
                  {c.name}
                </span>
                <span
                  className="text-[clamp(13px,1.05vw,15px)] tracking-[-0.015em]"
                  style={{ fontFamily: SANS }}
                >
                  {c.tags}
                </span>
              </div>

              {/* Media — large landscape visual; "Watch case" pill on hover.
                  (Osmo image-trail tijdelijk uit — zie de uitgecommentarieerde
                  data-trail markup hieronder + het trail-useEffect/CSS.) */}
              <div
                className="relative w-full overflow-hidden md:flex-1"
                onPointerEnter={() => setHoverCase(true)}
                onPointerLeave={() => setHoverCase(false)}
              >
                <img
                  data-stacking-cards-img
                  className="block aspect-[1342/813] w-full object-cover"
                  src={`${import.meta.env.BASE_URL}${c.img}`}
                  alt={`${c.name} — ${c.tags}`}
                />
                {/* Trail source set — hidden originals the script clones from.
                <div data-trail-collection className="rotating-image-trail__collection" aria-hidden>
                  {(c.trail ?? [c.img]).map((src, ti) => (
                    <div data-trail-item="" key={ti} className="rotating-image-trail__item">
                      <div className="rotating-image-trail__card">
                        <img
                          src={`${import.meta.env.BASE_URL}${src}`}
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
        ))}
      </div>

      {/* Recognition — "Proud not loud" intro + awards list (Figma node 299-1904) */}
      <section className="relative z-10 w-full bg-white text-black">
        <div className="grid w-full grid-cols-1 gap-x-12 gap-y-12 px-[clamp(24px,5vw,72px)] py-[clamp(64px,12vh,160px)] md:grid-cols-2">
          {/* Left — intro */}
          <div className="max-w-[420px]">
            <h2
              className="text-[clamp(40px,6vw,70px)] uppercase leading-[1.1] tracking-[-0.02em]"
              style={{ fontFamily: SANS, fontStretch: "125%", fontWeight: 500 }}
            >
              Proud not loud
            </h2>
            <p
              className="mt-4 text-[clamp(16px,1.4vw,20px)] leading-[1.7]"
              style={{ fontFamily: SANS }}
            >
              When strategy, creativity, data and experience come together from
              day one, great work happens.
            </p>
          </div>

          {/* Right — awards / recognition list */}
          <div className="flex flex-col" onPointerLeave={() => setHoverAward(null)}>
            {AWARDS.map((a, i) => (
              <div
                key={i}
                onPointerEnter={() => setHoverAward(i)}
                className="flex cursor-pointer flex-col gap-[2px] border-b border-black/15 py-[22px] transition-opacity duration-200 first:pt-0"
                style={{
                  fontFamily: SANS,
                  opacity: hoverAward !== null && hoverAward !== i ? 0.45 : 1,
                }}
              >
                <span className="text-[16px] tracking-[-0.015em] text-black/60">
                  {a.year}
                </span>
                <span className="text-[16px] tracking-[-0.015em]">{a.org}</span>
                <span className="text-[clamp(18px,1.7vw,24px)] tracking-[-0.015em]">
                  {a.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reel — full-bleed gradient with a centered showreel blended in (Figma node 307-1985) */}
      <section ref={reelRef} className="relative z-10 flex min-h-[70vh] w-full items-center justify-center overflow-hidden">
        {/* Full-bleed background video */}
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={`${import.meta.env.BASE_URL}bg-red.mp4`}
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
        />
        {/* Centered reel, blended into the background */}
        <video
          className="relative z-10 aspect-[1090/613] w-[min(1090px,82vw)] object-cover mix-blend-screen"
          src={`${import.meta.env.BASE_URL}sharp-beats-loud.mp4`}
          muted
          loop
          playsInline
          preload="auto"
        />
      </section>

      {/* Footer — parallax reveal (Osmo "Footer Parallax Effect") */}
      <div ref={footerRef} data-footer-parallax className="relative z-10 overflow-hidden">
        <footer
          data-footer-parallax-inner
          className="relative flex min-h-screen flex-col justify-between gap-[clamp(48px,8vw,120px)] bg-white px-[clamp(24px,5vw,40px)] pt-[clamp(112px,16vh,180px)] text-black"
          style={{ fontFamily: SANS }}
        >
          {/* Link columns */}
          <div className="flex flex-col gap-12 md:flex-row md:gap-10">
            {[
              { label: "Pages", links: ["Work", "Expertise", "About", "Careers", "Contact"] },
              { label: "Socials", links: ["LinkedIn", "Instagram", "X/Twitter"] },
              { label: "Contact", links: ["hello@brigada.be", "+32 9 123 45 67"] },
            ].map((col) => (
              <div key={col.label} className="flex w-full flex-col gap-6 md:w-1/3">
                <p className="text-[clamp(12px,1vw,15px)] font-normal opacity-50">
                  ( {col.label} )
                </p>
                <div className="flex flex-col items-start gap-1">
                  {col.links.map((l) => (
                    <a
                      key={l}
                      href="#"
                      data-underline-link
                      className="text-[clamp(28px,4.5vw,44px)] leading-none"
                    >
                      {l}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* goo-1 filter for the wordmark "WAVE" reveal */}
          <svg aria-hidden width="0" height="0" className="absolute">
            <defs>
              <filter id="concept-footer-goo" x="-20%" y="-100%" width="140%" height="300%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="0" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values={`1 0 0 0 0  0 1 0 0 0  1 0 1 0 0  0 0 0 ${GOO_ALPHA_MUL} ${GOO_ALPHA_OFF}`} result="goo" />
                <feComposite in="SourceGraphic" in2="goo" operator="atop" />
              </filter>
            </defs>
          </svg>
          {/* Logo row — full-width wordmark, bottom clipped off the footer edge */}
          <div ref={footerWordmarkRef} className="aspect-[1260/230] w-full overflow-hidden">
            <BrigadaWordmark className="block h-auto w-full" />
          </div>
        </footer>
        <div
          data-footer-parallax-dark
          className="pointer-events-none absolute inset-0 bg-[#201D1D] opacity-0"
          aria-hidden
        />
      </div>
    </main>
  );
};

export default Concept;
