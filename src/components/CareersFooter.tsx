import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BrigadaWordmark from "@/components/BrigadaWordmark";

// Careers footer — same layout/parallax as BrandFooter (Osmo "Footer Parallax
// Effect": inner lifts yPercent -25→0 as it scrolls in), but on a plain black
// background with white text and a white wordmark — no background video, no
// dark overlay. Kept separate so the shared BrandFooter stays untouched.

gsap.registerPlugin(ScrollTrigger);

const SANS = '"Antarctica", system-ui, sans-serif';

const COLUMNS = [
  { label: "Pages", links: ["Work", "Expertise", "About", "Careers", "Contact"] },
  { label: "Socials", links: ["LinkedIn", "Instagram", "X/Twitter"] },
  { label: "Contact", links: ["hello@brigada.be", "+32 9 123 45 67"] },
];

const CareersFooter = () => {
  const footerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={footerRef} data-footer-parallax className="relative z-10 overflow-hidden bg-black">
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
        className="relative flex min-h-screen flex-col justify-between gap-[clamp(48px,8vw,120px)] overflow-hidden bg-black px-[clamp(24px,5vw,40px)] pt-[clamp(112px,16vh,180px)] text-white"
        style={{ fontFamily: SANS }}
      >
        {/* Link columns */}
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

        {/* Logo row — full-width white wordmark, bottom clipped off the edge */}
        <div className="relative z-10 aspect-[1260/230] w-full overflow-hidden text-white">
          <BrigadaWordmark className="block h-auto w-full" />
        </div>
      </footer>
    </div>
  );
};

export default CareersFooter;
