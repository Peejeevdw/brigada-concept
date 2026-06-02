import { motion, useMotionValue, useTransform } from "framer-motion";
import { useRef } from "react";
import { useLenis } from "@/hooks/useLenis";
import SiteNav from "@/components/site/SiteNav";
import Reveal from "@/components/site/Reveal";
import BrandFooter from "@/components/BrandFooter";
import { GUTTER } from "@/lib/siteTokens";

// Placeholder legal pages (Privacy Policy / Cookie Policy) in the new-site idiom
// — SiteNav, a simple intro block on the shared foundation, and the shared
// BrandFooter. Linked from the footer's subtle legal row. Real copy is a
// placeholder until the policies are finalised.

type LegalKind = "privacy" | "cookies";

const CONTENT: Record<LegalKind, { title: string; body: string[] }> = {
  privacy: {
    title: "Privacy Policy",
    body: [
      "This page is a placeholder for Brigada's privacy policy. It will describe what personal data we collect, why we collect it, how long we keep it, and the rights you have over it.",
      "Final copy to follow.",
    ],
  },
  cookies: {
    title: "Cookie Policy",
    body: [
      "This page is a placeholder for Brigada's cookie policy. It will explain which cookies and similar technologies this site uses, what they do, and how you can manage your preferences.",
      "Final copy to follow.",
    ],
  },
};

const Legal = ({ kind }: { kind: LegalKind }) => {
  const { title, body } = CONTENT[kind];

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
      <SiteNav homePath="/concept" />

      <div ref={contentRef} className="w-full">
        <section className={`${GUTTER} pt-[clamp(120px,18vw,250px)] pb-[clamp(80px,12vw,160px)]`}>
          <Reveal>
            <p className="font-eyebrow text-brigada-black">Legal</p>
          </Reveal>
          <Reveal delay={0.08} className="mt-[clamp(18px,1.7vw,25px)]">
            <h1 className="font-display w-full text-brigada-black">{title}</h1>
          </Reveal>
          <div className="mt-[clamp(40px,5vw,72px)] flex flex-col gap-6 md:w-[60%]">
            {body.map((paragraph, i) => (
              <Reveal key={i} delay={i === 0 ? 0 : 0.04}>
                <p className="font-body text-brigada-black">{paragraph}</p>
              </Reveal>
            ))}
          </div>
        </section>
      </div>

      <BrandFooter brioPaletteId="brio-01" />
    </motion.main>
  );
};

export default Legal;
