"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { useRef } from "react";
import { useLenis } from "@/hooks/useLenis";
import SiteNav from "@/components/site/SiteNav";
import Reveal from "@/components/site/Reveal";
import BrandFooter from "@/components/BrandFooter";
import { BlockRenderer } from "@/components/case-blocks/BlockRenderer";
import type { CaseBlock } from "@/components/case-blocks/types";
import { GUTTER } from "@/lib/siteTokens";
import { urlFor } from "@/lib/sanity";

export type LandingData = {
  _id?: string;
  title?: string | null;
  noindex?: boolean | null;
  slug?: string | null;
  hero?: {
    eyebrow?: string | null;
    title?: string | null;
    intro?: string | null;
    image?: {
      alt?: string | null;
      asset?: {
        _id?: string;
        url?: string;
        metadata?: { dimensions?: { width: number; height: number }; lqip?: string };
      };
    } | null;
  } | null;
  body?: CaseBlock[] | null;
  seo?: {
    title?: string | null;
    description?: string | null;
    image?: { alt?: string | null; asset?: { _id?: string; url?: string } } | null;
  } | null;
} | null;

const Landing = ({ data }: { data: LandingData }) => {
  const hero = data?.hero ?? null;
  const blocks = data?.body ?? [];
  const heroImageSrc = hero?.image?.asset
    ? urlFor(hero.image)?.width(2400).auto("format").url()
    : null;

  // Scroll-driven background — same warm tint as /privacy /cookies so all the
  // editorial pages share a consistent reading-feel.
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
      <SiteNav homePath="/" />

      <div ref={contentRef} className="w-full">
        {(hero?.eyebrow || hero?.title || hero?.intro || heroImageSrc) && (
          <section
            className={`${GUTTER} pt-[clamp(120px,18vw,250px)] pb-[clamp(40px,6vw,80px)]`}
          >
            {hero?.eyebrow && (
              <Reveal>
                <p className="font-eyebrow text-brigada-black">{hero.eyebrow}</p>
              </Reveal>
            )}
            {hero?.title && (
              <Reveal delay={0.08} className="mt-[clamp(18px,1.7vw,25px)]">
                <h1
                  className="w-full text-brigada-black md:w-[80%]"
                  style={{
                    fontFamily: '"Antarctica", system-ui, sans-serif',
                    fontSize: "clamp(32px, 5vw, 64px)",
                    fontWeight: 500,
                    lineHeight: 1.05,
                    letterSpacing: "-0.015em",
                  }}
                >
                  {hero.title}
                </h1>
              </Reveal>
            )}
            {hero?.intro && (
              <Reveal delay={0.16} className="mt-[clamp(20px,2.4vw,36px)]">
                <p
                  className="text-brigada-black md:w-[72%]"
                  style={{
                    fontFamily: '"Antarctica", system-ui, sans-serif',
                    fontSize: "clamp(17px, 1.5vw, 22px)",
                    fontWeight: 400,
                    lineHeight: 1.4,
                  }}
                >
                  {hero.intro}
                </p>
              </Reveal>
            )}
            {heroImageSrc && (
              <Reveal delay={0.24} className="mt-[clamp(40px,5vw,80px)]">
                <div className="relative w-full overflow-hidden rounded-[2px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={heroImageSrc}
                    alt={hero?.image?.alt ?? ""}
                    className="block h-auto w-full"
                  />
                </div>
              </Reveal>
            )}
          </section>
        )}

        {blocks.length > 0 && (
          <div className="pb-[clamp(80px,12vw,160px)]">
            {blocks.map((block) => (
              <BlockRenderer key={block._key} block={block} />
            ))}
          </div>
        )}

        {/* Fallback heading when there's no hero AND no body — should be rare
            but keeps the page from being completely empty if an editor
            publishes a stub. */}
        {!hero?.eyebrow && !hero?.title && !hero?.intro && !heroImageSrc && blocks.length === 0 && data?.title && (
          <section className={`${GUTTER} py-[clamp(120px,18vw,250px)]`}>
            <h1
              className="text-brigada-black"
              style={{
                fontFamily: '"Antarctica", system-ui, sans-serif',
                fontSize: "clamp(28px, 3.8vw, 44px)",
                fontWeight: 500,
                lineHeight: 1.1,
              }}
            >
              {data.title}
            </h1>
          </section>
        )}
      </div>

      <BrandFooter brioPaletteId="brio-01" />
    </motion.main>
  );
};

export default Landing;
