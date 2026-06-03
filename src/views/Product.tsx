"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { useRef } from "react";
import { useLenis } from "@/hooks/useLenis";
import SiteNav from "@/components/site/SiteNav";
import Reveal from "@/components/site/Reveal";
import SectionLabel from "@/components/site/SectionLabel";
import CascadingSlider from "@/components/CascadingSlider";
import BrandFooter from "@/components/BrandFooter";
import { GUTTER, INK } from "@/lib/siteTokens";
import { pillarContent } from "@/data/pillars";
import type { PillarViewProps } from "./pillar-types";

// Product page — the Product expertise detail, built on the shared site
// foundation (SiteNav, Reveal, SectionLabel, useLenis, .font-* roles, tokens)
// with the same section rhythm as /brand: intro → services → contact → orbit
// → parallax footer. Content from src/data/pillars.ts.

const content = pillarContent.Product;
const SERVICES = content.services.map((s) => s.title);

const FALLBACK_LEAD = {
  firstName: "Jeroen",
  fullName: "Jeroen De Bock",
  position: "Client Partner",
  phone: "+32 477 62 76 01",
  email: "jeroen.debock@brigada.be",
};

const Product = ({ expertise }: PillarViewProps = {}) => {
  const lead = expertise?.lead;
  const firstName = lead?.name ? lead.name.split(" ")[0] : FALLBACK_LEAD.firstName;
  const fullName = lead?.name ?? FALLBACK_LEAD.fullName;
  const position = lead?.position ?? FALLBACK_LEAD.position;
  const phone = lead?.phone ?? FALLBACK_LEAD.phone;
  const email = lead?.email ?? FALLBACK_LEAD.email;
  const leadInTemplate = expertise?.leadIn ?? "Have you met {name} yet?";
  const leadInText = leadInTemplate.replace("{name}", firstName);
  const brioPalette = expertise?.brioPaletteId ?? "brio-03";

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
            <p className="font-eyebrow text-brigada-black">
              Product
            </p>
          </Reveal>
          <Reveal delay={0.08} className="mt-[clamp(18px,1.7vw,25px)]">
            <h1 className="font-display w-full text-brigada-black">{content.intro}</h1>
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
              <SectionLabel>Product</SectionLabel>
              <ul
                className="w-full text-[clamp(15px,1.25vw,18px)] md:w-[49%]"
                style={{ lineHeight: "40px" }}
              >
                {SERVICES.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </Reveal>
        </section>

        {/* Product contact */}
        <section
          className={`${GUTTER} pt-[clamp(40px,5vw,72px)] pb-[clamp(80px,12vw,180px)]`}
          style={{ color: INK.dark }}
        >
          <Reveal>
            <div className="border-t" style={{ borderColor: INK.dark }} />
            <div className="mt-[clamp(28px,3vw,42px)] flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
              <SectionLabel>Product contact</SectionLabel>
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