"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { useRef } from "react";
import { useLenis } from "@/hooks/useLenis";
import SiteNav from "@/components/site/SiteNav";
import Reveal from "@/components/site/Reveal";
import WorkFilter, { type WorkItem } from "@/components/WorkFilter";
import BrandFooter from "@/components/BrandFooter";
import { GUTTER } from "@/lib/siteTokens";
import { caseImages } from "@/data/caseImages";
import { urlFor } from "@/lib/sanity";

export interface WorkIndexData {
  page?: { hero?: { eyebrow?: string | null; title?: string | null } | null } | null;
  items?: Array<{
    _id?: string;
    name?: string | null;
    client?: string | null;
    slug?: string | null;
    intro?: string | null;
    image?: unknown;
    serviceCategories?: Array<{ _id?: string; name?: string | null; slug?: string | null }> | null;
  }> | null;
}

// Work page — "Meet the clients" overview, built on the shared site foundation
// (SiteNav, Reveal, useLenis, the .font-* roles + tokens) in the /brand idiom.

const WorkV2 = ({ data }: { data?: WorkIndexData | null } = {}) => {
  const eyebrow = data?.page?.hero?.eyebrow ?? "";
  const title = data?.page?.hero?.title ?? "";
  const items: WorkItem[] = (data?.items ?? [])
    .map((w) => {
      const sanityImg = w.image
        ? urlFor(w.image)?.width(1200).height(800).fit("crop").auto("format").url()
        : null;
      // A real thumbnail = a Sanity image or a legacy caseImages fallback. Cases
      // with neither are hidden from the index (no placeholder fallback).
      const img = sanityImg || (w.slug ? caseImages[w.slug] : null) || null;
      if (!img) return null;
      return {
        client: w.client || w.name || "",
        tags: (w.serviceCategories ?? []).map((e) => e?.name ?? "").filter(Boolean) as string[],
        img,
        slug: w.slug ?? undefined,
      };
    })
    .filter((it) => it !== null) as WorkItem[];
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
            <p className="font-eyebrow text-brigada-black">{eyebrow}</p>
          </Reveal>
          <Reveal delay={0.08} className="mt-[clamp(18px,1.7vw,25px)]">
            <h1 className="font-display w-full text-brigada-black">{title}</h1>
          </Reveal>
        </section>

        {/* Work grid — Osmo multi-match button filter (All / pillars). */}
        <section className={`${GUTTER} pt-[clamp(36px,4.5vw,72px)] pb-[clamp(80px,12vw,160px)]`}>
          <Reveal>
            <WorkFilter items={items} />
          </Reveal>
        </section>
      </div>

      {/* Parallax footer — brio "Pink & Yellow" (brio-01) backdrop + wordmark. */}
      <BrandFooter brioPaletteId="brio-01" />
    </motion.main>
  );
};

export default WorkV2;