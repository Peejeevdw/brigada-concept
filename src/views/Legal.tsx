"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { useRef } from "react";
import { PortableText, type PortableTextBlock } from "@portabletext/react";
import { useLenis } from "@/hooks/useLenis";
import SiteNav from "@/components/site/SiteNav";
import Reveal from "@/components/site/Reveal";
import BrandFooter from "@/components/BrandFooter";
import { GUTTER } from "@/lib/siteTokens";

type LegalKind = "privacy" | "cookies";

export type LegalData = {
  title?: string | null;
  body?: PortableTextBlock[] | null;
} | null;

const Legal = ({ kind: _kind, data }: { kind: LegalKind; data?: LegalData }) => {
  const title = data?.title ?? "";
  const body = data?.body ?? null;

  // Scroll-driven background — warms from white to a soft paper tint across the
  // content block, matching /expertise-v2.
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
        <section className={`${GUTTER} pt-[clamp(120px,18vw,250px)] pb-[clamp(80px,12vw,160px)]`}>
          <Reveal>
            <p className="font-eyebrow text-brigada-black">Legal</p>
          </Reveal>
          <Reveal delay={0.08} className="mt-[clamp(18px,1.7vw,25px)]">
            <h1 className="font-display w-full text-brigada-black">{title}</h1>
          </Reveal>
          <div className="mt-[clamp(40px,5vw,72px)] flex flex-col gap-6 md:w-[60%]">
            {body && body.length > 0 && (
              <Reveal>
                <div className="font-body text-brigada-black [&_p]:mb-6 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:mb-3 [&_h2]:mt-8 [&_h3]:font-body [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-6 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:underline">
                  <PortableText value={body} />
                </div>
              </Reveal>
            )}
          </div>
        </section>
      </div>

      <BrandFooter brioPaletteId="brio-01" />
    </motion.main>
  );
};

export default Legal;
