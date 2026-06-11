"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import SiteNav from "@/components/site/SiteNav";
import Reveal from "@/components/site/Reveal";
import { BrioEffect } from "@/brio-effect";
import { GUTTER } from "@/lib/siteTokens";

// 404 — built on the shared site foundation (SiteNav + Reveal + Brio hero) so a
// missing route still feels like part of the site, not a system error. No
// in-page links: the main navigation already covers wayfinding.
const NotFound = () => {
  const pathname = usePathname();

  useEffect(() => {
    console.error("404 — non-existent route:", pathname);
  }, [pathname]);

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-brigada-black">
      <SiteNav homePath="/concept" />

      {/* Brio hero — full-bleed behind the nav + content. Same treatment as the
          careers hero: brio "Green & Blue" (brio-03) over the concept image. */}
      <div className="absolute inset-0 z-0">
        <BrioEffect
          src="/concept-hero.jpg"
          mode="palette"
          paletteId="brio-03"
          className="h-full w-full"
        />
      </div>

      {/* Content — centred in the middle of the page. */}
      <section
        className={`relative z-10 flex min-h-screen flex-col items-center justify-center text-center ${GUTTER}`}
      >
        <Reveal>
          <p className="font-eyebrow text-brigada-black">Page not found</p>
        </Reveal>
        <Reveal delay={0.08} className="mt-[clamp(20px,2vw,32px)]">
          <p className="text-[clamp(16px,1.5vw,22px)] leading-[1.5] text-brigada-black/80">
            This page doesn’t exist (anymore).
            <br />
            The link may be outdated or mistyped.
          </p>
        </Reveal>
      </section>
    </main>
  );
};

export default NotFound;
