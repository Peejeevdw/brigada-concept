import { motion, useMotionValue, useTransform } from "framer-motion";
import { useRef } from "react";
import { useLenis } from "@/hooks/useLenis";
import { useDirectionalHover } from "@/hooks/useDirectionalHover";
import { usePageTransition } from "@/components/PageTransition";
import SiteNav from "@/components/site/SiteNav";
import Reveal from "@/components/site/Reveal";
import SectionLabel from "@/components/site/SectionLabel";
import BrandFooter from "@/components/BrandFooter";
import { EASE_OUT, GUTTER, INK } from "@/lib/siteTokens";
import { pillarContent } from "@/data/pillars";
import type { Pillar } from "@/components/wireframe/WorkThumb";

// Expertise overview — the four domains (Brand / Product / People / Marketing)
// under one roof, built in the /brand idiom on the shared site foundation
// (SiteNav, Reveal, SectionLabel, useLenis, the .font-* roles + tokens). First
// page assembled entirely from reusable pieces rather than copy-paste.

// Display order + where each pillar's "(more)" link goes. Brand has its own
// new-style page (/brand); the others fall back to their existing detail pages
// until a new-style version exists.
const PILLARS: { label: Pillar; to: string }[] = [
  { label: "Brand", to: "/brand" },
  { label: "Marketing", to: "/marketing" },
  { label: "People", to: "/people" },
  { label: "Product", to: "/product" },
];

const ExpertiseV2 = () => {
  const transitionTo = usePageTransition();

  // Scroll-driven background — warms from white to a soft paper tint across the
  // content block, the way /brand warms toward its pink before the footer.
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollP = useMotionValue(0);
  const bgColor = useTransform(scrollP, [0, 1], ["#FFFFFF", "#F6F1EA"]);

  // Osmo directional-hover on the pillar rows (tile fills from the cursor edge).
  const rowsRef = useRef<HTMLDivElement>(null);
  useDirectionalHover(rowsRef);

  useLenis(() => {
    const el = contentRef.current;
    const range = el ? el.offsetHeight - window.innerHeight : window.innerHeight;
    scrollP.set(range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0);
  });

  return (
    <motion.main
      className="min-h-screen w-full"
      style={{ backgroundColor: bgColor }}
    >
      <SiteNav homePath="/concept" />

      {/* Content — full width (gutters only). Its height drives the bg tint. */}
      <div ref={contentRef} className="w-full">
        {/* Intro */}
        <section className={`${GUTTER} pt-[clamp(120px,18vw,250px)]`}>
          <Reveal>
            <p className="font-eyebrow text-brigada-black">
              Our services
            </p>
          </Reveal>
          <Reveal delay={0.08} className="mt-[clamp(18px,1.7vw,25px)]">
            <h1 className="font-display w-full text-brigada-black">
              To make sharp decisions, you need to see the bigger picture &mdash;
              so we bring brand, product, people and marketing under one roof.
            </h1>
          </Reveal>
        </section>

        {/* The four domains — one row per pillar. On desktop the whole row is a
            link with an Osmo directional-hover fill (black tile from the cursor
            edge, text → white); the "(More)" affordance shows on touch only. */}
        <section
          className="pt-[clamp(56px,8vw,112px)]"
          style={{ color: INK.dark }}
        >
          <div ref={rowsRef} data-directional-hover data-type="y">
            {PILLARS.map((p, i) => {
              const content = pillarContent[p.label];
              return (
                <Reveal key={p.label} delay={i === 0 ? 0 : 0.04}>
                  <div
                    data-directional-hover-item
                    role="link"
                    tabIndex={0}
                    aria-label={`${p.label} — more`}
                    onClick={() => transitionTo(p.to)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        transitionTo(p.to);
                      }
                    }}
                    className="group relative block w-full cursor-pointer overflow-hidden border-t py-[clamp(36px,4.5vw,64px)] mt-[clamp(28px,3vw,42px)] first:mt-0 text-left transition-colors duration-500 hover:text-white"
                    style={{
                      borderColor: INK.dark,
                      // Full-bleed row; text keeps its exact position = the old
                      // section gutter + the row's old inner padding.
                      paddingLeft: "calc(clamp(24px,5vw,72px) + clamp(8px,1.2vw,18px))",
                      paddingRight: "calc(clamp(24px,5vw,72px) + clamp(8px,1.2vw,18px))",
                    }}
                  >
                    {/* Directional fill tile — slides in from the cursor edge. */}
                    <div
                      data-directional-hover-tile
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-brigada-black"
                    />
                    <div className="relative z-10 flex flex-col gap-6 md:flex-row md:justify-between">
                      <SectionLabel>{p.label}</SectionLabel>
                      <div className="w-full md:w-[49%]">
                        <p className="font-body">{content.intro}</p>
                        <span className="mt-6 inline-flex items-center gap-2 text-[clamp(15px,1.25vw,18px)] md:hidden">
                          <span className="link-underline">(More)</span>
                          <span>&rarr;</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>
      </div>

      {/* Parallax footer — brio "Pink & Yellow" (brio-01) backdrop + wordmark. */}
      <BrandFooter brioPaletteId="brio-01" />
    </motion.main>
  );
};

export default ExpertiseV2;
