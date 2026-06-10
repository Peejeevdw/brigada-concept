"use client";

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

const AgencyPoster = ({ slug }: { slug: string }) => {
  const transitionTo = usePageTransition();
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

        {/* Brigada — 20px off the bottom, centred. */}
        <motion.div {...fade(1.0)} className="shrink-0">
          <BrigadaWordmark className="block h-auto w-[clamp(300px,42vw,720px)]" />
        </motion.div>
      </div>
    </main>
  );
};

export default AgencyPoster;
