"use client";

import { type CSSProperties, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SiteNav from "@/components/site/SiteNav";
import BrandFooter from "@/components/BrandFooter";
import BrigadaWordmark from "@/components/BrigadaWordmark";
import { BrioEffect } from "@/brio-effect";
import { useLenis } from "@/hooks/useLenis";
import { useCanvasColor } from "@/hooks/useCanvasColor";
import { getOldAgency } from "@/data/oldAgencies";
import { SANS, EASE_OUT } from "@/lib/siteTokens";
import { BRIGADA_BLACK } from "@/lib/colors";

gsap.registerPlugin(ScrollTrigger);

// "WAVE" goo reveal for the Brigada wordmark — the same effect as the homepage
// (/concept) hero, minus the scale. The feGaussianBlur drives from blurred
// (GOO_BLUR_START) to sharp (0); the feColorMatrix thresholds the blurred alpha
// so the strokes coalesce out of gooey blobs. Driven by a manual rAF (an
// animated motion value doesn't progress reliably under Next 16 + React 19).
const GOO_BLUR_START = 46;
const GOO_ALPHA_MUL = 14;
const GOO_ALPHA_OFF = -5;
const GOO_REVEAL_MS = 850;
const GOO_DELAY_MS = 1250; // starts as the Brigada block unfolds (framer delay 1.25s)

// Word-by-word colour reveal on scroll — the copy fills from grey (#424242) to
// white as the block scrolls through the viewport. Same effect as the /about
// intro; synced to the page's Lenis scroll via ScrollTrigger.
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
  const ref = useRef<HTMLParagraphElement>(null);
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
          scrollTrigger: { trigger: el, start: "top 85%", end: "top 5%", scrub: 1.2 },
        }
      );
    }, el);
    return () => ctx.revert();
  }, [from, to]);

  return (
    <p ref={ref} className={className} style={style}>
      {text.split(" ").map((word, i) => (
        <span key={i} data-word style={{ color: from }}>
          {word}{" "}
        </span>
      ))}
    </p>
  );
};

// "X is now Brigada" transition page. The old agency site redirects here.
// Layout: default nav · sticky brio hero (old logo cascades up → "is now" →
// Brigada wordmark) · black section + white footer that scroll up over the
// pinned hero.
//
// Takes only the slug (a string) so it can be rendered from the server
// catch-all without serialising the agency's Logo component across the
// server/client boundary — it resolves the full record itself.
const AgencyTransition = ({ slug }: { slug: string }) => {
  // Match the document canvas to the page's top colour so the iOS status-bar safe area (viewport-fit=cover) reads the same colour, not the cream default.
  useCanvasColor(BRIGADA_BLACK);
  // Smooth scroll + ScrollTrigger sync (shared new-style setup).
  useLenis();

  // Drive the Brigada goo reveal (blur → sharp) once, starting as the wordmark
  // unfolds. cubic-out, matching the homepage feel.
  useEffect(() => {
    const feBlur = document.querySelector<SVGFEGaussianBlurElement>(
      "#agency-goo feGaussianBlur"
    );
    if (!feBlur) return;
    feBlur.setAttribute("stdDeviation", String(GOO_BLUR_START));
    let raf = 0;
    let startTs = 0;
    const step = (ts: number) => {
      if (!startTs) startTs = ts;
      const k = Math.min(1, (ts - startTs) / GOO_REVEAL_MS);
      const eased = 1 - Math.pow(1 - k, 3);
      feBlur.setAttribute("stdDeviation", String(GOO_BLUR_START * (1 - eased)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    const timer = window.setTimeout(() => {
      raf = requestAnimationFrame(step);
    }, GOO_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, []);

  const agency = getOldAgency(slug);
  if (!agency) return null;
  const { Logo, name, body, brioPaletteId } = agency;

  return (
    <main className="w-full bg-brigada-black">
      <SiteNav homePath="/" textClassName="text-white" />

      {/* Hero — sticky so the sections below scroll up over it. Capped at 90vh. */}
      <section className="sticky top-0 z-0 flex h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-[clamp(24px,5vw,72px)] md:h-[90vh]">
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
          <BrioEffect
            src="/concept-hero.jpg"
            mode="palette"
            paletteId={brioPaletteId}
            className="h-full w-full"
          />
        </div>

        {/* goo filter def for the Brigada "WAVE" reveal (same as /concept). */}
        <svg aria-hidden width="0" height="0" className="absolute">
          <defs>
            <filter id="agency-goo" x="-10%" y="-60%" width="120%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation={GOO_BLUR_START} result="blur" />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values={`1 0 0 0 0  0 1 0 0 0  1 0 1 0 0  0 0 0 ${GOO_ALPHA_MUL} ${GOO_ALPHA_OFF}`}
                result="goo"
              />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
          </defs>
        </svg>

        {/* Cascade: Today fades in centred, then "is now" and Brigada unfold
            below it (height 0 → auto) — the column stays vertically centred, so
            each reveal pushes Today upward. */}
        <div className="relative z-10 flex w-full flex-col items-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.2 }}
          >
            <Logo aria-label={name} className="block h-auto w-[clamp(300px,52vw,820px)]" />
          </motion.div>

          <motion.div
            className="flex flex-col items-center overflow-hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.75 }}
          >
            <span
              className="block pt-[clamp(48px,7vw,104px)] text-[clamp(11px,1vw,14px)] uppercase tracking-[0.22em] opacity-80"
              style={{ fontFamily: SANS }}
            >
              is now
            </span>
          </motion.div>

          <motion.div
            className="flex flex-col items-center overflow-hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.55, ease: EASE_OUT, delay: 1.25 }}
          >
            <div
              className="pt-[clamp(48px,7vw,104px)] will-change-[filter]"
              style={{ filter: "url(#agency-goo)" }}
            >
              <BrigadaWordmark className="block h-auto w-[clamp(340px,58vw,920px)]" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Everything below scrolls up over the pinned hero. */}
      <div className="relative z-10">
        {/* Black section — block centred, text left-aligned, fills to white on scroll. */}
        <section className="w-full bg-brigada-black px-[clamp(24px,5vw,72px)] py-[clamp(100px,18vh,240px)]">
          <ScrollColorText
            text={body}
            className="mx-auto max-w-[64rem] text-left"
            style={{
              fontFamily: SANS,
              fontSize: "clamp(28px,4vw,52px)",
              fontWeight: 400,
              lineHeight: 1.25,
              letterSpacing: "-0.01em",
            }}
          />
        </section>

        <BrandFooter light />
      </div>
    </main>
  );
};

export default AgencyTransition;
