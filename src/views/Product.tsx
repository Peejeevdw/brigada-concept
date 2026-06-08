"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { useRef } from "react";
import { useLenis } from "@/hooks/useLenis";
import SiteNav from "@/components/site/SiteNav";
import Reveal from "@/components/site/Reveal";
import SectionLabel from "@/components/site/SectionLabel";
import CascadingSlider from "@/components/CascadingSlider";
import BrandFooter from "@/components/BrandFooter";
import PillarWorkCTA from "@/components/PillarWorkCTA";
import { GUTTER, INK } from "@/lib/siteTokens";
import type { PillarViewProps } from "./pillar-types";

// Product page — the Product service-category detail, built on the shared
// site foundation (SiteNav, Reveal, SectionLabel, useLenis, .font-* roles,
// tokens) with the same section rhythm as /brand: intro → services →
// contact → orbit → parallax footer. All content read from the matching
// `serviceCategory` doc.

const Product = ({ category }: PillarViewProps) => {
  const lead = category?.lead;
  const firstName = lead?.name ? lead.name.split(" ")[0] : "";
  const fullName = lead?.name ?? "";
  const position = lead?.position ?? "";
  const phone = lead?.phone ?? "";
  const email = lead?.email ?? "";
  const leadInText = (category?.leadIn ?? "").replace("{name}", firstName);
  const brioPalette = category?.brioPaletteId ?? undefined;
  const pillarName = category?.name ?? "Product";
  const intro = category?.intro ?? "";
  const services = category?.services ?? [];

  // Scroll-driven background — warms from white to a soft blue-green tint across
  // the content block, reaching full tint as the dark orbit slides over.
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollP = useMotionValue(0);
  const bgColor = useTransform(scrollP, [0, 1], ["#FFFFFF", "#EAF1EE"]);

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
            <p className="font-eyebrow text-brigada-black">{pillarName}</p>
          </Reveal>
          <Reveal delay={0.08} className="mt-[clamp(18px,1.7vw,25px)]">
            <h1 className="font-display w-full text-brigada-black">{intro}</h1>
          </Reveal>
        </section>

        {/* Services */}
        <section
          className={`${GUTTER} pt-[clamp(48px,7vw,96px)]`}
          style={{ color: INK.dark }}
        >
          <Reveal>
            <div className="border-t" style={{ borderColor: INK.dark }} />
            <div className="mt-[clamp(20px,2vw,26px)] flex flex-col gap-8 md:flex-row md:justify-between">
              <SectionLabel>{pillarName}</SectionLabel>
              <ul className="w-full text-[clamp(15px,1.25vw,18px)] md:w-[49%]">
                {services.map((s, i) => {
                  const title = s.title ?? "";
                  const blurb = s.description ?? undefined;
                  return (
                    <li key={title || `s${i}`} className={i === 0 ? "" : "mt-[clamp(22px,2.4vw,34px)]"}>
                      <span className="leading-[1.25]">{title}</span>
                      {blurb && (
                        <p className="mt-[clamp(6px,0.6vw,10px)] max-w-[42ch] text-[clamp(13px,1.05vw,15px)] leading-snug opacity-50">
                          {blurb}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </Reveal>
        </section>

        {/* CTA: deep-link to the work index pre-filtered on this pillar. */}
        <PillarWorkCTA pillarSlug="product" pillarName={pillarName} />

        {/* Product contact */}
        <section
          className={`${GUTTER} pt-[clamp(40px,5vw,72px)] pb-[clamp(80px,12vw,180px)]`}
          style={{ color: INK.dark }}
        >
          <Reveal>
            <div className="border-t" style={{ borderColor: INK.dark }} />
            <div className="mt-[clamp(28px,3vw,42px)] flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
              <SectionLabel>{pillarName} contact</SectionLabel>
              <div className="flex w-full flex-col gap-8 md:w-[49%]">
                <div className="text-[clamp(15px,1.25vw,18px)] leading-[22px]">
                  <p>{leadInText}</p>
                  <p className="mt-[18px]">{fullName}</p>
                  <p>{position}</p>
                  <p>{phone}</p>
                  <p>{email}</p>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </div>

      {/* Cases — Osmo "Cascading Slider" (clip-path carousel), replacing the
          orbit section. Placeholder product cases for now. */}
      <section className="px-[clamp(24px,5vw,72px)] pt-[clamp(24px,4vw,64px)] pb-[clamp(80px,12vw,160px)]">
        <CascadingSlider />
      </section>

      {/* Parallax footer — brio "Green & Blue" (brio-03) backdrop + wordmark. */}
      <BrandFooter brioPaletteId={brioPalette} />
    </motion.main>
  );
};

export default Product;