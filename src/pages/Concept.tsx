import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import Lenis from "lenis";

const NAV_ITEMS = [
  { label: "Expertise", items: ["Brand", "Product", "People", "Marketing"] },
  { label: "Work", items: ["Agristo", "BMW", "Telenet", "Politie"] },
  { label: "About", items: ["Studio", "Team", "Culture"] },
  { label: "Careers", items: ["Open roles", "Internships", "Freelance"] },
  { label: "Contact", items: [] as string[] },
];
const TAGLINE = ["Sharp", "Beats", "Loud"];
const PARAGRAPH = [
  "We cut through the noise to",
  "set brands in motion across",
  "everything they do.",
];
const SANS = '"Antarctica", system-ui, sans-serif';

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const Concept = () => {
  // ---- Intro: 0 = blurred + thick stroke · 1 = crisp full logo ----
  const t = useMotionValue(0);
  const [revealed, setRevealed] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const blurPx = useTransform(t, [0, 1], [40, 0], { clamp: true });
  const blur = useTransform(blurPx, (b) => `blur(${b}px)`);
  const strokePx = useTransform(t, [0, 1], [18, 0], { clamp: true });
  const introScale = useTransform(t, [0, 1], [1.06, 1]);
  const bgOpacity = useTransform(t, [0.3, 0.6], [0, 1], { clamp: true });
  const bgScale = useTransform(t, [0.3, 1], [1.08, 1], { clamp: true });

  const run = () => {
    setRevealed(false);
    t.set(0);
    animate(t, 1, { duration: 2.6, ease: EASE_OUT });
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reveal the rest as soon as the logo is essentially sharp.
  useEffect(() => {
    const unsub = t.on("change", (v) => {
      if (v >= 0.78) setRevealed(true);
    });
    return unsub;
  }, [t]);

  // ---- Scroll choreography across the pinned section ----
  // Own scroll-progress motion value (window scroll / max). framer-motion's
  // useScroll was unreliable here (lazy route + sticky), so drive it manually.
  const p = useMotionValue(0);
  const heroRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const setProgress = () => {
      // Progress within the HERO section only — independent of sections below it.
      const el = heroRef.current;
      const range = el ? el.offsetHeight - window.innerHeight : window.innerHeight * 2;
      p.set(range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0);
    };
    setProgress();
    window.addEventListener("resize", setProgress);

    // Respect reduced-motion: skip Lenis, fall back to native scroll.
    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduce) {
      window.addEventListener("scroll", setProgress, { passive: true });
      return () => {
        window.removeEventListener("scroll", setProgress);
        window.removeEventListener("resize", setProgress);
      };
    }

    // Lenis smooths the actual scroll position; progress follows it each frame.
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", setProgress);
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      window.removeEventListener("resize", setProgress);
    };
  }, [p]);
  // Logo + baseline + paragraph move up together as one group (uniform 44vh).
  const groupY = useTransform(p, [0, 0.91], ["0vh", "-64vh"]);
  // Logo fades as it scrolls off the top.
  const logoOpacity = useTransform(p, [0.56, 0.78], [1, 0]);
  // Extra lead so the logo scrolls up a bit faster than the rest of the group.
  const logoLead = useTransform(p, [0, 0.91], ["0vh", "-26vh"]);
  // Paragraph trails the group slightly (counter-offset) so it rises slower.
  const paraLag = useTransform(p, [0, 0.91], ["0vh", "10vh"]);
  // Per-line clip-up reveal, staggered, all done before the cut.
  const line0Y = useTransform(p, [0.22, 0.48], ["115%", "0%"]);
  const line1Y = useTransform(p, [0.36, 0.63], ["115%", "0%"]);
  const line2Y = useTransform(p, [0.5, 0.77], ["115%", "0%"]);
  const lineYs = [line0Y, line1Y, line2Y];

  // One shared font size: scale so the WIDEST line fills the available width
  // (uniform size, left-aligned — shorter lines stay ragged, like the Figma).
  const paraRef = useRef<HTMLDivElement>(null);
  const [paraSize, setParaSize] = useState(96);
  useLayoutEffect(() => {
    const fit = () => {
      const root = paraRef.current;
      if (!root) return;
      const spans = root.querySelectorAll<HTMLElement>("[data-line]");
      if (!spans.length) return;
      const wrap = spans[0].parentElement as HTMLElement;
      const avail = wrap.clientWidth;
      const current = parseFloat(getComputedStyle(spans[0]).fontSize);
      // True text width via Range (block scrollWidth is clamped to clientWidth).
      let maxNatural = 0;
      spans.forEach((s) => {
        const range = document.createRange();
        range.selectNodeContents(s);
        maxNatural = Math.max(maxNatural, range.getBoundingClientRect().width);
      });
      if (maxNatural > 0 && avail > 0) setParaSize((current * avail) / maxNatural);
    };
    fit();
    // Re-measure once the web font has loaded (initial measure may use a fallback).
    if (document.fonts?.ready) document.fonts.ready.then(fit);
    const ro = new ResizeObserver(fit);
    if (paraRef.current) ro.observe(paraRef.current);
    return () => ro.disconnect();
  }, []);
  // Hard cut: only once the group has fully scrolled up (text fully in view),
  // image → white background and text → black, simultaneously.
  const whiteOpacity = useTransform(p, [0.91, 0.935], [0, 1]);
  const textColor = useTransform(p, [0.91, 0.935], ["#ffffff", "#000000"]);

  return (
    <main className="relative bg-black">
      <style>{`
        html.lenis, html.lenis body { height: auto; }
        .lenis.lenis-smooth { scroll-behavior: auto !important; }
        .lenis.lenis-smooth [data-lenis-prevent] { overscroll-behavior: contain; }
        .lenis.lenis-stopped { overflow: hidden; }
        .concept-logo path {
          stroke: #ffffff;
          stroke-width: var(--logo-stroke, 0);
          vector-effect: non-scaling-stroke;
          stroke-linejoin: round;
        }
        .progressive-blur {
          z-index: 40;
          pointer-events: none;
          isolation: isolate;
          contain: paint;
          width: 100%;
          height: 20em;
          transform-style: preserve-3d;
          position: absolute;
          top: 0;
          left: 0;
          overflow: hidden;
          transform: translateZ(0);
        }
        .progressive-blur__layer { width: 100%; height: 100%; position: absolute; }
        .progressive-blur__layer.is--1 {
          -webkit-backdrop-filter: blur(.09375em); backdrop-filter: blur(.09375em);
          -webkit-mask: linear-gradient(to top, #0000 50%, #000 62.5% 75%, #0000 87.5%);
          mask: linear-gradient(to top, #0000 50%, #000 62.5% 75%, #0000 87.5%);
        }
        .progressive-blur__layer.is--2 {
          -webkit-backdrop-filter: blur(.1875em); backdrop-filter: blur(.1875em);
          -webkit-mask: linear-gradient(to top, #0000 62.5%, #000 75% 87.5%, #0000 100%);
          mask: linear-gradient(to top, #0000 62.5%, #000 75% 87.5%, #0000 100%);
        }
        .progressive-blur__layer.is--3 {
          -webkit-backdrop-filter: blur(.375em); backdrop-filter: blur(.375em);
          -webkit-mask: linear-gradient(to top, #0000 75%, #000 87.5% 100%);
          mask: linear-gradient(to top, #0000 75%, #000 87.5% 100%);
        }
        .progressive-blur__layer.is--4 {
          -webkit-backdrop-filter: blur(.75em); backdrop-filter: blur(.75em);
          -webkit-mask: linear-gradient(to top, #0000 82%, #000 92% 100%);
          mask: linear-gradient(to top, #0000 82%, #000 92% 100%);
        }
        .progressive-blur__layer.is--5 {
          -webkit-backdrop-filter: blur(1.5em); backdrop-filter: blur(1.5em);
          -webkit-mask: linear-gradient(to top, #0000 88%, #000 100%);
          mask: linear-gradient(to top, #0000 88%, #000 100%);
        }
      `}</style>

      {/* Navigation — fixed so it persists across sections (doesn't scroll away) */}
      <motion.div
        className="fixed inset-x-0 top-0 z-50"
        initial={{ y: "-100%" }}
        animate={revealed ? { y: "0%" } : { y: "-100%" }}
        transition={{ duration: 0.6, ease: EASE_OUT, delay: revealed ? 0.45 : 0 }}
      >
        <div className="progressive-blur" aria-hidden>
          <div className="progressive-blur__layer is--1" />
          <div className="progressive-blur__layer is--2" />
          <div className="progressive-blur__layer is--3" />
          <div className="progressive-blur__layer is--4" />
          <div className="progressive-blur__layer is--5" />
        </div>
        <motion.nav
          style={{ color: textColor }}
          className="relative z-50 flex h-[72px] items-stretch justify-between px-[clamp(24px,5vw,72px)]"
        >
          {NAV_ITEMS.map((item, i) => {
            const alignRight = i >= NAV_ITEMS.length - 2;
            return (
              <div
                key={item.label}
                className="relative flex items-center"
                onMouseEnter={() => setOpenIdx(i)}
                onMouseLeave={() => setOpenIdx(null)}
              >
                <span
                  className="cursor-pointer text-[14px] uppercase tracking-[0.1em] opacity-90 transition-opacity hover:opacity-100"
                  style={{ fontFamily: SANS }}
                >
                  {item.label}
                </span>
                <AnimatePresence>
                  {openIdx === i && item.items.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.28, ease: EASE_OUT }}
                      className={`absolute top-[calc(100%+8px)] min-w-[200px] rounded-[8px] border border-current/70 bg-current/[0.04] px-4 py-3 backdrop-blur-[18px] ${
                        alignRight ? "right-0" : "left-0"
                      }`}
                    >
                      <ul className="flex flex-col gap-[19px]">
                        {item.items.map((sub) => (
                          <li key={sub}>
                            <a
                              href="#"
                              className="block text-[14px] uppercase leading-[20px] tracking-[1.4px] opacity-90 transition-opacity hover:opacity-60"
                              style={{ fontFamily: SANS }}
                            >
                              {sub}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </motion.nav>
      </motion.div>

      {/* Scroll track — drives the pinned hero through its states */}
      <section ref={heroRef} className="relative" style={{ height: "190vh" }}>
        <div className="sticky top-0 h-screen select-none overflow-hidden bg-black">
          {/* Replay intro — scoped so scrolling/clicking the page never restarts it */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              run();
            }}
            className="absolute bottom-5 right-5 z-30 text-[11px] uppercase tracking-[0.2em] text-white/50 mix-blend-difference transition-colors hover:text-white"
          >
            Replay
          </button>
          {/* Background image */}
          <motion.div className="absolute inset-0 z-0" style={{ opacity: bgOpacity, scale: bgScale }}>
            <img src="/concept-hero.jpg" alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/20" />
          </motion.div>

          {/* White block that overtakes the image near the end */}
          <motion.div
            className="absolute inset-0 z-[5] bg-white"
            style={{ opacity: whiteOpacity }}
            aria-hidden
          />

          {/* Content group — logo + baseline + paragraph scroll up uniformly */}
          <motion.div className="absolute inset-0 z-10" style={{ y: groupY }}>
          {/* Wordmark — centred, scrolls off the top */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              style={{
                filter: blur,
                scale: introScale,
                y: logoLead,
                opacity: logoOpacity,
                "--logo-stroke": strokePx,
              } as CSSProperties}
              className="w-full px-[clamp(24px,5vw,72px)] will-change-[filter,transform]"
            >
              <svg
                className="concept-logo block h-auto w-full"
                viewBox="0 0 1260 340"
                fill="white"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label="Brigada"
              >
                <path d="M1107.05 275.532C1073.5 275.532 1052.56 257.111 1052.56 227.639C1052.56 201.656 1068.85 184.981 1106.66 171.214L1143.89 157.641C1153.39 154.151 1157.85 147.946 1157.85 137.669V131.852C1157.85 110.911 1145.05 99.0829 1122.56 99.0829C1117.52 99.0829 1112.86 99.6646 1108.6 100.828C1095.99 103.93 1092.31 112.462 1095.8 115.564C1102.59 121.381 1104.72 128.362 1104.72 134.954C1104.72 149.303 1094.06 159.58 1079.71 159.58C1066.13 159.58 1053.53 150.272 1053.53 131.27C1053.53 104.9 1078.16 77.7539 1126.05 77.7539C1169.87 77.7539 1198.96 100.634 1198.96 135.148V235.007C1198.96 245.284 1204.58 250.907 1214.27 250.907C1227.65 250.907 1236.77 239.66 1236.77 223.567V170.632C1236.77 166.948 1238.9 164.815 1242.58 164.815H1253.25C1256.93 164.815 1259.06 166.754 1259.06 170.632V223.567C1259.06 254.591 1238.12 275.532 1208.07 275.532C1192.36 275.532 1179.57 269.715 1171.42 260.02C1165.02 251.682 1162.31 250.519 1155.72 257.111C1143.69 268.939 1127.02 275.532 1107.05 275.532ZM1099.48 234.425C1099.48 246.835 1107.43 254.203 1120.62 254.203C1143.31 254.203 1157.85 232.292 1157.85 196.809V196.227C1157.85 183.236 1149.9 177.806 1137.88 182.266L1115.97 190.216C1105.11 194.288 1099.48 202.626 1099.48 214.841V234.425Z" />
                <path d="M938.423 275.532C893.051 275.532 859.118 233.068 859.118 176.449C859.118 120.024 893.051 77.7539 938.423 77.7539C949.863 77.7539 960.334 80.2746 970.029 85.316C982.245 91.5208 989.031 89.3879 989.031 75.621V48.6689C989.031 37.2288 982.826 31.2179 971.58 31.2179H958.007C954.323 31.2179 952.19 29.085 952.19 25.4009V15.7059C952.19 11.8279 954.323 9.8889 958.007 9.8889H982.051C990.001 9.8889 995.818 8.72549 1003.38 6.0109L1016.95 1.16339C1019.47 0.193886 1021.61 0 1024.13 0H1024.32C1028.01 0 1030.14 1.939 1030.14 5.81699V238.885C1030.14 246.059 1035.57 250.907 1043.52 250.907C1053.79 250.907 1060.19 241.793 1060.19 227.445V219.301C1060.19 215.423 1062.33 213.484 1066.01 213.484H1076.67C1080.36 213.484 1082.49 215.423 1082.49 219.301V227.445C1082.49 255.948 1064.07 275.532 1037.31 275.532C1022.19 275.532 1009.78 270.103 1001.83 260.602C995.43 252.264 992.134 251.294 984.184 258.275C971.386 269.133 955.68 275.532 938.423 275.532ZM939.781 254.203C971.968 254.203 996.399 220.852 996.399 176.643C996.399 132.434 971.968 99.0829 939.781 99.0829C920.003 99.0829 907.981 111.686 907.981 132.24V221.046C907.981 241.599 920.003 254.203 939.781 254.203Z" />
                <path d="M744.517 275.532C710.972 275.532 690.031 257.111 690.031 227.639C690.031 201.656 706.319 184.981 744.129 171.214L781.358 157.641C790.859 154.151 795.319 147.946 795.319 137.669V131.852C795.319 110.911 782.522 99.0829 760.029 99.0829C754.988 99.0829 750.334 99.6646 746.068 100.828C733.465 103.93 729.781 112.462 733.271 115.564C740.057 121.381 742.19 128.362 742.19 134.954C742.19 149.303 731.526 159.58 717.177 159.58C703.604 159.58 691.001 150.272 691.001 131.27C691.001 104.9 715.626 77.7539 763.519 77.7539C807.341 77.7539 836.426 100.634 836.426 135.148V235.007C836.426 245.284 842.049 250.907 851.744 250.907C865.123 250.907 874.236 239.66 874.236 223.567V170.632C874.236 166.948 876.369 164.815 880.053 164.815H890.718C894.402 164.815 896.535 166.754 896.535 170.632V223.567C896.535 254.591 875.594 275.532 845.539 275.532C829.833 275.532 817.036 269.715 808.892 260.02C802.493 251.682 799.779 250.519 793.186 257.111C781.164 268.939 764.489 275.532 744.517 275.532ZM736.955 234.425C736.955 246.835 744.905 254.203 758.09 254.203C780.776 254.203 795.319 232.292 795.319 196.809V196.227C795.319 183.236 787.369 177.806 775.347 182.266L753.437 190.216C742.578 194.288 736.955 202.626 736.955 214.841V234.425Z" />
                <path d="M590.302 339.325C536.785 339.325 503.822 321.874 503.822 292.789C503.822 281.931 508.088 272.817 516.232 265.837C523.794 259.244 524.182 255.56 519.334 247.029C516.426 241.405 514.681 235.007 514.681 228.414C514.681 214.647 521.855 203.401 533.877 196.615C543.184 191.379 543.766 189.052 536.204 181.49C525.927 171.02 520.11 157.447 520.11 141.547C520.11 105.094 552.103 77.7539 594.374 77.7539C599.027 77.7539 603.681 78.1417 607.947 78.7234C618.805 80.2746 624.428 76.9783 628.694 66.5076C639.358 40.9129 661.463 29.085 680.853 29.085C701.019 29.085 711.101 41.4946 711.101 55.2615C711.101 69.2223 700.631 79.499 686.282 79.499C679.496 79.499 673.097 76.9783 666.698 71.3552C660.687 65.926 652.156 67.0894 648.084 76.9783C647.696 78.1417 647.308 79.3051 646.92 80.4685C644.012 89.5818 648.084 95.5927 654.095 102.767C663.402 113.625 669.025 127.392 669.025 142.71C669.025 179.551 637.032 207.473 594.568 207.473H561.604C552.103 207.473 545.511 213.096 545.511 221.24C545.511 229.384 552.103 234.813 561.604 234.813H630.245C663.402 234.813 685.507 253.427 685.507 281.931C685.507 318.578 648.666 339.325 590.302 339.325ZM594.568 186.144C611.243 186.144 622.683 175.286 622.683 160.161V125.259C622.683 109.747 611.243 99.0829 594.568 99.0829C577.892 99.0829 566.452 109.747 566.452 125.259V160.161C566.452 175.286 577.892 186.144 594.568 186.144ZM535.622 295.504C535.622 309.658 556.175 317.996 591.659 317.996C633.735 317.996 658.167 306.362 658.167 287.166C658.167 276.501 650.411 269.715 638.001 269.715H557.727C544.541 269.715 535.622 277.277 535.622 288.523V295.504Z" />
                <path d="M490.711 263.898C490.711 267.582 488.578 269.715 484.894 269.715H400.16C396.476 269.715 394.343 267.776 394.343 263.898V254.203C394.343 250.325 396.476 248.386 400.16 248.386H432.153C443.399 248.386 449.604 242.181 449.604 230.935V133.015C449.604 120.024 441.654 114.401 429.633 118.861L404.619 127.974C400.548 129.331 398.027 127.586 398.027 123.127V112.656C398.027 109.166 399.578 107.033 402.68 105.869L477.526 78.7235C480.047 77.754 482.179 77.5601 484.7 77.5601H484.894C488.578 77.5601 490.711 79.4991 490.711 83.3771V263.898ZM470.352 62.048C453.288 62.048 441.46 50.8019 441.46 34.3204C441.46 17.8389 453.288 6.59265 470.352 6.59265C487.415 6.59265 499.243 17.8389 499.243 34.3204C499.243 50.8019 487.415 62.048 470.352 62.048Z" />
                <path d="M253.945 269.715C250.261 269.715 248.128 267.776 248.128 263.898V254.203C248.128 250.325 250.261 248.386 253.945 248.386H267.518C278.764 248.386 284.969 242.181 284.969 230.935V126.229C284.969 114.983 278.764 108.778 267.518 108.778H253.945C250.261 108.778 248.128 106.645 248.128 102.961V93.266C248.128 89.388 250.261 87.449 253.945 87.449H277.989C285.938 87.449 291.755 86.2856 299.318 83.571L312.891 78.7235C315.411 77.754 317.544 77.5601 320.065 77.5601H320.259C323.943 77.5601 326.076 79.4991 326.076 83.3771C326.076 97.5318 331.117 98.5013 342.363 89.5819C352.058 81.8259 363.498 77.754 376.49 77.754C406.932 77.754 425.74 100.828 425.74 125.841C425.74 146.395 412.943 155.702 398.4 155.702C383.276 155.702 372.806 145.425 372.806 131.076C372.806 124.484 375.132 117.503 381.725 111.686C386.185 107.808 386.185 102.185 380.949 100.44C378.041 99.6647 374.939 99.083 371.448 99.083C342.751 99.083 326.076 133.015 326.076 190.216V230.935C326.076 242.181 332.281 248.386 343.527 248.386H374.745C378.429 248.386 380.562 250.325 380.562 254.203V263.898C380.562 267.582 378.429 269.715 374.745 269.715H253.945Z" />
                <path d="M157.835 269.715H5.817C2.1329 269.715 0 267.776 0 263.898V254.203C0 250.325 2.1329 248.386 5.817 248.386H30.4423C41.6885 248.386 47.8933 242.181 47.8933 230.935V48.6689C47.8933 37.4227 41.6885 31.2179 30.4423 31.2179H5.817C2.1329 31.2179 0 29.085 0 25.4009V15.7059C0 11.8279 2.1329 9.88892 5.817 9.88892H146.782C197.196 9.88892 232.486 36.0654 232.486 73.4881C232.486 93.6537 222.403 110.911 205.34 122.739C195.645 129.525 195.839 132.822 206.504 137.863C233.068 150.273 249.937 173.153 249.937 200.493C249.937 241.406 212.321 269.715 157.835 269.715ZM149.109 248.386C178.97 248.386 197.584 231.129 197.584 203.789V189.053C197.584 161.713 178.97 144.456 149.109 144.456H110.911C99.6646 144.456 93.4598 150.466 93.4598 161.907V230.935C93.4598 242.375 99.6646 248.386 110.911 248.386H149.109ZM93.4598 105.676C93.4598 117.116 99.6646 123.127 110.911 123.127H142.323C166.754 123.127 182.072 108.584 182.072 85.316V69.0284C182.072 45.7604 166.754 31.2179 142.323 31.2179H110.911C99.6646 31.2179 93.4598 37.2288 93.4598 48.6689V105.676Z" />
              </svg>
            </motion.div>
          </div>

          {/* Tagline — SHARP · BEATS · LOUD (sits above the paragraph) */}
          <motion.div
            style={{ color: textColor }}
            className="absolute inset-x-0 top-[76vh] flex justify-between px-[clamp(24px,5vw,72px)]"
          >
            {TAGLINE.map((word, i) => (
              <motion.span
                key={word}
                className="text-[clamp(20px,2.5vw,36px)] uppercase tracking-[-0.015em]"
                style={{ fontFamily: SANS, fontStretch: "125%" }}
                initial={{ opacity: 0, y: 24 }}
                animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
                transition={{ duration: 0.55, ease: EASE_OUT, delay: revealed ? 0.05 + i * 0.12 : 0 }}
              >
                {word}
              </motion.span>
            ))}
          </motion.div>

          {/* Paragraph — trails the group, revealed line by line (uniform size) */}
          <motion.div
            ref={paraRef}
            style={{ y: paraLag, color: textColor }}
            className="absolute inset-x-0 top-[76vh] px-[clamp(24px,5vw,72px)]"
          >
            {PARAGRAPH.map((line, i) => (
              <div key={line} className="overflow-hidden">
                <motion.span
                  data-line
                  style={{ y: lineYs[i], fontFamily: SANS, fontSize: `${paraSize}px` }}
                  className="block whitespace-nowrap pb-[0.06em] font-light leading-[1.0] tracking-[-0.02em]"
                >
                  {line}
                </motion.span>
              </div>
            ))}
          </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Next section — full-bleed background video */}
      <section className="relative min-h-screen overflow-hidden bg-black">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src="/brio-export-loop.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
        <div className="absolute inset-0 bg-black/35" />
        <div className="relative z-10 flex min-h-screen flex-col justify-end px-[clamp(24px,5vw,72px)] pb-[12vh]">
          <h2
            className="max-w-[16ch] text-[clamp(36px,6vw,104px)] font-light leading-[1.02] tracking-[-0.02em] text-white"
            style={{ fontFamily: SANS }}
          >
            Work that moves.
          </h2>
        </div>
      </section>
    </main>
  );
};

export default Concept;
