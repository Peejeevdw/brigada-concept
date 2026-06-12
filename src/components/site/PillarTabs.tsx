"use client";

import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { runPageTransition } from "@/lib/pageTransition";
import { SANS } from "@/lib/siteTokens";

// Persistent service-pillar tab bar (Brand / Marketing / People / Product).
//
// It is rendered ONCE, OUTSIDE the page-transition crossfade (see Providers), so
// switching pillars feels like opening a tab: the bar stays put, the active
// underline slides between tabs (framer `layoutId`), and only the page content
// beneath crossfades while the next route loads.
//
// Unlike SiteNav it is NOT pinned — it scrolls away with the page (position
// absolute). It uses mix-blend-difference (no transformed/opacity wrapper
// between it and the page), so it reads dark on the light intro and flips to
// light over a dark section — legible on any bg.
const PILLARS = [
  { label: "Brand", href: "/brand" },
  { label: "Marketing", href: "/marketing" },
  { label: "People", href: "/people" },
  { label: "Product", href: "/product" },
] as const;

export default function PillarTabs() {
  const pathname = usePathname();
  const router = useRouter();

  const active = PILLARS.find(
    (p) => pathname === p.href || pathname?.startsWith(`${p.href}/`),
  );

  // Prefetch every sibling so a tab switch commits fast — the crossfade reveals
  // the new page the moment its RSC is ready, which is what sells the "instant
  // tab" feel.
  useEffect(() => {
    if (!active) return;
    PILLARS.forEach((p) => router.prefetch(p.href));
  }, [active, router]);

  // Only present on the four pillar pages.
  if (!active) return null;

  return (
    <nav
      aria-label="Services"
      className="absolute inset-x-0 z-40 px-[clamp(24px,5vw,72px)] text-white"
      // `absolute` (not `fixed`) so the bar scrolls away with the page — only
      // SiteNav stays pinned. It still sits outside the crossfade, so it holds
      // steady (and the underline slides) during a pillar switch. `top` centres
      // it between SiteNav (72px) and the title (section padding
      // clamp(120px,18vw,250px)): midpoint − half the bar. Inline so the
      // calc()-in-clamp() always applies (no Tailwind JIT risk).
      style={{ top: "clamp(96px, calc(20px + 9vw), 144px)", mixBlendMode: "difference" }}
    >
      <div
        className="flex items-end gap-[clamp(20px,3vw,44px)] border-b border-white/25"
      >
        {PILLARS.map((p) => {
          const isActive = p.href === active.href;
          return (
            <button
              key={p.href}
              type="button"
              onClick={() => {
                if (!isActive) runPageTransition(p.href);
              }}
              onPointerEnter={() => router.prefetch(p.href)}
              aria-current={isActive ? "page" : undefined}
              className="relative pb-3 text-[clamp(14px,1.25vw,18px)] uppercase tracking-[0.04em] transition-opacity duration-300 hover:opacity-100"
              style={{
                fontFamily: SANS,
                fontWeight: 500,
                opacity: isActive ? 1 : 0.45,
              }}
            >
              {p.label}
              {isActive && (
                <motion.span
                  layoutId="pillar-tab-underline"
                  className="absolute -bottom-px left-0 right-0 h-[2px] bg-white"
                  transition={{ type: "spring", stiffness: 360, damping: 34 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
