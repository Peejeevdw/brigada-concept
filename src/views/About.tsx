"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SiteNav from "@/components/site/SiteNav";
import BrandFooter from "@/components/BrandFooter";
import CareersCarousel from "@/components/CareersCarousel";
import SharpBeatsLoud from "@/components/SharpBeatsLoud";
import { usePageTransition } from "@/components/PageTransition";
import { BRIGADA_BLACK } from "@/lib/colors";

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

const AboutV2 = () => {
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
        {/* Hero — "Sharp beats loud" gooey word-morph (replaces the old video),
            looping on a black field, centred full-viewport. */}
        <section ref={heroRef} className="relative flex h-[100svh] w-full items-center justify-center overflow-hidden bg-brigada-black px-[6vw]">
          <SharpBeatsLoud className="flex w-full items-center justify-center text-white" />
        </section>

        {/* Intro (Figma 308:2631) — woorden vullen zich van #424242 naar #fff bij scroll */}
        <section className={`${GUTTER} pt-[clamp(80px,10vw,140px)]`}>
          <ScrollColorText
            className="w-full text-[clamp(32px,5.56vw,80px)] leading-[1.06] tracking-[-0.01em]"
            style={{ fontWeight: 400 }}
            text="Brigada was born when Fantastic, meetmarcel, mortierbrigade, Onlyhumans, Today and Who Owns The Zebra joined forces to kick brands into gear. We move as one, without the hand-offs that slow most agencies down."
          />
        </section>

        {/* Disciplines (Figma 308:2633) */}
        <section className={`${GUTTER} pt-[clamp(48px,7vw,96px)]`} style={{ color: INK }}>
          <Reveal>
            <div className="border-t" style={{ borderColor: INK }} />
            <div className="mt-[clamp(20px,2vw,26px)] flex flex-col gap-8 md:flex-row md:justify-between">
              <SectionLabel>THE FIGHT WE PICKED</SectionLabel>
              <p
                className="w-full text-[clamp(15px,1.25vw,18px)] md:w-[49%]"
                style={{ lineHeight: "40px" }}
              >
                We want to get brands and people moving again. Not by pushing
                every button at once, but by pushing for a clear direction.
                Because real progress comes from radical focus. From asking
                difficult questions and stripping away the unnecessary. We
                don&rsquo;t aim for &lsquo;louder&rsquo;; we aim for sharper.
              </p>
            </div>
          </Reveal>
        </section>

        {/* Heritage */}
        <section className={`${GUTTER} pt-[clamp(48px,7vw,96px)]`} style={{ color: INK }}>
          <Reveal>
            <div className="border-t" style={{ borderColor: INK }} />
            <div className="mt-[clamp(20px,2vw,26px)] flex flex-col gap-8 md:flex-row md:justify-between">
              <SectionLabel>STRONG HERITAGE</SectionLabel>
              <p
                className="w-full text-[clamp(15px,1.25vw,18px)] md:w-[49%]"
                style={{ lineHeight: "40px" }}
              >
                We&rsquo;re building on the legacy and strong expertise of
                Fantastic, meetmarcel, mortierbrigade, Onlyhumans, Today and Who
                Owns The Zebra. That&rsquo;s a lot of knowhow right there, and a
                lot of great work that&rsquo;s been rewarded with several Effies,
                XXX and XXX.
              </p>
            </div>
          </Reveal>
        </section>

        {/* The sharpest tools in the shed */}
        <section className={`${GUTTER} pt-[clamp(48px,7vw,96px)]`} style={{ color: INK }}>
          <Reveal>
            <div className="border-t" style={{ borderColor: INK }} />
            <div className="mt-[clamp(20px,2vw,26px)] flex flex-col gap-8 md:flex-row md:justify-between">
              <SectionLabel>THE SHARPEST TOOLS IN THE SHED</SectionLabel>
              <div
                className="w-full text-[clamp(15px,1.25vw,18px)] md:w-[49%]"
                style={{ lineHeight: "40px" }}
              >
                <p>
                  Coincidentally, we also live by the SHARP model: Strategic,
                  Human, Authentic, Relevant, Provocative.
                </p>
                <p className="mt-[clamp(20px,2vw,32px)]">
                  It&rsquo;s the lens we use to challenge briefs, test ideas and
                  make sure our work pulls its weight. Feel free to use it on us,
                  too.
                </p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* An agency for the future */}
        <section
          className={`${GUTTER} pt-[clamp(48px,7vw,96px)] pb-[clamp(80px,12vw,180px)]`}
          style={{ color: INK }}
        >
          <Reveal>
            <div className="border-t" style={{ borderColor: INK }} />
            <div className="mt-[clamp(20px,2vw,26px)] flex flex-col gap-8 md:flex-row md:justify-between">
              <SectionLabel>AN AGENCY FOR THE FUTURE</SectionLabel>
              <div
                className="w-full text-[clamp(15px,1.25vw,18px)] md:w-[49%]"
                style={{ lineHeight: "40px" }}
              >
                <p>
                  We combine the service of an integrated agency with the
                  expertise of all the different specialist agencies you&rsquo;d
                  otherwise need, and need to keep aligned.
                </p>
                <p className="mt-[clamp(20px,2vw,32px)]">
                  We see strategy as the foundation for every decision. And
                  we&rsquo;re creative, without losing sight of your business
                  reality. In short: we tick quite a few boxes.
                </p>
              </div>
            </div>
          </Reveal>
        </section>
      </div>

      {/* Image carousel (Skiper54 Carousel_006 — expand-on-active), ported from
          /careers-v2 in place of the reel video. */}
      <CareersCarousel />

      {/* Footer — same as /product: brio "..." (brio-03) backdrop + wordmark. */}
      <BrandFooter brioPaletteId="brio-03" />
    </motion.main>
  );
};

export default AboutV2;