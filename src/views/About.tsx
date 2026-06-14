"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PortableText, toPlainText, type PortableTextBlock } from "@portabletext/react";
import SiteNav from "@/components/site/SiteNav";
import BrandFooter from "@/components/BrandFooter";
import CareersCarousel, { type CarouselSlide } from "@/components/CareersCarousel";
import { usePageTransition } from "@/components/PageTransition";
import { onPreloaderReveal } from "@/lib/preloader-gate";
import { BRIGADA_BLACK } from "@/lib/colors";

export interface AboutData {
  hero?: { words?: string[] | null } | null;
  narrative?: PortableTextBlock[] | null;
  sections?: Array<{
    _key?: string;
    label?: string | null;
    layout?: string | null;
    body?: PortableTextBlock[] | null;
  }> | null;
}

gsap.registerPlugin(ScrollTrigger);

// Brand page — implemented from Figma (node 308:2369), built in the concept-page
// idiom (self-contained, framer-motion, Antarctica, public/ assets via BASE_URL).
// Reel layer and the trailing "Meet the clients" heading are intentionally left
// out for now (design not finalised there).

const SANS = '"Antarctica", system-ui, sans-serif';
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const INK = "#ffffff";



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

// Scroll-gestuurde kleuronthulling: de woorden starten in #424242 en vullen zich
// woord-voor-woord naar #fff terwijl de zin door de viewport scrollt (GSAP scrub,
// gekoppeld aan dezelfde Lenis-scroll als de rest van de pagina).
const ScrollColorText = ({
  text,
  className = "",
  style,
  from = "#424242",
  to = "#ffffff",
}: {
  text: string;
  className?: string;
  style?: CSSProperties;
  from?: string;
  to?: string;
}) => {
  // The scroll-driven word-by-word colour fill was removed — the copy now
  // renders fully in its end colour. (`from` is kept in the signature so the
  // call site stays unchanged.)
  void from;
  return (
    <h1 className={className} style={{ ...style, color: to }}>
      {text}
    </h1>
  );
};

const SectionLabel = ({ children }: { children: ReactNode }) => (
  <h2
    className="shrink-0 text-[clamp(18px,1.5vw,22px)] uppercase leading-none"
    style={{ fontWeight: 500 }}
  >
    {children}
  </h2>
);

// Carousel images live in public/about/.
const CAROUSEL_SLIDES: CarouselSlide[] = [
  { src: "/about/1.jpg", alt: "Brigada" },
  { src: "/about/2.jpg", alt: "Brigada" },
  { src: "/about/3.jpg", alt: "Brigada" },
  { src: "/about/4.jpg", alt: "Brigada" },
  { src: "/about/5.jpg", alt: "Brigada" },
  { src: "/about/6.jpg", alt: "Brigada" },
];

