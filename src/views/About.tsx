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
import SharpBeatsLoud from "@/components/SharpBeatsLoud";
import { usePageTransition } from "@/components/PageTransition";
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
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const words = el.querySelectorAll<HTMLElement>("[data-word]");
    const ctx = gsap.context(() => {
      gsap.fromTo(
        words,
        { color: from },
        {
          color: to,
          ease: "none",
          duration: 1,
          stagger: 0.4,
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            end: "top 5%",
            scrub: 1.2,
          },
        }
      );
    }, el);
    return () => ctx.revert();
  }, [from, to]);

  return (
    <h1 ref={ref} className={className} style={style}>
      {text.split(" ").map((word, i) => (
        <span key={i} data-word style={{ color: from }}>
          {word}{" "}
        </span>
      ))}
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
  const heroWords = data?.hero?.words ?? [];
  const narrativeBlocks = data?.narrative ?? [];
  const narrativeText = narrativeBlocks.length > 0 ? toPlainText(narrativeBlocks) : "";
  const sections = data?.sections ?? [];
  // Hero toont de "Sharp beats loud" word-morph (looping). De sectie blijft in
  // de DOM (constante paginahoogte) zodat de parallax-footer / ScrollTrigger
  // niet ontregeld raken.
  const heroRef = useRef<HTMLElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

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
  return (
    <motion.main className="min-h-screen w-full" style={{ fontFamily: SANS, backgroundColor: bgColor }}>
      <SiteNav textClassName="text-white" />

      {/* Content — full width (gutters only, no centred max-width), like /concept.
          Its height drives the white→#FEECF2 background progress. */}
      <div ref={contentRef} className="w-full">
        {/* Hero — gooey word-morph (looping). Words come from Sanity hero.words. */}
        <section ref={heroRef} className="relative flex h-[100svh] w-full items-center justify-center overflow-hidden bg-brigada-black px-[6vw]">
          <SharpBeatsLoud className="flex w-full items-center justify-center text-white" words={heroWords} />
        </section>

        {/* Intro — words fill from #424242 to #fff on scroll */}
        {narrativeText && (
          <section className={`${GUTTER} pt-[clamp(80px,10vw,140px)]`}>
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
                    style={{ lineHeight: "40px" }}
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