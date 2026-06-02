import { motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SiteNav from "@/components/site/SiteNav";
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
  const transitionTo = usePageTransition();

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
      <SiteNav />

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
