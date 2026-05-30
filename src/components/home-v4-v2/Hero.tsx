import { useEffect, useRef } from "react";

const reelVideo = "/reel.mp4";

const Hero = () => {
  const triggerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const reelRef = useRef<HTMLVideoElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const lastP = useRef(-1);
  const wmBaseFs = useRef(0);
  const wasAtStart = useRef(true);
  const introDoneRef = useRef(false);
  const introWmRef = useRef(0); // 0..1 wordmark intro reveal progress
  const tagHiddenRef = useRef(false);

  const targetRef = useRef(0);
  const valueRef = useRef(0);
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);
  // Duration in ms for a full 0 -> 1 (or 1 -> 0) playthrough.
  const DURATION_MS = 1850;

  // Fit the "Brigada" wordmark to span the full container width at the start frame.
  useEffect(() => {
    const fit = () => {
      const wrap = wrapperRef.current;
      const el = wordmarkRef.current;
      if (!wrap || !el) return;
      const containerW = wrap.clientWidth;
      if (!containerW) return;
      const tag = tagRef.current;
      const inner = tag?.firstElementChild as HTMLElement | null;
      const targetWidth = inner ? inner.getBoundingClientRect().width : containerW;
      if (!targetWidth) return;

      // Measure the actual rendered advance width by temporarily setting a
      // known font-size on the wordmark element itself. This accounts for
      // side bearings and tracking so the rendered box matches targetWidth.
      const probeSize = 400;
      const prevFs = el.style.fontSize;
      el.style.fontSize = `${probeSize}px`;
      const probeW = el.getBoundingClientRect().width;
      el.style.fontSize = prevFs;
      if (!probeW) return;
      const target = (targetWidth / probeW) * probeSize * 1.02;
      wmBaseFs.current = target;
      wrap.style.setProperty("--wmFs", `${target.toFixed(2)}px`);
      wrap.style.setProperty("--wmInkOffset", "0px");
      lastP.current = -1;
      // Notify the scroll effect that wordmark dimensions changed so it can
      // re-derive --sblTy and section height from the now-correct rect.
      window.dispatchEvent(new Event("hero:fit"));
    };

    // Never measure with fallback font metrics: wait for the real fonts to
    // load before the first fit, otherwise --wmFs is computed against the
    // fallback's advance widths and the wordmark + SBL drift out of sync.
    let cancelled = false;
    const runInitialFit = async () => {
      const fonts = (document as any).fonts;
      if (fonts?.ready) {
        try { await fonts.ready; } catch {}
      }
      if (cancelled) return;
      fit();
      // One more pass next frame, after layout settles from the font swap.
      requestAnimationFrame(() => { if (!cancelled) fit(); });
    };
    runInitialFit();

    const onResize = () => {
      // Run synchronously so --wmFs is updated before any other resize
      // listener (e.g. the scroll-effect's measure) reads the wordmark rect.
      fit();
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
    };

  }, []);


  // Intro sequence: cream -> small wordmark -> blurred reel + tagline ->
  // unblur reel -> nav items + big wordmark.
  useEffect(() => {
    const wrap = wrapperRef.current;
    const reel = reelRef.current;
    const tag = tagRef.current;
    if (!wrap || !reel || !tag) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    reel.style.opacity = "0";
    reel.style.filter = "blur(0px)";
    reel.style.transform = "scale(1)";
    tag.style.opacity = "1";
    for (let i = 0; i < 3; i++) wrap.style.setProperty(`--tagE${i}`, "0");
    document.documentElement.classList.add("intro-active");

    let cancelled = false;
    let raf = 0;
    let startTs = 0;


    const T_REEL_IN_START = reduced ? 0 : 350;
    const T_REEL_IN_END = T_REEL_IN_START + (reduced ? 200 : 900);
    // Tagline + big wordmark both start 1s after the reel begins.
    const T_TAG_START = T_REEL_IN_START + (reduced ? 200 : 1000);
    const T_TAG_END = T_TAG_START + (reduced ? 250 : 900);
    const T_UNBLUR_END = T_REEL_IN_END + (reduced ? 200 : 850);
    const T_NAV_REVEAL = T_UNBLUR_END + 50;
    // Phase 1: fade wordmark in (heavily blurred) from opacity 0.
    const T_WM_FADE_START = T_REEL_IN_START;
    const T_WM_FADE_END = T_WM_FADE_START + (reduced ? 200 : 900);
    // Phase 2: camera focus hunt to sharp.
    const T_FOCUS_START = T_WM_FADE_END;
    const T_FOCUS_END = T_FOCUS_START + (reduced ? 200 : 800);

    // Stroke width is a fraction of the wordmark's font size (em), so it
    // scales with both the logo size and the viewport.
    const STROKE_START_EM = 0.02;
    const FILL_RGB = "243,242,239";



    // Preload the real serif so the cross-fade isn't a FOUT.
    if ((document as any).fonts?.load) {
      (document as any).fonts.load('1em "Brigada Serif"').catch(() => {});
    }

    let navDispatched = false;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = () => {
      if (cancelled) return;
      const t = performance.now() - startTs;

      if (t < T_REEL_IN_END) {
        const p = Math.max(0, Math.min(1, (t - T_REEL_IN_START) / (T_REEL_IN_END - T_REEL_IN_START)));
        reel.style.opacity = p.toFixed(3);
      } else {
        reel.style.opacity = "1";
      }

      reel.style.filter = "blur(0px)";
      reel.style.transform = "scale(1)";

      // Tagline word-by-word slide from top, staggered.
      {
        const Nw = 3;
        const spanT = 0.55;
        const strideT = (1 - spanT) / Math.max(1, Nw - 1);
        const pTag = Math.max(0, Math.min(1, (t - T_TAG_START) / (T_TAG_END - T_TAG_START)));
        for (let i = 0; i < Nw; i++) {
          const local = Math.max(0, Math.min(1, (pTag - i * strideT) / spanT));
          const e = reduced ? pTag : easeOutCubic(local);
          wrap.style.setProperty(`--tagE${i}`, e.toFixed(4));
        }
      }

      if (!navDispatched && t >= T_NAV_REVEAL) {
        navDispatched = true;
        window.dispatchEvent(new Event("intro:nav-reveal"));
      }

      // Per-letter stroke shrink, left-to-right with stagger.
      const N_LETTERS = 7; // "Brigada"
      const strideT = 0.06; // small start delay between consecutive letters
      const spanT = Math.max(0.1, 1 - strideT * (N_LETTERS - 1));

      if (t < T_WM_FADE_START) {
        wrap.style.setProperty("--wmOpacity", "0");
        for (let i = 0; i < N_LETTERS; i++) {
          wrap.style.setProperty(`--wmStrokeEm${i}`, `${STROKE_START_EM}`);
        }
        wrap.style.setProperty("--wmFillAlpha", "1");
      } else if (t < T_FOCUS_START) {
        wrap.style.setProperty("--wmOpacity", "1");
        for (let i = 0; i < N_LETTERS; i++) {
          wrap.style.setProperty(`--wmStrokeEm${i}`, `${STROKE_START_EM}`);
        }
        wrap.style.setProperty("--wmFillAlpha", "1");
      } else {
        wrap.style.setProperty("--wmOpacity", "1");
        const pf = Math.max(0, Math.min(1, (t - T_FOCUS_START) / Math.max(1, T_FOCUS_END - T_FOCUS_START)));
        const e = reduced ? 1 : easeOutCubic(pf);
        const stroke = STROKE_START_EM * (1 - e);
        for (let i = 0; i < N_LETTERS; i++) {
          wrap.style.setProperty(`--wmStrokeEm${i}`, stroke.toFixed(4));
        }
        wrap.style.setProperty("--wmFillAlpha", "1");
      }




      if (t < T_FOCUS_END) {
        raf = requestAnimationFrame(tick);
      } else {
        introDoneRef.current = true;
        document.documentElement.classList.remove("intro-active");
        // Drop expensive filter chain once camera-focus intro is done so
        // scroll-driven translateY on the wordmark is cheap to composite.
        wrap.setAttribute("data-wm-focus-done", "1");
      }
    };

    const startWhenReady = () => {
      if (cancelled || startTs) return;
      startTs = performance.now();
      raf = requestAnimationFrame(tick);
    };

    // Wait for the reel to have enough data before kicking off the intro.
    if (reel.readyState >= 2 /* HAVE_CURRENT_DATA */) {
      startWhenReady();
    } else {
      reel.addEventListener("loadeddata", startWhenReady, { once: true });
      reel.addEventListener("canplay", startWhenReady, { once: true });
      // Safety: don't block forever if the video never fires events.
      const safety = window.setTimeout(startWhenReady, 4000);
      return () => {
        cancelled = true;
        cancelAnimationFrame(raf);
        clearTimeout(safety);
        reel.removeEventListener("loadeddata", startWhenReady);
        reel.removeEventListener("canplay", startWhenReady);
        document.documentElement.classList.remove("intro-active");
      };
    }
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("intro-active");
    };
  }, []);


  // Scroll-driven pin: keep the hero stuck while Brigada drifts up to the
  // vertical center of the viewport. translateY = -scrolled pixels (1:1).
  // Section height = 100vh + exactly the distance needed to center the
  // wordmark, so the pin releases the instant it's centered.
  // Scroll-driven pin: keep the hero stuck while Brigada drifts up to the
  // vertical center of the viewport. translateY = -scrolled pixels (1:1).
  // Section height = 100vh + exactly the distance needed to center the
  // wordmark, so the pin releases the instant it's centered.
  useEffect(() => {
    const section = triggerRef.current;
    const wrap = wrapperRef.current;
    if (!section || !wrap) return;

    let shiftRef = 0;
    let revealRef = 0;
    let wordsTopBase = 0;

    // Cache DOM lookups once. Refreshed on resize.
    let wmEl: HTMLElement | null = wrap.querySelector<HTMLElement>("[data-wm]");
    let selectedWorkEl: HTMLElement | null = document.querySelector<HTMLElement>("[data-selected-work]");
    let wordsEl: HTMLElement | null = wrap.querySelector<HTMLElement>("[data-hero-words]");

    // Delta-gate trackers. Initialise to match the resting state we write
    // below, so the first apply() doesn't skip writes via the delta gate.
    let lastShiftPx = 0;
    let lastOverlay = 0;
    let lastHeroMask = -1;
    let lastWords: string | null = "out";
    let lastHide: string | null = null;
    let lastVanish: string | null = null;

    // Reset CSS state on mount so a remount during a deep scroll (router
    // back, BFCache, HMR) can never inherit a mid-scroll snapshot.
    wrap.style.setProperty("--wmShiftPx", "0px");
    wrap.style.setProperty("--wmPullPx", "0px");
    wrap.style.setProperty("--reelOverlay", "0");
    wrap.style.setProperty("--heroBottomPx", `${window.innerHeight}px`);
    wrap.setAttribute("data-words", "out");



    const measure = () => {
      wrap.style.setProperty("--wmShiftPx", "0px");
      lastShiftPx = 0;
      if (!wmEl || !wmEl.isConnected) {
        wmEl = wrap.querySelector<HTMLElement>("[data-wm]");
      }
      if (!wmEl) return;
      const wrapRect = wrap.getBoundingClientRect();
      const r = wmEl.getBoundingClientRect();
      const baseH = wrap.clientHeight || window.innerHeight;
      const localTop = r.top - wrapRect.top;
      const centerY = localTop + r.height / 2;
      const shift = Math.max(0, centerY - baseH / 2);
      shiftRef = shift;
      // SBL resting position: midway between centered Brigada bottom and hero bottom.
      const wmBottomAtCenter = baseH / 2 + r.height / 2;
      wordsTopBase = (wmBottomAtCenter + baseH) / 2;
      revealRef = 0;
      // --sblTy depends only on viewport / wordmark size, not scroll position.
      wrap.style.setProperty("--sblTy", `${wordsTopBase}px`);
      // Hero releases the moment Brigada hits center; SBL scrolls with it.
      section.style.height = `calc(100vh + ${shift}px)`;
    };

    const apply = () => {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = Math.max(1, shiftRef + revealRef);
      const scrolled = Math.min(Math.max(-rect.top, 0), total);

      // Phase A: shift Brigada up to center, fade overlay.
      const pA = shiftRef > 0 ? Math.min(1, scrolled / shiftRef) : 1;

      const nextShiftPx = -pA * shiftRef;
      if (Math.abs(nextShiftPx - lastShiftPx) >= 0.05) {
        lastShiftPx = nextShiftPx;
        wrap.style.setProperty("--wmShiftPx", `${nextShiftPx.toFixed(2)}px`);
      }

      const nextOverlay = Math.round(pA * 0.3 * 1000);
      if (nextOverlay !== lastOverlay) {
        lastOverlay = nextOverlay;
        wrap.style.setProperty("--reelOverlay", (nextOverlay / 1000).toFixed(3));
      }




      // SHARP BEATS LOUD reveal trigger. Treat anything that isn't clearly
      // past the pin as "out" so a remount at scrollY=0 can never inherit
      // the "in" state and leak SBL behind the wordmark.
      let nextWords = lastWords ?? "out";
      if (pA >= 0.999 && window.scrollY > 0) nextWords = "in";
      else if (pA < 0.95) nextWords = "out";
      if (nextWords !== lastWords) {
        lastWords = nextWords;
        wrap.setAttribute("data-words", nextWords);
      }

      // Color mask hand-off: clip-path on the two sbl layers driven by
      // --heroBottomPx scoped to wrap. Delta-gated to whole pixels.
      const wrapTop = rect.top;
      const heroBottom = Math.max(0, Math.min(vh, rect.bottom));
      const wrapH = wrap.clientHeight || vh;
      const heroMask = Math.max(0, Math.min(wrapH, heroBottom - wrapTop));
      const nextMask = Math.round(heroMask);
      if (nextMask !== lastHeroMask) {
        lastHeroMask = nextMask;
        wrap.style.setProperty("--heroBottomPx", `${nextMask}px`);
      }
    };

    // Force scroll-to-0 before measuring so a restored scroll offset (router
    // back, BFCache, HMR) can't bake a mid-scroll state into our refs.
    try { window.scrollTo(0, 0); } catch {}


    // Defer the initial measure until fonts have loaded. Otherwise the
    // wordmark rect we read is sized by the fallback font, and the SBL
    // baseline + section height get pinned to the wrong numbers.
    let cancelled = false;
    const runInitial = async () => {
      const fonts = (document as any).fonts;
      if (fonts?.ready) {
        try { await fonts.ready; } catch {}
      }
      if (cancelled) return;
      try { window.scrollTo(0, 0); } catch {}
      measure();
      apply();
      requestAnimationFrame(() => {
        if (cancelled) return;
        try { window.scrollTo(0, 0); } catch {}
        measure();
        apply();
      });
    };
    runInitial();

    let rafPending = 0;
    const onScroll = () => {
      if (rafPending) return;
      rafPending = requestAnimationFrame(() => {
        rafPending = 0;
        apply();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const onResize = () => {
      // Refresh cached lookups in case DOM has changed.
      wmEl = wrap.querySelector<HTMLElement>("[data-wm]");
      selectedWorkEl = document.querySelector<HTMLElement>("[data-selected-work]");
      measure();
      apply();
    };
    window.addEventListener("resize", onResize);
    // Re-sync whenever the fit effect resizes the wordmark. This is the
    // critical link: --wmFs changes -> wordmark rect changes -> --sblTy and
    // section height must be recomputed from the new rect.
    const onFit = () => {
      wmEl = wrap.querySelector<HTMLElement>("[data-wm]");
      measure();
      apply();
    };
    window.addEventListener("hero:fit", onFit);
    // Re-measure when Brigada's rendered size changes, but ignore RO ticks
    // during the intro animation (which animates --wmFocusScale and would
    // re-fire constantly). The safety timeouts below cover the intro settle.
    let ro: ResizeObserver | undefined;
    if (wmEl && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        if (!introDoneRef.current) return;
        measure();
        apply();
      });
      ro.observe(wmEl);
    }
    // Safety re-measure after intro animation settles.
    const t1 = window.setTimeout(() => { measure(); apply(); }, 1500);
    const t2 = window.setTimeout(() => { measure(); apply(); }, 3000);
    // BFCache / history restore: scroll events may not fire, so re-sync.
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      try { window.scrollTo(0, 0); } catch {}
      measure();
      apply();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => {
      cancelled = true;
      if (rafPending) cancelAnimationFrame(rafPending);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("hero:fit", onFit);
      window.removeEventListener("pageshow", onPageShow);
      ro?.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
    };

  }, []);


  // Rubber-band overscroll at the very top: when the user scrolls/swipes up
  // past scrollY=0, grow the Brigada stroke and translate the wordmark down,
  // then spring back. Time-based, not coupled to actual scroll position.
  useEffect(() => {
    const wrap = wrapperRef.current;
    if (!wrap) return;

    const N_LETTERS = 7;
    const STROKE_MAX_EM = 0.12; // max stroke at full pull
    const MAX_PULL = 160; // px of virtual pull before clamping
    const TRANSLATE_FACTOR = 0.35; // px translateY per px of pull (damped)
    const SPRING_STIFF = 0.18;
    const SPRING_DAMP = 0.72;

    let pull = 0;            // current virtual pull (px), >= 0
    let velocity = 0;        // for spring back
    let touching = false;
    let touchStartY = 0;
    let raf = 0;
    let lastTs = 0;

    const writeVars = () => {
      const norm = Math.min(1, pull / MAX_PULL);
      // ease the visual feel
      const eased = 1 - Math.pow(1 - norm, 2);
      const strokeEm = STROKE_MAX_EM * eased;
      for (let i = 0; i < N_LETTERS; i++) {
        wrap.style.setProperty(`--wmStrokeEm${i}`, strokeEm.toFixed(4));
      }
      wrap.style.setProperty("--wmPullPx", `${(pull * TRANSLATE_FACTOR).toFixed(2)}px`);
    };

    const clear = () => {
      pull = 0;
      velocity = 0;
      writeVars();
    };

    const animate = (ts: number) => {
      raf = 0;
      if (!introDoneRef.current) { clear(); return; }
      const dt = Math.min(64, lastTs ? ts - lastTs : 16);
      lastTs = ts;
      if (touching) {
        writeVars();
        raf = requestAnimationFrame(animate);
        return;
      }
      // Critically-damped-ish spring back to 0.
      const force = -pull * SPRING_STIFF;
      velocity = (velocity + force) * SPRING_DAMP;
      pull = Math.max(0, pull + velocity);
      writeVars();
      if (pull > 0.2 || Math.abs(velocity) > 0.2) {
        raf = requestAnimationFrame(animate);
      } else {
        pull = 0; velocity = 0; lastTs = 0;
        writeVars();
      }
    };

    const kick = () => {
      if (!raf) {
        lastTs = 0;
        raf = requestAnimationFrame(animate);
      }
    };

    const addPull = (amount: number) => {
      if (!introDoneRef.current) return;
      // Rubber-band resistance: harder to pull as you go further.
      const resistance = 1 - Math.min(0.85, pull / MAX_PULL);
      pull = Math.min(MAX_PULL, pull + amount * resistance);
      kick();
    };

    const onWheel = (e: WheelEvent) => {
      if (window.scrollY > 0) return;
      if (e.deltaY < 0) {
        addPull(-e.deltaY * 0.35);
      }
    };
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0) return;
      touching = true;
      touchStartY = e.touches[0].clientY;
      kick();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!touching) return;
      const dy = e.touches[0].clientY - touchStartY;
      if (dy <= 0 || window.scrollY > 0) return;
      const target = Math.min(MAX_PULL, dy * 0.6);
      // ease toward target so it tracks the finger smoothly.
      pull = pull + (target - pull) * 0.6;
      kick();
    };
    const onTouchEnd = () => {
      if (!touching) return;
      touching = false;
      velocity = 0;
      kick();
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);









  return (
    <>
    <section
      ref={triggerRef}
      className="relative z-50 w-full bg-[#f3f2ef]"
              style={{ willChange: "opacity" }}

    >


      <div
        ref={wrapperRef}
        className="sticky top-0 h-screen w-full bg-[#f3f2ef] overflow-hidden"
        style={{ contain: "paint" } as React.CSSProperties}
      >

        <div
          style={{
            paddingLeft: 0,
            paddingRight: 0,
            paddingTop: 0,
            paddingBottom: 0,
          }}
          className="w-full h-screen"
        >
          <div
            className="relative w-full mx-auto overflow-hidden"
            style={{
              height: "100vh",
              backgroundColor: "#f3f2ef",
              transform: "translateZ(0)",
            }}
          >
            {/* Clean reel video */}
            <video
              ref={reelRef}
              src={reelVideo}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
              style={{ willChange: "filter, opacity, transform" }}
            />

            {/* Dark overlay fades in to 30% behind the wordmark */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundColor: "#000",
                opacity: "var(--reelOverlay, 0)",
                transition: "none",
              }}
            />

            {/* Intro tagline: shown over blurred reel during loading sequence.
                Matches the SHARP BEATS LOUD treatment in the page's awards section:
                font-title, uppercase, top-left within the page grid. */}
            <div
              ref={tagRef}
              data-hero-tagline
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 pt-5 flex items-center px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96"
              style={{ opacity: 0, visibility: "hidden" }}
            >
              <div className="grid grid-cols-6 gap-3 md:gap-5 w-full">
                <p className="col-span-2" style={{ fontSize: "clamp(1.5rem, 3vw, 3.5rem)", lineHeight: 1 }}>&nbsp;</p>
                <p className="col-span-2" />
                <p className="col-span-2" />
              </div>
            </div>






            <div
              className="pointer-events-none absolute inset-0 flex items-end justify-center pb-[8vh] px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96"
              style={{ color: "#f3f2ef" }}
            >
              <div
                data-wm
                className="relative"
                style={{
                  transform:
                    "translateY(calc(var(--wmShiftPx, 0px) + var(--wmPullPx, 0px)))",

                  transformOrigin: "center bottom",
                  opacity: "var(--wmOpacity, 0)",
                  willChange: "transform, opacity",
                }}
              >
                <div
                  ref={wordmarkRef}
                  className="leading-[0.98] text-[12vw] tracking-[-0.03em]"
                  style={{
                    fontFamily: '"Brigada Serif", serif',
                    fontSize: "var(--wmFs, 12vw)",
                    paddingTop: "0.08em",
                    marginTop: "-0.08em",
                    paddingBottom: "0.22em",
                    marginBottom: "-0.22em",
                    transition: "none",
                    color: "rgba(243, 242, 239, var(--wmFillAlpha, 1))",
                    paintOrder: "stroke fill",
                  } as React.CSSProperties}
                >
                  {"Brigada".split("").map((c, i) => (
                    <span
                      key={i}
                      style={{
                        WebkitTextStroke: `calc(var(--wmStrokeEm${i}, 0) * 1em) rgb(243, 242, 239)`,
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {(["hero", "body"] as const).map((layer) => (
              <div
                key={layer}
                aria-hidden
                data-sbl-layer
                className="pointer-events-none absolute inset-0 z-[60]"
                style={{
                  color: layer === "hero" ? "#f3f2ef" : "#2D2928",
                  clipPath:
                    layer === "hero"
                      ? "inset(0 0 calc(100vh - var(--heroBottomPx, 100vh)) 0)"
                      : "inset(var(--heroBottomPx, 100vh) 0 0 0)",
                  willChange: "clip-path",
                }}
              >
                <div
                  data-hero-words
                  className="font-hero absolute inset-x-0 top-0 px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96"
                  style={{
                    transform: "translate3d(0, calc(var(--sblTy, 75vh) - 50%), 0)",
                    willChange: "transform",
                  }}
                >
                  <div className="grid grid-cols-6 gap-3 md:gap-5">
                    <span className="col-span-2 text-left">Sharp</span>
                    <span className="col-span-2 text-center">beats</span>
                    <span className="col-span-2 text-right">loud</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* SHARP BEATS LOUD: two stacked copies, masked by the hero's bottom
        edge so the color changes spatially as the hero scrolls past. */}
    <style>{`
      [data-hero-words] span {
        display: inline-block;
        opacity: 0;
        font-variation-settings: "wdth" 120, "wght" 400;
        font-weight: 400;
        letter-spacing: -0.015em;
        will-change: opacity;
      }
      [data-words="in"] [data-hero-words] span {
        animation: sblIn 1100ms cubic-bezier(0.22, 1, 0.36, 1) both;
        opacity: 1;
      }
      [data-words="in"] [data-hero-words] span:nth-child(1) { animation-delay: 0ms; }
      [data-words="in"] [data-hero-words] span:nth-child(2) { animation-delay: 140ms; }
      [data-words="in"] [data-hero-words] span:nth-child(3) { animation-delay: 280ms; }
      @keyframes sblIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      [data-sbl-layer] { opacity: 1; transition: opacity 300ms ease; }
      [data-sbl-hidden="1"] [data-sbl-layer] { opacity: 0; }
      [data-wm-focus-done="1"] [data-wm] { filter: none !important; }

      /* Vanish: Sharp slides right, Loud slides left, beats fades, all fade out.
         Animation is time-based, not scroll-linked. */
      [data-hero-words] span {
        transition: transform 700ms cubic-bezier(0.22, 1, 0.36, 1), opacity 600ms ease;
      }
      [data-sbl-vanish="1"] [data-hero-words] span { opacity: 0 !important; animation: none !important; }
      [data-sbl-vanish="1"] [data-hero-words] span:nth-child(1) { transform: translateX(50%); }
      [data-sbl-vanish="1"] [data-hero-words] span:nth-child(3) { transform: translateX(-50%); }




    `}</style>

    </>
  );
};

export default Hero;
