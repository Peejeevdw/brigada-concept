"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import BrigadaWordmark from "@/components/BrigadaWordmark";

// Site-wide intro preloader: a full-screen black overlay that plays the same
// goo "WAVE" reveal of the Brigada wordmark as the homepage hero, then fades
// away. Shown once per session (sessionStorage) and load-aware — it waits for
// the page to finish loading before dismissing, within a min/max window so it
// never flashes nor traps the visitor.
//
// Note: covers from first paint on a fresh load (rendered by default). On a
// repeat visit within the session it removes itself on mount — there may be a
// ~1-frame black flash; a no-flash inline-head-script refinement can follow.

const GOO_BLUR_START = 46;
const GOO_ALPHA_MUL = 14;
const GOO_ALPHA_OFF = -5;
const REVEAL_MS = 1550; // wordmark goo reveal — ALWAYS plays in full (no cut-off blob)
const HOLD_AFTER_MS = 350; // beat to let the sharp logo register before fading
const MAX_VISIBLE_MS = 8000; // safety net — never trap the visitor on a stalled load
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const SESSION_KEY = "brigada-preloaded";

// Per-page loader theme so the overlay matches the page you land on (avoids a
// black→white flash). Dark = black bg / white wordmark (matches the homepage
// hero); light = white bg / black wordmark. Pages not listed fall back to the
// default below — add an entry to override a specific route.
type LoaderTheme = "dark" | "light";
const LOADER_THEMES: Record<string, LoaderTheme> = {
  "/about": "light",
};
const DEFAULT_THEME: LoaderTheme = "dark";

function themeForPath(pathname: string | null): LoaderTheme {
  if (!pathname) return DEFAULT_THEME;
  return LOADER_THEMES[pathname] ?? DEFAULT_THEME;
}

export default function Preloader() {
  // Covers from first paint; the session gate may switch it off on mount.
  const [show, setShow] = useState(true);
  const feRef = useRef<SVGFEGaussianBlurElement>(null);
  const isDark = themeForPath(usePathname()) === "dark";

  useEffect(() => {
    // Once per session — if we've already played it, drop it immediately.
    let alreadyShown = false;
    try {
      alreadyShown = !!sessionStorage.getItem(SESSION_KEY);
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* sessionStorage unavailable — just play it */
    }
    if (alreadyShown) {
      setShow(false);
      return;
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    let loaded = document.readyState === "complete";
    const onLoad = () => {
      loaded = true;
    };
    if (!loaded) window.addEventListener("load", onLoad, { once: true });
    // Safety net: force-allow dismissal so a stalled load never traps the visitor.
    const maxTimer = window.setTimeout(() => {
      loaded = true;
    }, MAX_VISIBLE_MS);

    // Always play the full goo reveal (GOO_BLUR_START → 0, cubic-out). Only once
    // it has fully resolved AND the page has loaded do we hold a beat and fade —
    // so you never see the half-resolved blob, and a slower load just keeps the
    // (finished) logo up a little longer.
    const start = performance.now();
    let raf = 0;
    let dismissTimer = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / REVEAL_MS);
      const eased = 1 - Math.pow(1 - k, 3);
      feRef.current?.setAttribute("stdDeviation", String(GOO_BLUR_START * (1 - eased)));
      if (k >= 1 && loaded) {
        dismissTimer = window.setTimeout(() => setShow(false), HOLD_AFTER_MS);
        return; // reveal done + page loaded → stop the loop and fade out
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("load", onLoad);
      window.clearTimeout(maxTimer);
      window.clearTimeout(dismissTimer);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={`fixed inset-0 z-[9990] flex items-center justify-center overflow-hidden ${
            isDark ? "bg-brigada-black" : "bg-white"
          }`}
          initial={{ y: 0 }}
          exit={{ y: "-100vh" }}
          transition={{ duration: 0.8, ease: EASE_OUT }}
          style={{ willChange: "transform" }}
          aria-hidden
        >
          {/* goo-1 "WAVE" filter — its own id so it can't clash with the hero. */}
          <svg aria-hidden width="0" height="0" className="absolute">
            <defs>
              <filter id="preloader-goo" x="-10%" y="-60%" width="120%" height="220%">
                <feGaussianBlur
                  ref={feRef}
                  in="SourceGraphic"
                  stdDeviation={GOO_BLUR_START}
                  result="blur"
                />
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
          {/* Same sizing as the homepage hero wordmark (full width minus the
              gutter, vertically centred) so the preloader logo lines up exactly
              with the hero when it hands off. On exit the wordmark counter-moves
              down by the same amount the panel slides up, so it appears to stay
              put while the rising panel edge masks it away (bottom → top). */}
          <motion.div
            className="w-full px-[clamp(24px,5vw,72px)]"
            initial={{ y: 0 }}
            exit={{ y: "100vh" }}
            transition={{ duration: 0.8, ease: EASE_OUT }}
            style={{ willChange: "transform" }}
          >
            <BrigadaWordmark
              className={`block h-auto w-full will-change-[filter] ${
                isDark ? "text-white" : "text-brigada-black"
              }`}
              style={{ filter: "url(#preloader-goo)" }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
