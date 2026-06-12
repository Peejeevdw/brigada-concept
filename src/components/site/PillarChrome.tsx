"use client";

import { usePathname } from "next/navigation";
import SiteNav from "@/components/site/SiteNav";
import PillarTabs from "@/components/site/PillarTabs";

// Persistent chrome for the four service-pillar pages, mounted OUTSIDE the
// page-transition crossfade (see Providers). On a pillar route it renders the
// shared SiteNav AND the pillar tab bar; both stay put while only the page
// content beneath them fades between pillars — so switching pillars reads like
// opening a tab. The pillar views therefore no longer render their own SiteNav.
const PILLAR_PATHS = ["/brand", "/marketing", "/people", "/product"] as const;

export default function PillarChrome() {
  const pathname = usePathname();
  const onPillar = PILLAR_PATHS.some(
    (p) => pathname === p || pathname?.startsWith(`${p}/`),
  );
  if (!onPillar) return null;

  return (
    <>
      {/* Suppress the "Services" hover dropdown here — the tab bar below already
          lists Brand/Marketing/People/Product, so it would be redundant. */}
      <SiteNav homePath="/concept" lockedDropdowns={["Services"]} />
      <PillarTabs />
    </>
  );
}
