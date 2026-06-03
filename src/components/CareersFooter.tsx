import { Fragment, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BrigadaWordmark from "@/components/BrigadaWordmark";
import { usePageTransition } from "@/components/PageTransition";
import { officeLocations as LOCATIONS } from "@/data/officeLocations";

// Careers footer — same layout/parallax as BrandFooter (Osmo "Footer Parallax
// Effect": inner lifts yPercent -25→0 as it scrolls in), but on a plain black
// background with white text and a white wordmark — no background video, no
// dark overlay. Kept separate so the shared BrandFooter stays untouched.

gsap.registerPlugin(ScrollTrigger);

const SANS = '"Antarctica", system-ui, sans-serif';

const COLUMNS = [
  { label: "Pages", links: ["Work", "Expertise", "About", "Careers", "Contact"] },
  { label: "Socials", links: ["LinkedIn", "Instagram", "X/Twitter"] },
  { label: "Contact", links: ["hello@brigada.be"] },
];

// Internal routes for the "Pages" column (new-style destinations).
const PAGE_ROUTES: Record<string, string> = {
  Work: "/work",
  Expertise: "/expertise",
  About: "/about",
  Careers: "/careers",
  Contact: "/contact",
};

// goo-1 "WAVE" reveal values (codrops), shared with BrandFooter.
const GOO_BLUR_START = 50;
const GOO_ALPHA_MUL = 31;
const GOO_ALPHA_OFF = -6;
const GOO_DUR = 2;

const CareersFooter = () => {
  const transitionTo = usePageTransition();
  const footerRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);

  // Vertical legal strip — measure the email link's top relative to the footer
  // inner so the strip lines up with hello@brigada.be. (Rects, not offsetTop:
  // the email's offsetParent is the positioned columns wrapper, not the footer.)
  const footerInnerRef = useRef<HTMLElement>(null);
  const emailRef = useRef<HTMLAnchorElement>(null);
  const [legalTop, setLegalTop] = useState(0);

  // Office locations — reveal address + phone on hover, or click/tap to pin one.
  const [hoverCity, setHoverCity] = useState<string | null>(null);
  const [pinnedCity, setPinnedCity] = useState<string | null>(null);
  const activeCity = hoverCity ?? pinnedCity;
  // 4 columns: Pages · Socials · Locations · Contact.
  const colWidth = "md:w-1/4";
  useEffect(() => {
    const measure = () => {
      const email = emailRef.current;
      const inner = footerInnerRef.current;
      if (!email || !inner) return;
      setLegalTop(email.getBoundingClientRect().top - inner.getBoundingClientRect().top);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const inner = el.querySelector("[data-footer-parallax-inner]");
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: "clamp(top bottom)",
          end: "clamp(top top)",
          scrub: true,
        },
      });
      if (inner) tl.from(inner, { yPercent: -25, ease: "none" });
    }, footerRef);
    return () => ctx.revert();
  }, []);

  // codrops gooey-blur reveal on the wordmark — plays as it scrolls into view
  // (a bit later, center 85%) and reverses back to the start state on scroll up.
  useEffect(() => {
    const el = wordmarkRef.current;
    const feBlur = document.querySelector<SVGFEGaussianBlurElement>("#careers-footer-goo feGaussianBlur");
    if (!el || !feBlur) return;
    const vals = { stdDeviation: GOO_BLUR_START };
    feBlur.setAttribute("stdDeviation", String(GOO_BLUR_START));
    el.style.filter = "url(#careers-footer-goo)";
    gsap.set(el, { opacity: 0 });
    const ctx = gsap.context(() => {
      gsap
        .timeline({
          defaults: { duration: GOO_DUR, ease: "expo" },
          onUpdate: () => feBlur.setAttribute("stdDeviation", String(vals.stdDeviation)),
          scrollTrigger: {
            trigger: el,
            start: "center 85%",
            toggleActions: "play none none reverse",
          },
        })
        .fromTo(vals, { stdDeviation: GOO_BLUR_START }, { stdDeviation: 0 }, 0)
        .fromTo(el, { opacity: 0 }, { opacity: 1 }, 0);
    }, footerRef);
    return () => {
      ctx.revert();
      el.style.filter = "none";
      gsap.set(el, { opacity: 1 });
    };
  }, []);

  return (
    <div ref={footerRef} data-footer-parallax className="relative z-10 overflow-hidden bg-brigada-black">
      <style>{`
        [data-underline-link] { position: relative; text-decoration: none; }
        [data-underline-link]::before {
          content: ""; position: absolute; bottom: -0.0625em; left: 0;
          width: 100%; height: 0.08em; background-color: currentColor;
          transform: scaleX(0) rotate(0.001deg); transform-origin: right;
          transition: transform 0.6s cubic-bezier(0.625, 0.05, 0, 1);
        }
        @media (hover: hover) and (pointer: fine) {
          [data-underline-link]:hover::before {
            transform-origin: left; transform: scaleX(1) rotate(0.001deg);
          }
        }
        /* Vertical variant — a line running ALONG the text (used by the rotated
           legal strip), revealing on hover via scaleY so it follows the text. */
        [data-underline-vert] { position: relative; text-decoration: none; }
        [data-underline-vert]::before {
          content: ""; position: absolute; top: 0; bottom: 0; left: -0.16em;
          width: 0.08em; background-color: currentColor;
          transform: scaleY(0) rotate(0.001deg); transform-origin: bottom;
          transition: transform 0.6s cubic-bezier(0.625, 0.05, 0, 1);
        }
        @media (hover: hover) and (pointer: fine) {
          [data-underline-vert]:hover::before {
            transform-origin: top; transform: scaleY(1) rotate(0.001deg);
          }
        }
      `}</style>
      <footer
        ref={footerInnerRef}
        data-footer-parallax-inner
        className="relative flex min-h-screen flex-col justify-between gap-[clamp(48px,8vw,120px)] overflow-hidden bg-brigada-black px-[clamp(24px,5vw,40px)] pt-[clamp(112px,16vh,180px)] text-white"
        style={{ fontFamily: SANS }}
      >
        {/* Link columns — Pages · Socials · (Locations) · Contact */}
        <div className="relative z-10 flex flex-col gap-12 md:flex-row md:gap-10 md:pr-[clamp(48px,6vw,104px)]">
          {COLUMNS.map((col) => {
            const column = (
              <div className={`flex w-full flex-col gap-6 ${colWidth}`}>
                <p className="text-[clamp(12px,1vw,15px)] font-normal opacity-50">
                  ( {col.label} )
                </p>
                <div className="flex flex-col items-start gap-3">
                  {col.links.map((l) => {
                    const route = PAGE_ROUTES[l];
                    const cls = "text-[clamp(30px,4.8vw,46px)] leading-none";
                    if (route) {
                      return (
                        <button
                          key={l}
                          type="button"
                          onClick={() => transitionTo(route)}
                          data-underline-link
                          className={`${cls} text-left`}
                        >
                          {l}
                        </button>
                      );
                    }
                    const href = l.includes("@")
                      ? `mailto:${l}`
                      : /^[+\d]/.test(l)
                        ? `tel:${l.replace(/\s/g, "")}`
                        : "#";
                    return (
                      <a
                        key={l}
                        ref={l.includes("@") ? emailRef : undefined}
                        href={href}
                        data-underline-link
                        className={cls}
                      >
                        {l}
                      </a>
                    );
                  })}
                </div>
              </div>
            );

            // Locations is its own column placed just before Contact; city names
            // at the same size as the other links, each revealing its address on
            // hover/click. Data from /contact-v2.
            if (col.label === "Contact") {
              return (
                <Fragment key={col.label}>
                  <div className={`flex w-full flex-col gap-6 ${colWidth}`}>
                    <p className="text-[clamp(12px,1vw,15px)] font-normal opacity-50">
                      ( Locations )
                    </p>
                    <div className="flex flex-col items-start gap-3">
                      {LOCATIONS.map((loc) => {
                        const open = activeCity === loc.city;
                        return (
                          <div
                            key={loc.city}
                            className="w-full"
                            onMouseEnter={() => setHoverCity(loc.city)}
                            onMouseLeave={() => setHoverCity(null)}
                          >
                            <button
                              type="button"
                              aria-expanded={open}
                              onClick={() => setPinnedCity((p) => (p === loc.city ? null : loc.city))}
                              className="text-[clamp(30px,4.8vw,46px)] leading-none text-left"
                            >
                              {loc.city}
                            </button>
                            {/* Address reveal (grid-rows 0fr→1fr). */}
                            <div
                              className={`grid overflow-hidden transition-[grid-template-rows] duration-500 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                            >
                              <div className="overflow-hidden">
                                <div className="pb-1 pt-2 text-[clamp(13px,1vw,15px)] leading-snug opacity-60">
                                  <p>{loc.address}</p>
                                  <p>{loc.zip}</p>
                                  <a
                                    href={`tel:${loc.phone.replace(/\s/g, "")}`}
                                    className="mt-1 block transition-opacity hover:opacity-100"
                                  >
                                    {loc.phone}
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {column}
                </Fragment>
              );
            }

            return <Fragment key={col.label}>{column}</Fragment>;
          })}
        </div>

        {/* Legal — magazine-style vertical strip on the right edge (reads
            top→bottom), its top lined up with hello@brigada.be. */}
        <div
          style={{ top: legalTop, writingMode: "vertical-rl" }}
          className="absolute right-[clamp(12px,2vw,20px)] z-10 flex items-center gap-3 text-[clamp(11px,0.9vw,13px)] tracking-[0.06em] opacity-50"
        >
          <button type="button" onClick={() => transitionTo("/cookies")} data-underline-vert>
            Cookies
          </button>
          <span aria-hidden>|</span>
          <button type="button" onClick={() => transitionTo("/privacy")} data-underline-vert>
            Privacy Policy
          </button>
        </div>

        {/* goo-1 filter for the wordmark "WAVE" reveal */}
        <svg aria-hidden width="0" height="0" className="absolute">
          <defs>
            <filter id="careers-footer-goo" x="-20%" y="-100%" width="140%" height="300%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="0" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values={`1 0 0 0 0  0 1 0 0 0  1 0 1 0 0  0 0 0 ${GOO_ALPHA_MUL} ${GOO_ALPHA_OFF}`} result="goo" />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
          </defs>
        </svg>
        {/* Logo row — full-width white wordmark, bottom clipped off the edge */}
        <div ref={wordmarkRef} className="relative z-10 aspect-[1260/230] w-full overflow-hidden text-white">
          <BrigadaWordmark className="block h-auto w-full" />
        </div>
      </footer>
    </div>
  );
};

export default CareersFooter;
