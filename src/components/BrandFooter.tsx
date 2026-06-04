"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BrigadaWordmark from "@/components/BrigadaWordmark";
import { BrioEffect } from "@/brio-effect";
import { usePageTransition } from "@/components/PageTransition";
import { officeLocations as FALLBACK_LOCATIONS } from "@/data/officeLocations";
import { useSiteChrome } from "@/lib/site-chrome";

// Footer ported from the /concept page — Osmo "Footer Parallax Effect": as the
// footer scrolls in, its inner lifts (yPercent -25→0) and a dark overlay fades
// out (opacity 0.5→0). Underline-on-hover links via [data-underline-link].

gsap.registerPlugin(ScrollTrigger);

const SANS = '"Antarctica", system-ui, sans-serif';

// Bunny.net HLS playlist used as the footer's background video (default).
const FOOTER_HLS_SRC =
  "https://vz-329506f6-bc3.b-cdn.net/64a5b788-c206-4941-8d10-5ff5cd49ab5f/playlist.m3u8";

const COLUMNS = [
  { label: "Pages", links: ["Work", "Expertise", "About", "Careers", "Contact"] },
  { label: "Socials", links: ["LinkedIn", "Instagram"] },
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

// goo-1 "WAVE" reveal values (codrops), tuned on /wave-test.
const GOO_BLUR_START = 50;
const GOO_ALPHA_MUL = 31;
const GOO_ALPHA_OFF = -6;
const GOO_DUR = 2;

// videoSrc — override the background HLS playlist. gooReveal — apply the codrops
// gooey-blur reveal to the wordmark as it scrolls into view (opt-in per page).
// brioPaletteId — when set, replace the HLS video backdrop with the locked
// BrioEffect (palette mode) over the default concept-hero image (opt-in per page).
const BrandFooter = ({
  videoSrc = FOOTER_HLS_SRC,
  gooReveal = true,
  brioPaletteId,
  brioSrc = `/concept-hero.jpg`,
  dark = false,
  light = false,
  lightText = false,
}: { videoSrc?: string; gooReveal?: boolean; brioPaletteId?: string; brioSrc?: string; dark?: boolean; light?: boolean; lightText?: boolean } = {}) => {
  const transitionTo = usePageTransition();
  const chrome = useSiteChrome();
  /** Office cards — Sanity-driven when available, otherwise the hardcoded set. */
  const LOCATIONS = useMemo<{ city: string; address: string; zip: string; phone: string }[]>(() => {
    const sanityLocations = chrome?.locations ?? [];
    const offices =
      sanityLocations.length === 0
        ? FALLBACK_LOCATIONS
        : sanityLocations.map((loc) => ({
            city: loc.city ?? loc.title ?? "",
            address: [loc.street, loc.number].filter(Boolean).join(" "),
            zip: [loc.postalCode, loc.city].filter(Boolean).join(" "),
            phone: loc.phone ?? "",
          }));
    // Always show offices alphabetically by city, regardless of data source.
    return [...offices].sort((a, b) => a.city.localeCompare(b.city));
  }, [chrome?.locations]);
  const footerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
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

  // Attach the Bunny HLS playlist to the background video — hls.js for
  // Chrome/Firefox, native HLS for Safari (same approach as BunnyReelLightbox).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const isSafariNative = !!video.canPlayType("application/vnd.apple.mpegurl");
    if (isSafariNative) {
      video.src = videoSrc;
      video.play?.().catch(() => {});
      return;
    }
    if (Hls.isSupported()) {
      const hls = new Hls({ maxBufferLength: 10 });
      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(videoSrc));
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play?.().catch(() => {});
      });
      return () => {
        try {
          hls.destroy();
        } catch (_) {
          /* noop */
        }
      };
    }
  }, [videoSrc]);

  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const inner = el.querySelector("[data-footer-parallax-inner]");
      const dark = el.querySelector("[data-footer-parallax-dark]");
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: "clamp(top bottom)",
          end: "clamp(top top)",
          scrub: true,
        },
      });
      if (inner) tl.from(inner, { yPercent: -25, ease: "none" });
      if (dark) tl.from(dark, { opacity: 0.5, ease: "none" }, "<");
    }, footerRef);
    return () => ctx.revert();
  }, []);

  // Optional codrops gooey-blur reveal on the wordmark (feGaussianBlur 50→0 +
  // opacity 0→1, ease expo). Plays a bit later (center 75%) so it's better in
  // view, and reverses back to the start state when you scroll back up.
  useEffect(() => {
    if (!gooReveal) return;
    const el = wordmarkRef.current;
    const feBlur = document.querySelector<SVGFEGaussianBlurElement>("#footer-goo feGaussianBlur");
    if (!el || !feBlur) return;
    const vals = { stdDeviation: GOO_BLUR_START };
    feBlur.setAttribute("stdDeviation", String(GOO_BLUR_START));
    el.style.filter = "url(#footer-goo)";
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
  }, [gooReveal]);

  return (
    <div ref={footerRef} data-footer-parallax className="relative z-10 overflow-hidden">
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
        className={`relative flex min-h-screen flex-col justify-between gap-[clamp(48px,8vw,120px)] overflow-hidden px-[clamp(24px,5vw,40px)] pt-[clamp(112px,16vh,180px)] ${dark || lightText ? "text-white" : "text-brigada-black"}`}
        style={{ fontFamily: SANS }}
      >
        {/* Full-bleed backdrop — the footer's background. Content above it uses
            mix-blend-difference so it inverts against the moving footage.
            dark renders a solid black fill; light a solid white fill;
            brioPaletteId swaps the HLS video for the locked BrioEffect. */}
        {dark ? (
          <div className="pointer-events-none absolute inset-0 z-0 bg-brigada-black" aria-hidden />
        ) : light ? (
          <div className="pointer-events-none absolute inset-0 z-0 bg-white" aria-hidden />
        ) : brioPaletteId ? (
          <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
            <BrioEffect
              src={brioSrc}
              mode="palette"
              paletteId={brioPaletteId}
              className="h-full w-full"
            />
          </div>
        ) : (
          <video
            ref={videoRef}
            className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden
          />
        )}

        {/* Link columns — Pages · Socials · Locations · Contact (over the video) */}
        <div className="relative z-10 flex flex-col gap-12 md:flex-row md:gap-10 md:pr-[clamp(48px,6vw,104px)]">
          {COLUMNS.map((col) => {
            const column = (
              <div className={`flex w-full flex-col gap-6 ${colWidth}`}>
                <p className="text-[clamp(12px,1vw,15px)] font-normal opacity-50">
                  {col.label}
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
            // at the same size as the other links, each revealing its address +
            // phone on hover/click. Data from /contact-v2.
            if (col.label === "Contact") {
              return (
                <Fragment key={col.label}>
                  <div className={`flex w-full flex-col gap-6 ${colWidth}`}>
                    <p className="text-[clamp(12px,1vw,15px)] font-normal opacity-50">
                      Locations
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
                            {/* Address + phone reveal (grid-rows 0fr→1fr). */}
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

        {/* goo-1 filter for the optional wordmark "WAVE" reveal */}
        {gooReveal && (
          <svg aria-hidden width="0" height="0" className="absolute">
            <defs>
              <filter id="footer-goo" x="-20%" y="-100%" width="140%" height="300%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="0" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values={`1 0 0 0 0  0 1 0 0 0  1 0 1 0 0  0 0 0 ${GOO_ALPHA_MUL} ${GOO_ALPHA_OFF}`} result="goo" />
                <feComposite in="SourceGraphic" in2="goo" operator="atop" />
              </filter>
            </defs>
          </svg>
        )}
        {/* Logo row — full-width wordmark, bottom clipped off the footer edge */}
        <div ref={wordmarkRef} className={`relative z-10 aspect-[1260/230] w-full overflow-hidden ${light ? "text-brigada-black" : "text-white"}`}>
          <BrigadaWordmark className="block h-auto w-full" />
        </div>
      </footer>
      <div
        data-footer-parallax-dark
        className={`pointer-events-none absolute inset-0 opacity-0 ${light ? "bg-white" : "bg-[#201D1D]"}`}
        aria-hidden
      />
    </div>
  );
};

export default BrandFooter;
