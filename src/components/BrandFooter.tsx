import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BrigadaWordmark from "@/components/BrigadaWordmark";

// Footer ported from the /concept page — Osmo "Footer Parallax Effect": as the
// footer scrolls in, its inner lifts (yPercent -25→0) and a dark overlay fades
// out (opacity 0.5→0). Underline-on-hover links via [data-underline-link].

gsap.registerPlugin(ScrollTrigger);

const SANS = '"Antarctica", system-ui, sans-serif';

// Bunny.net HLS playlist used as the footer's background video.
const FOOTER_HLS_SRC =
  "https://vz-329506f6-bc3.b-cdn.net/64a5b788-c206-4941-8d10-5ff5cd49ab5f/playlist.m3u8";

const COLUMNS = [
  { label: "Pages", links: ["Work", "Expertise", "About", "Careers", "Contact"] },
  { label: "Socials", links: ["LinkedIn", "Instagram", "X/Twitter"] },
  { label: "Contact", links: ["hello@brigada.be", "+32 9 123 45 67"] },
];

const BrandFooter = () => {
  const footerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Attach the Bunny HLS playlist to the background video — hls.js for
  // Chrome/Firefox, native HLS for Safari (same approach as BunnyReelLightbox).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const isSafariNative = !!video.canPlayType("application/vnd.apple.mpegurl");
    if (isSafariNative) {
      video.src = FOOTER_HLS_SRC;
      video.play?.().catch(() => {});
      return;
    }
    if (Hls.isSupported()) {
      const hls = new Hls({ maxBufferLength: 10 });
      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(FOOTER_HLS_SRC));
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
  }, []);

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
      `}</style>
      <footer
        data-footer-parallax-inner
        className="relative flex min-h-screen flex-col justify-between gap-[clamp(48px,8vw,120px)] overflow-hidden px-[clamp(24px,5vw,40px)] pt-[clamp(112px,16vh,180px)] text-black"
        style={{ fontFamily: SANS }}
      >
        {/* Full-bleed background video — the footer's backdrop. Content above it
            uses mix-blend-difference so it inverts against the moving footage. */}
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

        {/* Link columns — over the video */}
        <div className="relative z-10 flex flex-col gap-12 md:flex-row md:gap-10">
          {COLUMNS.map((col) => (
            <div key={col.label} className="flex w-full flex-col gap-6 md:w-1/3">
              <p className="text-[clamp(15px,1.4vw,21px)] font-semibold opacity-50">
                ( {col.label} )
              </p>
              <div className="flex flex-col items-start gap-1">
                {col.links.map((l) => (
                  <a
                    key={l}
                    href="#"
                    data-underline-link
                    className="text-[clamp(28px,4.5vw,44px)] leading-none"
                  >
                    {l}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Logo row — full-width wordmark, bottom clipped off the footer edge */}
        <div className="relative z-10 aspect-[1260/230] w-full overflow-hidden text-white">
          <BrigadaWordmark className="block h-auto w-full" />
        </div>
      </footer>
      <div
        data-footer-parallax-dark
        className="pointer-events-none absolute inset-0 bg-[#201D1D] opacity-0"
        aria-hidden
      />
    </div>
  );
};

export default BrandFooter;