const AboutV2 = ({ data }: { data?: AboutData | null } = {}) => {
  const narrativeBlocks = data?.narrative ?? [];
  const narrativeText = narrativeBlocks.length > 0 ? toPlainText(narrativeBlocks) : "";
  const sections = data?.sections ?? [];
  // Hero toont de "Sharp beats loud" word-morph (looping). De sectie blijft in
  // de DOM (constante paginahoogte) zodat de parallax-footer / ScrollTrigger
  // niet ontregeld raken.
  const heroRef = useRef<HTMLElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const introRef = useRef<HTMLElement>(null);

  const transitionTo = usePageTransition();

  // Scroll-driven background — the page warms from white to #FEECF2 as you scroll
  // through the (white) content block, reaching full tint right as the dark orbit
  // slides over. framer-motion interpolates the hex colour for us.
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollP = useMotionValue(0);
  const bgColor = useTransform(scrollP, [0, 1], [BRIGADA_BLACK, BRIGADA_BLACK]);

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
    lenisRef.current = lenis;
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
      lenisRef.current = null;
      window.removeEventListener("resize", updateProgress);
    };
  }, [scrollP]);

  // Once the hero reel finishes its first play, gently scroll to the intro —
  // but only if the visitor hasn't taken over scrolling themselves. The video
  // keeps `loop`, so we read the first completion as currentTime jumping
  // backward (end → 0). A real user scroll (wheel / touch / nav key / any
  // scrollY) cancels it; the programmatic Lenis scroll doesn't.
  //
  // On a direct load the reel autoplays *behind* the intro Preloader, so we'd
  // both miss its opening seconds and risk auto-scrolling under the overlay.
  // We therefore reset the reel to frame 0 the moment the curtain lifts
  // (onPreloaderReveal) and only arm the first-play detection from then.
  // Skipped under reduced motion.
  useEffect(() => {
    const video = videoRef.current;
    const intro = introRef.current;
    if (!video || !intro) return;
    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduce) return;
    // On mobile the hero is shorter and the auto-descent feels like the page
    // scrolling on its own, so skip the programmatic scroll there.
    const isMobile =
      window.matchMedia?.("(max-width: 767px)").matches ?? false;

    let userScrolled = window.scrollY > 4;
    let armed = false;
    let done = false;
    let lastTime = 0;

    const markScrolled = () => {
      userScrolled = true;
    };
    const onKey = (e: KeyboardEvent) => {
      if (
        ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " ", "Spacebar"].includes(
          e.key
        )
      )
        userScrolled = true;
    };
    window.addEventListener("wheel", markScrolled, { passive: true });
    window.addEventListener("touchmove", markScrolled, { passive: true });
    window.addEventListener("keydown", onKey);

    // Soft ease-in-out so the descent starts and lands gently.
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const onTime = () => {
      if (!armed) return;
      if (!done && lastTime > 0.5 && video.currentTime < lastTime - 0.5) {
        done = true;
        if (!userScrolled && !isMobile) {
          const lenis = lenisRef.current;
          if (lenis) lenis.scrollTo(intro, { duration: 1.2, easing: easeInOutCubic });
          else intro.scrollIntoView({ behavior: "smooth" });
        }
      }
      lastTime = video.currentTime;
    };
    video.addEventListener("timeupdate", onTime);

    const off = onPreloaderReveal(() => {
      try {
        video.currentTime = 0;
      } catch {
        /* metadata not ready yet — autoplay will start near 0 anyway */
      }
      video.play?.().catch(() => {});
      lastTime = 0;
      done = false;
      armed = true;
    });

    return () => {
      window.removeEventListener("wheel", markScrolled);
      window.removeEventListener("touchmove", markScrolled);
      window.removeEventListener("keydown", onKey);
      video.removeEventListener("timeupdate", onTime);
      off();
    };
  }, []);
  return (
    <motion.main className="min-h-screen w-full" style={{ fontFamily: SANS, backgroundColor: bgColor }}>
      <SiteNav textClassName="text-white" />

      {/* Content — full width (gutters only, no centred max-width), like /concept.
          Its height drives the white→#FEECF2 background progress. */}
      <div ref={contentRef} className="w-full">
        {/* Hero — baseline reel (looping). */}
        <section ref={heroRef} className="relative flex h-[100svh] max-md:h-[48svh] max-md:pt-[72px] w-full items-center justify-center overflow-hidden bg-brigada-black px-[6vw]">
          <video
            ref={videoRef}
            className="relative z-10 aspect-[560/240] w-[min(780px,60vw)] object-contain mix-blend-screen"
            src={`/Website-Baseline-Cropped-XL.mp4`}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden
          />
        </section>

        {/* Intro — words fill from #424242 to #fff on scroll */}
        {narrativeText && (
          <section ref={introRef} className={`${GUTTER} pt-[clamp(80px,10vw,140px)] max-md:pt-0`}>
            <ScrollColorText
              className="w-full text-[clamp(32px,5.56vw,80px)] leading-[1.06] tracking-[-0.01em]"
              style={{ fontWeight: 400 }}
              text={narrativeText}
            />
          </section>
        )}

        {/* Labelled sections — order and copy from Sanity aboutPage.sections */}
        {sections.map((section, i) => {
          const isLast = i === sections.length - 1;
          return (
            <section
              key={section._key ?? `s${i}`}
              className={`${GUTTER} pt-[clamp(48px,7vw,96px)]${isLast ? " pb-[clamp(80px,12vw,180px)]" : ""}`}
              style={{ color: INK }}
            >
              <Reveal>
                <div className="border-t" style={{ borderColor: INK }} />
                <div className="mt-[clamp(20px,2vw,26px)] flex flex-col gap-8 md:flex-row md:justify-between">
                  <SectionLabel>{section.label ?? ""}</SectionLabel>
                  <div
                    className="w-full text-[clamp(15px,1.25vw,18px)] md:w-[49%] [&_p+p]:mt-[clamp(20px,2vw,32px)]"
                    style={{ lineHeight: 1.6 }}
                  >
                    {section.body && <PortableText value={section.body} />}
                  </div>
                </div>
              </Reveal>
            </section>
          );
        })}
      </div>

      {/* Image carousel (Skiper54 Carousel_006 — expand-on-active), ported from
          /careers-v2 in place of the reel video. */}
      <CareersCarousel slides={CAROUSEL_SLIDES} />

      {/* Footer — same as /product: brio "..." (brio-03) backdrop + wordmark. */}
      <BrandFooter brioPaletteId="brio-03" />
    </motion.main>
  );
};

export default AboutV2;