"use client";

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

export interface ServicesOverviewData {
  page?: {
    hero?: { eyebrow?: string | null; title?: string | null; intro?: string | null } | null;
    pillars?: ServicesOverviewPillar[] | null;
  } | null;
  pillars?: ServicesOverviewPillar[] | null;
}

export interface ServicesOverviewPillar {
  _id?: string;
  name?: string | null;
  slug?: string | null;
  intro?: string | null;
  brioPaletteId?: string | null;
}

// Services overview — the four domains (Brand / Product / People / Marketing)
// under one roof, built in the /brand idiom on the shared site foundation
// (SiteNav, Reveal, SectionLabel, useLenis, the .font-* roles + tokens). Hero
// + pillar order all come from the serviceIndexPage Sanity doc.

const Services = ({ data }: { data?: ServicesOverviewData | null } = {}) => {
  const transitionTo = usePageTransition();
  const eyebrow = data?.page?.hero?.eyebrow ?? "";
  const title = data?.page?.hero?.title ?? "";
  const intro = data?.page?.hero?.intro ?? "";
  // Prefer the curated page.pillars order; fall back to the dataset-wide list.
  const pillars = data?.page?.pillars?.length ? data.page.pillars : (data?.pillars ?? []);

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
            <p className="font-eyebrow text-brigada-black max-md:text-[16px]">{eyebrow}</p>
          </Reveal>
          <Reveal delay={0.08} className="mt-[clamp(18px,1.7vw,25px)]">
            <h1 className="font-display w-full text-brigada-black max-md:text-[40px] max-md:leading-[1.05]">{title}</h1>
          </Reveal>
          {intro && (
            <Reveal delay={0.16} className="mt-[clamp(20px,2vw,32px)] max-w-[60ch]">
              <p className="font-body text-[clamp(18px,1.5vw,22px)] leading-[1.4] max-md:leading-[1.6] text-brigada-black">
                {intro}
              </p>
            </Reveal>
          )}
        </section>

        {/* The four domains — one row per pillar. On desktop the whole row is a
            link with an Osmo directional-hover fill (black tile from the cursor
            edge, text → white); the "(More)" affordance shows on touch only. */}
        <section
          className="pt-[clamp(56px,8vw,112px)]"
          style={{ color: INK.dark }}
        >
          <div ref={rowsRef} data-directional-hover data-type="y">
            {pillars.map((p, i) => {
              const href = p.slug ? `/${p.slug}` : "#";
              const label = p.name ?? p.slug ?? "";
              return (
                <Reveal key={p._id ?? p.slug ?? `p${i}`} delay={i === 0 ? 0 : 0.04}>
                  <div
                    data-directional-hover-item
                    role="link"
                    tabIndex={0}
                    aria-label={`${label} — more`}
                    onClick={() => transitionTo(href)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        transitionTo(href);
                      }
                    }}
                    className="group relative block w-full cursor-pointer overflow-hidden border-t py-[clamp(36px,4.5vw,64px)] mt-[clamp(28px,3vw,42px)] first:mt-0 text-left transition-colors duration-500 [@media(hover:hover)]:hover:text-white"
                    style={{
                      borderColor: INK.dark,
                      paddingLeft: "calc(clamp(24px,5vw,72px) + clamp(8px,1.2vw,18px))",
                      paddingRight: "calc(clamp(24px,5vw,72px) + clamp(8px,1.2vw,18px))",
                    }}
                  >
                    <div
                      data-directional-hover-tile
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-brigada-black"
                    />
                    <div className="relative z-10 flex flex-col gap-6 md:flex-row md:justify-between">
                      <SectionLabel>{label}</SectionLabel>
                      <div className="w-full md:w-[49%]">
                        <p className="font-body max-md:leading-[1.5]">{p.intro ?? ""}</p>
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

export default Services;