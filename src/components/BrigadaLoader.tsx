import { useEffect, useRef, useState } from "react";

const TARGET_ID = "brigada-title-target";

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const BrigadaLoader = () => {
  const [mounted, setMounted] = useState(true);

  const overlayRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mounted) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";

    let raf = 0;
    let startTs = 0;
    let exiting = false;
    let exitStart = 0;

    const FADE_IN = reduced ? 200 : 600;
    const MORPH = reduced ? 0 : 2400;
    const HOLD = reduced ? 600 : 700;
    const EXIT = reduced ? 500 : 900;
    const TOTAL_BEFORE_EXIT = FADE_IN + MORPH + HOLD;

    const beginExit = () => {
      if (exiting) return;
      exiting = true;
      exitStart = performance.now();

      const word = wordRef.current;
      const target = document.getElementById(TARGET_ID);
      if (word && target) {
        const wRect = word.getBoundingClientRect();
        const tRect = target.getBoundingClientRect();
        const scale = tRect.height / wRect.height;
        const dx =
          tRect.left + (tRect.width * scale) / 2 - (wRect.left + wRect.width / 2);
        // Account for transform-origin center: translate to align centers vertically too,
        // then we want top-left of word to align with top-left of target.
        const wordCenterX = wRect.left + wRect.width / 2;
        const wordCenterY = wRect.top + wRect.height / 2;
        const targetCenterX = tRect.left + (wRect.width * scale) / 2;
        const targetCenterY = tRect.top + (wRect.height * scale) / 2;
        word.dataset.dx = String(targetCenterX - wordCenterX);
        word.dataset.dy = String(targetCenterY - wordCenterY);
        word.dataset.scale = String(scale);
      }
    };

    const tick = (ts: number) => {
      if (!startTs) startTs = ts;
      const elapsed = ts - startTs;
      const overlay = overlayRef.current;
      const word = wordRef.current;
      const wrap = wrapRef.current;
      if (!overlay || !word || !wrap) {
        raf = requestAnimationFrame(tick);
        return;
      }

      // Phase 1: fade-in
      if (elapsed < FADE_IN) {
        const t = elapsed / FADE_IN;
        wrap.style.opacity = String(t);
        wrap.style.filter = `blur(${(1 - t) * 6}px)`;
        word.style.fontVariationSettings = `"wght" 0`;
      } else if (elapsed < FADE_IN + MORPH) {
        wrap.style.opacity = "1";
        wrap.style.filter = "blur(0px)";
        const t = MORPH === 0 ? 1 : (elapsed - FADE_IN) / MORPH;
        const v = easeInOutCubic(t) * 200;
        word.style.fontVariationSettings = `"wght" ${v}`;
      } else if (elapsed < TOTAL_BEFORE_EXIT) {
        word.style.fontVariationSettings = `"wght" 200`;
      } else {
        if (!exiting) beginExit();
        const t = Math.min(1, (ts - exitStart) / EXIT);
        const eased = easeInOutCubic(t);

        // Wipe upward
        const inset = eased * 100;
        overlay.style.clipPath = `inset(0 0 ${inset}% 0)`;

        // FLIP toward target
        const dx = parseFloat(word.dataset.dx || "0");
        const dy = parseFloat(word.dataset.dy || "0");
        const sc = parseFloat(word.dataset.scale || "1");
        const cs = 1 + (sc - 1) * eased;
        word.style.transform = `translate(${dx * eased}px, ${dy * eased}px) scale(${cs})`;

        if (t >= 1) {
          html.style.overflow = prevOverflow;
          setMounted(false);
          return;
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    const skip = () => {
      if (exiting) return;
      startTs = performance.now() - TOTAL_BEFORE_EXIT;
    };
    // Delay attaching skip listeners so the loader can't be dismissed by stray clicks at mount.
    const skipTimer = window.setTimeout(() => {
      window.addEventListener("keydown", skip);
      window.addEventListener("click", skip);
    }, 400);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(skipTimer);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("click", skip);
      html.style.overflow = prevOverflow;
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] bg-[#f3f2ef] flex items-center justify-center"
      style={{
        clipPath: "inset(0 0 0 0)",
        willChange: "clip-path",
      }}
      aria-hidden
    >
      <div
        ref={wrapRef}
        style={{ opacity: 0, filter: "blur(6px)", willChange: "opacity, filter" }}
      >
        <span
          ref={wordRef}
          style={{
            display: "inline-block",
            fontFamily: '"Brigada Variable", "Brigada Sans", sans-serif',
            fontVariationSettings: '"wght" 0',
            fontSize: "clamp(3rem, 14vw, 16rem)",
            lineHeight: 0.85,
            letterSpacing: "-0.02em",
            color: "#2D2928",
            transformOrigin: "center center",
            willChange: "transform, font-variation-settings",
          }}
        >
          Brigada
        </span>
      </div>
    </div>
  );
};

export default BrigadaLoader;
