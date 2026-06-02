import { motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SiteNav from "@/components/site/SiteNav";
import BrandOrbit from "@/components/BrandOrbit";
import BrandFooter from "@/components/BrandFooter";
import { usePageTransition } from "@/components/PageTransition";

gsap.registerPlugin(ScrollTrigger);

// Brand page — implemented from Figma (node 308:2369), built in the concept-page
// idiom (self-contained, framer-motion, Antarctica, public/ assets via BASE_URL).
// Reel layer and the trailing "Meet the clients" heading are intentionally left
// out for now (design not finalised there).

const SANS = '"Antarctica", system-ui, sans-serif';
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const INK = "#2d2928";

// Brand disciplines list (Figma 308:2434) — each with a short subline. Some
// titles link to a detail page.
const DISCIPLINES = [
  {
    title: "Brand strategy & platforms",
    blurb:
      "A sharp strategy gives brands the story and focus to move with intent, instead of reacting to anything that moves.",
  },
  {
    title: "Naming, verbal & sonic identity",
    blurb:
      "The right name, tone of voice and sound make a brand feel familiar and trusted, even if you haven’t heard from them in a while.",
  },
  {
    title: "Brand identity concept & design",
    blurb:
      "Strong identity design creates recognition through simplicity, giving brands a glowing presence without needing to shout.",
  },
  {
    title: "Motion to spatial identity design",
    blurb:
      "Brands come alive when they move convincingly across time and space, like the real world does.",
  },
  {
    title: "Brand implementation & management",
    blurb:
      "A brand can only gain traction if it is usable and aligned across every channel, tool and touchpoint.",
  },
];
const DISCIPLINE_LINKS: Record<string, string> = {};

// Shared gutter — same as the /concept page so content runs full-bleed (no
// centred max-width), gutters only.
const GUTTER = "px-[clamp(24px,5vw,72px)]";

// Subtle fade-up reveal on scroll into view (concept-style polish).
const Reveal = ({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-10% 0px" }}
    transition={{ duration: 0.7, ease: EASE_OUT, delay }}
  >
    {children}
  </motion.div>
);

const SectionLabel = ({ children }: { children: ReactNode }) => (
  <h2
    className="shrink-0 text-[clamp(18px,1.5vw,22px)] uppercase leading-none"
    style={{ fontWeight: 500 }}
  >
    {children}
  </h2>
);

const Brand = () => {
  const transitionTo = usePageTransition();

  // Scroll-driven background — the page warms from white to #FEECF2 as you scroll
  // through the (white) content block, reaching full tint right as the dark orbit
  // slides over. framer-motion interpolates the hex colour for us.
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollP = useMotionValue(0);
  const bgColor = useTransform(scrollP, [0, 1], ["#FFFFFF", "#FEECF2"]);

  // Smooth scroll — same Lenis setup as /concept, so the orbit + parallax footer
  // glide instead of stepping with the native wheel. ScrollTrigger is kept in
  // sync each frame; the background progress follows the same scroll, and
  // reduced-motion falls back to native scroll.
  useEffect(() => {
    // Progress 0→1 across the white content block (top → orbit entering view).
    const updateProgress = () => {
      const el = contentRef.current;
      const range = el ? el.offsetHeight - window.innerHeight : window.innerHeight;
      scrollP.set(range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0);
    };
    updateProgress();
    window.addEventListener("resize", updateProgress);

    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduce) {
      window.addEventListener("scroll", updateProgress, { passive: true });
      return () => {
        window.removeEventListener("scroll", updateProgress);
        window.removeEventListener("resize", updateProgress);
      };
    }

    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    lenis.on("scroll", updateProgress);
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      window.removeEventListener("resize", updateProgress);
    };
  }, [scrollP]);
  return (
    <motion.main className="min-h-screen w-full" style={{ fontFamily: SANS, backgroundColor: bgColor }}>
      <SiteNav />

      {/* Content — full width (gutters only, no centred max-width), like /concept.
          Its height drives the white→#FEECF2 background progress. */}
      <div ref={contentRef} className="w-full">
        {/* Intro (Figma 308:2631) */}
        <section className={`${GUTTER} pt-[clamp(120px,18vw,250px)]`}>
          <Reveal>
            <p
              className="text-[clamp(20px,2.5vw,36px)] uppercase leading-[0.9] tracking-[-0.02em] text-brigada-black"
              style={{ fontWeight: 500, fontStretch: "125%" }}
            >
              How we move your brand
            </p>
          </Reveal>
          <Reveal delay={0.08} className="mt-[clamp(18px,1.7vw,25px)]">
            <h1
              className="w-full text-[clamp(32px,5.56vw,80px)] leading-[1.06] tracking-[-0.01em] text-brigada-black"
              style={{ fontWeight: 400 }}
            >
              We craft brands. We give them purpose and personality, and we make
              them look, sounds and feel like they&rsquo;ve got a pulse.
            </h1>
          </Reveal>
        </section>

        {/* Disciplines (Figma 308:2633) */}
        <section className={`${GUTTER} pt-[clamp(48px,7vw,96px)]`} style={{ color: INK }}>
          <Reveal>
            <div className="border-t" style={{ borderColor: INK }} />
            <div className="mt-[clamp(20px,2vw,26px)] flex flex-col gap-8 md:flex-row md:justify-between">
              <SectionLabel>Brand</SectionLabel>
              <ul className="w-full text-[clamp(15px,1.25vw,18px)] md:w-[49%]">
                {DISCIPLINES.map((d, i) => {
                  const href = DISCIPLINE_LINKS[d.title];
                  return (
                    <li key={d.title} className={i === 0 ? "" : "mt-[clamp(22px,2.4vw,34px)]"}>
                      {href ? (
                        <button
                          type="button"
                          onClick={() => transitionTo(href)}
                          className="group inline-flex items-center gap-2 text-left leading-[1.25] transition-opacity hover:opacity-60"
                        >
                          <span>{d.title}</span>
                          <span className="relative top-[-2px] inline-block transition-transform duration-300 ease-out group-hover:translate-x-1">
                            →
                          </span>
                        </button>
                      ) : (
                        <span className="leading-[1.25]">{d.title}</span>
                      )}
                      {/* Subtle subline under each discipline */}
                      <p className="mt-[clamp(6px,0.6vw,10px)] max-w-[42ch] text-[clamp(13px,1.05vw,15px)] leading-snug opacity-50">
                        {d.blurb}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Reveal>
        </section>

        {/* Brand contact (Figma 308:2437–2440) */}
        <section
          className={`${GUTTER} pt-[clamp(40px,5vw,72px)] pb-[clamp(80px,12vw,180px)]`}
          style={{ color: INK }}
        >
          <Reveal>
            <div className="border-t" style={{ borderColor: INK }} />
            <div className="mt-[clamp(28px,3vw,42px)] flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
              <SectionLabel>Brand contact</SectionLabel>
              <div className="flex w-full flex-col gap-8 md:w-[49%]">
                <div className="text-[clamp(15px,1.25vw,18px)] leading-[22px]">
                  <p>Mathias is the guy to talk to.</p>
                  <p className="mt-[18px]">Mathias</p>
                  <p>Brand Lead</p>
                  <p>mathias@brigada.be</p>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </div>

      {/* Branding cases — Osmo "Orbit Tiles Infinite Loop" (full-viewport). */}
      <BrandOrbit />

      {/* Footer — parallax reveal, ported from /concept; brio "Red & Pink"
          (palette brio-06) backdrop instead of the HLS video */}
      <BrandFooter brioPaletteId="brio-06" brioSrc={`${import.meta.env.BASE_URL}meetmarcel.jpg`} />
    </motion.main>
  );
};

export default Brand;
