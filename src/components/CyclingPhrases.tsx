"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Auto-cycling centred phrases on a timer (not scroll). Shows one phrase at a
 * time and crossfades to the next in place (AnimatePresence mode="wait", so the
 * current fades out before the next fades in). Multi-line phrases are supported
 * via "\n" (whitespace-pre-line). Inherits font-size/colour from the parent.
 */
const CyclingPhrases = ({
  phrases,
  interval = 1.6,
  fade = 0.3,
  className = "",
  onIndexChange,
  intervals,
  paused = false,
  restartKey,
}: {
  phrases: string[];
  // Standaard-tijd (s) dat een zin blijft staan voor de volgende komt.
  interval?: number;
  // Duur (s) van de in-/uit-fade.
  fade?: number;
  className?: string;
  // Vuurt bij elke index-wissel — bv. om de achtergrond mee te laten veranderen.
  onIndexChange?: (index: number) => void;
  // Optioneel: per-zin dwell-tijd (s); valt terug op `interval`. Live wijzigingen
  // herschikken meteen de lopende dwell (handig voor een tuningpaneel).
  intervals?: number[];
  // Pauzeer de auto-cyclus (blijft op de huidige zin staan).
  paused?: boolean;
  // Verander deze waarde om vanaf het begin (index 0) te herstarten.
  restartKey?: number;
}) => {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (phrases.length < 2 || paused) return;
    const delay = (intervals?.[i] ?? interval) * 1000;
    const id = setTimeout(
      () => setI((v) => (v + 1) % phrases.length),
      delay,
    );
    return () => clearTimeout(id);
  }, [i, phrases, interval, intervals, paused]);

  // Herstart naar de eerste zin wanneer restartKey verandert.
  useEffect(() => {
    setI(0);
  }, [restartKey]);

  useEffect(() => {
    onIndexChange?.(i);
  }, [i, onIndexChange]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={i}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: fade, ease: "easeInOut" }}
        className={`whitespace-pre-line ${className}`}
      >
        {phrases[i]}
      </motion.div>
    </AnimatePresence>
  );
};

export default CyclingPhrases;
