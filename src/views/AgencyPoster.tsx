"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import BrigadaWordmark from "@/components/BrigadaWordmark";
import RevealText from "@/components/RevealText";
import { usePageTransition } from "@/components/PageTransition";
import { BrioEffect } from "@/brio-effect";
import { getOldAgency } from "@/data/oldAgencies";
import { SANS, EASE_OUT } from "@/lib/siteTokens";

// Single-screen "X is now Brigada" poster — no nav, no scroll, no footer.
// Old wordmark flush to the top, Brigada 20px off the bottom, and a middle row
// of copy (left) · "is now" (centre) · CTA (right). Elements fade in in
// sequence: Today → "is now" → Brigada → copy → CTA.
//
// Takes only the slug (a string) so it can be rendered from a server route
// without serialising the agency's Logo component.
const fade = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: EASE_OUT, delay },
});

// "WAVE" goo reveal for the Brigada wordmark — same effect as the /concept hero:
// the feGaussianBlur drives from blurred (GOO_BLUR_START) to sharp (0) while the
// feColorMatrix thresholds the blurred alpha so the strokes coalesce out of
// gooey blobs. Driven by a manual rAF (an animated motion value doesn't progress
// reliably under Next 16 + React 19). Starts as the Brigada block fades in.
const GOO_BLUR_START = 46;
const GOO_ALPHA_MUL = 14;
const GOO_ALPHA_OFF = -5;
const GOO_REVEAL_MS = 1550;
const GOO_DELAY_MS = 1000; // matches the Brigada wordmark's fade(1.0) delay

const AgencyPoster = ({ slug }: { slug: string }) => {
  const transitionTo = usePageTransition();

  // Drive the Brigada goo reveal (blur → sharp) once, cubic-out, matching the
  // homepage feel.
  useEffect(() => {
    const feBlur = document.querySelector<SVGFEGaussianBlurElement>(
      "#poster-goo feGaussianBlur"
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
  const { Logo, name, body, brioPaletteId, cta } = agency;

  const onCta = () => {
    if (!cta) return;
    if (/^https?:\/\//.test(cta.href)) window.location.href = cta.href;
    else transitionTo(cta.href);
  };

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-brigada-black">
      {/* Brio background */}
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
          <filter id="poster-goo" x="-10%" y="-60%" width="120%" height="220%">
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

      {/* Today (top) · "is now" (centre) · Brigada (bottom) share one vertical
          centre axis; copy pins left, CTA pins right, both at mid-height. */}
      <div className="relative z-10 flex h-full flex-col items-center pb-[20px] text-white">
        {/* Today — flush to the top, centred. */}
        <motion.div {...fade(0.2)} className="shrink-0">
          <Logo aria-label={name} className="block h-auto w-[clamp(300px,42vw,720px)]" />
        </motion.div>

        {/* Middle band — fills the gap between Today and Brigada and centres its
            content, so "is now" sits dead-centre and copy/CTA align at mid-height. */}
        <div className="relative flex w-full flex-1 items-center justify-center px-[clamp(24px,5vw,72px)]">
          {/* "is now" — horizontal + vertical centre. */}
          <motion.span
            {...fade(0.6)}
            className="text-[clamp(11px,1vw,14px)] uppercase tracking-[0.22em] opacity-80"
            style={{ fontFamily: SANS }}
          >
            is now
          </motion.span>

          {/* Copy — left gutter, per-line reveal, comes in later. */}
          <div
            className="absolute left-[clamp(24px,5vw,72px)] top-1/2 max-w-[clamp(220px,26vw,360px)] -translate-y-1/2"
            style={{ fontFamily: SANS }}
          >
            <RevealText
              as="p"
              text={body}
              startDelay={1900}
              stagger={90}
              duration={700}
              className="text-left text-[clamp(12px,0.95vw,15px)] leading-[1.45]"
            />
          </div>

          {/* CTA — right gutter, comes in last. */}
          {cta && (
            <motion.button
              {...fade(2.2)}
              type="button"
              onClick={onCta}
              className="absolute right-[clamp(24px,5vw,72px)] top-1/2 -translate-y-1/2 text-[clamp(12px,0.95vw,15px)] underline-offset-4 transition-opacity hover:underline"
              style={{ fontFamily: SANS }}
            >
              {cta.label}
            </motion.button>
          )}
        </div>

        {/* Brigada — 20px off the bottom, centred. The wrapper carries the goo
            "WAVE" reveal filter (blur → sharp), like the /concept hero. */}
        <motion.div {...fade(1.0)} className="shrink-0">
          <div className="will-change-[filter]" style={{ filter: "url(#poster-goo)" }}>
            <BrigadaWordmark className="block h-auto w-[clamp(480px,78vw,1360px)]" />
          </div>
        </motion.div>
      </div>
    </main>
  );
};

export default AgencyPoster;
