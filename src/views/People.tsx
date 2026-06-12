"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { useRef } from "react";
import { useLenis } from "@/hooks/useLenis";
import { usePageTransition } from "@/components/PageTransition";
import Reveal from "@/components/site/Reveal";
import SectionLabel from "@/components/site/SectionLabel";
import CascadingSlider from "@/components/CascadingSlider";
import BrandFooter from "@/components/BrandFooter";
import PillarWorkCTA from "@/components/PillarWorkCTA";
import { GUTTER, INK } from "@/lib/siteTokens";
import type { CascadingSlide } from "@/components/CascadingSlider";
import type { PillarViewProps } from "./pillar-types";
const peopleCase1 = "/assets/people-case-1.png";
const peopleCase2 = "/assets/people-case-2.png";
const peopleCase3 = "/assets/people-case-3.png";
const peopleCase4 = "/assets/people-case-4.png";

// People page — the People expertise detail, built on the shared site
// foundation with the same section rhythm as /brand: intro → services →
// contact → orbit → parallax footer. Content from src/data/pillars.ts.

// Some services link to a detail page (keyed by title). Employer branding's
// link is parked for now — its page is drafted (route taken offline). To bring
// it back, re-add "Employer branding": "/employer-branding" here and restore
// app/employer-branding/page.tsx.
const SERVICE_LINKS: Record<string, string> = {};

// People case placeholders (swap for real cases later — these are visual
// stand-ins, not editorial copy).
const PEOPLE_CASES: CascadingSlide[] = [
  { img: peopleCase1, title: "Placeholder" },
  { img: peopleCase2, title: "Placeholder" },
  { img: peopleCase3, title: "Placeholder" },
  { img: peopleCase4, title: "Placeholder" },
];

const People = ({ category }: PillarViewProps) => {
  const lead = category?.lead;
  const firstName = lead?.name ? lead.name.split(" ")[0] : "";
  const fullName = lead?.name ?? "";
  const position = lead?.position ?? "";
  const phone = lead?.phone ?? "";
  const email = lead?.email ?? "";
  const leadInText = (category?.leadIn ?? "").replace("{name}", firstName);
  const brioPalette = category?.brioPaletteId ?? undefined;
  const pillarName = category?.name ?? "People";
  const intro = category?.intro ?? "";
  const services = category?.services ?? [];
  const transitionTo = usePageTransition();
  // Scroll-driven background — warms from white to a soft lilac tint across the
  // content block, reaching full tint as the dark orbit slides over.
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollP = useMotionValue(0);
  const bgColor = useTransform(scrollP, [0, 1], ["#FFFFFF", "#F2EEF4"]);

  useLenis(() => {
    const el = contentRef.current;
    const range = el ? el.offsetHeight - window.innerHeight : window.innerHeight;
    scrollP.set(range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0);
  });

  return (
    <motion.main className="min-h-screen w-full" style={{ backgroundColor: bgColor }}>
      {/* Content — full width (gutters only). Its height drives the bg tint. */}
      <div ref={contentRef} className="w-full">
        {/* Intro */}
        <section className={`${GUTTER} pt-[clamp(160px,18vw,250px)]`}>
          <Reveal>
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
                  const href = SERVICE_LINKS[title];
                  const blurb = s.description ?? undefined;
                  return (
                    <li key={title || `s${i}`} className={i === 0 ? "" : "mt-[clamp(22px,2.4vw,34px)]"}>
                      {href ? (
                        <button
                          type="button"
                          onClick={() => transitionTo(href)}
                          className="group inline-flex items-center gap-2 text-left leading-[1.25] transition-opacity hover:opacity-60"
                        >
                          <span>{title}</span>
                          <span className="relative top-[-2px] inline-block transition-transform duration-300 ease-out group-hover:translate-x-1">
                            →
                          </span>
                        </button>
                      ) : (
                        <span className="leading-[1.25]">{title}</span>
                      )}
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
        <PillarWorkCTA pillarSlug="people" pillarName={pillarName} />

        {/* People contact */}
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
                  {phone && <p>{phone}</p>}
                  <p>{email}</p>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </div>

      {/* Cases — Osmo "Cascading Slider" (clip-path carousel), same as /product.
          Placeholder people cases for now. */}
      <section className="px-[clamp(24px,5vw,72px)] pt-[clamp(24px,4vw,64px)] pb-[clamp(80px,12vw,160px)]">
        <CascadingSlider slides={PEOPLE_CASES} />
      </section>

      {/* Parallax footer — brio "Orange & Purple" (brio-02) backdrop + wordmark. */}
      <BrandFooter brioPaletteId={brioPalette} />
    </motion.main>
  );
};

export default People;