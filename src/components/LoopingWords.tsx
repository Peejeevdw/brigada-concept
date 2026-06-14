"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

/**
 * Looping Words (Osmo) — React port. A vertical list that auto-cycles through
 * `words` with an elastic snap and a top/bottom fade, looping infinitely by
 * recycling the first item to the end. The original "selector" box is removed.
 *
 * The cycling/recycle JS is preserved verbatim from the Osmo resource; only the
 * init is scoped to this component's ref and reverted on unmount. CSS lives in
 * index.css (.looping-words*); the fade is a mask (to transparent) so it sits
 * over any background. Inherits font-size/colour from the parent.
 */
const LoopingWords = ({
  words,
  className = "",
  interval = 2,
  mode = "slide",
}: {
  words: string[];
  className?: string;
  // Pauze (s) tussen twee woorden — lager = sneller op elkaar volgen.
  interval?: number;
  // "slide" = Osmo elastic vertical slide. "swap" = wisselt op z'n plek (crossfade).
  mode?: "slide" | "swap";
}) => {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const wordList = listRef.current;
    if (!wordList) return;
    const items = Array.from(wordList.children) as HTMLElement[];
    const totalWords = items.length;
    if (totalWords < 4) return; // the recycle buffer needs a few words
    const wordHeight = 100 / totalWords; // offset as a percentage
    let currentIndex = 0;

    const ctx = gsap.context(() => {
      function recycle() {
        if (currentIndex >= totalWords - 3) {
          wordList.appendChild(wordList.children[0]);
          currentIndex--;
          gsap.set(wordList, { yPercent: -wordHeight * currentIndex });
          items.push(items.shift()!);
        }
      }

      function moveWords() {
        currentIndex++;
        if (mode === "swap") {
          // Wisselt op z'n plek: fade uit, spring instant naar het volgende
          // woord (single-slot, dus geen zichtbare verschuiving), fade weer in.
          gsap
            .timeline()
            .to(wordList, { autoAlpha: 0, duration: 0.22, ease: "power1.in" })
            .add(() => {
              gsap.set(wordList, { yPercent: -wordHeight * currentIndex });
              recycle();
            })
            .to(wordList, { autoAlpha: 1, duration: 0.22, ease: "power1.out" });
        } else {
          gsap.to(wordList, {
            yPercent: -wordHeight * currentIndex,
            duration: 1.2,
            ease: "elastic.out(1, 0.85)",
            onComplete: recycle,
          });
        }
      }

      gsap
        .timeline({ repeat: -1, delay: 1 })
        .call(moveWords)
        .to({}, { duration: interval })
        .repeat(-1);
    }, wordList);

    return () => ctx.revert();
  }, [words, interval, mode]);

  return (
    <div className={`looping-words ${className}`}>
      <div className="looping-words__viewport">
        <ul ref={listRef} data-looping-words-list="" className="looping-words__list">
          {words.map((w, i) => (
            <li key={`${w}-${i}`} className="looping-words__item">
              <p className="looping-words__p">{w}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default LoopingWords;
