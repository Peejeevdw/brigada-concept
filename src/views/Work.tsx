"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { useRef } from "react";
import { useLenis } from "@/hooks/useLenis";
import SiteNav from "@/components/site/SiteNav";
import Reveal from "@/components/site/Reveal";
import WorkFilter from "@/components/WorkFilter";
import BrandFooter from "@/components/BrandFooter";
import { GUTTER } from "@/lib/siteTokens";

// Work page — "Meet the clients" overview, built on the shared site foundation
// (SiteNav, Reveal, useLenis, the .font-* roles + tokens) in the /brand idiom.
// Starting with the intro hero; sections to follow.

const WorkV2 = () => {
  // Scroll-driven background — warms from white to a soft paper tint across the
  // content block, the way the sibling pages warm toward the footer.
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollP = useMotionValue(0);
  const bgColor = useTransform(scrollP, [0, 1], ["#FFFFFF", "#F6F1EA"]);

  useLenis(() => {
    const el = contentRef.current;
    const range = el ? el.offsetHeight - window.innerHeight : window.innerHeight;
    scrollP.set(range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0);
  });

  return (
    <motion.main className="min-h-screen w-full" style={{ backgroundColor: bgColor }}>
      <SiteNav homePath="/concept" />

      {/* Content — full width (gutters only). Its height drives the bg tint. */}
      <div ref={contentRef} className="w-full">
        {/* Intro */}
        <section className={`${GUTTER} pt-[clamp(120px,18vw,250px)]`}>
          <Reveal>
            <p className="font-eyebrow text-brigada-black">Meet the clients</p>
          </Reveal>
          <Reveal delay={0.08} className="mt-[clamp(18px,1.7vw,25px)]">
            <h1 className="font-display w-full text-brigada-black">
              The best thing about our line of work? It&rsquo;s working with the
              best. Here&rsquo;s what got our clients moving.
            </h1>
          </Reveal>
        </section>

        {/* Work grid — Osmo multi-match button filter (All / pillars). */}
        <section className={`${GUTTER} pt-[clamp(36px,4.5vw,72px)] pb-[clamp(80px,12vw,160px)]`}>
          <Reveal>
            <WorkFilter />
          </Reveal>
        </section>
      </div>

      {/* Parallax footer — brio "Pink & Yellow" (brio-01) backdrop + wordmark. */}
      <BrandFooter brioPaletteId="brio-01" />
    </motion.main>
  );
};

export default WorkV2;