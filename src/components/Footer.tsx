import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { pillarContent } from "@/data/pillars";
import type { Pillar } from "@/components/wireframe/WorkThumb";

const EXPERTISE_PILLARS: { label: Pillar; slug: string }[] = [
  { label: "Brand", slug: "brand" },
  { label: "Product", slug: "product" },
  { label: "People", slug: "people" },
  { label: "Marketing", slug: "marketing" },
];

const LOCATIONS = [
  {
    city: "Brigada Antwerp",
    address: "Molenstraat 54",
    zip: "2018 Antwerpen",
  },
  {
    city: "Brigada Gent",
    address: "Amelia Earhartlaan 2 Bus 401",
    zip: "9051 Gent",
  },
  {
    city: "Brigada Brussels",
    address: "Waelhemstraat 77",
    zip: "1030 Schaarbeek",
  },
];

const Footer = () => {
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const wordmarkWrapRef = useRef<HTMLDivElement>(null);
  const socialsRef = useRef<HTMLUListElement>(null);
  const contactColRef = useRef<HTMLDivElement>(null);
  const privacyRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const introStartedRef = useRef(false);

  // Size the wordmark to fit its container. Runs only on mount, on resize,
  // and when fonts finish loading, never during scroll, so the footer's
  // own height stays constant and the page bottom does not drift.
  useEffect(() => {
    const fitWordmark = () => {
      const wm = wordmarkRef.current;
      const wmWrap = wordmarkWrapRef.current;
      if (!wm || !wmWrap) return;
      const cs = window.getComputedStyle(wmWrap);
      const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const cw = wmWrap.clientWidth - padX;
      const probe = 200;
      const N = 7;
      const prev: string[] = [];
      for (let i = 0; i < N; i++) {
        prev.push(wmWrap.style.getPropertyValue(`--wmW${i}`));
        wmWrap.style.setProperty(`--wmW${i}`, "200");
      }
      wm.style.fontSize = `${probe}px`;
      const tw = wm.scrollWidth;
      for (let i = 0; i < N; i++) {
        if (prev[i]) wmWrap.style.setProperty(`--wmW${i}`, prev[i]);
        else wmWrap.style.removeProperty(`--wmW${i}`);
      }
      if (tw > 0 && cw > 0) {
        const next = (cw / tw) * probe;
        wm.style.fontSize = `${next}px`;
      }
    };

    fitWordmark();
    window.addEventListener("resize", fitWordmark);
    // Re-fit once custom fonts have loaded so the measurement uses the
    // final glyph metrics.
    const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
    if (fonts?.ready) {
      fonts.ready.then(fitWordmark).catch(() => {});
    }
    return () => {
      window.removeEventListener("resize", fitWordmark);
    };
  }, []);

  // Scroll-driven reveal: transform + overlay opacity only. Never touches
  // anything that contributes to layout height.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const inner = innerRef.current;
      const overlay = overlayRef.current;
      if (inner) inner.style.transform = "";
      if (overlay) overlay.style.opacity = "0";
      return;
    }

    const update = () => {
      rafRef.current = null;
      const el = footerRef.current;
      const inner = innerRef.current;
      const overlay = overlayRef.current;
      if (!el || !inner) return;
      const vh = window.innerHeight;
      const rect = el.getBoundingClientRect();
      const footerH = Math.max(1, el.offsetHeight);
      const p = Math.max(0, Math.min(1, (vh - rect.top) / footerH));
      const offset = vh * 0.4;
      const y = (1 - p) * -offset;
      inner.style.transform = `translate3d(0, ${y}px, 0)`;
      const pOverlay = Math.max(0, Math.min(1, (vh - rect.top) / vh));
      if (overlay) overlay.style.opacity = String((1 - pOverlay) * 0.6);
    };

    const onScroll = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);


  // Wordmark: render in final serif state with no intro animation.
  useEffect(() => {
    const wrap = wordmarkWrapRef.current;
    if (!wrap) return;
    const N = 7;
    for (let i = 0; i < N; i++) {
      wrap.style.setProperty(`--wmE${i}`, "1");
      wrap.style.setProperty(`--wmR${i}`, "1");
      wrap.style.setProperty(`--wmW${i}`, "200");
    }
  }, []);

  // Rubber-band overscroll at the bottom: when the user scrolls/swipes down
  // past the page bottom, grow the footer Brigada stroke and translate the
  // wordmark up slightly, then spring back.
  useEffect(() => {
    const wrap = wordmarkWrapRef.current;
    if (!wrap) return;

    const N_LETTERS = 7;
    const STROKE_MAX_EM = 0.12;
    const MAX_PULL = 160;
    const TRANSLATE_FACTOR = -0.35; // negative: wordmark moves up on down-pull
    const SPRING_STIFF = 0.18;
    const SPRING_DAMP = 0.72;

    let pull = 0;
    let velocity = 0;
    let touching = false;
    let touchStartY = 0;
    let raf = 0;
    let lastTs = 0;

    const atBottom = () => {
      const doc = document.documentElement;
      return window.scrollY + window.innerHeight >= doc.scrollHeight - 1;
    };

    const writeVars = () => {
      const norm = Math.min(1, pull / MAX_PULL);
      const eased = 1 - Math.pow(1 - norm, 2);
      const strokeEm = STROKE_MAX_EM * eased;
      for (let i = 0; i < N_LETTERS; i++) {
        wrap.style.setProperty(`--wmStrokeEm${i}`, strokeEm.toFixed(4));
      }
      wrap.style.setProperty("--wmPullPx", `${(pull * TRANSLATE_FACTOR).toFixed(2)}px`);
    };

    const animate = (ts: number) => {
      raf = 0;
      const dt = Math.min(64, lastTs ? ts - lastTs : 16);
      lastTs = ts;
      if (touching) {
        writeVars();
        raf = requestAnimationFrame(animate);
        return;
      }
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
      const resistance = 1 - Math.min(0.85, pull / MAX_PULL);
      pull = Math.min(MAX_PULL, pull + amount * resistance);
      kick();
    };

    const onWheel = (e: WheelEvent) => {
      if (!atBottom()) return;
      if (e.deltaY > 0) addPull(e.deltaY * 0.35);
    };
    const onTouchStart = (e: TouchEvent) => {
      if (!atBottom()) return;
      touching = true;
      touchStartY = e.touches[0].clientY;
      kick();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!touching) return;
      const dy = touchStartY - e.touches[0].clientY; // positive when swiping up
      if (dy <= 0 || !atBottom()) return;
      const target = Math.min(MAX_PULL, dy * 0.6);
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


  const wordmarkStyle: React.CSSProperties = {
    fontFamily: '"Brigada Serif", serif',
  };

  return (
    <>
      <footer
        ref={footerRef}
        data-site-footer
        className="relative w-full bg-[#f3f2ef] text-[#2D2928] overflow-hidden"
      >
      <div ref={innerRef} className="will-change-transform">
      <section className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 ws-2">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 md:gap-5 items-start">
          {/* Column 1, row 1: site nav */}
          <div className="md:col-start-1 md:col-span-1 md:row-start-1">
            <p className="font-nav text-[#2D2928]/60 mb-2">WEBSITE</p>
            <ul className="font-meta text-[#2D2928] space-y-1">
              <li><Link to="/" className="hover:opacity-70 transition-opacity">Home</Link></li>
              <li><Link to="/expertise" className="hover:opacity-70 transition-opacity">Expertise</Link></li>
              <li><Link to="/work" className="hover:opacity-70 transition-opacity">Work</Link></li>
              <li><Link to="/about" className="hover:opacity-70 transition-opacity">About</Link></li>
              <li><Link to="/careers" className="hover:opacity-70 transition-opacity">Careers</Link></li>
              <li><Link to="/contact" className="hover:opacity-70 transition-opacity">Contact</Link></li>
            </ul>
          </div>
          {/* Column 1, row 2: socials */}
          <div className="md:col-start-1 md:col-span-1 md:row-start-2 mt-6 md:mt-8">
            <p className="font-nav text-[#2D2928]/60 mb-2">Socials</p>
            <ul ref={socialsRef} className="font-meta text-[#2D2928] space-y-1">
              <li><a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">Instagram</a></li>
              <li><a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">LinkedIn</a></li>
              <li><a href="https://vimeo.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">Vimeo</a></li>
            </ul>
          </div>
          {/* Columns 2-5: deliverables per expertise pillar, two pillars per row */}
          {EXPERTISE_PILLARS.map((p, i) => {
            const placement = [
              "md:col-start-3 md:row-start-1",
              "md:col-start-5 md:row-start-1",
              "md:col-start-3 md:row-start-2 mt-6 md:mt-8",
              "md:col-start-5 md:row-start-2 mt-6 md:mt-8",
            ][i];
            return (
              <div key={p.slug} className={`${placement} md:col-span-2`}>
                <p className="font-nav text-[#2D2928]/60 mb-2">{p.label}</p>
                <ul className="font-meta text-[#2D2928] space-y-1">
                  {pillarContent[p.label].services.slice(0, 5).map((s) => (
                    <li key={s.title}>
                      <Link to={`/expertise/${p.slug}`} className="hover:opacity-70 transition-opacity">
                        {s.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="ws-1">
          <hr className="border-0 border-t border-[#2D2928] m-0" />
          <div className="ws-1" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 md:gap-5 items-start">
          {/* Contact: col 1 row 1, aligned with Antwerp & Brussels */}
          <div ref={contactColRef} className="md:col-start-1 md:col-span-2 md:row-start-1 self-start flex flex-col font-meta text-[#2D2928] md:text-left">
            <p>
              T:{" "}
              <a href="tel:+3200000000000" className="hover:opacity-70 transition-opacity">
                +32 (0)000 00 00 00
              </a>
            </p>
            <p>
              E:{" "}
              <a href="mailto:hello@brigada.be" className="hover:opacity-70 transition-opacity">
                hello@brigada.be
              </a>
            </p>
          </div>

          {/* Locations: Antwerp col 3-4 r1, Gent col 3-4 r2, Brussels col 5-6 r1 */}
          {LOCATIONS.map((loc, i) => {
            const placement = [
              "md:col-start-3 md:row-start-1",
              "md:col-start-3 md:row-start-2 mt-6 md:mt-8",
              "md:col-start-5 md:row-start-1",
            ][i];
            return (
              <div
                key={`${loc.city}-${i}`}
                className={`${placement} md:col-span-2 self-start font-meta text-[#2D2928]`}
              >
                <p>{loc.city}</p>
                <p>{loc.address}</p>
                <p>{loc.zip}</p>
              </div>
            );
          })}

        </div>


      </section>

      <div aria-hidden className="pt-16 md:pt-24" />

      <div
        ref={wordmarkWrapRef}
        aria-label="Brigada"
        className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 flex justify-center"
      >
        <div
          ref={wordmarkRef}
          aria-hidden
          className="inline-flex leading-[0.98] tracking-[-0.03em] whitespace-nowrap text-[#2D2928]"
          style={{
            ...wordmarkStyle,
            fontSize: "12vw",
            paddingTop: "0.08em",
            marginTop: 0,
            paddingBottom: 0,
            marginBottom: 0,
          }}
        >
          {"Brigada".split("").map((ch, i) => (
            <span
              key={i}
              style={{
                display: "inline-block",
                paddingTop: "0.2em",
                marginTop: 0,
                paddingBottom: 0,
                marginBottom: 0,
                clipPath: `inset(calc((1 - var(--wmE${i}, 0)) * (1 - var(--wmR${i}, 0)) * 100% - 0.4em) -0.5em -0.4em -0.5em)`,
                willChange: "clip-path",
              }}
            >
              <span
                style={{
                  fontVariationSettings: `"wght" var(--wmW${i}, 0)`,
                  display: "inline-block",
                  transformOrigin: "bottom center",
                  opacity: `var(--wmE${i}, 0)`,
                  transform: `translateY(calc((1 - var(--wmE${i}, 0)) * 110% + var(--wmPullPx, 0px))) skewY(calc((1 - var(--wmE${i}, 0)) * 8deg))`,
                  filter: `blur(calc((1 - var(--wmE${i}, 0)) * 12px))`,
                  WebkitTextStroke: `calc(var(--wmStrokeEm${i}, 0) * 1em) #2D2928`,
                  paintOrder: "stroke fill",
                  willChange: "transform, opacity, filter",
                }}
              >

                {ch}
              </span>
            </span>
          ))}
        </div>
      </div>

      </div>
      <div
        ref={overlayRef}
        aria-hidden
        data-footer-overlay
        className="pointer-events-none absolute inset-0 bg-[#2D2928] will-change-[opacity]"
        style={{ opacity: 0.6 }}
      />
      </footer>
    </>
  );
};

export default Footer;
