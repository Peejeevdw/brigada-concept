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

// Marketing page — the Marketing expertise detail, built on the shared site
// foundation with the same section rhythm as /product and /people: intro →
// services → contact → cases → parallax footer. Content from data/pillars.ts.

const content = pillarContent.Marketing;
const SERVICES = content.services.map((s) => s.title);

const FALLBACK_LEAD = {
  firstName: "Sofie",
  fullName: "Sofie",
  position: "Marketing Lead",
  phone: "",
  email: "sofie@brigada.be",
};

const Marketing = ({ expertise }: PillarViewProps = {}) => {
  const lead = expertise?.lead;
  const firstName = lead?.name ? lead.name.split(" ")[0] : FALLBACK_LEAD.firstName;
  const fullName = lead?.name ?? FALLBACK_LEAD.fullName;
  const position = lead?.position ?? FALLBACK_LEAD.position;
  const phone = lead?.phone ?? FALLBACK_LEAD.phone;
  const email = lead?.email ?? FALLBACK_LEAD.email;
  const leadInTemplate = expertise?.leadIn ?? "{name} is the one to talk to.";
  const leadInText = leadInTemplate.replace("{name}", firstName);
  const brioPalette = expertise?.brioPaletteId ?? "brio-04";
  // Scroll-driven background — warms from white to a soft yellow-green tint
  // across the content block, reaching full tint as the dark cases slide over.
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollP = useMotionValue(0);
  const bgColor = useTransform(scrollP, [0, 1], ["#FFFFFF", "#F3F2E4"]);

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
            <p className="font-eyebrow text-brigada-black">Marketing</p>
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
              <SectionLabel>Marketing</SectionLabel>
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

        {/* Marketing contact */}
        <section
          className={`${GUTTER} pt-[clamp(40px,5vw,72px)] pb-[clamp(80px,12vw,180px)]`}
          style={{ color: INK.dark }}
        >
          <Reveal>
            <div className="border-t" style={{ borderColor: INK.dark }} />
            <div className="mt-[clamp(28px,3vw,42px)] flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
              <SectionLabel>Marketing contact</SectionLabel>
              <div className="flex w-full flex-col gap-8 md:w-[49%]">
                <div className="text-[clamp(15px,1.25vw,18px)] leading-[22px]">
                  <p>{leadInText}</p>
                  <p className="mt-[18px]">{fullName}</p>
                  <p>{position}</p>
                  {phone && <p>{phone}</p>}
                  <p>{email}</p>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </div>

      {/* Cases — Osmo "Cascading Slider" (clip-path carousel), same as /product
          and /people. Placeholder cases for now. */}
      <section className="px-[clamp(24px,5vw,72px)] pt-[clamp(24px,4vw,64px)] pb-[clamp(80px,12vw,160px)]">
        <CascadingSlider />
      </section>

      {/* Parallax footer — brio "Yellow & Green" (brio-04) backdrop + wordmark. */}
      <BrandFooter brioPaletteId={brioPalette} />
    </motion.main>
  );
};

export default Marketing;