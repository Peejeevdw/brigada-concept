"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import { PortableText, type PortableTextBlock } from "@portabletext/react";
import { useLenis } from "@/hooks/useLenis";
import { useCanvasColor } from "@/hooks/useCanvasColor";
import SiteNav from "@/components/site/SiteNav";
import Reveal from "@/components/site/Reveal";
import BrandFooter from "@/components/BrandFooter";
import { GUTTER } from "@/lib/siteTokens";

type LegalKind = "privacy" | "cookies";

export type LegalData = {
  title?: string | null;
  body?: PortableTextBlock[] | null;
} | null;

const Legal = ({ kind, data }: { kind: LegalKind; data?: LegalData }) => {
  // Match the document canvas to the page's white top so the iOS status-bar safe area (exposed by viewport-fit=cover) reads the same colour, not the cream default.
  useCanvasColor("#FFFFFF");
  const title = data?.title ?? "";
  const body = data?.body ?? null;

  // Scroll-driven background — warms from white to a soft paper tint across the
  // content block, matching /expertise-v2.
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollP = useMotionValue(0);
  const bgColor = useTransform(scrollP, [0, 1], ["#FFFFFF", "#F6F1EA"]);

  // Cookie-Script renders the auto-generated cookies table at the position of
  // its script tag. We append the tag to a dedicated container via effect so
  // the library can resolve `document.currentScript` and insert the table
  // exactly where we want it. Only on /cookies.
  const cookieTableRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (kind !== "cookies") return;
    const el = cookieTableRef.current;
    if (!el || el.querySelector("script[data-cookiescriptreport]")) return;
    const s = document.createElement("script");
    s.src = "//report.cookie-script.com/r/15b92958166470230dd3c72185b67909.js";
    s.type = "text/javascript";
    s.charset = "UTF-8";
    s.setAttribute("data-cookiescriptreport", "report");
    el.appendChild(s);
  }, [kind]);

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
            <h1
              className="w-full text-brigada-black"
              style={{
                fontFamily: '"Antarctica", system-ui, sans-serif',
                fontSize: "clamp(28px, 3.8vw, 44px)",
                fontWeight: 500,
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </h1>
          </Reveal>
          <div className="mt-[clamp(32px,4vw,56px)] flex flex-col gap-6 md:w-[72%]">
            {body && body.length > 0 && (
              <Reveal>
                <div className="text-brigada-black text-[clamp(15px,1.1vw,17px)] leading-[1.55] [&_p]:mb-4 [&_h2]:text-[clamp(18px,1.4vw,22px)] [&_h2]:font-medium [&_h2]:leading-[1.25] [&_h2]:mt-10 [&_h2]:mb-2 [&_h3]:text-[clamp(15px,1.1vw,17px)] [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:underline" style={{ fontFamily: '"Antarctica", system-ui, sans-serif' }}>
                  <PortableText value={body} />
                </div>
              </Reveal>
            )}
            {kind === "cookies" && (
              <Reveal>
                <div
                  ref={cookieTableRef}
                  className="mt-[clamp(24px,3vw,48px)] text-brigada-black text-[clamp(14px,1vw,16px)] leading-[1.5] [&_h2]:text-[clamp(18px,1.4vw,22px)] [&_h2]:font-medium [&_h2]:leading-[1.25] [&_h2]:mt-10 [&_h2]:mb-2 [&_h3]:text-[clamp(15px,1.1vw,17px)] [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-1 [&_p]:mb-4 [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_th]:text-left [&_th]:font-semibold [&_th]:py-2 [&_th]:pr-4 [&_th]:border-b [&_th]:text-[clamp(13px,0.95vw,15px)] [&_td]:py-2 [&_td]:pr-4 [&_td]:border-b [&_td]:align-top [&_a]:underline"
                  style={{ fontFamily: '"Antarctica", system-ui, sans-serif' }}
                />
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
